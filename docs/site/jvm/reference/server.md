# `com.convohop:convohop-server`

Java server SDK for trusted JVM backends: backend-key data-plane calls, management, webhook verification and push requests.

**Layer:** Server. **Runtime:** Java 11 or later. **Source:** `jvm/convohop-server`.

## Classes

### `ApnsRequest` class

```java
public final class ApnsRequest
```

An APNs request: an alert from `PushPayloads.apnsAlert` or a VoIP push from `PushPayloads.apnsVoip`. Your APNs client adds `authorization` and sends the payload to `/3/device/<token>` with these headers. `toString()` omits the payload.

Package: `com.convohop.server.push`.

#### `ApnsRequest.getHeaders` method

```java
public Map<String, String> getHeaders()
```

The HTTP/2 headers: `apns-push-type`, `apns-topic`, `apns-priority`, `apns-expiration` and, for calls and missed calls, `apns-collapse-id`.

Returns: the headers, in that order

#### `ApnsRequest.getPushType` method

```java
public String getPushType()
```

The `apns-push-type`: `alert` or `voip`.

Returns: the push type

#### `ApnsRequest.getTopic` method

```java
public String getTopic()
```

The `apns-topic`: the bundle ID for alerts, and the bundle ID followed by `.voip` for VoIP pushes.

Returns: the topic

#### `ApnsRequest.getPriority` method

```java
public int getPriority()
```

The `apns-priority`: 10, for immediate delivery.

Returns: the priority

#### `ApnsRequest.getExpiration` method

```java
public long getExpiration()
```

The `apns-expiration`: when APNs stops trying to deliver.

Returns: Unix seconds

#### `ApnsRequest.getCollapseId` method

```java
public @Nullable String getCollapseId()
```

The `apns-collapse-id` of calls and missed calls: the ring's collapse key, so a missed-call alert replaces the ring's incoming-call alert.

Returns: the collapse ID, or null for messages and VoIP pushes

#### `ApnsRequest.getPayload` method

```java
public String getPayload()
```

The JSON payload: at most 4096 bytes for alerts and 5120 bytes for VoIP pushes.

Returns: the payload

### `CommunicationApi` class

```java
public final class CommunicationApi
```

The `communication` plane: Conversations, members, messages, receipts, realtime events and live sessions inside one project.

Obtain an instance from a client; every call blocks until the authority answers or the request fails.

Package: `com.convohop.server.api`.

#### `CommunicationApi.capabilities` method

```java
public CapabilitiesReply capabilities()
```

Describe the features, limits and API model the authority supports.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession, backendKey.

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `CommunicationApi.route` method

```java
public RouteReply route()
```

Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG\_REGION.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession, backendKey.

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.route`](../../operations/communication/route.md).

#### `CommunicationApi.getPrincipal` method

```java
public GetPrincipalReply getPrincipal(GetPrincipalRequestInput input)
```

Read a principal (an application user).

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: backendKey (scopes principalManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

#### `CommunicationApi.getConversation` method

```java
public GetConversationReply getConversation(GetConversationRequestInput input)
```

Read a conversation.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes conversationManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `CommunicationApi.members` method

```java
public MembersReply members(MembersRequestInput input)
```

List the members of a conversation.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes membershipManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.members`](../../operations/communication/members.md).

#### `CommunicationApi.membersPages` method

```java
public Iterable<MemberPage> membersPages(MembersRequestInput input)
```

Every page of `members(MembersRequestInput)`, each requested when iteration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and iteration ends after the page whose `complete` is true. Each iteration starts again from `input`, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Iteration throws `ConvoHopProblem` if the authority rejects a request or a page is malformed or does not advance, and `IllegalStateException` if a page reports `refreshRequired`: start again from current state, not from the cursor.

Parameters:

- `input`: the first page's input

Returns: the pages, in order

Throws: `IllegalArgumentException` if the input's `cursor` is not a valid cursor

Sends [`communication.members`](../../operations/communication/members.md).

#### `CommunicationApi.messages` method

```java
public MessagesReply messages(MessagesRequestInput input)
```

List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes messageRead).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `CommunicationApi.messagesPages` method

```java
public Iterable<MessagePage> messagesPages(MessagesRequestInput input)
```

Every page of `messages(MessagesRequestInput)`, each requested when iteration reaches it. Later requests set `beforeSequence` to the previous page's `nextCursor`, and iteration ends after the page whose `complete` is true. Each iteration starts again from `input`, and every request has a new request ID.

Pagination: `sequence`. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true.

Iteration throws `ConvoHopProblem` if the authority rejects a request or a page is malformed or does not advance, and `IllegalStateException` if a page reports `refreshRequired`: start again from current state, not from the cursor.

Parameters:

- `input`: the first page's input

Returns: the pages, in order

Throws: `IllegalArgumentException` if the input's `beforeSequence` is not a valid cursor

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `CommunicationApi.getMessage` method

```java
public GetMessageReply getMessage(GetMessageRequestInput input)
```

Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes messageRead).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `CommunicationApi.inbox` method

```java
public InboxReply inbox(InboxRequestInput input)
```

List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession, backendKey (scopes messageRead).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `CommunicationApi.inboxPages` method

```java
public Iterable<InboxPage> inboxPages(InboxRequestInput input)
```

Every page of `inbox(InboxRequestInput)`, each requested when iteration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and iteration ends after the page whose `complete` is true. Each iteration starts again from `input`, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Iteration throws `ConvoHopProblem` if the authority rejects a request or a page is malformed or does not advance, and `IllegalStateException` if a page reports `refreshRequired`: start again from current state, not from the cursor.

Parameters:

- `input`: the first page's input

Returns: the pages, in order

Throws: `IllegalArgumentException` if the input's `cursor` is not a valid cursor

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `CommunicationApi.search` method

```java
public SearchReply search(SearchRequestInput input)
```

Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession, backendKey (scopes messageRead).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.search`](../../operations/communication/search.md).

#### `CommunicationApi.searchPages` method

```java
public Iterable<SearchPage> searchPages(SearchRequestInput input)
```

Every page of `search(SearchRequestInput)`, each requested when iteration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and iteration ends after the page whose `complete` is true. Each iteration starts again from `input`, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Iteration throws `ConvoHopProblem` if the authority rejects a request or a page is malformed or does not advance, and `IllegalStateException` if a page reports `refreshRequired`: start again from current state, not from the cursor.

Parameters:

- `input`: the first page's input

Returns: the pages, in order

Throws: `IllegalArgumentException` if the input's `cursor` is not a valid cursor

Sends [`communication.search`](../../operations/communication/search.md).

#### `CommunicationApi.resolveRequest` method

```java
public ResolveRequestReply resolveRequest(ResolveRequestRequestInput input)
```

Look up the stored outcome of an earlier communication mutation by its requestId.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition ownRequest), backendKey (condition ownRequest).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `CommunicationApi.getOperation` method

```java
public GetOperationReply getOperation(GetOperationRequestInput input)
```

Read the state of a long-running communication operation.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition operationParticipant), backendKey (condition operationParticipant).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `CommunicationApi.conversationMute` method

```java
public ConversationMuteReply conversationMute(ConversationMuteInput input)
```

Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes membershipManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `CommunicationApi.currentLiveSession` method

```java
public CurrentLiveSessionReply currentLiveSession(ConversationLiveInput input)
```

Return the active live session of a conversation, if any.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `CommunicationApi.liveSession` method

```java
public LiveSessionReply liveSession(LiveSessionInput input)
```

Read a live session.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `CommunicationApi.liveSessions` method

```java
public LiveSessionPageReply liveSessions(LiveSessionsInput input)
```

List the live sessions of a conversation.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `CommunicationApi.liveSessionsPages` method

```java
public Iterable<LiveSessionPage> liveSessionsPages(LiveSessionsInput input)
```

Every page of `liveSessions(LiveSessionsInput)`, each requested when iteration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and iteration ends after the page whose `complete` is true. Each iteration starts again from `input`, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Iteration throws `ConvoHopProblem` if the authority rejects a request or a page is malformed or does not advance, and `IllegalStateException` if a page reports `refreshRequired`: start again from current state, not from the cursor.

Parameters:

- `input`: the first page's input

Returns: the pages, in order

Throws: `IllegalArgumentException` if the input's `cursor` is not a valid cursor

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `CommunicationApi.liveSessionParticipants` method

```java
public LiveParticipantPageReply liveSessionParticipants(LiveParticipantsInput input)
```

List the participants of a live session.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `CommunicationApi.liveSessionParticipantsPages` method

```java
public Iterable<LiveParticipantPage> liveSessionParticipantsPages(LiveParticipantsInput input)
```

Every page of `liveSessionParticipants(LiveParticipantsInput)`, each requested when iteration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and iteration ends after the page whose `complete` is true. Each iteration starts again from `input`, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Iteration throws `ConvoHopProblem` if the authority rejects a request or a page is malformed or does not advance, and `IllegalStateException` if a page reports `refreshRequired`: start again from current state, not from the cursor.

Parameters:

- `input`: the first page's input

Returns: the pages, in order

Throws: `IllegalArgumentException` if the input's `cursor` is not a valid cursor

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `CommunicationApi.liveSessionOperation` method

```java
public LiveSessionOperationReply liveSessionOperation(LiveSessionOperationInput input)
```

Read the state of a live session start or end operation.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `CommunicationApi.sessionRequestOutcome` method

```java
public SessionRequestOutcomeReply sessionRequestOutcome(SessionRequestOutcomeRequestInput input)
```

Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: backendKey (scopes sessionIssue, sessionManage).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

#### `CommunicationApi.createPrincipal` method

```java
public CreatePrincipalReply createPrincipal(CreatePrincipalRequestInput input)
public CreatePrincipalReply createPrincipal(CreatePrincipalRequestInput input, @Nullable String requestId)
```

Create a principal for an application user.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes principalManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

#### `CommunicationApi.disablePrincipal` method

```java
public DisablePrincipalReply disablePrincipal(DisablePrincipalRequestInput input)
public DisablePrincipalReply disablePrincipal(DisablePrincipalRequestInput input, @Nullable String requestId)
```

Disable a principal.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes principalManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

#### `CommunicationApi.issueSession` method

```java
public IssueSessionReply issueSession(IssueSessionRequestInput input)
public IssueSessionReply issueSession(IssueSessionRequestInput input, @Nullable String requestId)
```

Issue a short-lived user session token for a principal and device.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes sessionIssue).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

#### `CommunicationApi.renewSession` method

```java
public RenewSessionReply renewSession(RenewSessionRequestInput input)
public RenewSessionReply renewSession(RenewSessionRequestInput input, @Nullable String requestId)
```

Renew a user session before it expires.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes sessionIssue).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

#### `CommunicationApi.revokeSession` method

```java
public RevokeSessionReply revokeSession(RevokeSessionRequestInput input)
public RevokeSessionReply revokeSession(RevokeSessionRequestInput input, @Nullable String requestId)
```

Revoke a user session.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition ownSession), backendKey (scopes sessionManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `CommunicationApi.createConversation` method

```java
public CreateConversationReply createConversation(CreateConversationRequestInput input)
public CreateConversationReply createConversation(CreateConversationRequestInput input, @Nullable String requestId)
```

Create a conversation with its initial members.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes conversationManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `CommunicationApi.updateConversation` method

```java
public UpdateConversationReply updateConversation(UpdateConversationRequestInput input)
public UpdateConversationReply updateConversation(UpdateConversationRequestInput input, @Nullable String requestId)
```

Update the title or properties of a conversation.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition moderator), backendKey (scopes conversationManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

#### `CommunicationApi.addMember` method

```java
public AddMemberReply addMember(AddMemberRequestInput input)
public AddMemberReply addMember(AddMemberRequestInput input, @Nullable String requestId)
```

Add a member, or change the role of an active member.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes membershipManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.addMember`](../../operations/communication/addMember.md).

#### `CommunicationApi.addMembers` method

```java
public AddMembersPayload addMembers(AddMembersInput input)
public AddMembersPayload addMembers(AddMembersInput input, @Nullable String requestId)
```

Add several members in one request.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes membershipManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

#### `CommunicationApi.removeMember` method

```java
public RemoveMemberReply removeMember(RemoveMemberRequestInput input)
public RemoveMemberReply removeMember(RemoveMemberRequestInput input, @Nullable String requestId)
```

Remove a member from a conversation.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes membershipManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

#### `CommunicationApi.historyGrant` method

```java
public HistoryGrantReply historyGrant(HistoryGrantRequestInput input)
public HistoryGrantReply historyGrant(HistoryGrantRequestInput input, @Nullable String requestId)
```

Expand the history a member can see to an earlier sequence.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes historyManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.historyGrant`](../../operations/communication/historyGrant.md).

#### `CommunicationApi.sendMessage` method

```java
public SendMessageReply sendMessage(SendMessageRequestInput input)
public SendMessageReply sendMessage(SendMessageRequestInput input, @Nullable String requestId)
```

Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition member), backendKey (scopes messageWrite).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `CommunicationApi.editMessage` method

```java
public EditMessageReply editMessage(EditMessageRequestInput input)
public EditMessageReply editMessage(EditMessageRequestInput input, @Nullable String requestId)
```

Edit a message.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition authorOrModerator), backendKey (scopes moderation).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `CommunicationApi.deleteMessage` method

```java
public DeleteMessageReply deleteMessage(DeleteMessageRequestInput input)
public DeleteMessageReply deleteMessage(DeleteMessageRequestInput input, @Nullable String requestId)
```

Delete a message.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition authorOrModerator), backendKey (scopes moderation).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `CommunicationApi.setBroadcastPermission` method

```java
public SetBroadcastPermissionPayload setBroadcastPermission(SetBroadcastPermissionInput input)
public SetBroadcastPermissionPayload setBroadcastPermission(SetBroadcastPermissionInput input, @Nullable String requestId)
```

Allow or deny a member to publish media in live sessions.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes membershipManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md).

#### `CommunicationApi.setConversationMute` method

```java
public SetConversationMutePayload setConversationMute(SetConversationMuteInput input)
public SetConversationMutePayload setConversationMute(SetConversationMuteInput input, @Nullable String requestId)
```

Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition member), backendKey (scopes membershipManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `CommunicationApi.alertLiveSession` method

```java
public AlertLiveSessionPayload alertLiveSession(AlertLiveSessionInput input)
public AlertLiveSessionPayload alertLiveSession(AlertLiveSessionInput input, @Nullable String requestId)
```

Alert (ring) conversation members about a live session.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition creatorOrModerator), backendKey (scopes callManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `CommunicationApi.endLiveSession` method

```java
public EndLiveSessionPayload endLiveSession(EndLiveSessionInput input)
public EndLiveSessionPayload endLiveSession(EndLiveSessionInput input, @Nullable String requestId)
```

End a live session for every participant. Completes asynchronously.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition creatorOrModerator), backendKey (scopes callManage).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

#### `CommunicationApi.redeemCredential` method

```java
public RedeemCredentialReply redeemCredential(RedeemCredentialRequestInput input, Map<String, @Nullable Object> credentialDeliveryPermit)
public RedeemCredentialReply redeemCredential(RedeemCredentialRequestInput input, Map<String, @Nullable Object> credentialDeliveryPermit, @Nullable String requestId)
```

Redeem a delivered credential with its delivery permit.

Idempotency: `permitBound`. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.

Authorization: deliveryPermit.

Parameters:

- `input`: the operation input
- `credentialDeliveryPermit`: the `credentialDeliveryPermit` credential, passed unchanged in the request context
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.redeemCredential`](../../operations/communication/redeemCredential.md).

#### `CommunicationApi.acknowledgeCredential` method

```java
public AcknowledgeCredentialReply acknowledgeCredential(AcknowledgeCredentialRequestInput input, Map<String, @Nullable Object> credentialDeliveryPermit)
public AcknowledgeCredentialReply acknowledgeCredential(AcknowledgeCredentialRequestInput input, Map<String, @Nullable Object> credentialDeliveryPermit, @Nullable String requestId)
```

Acknowledge that a redeemed credential is stored, closing the delivery.

Idempotency: `permitBound`. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.

Authorization: deliveryPermit.

Parameters:

- `input`: the operation input
- `credentialDeliveryPermit`: the `credentialDeliveryPermit` credential, passed unchanged in the request context
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`communication.acknowledgeCredential`](../../operations/communication/acknowledgeCredential.md).

### `ConvoHopProblem` class

```java
public class ConvoHopProblem extends RuntimeException
```

A request the authority rejected, or one whose outcome the SDK could not establish.

Classify a problem by `getCode()`. `getOutcome()` says what is known about the request: `rejected` means it had no effect, `committed` or `accepted` means it took effect, and `unknown` means it may have taken effect, so resolve or retry the same request ID instead of sending a new one. Messages never contain credentials.

Package: `com.convohop.server`.

#### `ConvoHopProblem` constructor

```java
public ConvoHopProblem(String code, String requestId, String outcome, int status, String message)
public ConvoHopProblem(String code, String requestId, String outcome, int status, String message, @Nullable Duration retryAfter, @Nullable Throwable cause)
```

Creates a problem with a retry delay and a cause.

Parameters:

- `code`: the stable error code, such as `RATE_LIMITED`
- `requestId`: the request ID the problem belongs to
- `outcome`: what is known about the request: `rejected`, `unknown`, `committed` or `accepted`
- `status`: the HTTP status, or 0 when no response arrived
- `message`: a description without credentials
- `retryAfter`: how long to wait before resending the same request, or null
- `cause`: the underlying failure, or null

#### `ConvoHopProblem.getCode` method

```java
public String getCode()
```

The stable error code, such as `RATE_LIMITED` or `TRANSPORT_UNKNOWN`.

Returns: the code

#### `ConvoHopProblem.getRequestId` method

```java
public String getRequestId()
```

The request ID the problem belongs to. Resolve or retry with this ID when the outcome is `unknown`.

Returns: the request ID

#### `ConvoHopProblem.getOutcome` method

```java
public String getOutcome()
```

What is known about the request: `rejected`, `unknown`, `committed` or `accepted`.

Returns: the outcome

#### `ConvoHopProblem.getStatus` method

```java
public int getStatus()
```

The HTTP status, or 0 when no authority response arrived.

Returns: the status

#### `ConvoHopProblem.getRetryAfter` method

```java
public @Nullable Duration getRetryAfter()
```

How long to wait before resending the same request, when the authority sent a delay (for example with `RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds. The SDK never waits or resends on its own because of it.

Returns: the delay in whole seconds, or null

### `FcmRequest` class

```java
public final class FcmRequest
```

An FCM data message from `PushPayloads.fcm`. `getMessage()` is an FCM HTTP v1 `messages:send` message without a target: add `token` or `fid`. With the Firebase Admin SDK, put `getData()` and set the Android priority, TTL and collapse key from the getters. `toString()` omits the data.

Package: `com.convohop.server.push`.

#### `FcmRequest.getData` method

```java
public Map<String, String> getData()
```

The data: `convohop`, the push metadata as JSON. At most 4096 bytes as JSON.

Returns: the data

#### `FcmRequest.getPriority` method

```java
public String getPriority()
```

The Android message priority: `HIGH`.

Returns: the priority

#### `FcmRequest.getTtlSeconds` method

```java
public long getTtlSeconds()
```

The Android TTL. The Firebase Admin SDK for Java takes it in milliseconds.

Returns: the TTL in seconds

#### `FcmRequest.getCollapseKey` method

```java
public @Nullable String getCollapseKey()
```

The Android collapse key of calls and cancellations: the ring's collapse key.

Returns: the collapse key, or null for messages

#### `FcmRequest.getMessage` method

```java
public String getMessage()
```

The FCM HTTP v1 message without a target, as JSON: `data`, then `android` with `priority`, `ttl` and, for calls, `collapse_key`.

Returns: the message

### `ManagementApi` class

```java
public final class ManagementApi
```

The `management` plane: Organizations, deployments, projects, backend keys and webhooks.

Obtain an instance from a client; every call blocks until the authority answers or the request fails.

Package: `com.convohop.server.api`.

#### `ManagementApi.capabilities` method

```java
public CapabilitiesReply capabilities()
```

Describe the management features and limits the authority supports.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential.

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.capabilities`](../../operations/management/capabilities.md).

#### `ManagementApi.organizations` method

```java
public OrganizationsReply organizations()
```

List the organizations the caller can access.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential.

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.organizations`](../../operations/management/organizations.md).

#### `ManagementApi.getOrganization` method

```java
public GetOrganizationReply getOrganization(GetOrganizationRequestInput input)
```

Read an organization.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.getOrganization`](../../operations/management/getOrganization.md).

#### `ManagementApi.getDeployment` method

```java
public GetDeploymentReply getDeployment(GetDeploymentRequestInput input)
```

Read a deployment.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.getDeployment`](../../operations/management/getDeployment.md).

#### `ManagementApi.getProject` method

```java
public GetProjectReply getProject(GetProjectRequestInput input)
```

Read a project.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.getProject`](../../operations/management/getProject.md).

#### `ManagementApi.deploymentHealth` method

```java
public DeploymentHealthReply deploymentHealth(DeploymentHealthRequestInput input)
```

Read the health of a deployment.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.deploymentHealth`](../../operations/management/deploymentHealth.md).

#### `ManagementApi.deploymentUsage` method

```java
public DeploymentUsageReply deploymentUsage(DeploymentUsageRequestInput input)
```

Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.deploymentUsage`](../../operations/management/deploymentUsage.md).

#### `ManagementApi.projectUsage` method

```java
public ProjectUsageReply projectUsage(ProjectUsageRequestInput input)
```

Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.projectUsage`](../../operations/management/projectUsage.md).

#### `ManagementApi.organizationUsage` method

```java
public OrganizationUsageReply organizationUsage(OrganizationUsageRequestInput input)
```

Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.organizationUsage`](../../operations/management/organizationUsage.md).

#### `ManagementApi.organizationBilling` method

```java
public OrganizationBillingReply organizationBilling(OrganizationBillingRequestInput input)
```

Read the billing state of an organization in any status: the plan whose limits apply, whether ConvoHop bills the organization and, when it does, its standing and subscription.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

#### `ManagementApi.webhookEndpoints` method

```java
public WebhookEndpointsReply webhookEndpoints(WebhookEndpointsRequestInput input)
```

List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.webhookEndpoints`](../../operations/management/webhookEndpoints.md).

#### `ManagementApi.webhookDeliveries` method

```java
public WebhookDeliveriesReply webhookDeliveries(WebhookDeliveriesRequestInput input)
```

List recent deliveries of a webhook endpoint.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.webhookDeliveries`](../../operations/management/webhookDeliveries.md).

#### `ManagementApi.resolveRequest` method

```java
public ResolveRequestReply resolveRequest(ResolveRequestRequestInput input)
```

Look up the stored outcome of an earlier management mutation by its requestId.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition ownRequest).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `ManagementApi.getOperation` method

```java
public GetOperationReply getOperation(GetOperationRequestInput input)
```

Read the state of a long-running management operation.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.getOperation`](../../operations/management/getOperation.md).

#### `ManagementApi.createOrganization` method

```java
public CreateOrganizationReply createOrganization(CreateOrganizationRequestInput input)
public CreateOrganizationReply createOrganization(CreateOrganizationRequestInput input, @Nullable String requestId)
```

Create an organization.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential.

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.createOrganization`](../../operations/management/createOrganization.md).

#### `ManagementApi.createDeployment` method

```java
public CreateDeploymentReply createDeployment(CreateDeploymentRequestInput input)
public CreateDeploymentReply createDeployment(CreateDeploymentRequestInput input, @Nullable String requestId)
```

Create a deployment in an organization. Completes asynchronously.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.createDeployment`](../../operations/management/createDeployment.md).

#### `ManagementApi.createProject` method

```java
public CreateProjectReply createProject(CreateProjectRequestInput input)
public CreateProjectReply createProject(CreateProjectRequestInput input, @Nullable String requestId)
```

Create a project in a ready deployment. Completes asynchronously.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.createProject`](../../operations/management/createProject.md).

#### `ManagementApi.issueBackendKey` method

```java
public IssueBackendKeyReply issueBackendKey(IssueBackendKeyRequestInput input)
public IssueBackendKeyReply issueBackendKey(IssueBackendKeyRequestInput input, @Nullable String requestId)
```

Issue a scoped backend key. The secret is delivered once through a credential delivery.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

#### `ManagementApi.revokeBackendKey` method

```java
public RevokeBackendKeyReply revokeBackendKey(RevokeBackendKeyRequestInput input)
public RevokeBackendKeyReply revokeBackendKey(RevokeBackendKeyRequestInput input, @Nullable String requestId)
```

Revoke a backend key, optionally revoking the sessions it issued.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.revokeBackendKey`](../../operations/management/revokeBackendKey.md).

#### `ManagementApi.projectPolicy` method

```java
public ProjectPolicyReply projectPolicy(ProjectPolicyRequestInput input)
public ProjectPolicyReply projectPolicy(ProjectPolicyRequestInput input, @Nullable String requestId)
```

Change the policy of a project.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.projectPolicy`](../../operations/management/projectPolicy.md).

#### `ManagementApi.credentialPermit` method

```java
public CredentialPermitReply credentialPermit(CredentialPermitRequestInput input)
public CredentialPermitReply credentialPermit(CredentialPermitRequestInput input, @Nullable String requestId)
```

Issue a signed permit that authorizes redeeming one credential delivery.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.credentialPermit`](../../operations/management/credentialPermit.md).

#### `ManagementApi.pauseOperation` method

```java
public PauseOperationReply pauseOperation(PauseOperationRequestInput input)
public PauseOperationReply pauseOperation(PauseOperationRequestInput input, @Nullable String requestId)
```

Pause a long-running operation.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.pauseOperation`](../../operations/management/pauseOperation.md).

#### `ManagementApi.resumeOperation` method

```java
public ResumeOperationReply resumeOperation(ResumeOperationRequestInput input)
public ResumeOperationReply resumeOperation(ResumeOperationRequestInput input, @Nullable String requestId)
```

Resume a paused operation.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.resumeOperation`](../../operations/management/resumeOperation.md).

#### `ManagementApi.createBillingCheckoutSession` method

```java
public CreateBillingCheckoutSessionReply createBillingCheckoutSession(CreateBillingCheckoutSessionRequestInput input)
public CreateBillingCheckoutSessionReply createBillingCheckoutSession(CreateBillingCheckoutSessionRequestInput input, @Nullable String requestId)
```

Create a hosted checkout link that subscribes an active organization to a self-service plan. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

Idempotency: `singleUse`. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

#### `ManagementApi.createBillingPortalSession` method

```java
public CreateBillingPortalSessionReply createBillingPortalSession(CreateBillingPortalSessionRequestInput input)
public CreateBillingPortalSessionReply createBillingPortalSession(CreateBillingPortalSessionRequestInput input, @Nullable String requestId)
```

Create a hosted billing portal link where an organization manages its payment methods, invoices and subscription. The link grants access to whoever holds it; a retry with the same requestId returns the same link until it expires.

Idempotency: `singleUse`. Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

#### `ManagementApi.configureWebhook` method

```java
public ConfigureWebhookReply configureWebhook(ConfigureWebhookRequestInput input)
public ConfigureWebhookReply configureWebhook(ConfigureWebhookRequestInput input, @Nullable String requestId)
```

Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.configureWebhook`](../../operations/management/configureWebhook.md).

#### `ManagementApi.updateWebhook` method

```java
public UpdateWebhookReply updateWebhook(UpdateWebhookRequestInput input)
public UpdateWebhookReply updateWebhook(UpdateWebhookRequestInput input, @Nullable String requestId)
```

Change the event types of a webhook endpoint, or enable or disable it.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.updateWebhook`](../../operations/management/updateWebhook.md).

#### `ManagementApi.rotateWebhookSecret` method

```java
public RotateWebhookSecretReply rotateWebhookSecret(RotateWebhookSecretRequestInput input)
public RotateWebhookSecretReply rotateWebhookSecret(RotateWebhookSecretRequestInput input, @Nullable String requestId)
```

Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md).

#### `ManagementApi.disableWebhook` method

```java
public DisableWebhookReply disableWebhook(DisableWebhookRequestInput input)
public DisableWebhookReply disableWebhook(DisableWebhookRequestInput input, @Nullable String requestId)
```

Disable a webhook endpoint.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.disableWebhook`](../../operations/management/disableWebhook.md).

#### `ManagementApi.replayWebhookDeliveries` method

```java
public ReplayWebhookDeliveriesReply replayWebhookDeliveries(ReplayWebhookDeliveriesRequestInput input)
public ReplayWebhookDeliveriesReply replayWebhookDeliveries(ReplayWebhookDeliveriesRequestInput input, @Nullable String requestId)
```

Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Parameters:

- `input`: the operation input
- `requestId`: the request ID to reuse for a retry with the same input, or `null` for a new one

Returns: the authority result

Throws: `ConvoHopProblem` if the authority rejects the request or its outcome is unknown

Sends [`management.replayWebhookDeliveries`](../../operations/management/replayWebhookDeliveries.md).

### `ManagementClient` class

```java
public final class ManagementClient
```

Operator client for organizations, deployments, projects and backend keys. Its access token is an operator credential: use it only in trusted tooling, never in application servers that serve users, browsers or apps.

Clients are safe for concurrent use, and calls block the calling thread.

Package: `com.convohop.server`.

#### `ManagementClient.builder` static method

```java
public static Builder builder()
```

Starts a client.

Returns: a builder

#### `ManagementClient.management` method

```java
public ManagementApi management()
```

Every management query and mutation in the schema, with the generated inputs and replies.

Returns: the management API over this client's transport

#### `ManagementClient.requests` method

```java
public Requests requests()
```

Request resolution and retry.

Returns: the request helpers

#### `ManagementClient.getRecoveryStates` method

```java
public List<RecoveryState> getRecoveryStates()
```

Snapshots of the mutation recovery records this client holds, oldest first.

Returns: an unmodifiable list

#### `ManagementClient.issueBackendKey` method

```java
public IssueBackendKeyReply issueBackendKey(String projectId, String name, List<String> scopes, String expiresAt)
public IssueBackendKeyReply issueBackendKey(String projectId, String name, List<String> scopes, String expiresAt, @Nullable String requestId)
```

Requests a backend key for a project. The authority accepts the request as an operation and hands the key over once, through credential delivery, never as an ordinary result.

Parameters:

- `projectId`: the project ID
- `name`: a name for the key
- `scopes`: the scopes the key grants
- `expiresAt`: when the key expires, as an RFC 3339 timestamp
- `requestId`: the request ID to send, or `null` for a new one

Returns: the reply

Throws: `ConvoHopProblem` if the authority rejects the request

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

### `ManagementClient.Builder` class

```java
public static final class Builder
```

Builds a `ManagementClient`.

Package: `com.convohop.server`.

#### `ManagementClient.Builder.baseUrl` method

```java
public Builder baseUrl(String baseUrl)
```

Sets the authority origin: HTTPS, or HTTP on a loopback host for local development. Required.

Parameters:

- `baseUrl`: the origin, such as `https://api.example.com`

Returns: this builder

#### `ManagementClient.Builder.accessToken` method

```java
public Builder accessToken(String accessToken)
```

Sets the operator access token. Required. Load it from a secret store; never embed it in code.

Parameters:

- `accessToken`: the access token

Returns: this builder

#### `ManagementClient.Builder.actorId` method

```java
public Builder actorId(String actorId)
```

Sets the operator the token belongs to, which scopes the recovery records. Required.

Parameters:

- `actorId`: the operator's principal ID

Returns: this builder

#### `ManagementClient.Builder.recoveryStorage` method

```java
public Builder recoveryStorage(@Nullable RecoveryStorage recoveryStorage)
```

Keeps mutation recovery records in storage the caller approves, so a new client can resolve or retry them. Records hold request inputs, never credentials.

Parameters:

- `recoveryStorage`: the storage, or `null` to keep records in memory only

Returns: this builder

#### `ManagementClient.Builder.httpClient` method

```java
public Builder httpClient(@Nullable HttpClient httpClient)
```

Sets the HTTP client. It must not follow redirects.

Parameters:

- `httpClient`: the client, or `null` for a default one

Returns: this builder

#### `ManagementClient.Builder.build` method

```java
public ManagementClient build()
```

Builds the client. Building sends nothing.

Returns: the client

Throws: `IllegalStateException` if a required setting is missing

Throws: `IllegalArgumentException` if a setting is invalid, or stored recovery records are malformed

### `Operations` class

```java
public final class Operations
```

Descriptors of the server-layer queries and mutations, and each plane's resolve operation.

Package: `com.convohop.server.api`.

### `ProjectServerClient` class

```java
public final class ProjectServerClient
```

Backend-key client for one project. Use it only in trusted server runtimes; never ship a backend key to a browser or a mobile app.

The helpers check that each result names the resource the request did. `communication()` reaches every backend operation in the schema without those checks. A key without the scope an operation needs fails with `ScopeRequiredProblem`. Handles from `conversation(String)` send nothing until a method is called.

Clients are safe for concurrent use. Calls block the calling thread; the `convohop-server-kotlin` module adds suspending wrappers. Mutations accept an optional request ID: pass the same ID to repeat a mutation safely, and see `requests()` to recover one whose outcome is unknown.

Package: `com.convohop.server`.

#### `ProjectServerClient.builder` static method

```java
public static Builder builder()
```

Starts a client.

Returns: a builder

#### `ProjectServerClient.getProjectId` method

```java
public String getProjectId()
```

The project this client acts on.

Returns: the project ID

#### `ProjectServerClient.getIncarnation` method

```java
public String getIncarnation()
```

The project incarnation this client was built for. Requests carry it, and the authority rejects them once the project has a different incarnation.

Returns: the incarnation

#### `ProjectServerClient.getRecoveryStates` method

```java
public List<RecoveryState> getRecoveryStates()
```

Snapshots of the mutation recovery records this client holds, oldest first.

Returns: an unmodifiable list

#### `ProjectServerClient.communication` method

```java
public CommunicationApi communication()
```

Every backend query and mutation in the schema, with the generated inputs and replies. Results are not checked against the request.

Returns: the communication API over this client's transport

#### `ProjectServerClient.principals` method

```java
public Principals principals()
```

Principal helpers.

Returns: the principal helpers

##### `ProjectServerClient.principals.create` method

```java
public Principal create(String externalUserId)
public Principal create(String externalUserId, @Nullable String requestId)
```

Creates a principal for an external user ID.

Parameters:

- `externalUserId`: the application's user ID
- `requestId`: the request ID to send, or `null` for a new one

Returns: the principal

Throws: `ConvoHopProblem` if the authority rejects the request or its reply names another user

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

##### `ProjectServerClient.principals.get` method

```java
public Principal get(String principalId)
```

Reads a principal.

Parameters:

- `principalId`: the principal ID

Returns: the principal

Throws: `ConvoHopProblem` if the authority rejects the read or its reply names another principal

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

##### `ProjectServerClient.principals.disable` method

```java
public Principal disable(String principalId, String expectedRevision)
public Principal disable(String principalId, String expectedRevision, @Nullable String requestId)
```

Disables a principal.

Parameters:

- `principalId`: the principal ID
- `expectedRevision`: the principal's current revision
- `requestId`: the request ID to send, or `null` for a new one

Returns: the disabled principal

Throws: `ConvoHopProblem` if the authority rejects the request or its reply names another principal

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

#### `ProjectServerClient.sessions` method

```java
public Sessions sessions()
```

User session helpers.

Returns: the session helpers

##### `ProjectServerClient.sessions.issue` method

```java
public SessionBootstrap issue(String principalId, String deviceId)
public SessionBootstrap issue(String principalId, String deviceId, @Nullable String requestedTtlMs, @Nullable String requestId)
```

Issues a session.

Parameters:

- `principalId`: the principal ID
- `deviceId`: the device ID
- `requestedTtlMs`: the lifetime in milliseconds as a decimal string, or `null` for 15 minutes
- `requestId`: the request ID to send, or `null` for a new one

Returns: the session and its token

Throws: `ConvoHopProblem` if the authority rejects the request or its reply names another session

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

##### `ProjectServerClient.sessions.renew` method

```java
public SessionBootstrap renew(String sessionId, String principalId, String deviceId, String expectedRevision)
public SessionBootstrap renew(String sessionId, String principalId, String deviceId, String expectedRevision, @Nullable String requestedTtlMs, @Nullable String requestId)
```

Renews a session.

Parameters:

- `sessionId`: the session ID
- `principalId`: the session's principal ID
- `deviceId`: the session's device ID
- `expectedRevision`: the session's current revision
- `requestedTtlMs`: the lifetime in milliseconds as a decimal string, or `null` for 15 minutes
- `requestId`: the request ID to send, or `null` for a new one

Returns: the renewed session and its new token

Throws: `ConvoHopProblem` if the authority rejects the request or its reply names another session

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

##### `ProjectServerClient.sessions.revoke` method

```java
public SessionRevocation revoke(String sessionId, String expectedRevision)
public SessionRevocation revoke(String sessionId, String expectedRevision, @Nullable String requestId)
```

Revokes a session.

Parameters:

- `sessionId`: the session ID
- `expectedRevision`: the session's current revision
- `requestId`: the request ID to send, or `null` for a new one

Returns: the revocation

Throws: `ConvoHopProblem` if the authority rejects the request or its reply names another session

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `ProjectServerClient.conversations` method

```java
public Conversations conversations()
```

Conversation creation.

Returns: the conversation helpers

##### `ProjectServerClient.conversations.create` method

```java
public Conversation create(CreateConversationRequestInput input)
public Conversation create(CreateConversationRequestInput input, @Nullable String requestId)
```

Creates a conversation.

Parameters:

- `input`: the title, properties and initial members
- `requestId`: the request ID to send, or `null` for a new one

Returns: the conversation

Throws: `ConvoHopProblem` if the authority rejects the request or its reply is malformed

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `ProjectServerClient.requests` method

```java
public Requests requests()
```

Request resolution and retry.

Returns: the request helpers

#### `ProjectServerClient.conversation` method

```java
public ServerConversation conversation(String conversationId)
```

A handle for one conversation. Creating it sends nothing.

Parameters:

- `conversationId`: the conversation ID

Returns: the handle

Throws: `IllegalArgumentException` if the ID is not a canonical nonzero UUID

#### `ProjectServerClient.initialize` method

```java
public void initialize()
```

Reads the route of this client's project and records its serving epoch, which later requests carry.

Throws: `IllegalStateException` if the project or its incarnation changed; recover explicitly

Throws: `ConvoHopProblem` if the authority rejects the read or its reply is malformed

Sends [`communication.route`](../../operations/communication/route.md).

#### `ProjectServerClient.capabilities` method

```java
public Capabilities capabilities()
```

Reads the authority's capabilities and limits.

Returns: the capabilities

Throws: `ConvoHopProblem` if the authority rejects the read or its reply is malformed

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `ProjectServerClient.operation` method

```java
public Operation operation(String operationId)
```

Reads a long-running operation.

Parameters:

- `operationId`: the operation ID

Returns: the operation

Throws: `IllegalArgumentException` if the ID is not a canonical nonzero UUID

Throws: `ConvoHopProblem` if the authority rejects the read or its reply names another operation

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

### `ProjectServerClient.Builder` class

```java
public static final class Builder
```

Builds a `ProjectServerClient`.

Package: `com.convohop.server`.

#### `ProjectServerClient.Builder.baseUrl` method

```java
public Builder baseUrl(String baseUrl)
```

Sets the authority origin: HTTPS, or HTTP on a loopback host for local development. Required.

Parameters:

- `baseUrl`: the origin, such as `https://api.example.com`

Returns: this builder

#### `ProjectServerClient.Builder.projectId` method

```java
public Builder projectId(String projectId)
```

Sets the project. Required.

Parameters:

- `projectId`: the project ID

Returns: this builder

#### `ProjectServerClient.Builder.backendKey` method

```java
public Builder backendKey(String backendKey)
```

Sets the backend key. Required. Load it from a secret store; never embed it in code or client apps.

Parameters:

- `backendKey`: the backend key

Returns: this builder

#### `ProjectServerClient.Builder.incarnation` method

```java
public Builder incarnation(String incarnation)
```

Sets the project incarnation the client acts in. Required.

Parameters:

- `incarnation`: the incarnation

Returns: this builder

#### `ProjectServerClient.Builder.recoveryStorage` method

```java
public Builder recoveryStorage(@Nullable RecoveryStorage recoveryStorage)
```

Keeps mutation recovery records in storage the caller approves, so a new client can resolve or retry them. Records hold request inputs, never credentials.

Parameters:

- `recoveryStorage`: the storage, or `null` to keep records in memory only

Returns: this builder

#### `ProjectServerClient.Builder.httpClient` method

```java
public Builder httpClient(@Nullable HttpClient httpClient)
```

Sets the HTTP client. It must not follow redirects.

Parameters:

- `httpClient`: the client, or `null` for a default one

Returns: this builder

#### `ProjectServerClient.Builder.build` method

```java
public ProjectServerClient build()
```

Builds the client. Building sends nothing; call `ProjectServerClient.initialize()` to check the route.

Returns: the client

Throws: `IllegalStateException` if a required setting is missing

Throws: `IllegalArgumentException` if a setting is invalid, or stored recovery records are malformed

### `PushOptions` class

```java
public final class PushOptions
```

Options for `PushPayloads`. Immutable; `toString()` omits the visible text.

Package: `com.convohop.server.push`.

#### `PushOptions.defaults` static method

```java
public static PushOptions defaults()
```

Options without a title or body, with message previews enabled and the system clock.

Returns: the default options

#### `PushOptions.builder` static method

```java
public static Builder builder()
```

Starts options.

Returns: a builder

#### `PushOptions.getTitle` method

```java
public @Nullable String getTitle()
```

The visible title.

Returns: the title, or null for none

#### `PushOptions.getBody` method

```java
public @Nullable String getBody()
```

The visible body, which replaces the message preview.

Returns: the body, or null for none

#### `PushOptions.isPreview` method

```java
public boolean isPreview()
```

Whether a message event's preview becomes the body when there is no body.

Returns: whether previews are shown

#### `PushOptions.getClock` method

```java
public Clock getClock()
```

The clock for the TTL and expiration.

Returns: the clock

### `PushOptions.Builder` class

```java
public static final class Builder
```

Configures `PushOptions`.

Package: `com.convohop.server.push`.

#### `PushOptions.Builder.title` method

```java
public Builder title(@Nullable String title)
```

Sets the visible title, such as the sender's or conversation's name.

Parameters:

- `title`: the title; null or empty for none

Returns: this builder

Throws: `IllegalArgumentException` if the title has a lone surrogate

#### `PushOptions.Builder.body` method

```java
public Builder body(@Nullable String body)
```

Sets the visible body, which replaces the message preview.

Parameters:

- `body`: the body; null or empty for none

Returns: this builder

Throws: `IllegalArgumentException` if the body has a lone surrogate

#### `PushOptions.Builder.preview` method

```java
public Builder preview(boolean preview)
```

Sets whether a message event's preview becomes the body when there is no body. Defaults to true.

Parameters:

- `preview`: whether previews are shown

Returns: this builder

#### `PushOptions.Builder.clock` method

```java
public Builder clock(Clock clock)
```

Sets the clock for the TTL and expiration. Defaults to `Clock.systemUTC()`.

Parameters:

- `clock`: the clock

Returns: this builder

#### `PushOptions.Builder.build` method

```java
public PushOptions build()
```

Builds the options.

Returns: the options

### `PushPayloads` class

```java
public final class PushPayloads
```

Builds provider requests from per-recipient notification events (`notification.message`, `notification.call` and `notification.callCancelled`), as `WebhookVerifier.verify` returns them or `WebhookNotificationEvent.parse` validates them. The contract is `spec/push-payload/`.

Each builder returns null when the event doesn't apply to the platform or is stale. Payloads are metadata-only unless you set a title or body, or the event carries an opted-in message preview. Every payload carries a `convohop` object: the event's fields without `subjectRef`, `connected` and `preview`. APNs VoIP, FCM and Web Push payloads also carry the visible `title` and `body` there, because they have no visible alert of their own. A payload that exceeds its platform's limit has its body, then its title, shortened to the longest prefix that fits followed by `…`.

Package: `com.convohop.server.push`.

#### `PushPayloads.apnsAlert` static method

```java
public static @Nullable ApnsRequest apnsAlert(WebhookNotificationEvent event, String bundleId)
public static @Nullable ApnsRequest apnsAlert(WebhookNotificationEvent event, String bundleId, PushOptions options)
```

An APNs alert for a message, an incoming call, or a missed call (a cancellation with reason `ended` or `expired`). The payload is at most 4096 bytes.

Parameters:

- `event`: the notification event
- `bundleId`: the app's bundle ID: the `apns-topic`
- `options`: the options

Returns: the request, or null when the event is a cancellation that isn't a missed call, or is stale

Throws: `IllegalArgumentException` if the bundle ID isn't an app bundle ID

#### `PushPayloads.apnsVoip` static method

```java
public static @Nullable ApnsRequest apnsVoip(WebhookNotificationEvent event, String bundleId)
public static @Nullable ApnsRequest apnsVoip(WebhookNotificationEvent event, String bundleId, PushOptions options)
```

An APNs VoIP push for an incoming call. iOS requires you to report every VoIP push to CallKit as a call. The payload is at most 5120 bytes.

Parameters:

- `event`: the notification event
- `bundleId`: the app's bundle ID; the `apns-topic` is the bundle ID followed by `.voip`
- `options`: the options

Returns: the request, or null when the event isn't an incoming call, or is stale

Throws: `IllegalArgumentException` if the bundle ID isn't an app bundle ID

#### `PushPayloads.fcm` static method

```java
public static @Nullable FcmRequest fcm(WebhookNotificationEvent event)
public static @Nullable FcmRequest fcm(WebhookNotificationEvent event, PushOptions options)
```

An FCM data message for any notification event. The data is at most 4096 bytes as JSON.

Parameters:

- `event`: the notification event
- `options`: the options

Returns: the request, or null when the event is stale

#### `PushPayloads.webPush` static method

```java
public static @Nullable WebPushRequest webPush(WebhookNotificationEvent event)
public static @Nullable WebPushRequest webPush(WebhookNotificationEvent event, PushOptions options)
```

A Web Push message for any notification event. The payload is at most 3993 bytes, the RFC 8291 plaintext limit.

Parameters:

- `event`: the notification event
- `options`: the options

Returns: the request, or null when the event is stale

### `RecoveryState` class

```java
public final class RecoveryState
```

A snapshot of one mutation's recovery record: the original request ID, payload and incarnation, the retry budget and what is known about the outcome. Records are created and updated only by the SDK.

Package: `com.convohop.server`.

#### `RecoveryState.getRequestId` method

```java
public String getRequestId()
```

The original request ID.

Returns: the request ID

#### `RecoveryState.getIncarnation` method

```java
public String getIncarnation()
```

The project incarnation the request was sent in, or `management` for management requests.

Returns: the incarnation

#### `RecoveryState.getPayloadFingerprint` method

```java
public String getPayloadFingerprint()
```

The SHA-256 fingerprint of the operation, project and input.

Returns: the fingerprint, prefixed with `sha256:`

#### `RecoveryState.getOperation` method

```java
public String getOperation()
```

The operation ID, such as `communication.sendMessage`.

Returns: the operation ID

#### `RecoveryState.getProjectId` method

```java
public @Nullable String getProjectId()
```

The project of a communication request, or null for management requests.

Returns: the project ID, or null

#### `RecoveryState.getInput` method

```java
public Map<String, @Nullable Object> getInput()
```

The original operation input.

Returns: the unmodifiable input

#### `RecoveryState.getFirstSubmittedAt` method

```java
public Instant getFirstSubmittedAt()
```

When the record was created.

Returns: the time

#### `RecoveryState.getRetryDeadline` method

```java
public Instant getRetryDeadline()
```

After this time the request is no longer resent; resolve it read-only.

Returns: the time

#### `RecoveryState.getAttemptCount` method

```java
public int getAttemptCount()
```

How many times the request was sent.

Returns: the count

#### `RecoveryState.getLastAttemptAt` method

```java
public Instant getLastAttemptAt()
```

When the request was last sent, or created if it was not sent.

Returns: the time

#### `RecoveryState.getLastAttemptClassification` method

```java
public String getLastAttemptClassification()
```

How the last attempt ended, such as `submitted`, `authorityReceipt` or an error code.

Returns: the classification

#### `RecoveryState.getResolution` method

```java
public Resolution getResolution()
```

What is known about the outcome.

Returns: the resolution

#### `RecoveryState.isMediaAdmissionAttempted` method

```java
public boolean isMediaAdmissionAttempted()
```

Whether a native media connection was attempted with the request's credentials, which forbids a resend.

Returns: whether native admission was attempted

### `Requests` class

```java
public final class Requests
```

Resolves and retries mutations by their original request ID. A `ConvoHopProblem` whose outcome is `unknown` means the mutation may or may not have committed: resolve it, or retry it with the same request ID, instead of sending it again under a new one.

Package: `com.convohop.server`.

#### `Requests.resolve` method

```java
public RequestResolution resolve(String requestId)
```

Reads what the authority knows about a request.

Parameters:

- `requestId`: the original request ID

Returns: the resolution: `notObservedYet`, `accepted` or `committed`

Throws: `IllegalArgumentException` if the request ID is not a canonical nonzero UUID

Throws: `ConvoHopProblem` if the authority rejects the lookup or its reply is malformed

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `Requests.retry` method

```java
public RequestResolution retry(String requestId)
```

Resolves a mutation this client recorded and, when the authority has not observed it and the retry budget allows, sends it again with its original request ID and payload.

Parameters:

- `requestId`: the original request ID

Returns: the current resolution

Throws: `IllegalArgumentException` if the request ID is not a canonical nonzero UUID

Throws: `IllegalStateException` if this client holds no recovery record for the request

Throws: `ConvoHopProblem` `RESOLUTION_REQUIRED` once the request is no longer eligible for resend, or the error of the lookup or the resend

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`management.resolveRequest`](../../operations/management/resolveRequest.md).

### `ScopeRequiredProblem` class

```java
public final class ScopeRequiredProblem extends ConvoHopProblem
```

`SCOPE_REQUIRED`: the backend key lacks a scope the operation requires (403, rejected, not retryable). Classify it by `ConvoHopProblem.getCode()`; `getScope()` is a diagnostic detail.

Package: `com.convohop.server`.

#### `ScopeRequiredProblem.CODE` static property

```java
public static final String CODE = "SCOPE_REQUIRED"
```

The error code.

#### `ScopeRequiredProblem` constructor

```java
public ScopeRequiredProblem(String requestId, String outcome, int status, String message, @Nullable Duration retryAfter)
```

Creates the problem and reads the missing scope from the authority's message.

Parameters:

- `requestId`: the request ID
- `outcome`: the request outcome
- `status`: the HTTP status
- `message`: the authority's message
- `retryAfter`: the retry delay, or null

#### `ScopeRequiredProblem.getScope` method

```java
public @Nullable String getScope()
```

The missing scope. The authority names it only in the message, so this is null when the message does not match the documented wording. A missing read scope is reported as the read scope even where its manage scope (for example `callManage` for `callRead`) would also satisfy the operation.

Returns: the scope, or null

#### `ScopeRequiredProblem.getCode` method

```java
public String getCode()
```

The stable error code, such as `RATE_LIMITED` or `TRANSPORT_UNKNOWN`.

Returns: the code

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.getRequestId` method

```java
public String getRequestId()
```

The request ID the problem belongs to. Resolve or retry with this ID when the outcome is `unknown`.

Returns: the request ID

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.getOutcome` method

```java
public String getOutcome()
```

What is known about the request: `rejected`, `unknown`, `committed` or `accepted`.

Returns: the outcome

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.getStatus` method

```java
public int getStatus()
```

The HTTP status, or 0 when no authority response arrived.

Returns: the status

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.getRetryAfter` method

```java
public @Nullable Duration getRetryAfter()
```

How long to wait before resending the same request, when the authority sent a delay (for example with `RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds. The SDK never waits or resends on its own because of it.

Returns: the delay in whole seconds, or null

Inherited from `ConvoHopProblem`.

### `ServerConversation` class

```java
public final class ServerConversation
```

Backend view of one conversation, from `ProjectServerClient.conversation(String)`. Creating it sends nothing; each method needs the backend key scope its operation names. Message reads and sends accept `actAs`, a member principal ID: reads then see what that member sees, sends are authored by it, and the authority audits both.

Package: `com.convohop.server`.

#### `ServerConversation.getConversationId` method

```java
public String getConversationId()
```

The conversation this handle acts on.

Returns: the conversation ID

#### `ServerConversation.messages` method

```java
public Messages messages()
```

Message helpers.

Returns: the message helpers

##### `ServerConversation.messages.list` method

```java
public MessagePage list()
public MessagePage list(@Nullable String actAs, @Nullable String beforeSequence, @Nullable Integer limit)
```

Lists messages.

Parameters:

- `actAs`: the member principal to read as, or `null` for the backend's own visibility
- `beforeSequence`: list messages before this sequence, or `null` for the latest
- `limit`: the page size, 1..100, or `null` for 100

Returns: the page

Throws: `IllegalArgumentException` if an argument is invalid

Throws: `ConvoHopProblem` if the authority rejects the read or its reply holds another conversation's messages

Sends [`communication.messages`](../../operations/communication/messages.md).

##### `ServerConversation.messages.get` method

```java
public Message get(String messageId)
public Message get(String messageId, @Nullable String actAs)
```

Reads a message.

Parameters:

- `messageId`: the message ID
- `actAs`: the member principal to read as, or `null` for the backend's own visibility

Returns: the message

Throws: `ConvoHopProblem` if the authority rejects the read or its reply names another message

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

##### `ServerConversation.messages.send` method

```java
public MessageAck send(String text)
public MessageAck send(String text, @Nullable Map<String, @Nullable Object> props, @Nullable String actAs, @Nullable String requestId)
```

Sends a message.

Parameters:

- `text`: the text
- `props`: application properties, or `null` for none
- `actAs`: the member principal to send as, or `null` to send as the backend
- `requestId`: the request ID to send, or `null` for a new one

Returns: the receipt, with the message's cursor

Throws: `ConvoHopProblem` if the authority rejects the message or its receipt names another conversation

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

##### `ServerConversation.messages.edit` method

```java
public Message edit(String messageId, String expectedRevision, String text)
public Message edit(String messageId, String expectedRevision, @Nullable String text, @Nullable Map<String, @Nullable Object> props, @Nullable String requestId)
```

Edits a message.

Parameters:

- `messageId`: the message ID
- `expectedRevision`: the message's current revision
- `text`: the new text, or `null` to keep it
- `props`: the new application properties, or `null` to keep them
- `requestId`: the request ID to send, or `null` for a new one

Returns: the edited message

Throws: `ConvoHopProblem` if the authority rejects the edit or its reply names another message

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

##### `ServerConversation.messages.delete` method

```java
public Message delete(String messageId, String expectedRevision)
public Message delete(String messageId, String expectedRevision, @Nullable String requestId)
```

Deletes a message.

Parameters:

- `messageId`: the message ID
- `expectedRevision`: the message's current revision
- `requestId`: the request ID to send, or `null` for a new one

Returns: the deleted message

Throws: `ConvoHopProblem` if the authority rejects the deletion or its reply names another message

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `ServerConversation.members` method

```java
public Members members()
```

Membership helpers.

Returns: the membership helpers

##### `ServerConversation.members.list` method

```java
public MemberPage list()
public MemberPage list(@Nullable Integer limit, @Nullable String cursor)
```

Lists members.

Parameters:

- `limit`: the page size, 1..100, or `null` for 100
- `cursor`: the `nextCursor` of the previous page, or `null` for the first page

Returns: the page

Throws: `IllegalArgumentException` if the page size is invalid

Throws: `ConvoHopProblem` if the authority rejects the read or its reply holds another conversation's members

Sends [`communication.members`](../../operations/communication/members.md).

##### `ServerConversation.members.add` method

```java
public Member add(String principalId, String role, String expectedRevision)
public Member add(String principalId, String role, String expectedRevision, @Nullable String requestId)
```

Adds a member.

Parameters:

- `principalId`: the principal ID
- `role`: `member` or `moderator`
- `expectedRevision`: the membership's current revision
- `requestId`: the request ID to send, or `null` for a new one

Returns: the membership

Throws: `ConvoHopProblem` if the authority rejects the request or its reply names another member

Sends [`communication.addMember`](../../operations/communication/addMember.md).

##### `ServerConversation.members.addBatch` method

```java
public List<Member> addBatch(List<MemberBatchEntryInput> members)
public List<Member> addBatch(List<MemberBatchEntryInput> members, @Nullable String requestId)
```

Adds up to 100 members at once.

Parameters:

- `members`: 1..100 entries for distinct principals
- `requestId`: the request ID to send, or `null` for a new one

Returns: the memberships, one per entry

Throws: `IllegalArgumentException` if the batch is empty, too large, repeats a principal or has an invalid entry

Throws: `ConvoHopProblem` if the authority rejects the batch or its reply has the wrong number of members

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

##### `ServerConversation.members.remove` method

```java
public Member remove(String principalId, String expectedRevision)
public Member remove(String principalId, String expectedRevision, @Nullable String requestId)
```

Removes a member.

Parameters:

- `principalId`: the principal ID
- `expectedRevision`: the membership's current revision
- `requestId`: the request ID to send, or `null` for a new one

Returns: the membership

Throws: `ConvoHopProblem` if the authority rejects the request or its reply names another member

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

#### `ServerConversation.get` method

```java
public Conversation get()
```

Reads the conversation.

Returns: the conversation

Throws: `ConvoHopProblem` if the authority rejects the read or its reply names another conversation

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

### `VerifiedWebhook` class

```java
public final class VerifiedWebhook extends WebhookSignature
```

A verified delivery: its `webhook-id`, `webhook-timestamp` and event.

Package: `com.convohop.server.webhooks`.

#### `VerifiedWebhook.getEvent` method

```java
public WebhookEvent getEvent()
```

The delivery's metadata-only event.

Returns: the event

#### `VerifiedWebhook.getWebhookId` method

```java
public String getWebhookId()
```

The delivery's `webhook-id`. Retries of a delivery keep it, so de-duplicate on it.

Returns: the webhook ID

Inherited from `WebhookSignature`.

#### `VerifiedWebhook.getTimestamp` method

```java
public long getTimestamp()
```

The delivery's `webhook-timestamp`.

Returns: Unix seconds

Inherited from `WebhookSignature`.

### `WebPushRequest` class

```java
public final class WebPushRequest
```

A Web Push message from `PushPayloads.webPush`. Your Web Push library encrypts the payload (RFC 8291), signs with VAPID and sends it with these RFC 8030 headers. Where the library sets `TTL`, `Urgency` or `Topic` from its own options, pass the values there, or its defaults replace them. `toString()` omits the payload.

Package: `com.convohop.server.push`.

#### `WebPushRequest.getHeaders` method

```java
public Map<String, String> getHeaders()
```

The headers: `TTL`, `Urgency` and, for calls, `Topic`.

Returns: the headers, in that order

#### `WebPushRequest.getTtlSeconds` method

```java
public long getTtlSeconds()
```

The `TTL`.

Returns: the TTL in seconds

#### `WebPushRequest.getUrgency` method

```java
public String getUrgency()
```

The `Urgency`: `normal` for messages and `high` for calls.

Returns: the urgency

#### `WebPushRequest.getTopic` method

```java
public @Nullable String getTopic()
```

The `Topic` of calls and cancellations: the ring's collapse key.

Returns: the topic, or null for messages

#### `WebPushRequest.getPayload` method

```java
public String getPayload()
```

The JSON payload to encrypt: at most 3993 bytes, the RFC 8291 plaintext limit.

Returns: the payload

### `WebhookCallCancelledNotificationEvent` class

```java
public final class WebhookCallCancelledNotificationEvent extends WebhookNotificationEvent
```

`notification.callCancelled`: a ring that stopped for the recipient. Only recipients of the ring's `notification.call` get it.

Package: `com.convohop.server.webhooks`.

#### `WebhookCallCancelledNotificationEvent.getLiveSessionId` method

```java
public String getLiveSessionId()
```

The call.

Returns: the live session ID

#### `WebhookCallCancelledNotificationEvent.getAlertId` method

```java
public String getAlertId()
```

The alert ID of the ring that stopped.

Returns: the alert ID

#### `WebhookCallCancelledNotificationEvent.getExpiresAt` method

```java
public String getExpiresAt()
```

The stopped ring's original deadline (RFC 3339).

Returns: the timestamp

#### `WebhookCallCancelledNotificationEvent.getMediaProfile` method

```java
public String getMediaProfile()
```

The call's media profile: `AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile, which you should accept.

Returns: the media profile

#### `WebhookCallCancelledNotificationEvent.getReason` method

```java
public String getReason()
```

Why the ring stopped. `answered` and `declined` (by the recipient, on any device) only stop the ringing. `ended` (the call ended or stopped ringing before the recipient answered) and `expired` (nobody answered by the deadline) are missed calls. Treat a later reason as "stop ringing", without a missed call.

Returns: the reason

#### `WebhookCallCancelledNotificationEvent.isMissedCall` method

```java
public boolean isMissedCall()
```

Whether the recipient missed the call: the reason is `ended` or `expired`.

Returns: whether the call was missed

#### `WebhookCallCancelledNotificationEvent.getRecipientId` method

```java
public String getRecipientId()
```

The principal to notify. Each recipient gets its own event.

Returns: the recipient's principal ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.getConversationId` method

```java
public String getConversationId()
```

The conversation of the message or call.

Returns: the conversation ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.getSenderId` method

```java
public String getSenderId()
```

The principal who sent the message or started the ringing.

Returns: the sender's principal ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.isConnected` method

```java
public boolean isConnected()
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

Returns: whether the recipient was connected

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.isKnown` method

```java
public final boolean isKnown()
```

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallCancelledNotificationEvent.getEventId` method

```java
public String getEventId()
```

The event's ID. Retries and replays of its delivery keep it.

Returns: the ID

Inherited from `WebhookEvent`.

#### `WebhookCallCancelledNotificationEvent.getEventType` method

```java
public String getEventType()
```

The event type, such as `message.created` or `notification.call`.

Returns: the event type

Inherited from `WebhookEvent`.

#### `WebhookCallCancelledNotificationEvent.getOccurredAt` method

```java
public String getOccurredAt()
```

When the event occurred, as the sender wrote it (RFC 3339).

Returns: the timestamp

Inherited from `WebhookEvent`.

#### `WebhookCallCancelledNotificationEvent.getProjectId` method

```java
public String getProjectId()
```

The project the event belongs to.

Returns: the project ID

Inherited from `WebhookEvent`.

#### `WebhookCallCancelledNotificationEvent.getSubjectRef` method

```java
public WebhookSubjectRef getSubjectRef()
```

The resource the event names.

Returns: the subject

Inherited from `WebhookEvent`.

### `WebhookCallNotificationEvent` class

```java
public final class WebhookCallNotificationEvent extends WebhookNotificationEvent
```

`notification.call`: an incoming call, as one ring for the recipient.

Package: `com.convohop.server.webhooks`.

#### `WebhookCallNotificationEvent.getLiveSessionId` method

```java
public String getLiveSessionId()
```

The call.

Returns: the live session ID

#### `WebhookCallNotificationEvent.getAlertId` method

```java
public String getAlertId()
```

This ring for this recipient. A later ring of the same call has a new alert ID.

Returns: the alert ID

#### `WebhookCallNotificationEvent.getExpiresAt` method

```java
public String getExpiresAt()
```

When the ringing stops if nobody answers (RFC 3339).

Returns: the timestamp

#### `WebhookCallNotificationEvent.getMediaProfile` method

```java
public String getMediaProfile()
```

The call's media profile: `AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile, which you should accept.

Returns: the media profile

#### `WebhookCallNotificationEvent.getRecipientId` method

```java
public String getRecipientId()
```

The principal to notify. Each recipient gets its own event.

Returns: the recipient's principal ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.getConversationId` method

```java
public String getConversationId()
```

The conversation of the message or call.

Returns: the conversation ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.getSenderId` method

```java
public String getSenderId()
```

The principal who sent the message or started the ringing.

Returns: the sender's principal ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.isConnected` method

```java
public boolean isConnected()
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

Returns: whether the recipient was connected

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.isKnown` method

```java
public final boolean isKnown()
```

Inherited from `WebhookNotificationEvent`.

#### `WebhookCallNotificationEvent.getEventId` method

```java
public String getEventId()
```

The event's ID. Retries and replays of its delivery keep it.

Returns: the ID

Inherited from `WebhookEvent`.

#### `WebhookCallNotificationEvent.getEventType` method

```java
public String getEventType()
```

The event type, such as `message.created` or `notification.call`.

Returns: the event type

Inherited from `WebhookEvent`.

#### `WebhookCallNotificationEvent.getOccurredAt` method

```java
public String getOccurredAt()
```

When the event occurred, as the sender wrote it (RFC 3339).

Returns: the timestamp

Inherited from `WebhookEvent`.

#### `WebhookCallNotificationEvent.getProjectId` method

```java
public String getProjectId()
```

The project the event belongs to.

Returns: the project ID

Inherited from `WebhookEvent`.

#### `WebhookCallNotificationEvent.getSubjectRef` method

```java
public WebhookSubjectRef getSubjectRef()
```

The resource the event names.

Returns: the subject

Inherited from `WebhookEvent`.

### `WebhookEndpointDisabledEvent` class

```java
public final class WebhookEndpointDisabledEvent extends WebhookEvent
```

`webhook.endpointDisabled`: one of the project's other webhook endpoints was disabled after repeated failures. `getSubjectRef()` names it, with kind `webhookEndpoint`.

Package: `com.convohop.server.webhooks`.

#### `WebhookEndpointDisabledEvent.isKnown` method

```java
public boolean isKnown()
```

Whether this SDK knows the event type. An unknown event, including a `notification.*` event that doesn't match the push payload contract, is a `WebhookUnknownEvent`: acknowledge it.

Returns: whether the event type is known

#### `WebhookEndpointDisabledEvent.getEventId` method

```java
public String getEventId()
```

The event's ID. Retries and replays of its delivery keep it.

Returns: the ID

Inherited from `WebhookEvent`.

#### `WebhookEndpointDisabledEvent.getEventType` method

```java
public String getEventType()
```

The event type, such as `message.created` or `notification.call`.

Returns: the event type

Inherited from `WebhookEvent`.

#### `WebhookEndpointDisabledEvent.getOccurredAt` method

```java
public String getOccurredAt()
```

When the event occurred, as the sender wrote it (RFC 3339).

Returns: the timestamp

Inherited from `WebhookEvent`.

#### `WebhookEndpointDisabledEvent.getProjectId` method

```java
public String getProjectId()
```

The project the event belongs to.

Returns: the project ID

Inherited from `WebhookEvent`.

#### `WebhookEndpointDisabledEvent.getSubjectRef` method

```java
public WebhookSubjectRef getSubjectRef()
```

The resource the event names.

Returns: the subject

Inherited from `WebhookEvent`.

### `WebhookEvent` class

```java
public abstract class WebhookEvent
```

A verified delivery's metadata-only event. Fetch the resource through the API when you need its content.

The subclasses are `WebhookResourceEvent`, `WebhookEndpointDisabledEvent`, the `WebhookNotificationEvent` types and `WebhookUnknownEvent`. Check `isKnown()` or the subclass, then `getEventType()`.

Package: `com.convohop.server.webhooks`.

#### `WebhookEvent.getEventId` method

```java
public String getEventId()
```

The event's ID. Retries and replays of its delivery keep it.

Returns: the ID

#### `WebhookEvent.getEventType` method

```java
public String getEventType()
```

The event type, such as `message.created` or `notification.call`.

Returns: the event type

#### `WebhookEvent.getOccurredAt` method

```java
public String getOccurredAt()
```

When the event occurred, as the sender wrote it (RFC 3339).

Returns: the timestamp

#### `WebhookEvent.getProjectId` method

```java
public String getProjectId()
```

The project the event belongs to.

Returns: the project ID

#### `WebhookEvent.getSubjectRef` method

```java
public WebhookSubjectRef getSubjectRef()
```

The resource the event names.

Returns: the subject

#### `WebhookEvent.isKnown` method

```java
public abstract boolean isKnown()
```

Whether this SDK knows the event type. An unknown event, including a `notification.*` event that doesn't match the push payload contract, is a `WebhookUnknownEvent`: acknowledge it.

Returns: whether the event type is known

### `WebhookMessageNotificationEvent` class

```java
public final class WebhookMessageNotificationEvent extends WebhookNotificationEvent
```

`notification.message`: a message for the recipient.

Package: `com.convohop.server.webhooks`.

#### `WebhookMessageNotificationEvent.getMessageId` method

```java
public String getMessageId()
```

The message.

Returns: the message ID

#### `WebhookMessageNotificationEvent.getPreview` method

```java
public @Nullable WebhookNotificationPreview getPreview()
```

The start of the message text, present only when the project opts in to message previews and the message has text.

Returns: the preview, or null

#### `WebhookMessageNotificationEvent.getRecipientId` method

```java
public String getRecipientId()
```

The principal to notify. Each recipient gets its own event.

Returns: the recipient's principal ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.getConversationId` method

```java
public String getConversationId()
```

The conversation of the message or call.

Returns: the conversation ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.getSenderId` method

```java
public String getSenderId()
```

The principal who sent the message or started the ringing.

Returns: the sender's principal ID

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.isConnected` method

```java
public boolean isConnected()
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

Returns: whether the recipient was connected

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.isKnown` method

```java
public final boolean isKnown()
```

Inherited from `WebhookNotificationEvent`.

#### `WebhookMessageNotificationEvent.getEventId` method

```java
public String getEventId()
```

The event's ID. Retries and replays of its delivery keep it.

Returns: the ID

Inherited from `WebhookEvent`.

#### `WebhookMessageNotificationEvent.getEventType` method

```java
public String getEventType()
```

The event type, such as `message.created` or `notification.call`.

Returns: the event type

Inherited from `WebhookEvent`.

#### `WebhookMessageNotificationEvent.getOccurredAt` method

```java
public String getOccurredAt()
```

When the event occurred, as the sender wrote it (RFC 3339).

Returns: the timestamp

Inherited from `WebhookEvent`.

#### `WebhookMessageNotificationEvent.getProjectId` method

```java
public String getProjectId()
```

The project the event belongs to.

Returns: the project ID

Inherited from `WebhookEvent`.

#### `WebhookMessageNotificationEvent.getSubjectRef` method

```java
public WebhookSubjectRef getSubjectRef()
```

The resource the event names.

Returns: the subject

Inherited from `WebhookEvent`.

### `WebhookNotificationEvent` class

```java
public abstract class WebhookNotificationEvent extends WebhookEvent
```

A per-recipient notification event: the input of the push payload builders in `com.convohop.server.push`. The contract is `spec/push-payload/`.

The subclasses are `WebhookMessageNotificationEvent` (`notification.message`), `WebhookCallNotificationEvent` (`notification.call`) and `WebhookCallCancelledNotificationEvent` (`notification.callCancelled`). Every instance matches the contract.

Package: `com.convohop.server.webhooks`.

#### `WebhookNotificationEvent.parse` static method

```java
public static WebhookNotificationEvent parse(String json)
```

Validates a notification event against the push payload contract, for events you stored or received other than through `WebhookVerifier.verify`. Fields the contract doesn't define are ignored.

Parameters:

- `json`: the event as JSON

Returns: the event

Throws: `IllegalArgumentException` if the event doesn't match the contract; the message names the first invalid field without echoing values

#### `WebhookNotificationEvent.getRecipientId` method

```java
public String getRecipientId()
```

The principal to notify. Each recipient gets its own event.

Returns: the recipient's principal ID

#### `WebhookNotificationEvent.getConversationId` method

```java
public String getConversationId()
```

The conversation of the message or call.

Returns: the conversation ID

#### `WebhookNotificationEvent.getSenderId` method

```java
public String getSenderId()
```

The principal who sent the message or started the ringing.

Returns: the sender's principal ID

#### `WebhookNotificationEvent.isConnected` method

```java
public boolean isConnected()
```

Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

Returns: whether the recipient was connected

#### `WebhookNotificationEvent.isKnown` method

```java
public final boolean isKnown()
```

Whether this SDK knows the event type. An unknown event, including a `notification.*` event that doesn't match the push payload contract, is a `WebhookUnknownEvent`: acknowledge it.

Returns: whether the event type is known

#### `WebhookNotificationEvent.getEventId` method

```java
public String getEventId()
```

The event's ID. Retries and replays of its delivery keep it.

Returns: the ID

Inherited from `WebhookEvent`.

#### `WebhookNotificationEvent.getEventType` method

```java
public String getEventType()
```

The event type, such as `message.created` or `notification.call`.

Returns: the event type

Inherited from `WebhookEvent`.

#### `WebhookNotificationEvent.getOccurredAt` method

```java
public String getOccurredAt()
```

When the event occurred, as the sender wrote it (RFC 3339).

Returns: the timestamp

Inherited from `WebhookEvent`.

#### `WebhookNotificationEvent.getProjectId` method

```java
public String getProjectId()
```

The project the event belongs to.

Returns: the project ID

Inherited from `WebhookEvent`.

#### `WebhookNotificationEvent.getSubjectRef` method

```java
public WebhookSubjectRef getSubjectRef()
```

The resource the event names.

Returns: the subject

Inherited from `WebhookEvent`.

### `WebhookNotificationPreview` class

```java
public final class WebhookNotificationPreview
```

The start of a message's text. Present only when the project opts in to message previews and the message has text. `toString()` omits the text.

Package: `com.convohop.server.webhooks`.

#### `WebhookNotificationPreview.getText` method

```java
public String getText()
```

The start of the message text: 1 to 512 Unicode code points.

Returns: the text

#### `WebhookNotificationPreview.isTruncated` method

```java
public boolean isTruncated()
```

Whether the message text continues after `getText()`.

Returns: whether the text is truncated

### `WebhookResourceEvent` class

```java
public final class WebhookResourceEvent extends WebhookEvent
```

A change to a conversation, member, message, receipt or call. `getSubjectRef()` names the resource.

The event types are `conversation.created`, `conversation.updated`, `member.added`, `member.roleChanged`, `member.historyExpanded`, `member.removed`, `member.broadcastPermissionChanged`, `message.created`, `message.edited`, `message.deleted`, `receipt.reported`, `live.started`, `live.participationChanged`, `live.alerted`, `live.ready`, `live.connected` and `live.ended`.

Package: `com.convohop.server.webhooks`.

#### `WebhookResourceEvent.isKnown` method

```java
public boolean isKnown()
```

Whether this SDK knows the event type. An unknown event, including a `notification.*` event that doesn't match the push payload contract, is a `WebhookUnknownEvent`: acknowledge it.

Returns: whether the event type is known

#### `WebhookResourceEvent.getEventId` method

```java
public String getEventId()
```

The event's ID. Retries and replays of its delivery keep it.

Returns: the ID

Inherited from `WebhookEvent`.

#### `WebhookResourceEvent.getEventType` method

```java
public String getEventType()
```

The event type, such as `message.created` or `notification.call`.

Returns: the event type

Inherited from `WebhookEvent`.

#### `WebhookResourceEvent.getOccurredAt` method

```java
public String getOccurredAt()
```

When the event occurred, as the sender wrote it (RFC 3339).

Returns: the timestamp

Inherited from `WebhookEvent`.

#### `WebhookResourceEvent.getProjectId` method

```java
public String getProjectId()
```

The project the event belongs to.

Returns: the project ID

Inherited from `WebhookEvent`.

#### `WebhookResourceEvent.getSubjectRef` method

```java
public WebhookSubjectRef getSubjectRef()
```

The resource the event names.

Returns: the subject

Inherited from `WebhookEvent`.

### `WebhookSignature` class

```java
public class WebhookSignature
```

A verified delivery's `webhook-id` and `webhook-timestamp`.

Package: `com.convohop.server.webhooks`.

#### `WebhookSignature.getWebhookId` method

```java
public String getWebhookId()
```

The delivery's `webhook-id`. Retries of a delivery keep it, so de-duplicate on it.

Returns: the webhook ID

#### `WebhookSignature.getTimestamp` method

```java
public long getTimestamp()
```

The delivery's `webhook-timestamp`.

Returns: Unix seconds

### `WebhookSubjectRef` class

```java
public final class WebhookSubjectRef
```

The resource an event names.

Package: `com.convohop.server.webhooks`.

#### `WebhookSubjectRef.getId` method

```java
public String getId()
```

The resource's ID.

Returns: the ID

#### `WebhookSubjectRef.getKind` method

```java
public String getKind()
```

The resource's kind, such as `conversation`, `message` or `liveSession`.

Returns: the kind

### `WebhookUnknownEvent` class

```java
public final class WebhookUnknownEvent extends WebhookEvent
```

An event this SDK does not know, including a `notification.*` event that doesn't match the push payload contract. Acknowledge it; it never makes `WebhookVerifier.verify` fail.

Package: `com.convohop.server.webhooks`.

#### `WebhookUnknownEvent.isKnown` method

```java
public boolean isKnown()
```

Whether this SDK knows the event type. An unknown event, including a `notification.*` event that doesn't match the push payload contract, is a `WebhookUnknownEvent`: acknowledge it.

Returns: whether the event type is known

#### `WebhookUnknownEvent.getEventId` method

```java
public String getEventId()
```

The event's ID. Retries and replays of its delivery keep it.

Returns: the ID

Inherited from `WebhookEvent`.

#### `WebhookUnknownEvent.getEventType` method

```java
public String getEventType()
```

The event type, such as `message.created` or `notification.call`.

Returns: the event type

Inherited from `WebhookEvent`.

#### `WebhookUnknownEvent.getOccurredAt` method

```java
public String getOccurredAt()
```

When the event occurred, as the sender wrote it (RFC 3339).

Returns: the timestamp

Inherited from `WebhookEvent`.

#### `WebhookUnknownEvent.getProjectId` method

```java
public String getProjectId()
```

The project the event belongs to.

Returns: the project ID

Inherited from `WebhookEvent`.

#### `WebhookUnknownEvent.getSubjectRef` method

```java
public WebhookSubjectRef getSubjectRef()
```

The resource the event names.

Returns: the subject

Inherited from `WebhookEvent`.

### `WebhookVerificationException` class

```java
public final class WebhookVerificationException extends RuntimeException
```

A delivery that failed verification. The message never contains secrets, signatures or the body.

Package: `com.convohop.server.webhooks`.

#### `WebhookVerificationException` constructor

```java
public WebhookVerificationException(WebhookVerificationCode code, String message)
```

Creates the exception.

Parameters:

- `code`: why verification failed
- `message`: a description without secrets, signatures or the body

#### `WebhookVerificationException.getCode` method

```java
public WebhookVerificationCode getCode()
```

Why verification failed.

Returns: the code

### `WebhookVerifier` class

```java
public final class WebhookVerifier
```

Verifies ConvoHop webhook deliveries (Standard Webhooks, symmetric `v1` signatures). Pass the exact request body, respond `2xx` within 5 seconds, then process, and de-duplicate on `webhook-id`.

Build one verifier with `WebhookVerifier.builder().secrets(secret).build()`, then pass each delivery's `WebhookHeaders` and raw body to `verify`.

Failures throw `WebhookVerificationException`. Its message never contains secrets, signatures or the body. A verifier is immutable and thread-safe.

Package: `com.convohop.server.webhooks`.

#### `WebhookVerifier.builder` static method

```java
public static Builder builder()
```

Starts a verifier.

Returns: a builder

#### `WebhookVerifier.verify` method

```java
public VerifiedWebhook verify(WebhookHeaders headers, byte[] body)
public VerifiedWebhook verify(WebhookHeaders headers, String body)
```

Verifies the signature and timestamp, then parses the metadata-only event.

Parameters:

- `headers`: the request headers
- `body`: the exact request body bytes, never re-serialized JSON

Returns: the delivery

Throws: `WebhookVerificationException` if the delivery fails verification or its body is not an event envelope

#### `WebhookVerifier.verifySignature` method

```java
public WebhookSignature verifySignature(WebhookHeaders headers, byte[] body)
public WebhookSignature verifySignature(WebhookHeaders headers, String body)
```

Verifies only the signature and timestamp, for bodies you parse yourself.

Parameters:

- `headers`: the request headers
- `body`: the exact request body bytes, never re-serialized JSON

Returns: the delivery's `webhook-id` and `webhook-timestamp`

Throws: `WebhookVerificationException` if the delivery fails verification

### `WebhookVerifier.Builder` class

```java
public static final class Builder
```

Configures a `WebhookVerifier`.

Package: `com.convohop.server.webhooks`.

#### `WebhookVerifier.Builder.secrets` method

```java
public Builder secrets(@Nullable String... secrets)
public Builder secrets(Collection<? extends @Nullable String> secrets)
```

Sets the endpoint's `whsec_` secrets: the current one and, during a rotation, the next or replaced one. Replaces secrets set earlier.

Parameters:

- `secrets`: the secrets; `build()` rejects null or malformed ones

Returns: this builder

#### `WebhookVerifier.Builder.toleranceSeconds` method

```java
public Builder toleranceSeconds(long toleranceSeconds)
```

Sets the allowed distance between `webhook-timestamp` and now, in whole seconds, inclusive. Defaults to 300.

Parameters:

- `toleranceSeconds`: the tolerance

Returns: this builder

Throws: `IllegalArgumentException` if the tolerance is negative

#### `WebhookVerifier.Builder.clock` method

```java
public Builder clock(Clock clock)
```

Sets the verifier's clock. Defaults to `Clock.systemUTC()`.

Parameters:

- `clock`: the clock

Returns: this builder

#### `WebhookVerifier.Builder.build` method

```java
public WebhookVerifier build()
```

Decodes the secrets and builds the verifier.

Returns: the verifier

Throws: `WebhookVerificationException` with `WebhookVerificationCode.INVALID_SECRET` if no secret is set or one is not `whsec_` followed by padded standard Base64 of 24 to 64 bytes

## Interfaces

### `RecoveryStorage` interface

```java
public interface RecoveryStorage
```

Durable storage for mutation recovery records, so a process restart can resolve or resend a mutation whose outcome is uncertain with its original request ID and payload. Records hold operation inputs, never credentials.

`setItem` must return only once the value is durable; throw when it is not. Calls arrive from any thread that uses the client, so implementations must be thread-safe.

Package: `com.convohop.server`.

#### `RecoveryStorage.getItem` method

```java
@Nullable String getItem(String key)
```

Reads a value.

Parameters:

- `key`: the key

Returns: the value, or null when none is stored

#### `RecoveryStorage.setItem` method

```java
void setItem(String key, String value)
```

Stores a value durably.

Parameters:

- `key`: the key
- `value`: the value

#### `RecoveryStorage.removeItem` method

```java
void removeItem(String key)
```

Removes a value.

Parameters:

- `key`: the key

#### `RecoveryStorage.inMemory` static method

```java
static RecoveryStorage inMemory()
```

Storage that lives as long as the process. Recovery then survives client re-creation, not restarts.

Returns: new, empty storage

### `WebhookHeaders` interface

```java
@FunctionalInterface public interface WebhookHeaders
```

A request's headers, as the verifier reads them. Adapt your framework's headers with a lambda or method reference, for example `name -> Collections.list(request.getHeaders(name))` for a servlet request or `httpHeaders::allValues` for `java.net.http.HttpHeaders`, or with `of` or `ofMultiValued`.

Package: `com.convohop.server.webhooks`.

#### `WebhookHeaders.values` method

```java
@Nullable List<String> values(String name)
```

Every value of a header. A header that has more than one value fails verification as repeated.

Parameters:

- `name`: the lowercase header name, matched case-insensitively

Returns: the header's values, or null or an empty list when the header is absent

#### `WebhookHeaders.of` static method

```java
static WebhookHeaders of(Map<String, ? extends @Nullable String> headers)
```

Headers with one value per name, such as a framework's single-valued header map. Names match case-insensitively, so a name that appears under two different cases is repeated.

Parameters:

- `headers`: the headers; entries with a null name or value are ignored

Returns: the headers

#### `WebhookHeaders.ofMultiValued` static method

```java
static WebhookHeaders ofMultiValued(Map<String, ? extends @Nullable Collection<String>> headers)
```

Headers with a list of values per name, such as `com.sun.net.httpserver.Headers`. Names match case-insensitively, and the values of every matching name are combined.

Parameters:

- `headers`: the headers; entries with a null name or values are ignored

Returns: the headers

## Enums

### `LiveCutoffEvidence` enum

```java
public enum LiveCutoffEvidence
```

The `LiveCutoffEvidence` enum.

Package: `com.convohop.server.model`.

#### `LiveCutoffEvidence.NATIVE_FENCE` case

```java
NATIVE_FENCE
```

#### `LiveCutoffEvidence.MONOTONIC_BOOT_RETIREMENT` case

```java
MONOTONIC_BOOT_RETIREMENT
```

#### `LiveCutoffEvidence.NO_GRANTS_ISSUED` case

```java
NO_GRANTS_ISSUED
```

### `LiveCutoffScopeKind` enum

```java
public enum LiveCutoffScopeKind
```

The `LiveCutoffScopeKind` enum.

Package: `com.convohop.server.model`.

#### `LiveCutoffScopeKind.PARTICIPATION` case

```java
PARTICIPATION
```

#### `LiveCutoffScopeKind.GENERATION` case

```java
GENERATION
```

### `LiveCutoffState` enum

```java
public enum LiveCutoffState
```

The `LiveCutoffState` enum.

Package: `com.convohop.server.model`.

#### `LiveCutoffState.PENDING` case

```java
PENDING
```

#### `LiveCutoffState.ENFORCED` case

```java
ENFORCED
```

#### `LiveCutoffState.UNKNOWN` case

```java
UNKNOWN
```

### `LiveErrorCode` enum

```java
public enum LiveErrorCode
```

The `LiveErrorCode` enum.

Package: `com.convohop.server.model`.

#### `LiveErrorCode.LIVE_SESSION_EXISTS` case

```java
LIVE_SESSION_EXISTS
```

#### `LiveErrorCode.LIVE_SESSION_CLOSED` case

```java
LIVE_SESSION_CLOSED
```

#### `LiveErrorCode.LIVE_SESSION_INTERRUPTED` case

```java
LIVE_SESSION_INTERRUPTED
```

#### `LiveErrorCode.LIVE_SESSION_CAPACITY` case

```java
LIVE_SESSION_CAPACITY
```

#### `LiveErrorCode.LIVE_ALERT_LIMIT` case

```java
LIVE_ALERT_LIMIT
```

#### `LiveErrorCode.JOINED_ELSEWHERE` case

```java
JOINED_ELSEWHERE
```

#### `LiveErrorCode.PARTICIPATION_DRAINING` case

```java
PARTICIPATION_DRAINING
```

#### `LiveErrorCode.PARTICIPATION_MISMATCH` case

```java
PARTICIPATION_MISMATCH
```

#### `LiveErrorCode.GENERATION_CONFLICT` case

```java
GENERATION_CONFLICT
```

#### `LiveErrorCode.MEDIA_NOT_READY` case

```java
MEDIA_NOT_READY
```

#### `LiveErrorCode.CREDENTIAL_REFRESH_REQUIRED` case

```java
CREDENTIAL_REFRESH_REQUIRED
```

#### `LiveErrorCode.LIVE_START_CANCELLED` case

```java
LIVE_START_CANCELLED
```

#### `LiveErrorCode.LIVE_PREPARATION_FAILED` case

```java
LIVE_PREPARATION_FAILED
```

### `LiveMediaProfile` enum

```java
public enum LiveMediaProfile
```

The `LiveMediaProfile` enum.

Package: `com.convohop.server.model`.

#### `LiveMediaProfile.AUDIO_ONLY` case

```java
AUDIO_ONLY
```

#### `LiveMediaProfile.AUDIO_VIDEO` case

```java
AUDIO_VIDEO
```

### `LiveOperationKind` enum

```java
public enum LiveOperationKind
```

The `LiveOperationKind` enum.

Package: `com.convohop.server.model`.

#### `LiveOperationKind.START` case

```java
START
```

#### `LiveOperationKind.END` case

```java
END
```

### `LiveOperationState` enum

```java
public enum LiveOperationState
```

The `LiveOperationState` enum.

Package: `com.convohop.server.model`.

#### `LiveOperationState.RUNNING` case

```java
RUNNING
```

#### `LiveOperationState.COMPLETED` case

```java
COMPLETED
```

#### `LiveOperationState.FAILED` case

```java
FAILED
```

### `LiveParticipationState` enum

```java
public enum LiveParticipationState
```

The `LiveParticipationState` enum.

Package: `com.convohop.server.model`.

#### `LiveParticipationState.JOINED` case

```java
JOINED
```

#### `LiveParticipationState.CONNECTING` case

```java
CONNECTING
```

#### `LiveParticipationState.CONNECTED` case

```java
CONNECTED
```

#### `LiveParticipationState.DISCONNECTED` case

```java
DISCONNECTED
```

#### `LiveParticipationState.LEAVING` case

```java
LEAVING
```

#### `LiveParticipationState.LEFT` case

```java
LEFT
```

### `LiveRole` enum

```java
public enum LiveRole
```

The `LiveRole` enum.

Package: `com.convohop.server.model`.

#### `LiveRole.PUBLISHER` case

```java
PUBLISHER
```

#### `LiveRole.VIEWER` case

```java
VIEWER
```

### `LiveSessionKind` enum

```java
public enum LiveSessionKind
```

The `LiveSessionKind` enum.

Package: `com.convohop.server.model`.

#### `LiveSessionKind.INTERACTIVE` case

```java
INTERACTIVE
```

#### `LiveSessionKind.BROADCAST` case

```java
BROADCAST
```

### `LiveSessionState` enum

```java
public enum LiveSessionState
```

The `LiveSessionState` enum.

Package: `com.convohop.server.model`.

#### `LiveSessionState.PREPARING` case

```java
PREPARING
```

#### `LiveSessionState.READY` case

```java
READY
```

#### `LiveSessionState.ACTIVE` case

```java
ACTIVE
```

#### `LiveSessionState.DRAINING` case

```java
DRAINING
```

#### `LiveSessionState.ENDED` case

```java
ENDED
```

#### `LiveSessionState.FAILED` case

```java
FAILED
```

### `RecoveryState.Resolution` enum

```java
public enum Resolution
```

What is known about a mutation's outcome.

Package: `com.convohop.server`.

#### `RecoveryState.Resolution.PENDING` case

```java
PENDING
```

Not yet sent.

#### `RecoveryState.Resolution.UNKNOWN` case

```java
UNKNOWN
```

Sent, but the outcome is uncertain: resolve or retry the same request.

#### `RecoveryState.Resolution.COMMITTED` case

```java
COMMITTED
```

The authority committed the mutation.

#### `RecoveryState.Resolution.ACCEPTED` case

```java
ACCEPTED
```

The authority accepted the mutation as a long-running operation.

#### `RecoveryState.Resolution.wireValue` method

```java
public String wireValue()
```

The stored value.

Returns: the value

### `WebhookVerificationCode` enum

```java
public enum WebhookVerificationCode
```

Why a delivery failed verification. Verification checks run in this order and stop at the first failure.

Package: `com.convohop.server.webhooks`.

#### `WebhookVerificationCode.INVALID_SECRET` case

```java
INVALID_SECRET
```

No secret is given, or one is not `whsec_` followed by padded standard Base64 of 24 to 64 bytes. This is your configuration, not the sender: `WebhookVerifier.Builder.build()` throws it.

#### `WebhookVerificationCode.MISSING_HEADER` case

```java
MISSING_HEADER
```

`webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty.

#### `WebhookVerificationCode.INVALID_HEADER` case

```java
INVALID_HEADER
```

One of those headers is repeated.

#### `WebhookVerificationCode.INVALID_TIMESTAMP` case

```java
INVALID_TIMESTAMP
```

`webhook-timestamp` is not 1 to 15 ASCII digits (integer Unix seconds).

#### `WebhookVerificationCode.TIMESTAMP_EXPIRED` case

```java
TIMESTAMP_EXPIRED
```

The timestamp is more than the tolerance before now.

#### `WebhookVerificationCode.TIMESTAMP_FUTURE` case

```java
TIMESTAMP_FUTURE
```

The timestamp is more than the tolerance after now.

#### `WebhookVerificationCode.BODY_TOO_LARGE` case

```java
BODY_TOO_LARGE
```

The body exceeds 4096 bytes.

#### `WebhookVerificationCode.TOO_MANY_SIGNATURES` case

```java
TOO_MANY_SIGNATURES
```

`webhook-signature` has more than 8 entries.

#### `WebhookVerificationCode.NO_MATCHING_SIGNATURE` case

```java
NO_MATCHING_SIGNATURE
```

No `v1` entry matches any secret.

#### `WebhookVerificationCode.INVALID_BODY` case

```java
INVALID_BODY
```

`WebhookVerifier.verify` only: the signed body is not a UTF-8 JSON event envelope.

## Types

### `AcknowledgeCredentialReply` type

```java
public final class AcknowledgeCredentialReply
```

The `AcknowledgeCredentialReply` result type.

Package: `com.convohop.server.model`.

### `AcknowledgeCredentialRequestInput` type

```java
public final class AcknowledgeCredentialRequestInput
```

The `AcknowledgeCredentialRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `ActorRef` type

```java
public final class ActorRef
```

The `ActorRef` result type.

Package: `com.convohop.server.model`.

### `AddMemberReply` type

```java
public final class AddMemberReply
```

The `AddMemberReply` result type.

Package: `com.convohop.server.model`.

### `AddMemberRequestInput` type

```java
public final class AddMemberRequestInput
```

The `AddMemberRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `AddMembersInput` type

```java
public final class AddMembersInput
```

The `AddMembersInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `AddMembersPayload` type

```java
public final class AddMembersPayload
```

The `AddMembersPayload` result type.

Package: `com.convohop.server.model`.

### `AlertLiveSessionInput` type

```java
public final class AlertLiveSessionInput
```

The `AlertLiveSessionInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `AlertLiveSessionPayload` type

```java
public final class AlertLiveSessionPayload
```

The `AlertLiveSessionPayload` result type.

Package: `com.convohop.server.model`.

### `BillingCheckoutSession` type

```java
public final class BillingCheckoutSession
```

The `BillingCheckoutSession` result type.

Package: `com.convohop.server.model`.

### `BillingPortalSession` type

```java
public final class BillingPortalSession
```

The `BillingPortalSession` result type.

Package: `com.convohop.server.model`.

### `BroadcastPermissionChanged` type

```java
public final class BroadcastPermissionChanged
```

The `BroadcastPermissionChanged` result type.

Package: `com.convohop.server.model`.

### `Capabilities` type

```java
public final class Capabilities
```

The `Capabilities` result type.

Package: `com.convohop.server.model`.

### `CapabilitiesReply` type

```java
public final class CapabilitiesReply
```

The `CapabilitiesReply` result type.

Package: `com.convohop.server.model`.

### `ConfigureWebhookReply` type

```java
public final class ConfigureWebhookReply
```

The `ConfigureWebhookReply` result type.

Package: `com.convohop.server.model`.

### `ConfigureWebhookRequestInput` type

```java
public final class ConfigureWebhookRequestInput
```

The `ConfigureWebhookRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `Conversation` type

```java
public final class Conversation
```

The `Conversation` result type.

Package: `com.convohop.server.model`.

### `ConversationLiveInput` type

```java
public final class ConversationLiveInput
```

The `ConversationLiveInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `ConversationMemberBatch` type

```java
public final class ConversationMemberBatch
```

The `ConversationMemberBatch` result type.

Package: `com.convohop.server.model`.

### `ConversationMute` type

```java
public final class ConversationMute
```

The `ConversationMute` result type.

Package: `com.convohop.server.model`.

### `ConversationMuteInput` type

```java
public final class ConversationMuteInput
```

The `ConversationMuteInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `ConversationMuteReply` type

```java
public final class ConversationMuteReply
```

The `ConversationMuteReply` result type.

Package: `com.convohop.server.model`.

### `CreateBillingCheckoutSessionReply` type

```java
public final class CreateBillingCheckoutSessionReply
```

The `CreateBillingCheckoutSessionReply` result type.

Package: `com.convohop.server.model`.

### `CreateBillingCheckoutSessionRequestInput` type

```java
public final class CreateBillingCheckoutSessionRequestInput
```

The `CreateBillingCheckoutSessionRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `CreateBillingPortalSessionReply` type

```java
public final class CreateBillingPortalSessionReply
```

The `CreateBillingPortalSessionReply` result type.

Package: `com.convohop.server.model`.

### `CreateBillingPortalSessionRequestInput` type

```java
public final class CreateBillingPortalSessionRequestInput
```

The `CreateBillingPortalSessionRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `CreateConversationReply` type

```java
public final class CreateConversationReply
```

The `CreateConversationReply` result type.

Package: `com.convohop.server.model`.

### `CreateConversationRequestInput` type

```java
public final class CreateConversationRequestInput
```

The `CreateConversationRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `CreateDeploymentReply` type

```java
public final class CreateDeploymentReply
```

The `CreateDeploymentReply` result type.

Package: `com.convohop.server.model`.

### `CreateDeploymentRequestInput` type

```java
public final class CreateDeploymentRequestInput
```

The `CreateDeploymentRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `CreateOrganizationReply` type

```java
public final class CreateOrganizationReply
```

The `CreateOrganizationReply` result type.

Package: `com.convohop.server.model`.

### `CreateOrganizationRequestInput` type

```java
public final class CreateOrganizationRequestInput
```

The `CreateOrganizationRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `CreatePrincipalReply` type

```java
public final class CreatePrincipalReply
```

The `CreatePrincipalReply` result type.

Package: `com.convohop.server.model`.

### `CreatePrincipalRequestInput` type

```java
public final class CreatePrincipalRequestInput
```

The `CreatePrincipalRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `CreateProjectReply` type

```java
public final class CreateProjectReply
```

The `CreateProjectReply` result type.

Package: `com.convohop.server.model`.

### `CreateProjectRequestInput` type

```java
public final class CreateProjectRequestInput
```

The `CreateProjectRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `CredentialCapsule` type

```java
public final class CredentialCapsule
```

The `CredentialCapsule` result type.

Package: `com.convohop.server.model`.

### `CredentialDelivery` type

```java
public final class CredentialDelivery
```

The `CredentialDelivery` result type.

Package: `com.convohop.server.model`.

### `CredentialDeliveryReceipt` type

```java
public final class CredentialDeliveryReceipt
```

The `CredentialDeliveryReceipt` result type.

Package: `com.convohop.server.model`.

### `CredentialPermitReply` type

```java
public final class CredentialPermitReply
```

The `CredentialPermitReply` result type.

Package: `com.convohop.server.model`.

### `CredentialPermitRequestInput` type

```java
public final class CredentialPermitRequestInput
```

The `CredentialPermitRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `CurrentLiveSessionReply` type

```java
public final class CurrentLiveSessionReply
```

The `CurrentLiveSessionReply` result type.

Package: `com.convohop.server.model`.

### `Cursor` type

```java
public final class Cursor
```

The `Cursor` result type.

Package: `com.convohop.server.model`.

### `CutoffScope` type

```java
public final class CutoffScope
```

The `CutoffScope` result type.

Package: `com.convohop.server.model`.

### `DeleteMessageReply` type

```java
public final class DeleteMessageReply
```

The `DeleteMessageReply` result type.

Package: `com.convohop.server.model`.

### `DeleteMessageRequestInput` type

```java
public final class DeleteMessageRequestInput
```

The `DeleteMessageRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `DeliveryAck` type

```java
public final class DeliveryAck
```

The `DeliveryAck` result type.

Package: `com.convohop.server.model`.

### `Deployment` type

```java
public final class Deployment
```

The `Deployment` result type.

Package: `com.convohop.server.model`.

### `DeploymentHealth` type

```java
public final class DeploymentHealth
```

The `DeploymentHealth` result type.

Package: `com.convohop.server.model`.

### `DeploymentHealthReply` type

```java
public final class DeploymentHealthReply
```

The `DeploymentHealthReply` result type.

Package: `com.convohop.server.model`.

### `DeploymentHealthRequestInput` type

```java
public final class DeploymentHealthRequestInput
```

The `DeploymentHealthRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `DeploymentUsage` type

```java
public final class DeploymentUsage
```

The `DeploymentUsage` result type.

Package: `com.convohop.server.model`.

### `DeploymentUsageReply` type

```java
public final class DeploymentUsageReply
```

The `DeploymentUsageReply` result type.

Package: `com.convohop.server.model`.

### `DeploymentUsageRequestInput` type

```java
public final class DeploymentUsageRequestInput
```

The `DeploymentUsageRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `DisablePrincipalReply` type

```java
public final class DisablePrincipalReply
```

The `DisablePrincipalReply` result type.

Package: `com.convohop.server.model`.

### `DisablePrincipalRequestInput` type

```java
public final class DisablePrincipalRequestInput
```

The `DisablePrincipalRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `DisableWebhookReply` type

```java
public final class DisableWebhookReply
```

The `DisableWebhookReply` result type.

Package: `com.convohop.server.model`.

### `DisableWebhookRequestInput` type

```java
public final class DisableWebhookRequestInput
```

The `DisableWebhookRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `EditMessageReply` type

```java
public final class EditMessageReply
```

The `EditMessageReply` result type.

Package: `com.convohop.server.model`.

### `EditMessageRequestInput` type

```java
public final class EditMessageRequestInput
```

The `EditMessageRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `EndLiveSessionInput` type

```java
public final class EndLiveSessionInput
```

The `EndLiveSessionInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `EndLiveSessionPayload` type

```java
public final class EndLiveSessionPayload
```

The `EndLiveSessionPayload` result type.

Package: `com.convohop.server.model`.

### `Features` type

```java
public final class Features
```

The `Features` result type.

Package: `com.convohop.server.model`.

### `GetConversationReply` type

```java
public final class GetConversationReply
```

The `GetConversationReply` result type.

Package: `com.convohop.server.model`.

### `GetConversationRequestInput` type

```java
public final class GetConversationRequestInput
```

The `GetConversationRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `GetDeploymentReply` type

```java
public final class GetDeploymentReply
```

The `GetDeploymentReply` result type.

Package: `com.convohop.server.model`.

### `GetDeploymentRequestInput` type

```java
public final class GetDeploymentRequestInput
```

The `GetDeploymentRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `GetMessageReply` type

```java
public final class GetMessageReply
```

The `GetMessageReply` result type.

Package: `com.convohop.server.model`.

### `GetMessageRequestInput` type

```java
public final class GetMessageRequestInput
```

The `GetMessageRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `GetOperationReply` type

```java
public final class GetOperationReply
```

The `GetOperationReply` result type.

Package: `com.convohop.server.model`.

### `GetOperationRequestInput` type

```java
public final class GetOperationRequestInput
```

The `GetOperationRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `GetOrganizationReply` type

```java
public final class GetOrganizationReply
```

The `GetOrganizationReply` result type.

Package: `com.convohop.server.model`.

### `GetOrganizationRequestInput` type

```java
public final class GetOrganizationRequestInput
```

The `GetOrganizationRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `GetPrincipalReply` type

```java
public final class GetPrincipalReply
```

The `GetPrincipalReply` result type.

Package: `com.convohop.server.model`.

### `GetPrincipalRequestInput` type

```java
public final class GetPrincipalRequestInput
```

The `GetPrincipalRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `GetProjectReply` type

```java
public final class GetProjectReply
```

The `GetProjectReply` result type.

Package: `com.convohop.server.model`.

### `GetProjectRequestInput` type

```java
public final class GetProjectRequestInput
```

The `GetProjectRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `HistoryGrantReply` type

```java
public final class HistoryGrantReply
```

The `HistoryGrantReply` result type.

Package: `com.convohop.server.model`.

### `HistoryGrantRequestInput` type

```java
public final class HistoryGrantRequestInput
```

The `HistoryGrantRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `InboxItem` type

```java
public final class InboxItem
```

The `InboxItem` result type.

Package: `com.convohop.server.model`.

### `InboxPage` type

```java
public final class InboxPage
```

The `InboxPage` result type.

Package: `com.convohop.server.model`.

### `InboxReply` type

```java
public final class InboxReply
```

The `InboxReply` result type.

Package: `com.convohop.server.model`.

### `InboxRequestInput` type

```java
public final class InboxRequestInput
```

The `InboxRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `IssueBackendKeyReply` type

```java
public final class IssueBackendKeyReply
```

The `IssueBackendKeyReply` result type.

Package: `com.convohop.server.model`.

### `IssueBackendKeyRequestInput` type

```java
public final class IssueBackendKeyRequestInput
```

The `IssueBackendKeyRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `IssueSessionReply` type

```java
public final class IssueSessionReply
```

The `IssueSessionReply` result type.

Package: `com.convohop.server.model`.

### `IssueSessionRequestInput` type

```java
public final class IssueSessionRequestInput
```

The `IssueSessionRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `Limit` type

```java
public final class Limit
```

The `Limit` result type.

Package: `com.convohop.server.model`.

### `LimitEntry` type

```java
public final class LimitEntry
```

The `LimitEntry` result type.

Package: `com.convohop.server.model`.

### `LiveAlertBatch` type

```java
public final class LiveAlertBatch
```

The `LiveAlertBatch` result type.

Package: `com.convohop.server.model`.

### `LiveCredentialIssuance` type

```java
public final class LiveCredentialIssuance
```

The `LiveCredentialIssuance` result type.

Package: `com.convohop.server.model`.

### `LiveCutoffScope` type

```java
public final class LiveCutoffScope
```

The `LiveCutoffScope` result type.

Package: `com.convohop.server.model`.

### `LiveMediaCutoff` type

```java
public final class LiveMediaCutoff
```

The `LiveMediaCutoff` result type.

Package: `com.convohop.server.model`.

### `LiveMediaPermissions` type

```java
public final class LiveMediaPermissions
```

The `LiveMediaPermissions` result type.

Package: `com.convohop.server.model`.

### `LiveOperationFailure` type

```java
public final class LiveOperationFailure
```

The `LiveOperationFailure` result type.

Package: `com.convohop.server.model`.

### `LiveParticipantPage` type

```java
public final class LiveParticipantPage
```

The `LiveParticipantPage` result type.

Package: `com.convohop.server.model`.

### `LiveParticipantPageReply` type

```java
public final class LiveParticipantPageReply
```

The `LiveParticipantPageReply` result type.

Package: `com.convohop.server.model`.

### `LiveParticipantsInput` type

```java
public final class LiveParticipantsInput
```

The `LiveParticipantsInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `LiveParticipation` type

```java
public final class LiveParticipation
```

The `LiveParticipation` result type.

Package: `com.convohop.server.model`.

### `LiveSession` type

```java
public final class LiveSession
```

The `LiveSession` result type.

Package: `com.convohop.server.model`.

### `LiveSessionEndRequested` type

```java
public final class LiveSessionEndRequested
```

The `LiveSessionEndRequested` result type.

Package: `com.convohop.server.model`.

### `LiveSessionInput` type

```java
public final class LiveSessionInput
```

The `LiveSessionInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `LiveSessionJoined` type

```java
public final class LiveSessionJoined
```

The `LiveSessionJoined` result type.

Package: `com.convohop.server.model`.

### `LiveSessionLeft` type

```java
public final class LiveSessionLeft
```

The `LiveSessionLeft` result type.

Package: `com.convohop.server.model`.

### `LiveSessionOperation` type

```java
public final class LiveSessionOperation
```

The `LiveSessionOperation` result type.

Package: `com.convohop.server.model`.

### `LiveSessionOperationCompletion` type

```java
public final class LiveSessionOperationCompletion
```

The `LiveSessionOperationCompletion` result type.

Package: `com.convohop.server.model`.

### `LiveSessionOperationInput` type

```java
public final class LiveSessionOperationInput
```

The `LiveSessionOperationInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `LiveSessionOperationReply` type

```java
public final class LiveSessionOperationReply
```

The `LiveSessionOperationReply` result type.

Package: `com.convohop.server.model`.

### `LiveSessionPage` type

```java
public final class LiveSessionPage
```

The `LiveSessionPage` result type.

Package: `com.convohop.server.model`.

### `LiveSessionPageReply` type

```java
public final class LiveSessionPageReply
```

The `LiveSessionPageReply` result type.

Package: `com.convohop.server.model`.

### `LiveSessionReply` type

```java
public final class LiveSessionReply
```

The `LiveSessionReply` result type.

Package: `com.convohop.server.model`.

### `LiveSessionStarted` type

```java
public final class LiveSessionStarted
```

The `LiveSessionStarted` result type.

Package: `com.convohop.server.model`.

### `LiveSessionsInput` type

```java
public final class LiveSessionsInput
```

The `LiveSessionsInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `MediaCutoff` type

```java
public final class MediaCutoff
```

The `MediaCutoff` result type.

Package: `com.convohop.server.model`.

### `MediaPolicy` type

```java
public final class MediaPolicy
```

The `MediaPolicy` result type.

Package: `com.convohop.server.model`.

### `Member` type

```java
public final class Member
```

The `Member` result type.

Package: `com.convohop.server.model`.

### `MemberBatchEntryInput` type

```java
public final class MemberBatchEntryInput
```

The `MemberBatchEntryInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `MemberInputInput` type

```java
public final class MemberInputInput
```

The `MemberInputInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `MemberPage` type

```java
public final class MemberPage
```

The `MemberPage` result type.

Package: `com.convohop.server.model`.

### `MembersReply` type

```java
public final class MembersReply
```

The `MembersReply` result type.

Package: `com.convohop.server.model`.

### `MembersRequestInput` type

```java
public final class MembersRequestInput
```

The `MembersRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `Message` type

```java
public final class Message
```

The `Message` result type.

Package: `com.convohop.server.model`.

### `MessageAck` type

```java
public final class MessageAck
```

The `MessageAck` result type.

Package: `com.convohop.server.model`.

### `MessagePage` type

```java
public final class MessagePage
```

The `MessagePage` result type.

Package: `com.convohop.server.model`.

### `MessagesReply` type

```java
public final class MessagesReply
```

The `MessagesReply` result type.

Package: `com.convohop.server.model`.

### `MessagesRequestInput` type

```java
public final class MessagesRequestInput
```

The `MessagesRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `Operation` type

```java
public final class Operation
```

The `Operation` result type.

Package: `com.convohop.server.model`.

### `OperationRef` type

```java
public final class OperationRef
```

The `OperationRef` result type.

Package: `com.convohop.server.model`.

### `OperationResult` type

```java
public final class OperationResult
```

The `OperationResult` result type.

Package: `com.convohop.server.model`.

### `OperationStep` type

```java
public final class OperationStep
```

The `OperationStep` result type.

Package: `com.convohop.server.model`.

### `Organization` type

```java
public final class Organization
```

The `Organization` result type.

Package: `com.convohop.server.model`.

### `OrganizationBilling` type

```java
public final class OrganizationBilling
```

The `OrganizationBilling` result type.

Package: `com.convohop.server.model`.

### `OrganizationBillingReply` type

```java
public final class OrganizationBillingReply
```

The `OrganizationBillingReply` result type.

Package: `com.convohop.server.model`.

### `OrganizationBillingRequestInput` type

```java
public final class OrganizationBillingRequestInput
```

The `OrganizationBillingRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `OrganizationPage` type

```java
public final class OrganizationPage
```

The `OrganizationPage` result type.

Package: `com.convohop.server.model`.

### `OrganizationUsage` type

```java
public final class OrganizationUsage
```

The `OrganizationUsage` result type.

Package: `com.convohop.server.model`.

### `OrganizationUsageReply` type

```java
public final class OrganizationUsageReply
```

The `OrganizationUsageReply` result type.

Package: `com.convohop.server.model`.

### `OrganizationUsageRequestInput` type

```java
public final class OrganizationUsageRequestInput
```

The `OrganizationUsageRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `OrganizationsReply` type

```java
public final class OrganizationsReply
```

The `OrganizationsReply` result type.

Package: `com.convohop.server.model`.

### `PauseOperationReply` type

```java
public final class PauseOperationReply
```

The `PauseOperationReply` result type.

Package: `com.convohop.server.model`.

### `PauseOperationRequestInput` type

```java
public final class PauseOperationRequestInput
```

The `PauseOperationRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `PolicyChangeInput` type

```java
public final class PolicyChangeInput
```

The `PolicyChangeInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `Principal` type

```java
public final class Principal
```

The `Principal` result type.

Package: `com.convohop.server.model`.

### `Project` type

```java
public final class Project
```

The `Project` result type.

Package: `com.convohop.server.model`.

### `ProjectPolicyReply` type

```java
public final class ProjectPolicyReply
```

The `ProjectPolicyReply` result type.

Package: `com.convohop.server.model`.

### `ProjectPolicyRequestInput` type

```java
public final class ProjectPolicyRequestInput
```

The `ProjectPolicyRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `ProjectUsage` type

```java
public final class ProjectUsage
```

The `ProjectUsage` result type.

Package: `com.convohop.server.model`.

### `ProjectUsageReply` type

```java
public final class ProjectUsageReply
```

The `ProjectUsageReply` result type.

Package: `com.convohop.server.model`.

### `ProjectUsageRequestInput` type

```java
public final class ProjectUsageRequestInput
```

The `ProjectUsageRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `ReadReceipt` type

```java
public final class ReadReceipt
```

The `ReadReceipt` result type.

Package: `com.convohop.server.model`.

### `RedeemCredentialReply` type

```java
public final class RedeemCredentialReply
```

The `RedeemCredentialReply` result type.

Package: `com.convohop.server.model`.

### `RedeemCredentialRequestInput` type

```java
public final class RedeemCredentialRequestInput
```

The `RedeemCredentialRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `RemoveMemberReply` type

```java
public final class RemoveMemberReply
```

The `RemoveMemberReply` result type.

Package: `com.convohop.server.model`.

### `RemoveMemberRequestInput` type

```java
public final class RemoveMemberRequestInput
```

The `RemoveMemberRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `RenewSessionReply` type

```java
public final class RenewSessionReply
```

The `RenewSessionReply` result type.

Package: `com.convohop.server.model`.

### `RenewSessionRequestInput` type

```java
public final class RenewSessionRequestInput
```

The `RenewSessionRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `ReplayWebhookDeliveriesReply` type

```java
public final class ReplayWebhookDeliveriesReply
```

The `ReplayWebhookDeliveriesReply` result type.

Package: `com.convohop.server.model`.

### `ReplayWebhookDeliveriesRequestInput` type

```java
public final class ReplayWebhookDeliveriesRequestInput
```

The `ReplayWebhookDeliveriesRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `RequestResolution` type

```java
public final class RequestResolution
```

The `RequestResolution` result type.

Package: `com.convohop.server.model`.

### `ResolveRequestReply` type

```java
public final class ResolveRequestReply
```

The `ResolveRequestReply` result type.

Package: `com.convohop.server.model`.

### `ResolveRequestRequestInput` type

```java
public final class ResolveRequestRequestInput
```

The `ResolveRequestRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `ResolvedReceipt` type

```java
public final class ResolvedReceipt
```

The `ResolvedReceipt` result type.

Package: `com.convohop.server.model`.

### `ResourceRef` type

```java
public final class ResourceRef
```

The `ResourceRef` result type.

Package: `com.convohop.server.model`.

### `ResumeOperationReply` type

```java
public final class ResumeOperationReply
```

The `ResumeOperationReply` result type.

Package: `com.convohop.server.model`.

### `ResumeOperationRequestInput` type

```java
public final class ResumeOperationRequestInput
```

The `ResumeOperationRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `RetainedResult` type

```java
public final class RetainedResult
```

Exactly one typed field contains the retained, currently authorized receipt result.

Package: `com.convohop.server.model`.

### `RevokeBackendKeyReply` type

```java
public final class RevokeBackendKeyReply
```

The `RevokeBackendKeyReply` result type.

Package: `com.convohop.server.model`.

### `RevokeBackendKeyRequestInput` type

```java
public final class RevokeBackendKeyRequestInput
```

The `RevokeBackendKeyRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `RevokeSessionReply` type

```java
public final class RevokeSessionReply
```

The `RevokeSessionReply` result type.

Package: `com.convohop.server.model`.

### `RevokeSessionRequestInput` type

```java
public final class RevokeSessionRequestInput
```

The `RevokeSessionRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `RotateWebhookSecretReply` type

```java
public final class RotateWebhookSecretReply
```

The `RotateWebhookSecretReply` result type.

Package: `com.convohop.server.model`.

### `RotateWebhookSecretRequestInput` type

```java
public final class RotateWebhookSecretRequestInput
```

The `RotateWebhookSecretRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `RouteReply` type

```java
public final class RouteReply
```

The `RouteReply` result type.

Package: `com.convohop.server.model`.

### `Scalars` type

```java
public final class Scalars
```

Decoders for the custom scalars, built from their representations and constraints.

Package: `com.convohop.server.model`.

### `SearchHit` type

```java
public final class SearchHit
```

The `SearchHit` result type.

Package: `com.convohop.server.model`.

### `SearchPage` type

```java
public final class SearchPage
```

The `SearchPage` result type.

Package: `com.convohop.server.model`.

### `SearchReply` type

```java
public final class SearchReply
```

The `SearchReply` result type.

Package: `com.convohop.server.model`.

### `SearchRequestInput` type

```java
public final class SearchRequestInput
```

The `SearchRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `SearchScopeInput` type

```java
public final class SearchScopeInput
```

The `SearchScopeInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `SendMessageReply` type

```java
public final class SendMessageReply
```

The `SendMessageReply` result type.

Package: `com.convohop.server.model`.

### `SendMessageRequestInput` type

```java
public final class SendMessageRequestInput
```

The `SendMessageRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `ServiceDetails` type

```java
public final class ServiceDetails
```

The `ServiceDetails` result type.

Package: `com.convohop.server.model`.

### `ServiceObservation` type

```java
public final class ServiceObservation
```

The `ServiceObservation` result type.

Package: `com.convohop.server.model`.

### `Session` type

```java
public final class Session
```

The `Session` result type.

Package: `com.convohop.server.model`.

### `SessionBootstrap` type

```java
public final class SessionBootstrap
```

The `SessionBootstrap` result type.

Package: `com.convohop.server.model`.

### `SessionRequestOutcome` type

```java
public final class SessionRequestOutcome
```

The `SessionRequestOutcome` result type.

Package: `com.convohop.server.model`.

### `SessionRequestOutcomeReply` type

```java
public final class SessionRequestOutcomeReply
```

The `SessionRequestOutcomeReply` result type.

Package: `com.convohop.server.model`.

### `SessionRequestOutcomeRequestInput` type

```java
public final class SessionRequestOutcomeRequestInput
```

The `SessionRequestOutcomeRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `SessionRevocation` type

```java
public final class SessionRevocation
```

The `SessionRevocation` result type.

Package: `com.convohop.server.model`.

### `SetBroadcastPermissionInput` type

```java
public final class SetBroadcastPermissionInput
```

The `SetBroadcastPermissionInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `SetBroadcastPermissionPayload` type

```java
public final class SetBroadcastPermissionPayload
```

The `SetBroadcastPermissionPayload` result type.

Package: `com.convohop.server.model`.

### `SetConversationMuteInput` type

```java
public final class SetConversationMuteInput
```

The `SetConversationMuteInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `SetConversationMutePayload` type

```java
public final class SetConversationMutePayload
```

The `SetConversationMutePayload` result type.

Package: `com.convohop.server.model`.

### `UpdateConversationReply` type

```java
public final class UpdateConversationReply
```

The `UpdateConversationReply` result type.

Package: `com.convohop.server.model`.

### `UpdateConversationRequestInput` type

```java
public final class UpdateConversationRequestInput
```

The `UpdateConversationRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `UpdateWebhookReply` type

```java
public final class UpdateWebhookReply
```

The `UpdateWebhookReply` result type.

Package: `com.convohop.server.model`.

### `UpdateWebhookRequestInput` type

```java
public final class UpdateWebhookRequestInput
```

The `UpdateWebhookRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `UsageMeter` type

```java
public final class UsageMeter
```

The `UsageMeter` result type.

Package: `com.convohop.server.model`.

### `WebhookDeliveriesReply` type

```java
public final class WebhookDeliveriesReply
```

The `WebhookDeliveriesReply` result type.

Package: `com.convohop.server.model`.

### `WebhookDeliveriesRequestInput` type

```java
public final class WebhookDeliveriesRequestInput
```

The `WebhookDeliveriesRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.

### `WebhookDelivery` type

```java
public final class WebhookDelivery
```

The `WebhookDelivery` result type.

Package: `com.convohop.server.model`.

### `WebhookDeliveryPage` type

```java
public final class WebhookDeliveryPage
```

The `WebhookDeliveryPage` result type.

Package: `com.convohop.server.model`.

### `WebhookEndpoint` type

```java
public final class WebhookEndpoint
```

The `WebhookEndpoint` result type.

Package: `com.convohop.server.model`.

### `WebhookEndpointPage` type

```java
public final class WebhookEndpointPage
```

The `WebhookEndpointPage` result type.

Package: `com.convohop.server.model`.

### `WebhookEndpointsReply` type

```java
public final class WebhookEndpointsReply
```

The `WebhookEndpointsReply` result type.

Package: `com.convohop.server.model`.

### `WebhookEndpointsRequestInput` type

```java
public final class WebhookEndpointsRequestInput
```

The `WebhookEndpointsRequestInput` input type.

Build instances with `builder()`. Fields without a value are omitted from the request.

Package: `com.convohop.server.model`.
