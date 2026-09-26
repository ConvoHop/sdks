from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from types import MappingProxyType
from typing import Callable, Generic, Literal, Mapping, Optional, Protocol, TypeVar, Union, cast
from urllib.parse import urljoin, urlsplit
from uuid import UUID

from ._errors import ProtocolError

ThreadState = Literal["active", "archived"]
ThreadRole = Literal["owner", "moderator", "member", "viewer"]
MembershipState = Literal["invited", "active", "left", "removed"]
HistoryOnJoin = Literal["since_join", "all_existing"]
HistoryAfterExit = Literal["revoke", "previously_visible"]
CallMode = Literal["audio", "video"]
MediaKind = Literal["call", "broadcast"]
MediaState = Literal["requested", "starting", "live", "stopping", "ended", "failed"]
MediaRole = Literal["owner", "publisher", "viewer"]
AudiencePolicy = Literal["members", "project"]
ProjectStatus = Literal["provisioning", "active", "failed", "suspended"]
CallEventType = Literal[
    "call.ringing", "call.accepted", "call.declined", "call.ended", "call.revoked"
]

_UUID = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\Z"
)
_IDENTITY_ID = re.compile(r"ci_[0-9a-f]{32}\Z")
_DECIMAL = re.compile(r"(?:0|[1-9][0-9]*)\Z")
_HLS_ASSET = re.compile(
    r"(?:master\.m3u8|variant_(?:hi|lo)/(?:playlist\.m3u8|segment_[0-9]{6,12}\.ts))\Z"
)


def uuid_text(value: Union[str, UUID], label: str) -> str:
    if isinstance(value, UUID):
        result = str(value)
    elif isinstance(value, str) and _UUID.fullmatch(value):
        result = str(UUID(value))
    else:
        raise ValueError(f"{label} must be a UUID")
    if UUID(result).int == 0:
        raise ValueError(f"{label} must not be nil")
    return result


def identity_id(value: str) -> str:
    if (
        not isinstance(value, str)
        or not _IDENTITY_ID.fullmatch(value)
        or value == "ci_00000000000000000000000000000000"
    ):
        raise ValueError("identity_id must be a service-issued ci_ identifier")
    return value


def hls_asset(value: str) -> str:
    if not isinstance(value, str) or not _HLS_ASSET.fullmatch(value):
        raise ValueError("HLS asset must be a master, variant playlist, or variant segment")
    return value


@dataclass(frozen=True)
class AccessToken:
    token: str = field(repr=False)
    expires_at: datetime


@dataclass(frozen=True)
class RegisteredIdentity:
    id: str


@dataclass(frozen=True)
class ProvisionedProject:
    id: str
    project_key: str = field(repr=False)


@dataclass(frozen=True)
class Project:
    id: str
    name: str
    status: ProjectStatus


@dataclass(frozen=True)
class ProjectPage:
    items: tuple[Project, ...]
    next_after: Optional[str]


@dataclass(frozen=True)
class Thread:
    id: str
    title: str
    owner: str
    state: ThreadState
    history_on_join: HistoryOnJoin
    history_after_leave: HistoryAfterExit
    history_after_remove: HistoryAfterExit
    last_sequence: int


@dataclass(frozen=True)
class ThreadMember:
    membership_id: str
    identity_id: str
    role: ThreadRole
    state: MembershipState
    joined_sequence: Optional[int]
    exited_sequence: Optional[int]


@dataclass(frozen=True)
class ThreadPage:
    items: tuple[Thread, ...]
    next_after: Optional[str]


@dataclass(frozen=True)
class ThreadMessage:
    id: str
    thread_id: str
    sequence: int
    sender: str
    client_message_id: str
    body: str
    props: Mapping[str, object]
    created_at: datetime


@dataclass(frozen=True)
class ThreadEvent:
    event_id: str
    thread_id: str
    sequence: int
    kind: str
    actor: str
    message: Optional[ThreadMessage]
    identity_id: Optional[str]
    call_id: Optional[str]
    created_at: datetime


T = TypeVar("T")


@dataclass(frozen=True)
class TimelinePage(Generic[T]):
    items: tuple[T, ...]
    next_after: int
    cursor: int
    has_more: bool


@dataclass(frozen=True)
class CallDetails:
    id: str
    project_id: str
    thread_id: str
    mode: CallMode
    owner: str
    title: str
    role: MediaRole


@dataclass(frozen=True)
class IncomingCall:
    call: CallDetails
    sequence: int
    invited_at: datetime


@dataclass(frozen=True)
class IncomingCallPage:
    items: tuple[IncomingCall, ...]
    next_after: int
    has_more: bool
    cursor: int


@dataclass(frozen=True)
class IncomingCallSnapshot:
    items: tuple[IncomingCall, ...]
    cursor: int


@dataclass(frozen=True)
class CallEvent:
    kind: CallEventType
    event_id: str
    sequence: int
    call_id: str
    identity_id: str
    call: Optional[CallDetails]
    created_at: datetime


@dataclass(frozen=True)
class CallEventPage:
    items: tuple[CallEvent, ...]
    next_after: int
    has_more: bool


@dataclass(frozen=True)
class MediaSession:
    id: str
    project_id: str
    thread_id: Optional[str]
    mode: Optional[CallMode]
    kind: MediaKind
    owner: str
    title: str
    audience: AudiencePolicy
    state: MediaState


@dataclass(frozen=True)
class MediaMember:
    identity_id: str
    role: MediaRole


@dataclass(frozen=True)
class MediaParticipant:
    id: str
    identity_id: str
    role: MediaRole
    issued_at: datetime
    expires_at: datetime
    revoked_at: Optional[datetime]
    connected: bool


@dataclass(frozen=True)
class MediaJoin:
    participant_id: str
    server_url: str
    token: str = field(repr=False)
    expires_at: datetime


@dataclass(frozen=True)
class PlaybackRequest:
    url: str
    headers: Mapping[str, str] = field(repr=False)
    _root: str = field(repr=False)

    def for_asset(self, uri: str) -> PlaybackRequest:
        """Resolve a playlist URI, retaining authorization for that asset."""
        if (
            not isinstance(uri, str)
            or not uri
            or any(part in {".", ".."} for part in uri.split("/"))
            or urlsplit(uri).scheme
            or urlsplit(uri).netloc
            or urlsplit(uri).query
            or urlsplit(uri).fragment
            or uri.startswith("/")
        ):
            raise ValueError("HLS URI must be a relative asset within this playback")
        target = urljoin(self.url, uri)
        if not target.startswith(self._root):
            raise ValueError("HLS URI escapes this playback")
        hls_asset(target[len(self._root) :])
        return PlaybackRequest(target, self.headers, self._root)


def playback_request(root: str, token: str, asset: str) -> PlaybackRequest:
    return PlaybackRequest(
        root + hls_asset(asset),
        MappingProxyType({"Authorization": f"Bearer {token}"}),
        root,
    )


def record(value: object, context: str) -> Mapping[str, object]:
    if not isinstance(value, dict) or not all(isinstance(key, str) for key in value):
        raise ProtocolError(f"{context}: expected a JSON object")
    return cast(Mapping[str, object], value)


def text(value: Mapping[str, object], key: str) -> str:
    result = value.get(key)
    if not isinstance(result, str):
        raise ProtocolError(f"Invalid response: {key} must be a string")
    return result


def decimal(value: Mapping[str, object], key: str, *, minimum: int = 0) -> int:
    result = text(value, key)
    if len(result) > 19 or not _DECIMAL.fullmatch(result):
        raise ProtocolError(f"Invalid response: {key} must be a decimal string")
    parsed = int(result)
    if not minimum <= parsed <= 2**63 - 1:
        raise ProtocolError(f"Invalid response: {key} is outside the supported i64 range")
    return parsed


def optional_decimal(value: Mapping[str, object], key: str) -> Optional[int]:
    if key not in value:
        raise ProtocolError(f"Invalid response: {key} is missing")
    return decimal(value, key) if value[key] is not None else None


def choice(value: Mapping[str, object], key: str, allowed: tuple[str, ...]) -> str:
    result = text(value, key)
    if result not in allowed:
        raise ProtocolError(f"Invalid response: unknown {key}")
    return result


def wire_uuid(value: Mapping[str, object], key: str) -> str:
    result = text(value, key)
    try:
        return uuid_text(result, key)
    except ValueError as exc:
        raise ProtocolError(f"Invalid response: {key} must be a UUID") from exc


def wire_identity_id(value: Mapping[str, object], key: str) -> str:
    try:
        return identity_id(text(value, key))
    except ValueError as exc:
        raise ProtocolError(f"Invalid response: {key} must be a ci_ identifier") from exc


def optional_uuid(value: Mapping[str, object], key: str) -> Optional[str]:
    if key not in value:
        raise ProtocolError(f"Invalid response: {key} is missing")
    return wire_uuid(value, key) if value[key] is not None else None


def timestamp(value: Mapping[str, object], key: str) -> datetime:
    result = text(value, key)
    try:
        parsed = datetime.fromisoformat(result.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ProtocolError(f"Invalid response: {key} must be an RFC 3339 timestamp") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ProtocolError(f"Invalid response: {key} must include a timezone")
    return parsed


def parse_access_token(value: object) -> AccessToken:
    obj = record(value, "access token")
    token = text(obj, "token")
    if not re.fullmatch(r"st_[0-9a-fA-F]{64}", token):
        raise ProtocolError("Invalid response: expected a session token")
    return AccessToken(token, timestamp(obj, "expiresAt"))


def parse_registered_identity(value: object) -> RegisteredIdentity:
    return RegisteredIdentity(wire_identity_id(record(value, "identity"), "id"))


def parse_provisioned_project(value: object) -> ProvisionedProject:
    obj = record(value, "provisioned project")
    key = text(obj, "projectKey")
    if not re.fullmatch(r"pk_[0-9a-fA-F]{64}", key):
        raise ProtocolError("Invalid response: expected a project key")
    return ProvisionedProject(wire_uuid(obj, "id"), key)


def parse_project(value: object) -> Project:
    obj = record(value, "project")
    return Project(
        wire_uuid(obj, "id"),
        text(obj, "name"),
        cast(
            ProjectStatus,
            choice(obj, "status", ("provisioning", "active", "failed", "suspended")),
        ),
    )


def parse_project_page(value: object, after: Optional[str]) -> ProjectPage:
    obj = record(value, "project page")
    items = parse_items(obj.get("items"), parse_project)
    next_after = optional_uuid(obj, "nextAfter")
    expected = items[-1].id if items else after
    if next_after != expected:
        raise ProtocolError("Invalid response: project page cursor does not match its items")
    return ProjectPage(items, next_after)


def parse_thread(value: object) -> Thread:
    obj = record(value, "thread")
    return Thread(
        wire_uuid(obj, "id"),
        text(obj, "title"),
        wire_identity_id(obj, "owner"),
        cast(ThreadState, choice(obj, "state", ("active", "archived"))),
        cast(HistoryOnJoin, choice(obj, "historyOnJoin", ("since_join", "all_existing"))),
        cast(
            HistoryAfterExit,
            choice(obj, "historyAfterLeave", ("revoke", "previously_visible")),
        ),
        cast(
            HistoryAfterExit,
            choice(obj, "historyAfterRemove", ("revoke", "previously_visible")),
        ),
        decimal(obj, "lastSequence"),
    )


def parse_thread_member(value: object) -> ThreadMember:
    obj = record(value, "thread member")
    return ThreadMember(
        wire_uuid(obj, "membershipId"),
        wire_identity_id(obj, "identityId"),
        cast(ThreadRole, choice(obj, "role", ("owner", "moderator", "member", "viewer"))),
        cast(MembershipState, choice(obj, "state", ("invited", "active", "left", "removed"))),
        optional_decimal(obj, "joinedSequence"),
        optional_decimal(obj, "exitedSequence"),
    )


def parse_thread_page(value: object, after: Optional[str], limit: int) -> ThreadPage:
    obj = record(value, "thread page")
    items = parse_items(obj.get("items"), parse_thread, limit=limit)
    next_after = optional_uuid(obj, "nextAfter")
    expected = items[-1].id if items else after
    if next_after != expected:
        raise ProtocolError("Invalid response: thread page cursor does not match its items")
    return ThreadPage(items, next_after)


def parse_message(value: object, thread_id: str) -> ThreadMessage:
    obj = record(value, "message")
    if wire_uuid(obj, "threadId") != thread_id:
        raise ProtocolError("Invalid response: message belongs to another thread")
    props = record(obj.get("props"), "message props")
    return ThreadMessage(
        wire_uuid(obj, "id"),
        thread_id,
        decimal(obj, "sequence", minimum=1),
        wire_identity_id(obj, "sender"),
        wire_uuid(obj, "clientMessageId"),
        text(obj, "body"),
        props,
        timestamp(obj, "createdAt"),
    )


def parse_thread_event(value: object, thread_id: str) -> ThreadEvent:
    obj = record(value, "thread event")
    if wire_uuid(obj, "threadId") != thread_id:
        raise ProtocolError("Invalid response: event belongs to another thread")
    if "message" not in obj or "identityId" not in obj:
        raise ProtocolError("Invalid response: thread event is missing optional fields")
    message = parse_message(obj["message"], thread_id) if obj["message"] is not None else None
    event_identity_id = (
        wire_identity_id(obj, "identityId") if obj["identityId"] is not None else None
    )
    return ThreadEvent(
        wire_uuid(obj, "eventId"),
        thread_id,
        decimal(obj, "sequence", minimum=1),
        text(obj, "kind"),
        text(obj, "actor"),
        message,
        event_identity_id,
        optional_uuid(obj, "callId"),
        timestamp(obj, "createdAt"),
    )


class Sequenced(Protocol):
    @property
    def sequence(self) -> int: ...


ItemT = TypeVar("ItemT", bound=Sequenced)


def parse_items(
    value: object, parser: Callable[[object], T], *, limit: Optional[int] = None
) -> tuple[T, ...]:
    if not isinstance(value, list) or (limit is not None and len(value) > limit):
        raise ProtocolError("Invalid response: items must fit the requested page")
    return tuple(parser(item) for item in value)


def _parse_sequence_page(
    value: object, after: int, limit: int, parser: Callable[[object], ItemT]
) -> tuple[tuple[ItemT, ...], int, bool]:
    obj = record(value, "sequence page")
    items = parse_items(obj.get("items"), parser, limit=limit)
    previous = after
    for item in items:
        if item.sequence <= previous:
            raise ProtocolError("Invalid response: items are not in ascending order")
        previous = item.sequence
    next_after = decimal(obj, "nextAfter")
    if next_after < previous:
        raise ProtocolError("Invalid response: page cursor precedes its items")
    has_more = obj.get("hasMore")
    if type(has_more) is not bool:
        raise ProtocolError("Invalid response: hasMore must be a boolean")
    if has_more and next_after <= after:
        raise ProtocolError("Invalid response: page cursor did not advance")
    return items, next_after, has_more


def parse_message_page(
    value: object, thread_id: str, after: int, limit: int
) -> TimelinePage[ThreadMessage]:
    items, next_after, has_more = _parse_sequence_page(
        value, after, limit, lambda item: parse_message(item, thread_id)
    )
    return TimelinePage(items, next_after, decimal(record(value, "message page"), "cursor"), has_more)


def parse_thread_event_page(
    value: object, thread_id: str, after: int, limit: int
) -> TimelinePage[ThreadEvent]:
    items, next_after, has_more = _parse_sequence_page(
        value, after, limit, lambda item: parse_thread_event(item, thread_id)
    )
    return TimelinePage(items, next_after, decimal(record(value, "event page"), "cursor"), has_more)


def parse_call_details(value: object) -> CallDetails:
    obj = record(value, "call details")
    return CallDetails(
        wire_uuid(obj, "id"),
        wire_uuid(obj, "projectId"),
        wire_uuid(obj, "threadId"),
        cast(CallMode, choice(obj, "mode", ("audio", "video"))),
        wire_identity_id(obj, "owner"),
        text(obj, "title"),
        cast(MediaRole, choice(obj, "role", ("owner", "publisher", "viewer"))),
    )


def parse_incoming_call(value: object) -> IncomingCall:
    obj = record(value, "incoming call")
    return IncomingCall(
        parse_call_details(obj.get("call")),
        decimal(obj, "sequence", minimum=1),
        timestamp(obj, "invitedAt"),
    )


def parse_call_event(value: object) -> CallEvent:
    obj = record(value, "call event")
    kind = cast(
        CallEventType,
        choice(
            obj,
            "kind",
            ("call.ringing", "call.accepted", "call.declined", "call.ended", "call.revoked"),
        ),
    )
    if "call" not in obj:
        raise ProtocolError("Invalid response: call event is missing call details")
    call = parse_call_details(obj["call"]) if obj["call"] is not None else None
    call_id = wire_uuid(obj, "callId")
    if call is not None and call.id != call_id:
        raise ProtocolError("Invalid response: call event belongs to another call")
    return CallEvent(
        kind,
        wire_uuid(obj, "eventId"),
        decimal(obj, "sequence", minimum=1),
        call_id,
        wire_identity_id(obj, "identityId"),
        call,
        timestamp(obj, "createdAt"),
    )


def parse_incoming_call_page(value: object, after: int, limit: int) -> IncomingCallPage:
    items, next_after, has_more = _parse_sequence_page(value, after, limit, parse_incoming_call)
    return IncomingCallPage(
        items, next_after, has_more, decimal(record(value, "incoming call page"), "cursor")
    )


def parse_call_event_page(value: object, after: int, limit: int) -> CallEventPage:
    items, next_after, has_more = _parse_sequence_page(value, after, limit, parse_call_event)
    return CallEventPage(items, next_after, has_more)


def parse_media_session(value: object) -> MediaSession:
    obj = record(value, "media session")
    kind = cast(MediaKind, choice(obj, "kind", ("call", "broadcast")))
    thread_id = optional_uuid(obj, "threadId")
    if "mode" not in obj:
        raise ProtocolError("Invalid response: mode is missing")
    raw_mode = obj.get("mode")
    mode = cast(CallMode, choice(obj, "mode", ("audio", "video"))) if raw_mode is not None else None
    if (kind == "call" and (thread_id is None or mode is None)) or (
        kind == "broadcast" and (thread_id is not None or mode is not None)
    ):
        raise ProtocolError("Invalid response: media thread and mode do not match its kind")
    return MediaSession(
        wire_uuid(obj, "id"),
        wire_uuid(obj, "projectId"),
        thread_id,
        mode,
        kind,
        wire_identity_id(obj, "owner"),
        text(obj, "title"),
        cast(AudiencePolicy, choice(obj, "audience", ("members", "project"))),
        cast(
            MediaState,
            choice(obj, "state", ("requested", "starting", "live", "stopping", "ended", "failed")),
        ),
    )


def parse_media_member(value: object) -> MediaMember:
    obj = record(value, "media member")
    return MediaMember(
        wire_identity_id(obj, "identityId"),
        cast(MediaRole, choice(obj, "role", ("owner", "publisher", "viewer"))),
    )


def parse_media_participant(value: object) -> MediaParticipant:
    obj = record(value, "media participant")
    if "revokedAt" not in obj:
        raise ProtocolError("Invalid response: revokedAt is missing")
    revoked = timestamp(obj, "revokedAt") if obj["revokedAt"] is not None else None
    connected = obj.get("connected")
    if type(connected) is not bool:
        raise ProtocolError("Invalid response: connected must be a boolean")
    return MediaParticipant(
        wire_uuid(obj, "id"),
        wire_identity_id(obj, "identityId"),
        cast(MediaRole, choice(obj, "role", ("owner", "publisher", "viewer"))),
        timestamp(obj, "issuedAt"),
        timestamp(obj, "expiresAt"),
        revoked,
        connected,
    )


def parse_media_join(value: object) -> MediaJoin:
    obj = record(value, "media join")
    token = text(obj, "token")
    if not token:
        raise ProtocolError("Invalid response: LiveKit join token must not be empty")
    return MediaJoin(
        wire_uuid(obj, "participantId"),
        text(obj, "serverUrl"),
        token,
        timestamp(obj, "expiresAt"),
    )
