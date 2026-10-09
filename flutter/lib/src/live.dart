part of 'client.dart';

/// A LiveKit room, as a call connection drives it.
///
/// `package:convohop/calls.dart` provides one built on the official
/// `livekit_client` package. The connection never starts capture on its own.
abstract interface class LiveMediaRoom {
  /// Connects to [url] with the single-use [token]. Throws when the room
  /// doesn't connect.
  Future<void> connect(String url, String token);

  /// The connected local participant's SID. ConvoHop's media server makes it
  /// the participation's `nativeConnectionId`.
  String? get localParticipantSid;

  Future<void> setMicrophoneEnabled(bool enabled);

  Future<void> setCameraEnabled(bool enabled);

  /// Leaves the room and releases its tracks. Calling it again does nothing.
  Future<void> disconnect();
}

/// Creates the room for one connection. The room calls [onDisconnected] once
/// when it disconnects on its own, after LiveKit's own resume gave up.
typedef LiveMediaRoomFactory<R extends LiveMediaRoom> = R Function(void Function() onDisconnected);

/// A wait for a call action that was aborted through its `abortTrigger`.
final class LiveWaitAborted implements Exception {
  const LiveWaitAborted();

  @override
  String toString() => 'LiveWaitAborted: the wait was aborted';
}

void _checkMediaUrl(String value) {
  final url = Uri.parse(value);
  final loopback = const {'127.0.0.1', 'localhost', '::1'}.contains(url.host);
  if (url.host.isEmpty ||
      url.userInfo.isNotEmpty ||
      url.hasFragment ||
      !(url.scheme == 'wss' || (url.scheme == 'ws' && loopback))) {
    throw const FormatException('Media URL must use WSS, or explicit loopback WS for local development');
  }
}

RecoveryState? _latestState(ConvoHopTransport transport, String operation, String field, String value) {
  for (final state in transport.recoveryStates.reversed) {
    if (state.operation == operation && state.input[field] == value) return state;
  }
  return null;
}

RecoveryState? _savedState(ConvoHopTransport transport, String requestId) {
  for (final state in transport.recoveryStates) {
    if (state.requestId == requestId) return state;
  }
  return null;
}

/// One conversation: its messages, this user's mute and its calls.
final class ConversationHandle {
  ConversationHandle._(this.client, this.conversationId);

  final ConvoHopClient client;
  final String conversationId;

  late final ConversationMessages messages = ConversationMessages._(this);

  /// This user's mute of message push notifications for the conversation.
  /// Calls still ring a muted member.
  late final ConversationMuteControl mute = ConversationMuteControl._(this);

  late final ConversationLive live = ConversationLive._(this);

  Future<Conversation> get() => client.getConversation(conversationId);
}

final class ConversationMessages {
  ConversationMessages._(this._conversation);

  final ConversationHandle _conversation;

  Future<MessageAck> send(String text, {Map<String, Object?> props = const {}, String? requestId}) =>
      _conversation.client.send(_conversation.conversationId, text, props: props, requestId: requestId);

  Future<MessagePage> list({String? beforeSequence}) =>
      _conversation.client.messages(_conversation.conversationId, beforeSequence: beforeSequence);

  Future<Message> edit(Message message, String text, {String? requestId}) {
    _own(message);
    return _conversation.client.edit(message, text, requestId: requestId);
  }

  Future<Message> delete(Message message, {String? requestId}) {
    _own(message);
    return _conversation.client.delete(message, requestId: requestId);
  }

  void _own(Message message) {
    if (message.conversationId != _conversation.conversationId) {
      throw ArgumentError.value(message.messageId, 'message', 'Message is outside this conversation');
    }
  }
}

final class ConversationMuteControl {
  ConversationMuteControl._(this._conversation);

  final ConversationHandle _conversation;

  Future<ConversationMute> get() async {
    final client = _conversation.client;
    return _own(
      (await client.transport.execute(Operations.communicationConversationMute, client.projectId, {
        'conversationId': _conversation.conversationId,
      })).result,
    );
  }

  /// Mutes or unmutes message push notifications. [until] (RFC 3339, in the
  /// future) applies only to a mute.
  Future<ConversationMute> set({required bool muted, String? until, String? requestId}) async {
    final client = _conversation.client;
    return _own(
      (await client.transport.execute(Operations.communicationSetConversationMute, client.projectId, {
        'conversationId': _conversation.conversationId,
        'muted': muted,
        'until': ?until,
      }, requestId: requestId)).result,
    );
  }

  ConversationMute _own(ConversationMute mute) {
    if (mute.conversationId != _conversation.conversationId || mute.principalId != _conversation.client.principalId) {
      throw const FormatException('Conversation mute does not match the request');
    }
    return mute;
  }
}

/// A conversation's calls.
final class ConversationLive {
  ConversationLive._(this.conversation);

  final ConversationHandle conversation;

  /// The conversation's current call, if there is one.
  Future<LiveSessionHandle?> current() async {
    final client = conversation.client;
    final current = (await client.transport.execute(Operations.communicationCurrentLiveSession, client.projectId, {
      'conversationId': conversation.conversationId,
    })).result;
    return current == null ? null : LiveSessionHandle._(client, current);
  }

  Future<LiveSessionPage> history({int? limit, String? cursor}) async {
    final client = conversation.client;
    return (await client.transport.execute(Operations.communicationLiveSessions, client.projectId, {
      'conversationId': conversation.conversationId,
      'limit': ?limit,
      'cursor': ?cursor,
    })).result;
  }

  Future<LiveStartOperation> startVoice({String? requestId}) =>
      _start(LiveSessionKind.interactive, LiveMediaProfile.audioOnly, requestId);

  Future<LiveStartOperation> startVideo({String? requestId}) =>
      _start(LiveSessionKind.interactive, LiveMediaProfile.audioVideo, requestId);

  Future<LiveStartOperation> startBroadcast({required LiveMediaProfile mediaProfile, String? requestId}) =>
      _start(LiveSessionKind.broadcast, mediaProfile, requestId);

  Future<LiveStartOperation> _start(LiveSessionKind kind, LiveMediaProfile mediaProfile, String? requestId) async {
    final client = conversation.client;
    final receipt = await client.transport.execute(Operations.communicationStartLiveSession, client.projectId, {
      'conversationId': conversation.conversationId,
      'kind': kind.wire,
      'mediaProfile': mediaProfile.wire,
    }, requestId: requestId);
    return LiveStartOperation._(client, receipt);
  }
}

/// A call start or end that the authority completes asynchronously.
sealed class LiveAction {
  LiveAction._(this.client, this.operationId, this.liveSessionId, this.kind, this.requestId) {
    parseId(operationId);
    parseId(liveSessionId);
    parseId(requestId);
  }

  final ConvoHopClient client;
  final String operationId;
  final String liveSessionId;
  final LiveOperationKind kind;

  /// The original request, for resolving the action later.
  final String requestId;

  Future<LiveSessionOperation> get() async {
    final result = (await client.transport.execute(Operations.communicationLiveSessionOperation, client.projectId, {
      'operationId': operationId,
    })).result;
    if (result.liveSessionId != liveSessionId || result.operationId != operationId || result.kind != kind) {
      throw const FormatException('Live action scope changed');
    }
    return result;
  }

  /// Polls every 500 ms until the action completes. A failed action throws
  /// its reason as a [ConvoHopProblem]; `RESOLUTION_REQUIRED` means it is
  /// still running when [timeout] (at most 300 seconds) passes. Completing
  /// [abortTrigger] stops the wait with [LiveWaitAborted].
  Future<LiveSessionOperationCompletion> completed({
    Duration timeout = const Duration(seconds: 45),
    Future<void>? abortTrigger,
  }) async {
    final milliseconds = timeout.inMilliseconds;
    if (milliseconds < 1 || milliseconds > 300000) {
      throw RangeError.range(milliseconds, 1, 300000, 'timeout', 'Wait timeout must be 1..300000 ms');
    }
    final deadline = client._clock() + milliseconds;
    var aborted = false;
    final wake = Completer<void>();
    abortTrigger?.whenComplete(() {
      aborted = true;
      if (!wake.isCompleted) wake.complete();
    }).ignore();
    do {
      if (aborted) throw const LiveWaitAborted();
      final action = await get();
      if (action.state == LiveOperationState.completed) {
        final completion = action.completion;
        if (completion == null ||
            (kind == LiveOperationKind.end && completion.mediaCutoff?.state != LiveCutoffState.enforced)) {
          throw const FormatException('Completed action is missing its original completion evidence');
        }
        return completion;
      }
      if (action.state == LiveOperationState.failed) {
        final failure = action.failure ?? (throw const FormatException('Failed live action is missing its reason'));
        throw ConvoHopProblem(failure.code.wire, requestId, 'accepted', 409, failure.message);
      }
      if (action.state != LiveOperationState.running) throw const FormatException('Unknown live action state');
      final timer = Completer<void>();
      final pause = Timer(const Duration(milliseconds: 500), timer.complete);
      await Future.any(<Future<void>>[timer.future, wake.future]);
      pause.cancel();
    } while (client._clock() < deadline);
    if (aborted) throw const LiveWaitAborted();
    throw ConvoHopProblem(
      'RESOLUTION_REQUIRED',
      requestId,
      'accepted',
      409,
      'Action remains unresolved; retain this operation ID and query it again. Elapsed time is not cutoff.',
    );
  }
}

final class LiveStartOperation extends LiveAction {
  LiveStartOperation._(ConvoHopClient client, this.receipt)
    : super._(
        client,
        receipt.result.operationId,
        receipt.result.liveSessionId,
        LiveOperationKind.start,
        receipt.requestId,
      );

  final StartLiveSessionPayload receipt;

  /// Waits for the call to start and returns it.
  Future<LiveSessionHandle> ready({Duration timeout = const Duration(seconds: 45), Future<void>? abortTrigger}) async {
    await completed(timeout: timeout, abortTrigger: abortTrigger);
    return LiveSessionHandle._load(client, liveSessionId);
  }
}

final class LiveEndOperation extends LiveAction {
  LiveEndOperation._(ConvoHopClient client, this.receipt)
    : super._(
        client,
        receipt.result.operationId,
        receipt.result.liveSessionId,
        LiveOperationKind.end,
        receipt.requestId,
      );

  final EndLiveSessionPayload receipt;
}

/// One call (one generation of a live session).
final class LiveSessionHandle {
  LiveSessionHandle._(this.client, this.snapshot)
    : liveSessionId = parseId(snapshot.liveSessionId),
      generation = snapshot.generation,
      conversationId = parseId(snapshot.conversationId);

  static Future<LiveSessionHandle> _load(ConvoHopClient client, String liveSessionId) async => LiveSessionHandle._(
    client,
    (await client.transport.execute(Operations.communicationLiveSession, client.projectId, {
      'liveSessionId': parseId(liveSessionId),
    })).result,
  );

  final ConvoHopClient client;
  final LiveSession snapshot;
  final String liveSessionId;
  final String generation;
  final String conversationId;
  String? _endRequest;

  late final LiveSessionAlerts alerts = LiveSessionAlerts._(this);

  /// The call now. Throws when it is no longer the same occurrence.
  Future<LiveSession> get() async {
    final current = (await _load(client, liveSessionId)).snapshot;
    if (current.generation != generation || current.conversationId != conversationId) {
      throw const FormatException('Live occurrence identity changed');
    }
    return current;
  }

  Future<LiveParticipationHandle> join({String? requestId}) async {
    final receipt = await client.transport.execute(Operations.communicationJoinLiveSession, client.projectId, {
      'liveSessionId': liveSessionId,
      'expectedGeneration': generation,
    }, requestId: requestId);
    await client.transport.initializeRecovery();
    return LiveParticipationHandle._(this, receipt.result.participation);
  }

  /// This user's current participation, if any.
  Future<LiveParticipationHandle?> participation() async {
    final current = (await get()).myParticipation;
    if (current == null) return null;
    await client.transport.initializeRecovery();
    return LiveParticipationHandle._(this, current);
  }

  Future<LiveParticipantPage> participants({int? limit, String? cursor}) async => (await client.transport.execute(
    Operations.communicationLiveSessionParticipants,
    client.projectId,
    {'liveSessionId': liveSessionId, 'limit': ?limit, 'cursor': ?cursor},
  )).result;

  /// Ends the call. A retry reuses the original end request until it is
  /// resolved.
  Future<LiveEndOperation> end({String? requestId}) async {
    final transport = client.transport;
    await transport.initializeRecovery();
    final id = _endRequest =
        requestId ??
        _endRequest ??
        _latestState(transport, 'communication.endLiveSession', 'liveSessionId', liveSessionId)?.requestId ??
        newRequestId();
    final saved = _savedState(transport, id);
    final revision = saved != null ? saved.input['expectedRevision'] : (await get()).revision;
    if (revision is! String) throw const FormatException('Missing original end revision');
    final receipt = await transport.execute(Operations.communicationEndLiveSession, client.projectId, {
      'liveSessionId': liveSessionId,
      'expectedGeneration': generation,
      'expectedRevision': revision,
    }, requestId: id);
    return LiveEndOperation._(client, receipt);
  }
}

final class LiveSessionAlerts {
  LiveSessionAlerts._(this._live);

  final LiveSessionHandle _live;

  /// Rings [principalIds] for this call.
  Future<AlertLiveSessionPayload> send(List<String> principalIds, {String? requestId}) {
    final client = _live.client;
    return client.transport.execute(Operations.communicationAlertLiveSession, client.projectId, {
      'liveSessionId': _live.liveSessionId,
      'expectedGeneration': _live.generation,
      'principalIds': [for (final id in principalIds) _argumentId(id, 'principalIds')],
    }, requestId: requestId);
  }
}

final class _CredentialAttempt {
  _CredentialAttempt(this.requestId, this.mode, this.replacementOfConnectionId, {required this.used});

  final String requestId;
  final LiveConnectionMode mode;
  final String? replacementOfConnectionId;
  bool used;
}

/// This user's participation in a call.
final class LiveParticipationHandle {
  LiveParticipationHandle._(this.live, this.snapshot) : participationId = parseId(snapshot.participationId) {
    _leaveRequest = _latestState(
      live.client.transport,
      'communication.leaveLiveSession',
      'participationId',
      participationId,
    )?.requestId;
  }

  final LiveSessionHandle live;
  final LiveParticipation snapshot;
  final String participationId;
  _CredentialAttempt? _attempt;
  LiveMediaConnection<LiveMediaRoom>? _connection;
  Future<LiveMediaConnection<LiveMediaRoom>>? _connecting;
  String? _leaveRequest;

  /// The participation now. Throws `PARTICIPATION_MISMATCH` when it is no
  /// longer current.
  Future<LiveParticipation> get() async {
    final current = (await live.get()).myParticipation;
    if (current == null || current.participationId != participationId) {
      throw ConvoHopProblem(
        'PARTICIPATION_MISMATCH',
        newRequestId(),
        'rejected',
        409,
        'This participation is no longer current',
      );
    }
    return current;
  }

  /// Connects the call's media with new single-use credentials. Connecting
  /// never starts the microphone or camera.
  ///
  /// [createRoom] makes the LiveKit room; see `package:convohop/calls.dart`.
  /// [onDisconnected] runs when the room disconnects on its own; call
  /// [LiveMediaConnection.reconnect] to continue with new credentials.
  Future<LiveMediaConnection<R>> connect<R extends LiveMediaRoom>(
    LiveMediaRoomFactory<R> createRoom, {
    String? requestId,
    void Function()? onDisconnected,
  }) {
    if (_leaveRequest != null) {
      return Future<LiveMediaConnection<R>>.error(
        StateError('Leave has been requested; resolve its cutoff before rejoining'),
      );
    }
    LiveMediaConnection<R> same(LiveMediaConnection<LiveMediaRoom> connection) => connection is LiveMediaConnection<R>
        ? connection
        : throw StateError('This participation is connected through another room type');
    final connecting = _connecting;
    if (connecting != null) return connecting.then(same);
    final connection = _connection;
    if (connection != null && connection.connected) return Future<LiveMediaConnection<R>>(() => same(connection));
    final work = LiveMediaConnection._connect<R>(this, createRoom, requestId, onDisconnected).then((connection) async {
      if (_leaveRequest != null) {
        await connection.disconnect();
        throw StateError('Participation was left during connection');
      }
      _connection = connection;
      return connection;
    });
    _connecting = work;
    return work.whenComplete(() {
      if (identical(_connecting, work)) _connecting = null;
    });
  }

  // Preserves each credential command separately from native connection attempts.
  Future<(String, LiveConnectionGrant)> _connectionGrant(String? requestId) async {
    final client = live.client, transport = client.transport;
    final current = await get();
    await transport.initializeRecovery();
    if (_attempt == null) {
      final previous = _latestState(
        transport,
        'communication.liveSessionCredentials',
        'participationId',
        participationId,
      );
      if (previous != null) {
        final mode = previous.input['mode'];
        if (mode != LiveConnectionMode.initial.wire && mode != LiveConnectionMode.reconnect.wire) {
          throw const FormatException('Unknown stored credential operation');
        }
        final replacement = previous.input['replacementOfConnectionId'];
        _attempt = _CredentialAttempt(
          previous.requestId,
          LiveConnectionMode.fromJson(mode),
          replacement == null ? null : parseId(replacement),
          used: previous.mediaAdmissionAttempted || current.nativeConnectionId != null,
        );
      }
    }
    final old = _attempt;
    if (old != null) {
      final saved = _savedState(transport, old.requestId);
      final now = client._clock();
      final needsResolution =
          saved != null &&
          (saved.attemptCount >= 3 ||
              now > saved.retryDeadline ||
              now < saved.firstSubmittedAt ||
              now < saved.lastAttemptAt ||
              saved.lastAttemptClassification == 'CREDENTIAL_REFRESH_REQUIRED');
      if (old.used || needsResolution || (requestId != null && requestId != old.requestId)) {
        final resolution = await client.requests.resolve(old.requestId);
        final issuance = resolution.receipt?.result?.liveCredentialIssuance;
        if (issuance == null ||
            issuance.participationId != participationId ||
            issuance.liveSessionId != live.liveSessionId) {
          throw ConvoHopProblem(
            'RESOLUTION_REQUIRED',
            old.requestId,
            'unknown',
            409,
            'Resolve the original credential attempt before obtaining another grant',
          );
        }
        final unobserved =
            current.nativeConnectionId == null ||
            (old.mode == LiveConnectionMode.reconnect && current.nativeConnectionId == old.replacementOfConnectionId);
        if (unobserved && timestampMillis(issuance.admissionExpiresAt) > timestampMillis(resolution.checkedAt)) {
          throw ConvoHopProblem(
            'RESOLUTION_REQUIRED',
            old.requestId,
            'committed',
            409,
            'Native admission remains unresolved; keep this reservation and retry or explicitly leave',
          );
        }
        if (requestId == old.requestId) {
          throw ConvoHopProblem(
            'CREDENTIAL_REFRESH_REQUIRED',
            old.requestId,
            'committed',
            409,
            'The resolved old credential requires a separately identified fresh attempt',
          );
        }
        _attempt = null;
      }
    }
    final nativeConnectionId = current.nativeConnectionId;
    final attempt = _attempt ??= _CredentialAttempt(
      requestId ?? newRequestId(),
      nativeConnectionId == null ? LiveConnectionMode.initial : LiveConnectionMode.reconnect,
      nativeConnectionId,
      used: false,
    );
    final receipt = await transport.execute(Operations.communicationLiveSessionCredentials, client.projectId, {
      'liveSessionId': live.liveSessionId,
      'participationId': participationId,
      'expectedGeneration': live.generation,
      'mode': attempt.mode.wire,
      'replacementOfConnectionId': ?attempt.replacementOfConnectionId,
    }, requestId: attempt.requestId);
    final grant = receipt.result;
    if (grant.liveSessionId != live.liveSessionId ||
        grant.participationId != participationId ||
        grant.generation != live.generation) {
      throw const FormatException('Native credential scope differs from the participation');
    }
    return (attempt.requestId, grant);
  }

  // Once signaling starts, an uncertain admission is resolved, never blindly reused.
  Future<void> _connectionAttempted() {
    final attempt = _attempt ?? (throw StateError('No credential attempt exists'));
    attempt.used = true;
    return live.client.transport.markMediaAdmissionAttempted(attempt.requestId);
  }

  /// Leaves the call and disconnects its media. A retry reuses the original
  /// leave request.
  Future<LeaveLiveSessionPayload> leave({String? requestId}) async {
    final leaveRequest = _leaveRequest;
    if (leaveRequest != null && requestId != null && requestId != leaveRequest) {
      throw StateError('Resolve the original leave request before replacing its identity');
    }
    final id = _leaveRequest ??= requestId ?? newRequestId();
    await _connection?.disconnect();
    final client = live.client;
    return client.transport.execute(Operations.communicationLeaveLiveSession, client.projectId, {
      'liveSessionId': live.liveSessionId,
      'expectedGeneration': live.generation,
      'participationId': participationId,
    }, requestId: id);
  }
}

/// A call's media connection through a stock LiveKit room.
///
/// Each connection uses one fresh credential grant: LiveKit's own resume
/// continues it, and anything else (a full reconnect, a not-allowed error, a
/// restart) needs [reconnect]. The connect token is never logged or stored.
final class LiveMediaConnection<R extends LiveMediaRoom> {
  LiveMediaConnection._(this.participation, this._createRoom, this._onDisconnected)
    : _microphone = participation.snapshot.permissions.microphone,
      _camera = participation.snapshot.permissions.camera;

  static Future<LiveMediaConnection<R>> _connect<R extends LiveMediaRoom>(
    LiveParticipationHandle participation,
    LiveMediaRoomFactory<R> createRoom,
    String? requestId,
    void Function()? onDisconnected,
  ) async {
    final result = LiveMediaConnection<R>._(participation, createRoom, onDisconnected);
    final (id, grant) = await participation._connectionGrant(requestId);
    _checkMediaUrl(grant.livekitUrl);
    await participation._connectionAttempted();
    await result._open(grant.livekitUrl, grant.connectToken, id);
    return result;
  }

  final LiveParticipationHandle participation;
  final LiveMediaRoomFactory<R> _createRoom;
  final void Function()? _onDisconnected;
  final bool _microphone;
  final bool _camera;
  R? _room;
  bool _closed = false;
  bool _left = false;
  Future<LiveMediaConnection<R>>? _reconnecting;

  /// The participation's native connection, once connected.
  String? nativeConnectionId;

  /// The LiveKit room, for rendering tracks.
  R get room => _room ?? (throw StateError('Media room is not open'));

  bool get connected => !_closed && nativeConnectionId != null;

  Future<void> _open(String url, String token, String requestId) async {
    try {
      final room = _room = _createRoom(_disconnected);
      await room.connect(url, token);
      final sid = room.localParticipantSid;
      if (!isId(sid)) throw const FormatException('Media server did not confirm the native connection');
      if (_closed) throw StateError('Connection was closed while connecting');
      nativeConnectionId = sid;
    } on Object {
      try {
        await disconnect();
      } on Object {
        // The connection failure is the caller's error; the room is already unusable.
      }
      throw ConvoHopProblem(
        'MEDIA_CONNECT_FAILED',
        requestId,
        'unknown',
        0,
        'Native connection failed. The participation reservation remains; resolve and retry connect, or explicitly leave.',
      );
    }
  }

  void _disconnected() {
    if (_closed) return;
    _closed = true;
    _onDisconnected?.call();
  }

  /// Connects again with new credentials, after the room disconnected or
  /// LiveKit couldn't resume.
  Future<LiveMediaConnection<R>> reconnect() {
    final reconnecting = _reconnecting;
    if (reconnecting != null) return reconnecting;
    if (_left) {
      return Future<LiveMediaConnection<R>>.error(StateError('A deliberately closed connection cannot reconnect'));
    }
    Future<LiveMediaConnection<R>> work() async {
      await _close(false);
      if (_left) throw StateError('Connection was closed during reconnect');
      final next = await participation.connect(_createRoom, onDisconnected: _onDisconnected);
      if (_left) {
        await next.disconnect();
        throw StateError('Connection was closed during reconnect');
      }
      return next;
    }

    late final Future<LiveMediaConnection<R>> pending;
    pending = work().whenComplete(() {
      if (identical(_reconnecting, pending)) _reconnecting = null;
    });
    _reconnecting = pending;
    return pending;
  }

  Future<void> microphone(bool enabled) async {
    if (!connected || !_microphone) throw StateError('Microphone is not authorized for this participation');
    await room.setMicrophoneEnabled(enabled);
  }

  Future<void> camera(bool enabled) async {
    if (!connected || !_camera) throw StateError('Camera is not authorized for this participation');
    await room.setCameraEnabled(enabled);
  }

  /// Disconnects for good. The participation remains until you leave.
  Future<void> disconnect() => _close(true);

  Future<void> _close(bool deliberate) async {
    _closed = true;
    _left = _left || deliberate;
    await _room?.disconnect();
  }
}
