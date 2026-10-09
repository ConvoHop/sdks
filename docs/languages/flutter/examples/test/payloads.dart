import 'dart:convert';
import 'dart:io';

import 'mock.dart' show repositoryRoot;

final List<Object?> _vectors = switch (jsonDecode(
  File.fromUri(repositoryRoot.resolve('spec/push-payload/vectors.json')).readAsStringSync(),
)) {
  {'vectors': final List<Object?> vectors} => vectors,
  _ => throw const FormatException('Invalid push payload vectors'),
};

// The FCM data that the push payload contract's vector [id] expects, with [changes], for example to address it to a
// test user.
Map<String, Object?> fcmData(String id, [Map<String, Object?> changes = const {}]) {
  for (final vector in _vectors) {
    if (vector case {
      'id': final String vectorId,
      'expected': {'fcm': {'request': {'message': {'data': {'convohop': final String data}}}}},
    } when vectorId == id) {
      return {
        'convohop': jsonEncode({...jsonDecode(data) as Map<String, Object?>, ...changes}),
      };
    }
  }
  throw ArgumentError.value(id, 'id', 'No push payload vector with FCM data');
}
