"""Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

Typed ``communication`` operations. Conversations, members, messages, receipts, realtime events and live sessions inside one project.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator, Mapping, Sequence
from typing import Any

from .operations import OPERATIONS, AsyncInvoker, SyncInvoker
from .types import (
    AddMemberRequestInput,
    AddMembersInput,
    AlertLiveSessionInput,
    BroadcastPermissionChanged,
    Capabilities,
    Conversation,
    ConversationLiveInput,
    ConversationMemberBatch,
    ConversationMute,
    ConversationMuteInput,
    CreateConversationRequestInput,
    CreatePrincipalRequestInput,
    DeleteMessageRequestInput,
    DisablePrincipalRequestInput,
    EditMessageRequestInput,
    EndLiveSessionInput,
    EndLiveSessionPayload,
    GetConversationRequestInput,
    GetMessageRequestInput,
    GetOperationRequestInput,
    GetPrincipalRequestInput,
    HistoryGrantRequestInput,
    InboxItem,
    InboxPage,
    InboxRequestInput,
    IssueSessionRequestInput,
    LiveAlertBatch,
    LiveParticipantPage,
    LiveParticipantsInput,
    LiveParticipation,
    LiveSession,
    LiveSessionInput,
    LiveSessionOperation,
    LiveSessionOperationInput,
    LiveSessionPage,
    LiveSessionsInput,
    Member,
    MemberBatchEntryInput,
    MemberInputInput,
    MemberPage,
    MembersRequestInput,
    Message,
    MessageAck,
    MessagePage,
    MessagesRequestInput,
    Operation,
    Principal,
    RemoveMemberRequestInput,
    RenewSessionRequestInput,
    RequestResolution,
    ResolveRequestRequestInput,
    RevokeSessionRequestInput,
    SearchHit,
    SearchPage,
    SearchRequestInput,
    SearchScopeInput,
    SendMessageRequestInput,
    SessionBootstrap,
    SessionRequestOutcome,
    SessionRequestOutcomeRequestInput,
    SessionRevocation,
    SetBroadcastPermissionInput,
    SetConversationMuteInput,
    UpdateConversationRequestInput,
)


__all__ = [
    "AsyncCommunicationOperations",
    "CommunicationOperations",
]


class CommunicationOperations(SyncInvoker):
    """Synchronous ``communication`` operations. Conversations, members, messages, receipts, realtime events and live sessions inside one project."""

    __slots__ = ()

    def capabilities(self) -> Capabilities:
        """Describe the features, limits and API model the authority supports.

        Authorization: ``backendKey``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.capabilities"], None, None)
        return Capabilities._from_wire(_envelope["result"])

    def route(self) -> dict[str, Any]:
        """Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

        Authorization: ``backendKey``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.route"], None, None)
        _value: dict[str, Any] = _envelope["result"]
        return _value

    def get_principal(
        self,
        *,
        principal_id: str,
    ) -> Principal:
        """Read a principal (an application user).

        Authorization: ``backendKey`` with scope ``principalManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetPrincipalRequestInput(
            principal_id=principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.getPrincipal"], _input, None)
        return Principal._from_wire(_envelope["result"])

    def get_conversation(
        self,
        *,
        conversation_id: str,
    ) -> Conversation:
        """Read a conversation.

        Authorization: ``backendKey`` with scope ``conversationManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetConversationRequestInput(
            conversation_id=conversation_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.getConversation"], _input, None)
        return Conversation._from_wire(_envelope["result"])

    def members(
        self,
        *,
        conversation_id: str,
        limit: int = 100,
        cursor: str | None = None,
    ) -> MemberPage:
        """List the members of a conversation.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_members` follows the cursor for you.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = MembersRequestInput(
            conversation_id=conversation_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.members"], _input, None)
        return MemberPage._from_wire(_envelope["result"])

    def iter_members(
        self,
        *,
        conversation_id: str,
        limit: int = 100,
        cursor: str | None = None,
    ) -> Iterator[Member]:
        """Iterate the ``items`` of :meth:`members` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = MembersRequestInput(
            conversation_id=conversation_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        for _page in self._pages(OPERATIONS["communication.members"], _input):
            for _item in _page["items"]:
                yield Member._from_wire(_item)

    def messages(
        self,
        *,
        conversation_id: str,
        limit: int = 100,
        before_sequence: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> MessagePage:
        """List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``messageRead``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``sequence``. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true. :meth:`iter_messages` follows the cursor for you.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = MessagesRequestInput(
            conversation_id=conversation_id,
            limit=limit,
            before_sequence=before_sequence,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.messages"], _input, None)
        return MessagePage._from_wire(_envelope["result"])

    def iter_messages(
        self,
        *,
        conversation_id: str,
        limit: int = 100,
        before_sequence: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> Iterator[Message]:
        """Iterate the ``items`` of :meth:`messages` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = MessagesRequestInput(
            conversation_id=conversation_id,
            limit=limit,
            before_sequence=before_sequence,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        for _page in self._pages(OPERATIONS["communication.messages"], _input):
            for _item in _page["items"]:
                yield Message._from_wire(_item)

    def get_message(
        self,
        *,
        conversation_id: str,
        message_id: str,
        act_as_principal_id: str | None = None,
    ) -> Message:
        """Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``messageRead``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetMessageRequestInput(
            conversation_id=conversation_id,
            message_id=message_id,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.getMessage"], _input, None)
        return Message._from_wire(_envelope["result"])

    def inbox(
        self,
        *,
        limit: int = 100,
        cursor: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> InboxPage:
        """List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``messageRead``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_inbox` follows the cursor for you.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = InboxRequestInput(
            limit=limit,
            cursor=cursor,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.inbox"], _input, None)
        return InboxPage._from_wire(_envelope["result"])

    def iter_inbox(
        self,
        *,
        limit: int = 100,
        cursor: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> Iterator[InboxItem]:
        """Iterate the ``items`` of :meth:`inbox` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = InboxRequestInput(
            limit=limit,
            cursor=cursor,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        for _page in self._pages(OPERATIONS["communication.inbox"], _input):
            for _item in _page["items"]:
                yield InboxItem._from_wire(_item)

    def search(
        self,
        *,
        query: str,
        page_size: int = 100,
        scope: SearchScopeInput | None = None,
        cursor: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> SearchPage:
        """Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

        Authorization: ``backendKey`` with scope ``messageRead``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_search` follows the cursor for you.

        Args:
            page_size: Defaults to 100, the largest page.
        """
        _input = SearchRequestInput(
            query=query,
            page_size=page_size,
            scope=scope,
            cursor=cursor,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.search"], _input, None)
        return SearchPage._from_wire(_envelope["result"])

    def iter_search(
        self,
        *,
        query: str,
        page_size: int = 100,
        scope: SearchScopeInput | None = None,
        cursor: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> Iterator[SearchHit]:
        """Iterate the ``items`` of :meth:`search` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            page_size: Defaults to 100, the largest page.
        """
        _input = SearchRequestInput(
            query=query,
            page_size=page_size,
            scope=scope,
            cursor=cursor,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        for _page in self._pages(OPERATIONS["communication.search"], _input):
            for _item in _page["items"]:
                yield SearchHit._from_wire(_item)

    def resolve_request(
        self,
        *,
        request_id: str,
    ) -> RequestResolution:
        """Look up the stored outcome of an earlier communication mutation by its requestId.

        Authorization: ``backendKey``, when ``ownRequest``: The caller made the original request.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ResolveRequestRequestInput(
            request_id=request_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.resolveRequest"], _input, None)
        return RequestResolution._from_wire(_envelope["result"])

    def get_operation(
        self,
        *,
        operation_id: str,
    ) -> Operation:
        """Read the state of a long-running communication operation.

        Authorization: ``backendKey``, when ``operationParticipant``: The caller started the operation or can access its target.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetOperationRequestInput(
            operation_id=operation_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.getOperation"], _input, None)
        return Operation._from_wire(_envelope["result"])

    def conversation_mute(
        self,
        *,
        conversation_id: str,
        act_as_principal_id: str | None = None,
    ) -> ConversationMute:
        """Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ConversationMuteInput(
            conversation_id=conversation_id,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.conversationMute"], _input, None)
        return ConversationMute._from_wire(_envelope["result"])

    def current_live_session(
        self,
        *,
        conversation_id: str,
    ) -> LiveSession | None:
        """Return the active live session of a conversation, if any.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ConversationLiveInput(
            conversation_id=conversation_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.currentLiveSession"], _input, None)
        _value = _envelope["result"]
        return None if _value is None else LiveSession._from_wire(_value)

    def live_session(
        self,
        *,
        live_session_id: str,
    ) -> LiveSession:
        """Read a live session.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = LiveSessionInput(
            live_session_id=live_session_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.liveSession"], _input, None)
        return LiveSession._from_wire(_envelope["result"])

    def live_sessions(
        self,
        *,
        conversation_id: str,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> LiveSessionPage:
        """List the live sessions of a conversation.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_live_sessions` follows the cursor for you.

        Args:
            limit: Defaults to ``50`` on the server.
        """
        _input = LiveSessionsInput(
            conversation_id=conversation_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.liveSessions"], _input, None)
        return LiveSessionPage._from_wire(_envelope["result"])

    def iter_live_sessions(
        self,
        *,
        conversation_id: str,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> Iterator[LiveSession]:
        """Iterate the ``items`` of :meth:`live_sessions` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to ``50`` on the server.
        """
        _input = LiveSessionsInput(
            conversation_id=conversation_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        for _page in self._pages(OPERATIONS["communication.liveSessions"], _input):
            for _item in _page["items"]:
                yield LiveSession._from_wire(_item)

    def live_session_participants(
        self,
        *,
        live_session_id: str,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> LiveParticipantPage:
        """List the participants of a live session.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_live_session_participants` follows the cursor for you.

        Args:
            limit: Defaults to ``50`` on the server.
        """
        _input = LiveParticipantsInput(
            live_session_id=live_session_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.liveSessionParticipants"], _input, None)
        return LiveParticipantPage._from_wire(_envelope["result"])

    def iter_live_session_participants(
        self,
        *,
        live_session_id: str,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> Iterator[LiveParticipation]:
        """Iterate the ``items`` of :meth:`live_session_participants` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to ``50`` on the server.
        """
        _input = LiveParticipantsInput(
            live_session_id=live_session_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        for _page in self._pages(OPERATIONS["communication.liveSessionParticipants"], _input):
            for _item in _page["items"]:
                yield LiveParticipation._from_wire(_item)

    def live_session_operation(
        self,
        *,
        operation_id: str,
    ) -> LiveSessionOperation:
        """Read the state of a live session start or end operation.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = LiveSessionOperationInput(
            operation_id=operation_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.liveSessionOperation"], _input, None)
        return LiveSessionOperation._from_wire(_envelope["result"])

    def session_request_outcome(
        self,
        *,
        request_id: str,
    ) -> SessionRequestOutcome:
        """Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

        Authorization: ``backendKey`` with all of the scopes ``sessionIssue`` and ``sessionManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = SessionRequestOutcomeRequestInput(
            request_id=request_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.sessionRequestOutcome"], _input, None)
        return SessionRequestOutcome._from_wire(_envelope["result"])

    def create_principal(
        self,
        *,
        external_user_id: str,
        request_id: str | None = None,
    ) -> Principal:
        """Create a principal for an application user.

        Authorization: ``backendKey`` with scope ``principalManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreatePrincipalRequestInput(
            external_user_id=external_user_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.createPrincipal"], _input, request_id)
        return Principal._from_wire(_envelope["result"])

    def disable_principal(
        self,
        *,
        principal_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Principal:
        """Disable a principal.

        Authorization: ``backendKey`` with scope ``principalManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = DisablePrincipalRequestInput(
            principal_id=principal_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.disablePrincipal"], _input, request_id)
        return Principal._from_wire(_envelope["result"])

    def issue_session(
        self,
        *,
        principal_id: str,
        device_id: str,
        requested_ttl_ms: str,
        request_id: str | None = None,
    ) -> SessionBootstrap:
        """Issue a short-lived user session token for a principal and device.

        Authorization: ``backendKey`` with scope ``sessionIssue``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = IssueSessionRequestInput(
            principal_id=principal_id,
            device_id=device_id,
            requested_ttl_ms=requested_ttl_ms,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.issueSession"], _input, request_id)
        return SessionBootstrap._from_wire(_envelope["result"])

    def renew_session(
        self,
        *,
        session_id: str,
        principal_id: str,
        device_id: str,
        expected_revision: str,
        requested_ttl_ms: str,
        request_id: str | None = None,
    ) -> SessionBootstrap:
        """Renew a user session before it expires.

        Authorization: ``backendKey`` with scope ``sessionIssue``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RenewSessionRequestInput(
            session_id=session_id,
            principal_id=principal_id,
            device_id=device_id,
            expected_revision=expected_revision,
            requested_ttl_ms=requested_ttl_ms,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.renewSession"], _input, request_id)
        return SessionBootstrap._from_wire(_envelope["result"])

    def revoke_session(
        self,
        *,
        session_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> SessionRevocation:
        """Revoke a user session.

        Authorization: ``backendKey`` with scope ``sessionManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RevokeSessionRequestInput(
            session_id=session_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.revokeSession"], _input, request_id)
        return SessionRevocation._from_wire(_envelope["result"])

    def create_conversation(
        self,
        *,
        title: str,
        props: Mapping[str, Any],
        members: Sequence[MemberInputInput],
        request_id: str | None = None,
    ) -> Conversation:
        """Create a conversation with its initial members.

        Authorization: ``backendKey`` with scope ``conversationManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateConversationRequestInput(
            title=title,
            props=props,
            members=members,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.createConversation"], _input, request_id)
        return Conversation._from_wire(_envelope["result"])

    def update_conversation(
        self,
        *,
        conversation_id: str,
        expected_revision: str,
        title: str | None = None,
        props: Mapping[str, Any] | None = None,
        request_id: str | None = None,
    ) -> Conversation:
        """Update the title or properties of a conversation.

        Authorization: ``backendKey`` with scope ``conversationManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = UpdateConversationRequestInput(
            conversation_id=conversation_id,
            expected_revision=expected_revision,
            title=title,
            props=props,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.updateConversation"], _input, request_id)
        return Conversation._from_wire(_envelope["result"])

    def add_member(
        self,
        *,
        conversation_id: str,
        principal_id: str,
        role: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Member:
        """Add a member, or change the role of an active member.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = AddMemberRequestInput(
            conversation_id=conversation_id,
            principal_id=principal_id,
            role=role,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.addMember"], _input, request_id)
        return Member._from_wire(_envelope["result"])

    def add_members(
        self,
        *,
        conversation_id: str,
        members: Sequence[MemberBatchEntryInput],
        request_id: str | None = None,
    ) -> ConversationMemberBatch:
        """Add several members in one request.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = AddMembersInput(
            conversation_id=conversation_id,
            members=members,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.addMembers"], _input, request_id)
        return ConversationMemberBatch._from_wire(_envelope["result"])

    def remove_member(
        self,
        *,
        conversation_id: str,
        principal_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Member:
        """Remove a member from a conversation.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RemoveMemberRequestInput(
            conversation_id=conversation_id,
            principal_id=principal_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.removeMember"], _input, request_id)
        return Member._from_wire(_envelope["result"])

    def history_grant(
        self,
        *,
        conversation_id: str,
        principal_id: str,
        membership_epoch: str,
        expected_revision: str,
        from_sequence: str,
        request_id: str | None = None,
    ) -> Member:
        """Expand the history a member can see to an earlier sequence.

        Authorization: ``backendKey`` with scope ``historyManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = HistoryGrantRequestInput(
            conversation_id=conversation_id,
            principal_id=principal_id,
            membership_epoch=membership_epoch,
            expected_revision=expected_revision,
            from_sequence=from_sequence,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.historyGrant"], _input, request_id)
        return Member._from_wire(_envelope["result"])

    def send_message(
        self,
        *,
        conversation_id: str,
        text: str,
        props: Mapping[str, Any],
        act_as_principal_id: str | None = None,
        request_id: str | None = None,
    ) -> MessageAck:
        """Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``messageWrite``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = SendMessageRequestInput(
            conversation_id=conversation_id,
            text=text,
            props=props,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.sendMessage"], _input, request_id)
        return MessageAck._from_wire(_envelope["result"])

    def edit_message(
        self,
        *,
        conversation_id: str,
        message_id: str,
        expected_revision: str,
        text: str | None = None,
        props: Mapping[str, Any] | None = None,
        request_id: str | None = None,
    ) -> Message:
        """Edit a message.

        Authorization: ``backendKey`` with scope ``moderation``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = EditMessageRequestInput(
            conversation_id=conversation_id,
            message_id=message_id,
            expected_revision=expected_revision,
            text=text,
            props=props,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.editMessage"], _input, request_id)
        return Message._from_wire(_envelope["result"])

    def delete_message(
        self,
        *,
        conversation_id: str,
        message_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Message:
        """Delete a message.

        Authorization: ``backendKey`` with scope ``moderation``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = DeleteMessageRequestInput(
            conversation_id=conversation_id,
            message_id=message_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.deleteMessage"], _input, request_id)
        return Message._from_wire(_envelope["result"])

    def set_broadcast_permission(
        self,
        *,
        conversation_id: str,
        principal_id: str,
        allowed: bool,
        expected_membership_revision: str,
        request_id: str | None = None,
    ) -> BroadcastPermissionChanged:
        """Allow or deny a member to publish media in live sessions.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = SetBroadcastPermissionInput(
            conversation_id=conversation_id,
            principal_id=principal_id,
            allowed=allowed,
            expected_membership_revision=expected_membership_revision,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.setBroadcastPermission"], _input, request_id)
        return BroadcastPermissionChanged._from_wire(_envelope["result"])

    def set_conversation_mute(
        self,
        *,
        conversation_id: str,
        muted: bool,
        until: str | None = None,
        act_as_principal_id: str | None = None,
        request_id: str | None = None,
    ) -> ConversationMute:
        """Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = SetConversationMuteInput(
            conversation_id=conversation_id,
            muted=muted,
            until=until,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.setConversationMute"], _input, request_id)
        return ConversationMute._from_wire(_envelope["result"])

    def alert_live_session(
        self,
        *,
        live_session_id: str,
        expected_generation: str,
        principal_ids: Sequence[str],
        request_id: str | None = None,
    ) -> LiveAlertBatch:
        """Alert (ring) conversation members about a live session.

        Authorization: ``backendKey`` with scope ``callManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = AlertLiveSessionInput(
            live_session_id=live_session_id,
            expected_generation=expected_generation,
            principal_ids=principal_ids,
        ).to_dict()
        _envelope: dict[str, Any] = self._invoke(OPERATIONS["communication.alertLiveSession"], _input, request_id)
        return LiveAlertBatch._from_wire(_envelope["result"])

    def end_live_session(
        self,
        *,
        live_session_id: str,
        expected_generation: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> EndLiveSessionPayload:
        """End a live session for every participant. Completes asynchronously.

        Authorization: ``backendKey`` with scope ``callManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`live_session_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = EndLiveSessionInput(
            live_session_id=live_session_id,
            expected_generation=expected_generation,
            expected_revision=expected_revision,
        ).to_dict()
        return EndLiveSessionPayload._from_wire(self._invoke(OPERATIONS["communication.endLiveSession"], _input, request_id))


class AsyncCommunicationOperations(AsyncInvoker):
    """Asynchronous ``communication`` operations. Conversations, members, messages, receipts, realtime events and live sessions inside one project."""

    __slots__ = ()

    async def capabilities(self) -> Capabilities:
        """Describe the features, limits and API model the authority supports.

        Authorization: ``backendKey``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.capabilities"], None, None)
        return Capabilities._from_wire(_envelope["result"])

    async def route(self) -> dict[str, Any]:
        """Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

        Authorization: ``backendKey``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.route"], None, None)
        _value: dict[str, Any] = _envelope["result"]
        return _value

    async def get_principal(
        self,
        *,
        principal_id: str,
    ) -> Principal:
        """Read a principal (an application user).

        Authorization: ``backendKey`` with scope ``principalManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetPrincipalRequestInput(
            principal_id=principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.getPrincipal"], _input, None)
        return Principal._from_wire(_envelope["result"])

    async def get_conversation(
        self,
        *,
        conversation_id: str,
    ) -> Conversation:
        """Read a conversation.

        Authorization: ``backendKey`` with scope ``conversationManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetConversationRequestInput(
            conversation_id=conversation_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.getConversation"], _input, None)
        return Conversation._from_wire(_envelope["result"])

    async def members(
        self,
        *,
        conversation_id: str,
        limit: int = 100,
        cursor: str | None = None,
    ) -> MemberPage:
        """List the members of a conversation.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_members` follows the cursor for you.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = MembersRequestInput(
            conversation_id=conversation_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.members"], _input, None)
        return MemberPage._from_wire(_envelope["result"])

    async def iter_members(
        self,
        *,
        conversation_id: str,
        limit: int = 100,
        cursor: str | None = None,
    ) -> AsyncIterator[Member]:
        """Iterate the ``items`` of :meth:`members` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = MembersRequestInput(
            conversation_id=conversation_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        async for _page in self._pages(OPERATIONS["communication.members"], _input):
            for _item in _page["items"]:
                yield Member._from_wire(_item)

    async def messages(
        self,
        *,
        conversation_id: str,
        limit: int = 100,
        before_sequence: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> MessagePage:
        """List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``messageRead``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``sequence``. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true. :meth:`iter_messages` follows the cursor for you.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = MessagesRequestInput(
            conversation_id=conversation_id,
            limit=limit,
            before_sequence=before_sequence,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.messages"], _input, None)
        return MessagePage._from_wire(_envelope["result"])

    async def iter_messages(
        self,
        *,
        conversation_id: str,
        limit: int = 100,
        before_sequence: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> AsyncIterator[Message]:
        """Iterate the ``items`` of :meth:`messages` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = MessagesRequestInput(
            conversation_id=conversation_id,
            limit=limit,
            before_sequence=before_sequence,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        async for _page in self._pages(OPERATIONS["communication.messages"], _input):
            for _item in _page["items"]:
                yield Message._from_wire(_item)

    async def get_message(
        self,
        *,
        conversation_id: str,
        message_id: str,
        act_as_principal_id: str | None = None,
    ) -> Message:
        """Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``messageRead``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetMessageRequestInput(
            conversation_id=conversation_id,
            message_id=message_id,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.getMessage"], _input, None)
        return Message._from_wire(_envelope["result"])

    async def inbox(
        self,
        *,
        limit: int = 100,
        cursor: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> InboxPage:
        """List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``messageRead``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_inbox` follows the cursor for you.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = InboxRequestInput(
            limit=limit,
            cursor=cursor,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.inbox"], _input, None)
        return InboxPage._from_wire(_envelope["result"])

    async def iter_inbox(
        self,
        *,
        limit: int = 100,
        cursor: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> AsyncIterator[InboxItem]:
        """Iterate the ``items`` of :meth:`inbox` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to 100, the largest page.
        """
        _input = InboxRequestInput(
            limit=limit,
            cursor=cursor,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        async for _page in self._pages(OPERATIONS["communication.inbox"], _input):
            for _item in _page["items"]:
                yield InboxItem._from_wire(_item)

    async def search(
        self,
        *,
        query: str,
        page_size: int = 100,
        scope: SearchScopeInput | None = None,
        cursor: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> SearchPage:
        """Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

        Authorization: ``backendKey`` with scope ``messageRead``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_search` follows the cursor for you.

        Args:
            page_size: Defaults to 100, the largest page.
        """
        _input = SearchRequestInput(
            query=query,
            page_size=page_size,
            scope=scope,
            cursor=cursor,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.search"], _input, None)
        return SearchPage._from_wire(_envelope["result"])

    async def iter_search(
        self,
        *,
        query: str,
        page_size: int = 100,
        scope: SearchScopeInput | None = None,
        cursor: str | None = None,
        act_as_principal_id: str | None = None,
    ) -> AsyncIterator[SearchHit]:
        """Iterate the ``items`` of :meth:`search` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            page_size: Defaults to 100, the largest page.
        """
        _input = SearchRequestInput(
            query=query,
            page_size=page_size,
            scope=scope,
            cursor=cursor,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        async for _page in self._pages(OPERATIONS["communication.search"], _input):
            for _item in _page["items"]:
                yield SearchHit._from_wire(_item)

    async def resolve_request(
        self,
        *,
        request_id: str,
    ) -> RequestResolution:
        """Look up the stored outcome of an earlier communication mutation by its requestId.

        Authorization: ``backendKey``, when ``ownRequest``: The caller made the original request.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ResolveRequestRequestInput(
            request_id=request_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.resolveRequest"], _input, None)
        return RequestResolution._from_wire(_envelope["result"])

    async def get_operation(
        self,
        *,
        operation_id: str,
    ) -> Operation:
        """Read the state of a long-running communication operation.

        Authorization: ``backendKey``, when ``operationParticipant``: The caller started the operation or can access its target.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = GetOperationRequestInput(
            operation_id=operation_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.getOperation"], _input, None)
        return Operation._from_wire(_envelope["result"])

    async def conversation_mute(
        self,
        *,
        conversation_id: str,
        act_as_principal_id: str | None = None,
    ) -> ConversationMute:
        """Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ConversationMuteInput(
            conversation_id=conversation_id,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.conversationMute"], _input, None)
        return ConversationMute._from_wire(_envelope["result"])

    async def current_live_session(
        self,
        *,
        conversation_id: str,
    ) -> LiveSession | None:
        """Return the active live session of a conversation, if any.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = ConversationLiveInput(
            conversation_id=conversation_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.currentLiveSession"], _input, None)
        _value = _envelope["result"]
        return None if _value is None else LiveSession._from_wire(_value)

    async def live_session(
        self,
        *,
        live_session_id: str,
    ) -> LiveSession:
        """Read a live session.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = LiveSessionInput(
            live_session_id=live_session_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.liveSession"], _input, None)
        return LiveSession._from_wire(_envelope["result"])

    async def live_sessions(
        self,
        *,
        conversation_id: str,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> LiveSessionPage:
        """List the live sessions of a conversation.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_live_sessions` follows the cursor for you.

        Args:
            limit: Defaults to ``50`` on the server.
        """
        _input = LiveSessionsInput(
            conversation_id=conversation_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.liveSessions"], _input, None)
        return LiveSessionPage._from_wire(_envelope["result"])

    async def iter_live_sessions(
        self,
        *,
        conversation_id: str,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> AsyncIterator[LiveSession]:
        """Iterate the ``items`` of :meth:`live_sessions` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to ``50`` on the server.
        """
        _input = LiveSessionsInput(
            conversation_id=conversation_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        async for _page in self._pages(OPERATIONS["communication.liveSessions"], _input):
            for _item in _page["items"]:
                yield LiveSession._from_wire(_item)

    async def live_session_participants(
        self,
        *,
        live_session_id: str,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> LiveParticipantPage:
        """List the participants of a live session.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.

        Pagination: ``cursor``. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. :meth:`iter_live_session_participants` follows the cursor for you.

        Args:
            limit: Defaults to ``50`` on the server.
        """
        _input = LiveParticipantsInput(
            live_session_id=live_session_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.liveSessionParticipants"], _input, None)
        return LiveParticipantPage._from_wire(_envelope["result"])

    async def iter_live_session_participants(
        self,
        *,
        live_session_id: str,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> AsyncIterator[LiveParticipation]:
        """Iterate the ``items`` of :meth:`live_session_participants` across pages.

        Follows ``nextCursor`` until a page is ``complete``. A page that sets ``refreshRequired`` raises ``RESYNC_REQUIRED``; restart from the first page.

        Args:
            limit: Defaults to ``50`` on the server.
        """
        _input = LiveParticipantsInput(
            live_session_id=live_session_id,
            limit=limit,
            cursor=cursor,
        ).to_dict()
        async for _page in self._pages(OPERATIONS["communication.liveSessionParticipants"], _input):
            for _item in _page["items"]:
                yield LiveParticipation._from_wire(_item)

    async def live_session_operation(
        self,
        *,
        operation_id: str,
    ) -> LiveSessionOperation:
        """Read the state of a live session start or end operation.

        Authorization, any one of:

        - ``backendKey`` with scope ``callRead``.
        - ``backendKey`` with scope ``callManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = LiveSessionOperationInput(
            operation_id=operation_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.liveSessionOperation"], _input, None)
        return LiveSessionOperation._from_wire(_envelope["result"])

    async def session_request_outcome(
        self,
        *,
        request_id: str,
    ) -> SessionRequestOutcome:
        """Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

        Authorization: ``backendKey`` with all of the scopes ``sessionIssue`` and ``sessionManage``.

        Idempotency: ``safe``. Read-only. Repeat freely; each attempt may use a new requestId.
        """
        _input = SessionRequestOutcomeRequestInput(
            request_id=request_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.sessionRequestOutcome"], _input, None)
        return SessionRequestOutcome._from_wire(_envelope["result"])

    async def create_principal(
        self,
        *,
        external_user_id: str,
        request_id: str | None = None,
    ) -> Principal:
        """Create a principal for an application user.

        Authorization: ``backendKey`` with scope ``principalManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreatePrincipalRequestInput(
            external_user_id=external_user_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.createPrincipal"], _input, request_id)
        return Principal._from_wire(_envelope["result"])

    async def disable_principal(
        self,
        *,
        principal_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Principal:
        """Disable a principal.

        Authorization: ``backendKey`` with scope ``principalManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = DisablePrincipalRequestInput(
            principal_id=principal_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.disablePrincipal"], _input, request_id)
        return Principal._from_wire(_envelope["result"])

    async def issue_session(
        self,
        *,
        principal_id: str,
        device_id: str,
        requested_ttl_ms: str,
        request_id: str | None = None,
    ) -> SessionBootstrap:
        """Issue a short-lived user session token for a principal and device.

        Authorization: ``backendKey`` with scope ``sessionIssue``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = IssueSessionRequestInput(
            principal_id=principal_id,
            device_id=device_id,
            requested_ttl_ms=requested_ttl_ms,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.issueSession"], _input, request_id)
        return SessionBootstrap._from_wire(_envelope["result"])

    async def renew_session(
        self,
        *,
        session_id: str,
        principal_id: str,
        device_id: str,
        expected_revision: str,
        requested_ttl_ms: str,
        request_id: str | None = None,
    ) -> SessionBootstrap:
        """Renew a user session before it expires.

        Authorization: ``backendKey`` with scope ``sessionIssue``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RenewSessionRequestInput(
            session_id=session_id,
            principal_id=principal_id,
            device_id=device_id,
            expected_revision=expected_revision,
            requested_ttl_ms=requested_ttl_ms,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.renewSession"], _input, request_id)
        return SessionBootstrap._from_wire(_envelope["result"])

    async def revoke_session(
        self,
        *,
        session_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> SessionRevocation:
        """Revoke a user session.

        Authorization: ``backendKey`` with scope ``sessionManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RevokeSessionRequestInput(
            session_id=session_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.revokeSession"], _input, request_id)
        return SessionRevocation._from_wire(_envelope["result"])

    async def create_conversation(
        self,
        *,
        title: str,
        props: Mapping[str, Any],
        members: Sequence[MemberInputInput],
        request_id: str | None = None,
    ) -> Conversation:
        """Create a conversation with its initial members.

        Authorization: ``backendKey`` with scope ``conversationManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = CreateConversationRequestInput(
            title=title,
            props=props,
            members=members,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.createConversation"], _input, request_id)
        return Conversation._from_wire(_envelope["result"])

    async def update_conversation(
        self,
        *,
        conversation_id: str,
        expected_revision: str,
        title: str | None = None,
        props: Mapping[str, Any] | None = None,
        request_id: str | None = None,
    ) -> Conversation:
        """Update the title or properties of a conversation.

        Authorization: ``backendKey`` with scope ``conversationManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = UpdateConversationRequestInput(
            conversation_id=conversation_id,
            expected_revision=expected_revision,
            title=title,
            props=props,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.updateConversation"], _input, request_id)
        return Conversation._from_wire(_envelope["result"])

    async def add_member(
        self,
        *,
        conversation_id: str,
        principal_id: str,
        role: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Member:
        """Add a member, or change the role of an active member.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = AddMemberRequestInput(
            conversation_id=conversation_id,
            principal_id=principal_id,
            role=role,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.addMember"], _input, request_id)
        return Member._from_wire(_envelope["result"])

    async def add_members(
        self,
        *,
        conversation_id: str,
        members: Sequence[MemberBatchEntryInput],
        request_id: str | None = None,
    ) -> ConversationMemberBatch:
        """Add several members in one request.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = AddMembersInput(
            conversation_id=conversation_id,
            members=members,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.addMembers"], _input, request_id)
        return ConversationMemberBatch._from_wire(_envelope["result"])

    async def remove_member(
        self,
        *,
        conversation_id: str,
        principal_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Member:
        """Remove a member from a conversation.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = RemoveMemberRequestInput(
            conversation_id=conversation_id,
            principal_id=principal_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.removeMember"], _input, request_id)
        return Member._from_wire(_envelope["result"])

    async def history_grant(
        self,
        *,
        conversation_id: str,
        principal_id: str,
        membership_epoch: str,
        expected_revision: str,
        from_sequence: str,
        request_id: str | None = None,
    ) -> Member:
        """Expand the history a member can see to an earlier sequence.

        Authorization: ``backendKey`` with scope ``historyManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = HistoryGrantRequestInput(
            conversation_id=conversation_id,
            principal_id=principal_id,
            membership_epoch=membership_epoch,
            expected_revision=expected_revision,
            from_sequence=from_sequence,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.historyGrant"], _input, request_id)
        return Member._from_wire(_envelope["result"])

    async def send_message(
        self,
        *,
        conversation_id: str,
        text: str,
        props: Mapping[str, Any],
        act_as_principal_id: str | None = None,
        request_id: str | None = None,
    ) -> MessageAck:
        """Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``messageWrite``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = SendMessageRequestInput(
            conversation_id=conversation_id,
            text=text,
            props=props,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.sendMessage"], _input, request_id)
        return MessageAck._from_wire(_envelope["result"])

    async def edit_message(
        self,
        *,
        conversation_id: str,
        message_id: str,
        expected_revision: str,
        text: str | None = None,
        props: Mapping[str, Any] | None = None,
        request_id: str | None = None,
    ) -> Message:
        """Edit a message.

        Authorization: ``backendKey`` with scope ``moderation``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = EditMessageRequestInput(
            conversation_id=conversation_id,
            message_id=message_id,
            expected_revision=expected_revision,
            text=text,
            props=props,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.editMessage"], _input, request_id)
        return Message._from_wire(_envelope["result"])

    async def delete_message(
        self,
        *,
        conversation_id: str,
        message_id: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> Message:
        """Delete a message.

        Authorization: ``backendKey`` with scope ``moderation``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = DeleteMessageRequestInput(
            conversation_id=conversation_id,
            message_id=message_id,
            expected_revision=expected_revision,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.deleteMessage"], _input, request_id)
        return Message._from_wire(_envelope["result"])

    async def set_broadcast_permission(
        self,
        *,
        conversation_id: str,
        principal_id: str,
        allowed: bool,
        expected_membership_revision: str,
        request_id: str | None = None,
    ) -> BroadcastPermissionChanged:
        """Allow or deny a member to publish media in live sessions.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = SetBroadcastPermissionInput(
            conversation_id=conversation_id,
            principal_id=principal_id,
            allowed=allowed,
            expected_membership_revision=expected_membership_revision,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.setBroadcastPermission"], _input, request_id)
        return BroadcastPermissionChanged._from_wire(_envelope["result"])

    async def set_conversation_mute(
        self,
        *,
        conversation_id: str,
        muted: bool,
        until: str | None = None,
        act_as_principal_id: str | None = None,
        request_id: str | None = None,
    ) -> ConversationMute:
        """Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

        Authorization: ``backendKey`` with scope ``membershipManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = SetConversationMuteInput(
            conversation_id=conversation_id,
            muted=muted,
            until=until,
            act_as_principal_id=act_as_principal_id,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.setConversationMute"], _input, request_id)
        return ConversationMute._from_wire(_envelope["result"])

    async def alert_live_session(
        self,
        *,
        live_session_id: str,
        expected_generation: str,
        principal_ids: Sequence[str],
        request_id: str | None = None,
    ) -> LiveAlertBatch:
        """Alert (ring) conversation members about a live session.

        Authorization: ``backendKey`` with scope ``callManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = AlertLiveSessionInput(
            live_session_id=live_session_id,
            expected_generation=expected_generation,
            principal_ids=principal_ids,
        ).to_dict()
        _envelope: dict[str, Any] = await self._invoke(OPERATIONS["communication.alertLiveSession"], _input, request_id)
        return LiveAlertBatch._from_wire(_envelope["result"])

    async def end_live_session(
        self,
        *,
        live_session_id: str,
        expected_generation: str,
        expected_revision: str,
        request_id: str | None = None,
    ) -> EndLiveSessionPayload:
        """End a live session for every participant. Completes asynchronously.

        Authorization: ``backendKey`` with scope ``callManage``.

        Idempotency: ``idempotent``. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

        Long-running: returns the whole reply. Poll :meth:`live_session_operation` with ``operation_id`` set to ``operation.operation_id`` until the work completes.

        Args:
            request_id: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through ``retry_request``.
        """
        _input = EndLiveSessionInput(
            live_session_id=live_session_id,
            expected_generation=expected_generation,
            expected_revision=expected_revision,
        ).to_dict()
        return EndLiveSessionPayload._from_wire(await self._invoke(OPERATIONS["communication.endLiveSession"], _input, request_id))
