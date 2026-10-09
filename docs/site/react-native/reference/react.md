# `@convohop/react`

React hooks over the client SDK: conversations with offline-safe sends, typing, session renewal and calls. In React Native, connect call media with @convohop/react-native/media: useMediaConnection needs a browser.

**Layer:** Client. **Runtime:** React 18 or later, in React Native 0.76 or later. **Source:** `packages/react`.

## Interfaces

### `ConversationOptions` interface

```ts
interface ConversationOptions
```

#### `ConversationOptions.onEvent` property

```ts
onEvent?: ((event: ProtocolObject) => void) | undefined
```

Called after each new event is applied, including call and live-session events the store doesn't track.

#### `ConversationOptions.onError` property

```ts
onError?: ((error: Error) => void) | undefined
```

Called for every error, including realtime interruptions the store recovers from on its own.

### `ConversationView` interface

```ts
interface ConversationView extends ConversationSnapshot
```

A conversation's state and the actions on it. Actions reject, and `send` throws, until the conversation's store exists.

#### `ConversationView.store` property

```ts
readonly store: ConversationStore | undefined
```

The store following the conversation, or undefined without a conversation ID and before the first effect runs.

#### `ConversationView.send` method

```ts
send(text: string, props?: ProtocolObject): OutboxEntry
```

Queues a message in the outbox. It shows in `pending` until it appears in `messages`.

Sends [`communication.resolveRequest`](../../operations/communication/resolveRequest.md) and [`communication.sendMessage`](../../operations/communication/sendMessage.md).

#### `ConversationView.open` method

```ts
open(): Promise<void>
```

Reconnects after an error, from the loaded state.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConversationView.resync` method

```ts
resync(): Promise<void>
```

Discards the replay position and reloads the conversation; needed when `resyncRequired` is set.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

#### `ConversationView.loadOlder` method

```ts
loadOlder(): Promise<boolean>
```

Loads the previous page of messages. Resolves whether it added any.

Sends [`communication.messages`](../../operations/communication/messages.md).

#### `ConversationView.markRead` method

```ts
markRead(): Promise<boolean>
```

Reports reading through the newest loaded message. Resolves whether a report was needed.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConversationView.markDelivered` method

```ts
markDelivered(): Promise<boolean>
```

Reports delivery through the newest loaded message. Resolves whether a report was needed.

Sends [`communication.reportReceipt`](../../operations/communication/reportReceipt.md).

#### `ConversationView.status` property

```ts
readonly status: ConversationStatus
```

Inherited from `ConversationSnapshot`.

#### `ConversationView.conversation` property

```ts
readonly conversation: Readonly<Conversation> | undefined
```

The conversation and the user's membership, once loaded.

Inherited from `ConversationSnapshot`.

#### `ConversationView.messages` property

```ts
readonly messages: readonly Readonly<ConversationMessage>[]
```

Loaded messages, oldest first. Deleted messages stay, with `deleted: true` and no text.

Inherited from `ConversationSnapshot`.

#### `ConversationView.pending` property

```ts
readonly pending: readonly OutboxEntry[]
```

This conversation's outbox entries that aren't in `messages` yet, in send order.

Inherited from `ConversationSnapshot`.

#### `ConversationView.receipts` property

```ts
readonly receipts: readonly Readonly<ReadReceipt>[]
```

Each member's delivery and read progress, ordered by principal.

Inherited from `ConversationSnapshot`.

#### `ConversationView.hasOlder` property

```ts
readonly hasOlder: boolean
```

Whether `ConversationStore.loadOlder` can load earlier messages.

Inherited from `ConversationSnapshot`.

#### `ConversationView.error` property

```ts
readonly error: Error | undefined
```

Inherited from `ConversationSnapshot`.

#### `ConversationView.resyncRequired` property

```ts
readonly resyncRequired: boolean
```

The saved replay position is no longer valid. Only `ConversationStore.resync` recovers.

Inherited from `ConversationSnapshot`.

### `ConvoHopProviderProps` interface

```ts
interface ConvoHopProviderProps
```

#### `ConvoHopProviderProps.client` property

```ts
readonly client: ConvoHopClient
```

The signed-in user's client. Create it outside the provider, or above it, and close it when the user signs out.

#### `ConvoHopProviderProps.outbox` property

```ts
readonly outbox?: Outbox | undefined
```

The outbox every conversation below sends through. Without one, each conversation's store sends through an outbox
of its own, which stops sending when the component unmounts.

#### `ConvoHopProviderProps.children` property

```ts
readonly children?: ReactNode
```

### `LiveSessionState` interface

```ts
interface LiveSessionState
```

#### `LiveSessionState.status` property

```ts
readonly status: LiveSessionStatus
```

#### `LiveSessionState.session` property

```ts
readonly session: LiveSessionHandle | null | undefined
```

The conversation's current live session, `null` when none is running, and undefined until it first loads.

#### `LiveSessionState.error` property

```ts
readonly error: Error | undefined
```

Why the last load failed. `session` keeps the value last loaded.

### `LiveSessionView` interface

```ts
interface LiveSessionView extends LiveSessionState
```

#### `LiveSessionView.refresh` method

```ts
refresh(): Promise<void>
```

Loads the current live session again; a failure shows in `error`. Calls during a load share one more load after it.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

#### `LiveSessionView.status` property

```ts
readonly status: LiveSessionStatus
```

Inherited from `LiveSessionState`.

#### `LiveSessionView.session` property

```ts
readonly session: LiveSessionHandle | null | undefined
```

The conversation's current live session, `null` when none is running, and undefined until it first loads.

Inherited from `LiveSessionState`.

#### `LiveSessionView.error` property

```ts
readonly error: Error | undefined
```

Why the last load failed. `session` keeps the value last loaded.

Inherited from `LiveSessionState`.

### `MediaConnectionState` interface

```ts
interface MediaConnectionState
```

#### `MediaConnectionState.status` property

```ts
readonly status: MediaConnectionStatus
```

#### `MediaConnectionState.connection` property

```ts
readonly connection: MediaConnection | undefined
```

The latest connection: use it for the microphone, camera and stats. It stays after a disconnection, for `reconnect()`.

#### `MediaConnectionState.tracks` property

```ts
readonly tracks: readonly RemoteMedia[]
```

Remote audio and video, in subscription order. Add each `element` to the page, for example from a ref callback.

#### `MediaConnectionState.audioBlocked` property

```ts
readonly audioBlocked: boolean
```

The browser blocked remote audio: call `enableAudio()` from a user gesture, such as a click.

#### `MediaConnectionState.error` property

```ts
readonly error: Error | undefined
```

Why the last connect or reconnect failed.

### `MediaConnectionView` interface

```ts
interface MediaConnectionView extends MediaConnectionState
```

#### `MediaConnectionView.connect` method

```ts
connect(participation: LiveParticipationHandle, options?: LiveConnectOptions): Promise<MediaConnection>
```

Connects a participation's media with `livekit-client`. Call it from a user gesture, so the browser allows audio and
each admission is used once. Rejects while this hook's connection is connecting or connected, or when the
participation's media is connected elsewhere.

#### `MediaConnectionView.reconnect` method

```ts
reconnect(): Promise<MediaConnection>
```

Connects again with fresh credentials, typically after `disconnected`.

#### `MediaConnectionView.disconnect` method

```ts
disconnect(): Promise<void>
```

Disconnects. A connection still opening closes as soon as it opens.

#### `MediaConnectionView.enableAudio` method

```ts
enableAudio(): Promise<void>
```

Plays the remote audio the browser blocked. Call it from a user gesture.

#### `MediaConnectionView.status` property

```ts
readonly status: MediaConnectionStatus
```

Inherited from `MediaConnectionState`.

#### `MediaConnectionView.connection` property

```ts
readonly connection: MediaConnection | undefined
```

The latest connection: use it for the microphone, camera and stats. It stays after a disconnection, for `reconnect()`.

Inherited from `MediaConnectionState`.

#### `MediaConnectionView.tracks` property

```ts
readonly tracks: readonly RemoteMedia[]
```

Remote audio and video, in subscription order. Add each `element` to the page, for example from a ref callback.

Inherited from `MediaConnectionState`.

#### `MediaConnectionView.audioBlocked` property

```ts
readonly audioBlocked: boolean
```

The browser blocked remote audio: call `enableAudio()` from a user gesture, such as a click.

Inherited from `MediaConnectionState`.

#### `MediaConnectionView.error` property

```ts
readonly error: Error | undefined
```

Why the last connect or reconnect failed.

Inherited from `MediaConnectionState`.

### `SessionRefreshOptions` interface

```ts
interface SessionRefreshOptions
```

#### `SessionRefreshOptions.leadMs` property

```ts
leadMs?: number | undefined
```

How long before the session expires to renew it, in milliseconds. Default 60000.

#### `SessionRefreshOptions.enabled` property

```ts
enabled?: boolean | undefined
```

Whether to keep the session renewed. Default true.

#### `SessionRefreshOptions.onRefreshed` property

```ts
onRefreshed?: ((session: SessionMetadata) => void) | undefined
```

#### `SessionRefreshOptions.onError` property

```ts
onError?: ((error: Error) => void) | undefined
```

### `TypingControls` interface

```ts
interface TypingControls
```

#### `TypingControls.input` method

```ts
input(): void
```

Call on every edit to the draft.

Sends [`communication.typing`](../../operations/communication/typing.md).

#### `TypingControls.stop` method

```ts
stop(): void
```

Call when the user sends or clears the draft.

Sends [`communication.typing`](../../operations/communication/typing.md).

### `TypingOptions` interface

```ts
interface TypingOptions
```

#### `TypingOptions.intervalMs` property

```ts
intervalMs?: number | undefined
```

The shortest time between typing signals while the user keeps typing, in milliseconds. Default 3000.

#### `TypingOptions.idleMs` property

```ts
idleMs?: number | undefined
```

How long after the last input the user stops typing, in milliseconds. Default 5000.

#### `TypingOptions.enabled` property

```ts
enabled?: boolean | undefined
```

Whether to send signals. Pass `capabilities().features?.typing === true` to skip projects without typing. Default true.

#### `TypingOptions.onError` property

```ts
onError?: ((error: Error) => void) | undefined
```

## Types

### `LiveSessionStatus` type

```ts
type LiveSessionStatus = "idle" | "loading" | "ready" | "error"
```

### `MediaConnectionStatus` type

```ts
type MediaConnectionStatus = "idle" | "connecting" | "connected" | "resuming" | "disconnected" | "failed"
```

## Functions

### `ConvoHopProvider` function

```ts
function ConvoHopProvider({ client, outbox, children }: ConvoHopProviderProps): ReactElement
```

Makes a client, and optionally a shared outbox, available to the hooks below it. It doesn't own or close either.

### `useConversation` function

```ts
function useConversation(conversationId: string | null | undefined, options?: ConversationOptions): ConversationView
```

Follows a conversation while the component is mounted: it loads the conversation, keeps it live through
reconnects and session refreshes, and sends optimistically through the provider's outbox. A new `conversationId`,
client or outbox closes the old store and opens a new one; `null` closes it.

Sends [`communication.getConversation`](../../operations/communication/getConversation.md), [`communication.messages`](../../operations/communication/messages.md), [`communication.getMessage`](../../operations/communication/getMessage.md), [`communication.events`](../../operations/communication/events.md), [`communication.receipts`](../../operations/communication/receipts.md) and [`communication.conversationEvents`](../../operations/communication/conversationEvents.md).

### `useConvoHopClient` function

```ts
function useConvoHopClient(): ConvoHopClient
```

The provider's client.

### `useLiveSession` function

```ts
function useLiveSession(conversationId: string | null | undefined): LiveSessionView
```

The conversation's current live session. It loads when the component mounts and again after each live-session event
that a mounted `useConversation` for the same conversation, under the same provider, receives. Call `refresh()`
in other cases, for example when a call push notification arrives.

Sends [`communication.currentLiveSession`](../../operations/communication/currentLiveSession.md).

### `useMediaConnection` function

```ts
function useMediaConnection(): MediaConnectionView
```

Connects a live-session participation's media in the browser and tracks its remote audio and video. Unmounting
disconnects. Browser only: on React Native, connect with `participation.connectWith` and a native LiveKit SDK.

### `useOutbox` function

```ts
function useOutbox(outbox?: Outbox): readonly OutboxEntry[]
```

The entries of `outbox`, or of the provider's outbox, in send order.

### `useSessionRefresh` function

```ts
function useSessionRefresh(options?: SessionRefreshOptions): void
```

Renews the provider client's session before it expires while the component is mounted. Needs `sessionRefresh`;
without it, throws `SESSION_REFRESH_REQUIRED` to the nearest error boundary.

Sends [`communication.route`](../../operations/communication/route.md) and [`communication.currentSession`](../../operations/communication/currentSession.md).

### `useTyping` function

```ts
function useTyping(conversationId: string | null | undefined, options?: TypingOptions): TypingControls
```

Sends throttled typing signals for a conversation while the user types. Unmounting, or a new conversation, signals
that typing stopped. The returned functions keep their identity.

Sends [`communication.typing`](../../operations/communication/typing.md).
