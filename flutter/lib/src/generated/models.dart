// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
// dart format off
// ignore_for_file: type=lint, deprecated_member_use_from_same_package
part of 'generated.dart';

enum LiveConnectionMode {
  initial('INITIAL'),
  reconnect('RECONNECT');

  const LiveConnectionMode(this.wire);

  /// Decodes a GraphQL `LiveConnectionMode` value. Unknown values throw a [FormatException].
  factory LiveConnectionMode.fromJson(Object? json) => _decodeLiveConnectionMode(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveConnectionMode _decodeLiveConnectionMode(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveConnectionMode.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveConnectionMode value');
}

enum LiveCutoffEvidence {
  nativeFence('NATIVE_FENCE'),
  monotonicBootRetirement('MONOTONIC_BOOT_RETIREMENT'),
  noGrantsIssued('NO_GRANTS_ISSUED');

  const LiveCutoffEvidence(this.wire);

  /// Decodes a GraphQL `LiveCutoffEvidence` value. Unknown values throw a [FormatException].
  factory LiveCutoffEvidence.fromJson(Object? json) => _decodeLiveCutoffEvidence(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveCutoffEvidence _decodeLiveCutoffEvidence(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveCutoffEvidence.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveCutoffEvidence value');
}

enum LiveCutoffScopeKind {
  participation('PARTICIPATION'),
  generation('GENERATION');

  const LiveCutoffScopeKind(this.wire);

  /// Decodes a GraphQL `LiveCutoffScopeKind` value. Unknown values throw a [FormatException].
  factory LiveCutoffScopeKind.fromJson(Object? json) => _decodeLiveCutoffScopeKind(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveCutoffScopeKind _decodeLiveCutoffScopeKind(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveCutoffScopeKind.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveCutoffScopeKind value');
}

enum LiveCutoffState {
  pending('PENDING'),
  enforced('ENFORCED'),
  unknown('UNKNOWN');

  const LiveCutoffState(this.wire);

  /// Decodes a GraphQL `LiveCutoffState` value. Unknown values throw a [FormatException].
  factory LiveCutoffState.fromJson(Object? json) => _decodeLiveCutoffState(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveCutoffState _decodeLiveCutoffState(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveCutoffState.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveCutoffState value');
}

enum LiveErrorCode {
  liveSessionExists('LIVE_SESSION_EXISTS'),
  liveSessionClosed('LIVE_SESSION_CLOSED'),
  liveSessionInterrupted('LIVE_SESSION_INTERRUPTED'),
  liveSessionCapacity('LIVE_SESSION_CAPACITY'),
  liveAlertLimit('LIVE_ALERT_LIMIT'),
  joinedElsewhere('JOINED_ELSEWHERE'),
  participationDraining('PARTICIPATION_DRAINING'),
  participationMismatch('PARTICIPATION_MISMATCH'),
  generationConflict('GENERATION_CONFLICT'),
  mediaNotReady('MEDIA_NOT_READY'),
  credentialRefreshRequired('CREDENTIAL_REFRESH_REQUIRED'),
  liveStartCancelled('LIVE_START_CANCELLED'),
  livePreparationFailed('LIVE_PREPARATION_FAILED');

  const LiveErrorCode(this.wire);

  /// Decodes a GraphQL `LiveErrorCode` value. Unknown values throw a [FormatException].
  factory LiveErrorCode.fromJson(Object? json) => _decodeLiveErrorCode(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveErrorCode _decodeLiveErrorCode(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveErrorCode.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveErrorCode value');
}

enum LiveMediaProfile {
  audioOnly('AUDIO_ONLY'),
  audioVideo('AUDIO_VIDEO');

  const LiveMediaProfile(this.wire);

  /// Decodes a GraphQL `LiveMediaProfile` value. Unknown values throw a [FormatException].
  factory LiveMediaProfile.fromJson(Object? json) => _decodeLiveMediaProfile(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveMediaProfile _decodeLiveMediaProfile(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveMediaProfile.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveMediaProfile value');
}

enum LiveOperationKind {
  start('START'),
  end('END');

  const LiveOperationKind(this.wire);

  /// Decodes a GraphQL `LiveOperationKind` value. Unknown values throw a [FormatException].
  factory LiveOperationKind.fromJson(Object? json) => _decodeLiveOperationKind(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveOperationKind _decodeLiveOperationKind(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveOperationKind.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveOperationKind value');
}

enum LiveOperationState {
  running('RUNNING'),
  completed('COMPLETED'),
  failed('FAILED');

  const LiveOperationState(this.wire);

  /// Decodes a GraphQL `LiveOperationState` value. Unknown values throw a [FormatException].
  factory LiveOperationState.fromJson(Object? json) => _decodeLiveOperationState(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveOperationState _decodeLiveOperationState(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveOperationState.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveOperationState value');
}

enum LiveParticipationState {
  joined('JOINED'),
  connecting('CONNECTING'),
  connected('CONNECTED'),
  disconnected('DISCONNECTED'),
  leaving('LEAVING'),
  left('LEFT');

  const LiveParticipationState(this.wire);

  /// Decodes a GraphQL `LiveParticipationState` value. Unknown values throw a [FormatException].
  factory LiveParticipationState.fromJson(Object? json) => _decodeLiveParticipationState(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveParticipationState _decodeLiveParticipationState(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveParticipationState.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveParticipationState value');
}

enum LiveRole {
  publisher('PUBLISHER'),
  viewer('VIEWER');

  const LiveRole(this.wire);

  /// Decodes a GraphQL `LiveRole` value. Unknown values throw a [FormatException].
  factory LiveRole.fromJson(Object? json) => _decodeLiveRole(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveRole _decodeLiveRole(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveRole.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveRole value');
}

enum LiveSessionKind {
  interactive('INTERACTIVE'),
  broadcast('BROADCAST');

  const LiveSessionKind(this.wire);

  /// Decodes a GraphQL `LiveSessionKind` value. Unknown values throw a [FormatException].
  factory LiveSessionKind.fromJson(Object? json) => _decodeLiveSessionKind(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveSessionKind _decodeLiveSessionKind(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveSessionKind.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveSessionKind value');
}

enum LiveSessionState {
  preparing('PREPARING'),
  ready('READY'),
  active('ACTIVE'),
  draining('DRAINING'),
  ended('ENDED'),
  failed('FAILED');

  const LiveSessionState(this.wire);

  /// Decodes a GraphQL `LiveSessionState` value. Unknown values throw a [FormatException].
  factory LiveSessionState.fromJson(Object? json) => _decodeLiveSessionState(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

LiveSessionState _decodeLiveSessionState(Object? value, String path) {
  final text = _string(value, path);
  for (final member in LiveSessionState.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known LiveSessionState value');
}

final class ActorRef {
  const ActorRef({
    required this.tenantId,
    required this.objectId,
  });

  /// Decodes and validates a GraphQL `ActorRef`. Malformed values throw a [FormatException].
  factory ActorRef.fromJson(Object? json) => _decodeActorRef(json, r'$');

  final String tenantId;

  final String objectId;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'tenantId': tenantId,
        'objectId': objectId,
      };
}

ActorRef _decodeActorRef(Object? value, String path) {
  final map = _object(value, path);
  return ActorRef(
    tenantId: _scalarString(_get(map, path, 'tenantId'), '$path.tenantId'),
    objectId: _scalarString(_get(map, path, 'objectId'), '$path.objectId'),
  );
}

final class AlertLiveSessionPayload {
  const AlertLiveSessionPayload({
    required this.status,
    required this.requestId,
    required this.receiptId,
    required this.committedAt,
    required this.replayed,
    required this.result,
  });

  /// Decodes and validates a GraphQL `AlertLiveSessionPayload`. Malformed values throw a [FormatException].
  factory AlertLiveSessionPayload.fromJson(Object? json) => _decodeAlertLiveSessionPayload(json, r'$');

  final String status;

  final String requestId;

  final String receiptId;

  final String committedAt;

  final bool replayed;

  final LiveAlertBatch result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'result': result.toJson(),
      };
}

AlertLiveSessionPayload _decodeAlertLiveSessionPayload(Object? value, String path) {
  final map = _object(value, path);
  return AlertLiveSessionPayload(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    receiptId: _scalarUuid(_get(map, path, 'receiptId'), '$path.receiptId'),
    committedAt: _scalarString(_get(map, path, 'committedAt'), '$path.committedAt'),
    replayed: _scalarBoolean(_get(map, path, 'replayed'), '$path.replayed'),
    result: _decodeLiveAlertBatch(_get(map, path, 'result'), '$path.result'),
  );
}

final class BroadcastPermissionChanged {
  const BroadcastPermissionChanged({
    required this.member,
    this.mediaCutoff,
  });

  /// Decodes and validates a GraphQL `BroadcastPermissionChanged`. Malformed values throw a [FormatException].
  factory BroadcastPermissionChanged.fromJson(Object? json) => _decodeBroadcastPermissionChanged(json, r'$');

  final Member member;

  final LiveMediaCutoff? mediaCutoff;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'member': member.toJson(),
        'mediaCutoff': mediaCutoff?.toJson(),
      };
}

BroadcastPermissionChanged _decodeBroadcastPermissionChanged(Object? value, String path) {
  final map = _object(value, path);
  return BroadcastPermissionChanged(
    member: _decodeMember(_get(map, path, 'member'), '$path.member'),
    mediaCutoff: _n(_get(map, path, 'mediaCutoff'), '$path.mediaCutoff', _decodeLiveMediaCutoff),
  );
}

final class Capabilities {
  const Capabilities({
    required this.serverRelease,
    required this.capabilityRevision,
    required this.limitsRevision,
    this.features,
    required this.limits,
    required this.environment,
    required this.productionQualified,
    this.mediaPolicy,
    this.geoControlAuthorityId,
    required this.offerings,
    required this.geos,
    required this.installationProfiles,
    this.portalIdentity,
  });

  /// Decodes and validates a GraphQL `Capabilities`. Malformed values throw a [FormatException].
  factory Capabilities.fromJson(Object? json) => _decodeCapabilities(json, r'$');

  final String serverRelease;

  final String capabilityRevision;

  final String limitsRevision;

  final Features? features;

  final List<LimitEntry> limits;

  final String environment;

  final bool productionQualified;

  final MediaPolicy? mediaPolicy;

  final String? geoControlAuthorityId;

  final List<String> offerings;

  final List<String> geos;

  final List<String> installationProfiles;

  final String? portalIdentity;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'serverRelease': serverRelease,
        'capabilityRevision': capabilityRevision,
        'limitsRevision': limitsRevision,
        'features': features?.toJson(),
        'limits': limits.map((e0) => e0.toJson()).toList(),
        'environment': environment,
        'productionQualified': productionQualified,
        'mediaPolicy': mediaPolicy?.toJson(),
        'geoControlAuthorityId': geoControlAuthorityId,
        'offerings': offerings,
        'geos': geos,
        'installationProfiles': installationProfiles,
        'portalIdentity': portalIdentity,
      };
}

Capabilities _decodeCapabilities(Object? value, String path) {
  final map = _object(value, path);
  return Capabilities(
    serverRelease: _scalarString(_get(map, path, 'serverRelease'), '$path.serverRelease'),
    capabilityRevision: _scalarDecimal(_get(map, path, 'capabilityRevision'), '$path.capabilityRevision'),
    limitsRevision: _scalarDecimal(_get(map, path, 'limitsRevision'), '$path.limitsRevision'),
    features: _n(_get(map, path, 'features'), '$path.features', _decodeFeatures),
    limits: _list(_get(map, path, 'limits'), '$path.limits', _decodeLimitEntry),
    environment: _scalarString(_get(map, path, 'environment'), '$path.environment'),
    productionQualified: _scalarBoolean(_get(map, path, 'productionQualified'), '$path.productionQualified'),
    mediaPolicy: _n(_get(map, path, 'mediaPolicy'), '$path.mediaPolicy', _decodeMediaPolicy),
    geoControlAuthorityId: _n(_get(map, path, 'geoControlAuthorityId'), '$path.geoControlAuthorityId', _scalarString),
    offerings: _list(_get(map, path, 'offerings'), '$path.offerings', _scalarString),
    geos: _list(_get(map, path, 'geos'), '$path.geos', _scalarString),
    installationProfiles: _list(_get(map, path, 'installationProfiles'), '$path.installationProfiles', _scalarString),
    portalIdentity: _n(_get(map, path, 'portalIdentity'), '$path.portalIdentity', _scalarString),
  );
}

final class CapabilitiesReply {
  const CapabilitiesReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `CapabilitiesReply`. Malformed values throw a [FormatException].
  factory CapabilitiesReply.fromJson(Object? json) => _decodeCapabilitiesReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final Capabilities? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

CapabilitiesReply _decodeCapabilitiesReply(Object? value, String path) {
  final map = _object(value, path);
  return CapabilitiesReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeCapabilities),
  );
}

final class Conversation {
  const Conversation({
    required this.conversationId,
    required this.revision,
    required this.title,
    this.props,
    required this.latestSequence,
    this.membership,
  });

  /// Decodes and validates a GraphQL `Conversation`. Malformed values throw a [FormatException].
  factory Conversation.fromJson(Object? json) => _decodeConversation(json, r'$');

  final String conversationId;

  final String revision;

  final String title;

  final Map<String, Object?>? props;

  final String latestSequence;

  final Member? membership;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'revision': revision,
        'title': title,
        'props': props,
        'latestSequence': latestSequence,
        'membership': membership?.toJson(),
      };
}

Conversation _decodeConversation(Object? value, String path) {
  final map = _object(value, path);
  return Conversation(
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
    title: _scalarString(_get(map, path, 'title'), '$path.title'),
    props: _n(_get(map, path, 'props'), '$path.props', _scalarProperties),
    latestSequence: _scalarDecimal(_get(map, path, 'latestSequence'), '$path.latestSequence'),
    membership: _n(_get(map, path, 'membership'), '$path.membership', _decodeMember),
  );
}

final class ConversationMemberBatch {
  const ConversationMemberBatch({
    required this.items,
  });

  /// Decodes and validates a GraphQL `ConversationMemberBatch`. Malformed values throw a [FormatException].
  factory ConversationMemberBatch.fromJson(Object? json) => _decodeConversationMemberBatch(json, r'$');

  final List<Member> items;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
      };
}

ConversationMemberBatch _decodeConversationMemberBatch(Object? value, String path) {
  final map = _object(value, path);
  return ConversationMemberBatch(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeMember),
  );
}

final class ConversationMute {
  const ConversationMute({
    required this.conversationId,
    required this.principalId,
    required this.muted,
    this.until,
  });

  /// Decodes and validates a GraphQL `ConversationMute`. Malformed values throw a [FormatException].
  factory ConversationMute.fromJson(Object? json) => _decodeConversationMute(json, r'$');

  final String conversationId;

  final String principalId;

  final bool muted;

  final String? until;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'principalId': principalId,
        'muted': muted,
        'until': until,
      };
}

ConversationMute _decodeConversationMute(Object? value, String path) {
  final map = _object(value, path);
  return ConversationMute(
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    principalId: _scalarUuid(_get(map, path, 'principalId'), '$path.principalId'),
    muted: _scalarBoolean(_get(map, path, 'muted'), '$path.muted'),
    until: _n(_get(map, path, 'until'), '$path.until', _scalarString),
  );
}

final class ConversationMuteReply {
  const ConversationMuteReply({
    required this.status,
    required this.requestId,
    required this.serverTime,
    required this.result,
  });

  /// Decodes and validates a GraphQL `ConversationMuteReply`. Malformed values throw a [FormatException].
  factory ConversationMuteReply.fromJson(Object? json) => _decodeConversationMuteReply(json, r'$');

  final String status;

  final String requestId;

  final String serverTime;

  final ConversationMute result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'result': result.toJson(),
      };
}

ConversationMuteReply _decodeConversationMuteReply(Object? value, String path) {
  final map = _object(value, path);
  return ConversationMuteReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _scalarString(_get(map, path, 'serverTime'), '$path.serverTime'),
    result: _decodeConversationMute(_get(map, path, 'result'), '$path.result'),
  );
}

final class CredentialDelivery {
  const CredentialDelivery({
    required this.deliveryId,
    required this.kind,
    required this.projectId,
    required this.installationId,
    this.resourceRef,
    required this.expiresAt,
    required this.payloadDigest,
    this.recipientActorRef,
  });

  /// Decodes and validates a GraphQL `CredentialDelivery`. Malformed values throw a [FormatException].
  factory CredentialDelivery.fromJson(Object? json) => _decodeCredentialDelivery(json, r'$');

  final String deliveryId;

  final String kind;

  final String projectId;

  final String installationId;

  final ResourceRef? resourceRef;

  final String expiresAt;

  final String payloadDigest;

  final ActorRef? recipientActorRef;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'deliveryId': deliveryId,
        'kind': kind,
        'projectId': projectId,
        'installationId': installationId,
        'resourceRef': resourceRef?.toJson(),
        'expiresAt': expiresAt,
        'payloadDigest': payloadDigest,
        'recipientActorRef': recipientActorRef?.toJson(),
      };
}

CredentialDelivery _decodeCredentialDelivery(Object? value, String path) {
  final map = _object(value, path);
  return CredentialDelivery(
    deliveryId: _scalarUuid(_get(map, path, 'deliveryId'), '$path.deliveryId'),
    kind: _scalarString(_get(map, path, 'kind'), '$path.kind'),
    projectId: _scalarUuid(_get(map, path, 'projectId'), '$path.projectId'),
    installationId: _scalarString(_get(map, path, 'installationId'), '$path.installationId'),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    expiresAt: _scalarString(_get(map, path, 'expiresAt'), '$path.expiresAt'),
    payloadDigest: _scalarString(_get(map, path, 'payloadDigest'), '$path.payloadDigest'),
    recipientActorRef: _n(_get(map, path, 'recipientActorRef'), '$path.recipientActorRef', _decodeActorRef),
  );
}

final class CredentialDeliveryReceipt {
  const CredentialDeliveryReceipt({
    required this.deliveryId,
  });

  /// Decodes and validates a GraphQL `CredentialDeliveryReceipt`. Malformed values throw a [FormatException].
  factory CredentialDeliveryReceipt.fromJson(Object? json) => _decodeCredentialDeliveryReceipt(json, r'$');

  final String deliveryId;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'deliveryId': deliveryId,
      };
}

CredentialDeliveryReceipt _decodeCredentialDeliveryReceipt(Object? value, String path) {
  final map = _object(value, path);
  return CredentialDeliveryReceipt(
    deliveryId: _scalarUuid(_get(map, path, 'deliveryId'), '$path.deliveryId'),
  );
}

final class CurrentLiveSessionReply {
  const CurrentLiveSessionReply({
    required this.status,
    required this.requestId,
    required this.serverTime,
    this.result,
  });

  /// Decodes and validates a GraphQL `CurrentLiveSessionReply`. Malformed values throw a [FormatException].
  factory CurrentLiveSessionReply.fromJson(Object? json) => _decodeCurrentLiveSessionReply(json, r'$');

  final String status;

  final String requestId;

  final String serverTime;

  final LiveSession? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'result': result?.toJson(),
      };
}

CurrentLiveSessionReply _decodeCurrentLiveSessionReply(Object? value, String path) {
  final map = _object(value, path);
  return CurrentLiveSessionReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _scalarString(_get(map, path, 'serverTime'), '$path.serverTime'),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeLiveSession),
  );
}

final class CurrentSessionReply {
  const CurrentSessionReply({
    required this.status,
    required this.requestId,
    required this.serverTime,
    required this.result,
  });

  /// Decodes and validates a GraphQL `CurrentSessionReply`. Malformed values throw a [FormatException].
  factory CurrentSessionReply.fromJson(Object? json) => _decodeCurrentSessionReply(json, r'$');

  final String status;

  final String requestId;

  final String serverTime;

  final Session result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'result': result.toJson(),
      };
}

CurrentSessionReply _decodeCurrentSessionReply(Object? value, String path) {
  final map = _object(value, path);
  return CurrentSessionReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _scalarString(_get(map, path, 'serverTime'), '$path.serverTime'),
    result: _decodeSession(_get(map, path, 'result'), '$path.result'),
  );
}

final class Cursor {
  const Cursor({
    required this.incarnation,
    required this.conversationId,
    required this.sequence,
  });

  /// Decodes and validates a GraphQL `Cursor`. Malformed values throw a [FormatException].
  factory Cursor.fromJson(Object? json) => _decodeCursor(json, r'$');

  final String incarnation;

  final String conversationId;

  final String sequence;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'incarnation': incarnation,
        'conversationId': conversationId,
        'sequence': sequence,
      };
}

Cursor _decodeCursor(Object? value, String path) {
  final map = _object(value, path);
  return Cursor(
    incarnation: _scalarUuid(_get(map, path, 'incarnation'), '$path.incarnation'),
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    sequence: _scalarDecimal(_get(map, path, 'sequence'), '$path.sequence'),
  );
}

final class CutoffScope {
  const CutoffScope({
    required this.kind,
    this.principalId,
    this.sessionId,
    this.deviceId,
    this.callId,
  });

  /// Decodes and validates a GraphQL `CutoffScope`. Malformed values throw a [FormatException].
  factory CutoffScope.fromJson(Object? json) => _decodeCutoffScope(json, r'$');

  final String kind;

  final String? principalId;

  final String? sessionId;

  final String? deviceId;

  final String? callId;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'kind': kind,
        'principalId': principalId,
        'sessionId': sessionId,
        'deviceId': deviceId,
        'callId': callId,
      };
}

CutoffScope _decodeCutoffScope(Object? value, String path) {
  final map = _object(value, path);
  return CutoffScope(
    kind: _scalarString(_get(map, path, 'kind'), '$path.kind'),
    principalId: _n(_get(map, path, 'principalId'), '$path.principalId', _scalarUuid),
    sessionId: _n(_get(map, path, 'sessionId'), '$path.sessionId', _scalarUuid),
    deviceId: _n(_get(map, path, 'deviceId'), '$path.deviceId', _scalarUuid),
    callId: _n(_get(map, path, 'callId'), '$path.callId', _scalarUuid),
  );
}

final class DeleteMessageReply {
  const DeleteMessageReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `DeleteMessageReply`. Malformed values throw a [FormatException].
  factory DeleteMessageReply.fromJson(Object? json) => _decodeDeleteMessageReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final Message? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

DeleteMessageReply _decodeDeleteMessageReply(Object? value, String path) {
  final map = _object(value, path);
  return DeleteMessageReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeMessage),
  );
}

final class DeliveryAck {
  const DeliveryAck({
    required this.deliveryId,
    required this.acknowledged,
  });

  /// Decodes and validates a GraphQL `DeliveryAck`. Malformed values throw a [FormatException].
  factory DeliveryAck.fromJson(Object? json) => _decodeDeliveryAck(json, r'$');

  final String deliveryId;

  final bool acknowledged;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'deliveryId': deliveryId,
        'acknowledged': acknowledged,
      };
}

DeliveryAck _decodeDeliveryAck(Object? value, String path) {
  final map = _object(value, path);
  return DeliveryAck(
    deliveryId: _scalarUuid(_get(map, path, 'deliveryId'), '$path.deliveryId'),
    acknowledged: _scalarBoolean(_get(map, path, 'acknowledged'), '$path.acknowledged'),
  );
}

final class EditMessageReply {
  const EditMessageReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `EditMessageReply`. Malformed values throw a [FormatException].
  factory EditMessageReply.fromJson(Object? json) => _decodeEditMessageReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final Message? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

EditMessageReply _decodeEditMessageReply(Object? value, String path) {
  final map = _object(value, path);
  return EditMessageReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeMessage),
  );
}

final class EndLiveSessionPayload {
  const EndLiveSessionPayload({
    required this.status,
    required this.requestId,
    required this.receiptId,
    required this.committedAt,
    required this.replayed,
    required this.operation,
    required this.result,
  });

  /// Decodes and validates a GraphQL `EndLiveSessionPayload`. Malformed values throw a [FormatException].
  factory EndLiveSessionPayload.fromJson(Object? json) => _decodeEndLiveSessionPayload(json, r'$');

  final String status;

  final String requestId;

  final String receiptId;

  final String committedAt;

  final bool replayed;

  final OperationRef operation;

  final LiveSessionEndRequested result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation.toJson(),
        'result': result.toJson(),
      };
}

EndLiveSessionPayload _decodeEndLiveSessionPayload(Object? value, String path) {
  final map = _object(value, path);
  return EndLiveSessionPayload(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    receiptId: _scalarUuid(_get(map, path, 'receiptId'), '$path.receiptId'),
    committedAt: _scalarString(_get(map, path, 'committedAt'), '$path.committedAt'),
    replayed: _scalarBoolean(_get(map, path, 'replayed'), '$path.replayed'),
    operation: _decodeOperationRef(_get(map, path, 'operation'), '$path.operation'),
    result: _decodeLiveSessionEndRequested(_get(map, path, 'result'), '$path.result'),
  );
}

final class Event {
  const Event({
    required this.eventId,
    required this.conversationId,
    required this.sequence,
    required this.type,
    required this.occurredAt,
    this.subjectRef,
    this.payload,
  });

  /// Decodes and validates a GraphQL `Event`. Malformed values throw a [FormatException].
  factory Event.fromJson(Object? json) => _decodeEvent(json, r'$');

  final String eventId;

  final String conversationId;

  final String sequence;

  final String type;

  final String occurredAt;

  final ResourceRef? subjectRef;

  final EventPayload? payload;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'eventId': eventId,
        'conversationId': conversationId,
        'sequence': sequence,
        'type': type,
        'occurredAt': occurredAt,
        'subjectRef': subjectRef?.toJson(),
        'payload': payload?.toJson(),
      };
}

Event _decodeEvent(Object? value, String path) {
  final map = _object(value, path);
  return Event(
    eventId: _scalarUuid(_get(map, path, 'eventId'), '$path.eventId'),
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    sequence: _scalarDecimal(_get(map, path, 'sequence'), '$path.sequence'),
    type: _scalarString(_get(map, path, 'type'), '$path.type'),
    occurredAt: _scalarString(_get(map, path, 'occurredAt'), '$path.occurredAt'),
    subjectRef: _n(_get(map, path, 'subjectRef'), '$path.subjectRef', _decodeResourceRef),
    payload: _n(_get(map, path, 'payload'), '$path.payload', _decodeEventPayload),
  );
}

final class EventPage {
  const EventPage({
    required this.items,
    required this.complete,
    required this.refreshRequired,
    this.nextCursor,
  });

  /// Decodes and validates a GraphQL `EventPage`. Malformed values throw a [FormatException].
  factory EventPage.fromJson(Object? json) => _decodeEventPage(json, r'$');

  final List<Event> items;

  final bool complete;

  final bool refreshRequired;

  final Cursor? nextCursor;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'complete': complete,
        'refreshRequired': refreshRequired,
        'nextCursor': nextCursor?.toJson(),
      };
}

EventPage _decodeEventPage(Object? value, String path) {
  final map = _object(value, path);
  return EventPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeEvent),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _decodeCursor),
  );
}

final class EventPayload {
  const EventPayload({
    this.messageId,
    this.revision,
    this.revisionSequence,
    this.principalId,
    this.membershipEpoch,
    this.visibilityEpoch,
    this.kind,
    this.throughSequence,
    this.callId,
    this.generation,
    this.state,
    this.cutoffEvidence,
    this.liveSessionId,
  });

  /// Decodes and validates a GraphQL `EventPayload`. Malformed values throw a [FormatException].
  factory EventPayload.fromJson(Object? json) => _decodeEventPayload(json, r'$');

  final String? messageId;

  final String? revision;

  final String? revisionSequence;

  final String? principalId;

  final String? membershipEpoch;

  final String? visibilityEpoch;

  final String? kind;

  final String? throughSequence;

  final String? callId;

  final String? generation;

  final String? state;

  final String? cutoffEvidence;

  final String? liveSessionId;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'messageId': messageId,
        'revision': revision,
        'revisionSequence': revisionSequence,
        'principalId': principalId,
        'membershipEpoch': membershipEpoch,
        'visibilityEpoch': visibilityEpoch,
        'kind': kind,
        'throughSequence': throughSequence,
        'callId': callId,
        'generation': generation,
        'state': state,
        'cutoffEvidence': cutoffEvidence,
        'liveSessionId': liveSessionId,
      };
}

EventPayload _decodeEventPayload(Object? value, String path) {
  final map = _object(value, path);
  return EventPayload(
    messageId: _n(_get(map, path, 'messageId'), '$path.messageId', _scalarUuid),
    revision: _n(_get(map, path, 'revision'), '$path.revision', _scalarDecimal),
    revisionSequence: _n(_get(map, path, 'revisionSequence'), '$path.revisionSequence', _scalarDecimal),
    principalId: _n(_get(map, path, 'principalId'), '$path.principalId', _scalarUuid),
    membershipEpoch: _n(_get(map, path, 'membershipEpoch'), '$path.membershipEpoch', _scalarDecimal),
    visibilityEpoch: _n(_get(map, path, 'visibilityEpoch'), '$path.visibilityEpoch', _scalarDecimal),
    kind: _n(_get(map, path, 'kind'), '$path.kind', _scalarString),
    throughSequence: _n(_get(map, path, 'throughSequence'), '$path.throughSequence', _scalarDecimal),
    callId: _n(_get(map, path, 'callId'), '$path.callId', _scalarUuid),
    generation: _n(_get(map, path, 'generation'), '$path.generation', _scalarDecimal),
    state: _n(_get(map, path, 'state'), '$path.state', _scalarString),
    cutoffEvidence: _n(_get(map, path, 'cutoffEvidence'), '$path.cutoffEvidence', _scalarString),
    liveSessionId: _n(_get(map, path, 'liveSessionId'), '$path.liveSessionId', _scalarUuid),
  );
}

final class EventsReply {
  const EventsReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `EventsReply`. Malformed values throw a [FormatException].
  factory EventsReply.fromJson(Object? json) => _decodeEventsReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final EventPage? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

EventsReply _decodeEventsReply(Object? value, String path) {
  final map = _object(value, path);
  return EventsReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeEventPage),
  );
}

final class Features {
  const Features({
    required this.chat,
    required this.inbox,
    required this.lexicalSearch,
    required this.typing,
    required this.webhooks,
    required this.liveSessions,
    required this.liveBroadcast,
  });

  /// Decodes and validates a GraphQL `Features`. Malformed values throw a [FormatException].
  factory Features.fromJson(Object? json) => _decodeFeatures(json, r'$');

  final bool chat;

  final bool inbox;

  final bool lexicalSearch;

  final bool typing;

  final bool webhooks;

  final bool liveSessions;

  final bool liveBroadcast;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'chat': chat,
        'inbox': inbox,
        'lexicalSearch': lexicalSearch,
        'typing': typing,
        'webhooks': webhooks,
        'liveSessions': liveSessions,
        'liveBroadcast': liveBroadcast,
      };
}

Features _decodeFeatures(Object? value, String path) {
  final map = _object(value, path);
  return Features(
    chat: _scalarBoolean(_get(map, path, 'chat'), '$path.chat'),
    inbox: _scalarBoolean(_get(map, path, 'inbox'), '$path.inbox'),
    lexicalSearch: _scalarBoolean(_get(map, path, 'lexicalSearch'), '$path.lexicalSearch'),
    typing: _scalarBoolean(_get(map, path, 'typing'), '$path.typing'),
    webhooks: _scalarBoolean(_get(map, path, 'webhooks'), '$path.webhooks'),
    liveSessions: _scalarBoolean(_get(map, path, 'liveSessions'), '$path.liveSessions'),
    liveBroadcast: _scalarBoolean(_get(map, path, 'liveBroadcast'), '$path.liveBroadcast'),
  );
}

final class GetConversationReply {
  const GetConversationReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `GetConversationReply`. Malformed values throw a [FormatException].
  factory GetConversationReply.fromJson(Object? json) => _decodeGetConversationReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final Conversation? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

GetConversationReply _decodeGetConversationReply(Object? value, String path) {
  final map = _object(value, path);
  return GetConversationReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeConversation),
  );
}

final class GetMessageReply {
  const GetMessageReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `GetMessageReply`. Malformed values throw a [FormatException].
  factory GetMessageReply.fromJson(Object? json) => _decodeGetMessageReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final Message? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

GetMessageReply _decodeGetMessageReply(Object? value, String path) {
  final map = _object(value, path);
  return GetMessageReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeMessage),
  );
}

final class GetOperationReply {
  const GetOperationReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `GetOperationReply`. Malformed values throw a [FormatException].
  factory GetOperationReply.fromJson(Object? json) => _decodeGetOperationReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final Operation? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

GetOperationReply _decodeGetOperationReply(Object? value, String path) {
  final map = _object(value, path);
  return GetOperationReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeOperation),
  );
}

final class InboxItem {
  const InboxItem({
    required this.conversationId,
    required this.title,
    this.activityAt,
    required this.visibilityEpoch,
    this.latestVisibleMessage,
    required this.hasUnread,
  });

  /// Decodes and validates a GraphQL `InboxItem`. Malformed values throw a [FormatException].
  factory InboxItem.fromJson(Object? json) => _decodeInboxItem(json, r'$');

  final String conversationId;

  final String title;

  final String? activityAt;

  final String visibilityEpoch;

  final Message? latestVisibleMessage;

  final bool hasUnread;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'title': title,
        'activityAt': activityAt,
        'visibilityEpoch': visibilityEpoch,
        'latestVisibleMessage': latestVisibleMessage?.toJson(),
        'hasUnread': hasUnread,
      };
}

InboxItem _decodeInboxItem(Object? value, String path) {
  final map = _object(value, path);
  return InboxItem(
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    title: _scalarString(_get(map, path, 'title'), '$path.title'),
    activityAt: _n(_get(map, path, 'activityAt'), '$path.activityAt', _scalarString),
    visibilityEpoch: _scalarDecimal(_get(map, path, 'visibilityEpoch'), '$path.visibilityEpoch'),
    latestVisibleMessage: _n(_get(map, path, 'latestVisibleMessage'), '$path.latestVisibleMessage', _decodeMessage),
    hasUnread: _scalarBoolean(_get(map, path, 'hasUnread'), '$path.hasUnread'),
  );
}

final class InboxPage {
  const InboxPage({
    required this.items,
    required this.complete,
    required this.refreshRequired,
    this.nextCursor,
    this.partialReason,
  });

  /// Decodes and validates a GraphQL `InboxPage`. Malformed values throw a [FormatException].
  factory InboxPage.fromJson(Object? json) => _decodeInboxPage(json, r'$');

  final List<InboxItem> items;

  final bool complete;

  final bool refreshRequired;

  final String? nextCursor;

  final String? partialReason;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'complete': complete,
        'refreshRequired': refreshRequired,
        'nextCursor': nextCursor,
        'partialReason': partialReason,
      };
}

InboxPage _decodeInboxPage(Object? value, String path) {
  final map = _object(value, path);
  return InboxPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeInboxItem),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
    partialReason: _n(_get(map, path, 'partialReason'), '$path.partialReason', _scalarString),
  );
}

final class InboxReply {
  const InboxReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `InboxReply`. Malformed values throw a [FormatException].
  factory InboxReply.fromJson(Object? json) => _decodeInboxReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final InboxPage? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

InboxReply _decodeInboxReply(Object? value, String path) {
  final map = _object(value, path);
  return InboxReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeInboxPage),
  );
}

final class JoinLiveSessionPayload {
  const JoinLiveSessionPayload({
    required this.status,
    required this.requestId,
    required this.receiptId,
    required this.committedAt,
    required this.replayed,
    required this.result,
  });

  /// Decodes and validates a GraphQL `JoinLiveSessionPayload`. Malformed values throw a [FormatException].
  factory JoinLiveSessionPayload.fromJson(Object? json) => _decodeJoinLiveSessionPayload(json, r'$');

  final String status;

  final String requestId;

  final String receiptId;

  final String committedAt;

  final bool replayed;

  final LiveSessionJoined result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'result': result.toJson(),
      };
}

JoinLiveSessionPayload _decodeJoinLiveSessionPayload(Object? value, String path) {
  final map = _object(value, path);
  return JoinLiveSessionPayload(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    receiptId: _scalarUuid(_get(map, path, 'receiptId'), '$path.receiptId'),
    committedAt: _scalarString(_get(map, path, 'committedAt'), '$path.committedAt'),
    replayed: _scalarBoolean(_get(map, path, 'replayed'), '$path.replayed'),
    result: _decodeLiveSessionJoined(_get(map, path, 'result'), '$path.result'),
  );
}

final class LeaveLiveSessionPayload {
  const LeaveLiveSessionPayload({
    required this.status,
    required this.requestId,
    required this.receiptId,
    required this.committedAt,
    required this.replayed,
    required this.result,
  });

  /// Decodes and validates a GraphQL `LeaveLiveSessionPayload`. Malformed values throw a [FormatException].
  factory LeaveLiveSessionPayload.fromJson(Object? json) => _decodeLeaveLiveSessionPayload(json, r'$');

  final String status;

  final String requestId;

  final String receiptId;

  final String committedAt;

  final bool replayed;

  final LiveSessionLeft result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'result': result.toJson(),
      };
}

LeaveLiveSessionPayload _decodeLeaveLiveSessionPayload(Object? value, String path) {
  final map = _object(value, path);
  return LeaveLiveSessionPayload(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    receiptId: _scalarUuid(_get(map, path, 'receiptId'), '$path.receiptId'),
    committedAt: _scalarString(_get(map, path, 'committedAt'), '$path.committedAt'),
    replayed: _scalarBoolean(_get(map, path, 'replayed'), '$path.replayed'),
    result: _decodeLiveSessionLeft(_get(map, path, 'result'), '$path.result'),
  );
}

final class Limit {
  const Limit({
    this.maximum,
    this.unit,
    this.scope,
    this.milliseconds,
    this.policyId,
    this.revision,
  });

  /// Decodes and validates a GraphQL `Limit`. Malformed values throw a [FormatException].
  factory Limit.fromJson(Object? json) => _decodeLimit(json, r'$');

  final String? maximum;

  final String? unit;

  final String? scope;

  final String? milliseconds;

  final String? policyId;

  final String? revision;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'maximum': maximum,
        'unit': unit,
        'scope': scope,
        'milliseconds': milliseconds,
        'policyId': policyId,
        'revision': revision,
      };
}

Limit _decodeLimit(Object? value, String path) {
  final map = _object(value, path);
  return Limit(
    maximum: _n(_get(map, path, 'maximum'), '$path.maximum', _scalarDecimal),
    unit: _n(_get(map, path, 'unit'), '$path.unit', _scalarString),
    scope: _n(_get(map, path, 'scope'), '$path.scope', _scalarString),
    milliseconds: _n(_get(map, path, 'milliseconds'), '$path.milliseconds', _scalarDecimal),
    policyId: _n(_get(map, path, 'policyId'), '$path.policyId', _scalarString),
    revision: _n(_get(map, path, 'revision'), '$path.revision', _scalarDecimal),
  );
}

final class LimitEntry {
  const LimitEntry({
    required this.key,
    required this.value,
  });

  /// Decodes and validates a GraphQL `LimitEntry`. Malformed values throw a [FormatException].
  factory LimitEntry.fromJson(Object? json) => _decodeLimitEntry(json, r'$');

  final String key;

  final Limit value;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'key': key,
        'value': value.toJson(),
      };
}

LimitEntry _decodeLimitEntry(Object? value, String path) {
  final map = _object(value, path);
  return LimitEntry(
    key: _scalarString(_get(map, path, 'key'), '$path.key'),
    value: _decodeLimit(_get(map, path, 'value'), '$path.value'),
  );
}

final class LiveAlert {
  const LiveAlert({
    required this.alertId,
    required this.liveSessionId,
    required this.conversationId,
    required this.generation,
    required this.membershipEpoch,
    required this.createdAt,
    required this.expiresAt,
  });

  /// Decodes and validates a GraphQL `LiveAlert`. Malformed values throw a [FormatException].
  factory LiveAlert.fromJson(Object? json) => _decodeLiveAlert(json, r'$');

  final String alertId;

  final String liveSessionId;

  final String conversationId;

  final String generation;

  final String membershipEpoch;

  final String createdAt;

  final String expiresAt;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'alertId': alertId,
        'liveSessionId': liveSessionId,
        'conversationId': conversationId,
        'generation': generation,
        'membershipEpoch': membershipEpoch,
        'createdAt': createdAt,
        'expiresAt': expiresAt,
      };
}

LiveAlert _decodeLiveAlert(Object? value, String path) {
  final map = _object(value, path);
  return LiveAlert(
    alertId: _scalarUuid(_get(map, path, 'alertId'), '$path.alertId'),
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    generation: _scalarDecimal(_get(map, path, 'generation'), '$path.generation'),
    membershipEpoch: _scalarDecimal(_get(map, path, 'membershipEpoch'), '$path.membershipEpoch'),
    createdAt: _scalarString(_get(map, path, 'createdAt'), '$path.createdAt'),
    expiresAt: _scalarString(_get(map, path, 'expiresAt'), '$path.expiresAt'),
  );
}

final class LiveAlertBatch {
  const LiveAlertBatch({
    required this.liveSessionId,
    required this.created,
    required this.suppressed,
  });

  /// Decodes and validates a GraphQL `LiveAlertBatch`. Malformed values throw a [FormatException].
  factory LiveAlertBatch.fromJson(Object? json) => _decodeLiveAlertBatch(json, r'$');

  final String liveSessionId;

  final String created;

  final String suppressed;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'created': created,
        'suppressed': suppressed,
      };
}

LiveAlertBatch _decodeLiveAlertBatch(Object? value, String path) {
  final map = _object(value, path);
  return LiveAlertBatch(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    created: _scalarDecimal(_get(map, path, 'created'), '$path.created'),
    suppressed: _scalarDecimal(_get(map, path, 'suppressed'), '$path.suppressed'),
  );
}

final class LiveAlertPage {
  const LiveAlertPage({
    required this.items,
    this.nextCursor,
    required this.complete,
    this.partialReason,
    required this.refreshRequired,
  });

  /// Decodes and validates a GraphQL `LiveAlertPage`. Malformed values throw a [FormatException].
  factory LiveAlertPage.fromJson(Object? json) => _decodeLiveAlertPage(json, r'$');

  final List<LiveAlert> items;

  final String? nextCursor;

  final bool complete;

  final String? partialReason;

  final bool refreshRequired;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'nextCursor': nextCursor,
        'complete': complete,
        'partialReason': partialReason,
        'refreshRequired': refreshRequired,
      };
}

LiveAlertPage _decodeLiveAlertPage(Object? value, String path) {
  final map = _object(value, path);
  return LiveAlertPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeLiveAlert),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    partialReason: _n(_get(map, path, 'partialReason'), '$path.partialReason', _scalarString),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
  );
}

final class LiveAlertPageReply {
  const LiveAlertPageReply({
    required this.status,
    required this.requestId,
    required this.serverTime,
    required this.result,
  });

  /// Decodes and validates a GraphQL `LiveAlertPageReply`. Malformed values throw a [FormatException].
  factory LiveAlertPageReply.fromJson(Object? json) => _decodeLiveAlertPageReply(json, r'$');

  final String status;

  final String requestId;

  final String serverTime;

  final LiveAlertPage result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'result': result.toJson(),
      };
}

LiveAlertPageReply _decodeLiveAlertPageReply(Object? value, String path) {
  final map = _object(value, path);
  return LiveAlertPageReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _scalarString(_get(map, path, 'serverTime'), '$path.serverTime'),
    result: _decodeLiveAlertPage(_get(map, path, 'result'), '$path.result'),
  );
}

final class LiveConnectionGrant {
  const LiveConnectionGrant({
    required this.liveSessionId,
    required this.participationId,
    required this.generation,
    required this.roomName,
    required this.participantIdentity,
    required this.livekitUrl,
    required this.transportToken,
    required this.admissionTicket,
    required this.forwardingLease,
    required this.transportExpiresAt,
    required this.admissionExpiresAt,
    required this.leaseExpiresAt,
    required this.leasePolicyId,
    required this.connectToken,
  });

  /// Decodes and validates a GraphQL `LiveConnectionGrant`. Malformed values throw a [FormatException].
  factory LiveConnectionGrant.fromJson(Object? json) => _decodeLiveConnectionGrant(json, r'$');

  final String liveSessionId;

  final String participationId;

  final String generation;

  final String roomName;

  final String participantIdentity;

  final String livekitUrl;

  final String transportToken;

  final Map<String, Object?> admissionTicket;

  final Map<String, Object?> forwardingLease;

  final String transportExpiresAt;

  final String admissionExpiresAt;

  final String leaseExpiresAt;

  final String leasePolicyId;

  final String connectToken;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'participationId': participationId,
        'generation': generation,
        'roomName': roomName,
        'participantIdentity': participantIdentity,
        'livekitUrl': livekitUrl,
        'transportToken': transportToken,
        'admissionTicket': admissionTicket,
        'forwardingLease': forwardingLease,
        'transportExpiresAt': transportExpiresAt,
        'admissionExpiresAt': admissionExpiresAt,
        'leaseExpiresAt': leaseExpiresAt,
        'leasePolicyId': leasePolicyId,
        'connectToken': connectToken,
      };
}

LiveConnectionGrant _decodeLiveConnectionGrant(Object? value, String path) {
  final map = _object(value, path);
  return LiveConnectionGrant(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    participationId: _scalarUuid(_get(map, path, 'participationId'), '$path.participationId'),
    generation: _scalarDecimal(_get(map, path, 'generation'), '$path.generation'),
    roomName: _scalarString(_get(map, path, 'roomName'), '$path.roomName'),
    participantIdentity: _scalarString(_get(map, path, 'participantIdentity'), '$path.participantIdentity'),
    livekitUrl: _scalarString(_get(map, path, 'livekitUrl'), '$path.livekitUrl'),
    transportToken: _scalarString(_get(map, path, 'transportToken'), '$path.transportToken'),
    admissionTicket: _scalarSignedProof(_get(map, path, 'admissionTicket'), '$path.admissionTicket'),
    forwardingLease: _scalarSignedProof(_get(map, path, 'forwardingLease'), '$path.forwardingLease'),
    transportExpiresAt: _scalarString(_get(map, path, 'transportExpiresAt'), '$path.transportExpiresAt'),
    admissionExpiresAt: _scalarString(_get(map, path, 'admissionExpiresAt'), '$path.admissionExpiresAt'),
    leaseExpiresAt: _scalarString(_get(map, path, 'leaseExpiresAt'), '$path.leaseExpiresAt'),
    leasePolicyId: _scalarString(_get(map, path, 'leasePolicyId'), '$path.leasePolicyId'),
    connectToken: _scalarString(_get(map, path, 'connectToken'), '$path.connectToken'),
  );
}

final class LiveCredentialIssuance {
  const LiveCredentialIssuance({
    required this.liveSessionId,
    required this.participationId,
    required this.generation,
    required this.leaseId,
    required this.grantOrdinal,
    required this.admissionExpiresAt,
    required this.leaseExpiresAt,
  });

  /// Decodes and validates a GraphQL `LiveCredentialIssuance`. Malformed values throw a [FormatException].
  factory LiveCredentialIssuance.fromJson(Object? json) => _decodeLiveCredentialIssuance(json, r'$');

  final String liveSessionId;

  final String participationId;

  final String generation;

  final String leaseId;

  final String grantOrdinal;

  final String admissionExpiresAt;

  final String leaseExpiresAt;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'participationId': participationId,
        'generation': generation,
        'leaseId': leaseId,
        'grantOrdinal': grantOrdinal,
        'admissionExpiresAt': admissionExpiresAt,
        'leaseExpiresAt': leaseExpiresAt,
      };
}

LiveCredentialIssuance _decodeLiveCredentialIssuance(Object? value, String path) {
  final map = _object(value, path);
  return LiveCredentialIssuance(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    participationId: _scalarUuid(_get(map, path, 'participationId'), '$path.participationId'),
    generation: _scalarDecimal(_get(map, path, 'generation'), '$path.generation'),
    leaseId: _scalarUuid(_get(map, path, 'leaseId'), '$path.leaseId'),
    grantOrdinal: _scalarDecimal(_get(map, path, 'grantOrdinal'), '$path.grantOrdinal'),
    admissionExpiresAt: _scalarString(_get(map, path, 'admissionExpiresAt'), '$path.admissionExpiresAt'),
    leaseExpiresAt: _scalarString(_get(map, path, 'leaseExpiresAt'), '$path.leaseExpiresAt'),
  );
}

final class LiveCutoffScope {
  const LiveCutoffScope({
    required this.kind,
    required this.liveSessionId,
    required this.generation,
    this.participationId,
  });

  /// Decodes and validates a GraphQL `LiveCutoffScope`. Malformed values throw a [FormatException].
  factory LiveCutoffScope.fromJson(Object? json) => _decodeLiveCutoffScope(json, r'$');

  final LiveCutoffScopeKind kind;

  final String liveSessionId;

  final String generation;

  final String? participationId;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'kind': kind.wire,
        'liveSessionId': liveSessionId,
        'generation': generation,
        'participationId': participationId,
      };
}

LiveCutoffScope _decodeLiveCutoffScope(Object? value, String path) {
  final map = _object(value, path);
  return LiveCutoffScope(
    kind: _decodeLiveCutoffScopeKind(_get(map, path, 'kind'), '$path.kind'),
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    generation: _scalarDecimal(_get(map, path, 'generation'), '$path.generation'),
    participationId: _n(_get(map, path, 'participationId'), '$path.participationId', _scalarUuid),
  );
}

final class LiveMediaCutoff {
  const LiveMediaCutoff({
    required this.state,
    required this.scope,
    this.evidence,
    this.enforcedAt,
    this.operationId,
  });

  /// Decodes and validates a GraphQL `LiveMediaCutoff`. Malformed values throw a [FormatException].
  factory LiveMediaCutoff.fromJson(Object? json) => _decodeLiveMediaCutoff(json, r'$');

  final LiveCutoffState state;

  final LiveCutoffScope scope;

  final LiveCutoffEvidence? evidence;

  final String? enforcedAt;

  final String? operationId;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'state': state.wire,
        'scope': scope.toJson(),
        'evidence': evidence?.wire,
        'enforcedAt': enforcedAt,
        'operationId': operationId,
      };
}

LiveMediaCutoff _decodeLiveMediaCutoff(Object? value, String path) {
  final map = _object(value, path);
  return LiveMediaCutoff(
    state: _decodeLiveCutoffState(_get(map, path, 'state'), '$path.state'),
    scope: _decodeLiveCutoffScope(_get(map, path, 'scope'), '$path.scope'),
    evidence: _n(_get(map, path, 'evidence'), '$path.evidence', _decodeLiveCutoffEvidence),
    enforcedAt: _n(_get(map, path, 'enforcedAt'), '$path.enforcedAt', _scalarString),
    operationId: _n(_get(map, path, 'operationId'), '$path.operationId', _scalarUuid),
  );
}

final class LiveMediaPermissions {
  const LiveMediaPermissions({
    required this.microphone,
    required this.camera,
    required this.subscribe,
  });

  /// Decodes and validates a GraphQL `LiveMediaPermissions`. Malformed values throw a [FormatException].
  factory LiveMediaPermissions.fromJson(Object? json) => _decodeLiveMediaPermissions(json, r'$');

  final bool microphone;

  final bool camera;

  final bool subscribe;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'microphone': microphone,
        'camera': camera,
        'subscribe': subscribe,
      };
}

LiveMediaPermissions _decodeLiveMediaPermissions(Object? value, String path) {
  final map = _object(value, path);
  return LiveMediaPermissions(
    microphone: _scalarBoolean(_get(map, path, 'microphone'), '$path.microphone'),
    camera: _scalarBoolean(_get(map, path, 'camera'), '$path.camera'),
    subscribe: _scalarBoolean(_get(map, path, 'subscribe'), '$path.subscribe'),
  );
}

final class LiveOperationFailure {
  const LiveOperationFailure({
    required this.code,
    required this.message,
  });

  /// Decodes and validates a GraphQL `LiveOperationFailure`. Malformed values throw a [FormatException].
  factory LiveOperationFailure.fromJson(Object? json) => _decodeLiveOperationFailure(json, r'$');

  final LiveErrorCode code;

  final String message;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'code': code.wire,
        'message': message,
      };
}

LiveOperationFailure _decodeLiveOperationFailure(Object? value, String path) {
  final map = _object(value, path);
  return LiveOperationFailure(
    code: _decodeLiveErrorCode(_get(map, path, 'code'), '$path.code'),
    message: _scalarString(_get(map, path, 'message'), '$path.message'),
  );
}

final class LiveParticipantPage {
  const LiveParticipantPage({
    required this.items,
    this.nextCursor,
    required this.complete,
    this.partialReason,
    required this.refreshRequired,
  });

  /// Decodes and validates a GraphQL `LiveParticipantPage`. Malformed values throw a [FormatException].
  factory LiveParticipantPage.fromJson(Object? json) => _decodeLiveParticipantPage(json, r'$');

  final List<LiveParticipation> items;

  final String? nextCursor;

  final bool complete;

  final String? partialReason;

  final bool refreshRequired;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'nextCursor': nextCursor,
        'complete': complete,
        'partialReason': partialReason,
        'refreshRequired': refreshRequired,
      };
}

LiveParticipantPage _decodeLiveParticipantPage(Object? value, String path) {
  final map = _object(value, path);
  return LiveParticipantPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeLiveParticipation),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    partialReason: _n(_get(map, path, 'partialReason'), '$path.partialReason', _scalarString),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
  );
}

final class LiveParticipantPageReply {
  const LiveParticipantPageReply({
    required this.status,
    required this.requestId,
    required this.serverTime,
    required this.result,
  });

  /// Decodes and validates a GraphQL `LiveParticipantPageReply`. Malformed values throw a [FormatException].
  factory LiveParticipantPageReply.fromJson(Object? json) => _decodeLiveParticipantPageReply(json, r'$');

  final String status;

  final String requestId;

  final String serverTime;

  final LiveParticipantPage result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'result': result.toJson(),
      };
}

LiveParticipantPageReply _decodeLiveParticipantPageReply(Object? value, String path) {
  final map = _object(value, path);
  return LiveParticipantPageReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _scalarString(_get(map, path, 'serverTime'), '$path.serverTime'),
    result: _decodeLiveParticipantPage(_get(map, path, 'result'), '$path.result'),
  );
}

final class LiveParticipation {
  const LiveParticipation({
    required this.participationId,
    required this.principalId,
    required this.membershipEpoch,
    required this.role,
    required this.state,
    required this.permissions,
    this.reservationExpiresAt,
    this.nativeConnectionId,
    this.mediaCutoff,
  });

  /// Decodes and validates a GraphQL `LiveParticipation`. Malformed values throw a [FormatException].
  factory LiveParticipation.fromJson(Object? json) => _decodeLiveParticipation(json, r'$');

  final String participationId;

  final String principalId;

  final String membershipEpoch;

  final LiveRole role;

  final LiveParticipationState state;

  final LiveMediaPermissions permissions;

  final String? reservationExpiresAt;

  final String? nativeConnectionId;

  final LiveMediaCutoff? mediaCutoff;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'participationId': participationId,
        'principalId': principalId,
        'membershipEpoch': membershipEpoch,
        'role': role.wire,
        'state': state.wire,
        'permissions': permissions.toJson(),
        'reservationExpiresAt': reservationExpiresAt,
        'nativeConnectionId': nativeConnectionId,
        'mediaCutoff': mediaCutoff?.toJson(),
      };
}

LiveParticipation _decodeLiveParticipation(Object? value, String path) {
  final map = _object(value, path);
  return LiveParticipation(
    participationId: _scalarUuid(_get(map, path, 'participationId'), '$path.participationId'),
    principalId: _scalarUuid(_get(map, path, 'principalId'), '$path.principalId'),
    membershipEpoch: _scalarDecimal(_get(map, path, 'membershipEpoch'), '$path.membershipEpoch'),
    role: _decodeLiveRole(_get(map, path, 'role'), '$path.role'),
    state: _decodeLiveParticipationState(_get(map, path, 'state'), '$path.state'),
    permissions: _decodeLiveMediaPermissions(_get(map, path, 'permissions'), '$path.permissions'),
    reservationExpiresAt: _n(_get(map, path, 'reservationExpiresAt'), '$path.reservationExpiresAt', _scalarString),
    nativeConnectionId: _n(_get(map, path, 'nativeConnectionId'), '$path.nativeConnectionId', _scalarUuid),
    mediaCutoff: _n(_get(map, path, 'mediaCutoff'), '$path.mediaCutoff', _decodeLiveMediaCutoff),
  );
}

final class LiveSession {
  const LiveSession({
    required this.liveSessionId,
    required this.conversationId,
    required this.creatorId,
    required this.kind,
    required this.mediaProfile,
    required this.state,
    required this.generation,
    required this.revision,
    required this.createdAt,
    required this.expiresAt,
    this.myParticipation,
    this.mediaCutoff,
  });

  /// Decodes and validates a GraphQL `LiveSession`. Malformed values throw a [FormatException].
  factory LiveSession.fromJson(Object? json) => _decodeLiveSession(json, r'$');

  final String liveSessionId;

  final String conversationId;

  final String creatorId;

  final LiveSessionKind kind;

  final LiveMediaProfile mediaProfile;

  final LiveSessionState state;

  final String generation;

  final String revision;

  final String createdAt;

  final String expiresAt;

  final LiveParticipation? myParticipation;

  final LiveMediaCutoff? mediaCutoff;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'conversationId': conversationId,
        'creatorId': creatorId,
        'kind': kind.wire,
        'mediaProfile': mediaProfile.wire,
        'state': state.wire,
        'generation': generation,
        'revision': revision,
        'createdAt': createdAt,
        'expiresAt': expiresAt,
        'myParticipation': myParticipation?.toJson(),
        'mediaCutoff': mediaCutoff?.toJson(),
      };
}

LiveSession _decodeLiveSession(Object? value, String path) {
  final map = _object(value, path);
  return LiveSession(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    creatorId: _scalarUuid(_get(map, path, 'creatorId'), '$path.creatorId'),
    kind: _decodeLiveSessionKind(_get(map, path, 'kind'), '$path.kind'),
    mediaProfile: _decodeLiveMediaProfile(_get(map, path, 'mediaProfile'), '$path.mediaProfile'),
    state: _decodeLiveSessionState(_get(map, path, 'state'), '$path.state'),
    generation: _scalarDecimal(_get(map, path, 'generation'), '$path.generation'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
    createdAt: _scalarString(_get(map, path, 'createdAt'), '$path.createdAt'),
    expiresAt: _scalarString(_get(map, path, 'expiresAt'), '$path.expiresAt'),
    myParticipation: _n(_get(map, path, 'myParticipation'), '$path.myParticipation', _decodeLiveParticipation),
    mediaCutoff: _n(_get(map, path, 'mediaCutoff'), '$path.mediaCutoff', _decodeLiveMediaCutoff),
  );
}

final class LiveSessionCredentialsPayload {
  const LiveSessionCredentialsPayload({
    required this.status,
    required this.requestId,
    required this.receiptId,
    required this.committedAt,
    required this.replayed,
    required this.result,
  });

  /// Decodes and validates a GraphQL `LiveSessionCredentialsPayload`. Malformed values throw a [FormatException].
  factory LiveSessionCredentialsPayload.fromJson(Object? json) => _decodeLiveSessionCredentialsPayload(json, r'$');

  final String status;

  final String requestId;

  final String receiptId;

  final String committedAt;

  final bool replayed;

  final LiveConnectionGrant result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'result': result.toJson(),
      };
}

LiveSessionCredentialsPayload _decodeLiveSessionCredentialsPayload(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionCredentialsPayload(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    receiptId: _scalarUuid(_get(map, path, 'receiptId'), '$path.receiptId'),
    committedAt: _scalarString(_get(map, path, 'committedAt'), '$path.committedAt'),
    replayed: _scalarBoolean(_get(map, path, 'replayed'), '$path.replayed'),
    result: _decodeLiveConnectionGrant(_get(map, path, 'result'), '$path.result'),
  );
}

final class LiveSessionEndRequested {
  const LiveSessionEndRequested({
    required this.liveSessionId,
    required this.operationId,
    required this.mediaCutoff,
  });

  /// Decodes and validates a GraphQL `LiveSessionEndRequested`. Malformed values throw a [FormatException].
  factory LiveSessionEndRequested.fromJson(Object? json) => _decodeLiveSessionEndRequested(json, r'$');

  final String liveSessionId;

  final String operationId;

  final LiveMediaCutoff mediaCutoff;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'operationId': operationId,
        'mediaCutoff': mediaCutoff.toJson(),
      };
}

LiveSessionEndRequested _decodeLiveSessionEndRequested(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionEndRequested(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    operationId: _scalarUuid(_get(map, path, 'operationId'), '$path.operationId'),
    mediaCutoff: _decodeLiveMediaCutoff(_get(map, path, 'mediaCutoff'), '$path.mediaCutoff'),
  );
}

final class LiveSessionJoined {
  const LiveSessionJoined({
    required this.liveSessionId,
    required this.generation,
    required this.participation,
  });

  /// Decodes and validates a GraphQL `LiveSessionJoined`. Malformed values throw a [FormatException].
  factory LiveSessionJoined.fromJson(Object? json) => _decodeLiveSessionJoined(json, r'$');

  final String liveSessionId;

  final String generation;

  final LiveParticipation participation;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'generation': generation,
        'participation': participation.toJson(),
      };
}

LiveSessionJoined _decodeLiveSessionJoined(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionJoined(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    generation: _scalarDecimal(_get(map, path, 'generation'), '$path.generation'),
    participation: _decodeLiveParticipation(_get(map, path, 'participation'), '$path.participation'),
  );
}

final class LiveSessionLeft {
  const LiveSessionLeft({
    required this.liveSessionId,
    required this.participationId,
    required this.mediaCutoff,
  });

  /// Decodes and validates a GraphQL `LiveSessionLeft`. Malformed values throw a [FormatException].
  factory LiveSessionLeft.fromJson(Object? json) => _decodeLiveSessionLeft(json, r'$');

  final String liveSessionId;

  final String participationId;

  final LiveMediaCutoff mediaCutoff;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'participationId': participationId,
        'mediaCutoff': mediaCutoff.toJson(),
      };
}

LiveSessionLeft _decodeLiveSessionLeft(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionLeft(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    participationId: _scalarUuid(_get(map, path, 'participationId'), '$path.participationId'),
    mediaCutoff: _decodeLiveMediaCutoff(_get(map, path, 'mediaCutoff'), '$path.mediaCutoff'),
  );
}

final class LiveSessionOperation {
  const LiveSessionOperation({
    required this.operationId,
    required this.requestId,
    required this.liveSessionId,
    required this.kind,
    required this.state,
    required this.revision,
    required this.requestedAt,
    this.completedAt,
    this.completion,
    this.failure,
  });

  /// Decodes and validates a GraphQL `LiveSessionOperation`. Malformed values throw a [FormatException].
  factory LiveSessionOperation.fromJson(Object? json) => _decodeLiveSessionOperation(json, r'$');

  final String operationId;

  final String requestId;

  final String liveSessionId;

  final LiveOperationKind kind;

  final LiveOperationState state;

  final String revision;

  final String requestedAt;

  final String? completedAt;

  final LiveSessionOperationCompletion? completion;

  final LiveOperationFailure? failure;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'operationId': operationId,
        'requestId': requestId,
        'liveSessionId': liveSessionId,
        'kind': kind.wire,
        'state': state.wire,
        'revision': revision,
        'requestedAt': requestedAt,
        'completedAt': completedAt,
        'completion': completion?.toJson(),
        'failure': failure?.toJson(),
      };
}

LiveSessionOperation _decodeLiveSessionOperation(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionOperation(
    operationId: _scalarUuid(_get(map, path, 'operationId'), '$path.operationId'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    kind: _decodeLiveOperationKind(_get(map, path, 'kind'), '$path.kind'),
    state: _decodeLiveOperationState(_get(map, path, 'state'), '$path.state'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
    requestedAt: _scalarString(_get(map, path, 'requestedAt'), '$path.requestedAt'),
    completedAt: _n(_get(map, path, 'completedAt'), '$path.completedAt', _scalarString),
    completion: _n(_get(map, path, 'completion'), '$path.completion', _decodeLiveSessionOperationCompletion),
    failure: _n(_get(map, path, 'failure'), '$path.failure', _decodeLiveOperationFailure),
  );
}

final class LiveSessionOperationCompletion {
  const LiveSessionOperationCompletion({
    required this.liveSessionId,
    required this.generation,
    required this.state,
    required this.revision,
    required this.completedAt,
    this.mediaCutoff,
  });

  /// Decodes and validates a GraphQL `LiveSessionOperationCompletion`. Malformed values throw a [FormatException].
  factory LiveSessionOperationCompletion.fromJson(Object? json) => _decodeLiveSessionOperationCompletion(json, r'$');

  final String liveSessionId;

  final String generation;

  final LiveSessionState state;

  final String revision;

  final String completedAt;

  final LiveMediaCutoff? mediaCutoff;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'generation': generation,
        'state': state.wire,
        'revision': revision,
        'completedAt': completedAt,
        'mediaCutoff': mediaCutoff?.toJson(),
      };
}

LiveSessionOperationCompletion _decodeLiveSessionOperationCompletion(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionOperationCompletion(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    generation: _scalarDecimal(_get(map, path, 'generation'), '$path.generation'),
    state: _decodeLiveSessionState(_get(map, path, 'state'), '$path.state'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
    completedAt: _scalarString(_get(map, path, 'completedAt'), '$path.completedAt'),
    mediaCutoff: _n(_get(map, path, 'mediaCutoff'), '$path.mediaCutoff', _decodeLiveMediaCutoff),
  );
}

final class LiveSessionOperationReply {
  const LiveSessionOperationReply({
    required this.status,
    required this.requestId,
    required this.serverTime,
    required this.result,
  });

  /// Decodes and validates a GraphQL `LiveSessionOperationReply`. Malformed values throw a [FormatException].
  factory LiveSessionOperationReply.fromJson(Object? json) => _decodeLiveSessionOperationReply(json, r'$');

  final String status;

  final String requestId;

  final String serverTime;

  final LiveSessionOperation result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'result': result.toJson(),
      };
}

LiveSessionOperationReply _decodeLiveSessionOperationReply(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionOperationReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _scalarString(_get(map, path, 'serverTime'), '$path.serverTime'),
    result: _decodeLiveSessionOperation(_get(map, path, 'result'), '$path.result'),
  );
}

final class LiveSessionPage {
  const LiveSessionPage({
    required this.items,
    this.nextCursor,
    required this.complete,
    this.partialReason,
    required this.refreshRequired,
  });

  /// Decodes and validates a GraphQL `LiveSessionPage`. Malformed values throw a [FormatException].
  factory LiveSessionPage.fromJson(Object? json) => _decodeLiveSessionPage(json, r'$');

  final List<LiveSession> items;

  final String? nextCursor;

  final bool complete;

  final String? partialReason;

  final bool refreshRequired;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'nextCursor': nextCursor,
        'complete': complete,
        'partialReason': partialReason,
        'refreshRequired': refreshRequired,
      };
}

LiveSessionPage _decodeLiveSessionPage(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeLiveSession),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    partialReason: _n(_get(map, path, 'partialReason'), '$path.partialReason', _scalarString),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
  );
}

final class LiveSessionPageReply {
  const LiveSessionPageReply({
    required this.status,
    required this.requestId,
    required this.serverTime,
    required this.result,
  });

  /// Decodes and validates a GraphQL `LiveSessionPageReply`. Malformed values throw a [FormatException].
  factory LiveSessionPageReply.fromJson(Object? json) => _decodeLiveSessionPageReply(json, r'$');

  final String status;

  final String requestId;

  final String serverTime;

  final LiveSessionPage result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'result': result.toJson(),
      };
}

LiveSessionPageReply _decodeLiveSessionPageReply(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionPageReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _scalarString(_get(map, path, 'serverTime'), '$path.serverTime'),
    result: _decodeLiveSessionPage(_get(map, path, 'result'), '$path.result'),
  );
}

final class LiveSessionReply {
  const LiveSessionReply({
    required this.status,
    required this.requestId,
    required this.serverTime,
    required this.result,
  });

  /// Decodes and validates a GraphQL `LiveSessionReply`. Malformed values throw a [FormatException].
  factory LiveSessionReply.fromJson(Object? json) => _decodeLiveSessionReply(json, r'$');

  final String status;

  final String requestId;

  final String serverTime;

  final LiveSession result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'result': result.toJson(),
      };
}

LiveSessionReply _decodeLiveSessionReply(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _scalarString(_get(map, path, 'serverTime'), '$path.serverTime'),
    result: _decodeLiveSession(_get(map, path, 'result'), '$path.result'),
  );
}

final class LiveSessionStarted {
  const LiveSessionStarted({
    required this.liveSessionId,
    required this.conversationId,
    required this.kind,
    required this.mediaProfile,
    required this.operationId,
  });

  /// Decodes and validates a GraphQL `LiveSessionStarted`. Malformed values throw a [FormatException].
  factory LiveSessionStarted.fromJson(Object? json) => _decodeLiveSessionStarted(json, r'$');

  final String liveSessionId;

  final String conversationId;

  final LiveSessionKind kind;

  final LiveMediaProfile mediaProfile;

  final String operationId;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'conversationId': conversationId,
        'kind': kind.wire,
        'mediaProfile': mediaProfile.wire,
        'operationId': operationId,
      };
}

LiveSessionStarted _decodeLiveSessionStarted(Object? value, String path) {
  final map = _object(value, path);
  return LiveSessionStarted(
    liveSessionId: _scalarUuid(_get(map, path, 'liveSessionId'), '$path.liveSessionId'),
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    kind: _decodeLiveSessionKind(_get(map, path, 'kind'), '$path.kind'),
    mediaProfile: _decodeLiveMediaProfile(_get(map, path, 'mediaProfile'), '$path.mediaProfile'),
    operationId: _scalarUuid(_get(map, path, 'operationId'), '$path.operationId'),
  );
}

final class MediaCutoff {
  const MediaCutoff({
    required this.state,
    this.scope,
  });

  /// Decodes and validates a GraphQL `MediaCutoff`. Malformed values throw a [FormatException].
  factory MediaCutoff.fromJson(Object? json) => _decodeMediaCutoff(json, r'$');

  final String state;

  final CutoffScope? scope;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'state': state,
        'scope': scope?.toJson(),
      };
}

MediaCutoff _decodeMediaCutoff(Object? value, String path) {
  final map = _object(value, path);
  return MediaCutoff(
    state: _scalarString(_get(map, path, 'state'), '$path.state'),
    scope: _n(_get(map, path, 'scope'), '$path.scope', _decodeCutoffScope),
  );
}

final class MediaPolicy {
  const MediaPolicy({
    required this.leasePolicyId,
    required this.maxLeaseMs,
    required this.renewAttemptMs,
    required this.preludeMaxBytes,
    required this.preludeTimeoutMs,
    required this.clockProfileId,
  });

  /// Decodes and validates a GraphQL `MediaPolicy`. Malformed values throw a [FormatException].
  factory MediaPolicy.fromJson(Object? json) => _decodeMediaPolicy(json, r'$');

  final String leasePolicyId;

  final String maxLeaseMs;

  final String renewAttemptMs;

  final String preludeMaxBytes;

  final String preludeTimeoutMs;

  final String clockProfileId;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'leasePolicyId': leasePolicyId,
        'maxLeaseMs': maxLeaseMs,
        'renewAttemptMs': renewAttemptMs,
        'preludeMaxBytes': preludeMaxBytes,
        'preludeTimeoutMs': preludeTimeoutMs,
        'clockProfileId': clockProfileId,
      };
}

MediaPolicy _decodeMediaPolicy(Object? value, String path) {
  final map = _object(value, path);
  return MediaPolicy(
    leasePolicyId: _scalarString(_get(map, path, 'leasePolicyId'), '$path.leasePolicyId'),
    maxLeaseMs: _scalarDecimal(_get(map, path, 'maxLeaseMs'), '$path.maxLeaseMs'),
    renewAttemptMs: _scalarDecimal(_get(map, path, 'renewAttemptMs'), '$path.renewAttemptMs'),
    preludeMaxBytes: _scalarString(_get(map, path, 'preludeMaxBytes'), '$path.preludeMaxBytes'),
    preludeTimeoutMs: _scalarString(_get(map, path, 'preludeTimeoutMs'), '$path.preludeTimeoutMs'),
    clockProfileId: _scalarString(_get(map, path, 'clockProfileId'), '$path.clockProfileId'),
  );
}

final class Member {
  const Member({
    required this.conversationId,
    required this.principalId,
    required this.role,
    required this.status,
    required this.membershipEpoch,
    required this.visibilityEpoch,
    required this.revision,
    required this.visibleFromSequence,
    required this.canStartBroadcast,
  });

  /// Decodes and validates a GraphQL `Member`. Malformed values throw a [FormatException].
  factory Member.fromJson(Object? json) => _decodeMember(json, r'$');

  final String conversationId;

  final String principalId;

  final String role;

  final String status;

  final String membershipEpoch;

  final String visibilityEpoch;

  final String revision;

  final String visibleFromSequence;

  final bool canStartBroadcast;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'principalId': principalId,
        'role': role,
        'status': status,
        'membershipEpoch': membershipEpoch,
        'visibilityEpoch': visibilityEpoch,
        'revision': revision,
        'visibleFromSequence': visibleFromSequence,
        'canStartBroadcast': canStartBroadcast,
      };
}

Member _decodeMember(Object? value, String path) {
  final map = _object(value, path);
  return Member(
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    principalId: _scalarUuid(_get(map, path, 'principalId'), '$path.principalId'),
    role: _scalarString(_get(map, path, 'role'), '$path.role'),
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    membershipEpoch: _scalarDecimal(_get(map, path, 'membershipEpoch'), '$path.membershipEpoch'),
    visibilityEpoch: _scalarDecimal(_get(map, path, 'visibilityEpoch'), '$path.visibilityEpoch'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
    visibleFromSequence: _scalarDecimal(_get(map, path, 'visibleFromSequence'), '$path.visibleFromSequence'),
    canStartBroadcast: _scalarBoolean(_get(map, path, 'canStartBroadcast'), '$path.canStartBroadcast'),
  );
}

final class MemberPage {
  const MemberPage({
    required this.items,
    required this.complete,
    required this.refreshRequired,
    this.nextCursor,
  });

  /// Decodes and validates a GraphQL `MemberPage`. Malformed values throw a [FormatException].
  factory MemberPage.fromJson(Object? json) => _decodeMemberPage(json, r'$');

  final List<Member> items;

  final bool complete;

  final bool refreshRequired;

  final String? nextCursor;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'complete': complete,
        'refreshRequired': refreshRequired,
        'nextCursor': nextCursor,
      };
}

MemberPage _decodeMemberPage(Object? value, String path) {
  final map = _object(value, path);
  return MemberPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeMember),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
  );
}

final class MembersReply {
  const MembersReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `MembersReply`. Malformed values throw a [FormatException].
  factory MembersReply.fromJson(Object? json) => _decodeMembersReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final MemberPage? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

MembersReply _decodeMembersReply(Object? value, String path) {
  final map = _object(value, path);
  return MembersReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeMemberPage),
  );
}

final class Message {
  const Message({
    required this.messageId,
    required this.conversationId,
    required this.authorId,
    required this.sequence,
    required this.revision,
    required this.revisionSequence,
    required this.createdAt,
    required this.deleted,
    this.text,
    this.props,
    this.editedAt,
  });

  /// Decodes and validates a GraphQL `Message`. Malformed values throw a [FormatException].
  factory Message.fromJson(Object? json) => _decodeMessage(json, r'$');

  final String messageId;

  final String conversationId;

  final String authorId;

  final String sequence;

  final String revision;

  final String revisionSequence;

  final String createdAt;

  final bool deleted;

  final String? text;

  final Map<String, Object?>? props;

  final String? editedAt;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'messageId': messageId,
        'conversationId': conversationId,
        'authorId': authorId,
        'sequence': sequence,
        'revision': revision,
        'revisionSequence': revisionSequence,
        'createdAt': createdAt,
        'deleted': deleted,
        'text': text,
        'props': props,
        'editedAt': editedAt,
      };
}

Message _decodeMessage(Object? value, String path) {
  final map = _object(value, path);
  return Message(
    messageId: _scalarUuid(_get(map, path, 'messageId'), '$path.messageId'),
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    authorId: _scalarString(_get(map, path, 'authorId'), '$path.authorId'),
    sequence: _scalarDecimal(_get(map, path, 'sequence'), '$path.sequence'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
    revisionSequence: _scalarDecimal(_get(map, path, 'revisionSequence'), '$path.revisionSequence'),
    createdAt: _scalarString(_get(map, path, 'createdAt'), '$path.createdAt'),
    deleted: _scalarBoolean(_get(map, path, 'deleted'), '$path.deleted'),
    text: _n(_get(map, path, 'text'), '$path.text', _scalarString),
    props: _n(_get(map, path, 'props'), '$path.props', _scalarProperties),
    editedAt: _n(_get(map, path, 'editedAt'), '$path.editedAt', _scalarString),
  );
}

final class MessageAck {
  const MessageAck({
    required this.messageId,
    required this.conversationId,
    required this.sequence,
    required this.revision,
    required this.status,
    this.cursor,
  });

  /// Decodes and validates a GraphQL `MessageAck`. Malformed values throw a [FormatException].
  factory MessageAck.fromJson(Object? json) => _decodeMessageAck(json, r'$');

  final String messageId;

  final String conversationId;

  final String sequence;

  final String revision;

  final String status;

  final Cursor? cursor;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'messageId': messageId,
        'conversationId': conversationId,
        'sequence': sequence,
        'revision': revision,
        'status': status,
        'cursor': cursor?.toJson(),
      };
}

MessageAck _decodeMessageAck(Object? value, String path) {
  final map = _object(value, path);
  return MessageAck(
    messageId: _scalarUuid(_get(map, path, 'messageId'), '$path.messageId'),
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    sequence: _scalarDecimal(_get(map, path, 'sequence'), '$path.sequence'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    cursor: _n(_get(map, path, 'cursor'), '$path.cursor', _decodeCursor),
  );
}

final class MessagePage {
  const MessagePage({
    required this.items,
    required this.complete,
    required this.refreshRequired,
    this.nextCursor,
  });

  /// Decodes and validates a GraphQL `MessagePage`. Malformed values throw a [FormatException].
  factory MessagePage.fromJson(Object? json) => _decodeMessagePage(json, r'$');

  final List<Message> items;

  final bool complete;

  final bool refreshRequired;

  final String? nextCursor;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'complete': complete,
        'refreshRequired': refreshRequired,
        'nextCursor': nextCursor,
      };
}

MessagePage _decodeMessagePage(Object? value, String path) {
  final map = _object(value, path);
  return MessagePage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeMessage),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
  );
}

final class MessagesReply {
  const MessagesReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `MessagesReply`. Malformed values throw a [FormatException].
  factory MessagesReply.fromJson(Object? json) => _decodeMessagesReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final MessagePage? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

MessagesReply _decodeMessagesReply(Object? value, String path) {
  final map = _object(value, path);
  return MessagesReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeMessagePage),
  );
}

final class Operation {
  const Operation({
    required this.operationId,
    required this.kind,
    this.targetRef,
    required this.state,
    required this.revision,
    required this.requestedAt,
    required this.updatedAt,
    required this.steps,
    this.result,
    this.blockedReason,
  });

  /// Decodes and validates a GraphQL `Operation`. Malformed values throw a [FormatException].
  factory Operation.fromJson(Object? json) => _decodeOperation(json, r'$');

  final String operationId;

  final String kind;

  final ResourceRef? targetRef;

  final String state;

  final String revision;

  final String requestedAt;

  final String updatedAt;

  final List<OperationStep> steps;

  final OperationResult? result;

  final String? blockedReason;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'operationId': operationId,
        'kind': kind,
        'targetRef': targetRef?.toJson(),
        'state': state,
        'revision': revision,
        'requestedAt': requestedAt,
        'updatedAt': updatedAt,
        'steps': steps.map((e0) => e0.toJson()).toList(),
        'result': result?.toJson(),
        'blockedReason': blockedReason,
      };
}

Operation _decodeOperation(Object? value, String path) {
  final map = _object(value, path);
  return Operation(
    operationId: _scalarUuid(_get(map, path, 'operationId'), '$path.operationId'),
    kind: _scalarString(_get(map, path, 'kind'), '$path.kind'),
    targetRef: _n(_get(map, path, 'targetRef'), '$path.targetRef', _decodeResourceRef),
    state: _scalarString(_get(map, path, 'state'), '$path.state'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
    requestedAt: _scalarString(_get(map, path, 'requestedAt'), '$path.requestedAt'),
    updatedAt: _scalarString(_get(map, path, 'updatedAt'), '$path.updatedAt'),
    steps: _list(_get(map, path, 'steps'), '$path.steps', _decodeOperationStep),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeOperationResult),
    blockedReason: _n(_get(map, path, 'blockedReason'), '$path.blockedReason', _scalarString),
  );
}

final class OperationRef {
  const OperationRef({
    required this.operationId,
    required this.owner,
    required this.href,
    required this.state,
  });

  /// Decodes and validates a GraphQL `OperationRef`. Malformed values throw a [FormatException].
  factory OperationRef.fromJson(Object? json) => _decodeOperationRef(json, r'$');

  final String operationId;

  final String owner;

  final String href;

  final String state;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'operationId': operationId,
        'owner': owner,
        'href': href,
        'state': state,
      };
}

OperationRef _decodeOperationRef(Object? value, String path) {
  final map = _object(value, path);
  return OperationRef(
    operationId: _scalarUuid(_get(map, path, 'operationId'), '$path.operationId'),
    owner: _scalarString(_get(map, path, 'owner'), '$path.owner'),
    href: _scalarString(_get(map, path, 'href'), '$path.href'),
    state: _scalarString(_get(map, path, 'state'), '$path.state'),
  );
}

final class OperationResult {
  const OperationResult({
    this.projectId,
    this.incarnation,
    this.status,
    this.backend,
    this.environment,
    this.policyRevision,
    this.expiresAt,
    this.kind,
    this.resourceRef,
    this.delivery,
    this.keyId,
    this.endpointId,
    this.enabled,
    this.liveSessionCompletion,
    this.replayedDeliveries,
    this.skippedDeliveries,
    this.messagePreview,
  });

  /// Decodes and validates a GraphQL `OperationResult`. Malformed values throw a [FormatException].
  factory OperationResult.fromJson(Object? json) => _decodeOperationResult(json, r'$');

  final String? projectId;

  final String? incarnation;

  final String? status;

  final String? backend;

  final String? environment;

  final String? policyRevision;

  final String? expiresAt;

  final String? kind;

  final ResourceRef? resourceRef;

  final CredentialDelivery? delivery;

  final String? keyId;

  final String? endpointId;

  final bool? enabled;

  final LiveSessionOperationCompletion? liveSessionCompletion;

  final int? replayedDeliveries;

  final int? skippedDeliveries;

  final bool? messagePreview;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'projectId': projectId,
        'incarnation': incarnation,
        'status': status,
        'backend': backend,
        'environment': environment,
        'policyRevision': policyRevision,
        'expiresAt': expiresAt,
        'kind': kind,
        'resourceRef': resourceRef?.toJson(),
        'delivery': delivery?.toJson(),
        'keyId': keyId,
        'endpointId': endpointId,
        'enabled': enabled,
        'liveSessionCompletion': liveSessionCompletion?.toJson(),
        'replayedDeliveries': replayedDeliveries,
        'skippedDeliveries': skippedDeliveries,
        'messagePreview': messagePreview,
      };
}

OperationResult _decodeOperationResult(Object? value, String path) {
  final map = _object(value, path);
  return OperationResult(
    projectId: _n(_get(map, path, 'projectId'), '$path.projectId', _scalarUuid),
    incarnation: _n(_get(map, path, 'incarnation'), '$path.incarnation', _scalarUuid),
    status: _n(_get(map, path, 'status'), '$path.status', _scalarString),
    backend: _n(_get(map, path, 'backend'), '$path.backend', _scalarString),
    environment: _n(_get(map, path, 'environment'), '$path.environment', _scalarString),
    policyRevision: _n(_get(map, path, 'policyRevision'), '$path.policyRevision', _scalarDecimal),
    expiresAt: _n(_get(map, path, 'expiresAt'), '$path.expiresAt', _scalarString),
    kind: _n(_get(map, path, 'kind'), '$path.kind', _scalarString),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    delivery: _n(_get(map, path, 'delivery'), '$path.delivery', _decodeCredentialDelivery),
    keyId: _n(_get(map, path, 'keyId'), '$path.keyId', _scalarString),
    endpointId: _n(_get(map, path, 'endpointId'), '$path.endpointId', _scalarUuid),
    enabled: _n(_get(map, path, 'enabled'), '$path.enabled', _scalarBoolean),
    liveSessionCompletion: _n(_get(map, path, 'liveSessionCompletion'), '$path.liveSessionCompletion', _decodeLiveSessionOperationCompletion),
    replayedDeliveries: _n(_get(map, path, 'replayedDeliveries'), '$path.replayedDeliveries', _scalarInt),
    skippedDeliveries: _n(_get(map, path, 'skippedDeliveries'), '$path.skippedDeliveries', _scalarInt),
    messagePreview: _n(_get(map, path, 'messagePreview'), '$path.messagePreview', _scalarBoolean),
  );
}

final class OperationStep {
  const OperationStep({
    required this.stepId,
    required this.state,
  });

  /// Decodes and validates a GraphQL `OperationStep`. Malformed values throw a [FormatException].
  factory OperationStep.fromJson(Object? json) => _decodeOperationStep(json, r'$');

  final String stepId;

  final String state;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'stepId': stepId,
        'state': state,
      };
}

OperationStep _decodeOperationStep(Object? value, String path) {
  final map = _object(value, path);
  return OperationStep(
    stepId: _scalarString(_get(map, path, 'stepId'), '$path.stepId'),
    state: _scalarString(_get(map, path, 'state'), '$path.state'),
  );
}

final class Organization {
  const Organization({
    required this.orgId,
    required this.name,
    required this.status,
    required this.revision,
  });

  /// Decodes and validates a GraphQL `Organization`. Malformed values throw a [FormatException].
  factory Organization.fromJson(Object? json) => _decodeOrganization(json, r'$');

  final String orgId;

  final String name;

  final String status;

  final String revision;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'orgId': orgId,
        'name': name,
        'status': status,
        'revision': revision,
      };
}

Organization _decodeOrganization(Object? value, String path) {
  final map = _object(value, path);
  return Organization(
    orgId: _scalarUuid(_get(map, path, 'orgId'), '$path.orgId'),
    name: _scalarString(_get(map, path, 'name'), '$path.name'),
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
  );
}

final class Principal {
  const Principal({
    required this.principalId,
    required this.externalUserId,
    required this.status,
    required this.revision,
  });

  /// Decodes and validates a GraphQL `Principal`. Malformed values throw a [FormatException].
  factory Principal.fromJson(Object? json) => _decodePrincipal(json, r'$');

  final String principalId;

  final String externalUserId;

  final String status;

  final String revision;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'principalId': principalId,
        'externalUserId': externalUserId,
        'status': status,
        'revision': revision,
      };
}

Principal _decodePrincipal(Object? value, String path) {
  final map = _object(value, path);
  return Principal(
    principalId: _scalarUuid(_get(map, path, 'principalId'), '$path.principalId'),
    externalUserId: _scalarString(_get(map, path, 'externalUserId'), '$path.externalUserId'),
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    revision: _scalarDecimal(_get(map, path, 'revision'), '$path.revision'),
  );
}

final class ReadReceipt {
  const ReadReceipt({
    required this.principalId,
    required this.membershipEpoch,
    required this.visibilityEpoch,
    this.deliveredThroughSequence,
    this.readThroughSequence,
    this.updatedAt,
  });

  /// Decodes and validates a GraphQL `ReadReceipt`. Malformed values throw a [FormatException].
  factory ReadReceipt.fromJson(Object? json) => _decodeReadReceipt(json, r'$');

  final String principalId;

  final String membershipEpoch;

  final String visibilityEpoch;

  final String? deliveredThroughSequence;

  final String? readThroughSequence;

  final String? updatedAt;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'principalId': principalId,
        'membershipEpoch': membershipEpoch,
        'visibilityEpoch': visibilityEpoch,
        'deliveredThroughSequence': deliveredThroughSequence,
        'readThroughSequence': readThroughSequence,
        'updatedAt': updatedAt,
      };
}

ReadReceipt _decodeReadReceipt(Object? value, String path) {
  final map = _object(value, path);
  return ReadReceipt(
    principalId: _scalarUuid(_get(map, path, 'principalId'), '$path.principalId'),
    membershipEpoch: _scalarDecimal(_get(map, path, 'membershipEpoch'), '$path.membershipEpoch'),
    visibilityEpoch: _scalarDecimal(_get(map, path, 'visibilityEpoch'), '$path.visibilityEpoch'),
    deliveredThroughSequence: _n(_get(map, path, 'deliveredThroughSequence'), '$path.deliveredThroughSequence', _scalarDecimal),
    readThroughSequence: _n(_get(map, path, 'readThroughSequence'), '$path.readThroughSequence', _scalarDecimal),
    updatedAt: _n(_get(map, path, 'updatedAt'), '$path.updatedAt', _scalarString),
  );
}

final class ReceiptPage {
  const ReceiptPage({
    required this.items,
    required this.complete,
    required this.refreshRequired,
    this.nextCursor,
  });

  /// Decodes and validates a GraphQL `ReceiptPage`. Malformed values throw a [FormatException].
  factory ReceiptPage.fromJson(Object? json) => _decodeReceiptPage(json, r'$');

  final List<ReadReceipt> items;

  final bool complete;

  final bool refreshRequired;

  final String? nextCursor;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'complete': complete,
        'refreshRequired': refreshRequired,
        'nextCursor': nextCursor,
      };
}

ReceiptPage _decodeReceiptPage(Object? value, String path) {
  final map = _object(value, path);
  return ReceiptPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeReadReceipt),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
  );
}

final class ReceiptsReply {
  const ReceiptsReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `ReceiptsReply`. Malformed values throw a [FormatException].
  factory ReceiptsReply.fromJson(Object? json) => _decodeReceiptsReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final ReceiptPage? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

ReceiptsReply _decodeReceiptsReply(Object? value, String path) {
  final map = _object(value, path);
  return ReceiptsReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeReceiptPage),
  );
}

final class ReportReceiptReply {
  const ReportReceiptReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `ReportReceiptReply`. Malformed values throw a [FormatException].
  factory ReportReceiptReply.fromJson(Object? json) => _decodeReportReceiptReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final ReadReceipt? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

ReportReceiptReply _decodeReportReceiptReply(Object? value, String path) {
  final map = _object(value, path);
  return ReportReceiptReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeReadReceipt),
  );
}

final class RequestResolution {
  const RequestResolution({
    required this.state,
    required this.requestId,
    required this.checkedAt,
    required this.resultWithheld,
    this.receipt,
  });

  /// Decodes and validates a GraphQL `RequestResolution`. Malformed values throw a [FormatException].
  factory RequestResolution.fromJson(Object? json) => _decodeRequestResolution(json, r'$');

  final String state;

  final String requestId;

  final String checkedAt;

  final bool resultWithheld;

  final ResolvedReceipt? receipt;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'state': state,
        'requestId': requestId,
        'checkedAt': checkedAt,
        'resultWithheld': resultWithheld,
        'receipt': receipt?.toJson(),
      };
}

RequestResolution _decodeRequestResolution(Object? value, String path) {
  final map = _object(value, path);
  return RequestResolution(
    state: _scalarString(_get(map, path, 'state'), '$path.state'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    checkedAt: _scalarString(_get(map, path, 'checkedAt'), '$path.checkedAt'),
    resultWithheld: _scalarBoolean(_get(map, path, 'resultWithheld'), '$path.resultWithheld'),
    receipt: _n(_get(map, path, 'receipt'), '$path.receipt', _decodeResolvedReceipt),
  );
}

final class ResolveRequestReply {
  const ResolveRequestReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `ResolveRequestReply`. Malformed values throw a [FormatException].
  factory ResolveRequestReply.fromJson(Object? json) => _decodeResolveRequestReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final RequestResolution? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

ResolveRequestReply _decodeResolveRequestReply(Object? value, String path) {
  final map = _object(value, path);
  return ResolveRequestReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeRequestResolution),
  );
}

final class ResolvedReceipt {
  const ResolvedReceipt({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `ResolvedReceipt`. Malformed values throw a [FormatException].
  factory ResolvedReceipt.fromJson(Object? json) => _decodeResolvedReceipt(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final RetainedResult? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

ResolvedReceipt _decodeResolvedReceipt(Object? value, String path) {
  final map = _object(value, path);
  return ResolvedReceipt(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeRetainedResult),
  );
}

final class ResourceRef {
  const ResourceRef({
    required this.kind,
    required this.id,
  });

  /// Decodes and validates a GraphQL `ResourceRef`. Malformed values throw a [FormatException].
  factory ResourceRef.fromJson(Object? json) => _decodeResourceRef(json, r'$');

  final String kind;

  final String id;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'kind': kind,
        'id': id,
      };
}

ResourceRef _decodeResourceRef(Object? value, String path) {
  final map = _object(value, path);
  return ResourceRef(
    kind: _scalarString(_get(map, path, 'kind'), '$path.kind'),
    id: _scalarString(_get(map, path, 'id'), '$path.id'),
  );
}

/// Exactly one typed field contains the retained, currently authorized receipt result.
final class RetainedResult {
  const RetainedResult({
    this.broadcastPermissionChanged,
    this.conversation,
    this.conversationMemberBatch,
    this.conversationMute,
    this.credentialDeliveryReceipt,
    this.deliveryAck,
    this.liveAlertBatch,
    this.liveCredentialIssuance,
    this.liveSessionEndRequested,
    this.liveSessionJoined,
    this.liveSessionLeft,
    this.liveSessionStarted,
    this.member,
    this.message,
    this.messageAck,
    this.organization,
    this.principal,
    this.readReceipt,
    this.sessionBootstrap,
    this.sessionRevocation,
    this.signedProof,
  });

  /// Decodes and validates a GraphQL `RetainedResult`. Malformed values throw a [FormatException].
  factory RetainedResult.fromJson(Object? json) => _decodeRetainedResult(json, r'$');

  final BroadcastPermissionChanged? broadcastPermissionChanged;

  final Conversation? conversation;

  final ConversationMemberBatch? conversationMemberBatch;

  final ConversationMute? conversationMute;

  final CredentialDeliveryReceipt? credentialDeliveryReceipt;

  final DeliveryAck? deliveryAck;

  final LiveAlertBatch? liveAlertBatch;

  final LiveCredentialIssuance? liveCredentialIssuance;

  final LiveSessionEndRequested? liveSessionEndRequested;

  final LiveSessionJoined? liveSessionJoined;

  final LiveSessionLeft? liveSessionLeft;

  final LiveSessionStarted? liveSessionStarted;

  final Member? member;

  final Message? message;

  final MessageAck? messageAck;

  final Organization? organization;

  final Principal? principal;

  final ReadReceipt? readReceipt;

  final SessionBootstrap? sessionBootstrap;

  final SessionRevocation? sessionRevocation;

  final Map<String, Object?>? signedProof;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'broadcastPermissionChanged': broadcastPermissionChanged?.toJson(),
        'conversation': conversation?.toJson(),
        'conversationMemberBatch': conversationMemberBatch?.toJson(),
        'conversationMute': conversationMute?.toJson(),
        'credentialDeliveryReceipt': credentialDeliveryReceipt?.toJson(),
        'deliveryAck': deliveryAck?.toJson(),
        'liveAlertBatch': liveAlertBatch?.toJson(),
        'liveCredentialIssuance': liveCredentialIssuance?.toJson(),
        'liveSessionEndRequested': liveSessionEndRequested?.toJson(),
        'liveSessionJoined': liveSessionJoined?.toJson(),
        'liveSessionLeft': liveSessionLeft?.toJson(),
        'liveSessionStarted': liveSessionStarted?.toJson(),
        'member': member?.toJson(),
        'message': message?.toJson(),
        'messageAck': messageAck?.toJson(),
        'organization': organization?.toJson(),
        'principal': principal?.toJson(),
        'readReceipt': readReceipt?.toJson(),
        'sessionBootstrap': sessionBootstrap?.toJson(),
        'sessionRevocation': sessionRevocation?.toJson(),
        'signedProof': signedProof,
      };
}

RetainedResult _decodeRetainedResult(Object? value, String path) {
  final map = _object(value, path);
  return RetainedResult(
    broadcastPermissionChanged: _n(_get(map, path, 'broadcastPermissionChanged'), '$path.broadcastPermissionChanged', _decodeBroadcastPermissionChanged),
    conversation: _n(_get(map, path, 'conversation'), '$path.conversation', _decodeConversation),
    conversationMemberBatch: _n(_get(map, path, 'conversationMemberBatch'), '$path.conversationMemberBatch', _decodeConversationMemberBatch),
    conversationMute: _n(_get(map, path, 'conversationMute'), '$path.conversationMute', _decodeConversationMute),
    credentialDeliveryReceipt: _n(_get(map, path, 'credentialDeliveryReceipt'), '$path.credentialDeliveryReceipt', _decodeCredentialDeliveryReceipt),
    deliveryAck: _n(_get(map, path, 'deliveryAck'), '$path.deliveryAck', _decodeDeliveryAck),
    liveAlertBatch: _n(_get(map, path, 'liveAlertBatch'), '$path.liveAlertBatch', _decodeLiveAlertBatch),
    liveCredentialIssuance: _n(_get(map, path, 'liveCredentialIssuance'), '$path.liveCredentialIssuance', _decodeLiveCredentialIssuance),
    liveSessionEndRequested: _n(_get(map, path, 'liveSessionEndRequested'), '$path.liveSessionEndRequested', _decodeLiveSessionEndRequested),
    liveSessionJoined: _n(_get(map, path, 'liveSessionJoined'), '$path.liveSessionJoined', _decodeLiveSessionJoined),
    liveSessionLeft: _n(_get(map, path, 'liveSessionLeft'), '$path.liveSessionLeft', _decodeLiveSessionLeft),
    liveSessionStarted: _n(_get(map, path, 'liveSessionStarted'), '$path.liveSessionStarted', _decodeLiveSessionStarted),
    member: _n(_get(map, path, 'member'), '$path.member', _decodeMember),
    message: _n(_get(map, path, 'message'), '$path.message', _decodeMessage),
    messageAck: _n(_get(map, path, 'messageAck'), '$path.messageAck', _decodeMessageAck),
    organization: _n(_get(map, path, 'organization'), '$path.organization', _decodeOrganization),
    principal: _n(_get(map, path, 'principal'), '$path.principal', _decodePrincipal),
    readReceipt: _n(_get(map, path, 'readReceipt'), '$path.readReceipt', _decodeReadReceipt),
    sessionBootstrap: _n(_get(map, path, 'sessionBootstrap'), '$path.sessionBootstrap', _decodeSessionBootstrap),
    sessionRevocation: _n(_get(map, path, 'sessionRevocation'), '$path.sessionRevocation', _decodeSessionRevocation),
    signedProof: _n(_get(map, path, 'signedProof'), '$path.signedProof', _scalarSignedProof),
  );
}

final class RevokeSessionReply {
  const RevokeSessionReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `RevokeSessionReply`. Malformed values throw a [FormatException].
  factory RevokeSessionReply.fromJson(Object? json) => _decodeRevokeSessionReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final SessionRevocation? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

RevokeSessionReply _decodeRevokeSessionReply(Object? value, String path) {
  final map = _object(value, path);
  return RevokeSessionReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeSessionRevocation),
  );
}

final class RouteReply {
  const RouteReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `RouteReply`. Malformed values throw a [FormatException].
  factory RouteReply.fromJson(Object? json) => _decodeRouteReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final Map<String, Object?>? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result,
      };
}

RouteReply _decodeRouteReply(Object? value, String path) {
  final map = _object(value, path);
  return RouteReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _scalarSignedProof),
  );
}

final class SearchHit {
  const SearchHit({
    required this.conversationId,
    this.message,
  });

  /// Decodes and validates a GraphQL `SearchHit`. Malformed values throw a [FormatException].
  factory SearchHit.fromJson(Object? json) => _decodeSearchHit(json, r'$');

  final String conversationId;

  final Message? message;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'message': message?.toJson(),
      };
}

SearchHit _decodeSearchHit(Object? value, String path) {
  final map = _object(value, path);
  return SearchHit(
    conversationId: _scalarUuid(_get(map, path, 'conversationId'), '$path.conversationId'),
    message: _n(_get(map, path, 'message'), '$path.message', _decodeMessage),
  );
}

final class SearchPage {
  const SearchPage({
    required this.items,
    required this.complete,
    required this.refreshRequired,
    this.nextCursor,
  });

  /// Decodes and validates a GraphQL `SearchPage`. Malformed values throw a [FormatException].
  factory SearchPage.fromJson(Object? json) => _decodeSearchPage(json, r'$');

  final List<SearchHit> items;

  final bool complete;

  final bool refreshRequired;

  final String? nextCursor;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'complete': complete,
        'refreshRequired': refreshRequired,
        'nextCursor': nextCursor,
      };
}

SearchPage _decodeSearchPage(Object? value, String path) {
  final map = _object(value, path);
  return SearchPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeSearchHit),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
  );
}

final class SearchReply {
  const SearchReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `SearchReply`. Malformed values throw a [FormatException].
  factory SearchReply.fromJson(Object? json) => _decodeSearchReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final SearchPage? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

SearchReply _decodeSearchReply(Object? value, String path) {
  final map = _object(value, path);
  return SearchReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeSearchPage),
  );
}

final class SendMessageReply {
  const SendMessageReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `SendMessageReply`. Malformed values throw a [FormatException].
  factory SendMessageReply.fromJson(Object? json) => _decodeSendMessageReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final MessageAck? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

SendMessageReply _decodeSendMessageReply(Object? value, String path) {
  final map = _object(value, path);
  return SendMessageReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeMessageAck),
  );
}

final class Session {
  const Session({
    required this.sessionId,
    required this.principalId,
    required this.deviceId,
    required this.incarnation,
    required this.sessionRevision,
    required this.expiresAt,
    required this.status,
  });

  /// Decodes and validates a GraphQL `Session`. Malformed values throw a [FormatException].
  factory Session.fromJson(Object? json) => _decodeSession(json, r'$');

  final String sessionId;

  final String principalId;

  final String deviceId;

  final String incarnation;

  final String sessionRevision;

  final String expiresAt;

  final String status;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'sessionId': sessionId,
        'principalId': principalId,
        'deviceId': deviceId,
        'incarnation': incarnation,
        'sessionRevision': sessionRevision,
        'expiresAt': expiresAt,
        'status': status,
      };
}

Session _decodeSession(Object? value, String path) {
  final map = _object(value, path);
  return Session(
    sessionId: _scalarUuid(_get(map, path, 'sessionId'), '$path.sessionId'),
    principalId: _scalarUuid(_get(map, path, 'principalId'), '$path.principalId'),
    deviceId: _scalarUuid(_get(map, path, 'deviceId'), '$path.deviceId'),
    incarnation: _scalarUuid(_get(map, path, 'incarnation'), '$path.incarnation'),
    sessionRevision: _scalarDecimal(_get(map, path, 'sessionRevision'), '$path.sessionRevision'),
    expiresAt: _scalarString(_get(map, path, 'expiresAt'), '$path.expiresAt'),
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
  );
}

final class SessionBootstrap {
  const SessionBootstrap({
    this.session,
    required this.tokenExpiresAt,
    required this.sessionToken,
  });

  /// Decodes and validates a GraphQL `SessionBootstrap`. Malformed values throw a [FormatException].
  factory SessionBootstrap.fromJson(Object? json) => _decodeSessionBootstrap(json, r'$');

  final Session? session;

  final String tokenExpiresAt;

  final String sessionToken;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'session': session?.toJson(),
        'tokenExpiresAt': tokenExpiresAt,
        'sessionToken': sessionToken,
      };
}

SessionBootstrap _decodeSessionBootstrap(Object? value, String path) {
  final map = _object(value, path);
  return SessionBootstrap(
    session: _n(_get(map, path, 'session'), '$path.session', _decodeSession),
    tokenExpiresAt: _scalarString(_get(map, path, 'tokenExpiresAt'), '$path.tokenExpiresAt'),
    sessionToken: _scalarString(_get(map, path, 'sessionToken'), '$path.sessionToken'),
  );
}

final class SessionRevocation {
  const SessionRevocation({
    required this.sessionId,
    required this.status,
    this.mediaCutoff,
  });

  /// Decodes and validates a GraphQL `SessionRevocation`. Malformed values throw a [FormatException].
  factory SessionRevocation.fromJson(Object? json) => _decodeSessionRevocation(json, r'$');

  final String sessionId;

  final String status;

  final MediaCutoff? mediaCutoff;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'sessionId': sessionId,
        'status': status,
        'mediaCutoff': mediaCutoff?.toJson(),
      };
}

SessionRevocation _decodeSessionRevocation(Object? value, String path) {
  final map = _object(value, path);
  return SessionRevocation(
    sessionId: _scalarUuid(_get(map, path, 'sessionId'), '$path.sessionId'),
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    mediaCutoff: _n(_get(map, path, 'mediaCutoff'), '$path.mediaCutoff', _decodeMediaCutoff),
  );
}

final class SetConversationMutePayload {
  const SetConversationMutePayload({
    required this.status,
    required this.requestId,
    required this.receiptId,
    required this.committedAt,
    required this.replayed,
    required this.result,
  });

  /// Decodes and validates a GraphQL `SetConversationMutePayload`. Malformed values throw a [FormatException].
  factory SetConversationMutePayload.fromJson(Object? json) => _decodeSetConversationMutePayload(json, r'$');

  final String status;

  final String requestId;

  final String receiptId;

  final String committedAt;

  final bool replayed;

  final ConversationMute result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'result': result.toJson(),
      };
}

SetConversationMutePayload _decodeSetConversationMutePayload(Object? value, String path) {
  final map = _object(value, path);
  return SetConversationMutePayload(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    receiptId: _scalarUuid(_get(map, path, 'receiptId'), '$path.receiptId'),
    committedAt: _scalarString(_get(map, path, 'committedAt'), '$path.committedAt'),
    replayed: _scalarBoolean(_get(map, path, 'replayed'), '$path.replayed'),
    result: _decodeConversationMute(_get(map, path, 'result'), '$path.result'),
  );
}

final class StartLiveSessionPayload {
  const StartLiveSessionPayload({
    required this.status,
    required this.requestId,
    required this.receiptId,
    required this.committedAt,
    required this.replayed,
    required this.operation,
    required this.result,
  });

  /// Decodes and validates a GraphQL `StartLiveSessionPayload`. Malformed values throw a [FormatException].
  factory StartLiveSessionPayload.fromJson(Object? json) => _decodeStartLiveSessionPayload(json, r'$');

  final String status;

  final String requestId;

  final String receiptId;

  final String committedAt;

  final bool replayed;

  final OperationRef operation;

  final LiveSessionStarted result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation.toJson(),
        'result': result.toJson(),
      };
}

StartLiveSessionPayload _decodeStartLiveSessionPayload(Object? value, String path) {
  final map = _object(value, path);
  return StartLiveSessionPayload(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    receiptId: _scalarUuid(_get(map, path, 'receiptId'), '$path.receiptId'),
    committedAt: _scalarString(_get(map, path, 'committedAt'), '$path.committedAt'),
    replayed: _scalarBoolean(_get(map, path, 'replayed'), '$path.replayed'),
    operation: _decodeOperationRef(_get(map, path, 'operation'), '$path.operation'),
    result: _decodeLiveSessionStarted(_get(map, path, 'result'), '$path.result'),
  );
}

final class TypingReply {
  const TypingReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `TypingReply`. Malformed values throw a [FormatException].
  factory TypingReply.fromJson(Object? json) => _decodeTypingReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final TypingStatus? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

TypingReply _decodeTypingReply(Object? value, String path) {
  final map = _object(value, path);
  return TypingReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeTypingStatus),
  );
}

final class TypingStatus {
  const TypingStatus({
    required this.accepted,
  });

  /// Decodes and validates a GraphQL `TypingStatus`. Malformed values throw a [FormatException].
  factory TypingStatus.fromJson(Object? json) => _decodeTypingStatus(json, r'$');

  final bool accepted;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'accepted': accepted,
      };
}

TypingStatus _decodeTypingStatus(Object? value, String path) {
  final map = _object(value, path);
  return TypingStatus(
    accepted: _scalarBoolean(_get(map, path, 'accepted'), '$path.accepted'),
  );
}

final class UpdateConversationReply {
  const UpdateConversationReply({
    required this.status,
    required this.requestId,
    this.serverTime,
    this.receiptId,
    this.committedAt,
    this.replayed,
    this.operation,
    this.resourceRef,
    this.result,
  });

  /// Decodes and validates a GraphQL `UpdateConversationReply`. Malformed values throw a [FormatException].
  factory UpdateConversationReply.fromJson(Object? json) => _decodeUpdateConversationReply(json, r'$');

  final String status;

  final String requestId;

  final String? serverTime;

  final String? receiptId;

  final String? committedAt;

  final bool? replayed;

  final OperationRef? operation;

  final ResourceRef? resourceRef;

  final Conversation? result;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'requestId': requestId,
        'serverTime': serverTime,
        'receiptId': receiptId,
        'committedAt': committedAt,
        'replayed': replayed,
        'operation': operation?.toJson(),
        'resourceRef': resourceRef?.toJson(),
        'result': result?.toJson(),
      };
}

UpdateConversationReply _decodeUpdateConversationReply(Object? value, String path) {
  final map = _object(value, path);
  return UpdateConversationReply(
    status: _scalarString(_get(map, path, 'status'), '$path.status'),
    requestId: _scalarUuid(_get(map, path, 'requestId'), '$path.requestId'),
    serverTime: _n(_get(map, path, 'serverTime'), '$path.serverTime', _scalarString),
    receiptId: _n(_get(map, path, 'receiptId'), '$path.receiptId', _scalarUuid),
    committedAt: _n(_get(map, path, 'committedAt'), '$path.committedAt', _scalarString),
    replayed: _n(_get(map, path, 'replayed'), '$path.replayed', _scalarBoolean),
    operation: _n(_get(map, path, 'operation'), '$path.operation', _decodeOperationRef),
    resourceRef: _n(_get(map, path, 'resourceRef'), '$path.resourceRef', _decodeResourceRef),
    result: _n(_get(map, path, 'result'), '$path.result', _decodeConversation),
  );
}

final class AlertLiveSessionInput {
  const AlertLiveSessionInput({
    required this.liveSessionId,
    required this.expectedGeneration,
    required this.principalIds,
  });

  final String liveSessionId;

  final String expectedGeneration;

  final List<String> principalIds;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'expectedGeneration': expectedGeneration,
        'principalIds': principalIds,
      };
}

final class ConversationLiveInput {
  const ConversationLiveInput({
    required this.conversationId,
  });

  final String conversationId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
      };
}

final class ConversationMuteInput {
  const ConversationMuteInput({
    required this.conversationId,
    this.actAsPrincipalId,
  });

  final String conversationId;

  final String? actAsPrincipalId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        if (actAsPrincipalId case final value?) 'actAsPrincipalId': value,
      };
}

final class CursorInput {
  const CursorInput({
    required this.incarnation,
    required this.conversationId,
    required this.sequence,
  });

  final String incarnation;

  final String conversationId;

  final String sequence;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'incarnation': incarnation,
        'conversationId': conversationId,
        'sequence': sequence,
      };
}

final class DeleteMessageRequestInput {
  const DeleteMessageRequestInput({
    required this.conversationId,
    required this.messageId,
    required this.expectedRevision,
  });

  final String conversationId;

  final String messageId;

  final String expectedRevision;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'messageId': messageId,
        'expectedRevision': expectedRevision,
      };
}

final class EditMessageRequestInput {
  const EditMessageRequestInput({
    required this.conversationId,
    required this.messageId,
    required this.expectedRevision,
    this.text,
    this.props,
  });

  final String conversationId;

  final String messageId;

  final String expectedRevision;

  final String? text;

  final Map<String, Object?>? props;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'messageId': messageId,
        'expectedRevision': expectedRevision,
        if (text case final value?) 'text': value,
        if (props case final value?) 'props': value,
      };
}

final class EndLiveSessionInput {
  const EndLiveSessionInput({
    required this.liveSessionId,
    required this.expectedGeneration,
    required this.expectedRevision,
  });

  final String liveSessionId;

  final String expectedGeneration;

  final String expectedRevision;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'expectedGeneration': expectedGeneration,
        'expectedRevision': expectedRevision,
      };
}

final class EventsRequestInput {
  const EventsRequestInput({
    required this.conversationId,
    required this.limit,
    this.after,
  });

  final String conversationId;

  final int limit;

  final CursorInput? after;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'limit': limit,
        if (after case final value?) 'after': value.toJson(),
      };
}

final class GetConversationRequestInput {
  const GetConversationRequestInput({
    required this.conversationId,
  });

  final String conversationId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
      };
}

final class GetMessageRequestInput {
  const GetMessageRequestInput({
    required this.conversationId,
    required this.messageId,
    this.actAsPrincipalId,
  });

  final String conversationId;

  final String messageId;

  final String? actAsPrincipalId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'messageId': messageId,
        if (actAsPrincipalId case final value?) 'actAsPrincipalId': value,
      };
}

final class GetOperationRequestInput {
  const GetOperationRequestInput({
    required this.operationId,
  });

  final String operationId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'operationId': operationId,
      };
}

final class InboxRequestInput {
  const InboxRequestInput({
    required this.limit,
    this.cursor,
    this.actAsPrincipalId,
  });

  final int limit;

  final String? cursor;

  final String? actAsPrincipalId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'limit': limit,
        if (cursor case final value?) 'cursor': value,
        if (actAsPrincipalId case final value?) 'actAsPrincipalId': value,
      };
}

final class JoinLiveSessionInput {
  const JoinLiveSessionInput({
    required this.liveSessionId,
    required this.expectedGeneration,
  });

  final String liveSessionId;

  final String expectedGeneration;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'expectedGeneration': expectedGeneration,
      };
}

final class LeaveLiveSessionInput {
  const LeaveLiveSessionInput({
    required this.liveSessionId,
    required this.expectedGeneration,
    required this.participationId,
  });

  final String liveSessionId;

  final String expectedGeneration;

  final String participationId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'expectedGeneration': expectedGeneration,
        'participationId': participationId,
      };
}

final class LiveAlertsInput {
  const LiveAlertsInput({
    this.limit,
    this.cursor,
  });

  /// The server uses `50` when it's null.
  final int? limit;

  final String? cursor;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        if (limit case final value?) 'limit': value,
        if (cursor case final value?) 'cursor': value,
      };
}

final class LiveParticipantsInput {
  const LiveParticipantsInput({
    required this.liveSessionId,
    this.limit,
    this.cursor,
  });

  final String liveSessionId;

  /// The server uses `50` when it's null.
  final int? limit;

  final String? cursor;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        if (limit case final value?) 'limit': value,
        if (cursor case final value?) 'cursor': value,
      };
}

final class LiveSessionCredentialsInput {
  const LiveSessionCredentialsInput({
    required this.liveSessionId,
    required this.participationId,
    required this.expectedGeneration,
    required this.mode,
    this.replacementOfConnectionId,
  });

  final String liveSessionId;

  final String participationId;

  final String expectedGeneration;

  final LiveConnectionMode mode;

  final String? replacementOfConnectionId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
        'participationId': participationId,
        'expectedGeneration': expectedGeneration,
        'mode': mode.wire,
        if (replacementOfConnectionId case final value?) 'replacementOfConnectionId': value,
      };
}

final class LiveSessionInput {
  const LiveSessionInput({
    required this.liveSessionId,
  });

  final String liveSessionId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'liveSessionId': liveSessionId,
      };
}

final class LiveSessionOperationInput {
  const LiveSessionOperationInput({
    required this.operationId,
  });

  final String operationId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'operationId': operationId,
      };
}

final class LiveSessionsInput {
  const LiveSessionsInput({
    required this.conversationId,
    this.limit,
    this.cursor,
  });

  final String conversationId;

  /// The server uses `50` when it's null.
  final int? limit;

  final String? cursor;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        if (limit case final value?) 'limit': value,
        if (cursor case final value?) 'cursor': value,
      };
}

final class MembersRequestInput {
  const MembersRequestInput({
    required this.conversationId,
    required this.limit,
    this.cursor,
  });

  final String conversationId;

  final int limit;

  final String? cursor;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'limit': limit,
        if (cursor case final value?) 'cursor': value,
      };
}

final class MessagesRequestInput {
  const MessagesRequestInput({
    required this.conversationId,
    required this.limit,
    this.beforeSequence,
    this.actAsPrincipalId,
  });

  final String conversationId;

  final int limit;

  final String? beforeSequence;

  final String? actAsPrincipalId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'limit': limit,
        if (beforeSequence case final value?) 'beforeSequence': value,
        if (actAsPrincipalId case final value?) 'actAsPrincipalId': value,
      };
}

final class ReceiptsRequestInput {
  const ReceiptsRequestInput({
    required this.conversationId,
    required this.limit,
    this.cursor,
  });

  final String conversationId;

  final int limit;

  final String? cursor;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'limit': limit,
        if (cursor case final value?) 'cursor': value,
      };
}

final class ReportReceiptRequestInput {
  const ReportReceiptRequestInput({
    required this.conversationId,
    required this.kind,
    required this.membershipEpoch,
    required this.visibilityEpoch,
    required this.throughSequence,
  });

  final String conversationId;

  final String kind;

  final String membershipEpoch;

  final String visibilityEpoch;

  final String throughSequence;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'kind': kind,
        'membershipEpoch': membershipEpoch,
        'visibilityEpoch': visibilityEpoch,
        'throughSequence': throughSequence,
      };
}

final class ResolveRequestRequestInput {
  const ResolveRequestRequestInput({
    required this.requestId,
  });

  final String requestId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'requestId': requestId,
      };
}

final class RevokeSessionRequestInput {
  const RevokeSessionRequestInput({
    required this.sessionId,
    required this.expectedRevision,
  });

  final String sessionId;

  final String expectedRevision;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'sessionId': sessionId,
        'expectedRevision': expectedRevision,
      };
}

final class SearchRequestInput {
  const SearchRequestInput({
    required this.query,
    required this.pageSize,
    this.scope,
    this.cursor,
    this.actAsPrincipalId,
  });

  final String query;

  final int pageSize;

  final SearchScopeInput? scope;

  final String? cursor;

  final String? actAsPrincipalId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'query': query,
        'pageSize': pageSize,
        if (scope case final value?) 'scope': value.toJson(),
        if (cursor case final value?) 'cursor': value,
        if (actAsPrincipalId case final value?) 'actAsPrincipalId': value,
      };
}

final class SearchScopeInput {
  const SearchScopeInput({
    required this.conversationIds,
  });

  final List<String> conversationIds;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationIds': conversationIds,
      };
}

final class SendMessageRequestInput {
  const SendMessageRequestInput({
    required this.conversationId,
    required this.text,
    required this.props,
    this.actAsPrincipalId,
  });

  final String conversationId;

  final String text;

  final Map<String, Object?> props;

  final String? actAsPrincipalId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'text': text,
        'props': props,
        if (actAsPrincipalId case final value?) 'actAsPrincipalId': value,
      };
}

final class SetConversationMuteInput {
  const SetConversationMuteInput({
    required this.conversationId,
    required this.muted,
    this.until,
    this.actAsPrincipalId,
  });

  final String conversationId;

  final bool muted;

  final String? until;

  final String? actAsPrincipalId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'muted': muted,
        if (until case final value?) 'until': value,
        if (actAsPrincipalId case final value?) 'actAsPrincipalId': value,
      };
}

final class StartLiveSessionInput {
  const StartLiveSessionInput({
    required this.conversationId,
    this.kind,
    this.mediaProfile,
  });

  final String conversationId;

  /// The server uses `"INTERACTIVE"` when it's null.
  final LiveSessionKind? kind;

  /// The server uses `"AUDIO_ONLY"` when it's null.
  final LiveMediaProfile? mediaProfile;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        if (kind case final value?) 'kind': value.wire,
        if (mediaProfile case final value?) 'mediaProfile': value.wire,
      };
}

final class TypingRequestInput {
  const TypingRequestInput({
    required this.conversationId,
    required this.isTyping,
  });

  final String conversationId;

  final bool isTyping;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'isTyping': isTyping,
      };
}

final class UpdateConversationRequestInput {
  const UpdateConversationRequestInput({
    required this.conversationId,
    required this.expectedRevision,
    this.title,
    this.props,
  });

  final String conversationId;

  final String expectedRevision;

  final String? title;

  final Map<String, Object?>? props;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'conversationId': conversationId,
        'expectedRevision': expectedRevision,
        if (title case final value?) 'title': value,
        if (props case final value?) 'props': value,
      };
}
