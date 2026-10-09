import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'client.dart';
import 'failures.dart';
import 'generated/generated.dart';
import 'outbox.dart';
import 'problem.dart';
import 'protocol.dart';
import 'storage.dart';

/// Where a [ConversationStore] is.
enum ConversationStoreStatus {
  /// Nothing to show yet.
  loading,

  /// The conversation is shown. [ConversationSnapshot.connected] says whether
  /// the store is following the authority right now.
  ready,

  /// The authority can't continue from the store's position, for example
  /// after this user's visibility changed or retained history expired. What
  /// the store shows may include history this user can't see any more. Call
  /// [ConversationStore.resync].
  resyncRequired,

  /// Stopped on an error that won't clear by itself, in
  /// [ConversationSnapshot.error]. [ConversationStore.reconnect] tries again.
  failed,

  /// [ConversationStore.close] was called.
  closed,
}

/// What a [ConversationStore] shows at one moment. It doesn't change.
final class ConversationSnapshot {
  const ConversationSnapshot._({
    required this.conversationId,
    required this.principalId,
    required this.status,
    required this.connected,
    required this.conversation,
    required this.messages,
    required this.pending,
    required this.receipts,
    required this.hasOlder,
    required this.error,
  });

  final String conversationId;

  /// This user.
  final String principalId;
  final ConversationStoreStatus status;

  /// Whether the store is following the authority now. While it isn't, the
  /// store reconnects by itself unless [status] is
  /// [ConversationStoreStatus.resyncRequired] or
  /// [ConversationStoreStatus.failed].
  final bool connected;
  final Conversation? conversation;

  /// Committed messages the store holds, oldest first. Deleted messages stay
  /// as tombstones with [Message.deleted] set.
  final List<Message> messages;

  /// This user's messages that aren't in [messages] yet, in the order they
  /// were sent: show them after [messages] as optimistic messages.
  final List<OutboxItem> pending;

  /// Each member's latest delivery and read progress, by principal ID.
  final Map<String, ReadReceipt> receipts;

  /// Whether the conversation has messages older than [messages].
  /// [ConversationStore.loadOlder] loads them.
  final bool hasOlder;

  /// The last error, until the store recovers from it.
  final Object? error;

  /// This user's receipt.
  ReadReceipt? get ownReceipt => receipts[principalId];

  /// The members other than its author whose read receipt covers [message].
  List<String> readBy(Message message) {
    final sequence = counterValue(message.sequence);
    return <String>[
      for (final receipt in receipts.values)
        if (receipt.principalId != message.authorId && _covers(receipt.readThroughSequence, sequence))
          receipt.principalId,
    ];
  }

  /// Messages in [messages] that others wrote after this user's read receipt.
  int get unreadCount {
    final through = ownReceipt?.readThroughSequence;
    final floor = through == null ? null : counterValue(through);
    var count = 0;
    for (final message in messages.reversed) {
      if (floor != null && counterValue(message.sequence) <= floor) break;
      if (message.authorId != principalId && !message.deleted) count++;
    }
    return count;
  }
}

bool _covers(String? through, BigInt sequence) => through != null && counterValue(through) >= sequence;

const _resyncCodes = {'CURSOR_AHEAD', 'CURSOR_EXPIRED', 'CURSOR_INVALID', 'CURSOR_MISMATCH', 'CURSOR_SCOPE_MISMATCH'};

const _storedFields = {'conversation', 'messages', 'receipts', 'hasOlder', 'through'};

/// A conversation kept current on this device: its newest messages, each
/// member's receipts and this user's optimistic sends.
///
/// The store loads the conversation's newest messages and receipts, then
/// follows its events with [ConvoHopClient.watch] from that point, fetching
/// each new or changed message. After a transient failure it reconnects with
/// backoff and resumes after the last event it applied. It never skips
/// history on its own: when the authority can't continue from its position,
/// the status becomes [ConversationStoreStatus.resyncRequired] until you call
/// [resync].
///
/// Pass the app's [ConvoHopOutbox] to [send] through it: queued, failed and
/// unknown messages show in [ConversationSnapshot.pending] until their
/// committed message arrives.
///
/// With [persist] on and [ConvoHopClient.storage] set, the store keeps up to
/// 200 of the newest messages, including their text, with its receipts and
/// position under `convohop.store:<project>:<principal>:<conversation>`, and
/// shows them at once next time while it catches up. A stored conversation
/// from another incarnation is discarded.
///
/// Use one store per conversation and client. Don't call
/// [ConvoHopClient.resyncAuthorizedHistory] for a conversation a store
/// follows; call [resync].
final class ConversationStore {
  ConversationStore(
    this.client,
    this.conversationId, {
    ConvoHopOutbox? outbox,
    bool persist = false,
    int maxMessages = 1000,
    ErrorListener? onError,
    Random? random,
  }) : _outbox = outbox,
       _storage = persist ? client.storage : null,
       _capacity = maxMessages,
       _onError = onError,
       _random = random ?? Random() {
    if (!isId(conversationId)) {
      throw ArgumentError.value(conversationId, 'conversationId', 'Expected a canonical nonzero UUID');
    }
    if (maxMessages < 100) throw ArgumentError.value(maxMessages, 'maxMessages', 'Expected at least 100');
    if (outbox != null && !identical(outbox.client, client)) {
      throw ArgumentError.value(outbox, 'outbox', 'Expected the outbox of the same client');
    }
    _snapshot = _build();
    _outboxSubscription = outbox?.changes.listen(_outboxChanged);
    unawaited(_connect(_generation));
  }

  static const int _persistLimit = 200;
  static const int _fetchConcurrency = 4;
  static const int _receiptPages = 10;

  final ConvoHopClient client;
  final String conversationId;
  final ConvoHopOutbox? _outbox;
  final RecoveryStorage? _storage;
  final ErrorListener? _onError;
  final Random _random;
  final StreamController<ConversationSnapshot> _changes = StreamController<ConversationSnapshot>.broadcast();
  final StreamController<Event> _events = StreamController<Event>.broadcast();
  final List<Message> _messages = <Message>[];
  final Map<String, Message> _byId = <String, Message>{};
  final Map<String, ReadReceipt> _receipts = <String, ReadReceipt>{};
  final Map<String, OutboxItem> _awaiting = <String, OutboxItem>{};
  StreamSubscription<OutboxItem>? _outboxSubscription;
  late ConversationSnapshot _snapshot;
  int _capacity;
  Conversation? _conversation;
  Cursor? _through;
  bool _hasOlder = false;
  bool _loaded = false;
  bool _restoreTried = false;
  bool _connected = false;
  bool _closed = false;
  ConversationStoreStatus _status = ConversationStoreStatus.loading;
  Object? _error;
  int _generation = 0;
  ConversationStream? _stream;
  Timer? _retry;
  int _failures = 0;
  Future<void>? _writing;
  Future<void>? _closing;
  bool _storing = false;
  // true to write the current state, false to remove the stored copy.
  bool? _storeAction;
  Future<bool>? _older;
  Future<void>? _reading;
  bool _readAgain = false;

  String get _key => 'convohop.store:${client.projectId}:${client.principalId}:$conversationId';

  /// What the store shows now.
  ConversationSnapshot get snapshot => _snapshot;

  /// Every new [snapshot].
  Stream<ConversationSnapshot> get changes => _changes.stream;

  /// Each event the store applied, once [snapshot] reflects it, for example
  /// `live.*` events for call UI.
  Stream<Event> get events => _events.stream;

  /// Queues [text] in the outbox. It shows in [ConversationSnapshot.pending]
  /// at once.
  Future<OutboxItem> send(String text, {Map<String, Object?> props = const {}}) {
    _checkOpen();
    final outbox = _outbox;
    if (outbox == null) throw StateError('Pass an outbox to the store to send messages');
    return outbox.send(conversationId, text, props: props);
  }

  /// Loads the next page of older messages. Resolves whether even older ones
  /// remain.
  Future<bool> loadOlder() {
    _checkOpen();
    if (!_loaded) throw StateError('The conversation is still loading');
    if (!_hasOlder) return Future<bool>.value(false);
    return _older ??= _loadOlder(_generation).whenComplete(() => _older = null);
  }

  Future<bool> _loadOlder(int generation) async {
    final oldest = _messages.isEmpty ? null : _messages.first.sequence;
    final page = await client.messages(conversationId, beforeSequence: oldest);
    if (generation != _generation) return _hasOlder;
    if (page.refreshRequired) {
      await _supersede();
      _requireResync(const HistoryResyncRequired());
      throw const HistoryResyncRequired();
    }
    // A trim meanwhile would leave a gap.
    if ((_messages.isEmpty ? null : _messages.first.sequence) != oldest) return _hasOlder;
    for (final message in page.items) {
      _upsert(message);
    }
    _hasOlder = !page.complete;
    _capacity = max(_capacity, _messages.length);
    _emit();
    _save();
    return _hasOlder;
  }

  /// Reports that this user read through the newest message, unless their
  /// receipt already covers it. Calls while one is in flight coalesce.
  Future<void> markRead() {
    _checkOpen();
    final running = _reading;
    if (running != null) {
      _readAgain = true;
      return running;
    }
    return _reading = _markReadLoop().whenComplete(() => _reading = null);
  }

  Future<void> _markReadLoop() async {
    do {
      _readAgain = false;
      await _markRead(_generation);
    } while (_readAgain && !_closed);
  }

  Future<void> _markRead(int generation) async {
    if (_messages.isEmpty) return;
    final target = _messages.last.sequence;
    var membership = _conversation?.membership;
    if (membership == null) throw StateError('This user is not a member of the conversation');
    if (_ownCovers(membership, target)) return;
    ReadReceipt receipt;
    try {
      receipt = await client.reportRead(conversationId, membership, target);
    } on ConvoHopProblem catch (problem) {
      // The membership changed since the store read it.
      if (problem.code != 'REVISION_CONFLICT') rethrow;
      final conversation = await client.getConversation(conversationId);
      if (generation != _generation) return;
      _setConversation(conversation);
      membership = conversation.membership;
      if (membership == null) throw StateError('This user is not a member of the conversation');
      receipt = await client.reportRead(conversationId, membership, target);
    }
    if (receipt.principalId != client.principalId) throw const FormatException('The receipt is for another member');
    if (generation != _generation) return;
    _mergeReceipt(receipt);
    _emit();
    _save();
  }

  bool _ownCovers(Member membership, String target) {
    final own = _receipts[client.principalId];
    return own != null &&
        own.membershipEpoch == membership.membershipEpoch &&
        own.visibilityEpoch == membership.visibilityEpoch &&
        _covers(own.readThroughSequence, counterValue(target));
  }

  /// Reconnects now, for example when connectivity returns, instead of
  /// waiting for the backoff. After [ConversationStoreStatus.failed], tries
  /// again.
  Future<void> reconnect() async {
    _checkOpen();
    if (_status == ConversationStoreStatus.resyncRequired) {
      throw StateError('The conversation needs resync() before it can reconnect');
    }
    final generation = await _supersede();
    await _connect(generation);
  }

  /// Drops everything the store holds and loads the conversation's current
  /// state again. Use it after [ConversationStoreStatus.resyncRequired].
  Future<void> resync() async {
    _checkOpen();
    final generation = await _supersede();
    _messages.clear();
    _byId.clear();
    _receipts.clear();
    _conversation = null;
    _through = null;
    _hasOlder = false;
    _loaded = false;
    _restoreTried = true;
    _status = ConversationStoreStatus.loading;
    _error = null;
    _forget();
    _emit();
    await _connect(generation);
  }

  Future<int> _supersede() async {
    _retry?.cancel();
    _retry = null;
    _failures = 0;
    final generation = ++_generation;
    final stream = _stream;
    _stream = null;
    _connected = false;
    await stream?.retire();
    return generation;
  }

  /// Stops following the conversation, and completes once the store has
  /// stopped writing. Stored state stays for next time. Every call returns
  /// the same future.
  Future<void> close() => _closing ??= _close();

  Future<void> _close() async {
    _closed = true;
    _generation++;
    _retry?.cancel();
    _retry = null;
    // Not awaited: a broadcast cancel has nothing to wait for, and its root-zone future would stall close() under fake time.
    _outboxSubscription?.cancel().ignore();
    final stream = _stream;
    _stream = null;
    _connected = false;
    await stream?.retire();
    _status = ConversationStoreStatus.closed;
    _snapshot = _build();
    _changes.add(_snapshot);
    // Listeners don't hold up closing, so it can't wait on a paused one.
    _changes.close().ignore();
    _events.close().ignore();
    await _writing;
  }

  void _checkOpen() {
    if (_closed) throw StateError('The conversation store is closed');
  }

  Future<void> _connect(int generation) async {
    try {
      if (!_restoreTried) {
        _restoreTried = true;
        await _restore(generation);
      }
      if (generation != _generation) return;
      if (!_loaded) await _fetch(generation);
      if (generation != _generation) return;
      ConversationStream? opened;
      Object? early;
      final stream = await client.watch(conversationId, (events) => _apply(generation, events), (error) {
        final current = opened;
        if (current == null) {
          // Errors while it opens, such as from recovering earlier sends.
          early = error;
          _report(error);
          return;
        }
        _streamError(generation, current, error);
      }, startAfter: _through);
      opened = stream;
      if (generation != _generation) {
        stream.close();
        return;
      }
      if (stream.closed) {
        _stopped(generation, early ?? StateError('The conversation stream closed while it opened'));
        return;
      }
      _stream = stream;
      _failures = 0;
      _connected = true;
      _status = ConversationStoreStatus.ready;
      _error = null;
      _emit();
    } on Object catch (error) {
      if (generation != _generation) return;
      _report(error);
      _stopped(generation, error);
    }
  }

  void _streamError(int generation, ConversationStream stream, Object error) {
    if (generation != _generation) return;
    _report(error);
    _connected = false;
    _error = error;
    if (stream.closed) {
      if (identical(_stream, stream)) _stream = null;
      _stopped(generation, error);
    } else {
      // The stream retries by itself.
      _emit();
    }
  }

  void _stopped(int generation, Object error) {
    _connected = false;
    _error = error;
    if (error is HistoryResyncRequired || (error is ConvoHopProblem && _resyncCodes.contains(error.code))) {
      _requireResync(error);
      return;
    }
    if (isTransient(error)) {
      _status = _loaded ? ConversationStoreStatus.ready : ConversationStoreStatus.loading;
      _failures++;
      _retry?.cancel();
      _retry = Timer(Duration(milliseconds: backoffDelay(_failures, _random.nextInt(1 << 30))), () {
        _retry = null;
        if (generation == _generation && !_closed) unawaited(_connect(generation));
      });
    } else {
      _status = ConversationStoreStatus.failed;
    }
    _emit();
  }

  // What the store holds may include history this user can't see any more, so it stops showing up next time too.
  void _requireResync(Object error) {
    _status = ConversationStoreStatus.resyncRequired;
    _connected = false;
    _error = error;
    _forget();
    _emit();
  }

  Future<void> _restore(int generation) async {
    final storage = _storage;
    if (storage == null) return;
    final String? saved;
    try {
      saved = await storage.getItem(_key);
    } on Object catch (error) {
      // Stored state is only a head start.
      _report(error);
      return;
    }
    if (saved == null || generation != _generation || _loaded) return;
    try {
      final stored = parseObject(jsonDecode(saved));
      if (stored.length != _storedFields.length || !stored.keys.every(_storedFields.contains)) {
        throw const FormatException('Invalid conversation store data');
      }
      final through = parseCursor(stored['through']);
      if (through.conversationId != conversationId) throw const FormatException('Invalid conversation store data');
      if (through.incarnation != client.transport.incarnation) {
        _forget();
        return;
      }
      final conversation = Conversation.fromJson(stored['conversation']);
      _checkConversation(conversation);
      final messages = stored['messages'], receipts = stored['receipts'], hasOlder = stored['hasOlder'];
      if (messages is! List || receipts is! List || hasOlder is! bool) {
        throw const FormatException('Invalid conversation store data');
      }
      final restored = <Message>[for (final message in messages) Message.fromJson(message)];
      final restoredReceipts = <ReadReceipt>[for (final receipt in receipts) ReadReceipt.fromJson(receipt)];
      _messages.clear();
      _byId.clear();
      for (final message in restored) {
        _upsert(message);
      }
      _receipts.clear();
      for (final receipt in restoredReceipts) {
        if (_receipts.containsKey(receipt.principalId)) throw const FormatException('Invalid conversation store data');
        _receipts[receipt.principalId] = receipt;
      }
      _conversation = conversation;
      _hasOlder = hasOlder;
      _through = through;
      _loaded = true;
      _status = ConversationStoreStatus.ready;
      _emit();
    } on FormatException catch (error) {
      _messages.clear();
      _byId.clear();
      _receipts.clear();
      _report(error);
      _forget();
    }
  }

  Future<void> _fetch(int generation) async {
    final conversation = await client.getConversation(conversationId);
    _checkConversation(conversation);
    final page = await client.messages(conversationId);
    if (page.refreshRequired) throw const HistoryResyncRequired();
    final receipts = await _fetchReceipts();
    if (generation != _generation) return;
    _messages.clear();
    _byId.clear();
    for (final message in page.items.reversed) {
      _upsert(message);
    }
    _receipts
      ..clear()
      ..addAll(receipts);
    _conversation = conversation;
    _hasOlder = !page.complete;
    _through = Cursor(
      incarnation: client.transport.incarnation,
      conversationId: conversationId,
      sequence: conversation.latestSequence,
    );
    _loaded = true;
    _status = ConversationStoreStatus.ready;
    _dropAwaiting();
    _emit();
    _save();
  }

  Future<Map<String, ReadReceipt>> _fetchReceipts() async {
    final receipts = <String, ReadReceipt>{};
    String? cursor;
    for (var page = 0; page < _receiptPages; page++) {
      final ReceiptPage result;
      try {
        result = await client.receipts(conversationId, cursor: cursor);
      } on ConvoHopProblem catch (problem) {
        if (problem.code == 'FEATURE_UNSUPPORTED') return receipts;
        rethrow;
      }
      if (result.refreshRequired) throw const HistoryResyncRequired();
      for (final receipt in result.items) {
        receipts[receipt.principalId] = receipt;
      }
      if (result.complete) break;
      cursor = result.nextCursor;
      if (cursor == null) throw const FormatException('An incomplete receipt page has no cursor');
    }
    return receipts;
  }

  void _checkConversation(Conversation conversation) {
    if (conversation.conversationId != conversationId) {
      throw const FormatException('The conversation does not match the request');
    }
  }

  Future<void> _apply(int generation, List<Event> events) async {
    if (generation != _generation) return;
    var through = _through!;
    final wanted = <String, String?>{};
    var refetch = false;
    for (final event in events) {
      switch (event.type) {
        case 'receipt.reported':
          _applyReceipt(event);
        case 'conversation.updated':
          refetch = true;
        case final type when type.startsWith('message.'):
          _planMessage(event, wanted);
        case final type when type.startsWith('member.'):
          if (_applyMember(event)) refetch = true;
      }
      if (counterValue(event.sequence) > counterValue(through.sequence)) {
        through = Cursor(incarnation: through.incarnation, conversationId: conversationId, sequence: event.sequence);
      }
    }
    final authored = await _fetchMessages(generation, wanted);
    if (refetch && generation == _generation) {
      final conversation = await client.getConversation(conversationId);
      if (generation == _generation) _setConversation(conversation);
    }
    if (generation != _generation) return;
    _through = through;
    _connected = true;
    _error = null;
    _dropAwaiting();
    _trim();
    _emit();
    _save();
    if (authored) _resolveUnknown();
    for (final event in events) {
      if (!_events.isClosed) _events.add(event);
    }
  }

  void _planMessage(Event event, Map<String, String?> wanted) {
    final payload = event.payload;
    final subject = event.subjectRef;
    final messageId = payload?.messageId ?? (subject?.kind == 'message' ? subject?.id : null);
    if (messageId == null || !isId(messageId)) throw const FormatException('A message event has no message ID');
    final revision = payload?.revision;
    final current = _byId[messageId];
    if (current != null) {
      if (revision != null && counterValue(current.revision) >= counterValue(revision)) return;
    } else {
      // Changes to messages older than the window stay out of it.
      if (event.type != 'message.created') return;
      if (_hasOlder && _messages.isNotEmpty && counterValue(event.sequence) < counterValue(_messages.first.sequence)) {
        return;
      }
    }
    final previous = wanted[messageId];
    wanted[messageId] = previous == null || (revision != null && counterValue(revision) > counterValue(previous))
        ? revision
        : previous;
  }

  // Resolves whether one of the fetched messages is this user's.
  Future<bool> _fetchMessages(int generation, Map<String, String?> wanted) async {
    if (wanted.isEmpty) return false;
    final ids = wanted.keys.toList();
    var next = 0;
    var authored = false;
    Object? failure;
    StackTrace? trace;
    Future<void> worker() async {
      while (failure == null && next < ids.length && generation == _generation) {
        final id = ids[next++];
        try {
          if (await _fetchMessage(generation, id, wanted[id])) authored = true;
        } on Object catch (error, stack) {
          failure ??= error;
          trace ??= stack;
        }
      }
    }

    await Future.wait(<Future<void>>[for (var i = 0; i < min(_fetchConcurrency, ids.length); i++) worker()]);
    final error = failure;
    if (error != null) Error.throwWithStackTrace(error, trace ?? StackTrace.current);
    return authored;
  }

  Future<bool> _fetchMessage(int generation, String messageId, String? revision) async {
    final Message message;
    try {
      message = await client.getMessage(conversationId, messageId);
    } on ConvoHopProblem catch (problem) {
      if (generation != _generation) return false;
      if (problem.code == 'MESSAGE_DELETED') {
        _tombstone(messageId, revision);
        return false;
      }
      // Not visible to this user.
      if (problem.code == 'NOT_FOUND' || problem.code == 'FORBIDDEN') return false;
      rethrow;
    }
    if (generation != _generation) return false;
    if (message.messageId != messageId || message.conversationId != conversationId) {
      throw const FormatException('The message does not match the request');
    }
    return _upsert(message) && message.authorId == client.principalId;
  }

  void _applyReceipt(Event event) {
    final payload = event.payload;
    final principalId = payload?.principalId,
        kind = payload?.kind,
        through = payload?.throughSequence,
        membershipEpoch = payload?.membershipEpoch,
        visibilityEpoch = payload?.visibilityEpoch;
    if (principalId == null || kind == null || through == null || membershipEpoch == null || visibilityEpoch == null) {
      throw const FormatException('A receipt event is incomplete');
    }
    if (kind != 'read' && kind != 'delivered') return;
    _mergeReceipt(
      ReadReceipt(
        principalId: principalId,
        membershipEpoch: membershipEpoch,
        visibilityEpoch: visibilityEpoch,
        readThroughSequence: kind == 'read' ? through : null,
        deliveredThroughSequence: kind == 'delivered' ? through : null,
        updatedAt: event.occurredAt,
      ),
    );
  }

  // Receipts from newer epochs replace older ones; within one epoch, progress only grows.
  void _mergeReceipt(ReadReceipt receipt) {
    final current = _receipts[receipt.principalId];
    if (current == null || _newerEpochs(receipt, current)) {
      _receipts[receipt.principalId] = receipt;
      return;
    }
    if (current.membershipEpoch != receipt.membershipEpoch || current.visibilityEpoch != receipt.visibilityEpoch) {
      return;
    }
    _receipts[receipt.principalId] = ReadReceipt(
      principalId: receipt.principalId,
      membershipEpoch: receipt.membershipEpoch,
      visibilityEpoch: receipt.visibilityEpoch,
      deliveredThroughSequence: _later(current.deliveredThroughSequence, receipt.deliveredThroughSequence),
      readThroughSequence: _later(current.readThroughSequence, receipt.readThroughSequence),
      updatedAt: receipt.updatedAt ?? current.updatedAt,
    );
  }

  bool _newerEpochs(ReadReceipt next, ReadReceipt current) {
    final membership = counterValue(next.membershipEpoch).compareTo(counterValue(current.membershipEpoch));
    return membership > 0 ||
        (membership == 0 && counterValue(next.visibilityEpoch) > counterValue(current.visibilityEpoch));
  }

  String? _later(String? a, String? b) {
    if (a == null) return b;
    if (b == null) return a;
    return counterValue(b) > counterValue(a) ? b : a;
  }

  // Resolves whether this user's membership may have changed.
  bool _applyMember(Event event) {
    final payload = event.payload;
    final principalId = payload?.principalId;
    if (principalId == null) return true;
    final receipt = _receipts[principalId];
    if (receipt != null) {
      final membershipEpoch = payload?.membershipEpoch, visibilityEpoch = payload?.visibilityEpoch;
      // A visibility change invalidates the old receipt's coverage.
      if (event.type == 'member.removed' ||
          (membershipEpoch != null && membershipEpoch != receipt.membershipEpoch) ||
          (visibilityEpoch != null && visibilityEpoch != receipt.visibilityEpoch)) {
        _receipts.remove(principalId);
      }
    }
    return principalId == client.principalId;
  }

  void _setConversation(Conversation conversation) {
    _checkConversation(conversation);
    final before = _conversation?.membership, after = conversation.membership;
    if (before != null && after != null) {
      final floor = counterValue(after.visibleFromSequence);
      final previousFloor = counterValue(before.visibleFromSequence);
      if (floor < previousFloor) _hasOlder = true;
      if (floor > previousFloor) {
        final hidden = _messages.where((message) => counterValue(message.sequence) < floor).toList();
        for (final message in hidden) {
          _byId.remove(message.messageId);
        }
        _messages.removeRange(0, hidden.length);
      }
    }
    final own = _receipts[client.principalId];
    if (own != null &&
        after != null &&
        (own.membershipEpoch != after.membershipEpoch || own.visibilityEpoch != after.visibilityEpoch)) {
      _receipts.remove(client.principalId);
    }
    _conversation = conversation;
  }

  int _position(BigInt sequence) {
    var low = 0, high = _messages.length;
    while (low < high) {
      final middle = (low + high) >> 1;
      if (counterValue(_messages[middle].sequence) < sequence) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  }

  bool _upsert(Message message) {
    if (message.conversationId != conversationId) {
      throw const FormatException('The message is from another conversation');
    }
    final current = _byId[message.messageId];
    if (current != null) {
      if (current.sequence != message.sequence) throw const FormatException('A message changed its sequence');
      if (counterValue(current.revision) >= counterValue(message.revision)) return false;
      _replace(current, message);
      return true;
    }
    final index = _position(counterValue(message.sequence));
    if (index < _messages.length && _messages[index].sequence == message.sequence) {
      throw const FormatException('Two messages share a sequence');
    }
    _messages.insert(index, message);
    _byId[message.messageId] = message;
    return true;
  }

  void _replace(Message current, Message next) {
    _messages[_position(counterValue(current.sequence))] = next;
    _byId[next.messageId] = next;
  }

  void _tombstone(String messageId, String? revision) {
    final current = _byId[messageId];
    if (current == null || current.deleted) return;
    _replace(
      current,
      Message(
        messageId: current.messageId,
        conversationId: current.conversationId,
        authorId: current.authorId,
        sequence: current.sequence,
        revision: _later(current.revision, revision)!,
        revisionSequence: current.revisionSequence,
        createdAt: current.createdAt,
        deleted: true,
        editedAt: current.editedAt,
      ),
    );
  }

  void _trim() {
    final excess = _messages.length - _capacity;
    if (excess <= 0) return;
    for (final message in _messages.take(excess)) {
      _byId.remove(message.messageId);
    }
    _messages.removeRange(0, excess);
    _hasOlder = true;
  }

  void _outboxChanged(OutboxItem item) {
    if (_closed || item.conversationId != conversationId) return;
    final ack = item.ack, through = _through;
    if (item.state == OutboxState.sent &&
        ack != null &&
        !_byId.containsKey(ack.messageId) &&
        (through == null || counterValue(ack.sequence) > counterValue(through.sequence))) {
      _awaiting[item.requestId] = item;
      unawaited(_fetchSent(_generation, ack));
    }
    _emit();
  }

  // The conversation's events bring the message in anyway; this only shows it sooner.
  Future<void> _fetchSent(int generation, MessageAck ack) async {
    try {
      final message = await client.getMessage(conversationId, ack.messageId);
      if (generation != _generation || _closed || !_loaded) return;
      if (message.messageId != ack.messageId) return;
      if (_hasOlder &&
          _messages.isNotEmpty &&
          counterValue(message.sequence) < counterValue(_messages.first.sequence)) {
        return;
      }
      _upsert(message);
      _dropAwaiting();
      _emit();
      _save();
    } on Object {
      return;
    }
  }

  // A sent message stops being pending once it arrived, or once the store applied events past it.
  void _dropAwaiting() {
    final through = _through;
    _awaiting.removeWhere((_, item) {
      final ack = item.ack!;
      return _byId.containsKey(ack.messageId) ||
          (through != null && counterValue(ack.sequence) <= counterValue(through.sequence));
    });
  }

  // This user's message arrived, so an unknown send may have been committed after all.
  void _resolveUnknown() {
    final outbox = _outbox;
    if (outbox == null) return;
    for (final item in outbox.itemsFor(conversationId)) {
      if (item.state == OutboxState.unknown) {
        unawaited(outbox.resolve(item.requestId).then((_) {}, onError: (Object _) {}));
      }
    }
  }

  void _save() {
    if (_status != ConversationStoreStatus.resyncRequired) _schedule(true);
  }

  void _forget() => _schedule(false);

  // Writes coalesce: only the latest state is written, one write at a time.
  void _schedule(bool write) {
    if (_storage == null) return;
    _storeAction = write;
    if (_storing) return;
    _storing = true;
    _writing = _store();
  }

  Future<void> _store() async {
    final storage = _storage!;
    try {
      while (true) {
        final action = _storeAction;
        if (action == null) return;
        _storeAction = null;
        try {
          if (!action) {
            await storage.removeItem(_key);
          } else {
            final data = _encode();
            if (data != null) await storage.setItem(_key, data);
          }
        } on Object catch (error) {
          // Memory stays current; the stored copy catches up with the next write.
          _report(error);
        }
      }
    } finally {
      _storing = false;
    }
  }

  String? _encode() {
    final conversation = _conversation, through = _through;
    if (!_loaded || conversation == null || through == null) return null;
    final kept = _messages.length > _persistLimit ? _messages.sublist(_messages.length - _persistLimit) : _messages;
    return jsonEncode(<String, Object?>{
      'conversation': conversation.toJson(),
      'messages': <Object?>[for (final message in kept) message.toJson()],
      'receipts': <Object?>[for (final receipt in _receipts.values) receipt.toJson()],
      'hasOlder': _hasOlder || kept.length < _messages.length,
      'through': cursorJson(through),
    });
  }

  ConversationSnapshot _build() {
    final outbox = _outbox;
    return ConversationSnapshot._(
      conversationId: conversationId,
      principalId: client.principalId,
      status: _status,
      connected: _connected,
      conversation: _conversation,
      messages: List<Message>.unmodifiable(_messages),
      pending: List<OutboxItem>.unmodifiable(
        _ordered(<OutboxItem>[..._awaiting.values, if (outbox != null) ...outbox.itemsFor(conversationId)]),
      ),
      receipts: Map<String, ReadReceipt>.unmodifiable(_receipts),
      hasOlder: _hasOlder,
      error: _error,
    );
  }

  static List<OutboxItem> _ordered(List<OutboxItem> items) {
    final indexed = items.indexed.toList()
      ..sort((a, b) {
        final order = a.$2.createdAt.compareTo(b.$2.createdAt);
        return order != 0 ? order : a.$1.compareTo(b.$1);
      });
    return <OutboxItem>[for (final (_, item) in indexed) item];
  }

  void _emit() {
    if (_closed) return;
    _snapshot = _build();
    _changes.add(_snapshot);
  }

  void _report(Object error) {
    final listener = _onError;
    if (listener == null || _closed) return;
    try {
      listener(error);
    } on Object {
      // The app's own handler failed: keep following the conversation.
    }
  }
}
