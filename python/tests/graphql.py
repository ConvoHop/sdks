"""A recording GraphQL authority, protocol response fixtures and recording storages for the client tests."""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable, Iterator, Mapping
from datetime import UTC, datetime
from typing import Any

import httpx
import pytest

from convohop import AsyncConvoHop, AsyncConvoHopManagement, ConvoHop, ConvoHopManagement, ConvoHopProblem
from convohop._generated.operations import OBJECTS, OPERATIONS

BASE_URL = "http://127.0.0.1:18080"
ENDPOINT = BASE_URL + "/graphql"
BACKEND_KEY = "fixture-backend-key-never-in-errors"
ACCESS_TOKEN = "fixture-operator-token-never-in-errors"
_KEYS = {operation.operation_name: key for key, operation in OPERATIONS.items()}


def uid() -> str:
    """A random canonical UUID."""
    return str(uuid.uuid4())


def now() -> str:
    """The current time as the protocol's ``YYYY-MM-DDTHH:MM:SS.mmmZ``."""
    moment = datetime.now(UTC)
    return f"{moment:%Y-%m-%dT%H:%M:%S}.{moment.microsecond // 1000:03d}Z"


def full(type_name: str, fields: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Every field of the protocol object ``type_name``: the given value, else null."""
    shape = OBJECTS[type_name]
    given = dict(fields or {})
    unknown = sorted(set(given) - set(shape))
    if unknown:
        raise KeyError(f"{type_name} has no field {unknown[0]}")
    return {name: given.get(name) for name in shape}


class UnexpectedRequestError(BaseException):
    """Raised by a responder for a request the test did not expect.

    It derives from ``BaseException`` so the client's transport cannot mistake it for a network failure.
    """


class Received:
    """One GraphQL request the authority received."""

    __slots__ = ("body", "content", "headers", "key", "url")

    def __init__(self, request: httpx.Request) -> None:
        self.url = str(request.url)
        self.headers = request.headers
        self.content = request.content
        self.body: dict[str, Any] = json.loads(request.content)
        self.key = _KEYS[self.body["operationName"]]

    @property
    def context(self) -> dict[str, Any]:
        context: dict[str, Any] = self.body["variables"]["context"]
        return context

    @property
    def request_id(self) -> str:
        request_id: str = self.context["requestId"]
        return request_id

    @property
    def input(self) -> Any:
        """``variables.input``, or ``None`` when the operation has no input."""
        return self.body["variables"].get("input")


Responder = Callable[[Received], httpx.Response | Awaitable[httpx.Response]]


def unexpected(request: Received) -> httpx.Response:
    raise UnexpectedRequestError(request.key)


class Authority:
    """Answers each request with ``respond`` and records it. Build clients with its methods."""

    def __init__(self, respond: Responder = unexpected) -> None:
        self.respond = respond
        self.requests: list[Received] = []

    @property
    def keys(self) -> list[str]:
        return [request.key for request in self.requests]

    def count(self, key: str) -> int:
        return sum(request.key == key for request in self.requests)

    def _receive(self, request: httpx.Request) -> httpx.Response | Awaitable[httpx.Response]:
        received = Received(request)
        self.requests.append(received)
        return self.respond(received)

    def _handle(self, request: httpx.Request) -> httpx.Response:
        response = self._receive(request)
        if not isinstance(response, httpx.Response):
            raise UnexpectedRequestError("A synchronous client needs a synchronous responder")
        return response

    async def _handle_async(self, request: httpx.Request) -> httpx.Response:
        response = self._receive(request)
        return response if isinstance(response, httpx.Response) else await response

    def http(self) -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(self._handle))

    def async_http(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(self._handle_async))

    def project(self, **options: Any) -> ConvoHop:
        settings: dict[str, Any] = {"base_url": BASE_URL, "backend_key": BACKEND_KEY, "project_id": uid()}
        settings |= {"incarnation": uid(), "http_client": self.http(), **options}
        return ConvoHop(**settings)

    def management(self, **options: Any) -> ConvoHopManagement:
        settings: dict[str, Any] = {"base_url": BASE_URL, "access_token": ACCESS_TOKEN, "actor_id": uid()}
        settings |= {"http_client": self.http(), **options}
        return ConvoHopManagement(**settings)

    def async_project(self, **options: Any) -> AsyncConvoHop:
        settings: dict[str, Any] = {"base_url": BASE_URL, "backend_key": BACKEND_KEY, "project_id": uid()}
        settings |= {"incarnation": uid(), "http_client": self.async_http(), **options}
        return AsyncConvoHop(**settings)

    def async_management(self, **options: Any) -> AsyncConvoHopManagement:
        settings: dict[str, Any] = {"base_url": BASE_URL, "access_token": ACCESS_TOKEN, "actor_id": uid()}
        settings |= {"http_client": self.async_http(), **options}
        return AsyncConvoHopManagement(**settings)


def reply(request: Received, **fields: Any) -> httpx.Response:
    """A successful envelope answering ``request``: ``committed`` for a mutation, else ``ok``, then ``fields``.

    Typed payloads carry no ``serverTime``, so defaults the result type lacks are left out; ``fields`` must all exist.
    """
    operation = OPERATIONS[request.key]
    type_name = operation.result_type.rstrip("!")
    stamp = now()
    defaults = {
        "status": "committed" if operation.kind == "mutation" else "ok",
        "requestId": request.request_id,
        "serverTime": stamp,
        "receiptId": uid(),
        "committedAt": stamp,
        "replayed": False,
    }
    envelope = {name: value for name, value in defaults.items() if name in OBJECTS[type_name]} | fields
    return httpx.Response(200, json={"data": {operation.field: full(type_name, envelope)}})


def resolution(request_id: str, state: str, retained: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """A ``RequestResolution`` for ``request_id``; ``retained`` fills the receipt's typed result."""
    stamp = now()
    receipt = None
    if state != "notObservedYet":
        result = None if retained is None else full("RetainedResult", retained)
        receipt = full(
            "ResolvedReceipt",
            {"status": state, "requestId": request_id, "receiptId": uid(), "committedAt": stamp, "replayed": False}
            | {"result": result},
        )
    return full(
        "RequestResolution",
        {"state": state, "requestId": request_id, "checkedAt": stamp, "resultWithheld": False, "receipt": receipt},
    )


def graphql_error(
    request: Received,
    code: str,
    status: int,
    message: str,
    *,
    headers: Mapping[str, str] | None = None,
    **extensions: Any,
) -> httpx.Response:
    """An HTTP 200 GraphQL error naming ``request``; ``extensions`` override the defaults."""
    defaults: dict[str, Any] = {"code": code, "requestId": request.request_id, "outcome": "rejected"}
    defaults |= {"retryable": code != "SCOPE_REQUIRED", "status": status}
    body = {"errors": [{"message": message, "extensions": defaults | extensions}]}
    return httpx.Response(200, json=body, headers=headers)


def message(conversation_id: str, **fields: Any) -> dict[str, Any]:
    """A visible ``Message`` in ``conversation_id``."""
    values: dict[str, Any] = {"messageId": uid(), "conversationId": conversation_id, "authorId": uid(), "sequence": "1"}
    values |= {"revision": "1", "revisionSequence": "1", "createdAt": now(), "deleted": False, "text": "Fixture"}
    return full("Message", values | {"props": {}} | fields)


def principal(principal_id: str, **fields: Any) -> dict[str, Any]:
    """An active ``Principal``."""
    values = {"principalId": principal_id, "externalUserId": "fixture-user", "status": "active", "revision": "1"}
    return full("Principal", values | fields)


def member(conversation_id: str, principal_id: str, **fields: Any) -> dict[str, Any]:
    """An active ``Member`` of ``conversation_id``."""
    values: dict[str, Any] = {"conversationId": conversation_id, "principalId": principal_id, "role": "member"}
    values |= {"status": "active", "membershipEpoch": "1", "visibilityEpoch": "1", "revision": "1"}
    return full("Member", values | {"visibleFromSequence": "1", "canStartBroadcast": False} | fields)


def route_proof(project_id: str, incarnation: str, serving_epoch: str = "2") -> dict[str, Any]:
    """The signed route a backend key reads; the client checks its project, incarnation and serving epoch."""
    proof = {"projectId": project_id, "incarnation": incarnation, "servingEpoch": serving_epoch}
    return proof | {"expiresAt": now(), "signature": "fixture-route-proof"}


def accepted_operation(owner: str = "management") -> dict[str, Any]:
    """An ``OperationRef`` for a request the authority accepted for later completion."""
    return full("OperationRef", {"operationId": uid(), "owner": owner, "href": "/graphql", "state": "requested"})


def member_page(items: list[dict[str, Any]], next_cursor: str | None, *, refresh: bool = False) -> dict[str, Any]:
    """A ``MemberPage``: complete when it has no next cursor and needs no refresh."""
    complete = next_cursor is None and not refresh
    page = {"items": items, "complete": complete, "refreshRequired": refresh, "nextCursor": next_cursor}
    return full("MemberPage", page)


def offline(request: Received) -> httpx.Response:
    """Loses every request on the network, so its outcome is unknown."""
    raise httpx.ConnectError("offline")


def settle(request: Received) -> httpx.Response:
    """Commits an organization or accepts a deployment."""
    if request.key == "management.createDeployment":
        resource = {"kind": "deployment", "id": uid()}
        return reply(request, status="accepted", operation=accepted_operation(), resourceRef=resource)
    if request.key == "management.createOrganization":
        organization = {"orgId": uid(), "name": request.input["name"], "status": "active", "revision": "1"}
        return reply(request, result=full("Organization", organization))
    raise UnexpectedRequestError(request.key)


def resolves(*states: str) -> Callable[[Received], httpx.Response]:
    """Answers each ``resolveRequest`` with the next state (the last one repeats) and sends nothing else."""
    pending = list(states)

    def respond(request: Received) -> httpx.Response:
        if not request.key.endswith(".resolveRequest"):
            raise UnexpectedRequestError(request.key)
        state = pending.pop(0) if len(pending) > 1 else pending[0]
        return reply(request, result=resolution(request.input["requestId"], state))

    return respond


def answer(mutation: Callable[[Received], httpx.Response], *states: str) -> Callable[[Received], httpx.Response]:
    """Answers mutations with ``mutation`` and each ``resolveRequest`` with the next of ``states``."""
    resolve = resolves(*states)

    def respond(request: Received) -> httpx.Response:
        return resolve(request) if request.key.endswith(".resolveRequest") else mutation(request)

    return respond


class Storage:
    """Synchronous recovery storage that records reads and writes. ``on_write`` may raise to fail a write."""

    def __init__(self, on_write: Callable[[str, str, int], None] | None = None) -> None:
        self.values: dict[str, str] = {}
        self.reads: list[str] = []
        self.writes: list[tuple[str, str]] = []
        self.on_write = on_write

    def get_item(self, key: str) -> str | None:
        self.reads.append(key)
        return self.values.get(key)

    def set_item(self, key: str, value: str) -> None:
        self.writes.append((key, value))
        if self.on_write is not None:
            self.on_write(key, value, len(self.writes))
        self.values[key] = value

    def records(self, key: str) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = json.loads(self.values[key])
        return records


class AsyncStorage:
    """Asynchronous recovery storage that records reads and writes; the hooks may pause or fail them."""

    def __init__(
        self,
        *,
        on_read: Callable[[str], Awaitable[None]] | None = None,
        on_write: Callable[[str, str, int], Awaitable[None]] | None = None,
    ) -> None:
        self.values: dict[str, str] = {}
        self.reads: list[str] = []
        self.writes: list[tuple[str, str]] = []
        self.on_read = on_read
        self.on_write = on_write

    async def get_item(self, key: str) -> str | None:
        self.reads.append(key)
        if self.on_read is not None:
            await self.on_read(key)
        return self.values.get(key)

    async def set_item(self, key: str, value: str) -> None:
        self.writes.append((key, value))
        if self.on_write is not None:
            await self.on_write(key, value, len(self.writes))
        self.values[key] = value

    def records(self, key: str) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = json.loads(self.values[key])
        return records


def fail_writes(*numbers: int) -> Callable[[str, str, int], None]:
    """An ``on_write`` hook that fails the given 1-based writes."""

    def hook(_key: str, _value: str, count: int) -> None:
        if count in numbers:
            raise OSError("database unavailable")

    return hook


class Chunks(httpx.SyncByteStream, httpx.AsyncByteStream):
    """A response body that yields ``chunks`` and then raises ``error``, if one is given."""

    def __init__(self, *chunks: bytes, error: Exception | None = None) -> None:
        self._chunks = chunks
        self._error = error

    def __iter__(self) -> Iterator[bytes]:
        yield from self._chunks
        if self._error is not None:
            raise self._error

    async def __aiter__(self) -> AsyncIterator[bytes]:
        for chunk in self._chunks:
            yield chunk
        if self._error is not None:
            raise self._error


def rejects(call: Callable[[], object], code: str, message: str | None = None) -> ConvoHopProblem:
    """Runs ``call``, which must raise the problem ``code`` (with ``message``, when given), and returns it."""
    with pytest.raises(ConvoHopProblem) as caught:
        call()
    problem = caught.value
    assert problem.code == code, repr(problem)
    if message is not None:
        assert problem.message == message, repr(problem)
    return problem


async def rejects_async(
    call: Callable[[], Awaitable[object]], code: str, message: str | None = None
) -> ConvoHopProblem:
    """Awaits ``call``, which must raise the problem ``code`` (with ``message``, when given), and returns it."""
    with pytest.raises(ConvoHopProblem) as caught:
        await call()
    problem = caught.value
    assert problem.code == code, repr(problem)
    if message is not None:
        assert problem.message == message, repr(problem)
    return problem
