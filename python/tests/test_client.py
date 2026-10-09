"""The synchronous clients: construction, request shape, typed calls, response checks and transport failures."""

from __future__ import annotations

import inspect
import itertools
import json
import pickle
import re
import time
from collections.abc import Callable, Iterator
from functools import partial
from typing import Any

import httpx
import pytest

from convohop import (
    ConvoHop,
    ConvoHopManagement,
    ConvoHopProblem,
    RateLimitedProblem,
    ScopeRequiredProblem,
    __version__,
)
from convohop._engine import BODY_CAP, RESPONSE_BOUND
from convohop._generated.operations import OPERATIONS
from convohop.types import MemberBatchEntryInput, MemberInputInput, SearchScopeInput

from .graphql import (
    ACCESS_TOKEN,
    BACKEND_KEY,
    BASE_URL,
    ENDPOINT,
    Authority,
    Chunks,
    Received,
    Storage,
    UnexpectedRequestError,
    accepted_operation,
    full,
    graphql_error,
    member,
    member_page,
    message,
    now,
    principal,
    rejects,
    reply,
    route_proof,
    uid,
)
from .support import REPOSITORY

PROJECT, INCARNATION, CONVERSATION, PRINCIPAL = uid(), uid(), uid(), uid()
MEMBER, DEVICE, SESSION, MESSAGE, LIVE_SESSION, OPERATION, REQUEST = (uid() for _ in range(7))
BEYOND_SAFE = "9007199254740993"
INVALID_UUID = "Expected a canonical UUID"

ANNOTATIONS: dict[str, Any] = json.loads((REPOSITORY / "schema" / "annotations.json").read_text("utf-8"))
IR_SCOPES = {scope["name"] for scope in json.loads((REPOSITORY / "schema" / "ir.json").read_text("utf-8"))["scopes"]}
# Backend-key operations, each with its alternative scope sets; every scope in one set is required.
BACKEND_SCOPES: dict[str, list[list[str]]] = {
    key: alternatives
    for key, operation in ANNOTATIONS["operations"].items()
    if (alternatives := [entry.get("scopes", []) for entry in operation["auth"] if entry["credential"] == "backendKey"])
}

Call = Callable[[ConvoHop], object]

# One public call per backend-key operation, with the exact generated input it must send.
CALLS: list[tuple[str, Call, dict[str, Any] | None]] = [
    ("communication.capabilities", lambda client: client.capabilities(), None),
    ("communication.route", lambda client: client.route(), None),
    ("communication.resolveRequest", lambda client: client.resolve_request(request_id=REQUEST), {"requestId": REQUEST}),
    (
        "communication.getOperation",
        lambda client: client.get_operation(operation_id=OPERATION),
        {"operationId": OPERATION},
    ),
    (
        "communication.getPrincipal",
        lambda client: client.get_principal(principal_id=PRINCIPAL),
        {"principalId": PRINCIPAL},
    ),
    (
        "communication.createPrincipal",
        lambda client: client.create_principal(external_user_id="fixture-user"),
        {"externalUserId": "fixture-user"},
    ),
    (
        "communication.disablePrincipal",
        lambda client: client.disable_principal(principal_id=PRINCIPAL, expected_revision=BEYOND_SAFE),
        {"principalId": PRINCIPAL, "expectedRevision": BEYOND_SAFE},
    ),
    (
        "communication.issueSession",
        lambda client: client.issue_session(principal_id=PRINCIPAL, device_id=DEVICE, requested_ttl_ms="900000"),
        {"principalId": PRINCIPAL, "deviceId": DEVICE, "requestedTtlMs": "900000"},
    ),
    (
        "communication.renewSession",
        lambda client: client.renew_session(
            session_id=SESSION,
            principal_id=PRINCIPAL,
            device_id=DEVICE,
            expected_revision="4",
            requested_ttl_ms="60000",
        ),
        {
            "sessionId": SESSION,
            "principalId": PRINCIPAL,
            "deviceId": DEVICE,
            "expectedRevision": "4",
            "requestedTtlMs": "60000",
        },
    ),
    (
        "communication.revokeSession",
        lambda client: client.revoke_session(session_id=SESSION, expected_revision="5"),
        {"sessionId": SESSION, "expectedRevision": "5"},
    ),
    (
        "communication.sessionRequestOutcome",
        lambda client: client.session_request_outcome(request_id=REQUEST),
        {"requestId": REQUEST},
    ),
    (
        "communication.createConversation",
        lambda client: client.create_conversation(
            title="Fixture", props={"topic": "a"}, members=[MemberInputInput(principal_id=PRINCIPAL, role="moderator")]
        ),
        {"title": "Fixture", "props": {"topic": "a"}, "members": [{"principalId": PRINCIPAL, "role": "moderator"}]},
    ),
    (
        "communication.getConversation",
        lambda client: client.get_conversation(conversation_id=CONVERSATION),
        {"conversationId": CONVERSATION},
    ),
    (
        "communication.updateConversation",
        lambda client: client.update_conversation(conversation_id=CONVERSATION, expected_revision="2", title="Renamed"),
        {"conversationId": CONVERSATION, "expectedRevision": "2", "title": "Renamed"},
    ),
    (
        "communication.members",
        lambda client: client.members(conversation_id=CONVERSATION, cursor="members-1", limit=5),
        {"conversationId": CONVERSATION, "limit": 5, "cursor": "members-1"},
    ),
    (
        "communication.addMember",
        lambda client: client.add_member(
            conversation_id=CONVERSATION, principal_id=MEMBER, role="member", expected_revision="0"
        ),
        {"conversationId": CONVERSATION, "principalId": MEMBER, "role": "member", "expectedRevision": "0"},
    ),
    (
        "communication.addMembers",
        lambda client: client.add_members(
            conversation_id=CONVERSATION,
            members=[MemberBatchEntryInput(principal_id=MEMBER, role="moderator", expected_revision="1")],
        ),
        {
            "conversationId": CONVERSATION,
            "members": [{"principalId": MEMBER, "role": "moderator", "expectedRevision": "1"}],
        },
    ),
    (
        "communication.removeMember",
        lambda client: client.remove_member(conversation_id=CONVERSATION, principal_id=MEMBER, expected_revision="3"),
        {"conversationId": CONVERSATION, "principalId": MEMBER, "expectedRevision": "3"},
    ),
    (
        "communication.setBroadcastPermission",
        lambda client: client.set_broadcast_permission(
            conversation_id=CONVERSATION, principal_id=MEMBER, allowed=False, expected_membership_revision="3"
        ),
        {"conversationId": CONVERSATION, "principalId": MEMBER, "allowed": False, "expectedMembershipRevision": "3"},
    ),
    (
        "communication.conversationMute",
        lambda client: client.conversation_mute(conversation_id=CONVERSATION, act_as_principal_id=MEMBER),
        {"conversationId": CONVERSATION, "actAsPrincipalId": MEMBER},
    ),
    (
        "communication.setConversationMute",
        lambda client: client.set_conversation_mute(
            conversation_id=CONVERSATION, muted=True, until="2030-01-01T00:00:00Z", act_as_principal_id=MEMBER
        ),
        {"conversationId": CONVERSATION, "muted": True, "until": "2030-01-01T00:00:00Z", "actAsPrincipalId": MEMBER},
    ),
    (
        "communication.historyGrant",
        lambda client: client.history_grant(
            conversation_id=CONVERSATION,
            principal_id=MEMBER,
            expected_revision="3",
            membership_epoch="2",
            from_sequence=BEYOND_SAFE,
        ),
        {
            "conversationId": CONVERSATION,
            "principalId": MEMBER,
            "expectedRevision": "3",
            "membershipEpoch": "2",
            "fromSequence": BEYOND_SAFE,
        },
    ),
    (
        "communication.messages",
        lambda client: client.messages(
            conversation_id=CONVERSATION, act_as_principal_id=MEMBER, before_sequence=BEYOND_SAFE, limit=3
        ),
        {"conversationId": CONVERSATION, "limit": 3, "actAsPrincipalId": MEMBER, "beforeSequence": BEYOND_SAFE},
    ),
    (
        "communication.getMessage",
        lambda client: client.get_message(conversation_id=CONVERSATION, message_id=MESSAGE, act_as_principal_id=MEMBER),
        {"conversationId": CONVERSATION, "messageId": MESSAGE, "actAsPrincipalId": MEMBER},
    ),
    (
        "communication.sendMessage",
        lambda client: client.send_message(
            conversation_id=CONVERSATION, text="Hello", props={}, act_as_principal_id=MEMBER
        ),
        {"conversationId": CONVERSATION, "text": "Hello", "props": {}, "actAsPrincipalId": MEMBER},
    ),
    (
        "communication.editMessage",
        lambda client: client.edit_message(
            conversation_id=CONVERSATION, message_id=MESSAGE, expected_revision="1", text="Edited"
        ),
        {"conversationId": CONVERSATION, "messageId": MESSAGE, "expectedRevision": "1", "text": "Edited"},
    ),
    (
        "communication.deleteMessage",
        lambda client: client.delete_message(conversation_id=CONVERSATION, message_id=MESSAGE, expected_revision="2"),
        {"conversationId": CONVERSATION, "messageId": MESSAGE, "expectedRevision": "2"},
    ),
    (
        "communication.inbox",
        lambda client: client.inbox(act_as_principal_id=MEMBER, cursor="inbox-1", limit=9),
        {"limit": 9, "cursor": "inbox-1", "actAsPrincipalId": MEMBER},
    ),
    (
        "communication.search",
        lambda client: client.search(
            query="hello", scope=SearchScopeInput(conversation_ids=[CONVERSATION]), page_size=7
        ),
        {"query": "hello", "pageSize": 7, "scope": {"conversationIds": [CONVERSATION]}},
    ),
    (
        "communication.currentLiveSession",
        lambda client: client.current_live_session(conversation_id=CONVERSATION),
        {"conversationId": CONVERSATION},
    ),
    (
        "communication.liveSessions",
        lambda client: client.live_sessions(conversation_id=CONVERSATION, limit=4),
        {"conversationId": CONVERSATION, "limit": 4},
    ),
    (
        "communication.liveSession",
        lambda client: client.live_session(live_session_id=LIVE_SESSION),
        {"liveSessionId": LIVE_SESSION},
    ),
    (
        "communication.liveSessionParticipants",
        lambda client: client.live_session_participants(live_session_id=LIVE_SESSION, cursor="participants-1"),
        {"liveSessionId": LIVE_SESSION, "cursor": "participants-1"},
    ),
    (
        "communication.alertLiveSession",
        lambda client: client.alert_live_session(
            live_session_id=LIVE_SESSION, expected_generation="1", principal_ids=[MEMBER]
        ),
        {"liveSessionId": LIVE_SESSION, "expectedGeneration": "1", "principalIds": [MEMBER]},
    ),
    (
        "communication.endLiveSession",
        lambda client: client.end_live_session(
            live_session_id=LIVE_SESSION, expected_generation="1", expected_revision="6"
        ),
        {"liveSessionId": LIVE_SESSION, "expectedGeneration": "1", "expectedRevision": "6"},
    ),
    (
        "communication.liveSessionOperation",
        lambda client: client.live_session_operation(operation_id=OPERATION),
        {"operationId": OPERATION},
    ),
]


def scope_of(key: str) -> str | None:
    """The first scope of an operation's first backend-key alternative, if it needs one."""
    first = BACKEND_SCOPES[key][0]
    return first[0] if first else None


def scoped_rejection(request: Received) -> httpx.Response:
    scope = scope_of(request.key)
    if scope is None:
        return graphql_error(request, "RATE_LIMITED", 429, "Rate limited", retryAfter=2)
    return graphql_error(request, "SCOPE_REQUIRED", 403, f"The backend key requires the current {scope} scope")


# Construction


def test_every_backend_key_operation_has_exactly_one_typed_call() -> None:
    keys = [key for key, _, _ in CALLS]
    assert len(set(keys)) == len(keys)
    assert sorted(keys) == sorted(BACKEND_SCOPES)
    for key, alternatives in BACKEND_SCOPES.items():
        for scope in itertools.chain.from_iterable(alternatives):
            assert scope in IR_SCOPES, f"{key}: unknown scope {scope}"


def test_call_reads_accept_call_read_or_call_manage_as_the_docstrings_document() -> None:
    for key in (
        "communication.currentLiveSession",
        "communication.liveSession",
        "communication.liveSessions",
        "communication.liveSessionParticipants",
        "communication.liveSessionOperation",
    ):
        assert BACKEND_SCOPES[key] == [["callRead"], ["callManage"]], key
    for key in ("communication.alertLiveSession", "communication.endLiveSession"):
        assert BACKEND_SCOPES[key] == [["callManage"]], key
    for key, alternatives in BACKEND_SCOPES.items():
        method = re.sub(r"(?<!^)(?=[A-Z])", "_", OPERATIONS[key].field).lower()
        documentation = inspect.getdoc(getattr(ConvoHop, method)) or ""
        authorization = documentation.partition("Authorization")[2].partition("Idempotency:")[0]
        assert "``backendKey``" in authorization, key
        for scope in itertools.chain.from_iterable(alternatives):
            assert f"``{scope}``" in authorization, key


@pytest.mark.parametrize(("key", "call", "expected"), CALLS, ids=[key for key, _, _ in CALLS])
def test_each_backend_key_call_sends_its_exact_input_and_surfaces_typed_problems(
    key: str, call: Call, expected: dict[str, Any] | None
) -> None:
    authority = Authority(scoped_rejection)
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION)
    with pytest.raises(ConvoHopProblem) as caught:
        call(client)
    error = caught.value
    assert authority.keys == [key]
    assert authority.requests[0].input == expected
    assert error.request_id == authority.requests[0].request_id
    assert BACKEND_KEY not in str(error)
    assert BACKEND_KEY not in repr(error)
    scope = scope_of(key)
    if scope is None:
        assert type(error) is RateLimitedProblem
        assert (error.code, error.retry_after) == ("RATE_LIMITED", 2)
    else:
        assert isinstance(error, ScopeRequiredProblem)
        assert type(error) is ScopeRequiredProblem
        assert (error.code, error.status, error.outcome, error.scope) == ("SCOPE_REQUIRED", 403, "rejected", scope)


def project_options(**options: Any) -> dict[str, Any]:
    defaults = {"base_url": BASE_URL, "backend_key": BACKEND_KEY, "project_id": PROJECT, "incarnation": INCARNATION}
    return defaults | options


VISIBLE = "1 to 4096 visible ASCII characters"
CANONICAL = "must be a canonical lowercase, nonzero UUID"
HTTPS = "Use an HTTPS origin, or explicit loopback HTTP for local development"


@pytest.mark.parametrize(
    ("options", "error", "message"),
    [
        ({"base_url": None}, TypeError, "base_url must be a string"),
        ({"base_url": "http://example.com"}, ValueError, HTTPS),
        ({"base_url": "https://example.com/graphql"}, ValueError, HTTPS),
        ({"base_url": "https://user:secret@example.com"}, ValueError, HTTPS),
        ({"base_url": "https://example.com?x=1"}, ValueError, HTTPS),
        ({"project_id": None}, TypeError, "project_id must be a string"),
        ({"project_id": PROJECT.upper()}, ValueError, "project_id " + CANONICAL),
        ({"project_id": "00000000-0000-0000-0000-000000000000"}, ValueError, "project_id " + CANONICAL),
        ({"incarnation": "current"}, ValueError, "incarnation " + CANONICAL),
        ({"backend_key": b"key"}, TypeError, "backend_key must be a string"),
        ({"backend_key": ""}, ValueError, "backend_key must be " + VISIBLE),
        ({"backend_key": "has space"}, ValueError, "backend_key must be " + VISIBLE),
        ({"backend_key": "x" * 4097}, ValueError, "backend_key must be " + VISIBLE),
        ({"backend_key": "line\nbreak"}, ValueError, "backend_key must be " + VISIBLE),
        ({"timeout": True}, TypeError, "timeout must be a number of seconds"),
        ({"timeout": "5"}, TypeError, "timeout must be a number of seconds"),
        ({"timeout": 0}, ValueError, "timeout must be a positive, finite number of seconds"),
        ({"timeout": -1.0}, ValueError, "timeout must be a positive, finite number of seconds"),
        ({"timeout": float("inf")}, ValueError, "timeout must be a positive, finite number of seconds"),
        ({"timeout": float("nan")}, ValueError, "timeout must be a positive, finite number of seconds"),
        ({"recovery_storage": object()}, TypeError, "recovery_storage must provide get_item and set_item"),
        ({"http_client": object()}, TypeError, "http_client must be an httpx.Client"),
    ],
)
def test_project_options_are_checked_at_construction(
    options: dict[str, Any], error: type[Exception], message: str
) -> None:
    with pytest.raises(error) as caught:
        ConvoHop(**project_options(**options))
    assert str(caught.value) == message
    assert "secret" not in str(caught.value)


@pytest.mark.anyio
async def test_an_async_http_client_is_refused_by_the_sync_client() -> None:
    async with httpx.AsyncClient() as http:
        with pytest.raises(TypeError, match=r"^http_client must be an httpx\.Client$"):
            ConvoHop(**project_options(http_client=http))


@pytest.mark.parametrize(
    ("options", "error", "message"),
    [
        ({"actor_id": "operator"}, ValueError, "actor_id " + CANONICAL),
        ({"actor_id": 7}, TypeError, "actor_id must be a string"),
        ({"access_token": None}, TypeError, "access_token must be a string"),
        ({"access_token": "with space"}, ValueError, "access_token must be " + VISIBLE),
        ({"base_url": "ftp://example.com"}, ValueError, HTTPS),
        ({"recovery_storage": {}}, TypeError, "recovery_storage must provide get_item and set_item"),
    ],
)
def test_management_options_are_checked_at_construction(
    options: dict[str, Any], error: type[Exception], message: str
) -> None:
    defaults = {"base_url": BASE_URL, "access_token": ACCESS_TOKEN, "actor_id": uid()}
    with pytest.raises(error) as caught:
        ConvoHopManagement(**(defaults | options))
    assert str(caught.value) == message


def test_loopback_http_and_https_origins_are_accepted() -> None:
    for base_url in ("https://api.example.com", "https://api.example.com/", "http://localhost:8080", "http://[::1]:1"):
        with ConvoHop(**project_options(base_url=base_url)) as client:
            assert client.project_id == PROJECT


def test_credentials_never_appear_in_reprs_pickles_or_problems() -> None:
    def refuse(request: Received) -> httpx.Response:
        raise httpx.ConnectError("connection refused while sending " + request.headers["authorization"])

    authority = Authority(refuse)
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION)
    management = authority.management()
    assert repr(client) == f"ConvoHop(project_id='{PROJECT}', incarnation='{INCARNATION}')"
    assert repr(management) == f"ConvoHopManagement(actor_id='{management.actor_id}')"
    for value in (client, management):
        with pytest.raises(TypeError) as pickled:
            pickle.dumps(value)
        assert BACKEND_KEY not in str(pickled.value)
        assert ACCESS_TOKEN not in str(pickled.value)
    problem = rejects(lambda: client.capabilities(), "TRANSPORT_UNKNOWN")
    assert problem.__cause__ is None
    assert problem.__context__ is None
    for view in (str(problem), repr(problem), repr(problem.args)):
        assert BACKEND_KEY not in view
    with pytest.raises(ValueError, match="visible ASCII") as invalid:
        authority.project(backend_key="fixture secret with spaces")
    assert "fixture secret" not in str(invalid.value)


def test_close_closes_only_an_http_client_the_sdk_created() -> None:
    authority = Authority()
    http = authority.http()
    with authority.project(http_client=http):
        pass
    assert not http.is_closed
    http.close()
    owned = ConvoHop(**project_options())
    with owned:
        assert not owned._http.is_closed
    assert owned._http.is_closed


# Request shape


def test_requests_carry_the_bearer_key_project_context_and_generated_document() -> None:
    authority = Authority(lambda request: reply(request, result=principal(PRINCIPAL)))
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION)
    created = client.create_principal(external_user_id="fixture-user", request_id=REQUEST)
    assert (created.principal_id, created.revision) == (PRINCIPAL, "1")
    [request] = authority.requests
    assert request.url == ENDPOINT
    assert request.headers["authorization"] == "Bearer " + BACKEND_KEY
    assert request.headers["content-type"] == "application/json"
    assert request.headers["accept"] == "application/json"
    assert request.headers["accept-encoding"] == "identity"
    assert request.headers["user-agent"] == f"convohop-python/{__version__}"
    operation = OPERATIONS["communication.createPrincipal"]
    assert request.body == {
        "query": operation.document,
        "operationName": "CommunicationCreatePrincipal",
        "variables": {
            "context": {"requestId": REQUEST, "projectId": PROJECT, "incarnation": INCARNATION},
            "input": {"externalUserId": "fixture-user"},
        },
    }
    # The body is canonical JSON: sorted keys and no insignificant whitespace.
    assert request.content == json.dumps(request.body, sort_keys=True, separators=(",", ":")).encode()


def test_defaults_of_a_supplied_http_client_never_reach_the_authority() -> None:
    authority = Authority(lambda request: reply(request, result=principal(PRINCIPAL)))
    http = httpx.Client(
        transport=httpx.MockTransport(authority._handle),
        headers={"x-tenant": "leaked", "authorization": "Bearer leaked"},
        cookies={"session": "leaked"},
        params={"debug": "1"},
        auth=("user", "leaked"),
    )
    with http:
        client = authority.project(http_client=http)
        client.get_principal(principal_id=PRINCIPAL)
    [request] = authority.requests
    assert request.url == ENDPOINT
    assert "x-tenant" not in request.headers
    assert "cookie" not in request.headers
    assert request.headers["authorization"] == "Bearer " + BACKEND_KEY


def test_management_requests_carry_only_the_request_identity() -> None:
    organization = {"orgId": uid(), "name": "original", "status": "active", "revision": "1"}
    authority = Authority(lambda request: reply(request, result=full("Organization", organization)))
    client = authority.management()
    assert client.create_organization(name="original", terms_ref="fixture").to_dict() == organization
    [request] = authority.requests
    assert request.context == {"requestId": request.request_id}
    assert request.headers["authorization"] == "Bearer " + ACCESS_TOKEN
    assert request.input == {"name": "original", "termsRef": "fixture"}


def test_a_client_refuses_operations_of_the_other_plane_and_unknown_fields() -> None:
    authority = Authority()
    client = authority.project()
    management = authority.management()
    plane = "This client cannot send operations of that plane"
    rejects(
        lambda: client._invoke(OPERATIONS["management.getProject"], {"projectId": PROJECT}, None),
        "INVALID_REQUEST",
        plane,
    )
    rejects(lambda: management._invoke(OPERATIONS["communication.capabilities"], None, None), "INVALID_REQUEST", plane)
    unknown = {
        "conversationId": CONVERSATION,
        "messageId": MESSAGE,
        "expectedRevision": "1",
        "actAsPrincipalId": MEMBER,
    }
    problem = rejects(
        lambda: client._invoke(OPERATIONS["communication.editMessage"], unknown, None),
        "INVALID_REQUEST",
        "Unknown GraphQL input field",
    )
    assert (problem.outcome, problem.status) == ("rejected", 400)
    rejects(
        lambda: client._invoke(OPERATIONS["communication.capabilities"], {"x": 1}, None),
        "INVALID_REQUEST",
        "Unknown GraphQL input field",
    )
    assert authority.requests == []


# Typed calls


def test_onboarding_records_the_serving_epoch_and_never_stores_session_tokens() -> None:
    expires = now()
    session = full(
        "Session",
        {
            "sessionId": SESSION,
            "principalId": PRINCIPAL,
            "deviceId": DEVICE,
            "incarnation": INCARNATION,
            "sessionRevision": "1",
            "expiresAt": expires,
            "status": "active",
        },
    )
    issued = {"session": session, "sessionToken": "fixture-user-session", "tokenExpiresAt": expires}
    conversation = {"conversationId": CONVERSATION, "revision": "1", "title": "Support", "props": {}}

    def respond(request: Received) -> httpx.Response:
        assert (request.context["projectId"], request.context["incarnation"]) == (PROJECT, INCARNATION)
        match request.key:
            case "communication.route":
                return reply(request, result=route_proof(PROJECT, INCARNATION))
            case "communication.createPrincipal":
                return reply(request, result=principal(PRINCIPAL, externalUserId="authenticated-account"))
            case "communication.issueSession":
                return reply(request, result=issued)
            case "communication.createConversation":
                return reply(request, result=full("Conversation", conversation | {"latestSequence": "1"}))
        raise UnexpectedRequestError(request.key)

    storage = Storage()
    authority = Authority(respond)
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION, recovery_storage=storage)
    epochs = [client.serving_epoch]
    client.initialize()
    epochs.append(client.serving_epoch)
    assert epochs == [None, "2"]
    assert client.create_principal(external_user_id="authenticated-account").principal_id == PRINCIPAL
    assert client.issue_session(principal_id=PRINCIPAL, device_id=DEVICE, requested_ttl_ms="900000").to_dict() == issued
    members = [MemberInputInput(principal_id=PRINCIPAL, role="member")]
    assert client.create_conversation(title="Support", props={}, members=members).conversation_id == CONVERSATION
    assert authority.requests[2].input == {"principalId": PRINCIPAL, "deviceId": DEVICE, "requestedTtlMs": "900000"}
    assert "observedServingEpoch" not in authority.requests[0].context
    assert all(request.context["observedServingEpoch"] == "2" for request in authority.requests[1:])
    assert "fixture-user-session" not in repr(client.recovery_states)
    assert storage.writes
    for _, value in storage.writes:
        assert "fixture-user-session" not in value
        assert BACKEND_KEY not in value


@pytest.mark.parametrize(
    ("change", "code", "status", "message"),
    [
        ({"projectId": uid()}, "INVALID_RESPONSE", 503, "Route does not match the project"),
        (
            {"incarnation": uid()},
            "INCARNATION_MISMATCH",
            409,
            "Project incarnation changed; explicit recovery required",
        ),
        ({"servingEpoch": 2}, "INVALID_RESPONSE", 503, "Malformed route serving epoch"),
        ({"servingEpoch": "02"}, "INVALID_RESPONSE", 503, "Malformed route serving epoch"),
    ],
)
def test_initialize_rejects_a_route_for_another_project_or_incarnation(
    change: dict[str, Any], code: str, status: int, message: str
) -> None:
    proof = route_proof(PROJECT, INCARNATION) | change
    authority = Authority(lambda request: reply(request, result=proof))
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION)
    problem = rejects(client.initialize, code, message)
    assert problem.status == status
    assert client.serving_epoch is None


def test_route_returns_the_signed_proof_unchanged() -> None:
    # The IR makes SignedProof opaque on the way in; its constraints apply only when a client sends one back.
    proof = route_proof(PROJECT, INCARNATION, "7") | {"signature": None, "extension": {"nested": [1, "two"]}}
    client = Authority(lambda request: reply(request, result=proof)).project(
        project_id=PROJECT, incarnation=INCARNATION
    )
    assert client.route() == proof
    assert client.serving_epoch is None


def test_broadcast_permission_is_granted_through_the_generated_backend_operation() -> None:
    granted = member(CONVERSATION, PRINCIPAL, revision="2", canStartBroadcast=True)
    authority = Authority(lambda request: reply(request, result={"member": granted, "mediaCutoff": None}))
    client = authority.project()
    changed = client.set_broadcast_permission(
        conversation_id=CONVERSATION,
        principal_id=PRINCIPAL,
        allowed=True,
        expected_membership_revision="1",
        request_id=REQUEST,
    )
    assert (changed.member.role, changed.member.can_start_broadcast, changed.media_cutoff) == ("member", True, None)
    [request] = authority.requests
    assert request.body["operationName"] == "CommunicationSetBroadcastPermission"
    assert request.request_id == REQUEST
    assert request.input == {
        "conversationId": CONVERSATION,
        "principalId": PRINCIPAL,
        "allowed": True,
        "expectedMembershipRevision": "1",
    }


def test_act_as_search_scope_and_page_bounds_are_checked_before_sending() -> None:
    empty = full("SearchPage", {"items": [], "complete": True, "refreshRequired": False})
    authority = Authority(lambda request: reply(request, result=empty))
    client = authority.project()
    bounds = "PageSize is out of range (limit)"
    scope_required = "Search conversationIds must name at least one conversation"
    nobody = SearchScopeInput(conversation_ids=[])
    cases: list[tuple[Callable[[], object], str]] = [
        (lambda: client.inbox(), "The inbox requires actAsPrincipalId"),
        (lambda: client.search(query="hello"), "Backend search requires actAsPrincipalId or conversationIds"),
        (lambda: client.search(query="hello", scope=nobody), scope_required),
        (lambda: client.search(query="hello", scope=nobody, act_as_principal_id=MEMBER), scope_required),
        (lambda: client.search(query="hello", act_as_principal_id="not-a-uuid"), f"{INVALID_UUID} (actAsPrincipalId)"),
        (
            lambda: client.send_message(conversation_id=CONVERSATION, text="x", props={}, act_as_principal_id="nobody"),
            f"{INVALID_UUID} (actAsPrincipalId)",
        ),
        (lambda: client.messages(conversation_id=CONVERSATION, limit=0), bounds),
        (lambda: client.inbox(act_as_principal_id=MEMBER, limit=101), bounds),
        (
            lambda: client.live_session_participants(live_session_id=LIVE_SESSION, limit=1.5),  # type: ignore[arg-type]
            "Expected safe GraphQL integer (limit)",
        ),
        (
            lambda: client.add_member(
                conversation_id=CONVERSATION, principal_id=MEMBER, role="owner", expected_revision="0"
            ),
            "Invalid membership role",
        ),
        (lambda: client.get_conversation(conversation_id="not-a-uuid"), f"{INVALID_UUID} (conversationId)"),
        (
            lambda: client.disable_principal(principal_id=PRINCIPAL, expected_revision="01"),
            "Invalid GraphQL decimal (expectedRevision)",
        ),
        (
            lambda: client.send_message(conversation_id=CONVERSATION, text="x", props=[]),  # type: ignore[arg-type]
            "Expected a GraphQL Properties object (props)",
        ),
        (
            lambda: client.send_message(conversation_id=CONVERSATION, text="x", props={"blob": "x" * 8192}),
            "Properties exceeds 8192 canonical JSON bytes (props)",
        ),
    ]
    for call, expected in cases:
        problem = rejects(call, "INVALID_REQUEST", expected)
        assert (problem.outcome, problem.status) == ("rejected", 400)
    assert authority.requests == []

    page = client.search(query="hello", act_as_principal_id=MEMBER)
    assert page.items == ()
    assert [request.input for request in authority.requests] == [
        {"query": "hello", "pageSize": 100, "actAsPrincipalId": MEMBER}
    ]


def test_results_that_do_not_match_the_request_are_rejected_rather_than_returned() -> None:
    other = uid()
    cursor = {"incarnation": INCARNATION}
    expires = now()

    def respond(request: Received) -> httpx.Response:
        data = request.input
        match request.key:
            case "communication.sendMessage":
                scope = full("Cursor", cursor | {"conversationId": CONVERSATION, "sequence": "7"})
                ack = {"messageId": MESSAGE, "conversationId": CONVERSATION, "sequence": "7", "revision": "1"}
                return reply(request, result=full("MessageAck", ack | {"status": "sent", "cursor": scope}))
            case "communication.messages":
                page = {"items": [message(other)], "complete": True, "refreshRequired": False}
                return reply(request, result=full("MessagePage", page))
            case "communication.search":
                hit = {"conversationId": other, "message": message(other)}
                return reply(
                    request, result=full("SearchPage", {"items": [hit], "complete": True, "refreshRequired": False})
                )
            case "communication.createPrincipal":
                return reply(request, result=principal(PRINCIPAL, externalUserId="someone-else"))
            case "communication.getConversation":
                values = {
                    "conversationId": other,
                    "revision": "1",
                    "title": "Other",
                    "props": {},
                    "latestSequence": "1",
                }
                return reply(request, result=full("Conversation", values))
            case "communication.issueSession":
                session = {"sessionId": SESSION, "principalId": other, "deviceId": data["deviceId"]}
                session |= {
                    "incarnation": INCARNATION,
                    "sessionRevision": "1",
                    "expiresAt": expires,
                    "status": "active",
                }
                bootstrap = {"session": full("Session", session), "sessionToken": "fixture-session"}
                bootstrap["tokenExpiresAt"] = expires
                return reply(request, result=full("SessionBootstrap", bootstrap))
            case "communication.addMembers":
                return reply(request, result={"items": []})
            case "communication.setBroadcastPermission":
                return reply(request, result={"member": member(CONVERSATION, other), "mediaCutoff": None})
            case "communication.endLiveSession":
                scope = {"kind": "GENERATION", "liveSessionId": other, "generation": "1"}
                cutoff = full("LiveMediaCutoff", {"state": "PENDING", "scope": full("LiveCutoffScope", scope)})
                ended = {"liveSessionId": other, "operationId": OPERATION, "mediaCutoff": cutoff}
                return reply(request, operation=accepted_operation("communication"), result=ended)
            case "communication.inbox":
                item = {"conversationId": CONVERSATION, "title": "Inbox", "visibilityEpoch": "1", "hasUnread": True}
                item |= {"latestVisibleMessage": message(other)}
                inbox = {"items": [full("InboxItem", item)], "complete": True, "refreshRequired": False}
                return reply(request, result=full("InboxPage", inbox))
        raise UnexpectedRequestError(request.key)

    authority = Authority(respond)
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION)
    receipt = client.send_message(conversation_id=CONVERSATION, text="Hello", props={}, act_as_principal_id=MEMBER)
    assert receipt.cursor is not None
    assert receipt.cursor.to_dict() == {"incarnation": INCARNATION, "conversationId": CONVERSATION, "sequence": "7"}
    cursor["incarnation"] = uid()
    batch = [MemberBatchEntryInput(principal_id=MEMBER, role="member", expected_revision="1")]
    cases: list[tuple[Callable[[], object], str]] = [
        (
            lambda: client.send_message(conversation_id=CONVERSATION, text="Hello", props={}),
            "Invalid send receipt scope",
        ),
        (lambda: client.messages(conversation_id=CONVERSATION), "Message page does not match the request"),
        (
            lambda: client.search(query="hello", scope=SearchScopeInput(conversation_ids=[CONVERSATION])),
            "Search hit does not match the request",
        ),
        (lambda: client.create_principal(external_user_id="fixture-user"), "Principal does not match the request"),
        (lambda: client.get_conversation(conversation_id=CONVERSATION), "Conversation does not match the request"),
        (
            lambda: client.issue_session(principal_id=PRINCIPAL, device_id=DEVICE, requested_ttl_ms="60000"),
            "Session does not match the request",
        ),
        (
            lambda: client.add_members(conversation_id=CONVERSATION, members=batch),
            "Membership batch does not match the request",
        ),
        (
            lambda: client.set_broadcast_permission(
                conversation_id=CONVERSATION, principal_id=MEMBER, allowed=True, expected_membership_revision="1"
            ),
            "Member does not match the request",
        ),
        (
            lambda: client.end_live_session(
                live_session_id=LIVE_SESSION, expected_generation="1", expected_revision="6"
            ),
            "Live end receipt does not match the request",
        ),
        (lambda: client.inbox(act_as_principal_id=MEMBER), "Inbox item does not match the request"),
    ]
    for call, expected in cases:
        problem = rejects(call, "INVALID_RESPONSE", expected)
        assert (problem.outcome, problem.status) == ("unknown", 503)
        assert problem.request_id == authority.requests[-1].request_id
    assert len(authority.requests) == len(cases) + 1


def test_member_mutes_act_as_the_member_and_reject_a_result_for_anyone_else() -> None:
    muted: dict[str, Any] = {"conversationId": CONVERSATION, "principalId": MEMBER, "muted": True}
    muted["until"] = "2030-01-01T00:00:00Z"
    answers = [muted, muted | {"muted": False, "until": None}, muted | {"principalId": PRINCIPAL}]
    authority = Authority(lambda request: reply(request, result=full("ConversationMute", answers.pop(0))))
    client = authority.project()
    rejects(
        lambda: client.set_conversation_mute(conversation_id=CONVERSATION, muted="yes", act_as_principal_id=MEMBER),  # type: ignore[arg-type]
        "INVALID_REQUEST",
        "Expected GraphQL boolean (muted)",
    )
    rejects(
        lambda: client.set_conversation_mute(conversation_id=CONVERSATION, muted=False, act_as_principal_id="nobody"),
        "INVALID_REQUEST",
    )
    rejects(
        lambda: client.conversation_mute(conversation_id=CONVERSATION, act_as_principal_id="nobody"), "INVALID_REQUEST"
    )
    assert authority.requests == []

    first = client.set_conversation_mute(
        conversation_id=CONVERSATION, muted=True, until=muted["until"], act_as_principal_id=MEMBER, request_id=REQUEST
    )
    assert first.to_dict() == muted
    second = client.set_conversation_mute(conversation_id=CONVERSATION, muted=False, act_as_principal_id=MEMBER)
    assert second.to_dict() == muted | {"muted": False, "until": None}
    rejects(
        lambda: client.conversation_mute(conversation_id=CONVERSATION, act_as_principal_id=MEMBER),
        "INVALID_RESPONSE",
        "Mute does not match the request",
    )
    assert [(request.key, request.input) for request in authority.requests] == [
        (
            "communication.setConversationMute",
            {"conversationId": CONVERSATION, "muted": True, "until": muted["until"], "actAsPrincipalId": MEMBER},
        ),
        (
            "communication.setConversationMute",
            {"conversationId": CONVERSATION, "muted": False, "actAsPrincipalId": MEMBER},
        ),
        ("communication.conversationMute", {"conversationId": CONVERSATION, "actAsPrincipalId": MEMBER}),
    ]
    assert authority.requests[0].request_id == REQUEST


def live_cutoff(state: str) -> dict[str, Any]:
    scope = full("LiveCutoffScope", {"kind": "GENERATION", "liveSessionId": LIVE_SESSION, "generation": "1"})
    cutoff = {"state": state, "scope": scope, "operationId": OPERATION}
    return full("LiveMediaCutoff", cutoff | {"enforcedAt": now() if state == "ENFORCED" else None})


def live_operation(state: str, **fields: Any) -> dict[str, Any]:
    values = {"operationId": OPERATION, "requestId": REQUEST, "liveSessionId": LIVE_SESSION, "kind": "END"}
    return full("LiveSessionOperation", values | {"state": state, "revision": "7", "requestedAt": now()} | fields)


def test_ending_a_live_session_completes_only_with_an_enforced_media_cutoff() -> None:
    fields: dict[str, Any] = {"liveSessionId": LIVE_SESSION, "generation": "1", "state": "ENDED", "revision": "8"}
    completion = full("LiveSessionOperationCompletion", fields | {"completedAt": now()})
    enforced = completion | {"mediaCutoff": live_cutoff("ENFORCED")}
    failure = full("LiveOperationFailure", {"code": "LIVE_SESSION_CLOSED", "message": "The live session already ended"})
    done = {"completedAt": now()}
    answers = [
        live_operation("RUNNING"),
        live_operation("COMPLETED", **done, completion=enforced),
        live_operation("COMPLETED", **done, kind="START", completion=completion),
        live_operation("FAILED", **done, failure=failure),
    ]
    malformed = [
        (live_operation("COMPLETED", **done), "Completed live operation is missing its completion evidence"),
        (
            live_operation("COMPLETED", **done, completion=completion | {"mediaCutoff": live_cutoff("PENDING")}),
            "Completed live operation is missing its completion evidence",
        ),
        (
            live_operation("COMPLETED", **done, completion=completion),
            "Completed live operation is missing its completion evidence",
        ),
        (
            live_operation("COMPLETED", **done, completion=enforced | {"liveSessionId": uid()}),
            "Completed live operation is missing its completion evidence",
        ),
        (live_operation("FAILED", **done), "Failed live operation is missing its reason"),
        (live_operation("RUNNING", operationId=uid()), "LiveSessionOperation does not match the request"),
    ]
    reasons = [reason for _, reason in malformed]

    def respond(request: Received) -> httpx.Response:
        if request.key == "communication.endLiveSession":
            ref = {"operationId": OPERATION, "owner": "communication", "href": "/graphql", "state": "running"}
            ended = {"liveSessionId": LIVE_SESSION, "operationId": OPERATION, "mediaCutoff": live_cutoff("PENDING")}
            return reply(request, operation=full("OperationRef", ref), result=ended)
        assert request.key == "communication.liveSessionOperation"
        return reply(request, result=answers.pop(0) if answers else malformed.pop(0)[0])

    authority = Authority(respond)
    client = authority.project()
    receipt = client.end_live_session(
        live_session_id=LIVE_SESSION, expected_generation="1", expected_revision="6", request_id=REQUEST
    )
    assert (receipt.status, receipt.request_id, receipt.operation.operation_id) == ("committed", REQUEST, OPERATION)
    assert (receipt.result.operation_id, receipt.result.media_cutoff.state) == (OPERATION, "PENDING")
    read = partial(client.live_session_operation, operation_id=OPERATION)
    running = read()
    assert (running.state, running.completion, running.failure) == ("RUNNING", None, None)
    ended = read().completion
    assert ended is not None
    assert ended.to_dict() == enforced
    started = read()
    assert started.kind == "START"
    assert started.completion is not None
    assert started.completion.media_cutoff is None
    failed = read().failure
    assert failed is not None
    assert (failed.code, failed.message) == ("LIVE_SESSION_CLOSED", "The live session already ended")
    for expected in reasons:
        problem = rejects(read, "INVALID_RESPONSE", expected)
        assert (problem.outcome, problem.status) == ("unknown", 503)
    assert [request.key for request in authority.requests] == [
        "communication.endLiveSession",
        *["communication.liveSessionOperation"] * 10,
    ]
    assert authority.requests[0].input == {
        "liveSessionId": LIVE_SESSION,
        "expectedGeneration": "1",
        "expectedRevision": "6",
    }
    assert all(request.input == {"operationId": OPERATION} for request in authority.requests[1:])


def test_a_reused_request_id_with_another_payload_is_an_idempotency_conflict() -> None:
    def respond(request: Received) -> httpx.Response:
        ack = {"messageId": MESSAGE, "conversationId": CONVERSATION, "sequence": "1", "revision": "1", "status": "sent"}
        scope = {"incarnation": INCARNATION, "conversationId": CONVERSATION, "sequence": "1"}
        return reply(request, result=full("MessageAck", ack | {"cursor": scope}))

    authority = Authority(respond)
    client = authority.project(project_id=PROJECT, incarnation=INCARNATION)
    send: dict[str, Any] = {"conversation_id": CONVERSATION, "text": "fixture", "props": {}, "request_id": REQUEST}
    sent = client.send_message(**send, act_as_principal_id=MEMBER)
    assert sent.message_id == MESSAGE
    problem = rejects(lambda: client.send_message(**send, act_as_principal_id=uid()), "IDEMPOTENCY_CONFLICT")
    assert (problem.request_id, problem.status) == (REQUEST, 409)
    assert len(authority.requests) == 1
    assert authority.requests[0].input == {
        "conversationId": CONVERSATION,
        "text": "fixture",
        "props": {},
        "actAsPrincipalId": MEMBER,
    }


def test_membership_batches_keep_their_identity_and_decimal_revisions() -> None:
    authority = Authority(lambda request: reply(request, result={"items": [member(CONVERSATION, PRINCIPAL)]}))
    client = authority.project()
    entry = MemberBatchEntryInput(principal_id=PRINCIPAL, role="member", expected_revision="9223372036854775807")
    batch = client.add_members(conversation_id=CONVERSATION, members=[entry], request_id=REQUEST)
    assert [item.can_start_broadcast for item in batch.items] == [False]
    [request] = authority.requests
    assert request.body["operationName"] == "CommunicationAddMembers"
    assert request.request_id == REQUEST
    assert request.input == {
        "conversationId": CONVERSATION,
        "members": [{"principalId": PRINCIPAL, "role": "member", "expectedRevision": "9223372036854775807"}],
    }
    distinct = "A membership batch requires 1..100 distinct principals"
    many = [MemberBatchEntryInput(principal_id=uid(), role="member", expected_revision="1") for _ in range(101)]
    owner = MemberBatchEntryInput(principal_id=uid(), role="owner", expected_revision="1")
    for members, expected in (
        ([], distinct),
        (many, distinct),
        ([entry, entry], distinct),
        ([owner], "Invalid membership role"),
    ):
        rejects(partial(client.add_members, conversation_id=CONVERSATION, members=members), "INVALID_REQUEST", expected)
    assert len(authority.requests) == 1


# Pages


def test_iterators_follow_page_cursors_until_the_last_page() -> None:
    first, second = uid(), uid()
    pages = {
        None: member_page([member(CONVERSATION, first)], "members-2"),
        "members-2": member_page([member(CONVERSATION, second)], None),
    }
    authority = Authority(lambda request: reply(request, result=pages[request.input.get("cursor")]))
    client = authority.project()
    assert [item.principal_id for item in client.iter_members(conversation_id=CONVERSATION)] == [first, second]
    assert [request.input for request in authority.requests] == [
        {"conversationId": CONVERSATION, "limit": 100},
        {"conversationId": CONVERSATION, "limit": 100, "cursor": "members-2"},
    ]


def test_message_iterators_pass_the_next_sequence_back_as_before_sequence() -> None:
    def respond(request: Received) -> httpx.Response:
        before = request.input.get("beforeSequence")
        sequence, next_cursor = ("7", "7") if before is None else ("6", None)
        items = [message(CONVERSATION, sequence=sequence, revisionSequence=sequence)]
        page = {"items": items, "complete": next_cursor is None, "refreshRequired": False, "nextCursor": next_cursor}
        return reply(request, result=full("MessagePage", page))

    authority = Authority(respond)
    client = authority.project()
    sequences = [
        item.sequence for item in client.iter_messages(conversation_id=CONVERSATION, act_as_principal_id=MEMBER)
    ]
    assert sequences == ["7", "6"]
    assert [request.input for request in authority.requests] == [
        {"conversationId": CONVERSATION, "limit": 100, "actAsPrincipalId": MEMBER},
        {"conversationId": CONVERSATION, "limit": 100, "actAsPrincipalId": MEMBER, "beforeSequence": "7"},
    ]


def iterate(answers: list[dict[str, Any]], **options: Any) -> tuple[Authority, Iterator[Any]]:
    authority = Authority(lambda request: reply(request, result=answers.pop(0)))
    return authority, authority.project().iter_members(conversation_id=CONVERSATION, **options)


def test_an_iterator_stops_when_the_page_set_changes() -> None:
    first = uid()
    _, members = iterate([member_page([member(CONVERSATION, first)], "members-2"), member_page([], None, refresh=True)])
    assert next(members).principal_id == first
    problem = rejects(lambda: next(members), "RESYNC_REQUIRED", "The page set changed; restart from the first page")
    assert (problem.outcome, problem.status) == ("rejected", 409)


@pytest.mark.parametrize(
    ("answers", "options"),
    [
        ([member_page([], "members-2"), member_page([], "members-2")], {}),
        ([member_page([], "members-2")], {"cursor": "members-2"}),
        ([full("MemberPage", {"items": [], "complete": False, "refreshRequired": False, "nextCursor": None})], {}),
    ],
)
def test_an_iterator_rejects_a_cursor_that_does_not_advance(
    answers: list[dict[str, Any]], options: dict[str, Any]
) -> None:
    authority, members = iterate(answers, **options)
    rejects(lambda: list(members), "INVALID_RESPONSE", "Page cursor did not advance")
    assert answers == []
    assert len(authority.requests) in (1, 2)


# Management


def test_management_key_issuance_and_permits_never_store_result_secrets() -> None:
    project, delivery, redemption = uid(), uid(), uid()

    def respond(request: Received) -> httpx.Response:
        assert "projectId" not in request.context
        if request.key == "management.issueBackendKey":
            return reply(
                request,
                status="accepted",
                operation=accepted_operation(),
                resourceRef={"kind": "project", "id": project},
            )
        if request.key == "management.credentialPermit":
            return reply(request, result={"signature": "fixture-secret-permit"})
        raise UnexpectedRequestError(request.key)

    storage = Storage()
    authority = Authority(respond)
    client = authority.management(recovery_storage=storage)
    expires = "2030-01-01T00:00:00.000Z"
    issued = client.issue_backend_key(
        project_id=project, name="backend", scopes=["membershipManage"], expires_at=expires
    )
    assert issued.status == "accepted"
    assert issued.operation is not None
    assert issued.operation.owner == "management"
    permit = client.credential_permit(project_id=project, delivery_id=delivery, redemption_request_id=redemption)
    assert permit == {"signature": "fixture-secret-permit"}
    assert [request.input for request in authority.requests] == [
        {"projectId": project, "name": "backend", "scopes": ["membershipManage"], "expiresAt": expires},
        {"projectId": project, "deliveryId": delivery, "redemptionRequestId": redemption},
    ]
    assert [state.resolution_state for state in client.recovery_states] == ["accepted", "committed"]
    assert "fixture-secret-permit" not in repr(client.recovery_states)
    for _, value in storage.writes:
        assert "fixture-secret-permit" not in value
        assert ACCESS_TOKEN not in value


def test_usage_queries_keep_meter_quantities_as_decimal_strings() -> None:
    deployment, project, org = uid(), uid(), uid()
    start, end, reason = (
        "2026-10-01T00:00:00.000Z",
        "2026-10-01T05:00:00.000Z",
        "Usage aggregation has not reported yet",
    )
    scopes = {
        "management.deploymentUsage": ("DeploymentUsage", {"deploymentId": deployment}),
        "management.projectUsage": ("ProjectUsage", {"projectId": project}),
        "management.organizationUsage": ("OrganizationUsage", {"orgId": org}),
    }
    quantity: list[object] = ["9223372036854775807"]
    sent: list[dict[str, Any]] = []

    def respond(request: Received) -> httpx.Response:
        type_name, scope = scopes[request.key]
        meters = [
            full("UsageMeter", {"meter": "api_calls", "unit": "call", "quantity": quantity[0], "emitted": True}),
            full("UsageMeter", {"meter": "egress_gb", "unit": "byte", "quantity": "0", "emitted": False}),
        ]
        usage = scope | {"source": "usage-rollup", "observedAt": end, "complete": False, "reason": reason}
        sent.append(full(type_name, usage | {"from": start, "to": end, "meters": meters}))
        return reply(request, result=sent[-1])

    authority = Authority(respond)
    client = authority.management()
    usages = [
        client.deployment_usage(deployment_id=deployment, from_=start, to=end).to_dict(),
        client.project_usage(project_id=project).to_dict(),
        client.organization_usage(org_id=org, to=end).to_dict(),
    ]
    assert [request.input for request in authority.requests] == [
        {"deploymentId": deployment, "from": start, "to": end},
        {"projectId": project},
        {"orgId": org, "to": end},
    ]
    assert usages == sent
    assert usages[0]["meters"][0]["quantity"] == "9223372036854775807"
    for malformed in (5, "-1", "1.5", "01", "9223372036854775808"):
        quantity[0] = malformed
        rejects(lambda: client.project_usage(project_id=project), "INVALID_RESPONSE")
    assert len(authority.requests) == 8


def test_hosted_management_sends_explicit_deployment_and_project_inputs() -> None:
    def respond(request: Received) -> httpx.Response:
        kind = "project" if request.key == "management.createProject" else "deployment"
        return reply(
            request, status="accepted", operation=accepted_operation(), resourceRef={"kind": kind, "id": uid()}
        )

    authority = Authority(respond)
    client = authority.management(base_url="https://management.example.test")
    identity = uid()
    with pytest.raises(TypeError):
        client.create_deployment(org_id=identity)  # type: ignore[call-arg]
    assert authority.requests == []
    client.create_deployment(
        org_id=identity,
        offering="managedShared",
        geo_id="fixture-region",
        installation_profile_id="fixture-profile",
        consent_ref="fixture-consent",
    )
    client.create_project(
        deployment_id=identity, name="Pilot", environment="prod", backend_principal_name="pilot-server"
    )
    assert [request.input for request in authority.requests] == [
        {
            "orgId": identity,
            "offering": "managedShared",
            "geoId": "fixture-region",
            "installationProfileId": "fixture-profile",
            "consentRef": "fixture-consent",
        },
        {"deploymentId": identity, "name": "Pilot", "environment": "prod", "backendPrincipalName": "pilot-server"},
    ]
    assert all(request.url == "https://management.example.test/graphql" for request in authority.requests)


# Transport


def refuse(request: Received) -> httpx.Response:
    raise httpx.ConnectError("connection refused")


def crash(request: Received) -> httpx.Response:
    raise RuntimeError("transport bug")


def utf8(body: object, status: int = 200) -> httpx.Response:
    return httpx.Response(status, content=json.dumps(body, ensure_ascii=False).encode())


UNAVAILABLE = ("TRANSPORT_UNKNOWN", "unknown", 0, "Authority response unavailable; resolve the original request")
INCOMPLETE = ("TRANSPORT_UNKNOWN", "unknown", 0, "Incomplete authority response; resolve the original request")
MALFORMED = "Malformed authority response; resolve the original request"


@pytest.mark.parametrize(
    ("respond", "expected"),
    [
        (refuse, UNAVAILABLE),
        (crash, UNAVAILABLE),
        (lambda request: httpx.Response(307, headers={"location": ENDPOINT}), UNAVAILABLE),
        (lambda request: httpx.Response(200, stream=Chunks(b'{"data":', error=httpx.ReadError("reset"))), INCOMPLETE),
        (
            lambda request: httpx.Response(200, content=b" " * (BODY_CAP + 1)),
            ("INVALID_RESPONSE", "unknown", 200, "Authority response exceeds the bound"),
        ),
        (
            lambda request: reply(request, result=principal(PRINCIPAL, externalUserId="x" * RESPONSE_BOUND)),
            ("INVALID_RESPONSE", "unknown", 200, "Authority response exceeds the bound"),
        ),
        (
            lambda request: httpx.Response(200, text="not json"),
            ("INVALID_RESPONSE", "unknown", 200, "Unrecognized authority response"),
        ),
        (
            lambda request: httpx.Response(502, text="Bad gateway"),
            ("INVALID_RESPONSE", "unknown", 502, "Unrecognized authority response"),
        ),
        (lambda request: httpx.Response(503), ("INVALID_RESPONSE", "unknown", 503, "Unrecognized authority response")),
        (
            lambda request: httpx.Response(500, json={"code": "INTERNAL", "outcome": "unknown", "message": "Failed"}),
            ("INTERNAL", "unknown", 500, "Failed"),
        ),
        (
            lambda request: httpx.Response(500, json={}),
            ("HTTP_FAILURE", "unknown", 500, "Authority rejected the request"),
        ),
        (
            lambda request: httpx.Response(200, json={"errors": [{"message": "Syntax error"}]}),
            ("GRAPHQL_ERROR", "unknown", 503, "Syntax error"),
        ),
        (lambda request: httpx.Response(200, json=[]), ("INVALID_RESPONSE", "unknown", 200, MALFORMED)),
        (lambda request: httpx.Response(200, json={"data": None}), ("INVALID_RESPONSE", "unknown", 200, MALFORMED)),
        (
            lambda request: reply(request, result={"principalId": PRINCIPAL}),
            ("INVALID_RESPONSE", "unknown", 200, MALFORMED),
        ),
        (
            lambda request: reply(request, status="pending", result=principal(PRINCIPAL)),
            ("INVALID_RESPONSE", "unknown", 200, MALFORMED),
        ),
        (
            lambda request: reply(request, requestId=uid(), result=principal(PRINCIPAL)),
            ("INVALID_RESPONSE", "unknown", 200, "Mismatched authority request identity"),
        ),
        (lambda request: reply(request), ("INVALID_RESPONSE", "unknown", 503, "Missing current authority result")),
    ],
)
def test_transport_and_protocol_failures_become_problems_naming_the_request(
    respond: Callable[[Received], httpx.Response], expected: tuple[str, str, int, str]
) -> None:
    authority = Authority(respond)
    client = authority.project()
    problem = rejects(lambda: client.get_principal(principal_id=PRINCIPAL), expected[0], expected[3])
    assert (problem.code, problem.outcome, problem.status, problem.message) == expected
    assert problem.request_id == authority.requests[0].request_id
    assert problem.__cause__ is None
    assert len(authority.requests) == 1


def test_the_response_bound_counts_utf16_code_units_rather_than_bytes() -> None:
    name = "\u00e9" * (RESPONSE_BOUND // 2 + 1000)
    authority = Authority(
        lambda request: utf8(json.loads(reply(request, result=principal(PRINCIPAL, externalUserId=name)).content))
    )
    client = authority.project()
    found = client.get_principal(principal_id=PRINCIPAL)
    assert found.external_user_id == name


@pytest.mark.parametrize(
    "evidence",
    [
        {"status": "ok"},
        {"status": "committed", "receiptId": None},
        {"status": "committed", "replayed": None},
        {"status": "committed", "committedAt": "yesterday"},
        {"status": "accepted"},
    ],
)
def test_a_mutation_reply_without_receipt_evidence_is_malformed(evidence: dict[str, Any]) -> None:
    authority = Authority(lambda request: reply(request, result=principal(PRINCIPAL), **evidence))
    client = authority.project()
    problem = rejects(lambda: client.create_principal(external_user_id="fixture-user"), "INVALID_RESPONSE", MALFORMED)
    assert problem.status == 200
    [state] = client.recovery_states
    assert (state.resolution_state, state.attempt_count) == ("unknown", 1)


class Slow(httpx.SyncByteStream):
    """A response body whose chunks each arrive after ``pause`` seconds."""

    def __init__(self, *chunks: bytes, pause: float) -> None:
        self._chunks = chunks
        self._pause = pause

    def __iter__(self) -> Iterator[bytes]:
        for chunk in self._chunks:
            time.sleep(self._pause)
            yield chunk


def test_a_body_that_outlasts_the_timeout_is_an_incomplete_response() -> None:
    authority = Authority(lambda request: httpx.Response(200, stream=Slow(b"{", b"}", pause=0.1)))
    client = authority.project(timeout=0.05)
    problem = rejects(lambda: client.get_principal(principal_id=PRINCIPAL), INCOMPLETE[0], INCOMPLETE[3])
    assert problem.status == 0
