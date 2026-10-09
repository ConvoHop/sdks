import 'dart:async';
import 'dart:math';

import 'client.dart';
import 'problem.dart';
import 'protocol.dart';

/// Refreshes a client's session through its [SessionRefresh] before the
/// session expires, so the app doesn't schedule
/// [ConvoHopClient.refreshSession] itself.
///
/// Create it once [ConvoHopClient.initialize] verified the session. It
/// refreshes when [lead] is left before the session expires, or halfway
/// through a session that lasts less than twice [lead], and again before
/// each replacement expires. After a failure that left the client usable,
/// it tries again with backoff while the session is still valid.
///
/// It stops for good once the session can't be refreshed any more: the
/// session expired, or neither the replacement nor the original session
/// could be verified. [active] is false by the time the error listener
/// receives the failure that stopped it. Then retire the client and
/// bootstrap a new one. Errors the listener throws are ignored.
///
/// Timers don't fire while the app is suspended, so call [check] when the
/// app returns to the foreground. Close the refresher before the client.
final class SessionRefresher {
  /// Throws a `SESSION_REFRESH_REQUIRED` [ConvoHopProblem] when the session
  /// expires within a second.
  SessionRefresher(
    this.client, {
    this.lead = const Duration(minutes: 5),
    ErrorListener? onError,
    Clock clock = systemClock,
    Random? random,
  }) : _onError = onError,
       _clock = clock,
       _random = random ?? Random() {
    if (lead <= Duration.zero) throw ArgumentError.value(lead, 'lead', 'Expected a positive duration');
    if (client.sessionRefreshState == SessionRefreshState.disabled) {
      throw ArgumentError.value(client, 'client', 'Expected a client with sessionRefresh configured');
    }
    final binding = client.sessionBinding;
    if (binding == null) throw StateError('Initialize the client before refreshing its session');
    if (client.sessionRefreshState == SessionRefreshState.blocked) {
      throw StateError('The client is refresh-blocked; bootstrap a new one');
    }
    if (sessionExpiry(binding) - _margin <= _clock()) throw _expired();
    _arm();
  }

  static const int _firstBackoff = 2000;
  static const int _maxBackoff = 60000;

  /// Refreshing gives up this close to expiry.
  static const int _margin = 1000;

  final ConvoHopClient client;

  /// How long before the session expires it refreshes.
  final Duration lead;
  final ErrorListener? _onError;
  final Clock _clock;
  final Random _random;
  Timer? _timer;
  Future<void>? _running;
  String? _revision;
  int _seenAt = 0;
  int _failures = 0;
  int? _retryAt;
  int? _due;
  bool _stopped = false;
  bool _closed = false;

  /// Whether it still keeps the session fresh.
  bool get active => !_stopped && !_closed;

  /// When it refreshes next, in UTC, while [active].
  DateTime? get nextRefresh {
    final due = _due;
    return active && due != null ? DateTime.fromMillisecondsSinceEpoch(due, isUtc: true) : null;
  }

  /// Refreshes now when it's due, for example when the app returns to the
  /// foreground after missing a timer, and otherwise waits again. Failures
  /// go to the error listener.
  Future<void> check() {
    if (!active) return Future<void>.value();
    return _running ??= _check().whenComplete(() => _running = null);
  }

  /// Stops refreshing. A refresh in flight still completes.
  void close() {
    _closed = true;
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _check() async {
    final (due, _) = _plan();
    if (due == null || due > _clock()) {
      _arm();
      return;
    }
    Object? failure;
    try {
      await client.refreshSession();
      _failures = 0;
      _retryAt = null;
    } on Object catch (error) {
      _failures++;
      final backoff = min(_maxBackoff, _firstBackoff << min(_failures - 1, 5));
      _retryAt = _clock() + backoff ~/ 2 + _random.nextInt(backoff ~/ 2 + 1);
      failure = error;
    }
    _arm(failure);
  }

  void _arm([Object? failure]) {
    _timer?.cancel();
    _timer = null;
    final (due, reason) = _plan();
    if (due == null) _stopped = true;
    if (failure != null) _report(failure);
    if (reason != null) _report(reason);
    if (due != null) {
      _timer = Timer(Duration(milliseconds: max(0, due - _clock())), () => unawaited(check()));
    }
  }

  /// When to refresh the current session, or null with the reason to report
  /// once it can't be.
  (int?, Object?) _plan() {
    _due = null;
    if (!active) return (null, null);
    final binding = client.sessionBinding;
    if (binding == null || client.sessionRefreshState == SessionRefreshState.blocked) return (null, null);
    final now = _clock(), expiry = sessionExpiry(binding), latest = expiry - _margin;
    if (now >= latest) return (null, _expired());
    if (binding.sessionRevision != _revision) {
      _revision = binding.sessionRevision;
      _seenAt = now;
      _failures = 0;
      _retryAt = null;
    }
    var due = expiry - min<int>(lead.inMilliseconds, max(0, expiry - _seenAt) ~/ 2);
    final retryAt = _retryAt;
    if (retryAt != null && retryAt > due) due = retryAt;
    return (_due = min(due, latest), null);
  }

  static ConvoHopProblem _expired() => ConvoHopProblem(
    'SESSION_REFRESH_REQUIRED',
    newRequestId(),
    'rejected',
    409,
    'The session expires before it can be refreshed; bootstrap a new client',
  );

  void _report(Object error) {
    final listener = _onError;
    if (listener == null || _closed) return;
    try {
      listener(error);
    } on Object {
      // The app's own handler failed: keep refreshing.
    }
  }
}
