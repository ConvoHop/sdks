import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'client.dart';
import 'failures.dart';
import 'generated/generated.dart';
import 'problem.dart';
import 'protocol.dart';
import 'storage.dart';
import 'transport.dart';

/// Where a message in the [ConvoHopOutbox] is.
enum OutboxState {
  /// Waiting for its turn, the network or a backoff.
  queued,

  /// An attempt is in flight.
  sending,

  /// The authority committed it. [OutboxItem.ack] has its sequence when the
  /// authority still reported one.
  sent,

  /// The authority rejected it, and no attempt is in doubt, so it wasn't
  /// committed. [ConvoHopOutbox.resend] sends the text as a new message.
  failed,

  /// An attempt reached the authority without an answer, and the retry budget
  /// is spent, so it may or may not be committed. [ConvoHopOutbox.resolve]
  /// asks again. Resending it as a new message can duplicate it.
  unknown,
}

/// One message the user sent, as the outbox knows it.
final class OutboxItem {
  const OutboxItem._({
    required this.requestId,
    required this.conversationId,
    required this.text,
    required this.props,
    required this.createdAt,
    required this.state,
    required this.attempts,
    required this.uncertain,
    this.ack,
    this.errorCode,
    this.error,
    this.nextAttemptAt,
  });

  /// The send's request ID. Every attempt reuses it, so it also identifies
  /// the optimistic message on this device.
  final String requestId;
  final String conversationId;
  final String text;
  final Map<String, Object?> props;

  /// When the user sent it, in milliseconds since the epoch by this device's
  /// clock.
  final int createdAt;
  final OutboxState state;

  /// Submissions so far. Read-only checks don't count.
  final int attempts;

  /// Whether an attempt may have reached the authority without an answer.
  final bool uncertain;

  /// The receipt, once [OutboxState.sent], when the authority returned one.
  final MessageAck? ack;

  /// The last failure's code, such as `RATE_LIMITED`.
  final String? errorCode;

  /// The last failure. It isn't kept across restarts.
  final Object? error;

  /// When a queued item's next attempt is due, in milliseconds since the
  /// epoch, while it backs off.
  final int? nextAttemptAt;

  @override
  String toString() => 'OutboxItem($requestId, ${state.name})';
}

final class _Entry {
  _Entry({
    required this.requestId,
    required this.conversationId,
    required this.text,
    required this.props,
    required this.createdAt,
    this.state = OutboxState.queued,
    this.attempted = false,
    this.uncertain = false,
    this.attempts = 0,
    this.errorCode,
  });

  factory _Entry.restore(Object? value) {
    final map = parseObject(value);
    const fields = {
      'requestId',
      'conversationId',
      'text',
      'props',
      'createdAt',
      'state',
      'attempted',
      'uncertain',
      'attempts',
      'errorCode',
    };
    if (map.keys.any((key) => !fields.contains(key))) throw const FormatException('Unknown outbox field');
    final createdAt = map['createdAt'], attempts = map['attempts'];
    if (createdAt is! int || createdAt < 0 || createdAt > maxSafeInteger || attempts is! int || attempts < 0) {
      throw const FormatException('Invalid outbox counters');
    }
    final errorCode = switch (map['errorCode']) {
      null => null,
      final String code => code,
      _ => throw const FormatException('Invalid outbox error code'),
    };
    final saved = switch (map['state']) {
      'queued' => OutboxState.queued,
      'sending' => OutboxState.sending,
      'failed' => OutboxState.failed,
      'unknown' => OutboxState.unknown,
      _ => throw const FormatException('Invalid outbox state'),
    };
    final attempted = parseBool(map['attempted']);
    return _Entry(
      requestId: parseId(map['requestId']),
      conversationId: parseId(map['conversationId']),
      text: parseString(map['text']),
      props: parseObject(copyJson(map['props'])),
      createdAt: createdAt,
      // An attempt that was in flight when the app stopped is retried after a read-only check.
      state: saved == OutboxState.sending ? OutboxState.queued : saved,
      attempted: attempted,
      uncertain: parseBool(map['uncertain']) || (saved == OutboxState.sending && attempted),
      attempts: attempts,
      errorCode: errorCode,
    );
  }

  final String requestId;
  final String conversationId;
  final String text;
  final Map<String, Object?> props;
  final int createdAt;
  OutboxState state;

  /// A submission may have started, so later attempts check read-only first.
  bool attempted;
  bool uncertain;
  int attempts;
  MessageAck? ack;
  String? errorCode;
  Object? error;
  int nextAttemptAt = 0;
  int failures = 0;

  OutboxItem get item => OutboxItem._(
    requestId: requestId,
    conversationId: conversationId,
    text: text,
    props: props,
    createdAt: createdAt,
    state: state,
    attempts: attempts,
    uncertain: uncertain,
    ack: ack,
    errorCode: errorCode,
    error: error,
    nextAttemptAt: state == OutboxState.queued && nextAttemptAt > 0 ? nextAttemptAt : null,
  );

  Map<String, Object?> toJson() => <String, Object?>{
    'requestId': requestId,
    'conversationId': conversationId,
    'text': text,
    'props': props,
    'createdAt': createdAt,
    'state': state.name,
    'attempted': attempted,
    'uncertain': uncertain,
    'attempts': attempts,
    'errorCode': ?errorCode,
  };
}

final class _Delivered {
  const _Delivered(this.ack);

  final MessageAck? ack;
}

const _settled = {'committed', 'accepted'};

// Raised before a request leaves the device, or when its budget is spent.
const _unsentCodes = {'RESOLUTION_REQUIRED', 'INCARNATION_MISMATCH', 'IDEMPOTENCY_CONFLICT'};

// Rejections that don't refuse the message: it waits for the session to be
// renewed, or for room in the recovery journal.
const _waitingCodes = {...sessionCodes, 'RECOVERY_LIMIT'};

/// Sends messages in the background so the UI can show them at once
/// (optimistic sends), in order within each conversation, across lost
/// connectivity and app restarts.
///
/// Each message keeps one request ID for life. The outbox resends it only
/// within the transport's original three-attempt, 60-second budget, and only
/// after a read-only check found that no earlier attempt was committed. It
/// never invents a new request ID on its own: [resend] does that when the
/// user asks.
///
/// While the authority is unreachable, it checks read-only before a
/// message's first submission, so waiting offline doesn't spend the budget.
/// Call [flush] when connectivity returns.
///
/// A message stays queued, and is tried again after a backoff that is never
/// shorter than the authority's [ConvoHopProblem.retryAfter], after an
/// unknown outcome, a rejection the realtime stream would also retry (such as
/// `RATE_LIMITED`), `WRONG_REGION`, after which the client routes again
/// first, `RECOVERY_LIMIT` and an ended session. Any other rejection, such as
/// `QUOTA_EXCEEDED` or `PLAN_LIMIT_EXCEEDED`, fails it at once. Until a
/// message is sent or fails, its recovery record is never evicted.
///
/// With [ConvoHopClient.storage] set and [persist] on, unsent messages,
/// including their text, are stored under
/// `convohop.outbox:<project>:<principal>` until sent or discarded.
final class ConvoHopOutbox {
  ConvoHopOutbox(this.client, {ErrorListener? onError, bool persist = true, Clock clock = systemClock, Random? random})
    : _onError = onError,
      _storage = persist ? client.storage : null,
      _clock = clock,
      _random = random ?? Random() {
    _unretain = retainRecovery(client.transport, () sync* {
      for (final entry in _entries) {
        if (entry.state != OutboxState.sent && entry.state != OutboxState.failed) yield entry.requestId;
      }
    });
  }

  /// Unsent messages the outbox holds at most. Sending more throws a
  /// [StateError] until some are sent, resent or discarded.
  static const int maxItems = 100;

  static const int _firstDelay = 1000;
  static const int _maxDelay = 30000;

  final ConvoHopClient client;
  final ErrorListener? _onError;
  final RecoveryStorage? _storage;
  final Clock _clock;
  final Random _random;
  late final void Function() _unretain;
  final List<_Entry> _entries = <_Entry>[];
  final StreamController<OutboxItem> _changes = StreamController<OutboxItem>.broadcast();
  Future<void>? _initialization;
  bool _ready = false;
  bool _closed = false;
  Future<void>? _running;
  bool _again = false;
  Timer? _timer;
  Future<void>? _writes;
  Future<void>? _closing;
  bool _reachable = false;
  int _offlineFailures = 0;
  int _offlineUntil = 0;

  String get _key => 'convohop.outbox:${client.projectId}:${client.principalId}';

  /// Every change to an item, including a sent or discarded item after the
  /// outbox drops it. [items] has the current list.
  Stream<OutboxItem> get changes => _changes.stream;

  /// Unsent messages, in the order the user sent them.
  List<OutboxItem> get items => <OutboxItem>[for (final entry in _entries) entry.item];

  /// [conversationId]'s unsent messages, in the order the user sent them.
  List<OutboxItem> itemsFor(String conversationId) => <OutboxItem>[
    for (final entry in _entries)
      if (entry.conversationId == conversationId) entry.item,
  ];

  /// Whether the last attempt to reach the authority failed without a
  /// response.
  bool get offline => _offlineFailures > 0;

  /// Loads stored messages and starts sending. [send] awaits it too.
  Future<void> initialize() => _initialization ??= _load();

  Future<void> _load() async {
    await client.transport.initializeRecovery();
    final saved = await _storage?.getItem(_key);
    if (saved != null) {
      final Object? values;
      try {
        values = jsonDecode(saved);
      } on FormatException {
        throw const FormatException('Invalid outbox storage');
      }
      if (values is! List || values.length > maxItems) throw const FormatException('Invalid outbox storage');
      final ids = <String>{};
      for (final value in values) {
        final _Entry entry;
        try {
          entry = _Entry.restore(value);
        } on FormatException {
          throw const FormatException('Invalid outbox storage');
        }
        if (!ids.add(entry.requestId)) throw const FormatException('Duplicate outbox request ID');
        _entries.add(entry);
      }
    }
    _ready = true;
    _wake();
  }

  /// Queues [text] for [conversationId] and returns the queued item at once.
  /// It is stored before this returns.
  Future<OutboxItem> send(String conversationId, String text, {Map<String, Object?> props = const {}}) async {
    if (!isId(conversationId)) {
      throw ArgumentError.value(conversationId, 'conversationId', 'Expected a canonical nonzero UUID');
    }
    final Map<String, Object?> copy;
    try {
      copy = parseObject(jsonDecode(jsonEncode(props)));
    } on Object {
      throw ArgumentError.value(props, 'props', 'Expected JSON properties');
    }
    await initialize();
    return _enqueue(conversationId, text, copy);
  }

  Future<OutboxItem> _enqueue(String conversationId, String text, Map<String, Object?> props) async {
    _checkOpen();
    final unsent = _entries.where((entry) => entry.state != OutboxState.sent).length;
    if (unsent >= maxItems) throw StateError('The outbox is full; resend or discard failed messages first');
    final entry = _Entry(
      requestId: newRequestId(),
      conversationId: conversationId,
      text: text,
      props: props,
      createdAt: _clock(),
    );
    _entries.add(entry);
    try {
      await _save();
    } on Object {
      _entries.remove(entry);
      rethrow;
    }
    _emit(entry);
    _wake();
    return entry.item;
  }

  /// Retries every queued message now, for example when connectivity
  /// returns, and checks read-only whether [OutboxState.unknown] messages
  /// were committed.
  void flush() {
    if (_closed || !_ready) return;
    _offlineUntil = 0;
    for (final entry in _entries) {
      if (entry.state == OutboxState.queued) entry.nextAttemptAt = 0;
    }
    for (final entry in _entries.toList()) {
      if (entry.state == OutboxState.unknown) unawaited(_check(entry).catchError(_reportReachable));
    }
    _wake();
  }

  /// Asks the authority, read-only, whether [requestId]'s
  /// [OutboxState.unknown] or [OutboxState.failed] message was committed.
  Future<OutboxItem> resolve(String requestId) async {
    await initialize();
    final entry = _find(requestId);
    if (entry.state != OutboxState.unknown && entry.state != OutboxState.failed) return entry.item;
    await _check(entry);
    return entry.item;
  }

  Future<void> _check(_Entry entry) async {
    final RequestResolution resolution;
    try {
      resolution = await client.requests.resolve(entry.requestId);
    } on ConvoHopProblem catch (problem) {
      if (problem.code == 'TRANSPORT_UNKNOWN') _unreachable();
      rethrow;
    }
    _reached();
    if (_closed || !_entries.contains(entry) || !_settled.contains(resolution.state)) return;
    _sent(entry, _ackFrom(entry, resolution));
    await _finish(entry);
  }

  /// Sends a [OutboxState.failed] or [OutboxState.unknown] message again as
  /// a new message with a new request ID, at the end of its conversation's
  /// queue. Resending an unknown message can duplicate it; ask the user
  /// first.
  Future<OutboxItem> resend(String requestId) async {
    await initialize();
    final entry = _find(requestId);
    if (entry.state != OutboxState.failed && entry.state != OutboxState.unknown) {
      throw StateError('Only failed or unknown messages can be resent');
    }
    final index = _entries.indexOf(entry);
    _entries.removeAt(index);
    try {
      return await _enqueue(entry.conversationId, entry.text, entry.props);
    } on Object {
      _entries.insert(min(index, _entries.length), entry);
      rethrow;
    }
  }

  /// Drops [requestId]'s message. A message that is sending, or that isn't
  /// sent while an earlier attempt may have reached the authority
  /// ([OutboxItem.uncertain]), could still be committed, so it throws a
  /// [StateError] until the outcome is known.
  Future<void> discard(String requestId) async {
    await initialize();
    final entry = _find(requestId);
    if (entry.state == OutboxState.sending || (entry.uncertain && entry.state != OutboxState.sent)) {
      throw StateError("Wait for the message's outcome before discarding it");
    }
    final index = _entries.indexOf(entry);
    _entries.removeAt(index);
    try {
      await _save();
    } on Object {
      _entries.insert(min(index, _entries.length), entry);
      rethrow;
    }
    _emit(entry);
  }

  _Entry _find(String requestId) {
    _checkOpen();
    for (final entry in _entries) {
      if (entry.requestId == requestId) return entry;
    }
    throw StateError('No outbox message has that request ID');
  }

  void _checkOpen() {
    if (_closed) throw StateError('The outbox is closed');
  }

  void _wake() {
    if (_closed || !_ready) return;
    if (_running != null) {
      _again = true;
      return;
    }
    _timer?.cancel();
    _timer = null;
    _running = _drain().whenComplete(() {
      _running = null;
      if (_again) {
        _again = false;
        _wake();
      } else {
        _arm();
      }
    });
  }

  Future<void> _drain() async {
    while (!_closed) {
      final entry = _next(_clock());
      if (entry == null) return;
      await _attempt(entry);
    }
  }

  // The oldest queued message at the head of its conversation, once due.
  _Entry? _next(int now) {
    if (now < _offlineUntil) return null;
    final heads = <String>{};
    for (final entry in _entries) {
      if (entry.state != OutboxState.queued || !heads.add(entry.conversationId)) continue;
      if (entry.nextAttemptAt <= now) return entry;
    }
    return null;
  }

  void _arm() {
    if (_closed) return;
    int? due;
    final heads = <String>{};
    for (final entry in _entries) {
      if (entry.state != OutboxState.queued || !heads.add(entry.conversationId)) continue;
      final at = max(entry.nextAttemptAt, _offlineUntil);
      if (due == null || at < due) due = at;
    }
    _timer?.cancel();
    // A wait past the longest timer, after a huge retryAfter, wakes early and re-arms.
    _timer = due == null ? null : Timer(Duration(milliseconds: min(max(0, due - _clock()), maxTimerDelayMs)), _wake);
  }

  Future<void> _attempt(_Entry entry) async {
    entry.state = OutboxState.sending;
    entry.error = null;
    _emit(entry);
    Object? failure;
    try {
      _sent(entry, (await _deliver(entry)).ack);
    } on Object catch (error) {
      failure = error;
      _failed(entry, error);
    }
    await _finish(entry);
    // After `WRONG_REGION`, the next attempt needs the project's current route.
    if (failure != null && reconnectAction(failure) == ReconnectAction.reroute) {
      try {
        await client.initialize();
      } on Object {
        // The next attempt fails as well and is handled then.
      }
    }
  }

  Future<void> _finish(_Entry entry) async {
    if (entry.state == OutboxState.sent) _entries.remove(entry);
    // Listeners learn of a sent message before it leaves [items] for longer than this turn.
    _emit(entry);
    try {
      await _save();
    } on Object catch (error) {
      _report(error);
    }
  }

  Future<_Delivered> _deliver(_Entry entry) async {
    if (entry.attempted || !_reachable) {
      // A failed check submitted nothing; [_failed] counts it once.
      final resolution = await client.requests.resolve(entry.requestId);
      _reached();
      if (_settled.contains(resolution.state)) return _Delivered(_ackFrom(entry, resolution));
      if (resolution.state != 'notObservedYet') {
        throw ConvoHopProblem('INVALID_RESPONSE', entry.requestId, 'unknown', 503, 'Unknown request resolution state');
      }
      final record = _record(entry.requestId);
      if (record == null) {
        // The transport stores its record before submitting, so nothing was sent.
        entry.uncertain = false;
      } else if (_settled.contains(record.resolutionState)) {
        return const _Delivered(null);
      }
    }
    final wasAttempted = entry.attempted, wasUncertain = entry.uncertain;
    entry.attempted = true;
    // In doubt until the attempt settles, in case the app stops meanwhile.
    entry.uncertain = true;
    entry.attempts += 1;
    try {
      await _save();
      return _Delivered(
        await client.send(entry.conversationId, entry.text, props: entry.props, requestId: entry.requestId),
      );
    } on Object catch (error) {
      final problem = error is ConvoHopProblem ? error : null;
      // The journal had no room, so the transport stored and sent nothing.
      final full = problem?.code == 'RECOVERY_LIMIT';
      // The transport refused before submitting.
      final unsent = problem != null
          ? full || (problem.outcome != 'rejected' && _unsentCodes.contains(problem.code))
          : (_record(entry.requestId)?.resolutionState ?? 'pending') == 'pending';
      if (unsent) entry.attempts -= 1;
      if (full) entry.attempted = wasAttempted;
      if (unsent || problem?.outcome == 'rejected') entry.uncertain = wasUncertain;
      rethrow;
    }
  }

  RecoveryState? _record(String requestId) {
    for (final state in client.transport.recoveryStates) {
      if (state.requestId == requestId) return state;
    }
    return null;
  }

  MessageAck? _ackFrom(_Entry entry, RequestResolution resolution) {
    final ack = resolution.receipt?.result?.messageAck;
    if (ack == null) return null;
    final cursor = ack.cursor;
    if (ack.conversationId != entry.conversationId ||
        ack.status != 'sent' ||
        (cursor != null && (cursor.conversationId != entry.conversationId || cursor.sequence != ack.sequence))) {
      _report(
        ConvoHopProblem('INVALID_RESPONSE', entry.requestId, resolution.state, 503, 'Invalid send receipt scope'),
      );
      return null;
    }
    return ack;
  }

  void _sent(_Entry entry, MessageAck? ack) {
    entry
      ..state = OutboxState.sent
      ..ack = ack
      ..errorCode = null
      ..error = null
      ..failures = 0;
    _reached();
  }

  void _failed(_Entry entry, Object error) {
    entry.error = error;
    final problem = error is ConvoHopProblem ? error : null;
    entry.errorCode = problem?.code;
    final committed = problem != null
        ? _settled.contains(problem.outcome)
        : _settled.contains(_record(entry.requestId)?.resolutionState);
    if (committed) {
      // Committed, but the receipt couldn't be used or stored.
      _report(error);
      entry
        ..state = OutboxState.sent
        ..ack = null;
      return;
    }
    final code = problem?.code;
    if (code == 'TRANSPORT_UNKNOWN') {
      _unreachable();
      entry.state = OutboxState.queued;
      return;
    }
    // An unknown outcome is never a rejection. A rejection keeps the message
    // when the shared classifier retries it, or while it waits for a session
    // or for room in the journal.
    final keeps =
        problem == null ||
        problem.outcome != 'rejected' ||
        _waitingCodes.contains(code) ||
        reconnectAction(problem) != ReconnectAction.stop;
    if (!keeps || _unsentCodes.contains(code)) {
      entry.state = entry.uncertain ? OutboxState.unknown : OutboxState.failed;
      return;
    }
    if (problem == null || _waitingCodes.contains(code)) _report(error);
    entry
      ..state = OutboxState.queued
      ..failures += 1
      ..nextAttemptAt = _clock() + _delay(entry.failures, problem?.retryAfter);
  }

  int _delay(int failures, int? retryAfterSeconds) {
    final base = min(_maxDelay, _firstDelay << min(failures - 1, 5));
    return max(base + _random.nextInt(base ~/ 5 + 1), (retryAfterSeconds ?? 0) * 1000);
  }

  void _unreachable() {
    _reachable = false;
    _offlineFailures += 1;
    _offlineUntil = _clock() + _delay(_offlineFailures, null);
  }

  void _reached() {
    _reachable = true;
    _offlineFailures = 0;
    _offlineUntil = 0;
  }

  // Unreachable authorities already show as [offline].
  void _reportReachable(Object error) {
    if (error is! ConvoHopProblem || error.code != 'TRANSPORT_UNKNOWN') _report(error);
  }

  void _report(Object error) {
    final listener = _onError;
    if (listener == null || _closed) return;
    try {
      listener(error);
    } on Object {
      // The app's own handler failed: keep sending.
    }
  }

  void _emit(_Entry entry) {
    if (!_closed) _changes.add(entry.item);
  }

  Future<void> _save() {
    final storage = _storage;
    if (storage == null) return Future<void>.value();
    final snapshot = jsonEncode(<Object?>[
      for (final entry in _entries)
        if (entry.state != OutboxState.sent) entry.toJson(),
    ]);
    Future<void> write() async {
      if (snapshot == '[]') {
        await storage.removeItem(_key);
      } else {
        await storage.setItem(_key, snapshot);
      }
    }

    final previous = _writes;
    final next = previous == null ? write() : previous.then((_) => write(), onError: (Object _) => write());
    _writes = next;
    return next;
  }

  /// Stops sending, and completes once the outbox has stopped writing: what
  /// it was loading, sending and saving has settled. So on sign-out, await
  /// it before clearing the storage. Every call returns the same future,
  /// which never fails.
  ///
  /// A send in flight finishes, but the outbox emits no more changes and
  /// reports no more errors. Unsent messages stay stored for the next
  /// outbox.
  Future<void> close() => _closing ??= _close();

  Future<void> _close() async {
    _closed = true;
    _timer?.cancel();
    _timer = null;
    // Listeners don't hold up closing, so it can't wait on a paused one.
    _changes.close().ignore();
    await _settle(_initialization);
    await _settle(_running);
    // Messages queued, discarded or checked before closing may still be saving.
    await _settle(_writes);
    _unretain();
  }
}

// Waits for [work], whose failure went to whoever started it.
Future<void> _settle(Future<void>? work) async {
  if (work == null) return;
  try {
    await work;
  } on Object {
    // Reported there.
  }
}
