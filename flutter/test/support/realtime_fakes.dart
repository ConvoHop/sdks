import 'dart:async';
import 'dart:convert';

import 'package:convohop/convohop.dart';

final class FakeRealtimeSocket implements RealtimeSocket {
  /// A socket whose upgrade fails with [refusal], when given. Like
  /// `web_socket_channel`, it then fails [ready], and its [stream] reports
  /// the error and ends without a close code.
  FakeRealtimeSocket({this.protocol = 'graphql-transport-ws', Object? refusal})
    : _ready = refusal == null ? Future<void>.value() : Future<void>.error(refusal) {
    _ready.ignore();
    if (refusal != null) {
      _incoming.addError(refusal);
      unawaited(_incoming.close());
    }
  }

  final StreamController<Object?> _incoming = StreamController<Object?>();
  final List<Map<String, Object?>> sent = <Map<String, Object?>>[];
  final Future<void> _ready;
  bool closedByClient = false;

  @override
  final String? protocol;

  @override
  int? closeCode;

  @override
  String? closeReason;

  @override
  Future<void> get ready => _ready;

  @override
  Stream<Object?> get stream => _incoming.stream;

  @override
  void send(String text) {
    sent.add(jsonDecode(text) as Map<String, Object?>);
  }

  void server(Map<String, Object?> frame) => _incoming.add(jsonEncode(frame));

  void fail(Object error) => _incoming.addError(error);

  Future<void> serverClose([int? code, String? reason]) async {
    closeCode = code;
    closeReason = reason;
    await _incoming.close();
  }

  @override
  void close([int? code, String? reason]) {
    closedByClient = true;
    closeCode = code;
    closeReason = reason;
    unawaited(_incoming.close());
  }
}

final class FakeRealtimeConnector {
  final List<FakeRealtimeSocket> sockets = <FakeRealtimeSocket>[];
  final List<Uri> urls = <Uri>[];

  /// Upgrade failures for the next connections, in order.
  final List<Object> refusals = <Object>[];

  RealtimeSocket call(Uri url, String protocol) {
    urls.add(url);
    final socket = FakeRealtimeSocket(protocol: protocol, refusal: refusals.isEmpty ? null : refusals.removeAt(0));
    sockets.add(socket);
    return socket;
  }
}
