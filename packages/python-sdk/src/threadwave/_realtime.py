from __future__ import annotations

import asyncio
import json
import time
from abc import ABC, abstractmethod
from typing import (
    TYPE_CHECKING,
    AsyncGenerator,
    AsyncIterator,
    Callable,
    Generic,
    Mapping,
    Optional,
    Protocol,
    TypeVar,
)
from urllib.parse import urlsplit, urlunsplit

from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosed, InvalidHandshake, InvalidStatus
from websockets.typing import Subprotocol

from ._errors import APIError, ProtocolError, ReplayError, RequestTimeout, TransportError, graphql_error
from ._models import CallEvent, ThreadEvent, parse_call_event, parse_thread_event, record, text
from ._queries import CALL_EVENT, EVENT, operation

if TYPE_CHECKING:
    from ._clients import UserClient


def _frame(raw: object) -> Mapping[str, object]:
    if not isinstance(raw, str):
        raise ProtocolError("GraphQL WebSocket sent a non-text frame")
    try:
        frame = record(json.loads(raw), "GraphQL WebSocket frame")
    except json.JSONDecodeError as exc:
        raise ProtocolError("GraphQL WebSocket sent invalid JSON") from exc
    if text(frame, "type") == "error":
        raise graphql_error(frame.get("payload"), None)
    return frame


def _pong(frame: Mapping[str, object]) -> dict[str, object]:
    response: dict[str, object] = {"type": "pong"}
    if "payload" in frame:
        response["payload"] = frame["payload"]
    return response


class _Sequenced(Protocol):
    @property
    def sequence(self) -> int: ...


EventT = TypeVar("EventT", bound=_Sequenced)


class _RealtimeSubscription(AsyncIterator[EventT], Generic[EventT], ABC):
    """Authenticated graphql-transport-ws stream with acknowledged replay cursor."""

    _field: str

    def __init__(
        self,
        client: UserClient,
        http_url: str,
        token: str,
        *,
        after: int,
        reconnect_delay: float,
        max_reconnect_delay: float,
        max_retries: Optional[int],
        on_close: Callable[[_RealtimeSubscription[EventT]], None],
    ) -> None:
        self._client = client
        self._http_url = http_url
        self._token = token
        self._after = after
        self._reconnect_delay = reconnect_delay
        self._max_reconnect_delay = max_reconnect_delay
        self._max_retries = max_retries
        self._on_close = on_close
        self._socket: Optional[ClientConnection] = None
        self._iterator: Optional[AsyncGenerator[EventT, None]] = None
        self._reader: Optional[asyncio.Task[object]] = None
        self._stop = asyncio.Event()
        self._closed = False

    @property
    def after(self) -> int:
        """Last event acknowledged by requesting the next item from the iterator."""
        return self._after

    def __aiter__(self) -> _RealtimeSubscription[EventT]:
        return self

    async def __anext__(self) -> EventT:
        if self._closed:
            raise StopAsyncIteration
        if self._reader is not None:
            raise RuntimeError("subscription cannot be read concurrently")
        if self._iterator is None:
            self._iterator = self._run()
        self._reader = asyncio.current_task()
        try:
            return await self._iterator.__anext__()
        except (StopAsyncIteration, APIError, ProtocolError, TransportError, asyncio.CancelledError):
            self._finish()
            raise
        finally:
            self._reader = None

    async def __aenter__(self) -> _RealtimeSubscription[EventT]:
        if self._closed:
            raise RuntimeError("subscription is closed")
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    def _finish(self) -> None:
        if not self._closed:
            self._closed = True
            self._stop.set()
            self._on_close(self)

    async def aclose(self) -> None:
        if self._closed:
            return
        self._finish()
        reader = self._reader
        if reader is not None and reader is not asyncio.current_task():
            reader.cancel()
        if self._socket is not None:
            await self._socket.close()
        if reader is None and self._iterator is not None:
            await self._iterator.aclose()

    def _socket_url(self) -> str:
        parsed = urlsplit(self._http_url)
        return urlunsplit(
            ("wss" if parsed.scheme == "https" else "ws", parsed.netloc, parsed.path, "", "")
        )

    @abstractmethod
    def _subscription(self) -> Mapping[str, object]:
        """Return the query and variables for this acknowledged cursor."""

    @abstractmethod
    def _accept(self, value: object) -> EventT:
        """Decode one subscription result."""

    @abstractmethod
    def _replay_after_disconnect(self) -> AsyncIterator[EventT]:
        """Replay durable pages, including sparse or filtered cursor ranges."""

    async def _authenticate(self, socket: ClientConnection) -> None:
        if socket.subprotocol != "graphql-transport-ws":
            raise ProtocolError("GraphQL WebSocket subprotocol was not negotiated")
        await asyncio.wait_for(
            socket.send(json.dumps({"type": "connection_init", "payload": {"token": self._token}})),
            self._client.timeout,
        )
        deadline = asyncio.get_running_loop().time() + self._client.timeout
        while True:
            remaining = deadline - asyncio.get_running_loop().time()
            frame = _frame(await asyncio.wait_for(socket.recv(), remaining))
            kind = text(frame, "type")
            if kind == "connection_ack":
                break
            if kind != "ping":
                raise ProtocolError("GraphQL WebSocket did not acknowledge connection_init")
            await asyncio.wait_for(socket.send(json.dumps(_pong(frame))), remaining)
        await asyncio.wait_for(
            socket.send(
                json.dumps({"id": "1", "type": "subscribe", "payload": self._subscription()})
            ),
            self._client.timeout,
        )

    async def _run(self) -> AsyncGenerator[EventT, None]:
        retries = 0
        replay_needed = False
        while not self._closed:
            previous_after = self._after
            ready_at: Optional[float] = None
            connected = False
            failure: TransportError = TransportError("GraphQL WebSocket closed")
            try:
                if replay_needed:
                    async for event in self._replay_after_disconnect():
                        if self._closed:
                            return
                        if event.sequence <= self._after:
                            continue
                        yield event
                        self._after = event.sequence
                if self._closed:
                    return
                async with connect(
                    self._socket_url(),
                    subprotocols=[Subprotocol("graphql-transport-ws")],
                    proxy=None,
                    open_timeout=self._client.timeout,
                    close_timeout=self._client.timeout,
                    ping_interval=20,
                    ping_timeout=self._client.timeout,
                    max_size=64 * 1024,
                ) as socket:
                    self._socket = socket
                    await self._authenticate(socket)
                    connected = True
                    ready_at = time.monotonic()
                    async for raw in socket:
                        if self._closed:
                            return
                        frame = _frame(raw)
                        kind = text(frame, "type")
                        if kind == "ping":
                            await socket.send(json.dumps(_pong(frame)))
                            continue
                        if kind == "pong":
                            continue
                        if frame.get("id") != "1":
                            raise ProtocolError("GraphQL WebSocket sent the wrong subscription ID")
                        if kind == "complete":
                            raise ProtocolError("GraphQL subscription completed unexpectedly")
                        if kind != "next":
                            raise ProtocolError(f"GraphQL WebSocket sent unexpected {kind} frame")
                        payload = record(frame.get("payload"), "GraphQL subscription payload")
                        if "errors" in payload:
                            raise graphql_error(payload["errors"], None)
                        data = record(payload.get("data"), "GraphQL subscription data")
                        if self._field not in data or data[self._field] is None:
                            raise ProtocolError("GraphQL subscription omitted its event")
                        event = self._accept(data[self._field])
                        if event.sequence <= self._after:
                            continue
                        yield event
                        self._after = event.sequence
            except InvalidStatus as exc:
                status = exc.response.status_code
                if 400 <= status < 500 and status != 429:
                    code = "UNAUTHENTICATED" if status == 401 else (
                        "FORBIDDEN" if status == 403 else "HANDSHAKE_REJECTED"
                    )
                    raise APIError(status, code, "GraphQL WebSocket handshake was rejected") from exc
                failure = TransportError(f"GraphQL WebSocket handshake returned HTTP {status}")
            except asyncio.TimeoutError:
                failure = RequestTimeout(
                    f"GraphQL WebSocket connection or authentication timed out after "
                    f"{self._client.timeout:g}s"
                )
            except ConnectionClosed as exc:
                close_code = exc.rcvd.code if exc.rcvd is not None else None
                if close_code in (4401, 4403):
                    code = "UNAUTHENTICATED" if close_code == 4401 else "FORBIDDEN"
                    raise APIError(None, code, "GraphQL WebSocket authorization failed") from exc
                failure = TransportError(f"GraphQL WebSocket closed: {close_code}")
            except (InvalidHandshake, OSError) as exc:
                failure = TransportError(f"GraphQL WebSocket transport failed: {type(exc).__name__}")
            except TransportError as exc:
                failure = exc
            finally:
                self._socket = None
            if self._closed:
                return
            if connected:
                replay_needed = True
            if self._after > previous_after or (
                ready_at is not None and time.monotonic() - ready_at >= 30
            ):
                retries = 0
            if self._max_retries is not None and retries >= self._max_retries:
                if isinstance(failure, RequestTimeout):
                    raise RequestTimeout(
                        f"GraphQL subscription stopped after {retries} reconnects: {failure}"
                    ) from failure
                raise TransportError(
                    f"GraphQL subscription stopped after {retries} reconnects: {failure}"
                ) from failure
            delay = min(self._reconnect_delay * 2 ** min(retries, 10), self._max_reconnect_delay)
            retries += 1
            try:
                await asyncio.wait_for(self._stop.wait(), delay)
            except asyncio.TimeoutError:
                pass


class ThreadSubscription(_RealtimeSubscription[ThreadEvent]):
    """Thread events, replayed through GraphQL after a transport disconnect."""

    _field = "threadEvents"

    def __init__(
        self,
        client: UserClient,
        thread_id: str,
        http_url: str,
        token: str,
        *,
        after: int,
        reconnect_delay: float,
        max_reconnect_delay: float,
        max_retries: Optional[int],
        on_close: Callable[[_RealtimeSubscription[ThreadEvent]], None],
    ) -> None:
        super().__init__(
            client,
            http_url,
            token,
            after=after,
            reconnect_delay=reconnect_delay,
            max_reconnect_delay=max_reconnect_delay,
            max_retries=max_retries,
            on_close=on_close,
        )
        self._thread_id = thread_id

    async def __aenter__(self) -> ThreadSubscription:
        await super().__aenter__()
        return self

    def _subscription(self) -> Mapping[str, object]:
        return {
            "query": operation(
                "subscription",
                "threadEvents",
                "$threadId:ID!,$after:String",
                "threadId:$threadId,after:$after",
                EVENT,
            ),
            "variables": {"threadId": self._thread_id, "after": str(self._after)},
        }

    def _accept(self, value: object) -> ThreadEvent:
        return parse_thread_event(value, self._thread_id)

    def _replay_after_disconnect(self) -> AsyncIterator[ThreadEvent]:
        return self._replay_events()

    async def _replay_events(self) -> AsyncGenerator[ThreadEvent, None]:
        page_after = self._after
        while True:
            page = await self._client.thread_events(self._thread_id, after=page_after, limit=100)
            for event in page.items:
                if event.sequence > self._after:
                    yield event
            if not page.has_more:
                return
            if page.next_after <= page_after:
                raise ReplayError("Durable thread replay cursor did not advance")
            page_after = page.next_after


class CallSubscription(_RealtimeSubscription[CallEvent]):
    """Sparse per-project call events with GraphQL replay after disconnection."""

    _field = "callEvents"

    async def __aenter__(self) -> CallSubscription:
        await super().__aenter__()
        return self

    def _subscription(self) -> Mapping[str, object]:
        return {
            "query": operation(
                "subscription", "callEvents", "$after:String", "after:$after", CALL_EVENT
            ),
            "variables": {"after": str(self._after)},
        }

    def _accept(self, value: object) -> CallEvent:
        return parse_call_event(value)

    def _replay_after_disconnect(self) -> AsyncIterator[CallEvent]:
        return self._replay_events()

    async def _replay_events(self) -> AsyncGenerator[CallEvent, None]:
        page_after = self._after
        while True:
            page = await self._client.call_events(after=page_after, limit=100)
            for event in page.items:
                if event.sequence > self._after:
                    yield event
            if not page.has_more:
                return
            if page.next_after <= page_after:
                raise ReplayError("Durable call replay cursor did not advance")
            page_after = page.next_after
