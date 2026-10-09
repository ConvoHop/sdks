"""Synchronous mutation recovery: durable records, restarts, retry budgets, resolution and storage failures."""

from __future__ import annotations

import json
import re
import time
from collections.abc import Callable
from functools import partial
from typing import Any

import httpx
import pytest

from convohop import ConvoHopManagement, ConvoHopProblem, MemoryStorage
from convohop import _engine as engine
from convohop._generated.operations import OPERATIONS

from .graphql import (
    BACKEND_KEY,
    Authority,
    Received,
    Storage,
    UnexpectedRequestError,
    answer,
    full,
    graphql_error,
    offline,
    rejects,
    reply,
    resolution,
    resolves,
    settle,
    uid,
)

PROJECT, INCARNATION, CONVERSATION, ACTOR, ORG = uid(), uid(), uid(), uid(), uid()
PROJECT_KEY = "convohop.requests:backend:" + PROJECT
MANAGEMENT_KEY = "convohop.requests:management:" + ACTOR
WINDOW_MS = 60_000
UNAVAILABLE = "Authority response unavailable; resolve the original request"
BUDGET = "Retry budget expired or clock changed; resolve this request read-only"
ELIGIBILITY = "The original request is no longer eligible for resend"
ABSENT = "Previously observed commit or native admission cannot be retried from absent evidence"
STORAGE = "Recovery storage did not confirm durability; retain the original request and its outcome"
LIMIT = "Recovery storage already holds 128 requests that aren't final; retry or resolve them first"
SCOPE = "Resolve within the original project and incarnation"
IDENTITY = "Request resolution identity changed"
ORIGINAL = {"conversationId": CONVERSATION, "text": "Original", "props": {}}

# Inputs whose fingerprints were computed with the TypeScript SDK's canonical JSON and SHA-256.
VECTOR_PROJECT = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"
VECTOR_CONVERSATION = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
VECTOR_TEXT = 'h\u00e9llo \U0001f44b "quoted" \\ \u2028\u0007\u007f\b\f\n'
VECTOR_PROPS: dict[str, Any] = {
    "z": [True, None, 0, -1.5, 9007199254740991, 0.1, 1e-7, 0.000001, 123456789.125, -0.0],
    "a": {"\u00e9": "x", "B": {}, "\U0001f600": "", "\ufb01": 1},
}
SEND_FINGERPRINT = "sha256:e4c5c2d4253d3e386fc0b979f71239d1a89d03f3c32777b095e657ac44839b1d"
ORGANIZATION_FINGERPRINT = "sha256:699f78bf950c2b4b01fab09b858df6c301ab0ce397f841e4fac1bc368f42e93b"
RECORD_FIELDS = [
    "requestId",
    "incarnation",
    "payloadFingerprint",
    "operation",
    "projectId",
    "input",
    "firstSubmittedAt",
    "retryDeadline",
    "attemptCount",
    "lastAttemptAt",
    "lastAttemptClassification",
    "resolutionState",
]


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> list[int]:
    """The SDK's millisecond clock; a test moves it by assigning ``clock[0]``."""
    moment = [1_800_000_000_000]
    monkeypatch.setattr(engine, "_now_ms", lambda: moment[0])
    return moment


def ack(conversation_id: str = CONVERSATION) -> dict[str, Any]:
    """A ``MessageAck`` for a message sent in ``conversation_id`` under :data:`INCARNATION`."""
    cursor = {"incarnation": INCARNATION, "conversationId": conversation_id, "sequence": "1"}
    values = {"messageId": uid(), "conversationId": conversation_id, "sequence": "1", "revision": "1", "status": "sent"}
    return full("MessageAck", values | {"cursor": cursor})


def create_organization(client: ConvoHopManagement, request_id: str) -> object:
    return client.create_organization(name="Original", terms_ref="fixture", request_id=request_id)


def create_deployment(client: ConvoHopManagement, request_id: str) -> object:
    return client.create_deployment(
        org_id=ORG,
        offering="managedShared",
        geo_id="fixture-region",
        installation_profile_id="fixture-profile",
        consent_ref="fixture-consent",
        request_id=request_id,
    )


MUTATIONS: dict[str, tuple[str, Callable[[ConvoHopManagement, str], object]]] = {
    "committed": ("management.createOrganization", create_organization),
    "accepted": ("management.createDeployment", create_deployment),
}


def failing(number: int, failure: Exception) -> Callable[[str, str, int], None]:
    """An ``on_write`` hook that raises ``failure`` from the 1-based write ``number``."""

    def hook(_key: str, _value: str, count: int) -> None:
        if count == number:
            raise failure

    return hook


def stored(**fields: Any) -> dict[str, Any]:
    """A valid stored management record with ``fields`` replaced."""
    record: dict[str, Any] = {
        "requestId": uid(),
        "incarnation": "management",
        "payloadFingerprint": ORGANIZATION_FINGERPRINT,
        "operation": "management.createOrganization",
        "input": {"name": "Original", "termsRef": "fixture"},
        "firstSubmittedAt": 1,
        "retryDeadline": 1 + WINDOW_MS,
        "attemptCount": 1,
        "lastAttemptAt": 1,
        "lastAttemptClassification": "submitted",
        "resolutionState": "unknown",
    }
    return record | fields


class Fixed:
    """Storage that returns one value, which need not be a string, and accepts no writes."""

    def __init__(self, value: object) -> None:
        self.value = value

    def get_item(self, key: str) -> Any:
        return self.value

    def set_item(self, key: str, value: str) -> None:
        raise AssertionError("Unexpected recovery write")


# Restarts and resends


def test_a_restarted_client_resends_an_unobserved_mutation_with_its_original_identity() -> None:
    request_id, sent, storage = uid(), ack(), Storage()
    first = Authority(offline)
    client = first.project(project_id=PROJECT, incarnation=INCARNATION, recovery_storage=storage)
    send = partial(client.send_message, conversation_id=CONVERSATION, text="Original", props={}, request_id=request_id)
    problem = rejects(send, "TRANSPORT_UNKNOWN", UNAVAILABLE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 0)
    [record] = storage.records(PROJECT_KEY)
    assert (record["requestId"], record["resolutionState"], record["attemptCount"]) == (request_id, "unknown", 1)
    assert record["lastAttemptClassification"] == "TRANSPORT_UNKNOWN"
    assert all(BACKEND_KEY not in value for _, value in storage.writes)

    observed = [False]

    def respond(request: Received) -> httpx.Response:
        if request.key == "communication.sendMessage":
            observed[0] = True
            return reply(request, result=sent)
        if request.key == "communication.resolveRequest":
            if observed[0]:
                return reply(request, result=resolution(request.input["requestId"], "committed", {"messageAck": sent}))
            return reply(request, result=resolution(request.input["requestId"], "notObservedYet"))
        raise UnexpectedRequestError(request.key)

    second = Authority(respond)
    restarted = second.project(project_id=PROJECT, incarnation=INCARNATION, recovery_storage=storage)
    resolved = restarted.retry_request(request_id)
    assert resolved.state == "committed"
    assert resolved.receipt is not None
    assert resolved.receipt.result is not None
    assert resolved.receipt.result.message_ack is not None
    assert resolved.receipt.result.message_ack.to_dict() == sent
    assert second.keys == ["communication.resolveRequest", "communication.sendMessage", "communication.resolveRequest"]
    sends = [request for request in first.requests + second.requests if request.key == "communication.sendMessage"]
    assert [(request.request_id, request.input) for request in sends] == [(request_id, ORIGINAL)] * 2
    assert [request.context["incarnation"] for request in sends] == [INCARNATION] * 2
    [state] = restarted.recovery_states
    assert (state.first_submitted_at, state.retry_deadline) == (record["firstSubmittedAt"], record["retryDeadline"])
    assert (state.operation, state.project_id, state.input) == ("communication.sendMessage", PROJECT, ORIGINAL)
    assert (state.resolution_state, state.attempt_count, state.last_attempt_classification) == (
        "committed",
        2,
        "authorityReceipt",
    )
    changed = partial(
        restarted.send_message, conversation_id=CONVERSATION, text="Changed", props={}, request_id=request_id
    )
    rejects(changed, "IDEMPOTENCY_CONFLICT", "Preserve the original request and payload")
    assert len(second.requests) == 3


def test_an_expired_record_is_resolved_read_only_and_never_resent() -> None:
    request_id, storage = uid(), Storage()
    client = Authority(offline).management(actor_id=ACTOR, recovery_storage=storage)
    rejects(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    [record] = storage.records(MANAGEMENT_KEY)
    storage.values[MANAGEMENT_KEY] = json.dumps([record | {"retryDeadline": time.time_ns() // 1_000_000 - 1}])

    authority = Authority(resolves("notObservedYet"))
    restarted = authority.management(actor_id=ACTOR, recovery_storage=storage)
    problem = rejects(partial(restarted.retry_request, request_id), "RESOLUTION_REQUIRED", BUDGET)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 409)
    assert restarted.resolve_request(request_id=request_id).state == "notObservedYet"
    assert authority.keys == ["management.resolveRequest"] * 2


def test_a_clock_rollback_and_the_attempt_limit_stop_resends(clock: list[int]) -> None:
    request_id, storage = uid(), Storage()
    start = clock[0]
    authority = Authority(answer(offline, "notObservedYet"))
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    rejects(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    clock[0] = start + 1000
    rejects(partial(client.retry_request, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    assert authority.count("management.createOrganization") == 2

    restarted = authority.management(actor_id=ACTOR, recovery_storage=storage)
    clock[0] = start + 1000 - 1
    problem = rejects(partial(restarted.retry_request, request_id), "RESOLUTION_REQUIRED", BUDGET)
    assert (problem.request_id, problem.outcome) == (request_id, "unknown")
    assert authority.count("management.createOrganization") == 2

    clock[0] = start + 2000
    rejects(partial(restarted.retry_request, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    clock[0] = start + 3000
    rejects(partial(restarted.retry_request, request_id), "RESOLUTION_REQUIRED", BUDGET)
    assert authority.count("management.createOrganization") == 3
    [state] = restarted.recovery_states
    assert (state.attempt_count, state.first_submitted_at, state.retry_deadline) == (3, start, start + WINDOW_MS)
    assert state.last_attempt_at == start + 2000


@pytest.mark.parametrize(
    ("write", "shift", "message"),
    [(1, WINDOW_MS + 1, BUDGET), (2, WINDOW_MS + 1, ELIGIBILITY), (2, -1, ELIGIBILITY)],
)
def test_a_clock_change_while_recording_stops_the_send(clock: list[int], write: int, shift: int, message: str) -> None:
    start = clock[0]

    def move(_key: str, _value: str, count: int) -> None:
        if count == write:
            clock[0] = start + shift

    request_id, storage = uid(), Storage(move)
    authority = Authority(resolves("notObservedYet"))
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    problem = rejects(partial(create_organization, client, request_id), "RESOLUTION_REQUIRED", message)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 409)
    assert authority.requests == []
    [record] = storage.records(MANAGEMENT_KEY)
    assert record["attemptCount"] == write - 1
    assert len(storage.writes) == write
    rejects(partial(client.retry_request, request_id), "RESOLUTION_REQUIRED", BUDGET)
    assert authority.keys == ["management.resolveRequest"]


def test_the_attempt_limit_survives_client_reconstruction(clock: list[int]) -> None:
    request_id, storage = uid(), Storage()
    authority = Authority(answer(offline, "notObservedYet"))
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    rejects(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    for _ in range(2):
        clock[0] += 1000
        client = authority.management(actor_id=ACTOR, recovery_storage=storage)
        rejects(partial(client.retry_request, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    clock[0] += 1000
    exhausted = authority.management(actor_id=ACTOR, recovery_storage=storage)
    rejects(partial(exhausted.retry_request, request_id), "RESOLUTION_REQUIRED", BUDGET)
    rejects(partial(create_organization, exhausted, request_id), "RESOLUTION_REQUIRED", BUDGET)
    assert authority.count("management.createOrganization") == 3
    assert [state.attempt_count for state in exhausted.recovery_states] == [3]


# Observed outcomes and read-only resolution


@pytest.mark.parametrize("outcome", ["committed", "accepted"])
def test_absent_evidence_or_a_later_failure_never_reopens_an_observed_outcome(outcome: str) -> None:
    key, call = MUTATIONS[outcome]
    online = [True]

    def mutation(request: Received) -> httpx.Response:
        if not online[0]:
            raise httpx.ConnectError("offline")
        return settle(request)

    request_id, storage = uid(), Storage()
    authority = Authority(answer(mutation, "notObservedYet"))
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    call(client, request_id)
    problem = rejects(partial(client.retry_request, request_id), "RESOLUTION_REQUIRED", ABSENT)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 409)
    assert authority.count(key) == 1

    online[0] = False
    rejects(partial(call, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    [record] = storage.records(MANAGEMENT_KEY)
    assert (record["resolutionState"], record["attemptCount"]) == (outcome, 2)
    assert record["lastAttemptClassification"] == "TRANSPORT_UNKNOWN"
    rejects(partial(client.retry_request, request_id), "RESOLUTION_REQUIRED", ABSENT)
    assert authority.count(key) == 2


def test_a_read_only_resolution_records_the_commit_and_retry_returns_it_without_resending() -> None:
    request_id, sent = uid(), ack()

    def respond(request: Received) -> httpx.Response:
        if request.key == "communication.resolveRequest":
            return reply(request, result=resolution(request.input["requestId"], "committed", {"messageAck": sent}))
        return offline(request)

    authority = Authority(respond)
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION)
    send = partial(client.send_message, conversation_id=CONVERSATION, text="Original", props={}, request_id=request_id)
    rejects(send, "TRANSPORT_UNKNOWN", UNAVAILABLE)
    resolved = client.resolve_request(request_id=request_id)
    assert resolved.state == "committed"
    assert resolved.request_id == request_id
    [state] = client.recovery_states
    assert (state.resolution_state, state.last_attempt_classification) == ("committed", "authorityReceipt")
    assert client.retry_request(request_id).state == "committed"
    assert authority.keys == [
        "communication.sendMessage",
        "communication.resolveRequest",
        "communication.resolveRequest",
    ]
    read_ids = [request.request_id for request in authority.requests[1:]]
    assert request_id not in read_ids
    assert len(set(read_ids)) == 2
    [state] = client.recovery_states
    assert (state.resolution_state, state.attempt_count) == ("committed", 1)


@pytest.mark.parametrize("changed", ["resolution", "receipt"])
def test_a_resolution_naming_another_request_is_rejected_and_records_nothing(changed: str) -> None:
    request_id = uid()

    def respond(request: Received) -> httpx.Response:
        if request.key == "management.createOrganization":
            return offline(request)
        found = resolution(request.input["requestId"], "committed")
        if changed == "resolution":
            found["requestId"] = uid()
        else:
            found["receipt"]["requestId"] = uid()
        return reply(request, result=found)

    authority = Authority(respond)
    client = authority.management()
    rejects(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    problem = rejects(partial(client.resolve_request, request_id=request_id), "INVALID_RESPONSE", IDENTITY)
    assert problem.request_id == authority.requests[-1].request_id != request_id
    rejects(partial(client.retry_request, request_id), "INVALID_RESPONSE", IDENTITY)
    assert [state.resolution_state for state in client.recovery_states] == ["unknown"]
    assert authority.count("management.createOrganization") == 1


def test_records_from_another_incarnation_need_explicit_recovery() -> None:
    request_id, storage = uid(), Storage()
    old = Authority(offline).project(project_id=PROJECT, incarnation=INCARNATION, recovery_storage=storage)
    rejects(
        partial(old.send_message, conversation_id=CONVERSATION, text="Original", props={}, request_id=request_id),
        "TRANSPORT_UNKNOWN",
        UNAVAILABLE,
    )
    authority = Authority(lambda request: reply(request, result=resolution(request.input["requestId"], "committed")))
    current = authority.project(project_id=PROJECT, incarnation=uid(), recovery_storage=storage)
    problem = rejects(partial(current.resolve_request, request_id=request_id), "RESOLUTION_REQUIRED", SCOPE)
    assert (problem.outcome, problem.status) == ("unknown", 409)
    mismatch = "Explicit recovery is required for this incarnation"
    problem = rejects(partial(current.retry_request, request_id), "INCARNATION_MISMATCH", mismatch)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 409)
    rejects(
        partial(current.send_message, conversation_id=CONVERSATION, text="Original", props={}, request_id=request_id),
        "IDEMPOTENCY_CONFLICT",
    )
    assert authority.keys == ["communication.resolveRequest"]
    assert [state.resolution_state for state in current.recovery_states] == ["unknown"]
    assert storage.records(PROJECT_KEY)[0]["resolutionState"] == "unknown"


def test_retry_request_needs_a_recorded_canonical_request_id() -> None:
    authority = Authority()
    client = authority.management()
    with pytest.raises(TypeError, match=r"^request_id must be a string$"):
        client.retry_request(None)  # type: ignore[arg-type]
    for value in ("not-a-uuid", "00000000-0000-0000-0000-000000000000", uid().upper()):
        problem = rejects(partial(client.retry_request, value), "INVALID_REQUEST", "Expected a canonical nonzero UUID")
        assert (problem.request_id, problem.outcome, problem.status) == (value, "rejected", 400)
    with pytest.raises(LookupError, match=r"^No recovery record exists; do not invent a replacement identity$"):
        client.retry_request(uid())
    assert authority.requests == []


def test_an_unknown_replay_only_request_is_never_looked_up_and_settles_only_by_an_explicit_resend() -> None:
    request_id, scopes, expires_at = uid(), ["messageRead"], "2026-12-01T00:00:00.000Z"
    pending = {"operationId": uid(), "state": "pending", "scopes": scopes, "expiresAt": expires_at}

    def issued(request: Received) -> httpx.Response:
        return reply(request, replayed=True, result=full("AgentKey", pending))

    attempts = iter([offline, issued])
    authority = Authority(lambda request: next(attempts)(request))
    client = authority.management(actor_id=ACTOR)
    issue = partial(client.issue_agent_key, scopes=scopes, expires_at=expires_at, request_id=request_id)
    assert OPERATIONS["management.issueAgentKey"].idempotency == "replayOnly"
    rejects(issue, "TRANSPORT_UNKNOWN", UNAVAILABLE)
    message = "The operation's requests cannot be looked up; send the same request ID and payload again explicitly"
    problem = rejects(partial(client.retry_request, request_id), "INVALID_REQUEST", message)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 400)
    assert authority.keys == ["management.issueAgentKey"]
    changed = partial(client.issue_agent_key, scopes=["callRead"], expires_at=expires_at, request_id=request_id)
    rejects(changed, "IDEMPOTENCY_CONFLICT")
    assert issue().state == "pending"
    assert [(request.key, request.request_id) for request in authority.requests] == [
        ("management.issueAgentKey", request_id),
        ("management.issueAgentKey", request_id),
    ]


def test_a_different_payload_for_an_in_flight_request_is_a_conflict() -> None:
    request_id, sent = uid(), ack()
    inner: list[ConvoHopProblem] = []

    def respond(request: Received) -> httpx.Response:
        if not inner:
            changed = partial(
                client.send_message, conversation_id=CONVERSATION, text="Changed", props={}, request_id=request_id
            )
            inner.append(rejects(changed, "IDEMPOTENCY_CONFLICT", "Preserve the original request and payload"))
        return reply(request, result=sent)

    authority = Authority(respond)
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION)
    client.send_message(conversation_id=CONVERSATION, text="Original", props={}, request_id=request_id)
    assert [(problem.request_id, problem.outcome, problem.status) for problem in inner] == [
        (request_id, "unknown", 409)
    ]
    assert len(authority.requests) == 1


def test_changing_the_callers_input_while_it_is_recorded_changes_nothing_sent() -> None:
    props: dict[str, Any] = {"nested": {"value": "original"}}

    def change(_key: str, _value: str, count: int) -> None:
        if count == 1:
            props["nested"]["value"] = "changed"

    request_id, sent, storage = uid(), ack(), Storage(change)
    authority = Authority(lambda request: reply(request, result=sent))
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION, recovery_storage=storage)
    client.send_message(conversation_id=CONVERSATION, text="Original", props=props, request_id=request_id)
    expected = ORIGINAL | {"props": {"nested": {"value": "original"}}}
    assert [request.input for request in authority.requests] == [expected]
    assert storage.records(PROJECT_KEY)[0]["input"] == expected
    assert [state.input for state in client.recovery_states] == [expected]
    resend = partial(client.send_message, conversation_id=CONVERSATION, text="Original", props=props)
    rejects(partial(resend, request_id=request_id), "IDEMPOTENCY_CONFLICT")
    assert len(authority.requests) == 1


# Storage failures


@pytest.mark.parametrize(("write", "state"), [(1, "pending"), (2, "unknown")])
def test_a_failed_write_before_sending_stops_the_send_and_keeps_the_identity(write: int, state: str) -> None:
    failure = OSError("database unavailable")
    request_id, storage = uid(), Storage(failing(write, failure))
    authority = Authority(settle)
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    problem = rejects(partial(create_organization, client, request_id), "RECOVERY_STORAGE_FAILURE", STORAGE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 0)
    assert problem.__cause__ is failure
    assert authority.requests == []
    [recorded] = client.recovery_states
    assert (recorded.attempt_count, recorded.resolution_state) == (write - 1, state)

    create_organization(client, request_id)
    [after] = client.recovery_states
    custody = ("first_submitted_at", "retry_deadline", "payload_fingerprint", "input")
    assert [getattr(after, name) for name in custody] == [getattr(recorded, name) for name in custody]
    assert (after.attempt_count, after.resolution_state) == (write, "committed")
    assert storage.records(MANAGEMENT_KEY)[0]["attemptCount"] == write
    assert storage.reads == [MANAGEMENT_KEY]
    assert [request.request_id for request in authority.requests] == [request_id]


@pytest.mark.parametrize("outcome", ["committed", "accepted"])
def test_a_failed_receipt_write_reports_the_observed_outcome(outcome: str) -> None:
    key, call = MUTATIONS[outcome]
    failure = OSError("database unavailable")
    request_id, storage = uid(), Storage(failing(3, failure))
    authority = Authority(answer(settle, outcome))
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    problem = rejects(partial(call, client, request_id), "RECOVERY_STORAGE_FAILURE", STORAGE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, outcome, 0)
    assert problem.__cause__ is failure
    [state] = client.recovery_states
    assert (state.resolution_state, state.last_attempt_classification) == (outcome, "authorityReceipt")
    assert len(storage.writes) == 3
    assert storage.records(MANAGEMENT_KEY)[0]["resolutionState"] == "unknown"

    assert client.retry_request(request_id).state == outcome
    assert storage.records(MANAGEMENT_KEY)[0]["resolutionState"] == outcome
    assert authority.count(key) == 1


def test_a_failed_write_after_a_resolution_keeps_the_observed_commit() -> None:
    failure = OSError("database unavailable")
    request_id, storage = uid(), Storage(failing(4, failure))
    authority = Authority(answer(offline, "committed", "notObservedYet"))
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    rejects(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    problem = rejects(partial(client.resolve_request, request_id=request_id), "RECOVERY_STORAGE_FAILURE", STORAGE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "committed", 0)
    assert problem.__cause__ is failure
    rejects(partial(client.retry_request, request_id), "RESOLUTION_REQUIRED", ABSENT)
    assert authority.count("management.createOrganization") == 1
    assert storage.records(MANAGEMENT_KEY)[0]["resolutionState"] == "unknown"


def test_a_failed_write_after_a_transport_failure_reports_the_storage_failure() -> None:
    failure = OSError("database unavailable")
    request_id, storage = uid(), Storage(failing(3, failure))
    client = Authority(offline).management(actor_id=ACTOR, recovery_storage=storage)
    problem = rejects(partial(create_organization, client, request_id), "RECOVERY_STORAGE_FAILURE", STORAGE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 0)
    assert problem.__cause__ is failure
    assert [state.last_attempt_classification for state in client.recovery_states] == ["TRANSPORT_UNKNOWN"]
    [record] = storage.records(MANAGEMENT_KEY)
    assert (record["lastAttemptClassification"], record["attemptCount"]) == ("submitted", 1)

    authority = Authority(resolves("committed"))
    restarted = authority.management(actor_id=ACTOR, recovery_storage=storage)
    assert restarted.retry_request(request_id).state == "committed"
    assert authority.keys == ["management.resolveRequest"]
    [state] = restarted.recovery_states
    assert (state.resolution_state, state.attempt_count) == ("committed", 1)


# Stored records


def test_a_full_journal_refuses_a_new_request_until_a_record_is_final() -> None:
    storage = Storage()
    authority = Authority(answer(offline, "committed"))
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    ids = [uid() for _ in range(128)]
    for request_id in ids:
        rejects(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    extra = uid()
    problem = rejects(partial(create_organization, client, extra), "RECOVERY_LIMIT", LIMIT)
    assert (problem.request_id, problem.outcome, problem.status, problem.retryable) == (extra, "rejected", 409, False)
    assert authority.count("management.createOrganization") == 128

    assert client.resolve_request(request_id=ids[0]).state == "committed"
    rejects(partial(create_organization, client, extra), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    assert [record["requestId"] for record in storage.records(MANAGEMENT_KEY)] == [*ids[1:], extra]
    assert max(len(json.loads(value)) for _, value in storage.writes) == 128


def test_a_full_journal_evicts_the_final_record_attempted_longest_ago(clock: list[int]) -> None:
    online = [False]

    def forbid(request: Received) -> httpx.Response:
        if not online[0]:
            raise httpx.ConnectError("offline")
        return graphql_error(request, "FORBIDDEN", 403, "Forbidden", retryable=False)

    storage = Storage()
    authority = Authority(forbid)
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    lost, *ids = [uid() for _ in range(128)]
    rejects(partial(create_organization, client, lost), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    online[0] = True
    # The first rejected request is resent last, so it is no longer the final record attempted longest ago.
    for request_id in [*ids, ids[0]]:
        clock[0] += 1
        rejects(partial(create_organization, client, request_id), "FORBIDDEN")
    extra = uid()
    rejects(partial(create_organization, client, extra), "FORBIDDEN")
    assert authority.count("management.createOrganization") == 130
    records = storage.records(MANAGEMENT_KEY)
    assert [record["requestId"] for record in records] == [lost, ids[0], *ids[2:], extra]
    assert [record["resolutionState"] for record in records] == ["unknown", *["rejected"] * 127]
    assert (records[1]["attemptCount"], records[1]["lastAttemptClassification"]) == (2, "FORBIDDEN")
    restarted = authority.management(actor_id=ACTOR, recovery_storage=storage)
    assert restarted.recovery_states == client.recovery_states


@pytest.mark.parametrize(("code", "status"), [("RATE_LIMITED", 429), ("WRONG_REGION", 409), ("NEWER_CODE", 409)])
def test_a_journal_full_of_resendable_rejections_refuses_new_requests(clock: list[int], code: str, status: int) -> None:
    accept = [False]

    def respond(request: Received) -> httpx.Response:
        return settle(request) if accept[0] else graphql_error(request, code, status, "Not now")

    storage = Storage()
    authority = Authority(respond)
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    ids = [uid() for _ in range(128)]
    for request_id in ids:
        rejects(partial(create_organization, client, request_id), code)
    assert {state.resolution_state for state in client.recovery_states} == {"rejected"}
    extra = uid()
    problem = rejects(partial(create_organization, client, extra), "RECOVERY_LIMIT", LIMIT)
    assert (problem.request_id, problem.outcome, problem.status) == (extra, "rejected", 409)
    assert authority.count("management.createOrganization") == 128

    # A kept request is resent under its own ID without a new record; once committed, its record makes room.
    accept[0] = True
    clock[0] += 1
    create_organization(client, ids[5])
    create_organization(client, extra)
    assert [record["requestId"] for record in storage.records(MANAGEMENT_KEY)] == [*ids[:5], *ids[6:], extra]
    assert authority.count("management.createOrganization") == 130


def test_a_spent_retry_budget_makes_a_resendable_rejection_final(clock: list[int]) -> None:
    storage = Storage()
    authority = Authority(lambda request: graphql_error(request, "RATE_LIMITED", 429, "Slow down"))
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    start = clock[0]
    ids = [uid() for _ in range(128)]
    for request_id in ids:
        rejects(partial(create_organization, client, request_id), "RATE_LIMITED")
    for _ in range(2):
        clock[0] += 1
        rejects(partial(create_organization, client, ids[3]), "RATE_LIMITED")
    extra = uid()
    rejects(partial(create_organization, client, extra), "RATE_LIMITED")
    assert [record["requestId"] for record in storage.records(MANAGEMENT_KEY)] == [*ids[:3], *ids[4:], extra]

    clock[0] = start + WINDOW_MS + 1
    later = uid()
    rejects(partial(create_organization, client, later), "RATE_LIMITED")
    assert [record["requestId"] for record in storage.records(MANAGEMENT_KEY)] == [*ids[1:3], *ids[4:], extra, later]
    assert authority.count("management.createOrganization") == 132


def test_a_request_is_rejected_only_if_every_attempt_was(clock: list[int]) -> None:
    plan: list[str] = []

    def respond(request: Received) -> httpx.Response:
        if plan.pop(0) == "lost":
            raise httpx.ConnectError("offline")
        return graphql_error(request, "FORBIDDEN", 403, "Forbidden", retryable=False)

    storage = Storage()
    client = Authority(respond).management(actor_id=ACTOR, recovery_storage=storage)
    first, second = uid(), uid()
    plan[:] = ["lost", "rejected", "rejected", "lost"]
    rejects(partial(create_organization, client, first), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    rejects(partial(create_organization, client, second), "FORBIDDEN")
    clock[0] += 1
    rejects(partial(create_organization, client, first), "FORBIDDEN")
    rejects(partial(create_organization, client, second), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    expected = [("unknown", 2, "FORBIDDEN"), ("unknown", 2, "TRANSPORT_UNKNOWN")]
    states = client.recovery_states
    assert [(s.resolution_state, s.attempt_count, s.last_attempt_classification) for s in states] == expected
    assert [record["resolutionState"] for record in storage.records(MANAGEMENT_KEY)] == ["unknown", "unknown"]


def test_restored_records_make_room_only_once_final(clock: list[int]) -> None:
    now = clock[0]

    def record(state: str, classification: str, **fields: Any) -> dict[str, Any]:
        times = {"firstSubmittedAt": now - 10, "retryDeadline": now - 10 + WINDOW_MS, "lastAttemptAt": now - 10}
        return stored(**(times | {"resolutionState": state, "lastAttemptClassification": classification} | fields))

    final = [  # in the order they make room: the one attempted longest ago first
        record("committed", "authorityReceipt", lastAttemptAt=now - 9),
        record("rejected", "RATE_LIMITED", retryDeadline=now - 1, lastAttemptAt=now - 8),
        record("rejected", "FORBIDDEN", lastAttemptAt=now - 7),
        record("rejected", "RATE_LIMITED", attemptCount=3, lastAttemptAt=now - 6),
    ]
    kept = [
        record("rejected", "RATE_LIMITED", attemptCount=2),
        record("rejected", "WRONG_REGION"),
        record("rejected", "NEWER_CODE"),
        record("unknown", "submitted"),
        record("pending", "notSubmitted", attemptCount=0),
    ]
    filler = [record("unknown", "TRANSPORT_UNKNOWN") for _ in range(128 - len(final) - len(kept))]
    saved = [final[2], *kept[:2], final[0], *filler, final[3], *kept[2:], final[1]]
    storage = Storage()
    storage.values[MANAGEMENT_KEY] = json.dumps(saved)
    authority = Authority(offline)
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    extras = [uid() for _ in final]
    for count, request_id in enumerate(extras, 1):
        rejects(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
        evicted = {item["requestId"] for item in final[:count]}
        expected = [item["requestId"] for item in saved if item["requestId"] not in evicted] + extras[:count]
        assert [item["requestId"] for item in storage.records(MANAGEMENT_KEY)] == expected
    rejects(partial(create_organization, client, uid()), "RECOVERY_LIMIT", LIMIT)
    assert authority.count("management.createOrganization") == len(final)


def test_records_use_the_typescript_layout_and_fingerprints(clock: list[int]) -> None:
    request_id, storage = uid(), Storage()
    authority = Authority(lambda request: reply(request, result=ack(VECTOR_CONVERSATION)))
    client = authority.project(project_id=VECTOR_PROJECT, incarnation=INCARNATION, recovery_storage=storage)
    client.send_message(
        conversation_id=VECTOR_CONVERSATION, text=VECTOR_TEXT, props=VECTOR_PROPS, request_id=request_id
    )
    key = "convohop.requests:backend:" + VECTOR_PROJECT
    assert storage.reads == [key]
    assert {written for written, _ in storage.writes} == {key}
    [record] = storage.records(key)
    assert list(record) == RECORD_FIELDS
    assert record == {
        "requestId": request_id,
        "incarnation": INCARNATION,
        "payloadFingerprint": SEND_FINGERPRINT,
        "operation": "communication.sendMessage",
        "projectId": VECTOR_PROJECT,
        "input": {"conversationId": VECTOR_CONVERSATION, "text": VECTOR_TEXT, "props": VECTOR_PROPS},
        "firstSubmittedAt": clock[0],
        "retryDeadline": clock[0] + WINDOW_MS,
        "attemptCount": 1,
        "lastAttemptAt": clock[0],
        "lastAttemptClassification": "authorityReceipt",
        "resolutionState": "committed",
    }
    assert authority.requests[0].input == record["input"]

    request_id, storage = uid(), Storage()
    management = Authority(settle).management(actor_id=ACTOR, recovery_storage=storage)
    create_organization(management, request_id)
    assert storage.reads == [MANAGEMENT_KEY]
    [record] = storage.records(MANAGEMENT_KEY)
    assert list(record) == [field for field in RECORD_FIELDS if field != "projectId"]
    assert (record["incarnation"], record["payloadFingerprint"]) == ("management", ORGANIZATION_FINGERPRINT)
    assert record["input"] == {"name": "Original", "termsRef": "fixture"}


def test_memory_storage_keeps_records_across_client_reconstruction() -> None:
    request_id, storage = uid(), MemoryStorage()
    authority = Authority(offline)
    client = authority.management(actor_id=ACTOR, recovery_storage=storage)
    rejects(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    rebuilt = authority.management(actor_id=ACTOR, recovery_storage=storage)
    assert rebuilt.recovery_states == client.recovery_states
    assert [state.request_id for state in rebuilt.recovery_states] == [request_id]
    assert authority.management(recovery_storage=storage).recovery_states == ()
    storage.remove_item(MANAGEMENT_KEY)
    assert authority.management(actor_id=ACTOR, recovery_storage=storage).recovery_states == ()


def test_an_empty_stored_value_restores_no_records() -> None:
    for value in (None, ""):
        assert Authority().management(recovery_storage=Fixed(value)).recovery_states == ()


def _corrupt() -> list[tuple[object, str]]:
    record = stored()
    storage = "Invalid mutation recovery storage"
    invalid = "Invalid recovery record"
    scope = "Invalid recovery project scope"
    clocks = "Invalid recovery clock or count"
    cases: list[tuple[object, str]] = [
        (b"[]", storage),
        (5, storage),
        ("{", storage),
        ("[NaN]", storage),
        ("[1e999]", storage),
        ("{}", storage),
        (json.dumps([stored() for _ in range(129)]), storage),
        ("[1]", invalid),
        (json.dumps([record, record]), "Duplicate mutation recovery identity"),
        (json.dumps([stored(projectId=None)]), scope),
        (json.dumps([stored(projectId=PROJECT)]), scope),
        (json.dumps([stored(operation="communication.sendMessage")]), scope),
        (json.dumps([stored(mediaAdmissionAttempted=False)]), "Invalid native admission marker"),
    ]
    cases += [
        (json.dumps([stored(**{field: value})]), invalid)
        for field, value in (
            ("operation", "management.resolveRequest"),
            ("operation", "management.unknown"),
            ("operation", None),
            ("resolutionState", "lost"),
            ("requestId", "not-a-uuid"),
            ("requestId", uid().upper()),
            ("incarnation", 1),
            ("payloadFingerprint", None),
            ("lastAttemptClassification", None),
            ("input", []),
        )
    ]
    cases += [
        (json.dumps([stored(**{field: value})]), clocks)
        for field in ("firstSubmittedAt", "retryDeadline", "attemptCount", "lastAttemptAt")
        for value in (-1, 1.5, True, "1", None, 2**53)
    ]
    return cases


@pytest.mark.parametrize(("value", "message"), _corrupt())
def test_corrupt_storage_is_refused_when_the_client_is_constructed(value: object, message: str) -> None:
    authority = Authority()
    with pytest.raises(ValueError, match=f"^{re.escape(message)}$"):
        authority.management(recovery_storage=Fixed(value))
    assert authority.requests == []
