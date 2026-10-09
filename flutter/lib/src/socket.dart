import 'dart:async';

import 'package:web_socket_channel/web_socket_channel.dart';

/// One realtime WebSocket connection, as the SDK uses it.
///
/// Implement it to carry realtime traffic over your own networking stack, or
/// to test without a server. The SDK closes only with code 1000 or 4000.
abstract interface class RealtimeSocket {
  /// Completes when the connection is open; fails when it can't open.
  Future<void> get ready;

  /// Incoming frames: text as [String], binary as `List<int>`. Connection
  /// failures arrive as errors, and the stream is done once the connection
  /// closes.
  Stream<Object?> get stream;

  /// The subprotocol the server selected, once [ready] completes.
  String? get protocol;

  /// The close code the server sent, once [stream] is done.
  int? get closeCode;

  void send(String text);

  /// Closes the connection. Calling it again does nothing.
  void close([int? code, String? reason]);
}

/// Opens a realtime connection to [url] that offers [protocol].
typedef RealtimeConnector = RealtimeSocket Function(Uri url, String protocol);

/// The default connector, built on `package:web_socket_channel`.
RealtimeSocket connectRealtime(Uri url, String protocol) =>
    _ChannelSocket(WebSocketChannel.connect(url, protocols: <String>[protocol]));

final class _ChannelSocket implements RealtimeSocket {
  _ChannelSocket(this._channel);

  final WebSocketChannel _channel;
  bool _closing = false;

  @override
  Future<void> get ready => _channel.ready;

  @override
  Stream<Object?> get stream => _channel.stream;

  @override
  String? get protocol => _channel.protocol;

  @override
  int? get closeCode => _channel.closeCode;

  @override
  void send(String text) {
    if (!_closing) _channel.sink.add(text);
  }

  @override
  void close([int? code, String? reason]) {
    if (_closing) return;
    _closing = true;
    unawaited(_channel.sink.close(code, reason).then<void>((_) {}, onError: (Object _) {}));
  }
}
