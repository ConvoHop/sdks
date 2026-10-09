/// A failure reported by the ConvoHop authority or detected by the SDK.
///
/// Classify problems by [code]. [outcome] says what is known about a
/// mutation: `rejected` (not applied), `committed` or `accepted` (applied),
/// or `unknown` (resolve the original [requestId] before trying anything
/// else). Messages never contain credentials.
class ConvoHopProblem implements Exception {
  ConvoHopProblem(this.code, this.requestId, this.outcome, this.status, this.message, {this.retryAfter, this.cause});

  final String code;

  /// The request the problem belongs to. Retry or resolve with this ID.
  final String requestId;

  final String outcome;

  /// The HTTP status, or 0 when no authority response was observed.
  final int status;

  final String message;

  /// Whole seconds to wait before resending the same request, when the
  /// authority sent a delay (for example with `RATE_LIMITED`). Read from the
  /// error's `extensions.retryAfter`, else from an HTTP `Retry-After` delay in
  /// seconds, or from a realtime close reason's `retryAfter=`. A request you
  /// send is never resent on its own; when the SDK reconnects a stream or
  /// resends a queued outbox message, it waits at least this long first.
  final int? retryAfter;

  /// The underlying failure, when there is one.
  final Object? cause;

  @override
  String toString() => 'ConvoHopProblem($code, $status, $outcome): $message';
}

/// `SCOPE_REQUIRED`: a credential lacks a scope the operation requires.
final class ScopeRequiredProblem extends ConvoHopProblem {
  ScopeRequiredProblem(String requestId, String outcome, int status, String message, {super.retryAfter, super.cause})
    : scope = _scopePattern.firstMatch(message)?.group(1),
      super('SCOPE_REQUIRED', requestId, outcome, status, message);

  static final _scopePattern = RegExp(r'^The backend key requires the current ([a-z][A-Za-z0-9]{0,63}) scope$');

  /// The missing scope, or null when the message doesn't name it.
  final String? scope;
}

/// Builds the most specific problem for an authority error code.
ConvoHopProblem authorityProblem(
  String code,
  String requestId,
  String outcome,
  int status,
  String message, {
  int? retryAfter,
}) => code == 'SCOPE_REQUIRED'
    ? ScopeRequiredProblem(requestId, outcome, status, message, retryAfter: retryAfter)
    : ConvoHopProblem(code, requestId, outcome, status, message, retryAfter: retryAfter);
