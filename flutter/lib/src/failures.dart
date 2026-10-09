import 'generated/generated.dart';
import 'problem.dart';

/// Codes that clear once the session or route is renewed.
const waitingCodes = {
  'UNAUTHENTICATED',
  'SESSION_REFRESH_REQUIRED',
  'SESSION_REFRESH_REJECTED',
  'SESSION_REFRESH_UNVERIFIED',
  'SESSION_REFRESH_FAILED',
  'CREDENTIAL_REFRESH_REQUIRED',
  'WRONG_REGION',
};

/// Whether [error] can clear by itself, so the same work may succeed later.
bool isTransient(Object error) =>
    error is ConvoHopProblem &&
    (error.code == 'TRANSPORT_UNKNOWN' ||
        const {0, 429, 503}.contains(error.status) ||
        (errorCodes[error.code]?.retryable ?? false) ||
        waitingCodes.contains(error.code));

/// Backoff in milliseconds before the next try after [failures] failures in a
/// row: one second, doubling to 30 seconds, plus up to a fifth of jitter.
int backoffDelay(int failures, int jitter) {
  final base = 1000 << (failures < 1 ? 0 : (failures > 5 ? 5 : failures - 1));
  final capped = base > 30000 ? 30000 : base;
  return capped + jitter % (capped ~/ 5 + 1);
}
