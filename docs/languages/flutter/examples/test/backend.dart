// A test stand-in for your backend: it signs users in and creates conversations with the backend key, sending the
// server SDK's GraphQL operations from schema/ir.json. Your backend uses a server SDK instead.
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:http/http.dart' as http;

import 'mock.dart';

final Map<String, String> _documents = () {
  final ir = jsonDecode(File.fromUri(repositoryRoot.resolve('schema/ir.json')).readAsStringSync());
  return {
    for (final operation in ((ir as Map<String, Object?>)['operations']! as List<Object?>).cast<Map<String, Object?>>())
      if (operation['plane'] == 'communication')
        operation['field']! as String: (operation['document']! as Map<String, Object?>)['text']! as String,
  };
}();

final Random _random = Random.secure();

String uuid() {
  final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
      '${hex.substring(16, 20)}-${hex.substring(20)}';
}

final class Backend {
  Backend(this.target);

  final MockTarget target;

  Future<Map<String, Object?>> _call(String field, Map<String, Object?> input) async {
    final document = _documents[field] ?? (throw StateError('No server operation for $field'));
    final response = await http.post(
      Uri.parse('${target.communicationUrl}/graphql'),
      headers: {'content-type': 'application/json', 'authorization': 'Bearer ${target.backendKey}'},
      body: jsonEncode({
        'query': document,
        'variables': {
          'context': {'requestId': uuid(), 'projectId': target.projectId, 'incarnation': target.incarnation},
          'input': input,
        },
      }),
    );
    final body = jsonDecode(response.body) as Map<String, Object?>;
    if (response.statusCode != 200 || body['errors'] != null) {
      throw StateError('$field failed with HTTP ${response.statusCode}: ${response.body}');
    }
    return ((body['data']! as Map<String, Object?>)[field]! as Map<String, Object?>)['result']! as Map<String, Object?>;
  }

  // What the login endpoint returns to the signed-in user's app, as JSON.
  Future<Map<String, Object?>> signIn(String accountId, {String? deviceId}) async {
    final principal = await _call('createPrincipal', {'externalUserId': accountId});
    final bootstrap = await _call('issueSession', {
      'principalId': principal['principalId'],
      'deviceId': deviceId ?? uuid(),
      'requestedTtlMs': '900000',
    });
    return jsonDecode(jsonEncode({...bootstrap, 'baseUrl': target.communicationUrl, 'projectId': target.projectId}))
        as Map<String, Object?>;
  }

  Future<String> createConversation(String title, List<String> principalIds) async {
    final conversation = await _call('createConversation', {
      'title': title,
      'props': <String, Object?>{},
      'members': [
        for (final principalId in principalIds) {'principalId': principalId, 'role': 'member'},
      ],
    });
    return conversation['conversationId']! as String;
  }
}

String principalOf(Map<String, Object?> login) => (login['session']! as Map<String, Object?>)['principalId']! as String;
