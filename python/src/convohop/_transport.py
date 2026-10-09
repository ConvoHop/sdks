"""HTTP delivery and the drivers that run engine flows on threads or on asyncio."""

from __future__ import annotations

import asyncio
import concurrent.futures
import contextlib
import dataclasses
import functools
import math
import threading
import time
from collections.abc import Awaitable
from typing import Any, NoReturn, TypeVar

import httpx

from ._engine import BODY_CAP, Effect, Engine, Envelope, Flow, Mutate, Persist, Response, Send, conflict
from ._protocol import is_id, origin
from ._version import __version__
from .errors import ConvoHopProblem
from .recovery import AsyncRecoveryStorage, RecoveryStorage

USER_AGENT = f"convohop-python/{__version__}"
DEFAULT_TIMEOUT = 12.0
_MAX_CREDENTIAL = 4096
_UNAVAILABLE = "Authority response unavailable; resolve the original request"

T = TypeVar("T")


class Secret:
    """A credential that never appears in ``repr``, logs or pickles."""

    __slots__ = ("_value",)

    def __init__(self, value: object, name: str) -> None:
        if not isinstance(value, str):
            raise TypeError(f"{name} must be a string")
        if not 0 < len(value) <= _MAX_CREDENTIAL or not all("\x21" <= char <= "\x7e" for char in value):
            raise ValueError(f"{name} must be 1 to {_MAX_CREDENTIAL} visible ASCII characters")
        self._value = value

    def reveal(self) -> str:
        return self._value

    def __repr__(self) -> str:
        return "Secret('<redacted>')"

    def __reduce__(self) -> NoReturn:
        raise TypeError("Credentials cannot be pickled")


def endpoint(base_url: object) -> str:
    """The GraphQL endpoint for an HTTPS origin, or explicit loopback HTTP for local development."""
    if not isinstance(base_url, str):
        raise TypeError("base_url must be a string")
    try:
        return origin(base_url) + "/graphql"
    except TypeError as error:
        raise ValueError(str(error)) from None


def identifier(value: object, name: str) -> str:
    """A client option that must be a canonical lowercase, nonzero UUID."""
    if not isinstance(value, str):
        raise TypeError(f"{name} must be a string")
    if not is_id(value):
        raise ValueError(f"{name} must be a canonical lowercase, nonzero UUID")
    return value


def request_identity(value: object) -> str:
    """A request ID passed to ``retry_request``; an invalid one is rejected like any invalid request."""
    if not isinstance(value, str):
        raise TypeError("request_id must be a string")
    if not is_id(value):
        raise ConvoHopProblem("INVALID_REQUEST", value, "rejected", 400, "Expected a canonical nonzero UUID")
    return value


def storage_key(namespace: str) -> str:
    return "convohop.requests:" + namespace


def timeout_seconds(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise TypeError("timeout must be a number of seconds")
    if not math.isfinite(value) or value <= 0:
        raise ValueError("timeout must be a positive, finite number of seconds")
    return float(value)


def _build(url: str, body: bytes, secret: Secret, timeout: float) -> httpx.Request:
    # Built directly, not with Client.build_request, so client defaults (cookies, headers, params) never apply.
    headers = {
        "accept": "application/json",
        "accept-encoding": "identity",
        "authorization": "Bearer " + secret.reveal(),
        "content-type": "application/json",
        "user-agent": USER_AGENT,
    }
    extensions = {"timeout": httpx.Timeout(timeout).as_dict()}
    return httpx.Request("POST", url, content=body, headers=headers, extensions=extensions)


@dataclasses.dataclass(slots=True)
class _Reading:
    """A response body being read under the size cap."""

    status: int
    retry_after: str | None
    body: bytearray = dataclasses.field(default_factory=bytearray)

    def add(self, chunk: bytes) -> bool:
        """Appends a chunk; returns ``False`` once the body exceeds the cap."""
        self.body += chunk
        return len(self.body) <= BODY_CAP

    def response(self, complete: bool) -> Response:
        if not complete:
            return Response(self.status, None, self.retry_after)
        return Response(self.status, bytes(self.body), self.retry_after)


_SEND_FAILURE = Response(failure="send")
_READ_FAILURE = Response(failure="read")


def _start(response: httpx.Response) -> _Reading | None:
    # Redirects are refused, like fetch with redirect: "error": the authority never redirects GraphQL.
    if response.is_redirect:
        return None
    return _Reading(response.status_code, response.headers.get("retry-after"))


@dataclasses.dataclass(slots=True)
class _Active:
    """A mutation in flight, shared by concurrent calls with the same request ID and identity."""

    identity: str
    work: Any


class SyncDriver:
    """Runs flows on the calling thread. One lock guards engine state; requests run outside it."""

    __slots__ = ("_engine", "_http", "_key", "_lock", "_secret", "_storage", "_timeout", "_url")

    def __init__(
        self,
        engine: Engine,
        http: httpx.Client,
        url: str,
        secret: Secret,
        timeout: float,
        storage: RecoveryStorage | None,
        key: str,
    ) -> None:
        self._engine = engine
        self._http = http
        self._url = url
        self._secret = secret
        self._timeout = timeout
        self._storage = storage
        self._key = key
        self._lock = threading.RLock()

    @property
    def lock(self) -> threading.RLock:
        return self._lock

    def run(self, flow: Flow[T]) -> T:
        value: Any = None
        error: BaseException | None = None
        while True:
            with self._lock:
                try:
                    effect = flow.send(value) if error is None else flow.throw(error)
                except StopIteration as stop:
                    result: T = stop.value
                    return result
            value, error = None, None
            try:
                value = self._perform(effect)
            except BaseException as caught:  # noqa: BLE001 - the flow handles Exception and lets the rest propagate.
                error = caught

    def _perform(self, effect: Effect) -> Any:
        if isinstance(effect, Send):
            return self._send(effect)
        if isinstance(effect, Persist):
            return self._persist(effect.request_id)
        return self._mutate(effect)

    def _send(self, effect: Send) -> Response:
        request = _build(self._url, effect.body, self._secret, self._timeout)
        deadline = time.monotonic() + self._timeout
        try:
            response: httpx.Response | None = self._http.send(request, stream=True, auth=None, follow_redirects=False)
        except Exception:  # noqa: BLE001 - every send failure leaves the outcome unknown.
            response = None
        # Failures are reported outside the handler so no exception (or request) is chained to the problem.
        if response is None:
            return _SEND_FAILURE
        try:
            reading = _start(response)
            if reading is None:
                return _SEND_FAILURE
            complete, failed = True, False
            try:
                for chunk in response.iter_bytes():
                    if not reading.add(chunk):
                        complete = False
                        break
                    if time.monotonic() > deadline:
                        failed = True
                        break
            except Exception:  # noqa: BLE001 - a broken body leaves the outcome unknown.
                failed = True
            return _READ_FAILURE if failed else reading.response(complete)
        finally:
            with contextlib.suppress(Exception):
                response.close()

    def _persist(self, request_id: str) -> None:
        storage = self._storage
        if storage is None:
            return
        with self._lock:
            snapshot = self._engine.snapshot()
            try:
                storage.set_item(self._key, snapshot)
            except Exception as cause:
                raise self._engine.storage_failure(request_id) from cause

    def _mutate(self, effect: Mutate) -> Envelope:
        engine, call = self._engine, effect.call
        identity = engine.identity(call)
        with self._lock:
            entry = engine.active.get(call.request_id)
            if entry is not None:
                if not isinstance(entry, _Active) or entry.identity != identity:
                    raise conflict(call.request_id)
                owner = False
            else:
                entry = _Active(identity, concurrent.futures.Future())
                engine.active[call.request_id] = entry
                owner = True
        future: concurrent.futures.Future[Envelope] = entry.work
        if not owner:
            return future.result()
        try:
            envelope = self.run(engine.mutate(call, effect.retry))
        except BaseException as error:
            # Waiting threads get the failure; an interrupt stays with the thread it interrupted.
            future.set_exception(error if isinstance(error, Exception) else _interrupted(call.request_id))
            raise
        else:
            future.set_result(envelope)
            return envelope
        finally:
            with self._lock:
                if engine.active.get(call.request_id) is entry:
                    del engine.active[call.request_id]


class AsyncDriver:
    """Runs flows on one asyncio event loop. Mutations run as tasks, so cancelling a caller never abandons one."""

    __slots__ = (
        "_async_storage",
        "_engine",
        "_http",
        "_initialization",
        "_key",
        "_ready",
        "_secret",
        "_storage",
        "_timeout",
        "_url",
        "_writes",
    )

    def __init__(
        self,
        engine: Engine,
        http: httpx.AsyncClient,
        url: str,
        secret: Secret,
        timeout: float,
        storage: RecoveryStorage | None,
        async_storage: AsyncRecoveryStorage | None,
        key: str,
    ) -> None:
        if storage is not None and async_storage is not None:
            raise TypeError("Choose recovery_storage or async_recovery_storage, not both")
        self._engine = engine
        self._http = http
        self._url = url
        self._secret = secret
        self._timeout = timeout
        self._storage = storage
        self._async_storage = async_storage
        self._key = key
        self._writes: asyncio.Lock | None = None
        self._initialization: asyncio.Task[None] | None = None
        self._ready = async_storage is None

    @property
    def ready(self) -> bool:
        return self._ready

    async def initialize(self) -> None:
        """Loads asynchronous recovery storage once; a failure is kept and raised to every later call."""
        if self._ready:
            return
        if self._initialization is None:
            self._initialization = asyncio.get_running_loop().create_task(self._load())
            self._initialization.add_done_callback(_retrieve)
        await _join(self._initialization)

    async def _load(self) -> None:
        storage = self._async_storage
        if storage is None:
            return
        saved = await storage.get_item(self._key)
        if saved is not None and (not isinstance(saved, str) or not saved):
            raise ValueError("Invalid asynchronous mutation recovery storage")
        self._engine.restore(saved)
        self._ready = True

    async def run(self, flow: Flow[T]) -> T:
        value: Any = None
        error: BaseException | None = None
        while True:
            try:
                effect = flow.send(value) if error is None else flow.throw(error)
            except StopIteration as stop:
                result: T = stop.value
                return result
            value, error = None, None
            try:
                value = await self._perform(effect)
            except BaseException as caught:  # noqa: BLE001 - the flow handles Exception and lets the rest propagate.
                error = caught

    def _perform(self, effect: Effect) -> Awaitable[Any]:
        if isinstance(effect, Send):
            return self._send(effect)
        if isinstance(effect, Persist):
            return self._persist(effect.request_id)
        return self._mutate(effect)

    async def _send(self, effect: Send) -> Response:
        request = _build(self._url, effect.body, self._secret, self._timeout)
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self._timeout
        try:
            response: httpx.Response | None = await self._http.send(
                request, stream=True, auth=None, follow_redirects=False
            )
        except Exception:  # noqa: BLE001 - every send failure leaves the outcome unknown.
            response = None
        if response is None:
            return _SEND_FAILURE
        try:
            reading = _start(response)
            if reading is None:
                return _SEND_FAILURE
            complete, failed = True, False
            try:
                async for chunk in response.aiter_bytes():
                    if not reading.add(chunk):
                        complete = False
                        break
                    if loop.time() > deadline:
                        failed = True
                        break
            except Exception:  # noqa: BLE001 - a broken body leaves the outcome unknown.
                failed = True
            return _READ_FAILURE if failed else reading.response(complete)
        finally:
            with contextlib.suppress(Exception):
                await response.aclose()

    async def _persist(self, request_id: str) -> None:
        storage, async_storage = self._storage, self._async_storage
        if storage is not None:
            try:
                storage.set_item(self._key, self._engine.snapshot())
            except Exception as cause:
                raise self._engine.storage_failure(request_id) from cause
            return
        if async_storage is None:
            return
        if self._writes is None:
            self._writes = asyncio.Lock()
        # Writes are serialized and each takes the latest snapshot, so the last write reflects every change.
        async with self._writes:
            try:
                await async_storage.set_item(self._key, self._engine.snapshot())
            except Exception as cause:
                raise self._engine.storage_failure(request_id) from cause

    async def _mutate(self, effect: Mutate) -> Envelope:
        engine, call = self._engine, effect.call
        identity = engine.identity(call)
        entry = engine.active.get(call.request_id)
        if entry is not None:
            if not isinstance(entry, _Active) or entry.identity != identity:
                raise conflict(call.request_id)
        else:
            task = asyncio.get_running_loop().create_task(self.run(engine.mutate(call, effect.retry)))
            entry = _Active(identity, task)
            engine.active[call.request_id] = entry
            task.add_done_callback(functools.partial(_settled, engine, call.request_id, entry))
        work: asyncio.Task[Envelope] = entry.work
        return await _join(work)


def _settled(engine: Engine, request_id: str, entry: _Active, task: asyncio.Task[Envelope]) -> None:
    if engine.active.get(request_id) is entry:
        del engine.active[request_id]
    _retrieve(task)


def _retrieve(task: asyncio.Task[Any]) -> None:
    # Marks a shared task's outcome retrieved: every caller awaiting it may have been cancelled.
    if not task.cancelled():
        task.exception()


async def _join(task: asyncio.Task[T]) -> T:
    # Awaits a shared task without cancelling it when this caller is cancelled. Unlike asyncio.shield, which from
    # Python 3.14 reports such a task's exception to the loop once a caller is cancelled, this leaves it to _retrieve.
    if not task.done():
        await asyncio.wait((task,))
    return task.result()


def _interrupted(request_id: str) -> Exception:
    return ConvoHopProblem("TRANSPORT_UNKNOWN", request_id, "unknown", 0, _UNAVAILABLE)
