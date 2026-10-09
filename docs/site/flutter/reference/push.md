# `package:convohop/push.dart`

Push registration, notification payloads and the system incoming-call UI, through the package's own platform code.

**Layer:** Client. **Runtime:** Flutter 3.38 or later on Android 7.0 (API level 24) or later with Firebase Cloud Messaging, and iOS 13 or later with APNs. **Source:** `flutter`.

## Classes

### `ApnsRegistration` class

```dart
final class ApnsRegistration extends PushRegistration
```

An iOS APNs device token, in lowercase hexadecimal: for alerts, or with
`voip` for VoIP pushes through PushKit, which your backend sends to the
`<bundle ID>.voip` topic.

#### `ApnsRegistration` constructor

```dart
const ApnsRegistration(String token, {bool voip = false})
```

#### `ApnsRegistration.token` property

```dart
final String token
```

#### `ApnsRegistration.voip` property

```dart
final bool voip
```

Whether `token` is PushKit's, for VoIP pushes.

#### `ApnsRegistration.kind` property

```dart
String get kind
```

`fcm`, `apns` or `apnsVoip`.

#### `ApnsRegistration.toJson` method

```dart
Map<String, String> toJson()
```

The registration as JSON: `{"kind": "fcm", "token": …}`,
`{"kind": "fcm", "fid": …}` or `{"kind": "apns" | "apnsVoip", "token": …}`.

#### `ApnsRegistration.operator ==` method

```dart
bool operator ==(Object other)
```

#### `ApnsRegistration.hashCode` property

```dart
int get hashCode
```

#### `ApnsRegistration.toString` method

```dart
String toString()
```

### `CallAction` class

```dart
final class CallAction
```

The user acted on a call in the system call UI.

#### `CallAction.kind` property

```dart
final CallActionKind kind
```

#### `CallAction.alertId` property

```dart
final String alertId
```

The ring the action is for.

#### `CallAction.call` property

```dart
final CallNotification? call
```

The ring's notification, when the device still had it.

#### `CallAction.toString` method

```dart
String toString()
```

### `CallCancelledNotification` class

```dart
final class CallCancelledNotification extends RingNotification
```

A ring that stopped for the user.

#### `CallCancelledNotification.reason` property

```dart
final String reason
```

`answered`, `declined`, `ended`, `expired` or a reason this SDK doesn't
know yet, which only stops the ringing.

#### `CallCancelledNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

#### `CallCancelledNotification.missedCall` property

```dart
bool get missedCall
```

Whether to tell the user they missed the call: the call ended or nobody
answered. Answered and declined rings (on any device) only stop ringing.

#### `CallCancelledNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

#### `CallCancelledNotification.liveSessionId` property

```dart
final String liveSessionId
```

Inherited from `RingNotification`.

#### `CallCancelledNotification.alertId` property

```dart
final String alertId
```

One ring for one recipient. A later ring of the same call has a new one.

Inherited from `RingNotification`.

#### `CallCancelledNotification.expiresAt` property

```dart
final String expiresAt
```

When the ring stops if nobody answers.

Inherited from `RingNotification`.

#### `CallCancelledNotification.mediaProfile` property

```dart
final String mediaProfile
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a profile this SDK doesn't know yet.

Inherited from `RingNotification`.

#### `CallCancelledNotification.expiresAtMillis` property

```dart
int get expiresAtMillis
```

`expiresAt` in milliseconds since the epoch, ignoring any fraction.

Inherited from `RingNotification`.

#### `CallCancelledNotification.hasVideo` property

```dart
bool get hasVideo
```

Inherited from `RingNotification`.

#### `CallCancelledNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.occurredAt` property

```dart
final String occurredAt
```

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.projectId` property

```dart
final String projectId
```

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.conversationId` property

```dart
final String conversationId
```

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

Inherited from `ConvoHopNotification`.

#### `CallCancelledNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

Inherited from `ConvoHopNotification`.

### `CallNotification` class

```dart
final class CallNotification extends RingNotification
```

An incoming call: a ring for the user.

#### `CallNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

#### `CallNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

#### `CallNotification.liveSessionId` property

```dart
final String liveSessionId
```

Inherited from `RingNotification`.

#### `CallNotification.alertId` property

```dart
final String alertId
```

One ring for one recipient. A later ring of the same call has a new one.

Inherited from `RingNotification`.

#### `CallNotification.expiresAt` property

```dart
final String expiresAt
```

When the ring stops if nobody answers.

Inherited from `RingNotification`.

#### `CallNotification.mediaProfile` property

```dart
final String mediaProfile
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a profile this SDK doesn't know yet.

Inherited from `RingNotification`.

#### `CallNotification.expiresAtMillis` property

```dart
int get expiresAtMillis
```

`expiresAt` in milliseconds since the epoch, ignoring any fraction.

Inherited from `RingNotification`.

#### `CallNotification.hasVideo` property

```dart
bool get hasVideo
```

Inherited from `RingNotification`.

#### `CallNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

Inherited from `ConvoHopNotification`.

#### `CallNotification.occurredAt` property

```dart
final String occurredAt
```

Inherited from `ConvoHopNotification`.

#### `CallNotification.projectId` property

```dart
final String projectId
```

Inherited from `ConvoHopNotification`.

#### `CallNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

Inherited from `ConvoHopNotification`.

#### `CallNotification.conversationId` property

```dart
final String conversationId
```

Inherited from `ConvoHopNotification`.

#### `CallNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

Inherited from `ConvoHopNotification`.

#### `CallNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

Inherited from `ConvoHopNotification`.

#### `CallNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

Inherited from `ConvoHopNotification`.

#### `CallNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

Inherited from `ConvoHopNotification`.

### `ConvoHopNotification` class

```dart
sealed class ConvoHopNotification
```

A ConvoHop notification, parsed from a push payload's `convohop` object.

Notifications carry identifiers. They carry message text only when the
project opted in to message previews (off by default) or your backend
added its own text, so `title` and `body` are often null: show your own
generic text and fetch content with the user's session.

#### `ConvoHopNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

#### `ConvoHopNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

#### `ConvoHopNotification.occurredAt` property

```dart
final String occurredAt
```

#### `ConvoHopNotification.projectId` property

```dart
final String projectId
```

#### `ConvoHopNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

#### `ConvoHopNotification.conversationId` property

```dart
final String conversationId
```

#### `ConvoHopNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

#### `ConvoHopNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

#### `ConvoHopNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

#### `ConvoHopNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

#### `ConvoHopNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

### `ConvoHopNotifications` class

```dart
final class ConvoHopNotifications
```

Handles ConvoHop push payloads on the device: parses and validates them,
deduplicates on `eventId`, and tracks which calls are ringing.

Delivery is at least once and unordered, so a cancellation can arrive
before its call. A call stops ringing once a cancellation with its
`alertId` was seen or its `expiresAt` passed.

#### `ConvoHopNotifications` constructor

```dart
ConvoHopNotifications({Clock? clock, int capacity = 1024})
```

`capacity` bounds how many event IDs are remembered for deduplication.

#### `ConvoHopNotifications.rings` property

```dart
Stream<RingUpdate> get rings
```

Ring changes: a call starts or stops ringing.

#### `ConvoHopNotifications.ringing` property

```dart
List<CallNotification> get ringing
```

Calls that are ringing now.

#### `ConvoHopNotifications.isRinging` method

```dart
bool isRinging(String alertId)
```

Whether the ring `alertId` is on.

#### `ConvoHopNotifications.handleNotification` method

```dart
HandledNotification? handleNotification(Map<Object?, Object?> payload)
```

Parses and records `payload`. Returns null when it isn't a ConvoHop
payload, and throws a `FormatException` when it breaks the contract.

#### `ConvoHopNotifications.record` method

```dart
HandledNotification record(ConvoHopNotification notification)
```

Records an already parsed `notification`.

#### `ConvoHopNotifications.stopRinging` method

```dart
bool stopRinging(String alertId, {String reason = 'declined'})
```

Stops the ring `alertId` locally, for example after the user declined
it in the call UI. Returns whether it was ringing.

#### `ConvoHopNotifications.stopCall` method

```dart
bool stopCall(String liveSessionId, {String reason = 'ended'})
```

Stops every ring of the call `liveSessionId`, for example when the
call ended. Returns whether any was ringing.

#### `ConvoHopNotifications.applyEvent` method

```dart
bool applyEvent(Event event)
```

Applies a conversation event from the user's realtime connection: a
`live.ended` event stops the call's rings. Pass every event of the
conversations the user can be called in, for example from
`ConversationStore.events`, because pushes don't always report that a
ring stopped. Returns whether a ring stopped.

#### `ConvoHopNotifications.close` method

```dart
void close()
```

Cancels ring timers and stops reporting on `rings`. Payloads are still
parsed, deduplicated and tracked.

### `ConvoHopPush` class

```dart
final class ConvoHopPush
```

Push notifications and the system incoming-call UI on Android and iOS.

The plugin's native code shows ConvoHop pushes even while Dart isn't
running. On Android, its Firebase messaging service builds a notification
for each FCM data message and rings with a full-screen call-style
notification. On iOS, the system shows APNs alerts, and VoIP pushes ring
through CallKit once you `registerVoip`. Without `title` or `body` in the
push, which is the default because message previews are off,
notifications show generic text: see the package README to localize it.

Listen to the streams, then call `start`. Send each registration from
`registrations` to your backend.

#### `ConvoHopPush` constructor

```dart
ConvoHopPush({
  ConvoHopNotifications? notifications,
  ErrorListener? onError,
  @visibleForTesting MethodChannel methods = const MethodChannel('convohop/push'),
  @visibleForTesting EventChannel events = const EventChannel('convohop/push/events'),
})
```

#### `ConvoHopPush.notifications` property

```dart
final ConvoHopNotifications notifications
```

Deduplicates notifications and tracks rings.

#### `ConvoHopPush.registrations` property

```dart
Stream<PushRegistration> get registrations
```

This device's push registrations, after `register` and `registerVoip`
and whenever the platform changes one. The same registration can
arrive more than once: store them idempotently.

#### `ConvoHopPush.received` property

```dart
Stream<HandledNotification> get received
```

ConvoHop pushes that reached the device while Dart was running, after
native code showed them. Check `HandledNotification.duplicate`. On iOS,
alert pushes reach the app only while it's in the foreground.

#### `ConvoHopPush.opened` property

```dart
Stream<ConvoHopNotification> get opened
```

Notifications the user opened: open the conversation or the call.

#### `ConvoHopPush.callActions` property

```dart
Stream<CallAction> get callActions
```

What the user did in the system call UI, including actions taken
shortly before Dart started.

#### `ConvoHopPush.start` method

```dart
Future<void> start()
```

Starts delivering native events, including the notification that
launched the app and earlier call actions. Listen to the streams first.

#### `ConvoHopPush.requestPermission` method

```dart
Future<bool> requestPermission()
```

Asks the user to allow notifications. Resolves whether they're allowed.

#### `ConvoHopPush.register` method

```dart
Future<void> register()
```

Registers this device for alert pushes, and reports the registration on
`registrations`: an `FcmRegistration` on Android and an
`ApnsRegistration` on iOS. Call it at each launch, after `start`.

On iOS the registration can arrive after this returns, once APNs issued
a token. On Android it throws a `PlatformException` with code
`FIREBASE_UNAVAILABLE` when Firebase isn't configured or registration
failed, for example while offline.

#### `ConvoHopPush.registerVoip` method

```dart
Future<void> registerVoip()
```

Registers for VoIP pushes with PushKit, on iOS only, and keeps doing so
at each launch. The registration arrives on `registrations`. Call it
only if your app rings through CallKit: iOS terminates an app that
receives a VoIP push without reporting a call.

#### `ConvoHopPush.canUseFullScreenIntent` method

```dart
Future<bool> canUseFullScreenIntent()
```

Whether Android lets the app show full-screen incoming calls. From
Android 14, users and app stores can turn it off; incoming calls then
show as heads-up notifications. Always true on iOS.

#### `ConvoHopPush.handleNotification` method

```dart
HandledNotification? handleNotification(Map<Object?, Object?> payload)
```

Records a push payload that reached Dart another way, for example
through another push plugin, and reports it on `received`. Returns
null when the payload isn't ConvoHop's; throws a `FormatException`
when it breaks the push payload contract.

#### `ConvoHopPush.showNotification` method

```dart
Future<bool> showNotification(Map<Object?, Object?> payload)
```

Shows a ConvoHop FCM data message with the plugin's notifications, on
Android, when another plugin's messaging service received it: call it
with the message's data from that plugin's foreground and background
handlers, instead of `handleNotification`. While a started
`ConvoHopPush` runs, `received` reports it. Resolves false when
`payload` isn't ConvoHop's, and on iOS, where the system shows APNs
alerts.

#### `ConvoHopPush.showIncomingCall` method

```dart
Future<void> showIncomingCall(CallNotification call)
```

Rings for `call` in the system call UI, for example when another push
plugin delivered the call's push to Dart. Does nothing once the ring
stopped. Throws a `PlatformException` with code `CALL_FAILED` when the
system refused the call, for example when iOS Do Not Disturb or call
blocking rejects it in CallKit.

#### `ConvoHopPush.answerCall` method

```dart
Future<bool> answerCall(String alertId)
```

Answers the ring `alertId` in the system call UI, for example from the
app's own incoming-call screen, and reports it on `callActions`.
Resolves false when the ring had stopped.

#### `ConvoHopPush.declineCall` method

```dart
Future<bool> declineCall(String alertId)
```

Declines the ring `alertId` on this device and reports it on
`callActions`. Resolves false when the ring had stopped. Other devices
keep ringing: the decline is local.

#### `ConvoHopPush.endCall` method

```dart
Future<void> endCall(String alertId, {String reason = 'ended'})
```

Ends the ring or call `alertId` in the system call UI without a call
action: the call ended, or the ring stopped elsewhere. `reason` is a
cancellation reason: `answered`, `declined`, `ended` or `expired`.
Rings that `notifications` sees stop end by themselves.

#### `ConvoHopPush.removeDeliveredNotifications` method

```dart
Future<void> removeDeliveredNotifications({String? conversationId})
```

Removes ConvoHop's delivered message notifications, only
`conversationId`'s when given, for example when the user opens the
conversation. The app's own notifications stay.

#### `ConvoHopPush.setActiveConversation` method

```dart
Future<void> setActiveConversation(String? conversationId)
```

Sets the conversation the user is looking at, or null for none. While
the app is in the foreground, its message pushes show no notification;
they still arrive on `received`.

#### `ConvoHopPush.close` method

```dart
Future<void> close()
```

Stops delivering events. Native code keeps showing pushes.

### `FcmRegistration` class

```dart
final class FcmRegistration extends PushRegistration
```

An Android app registered with Firebase Cloud Messaging, by exactly one of
`token` and `fid`. FCM issues registration tokens unless the app's
manifest switches it to Firebase installation IDs: see the package README.
Your backend sends its FCM messages to the matching `token` or `fid`
target.

#### `FcmRegistration` constructor

```dart
const FcmRegistration.token(String token)
const FcmRegistration.fid(String fid)
```

**`FcmRegistration.token`**

A registration by FCM registration token.

**`FcmRegistration.fid`**

A registration by Firebase installation ID.

#### `FcmRegistration.token` property

```dart
final String? token
```

The FCM registration token, unless FCM registered `fid`.

#### `FcmRegistration.fid` property

```dart
final String? fid
```

The Firebase installation ID (FID) that FCM registered, when the app's
manifest switches FCM to installation IDs.

#### `FcmRegistration.kind` property

```dart
String get kind
```

`fcm`, `apns` or `apnsVoip`.

#### `FcmRegistration.toJson` method

```dart
Map<String, String> toJson()
```

The registration as JSON: `{"kind": "fcm", "token": …}`,
`{"kind": "fcm", "fid": …}` or `{"kind": "apns" | "apnsVoip", "token": …}`.

#### `FcmRegistration.operator ==` method

```dart
bool operator ==(Object other)
```

#### `FcmRegistration.hashCode` property

```dart
int get hashCode
```

#### `FcmRegistration.toString` method

```dart
String toString()
```

### `HandledNotification` class

```dart
final class HandledNotification
```

What `ConvoHopNotifications.handleNotification` found.

#### `HandledNotification.notification` property

```dart
final ConvoHopNotification notification
```

#### `HandledNotification.duplicate` property

```dart
final bool duplicate
```

Whether an earlier payload had the same event ID. Act on a notification
once.

#### `HandledNotification.ringing` property

```dart
final bool ringing
```

For a `CallNotification`: whether the ring is still on, with no
cancellation for its alert seen and its `expiresAt` in the future.

### `MessageNotification` class

```dart
final class MessageNotification extends ConvoHopNotification
```

A new message for the user.

#### `MessageNotification.messageId` property

```dart
final String messageId
```

#### `MessageNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

#### `MessageNotification.fetchMessage` method

```dart
Future<Message> fetchMessage(ConvoHopClient client)
```

Fetches the message with the user's own session, for example when
`body` is null because previews are off.

#### `MessageNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

#### `MessageNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.occurredAt` property

```dart
final String occurredAt
```

Inherited from `ConvoHopNotification`.

#### `MessageNotification.projectId` property

```dart
final String projectId
```

Inherited from `ConvoHopNotification`.

#### `MessageNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.conversationId` property

```dart
final String conversationId
```

Inherited from `ConvoHopNotification`.

#### `MessageNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

Inherited from `ConvoHopNotification`.

#### `MessageNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

Inherited from `ConvoHopNotification`.

### `PushRegistration` class

```dart
sealed class PushRegistration
```

Where your backend sends this device's pushes. Send each one to your
backend, which delivers ConvoHop's notification events to it; ConvoHop
never sees them. Every ConvoHop client hands its app the same JSON shape,
from `toJson`, so one backend endpoint can store registrations from
browsers and native apps.

#### `PushRegistration.kind` property

```dart
String get kind
```

`fcm`, `apns` or `apnsVoip`.

#### `PushRegistration.toJson` method

```dart
Map<String, String> toJson()
```

The registration as JSON: `{"kind": "fcm", "token": …}`,
`{"kind": "fcm", "fid": …}` or `{"kind": "apns" | "apnsVoip", "token": …}`.

### `RingNotification` class

```dart
sealed class RingNotification extends ConvoHopNotification
```

A notification about one ring of a call.

#### `RingNotification.liveSessionId` property

```dart
final String liveSessionId
```

#### `RingNotification.alertId` property

```dart
final String alertId
```

One ring for one recipient. A later ring of the same call has a new one.

#### `RingNotification.expiresAt` property

```dart
final String expiresAt
```

When the ring stops if nobody answers.

#### `RingNotification.mediaProfile` property

```dart
final String mediaProfile
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a profile this SDK doesn't know yet.

#### `RingNotification.expiresAtMillis` property

```dart
int get expiresAtMillis
```

`expiresAt` in milliseconds since the epoch, ignoring any fraction.

#### `RingNotification.hasVideo` property

```dart
bool get hasVideo
```

#### `RingNotification.eventId` property

```dart
final String eventId
```

Deduplicate on this: delivery is at least once.

Inherited from `ConvoHopNotification`.

#### `RingNotification.eventType` property

```dart
String get eventType
```

`notification.message`, `notification.call` or
`notification.callCancelled`.

Inherited from `ConvoHopNotification`.

#### `RingNotification.occurredAt` property

```dart
final String occurredAt
```

Inherited from `ConvoHopNotification`.

#### `RingNotification.projectId` property

```dart
final String projectId
```

Inherited from `ConvoHopNotification`.

#### `RingNotification.recipientId` property

```dart
final String recipientId
```

The principal the notification is for.

Inherited from `ConvoHopNotification`.

#### `RingNotification.conversationId` property

```dart
final String conversationId
```

Inherited from `ConvoHopNotification`.

#### `RingNotification.senderId` property

```dart
final String senderId
```

Who sent the message or started the ringing.

Inherited from `ConvoHopNotification`.

#### `RingNotification.title` property

```dart
final String? title
```

Visible title, when the push had one.

Inherited from `ConvoHopNotification`.

#### `RingNotification.body` property

```dart
final String? body
```

Visible body, when the push had one. With previews off, a message
notification has none.

Inherited from `ConvoHopNotification`.

#### `RingNotification.isFor` method

```dart
bool isFor(ConvoHopClient client)
```

Whether this notification is for `client`'s user and project.

Inherited from `ConvoHopNotification`.

#### `RingNotification.toJson` method

```dart
Map<String, Object?> toJson()
```

The `convohop` object, for handing the notification to native code.

Inherited from `ConvoHopNotification`.

### `RingUpdate` class

```dart
final class RingUpdate
```

A change in a ring's state.

#### `RingUpdate.call` property

```dart
final CallNotification call
```

#### `RingUpdate.ringing` property

```dart
final bool ringing
```

#### `RingUpdate.reason` property

```dart
final String? reason
```

Why the ring stopped: the cancellation's reason, or `expired` when its
`expiresAt` passed. Null while it rings.

## Enums

### `CallActionKind` enum

```dart
enum CallActionKind
```

What the user did in the system call UI.

#### `CallActionKind.answer` case

```dart
answer
```

Answered the ring: join the call.

#### `CallActionKind.decline` case

```dart
decline
```

Declined the ring on this device.

#### `CallActionKind.end` case

```dart
end
```

Ended an answered call.

#### `CallActionKind.mute` case

```dart
mute
```

Muted the microphone in the system call UI, on iOS.

#### `CallActionKind.unmute` case

```dart
unmute
```

Unmuted the microphone in the system call UI, on iOS.

## Functions

### `notificationEpochSeconds` function

```dart
int? notificationEpochSeconds(String value)
```

Unix seconds of an RFC 3339 timestamp with an uppercase `T`, and `Z` or an
offset, ignoring any fraction, or null when the value isn't one. The date
must exist, and second 60 isn't accepted.

### `parseNotificationPayload` function

```dart
ConvoHopNotification? parseNotificationPayload(Map<Object?, Object?> payload)
```

Parses a push payload: an APNs `userInfo` (`{aps, convohop: {...}}`), FCM
data (`{convohop: "<JSON>"}`) or a Web Push payload.

Returns null when the payload isn't ConvoHop's, and throws a
`FormatException` naming the first invalid field when it breaks the push
payload contract. Fields it doesn't know are ignored, as the contract
requires of consumers.
