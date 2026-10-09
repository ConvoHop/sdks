import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'failures.dart';
import 'generated/generated.dart';
import 'http.dart';
import 'problem.dart';
import 'protocol.dart';
import 'storage.dart';

const _maxRecoveryRecords = 128;
const _retryWindowMs = 60000;
const _maxAttempts = 3;
const _requestTimeout = Duration(seconds: 12);
const _maxResponseUnits = 1048576;
// A UTF-8 body longer than this can't decode to at most _maxResponseUnits UTF-16 units.
const _maxResponseBytes = _maxResponseUnits * 3;
const _settled = {'committed', 'accepted'};
const _resolutionStates = {'pending', 'unknown', 'rejected', 'committed', 'accepted'};

/// What the SDK durably remembers about one mutation, so that it can retry
/// the same request or resolve its outcome after a crash or a lost response.
///
/// It never holds a credential.
final class RecoveryState {
  const RecoveryState({
    required this.requestId,
    required this.incarnation,
    required this.payloadFingerprint,
    required this.operation,
    required this.projectId,
    required this.input,
    required this.firstSubmittedAt,
    required this.retryDeadline,
    required this.attemptCount,
    required this.lastAttemptAt,
    required this.lastAttemptClassification,
    required this.resolutionState,
    this.mediaAdmissionAttempted = false,
  });

  final String requestId;
  final String incarnation;
  final String payloadFingerprint;

  /// The operation ID, such as `communication.sendMessage`.
  final String operation;
  final String projectId;
  final Map<String, Object?> input;
  final int firstSubmittedAt;
  final int retryDeadline;
  final int attemptCount;
  final int lastAttemptAt;

  /// `notSubmitted`, `submitted`, `authorityReceipt`, an error code, or
  /// `nativeAdmissionAttempted` once a call connection used its grant.
  final String lastAttemptClassification;

  /// `pending` (never sent), `unknown` (sent, outcome not observed),
  /// `rejected` (the authority refused every attempt), `committed` or
  /// `accepted`.
  final String resolutionState;
  final bool mediaAdmissionAttempted;

  Map<String, Object?> toJson() => <String, Object?>{
    'requestId': requestId,
    'incarnation': incarnation,
    'payloadFingerprint': payloadFingerprint,
    'operation': operation,
    'projectId': projectId,
    'input': copyJson(input),
    'firstSubmittedAt': firstSubmittedAt,
    'retryDeadline': retryDeadline,
    'attemptCount': attemptCount,
    'lastAttemptAt': lastAttemptAt,
    'lastAttemptClassification': lastAttemptClassification,
    'resolutionState': resolutionState,
    if (mediaAdmissionAttempted) 'mediaAdmissionAttempted': true,
  };
}

final class _Record {
  _Record({
    required this.requestId,
    required this.incarnation,
    required this.payloadFingerprint,
    required this.operation,
    required this.projectId,
    required this.input,
    required this.firstSubmittedAt,
    required this.retryDeadline,
    required this.attemptCount,
    required this.lastAttemptAt,
    required this.lastAttemptClassification,
    required this.resolutionState,
    required this.mediaAdmissionAttempted,
  });

  factory _Record.restore(Object? item) {
    final v = parseObject(item);
    final operation = parseString(v['operation']);
    final spec = operationCatalog[operation];
    final resolutionState = v['resolutionState'];
    if (spec == null || !_recorded(spec) || !_resolutionStates.contains(resolutionState)) {
      throw const FormatException('Invalid recovery record');
    }
    final counts = <String, int>{};
    for (final key in const ['firstSubmittedAt', 'retryDeadline', 'attemptCount', 'lastAttemptAt']) {
      final value = v[key];
      if (value is! int || value < 0 || value > maxSafeInteger) {
        throw const FormatException('Invalid recovery clock or count');
      }
      counts[key] = value;
    }
    final admitted = v['mediaAdmissionAttempted'];
    if (admitted != null && admitted != true) throw const FormatException('Invalid native admission marker');
    return _Record(
      requestId: parseId(v['requestId']),
      incarnation: parseString(v['incarnation']),
      payloadFingerprint: parseString(v['payloadFingerprint']),
      operation: operation,
      projectId: parseId(v['projectId']),
      input: parseObject(copyJson(parseObject(v['input']))),
      firstSubmittedAt: counts['firstSubmittedAt']!,
      retryDeadline: counts['retryDeadline']!,
      attemptCount: counts['attemptCount']!,
      lastAttemptAt: counts['lastAttemptAt']!,
      lastAttemptClassification: parseString(v['lastAttemptClassification']),
      resolutionState: resolutionState as String,
      mediaAdmissionAttempted: admitted == true,
    );
  }

  final String requestId;
  final String incarnation;
  final String payloadFingerprint;
  final String operation;
  final String projectId;
  final Map<String, Object?> input;
  final int firstSubmittedAt;
  final int retryDeadline;
  int attemptCount;
  int lastAttemptAt;
  String lastAttemptClassification;
  String resolutionState;
  bool mediaAdmissionAttempted;

  bool get settled => _settled.contains(resolutionState);

  /// Whether the SDK can't send the request again: the authority committed or
  /// accepted it, rejected every attempt with a last code that isn't
  /// retryable, or its retry budget (three attempts within 60 seconds) is
  /// spent. A spent budget makes even a request in doubt final; only a
  /// read-only resolve can settle it then. Only final records make room in a
  /// full journal.
  bool isFinal(int now) =>
      settled ||
      attemptCount >= _maxAttempts ||
      now > retryDeadline ||
      (resolutionState == 'rejected' && !retryableCode(lastAttemptClassification));

  RecoveryState snapshot() => RecoveryState(
    requestId: requestId,
    incarnation: incarnation,
    payloadFingerprint: payloadFingerprint,
    operation: operation,
    projectId: projectId,
    input: parseObject(copyJson(input)),
    firstSubmittedAt: firstSubmittedAt,
    retryDeadline: retryDeadline,
    attemptCount: attemptCount,
    lastAttemptAt: lastAttemptAt,
    lastAttemptClassification: lastAttemptClassification,
    resolutionState: resolutionState,
    mediaAdmissionAttempted: mediaAdmissionAttempted,
  );
}

/// A validated authority reply: the decoded value and the raw envelope.
final class _Reply {
  const _Reply(this.raw, this.value);

  final JsonObject raw;
  final Object? value;
}

final class _Active {
  const _Active(this.identity, this.work);

  final String identity;
  final Future<_Reply> work;
}

/// Session custody shared between the transport and the client that owns it.
/// Not exported: only the client's refresh logic may change the credential.
final class TransportAuthentication {
  TransportAuthentication._(this._transport, this.credential);

  final ConvoHopTransport _transport;
  String? credential;
  Future<void>? barrier;
  bool blocked = false;
  final Set<Future<Object?>> active = <Future<Object?>>{};

  /// Runs a session probe with an explicit bearer, outside the barrier.
  Future<T> probe<T>(OperationSpec<T> spec, String projectId, String credential, {String? observedServingEpoch}) async {
    _transport._checkOpen();
    final reply = await _transport._execute(
      spec,
      projectId,
      const <String, Object?>{},
      newRequestId(),
      _transport.incarnation,
      credential,
      observedServingEpoch,
    );
    return reply.value as T;
  }
}

/// The transport's session custody, for the client that constructed it.
TransportAuthentication transportAuthentication(ConvoHopTransport transport) => transport._authentication;

/// Keeps the records of the request IDs that [requestIds] lists, each time the
/// transport makes room, from being evicted, though they are final: a caller
/// that may still resend or report a request retains its record. Returns a
/// function that stops retaining them.
void Function() retainRecovery(ConvoHopTransport transport, Iterable<String> Function() requestIds) {
  Iterable<String> retainer() => requestIds();
  transport._retainers.add(retainer);
  return () => transport._retainers.remove(retainer);
}

/// Runs [hook] before each submission of [requestId] within its retry budget:
/// after the transport has stored the request's recovery record, and before it
/// counts and sends the attempt, which wait for the hook. A caller that notes
/// that the request may have been sent does so here, so storage never holds
/// that note without the record that recovers the request. If the hook
/// throws, nothing is sent and the submission fails with its error. Returns a
/// function that removes the hook.
void Function() beforeSubmitting(ConvoHopTransport transport, String requestId, Future<void> Function() hook) {
  final hooks = transport._submissionHooks;
  hooks[requestId] = hook;
  return () {
    if (identical(hooks[requestId], hook)) hooks.remove(requestId);
  };
}

/// Sends generated operations to `/graphql` and keeps mutation recovery.
///
/// A mutation keeps its request ID, payload, incarnation and retry budget
/// (three attempts within 60 seconds) across retries and restarts. When the
/// outcome is unknown, resolve the original request ID; the transport never
/// treats a lost response as a rejection or a commit.
///
/// The recovery journal holds at most 128 records. When a new mutation finds
/// it full, the transport evicts the final record whose last attempt is
/// oldest and that no call is using and no caller retains. A record is final
/// once the SDK can't send its request again: committed, accepted, rejected
/// with a code that isn't retryable, or out of retry budget. When no record
/// can go, it refuses the new mutation before sending it, with
/// `RECOVERY_LIMIT`. An evicted request can still be resolved by its ID.
final class ConvoHopTransport {
  ConvoHopTransport({
    required String baseUrl,
    required String namespace,
    required this.incarnation,
    String? credential,
    RecoveryStorage? recoveryStorage,
    http.Client? httpClient,
    Clock clock = systemClock,
  }) : baseUrl = parseOrigin(baseUrl),
       _storage = recoveryStorage,
       _http = httpClient ?? http.Client(),
       _ownsHttp = httpClient == null,
       _clock = clock,
       _storageKey = 'convohop.requests:$namespace' {
    parseId(incarnation);
    _authentication = TransportAuthentication._(this, credential);
  }

  final String baseUrl;
  final RecoveryStorage? _storage;
  final http.Client _http;
  final bool _ownsHttp;
  final Clock _clock;
  final String _storageKey;
  late final TransportAuthentication _authentication;
  final Map<String, _Record> _states = <String, _Record>{};
  final Map<String, _Active> _active = <String, _Active>{};
  final Set<Iterable<String> Function()> _retainers = <Iterable<String> Function()>{};
  final Map<String, Future<void> Function()> _submissionHooks = <String, Future<void> Function()>{};
  Future<void>? _initialization;
  bool _recoveryInitialized = false;
  Future<void>? _writes;
  bool _closed = false;

  /// The project incarnation every request is bound to.
  String incarnation;

  /// The serving epoch from the latest route, sent as `observedServingEpoch`.
  String? servingEpoch;

  bool get durableRecovery => _storage != null;

  /// Loads stored recovery records. Every operation awaits it first.
  Future<void> initializeRecovery() => _initialization ??= _load();

  Future<void> _load() async {
    final storage = _storage;
    if (storage != null) {
      final saved = await storage.getItem(_storageKey);
      if (saved != null) {
        if (saved.isEmpty) throw const FormatException('Invalid mutation recovery storage');
        final values = jsonDecode(saved);
        if (values is! List || values.length > _maxRecoveryRecords) {
          throw const FormatException('Invalid mutation recovery storage');
        }
        final restored = <String, _Record>{};
        for (final item in values) {
          final record = _Record.restore(item);
          if (restored.containsKey(record.requestId)) {
            throw const FormatException('Duplicate mutation recovery identity');
          }
          restored[record.requestId] = record;
        }
        _states.addAll(restored);
      }
    }
    _recoveryInitialized = true;
  }

  /// Copies of the stored recovery records. Await [initializeRecovery] first.
  List<RecoveryState> get recoveryStates {
    if (!_recoveryInitialized) {
      throw StateError('Await initializeRecovery() before inspecting recovery state');
    }
    return <RecoveryState>[for (final state in _states.values) state.snapshot()];
  }

  /// Records that a call connection used the committed credential grant from
  /// [requestId]. That grant is never reused for another connection.
  Future<void> markMediaAdmissionAttempted(String requestId) async {
    parseId(requestId);
    await initializeRecovery();
    final state = _states[requestId];
    if (state == null ||
        state.operation != 'communication.liveSessionCredentials' ||
        state.resolutionState != 'committed') {
      throw StateError('Native admission requires a committed credential issuance');
    }
    state.lastAttemptClassification = 'nativeAdmissionAttempted';
    state.mediaAdmissionAttempted = true;
    await _persist(state);
  }

  Future<void> _persist(_Record state) {
    final storage = _storage;
    if (storage == null) return Future<void>.value();
    final snapshot = jsonEncode(<Object?>[for (final value in _states.values) value.snapshot().toJson()]);
    Future<void> write() async {
      try {
        await storage.setItem(_storageKey, snapshot);
      } on Object catch (cause) {
        throw ConvoHopProblem(
          'RECOVERY_STORAGE_FAILURE',
          state.requestId,
          state.resolutionState == 'pending' ? 'unknown' : state.resolutionState,
          0,
          'Recovery storage did not confirm durability; retain the original request and its outcome',
          cause: cause,
        );
      }
    }

    // A failed snapshot fails its caller; a later complete snapshot may repair it.
    final previous = _writes;
    final next = previous == null ? write() : previous.then((_) => write(), onError: (Object _) => write());
    _writes = next;
    return next;
  }

  /// Runs [spec] in [projectId] with [input]. A mutation uses [requestId]
  /// (or a new one) and records it for recovery before sending.
  Future<T> execute<T>(OperationSpec<T> spec, String projectId, Map<String, Object?> input, {String? requestId}) {
    if (_closed) return Future<T>.error(StateError('ConvoHop transport is closed'));
    final id = requestId ?? newRequestId();
    final currentIncarnation = incarnation;
    final JsonObject body;
    try {
      body = parseObject(copyJson(input));
      _plan(spec, projectId, body, id, servingEpoch);
    } on ConvoHopProblem catch (error) {
      return Future<T>.error(error);
    } on FormatException catch (error) {
      return Future<T>.error(ConvoHopProblem('INVALID_REQUEST', id, 'rejected', 400, error.message));
    }
    return _authorized(id, (credential) async {
      final reply = await _execute(spec, projectId, body, id, currentIncarnation, credential);
      return reply.value as T;
    });
  }

  void _checkOpen() {
    if (_closed) throw StateError('ConvoHop transport is closed');
  }

  Future<T> _authorized<T>(String requestId, Future<T> Function(String? credential) work) {
    if (_closed) return Future<T>.error(StateError('ConvoHop transport is closed'));
    final authentication = _authentication;
    if (authentication.blocked) {
      final state = _states[requestId];
      return Future<T>.error(
        ConvoHopProblem(
          'SESSION_REFRESH_REQUIRED',
          requestId,
          state == null ? 'rejected' : (state.resolutionState == 'pending' ? 'unknown' : state.resolutionState),
          409,
          'Session authority is unverified; recover the original renewal or explicitly retire this client',
        ),
      );
    }
    final barrier = authentication.barrier;
    if (barrier != null) return barrier.then((_) => _authorized(requestId, work));
    final pending = work(authentication.credential);
    authentication.active.add(pending);
    return pending.whenComplete(() => authentication.active.remove(pending));
  }

  Future<_Reply> _execute(
    OperationSpec<Object?> spec,
    String projectId,
    JsonObject body,
    String requestId,
    String expectedIncarnation,
    String? credential, [
    String? observedServingEpoch,
  ]) async {
    final epoch = observedServingEpoch ?? servingEpoch;
    _plan(spec, projectId, body, requestId, epoch);
    await initializeRecovery();
    if (incarnation != expectedIncarnation) {
      throw ConvoHopProblem(
        'INCARNATION_MISMATCH',
        requestId,
        'unknown',
        409,
        'Explicit recovery is required for this incarnation',
      );
    }
    final reply = _recorded(spec)
        ? await _mutate(spec, projectId, body, requestId, credential)
        : await _request(spec, projectId, body, requestId, credential, epoch);
    if (spec.id == 'communication.resolveRequest') {
      final resolution = (reply.value as ResolveRequestReply).result;
      final asked = parseString(body['requestId']);
      if (resolution == null ||
          resolution.requestId != asked ||
          (resolution.receipt != null && resolution.receipt!.requestId != asked)) {
        throw ConvoHopProblem('INVALID_RESPONSE', requestId, 'unknown', 503, 'Request resolution identity changed');
      }
      final state = _states[asked];
      if (state != null && (state.projectId != projectId || state.incarnation != incarnation)) {
        throw ConvoHopProblem(
          'RESOLUTION_REQUIRED',
          requestId,
          'unknown',
          409,
          'Resolve within the original project and incarnation',
        );
      }
      if (state != null && _settled.contains(resolution.state)) {
        if (state.resolutionState != 'committed') state.resolutionState = resolution.state;
        state.lastAttemptClassification = 'authorityReceipt';
        await _persist(state);
      }
    }
    return reply;
  }

  Future<_Reply> _mutate(
    OperationSpec<Object?> spec,
    String projectId,
    JsonObject input,
    String requestId,
    String? credential, {
    bool retry = false,
  }) async {
    parseId(requestId);
    final currentIncarnation = incarnation;
    final identity = canonicalJson(<String, Object?>{
      'operation': spec.id,
      'projectId': projectId,
      'input': input,
      'incarnation': currentIncarnation,
    });
    final active = _active[requestId];
    if (active != null) {
      if (active.identity != identity) {
        throw ConvoHopProblem(
          'IDEMPOTENCY_CONFLICT',
          requestId,
          'unknown',
          409,
          'Preserve the original request and payload',
        );
      }
      return active.work;
    }
    final work = () async {
      final hash = fingerprint(<String, Object?>{'operation': spec.id, 'projectId': projectId, 'input': input});
      if (incarnation != currentIncarnation) {
        throw ConvoHopProblem(
          'INCARNATION_MISMATCH',
          requestId,
          'unknown',
          409,
          'Explicit recovery is required for this incarnation',
        );
      }
      var state = _states[requestId];
      if (state != null &&
          (state.payloadFingerprint != hash ||
              state.incarnation != currentIncarnation ||
              state.operation != spec.id ||
              state.projectId != projectId ||
              canonicalJson(state.input) != canonicalJson(input))) {
        throw ConvoHopProblem(
          'IDEMPOTENCY_CONFLICT',
          requestId,
          'unknown',
          409,
          'Preserve the original request and payload',
        );
      }
      if (retry && (state == null || state.settled || state.mediaAdmissionAttempted)) {
        throw ConvoHopProblem(
          'RESOLUTION_REQUIRED',
          requestId,
          'unknown',
          409,
          'The original request is no longer eligible for resend',
        );
      }
      if (state == null) {
        _reserve(requestId);
        final now = _clock();
        state = _Record(
          requestId: requestId,
          incarnation: currentIncarnation,
          payloadFingerprint: hash,
          operation: spec.id,
          projectId: projectId,
          input: parseObject(copyJson(input)),
          firstSubmittedAt: now,
          retryDeadline: now + _retryWindowMs,
          attemptCount: 0,
          lastAttemptAt: now,
          lastAttemptClassification: 'notSubmitted',
          resolutionState: 'pending',
          mediaAdmissionAttempted: false,
        );
        _states[requestId] = state;
        await _persist(state);
      }
      return _submit(state, spec, credential, retry: retry);
    }();
    _active[requestId] = _Active(identity, work);
    try {
      return await work;
    } finally {
      if (identical(_active[requestId]?.work, work)) _active.remove(requestId);
    }
  }

  /// Makes room for one more record by forgetting the final record attempted
  /// longest ago that no call is using and no caller retains, or refuses the
  /// new request [requestId] with `RECOVERY_LIMIT`, before anything is sent.
  void _reserve(String requestId) {
    if (_states.length < _maxRecoveryRecords) return;
    // A retainer may release itself while it runs.
    final retained = <String>{for (final retainer in List.of(_retainers)) ...retainer()};
    final now = _clock();
    _Record? forgotten;
    for (final value in _states.values) {
      if (value.isFinal(now) &&
          !_active.containsKey(value.requestId) &&
          !retained.contains(value.requestId) &&
          (forgotten == null || value.lastAttemptAt < forgotten.lastAttemptAt)) {
        forgotten = value;
      }
    }
    if (forgotten == null) {
      throw ConvoHopProblem(
        'RECOVERY_LIMIT',
        requestId,
        'rejected',
        409,
        "Recovery storage already holds $_maxRecoveryRecords requests that aren't final; retry or resolve them first",
      );
    }
    _states.remove(forgotten.requestId);
  }

  Future<_Reply> _submit(_Record state, OperationSpec<Object?> spec, String? credential, {bool retry = false}) async {
    if (state.incarnation != incarnation) {
      throw ConvoHopProblem(
        'INCARNATION_MISMATCH',
        state.requestId,
        'unknown',
        409,
        'Explicit recovery is required for this incarnation',
      );
    }
    final now = _clock();
    if (state.attemptCount >= _maxAttempts ||
        now > state.retryDeadline ||
        now < state.firstSubmittedAt ||
        now < state.lastAttemptAt) {
      throw ConvoHopProblem(
        'RESOLUTION_REQUIRED',
        state.requestId,
        'unknown',
        409,
        'Retry budget expired or clock changed; resolve this request read-only',
      );
    }
    await _submissionHooks[state.requestId]?.call();
    final prior = state.resolutionState;
    state.attemptCount += 1;
    state.lastAttemptAt = now;
    final attempt = state.attemptCount;
    if (prior == 'pending' || prior == 'rejected') state.resolutionState = 'unknown';
    state.lastAttemptClassification = 'submitted';
    await _persist(state);
    if (state.incarnation != incarnation) {
      throw ConvoHopProblem(
        'INCARNATION_MISMATCH',
        state.requestId,
        'unknown',
        409,
        'Explicit recovery is required for this incarnation',
      );
    }
    final submittingAt = _clock();
    if (submittingAt > state.retryDeadline ||
        submittingAt < state.firstSubmittedAt ||
        submittingAt < state.lastAttemptAt ||
        (retry && (state.settled || state.mediaAdmissionAttempted))) {
      throw ConvoHopProblem(
        'RESOLUTION_REQUIRED',
        state.requestId,
        'unknown',
        409,
        'The original request is no longer eligible for resend',
      );
    }
    final _Reply reply;
    final String outcome;
    try {
      reply = await _request(spec, state.projectId, state.input, state.requestId, credential, servingEpoch);
      final status = reply.raw['status'];
      if (status != 'committed' && status != 'accepted') {
        throw ConvoHopProblem(
          'INVALID_RESPONSE',
          state.requestId,
          'unknown',
          503,
          'A mutation requires authority receipt evidence',
        );
      }
      outcome = status as String;
    } on Object catch (error) {
      state.lastAttemptClassification = error is ConvoHopProblem ? error.code : 'opaqueTransportFailure';
      // A rejection is the request's outcome only if every attempt was
      // rejected: those before this one, and this one.
      if (error is ConvoHopProblem &&
          error.outcome == 'rejected' &&
          (prior == 'pending' || prior == 'rejected') &&
          state.resolutionState == 'unknown' &&
          state.attemptCount == attempt &&
          state.lastAttemptAt == now) {
        state.resolutionState = 'rejected';
      }
      await _persist(state);
      rethrow;
    }
    if (state.resolutionState != 'committed') state.resolutionState = outcome;
    state.lastAttemptClassification = 'authorityReceipt';
    await _persist(state);
    return reply;
  }

  /// Resolves [requestId] and resends the same request only when the
  /// authority hasn't observed it and its retry budget remains.
  Future<RequestResolution> retry(String requestId) {
    if (!isId(requestId)) {
      return Future<RequestResolution>.error(
        ConvoHopProblem('INVALID_REQUEST', requestId, 'rejected', 400, 'Expected a canonical nonzero UUID'),
      );
    }
    return _authorized(requestId, (credential) => _retry(requestId, credential));
  }

  Future<RequestResolution> _resolve(String projectId, String requestId, String? credential) async {
    final reply = await _execute(
      Operations.communicationResolveRequest,
      projectId,
      <String, Object?>{'requestId': requestId},
      newRequestId(),
      incarnation,
      credential,
    );
    return (reply.value as ResolveRequestReply).result!;
  }

  Future<RequestResolution> _retry(String requestId, String? credential) async {
    await initializeRecovery();
    final state = _states[requestId];
    if (state == null) throw StateError('No recovery record exists; do not invent a replacement identity');
    if (state.incarnation != incarnation) {
      throw ConvoHopProblem(
        'INCARNATION_MISMATCH',
        requestId,
        'unknown',
        409,
        'Explicit recovery is required for this incarnation',
      );
    }
    final resolution = await _resolve(state.projectId, requestId, credential);
    if (_settled.contains(resolution.state)) return resolution;
    if (resolution.state != 'notObservedYet') {
      throw ConvoHopProblem('INVALID_RESPONSE', requestId, 'unknown', 503, 'Unknown request resolution state');
    }
    if (state.settled || state.mediaAdmissionAttempted) {
      throw ConvoHopProblem(
        'RESOLUTION_REQUIRED',
        requestId,
        'unknown',
        409,
        'Previously observed commit or native admission cannot be retried from absent evidence',
      );
    }
    final spec = operationCatalog[state.operation]!;
    if (fingerprint(<String, Object?>{
          'operation': state.operation,
          'projectId': state.projectId,
          'input': state.input,
        }) !=
        state.payloadFingerprint) {
      throw StateError('Recovery input fingerprint changed');
    }
    await _mutate(spec, state.projectId, state.input, state.requestId, credential, retry: true);
    return _resolve(state.projectId, requestId, credential);
  }

  JsonObject _plan(
    OperationSpec<Object?> spec,
    String projectId,
    JsonObject input,
    String requestId,
    String? observedServingEpoch,
  ) {
    try {
      parseId(requestId);
      if (spec.kind == OperationKind.subscription) {
        throw const FormatException('Use graphql-transport-ws for subscriptions');
      }
      if (spec.plane != 'communication' || !identical(operationCatalog[spec.id], spec)) {
        throw const FormatException('Unknown generated GraphQL operation');
      }
      parseId(projectId);
      if (input.keys.any((name) => !spec.inputFields.contains(name))) {
        throw const FormatException('Unknown GraphQL input field');
      }
      final context = <String, Object?>{
        'requestId': requestId,
        'projectId': projectId,
        'incarnation': incarnation,
        'observedServingEpoch': ?observedServingEpoch,
      };
      return <String, Object?>{
        'query': spec.document,
        'operationName': spec.operationName,
        'variables': <String, Object?>{'context': context, if (spec.inputFields.isNotEmpty) 'input': input},
      };
    } on FormatException catch (error) {
      throw ConvoHopProblem('INVALID_REQUEST', requestId, 'rejected', 400, error.message);
    }
  }

  Future<_Reply> _request(
    OperationSpec<Object?> spec,
    String projectId,
    JsonObject input,
    String requestId,
    String? credential,
    String? observedServingEpoch,
  ) async {
    final plan = _plan(spec, projectId, input, requestId, observedServingEpoch);
    final headers = <String, String>{
      'accept': 'application/json',
      'content-type': 'application/json',
      if (credential != null) 'authorization': 'Bearer $credential',
    };
    final BoundedResponse response;
    try {
      response = await boundedPost(
        _http,
        Uri.parse('$baseUrl/graphql'),
        headers,
        utf8.encode(canonicalJson(plan)),
        timeout: _requestTimeout,
        maxBytes: _maxResponseBytes,
      );
    } on TransportFailure catch (failure) {
      throw ConvoHopProblem(
        'TRANSPORT_UNKNOWN',
        requestId,
        'unknown',
        0,
        failure.responded
            ? 'Incomplete authority response; resolve the original request'
            : 'Authority response unavailable; resolve the original request',
      );
    }
    var text = response.tooLarge ? '' : utf8.decode(response.body, allowMalformed: true);
    if (text.startsWith('\uFEFF')) text = text.substring(1);
    if (response.tooLarge || text.length > _maxResponseUnits) {
      throw ConvoHopProblem(
        'INVALID_RESPONSE',
        requestId,
        'unknown',
        response.status,
        'Authority response exceeds the bound',
      );
    }
    final Object? decoded;
    try {
      decoded = jsonDecode(text);
    } on FormatException {
      // A proxy's or gateway's error page isn't JSON, but its Retry-After
      // still bounds the next attempt.
      throw ConvoHopProblem(
        'INVALID_RESPONSE',
        requestId,
        'unknown',
        response.status,
        'Unrecognized authority response',
        retryAfter: retryDelay(response.headers['retry-after']),
      );
    }
    final ok = response.status >= 200 && response.status < 300;
    try {
      final graphql = parseObject(decoded);
      final errors = graphql['errors'];
      if (errors is List && errors.isNotEmpty) {
        final error = parseObject(errors.first);
        final extensions = error['extensions'] == null ? const <String, Object?>{} : parseObject(error['extensions']);
        throw authorityProblem(
          _string(extensions['code']) ?? 'GRAPHQL_ERROR',
          requestId,
          _string(extensions['outcome']) ?? 'unknown',
          _status(extensions['status']) ?? 503,
          _string(error['message']) ?? 'GraphQL rejected the request',
          retryAfter: retryDelay(extensions['retryAfter']) ?? retryDelay(response.headers['retry-after']),
        );
      }
      if (!ok) {
        throw authorityProblem(
          _string(graphql['code']) ?? 'HTTP_FAILURE',
          requestId,
          _string(graphql['outcome']) ?? 'unknown',
          response.status,
          _string(graphql['message']) ?? 'Authority rejected the request',
          retryAfter: retryDelay(graphql['retryAfter']) ?? retryDelay(response.headers['retry-after']),
        );
      }
      final value = parseObject(parseObject(graphql['data'])[spec.field]);
      final typed = spec.decode(value);
      if (spec.id == 'communication.resolveRequest') _checkRetainedResult(value);
      if (!const {'ok', 'committed', 'accepted'}.contains(parseString(value['status']))) {
        throw const FormatException('Unrecognized authority envelope');
      }
      if (parseId(value['requestId']) != requestId) {
        throw ConvoHopProblem(
          'INVALID_RESPONSE',
          requestId,
          'unknown',
          response.status,
          'Mismatched authority request identity',
        );
      }
      if (_recorded(spec)) {
        if (value['status'] == 'committed') {
          parseId(value['receiptId']);
          parseTimestamp(value['committedAt']);
          parseBool(value['replayed']);
        } else if (value['status'] == 'accepted') {
          parseId(parseObject(value['operation'])['operationId']);
        } else {
          throw const FormatException('A mutation requires authority receipt evidence');
        }
      }
      return _Reply(value, typed);
    } on FormatException {
      throw ConvoHopProblem(
        'INVALID_RESPONSE',
        requestId,
        'unknown',
        response.status,
        'Malformed authority response; resolve the original request',
      );
    }
  }

  /// Rejects later requests and closes the HTTP client when the transport
  /// created it.
  void close() {
    if (_closed) return;
    _closed = true;
    if (_ownsHttp) _http.close();
  }
}

/// Mutations that keep a recovery record. An `ephemeral` mutation (a typing
/// signal) is sent once and never retried or resolved.
bool _recorded(OperationSpec<Object?> spec) =>
    spec.kind == OperationKind.mutation && spec.idempotency.name != IdempotencyClasses.ephemeral.name;

void _checkRetainedResult(JsonObject value) {
  final result = value['result'];
  if (result == null) return;
  final receipt = parseObject(result)['receipt'];
  if (receipt == null) return;
  final retained = parseObject(receipt)['result'];
  if (retained == null) return;
  if (parseObject(retained).values.where((field) => field != null).length != 1) {
    throw const FormatException('Retained receipt requires exactly one typed result');
  }
}

String? _string(Object? value) => value is String ? value : null;

int? _status(Object? value) {
  if (value is int) return value;
  if (value is double && value.isFinite && value == value.truncateToDouble()) return value.toInt();
  return null;
}
