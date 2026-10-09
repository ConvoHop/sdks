// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

/// The kind of a GraphQL operation.
public enum GraphQLOperationKind: String, Hashable, Sendable {
    case query
    case mutation
    case subscription
}

/// Retry and resolution rules of an idempotency class.
public struct GraphQLIdempotency: Hashable, Sendable {
    public let name: String
    public let retry: GraphQLRetry
    /// Whether an unknown outcome can be resolved by looking up the request.
    public let resolvable: Bool
    public let retryBudget: GraphQLRetryBudget?
}

/// How many times, and for how long, a request may be resent with the same request ID.
public struct GraphQLRetryBudget: Hashable, Sendable {
    public let maxAttempts: Int
    public let windowMs: Int
}

/// Whether a request-context field is sent.
public enum GraphQLContextUse: String, Hashable, Sendable {
    case required
    case optional
    case forbidden
}

/// A request-context field of an operation.
public struct GraphQLContextField: Hashable, Sendable {
    public let name: String
    public let use: GraphQLContextUse
}

/// What the runtime needs to send an operation and validate its result.
public struct GraphQLOperationDescriptor: Hashable, Sendable {
    /// The operation ID, for example `communication.sendMessage`.
    public let key: String
    public let plane: String
    public let kind: GraphQLOperationKind
    /// The root field that holds the result.
    public let field: String
    public let operationName: String
    /// The GraphQL document, sent unchanged.
    public let document: String
    /// The GraphQL result type, for example `SendMessageReply!`.
    public let resultType: String
    public let inputFields: [String]
    public let idempotency: GraphQLIdempotency
    public let context: [GraphQLContextField]
}

/// A typed operation. `Input` is sent as the `input` variable and `Output` decodes the root field.
public struct GraphQLOperation<Input: Codable & Sendable, Output: Codable & Sendable>: Sendable {
    public let descriptor: GraphQLOperationDescriptor

    public init(_ descriptor: GraphQLOperationDescriptor) {
        self.descriptor = descriptor
    }
}

/// How a scalar is represented in JSON.
enum GraphQLRepresentation: Sendable {
    case string
    case integer
    case number
    case boolean
    case object
}

/// A scalar output and the constraints the runtime checks.
struct GraphQLScalarShape: Sendable {
    let representation: GraphQLRepresentation
    let pattern: String?
    let maximumDecimal: String?
    let disallowed: [String]
}

/// A field of an object output and its GraphQL type, for example `[Event!]!`.
struct GraphQLOutputField: Sendable {
    let name: String
    let type: String
}

/// The shape of an output type.
enum GraphQLOutputShape: Sendable {
    case scalar(GraphQLScalarShape)
    case enumeration(Set<String>)
    case object([GraphQLOutputField])
}

/// A realtime channel and its limits.
struct GraphQLRealtimeChannel: Sendable {
    let name: String
    let subscription: String
    let replay: String
    let pageType: String
    let connectionInit: [String]
    let maxFrameBytes: Int
    let maxPendingPages: Int
    let subscribeLimit: Int
    let replayLimit: Int
    let baseDelayMs: Int
    let maxDelayMs: Int
    let jitterMs: Int
    let terminalCloseCodes: Set<Int>
}

/// How a request is resent.
public enum GraphQLRetry: String, Hashable, Sendable {
    case none = "none"
    case `repeat` = "repeat"
    case sameRequest = "sameRequest"
}

extension GraphQLIdempotency {
    /// Transient signal. Never retried.
    public static let ephemeral = GraphQLIdempotency(
        name: "ephemeral", retry: .none, resolvable: false, retryBudget: nil)
    /// Retry with the same requestId and input; resolve an unknown outcome with resolveRequest.
    public static let idempotent = GraphQLIdempotency(
        name: "idempotent", retry: .sameRequest, resolvable: true, retryBudget: GraphQLRetryBudget(maxAttempts: 3, windowMs: 60000))
    /// Authorized by a single-use permit. Retry with the same requestId and permit.
    public static let permitBound = GraphQLIdempotency(
        name: "permitBound", retry: .sameRequest, resolvable: false, retryBudget: GraphQLRetryBudget(maxAttempts: 3, windowMs: 60000))
    /// Read-only. Repeat freely.
    public static let safe = GraphQLIdempotency(
        name: "safe", retry: .`repeat`, resolvable: false, retryBudget: nil)
    /// Like idempotent, but the result is good for one use.
    public static let singleUse = GraphQLIdempotency(
        name: "singleUse", retry: .sameRequest, resolvable: true, retryBudget: GraphQLRetryBudget(maxAttempts: 2, windowMs: 1000))
}

/// The operations a client may send, keyed in the catalog by operation ID.
public enum ConvoHopOperations {
    /// Read the server capabilities.
    public static let alphaCapabilities = GraphQLOperation<NoInput, Capabilities>(
        GraphQLCatalog.operations["alpha.capabilities"]!)
    /// Look up the outcome of an earlier alpha mutation by requestId.
    public static let alphaResolveRequest = GraphQLOperation<ResolveInput, Receipt>(
        GraphQLCatalog.operations["alpha.resolveRequest"]!)
    /// List items in server order.
    public static let alphaItems = GraphQLOperation<ItemsInput, ItemPage>(
        GraphQLCatalog.operations["alpha.items"]!)
    /// Replay alpha events after a cursor.
    public static let alphaEvents = GraphQLOperation<EventsInput, EventPage>(
        GraphQLCatalog.operations["alpha.events"]!)
    /// Fetch a <status> for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, & a back\slash for _escaping_ in snake_case.
    ///
    /// - Note: Deprecated. Use capabilities.
    public static let alphaFetchHttpStatus = GraphQLOperation<FetchInput, Int?>(
        GraphQLCatalog.operations["alpha.fetchHTTPStatus"]!)
    /// 1. Send an ephemeral ping.
    public static let alphaPing = GraphQLOperation<PingInput, Bool>(
        GraphQLCatalog.operations["alpha.ping"]!)
    /// Subscribe to alpha events after a cursor.
    public static let alphaEventStream = GraphQLOperation<EventsInput, EventPage>(
        GraphQLCatalog.operations["alpha.eventStream"]!)
}

/// The operation catalog and output shapes the runtime reads.
enum GraphQLCatalog {
    static let operations: [String: GraphQLOperationDescriptor] = [
        "alpha.capabilities": GraphQLOperationDescriptor(
            key: "alpha.capabilities",
            plane: "alpha",
            kind: .query,
            field: "capabilities",
            operationName: "AlphaCapabilities",
            document: """
            query AlphaCapabilities($context: ContextInput!) {
              capabilities(context: $context) {
                version
                wssUrl
                features
              }
            }
            """,
            resultType: "Capabilities!",
            inputFields: [],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "tenant", use: .optional),
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "attempt", use: .optional),
                GraphQLContextField(name: "permit", use: .forbidden),
                GraphQLContextField(name: "tags", use: .optional),
            ]
        ),
        "alpha.resolveRequest": GraphQLOperationDescriptor(
            key: "alpha.resolveRequest",
            plane: "alpha",
            kind: .query,
            field: "resolveRequest",
            operationName: "AlphaResolveRequest",
            document: """
            query AlphaResolveRequest($context: ContextInput!, $input: ResolveInput!) {
              resolveRequest(context: $context, input: $input) {
                requestId
                committed
                sequence
              }
            }
            """,
            resultType: "Receipt!",
            inputFields: ["requestId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "tenant", use: .required),
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "attempt", use: .optional),
                GraphQLContextField(name: "permit", use: .forbidden),
                GraphQLContextField(name: "tags", use: .optional),
            ]
        ),
        "alpha.items": GraphQLOperationDescriptor(
            key: "alpha.items",
            plane: "alpha",
            kind: .query,
            field: "items",
            operationName: "AlphaItems",
            document: """
            query AlphaItems($context: ContextInput!, $input: ItemsInput!) {
              items(context: $context, input: $input) {
                items {
                  id
                  name
                  fruit
                  weight
                  ripe
                  oldName
                  legacyCode
                  grid
                  aliases
                  history
                }
                complete
                refreshRequired
                nextCursor
              }
            }
            """,
            resultType: "ItemPage!",
            inputFields: ["limit", "cursor", "fruits", "minWeight", "includeDeprecated", "method", "box", "legacyFilter", "item2", "item10"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "tenant", use: .required),
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "attempt", use: .optional),
                GraphQLContextField(name: "permit", use: .forbidden),
                GraphQLContextField(name: "tags", use: .optional),
            ]
        ),
        "alpha.events": GraphQLOperationDescriptor(
            key: "alpha.events",
            plane: "alpha",
            kind: .query,
            field: "events",
            operationName: "AlphaEvents",
            document: """
            query AlphaEvents($context: ContextInput!, $input: EventsInput!) {
              events(context: $context, input: $input) {
                items {
                  sequence
                  type
                  subjectRef {
                    kind
                    id
                  }
                  payload {
                    itemId
                    jobId
                    revision
                    note
                  }
                }
                complete
                refreshRequired
                nextCursor
              }
            }
            """,
            resultType: "EventPage!",
            inputFields: ["after", "limit"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "tenant", use: .required),
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "attempt", use: .optional),
                GraphQLContextField(name: "permit", use: .forbidden),
                GraphQLContextField(name: "tags", use: .optional),
            ]
        ),
        "alpha.fetchHTTPStatus": GraphQLOperationDescriptor(
            key: "alpha.fetchHTTPStatus",
            plane: "alpha",
            kind: .query,
            field: "fetchHTTPStatus",
            operationName: "AlphaFetchHTTPStatus",
            document: """
            query AlphaFetchHTTPStatus($context: ContextInput!, $input: FetchInput) {
              fetchHTTPStatus(context: $context, input: $input)
            }
            """,
            resultType: "Int",
            inputFields: ["method"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "tenant", use: .required),
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "attempt", use: .optional),
                GraphQLContextField(name: "permit", use: .forbidden),
                GraphQLContextField(name: "tags", use: .optional),
            ]
        ),
        "alpha.ping": GraphQLOperationDescriptor(
            key: "alpha.ping",
            plane: "alpha",
            kind: .mutation,
            field: "ping",
            operationName: "AlphaPing",
            document: """
            mutation AlphaPing($context: ContextInput!, $input: PingInput) {
              ping(context: $context, input: $input)
            }
            """,
            resultType: "Boolean!",
            inputFields: ["note"],
            idempotency: .ephemeral,
            context: [
                GraphQLContextField(name: "tenant", use: .required),
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "attempt", use: .optional),
                GraphQLContextField(name: "permit", use: .forbidden),
                GraphQLContextField(name: "tags", use: .optional),
            ]
        ),
        "alpha.eventStream": GraphQLOperationDescriptor(
            key: "alpha.eventStream",
            plane: "alpha",
            kind: .subscription,
            field: "eventStream",
            operationName: "AlphaEventStream",
            document: """
            subscription AlphaEventStream($context: ContextInput!, $input: EventsInput!) {
              eventStream(context: $context, input: $input) {
                items {
                  sequence
                  type
                  subjectRef {
                    kind
                    id
                  }
                  payload {
                    itemId
                    jobId
                    revision
                    note
                  }
                }
                complete
                refreshRequired
                nextCursor
              }
            }
            """,
            resultType: "EventPage!",
            inputFields: ["after", "limit"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "tenant", use: .required),
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "attempt", use: .optional),
                GraphQLContextField(name: "permit", use: .forbidden),
                GraphQLContextField(name: "tags", use: .optional),
            ]
        ),
    ]

    static let outputShapes: [String: GraphQLOutputShape] = [
        "Boolean": .scalar(GraphQLScalarShape(representation: .boolean, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "Capabilities": .object([
            GraphQLOutputField(name: "version", type: "String!"),
            GraphQLOutputField(name: "wssUrl", type: "String"),
            GraphQLOutputField(name: "features", type: "[String!]!"),
        ]),
        "Counter": .scalar(GraphQLScalarShape(representation: .string, pattern: "^(0|[1-9][0-9]*)$", maximumDecimal: "9223372036854775807", disallowed: [])),
        "Event": .object([
            GraphQLOutputField(name: "sequence", type: "Counter!"),
            GraphQLOutputField(name: "type", type: "String!"),
            GraphQLOutputField(name: "subjectRef", type: "SubjectRef!"),
            GraphQLOutputField(name: "payload", type: "EventPayload!"),
        ]),
        "EventPage": .object([
            GraphQLOutputField(name: "items", type: "[Event!]!"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
        ]),
        "EventPayload": .object([
            GraphQLOutputField(name: "itemId", type: "ID"),
            GraphQLOutputField(name: "jobId", type: "ID"),
            GraphQLOutputField(name: "revision", type: "Counter"),
            GraphQLOutputField(name: "note", type: "String"),
        ]),
        "Float": .scalar(GraphQLScalarShape(representation: .number, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "Fruit": .enumeration(["BANANA", "APPLE", "cherry", "apple10", "apple9", "DATE", "ELDER"]),
        "ID": .scalar(GraphQLScalarShape(representation: .string, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "Int": .scalar(GraphQLScalarShape(representation: .integer, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "Item": .object([
            GraphQLOutputField(name: "id", type: "ID!"),
            GraphQLOutputField(name: "name", type: "String!"),
            GraphQLOutputField(name: "fruit", type: "Fruit"),
            GraphQLOutputField(name: "weight", type: "Float"),
            GraphQLOutputField(name: "ripe", type: "Boolean!"),
            GraphQLOutputField(name: "oldName", type: "String"),
            GraphQLOutputField(name: "legacyCode", type: "Int"),
            GraphQLOutputField(name: "grid", type: "[[Int!]]!"),
            GraphQLOutputField(name: "aliases", type: "[String]"),
            GraphQLOutputField(name: "history", type: "[[Fruit]!]"),
        ]),
        "ItemPage": .object([
            GraphQLOutputField(name: "items", type: "[Item!]!"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
        ]),
        "Receipt": .object([
            GraphQLOutputField(name: "requestId", type: "ID!"),
            GraphQLOutputField(name: "committed", type: "Boolean!"),
            GraphQLOutputField(name: "sequence", type: "Counter"),
        ]),
        "String": .scalar(GraphQLScalarShape(representation: .string, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "SubjectRef": .object([
            GraphQLOutputField(name: "kind", type: "String!"),
            GraphQLOutputField(name: "id", type: "ID!"),
        ]),
    ]
}

/// HTTP and WebSocket transport constants.
enum GraphQLTransport {
    static let path = "/graphql"
    static let webSocketSubprotocol = "graphql-transport-ws"
    static let maxDocumentBytes = 4096
}

/// A ConvoHop error code. Codes that this list doesn't name can still arrive, so handle unknown codes.
public struct ConvoHopErrorCode: RawRepresentable, Hashable, Sendable {
    public let rawValue: String

    public init(rawValue: String) {
        self.rawValue = rawValue
    }
}

extension ConvoHopErrorCode {
    /// The cursor is too old.
    public static let cursorExpired = ConvoHopErrorCode(rawValue: "CURSOR_EXPIRED")
    /// The request is malformed.
    public static let invalidRequest = ConvoHopErrorCode(rawValue: "INVALID_REQUEST")
    /// The resource does not exist.
    public static let notFound = ConvoHopErrorCode(rawValue: "NOT_FOUND")
    /// The transport failed after sending.
    public static let transportUnknown = ConvoHopErrorCode(rawValue: "TRANSPORT_UNKNOWN")
    /// Temporarily unavailable.
    public static let unavailable = ConvoHopErrorCode(rawValue: "UNAVAILABLE")

    /// The documented HTTP-equivalent status and retryability of every code the schema lists, including codes that
    /// only server operations return.
    static let catalog: [String: (status: Int?, retryable: Bool)] = [
        "CURSOR_EXPIRED": (status: 410, retryable: false),
        "INVALID_REQUEST": (status: 400, retryable: false),
        "NOT_FOUND": (status: 404, retryable: false),
        "TRANSPORT_UNKNOWN": (status: nil, retryable: true),
        "UNAVAILABLE": (status: 503, retryable: true),
    ]
}

/// A realtime event type. Types that this list doesn't name are delivered as they are, not dropped.
public struct ConversationEventType: RawRepresentable, Hashable, Sendable {
    public let rawValue: String

    public init(rawValue: String) {
        self.rawValue = rawValue
    }
}

extension ConversationEventType {
    /// An item changed.
    public static let itemChanged = ConversationEventType(rawValue: "item.changed")
    /// A job finished.
    public static let jobFinished = ConversationEventType(rawValue: "job.finished")
    /// A job started.
    public static let jobStarted = ConversationEventType(rawValue: "job.started")
}

/// Realtime channels and their limits.
enum GraphQLRealtime {
    /// Ordered alpha events, gap-filled with alpha.events.
    static let eventStream = GraphQLRealtimeChannel(
        name: "eventStream",
        subscription: "alpha.eventStream",
        replay: "alpha.events",
        pageType: "EventPage",
        connectionInit: ["tenant", "token"],
        maxFrameBytes: 4096,
        maxPendingPages: 2,
        subscribeLimit: 10,
        replayLimit: 20,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        jitterMs: 0,
        terminalCloseCodes: [4401, 4403]
    )
}
