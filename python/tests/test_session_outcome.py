"""Session request outcomes: credential-free historical evidence that never settles, evicts or resets custody.

A port of the TypeScript server SDK's ``session-request-outcome.test.mjs``. The read has its own request identity.
Its result must prove a committed issuance or renewal of the original request, or report it not observed yet.
"""

from __future__ import annotations

import asyncio
import traceback
import uuid
from collections.abc import Callable, Mapping
from typing import Any

import httpx
import pytest

from convohop import AsyncConvoHop, ConvoHop, ConvoHopProblem, ScopeRequiredProblem
from convohop._generated.operations import INPUTS, OPERATIONS
from convohop.types import SessionRequestOutcome

from .graphql import (
    BACKEND_KEY,
    ENDPOINT,
    AsyncStorage,
    Authority,
    Received,
    Storage,
    UnexpectedRequestError,
    full,
    graphql_error,
    offline,
    rejects,
    rejects_async,
    reply,
    resolution,
    route_proof,
    uid,
)

COMMITTED_AT = "2026-10-02T07:00:00.000Z"
CHECKED_AT = "2026-10-02T07:02:00.000Z"
ORIGINAL_EXPIRY = "2026-10-02T07:01:00.000Z"
ACTIVE_EXPIRY = "2026-10-02T07:03:00.000Z"
EXPIRED_EXPIRY = "2026-10-02T07:01:30.000Z"
ZERO = "00000000-0000-0000-0000-000000000000"
EXPECTED_REVISION = "9007199254740992"
OUTCOME = "communication.sessionRequestOutcome"
MUTATIONS = ("communication.issueSession", "communication.renewSession")
DETAILS = ("operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState")
IDENTITY = ("sessionId", "principalId", "deviceId", "incarnation")
SEPARATE = "Session outcome requires a separate read request identity"
UNLOADED = "Await initialize_recovery() before inspecting asynchronous recovery state"

Mutation = Callable[[dict[str, Any]], None]


def outcome(
    request_id: str, incarnation: str, operation: str = "renewSession", current_state: str = "active"
) -> dict[str, Any]:
    """A committed ``SessionRequestOutcome`` for ``request_id``. A ``missing`` current state has no current row."""
    issued = operation == "issueSession"
    original = {"sessionId": uid(), "principalId": uid(), "deviceId": uid(), "incarnation": incarnation}
    original |= {"sessionRevision": "1" if issued else "9007199254740993", "expiresAt": ORIGINAL_EXPIRY}
    original |= {"status": "active"}
    current = None
    if current_state != "missing":
        revision = "2" if issued else "9007199254740994"
        expiry = ACTIVE_EXPIRY if current_state == "active" else EXPIRED_EXPIRY
        current = original | {"sessionRevision": revision, "expiresAt": expiry, "status": current_state}
    fields: dict[str, Any] = {"state": "committed", "requestId": request_id, "checkedAt": CHECKED_AT}
    fields |= {"operation": operation}
    fields |= {"receiptId": uid(), "committedAt": COMMITTED_AT, "originalSession": original}
    return full("SessionRequestOutcome", fields | {"currentState": current_state, "currentSession": current})


def put(changes: Mapping[str, object]) -> Mutation:
    """Sets each dotted path of an outcome, such as ``originalSession.status``, to its value."""

    def mutate(result: dict[str, Any]) -> None:
        for path, value in changes.items():
            *parents, name = path.split(".")
            target = result
            for parent in parents:
                target = target[parent]
            target[name] = value

    return mutate


def both(field: str, value: object) -> Mutation:
    """Sets ``field`` of the original and the current session alike, so only custody can contradict it."""
    return put({"originalSession." + field: value, "currentSession." + field: value})


def drop(field: str) -> Mutation:
    """Removes a selected field from an outcome."""
    return lambda result: result.pop(field)


def assert_clean(problem: BaseException, *secrets: str) -> None:
    """Neither the problem nor its logged traceback names a credential."""
    logged = "".join(traceback.format_exception(problem))
    for secret in (BACKEND_KEY, *secrets):
        assert secret not in str(problem)
        assert secret not in repr(problem)
        assert secret not in logged


def renew(client: ConvoHop, session: Mapping[str, Any], request_id: str) -> object:
    """Renews ``session`` from its expected revision under the original ``request_id``."""
    return client.renew_session(
        session_id=session["sessionId"],
        principal_id=session["principalId"],
        device_id=session["deviceId"],
        expected_revision=EXPECTED_REVISION,
        requested_ttl_ms="60000",
        request_id=request_id,
    )


class Setup:
    """A project client whose authority answers its route, loses session mutations and returns ``result``."""

    def __init__(self, operation: str = "renewSession", current_state: str = "active") -> None:
        self.project_id, self.incarnation, self.request_id = uid(), uid(), uid()
        self.result = outcome(self.request_id, self.incarnation, operation, current_state)
        self.envelope: dict[str, Any] = {}
        self.storage = Storage()
        self.authority = Authority(self._respond)
        self.client = self.authority.project(
            project_id=self.project_id, incarnation=self.incarnation, recovery_storage=self.storage
        )

    @property
    def requests(self) -> list[Received]:
        return self.authority.requests

    def _respond(self, request: Received) -> httpx.Response:
        if request.key == "communication.route":
            return reply(request, result=route_proof(self.project_id, self.incarnation, "3"))
        if request.key in MUTATIONS:
            return offline(request)
        if request.key != OUTCOME:
            raise UnexpectedRequestError(request.key)
        envelope = {"status": "ok", "requestId": request.request_id, "serverTime": CHECKED_AT, "result": self.result}
        return httpx.Response(200, json={"data": {"sessionRequestOutcome": envelope | self.envelope}})

    def async_client(self, **options: Any) -> AsyncConvoHop:
        """An asynchronous client of the same project and incarnation."""
        return self.authority.async_project(project_id=self.project_id, incarnation=self.incarnation, **options)

    def read(self) -> SessionRequestOutcome:
        return self.client.session_request_outcome(request_id=self.request_id)

    def rejects_invalid(self) -> ConvoHopProblem:
        """The read fails for its own request as ``INVALID_RESPONSE``, names no credential and changes no custody."""
        custody, writes = self.client.recovery_states, list(self.storage.writes)
        problem = rejects(self.read, "INVALID_RESPONSE")
        assert problem.outcome == "unknown"
        assert problem.request_id == self.requests[-1].request_id != self.request_id
        assert self.requests[-1].key == OUTCOME
        assert_clean(problem)
        assert self.client.recovery_states == custody
        assert self.storage.writes == writes
        return problem


# Committed and unobserved outcomes


@pytest.mark.parametrize("current_state", ["active", "expired", "revoked", "missing"])
@pytest.mark.parametrize("operation", ["issueSession", "renewSession"])
def test_a_committed_outcome_is_returned_as_credential_free_historical_evidence(
    operation: str, current_state: str
) -> None:
    setup = Setup(operation, current_state)
    setup.client.initialize()
    result = setup.read()
    assert result.to_dict() == setup.result
    original, current = result.original_session, result.current_session
    assert original is not None
    assert (original.status, original.expires_at) == ("active", ORIGINAL_EXPIRY)
    if current_state == "missing":
        assert current is None
    else:
        assert current is not None
        assert current.session_revision == ("2" if operation == "issueSession" else "9007199254740994")
    route, read = setup.requests
    assert (route.key, read.key) == ("communication.route", OUTCOME)
    assert read.input == {"requestId": setup.request_id}
    context = {"projectId": setup.project_id, "incarnation": setup.incarnation, "observedServingEpoch": "3"}
    assert read.context == {"requestId": read.request_id} | context
    assert read.request_id != setup.request_id
    assert read.body["query"].startswith("query CommunicationSessionRequestOutcome")
    assert {(request.url, request.headers["authorization"]) for request in setup.requests} == {
        (ENDPOINT, "Bearer " + BACKEND_KEY)
    }
    assert list(setup.client.recovery_states) == []
    assert setup.storage.writes == []
    assert BACKEND_KEY not in repr(result)


def test_not_observed_yet_accepts_explicit_nulls_but_proves_neither_noncommit_nor_permission_to_retry() -> None:
    setup = Setup()
    setup.result = full(
        "SessionRequestOutcome", {"state": "notObservedYet", "requestId": setup.request_id, "checkedAt": CHECKED_AT}
    )
    result = setup.read()
    assert result.to_dict() == setup.result
    assert (result.state, result.request_id, result.checked_at) == ("notObservedYet", setup.request_id, CHECKED_AT)
    assert setup.authority.keys == [OUTCOME]
    assert list(setup.client.recovery_states) == []
    with pytest.raises(LookupError):
        setup.client.retry_request(setup.request_id)
    assert setup.authority.keys == [OUTCOME]
    assert setup.storage.writes == []


def test_same_revision_rows_and_signed_64_bit_revisions_keep_their_exact_strings() -> None:
    setup = Setup()
    setup.result["originalSession"]["sessionRevision"] = "9223372036854775807"
    setup.result["currentSession"] = setup.result["originalSession"] | {"status": "expired"}
    setup.result["currentState"] = "expired"
    result = setup.read()
    assert result.original_session is not None
    assert result.current_session is not None
    revisions = (result.original_session.session_revision, result.current_session.session_revision)
    assert revisions == ("9223372036854775807", "9223372036854775807")


def test_dispositions_and_independently_sampled_timestamps_are_not_reinterpreted_as_bearer_proof() -> None:
    setup = Setup()
    current = setup.result["currentSession"]
    current["expiresAt"] = "2026-10-02T07:00:00.001Z"
    assert setup.read().current_state == "active"
    setup.result["currentState"] = current["status"] = "expired"
    setup.result["committedAt"] = current["expiresAt"] = ACTIVE_EXPIRY
    setup.envelope["serverTime"] = COMMITTED_AT
    assert setup.read().current_state == "expired"
    setup.result["currentState"] = current["status"] = "revoked"
    assert setup.read().current_state == "revoked"
    assert len({request.request_id for request in setup.requests}) == 3


def test_a_higher_revision_may_shorten_the_expiry_but_an_equal_revision_must_keep_it() -> None:
    setup = Setup()
    setup.result["currentSession"]["expiresAt"] = "2026-10-02T07:00:30.000Z"
    current = setup.read().current_session
    assert current is not None
    assert current.expires_at == "2026-10-02T07:00:30.000Z"
    setup.result["currentSession"]["sessionRevision"] = setup.result["originalSession"]["sessionRevision"]
    setup.rejects_invalid()


# Malformed and contradictory outcomes

INVALID_RESULTS = [
    pytest.param(put({"requestId": uid()}), id="different original request ID"),
    pytest.param(put({"state": "accepted"}), id="accepted rather than committed state"),
    pytest.param(put({"state": "missing"}), id="unknown state"),
    pytest.param(put({"operation": "revokeSession"}), id="unsupported mutation operation"),
    pytest.param(put({"operation": "communication.renewSession"}), id="operation alias"),
    pytest.param(put({"currentState": "pending"}), id="unknown current disposition"),
    pytest.param(put({"currentState": "missing"}), id="missing disposition with a current row"),
    pytest.param(put({"currentSession": None}), id="present disposition without a current row"),
    pytest.param(put({"originalSession.status": "revoked"}), id="historical revoked original"),
    pytest.param(put({"originalSession.status": "expired"}), id="unknown original status"),
    pytest.param(put({"currentSession.status": "revoked"}), id="active disposition with revoked row"),
    pytest.param(put({"currentState": "revoked"}), id="revoked disposition with active row"),
    pytest.param(
        put({"currentState": "expired", "currentSession.status": "revoked"}), id="expired disposition with revoked row"
    ),
    pytest.param(put({"currentState": "expired"}), id="expired disposition with active row"),
    pytest.param(put({"currentSession.status": "disabled"}), id="unknown current row status"),
    pytest.param(put({"currentSession.sessionRevision": EXPECTED_REVISION}), id="current revision regression"),
    pytest.param(put({"originalSession.incarnation": uid()}), id="foreign original incarnation"),
    pytest.param(both("incarnation", uid()), id="foreign incarnation on both rows"),
    pytest.param(put({"receiptId": ZERO}), id="zero receipt ID"),
    pytest.param(put({"originalSession.sessionId": "not-an-id"}), id="invalid original UUID"),
    pytest.param(put({"currentSession.deviceId": "not-an-id"}), id="invalid current UUID"),
    pytest.param(both("sessionId", uid().upper()), id="noncanonical UUID on both rows"),
    pytest.param(put({"state": None}), id="null state"),
    pytest.param(put({"checkedAt": None}), id="null checked timestamp"),
    pytest.param(put({"checkedAt": "2026-10-02T07:02:00Z"}), id="noncanonical checked timestamp"),
    pytest.param(put({"checkedAt": "2026-02-30T07:02:00.000Z"}), id="invalid calendar timestamp"),
    pytest.param(put({"committedAt": "2026-10-02T07:00:00+00:00"}), id="noncanonical commit timestamp"),
    pytest.param(put({"sessionToken": BACKEND_KEY}), id="credential on the outcome"),
    pytest.param(put({"originalSession.sessionToken": BACKEND_KEY}), id="credential on the original session"),
    pytest.param(put({"currentSession.sessionToken": BACKEND_KEY}), id="credential on the current session"),
    pytest.param(put({"claims": {"credential": BACKEND_KEY}}), id="claims on the outcome"),
    pytest.param(put({"receipt": {"credential": BACKEND_KEY}}), id="raw receipt on the outcome"),
    pytest.param(put({"permit": {"credential": BACKEND_KEY}}), id="permit on the outcome"),
    *(
        pytest.param(put({field: None}), id=f"null committed {field}")
        for field in ("operation", "receiptId", "committedAt", "originalSession", "currentState")
    ),
    *(
        pytest.param(put({"currentSession." + field: uid()}), id=f"current {field} changes the original tuple")
        for field in IDENTITY
    ),
    *(
        pytest.param(put({row + ".sessionRevision": revision}), id=f"{row} invalid revision {revision!r}")
        for row in ("originalSession", "currentSession")
        for revision in ("0", "-1", "01", "1.0", "+1", " 1", "9223372036854775808", 1, None)
    ),
    *(
        pytest.param(put({row + ".expiresAt": "not-a-time"}), id=f"{row} malformed expiry")
        for row in ("originalSession", "currentSession")
    ),
]


@pytest.mark.parametrize("mutate", INVALID_RESULTS)
def test_a_malformed_or_contradictory_outcome_is_rejected_without_leaks_or_recovery_writes(mutate: Mutation) -> None:
    setup = Setup()
    mutate(setup.result)
    setup.rejects_invalid()
    assert list(setup.client.recovery_states) == []


@pytest.mark.parametrize("field", DETAILS)
def test_not_observed_yet_refuses_contradictory_commit_metadata(field: str) -> None:
    setup = Setup()
    committed = setup.result
    unobserved = {"state": "notObservedYet", "requestId": setup.request_id, "checkedAt": CHECKED_AT}
    setup.result = full("SessionRequestOutcome", unobserved | {field: committed[field]})
    setup.rejects_invalid()


@pytest.mark.parametrize("field", ["operation", "currentSession", "currentState"])
def test_a_missing_selected_nullable_field_is_not_silently_treated_as_null(field: str) -> None:
    setup = Setup()
    drop(field)(setup.result)
    setup.rejects_invalid()


@pytest.mark.parametrize(
    "fields",
    [
        pytest.param({"status": "accepted"}, id="accepted status"),
        pytest.param({"status": "active"}, id="active status"),
        pytest.param({"status": None}, id="null status"),
        pytest.param({"requestId": uid()}, id="wrong read identity"),
        pytest.param({"serverTime": "not-a-time"}, id="unparseable time"),
        pytest.param({"serverTime": "2026-02-30T00:00:00.000Z"}, id="invalid calendar"),
        pytest.param({"sessionToken": BACKEND_KEY}, id="credential"),
        pytest.param({"claims": {"credential": BACKEND_KEY}}, id="claims"),
    ],
)
def test_an_invalid_or_credential_bearing_reply_envelope_is_rejected(fields: dict[str, Any]) -> None:
    setup = Setup()
    setup.envelope = fields
    setup.rejects_invalid()


# Read identity and asynchronous restoration


@pytest.mark.anyio
async def test_invalid_original_ids_fail_before_authority_calls_or_recovery_loading() -> None:
    storage = AsyncStorage()
    authority = Authority()
    client = authority.async_project(async_recovery_storage=storage)
    for invalid in ("", "not-an-id", ZERO, uid().upper(), 1):
        await rejects_async(lambda: client.session_request_outcome(request_id=invalid), "INVALID_REQUEST")  # type: ignore[arg-type]  # noqa: B023 - awaited at once.
    assert (authority.requests, storage.reads, storage.writes) == ([], [], [])


def test_an_outcome_read_cannot_reuse_the_original_mutation_id_as_its_own(monkeypatch: pytest.MonkeyPatch) -> None:
    setup = Setup()
    original = uuid.UUID(setup.request_id)
    monkeypatch.setattr(uuid, "uuid4", lambda: original)
    problem = rejects(setup.read, "INVALID_REQUEST", SEPARATE)
    assert (problem.request_id, problem.outcome, problem.status) == (setup.request_id, "rejected", 400)
    assert setup.requests == []
    assert list(setup.client.recovery_states) == []
    assert setup.storage.writes == []


@pytest.mark.anyio
async def test_async_outcome_reads_wait_for_the_one_time_restoration_and_write_nothing() -> None:
    entered, loaded = asyncio.Event(), asyncio.Event()

    async def hold(_key: str) -> None:
        entered.set()
        await loaded.wait()

    setup = Setup()
    storage = AsyncStorage(on_read=hold)
    client = setup.async_client(async_recovery_storage=storage)
    assert storage.reads == []
    async with asyncio.timeout(5):
        pending = asyncio.ensure_future(client.session_request_outcome(request_id=setup.request_id))
        await entered.wait()
        assert setup.requests == []
        with pytest.raises(RuntimeError, match=UNLOADED.replace("(", r"\(").replace(")", r"\)")):
            _ = client.recovery_states
        loaded.set()
        assert (await pending).state == "committed"
        assert (await client.session_request_outcome(request_id=setup.request_id)).state == "committed"
    assert len(storage.reads) == 1
    assert storage.writes == []
    assert setup.authority.keys == [OUTCOME, OUTCOME]
    assert list(client.recovery_states) == []


@pytest.mark.anyio
async def test_a_failed_async_restoration_never_becomes_an_empty_success_or_reaches_the_authority() -> None:
    failure = OSError("Database read unavailable")

    async def broken(_key: str) -> None:
        raise failure

    setup = Setup()
    storage = AsyncStorage(on_read=broken)
    client = setup.async_client(async_recovery_storage=storage)
    for _ in range(2):
        with pytest.raises(OSError) as caught:
            await client.session_request_outcome(request_id=setup.request_id)
        assert caught.value is failure
    assert (len(storage.reads), storage.writes, setup.requests) == (1, [], [])
    with pytest.raises(RuntimeError, match=UNLOADED.replace("(", r"\(").replace(")", r"\)")):
        _ = client.recovery_states


def test_outcomes_are_checked_against_the_client_incarnation_which_cannot_change() -> None:
    setup = Setup()
    with pytest.raises(AttributeError):
        setup.client.incarnation = uid()  # type: ignore[misc]
    both("incarnation", uid())(setup.result)
    setup.rejects_invalid()
    assert setup.requests[0].context["incarnation"] == setup.incarnation


# Custody of the original mutation

CUSTODY = [
    pytest.param(put({"operation": "issueSession"}), id="operation"),
    pytest.param(both("principalId", uid()), id="principal"),
    pytest.param(both("deviceId", uid()), id="device"),
    pytest.param(both("sessionId", uid()), id="session"),
    pytest.param(
        put(
            {
                "originalSession.sessionRevision": "9007199254740994",
                "currentSession.sessionRevision": "9007199254740995",
            }
        ),
        id="expected revision",
    ),
]


@pytest.mark.parametrize("mutate", CUSTODY)
def test_an_outcome_cannot_contradict_the_retained_original_mutation(mutate: Mutation) -> None:
    setup = Setup()
    session = dict(setup.result["originalSession"])
    mutate(setup.result)
    # Without custody the changed evidence is self-consistent, so only the retained mutation can refute it.
    assert setup.read().state == "committed"
    rejects(lambda: renew(setup.client, session, setup.request_id), "TRANSPORT_UNKNOWN")
    [state] = setup.client.recovery_states
    assert (state.request_id, state.resolution_state) == (setup.request_id, "unknown")
    setup.rejects_invalid()
    assert setup.authority.keys == [OUTCOME, "communication.renewSession", OUTCOME]


def test_a_committed_issuance_outcome_leaves_the_unknown_request_and_its_payload_in_custody() -> None:
    setup = Setup("issueSession")
    session = setup.result["originalSession"]
    payload = {"principalId": session["principalId"], "deviceId": session["deviceId"], "requestedTtlMs": "60000"}
    rejects(
        lambda: setup.client.issue_session(
            principal_id=session["principalId"],
            device_id=session["deviceId"],
            requested_ttl_ms="60000",
            request_id=setup.request_id,
        ),
        "TRANSPORT_UNKNOWN",
    )
    custody, writes = setup.client.recovery_states, list(setup.storage.writes)
    assert setup.read().operation == "issueSession"
    assert setup.client.recovery_states == custody
    assert setup.storage.writes == writes
    [state] = setup.client.recovery_states
    assert state.input == payload
    assert (state.request_id, state.resolution_state, state.attempt_count) == (setup.request_id, "unknown", 1)
    assert setup.authority.keys == ["communication.issueSession", OUTCOME]


def test_outcome_metadata_cannot_settle_evict_or_reset_custody_across_key_rotation() -> None:
    project_id, incarnation, request_id, storage = uid(), uid(), uid(), Storage()
    result = outcome(request_id, incarnation)
    session = result["originalSession"]
    common: dict[str, Any] = {"project_id": project_id, "incarnation": incarnation, "recovery_storage": storage}
    first = Authority(offline).project(backend_key="fixture-original-key", **common)
    rejects(lambda: renew(first, session, request_id), "TRANSPORT_UNKNOWN")
    custody, snapshot, writes = first.recovery_states, dict(storage.values), len(storage.writes)

    def respond(request: Received) -> httpx.Response:
        if request.key != OUTCOME or request.headers["authorization"] != "Bearer fixture-rotated-key":
            raise UnexpectedRequestError(request.key)
        return reply(request, serverTime=CHECKED_AT, result=result)

    authority = Authority(respond)
    rotated = authority.project(backend_key="fixture-rotated-key", **common)
    assert rotated.session_request_outcome(request_id=request_id).state == "committed"
    assert rotated.recovery_states == custody
    assert (storage.values, len(storage.writes)) == (snapshot, writes)
    [state] = rotated.recovery_states
    assert (state.request_id, state.attempt_count, state.resolution_state) == (request_id, 1, "unknown")
    result.update({"state": "notObservedYet"} | dict.fromkeys(DETAILS))
    assert rotated.session_request_outcome(request_id=request_id).state == "notObservedYet"
    assert rotated.recovery_states == custody
    assert (storage.values, len(storage.writes)) == (snapshot, writes)
    assert authority.keys == [OUTCOME, OUTCOME]


# Read failures and the unchanged neighbouring operations


def test_authority_rejections_and_lost_reads_stay_read_failures_without_automatic_retries() -> None:
    lost = False

    def respond(request: Received) -> httpx.Response:
        if lost:
            raise httpx.ConnectError(BACKEND_KEY)
        return graphql_error(request, "SCOPE_REQUIRED", 403, "The backend key requires the current sessionManage scope")

    authority = Authority(respond)
    client = authority.project()
    request_id = uid()
    problem = rejects(lambda: client.session_request_outcome(request_id=request_id), "SCOPE_REQUIRED")
    assert isinstance(problem, ScopeRequiredProblem)
    assert (problem.outcome, problem.status, problem.scope) == ("rejected", 403, "sessionManage")
    lost = True
    problem = rejects(lambda: client.session_request_outcome(request_id=request_id), "TRANSPORT_UNKNOWN")
    assert (problem.outcome, problem.status) == ("unknown", 0)
    assert_clean(problem)
    assert authority.keys == [OUTCOME, OUTCOME]
    assert len({request.request_id for request in authority.requests} - {request_id}) == 2
    assert list(client.recovery_states) == []


def test_initialization_and_withheld_request_resolutions_keep_their_meaning() -> None:
    project_id, incarnation, original = uid(), uid(), uid()

    def respond(request: Received) -> httpx.Response:
        if request.key == "communication.route":
            return reply(request, result=route_proof(project_id, incarnation))
        if request.key != "communication.resolveRequest":
            raise UnexpectedRequestError(request.key)
        return reply(request, result=resolution(original, "committed") | {"resultWithheld": True})

    storage = Storage()
    authority = Authority(respond)
    client = authority.project(project_id=project_id, incarnation=incarnation, recovery_storage=storage)
    client.initialize()
    resolved = client.resolve_request(request_id=original)
    assert resolved.result_withheld is True
    assert resolved.receipt is not None
    assert resolved.receipt.result is None
    assert authority.keys == ["communication.route", "communication.resolveRequest"]
    assert storage.writes == []
    read = OPERATIONS[OUTCOME]
    assert (read.kind, read.idempotency, read.input_type) == ("query", "safe", "SessionRequestOutcomeRequestInput")
    assert list(INPUTS["SessionRequestOutcomeRequestInput"]) == ["requestId"]
    assert "sessionToken" not in read.document
    assert all("sessionRequestOutcome" not in OPERATIONS[key].document for key in OPERATIONS if key != OUTCOME)
