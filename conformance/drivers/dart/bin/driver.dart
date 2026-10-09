// ConvoHop conformance driver for the Dart SDK: NDJSON over stdio (spec/conformance/driver-protocol.md).
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:convohop_conformance_driver/params.dart';
import 'package:convohop_conformance_driver/sdk.dart';

const _driver = <String, Object?>{'name': 'convohop-dart', 'version': '0.1.0', 'language': 'dart'};
const _roles = <String>['user', 'backend', 'management'];
const _empty = <String, Object?>{};

final class ProtocolError implements Exception {
  const ProtocolError(this.code, this.message);

  final String code;
  final String message;
}

final class Subscription {
  Subscription(this.client);

  final String client;
  final List<Object?> events = <Object?>[];
  final List<DriverError> errors = <DriverError>[];
  final Set<void Function()> waiters = <void Function()>{};
  RealtimeHandle? stream;
  bool stopped = false;

  bool get closed => stream?.closed ?? false;

  void wake() {
    for (final waiter in waiters.toList()) {
      waiter();
    }
  }

  void stop() {
    stopped = true;
    stream?.close();
    wake();
  }
}

final class Driver {
  final Map<String, SdkClient> _clients = <String, SdkClient>{};
  final Map<String, Subscription> _subscriptions = <String, Subscription>{};
  final Map<String, MemoryStorage> _storages = <String, MemoryStorage>{};
  bool _negotiated = false;

  (String, SdkClient) _client(Args args) {
    final name = text(args, 'client');
    final found = _clients[name] ?? (throw ProtocolError('UNKNOWN_HANDLE', 'Unknown client handle $name'));
    return (name, found);
  }

  (String, Subscription) _subscription(Args args) {
    final name = text(args, 'subscription');
    final found = _subscriptions[name] ?? (throw ProtocolError('UNKNOWN_HANDLE', 'Unknown subscription handle $name'));
    return (name, found);
  }

  Object? _hello() {
    if (_negotiated) throw const ProtocolError('INVALID_REQUEST', 'hello was already negotiated');
    _negotiated = true;
    return <String, Object?>{
      'driver': <String, Object?>{..._driver, 'packages': packages},
      'roles': <String, Object?>{
        'user': <String, Object?>{'operations': userOperations},
      },
      'features': features,
    };
  }

  Object? _create(Args args) {
    final name = handle(args, 'client');
    if (_clients.containsKey(name)) throw ParamsError('Client handle $name already exists');
    final role = text(args, 'role');
    if (!_roles.contains(role)) throw ParamsError('role must be one of ${_roles.join(', ')}');
    if (role != 'user') throw ProtocolError('UNSUPPORTED', 'This driver does not declare the $role role');
    final storageName = args.containsKey('storage') ? handle(args, 'storage') : null;
    final storage = storageName == null ? null : _storages[storageName] ?? MemoryStorage();
    final baseUrl = text(args, 'baseUrl'), credential = text(args, 'credential');
    final projectId = optionalText(args, 'projectId'), incarnation = optionalText(args, 'incarnation');
    final principalId = optionalText(args, 'principalId');
    // Only management clients act for an actor, but a malformed one is still a malformed request.
    optionalText(args, 'actorId');
    _clients[name] = createClient(
      baseUrl: baseUrl,
      credential: credential,
      projectId: projectId,
      incarnation: incarnation,
      principalId: principalId,
      storage: storage,
    );
    if (storageName != null && storage != null) _storages[storageName] = storage;
    return _empty;
  }

  Object? _close(Args args) {
    final (name, target) = _client(args);
    _clients.remove(name);
    for (final MapEntry(key: id, value: entry) in _subscriptions.entries.toList()) {
      if (entry.client != name) continue;
      entry.stop();
      _subscriptions.remove(id);
    }
    // Named storages outlive the client, so a scenario can restart on the same recovery state.
    target.close();
    return _empty;
  }

  Future<Object?> _invoke(Args args) async {
    final (_, target) = _client(args);
    final name = text(args, 'operation');
    final input = args.containsKey('args') ? record(args['args'], 'args') : _empty;
    final pending =
        operation(target, name, input) ??
        (throw ProtocolError('UNSUPPORTED', 'The user role does not implement $name'));
    try {
      return <String, Object?>{'ok': true, 'value': await pending};
    } on ParamsError {
      rethrow;
    } on Object catch (error) {
      return <String, Object?>{'ok': false, 'error': driverError(error)};
    }
  }

  Future<Object?> _subscribe(Args args) async {
    final (owner, target) = _client(args);
    final name = handle(args, 'subscription');
    if (_subscriptions.containsKey(name)) throw ParamsError('Subscription handle $name already exists');
    final conversationId = text(args, 'conversationId');
    final entry = Subscription(owner);
    try {
      entry.stream = await watch(
        target,
        conversationId,
        onEvents: (events) {
          if (entry.stopped) return;
          entry.events.addAll(events);
          entry.wake();
        },
        onError: (error) {
          if (entry.stopped) return;
          entry.errors.add(error);
          entry.wake();
        },
      );
    } on Object catch (error) {
      return <String, Object?>{'ok': false, 'error': driverError(error)};
    }
    _subscriptions[name] = entry;
    return const <String, Object?>{'ok': true};
  }

  bool Function(Subscription) _condition(Args until) {
    final count = integer(until, 'count', 0, 100000), sequence = counter(until, 'sequence');
    if (until.containsKey('closed') && until['closed'] != true) {
      throw const ParamsError('until.closed must be true when present');
    }
    final closed = until['closed'] == true;
    return (entry) =>
        (count == null || entry.events.length >= count) &&
        (sequence == null ||
            entry.events.any((event) {
              final value = _sequence(event);
              return value != null && value >= sequence;
            })) &&
        (!closed || entry.closed);
  }

  static BigInt? _sequence(Object? event) => switch (event) {
    {'sequence': final String sequence} => BigInt.tryParse(sequence),
    _ => null,
  };

  Future<Object?> _collect(Args args) async {
    final (_, entry) = _subscription(args);
    final reached = _condition(args.containsKey('until') ? record(args['until'], 'until') : _empty);
    final timeoutMs = integer(args, 'timeoutMs', 0, 60000), settleMs = integer(args, 'settleMs', 0, 10000) ?? 0;
    if (timeoutMs == null) throw const ParamsError('timeoutMs is required');
    bool finished() => reached(entry) || entry.stopped || entry.closed;
    if (!finished()) {
      final done = Completer<void>();
      void check() {
        if (!done.isCompleted && finished()) done.complete();
      }

      entry.waiters.add(check);
      final timer = Timer(Duration(milliseconds: timeoutMs), () {
        if (!done.isCompleted) done.complete();
      });
      // The SDK reports a terminal failure after closing the stream; polling also observes a close without one.
      final poll = Timer.periodic(const Duration(milliseconds: 20), (_) => check());
      try {
        await done.future;
      } finally {
        timer.cancel();
        poll.cancel();
        entry.waiters.remove(check);
      }
    }
    if (settleMs > 0) await Future<void>.delayed(Duration(milliseconds: settleMs));
    final satisfied = reached(entry), closed = entry.closed;
    return <String, Object?>{
      'events': List<Object?>.of(entry.events),
      'errors': List<Object?>.of(entry.errors),
      'closed': closed,
      'timedOut': !satisfied && !closed,
    };
  }

  Object? _closeSubscription(Args args) {
    final (name, entry) = _subscription(args);
    entry.stop();
    _subscriptions.remove(name);
    return _empty;
  }

  Object? reset() {
    for (final entry in _subscriptions.values) {
      entry.stop();
    }
    for (final client in _clients.values) {
      client.close();
    }
    _subscriptions.clear();
    _clients.clear();
    _storages.clear();
    return _empty;
  }

  Future<Object?> _dispatch(String method, Args args) async {
    if (!_negotiated && method != 'hello') {
      throw const ProtocolError('INVALID_REQUEST', 'hello must be the first request');
    }
    return switch (method) {
      'hello' => _hello(),
      'client.create' => _create(args),
      'client.close' => _close(args),
      'invoke' => await _invoke(args),
      'realtime.subscribe' => await _subscribe(args),
      'realtime.collect' => await _collect(args),
      'realtime.close' => _closeSubscription(args),
      'webhooks.verify' => throw const ProtocolError(
        'UNSUPPORTED',
        'This driver does not declare the webhooks.verify feature',
      ),
      'reset' => reset(),
      'shutdown' => _empty,
      _ => throw ProtocolError('UNKNOWN_METHOD', 'Unknown method $method'),
    };
  }

  static Map<String, Object?> _failure(Object error) => switch (error) {
    ProtocolError(:final code, :final message) => <String, Object?>{'code': code, 'message': message},
    ParamsError(:final message) => <String, Object?>{'code': 'INVALID_PARAMS', 'message': message},
    _ => <String, Object?>{'code': 'DRIVER_FAILURE', 'message': describe(error)},
  };

  /// Answers one request line; true after `shutdown` was answered.
  Future<bool> handleLine(String line) async {
    if (line.trim().isEmpty) return false;
    final Object? request;
    try {
      request = jsonDecode(line);
    } on FormatException {
      _write(const <String, Object?>{
        'id': null,
        'error': <String, Object?>{'code': 'INVALID_REQUEST', 'message': 'Request is not valid JSON'},
      });
      return false;
    }
    final id = request is Map<String, Object?> ? requestId(request['id']) : null;
    try {
      if (request is! Map<String, Object?> || id == null) {
        throw const ProtocolError('INVALID_REQUEST', 'id must be a positive integer');
      }
      final method = request['method'], params = request['params'] ?? _empty;
      if (method is! String) throw const ProtocolError('INVALID_REQUEST', 'method must be a string');
      if (params is! Map<String, Object?>) throw const ProtocolError('INVALID_REQUEST', 'params must be an object');
      final result = await _dispatch(method, params);
      if (method == 'shutdown') {
        reset();
        _write(<String, Object?>{'id': id, 'result': result});
        return true;
      }
      _write(<String, Object?>{'id': id, 'result': result});
    } on Object catch (error) {
      _write(<String, Object?>{'id': id, 'error': _failure(error)});
    }
    return false;
  }
}

void _write(Map<String, Object?> message) {
  String line;
  try {
    line = jsonEncode(message);
  } on JsonUnsupportedObjectError {
    line = jsonEncode(<String, Object?>{
      'id': message['id'],
      'error': const <String, Object?>{'code': 'DRIVER_FAILURE', 'message': 'The result is not JSON'},
    });
  }
  try {
    stdout.writeln(line);
  } on Object {
    exit(0);
  }
}

Future<Never> _exit(Driver driver) async {
  driver.reset();
  try {
    await stdout.flush();
  } on Object {
    // The runner already went away; there is nobody left to answer.
  }
  exit(0);
}

Future<void> main() async {
  // Like the reference driver, a closed or broken stdout ends the driver quietly.
  unawaited(stdout.done.then<void>((_) {}, onError: (Object _) => exit(0)));
  final driver = Driver();
  final lines = stdin.transform(const Utf8Decoder(allowMalformed: true)).transform(const LineSplitter());
  await for (final line in lines) {
    if (await driver.handleLine(line)) await _exit(driver);
  }
  await _exit(driver);
}
