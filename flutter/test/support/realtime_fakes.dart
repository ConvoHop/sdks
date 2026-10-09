import 'dart:async';
import 'dart:convert';

import 'package:convohop/convohop.dart';

final class FakeRealtimeSocket implements RealtimeSocket {
  FakeRealtimeSocket({this.protocol = 'graphql-transport-ws'});

  final StreamController<Object?> _incoming = StreamController<Object?>();
  final List<Map<String, Object?>> sent = <Map<String, Object?>>[];
  final Completer<void> _ready = Completer<void>()..complete();
  bool closedByClient = false;

  @override
  final String? protocol;

  @override
  int? closeCode;

  @override
  Future<void> get ready => _ready.future;

  @override
  Stream<Object?> get stream => _incoming.stream;

  @override
  void send(String text) {
    sent.add(jsonDecode(text) as Map<String, Object?>);
  }

  void server(Map<String, Object?> frame) => _incoming.add(jsonEncode(frame));

  void fail(Object error) => _incoming.addError(error);

  Future<void> serverClose([int? code]) async {
    closeCode = code;
    await _incoming.close();
  }

  @override
  void close([int? code, String? reason]) {
    closedByClient = true;
    closeCode = code;
    unawaited(_incoming.close());
  }
}

final class FakeRealtimeConnector {
  final List<FakeRealtimeSocket> sockets = <FakeRealtimeSocket>[];
  final List<Uri> urls = <Uri>[];

  RealtimeSocket call(Uri url, String protocol) {
    urls.add(url);
    final socket = FakeRealtimeSocket(protocol: protocol);
    sockets.add(socket);
    return socket;
  }
}
