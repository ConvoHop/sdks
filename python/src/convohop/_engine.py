"""The request engine shared by the synchronous and asynchronous clients.

Flows are generators. They yield effects (send a request, persist recovery records, run a mutation) and a driver
performs each effect, sending its result back or throwing its failure in. Every protocol and recovery decision lives
here, so both clients behave identically and tests can drive the engine without a network.
"""

from __future__ import annotations

import copy
import dataclasses
import hashlib
import time
import uuid
from collections.abc import Callable, Generator, Mapping
from typing import Any, Literal, TypeAlias, TypeVar

from ._checks import Scope, check, invalid, missing
from ._generated.operations import ERRORS, IDEMPOTENCY, OPERATIONS, PLANES, OperationSpec
from ._json import canonical, normalize, parse
from ._protocol import parse_counter, parse_id, parse_timestamp, retry_delay
from ._validate import validate_input, validate_output
from .errors import ConvoHopProblem, authority_problem
from .recovery import MANAGEMENT_INCARNATION, MAX_RECORDS, RecoveryState, public_state, restore, snapshot

RESPONSE_BOUND = 1_048_576
"""The largest response, in UTF-16 code units, the authority may send (the TypeScript SDK's bound)."""
BODY_CAP = 3 * RESPONSE_BOUND + 3
"""Bytes worth reading: no longer UTF-8 body (with a byte order mark) decodes to text within the bound."""

_SETTLED = ("committed", "accepted")
_RESENDABLE = ("pending", "rejected")
"""States in which no attempt may have been applied: never sent, or every attempt rejected."""
_RESOLVE = frozenset(PLANES.values())
_ROLES = ("member", "moderator")
_DEFAULT_ATTEMPTS = 3
_DEFAULT_WINDOW_MS = 60_000
_ELIGIBILITY = "The original request is no longer eligible for resend"
_STORAGE = "Recovery storage did not confirm durability; retain the original request and its outcome"
_LIMIT = f"Recovery storage already holds {MAX_RECORDS} requests that aren't final; retry or resolve them first"

Envelope: TypeAlias = dict[str, Any]
T = TypeVar("T")


def _now_ms() -> int:
    return time.time_ns() // 1_000_000


@dataclasses.dataclass(frozen=True, slots=True)
class Call:
    """One planned request: the operation, its normalized input and its identity."""

    operation: OperationSpec
    input: dict[str, Any]
    request_id: str
    project_id: str | None


@dataclasses.dataclass(frozen=True, slots=True)
class Send:
    """Effect: POST ``body`` to ``/graphql`` and return a :class:`Response`."""

    body: bytes
    request_id: str


@dataclasses.dataclass(frozen=True, slots=True)
class Response:
    """What the driver observed. ``body`` is ``None`` when it exceeded :data:`BODY_CAP`."""

    status: int = 0
    body: bytes | None = None
    retry_after: str | None = None
    failure: Literal["send", "read"] | None = None


@dataclasses.dataclass(frozen=True, slots=True)
class Persist:
    """Effect: write a snapshot of every recovery record before continuing."""

    request_id: str


@dataclasses.dataclass(frozen=True, slots=True)
class Mutate:
    """Effect: run ``Engine.mutate`` once per request ID, sharing it with concurrent identical calls."""

    call: Call
    retry: bool


Effect: TypeAlias = Send | Persist | Mutate
Flow = Generator[Effect, Any, T]


def _problem(code: str, request_id: str, outcome: str, status: int, message: str) -> ConvoHopProblem:
    return ConvoHopProblem(code, request_id, outcome, status, message)


def conflict(request_id: str) -> ConvoHopProblem:
    return _problem("IDEMPOTENCY_CONFLICT", request_id, "unknown", 409, "Preserve the original request and payload")


def _incarnation(request_id: str) -> ConvoHopProblem:
    return _problem(
        "INCARNATION_MISMATCH", request_id, "unknown", 409, "Explicit recovery is required for this incarnation"
    )


class Engine:
    """Request planning, response interpretation and mutation recovery for one client."""

    __slots__ = ("active", "incarnation", "persistent", "project_id", "serving_epoch", "states")

    def __init__(self, *, project_id: str | None, incarnation: str, persistent: bool) -> None:
        self.project_id = project_id
        self.incarnation = incarnation
        self.persistent = persistent
        self.serving_epoch: str | None = None
        self.states: dict[str, dict[str, Any]] = {}
        self.active: dict[str, object] = {}
        """In-flight mutations by request ID; the driver owns the values."""

    # Recovery records

    def restore(self, saved: str | None) -> None:
        self.states.update(restore(saved))

    def snapshot(self) -> str:
        return snapshot(self.states)

    def recovery_states(self) -> tuple[RecoveryState, ...]:
        return tuple(public_state(state) for state in self.states.values())

    def storage_failure(self, request_id: str) -> ConvoHopProblem:
        state = self.states.get(request_id)
        outcome = "unknown" if state is None or state["resolutionState"] == "pending" else state["resolutionState"]
        return _problem("RECOVERY_STORAGE_FAILURE", request_id, outcome, 0, _STORAGE)

    def _persist(self, request_id: str) -> Flow[None]:
        if self.persistent:
            yield Persist(request_id)

    # Planning

    def prepare(self, operation: OperationSpec, payload: Mapping[str, Any] | None, request_id: str | None) -> Call:
        """Validates a request before anything is recorded or sent. Raises ``INVALID_REQUEST`` (rejected)."""
        if request_id is None:
            request_id = str(uuid.uuid4())
        elif not isinstance(request_id, str):
            raise TypeError("request_id must be a string")
        try:
            data = _input(payload)
            self._plan(operation, data, request_id)
        except TypeError as error:
            message = str(error) or "Invalid SDK operation"
            raise _problem("INVALID_REQUEST", request_id, "rejected", 400, message) from None
        return Call(operation, data, request_id, self.project_id)

    def _plan(self, operation: OperationSpec, data: dict[str, Any], request_id: str) -> None:
        parse_id(request_id)
        if (operation.plane == "communication") != (self.project_id is not None):
            raise TypeError("This client cannot send operations of that plane")
        if operation.input_type is None:
            if data:
                raise TypeError("Unknown GraphQL input field")
            return
        validate_input(operation.input_type, data)
        precheck = _PRECHECKS.get(operation.id)
        if precheck is not None:
            precheck(data, request_id)

    def identity(self, call: Call) -> str:
        """What concurrent calls with one request ID must share to join the same mutation."""
        return canonical(
            {
                "operation": call.operation.id,
                "projectId": call.project_id,
                "input": call.input,
                "incarnation": self.incarnation,
            }
        )

    def body(self, call: Call) -> bytes:
        """The GraphQL request, built when it is sent so it carries the current serving epoch."""
        operation = call.operation
        context: dict[str, Any] = {"requestId": call.request_id}
        if call.project_id is not None:
            context["projectId"] = call.project_id
        if self.incarnation != MANAGEMENT_INCARNATION:
            context["incarnation"] = self.incarnation
        if self.serving_epoch is not None:
            context["observedServingEpoch"] = self.serving_epoch
        variables: dict[str, Any] = {"context": context}
        if operation.input_type is not None:
            variables["input"] = call.input
        document = {"query": operation.document, "operationName": operation.operation_name, "variables": variables}
        return canonical(document).encode("utf-8")

    # Flows

    def run(self, call: Call) -> Flow[Envelope]:
        """Sends one operation and returns its checked envelope."""
        operation = call.operation
        if operation.kind == "mutation":
            envelope: Envelope = yield Mutate(call, False)
        else:
            envelope = yield from self._request(call)
        if operation.id in _RESOLVE:
            yield from self._observe(call, envelope)
        check(operation, call.input, envelope, call.request_id, self._scope(call))
        return envelope

    def initialize(self) -> Flow[None]:
        """Reads the route and records the serving epoch later requests report."""
        call = self.prepare(OPERATIONS["communication.route"], None, None)
        envelope = yield from self.run(call)
        route = envelope["result"]
        if not isinstance(route, dict) or route.get("projectId") != self.project_id:
            raise invalid(call.request_id, "Route does not match the project")
        if route.get("incarnation") != self.incarnation:
            message = "Project incarnation changed; explicit recovery required"
            raise _problem("INCARNATION_MISMATCH", call.request_id, "rejected", 409, message)
        try:
            self.serving_epoch = parse_counter(route.get("servingEpoch"))
        except TypeError:
            raise invalid(call.request_id, "Malformed route serving epoch") from None

    def mutate(self, call: Call, retry: bool) -> Flow[Envelope]:
        """Records, then submits, a mutation. The driver runs this once per request ID at a time."""
        operation, request_id = call.operation, call.request_id
        hash_ = _fingerprint(operation.id, call.project_id, call.input)
        state = self.states.get(request_id)
        if state is not None and (
            state["payloadFingerprint"] != hash_
            or state["incarnation"] != self.incarnation
            or state["operation"] != operation.id
            or state.get("projectId") != call.project_id
            or canonical(state["input"]) != canonical(call.input)
        ):
            raise conflict(request_id)
        if retry and (state is None or state["resolutionState"] in _SETTLED or state.get("mediaAdmissionAttempted")):
            raise _problem("RESOLUTION_REQUIRED", request_id, "unknown", 409, _ELIGIBILITY)
        if state is None:
            self._make_room(request_id)
            now = _now_ms()
            _, window = _budget(operation)
            state = {"requestId": request_id, "incarnation": self.incarnation, "payloadFingerprint": hash_}
            state["operation"] = operation.id
            if call.project_id is not None:
                state["projectId"] = call.project_id
            state.update(
                {
                    "input": copy.deepcopy(call.input),
                    "firstSubmittedAt": now,
                    "retryDeadline": now + window,
                    "attemptCount": 0,
                    "lastAttemptAt": now,
                    "lastAttemptClassification": "notSubmitted",
                    "resolutionState": "pending",
                }
            )
            self.states[request_id] = state
            yield from self._persist(request_id)
        return (yield from self._submit(state, retry))

    def retry(self, request_id: str) -> Flow[dict[str, Any]]:
        """Resolves a recorded mutation and resends it with its original identity only if it was never observed."""
        state = self.states.get(request_id)
        if state is None:
            raise LookupError("No recovery record exists; do not invent a replacement identity")
        if state["incarnation"] != self.incarnation:
            raise _incarnation(request_id)
        operation = OPERATIONS[state["operation"]]
        resolver = PLANES.get(operation.plane)
        if resolver is None:
            raise RuntimeError(f"The generated catalog has no resolve operation for the {operation.plane} plane")
        resolve = OPERATIONS[resolver]
        resolution, read_id = yield from self._resolution(resolve, request_id)
        if resolution["state"] in _SETTLED:
            return resolution
        if resolution["state"] != "notObservedYet":
            raise invalid(read_id, "Unknown request resolution state")
        if state["resolutionState"] in _SETTLED or state.get("mediaAdmissionAttempted"):
            message = "Previously observed commit or native admission cannot be retried from absent evidence"
            raise _problem("RESOLUTION_REQUIRED", request_id, "unknown", 409, message)
        if _fingerprint(state["operation"], state.get("projectId"), state["input"]) != state["payloadFingerprint"]:
            raise RuntimeError("Recovery input fingerprint changed")
        yield Mutate(Call(operation, copy.deepcopy(state["input"]), request_id, state.get("projectId")), True)
        current, _ = yield from self._resolution(resolve, request_id)
        return current

    def _resolution(self, resolve: OperationSpec, request_id: str) -> Flow[tuple[dict[str, Any], str]]:
        """Reads a request's resolution with a new read request ID; returns the resolution and that ID."""
        call = self.prepare(resolve, {"requestId": request_id}, None)
        envelope = yield from self.run(call)
        resolution: dict[str, Any] = envelope["result"]
        return resolution, call.request_id

    def page(
        self, operation: OperationSpec, envelope: Envelope, payload: dict[str, Any], seen: set[str]
    ) -> tuple[dict[str, Any], dict[str, Any] | None]:
        """Returns a checked page and the input for the next one, or ``None`` after the last page."""
        pagination = operation.pagination
        if pagination is None or pagination.cursor_field is None:
            raise TypeError(f"{operation.id} does not page")
        page: dict[str, Any] = envelope
        for key in pagination.page_path:
            page = page[key]
        request_id = envelope["requestId"]
        if page["refreshRequired"]:
            message = "The page set changed; restart from the first page"
            raise _problem("RESYNC_REQUIRED", request_id, "rejected", 409, message)
        if page["complete"]:
            return page, None
        cursor = page["nextCursor"]
        if not isinstance(cursor, str) or cursor in seen:
            raise invalid(request_id, "Page cursor did not advance")
        seen.add(cursor)
        return page, {**payload, pagination.cursor_field: cursor}

    # Steps

    def _scope(self, call: Call) -> Scope:
        custody = None
        if call.operation.id == "communication.sessionRequestOutcome":
            custody = self.states.get(call.input["requestId"])
        return Scope(self.incarnation, self.project_id, custody)

    def _observe(self, call: Call, envelope: Envelope) -> Flow[None]:
        """Applies an authority resolution to the local record, never downgrading a commit."""
        request_id, target = call.request_id, call.input["requestId"]
        resolution = envelope["result"]
        if resolution is None:
            raise missing(request_id)
        receipt = resolution["receipt"]
        if resolution["requestId"] != target or (receipt is not None and receipt["requestId"] != target):
            raise invalid(request_id, "Request resolution identity changed")
        state = self.states.get(target)
        if state is None:
            return
        if state.get("projectId") != call.project_id or state["incarnation"] != self.incarnation:
            message = "Resolve within the original project and incarnation"
            raise _problem("RESOLUTION_REQUIRED", request_id, "unknown", 409, message)
        if resolution["state"] in _SETTLED:
            if state["resolutionState"] != "committed":
                state["resolutionState"] = resolution["state"]
            state["lastAttemptClassification"] = "authorityReceipt"
            yield from self._persist(target)

    def _make_room(self, request_id: str) -> None:
        """Forgets the final record attempted longest ago that no mutation is using, or refuses ``request_id``."""
        if len(self.states) < MAX_RECORDS:
            return
        now = _now_ms()
        final = [state for key, state in tuple(self.states.items()) if key not in self.active and _final(state, now)]
        if not final:
            raise _problem("RECOVERY_LIMIT", request_id, "rejected", 409, _LIMIT)
        del self.states[min(final, key=lambda state: state["lastAttemptAt"])["requestId"]]

    def _submit(self, state: dict[str, Any], retry: bool) -> Flow[Envelope]:
        request_id = state["requestId"]
        operation = OPERATIONS[state["operation"]]
        attempts, _ = _budget(operation)
        if state["incarnation"] != self.incarnation:
            raise _incarnation(request_id)
        now = _now_ms()
        if (
            state["attemptCount"] >= attempts
            or now > state["retryDeadline"]
            or now < state["firstSubmittedAt"]
            or now < state["lastAttemptAt"]
        ):
            message = "Retry budget expired or clock changed; resolve this request read-only"
            raise _problem("RESOLUTION_REQUIRED", request_id, "unknown", 409, message)
        state["attemptCount"] += 1
        state["lastAttemptAt"] = now
        prior = state["resolutionState"]
        if prior in _RESENDABLE:
            state["resolutionState"] = "unknown"
        state["lastAttemptClassification"] = "submitted"
        yield from self._persist(request_id)
        submitting = _now_ms()
        if (
            submitting > state["retryDeadline"]
            or submitting < state["firstSubmittedAt"]
            or submitting < state["lastAttemptAt"]
            or (retry and (state["resolutionState"] in _SETTLED or state.get("mediaAdmissionAttempted")))
        ):
            raise _problem("RESOLUTION_REQUIRED", request_id, "unknown", 409, _ELIGIBILITY)
        call = Call(operation, copy.deepcopy(state["input"]), request_id, state.get("projectId"))
        try:
            envelope = yield from self._request(call)
        except Exception as error:
            state["lastAttemptClassification"] = (
                error.code if isinstance(error, ConvoHopProblem) else "opaqueTransportFailure"
            )
            # A rejection is the request's outcome only if every attempt was rejected; one that may have been
            # applied keeps it unknown.
            if (
                isinstance(error, ConvoHopProblem)
                and error.outcome == "rejected"
                and prior in _RESENDABLE
                and state["resolutionState"] == "unknown"
            ):
                state["resolutionState"] = "rejected"
            yield from self._persist(request_id)
            raise
        if state["resolutionState"] != "committed":
            state["resolutionState"] = envelope["status"]
        state["lastAttemptClassification"] = "authorityReceipt"
        yield from self._persist(request_id)
        return envelope

    def _request(self, call: Call) -> Flow[Envelope]:
        response: Response = yield Send(self.body(call), call.request_id)
        return interpret(call, response)


def interpret(call: Call, response: Response) -> Envelope:
    """Turns an HTTP response into a validated envelope, or raises the problem it reports."""
    request_id, status = call.request_id, response.status
    if response.failure == "send":
        message = "Authority response unavailable; resolve the original request"
        raise _problem("TRANSPORT_UNKNOWN", request_id, "unknown", 0, message)
    if response.failure == "read":
        message = "Incomplete authority response; resolve the original request"
        raise _problem("TRANSPORT_UNKNOWN", request_id, "unknown", 0, message)
    body = response.body
    text = None if body is None else body.decode("utf-8-sig", errors="replace")
    # UTF-8 never decodes to more UTF-16 code units than it has bytes, so only large bodies need counting.
    if text is None or (body is not None and len(body) > RESPONSE_BOUND and _utf16_length(text) > RESPONSE_BOUND):
        raise _problem("INVALID_RESPONSE", request_id, "unknown", status, "Authority response exceeds the bound")
    try:
        decoded = parse(text)
    except ValueError:
        raise _problem("INVALID_RESPONSE", request_id, "unknown", status, "Unrecognized authority response") from None
    try:
        return _envelope(call, decoded, response)
    except TypeError:
        message = "Malformed authority response; resolve the original request"
        raise _problem("INVALID_RESPONSE", request_id, "unknown", status, message) from None


def _envelope(call: Call, decoded: object, response: Response) -> Envelope:
    request_id, status, operation = call.request_id, response.status, call.operation
    if not isinstance(decoded, dict):
        raise TypeError("Expected a GraphQL response object")
    errors = decoded.get("errors")
    if isinstance(errors, list) and errors:
        error = errors[0]
        if not isinstance(error, dict):
            raise TypeError("Expected a GraphQL error object")
        extensions = error.get("extensions")
        if extensions is None:
            extensions = {}
        elif not isinstance(extensions, dict):
            raise TypeError("Expected GraphQL error extensions")
        raise authority_problem(
            _text(extensions.get("code"), "GRAPHQL_ERROR"),
            request_id,
            _text(extensions.get("outcome"), "unknown"),
            _status(extensions.get("status"), 503),
            _text(error.get("message"), "GraphQL rejected the request"),
            _delay(extensions.get("retryAfter"), response.retry_after),
        )
    if not 200 <= status <= 299:
        raise authority_problem(
            _text(decoded.get("code"), "HTTP_FAILURE"),
            request_id,
            _text(decoded.get("outcome"), "unknown"),
            status,
            _text(decoded.get("message"), "Authority rejected the request"),
            _delay(decoded.get("retryAfter"), response.retry_after),
        )
    data = decoded.get("data")
    if not isinstance(data, dict):
        raise TypeError("Expected GraphQL data")
    value = data.get(operation.field)
    if not isinstance(value, dict):
        raise TypeError("Expected the operation payload")
    validate_output(value, operation.result_type)
    outcome = value.get("status")
    if outcome not in ("ok", "committed", "accepted"):
        raise TypeError("Unrecognized authority envelope")
    if parse_id(value.get("requestId")) != request_id:
        raise _problem("INVALID_RESPONSE", request_id, "unknown", status, "Mismatched authority request identity")
    if operation.kind == "mutation":
        if outcome == "committed":
            parse_id(value.get("receiptId"))
            parse_timestamp(value.get("committedAt"))
            if not isinstance(value.get("replayed"), bool):
                raise TypeError("Expected a replay flag")
        elif outcome == "accepted":
            reference = value.get("operation")
            if not isinstance(reference, dict):
                raise TypeError("Expected an operation reference")
            parse_id(reference.get("operationId"))
        else:
            raise TypeError("A mutation requires authority receipt evidence")
    return value


def requested_cursors(operation: OperationSpec, payload: Mapping[str, Any]) -> set[str]:
    """The cursor a page walk starts from; a page that returns a requested cursor has stopped advancing."""
    field = operation.pagination.cursor_field if operation.pagination is not None else None
    cursor = payload.get(field) if field is not None else None
    return {cursor} if isinstance(cursor, str) else set()


def _text(value: object, fallback: str) -> str:
    return value if isinstance(value, str) else fallback


def _status(value: object, fallback: int) -> int:
    return value if isinstance(value, int) and not isinstance(value, bool) else fallback


def _delay(value: object, header: str | None) -> int | None:
    delay = retry_delay(value)
    return delay if delay is not None else retry_delay(header)


def _utf16_length(text: str) -> int:
    return len(text.encode("utf-16-le", errors="surrogatepass")) // 2


def _input(payload: Mapping[str, Any] | None) -> dict[str, Any]:
    if payload is None:
        return {}
    data = normalize(payload)
    if not isinstance(data, dict):
        raise TypeError("Expected a GraphQL input object")
    return {key: value for key, value in data.items() if value is not None}


def _budget(operation: OperationSpec) -> tuple[int, int]:
    spec = IDEMPOTENCY.get(operation.idempotency)
    attempts = spec.max_attempts if spec is not None and spec.max_attempts is not None else _DEFAULT_ATTEMPTS
    window = spec.window_ms if spec is not None and spec.window_ms is not None else _DEFAULT_WINDOW_MS
    return attempts, window


def _final(state: Mapping[str, Any], now: int) -> bool:
    """Whether nothing more can come of a record's request.

    The authority committed or accepted it, or rejected every attempt and won't take another: the last rejection's code
    isn't retryable, or the retry budget is spent. Only such records make room in a full journal.
    """
    resolution = state["resolutionState"]
    if resolution != "rejected":
        return resolution in _SETTLED
    attempts, _ = _budget(OPERATIONS[state["operation"]])
    return (
        not _retryable(state["lastAttemptClassification"])
        or state["attemptCount"] >= attempts
        or now > state["retryDeadline"]
    )


def _retryable(code: str) -> bool:
    """Unless the error catalog says otherwise. ``WRONG_REGION`` succeeds once routed again; a newer code may too."""
    spec = ERRORS.get(code)
    return code == "WRONG_REGION" or spec is None or spec.retryable


def _fingerprint(operation: str, project_id: str | None, data: Mapping[str, Any]) -> str:
    digest = hashlib.sha256(canonical({"operation": operation, "projectId": project_id, "input": data}).encode("utf-8"))
    return "sha256:" + digest.hexdigest()


def _add_member(data: dict[str, Any], request_id: str) -> None:
    if data["role"] not in _ROLES:
        raise TypeError("Invalid membership role")


def _add_members(data: dict[str, Any], request_id: str) -> None:
    members = data["members"]
    if not 1 <= len(members) <= 100 or len({member["principalId"] for member in members}) != len(members):
        raise TypeError("A membership batch requires 1..100 distinct principals")
    if any(member["role"] not in _ROLES for member in members):
        raise TypeError("Invalid membership role")


def _inbox(data: dict[str, Any], request_id: str) -> None:
    if "actAsPrincipalId" not in data:
        raise TypeError("The inbox requires actAsPrincipalId")


def _search(data: dict[str, Any], request_id: str) -> None:
    scope = data.get("scope")
    conversation_ids = scope["conversationIds"] if isinstance(scope, dict) else None
    if conversation_ids is not None and not conversation_ids:
        raise TypeError("Search conversationIds must name at least one conversation")
    if "actAsPrincipalId" not in data and conversation_ids is None:
        raise TypeError("Backend search requires actAsPrincipalId or conversationIds")


def _outcome(data: dict[str, Any], request_id: str) -> None:
    if data["requestId"] == request_id:
        message = "Session outcome requires a separate read request identity"
        raise _problem("INVALID_REQUEST", request_id, "rejected", 400, message)


_PRECHECKS: Mapping[str, Callable[[dict[str, Any], str], None]] = {
    "communication.addMember": _add_member,
    "communication.addMembers": _add_members,
    "communication.inbox": _inbox,
    "communication.search": _search,
    "communication.sessionRequestOutcome": _outcome,
}
