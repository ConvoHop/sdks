import 'dart:async';

import 'package:livekit_client/livekit_client.dart' as livekit;

import 'client.dart';

/// A [LiveMediaRoom] built on the official `livekit_client` [livekit.Room].
///
/// LiveKit resumes the connection itself, with SFU-pushed refresh tokens. A
/// full reconnect would reuse the single-use connect token, which the media
/// server refuses, so the room disconnects instead and
/// [LiveMediaConnection.reconnect] continues with new credentials.
final class LiveKitMediaRoom implements LiveMediaRoom {
  LiveKitMediaRoom._(this.room, this._connectOptions, this._onDisconnected) {
    _listener = room.createListener()
      ..on<livekit.RoomReconnectingEvent>((_) async {
        _disconnected();
        await disconnect();
      })
      ..on<livekit.RoomDisconnectedEvent>((_) => _disconnected());
  }

  /// The LiveKit room, for rendering participants and tracks.
  final livekit.Room room;
  final livekit.ConnectOptions _connectOptions;
  final void Function() _onDisconnected;
  late final livekit.EventsListener<livekit.RoomEvent> _listener;
  bool _ended = false;
  Future<void>? _disconnecting;

  void _disconnected() {
    if (_ended) return;
    _ended = true;
    _onDisconnected();
  }

  @override
  Future<void> connect(String url, String token) => room.connect(url, token, connectOptions: _connectOptions);

  @override
  String? get localParticipantSid => room.localParticipant?.sid;

  livekit.LocalParticipant get _local => room.localParticipant ?? (throw StateError('Media room is not connected'));

  @override
  Future<void> setMicrophoneEnabled(bool enabled) => _local.setMicrophoneEnabled(enabled);

  @override
  Future<void> setCameraEnabled(bool enabled) => _local.setCameraEnabled(enabled);

  @override
  Future<void> disconnect() => _disconnecting ??= () async {
    _ended = true;
    try {
      await room.disconnect();
    } finally {
      await _listener.dispose();
      await room.dispose();
    }
  }();
}

/// Creates LiveKit rooms for [LiveParticipationHandle.connect].
///
/// Set [relayOnly] to send media only through TURN relays.
LiveMediaRoomFactory<LiveKitMediaRoom> liveKitRooms({
  livekit.RoomOptions roomOptions = const livekit.RoomOptions(),
  bool relayOnly = false,
}) =>
    (onDisconnected) => LiveKitMediaRoom._(
      livekit.Room(roomOptions: roomOptions),
      livekit.ConnectOptions(
        rtcConfiguration: livekit.RTCConfiguration(
          iceTransportPolicy: relayOnly ? livekit.RTCIceTransportPolicy.relay : livekit.RTCIceTransportPolicy.all,
        ),
      ),
      onDisconnected,
    );
