# Flutter calling quickstart

Add voice and video calls to a conversation with `package:convohop`: start a call and ring other members, join the current call, and leave or end it.

## Before you start

Calls need a client connected with the user's session, as the [client quickstart](client.md) shows. They also need `livekit_client` set up for each platform, as its [installation guide](https://pub.dev/packages/livekit_client#installation) describes: the microphone and camera usage descriptions and the `audio` background mode on iOS, and the permissions on Android. CI analyzes these samples but doesn't run them, because they need a ConvoHop project with calls and a LiveKit media server. The samples use these libraries:

```dart include=examples/lib/calling.dart#imports
```

## Start a call

```dart include=examples/lib/calling.dart#start-call
```

Starting, joining, connecting and capturing are separate steps. `ready()` waits until the call has started. `join` reserves this device's place in the call, `connect` starts receiving media, and nothing is captured until you turn on the microphone or camera.

Ringing gives each principal you ring a `notification.call` webhook event, which your backend turns into a push notification, as the [push notifications quickstart](push.md) shows. A ring isn't an invitation: any member of the conversation can join the call.

## Join a call

```dart include=examples/lib/calling.dart#join-call
```

- Each `connect` and `reconnect` admits one new connection with fresh single-use credentials.
- A failed `connect` keeps this device's place in the call. Retry it, or leave as the sample does.
- `snapshot.permissions` says what this participant may publish. A voice call, started with `startVoice()`, never allows the camera. A video call, started with `startVideo()`, allows `connection.camera(true)`.
- `microphone(true)` and `camera(true)` start capturing, which asks the user for access the first time. If capturing fails, for example because the user denied access, the call goes on, receiving only.
- LiveKit resumes a dropped connection by itself. When it would have to join again from scratch, the room disconnects instead and `onDisconnected` runs. `reconnect()` then connects with new credentials, and the new connection starts with the microphone off.
- `connection.room.room` is the `livekit_client` `Room`, for rendering participants and tracks. Pass `relayOnly: true` to `liveKitRooms()` to send media only through TURN relays.

## Leave or end a call

```dart include=examples/lib/calling.dart#end-call
```

Leaving ends this device's participation and disconnects its media, and the call goes on for everyone else. Ending stops the call for everyone, and only the member who started it, or a moderator of the conversation, can end it. `completed()` waits until ConvoHop has ended the call. It throws a `ConvoHopProblem` with the reason when ending failed, or with `RESOLUTION_REQUIRED` when the call is still ending after 45 seconds.

## Next steps

- [Push notifications quickstart](push.md): ring members whose app isn't open, and show the system call UI.
- [`LiveParticipationHandle` reference](../reference/convohop.md#liveparticipationhandle-class): join, connect, leave and end.
- [`liveKitRooms` reference](../reference/calls.md#livekitrooms-function): the LiveKit rooms that calls connect.
