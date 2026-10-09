// Push quickstart snippets. test/push_test.dart runs them against mocked platform channels, and test/client_test.dart
// runs pushText against the conformance mock. Joining an answered call needs a ConvoHop project with calls and a
// LiveKit media server, so the analyzer only checks that path.

// #region imports
import 'dart:async';

import 'package:convohop/convohop.dart';
import 'package:convohop/push.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'calling.dart'; // The calling quickstart's joinCall, setMuted and leaveCall.

// #endregion imports

// #region register
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
// #endregion register

// #region open
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
// #endregion open

// #region previews
// A message push's text. Message previews are off by default, so the push carries no text unless the project turned
// previews on or your backend set a body. Then fetch the message with the user's session.
Future<String?> pushText(ConvoHopClient client, MessageNotification notification) async =>
    notification.body ?? (await notification.fetchMessage(client)).text;
// #endregion previews

// #region rings
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
// #endregion rings

// #region sign-out
// At sign-out, before you close the client. The plugin's native code keeps showing the pushes that reach the device,
// so also have your backend delete the registrations that it stored for this sign-in.
Future<void> stopPush(ConvoHopPush push) async {
  await push.removeDeliveredNotifications(); // The next user shouldn't see them.
  await push.close();
  push.notifications.close(); // Cancels ring timers.
}
// #endregion sign-out
