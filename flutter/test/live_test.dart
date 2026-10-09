import 'dart:convert';

import 'package:convohop/convohop.dart';
import 'package:convohop/src/protocol.dart' show fingerprint;
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/live_fakes.dart';
import 'support/test_data.dart';

const _journalKey = 'convohop.requests:$projectId:$principalId';
const _grantRequest = '44444444-4444-4444-8444-444444444444';
const _leaveRequest = '55555555-5555-4555-8555-555555555555';
const _endRequest = '66666666-6666-4666-8666-666666666666';
const _laterRequest = '88888888-8888-4888-8888-888888888888';

String _fillerId(int index) => '00000000-0000-4000-8000-${index.toRadixString(16).padLeft(12, '0')}';

/// A send attempted once at [at] whose outcome is in doubt, within its
/// retry budget: a record the journal can't evict.
Map<String, Object?> _inDoubt(String id, int at) {
  final input = <String, Object?>{'conversationId': conversationId, 'text': id, 'props': <String, Object?>{}};
  return <String, Object?>{
    'requestId': id,
    'incarnation': incarnation,
    'payloadFingerprint': fingerprint(<String, Object?>{
      'operation': 'communication.sendMessage',
      'projectId': projectId,
      'input': input,
    }),
    'operation': 'communication.sendMessage',
    'projectId': projectId,
    'input': input,
    'firstSubmittedAt': at,
    'retryDeadline': at + 60000,
    'attemptCount': 1,
    'lastAttemptAt': at,
    'lastAttemptClassification': 'TRANSPORT_UNKNOWN',
    'resolutionState': 'unknown',
  };
}

Map<String, Object?> _cutoff({String? participation}) => <String, Object?>{
  'state': 'PENDING',
  'scope': <String, Object?>{
    'kind': participation == null ? 'GENERATION' : 'PARTICIPATION',
    'liveSessionId': liveSessionId,
    'generation': '1',
    'participationId': participation,
  },
  'evidence': null,
  'enforcedAt': null,
  'operationId': null,
};

Map<String, Object?> _left(String id) => gqlEnvelope('leaveLiveSession', id, <String, Object?>{
  'liveSessionId': liveSessionId,
  'participationId': participationId,
  'mediaCutoff': _cutoff(participation: participationId),
}, status: 'committed');

Map<String, Object?> _ended(String id) {
  final response = gqlEnvelope('endLiveSession', id, <String, Object?>{
    'liveSessionId': liveSessionId,
    'operationId': operationId,
    'mediaCutoff': _cutoff(),
  }, status: 'committed');
  ((response['data']! as Map<String, Object?>)['endLiveSession']!
      as Map<String, Object?>)['operation'] = <String, Object?>{
    'operationId': operationId,
    'owner': 'communication',
    'href': '/operations/$operationId',
    'state': 'pending',
  };
  return response;
}

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

    test("keeps the records of a call's grant, leave and end while the app holds their handles", () async {
      var now = fixedClock();
      final requests = <String>[];
      final storage = MemoryRecoveryStorage()
        ..setItem(
          _journalKey,
          jsonEncode(<Object?>[for (var index = 1; index <= 124; index += 1) _inDoubt(_fillerId(index), now - 1000)]),
        );
      final client = clientWith(
        mockGraphQL((request, body) {
          final name = body['operationName'] as String;
          final variables = body['variables'] as Map<String, Object?>;
          final id = (variables['context'] as Map<String, Object?>)['requestId'] as String;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          requests.add(id);
          if (id == requestIdTwo) throw http.ClientException('response lost');
          return jsonResponse(switch (name) {
            'CommunicationLeaveLiveSession' => _left(id),
            'CommunicationEndLiveSession' => _ended(id),
            _ => okFor(name, id, input),
          });
        }),
        storage: storage,
        clock: () => now,
      );
      List<String> journal() => <String>[for (final state in client.transport.recoveryStates) state.requestId];
      final fillers = <String>[for (var index = 1; index <= 124; index += 1) _fillerId(index)];

      final handle = await client.liveSession(liveSessionId);
      final participation = (await handle.participation())!;
      await participation.connect<FakeMediaRoom>((_) => FakeMediaRoom(), requestId: _grantRequest);
      await participation.leave(requestId: _leaveRequest);
      await handle.end(requestId: _endRequest);
      now += 1000;
      await client.send(conversationId, 'newer', requestId: requestId);
      expect(journal(), <String>[...fillers, _grantRequest, _leaveRequest, _endRequest, requestId]);
      expect(
        client.transport.recoveryStates.skip(124).map((state) => state.resolutionState),
        everyElement('committed'),
      );

      // The call's committed records are the oldest final ones, but its
      // handles still hold them, so the newer message's record makes room.
      await expectLater(
        client.send(conversationId, 'lost', requestId: requestIdTwo),
        throwsA(isA<ConvoHopProblem>().having((problem) => problem.code, 'code', 'TRANSPORT_UNKNOWN')),
      );
      expect(journal(), <String>[...fillers, _grantRequest, _leaveRequest, _endRequest, requestIdTwo]);

      // Only held and in-doubt records remain, so the next request fails
      // before it is sent.
      await expectLater(
        client.send(conversationId, 'later', requestId: _laterRequest),
        throwsA(
          isA<ConvoHopProblem>()
              .having((problem) => problem.code, 'code', 'RECOVERY_LIMIT')
              .having((problem) => problem.requestId, 'requestId', _laterRequest)
              .having((problem) => problem.outcome, 'outcome', 'rejected')
              .having((problem) => problem.status, 'status', 409),
        ),
      );
      expect(requests, isNot(contains(_laterRequest)));
      expect(journal(), <String>[...fillers, _grantRequest, _leaveRequest, _endRequest, requestIdTwo]);
      // Holding both handles to here keeps them from being collected.
      expect((handle.liveSessionId, participation.participationId), (liveSessionId, participationId));
      client.close();
    });
  });
}
