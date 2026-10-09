# `@convohop/react-native`

React Native support for the client SDK: the platform it needs on Hermes, push registration and notifications through APNs, PushKit and FCM, and calls in CallKit and Android's Telecom.

**Layer:** Client. **Runtime:** React Native 0.76 or later with the New Architecture: Android 7.0 or later, and iOS 15.1 or later with React Native 0.84 or later. **Source:** `packages/react-native`.

## Interfaces

### `AbortSignalLike` interface

```ts
interface AbortSignalLike
```

The part of an `AbortSignal` this package uses, such as one from React Native's `AbortController`.

#### `AbortSignalLike.aborted` property

```ts
readonly aborted: boolean
```

#### `AbortSignalLike.reason` property

```ts
readonly reason?: unknown
```

#### `AbortSignalLike.addEventListener` method

```ts
addEventListener(type: "abort", listener: () => void): void
```

#### `AbortSignalLike.removeEventListener` method

```ts
removeEventListener(type: "abort", listener: () => void): void
```

### `Call` interface

```ts
interface Call
```

A call the system knows about: CallKit on iOS, Telecom on Android.

#### `Call.id` property

```ts
readonly id: string
```

The CallKit call UUID on iOS, the ring's `alertId` on Android.

#### `Call.alertId` property

```ts
readonly alertId?: string
```

The ring that started an incoming call.

#### `Call.liveSessionId` property

```ts
readonly liveSessionId: string
```

#### `Call.conversationId` property

```ts
readonly conversationId?: string
```

#### `Call.outgoing` property

```ts
readonly outgoing: boolean
```

#### `Call.hasVideo` property

```ts
readonly hasVideo: boolean
```

#### `Call.mediaProfile` property

```ts
readonly mediaProfile?: string
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.

#### `Call.callerName` property

```ts
readonly callerName?: string
```

#### `Call.expiresAt` property

```ts
readonly expiresAt?: number
```

When an unanswered ring stops, in milliseconds since the epoch.

#### `Call.state` property

```ts
readonly state: CallState
```

#### `Call.muted` property

```ts
readonly muted: boolean
```

#### `Call.endReason` property

```ts
readonly endReason?: CallEndReason
```

Set once `state` is `ended`.

#### `Call.serverReason` property

```ts
readonly serverReason?: string
```

The server's reason for stopping the ring, such as `answered`, when the server stopped it.

#### `Call.audioRoute` property

```ts
readonly audioRoute?: AudioRoute
```

Android: the current audio route.

#### `Call.availableAudioRoutes` property

```ts
readonly availableAudioRoutes: readonly AudioRoute[]
```

Android: the routes `setAudioRoute` accepts.

### `CallEvent` interface

```ts
interface CallEvent
```

#### `CallEvent.type` property

```ts
readonly type: CallEventType
```

#### `CallEvent.call` property

```ts
readonly call: Call
```

### `CallUpdate` interface

```ts
interface CallUpdate
```

#### `CallUpdate.callerName` property

```ts
callerName?: string
```

#### `CallUpdate.hasVideo` property

```ts
hasVideo?: boolean
```

### `NetInfoSource` interface

```ts
interface NetInfoSource
```

The part of `@react-native-community/netinfo` the platform uses. Pass its default export.

#### `NetInfoSource.addEventListener` method

```ts
addEventListener(listener: (state: {
    readonly isConnected: boolean | null;
}) => void): () => void
```

### `NotificationResponse` interface

```ts
interface NotificationResponse
```

A ConvoHop push the app received while running (`received`) or that the user opened (`opened`).

#### `NotificationResponse.action` property

```ts
readonly action: "received" | "opened"
```

#### `NotificationResponse.notification` property

```ts
readonly notification: PushNotification
```

### `OutgoingCallRequest` interface

```ts
interface OutgoingCallRequest
```

#### `OutgoingCallRequest.liveSessionId` property

```ts
liveSessionId: string
```

#### `OutgoingCallRequest.conversationId` property

```ts
conversationId: string
```

#### `OutgoingCallRequest.handle` property

```ts
handle: string
```

What the system shows and puts in its call history to identify the other side, such as a user name.

#### `OutgoingCallRequest.displayName` property

```ts
displayName?: string
```

#### `OutgoingCallRequest.hasVideo` property

```ts
hasVideo?: boolean
```

### `PlatformOptions` interface

```ts
interface PlatformOptions
```

#### `PlatformOptions.netInfo` property

```ts
netInfo?: NetInfoSource
```

`@react-native-community/netinfo`'s default export. The outbox then waits while the device is offline, and
the client resumes as soon as it is back. Without it, the platform always reports online.

### `PushPermissionRequest` interface

```ts
interface PushPermissionRequest
```

iOS presentation options to request. Android ignores them and requests `POST_NOTIFICATIONS` on Android 13+.

#### `PushPermissionRequest.alert` property

```ts
alert?: boolean
```

#### `PushPermissionRequest.badge` property

```ts
badge?: boolean
```

#### `PushPermissionRequest.sound` property

```ts
sound?: boolean
```

#### `PushPermissionRequest.provisional` property

```ts
provisional?: boolean
```

iOS 12+: deliver quietly without asking. The user can promote or turn off notifications later.

### `PushRecipient` interface

```ts
interface PushRecipient
```

The user whose ConvoHop pushes this device accepts: the signed-in user.

#### `PushRecipient.projectId` property

```ts
readonly projectId: string
```

The client's `projectId`.

#### `PushRecipient.recipientId` property

```ts
readonly recipientId: string
```

The user's principal ID: the client's `principalId`.

### `ReactNativePlatform` interface

```ts
interface ReactNativePlatform extends ConvoHopPlatform
```

A `ConvoHopPlatform` for React Native: pass it as `ConvoHopClient`'s `platform` option.

#### `ReactNativePlatform.randomUUID` property

```ts
readonly randomUUID: () => string
```

Version 4 UUIDs from the platform's secure generator.

#### `ReactNativePlatform.sha256` property

```ts
readonly sha256: (data: Uint8Array) => Promise<Uint8Array>
```

#### `ReactNativePlatform.URL` property

```ts
readonly URL: PlatformURLConstructor
```

A WHATWG URL constructor. Hosts must be ASCII: write internationalized domain names in Punycode.

#### `ReactNativePlatform.connectivity` property

```ts
readonly connectivity: Connectivity
```

NetInfo's `isConnected`. Unknown counts as online.

#### `ReactNativePlatform.lifecycle` property

```ts
readonly lifecycle: Lifecycle
```

`AppState`: `background` is background, and every other state, including iOS's `inactive`, is active.

#### `ReactNativePlatform.dispose` method

```ts
dispose(): void
```

Removes the platform's AppState and NetInfo listeners. Its state stops changing.

#### `ReactNativePlatform.WebSocket` property

```ts
WebSocket?: PlatformWebSocketConstructor
```

Opens the realtime connection. Default: the global `WebSocket`.

Inherited from `ConvoHopPlatform`.

### `RegisterForPushOptions` interface

```ts
interface RegisterForPushOptions
```

#### `RegisterForPushOptions.register` property

```ts
register: (registration: NativePushRegistration) => Promise<void> | void
```

Stores the registration with your backend, for the signed-in user, so it can send pushes to this device. Called
once for each registration this sees: the current ones, then each new one. On iOS that is the APNs token and, when
the app receives calls, the PushKit token. On Android it is the FCM registration token or FID, which change when
the app's data is cleared or Firebase replaces them. A registration your backend fails to store is offered again
if the platform reports it again.

#### `RegisterForPushOptions.unregister` property

```ts
unregister?: (registration: NativePushRegistration) => Promise<void> | void
```

Deletes a registration from your backend when Android reports that FCM unregistered it, so pushes to it stop:
after `unregisterFromPush`, or when Firebase unregisters the FID itself. The same report can arrive more than
once. If FCM registers that token or FID again, `register` gets it again. iOS never calls it.

#### `RegisterForPushOptions.onError` property

```ts
onError?: (error: unknown) => void
```

Receives the errors that don't reject `registerForPush`: failures after it resolved, and PushKit failures. By
default they go to React Native's error handler.

#### `RegisterForPushOptions.timeoutMs` property

```ts
timeoutMs?: number
```

How long to wait for the APNs token or the FCM registration to be stored, in milliseconds. Default 30000.

#### `RegisterForPushOptions.signal` property

```ts
signal?: AbortSignalLike
```

Stops registering when it aborts, as the function `registerForPush` resolves does. If that hasn't resolved yet,
it rejects with the signal's `reason`. Use it to sign out, or to clean up an effect, without waiting for the
platform or your backend.

### `WatchRingingOptions` interface

```ts
interface WatchRingingOptions
```

#### `WatchRingingOptions.intervalMs` property

```ts
intervalMs?: number
```

How often to check while an incoming call rings, in milliseconds: 1000 to 60000. Defaults to 3000.

#### `WatchRingingOptions.onError` property

```ts
onError?: (error: unknown) => void
```

Receives errors from checking, until watching stops; checking continues. By default React Native's error handler reports them.

## Types

### `AudioRoute` type

```ts
type AudioRoute = "earpiece" | "speaker" | "bluetooth" | "wiredHeadset" | "streaming" | "unknown"
```

### `CallEndReason` type

```ts
type CallEndReason = "rejected" | "hungUp" | "answeredElsewhere" | "declinedElsewhere" | "missed" | "expired" | "stopped" | "failed"
```

Why a call ended:
- `rejected`: the user declined it here.
- `hungUp`: the user or the app ended it here.
- `answeredElsewhere`, `declinedElsewhere`: another of the user's devices handled the ring.
- `missed`: the caller stopped calling before anyone answered.
- `expired`: the ring timed out.
- `stopped`: the server stopped the ring for another reason; see `Call.serverReason`.
- `failed`: the system couldn't place or keep the call.

### `CallEventType` type

```ts
type CallEventType = "incoming" | "outgoing" | "answered" | "ended" | "changed"
```

`answered` means the user answered a ringing call in the system UI or with `answerCall`.

### `CallState` type

```ts
type CallState = "ringing" | "connecting" | "active" | "held" | "ended"
```

- `ringing`: an incoming call is ringing.
- `connecting`: the user answered, or started an outgoing call, and the app is joining its media.
- `active`: the app reported the call connected.
- `held`: the system or the user put the call on hold.
- `ended`: see `Call.endReason`.

### `NativePushRegistration` type

```ts
type NativePushRegistration = Exclude<PushRegistration, {
    readonly kind: "webPush";
}>
```

A push registration from a native app: an APNs or PushKit token on iOS. On Android, an FCM registration token, or
the Firebase installation ID (FID) when the app registers with FCM by FID. Your backend sends FCM messages to
whichever it got.

### `PushPermission` type

```ts
type PushPermission = "granted" | "provisional" | "denied" | "undetermined"
```

Whether the app may show notifications. `provisional` is iOS's quiet delivery to Notification Center.

### `RemoteMessageResult` type

```ts
type RemoteMessageResult = "notConvoHop" | "invalid" | "ignored" | "message" | "ringing" | "stopped" | "missed"
```

What the native handler did with an Android data message:
- `notConvoHop`: the message isn't a ConvoHop push. Handle it yourself.
- `invalid`: it is a ConvoHop push that doesn't match the push payload contract. It was dropped.
- `ignored`: a duplicate, or a ring for a call that already stopped.
- `message`: it showed a message notification.
- `ringing`: it started ringing an incoming call.
- `stopped`: it stopped a ring that was answered or declined, on any device.
- `missed`: it stopped a ring nobody answered and showed a missed call.

### `RingingClient` type

```ts
type RingingClient = Pick<ConvoHopClient, "liveAlerts" | "liveSession">
```

The client methods `watchRingingCalls` uses.

## Functions

### `answerCall` function

```ts
function answerCall(callId: string): Promise<void>
```

Answers a ringing call, as if the user answered it in the system UI. Its `answered` event follows.

### `canUseFullScreenIntent` function

```ts
function canUseFullScreenIntent(): Promise<boolean>
```

Whether incoming calls can ring full screen over the lock screen. Android 14 and later grant this only to calling
and alarm apps, and users can revoke it; without it, a call rings as a heads-up notification. iOS resolves `true`.

### `createPlatform` function

```ts
function createPlatform(options?: PlatformOptions): ReactNativePlatform
```

Creates the React Native platform for `@convohop/client`. It listens to `AppState`, and to NetInfo when you pass
it, from creation until `ReactNativePlatform.dispose`. Create one for the app and share it between clients.

### `endCall` function

```ts
function endCall(callId: string): Promise<void>
```

Declines a ringing call, or hangs up any other. Leave the live session too, if you joined it.

### `forgetCall` function

```ts
function forgetCall(callId: string): Promise<boolean>
```

Drops an ended call from `getCalls`. Resolves `false` for a call that hasn't ended.

### `getCalls` function

```ts
function getCalls(): Promise<Call[]>
```

The current calls, and ended calls the system still remembers, for up to a minute or until `forgetCall`.

### `getPushPermission` function

```ts
function getPushPermission(): Promise<PushPermission>
```

The current notification permission.

### `getPushRegistrations` function

```ts
function getPushRegistrations(): Promise<NativePushRegistration[]>
```

The push registrations this process has seen: the APNs and PushKit tokens on iOS, the FCM token or FID on Android.

### `handleRemoteMessage` function

```ts
function handleRemoteMessage(data: Readonly<Record<string, string>>): Promise<RemoteMessageResult>
```

Android: hands an FCM data message to the native ConvoHop handler, which shows message notifications and rings
calls. Use it when another library, such as React Native Firebase, owns your `FirebaseMessagingService`. Without
one, the ConvoHop service receives pushes itself and you don't need this.

### `onCallEvent` function

```ts
function onCallEvent(listener: (event: CallEvent) => void): () => void
```

Calls `listener` for each change to a call. Returns a function that stops listening.

### `onNotification` function

```ts
function onNotification(listener: (response: NotificationResponse) => void): () => void
```

Calls `listener` for each ConvoHop push the app receives while running and each one the user opens. The native
modules present pushes and ring calls themselves; use this to update your UI or navigate.

### `openFullScreenIntentSettings` function

```ts
function openFullScreenIntentSettings(): Promise<void>
```

Android 14 and later: opens the setting that lets this app ring full screen.

### `registerForPush` function

```ts
function registerForPush(options: RegisterForPushOptions): Promise<() => void>
```

Registers this device for ConvoHop pushes. It starts the platform's registration and passes each registration to
your `register` callback, which stores it with your backend. It resolves once the APNs token (iOS) or the FCM
registration (Android) is stored, and keeps passing new registrations until you call the function it resolves or
abort `signal`. It rejects when the platform can't register, `register` fails for that registration, `timeoutMs`
passes first, or `signal` aborts first.

Call it after sign-in on every launch, after `setPushRecipient`: registrations change, and your backend should keep
the latest for each user. The same registration arrives again on later launches, so store it idempotently. On
sign-out, abort `signal` or call the function it resolves, then `unregisterFromPush` on Android. Android follows
your app's FCM mode: it registers by FID when the app manifest sets `firebase_messaging_installation_id_enabled`,
and by registration token otherwise; see the README. Tokens and FIDs address this device for your push provider.
Don't log them.

### `reportConnected` function

```ts
function reportConnected(callId: string): Promise<void>
```

Tells the system the call's media connected. The call becomes `active`.

### `reportConnecting` function

```ts
function reportConnecting(callId: string): Promise<void>
```

Tells the system the app is joining the call's media.

### `requestPushPermission` function

```ts
function requestPushPermission(request?: PushPermissionRequest): Promise<PushPermission>
```

Asks the user for notification permission, unless they already decided, and resolves the result. By default it
asks for alerts, badges and sounds.

### `setAudioRoute` function

```ts
function setAudioRoute(callId: string, route: Exclude<AudioRoute, "unknown">): Promise<void>
```

Android: routes the call's audio to one of its `availableAudioRoutes`. On iOS, show the system route picker.

### `setHeld` function

```ts
function setHeld(callId: string, held: boolean): Promise<void>
```

### `setMuted` function

```ts
function setMuted(callId: string, muted: boolean): Promise<void>
```

Mutes or unmutes the call in the system UI. Mute your LiveKit microphone track from its `changed` event.

### `setPushRecipient` function

```ts
function setPushRecipient(recipient: PushRecipient | null): Promise<void>
```

Sets the user whose ConvoHop pushes this device shows and rings, or `null` for nobody. Call it with the client's
`projectId` and `principalId` after sign-in, before `registerForPush`, and with `null` when sign-out starts. The
device keeps the two IDs, never a credential, so the filter also applies to a push that starts the app before
JavaScript runs.

The native handlers drop every ConvoHop push for anyone else, and `onNotification` and `takeInitialNotification`
never see it. Until the first call, and after `null`, they drop every ConvoHop push, so a registration your backend
failed to delete reaches nobody. iOS still reports a dropped VoIP push to CallKit, which ends it at once. On iOS, a
message push that arrives while the app isn't in the foreground is shown by iOS itself: see the README.

### `startOutgoingCall` function

```ts
function startOutgoingCall(request: OutgoingCallRequest): Promise<string>
```

iOS: reports an outgoing call to CallKit, which then owns its audio session, and resolves the call's ID. Then join
the live session and report progress with `reportConnecting` and `reportConnected`. On Android, join
without the system call UI.

### `stopRinging` function

```ts
function stopRinging(callId: string, serverReason: string): Promise<void>
```

Stops a ring the server stopped, such as one answered on another device, when your app learns of it before the
cancellation push arrives. `serverReason` is the server's reason, such as `answered`, `declined` or `ended`. It
leaves a call that isn't ringing unchanged, such as one the user just answered on this device.

### `subscribeAnsweredCalls` function

```ts
function subscribeAnsweredCalls(listener: (call: Call) => void): () => void
```

Calls `listener` once for each incoming call the user answered: in the system UI, from a notification, or with
`answerCall`. It first replays answered calls that are still current, so a call answered on the lock screen
before JavaScript started isn't lost. Join each call's live session from the listener, and skip calls you already
joined. Returns a function that stops listening.

### `takeInitialNotification` function

```ts
function takeInitialNotification(): Promise<NotificationResponse | null>
```

The ConvoHop notification the user opened to launch the app. Resolves it once, then `null`.

### `unregisterFromPush` function

```ts
function unregisterFromPush(): Promise<NativePushRegistration | null>
```

Android: unregisters this device from FCM, for example when the user signs out. In your app's FCM mode it deletes
the registration token or unregisters the FID, so pushes to it stop, and resolves the registration this process
knew, or `null`: delete it from your backend. Stop `registerForPush` first; while it runs, its `unregister` callback
gets the registration too. With FCM auto-init on, Firebase registers the device again when the app next starts.

iOS rejects: Apple advises against unregistering from APNs, and an app's APNs and PushKit tokens don't change
between users. Delete them from your backend instead.

### `updateCall` function

```ts
function updateCall(callId: string, update: CallUpdate): Promise<void>
```

Updates what the system shows for a call.

### `watchRingingCalls` function

```ts
function watchRingingCalls(client: RingingClient, options?: WatchRingingOptions): () => void
```

Stops incoming calls that ring here after the server stopped their ring: another of the user's devices answered,
the caller hung up, or the ring expired. iOS gets no VoIP push for a stopped ring, because iOS would make the app
report it to CallKit as a new call, so an app that rings through CallKit has to stop the ring itself. On Android a
cancellation arrives as a data message; watching also covers one that arrives late.

While an incoming call rings, it lists the user's live alerts every `intervalMs`. A ring whose alert is missing from
two complete listings in a row stops with the server reason `ended` if its live session ended, `answered` if the user
has an unfinished participation in it, `expired` after its `expiresAt` and `stopped` otherwise. A ring stops with
`expired` at its `expiresAt` at the latest. Start watching after sign-in; returns a function that stops watching,
which you call before the client's session ends. Once stopped, it starts no request and calls `onError` no more: a
request already in flight finishes, and its result is ignored.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md) and [`communication.liveSessionAlerts`](../../operations/communication/liveSessionAlerts.md).
