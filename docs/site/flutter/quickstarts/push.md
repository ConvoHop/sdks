# Flutter push notifications quickstart

Show ConvoHop push notifications in your users' Flutter apps with `package:convohop/push.dart`: register the device for FCM or APNs, open conversations from notifications, and ring for calls with the system call UI.

## Before you start

ConvoHop doesn't send push notifications itself. Your backend receives `notification.message`, `notification.call` and `notification.callCancelled` webhook events, builds an FCM or APNs request for each of the user's devices with a server SDK, and sends it with your own push credentials, as each server SDK's [push notifications quickstart](../../index.md#quickstarts) shows.

The package's own Android and iOS code shows those pushes, even while Dart isn't running. On Android, its Firebase messaging service builds a notification for each FCM data message and rings with a full-screen call notification. On iOS, the system shows APNs alerts, and VoIP pushes ring through CallKit. Set up the app as the README's [Android setup](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#android-setup) and [iOS setup](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#ios-setup) describe.

The samples use these libraries, and the `joinCall`, `setMuted` and `leaveCall` functions from the [calling quickstart](calling.md#join-a-call):

```dart snippet=docs/languages/flutter/examples/lib/push.dart#imports
import 'dart:async';

import 'package:convohop/convohop.dart';
import 'package:convohop/push.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'calling.dart'; // The calling quickstart's joinCall, setMuted and leaveCall.
```

## Register the device

```dart snippet=docs/languages/flutter/examples/lib/push.dart#register
// The app's screens that pushes open.
abstract interface class AppScreens {
  void showConversation(String conversationId);

  // An incoming-call screen. Its buttons call push.answerCall(call.alertId) and push.declineCall(call.alertId), and it
  // closes when push.notifications.rings reports that the ring stopped.
  void showRing(CallNotification call);

  // The call screen. It calls hangUp when the user hangs up, or when the conversation's live.ended event arrives.
  void showCall(JoinedCall call, {required Future<void> Function() hangUp});

  void closeCall(JoinedCall call);
}

// Starts push for a signed-in client. saveRegistration sends a registration to your backend, which stores it as one
// of the user's devices.
Future<ConvoHopPush> startPush(
  ConvoHopClient client,
  AppScreens screens, {
  required Future<void> Function(Map<String, String> registration) saveRegistration,
}) async {
  final push = ConvoHopPush(onError: (error) => debugPrint('Push failed: $error'));
  final calls = IncomingCalls(client, push, screens);
  // Listen before start(): it delivers the notification that launched the app, and earlier call actions.
  push.registrations.listen((registration) async {
    try {
      // {"kind": "fcm", "token" or "fid": …} on Android, {"kind": "apns" or "apnsVoip", "token": …} on iOS. The same
      // registration can arrive again: store it idempotently.
      await saveRegistration(registration.toJson());
    } on Object catch (error) {
      debugPrint("Couldn't save the push registration: $error"); // register() delivers it again at the next launch.
    }
  });
  push.opened.listen((notification) => openNotification(client, push, screens, notification));
  push.callActions.listen((action) => unawaited(calls.handle(action)));
  try {
    await push.start();
    await push.requestPermission();
    try {
      await push.register(); // FCM on Android, APNs on iOS. Call it at each launch.
    } on PlatformException catch (error) {
      // FIREBASE_UNAVAILABLE: Firebase isn't set up, or registration failed, for example while offline.
      debugPrint("Couldn't register for push: ${error.code}");
    }
    // Only if the app rings through CallKit: iOS terminates an app that gets a VoIP push without reporting a call.
    if (defaultTargetPlatform == TargetPlatform.iOS) await push.registerVoip();
  } on Object {
    await push.close();
    rethrow;
  }
  return push;
}
```

A registration is the device's push address. Your backend stores it as one of the signed-in user's devices, and sends the user's pushes to it. Call `register()` at each launch, and store registrations idempotently, because the same one can arrive again.

- On Android, an FCM registration carries a registration `token` by default. When the app's manifest sets `firebase_messaging_installation_id_enabled`, it carries the device's Firebase Installation ID (`fid`) instead, which your backend sends to with a Firebase Admin SDK that supports FIDs. The setting applies to the whole app: FCM's `getToken()` then fails for every library in it, so the token stays the default. FID registrations need firebase-messaging 25.1.2 or later, which the package depends on, so don't force an older one, for example with an enforced Firebase BoM before 34.18.0.
- On iOS, an APNs registration carries the device token, which arrives once APNs has registered the device, possibly after `register()` returns. `registerVoip()` adds a PushKit token for calls. Call it only if the app rings through CallKit, because iOS terminates an app that receives a VoIP push without reporting a call.

[Push notifications](https://github.com/ConvoHop/sdks/blob/main/docs/sdk-strategy.md#push-notifications-bring-your-own) lists the Firebase Admin SDK versions that send to a FID.

## Open a notification

```dart snippet=docs/languages/flutter/examples/lib/push.dart#open
// The user tapped a notification.
void openNotification(ConvoHopClient client, ConvoHopPush push, AppScreens screens, ConvoHopNotification notification) {
  // A device keeps its registration across sign-ins, so a push can be for another user.
  if (!notification.isFor(client)) return;
  switch (notification) {
    case MessageNotification(:final conversationId):
      screens.showConversation(conversationId);
    case CallNotification(:final alertId, :final conversationId):
      if (push.notifications.isRinging(alertId)) {
        screens.showRing(notification);
      } else {
        // The ring stopped. When the user answered it from the notification, the answer arrives on callActions too.
        screens.showConversation(conversationId);
      }
    case CallCancelledNotification(:final conversationId):
      screens.showConversation(conversationId); // A missed call, or one answered on another device.
  }
}
```

`opened` reports the notification that the user tapped, including the one that launched the app, which `start()` delivers. A device keeps its registration across sign-ins, so a push can be addressed to a user who signed in on it before: act on one only when `isFor(client)` is true. `push.notifications` tracks rings: `isRinging(alertId)` is false once the ring stopped, for example because the call was answered, declined, cancelled or ended, or the ring expired.

While a conversation is on screen, call `push.setActiveConversation(conversationId)`, so that its messages show no notification while the app is in the foreground, and `push.removeDeliveredNotifications(conversationId: conversationId)` to remove the notifications it already showed.

## Show a message's text

```dart snippet=docs/languages/flutter/examples/lib/push.dart#previews
// A message push's text. Message previews are off by default, so the push carries no text unless the project turned
// previews on or your backend set a body. Then fetch the message with the user's session.
Future<String?> pushText(ConvoHopClient client, MessageNotification notification) async =>
    notification.body ?? (await notification.fetchMessage(client)).text;
```

Message previews are off by default, so a message push carries no message text unless the project turns them on, or your backend sets a title or body when it builds the request, for example the sender's name. Without text, the notification shows generic text, such as "New message", which you can translate with [Android string resources](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#android-setup) and [iOS localized strings](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#ios-setup). In Dart, `notification.body` is then null, and `fetchMessage` reads the message with the user's session. It throws a `StateError` for a push addressed to another user.

## Answer calls

```dart snippet=docs/languages/flutter/examples/lib/push.dart#rings
// Joins the calls that the user answers in the system call UI or the incoming-call screen, by alertId.
final class IncomingCalls {
  IncomingCalls(this.client, this.push, this.screens);

  final ConvoHopClient client;
  final ConvoHopPush push;
  final AppScreens screens;
  final Map<String, Future<JoinedCall?>> _calls = {};

  Future<void> handle(CallAction action) async {
    final alertId = action.alertId;
    try {
      switch (action.kind) {
        case CallActionKind.answer:
          if (_calls.containsKey(alertId)) return;
          final joining = _calls[alertId] = _answer(action);
          if (await joining == null && _calls[alertId] == joining) _calls.remove(alertId);
        case CallActionKind.decline:
          break; // The ring stopped on this device. The user's other devices keep ringing.
        case CallActionKind.end:
          // The user ended the call in the system call UI, which is closed already. Waits for a join in progress.
          final joined = await _calls.remove(alertId);
          if (joined != null) await _leave(joined);
        case CallActionKind.mute || CallActionKind.unmute:
          final joined = await _calls[alertId];
          if (joined != null) await setMuted(joined, action.kind == CallActionKind.mute);
      }
    } on Object catch (error) {
      debugPrint("Couldn't handle the call action: $error");
    }
  }

  // The call screen's hang-up: leaves the call and ends it in the system call UI.
  Future<void> hangUp(String alertId) async {
    try {
      final joined = await _calls.remove(alertId);
      if (joined != null) await _leave(joined);
      await push.endCall(alertId);
    } on Object catch (error) {
      debugPrint("Couldn't hang up: $error");
    }
  }

  Future<JoinedCall?> _answer(CallAction action) async {
    try {
      // The ring's notification, unless the device lost it.
      final call = action.call;
      if (call == null || !call.isFor(client)) throw StateError('This user has no such ring');
      final joined = await joinCall(await client.liveSession(call.liveSessionId));
      screens.showCall(joined, hangUp: () => hangUp(action.alertId));
      return joined;
    } on Object catch (error) {
      debugPrint("Couldn't answer the call: $error");
      await push.endCall(action.alertId); // Closes the system call UI.
      return null;
    }
  }

  Future<void> _leave(JoinedCall joined) async {
    screens.closeCall(joined);
    try {
      await leaveCall(joined);
    } on Object catch (error) {
      debugPrint("Couldn't leave the call: $error");
    }
  }
}
```

A ring shows a full-screen call notification on Android and CallKit's call UI on iOS. Answering, declining, ending, muting and unmuting there arrive on `callActions` with the ring's `alertId`. Your own incoming-call screen answers and declines with `push.answerCall(alertId)` and `push.declineCall(alertId)`, and the answer arrives on `callActions` too.

- Declining stops the ring on this device only. The user's other devices keep ringing.
- Since Android 14, users and app stores can stop the app from showing full-screen notifications. `canUseFullScreenIntent()` says whether it may. Without it, rings show as heads-up notifications.
- iOS VoIP pushes are for `notification.call` only, so a running app learns that a ring stopped from its realtime events. Pass every event of the conversations the user can be called in to `push.notifications.applyEvent`, for example from `store.events`: a `live.ended` event stops the call's ring and ends it in CallKit. A missed call arrives as an APNs alert.
- `push.endCall(alertId)` ends a call in the system call UI, for example when the user hangs up in the app.

## Sign out

```dart snippet=docs/languages/flutter/examples/lib/push.dart#sign-out
// At sign-out, before you close the client. The plugin's native code keeps showing the pushes that reach the device,
// so also have your backend delete the registrations that it stored for this sign-in.
Future<void> stopPush(ConvoHopPush push) async {
  await push.removeDeliveredNotifications(); // The next user shouldn't see them.
  await push.close();
  push.notifications.close(); // Cancels ring timers.
}
```

Call it before you close the client. The package's Android and iOS code keeps showing the pushes that reach the device after `close()`, so have your backend delete the registrations that it stored for this sign-in, and revoke the session, as the [client quickstart](client.md#sign-out) shows. A push that your backend sent before it deleted them can still arrive and show its notification. Opening it does nothing, because `isFor` is false for the next user.

## Other push plugins

Android delivers each FCM message to one messaging service. If the app uses another one, such as `firebase_messaging`'s, remove ConvoHop's service from the merged manifest and pass each message's data to `push.showNotification(message.data)`, as [the README](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md#other-push-plugins) shows. `handleNotification(payload)` records a payload that reached Dart another way, such as APNs `userInfo`, FCM data or a Web Push payload, and reports it on `received`.

## How the samples are tested

The push samples run against mocked platform channels that answer the way the package's Android and iOS code does. The tests register with FCM, by token and by FID, and with APNs and PushKit, open notifications for this user and for another, answer a ring that the user can't join, and sign out. `pushText` runs against the conformance mock, with a message preview and without one. Joining an answered call needs a ConvoHop project with calls and a LiveKit media server, so CI only analyzes it. The tests don't deliver pushes through FCM or APNs, and don't show the system call UI.

## Next steps

- [`ConvoHopPush` reference](../reference/push.md#convohoppush-class): registering, notifications and the system call UI.
- [`ConvoHopNotifications` reference](../reference/push.md#convohopnotifications-class): de-duplicating pushes and tracking rings.
- [Push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md): the payloads that your backend sends and the package reads.
- [Calling quickstart](calling.md): the calls that these notifications ring.
