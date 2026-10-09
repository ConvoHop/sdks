# `ConvoHop.Api`

Generated APIs with a method for every communication and management operation a backend can send, and async page streams for paginated ones.

**Layer:** Server. **Runtime:** .NET 8 or later. The `netstandard2.0` build also targets .NET Framework 4.7.2 or later, which isn't tested yet. **Source:** `dotnet/src/ConvoHop`.

## Classes

### `CommunicationApi` class

```cs
public sealed class CommunicationApi
```

The `communication` plane: Conversations, members, messages, receipts, realtime events and live sessions inside one project.

Obtain an instance from a client. Instances are thread-safe.

#### `CommunicationApi.CapabilitiesAsync` method

```cs
public Task<CapabilitiesReply> CapabilitiesAsync(CancellationToken cancellationToken = default);
```

Describe the features, limits and API model the authority supports.

Parameters:

- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession, backendKey.

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `CommunicationApi.RouteAsync` method

```cs
public Task<RouteReply> RouteAsync(CancellationToken cancellationToken = default);
```

Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

Parameters:

- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession, backendKey.

Sends [`communication.route`](../../operations/communication/route.md).

#### `CommunicationApi.GetPrincipalAsync` method

```cs
public Task<GetPrincipalReply> GetPrincipalAsync(GetPrincipalRequestInput input, CancellationToken cancellationToken = default);
```

Read a principal (an application user).

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: backendKey (scopes principalManage).

Sends [`communication.getPrincipal`](../../operations/communication/getPrincipal.md).

#### `CommunicationApi.GetConversationAsync` method

```cs
public Task<GetConversationReply> GetConversationAsync(GetConversationRequestInput input, CancellationToken cancellationToken = default);
```

Read a conversation.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes conversationManage).

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `CommunicationApi.MembersAsync` method

```cs
public Task<MembersReply> MembersAsync(MembersRequestInput input, CancellationToken cancellationToken = default);
```

List the members of a conversation.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes membershipManage).

Sends [`communication.members`](../../operations/communication/members.md).

#### `CommunicationApi.MembersPagesAsync` method

```cs
public IAsyncEnumerable<MemberPage> MembersPagesAsync(MembersRequestInput input, CancellationToken cancellationToken = default);
```

The pages of `MembersAsync`, requested lazily.

Parameters:

- `input`: The first page's input.
- `cancellationToken`: Stops waiting for a page, together with any token passed to `WithCancellation`.

Returns: The pages, in order.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ArgumentException`: The input's `cursor` is not a valid cursor.

Each page is requested when enumeration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and enumeration ends after the page whose `complete` is true. Each enumeration starts again from the input as it was when this method was called, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Enumeration throws `ConvoHopException` if the authority rejects a request or a page is malformed or does not advance, and `InvalidOperationException` if a page reports `refreshRequired`: start again from current state, not from the cursor. These page failures are final. After any other failed request, an enumerator can call `MoveNextAsync` again to repeat it; `await foreach` stops at the first exception.

Sends [`communication.members`](../../operations/communication/members.md).

#### `CommunicationApi.MessagesAsync` method

```cs
public Task<MessagesReply> MessagesAsync(MessagesRequestInput input, CancellationToken cancellationToken = default);
```

List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes messageRead).

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `CommunicationApi.MessagesPagesAsync` method

```cs
public IAsyncEnumerable<MessagePage> MessagesPagesAsync(MessagesRequestInput input, CancellationToken cancellationToken = default);
```

The pages of `MessagesAsync`, requested lazily.

Parameters:

- `input`: The first page's input.
- `cancellationToken`: Stops waiting for a page, together with any token passed to `WithCancellation`.

Returns: The pages, in order.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ArgumentException`: The input's `beforeSequence` is not a valid cursor.

Each page is requested when enumeration reaches it. Later requests set `beforeSequence` to the previous page's `nextCursor`, and enumeration ends after the page whose `complete` is true. Each enumeration starts again from the input as it was when this method was called, and every request has a new request ID.

Pagination: `sequence`. Newest first. Pass nextCursor back as the sequence cursor input to read older items until complete is true.

Enumeration throws `ConvoHopException` if the authority rejects a request or a page is malformed or does not advance, and `InvalidOperationException` if a page reports `refreshRequired`: start again from current state, not from the cursor. These page failures are final. After any other failed request, an enumerator can call `MoveNextAsync` again to repeat it; `await foreach` stops at the first exception.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `CommunicationApi.GetMessageAsync` method

```cs
public Task<GetMessageReply> GetMessageAsync(GetMessageRequestInput input, CancellationToken cancellationToken = default);
```

Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes messageRead).

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `CommunicationApi.InboxAsync` method

```cs
public Task<InboxReply> InboxAsync(InboxRequestInput input, CancellationToken cancellationToken = default);
```

List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession, backendKey (scopes messageRead).

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `CommunicationApi.InboxPagesAsync` method

```cs
public IAsyncEnumerable<InboxPage> InboxPagesAsync(InboxRequestInput input, CancellationToken cancellationToken = default);
```

The pages of `InboxAsync`, requested lazily.

Parameters:

- `input`: The first page's input.
- `cancellationToken`: Stops waiting for a page, together with any token passed to `WithCancellation`.

Returns: The pages, in order.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ArgumentException`: The input's `cursor` is not a valid cursor.

Each page is requested when enumeration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and enumeration ends after the page whose `complete` is true. Each enumeration starts again from the input as it was when this method was called, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Enumeration throws `ConvoHopException` if the authority rejects a request or a page is malformed or does not advance, and `InvalidOperationException` if a page reports `refreshRequired`: start again from current state, not from the cursor. These page failures are final. After any other failed request, an enumerator can call `MoveNextAsync` again to repeat it; `await foreach` stops at the first exception.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `CommunicationApi.SearchAsync` method

```cs
public Task<SearchReply> SearchAsync(SearchRequestInput input, CancellationToken cancellationToken = default);
```

Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession, backendKey (scopes messageRead).

Sends [`communication.search`](../../operations/communication/search.md).

#### `CommunicationApi.SearchPagesAsync` method

```cs
public IAsyncEnumerable<SearchPage> SearchPagesAsync(SearchRequestInput input, CancellationToken cancellationToken = default);
```

The pages of `SearchAsync`, requested lazily.

Parameters:

- `input`: The first page's input.
- `cancellationToken`: Stops waiting for a page, together with any token passed to `WithCancellation`.

Returns: The pages, in order.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ArgumentException`: The input's `cursor` is not a valid cursor.

Each page is requested when enumeration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and enumeration ends after the page whose `complete` is true. Each enumeration starts again from the input as it was when this method was called, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Enumeration throws `ConvoHopException` if the authority rejects a request or a page is malformed or does not advance, and `InvalidOperationException` if a page reports `refreshRequired`: start again from current state, not from the cursor. These page failures are final. After any other failed request, an enumerator can call `MoveNextAsync` again to repeat it; `await foreach` stops at the first exception.

Sends [`communication.search`](../../operations/communication/search.md).

#### `CommunicationApi.ResolveRequestAsync` method

```cs
public Task<ResolveRequestReply> ResolveRequestAsync(ResolveRequestRequestInput input, CancellationToken cancellationToken = default);
```

Look up the stored outcome of an earlier communication mutation by its requestId.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition ownRequest), backendKey (condition ownRequest).

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `CommunicationApi.GetOperationAsync` method

```cs
public Task<GetOperationReply> GetOperationAsync(GetOperationRequestInput input, CancellationToken cancellationToken = default);
```

Read the state of a long-running communication operation.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition operationParticipant), backendKey (condition operationParticipant).

Sends [`communication.getOperation`](../../operations/communication/getOperation.md).

#### `CommunicationApi.ConversationMuteAsync` method

```cs
public Task<ConversationMuteReply> ConversationMuteAsync(ConversationMuteInput input, CancellationToken cancellationToken = default);
```

Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes membershipManage).

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

#### `CommunicationApi.CurrentLiveSessionAsync` method

```cs
public Task<CurrentLiveSessionReply> CurrentLiveSessionAsync(ConversationLiveInput input, CancellationToken cancellationToken = default);
```

Return the active live session of a conversation, if any.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `CommunicationApi.LiveSessionAsync` method

```cs
public Task<LiveSessionReply> LiveSessionAsync(LiveSessionInput input, CancellationToken cancellationToken = default);
```

Read a live session.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `CommunicationApi.LiveSessionsAsync` method

```cs
public Task<LiveSessionPageReply> LiveSessionsAsync(LiveSessionsInput input, CancellationToken cancellationToken = default);
```

List the live sessions of a conversation.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `CommunicationApi.LiveSessionsPagesAsync` method

```cs
public IAsyncEnumerable<LiveSessionPage> LiveSessionsPagesAsync(LiveSessionsInput input, CancellationToken cancellationToken = default);
```

The pages of `LiveSessionsAsync`, requested lazily.

Parameters:

- `input`: The first page's input.
- `cancellationToken`: Stops waiting for a page, together with any token passed to `WithCancellation`.

Returns: The pages, in order.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ArgumentException`: The input's `cursor` is not a valid cursor.

Each page is requested when enumeration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and enumeration ends after the page whose `complete` is true. Each enumeration starts again from the input as it was when this method was called, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Enumeration throws `ConvoHopException` if the authority rejects a request or a page is malformed or does not advance, and `InvalidOperationException` if a page reports `refreshRequired`: start again from current state, not from the cursor. These page failures are final. After any other failed request, an enumerator can call `MoveNextAsync` again to repeat it; `await foreach` stops at the first exception.

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `CommunicationApi.LiveSessionParticipantsAsync` method

```cs
public Task<LiveParticipantPageReply> LiveSessionParticipantsAsync(LiveParticipantsInput input, CancellationToken cancellationToken = default);
```

List the participants of a live session.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `CommunicationApi.LiveSessionParticipantsPagesAsync` method

```cs
public IAsyncEnumerable<LiveParticipantPage> LiveSessionParticipantsPagesAsync(LiveParticipantsInput input, CancellationToken cancellationToken = default);
```

The pages of `LiveSessionParticipantsAsync`, requested lazily.

Parameters:

- `input`: The first page's input.
- `cancellationToken`: Stops waiting for a page, together with any token passed to `WithCancellation`.

Returns: The pages, in order.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ArgumentException`: The input's `cursor` is not a valid cursor.

Each page is requested when enumeration reaches it. Later requests set `cursor` to the previous page's `nextCursor`, and enumeration ends after the page whose `complete` is true. Each enumeration starts again from the input as it was when this method was called, and every request has a new request ID.

Pagination: `cursor`. Server-ordered pages. Pass nextCursor back as the cursor input until complete is true.

Enumeration throws `ConvoHopException` if the authority rejects a request or a page is malformed or does not advance, and `InvalidOperationException` if a page reports `refreshRequired`: start again from current state, not from the cursor. These page failures are final. After any other failed request, an enumerator can call `MoveNextAsync` again to repeat it; `await foreach` stops at the first exception.

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `CommunicationApi.LiveSessionOperationAsync` method

```cs
public Task<LiveSessionOperationReply> LiveSessionOperationAsync(LiveSessionOperationInput input, CancellationToken cancellationToken = default);
```

Read the state of a live session start or end operation.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: userSession (condition member), backendKey (scopes callRead), backendKey (scopes callManage).

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `CommunicationApi.SessionRequestOutcomeAsync` method

```cs
public Task<SessionRequestOutcomeReply> SessionRequestOutcomeAsync(SessionRequestOutcomeRequestInput input, CancellationToken cancellationToken = default);
```

Look up the outcome of an earlier issueSession or renewSession request, including the session it produced.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: backendKey (scopes sessionIssue, sessionManage).

Sends [`communication.sessionRequestOutcome`](../../operations/communication/sessionRequestOutcome.md).

#### `CommunicationApi.CreatePrincipalAsync` method

```cs
public Task<CreatePrincipalReply> CreatePrincipalAsync(CreatePrincipalRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Create a principal for an application user.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes principalManage).

Sends [`communication.createPrincipal`](../../operations/communication/createPrincipal.md).

#### `CommunicationApi.DisablePrincipalAsync` method

```cs
public Task<DisablePrincipalReply> DisablePrincipalAsync(DisablePrincipalRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Disable a principal.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes principalManage).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`communication.disablePrincipal`](../../operations/communication/disablePrincipal.md).

#### `CommunicationApi.IssueSessionAsync` method

```cs
public Task<IssueSessionReply> IssueSessionAsync(IssueSessionRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Issue a short-lived user session token for a principal and device.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes sessionIssue).

Sends [`communication.issueSession`](../../operations/communication/issueSession.md).

#### `CommunicationApi.RenewSessionAsync` method

```cs
public Task<RenewSessionReply> RenewSessionAsync(RenewSessionRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Renew a user session before it expires.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes sessionIssue).

Sends [`communication.renewSession`](../../operations/communication/renewSession.md).

#### `CommunicationApi.RevokeSessionAsync` method

```cs
public Task<RevokeSessionReply> RevokeSessionAsync(RevokeSessionRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Revoke a user session.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition ownSession), backendKey (scopes sessionManage).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`communication.revokeSession`](../../operations/communication/revokeSession.md).

#### `CommunicationApi.CreateConversationAsync` method

```cs
public Task<CreateConversationReply> CreateConversationAsync(CreateConversationRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Create a conversation with its initial members.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes conversationManage).

Sends [`communication.createConversation`](../../operations/communication/createConversation.md).

#### `CommunicationApi.UpdateConversationAsync` method

```cs
public Task<UpdateConversationReply> UpdateConversationAsync(UpdateConversationRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Update the title or properties of a conversation.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition moderator), backendKey (scopes conversationManage).

Sends [`communication.updateConversation`](../../operations/communication/updateConversation.md).

#### `CommunicationApi.AddMemberAsync` method

```cs
public Task<AddMemberReply> AddMemberAsync(AddMemberRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Add a member, or change the role of an active member.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes membershipManage).

Sends [`communication.addMember`](../../operations/communication/addMember.md).

#### `CommunicationApi.AddMembersAsync` method

```cs
public Task<AddMembersPayload> AddMembersAsync(AddMembersInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Add several members in one request.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes membershipManage).

Sends [`communication.addMembers`](../../operations/communication/addMembers.md).

#### `CommunicationApi.RemoveMemberAsync` method

```cs
public Task<RemoveMemberReply> RemoveMemberAsync(RemoveMemberRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Remove a member from a conversation.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes membershipManage).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`communication.removeMember`](../../operations/communication/removeMember.md).

#### `CommunicationApi.HistoryGrantAsync` method

```cs
public Task<HistoryGrantReply> HistoryGrantAsync(HistoryGrantRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Expand the history a member can see to an earlier sequence.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes historyManage).

Sends [`communication.historyGrant`](../../operations/communication/historyGrant.md).

#### `CommunicationApi.SendMessageAsync` method

```cs
public Task<SendMessageReply> SendMessageAsync(SendMessageRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition member), backendKey (scopes messageWrite).

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `CommunicationApi.EditMessageAsync` method

```cs
public Task<EditMessageReply> EditMessageAsync(EditMessageRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Edit a message.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition authorOrModerator), backendKey (scopes moderation).

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `CommunicationApi.DeleteMessageAsync` method

```cs
public Task<DeleteMessageReply> DeleteMessageAsync(DeleteMessageRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Delete a message.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition authorOrModerator), backendKey (scopes moderation).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `CommunicationApi.SetBroadcastPermissionAsync` method

```cs
public Task<SetBroadcastPermissionPayload> SetBroadcastPermissionAsync(SetBroadcastPermissionInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Allow or deny a member to publish media in live sessions.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: backendKey (scopes membershipManage).

Sends [`communication.setBroadcastPermission`](../../operations/communication/setBroadcastPermission.md).

#### `CommunicationApi.SetConversationMuteAsync` method

```cs
public Task<SetConversationMutePayload> SetConversationMuteAsync(SetConversationMuteInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition member), backendKey (scopes membershipManage).

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `CommunicationApi.AlertLiveSessionAsync` method

```cs
public Task<AlertLiveSessionPayload> AlertLiveSessionAsync(AlertLiveSessionInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Alert (ring) conversation members about a live session.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition creatorOrModerator), backendKey (scopes callManage).

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `CommunicationApi.EndLiveSessionAsync` method

```cs
public Task<EndLiveSessionPayload> EndLiveSessionAsync(EndLiveSessionInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

End a live session for every participant. Completes asynchronously.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: userSession (condition creatorOrModerator), backendKey (scopes callManage).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

#### `CommunicationApi.RedeemCredentialAsync` method

```cs
public Task<RedeemCredentialReply> RedeemCredentialAsync(RedeemCredentialRequestInput input, JsonElement credentialDeliveryPermit, string? requestId = null, CancellationToken cancellationToken = default);
```

Redeem a delivered credential with its delivery permit.

Parameters:

- `input`: The operation input.
- `credentialDeliveryPermit`: The `credentialDeliveryPermit` credential, sent unchanged in the request context.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ArgumentException`: `credentialDeliveryPermit` is a default `JsonElement`.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `permitBound`. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.

Authorization: deliveryPermit.

Sends [`communication.redeemCredential`](../../operations/communication/redeemCredential.md).

#### `CommunicationApi.AcknowledgeCredentialAsync` method

```cs
public Task<AcknowledgeCredentialReply> AcknowledgeCredentialAsync(AcknowledgeCredentialRequestInput input, JsonElement credentialDeliveryPermit, string? requestId = null, CancellationToken cancellationToken = default);
```

Acknowledge that a redeemed credential is stored, closing the delivery.

Parameters:

- `input`: The operation input.
- `credentialDeliveryPermit`: The `credentialDeliveryPermit` credential, sent unchanged in the request context.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ArgumentException`: `credentialDeliveryPermit` is a default `JsonElement`.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `permitBound`. Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.

Authorization: deliveryPermit.

Sends [`communication.acknowledgeCredential`](../../operations/communication/acknowledgeCredential.md).

### `ManagementApi` class

```cs
public sealed class ManagementApi
```

The `management` plane: Organizations, deployments, projects, backend keys and webhooks.

Obtain an instance from a client. Instances are thread-safe.

#### `ManagementApi.CapabilitiesAsync` method

```cs
public Task<CapabilitiesReply> CapabilitiesAsync(CancellationToken cancellationToken = default);
```

Describe the management features and limits the authority supports.

Parameters:

- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential.

Sends [`management.capabilities`](../../operations/management/capabilities.md).

#### `ManagementApi.OrganizationsAsync` method

```cs
public Task<OrganizationsReply> OrganizationsAsync(CancellationToken cancellationToken = default);
```

List the organizations the caller can access.

Parameters:

- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential.

Sends [`management.organizations`](../../operations/management/organizations.md).

#### `ManagementApi.GetOrganizationAsync` method

```cs
public Task<GetOrganizationReply> GetOrganizationAsync(GetOrganizationRequestInput input, CancellationToken cancellationToken = default);
```

Read an organization.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.getOrganization`](../../operations/management/getOrganization.md).

#### `ManagementApi.GetDeploymentAsync` method

```cs
public Task<GetDeploymentReply> GetDeploymentAsync(GetDeploymentRequestInput input, CancellationToken cancellationToken = default);
```

Read a deployment.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.getDeployment`](../../operations/management/getDeployment.md).

#### `ManagementApi.GetProjectAsync` method

```cs
public Task<GetProjectReply> GetProjectAsync(GetProjectRequestInput input, CancellationToken cancellationToken = default);
```

Read a project.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.getProject`](../../operations/management/getProject.md).

#### `ManagementApi.DeploymentHealthAsync` method

```cs
public Task<DeploymentHealthReply> DeploymentHealthAsync(DeploymentHealthRequestInput input, CancellationToken cancellationToken = default);
```

Read the health of a deployment.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.deploymentHealth`](../../operations/management/deploymentHealth.md).

#### `ManagementApi.DeploymentUsageAsync` method

```cs
public Task<DeploymentUsageReply> DeploymentUsageAsync(DeploymentUsageRequestInput input, CancellationToken cancellationToken = default);
```

Read the metered usage of a deployment, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.deploymentUsage`](../../operations/management/deploymentUsage.md).

#### `ManagementApi.ProjectUsageAsync` method

```cs
public Task<ProjectUsageReply> ProjectUsageAsync(ProjectUsageRequestInput input, CancellationToken cancellationToken = default);
```

Read the metered usage of a project. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.projectUsage`](../../operations/management/projectUsage.md).

#### `ManagementApi.OrganizationUsageAsync` method

```cs
public Task<OrganizationUsageReply> OrganizationUsageAsync(OrganizationUsageRequestInput input, CancellationToken cancellationToken = default);
```

Read the metered usage of an organization in any status, summed over its projects. The range defaults to the current UTC month to date, both bounds round up to whole UTC hours, and it spans at most 400 days.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.organizationUsage`](../../operations/management/organizationUsage.md).

#### `ManagementApi.WebhookEndpointsAsync` method

```cs
public Task<WebhookEndpointsReply> WebhookEndpointsAsync(WebhookEndpointsRequestInput input, CancellationToken cancellationToken = default);
```

List the webhook endpoints of a project with their status, signing-secret rotation and delivery health.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.webhookEndpoints`](../../operations/management/webhookEndpoints.md).

#### `ManagementApi.WebhookDeliveriesAsync` method

```cs
public Task<WebhookDeliveriesReply> WebhookDeliveriesAsync(WebhookDeliveriesRequestInput input, CancellationToken cancellationToken = default);
```

List recent deliveries of a webhook endpoint.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.webhookDeliveries`](../../operations/management/webhookDeliveries.md).

#### `ManagementApi.ResolveRequestAsync` method

```cs
public Task<ResolveRequestReply> ResolveRequestAsync(ResolveRequestRequestInput input, CancellationToken cancellationToken = default);
```

Look up the stored outcome of an earlier management mutation by its requestId.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition ownRequest).

Sends [`management.resolveRequest`](../../operations/management/resolveRequest.md).

#### `ManagementApi.GetOperationAsync` method

```cs
public Task<GetOperationReply> GetOperationAsync(GetOperationRequestInput input, CancellationToken cancellationToken = default);
```

Read the state of a long-running management operation.

Parameters:

- `input`: The operation input.
- `cancellationToken`: Stops waiting.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `safe`. Read-only. Repeat freely; each attempt may use a new requestId.

Authorization: portalCredential (condition owner).

Sends [`management.getOperation`](../../operations/management/getOperation.md).

#### `ManagementApi.CreateOrganizationAsync` method

```cs
public Task<CreateOrganizationReply> CreateOrganizationAsync(CreateOrganizationRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Create an organization.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential.

Sends [`management.createOrganization`](../../operations/management/createOrganization.md).

#### `ManagementApi.CreateDeploymentAsync` method

```cs
public Task<CreateDeploymentReply> CreateDeploymentAsync(CreateDeploymentRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Create a deployment in an organization. Completes asynchronously.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.createDeployment`](../../operations/management/createDeployment.md).

#### `ManagementApi.CreateProjectAsync` method

```cs
public Task<CreateProjectReply> CreateProjectAsync(CreateProjectRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Create a project in a ready deployment. Completes asynchronously.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.createProject`](../../operations/management/createProject.md).

#### `ManagementApi.IssueBackendKeyAsync` method

```cs
public Task<IssueBackendKeyReply> IssueBackendKeyAsync(IssueBackendKeyRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Issue a scoped backend key. The secret is delivered once through a credential delivery.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.issueBackendKey`](../../operations/management/issueBackendKey.md).

#### `ManagementApi.RevokeBackendKeyAsync` method

```cs
public Task<RevokeBackendKeyReply> RevokeBackendKeyAsync(RevokeBackendKeyRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Revoke a backend key, optionally revoking the sessions it issued.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`management.revokeBackendKey`](../../operations/management/revokeBackendKey.md).

#### `ManagementApi.ProjectPolicyAsync` method

```cs
public Task<ProjectPolicyReply> ProjectPolicyAsync(ProjectPolicyRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Change the policy of a project.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.projectPolicy`](../../operations/management/projectPolicy.md).

#### `ManagementApi.CredentialPermitAsync` method

```cs
public Task<CredentialPermitReply> CredentialPermitAsync(CredentialPermitRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Issue a signed permit that authorizes redeeming one credential delivery.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.credentialPermit`](../../operations/management/credentialPermit.md).

#### `ManagementApi.PauseOperationAsync` method

```cs
public Task<PauseOperationReply> PauseOperationAsync(PauseOperationRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Pause a long-running operation.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.pauseOperation`](../../operations/management/pauseOperation.md).

#### `ManagementApi.ResumeOperationAsync` method

```cs
public Task<ResumeOperationReply> ResumeOperationAsync(ResumeOperationRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Resume a paused operation.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.resumeOperation`](../../operations/management/resumeOperation.md).

#### `ManagementApi.ConfigureWebhookAsync` method

```cs
public Task<ConfigureWebhookReply> ConfigureWebhookAsync(ConfigureWebhookRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Create a webhook endpoint for project events. The signing secret is delivered once through a credential delivery.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.configureWebhook`](../../operations/management/configureWebhook.md).

#### `ManagementApi.UpdateWebhookAsync` method

```cs
public Task<UpdateWebhookReply> UpdateWebhookAsync(UpdateWebhookRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Change the event types of a webhook endpoint, or enable or disable it.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`management.updateWebhook`](../../operations/management/updateWebhook.md).

#### `ManagementApi.RotateWebhookSecretAsync` method

```cs
public Task<RotateWebhookSecretReply> RotateWebhookSecretAsync(RotateWebhookSecretRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Start rotating the signing secret of a webhook endpoint. The next secret is delivered once through a credential delivery.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`management.rotateWebhookSecret`](../../operations/management/rotateWebhookSecret.md).

#### `ManagementApi.DisableWebhookAsync` method

```cs
public Task<DisableWebhookReply> DisableWebhookAsync(DisableWebhookRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Disable a webhook endpoint.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Destructive: it deletes, revokes, removes, disables or ends something.

Sends [`management.disableWebhook`](../../operations/management/disableWebhook.md).

#### `ManagementApi.ReplayWebhookDeliveriesAsync` method

```cs
public Task<ReplayWebhookDeliveriesReply> ReplayWebhookDeliveriesAsync(ReplayWebhookDeliveriesRequestInput input, string? requestId = null, CancellationToken cancellationToken = default);
```

Redeliver one webhook delivery, or the deliveries of an endpoint in a time range, with their original event IDs.

Parameters:

- `input`: The operation input.
- `requestId`: The request ID of an earlier attempt to retry with the same input, or null for a new one.
- `cancellationToken`: Stops waiting. A cancelled mutation has an unknown outcome.

Returns: The authority result.

Exceptions:

- `ArgumentNullException`: `input` is null.
- `ConvoHopException`: The request was invalid, the authority rejected it, or its outcome is unknown.

Idempotency: `idempotent`. Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

Authorization: portalCredential (condition owner).

Sends [`management.replayWebhookDeliveries`](../../operations/management/replayWebhookDeliveries.md).
