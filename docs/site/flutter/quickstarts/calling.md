# Flutter calling quickstart

Add voice and video calls to a conversation with `package:convohop`: start a call and ring other members, join the current call, and leave or end it.

## Before you start

Calls need a client connected with the user's session, as the [client quickstart](client.md) shows. They also need `livekit_client` set up for each platform, as its [installation guide](https://pub.dev/packages/livekit_client#installation) describes: the microphone and camera usage descriptions and the `audio` background mode on iOS, and the permissions on Android. CI analyzes these samples but doesn't run them, because they need a ConvoHop project with calls and a LiveKit media server. The samples use these libraries:

```dart snippet=docs/languages/flutter/examples/lib/calling.dart#imports
import 'dart:async';

import 'package:convohop/calls.dart';
import 'package:convohop/convohop.dart';
import 'package:flutter/foundation.dart';
```

## Start a call

```dart snippet=docs/languages/flutter/examples/lib/calling.dart#start-call
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
```

Starting, joining, connecting and capturing are separate steps. `ready()` waits until the call has started. `join` reserves this device's place in the call, `connect` starts receiving media, and nothing is captured until you turn on the microphone or camera.

Ringing gives each principal you ring a `notification.call` webhook event, which your backend turns into a push notification, as the [push notifications quickstart](push.md) shows. A ring isn't an invitation: any member of the conversation can join the call.

## Join a call

```dart snippet=docs/languages/flutter/examples/lib/calling.dart#join-call
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
```

- Each `connect` and `reconnect` admits one new connection with fresh single-use credentials.
- A failed `connect` keeps this device's place in the call. Retry it, or leave as the sample does.
- `snapshot.permissions` says what this participant may publish. A voice call, started with `startVoice()`, never allows the camera. A video call, started with `startVideo()`, allows `connection.camera(true)`.
- `microphone(true)` and `camera(true)` start capturing, which asks the user for access the first time. If capturing fails, for example because the user denied access, the call goes on, receiving only.
- LiveKit resumes a dropped connection by itself. When it would have to join again from scratch, the room disconnects instead and `onDisconnected` runs. `reconnect()` then connects with new credentials, and the new connection starts with the microphone off.
- `connection.room.room` is the `livekit_client` `Room`, for rendering participants and tracks. Pass `relayOnly: true` to `liveKitRooms()` to send media only through TURN relays.

## Leave or end a call

```dart snippet=docs/languages/flutter/examples/lib/calling.dart#end-call
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
```

Leaving ends this device's participation and disconnects its media, and the call goes on for everyone else. Ending stops the call for everyone, and only the member who started it, or a moderator of the conversation, can end it. `completed()` waits until ConvoHop has ended the call. It throws a `ConvoHopProblem` with the reason when ending failed, or with `RESOLUTION_REQUIRED` when the call is still ending after 45 seconds.

## Next steps

- [Push notifications quickstart](push.md): ring members whose app isn't open, and show the system call UI.
- [`LiveParticipationHandle` reference](../reference/convohop.md#liveparticipationhandle-class): join, connect, leave and end.
- [`liveKitRooms` reference](../reference/calls.md#livekitrooms-function): the LiveKit rooms that calls connect.
