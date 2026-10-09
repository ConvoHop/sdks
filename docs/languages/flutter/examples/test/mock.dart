// Starts the conformance mock that the SDK's conformance tests use: a real HTTP and WebSocket server, in a Node.js
// process.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

final Uri repositoryRoot = Directory.current.uri.resolve('../../../../');

final class MockTarget {
  MockTarget._(this._process, this._descriptor);

  final Process _process;
  final Map<String, Object?> _descriptor;

  String get communicationUrl => _descriptor['communicationUrl']! as String;
  String get projectId => _descriptor['projectId']! as String;
  String get incarnation => _descriptor['incarnation']! as String;
  String get backendKey => (_descriptor['credentials']! as Map<String, Object?>)['backend']! as String;
  Uri get _control => Uri.parse(_descriptor['control']! as String);

  // test.mjs passes the Node.js it runs on.
  static Future<MockTarget> start() async {
    final process = await Process.start(Platform.environment['CONVOHOP_NODE'] ?? 'node', [
      repositoryRoot.resolve('conformance/mock/cli.mjs').toFilePath(),
    ]);
    final errors = StringBuffer();
    process.stderr.transform(utf8.decoder).listen(errors.write);
    final first = Completer<String>();
    process.stdout.transform(utf8.decoder).transform(const LineSplitter()).listen((line) {
      if (!first.isCompleted) first.complete(line);
    });
    unawaited(
      process.exitCode.then((code) {
        if (!first.isCompleted) first.completeError(StateError('The mock exited with $code: $errors'));
      }),
    );
    try {
      final descriptor = jsonDecode(await first.future.timeout(const Duration(seconds: 30)));
      return MockTarget._(process, descriptor as Map<String, Object?>);
    } on Object {
      process.kill();
      rethrow;
    }
  }

  Future<void> close() async {
    _process.kill();
    await _process.exitCode;
  }

  // Makes the mock fail the next request to a GraphQL field: it closes the socket before or after committing.
  Future<void> injectFault(String field, String action) async {
    final response = await http.post(
      _control.replace(path: '${_control.path}/fault'),
      headers: {'content-type': 'application/json'},
      body: jsonEncode({'field': field, 'action': action}),
    );
    if (response.statusCode != 200) throw StateError('The mock rejected the fault: ${response.statusCode}');
  }

  // The fields the mock received requests for, oldest first.
  Future<List<Map<String, Object?>>> requests() async {
    final response = await http.get(_control.replace(path: '${_control.path}/log'));
    final entries = (jsonDecode(response.body) as Map<String, Object?>)['entries']! as List<Object?>;
    return [
      for (final entry in entries.cast<Map<String, Object?>>())
        if (entry['kind'] == 'request') entry,
    ];
  }

  // Whether each request the mock received for a field and request ID was dropped, oldest first.
  Future<List<bool>> attempts(String field, String requestId) async => [
    for (final entry in await requests())
      if (entry['field'] == field && entry['requestId'] == requestId) entry['dropped']! as bool,
  ];
}
