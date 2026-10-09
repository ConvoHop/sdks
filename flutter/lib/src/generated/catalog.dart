// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
// dart format off
// ignore_for_file: type=lint, deprecated_member_use_from_same_package
part of 'generated.dart';

/// The GraphQL operation type.
enum OperationKind { query, mutation, subscription }

/// How a request may be retried.
final class IdempotencySpec {
  const IdempotencySpec({
    required this.name,
    required this.retry,
    required this.resolvable,
    required this.maxAttempts,
    required this.windowMs,
  });

  /// The idempotency class.
  final String name;

  /// `none`, `repeat` or `sameRequest`.
  final String retry;

  /// Whether `resolveRequest` can settle an unknown outcome.
  final bool resolvable;

  /// Attempts per request ID, including the first, or null without a retry budget.
  final int? maxAttempts;

  /// Milliseconds after the first attempt in which retries may start, or null without a retry budget.
  final int? windowMs;
}

/// The idempotency classes.
abstract final class IdempotencyClasses {
  /// Transient signal. Not deduplicated or retried; send a fresh signal instead.
  static const ephemeral = IdempotencySpec(
    name: 'ephemeral',
    retry: 'none',
    resolvable: false,
    maxAttempts: null,
    windowMs: null,
  );

  /// Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
  static const idempotent = IdempotencySpec(
    name: 'idempotent',
    retry: 'sameRequest',
    resolvable: true,
    maxAttempts: 3,
    windowMs: 60000,
  );

  /// Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.
  static const permitBound = IdempotencySpec(
    name: 'permitBound',
    retry: 'sameRequest',
    resolvable: false,
    maxAttempts: 3,
    windowMs: 60000,
  );

  /// Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
  static const replayOnly = IdempotencySpec(
    name: 'replayOnly',
    retry: 'sameRequest',
    resolvable: false,
    maxAttempts: 3,
    windowMs: 60000,
  );

  /// Read-only. Repeat freely; each attempt may use a new requestId.
  static const safe = IdempotencySpec(
    name: 'safe',
    retry: 'repeat',
    resolvable: false,
    maxAttempts: null,
    windowMs: null,
  );

  /// Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.
  static const singleUse = IdempotencySpec(
    name: 'singleUse',
    retry: 'sameRequest',
    resolvable: true,
    maxAttempts: 3,
    windowMs: 60000,
  );
}

/// A generated GraphQL operation: its document, request rules and result decoder.
final class OperationSpec<T> {
  const OperationSpec({
    required this.id,
    required this.plane,
    required this.kind,
    required this.field,
    required this.operationName,
    required this.document,
    required this.resultType,
    required this.contextArgument,
    required this.contextFields,
    required this.inputArgument,
    required this.inputRequired,
    required this.inputFields,
    required this.idempotency,
    required this.pagination,
    required this.realtime,
    required this.errorCodes,
    required this.decode,
  });

  /// `<plane>.<field>`.
  final String id;

  final String plane;

  final OperationKind kind;

  /// The root field.
  final String field;

  final String operationName;

  /// The GraphQL document.
  final String document;

  /// The result type in GraphQL syntax.
  final String resultType;

  /// The argument that carries request metadata, or null.
  final String? contextArgument;

  /// How the operation uses each context field: `required`, `optional` or `forbidden`.
  final Map<String, String> contextFields;

  /// The argument that carries the input, or null.
  final String? inputArgument;

  final bool inputRequired;

  final List<String> inputFields;

  final IdempotencySpec idempotency;

  /// The pagination style, such as `none`, `cursor` or `replay`.
  final String pagination;

  /// The realtime mode, such as `none` or `subscription`.
  final String realtime;

  /// The error codes the operation can fail with.
  final List<String> errorCodes;

  /// Decodes and validates the result. Malformed values throw a [FormatException].
  final T Function(Object? json) decode;
}

/// The operations a user session can run.
abstract final class Operations {
  /// Describe the features, limits and API model the authority supports.
  static const communicationCapabilities = OperationSpec<CapabilitiesReply>(
    id: 'communication.capabilities',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'capabilities',
    operationName: 'CommunicationCapabilities',
    document: 'query CommunicationCapabilities(\$context: RequestContextInput!) {\n'
        '  capabilities(context: \$context) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      serverRelease\n'
        '      capabilityRevision\n'
        '      limitsRevision\n'
        '      features {\n'
        '        chat\n'
        '        inbox\n'
        '        lexicalSearch\n'
        '        typing\n'
        '        webhooks\n'
        '        liveSessions\n'
        '        liveBroadcast\n'
        '      }\n'
        '      limits {\n'
        '        key\n'
        '        value {\n'
        '          maximum\n'
        '          unit\n'
        '          scope\n'
        '          milliseconds\n'
        '          policyId\n'
        '          revision\n'
        '        }\n'
        '      }\n'
        '      environment\n'
        '      productionQualified\n'
        '      mediaPolicy {\n'
        '        leasePolicyId\n'
        '        maxLeaseMs\n'
        '        renewAttemptMs\n'
        '        preludeMaxBytes\n'
        '        preludeTimeoutMs\n'
        '        clockProfileId\n'
        '      }\n'
        '      geoControlAuthorityId\n'
        '      offerings\n'
        '      geos\n'
        '      installationProfiles\n'
        '      portalIdentity\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'CapabilitiesReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'optional', 'observedServingEpoch': 'optional', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: null,
    inputRequired: false,
    inputFields: <String>[],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED'],
    decode: _resultCommunicationCapabilities,
  );

  /// Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.
  static const communicationRoute = OperationSpec<RouteReply>(
    id: 'communication.route',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'route',
    operationName: 'CommunicationRoute',
    document: 'query CommunicationRoute(\$context: RequestContextInput!) {\n'
        '  route(context: \$context) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result\n'
        '  }\n'
        '}',
    resultType: 'RouteReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'optional', 'observedServingEpoch': 'optional', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: null,
    inputRequired: false,
    inputFields: <String>[],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED'],
    decode: _resultCommunicationRoute,
  );

  /// Return the calling user session.
  static const communicationCurrentSession = OperationSpec<CurrentSessionReply>(
    id: 'communication.currentSession',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'currentSession',
    operationName: 'CommunicationCurrentSession',
    document: 'query CommunicationCurrentSession(\$context: RequestContextInput!) {\n'
        '  currentSession(context: \$context) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    result {\n'
        '      sessionId\n'
        '      principalId\n'
        '      deviceId\n'
        '      incarnation\n'
        '      sessionRevision\n'
        '      expiresAt\n'
        '      status\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'CurrentSessionReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: null,
    inputRequired: false,
    inputFields: <String>[],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationCurrentSession,
  );

  /// Read a conversation.
  static const communicationGetConversation = OperationSpec<GetConversationReply>(
    id: 'communication.getConversation',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'getConversation',
    operationName: 'CommunicationGetConversation',
    document: 'query CommunicationGetConversation(\$context: RequestContextInput!, \$input: GetConversationRequestInput!) {\n'
        '  getConversation(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      conversationId\n'
        '      revision\n'
        '      title\n'
        '      props\n'
        '      latestSequence\n'
        '      membership {\n'
        '        conversationId\n'
        '        principalId\n'
        '        role\n'
        '        status\n'
        '        membershipEpoch\n'
        '        visibilityEpoch\n'
        '        revision\n'
        '        visibleFromSequence\n'
        '        canStartBroadcast\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'GetConversationReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationGetConversation,
  );

  /// List the members of a conversation.
  static const communicationMembers = OperationSpec<MembersReply>(
    id: 'communication.members',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'members',
    operationName: 'CommunicationMembers',
    document: 'query CommunicationMembers(\$context: RequestContextInput!, \$input: MembersRequestInput!) {\n'
        '  members(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      items {\n'
        '        conversationId\n'
        '        principalId\n'
        '        role\n'
        '        status\n'
        '        membershipEpoch\n'
        '        visibilityEpoch\n'
        '        revision\n'
        '        visibleFromSequence\n'
        '        canStartBroadcast\n'
        '      }\n'
        '      complete\n'
        '      refreshRequired\n'
        '      nextCursor\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'MembersReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'limit', 'cursor'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'cursor',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationMembers,
  );

  /// List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.
  static const communicationMessages = OperationSpec<MessagesReply>(
    id: 'communication.messages',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'messages',
    operationName: 'CommunicationMessages',
    document: 'query CommunicationMessages(\$context: RequestContextInput!, \$input: MessagesRequestInput!) {\n'
        '  messages(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      items {\n'
        '        messageId\n'
        '        conversationId\n'
        '        authorId\n'
        '        sequence\n'
        '        revision\n'
        '        revisionSequence\n'
        '        createdAt\n'
        '        deleted\n'
        '        text\n'
        '        props\n'
        '        editedAt\n'
        '      }\n'
        '      complete\n'
        '      refreshRequired\n'
        '      nextCursor\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'MessagesReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'limit', 'beforeSequence', 'actAsPrincipalId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'sequence',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'PAGE_ITEM_TOO_LARGE', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationMessages,
  );

  /// Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.
  static const communicationGetMessage = OperationSpec<GetMessageReply>(
    id: 'communication.getMessage',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'getMessage',
    operationName: 'CommunicationGetMessage',
    document: 'query CommunicationGetMessage(\$context: RequestContextInput!, \$input: GetMessageRequestInput!) {\n'
        '  getMessage(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      messageId\n'
        '      conversationId\n'
        '      authorId\n'
        '      sequence\n'
        '      revision\n'
        '      revisionSequence\n'
        '      createdAt\n'
        '      deleted\n'
        '      text\n'
        '      props\n'
        '      editedAt\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'GetMessageReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'messageId', 'actAsPrincipalId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'MESSAGE_DELETED', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationGetMessage,
  );

  /// Replay committed conversation events after a cursor, in sequence order.
  static const communicationEvents = OperationSpec<EventsReply>(
    id: 'communication.events',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'events',
    operationName: 'CommunicationEvents',
    document: 'query CommunicationEvents(\$context: RequestContextInput!, \$input: EventsRequestInput!) {\n'
        '  events(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      items {\n'
        '        eventId\n'
        '        conversationId\n'
        '        sequence\n'
        '        type\n'
        '        occurredAt\n'
        '        subjectRef {\n'
        '          kind\n'
        '          id\n'
        '        }\n'
        '        payload {\n'
        '          messageId\n'
        '          revision\n'
        '          revisionSequence\n'
        '          principalId\n'
        '          membershipEpoch\n'
        '          visibilityEpoch\n'
        '          kind\n'
        '          throughSequence\n'
        '          callId\n'
        '          generation\n'
        '          state\n'
        '          cutoffEvidence\n'
        '          liveSessionId\n'
        '        }\n'
        '      }\n'
        '      complete\n'
        '      refreshRequired\n'
        '      nextCursor {\n'
        '        incarnation\n'
        '        conversationId\n'
        '        sequence\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'EventsReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'limit', 'after'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'replay',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'CURSOR_AHEAD', 'CURSOR_EXPIRED', 'CURSOR_SCOPE_MISMATCH', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationEvents,
  );

  /// List the delivery and read receipts of a conversation.
  static const communicationReceipts = OperationSpec<ReceiptsReply>(
    id: 'communication.receipts',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'receipts',
    operationName: 'CommunicationReceipts',
    document: 'query CommunicationReceipts(\$context: RequestContextInput!, \$input: ReceiptsRequestInput!) {\n'
        '  receipts(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      items {\n'
        '        principalId\n'
        '        membershipEpoch\n'
        '        visibilityEpoch\n'
        '        deliveredThroughSequence\n'
        '        readThroughSequence\n'
        '        updatedAt\n'
        '      }\n'
        '      complete\n'
        '      refreshRequired\n'
        '      nextCursor\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'ReceiptsReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'limit', 'cursor'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'cursor',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationReceipts,
  );

  /// List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.
  static const communicationInbox = OperationSpec<InboxReply>(
    id: 'communication.inbox',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'inbox',
    operationName: 'CommunicationInbox',
    document: 'query CommunicationInbox(\$context: RequestContextInput!, \$input: InboxRequestInput!) {\n'
        '  inbox(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      items {\n'
        '        conversationId\n'
        '        title\n'
        '        activityAt\n'
        '        visibilityEpoch\n'
        '        latestVisibleMessage {\n'
        '          messageId\n'
        '          conversationId\n'
        '          authorId\n'
        '          sequence\n'
        '          revision\n'
        '          revisionSequence\n'
        '          createdAt\n'
        '          deleted\n'
        '          text\n'
        '          props\n'
        '          editedAt\n'
        '        }\n'
        '        hasUnread\n'
        '      }\n'
        '      complete\n'
        '      refreshRequired\n'
        '      nextCursor\n'
        '      partialReason\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'InboxReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['limit', 'cursor', 'actAsPrincipalId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'cursor',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'CURSOR_EXPIRED', 'CURSOR_SCOPE_MISMATCH', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'PAGE_ITEM_TOO_LARGE', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationInbox,
  );

  /// Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.
  static const communicationSearch = OperationSpec<SearchReply>(
    id: 'communication.search',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'search',
    operationName: 'CommunicationSearch',
    document: 'query CommunicationSearch(\$context: RequestContextInput!, \$input: SearchRequestInput!) {\n'
        '  search(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      items {\n'
        '        conversationId\n'
        '        message {\n'
        '          messageId\n'
        '          conversationId\n'
        '          authorId\n'
        '          sequence\n'
        '          revision\n'
        '          revisionSequence\n'
        '          createdAt\n'
        '          deleted\n'
        '          text\n'
        '          props\n'
        '          editedAt\n'
        '        }\n'
        '      }\n'
        '      complete\n'
        '      refreshRequired\n'
        '      nextCursor\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'SearchReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['query', 'pageSize', 'scope', 'cursor', 'actAsPrincipalId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'cursor',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'CURSOR_SCOPE_MISMATCH', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'PAGE_ITEM_TOO_LARGE', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationSearch,
  );

  /// Look up the stored outcome of an earlier communication mutation by its requestId.
  static const communicationResolveRequest = OperationSpec<ResolveRequestReply>(
    id: 'communication.resolveRequest',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'resolveRequest',
    operationName: 'CommunicationResolveRequest',
    document: 'query CommunicationResolveRequest(\$context: RequestContextInput!, \$input: ResolveRequestRequestInput!) {\n'
        '  resolveRequest(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      state\n'
        '      requestId\n'
        '      checkedAt\n'
        '      resultWithheld\n'
        '      receipt {\n'
        '        status\n'
        '        requestId\n'
        '        serverTime\n'
        '        receiptId\n'
        '        committedAt\n'
        '        replayed\n'
        '        operation {\n'
        '          operationId\n'
        '          owner\n'
        '          href\n'
        '          state\n'
        '        }\n'
        '        resourceRef {\n'
        '          kind\n'
        '          id\n'
        '        }\n'
        '        result {\n'
        '          billingCheckoutSession {\n'
        '            orgId\n'
        '            planId\n'
        '            url\n'
        '            expiresAt\n'
        '          }\n'
        '          billingPortalSession {\n'
        '            orgId\n'
        '            url\n'
        '            expiresAt\n'
        '          }\n'
        '          broadcastPermissionChanged {\n'
        '            member {\n'
        '              conversationId\n'
        '              principalId\n'
        '              role\n'
        '              status\n'
        '              membershipEpoch\n'
        '              visibilityEpoch\n'
        '              revision\n'
        '              visibleFromSequence\n'
        '              canStartBroadcast\n'
        '            }\n'
        '            mediaCutoff {\n'
        '              state\n'
        '              scope {\n'
        '                kind\n'
        '                liveSessionId\n'
        '                generation\n'
        '                participationId\n'
        '              }\n'
        '              evidence\n'
        '              enforcedAt\n'
        '              operationId\n'
        '            }\n'
        '          }\n'
        '          conversation {\n'
        '            conversationId\n'
        '            revision\n'
        '            title\n'
        '            props\n'
        '            latestSequence\n'
        '            membership {\n'
        '              conversationId\n'
        '              principalId\n'
        '              role\n'
        '              status\n'
        '              membershipEpoch\n'
        '              visibilityEpoch\n'
        '              revision\n'
        '              visibleFromSequence\n'
        '              canStartBroadcast\n'
        '            }\n'
        '          }\n'
        '          conversationMemberBatch {\n'
        '            items {\n'
        '              conversationId\n'
        '              principalId\n'
        '              role\n'
        '              status\n'
        '              membershipEpoch\n'
        '              visibilityEpoch\n'
        '              revision\n'
        '              visibleFromSequence\n'
        '              canStartBroadcast\n'
        '            }\n'
        '          }\n'
        '          conversationMute {\n'
        '            conversationId\n'
        '            principalId\n'
        '            muted\n'
        '            until\n'
        '          }\n'
        '          credentialDeliveryReceipt {\n'
        '            deliveryId\n'
        '          }\n'
        '          deliveryAck {\n'
        '            deliveryId\n'
        '            acknowledged\n'
        '          }\n'
        '          liveAlertBatch {\n'
        '            liveSessionId\n'
        '            created\n'
        '            suppressed\n'
        '          }\n'
        '          liveCredentialIssuance {\n'
        '            liveSessionId\n'
        '            participationId\n'
        '            generation\n'
        '            leaseId\n'
        '            grantOrdinal\n'
        '            admissionExpiresAt\n'
        '            leaseExpiresAt\n'
        '          }\n'
        '          liveSessionEndRequested {\n'
        '            liveSessionId\n'
        '            operationId\n'
        '            mediaCutoff {\n'
        '              state\n'
        '              scope {\n'
        '                kind\n'
        '                liveSessionId\n'
        '                generation\n'
        '                participationId\n'
        '              }\n'
        '              evidence\n'
        '              enforcedAt\n'
        '              operationId\n'
        '            }\n'
        '          }\n'
        '          liveSessionJoined {\n'
        '            liveSessionId\n'
        '            generation\n'
        '            participation {\n'
        '              participationId\n'
        '              principalId\n'
        '              membershipEpoch\n'
        '              role\n'
        '              state\n'
        '              permissions {\n'
        '                microphone\n'
        '                camera\n'
        '                subscribe\n'
        '              }\n'
        '              reservationExpiresAt\n'
        '              nativeConnectionId\n'
        '              mediaCutoff {\n'
        '                state\n'
        '                scope {\n'
        '                  kind\n'
        '                  liveSessionId\n'
        '                  generation\n'
        '                  participationId\n'
        '                }\n'
        '                evidence\n'
        '                enforcedAt\n'
        '                operationId\n'
        '              }\n'
        '            }\n'
        '          }\n'
        '          liveSessionLeft {\n'
        '            liveSessionId\n'
        '            participationId\n'
        '            mediaCutoff {\n'
        '              state\n'
        '              scope {\n'
        '                kind\n'
        '                liveSessionId\n'
        '                generation\n'
        '                participationId\n'
        '              }\n'
        '              evidence\n'
        '              enforcedAt\n'
        '              operationId\n'
        '            }\n'
        '          }\n'
        '          liveSessionStarted {\n'
        '            liveSessionId\n'
        '            conversationId\n'
        '            kind\n'
        '            mediaProfile\n'
        '            operationId\n'
        '          }\n'
        '          member {\n'
        '            conversationId\n'
        '            principalId\n'
        '            role\n'
        '            status\n'
        '            membershipEpoch\n'
        '            visibilityEpoch\n'
        '            revision\n'
        '            visibleFromSequence\n'
        '            canStartBroadcast\n'
        '          }\n'
        '          message {\n'
        '            messageId\n'
        '            conversationId\n'
        '            authorId\n'
        '            sequence\n'
        '            revision\n'
        '            revisionSequence\n'
        '            createdAt\n'
        '            deleted\n'
        '            text\n'
        '            props\n'
        '            editedAt\n'
        '          }\n'
        '          messageAck {\n'
        '            messageId\n'
        '            conversationId\n'
        '            sequence\n'
        '            revision\n'
        '            status\n'
        '            cursor {\n'
        '              incarnation\n'
        '              conversationId\n'
        '              sequence\n'
        '            }\n'
        '          }\n'
        '          organization {\n'
        '            orgId\n'
        '            name\n'
        '            status\n'
        '            revision\n'
        '          }\n'
        '          principal {\n'
        '            principalId\n'
        '            externalUserId\n'
        '            status\n'
        '            revision\n'
        '          }\n'
        '          readReceipt {\n'
        '            principalId\n'
        '            membershipEpoch\n'
        '            visibilityEpoch\n'
        '            deliveredThroughSequence\n'
        '            readThroughSequence\n'
        '            updatedAt\n'
        '          }\n'
        '          sessionBootstrap {\n'
        '            session {\n'
        '              sessionId\n'
        '              principalId\n'
        '              deviceId\n'
        '              incarnation\n'
        '              sessionRevision\n'
        '              expiresAt\n'
        '              status\n'
        '            }\n'
        '            tokenExpiresAt\n'
        '            sessionToken\n'
        '          }\n'
        '          sessionRevocation {\n'
        '            sessionId\n'
        '            status\n'
        '            mediaCutoff {\n'
        '              state\n'
        '              scope {\n'
        '                kind\n'
        '                principalId\n'
        '                sessionId\n'
        '                deviceId\n'
        '                callId\n'
        '              }\n'
        '            }\n'
        '          }\n'
        '          signedProof\n'
        '        }\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'ResolveRequestReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['requestId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'CREDENTIAL_EXPIRED', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationResolveRequest,
  );

  /// Read the state of a long-running communication operation.
  static const communicationGetOperation = OperationSpec<GetOperationReply>(
    id: 'communication.getOperation',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'getOperation',
    operationName: 'CommunicationGetOperation',
    document: 'query CommunicationGetOperation(\$context: RequestContextInput!, \$input: GetOperationRequestInput!) {\n'
        '  getOperation(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      operationId\n'
        '      kind\n'
        '      targetRef {\n'
        '        kind\n'
        '        id\n'
        '      }\n'
        '      state\n'
        '      revision\n'
        '      requestedAt\n'
        '      updatedAt\n'
        '      steps {\n'
        '        stepId\n'
        '        state\n'
        '      }\n'
        '      result {\n'
        '        projectId\n'
        '        incarnation\n'
        '        status\n'
        '        backend\n'
        '        environment\n'
        '        policyRevision\n'
        '        expiresAt\n'
        '        kind\n'
        '        resourceRef {\n'
        '          kind\n'
        '          id\n'
        '        }\n'
        '        delivery {\n'
        '          deliveryId\n'
        '          kind\n'
        '          projectId\n'
        '          installationId\n'
        '          resourceRef {\n'
        '            kind\n'
        '            id\n'
        '          }\n'
        '          expiresAt\n'
        '          payloadDigest\n'
        '          recipientActorRef {\n'
        '            tenantId\n'
        '            objectId\n'
        '          }\n'
        '        }\n'
        '        keyId\n'
        '        endpointId\n'
        '        enabled\n'
        '        liveSessionCompletion {\n'
        '          liveSessionId\n'
        '          generation\n'
        '          state\n'
        '          revision\n'
        '          completedAt\n'
        '          mediaCutoff {\n'
        '            state\n'
        '            scope {\n'
        '              kind\n'
        '              liveSessionId\n'
        '              generation\n'
        '              participationId\n'
        '            }\n'
        '            evidence\n'
        '            enforcedAt\n'
        '            operationId\n'
        '          }\n'
        '        }\n'
        '        replayedDeliveries\n'
        '        skippedDeliveries\n'
        '        messagePreview\n'
        '      }\n'
        '      blockedReason\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'GetOperationReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['operationId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationGetOperation,
  );

  /// Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.
  static const communicationConversationMute = OperationSpec<ConversationMuteReply>(
    id: 'communication.conversationMute',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'conversationMute',
    operationName: 'CommunicationConversationMute',
    document: 'query CommunicationConversationMute(\$context: RequestContextInput!, \$input: ConversationMuteInput!) {\n'
        '  conversationMute(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    result {\n'
        '      conversationId\n'
        '      principalId\n'
        '      muted\n'
        '      until\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'ConversationMuteReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'actAsPrincipalId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationConversationMute,
  );

  /// Return the active live session of a conversation, if any.
  static const communicationCurrentLiveSession = OperationSpec<CurrentLiveSessionReply>(
    id: 'communication.currentLiveSession',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'currentLiveSession',
    operationName: 'CommunicationCurrentLiveSession',
    document: 'query CommunicationCurrentLiveSession(\$context: RequestContextInput!, \$input: ConversationLiveInput!) {\n'
        '  currentLiveSession(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    result {\n'
        '      liveSessionId\n'
        '      conversationId\n'
        '      creatorId\n'
        '      kind\n'
        '      mediaProfile\n'
        '      state\n'
        '      generation\n'
        '      revision\n'
        '      createdAt\n'
        '      expiresAt\n'
        '      myParticipation {\n'
        '        participationId\n'
        '        principalId\n'
        '        membershipEpoch\n'
        '        role\n'
        '        state\n'
        '        permissions {\n'
        '          microphone\n'
        '          camera\n'
        '          subscribe\n'
        '        }\n'
        '        reservationExpiresAt\n'
        '        nativeConnectionId\n'
        '        mediaCutoff {\n'
        '          state\n'
        '          scope {\n'
        '            kind\n'
        '            liveSessionId\n'
        '            generation\n'
        '            participationId\n'
        '          }\n'
        '          evidence\n'
        '          enforcedAt\n'
        '          operationId\n'
        '        }\n'
        '      }\n'
        '      mediaCutoff {\n'
        '        state\n'
        '        scope {\n'
        '          kind\n'
        '          liveSessionId\n'
        '          generation\n'
        '          participationId\n'
        '        }\n'
        '        evidence\n'
        '        enforcedAt\n'
        '        operationId\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'CurrentLiveSessionReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationCurrentLiveSession,
  );

  /// Read a live session.
  static const communicationLiveSession = OperationSpec<LiveSessionReply>(
    id: 'communication.liveSession',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'liveSession',
    operationName: 'CommunicationLiveSession',
    document: 'query CommunicationLiveSession(\$context: RequestContextInput!, \$input: LiveSessionInput!) {\n'
        '  liveSession(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    result {\n'
        '      liveSessionId\n'
        '      conversationId\n'
        '      creatorId\n'
        '      kind\n'
        '      mediaProfile\n'
        '      state\n'
        '      generation\n'
        '      revision\n'
        '      createdAt\n'
        '      expiresAt\n'
        '      myParticipation {\n'
        '        participationId\n'
        '        principalId\n'
        '        membershipEpoch\n'
        '        role\n'
        '        state\n'
        '        permissions {\n'
        '          microphone\n'
        '          camera\n'
        '          subscribe\n'
        '        }\n'
        '        reservationExpiresAt\n'
        '        nativeConnectionId\n'
        '        mediaCutoff {\n'
        '          state\n'
        '          scope {\n'
        '            kind\n'
        '            liveSessionId\n'
        '            generation\n'
        '            participationId\n'
        '          }\n'
        '          evidence\n'
        '          enforcedAt\n'
        '          operationId\n'
        '        }\n'
        '      }\n'
        '      mediaCutoff {\n'
        '        state\n'
        '        scope {\n'
        '          kind\n'
        '          liveSessionId\n'
        '          generation\n'
        '          participationId\n'
        '        }\n'
        '        evidence\n'
        '        enforcedAt\n'
        '        operationId\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'LiveSessionReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['liveSessionId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationLiveSession,
  );

  /// List the live sessions of a conversation.
  static const communicationLiveSessions = OperationSpec<LiveSessionPageReply>(
    id: 'communication.liveSessions',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'liveSessions',
    operationName: 'CommunicationLiveSessions',
    document: 'query CommunicationLiveSessions(\$context: RequestContextInput!, \$input: LiveSessionsInput!) {\n'
        '  liveSessions(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    result {\n'
        '      items {\n'
        '        liveSessionId\n'
        '        conversationId\n'
        '        creatorId\n'
        '        kind\n'
        '        mediaProfile\n'
        '        state\n'
        '        generation\n'
        '        revision\n'
        '        createdAt\n'
        '        expiresAt\n'
        '        myParticipation {\n'
        '          participationId\n'
        '          principalId\n'
        '          membershipEpoch\n'
        '          role\n'
        '          state\n'
        '          permissions {\n'
        '            microphone\n'
        '            camera\n'
        '            subscribe\n'
        '          }\n'
        '          reservationExpiresAt\n'
        '          nativeConnectionId\n'
        '          mediaCutoff {\n'
        '            state\n'
        '            scope {\n'
        '              kind\n'
        '              liveSessionId\n'
        '              generation\n'
        '              participationId\n'
        '            }\n'
        '            evidence\n'
        '            enforcedAt\n'
        '            operationId\n'
        '          }\n'
        '        }\n'
        '        mediaCutoff {\n'
        '          state\n'
        '          scope {\n'
        '            kind\n'
        '            liveSessionId\n'
        '            generation\n'
        '            participationId\n'
        '          }\n'
        '          evidence\n'
        '          enforcedAt\n'
        '          operationId\n'
        '        }\n'
        '      }\n'
        '      nextCursor\n'
        '      complete\n'
        '      partialReason\n'
        '      refreshRequired\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'LiveSessionPageReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'limit', 'cursor'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'cursor',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'CURSOR_INVALID', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationLiveSessions,
  );

  /// List the participants of a live session.
  static const communicationLiveSessionParticipants = OperationSpec<LiveParticipantPageReply>(
    id: 'communication.liveSessionParticipants',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'liveSessionParticipants',
    operationName: 'CommunicationLiveSessionParticipants',
    document: 'query CommunicationLiveSessionParticipants(\$context: RequestContextInput!, \$input: LiveParticipantsInput!) {\n'
        '  liveSessionParticipants(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    result {\n'
        '      items {\n'
        '        participationId\n'
        '        principalId\n'
        '        membershipEpoch\n'
        '        role\n'
        '        state\n'
        '        permissions {\n'
        '          microphone\n'
        '          camera\n'
        '          subscribe\n'
        '        }\n'
        '        reservationExpiresAt\n'
        '        nativeConnectionId\n'
        '        mediaCutoff {\n'
        '          state\n'
        '          scope {\n'
        '            kind\n'
        '            liveSessionId\n'
        '            generation\n'
        '            participationId\n'
        '          }\n'
        '          evidence\n'
        '          enforcedAt\n'
        '          operationId\n'
        '        }\n'
        '      }\n'
        '      nextCursor\n'
        '      complete\n'
        '      partialReason\n'
        '      refreshRequired\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'LiveParticipantPageReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['liveSessionId', 'limit', 'cursor'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'cursor',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'CURSOR_INVALID', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationLiveSessionParticipants,
  );

  /// List the live session alerts addressed to the calling user.
  static const communicationLiveSessionAlerts = OperationSpec<LiveAlertPageReply>(
    id: 'communication.liveSessionAlerts',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'liveSessionAlerts',
    operationName: 'CommunicationLiveSessionAlerts',
    document: 'query CommunicationLiveSessionAlerts(\$context: RequestContextInput!, \$input: LiveAlertsInput!) {\n'
        '  liveSessionAlerts(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    result {\n'
        '      items {\n'
        '        alertId\n'
        '        liveSessionId\n'
        '        conversationId\n'
        '        generation\n'
        '        membershipEpoch\n'
        '        createdAt\n'
        '        expiresAt\n'
        '      }\n'
        '      nextCursor\n'
        '      complete\n'
        '      partialReason\n'
        '      refreshRequired\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'LiveAlertPageReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['limit', 'cursor'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'cursor',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'CURSOR_INVALID', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationLiveSessionAlerts,
  );

  /// Read the state of a live session start or end operation.
  static const communicationLiveSessionOperation = OperationSpec<LiveSessionOperationReply>(
    id: 'communication.liveSessionOperation',
    plane: 'communication',
    kind: OperationKind.query,
    field: 'liveSessionOperation',
    operationName: 'CommunicationLiveSessionOperation',
    document: 'query CommunicationLiveSessionOperation(\$context: RequestContextInput!, \$input: LiveSessionOperationInput!) {\n'
        '  liveSessionOperation(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    result {\n'
        '      operationId\n'
        '      requestId\n'
        '      liveSessionId\n'
        '      kind\n'
        '      state\n'
        '      revision\n'
        '      requestedAt\n'
        '      completedAt\n'
        '      completion {\n'
        '        liveSessionId\n'
        '        generation\n'
        '        state\n'
        '        revision\n'
        '        completedAt\n'
        '        mediaCutoff {\n'
        '          state\n'
        '          scope {\n'
        '            kind\n'
        '            liveSessionId\n'
        '            generation\n'
        '            participationId\n'
        '          }\n'
        '          evidence\n'
        '          enforcedAt\n'
        '          operationId\n'
        '        }\n'
        '      }\n'
        '      failure {\n'
        '        code\n'
        '        message\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'LiveSessionOperationReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['operationId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationLiveSessionOperation,
  );

  /// Revoke a user session.
  static const communicationRevokeSession = OperationSpec<RevokeSessionReply>(
    id: 'communication.revokeSession',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'revokeSession',
    operationName: 'CommunicationRevokeSession',
    document: 'mutation CommunicationRevokeSession(\$context: RequestContextInput!, \$input: RevokeSessionRequestInput!) {\n'
        '  revokeSession(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      sessionId\n'
        '      status\n'
        '      mediaCutoff {\n'
        '        state\n'
        '        scope {\n'
        '          kind\n'
        '          principalId\n'
        '          sessionId\n'
        '          deviceId\n'
        '          callId\n'
        '        }\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'RevokeSessionReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['sessionId', 'expectedRevision'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'REVISION_CONFLICT', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationRevokeSession,
  );

  /// Update the title or properties of a conversation.
  static const communicationUpdateConversation = OperationSpec<UpdateConversationReply>(
    id: 'communication.updateConversation',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'updateConversation',
    operationName: 'CommunicationUpdateConversation',
    document: 'mutation CommunicationUpdateConversation(\$context: RequestContextInput!, \$input: UpdateConversationRequestInput!) {\n'
        '  updateConversation(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      conversationId\n'
        '      revision\n'
        '      title\n'
        '      props\n'
        '      latestSequence\n'
        '      membership {\n'
        '        conversationId\n'
        '        principalId\n'
        '        role\n'
        '        status\n'
        '        membershipEpoch\n'
        '        visibilityEpoch\n'
        '        revision\n'
        '        visibleFromSequence\n'
        '        canStartBroadcast\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'UpdateConversationReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'expectedRevision', 'title', 'props'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'REVISION_CONFLICT', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationUpdateConversation,
  );

  /// Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.
  static const communicationSendMessage = OperationSpec<SendMessageReply>(
    id: 'communication.sendMessage',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'sendMessage',
    operationName: 'CommunicationSendMessage',
    document: 'mutation CommunicationSendMessage(\$context: RequestContextInput!, \$input: SendMessageRequestInput!) {\n'
        '  sendMessage(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      messageId\n'
        '      conversationId\n'
        '      sequence\n'
        '      revision\n'
        '      status\n'
        '      cursor {\n'
        '        incarnation\n'
        '        conversationId\n'
        '        sequence\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'SendMessageReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'text', 'props', 'actAsPrincipalId'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'PLAN_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationSendMessage,
  );

  /// Edit a message.
  static const communicationEditMessage = OperationSpec<EditMessageReply>(
    id: 'communication.editMessage',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'editMessage',
    operationName: 'CommunicationEditMessage',
    document: 'mutation CommunicationEditMessage(\$context: RequestContextInput!, \$input: EditMessageRequestInput!) {\n'
        '  editMessage(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      messageId\n'
        '      conversationId\n'
        '      authorId\n'
        '      sequence\n'
        '      revision\n'
        '      revisionSequence\n'
        '      createdAt\n'
        '      deleted\n'
        '      text\n'
        '      props\n'
        '      editedAt\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'EditMessageReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'messageId', 'expectedRevision', 'text', 'props'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'MESSAGE_DELETED', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'REVISION_CONFLICT', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationEditMessage,
  );

  /// Delete a message.
  static const communicationDeleteMessage = OperationSpec<DeleteMessageReply>(
    id: 'communication.deleteMessage',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'deleteMessage',
    operationName: 'CommunicationDeleteMessage',
    document: 'mutation CommunicationDeleteMessage(\$context: RequestContextInput!, \$input: DeleteMessageRequestInput!) {\n'
        '  deleteMessage(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      messageId\n'
        '      conversationId\n'
        '      authorId\n'
        '      sequence\n'
        '      revision\n'
        '      revisionSequence\n'
        '      createdAt\n'
        '      deleted\n'
        '      text\n'
        '      props\n'
        '      editedAt\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'DeleteMessageReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'messageId', 'expectedRevision'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'MESSAGE_DELETED', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'REVISION_CONFLICT', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationDeleteMessage,
  );

  /// Report delivery or read progress through a sequence.
  static const communicationReportReceipt = OperationSpec<ReportReceiptReply>(
    id: 'communication.reportReceipt',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'reportReceipt',
    operationName: 'CommunicationReportReceipt',
    document: 'mutation CommunicationReportReceipt(\$context: RequestContextInput!, \$input: ReportReceiptRequestInput!) {\n'
        '  reportReceipt(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      principalId\n'
        '      membershipEpoch\n'
        '      visibilityEpoch\n'
        '      deliveredThroughSequence\n'
        '      readThroughSequence\n'
        '      updatedAt\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'ReportReceiptReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'kind', 'membershipEpoch', 'visibilityEpoch', 'throughSequence'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'REVISION_CONFLICT', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationReportReceipt,
  );

  /// Send an ephemeral typing signal.
  static const communicationTyping = OperationSpec<TypingReply>(
    id: 'communication.typing',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'typing',
    operationName: 'CommunicationTyping',
    document: 'mutation CommunicationTyping(\$context: RequestContextInput!, \$input: TypingRequestInput!) {\n'
        '  typing(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    serverTime\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    resourceRef {\n'
        '      kind\n'
        '      id\n'
        '    }\n'
        '    result {\n'
        '      accepted\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'TypingReply!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'isTyping'],
    idempotency: IdempotencyClasses.ephemeral,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'RATE_LIMITED', 'REQUEST_TOO_LARGE', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationTyping,
  );

  /// Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.
  static const communicationSetConversationMute = OperationSpec<SetConversationMutePayload>(
    id: 'communication.setConversationMute',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'setConversationMute',
    operationName: 'CommunicationSetConversationMute',
    document: 'mutation CommunicationSetConversationMute(\$context: RequestContextInput!, \$input: SetConversationMuteInput!) {\n'
        '  setConversationMute(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    result {\n'
        '      conversationId\n'
        '      principalId\n'
        '      muted\n'
        '      until\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'SetConversationMutePayload!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'muted', 'until', 'actAsPrincipalId'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationSetConversationMute,
  );

  /// Start a live session (a call) in a conversation. Readiness completes asynchronously.
  static const communicationStartLiveSession = OperationSpec<StartLiveSessionPayload>(
    id: 'communication.startLiveSession',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'startLiveSession',
    operationName: 'CommunicationStartLiveSession',
    document: 'mutation CommunicationStartLiveSession(\$context: RequestContextInput!, \$input: StartLiveSessionInput!) {\n'
        '  startLiveSession(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    result {\n'
        '      liveSessionId\n'
        '      conversationId\n'
        '      kind\n'
        '      mediaProfile\n'
        '      operationId\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'StartLiveSessionPayload!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'kind', 'mediaProfile'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'LIVE_SESSION_EXISTS', 'MEDIA_RECOVERING', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'PLAN_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationStartLiveSession,
  );

  /// Join a live session.
  static const communicationJoinLiveSession = OperationSpec<JoinLiveSessionPayload>(
    id: 'communication.joinLiveSession',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'joinLiveSession',
    operationName: 'CommunicationJoinLiveSession',
    document: 'mutation CommunicationJoinLiveSession(\$context: RequestContextInput!, \$input: JoinLiveSessionInput!) {\n'
        '  joinLiveSession(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    result {\n'
        '      liveSessionId\n'
        '      generation\n'
        '      participation {\n'
        '        participationId\n'
        '        principalId\n'
        '        membershipEpoch\n'
        '        role\n'
        '        state\n'
        '        permissions {\n'
        '          microphone\n'
        '          camera\n'
        '          subscribe\n'
        '        }\n'
        '        reservationExpiresAt\n'
        '        nativeConnectionId\n'
        '        mediaCutoff {\n'
        '          state\n'
        '          scope {\n'
        '            kind\n'
        '            liveSessionId\n'
        '            generation\n'
        '            participationId\n'
        '          }\n'
        '          evidence\n'
        '          enforcedAt\n'
        '          operationId\n'
        '        }\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'JoinLiveSessionPayload!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['liveSessionId', 'expectedGeneration'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GENERATION_CONFLICT', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'LIVE_SESSION_CLOSED', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'PARTICIPATION_MISMATCH', 'PLAN_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationJoinLiveSession,
  );

  /// Alert (ring) conversation members about a live session.
  static const communicationAlertLiveSession = OperationSpec<AlertLiveSessionPayload>(
    id: 'communication.alertLiveSession',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'alertLiveSession',
    operationName: 'CommunicationAlertLiveSession',
    document: 'mutation CommunicationAlertLiveSession(\$context: RequestContextInput!, \$input: AlertLiveSessionInput!) {\n'
        '  alertLiveSession(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    result {\n'
        '      liveSessionId\n'
        '      created\n'
        '      suppressed\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'AlertLiveSessionPayload!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['liveSessionId', 'expectedGeneration', 'principalIds'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GENERATION_CONFLICT', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'LIVE_ALERT_LIMIT', 'LIVE_SESSION_CLOSED', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'PARTICIPATION_MISMATCH', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationAlertLiveSession,
  );

  /// Leave a live session.
  static const communicationLeaveLiveSession = OperationSpec<LeaveLiveSessionPayload>(
    id: 'communication.leaveLiveSession',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'leaveLiveSession',
    operationName: 'CommunicationLeaveLiveSession',
    document: 'mutation CommunicationLeaveLiveSession(\$context: RequestContextInput!, \$input: LeaveLiveSessionInput!) {\n'
        '  leaveLiveSession(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    result {\n'
        '      liveSessionId\n'
        '      participationId\n'
        '      mediaCutoff {\n'
        '        state\n'
        '        scope {\n'
        '          kind\n'
        '          liveSessionId\n'
        '          generation\n'
        '          participationId\n'
        '        }\n'
        '        evidence\n'
        '        enforcedAt\n'
        '        operationId\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'LeaveLiveSessionPayload!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['liveSessionId', 'expectedGeneration', 'participationId'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GENERATION_CONFLICT', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'LIVE_SESSION_CLOSED', 'MEDIA_FENCE_REQUIRED', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'PARTICIPATION_MISMATCH', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationLeaveLiveSession,
  );

  /// End a live session for every participant. Completes asynchronously.
  static const communicationEndLiveSession = OperationSpec<EndLiveSessionPayload>(
    id: 'communication.endLiveSession',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'endLiveSession',
    operationName: 'CommunicationEndLiveSession',
    document: 'mutation CommunicationEndLiveSession(\$context: RequestContextInput!, \$input: EndLiveSessionInput!) {\n'
        '  endLiveSession(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    operation {\n'
        '      operationId\n'
        '      owner\n'
        '      href\n'
        '      state\n'
        '    }\n'
        '    result {\n'
        '      liveSessionId\n'
        '      operationId\n'
        '      mediaCutoff {\n'
        '        state\n'
        '        scope {\n'
        '          kind\n'
        '          liveSessionId\n'
        '          generation\n'
        '          participationId\n'
        '        }\n'
        '        evidence\n'
        '        enforcedAt\n'
        '        operationId\n'
        '      }\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'EndLiveSessionPayload!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['liveSessionId', 'expectedGeneration', 'expectedRevision'],
    idempotency: IdempotencyClasses.idempotent,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GENERATION_CONFLICT', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'LIVE_SESSION_CLOSED', 'MEDIA_FENCE_REQUIRED', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'PARTICIPATION_MISMATCH', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'REVISION_CONFLICT', 'SCOPE_REQUIRED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationEndLiveSession,
  );

  /// Obtain a media credential for one connection of the caller's participation.
  static const communicationLiveSessionCredentials = OperationSpec<LiveSessionCredentialsPayload>(
    id: 'communication.liveSessionCredentials',
    plane: 'communication',
    kind: OperationKind.mutation,
    field: 'liveSessionCredentials',
    operationName: 'CommunicationLiveSessionCredentials',
    document: 'mutation CommunicationLiveSessionCredentials(\$context: RequestContextInput!, \$input: LiveSessionCredentialsInput!) {\n'
        '  liveSessionCredentials(context: \$context, input: \$input) {\n'
        '    status\n'
        '    requestId\n'
        '    receiptId\n'
        '    committedAt\n'
        '    replayed\n'
        '    result {\n'
        '      liveSessionId\n'
        '      participationId\n'
        '      generation\n'
        '      roomName\n'
        '      participantIdentity\n'
        '      livekitUrl\n'
        '      transportToken\n'
        '      admissionTicket\n'
        '      forwardingLease\n'
        '      transportExpiresAt\n'
        '      admissionExpiresAt\n'
        '      leaseExpiresAt\n'
        '      leasePolicyId\n'
        '      connectToken\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'LiveSessionCredentialsPayload!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['liveSessionId', 'participationId', 'expectedGeneration', 'mode', 'replacementOfConnectionId'],
    idempotency: IdempotencyClasses.singleUse,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['ADMISSION_LIMIT', 'ALREADY_CONNECTED', 'AUTHORITY_UNAVAILABLE', 'CREDENTIAL_EXPIRED', 'CREDENTIAL_REFRESH_REQUIRED', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GENERATION_CONFLICT', 'GRAPHQL_ERROR', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'HTTP_FAILURE', 'IDEMPOTENCY_CONFLICT', 'INCARNATION_MISMATCH', 'INVALID_REPLACEMENT', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'LIVE_SESSION_CLOSED', 'MEDIA_NOT_READY', 'MEDIA_RECOVERING', 'NOT_FOUND', 'OUTCOME_UNKNOWN', 'PARTICIPATION_MISMATCH', 'RATE_LIMITED', 'RECOVERY_LIMIT', 'RECOVERY_STORAGE_FAILURE', 'REQUEST_EXPIRED', 'REQUEST_TOO_LARGE', 'RESOLUTION_REQUIRED', 'RESPONSE_TOO_LARGE', 'RETRY_EXHAUSTED', 'TRANSPORT_UNKNOWN', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationLiveSessionCredentials,
  );

  /// Subscribe to conversation events in sequence order, resuming after a cursor.
  static const communicationConversationEvents = OperationSpec<EventPage>(
    id: 'communication.conversationEvents',
    plane: 'communication',
    kind: OperationKind.subscription,
    field: 'conversationEvents',
    operationName: 'CommunicationConversationEvents',
    document: 'subscription CommunicationConversationEvents(\$context: RequestContextInput!, \$input: EventsRequestInput!) {\n'
        '  conversationEvents(context: \$context, input: \$input) {\n'
        '    items {\n'
        '      eventId\n'
        '      conversationId\n'
        '      sequence\n'
        '      type\n'
        '      occurredAt\n'
        '      subjectRef {\n'
        '        kind\n'
        '        id\n'
        '      }\n'
        '      payload {\n'
        '        messageId\n'
        '        revision\n'
        '        revisionSequence\n'
        '        principalId\n'
        '        membershipEpoch\n'
        '        visibilityEpoch\n'
        '        kind\n'
        '        throughSequence\n'
        '        callId\n'
        '        generation\n'
        '        state\n'
        '        cutoffEvidence\n'
        '        liveSessionId\n'
        '      }\n'
        '    }\n'
        '    complete\n'
        '    refreshRequired\n'
        '    nextCursor {\n'
        '      incarnation\n'
        '      conversationId\n'
        '      sequence\n'
        '    }\n'
        '  }\n'
        '}',
    resultType: 'EventPage!',
    contextArgument: 'context',
    contextFields: <String, String>{'requestId': 'required', 'projectId': 'required', 'incarnation': 'required', 'observedServingEpoch': 'required', 'credentialDeliveryPermit': 'forbidden'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['conversationId', 'limit', 'after'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'replay',
    realtime: 'subscription',
    errorCodes: <String>['ADMISSION_LIMIT', 'AUTHORITY_UNAVAILABLE', 'CURSOR_AHEAD', 'CURSOR_EXPIRED', 'CURSOR_MISMATCH', 'CURSOR_SCOPE_MISMATCH', 'FEATURE_UNSUPPORTED', 'FORBIDDEN', 'GRAPHQL_INVALID_REQUEST', 'GRAPHQL_QUERY_LIMIT', 'GRAPHQL_RESPONSE_LIMIT', 'INCARNATION_MISMATCH', 'INVALID_REQUEST', 'NOT_FOUND', 'PLAN_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED', 'RATE_LIMITED', 'RESYNC_REQUIRED', 'RETRY_EXHAUSTED', 'UNAUTHENTICATED', 'WRONG_REGION'],
    decode: _resultCommunicationConversationEvents,
  );
}

/// [Operations] by ID.
const Map<String, OperationSpec<Object?>> operationCatalog = <String, OperationSpec<Object?>>{
  'communication.capabilities': Operations.communicationCapabilities,
  'communication.route': Operations.communicationRoute,
  'communication.currentSession': Operations.communicationCurrentSession,
  'communication.getConversation': Operations.communicationGetConversation,
  'communication.members': Operations.communicationMembers,
  'communication.messages': Operations.communicationMessages,
  'communication.getMessage': Operations.communicationGetMessage,
  'communication.events': Operations.communicationEvents,
  'communication.receipts': Operations.communicationReceipts,
  'communication.inbox': Operations.communicationInbox,
  'communication.search': Operations.communicationSearch,
  'communication.resolveRequest': Operations.communicationResolveRequest,
  'communication.getOperation': Operations.communicationGetOperation,
  'communication.conversationMute': Operations.communicationConversationMute,
  'communication.currentLiveSession': Operations.communicationCurrentLiveSession,
  'communication.liveSession': Operations.communicationLiveSession,
  'communication.liveSessions': Operations.communicationLiveSessions,
  'communication.liveSessionParticipants': Operations.communicationLiveSessionParticipants,
  'communication.liveSessionAlerts': Operations.communicationLiveSessionAlerts,
  'communication.liveSessionOperation': Operations.communicationLiveSessionOperation,
  'communication.revokeSession': Operations.communicationRevokeSession,
  'communication.updateConversation': Operations.communicationUpdateConversation,
  'communication.sendMessage': Operations.communicationSendMessage,
  'communication.editMessage': Operations.communicationEditMessage,
  'communication.deleteMessage': Operations.communicationDeleteMessage,
  'communication.reportReceipt': Operations.communicationReportReceipt,
  'communication.typing': Operations.communicationTyping,
  'communication.setConversationMute': Operations.communicationSetConversationMute,
  'communication.startLiveSession': Operations.communicationStartLiveSession,
  'communication.joinLiveSession': Operations.communicationJoinLiveSession,
  'communication.alertLiveSession': Operations.communicationAlertLiveSession,
  'communication.leaveLiveSession': Operations.communicationLeaveLiveSession,
  'communication.endLiveSession': Operations.communicationEndLiveSession,
  'communication.liveSessionCredentials': Operations.communicationLiveSessionCredentials,
  'communication.conversationEvents': Operations.communicationConversationEvents,
};

CapabilitiesReply _resultCommunicationCapabilities(Object? json) => _decodeCapabilitiesReply(json, r'$');

RouteReply _resultCommunicationRoute(Object? json) => _decodeRouteReply(json, r'$');

CurrentSessionReply _resultCommunicationCurrentSession(Object? json) => _decodeCurrentSessionReply(json, r'$');

GetConversationReply _resultCommunicationGetConversation(Object? json) => _decodeGetConversationReply(json, r'$');

MembersReply _resultCommunicationMembers(Object? json) => _decodeMembersReply(json, r'$');

MessagesReply _resultCommunicationMessages(Object? json) => _decodeMessagesReply(json, r'$');

GetMessageReply _resultCommunicationGetMessage(Object? json) => _decodeGetMessageReply(json, r'$');

EventsReply _resultCommunicationEvents(Object? json) => _decodeEventsReply(json, r'$');

ReceiptsReply _resultCommunicationReceipts(Object? json) => _decodeReceiptsReply(json, r'$');

InboxReply _resultCommunicationInbox(Object? json) => _decodeInboxReply(json, r'$');

SearchReply _resultCommunicationSearch(Object? json) => _decodeSearchReply(json, r'$');

ResolveRequestReply _resultCommunicationResolveRequest(Object? json) => _decodeResolveRequestReply(json, r'$');

GetOperationReply _resultCommunicationGetOperation(Object? json) => _decodeGetOperationReply(json, r'$');

ConversationMuteReply _resultCommunicationConversationMute(Object? json) => _decodeConversationMuteReply(json, r'$');

CurrentLiveSessionReply _resultCommunicationCurrentLiveSession(Object? json) => _decodeCurrentLiveSessionReply(json, r'$');

LiveSessionReply _resultCommunicationLiveSession(Object? json) => _decodeLiveSessionReply(json, r'$');

LiveSessionPageReply _resultCommunicationLiveSessions(Object? json) => _decodeLiveSessionPageReply(json, r'$');

LiveParticipantPageReply _resultCommunicationLiveSessionParticipants(Object? json) => _decodeLiveParticipantPageReply(json, r'$');

LiveAlertPageReply _resultCommunicationLiveSessionAlerts(Object? json) => _decodeLiveAlertPageReply(json, r'$');

LiveSessionOperationReply _resultCommunicationLiveSessionOperation(Object? json) => _decodeLiveSessionOperationReply(json, r'$');

RevokeSessionReply _resultCommunicationRevokeSession(Object? json) => _decodeRevokeSessionReply(json, r'$');

UpdateConversationReply _resultCommunicationUpdateConversation(Object? json) => _decodeUpdateConversationReply(json, r'$');

SendMessageReply _resultCommunicationSendMessage(Object? json) => _decodeSendMessageReply(json, r'$');

EditMessageReply _resultCommunicationEditMessage(Object? json) => _decodeEditMessageReply(json, r'$');

DeleteMessageReply _resultCommunicationDeleteMessage(Object? json) => _decodeDeleteMessageReply(json, r'$');

ReportReceiptReply _resultCommunicationReportReceipt(Object? json) => _decodeReportReceiptReply(json, r'$');

TypingReply _resultCommunicationTyping(Object? json) => _decodeTypingReply(json, r'$');

SetConversationMutePayload _resultCommunicationSetConversationMute(Object? json) => _decodeSetConversationMutePayload(json, r'$');

StartLiveSessionPayload _resultCommunicationStartLiveSession(Object? json) => _decodeStartLiveSessionPayload(json, r'$');

JoinLiveSessionPayload _resultCommunicationJoinLiveSession(Object? json) => _decodeJoinLiveSessionPayload(json, r'$');

AlertLiveSessionPayload _resultCommunicationAlertLiveSession(Object? json) => _decodeAlertLiveSessionPayload(json, r'$');

LeaveLiveSessionPayload _resultCommunicationLeaveLiveSession(Object? json) => _decodeLeaveLiveSessionPayload(json, r'$');

EndLiveSessionPayload _resultCommunicationEndLiveSession(Object? json) => _decodeEndLiveSessionPayload(json, r'$');

LiveSessionCredentialsPayload _resultCommunicationLiveSessionCredentials(Object? json) => _decodeLiveSessionCredentialsPayload(json, r'$');

EventPage _resultCommunicationConversationEvents(Object? json) => _decodeEventPage(json, r'$');

/// An error code and how to handle it.
final class ErrorCodeSpec {
  const ErrorCodeSpec({
    required this.code,
    required this.summary,
    required this.origin,
    required this.status,
    required this.retryable,
  });

  final String code;

  final String summary;

  /// `sdk`, `server` or `both`.
  final String origin;

  /// The HTTP status the server pairs with the code, or null.
  final int? status;

  /// Whether a later attempt with the same request ID may succeed.
  final bool retryable;
}

/// Error codes, for comparing with `ConvoHopProblem.code`.
abstract final class ErrorCodes {
  /// A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId.
  static const String admissionLimit = 'ADMISSION_LIMIT';

  /// The participation already has an active media connection.
  static const String alreadyConnected = 'ALREADY_CONNECTED';

  /// A resource with the same unique key already exists.
  static const String alreadyExists = 'ALREADY_EXISTS';

  /// The authority is temporarily unavailable. Retry with the same requestId.
  static const String authorityUnavailable = 'AUTHORITY_UNAVAILABLE';

  /// The billing provider's catalog conflicts with the configured price book, for example a duplicated or unsafe object. An operator must resolve it.
  static const String billingCatalogConflict = 'BILLING_CATALOG_CONFLICT';

  /// The billing provider's catalog does not match the configured price book yet. An operator must sync it.
  static const String billingCatalogNotSynced = 'BILLING_CATALOG_NOT_SYNCED';

  /// The organization has no billing account yet. Start a checkout first.
  static const String billingCustomerMissing = 'BILLING_CUSTOMER_MISSING';

  /// The billing link of this request is no longer valid. Send a new request with a new requestId.
  static const String billingLinkExpired = 'BILLING_LINK_EXPIRED';

  /// Billing is not configured in this environment.
  static const String billingNotConfigured = 'BILLING_NOT_CONFIGURED';

  /// The plan is not offered for self-service checkout.
  static const String billingPlanUnavailable = 'BILLING_PLAN_UNAVAILABLE';

  /// The organization's billing account belongs to a different billing provider.
  static const String billingProviderChanged = 'BILLING_PROVIDER_CHANGED';

  /// The billing provider refused the request.
  static const String billingProviderRejected = 'BILLING_PROVIDER_REJECTED';

  /// The organization already has a subscription. Change it in the billing portal.
  static const String billingSubscriptionActive = 'BILLING_SUBSCRIPTION_ACTIVE';

  /// The organization is suspended for an unpaid balance. Update its payment method in the billing portal.
  static const String billingSuspended = 'BILLING_SUSPENDED';

  /// The credential delivery expired or can no longer be redeemed.
  static const String credentialDeliveryExpired = 'CREDENTIAL_DELIVERY_EXPIRED';

  /// The credential carried by the stored result has expired. Request a new one.
  static const String credentialExpired = 'CREDENTIAL_EXPIRED';

  /// The media credential must be refreshed before connecting.
  static const String credentialRefreshRequired = 'CREDENTIAL_REFRESH_REQUIRED';

  /// Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly.
  static const String credentialRequired = 'CREDENTIAL_REQUIRED';

  /// The cursor is ahead of the committed events of the conversation.
  static const String cursorAhead = 'CURSOR_AHEAD';

  /// The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently.
  static const String cursorExpired = 'CURSOR_EXPIRED';

  /// The cursor is malformed or was not issued for this query.
  static const String cursorInvalid = 'CURSOR_INVALID';

  /// The cursor does not continue the subscribed stream.
  static const String cursorMismatch = 'CURSOR_MISMATCH';

  /// The cursor was issued for a different scope, caller or visibility.
  static const String cursorScopeMismatch = 'CURSOR_SCOPE_MISMATCH';

  /// The delivery was already redeemed by a different request.
  static const String deliveryConsumed = 'DELIVERY_CONSUMED';

  /// The delivery must be redeemed before it can be acknowledged.
  static const String deliveryNotRedeemed = 'DELIVERY_NOT_REDEEMED';

  /// The deployment cannot host projects yet.
  static const String deploymentNotReady = 'DEPLOYMENT_NOT_READY';

  /// The feature is not available in this deployment.
  static const String featureUnsupported = 'FEATURE_UNSUPPORTED';

  /// The credential is valid but not allowed to perform this operation.
  static const String forbidden = 'FORBIDDEN';

  /// The live session generation changed. Read the current generation and retry.
  static const String generationConflict = 'GENERATION_CONFLICT';

  /// A GraphQL error arrived without a recognized code.
  static const String graphqlError = 'GRAPHQL_ERROR';

  /// The GraphQL request is malformed or fails validation.
  static const String graphqlInvalidRequest = 'GRAPHQL_INVALID_REQUEST';

  /// The GraphQL document exceeds a depth, complexity or size limit.
  static const String graphqlQueryLimit = 'GRAPHQL_QUERY_LIMIT';

  /// The query response exceeds the response limit. Request a smaller page.
  static const String graphqlResponseLimit = 'GRAPHQL_RESPONSE_LIMIT';

  /// The HTTP exchange failed without a usable GraphQL error.
  static const String httpFailure = 'HTTP_FAILURE';

  /// The requestId was already used with a different payload or caller.
  static const String idempotencyConflict = 'IDEMPOTENCY_CONFLICT';

  /// The project incarnation changed. Discard state from the old incarnation and recover explicitly.
  static const String incarnationMismatch = 'INCARNATION_MISMATCH';

  /// The connection to replace is not a current connection of this participation.
  static const String invalidReplacement = 'INVALID_REPLACEMENT';

  /// The input or request context failed validation.
  static const String invalidRequest = 'INVALID_REQUEST';

  /// The response did not match the expected shape or identity. The outcome is unknown.
  static const String invalidResponse = 'INVALID_RESPONSE';

  /// The live session reached its alert limit.
  static const String liveAlertLimit = 'LIVE_ALERT_LIMIT';

  /// The live session has ended or is ending.
  static const String liveSessionClosed = 'LIVE_SESSION_CLOSED';

  /// The conversation already has an active live session.
  static const String liveSessionExists = 'LIVE_SESSION_EXISTS';

  /// The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly.
  static const String mediaConnectFailed = 'MEDIA_CONNECT_FAILED';

  /// Media cutoff is not enforced yet for this live session. Retry after the cutoff completes.
  static const String mediaFenceRequired = 'MEDIA_FENCE_REQUIRED';

  /// Media for the live session is not ready yet.
  static const String mediaNotReady = 'MEDIA_NOT_READY';

  /// Media for the live session is recovering.
  static const String mediaRecovering = 'MEDIA_RECOVERING';

  /// Membership accounting needs operator reconciliation.
  static const String membershipCountInvalid = 'MEMBERSHIP_COUNT_INVALID';

  /// The conversation reached its member limit.
  static const String memberLimit = 'MEMBER_LIMIT';

  /// The message was deleted.
  static const String messageDeleted = 'MESSAGE_DELETED';

  /// The requestId does not belong to an issueSession or renewSession request.
  static const String notASessionRequest = 'NOT_A_SESSION_REQUEST';

  /// The resource does not exist or is not visible to the caller.
  static const String notFound = 'NOT_FOUND';

  /// The mutation may have committed. Retry with the same requestId or resolve it.
  static const String outcomeUnknown = 'OUTCOME_UNKNOWN';

  /// A single item exceeds the page response limit.
  static const String pageItemTooLarge = 'PAGE_ITEM_TOO_LARGE';

  /// The participation does not belong to the caller or the current live session generation.
  static const String participationMismatch = 'PARTICIPATION_MISMATCH';

  /// The stored delivery permit has expired. Request a new permit.
  static const String permitExpired = 'PERMIT_EXPIRED';

  /// The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again.
  static const String planLimitExceeded = 'PLAN_LIMIT_EXCEEDED';

  /// A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues.
  static const String quotaExceeded = 'QUOTA_EXCEEDED';

  /// A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId.
  static const String rateLimited = 'RATE_LIMITED';

  /// The SDK's recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again.
  static const String recoveryLimit = 'RECOVERY_LIMIT';

  /// Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome.
  static const String recoveryStorageFailure = 'RECOVERY_STORAGE_FAILURE';

  /// The original request is too old to replay.
  static const String requestExpired = 'REQUEST_EXPIRED';

  /// The request body exceeds the size limit.
  static const String requestTooLarge = 'REQUEST_TOO_LARGE';

  /// The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing.
  static const String resolutionRequired = 'RESOLUTION_REQUIRED';

  /// The response exceeds the size limit.
  static const String responseTooLarge = 'RESPONSE_TOO_LARGE';

  /// The subscription cannot continue. Replay from the last applied cursor.
  static const String resyncRequired = 'RESYNC_REQUIRED';

  /// The authority exhausted its internal retry budget. Retry later with the same requestId.
  static const String retryExhausted = 'RETRY_EXHAUSTED';

  /// The expected revision or epoch is stale. Read the current state and retry with a new request.
  static const String revisionConflict = 'REVISION_CONFLICT';

  /// The backend key lacks a scope this operation requires. The message names the scope.
  static const String scopeRequired = 'SCOPE_REQUIRED';

  /// The stored session receipt does not match its binding.
  static const String sessionReceiptBindingMismatch = 'SESSION_RECEIPT_BINDING_MISMATCH';

  /// The stored session receipt failed validation.
  static const String sessionReceiptInvalid = 'SESSION_RECEIPT_INVALID';

  /// The application session refresh callback failed.
  static const String sessionRefreshFailed = 'SESSION_REFRESH_FAILED';

  /// The refreshed session was rejected because it does not match the current session.
  static const String sessionRefreshRejected = 'SESSION_REFRESH_REJECTED';

  /// The user session needs renewal and no refresh is configured, or it expired.
  static const String sessionRefreshRequired = 'SESSION_REFRESH_REQUIRED';

  /// The refreshed session could not be verified.
  static const String sessionRefreshUnverified = 'SESSION_REFRESH_UNVERIFIED';

  /// The transport failed after the request may have been sent. Resolve or retry the original request.
  static const String transportUnknown = 'TRANSPORT_UNKNOWN';

  /// The credential is missing, invalid or expired.
  static const String unauthenticated = 'UNAUTHENTICATED';

  /// The webhook URL is not a public HTTPS destination.
  static const String webhookDestinationDenied = 'WEBHOOK_DESTINATION_DENIED';

  /// The webhook endpoint is disabled. Enable it, then replay its deliveries.
  static const String webhookEndpointDisabled = 'WEBHOOK_ENDPOINT_DISABLED';

  /// The project reached its webhook endpoint limit.
  static const String webhookEndpointLimit = 'WEBHOOK_ENDPOINT_LIMIT';

  /// A signing-secret rotation is already waiting for acknowledgement.
  static const String webhookRotationPending = 'WEBHOOK_ROTATION_PENDING';

  /// The endpoint's signing secret has not been acknowledged yet.
  static const String webhookSecretUnacknowledged = 'WEBHOOK_SECRET_UNACKNOWLEDGED';

  /// The observed serving epoch is stale. Route again, then retry.
  static const String wrongRegion = 'WRONG_REGION';
}

/// Every error code, by code.
const Map<String, ErrorCodeSpec> errorCodes = <String, ErrorCodeSpec>{
  'ADMISSION_LIMIT': ErrorCodeSpec(code: 'ADMISSION_LIMIT', summary: 'A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId.', origin: 'both', status: 429, retryable: true),
  'ALREADY_CONNECTED': ErrorCodeSpec(code: 'ALREADY_CONNECTED', summary: 'The participation already has an active media connection.', origin: 'server', status: 409, retryable: false),
  'ALREADY_EXISTS': ErrorCodeSpec(code: 'ALREADY_EXISTS', summary: 'A resource with the same unique key already exists.', origin: 'server', status: 409, retryable: false),
  'AUTHORITY_UNAVAILABLE': ErrorCodeSpec(code: 'AUTHORITY_UNAVAILABLE', summary: 'The authority is temporarily unavailable. Retry with the same requestId.', origin: 'both', status: 503, retryable: true),
  'BILLING_CATALOG_CONFLICT': ErrorCodeSpec(code: 'BILLING_CATALOG_CONFLICT', summary: 'The billing provider\'s catalog conflicts with the configured price book, for example a duplicated or unsafe object. An operator must resolve it.', origin: 'server', status: 409, retryable: false),
  'BILLING_CATALOG_NOT_SYNCED': ErrorCodeSpec(code: 'BILLING_CATALOG_NOT_SYNCED', summary: 'The billing provider\'s catalog does not match the configured price book yet. An operator must sync it.', origin: 'server', status: 409, retryable: false),
  'BILLING_CUSTOMER_MISSING': ErrorCodeSpec(code: 'BILLING_CUSTOMER_MISSING', summary: 'The organization has no billing account yet. Start a checkout first.', origin: 'server', status: 409, retryable: false),
  'BILLING_LINK_EXPIRED': ErrorCodeSpec(code: 'BILLING_LINK_EXPIRED', summary: 'The billing link of this request is no longer valid. Send a new request with a new requestId.', origin: 'server', status: 409, retryable: false),
  'BILLING_NOT_CONFIGURED': ErrorCodeSpec(code: 'BILLING_NOT_CONFIGURED', summary: 'Billing is not configured in this environment.', origin: 'server', status: 503, retryable: false),
  'BILLING_PLAN_UNAVAILABLE': ErrorCodeSpec(code: 'BILLING_PLAN_UNAVAILABLE', summary: 'The plan is not offered for self-service checkout.', origin: 'server', status: 400, retryable: false),
  'BILLING_PROVIDER_CHANGED': ErrorCodeSpec(code: 'BILLING_PROVIDER_CHANGED', summary: 'The organization\'s billing account belongs to a different billing provider.', origin: 'server', status: 409, retryable: false),
  'BILLING_PROVIDER_REJECTED': ErrorCodeSpec(code: 'BILLING_PROVIDER_REJECTED', summary: 'The billing provider refused the request.', origin: 'server', status: 409, retryable: false),
  'BILLING_SUBSCRIPTION_ACTIVE': ErrorCodeSpec(code: 'BILLING_SUBSCRIPTION_ACTIVE', summary: 'The organization already has a subscription. Change it in the billing portal.', origin: 'server', status: 409, retryable: false),
  'BILLING_SUSPENDED': ErrorCodeSpec(code: 'BILLING_SUSPENDED', summary: 'The organization is suspended for an unpaid balance. Update its payment method in the billing portal.', origin: 'server', status: 402, retryable: false),
  'CREDENTIAL_DELIVERY_EXPIRED': ErrorCodeSpec(code: 'CREDENTIAL_DELIVERY_EXPIRED', summary: 'The credential delivery expired or can no longer be redeemed.', origin: 'server', status: 409, retryable: false),
  'CREDENTIAL_EXPIRED': ErrorCodeSpec(code: 'CREDENTIAL_EXPIRED', summary: 'The credential carried by the stored result has expired. Request a new one.', origin: 'server', status: 409, retryable: false),
  'CREDENTIAL_REFRESH_REQUIRED': ErrorCodeSpec(code: 'CREDENTIAL_REFRESH_REQUIRED', summary: 'The media credential must be refreshed before connecting.', origin: 'both', status: 409, retryable: false),
  'CREDENTIAL_REQUIRED': ErrorCodeSpec(code: 'CREDENTIAL_REQUIRED', summary: 'Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly.', origin: 'sdk', status: 409, retryable: false),
  'CURSOR_AHEAD': ErrorCodeSpec(code: 'CURSOR_AHEAD', summary: 'The cursor is ahead of the committed events of the conversation.', origin: 'server', status: 409, retryable: false),
  'CURSOR_EXPIRED': ErrorCodeSpec(code: 'CURSOR_EXPIRED', summary: 'The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently.', origin: 'server', status: 409, retryable: false),
  'CURSOR_INVALID': ErrorCodeSpec(code: 'CURSOR_INVALID', summary: 'The cursor is malformed or was not issued for this query.', origin: 'server', status: 409, retryable: false),
  'CURSOR_MISMATCH': ErrorCodeSpec(code: 'CURSOR_MISMATCH', summary: 'The cursor does not continue the subscribed stream.', origin: 'server', status: 409, retryable: false),
  'CURSOR_SCOPE_MISMATCH': ErrorCodeSpec(code: 'CURSOR_SCOPE_MISMATCH', summary: 'The cursor was issued for a different scope, caller or visibility.', origin: 'server', status: 409, retryable: false),
  'DELIVERY_CONSUMED': ErrorCodeSpec(code: 'DELIVERY_CONSUMED', summary: 'The delivery was already redeemed by a different request.', origin: 'server', status: 409, retryable: false),
  'DELIVERY_NOT_REDEEMED': ErrorCodeSpec(code: 'DELIVERY_NOT_REDEEMED', summary: 'The delivery must be redeemed before it can be acknowledged.', origin: 'server', status: 409, retryable: false),
  'DEPLOYMENT_NOT_READY': ErrorCodeSpec(code: 'DEPLOYMENT_NOT_READY', summary: 'The deployment cannot host projects yet.', origin: 'server', status: 409, retryable: false),
  'FEATURE_UNSUPPORTED': ErrorCodeSpec(code: 'FEATURE_UNSUPPORTED', summary: 'The feature is not available in this deployment.', origin: 'server', status: null, retryable: false),
  'FORBIDDEN': ErrorCodeSpec(code: 'FORBIDDEN', summary: 'The credential is valid but not allowed to perform this operation.', origin: 'server', status: 403, retryable: false),
  'GENERATION_CONFLICT': ErrorCodeSpec(code: 'GENERATION_CONFLICT', summary: 'The live session generation changed. Read the current generation and retry.', origin: 'server', status: 409, retryable: false),
  'GRAPHQL_ERROR': ErrorCodeSpec(code: 'GRAPHQL_ERROR', summary: 'A GraphQL error arrived without a recognized code.', origin: 'sdk', status: null, retryable: false),
  'GRAPHQL_INVALID_REQUEST': ErrorCodeSpec(code: 'GRAPHQL_INVALID_REQUEST', summary: 'The GraphQL request is malformed or fails validation.', origin: 'server', status: 400, retryable: false),
  'GRAPHQL_QUERY_LIMIT': ErrorCodeSpec(code: 'GRAPHQL_QUERY_LIMIT', summary: 'The GraphQL document exceeds a depth, complexity or size limit.', origin: 'server', status: 400, retryable: false),
  'GRAPHQL_RESPONSE_LIMIT': ErrorCodeSpec(code: 'GRAPHQL_RESPONSE_LIMIT', summary: 'The query response exceeds the response limit. Request a smaller page.', origin: 'server', status: 413, retryable: false),
  'HTTP_FAILURE': ErrorCodeSpec(code: 'HTTP_FAILURE', summary: 'The HTTP exchange failed without a usable GraphQL error.', origin: 'sdk', status: null, retryable: true),
  'IDEMPOTENCY_CONFLICT': ErrorCodeSpec(code: 'IDEMPOTENCY_CONFLICT', summary: 'The requestId was already used with a different payload or caller.', origin: 'both', status: 409, retryable: false),
  'INCARNATION_MISMATCH': ErrorCodeSpec(code: 'INCARNATION_MISMATCH', summary: 'The project incarnation changed. Discard state from the old incarnation and recover explicitly.', origin: 'both', status: 409, retryable: false),
  'INVALID_REPLACEMENT': ErrorCodeSpec(code: 'INVALID_REPLACEMENT', summary: 'The connection to replace is not a current connection of this participation.', origin: 'server', status: 409, retryable: false),
  'INVALID_REQUEST': ErrorCodeSpec(code: 'INVALID_REQUEST', summary: 'The input or request context failed validation.', origin: 'both', status: 400, retryable: false),
  'INVALID_RESPONSE': ErrorCodeSpec(code: 'INVALID_RESPONSE', summary: 'The response did not match the expected shape or identity. The outcome is unknown.', origin: 'sdk', status: null, retryable: true),
  'LIVE_ALERT_LIMIT': ErrorCodeSpec(code: 'LIVE_ALERT_LIMIT', summary: 'The live session reached its alert limit.', origin: 'server', status: 409, retryable: false),
  'LIVE_SESSION_CLOSED': ErrorCodeSpec(code: 'LIVE_SESSION_CLOSED', summary: 'The live session has ended or is ending.', origin: 'server', status: 409, retryable: false),
  'LIVE_SESSION_EXISTS': ErrorCodeSpec(code: 'LIVE_SESSION_EXISTS', summary: 'The conversation already has an active live session.', origin: 'server', status: 409, retryable: false),
  'MEDIA_CONNECT_FAILED': ErrorCodeSpec(code: 'MEDIA_CONNECT_FAILED', summary: 'The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly.', origin: 'sdk', status: null, retryable: false),
  'MEDIA_FENCE_REQUIRED': ErrorCodeSpec(code: 'MEDIA_FENCE_REQUIRED', summary: 'Media cutoff is not enforced yet for this live session. Retry after the cutoff completes.', origin: 'server', status: 409, retryable: false),
  'MEDIA_NOT_READY': ErrorCodeSpec(code: 'MEDIA_NOT_READY', summary: 'Media for the live session is not ready yet.', origin: 'server', status: 409, retryable: false),
  'MEDIA_RECOVERING': ErrorCodeSpec(code: 'MEDIA_RECOVERING', summary: 'Media for the live session is recovering.', origin: 'server', status: 409, retryable: false),
  'MEMBERSHIP_COUNT_INVALID': ErrorCodeSpec(code: 'MEMBERSHIP_COUNT_INVALID', summary: 'Membership accounting needs operator reconciliation.', origin: 'server', status: 503, retryable: false),
  'MEMBER_LIMIT': ErrorCodeSpec(code: 'MEMBER_LIMIT', summary: 'The conversation reached its member limit.', origin: 'server', status: 409, retryable: false),
  'MESSAGE_DELETED': ErrorCodeSpec(code: 'MESSAGE_DELETED', summary: 'The message was deleted.', origin: 'server', status: 409, retryable: false),
  'NOT_A_SESSION_REQUEST': ErrorCodeSpec(code: 'NOT_A_SESSION_REQUEST', summary: 'The requestId does not belong to an issueSession or renewSession request.', origin: 'server', status: 400, retryable: false),
  'NOT_FOUND': ErrorCodeSpec(code: 'NOT_FOUND', summary: 'The resource does not exist or is not visible to the caller.', origin: 'server', status: 404, retryable: false),
  'OUTCOME_UNKNOWN': ErrorCodeSpec(code: 'OUTCOME_UNKNOWN', summary: 'The mutation may have committed. Retry with the same requestId or resolve it.', origin: 'server', status: 503, retryable: true),
  'PAGE_ITEM_TOO_LARGE': ErrorCodeSpec(code: 'PAGE_ITEM_TOO_LARGE', summary: 'A single item exceeds the page response limit.', origin: 'server', status: 413, retryable: false),
  'PARTICIPATION_MISMATCH': ErrorCodeSpec(code: 'PARTICIPATION_MISMATCH', summary: 'The participation does not belong to the caller or the current live session generation.', origin: 'both', status: 409, retryable: false),
  'PERMIT_EXPIRED': ErrorCodeSpec(code: 'PERMIT_EXPIRED', summary: 'The stored delivery permit has expired. Request a new permit.', origin: 'server', status: 409, retryable: false),
  'PLAN_LIMIT_EXCEEDED': ErrorCodeSpec(code: 'PLAN_LIMIT_EXCEEDED', summary: 'The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan\'s value. Change the plan or the limit before trying again.', origin: 'server', status: 403, retryable: false),
  'QUOTA_EXCEEDED': ErrorCodeSpec(code: 'QUOTA_EXCEEDED', summary: 'A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues.', origin: 'server', status: 429, retryable: false),
  'RATE_LIMITED': ErrorCodeSpec(code: 'RATE_LIMITED', summary: 'A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId.', origin: 'server', status: 429, retryable: true),
  'RECOVERY_LIMIT': ErrorCodeSpec(code: 'RECOVERY_LIMIT', summary: 'The SDK\'s recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again.', origin: 'sdk', status: 409, retryable: false),
  'RECOVERY_STORAGE_FAILURE': ErrorCodeSpec(code: 'RECOVERY_STORAGE_FAILURE', summary: 'Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome.', origin: 'sdk', status: null, retryable: false),
  'REQUEST_EXPIRED': ErrorCodeSpec(code: 'REQUEST_EXPIRED', summary: 'The original request is too old to replay.', origin: 'server', status: 409, retryable: false),
  'REQUEST_TOO_LARGE': ErrorCodeSpec(code: 'REQUEST_TOO_LARGE', summary: 'The request body exceeds the size limit.', origin: 'server', status: 413, retryable: false),
  'RESOLUTION_REQUIRED': ErrorCodeSpec(code: 'RESOLUTION_REQUIRED', summary: 'The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing.', origin: 'sdk', status: 409, retryable: false),
  'RESPONSE_TOO_LARGE': ErrorCodeSpec(code: 'RESPONSE_TOO_LARGE', summary: 'The response exceeds the size limit.', origin: 'server', status: 413, retryable: false),
  'RESYNC_REQUIRED': ErrorCodeSpec(code: 'RESYNC_REQUIRED', summary: 'The subscription cannot continue. Replay from the last applied cursor.', origin: 'server', status: 409, retryable: false),
  'RETRY_EXHAUSTED': ErrorCodeSpec(code: 'RETRY_EXHAUSTED', summary: 'The authority exhausted its internal retry budget. Retry later with the same requestId.', origin: 'server', status: 503, retryable: true),
  'REVISION_CONFLICT': ErrorCodeSpec(code: 'REVISION_CONFLICT', summary: 'The expected revision or epoch is stale. Read the current state and retry with a new request.', origin: 'server', status: 409, retryable: false),
  'SCOPE_REQUIRED': ErrorCodeSpec(code: 'SCOPE_REQUIRED', summary: 'The backend key lacks a scope this operation requires. The message names the scope.', origin: 'server', status: 403, retryable: false),
  'SESSION_RECEIPT_BINDING_MISMATCH': ErrorCodeSpec(code: 'SESSION_RECEIPT_BINDING_MISMATCH', summary: 'The stored session receipt does not match its binding.', origin: 'server', status: 503, retryable: false),
  'SESSION_RECEIPT_INVALID': ErrorCodeSpec(code: 'SESSION_RECEIPT_INVALID', summary: 'The stored session receipt failed validation.', origin: 'server', status: 503, retryable: false),
  'SESSION_REFRESH_FAILED': ErrorCodeSpec(code: 'SESSION_REFRESH_FAILED', summary: 'The application session refresh callback failed.', origin: 'sdk', status: null, retryable: false),
  'SESSION_REFRESH_REJECTED': ErrorCodeSpec(code: 'SESSION_REFRESH_REJECTED', summary: 'The refreshed session was rejected because it does not match the current session.', origin: 'sdk', status: 409, retryable: false),
  'SESSION_REFRESH_REQUIRED': ErrorCodeSpec(code: 'SESSION_REFRESH_REQUIRED', summary: 'The user session needs renewal and no refresh is configured, or it expired.', origin: 'sdk', status: 409, retryable: false),
  'SESSION_REFRESH_UNVERIFIED': ErrorCodeSpec(code: 'SESSION_REFRESH_UNVERIFIED', summary: 'The refreshed session could not be verified.', origin: 'sdk', status: null, retryable: false),
  'TRANSPORT_UNKNOWN': ErrorCodeSpec(code: 'TRANSPORT_UNKNOWN', summary: 'The transport failed after the request may have been sent. Resolve or retry the original request.', origin: 'sdk', status: null, retryable: true),
  'UNAUTHENTICATED': ErrorCodeSpec(code: 'UNAUTHENTICATED', summary: 'The credential is missing, invalid or expired.', origin: 'both', status: 401, retryable: false),
  'WEBHOOK_DESTINATION_DENIED': ErrorCodeSpec(code: 'WEBHOOK_DESTINATION_DENIED', summary: 'The webhook URL is not a public HTTPS destination.', origin: 'server', status: 400, retryable: false),
  'WEBHOOK_ENDPOINT_DISABLED': ErrorCodeSpec(code: 'WEBHOOK_ENDPOINT_DISABLED', summary: 'The webhook endpoint is disabled. Enable it, then replay its deliveries.', origin: 'server', status: 409, retryable: false),
  'WEBHOOK_ENDPOINT_LIMIT': ErrorCodeSpec(code: 'WEBHOOK_ENDPOINT_LIMIT', summary: 'The project reached its webhook endpoint limit.', origin: 'server', status: null, retryable: false),
  'WEBHOOK_ROTATION_PENDING': ErrorCodeSpec(code: 'WEBHOOK_ROTATION_PENDING', summary: 'A signing-secret rotation is already waiting for acknowledgement.', origin: 'server', status: 409, retryable: false),
  'WEBHOOK_SECRET_UNACKNOWLEDGED': ErrorCodeSpec(code: 'WEBHOOK_SECRET_UNACKNOWLEDGED', summary: 'The endpoint\'s signing secret has not been acknowledged yet.', origin: 'server', status: 409, retryable: false),
  'WRONG_REGION': ErrorCodeSpec(code: 'WRONG_REGION', summary: 'The observed serving epoch is stale. Route again, then retry.', origin: 'server', status: 409, retryable: false),
};

/// Where realtime events keep their type, payload and subject.
final class RealtimeEnvelopeSpec {
  const RealtimeEnvelopeSpec({
    required this.plane,
    required this.type,
    required this.discriminator,
    required this.payload,
    required this.payloadType,
    required this.subject,
    required this.subjectType,
    required this.unknownTypes,
  });

  final String plane;

  /// The event type.
  final String type;

  /// The field that holds the event type.
  final String discriminator;

  /// The field that holds the payload.
  final String payload;

  final String payloadType;

  /// The field that holds the subject reference.
  final String subject;

  final String subjectType;

  /// How to treat event types this SDK doesn't know.
  final String unknownTypes;
}

/// A realtime channel: its subscription, replay operation, limits and reconnect policy.
final class RealtimeChannelSpec {
  const RealtimeChannelSpec({
    required this.name,
    required this.subscription,
    required this.replay,
    required this.pageType,
    required this.endpointOperation,
    required this.endpointField,
    required this.connectionInit,
    required this.maxFrameBytes,
    required this.maxPendingPages,
    required this.subscribeLimit,
    required this.replayLimit,
    required this.baseDelayMs,
    required this.maxDelayMs,
    required this.jitterMs,
    required this.terminalCloseCodes,
  });

  final String name;

  /// The subscription operation ID.
  final String subscription;

  /// The operation ID that fills gaps.
  final String replay;

  final String pageType;

  /// The operation whose result holds the WebSocket URL.
  final String endpointOperation;

  final String endpointField;

  /// The `connection_init` payload fields.
  final List<String> connectionInit;

  final int maxFrameBytes;

  final int maxPendingPages;

  final int subscribeLimit;

  final int replayLimit;

  final int baseDelayMs;

  final int maxDelayMs;

  final int jitterMs;

  /// Close codes after which the client must not reconnect.
  final List<int> terminalCloseCodes;
}

/// A realtime event type and its payload fields.
final class RealtimeEventSpec {
  const RealtimeEventSpec({
    required this.type,
    required this.subject,
    required this.requiredFields,
    required this.optionalFields,
  });

  final String type;

  /// The kind of resource the event's subject names.
  final String subject;

  final List<String> requiredFields;

  final List<String> optionalFields;
}

/// The realtime event envelope.
const RealtimeEnvelopeSpec realtimeEnvelope = RealtimeEnvelopeSpec(
  plane: 'communication',
  type: 'Event',
  discriminator: 'type',
  payload: 'payload',
  payloadType: 'EventPayload',
  subject: 'subjectRef',
  subjectType: 'ResourceRef',
  unknownTypes: 'deliverAsUnknown',
);

/// The realtime channels a user session can subscribe to, by name.
const Map<String, RealtimeChannelSpec> realtimeChannels = <String, RealtimeChannelSpec>{
  'conversationEvents': RealtimeChannelSpec(
    name: 'conversationEvents',
    subscription: 'communication.conversationEvents',
    replay: 'communication.events',
    pageType: 'EventPage',
    endpointOperation: 'communication.route',
    endpointField: 'wssUrl',
    connectionInit: <String>['projectId', 'incarnation', 'token'],
    maxFrameBytes: 65536,
    maxPendingPages: 4,
    subscribeLimit: 50,
    replayLimit: 100,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    jitterMs: 500,
    terminalCloseCodes: <int>[4400, 4401, 4403, 4408, 4409],
  ),
};

/// The realtime event types, by type.
const Map<String, RealtimeEventSpec> realtimeEvents = <String, RealtimeEventSpec>{
  'conversation.created': RealtimeEventSpec(
    type: 'conversation.created',
    subject: 'conversation',
    requiredFields: <String>['revision'],
    optionalFields: <String>[],
  ),
  'conversation.updated': RealtimeEventSpec(
    type: 'conversation.updated',
    subject: 'conversation',
    requiredFields: <String>['revision'],
    optionalFields: <String>[],
  ),
  'live.alerted': RealtimeEventSpec(
    type: 'live.alerted',
    subject: 'liveSession',
    requiredFields: <String>['liveSessionId', 'generation'],
    optionalFields: <String>[],
  ),
  'live.connected': RealtimeEventSpec(
    type: 'live.connected',
    subject: 'liveSession',
    requiredFields: <String>['liveSessionId', 'generation', 'revision'],
    optionalFields: <String>[],
  ),
  'live.ended': RealtimeEventSpec(
    type: 'live.ended',
    subject: 'liveSession',
    requiredFields: <String>['liveSessionId', 'generation', 'revision'],
    optionalFields: <String>[],
  ),
  'live.participationChanged': RealtimeEventSpec(
    type: 'live.participationChanged',
    subject: 'liveSession',
    requiredFields: <String>['liveSessionId'],
    optionalFields: <String>['generation'],
  ),
  'live.ready': RealtimeEventSpec(
    type: 'live.ready',
    subject: 'liveSession',
    requiredFields: <String>['liveSessionId', 'generation', 'revision'],
    optionalFields: <String>[],
  ),
  'live.started': RealtimeEventSpec(
    type: 'live.started',
    subject: 'liveSession',
    requiredFields: <String>['liveSessionId', 'generation', 'revision'],
    optionalFields: <String>[],
  ),
  'member.added': RealtimeEventSpec(
    type: 'member.added',
    subject: 'member',
    requiredFields: <String>['principalId', 'membershipEpoch', 'visibilityEpoch', 'revision'],
    optionalFields: <String>[],
  ),
  'member.broadcastPermissionChanged': RealtimeEventSpec(
    type: 'member.broadcastPermissionChanged',
    subject: 'member',
    requiredFields: <String>['principalId', 'revision'],
    optionalFields: <String>[],
  ),
  'member.historyExpanded': RealtimeEventSpec(
    type: 'member.historyExpanded',
    subject: 'member',
    requiredFields: <String>['principalId', 'membershipEpoch', 'visibilityEpoch', 'revision'],
    optionalFields: <String>[],
  ),
  'member.removed': RealtimeEventSpec(
    type: 'member.removed',
    subject: 'member',
    requiredFields: <String>['principalId', 'membershipEpoch', 'visibilityEpoch', 'revision'],
    optionalFields: <String>[],
  ),
  'member.roleChanged': RealtimeEventSpec(
    type: 'member.roleChanged',
    subject: 'member',
    requiredFields: <String>['principalId', 'membershipEpoch', 'visibilityEpoch', 'revision'],
    optionalFields: <String>[],
  ),
  'message.created': RealtimeEventSpec(
    type: 'message.created',
    subject: 'message',
    requiredFields: <String>['messageId', 'revision', 'revisionSequence'],
    optionalFields: <String>[],
  ),
  'message.deleted': RealtimeEventSpec(
    type: 'message.deleted',
    subject: 'message',
    requiredFields: <String>['messageId', 'revision', 'revisionSequence'],
    optionalFields: <String>[],
  ),
  'message.edited': RealtimeEventSpec(
    type: 'message.edited',
    subject: 'message',
    requiredFields: <String>['messageId', 'revision', 'revisionSequence'],
    optionalFields: <String>[],
  ),
  'receipt.reported': RealtimeEventSpec(
    type: 'receipt.reported',
    subject: 'member',
    requiredFields: <String>['principalId', 'membershipEpoch', 'visibilityEpoch', 'kind', 'throughSequence'],
    optionalFields: <String>[],
  ),
};
