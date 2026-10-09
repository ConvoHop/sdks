import 'package:convohop/convohop.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/live_fakes.dart';
import 'support/test_data.dart';

void main() {
  group('live media', () {
    test('uses one admission attempt, single connect token and cleans up rooms', () async {
      final room = FakeMediaRoom();
      final operations = <String>[];
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          operations.add(body['operationName'] as String);
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }, bodies: <Map<String, Object?>>[]),
      );

      final handle = await client.liveSession(liveSessionId);
      final participation = await handle.participation();
      final connection = await participation!.connect<FakeMediaRoom>((_) => room, requestId: requestId);
      expect(room.tokens, <String>['fake-connect-token']);
      expect(connection.nativeConnectionId, nativeConnectionId);
      expect(await participation.connect<FakeMediaRoom>((_) => FakeMediaRoom()), same(connection));
      await connection.microphone(false);
      await connection.camera(false);
      expect(room.microphone, isFalse);
      expect(room.camera, isFalse);
      await connection.disconnect();
      expect(room.disconnects, 1);
      expect(
        client.transport.recoveryStates.singleWhere((state) => state.requestId == requestId).mediaAdmissionAttempted,
        isTrue,
      );
      expect(operations.where((name) => name == 'CommunicationLiveSessionCredentials'), hasLength(1));
      expect(
        client.transport.recoveryStates.map((state) => state.toJson().toString()).join('\n'),
        isNot(contains('fake-connect-token')),
      );
      client.close();
    });

    test('wraps media connection failure without leaking connect token', () async {
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
      );
      final handle = await client.liveSession(liveSessionId);
      final participation = await handle.participation();
      await expectLater(
        participation!.connect<FakeMediaRoom>((_) => FakeMediaRoom(sid: null), requestId: requestId),
        throwsA(
          isA<ConvoHopProblem>()
              .having((problem) => problem.code, 'code', 'MEDIA_CONNECT_FAILED')
              .having((problem) => problem.toString(), 'string', isNot(contains('fake-connect-token'))),
        ),
      );
      client.close();
    });
  });
}
