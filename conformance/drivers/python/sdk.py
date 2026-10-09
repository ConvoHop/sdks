"""The only driver module that imports the SDK: retarget the Python driver here."""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Final, Literal, TypeAlias, TypeGuard, TypeVar, assert_never

import convohop
from convohop import (
    AsyncConvoHop,
    AsyncConvoHopManagement,
    ConvoHop,
    ConvoHopManagement,
    ConvoHopProblem,
    MemoryStorage,
    WebhookVerificationError,
    webhooks,
)
from convohop.types import MemberBatchEntryInput, MemberInputInput
from convohop.webhooks import WebhookVerificationCode

from params import Args, ParamsError, entries, integer, optional_text, record, strings, text

__all__ = [
    "FEATURES",
    "OPERATIONS",
    "PACKAGES",
    "ROLES",
    "Api",
    "ClientSpec",
    "MemoryStorage",
    "Role",
    "SdkClient",
    "close",
    "create_client",
    "driver_error",
    "is_role",
    "operation",
    "verify_webhook",
]

Api: TypeAlias = Literal["sync", "async"]
Role: TypeAlias = Literal["backend", "management"]
ROLES: Final[tuple[Role, ...]] = ("backend", "management")
FEATURES: Final = ("recovery.eviction", "recovery.storage", "retryAfter", "webhooks.verify")
PACKAGES: Final = {"convohop": convohop.__version__}

# The SDK requires requestedTtlMs; the catalog makes it optional, so use the TypeScript server SDK's default.
_DEFAULT_SESSION_TTL_MS: Final = "900000"
_MAX_DATE_SECONDS: Final = 8_640_000_000_000
_MAX_SAFE_INTEGER: Final = 2**53 - 1

_T = TypeVar("_T")

Backend: TypeAlias = ConvoHop | AsyncConvoHop
Management: TypeAlias = ConvoHopManagement | AsyncConvoHopManagement


def is_role(value: str) -> TypeGuard[Role]:
    return value in ROLES


def driver_error(error: Exception) -> dict[str, Any]:
    """The language-neutral projection of an SDK failure (spec/conformance/driver-protocol.md)."""
    if isinstance(error, ConvoHopProblem):
        # The SDK reports a missing authority response as status 0; the protocol uses null.
        return {
            "code": error.code,
            "status": None if error.status == 0 else error.status,
            "outcome": error.outcome,
            "requestId": error.request_id,
            "retryAfterMs": None if error.retry_after is None else error.retry_after * 1000,
            "message": error.message,
        }
    return {
        "code": "SDK_ERROR",
        "status": None,
        "outcome": None,
        "requestId": None,
        "retryAfterMs": None,
        "message": str(error) or type(error).__name__,
    }


class _AsyncMemoryStorage:
    """An asynchronous view of a named store, so that asynchronous clients load and save it through awaits."""

    __slots__ = ("_store",)

    def __init__(self, store: MemoryStorage) -> None:
        self._store = store

    async def get_item(self, key: str) -> str | None:
        return self._store.get_item(key)

    async def set_item(self, key: str, value: str) -> None:
        self._store.set_item(key, value)


@dataclass(frozen=True, slots=True, kw_only=True)
class ClientSpec:
    role: Role
    base_url: str
    credential: str
    project_id: str | None
    incarnation: str | None
    actor_id: str | None
    storage: MemoryStorage | None


@dataclass(frozen=True, slots=True)
class BackendClient:
    sdk: Backend
    role: Literal["backend"] = "backend"


@dataclass(frozen=True, slots=True)
class ManagementClient:
    sdk: Management
    role: Literal["management"] = "management"


SdkClient: TypeAlias = BackendClient | ManagementClient


def _required(value: str | None, name: str) -> str:
    if value is None:
        raise ParamsError(f"{name} is required for this role")
    return value


def create_client(spec: ClientSpec, api: Api) -> SdkClient:
    """Constructs an SDK client without network I/O; constructor validation failures are INVALID_PARAMS."""
    store = None if spec.storage is None else _AsyncMemoryStorage(spec.storage)
    try:
        if spec.role == "backend":
            project_id = _required(spec.project_id, "projectId")
            incarnation = _required(spec.incarnation, "incarnation")
            if api == "async":
                return BackendClient(
                    AsyncConvoHop(
                        base_url=spec.base_url,
                        backend_key=spec.credential,
                        project_id=project_id,
                        incarnation=incarnation,
                        async_recovery_storage=store,
                    )
                )
            return BackendClient(
                ConvoHop(
                    base_url=spec.base_url,
                    backend_key=spec.credential,
                    project_id=project_id,
                    incarnation=incarnation,
                    recovery_storage=spec.storage,
                )
            )
        actor_id = _required(spec.actor_id, "actorId")
        if api == "async":
            return ManagementClient(
                AsyncConvoHopManagement(
                    base_url=spec.base_url,
                    access_token=spec.credential,
                    actor_id=actor_id,
                    async_recovery_storage=store,
                )
            )
        return ManagementClient(
            ConvoHopManagement(
                base_url=spec.base_url,
                access_token=spec.credential,
                actor_id=actor_id,
                recovery_storage=spec.storage,
            )
        )
    except (TypeError, ValueError, ConvoHopProblem) as error:
        raise ParamsError(str(error)) from None


async def close(client: SdkClient) -> None:
    sdk = client.sdk
    if isinstance(sdk, AsyncConvoHop | AsyncConvoHopManagement):
        await sdk.aclose()
    else:
        sdk.close()


async def _settle(result: _T | Awaitable[_T]) -> _T:
    """The result of a synchronous client call, or the awaited result of an asynchronous one."""
    if isinstance(result, Awaitable):
        settled: _T = await result
        return settled
    return result


BackendOperation: TypeAlias = Callable[[Backend, Args], Awaitable[object]]
ManagementOperation: TypeAlias = Callable[[Management, Args], Awaitable[object]]

_MESSAGE_FIELDS: Final = ("conversationId", "messageId", "revision")


def _message(args: Args) -> tuple[str, str, str]:
    """The conversation, message and revision of a Message value that an earlier step returned."""
    value = args.get("message")
    if not isinstance(value, dict) or not all(isinstance(value.get(field), str) for field in _MESSAGE_FIELDS):
        raise ParamsError("message is not a valid protocol value")
    return value["conversationId"], value["messageId"], value["revision"]


def _conversation_input(args: Args) -> tuple[str, dict[str, Any], list[MemberInputInput]]:
    source = record(args.get("input"), "input")
    members = [
        MemberInputInput(principal_id=text(member, "principalId"), role=text(member, "role"))
        for member in entries(source, "members")
    ]
    return text(source, "title"), record(source.get("props"), "input.props"), members


def _batch(args: Args) -> list[MemberBatchEntryInput]:
    return [
        MemberBatchEntryInput(
            principal_id=text(member, "principalId"),
            role=text(member, "role"),
            expected_revision=text(member, "expectedRevision"),
        )
        for member in entries(args, "members")
    ]


async def _initialize(sdk: Backend, args: Args) -> object:
    await _settle(sdk.initialize())
    return None


async def _create_principal(sdk: Backend, args: Args) -> object:
    principal = await _settle(sdk.create_principal(external_user_id=text(args, "externalUserId")))
    return {"principalId": principal.principal_id}


async def _issue_session(sdk: Backend, args: Args) -> object:
    ttl = optional_text(args, "requestedTtlMs")
    bootstrap = await _settle(
        sdk.issue_session(
            principal_id=text(args, "principalId"),
            device_id=text(args, "deviceId"),
            requested_ttl_ms=_DEFAULT_SESSION_TTL_MS if ttl is None else ttl,
        )
    )
    return bootstrap.to_dict()


async def _create_conversation(sdk: Backend, args: Args) -> object:
    title, props, members = _conversation_input(args)
    conversation = await _settle(
        sdk.create_conversation(title=title, props=props, members=members, request_id=optional_text(args, "requestId"))
    )
    return conversation.to_dict()


async def _get_conversation(sdk: Backend, args: Args) -> object:
    conversation = await _settle(sdk.get_conversation(conversation_id=text(args, "conversationId")))
    return conversation.to_dict()


async def _list_members(sdk: Backend, args: Args) -> object:
    conversation_id = text(args, "conversationId")
    limit = integer(args, "limit", 1, 100)
    cursor = optional_text(args, "cursor")
    if limit is None:
        page = await _settle(sdk.members(conversation_id=conversation_id, cursor=cursor))
    else:
        page = await _settle(sdk.members(conversation_id=conversation_id, limit=limit, cursor=cursor))
    return page.to_dict()


async def _add_members(sdk: Backend, args: Args) -> object:
    batch = await _settle(
        sdk.add_members(
            conversation_id=text(args, "conversationId"),
            members=_batch(args),
            request_id=optional_text(args, "requestId"),
        )
    )
    return [member.to_dict() for member in batch.items]


async def _list_messages(sdk: Backend, args: Args) -> object:
    page = await _settle(
        sdk.messages(
            conversation_id=text(args, "conversationId"),
            before_sequence=optional_text(args, "beforeSequence"),
            act_as_principal_id=optional_text(args, "actAs"),
        )
    )
    return page.to_dict()


async def _send_message(sdk: Backend, args: Args) -> object:
    ack = await _settle(
        sdk.send_message(
            conversation_id=text(args, "conversationId"),
            text=text(args, "text"),
            props={},
            act_as_principal_id=optional_text(args, "actAs"),
            request_id=optional_text(args, "requestId"),
        )
    )
    return ack.to_dict()


async def _edit_message(sdk: Backend, args: Args) -> object:
    conversation_id, message_id, revision = _message(args)
    message = await _settle(
        sdk.edit_message(
            conversation_id=conversation_id,
            message_id=message_id,
            expected_revision=revision,
            text=text(args, "text"),
            request_id=optional_text(args, "requestId"),
        )
    )
    return message.to_dict()


async def _delete_message(sdk: Backend, args: Args) -> object:
    conversation_id, message_id, revision = _message(args)
    message = await _settle(
        sdk.delete_message(
            conversation_id=conversation_id,
            message_id=message_id,
            expected_revision=revision,
            request_id=optional_text(args, "requestId"),
        )
    )
    return message.to_dict()


async def _issue_backend_key(sdk: Management, args: Args) -> object:
    reply = await _settle(
        sdk.issue_backend_key(
            project_id=text(args, "projectId"),
            name=text(args, "name"),
            scopes=strings(args, "scopes"),
            expires_at=text(args, "expiresAt"),
        )
    )
    return reply.to_dict()


_BACKEND: Final[Mapping[str, BackendOperation]] = {
    "route.initialize": _initialize,
    "principals.create": _create_principal,
    "sessions.issue": _issue_session,
    "conversations.create": _create_conversation,
    "conversations.get": _get_conversation,
    "members.list": _list_members,
    "members.add": _add_members,
    "messages.list": _list_messages,
    "messages.send": _send_message,
    "messages.edit": _edit_message,
    "messages.delete": _delete_message,
}

_MANAGEMENT: Final[Mapping[str, ManagementOperation]] = {
    "backendKeys.issue": _issue_backend_key,
}

OPERATIONS: Final[Mapping[Role, tuple[str, ...]]] = {
    "backend": tuple(_BACKEND),
    "management": tuple(_MANAGEMENT),
}


def operation(client: SdkClient, name: str, args: Args) -> Awaitable[object] | None:
    """Starts an operation; None means the role does not implement it. Decoding failures raise ParamsError."""
    match client:
        case BackendClient(sdk):
            backend = _BACKEND.get(name)
            return None if backend is None else backend(sdk, args)
        case ManagementClient(sdk):
            management = _MANAGEMENT.get(name)
            return None if management is None else management(sdk, args)
        case _:
            assert_never(client)


# The SDK's finer codes projected onto the protocol's webhookCode. Size limits are the sender's contract, so a delivery
# beyond them cannot carry a valid signature.
def _webhook_code(code: WebhookVerificationCode) -> str:
    match code:
        case "MISSING_HEADER" | "INVALID_HEADER":
            return "WEBHOOK_HEADERS_MISSING"
        case "INVALID_TIMESTAMP":
            return "WEBHOOK_TIMESTAMP_INVALID"
        case "TIMESTAMP_EXPIRED":
            return "WEBHOOK_TIMESTAMP_EXPIRED"
        case "TIMESTAMP_FUTURE":
            return "WEBHOOK_TIMESTAMP_FUTURE"
        case "BODY_TOO_LARGE" | "TOO_MANY_SIGNATURES" | "NO_MATCHING_SIGNATURE":
            return "WEBHOOK_SIGNATURE_INVALID"
        case "INVALID_SECRET":
            raise ParamsError("secrets must be whsec_ secrets")
        case "INVALID_BODY":
            raise RuntimeError("Signature verification does not parse the body")
        case _:
            assert_never(code)


def verify_webhook(args: Args) -> dict[str, Any]:
    """Verifies one delivery's signature with the SDK (driver-protocol.md, webhooks.verify)."""
    headers: dict[str, str] = {}
    for name, value in record(args.get("headers"), "headers").items():
        if not isinstance(value, str):
            raise ParamsError(f"headers.{name} must be a string")
        headers[name] = value
    secrets = strings(args, "secrets")
    if not secrets:
        raise ParamsError("secrets must not be empty")
    now_seconds = integer(args, "nowSeconds", 0, _MAX_DATE_SECONDS)
    tolerance_seconds = integer(args, "toleranceSeconds", 0, _MAX_SAFE_INTEGER)
    if now_seconds is None or tolerance_seconds is None:
        raise ParamsError("nowSeconds and toleranceSeconds are required")
    try:
        now = datetime.fromtimestamp(now_seconds, UTC)
    except (OverflowError, OSError, ValueError):
        raise ParamsError("nowSeconds is outside the dates Python's datetime represents") from None
    try:
        webhooks.verify_signature(
            headers=headers,
            body=text(args, "payload"),
            secrets=secrets,
            tolerance_seconds=tolerance_seconds,
            now=now,
        )
    except WebhookVerificationError as error:
        return {"valid": False, "code": _webhook_code(error.code)}
    return {"valid": True, "code": None}
