# `@convohop/client`

Client SDK for apps on end-user devices: one signed-in user's conversations, realtime events and calls.

**Layer:** Client. **Runtime:** Current browsers. React Native isn't verified yet. **Source:** `packages/client`.

## Classes

### `ConversationHandle` class

```ts
class ConversationHandle
```

#### `ConversationHandle.client` property

```ts
readonly client: ConvoHopClient
```

#### `ConversationHandle.conversationId` property

```ts
readonly conversationId: string
```

#### `ConversationHandle.live` property

```ts
readonly live: ConversationLive
```

#### `ConversationHandle` constructor

```ts
constructor(client: ConvoHopClient, conversationId: string)
```

#### `ConversationHandle.get` method

```ts
get(): Promise<{
    conversationId: string;
    revision: string;
    title: string;
    props: Record<string, unknown> | null;
    latestSequence: string;
    membership: {
        conversationId: string;
        principalId: string;
        role: string;
        status: string;
        membershipEpoch: string;
        visibilityEpoch: string;
        revision: string;
        visibleFromSequence: string;
        canStartBroadcast: boolean;
    } | null;
}>
```

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `ConversationHandle.messages` property

```ts
readonly messages: { … }
```

##### `ConversationHandle.messages.send` property

```ts
send: (message: {
    text: string;
    props?: ProtocolObject;
}, options?: CommandOptions) => Promise<{
    messageId: string;
    conversationId: string;
    sequence: string;
    revision: string;
    status: string;
    cursor: {
        incarnation: string;
        conversationId: string;
        sequence: string;
    } | null;
} | null>
```

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

##### `ConversationHandle.messages.list` property

```ts
list: (beforeSequence?: string) => Promise<import("@convohop/core").ItemPage<{
    messageId: string;
    conversationId: string;
    authorId: string;
    sequence: string;
    revision: string;
    revisionSequence: string;
    createdAt: string;
    deleted: boolean;
    text: string | null;
    props: Record<string, unknown> | null;
    editedAt: string | null;
}>>
```

Sends [`communication.messages`](../../operations/communication/messages.md).

##### `ConversationHandle.messages.edit` property

```ts
edit: (message: ConversationMessage, text: string, options?: CommandOptions) => Promise<{
    messageId: string;
    conversationId: string;
    authorId: string;
    sequence: string;
    revision: string;
    revisionSequence: string;
    createdAt: string;
    deleted: boolean;
    text: string | null;
    props: Record<string, unknown> | null;
    editedAt: string | null;
}>
```

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

##### `ConversationHandle.messages.delete` property

```ts
delete: (message: ConversationMessage, options?: CommandOptions) => Promise<{
    messageId: string;
    conversationId: string;
    authorId: string;
    sequence: string;
    revision: string;
    revisionSequence: string;
    createdAt: string;
    deleted: boolean;
    text: string | null;
    props: Record<string, unknown> | null;
    editedAt: string | null;
}>
```

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `ConversationHandle.mute` property

```ts
readonly mute: { … }
```

This user's mute of message push notifications for the conversation. `until` (RFC 3339, in the future) applies
only to a mute. Calls still ring a muted member.

##### `ConversationHandle.mute.get` property

```ts
get: () => Promise<ConversationMute>
```

Sends [`communication.conversationMute`](../../operations/communication/conversationMute.md).

##### `ConversationHandle.mute.set` property

```ts
set: (input: {
    muted: boolean;
    until?: string;
}, options?: CommandOptions) => Promise<ConversationMute>
```

Sends [`communication.setConversationMute`](../../operations/communication/setConversationMute.md).

### `ConversationLive` class

```ts
class ConversationLive
```

#### `ConversationLive.conversation` property

```ts
readonly conversation: ConversationHandle
```

#### `ConversationLive` constructor

```ts
constructor(conversation: ConversationHandle)
```

#### `ConversationLive.current` method

```ts
current(): Promise<LiveSessionHandle | null>
```

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `ConversationLive.history` method

```ts
history(options?: PageOptions): Promise<{
    nextCursor: string | null;
    complete: boolean;
    partialReason: string | null;
    refreshRequired: boolean;
    items: Array<{
        liveSessionId: string;
        conversationId: string;
        creatorId: string;
        kind: GraphqlTypes.LiveSessionKind;
        mediaProfile: GraphqlTypes.LiveMediaProfile;
        state: GraphqlTypes.LiveSessionState;
        generation: string;
        revision: string;
        createdAt: string;
        expiresAt: string;
        myParticipation: { … } | null;
        mediaCutoff: { … } | null;
    }>;
}>
```

Sends [`communication.liveSessions`](../../operations/communication/liveSessions.md).

#### `ConversationLive.startVoice` method

```ts
startVoice(options?: CommandOptions): Promise<LiveStartOperation>
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

#### `ConversationLive.startVideo` method

```ts
startVideo(options?: CommandOptions): Promise<LiveStartOperation>
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

#### `ConversationLive.startBroadcast` method

```ts
startBroadcast(input: {
    mediaProfile: LiveMediaProfile;
}, options?: CommandOptions): Promise<LiveStartOperation>
```

Sends [`communication.startLiveSession`](../../operations/communication/startLiveSession.md).

### `ConversationStore` class

```ts
class ConversationStore
```

One conversation's messages, receipts and pending sends, kept current from its authorized event stream.

`open()` loads the conversation, its newest page of messages and every receipt, then follows new events. The
replay starts at the stream's saved position, so give the client `recoveryStorage` to make reopening incremental;
without it, opening replays the conversation's visible history (applying nothing already loaded) before going live.
Keep one store per conversation and client: stores of the same conversation share the saved replay position.

#### `ConversationStore.client` property

```ts
readonly client: ConvoHopClient
```

#### `ConversationStore.conversationId` property

```ts
readonly conversationId: string
```

#### `ConversationStore.outbox` property

```ts
readonly outbox: Outbox
```

#### `ConversationStore` constructor

```ts
constructor(client: ConvoHopClient, conversationId: string, options?: ConversationStoreOptions)
```

#### `ConversationStore.snapshot` property

```ts
get snapshot(): ConversationSnapshot
```

A frozen snapshot, replaced on every change. Unchanged message and receipt lists keep their identity.

#### `ConversationStore.subscribe` method

```ts
subscribe(listener: () => void): () => void
```

#### `ConversationStore.open` method

```ts
open(): Promise<void>
```

Loads the conversation and follows it, rejecting if that fails. While an attempt is running, including the
reconnect after a session refresh, this returns it; after an error it reconnects from the loaded state. It doesn't
recover from `resyncRequired`: call `resync` for that.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConversationStore.resync` method

```ts
resync(): Promise<void>
```

Discards the saved replay position, reloads the conversation and replays its authorized history from the start.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConversationStore.loadOlder` method

```ts
loadOlder(): Promise<boolean>
```

Loads the previous page of messages. Resolves whether it added any.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ConversationStore.send` method

```ts
send(text: string, props?: ProtocolObject): OutboxEntry
```

Queues a message in the outbox. It shows in `pending` until it appears in `messages`.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConversationStore.markRead` method

```ts
markRead(): Promise<boolean>
```

Reports reading through the newest loaded message. Resolves whether a report was needed.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConversationStore.markDelivered` method

```ts
markDelivered(): Promise<boolean>
```

Reports delivery through the newest loaded message. Resolves whether a report was needed.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConversationStore.close` method

```ts
close(): void
```

Stops following the conversation. A store the app didn't give an outbox also closes its own; await
`store.outbox.close()` to know when that outbox has stopped writing.

### `ConversationStream` class

```ts
class ConversationStream
```

#### `ConversationStream.client` property

```ts
readonly client: ConvoHopClient
```

#### `ConversationStream.conversationId` property

```ts
readonly conversationId: string
```

#### `ConversationStream.route` property

```ts
readonly route: ProjectRoute
```

#### `ConversationStream.apply` property

```ts
readonly apply: (events: ProtocolObject[]) => Promise<void>
```

#### `ConversationStream.onError` property

```ts
readonly onError: (error: Error) => void
```

#### `ConversationStream.onClose` property

```ts
readonly onClose?: (() => void) | undefined
```

#### `ConversationStream` constructor

```ts
constructor(client: ConvoHopClient, conversationId: string, route: ProjectRoute, token: string, apply: (events: ProtocolObject[]) => Promise<void>, onError: (error: Error) => void, onClose?: (() => void) | undefined)
```

#### `ConversationStream.cursor` property

```ts
get cursor(): ConversationCursor | undefined
```

#### `ConversationStream.closed` property

```ts
get closed(): boolean
```

#### `ConversationStream.retire` method

```ts
retire(): Promise<void>
```

#### `ConversationStream.resyncAuthorizedHistory` method

```ts
resyncAuthorizedHistory(): Promise<void>
```

#### `ConversationStream.start` method

```ts
start(): Promise<void>
```

#### `ConversationStream.reconcile` method

```ts
reconcile(): Promise<void>
```

#### `ConversationStream.close` method

```ts
close(): void
```

### `ConvoHopClient` class

```ts
class ConvoHopClient
```

#### `ConvoHopClient.projectId` property

```ts
readonly projectId: string
```

#### `ConvoHopClient.principalId` property

```ts
readonly principalId: string
```

#### `ConvoHopClient.http` property

```ts
readonly http: ConvoHopTransport
```

#### `ConvoHopClient.storage` property

```ts
readonly storage: RecoveryStorage | undefined
```

#### `ConvoHopClient.asyncStorage` property

```ts
readonly asyncStorage: AsyncRecoveryStorage | undefined
```

The configured `asyncRecoveryStorage`, if any.

#### `ConvoHopClient.platform` property

```ts
readonly platform: Readonly<ConvoHopPlatform>
```

The validated `platform` option, frozen. Empty when every service comes from globals.

#### `ConvoHopClient` constructor

```ts
constructor(options: ConvoHopClientOptions)
```

#### `ConvoHopClient.sessionBinding` property

```ts
get sessionBinding(): Readonly<SessionMetadata> | undefined
```

#### `ConvoHopClient.sessionRefreshState` property

```ts
get sessionRefreshState(): SessionRefreshState
```

#### `ConvoHopClient.initialize` method

```ts
initialize(): Promise<ProjectRoute>
```

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `ConvoHopClient.refreshSession` method

```ts
refreshSession(): Promise<SessionMetadata>
```

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `ConvoHopClient.scheduleSessionRefresh` method

```ts
scheduleSessionRefresh(options?: SessionRefreshSchedule): () => void
```

Renews the session `leadMs` before it expires, and again after each renewal, until the returned function is
called. A failed renewal that leaves the current session verified is retried with backoff before expiry, so the
`sessionRefresh` hook can run again; any other failure stops the schedule. Every failure goes to `onError`.
Returning to the foreground (`platform.lifecycle`) re-checks a waiting renewal at once, since suspended apps'
timers can fire late.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

#### `ConvoHopClient.conversation` method

```ts
conversation(id: string): ConversationHandle
```

#### `ConvoHopClient.getConversation` method

```ts
getConversation(id: string): Promise<Conversation>
```

Sends [`communication.getConversation`](../../operations/communication/getConversation.md).

#### `ConvoHopClient.requests` property

```ts
readonly requests: { … }
```

##### `ConvoHopClient.requests.resolve` property

```ts
resolve: (requestId: string) => Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>>
```

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

##### `ConvoHopClient.requests.retry` property

```ts
retry: (requestId: string) => Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>>
```

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ConvoHopClient.liveSession` method

```ts
liveSession(id: string): Promise<LiveSessionHandle>
```

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `ConvoHopClient.liveAlerts` property

```ts
readonly liveAlerts: { … }
```

##### `ConvoHopClient.liveAlerts.list` property

```ts
list: (options?: PageOptions) => Promise<OperationPayload<"communication.liveSessionAlerts">["result"]>
```

Sends [`communication.liveSessionAlerts`](../../operations/communication/liveSessionAlerts.md).

#### `ConvoHopClient.messages` method

```ts
messages(id: string, beforeSequence?: string, limit?: number): Promise<ItemPage<ConversationMessage>>
```

Up to `limit` (1..100, default 100) messages before `beforeSequence` or the newest, newest first. Pages can hold fewer.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ConvoHopClient.send` method

```ts
send(id: string, text: string, requestId?: string, props?: ProtocolObject): Promise<SendReceipt>
```

Sends [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConvoHopClient.edit` method

```ts
edit(message: ConversationMessage, text: string, requestId?: string): Promise<ConversationMessage>
```

Sends [`communication.editMessage`](../../operations/communication/editMessage.md).

#### `ConvoHopClient.delete` method

```ts
delete(message: ConversationMessage, requestId?: string): Promise<ConversationMessage>
```

Sends [`communication.deleteMessage`](../../operations/communication/deleteMessage.md).

#### `ConvoHopClient.events` method

```ts
events(id: string, after?: ConversationCursor): Promise<ItemPage<ProtocolObject> & {
    nextCursor: ConversationCursor;
}>
```

Sends [`communication.events`](../../operations/communication/events.md).

#### `ConvoHopClient.reportRead` method

```ts
reportRead(id: string, membership: Membership, throughSequence: string): Promise<ReadReceipt>
```

Reports reading through a message's sequence, which also covers its delivery. Returns the user's current receipt.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConvoHopClient.reportDelivered` method

```ts
reportDelivered(id: string, membership: Membership, throughSequence: string): Promise<ReadReceipt>
```

Reports delivery through a message's sequence. Returns the user's current receipt.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConvoHopClient.receipts` method

```ts
receipts(id: string, cursor?: string): Promise<ItemPage<ReadReceipt>>
```

Sends [`communication.receipts`](../../operations/communication/receipts.md).

#### `ConvoHopClient.getMessage` method

```ts
getMessage(id: string, messageId: string): Promise<ConversationMessage>
```

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `ConvoHopClient.members` method

```ts
members(id: string, options?: PageOptions): Promise<ItemPage<Membership>>
```

Sends [`communication.members`](../../operations/communication/members.md).

#### `ConvoHopClient.inbox` method

```ts
inbox(options?: PageOptions): Promise<InboxPage>
```

Sends [`communication.inbox`](../../operations/communication/inbox.md).

#### `ConvoHopClient.capabilities` method

```ts
capabilities(): Promise<ProjectCapabilities>
```

Sends [`communication.capabilities`](../../operations/communication/capabilities.md).

#### `ConvoHopClient.typing` method

```ts
typing(id: string, isTyping: boolean): Promise<boolean>
```

Sends one ephemeral typing signal and returns whether the authority accepted it. Signals are never recorded,
retried or resolved. Check `features?.typing` in `capabilities` first.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `ConvoHopClient.search` method

```ts
search(query: string, conversationIds?: string[]): Promise<ItemPage<SearchHit>>
```

Sends [`communication.search`](../../operations/communication/search.md).

#### `ConvoHopClient.recoverPending` method

```ts
recoverPending(onError: (error: Error) => void): Promise<void>
```

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md).

#### `ConvoHopClient.watch` method

```ts
watch(conversationId: string, apply: (events: ProtocolObject[]) => Promise<void>, onError: (error: Error) => void): Promise<ConversationStream>
```

Sends [`communication.events`](../../operations/communication/events.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConvoHopClient.resyncAuthorizedHistory` method

```ts
resyncAuthorizedHistory(conversationId: string, apply: (events: ProtocolObject[]) => Promise<void>, onError: (error: Error) => void): Promise<ConversationStream>
```

Sends [`communication.events`](../../operations/communication/events.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

### `ConvoHopProblem` class

```ts
class ConvoHopProblem extends Error
```

Re-exported from `@convohop/core`.

#### `ConvoHopProblem.code` property

```ts
readonly code: string
```

#### `ConvoHopProblem.requestId` property

```ts
readonly requestId: string
```

#### `ConvoHopProblem.outcome` property

```ts
readonly outcome: string
```

#### `ConvoHopProblem.status` property

```ts
readonly status: number
```

#### `ConvoHopProblem.retryAfter` property

```ts
readonly retryAfter?: number
```

Whole seconds to wait before resending the same request, when the authority sent a delay (for example with
`RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds,
or from a realtime close reason's `retryAfter=`. A request the caller sends is never resent on its own; when
`@convohop/client` reconnects its stream or resends a queued message, it waits at least this long first.

#### `ConvoHopProblem` constructor

```ts
constructor(code: string, requestId: string, outcome: string, status: number, message: string, options?: ErrorOptions & {
    retryAfter?: number;
})
```

### `ConvoHopTransport` class

```ts
class ConvoHopTransport
```

Re-exported from `@convohop/core`.

#### `ConvoHopTransport.baseUrl` property

```ts
readonly baseUrl: string
```

#### `ConvoHopTransport.durableRecovery` property

```ts
readonly durableRecovery: boolean
```

#### `ConvoHopTransport.incarnation` property

```ts
incarnation: string
```

#### `ConvoHopTransport.servingEpoch` property

```ts
servingEpoch: string | undefined
```

#### `ConvoHopTransport` constructor

```ts
constructor(options: ConvoHopTransportOptions)
```

#### `ConvoHopTransport.initializeRecovery` method

```ts
initializeRecovery(): Promise<void>
```

#### `ConvoHopTransport.recoveryStates` property

```ts
get recoveryStates(): readonly RecoveryState[]
```

#### `ConvoHopTransport.execute` method

```ts
execute<K extends OperationKey>(key: K, projectId: string | undefined, input: OperationInput<K>, requestId?: string, credentialDeliveryPermit?: ProtocolObject): Promise<OperationPayload<K>>
```

#### `ConvoHopTransport.retry` method

```ts
retry(requestId: string): Promise<NonNullable<OperationPayload<"communication.resolveRequest">["result"]>>
```

### `LiveEndOperation` class

```ts
class LiveEndOperation extends LiveAction
```

#### `LiveEndOperation.receipt` property

```ts
readonly receipt: OperationPayload<"communication.endLiveSession">
```

#### `LiveEndOperation` constructor

```ts
constructor(client: ConvoHopClient, receipt: OperationPayload<"communication.endLiveSession">)
```

#### `LiveEndOperation.client` property

```ts
readonly client: ConvoHopClient
```

Inherited from `LiveAction`.

#### `LiveEndOperation.operationId` property

```ts
readonly operationId: string
```

Inherited from `LiveAction`.

#### `LiveEndOperation.liveSessionId` property

```ts
readonly liveSessionId: string
```

Inherited from `LiveAction`.

#### `LiveEndOperation.kind` property

```ts
readonly kind: "START" | "END"
```

Inherited from `LiveAction`.

#### `LiveEndOperation.requestId` property

```ts
readonly requestId: string
```

Inherited from `LiveAction`.

#### `LiveEndOperation.get` method

```ts
get(): Promise<LiveOperation>
```

Inherited from `LiveAction`. Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `LiveEndOperation.completed` method

```ts
completed(options?: LiveWaitOptions): Promise<NonNullable<LiveOperation["completion"]>>
```

Inherited from `LiveAction`. Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

### `LiveParticipationHandle` class

```ts
class LiveParticipationHandle
```

#### `LiveParticipationHandle.live` property

```ts
readonly live: LiveSessionHandle
```

#### `LiveParticipationHandle.snapshot` property

```ts
readonly snapshot: LiveParticipation
```

#### `LiveParticipationHandle.participationId` property

```ts
readonly participationId: string
```

#### `LiveParticipationHandle` constructor

```ts
constructor(live: LiveSessionHandle, snapshot: LiveParticipation)
```

#### `LiveParticipationHandle.get` method

```ts
get(): Promise<LiveParticipation>
```

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveParticipationHandle.connect` method

```ts
connect(options?: LiveConnectOptions): Promise<MediaConnection>
```

Connects this participation's media in the browser with `livekit-client`, which is loaded on first use.

Sends [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `LiveParticipationHandle.connectWith` method

```ts
connectWith<C extends LiveConnection>(connector: LiveConnector<C>, options?: CommandOptions): Promise<C>
```

Connects this participation's media with your own native client, such as a stock LiveKit SDK on React Native.
The SDK obtains a participation-bound grant, checks the media URL, records the attempt durably, then calls
`connector` once. A connector failure is `MEDIA_CONNECT_FAILED` with an unknown outcome: the reservation remains,
and the next call resolves the old attempt before a fresh one. Rejects while another attempt is in flight or
another connection is connected.

Sends [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `LiveParticipationHandle.leave` method

```ts
leave(options?: CommandOptions): Promise<{
    status: string;
    requestId: string;
    receiptId: string;
    committedAt: string;
    replayed: boolean;
    result: {
        liveSessionId: string;
        participationId: string;
        mediaCutoff: {
            state: GraphqlTypes.LiveCutoffState;
            evidence: GraphqlTypes.LiveCutoffEvidence | null;
            enforcedAt: string | null;
            operationId: string | null;
            scope: { … };
        };
    };
}>
```

Sends [`communication.leaveLiveSession`](../../operations/communication/leaveLiveSession.md).

### `LiveSessionHandle` class

```ts
class LiveSessionHandle
```

#### `LiveSessionHandle.client` property

```ts
readonly client: ConvoHopClient
```

#### `LiveSessionHandle.snapshot` property

```ts
readonly snapshot: LiveSession
```

#### `LiveSessionHandle.liveSessionId` property

```ts
readonly liveSessionId: string
```

#### `LiveSessionHandle.generation` property

```ts
readonly generation: string
```

#### `LiveSessionHandle.conversationId` property

```ts
readonly conversationId: string
```

#### `LiveSessionHandle` constructor

```ts
constructor(client: ConvoHopClient, snapshot: LiveSession)
```

#### `LiveSessionHandle.get` static method

```ts
static get(client: ConvoHopClient, liveSessionId: string): Promise<LiveSessionHandle>
```

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveSessionHandle.get` method

```ts
get(): Promise<LiveSession>
```

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveSessionHandle.join` method

```ts
join(options?: CommandOptions): Promise<LiveParticipationHandle>
```

Sends [`communication.joinLiveSession`](../../operations/communication/joinLiveSession.md).

#### `LiveSessionHandle.participation` method

```ts
participation(): Promise<LiveParticipationHandle | null>
```

Sends [`communication.liveSession`](../../operations/communication/liveSession.md).

#### `LiveSessionHandle.participants` method

```ts
participants(options?: PageOptions): Promise<{
    nextCursor: string | null;
    complete: boolean;
    partialReason: string | null;
    refreshRequired: boolean;
    items: Array<{
        participationId: string;
        principalId: string;
        membershipEpoch: string;
        role: GraphqlTypes.LiveRole;
        state: GraphqlTypes.LiveParticipationState;
        reservationExpiresAt: string | null;
        nativeConnectionId: string | null;
        permissions: { … };
        mediaCutoff: { … } | null;
    }>;
}>
```

Sends [`communication.liveSessionParticipants`](../../operations/communication/liveSessionParticipants.md).

#### `LiveSessionHandle.alerts` property

```ts
readonly alerts: { … }
```

##### `LiveSessionHandle.alerts.send` property

```ts
send: (principalIds: string[], options?: CommandOptions) => Promise<{
    status: string;
    requestId: string;
    receiptId: string;
    committedAt: string;
    replayed: boolean;
    result: {
        liveSessionId: string;
        created: string;
        suppressed: string;
    };
}>
```

Sends [`communication.alertLiveSession`](../../operations/communication/alertLiveSession.md).

#### `LiveSessionHandle.end` method

```ts
end(options?: CommandOptions): Promise<LiveEndOperation>
```

Sends [`communication.endLiveSession`](../../operations/communication/endLiveSession.md).

### `LiveStartOperation` class

```ts
class LiveStartOperation extends LiveAction
```

#### `LiveStartOperation.receipt` property

```ts
readonly receipt: OperationPayload<"communication.startLiveSession">
```

#### `LiveStartOperation` constructor

```ts
constructor(client: ConvoHopClient, receipt: OperationPayload<"communication.startLiveSession">)
```

#### `LiveStartOperation.ready` method

```ts
ready(options?: LiveWaitOptions): Promise<LiveSessionHandle>
```

Sends [`communication.liveSession`](../../operations/communication/liveSession.md) and [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `LiveStartOperation.client` property

```ts
readonly client: ConvoHopClient
```

Inherited from `LiveAction`.

#### `LiveStartOperation.operationId` property

```ts
readonly operationId: string
```

Inherited from `LiveAction`.

#### `LiveStartOperation.liveSessionId` property

```ts
readonly liveSessionId: string
```

Inherited from `LiveAction`.

#### `LiveStartOperation.kind` property

```ts
readonly kind: "START" | "END"
```

Inherited from `LiveAction`.

#### `LiveStartOperation.requestId` property

```ts
readonly requestId: string
```

Inherited from `LiveAction`.

#### `LiveStartOperation.get` method

```ts
get(): Promise<LiveOperation>
```

Inherited from `LiveAction`. Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

#### `LiveStartOperation.completed` method

```ts
completed(options?: LiveWaitOptions): Promise<NonNullable<LiveOperation["completion"]>>
```

Inherited from `LiveAction`. Sends [`communication.liveSessionOperation`](../../operations/communication/liveSessionOperation.md).

### `MediaConnection` class

```ts
class MediaConnection
```

#### `MediaConnection.participation` property

```ts
readonly participation: LiveParticipationHandle
```

#### `MediaConnection.options` property

```ts
readonly options: MediaOptions
```

#### `MediaConnection.nativeConnectionId` property

```ts
nativeConnectionId: string | undefined
```

The participation's `nativeConnectionId`: the LiveKit participant sid the media server assigned at admission.

#### `MediaConnection.reconnect` method

```ts
reconnect(): Promise<MediaConnection>
```

Sends [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `MediaConnection.connected` property

```ts
get connected(): boolean
```

#### `MediaConnection.resuming` property

```ts
get resuming(): boolean
```

LiveKit is resuming this connection after a network interruption.

#### `MediaConnection.microphone` method

```ts
microphone(enabled: boolean): Promise<void>
```

#### `MediaConnection.camera` method

```ts
camera(enabled: boolean): Promise<void>
```

#### `MediaConnection.enableAudio` method

```ts
enableAudio(): Promise<void>
```

#### `MediaConnection.stats` method

```ts
stats(): Promise<MediaStats>
```

#### `MediaConnection.disconnect` method

```ts
disconnect(): Promise<void>
```

### `Outbox` class

```ts
class Outbox
```

Sends messages optimistically and in order per conversation. Offline periods, session refreshes and uncertain
outcomes don't duplicate a message: an entry keeps one request ID, and the transport's retry budget, until it is
sent or fails. A failed entry is only sent again, as a new message, through `Outbox.resend`.

#### `Outbox.client` property

```ts
readonly client: ConvoHopClient
```

#### `Outbox` constructor

```ts
constructor(client: ConvoHopClient, options?: OutboxOptions)
```

#### `Outbox.entries` property

```ts
get entries(): readonly OutboxEntry[]
```

A frozen snapshot in send order, replaced on every change.

#### `Outbox.subscribe` method

```ts
subscribe(listener: () => void): () => void
```

#### `Outbox.send` method

```ts
send(conversationId: string, text: string, props?: ProtocolObject): OutboxEntry
```

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `Outbox.resend` method

```ts
resend(requestId: string): OutboxEntry
```

Sends a failed entry's message again as a new request, after the entries already waiting.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `Outbox.discard` method

```ts
discard(requestId: string): void
```

Drops a queued, failed or sent entry. An entry that is sending or whose outcome is unknown can't be discarded.

#### `Outbox.settle` method

```ts
settle(requestId: string): void
```

Releases a sent entry, typically once its message is shown from history.

#### `Outbox.flush` method

```ts
flush(): Promise<void>
```

Attempts every waiting entry now, ignoring backoff, and resolves when each conversation's queue is idle or blocked.
Waits for saved entries to load first.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `Outbox.close` method

```ts
close(): Promise<void>
```

Stops sending. Persisted entries stay saved, and the client keeps its recovery state. Once its sends and saves
settle, a persistent outbox of the user created meanwhile in this JavaScript context continues with its saved
entries; otherwise another running one, or the next to start, takes them over.

Resolves once the outbox has stopped writing: what it was loading, taking over, sending and saving has settled,
and its storage is passed on or released. A send in flight is waited for until it finishes or times out. So on
sign-out, wait for it before clearing the storage. It never rejects; failures go to `onError`. Every call returns
the same promise.

### `ScopeRequiredProblem` class

```ts
class ScopeRequiredProblem extends ConvoHopProblem
```

`SCOPE_REQUIRED`: the backend key lacks a scope the operation requires (403, rejected, not retryable).
Classify it by `instanceof ConvoHopProblem` and `code`; `scope` is a diagnostic detail.

Re-exported from `@convohop/core`.

#### `ScopeRequiredProblem.code` property

```ts
readonly code: "SCOPE_REQUIRED"
```

#### `ScopeRequiredProblem.scope` property

```ts
readonly scope: string | undefined
```

The missing scope. The authority names it only in the message, so this is `undefined` when the message does not
match the documented wording. A missing read scope is reported as the read scope even where its manage scope
(for example `callManage` for `callRead`) would also satisfy the operation.

#### `ScopeRequiredProblem` constructor

```ts
constructor(requestId: string, outcome: string, status: number, message: string, options?: ErrorOptions & {
    retryAfter?: number;
})
```

#### `ScopeRequiredProblem.requestId` property

```ts
readonly requestId: string
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.outcome` property

```ts
readonly outcome: string
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.status` property

```ts
readonly status: number
```

Inherited from `ConvoHopProblem`.

#### `ScopeRequiredProblem.retryAfter` property

```ts
readonly retryAfter?: number
```

Whole seconds to wait before resending the same request, when the authority sent a delay (for example with
`RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds,
or from a realtime close reason's `retryAfter=`. A request the caller sends is never resent on its own; when
`@convohop/client` reconnects its stream or resends a queued message, it waits at least this long first.

Inherited from `ConvoHopProblem`.

### `TypingIndicator` class

```ts
class TypingIndicator
```

Sends throttled typing signals for one conversation while the user types. Signals are ephemeral: a lost signal
isn't retried, and other members' typing isn't delivered to this client. The indicator turns itself off when the
project doesn't support typing.

#### `TypingIndicator.client` property

```ts
readonly client: ConvoHopClient
```

#### `TypingIndicator.conversationId` property

```ts
readonly conversationId: string
```

#### `TypingIndicator` constructor

```ts
constructor(client: ConvoHopClient, conversationId: string, options?: TypingIndicatorOptions)
```

#### `TypingIndicator.enabled` property

```ts
get enabled(): boolean
set enabled(value: boolean)
```

#### `TypingIndicator.active` property

```ts
get active(): boolean
```

Whether the user counts as typing.

#### `TypingIndicator.input` method

```ts
input(): void
```

Call on every edit to the draft. Signals typing at most once per `intervalMs`.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `TypingIndicator.stop` method

```ts
stop(): void
```

Call when the user sends or clears the draft. Signals that typing stopped if it had started.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `TypingIndicator.dispose` method

```ts
dispose(): void
```

Sends [`communication.typing`](../../operations/communication/typing.md).

## Interfaces

### `AsyncRecoveryStorage` interface

```ts
interface AsyncRecoveryStorage
```

Re-exported from `@convohop/core`.

#### `AsyncRecoveryStorage.getItem` method

```ts
getItem(key: string): Promise<string | null>
```

#### `AsyncRecoveryStorage.setItem` method

```ts
setItem(key: string, value: string): Promise<void>
```

#### `AsyncRecoveryStorage.removeItem` method

```ts
removeItem(key: string): Promise<void>
```

### `CommandOptions` interface

```ts
interface CommandOptions
```

Re-exported from `@convohop/core`.

#### `CommandOptions.requestId` property

```ts
requestId?: string
```

### `Connectivity` interface

```ts
interface Connectivity
```

Network reachability.

Re-exported from `@convohop/core`.

#### `Connectivity.online` property

```ts
readonly online: boolean
```

Whether the device may reach the network. Report `true` when it isn't known.

#### `Connectivity.subscribe` method

```ts
subscribe(listener: (online: boolean) => void): () => void
```

Calls `listener` when reachability changes, until the returned function is called.

### `ConversationSnapshot` interface

```ts
interface ConversationSnapshot
```

#### `ConversationSnapshot.status` property

```ts
readonly status: ConversationStatus
```

#### `ConversationSnapshot.conversation` property

```ts
readonly conversation: Readonly<Conversation> | undefined
```

The conversation and the user's membership, once loaded.

#### `ConversationSnapshot.messages` property

```ts
readonly messages: readonly Readonly<ConversationMessage>[]
```

Loaded messages, oldest first. Deleted messages stay, with `deleted: true` and no text.

#### `ConversationSnapshot.pending` property

```ts
readonly pending: readonly OutboxEntry[]
```

This conversation's outbox entries that aren't in `messages` yet, in send order.

#### `ConversationSnapshot.receipts` property

```ts
readonly receipts: readonly Readonly<ReadReceipt>[]
```

Each member's delivery and read progress, ordered by principal.

#### `ConversationSnapshot.hasOlder` property

```ts
readonly hasOlder: boolean
```

Whether `ConversationStore.loadOlder` can load earlier messages.

#### `ConversationSnapshot.error` property

```ts
readonly error: Error | undefined
```

#### `ConversationSnapshot.resyncRequired` property

```ts
readonly resyncRequired: boolean
```

The saved replay position is no longer valid. Only `ConversationStore.resync` recovers.

### `ConversationStoreOptions` interface

```ts
interface ConversationStoreOptions
```

#### `ConversationStoreOptions.outbox` property

```ts
outbox?: Outbox
```

A shared outbox for optimistic sends. Without one the store uses its own, which `close()` closes.

#### `ConversationStoreOptions.onEvent` property

```ts
onEvent?: (event: ProtocolObject) => void
```

Called after each new event is applied, including call and live-session events the store doesn't track.

#### `ConversationStoreOptions.onError` property

```ts
onError?: (error: Error) => void
```

Called for every error, including realtime interruptions the store recovers from on its own.

### `ConvoHopClientOptions` interface

```ts
interface ConvoHopClientOptions
```

#### `ConvoHopClientOptions.baseUrl` property

```ts
baseUrl: string
```

#### `ConvoHopClientOptions.projectId` property

```ts
projectId: string
```

#### `ConvoHopClientOptions.sessionToken` property

```ts
sessionToken: string
```

#### `ConvoHopClientOptions.incarnation` property

```ts
incarnation: string
```

#### `ConvoHopClientOptions.principalId` property

```ts
principalId: string
```

#### `ConvoHopClientOptions.recoveryStorage` property

```ts
recoveryStorage?: RecoveryStorage
```

Synchronous storage, such as `localStorage`, for mutation recovery records and replay cursors. Never tokens.

#### `ConvoHopClientOptions.asyncRecoveryStorage` property

```ts
asyncRecoveryStorage?: AsyncRecoveryStorage
```

Asynchronous storage, such as React Native's AsyncStorage, used instead of `recoveryStorage`. Recovery records load
before the first command; replay cursors load when a replay starts.

#### `ConvoHopClientOptions.fetch` property

```ts
fetch?: typeof fetch
```

#### `ConvoHopClientOptions.sessionRefresh` property

```ts
sessionRefresh?: SessionRefresh
```

#### `ConvoHopClientOptions.platform` property

```ts
platform?: ConvoHopPlatform
```

Runtime services that replace missing browser globals, such as in React Native. See `ConvoHopPlatform`.

### `ConvoHopPlatform` interface

```ts
interface ConvoHopPlatform
```

Runtime services for runtimes that lack a browser global, such as React Native. Every field is optional and
falls back to the global of the same name, looked up when it is used. The transport uses `randomUUID`, `sha256`
and `URL`; `@convohop/client` also uses `WebSocket`, `connectivity` and `lifecycle`.

Re-exported from `@convohop/core`.

#### `ConvoHopPlatform.randomUUID` property

```ts
randomUUID?: () => string
```

A new random UUID in canonical lowercase form. Default: `crypto.randomUUID()`.

#### `ConvoHopPlatform.sha256` property

```ts
sha256?: (data: Uint8Array) => Promise<Uint8Array>
```

The 32-byte SHA-256 digest of `data`. Default: `crypto.subtle.digest("SHA-256", data)`.

#### `ConvoHopPlatform.URL` property

```ts
URL?: PlatformURLConstructor
```

A WHATWG URL constructor. Default: the global `URL`. The SDK checks it before first use and refuses one that doesn't conform.

#### `ConvoHopPlatform.WebSocket` property

```ts
WebSocket?: PlatformWebSocketConstructor
```

Opens the realtime connection. Default: the global `WebSocket`.

#### `ConvoHopPlatform.connectivity` property

```ts
connectivity?: Connectivity
```

Network reachability. The outbox waits while offline. Coming online starts a waiting outbox entry and realtime
reconnection at once. Default in browsers: `navigator.onLine` and `online`/`offline` events; elsewhere always online.

#### `ConvoHopPlatform.lifecycle` property

```ts
lifecycle?: Lifecycle
```

Foreground state. Returning to `active` starts waiting realtime reconnection, due outbox entries and due session
renewal at once. It never changes retry budgets, request IDs or payloads. Default in browsers: page visibility.

### `ConvoHopTransportOptions` interface

```ts
interface ConvoHopTransportOptions
```

Re-exported from `@convohop/core`.

#### `ConvoHopTransportOptions.baseUrl` property

```ts
baseUrl: string
```

#### `ConvoHopTransportOptions.credential` property

```ts
credential?: string
```

#### `ConvoHopTransportOptions.namespace` property

```ts
namespace: string
```

#### `ConvoHopTransportOptions.incarnation` property

```ts
incarnation?: string
```

#### `ConvoHopTransportOptions.recoveryStorage` property

```ts
recoveryStorage?: RecoveryStorage
```

#### `ConvoHopTransportOptions.asyncRecoveryStorage` property

```ts
asyncRecoveryStorage?: AsyncRecoveryStorage
```

#### `ConvoHopTransportOptions.fetch` property

```ts
fetch?: typeof fetch
```

#### `ConvoHopTransportOptions.platform` property

```ts
platform?: ConvoHopPlatform
```

Runtime services that replace missing globals, such as in React Native. See `ConvoHopPlatform`.

### `ItemPage` interface

```ts
interface ItemPage<T>
```

Re-exported from `@convohop/core`.

#### `ItemPage.items` property

```ts
items: T[]
```

#### `ItemPage.complete` property

```ts
complete: boolean
```

#### `ItemPage.refreshRequired` property

```ts
refreshRequired: boolean
```

#### `ItemPage.nextCursor` property

```ts
nextCursor?: unknown
```

### `Lifecycle` interface

```ts
interface Lifecycle
```

Whether the app is in the foreground.

Re-exported from `@convohop/core`.

#### `Lifecycle.state` property

```ts
readonly state: LifecycleState
```

#### `Lifecycle.subscribe` method

```ts
subscribe(listener: (state: LifecycleState) => void): () => void
```

Calls `listener` when the state changes, until the returned function is called.

### `LiveConnectOptions` interface

```ts
interface LiveConnectOptions extends MediaOptions, CommandOptions
```

#### `LiveConnectOptions.iceTransportPolicy` property

```ts
iceTransportPolicy?: "all" | "relay"
```

Inherited from `MediaOptions`.

#### `LiveConnectOptions.localVideo` property

```ts
localVideo?: HTMLVideoElement
```

Inherited from `MediaOptions`.

#### `LiveConnectOptions.onTrack` property

```ts
onTrack?: (track: RemoteMedia) => void
```

Inherited from `MediaOptions`.

#### `LiveConnectOptions.onTrackRemoved` property

```ts
onTrackRemoved?: (track: RemoteMedia) => void
```

Inherited from `MediaOptions`.

#### `LiveConnectOptions.onDisconnected` property

```ts
onDisconnected?: () => void
```

The media connection ended without `disconnect()`. Call `reconnect()` to connect again with fresh credentials.

Inherited from `MediaOptions`.

#### `LiveConnectOptions.onResuming` property

```ts
onResuming?: () => void
```

LiveKit lost the connection and is resuming it with the current or a server-refreshed token.

Inherited from `MediaOptions`.

#### `LiveConnectOptions.onResumed` property

```ts
onResumed?: () => void
```

LiveKit resumed the same native connection.

Inherited from `MediaOptions`.

#### `LiveConnectOptions.onAudioPlaybackBlocked` property

```ts
onAudioPlaybackBlocked?: () => void
```

Inherited from `MediaOptions`.

#### `LiveConnectOptions.requestId` property

```ts
requestId?: string
```

Inherited from `CommandOptions`.

### `LiveConnection` interface

```ts
interface LiveConnection
```

A native media connection opened by a `LiveConnector`.

#### `LiveConnection.connected` property

```ts
readonly connected: boolean
```

#### `LiveConnection.disconnect` method

```ts
disconnect(): Promise<void>
```

### `LiveConnectionAttempt` interface

```ts
interface LiveConnectionAttempt
```

One admitted native connection attempt. Send `token` only to `url`, and only once: the media server admits at most
one new connection with it, and it expires about 60 seconds after issue. Later resumes of that connection use the
same token or refresh tokens the media server pushes; a new connection needs a new attempt.

#### `LiveConnectionAttempt.requestId` property

```ts
readonly requestId: string
```

The `liveSessionCredentials` request that issued this attempt's grant.

#### `LiveConnectionAttempt.mode` property

```ts
readonly mode: "INITIAL" | "RECONNECT"
```

#### `LiveConnectionAttempt.url` property

```ts
readonly url: string
```

The media server's WebSocket URL: `wss:`, or `ws:` on a loopback host.

#### `LiveConnectionAttempt.token` property

```ts
readonly token: string
```

The single-use `connectToken`.

#### `LiveConnectionAttempt.leaseExpiresAt` property

```ts
readonly leaseExpiresAt: string
```

When the server's forwarding lease for this participation expires, unless renewed.

### `LiveWaitOptions` interface

```ts
interface LiveWaitOptions
```

#### `LiveWaitOptions.signal` property

```ts
signal?: AbortSignal
```

#### `LiveWaitOptions.timeoutMs` property

```ts
timeoutMs?: number
```

### `MediaOptions` interface

```ts
interface MediaOptions
```

#### `MediaOptions.iceTransportPolicy` property

```ts
iceTransportPolicy?: "all" | "relay"
```

#### `MediaOptions.localVideo` property

```ts
localVideo?: HTMLVideoElement
```

#### `MediaOptions.onTrack` property

```ts
onTrack?: (track: RemoteMedia) => void
```

#### `MediaOptions.onTrackRemoved` property

```ts
onTrackRemoved?: (track: RemoteMedia) => void
```

#### `MediaOptions.onDisconnected` property

```ts
onDisconnected?: () => void
```

The media connection ended without `disconnect()`. Call `reconnect()` to connect again with fresh credentials.

#### `MediaOptions.onResuming` property

```ts
onResuming?: () => void
```

LiveKit lost the connection and is resuming it with the current or a server-refreshed token.

#### `MediaOptions.onResumed` property

```ts
onResumed?: () => void
```

LiveKit resumed the same native connection.

#### `MediaOptions.onAudioPlaybackBlocked` property

```ts
onAudioPlaybackBlocked?: () => void
```

### `MediaStats` interface

```ts
interface MediaStats
```

#### `MediaStats.audioTracks` property

```ts
audioTracks: number
```

#### `MediaStats.videoTracks` property

```ts
videoTracks: number
```

#### `MediaStats.audioBytesReceived` property

```ts
audioBytesReceived: number
```

#### `MediaStats.videoBytesReceived` property

```ts
videoBytesReceived: number
```

#### `MediaStats.framesDecoded` property

```ts
framesDecoded: number
```

#### `MediaStats.localAudioEnabled` property

```ts
localAudioEnabled: boolean
```

#### `MediaStats.localVideoEnabled` property

```ts
localVideoEnabled: boolean
```

#### `MediaStats.tracks` property

```ts
tracks: {
    trackId: string;
    participantIdentity: string;
    kind: "audio" | "video";
    bytesReceived: number;
    framesDecoded: number;
}[]
```

#### `MediaStats.transports` property

```ts
transports?: {
    localCandidateType: string;
    remoteCandidateType: string;
    protocol: string;
    relayProtocol?: string;
}[]
```

### `OperationTypes` interface

```ts
interface OperationTypes
```

Re-exported from `@convohop/core`.

### `OutboxEntry` interface

```ts
interface OutboxEntry
```

#### `OutboxEntry.requestId` property

```ts
readonly requestId: string
```

#### `OutboxEntry.conversationId` property

```ts
readonly conversationId: string
```

#### `OutboxEntry.text` property

```ts
readonly text: string
```

#### `OutboxEntry.props` property

```ts
readonly props: Readonly<ProtocolObject>
```

#### `OutboxEntry.createdAt` property

```ts
readonly createdAt: string
```

#### `OutboxEntry.status` property

```ts
readonly status: OutboxStatus
```

#### `OutboxEntry.messageId` property

```ts
readonly messageId?: string
```

The committed message, when the authority returned it.

#### `OutboxEntry.receipt` property

```ts
readonly receipt?: SendReceipt
```

#### `OutboxEntry.error` property

```ts
readonly error?: Error
```

The latest failure: why a `failed` entry stopped, or why a waiting entry will retry.

#### `OutboxEntry.unconfirmed` property

```ts
readonly unconfirmed?: boolean
```

A failed entry may still have been delivered, so resending it can duplicate the message.

### `OutboxOptions` interface

```ts
interface OutboxOptions
```

#### `OutboxOptions.connectivity` property

```ts
connectivity?: Connectivity
```

Network reachability for this outbox. Default: the client's `platform.connectivity`, else the browser's.

#### `OutboxOptions.persist` property

```ts
persist?: boolean
```

Keep unsent messages, including their text, in the client's `recoveryStorage` or `asyncRecoveryStorage` across
reloads. Off by default; use one persistent outbox per client. Messages that may have been submitted are
recovered, never re-sent as new.

Each running persistent outbox of a user saves its messages separately, so tabs sharing `localStorage` keep each
other's. Up to 16 run at once; they coordinate through Web Locks, or within one JavaScript context where the
runtime has none. When one stops, such as when its tab closes or reloads, another running outbox takes over the
messages it left unsent; if none can yet, the next one to start, come back online or return to the foreground
does. An outbox created in the same JavaScript context while another closes, such as on a React remount,
continues with the closing one's messages instead. While it runs, the outbox holds a Web Lock, so Chromium won't
keep the page in its back/forward cache; close the outbox on `pagehide` if you need that.

Saved messages load in the background; they are sent before messages added meanwhile, and
`Outbox.flush` waits for them. `Outbox.send` refuses a message while 100 are unsent, but loading or
taking over saved messages can bring an outbox up to 200.

#### `OutboxOptions.onError` property

```ts
onError?: (error: Error) => void
```

Called when an entry fails and when persistence or a listener throws.

### `PageOptions` interface

```ts
interface PageOptions
```

Re-exported from `@convohop/core`.

#### `PageOptions.cursor` property

```ts
cursor?: string
```

#### `PageOptions.limit` property

```ts
limit?: number
```

### `PlatformURL` interface

```ts
interface PlatformURL
```

The parts of a WHATWG `URL` the SDKs read.

Re-exported from `@convohop/core`.

#### `PlatformURL.href` property

```ts
readonly href: string
```

#### `PlatformURL.origin` property

```ts
readonly origin: string
```

#### `PlatformURL.protocol` property

```ts
readonly protocol: string
```

#### `PlatformURL.username` property

```ts
readonly username: string
```

#### `PlatformURL.password` property

```ts
readonly password: string
```

#### `PlatformURL.host` property

```ts
readonly host: string
```

#### `PlatformURL.hostname` property

```ts
readonly hostname: string
```

#### `PlatformURL.port` property

```ts
readonly port: string
```

#### `PlatformURL.pathname` property

```ts
readonly pathname: string
```

#### `PlatformURL.search` property

```ts
readonly search: string
```

#### `PlatformURL.hash` property

```ts
readonly hash: string
```

### `PlatformWebSocket` interface

```ts
interface PlatformWebSocket
```

The parts of a `WebSocket` the client uses.

Re-exported from `@convohop/core`.

#### `PlatformWebSocket.onopen` property

```ts
onopen: Handler<unknown> | null
```

#### `PlatformWebSocket.onmessage` property

```ts
onmessage: Handler<{
    readonly data: unknown;
}> | null
```

#### `PlatformWebSocket.onerror` property

```ts
onerror: Handler<unknown> | null
```

#### `PlatformWebSocket.onclose` property

```ts
onclose: Handler<{
    readonly code: number;
    readonly reason?: string;
}> | null
```

#### `PlatformWebSocket.send` method

```ts
send(data: string): void
```

#### `PlatformWebSocket.close` method

```ts
close(code?: number, reason?: string): void
```

### `ProjectRoute` interface

```ts
interface ProjectRoute
```

Re-exported from `@convohop/core`.

#### `ProjectRoute.projectId` property

```ts
projectId: string
```

#### `ProjectRoute.incarnation` property

```ts
incarnation: string
```

#### `ProjectRoute.servingEpoch` property

```ts
servingEpoch: string
```

#### `ProjectRoute.communicationBase` property

```ts
communicationBase: string
```

#### `ProjectRoute.wssUrl` property

```ts
wssUrl: string
```

#### `ProjectRoute.expiresAt` property

```ts
expiresAt: string
```

#### `ProjectRoute.signature` property

```ts
signature: string
```

### `RecoveryState` interface

```ts
interface RecoveryState
```

A mutation's recovery record. `resolutionState` is how far its request is known to have gone: `pending` before its
first attempt, `unknown` while an attempt's outcome is unknown, `rejected` once the authority has rejected every
attempt, and `committed` or `accepted` once the authority has the request.

Re-exported from `@convohop/core`.

#### `RecoveryState.requestId` property

```ts
requestId: string
```

#### `RecoveryState.incarnation` property

```ts
incarnation: string
```

#### `RecoveryState.payloadFingerprint` property

```ts
payloadFingerprint: string
```

#### `RecoveryState.operation` property

```ts
operation: OperationKey
```

#### `RecoveryState.projectId` property

```ts
projectId?: string
```

#### `RecoveryState.input` property

```ts
input: ProtocolObject
```

#### `RecoveryState.firstSubmittedAt` property

```ts
firstSubmittedAt: number
```

#### `RecoveryState.retryDeadline` property

```ts
retryDeadline: number
```

#### `RecoveryState.attemptCount` property

```ts
attemptCount: number
```

#### `RecoveryState.lastAttemptAt` property

```ts
lastAttemptAt: number
```

#### `RecoveryState.lastAttemptClassification` property

```ts
lastAttemptClassification: string
```

#### `RecoveryState.resolutionState` property

```ts
resolutionState: "pending" | "unknown" | "rejected" | "committed" | "accepted"
```

#### `RecoveryState.mediaAdmissionAttempted` property

```ts
mediaAdmissionAttempted?: true
```

### `RecoveryStorage` interface

```ts
interface RecoveryStorage
```

Re-exported from `@convohop/core`.

#### `RecoveryStorage.getItem` method

```ts
getItem(key: string): string | null
```

#### `RecoveryStorage.setItem` method

```ts
setItem(key: string, value: string): void
```

#### `RecoveryStorage.removeItem` method

```ts
removeItem(key: string): void
```

### `RemoteMedia` interface

```ts
interface RemoteMedia
```

#### `RemoteMedia.trackId` property

```ts
trackId: string
```

#### `RemoteMedia.participantIdentity` property

```ts
participantIdentity: string
```

#### `RemoteMedia.kind` property

```ts
kind: "audio" | "video"
```

#### `RemoteMedia.element` property

```ts
element: HTMLMediaElement
```

### `SessionRefreshSchedule` interface

```ts
interface SessionRefreshSchedule
```

#### `SessionRefreshSchedule.leadMs` property

```ts
leadMs?: number
```

How long before the session expires to renew it, in milliseconds. Default 60000.

#### `SessionRefreshSchedule.onRefreshed` property

```ts
onRefreshed?: (session: SessionMetadata) => void
```

#### `SessionRefreshSchedule.onError` property

```ts
onError?: (error: Error) => void
```

### `TypingIndicatorOptions` interface

```ts
interface TypingIndicatorOptions
```

#### `TypingIndicatorOptions.intervalMs` property

```ts
intervalMs?: number
```

The shortest time between typing signals while the user keeps typing, in milliseconds. Default 3000.

#### `TypingIndicatorOptions.idleMs` property

```ts
idleMs?: number
```

How long after the last input the user stops typing, in milliseconds. Default 5000.

#### `TypingIndicatorOptions.enabled` property

```ts
enabled?: boolean
```

Whether to send signals. Pass `capabilities().features?.typing === true` to skip projects without typing.
Default true.

#### `TypingIndicatorOptions.onError` property

```ts
onError?: (error: Error) => void
```

### `WebPushSubscription` interface

```ts
interface WebPushSubscription
```

A Web Push subscription, as `PushSubscription.toJSON()` returns it.

#### `WebPushSubscription.endpoint` property

```ts
readonly endpoint?: string
```

#### `WebPushSubscription.expirationTime` property

```ts
readonly expirationTime?: number | null
```

#### `WebPushSubscription.keys` property

```ts
readonly keys?: Readonly<Record<string, string>>
```

## Types

### `Conversation` type

```ts
type Conversation = NonNullable<OperationPayload<"communication.getConversation">["result"]>
```

Re-exported from `@convohop/core`.

### `ConversationCursor` type

```ts
type ConversationCursor = NonNullable<NonNullable<OperationPayload<"communication.events">["result"]>["nextCursor"]>
```

Re-exported from `@convohop/core`.

### `ConversationMessage` type

```ts
type ConversationMessage = NonNullable<OperationPayload<"communication.getMessage">["result"]>
```

Re-exported from `@convohop/core`.

### `ConversationMute` type

```ts
type ConversationMute = OperationPayload<"communication.conversationMute">["result"]
```

Whether a member muted message push notifications for a conversation, and until when.

Re-exported from `@convohop/core`.

### `ConversationStatus` type

```ts
type ConversationStatus = "idle" | "loading" | "live" | "reconnecting" | "error" | "closed"
```

- `idle`: not opened yet.
- `loading`: loading the conversation, its newest messages and its receipts, then catching up.
- `live`: following the conversation.
- `reconnecting`: realtime updates were interrupted; the store is reconnecting on its own.
- `error`: updates stopped. See `error` and `resyncRequired`, then call `open()` or `resync()`.
- `closed`: `ConversationStore.close` was called.

### `InboxItem` type

```ts
type InboxItem = NonNullable<OperationPayload<"communication.inbox">["result"]>["items"][number]
```

One conversation in the user's inbox.

### `InboxPage` type

```ts
type InboxPage = ItemPage<InboxItem> & {
    partialReason?: string;
}
```

A page of the inbox. An incomplete page with no cursor carries `partialReason`, such as `INBOX_WINDOW_LIMIT`.

### `LifecycleState` type

```ts
type LifecycleState = "active" | "background"
```

Re-exported from `@convohop/core`.

### `LiveConnectionGrant` type

```ts
type LiveConnectionGrant = OperationPayload<"communication.liveSessionCredentials">["result"]
```

### `LiveConnector` type

```ts
type LiveConnector<C extends LiveConnection = LiveConnection> = (attempt: LiveConnectionAttempt) => Promise<C>
```

Opens one native connection for an admitted attempt, for example with a stock LiveKit SDK:
`async attempt => { await room.connect(attempt.url, attempt.token); return { get connected() { … }, disconnect: () => room.disconnect() }; }`.

### `LiveOperation` type

```ts
type LiveOperation = OperationPayload<"communication.liveSessionOperation">["result"]
```

### `LiveParticipation` type

```ts
type LiveParticipation = OperationPayload<"communication.joinLiveSession">["result"]["participation"]
```

### `LiveSession` type

```ts
type LiveSession = OperationPayload<"communication.liveSession">["result"]
```

### `Membership` type

```ts
type Membership = NonNullable<OperationPayload<"communication.members">["result"]>["items"][number]
```

Re-exported from `@convohop/core`.

### `OperationInput` type

```ts
type OperationInput<K extends OperationKey> = OperationTypes[K]["variables"] extends {
    input?: infer I;
} ? NonNullable<I> : Record<string, never>
```

Re-exported from `@convohop/core`.

### `OperationKey` type

```ts
type OperationKey = keyof OperationTypes
```

Re-exported from `@convohop/core`.

### `OperationPayload` type

```ts
type OperationPayload<K extends OperationKey> = OperationTypes[K]["result"][FieldName<K> & keyof OperationTypes[K]["result"]]
```

Re-exported from `@convohop/core`.

### `OutboxStatus` type

```ts
type OutboxStatus = "queued" | "sending" | "unknown" | "sent" | "failed"
```

- `queued`: waiting to be sent. Nothing about it can have committed.
- `sending`: a send, retry or resolution is in flight.
- `unknown`: an attempt's outcome is uncertain. The outbox recovers it with its original request ID.
- `sent`: committed. The entry stays until `Outbox.settle` or until newer sent entries evict it.
- `failed`: rejected, or no longer recoverable. `Outbox.resend` it as a new message or discard it.

### `PlatformURLConstructor` type

```ts
type PlatformURLConstructor = new (url: string, base?: string) => PlatformURL
```

A WHATWG URL constructor, such as the global `URL` or a polyfill's.

Re-exported from `@convohop/core`.

### `PlatformWebSocketConstructor` type

```ts
type PlatformWebSocketConstructor = new (url: string, protocols?: string | string[]) => PlatformWebSocket
```

Re-exported from `@convohop/core`.

### `ProjectCapabilities` type

```ts
type ProjectCapabilities = NonNullable<OperationPayload<"communication.capabilities">["result"]>
```

The project's features and limits, as `communication.capabilities` reports them.

### `ProtocolObject` type

```ts
type ProtocolObject = Record<string, unknown>
```

Re-exported from `@convohop/core`.

### `PushRegistration` type

```ts
type PushRegistration = {
    readonly kind: "webPush";
    readonly subscription: WebPushSubscription;
} | {
    readonly kind: "apns" | "apnsVoip";
    readonly token: string;
    readonly environment?: "development" | "production";
} | {
    readonly kind: "fcm";
    readonly token: string;
    readonly fid?: never;
} | {
    readonly kind: "fcm";
    readonly fid: string;
    readonly token?: never;
}
```

Where your backend sends one device's pushes. Every ConvoHop client hands your app this shape, so one backend
endpoint can store registrations from browsers and native apps. ConvoHop never sees them.

- `webPush`: a browser subscription; your backend signs pushes with its VAPID private key.
- `apns`: an iOS device token for alerts. `environment` says which APNs host accepts it, when the app knows.
- `apnsVoip`: an iOS PushKit token for incoming calls.
- `fcm`: an Android app's Firebase Cloud Messaging target, with exactly one of `token` and `fid`. `token` is the
  registration token, which apps get by default. `fid` is the Firebase Installation ID, which apps get instead when
  their manifest sets `firebase_messaging_installation_id_enabled`. Send to it with the FCM HTTP v1 target of the
  same name.

### `ReadReceipt` type

```ts
type ReadReceipt = NonNullable<OperationPayload<"communication.receipts">["result"]>["items"][number]
```

One member's delivery and read progress, valid for its membership and visibility epochs.

### `SearchHit` type

```ts
type SearchHit = NonNullable<OperationPayload<"communication.search">["result"]>["items"][number] & {
    message: ConversationMessage;
}
```

Re-exported from `@convohop/core`.

### `SendReceipt` type

```ts
type SendReceipt = NonNullable<OperationPayload<"communication.sendMessage">["result"]> & {
    cursor: ConversationCursor;
}
```

Re-exported from `@convohop/core`.

### `SessionBootstrap` type

```ts
type SessionBootstrap = SessionResult & {
    session: NonNullable<SessionResult["session"]>;
}
```

Re-exported from `@convohop/core`.

### `SessionMetadata` type

```ts
type SessionMetadata = OperationPayload<"communication.currentSession">["result"]
```

Re-exported from `@convohop/core`.

### `SessionRefresh` type

```ts
type SessionRefresh = (current: Readonly<SessionMetadata>) => Promise<SessionBootstrap>
```

Re-exported from `@convohop/core`.

### `SessionRefreshState` type

```ts
type SessionRefreshState = "disabled" | "uninitialized" | "ready" | "refreshing" | "blocked"
```

Re-exported from `@convohop/core`.

## Functions

### `parseConversation` function

```ts
function parseConversation(value: unknown): Conversation
```

Re-exported from `@convohop/core`.

### `parseCounter` function

```ts
function parseCounter(value: unknown): string
```

Re-exported from `@convohop/core`.

### `parseCursor` function

```ts
function parseCursor(value: unknown): ConversationCursor
```

Re-exported from `@convohop/core`.

### `parseId` function

```ts
function parseId(value: unknown): string
```

Re-exported from `@convohop/core`.

### `parseMembership` function

```ts
function parseMembership(value: unknown): Membership
```

Re-exported from `@convohop/core`.

### `parseMessage` function

```ts
function parseMessage(value: unknown): ConversationMessage
```

Re-exported from `@convohop/core`.

### `parseObject` function

```ts
function parseObject(value: unknown): ProtocolObject
```

Re-exported from `@convohop/core`.

### `parsePage` function

```ts
function parsePage<T>(value: unknown, parse: (value: unknown) => T): ItemPage<T>
```

Re-exported from `@convohop/core`.

### `parseSearchHit` function

```ts
function parseSearchHit(value: unknown): SearchHit
```

Re-exported from `@convohop/core`.

### `parseString` function

```ts
function parseString(value: unknown): string
```

Re-exported from `@convohop/core`.

## Constants

### `operationCatalog` constant

```ts
const operationCatalog: Record<OperationKey, OperationCatalogEntry>
```

Re-exported from `@convohop/core`.

## Namespaces

### `GraphqlTypes` namespace

```ts
namespace GraphqlTypes
```

Re-exported from `@convohop/core`.
