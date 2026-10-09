import 'dart:async';
import 'dart:convert';

import 'package:convohop/convohop.dart';
import 'package:convohop/src/failures.dart' show maxTimerDelayMs;
import 'package:convohop/src/protocol.dart' show fingerprint;
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/fake_time.dart';
import 'support/test_data.dart';

const _otherConversationId = '0f9e8d7c-6b5a-4c3d-9e2f-1a0b9c8d7e6f';
const _outboxKey = 'convohop.outbox:$projectId:$principalId';
const _journalKey = 'convohop.requests:$projectId:$principalId';

typedef _Answer = FutureOr<http.Response> Function(String requestId, Map<String, Object?> input);

/// An authority that records each request, then answers it from a
/// per-operation script or the shared fixtures. Offline, requests fail
/// before reaching it.
final class _Authority {
  bool online = true;
  final List<(String, String, Map<String, Object?>)> calls = <(String, String, Map<String, Object?>)>[];
  final Map<String, List<_Answer>> _scripts = <String, List<_Answer>>{};
  int _sequence = 0;

  void answer(String operation, _Answer answer) => _scripts.putIfAbsent(operation, () => <_Answer>[]).add(answer);

  http.Client get httpClient => mockGraphQL((request, body) {
    final operation = body['operationName']! as String;
    final variables = body['variables']! as Map<String, Object?>;
    final id = (variables['context']! as Map<String, Object?>)['requestId']! as String;
    final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
    calls.add((operation, id, input));
    if (!online) throw http.ClientException('offline');
    final script = _scripts[operation];
    if (script != null && script.isNotEmpty) return script.removeAt(0)(id, input);
    if (operation == 'CommunicationSendMessage') {
      final ack = _ack(input['conversationId']! as String, '${++_sequence}');
      return jsonResponse(gqlEnvelope('sendMessage', id, ack, status: 'committed'));
    }
    return jsonResponse(okFor(operation, id, input));
  });

  ConvoHopClient client(Clock clock, {RecoveryStorage? storage}) => ConvoHopClient(
    baseUrl: 'https://authority.example',
    projectId: projectId,
    principalId: principalId,
    sessionToken: 'fake-session-token',
    incarnation: incarnation,
    recoveryStorage: storage,
    httpClient: httpClient,
    clock: clock,
  );

  List<String> get operations => <String>[for (final (operation, _, _) in calls) operation];

  /// The request IDs submitted with SendMessage, in order.
  List<String> get sends => <String>[
    for (final (operation, id, _) in calls)
      if (operation == 'CommunicationSendMessage') id,
  ];

  /// The request IDs checked read-only, in order.
  List<String> get checks => <String>[
    for (final (operation, _, input) in calls)
      if (operation == 'CommunicationResolveRequest') input['requestId']! as String,
  ];
}

Map<String, Object?> _ack(String conversation, String sequence) => <String, Object?>{
  ...messageAck(sequence: sequence),
  'conversationId': conversation,
  'cursor': cursor(sequence: sequence, id: conversation),
};

_Answer _committed(String resolved, String sequence) =>
    (id, input) =>
        jsonResponse(gqlEnvelope('resolveRequest', id, committedResolution(resolved, _ack(conversationId, sequence))));

Map<String, Object?> _stored(String id) => <String, Object?>{
  'requestId': id,
  'conversationId': conversationId,
  'text': 'stored',
  'props': <String, Object?>{},
  'createdAt': fixedClock(),
  'state': 'queued',
  'attempted': false,
  'uncertain': false,
  'attempts': 0,
};

/// Storage whose outbox reads and writes wait while [held] is set. Outbox
/// writes count from 1, and those in [failing] fail.
final class _OutboxStorage implements RecoveryStorage {
  final MemoryRecoveryStorage memory = MemoryRecoveryStorage();
  final Set<int> failing = <int>{};
  Completer<void>? held;
  int writes = 0;

  @override
  Future<String?> getItem(String key) async {
    if (key == _outboxKey) await held?.future;
    return memory.getItem(key);
  }

  @override
  Future<void> setItem(String key, String value) => _write(key, () => memory.setItem(key, value));

  @override
  Future<void> removeItem(String key) => _write(key, () => memory.removeItem(key));

  Future<void> _write(String key, void Function() write) async {
    if (key == _outboxKey) {
      final number = ++writes;
      await held?.future;
      if (failing.contains(number)) throw StateError('disk full');
    }
    write();
  }
}

/// Whether [future] completed once [async]'s pending microtasks ran.
bool _done(FakeAsync async, Future<void> future) {
  var done = false;
  future.whenComplete(() => done = true).ignore();
  async.flushMicrotasks();
  return done;
}

/// A distinct canonical request ID.
String _requestId(int index) => '00000000-0000-4000-8000-${index.toRadixString(16).padLeft(12, '0')}';

/// The recovery record of an earlier message send, stored after one attempt
/// at [at].
Map<String, Object?> _journalRecord(
  String id,
  int at,
  String resolutionState, {
  String classification = 'submitted',
  int? retryDeadline,
}) {
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
    'retryDeadline': retryDeadline ?? at + 60000,
    'attemptCount': 1,
    'lastAttemptAt': at,
    'lastAttemptClassification': classification,
    'resolutionState': resolutionState,
  };
}

/// The request IDs [client]'s recovery journal holds, in order.
List<String> _journal(ConvoHopClient client) => <String>[
  for (final state in client.transport.recoveryStates) state.requestId,
];

/// The refusal of request [id] while no recovery record can make room.
Matcher _recoveryLimit(String id) => isA<ConvoHopProblem>()
    .having((problem) => problem.code, 'code', 'RECOVERY_LIMIT')
    .having((problem) => problem.requestId, 'requestId', id)
    .having((problem) => problem.outcome, 'outcome', 'rejected')
    .having((problem) => problem.status, 'status', 409);

void main() {
  test('outbox queues, flushes in order, keeps request ids and persists unsent messages', () async {
    final storage = MemoryRecoveryStorage();
    final operations = <String>[];
    final sendRequestIds = <String>[];
    final client = clientWith(
      mockGraphQL((request, body) {
        final variables = body['variables'] as Map<String, Object?>;
        final context = variables['context'] as Map<String, Object?>;
        final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
        final name = body['operationName'] as String;
        operations.add(name);
        if (name == 'CommunicationSendMessage') sendRequestIds.add(context['requestId'] as String);
        return jsonResponse(okFor(name, context['requestId'] as String, input));
      }),
      storage: storage,
    );
    final outbox = ConvoHopOutbox(client, clock: fixedClock);
    final first = await outbox.send(conversationId, 'one');
    final second = await outbox.send(conversationId, 'two');
    expect(<OutboxState>[OutboxState.queued, OutboxState.sending], contains(first.state));
    expect(<OutboxState>[OutboxState.queued, OutboxState.sending], contains(second.state));
    await outbox.initialize();
    await pumpEventQueue(times: 20);
    expect(outbox.items, isEmpty);
    expect(sendRequestIds, hasLength(2));
    expect(sendRequestIds.toSet(), hasLength(2));
    expect(operations.where((name) => name == 'CommunicationSendMessage'), hasLength(2));
    expect(storage.items.values.join('\n'), isNot(contains('fake-session-token')));
    await outbox.close();
    client.close();
  });

  test('checks read-only while offline, backs off, then submits once with the original request ID', () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      final authority = _Authority()..online = false;
      final storage = MemoryRecoveryStorage();
      final client = authority.client(now, storage: storage);
      final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter());
      final changes = <OutboxItem>[];
      outbox.changes.listen(changes.add);

      final queued = settled(async, outbox.send(conversationId, 'hello offline'));
      expect(authority.operations, <String>['CommunicationResolveRequest']);
      expect(outbox.offline, isTrue);
      final waiting = outbox.items.single;
      expect(waiting.requestId, queued.requestId);
      expect(waiting.state, OutboxState.queued);
      expect(waiting.errorCode, 'TRANSPORT_UNKNOWN');
      expect(waiting.attempts, 0);
      expect(waiting.uncertain, isFalse);
      expect(storage.items[_outboxKey], contains(queued.requestId));

      // One failure backs off one second; the next check doubles it.
      async.elapse(const Duration(milliseconds: 999));
      expect(authority.calls, hasLength(1));
      async.elapse(const Duration(milliseconds: 1));
      expect(authority.operations, <String>['CommunicationResolveRequest', 'CommunicationResolveRequest']);
      async.elapse(const Duration(milliseconds: 1999));
      expect(authority.calls, hasLength(2));
      expect(authority.sends, isEmpty);

      authority.online = true;
      outbox.flush();
      async.flushMicrotasks();
      expect(authority.checks, <String>[queued.requestId, queued.requestId, queued.requestId]);
      expect(authority.sends, <String>[queued.requestId]);
      expect(authority.calls.last.$3, <String, Object?>{
        'conversationId': conversationId,
        'text': 'hello offline',
        'props': <String, Object?>{},
      });
      expect(outbox.offline, isFalse);
      expect(outbox.items, isEmpty);
      expect(changes.last.state, OutboxState.sent);
      expect(changes.last.attempts, 1);
      expect(changes.last.ack?.sequence, '1');
      expect(storage.items.containsKey(_outboxKey), isFalse);

      settled(async, outbox.close());
      client.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('fails a rejected send without retrying, resends it as a new message at the end and discards on request', () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      final authority = _Authority()
        ..answer('CommunicationSendMessage', (id, input) => jsonResponse(gqlError('FORBIDDEN', status: 403)))
        ..answer('CommunicationSendMessage', (id, input) => jsonResponse(gqlError('FORBIDDEN', status: 403)));
      final storage = MemoryRecoveryStorage();
      final errors = <Object>[];
      final client = authority.client(now, storage: storage);
      final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter(), onError: errors.add);

      final first = settled(async, outbox.send(conversationId, 'first'));
      final second = settled(async, outbox.send(conversationId, 'second'));
      expect(
        outbox.items.map((item) => (item.text, item.state, item.errorCode, item.attempts, item.uncertain)),
        <Object>[
          ('first', OutboxState.failed, 'FORBIDDEN', 1, false),
          ('second', OutboxState.failed, 'FORBIDDEN', 1, false),
        ],
      );
      expect(outbox.items.first.error, isA<ConvoHopProblem>().having((problem) => problem.status, 'status', 403));
      expect(authority.sends, <String>[first.requestId, second.requestId]);
      async.elapse(const Duration(minutes: 1));
      expect(authority.sends, hasLength(2));
      expect(async.pendingTimers, isEmpty);

      final gate = Completer<void>();
      authority.answer('CommunicationSendMessage', (id, input) async {
        await gate.future;
        return jsonResponse(gqlEnvelope('sendMessage', id, _ack(conversationId, '3'), status: 'committed'));
      });
      final resent = settled(async, outbox.resend(first.requestId));
      expect(resent.requestId, isNot(first.requestId));
      expect(resent.text, 'first');
      expect(outbox.items.map((item) => (item.text, item.state)), <Object>[
        ('second', OutboxState.failed),
        ('first', OutboxState.sending),
      ]);
      expect(authority.sends, <String>[first.requestId, second.requestId, resent.requestId]);
      expect(failureOf(async, outbox.resend(resent.requestId)), isStateError);
      expect(failureOf(async, outbox.discard(resent.requestId)), isStateError);
      expect(failureOf(async, outbox.resend(first.requestId)), isStateError);

      gate.complete();
      async.flushMicrotasks();
      expect(outbox.items.map((item) => item.requestId), <String>[second.requestId]);
      final stored = jsonDecode(storage.items[_outboxKey]!) as List<Object?>;
      expect(stored.map((entry) => (entry! as Map<String, Object?>)['requestId']), <String>[second.requestId]);

      settled(async, outbox.discard(second.requestId));
      expect(outbox.items, isEmpty);
      expect(storage.items.containsKey(_outboxKey), isFalse);
      expect(authority.sends, hasLength(3));
      expect(errors, isEmpty);

      settled(async, outbox.close());
      client.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('a rate-limited message waits for retryAfter and holds back only its own conversation', () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      final authority = _Authority()
        ..answer(
          'CommunicationSendMessage',
          (id, input) => jsonResponse(gqlError('RATE_LIMITED', status: 429, retryAfter: '5')),
        );
      final errors = <Object>[];
      final client = authority.client(now);
      final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter(), onError: errors.add);

      final x1 = settled(async, outbox.send(conversationId, 'x1'));
      final x2 = settled(async, outbox.send(conversationId, 'x2'));
      final y1 = settled(async, outbox.send(_otherConversationId, 'y1'));
      expect(authority.sends, <String>[x1.requestId, y1.requestId]);
      final head = outbox.items.first;
      expect(head.requestId, x1.requestId);
      expect(head.state, OutboxState.queued);
      expect(head.errorCode, 'RATE_LIMITED');
      expect(head.nextAttemptAt, fixedClock() + 5000);
      expect(head.uncertain, isFalse);
      expect(outbox.items.map((item) => item.text), <String>['x1', 'x2']);
      expect(outbox.itemsFor(_otherConversationId), isEmpty);
      expect(outbox.offline, isFalse);

      async.elapse(const Duration(milliseconds: 4999));
      expect(authority.sends, hasLength(2));
      async.elapse(const Duration(milliseconds: 1));
      expect(authority.sends, <String>[x1.requestId, y1.requestId, x1.requestId, x2.requestId]);
      expect(authority.checks, <String>[x1.requestId, x1.requestId]);
      expect(outbox.items, isEmpty);
      expect(errors, isEmpty);

      settled(async, outbox.close());
      client.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('restores stored messages after a restart and submits them with the original request ID', () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      final storage = MemoryRecoveryStorage();
      final offline = _Authority()..online = false;
      final firstClient = offline.client(now, storage: storage);
      final firstOutbox = ConvoHopOutbox(firstClient, clock: now, random: NoJitter());
      final queued = settled(
        async,
        firstOutbox.send(conversationId, 'survives a restart', props: <String, Object?>{'kind': 'note'}),
      );
      expect(offline.operations, <String>['CommunicationResolveRequest']);
      settled(async, firstOutbox.close());
      firstClient.close();

      final stored = storage.items[_outboxKey]!;
      expect(stored, isNot(contains('fake-session-token')));
      expect(jsonDecode(stored), <Object?>[
        <String, Object?>{
          'requestId': queued.requestId,
          'conversationId': conversationId,
          'text': 'survives a restart',
          'props': <String, Object?>{'kind': 'note'},
          'createdAt': fixedClock(),
          'state': 'queued',
          'attempted': false,
          'uncertain': false,
          'attempts': 0,
          'errorCode': 'TRANSPORT_UNKNOWN',
        },
      ]);

      final online = _Authority();
      final client = online.client(now, storage: storage);
      final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter());
      settled(async, outbox.initialize());
      expect(online.checks, <String>[queued.requestId]);
      expect(online.sends, <String>[queued.requestId]);
      expect(online.calls.last.$3, <String, Object?>{
        'conversationId': conversationId,
        'text': 'survives a restart',
        'props': <String, Object?>{'kind': 'note'},
      });
      expect(outbox.items, isEmpty);
      expect(storage.items.containsKey(_outboxKey), isFalse);

      settled(async, outbox.close());
      client.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('after the app stops mid-send, checks read-only and does not submit again once committed', () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      final storage = MemoryRecoveryStorage();
      final stalled = _Authority()
        ..answer('CommunicationSendMessage', (id, input) => Completer<http.Response>().future);
      final stopped = ConvoHopOutbox(
        stalled.client(now, storage: storage),
        clock: now,
        random: NoJitter(),
      );
      final sending = settled(async, stopped.send(conversationId, 'maybe sent'));
      expect(stalled.sends, <String>[sending.requestId]);
      expect(stopped.items.single.state, OutboxState.sending);
      // The app stops here, so this attempt never settles.
      final saved = (jsonDecode(storage.items[_outboxKey]!) as List<Object?>).single! as Map<String, Object?>;
      expect((saved['state'], saved['attempted'], saved['uncertain'], saved['attempts']), ('sending', true, true, 1));

      final authority = _Authority()..answer('CommunicationResolveRequest', _committed(sending.requestId, '7'));
      final client = authority.client(now, storage: storage);
      final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter());
      final changes = <OutboxItem>[];
      outbox.changes.listen(changes.add);
      settled(async, outbox.initialize());
      expect(authority.checks, <String>[sending.requestId]);
      expect(authority.sends, isEmpty);
      expect(changes.map((item) => (item.requestId, item.state)), <Object>[
        (sending.requestId, OutboxState.sending),
        (sending.requestId, OutboxState.sent),
      ]);
      expect(changes.first.uncertain, isTrue);
      expect(changes.last.attempts, 1);
      expect(changes.last.ack?.sequence, '7');
      expect(outbox.items, isEmpty);
      expect(storage.items.containsKey(_outboxKey), isFalse);
      final record = client.transport.recoveryStates.singleWhere((state) => state.requestId == sending.requestId);
      expect(record.resolutionState, 'committed');

      settled(async, outbox.close());
      client.close();
    });
  });

  test('after the app stops before the transport stores its record, checks read-only and submits once', () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      // The outbox noted the attempt, then the app stopped before the transport stored a recovery record.
      final storage = MemoryRecoveryStorage()
        ..setItem(
          _outboxKey,
          jsonEncode(<Object?>[
            <String, Object?>{
              ..._stored(requestId),
              'state': 'sending',
              'attempted': true,
              'uncertain': true,
              'attempts': 1,
            },
          ]),
        );
      final authority = _Authority();
      final client = authority.client(now, storage: storage);
      final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter());
      final changes = <OutboxItem>[];
      outbox.changes.listen(changes.add);
      settled(async, outbox.initialize());
      expect(authority.checks, <String>[requestId]);
      expect(authority.sends, <String>[requestId]);
      expect(authority.calls.last.$3, <String, Object?>{
        'conversationId': conversationId,
        'text': 'stored',
        'props': <String, Object?>{},
      });
      expect(changes.map((item) => item.state), <OutboxState>[OutboxState.sending, OutboxState.sent]);
      expect(outbox.items, isEmpty);
      expect(storage.items.containsKey(_outboxKey), isFalse);
      final record = client.transport.recoveryStates.singleWhere((state) => state.requestId == requestId);
      expect((record.resolutionState, record.attemptCount), ('committed', 1));

      settled(async, outbox.close());
      client.close();
    });
  });

  test('stops at the retry budget: an uncertain send becomes unknown until a read-only check settles it', () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      final authority = _Authority();
      for (var i = 0; i < 3; i++) {
        authority.answer('CommunicationSendMessage', (id, input) => throw http.ClientException('connection reset'));
      }
      final client = authority.client(now);
      final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter());
      final changes = <OutboxItem>[];
      outbox.changes.listen(changes.add);

      final item = settled(async, outbox.send(conversationId, 'in doubt'));
      var current = outbox.items.single;
      expect(
        (current.state, current.uncertain, current.attempts, current.errorCode),
        (OutboxState.queued, true, 1, 'TRANSPORT_UNKNOWN'),
      );
      expect(outbox.offline, isTrue);
      async.elapse(const Duration(seconds: 1));
      expect(authority.sends, hasLength(2));
      async.elapse(const Duration(seconds: 1));
      expect(authority.sends, hasLength(3));
      async.elapse(const Duration(seconds: 1));
      current = outbox.items.single;
      expect(
        (current.state, current.uncertain, current.attempts, current.errorCode),
        (OutboxState.unknown, true, 3, 'RESOLUTION_REQUIRED'),
      );
      expect(authority.sends, <String>[item.requestId, item.requestId, item.requestId]);
      expect(authority.checks, <String>[item.requestId, item.requestId, item.requestId, item.requestId]);

      async.elapse(const Duration(minutes: 5));
      expect(authority.sends, hasLength(3));
      expect(async.pendingTimers, isEmpty);
      expect(failureOf(async, outbox.discard(item.requestId)), isStateError);

      expect(settled(async, outbox.resolve(item.requestId)).state, OutboxState.unknown);
      expect(authority.checks, hasLength(5));

      authority.answer('CommunicationResolveRequest', _committed(item.requestId, '9'));
      outbox.flush();
      async.flushMicrotasks();
      expect(outbox.items, isEmpty);
      expect(changes.last.state, OutboxState.sent);
      expect(changes.last.ack?.sequence, '9');
      expect(authority.sends, hasLength(3));

      settled(async, outbox.close());
      client.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('keeps a message whose earlier attempt may have committed instead of discarding it', () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      final authority = _Authority()
        ..answer('CommunicationSendMessage', (id, input) => throw http.ClientException('connection reset'));
      final client = authority.client(now);
      final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter());
      final changes = <OutboxItem>[];
      outbox.changes.listen(changes.add);

      final item = settled(async, outbox.send(conversationId, 'in doubt'));
      expect((outbox.items.single.state, outbox.items.single.uncertain), (OutboxState.queued, true));
      expect(failureOf(async, outbox.discard(item.requestId)), isStateError);
      expect(outbox.items.single.requestId, item.requestId);

      // The outbox still owns the request, so its retry reuses the request ID.
      async.elapse(const Duration(seconds: 1));
      expect(outbox.items, isEmpty);
      expect(changes.last.state, OutboxState.sent);
      expect(authority.sends, <String>[item.requestId, item.requestId]);

      settled(async, outbox.close());
      client.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('rejects invalid messages, a full outbox, malformed storage and use after close', () {
    fakeAsync((async) {
      final authority = _Authority()..online = false;
      final client = authority.client(fixedClock);
      final outbox = ConvoHopOutbox(client, clock: fixedClock, random: NoJitter());
      expect(failureOf(async, outbox.send('not-a-uuid', 'text')), isArgumentError);
      expect(
        failureOf(async, outbox.send(conversationId, 'text', props: <String, Object?>{'at': DateTime(2026)})),
        isArgumentError,
      );
      for (var i = 0; i < ConvoHopOutbox.maxItems; i++) {
        settled(async, outbox.send(conversationId, 'message $i'));
      }
      expect(failureOf(async, outbox.send(conversationId, 'one too many')), isStateError);
      expect(outbox.items, hasLength(ConvoHopOutbox.maxItems));
      expect(authority.sends, isEmpty);
      settled(async, outbox.close());
      expect(failureOf(async, outbox.send(conversationId, 'closed')), isStateError);
      client.close();

      for (final (stored, message) in <(String, String)>[
        ('not json', 'Invalid outbox storage'),
        (jsonEncode(<Object?>[_stored(requestId)]).replaceFirst('"stored"', '7'), 'Invalid outbox storage'),
        (
          jsonEncode(<Object?>[
            <String, Object?>{..._stored(requestId), 'token': 'fake-session-token'},
          ]),
          'Invalid outbox storage',
        ),
        (jsonEncode(<Object?>[_stored(requestId), _stored(requestId)]), 'Duplicate outbox request ID'),
      ]) {
        final storage = MemoryRecoveryStorage()..setItem(_outboxKey, stored);
        final restoring = authority.client(fixedClock, storage: storage);
        final restored = ConvoHopOutbox(restoring, clock: fixedClock);
        expect(
          failureOf(async, restored.initialize()),
          isA<FormatException>().having((error) => error.message, 'message', message),
          reason: stored,
        );
        expect(storage.items[_outboxKey], stored);
        restoring.close();
      }
    });
  });

  test('close waits for loading and saves, returns one future and never fails', () {
    fakeAsync((async) {
      final authority = _Authority();
      final loading = _OutboxStorage()..held = Completer<void>();
      loading.memory.setItem(_outboxKey, jsonEncode(<Object?>[_stored(requestId)]));
      final client = authority.client(fixedClock, storage: loading);
      final outbox = ConvoHopOutbox(client, clock: fixedClock, random: NoJitter());
      var ended = false;
      final paused = outbox.changes.listen(null, onDone: () => ended = true)..pause();
      final initialized = outbox.initialize();
      final closing = outbox.close();
      expect(outbox.close(), same(closing));
      expect(_done(async, closing), isFalse);
      loading.held!.complete();
      // A paused listener doesn't hold up closing.
      settled(async, closing);
      settled(async, initialized);
      expect(outbox.items.single.requestId, requestId);
      expect(loading.memory.items[_outboxKey], contains(requestId));
      expect(authority.calls, isEmpty);
      expect(ended, isFalse);
      paused.resume();
      async.flushMicrotasks();
      expect(ended, isTrue);
      client.close();

      final saving = _OutboxStorage();
      final errors = <Object>[];
      final next = authority.client(fixedClock, storage: saving);
      final unsaved = ConvoHopOutbox(next, clock: fixedClock, random: NoJitter(), onError: errors.add);
      settled(async, unsaved.initialize());
      saving
        ..held = Completer<void>()
        ..failing.add(1);
      final sending = unsaved.send(conversationId, 'unsaved');
      async.flushMicrotasks();
      expect(saving.writes, 1);
      final closed = unsaved.close();
      expect(_done(async, closed), isFalse);
      saving.held!.complete();
      expect(failureOf(async, sending), isA<StateError>().having((error) => error.message, 'message', 'disk full'));
      settled(async, closed);
      expect(unsaved.items, isEmpty);
      expect(saving.memory.items, isNot(contains(_outboxKey)));
      expect(errors, isEmpty);
      next.close();

      final unreadable = _OutboxStorage();
      unreadable.memory.setItem(_outboxKey, 'not JSON');
      final last = authority.client(fixedClock, storage: unreadable);
      final broken = ConvoHopOutbox(last, clock: fixedClock, random: NoJitter());
      final loaded = broken.initialize();
      final stopped = broken.close();
      expect(failureOf(async, loaded), isFormatException);
      settled(async, stopped);
      last.close();
      expect(authority.calls, isEmpty);
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('close waits for the send in flight and the save of its outcome', () {
    fakeAsync((async) {
      final response = Completer<http.Response>();
      final authority = _Authority()..answer('CommunicationSendMessage', (id, input) => response.future);
      final storage = _OutboxStorage();
      final client = authority.client(fixedClock, storage: storage);
      final outbox = ConvoHopOutbox(client, clock: fixedClock, random: NoJitter());
      final changes = <OutboxState>[];
      outbox.changes.listen((item) => changes.add(item.state));

      final item = settled(async, outbox.send(conversationId, 'in flight'));
      expect(authority.operations, <String>['CommunicationResolveRequest', 'CommunicationSendMessage']);
      expect(outbox.items.single.state, OutboxState.sending);
      final closing = outbox.close();
      expect(_done(async, closing), isFalse);
      expect(storage.memory.items[_outboxKey], contains(item.requestId));

      response.complete(
        jsonResponse(gqlEnvelope('sendMessage', item.requestId, _ack(conversationId, '1'), status: 'committed')),
      );
      expect(_done(async, closing), isTrue);
      expect(storage.memory.items, isNot(contains(_outboxKey)));
      // Closed outboxes emit no more changes.
      expect(changes, <OutboxState>[OutboxState.queued, OutboxState.sending]);
      expect(authority.sends, <String>[item.requestId]);
      client.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test("keeps sending after the app's error handler throws", () {
    fakeAsync((async) {
      int now() => fixedClock() + async.elapsed.inMilliseconds;
      final authority = _Authority();
      // The save before submitting fails.
      final storage = _OutboxStorage()..failing.add(2);
      final client = authority.client(now, storage: storage);
      final errors = <Object>[];
      final outbox = ConvoHopOutbox(
        client,
        clock: now,
        random: NoJitter(),
        onError: (error) {
          errors.add(error);
          throw StateError('The app failed');
        },
      );

      final item = settled(async, outbox.send(conversationId, 'retried'));
      expect(errors, <Matcher>[isA<StateError>().having((error) => error.message, 'message', 'disk full')]);
      expect(outbox.items.single.state, OutboxState.queued);
      expect(authority.sends, isEmpty);

      async.elapse(const Duration(seconds: 1));
      expect(authority.sends, <String>[item.requestId]);
      expect(outbox.items, isEmpty);
      expect(errors, hasLength(1));
      settled(async, outbox.close());
      client.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  group('recovery journal and retry policy', () {
    test(
      'keeps a message queued while the recovery journal is full, then sends it under its ID once a record is final',
      () {
        fakeAsync((async) {
          int now() => fixedClock() + async.elapsed.inMilliseconds;
          final authority = _Authority();
          final storage = MemoryRecoveryStorage();
          // Each stored send was rate limited, so it may be sent again until its
          // retry deadline, 2.5 seconds from now.
          final stored = <String>[for (var index = 1; index <= 128; index++) _requestId(index)];
          storage.setItem(
            _journalKey,
            jsonEncode(<Object?>[
              for (final (index, id) in stored.indexed)
                _journalRecord(
                  id,
                  fixedClock() - 1000 + index,
                  'rejected',
                  classification: 'RATE_LIMITED',
                  retryDeadline: fixedClock() + 2500,
                ),
            ]),
          );
          final errors = <Object>[];
          final client = authority.client(now, storage: storage);
          final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter(), onError: errors.add);
          final changes = <OutboxItem>[];
          outbox.changes.listen(changes.add);

          final item = settled(async, outbox.send(conversationId, 'waits for room'));
          // Refused before anything was stored or sent, the message spent none of
          // its budget and isn't in doubt.
          expect(authority.operations, <String>['CommunicationResolveRequest']);
          var current = outbox.items.single;
          expect(
            (current.state, current.errorCode, current.attempts, current.uncertain, current.nextAttemptAt),
            (OutboxState.queued, 'RECOVERY_LIMIT', 0, false, fixedClock() + 1000),
          );
          expect(current.error, _recoveryLimit(item.requestId));
          expect(errors, <Matcher>[_recoveryLimit(item.requestId)]);
          expect(_journal(client), stored);
          final saved = (jsonDecode(storage.items[_outboxKey]!) as List<Object?>).single! as Map<String, Object?>;
          expect((saved['attempted'], saved['uncertain'], saved['attempts']), (false, false, 0));

          async.elapse(const Duration(seconds: 1));
          current = outbox.items.single;
          expect(
            (current.state, current.attempts, current.nextAttemptAt),
            (OutboxState.queued, 0, fixedClock() + 3000),
          );
          expect(authority.sends, isEmpty);
          expect(errors, hasLength(2));

          // Past their deadline, the stored sends are final, and the oldest one
          // makes room.
          async.elapse(const Duration(seconds: 2));
          expect(authority.sends, <String>[item.requestId]);
          expect(authority.checks, <String>[item.requestId]);
          expect(outbox.items, isEmpty);
          expect((changes.last.state, changes.last.attempts), (OutboxState.sent, 1));
          expect(_journal(client), <String>[...stored.skip(1), item.requestId]);
          expect(errors, hasLength(2));

          settled(async, outbox.close());
          client.close();
          expect(async.pendingTimers, isEmpty);
        });
      },
    );

    test('fails a message at once on a quota or plan limit, or an unlisted code with a client error status', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority()
          ..answer(
            'CommunicationSendMessage',
            (id, input) => jsonResponse(gqlError('QUOTA_EXCEEDED', status: 429, retryAfter: '60')),
          )
          ..answer(
            'CommunicationSendMessage',
            (id, input) => jsonResponse(gqlError('PLAN_LIMIT_EXCEEDED', status: 403)),
          )
          ..answer('CommunicationSendMessage', (id, input) => jsonResponse(gqlError('NEWLY_INVENTED', status: 400)));
        final errors = <Object>[];
        final client = authority.client(now);
        final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter(), onError: errors.add);

        final sent = <String>[
          for (final text in <String>['over quota', 'over plan', 'not understood'])
            settled(async, outbox.send(conversationId, text)).requestId,
        ];
        expect(
          outbox.items.map((item) => (item.text, item.state, item.errorCode, item.attempts, item.uncertain)),
          <Object>[
            ('over quota', OutboxState.failed, 'QUOTA_EXCEEDED', 1, false),
            ('over plan', OutboxState.failed, 'PLAN_LIMIT_EXCEEDED', 1, false),
            ('not understood', OutboxState.failed, 'NEWLY_INVENTED', 1, false),
          ],
        );
        expect(async.pendingTimers, isEmpty);
        async.elapse(const Duration(minutes: 5));
        expect(authority.sends, sent);
        expect(errors, isEmpty);

        settled(async, outbox.close());
        client.close();
      });
    });

    test('keeps a message after a rejection the shared classifier retries, waiting at least its retryAfter', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority()
          // A code the IR doesn't list is retried by its status.
          ..answer('CommunicationSendMessage', (id, input) => jsonResponse(gqlError('NEWLY_INVENTED', status: 503)))
          ..answer(
            'CommunicationSendMessage',
            (id, input) => jsonResponse(gqlError('AUTHORITY_UNAVAILABLE', status: 503, retryAfter: '5')),
          );
        final errors = <Object>[];
        final client = authority.client(now);
        final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter(), onError: errors.add);

        final item = settled(async, outbox.send(conversationId, 'eventually'));
        var current = outbox.items.single;
        expect(
          (current.state, current.errorCode, current.attempts, current.uncertain, current.nextAttemptAt),
          (OutboxState.queued, 'NEWLY_INVENTED', 1, false, fixedClock() + 1000),
        );
        async.elapse(const Duration(seconds: 1));
        // A second failure backs off two seconds, but the authority asked for five.
        current = outbox.items.single;
        expect(
          (current.state, current.errorCode, current.attempts, current.nextAttemptAt),
          (OutboxState.queued, 'AUTHORITY_UNAVAILABLE', 2, fixedClock() + 6000),
        );
        async.elapse(const Duration(milliseconds: 4999));
        expect(authority.sends, hasLength(2));
        async.elapse(const Duration(milliseconds: 1));
        expect(authority.sends, <String>[item.requestId, item.requestId, item.requestId]);
        expect(outbox.items, isEmpty);
        expect(errors, isEmpty);

        settled(async, outbox.close());
        client.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test('routes again after WRONG_REGION, then sends the message again under its ID', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority()
          ..answer('CommunicationSendMessage', (id, input) => jsonResponse(gqlError('WRONG_REGION', status: 409)));
        final errors = <Object>[];
        final client = authority.client(now);
        final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter(), onError: errors.add);

        final item = settled(async, outbox.send(conversationId, 'moved'));
        expect(authority.operations, <String>[
          'CommunicationResolveRequest',
          'CommunicationSendMessage',
          'CommunicationRoute',
        ]);
        final current = outbox.items.single;
        expect(
          (current.state, current.errorCode, current.attempts, current.uncertain, current.nextAttemptAt),
          (OutboxState.queued, 'WRONG_REGION', 1, false, fixedClock() + 1000),
        );

        async.elapse(const Duration(seconds: 1));
        expect(authority.operations.skip(3), <String>['CommunicationResolveRequest', 'CommunicationSendMessage']);
        expect(authority.sends, <String>[item.requestId, item.requestId]);
        expect(outbox.items, isEmpty);
        expect(errors, isEmpty);

        settled(async, outbox.close());
        client.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test('keeps the recovery record of a message it may still send until the message fails or it closes', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority()
          ..answer('CommunicationSendMessage', (id, input) => jsonResponse(gqlError('QUOTA_EXCEEDED', status: 429)))
          ..answer(
            'CommunicationSendMessage',
            (id, input) => jsonResponse(gqlError('RATE_LIMITED', status: 429, retryAfter: '120')),
          );
        final storage = MemoryRecoveryStorage();
        // Sends whose outcome is unknown are never final.
        final unknown = <String>[for (var index = 1; index <= 126; index++) _requestId(index)];
        storage.setItem(
          _journalKey,
          jsonEncode(<Object?>[for (final id in unknown) _journalRecord(id, fixedClock() - 1000, 'unknown')]),
        );
        final client = authority.client(now, storage: storage);
        final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter());

        final failed = settled(async, outbox.send(_otherConversationId, 'over quota'));
        final held = settled(async, outbox.send(conversationId, 'rate limited'));
        expect(outbox.items.map((item) => (item.requestId, item.state)), <Object>[
          (failed.requestId, OutboxState.failed),
          (held.requestId, OutboxState.queued),
        ]);
        expect(_journal(client), <String>[...unknown, failed.requestId, held.requestId]);

        // Past their retry deadline, both records are final. The failed
        // message's record makes room; the queued message's stays, though it
        // is older than any other final record.
        async.elapse(const Duration(seconds: 61));
        settled(async, client.send(conversationId, 'first', requestId: _requestId(201)));
        expect(_journal(client), <String>[...unknown, held.requestId, _requestId(201)]);
        settled(async, client.send(conversationId, 'second', requestId: _requestId(202)));
        expect(_journal(client), <String>[...unknown, held.requestId, _requestId(202)]);

        // Closed, the outbox no longer keeps it.
        settled(async, outbox.close());
        settled(async, client.send(conversationId, 'third', requestId: _requestId(203)));
        expect(_journal(client), <String>[...unknown, _requestId(202), _requestId(203)]);
        expect(authority.sends, <String>[
          failed.requestId,
          held.requestId,
          _requestId(201),
          _requestId(202),
          _requestId(203),
        ]);
        client.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test('waits out a retryAfter longer than the longest timer in steps instead of spinning', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        // 3,000,000 seconds, about 35 days, outlasts the longest timer.
        const retryAfterMs = 3000000 * 1000;
        final authority = _Authority()
          ..answer(
            'CommunicationSendMessage',
            (id, input) => jsonResponse(gqlError('RATE_LIMITED', status: 429, retryAfter: '3000000')),
          );
        final client = authority.client(now);
        final outbox = ConvoHopOutbox(client, clock: now, random: NoJitter());

        final item = settled(async, outbox.send(conversationId, 'much later'));
        expect(outbox.items.single.nextAttemptAt, fixedClock() + retryAfterMs);
        expect(async.pendingTimers.single.duration, const Duration(milliseconds: maxTimerDelayMs));
        async.elapse(const Duration(milliseconds: maxTimerDelayMs));
        // Woken early, it only waits again for the rest.
        expect(authority.calls, hasLength(2));
        expect(async.pendingTimers.single.duration, const Duration(milliseconds: retryAfterMs - maxTimerDelayMs));
        async.elapse(const Duration(milliseconds: retryAfterMs - maxTimerDelayMs));
        // Its retry budget ran out long ago: it checks read-only, then fails.
        expect(authority.checks, <String>[item.requestId, item.requestId]);
        expect(authority.sends, <String>[item.requestId]);
        final current = outbox.items.single;
        expect((current.state, current.errorCode), (OutboxState.failed, 'RESOLUTION_REQUIRED'));
        expect(async.pendingTimers, isEmpty);

        settled(async, outbox.close());
        client.close();
      });
    });
  });
}
