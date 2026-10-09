/// The only driver module that imports the SDK: retarget the driver here.
library;

import 'package:convohop/convohop.dart';

import 'params.dart';

typedef SdkClient = ConvoHopClient;
typedef RealtimeHandle = ConversationStream;

/// In-memory recovery storage; one named instance is shared by every client created with that name.
typedef MemoryStorage = MemoryRecoveryStorage;

/// Language-neutral projection of an SDK failure (spec/conformance/driver-protocol.md).
typedef DriverError = Map<String, Object?>;

/// The SDK's client surface has no webhook verification: that belongs to server SDKs.
const features = <String>[
  'realtime',
  'realtime.reconnectPolicy',
  'recovery.eviction',
  'recovery.spentBudget',
  'recovery.storage',
  'retryAfter',
];

const packages = <String, String>{'convohop': convoHopPackageVersion};

/// A failure description without the failing value, request or response data, any of which can carry credentials.
String describe(Object error) => switch (error) {
  ConvoHopProblem(:final message) => message,
  HistoryResyncRequired(:final message) => message,
  AggregateFailure(:final message) => message,
  StateError(:final message) => message,
  FormatException(:final message) => 'Invalid data: $message',
  ArgumentError(:final name, :final message) => 'Invalid argument${name == null ? '' : ' $name'}: $message',
  _ => error.runtimeType.toString(),
};

DriverError driverError(Object error) {
  if (error is ConvoHopProblem) {
    final retryAfter = error.retryAfter;
    return <String, Object?>{
      'code': error.code,
      // The SDK reports transport failures with status 0; the protocol uses null for "no authority HTTP status".
      'status': error.status == 0 ? null : error.status,
      'outcome': error.outcome,
      'requestId': error.requestId,
      'retryAfterMs': retryAfter == null ? null : retryAfter * 1000,
      'message': error.message,
    };
  }
  return <String, Object?>{
    'code': 'SDK_ERROR',
    'status': null,
    'outcome': null,
    'requestId': null,
    'retryAfterMs': null,
    'message': describe(error),
  };
}

String _required(String? value, String name) => value ?? (throw ParamsError('$name is required for this role'));

/// Constructs a user client without network I/O; constructor validation failures are `INVALID_PARAMS`.
SdkClient createClient({
  required String baseUrl,
  required String credential,
  required String? projectId,
  required String? incarnation,
  required String? principalId,
  required MemoryStorage? storage,
}) {
  final project = _required(projectId, 'projectId'),
      current = _required(incarnation, 'incarnation'),
      principal = _required(principalId, 'principalId');
  try {
    return ConvoHopClient(
      baseUrl: baseUrl,
      projectId: project,
      incarnation: current,
      principalId: principal,
      sessionToken: credential,
      recoveryStorage: storage,
    );
  } on Object catch (error) {
    throw ParamsError(describe(error));
  }
}

T _decode<T>(T Function(Object?) parse, Object? value, String name) {
  try {
    return parse(value);
  } on Object {
    throw ParamsError('$name is not a valid protocol value');
  }
}

Message _message(Args args) => _decode(Message.fromJson, args['message'], 'message');

Cursor? _after(Args args) => args.containsKey('after') ? _decode(Cursor.fromJson, args['after'], 'after') : null;

// A user session always acts as its own principal; silently ignoring actAs would hide a scenario error.
Args _own(Args args) {
  if (args.containsKey('actAs')) throw const ParamsError('actAs is only available to backend clients');
  return args;
}

typedef _Operation = Future<Object?> Function(SdkClient client, Args args);

// Projections are the SDK's GraphQL JSON forms, with every selected field and null where absent.
final _user = <String, _Operation>{
  'route.initialize': (client, args) async => (await client.initialize()).toJson(),
  'conversations.get': (client, args) async => (await client.getConversation(text(args, 'conversationId'))).toJson(),
  'messages.list': (client, args) async => (await client.messages(
    text(_own(args), 'conversationId'),
    beforeSequence: optionalText(args, 'beforeSequence'),
  )).toJson(),
  'messages.send': (client, args) async => (await client.send(
    text(_own(args), 'conversationId'),
    text(args, 'text'),
    requestId: optionalText(args, 'requestId'),
  )).toJson(),
  'messages.edit': (client, args) async =>
      (await client.edit(_message(args), text(args, 'text'), requestId: optionalText(args, 'requestId'))).toJson(),
  'messages.delete': (client, args) async =>
      (await client.delete(_message(args), requestId: optionalText(args, 'requestId'))).toJson(),
  'events.list': (client, args) async =>
      (await client.events(text(args, 'conversationId'), after: _after(args))).toJson(),
  'requests.resolve': (client, args) async => (await client.requests.resolve(text(args, 'requestId'))).toJson(),
  'requests.retry': (client, args) async => (await client.requests.retry(text(args, 'requestId'))).toJson(),
};

final userOperations = List<String>.unmodifiable(_user.keys);

/// Starts [name]; null means the user role doesn't implement it. Decoding failures complete with [ParamsError].
Future<Object?>? operation(SdkClient client, String name, Args args) => _user[name]?.call(client, args);

/// Opens the SDK's replay-then-subscribe watcher; completes once initial reconciliation has been applied.
Future<RealtimeHandle> watch(
  SdkClient client,
  String conversationId, {
  required void Function(List<Object?> events) onEvents,
  required void Function(DriverError error) onError,
}) => client.watch(
  conversationId,
  (events) async => onEvents(<Object?>[for (final event in events) event.toJson()]),
  (error) => onError(driverError(error)),
);
