import 'dart:async';

import 'package:convohop/convohop.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/fake_time.dart';
import 'support/test_data.dart';

const _originalToken = 'fake-session-token';

/// An authority that renews the session and answers each request by its bearer.
final class _Authority {
  _Authority(this.clock);

  final Clock clock;
  final Map<String, Map<String, Object?>> sessions = <String, Map<String, Object?>>{_originalToken: session()};
  final List<(String, String?)> requests = <(String, String?)>[];
  int renewals = 0;

  /// How many session checks fail in transport before the authority answers.
  int currentSessionFailures = 0;

  /// Issues a replacement that advances the revision and extends the expiry
  /// by ten minutes.
  SessionBootstrap renew() {
    renewals += 1;
    final token = 'fake-token-$renewals';
    final expiresAt = DateTime.utc(2026, 10, 10, 12, 10).add(Duration(minutes: 10 * renewals)).toIso8601String();
    final bootstrap = sessionBootstrap(token: token, revision: '${renewals + 1}', expiresAt: expiresAt);
    sessions[token] = bootstrap['session']! as Map<String, Object?>;
    return SessionBootstrap.fromJson(bootstrap);
  }

  http.Client get httpClient => mockGraphQL((request, body) {
    final name = body['operationName']! as String;
    final authorization = request.headers['authorization'];
    requests.add((name, authorization));
    if (name == 'CommunicationCurrentSession' && currentSessionFailures > 0) {
      currentSessionFailures -= 1;
      throw http.ClientException('offline');
    }
    final variables = body['variables']! as Map<String, Object?>;
    final id = (variables['context']! as Map<String, Object?>)['requestId']! as String;
    final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
    final current = authorization == null ? null : sessions[authorization.replaceFirst('Bearer ', '')];
    if (current == null) return jsonResponse(gqlError('UNAUTHENTICATED', status: 401));
    return jsonResponse(switch (name) {
      'CommunicationCurrentSession' => gqlEnvelope('currentSession', id, current),
      'CommunicationRoute' => gqlEnvelope('route', id, <String, Object?>{
        ...routeResult(),
        'expiresAt': DateTime.fromMillisecondsSinceEpoch(clock() + 600000, isUtc: true).toIso8601String(),
      }),
      _ => okFor(name, id, input),
    });
  });

  ConvoHopClient client({SessionRefresh? refresh, RecoveryStorage? storage}) => ConvoHopClient(
    baseUrl: 'https://authority.example',
    projectId: projectId,
    principalId: principalId,
    sessionToken: _originalToken,
    incarnation: incarnation,
    recoveryStorage: storage,
    httpClient: httpClient,
    sessionRefresh: refresh ?? (_) async => renew(),
    clock: clock,
  );

  /// The authorization headers sent with [operation], in order.
  List<String?> bearers(String operation) => <String?>[
    for (final (name, authorization) in requests)
      if (name == operation) authorization,
  ];
}

TypeMatcher<ConvoHopProblem> _problem(String code) =>
    isA<ConvoHopProblem>().having((problem) => problem.code, 'code', code);

int _at(int minute, [int second = 0, int millisecond = 0]) =>
    DateTime.utc(2026, 10, 10, 12, minute, second, millisecond).millisecondsSinceEpoch;

void main() {
  group('client session refresh', () {
    test('verifies the replacement with its own token and sends later requests with it', () async {
      final authority = _Authority(fixedClock);
      final storage = MemoryRecoveryStorage();
      Session? offered;
      final client = authority.client(
        storage: storage,
        refresh: (binding) async {
          offered = binding;
          return authority.renew();
        },
      );
      await client.initialize();
      expect(client.sessionBinding?.sessionRevision, '1');

      final replacement = await client.refreshSession();
      expect(offered?.sessionRevision, '1');
      expect(replacement.sessionRevision, '2');
      expect(replacement.expiresAt, '2026-10-10T12:20:00.000Z');
      expect(client.sessionBinding?.sessionRevision, '2');
      expect(client.sessionRefreshState, SessionRefreshState.ready);
      expect(authority.bearers('CommunicationRoute'), <String>['Bearer $_originalToken', 'Bearer fake-token-1']);
      expect(authority.bearers('CommunicationCurrentSession'), <String>[
        'Bearer $_originalToken',
        'Bearer fake-token-1',
      ]);

      await client.send(conversationId, 'after refresh', requestId: requestId);
      expect(authority.bearers('CommunicationSendMessage'), <String>['Bearer fake-token-1']);
      final stored = storage.items.values.join('\n');
      expect(stored, contains(requestId));
      expect(stored, isNot(contains(_originalToken)));
      expect(stored, isNot(contains('fake-token-1')));
      client.close();
    });

    test('initialize checks the session again after a failed check', () async {
      final authority = _Authority(fixedClock)..currentSessionFailures = 1;
      final client = authority.client();
      await expectLater(client.initialize(), throwsA(_problem('TRANSPORT_UNKNOWN')));
      expect(client.sessionBinding, isNull);

      await client.initialize();
      expect(client.sessionBinding?.sessionRevision, '1');
      expect(authority.bearers('CommunicationCurrentSession'), hasLength(2));
      client.close();
    });

    test('holds requests issued during a refresh until the replacement is verified', () async {
      final authority = _Authority(fixedClock);
      final hook = Completer<SessionBootstrap>();
      final client = authority.client(refresh: (_) => hook.future);
      await client.initialize();

      final refreshing = client.refreshSession();
      expect(identical(client.refreshSession(), refreshing), isTrue);
      await pumpEventQueue();
      expect(client.sessionRefreshState, SessionRefreshState.refreshing);
      final read = client.getMessage(conversationId, messageId);
      await pumpEventQueue();
      expect(authority.bearers('CommunicationGetMessage'), isEmpty);

      hook.complete(authority.renew());
      await refreshing;
      expect((await read).messageId, messageId);
      expect(authority.bearers('CommunicationGetMessage'), <String>['Bearer fake-token-1']);
      client.close();
    });

    test('a failed hook keeps the original session when it still verifies', () async {
      final authority = _Authority(fixedClock);
      final client = authority.client(refresh: (_) async => throw Exception('backend unreachable'));
      await client.initialize();

      await expectLater(
        client.refreshSession(),
        throwsA(_problem('SESSION_REFRESH_FAILED').having((problem) => problem.outcome, 'outcome', 'unknown')),
      );
      expect(client.sessionRefreshState, SessionRefreshState.ready);
      expect(client.sessionBinding?.sessionRevision, '1');
      await client.getMessage(conversationId, messageId);
      expect(authority.bearers('CommunicationGetMessage'), <String>['Bearer $_originalToken']);
      client.close();
    });

    test('rejects a replacement for another session and keeps the original', () async {
      final authority = _Authority(fixedClock);
      final client = authority.client(
        refresh: (_) async {
          final other = <String, Object?>{
            ...session(revision: '2', expiresAt: '2026-10-10T12:20:00.000Z'),
            'sessionId': '12345678-1234-4234-8234-0000000000ab',
          };
          authority.sessions['fake-token-other'] = other;
          return SessionBootstrap.fromJson(<String, Object?>{
            'sessionToken': 'fake-token-other',
            'tokenExpiresAt': '2026-10-10T12:20:00.000Z',
            'session': other,
          });
        },
      );
      await client.initialize();

      await expectLater(client.refreshSession(), throwsA(_problem('SESSION_REFRESH_REJECTED')));
      expect(client.sessionRefreshState, SessionRefreshState.ready);
      await client.getMessage(conversationId, messageId);
      expect(authority.bearers('CommunicationGetMessage'), <String>['Bearer $_originalToken']);
      client.close();
    });

    test('blocks the client when neither the replacement nor the original verifies', () async {
      final authority = _Authority(fixedClock);
      final client = authority.client(
        refresh: (_) async {
          authority.sessions.remove(_originalToken);
          throw Exception('backend unreachable');
        },
      );
      await client.initialize();

      await expectLater(
        client.refreshSession(),
        throwsA(
          _problem(
            'SESSION_REFRESH_UNVERIFIED',
          ).having((problem) => problem.cause, 'cause', _problem('SESSION_REFRESH_FAILED')),
        ),
      );
      expect(client.sessionRefreshState, SessionRefreshState.blocked);
      final sent = authority.requests.length;
      await expectLater(
        client.getMessage(conversationId, messageId),
        throwsA(_problem('SESSION_REFRESH_REQUIRED').having((problem) => problem.status, 'status', 409)),
      );
      expect(authority.requests, hasLength(sent));
      expect(() => SessionRefresher(client), throwsStateError);
      client.close();
    });

    test('does not fall back to the original token once the authority renewed it', () async {
      final authority = _Authority(fixedClock);
      final client = authority.client(
        refresh: (_) async => SessionBootstrap.fromJson(<String, Object?>{
          ...authority.renew().toJson(),
          'tokenExpiresAt': '2026-10-10T12:19:00.000Z',
        }),
      );
      await client.initialize();

      await expectLater(
        client.refreshSession(),
        throwsA(
          _problem(
            'SESSION_REFRESH_UNVERIFIED',
          ).having((problem) => problem.cause, 'cause', _problem('SESSION_REFRESH_REJECTED')),
        ),
      );
      expect(client.sessionRefreshState, SessionRefreshState.blocked);
      expect(authority.bearers('CommunicationCurrentSession'), <String>[
        'Bearer $_originalToken',
        'Bearer fake-token-1',
      ]);
      client.close();
    });
  });

  group('SessionRefresher', () {
    test('requires an initialized refreshable client, a positive lead and time to refresh', () async {
      final authority = _Authority(fixedClock);
      final plain = clientWith(authority.httpClient);
      expect(() => SessionRefresher(plain), throwsArgumentError);
      plain.close();

      final client = authority.client();
      expect(() => SessionRefresher(client), throwsStateError);
      await client.initialize();
      expect(() => SessionRefresher(client, lead: Duration.zero), throwsArgumentError);
      client.close();

      var now = fixedClock();
      final late = _Authority(() => now);
      final expiring = late.client();
      await expiring.initialize();
      now = _at(9, 59, 500);
      expect(() => SessionRefresher(expiring, clock: () => now), throwsA(_problem('SESSION_REFRESH_REQUIRED')));
      expiring.close();
    });

    test('refreshes ahead of each expiry', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority(now);
        final client = authority.client();
        unawaited(client.initialize());
        async.flushMicrotasks();
        final errors = <Object>[];
        final refresher = SessionRefresher(client, onError: errors.add, clock: now, random: NoJitter());
        expect(refresher.active, isTrue);
        expect(refresher.nextRefresh, DateTime.utc(2026, 10, 10, 12, 5));

        async.elapse(const Duration(minutes: 4, seconds: 59));
        expect(authority.renewals, 0);
        async.elapse(const Duration(seconds: 1));
        expect(authority.renewals, 1);
        expect(client.sessionBinding?.sessionRevision, '2');
        // The replacement ends at 12:20, more than twice the lead away.
        expect(refresher.nextRefresh, DateTime.utc(2026, 10, 10, 12, 15));

        async.elapse(const Duration(minutes: 10));
        expect(authority.renewals, 2);
        expect(client.sessionBinding?.sessionRevision, '3');
        expect(errors, isEmpty);

        refresher.close();
        expect(refresher.active, isFalse);
        expect(refresher.nextRefresh, isNull);
        client.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test('backs off after a failure while the session stays valid', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority(now);
        var fail = true;
        final client = authority.client(
          refresh: (_) async {
            if (!fail) return authority.renew();
            fail = false;
            throw Exception('backend unreachable');
          },
        );
        unawaited(client.initialize());
        async.flushMicrotasks();
        final errors = <Object>[];
        final refresher = SessionRefresher(client, onError: errors.add, clock: now, random: NoJitter());

        async.elapse(const Duration(minutes: 5));
        expect(errors.single, _problem('SESSION_REFRESH_FAILED'));
        expect(refresher.active, isTrue);
        expect(client.sessionRefreshState, SessionRefreshState.ready);
        expect(refresher.nextRefresh, DateTime.utc(2026, 10, 10, 12, 5, 1));

        async.elapse(const Duration(seconds: 1));
        expect(authority.renewals, 1);
        expect(refresher.nextRefresh, DateTime.utc(2026, 10, 10, 12, 15));
        refresher.close();
        client.close();
      });
    });

    test('keeps refreshing when the error listener throws', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority(now);
        var fail = true;
        final client = authority.client(
          refresh: (_) async {
            if (!fail) return authority.renew();
            fail = false;
            throw Exception('backend unreachable');
          },
        );
        unawaited(client.initialize());
        async.flushMicrotasks();
        final errors = <Object>[];
        final refresher = SessionRefresher(
          client,
          onError: (error) {
            errors.add(error);
            throw StateError('the app handler failed');
          },
          clock: now,
          random: NoJitter(),
        );

        async.elapse(const Duration(minutes: 5));
        expect(errors.single, _problem('SESSION_REFRESH_FAILED'));
        expect(refresher.active, isTrue);
        expect(refresher.nextRefresh, DateTime.utc(2026, 10, 10, 12, 5, 1));

        async.elapse(const Duration(seconds: 1));
        expect(authority.renewals, 1);
        refresher.close();
        client.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test('stops once the session expires, inactive before it reports why', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority(now);
        final client = authority.client(refresh: (_) async => throw Exception('backend unreachable'));
        unawaited(client.initialize());
        async.flushMicrotasks();
        final reports = <(Object, bool)>[];
        late final SessionRefresher refresher;
        refresher = SessionRefresher(
          client,
          onError: (error) => reports.add((error, refresher.active)),
          clock: now,
          random: NoJitter(),
        );

        async.elapse(const Duration(minutes: 10));
        expect(reports.first.$1, _problem('SESSION_REFRESH_FAILED'));
        expect(reports.first.$2, isTrue);
        expect(reports.last.$1, _problem('SESSION_REFRESH_REQUIRED'));
        expect(reports.last.$2, isFalse);
        expect(refresher.active, isFalse);
        expect(refresher.nextRefresh, isNull);
        expect(async.pendingTimers, isEmpty);
        client.close();
      });
    });

    test('stops when the client becomes refresh-blocked', () {
      fakeAsync((async) {
        int now() => fixedClock() + async.elapsed.inMilliseconds;
        final authority = _Authority(now);
        final client = authority.client(
          refresh: (_) async {
            authority.sessions.remove(_originalToken);
            throw Exception('backend unreachable');
          },
        );
        unawaited(client.initialize());
        async.flushMicrotasks();
        final reports = <(Object, bool)>[];
        late final SessionRefresher refresher;
        refresher = SessionRefresher(
          client,
          onError: (error) => reports.add((error, refresher.active)),
          clock: now,
          random: NoJitter(),
        );

        async.elapse(const Duration(minutes: 5));
        expect(reports.single.$1, _problem('SESSION_REFRESH_UNVERIFIED'));
        expect(reports.single.$2, isFalse);
        expect(client.sessionRefreshState, SessionRefreshState.blocked);
        expect(async.pendingTimers, isEmpty);
        client.close();
      });
    });

    test('check refreshes when a timer was missed and does nothing once closed', () async {
      var now = fixedClock();
      final authority = _Authority(() => now);
      final client = authority.client();
      await client.initialize();
      final refresher = SessionRefresher(client, clock: () => now);

      await refresher.check();
      expect(authority.renewals, 0);
      now = _at(7);
      final checking = refresher.check();
      expect(identical(refresher.check(), checking), isTrue);
      await checking;
      expect(authority.renewals, 1);
      expect(refresher.nextRefresh, DateTime.utc(2026, 10, 10, 12, 15));

      refresher.close();
      now = _at(16);
      await refresher.check();
      expect(authority.renewals, 1);
      client.close();
    });
  });
}
