"""Checks that a validated response belongs to the request that produced it.

The catalog's echo rules cover most operations; the rest are ported from the TypeScript server SDK. A failed check is
``INVALID_RESPONSE`` with outcome ``unknown``: resolve a mutation before acting on it again.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from typing import Any

from ._generated.operations import OBJECTS, OperationSpec
from ._protocol import parse_counter, parse_id, parse_timestamp
from .errors import ConvoHopProblem

_SESSION_FIELDS = ("sessionId", "principalId", "deviceId", "incarnation", "sessionRevision", "expiresAt", "status")
_SESSION_IDENTITY = ("sessionId", "principalId", "deviceId", "incarnation")
_OUTCOME_ENVELOPE = ("status", "requestId", "serverTime", "result")
_OUTCOME_DETAILS = ("operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState")
_SESSION_OPERATIONS = ("communication.issueSession", "communication.renewSession")

Data = Mapping[str, Any]


def invalid(request_id: str, message: str) -> ConvoHopProblem:
    return ConvoHopProblem("INVALID_RESPONSE", request_id, "unknown", 503, message)


def mismatch(request_id: str, what: str) -> ConvoHopProblem:
    return invalid(request_id, f"{what} does not match the request")


def missing(request_id: str) -> ConvoHopProblem:
    return invalid(request_id, "Missing current authority result")


class Scope:
    """What the checks know about the client: its incarnation and recovery records."""

    __slots__ = ("custody", "incarnation", "project_id")

    def __init__(self, incarnation: str, project_id: str | None, custody: Mapping[str, Any] | None) -> None:
        self.incarnation = incarnation
        self.project_id = project_id
        self.custody = custody


def check(operation: OperationSpec, data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    """Raises ``INVALID_RESPONSE`` when the envelope does not answer this request."""
    if operation.returns == "result" and envelope.get("result") is None:
        raise missing(request_id)
    special = _SPECIAL.get(operation.id)
    if special is not None:
        special(data, envelope, request_id, scope)
    _echo(operation, data, envelope, request_id)


def _at(value: Any, path: Sequence[str]) -> Any:
    for key in path:
        if not isinstance(value, Mapping):
            return None
        value = value.get(key)
    return value


def _type_at(operation: OperationSpec, path: Sequence[str]) -> str:
    name = operation.result_type.rstrip("!")
    for key in path:
        name = OBJECTS.get(name, {}).get(key, name).strip("[]!")
    return name


def _echo(operation: OperationSpec, data: Data, envelope: Mapping[str, Any], request_id: str) -> None:
    target = _at(envelope, operation.echo_path)
    if isinstance(target, Mapping):
        for field in operation.echo:
            if field in data and target.get(field) != data[field]:
                raise mismatch(request_id, _type_at(operation, operation.echo_path))
    if operation.item_echo:
        path = operation.pagination.page_path if operation.pagination is not None else operation.echo_path
        page = _at(envelope, path)
        items = page.get("items") if isinstance(page, Mapping) else None
        for item in items or ():
            for field in operation.item_echo:
                if field in data and item.get(field) != data[field]:
                    raise mismatch(request_id, f"{_type_at(operation, (*path, 'items'))} page")


def _send(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    ack = envelope["result"]
    cursor = ack["cursor"]
    if (
        ack["status"] != "sent"
        or cursor is None
        or cursor["conversationId"] != data["conversationId"]
        or cursor["sequence"] != ack["sequence"]
        or cursor["incarnation"] != scope.incarnation
    ):
        raise invalid(request_id, "Invalid send receipt scope")


def _session(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    session = envelope["result"]["session"]
    if session is None:
        raise missing(request_id)
    if (
        session["principalId"] != data["principalId"]
        or session["deviceId"] != data["deviceId"]
        or session["incarnation"] != scope.incarnation
        or ("sessionId" in data and session["sessionId"] != data["sessionId"])
    ):
        raise mismatch(request_id, "Session")


def _members(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    items = envelope["result"]["items"]
    if len(items) != len(data["members"]) or any(item["conversationId"] != data["conversationId"] for item in items):
        raise mismatch(request_id, "Membership batch")


def _broadcast(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    member = envelope["result"]["member"]
    if member["principalId"] != data["principalId"] or member["conversationId"] != data["conversationId"]:
        raise mismatch(request_id, "Member")


def _mute(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    if "actAsPrincipalId" in data and envelope["result"]["principalId"] != data["actAsPrincipalId"]:
        raise mismatch(request_id, "Mute")


def _end(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    if envelope["result"]["liveSessionId"] != data["liveSessionId"]:
        raise mismatch(request_id, "Live end receipt")


def _live_operation(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    """A finished operation carries its evidence: an END completes only once the media cutoff is enforced."""
    operation = envelope["result"]
    if operation["state"] == "COMPLETED":
        completion = operation["completion"]
        if (
            completion is None
            or completion["liveSessionId"] != operation["liveSessionId"]
            or (operation["kind"] == "END" and (completion["mediaCutoff"] or {}).get("state") != "ENFORCED")
        ):
            raise invalid(request_id, "Completed live operation is missing its completion evidence")
    elif operation["state"] == "FAILED" and operation["failure"] is None:
        raise invalid(request_id, "Failed live operation is missing its reason")


def _inbox(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    for item in envelope["result"]["items"]:
        latest = item["latestVisibleMessage"]
        if latest is not None and latest["conversationId"] != item["conversationId"]:
            raise mismatch(request_id, "Inbox item")


def _search(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    search_scope = data.get("scope")
    allowed = search_scope.get("conversationIds") if isinstance(search_scope, Mapping) else None
    for hit in envelope["result"]["items"]:
        message = hit["message"]
        if message is None or message["conversationId"] != hit["conversationId"]:
            raise mismatch(request_id, "Search hit")
        if allowed is not None and hit["conversationId"] not in allowed:
            raise mismatch(request_id, "Search hit")


def _outcome(data: Data, envelope: Mapping[str, Any], request_id: str, scope: Scope) -> None:
    try:
        _session_outcome(envelope, data["requestId"], scope)
    except (TypeError, KeyError, ValueError):
        raise invalid(
            request_id, "Malformed session request outcome; retain the original request and payload"
        ) from None


def _fields(value: object, fields: Sequence[str]) -> Mapping[str, Any]:
    if not isinstance(value, Mapping) or set(value) != set(fields):
        raise TypeError("Unexpected session request outcome fields")
    return value


def _outcome_session(value: object, incarnation: str) -> Mapping[str, Any]:
    session = _fields(value, _SESSION_FIELDS)
    for field in _SESSION_IDENTITY:
        parse_id(session[field])
    if session["incarnation"] != incarnation or parse_counter(session["sessionRevision"]) == "0":
        raise TypeError("Invalid session request outcome scope or revision")
    parse_timestamp(session["expiresAt"])
    return session


def _session_outcome(envelope: Mapping[str, Any], original: str, scope: Scope) -> None:
    """Port of the TypeScript ``sessionOutcome`` proof checks."""
    proof = _fields(envelope, _OUTCOME_ENVELOPE)
    if proof["status"] != "ok":
        raise TypeError("Expected a read-only session request outcome")
    parse_timestamp(proof["serverTime"])
    value = _fields(proof["result"], ("state", "requestId", "checkedAt", *_OUTCOME_DETAILS))
    custody = scope.custody
    if parse_id(value["requestId"]) != original or (
        custody is not None
        and (
            custody.get("projectId") != scope.project_id
            or custody["incarnation"] != scope.incarnation
            or custody["operation"] not in _SESSION_OPERATIONS
        )
    ):
        raise TypeError("Session request outcome does not match original custody")
    parse_timestamp(value["checkedAt"])
    if value["state"] == "notObservedYet":
        if any(value[field] is not None for field in _OUTCOME_DETAILS):
            raise TypeError("Absent observation cannot carry commit metadata")
        return
    operation = value["operation"]
    if (
        value["state"] != "committed"
        or operation not in ("issueSession", "renewSession")
        or (custody is not None and custody["operation"] != "communication." + operation)
    ):
        raise TypeError("Invalid original session mutation outcome")
    if value["originalSession"] is None:
        raise TypeError("Missing current authority result")
    first = _outcome_session(value["originalSession"], scope.incarnation)
    if first["status"] != "active":
        raise TypeError("Original session evidence must be historically active")
    if custody is not None:
        sent = custody["input"]
        if (
            sent.get("principalId") != first["principalId"]
            or sent.get("deviceId") != first["deviceId"]
            or (
                operation == "renewSession"
                and (
                    sent.get("sessionId") != first["sessionId"]
                    or int(parse_counter(sent.get("expectedRevision"))) + 1 != int(first["sessionRevision"])
                )
            )
        ):
            raise TypeError("Session request outcome does not match the original payload")
    parse_id(value["receiptId"])
    parse_timestamp(value["committedAt"])
    state = value["currentState"]
    if state == "missing":
        if value["currentSession"] is not None:
            raise TypeError("Missing session cannot carry a current row")
        return
    if state not in ("active", "expired", "revoked"):
        raise TypeError("Invalid current session disposition")
    if value["currentSession"] is None:
        raise TypeError("Missing current authority result")
    current = _outcome_session(value["currentSession"], scope.incarnation)
    if (
        current["status"] != state
        or any(current[field] != first[field] for field in _SESSION_IDENTITY)
        or int(current["sessionRevision"]) < int(first["sessionRevision"])
        or (current["sessionRevision"] == first["sessionRevision"] and current["expiresAt"] != first["expiresAt"])
    ):
        raise TypeError("Current session contradicts original receipt evidence")


_SPECIAL: Mapping[str, Callable[[Data, Mapping[str, Any], str, Scope], None]] = {
    "communication.sendMessage": _send,
    "communication.issueSession": _session,
    "communication.renewSession": _session,
    "communication.addMembers": _members,
    "communication.setBroadcastPermission": _broadcast,
    "communication.conversationMute": _mute,
    "communication.setConversationMute": _mute,
    "communication.endLiveSession": _end,
    "communication.liveSessionOperation": _live_operation,
    "communication.inbox": _inbox,
    "communication.search": _search,
    "communication.sessionRequestOutcome": _outcome,
}
