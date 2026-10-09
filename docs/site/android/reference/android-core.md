# `com.convohop:convohop-android-core`

The platform-free client that `convohop-android` brings in: sessions and their renewal, conversations, the store, the offline outbox, timelines, recovery, live sessions and the generated protocol types.

**Layer:** Client. **Runtime:** Android 7.0 (API 24) or later, through `convohop-android`. It isn't a supported entry point on its own. **Source:** `android/core`.

## Classes

### `CanonicalJson` class

```kotlin
public object CanonicalJson
```

Canonical JSON: sorted keys, no whitespace, bounded numbers. Request bodies and fingerprints use it.

Package: `com.convohop.android.core`.

#### `CanonicalJson.encode` static method

```kotlin
public fun encode(value: JsonElement): String
```

Encodes `value`, rejecting numbers outside the safe integer range.

#### `CanonicalJson.fingerprint` static method

```kotlin
public fun fingerprint(value: JsonElement): String
```

`sha256:` followed by the hex SHA-256 of `encode`.

#### `CanonicalJson.parse` static method

```kotlin
public fun parse(text: String): JsonElement
```

Parses strict JSON text; anything else is a `ConvoHopProtocolException`.

### `ConversationHandle` class

```kotlin
public class ConversationHandle
```

One conversation: its messages, this user's mute setting and its calls.

Package: `com.convohop.android.core`.

#### `ConversationHandle.client` property

```kotlin
public val client: ConvoHopClient
```

#### `ConversationHandle.conversationId` property

```kotlin
public val conversationId: String
```

#### `ConversationHandle.messages` property

```kotlin
public val messages: Messages
```

##### `ConversationHandle.messages.send` method

```kotlin
public suspend fun send(
    text: String,
    props: JsonObject = JsonObject(emptyMap()),
    requestId: String? = null,
): SendReceipt
```

Sends a message; reuse `requestId` only to resend the same message after an unknown outcome.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

##### `ConversationHandle.messages.list` method

```kotlin
public suspend fun list(beforeSequence: String? = null): MessagePage
```

Sends [`communication.messages`](../../operations/communication/messages.md).

##### `ConversationHandle.messages.edit` method

```kotlin
public suspend fun edit(message: Message, text: String, requestId: String? = null): Message
```

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

##### `ConversationHandle.messages.delete` method

```kotlin
public suspend fun delete(message: Message, requestId: String? = null): Message
```

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `ConversationHandle.mute` property

```kotlin
public val mute: Mute
```

This user's mute of message notifications for the conversation. A
future RFC 3339 `until` applies only to a mute. Calls still ring a
muted member.

##### `ConversationHandle.mute.get` method

```kotlin
public suspend fun get(): ConversationMute
```

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

##### `ConversationHandle.mute.set` method

```kotlin
public suspend fun set(
    muted: Boolean,
    until: String? = null,
    requestId: String? = null,
): ConversationMute
```

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

#### `ConversationHandle.live` property

```kotlin
public val live: ConversationLive
```

#### `ConversationHandle.get` method

```kotlin
public suspend fun get(): Conversation
```

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

### `ConversationLive` class

```kotlin
public class ConversationLive
```

Calls and broadcasts in one conversation.

Package: `com.convohop.android.core`.

#### `ConversationLive.current` method

```kotlin
public suspend fun current(): LiveSessionHandle?
```

The conversation's current call or broadcast, if any.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `ConversationLive.history` method

```kotlin
public suspend fun history(limit: Int? = null, cursor: String? = null): LiveSessionPage
```

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `ConversationLive.startVoice` method

```kotlin
public suspend fun startVoice(requestId: String? = null): LiveStartOperation
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

#### `ConversationLive.startVideo` method

```kotlin
public suspend fun startVideo(requestId: String? = null): LiveStartOperation
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

#### `ConversationLive.startBroadcast` method

```kotlin
public suspend fun startBroadcast(
    mediaProfile: LiveMediaProfile,
    requestId: String? = null,
): LiveStartOperation
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

### `ConversationStream` class

```kotlin
public class ConversationStream : AutoCloseable
```

One conversation's authorized history, replayed from its applied cursor
and then followed live over `graphql-transport-ws`.

Batches reach the application's apply callback in order, one at a time;
the cursor advances and is stored only after the callback returns. A
dropped socket reconnects with the conversation channel's backoff, routes
again, settles pending mutations, catches up over HTTP and subscribes again
from the applied cursor. A problem with a retryable code and a status of 0,
408, 429 or 5xx, or `WRONG_REGION`, goes to the error callback and
reconnects too, never sooner than its `retryAfter`. So does a close whose
reason names such a problem, such as `RATE_LIMITED retryAfter=4`. Any other
problem closes the replay and goes to the error callback: a close that names
`QUOTA_EXCEEDED` or `PLAN_LIMIT_EXCEEDED`, ended realtime authorization,
authorization failures and protocol violations. Open a new replay once the
cause is resolved, such as after obtaining a current session.

Package: `com.convohop.android.core`.

#### `ConversationStream.conversationId` property

```kotlin
public val conversationId: String
```

#### `ConversationStream.state` property

```kotlin
public val state: StateFlow<ReplayState>
```

Where the replay stands. It becomes `ReplayState.CLOSED` only after onError received the reason a
permanent failure ended the replay, so an observer on any thread that sees CLOSED also has the reason.

#### `ConversationStream.cursor` property

```kotlin
public val cursor: Cursor?
```

The last applied position; replay resumes after it. It advances only once the position is stored.

#### `ConversationStream.closed` property

```kotlin
public val closed: Boolean
```

True once `close` ran or the replay failed permanently. It is already true while onError receives a
permanent failure, which tells it from a transient one.

#### `ConversationStream.close` method

```kotlin
public override fun close()
```

Stops the replay: no further batches are applied and the socket closes.
A batch already inside the apply callback finishes first.

#### `ConversationStream.reconnectNow` method

```kotlin
public fun reconnectNow()
```

Skips the reconnect backoff, for example when the device is back
online, though never the wait that the authority's `retryAfter` asked
for. Does nothing unless the replay is `ReplayState.RECONNECTING`.

#### `ConversationStream.reconcile` method

```kotlin
public suspend fun reconcile(): Unit
```

Catches up over HTTP now. Fails when more than one bounded round of
work remains; call it again to continue.

Sends [`communication.events`](../../operations/communication/events.md).

### `ConvoHopAggregateException` class

```kotlin
public class ConvoHopAggregateException : RuntimeException
```

Several independent failures, such as a failed renewal and a replay that could not resume.

Package: `com.convohop.android.core`.

#### `ConvoHopAggregateException` constructor

```kotlin
public constructor(message: String, errors: List<Throwable>)
```

#### `ConvoHopAggregateException.errors` property

```kotlin
public val errors: List<Throwable>
```

### `ConvoHopClient` class

```kotlin
public class ConvoHopClient : AutoCloseable
```

The user-session client: conversations, messages, receipts, replay and
calls for one principal in one project incarnation.

Every operation runs on a private serial dispatcher, so the client is safe
to call from any thread. Mutations keep their request ID, payload,
incarnation and retry budget across retries; an unknown outcome is
reported as unknown, never as rejection or commit. `close` cancels
in-flight work; recovery records in storage survive it.

Package: `com.convohop.android.core`.

#### `ConvoHopClient` constructor

```kotlin
public constructor(options: ConvoHopClientOptions)
```

#### `ConvoHopClient.projectId` property

```kotlin
public val projectId: String
```

#### `ConvoHopClient.principalId` property

```kotlin
public val principalId: String
```

#### `ConvoHopClient.incarnation` property

```kotlin
public val incarnation: String
```

The incarnation this client is bound to.

#### `ConvoHopClient.sessionBinding` property

```kotlin
public val sessionBinding: Session?
```

The verified session binding, once `initialize` ran with a `SessionRefresh` hook.

#### `ConvoHopClient.sessionRefreshState` property

```kotlin
public val sessionRefreshState: SessionRefreshState
```

#### `ConvoHopClient.requests` property

```kotlin
public val requests: Requests
```

Mutation recovery and request resolution.

##### `ConvoHopClient.requests.resolve` method

```kotlin
public suspend fun resolve(requestId: String): RequestResolution
```

Reads what the authority knows about `requestId` without resending it.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

##### `ConvoHopClient.requests.retry` method

```kotlin
public suspend fun retry(requestId: String): RequestResolution
```

Resolves `requestId` and resends the original request only when the
authority has not observed it and its retry budget remains.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

##### `ConvoHopClient.requests.records` method

```kotlin
public suspend fun records(): List<RecoveryRecord>
```

Snapshots of the stored recovery records. They never contain credentials.

#### `ConvoHopClient.liveAlerts` property

```kotlin
public val liveAlerts: LiveAlerts
```

Live-session alerts addressed to this principal.

##### `ConvoHopClient.liveAlerts.list` method

```kotlin
public suspend fun list(cursor: String? = null, limit: Int? = null): LiveAlertPage
```

Sends [`communication.liveSessionAlerts`](../../operations/communication/liveSessionAlerts.md).

#### `ConvoHopClient.initialize` method

```kotlin
public suspend fun initialize(): ProjectRoute
```

Loads the signed project route and, with a `SessionRefresh` hook, binds
the original session. Call it before `refreshSession`.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `ConvoHopClient.refreshSession` method

```kotlin
public suspend fun refreshSession(): Session
```

Renews the session through the `SessionRefresh` hook. Concurrent calls
share one renewal. New requests wait while in-flight ones drain; replays
pause and resume on the verified route. When neither the replacement nor
the original bearer can be verified, the client stays `SessionRefreshState.BLOCKED`.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `ConvoHopClient.refreshAutomatically` method

```kotlin
public fun refreshAutomatically(onError: (Throwable) -> Unit): AutoCloseable
```

Renews the session through the `SessionRefresh` hook before it expires,
at least 30 seconds and at most 5 minutes ahead. A failed renewal goes to
`onError` and is retried with backoff until the session expires; the
schedule stops when renewal is `SessionRefreshState.BLOCKED`, the session
has expired, the returned handle is closed or the client is closed.
Initializes the client first if needed. A failed initialization goes to
`onError` too; one with a retryable code and a status of 0, 408, 429 or
5xx, or `WRONG_REGION`, is tried again with backoff, never sooner than its
`retryAfter`, and any other stops the schedule.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `ConvoHopClient.reconnectNow` method

```kotlin
public fun reconnectNow()
```

Skips the reconnect backoff of every replay that is waiting to
reconnect, for example when the device is back online, though never the
wait that the authority's `retryAfter` asked for.

#### `ConvoHopClient.conversation` method

```kotlin
public fun conversation(conversationId: String): ConversationHandle
```

A handle for one conversation's messages, mute setting and calls.

#### `ConvoHopClient.liveSession` method

```kotlin
public suspend fun liveSession(liveSessionId: String): LiveSessionHandle
```

Loads one live session (call or broadcast) by ID.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `ConvoHopClient.getConversation` method

```kotlin
public suspend fun getConversation(
    conversationId: String,
): com.convohop.android.generated.Conversation
```

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `ConvoHopClient.getMessage` method

```kotlin
public suspend fun getMessage(conversationId: String, messageId: String): Message
```

One message by ID, as this principal is currently allowed to see it.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `ConvoHopClient.messages` method

```kotlin
public suspend fun messages(conversationId: String, beforeSequence: String? = null): MessagePage
```

The newest 100 messages, or the 100 before `beforeSequence`.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ConvoHopClient.send` method

```kotlin
public suspend fun send(
    conversationId: String,
    text: String,
    requestId: String? = null,
    props: JsonObject = EMPTY_INPUT,
): SendReceipt
```

Sends a text message with optional application `props`. Pass the same
`requestId` to resend after an unknown outcome; a new ID is a new message.

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConvoHopClient.edit` method

```kotlin
public suspend fun edit(message: Message, text: String, requestId: String? = null): Message
```

Replaces the text of `message` if it is still at its revision.

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `ConvoHopClient.delete` method

```kotlin
public suspend fun delete(message: Message, requestId: String? = null): Message
```

Deletes `message` if it is still at its revision.

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `ConvoHopClient.events` method

```kotlin
public suspend fun events(conversationId: String, after: Cursor? = null): EventPage
```

Up to 100 authorized events after `after`, checked for order and scope.

Sends [`communication.events`](../../operations/communication/events.md).

#### `ConvoHopClient.reportRead` method

```kotlin
public suspend fun reportRead(
    conversationId: String,
    membership: Member,
    throughSequence: String,
): ReadReceipt
```

Reports that this principal read `conversationId` through `throughSequence`
under `membership`, which also covers delivery. Returns its current receipt.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConvoHopClient.reportDelivered` method

```kotlin
public suspend fun reportDelivered(
    conversationId: String,
    membership: Member,
    throughSequence: String,
): ReadReceipt
```

Reports that this principal received `conversationId` through
`throughSequence` under `membership`, for example when a push arrives.
Returns its current receipt.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConvoHopClient.receipts` method

```kotlin
public suspend fun receipts(conversationId: String): ReceiptPage
```

The members' current read receipts.

Sends [`communication.receipts`](../../operations/communication/receipts.md).

#### `ConvoHopClient.members` method

```kotlin
public suspend fun members(
    conversationId: String,
    cursor: String? = null,
    limit: Int = 100,
): MemberPage
```

One page of `conversationId`'s members: up to `limit` (1 to 100), after `cursor` from the previous page.

Sends [`communication.members`](../../operations/communication/members.md).

#### `ConvoHopClient.inbox` method

```kotlin
public suspend fun inbox(cursor: String? = null, limit: Int = 100): InboxPage
```

One page of the conversations this principal can see: up to `limit`
(1 to 100), after `cursor` from the previous page. A page with a
`partialReason` is incomplete for that reason.

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `ConvoHopClient.capabilities` method

```kotlin
public suspend fun capabilities(): Capabilities
```

The project's features, limits and media policy. Check `features?.typing`
before sending typing signals and `features?.inbox` before listing the inbox.

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `ConvoHopClient.search` method

```kotlin
public suspend fun search(query: String, conversationIds: List<String>? = null): SearchPage
```

Lexical search across readable conversations, optionally limited to `conversationIds`.

Sends [`communication.search`](../../operations/communication/search.md).

#### `ConvoHopClient.typing` method

```kotlin
public suspend fun typing(conversationId: String, isTyping: Boolean): Boolean
```

Sends an ephemeral typing signal. It is not recorded for recovery and is
never retried; returns whether the authority accepted it. Check
`features?.typing` in `capabilities` first.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `ConvoHopClient.recoverPending` method

```kotlin
public suspend fun recoverPending(onError: (Throwable) -> Unit): Unit
```

Settles up to 16 stored mutations that may still come to something: those
whose outcome is pending or unknown, and those rejected with a retryable
code. Resends the original when its last attempt failed transiently and
budget remains, otherwise resolves it read-only. Failures go to `onError`.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ConvoHopClient.watch` method

```kotlin
public suspend fun watch(
    conversationId: String,
    apply: suspend (List<Event>) -> Unit,
    onError: (Throwable) -> Unit,
): ConversationStream
```

Replays `conversationId` from its stored cursor, then follows it live.
`apply` receives each authorized batch in order on the client's serial
dispatcher; the cursor advances only after it returns. Do not await
`refreshSession` inside `apply`.

Sends [`communication.events`](../../operations/communication/events.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConvoHopClient.resyncAuthorizedHistory` method

```kotlin
public suspend fun resyncAuthorizedHistory(
    conversationId: String,
    apply: suspend (List<Event>) -> Unit,
    onError: (Throwable) -> Unit,
): ConversationStream
```

Closes every replay of `conversationId` and replays authorized history
from the start, ignoring the stored cursor until the first batch
replaces it. Use it when the authority requires resynchronization.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.events`](../../operations/communication/events.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConvoHopClient.close` method

```kotlin
public override fun close()
```

Closes every replay and cancels in-flight work. Later calls fail.

### `ConvoHopClientOptions` class

```kotlin
public class ConvoHopClientOptions
```

Options for `ConvoHopClient`. The session token stays in memory; it is
never written to `recoveryStorage`, logs or errors.

Package: `com.convohop.android.core`.

#### `ConvoHopClientOptions` constructor

```kotlin
public constructor(
    baseUrl: String,
    projectId: String,
    sessionToken: String,
    incarnation: String,
    principalId: String,
    recoveryStorage: RecoveryStorage? = null,
    sessionRefresh: SessionRefresh? = null,
    http: HttpEngine = OkHttpEngine(),
    realtime: RealtimeConnector = OkHttpRealtimeConnector(),
    environment: ConvoHopEnvironment = ConvoHopEnvironment.System,
    dispatcher: CoroutineDispatcher = Dispatchers.IO,
)
```

#### `ConvoHopClientOptions.baseUrl` property

```kotlin
public val baseUrl: String
```

The authority's HTTPS origin, or explicit loopback HTTP for local development.

#### `ConvoHopClientOptions.projectId` property

```kotlin
public val projectId: String
```

#### `ConvoHopClientOptions.sessionToken` property

```kotlin
public val sessionToken: String
```

The short-lived user session bearer your backend issued. Never ship a backend key in an app.

#### `ConvoHopClientOptions.incarnation` property

```kotlin
public val incarnation: String
```

#### `ConvoHopClientOptions.principalId` property

```kotlin
public val principalId: String
```

#### `ConvoHopClientOptions.recoveryStorage` property

```kotlin
public val recoveryStorage: RecoveryStorage?
```

Durable storage for mutation recovery records and replay cursors. It never receives credentials.

#### `ConvoHopClientOptions.sessionRefresh` property

```kotlin
public val sessionRefresh: SessionRefresh?
```

Your backend's renewal hook. Without it `ConvoHopClient.refreshSession` is unavailable.

#### `ConvoHopClientOptions.http` property

```kotlin
public val http: HttpEngine
```

#### `ConvoHopClientOptions.realtime` property

```kotlin
public val realtime: RealtimeConnector
```

#### `ConvoHopClientOptions.environment` property

```kotlin
public val environment: ConvoHopEnvironment
```

#### `ConvoHopClientOptions.dispatcher` property

```kotlin
public val dispatcher: CoroutineDispatcher
```

Runs the client's state machine. The client narrows it to one task at a time.

### `ConvoHopProblem` class

```kotlin
public open class ConvoHopProblem : RuntimeException
```

An authority or SDK problem in the protocol's normalized form.

`outcome` says what is known about the request: `rejected` (not applied),
`committed` or `accepted` (applied), or `unknown` (resolve the original
request before deciding). Transport uncertainty is never reported as
rejection or commit. Messages never contain credentials.

Package: `com.convohop.android.core`.

#### `ConvoHopProblem` constructor

```kotlin
public constructor(
    code: String,
    requestId: String,
    outcome: String,
    status: Int,
    message: String,
    retryAfter: Long? = null,
    cause: Throwable? = null,
)
```

#### `ConvoHopProblem.code` property

```kotlin
public val code: String
```

#### `ConvoHopProblem.requestId` property

```kotlin
public val requestId: String
```

#### `ConvoHopProblem.outcome` property

```kotlin
public val outcome: String
```

#### `ConvoHopProblem.status` property

```kotlin
public val status: Int
```

The HTTP status, or 0 when no authority response was observed.

#### `ConvoHopProblem.message` property

```kotlin
public override val message: String
```

#### `ConvoHopProblem.retryAfter` property

```kotlin
public val retryAfter: Long?
```

Whole seconds to wait before resending the same request, when the authority sent a delay (for example
with `RATE_LIMITED`). The SDK never resends a call that the app made. When it reconnects a conversation's
stream or resends a queued message on its own, it waits at least this long first.

#### `ConvoHopProblem.toString` method

```kotlin
public override fun toString(): String
```

### `ConvoHopProtocolException` class

```kotlin
public class ConvoHopProtocolException : RuntimeException
```

A value that breaks the protocol: a malformed response, stored record or
argument. Inside a request the SDK reports it as `INVALID_RESPONSE`.

Package: `com.convohop.android.core`.

#### `ConvoHopProtocolException` constructor

```kotlin
public constructor(message: String)
```

### `ConvoHopStore` class

```kotlin
public class ConvoHopStore : AutoCloseable
```

The offline-first layer over a `ConvoHopClient`: one `Outbox` for
optimistic sends that survive restarts, and `Timeline`s that show stored
messages at once and keep them current.

`local` keeps messages and the outbox; it never holds credentials. Feed
`online` from the platform's connectivity: going offline holds the outbox,
and coming back drains it and skips reconnect backoff, though never the
wait that the authority's `retryAfter` asked for. Errors that the store
handles by retrying or by marking a message are still reported to
`onError`, for logging.

Package: `com.convohop.android.core`.

#### `ConvoHopStore` constructor

```kotlin
public constructor(
    client: ConvoHopClient,
    local: LocalStore = MemoryLocalStore(),
    online: StateFlow<Boolean> = MutableStateFlow(true),
    onError: (Throwable) -> Unit = {},
)
```

#### `ConvoHopStore.client` property

```kotlin
public val client: ConvoHopClient
```

#### `ConvoHopStore.local` property

```kotlin
public val local: LocalStore
```

#### `ConvoHopStore.online` property

```kotlin
public val online: StateFlow<Boolean>
```

#### `ConvoHopStore.outbox` property

```kotlin
public val outbox: Outbox
```

Messages sent through this store that the authority has not shown back yet.

#### `ConvoHopStore.timeline` method

```kotlin
public fun timeline(conversationId: String): Timeline
```

Opens a timeline of `conversationId`. Each call opens its own; close
it when the view goes away.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConvoHopStore.close` method

```kotlin
public override fun close()
```

Closes every timeline and stops sending. The outbox stays in `local` for the next store.

#### `ConvoHopStore.signOut` method

```kotlin
public suspend fun signOut()
```

Closes the store and deletes everything in `local`, including messages
that were never sent. Call it when the user signs out, before closing
the client.

### `ErrorCodeInfo` class

```kotlin
public class ErrorCodeInfo
```

What the schema says about one error code.

Package: `com.convohop.android.generated`.

#### `ErrorCodeInfo.code` property

```kotlin
public val code: String
```

#### `ErrorCodeInfo.summary` property

```kotlin
public val summary: String
```

#### `ErrorCodeInfo.origin` property

```kotlin
public val origin: String
```

`server`, `sdk` or `both`.

#### `ErrorCodeInfo.status` property

```kotlin
public val status: Int?
```

The HTTP-equivalent status, when the code has one.

#### `ErrorCodeInfo.retryable` property

```kotlin
public val retryable: Boolean
```

Whether a later attempt with the same requestId may succeed.

### `ErrorCodes` class

```kotlin
public object ErrorCodes
```

Stable error codes. The set is open: handle codes this SDK does not list.

Package: `com.convohop.android.generated`.

#### `ErrorCodes.ADMISSION_LIMIT` static property

```kotlin
public const val ADMISSION_LIMIT: String = "ADMISSION_LIMIT"
```

A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId.

#### `ErrorCodes.AGENTIC_NOT_CONFIGURED` static property

```kotlin
public const val AGENTIC_NOT_CONFIGURED: String = "AGENTIC_NOT_CONFIGURED"
```

Agent signup is not offered in this environment.

#### `ErrorCodes.AGENT_CONFIRMATION_CODE_INVALID` static property

```kotlin
public const val AGENT_CONFIRMATION_CODE_INVALID: String = "AGENT_CONFIRMATION_CODE_INVALID"
```

The confirmation code differs from the one the agent shows. The fifth wrong code closes the signup request.

#### `ErrorCodes.AGENT_GRANT_EXPIRED` static property

```kotlin
public const val AGENT_GRANT_EXPIRED: String = "AGENT_GRANT_EXPIRED"
```

The agent's grant has expired. The agent needs a new signup request approved.

#### `ErrorCodes.AGENT_GRANT_REVOKED` static property

```kotlin
public const val AGENT_GRANT_REVOKED: String = "AGENT_GRANT_REVOKED"
```

The owner revoked the agent's grant.

#### `ErrorCodes.AGENT_KEY_LIMIT` static property

```kotlin
public const val AGENT_KEY_LIMIT: String = "AGENT_KEY_LIMIT"
```

The grant already has as many active keys as it allows. Issue another after one expires or the owner revokes one.

#### `ErrorCodes.AGENT_PURCHASE_LIMIT_EXCEEDED` static property

```kotlin
public const val AGENT_PURCHASE_LIMIT_EXCEEDED: String = "AGENT_PURCHASE_LIMIT_EXCEEDED"
```

The purchase would take this month's agent credit purchases beyond the limit the owner set.

#### `ErrorCodes.AGENT_SCOPE_NOT_GRANTED` static property

```kotlin
public const val AGENT_SCOPE_NOT_GRANTED: String = "AGENT_SCOPE_NOT_GRANTED"
```

A requested scope is outside the agent's grant.

#### `ErrorCodes.AGENT_SIGNUP_CLOSED` static property

```kotlin
public const val AGENT_SIGNUP_CLOSED: String = "AGENT_SIGNUP_CLOSED"
```

The signup request is no longer pending: it was approved, rejected, locked by wrong confirmation codes, or has expired.

#### `ErrorCodes.AGENT_SIGNUP_EMAIL_REJECTED` static property

```kotlin
public const val AGENT_SIGNUP_EMAIL_REJECTED: String = "AGENT_SIGNUP_EMAIL_REJECTED"
```

The owner's email address is refused, for example for a disposable domain.

#### `ErrorCodes.AGENT_SIGNUP_NOT_READY` static property

```kotlin
public const val AGENT_SIGNUP_NOT_READY: String = "AGENT_SIGNUP_NOT_READY"
```

The signup is not approved, or its organization and project are still being provisioned. Poll agentSignup until it is ready.

#### `ErrorCodes.AGENT_SIGNUP_SUPPRESSED` static property

```kotlin
public const val AGENT_SIGNUP_SUPPRESSED: String = "AGENT_SIGNUP_SUPPRESSED"
```

The owner opted out of agent signup requests to this email address.

#### `ErrorCodes.ALREADY_CONNECTED` static property

```kotlin
public const val ALREADY_CONNECTED: String = "ALREADY_CONNECTED"
```

The participation already has an active media connection.

#### `ErrorCodes.ALREADY_EXISTS` static property

```kotlin
public const val ALREADY_EXISTS: String = "ALREADY_EXISTS"
```

A resource with the same unique key already exists.

#### `ErrorCodes.AUTHORITY_UNAVAILABLE` static property

```kotlin
public const val AUTHORITY_UNAVAILABLE: String = "AUTHORITY_UNAVAILABLE"
```

The authority is temporarily unavailable. Retry with the same requestId.

#### `ErrorCodes.BILLING_CATALOG_CONFLICT` static property

```kotlin
public const val BILLING_CATALOG_CONFLICT: String = "BILLING_CATALOG_CONFLICT"
```

The billing provider's catalog conflicts with the configured price book, for example a duplicated or unsafe object. An operator must resolve it.

#### `ErrorCodes.BILLING_CATALOG_NOT_SYNCED` static property

```kotlin
public const val BILLING_CATALOG_NOT_SYNCED: String = "BILLING_CATALOG_NOT_SYNCED"
```

The billing provider's catalog does not match the configured price book yet. An operator must sync it.

#### `ErrorCodes.BILLING_CUSTOMER_MISSING` static property

```kotlin
public const val BILLING_CUSTOMER_MISSING: String = "BILLING_CUSTOMER_MISSING"
```

The organization has no billing account yet. Start a checkout first.

#### `ErrorCodes.BILLING_LINK_EXPIRED` static property

```kotlin
public const val BILLING_LINK_EXPIRED: String = "BILLING_LINK_EXPIRED"
```

The billing link of this request is no longer valid. Send a new request with a new requestId.

#### `ErrorCodes.BILLING_NOT_CONFIGURED` static property

```kotlin
public const val BILLING_NOT_CONFIGURED: String = "BILLING_NOT_CONFIGURED"
```

Billing is not configured in this environment.

#### `ErrorCodes.BILLING_PLAN_UNAVAILABLE` static property

```kotlin
public const val BILLING_PLAN_UNAVAILABLE: String = "BILLING_PLAN_UNAVAILABLE"
```

The plan is not offered for self-service checkout.

#### `ErrorCodes.BILLING_PROVIDER_CHANGED` static property

```kotlin
public const val BILLING_PROVIDER_CHANGED: String = "BILLING_PROVIDER_CHANGED"
```

The organization's billing account belongs to a different billing provider.

#### `ErrorCodes.BILLING_PROVIDER_REJECTED` static property

```kotlin
public const val BILLING_PROVIDER_REJECTED: String = "BILLING_PROVIDER_REJECTED"
```

The billing provider refused the request.

#### `ErrorCodes.BILLING_SUBSCRIPTION_ACTIVE` static property

```kotlin
public const val BILLING_SUBSCRIPTION_ACTIVE: String = "BILLING_SUBSCRIPTION_ACTIVE"
```

The organization already has a subscription. Change it in the billing portal.

#### `ErrorCodes.BILLING_SUSPENDED` static property

```kotlin
public const val BILLING_SUSPENDED: String = "BILLING_SUSPENDED"
```

The organization is suspended for an unpaid balance. Update its payment method in the billing portal.

#### `ErrorCodes.CREDENTIAL_DELIVERY_EXPIRED` static property

```kotlin
public const val CREDENTIAL_DELIVERY_EXPIRED: String = "CREDENTIAL_DELIVERY_EXPIRED"
```

The credential delivery expired or can no longer be redeemed.

#### `ErrorCodes.CREDENTIAL_EXPIRED` static property

```kotlin
public const val CREDENTIAL_EXPIRED: String = "CREDENTIAL_EXPIRED"
```

The credential carried by the stored result has expired. Request a new one.

#### `ErrorCodes.CREDENTIAL_REFRESH_REQUIRED` static property

```kotlin
public const val CREDENTIAL_REFRESH_REQUIRED: String = "CREDENTIAL_REFRESH_REQUIRED"
```

The media credential must be refreshed before connecting.

#### `ErrorCodes.CREDENTIAL_REQUIRED` static property

```kotlin
public const val CREDENTIAL_REQUIRED: String = "CREDENTIAL_REQUIRED"
```

Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly.

#### `ErrorCodes.CREDITS_EXHAUSTED` static property

```kotlin
public const val CREDITS_EXHAUSTED: String = "CREDITS_EXHAUSTED"
```

Prepaid credits are spent and the monthly spend cap is zero, so billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap.

#### `ErrorCodes.CREDITS_REQUIRE_METERED_PLAN` static property

```kotlin
public const val CREDITS_REQUIRE_METERED_PLAN: String = "CREDITS_REQUIRE_METERED_PLAN"
```

Credits apply only to a billed subscription, and none is in force.

#### `ErrorCodes.CREDIT_AMOUNT_OUT_OF_RANGE` static property

```kotlin
public const val CREDIT_AMOUNT_OUT_OF_RANGE: String = "CREDIT_AMOUNT_OUT_OF_RANGE"
```

The credit amount is outside the allowed purchase range.

#### `ErrorCodes.CREDIT_GRANT_LIMIT_REACHED` static property

```kotlin
public const val CREDIT_GRANT_LIMIT_REACHED: String = "CREDIT_GRANT_LIMIT_REACHED"
```

Too many of the organization's credit grants are unconsumed, counting purchases still in progress. Buy more after invoices consume some.

#### `ErrorCodes.CURSOR_AHEAD` static property

```kotlin
public const val CURSOR_AHEAD: String = "CURSOR_AHEAD"
```

The cursor is ahead of the committed events of the conversation.

#### `ErrorCodes.CURSOR_EXPIRED` static property

```kotlin
public const val CURSOR_EXPIRED: String = "CURSOR_EXPIRED"
```

The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently.

#### `ErrorCodes.CURSOR_INVALID` static property

```kotlin
public const val CURSOR_INVALID: String = "CURSOR_INVALID"
```

The cursor is malformed or was not issued for this query.

#### `ErrorCodes.CURSOR_MISMATCH` static property

```kotlin
public const val CURSOR_MISMATCH: String = "CURSOR_MISMATCH"
```

The cursor does not continue the subscribed stream.

#### `ErrorCodes.CURSOR_SCOPE_MISMATCH` static property

```kotlin
public const val CURSOR_SCOPE_MISMATCH: String = "CURSOR_SCOPE_MISMATCH"
```

The cursor was issued for a different scope, caller or visibility.

#### `ErrorCodes.DELIVERY_CONSUMED` static property

```kotlin
public const val DELIVERY_CONSUMED: String = "DELIVERY_CONSUMED"
```

The delivery was already redeemed by a different request.

#### `ErrorCodes.DELIVERY_NOT_REDEEMED` static property

```kotlin
public const val DELIVERY_NOT_REDEEMED: String = "DELIVERY_NOT_REDEEMED"
```

The delivery must be redeemed before it can be acknowledged.

#### `ErrorCodes.DEPLOYMENT_NOT_READY` static property

```kotlin
public const val DEPLOYMENT_NOT_READY: String = "DEPLOYMENT_NOT_READY"
```

The deployment cannot host projects yet.

#### `ErrorCodes.FEATURE_UNSUPPORTED` static property

```kotlin
public const val FEATURE_UNSUPPORTED: String = "FEATURE_UNSUPPORTED"
```

The feature is not available in this deployment.

#### `ErrorCodes.FORBIDDEN` static property

```kotlin
public const val FORBIDDEN: String = "FORBIDDEN"
```

The credential is valid but not allowed to perform this operation.

#### `ErrorCodes.GENERATION_CONFLICT` static property

```kotlin
public const val GENERATION_CONFLICT: String = "GENERATION_CONFLICT"
```

The live session generation changed. Read the current generation and retry.

#### `ErrorCodes.GRAPHQL_ERROR` static property

```kotlin
public const val GRAPHQL_ERROR: String = "GRAPHQL_ERROR"
```

A GraphQL error arrived without a recognized code.

#### `ErrorCodes.GRAPHQL_INVALID_REQUEST` static property

```kotlin
public const val GRAPHQL_INVALID_REQUEST: String = "GRAPHQL_INVALID_REQUEST"
```

The GraphQL request is malformed or fails validation.

#### `ErrorCodes.GRAPHQL_QUERY_LIMIT` static property

```kotlin
public const val GRAPHQL_QUERY_LIMIT: String = "GRAPHQL_QUERY_LIMIT"
```

The GraphQL document exceeds a depth, complexity or size limit.

#### `ErrorCodes.GRAPHQL_RESPONSE_LIMIT` static property

```kotlin
public const val GRAPHQL_RESPONSE_LIMIT: String = "GRAPHQL_RESPONSE_LIMIT"
```

The query response exceeds the response limit. Request a smaller page.

#### `ErrorCodes.HTTP_FAILURE` static property

```kotlin
public const val HTTP_FAILURE: String = "HTTP_FAILURE"
```

The HTTP exchange failed without a usable GraphQL error.

#### `ErrorCodes.IDEMPOTENCY_CONFLICT` static property

```kotlin
public const val IDEMPOTENCY_CONFLICT: String = "IDEMPOTENCY_CONFLICT"
```

The requestId was already used with a different payload or caller.

#### `ErrorCodes.INCARNATION_MISMATCH` static property

```kotlin
public const val INCARNATION_MISMATCH: String = "INCARNATION_MISMATCH"
```

The project incarnation changed. Discard state from the old incarnation and recover explicitly.

#### `ErrorCodes.INVALID_REPLACEMENT` static property

```kotlin
public const val INVALID_REPLACEMENT: String = "INVALID_REPLACEMENT"
```

The connection to replace is not a current connection of this participation.

#### `ErrorCodes.INVALID_REQUEST` static property

```kotlin
public const val INVALID_REQUEST: String = "INVALID_REQUEST"
```

The input or request context failed validation.

#### `ErrorCodes.INVALID_RESPONSE` static property

```kotlin
public const val INVALID_RESPONSE: String = "INVALID_RESPONSE"
```

The response did not match the expected shape or identity. The outcome is unknown.

#### `ErrorCodes.LIVE_ALERT_LIMIT` static property

```kotlin
public const val LIVE_ALERT_LIMIT: String = "LIVE_ALERT_LIMIT"
```

The live session reached its alert limit.

#### `ErrorCodes.LIVE_SESSION_CLOSED` static property

```kotlin
public const val LIVE_SESSION_CLOSED: String = "LIVE_SESSION_CLOSED"
```

The live session has ended or is ending.

#### `ErrorCodes.LIVE_SESSION_EXISTS` static property

```kotlin
public const val LIVE_SESSION_EXISTS: String = "LIVE_SESSION_EXISTS"
```

The conversation already has an active live session.

#### `ErrorCodes.MEDIA_CONNECT_FAILED` static property

```kotlin
public const val MEDIA_CONNECT_FAILED: String = "MEDIA_CONNECT_FAILED"
```

The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly.

#### `ErrorCodes.MEDIA_FENCE_REQUIRED` static property

```kotlin
public const val MEDIA_FENCE_REQUIRED: String = "MEDIA_FENCE_REQUIRED"
```

Media cutoff is not enforced yet for this live session. Retry after the cutoff completes.

#### `ErrorCodes.MEDIA_NOT_READY` static property

```kotlin
public const val MEDIA_NOT_READY: String = "MEDIA_NOT_READY"
```

Media for the live session is not ready yet.

#### `ErrorCodes.MEDIA_RECOVERING` static property

```kotlin
public const val MEDIA_RECOVERING: String = "MEDIA_RECOVERING"
```

Media for the live session is recovering.

#### `ErrorCodes.MEMBERSHIP_COUNT_INVALID` static property

```kotlin
public const val MEMBERSHIP_COUNT_INVALID: String = "MEMBERSHIP_COUNT_INVALID"
```

Membership accounting needs operator reconciliation.

#### `ErrorCodes.MEMBER_LIMIT` static property

```kotlin
public const val MEMBER_LIMIT: String = "MEMBER_LIMIT"
```

The conversation reached its member limit.

#### `ErrorCodes.MESSAGE_DELETED` static property

```kotlin
public const val MESSAGE_DELETED: String = "MESSAGE_DELETED"
```

The message was deleted.

#### `ErrorCodes.NOT_A_SESSION_REQUEST` static property

```kotlin
public const val NOT_A_SESSION_REQUEST: String = "NOT_A_SESSION_REQUEST"
```

The requestId does not belong to an issueSession or renewSession request.

#### `ErrorCodes.NOT_FOUND` static property

```kotlin
public const val NOT_FOUND: String = "NOT_FOUND"
```

The resource does not exist or is not visible to the caller.

#### `ErrorCodes.OUTCOME_UNKNOWN` static property

```kotlin
public const val OUTCOME_UNKNOWN: String = "OUTCOME_UNKNOWN"
```

The mutation may have committed. Retry with the same requestId or resolve it.

#### `ErrorCodes.PAGE_ITEM_TOO_LARGE` static property

```kotlin
public const val PAGE_ITEM_TOO_LARGE: String = "PAGE_ITEM_TOO_LARGE"
```

A single item exceeds the page response limit.

#### `ErrorCodes.PARTICIPATION_MISMATCH` static property

```kotlin
public const val PARTICIPATION_MISMATCH: String = "PARTICIPATION_MISMATCH"
```

The participation does not belong to the caller or the current live session generation.

#### `ErrorCodes.PAYMENT_DECLINED` static property

```kotlin
public const val PAYMENT_DECLINED: String = "PAYMENT_DECLINED"
```

The payment rail declined the payment. Nothing was charged.

#### `ErrorCodes.PAYMENT_RAIL_NOT_CONFIGURED` static property

```kotlin
public const val PAYMENT_RAIL_NOT_CONFIGURED: String = "PAYMENT_RAIL_NOT_CONFIGURED"
```

No payment rail is enabled in this environment.

#### `ErrorCodes.PERMIT_EXPIRED` static property

```kotlin
public const val PERMIT_EXPIRED: String = "PERMIT_EXPIRED"
```

The stored delivery permit has expired. Request a new permit.

#### `ErrorCodes.PLAN_LIMIT_EXCEEDED` static property

```kotlin
public const val PLAN_LIMIT_EXCEEDED: String = "PLAN_LIMIT_EXCEEDED"
```

The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again.

#### `ErrorCodes.QUOTA_EXCEEDED` static property

```kotlin
public const val QUOTA_EXCEEDED: String = "QUOTA_EXCEEDED"
```

A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues.

#### `ErrorCodes.RATE_LIMITED` static property

```kotlin
public const val RATE_LIMITED: String = "RATE_LIMITED"
```

A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId.

#### `ErrorCodes.RECOVERY_LIMIT` static property

```kotlin
public const val RECOVERY_LIMIT: String = "RECOVERY_LIMIT"
```

The SDK's recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again.

#### `ErrorCodes.RECOVERY_STORAGE_FAILURE` static property

```kotlin
public const val RECOVERY_STORAGE_FAILURE: String = "RECOVERY_STORAGE_FAILURE"
```

Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome.

#### `ErrorCodes.REQUEST_EXPIRED` static property

```kotlin
public const val REQUEST_EXPIRED: String = "REQUEST_EXPIRED"
```

The original request is too old to replay.

#### `ErrorCodes.REQUEST_TOO_LARGE` static property

```kotlin
public const val REQUEST_TOO_LARGE: String = "REQUEST_TOO_LARGE"
```

The request body exceeds the size limit.

#### `ErrorCodes.RESOLUTION_REQUIRED` static property

```kotlin
public const val RESOLUTION_REQUIRED: String = "RESOLUTION_REQUIRED"
```

The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing.

#### `ErrorCodes.RESPONSE_TOO_LARGE` static property

```kotlin
public const val RESPONSE_TOO_LARGE: String = "RESPONSE_TOO_LARGE"
```

The response exceeds the size limit.

#### `ErrorCodes.RESYNC_REQUIRED` static property

```kotlin
public const val RESYNC_REQUIRED: String = "RESYNC_REQUIRED"
```

The subscription cannot continue. Replay from the last applied cursor.

#### `ErrorCodes.RETRY_EXHAUSTED` static property

```kotlin
public const val RETRY_EXHAUSTED: String = "RETRY_EXHAUSTED"
```

The authority exhausted its internal retry budget. Retry later with the same requestId.

#### `ErrorCodes.REVISION_CONFLICT` static property

```kotlin
public const val REVISION_CONFLICT: String = "REVISION_CONFLICT"
```

The expected revision or epoch is stale. Read the current state and retry with a new request.

#### `ErrorCodes.SCOPE_REQUIRED` static property

```kotlin
public const val SCOPE_REQUIRED: String = "SCOPE_REQUIRED"
```

The backend key lacks a scope this operation requires. The message names the scope.

#### `ErrorCodes.SESSION_RECEIPT_BINDING_MISMATCH` static property

```kotlin
public const val SESSION_RECEIPT_BINDING_MISMATCH: String = "SESSION_RECEIPT_BINDING_MISMATCH"
```

The stored session receipt does not match its binding.

#### `ErrorCodes.SESSION_RECEIPT_INVALID` static property

```kotlin
public const val SESSION_RECEIPT_INVALID: String = "SESSION_RECEIPT_INVALID"
```

The stored session receipt failed validation.

#### `ErrorCodes.SESSION_REFRESH_FAILED` static property

```kotlin
public const val SESSION_REFRESH_FAILED: String = "SESSION_REFRESH_FAILED"
```

The application session refresh callback failed.

#### `ErrorCodes.SESSION_REFRESH_REJECTED` static property

```kotlin
public const val SESSION_REFRESH_REJECTED: String = "SESSION_REFRESH_REJECTED"
```

The refreshed session was rejected because it does not match the current session.

#### `ErrorCodes.SESSION_REFRESH_REQUIRED` static property

```kotlin
public const val SESSION_REFRESH_REQUIRED: String = "SESSION_REFRESH_REQUIRED"
```

The user session needs renewal and no refresh is configured, or it expired.

#### `ErrorCodes.SESSION_REFRESH_UNVERIFIED` static property

```kotlin
public const val SESSION_REFRESH_UNVERIFIED: String = "SESSION_REFRESH_UNVERIFIED"
```

The refreshed session could not be verified.

#### `ErrorCodes.SPEND_CAP_REACHED` static property

```kotlin
public const val SPEND_CAP_REACHED: String = "SPEND_CAP_REACHED"
```

The spend month's usage charges reached the charge limit that the organization's prepaid credits and monthly spend cap set, less a safety margin. Billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap.

#### `ErrorCodes.SPEND_UNVERIFIED` static property

```kotlin
public const val SPEND_UNVERIFIED: String = "SPEND_UNVERIFIED"
```

Current spend cannot be verified, so billable usage beyond the plan's allowances fails closed before any effect (WebSocket close 4503). extensions.meter names the meter and extensions.periodEnd ends the spend month; extensions.retryAfter (HTTP Retry-After) counts the seconds before the same request may succeed.

#### `ErrorCodes.TRANSPORT_UNKNOWN` static property

```kotlin
public const val TRANSPORT_UNKNOWN: String = "TRANSPORT_UNKNOWN"
```

The transport failed after the request may have been sent. Resolve or retry the original request.

#### `ErrorCodes.UNAUTHENTICATED` static property

```kotlin
public const val UNAUTHENTICATED: String = "UNAUTHENTICATED"
```

The credential is missing, invalid or expired.

#### `ErrorCodes.WEBHOOK_DESTINATION_DENIED` static property

```kotlin
public const val WEBHOOK_DESTINATION_DENIED: String = "WEBHOOK_DESTINATION_DENIED"
```

The webhook URL is not a public HTTPS destination.

#### `ErrorCodes.WEBHOOK_ENDPOINT_DISABLED` static property

```kotlin
public const val WEBHOOK_ENDPOINT_DISABLED: String = "WEBHOOK_ENDPOINT_DISABLED"
```

The webhook endpoint is disabled. Enable it, then replay its deliveries.

#### `ErrorCodes.WEBHOOK_ENDPOINT_LIMIT` static property

```kotlin
public const val WEBHOOK_ENDPOINT_LIMIT: String = "WEBHOOK_ENDPOINT_LIMIT"
```

The project reached its webhook endpoint limit.

#### `ErrorCodes.WEBHOOK_ROTATION_PENDING` static property

```kotlin
public const val WEBHOOK_ROTATION_PENDING: String = "WEBHOOK_ROTATION_PENDING"
```

A signing-secret rotation is already waiting for acknowledgement.

#### `ErrorCodes.WEBHOOK_SECRET_UNACKNOWLEDGED` static property

```kotlin
public const val WEBHOOK_SECRET_UNACKNOWLEDGED: String = "WEBHOOK_SECRET_UNACKNOWLEDGED"
```

The endpoint's signing secret has not been acknowledged yet.

#### `ErrorCodes.WRONG_REGION` static property

```kotlin
public const val WRONG_REGION: String = "WRONG_REGION"
```

The observed serving epoch is stale. Route again, then retry.

#### `ErrorCodes.catalog` static property

```kotlin
public val catalog: Map<String, ErrorCodeInfo>
```

Every listed code, keyed by code.

### `HttpRequest` class

```kotlin
public class HttpRequest
```

One authority POST. Implementations must not follow redirects or cache.

Package: `com.convohop.android.core`.

#### `HttpRequest` constructor

```kotlin
public constructor(
    url: String,
    headers: Map<String, String>,
    body: String,
    timeoutMillis: Long,
    maxResponseBytes: Long,
)
```

#### `HttpRequest.url` property

```kotlin
public val url: String
```

#### `HttpRequest.headers` property

```kotlin
public val headers: Map<String, String>
```

#### `HttpRequest.body` property

```kotlin
public val body: String
```

#### `HttpRequest.timeoutMillis` property

```kotlin
public val timeoutMillis: Long
```

The whole exchange, including reading the body, must finish within this time.

#### `HttpRequest.maxResponseBytes` property

```kotlin
public val maxResponseBytes: Long
```

Stop reading once the body is longer than this; `HttpResponse.text` then returns null.

### `Idempotency` class

```kotlin
public object Idempotency
```

Idempotency classes and their retry budgets.

Package: `com.convohop.android.generated`.

#### `Idempotency.ephemeral` static property

```kotlin
public val ephemeral: IdempotencyClass
```

Transient signal. Not deduplicated or retried; send a fresh signal instead.

#### `Idempotency.idempotent` static property

```kotlin
public val idempotent: IdempotencyClass
```

Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.

#### `Idempotency.permitBound` static property

```kotlin
public val permitBound: IdempotencyClass
```

Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.

#### `Idempotency.replayOnly` static property

```kotlin
public val replayOnly: IdempotencyClass
```

Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.

#### `Idempotency.safe` static property

```kotlin
public val safe: IdempotencyClass
```

Read-only. Repeat freely; each attempt may use a new requestId.

#### `Idempotency.singleUse` static property

```kotlin
public val singleUse: IdempotencyClass
```

Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.

#### `Idempotency.byName` static property

```kotlin
public val byName: Map<String, IdempotencyClass>
```

Every class, keyed by name.

### `IdempotencyClass` class

```kotlin
public class IdempotencyClass
```

Retry rules for one idempotency class.

Package: `com.convohop.android.generated`.

#### `IdempotencyClass.name` property

```kotlin
public val name: String
```

#### `IdempotencyClass.retry` property

```kotlin
public val retry: String
```

`none`, `sameRequest` or `repeat`.

#### `IdempotencyClass.resolvable` property

```kotlin
public val resolvable: Boolean
```

Whether resolveRequest can settle an unknown outcome.

#### `IdempotencyClass.maxAttempts` property

```kotlin
public val maxAttempts: Int?
```

Attempts allowed for one requestId, when retries reuse it.

#### `IdempotencyClass.windowMs` property

```kotlin
public val windowMs: Long?
```

How long retries may reuse one requestId, when they do.

### `LiveAction` class

```kotlin
public abstract class LiveAction
```

An accepted start or end request. The authority completes it
asynchronously; poll it with `get` or wait with `completed`.

Package: `com.convohop.android.core`.

#### `LiveAction.client` property

```kotlin
public val client: ConvoHopClient
```

#### `LiveAction.operationId` property

```kotlin
public val operationId: String
```

#### `LiveAction.liveSessionId` property

```kotlin
public val liveSessionId: String
```

#### `LiveAction.kind` property

```kotlin
public val kind: LiveOperationKind
```

#### `LiveAction.requestId` property

```kotlin
public val requestId: String
```

The original request ID; reuse it to resolve or resend this exact request.

#### `LiveAction.get` method

```kotlin
public suspend fun get(): LiveSessionOperation
```

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `LiveAction.completed` method

```kotlin
public suspend fun completed(timeoutMillis: Long = 45_000): LiveSessionOperationCompletion
```

Polls until the action completes, fails or `timeoutMillis` (1 to 300000)
elapses. Cancel the calling coroutine to stop early. A timeout means the
outcome is still unknown, not that it failed.

Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

### `LiveEndOperation` class

```kotlin
public class LiveEndOperation : LiveAction
```

Package: `com.convohop.android.core`.

#### `LiveEndOperation.receipt` property

```kotlin
public val receipt: EndLiveSessionPayload
```

#### `LiveEndOperation.client` property

```kotlin
public val client: ConvoHopClient
```

Inherited from `LiveAction`.

#### `LiveEndOperation.operationId` property

```kotlin
public val operationId: String
```

Inherited from `LiveAction`.

#### `LiveEndOperation.liveSessionId` property

```kotlin
public val liveSessionId: String
```

Inherited from `LiveAction`.

#### `LiveEndOperation.kind` property

```kotlin
public val kind: LiveOperationKind
```

Inherited from `LiveAction`.

#### `LiveEndOperation.requestId` property

```kotlin
public val requestId: String
```

The original request ID; reuse it to resolve or resend this exact request.

Inherited from `LiveAction`.

#### `LiveEndOperation.get` method

```kotlin
public suspend fun get(): LiveSessionOperation
```

Inherited from `LiveAction`.

#### `LiveEndOperation.completed` method

```kotlin
public suspend fun completed(timeoutMillis: Long = 45_000): LiveSessionOperationCompletion
```

Polls until the action completes, fails or `timeoutMillis` (1 to 300000)
elapses. Cancel the calling coroutine to stop early. A timeout means the
outcome is still unknown, not that it failed.

Inherited from `LiveAction`.

### `LiveParticipationHandle` class

```kotlin
public class LiveParticipationHandle
```

This user's participation in one live session: its native media connection
and leave. While the app keeps a handle, the recovery journal keeps the
records of the leave and credential requests it holds, even once final.

Package: `com.convohop.android.core`.

#### `LiveParticipationHandle.live` property

```kotlin
public val live: LiveSessionHandle
```

#### `LiveParticipationHandle.snapshot` property

```kotlin
public val snapshot: LiveParticipation
```

The participation when this handle was created; `get` reads the current one.

#### `LiveParticipationHandle.participationId` property

```kotlin
public val participationId: String
```

#### `LiveParticipationHandle.get` method

```kotlin
public suspend fun get(): LiveParticipation
```

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveParticipationHandle.connect` method

```kotlin
public suspend fun connect(media: MediaOptions, requestId: String? = null): MediaConnection
```

Connects native media with fresh single-use credentials. Concurrent
calls share one attempt; a connected participation returns its
connection. Never starts capture: enable the microphone or camera on
the returned connection.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `LiveParticipationHandle.leave` method

```kotlin
public suspend fun leave(requestId: String? = null): LeaveLiveSessionPayload
```

Disconnects media and leaves. Repeated calls, including after an app
restart, reuse the original leave request.

Sends [`communication.leaveLiveSession`](../../operations/communication/leaveLiveSession.md).

### `LiveSessionHandle` class

```kotlin
public class LiveSessionHandle
```

One occurrence (generation) of a call or broadcast. While the app keeps a
handle, the recovery journal keeps the record of the end request it holds,
even once final, so a repeated `end` reuses that request.

Package: `com.convohop.android.core`.

#### `LiveSessionHandle.client` property

```kotlin
public val client: ConvoHopClient
```

#### `LiveSessionHandle.snapshot` property

```kotlin
public val snapshot: LiveSession
```

The state when this handle was created; `get` reads the current state.

#### `LiveSessionHandle.liveSessionId` property

```kotlin
public val liveSessionId: String
```

#### `LiveSessionHandle.generation` property

```kotlin
public val generation: String
```

#### `LiveSessionHandle.conversationId` property

```kotlin
public val conversationId: String
```

#### `LiveSessionHandle.alerts` property

```kotlin
public val alerts: Alerts
```

Alerts (rings) other members about this call.

##### `LiveSessionHandle.alerts.send` method

```kotlin
public suspend fun send(
    principalIds: List<String>,
    requestId: String? = null,
): AlertLiveSessionPayload
```

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `LiveSessionHandle.get` method

```kotlin
public suspend fun get(): LiveSession
```

The current state of this occurrence.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveSessionHandle.join` method

```kotlin
public suspend fun join(requestId: String? = null): LiveParticipationHandle
```

Joins with a participation reservation; connect media with `LiveParticipationHandle.connect`.

Sends [`communication.joinLiveSession`](../../operations/communication/joinLiveSession.md).

#### `LiveSessionHandle.participation` method

```kotlin
public suspend fun participation(): LiveParticipationHandle?
```

This user's current participation, if any.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveSessionHandle.participants` method

```kotlin
public suspend fun participants(limit: Int? = null, cursor: String? = null): LiveParticipantPage
```

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `LiveSessionHandle.end` method

```kotlin
public suspend fun end(requestId: String? = null): LiveEndOperation
```

Ends the occurrence for everyone. Repeated calls, including after an
app restart, reuse the original request and its expected revision.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md) and [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

### `LiveStartOperation` class

```kotlin
public class LiveStartOperation : LiveAction
```

Package: `com.convohop.android.core`.

#### `LiveStartOperation.receipt` property

```kotlin
public val receipt: StartLiveSessionPayload
```

#### `LiveStartOperation.ready` method

```kotlin
public suspend fun ready(timeoutMillis: Long = 45_000): LiveSessionHandle
```

Waits for the start to complete, then loads the live session.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md) and [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `LiveStartOperation.client` property

```kotlin
public val client: ConvoHopClient
```

Inherited from `LiveAction`.

#### `LiveStartOperation.operationId` property

```kotlin
public val operationId: String
```

Inherited from `LiveAction`.

#### `LiveStartOperation.liveSessionId` property

```kotlin
public val liveSessionId: String
```

Inherited from `LiveAction`.

#### `LiveStartOperation.kind` property

```kotlin
public val kind: LiveOperationKind
```

Inherited from `LiveAction`.

#### `LiveStartOperation.requestId` property

```kotlin
public val requestId: String
```

The original request ID; reuse it to resolve or resend this exact request.

Inherited from `LiveAction`.

#### `LiveStartOperation.get` method

```kotlin
public suspend fun get(): LiveSessionOperation
```

Inherited from `LiveAction`.

#### `LiveStartOperation.completed` method

```kotlin
public suspend fun completed(timeoutMillis: Long = 45_000): LiveSessionOperationCompletion
```

Polls until the action completes, fails or `timeoutMillis` (1 to 300000)
elapses. Cancel the calling coroutine to stop early. A timeout means the
outcome is still unknown, not that it failed.

Inherited from `LiveAction`.

### `MediaConnection` class

```kotlin
public class MediaConnection
```

A native media connection for one participation, admitted with
single-use credentials. Connecting never starts capture.

Package: `com.convohop.android.core`.

#### `MediaConnection.participation` property

```kotlin
public val participation: LiveParticipationHandle
```

#### `MediaConnection.options` property

```kotlin
public val options: MediaOptions
```

#### `MediaConnection.room` property

```kotlin
public lateinit var room: MediaRoom
    private set
```

The native room. On Android, `LiveKitMediaRoom.room` is LiveKit's `Room`, for rendering tracks.

#### `MediaConnection.nativeConnectionId` property

```kotlin
public var nativeConnectionId: String?
    private set
```

The local participant SID, which equals the participation's `nativeConnectionId`.

#### `MediaConnection.connected` property

```kotlin
public val connected: Boolean
```

#### `MediaConnection.reconnect` method

```kotlin
public suspend fun reconnect(): MediaConnection
```

Replaces a dropped connection with a new one using fresh RECONNECT
credentials. Concurrent calls share one attempt.

Sends [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `MediaConnection.microphone` method

```kotlin
public suspend fun microphone(enabled: Boolean)
```

Starts or stops publishing the microphone. Requires microphone permission.

#### `MediaConnection.camera` method

```kotlin
public suspend fun camera(enabled: Boolean)
```

Starts or stops publishing the camera. Requires camera permission.

#### `MediaConnection.disconnect` method

```kotlin
public suspend fun disconnect()
```

Leaves media for good; the participation remains until `LiveParticipationHandle.leave`.

### `MediaOptions` class

```kotlin
public class MediaOptions
```

How to connect native media.

Package: `com.convohop.android.core`.

#### `MediaOptions` constructor

```kotlin
public constructor(rooms: MediaRoomFactory, onDisconnected: (() -> Unit)? = null)
```

#### `MediaOptions.rooms` property

```kotlin
public val rooms: MediaRoomFactory
```

#### `MediaOptions.onDisconnected` property

```kotlin
public val onDisconnected: (() -> Unit)?
```

Called once when an established connection drops without a deliberate
disconnect. Call `MediaConnection.reconnect`: a full reconnect needs
fresh credentials.

### `MemoryLocalStore` class

```kotlin
public class MemoryLocalStore : LocalStore
```

A `LocalStore` that lives as long as the process.

Package: `com.convohop.android.core`.

#### `MemoryLocalStore` constructor

```kotlin
public constructor()
```

#### `MemoryLocalStore.messages` method

```kotlin
public override suspend fun messages(conversationId: String): List<Message>
```

The stored messages of `conversationId`, in any order.

#### `MemoryLocalStore.putMessages` method

```kotlin
public override suspend fun putMessages(conversationId: String, messages: List<Message>)
```

Inserts or replaces `messages` by message ID.

#### `MemoryLocalStore.removeMessages` method

```kotlin
public override suspend fun removeMessages(conversationId: String)
```

Deletes the stored messages of `conversationId`, when the cached history no longer joins the current one.

#### `MemoryLocalStore.pending` method

```kotlin
public override suspend fun pending(): List<PendingMessage>
```

Every outbox entry, in the order they were first stored.

#### `MemoryLocalStore.putPending` method

```kotlin
public override suspend fun putPending(message: PendingMessage)
```

Inserts or replaces `message` by request ID, keeping the position of an existing entry.

#### `MemoryLocalStore.removePending` method

```kotlin
public override suspend fun removePending(requestId: String)
```

#### `MemoryLocalStore.clear` method

```kotlin
public override suspend fun clear()
```

Deletes everything.

### `MemoryRecoveryStorage` class

```kotlin
public class MemoryRecoveryStorage : RecoveryStorage
```

In-memory `RecoveryStorage` for tests and short-lived clients; nothing survives the process.

Package: `com.convohop.android.core`.

#### `MemoryRecoveryStorage` constructor

```kotlin
public constructor()
```

#### `MemoryRecoveryStorage.getItem` method

```kotlin
public override suspend fun getItem(key: String): String?
```

#### `MemoryRecoveryStorage.setItem` method

```kotlin
public override suspend fun setItem(key: String, value: String)
```

#### `MemoryRecoveryStorage.removeItem` method

```kotlin
public override suspend fun removeItem(key: String)
```

### `OkHttpEngine` class

```kotlin
public class OkHttpEngine : HttpEngine
```

`HttpEngine` on OkHttp. Redirects, cookies and caches are disabled on the
client it uses, and the body is read on OkHttp's dispatcher within the
request's timeout so a slow body can't outlive it.

Every body is one-shot, so OkHttp never resends a request it has started
to send: not after a dropped response on a pooled connection, a 408 or a
503 asking for an immediate retry. The mutation ledger owns every retry
and its budget. A failed connect, before anything is sent, still falls back
to the host's other addresses.

Package: `com.convohop.android.core`.

#### `OkHttpEngine` constructor

```kotlin
public constructor(client: OkHttpClient = OkHttpClient())
```

#### `OkHttpEngine.post` method

```kotlin
public override suspend fun post(request: HttpRequest): HttpResponse
```

### `OkHttpRealtimeConnector` class

```kotlin
public class OkHttpRealtimeConnector : RealtimeConnector
```

`RealtimeConnector` on OkHttp's WebSocket client, with redirects and cookies disabled.

Package: `com.convohop.android.core`.

#### `OkHttpRealtimeConnector` constructor

```kotlin
public constructor(client: OkHttpClient = OkHttpClient())
```

#### `OkHttpRealtimeConnector.connect` method

```kotlin
public override fun connect(
    url: String,
    subprotocol: String,
    listener: RealtimeListener,
): RealtimeSocket
```

### `OperationDescriptor` class

```kotlin
public class OperationDescriptor
```

What the runtime needs to send one operation, as listed in schema/operations.json.

Package: `com.convohop.android.generated`.

#### `OperationDescriptor.id` property

```kotlin
public val id: String
```

`<plane>.<field>`.

#### `OperationDescriptor.plane` property

```kotlin
public val plane: String
```

#### `OperationDescriptor.kind` property

```kotlin
public val kind: String
```

`query`, `mutation` or `subscription`.

#### `OperationDescriptor.field` property

```kotlin
public val field: String
```

#### `OperationDescriptor.operationName` property

```kotlin
public val operationName: String
```

#### `OperationDescriptor.document` property

```kotlin
public val document: String
```

#### `OperationDescriptor.resultType` property

```kotlin
public val resultType: String
```

The result type in GraphQL syntax.

#### `OperationDescriptor.contextArgument` property

```kotlin
public val contextArgument: String
```

#### `OperationDescriptor.contextFields` property

```kotlin
public val contextFields: Map<String, String>
```

How the operation uses each context field: `required`, `optional` or `forbidden`.

#### `OperationDescriptor.inputArgument` property

```kotlin
public val inputArgument: String?
```

#### `OperationDescriptor.inputType` property

```kotlin
public val inputType: String?
```

#### `OperationDescriptor.inputRequired` property

```kotlin
public val inputRequired: Boolean
```

#### `OperationDescriptor.inputFields` property

```kotlin
public val inputFields: List<String>
```

#### `OperationDescriptor.idempotency` property

```kotlin
public val idempotency: String
```

The idempotency class; see `Idempotency`.

#### `OperationDescriptor.layer` property

```kotlin
public val layer: String
```

`client` or `both`.

#### `OperationDescriptor.realtimeChannel` property

```kotlin
public val realtimeChannel: String?
```

The realtime channel a subscription feeds.

### `OperationSpec` class

```kotlin
public class OperationSpec<I, R>
```

A typed operation: its descriptor, input encoder and result decoder.

Package: `com.convohop.android.generated`.

#### `OperationSpec.descriptor` property

```kotlin
public val descriptor: OperationDescriptor
```

#### `OperationSpec.encodeInput` method

```kotlin
public fun encodeInput(input: I): JsonObject?
```

The input variable, or null when the operation takes none.

#### `OperationSpec.decodeResult` method

```kotlin
public fun decodeResult(element: JsonElement, path: String = descriptor.field): R
```

Decodes `data.<field>`, throwing `ShapeException` when it does not match.

### `Operations` class

```kotlin
public object Operations
```

The client operations, grouped by plane.

Package: `com.convohop.android.generated`.

#### `Operations.all` static property

```kotlin
public val all: List<OperationSpec<*, *>>
```

Every client operation, in schema order.

#### `Operations.byId` static property

```kotlin
public val byId: Map<String, OperationSpec<*, *>>
```

`all`, keyed by operation id.

### `Operations.Communication` class

```kotlin
public object Communication
```

Client operations of the communication plane.

Package: `com.convohop.android.generated`.

#### `Operations.Communication.capabilities` static property

```kotlin
public val capabilities: OperationSpec<Unit, CapabilitiesReply>
```

Describe the features, limits and API model the authority supports.

#### `Operations.Communication.route` static property

```kotlin
public val route: OperationSpec<Unit, RouteReply>
```

Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.

#### `Operations.Communication.currentSession` static property

```kotlin
public val currentSession: OperationSpec<Unit, CurrentSessionReply>
```

Return the calling user session.

#### `Operations.Communication.getConversation` static property

```kotlin
public val getConversation: OperationSpec<GetConversationRequestInput, GetConversationReply>
```

Read a conversation.

#### `Operations.Communication.members` static property

```kotlin
public val members: OperationSpec<MembersRequestInput, MembersReply>
```

List the members of a conversation.

#### `Operations.Communication.messages` static property

```kotlin
public val messages: OperationSpec<MessagesRequestInput, MessagesReply>
```

List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.

#### `Operations.Communication.getMessage` static property

```kotlin
public val getMessage: OperationSpec<GetMessageRequestInput, GetMessageReply>
```

Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.

#### `Operations.Communication.events` static property

```kotlin
public val events: OperationSpec<EventsRequestInput, EventsReply>
```

Replay committed conversation events after a cursor, in sequence order.

#### `Operations.Communication.receipts` static property

```kotlin
public val receipts: OperationSpec<ReceiptsRequestInput, ReceiptsReply>
```

List the delivery and read receipts of a conversation.

#### `Operations.Communication.inbox` static property

```kotlin
public val inbox: OperationSpec<InboxRequestInput, InboxReply>
```

List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.

#### `Operations.Communication.search` static property

```kotlin
public val search: OperationSpec<SearchRequestInput, SearchReply>
```

Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.

#### `Operations.Communication.resolveRequest` static property

```kotlin
public val resolveRequest: OperationSpec<ResolveRequestRequestInput, ResolveRequestReply>
```

Look up the stored outcome of an earlier communication mutation by its requestId.

#### `Operations.Communication.getOperation` static property

```kotlin
public val getOperation: OperationSpec<GetOperationRequestInput, GetOperationReply>
```

Read the state of a long-running communication operation.

#### `Operations.Communication.conversationMute` static property

```kotlin
public val conversationMute: OperationSpec<ConversationMuteInput, ConversationMuteReply>
```

Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.

#### `Operations.Communication.currentLiveSession` static property

```kotlin
public val currentLiveSession: OperationSpec<ConversationLiveInput, CurrentLiveSessionReply>
```

Return the active live session of a conversation, if any.

#### `Operations.Communication.liveSession` static property

```kotlin
public val liveSession: OperationSpec<LiveSessionInput, LiveSessionReply>
```

Read a live session.

#### `Operations.Communication.liveSessions` static property

```kotlin
public val liveSessions: OperationSpec<LiveSessionsInput, LiveSessionPageReply>
```

List the live sessions of a conversation.

#### `Operations.Communication.liveSessionParticipants` static property

```kotlin
public val liveSessionParticipants: OperationSpec<LiveParticipantsInput, LiveParticipantPageReply>
```

List the participants of a live session.

#### `Operations.Communication.liveSessionAlerts` static property

```kotlin
public val liveSessionAlerts: OperationSpec<LiveAlertsInput, LiveAlertPageReply>
```

List the live session alerts addressed to the calling user.

#### `Operations.Communication.liveSessionOperation` static property

```kotlin
public val liveSessionOperation: OperationSpec<LiveSessionOperationInput, LiveSessionOperationReply>
```

Read the state of a live session start or end operation.

#### `Operations.Communication.revokeSession` static property

```kotlin
public val revokeSession: OperationSpec<RevokeSessionRequestInput, RevokeSessionReply>
```

Revoke a user session.

#### `Operations.Communication.updateConversation` static property

```kotlin
public val updateConversation: OperationSpec<UpdateConversationRequestInput, UpdateConversationReply>
```

Update the title or properties of a conversation.

#### `Operations.Communication.sendMessage` static property

```kotlin
public val sendMessage: OperationSpec<SendMessageRequestInput, SendMessageReply>
```

Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.

#### `Operations.Communication.editMessage` static property

```kotlin
public val editMessage: OperationSpec<EditMessageRequestInput, EditMessageReply>
```

Edit a message.

#### `Operations.Communication.deleteMessage` static property

```kotlin
public val deleteMessage: OperationSpec<DeleteMessageRequestInput, DeleteMessageReply>
```

Delete a message.

#### `Operations.Communication.reportReceipt` static property

```kotlin
public val reportReceipt: OperationSpec<ReportReceiptRequestInput, ReportReceiptReply>
```

Report delivery or read progress through a sequence.

#### `Operations.Communication.typing` static property

```kotlin
public val typing: OperationSpec<TypingRequestInput, TypingReply>
```

Send an ephemeral typing signal.

#### `Operations.Communication.setConversationMute` static property

```kotlin
public val setConversationMute: OperationSpec<SetConversationMuteInput, SetConversationMutePayload>
```

Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.

#### `Operations.Communication.startLiveSession` static property

```kotlin
public val startLiveSession: OperationSpec<StartLiveSessionInput, StartLiveSessionPayload>
```

Start a live session (a call) in a conversation. Readiness completes asynchronously.

#### `Operations.Communication.joinLiveSession` static property

```kotlin
public val joinLiveSession: OperationSpec<JoinLiveSessionInput, JoinLiveSessionPayload>
```

Join a live session.

#### `Operations.Communication.alertLiveSession` static property

```kotlin
public val alertLiveSession: OperationSpec<AlertLiveSessionInput, AlertLiveSessionPayload>
```

Alert (ring) conversation members about a live session.

#### `Operations.Communication.leaveLiveSession` static property

```kotlin
public val leaveLiveSession: OperationSpec<LeaveLiveSessionInput, LeaveLiveSessionPayload>
```

Leave a live session.

#### `Operations.Communication.endLiveSession` static property

```kotlin
public val endLiveSession: OperationSpec<EndLiveSessionInput, EndLiveSessionPayload>
```

End a live session for every participant. Completes asynchronously.

#### `Operations.Communication.liveSessionCredentials` static property

```kotlin
public val liveSessionCredentials: OperationSpec<LiveSessionCredentialsInput, LiveSessionCredentialsPayload>
```

Obtain a media credential for one connection of the caller's participation.

#### `Operations.Communication.conversationEvents` static property

```kotlin
public val conversationEvents: OperationSpec<EventsRequestInput, EventPage>
```

Subscribe to conversation events in sequence order, resuming after a cursor.

### `Outbox` class

```kotlin
public class Outbox
```

Sends messages optimistically: `send` stores the message, shows it in
`pending` at once and delivers it when `ConvoHopStore.online` allows,
oldest first within each conversation.

Every attempt for a message reuses its request ID, payload and the
client's retry budget, so the authority applies it at most once. When the
outcome stays unknown after the budget, the outbox resolves the request
read-only and reports `PendingState.UNCONFIRMED` instead of guessing; it
never resends under a new ID on its own. `sendAgain` does that only when
the app asks.

A message becomes `PendingState.SENDING` only after the client has saved
its request's recovery record, just before each attempt, so a process
that ends mid-send leaves either that record or a message never sent.
On the next start, a message with a record is resent under the same
request ID while its budget lasts, then resolved read-only; one that was
never submitted becomes `PendingState.FAILED` with `RESOLUTION_REQUIRED`.
Without durable recovery storage, a SENDING message can only be resolved.

When the authority refuses the session, the outbox holds every send and
tries again only on `drain`, so new sends do not spend the held message's
retry budget. A refused attempt was not applied: the message stays
`PendingState.QUEUED` with the refusal in `PendingMessage.errorCode`. If
the hold outlasts the budget (three attempts, or 60 seconds from the
first), the message is resolved read-only; one the authority never applied
becomes `PendingState.FAILED`.

A refusal that a retry can't change, such as `QUOTA_EXCEEDED`,
`PLAN_LIMIT_EXCEEDED` or `SCOPE_REQUIRED`, fails the message at once and
goes to the error callback. Other failures wait and try again with backoff,
never sooner than the authority's `retryAfter`, not even on `drain`: an
unknown outcome, a network failure, a 408, 429 or 5xx with a retryable
code, and `RECOVERY_LIMIT`, after which the message stays queued until the
recovery journal has room. After `WRONG_REGION` the client routes again
first. The outbox keeps the recovery records of the messages it may still
resend or resolve from being evicted.

Package: `com.convohop.android.core`.

#### `Outbox.pending` property

```kotlin
public val pending: StateFlow<List<PendingMessage>>
```

Messages not yet confirmed into a timeline, in the order they were sent.

#### `Outbox.send` method

```kotlin
public suspend fun send(
    conversationId: String,
    text: String,
    props: JsonObject = NO_PROPS,
): PendingMessage
```

Queues `text` for `conversationId` and returns the stored entry at once.
Keep its request ID to follow it in `pending`.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `Outbox.sendAgain` method

```kotlin
public suspend fun sendAgain(requestId: String): PendingMessage
```

Queues a `PendingState.FAILED` or `PendingState.UNCONFIRMED` message
again under a new request ID, after the conversation's other queued
messages. An unconfirmed original may still commit, so the message can
then appear twice; ask the user before calling this for one.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `Outbox.discard` method

```kotlin
public suspend fun discard(requestId: String)
```

Removes a message from the outbox. A `PendingState.SENDING` message
cannot be discarded because its outcome is unknown; discarding an
unconfirmed one does not stop it from committing.

#### `Outbox.drain` method

```kotlin
public fun drain()
```

Retries now: delivers queued messages, skips pending backoff, lifts a
session hold and checks unconfirmed messages again. A message still
waits out the authority's `retryAfter`. `ConvoHopStore` calls it when
the device comes online and after the client renews its session.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

### `PendingMessage` class

```kotlin
public data class PendingMessage
```

A message the app sent that the authority has not confirmed into the timeline yet.

Package: `com.convohop.android.core`.

#### `PendingMessage` constructor

```kotlin
public constructor(
    requestId: String,
    conversationId: String,
    text: String,
    props: JsonObject,
    createdAt: Long,
    state: PendingState,
    messageId: String? = null,
    errorCode: String? = null,
)
```

#### `PendingMessage.requestId` property

```kotlin
public val requestId: String
```

The idempotency key every attempt of this message uses.

#### `PendingMessage.conversationId` property

```kotlin
public val conversationId: String
```

#### `PendingMessage.text` property

```kotlin
public val text: String
```

#### `PendingMessage.props` property

```kotlin
public val props: JsonObject
```

#### `PendingMessage.createdAt` property

```kotlin
public val createdAt: Long
```

When the app queued it, in epoch milliseconds.

#### `PendingMessage.state` property

```kotlin
public val state: PendingState
```

#### `PendingMessage.messageId` property

```kotlin
public val messageId: String?
```

The authority's message ID once the message is known to have committed, when the authority returned it.

#### `PendingMessage.errorCode` property

```kotlin
public val errorCode: String?
```

The error code of the rejection, of the refusal that holds a queued message, or of the last failed attempt.

### `ProjectRoute` class

```kotlin
public data class ProjectRoute
```

A signed project route: where one incarnation's communication requests and realtime socket go.

Package: `com.convohop.android.core`.

#### `ProjectRoute` constructor

```kotlin
public constructor(
    projectId: String,
    incarnation: String,
    servingEpoch: String,
    communicationBase: String,
    wssUrl: String,
    expiresAt: String,
    signature: String,
)
```

#### `ProjectRoute.projectId` property

```kotlin
public val projectId: String
```

#### `ProjectRoute.incarnation` property

```kotlin
public val incarnation: String
```

#### `ProjectRoute.servingEpoch` property

```kotlin
public val servingEpoch: String
```

#### `ProjectRoute.communicationBase` property

```kotlin
public val communicationBase: String
```

#### `ProjectRoute.wssUrl` property

```kotlin
public val wssUrl: String
```

#### `ProjectRoute.expiresAt` property

```kotlin
public val expiresAt: String
```

#### `ProjectRoute.signature` property

```kotlin
public val signature: String
```

### `ProtocolValues` class

```kotlin
public object ProtocolValues
```

Checks for the protocol's scalar formats.

Package: `com.convohop.android.core`.

#### `ProtocolValues.isId` static method

```kotlin
public fun isId(value: String): Boolean
```

A lowercase, hyphenated, nonzero UUID.

#### `ProtocolValues.isCounter` static method

```kotlin
public fun isCounter(value: String): Boolean
```

A canonical decimal counter: no sign, no leading zeros, at most 2^63 - 1.

#### `ProtocolValues.isTimestamp` static method

```kotlin
public fun isTimestamp(value: String): Boolean
```

A valid UTC timestamp with exactly three fractional digits, such as `2025-01-02T03:04:05.678Z`.

### `Realtime` class

```kotlin
public object Realtime
```

The realtime envelope, channels and event catalog.

Package: `com.convohop.android.generated`.

#### `Realtime.ENVELOPE_TYPE` static property

```kotlin
public const val ENVELOPE_TYPE: String = "Event"
```

The envelope type of realtime events.

#### `Realtime.DISCRIMINATOR` static property

```kotlin
public const val DISCRIMINATOR: String = "type"
```

The envelope field that names the event type.

#### `Realtime.PAYLOAD_FIELD` static property

```kotlin
public const val PAYLOAD_FIELD: String = "payload"
```

#### `Realtime.SUBJECT_FIELD` static property

```kotlin
public const val SUBJECT_FIELD: String = "subjectRef"
```

#### `Realtime.UNKNOWN_TYPES` static property

```kotlin
public const val UNKNOWN_TYPES: String = "deliverAsUnknown"
```

What clients do with event types they do not know.

#### `Realtime.conversationEvents` static property

```kotlin
public val conversationEvents: RealtimeChannel
```

Ordered events of one conversation over graphql-transport-ws, gap-filled with the replay query.
Events arrive in ascending sequence per conversation. Apply each page, then persist its nextCursor; resume after the last applied cursor.

#### `Realtime.channels` static property

```kotlin
public val channels: List<RealtimeChannel>
```

Every channel a client subscribes to.

#### `Realtime.events` static property

```kotlin
public val events: Map<String, RealtimeEventType>
```

Known event types, keyed by type. Deliver other types as unknown events.

### `RealtimeChannel` class

```kotlin
public class RealtimeChannel
```

One realtime channel and its limits.

Package: `com.convohop.android.generated`.

#### `RealtimeChannel.name` property

```kotlin
public val name: String
```

#### `RealtimeChannel.subscription` property

```kotlin
public val subscription: String
```

The subscription operation id.

#### `RealtimeChannel.replay` property

```kotlin
public val replay: String
```

The replay query that fills gaps.

#### `RealtimeChannel.pageType` property

```kotlin
public val pageType: String
```

#### `RealtimeChannel.endpointOperation` property

```kotlin
public val endpointOperation: String?
```

The operation whose result names the WebSocket endpoint.

#### `RealtimeChannel.endpointResultField` property

```kotlin
public val endpointResultField: String?
```

#### `RealtimeChannel.connectionInit` property

```kotlin
public val connectionInit: List<String>
```

connection_init payload fields, in order.

#### `RealtimeChannel.maxFrameBytes` property

```kotlin
public val maxFrameBytes: Int
```

#### `RealtimeChannel.maxPendingPages` property

```kotlin
public val maxPendingPages: Int
```

#### `RealtimeChannel.subscribeLimit` property

```kotlin
public val subscribeLimit: Int
```

#### `RealtimeChannel.replayLimit` property

```kotlin
public val replayLimit: Int
```

#### `RealtimeChannel.reconnectBaseDelayMs` property

```kotlin
public val reconnectBaseDelayMs: Long
```

#### `RealtimeChannel.reconnectMaxDelayMs` property

```kotlin
public val reconnectMaxDelayMs: Long
```

#### `RealtimeChannel.reconnectJitterMs` property

```kotlin
public val reconnectJitterMs: Long
```

#### `RealtimeChannel.terminalCloseCodes` property

```kotlin
public val terminalCloseCodes: Set<Int>
```

Close codes after which reconnecting cannot succeed.

### `RealtimeEventType` class

```kotlin
public class RealtimeEventType
```

One event type of the realtime envelope.

Package: `com.convohop.android.generated`.

#### `RealtimeEventType.type` property

```kotlin
public val type: String
```

#### `RealtimeEventType.summary` property

```kotlin
public val summary: String
```

#### `RealtimeEventType.subject` property

```kotlin
public val subject: String?
```

#### `RealtimeEventType.requiredPayload` property

```kotlin
public val requiredPayload: List<String>
```

#### `RealtimeEventType.optionalPayload` property

```kotlin
public val optionalPayload: List<String>
```

### `RealtimeUpgradeRefusedException` class

```kotlin
public class RealtimeUpgradeRefusedException : IOException
```

The service refused the realtime upgrade with an HTTP response, such as a
429 `application/problem+json`. A `RealtimeConnector` that can read the
response passes this to `RealtimeListener.onError`, so the stream classifies
the response like any other HTTP response: it reconnects, no sooner than the
response's delay, or stops and reports the problem.

Package: `com.convohop.android.core`.

#### `RealtimeUpgradeRefusedException` constructor

```kotlin
public constructor(status: Int, retryAfter: String?, body: String?)
```

#### `RealtimeUpgradeRefusedException.status` property

```kotlin
public val status: Int
```

The HTTP status of the response.

#### `RealtimeUpgradeRefusedException.retryAfter` property

```kotlin
public val retryAfter: String?
```

The response's `Retry-After` header, if any.

#### `RealtimeUpgradeRefusedException.body` property

```kotlin
public val body: String?
```

The response body, or as much as was read; null when it couldn't be read. One over 65,536 characters isn't parsed.

### `RecoveryRecord` class

```kotlin
public data class RecoveryRecord
```

A snapshot of one mutation's recovery record.

Package: `com.convohop.android.core`.

#### `RecoveryRecord` constructor

```kotlin
public constructor(
    requestId: String,
    incarnation: String,
    payloadFingerprint: String,
    operation: String,
    projectId: String?,
    input: JsonObject,
    firstSubmittedAt: Long,
    retryDeadline: Long,
    attemptCount: Long,
    lastAttemptAt: Long,
    lastAttemptClassification: String,
    resolutionState: String,
    mediaAdmissionAttempted: Boolean,
)
```

#### `RecoveryRecord.requestId` property

```kotlin
public val requestId: String
```

#### `RecoveryRecord.incarnation` property

```kotlin
public val incarnation: String
```

#### `RecoveryRecord.payloadFingerprint` property

```kotlin
public val payloadFingerprint: String
```

#### `RecoveryRecord.operation` property

```kotlin
public val operation: String
```

The operation id, such as `communication.sendMessage`.

#### `RecoveryRecord.projectId` property

```kotlin
public val projectId: String?
```

#### `RecoveryRecord.input` property

```kotlin
public val input: JsonObject
```

#### `RecoveryRecord.firstSubmittedAt` property

```kotlin
public val firstSubmittedAt: Long
```

#### `RecoveryRecord.retryDeadline` property

```kotlin
public val retryDeadline: Long
```

#### `RecoveryRecord.attemptCount` property

```kotlin
public val attemptCount: Long
```

#### `RecoveryRecord.lastAttemptAt` property

```kotlin
public val lastAttemptAt: Long
```

#### `RecoveryRecord.lastAttemptClassification` property

```kotlin
public val lastAttemptClassification: String
```

#### `RecoveryRecord.resolutionState` property

```kotlin
public val resolutionState: String
```

`pending`, `unknown`, `rejected`, `committed` or `accepted`.

#### `RecoveryRecord.mediaAdmissionAttempted` property

```kotlin
public val mediaAdmissionAttempted: Boolean
```

### `Scalars` class

```kotlin
public object Scalars
```

Codecs for the custom scalars. Decoders check string formats; the server enforces ranges and sizes.

Package: `com.convohop.android.generated`.

#### `Scalars.decodeDecimal` static method

```kotlin
public fun decodeDecimal(element: JsonElement, path: String = "Decimal"): String
```

Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number.

#### `Scalars.encodeDecimal` static method

```kotlin
public fun encodeDecimal(value: String): JsonElement
```

#### `Scalars.decodePageSize` static method

```kotlin
public fun decodePageSize(element: JsonElement, path: String = "PageSize"): Int
```

Requested page size.
The server accepts 1 to 100.

#### `Scalars.encodePageSize` static method

```kotlin
public fun encodePageSize(value: Int): JsonElement
```

#### `Scalars.decodeProperties` static method

```kotlin
public fun decodeProperties(element: JsonElement, path: String = "Properties"): JsonObject
```

Application-defined JSON object. Numbers must stay within the interoperable safe-integer range.
The server accepts at most 8192 bytes of canonical JSON.

#### `Scalars.encodeProperties` static method

```kotlin
public fun encodeProperties(value: JsonObject): JsonElement
```

#### `Scalars.decodeSignedProof` static method

```kotlin
public fun decodeSignedProof(element: JsonElement, path: String = "SignedProof"): JsonObject
```

Server-signed JSON object. Treat it as opaque and pass it back unchanged.
The server accepts at most 32768 bytes of canonical JSON.
It carries the string properties signature.

#### `Scalars.encodeSignedProof` static method

```kotlin
public fun encodeSignedProof(value: JsonObject): JsonElement
```

#### `Scalars.decodeUUID` static method

```kotlin
public fun decodeUUID(element: JsonElement, path: String = "UUID"): String
```

Canonical lowercase UUID. The nil UUID is rejected.

#### `Scalars.encodeUUID` static method

```kotlin
public fun encodeUUID(value: String): JsonElement
```

### `ScopeRequiredProblem` class

```kotlin
public class ScopeRequiredProblem : ConvoHopProblem
```

`SCOPE_REQUIRED`: the credential lacks a scope the operation needs.

Package: `com.convohop.android.core`.

#### `ScopeRequiredProblem` constructor

```kotlin
public constructor(
    requestId: String,
    outcome: String,
    status: Int,
    message: String,
    retryAfter: Long? = null,
)
```

#### `ScopeRequiredProblem.scope` property

```kotlin
public val scope: String?
```

The missing scope, or null when the message does not match the documented wording.

#### `ScopeRequiredProblem.code` property

```kotlin
public val code: String
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.requestId` property

```kotlin
public val requestId: String
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.outcome` property

```kotlin
public val outcome: String
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.status` property

```kotlin
public val status: Int
```

The HTTP status, or 0 when no authority response was observed.

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.message` property

```kotlin
public override val message: String
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.retryAfter` property

```kotlin
public val retryAfter: Long?
```

Whole seconds to wait before resending the same request, when the authority sent a delay (for example
with `RATE_LIMITED`). The SDK never resends a call that the app made. When it reconnects a conversation's
stream or resends a queued message on its own, it waits at least this long first.

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.toString` method

```kotlin
public override fun toString(): String
```

Inherited from `ConvoHopProblem`.

### `SendReceipt` class

```kotlin
public data class SendReceipt
```

The authority's receipt for a sent message, checked against the conversation and incarnation.

Package: `com.convohop.android.core`.

#### `SendReceipt` constructor

```kotlin
public constructor(
    messageId: String,
    conversationId: String,
    sequence: String,
    revision: String,
    cursor: Cursor,
)
```

#### `SendReceipt.messageId` property

```kotlin
public val messageId: String
```

#### `SendReceipt.conversationId` property

```kotlin
public val conversationId: String
```

#### `SendReceipt.sequence` property

```kotlin
public val sequence: String
```

#### `SendReceipt.revision` property

```kotlin
public val revision: String
```

#### `SendReceipt.cursor` property

```kotlin
public val cursor: Cursor
```

### `ShapeException` class

```kotlin
public class ShapeException : RuntimeException
```

A response value that does not match the schema. `path` names the value,
for example `SendMessageReply.result.cursor.sequence`. The runtime reports
it as INVALID_RESPONSE.

Package: `com.convohop.android.generated`.

#### `ShapeException` constructor

```kotlin
public constructor(path: String, reason: String)
```

#### `ShapeException.path` property

```kotlin
public val path: String
```

#### `ShapeException.reason` property

```kotlin
public val reason: String
```

### `Timeline` class

```kotlin
public class Timeline : AutoCloseable
```

One conversation, kept current: stored messages at once, then the newest
page and read receipts from the authority, then changes through a replay
that reconnects on its own. `items` lists confirmed messages oldest first,
followed by this device's outbox messages until the replay delivers them.
Close the timeline when the view goes away.

When its replay stops, or reading the conversation fails, the timeline
reads the conversation again after a backoff, and never sooner than the
authority's `retryAfter`. It stops for good, with `replay` at
`ReplayState.CLOSED`, on a problem that trying again can't fix, such as
`NOT_FOUND`, `FORBIDDEN` or `QUOTA_EXCEEDED`, or on a response that breaks
the protocol; open a new timeline to try again. A session problem waits
for the session to be renewed, or stops the timeline when the client has
no `SessionRefresh` to renew it. A replay position that the authority can
no longer continue gives way to the conversation's current state.

Message events carry no content, so the timeline reads new and changed
messages from the authority as their events arrive. The API has no
presence or inbound typing events.

Package: `com.convohop.android.core`.

#### `Timeline.conversationId` property

```kotlin
public val conversationId: String
```

#### `Timeline.items` property

```kotlin
public val items: StateFlow<List<TimelineItem>>
```

Confirmed messages oldest first, then this device's unconfirmed ones in the order they were sent.

#### `Timeline.receipts` property

```kotlin
public val receipts: StateFlow<Map<String, ReadReceipt>>
```

Members' delivery and read progress, by principal ID, for their current membership and visibility.

#### `Timeline.replay` property

```kotlin
public val replay: StateFlow<ReplayState>
```

Where the timeline's replay stands; `ReplayState.CLOSED` once closed or stopped for good.

#### `Timeline.hasOlder` property

```kotlin
public val hasOlder: StateFlow<Boolean>
```

Whether `loadOlder` can load earlier messages.

#### `Timeline.typing` property

```kotlin
public val typing: TypingIndicator
```

This user's typing signal for the conversation.

#### `Timeline.loadOlder` method

```kotlin
public suspend fun loadOlder(): Boolean
```

Loads the page of messages before the oldest one held. Returns false
when nothing older arrived: the start of history is reached, the
timeline has not read from the authority yet, or the history was
replaced meanwhile.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `Timeline.markRead` method

```kotlin
public suspend fun markRead(): Boolean
```

Reports that this user has read through the newest message held.
Returns false when that is already reported or the timeline has not
read from the authority yet.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `Timeline.send` method

```kotlin
public suspend fun send(text: String, props: JsonObject = NO_PROPS): PendingMessage
```

Queues `text` in the store's outbox and ends this user's typing signal.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md), [`communication.sendMessage`](../../operations/communication/sendMessage.md) and [`communication.typing`](../../operations/communication/typing.md).

#### `Timeline.close` method

```kotlin
public override fun close()
```

Stops following the conversation. Messages already queued in the outbox are still sent.

### `TimelineItem.Pending` class

```kotlin
public data class Pending : TimelineItem
```

A message this device sent that the timeline does not show from the authority yet.

Package: `com.convohop.android.core`.

#### `TimelineItem.Pending` constructor

```kotlin
public constructor(message: PendingMessage)
```

#### `TimelineItem.Pending.message` property

```kotlin
public val message: PendingMessage
```

#### `TimelineItem.Pending.key` property

```kotlin
public override val key: String
```

A stable list key.

### `TimelineItem.Sent` class

```kotlin
public data class Sent : TimelineItem
```

A message from the authority's history.

Package: `com.convohop.android.core`.

#### `TimelineItem.Sent` constructor

```kotlin
public constructor(message: Message)
```

#### `TimelineItem.Sent.message` property

```kotlin
public val message: Message
```

#### `TimelineItem.Sent.key` property

```kotlin
public override val key: String
```

A stable list key.

### `Timestamps` class

```kotlin
public object Timestamps
```

UTC timestamps without java.time, which needs Android API 26.

The protocol sends `YYYY-MM-DDTHH:MM:SS.mmmZ`; push payloads may use any
RFC 3339 date-time. Impossible calendar values are rejected rather than
rolled over.

Package: `com.convohop.android.core`.

#### `Timestamps.parseMillis` static method

```kotlin
public fun parseMillis(text: String): Long?
```

Epoch milliseconds of a protocol timestamp (`YYYY-MM-DDTHH:MM:SS.mmmZ`), or null when it is not one.

#### `Timestamps.parseRfc3339` static method

```kotlin
public fun parseRfc3339(text: String): Long?
```

Epoch milliseconds of an RFC 3339 date-time, truncating sub-millisecond digits, or null.

#### `Timestamps.format` static method

```kotlin
public fun format(epochMillis: Long): String
```

Formats epoch milliseconds as a protocol timestamp. Years outside 0000-9999 are rejected.

### `Transport` class

```kotlin
public object Transport
```

HTTP and WebSocket transport constants.

Package: `com.convohop.android.generated`.

#### `Transport.PATH` static property

```kotlin
public const val PATH: String = "/graphql"
```

#### `Transport.MAX_DOCUMENT_BYTES` static property

```kotlin
public const val MAX_DOCUMENT_BYTES: Int = 32768
```

#### `Transport.WEBSOCKET_SUBPROTOCOL` static property

```kotlin
public const val WEBSOCKET_SUBPROTOCOL: String = "graphql-transport-ws"
```

### `TypingIndicator` class

```kotlin
public class TypingIndicator
```

Tells the conversation that this user is typing. Call `keystroke` as the
draft changes and `stop` when the user sends or clears it. The indicator
signals "typing" at most once every 3 seconds and "stopped" 5 seconds after
the last keystroke. Signals are ephemeral: they are sent in order, never
retried, and failures go to the store's error callback.

The API has no inbound typing events, so other members' typing is not shown.

Package: `com.convohop.android.core`.

#### `TypingIndicator.keystroke` method

```kotlin
public fun keystroke()
```

The user changed the draft.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `TypingIndicator.stop` method

```kotlin
public fun stop()
```

The user sent or cleared the draft.

Sends [`communication.typing`](../../operations/communication/typing.md).

## Interfaces

### `ConvoHopEnvironment` interface

```kotlin
public interface ConvoHopEnvironment
```

The clock, identifiers and randomness the SDK uses. Tests replace it; apps normally keep `System`.

Package: `com.convohop.android.core`.

#### `ConvoHopEnvironment.now` method

```kotlin
public fun now(): Long
```

Wall-clock time in epoch milliseconds.

#### `ConvoHopEnvironment.uuid` method

```kotlin
public fun uuid(): String
```

A new random lowercase UUID.

#### `ConvoHopEnvironment.random` method

```kotlin
public fun random(): Double
```

A uniformly distributed value in [0, 1), used for reconnect jitter.

#### `ConvoHopEnvironment.System` static property

```kotlin
public val System: ConvoHopEnvironment
```

The device clock, `java.util.UUID` and `Math.random`.

### `HttpEngine` interface

```kotlin
public fun interface HttpEngine
```

Sends authority requests. `post` throws when no response arrived, which
the SDK reports as an unknown outcome rather than a rejection. A redirect
must be reported as a failure, never followed.

Package: `com.convohop.android.core`.

#### `HttpEngine.post` method

```kotlin
public suspend fun post(request: HttpRequest): HttpResponse
```

### `HttpResponse` interface

```kotlin
public interface HttpResponse
```

An authority response.

Package: `com.convohop.android.core`.

#### `HttpResponse.status` property

```kotlin
public val status: Int
```

#### `HttpResponse.header` method

```kotlin
public fun header(name: String): String?
```

All values of the header `name`, matched case-insensitively and joined with ", ", or null.

#### `HttpResponse.text` method

```kotlin
public suspend fun text(): String?
```

The body decoded as UTF-8, or null when it exceeded `HttpRequest.maxResponseBytes`.
Throws when the body could not be read completely.

### `LocalStore` interface

```kotlin
public interface LocalStore
```

Durable state for `ConvoHopStore`: confirmed messages per conversation and
the outbox. It never receives credentials. Keep one store per project and
principal and `clear` it at sign-out. Implementations must be safe to call
from any thread.

Package: `com.convohop.android.core`.

#### `LocalStore.messages` method

```kotlin
public suspend fun messages(conversationId: String): List<Message>
```

The stored messages of `conversationId`, in any order.

#### `LocalStore.putMessages` method

```kotlin
public suspend fun putMessages(conversationId: String, messages: List<Message>)
```

Inserts or replaces `messages` by message ID.

#### `LocalStore.removeMessages` method

```kotlin
public suspend fun removeMessages(conversationId: String)
```

Deletes the stored messages of `conversationId`, when the cached history no longer joins the current one.

#### `LocalStore.pending` method

```kotlin
public suspend fun pending(): List<PendingMessage>
```

Every outbox entry, in the order they were first stored.

#### `LocalStore.putPending` method

```kotlin
public suspend fun putPending(message: PendingMessage)
```

Inserts or replaces `message` by request ID, keeping the position of an existing entry.

#### `LocalStore.removePending` method

```kotlin
public suspend fun removePending(requestId: String)
```

#### `LocalStore.clear` method

```kotlin
public suspend fun clear()
```

Deletes everything.

### `MediaRoom` interface

```kotlin
public interface MediaRoom
```

One native media room that a `MediaConnection` drives. The Android library
implements it with the official LiveKit SDK; tests use a fake.

Package: `com.convohop.android.core`.

#### `MediaRoom.connect` method

```kotlin
public suspend fun connect(url: String, token: String): String
```

Joins with one single-use token and returns the local participant SID.
Must not capture or publish anything, and must not retry with the same
token. Never log or store the token.

#### `MediaRoom.setMicrophoneEnabled` method

```kotlin
public suspend fun setMicrophoneEnabled(enabled: Boolean)
```

#### `MediaRoom.setCameraEnabled` method

```kotlin
public suspend fun setCameraEnabled(enabled: Boolean)
```

#### `MediaRoom.disconnect` method

```kotlin
public suspend fun disconnect()
```

Leaves and releases everything the room owns. Idempotent and safe after the room disconnected itself.

### `MediaRoomEvents` interface

```kotlin
public fun interface MediaRoomEvents
```

Room events a `MediaConnection` consumes.

Package: `com.convohop.android.core`.

#### `MediaRoomEvents.onDisconnected` method

```kotlin
public fun onDisconnected()
```

The room disconnected for good without `MediaRoom.disconnect`. Callable from any thread.

### `MediaRoomFactory` interface

```kotlin
public fun interface MediaRoomFactory
```

Creates one room per connection attempt.

Package: `com.convohop.android.core`.

#### `MediaRoomFactory.create` method

```kotlin
public fun create(events: MediaRoomEvents): MediaRoom
```

### `RealtimeConnector` interface

```kotlin
public fun interface RealtimeConnector
```

Opens realtime sockets. A connector must offer exactly `subprotocol` and
fail the connection unless the server selects it.

Package: `com.convohop.android.core`.

#### `RealtimeConnector.connect` method

```kotlin
public fun connect(url: String, subprotocol: String, listener: RealtimeListener): RealtimeSocket
```

### `RealtimeListener` interface

```kotlin
public interface RealtimeListener
```

Receives one realtime socket's events, in order, on any thread.

Package: `com.convohop.android.core`.

#### `RealtimeListener.onOpen` method

```kotlin
public fun onOpen()
```

#### `RealtimeListener.onMessage` method

```kotlin
public fun onMessage(text: String?)
```

A text frame; null for a binary frame, which the protocol never sends.

#### `RealtimeListener.onError` method

```kotlin
public fun onError(error: Throwable)
```

The connection failed; `onClose` follows. When the service answered the upgrade with an HTTP response
instead of switching protocols, `error` is a `RealtimeUpgradeRefusedException`.

#### `RealtimeListener.onClose` method

```kotlin
public fun onClose(code: Int, reason: String)
```

The socket closed with `code`; no events follow.

### `RealtimeSocket` interface

```kotlin
public interface RealtimeSocket
```

A connected or connecting realtime socket.

Package: `com.convohop.android.core`.

#### `RealtimeSocket.send` method

```kotlin
public fun send(text: String): Boolean
```

Queues a text frame; false when the socket is closing or closed.

#### `RealtimeSocket.close` method

```kotlin
public fun close(code: Int, reason: String)
```

### `RecoveryStorage` interface

```kotlin
public interface RecoveryStorage
```

Durable key-value storage for mutation recovery records and replay
cursors. Records hold request identities, inputs and outcomes, never
tokens. `setItem` must return only after the value is durable; a failure
is reported as `RECOVERY_STORAGE_FAILURE`.

Package: `com.convohop.android.core`.

#### `RecoveryStorage.getItem` method

```kotlin
public suspend fun getItem(key: String): String?
```

#### `RecoveryStorage.setItem` method

```kotlin
public suspend fun setItem(key: String, value: String)
```

#### `RecoveryStorage.removeItem` method

```kotlin
public suspend fun removeItem(key: String)
```

### `SessionRefresh` interface

```kotlin
public fun interface SessionRefresh
```

Renews the current session through your backend. Ask your backend to renew
exactly `current` and return the bootstrap it received from ConvoHop. The
hook runs on the client's serial dispatcher; switch dispatchers for
blocking work. A failure leaves the original renewal's outcome unknown.

Package: `com.convohop.android.core`.

#### `SessionRefresh.refresh` method

```kotlin
public suspend fun refresh(current: Session): SessionBootstrap
```

### `TimelineItem` interface

```kotlin
public sealed interface TimelineItem
```

One row of a `Timeline`.

Package: `com.convohop.android.core`.

#### `TimelineItem.key` property

```kotlin
public val key: String
```

A stable list key.

## Enums

### `LiveConnectionMode` enum

```kotlin
public enum class LiveConnectionMode
```

Package: `com.convohop.android.generated`.

#### `LiveConnectionMode.INITIAL` case

```kotlin
INITIAL
```

#### `LiveConnectionMode.RECONNECT` case

```kotlin
RECONNECT
```

### `LiveCutoffEvidence` enum

```kotlin
public enum class LiveCutoffEvidence
```

Package: `com.convohop.android.generated`.

#### `LiveCutoffEvidence.NATIVE_FENCE` case

```kotlin
NATIVE_FENCE
```

#### `LiveCutoffEvidence.MONOTONIC_BOOT_RETIREMENT` case

```kotlin
MONOTONIC_BOOT_RETIREMENT
```

#### `LiveCutoffEvidence.NO_GRANTS_ISSUED` case

```kotlin
NO_GRANTS_ISSUED
```

### `LiveCutoffScopeKind` enum

```kotlin
public enum class LiveCutoffScopeKind
```

Package: `com.convohop.android.generated`.

#### `LiveCutoffScopeKind.PARTICIPATION` case

```kotlin
PARTICIPATION
```

#### `LiveCutoffScopeKind.GENERATION` case

```kotlin
GENERATION
```

### `LiveCutoffState` enum

```kotlin
public enum class LiveCutoffState
```

Package: `com.convohop.android.generated`.

#### `LiveCutoffState.PENDING` case

```kotlin
PENDING
```

#### `LiveCutoffState.ENFORCED` case

```kotlin
ENFORCED
```

#### `LiveCutoffState.UNKNOWN` case

```kotlin
UNKNOWN
```

### `LiveErrorCode` enum

```kotlin
public enum class LiveErrorCode
```

Package: `com.convohop.android.generated`.

#### `LiveErrorCode.LIVE_SESSION_EXISTS` case

```kotlin
LIVE_SESSION_EXISTS
```

#### `LiveErrorCode.LIVE_SESSION_CLOSED` case

```kotlin
LIVE_SESSION_CLOSED
```

#### `LiveErrorCode.LIVE_SESSION_INTERRUPTED` case

```kotlin
LIVE_SESSION_INTERRUPTED
```

#### `LiveErrorCode.LIVE_SESSION_CAPACITY` case

```kotlin
LIVE_SESSION_CAPACITY
```

#### `LiveErrorCode.LIVE_ALERT_LIMIT` case

```kotlin
LIVE_ALERT_LIMIT
```

#### `LiveErrorCode.JOINED_ELSEWHERE` case

```kotlin
JOINED_ELSEWHERE
```

#### `LiveErrorCode.PARTICIPATION_DRAINING` case

```kotlin
PARTICIPATION_DRAINING
```

#### `LiveErrorCode.PARTICIPATION_MISMATCH` case

```kotlin
PARTICIPATION_MISMATCH
```

#### `LiveErrorCode.GENERATION_CONFLICT` case

```kotlin
GENERATION_CONFLICT
```

#### `LiveErrorCode.MEDIA_NOT_READY` case

```kotlin
MEDIA_NOT_READY
```

#### `LiveErrorCode.CREDENTIAL_REFRESH_REQUIRED` case

```kotlin
CREDENTIAL_REFRESH_REQUIRED
```

#### `LiveErrorCode.LIVE_START_CANCELLED` case

```kotlin
LIVE_START_CANCELLED
```

#### `LiveErrorCode.LIVE_PREPARATION_FAILED` case

```kotlin
LIVE_PREPARATION_FAILED
```

### `LiveMediaProfile` enum

```kotlin
public enum class LiveMediaProfile
```

Package: `com.convohop.android.generated`.

#### `LiveMediaProfile.AUDIO_ONLY` case

```kotlin
AUDIO_ONLY
```

#### `LiveMediaProfile.AUDIO_VIDEO` case

```kotlin
AUDIO_VIDEO
```

### `LiveOperationKind` enum

```kotlin
public enum class LiveOperationKind
```

Package: `com.convohop.android.generated`.

#### `LiveOperationKind.START` case

```kotlin
START
```

#### `LiveOperationKind.END` case

```kotlin
END
```

### `LiveOperationState` enum

```kotlin
public enum class LiveOperationState
```

Package: `com.convohop.android.generated`.

#### `LiveOperationState.RUNNING` case

```kotlin
RUNNING
```

#### `LiveOperationState.COMPLETED` case

```kotlin
COMPLETED
```

#### `LiveOperationState.FAILED` case

```kotlin
FAILED
```

### `LiveParticipationState` enum

```kotlin
public enum class LiveParticipationState
```

Package: `com.convohop.android.generated`.

#### `LiveParticipationState.JOINED` case

```kotlin
JOINED
```

#### `LiveParticipationState.CONNECTING` case

```kotlin
CONNECTING
```

#### `LiveParticipationState.CONNECTED` case

```kotlin
CONNECTED
```

#### `LiveParticipationState.DISCONNECTED` case

```kotlin
DISCONNECTED
```

#### `LiveParticipationState.LEAVING` case

```kotlin
LEAVING
```

#### `LiveParticipationState.LEFT` case

```kotlin
LEFT
```

### `LiveRole` enum

```kotlin
public enum class LiveRole
```

Package: `com.convohop.android.generated`.

#### `LiveRole.PUBLISHER` case

```kotlin
PUBLISHER
```

#### `LiveRole.VIEWER` case

```kotlin
VIEWER
```

### `LiveSessionKind` enum

```kotlin
public enum class LiveSessionKind
```

Package: `com.convohop.android.generated`.

#### `LiveSessionKind.INTERACTIVE` case

```kotlin
INTERACTIVE
```

#### `LiveSessionKind.BROADCAST` case

```kotlin
BROADCAST
```

### `LiveSessionState` enum

```kotlin
public enum class LiveSessionState
```

Package: `com.convohop.android.generated`.

#### `LiveSessionState.PREPARING` case

```kotlin
PREPARING
```

#### `LiveSessionState.READY` case

```kotlin
READY
```

#### `LiveSessionState.ACTIVE` case

```kotlin
ACTIVE
```

#### `LiveSessionState.DRAINING` case

```kotlin
DRAINING
```

#### `LiveSessionState.ENDED` case

```kotlin
ENDED
```

#### `LiveSessionState.FAILED` case

```kotlin
FAILED
```

### `PendingState` enum

```kotlin
public enum class PendingState
```

Where an outbox message stands.

Package: `com.convohop.android.core`.

#### `PendingState.QUEUED` case

```kotlin
QUEUED
```

Waiting to be sent. Nothing of it was applied: it was never submitted,
or the authority refused the attempt, as when the session expired.

#### `PendingState.SENDING` case

```kotlin
SENDING
```

It may have been submitted: the outbox marks it just before each
attempt, once the request's recovery record is saved. Until the
outcome is known it is resent only under the same request ID.

#### `PendingState.SENT` case

```kotlin
SENT
```

The authority committed it; it leaves the outbox once the timeline holds the message.

#### `PendingState.UNCONFIRMED` case

```kotlin
UNCONFIRMED
```

The retry budget ran out and the authority has not observed it yet. It
may still commit, so it is never resent automatically; the outbox checks
it again read-only, and the app may `Outbox.sendAgain` or `Outbox.discard` it.

#### `PendingState.FAILED` case

```kotlin
FAILED
```

It was not sent: the authority rejected it, or its retry budget ran
out before any attempt could have been applied, as when it was never
submitted or every attempt was refused. `PendingMessage.errorCode` says why.

### `ReplayState` enum

```kotlin
public enum class ReplayState
```

Where a `ConversationStream` stands.

Package: `com.convohop.android.core`.

#### `ReplayState.CATCHING_UP` case

```kotlin
CATCHING_UP
```

Catching up over HTTP, or opening the live subscription.

#### `ReplayState.LIVE` case

```kotlin
LIVE
```

Subscribed; events arrive as they happen.

#### `ReplayState.RECONNECTING` case

```kotlin
RECONNECTING
```

The connection dropped; waiting to reconnect with backoff.

#### `ReplayState.PAUSED` case

```kotlin
PAUSED
```

Held while the session is renewed.

#### `ReplayState.CLOSED` case

```kotlin
CLOSED
```

Closed by the app, or failed permanently; a failure was already reported.

### `SessionRefreshState` enum

```kotlin
public enum class SessionRefreshState
```

Where session renewal stands.

Package: `com.convohop.android.core`.

#### `SessionRefreshState.DISABLED` case

```kotlin
DISABLED
```

No `SessionRefresh` hook was configured.

#### `SessionRefreshState.UNINITIALIZED` case

```kotlin
UNINITIALIZED
```

Call `ConvoHopClient.initialize` with the original bearer first.

#### `SessionRefreshState.READY` case

```kotlin
READY
```

#### `SessionRefreshState.REFRESHING` case

```kotlin
REFRESHING
```

#### `SessionRefreshState.BLOCKED` case

```kotlin
BLOCKED
```

Renewal could not be verified; HTTP and realtime stay blocked. Retire the client.

## Types

### `ActorRef` type

```kotlin
public data class ActorRef(public val tenantId: String, public val objectId: String)
```

Package: `com.convohop.android.generated`.

### `AgentGrant` type

```kotlin
public data class AgentGrant(
    public val grantId: String,
    public val orgId: String,
    public val signupId: String,
    public val agentActorId: String,
    public val projectId: String? = null,
    public val scopes: List<String>,
    public val expiresAt: String,
    public val revokedAt: String? = null,
    public val createdAt: String,
    public val keys: List<AgentKey>,
)
```

Package: `com.convohop.android.generated`.

### `AgentKey` type

```kotlin
public data class AgentKey(
    public val operationId: String,
    public val state: String,
    public val scopes: List<String>,
    public val expiresAt: String,
    public val keyId: String? = null,
    public val deliveryId: String? = null,
    public val deliveryExpiresAt: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `AgentSignupStatus` type

```kotlin
public data class AgentSignupStatus(
    public val signupId: String,
    public val state: String,
    public val orgId: String? = null,
    public val deploymentId: String? = null,
    public val projectId: String? = null,
    public val nextStep: String? = null,
    public val scopes: List<String>,
    public val grantExpiresAt: String? = null,
    public val keys: List<AgentKey>,
    public val incarnation: String? = null,
    public val servingEpoch: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `AlertLiveSessionInput` type

```kotlin
public data class AlertLiveSessionInput(
    public val liveSessionId: String,
    public val expectedGeneration: String,
    public val principalIds: List<String>,
)
```

Package: `com.convohop.android.generated`.

### `AlertLiveSessionPayload` type

```kotlin
public data class AlertLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: LiveAlertBatch,
)
```

Package: `com.convohop.android.generated`.

### `BillingCheckoutSession` type

```kotlin
public data class BillingCheckoutSession(
    public val orgId: String,
    public val planId: String,
    public val url: String,
    public val expiresAt: String,
)
```

Package: `com.convohop.android.generated`.

### `BillingPortalSession` type

```kotlin
public data class BillingPortalSession(
    public val orgId: String,
    public val url: String,
    public val expiresAt: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `BroadcastPermissionChanged` type

```kotlin
public data class BroadcastPermissionChanged(
    public val member: Member,
    public val mediaCutoff: LiveMediaCutoff? = null,
)
```

Package: `com.convohop.android.generated`.

### `Capabilities` type

```kotlin
public data class Capabilities(
    public val serverRelease: String,
    public val capabilityRevision: String,
    public val limitsRevision: String,
    public val features: Features? = null,
    public val limits: List<LimitEntry>,
    public val environment: String,
    public val productionQualified: Boolean,
    public val mediaPolicy: MediaPolicy? = null,
    public val geoControlAuthorityId: String? = null,
    public val offerings: List<String>,
    public val geos: List<String>,
    public val installationProfiles: List<String>,
    public val portalIdentity: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `CapabilitiesReply` type

```kotlin
public data class CapabilitiesReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Capabilities? = null,
)
```

Package: `com.convohop.android.generated`.

### `Conversation` type

```kotlin
public data class Conversation(
    public val conversationId: String,
    public val revision: String,
    public val title: String,
    public val props: JsonObject? = null,
    public val latestSequence: String,
    public val membership: Member? = null,
)
```

Package: `com.convohop.android.generated`.

### `ConversationLiveInput` type

```kotlin
public data class ConversationLiveInput(public val conversationId: String)
```

Package: `com.convohop.android.generated`.

### `ConversationMemberBatch` type

```kotlin
public data class ConversationMemberBatch(public val items: List<Member>)
```

Package: `com.convohop.android.generated`.

### `ConversationMute` type

```kotlin
public data class ConversationMute(
    public val conversationId: String,
    public val principalId: String,
    public val muted: Boolean,
    public val until: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `ConversationMuteInput` type

```kotlin
public data class ConversationMuteInput(
    public val conversationId: String,
    public val actAsPrincipalId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `ConversationMuteReply` type

```kotlin
public data class ConversationMuteReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: ConversationMute,
)
```

Package: `com.convohop.android.generated`.

### `CredentialDelivery` type

```kotlin
public data class CredentialDelivery(
    public val deliveryId: String,
    public val kind: String,
    public val projectId: String,
    public val installationId: String,
    public val resourceRef: ResourceRef? = null,
    public val expiresAt: String,
    public val payloadDigest: String,
    public val recipientActorRef: ActorRef? = null,
)
```

Package: `com.convohop.android.generated`.

### `CredentialDeliveryReceipt` type

```kotlin
public data class CredentialDeliveryReceipt(public val deliveryId: String)
```

Package: `com.convohop.android.generated`.

### `CurrentLiveSessionReply` type

```kotlin
public data class CurrentLiveSessionReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveSession? = null,
)
```

Package: `com.convohop.android.generated`.

### `CurrentSessionReply` type

```kotlin
public data class CurrentSessionReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: Session,
)
```

Package: `com.convohop.android.generated`.

### `Cursor` type

```kotlin
public data class Cursor(
    public val incarnation: String,
    public val conversationId: String,
    public val sequence: String,
)
```

Package: `com.convohop.android.generated`.

### `CursorInput` type

```kotlin
public data class CursorInput(
    public val incarnation: String,
    public val conversationId: String,
    public val sequence: String,
)
```

Package: `com.convohop.android.generated`.

### `CutoffScope` type

```kotlin
public data class CutoffScope(
    public val kind: String,
    public val principalId: String? = null,
    public val sessionId: String? = null,
    public val deviceId: String? = null,
    public val callId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `DeleteMessageReply` type

```kotlin
public data class DeleteMessageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Message? = null,
)
```

Package: `com.convohop.android.generated`.

### `DeleteMessageRequestInput` type

```kotlin
public data class DeleteMessageRequestInput(
    public val conversationId: String,
    public val messageId: String,
    public val expectedRevision: String,
)
```

Package: `com.convohop.android.generated`.

### `DeliveryAck` type

```kotlin
public data class DeliveryAck(public val deliveryId: String, public val acknowledged: Boolean)
```

Package: `com.convohop.android.generated`.

### `EditMessageReply` type

```kotlin
public data class EditMessageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Message? = null,
)
```

Package: `com.convohop.android.generated`.

### `EditMessageRequestInput` type

```kotlin
public data class EditMessageRequestInput(
    public val conversationId: String,
    public val messageId: String,
    public val expectedRevision: String,
    public val text: String? = null,
    public val props: JsonObject? = null,
)
```

Package: `com.convohop.android.generated`.

### `EndLiveSessionInput` type

```kotlin
public data class EndLiveSessionInput(
    public val liveSessionId: String,
    public val expectedGeneration: String,
    public val expectedRevision: String,
)
```

Package: `com.convohop.android.generated`.

### `EndLiveSessionPayload` type

```kotlin
public data class EndLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val operation: OperationRef,
    public val result: LiveSessionEndRequested,
)
```

Package: `com.convohop.android.generated`.

### `Event` type

```kotlin
public data class Event(
    public val eventId: String,
    public val conversationId: String,
    public val sequence: String,
    public val type: String,
    public val occurredAt: String,
    public val subjectRef: ResourceRef? = null,
    public val payload: EventPayload? = null,
)
```

Package: `com.convohop.android.generated`.

### `EventPage` type

```kotlin
public data class EventPage(
    public val items: List<Event>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: Cursor? = null,
)
```

Package: `com.convohop.android.generated`.

### `EventPayload` type

```kotlin
public data class EventPayload(
    public val messageId: String? = null,
    public val revision: String? = null,
    public val revisionSequence: String? = null,
    public val principalId: String? = null,
    public val membershipEpoch: String? = null,
    public val visibilityEpoch: String? = null,
    public val kind: String? = null,
    public val throughSequence: String? = null,
    public val callId: String? = null,
    public val generation: String? = null,
    public val state: String? = null,
    public val cutoffEvidence: String? = null,
    public val liveSessionId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `EventsReply` type

```kotlin
public data class EventsReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: EventPage? = null,
)
```

Package: `com.convohop.android.generated`.

### `EventsRequestInput` type

```kotlin
public data class EventsRequestInput(
    public val conversationId: String,
    public val limit: Int,
    public val after: CursorInput? = null,
)
```

Package: `com.convohop.android.generated`.

### `Features` type

```kotlin
public data class Features(
    public val chat: Boolean,
    public val inbox: Boolean,
    public val lexicalSearch: Boolean,
    public val typing: Boolean,
    public val webhooks: Boolean,
    public val liveSessions: Boolean,
    public val liveBroadcast: Boolean,
)
```

Package: `com.convohop.android.generated`.

### `GetConversationReply` type

```kotlin
public data class GetConversationReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Conversation? = null,
)
```

Package: `com.convohop.android.generated`.

### `GetConversationRequestInput` type

```kotlin
public data class GetConversationRequestInput(public val conversationId: String)
```

Package: `com.convohop.android.generated`.

### `GetMessageReply` type

```kotlin
public data class GetMessageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Message? = null,
)
```

Package: `com.convohop.android.generated`.

### `GetMessageRequestInput` type

```kotlin
public data class GetMessageRequestInput(
    public val conversationId: String,
    public val messageId: String,
    public val actAsPrincipalId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `GetOperationReply` type

```kotlin
public data class GetOperationReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Operation? = null,
)
```

Package: `com.convohop.android.generated`.

### `GetOperationRequestInput` type

```kotlin
public data class GetOperationRequestInput(public val operationId: String)
```

Package: `com.convohop.android.generated`.

### `InboxItem` type

```kotlin
public data class InboxItem(
    public val conversationId: String,
    public val title: String,
    public val activityAt: String? = null,
    public val visibilityEpoch: String,
    public val latestVisibleMessage: Message? = null,
    public val hasUnread: Boolean,
)
```

Package: `com.convohop.android.generated`.

### `InboxPage` type

```kotlin
public data class InboxPage(
    public val items: List<InboxItem>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
    public val partialReason: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `InboxReply` type

```kotlin
public data class InboxReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: InboxPage? = null,
)
```

Package: `com.convohop.android.generated`.

### `InboxRequestInput` type

```kotlin
public data class InboxRequestInput(
    public val limit: Int,
    public val cursor: String? = null,
    public val actAsPrincipalId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `JoinLiveSessionInput` type

```kotlin
public data class JoinLiveSessionInput(
    public val liveSessionId: String,
    public val expectedGeneration: String,
)
```

Package: `com.convohop.android.generated`.

### `JoinLiveSessionPayload` type

```kotlin
public data class JoinLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: LiveSessionJoined,
)
```

Package: `com.convohop.android.generated`.

### `LeaveLiveSessionInput` type

```kotlin
public data class LeaveLiveSessionInput(
    public val liveSessionId: String,
    public val expectedGeneration: String,
    public val participationId: String,
)
```

Package: `com.convohop.android.generated`.

### `LeaveLiveSessionPayload` type

```kotlin
public data class LeaveLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: LiveSessionLeft,
)
```

Package: `com.convohop.android.generated`.

### `Limit` type

```kotlin
public data class Limit(
    public val maximum: String? = null,
    public val unit: String? = null,
    public val scope: String? = null,
    public val milliseconds: String? = null,
    public val policyId: String? = null,
    public val revision: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `LimitEntry` type

```kotlin
public data class LimitEntry(public val key: String, public val value: Limit)
```

Package: `com.convohop.android.generated`.

### `LiveAlert` type

```kotlin
public data class LiveAlert(
    public val alertId: String,
    public val liveSessionId: String,
    public val conversationId: String,
    public val generation: String,
    public val membershipEpoch: String,
    public val createdAt: String,
    public val expiresAt: String,
)
```

Package: `com.convohop.android.generated`.

### `LiveAlertBatch` type

```kotlin
public data class LiveAlertBatch(
    public val liveSessionId: String,
    public val created: String,
    public val suppressed: String,
)
```

Package: `com.convohop.android.generated`.

### `LiveAlertPage` type

```kotlin
public data class LiveAlertPage(
    public val items: List<LiveAlert>,
    public val nextCursor: String? = null,
    public val complete: Boolean,
    public val partialReason: String? = null,
    public val refreshRequired: Boolean,
)
```

Package: `com.convohop.android.generated`.

### `LiveAlertPageReply` type

```kotlin
public data class LiveAlertPageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveAlertPage,
)
```

Package: `com.convohop.android.generated`.

### `LiveAlertsInput` type

```kotlin
public data class LiveAlertsInput(public val limit: Int? = null, public val cursor: String? = null)
```

Package: `com.convohop.android.generated`.

### `LiveConnectionGrant` type

```kotlin
public data class LiveConnectionGrant(
    public val liveSessionId: String,
    public val participationId: String,
    public val generation: String,
    public val roomName: String,
    public val participantIdentity: String,
    public val livekitUrl: String,
    public val transportToken: String,
    public val admissionTicket: JsonObject,
    public val forwardingLease: JsonObject,
    public val transportExpiresAt: String,
    public val admissionExpiresAt: String,
    public val leaseExpiresAt: String,
    public val leasePolicyId: String,
    public val connectToken: String,
)
```

Package: `com.convohop.android.generated`.

### `LiveCredentialIssuance` type

```kotlin
public data class LiveCredentialIssuance(
    public val liveSessionId: String,
    public val participationId: String,
    public val generation: String,
    public val leaseId: String,
    public val grantOrdinal: String,
    public val admissionExpiresAt: String,
    public val leaseExpiresAt: String,
)
```

Package: `com.convohop.android.generated`.

### `LiveCutoffScope` type

```kotlin
public data class LiveCutoffScope(
    public val kind: LiveCutoffScopeKind,
    public val liveSessionId: String,
    public val generation: String,
    public val participationId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `LiveMediaCutoff` type

```kotlin
public data class LiveMediaCutoff(
    public val state: LiveCutoffState,
    public val scope: LiveCutoffScope,
    public val evidence: LiveCutoffEvidence? = null,
    public val enforcedAt: String? = null,
    public val operationId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `LiveMediaPermissions` type

```kotlin
public data class LiveMediaPermissions(
    public val microphone: Boolean,
    public val camera: Boolean,
    public val subscribe: Boolean,
)
```

Package: `com.convohop.android.generated`.

### `LiveOperationFailure` type

```kotlin
public data class LiveOperationFailure(public val code: LiveErrorCode, public val message: String)
```

Package: `com.convohop.android.generated`.

### `LiveParticipantPage` type

```kotlin
public data class LiveParticipantPage(
    public val items: List<LiveParticipation>,
    public val nextCursor: String? = null,
    public val complete: Boolean,
    public val partialReason: String? = null,
    public val refreshRequired: Boolean,
)
```

Package: `com.convohop.android.generated`.

### `LiveParticipantPageReply` type

```kotlin
public data class LiveParticipantPageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveParticipantPage,
)
```

Package: `com.convohop.android.generated`.

### `LiveParticipantsInput` type

```kotlin
public data class LiveParticipantsInput(
    public val liveSessionId: String,
    public val limit: Int? = null,
    public val cursor: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `LiveParticipation` type

```kotlin
public data class LiveParticipation(
    public val participationId: String,
    public val principalId: String,
    public val membershipEpoch: String,
    public val role: LiveRole,
    public val state: LiveParticipationState,
    public val permissions: LiveMediaPermissions,
    public val reservationExpiresAt: String? = null,
    public val nativeConnectionId: String? = null,
    public val mediaCutoff: LiveMediaCutoff? = null,
)
```

Package: `com.convohop.android.generated`.

### `LiveSession` type

```kotlin
public data class LiveSession(
    public val liveSessionId: String,
    public val conversationId: String,
    public val creatorId: String,
    public val kind: LiveSessionKind,
    public val mediaProfile: LiveMediaProfile,
    public val state: LiveSessionState,
    public val generation: String,
    public val revision: String,
    public val createdAt: String,
    public val expiresAt: String,
    public val myParticipation: LiveParticipation? = null,
    public val mediaCutoff: LiveMediaCutoff? = null,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionCredentialsInput` type

```kotlin
public data class LiveSessionCredentialsInput(
    public val liveSessionId: String,
    public val participationId: String,
    public val expectedGeneration: String,
    public val mode: LiveConnectionMode,
    public val replacementOfConnectionId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionCredentialsPayload` type

```kotlin
public data class LiveSessionCredentialsPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: LiveConnectionGrant,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionEndRequested` type

```kotlin
public data class LiveSessionEndRequested(
    public val liveSessionId: String,
    public val operationId: String,
    public val mediaCutoff: LiveMediaCutoff,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionInput` type

```kotlin
public data class LiveSessionInput(public val liveSessionId: String)
```

Package: `com.convohop.android.generated`.

### `LiveSessionJoined` type

```kotlin
public data class LiveSessionJoined(
    public val liveSessionId: String,
    public val generation: String,
    public val participation: LiveParticipation,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionLeft` type

```kotlin
public data class LiveSessionLeft(
    public val liveSessionId: String,
    public val participationId: String,
    public val mediaCutoff: LiveMediaCutoff,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionOperation` type

```kotlin
public data class LiveSessionOperation(
    public val operationId: String,
    public val requestId: String,
    public val liveSessionId: String,
    public val kind: LiveOperationKind,
    public val state: LiveOperationState,
    public val revision: String,
    public val requestedAt: String,
    public val completedAt: String? = null,
    public val completion: LiveSessionOperationCompletion? = null,
    public val failure: LiveOperationFailure? = null,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionOperationCompletion` type

```kotlin
public data class LiveSessionOperationCompletion(
    public val liveSessionId: String,
    public val generation: String,
    public val state: LiveSessionState,
    public val revision: String,
    public val completedAt: String,
    public val mediaCutoff: LiveMediaCutoff? = null,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionOperationInput` type

```kotlin
public data class LiveSessionOperationInput(public val operationId: String)
```

Package: `com.convohop.android.generated`.

### `LiveSessionOperationReply` type

```kotlin
public data class LiveSessionOperationReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveSessionOperation,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionPage` type

```kotlin
public data class LiveSessionPage(
    public val items: List<LiveSession>,
    public val nextCursor: String? = null,
    public val complete: Boolean,
    public val partialReason: String? = null,
    public val refreshRequired: Boolean,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionPageReply` type

```kotlin
public data class LiveSessionPageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveSessionPage,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionReply` type

```kotlin
public data class LiveSessionReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveSession,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionStarted` type

```kotlin
public data class LiveSessionStarted(
    public val liveSessionId: String,
    public val conversationId: String,
    public val kind: LiveSessionKind,
    public val mediaProfile: LiveMediaProfile,
    public val operationId: String,
)
```

Package: `com.convohop.android.generated`.

### `LiveSessionsInput` type

```kotlin
public data class LiveSessionsInput(
    public val conversationId: String,
    public val limit: Int? = null,
    public val cursor: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `MediaCutoff` type

```kotlin
public data class MediaCutoff(public val state: String, public val scope: CutoffScope? = null)
```

Package: `com.convohop.android.generated`.

### `MediaPolicy` type

```kotlin
public data class MediaPolicy(
    public val leasePolicyId: String,
    public val maxLeaseMs: String,
    public val renewAttemptMs: String,
    public val preludeMaxBytes: String,
    public val preludeTimeoutMs: String,
    public val clockProfileId: String,
)
```

Package: `com.convohop.android.generated`.

### `Member` type

```kotlin
public data class Member(
    public val conversationId: String,
    public val principalId: String,
    public val role: String,
    public val status: String,
    public val membershipEpoch: String,
    public val visibilityEpoch: String,
    public val revision: String,
    public val visibleFromSequence: String,
    public val canStartBroadcast: Boolean,
)
```

Package: `com.convohop.android.generated`.

### `MemberPage` type

```kotlin
public data class MemberPage(
    public val items: List<Member>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `MembersReply` type

```kotlin
public data class MembersReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: MemberPage? = null,
)
```

Package: `com.convohop.android.generated`.

### `MembersRequestInput` type

```kotlin
public data class MembersRequestInput(
    public val conversationId: String,
    public val limit: Int,
    public val cursor: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `Message` type

```kotlin
public data class Message(
    public val messageId: String,
    public val conversationId: String,
    public val authorId: String,
    public val sequence: String,
    public val revision: String,
    public val revisionSequence: String,
    public val createdAt: String,
    public val deleted: Boolean,
    public val text: String? = null,
    public val props: JsonObject? = null,
    public val editedAt: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `MessageAck` type

```kotlin
public data class MessageAck(
    public val messageId: String,
    public val conversationId: String,
    public val sequence: String,
    public val revision: String,
    public val status: String,
    public val cursor: Cursor? = null,
)
```

Package: `com.convohop.android.generated`.

### `MessagePage` type

```kotlin
public data class MessagePage(
    public val items: List<Message>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `MessagesReply` type

```kotlin
public data class MessagesReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: MessagePage? = null,
)
```

Package: `com.convohop.android.generated`.

### `MessagesRequestInput` type

```kotlin
public data class MessagesRequestInput(
    public val conversationId: String,
    public val limit: Int,
    public val beforeSequence: String? = null,
    public val actAsPrincipalId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `Operation` type

```kotlin
public data class Operation(
    public val operationId: String,
    public val kind: String,
    public val targetRef: ResourceRef? = null,
    public val state: String,
    public val revision: String,
    public val requestedAt: String,
    public val updatedAt: String,
    public val steps: List<OperationStep>,
    public val result: OperationResult? = null,
    public val blockedReason: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `OperationRef` type

```kotlin
public data class OperationRef(
    public val operationId: String,
    public val owner: String,
    public val href: String,
    public val state: String,
)
```

Package: `com.convohop.android.generated`.

### `OperationResult` type

```kotlin
public data class OperationResult(
    public val projectId: String? = null,
    public val incarnation: String? = null,
    public val status: String? = null,
    public val backend: String? = null,
    public val environment: String? = null,
    public val policyRevision: String? = null,
    public val expiresAt: String? = null,
    public val kind: String? = null,
    public val resourceRef: ResourceRef? = null,
    public val delivery: CredentialDelivery? = null,
    public val keyId: String? = null,
    public val endpointId: String? = null,
    public val enabled: Boolean? = null,
    public val liveSessionCompletion: LiveSessionOperationCompletion? = null,
    public val replayedDeliveries: Int? = null,
    public val skippedDeliveries: Int? = null,
    public val messagePreview: Boolean? = null,
)
```

Package: `com.convohop.android.generated`.

### `OperationStep` type

```kotlin
public data class OperationStep(public val stepId: String, public val state: String)
```

Package: `com.convohop.android.generated`.

### `Organization` type

```kotlin
public data class Organization(
    public val orgId: String,
    public val name: String,
    public val status: String,
    public val revision: String,
)
```

Package: `com.convohop.android.generated`.

### `OrganizationSpend` type

```kotlin
public data class OrganizationSpend(
    public val orgId: String,
    public val planId: String,
    public val currency: String,
    public val catalogVersion: String,
    public val monthlySpendCap: String? = null,
    public val agentPurchaseLimit: String? = null,
    public val updatedAt: String? = null,
    public val monthlyMinimum: String? = null,
    public val periodStart: String? = null,
    public val periodEnd: String? = null,
    public val credits: String? = null,
    public val charges: String? = null,
    public val margin: String? = null,
    public val stop: String? = null,
    public val refusedMeters: List<String>,
    public val evaluatedAt: String? = null,
    public val usageThrough: String? = null,
    public val validUntil: String? = null,
    public val minimumCredit: String? = null,
    public val chargeLimit: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `Principal` type

```kotlin
public data class Principal(
    public val principalId: String,
    public val externalUserId: String,
    public val status: String,
    public val revision: String,
)
```

Package: `com.convohop.android.generated`.

### `ReadReceipt` type

```kotlin
public data class ReadReceipt(
    public val principalId: String,
    public val membershipEpoch: String,
    public val visibilityEpoch: String,
    public val deliveredThroughSequence: String? = null,
    public val readThroughSequence: String? = null,
    public val updatedAt: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `ReceiptPage` type

```kotlin
public data class ReceiptPage(
    public val items: List<ReadReceipt>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `ReceiptsReply` type

```kotlin
public data class ReceiptsReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: ReceiptPage? = null,
)
```

Package: `com.convohop.android.generated`.

### `ReceiptsRequestInput` type

```kotlin
public data class ReceiptsRequestInput(
    public val conversationId: String,
    public val limit: Int,
    public val cursor: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `ReportReceiptReply` type

```kotlin
public data class ReportReceiptReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: ReadReceipt? = null,
)
```

Package: `com.convohop.android.generated`.

### `ReportReceiptRequestInput` type

```kotlin
public data class ReportReceiptRequestInput(
    public val conversationId: String,
    public val kind: String,
    public val membershipEpoch: String,
    public val visibilityEpoch: String,
    public val throughSequence: String,
)
```

Package: `com.convohop.android.generated`.

### `RequestContextInput` type

```kotlin
public data class RequestContextInput(
    public val requestId: String,
    public val projectId: String? = null,
    public val incarnation: String? = null,
    public val observedServingEpoch: String? = null,
    public val credentialDeliveryPermit: JsonObject? = null,
)
```

Package: `com.convohop.android.generated`.

### `RequestResolution` type

```kotlin
public data class RequestResolution(
    public val state: String,
    public val requestId: String,
    public val checkedAt: String,
    public val resultWithheld: Boolean,
    public val receipt: ResolvedReceipt? = null,
)
```

Package: `com.convohop.android.generated`.

### `ResolveRequestReply` type

```kotlin
public data class ResolveRequestReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: RequestResolution? = null,
)
```

Package: `com.convohop.android.generated`.

### `ResolveRequestRequestInput` type

```kotlin
public data class ResolveRequestRequestInput(public val requestId: String)
```

Package: `com.convohop.android.generated`.

### `ResolvedReceipt` type

```kotlin
public data class ResolvedReceipt(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: RetainedResult? = null,
)
```

Package: `com.convohop.android.generated`.

### `ResourceRef` type

```kotlin
public data class ResourceRef(public val kind: String, public val id: String)
```

Package: `com.convohop.android.generated`.

### `RetainedResult` type

```kotlin
public data class RetainedResult(
    public val agentGrant: AgentGrant? = null,
    public val agentSignupStatus: AgentSignupStatus? = null,
    public val billingCheckoutSession: BillingCheckoutSession? = null,
    public val billingPortalSession: BillingPortalSession? = null,
    public val broadcastPermissionChanged: BroadcastPermissionChanged? = null,
    public val conversation: Conversation? = null,
    public val conversationMemberBatch: ConversationMemberBatch? = null,
    public val conversationMute: ConversationMute? = null,
    public val credentialDeliveryReceipt: CredentialDeliveryReceipt? = null,
    public val deliveryAck: DeliveryAck? = null,
    public val liveAlertBatch: LiveAlertBatch? = null,
    public val liveCredentialIssuance: LiveCredentialIssuance? = null,
    public val liveSessionEndRequested: LiveSessionEndRequested? = null,
    public val liveSessionJoined: LiveSessionJoined? = null,
    public val liveSessionLeft: LiveSessionLeft? = null,
    public val liveSessionStarted: LiveSessionStarted? = null,
    public val member: Member? = null,
    public val message: Message? = null,
    public val messageAck: MessageAck? = null,
    public val organization: Organization? = null,
    public val organizationSpend: OrganizationSpend? = null,
    public val principal: Principal? = null,
    public val readReceipt: ReadReceipt? = null,
    public val sessionBootstrap: SessionBootstrap? = null,
    public val sessionRevocation: SessionRevocation? = null,
    public val signedProof: JsonObject? = null,
)
```

Exactly one typed field contains the retained, currently authorized receipt result.

Package: `com.convohop.android.generated`.

### `RevokeSessionReply` type

```kotlin
public data class RevokeSessionReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: SessionRevocation? = null,
)
```

Package: `com.convohop.android.generated`.

### `RevokeSessionRequestInput` type

```kotlin
public data class RevokeSessionRequestInput(
    public val sessionId: String,
    public val expectedRevision: String,
)
```

Package: `com.convohop.android.generated`.

### `RouteReply` type

```kotlin
public data class RouteReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: JsonObject? = null,
)
```

Package: `com.convohop.android.generated`.

### `SearchHit` type

```kotlin
public data class SearchHit(public val conversationId: String, public val message: Message? = null)
```

Package: `com.convohop.android.generated`.

### `SearchPage` type

```kotlin
public data class SearchPage(
    public val items: List<SearchHit>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `SearchReply` type

```kotlin
public data class SearchReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: SearchPage? = null,
)
```

Package: `com.convohop.android.generated`.

### `SearchRequestInput` type

```kotlin
public data class SearchRequestInput(
    public val query: String,
    public val pageSize: Int,
    public val scope: SearchScopeInput? = null,
    public val cursor: String? = null,
    public val actAsPrincipalId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `SearchScopeInput` type

```kotlin
public data class SearchScopeInput(public val conversationIds: List<String>)
```

Package: `com.convohop.android.generated`.

### `SendMessageReply` type

```kotlin
public data class SendMessageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: MessageAck? = null,
)
```

Package: `com.convohop.android.generated`.

### `SendMessageRequestInput` type

```kotlin
public data class SendMessageRequestInput(
    public val conversationId: String,
    public val text: String,
    public val props: JsonObject,
    public val actAsPrincipalId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `Session` type

```kotlin
public data class Session(
    public val sessionId: String,
    public val principalId: String,
    public val deviceId: String,
    public val incarnation: String,
    public val sessionRevision: String,
    public val expiresAt: String,
    public val status: String,
)
```

Package: `com.convohop.android.generated`.

### `SessionBootstrap` type

```kotlin
public data class SessionBootstrap(
    public val session: Session? = null,
    public val tokenExpiresAt: String,
    public val sessionToken: String,
)
```

Package: `com.convohop.android.generated`.

### `SessionRevocation` type

```kotlin
public data class SessionRevocation(
    public val sessionId: String,
    public val status: String,
    public val mediaCutoff: MediaCutoff? = null,
)
```

Package: `com.convohop.android.generated`.

### `SetConversationMuteInput` type

```kotlin
public data class SetConversationMuteInput(
    public val conversationId: String,
    public val muted: Boolean,
    public val until: String? = null,
    public val actAsPrincipalId: String? = null,
)
```

Package: `com.convohop.android.generated`.

### `SetConversationMutePayload` type

```kotlin
public data class SetConversationMutePayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: ConversationMute,
)
```

Package: `com.convohop.android.generated`.

### `StartLiveSessionInput` type

```kotlin
public data class StartLiveSessionInput(
    public val conversationId: String,
    public val kind: LiveSessionKind? = null,
    public val mediaProfile: LiveMediaProfile? = null,
)
```

Package: `com.convohop.android.generated`.

### `StartLiveSessionPayload` type

```kotlin
public data class StartLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val operation: OperationRef,
    public val result: LiveSessionStarted,
)
```

Package: `com.convohop.android.generated`.

### `TypingReply` type

```kotlin
public data class TypingReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: TypingStatus? = null,
)
```

Package: `com.convohop.android.generated`.

### `TypingRequestInput` type

```kotlin
public data class TypingRequestInput(
    public val conversationId: String,
    public val isTyping: Boolean,
)
```

Package: `com.convohop.android.generated`.

### `TypingStatus` type

```kotlin
public data class TypingStatus(public val accepted: Boolean)
```

Package: `com.convohop.android.generated`.

### `UpdateConversationReply` type

```kotlin
public data class UpdateConversationReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Conversation? = null,
)
```

Package: `com.convohop.android.generated`.

### `UpdateConversationRequestInput` type

```kotlin
public data class UpdateConversationRequestInput(
    public val conversationId: String,
    public val expectedRevision: String,
    public val title: String? = null,
    public val props: JsonObject? = null,
)
```

Package: `com.convohop.android.generated`.

## Constants

### `MAX_LIST_ITEMS` constant

```kotlin
public const val MAX_LIST_ITEMS: Int = 100
```

The most items one response list may hold.

Package: `com.convohop.android.generated`.
