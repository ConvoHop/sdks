# ConvoHop Flutter SDK

`convohop` is the ConvoHop client SDK for Flutter apps on Android and iOS. It
runs one signed-in user's session: conversations and their history, realtime
updates that resume after reconnects, a local conversation store, an offline
outbox with optimistic sends, read receipts, typing, recent activity, calls
through the official [`livekit_client`](https://pub.dev/packages/livekit_client)
package, push registration, notification handling and the system
incoming-call UI. It holds only the short-lived user session that your backend
issues. Never put a backend key or an operator credential in an app. The
package isn't on pub.dev yet: [install it from Git](#install).
License: [Apache-2.0](LICENSE).

## Requirements

- Flutter 3.38 or later, with Dart 3.10 or later. CI tests Flutter 3.38 and
  the current stable release.
- Android 7.0 (API level 24) or later. The plugin compiles against API level
  36 and uses Firebase Cloud Messaging for push: `firebase-messaging` 25.1.2
  or later, which Firebase's Android BoM 34.18.0 and later select.
- iOS 13 or later. The plugin uses CallKit, PushKit and UserNotifications. It
  builds with CocoaPods, or with Swift Package Manager on Flutter 3.41 or
  later. On earlier releases, leave Swift Package Manager off, as it is by
  default.
- Xcode 26.1 or later for iOS builds. `livekit_client` uses
  `device_info_plus`, which from version 12.4.0 calls an API that the iOS
  26.1 SDK added.
- Your backend, with a [server SDK](../README.md#available-as-source), signs
  the user in and issues and renews their ConvoHop session.

## Install

Add the package as a Git dependency pinned to a commit of this repository:

```yaml
dependencies:
  convohop:
    git:
      url: https://github.com/ConvoHop/sdks.git
      path: flutter
      ref: <commit SHA>
```

The generated code is committed, so there's no build step. Then set up
[Android](#android-setup) and [iOS](#ios-setup) for push and calls.

| Library | Contents |
| --- | --- |
| `package:convohop/convohop.dart` | The client, conversations, the store, the outbox, receipts, typing, recent activity, calls without media, notification payloads and the generated models. Pure Dart. |
| `package:convohop/calls.dart` | `liveKitRooms()`, call media through `livekit_client` |
| `package:convohop/push.dart` | `ConvoHopPush`: push registration, notifications and the system call UI, through the plugin's platform code |
| `package:convohop/io.dart` | `FileRecoveryStorage`, file-backed storage for platforms with `dart:io` |

## Sign in

Your backend authenticates the user with your app's own sign-in, then issues
a ConvoHop session with the server SDK (`sessions.issue`) and returns the
bootstrap to the app. Create the client from it:

```dart
import 'dart:io';

import 'package:convohop/convohop.dart';
import 'package:convohop/io.dart';
import 'package:path_provider/path_provider.dart';

final bootstrap = SessionBootstrap.fromJson(json['bootstrap']);
final session = bootstrap.session!;
final support = await getApplicationSupportDirectory();
final client = ConvoHopClient(
  baseUrl: json['baseUrl'] as String,
  projectId: json['projectId'] as String,
  incarnation: session.incarnation,
  principalId: session.principalId,
  sessionToken: bootstrap.sessionToken,
  // Keeps mutation recovery, replay cursors, unsent messages and stored
  // conversations across restarts. Tokens are never stored.
  recoveryStorage: FileRecoveryStorage(Directory('${support.path}/convohop')),
  // Your backend renews the session with the server SDK's sessions.renew.
  sessionRefresh: (binding) => backend.renew(binding),
);
await client.initialize();
```

`initialize()` resolves the project's route and, with `sessionRefresh` set,
verifies the session once. Then let a `SessionRefresher` renew the session
before it expires:

```dart
late final SessionRefresher refresher;
refresher = SessionRefresher(client, onError: (error) {
  // When it can't refresh any more, active is already false: sign in again.
  if (!refresher.active) signInAgain();
});
```

It refreshes 5 minutes before expiry by default (`lead`), and after a failure
that left the client usable it tries again with backoff while the session is
valid. Timers don't fire while the app is suspended, so call
`refresher.check()` when the app returns to the foreground. Close the
refresher, then the client, when the user signs out. Your backend's renew
endpoint must check that the session belongs to the signed-in user: the
callback receives the current binding (`sessionId`, `principalId`,
`deviceId` and `sessionRevision`). `client.sessionRefreshState` reports
`ready`, `refreshing` or `blocked`, among others.

## Conversations

```dart
final inbox = await client.inbox();
for (final item in inbox.items) {
  print('${item.title}: ${item.latestVisibleMessage?.text ?? ''}');
}

final conversation = client.conversation(conversationId);
final page = await conversation.messages.list();
final results = await client.search('invoice');
```

`client.conversation(id)` returns a handle with `get()`, `messages` (`send`,
`list`, `edit` and `delete`), `mute` and `live` for calls. Failures throw a
`ConvoHopProblem` with a `code`, the `requestId` and an `outcome`:
`rejected`, `committed`, `accepted`, or `unknown` when a mutation may or may
not have been applied. The SDK retries a mutation only with its original
request ID, payload and retry budget. Resolve an `unknown` outcome with
`client.requests.resolve(problem.requestId)` before you try anything else,
and call `client.recoverPending(onError)` after a restart to finish
mutations that were in flight.

## Conversation store

`ConversationStore` keeps one conversation current on the device. It loads
the newest messages and receipts, follows the conversation's realtime
events, and fetches each new or changed message. After a dropped connection
it reconnects with backoff and resumes after the last event it applied. With
`persist: true`, it shows the stored conversation at once on the next launch
while it catches up.

```dart
final store = ConversationStore(client, conversationId, outbox: outbox, persist: true, onError: report);
store.changes.listen((snapshot) {
  // snapshot.messages: committed messages, oldest first.
  // snapshot.pending: this user's optimistic sends, after them.
  render(snapshot);
});
```

| Status | Meaning |
| --- | --- |
| `loading` | Nothing to show yet. |
| `ready` | Showing the conversation. `snapshot.connected` says whether it's following realtime now; it reconnects by itself. |
| `resyncRequired` | The authority can't continue from the store's position, for example after the user's visibility changed or retained history expired. The store never skips history on its own: call `store.resync()`. |
| `failed` | Stopped on an error in `snapshot.error`. `store.reconnect()` tries again. |
| `closed` | `store.close()` was called. Stored state stays for next time. |

`store.loadOlder()` loads earlier pages while `snapshot.hasOlder`, and
`store.events` reports each event it applied, such as `live.*` events for a
call UI. Use one store per conversation and client, and call
`store.reconnect()` when connectivity returns to skip the backoff. Without a
store, `client.watch(conversationId, apply, onError)` replays a
conversation's events from the stored cursor through your own `apply` and
follows them over realtime.

## Offline queue and optimistic sends

`ConvoHopOutbox` sends messages in the background, in order within each
conversation, across lost connectivity and app restarts. Create one per
client and pass it to each store:

```dart
final outbox = ConvoHopOutbox(client, onError: report);
await outbox.initialize();

await store.send('On my way'); // Shows in snapshot.pending at once.
```

Each message keeps one request ID for life, which also identifies the
optimistic message on the device. The outbox resends only within the
original three-attempt, 60-second retry budget, and only after a read-only
check found that no earlier attempt was committed. While the authority is
unreachable, it checks read-only before a message's first attempt, so waiting
offline doesn't spend the budget. Call `outbox.flush()` when connectivity
returns.

| `OutboxItem.state` | Meaning | Action |
| --- | --- | --- |
| `queued`, `sending` | Waiting or in flight | None |
| `sent` | Committed. The store replaces it with the committed message. | None |
| `failed` | Rejected, and not committed | `outbox.resend(requestId)` sends the text again as a new message, or `discard` |
| `unknown` | The retry budget is spent and an attempt may have been committed | `outbox.resolve(requestId)` asks again. Resending can duplicate the message, so ask the user first. |

The outbox holds at most 100 unsent messages.

On sign-out, await `outbox.close()` and each store's `close()` before you
clear the recovery storage: each completes once it has stopped writing, the
outbox once the send it started has settled too. Requests still running
elsewhere on the client save their recovery records when they settle, so
wait for those too.

## Read receipts

```dart
if (snapshot.unreadCount > 0) await store.markRead();
final readers = snapshot.readBy(message); // Other members whose receipt covers it.
```

`markRead()` reports that the user read through the newest message, unless
their receipt already covers it. `snapshot.receipts` has each member's
latest delivery and read progress. A visibility change invalidates older
receipts.

## Typing

```dart
final typing = TypingIndicator(client, conversationId);
// In the text field's onChanged:
text.isEmpty ? typing.stop() : typing.keystroke();
// When the user sends: typing.stop(). When the screen closes: typing.close().
```

It signals at most once every 3 seconds while the user types and stops by
itself 5 seconds after the last keystroke. Signals are single attempts that
are never retried. They're outbound only: ConvoHop doesn't deliver other
members' typing to clients.

## Recent activity

ConvoHop doesn't publish online status to clients. The `ConversationActivity`
extension derives recent activity from what a store holds: when each member
last wrote, edited or reported a receipt in the conversation.

```dart
final active = snapshot.isRecentlyActive(principalId); // Within 5 minutes.
final lastSeen = snapshot.lastActive[principalId];
```

Show it as "recently active", not "online".

## Calls

```dart
import 'package:convohop/calls.dart';

final live = client.conversation(conversationId).live;
final call = await live.current() ?? await (await live.startVoice()).ready();
await call.alerts.send([calleeId]); // Rings them.

final participation = await call.join();
late LiveMediaConnection<LiveKitMediaRoom> connection;
connection = await participation.connect(liveKitRooms(), onDisconnected: () async {
  connection = await connection.reconnect();
  await connection.microphone(true);
});
await connection.microphone(true);
final room = connection.room.room; // The livekit_client Room, for rendering.

await participation.leave(); // Leaves and disconnects the media.
```

`startVideo()` allows the camera (`connection.camera(true)`), and
`startBroadcast(mediaProfile:)` starts a broadcast. Every connection admits
once with fresh single-use credentials from the call's grant, and never
starts the microphone or camera by itself. LiveKit resumes a dropped
connection on its own. When it would have to join again from scratch, the
room disconnects instead, `onDisconnected` runs, and `reconnect()` continues
with new credentials. Pass `relayOnly: true` to `liveKitRooms()` to send
media through TURN relays only.
Set up `livekit_client` for each platform as its
[installation guide](https://pub.dev/packages/livekit_client#installation)
describes: microphone and camera usage descriptions, the `audio` background
mode on iOS and the Android permissions.

## Push notifications

ConvoHop doesn't send pushes for you
([bring your own](../docs/sdk-strategy.md#push-notifications-bring-your-own)).
It sends your backend a webhook for each `notification.message`,
`notification.call` and `notification.callCancelled` event, and your backend
builds the APNs or FCM request with a server SDK's push builders and sends it
to the push registrations that the app gave it. The requests follow the
[push payload contract](../spec/push-payload/README.md).

`ConvoHopPush` is the app side. The plugin's native code shows ConvoHop pushes
even while Dart isn't running: on Android, its Firebase messaging service
builds a notification for each FCM data message and rings with a full-screen,
call-style notification; on iOS, the system shows APNs alerts, and VoIP
pushes ring through CallKit.

```dart
import 'dart:io' show Platform;

import 'package:convohop/push.dart';

final push = ConvoHopPush(onError: report);
push.registrations.listen(backend.registerPush); // Send each one to your backend.
push.opened.listen(openConversationOrCall);      // The user tapped a notification.
push.callActions.listen(handleCallAction);       // Answer, decline, end, mute, unmute.
push.received.listen(handlePush);                // Pushes while the app runs.
await push.start(); // Listen first: it delivers the launch notification and earlier call actions.

await push.requestPermission();
await push.register(); // FCM on Android, APNs on iOS.
if (Platform.isIOS) await push.registerVoip(); // Only if the app rings through CallKit.
```

A `PushRegistration` is an `FcmRegistration` on Android or an
`ApnsRegistration` with the APNs `token` on iOS. An `FcmRegistration` carries
the FCM registration `token`, or the Firebase installation ID (`fid`) when the
app's manifest switches FCM to installation IDs
([Android setup](#android-setup)). Its `toJson()` is the shape every ConvoHop
client gives its app: `{"kind": "fcm", "token": …}` or
`{"kind": "fcm", "fid": …}`, and `{"kind": "apns", "token": …}` or, for
PushKit, `{"kind": "apnsVoip", "token": …}`. Your backend sends each FCM
message to the registration's `token` or `fid`, the matching target of FCM's
HTTP v1 API. `firebase-admin` sends to a `fid` from 14.1.0 for Node.js and
7.5.0 for Python.

Call `register()` at each launch. The same registration can arrive more than
once, so store registrations idempotently. On Android, `register()` throws a
`PlatformException` with the code `FIREBASE_UNAVAILABLE` when Firebase isn't
set up or registration failed, for example while offline. On iOS the registration arrives once APNs registered the
device, which can be after `register()` returns. Call `registerVoip()` only if
the app answers calls: iOS terminates an app that receives a VoIP push without
reporting a call. `received` reports pushes that reach the device while Dart
runs. On iOS, alert pushes reach the app only while it's in the foreground.

Every notification is a `MessageNotification`, `CallNotification` or
`CallCancelledNotification` with the event's IDs. Check `isFor(client)`
before acting on one, because a device keeps its registration across
sign-ins.
`HandledNotification.duplicate` marks a push the app has already seen:
delivery is at least once.

```dart
void openConversationOrCall(ConvoHopNotification notification) {
  if (!notification.isFor(client)) return;
  switch (notification) {
    case MessageNotification(:final conversationId):
      showConversation(conversationId);
    case CallNotification(:final conversationId, :final liveSessionId, :final alertId):
      showCall(conversationId, liveSessionId, alertId);
    case CallCancelledNotification():
      break;
  }
}
```

### Message previews

Message previews are off by default, so a message push carries no message
text. The plugin then shows generic text, such as "New message", unless your
backend sets a title or body when it builds the request, for example the
sender's name. When the project turns previews on, the server SDK's builders
put the start of the message in the body. In Dart, `notification.title` and
`notification.body` are null when the push has no text. Fetch the message
with the user's session when you need it:

```dart
Future<String?> pushText(MessageNotification notification) async =>
    notification.body ?? (await notification.fetchMessage(client)).text;
```

Translate the generic text with the [Android string resources](#android-setup)
and the [iOS localized strings](#ios-setup).

### Rings

`push.notifications` (`ConvoHopNotifications`) de-duplicates pushes and
tracks rings. A ring stops when a `notification.callCancelled` arrives, at its
`expiresAt`, or when `notifications.applyEvent(event)` sees the call's
`live.ended` event, for example from `store.events`. On iOS, VoIP pushes are
for `notification.call` only, so a running app learns that a ring stopped
from its realtime events or `expiresAt`, and a missed call arrives as an APNs
alert ([calls on iOS](../spec/push-payload/README.md#calls-on-ios)).

| Method | Use |
| --- | --- |
| `answerCall(alertId)` | Answer from the app's own UI. The answer arrives on `callActions`. |
| `declineCall(alertId)` | Decline on this device. Other devices keep ringing. |
| `endCall(alertId)` | End the call in the system UI when the call ends or the ring stops elsewhere. |
| `showIncomingCall(call)` | Ring for a `CallNotification` that reached Dart another way. Throws a `PlatformException` with the code `CALL_FAILED` when the system refuses the call, for example under iOS Do Not Disturb. |
| `canUseFullScreenIntent()` | Whether Android lets the app show full-screen incoming calls. Since Android 14 users and app stores can turn it off; rings then show as heads-up notifications. |
| `setActiveConversation(id)` | While the app is in the foreground, show no notification for this conversation's messages. They still arrive on `received`. |
| `removeDeliveredNotifications(conversationId: id)` | Remove a conversation's delivered ConvoHop message notifications, for example when the user opens it. |

### Other push plugins

`handleNotification(payload)` records a payload that reached Dart another
way and reports it on `received`. It accepts the APNs `userInfo`, the FCM
data and the Web Push payload, returns null for a payload that isn't
ConvoHop's, and throws a `FormatException` for one that breaks the contract.

Android delivers each FCM message to one messaging service. If the app uses
another one, such as `firebase_messaging`'s, remove ConvoHop's service from
the merged manifest and pass each message's data to
`push.showNotification(message.data)` from that plugin's foreground and
background handlers, so the plugin still shows the notification or rings:

```xml
<service
    android:name="com.convohop.flutter.ConvoHopMessagingService"
    tools:node="remove" />
```

`register()` still delivers the registration, but FCM reports later changes
to the other plugin's service, so `registrations` doesn't see them: call
`register()` at each launch. A native `FirebaseMessagingService` calls
`ConvoHopMessaging.handleMessage(context, message.getData())` from
`onMessageReceived`, `ConvoHopMessaging.handleNewToken(token)` from
`onNewToken` and `ConvoHopMessaging.handleRegistered(installationId)` from
`onRegistered` instead. On iOS the system shows
APNs alerts itself, and the plugin receives notification callbacks through
Flutter's app delegate: it sets the notification center's delegate at launch
unless something else already has.

## Android setup

1. Add Firebase to the Android app with `google-services.json` and the Google
   services Gradle plugin, as
   [Firebase's Android setup](https://firebase.google.com/docs/android/setup)
   describes. The plugin's messaging service uses the default Firebase app,
   so the app needs no Firebase code in Dart.
2. Optionally switch FCM from registration tokens, which `firebase-messaging`
   25.1 deprecated, to Firebase installation IDs in the app's
   `AndroidManifest.xml`. `register()` then reports `fid` registrations
   instead of `token` ones.

   ```xml
   <application>
       <meta-data
           android:name="firebase_messaging_installation_id_enabled"
           android:value="true" />
   </application>
   ```

   The setting applies to the whole app: FCM's `getToken()` and
   `deleteToken()` then fail, so any other code that uses FCM registration
   tokens, such as `firebase_messaging`'s `getToken()`, has to move to
   installation IDs as well.
3. Optionally set the notification icon, a monochrome drawable, and its color.
   Without an icon, notifications use the app icon.

   ```xml
   <application>
       <meta-data
           android:name="com.convohop.flutter.notification_icon"
           android:resource="@drawable/ic_notification" />
       <meta-data
           android:name="com.convohop.flutter.notification_color"
           android:resource="@color/notification" />
   </application>
   ```

4. Translate or replace the generic text by defining these strings in your
   app's resources: `convohop_message_title` (New message),
   `convohop_call_title` (Incoming call), `convohop_call_voice` (Voice call),
   `convohop_call_video` (Video call), `convohop_missed_call_title` (Missed
   call), `convohop_call_answer` (Answer), `convohop_call_decline` (Decline)
   and the channel names `convohop_channel_messages`,
   `convohop_channel_calls` and `convohop_channel_missed_calls`.

The plugin's manifest adds the `POST_NOTIFICATIONS`, `USE_FULL_SCREEN_INTENT`
and `VIBRATE` permissions. Google Play allows `USE_FULL_SCREEN_INTENT` only
for calling and alarm apps; an app that doesn't ring removes it:

```xml
<uses-permission
    android:name="android.permission.USE_FULL_SCREEN_INTENT"
    tools:node="remove" />
```

Notification taps open the app's launcher activity, which other apps can
start too. The plugin's notification intents carry a random secret that it
keeps in the app's private storage, and the plugin ignores ConvoHop intents
without it.

## iOS setup

1. In Xcode, add the Push Notifications capability and, if the app rings
   through CallKit, the Background Modes capability with Voice over IP and
   Audio.
2. Call `ConvoHopPlugin.handleLaunch()` in the app delegate before
   `super.application(_:didFinishLaunchingWithOptions:)`. Apps with scenes,
   including those that `flutter create` makes today, register plugins after
   launch, but iOS terminates an app that a VoIP push launched unless it
   reports the call, and reports the notification that launched the app only
   to a delegate set by then:

   ```swift
   import Flutter
   import UIKit
   import convohop

   @main
   @objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
     override func application(
       _ application: UIApplication,
       didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
     ) -> Bool {
       ConvoHopPlugin.handleLaunch()
       return super.application(application, didFinishLaunchingWithOptions: launchOptions)
     }

     func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
       GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
     }
   }
   ```

3. Define the keys that alerts without text use in the app's
   `Localizable.strings`, and add the file to the app target:

   ```text
   "CONVOHOP_MESSAGE" = "New message";
   "CONVOHOP_CALL" = "Incoming call";
   "CONVOHOP_MISSED_CALL" = "Missed call";
   ```

   CallKit shows `CONVOHOP_CALL` as the caller when the push has no title.
4. Optionally add a template image named `ConvoHopCallIcon` to the asset
   catalog for CallKit's call UI.

APNs alerts carry `mutable-content`, so a Notification Service Extension
could fetch the message with the user's session and replace the generic
text. This package doesn't include one.

## Data on the device

`RecoveryStorage` receives mutation recovery records, replay cursors, the
outbox's unsent messages and, with `persist: true`, up to 200 of each
conversation's newest messages. These include message text, so keep the
storage app-private: `FileRecoveryStorage` writes one file per key into the
directory you give it, and `MemoryRecoveryStorage` keeps nothing across
restarts. The SDK never stores session tokens or call credentials. The
plugin's native code keeps a little push state in the app's preferences: on
Android, recently handled event IDs, stopped rings and call actions that
Dart hasn't taken yet; on iOS, stopped rings and whether to register for
VoIP pushes at launch.

## Limitations

- Android and iOS only. The plugin has no web, macOS, Windows or Linux code.
- No online status: [recent activity](#recent-activity) instead. Typing is
  outbound only.
- Declining a ring is local to the device.
- No Notification Service Extension on iOS, so alerts without a preview show
  the generic text.
- Unit tests use fakes for the platform channels, the realtime socket and
  LiveKit. They don't prove real push delivery, CallKit or full-screen
  intents, WebRTC media or a hosted deployment.

## Develop

```sh
cd flutter
flutter pub get
dart format lib test example/lib
flutter analyze --fatal-infos
flutter test
```

`lib/src/generated` holds code generated from the schemas: never edit it.
From the repository root, `npm run generate:graphql` regenerates it and
`npm run check:graphql` checks it. See [SDK generation](../docs/sdk-generation.md).

To run the [conformance suite](../spec/conformance/README.md) with the Dart
driver, build it, then run the scenarios from the repository root. Use
`dart build cli`, not `dart compile exe`: a package that `livekit_client`
depends on has build hooks, and `dart compile exe` rejects those.

```sh
cd conformance/drivers/dart
flutter pub get
dart build cli --target bin/driver.dart --output build/driver
cd ../../..
npm run conformance -- --driver conformance/drivers/dart/build/driver/bundle/bin/driver
```

The [example app](example/README.md) signs in through your backend and shows
the inbox, a conversation with the store, the outbox and typing, push and
voice calls. CI builds it for Android and the iOS simulator.

| Path | Contents |
| --- | --- |
| `lib/src` | The client, transport, realtime, store, outbox, typing, recent activity, calls, notifications and push |
| `lib/src/generated` | Generated models, decoders and operation specs for the operations a user session can run |
| `android` | The plugin's Android code: FCM, notifications and full-screen calls |
| `ios` | The plugin's iOS code: APNs, PushKit and CallKit |
| `test` | Unit tests |
| `example` | The example app |
| [`../conformance/drivers/dart`](../conformance/drivers/dart) | The conformance driver |
