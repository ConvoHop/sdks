import 'dart:async';
import 'dart:convert';

import 'package:convohop/convohop.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/fake_time.dart';
import 'support/realtime_fakes.dart';
import 'support/test_data.dart';

typedef _Answer = http.Response Function(String requestId);

Matcher _problem(String code, int status, {int? retryAfter}) => isA<ConvoHopProblem>()
    .having((problem) => problem.code, 'code', code)
    .having((problem) => problem.status, 'status', status)
    .having((problem) => problem.retryAfter, 'retryAfter', retryAfter);

/// A client following one conversation over fake sockets on [async]'s clock.
/// Its authority records when each request arrives, under its operation name
/// without the `Communication` prefix, and answers from a per-operation
/// script, then as [okFor] does.
final class _Realtime {
  _Realtime(this.async, {Iterable<Object> refusals = const <Object>[]}) {
    connector.refusals.addAll(refusals);
    client = clientWith(
      mockGraphQL((request, body) {
        final operation = (body['operationName']! as String).replaceFirst('Communication', '');
        final variables = body['variables']! as Map<String, Object?>;
        final id = (variables['context']! as Map<String, Object?>)['requestId']! as String;
        final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
        calls.add((operation, now));
        final script = _scripts[operation];
        if (script != null && script.isNotEmpty) return script.removeAt(0)(id);
        return jsonResponse(okFor('Communication$operation', id, input));
      }),
      realtime: connector.call,
    );
    stream = settled(async, client.watch(conversationId, (_) async {}, errors.add));
  }

  final FakeAsync async;
  final FakeRealtimeConnector connector = FakeRealtimeConnector();
  final List<(String, int)> calls = <(String, int)>[];
  final List<Object> errors = <Object>[];
  final Map<String, List<_Answer>> _scripts = <String, List<_Answer>>{};
  late final ConvoHopClient client;
  late final ConversationStream stream;

  int get now => async.elapsed.inMilliseconds;

  FakeRealtimeSocket get socket => connector.sockets.last;

  /// When the client asked for its route, in milliseconds from the start.
  List<int> get routed => <int>[
    for (final (operation, at) in calls)
      if (operation == 'Route') at,
  ];

  /// How long after [since] the client next asked for its route.
  int routedAfter(int since) => routed.firstWhere((at) => at > since) - since;

  String get subscription => socket.sent.lastWhere((frame) => frame['type'] == 'subscribe')['id']! as String;

  void answer(String operation, _Answer answer) => _scripts.putIfAbsent(operation, () => <_Answer>[]).add(answer);

  void acknowledge() {
    socket.server(<String, Object?>{'type': 'connection_ack'});
    async.flushMicrotasks();
  }

  void serverClose([int? code, String? reason]) {
    unawaited(socket.serverClose(code, reason));
    async.flushMicrotasks();
  }

  void close() {
    stream.close();
    client.close();
  }
}

void main() {
  group('conversation stream', () {
    test('replays history then subscribes and delivers live frames', () async {
      final connector = FakeRealtimeConnector();
      final storage = MemoryRecoveryStorage();
      final applied = <Event>[];
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          if (body['operationName'] == 'CommunicationEvents') {
            final after = input['after'];
            final next = after == null ? '1' : '2';
            return jsonResponse(
              gqlEnvelope(
                'events',
                context['requestId'] as String,
                eventPage(
                  items: <Map<String, Object?>>[event(sequence: next)],
                  sequence: next,
                ),
              ),
            );
          }
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
        storage: storage,
        realtime: connector.call,
      );

      final stream = await client.watch(
        conversationId,
        (events) async => applied.addAll(events),
        expectAsync1((_) {}, count: 0),
      );
      expect(applied.map((event) => event.sequence), <String>['1']);
      final socket = connector.sockets.single;
      socket.server(<String, Object?>{'type': 'connection_ack'});
      await pumpEventQueue();
      expect(socket.sent.first['type'], 'connection_init');
      expect(socket.sent.last['type'], 'subscribe');
      final subscribe = socket.sent.last['payload'] as Map<String, Object?>;
      expect(jsonEncode(subscribe), contains('conversationEvents'));

      socket.server(<String, Object?>{
        'type': 'next',
        'id': socket.sent.last['id'],
        'payload': <String, Object?>{
          'data': <String, Object?>{
            'conversationEvents': eventPage(
              items: <Map<String, Object?>>[event(sequence: '2')],
              sequence: '2',
            ),
          },
        },
      });
      await pumpEventQueue();
      expect(applied.map((event) => event.sequence), <String>['1', '2']);
      expect((await client.storedCursor(conversationId))?.sequence, '2');
      stream.close();
      client.close();
    });

    test('reports resync-required pages and closes instead of resetting cursor', () async {
      final connector = FakeRealtimeConnector();
      final errors = <Object>[];
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
        realtime: connector.call,
      );

      final stream = await client.watch(conversationId, (_) async {}, errors.add);
      final socket = connector.sockets.single;
      socket.server(<String, Object?>{'type': 'connection_ack'});
      await pumpEventQueue();
      socket.server(<String, Object?>{
        'type': 'next',
        'id': socket.sent.last['id'],
        'payload': <String, Object?>{
          'data': <String, Object?>{
            'conversationEvents': <String, Object?>{...eventPage(), 'refreshRequired': true},
          },
        },
      });
      await pumpEventQueue();
      expect(stream.closed, isTrue);
      expect(errors, contains(isA<HistoryResyncRequired>()));
      client.close();
    });

    test('responds to ping and reports subscription errors', () async {
      final connector = FakeRealtimeConnector();
      final errors = <Object>[];
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
        realtime: connector.call,
      );

      await client.watch(conversationId, (_) async {}, errors.add);
      final socket = connector.sockets.single;
      socket.server(<String, Object?>{'type': 'connection_ack'});
      await pumpEventQueue();
      socket.server(<String, Object?>{'type': 'ping'});
      await pumpEventQueue();
      expect(socket.sent.last, <String, Object?>{'type': 'pong'});
      socket.server(<String, Object?>{
        'type': 'error',
        'id': socket.sent.where((frame) => frame['type'] == 'subscribe').last['id'],
        'payload': <Object?>[
          <String, Object?>{
            'message': 'cursor expired',
            'extensions': <String, Object?>{
              'code': 'CURSOR_EXPIRED',
              'requestId': requestId,
              'outcome': 'rejected',
              'status': 409,
            },
          },
        ],
      });
      await pumpEventQueue();
      expect(errors.single, isA<ConvoHopProblem>().having((problem) => problem.code, 'code', 'CURSOR_EXPIRED'));
      client.close();
    });
  });

  group('reconnect policy', () {
    test('a close naming a retryable code waits for its retryAfter; other closes reconnect after backoff', () {
      fakeAsync((async) {
        final setup = _Realtime(async)..acknowledge();
        var since = setup.now;
        setup.serverClose(4429, 'RATE_LIMITED retryAfter=4');
        expect(setup.errors, <Matcher>[_problem('RATE_LIMITED', 429, retryAfter: 4)]);
        async.elapse(const Duration(seconds: 5));
        expect(setup.routedAfter(since), inInclusiveRange(4000, 4499));
        expect(setup.connector.sockets, hasLength(2));

        // A close without a code the IR lists reconnects after a second
        // plus jitter and reports nothing, whatever its close code.
        for (final (code, reason) in <(int?, String?)>[
          (null, null),
          (1006, ''),
          (1008, 'NEWLY_INVENTED retryAfter=30'),
        ]) {
          setup.acknowledge();
          since = setup.now;
          setup.serverClose(code, reason);
          async.elapse(const Duration(seconds: 2));
          expect(setup.routedAfter(since), inInclusiveRange(1000, 1499), reason: '$code $reason');
        }
        expect(setup.errors, hasLength(1));

        // Any close whose reason names a code the IR lists reports it.
        setup.acknowledge();
        since = setup.now;
        setup.serverClose(1011, 'AUTHORITY_UNAVAILABLE draining');
        expect(setup.errors.last, _problem('AUTHORITY_UNAVAILABLE', 503));
        async.elapse(const Duration(seconds: 2));
        expect(setup.routedAfter(since), inInclusiveRange(1000, 1499));
        expect((setup.stream.closed, setup.connector.sockets.length), (false, 6));

        setup.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test('quota, plan-limit and authorization closes stop the stream and report their problem', () {
      for (final (code, reason, expected) in <(int, String, Matcher)>[
        (4429, 'QUOTA_EXCEEDED retryAfter=60 meter=messages', _problem('QUOTA_EXCEEDED', 429, retryAfter: 60)),
        (4403, 'PLAN_LIMIT_EXCEEDED planLimit=participants', _problem('PLAN_LIMIT_EXCEEDED', 403)),
        (4401, '', _problem('UNAUTHENTICATED', 401)),
        (4408, 'NEWLY_INVENTED retryAfter=1', _problem('UNAUTHENTICATED', 401)),
        (4409, 'session revoked', _problem('UNAUTHENTICATED', 401)),
      ]) {
        fakeAsync((async) {
          final setup = _Realtime(async)..acknowledge();
          setup.calls.clear();
          setup.serverClose(code, reason);
          expect(setup.stream.closed, isTrue, reason: reason);
          expect(setup.errors, <Matcher>[expected]);
          async.elapse(const Duration(minutes: 2));
          expect(setup.calls, isEmpty);
          expect(setup.connector.sockets, hasLength(1));
          setup.close();
          expect(async.pendingTimers, isEmpty);
        });
      }
    });

    test('a refused upgrade reconnects after backoff unless its connector reports a problem that stops', () {
      fakeAsync((async) {
        // The default connector can't read a refused upgrade's response, so
        // a refusal is a dropped connection: reported, then retried.
        final setup = _Realtime(async, refusals: <Object>[StateError('HTTP 503')]);
        expect(setup.errors, <Matcher>[isA<StateError>()]);
        async.elapse(const Duration(seconds: 2));
        expect(setup.routed, <Object>[0, inInclusiveRange(1000, 1499)]);
        setup.acknowledge();
        expect(setup.socket.sent.last['type'], 'subscribe');

        // A connector that reads the response reports its problem, which is
        // classified like any other.
        setup.connector.refusals.add(
          ConvoHopProblem('RATE_LIMITED', requestId, 'rejected', 429, 'Slow down', retryAfter: 6),
        );
        final since = setup.now;
        setup.serverClose(1006);
        async.elapse(const Duration(seconds: 9));
        final routed = setup.routed.where((at) => at > since).toList();
        expect(
          <int>[routed.first - since, routed.last - routed.first],
          <Matcher>[inInclusiveRange(1000, 1499), inInclusiveRange(6000, 6499)],
        );
        expect(setup.errors.last, _problem('RATE_LIMITED', 429, retryAfter: 6));
        setup.acknowledge();
        expect(setup.socket.sent.last['type'], 'subscribe');

        setup.connector.refusals.add(
          ConvoHopProblem('QUOTA_EXCEEDED', requestId, 'rejected', 429, 'Quota reached', retryAfter: 60),
        );
        setup.serverClose(1006);
        async.elapse(const Duration(seconds: 2));
        expect(setup.stream.closed, isTrue);
        expect(setup.errors.last, _problem('QUOTA_EXCEEDED', 429, retryAfter: 60));
        async.elapse(const Duration(minutes: 2));
        expect((setup.connector.sockets.length, setup.errors.length), (5, 3));

        setup.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test("keeps reconnecting through gateway errors, never sooner than the route's retryAfter", () {
      fakeAsync((async) {
        final setup = _Realtime(async)..acknowledge();
        setup
          ..answer('Route', (_) => jsonResponse(gqlError('RATE_LIMITED', status: 429, retryAfter: '6'), status: 429))
          ..answer(
            'Route',
            (_) => http.Response('<html>Bad gateway</html>', 502, headers: {'content-type': 'text/html'}),
          )
          ..answer('Route', (_) => http.Response('upstream request timeout', 504));
        final since = setup.now;
        setup.serverClose(1006);
        async.elapse(const Duration(seconds: 25));
        final routed = <int>[since, ...setup.routed.where((at) => at > since)];
        expect(
          <int>[for (var i = 1; i < routed.length; i++) routed[i] - routed[i - 1]],
          <Matcher>[
            inInclusiveRange(1000, 1499),
            inInclusiveRange(6000, 6499),
            inInclusiveRange(4000, 4499),
            inInclusiveRange(8000, 8499),
          ],
        );
        expect(setup.errors, <Matcher>[
          _problem('RATE_LIMITED', 429, retryAfter: 6),
          _problem('INVALID_RESPONSE', 502),
          _problem('INVALID_RESPONSE', 504),
        ]);
        expect((setup.stream.closed, setup.connector.sockets.length), (false, 2));

        setup.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test('a WRONG_REGION problem routes again and subscribes with the new serving epoch', () {
      fakeAsync((async) {
        final setup = _Realtime(async)..acknowledge();
        setup.answer(
          'Route',
          (id) => jsonResponse(gqlEnvelope('route', id, <String, Object?>{...routeResult(), 'servingEpoch': '2'})),
        );
        final first = setup.socket, since = setup.now;
        first.server(<String, Object?>{
          'type': 'error',
          'id': setup.subscription,
          'payload': <Object?>[
            <String, Object?>{
              'message': 'Route again',
              'extensions': <String, Object?>{
                'code': 'WRONG_REGION',
                'requestId': requestId,
                'outcome': 'rejected',
                'status': 409,
              },
            },
          ],
        });
        async.flushMicrotasks();
        expect(setup.errors, <Matcher>[_problem('WRONG_REGION', 409)]);
        expect((first.closedByClient, first.closeCode), (true, 4000));
        async.elapse(const Duration(seconds: 2));
        expect(setup.routedAfter(since), inInclusiveRange(1000, 1499));
        setup.acknowledge();
        final subscribe = setup.socket.sent.last['payload']! as Map<String, Object?>;
        final context = (subscribe['variables']! as Map<String, Object?>)['context']! as Map<String, Object?>;
        expect(context['observedServingEpoch'], '2');
        expect(setup.stream.closed, isFalse);

        setup.close();
        expect(async.pendingTimers, isEmpty);
      });
    });
  });
}
