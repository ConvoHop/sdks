// Calling quickstart snippets. The analyzer checks them, but no test runs them: a call needs a ConvoHop project with
// calls and a LiveKit media server, which the conformance mock doesn't provide.

// #region imports
import 'dart:async';

import 'package:convohop/calls.dart';
import 'package:convohop/convohop.dart';
import 'package:flutter/foundation.dart';

// #endregion imports

// #region start-call
// The conversation's current call, or a new voice call once it has started. startVideo() starts a video call. A
// conversation has one call at a time: starting another fails with LIVE_SESSION_EXISTS.
Future<LiveSessionHandle> startCall(ConvoHopClient client, String conversationId) async {
  final live = client.conversation(conversationId).live;
  return await live.current() ?? await (await live.startVoice()).ready();
}

// Rings other members' devices. Only the member who started the call, or a moderator of the conversation, can ring.
// Each member you ring gets a notification.call webhook event, which your backend sends as a push.
Future<void> ring(LiveSessionHandle call, List<String> principalIds) async {
  await call.alerts.send(principalIds);
}
// #endregion start-call

// #region join-call
// This user's place in a call, and its media.
final class JoinedCall {
  JoinedCall(this.participation);

  final LiveParticipationHandle participation;

  // connection!.room.room is the livekit_client Room, for rendering participants and tracks.
  LiveMediaConnection<LiveKitMediaRoom>? connection;

  // The user's choice, which a new connection applies.
  bool muted = true;
}

// Joins the call and connects its media with fresh single-use credentials.
Future<JoinedCall> joinCall(LiveSessionHandle call) async {
  final joined = JoinedCall(await call.join());
  try {
    joined.connection = await joined.participation.connect(
      liveKitRooms(),
      // LiveKit resumes a dropped connection by itself. When it would have to join from scratch, the room disconnects
      // instead and this runs.
      onDisconnected: () => unawaited(reconnectCall(joined)),
    );
  } on Object {
    try {
      await leaveCall(joined); // The participation outlives a failed connection.
    } on Object catch (error) {
      debugPrint("Couldn't leave the call: $error");
    }
    rethrow;
  }
  // Connecting never turns the microphone or camera on. A voice call allows the microphone.
  if (joined.participation.snapshot.permissions.microphone) {
    try {
      await setMuted(joined, false); // Asks the user for microphone access the first time.
    } on Object catch (error) {
      joined.muted = true;
      debugPrint('The microphone stays off: $error'); // For example, the user denied access. Still in the call.
    }
  }
  return joined;
}

// Connects again with new credentials. Call it again if it fails, or leave the call.
Future<void> reconnectCall(JoinedCall joined) async {
  final connection = joined.connection;
  if (connection == null) return;
  try {
    final next = joined.connection = await connection.reconnect();
    if (!joined.muted) await next.microphone(true); // A new connection starts with the microphone off.
  } on Object catch (error) {
    debugPrint("Couldn't reconnect the call: $error");
  }
}

// From the call screen, or the system call UI's mute button.
Future<void> setMuted(JoinedCall joined, bool muted) async {
  joined.muted = muted;
  final connection = joined.connection;
  if (connection != null && connection.connected) await connection.microphone(!muted);
}
// #endregion join-call

// #region end-call
// Leaves the call and disconnects its media. The call goes on for the others. If it fails, call it again: it reuses
// the original request.
Future<void> leaveCall(JoinedCall joined) async {
  await joined.participation.leave();
}

// Ends the call for everyone: only the member who started it, or a moderator, can. Leaving first disconnects the
// media on purpose, so it doesn't reconnect.
Future<void> endCallForEveryone(JoinedCall joined) async {
  await leaveCall(joined);
  await (await joined.participation.live.end()).completed(); // Waits until ConvoHop has ended the call.
}
// #endregion end-call
