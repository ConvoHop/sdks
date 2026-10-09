import 'dart:async';
import 'dart:convert';

import 'package:convohop/convohop.dart';
import 'package:convohop/src/protocol.dart' show fingerprint;
import 'package:convohop/src/transport.dart' show beforeSubmitting, retainRecovery;
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/test_data.dart';

const _key = 'convohop.requests:test';

/// A distinct canonical request ID.
String _id(int index) => '00000000-0000-4000-8000-${index.toRadixString(16).padLeft(12, '0')}';

Map<String, Object?> _input(String id) => <String, Object?>{
  'conversationId': conversationId,
  'text': id,
  'props': <String, Object?>{},
};

/// A stored record of a message send, last attempted at [at].
Map<String, Object?> _stored(
  String id,
  int at,
  String resolutionState, {
  String classification = 'submitted',
  int attemptCount = 1,
  int? retryDeadline,
}) => <String, Object?>{
  'requestId': id,
  'incarnation': incarnation,
  'payloadFingerprint': fingerprint(<String, Object?>{
    'operation': 'communication.sendMessage',
    'projectId': projectId,
    'input': _input(id),
  }),
  'operation': 'communication.sendMessage',
  'projectId': projectId,
  'input': _input(id),
  'firstSubmittedAt': at,
  'retryDeadline': retryDeadline ?? at + 60000,
  'attemptCount': attemptCount,
  'lastAttemptAt': at,
  'lastAttemptClassification': classification,
  'resolutionState': resolutionState,
};

/// A fake authority. It commits each message send it receives, unless
/// [rejection] is set, which rejects it, or [lost] is, which loses the
/// response after the commit. A send whose ID [holds] lists waits for that
/// gate first.
final class _Authority {
  final List<String> sends = <String>[];
  final Map<String, Completer<void>> holds = <String, Completer<void>>{};
  ({String code, int status})? rejection;
  bool lost = false;

  late final http.Client client = mockGraphQL((request, body) async {
    final variables = body['variables'] as Map<String, Object?>;
    final id = (variables['context'] as Map<String, Object?>)['requestId'] as String;
    sends.add(id);
    await holds[id]?.future;
    final rejection = this.rejection;
    if (rejection != null) return jsonResponse(gqlError(rejection.code, status: rejection.status));
    if (lost) throw http.ClientException('response lost');
    return jsonResponse(gqlEnvelope('sendMessage', id, messageAck(), status: 'committed'));
  });

  ConvoHopTransport transport(MemoryRecoveryStorage storage, {int Function() clock = fixedClock}) => ConvoHopTransport(
    baseUrl: 'https://authority.example',
    namespace: 'test',
    incarnation: incarnation,
    credential: 'fake-token',
    recoveryStorage: storage,
    httpClient: client,
    clock: clock,
  );
}

Future<SendMessageReply> _send(ConvoHopTransport transport, String id) =>
    transport.execute(Operations.communicationSendMessage, projectId, _input(id), requestId: id);

List<String> _held(ConvoHopTransport transport) => [for (final state in transport.recoveryStates) state.requestId];

List<String> _saved(MemoryRecoveryStorage storage) => [
  for (final record in jsonDecode(storage.items[_key]!) as List<Object?>)
    (record! as Map<String, Object?>)['requestId']! as String,
];

TypeMatcher<ConvoHopProblem> _problem(String code, {String? outcome}) => isA<ConvoHopProblem>()
    .having((problem) => problem.code, 'code', code)
    .having((problem) => problem.outcome, 'outcome', outcome ?? anything);

/// The refusal of new request [id] while no record can make room.
Matcher _recoveryLimit(String id) => isA<ConvoHopProblem>()
    .having((problem) => problem.code, 'code', 'RECOVERY_LIMIT')
    .having((problem) => problem.requestId, 'requestId', id)
    .having((problem) => problem.outcome, 'outcome', 'rejected')
    .having((problem) => problem.status, 'status', 409);

void main() {
  group('recovery journal', () {
    test('a rejection is the outcome only when every attempt was rejected', () async {
      final authority = _Authority(), storage = MemoryRecoveryStorage();
      final transport = authority.transport(storage);
      final refused = _id(1), limited = _id(2), lost = _id(3);
      authority.rejection = (code: 'NOT_FOUND', status: 404);
      await expectLater(_send(transport, refused), throwsA(_problem('NOT_FOUND', outcome: 'rejected')));
      authority.rejection = (code: 'RATE_LIMITED', status: 429);
      await expectLater(_send(transport, limited), throwsA(_problem('RATE_LIMITED', outcome: 'rejected')));
      authority
        ..rejection = null
        ..lost = true;
      await expectLater(_send(transport, lost), throwsA(_problem('TRANSPORT_UNKNOWN', outcome: 'unknown')));
      authority
        ..lost = false
        ..rejection = (code: 'RATE_LIMITED', status: 429);
      await expectLater(_send(transport, lost), throwsA(_problem('RATE_LIMITED')));

      Map<String, List<Object>> summary(ConvoHopTransport transport) => {
        for (final state in transport.recoveryStates)
          state.requestId: [state.resolutionState, state.lastAttemptClassification, state.attemptCount],
      };
      // The lost attempt may have committed, so the next one's rejection
      // doesn't settle that request.
      final expected = {
        refused: ['rejected', 'NOT_FOUND', 1],
        limited: ['rejected', 'RATE_LIMITED', 1],
        lost: ['unknown', 'RATE_LIMITED', 2],
      };
      expect(summary(transport), expected);
      final restarted = authority.transport(storage);
      await restarted.initializeRecovery();
      expect(summary(restarted), expected, reason: 'a restarted client reads rejected records');
      restarted.close();

      // A rejected request may be sent again under its ID while its budget
      // lasts; the attempt is in doubt until it is answered.
      authority
        ..rejection = null
        ..holds[limited] = Completer<void>();
      final resent = _send(transport, limited);
      await pumpEventQueue();
      expect(summary(transport)[limited], ['unknown', 'submitted', 2]);
      authority.holds[limited]!.complete();
      await resent;
      expect(summary(transport)[limited], ['committed', 'authorityReceipt', 2]);
      transport.close();
    });

    test('a full journal evicts its oldest final record and keeps every record that may be resent', () async {
      final authority = _Authority(), storage = MemoryRecoveryStorage(), now = fixedClock();
      int at(int index) => now - 10000 + index;
      final records = <Map<String, Object?>>[
        // Oldest, and not final: each may still be sent again under its ID.
        // WRONG_REGION succeeds after routing again, and a code the IR
        // doesn't list is judged by its status, so it may be retried.
        _stored(_id(1), at(0), 'unknown'),
        _stored(_id(2), at(1), 'pending', attemptCount: 0),
        _stored(_id(3), at(2), 'rejected', classification: 'RATE_LIMITED'),
        _stored(_id(4), at(3), 'rejected', classification: 'WRONG_REGION'),
        _stored(_id(5), at(4), 'rejected', classification: 'NEWLY_INVENTED'),
        // Final: not retryable, out of attempts, past the retry deadline,
        // then the oldest settled.
        _stored(_id(6), at(5), 'rejected', classification: 'NOT_FOUND'),
        _stored(_id(7), at(6), 'rejected', classification: 'RATE_LIMITED', attemptCount: 3),
        _stored(_id(8), at(7), 'rejected', classification: 'AUTHORITY_UNAVAILABLE', retryDeadline: now - 1),
        for (var index = 8; index < 128; index++)
          _stored(_id(index + 1), at(index), index.isEven ? 'committed' : 'accepted'),
      ];
      storage.setItem(_key, jsonEncode(records));
      final transport = authority.transport(storage);
      final sent = [_id(201), _id(202), _id(203), _id(204)];
      for (final id in sent) {
        await _send(transport, id);
      }
      final kept = [
        for (final record in [...records.sublist(0, 5), ...records.sublist(9)]) record['requestId']! as String,
        ...sent,
      ];
      expect(_held(transport), kept);
      expect(_saved(storage), kept);
      expect(authority.sends, sent);
      transport.close();
    });

    test('a journal full of records that may be resent refuses a new request before sending it', () async {
      final authority = _Authority(), storage = MemoryRecoveryStorage();
      final transport = authority.transport(storage);
      // A rate-limited request may be sent again under its ID, so its record
      // stays.
      authority.rejection = (code: 'RATE_LIMITED', status: 429);
      final limited = [for (var index = 1; index <= 128; index++) _id(index)];
      for (final id in limited) {
        await expectLater(_send(transport, id), throwsA(_problem('RATE_LIMITED', outcome: 'rejected')));
      }
      authority.rejection = null;
      final saved = storage.items[_key], sends = authority.sends.length, refused = _id(500);
      await expectLater(_send(transport, refused), throwsA(_recoveryLimit(refused)));
      expect(storage.items[_key], saved, reason: 'nothing is written');
      expect(authority.sends, hasLength(sends), reason: 'nothing is sent');
      expect(_held(transport), limited);

      // Sent again under its ID, a request commits, so its record makes room
      // for the next new request.
      await _send(transport, limited[5]);
      final next = _id(501);
      await _send(transport, next);
      final held = [...limited.sublist(0, 5), ...limited.sublist(6), next];
      expect(_held(transport), held);
      expect(_saved(storage), held);
      transport.close();
    });

    test('rejected records become final once their retry deadline passes', () async {
      final authority = _Authority(), storage = MemoryRecoveryStorage();
      var now = fixedClock();
      final transport = authority.transport(storage, clock: () => now);
      authority.rejection = (code: 'RATE_LIMITED', status: 429);
      final limited = [for (var index = 1; index <= 128; index++) _id(index)];
      for (final id in limited) {
        now += 1;
        await expectLater(_send(transport, id), throwsA(_problem('RATE_LIMITED')));
      }
      authority.rejection = null;
      await expectLater(_send(transport, _id(500)), throwsA(_recoveryLimit(_id(500))));
      // Past the first records' deadlines, they can't be resent, so the oldest
      // of them makes room.
      now = fixedClock() + 60002;
      await _send(transport, _id(501));
      expect(_held(transport), [...limited.sublist(1), _id(501)]);
      expect(_saved(storage), _held(transport));
      transport.close();
    });

    test('a full journal keeps final records that a caller retains or a call is using', () async {
      final authority = _Authority(), storage = MemoryRecoveryStorage(), now = fixedClock();
      final records = <Map<String, Object?>>[
        _stored(_id(1), now - 3000, 'committed'),
        _stored(_id(2), now - 2000, 'committed'),
        for (var index = 3; index <= 128; index++) _stored(_id(index), now - 1000, 'unknown'),
      ];
      storage.setItem(_key, jsonEncode(records));
      final transport = authority.transport(storage);
      final release = retainRecovery(transport, () => [_id(1)]);
      // Sending a committed request again under its ID replays its receipt;
      // until the replay is answered, a call is using its record.
      authority.holds[_id(2)] = Completer<void>();
      final replay = _send(transport, _id(2));
      await pumpEventQueue();
      expect(authority.sends, [_id(2)]);
      await expectLater(_send(transport, _id(300)), throwsA(_recoveryLimit(_id(300))));
      authority.holds[_id(2)]!.complete();
      expect((await replay).status, 'committed');

      // Answered, the replayed record may go, though the retained one is older.
      await _send(transport, _id(301));
      expect(_held(transport), isNot(contains(_id(2))));
      expect(_held(transport), contains(_id(1)));
      release();
      await _send(transport, _id(302));
      expect(_held(transport), isNot(contains(_id(1))));
      expect(_held(transport), containsAll(<String>[_id(301), _id(302)]));
      expect(_saved(storage), _held(transport));
      transport.close();
    });

    test('a spent retry budget makes a record final, even while its outcome is in doubt', () async {
      final authority = _Authority(), storage = MemoryRecoveryStorage(), now = fixedClock();
      int at(int index) => now - 10000 + index;
      final records = <Map<String, Object?>>[
        // Oldest, but in doubt while its budget lasts.
        _stored(_id(1), at(0), 'unknown'),
        // Out of attempts, or past the retry deadline, whatever the outcome.
        _stored(_id(2), at(1), 'unknown', attemptCount: 3),
        _stored(_id(3), at(2), 'unknown', retryDeadline: now - 1),
        _stored(_id(4), at(3), 'pending', classification: 'notSubmitted', attemptCount: 0, retryDeadline: now - 1),
        // Final, but retained.
        _stored(_id(5), at(4), 'unknown', attemptCount: 3),
        for (var index = 6; index <= 128; index++) _stored(_id(index), at(index), 'unknown'),
      ];
      storage.setItem(_key, jsonEncode(records));
      final transport = authority.transport(storage);
      final release = retainRecovery(transport, () => [_id(5)]);
      // Each new request's response is lost, so it is in doubt too.
      authority.lost = true;
      final sent = [_id(201), _id(202), _id(203)];
      for (final id in sent) {
        await expectLater(_send(transport, id), throwsA(_problem('TRANSPORT_UNKNOWN', outcome: 'unknown')));
      }
      final within = [for (var index = 6; index <= 128; index++) _id(index)];
      expect(_held(transport), [_id(1), _id(5), ...within, ...sent]);
      expect(_saved(storage), _held(transport));
      await expectLater(_send(transport, _id(204)), throwsA(_recoveryLimit(_id(204))));
      expect(authority.sends, sent);

      release();
      await expectLater(_send(transport, _id(204)), throwsA(_problem('TRANSPORT_UNKNOWN')));
      expect(_held(transport), [_id(1), ...within, ...sent, _id(204)]);
      expect(_saved(storage), _held(transport));
      transport.close();
    });

    test('a submission hook runs once the record is stored, before the attempt is counted or sent', () async {
      final authority = _Authority(), storage = MemoryRecoveryStorage();
      final transport = authority.transport(storage);
      final id = _id(1), seen = <Object>[];
      final replaced = beforeSubmitting(transport, id, () async => seen.add('replaced'));
      final forget = beforeSubmitting(transport, id, () async {
        final record = transport.recoveryStates.single;
        seen.add([_saved(storage), record.resolutionState, record.attemptCount, List.of(authority.sends)]);
      });
      // Removing a replaced hook leaves its replacement.
      replaced();
      await _send(transport, id);
      expect(seen, [
        [
          [id],
          'pending',
          0,
          <String>[],
        ],
      ]);
      expect(authority.sends, [id]);
      forget();
      await _send(transport, id);
      expect(seen, hasLength(1), reason: 'a removed hook no longer runs');
      expect(authority.sends, [id, id]);
      transport.close();
    });

    test('a submission hook that throws fails the submission before anything is counted or sent', () async {
      final authority = _Authority(), storage = MemoryRecoveryStorage();
      final transport = authority.transport(storage);
      final id = _id(1);
      final forget = beforeSubmitting(transport, id, () async => throw StateError('disk full'));
      await expectLater(_send(transport, id), throwsA(isStateError));
      expect(authority.sends, isEmpty);
      final record = transport.recoveryStates.single;
      expect(
        (record.resolutionState, record.attemptCount, record.lastAttemptClassification),
        ('pending', 0, 'notSubmitted'),
      );
      // Once the hook passes, the request is sent under its ID with its full budget.
      forget();
      await _send(transport, id);
      expect(authority.sends, [id]);
      expect(transport.recoveryStates.single.attemptCount, 1);
      transport.close();
    });

    test("a gateway's error page that isn't JSON keeps its status and Retry-After", () async {
      final transport = ConvoHopTransport(
        baseUrl: 'https://authority.example',
        namespace: 'test',
        incarnation: incarnation,
        httpClient: mockGraphQL(
          (request, body) => http.Response(
            '<html>Bad gateway</html>',
            502,
            headers: <String, String>{'content-type': 'text/html', 'retry-after': '9'},
          ),
        ),
        clock: fixedClock,
      );
      await expectLater(
        transport.execute(Operations.communicationRoute, projectId, const <String, Object?>{}),
        throwsA(
          _problem(
            'INVALID_RESPONSE',
            outcome: 'unknown',
          ).having((problem) => problem.status, 'status', 502).having((problem) => problem.retryAfter, 'retryAfter', 9),
        ),
      );
      transport.close();
    });
  });
}
