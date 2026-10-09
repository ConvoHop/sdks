# `com.convohop:convohop-android-push`

FCM registration, notifications and Telecom incoming calls, with no networking, LiveKit or coroutines, so a React Native or Flutter wrapper can ship it alone.

**Layer:** Client. **Runtime:** Android 7.0 (API 24) or later. Apps compile against API 34 or later and supply firebase-messaging 25.1.2 or later. **Source:** `android/push`.

## Classes

### `CallInfo` class

```kotlin
public class CallInfo
```

A snapshot of a call on this device.

Package: `com.convohop.android.push`.

#### `CallInfo.notification` property

```kotlin
public val notification: PushNotification.IncomingCall
```

The ring that started it.

#### `CallInfo.state` property

```kotlin
public val state: CallState
```

#### `CallInfo.endReason` property

```kotlin
public val endReason: CallEndReason?
```

Why it ended, once `state` is `CallState.ENDED`.

#### `CallInfo.serverReason` property

```kotlin
public val serverReason: String?
```

The `reason` of the server's cancellation, when the server stopped the ring.

#### `CallInfo.muted` property

```kotlin
public val muted: Boolean
```

Whether the system muted the call.

#### `CallInfo.audioRoute` property

```kotlin
public val audioRoute: AudioRoute?
```

Where the system plays the call's audio, once it reported a route.

#### `CallInfo.availableAudioRoutes` property

```kotlin
public val availableAudioRoutes: Set<AudioRoute>
```

The routes `ConvoHopNotifications.setAudioRoute` accepts.

#### `CallInfo.telecom` property

```kotlin
public val telecom: Boolean
```

Whether Android's Telecom runs the call through this app's self-managed
`ConnectionService`. Telecom then owns audio focus, the audio mode and
the route, so media must leave them alone; the app still mutes its own
microphone when `muted` and pauses media on hold.

#### `CallInfo.alertId` property

```kotlin
public val alertId: String
```

#### `CallInfo.liveSessionId` property

```kotlin
public val liveSessionId: String
```

#### `CallInfo.conversationId` property

```kotlin
public val conversationId: String
```

#### `CallInfo.projectId` property

```kotlin
public val projectId: String
```

#### `CallInfo.recipientId` property

```kotlin
public val recipientId: String
```

#### `CallInfo.senderId` property

```kotlin
public val senderId: String
```

#### `CallInfo.mediaProfile` property

```kotlin
public val mediaProfile: String
```

#### `CallInfo.video` property

```kotlin
public val video: Boolean
```

#### `CallInfo.title` property

```kotlin
public val title: String?
```

#### `CallInfo.body` property

```kotlin
public val body: String?
```

#### `CallInfo.expiresAtMillis` property

```kotlin
public val expiresAtMillis: Long
```

#### `CallInfo.toString` method

```kotlin
public override fun toString(): String
```

### `ConvoHopFirebase` class

```kotlin
public object ConvoHopFirebase
```

Connects Firebase Cloud Messaging to `ConvoHopNotifications`. Your app
supplies `com.google.firebase:firebase-messaging` 25.1.2 or later (Firebase
BoM 34.18.0 or later) and its own `google-services.json`; this library only
compiles against it.

ConvoHop follows your app's FCM mode. By default FCM registers the device
with a registration token, reported as a `PushRegistration.Token`. If your
manifest turns on registration by Firebase Installation ID with
`<meta-data android:name="firebase_messaging_installation_id_enabled" android:value="true" />`
inside `<application>`, ConvoHop registers with
`FirebaseMessaging.register()` instead and reports a
`PushRegistration.InstallationId`. The flag applies to your whole app:
Firebase then fails `getToken()` and `deleteToken()` for every library in
it, so turn it on only once everything in your app that uses FCM supports
installation IDs.

Declare `ConvoHopMessagingService`, or forward to `handleMessage`,
`onNewToken`, `onRegistered` and `onUnregistered` from your own messaging
service, and call `register` when your app starts.

Package: `com.convohop.android.push`.

#### `ConvoHopFirebase.INSTALLATION_ID_ENABLED` static property

```kotlin
public const val INSTALLATION_ID_ENABLED: String = "firebase_messaging_installation_id_enabled"
```

The `<meta-data>` name that turns on FCM registration by Firebase Installation ID.

#### `ConvoHopFirebase.handleMessage` static method

```kotlin
public fun handleMessage(context: Context, message: RemoteMessage): Boolean
```

Handles `message` if it is ConvoHop's. False means it isn't: handle it yourself.

#### `ConvoHopFirebase.usesInstallationId` static method

```kotlin
public fun usesInstallationId(context: Context): Boolean
```

Whether your manifest turns on registration by Firebase Installation ID.
Read as Firebase reads it: a missing or non-boolean value is false.

#### `ConvoHopFirebase.register` static method

```kotlin
public fun register(context: Context): Task<PushRegistration>
```

Registers this device with FCM in your app's mode and completes with its
registration. Call it when your app starts: it reports the registration
FCM holds, renewing it only if FCM needs to, so your backend learns it
even when Firebase's own callbacks don't fire, for example because the
token hasn't changed. With FCM auto-init off, nothing registers until
you call it, so you can wait for the user's consent. When the task
succeeds, `ConvoHopNotifications` listeners get
`ConvoHopNotificationListener.onRegistered`, even if another service
handles `com.google.firebase.MESSAGING_EVENT`. If it fails, for example
offline, call it again later.

Throws: `IllegalStateException` if your manifest turns on installation IDs
but your firebase-messaging predates them. ConvoHop needs 25.1.2 or later.

#### `ConvoHopFirebase.unregister` static method

```kotlin
public fun unregister(context: Context): Task<Void>
```

Unregisters this device from FCM in your app's mode, for example when the
user signs out: deletes its token, or unregisters its installation ID.
When the task succeeds, `ConvoHopNotifications` listeners get
`ConvoHopNotificationListener.onUnregistered` for the registration this
process knew, if any: delete it from your backend. With auto-init on,
Firebase registers the device again when your app next starts; turn
auto-init off to keep it unregistered.

Throws: `IllegalStateException` as `register` does.

#### `ConvoHopFirebase.onNewToken` static method

```kotlin
public fun onNewToken(context: Context, token: String)
```

Reports a new token from `FirebaseMessagingService.onNewToken`.

#### `ConvoHopFirebase.onRegistered` static method

```kotlin
public fun onRegistered(context: Context, installationId: String)
```

Reports a registration from `FirebaseMessagingService.onRegistered`.

#### `ConvoHopFirebase.onUnregistered` static method

```kotlin
public fun onUnregistered(context: Context, installationId: String)
```

Reports the end of a registration from `FirebaseMessagingService.onUnregistered`.

### `ConvoHopMessagingService` class

```kotlin
public open class ConvoHopMessagingService : FirebaseMessagingService
```

A messaging service that hands ConvoHop pushes and FCM registrations to
`ConvoHopNotifications`. Declare it (or a subclass) in your manifest with
the `com.google.firebase.MESSAGING_EVENT` intent filter, or call
`ConvoHopFirebase` from your own service instead. A subclass that overrides
`onMessageReceived`, `onNewToken`, `onRegistered` or `onUnregistered` must
call `super`.

Package: `com.convohop.android.push`.

#### `ConvoHopMessagingService` constructor

```kotlin
public constructor()
```

#### `ConvoHopMessagingService.onMessageReceived` method

```kotlin
public override fun onMessageReceived(message: RemoteMessage)
```

#### `ConvoHopMessagingService.onNewToken` method

```kotlin
public override fun onNewToken(token: String)
```

#### `ConvoHopMessagingService.onRegistered` method

```kotlin
public override fun onRegistered(installationId: String)
```

#### `ConvoHopMessagingService.onUnregistered` method

```kotlin
public override fun onUnregistered(installationId: String)
```

#### `ConvoHopMessagingService.onOtherMessage` method

```kotlin
public open fun onOtherMessage(message: RemoteMessage)
```

A push that isn't ConvoHop's.

### `ConvoHopNotificationOptions` class

```kotlin
public class ConvoHopNotificationOptions
```

How `ConvoHopNotifications` presents pushes. Set it in `Application.onCreate`, before pushes arrive.

Package: `com.convohop.android.push`.

#### `ConvoHopNotificationOptions` constructor

```kotlin
public constructor()
```

#### `ConvoHopNotificationOptions.smallIcon` property

```kotlin
public var smallIcon: Int
```

The small icon of every notification. 0 uses the app icon, which Android may show as a plain square.

#### `ConvoHopNotificationOptions.color` property

```kotlin
public var color: Int?
```

The notifications' accent color, or null for the system default.

#### `ConvoHopNotificationOptions.showMessages` property

```kotlin
public var showMessages: Boolean
```

Post message notifications. Turn this off to show them yourself from `ConvoHopNotificationListener.onMessage`.

#### `ConvoHopNotificationOptions.showMissedCalls` property

```kotlin
public var showMissedCalls: Boolean
```

Post a missed-call notification when a ring ends unanswered.

#### `ConvoHopNotificationOptions.useTelecom` property

```kotlin
public var useTelecom: Boolean
```

Ring through a self-managed `ConnectionService` on Android 8.0 and later. Without it, calls are notifications only.

#### `ConvoHopNotificationOptions.recipientFilter` property

```kotlin
public var recipientFilter: RecipientFilter?
```

Which recipients this device accepts. Null accepts all; reject users who signed out.

#### `ConvoHopNotificationOptions.incomingCallIntent` property

```kotlin
public var incomingCallIntent: CallIntentFactory?
```

The incoming-call screen, shown full screen over the lock screen when allowed and when the user taps the call.

#### `ConvoHopNotificationOptions.answeredCallIntent` property

```kotlin
public var answeredCallIntent: CallIntentFactory?
```

Opens after the user answers from the notification.

#### `ConvoHopNotificationOptions.conversationIntent` property

```kotlin
public var conversationIntent: ConversationIntentFactory?
```

Opens when the user taps a message or missed-call notification.

#### `ConvoHopNotificationOptions.messageContent` property

```kotlin
public var messageContent: MessageContentProvider?
```

Fetches message text when a push carries none.

#### `ConvoHopNotificationOptions.ledgerStore` property

```kotlin
public var ledgerStore: PushLedgerStore?
```

Where delivery state persists; null uses shared preferences. It never holds message text or FCM registrations.

### `ConvoHopNotifications` class

```kotlin
public class ConvoHopNotifications
```

Turns ConvoHop pushes into Android notifications and incoming calls.

Call `handleNotification` with each FCM data message (or use
`ConvoHopFirebase` or `ConvoHopMessagingService`). Messages become
notifications. A call rings with a full-screen incoming-call notification
and, on Android 8.0 and later, through a self-managed `ConnectionService`.
It stops when the server cancels it, it reaches `expiresAt`, or the user
answers or declines. Delivery is at least once and unordered: duplicates
and late rings are dropped.

Configure `options` in `Application.onCreate`, because a push can start
your process. Methods are thread-safe; listeners run on the main thread.

Package: `com.convohop.android.push`.

#### `ConvoHopNotifications.options` property

```kotlin
public var options: ConvoHopNotificationOptions
```

How pushes are presented. Replace it before pushes arrive.

#### `ConvoHopNotifications.registration` property

```kotlin
public var registration: PushRegistration?
    private set
```

This device's FCM registration as this process last learned it, from
Firebase's callbacks or `ConvoHopFirebase.register`. Held in memory
only; null until then, and after it is unregistered.

#### `ConvoHopNotifications.handleNotification` method

```kotlin
public fun handleNotification(data: Map<String, String>): PushResult
```

Handles an FCM data message. Returns `PushResult.NOT_CONVOHOP` for a push
that isn't ConvoHop's, so you can route it elsewhere. It may block
briefly while `ConvoHopNotificationOptions.messageContent` fetches text.

#### `ConvoHopNotifications.handle` method

```kotlin
public fun handle(notification: PushNotification): PushResult
```

Handles a notification you already parsed with `ConvoHopPush`.

#### `ConvoHopNotifications.addListener` method

```kotlin
public fun addListener(listener: ConvoHopNotificationListener): AutoCloseable
```

Adds `listener` if it isn't added yet. Close the result to remove it.

#### `ConvoHopNotifications.removeListener` method

```kotlin
public fun removeListener(listener: ConvoHopNotificationListener)
```

#### `ConvoHopNotifications.onNewToken` method

```kotlin
public fun onNewToken(token: String)
```

Records a new FCM registration token and reports it to listeners as a
`PushRegistration.Token`: store it with your backend.
`ConvoHopFirebase.onNewToken` calls this.

#### `ConvoHopNotifications.onRegistered` method

```kotlin
public fun onRegistered(installationId: String)
```

Records that FCM registered this device as `installationId` and reports
it to listeners as a `PushRegistration.InstallationId`: store it with
your backend. `ConvoHopFirebase.onRegistered` calls this.

#### `ConvoHopNotifications.onUnregistered` method

```kotlin
public fun onUnregistered(installationId: String)
```

Records that FCM unregistered `installationId`, so pushes to it stop,
and reports it to listeners: delete it from your backend.
`ConvoHopFirebase.onUnregistered` calls this.

#### `ConvoHopNotifications.areNotificationsEnabled` method

```kotlin
public fun areNotificationsEnabled(): Boolean
```

False when the user turned off this app's notifications or hasn't granted `POST_NOTIFICATIONS`.

#### `ConvoHopNotifications.canUseFullScreenIntent` method

```kotlin
public fun canUseFullScreenIntent(): Boolean
```

Whether incoming calls can take the full screen over the lock screen.
Android 14 lets the user and Google Play deny it; calls then show as a
heads-up notification. Send the user to `fullScreenIntentSettings`.

#### `ConvoHopNotifications.fullScreenIntentSettings` method

```kotlin
public fun fullScreenIntentSettings(): Intent
```

The settings screen where the user allows full-screen incoming calls.

#### `ConvoHopNotifications.calls` method

```kotlin
public fun calls(): List<CallInfo>
```

The calls on this device: ringing, in progress, or ended within the last 60 seconds.

#### `ConvoHopNotifications.call` method

```kotlin
public fun call(alertId: String): CallInfo?
```

The call with `alertId`, or null.

#### `ConvoHopNotifications.answer` method

```kotlin
public fun answer(alertId: String): Boolean
```

Answers a ringing call, as the notification's Answer button does. Then join the live session.

#### `ConvoHopNotifications.reject` method

```kotlin
public fun reject(alertId: String): Boolean
```

Declines a ringing call on this device. ConvoHop has no decline operation, so the caller keeps ringing others.

#### `ConvoHopNotifications.end` method

```kotlin
public fun end(alertId: String): Boolean
```

Ends a call on this device: declines it if it is ringing, otherwise hangs up. Call it when your call ends.

#### `ConvoHopNotifications.forget` method

```kotlin
public fun forget(alertId: String): Boolean
```

Drops an ended call from `calls` before its 60 seconds pass. False for a live or unknown call.

#### `ConvoHopNotifications.setOnHold` method

```kotlin
public fun setOnHold(alertId: String, onHold: Boolean): Boolean
```

Puts an answered call on hold or resumes it.

#### `ConvoHopNotifications.setAudioRoute` method

```kotlin
public fun setAudioRoute(alertId: String, route: AudioRoute): Boolean
```

Asks the system to move a call's audio. False without a system call, or when `route` isn't available.

#### `ConvoHopNotifications.EXTRA_ACTION` static property

```kotlin
public const val EXTRA_ACTION: String = "com.convohop.android.push.extra.ACTION"
```

Which notification opened the activity: `ACTION_INCOMING_CALL`, `ACTION_ANSWERED_CALL`, `ACTION_MESSAGE` or `ACTION_MISSED_CALL`.

#### `ConvoHopNotifications.EXTRA_ALERT_ID` static property

```kotlin
public const val EXTRA_ALERT_ID: String = "com.convohop.android.push.extra.ALERT_ID"
```

#### `ConvoHopNotifications.EXTRA_LIVE_SESSION_ID` static property

```kotlin
public const val EXTRA_LIVE_SESSION_ID: String = "com.convohop.android.push.extra.LIVE_SESSION_ID"
```

#### `ConvoHopNotifications.EXTRA_CONVERSATION_ID` static property

```kotlin
public const val EXTRA_CONVERSATION_ID: String = "com.convohop.android.push.extra.CONVERSATION_ID"
```

#### `ConvoHopNotifications.EXTRA_MESSAGE_ID` static property

```kotlin
public const val EXTRA_MESSAGE_ID: String = "com.convohop.android.push.extra.MESSAGE_ID"
```

#### `ConvoHopNotifications.EXTRA_VIDEO` static property

```kotlin
public const val EXTRA_VIDEO: String = "com.convohop.android.push.extra.VIDEO"
```

A boolean: whether the call has video.

#### `ConvoHopNotifications.ACTION_INCOMING_CALL` static property

```kotlin
public const val ACTION_INCOMING_CALL: String = "incomingCall"
```

#### `ConvoHopNotifications.ACTION_ANSWERED_CALL` static property

```kotlin
public const val ACTION_ANSWERED_CALL: String = "answeredCall"
```

#### `ConvoHopNotifications.ACTION_MESSAGE` static property

```kotlin
public const val ACTION_MESSAGE: String = "message"
```

#### `ConvoHopNotifications.ACTION_MISSED_CALL` static property

```kotlin
public const val ACTION_MISSED_CALL: String = "missedCall"
```

#### `ConvoHopNotifications.getInstance` static method

```kotlin
public fun getInstance(context: Context): ConvoHopNotifications
```

The process-wide instance.

### `ConvoHopPush` class

```kotlin
public object ConvoHopPush
```

Parses ConvoHop push payloads. It holds no state and needs no credentials.

Package: `com.convohop.android.push`.

#### `ConvoHopPush.DATA_KEY` static property

```kotlin
public const val DATA_KEY: String = "convohop"
```

The FCM `message.data` key that carries the event.

#### `ConvoHopPush.isConvoHop` static method

```kotlin
public fun isConvoHop(data: Map<String, String>): Boolean
```

True when `data` is addressed to the ConvoHop SDK, whether or not it is valid. Route other pushes yourself.

#### `ConvoHopPush.parse` static method

```kotlin
public fun parse(data: Map<String, String>): PushNotification?
```

The notification in an FCM data map, or null when the map has no valid
ConvoHop event. Fields the event's type doesn't define are ignored.

#### `ConvoHopPush.parseData` static method

```kotlin
public fun parseData(json: String): PushNotification?
```

The notification in a `convohop` JSON object, or null when it is not a valid event.

### `MemoryPushLedgerStore` class

```kotlin
public class MemoryPushLedgerStore : PushLedgerStore
```

A `PushLedgerStore` that lives as long as the process.

Package: `com.convohop.android.push`.

#### `MemoryPushLedgerStore` constructor

```kotlin
public constructor()
```

#### `MemoryPushLedgerStore.load` method

```kotlin
public override fun load(): String?
```

#### `MemoryPushLedgerStore.save` method

```kotlin
public override fun save(value: String)
```

### `MessageContent` class

```kotlin
public class MessageContent
```

Text for a message notification.

Package: `com.convohop.android.push`.

#### `MessageContent` constructor

```kotlin
public constructor(title: String?, body: String?)
```

#### `MessageContent.title` property

```kotlin
public val title: String?
```

#### `MessageContent.body` property

```kotlin
public val body: String?
```

### `PushLedger` class

```kotlin
public class PushLedger
```

Applies the push contract's delivery rules. Delivery is at least once and
unordered, so the ledger handles each `eventId` once, and a ring counts as
stopped once a cancellation with its `alertId` arrived, even before the
ring itself, or once its `expiresAt` passed. A ring gets at most one
missed call, even in a new process: none if the user answered, declined
or let it ring out on this device (`stop`), and only one if several missed
cancellations for its `alertId` arrive under different `eventId`s. The
ledger remembers this for a day past the ring's deadline, as long as a
missed call stays relevant.

It is thread-safe. Give it a durable `store` so its state survives the
short-lived processes that receive pushes. A store that can't be read
starts an empty ledger; that can only repeat a notification.

Package: `com.convohop.android.push`.

#### `PushLedger` constructor

```kotlin
public constructor(
    store: PushLedgerStore = MemoryPushLedgerStore(),
    clock: () -> Long = System::currentTimeMillis,
    capacity: Int = 256,
)
```

#### `PushLedger.record` method

```kotlin
public fun record(notification: PushNotification): PushDecision
```

Records `notification` and decides what to do with it.

#### `PushLedger.isStopped` method

```kotlin
public fun isStopped(alertId: String, expiresAtMillis: Long): Boolean
```

True once `alertId` was cancelled or handled here, or `expiresAtMillis` passed.

#### `PushLedger.stop` method

```kotlin
public fun stop(alertId: String, expiresAtMillis: Long)
```

Marks `alertId`, which rings until `expiresAtMillis`, as handled on this
device: the user answered or declined it, or it rang out here. It no
longer rings, and the server's later missed-call cancellation is ignored.

### `PushNotification` class

```kotlin
public sealed class PushNotification
```

A ConvoHop notification event delivered by your push provider, parsed
from the `convohop` data entry described in `spec/push-payload`.

Events carry identifiers only. `title` and `body` are the visible text
your backend chose; `body` is the start of the message only when the
project opted in to message previews. Without them, show your own
generic text or fetch the content with the user's session.

Package: `com.convohop.android.push`.

#### `PushNotification.eventId` property

```kotlin
public abstract val eventId: String
```

Deduplicate on this: retries and replays of an event keep it.

#### `PushNotification.occurredAt` property

```kotlin
public abstract val occurredAt: String
```

#### `PushNotification.occurredAtMillis` property

```kotlin
public abstract val occurredAtMillis: Long
```

#### `PushNotification.projectId` property

```kotlin
public abstract val projectId: String
```

#### `PushNotification.recipientId` property

```kotlin
public abstract val recipientId: String
```

#### `PushNotification.conversationId` property

```kotlin
public abstract val conversationId: String
```

#### `PushNotification.senderId` property

```kotlin
public abstract val senderId: String
```

#### `PushNotification.title` property

```kotlin
public abstract val title: String?
```

#### `PushNotification.body` property

```kotlin
public abstract val body: String?
```

### `PushNotification.CallCancelled` class

```kotlin
public data class CallCancelled : PushNotification
```

A ring that stopped for the recipient. It can arrive before its `IncomingCall`.

Package: `com.convohop.android.push`.

#### `PushNotification.CallCancelled` constructor

```kotlin
public constructor(
    eventId: String,
    occurredAt: String,
    occurredAtMillis: Long,
    projectId: String,
    recipientId: String,
    conversationId: String,
    senderId: String,
    title: String?,
    body: String?,
    liveSessionId: String,
    alertId: String,
    expiresAt: String,
    expiresAtMillis: Long,
    mediaProfile: String,
    reason: String,
)
```

#### `PushNotification.CallCancelled.eventId` property

```kotlin
public override val eventId: String
```

Deduplicate on this: retries and replays of an event keep it.

#### `PushNotification.CallCancelled.occurredAt` property

```kotlin
public override val occurredAt: String
```

#### `PushNotification.CallCancelled.occurredAtMillis` property

```kotlin
public override val occurredAtMillis: Long
```

#### `PushNotification.CallCancelled.projectId` property

```kotlin
public override val projectId: String
```

#### `PushNotification.CallCancelled.recipientId` property

```kotlin
public override val recipientId: String
```

#### `PushNotification.CallCancelled.conversationId` property

```kotlin
public override val conversationId: String
```

#### `PushNotification.CallCancelled.senderId` property

```kotlin
public override val senderId: String
```

#### `PushNotification.CallCancelled.title` property

```kotlin
public override val title: String?
```

#### `PushNotification.CallCancelled.body` property

```kotlin
public override val body: String?
```

#### `PushNotification.CallCancelled.liveSessionId` property

```kotlin
public val liveSessionId: String
```

#### `PushNotification.CallCancelled.alertId` property

```kotlin
public val alertId: String
```

#### `PushNotification.CallCancelled.expiresAt` property

```kotlin
public val expiresAt: String
```

The stopped ring's original deadline.

#### `PushNotification.CallCancelled.expiresAtMillis` property

```kotlin
public val expiresAtMillis: Long
```

#### `PushNotification.CallCancelled.mediaProfile` property

```kotlin
public val mediaProfile: String
```

#### `PushNotification.CallCancelled.reason` property

```kotlin
public val reason: String
```

`answered`, `declined`, `ended`, `expired` or a later reason.

#### `PushNotification.CallCancelled.missed` property

```kotlin
public val missed: Boolean
```

True for `ended` and `expired`: nobody answered. Other reasons only stop the ringing.

### `PushNotification.IncomingCall` class

```kotlin
public data class IncomingCall : PushNotification
```

One ring of a call for the recipient. It stops at `expiresAt` or when a cancellation with its `alertId` arrives.

Package: `com.convohop.android.push`.

#### `PushNotification.IncomingCall` constructor

```kotlin
public constructor(
    eventId: String,
    occurredAt: String,
    occurredAtMillis: Long,
    projectId: String,
    recipientId: String,
    conversationId: String,
    senderId: String,
    title: String?,
    body: String?,
    liveSessionId: String,
    alertId: String,
    expiresAt: String,
    expiresAtMillis: Long,
    mediaProfile: String,
)
```

#### `PushNotification.IncomingCall.eventId` property

```kotlin
public override val eventId: String
```

Deduplicate on this: retries and replays of an event keep it.

#### `PushNotification.IncomingCall.occurredAt` property

```kotlin
public override val occurredAt: String
```

#### `PushNotification.IncomingCall.occurredAtMillis` property

```kotlin
public override val occurredAtMillis: Long
```

#### `PushNotification.IncomingCall.projectId` property

```kotlin
public override val projectId: String
```

#### `PushNotification.IncomingCall.recipientId` property

```kotlin
public override val recipientId: String
```

#### `PushNotification.IncomingCall.conversationId` property

```kotlin
public override val conversationId: String
```

#### `PushNotification.IncomingCall.senderId` property

```kotlin
public override val senderId: String
```

#### `PushNotification.IncomingCall.title` property

```kotlin
public override val title: String?
```

#### `PushNotification.IncomingCall.body` property

```kotlin
public override val body: String?
```

#### `PushNotification.IncomingCall.liveSessionId` property

```kotlin
public val liveSessionId: String
```

#### `PushNotification.IncomingCall.alertId` property

```kotlin
public val alertId: String
```

#### `PushNotification.IncomingCall.expiresAt` property

```kotlin
public val expiresAt: String
```

#### `PushNotification.IncomingCall.expiresAtMillis` property

```kotlin
public val expiresAtMillis: Long
```

#### `PushNotification.IncomingCall.mediaProfile` property

```kotlin
public val mediaProfile: String
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.

#### `PushNotification.IncomingCall.video` property

```kotlin
public val video: Boolean
```

### `PushNotification.Message` class

```kotlin
public data class Message : PushNotification
```

A new message for the recipient.

Package: `com.convohop.android.push`.

#### `PushNotification.Message` constructor

```kotlin
public constructor(
    eventId: String,
    occurredAt: String,
    occurredAtMillis: Long,
    projectId: String,
    recipientId: String,
    conversationId: String,
    senderId: String,
    title: String?,
    body: String?,
    messageId: String,
)
```

#### `PushNotification.Message.eventId` property

```kotlin
public override val eventId: String
```

Deduplicate on this: retries and replays of an event keep it.

#### `PushNotification.Message.occurredAt` property

```kotlin
public override val occurredAt: String
```

#### `PushNotification.Message.occurredAtMillis` property

```kotlin
public override val occurredAtMillis: Long
```

#### `PushNotification.Message.projectId` property

```kotlin
public override val projectId: String
```

#### `PushNotification.Message.recipientId` property

```kotlin
public override val recipientId: String
```

#### `PushNotification.Message.conversationId` property

```kotlin
public override val conversationId: String
```

#### `PushNotification.Message.senderId` property

```kotlin
public override val senderId: String
```

#### `PushNotification.Message.title` property

```kotlin
public override val title: String?
```

#### `PushNotification.Message.body` property

```kotlin
public override val body: String?
```

#### `PushNotification.Message.messageId` property

```kotlin
public val messageId: String
```

### `PushRegistration` class

```kotlin
public sealed class PushRegistration
```

This device's FCM registration, in the mode your app uses FCM in: a
registration `Token` by default, or an `InstallationId` when your manifest
turns on registration by Firebase Installation ID (see `ConvoHopFirebase`).
Your backend stores it for the signed-in user and hands it to ConvoHop's
push delivery; ConvoHop never stores registrations itself.

Package: `com.convohop.android.push`.

#### `PushRegistration.kind` property

```kotlin
public val kind: String
```

The push service: always `fcm`.

#### `PushRegistration.toMap` method

```kotlin
public abstract fun toMap(): Map<String, String>
```

`kind` plus `token` or `fid`: the registration as the other ConvoHop SDKs give it to your backend.

#### `PushRegistration.toJson` method

```kotlin
public fun toJson(): String
```

`toMap` as JSON: `{"kind":"fcm","token":"…"}` or `{"kind":"fcm","fid":"…"}`.

### `PushRegistration.InstallationId` class

```kotlin
public class InstallationId : PushRegistration
```

A Firebase Installation ID that FCM registered, from `FirebaseMessaging.register()` or `onRegistered`.

Package: `com.convohop.android.push`.

#### `PushRegistration.InstallationId` constructor

```kotlin
public constructor(fid: String)
```

#### `PushRegistration.InstallationId.fid` property

```kotlin
public val fid: String
```

#### `PushRegistration.InstallationId.toMap` method

```kotlin
public override fun toMap(): Map<String, String>
```

`kind` plus `token` or `fid`: the registration as the other ConvoHop SDKs give it to your backend.

#### `PushRegistration.InstallationId.equals` method

```kotlin
public override fun equals(other: Any?): Boolean
```

#### `PushRegistration.InstallationId.hashCode` method

```kotlin
public override fun hashCode(): Int
```

#### `PushRegistration.InstallationId.toString` method

```kotlin
public override fun toString(): String
```

#### `PushRegistration.InstallationId.kind` property

```kotlin
public val kind: String
```

The push service: always `fcm`.

Inherited from `PushRegistration`.

#### `PushRegistration.InstallationId.toJson` method

```kotlin
public fun toJson(): String
```

`toMap` as JSON: `{"kind":"fcm","token":"…"}` or `{"kind":"fcm","fid":"…"}`.

Inherited from `PushRegistration`.

### `PushRegistration.Token` class

```kotlin
public class Token : PushRegistration
```

An FCM registration token, from `FirebaseMessaging.getToken()` or `onNewToken`.

Package: `com.convohop.android.push`.

#### `PushRegistration.Token` constructor

```kotlin
public constructor(token: String)
```

#### `PushRegistration.Token.token` property

```kotlin
public val token: String
```

#### `PushRegistration.Token.toMap` method

```kotlin
public override fun toMap(): Map<String, String>
```

`kind` plus `token` or `fid`: the registration as the other ConvoHop SDKs give it to your backend.

#### `PushRegistration.Token.equals` method

```kotlin
public override fun equals(other: Any?): Boolean
```

#### `PushRegistration.Token.hashCode` method

```kotlin
public override fun hashCode(): Int
```

#### `PushRegistration.Token.toString` method

```kotlin
public override fun toString(): String
```

#### `PushRegistration.Token.kind` property

```kotlin
public val kind: String
```

The push service: always `fcm`.

Inherited from `PushRegistration`.

#### `PushRegistration.Token.toJson` method

```kotlin
public fun toJson(): String
```

`toMap` as JSON: `{"kind":"fcm","token":"…"}` or `{"kind":"fcm","fid":"…"}`.

Inherited from `PushRegistration`.

## Interfaces

### `CallIntentFactory` interface

```kotlin
public fun interface CallIntentFactory
```

Builds the activity intent for a call, or null for the default: your launch activity.

Package: `com.convohop.android.push`.

#### `CallIntentFactory.create` method

```kotlin
public fun create(context: Context, call: CallInfo): Intent?
```

### `ConversationIntentFactory` interface

```kotlin
public fun interface ConversationIntentFactory
```

Builds the activity intent for a message or missed call, or null for the default: your launch activity.

Package: `com.convohop.android.push`.

#### `ConversationIntentFactory.create` method

```kotlin
public fun create(context: Context, notification: PushNotification): Intent?
```

### `ConvoHopNotificationListener` interface

```kotlin
public interface ConvoHopNotificationListener
```

Events from `ConvoHopNotifications`, on the main thread. Every method has
an empty default. A listener added late misses earlier events: read
`ConvoHopNotifications.calls` and `ConvoHopNotifications.registration` when you add it.

Package: `com.convohop.android.push`.

#### `ConvoHopNotificationListener.onRegistered` method

```kotlin
public fun onRegistered(registration: PushRegistration)
```

FCM registered this device, or confirmed its registration: a token, or
an installation ID if your app turned that mode on. Store
`registration` with your backend for the signed-in user; ConvoHop never
stores registrations. The same registration can arrive more than once,
because Firebase's callback and `ConvoHopFirebase.register`'s task both
report it, so store it idempotently.

#### `ConvoHopNotificationListener.onUnregistered` method

```kotlin
public fun onUnregistered(registration: PushRegistration)
```

FCM unregistered this device, so pushes to `registration` stop: delete
it from your backend. It can repeat too.

#### `ConvoHopNotificationListener.onMessage` method

```kotlin
public fun onMessage(message: PushNotification.Message)
```

A new message arrived, after its notification was posted (if `ConvoHopNotificationOptions.showMessages`).

#### `ConvoHopNotificationListener.onIncomingCall` method

```kotlin
public fun onIncomingCall(call: CallInfo)
```

A call started ringing on this device.

#### `ConvoHopNotificationListener.onCallAnswered` method

```kotlin
public fun onCallAnswered(call: CallInfo)
```

The user answered: join the live session and connect its media.

#### `ConvoHopNotificationListener.onCallEnded` method

```kotlin
public fun onCallEnded(call: CallInfo, reason: CallEndReason, serverReason: String?)
```

A call ended or stopped ringing, once per call. `serverReason` is the cancellation's `reason`, if the server stopped it.

#### `ConvoHopNotificationListener.onCallHoldChanged` method

```kotlin
public fun onCallHoldChanged(call: CallInfo, onHold: Boolean)
```

The system put the call on hold or resumed it.

#### `ConvoHopNotificationListener.onCallMuteChanged` method

```kotlin
public fun onCallMuteChanged(call: CallInfo, muted: Boolean)
```

The system muted or unmuted the call, for example from a car or headset: mute your microphone track.

#### `ConvoHopNotificationListener.onCallAudioRouteChanged` method

```kotlin
public fun onCallAudioRouteChanged(call: CallInfo, route: AudioRoute, available: Set<AudioRoute>)
```

The call's audio moved to `route`. `available` are the routes `ConvoHopNotifications.setAudioRoute` accepts.

### `MessageContentProvider` interface

```kotlin
public fun interface MessageContentProvider
```

Fetches a message's text on the device, with the user's own session, when
the push carries none: previews are off unless the project opts in. It runs
on the thread that handles the push and may block briefly; it is skipped on
the main thread. Return null to show the generic text.

Package: `com.convohop.android.push`.

#### `MessageContentProvider.content` method

```kotlin
public fun content(message: PushNotification.Message): MessageContent?
```

### `PushLedgerStore` interface

```kotlin
public interface PushLedgerStore
```

Durable storage for a `PushLedger`, such as shared preferences. The value
holds event and alert identifiers only: never message text or FCM registrations.

Package: `com.convohop.android.push`.

#### `PushLedgerStore.load` method

```kotlin
public fun load(): String?
```

#### `PushLedgerStore.save` method

```kotlin
public fun save(value: String)
```

### `RecipientFilter` interface

```kotlin
public fun interface RecipientFilter
```

Decides whether this device accepts pushes for a recipient, for example only the signed-in user.

Package: `com.convohop.android.push`.

#### `RecipientFilter.accepts` method

```kotlin
public fun accepts(recipientId: String): Boolean
```

## Enums

### `AudioRoute` enum

```kotlin
public enum class AudioRoute
```

Where call audio plays.

Package: `com.convohop.android.push`.

#### `AudioRoute.EARPIECE` case

```kotlin
EARPIECE
```

#### `AudioRoute.SPEAKER` case

```kotlin
SPEAKER
```

#### `AudioRoute.BLUETOOTH` case

```kotlin
BLUETOOTH
```

#### `AudioRoute.WIRED_HEADSET` case

```kotlin
WIRED_HEADSET
```

#### `AudioRoute.STREAMING` case

```kotlin
STREAMING
```

#### `AudioRoute.UNKNOWN` case

```kotlin
UNKNOWN
```

### `CallEndReason` enum

```kotlin
public enum class CallEndReason
```

Why a call this device knew about ended.

Package: `com.convohop.android.push`.

#### `CallEndReason.REJECTED` case

```kotlin
REJECTED
```

The user declined it on this device.

#### `CallEndReason.HUNG_UP` case

```kotlin
HUNG_UP
```

It ended on this device: `ConvoHopNotifications.end`, or the system, such as a headset button.

#### `CallEndReason.MISSED` case

```kotlin
MISSED
```

The server reported that nobody answered (`ended` or `expired`).

#### `CallEndReason.ANSWERED_ELSEWHERE` case

```kotlin
ANSWERED_ELSEWHERE
```

The recipient answered on another device.

#### `CallEndReason.DECLINED_ELSEWHERE` case

```kotlin
DECLINED_ELSEWHERE
```

The recipient declined on another device.

#### `CallEndReason.STOPPED` case

```kotlin
STOPPED
```

The server stopped the ring for a reason this SDK version doesn't know.

#### `CallEndReason.EXPIRED` case

```kotlin
EXPIRED
```

The ring reached its `expiresAt` on this device.

#### `CallEndReason.FAILED` case

```kotlin
FAILED
```

The system refused or aborted the call.

### `CallState` enum

```kotlin
public enum class CallState
```

The state of a call on this device.

Package: `com.convohop.android.push`.

#### `CallState.RINGING` case

```kotlin
RINGING
```

#### `CallState.ACTIVE` case

```kotlin
ACTIVE
```

Answered and in progress.

#### `CallState.HELD` case

```kotlin
HELD
```

#### `CallState.ENDED` case

```kotlin
ENDED
```

It ended; `CallInfo.endReason` says why. Ended calls stay in `ConvoHopNotifications.calls` for 60 seconds.

### `PushDecision` enum

```kotlin
public enum class PushDecision
```

What to do with a push, after `PushLedger.record`.

Package: `com.convohop.android.push`.

#### `PushDecision.SHOW_MESSAGE` case

```kotlin
SHOW_MESSAGE
```

A message the device hasn't shown yet.

#### `PushDecision.RING` case

```kotlin
RING
```

A ring that is neither cancelled nor past its deadline: ring until it expires or is cancelled.

#### `PushDecision.STOP_RINGING` case

```kotlin
STOP_RINGING
```

Stop ringing this alert: it was answered, declined or stopped for a reason this SDK doesn't know.

#### `PushDecision.MISSED_CALL` case

```kotlin
MISSED_CALL
```

Stop ringing this alert and show a missed call: the call ended or nobody answered. Each alert gets this at most once.

#### `PushDecision.IGNORE` case

```kotlin
IGNORE
```

Nothing to do: the event was handled before, the ring was already
cancelled, expired or handled on this device, or it already got its missed call.

### `PushResult` enum

```kotlin
public enum class PushResult
```

What `ConvoHopNotifications.handleNotification` did with a push.

Package: `com.convohop.android.push`.

#### `PushResult.NOT_CONVOHOP` case

```kotlin
NOT_CONVOHOP
```

The push has no `convohop` entry: handle it yourself.

#### `PushResult.INVALID` case

```kotlin
INVALID
```

The `convohop` entry is not a valid event this SDK version knows.

#### `PushResult.IGNORED` case

```kotlin
IGNORED
```

A duplicate, a ring that already stopped, or a recipient your filter rejected.

#### `PushResult.MESSAGE` case

```kotlin
MESSAGE
```

A new message.

#### `PushResult.RINGING` case

```kotlin
RINGING
```

A call is ringing.

#### `PushResult.STOPPED` case

```kotlin
STOPPED
```

A ring stopped without a missed call: it was answered or declined, maybe on another device.

#### `PushResult.MISSED` case

```kotlin
MISSED
```

A ring stopped and nobody answered.
