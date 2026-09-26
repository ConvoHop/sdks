from __future__ import annotations

import json
import math
import re
import unicodedata
from typing import Literal, Mapping, Optional, Sequence, Type, TypeVar, Union, cast
from urllib.parse import urlsplit
from uuid import UUID, uuid4

import httpx

from ._calls import IncomingCallFeed
from ._errors import APIError, ProtocolError, RequestTimeout, TransportError, graphql_error
from ._models import (
    AccessToken,
    AudiencePolicy,
    CallEvent,
    CallEventPage,
    CallMode,
    HistoryAfterExit,
    HistoryOnJoin,
    IncomingCall,
    IncomingCallPage,
    IncomingCallSnapshot,
    MediaJoin,
    MediaMember,
    MediaParticipant,
    MediaSession,
    PlaybackRequest,
    ProjectPage,
    ProvisionedProject,
    RegisteredIdentity,
    Thread,
    ThreadEvent,
    ThreadMember,
    ThreadMessage,
    ThreadPage,
    TimelinePage,
    parse_access_token,
    parse_call_event_page,
    parse_incoming_call_page,
    parse_items,
    parse_media_join,
    parse_media_member,
    parse_media_participant,
    parse_media_session,
    parse_message,
    parse_message_page,
    parse_project_page,
    parse_provisioned_project,
    parse_registered_identity,
    parse_thread,
    parse_thread_event_page,
    parse_thread_member,
    parse_thread_page,
    playback_request,
    identity_id as _identity_id,
    record,
    text,
    uuid_text,
)
from ._queries import (
    CALL as _CALL,
    CALL_EVENT as _CALL_EVENT,
    EVENT as _EVENT,
    INCOMING as _INCOMING,
    JOIN as _JOIN,
    MEDIA as _MEDIA,
    MEDIA_MEMBER as _MEDIA_MEMBER,
    MEMBER as _MEMBER,
    MESSAGE as _MESSAGE,
    PARTICIPANT as _PARTICIPANT,
    THREAD as _THREAD,
    operation as _operation,
)
from ._realtime import CallSubscription, ThreadSubscription, _RealtimeSubscription

_Client = TypeVar("_Client", bound="_BaseClient")


def _base_url(value: str) -> str:
    if (
        not isinstance(value, str)
        or "\\" in value
        or "?" in value
        or "#" in value
        or any(char.isspace() or ord(char) < 32 for char in value)
    ):
        raise ValueError("base_url must be an HTTP or HTTPS URL")
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError as exc:
        raise ValueError("base_url must be a valid HTTP or HTTPS URL") from exc
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or port == 0
    ):
        raise ValueError("base_url must be an HTTP or HTTPS URL without credentials")
    if parsed.scheme == "http" and parsed.hostname not in ("localhost", "127.0.0.1", "::1"):
        raise ValueError("remote communications endpoints require HTTPS")
    return value.rstrip("/")


def _timeout(value: float) -> float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value <= 0
    ):
        raise ValueError("timeout must be a positive number of seconds")
    return float(value)


def _title(value: str) -> str:
    if not isinstance(value, str) or not value.strip() or any(
        unicodedata.category(char) == "Cc" for char in value
    ):
        raise ValueError("title/name must contain text without control characters")
    try:
        length = len(value.encode("utf-8"))
    except UnicodeEncodeError as exc:
        raise ValueError("title/name must be UTF-8 text") from exc
    if length > 128:
        raise ValueError("title/name must be at most 128 UTF-8 bytes")
    return value


def _members(values: Sequence[str]) -> list[str]:
    if isinstance(values, (str, bytes)) or not isinstance(values, Sequence) or len(values) > 100:
        raise ValueError("members/publishers must be a sequence of at most 100 identity IDs")
    return [_identity_id(value) for value in values]


def _page(after: int, limit: int) -> None:
    if type(after) is not int or not 0 <= after <= 2**63 - 1:
        raise ValueError("after must be a nonnegative 64-bit integer")
    if type(limit) is not int or not 1 <= limit <= 100:
        raise ValueError("limit must be between 1 and 100")


def _props(value: Optional[Mapping[str, object]]) -> dict[str, object]:
    if value is None:
        return {}
    if not isinstance(value, Mapping) or not all(isinstance(key, str) for key in value):
        raise ValueError("props must be a JSON object")
    try:
        encoded = json.dumps(dict(value), allow_nan=False, ensure_ascii=False)
        encoded.encode("utf-8")
        parsed = json.loads(encoded)
    except (TypeError, ValueError, UnicodeError) as exc:
        raise ValueError("props must contain JSON values") from exc
    return cast(dict[str, object], parsed)


def _reconnect_settings(
    reconnect_delay: float, max_reconnect_delay: float, max_retries: Optional[int]
) -> tuple[float, float, Optional[int]]:
    if (
        isinstance(reconnect_delay, bool)
        or not isinstance(reconnect_delay, (int, float))
        or not math.isfinite(reconnect_delay)
        or reconnect_delay < 0
    ):
        raise ValueError("reconnect_delay must be a nonnegative number of seconds")
    maximum = _timeout(max_reconnect_delay)
    if maximum < reconnect_delay:
        raise ValueError("max_reconnect_delay must be >= reconnect_delay")
    if max_retries is not None and (type(max_retries) is not int or max_retries < 0):
        raise ValueError("max_retries must be a nonnegative integer or None")
    return float(reconnect_delay), maximum, max_retries


def _confirmed(value: object, operation: str) -> None:
    if value is not True:
        raise ProtocolError(f"Invalid response: {operation} must return true")


class _BaseClient:
    def __init__(
        self,
        base_url: str,
        credential: str,
        prefix: str,
        *,
        timeout: float = 10.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.base_url = _base_url(base_url)
        if not isinstance(credential, str) or not re.fullmatch(
            rf"{prefix}_[0-9a-fA-F]{{64}}", credential
        ):
            raise ValueError(f"credential must be a {prefix}_ token for this client")
        self._credential = credential
        self.timeout = _timeout(timeout)
        self._owns_http_client = http_client is None
        self._http = http_client or httpx.AsyncClient(timeout=self.timeout, trust_env=False)
        self._closed = False

    async def __aenter__(self: _Client) -> _Client:
        if self._closed:
            raise RuntimeError("client is closed")
        return self

    async def __aexit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_value: Optional[BaseException],
        traceback: object,
    ) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if not self._closed:
            self._closed = True
            if self._owns_http_client:
                await self._http.aclose()

    def _url(self, path: str) -> str:
        return f"{self.base_url}/{path}"

    async def _graphql(
        self, query: str, field: str, variables: Optional[Mapping[str, object]] = None
    ) -> object:
        if self._closed:
            raise RuntimeError("client is closed")
        try:
            response = await self._http.request(
                "POST",
                self._url("graphql"),
                headers={
                    "Authorization": f"Bearer {self._credential}",
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json={"query": query, "variables": dict(variables or {})},
                timeout=self.timeout,
                follow_redirects=False,
            )
        except httpx.TimeoutException as exc:
            raise RequestTimeout(f"POST /graphql timed out after {self.timeout:g}s") from exc
        except httpx.RequestError as exc:
            raise TransportError(f"POST /graphql failed: {type(exc).__name__}") from exc
        status = response.status_code
        if 300 <= status < 400:
            raise ProtocolError(f"HTTP {status} redirected a GraphQL request", status)
        try:
            payload = record(response.json(), "GraphQL response")
        except (ValueError, ProtocolError) as exc:
            raise ProtocolError(f"HTTP {status} returned invalid JSON", status) from exc
        if "errors" in payload:
            raise graphql_error(payload["errors"], status)
        if not 200 <= status < 300:
            try:
                error = record(payload.get("error"), "HTTP API error")
                raise APIError(status, text(error, "code"), text(error, "message"))
            except ProtocolError as exc:
                raise ProtocolError(f"HTTP {status} returned an invalid API error", status) from exc
        data = record(payload.get("data"), "GraphQL data")
        if field not in data or data[field] is None:
            raise ProtocolError(f"Invalid response: missing {field} data", status)
        return data[field]


class ManagementClient(_BaseClient):
    """Privileged project provisioning on the separate Management /graphql API."""

    def __init__(
        self,
        base_url: str,
        admin_token: str,
        *,
        timeout: float = 10.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        super().__init__(base_url, admin_token, "adm", timeout=timeout, http_client=http_client)

    async def create_project(self, name: str) -> ProvisionedProject:
        result = await self._graphql(
            _operation("mutation", "createProject", "$name:String!", "name:$name", "id projectKey"),
            "createProject",
            {"name": _title(name)},
        )
        return parse_provisioned_project(result)

    async def projects(
        self, *, after: Optional[Union[str, UUID]] = None, limit: int = 50
    ) -> ProjectPage:
        _page(0, limit)
        cursor = uuid_text(after, "project ID") if after is not None else None
        result = await self._graphql(
            _operation(
                "query",
                "projects",
                "$after:ID,$limit:Int",
                "after:$after,limit:$limit",
                "items{id name status} nextAfter",
            ),
            "projects",
            {"after": cursor, "limit": limit},
        )
        return parse_project_page(result, cursor)

    async def suspend_project(self, project_id: Union[str, UUID]) -> None:
        _confirmed(
            await self._graphql(
                _operation("mutation", "suspendProject", "$id:ID!", "id:$id"),
                "suspendProject",
                {"id": uuid_text(project_id, "project ID")},
            ),
            "suspendProject",
        )


class ServerProjectClient(_BaseClient):
    """Server-only pk_ holder for identity creation and session issuance."""

    def __init__(
        self,
        base_url: str,
        project_key: str,
        *,
        timeout: float = 10.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        super().__init__(base_url, project_key, "pk", timeout=timeout, http_client=http_client)

    async def create_identity(self, request_id: Union[str, UUID]) -> RegisteredIdentity:
        result = await self._graphql(
            _operation(
                "mutation",
                "createIdentity",
                "$requestId:ID!",
                "requestId:$requestId",
                "id",
            ),
            "createIdentity",
            {"requestId": uuid_text(request_id, "request ID")},
        )
        return parse_registered_identity(result)

    async def issue_identity_token(self, identity_id: str) -> AccessToken:
        result = await self._graphql(
            _operation(
                "mutation",
                "issueIdentityToken",
                "$identityId:ID!",
                "identityId:$identityId",
                "token expiresAt",
            ),
            "issueIdentityToken",
            {"identityId": _identity_id(identity_id)},
        )
        return parse_access_token(result)


class UserClient(_BaseClient):
    """Thread, call, and media operations authorized by a single st_ session."""

    def __init__(
        self,
        base_url: str,
        token: str,
        *,
        timeout: float = 10.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        super().__init__(base_url, token, "st", timeout=timeout, http_client=http_client)
        self._thread_subscriptions: set[_RealtimeSubscription[ThreadEvent]] = set()
        self._call_subscriptions: set[_RealtimeSubscription[CallEvent]] = set()

    async def aclose(self) -> None:
        for subscription in tuple(self._thread_subscriptions):
            await subscription.aclose()
        for call_subscription in tuple(self._call_subscriptions):
            await call_subscription.aclose()
        await super().aclose()

    async def revoke_session(self) -> None:
        _confirmed(
            await self._graphql(_operation("mutation", "revokeSession"), "revokeSession"),
            "revokeSession",
        )

    async def create_thread(
        self,
        title: str,
        members: Sequence[str] = (),
        *,
        history_on_join: HistoryOnJoin = "since_join",
        history_after_leave: HistoryAfterExit = "revoke",
        history_after_remove: HistoryAfterExit = "revoke",
    ) -> Thread:
        if history_on_join not in ("since_join", "all_existing") or history_after_leave not in (
            "revoke", "previously_visible"
        ) or history_after_remove not in ("revoke", "previously_visible"):
            raise ValueError("invalid thread history policy")
        result = await self._graphql(
            _operation(
                "mutation",
                "createThread",
                "$title:String!,$members:[ID!],$onJoin:String,$afterLeave:String,$afterRemove:String",
                "title:$title,members:$members,historyOnJoin:$onJoin,"
                "historyAfterLeave:$afterLeave,historyAfterRemove:$afterRemove",
                _THREAD,
            ),
            "createThread",
            {
                "title": _title(title),
                "members": _members(members),
                "onJoin": history_on_join,
                "afterLeave": history_after_leave,
                "afterRemove": history_after_remove,
            },
        )
        return parse_thread(result)

    async def thread(self, thread_id: Union[str, UUID]) -> Thread:
        return parse_thread(
            await self._graphql(
                _operation("query", "thread", "$id:ID!", "id:$id", _THREAD),
                "thread",
                {"id": uuid_text(thread_id, "thread ID")},
            )
        )

    async def threads(
        self, *, after: Optional[Union[str, UUID]] = None, limit: int = 50
    ) -> ThreadPage:
        _page(0, limit)
        cursor = uuid_text(after, "thread ID") if after is not None else None
        result = await self._graphql(
            _operation(
                "query",
                "threads",
                "$after:ID,$limit:Int",
                "after:$after,limit:$limit",
                f"items{{{_THREAD}}} nextAfter",
            ),
            "threads",
            {"after": cursor, "limit": limit},
        )
        return parse_thread_page(result, cursor, limit)

    async def thread_invitations(self, *, limit: int = 50) -> tuple[Thread, ...]:
        _page(0, limit)
        return parse_items(
            await self._graphql(
                _operation(
                    "query", "threadInvitations", "$limit:Int", "limit:$limit", _THREAD
                ),
                "threadInvitations",
                {"limit": limit},
            ),
            parse_thread,
            limit=limit,
        )

    async def thread_members(self, thread_id: Union[str, UUID]) -> tuple[ThreadMember, ...]:
        return parse_items(
            await self._graphql(
                _operation(
                    "query",
                    "threadMembers",
                    "$threadId:ID!",
                    "threadId:$threadId",
                    _MEMBER,
                ),
                "threadMembers",
                {"threadId": uuid_text(thread_id, "thread ID")},
            ),
            parse_thread_member,
        )

    async def thread_messages(
        self, thread_id: Union[str, UUID], *, after: int = 0, limit: int = 50
    ) -> TimelinePage[ThreadMessage]:
        _page(after, limit)
        identifier = uuid_text(thread_id, "thread ID")
        result = await self._graphql(
            _operation(
                "query",
                "threadMessages",
                "$threadId:ID!,$after:String,$limit:Int",
                "threadId:$threadId,after:$after,limit:$limit",
                f"items{{{_MESSAGE}}} nextAfter cursor hasMore",
            ),
            "threadMessages",
            {"threadId": identifier, "after": str(after), "limit": limit},
        )
        return parse_message_page(result, identifier, after, limit)

    async def thread_events(
        self, thread_id: Union[str, UUID], *, after: int = 0, limit: int = 50
    ) -> TimelinePage[ThreadEvent]:
        _page(after, limit)
        identifier = uuid_text(thread_id, "thread ID")
        result = await self._graphql(
            _operation(
                "query",
                "threadEvents",
                "$threadId:ID!,$after:String,$limit:Int",
                "threadId:$threadId,after:$after,limit:$limit",
                f"items{{{_EVENT}}} nextAfter cursor hasMore",
            ),
            "threadEvents",
            {"threadId": identifier, "after": str(after), "limit": limit},
        )
        return parse_thread_event_page(result, identifier, after, limit)

    async def invite_thread_member(
        self,
        thread_id: Union[str, UUID],
        identity_id: str,
        role: Literal["moderator", "member", "viewer"] = "member",
    ) -> ThreadMember:
        if role not in ("moderator", "member", "viewer"):
            raise ValueError("thread role must be moderator, member, or viewer")
        result = await self._graphql(
            _operation(
                "mutation",
                "inviteThreadMember",
                "$threadId:ID!,$identityId:ID!,$role:String",
                "threadId:$threadId,identityId:$identityId,role:$role",
                _MEMBER,
            ),
            "inviteThreadMember",
            {"threadId": uuid_text(thread_id, "thread ID"), "identityId": _identity_id(identity_id), "role": role},
        )
        return parse_thread_member(result)

    async def accept_thread_invitation(self, thread_id: Union[str, UUID]) -> ThreadMember:
        return parse_thread_member(
            await self._graphql(
                _operation(
                    "mutation",
                    "acceptThreadInvitation",
                    "$threadId:ID!",
                    "threadId:$threadId",
                    _MEMBER,
                ),
                "acceptThreadInvitation",
                {"threadId": uuid_text(thread_id, "thread ID")},
            )
        )

    async def leave_thread(self, thread_id: Union[str, UUID]) -> None:
        await self._thread_boolean("leaveThread", thread_id)

    async def remove_thread_member(self, thread_id: Union[str, UUID], identity_id: str) -> None:
        _confirmed(
            await self._graphql(
                _operation(
                    "mutation",
                    "removeThreadMember",
                    "$threadId:ID!,$identityId:ID!",
                    "threadId:$threadId,identityId:$identityId",
                ),
                "removeThreadMember",
                {"threadId": uuid_text(thread_id, "thread ID"), "identityId": _identity_id(identity_id)},
            ),
            "removeThreadMember",
        )

    async def change_thread_role(
        self,
        thread_id: Union[str, UUID],
        identity_id: str,
        role: Literal["moderator", "member", "viewer"],
    ) -> ThreadMember:
        if role not in ("moderator", "member", "viewer"):
            raise ValueError("thread role must be moderator, member, or viewer")
        return parse_thread_member(
            await self._graphql(
                _operation(
                    "mutation",
                    "changeThreadRole",
                    "$threadId:ID!,$identityId:ID!,$role:String!",
                    "threadId:$threadId,identityId:$identityId,role:$role",
                    _MEMBER,
                ),
                "changeThreadRole",
                {"threadId": uuid_text(thread_id, "thread ID"), "identityId": _identity_id(identity_id), "role": role},
            )
        )

    async def transfer_thread_owner(self, thread_id: Union[str, UUID], identity_id: str) -> Thread:
        return parse_thread(
            await self._graphql(
                _operation(
                    "mutation",
                    "transferThreadOwner",
                    "$threadId:ID!,$identityId:ID!",
                    "threadId:$threadId,identityId:$identityId",
                    _THREAD,
                ),
                "transferThreadOwner",
                {"threadId": uuid_text(thread_id, "thread ID"), "identityId": _identity_id(identity_id)},
            )
        )

    async def archive_thread(self, thread_id: Union[str, UUID]) -> Thread:
        return await self._thread_state("archiveThread", thread_id)

    async def reopen_thread(self, thread_id: Union[str, UUID]) -> Thread:
        return await self._thread_state("reopenThread", thread_id)

    async def _thread_state(self, field: str, thread_id: Union[str, UUID]) -> Thread:
        return parse_thread(
            await self._graphql(
                _operation("mutation", field, "$threadId:ID!", "threadId:$threadId", _THREAD),
                field,
                {"threadId": uuid_text(thread_id, "thread ID")},
            )
        )

    async def _thread_boolean(self, field: str, thread_id: Union[str, UUID]) -> None:
        _confirmed(
            await self._graphql(
                _operation("mutation", field, "$threadId:ID!", "threadId:$threadId"),
                field,
                {"threadId": uuid_text(thread_id, "thread ID")},
            ),
            field,
        )

    async def send_message(
        self,
        thread_id: Union[str, UUID],
        body: str,
        *,
        client_message_id: Optional[Union[str, UUID]] = None,
        props: Optional[Mapping[str, object]] = None,
    ) -> ThreadMessage:
        identifier = uuid_text(thread_id, "thread ID")
        if not isinstance(body, str) or not body.strip() or "\0" in body:
            raise ValueError("body must contain text without NUL")
        try:
            length = len(body.encode("utf-8"))
        except UnicodeEncodeError as exc:
            raise ValueError("body must be UTF-8 text") from exc
        if length > 32768:
            raise ValueError("body must be at most 32768 UTF-8 bytes")
        message_id = (
            uuid_text(client_message_id, "client_message_id")
            if client_message_id is not None
            else str(uuid4())
        )
        result = await self._graphql(
            _operation(
                "mutation",
                "sendMessage",
                "$threadId:ID!,$clientMessageId:ID!,$body:String!,$props:JSON",
                "threadId:$threadId,clientMessageId:$clientMessageId,body:$body,props:$props",
                _MESSAGE,
            ),
            "sendMessage",
            {
                "threadId": identifier,
                "clientMessageId": message_id,
                "body": body,
                "props": _props(props),
            },
        )
        return parse_message(result, identifier)

    def subscribe_thread_events(
        self,
        thread_id: Union[str, UUID],
        *,
        after: int = 0,
        reconnect_delay: float = 0.5,
        max_reconnect_delay: float = 8.0,
        max_retries: Optional[int] = 5,
    ) -> ThreadSubscription:
        if self._closed:
            raise RuntimeError("client is closed")
        _page(after, 1)
        identifier = uuid_text(thread_id, "thread ID")
        delay, maximum, retries = _reconnect_settings(
            reconnect_delay, max_reconnect_delay, max_retries
        )
        subscription = ThreadSubscription(
            self,
            identifier,
            self._url("graphql"),
            self._credential,
            after=after,
            reconnect_delay=delay,
            max_reconnect_delay=maximum,
            max_retries=retries,
            on_close=self._thread_subscriptions.discard,
        )
        self._thread_subscriptions.add(subscription)
        return subscription

    async def incoming_calls(self, *, after: int = 0, limit: int = 50) -> IncomingCallPage:
        _page(after, limit)
        result = await self._graphql(
            _operation(
                "query",
                "incomingCalls",
                "$after:String,$limit:Int",
                "after:$after,limit:$limit",
                f"items{{{_INCOMING}}} nextAfter cursor hasMore",
            ),
            "incomingCalls",
            {"after": str(after), "limit": limit},
        )
        return parse_incoming_call_page(result, after, limit)

    async def call_events(self, *, after: int = 0, limit: int = 50) -> CallEventPage:
        _page(after, limit)
        result = await self._graphql(
            _operation(
                "query",
                "callEvents",
                "$after:String,$limit:Int",
                "after:$after,limit:$limit",
                f"items{{{_CALL_EVENT}}} nextAfter hasMore",
            ),
            "callEvents",
            {"after": str(after), "limit": limit},
        )
        return parse_call_event_page(result, after, limit)

    async def incoming_call_snapshot(self, *, limit: int = 50) -> IncomingCallSnapshot:
        _page(0, limit)
        after = 0
        page = await self.incoming_calls(after=after, limit=limit)
        first_cursor = page.cursor
        latest: dict[str, IncomingCall] = {}
        while True:
            for item in page.items:
                previous = latest.get(item.call.id)
                if previous is None or item.sequence > previous.sequence:
                    latest[item.call.id] = item
            if not page.has_more:
                break
            if page.next_after <= after:
                raise ProtocolError("Incoming call snapshot cursor did not advance")
            after = page.next_after
            page = await self.incoming_calls(after=after, limit=limit)
        return IncomingCallSnapshot(
            tuple(sorted(latest.values(), key=lambda item: item.sequence)),
            first_cursor,
        )

    def subscribe_call_events(
        self,
        *,
        after: int = 0,
        reconnect_delay: float = 0.5,
        max_reconnect_delay: float = 8.0,
        max_retries: Optional[int] = 5,
    ) -> CallSubscription:
        if self._closed:
            raise RuntimeError("client is closed")
        _page(after, 1)
        delay, maximum, retries = _reconnect_settings(
            reconnect_delay, max_reconnect_delay, max_retries
        )
        subscription = CallSubscription(
            self,
            self._url("graphql"),
            self._credential,
            after=after,
            reconnect_delay=delay,
            max_reconnect_delay=maximum,
            max_retries=retries,
            on_close=self._call_subscriptions.discard,
        )
        self._call_subscriptions.add(subscription)
        return subscription

    async def incoming_call_feed(
        self,
        *,
        limit: int = 50,
        reconnect_delay: float = 0.5,
        max_reconnect_delay: float = 8.0,
        max_retries: Optional[int] = 5,
    ) -> IncomingCallFeed:
        snapshot = await self.incoming_call_snapshot(limit=limit)
        subscription = self.subscribe_call_events(
            after=snapshot.cursor,
            reconnect_delay=reconnect_delay,
            max_reconnect_delay=max_reconnect_delay,
            max_retries=max_retries,
        )
        return IncomingCallFeed(snapshot, subscription)

    async def create_call(
        self,
        thread_id: Union[str, UUID],
        title: str,
        mode: CallMode,
        publishers: Sequence[str] = (),
    ) -> MediaSession:
        if mode not in ("audio", "video"):
            raise ValueError("call mode must be audio or video")
        return parse_media_session(
            await self._graphql(
                _operation(
                    "mutation",
                    "createCall",
                    "$threadId:ID!,$title:String!,$mode:String!,$publishers:[ID!]",
                    "threadId:$threadId,title:$title,mode:$mode,publishers:$publishers",
                    _MEDIA,
                ),
                "createCall",
                {
                    "threadId": uuid_text(thread_id, "thread ID"),
                    "title": _title(title),
                    "mode": mode,
                    "publishers": _members(publishers),
                },
            )
        )

    async def create_broadcast(
        self,
        title: str,
        publishers: Sequence[str] = (),
        *,
        audience: AudiencePolicy = "members",
    ) -> MediaSession:
        if audience not in ("members", "project"):
            raise ValueError("broadcast audience must be members or project")
        return parse_media_session(
            await self._graphql(
                _operation(
                    "mutation",
                    "createBroadcast",
                    "$title:String!,$publishers:[ID!],$audience:String",
                    "title:$title,publishers:$publishers,audience:$audience",
                    _MEDIA,
                ),
                "createBroadcast",
                {
                    "title": _title(title),
                    "publishers": _members(publishers),
                    "audience": audience,
                },
            )
        )

    async def media_session(self, media_id: Union[str, UUID]) -> MediaSession:
        return parse_media_session(
            await self._graphql(
                _operation("query", "mediaSession", "$id:ID!", "id:$id", _MEDIA),
                "mediaSession",
                {"id": uuid_text(media_id, "media ID")},
            )
        )

    async def start_media(self, media_id: Union[str, UUID]) -> MediaSession:
        return await self._media_state("startMedia", media_id)

    async def stop_media(self, media_id: Union[str, UUID]) -> MediaSession:
        return await self._media_state("stopMedia", media_id)

    async def _media_state(self, field: str, media_id: Union[str, UUID]) -> MediaSession:
        return parse_media_session(
            await self._graphql(
                _operation("mutation", field, "$id:ID!", "id:$id", _MEDIA),
                field,
                {"id": uuid_text(media_id, "media ID")},
            )
        )

    async def media_members(self, media_id: Union[str, UUID]) -> tuple[MediaMember, ...]:
        return parse_items(
            await self._graphql(
                _operation("query", "mediaMembers", "$id:ID!", "id:$id", _MEDIA_MEMBER),
                "mediaMembers",
                {"id": uuid_text(media_id, "media ID")},
            ),
            parse_media_member,
        )

    async def set_media_member(
        self,
        media_id: Union[str, UUID],
        identity_id: str,
        role: Literal["publisher", "viewer"],
    ) -> None:
        if role not in ("publisher", "viewer"):
            raise ValueError("media member role must be publisher or viewer")
        _confirmed(
            await self._graphql(
                _operation(
                    "mutation",
                    "setMediaMember",
                    "$id:ID!,$identityId:ID!,$role:String!",
                    "id:$id,identityId:$identityId,role:$role",
                ),
                "setMediaMember",
                {"id": uuid_text(media_id, "media ID"), "identityId": _identity_id(identity_id), "role": role},
            ),
            "setMediaMember",
        )

    async def remove_media_member(self, media_id: Union[str, UUID], identity_id: str) -> None:
        await self._media_identity_boolean("removeMediaMember", media_id, identity_id)

    async def _media_identity_boolean(
        self, field: str, media_id: Union[str, UUID], identity_id: str
    ) -> None:
        _confirmed(
            await self._graphql(
                _operation(
                    "mutation",
                    field,
                    "$id:ID!,$identityId:ID!",
                    "id:$id,identityId:$identityId",
                ),
                field,
                {"id": uuid_text(media_id, "media ID"), "identityId": _identity_id(identity_id)},
            ),
            field,
        )

    async def join_media(
        self, media_id: Union[str, UUID], *, renew_participant_id: Optional[Union[str, UUID]] = None
    ) -> MediaJoin:
        renewal = (
            uuid_text(renew_participant_id, "participant ID")
            if renew_participant_id is not None
            else None
        )
        return parse_media_join(
            await self._graphql(
                _operation(
                    "mutation",
                    "joinMedia",
                    "$id:ID!,$renewParticipantId:ID",
                    "id:$id,renewParticipantId:$renewParticipantId",
                    _JOIN,
                ),
                "joinMedia",
                {"id": uuid_text(media_id, "media ID"), "renewParticipantId": renewal},
            )
        )

    async def decline_call(self, media_id: Union[str, UUID]) -> None:
        await self._media_boolean("declineCall", media_id)

    async def _media_boolean(self, field: str, media_id: Union[str, UUID]) -> None:
        _confirmed(
            await self._graphql(
                _operation("mutation", field, "$id:ID!", "id:$id"),
                field,
                {"id": uuid_text(media_id, "media ID")},
            ),
            field,
        )

    async def media_participants(self, media_id: Union[str, UUID]) -> tuple[MediaParticipant, ...]:
        return parse_items(
            await self._graphql(
                _operation("query", "mediaParticipants", "$id:ID!", "id:$id", _PARTICIPANT),
                "mediaParticipants",
                {"id": uuid_text(media_id, "media ID")},
            ),
            parse_media_participant,
        )

    async def remove_media_participant(
        self, media_id: Union[str, UUID], participant_id: Union[str, UUID]
    ) -> None:
        _confirmed(
            await self._graphql(
                _operation(
                    "mutation",
                    "removeMediaParticipant",
                    "$id:ID!,$participantId:ID!",
                    "id:$id,participantId:$participantId",
                ),
                "removeMediaParticipant",
                {
                    "id": uuid_text(media_id, "media ID"),
                    "participantId": uuid_text(participant_id, "participant ID"),
                },
            ),
            "removeMediaParticipant",
        )

    async def mute_media_participant(
        self,
        media_id: Union[str, UUID],
        participant_id: Union[str, UUID],
        track_sid: str,
        muted: bool,
    ) -> None:
        if not isinstance(track_sid, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", track_sid):
            raise ValueError("track_sid must be 1-128 ASCII letters, digits, _ or -")
        if type(muted) is not bool:
            raise ValueError("muted must be a boolean")
        _confirmed(
            await self._graphql(
                _operation(
                    "mutation",
                    "muteMediaParticipant",
                    "$id:ID!,$participantId:ID!,$trackSid:String!,$muted:Boolean!",
                    "id:$id,participantId:$participantId,trackSid:$trackSid,muted:$muted",
                ),
                "muteMediaParticipant",
                {
                    "id": uuid_text(media_id, "media ID"),
                    "participantId": uuid_text(participant_id, "participant ID"),
                    "trackSid": track_sid,
                    "muted": muted,
                },
            ),
            "muteMediaParticipant",
        )

    def playback_request(
        self, media_id: Union[str, UUID], asset: str = "master.m3u8"
    ) -> PlaybackRequest:
        if self._closed:
            raise RuntimeError("client is closed")
        root = self._url(f"media/{uuid_text(media_id, 'media ID')}/hls/")
        return playback_request(root, self._credential, asset)
