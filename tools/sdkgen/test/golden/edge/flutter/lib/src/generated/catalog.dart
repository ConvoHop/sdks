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
  /// Transient signal. Never retried.
  static const ephemeral = IdempotencySpec(
    name: 'ephemeral',
    retry: 'none',
    resolvable: false,
    maxAttempts: null,
    windowMs: null,
  );

  /// Retry with the same requestId and input; resolve an unknown outcome with resolveRequest.
  static const idempotent = IdempotencySpec(
    name: 'idempotent',
    retry: 'sameRequest',
    resolvable: true,
    maxAttempts: 3,
    windowMs: 60000,
  );

  /// Authorized by a single-use permit. Retry with the same requestId and permit.
  static const permitBound = IdempotencySpec(
    name: 'permitBound',
    retry: 'sameRequest',
    resolvable: false,
    maxAttempts: 3,
    windowMs: 60000,
  );

  /// Replay with the same requestId and input; resolveRequest cannot read the outcome.
  static const replayOnly = IdempotencySpec(
    name: 'replayOnly',
    retry: 'sameRequest',
    resolvable: false,
    maxAttempts: 3,
    windowMs: 60000,
  );

  /// Read-only. Repeat freely.
  static const safe = IdempotencySpec(
    name: 'safe',
    retry: 'repeat',
    resolvable: false,
    maxAttempts: null,
    windowMs: null,
  );

  /// Like idempotent, but the result is good for one use.
  static const singleUse = IdempotencySpec(
    name: 'singleUse',
    retry: 'sameRequest',
    resolvable: true,
    maxAttempts: 2,
    windowMs: 1000,
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
  /// Read the server capabilities.
  static const alphaCapabilities = OperationSpec<Capabilities>(
    id: 'alpha.capabilities',
    plane: 'alpha',
    kind: OperationKind.query,
    field: 'capabilities',
    operationName: 'AlphaCapabilities',
    document: 'query AlphaCapabilities(\$context: ContextInput!) {\n'
        '  capabilities(context: \$context) {\n'
        '    version\n'
        '    wssUrl\n'
        '    features\n'
        '  }\n'
        '}',
    resultType: 'Capabilities!',
    contextArgument: 'context',
    contextFields: <String, String>{'tenant': 'optional', 'requestId': 'required', 'attempt': 'optional', 'permit': 'forbidden', 'tags': 'optional'},
    inputArgument: null,
    inputRequired: false,
    inputFields: <String>[],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['INVALID_REQUEST', 'TRANSPORT_UNKNOWN', 'UNAVAILABLE'],
    decode: _resultAlphaCapabilities,
  );

  /// Look up the outcome of an earlier alpha mutation by requestId.
  static const alphaResolveRequest = OperationSpec<Receipt>(
    id: 'alpha.resolveRequest',
    plane: 'alpha',
    kind: OperationKind.query,
    field: 'resolveRequest',
    operationName: 'AlphaResolveRequest',
    document: 'query AlphaResolveRequest(\$context: ContextInput!, \$input: ResolveInput!) {\n'
        '  resolveRequest(context: \$context, input: \$input) {\n'
        '    requestId\n'
        '    committed\n'
        '    sequence\n'
        '  }\n'
        '}',
    resultType: 'Receipt!',
    contextArgument: 'context',
    contextFields: <String, String>{'tenant': 'required', 'requestId': 'required', 'attempt': 'optional', 'permit': 'forbidden', 'tags': 'optional'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['requestId'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['INVALID_REQUEST', 'NOT_FOUND', 'TRANSPORT_UNKNOWN', 'UNAVAILABLE'],
    decode: _resultAlphaResolveRequest,
  );

  /// List items in server order.
  static const alphaItems = OperationSpec<ItemPage>(
    id: 'alpha.items',
    plane: 'alpha',
    kind: OperationKind.query,
    field: 'items',
    operationName: 'AlphaItems',
    document: 'query AlphaItems(\$context: ContextInput!, \$input: ItemsInput!) {\n'
        '  items(context: \$context, input: \$input) {\n'
        '    items {\n'
        '      id\n'
        '      name\n'
        '      fruit\n'
        '      weight\n'
        '      ripe\n'
        '      oldName\n'
        '      legacyCode\n'
        '      grid\n'
        '      aliases\n'
        '      history\n'
        '    }\n'
        '    complete\n'
        '    refreshRequired\n'
        '    nextCursor\n'
        '  }\n'
        '}',
    resultType: 'ItemPage!',
    contextArgument: 'context',
    contextFields: <String, String>{'tenant': 'required', 'requestId': 'required', 'attempt': 'optional', 'permit': 'forbidden', 'tags': 'optional'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['limit', 'cursor', 'fruits', 'minWeight', 'includeDeprecated', 'method', 'box', 'legacyFilter', 'item2', 'item10'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'cursor',
    realtime: 'none',
    errorCodes: <String>['CURSOR_EXPIRED', 'INVALID_REQUEST', 'TRANSPORT_UNKNOWN', 'UNAVAILABLE'],
    decode: _resultAlphaItems,
  );

  /// Replay alpha events after a cursor.
  static const alphaEvents = OperationSpec<EventPage>(
    id: 'alpha.events',
    plane: 'alpha',
    kind: OperationKind.query,
    field: 'events',
    operationName: 'AlphaEvents',
    document: 'query AlphaEvents(\$context: ContextInput!, \$input: EventsInput!) {\n'
        '  events(context: \$context, input: \$input) {\n'
        '    items {\n'
        '      sequence\n'
        '      type\n'
        '      subjectRef {\n'
        '        kind\n'
        '        id\n'
        '      }\n'
        '      payload {\n'
        '        itemId\n'
        '        jobId\n'
        '        revision\n'
        '        note\n'
        '      }\n'
        '    }\n'
        '    complete\n'
        '    refreshRequired\n'
        '    nextCursor\n'
        '  }\n'
        '}',
    resultType: 'EventPage!',
    contextArgument: 'context',
    contextFields: <String, String>{'tenant': 'required', 'requestId': 'required', 'attempt': 'optional', 'permit': 'forbidden', 'tags': 'optional'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['after', 'limit'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'replay',
    realtime: 'none',
    errorCodes: <String>['CURSOR_EXPIRED', 'INVALID_REQUEST', 'TRANSPORT_UNKNOWN', 'UNAVAILABLE'],
    decode: _resultAlphaEvents,
  );

  /// Fetch a <status> for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, & a back\slash for _escaping_ in snake_case.
  static const alphaFetchHttpStatus = OperationSpec<int?>(
    id: 'alpha.fetchHTTPStatus',
    plane: 'alpha',
    kind: OperationKind.query,
    field: 'fetchHTTPStatus',
    operationName: 'AlphaFetchHTTPStatus',
    document: 'query AlphaFetchHTTPStatus(\$context: ContextInput!, \$input: FetchInput) {\n'
        '  fetchHTTPStatus(context: \$context, input: \$input)\n'
        '}',
    resultType: 'Int',
    contextArgument: 'context',
    contextFields: <String, String>{'tenant': 'required', 'requestId': 'required', 'attempt': 'optional', 'permit': 'forbidden', 'tags': 'optional'},
    inputArgument: 'input',
    inputRequired: false,
    inputFields: <String>['method'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['UNAVAILABLE'],
    decode: _resultAlphaFetchHttpStatus,
  );

  /// 1. Send an ephemeral ping.
  static const alphaPing = OperationSpec<bool>(
    id: 'alpha.ping',
    plane: 'alpha',
    kind: OperationKind.mutation,
    field: 'ping',
    operationName: 'AlphaPing',
    document: 'mutation AlphaPing(\$context: ContextInput!, \$input: PingInput) {\n'
        '  ping(context: \$context, input: \$input)\n'
        '}',
    resultType: 'Boolean!',
    contextArgument: 'context',
    contextFields: <String, String>{'tenant': 'required', 'requestId': 'required', 'attempt': 'optional', 'permit': 'forbidden', 'tags': 'optional'},
    inputArgument: 'input',
    inputRequired: false,
    inputFields: <String>['note'],
    idempotency: IdempotencyClasses.ephemeral,
    pagination: 'none',
    realtime: 'none',
    errorCodes: <String>['INVALID_REQUEST', 'UNAVAILABLE'],
    decode: _resultAlphaPing,
  );

  /// Subscribe to alpha events after a cursor.
  static const alphaEventStream = OperationSpec<EventPage>(
    id: 'alpha.eventStream',
    plane: 'alpha',
    kind: OperationKind.subscription,
    field: 'eventStream',
    operationName: 'AlphaEventStream',
    document: 'subscription AlphaEventStream(\$context: ContextInput!, \$input: EventsInput!) {\n'
        '  eventStream(context: \$context, input: \$input) {\n'
        '    items {\n'
        '      sequence\n'
        '      type\n'
        '      subjectRef {\n'
        '        kind\n'
        '        id\n'
        '      }\n'
        '      payload {\n'
        '        itemId\n'
        '        jobId\n'
        '        revision\n'
        '        note\n'
        '      }\n'
        '    }\n'
        '    complete\n'
        '    refreshRequired\n'
        '    nextCursor\n'
        '  }\n'
        '}',
    resultType: 'EventPage!',
    contextArgument: 'context',
    contextFields: <String, String>{'tenant': 'required', 'requestId': 'required', 'attempt': 'optional', 'permit': 'forbidden', 'tags': 'optional'},
    inputArgument: 'input',
    inputRequired: true,
    inputFields: <String>['after', 'limit'],
    idempotency: IdempotencyClasses.safe,
    pagination: 'replay',
    realtime: 'subscription',
    errorCodes: <String>['CURSOR_EXPIRED', 'INVALID_REQUEST', 'UNAVAILABLE'],
    decode: _resultAlphaEventStream,
  );
}

/// [Operations] by ID.
const Map<String, OperationSpec<Object?>> operationCatalog = <String, OperationSpec<Object?>>{
  'alpha.capabilities': Operations.alphaCapabilities,
  'alpha.resolveRequest': Operations.alphaResolveRequest,
  'alpha.items': Operations.alphaItems,
  'alpha.events': Operations.alphaEvents,
  'alpha.fetchHTTPStatus': Operations.alphaFetchHttpStatus,
  'alpha.ping': Operations.alphaPing,
  'alpha.eventStream': Operations.alphaEventStream,
};

Capabilities _resultAlphaCapabilities(Object? json) => _decodeCapabilities(json, r'$');

Receipt _resultAlphaResolveRequest(Object? json) => _decodeReceipt(json, r'$');

ItemPage _resultAlphaItems(Object? json) => _decodeItemPage(json, r'$');

EventPage _resultAlphaEvents(Object? json) => _decodeEventPage(json, r'$');

int? _resultAlphaFetchHttpStatus(Object? json) => _n(json, r'$', _scalarInt);

bool _resultAlphaPing(Object? json) => _scalarBoolean(json, r'$');

EventPage _resultAlphaEventStream(Object? json) => _decodeEventPage(json, r'$');

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
  /// The cursor is too old.
  static const String cursorExpired = 'CURSOR_EXPIRED';

  /// The request is malformed.
  static const String invalidRequest = 'INVALID_REQUEST';

  /// The resource does not exist.
  static const String notFound = 'NOT_FOUND';

  /// The transport failed after sending.
  static const String transportUnknown = 'TRANSPORT_UNKNOWN';

  /// Temporarily unavailable.
  static const String unavailable = 'UNAVAILABLE';
}

/// Every error code, by code.
const Map<String, ErrorCodeSpec> errorCodes = <String, ErrorCodeSpec>{
  'CURSOR_EXPIRED': ErrorCodeSpec(code: 'CURSOR_EXPIRED', summary: 'The cursor is too old.', origin: 'server', status: 410, retryable: false),
  'INVALID_REQUEST': ErrorCodeSpec(code: 'INVALID_REQUEST', summary: 'The request is malformed.', origin: 'both', status: 400, retryable: false),
  'NOT_FOUND': ErrorCodeSpec(code: 'NOT_FOUND', summary: 'The resource does not exist.', origin: 'server', status: 404, retryable: false),
  'TRANSPORT_UNKNOWN': ErrorCodeSpec(code: 'TRANSPORT_UNKNOWN', summary: 'The transport failed after sending.', origin: 'sdk', status: null, retryable: true),
  'UNAVAILABLE': ErrorCodeSpec(code: 'UNAVAILABLE', summary: 'Temporarily unavailable.', origin: 'server', status: 503, retryable: true),
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
  plane: 'alpha',
  type: 'Event',
  discriminator: 'type',
  payload: 'payload',
  payloadType: 'EventPayload',
  subject: 'subjectRef',
  subjectType: 'SubjectRef',
  unknownTypes: 'deliverAsUnknown',
);

/// The realtime channels a user session can subscribe to, by name.
const Map<String, RealtimeChannelSpec> realtimeChannels = <String, RealtimeChannelSpec>{
  'eventStream': RealtimeChannelSpec(
    name: 'eventStream',
    subscription: 'alpha.eventStream',
    replay: 'alpha.events',
    pageType: 'EventPage',
    endpointOperation: 'alpha.capabilities',
    endpointField: 'wssUrl',
    connectionInit: <String>['tenant', 'token'],
    maxFrameBytes: 4096,
    maxPendingPages: 2,
    subscribeLimit: 10,
    replayLimit: 20,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    jitterMs: 0,
    terminalCloseCodes: <int>[4401, 4403],
  ),
};

/// The realtime event types, by type.
const Map<String, RealtimeEventSpec> realtimeEvents = <String, RealtimeEventSpec>{
  'item.changed': RealtimeEventSpec(
    type: 'item.changed',
    subject: 'item',
    requiredFields: <String>['itemId'],
    optionalFields: <String>['note'],
  ),
  'job.finished': RealtimeEventSpec(
    type: 'job.finished',
    subject: 'job',
    requiredFields: <String>['jobId', 'revision'],
    optionalFields: <String>[],
  ),
  'job.started': RealtimeEventSpec(
    type: 'job.started',
    subject: 'job',
    requiredFields: <String>['jobId'],
    optionalFields: <String>[],
  ),
};
