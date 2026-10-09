import 'dart:async';

import 'client.dart';
import 'problem.dart';
import 'protocol.dart';

/// Sends this user's typing signals for one conversation.
///
/// Call [keystroke] as the user edits the draft and [stop] when they send or
/// clear it. While typing, it signals at most once per [throttle], and it
/// stops by itself after [idle] without a keystroke. Each signal is a single
/// attempt that's never retried, because a late typing signal is worse than
/// none, and at most one waits behind the one in flight.
///
/// Signals are outbound only: the authority doesn't deliver other members'
/// typing to clients, so there's nothing to subscribe to.
final class TypingIndicator {
  TypingIndicator(
    this.client,
    this.conversationId, {
    this.throttle = const Duration(seconds: 3),
    this.idle = const Duration(seconds: 5),
    ErrorListener? onError,
    Clock clock = systemClock,
  }) : _onError = onError,
       _clock = clock {
    if (!isId(conversationId)) {
      throw ArgumentError.value(conversationId, 'conversationId', 'Expected a canonical nonzero UUID');
    }
    if (throttle <= Duration.zero || idle <= Duration.zero) {
      throw ArgumentError('Expected positive throttle and idle durations');
    }
  }

  final ConvoHopClient client;
  final String conversationId;

  /// The shortest time between two signals while the user keeps typing.
  final Duration throttle;

  /// How long after the last keystroke typing stops by itself.
  final Duration idle;
  final ErrorListener? _onError;
  final Clock _clock;
  Timer? _idleTimer;
  bool _typing = false;
  bool _supported = true;
  bool _closed = false;
  int? _lastSent;
  Future<void>? _sending;
  bool? _queued;

  /// Whether this user is typing, as last signalled.
  bool get typing => _typing;

  /// False once the authority said it doesn't support typing signals. They
  /// stop then.
  bool get supported => _supported;

  /// Notes a keystroke, and signals typing unless it did within [throttle].
  void keystroke() {
    if (_closed || !_supported) return;
    _idleTimer?.cancel();
    _idleTimer = Timer(idle, stop);
    final now = _clock();
    final last = _lastSent;
    if (_typing && last != null && now - last < throttle.inMilliseconds) return;
    _typing = true;
    _lastSent = now;
    _signal(true);
  }

  /// Signals that this user stopped typing, if they were.
  void stop() {
    _idleTimer?.cancel();
    _idleTimer = null;
    if (!_typing) return;
    _typing = false;
    _lastSent = null;
    if (_supported) _signal(false);
  }

  /// Signals a stop if needed, then waits for signals in flight.
  Future<void> close() async {
    if (_closed) return;
    stop();
    _closed = true;
    while (_sending != null) {
      await _sending;
    }
  }

  void _signal(bool isTyping) {
    if (_sending != null) {
      _queued = isTyping;
      return;
    }
    _sending = _send(isTyping);
  }

  Future<void> _send(bool isTyping) async {
    bool? next = isTyping;
    while (next != null) {
      final value = next;
      next = null;
      try {
        await client.sendTyping(conversationId, isTyping: value);
      } on ConvoHopProblem catch (problem) {
        if (problem.code == 'FEATURE_UNSUPPORTED') {
          _supported = false;
          _typing = false;
          _idleTimer?.cancel();
          _idleTimer = null;
          _queued = null;
        }
        _report(problem);
      } on Object catch (error) {
        _report(error);
      }
      next = _queued;
      _queued = null;
    }
    _sending = null;
  }

  void _report(Object error) {
    final listener = _onError;
    if (listener == null) return;
    try {
      listener(error);
    } on Object {
      // The app's own handler failed: keep signalling.
    }
  }
}
