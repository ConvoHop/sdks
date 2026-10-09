# `package:convohop/calls.dart`

Call media through the official `livekit_client` package.

**Layer:** Client. **Runtime:** Flutter 3.38 or later on Android 7.0 (API level 24) or later and iOS 13 or later, with `livekit_client` 2.13.1 or later. **Source:** `flutter`.

## Classes

### `LiveKitMediaRoom` class

```dart
final class LiveKitMediaRoom implements LiveMediaRoom
```

A `LiveMediaRoom` built on the official `livekit_client` `livekit.Room`.

LiveKit resumes the connection itself, with SFU-pushed refresh tokens. A
full reconnect would reuse the single-use connect token, which the media
server refuses, so the room disconnects instead and
`LiveMediaConnection.reconnect` continues with new credentials.

#### `LiveKitMediaRoom.room` property

```dart
final livekit.Room room
```

The LiveKit room, for rendering participants and tracks.

#### `LiveKitMediaRoom.connect` method

```dart
Future<void> connect(String url, String token)
```

Connects to `url` with the single-use `token`. Throws when the room
doesn't connect.

#### `LiveKitMediaRoom.localParticipantSid` property

```dart
String? get localParticipantSid
```

The connected local participant's SID. ConvoHop's media server makes it
the participation's `nativeConnectionId`.

#### `LiveKitMediaRoom.setMicrophoneEnabled` method

```dart
Future<void> setMicrophoneEnabled(bool enabled)
```

#### `LiveKitMediaRoom.setCameraEnabled` method

```dart
Future<void> setCameraEnabled(bool enabled)
```

#### `LiveKitMediaRoom.disconnect` method

```dart
Future<void> disconnect()
```

Leaves the room and releases its tracks. Calling it again does nothing.

## Functions

### `liveKitRooms` function

```dart
LiveMediaRoomFactory<LiveKitMediaRoom> liveKitRooms({
  livekit.RoomOptions roomOptions = const livekit.RoomOptions(),
  bool relayOnly = false,
})
```

Creates LiveKit rooms for `LiveParticipationHandle.connect`.

Set `relayOnly` to send media only through TURN relays.
