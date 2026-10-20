# `instantrelay`

Server SDK for trusted Python backends: sync and async clients for backend-key data-plane calls and management, with typed problems and recovery storage.

**Layer:** Server. **Runtime:** Python 3.11 or later. **Source:** `python/src/instantrelay`.

## Classes

### `AsyncRelay` class

```python
class AsyncRelay
```

Asynchronous backend-key client for one project, for one asyncio event loop.

Await `initialize()` once before other operations. Each method sends one request; mutations record a
recovery entry first, and run to completion even if the awaiting task is cancelled, so their outcome is
recorded. Resolve an uncertain mutation with `resolve_request()` or `retry_request()`.

#### `AsyncRelay` constructor

```python
def __init__(
    self,
    *,
    base_url: str,
    backend_key: str,
    project_id: str,
    incarnation: str,
    recovery_storage: RecoveryStorage | None = None,
    async_recovery_storage: AsyncRecoveryStorage | None = None,
    http_client: httpx.AsyncClient | None = None,
    timeout: float = 12.0,
) -> None
```

Parameters:

- `base_url`: The authority origin. Plain HTTP is accepted only for loopback hosts.
- `backend_key`: The project's backend key. Keep it on trusted servers.
- `project_id`: The project the key belongs to.
- `incarnation`: The project incarnation from the console or deployment.
- `recovery_storage`: Synchronous storage for recovery records. It runs on the event loop, so keep it fast.
- `async_recovery_storage`: Asynchronous storage for recovery records. Choose one of the two.
- `http_client`: An `httpx.AsyncClient` to send through. The SDK never closes a client it did not create.
- `timeout`: Seconds allowed for each connect, write and read, and for the whole response body.

#### `AsyncRelay.project_id` property

```python
@property
def project_id(self) -> str
```

#### `AsyncRelay.incarnation` property

```python
@property
def incarnation(self) -> str
```

#### `AsyncRelay.serving_epoch` property

```python
@property
def serving_epoch(self) -> str | None
```

The serving epoch `initialize()` observed, or `None` before it runs.

#### `AsyncRelay.initialize` method

```python
async def initialize(self) -> None
```

Reads the project route and records its serving epoch.

Raises:

- `RelayProblem`: `INCARNATION_MISMATCH` when the project has a new incarnation; recover explicitly.

Sends [`communication.route`](../../operations/communication/route.md).

#### `AsyncRelay.initialize_recovery` method

```python
async def initialize_recovery(self) -> None
```

Loads `async_recovery_storage`. Operations do this on first use; a load failure is raised to each call.

#### `AsyncRelay.retry_request` method

```python
async def retry_request(self, request_id: str) -> RequestResolution
```

Resolves a recorded mutation, resending it with its original identity only if the authority never saw it.

Returns the authority's resolution: `committed` or `accepted` once it has the request, else
`notObservedYet` after a resend whose effect is not yet visible. A request the client observed committing,
or one past its retry budget, raises `RESOLUTION_REQUIRED`; resolve it read-only with `resolve_request`.
A `replayOnly` operation cannot be looked up and raises `INVALID_REQUEST`; call the operation again with
the same `request_id` and input instead.

Raises:

- `LookupError`: This client has no recovery record for the request.
- `RelayProblem`: The authority or the recovery checks refused the retry.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `AsyncRelay.recovery_states` property

```python
@property
def recovery_states(self) -> tuple[RecoveryState, ...]
```

Snapshots of the recorded mutations, oldest first. They never contain credentials.

#### `AsyncRelay.aclose` method

```python
async def aclose(self) -> None
```

Closes the HTTP client this client created. A client passed as `http_client` stays open.

#### `AsyncRelay.capabilities` method

```python
async def capabilities(self) -> Capabilities
```

Describe the features, limits and API model the authority supports.

Authorization: `backendKey`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `AsyncRelay.route` method

```python
async def route(self) -> dict[str, Any]
```

Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

Authorization: `backendKey`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.route`](../../operations/communication/route.md).

#### `AsyncRelay.get_principal` method

```python
async def get_principal(self, *, principal_id: str) -> Principal
```

Read a principal (an application user).

Authorization: `backendKey` with scope `principalManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

#### `AsyncRelay.get_conversation` method

```python
async def get_conversation(self, *, conversation_id: str) -> Conversation
```

Read a conversation.

Authorization: `backendKey` with scope `conversationManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `AsyncRelay.members` method

```python
async def members(
    self,
    *,
    conversation_id: str,
    limit: int = 100,
    cursor: str | None = None,
) -> MemberPage
```

List the members of a conversation.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_members()` follows the cursor for you.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.members`](../../operations/communication/members.md).

#### `AsyncRelay.iter_members` method

```python
async def iter_members(
    self,
    *,
    conversation_id: str,
    limit: int = 100,
    cursor: str | None = None,
) -> AsyncIterator[Member]
```

Iterate the `items` of `members()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.members`](../../operations/communication/members.md).

#### `AsyncRelay.messages` method

```python
async def messages(
    self,
    *,
    conversation_id: str,
    limit: int = 100,
    before_sequence: str | None = None,
    act_as_principal_id: str | None = None,
) -> MessagePage
```

List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

Authorization: `backendKey` with scope `messageRead`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `sequence`. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true. `iter_messages()` follows the cursor for you.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `AsyncRelay.iter_messages` method

```python
async def iter_messages(
    self,
    *,
    conversation_id: str,
    limit: int = 100,
    before_sequence: str | None = None,
    act_as_principal_id: str | None = None,
) -> AsyncIterator[Message]
```

Iterate the `items` of `messages()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `AsyncRelay.get_message` method

```python
async def get_message(
    self,
    *,
    conversation_id: str,
    message_id: str,
    act_as_principal_id: str | None = None,
) -> Message
```

Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

Authorization: `backendKey` with scope `messageRead`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `AsyncRelay.inbox` method

```python
async def inbox(
    self,
    *,
    limit: int = 100,
    cursor: str | None = None,
    act_as_principal_id: str | None = None,
) -> InboxPage
```

List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

Authorization: `backendKey` with scope `messageRead`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_inbox()` follows the cursor for you.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `AsyncRelay.iter_inbox` method

```python
async def iter_inbox(
    self,
    *,
    limit: int = 100,
    cursor: str | None = None,
    act_as_principal_id: str | None = None,
) -> AsyncIterator[InboxItem]
```

Iterate the `items` of `inbox()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `AsyncRelay.search` method

```python
async def search(
    self,
    *,
    query: str,
    page_size: int = 100,
    scope: SearchScopeInput | None = None,
    cursor: str | None = None,
    act_as_principal_id: str | None = None,
) -> SearchPage
```

Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

Authorization: `backendKey` with scope `messageRead`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_search()` follows the cursor for you.

Parameters:

- `page_size`: Defaults to 100, the largest page.

Sends [`communication.search`](../../operations/communication/search.md).

#### `AsyncRelay.iter_search` method

```python
async def iter_search(
    self,
    *,
    query: str,
    page_size: int = 100,
    scope: SearchScopeInput | None = None,
    cursor: str | None = None,
    act_as_principal_id: str | None = None,
) -> AsyncIterator[SearchHit]
```

Iterate the `items` of `search()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `page_size`: Defaults to 100, the largest page.

Sends [`communication.search`](../../operations/communication/search.md).

#### `AsyncRelay.resolve_request` method

```python
async def resolve_request(self, *, request_id: str) -> RequestResolution
```

Look up the stored outcome of an earlier communication mutation by its requestId.

Authorization: `backendKey`, when `ownRequest`: The caller made the original request.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `AsyncRelay.get_operation` method

```python
async def get_operation(self, *, operation_id: str) -> Operation
```

Read the state of a long-running communication operation.

Authorization: `backendKey`, when `operationParticipant`: The caller started the operation or can access its target.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `AsyncRelay.conversation_mute` method

```python
async def conversation_mute(
    self,
    *,
    conversation_id: str,
    act_as_principal_id: str | None = None,
) -> ConversationMute
```

Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `AsyncRelay.current_live_session` method

```python
async def current_live_session(self, *, conversation_id: str) -> LiveSession | None
```

Return the active live session of a conversation, if any.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `AsyncRelay.live_session` method

```python
async def live_session(self, *, live_session_id: str) -> LiveSession
```

Read a live session.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `AsyncRelay.live_sessions` method

```python
async def live_sessions(
    self,
    *,
    conversation_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> LiveSessionPage
```

List the live sessions of a conversation.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_live_sessions()` follows the cursor for you.

Parameters:

- `limit`: Defaults to `50` on the server.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `AsyncRelay.iter_live_sessions` method

```python
async def iter_live_sessions(
    self,
    *,
    conversation_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> AsyncIterator[LiveSession]
```

Iterate the `items` of `live_sessions()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to `50` on the server.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `AsyncRelay.live_session_participants` method

```python
async def live_session_participants(
    self,
    *,
    live_session_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> LiveParticipantPage
```

List the participants of a live session.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_live_session_participants()` follows the cursor for you.

Parameters:

- `limit`: Defaults to `50` on the server.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `AsyncRelay.iter_live_session_participants` method

```python
async def iter_live_session_participants(
    self,
    *,
    live_session_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> AsyncIterator[LiveParticipation]
```

Iterate the `items` of `live_session_participants()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to `50` on the server.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `AsyncRelay.live_session_operation` method

```python
async def live_session_operation(self, *, operation_id: str) -> LiveSessionOperation
```

Read the state of a live session start or end operation.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `AsyncRelay.session_request_outcome` method

```python
async def session_request_outcome(self, *, request_id: str) -> SessionRequestOutcome
```

Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

Authorization: `backendKey` with all of the scopes `sessionIssue` and `sessionManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

#### `AsyncRelay.create_principal` method

```python
async def create_principal(
    self,
    *,
    external_user_id: str,
    request_id: str | None = None,
) -> Principal
```

Create a principal for an application user.

Authorization: `backendKey` with scope `principalManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

#### `AsyncRelay.disable_principal` method

```python
async def disable_principal(
    self,
    *,
    principal_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Principal
```

Disable a principal.

Authorization: `backendKey` with scope `principalManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

#### `AsyncRelay.issue_session` method

```python
async def issue_session(
    self,
    *,
    principal_id: str,
    device_id: str,
    requested_ttl_ms: str,
    request_id: str | None = None,
) -> SessionBootstrap
```

Issue a short-lived user session token for a principal and device.

Authorization: `backendKey` with scope `sessionIssue`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

#### `AsyncRelay.renew_session` method

```python
async def renew_session(
    self,
    *,
    session_id: str,
    principal_id: str,
    device_id: str,
    expected_revision: str,
    requested_ttl_ms: str,
    request_id: str | None = None,
) -> SessionBootstrap
```

Renew a user session before it expires.

Authorization: `backendKey` with scope `sessionIssue`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

#### `AsyncRelay.revoke_session` method

```python
async def revoke_session(
    self,
    *,
    session_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> SessionRevocation
```

Revoke a user session.

Authorization: `backendKey` with scope `sessionManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `AsyncRelay.create_conversation` method

```python
async def create_conversation(
    self,
    *,
    title: str,
    props: Mapping[str, Any],
    members: Sequence[MemberInputInput],
    request_id: str | None = None,
) -> Conversation
```

Create a conversation with its initial members.

Authorization: `backendKey` with scope `conversationManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `AsyncRelay.update_conversation` method

```python
async def update_conversation(
    self,
    *,
    conversation_id: str,
    expected_revision: str,
    title: str | None = None,
    props: Mapping[str, Any] | None = None,
    request_id: str | None = None,
) -> Conversation
```

Update the title or properties of a conversation.

Authorization: `backendKey` with scope `conversationManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

#### `AsyncRelay.add_member` method

```python
async def add_member(
    self,
    *,
    conversation_id: str,
    principal_id: str,
    role: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Member
```

Add a member, or change the role of an active member.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.addMember`](../../operations/communication/addMember.md).

#### `AsyncRelay.add_members` method

```python
async def add_members(
    self,
    *,
    conversation_id: str,
    members: Sequence[MemberBatchEntryInput],
    request_id: str | None = None,
) -> ConversationMemberBatch
```

Add several members in one request.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

#### `AsyncRelay.remove_member` method

```python
async def remove_member(
    self,
    *,
    conversation_id: str,
    principal_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Member
```

Remove a member from a conversation.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

#### `AsyncRelay.history_grant` method

```python
async def history_grant(
    self,
    *,
    conversation_id: str,
    principal_id: str,
    membership_epoch: str,
    expected_revision: str,
    from_sequence: str,
    request_id: str | None = None,
) -> Member
```

Expand the history a member can see to an earlier sequence.

Authorization: `backendKey` with scope `historyManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.historyGrant`](../../operations/communication/historyGrant.md).

#### `AsyncRelay.send_message` method

```python
async def send_message(
    self,
    *,
    conversation_id: str,
    text: str,
    props: Mapping[str, Any],
    act_as_principal_id: str | None = None,
    request_id: str | None = None,
) -> MessageAck
```

Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

Authorization: `backendKey` with scope `messageWrite`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `AsyncRelay.edit_message` method

```python
async def edit_message(
    self,
    *,
    conversation_id: str,
    message_id: str,
    expected_revision: str,
    text: str | None = None,
    props: Mapping[str, Any] | None = None,
    request_id: str | None = None,
) -> Message
```

Edit a message.

Authorization: `backendKey` with scope `moderation`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `AsyncRelay.delete_message` method

```python
async def delete_message(
    self,
    *,
    conversation_id: str,
    message_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Message
```

Delete a message.

Authorization: `backendKey` with scope `moderation`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `AsyncRelay.set_broadcast_permission` method

```python
async def set_broadcast_permission(
    self,
    *,
    conversation_id: str,
    principal_id: str,
    allowed: bool,
    expected_membership_revision: str,
    request_id: str | None = None,
) -> BroadcastPermissionChanged
```

Allow or deny a member to publish media in live sessions.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md).

#### `AsyncRelay.set_conversation_mute` method

```python
async def set_conversation_mute(
    self,
    *,
    conversation_id: str,
    muted: bool,
    until: str | None = None,
    act_as_principal_id: str | None = None,
    request_id: str | None = None,
) -> ConversationMute
```

Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `AsyncRelay.alert_live_session` method

```python
async def alert_live_session(
    self,
    *,
    live_session_id: str,
    expected_generation: str,
    principal_ids: Sequence[str],
    request_id: str | None = None,
) -> LiveAlertBatch
```

Alert (ring) conversation members about a live session.

Authorization: `backendKey` with scope `callManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `AsyncRelay.end_live_session` method

```python
async def end_live_session(
    self,
    *,
    live_session_id: str,
    expected_generation: str,
    expected_revision: str,
    request_id: str | None = None,
) -> EndLiveSessionPayload
```

End a live session for every participant. Completes asynchronously.

Authorization: `backendKey` with scope `callManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `live_session_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

### `AsyncRelayManagement` class

```python
class AsyncRelayManagement
```

Asynchronous management client, for one asyncio event loop.

#### `AsyncRelayManagement` constructor

```python
def __init__(
    self,
    *,
    base_url: str,
    access_token: str,
    actor_id: str,
    recovery_storage: RecoveryStorage | None = None,
    async_recovery_storage: AsyncRecoveryStorage | None = None,
    http_client: httpx.AsyncClient | None = None,
    timeout: float = 12.0,
) -> None
```

Parameters:

- `base_url`: The authority origin. Plain HTTP is accepted only for loopback hosts.
- `access_token`: An operator access token. Keep it on trusted servers.
- `actor_id`: The operator the token belongs to; it scopes stored recovery records.
- `recovery_storage`: Synchronous storage for recovery records. It runs on the event loop, so keep it fast.
- `async_recovery_storage`: Asynchronous storage for recovery records. Choose one of the two.
- `http_client`: An `httpx.AsyncClient` to send through. The SDK never closes a client it did not create.
- `timeout`: Seconds allowed for each connect, write and read, and for the whole response body.

#### `AsyncRelayManagement.actor_id` property

```python
@property
def actor_id(self) -> str
```

#### `AsyncRelayManagement.initialize_recovery` method

```python
async def initialize_recovery(self) -> None
```

Loads `async_recovery_storage`. Operations do this on first use; a load failure is raised to each call.

#### `AsyncRelayManagement.retry_request` method

```python
async def retry_request(self, request_id: str) -> RequestResolution
```

Resolves a recorded mutation, resending it with its original identity only if the authority never saw it.

Returns the authority's resolution: `committed` or `accepted` once it has the request, else
`notObservedYet` after a resend whose effect is not yet visible. A request the client observed committing,
or one past its retry budget, raises `RESOLUTION_REQUIRED`; resolve it read-only with `resolve_request`.
A `replayOnly` operation cannot be looked up and raises `INVALID_REQUEST`; call the operation again with
the same `request_id` and input instead.

Raises:

- `LookupError`: This client has no recovery record for the request.
- `RelayProblem`: The authority or the recovery checks refused the retry.

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `AsyncRelayManagement.recovery_states` property

```python
@property
def recovery_states(self) -> tuple[RecoveryState, ...]
```

Snapshots of the recorded mutations, oldest first. They never contain credentials.

#### `AsyncRelayManagement.aclose` method

```python
async def aclose(self) -> None
```

Closes the HTTP client this client created. A client passed as `http_client` stays open.

#### `AsyncRelayManagement.capabilities` method

```python
async def capabilities(self) -> Capabilities
```

Describe the management features and limits the authority supports.

Authorization: `portalCredential`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.capabilities`](../../operations/management/capabilities.md).

#### `AsyncRelayManagement.organizations` method

```python
async def organizations(self) -> OrganizationPage
```

List the organizations the caller can access.

Authorization: `portalCredential`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `bounded`. One bounded page without a cursor input. complete reports whether every item fit.

Sends [`management.organizations`](../../operations/management/organizations.md).

#### `AsyncRelayManagement.get_organization` method

```python
async def get_organization(self, *, org_id: str) -> Organization
```

Read an organization.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.getOrganization`](../../operations/management/getOrganization.md).

#### `AsyncRelayManagement.get_deployment` method

```python
async def get_deployment(self, *, deployment_id: str) -> Deployment
```

Read a deployment.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.getDeployment`](../../operations/management/getDeployment.md).

#### `AsyncRelayManagement.get_project` method

```python
async def get_project(self, *, project_id: str) -> Project
```

Read a project.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.getProject`](../../operations/management/getProject.md).

#### `AsyncRelayManagement.deployment_health` method

```python
async def deployment_health(self, *, deployment_id: str) -> DeploymentHealth
```

Read the health of a deployment.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.deploymentHealth`](../../operations/management/deploymentHealth.md).

#### `AsyncRelayManagement.deployment_usage` method

```python
async def deployment_usage(
    self,
    *,
    deployment_id: str,
    from_: str | None = None,
    to: str | None = None,
) -> DeploymentUsage
```

Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.deploymentUsage`](../../operations/management/deploymentUsage.md).

#### `AsyncRelayManagement.project_usage` method

```python
async def project_usage(
    self,
    *,
    project_id: str,
    from_: str | None = None,
    to: str | None = None,
) -> ProjectUsage
```

Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.projectUsage`](../../operations/management/projectUsage.md).

#### `AsyncRelayManagement.organization_usage` method

```python
async def organization_usage(
    self,
    *,
    org_id: str,
    from_: str | None = None,
    to: str | None = None,
) -> OrganizationUsage
```

Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.organizationUsage`](../../operations/management/organizationUsage.md).

#### `AsyncRelayManagement.organization_billing` method

```python
async def organization_billing(self, *, org_id: str) -> OrganizationBilling
```

Read the billing state of an organization in any status: the plan whose limits apply, whether Relay bills the organization and, when it does, its standing and subscription.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

#### `AsyncRelayManagement.webhook_endpoints` method

```python
async def webhook_endpoints(self, *, project_id: str) -> WebhookEndpointPage
```

List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `bounded`. One bounded page without a cursor input. complete reports whether every item fit.

Sends [`management.webhookEndpoints`](../../operations/management/webhookEndpoints.md).

#### `AsyncRelayManagement.webhook_deliveries` method

```python
async def webhook_deliveries(
    self,
    *,
    project_id: str,
    endpoint_id: str,
) -> WebhookDeliveryPage
```

List recent deliveries of a webhook endpoint.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `bounded`. One bounded page without a cursor input. complete reports whether every item fit.

Sends [`management.webhookDeliveries`](../../operations/management/webhookDeliveries.md).

#### `AsyncRelayManagement.resolve_request` method

```python
async def resolve_request(self, *, request_id: str) -> RequestResolution
```

Look up the stored outcome of an earlier management mutation by its requestId.

Authorization: `portalCredential`, when `ownRequest`: The caller made the original request.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `AsyncRelayManagement.get_operation` method

```python
async def get_operation(self, *, operation_id: str) -> Operation
```

Read the state of a long-running management operation.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.getOperation`](../../operations/management/getOperation.md).

#### `AsyncRelayManagement.agent_signup_for_approval` method

```python
async def agent_signup_for_approval(self, *, approval_token: str) -> AgentSignupReview
```

Read a pending agent signup request for its approval page, with the agent's suggested plan, scopes and monthly spend cap.

Authorization: No credential (`anonymous`); the authority ignores the client's token, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

#### `AsyncRelayManagement.agent_signup` method

```python
async def agent_signup(self) -> AgentSignupStatus
```

Read the agent's own signup: its state and, once approved, the organization, project, grant scopes and expiry, and keys. Poll no more often than the ticket's pollAfterSeconds.

Authorization: `agentVerifier`, when `ownSignup`: The verifier is the one whose digest the signup request carries.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

#### `AsyncRelayManagement.agent_grants` method

```python
async def agent_grants(
    self,
    *,
    org_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> AgentGrantPage
```

List an organization's agent grants with their keys, newest first.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_agent_grants()` follows the cursor for you.

Parameters:

- `limit`: Defaults to `50` on the server.

#### `AsyncRelayManagement.iter_agent_grants` method

```python
async def iter_agent_grants(
    self,
    *,
    org_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> AsyncIterator[AgentGrant]
```

Iterate the `items` of `agent_grants()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to `50` on the server.

#### `AsyncRelayManagement.agent_audit_events` method

```python
async def agent_audit_events(
    self,
    *,
    org_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> AgentAuditEventPage
```

List an organization's agent audit trail, newest first: the approval, provisioning, keys, revocations, spend-control changes and purchases.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_agent_audit_events()` follows the cursor for you.

Parameters:

- `limit`: Defaults to `50` on the server.

#### `AsyncRelayManagement.iter_agent_audit_events` method

```python
async def iter_agent_audit_events(
    self,
    *,
    org_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> AsyncIterator[AgentAuditEvent]
```

Iterate the `items` of `agent_audit_events()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to `50` on the server.

#### `AsyncRelayManagement.organization_spend` method

```python
async def organization_spend(self, *, org_id: str) -> OrganizationSpend
```

Read the organization's spend this month: its cap, credits, minimum credit, charge limit, charges, margin, spend stop and the freshness of its usage.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

#### `AsyncRelayManagement.create_organization` method

```python
async def create_organization(
    self,
    *,
    name: str,
    terms_ref: str,
    request_id: str | None = None,
) -> Organization
```

Create an organization.

Authorization: `portalCredential`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.createOrganization`](../../operations/management/createOrganization.md).

#### `AsyncRelayManagement.create_deployment` method

```python
async def create_deployment(
    self,
    *,
    org_id: str,
    offering: str,
    geo_id: str,
    installation_profile_id: str,
    consent_ref: str,
    request_id: str | None = None,
) -> CreateDeploymentReply
```

Create a deployment in an organization. Completes asynchronously.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.createDeployment`](../../operations/management/createDeployment.md).

#### `AsyncRelayManagement.create_project` method

```python
async def create_project(
    self,
    *,
    deployment_id: str,
    name: str,
    environment: str,
    backend_principal_name: str,
    request_id: str | None = None,
) -> CreateProjectReply
```

Create a project in a ready deployment. Completes asynchronously.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.createProject`](../../operations/management/createProject.md).

#### `AsyncRelayManagement.issue_backend_key` method

```python
async def issue_backend_key(
    self,
    *,
    project_id: str,
    name: str,
    scopes: Sequence[str],
    expires_at: str,
    request_id: str | None = None,
) -> IssueBackendKeyReply
```

Issue a scoped backend key. The secret is delivered once through a credential delivery.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

#### `AsyncRelayManagement.revoke_backend_key` method

```python
async def revoke_backend_key(
    self,
    *,
    project_id: str,
    key_id: str,
    expected_revision: str,
    revoke_issued_sessions: bool,
    request_id: str | None = None,
) -> RevokeBackendKeyReply
```

Revoke a backend key, optionally revoking the sessions it issued.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.revokeBackendKey`](../../operations/management/revokeBackendKey.md).

#### `AsyncRelayManagement.project_policy` method

```python
async def project_policy(
    self,
    *,
    project_id: str,
    expected_revision: str,
    change: PolicyChangeInput,
    request_id: str | None = None,
) -> ProjectPolicyReply
```

Change the policy of a project.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.projectPolicy`](../../operations/management/projectPolicy.md).

#### `AsyncRelayManagement.credential_permit` method

```python
async def credential_permit(
    self,
    *,
    project_id: str,
    delivery_id: str,
    redemption_request_id: str,
    request_id: str | None = None,
) -> dict[str, Any]
```

Issue a signed permit that authorizes redeeming one credential delivery.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.credentialPermit`](../../operations/management/credentialPermit.md).

#### `AsyncRelayManagement.pause_operation` method

```python
async def pause_operation(
    self,
    *,
    operation_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Operation
```

Pause a long-running operation.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.pauseOperation`](../../operations/management/pauseOperation.md).

#### `AsyncRelayManagement.resume_operation` method

```python
async def resume_operation(
    self,
    *,
    operation_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Operation
```

Resume a paused or blocked operation.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.resumeOperation`](../../operations/management/resumeOperation.md).

#### `AsyncRelayManagement.create_billing_checkout_session` method

```python
async def create_billing_checkout_session(
    self,
    *,
    org_id: str,
    plan_id: str,
    request_id: str | None = None,
) -> BillingCheckoutSession
```

Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `singleUse`. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `AsyncRelayManagement.create_billing_portal_session` method

```python
async def create_billing_portal_session(
    self,
    *,
    org_id: str,
    request_id: str | None = None,
) -> BillingPortalSession
```

Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `singleUse`. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `AsyncRelayManagement.configure_webhook` method

```python
async def configure_webhook(
    self,
    *,
    project_id: str,
    url: str,
    event_types: Sequence[str],
    consent_ref: str,
    request_id: str | None = None,
) -> ConfigureWebhookReply
```

Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.configureWebhook`](../../operations/management/configureWebhook.md).

#### `AsyncRelayManagement.update_webhook` method

```python
async def update_webhook(
    self,
    *,
    project_id: str,
    endpoint_id: str,
    expected_revision: str,
    event_types: Sequence[str],
    enabled: bool,
    request_id: str | None = None,
) -> UpdateWebhookReply
```

Change the event types of a webhook endpoint, or enable or disable it.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.updateWebhook`](../../operations/management/updateWebhook.md).

#### `AsyncRelayManagement.rotate_webhook_secret` method

```python
async def rotate_webhook_secret(
    self,
    *,
    project_id: str,
    endpoint_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> RotateWebhookSecretReply
```

Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md).

#### `AsyncRelayManagement.disable_webhook` method

```python
async def disable_webhook(
    self,
    *,
    project_id: str,
    endpoint_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> DisableWebhookReply
```

Disable a webhook endpoint.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.disableWebhook`](../../operations/management/disableWebhook.md).

#### `AsyncRelayManagement.replay_webhook_deliveries` method

```python
async def replay_webhook_deliveries(
    self,
    *,
    project_id: str,
    endpoint_id: str,
    effect_id: str | None = None,
    since: str | None = None,
    until: str | None = None,
    request_id: str | None = None,
) -> ReplayWebhookDeliveriesReply
```

Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.replayWebhookDeliveries`](../../operations/management/replayWebhookDeliveries.md).

#### `AsyncRelayManagement.request_agent_signup` method

```python
async def request_agent_signup(
    self,
    *,
    owner_email: str,
    poll_challenge: str,
    organization_name: str,
    agent_name: str,
    suggested_scopes: Sequence[str],
    purpose: str | None = None,
    suggested_plan: str | None = None,
    suggested_monthly_spend_cap: str | None = None,
    request_id: str | None = None,
) -> AgentSignupTicket
```

Request an organization for a named human owner, who approves it from an emailed link. Nothing is usable before approval.

Authorization: No credential (`anonymous`); the authority ignores the client's token.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

#### `AsyncRelayManagement.reject_agent_signup` method

```python
async def reject_agent_signup(
    self,
    *,
    approval_token: str,
    suppress_future_requests: bool,
    request_id: str | None = None,
) -> AgentSignupStatus
```

Reject a signup request from its approval link, optionally suppressing future requests to the email.

Authorization: No credential (`anonymous`); the authority ignores the client's token, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

#### `AsyncRelayManagement.approve_agent_signup` method

```python
async def approve_agent_signup(
    self,
    *,
    approval_token: str,
    confirmation_code: str,
    terms_ref: str,
    plan: str,
    scopes: Sequence[str],
    monthly_spend_cap: str,
    agent_purchase_limit: str | None = None,
    grant_expires_at: str | None = None,
    request_id: str | None = None,
) -> AgentSignupStatus
```

Approve a signup request with its approval token and the agent's confirmation code, choosing the plan, scopes, monthly spend cap, agent purchase limit and grant expiry. The signed-in approver becomes the owner.

Authorization: `portalCredential`, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `AsyncRelayManagement.issue_agent_key` method

```python
async def issue_agent_key(
    self,
    *,
    scopes: Sequence[str],
    expires_at: str | None = None,
    request_id: str | None = None,
) -> AgentKey
```

Issue a backend key for the agent within its grant's scopes and expiry. The result is the pending key; poll agentSignup until it shows the key's delivery, then redeem it with agentCredentialPermit.

Authorization: `agentVerifier`, when `activeGrant`: The agent's grant is neither revoked nor expired, and its organization is active.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

#### `AsyncRelayManagement.agent_credential_permit` method

```python
async def agent_credential_permit(
    self,
    *,
    delivery_id: str,
    redemption_request_id: str,
    request_id: str | None = None,
) -> dict[str, Any]
```

Issue a permit that authorizes the agent to redeem one of its key deliveries.

Authorization: `agentVerifier`, when `activeGrant`: The agent's grant is neither revoked nor expired, and its organization is active.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

#### `AsyncRelayManagement.revoke_agent_grant` method

```python
async def revoke_agent_grant(
    self,
    *,
    grant_id: str,
    revoke_issued_sessions: bool,
    request_id: str | None = None,
) -> AgentGrant
```

Revoke an agent grant and every key issued under it.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `AsyncRelayManagement.set_spend_controls` method

```python
async def set_spend_controls(
    self,
    *,
    org_id: str,
    monthly_spend_cap: str,
    agent_purchase_limit: str | None = None,
    request_id: str | None = None,
) -> OrganizationSpend
```

Set the organization's monthly spend cap and agent purchase limit.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `AsyncRelayManagement.purchase_agent_credits` method

```python
async def purchase_agent_credits(
    self,
    *,
    amount: str,
    shared_payment_token: str,
    request_id: str | None = None,
) -> AgentPayment
```

Buy prepaid credits with a Shared Payment Token, within the owner's agent purchase limit.

Authorization: `agentVerifier`, when `activeGrant`: The agent's grant is neither revoked nor expired, and its organization is active.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

### `CreditsExhaustedProblem` class

```python
class CreditsExhaustedProblem(RelayProblem)
```

`CREDITS_EXHAUSTED`: prepaid credits are spent and the monthly spend cap is zero (402, not retryable).

Billable usage beyond the plan's allowances is refused before any effect; usage within them continues. Add
credits or raise the cap, then send a new request.

#### `CreditsExhaustedProblem.code` property

```python
code: str
```

The error code, for example `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`.

Inherited from `RelayProblem`.

#### `CreditsExhaustedProblem.request_id` property

```python
request_id: str
```

The request the problem belongs to.

Inherited from `RelayProblem`.

#### `CreditsExhaustedProblem.outcome` property

```python
outcome: str
```

`rejected`, `committed`, `accepted` or `unknown`.

Inherited from `RelayProblem`.

#### `CreditsExhaustedProblem.status` property

```python
status: int
```

The HTTP status, or 0 when no response was received or storage failed.

Inherited from `RelayProblem`.

#### `CreditsExhaustedProblem.retry_after` property

```python
retry_after: int | None
```

Whole seconds to wait before resending the same request, when the authority sent a delay
(`extensions.retryAfter`, else an HTTP `Retry-After` delay in seconds). The SDK never waits or
resends on its own because of it.

Inherited from `RelayProblem`.

#### `CreditsExhaustedProblem` constructor

```python
def __init__(
    self,
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    *,
    retry_after: int | None = None,
) -> None
```

Inherited from `RelayProblem`.

#### `CreditsExhaustedProblem.message` property

```python
@property
def message(self) -> str
```

Inherited from `RelayProblem`.

#### `CreditsExhaustedProblem.retryable` property

```python
@property
def retryable(self) -> bool
```

Whether the error catalog marks the code as retryable with the same request ID.

Inherited from `RelayProblem`.

### `MemoryStorage` class

```python
class MemoryStorage
```

In-process `RecoveryStorage`. Records survive client reconstruction but not a process restart.

#### `MemoryStorage` constructor

```python
def __init__(self) -> None
```

#### `MemoryStorage.get_item` method

```python
def get_item(self, key: str) -> str | None
```

#### `MemoryStorage.set_item` method

```python
def set_item(self, key: str, value: str) -> None
```

#### `MemoryStorage.remove_item` method

```python
def remove_item(self, key: str) -> None
```

#### `MemoryStorage.clear` method

```python
def clear(self) -> None
```

### `PlanLimitExceededProblem` class

```python
class PlanLimitExceededProblem(RelayProblem)
```

`PLAN_LIMIT_EXCEEDED`: the plan does not permit the resource or feature.

#### `PlanLimitExceededProblem.code` property

```python
code: str
```

The error code, for example `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`.

Inherited from `RelayProblem`.

#### `PlanLimitExceededProblem.request_id` property

```python
request_id: str
```

The request the problem belongs to.

Inherited from `RelayProblem`.

#### `PlanLimitExceededProblem.outcome` property

```python
outcome: str
```

`rejected`, `committed`, `accepted` or `unknown`.

Inherited from `RelayProblem`.

#### `PlanLimitExceededProblem.status` property

```python
status: int
```

The HTTP status, or 0 when no response was received or storage failed.

Inherited from `RelayProblem`.

#### `PlanLimitExceededProblem.retry_after` property

```python
retry_after: int | None
```

Whole seconds to wait before resending the same request, when the authority sent a delay
(`extensions.retryAfter`, else an HTTP `Retry-After` delay in seconds). The SDK never waits or
resends on its own because of it.

Inherited from `RelayProblem`.

#### `PlanLimitExceededProblem` constructor

```python
def __init__(
    self,
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    *,
    retry_after: int | None = None,
) -> None
```

Inherited from `RelayProblem`.

#### `PlanLimitExceededProblem.message` property

```python
@property
def message(self) -> str
```

Inherited from `RelayProblem`.

#### `PlanLimitExceededProblem.retryable` property

```python
@property
def retryable(self) -> bool
```

Whether the error catalog marks the code as retryable with the same request ID.

Inherited from `RelayProblem`.

### `PushPayloadError` class

```python
class PushPayloadError(Exception)
```

A push payload that couldn't be built. The message names the field but never contains its value.

Re-exported from `instantrelay.push`.

#### `PushPayloadError.code` property

```python
code: PushPayloadCode
```

#### `PushPayloadError` constructor

```python
def __init__(self, code: PushPayloadCode, message: str) -> None
```

#### `PushPayloadError.message` property

```python
@property
def message(self) -> str
```

### `QuotaExceededProblem` class

```python
class QuotaExceededProblem(RelayProblem)
```

`QUOTA_EXCEEDED`: a hard usage quota refused new work until `retry_after` seconds pass.

#### `QuotaExceededProblem.code` property

```python
code: str
```

The error code, for example `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`.

Inherited from `RelayProblem`.

#### `QuotaExceededProblem.request_id` property

```python
request_id: str
```

The request the problem belongs to.

Inherited from `RelayProblem`.

#### `QuotaExceededProblem.outcome` property

```python
outcome: str
```

`rejected`, `committed`, `accepted` or `unknown`.

Inherited from `RelayProblem`.

#### `QuotaExceededProblem.status` property

```python
status: int
```

The HTTP status, or 0 when no response was received or storage failed.

Inherited from `RelayProblem`.

#### `QuotaExceededProblem.retry_after` property

```python
retry_after: int | None
```

Whole seconds to wait before resending the same request, when the authority sent a delay
(`extensions.retryAfter`, else an HTTP `Retry-After` delay in seconds). The SDK never waits or
resends on its own because of it.

Inherited from `RelayProblem`.

#### `QuotaExceededProblem` constructor

```python
def __init__(
    self,
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    *,
    retry_after: int | None = None,
) -> None
```

Inherited from `RelayProblem`.

#### `QuotaExceededProblem.message` property

```python
@property
def message(self) -> str
```

Inherited from `RelayProblem`.

#### `QuotaExceededProblem.retryable` property

```python
@property
def retryable(self) -> bool
```

Whether the error catalog marks the code as retryable with the same request ID.

Inherited from `RelayProblem`.

### `RateLimitedProblem` class

```python
class RateLimitedProblem(RelayProblem)
```

`RATE_LIMITED`: wait `retry_after` seconds, then resend with the same request ID.

#### `RateLimitedProblem.code` property

```python
code: str
```

The error code, for example `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`.

Inherited from `RelayProblem`.

#### `RateLimitedProblem.request_id` property

```python
request_id: str
```

The request the problem belongs to.

Inherited from `RelayProblem`.

#### `RateLimitedProblem.outcome` property

```python
outcome: str
```

`rejected`, `committed`, `accepted` or `unknown`.

Inherited from `RelayProblem`.

#### `RateLimitedProblem.status` property

```python
status: int
```

The HTTP status, or 0 when no response was received or storage failed.

Inherited from `RelayProblem`.

#### `RateLimitedProblem.retry_after` property

```python
retry_after: int | None
```

Whole seconds to wait before resending the same request, when the authority sent a delay
(`extensions.retryAfter`, else an HTTP `Retry-After` delay in seconds). The SDK never waits or
resends on its own because of it.

Inherited from `RelayProblem`.

#### `RateLimitedProblem` constructor

```python
def __init__(
    self,
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    *,
    retry_after: int | None = None,
) -> None
```

Inherited from `RelayProblem`.

#### `RateLimitedProblem.message` property

```python
@property
def message(self) -> str
```

Inherited from `RelayProblem`.

#### `RateLimitedProblem.retryable` property

```python
@property
def retryable(self) -> bool
```

Whether the error catalog marks the code as retryable with the same request ID.

Inherited from `RelayProblem`.

### `RecoveryState` class

```python
@dataclasses.dataclass(frozen=True, slots=True, kw_only=True)
class RecoveryState
```

A snapshot of one mutation's recovery record.

#### `RecoveryState.request_id` property

```python
request_id: str
```

The mutation's request ID.

#### `RecoveryState.incarnation` property

```python
incarnation: str
```

The project incarnation it was sent in (`"management"` for management mutations).

#### `RecoveryState.payload_fingerprint` property

```python
payload_fingerprint: str
```

`sha256:` digest of the operation, project and input.

#### `RecoveryState.operation` property

```python
operation: str
```

Operation ID, for example `communication.sendMessage`.

#### `RecoveryState.project_id` property

```python
project_id: str | None
```

The project, for communication mutations.

#### `RecoveryState.input` property

```python
input: Mapping[str, Any]
```

A copy of the exact input sent.

#### `RecoveryState.first_submitted_at` property

```python
first_submitted_at: int
```

Unix milliseconds when the record was created.

#### `RecoveryState.retry_deadline` property

```python
retry_deadline: int
```

Unix milliseconds after which the SDK no longer resends it.

#### `RecoveryState.attempt_count` property

```python
attempt_count: int
```

Attempts sent so far.

#### `RecoveryState.last_attempt_at` property

```python
last_attempt_at: int
```

Unix milliseconds of the latest attempt.

#### `RecoveryState.last_attempt_classification` property

```python
last_attempt_classification: str
```

`notSubmitted`, `submitted`, `authorityReceipt`, an error code or
`opaqueTransportFailure`.

#### `RecoveryState.resolution_state` property

```python
resolution_state: Literal["pending", "unknown", "rejected", "committed", "accepted"]
```

`pending` (never sent), `unknown`, `rejected` (the authority rejected every attempt),
`committed` or `accepted`.

#### `RecoveryState.media_admission_attempted` property

```python
media_admission_attempted: bool = False
```

Whether native media admission used this request's credentials.

#### `RecoveryState` constructor

```python
def __init__(
    self,
    *,
    request_id: str,
    incarnation: str,
    payload_fingerprint: str,
    operation: str,
    project_id: str | None,
    input: Mapping[str, Any],
    first_submitted_at: int,
    retry_deadline: int,
    attempt_count: int,
    last_attempt_at: int,
    last_attempt_classification: str,
    resolution_state: Literal["pending", "unknown", "rejected", "committed", "accepted"],
    media_admission_attempted: bool = False,
) -> None
```

### `Relay` class

```python
class Relay
```

Backend-key client for one project.

Call `initialize()` once before other operations: it checks the project incarnation and records the serving
epoch that later requests report. Every method sends one request; mutations accept `request_id` and record a
recovery entry first, so an uncertain outcome can be resolved with `resolve_request()` or
`retry_request()`. The client never resends on its own. It is safe to share between threads.

#### `Relay` constructor

```python
def __init__(
    self,
    *,
    base_url: str,
    backend_key: str,
    project_id: str,
    incarnation: str,
    recovery_storage: RecoveryStorage | None = None,
    http_client: httpx.Client | None = None,
    timeout: float = 12.0,
) -> None
```

Parameters:

- `base_url`: The authority origin, for example `https://api.relay.example`. Plain HTTP is accepted only
  for loopback hosts.
- `backend_key`: The project's backend key. Keep it on trusted servers.
- `project_id`: The project the key belongs to.
- `incarnation`: The project incarnation from the console or deployment.
- `recovery_storage`: Durable storage for mutation recovery records; in memory only when omitted.
- `http_client`: An `httpx.Client` to send through. The SDK never closes a client it did not create.
- `timeout`: Seconds allowed for each connect, write and read, and for the whole response body.

#### `Relay.project_id` property

```python
@property
def project_id(self) -> str
```

#### `Relay.incarnation` property

```python
@property
def incarnation(self) -> str
```

#### `Relay.serving_epoch` property

```python
@property
def serving_epoch(self) -> str | None
```

The serving epoch `initialize()` observed, or `None` before it runs.

#### `Relay.initialize` method

```python
def initialize(self) -> None
```

Reads the project route and records its serving epoch.

Raises:

- `RelayProblem`: `INCARNATION_MISMATCH` when the project has a new incarnation; recover explicitly.

Sends [`communication.route`](../../operations/communication/route.md).

#### `Relay.retry_request` method

```python
def retry_request(self, request_id: str) -> RequestResolution
```

Resolves a recorded mutation, resending it with its original identity only if the authority never saw it.

Returns the authority's resolution: `committed` or `accepted` once it has the request, else
`notObservedYet` after a resend whose effect is not yet visible. A request the client observed committing,
or one past its retry budget, raises `RESOLUTION_REQUIRED`; resolve it read-only with `resolve_request`.
A `replayOnly` operation cannot be looked up and raises `INVALID_REQUEST`; call the operation again with
the same `request_id` and input instead.

Raises:

- `LookupError`: This client has no recovery record for the request.
- `RelayProblem`: The authority or the recovery checks refused the retry.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `Relay.recovery_states` property

```python
@property
def recovery_states(self) -> tuple[RecoveryState, ...]
```

Snapshots of the recorded mutations, oldest first. They never contain credentials.

#### `Relay.close` method

```python
def close(self) -> None
```

Closes the HTTP client this client created. A client passed as `http_client` stays open.

#### `Relay.capabilities` method

```python
def capabilities(self) -> Capabilities
```

Describe the features, limits and API model the authority supports.

Authorization: `backendKey`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `Relay.route` method

```python
def route(self) -> dict[str, Any]
```

Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

Authorization: `backendKey`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.route`](../../operations/communication/route.md).

#### `Relay.get_principal` method

```python
def get_principal(self, *, principal_id: str) -> Principal
```

Read a principal (an application user).

Authorization: `backendKey` with scope `principalManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

#### `Relay.get_conversation` method

```python
def get_conversation(self, *, conversation_id: str) -> Conversation
```

Read a conversation.

Authorization: `backendKey` with scope `conversationManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `Relay.members` method

```python
def members(
    self,
    *,
    conversation_id: str,
    limit: int = 100,
    cursor: str | None = None,
) -> MemberPage
```

List the members of a conversation.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_members()` follows the cursor for you.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.members`](../../operations/communication/members.md).

#### `Relay.iter_members` method

```python
def iter_members(
    self,
    *,
    conversation_id: str,
    limit: int = 100,
    cursor: str | None = None,
) -> Iterator[Member]
```

Iterate the `items` of `members()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.members`](../../operations/communication/members.md).

#### `Relay.messages` method

```python
def messages(
    self,
    *,
    conversation_id: str,
    limit: int = 100,
    before_sequence: str | None = None,
    act_as_principal_id: str | None = None,
) -> MessagePage
```

List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

Authorization: `backendKey` with scope `messageRead`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `sequence`. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true. `iter_messages()` follows the cursor for you.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `Relay.iter_messages` method

```python
def iter_messages(
    self,
    *,
    conversation_id: str,
    limit: int = 100,
    before_sequence: str | None = None,
    act_as_principal_id: str | None = None,
) -> Iterator[Message]
```

Iterate the `items` of `messages()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `Relay.get_message` method

```python
def get_message(
    self,
    *,
    conversation_id: str,
    message_id: str,
    act_as_principal_id: str | None = None,
) -> Message
```

Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

Authorization: `backendKey` with scope `messageRead`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `Relay.inbox` method

```python
def inbox(
    self,
    *,
    limit: int = 100,
    cursor: str | None = None,
    act_as_principal_id: str | None = None,
) -> InboxPage
```

List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

Authorization: `backendKey` with scope `messageRead`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_inbox()` follows the cursor for you.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `Relay.iter_inbox` method

```python
def iter_inbox(
    self,
    *,
    limit: int = 100,
    cursor: str | None = None,
    act_as_principal_id: str | None = None,
) -> Iterator[InboxItem]
```

Iterate the `items` of `inbox()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to 100, the largest page.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `Relay.search` method

```python
def search(
    self,
    *,
    query: str,
    page_size: int = 100,
    scope: SearchScopeInput | None = None,
    cursor: str | None = None,
    act_as_principal_id: str | None = None,
) -> SearchPage
```

Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

Authorization: `backendKey` with scope `messageRead`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_search()` follows the cursor for you.

Parameters:

- `page_size`: Defaults to 100, the largest page.

Sends [`communication.search`](../../operations/communication/search.md).

#### `Relay.iter_search` method

```python
def iter_search(
    self,
    *,
    query: str,
    page_size: int = 100,
    scope: SearchScopeInput | None = None,
    cursor: str | None = None,
    act_as_principal_id: str | None = None,
) -> Iterator[SearchHit]
```

Iterate the `items` of `search()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `page_size`: Defaults to 100, the largest page.

Sends [`communication.search`](../../operations/communication/search.md).

#### `Relay.resolve_request` method

```python
def resolve_request(self, *, request_id: str) -> RequestResolution
```

Look up the stored outcome of an earlier communication mutation by its requestId.

Authorization: `backendKey`, when `ownRequest`: The caller made the original request.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `Relay.get_operation` method

```python
def get_operation(self, *, operation_id: str) -> Operation
```

Read the state of a long-running communication operation.

Authorization: `backendKey`, when `operationParticipant`: The caller started the operation or can access its target.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `Relay.conversation_mute` method

```python
def conversation_mute(
    self,
    *,
    conversation_id: str,
    act_as_principal_id: str | None = None,
) -> ConversationMute
```

Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `Relay.current_live_session` method

```python
def current_live_session(self, *, conversation_id: str) -> LiveSession | None
```

Return the active live session of a conversation, if any.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `Relay.live_session` method

```python
def live_session(self, *, live_session_id: str) -> LiveSession
```

Read a live session.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `Relay.live_sessions` method

```python
def live_sessions(
    self,
    *,
    conversation_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> LiveSessionPage
```

List the live sessions of a conversation.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_live_sessions()` follows the cursor for you.

Parameters:

- `limit`: Defaults to `50` on the server.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `Relay.iter_live_sessions` method

```python
def iter_live_sessions(
    self,
    *,
    conversation_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> Iterator[LiveSession]
```

Iterate the `items` of `live_sessions()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to `50` on the server.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `Relay.live_session_participants` method

```python
def live_session_participants(
    self,
    *,
    live_session_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> LiveParticipantPage
```

List the participants of a live session.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_live_session_participants()` follows the cursor for you.

Parameters:

- `limit`: Defaults to `50` on the server.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `Relay.iter_live_session_participants` method

```python
def iter_live_session_participants(
    self,
    *,
    live_session_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> Iterator[LiveParticipation]
```

Iterate the `items` of `live_session_participants()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to `50` on the server.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `Relay.live_session_operation` method

```python
def live_session_operation(self, *, operation_id: str) -> LiveSessionOperation
```

Read the state of a live session start or end operation.

Authorization, any one of:

- `backendKey` with scope `callRead`.
- `backendKey` with scope `callManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `Relay.session_request_outcome` method

```python
def session_request_outcome(self, *, request_id: str) -> SessionRequestOutcome
```

Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

Authorization: `backendKey` with all of the scopes `sessionIssue` and `sessionManage`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

#### `Relay.create_principal` method

```python
def create_principal(
    self,
    *,
    external_user_id: str,
    request_id: str | None = None,
) -> Principal
```

Create a principal for an application user.

Authorization: `backendKey` with scope `principalManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

#### `Relay.disable_principal` method

```python
def disable_principal(
    self,
    *,
    principal_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Principal
```

Disable a principal.

Authorization: `backendKey` with scope `principalManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

#### `Relay.issue_session` method

```python
def issue_session(
    self,
    *,
    principal_id: str,
    device_id: str,
    requested_ttl_ms: str,
    request_id: str | None = None,
) -> SessionBootstrap
```

Issue a short-lived user session token for a principal and device.

Authorization: `backendKey` with scope `sessionIssue`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

#### `Relay.renew_session` method

```python
def renew_session(
    self,
    *,
    session_id: str,
    principal_id: str,
    device_id: str,
    expected_revision: str,
    requested_ttl_ms: str,
    request_id: str | None = None,
) -> SessionBootstrap
```

Renew a user session before it expires.

Authorization: `backendKey` with scope `sessionIssue`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

#### `Relay.revoke_session` method

```python
def revoke_session(
    self,
    *,
    session_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> SessionRevocation
```

Revoke a user session.

Authorization: `backendKey` with scope `sessionManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `Relay.create_conversation` method

```python
def create_conversation(
    self,
    *,
    title: str,
    props: Mapping[str, Any],
    members: Sequence[MemberInputInput],
    request_id: str | None = None,
) -> Conversation
```

Create a conversation with its initial members.

Authorization: `backendKey` with scope `conversationManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `Relay.update_conversation` method

```python
def update_conversation(
    self,
    *,
    conversation_id: str,
    expected_revision: str,
    title: str | None = None,
    props: Mapping[str, Any] | None = None,
    request_id: str | None = None,
) -> Conversation
```

Update the title or properties of a conversation.

Authorization: `backendKey` with scope `conversationManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

#### `Relay.add_member` method

```python
def add_member(
    self,
    *,
    conversation_id: str,
    principal_id: str,
    role: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Member
```

Add a member, or change the role of an active member.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.addMember`](../../operations/communication/addMember.md).

#### `Relay.add_members` method

```python
def add_members(
    self,
    *,
    conversation_id: str,
    members: Sequence[MemberBatchEntryInput],
    request_id: str | None = None,
) -> ConversationMemberBatch
```

Add several members in one request.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

#### `Relay.remove_member` method

```python
def remove_member(
    self,
    *,
    conversation_id: str,
    principal_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Member
```

Remove a member from a conversation.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

#### `Relay.history_grant` method

```python
def history_grant(
    self,
    *,
    conversation_id: str,
    principal_id: str,
    membership_epoch: str,
    expected_revision: str,
    from_sequence: str,
    request_id: str | None = None,
) -> Member
```

Expand the history a member can see to an earlier sequence.

Authorization: `backendKey` with scope `historyManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.historyGrant`](../../operations/communication/historyGrant.md).

#### `Relay.send_message` method

```python
def send_message(
    self,
    *,
    conversation_id: str,
    text: str,
    props: Mapping[str, Any],
    act_as_principal_id: str | None = None,
    request_id: str | None = None,
) -> MessageAck
```

Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

Authorization: `backendKey` with scope `messageWrite`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `Relay.edit_message` method

```python
def edit_message(
    self,
    *,
    conversation_id: str,
    message_id: str,
    expected_revision: str,
    text: str | None = None,
    props: Mapping[str, Any] | None = None,
    request_id: str | None = None,
) -> Message
```

Edit a message.

Authorization: `backendKey` with scope `moderation`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `Relay.delete_message` method

```python
def delete_message(
    self,
    *,
    conversation_id: str,
    message_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Message
```

Delete a message.

Authorization: `backendKey` with scope `moderation`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `Relay.set_broadcast_permission` method

```python
def set_broadcast_permission(
    self,
    *,
    conversation_id: str,
    principal_id: str,
    allowed: bool,
    expected_membership_revision: str,
    request_id: str | None = None,
) -> BroadcastPermissionChanged
```

Allow or deny a member to publish media in live sessions.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md).

#### `Relay.set_conversation_mute` method

```python
def set_conversation_mute(
    self,
    *,
    conversation_id: str,
    muted: bool,
    until: str | None = None,
    act_as_principal_id: str | None = None,
    request_id: str | None = None,
) -> ConversationMute
```

Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

Authorization: `backendKey` with scope `membershipManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `Relay.alert_live_session` method

```python
def alert_live_session(
    self,
    *,
    live_session_id: str,
    expected_generation: str,
    principal_ids: Sequence[str],
    request_id: str | None = None,
) -> LiveAlertBatch
```

Alert (ring) conversation members about a live session.

Authorization: `backendKey` with scope `callManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `Relay.end_live_session` method

```python
def end_live_session(
    self,
    *,
    live_session_id: str,
    expected_generation: str,
    expected_revision: str,
    request_id: str | None = None,
) -> EndLiveSessionPayload
```

End a live session for every participant. Completes asynchronously.

Authorization: `backendKey` with scope `callManage`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `live_session_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

### `RelayManagement` class

```python
class RelayManagement
```

Management client for organizations, projects, deployments, backend keys and webhooks.

#### `RelayManagement` constructor

```python
def __init__(
    self,
    *,
    base_url: str,
    access_token: str,
    actor_id: str,
    recovery_storage: RecoveryStorage | None = None,
    http_client: httpx.Client | None = None,
    timeout: float = 12.0,
) -> None
```

Parameters:

- `base_url`: The authority origin. Plain HTTP is accepted only for loopback hosts.
- `access_token`: An operator access token. Keep it on trusted servers.
- `actor_id`: The operator the token belongs to; it scopes stored recovery records.
- `recovery_storage`: Durable storage for mutation recovery records; in memory only when omitted.
- `http_client`: An `httpx.Client` to send through. The SDK never closes a client it did not create.
- `timeout`: Seconds allowed for each connect, write and read, and for the whole response body.

#### `RelayManagement.actor_id` property

```python
@property
def actor_id(self) -> str
```

#### `RelayManagement.retry_request` method

```python
def retry_request(self, request_id: str) -> RequestResolution
```

Resolves a recorded mutation, resending it with its original identity only if the authority never saw it.

Returns the authority's resolution: `committed` or `accepted` once it has the request, else
`notObservedYet` after a resend whose effect is not yet visible. A request the client observed committing,
or one past its retry budget, raises `RESOLUTION_REQUIRED`; resolve it read-only with `resolve_request`.
A `replayOnly` operation cannot be looked up and raises `INVALID_REQUEST`; call the operation again with
the same `request_id` and input instead.

Raises:

- `LookupError`: This client has no recovery record for the request.
- `RelayProblem`: The authority or the recovery checks refused the retry.

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `RelayManagement.recovery_states` property

```python
@property
def recovery_states(self) -> tuple[RecoveryState, ...]
```

Snapshots of the recorded mutations, oldest first. They never contain credentials.

#### `RelayManagement.close` method

```python
def close(self) -> None
```

Closes the HTTP client this client created. A client passed as `http_client` stays open.

#### `RelayManagement.capabilities` method

```python
def capabilities(self) -> Capabilities
```

Describe the management features and limits the authority supports.

Authorization: `portalCredential`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.capabilities`](../../operations/management/capabilities.md).

#### `RelayManagement.organizations` method

```python
def organizations(self) -> OrganizationPage
```

List the organizations the caller can access.

Authorization: `portalCredential`.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `bounded`. One bounded page without a cursor input. complete reports whether every item fit.

Sends [`management.organizations`](../../operations/management/organizations.md).

#### `RelayManagement.get_organization` method

```python
def get_organization(self, *, org_id: str) -> Organization
```

Read an organization.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.getOrganization`](../../operations/management/getOrganization.md).

#### `RelayManagement.get_deployment` method

```python
def get_deployment(self, *, deployment_id: str) -> Deployment
```

Read a deployment.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.getDeployment`](../../operations/management/getDeployment.md).

#### `RelayManagement.get_project` method

```python
def get_project(self, *, project_id: str) -> Project
```

Read a project.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.getProject`](../../operations/management/getProject.md).

#### `RelayManagement.deployment_health` method

```python
def deployment_health(self, *, deployment_id: str) -> DeploymentHealth
```

Read the health of a deployment.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.deploymentHealth`](../../operations/management/deploymentHealth.md).

#### `RelayManagement.deployment_usage` method

```python
def deployment_usage(
    self,
    *,
    deployment_id: str,
    from_: str | None = None,
    to: str | None = None,
) -> DeploymentUsage
```

Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.deploymentUsage`](../../operations/management/deploymentUsage.md).

#### `RelayManagement.project_usage` method

```python
def project_usage(
    self,
    *,
    project_id: str,
    from_: str | None = None,
    to: str | None = None,
) -> ProjectUsage
```

Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.projectUsage`](../../operations/management/projectUsage.md).

#### `RelayManagement.organization_usage` method

```python
def organization_usage(
    self,
    *,
    org_id: str,
    from_: str | None = None,
    to: str | None = None,
) -> OrganizationUsage
```

Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.organizationUsage`](../../operations/management/organizationUsage.md).

#### `RelayManagement.organization_billing` method

```python
def organization_billing(self, *, org_id: str) -> OrganizationBilling
```

Read the billing state of an organization in any status: the plan whose limits apply, whether Relay bills the organization and, when it does, its standing and subscription.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

#### `RelayManagement.webhook_endpoints` method

```python
def webhook_endpoints(self, *, project_id: str) -> WebhookEndpointPage
```

List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `bounded`. One bounded page without a cursor input. complete reports whether every item fit.

Sends [`management.webhookEndpoints`](../../operations/management/webhookEndpoints.md).

#### `RelayManagement.webhook_deliveries` method

```python
def webhook_deliveries(
    self,
    *,
    project_id: str,
    endpoint_id: str,
) -> WebhookDeliveryPage
```

List recent deliveries of a webhook endpoint.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `bounded`. One bounded page without a cursor input. complete reports whether every item fit.

Sends [`management.webhookDeliveries`](../../operations/management/webhookDeliveries.md).

#### `RelayManagement.resolve_request` method

```python
def resolve_request(self, *, request_id: str) -> RequestResolution
```

Look up the stored outcome of an earlier management mutation by its requestId.

Authorization: `portalCredential`, when `ownRequest`: The caller made the original request.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `RelayManagement.get_operation` method

```python
def get_operation(self, *, operation_id: str) -> Operation
```

Read the state of a long-running management operation.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Sends [`management.getOperation`](../../operations/management/getOperation.md).

#### `RelayManagement.agent_signup_for_approval` method

```python
def agent_signup_for_approval(self, *, approval_token: str) -> AgentSignupReview
```

Read a pending agent signup request for its approval page, with the agent's suggested plan, scopes and monthly spend cap.

Authorization: No credential (`anonymous`); the authority ignores the client's token, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

#### `RelayManagement.agent_signup` method

```python
def agent_signup(self) -> AgentSignupStatus
```

Read the agent's own signup: its state and, once approved, the organization, project, grant scopes and expiry, and keys. Poll no more often than the ticket's pollAfterSeconds.

Authorization: `agentVerifier`, when `ownSignup`: The verifier is the one whose digest the signup request carries.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

#### `RelayManagement.agent_grants` method

```python
def agent_grants(
    self,
    *,
    org_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> AgentGrantPage
```

List an organization's agent grants with their keys, newest first.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_agent_grants()` follows the cursor for you.

Parameters:

- `limit`: Defaults to `50` on the server.

#### `RelayManagement.iter_agent_grants` method

```python
def iter_agent_grants(
    self,
    *,
    org_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> Iterator[AgentGrant]
```

Iterate the `items` of `agent_grants()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to `50` on the server.

#### `RelayManagement.agent_audit_events` method

```python
def agent_audit_events(
    self,
    *,
    org_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> AgentAuditEventPage
```

List an organization's agent audit trail, newest first: the approval, provisioning, keys, revocations, spend-control changes and purchases.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true. `iter_agent_audit_events()` follows the cursor for you.

Parameters:

- `limit`: Defaults to `50` on the server.

#### `RelayManagement.iter_agent_audit_events` method

```python
def iter_agent_audit_events(
    self,
    *,
    org_id: str,
    limit: int | None = None,
    cursor: str | None = None,
) -> Iterator[AgentAuditEvent]
```

Iterate the `items` of `agent_audit_events()` across pages.

Follows `nextCursor` until a page is `complete`. A page that sets `refreshRequired` raises `RESYNC_REQUIRED`; restart from the first page.

Parameters:

- `limit`: Defaults to `50` on the server.

#### `RelayManagement.organization_spend` method

```python
def organization_spend(self, *, org_id: str) -> OrganizationSpend
```

Read the organization's spend this month: its cap, credits, minimum credit, charge limit, charges, margin, spend stop and the freshness of its usage.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

#### `RelayManagement.create_organization` method

```python
def create_organization(
    self,
    *,
    name: str,
    terms_ref: str,
    request_id: str | None = None,
) -> Organization
```

Create an organization.

Authorization: `portalCredential`.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.createOrganization`](../../operations/management/createOrganization.md).

#### `RelayManagement.create_deployment` method

```python
def create_deployment(
    self,
    *,
    org_id: str,
    offering: str,
    geo_id: str,
    installation_profile_id: str,
    consent_ref: str,
    request_id: str | None = None,
) -> CreateDeploymentReply
```

Create a deployment in an organization. Completes asynchronously.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.createDeployment`](../../operations/management/createDeployment.md).

#### `RelayManagement.create_project` method

```python
def create_project(
    self,
    *,
    deployment_id: str,
    name: str,
    environment: str,
    backend_principal_name: str,
    request_id: str | None = None,
) -> CreateProjectReply
```

Create a project in a ready deployment. Completes asynchronously.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.createProject`](../../operations/management/createProject.md).

#### `RelayManagement.issue_backend_key` method

```python
def issue_backend_key(
    self,
    *,
    project_id: str,
    name: str,
    scopes: Sequence[str],
    expires_at: str,
    request_id: str | None = None,
) -> IssueBackendKeyReply
```

Issue a scoped backend key. The secret is delivered once through a credential delivery.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

#### `RelayManagement.revoke_backend_key` method

```python
def revoke_backend_key(
    self,
    *,
    project_id: str,
    key_id: str,
    expected_revision: str,
    revoke_issued_sessions: bool,
    request_id: str | None = None,
) -> RevokeBackendKeyReply
```

Revoke a backend key, optionally revoking the sessions it issued.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.revokeBackendKey`](../../operations/management/revokeBackendKey.md).

#### `RelayManagement.project_policy` method

```python
def project_policy(
    self,
    *,
    project_id: str,
    expected_revision: str,
    change: PolicyChangeInput,
    request_id: str | None = None,
) -> ProjectPolicyReply
```

Change the policy of a project.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.projectPolicy`](../../operations/management/projectPolicy.md).

#### `RelayManagement.credential_permit` method

```python
def credential_permit(
    self,
    *,
    project_id: str,
    delivery_id: str,
    redemption_request_id: str,
    request_id: str | None = None,
) -> dict[str, Any]
```

Issue a signed permit that authorizes redeeming one credential delivery.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.credentialPermit`](../../operations/management/credentialPermit.md).

#### `RelayManagement.pause_operation` method

```python
def pause_operation(
    self,
    *,
    operation_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Operation
```

Pause a long-running operation.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.pauseOperation`](../../operations/management/pauseOperation.md).

#### `RelayManagement.resume_operation` method

```python
def resume_operation(
    self,
    *,
    operation_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> Operation
```

Resume a paused or blocked operation.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.resumeOperation`](../../operations/management/resumeOperation.md).

#### `RelayManagement.create_billing_checkout_session` method

```python
def create_billing_checkout_session(
    self,
    *,
    org_id: str,
    plan_id: str,
    request_id: str | None = None,
) -> BillingCheckoutSession
```

Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `singleUse`. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `RelayManagement.create_billing_portal_session` method

```python
def create_billing_portal_session(
    self,
    *,
    org_id: str,
    request_id: str | None = None,
) -> BillingPortalSession
```

Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `singleUse`. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `RelayManagement.configure_webhook` method

```python
def configure_webhook(
    self,
    *,
    project_id: str,
    url: str,
    event_types: Sequence[str],
    consent_ref: str,
    request_id: str | None = None,
) -> ConfigureWebhookReply
```

Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.configureWebhook`](../../operations/management/configureWebhook.md).

#### `RelayManagement.update_webhook` method

```python
def update_webhook(
    self,
    *,
    project_id: str,
    endpoint_id: str,
    expected_revision: str,
    event_types: Sequence[str],
    enabled: bool,
    request_id: str | None = None,
) -> UpdateWebhookReply
```

Change the event types of a webhook endpoint, or enable or disable it.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.updateWebhook`](../../operations/management/updateWebhook.md).

#### `RelayManagement.rotate_webhook_secret` method

```python
def rotate_webhook_secret(
    self,
    *,
    project_id: str,
    endpoint_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> RotateWebhookSecretReply
```

Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md).

#### `RelayManagement.disable_webhook` method

```python
def disable_webhook(
    self,
    *,
    project_id: str,
    endpoint_id: str,
    expected_revision: str,
    request_id: str | None = None,
) -> DisableWebhookReply
```

Disable a webhook endpoint.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.disableWebhook`](../../operations/management/disableWebhook.md).

#### `RelayManagement.replay_webhook_deliveries` method

```python
def replay_webhook_deliveries(
    self,
    *,
    project_id: str,
    endpoint_id: str,
    effect_id: str | None = None,
    since: str | None = None,
    until: str | None = None,
    request_id: str | None = None,
) -> ReplayWebhookDeliveriesReply
```

Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Long-running: returns the whole reply. Poll `get_operation()` with `operation_id` set to `operation.operation_id` until the work completes.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

Sends [`management.replayWebhookDeliveries`](../../operations/management/replayWebhookDeliveries.md).

#### `RelayManagement.request_agent_signup` method

```python
def request_agent_signup(
    self,
    *,
    owner_email: str,
    poll_challenge: str,
    organization_name: str,
    agent_name: str,
    suggested_scopes: Sequence[str],
    purpose: str | None = None,
    suggested_plan: str | None = None,
    suggested_monthly_spend_cap: str | None = None,
    request_id: str | None = None,
) -> AgentSignupTicket
```

Request an organization for a named human owner, who approves it from an emailed link. Nothing is usable before approval.

Authorization: No credential (`anonymous`); the authority ignores the client's token.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

#### `RelayManagement.reject_agent_signup` method

```python
def reject_agent_signup(
    self,
    *,
    approval_token: str,
    suppress_future_requests: bool,
    request_id: str | None = None,
) -> AgentSignupStatus
```

Reject a signup request from its approval link, optionally suppressing future requests to the email.

Authorization: No credential (`anonymous`); the authority ignores the client's token, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

#### `RelayManagement.approve_agent_signup` method

```python
def approve_agent_signup(
    self,
    *,
    approval_token: str,
    confirmation_code: str,
    terms_ref: str,
    plan: str,
    scopes: Sequence[str],
    monthly_spend_cap: str,
    agent_purchase_limit: str | None = None,
    grant_expires_at: str | None = None,
    request_id: str | None = None,
) -> AgentSignupStatus
```

Approve a signup request with its approval token and the agent's confirmation code, choosing the plan, scopes, monthly spend cap, agent purchase limit and grant expiry. The signed-in approver becomes the owner.

Authorization: `portalCredential`, when `approvalToken`: The input carries the approval token from the email sent to the request's named owner.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `RelayManagement.issue_agent_key` method

```python
def issue_agent_key(
    self,
    *,
    scopes: Sequence[str],
    expires_at: str | None = None,
    request_id: str | None = None,
) -> AgentKey
```

Issue a backend key for the agent within its grant's scopes and expiry. The result is the pending key; poll agentSignup until it shows the key's delivery, then redeem it with agentCredentialPermit.

Authorization: `agentVerifier`, when `activeGrant`: The agent's grant is neither revoked nor expired, and its organization is active.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

#### `RelayManagement.agent_credential_permit` method

```python
def agent_credential_permit(
    self,
    *,
    delivery_id: str,
    redemption_request_id: str,
    request_id: str | None = None,
) -> dict[str, Any]
```

Issue a permit that authorizes the agent to redeem one of its key deliveries.

Authorization: `agentVerifier`, when `activeGrant`: The agent's grant is neither revoked nor expired, and its organization is active.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

#### `RelayManagement.revoke_agent_grant` method

```python
def revoke_agent_grant(
    self,
    *,
    grant_id: str,
    revoke_issued_sessions: bool,
    request_id: str | None = None,
) -> AgentGrant
```

Revoke an agent grant and every key issued under it.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `RelayManagement.set_spend_controls` method

```python
def set_spend_controls(
    self,
    *,
    org_id: str,
    monthly_spend_cap: str,
    agent_purchase_limit: str | None = None,
    request_id: str | None = None,
) -> OrganizationSpend
```

Set the organization's monthly spend cap and agent purchase limit.

Authorization: `portalCredential`, when `owner`: The caller owns the organization, deployment or project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; reuse it only through `retry_request`.

#### `RelayManagement.purchase_agent_credits` method

```python
def purchase_agent_credits(
    self,
    *,
    amount: str,
    shared_payment_token: str,
    request_id: str | None = None,
) -> AgentPayment
```

Buy prepaid credits with a Shared Payment Token, within the owner's agent purchase limit.

Authorization: `agentVerifier`, when `activeGrant`: The agent's grant is neither revoked nor expired, and its organization is active.

Idempotency: `replayOnly`. Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

Parameters:

- `request_id`: Lowercase UUID that identifies this request. Omit it for a new one; to settle an unknown outcome, call again with the same `request_id` and input.

### `RelayProblem` class

```python
class RelayProblem(Exception)
```

A failure the authority reported or the SDK detected for one request.

#### `RelayProblem.code` property

```python
code: str
```

The error code, for example `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`.

#### `RelayProblem.request_id` property

```python
request_id: str
```

The request the problem belongs to.

#### `RelayProblem.outcome` property

```python
outcome: str
```

`rejected`, `committed`, `accepted` or `unknown`.

#### `RelayProblem.status` property

```python
status: int
```

The HTTP status, or 0 when no response was received or storage failed.

#### `RelayProblem.retry_after` property

```python
retry_after: int | None
```

Whole seconds to wait before resending the same request, when the authority sent a delay
(`extensions.retryAfter`, else an HTTP `Retry-After` delay in seconds). The SDK never waits or
resends on its own because of it.

#### `RelayProblem` constructor

```python
def __init__(
    self,
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    *,
    retry_after: int | None = None,
) -> None
```

#### `RelayProblem.message` property

```python
@property
def message(self) -> str
```

#### `RelayProblem.retryable` property

```python
@property
def retryable(self) -> bool
```

Whether the error catalog marks the code as retryable with the same request ID.

### `ScopeRequiredProblem` class

```python
class ScopeRequiredProblem(RelayProblem)
```

`SCOPE_REQUIRED`: the backend key lacks a scope the operation requires (403, rejected, not retryable).

`scope` names the missing scope. The authority names it only in the message, so it is `None` when the
message does not match the documented wording. A missing read scope is reported as the read scope even where its
manage scope would also satisfy the operation.

#### `ScopeRequiredProblem.scope` property

```python
scope: str | None
```

#### `ScopeRequiredProblem` constructor

```python
def __init__(
    self,
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    *,
    retry_after: int | None = None,
) -> None
```

#### `ScopeRequiredProblem.code` property

```python
code: str
```

The error code, for example `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`.

Inherited from `RelayProblem`.

#### `ScopeRequiredProblem.request_id` property

```python
request_id: str
```

The request the problem belongs to.

Inherited from `RelayProblem`.

#### `ScopeRequiredProblem.outcome` property

```python
outcome: str
```

`rejected`, `committed`, `accepted` or `unknown`.

Inherited from `RelayProblem`.

#### `ScopeRequiredProblem.status` property

```python
status: int
```

The HTTP status, or 0 when no response was received or storage failed.

Inherited from `RelayProblem`.

#### `ScopeRequiredProblem.retry_after` property

```python
retry_after: int | None
```

Whole seconds to wait before resending the same request, when the authority sent a delay
(`extensions.retryAfter`, else an HTTP `Retry-After` delay in seconds). The SDK never waits or
resends on its own because of it.

Inherited from `RelayProblem`.

#### `ScopeRequiredProblem.message` property

```python
@property
def message(self) -> str
```

Inherited from `RelayProblem`.

#### `ScopeRequiredProblem.retryable` property

```python
@property
def retryable(self) -> bool
```

Whether the error catalog marks the code as retryable with the same request ID.

Inherited from `RelayProblem`.

### `SpendCapReachedProblem` class

```python
class SpendCapReachedProblem(RelayProblem)
```

`SPEND_CAP_REACHED`: the month's charges reached the organization's spend limit (402, not retryable).

Billable usage beyond the plan's allowances is refused before any effect; usage within them continues. Add
credits or raise the cap, then send a new request.

#### `SpendCapReachedProblem.code` property

```python
code: str
```

The error code, for example `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`.

Inherited from `RelayProblem`.

#### `SpendCapReachedProblem.request_id` property

```python
request_id: str
```

The request the problem belongs to.

Inherited from `RelayProblem`.

#### `SpendCapReachedProblem.outcome` property

```python
outcome: str
```

`rejected`, `committed`, `accepted` or `unknown`.

Inherited from `RelayProblem`.

#### `SpendCapReachedProblem.status` property

```python
status: int
```

The HTTP status, or 0 when no response was received or storage failed.

Inherited from `RelayProblem`.

#### `SpendCapReachedProblem.retry_after` property

```python
retry_after: int | None
```

Whole seconds to wait before resending the same request, when the authority sent a delay
(`extensions.retryAfter`, else an HTTP `Retry-After` delay in seconds). The SDK never waits or
resends on its own because of it.

Inherited from `RelayProblem`.

#### `SpendCapReachedProblem` constructor

```python
def __init__(
    self,
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    *,
    retry_after: int | None = None,
) -> None
```

Inherited from `RelayProblem`.

#### `SpendCapReachedProblem.message` property

```python
@property
def message(self) -> str
```

Inherited from `RelayProblem`.

#### `SpendCapReachedProblem.retryable` property

```python
@property
def retryable(self) -> bool
```

Whether the error catalog marks the code as retryable with the same request ID.

Inherited from `RelayProblem`.

### `SpendUnverifiedProblem` class

```python
class SpendUnverifiedProblem(RelayProblem)
```

`SPEND_UNVERIFIED`: current spend cannot be verified, so billable usage failed closed (503, retryable).

Wait `retry_after` seconds, then resend with the same request ID.

#### `SpendUnverifiedProblem.code` property

```python
code: str
```

The error code, for example `SCOPE_REQUIRED` or `TRANSPORT_UNKNOWN`.

Inherited from `RelayProblem`.

#### `SpendUnverifiedProblem.request_id` property

```python
request_id: str
```

The request the problem belongs to.

Inherited from `RelayProblem`.

#### `SpendUnverifiedProblem.outcome` property

```python
outcome: str
```

`rejected`, `committed`, `accepted` or `unknown`.

Inherited from `RelayProblem`.

#### `SpendUnverifiedProblem.status` property

```python
status: int
```

The HTTP status, or 0 when no response was received or storage failed.

Inherited from `RelayProblem`.

#### `SpendUnverifiedProblem.retry_after` property

```python
retry_after: int | None
```

Whole seconds to wait before resending the same request, when the authority sent a delay
(`extensions.retryAfter`, else an HTTP `Retry-After` delay in seconds). The SDK never waits or
resends on its own because of it.

Inherited from `RelayProblem`.

#### `SpendUnverifiedProblem` constructor

```python
def __init__(
    self,
    code: str,
    request_id: str,
    outcome: str,
    status: int,
    message: str,
    *,
    retry_after: int | None = None,
) -> None
```

Inherited from `RelayProblem`.

#### `SpendUnverifiedProblem.message` property

```python
@property
def message(self) -> str
```

Inherited from `RelayProblem`.

#### `SpendUnverifiedProblem.retryable` property

```python
@property
def retryable(self) -> bool
```

Whether the error catalog marks the code as retryable with the same request ID.

Inherited from `RelayProblem`.

### `WebhookVerificationError` class

```python
class WebhookVerificationError(Exception)
```

A delivery that failed verification. The message never contains secrets, signatures or the body.

Checks run in this order and stop at the first failure:

- `INVALID_SECRET`: no secret is given, or one is not `whsec_` followed by padded standard Base64 of 24 to
  64 bytes. This is your configuration, not the sender.
- `MISSING_HEADER`: `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty.
- `INVALID_HEADER`: one of those headers is repeated.
- `INVALID_TIMESTAMP`: `webhook-timestamp` is not 1 to 15 ASCII digits (integer Unix seconds).
- `TIMESTAMP_EXPIRED`: the timestamp is more than `tolerance_seconds` before now.
- `TIMESTAMP_FUTURE`: the timestamp is more than `tolerance_seconds` after now.
- `BODY_TOO_LARGE`: the body exceeds 4096 bytes.
- `TOO_MANY_SIGNATURES`: `webhook-signature` has more than 8 entries.
- `NO_MATCHING_SIGNATURE`: no `v1` entry matches any secret.
- `INVALID_BODY`: `verify()` only; the signed body is not a UTF-8 JSON event envelope.

Re-exported from `instantrelay.webhooks`.

#### `WebhookVerificationError.code` property

```python
code: WebhookVerificationCode
```

#### `WebhookVerificationError` constructor

```python
def __init__(self, code: WebhookVerificationCode, message: str) -> None
```

#### `WebhookVerificationError.message` property

```python
@property
def message(self) -> str
```

## Interfaces

### `AsyncRecoveryStorage` interface

```python
@runtime_checkable
class AsyncRecoveryStorage(Protocol)
```

Asynchronous key-value storage for recovery records.

#### `AsyncRecoveryStorage.get_item` method

```python
async def get_item(self, key: str) -> str | None
```

Returns the stored value, or `None` when the key is absent.

#### `AsyncRecoveryStorage.set_item` method

```python
async def set_item(self, key: str, value: str) -> None
```

Stores the value durably before returning; raise if durability is not confirmed.

### `RecoveryStorage` interface

```python
@runtime_checkable
class RecoveryStorage(Protocol)
```

Synchronous key-value storage for recovery records, such as a file or database adapter.

#### `RecoveryStorage.get_item` method

```python
def get_item(self, key: str) -> str | None
```

Returns the stored value, or `None` when the key is absent.

#### `RecoveryStorage.set_item` method

```python
def set_item(self, key: str, value: str) -> None
```

Stores the value durably before returning; raise if durability is not confirmed.

## Constants

### `__version__` constant

```python
__version__: str
```

## Namespaces

### `push` namespace

```python
from instantrelay import push
```

Push payload builders for the contract in `spec/push-payload/`.

They are pure functions: they send nothing and hold no credentials. Your push library sends the requests and owns
APNs and FCM authorization, Web Push encryption (RFC 8291) and VAPID signing.

Each builder takes a per-recipient notification event (`notification.message`, `notification.call` or
`notification.callCancelled`) as `instantrelay.webhooks.verify()` returns it, or as a mapping in its wire form. It
validates its options and then the event, raising `PushPayloadError`, and returns `None` when the event
doesn't apply to the platform or is stale. Payloads are metadata-only unless you pass `title` or `body`, or the
event carries an opted-in message preview.

Requests are plain dicts. Serialize a payload with `encode()`: the builders measure their limits on that compact
form, and `json.dumps` with its defaults (ASCII escapes, spaces after separators) can exceed them.

### `types` namespace

```python
from instantrelay import types
```

Request inputs and response models of the Relay operations.

Enums are string literals. Response models are frozen dataclasses built from validated responses; `to_dict()`
returns their wire form. Inputs are frozen dataclasses whose `None` fields are omitted from the request.

### `webhooks` namespace

```python
from instantrelay import webhooks
```

Verifies Relay webhook deliveries: Standard Webhooks symmetric `v1` signatures over the raw body.

Pass the exact request body, respond `2xx` within 5 seconds, then process. De-duplicate on `webhook_id`: retries
and replays of a delivery keep it. Events are metadata-only; fetch a resource through the API when you need its
content. `notification.*` events follow the push payload contract in `spec/push-payload/` and are the input of
`instantrelay.push`.
