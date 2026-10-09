import 'dart:async';
import 'dart:math';

import 'package:convohop/convohop.dart';
import 'package:convohop/src/failures.dart';
import 'package:convohop/src/protocol.dart' show maxSafeInteger;
import 'package:flutter_test/flutter_test.dart';

import 'support/fake_time.dart';
import 'support/test_data.dart';

/// Randomness at its upper bound, so jitter is as long as it gets.
final class _MaxJitter implements Random {
  @override
  int nextInt(int max) => max - 1;

  @override
  double nextDouble() => 1;

  @override
  bool nextBool() => true;
}

ConvoHopProblem _problem(String code, int status, {int? retryAfter}) =>
    ConvoHopProblem(code, requestId, 'rejected', status, code, retryAfter: retryAfter);

void main() {
  group('reconnectAction', () {
    test('routes again after WRONG_REGION, whatever its status', () {
      for (final status in <int>[409, 0, 503]) {
        expect(reconnectAction(_problem('WRONG_REGION', status)), ReconnectAction.reroute, reason: '$status');
      }
    });

    test('retries a retryable code after no response, a timeout, rate limiting or a server error', () {
      final cases = <(String, int)>[
        ('TRANSPORT_UNKNOWN', 0),
        ('HTTP_FAILURE', 408),
        ('RATE_LIMITED', 429),
        ('ADMISSION_LIMIT', 429),
        ('HTTP_FAILURE', 500),
        ('INVALID_RESPONSE', 502),
        ('AUTHORITY_UNAVAILABLE', 503),
        ('INVALID_RESPONSE', 504),
        ('RETRY_EXHAUSTED', 599),
        // A code the IR doesn't list counts as retryable.
        ('SOME_FUTURE_CODE', 503),
      ];
      for (final (code, status) in cases) {
        expect(reconnectAction(_problem(code, status)), ReconnectAction.retry, reason: '$code $status');
      }
    });

    test('stops on codes the IR marks final, other statuses and failures that are not problems', () {
      final cases = <(String, int)>[
        ('QUOTA_EXCEEDED', 429),
        ('PLAN_LIMIT_EXCEEDED', 403),
        ('UNAUTHENTICATED', 401),
        ('FORBIDDEN', 403),
        ('RECOVERY_LIMIT', 409),
        ('BILLING_NOT_CONFIGURED', 503),
        ('INCARNATION_MISMATCH', 409),
        ('SOME_FUTURE_CODE', 400),
        ('HTTP_FAILURE', 404),
        ('HTTP_FAILURE', 499),
        ('RATE_LIMITED', 600),
      ];
      for (final (code, status) in cases) {
        expect(reconnectAction(_problem(code, status)), ReconnectAction.stop, reason: '$code $status');
      }
      final others = <Object>[
        ScopeRequiredProblem(requestId, 'rejected', 403, 'The backend key requires the current admin scope'),
        StateError('Realtime connection unavailable'),
        const FormatException('Expected a text frame'),
        TimeoutException('slow'),
      ];
      for (final error in others) {
        expect(reconnectAction(error), ReconnectAction.stop, reason: '$error');
      }
    });

    test('retryableCode follows the IR, routes WRONG_REGION again and keeps unknown codes', () {
      expect(retryableCode('WRONG_REGION'), isTrue);
      expect(retryableCode('RATE_LIMITED'), isTrue);
      expect(retryableCode('SOME_FUTURE_CODE'), isTrue);
      expect(retryableCode('QUOTA_EXCEEDED'), isFalse);
      expect(retryableCode('REVISION_CONFLICT'), isFalse);
      expect(retryableCode('RECOVERY_LIMIT'), isFalse);
    });
  });

  group('closeProblem', () {
    Matcher problem(String code, int status, {int? retryAfter}) => isA<ConvoHopProblem>()
        .having((problem) => problem.code, 'code', code)
        .having((problem) => problem.status, 'status', status)
        .having((problem) => problem.outcome, 'outcome', 'rejected')
        .having((problem) => problem.requestId, 'requestId', requestId)
        .having((problem) => problem.retryAfter, 'retryAfter', retryAfter);

    test('reports the code a reason names, with its retryAfter, and classifies it', () {
      final rateLimited = closeProblem(4429, 'RATE_LIMITED retryAfter=4', requestId);
      expect(rateLimited, problem('RATE_LIMITED', 429, retryAfter: 4));
      expect(rateLimited!.message, 'Realtime connection closed: RATE_LIMITED retryAfter=4');
      expect(reconnectAction(rateLimited), ReconnectAction.retry);

      final quota = closeProblem(4429, 'QUOTA_EXCEEDED retryAfter=60 meter=messages', requestId);
      expect(quota, problem('QUOTA_EXCEEDED', 429, retryAfter: 60));
      expect(reconnectAction(quota!), ReconnectAction.stop);

      // A terminal close code doesn't hide the code its reason names.
      final plan = closeProblem(4403, 'PLAN_LIMIT_EXCEEDED planLimit=liveSessions', requestId);
      expect(plan, problem('PLAN_LIMIT_EXCEEDED', 403));
      expect(reconnectAction(plan!), ReconnectAction.stop);
      expect(closeProblem(4401, 'RATE_LIMITED retryAfter=2', requestId), problem('RATE_LIMITED', 429, retryAfter: 2));

      expect(closeProblem(4403, 'SCOPE_REQUIRED', requestId), isA<ScopeRequiredProblem>());
    });

    test('takes a code without an IR status from the close code', () {
      expect(closeProblem(4400, 'FEATURE_UNSUPPORTED', requestId), problem('FEATURE_UNSUPPORTED', 400));
      expect(closeProblem(1011, 'FEATURE_UNSUPPORTED', requestId), problem('FEATURE_UNSUPPORTED', 0));
    });

    test('ends authorization on terminal close codes whose reason names no code', () {
      for (final code in <int>[4400, 4401, 4403, 4408, 4409]) {
        for (final reason in <String>['', 'Forbidden', 'rate_limited retryAfter=4']) {
          expect(closeProblem(code, reason, requestId), problem('UNAUTHENTICATED', 401), reason: '$code $reason');
        }
      }
    });

    test('reports nothing for other closes, so the stream reconnects', () {
      for (final (code, reason) in <(int, String)>[
        (1000, ''),
        (1006, ''),
        (4000, 'Retrying authoritative connection'),
        (4429, 'Too many requests'),
        (0, ''),
      ]) {
        expect(closeProblem(code, reason, requestId), isNull, reason: '$code $reason');
      }
    });

    test('ignores a retryAfter that is not whole seconds and trims the reason', () {
      for (final reason in <String>[
        'RATE_LIMITED retryAfter=1.5',
        'RATE_LIMITED retryAfter=abc',
        'RATE_LIMITED retryAfter=',
        'RATE_LIMITED retryAfter=-1',
        'RATE_LIMITED retryAfter=12345678901',
      ]) {
        expect(closeProblem(4429, reason, requestId), problem('RATE_LIMITED', 429), reason: reason);
      }
      final padded = closeProblem(4429, '  RATE_LIMITED   retryAfter=4 ', requestId);
      expect(padded, problem('RATE_LIMITED', 429, retryAfter: 4));
      expect(padded!.message, 'Realtime connection closed: RATE_LIMITED retryAfter=4');
    });
  });

  group('delays', () {
    test('reconnectDelay doubles from 1 s to 10 s and adds up to 0.5 s of jitter', () {
      expect(
        <int>[for (var attempt = 0; attempt < 7; attempt++) reconnectDelay(attempt, null, NoJitter())],
        <int>[1000, 2000, 4000, 8000, 10000, 10000, 10000],
      );
      expect(reconnectDelay(100, null, NoJitter()), 10000);
      expect(reconnectDelay(0, null, _MaxJitter()), 1499);
      expect(reconnectDelay(4, null, _MaxJitter()), 10499);
    });

    test('reconnectDelay never undercuts retryAfter and fits a timer', () {
      expect(reconnectDelay(0, 4, NoJitter()), 4000);
      expect(reconnectDelay(0, 4, _MaxJitter()), 4499);
      expect(reconnectDelay(4, 4, NoJitter()), 10000);
      expect(reconnectDelay(0, 60, NoJitter()), 60000);
      expect(reconnectDelay(0, 0, NoJitter()), 1000);
      expect(reconnectDelay(0, maxSafeInteger, _MaxJitter()), maxTimerDelayMs);
    });

    test('retryDelay accepts only whole non-negative seconds', () {
      for (final value in <Object>['6', 6, 6.0]) {
        expect(retryDelay(value), 6, reason: '$value (${value.runtimeType})');
      }
      expect(retryDelay('0'), 0);
      expect(retryDelay('9999999999'), 9999999999);
      expect(retryDelay(maxSafeInteger), maxSafeInteger);
      for (final value in <Object?>[
        null,
        true,
        1.5,
        '1.5',
        double.infinity,
        double.nan,
        'Wed, 21 Oct 2026 07:28:00 GMT',
        -1,
        '-1',
        ' 6',
        '12345678901',
        maxSafeInteger + 1,
      ]) {
        expect(retryDelay(value), isNull, reason: '$value');
      }
    });
  });
}
