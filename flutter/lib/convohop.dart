/// The ConvoHop client SDK: one user's session, conversations, realtime
/// history, an offline outbox, a local conversation store, receipts, typing,
/// recent activity, calls and push payloads.
///
/// This library is pure Dart. Import `package:convohop/push.dart` for push
/// registration and the incoming-call UI, `package:convohop/calls.dart` for
/// LiveKit media and `package:convohop/io.dart` for file-backed storage.
library;

export 'src/client.dart';
export 'src/generated/generated.dart';
export 'src/notifications.dart';
export 'src/outbox.dart';
export 'src/presence.dart';
export 'src/problem.dart';
export 'src/protocol.dart' show Clock, newRequestId, systemClock;
export 'src/session_refresher.dart';
export 'src/socket.dart' show RealtimeConnector, RealtimeSocket, connectRealtime;
export 'src/storage.dart';
export 'src/store.dart';
export 'src/transport.dart' show ConvoHopTransport, RecoveryState;
export 'src/typing.dart';
export 'src/version.dart';
