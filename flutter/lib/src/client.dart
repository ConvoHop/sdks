import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

import 'generated/generated.dart';
import 'problem.dart';
import 'protocol.dart';
import 'socket.dart';
import 'storage.dart';
import 'transport.dart';

part 'live.dart';

/// Renews the session through your backend. It receives the current session
/// binding and returns the bootstrap your backend got from the server SDK's
/// `sessions.renew` for that session, with the binding's `sessionRevision`
/// as `expectedRevision`. A bootstrap for another session is rejected.
typedef SessionRefresh = Future<SessionBootstrap> Function(Session binding);

/// Applies a page of conversation events. The replay cursor advances only
/// after it completes.
typedef EventApplier = Future<void> Function(List<Event> events);

/// Receives realtime and recovery errors that don't belong to a caller.
typedef ErrorListener = void Function(Object error);

enum SessionRefreshState { disabled, uninitialized, ready, refreshing, blocked }

/// The authority can't continue this history from the applied cursor, for
/// example after the user's visible history changed. Call
/// [ConvoHopClient.resyncAuthorizedHistory] to replay what is visible now.
final class HistoryResyncRequired implements Exception {
  const HistoryResyncRequired();

  String get message => 'Explicit authorized history resynchronization required';

  @override
  String toString() => 'HistoryResyncRequired: $message';
}

/// More than one failure, for example a failed refresh and a replay that
/// couldn't resume.
final class AggregateFailure implements Exception {
  AggregateFailure(List<Object> errors, this.message) : errors = List<Object>.unmodifiable(errors);

  final List<Object> errors;
  final String message;

  @override
  String toString() => 'AggregateFailure: $message (${errors.length} errors)';
}

final _events = realtimeChannels['conversationEvents']!;
const _protocol = 'graphql-transport-ws';
final _jitter = Random();
const _maxToken = 16384;

bool _validToken(String token) =>
    token.isNotEmpty && token.length <= _maxToken && !token.contains('\r') && !token.contains('\n');

String _argumentId(String value, String name) {
  if (!isId(value)) throw ArgumentError.value(value, name, 'Expected a canonical nonzero UUID');
  return value;
}

bool _isCounter(String value) {
  try {
    parseCounter(value);
    return true;
  } on FormatException {
    return false;
  }
}

String _argumentCounter(String value, String name) {
  try {
    return parseCounter(value);
  } on FormatException {
    throw ArgumentError.value(value, name, 'Expected a canonical decimal counter');
  }
}

/// The outcome to report when a successful envelope lacks its result.
String _envelopeOutcome(String status) => status == 'committed' || status == 'accepted' ? status : 'unknown';

T _result<T>(T? value, String requestId, String status, String what) =>
    value ?? (throw ConvoHopProblem('INVALID_RESPONSE', requestId, _envelopeOutcome(status), 503, 'Missing $what'));

/// Waits for every future and returns the errors, in order.
Future<List<Object>> _settle(Iterable<Future<Object?>> futures) async {
  final results = await Future.wait(<Future<Object?>>[
    for (final future in futures) future.then<Object?>((_) => null, onError: (Object error) => error),
  ]);
  return <Object>[for (final result in results) ?result];
}

ConvoHopProblem _refreshRequired(String message) =>
    ConvoHopProblem('SESSION_REFRESH_REQUIRED', newRequestId(), 'rejected', 409, message);

final class _Quiescing {
  final Set<ConversationStream> replays = <ConversationStream>{};
  final List<Future<void>> work = <Future<void>>[];
}

final class _ClientOperations extends CommunicationOperations {
  const _ClientOperations(this._client);

  final ConvoHopClient _client;

  @override
  Future<T> execute<T>(OperationSpec<T> operation, Map<String, Object?> input, {String? requestId}) =>
      _client.transport.execute(operation, _client.projectId, input, requestId: requestId);
}

/// A user-session client for one project, principal and device.
///
/// It keeps mutation recovery, replays conversation history from a stored
/// cursor, continues it over realtime and renews the session through
/// [SessionRefresh]. Never give it a backend or operator key.
final class ConvoHopClient {
  /// Creates a client for [principalId]'s session in [projectId].
  ///
  /// [baseUrl] is the authority origin (HTTPS, or loopback HTTP for local
  /// development). [recoveryStorage] keeps mutation recovery and replay
  /// cursors across restarts; it never receives tokens.
  factory ConvoHopClient({
    required String baseUrl,
    required String projectId,
    required String sessionToken,
    required String incarnation,
    required String principalId,
    RecoveryStorage? recoveryStorage,
    http.Client? httpClient,
    SessionRefresh? sessionRefresh,
    RealtimeConnector? realtimeConnector,
    Clock clock = systemClock,
  }) {
    _argumentId(projectId, 'projectId');
    _argumentId(principalId, 'principalId');
    _argumentId(incarnation, 'incarnation');
    if (!_validToken(sessionToken)) throw ArgumentError('Invalid session token', 'sessionToken');
    final ConvoHopTransport transport;
    try {
      transport = ConvoHopTransport(
        baseUrl: baseUrl,
        namespace: '$projectId:$principalId',
        incarnation: incarnation,
        credential: sessionToken,
        recoveryStorage: recoveryStorage,
        httpClient: httpClient,
        clock: clock,
      );
    } on FormatException catch (error) {
      throw ArgumentError.value(baseUrl, 'baseUrl', error.message);
    }
    return ConvoHopClient._(
      projectId,
      principalId,
      sessionToken,
      transport,
      recoveryStorage,
      sessionRefresh,
      realtimeConnector ?? connectRealtime,
      clock,
    );
  }

  ConvoHopClient._(
    this.projectId,
    this.principalId,
    this._token,
    this.transport,
    this.storage,
    this._sessionRefresh,
    this._connector,
    this._clock,
  ) : _authentication = transportAuthentication(transport);

  final String projectId;
  final String principalId;

  /// The transport that runs this client's operations and keeps recovery.
  final ConvoHopTransport transport;

  /// Where recovery records and replay cursors are kept, if anywhere.
  final RecoveryStorage? storage;

  final TransportAuthentication _authentication;
  final SessionRefresh? _sessionRefresh;
  final RealtimeConnector _connector;
  final Clock _clock;
  String _token;
  Session? _session;
  Future<void>? _sessionInitialization;
  Future<Session>? _refreshing;
  _Quiescing? _quiescing;
  ProjectRoute? _route;
  bool _closed = false;
  final Set<ConversationStream> _streams = <ConversationStream>{};
  final Map<String, int> _replayGenerations = <String, int>{};

  /// The generated operations, bound to this project and session.
  late final CommunicationOperations operations = _ClientOperations(this);

  /// Resolve or retry earlier mutations by request ID.
  late final ClientRequests requests = ClientRequests._(this);

  /// Call alerts sent to this user.
  late final LiveAlerts liveAlerts = LiveAlerts._(this);

  /// The session this client verified, once [initialize] ran with
  /// [SessionRefresh] configured.
  Session? get sessionBinding => _session;

  SessionRefreshState get sessionRefreshState {
    if (_sessionRefresh == null) return SessionRefreshState.disabled;
    if (_refreshing != null) return SessionRefreshState.refreshing;
    if (_authentication.blocked) return SessionRefreshState.blocked;
    return _session != null && _route != null ? SessionRefreshState.ready : SessionRefreshState.uninitialized;
  }

  ProjectRoute _validateRoute(Object? input) {
    final value = parseRoute(input);
    if (value.projectId != projectId || value.incarnation != transport.incarnation) {
      throw ConvoHopProblem(
        'INCARNATION_MISMATCH',
        newRequestId(),
        'rejected',
        409,
        'Explicit session/route recovery required',
      );
    }
    final socket = Uri.parse(value.wssUrl), base = Uri.parse(transport.baseUrl);
    if (parseOrigin(value.communicationBase) != transport.baseUrl ||
        urlHost(socket) != urlHost(base) ||
        socket.scheme != (base.scheme == 'https' ? 'wss' : 'ws') ||
        socket.path != '/graphql' ||
        socket.userInfo.isNotEmpty ||
        socket.hasQuery ||
        socket.hasFragment) {
      throw const FormatException(
        "Route cannot redirect this client's credentials to another origin or an unsafe socket",
      );
    }
    return value;
  }

  /// Reads and checks the signed route. With [SessionRefresh] configured, it
  /// also verifies the current session once.
  Future<ProjectRoute> initialize() async {
    if (_closed) throw StateError('ConvoHop client is closed');
    final value = _validateRoute((await transport.execute(Operations.communicationRoute, projectId, const {})).result);
    transport.servingEpoch = value.servingEpoch;
    if (_sessionRefresh != null) {
      final initialization = _sessionInitialization ??= transport
          .execute(Operations.communicationCurrentSession, projectId, const {})
          .then((proof) {
            final binding = checkCurrentSession(proof, _clock());
            if (binding.principalId != principalId || binding.incarnation != transport.incarnation) {
              throw ConvoHopProblem(
                'SESSION_REFRESH_REJECTED',
                proof.requestId,
                'rejected',
                409,
                "Original session authority does not match this client's principal and incarnation",
              );
            }
            _session = binding;
          });
      // A failed check binds nothing, so the next initialize() checks the
      // session again instead of repeating the failure.
      try {
        await initialization;
      } on Object {
        if (identical(_sessionInitialization, initialization)) _sessionInitialization = null;
        rethrow;
      }
    }
    transport.servingEpoch = value.servingEpoch;
    _route = value;
    return value;
  }

  /// Replaces the session token through [SessionRefresh] before it expires.
  ///
  /// Requests wait while it runs and replay streams pause, then resume with
  /// the new token. When neither the replacement nor the original session can
  /// be verified, the client stays blocked: retire it and bootstrap a new one.
  Future<Session> refreshSession() {
    final refreshing = _refreshing;
    if (refreshing != null) return refreshing;
    final hook = _sessionRefresh, binding = _session, currentRoute = _route;
    if (hook == null ||
        binding == null ||
        currentRoute == null ||
        sessionExpiry(binding) <= _clock() ||
        binding.incarnation != transport.incarnation) {
      return Future<Session>.error(
        _refreshRequired(
          'Configure sessionRefresh and initialize with the original valid bearer before renewal or expiry',
        ),
      );
    }
    late final Future<Session> pending;
    pending = _refreshSession(hook, binding, currentRoute).whenComplete(() {
      if (identical(_refreshing, pending)) _refreshing = null;
    });
    _refreshing = pending;
    return pending;
  }

  void _suspendReplay(ConversationStream stream) {
    final quiescing = _quiescing;
    if (quiescing == null) throw StateError('Missing replay refresh state');
    if (quiescing.replays.add(stream)) quiescing.work.add(stream._suspendSessionRefresh()..ignore());
  }

  Future<Session> _refreshSession(SessionRefresh hook, Session binding, ProjectRoute oldRoute) async {
    final authentication = _authentication, oldToken = _token;
    final quiescing = _Quiescing();
    _quiescing = quiescing;
    void Function()? release;
    Session? replacement;
    var invalidated = false;
    ConvoHopProblem? failure;
    var replayRoute = oldRoute;
    Future<void> drain() async {
      if (release == null) {
        final barrier = Completer<void>();
        authentication.barrier = barrier.future;
        release = () {
          authentication.barrier = null;
          barrier.complete();
        };
      }
      // Original callers still receive their errors; refresh only waits for custody to settle.
      await _settle(authentication.active.toList());
    }

    try {
      for (final stream in _streams.toList()) {
        _suspendReplay(stream);
      }
      final retired = await _settle(quiescing.work.toList());
      if (retired.isNotEmpty) throw retired.first;
      await drain();
      if (sessionExpiry(binding) <= _clock()) {
        throw _refreshRequired(
          'Original bearer expired while work drained; explicitly retire and bootstrap a new client',
        );
      }
      final SessionBootstrap supplied;
      try {
        supplied = await hook(binding);
      } on Object {
        throw ConvoHopProblem(
          'SESSION_REFRESH_FAILED',
          newRequestId(),
          'unknown',
          0,
          'Session renewal hook failed; retain the original renewal request and verify its outcome',
        );
      }
      final checked = SessionBootstrap.fromJson(supplied.toJson());
      final candidate = checkSessionMetadata(
        checked.session ?? (throw const FormatException('Replacement bootstrap is missing its session')),
      );
      final candidateToken = checked.sessionToken;
      final tokenExpiresAt = parseTimestamp(checked.tokenExpiresAt);
      if (!_validToken(candidateToken)) throw const FormatException('Invalid replacement credential');
      final nextRoute = _validateRoute(
        (await authentication.probe(Operations.communicationRoute, projectId, candidateToken)).result,
      );
      final proof = await authentication.probe(
        Operations.communicationCurrentSession,
        projectId,
        candidateToken,
        observedServingEpoch: nextRoute.servingEpoch,
      );
      final metadata = checkSessionMetadata(proof.result);
      invalidated =
          proof.status == 'ok' &&
          sameSession(binding, metadata) &&
          counterValue(metadata.sessionRevision) > counterValue(binding.sessionRevision);
      final verified = checkCurrentSession(proof, _clock());
      if (!sameSession(binding, verified) ||
          binding.incarnation != transport.incarnation ||
          counterValue(verified.sessionRevision) <= counterValue(binding.sessionRevision) ||
          sessionExpiry(verified) <= sessionExpiry(binding) ||
          !sameSessionMetadata(verified, candidate) ||
          tokenExpiresAt != verified.expiresAt ||
          timestampMillis(nextRoute.expiresAt) <= _clock()) {
        throw ConvoHopProblem(
          'SESSION_REFRESH_REJECTED',
          proof.requestId,
          'unknown',
          409,
          'Replacement must preserve the original session, advance its live revision and expiry, and match authority metadata',
        );
      }
      _token = candidateToken;
      authentication.credential = candidateToken;
      _session = verified;
      replacement = verified;
      _route = nextRoute;
      replayRoute = nextRoute;
      transport.servingEpoch = nextRoute.servingEpoch;
      authentication.blocked = false;
    } on Object catch (error) {
      final problem = error is ConvoHopProblem
          ? error
          : ConvoHopProblem(
              'SESSION_REFRESH_REJECTED',
              newRequestId(),
              'unknown',
              409,
              'Session replacement or application retirement could not be verified',
            );
      failure = problem;
      await drain();
      authentication.blocked = true;
      if (!invalidated) {
        try {
          final old = checkCurrentSession(
            await authentication.probe(Operations.communicationCurrentSession, projectId, oldToken),
            _clock(),
          );
          if (!sameSessionMetadata(old, binding)) throw const FormatException('Original session authority changed');
          authentication.blocked = false;
        } on Object {
          failure = ConvoHopProblem(
            'SESSION_REFRESH_UNVERIFIED',
            problem.requestId,
            'unknown',
            0,
            'Renewal and original session authority are unverified; HTTP and realtime remain refresh-blocked',
            cause: problem,
          );
        }
      } else {
        failure = ConvoHopProblem(
          'SESSION_REFRESH_UNVERIFIED',
          problem.requestId,
          'unknown',
          0,
          'Authority observed a renewed original session; the old bearer cannot be restored',
          cause: problem,
        );
      }
    } finally {
      _quiescing = null;
      release?.call();
    }
    if (!authentication.blocked) {
      final resumed = await _settle(<Future<void>>[
        for (final stream in quiescing.replays) stream._resumeSessionRefresh(replayRoute, _token),
      ]);
      final errors = <Object>[?failure, ...resumed];
      if (errors.length > 1) throw AggregateFailure(errors, 'Session refresh or replay restoration failed');
      if (errors.isNotEmpty) throw errors.first;
    }
    if (failure != null) throw failure;
    return replacement ?? (throw StateError('Missing verified session replacement'));
  }

  /// A handle for one conversation: messages, mute and calls.
  ConversationHandle conversation(String id) => ConversationHandle._(this, _argumentId(id, 'id'));

  Future<Conversation> getConversation(String id) async {
    final reply = await transport.execute(Operations.communicationGetConversation, projectId, {
      'conversationId': _argumentId(id, 'id'),
    });
    return _result(reply.result, reply.requestId, reply.status, 'conversation');
  }

  /// The call [id], as this user sees it now.
  Future<LiveSessionHandle> liveSession(String id) async => LiveSessionHandle._load(this, _argumentId(id, 'id'));

  /// One page of messages, newest first. Pass the oldest [beforeSequence]
  /// you have to read further back.
  Future<MessagePage> messages(String id, {String? beforeSequence}) async {
    final reply = await transport.execute(Operations.communicationMessages, projectId, {
      'conversationId': _argumentId(id, 'id'),
      'limit': 100,
      if (beforeSequence != null) 'beforeSequence': _argumentCounter(beforeSequence, 'beforeSequence'),
    });
    return _result(reply.result, reply.requestId, reply.status, 'message page');
  }

  /// Sends [text]. Pass the original [requestId] to retry the same send.
  /// Empty or oversized text is the authority's call: it rejects it as
  /// `INVALID_REQUEST`.
  Future<MessageAck> send(String id, String text, {Map<String, Object?> props = const {}, String? requestId}) async {
    final conversationId = _argumentId(id, 'id');
    final reply = await transport.execute(Operations.communicationSendMessage, projectId, {
      'conversationId': conversationId,
      'text': text,
      'props': props,
    }, requestId: requestId);
    final result = _result(reply.result, reply.requestId, reply.status, 'send receipt');
    final cursor = result.cursor;
    if (cursor == null ||
        result.status != 'sent' ||
        result.conversationId != conversationId ||
        cursor.conversationId != conversationId ||
        cursor.sequence != result.sequence ||
        cursor.incarnation != transport.incarnation) {
      throw const FormatException('Invalid send receipt scope');
    }
    return result;
  }

  /// Replaces [message]'s text. Fails with `REVISION_CONFLICT` when the
  /// message changed since you read it.
  Future<Message> edit(Message message, String text, {String? requestId}) async {
    final reply = await transport.execute(Operations.communicationEditMessage, projectId, {
      'conversationId': message.conversationId,
      'messageId': message.messageId,
      'text': text,
      'expectedRevision': message.revision,
    }, requestId: requestId);
    return _result(reply.result, reply.requestId, reply.status, 'edited message');
  }

  Future<Message> delete(Message message, {String? requestId}) async {
    final reply = await transport.execute(Operations.communicationDeleteMessage, projectId, {
      'conversationId': message.conversationId,
      'messageId': message.messageId,
      'expectedRevision': message.revision,
    }, requestId: requestId);
    return _result(reply.result, reply.requestId, reply.status, 'deleted message');
  }

  /// One message, by ID.
  Future<Message> getMessage(String conversationId, String messageId) async {
    final reply = await transport.execute(Operations.communicationGetMessage, projectId, {
      'conversationId': _argumentId(conversationId, 'conversationId'),
      'messageId': _argumentId(messageId, 'messageId'),
    });
    return _result(reply.result, reply.requestId, reply.status, 'message');
  }

  /// Up to 100 events after [after], checked to stay in this conversation and
  /// in order.
  Future<EventPage> events(String id, {Cursor? after}) async {
    final conversationId = _argumentId(id, 'id');
    final reply = await transport.execute(Operations.communicationEvents, projectId, {
      'conversationId': conversationId,
      'limit': _events.replayLimit,
      if (after != null) 'after': cursorJson(after),
    });
    return checkEventPage(
      _result(reply.result, reply.requestId, reply.status, 'event page'),
      transport.incarnation,
      conversationId,
      after: after,
    );
  }

  /// Reports that this user read through [throughSequence]. [membership] is
  /// the user's current membership, as [getConversation] returns it.
  Future<ReadReceipt> reportRead(String id, Member membership, String throughSequence) async {
    final reply = await transport.execute(Operations.communicationReportReceipt, projectId, {
      'conversationId': _argumentId(id, 'id'),
      'kind': 'read',
      'membershipEpoch': membership.membershipEpoch,
      'visibilityEpoch': membership.visibilityEpoch,
      'throughSequence': _argumentCounter(throughSequence, 'throughSequence'),
    });
    return _result(reply.result, reply.requestId, reply.status, 'read receipt');
  }

  Future<ReceiptPage> receipts(String id, {String? cursor}) async {
    final reply = await transport.execute(Operations.communicationReceipts, projectId, {
      'conversationId': _argumentId(id, 'id'),
      'limit': 100,
      'cursor': ?cursor,
    });
    return _result(reply.result, reply.requestId, reply.status, 'receipt page');
  }

  /// Sends a typing signal once. It is never recorded or retried.
  Future<TypingStatus> sendTyping(String id, {required bool isTyping}) async {
    final reply = await transport.execute(Operations.communicationTyping, projectId, {
      'conversationId': _argumentId(id, 'id'),
      'isTyping': isTyping,
    });
    return _result(reply.result, reply.requestId, reply.status, 'typing status');
  }

  /// This user's conversations, most recently active first.
  Future<InboxPage> inbox({int limit = 50, String? cursor}) async {
    final reply = await transport.execute(Operations.communicationInbox, projectId, {
      'limit': limit,
      'cursor': ?cursor,
    });
    return _result(reply.result, reply.requestId, reply.status, 'inbox page');
  }

  Future<SearchPage> search(String query, {List<String>? conversationIds, String? cursor}) async {
    final reply = await transport.execute(Operations.communicationSearch, projectId, {
      'query': query,
      'pageSize': 100,
      if (conversationIds != null)
        'scope': {
          'conversationIds': [for (final id in conversationIds) _argumentId(id, 'conversationIds')],
        },
      'cursor': ?cursor,
    });
    return _result(reply.result, reply.requestId, reply.status, 'search page');
  }

  /// Resolves up to 16 pending or unknown mutations, resending a request only
  /// while its original retry budget remains. Errors go to [onError].
  Future<void> recoverPending(ErrorListener onError) async {
    await transport.initializeRecovery();
    final states = transport.recoveryStates
        .where((state) => state.resolutionState == 'pending' || state.resolutionState == 'unknown')
        .take(16)
        .toList();
    for (final state in states) {
      final transient = _transientClassifications.contains(state.lastAttemptClassification);
      final now = _clock();
      final resend =
          transient &&
          state.attemptCount < 3 &&
          now >= state.lastAttemptAt &&
          now >= state.firstSubmittedAt &&
          now <= state.retryDeadline;
      try {
        if (resend) {
          await requests.retry(state.requestId);
        } else {
          await requests.resolve(state.requestId);
        }
      } on Object catch (error) {
        onError(error);
      }
    }
  }

  /// Replays [conversationId]'s history after the stored cursor through
  /// [apply], then follows it over realtime. Resolves after the first
  /// reconciliation. Errors that end or interrupt the stream go to [onError].
  ///
  /// Pass [startAfter] when your state is already current through it, for
  /// example the conversation's `latestSequence` after you loaded its newest
  /// messages; the replay then starts after it instead of the stored cursor.
  /// Without either, it starts at the beginning of the visible history.
  Future<ConversationStream> watch(
    String conversationId,
    EventApplier apply,
    ErrorListener onError, {
    Cursor? startAfter,
  }) async {
    final id = _argumentId(conversationId, 'conversationId');
    if (startAfter != null &&
        (startAfter.conversationId != id ||
            startAfter.incarnation != transport.incarnation ||
            !_isCounter(startAfter.sequence))) {
      throw ArgumentError.value(startAfter, 'startAfter', "Expected a cursor in this conversation and incarnation");
    }
    return _openReplay(id, apply, onError, false, startAfter);
  }

  /// The replay cursor stored for [conversationId]: how far applied history
  /// reached. Null without storage or before anything was applied.
  Future<Cursor?> storedCursor(String conversationId) => _storedCursor(_argumentId(conversationId, 'conversationId'));

  /// Closes [conversationId]'s streams and replays its currently visible
  /// history from the beginning. Use it after [HistoryResyncRequired].
  Future<ConversationStream> resyncAuthorizedHistory(
    String conversationId,
    EventApplier apply,
    ErrorListener onError,
  ) async {
    _checkReplayAdmission();
    final id = _argumentId(conversationId, 'conversationId');
    _replayGenerations[id] = (_replayGenerations[id] ?? 0) + 1;
    for (final stream in _streams.toList()) {
      if (stream.conversationId == id) stream.close();
    }
    return _openReplay(id, apply, onError, true);
  }

  void _checkReplayAdmission() {
    if (_closed) throw StateError('ConvoHop client is closed');
    if (_authentication.blocked || _quiescing != null) {
      throw _refreshRequired(
        'Session refresh holds replay admission; await verified refresh before opening or resynchronizing history',
      );
    }
  }

  String _cursorKey(String conversationId) => 'convohop.cursor:$projectId:$principalId:$conversationId';

  Future<Cursor?> _storedCursor(String conversationId) async {
    final saved = await storage?.getItem(_cursorKey(conversationId));
    return saved == null ? null : parseCursor(jsonDecode(saved));
  }

  Future<ConversationStream> _openReplay(
    String conversationId,
    EventApplier apply,
    ErrorListener onError,
    bool resync, [
    Cursor? startAfter,
  ]) async {
    _checkReplayAdmission();
    final generation = _replayGenerations[conversationId] ?? 0;
    await Future.wait(<Future<void>>[
      for (final stream in _streams.toList())
        if (stream.conversationId == conversationId && stream.closed) stream.retire(),
    ]);
    final route = _route ?? await initialize();
    // A resynchronization starts from the beginning, so it never depends on a stored cursor.
    final cursor = resync ? null : startAfter ?? await _storedCursor(conversationId);
    _checkReplayAdmission();
    if (generation != (_replayGenerations[conversationId] ?? 0)) {
      throw StateError('History watcher superseded by explicit resynchronization');
    }
    final realtime = ConversationStream._(this, conversationId, route, _token, apply, onError, cursor);
    _streams.add(realtime);
    if (_quiescing != null) _suspendReplay(realtime);
    try {
      if (resync) {
        await realtime._resync();
      } else {
        await realtime._start();
      }
      _checkReplayAdmission();
      if (generation != (_replayGenerations[conversationId] ?? 0)) {
        throw StateError('History watcher superseded by explicit resynchronization');
      }
      return realtime;
    } on Object {
      realtime.close();
      rethrow;
    }
  }

  /// Closes every stream and, when the client created it, the HTTP client.
  void close() {
    if (_closed) return;
    _closed = true;
    for (final stream in _streams.toList()) {
      stream.close();
    }
    transport.close();
  }
}

const _transientClassifications = <String>{
  'submitted',
  'TRANSPORT_UNKNOWN',
  'OUTCOME_UNKNOWN',
  'AUTHORITY_UNAVAILABLE',
  'RETRY_EXHAUSTED',
  'ADMISSION_LIMIT',
  'HTTP_FAILURE',
  'INVALID_RESPONSE',
};

/// Resolve or retry earlier mutations by their original request ID.
final class ClientRequests {
  ClientRequests._(this._client);

  final ConvoHopClient _client;

  /// What the authority knows about [requestId] now.
  Future<RequestResolution> resolve(String requestId) async {
    final reply = await _client.transport.execute(Operations.communicationResolveRequest, _client.projectId, {
      'requestId': _argumentId(requestId, 'requestId'),
    });
    return _result(reply.result, reply.requestId, reply.status, 'current request resolution');
  }

  /// Resolves [requestId] and resends the same request only when the
  /// authority hasn't observed it and its retry budget remains.
  Future<RequestResolution> retry(String requestId) => _client.transport.retry(requestId);
}

/// Call alerts sent to this user.
final class LiveAlerts {
  LiveAlerts._(this._client);

  final ConvoHopClient _client;

  Future<LiveAlertPage> list({int? limit, String? cursor}) async => (await _client.transport.execute(
    Operations.communicationLiveSessionAlerts,
    _client.projectId,
    {'limit': ?limit, 'cursor': ?cursor},
  )).result;
}

final class _Round {
  const _Round(this.generation, this.result);

  final int generation;
  final Future<bool> result;
}

/// One conversation's history: replayed over HTTP from the applied cursor,
/// then followed over realtime.
///
/// Events reach the applier in order, at most once per stream, and the
/// cursor advances (and is stored) only after a page is applied. It
/// reconnects with backoff and resumes after its cursor. Close it when you
/// no longer need it.
final class ConversationStream {
  ConversationStream._(
    this.client,
    this.conversationId,
    ProjectRoute route,
    this._token,
    this._applyEvents,
    this._onError,
    this._cursor,
  ) : _currentRoute = route,
      _storageKey = client._cursorKey(conversationId);

  final ConvoHopClient client;
  final String conversationId;
  final EventApplier _applyEvents;
  final ErrorListener _onError;
  final String _storageKey;
  RealtimeSocket? _socket;
  StreamSubscription<Object?>? _subscription;
  bool _closed = false;
  Future<Object?>? _working;
  _Round? _round;
  Future<bool>? _applying;
  bool _paused = false;
  bool _started = false;
  Cursor? _cursor;
  Timer? _timer;
  int _reconnectAttempts = 0;
  int _pendingPages = 0;
  int _queueGeneration = 0;
  ProjectRoute _currentRoute;
  String _token;

  /// The cursor after the last applied page.
  Cursor? get cursor => _cursor;

  bool get closed => _closed;

  /// Closes the stream and waits for an application in progress.
  Future<void> retire() async {
    close();
    await _applying;
  }

  void _removed() => client._streams.remove(this);

  RealtimeSocket? _dropSocket() {
    final socket = _socket;
    _socket = null;
    _subscription?.cancel().ignore();
    _subscription = null;
    return socket;
  }

  Future<void> _suspendSessionRefresh() async {
    _paused = true;
    _timer?.cancel();
    _timer = null;
    final socket = _dropSocket();
    Object? closing;
    try {
      socket?.close(1000);
    } on Object catch (error) {
      closing = error;
    }
    final applying = _applying, working = _working;
    final settled = await _settle(<Future<Object?>>[?applying, ?working]);
    _queueGeneration++;
    if (closing != null) throw closing;
    if (settled.isNotEmpty) throw settled.first;
  }

  Future<void> _resumeSessionRefresh(ProjectRoute route, String token) async {
    if (_closed) return;
    _currentRoute = route;
    _token = token;
    _paused = false;
    try {
      _proceed(await _reconcileRound());
    } on Object catch (error) {
      _fail(error);
      rethrow;
    }
  }

  Future<bool> _apply(List<Event> events) async {
    final applying = Future<bool>.microtask(() async {
      if (_closed || _paused) return false;
      await _applyEvents(events);
      return true;
    });
    _applying = applying;
    try {
      return await applying;
    } finally {
      _applying = null;
      if (_closed) _removed();
    }
  }

  Future<void> _saveCursor() async {
    final storage = client.storage, cursor = _cursor;
    if (storage != null && cursor != null) await storage.setItem(_storageKey, jsonEncode(cursorJson(cursor)));
  }

  Future<void> _resync() async {
    if (_closed || _started || _working != null) {
      throw StateError('History resynchronization requires a new idle replay');
    }
    _currentRoute = await client.initialize();
    await client.getConversation(conversationId);
    if (_closed) throw StateError('History resynchronization was superseded');
    _cursor = null;
    await _start();
  }

  Future<void> _start() async {
    if (_closed || _started) throw StateError('Replay is already started or closed');
    _started = true;
    await client.recoverPending(_onError);
    if (_paused) throw _refreshRequired('Replay startup was paused by session refresh; open it after verified refresh');
    final more = await _reconcileRound();
    if (_paused) throw _refreshRequired('Replay startup was paused by session refresh; open it after verified refresh');
    _proceed(more);
  }

  void _connect() {
    if (_closed || _paused || _socket != null) return;
    final RealtimeSocket socket;
    try {
      socket = client._connector(Uri.parse(_currentRoute.wssUrl), _protocol);
    } on Object catch (error) {
      _onError(error);
      _retry();
      return;
    }
    _socket = socket;
    final subscriptionId = newRequestId();
    socket.ready.then(
      (_) {
        if (_closed || _paused || !identical(_socket, socket)) {
          socket.close(1000);
          return;
        }
        final protocol = socket.protocol;
        if (protocol != null && protocol != _protocol) {
          _dropSocket();
          socket.close(1000);
          _onError(StateError('Realtime endpoint did not select $_protocol'));
          _retry();
          return;
        }
        socket.send(
          jsonEncode({
            'type': 'connection_init',
            'payload': {'projectId': client.projectId, 'incarnation': _currentRoute.incarnation, 'token': _token},
          }),
        );
      },
      onError: (Object _) {
        // The stream reports the failure and then closes.
      },
    );
    _subscription = socket.stream.listen(
      (data) => _frame(socket, subscriptionId, data),
      onError: (Object _) {
        if (!_closed && !_paused && identical(_socket, socket)) {
          _onError(StateError('Realtime connection unavailable; current history remains authoritative'));
        }
      },
      onDone: () => _socketClosed(socket, subscriptionId),
    );
  }

  void _frame(RealtimeSocket socket, String subscriptionId, Object? data) {
    if (_closed || _paused || !identical(_socket, socket)) return;
    try {
      if (data is! String) throw const FormatException('Expected a text frame');
      if (data.length > _events.maxFrameBytes) {
        throw ConvoHopProblem(
          'ADMISSION_LIMIT',
          subscriptionId,
          'rejected',
          503,
          'Subscription frame exceeds its budget',
        );
      }
      final frame = parseObject(jsonDecode(data));
      final type = frame['type'];
      if (type == 'connection_ack') {
        _reconnectAttempts = 0;
        final operation = Operations.communicationConversationEvents;
        final cursor = _cursor;
        socket.send(
          jsonEncode({
            'type': 'subscribe',
            'id': subscriptionId,
            'payload': {
              'query': operation.document,
              'operationName': operation.operationName,
              'variables': {
                'context': {
                  'requestId': newRequestId(),
                  'projectId': client.projectId,
                  'incarnation': _currentRoute.incarnation,
                  'observedServingEpoch': _currentRoute.servingEpoch,
                },
                'input': {
                  'conversationId': conversationId,
                  'limit': _events.subscribeLimit,
                  if (cursor != null) 'after': cursorJson(cursor),
                },
              },
            },
          }),
        );
      } else if (type == 'ping') {
        socket.send(jsonEncode({'type': 'pong'}));
      } else if (type == 'next' || type == 'error') {
        if (frame['id'] != subscriptionId) throw const FormatException('Unknown subscription identity');
        final payload = type == 'error' ? <String, Object?>{'errors': frame['payload']} : parseObject(frame['payload']);
        final errors = payload['errors'];
        if (errors is List && errors.isNotEmpty) {
          final problem = parseObject(errors.first), extensions = parseObject(problem['extensions']);
          final status = extensions['status'];
          if (status is! int) throw const FormatException('Invalid subscription problem status');
          throw authorityProblem(
            parseString(extensions['code']),
            parseId(extensions['requestId']),
            parseString(extensions['outcome']),
            status,
            parseString(problem['message']),
          );
        }
        _page(parseObject(payload['data'])['conversationEvents']);
      } else if (type == 'complete') {
        throw ConvoHopProblem(
          'AUTHORITY_UNAVAILABLE',
          subscriptionId,
          'unknown',
          503,
          'Resume the subscription from its applied cursor',
        );
      }
    } on Object catch (error) {
      _fail(error);
    }
  }

  void _socketClosed(RealtimeSocket socket, String subscriptionId) {
    if (!identical(_socket, socket)) return;
    _socket = null;
    _subscription = null;
    if (_closed || _paused) return;
    if (_events.terminalCloseCodes.contains(socket.closeCode)) {
      _fail(
        ConvoHopProblem(
          'UNAUTHENTICATED',
          subscriptionId,
          'rejected',
          401,
          'Realtime authorization ended; obtain a current session',
        ),
      );
    } else {
      _retry();
    }
  }

  void _page(Object? value) {
    if (_pendingPages >= _events.maxPendingPages) {
      throw ConvoHopProblem(
        'ADMISSION_LIMIT',
        newRequestId(),
        'unknown',
        503,
        'Application must resume from its applied cursor',
      );
    }
    final page = checkEventPage(EventPage.fromJson(value), _currentRoute.incarnation, conversationId);
    if (page.refreshRequired) throw const HistoryResyncRequired();
    final generation = _queueGeneration;
    _pendingPages++;
    late final Future<void> work;
    work = (_working ?? Future<Object?>.value())
        .then<void>((_) => _deliver(page, generation))
        .then<void>(
          (_) {},
          onError: (Object error) {
            if (generation == _queueGeneration) _fail(error);
          },
        )
        .whenComplete(() {
          _pendingPages--;
          if (identical(_working, work)) _working = null;
        });
    _working = work;
  }

  Future<void> _deliver(EventPage page, int generation) async {
    final frontier = page.nextCursor!;
    final cursor = _cursor;
    if (_closed ||
        _paused ||
        generation != _queueGeneration ||
        (cursor != null && counterValue(frontier.sequence) < counterValue(cursor.sequence))) {
      return;
    }
    final events = cursor == null
        ? page.items
        : [
            for (final event in page.items)
              if (counterValue(event.sequence) > counterValue(cursor.sequence)) event,
          ];
    final applied = await _apply(events);
    if (!applied || _closed || generation != _queueGeneration) return;
    _cursor = frontier;
    await _saveCursor();
  }

  void _retry() {
    if (_closed || _paused || _timer != null) return;
    final delay =
        min(_events.baseDelayMs * (1 << min(_reconnectAttempts++, 4)), _events.maxDelayMs) +
        _jitter.nextInt(_events.jitterMs);
    _timer = Timer(Duration(milliseconds: delay), () {
      _timer = null;
      if (_closed || _paused) return;
      unawaited(_reconnect());
    });
  }

  Future<void> _reconnect() async {
    final generation = _queueGeneration;
    bool current() => !_closed && !_paused && generation == _queueGeneration;
    try {
      final route = await client.initialize();
      if (!current()) return;
      _currentRoute = route;
      await client.recoverPending(_onError);
      final more = current() ? await _reconcileRound() : false;
      if (current()) _proceed(more);
    } on Object catch (error) {
      if (current()) _fail(error);
    }
  }

  // Managed catch-up keeps each round bounded and paces the next one instead of failing at the work limit.
  void _proceed(bool more) {
    if (_closed || _paused) return;
    if (!more) {
      _connect();
      return;
    }
    if (_timer != null) return;
    _timer = Timer(Duration(milliseconds: 250 + _jitter.nextInt(250)), () {
      _timer = null;
      if (_closed || _paused) return;
      final generation = _queueGeneration;
      bool current() => !_closed && !_paused && generation == _queueGeneration;
      _reconcileRound().then(
        (next) {
          if (current()) _proceed(next);
        },
        onError: (Object error) {
          if (current()) _fail(error);
        },
      );
    });
  }

  void _fail(Object error) {
    if (_closed) return;
    _queueGeneration++;
    if (_paused) {
      _onError(error);
      return;
    }
    if (error is ConvoHopProblem && (const {0, 429, 503}.contains(error.status) || error.code == 'WRONG_REGION')) {
      _dropSocket()?.close(4000, 'Retrying authoritative connection');
      _onError(error);
      _retry();
      return;
    }
    close();
    _onError(error);
  }

  // One bounded round of at most ten pages; resolves true only when the current replay has more work.
  Future<bool> _reconcileRound() {
    if (_closed) return Future<bool>.value(false);
    if (_paused) {
      return Future<bool>.error(
        _refreshRequired('Realtime application work is paused until session authority is verified'),
      );
    }
    final generation = _queueGeneration;
    // Rounds coalesce only within one stream generation; earlier queued or superseded work settles first.
    final round = _round;
    if (round != null && round.generation == generation) return round.result;
    bool superseded() => _closed || generation != _queueGeneration;
    bool stale() => superseded() || _paused;
    final pending = (_working ?? Future<Object?>.value())
        .then<Object?>((value) => value, onError: (Object _) => null)
        .then((_) => _replay(superseded, stale));
    final next = _Round(generation, pending);
    _round = next;
    _working = pending;
    void settle() {
      if (identical(_round, next)) _round = null;
      if (identical(_working, pending)) _working = null;
    }

    pending.then((_) => settle(), onError: (Object _) => settle());
    return pending;
  }

  Future<bool> _replay(bool Function() superseded, bool Function() stale) async {
    for (var page = 0; page < 10; page++) {
      if (stale()) return false;
      final previous = _cursor;
      final result = await client.events(conversationId, after: previous);
      if (stale()) return false;
      if (result.refreshRequired) throw const HistoryResyncRequired();
      final frontier = result.nextCursor!;
      if (!result.complete && previous != null && counterValue(frontier.sequence) <= counterValue(previous.sequence)) {
        throw const FormatException('Incomplete replay page did not advance the authoritative frontier');
      }
      final applied = await _apply(result.items);
      if (!applied || superseded()) return false;
      _cursor = frontier;
      await _saveCursor();
      if (result.complete) return false;
    }
    return !stale();
  }

  /// Replays one bounded round of missed history now.
  Future<void> reconcile() async {
    if (await _reconcileRound()) throw StateError('Replay work limit reached; explicitly reconcile again');
  }

  /// Stops replay and realtime. Events already being applied finish.
  void close() {
    if (_closed) return;
    _closed = true;
    _queueGeneration++;
    _timer?.cancel();
    _timer = null;
    _dropSocket()?.close(1000);
    if (_applying == null) _removed();
  }
}
