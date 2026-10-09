import 'dart:math';

import 'generated/generated.dart';
import 'problem.dart';
import 'protocol.dart';

/// Codes that clear once the session is renewed.
const sessionCodes = {
  'UNAUTHENTICATED',
  'SESSION_REFRESH_REQUIRED',
  'SESSION_REFRESH_REJECTED',
  'SESSION_REFRESH_UNVERIFIED',
  'SESSION_REFRESH_FAILED',
  'CREDENTIAL_REFRESH_REQUIRED',
};

/// The longest timer delay in milliseconds that every platform honors; a
/// longer wait, such as a huge `retryAfter`, waits this long and then checks
/// again.
const maxTimerDelayMs = 2147483647;

final _retryAfterPattern = RegExp(r'^[0-9]{1,10}$');
final _events = realtimeChannels['conversationEvents']!;

/// Whole-second retry delay from `extensions.retryAfter`, an HTTP
/// `Retry-After` delta or a realtime close reason's `retryAfter=`; anything
/// else is ignored.
int? retryDelay(Object? value) {
  if (value is String && _retryAfterPattern.hasMatch(value)) value = int.parse(value);
  if (value is double && value.isFinite && value == value.truncateToDouble()) value = value.toInt();
  return value is int && value >= 0 && value <= maxSafeInteger ? value : null;
}

/// Whether a later attempt of a request may still succeed after a problem
/// with [code]. The IR says so for each code it lists; `WRONG_REGION`
/// succeeds once the client routes again. A code the IR doesn't list counts
/// as retryable.
bool retryableCode(String code) => code == 'WRONG_REGION' || errorCodes[code]?.retryable != false;

/// After a failure: try again, route again and then try, or stop and report
/// the problem.
enum ReconnectAction { retry, reroute, stop }

/// Classifies a failure of initialization, the realtime stream or a queued
/// send. Only a problem whose code is retryable and whose status is 0 (no
/// response), 408, 429 or 5xx is retried; `WRONG_REGION` routes again first.
/// Anything else stops: `QUOTA_EXCEEDED`, `PLAN_LIMIT_EXCEEDED`,
/// authentication and scope problems, and errors that aren't a
/// [ConvoHopProblem].
ReconnectAction reconnectAction(Object error) {
  if (error is! ConvoHopProblem) return ReconnectAction.stop;
  if (error.code == 'WRONG_REGION') return ReconnectAction.reroute;
  if (!retryableCode(error.code)) return ReconnectAction.stop;
  final status = error.status;
  return status == 0 || status == 408 || status == 429 || (status >= 500 && status <= 599)
      ? ReconnectAction.retry
      : ReconnectAction.stop;
}

/// The wait in milliseconds before reconnection attempt [attempt], counted
/// from 0: 1 s doubling to at most 10 s, never less than the authority's
/// [retryAfter] seconds, plus up to 0.5 s of jitter.
int reconnectDelay(int attempt, int? retryAfter, Random random) {
  var backoff = _events.baseDelayMs;
  for (var doubled = 0; doubled < attempt && backoff < _events.maxDelayMs; doubled++) {
    backoff *= 2;
  }
  final floor = max(min(backoff, _events.maxDelayMs), (retryAfter ?? 0) * 1000);
  return min(floor + (_events.jitterMs > 0 ? random.nextInt(_events.jitterMs) : 0), maxTimerDelayMs);
}

/// The problem a realtime close reports, if any.
///
/// A reason that starts with an error code the IR lists, such as
/// `QUOTA_EXCEEDED retryAfter=60 meter=messages`, reports that code with its
/// `retryAfter=` seconds, whatever the close code. Otherwise a close code
/// that ends realtime authorization reports `UNAUTHENTICATED`, and any other
/// close reports nothing, so the stream reconnects.
ConvoHopProblem? closeProblem(int code, String reason, String requestId) {
  final words = reason.trim().split(RegExp(r'\s+'));
  final name = words.first;
  final known = errorCodes[name];
  if (known != null) {
    final retryAfter = words.where((word) => word.startsWith('retryAfter=')).firstOrNull;
    return authorityProblem(
      name,
      requestId,
      'rejected',
      known.status ?? (code >= 4000 && code <= 4999 ? code - 4000 : 0),
      'Realtime connection closed: ${words.join(' ')}',
      retryAfter: retryDelay(retryAfter?.substring('retryAfter='.length)),
    );
  }
  if (_events.terminalCloseCodes.contains(code)) {
    return ConvoHopProblem(
      'UNAUTHENTICATED',
      requestId,
      'rejected',
      401,
      'Realtime authorization ended; obtain a current session',
    );
  }
  return null;
}

/// Backoff in milliseconds before the next try after [failures] failures in a
/// row: one second, doubling to 30 seconds, plus up to a fifth of jitter.
int backoffDelay(int failures, int jitter) {
  final base = 1000 << (failures < 1 ? 0 : (failures > 5 ? 5 : failures - 1));
  final capped = base > 30000 ? 30000 : base;
  return capped + jitter % (capped ~/ 5 + 1);
}
