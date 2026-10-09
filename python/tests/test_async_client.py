"""Asynchronous clients: storage loading, ordered and serialized writes, shared submissions, cancellation, transport."""

from __future__ import annotations

import asyncio
import dataclasses
import gc
import json
import pickle
import re
from collections.abc import AsyncIterator, Awaitable, Callable
from functools import partial
from typing import Any

import httpx
import pytest

from convohop import AsyncConvoHop, AsyncConvoHopManagement, RecoveryState
from convohop import _engine as engine
from convohop._engine import BODY_CAP

from .graphql import (
    ACCESS_TOKEN,
    BACKEND_KEY,
    BASE_URL,
    ENDPOINT,
    AsyncStorage,
    Authority,
    Chunks,
    Received,
    Storage,
    UnexpectedRequestError,
    answer,
    full,
    member,
    member_page,
    offline,
    rejects,
    rejects_async,
    reply,
    resolution,
    resolves,
    route_proof,
    settle,
    uid,
)

pytestmark = pytest.mark.anyio

PROJECT, INCARNATION, CONVERSATION, ACTOR, ORG, PRINCIPAL = (uid() for _ in range(6))
PROJECT_KEY = "convohop.requests:backend:" + PROJECT
MANAGEMENT_KEY = "convohop.requests:management:" + ACTOR
ROTATED = "fixture-rotated-credential-never-in-errors"
WINDOW_MS = 60_000
UNAVAILABLE = "Authority response unavailable; resolve the original request"
INCOMPLETE = "Incomplete authority response; resolve the original request"
BUDGET = "Retry budget expired or clock changed; resolve this request read-only"
ELIGIBILITY = "The original request is no longer eligible for resend"
ABSENT = "Previously observed commit or native admission cannot be retried from absent evidence"
STORAGE = "Recovery storage did not confirm durability; retain the original request and its outcome"
CONFLICT = "Preserve the original request and payload"
UNLOADED = "Await initialize_recovery() before inspecting asynchronous recovery state"
ORIGINAL = {"conversationId": CONVERSATION, "text": "Original", "props": {}}
CLIENTS = [AsyncConvoHop, AsyncConvoHopManagement]
KINDS = ["project", "management"]


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> list[int]:
    """The SDK's millisecond clock; a test moves it by assigning ``clock[0]``."""
    moment = [1_800_000_000_000]
    monkeypatch.setattr(engine, "_now_ms", lambda: moment[0])
    return moment


def exactly(message: str) -> str:
    """A ``match`` pattern for exactly ``message``."""
    return "^" + re.escape(message) + "$"


class Gates:
    """A storage hook that holds the given 1-based calls until the test opens them."""

    def __init__(self, *numbers: int) -> None:
        self.calls = 0
        self._entered = {number: asyncio.Event() for number in numbers}
        self._opened = {number: asyncio.Event() for number in numbers}

    async def __call__(self, *_: object) -> None:
        self.calls += 1
        number = self.calls
        if number in self._opened:
            self._entered[number].set()
            await self._opened[number].wait()

    async def entered(self, number: int) -> None:
        """Waits until call ``number`` is being held."""
        async with asyncio.timeout(5):
            await self._entered[number].wait()

    def open(self, number: int) -> None:
        self._opened[number].set()


def fails(number: int, failure: Exception) -> Callable[[str, str, int], Awaitable[None]]:
    """An ``on_write`` hook that raises ``failure`` from the 1-based write ``number``."""

    async def hook(_key: str, _value: str, count: int) -> None:
        if count == number:
            raise failure

    return hook


async def until(condition: Callable[[], bool]) -> None:
    """Lets other tasks run until ``condition`` holds."""
    for _ in range(1000):
        if condition():
            return
        await asyncio.sleep(0)
    pytest.fail("The awaited condition never held")


class Reported:
    """Records what the running loop reports to its exception handler, such as unretrieved task exceptions."""

    def __init__(self) -> None:
        self.contexts: list[dict[str, Any]] = []
        self._loop = asyncio.get_running_loop()
        self._previous = self._loop.get_exception_handler()

    def __enter__(self) -> list[dict[str, Any]]:
        self._loop.set_exception_handler(lambda _loop, context: self.contexts.append(context))
        return self.contexts

    def __exit__(self, *_: object) -> None:
        self._loop.set_exception_handler(self._previous)


def options(client_type: type[AsyncConvoHop | AsyncConvoHopManagement], **overrides: Any) -> dict[str, Any]:
    """Valid constructor options for ``client_type`` with ``overrides`` applied."""
    if client_type is AsyncConvoHop:
        return {"base_url": BASE_URL, "backend_key": BACKEND_KEY, "project_id": PROJECT, "incarnation": INCARNATION} | (
            overrides
        )
    return {"base_url": BASE_URL, "access_token": ACCESS_TOKEN, "actor_id": ACTOR} | overrides


def management(authority: Authority, storage: AsyncStorage, **settings: Any) -> AsyncConvoHopManagement:
    """A management client for :data:`ACTOR` that keeps its records in ``storage``."""
    return authority.async_management(actor_id=ACTOR, async_recovery_storage=storage, **settings)


def project(authority: Authority, storage: AsyncStorage, **settings: Any) -> AsyncConvoHop:
    """A client for :data:`PROJECT` under :data:`INCARNATION` that keeps its records in ``storage``."""
    return authority.async_project(
        project_id=PROJECT, incarnation=INCARNATION, async_recovery_storage=storage, **settings
    )


async def create_organization(client: AsyncConvoHopManagement, request_id: str, name: str = "Original") -> object:
    return await client.create_organization(name=name, terms_ref="fixture", request_id=request_id)


async def create_deployment(client: AsyncConvoHopManagement, request_id: str) -> object:
    return await client.create_deployment(
        org_id=ORG,
        offering="managedShared",
        geo_id="fixture-region",
        installation_profile_id="fixture-profile",
        consent_ref="fixture-consent",
        request_id=request_id,
    )


MUTATIONS: dict[str, tuple[str, Callable[[AsyncConvoHopManagement, str], Awaitable[object]]]] = {
    "committed": ("management.createOrganization", create_organization),
    "accepted": ("management.createDeployment", create_deployment),
}


async def send(client: AsyncConvoHop, request_id: str, props: dict[str, Any] | None = None) -> object:
    return await client.send_message(
        conversation_id=CONVERSATION, text="Original", props={} if props is None else props, request_id=request_id
    )


def ack() -> dict[str, Any]:
    """A ``MessageAck`` for a message sent in :data:`CONVERSATION` under :data:`INCARNATION`."""
    cursor = {"incarnation": INCARNATION, "conversationId": CONVERSATION, "sequence": "1"}
    values = {"messageId": uid(), "conversationId": CONVERSATION, "sequence": "1", "revision": "1", "status": "sent"}
    return full("MessageAck", values | {"cursor": cursor})


def unresolved(request_id: str) -> tuple[str, tuple[RecoveryState, ...]]:
    """The stored records, and their states, after a management mutation for :data:`ACTOR` was lost."""
    storage = Storage()
    client = Authority(offline).management(actor_id=ACTOR, recovery_storage=storage)
    create = partial(client.create_organization, name="Original", terms_ref="fixture", request_id=request_id)
    rejects(create, "TRANSPORT_UNKNOWN", UNAVAILABLE)
    return storage.values[MANAGEMENT_KEY], client.recovery_states


def saved(journal: str, **hooks: Any) -> AsyncStorage:
    """Asynchronous storage that already holds ``journal`` for :data:`ACTOR`."""
    storage = AsyncStorage(**hooks)
    storage.values[MANAGEMENT_KEY] = journal
    return storage


class Holds:
    """Asynchronous storage that returns one value, which need not be a string, and accepts no writes."""

    def __init__(self, value: object) -> None:
        self.value = value
        self.reads = 0

    async def get_item(self, key: str) -> Any:
        self.reads += 1
        return self.value

    async def set_item(self, key: str, value: str) -> None:
        raise UnexpectedRequestError("Unexpected recovery write")


# Loading recovery storage


async def test_one_storage_read_restores_records_before_concurrent_operations(clock: list[int]) -> None:
    request_id = uid()
    journal, _ = unresolved(request_id)
    gate = Gates(1)
    storage = saved(journal, on_read=gate)
    authority = Authority(answer(settle, "notObservedYet", "committed"))
    client = management(authority, storage)
    with pytest.raises(RuntimeError, match=exactly(UNLOADED)):
        _ = client.recovery_states
    creating = asyncio.create_task(create_organization(client, uid(), "Second"))
    loading = asyncio.create_task(client.initialize_recovery())
    retrying = asyncio.create_task(client.retry_request(request_id))
    await gate.entered(1)
    assert (storage.reads, storage.writes, authority.requests) == ([MANAGEMENT_KEY], [], [])
    with pytest.raises(RuntimeError, match=exactly(UNLOADED)):
        _ = client.recovery_states

    gate.open(1)
    await loading
    await creating
    resolved = await retrying
    assert resolved.state == "committed"
    assert storage.reads == [MANAGEMENT_KEY]
    restored, created = client.recovery_states
    assert (restored.request_id, restored.attempt_count, restored.resolution_state) == (request_id, 2, "committed")
    assert (created.input, created.attempt_count, created.resolution_state) == (
        {"name": "Second", "termsRef": "fixture"},
        1,
        "committed",
    )
    assert sorted(authority.keys) == ["management.createOrganization"] * 2 + ["management.resolveRequest"] * 2


async def test_each_async_write_completes_before_the_step_it_protects() -> None:
    gate = Gates(1, 2, 3)
    storage = AsyncStorage(on_write=gate)
    stored_when_sent: list[list[dict[str, Any]]] = []

    def respond(request: Received) -> httpx.Response:
        stored_when_sent.append(storage.records(MANAGEMENT_KEY))
        return settle(request)

    request_id, authority = uid(), Authority(respond)
    client = management(authority, storage)
    creating = asyncio.create_task(create_organization(client, request_id))
    await gate.entered(1)
    assert (storage.values, authority.requests) == ({}, [])
    assert [state.resolution_state for state in client.recovery_states] == ["pending"]
    gate.open(1)
    await gate.entered(2)
    assert [record["resolutionState"] for record in storage.records(MANAGEMENT_KEY)] == ["pending"]
    assert authority.requests == []
    gate.open(2)
    await gate.entered(3)
    [[submitted]] = stored_when_sent
    assert (submitted["attemptCount"], submitted["lastAttemptClassification"]) == (1, "submitted")
    assert not creating.done()
    gate.open(3)
    await creating
    [record] = storage.records(MANAGEMENT_KEY)
    assert (record["resolutionState"], record["lastAttemptClassification"]) == ("committed", "authorityReceipt")
    assert len(storage.writes) == 3


async def test_a_failed_load_is_raised_to_every_later_call_without_another_read() -> None:
    failure = OSError("database unavailable")

    async def broken(_key: str) -> None:
        raise failure

    storage = AsyncStorage(on_read=broken)
    authority = Authority()
    client = management(authority, storage)
    calls: list[Callable[[], Awaitable[object]]] = [
        client.initialize_recovery,
        partial(create_organization, client, uid()),
        partial(client.retry_request, uid()),
        partial(client.resolve_request, request_id=uid()),
    ]
    for call in calls:
        with pytest.raises(OSError) as caught:
            await call()
        assert caught.value is failure
    with pytest.raises(RuntimeError, match=exactly(UNLOADED)):
        _ = client.recovery_states
    assert (storage.reads, storage.writes, authority.requests) == ([MANAGEMENT_KEY], [], [])


@pytest.mark.parametrize(
    ("build", "message"),
    [
        pytest.param(lambda valid: "", "Invalid asynchronous mutation recovery storage", id="empty"),
        pytest.param(lambda valid: 7, "Invalid asynchronous mutation recovery storage", id="number"),
        pytest.param(lambda valid: b"[]", "Invalid asynchronous mutation recovery storage", id="bytes"),
        pytest.param(lambda valid: "{", "Invalid mutation recovery storage", id="malformed"),
        pytest.param(lambda valid: "null", "Invalid mutation recovery storage", id="null"),
        pytest.param(lambda valid: "{}", "Invalid mutation recovery storage", id="object"),
        pytest.param(lambda valid: json.dumps([valid] * 129), "Invalid mutation recovery storage", id="too many"),
        pytest.param(lambda valid: "[{}]", "Invalid recovery record", id="empty record"),
        pytest.param(lambda valid: json.dumps([valid, {}]), "Invalid recovery record", id="later record"),
        pytest.param(lambda valid: json.dumps([valid, valid]), "Duplicate mutation recovery identity", id="duplicate"),
    ],
)
async def test_malformed_async_storage_is_refused_when_loaded(
    build: Callable[[dict[str, Any]], object], message: str
) -> None:
    [valid] = json.loads(unresolved(uid())[0])
    storage = Holds(build(valid))
    authority = Authority()
    client = authority.async_management(actor_id=ACTOR, async_recovery_storage=storage)
    for call in (client.initialize_recovery, partial(create_organization, client, uid())):
        with pytest.raises(ValueError, match=exactly(message)):
            await call()
    assert storage.reads == 1
    assert authority.requests == []


async def test_a_changed_payload_waiting_for_the_load_is_a_conflict() -> None:
    request_id = uid()
    journal, original = unresolved(request_id)
    gate = Gates(1)
    storage = saved(journal, on_read=gate)
    authority = Authority()
    client = management(authority, storage)
    changing = asyncio.create_task(create_organization(client, request_id, "Changed"))
    await gate.entered(1)
    assert not changing.done()
    gate.open(1)
    problem = await rejects_async(lambda: changing, "IDEMPOTENCY_CONFLICT", CONFLICT)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 409)
    assert client.recovery_states == original
    assert (storage.writes, authority.requests) == ([], [])


async def test_synchronous_storage_is_restored_when_an_async_client_is_constructed() -> None:
    request_id = uid()
    journal, original = unresolved(request_id)
    storage = Storage()
    storage.values[MANAGEMENT_KEY] = journal
    authority = Authority(resolves("committed"))
    client = authority.async_management(actor_id=ACTOR, recovery_storage=storage)
    assert storage.reads == [MANAGEMENT_KEY]
    assert client.recovery_states == original
    assert (await client.retry_request(request_id)).state == "committed"
    assert storage.records(MANAGEMENT_KEY)[0]["resolutionState"] == "committed"
    assert (storage.reads, authority.keys) == ([MANAGEMENT_KEY], ["management.resolveRequest"])


async def test_management_records_are_scoped_to_the_actor_and_never_hold_the_token() -> None:
    storage = AsyncStorage()
    authority = Authority(settle)
    await create_organization(management(authority, storage), uid())
    other = uid()
    elsewhere = authority.async_management(actor_id=other, async_recovery_storage=storage)
    await elsewhere.initialize_recovery()
    assert elsewhere.recovery_states == ()
    assert storage.reads == [MANAGEMENT_KEY, "convohop.requests:management:" + other]
    assert list(storage.values) == [MANAGEMENT_KEY]
    assert all(ACCESS_TOKEN not in value for _, value in storage.writes)


# Storage failures


@pytest.mark.parametrize(("write", "state"), [(1, "pending"), (2, "unknown")])
async def test_a_failed_async_write_before_sending_sends_nothing_and_keeps_the_identity(
    clock: list[int], write: int, state: str
) -> None:
    failure = OSError("database unavailable")
    request_id, storage = uid(), AsyncStorage(on_write=fails(write, failure))
    authority = Authority(settle)
    client = management(authority, storage)
    problem = await rejects_async(partial(create_organization, client, request_id), "RECOVERY_STORAGE_FAILURE", STORAGE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 0)
    assert problem.__cause__ is failure
    assert authority.requests == []
    [recorded] = client.recovery_states
    assert (recorded.attempt_count, recorded.resolution_state) == (write - 1, state)

    await create_organization(client, request_id)
    [after] = client.recovery_states
    assert after == dataclasses.replace(
        recorded, attempt_count=write, last_attempt_classification="authorityReceipt", resolution_state="committed"
    )
    assert storage.records(MANAGEMENT_KEY)[0]["attemptCount"] == write
    assert [request.request_id for request in authority.requests] == [request_id]


async def test_a_failed_project_write_sends_nothing_and_keeps_the_project_scope() -> None:
    failure = OSError("database unavailable")
    request_id, storage = uid(), AsyncStorage(on_write=fails(1, failure))
    authority = Authority()
    client = project(authority, storage)
    problem = await rejects_async(partial(send, client, request_id), "RECOVERY_STORAGE_FAILURE", STORAGE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 0)
    assert problem.__cause__ is failure
    [state] = client.recovery_states
    assert (state.operation, state.project_id, state.incarnation, state.input) == (
        "communication.sendMessage",
        PROJECT,
        INCARNATION,
        ORIGINAL,
    )
    assert (storage.values, authority.requests) == ({}, [])


@pytest.mark.parametrize("outcome", ["committed", "accepted"])
async def test_a_failed_async_receipt_write_reports_the_observed_outcome(outcome: str) -> None:
    key, call = MUTATIONS[outcome]
    failure = OSError("database unavailable")
    request_id, storage = uid(), AsyncStorage(on_write=fails(3, failure))
    authority = Authority(answer(settle, outcome))
    client = management(authority, storage)
    problem = await rejects_async(partial(call, client, request_id), "RECOVERY_STORAGE_FAILURE", STORAGE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, outcome, 0)
    assert problem.__cause__ is failure
    assert storage.records(MANAGEMENT_KEY)[0]["resolutionState"] == "unknown"

    assert (await client.retry_request(request_id)).state == outcome
    assert storage.records(MANAGEMENT_KEY)[0]["resolutionState"] == outcome
    assert authority.count(key) == 1


async def test_a_failed_async_write_after_a_resolution_keeps_the_observed_commit() -> None:
    failure = OSError("database unavailable")
    request_id, storage = uid(), AsyncStorage(on_write=fails(4, failure))
    authority = Authority(answer(offline, "committed", "notObservedYet"))
    client = management(authority, storage)
    await rejects_async(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    resolve = partial(client.resolve_request, request_id=request_id)
    problem = await rejects_async(resolve, "RECOVERY_STORAGE_FAILURE", STORAGE)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "committed", 0)
    assert problem.__cause__ is failure
    await rejects_async(partial(client.retry_request, request_id), "RESOLUTION_REQUIRED", ABSENT)
    assert authority.count("management.createOrganization") == 1
    assert storage.records(MANAGEMENT_KEY)[0]["resolutionState"] == "unknown"


# Clocks and restarts


async def test_retry_request_loads_storage_and_resends_the_original_request(clock: list[int]) -> None:
    request_id, storage = uid(), AsyncStorage()
    lost = management(Authority(offline), storage)
    await rejects_async(partial(create_organization, lost, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    clock[0] += 1000

    authority = Authority(answer(settle, "notObservedYet", "committed"))
    restarted = management(authority, storage, access_token=ROTATED)
    with pytest.raises(RuntimeError, match=exactly(UNLOADED)):
        _ = restarted.recovery_states
    assert (await restarted.retry_request(request_id)).state == "committed"
    assert authority.keys == [
        "management.resolveRequest",
        "management.createOrganization",
        "management.resolveRequest",
    ]
    resent = authority.requests[1]
    assert (resent.request_id, resent.input) == (request_id, {"name": "Original", "termsRef": "fixture"})
    assert {request.headers["authorization"] for request in authority.requests} == {"Bearer " + ROTATED}
    assert storage.reads == [MANAGEMENT_KEY] * 2
    assert not any(token in value for _, value in storage.writes for token in (ACCESS_TOKEN, ROTATED))
    [state] = restarted.recovery_states
    assert (state.attempt_count, state.resolution_state, state.last_attempt_at) == (2, "committed", clock[0])


@pytest.mark.parametrize(
    ("write", "shift", "message"),
    [(1, WINDOW_MS + 1, BUDGET), (2, WINDOW_MS + 1, ELIGIBILITY), (2, -1, ELIGIBILITY)],
)
async def test_a_clock_change_during_an_async_write_stops_the_send(
    clock: list[int], write: int, shift: int, message: str
) -> None:
    start = clock[0]

    async def move(_key: str, _value: str, count: int) -> None:
        await asyncio.sleep(0)
        if count == write:
            clock[0] = start + shift

    request_id, storage = uid(), AsyncStorage(on_write=move)
    authority = Authority()
    client = management(authority, storage)
    problem = await rejects_async(partial(create_organization, client, request_id), "RESOLUTION_REQUIRED", message)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 409)
    assert authority.requests == []
    assert len(storage.writes) == write
    assert storage.records(MANAGEMENT_KEY)[0]["attemptCount"] == write - 1


async def test_the_attempt_limit_survives_async_reconstruction(clock: list[int]) -> None:
    request_id, storage = uid(), AsyncStorage()
    authority = Authority(answer(offline, "notObservedYet"))
    client = management(authority, storage)
    await rejects_async(partial(create_organization, client, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    for _ in range(2):
        clock[0] += 1000
        client = management(authority, storage)
        await rejects_async(partial(client.retry_request, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    clock[0] += 1000
    exhausted = management(authority, storage)
    await rejects_async(partial(exhausted.retry_request, request_id), "RESOLUTION_REQUIRED", BUDGET)
    assert authority.count("management.createOrganization") == 3
    assert [state.attempt_count for state in exhausted.recovery_states] == [3]
    assert storage.reads == [MANAGEMENT_KEY] * 4


# Concurrency


async def test_overlapping_mutations_write_one_snapshot_at_a_time() -> None:
    writing, peak = [0], [0]

    async def write(_key: str, _value: str, _count: int) -> None:
        writing[0] += 1
        peak[0] = max(peak[0], writing[0])
        await asyncio.sleep(0)
        writing[0] -= 1

    releases = {"First": asyncio.Event(), "Second": asyncio.Event()}

    async def respond(request: Received) -> httpx.Response:
        await releases[request.input["name"]].wait()
        return settle(request)

    storage = AsyncStorage(on_write=write)
    authority = Authority(respond)
    client = management(authority, storage)
    first = asyncio.create_task(create_organization(client, uid(), "First"))
    second = asyncio.create_task(create_organization(client, uid(), "Second"))
    await until(lambda: len(authority.requests) == 2)
    releases["Second"].set()
    await second
    releases["First"].set()
    await first
    assert peak[0] == 1
    assert len(storage.writes) == 6
    records = storage.records(MANAGEMENT_KEY)
    assert [(record["input"]["name"], record["resolutionState"]) for record in records] == [
        ("First", "committed"),
        ("Second", "committed"),
    ]


async def test_concurrent_calls_with_one_identity_share_one_submission() -> None:
    release = asyncio.Event()

    async def respond(request: Received) -> httpx.Response:
        await release.wait()
        return settle(request)

    request_id, storage = uid(), AsyncStorage()
    authority = Authority(respond)
    client = management(authority, storage)
    first = asyncio.create_task(create_organization(client, request_id))
    second = asyncio.create_task(create_organization(client, request_id))
    await until(lambda: len(authority.requests) == 1)
    changed = partial(create_organization, client, request_id, "Changed")
    problem = await rejects_async(changed, "IDEMPOTENCY_CONFLICT", CONFLICT)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 409)
    release.set()
    organizations = [await first, await second]
    assert organizations[0] == organizations[1]
    assert len(authority.requests) == 1
    assert len(storage.writes) == 3


async def test_a_commit_observed_during_a_retry_write_stops_the_resend() -> None:
    request_id = uid()
    journal, _ = unresolved(request_id)
    gate = Gates(1)
    storage = saved(journal, on_write=gate)
    authority = Authority(resolves("notObservedYet", "committed"))
    client = management(authority, storage)
    retrying = asyncio.create_task(client.retry_request(request_id))
    await gate.entered(1)
    resolving = asyncio.create_task(client.resolve_request(request_id=request_id))
    await until(lambda: client.recovery_states[0].resolution_state == "committed")
    gate.open(1)
    problem = await rejects_async(lambda: retrying, "RESOLUTION_REQUIRED", ELIGIBILITY)
    assert (problem.request_id, problem.outcome, problem.status) == (request_id, "unknown", 409)
    assert (await resolving).state == "committed"
    assert authority.keys == ["management.resolveRequest"] * 2
    [record] = storage.records(MANAGEMENT_KEY)
    assert (record["resolutionState"], record["attemptCount"]) == ("committed", 2)


async def test_changing_the_callers_props_during_an_async_write_changes_nothing_recorded_or_sent() -> None:
    props: dict[str, Any] = {"nested": {"value": "original"}}

    async def change(_key: str, _value: str, count: int) -> None:
        if count == 1:
            props["nested"]["value"] = "changed"

    request_id, sent, storage = uid(), ack(), AsyncStorage(on_write=change)
    authority = Authority(lambda request: reply(request, result=sent))
    client = project(authority, storage)
    await send(client, request_id, props)
    expected = ORIGINAL | {"props": {"nested": {"value": "original"}}}
    assert [request.input for request in authority.requests] == [expected]
    assert storage.records(PROJECT_KEY)[0]["input"] == expected
    assert [state.input for state in client.recovery_states] == [expected]


async def test_project_recovery_loads_before_the_route_and_survives_key_rotation() -> None:
    request_id, storage = uid(), AsyncStorage()
    lost = project(Authority(offline), storage)
    await rejects_async(partial(send, lost, request_id), "TRANSPORT_UNKNOWN", UNAVAILABLE)
    sent, observed = ack(), [False]

    def respond(request: Received) -> httpx.Response:
        if request.key == "communication.route":
            return reply(request, result=route_proof(PROJECT, INCARNATION))
        if request.key == "communication.sendMessage":
            observed[0] = True
            return reply(request, result=sent)
        if request.key == "communication.resolveRequest":
            if observed[0]:
                return reply(request, result=resolution(request.input["requestId"], "committed", {"messageAck": sent}))
            return reply(request, result=resolution(request.input["requestId"], "notObservedYet"))
        raise UnexpectedRequestError(request.key)

    gate = Gates(1)
    storage.on_read = gate
    authority = Authority(respond)
    restarted = project(authority, storage, backend_key=ROTATED)
    initializing = asyncio.create_task(restarted.initialize())
    await gate.entered(1)
    assert authority.requests == []
    gate.open(1)
    await initializing
    assert restarted.serving_epoch == "2"

    resolved = await restarted.retry_request(request_id)
    assert resolved.state == "committed"
    assert resolved.receipt is not None
    assert resolved.receipt.result is not None
    assert resolved.receipt.result.message_ack is not None
    assert resolved.receipt.result.message_ack.to_dict() == sent
    assert authority.keys == [
        "communication.route",
        "communication.resolveRequest",
        "communication.sendMessage",
        "communication.resolveRequest",
    ]
    resent = authority.requests[2]
    assert (resent.request_id, resent.input) == (request_id, ORIGINAL)
    assert resent.context == {
        "requestId": request_id,
        "projectId": PROJECT,
        "incarnation": INCARNATION,
        "observedServingEpoch": "2",
    }
    assert {request.headers["authorization"] for request in authority.requests} == {"Bearer " + ROTATED}
    assert storage.reads == [PROJECT_KEY] * 2
    assert not any(key in value for _, value in storage.writes for key in (BACKEND_KEY, ROTATED))


# Cancellation


@pytest.mark.parametrize("delivered", [True, False], ids=["delivered", "lost"])
async def test_cancelling_the_caller_never_abandons_an_in_flight_mutation(delivered: bool) -> None:
    sending, release = asyncio.Event(), asyncio.Event()

    async def respond(request: Received) -> httpx.Response:
        sending.set()
        await release.wait()
        return settle(request) if delivered else offline(request)

    request_id, storage = uid(), AsyncStorage()
    authority = Authority(respond)
    client = management(authority, storage)
    with Reported() as reported:
        caller = asyncio.create_task(create_organization(client, request_id))
        async with asyncio.timeout(5):
            await sending.wait()
        caller.cancel()
        with pytest.raises(asyncio.CancelledError):
            await caller
        release.set()
        # The mutation task removes itself from the in-flight table once its outcome is retrieved.
        await until(lambda: not client._engine.active)
        del caller
        gc.collect()
    assert reported == []
    expected = ("committed", "authorityReceipt") if delivered else ("unknown", "TRANSPORT_UNKNOWN")
    [state] = client.recovery_states
    assert (state.resolution_state, state.last_attempt_classification) == expected
    assert storage.records(MANAGEMENT_KEY)[0]["resolutionState"] == expected[0]
    assert authority.count("management.createOrganization") == 1


async def test_a_failed_load_is_retrieved_when_its_only_caller_was_cancelled() -> None:
    reading, release = asyncio.Event(), asyncio.Event()

    async def broken(_key: str) -> None:
        reading.set()
        await release.wait()
        raise OSError("database unavailable")

    client = management(Authority(), AsyncStorage(on_read=broken))
    with Reported() as reported:
        caller = asyncio.create_task(client.initialize_recovery())
        async with asyncio.timeout(5):
            await reading.wait()
        load = client._driver._initialization
        assert load is not None
        caller.cancel()
        with pytest.raises(asyncio.CancelledError):
            await caller
        release.set()
        await until(load.done)
        await asyncio.sleep(0)
        del caller, client, load
        gc.collect()
    assert reported == []


# Arguments and options


async def test_arguments_are_checked_before_storage_is_loaded() -> None:
    storage, authority = AsyncStorage(), Authority()
    client = management(authority, storage)
    with pytest.raises(TypeError, match=exactly("request_id must be a string")):
        await client.retry_request(7)  # type: ignore[arg-type]
    retry = partial(client.retry_request, "not-a-request")
    problem = await rejects_async(retry, "INVALID_REQUEST", "Expected a canonical nonzero UUID")
    assert (problem.request_id, problem.outcome, problem.status) == ("not-a-request", "rejected", 400)
    await rejects_async(lambda: client.create_organization(name=7, terms_ref="fixture"), "INVALID_REQUEST")  # type: ignore[arg-type]
    await rejects_async(partial(create_organization, client, "not-a-request"), "INVALID_REQUEST")
    assert storage.reads == []

    with pytest.raises(LookupError, match=exactly("No recovery record exists; do not invent a replacement identity")):
        await client.retry_request(uid())
    assert (storage.reads, storage.writes, authority.requests) == ([MANAGEMENT_KEY], [], [])


async def test_a_client_without_storage_keeps_its_records_in_memory() -> None:
    authority = Authority(settle)
    client = authority.async_management(actor_id=ACTOR)
    assert list(client.recovery_states) == []
    await client.initialize_recovery()
    request_id = uid()
    await create_organization(client, request_id)
    [state] = client.recovery_states
    assert (state.request_id, state.attempt_count, state.resolution_state) == (request_id, 1, "committed")


HTTPS = "Use an HTTPS origin, or explicit loopback HTTP for local development"
POSITIVE = "timeout must be a positive, finite number of seconds"


@pytest.mark.parametrize("client_type", CLIENTS, ids=KINDS)
@pytest.mark.parametrize(
    ("overrides", "error", "message"),
    [
        pytest.param({"base_url": "http://example.com"}, ValueError, HTTPS, id="origin"),
        pytest.param({"timeout": 0}, ValueError, POSITIVE, id="timeout"),
        pytest.param(
            {"recovery_storage": object()},
            TypeError,
            "recovery_storage must provide get_item and set_item",
            id="storage",
        ),
        pytest.param(
            {"async_recovery_storage": {}},
            TypeError,
            "async_recovery_storage must provide get_item and set_item",
            id="async storage",
        ),
        pytest.param({"http_client": object()}, TypeError, "http_client must be an httpx.AsyncClient", id="client"),
    ],
)
async def test_async_options_are_checked_at_construction(
    client_type: type[AsyncConvoHop | AsyncConvoHopManagement],
    overrides: dict[str, Any],
    error: type[Exception],
    message: str,
) -> None:
    with pytest.raises(error, match=exactly(message)):
        client_type(**options(client_type, **overrides))


@pytest.mark.parametrize("client_type", CLIENTS, ids=KINDS)
async def test_a_client_takes_one_kind_of_recovery_storage(
    client_type: type[AsyncConvoHop | AsyncConvoHopManagement],
) -> None:
    storage, async_storage = Storage(), AsyncStorage()
    both = options(client_type, recovery_storage=storage, async_recovery_storage=async_storage)
    with pytest.raises(TypeError, match=exactly("Choose recovery_storage or async_recovery_storage, not both")):
        client_type(**both)
    assert (storage.reads, async_storage.reads) == ([], [])


@pytest.mark.parametrize("client_type", CLIENTS, ids=KINDS)
async def test_a_synchronous_http_client_is_refused(client_type: type[AsyncConvoHop | AsyncConvoHopManagement]) -> None:
    with httpx.Client() as http, pytest.raises(TypeError, match=r"^http_client must be an httpx\.AsyncClient$"):
        client_type(**options(client_type, http_client=http))


async def test_aclose_closes_only_an_http_client_the_sdk_created() -> None:
    authority = Authority()
    http = authority.async_http()
    async with authority.async_project(http_client=http):
        pass
    await authority.async_management(http_client=http).aclose()
    assert not http.is_closed
    await http.aclose()
    for client_type in CLIENTS:
        owned = client_type(**options(client_type))
        async with owned as entered:
            assert entered is owned
            assert not owned._http.is_closed
        assert owned._http.is_closed


async def test_async_clients_keep_credentials_out_of_reprs_pickles_and_problems() -> None:
    def refuse(request: Received) -> httpx.Response:
        raise httpx.ConnectError("connection refused while sending " + request.headers["authorization"])

    authority = Authority(refuse)
    client = authority.async_project(project_id=PROJECT, incarnation=INCARNATION)
    operator = authority.async_management(actor_id=ACTOR)
    assert repr(client) == f"AsyncConvoHop(project_id='{PROJECT}', incarnation='{INCARNATION}')"
    assert repr(operator) == f"AsyncConvoHopManagement(actor_id='{ACTOR}')"
    for value in (client, operator):
        with pytest.raises(TypeError) as pickled:
            pickle.dumps(value)
        assert BACKEND_KEY not in str(pickled.value)
        assert ACCESS_TOKEN not in str(pickled.value)
    problem = await rejects_async(partial(client.get_principal, principal_id=PRINCIPAL), "TRANSPORT_UNKNOWN")
    assert (problem.__cause__, problem.__context__) == (None, None)
    for view in (str(problem), repr(problem), repr(problem.args)):
        assert BACKEND_KEY not in view


# Pages


async def test_async_iterators_follow_page_cursors_until_the_last_page() -> None:
    first, second = uid(), uid()
    pages = {
        None: member_page([member(CONVERSATION, first)], "members-2"),
        "members-2": member_page([member(CONVERSATION, second)], None),
    }
    authority = Authority(lambda request: reply(request, result=pages[request.input.get("cursor")]))
    members = authority.async_project().iter_members(conversation_id=CONVERSATION)
    assert [item.principal_id async for item in members] == [first, second]
    assert [request.input for request in authority.requests] == [
        {"conversationId": CONVERSATION, "limit": 100},
        {"conversationId": CONVERSATION, "limit": 100, "cursor": "members-2"},
    ]


async def test_an_async_iterator_stops_when_the_page_set_changes() -> None:
    first = uid()
    answers = [member_page([member(CONVERSATION, first)], "members-2"), member_page([], None, refresh=True)]
    authority = Authority(lambda request: reply(request, result=answers.pop(0)))
    members: AsyncIterator[Any] = authority.async_project().iter_members(conversation_id=CONVERSATION, limit=1)
    assert (await anext(members)).principal_id == first
    changed = "The page set changed; restart from the first page"
    problem = await rejects_async(partial(anext, members), "RESYNC_REQUIRED", changed)
    assert (problem.outcome, problem.status) == ("rejected", 409)
    assert answers == []
    assert [request.input["limit"] for request in authority.requests] == [1, 1]


# Transport


class Slow(httpx.AsyncByteStream):
    """A response body whose chunks each arrive after ``pause`` seconds."""

    def __init__(self, *chunks: bytes, pause: float) -> None:
        self._chunks = chunks
        self._pause = pause

    async def __aiter__(self) -> AsyncIterator[bytes]:
        for chunk in self._chunks:
            await asyncio.sleep(self._pause)
            yield chunk


async def refuse(request: Received) -> httpx.Response:
    raise httpx.ConnectError("connection refused")


def crash(request: Received) -> httpx.Response:
    raise RuntimeError("transport bug")


@pytest.mark.parametrize(
    ("respond", "expected"),
    [
        pytest.param(refuse, ("TRANSPORT_UNKNOWN", 0, UNAVAILABLE), id="refused"),
        pytest.param(crash, ("TRANSPORT_UNKNOWN", 0, UNAVAILABLE), id="crashed"),
        pytest.param(
            lambda request: httpx.Response(307, headers={"location": ENDPOINT}),
            ("TRANSPORT_UNKNOWN", 0, UNAVAILABLE),
            id="redirected",
        ),
        pytest.param(
            lambda request: httpx.Response(200, stream=Chunks(b'{"data":', error=httpx.ReadError("reset"))),
            ("TRANSPORT_UNKNOWN", 0, INCOMPLETE),
            id="reset",
        ),
        pytest.param(
            lambda request: httpx.Response(200, stream=Slow(b"{", b"}", pause=0.1)),
            ("TRANSPORT_UNKNOWN", 0, INCOMPLETE),
            id="too slow",
        ),
        pytest.param(
            lambda request: httpx.Response(200, content=b" " * (BODY_CAP + 1)),
            ("INVALID_RESPONSE", 200, "Authority response exceeds the bound"),
            id="oversized",
        ),
    ],
)
async def test_async_transport_failures_become_problems_naming_the_request(
    respond: Callable[[Received], httpx.Response | Awaitable[httpx.Response]], expected: tuple[str, int, str]
) -> None:
    authority = Authority(respond)
    client = authority.async_project(timeout=0.05)
    problem = await rejects_async(partial(client.get_principal, principal_id=PRINCIPAL), expected[0], expected[2])
    assert (problem.outcome, problem.status) == ("unknown", expected[1])
    assert problem.request_id == authority.requests[0].request_id
    assert problem.__cause__ is None
    assert len(authority.requests) == 1
