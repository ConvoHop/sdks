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
messages(id: string, beforeSequence?: string): Promise<ItemPage<ConversationMessage>>
```

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ConvoHopClient.send` method

```ts
send(id: string, text: string, requestId?: string): Promise<SendReceipt>
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
reportRead(id: string, membership: Membership, throughSequence: string): Promise<ProtocolObject>
```

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConvoHopClient.receipts` method

```ts
receipts(id: string): Promise<ItemPage<ProtocolObject>>
```

Sends [`communication.receipts`](../../operations/communication/receipts.md).

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
`RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds.
The SDK never waits or resends on its own because of it.

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

#### `MediaConnection.admissionId` property

```ts
admissionId: string | undefined
```

#### `MediaConnection.nativeConnectionId` property

```ts
nativeConnectionId: string | undefined
```

#### `MediaConnection.reconnect` method

```ts
reconnect(): Promise<MediaConnection>
```

Sends [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `MediaConnection.connected` property

```ts
get connected(): boolean
```

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
`RATE_LIMITED`). Read from the error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in seconds.
The SDK never waits or resends on its own because of it.

Inherited from `ConvoHopProblem`.

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

#### `ConvoHopClientOptions.fetch` property

```ts
fetch?: typeof fetch
```

#### `ConvoHopClientOptions.sessionRefresh` property

```ts
sessionRefresh?: SessionRefresh
```

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
resolutionState: "pending" | "unknown" | "committed" | "accepted"
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

### `LiveConnectionGrant` type

```ts
type LiveConnectionGrant = OperationPayload<"communication.liveSessionCredentials">["result"]
```

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

### `ProtocolObject` type

```ts
type ProtocolObject = Record<string, unknown>
```

Re-exported from `@convohop/core`.

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
