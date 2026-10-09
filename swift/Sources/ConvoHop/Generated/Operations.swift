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
    /// Transient signal. Not deduplicated or retried; send a fresh signal instead.
    public static let ephemeral = GraphQLIdempotency(
        name: "ephemeral", retry: .none, resolvable: false, retryBudget: nil)
    /// Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest.
    public static let idempotent = GraphQLIdempotency(
        name: "idempotent", retry: .sameRequest, resolvable: true, retryBudget: GraphQLRetryBudget(maxAttempts: 3, windowMs: 60000))
    /// Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup.
    public static let permitBound = GraphQLIdempotency(
        name: "permitBound", retry: .sameRequest, resolvable: false, retryBudget: GraphQLRetryBudget(maxAttempts: 3, windowMs: 60000))
    /// Retry with the same requestId and identical input within the retry budget; the authority answers a repeat with the original outcome. Outcomes cannot be resolved by lookup, so settle an unknown outcome by sending the same request again.
    public static let replayOnly = GraphQLIdempotency(
        name: "replayOnly", retry: .sameRequest, resolvable: false, retryBudget: GraphQLRetryBudget(maxAttempts: 3, windowMs: 60000))
    /// Read-only. Repeat freely; each attempt may use a new requestId.
    public static let safe = GraphQLIdempotency(
        name: "safe", retry: .`repeat`, resolvable: false, retryBudget: nil)
    /// Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result.
    public static let singleUse = GraphQLIdempotency(
        name: "singleUse", retry: .sameRequest, resolvable: true, retryBudget: GraphQLRetryBudget(maxAttempts: 3, windowMs: 60000))
}

/// The operations a client may send, keyed in the catalog by operation ID.
public enum ConvoHopOperations {
    /// Describe the features, limits and API model the authority supports.
    public static let communicationCapabilities = GraphQLOperation<NoInput, CapabilitiesReply>(
        GraphQLCatalog.operations["communication.capabilities"]!)
    /// Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION.
    public static let communicationRoute = GraphQLOperation<NoInput, RouteReply>(
        GraphQLCatalog.operations["communication.route"]!)
    /// Return the calling user session.
    public static let communicationCurrentSession = GraphQLOperation<NoInput, CurrentSessionReply>(
        GraphQLCatalog.operations["communication.currentSession"]!)
    /// Read a conversation.
    public static let communicationGetConversation = GraphQLOperation<GetConversationRequestInput, GetConversationReply>(
        GraphQLCatalog.operations["communication.getConversation"]!)
    /// List the members of a conversation.
    public static let communicationMembers = GraphQLOperation<MembersRequestInput, MembersReply>(
        GraphQLCatalog.operations["communication.members"]!)
    /// List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId.
    public static let communicationMessages = GraphQLOperation<MessagesRequestInput, MessagesReply>(
        GraphQLCatalog.operations["communication.messages"]!)
    /// Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId.
    public static let communicationGetMessage = GraphQLOperation<GetMessageRequestInput, GetMessageReply>(
        GraphQLCatalog.operations["communication.getMessage"]!)
    /// Replay committed conversation events after a cursor, in sequence order.
    public static let communicationEvents = GraphQLOperation<EventsRequestInput, EventsReply>(
        GraphQLCatalog.operations["communication.events"]!)
    /// List the delivery and read receipts of a conversation.
    public static let communicationReceipts = GraphQLOperation<ReceiptsRequestInput, ReceiptsReply>(
        GraphQLCatalog.operations["communication.receipts"]!)
    /// List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId.
    public static let communicationInbox = GraphQLOperation<InboxRequestInput, InboxReply>(
        GraphQLCatalog.operations["communication.inbox"]!)
    /// Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds.
    public static let communicationSearch = GraphQLOperation<SearchRequestInput, SearchReply>(
        GraphQLCatalog.operations["communication.search"]!)
    /// Look up the stored outcome of an earlier communication mutation by its requestId.
    public static let communicationResolveRequest = GraphQLOperation<ResolveRequestRequestInput, ResolveRequestReply>(
        GraphQLCatalog.operations["communication.resolveRequest"]!)
    /// Read the state of a long-running communication operation.
    public static let communicationGetOperation = GraphQLOperation<GetOperationRequestInput, GetOperationReply>(
        GraphQLCatalog.operations["communication.getOperation"]!)
    /// Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId.
    public static let communicationConversationMute = GraphQLOperation<ConversationMuteInput, ConversationMuteReply>(
        GraphQLCatalog.operations["communication.conversationMute"]!)
    /// Return the active live session of a conversation, if any.
    public static let communicationCurrentLiveSession = GraphQLOperation<ConversationLiveInput, CurrentLiveSessionReply>(
        GraphQLCatalog.operations["communication.currentLiveSession"]!)
    /// Read a live session.
    public static let communicationLiveSession = GraphQLOperation<LiveSessionInput, LiveSessionReply>(
        GraphQLCatalog.operations["communication.liveSession"]!)
    /// List the live sessions of a conversation.
    public static let communicationLiveSessions = GraphQLOperation<LiveSessionsInput, LiveSessionPageReply>(
        GraphQLCatalog.operations["communication.liveSessions"]!)
    /// List the participants of a live session.
    public static let communicationLiveSessionParticipants = GraphQLOperation<LiveParticipantsInput, LiveParticipantPageReply>(
        GraphQLCatalog.operations["communication.liveSessionParticipants"]!)
    /// List the live session alerts addressed to the calling user.
    public static let communicationLiveSessionAlerts = GraphQLOperation<LiveAlertsInput, LiveAlertPageReply>(
        GraphQLCatalog.operations["communication.liveSessionAlerts"]!)
    /// Read the state of a live session start or end operation.
    public static let communicationLiveSessionOperation = GraphQLOperation<LiveSessionOperationInput, LiveSessionOperationReply>(
        GraphQLCatalog.operations["communication.liveSessionOperation"]!)
    /// Revoke a user session.
    public static let communicationRevokeSession = GraphQLOperation<RevokeSessionRequestInput, RevokeSessionReply>(
        GraphQLCatalog.operations["communication.revokeSession"]!)
    /// Update the title or properties of a conversation.
    public static let communicationUpdateConversation = GraphQLOperation<UpdateConversationRequestInput, UpdateConversationReply>(
        GraphQLCatalog.operations["communication.updateConversation"]!)
    /// Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId.
    public static let communicationSendMessage = GraphQLOperation<SendMessageRequestInput, SendMessageReply>(
        GraphQLCatalog.operations["communication.sendMessage"]!)
    /// Edit a message.
    public static let communicationEditMessage = GraphQLOperation<EditMessageRequestInput, EditMessageReply>(
        GraphQLCatalog.operations["communication.editMessage"]!)
    /// Delete a message.
    public static let communicationDeleteMessage = GraphQLOperation<DeleteMessageRequestInput, DeleteMessageReply>(
        GraphQLCatalog.operations["communication.deleteMessage"]!)
    /// Report delivery or read progress through a sequence.
    public static let communicationReportReceipt = GraphQLOperation<ReportReceiptRequestInput, ReportReceiptReply>(
        GraphQLCatalog.operations["communication.reportReceipt"]!)
    /// Send an ephemeral typing signal.
    public static let communicationTyping = GraphQLOperation<TypingRequestInput, TypingReply>(
        GraphQLCatalog.operations["communication.typing"]!)
    /// Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId.
    public static let communicationSetConversationMute = GraphQLOperation<SetConversationMuteInput, SetConversationMutePayload>(
        GraphQLCatalog.operations["communication.setConversationMute"]!)
    /// Start a live session (a call) in a conversation. Readiness completes asynchronously.
    public static let communicationStartLiveSession = GraphQLOperation<StartLiveSessionInput, StartLiveSessionPayload>(
        GraphQLCatalog.operations["communication.startLiveSession"]!)
    /// Join a live session.
    public static let communicationJoinLiveSession = GraphQLOperation<JoinLiveSessionInput, JoinLiveSessionPayload>(
        GraphQLCatalog.operations["communication.joinLiveSession"]!)
    /// Alert (ring) conversation members about a live session.
    public static let communicationAlertLiveSession = GraphQLOperation<AlertLiveSessionInput, AlertLiveSessionPayload>(
        GraphQLCatalog.operations["communication.alertLiveSession"]!)
    /// Leave a live session.
    public static let communicationLeaveLiveSession = GraphQLOperation<LeaveLiveSessionInput, LeaveLiveSessionPayload>(
        GraphQLCatalog.operations["communication.leaveLiveSession"]!)
    /// End a live session for every participant. Completes asynchronously.
    public static let communicationEndLiveSession = GraphQLOperation<EndLiveSessionInput, EndLiveSessionPayload>(
        GraphQLCatalog.operations["communication.endLiveSession"]!)
    /// Obtain a media credential for one connection of the caller's participation.
    public static let communicationLiveSessionCredentials = GraphQLOperation<LiveSessionCredentialsInput, LiveSessionCredentialsPayload>(
        GraphQLCatalog.operations["communication.liveSessionCredentials"]!)
    /// Subscribe to conversation events in sequence order, resuming after a cursor.
    public static let communicationConversationEvents = GraphQLOperation<EventsRequestInput, EventPage>(
        GraphQLCatalog.operations["communication.conversationEvents"]!)
}

/// The operation catalog and output shapes the runtime reads.
enum GraphQLCatalog {
    static let operations: [String: GraphQLOperationDescriptor] = [
        "communication.capabilities": GraphQLOperationDescriptor(
            key: "communication.capabilities",
            plane: "communication",
            kind: .query,
            field: "capabilities",
            operationName: "CommunicationCapabilities",
            document: """
            query CommunicationCapabilities($context: RequestContextInput!) {
              capabilities(context: $context) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  serverRelease
                  capabilityRevision
                  limitsRevision
                  features {
                    chat
                    inbox
                    lexicalSearch
                    typing
                    webhooks
                    liveSessions
                    liveBroadcast
                  }
                  limits {
                    key
                    value {
                      maximum
                      unit
                      scope
                      milliseconds
                      policyId
                      revision
                    }
                  }
                  environment
                  productionQualified
                  mediaPolicy {
                    leasePolicyId
                    maxLeaseMs
                    renewAttemptMs
                    preludeMaxBytes
                    preludeTimeoutMs
                    clockProfileId
                  }
                  geoControlAuthorityId
                  offerings
                  geos
                  installationProfiles
                  portalIdentity
                }
              }
            }
            """,
            resultType: "CapabilitiesReply!",
            inputFields: [],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .optional),
                GraphQLContextField(name: "observedServingEpoch", use: .optional),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.route": GraphQLOperationDescriptor(
            key: "communication.route",
            plane: "communication",
            kind: .query,
            field: "route",
            operationName: "CommunicationRoute",
            document: """
            query CommunicationRoute($context: RequestContextInput!) {
              route(context: $context) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result
              }
            }
            """,
            resultType: "RouteReply!",
            inputFields: [],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .optional),
                GraphQLContextField(name: "observedServingEpoch", use: .optional),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.currentSession": GraphQLOperationDescriptor(
            key: "communication.currentSession",
            plane: "communication",
            kind: .query,
            field: "currentSession",
            operationName: "CommunicationCurrentSession",
            document: """
            query CommunicationCurrentSession($context: RequestContextInput!) {
              currentSession(context: $context) {
                status
                requestId
                serverTime
                result {
                  sessionId
                  principalId
                  deviceId
                  incarnation
                  sessionRevision
                  expiresAt
                  status
                }
              }
            }
            """,
            resultType: "CurrentSessionReply!",
            inputFields: [],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.getConversation": GraphQLOperationDescriptor(
            key: "communication.getConversation",
            plane: "communication",
            kind: .query,
            field: "getConversation",
            operationName: "CommunicationGetConversation",
            document: """
            query CommunicationGetConversation($context: RequestContextInput!, $input: GetConversationRequestInput!) {
              getConversation(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  conversationId
                  revision
                  title
                  props
                  latestSequence
                  membership {
                    conversationId
                    principalId
                    role
                    status
                    membershipEpoch
                    visibilityEpoch
                    revision
                    visibleFromSequence
                    canStartBroadcast
                  }
                }
              }
            }
            """,
            resultType: "GetConversationReply!",
            inputFields: ["conversationId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.members": GraphQLOperationDescriptor(
            key: "communication.members",
            plane: "communication",
            kind: .query,
            field: "members",
            operationName: "CommunicationMembers",
            document: """
            query CommunicationMembers($context: RequestContextInput!, $input: MembersRequestInput!) {
              members(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  items {
                    conversationId
                    principalId
                    role
                    status
                    membershipEpoch
                    visibilityEpoch
                    revision
                    visibleFromSequence
                    canStartBroadcast
                  }
                  complete
                  refreshRequired
                  nextCursor
                }
              }
            }
            """,
            resultType: "MembersReply!",
            inputFields: ["conversationId", "limit", "cursor"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.messages": GraphQLOperationDescriptor(
            key: "communication.messages",
            plane: "communication",
            kind: .query,
            field: "messages",
            operationName: "CommunicationMessages",
            document: """
            query CommunicationMessages($context: RequestContextInput!, $input: MessagesRequestInput!) {
              messages(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  items {
                    messageId
                    conversationId
                    authorId
                    sequence
                    revision
                    revisionSequence
                    createdAt
                    deleted
                    text
                    props
                    editedAt
                  }
                  complete
                  refreshRequired
                  nextCursor
                }
              }
            }
            """,
            resultType: "MessagesReply!",
            inputFields: ["conversationId", "limit", "beforeSequence", "actAsPrincipalId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.getMessage": GraphQLOperationDescriptor(
            key: "communication.getMessage",
            plane: "communication",
            kind: .query,
            field: "getMessage",
            operationName: "CommunicationGetMessage",
            document: """
            query CommunicationGetMessage($context: RequestContextInput!, $input: GetMessageRequestInput!) {
              getMessage(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  messageId
                  conversationId
                  authorId
                  sequence
                  revision
                  revisionSequence
                  createdAt
                  deleted
                  text
                  props
                  editedAt
                }
              }
            }
            """,
            resultType: "GetMessageReply!",
            inputFields: ["conversationId", "messageId", "actAsPrincipalId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.events": GraphQLOperationDescriptor(
            key: "communication.events",
            plane: "communication",
            kind: .query,
            field: "events",
            operationName: "CommunicationEvents",
            document: """
            query CommunicationEvents($context: RequestContextInput!, $input: EventsRequestInput!) {
              events(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  items {
                    eventId
                    conversationId
                    sequence
                    type
                    occurredAt
                    subjectRef {
                      kind
                      id
                    }
                    payload {
                      messageId
                      revision
                      revisionSequence
                      principalId
                      membershipEpoch
                      visibilityEpoch
                      kind
                      throughSequence
                      callId
                      generation
                      state
                      cutoffEvidence
                      liveSessionId
                    }
                  }
                  complete
                  refreshRequired
                  nextCursor {
                    incarnation
                    conversationId
                    sequence
                  }
                }
              }
            }
            """,
            resultType: "EventsReply!",
            inputFields: ["conversationId", "limit", "after"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.receipts": GraphQLOperationDescriptor(
            key: "communication.receipts",
            plane: "communication",
            kind: .query,
            field: "receipts",
            operationName: "CommunicationReceipts",
            document: """
            query CommunicationReceipts($context: RequestContextInput!, $input: ReceiptsRequestInput!) {
              receipts(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  items {
                    principalId
                    membershipEpoch
                    visibilityEpoch
                    deliveredThroughSequence
                    readThroughSequence
                    updatedAt
                  }
                  complete
                  refreshRequired
                  nextCursor
                }
              }
            }
            """,
            resultType: "ReceiptsReply!",
            inputFields: ["conversationId", "limit", "cursor"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.inbox": GraphQLOperationDescriptor(
            key: "communication.inbox",
            plane: "communication",
            kind: .query,
            field: "inbox",
            operationName: "CommunicationInbox",
            document: """
            query CommunicationInbox($context: RequestContextInput!, $input: InboxRequestInput!) {
              inbox(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  items {
                    conversationId
                    title
                    activityAt
                    visibilityEpoch
                    latestVisibleMessage {
                      messageId
                      conversationId
                      authorId
                      sequence
                      revision
                      revisionSequence
                      createdAt
                      deleted
                      text
                      props
                      editedAt
                    }
                    hasUnread
                  }
                  complete
                  refreshRequired
                  nextCursor
                  partialReason
                }
              }
            }
            """,
            resultType: "InboxReply!",
            inputFields: ["limit", "cursor", "actAsPrincipalId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.search": GraphQLOperationDescriptor(
            key: "communication.search",
            plane: "communication",
            kind: .query,
            field: "search",
            operationName: "CommunicationSearch",
            document: """
            query CommunicationSearch($context: RequestContextInput!, $input: SearchRequestInput!) {
              search(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  items {
                    conversationId
                    message {
                      messageId
                      conversationId
                      authorId
                      sequence
                      revision
                      revisionSequence
                      createdAt
                      deleted
                      text
                      props
                      editedAt
                    }
                  }
                  complete
                  refreshRequired
                  nextCursor
                }
              }
            }
            """,
            resultType: "SearchReply!",
            inputFields: ["query", "pageSize", "scope", "cursor", "actAsPrincipalId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.resolveRequest": GraphQLOperationDescriptor(
            key: "communication.resolveRequest",
            plane: "communication",
            kind: .query,
            field: "resolveRequest",
            operationName: "CommunicationResolveRequest",
            document: """
            query CommunicationResolveRequest($context: RequestContextInput!, $input: ResolveRequestRequestInput!) {
              resolveRequest(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  state
                  requestId
                  checkedAt
                  resultWithheld
                  receipt {
                    status
                    requestId
                    serverTime
                    receiptId
                    committedAt
                    replayed
                    operation {
                      operationId
                      owner
                      href
                      state
                    }
                    resourceRef {
                      kind
                      id
                    }
                    result {
                      agentGrant {
                        grantId
                        orgId
                        signupId
                        agentActorId
                        projectId
                        scopes
                        expiresAt
                        revokedAt
                        createdAt
                        keys {
                          operationId
                          state
                          scopes
                          expiresAt
                          keyId
                          deliveryId
                          deliveryExpiresAt
                        }
                      }
                      agentSignupStatus {
                        signupId
                        state
                        orgId
                        deploymentId
                        projectId
                        nextStep
                        scopes
                        grantExpiresAt
                        keys {
                          operationId
                          state
                          scopes
                          expiresAt
                          keyId
                          deliveryId
                          deliveryExpiresAt
                        }
                        incarnation
                        servingEpoch
                      }
                      billingCheckoutSession {
                        orgId
                        planId
                        url
                        expiresAt
                      }
                      billingPortalSession {
                        orgId
                        url
                        expiresAt
                      }
                      broadcastPermissionChanged {
                        member {
                          conversationId
                          principalId
                          role
                          status
                          membershipEpoch
                          visibilityEpoch
                          revision
                          visibleFromSequence
                          canStartBroadcast
                        }
                        mediaCutoff {
                          state
                          scope {
                            kind
                            liveSessionId
                            generation
                            participationId
                          }
                          evidence
                          enforcedAt
                          operationId
                        }
                      }
                      conversation {
                        conversationId
                        revision
                        title
                        props
                        latestSequence
                        membership {
                          conversationId
                          principalId
                          role
                          status
                          membershipEpoch
                          visibilityEpoch
                          revision
                          visibleFromSequence
                          canStartBroadcast
                        }
                      }
                      conversationMemberBatch {
                        items {
                          conversationId
                          principalId
                          role
                          status
                          membershipEpoch
                          visibilityEpoch
                          revision
                          visibleFromSequence
                          canStartBroadcast
                        }
                      }
                      conversationMute {
                        conversationId
                        principalId
                        muted
                        until
                      }
                      credentialDeliveryReceipt {
                        deliveryId
                      }
                      deliveryAck {
                        deliveryId
                        acknowledged
                      }
                      liveAlertBatch {
                        liveSessionId
                        created
                        suppressed
                      }
                      liveCredentialIssuance {
                        liveSessionId
                        participationId
                        generation
                        leaseId
                        grantOrdinal
                        admissionExpiresAt
                        leaseExpiresAt
                      }
                      liveSessionEndRequested {
                        liveSessionId
                        operationId
                        mediaCutoff {
                          state
                          scope {
                            kind
                            liveSessionId
                            generation
                            participationId
                          }
                          evidence
                          enforcedAt
                          operationId
                        }
                      }
                      liveSessionJoined {
                        liveSessionId
                        generation
                        participation {
                          participationId
                          principalId
                          membershipEpoch
                          role
                          state
                          permissions {
                            microphone
                            camera
                            subscribe
                          }
                          reservationExpiresAt
                          nativeConnectionId
                          mediaCutoff {
                            state
                            scope {
                              kind
                              liveSessionId
                              generation
                              participationId
                            }
                            evidence
                            enforcedAt
                            operationId
                          }
                        }
                      }
                      liveSessionLeft {
                        liveSessionId
                        participationId
                        mediaCutoff {
                          state
                          scope {
                            kind
                            liveSessionId
                            generation
                            participationId
                          }
                          evidence
                          enforcedAt
                          operationId
                        }
                      }
                      liveSessionStarted {
                        liveSessionId
                        conversationId
                        kind
                        mediaProfile
                        operationId
                      }
                      member {
                        conversationId
                        principalId
                        role
                        status
                        membershipEpoch
                        visibilityEpoch
                        revision
                        visibleFromSequence
                        canStartBroadcast
                      }
                      message {
                        messageId
                        conversationId
                        authorId
                        sequence
                        revision
                        revisionSequence
                        createdAt
                        deleted
                        text
                        props
                        editedAt
                      }
                      messageAck {
                        messageId
                        conversationId
                        sequence
                        revision
                        status
                        cursor {
                          incarnation
                          conversationId
                          sequence
                        }
                      }
                      organization {
                        orgId
                        name
                        status
                        revision
                      }
                      organizationSpend {
                        orgId
                        planId
                        currency
                        catalogVersion
                        monthlySpendCap
                        agentPurchaseLimit
                        updatedAt
                        monthlyMinimum
                        periodStart
                        periodEnd
                        credits
                        charges
                        margin
                        stop
                        refusedMeters
                        evaluatedAt
                        usageThrough
                        validUntil
                        minimumCredit
                        chargeLimit
                      }
                      principal {
                        principalId
                        externalUserId
                        status
                        revision
                      }
                      readReceipt {
                        principalId
                        membershipEpoch
                        visibilityEpoch
                        deliveredThroughSequence
                        readThroughSequence
                        updatedAt
                      }
                      sessionBootstrap {
                        session {
                          sessionId
                          principalId
                          deviceId
                          incarnation
                          sessionRevision
                          expiresAt
                          status
                        }
                        tokenExpiresAt
                        sessionToken
                      }
                      sessionRevocation {
                        sessionId
                        status
                        mediaCutoff {
                          state
                          scope {
                            kind
                            principalId
                            sessionId
                            deviceId
                            callId
                          }
                        }
                      }
                      signedProof
                    }
                  }
                }
              }
            }
            """,
            resultType: "ResolveRequestReply!",
            inputFields: ["requestId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.getOperation": GraphQLOperationDescriptor(
            key: "communication.getOperation",
            plane: "communication",
            kind: .query,
            field: "getOperation",
            operationName: "CommunicationGetOperation",
            document: """
            query CommunicationGetOperation($context: RequestContextInput!, $input: GetOperationRequestInput!) {
              getOperation(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  operationId
                  kind
                  targetRef {
                    kind
                    id
                  }
                  state
                  revision
                  requestedAt
                  updatedAt
                  steps {
                    stepId
                    state
                  }
                  result {
                    projectId
                    incarnation
                    status
                    backend
                    environment
                    policyRevision
                    expiresAt
                    kind
                    resourceRef {
                      kind
                      id
                    }
                    delivery {
                      deliveryId
                      kind
                      projectId
                      installationId
                      resourceRef {
                        kind
                        id
                      }
                      expiresAt
                      payloadDigest
                      recipientActorRef {
                        tenantId
                        objectId
                      }
                    }
                    keyId
                    endpointId
                    enabled
                    liveSessionCompletion {
                      liveSessionId
                      generation
                      state
                      revision
                      completedAt
                      mediaCutoff {
                        state
                        scope {
                          kind
                          liveSessionId
                          generation
                          participationId
                        }
                        evidence
                        enforcedAt
                        operationId
                      }
                    }
                    replayedDeliveries
                    skippedDeliveries
                    messagePreview
                  }
                  blockedReason
                }
              }
            }
            """,
            resultType: "GetOperationReply!",
            inputFields: ["operationId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.conversationMute": GraphQLOperationDescriptor(
            key: "communication.conversationMute",
            plane: "communication",
            kind: .query,
            field: "conversationMute",
            operationName: "CommunicationConversationMute",
            document: """
            query CommunicationConversationMute($context: RequestContextInput!, $input: ConversationMuteInput!) {
              conversationMute(context: $context, input: $input) {
                status
                requestId
                serverTime
                result {
                  conversationId
                  principalId
                  muted
                  until
                }
              }
            }
            """,
            resultType: "ConversationMuteReply!",
            inputFields: ["conversationId", "actAsPrincipalId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.currentLiveSession": GraphQLOperationDescriptor(
            key: "communication.currentLiveSession",
            plane: "communication",
            kind: .query,
            field: "currentLiveSession",
            operationName: "CommunicationCurrentLiveSession",
            document: """
            query CommunicationCurrentLiveSession($context: RequestContextInput!, $input: ConversationLiveInput!) {
              currentLiveSession(context: $context, input: $input) {
                status
                requestId
                serverTime
                result {
                  liveSessionId
                  conversationId
                  creatorId
                  kind
                  mediaProfile
                  state
                  generation
                  revision
                  createdAt
                  expiresAt
                  myParticipation {
                    participationId
                    principalId
                    membershipEpoch
                    role
                    state
                    permissions {
                      microphone
                      camera
                      subscribe
                    }
                    reservationExpiresAt
                    nativeConnectionId
                    mediaCutoff {
                      state
                      scope {
                        kind
                        liveSessionId
                        generation
                        participationId
                      }
                      evidence
                      enforcedAt
                      operationId
                    }
                  }
                  mediaCutoff {
                    state
                    scope {
                      kind
                      liveSessionId
                      generation
                      participationId
                    }
                    evidence
                    enforcedAt
                    operationId
                  }
                }
              }
            }
            """,
            resultType: "CurrentLiveSessionReply!",
            inputFields: ["conversationId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.liveSession": GraphQLOperationDescriptor(
            key: "communication.liveSession",
            plane: "communication",
            kind: .query,
            field: "liveSession",
            operationName: "CommunicationLiveSession",
            document: """
            query CommunicationLiveSession($context: RequestContextInput!, $input: LiveSessionInput!) {
              liveSession(context: $context, input: $input) {
                status
                requestId
                serverTime
                result {
                  liveSessionId
                  conversationId
                  creatorId
                  kind
                  mediaProfile
                  state
                  generation
                  revision
                  createdAt
                  expiresAt
                  myParticipation {
                    participationId
                    principalId
                    membershipEpoch
                    role
                    state
                    permissions {
                      microphone
                      camera
                      subscribe
                    }
                    reservationExpiresAt
                    nativeConnectionId
                    mediaCutoff {
                      state
                      scope {
                        kind
                        liveSessionId
                        generation
                        participationId
                      }
                      evidence
                      enforcedAt
                      operationId
                    }
                  }
                  mediaCutoff {
                    state
                    scope {
                      kind
                      liveSessionId
                      generation
                      participationId
                    }
                    evidence
                    enforcedAt
                    operationId
                  }
                }
              }
            }
            """,
            resultType: "LiveSessionReply!",
            inputFields: ["liveSessionId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.liveSessions": GraphQLOperationDescriptor(
            key: "communication.liveSessions",
            plane: "communication",
            kind: .query,
            field: "liveSessions",
            operationName: "CommunicationLiveSessions",
            document: """
            query CommunicationLiveSessions($context: RequestContextInput!, $input: LiveSessionsInput!) {
              liveSessions(context: $context, input: $input) {
                status
                requestId
                serverTime
                result {
                  items {
                    liveSessionId
                    conversationId
                    creatorId
                    kind
                    mediaProfile
                    state
                    generation
                    revision
                    createdAt
                    expiresAt
                    myParticipation {
                      participationId
                      principalId
                      membershipEpoch
                      role
                      state
                      permissions {
                        microphone
                        camera
                        subscribe
                      }
                      reservationExpiresAt
                      nativeConnectionId
                      mediaCutoff {
                        state
                        scope {
                          kind
                          liveSessionId
                          generation
                          participationId
                        }
                        evidence
                        enforcedAt
                        operationId
                      }
                    }
                    mediaCutoff {
                      state
                      scope {
                        kind
                        liveSessionId
                        generation
                        participationId
                      }
                      evidence
                      enforcedAt
                      operationId
                    }
                  }
                  nextCursor
                  complete
                  partialReason
                  refreshRequired
                }
              }
            }
            """,
            resultType: "LiveSessionPageReply!",
            inputFields: ["conversationId", "limit", "cursor"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.liveSessionParticipants": GraphQLOperationDescriptor(
            key: "communication.liveSessionParticipants",
            plane: "communication",
            kind: .query,
            field: "liveSessionParticipants",
            operationName: "CommunicationLiveSessionParticipants",
            document: """
            query CommunicationLiveSessionParticipants($context: RequestContextInput!, $input: LiveParticipantsInput!) {
              liveSessionParticipants(context: $context, input: $input) {
                status
                requestId
                serverTime
                result {
                  items {
                    participationId
                    principalId
                    membershipEpoch
                    role
                    state
                    permissions {
                      microphone
                      camera
                      subscribe
                    }
                    reservationExpiresAt
                    nativeConnectionId
                    mediaCutoff {
                      state
                      scope {
                        kind
                        liveSessionId
                        generation
                        participationId
                      }
                      evidence
                      enforcedAt
                      operationId
                    }
                  }
                  nextCursor
                  complete
                  partialReason
                  refreshRequired
                }
              }
            }
            """,
            resultType: "LiveParticipantPageReply!",
            inputFields: ["liveSessionId", "limit", "cursor"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.liveSessionAlerts": GraphQLOperationDescriptor(
            key: "communication.liveSessionAlerts",
            plane: "communication",
            kind: .query,
            field: "liveSessionAlerts",
            operationName: "CommunicationLiveSessionAlerts",
            document: """
            query CommunicationLiveSessionAlerts($context: RequestContextInput!, $input: LiveAlertsInput!) {
              liveSessionAlerts(context: $context, input: $input) {
                status
                requestId
                serverTime
                result {
                  items {
                    alertId
                    liveSessionId
                    conversationId
                    generation
                    membershipEpoch
                    createdAt
                    expiresAt
                  }
                  nextCursor
                  complete
                  partialReason
                  refreshRequired
                }
              }
            }
            """,
            resultType: "LiveAlertPageReply!",
            inputFields: ["limit", "cursor"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.liveSessionOperation": GraphQLOperationDescriptor(
            key: "communication.liveSessionOperation",
            plane: "communication",
            kind: .query,
            field: "liveSessionOperation",
            operationName: "CommunicationLiveSessionOperation",
            document: """
            query CommunicationLiveSessionOperation($context: RequestContextInput!, $input: LiveSessionOperationInput!) {
              liveSessionOperation(context: $context, input: $input) {
                status
                requestId
                serverTime
                result {
                  operationId
                  requestId
                  liveSessionId
                  kind
                  state
                  revision
                  requestedAt
                  completedAt
                  completion {
                    liveSessionId
                    generation
                    state
                    revision
                    completedAt
                    mediaCutoff {
                      state
                      scope {
                        kind
                        liveSessionId
                        generation
                        participationId
                      }
                      evidence
                      enforcedAt
                      operationId
                    }
                  }
                  failure {
                    code
                    message
                  }
                }
              }
            }
            """,
            resultType: "LiveSessionOperationReply!",
            inputFields: ["operationId"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.revokeSession": GraphQLOperationDescriptor(
            key: "communication.revokeSession",
            plane: "communication",
            kind: .mutation,
            field: "revokeSession",
            operationName: "CommunicationRevokeSession",
            document: """
            mutation CommunicationRevokeSession($context: RequestContextInput!, $input: RevokeSessionRequestInput!) {
              revokeSession(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  sessionId
                  status
                  mediaCutoff {
                    state
                    scope {
                      kind
                      principalId
                      sessionId
                      deviceId
                      callId
                    }
                  }
                }
              }
            }
            """,
            resultType: "RevokeSessionReply!",
            inputFields: ["sessionId", "expectedRevision"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.updateConversation": GraphQLOperationDescriptor(
            key: "communication.updateConversation",
            plane: "communication",
            kind: .mutation,
            field: "updateConversation",
            operationName: "CommunicationUpdateConversation",
            document: """
            mutation CommunicationUpdateConversation($context: RequestContextInput!, $input: UpdateConversationRequestInput!) {
              updateConversation(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  conversationId
                  revision
                  title
                  props
                  latestSequence
                  membership {
                    conversationId
                    principalId
                    role
                    status
                    membershipEpoch
                    visibilityEpoch
                    revision
                    visibleFromSequence
                    canStartBroadcast
                  }
                }
              }
            }
            """,
            resultType: "UpdateConversationReply!",
            inputFields: ["conversationId", "expectedRevision", "title", "props"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.sendMessage": GraphQLOperationDescriptor(
            key: "communication.sendMessage",
            plane: "communication",
            kind: .mutation,
            field: "sendMessage",
            operationName: "CommunicationSendMessage",
            document: """
            mutation CommunicationSendMessage($context: RequestContextInput!, $input: SendMessageRequestInput!) {
              sendMessage(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  messageId
                  conversationId
                  sequence
                  revision
                  status
                  cursor {
                    incarnation
                    conversationId
                    sequence
                  }
                }
              }
            }
            """,
            resultType: "SendMessageReply!",
            inputFields: ["conversationId", "text", "props", "actAsPrincipalId"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.editMessage": GraphQLOperationDescriptor(
            key: "communication.editMessage",
            plane: "communication",
            kind: .mutation,
            field: "editMessage",
            operationName: "CommunicationEditMessage",
            document: """
            mutation CommunicationEditMessage($context: RequestContextInput!, $input: EditMessageRequestInput!) {
              editMessage(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  messageId
                  conversationId
                  authorId
                  sequence
                  revision
                  revisionSequence
                  createdAt
                  deleted
                  text
                  props
                  editedAt
                }
              }
            }
            """,
            resultType: "EditMessageReply!",
            inputFields: ["conversationId", "messageId", "expectedRevision", "text", "props"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.deleteMessage": GraphQLOperationDescriptor(
            key: "communication.deleteMessage",
            plane: "communication",
            kind: .mutation,
            field: "deleteMessage",
            operationName: "CommunicationDeleteMessage",
            document: """
            mutation CommunicationDeleteMessage($context: RequestContextInput!, $input: DeleteMessageRequestInput!) {
              deleteMessage(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  messageId
                  conversationId
                  authorId
                  sequence
                  revision
                  revisionSequence
                  createdAt
                  deleted
                  text
                  props
                  editedAt
                }
              }
            }
            """,
            resultType: "DeleteMessageReply!",
            inputFields: ["conversationId", "messageId", "expectedRevision"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.reportReceipt": GraphQLOperationDescriptor(
            key: "communication.reportReceipt",
            plane: "communication",
            kind: .mutation,
            field: "reportReceipt",
            operationName: "CommunicationReportReceipt",
            document: """
            mutation CommunicationReportReceipt($context: RequestContextInput!, $input: ReportReceiptRequestInput!) {
              reportReceipt(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  principalId
                  membershipEpoch
                  visibilityEpoch
                  deliveredThroughSequence
                  readThroughSequence
                  updatedAt
                }
              }
            }
            """,
            resultType: "ReportReceiptReply!",
            inputFields: ["conversationId", "kind", "membershipEpoch", "visibilityEpoch", "throughSequence"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.typing": GraphQLOperationDescriptor(
            key: "communication.typing",
            plane: "communication",
            kind: .mutation,
            field: "typing",
            operationName: "CommunicationTyping",
            document: """
            mutation CommunicationTyping($context: RequestContextInput!, $input: TypingRequestInput!) {
              typing(context: $context, input: $input) {
                status
                requestId
                serverTime
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                resourceRef {
                  kind
                  id
                }
                result {
                  accepted
                }
              }
            }
            """,
            resultType: "TypingReply!",
            inputFields: ["conversationId", "isTyping"],
            idempotency: .ephemeral,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.setConversationMute": GraphQLOperationDescriptor(
            key: "communication.setConversationMute",
            plane: "communication",
            kind: .mutation,
            field: "setConversationMute",
            operationName: "CommunicationSetConversationMute",
            document: """
            mutation CommunicationSetConversationMute($context: RequestContextInput!, $input: SetConversationMuteInput!) {
              setConversationMute(context: $context, input: $input) {
                status
                requestId
                receiptId
                committedAt
                replayed
                result {
                  conversationId
                  principalId
                  muted
                  until
                }
              }
            }
            """,
            resultType: "SetConversationMutePayload!",
            inputFields: ["conversationId", "muted", "until", "actAsPrincipalId"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.startLiveSession": GraphQLOperationDescriptor(
            key: "communication.startLiveSession",
            plane: "communication",
            kind: .mutation,
            field: "startLiveSession",
            operationName: "CommunicationStartLiveSession",
            document: """
            mutation CommunicationStartLiveSession($context: RequestContextInput!, $input: StartLiveSessionInput!) {
              startLiveSession(context: $context, input: $input) {
                status
                requestId
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                result {
                  liveSessionId
                  conversationId
                  kind
                  mediaProfile
                  operationId
                }
              }
            }
            """,
            resultType: "StartLiveSessionPayload!",
            inputFields: ["conversationId", "kind", "mediaProfile"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.joinLiveSession": GraphQLOperationDescriptor(
            key: "communication.joinLiveSession",
            plane: "communication",
            kind: .mutation,
            field: "joinLiveSession",
            operationName: "CommunicationJoinLiveSession",
            document: """
            mutation CommunicationJoinLiveSession($context: RequestContextInput!, $input: JoinLiveSessionInput!) {
              joinLiveSession(context: $context, input: $input) {
                status
                requestId
                receiptId
                committedAt
                replayed
                result {
                  liveSessionId
                  generation
                  participation {
                    participationId
                    principalId
                    membershipEpoch
                    role
                    state
                    permissions {
                      microphone
                      camera
                      subscribe
                    }
                    reservationExpiresAt
                    nativeConnectionId
                    mediaCutoff {
                      state
                      scope {
                        kind
                        liveSessionId
                        generation
                        participationId
                      }
                      evidence
                      enforcedAt
                      operationId
                    }
                  }
                }
              }
            }
            """,
            resultType: "JoinLiveSessionPayload!",
            inputFields: ["liveSessionId", "expectedGeneration"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.alertLiveSession": GraphQLOperationDescriptor(
            key: "communication.alertLiveSession",
            plane: "communication",
            kind: .mutation,
            field: "alertLiveSession",
            operationName: "CommunicationAlertLiveSession",
            document: """
            mutation CommunicationAlertLiveSession($context: RequestContextInput!, $input: AlertLiveSessionInput!) {
              alertLiveSession(context: $context, input: $input) {
                status
                requestId
                receiptId
                committedAt
                replayed
                result {
                  liveSessionId
                  created
                  suppressed
                }
              }
            }
            """,
            resultType: "AlertLiveSessionPayload!",
            inputFields: ["liveSessionId", "expectedGeneration", "principalIds"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.leaveLiveSession": GraphQLOperationDescriptor(
            key: "communication.leaveLiveSession",
            plane: "communication",
            kind: .mutation,
            field: "leaveLiveSession",
            operationName: "CommunicationLeaveLiveSession",
            document: """
            mutation CommunicationLeaveLiveSession($context: RequestContextInput!, $input: LeaveLiveSessionInput!) {
              leaveLiveSession(context: $context, input: $input) {
                status
                requestId
                receiptId
                committedAt
                replayed
                result {
                  liveSessionId
                  participationId
                  mediaCutoff {
                    state
                    scope {
                      kind
                      liveSessionId
                      generation
                      participationId
                    }
                    evidence
                    enforcedAt
                    operationId
                  }
                }
              }
            }
            """,
            resultType: "LeaveLiveSessionPayload!",
            inputFields: ["liveSessionId", "expectedGeneration", "participationId"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.endLiveSession": GraphQLOperationDescriptor(
            key: "communication.endLiveSession",
            plane: "communication",
            kind: .mutation,
            field: "endLiveSession",
            operationName: "CommunicationEndLiveSession",
            document: """
            mutation CommunicationEndLiveSession($context: RequestContextInput!, $input: EndLiveSessionInput!) {
              endLiveSession(context: $context, input: $input) {
                status
                requestId
                receiptId
                committedAt
                replayed
                operation {
                  operationId
                  owner
                  href
                  state
                }
                result {
                  liveSessionId
                  operationId
                  mediaCutoff {
                    state
                    scope {
                      kind
                      liveSessionId
                      generation
                      participationId
                    }
                    evidence
                    enforcedAt
                    operationId
                  }
                }
              }
            }
            """,
            resultType: "EndLiveSessionPayload!",
            inputFields: ["liveSessionId", "expectedGeneration", "expectedRevision"],
            idempotency: .idempotent,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.liveSessionCredentials": GraphQLOperationDescriptor(
            key: "communication.liveSessionCredentials",
            plane: "communication",
            kind: .mutation,
            field: "liveSessionCredentials",
            operationName: "CommunicationLiveSessionCredentials",
            document: """
            mutation CommunicationLiveSessionCredentials($context: RequestContextInput!, $input: LiveSessionCredentialsInput!) {
              liveSessionCredentials(context: $context, input: $input) {
                status
                requestId
                receiptId
                committedAt
                replayed
                result {
                  liveSessionId
                  participationId
                  generation
                  roomName
                  participantIdentity
                  livekitUrl
                  transportToken
                  admissionTicket
                  forwardingLease
                  transportExpiresAt
                  admissionExpiresAt
                  leaseExpiresAt
                  leasePolicyId
                  connectToken
                }
              }
            }
            """,
            resultType: "LiveSessionCredentialsPayload!",
            inputFields: ["liveSessionId", "participationId", "expectedGeneration", "mode", "replacementOfConnectionId"],
            idempotency: .singleUse,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
        "communication.conversationEvents": GraphQLOperationDescriptor(
            key: "communication.conversationEvents",
            plane: "communication",
            kind: .subscription,
            field: "conversationEvents",
            operationName: "CommunicationConversationEvents",
            document: """
            subscription CommunicationConversationEvents($context: RequestContextInput!, $input: EventsRequestInput!) {
              conversationEvents(context: $context, input: $input) {
                items {
                  eventId
                  conversationId
                  sequence
                  type
                  occurredAt
                  subjectRef {
                    kind
                    id
                  }
                  payload {
                    messageId
                    revision
                    revisionSequence
                    principalId
                    membershipEpoch
                    visibilityEpoch
                    kind
                    throughSequence
                    callId
                    generation
                    state
                    cutoffEvidence
                    liveSessionId
                  }
                }
                complete
                refreshRequired
                nextCursor {
                  incarnation
                  conversationId
                  sequence
                }
              }
            }
            """,
            resultType: "EventPage!",
            inputFields: ["conversationId", "limit", "after"],
            idempotency: .safe,
            context: [
                GraphQLContextField(name: "requestId", use: .required),
                GraphQLContextField(name: "projectId", use: .required),
                GraphQLContextField(name: "incarnation", use: .required),
                GraphQLContextField(name: "observedServingEpoch", use: .required),
                GraphQLContextField(name: "credentialDeliveryPermit", use: .forbidden),
            ]
        ),
    ]

    static let outputShapes: [String: GraphQLOutputShape] = [
        "ActorRef": .object([
            GraphQLOutputField(name: "tenantId", type: "String!"),
            GraphQLOutputField(name: "objectId", type: "String!"),
        ]),
        "AgentGrant": .object([
            GraphQLOutputField(name: "grantId", type: "UUID!"),
            GraphQLOutputField(name: "orgId", type: "UUID!"),
            GraphQLOutputField(name: "signupId", type: "UUID!"),
            GraphQLOutputField(name: "agentActorId", type: "UUID!"),
            GraphQLOutputField(name: "projectId", type: "UUID"),
            GraphQLOutputField(name: "scopes", type: "[String!]!"),
            GraphQLOutputField(name: "expiresAt", type: "String!"),
            GraphQLOutputField(name: "revokedAt", type: "String"),
            GraphQLOutputField(name: "createdAt", type: "String!"),
            GraphQLOutputField(name: "keys", type: "[AgentKey!]!"),
        ]),
        "AgentKey": .object([
            GraphQLOutputField(name: "operationId", type: "UUID!"),
            GraphQLOutputField(name: "state", type: "String!"),
            GraphQLOutputField(name: "scopes", type: "[String!]!"),
            GraphQLOutputField(name: "expiresAt", type: "String!"),
            GraphQLOutputField(name: "keyId", type: "String"),
            GraphQLOutputField(name: "deliveryId", type: "UUID"),
            GraphQLOutputField(name: "deliveryExpiresAt", type: "String"),
        ]),
        "AgentSignupStatus": .object([
            GraphQLOutputField(name: "signupId", type: "UUID!"),
            GraphQLOutputField(name: "state", type: "String!"),
            GraphQLOutputField(name: "orgId", type: "UUID"),
            GraphQLOutputField(name: "deploymentId", type: "UUID"),
            GraphQLOutputField(name: "projectId", type: "UUID"),
            GraphQLOutputField(name: "nextStep", type: "String"),
            GraphQLOutputField(name: "scopes", type: "[String!]!"),
            GraphQLOutputField(name: "grantExpiresAt", type: "String"),
            GraphQLOutputField(name: "keys", type: "[AgentKey!]!"),
            GraphQLOutputField(name: "incarnation", type: "UUID"),
            GraphQLOutputField(name: "servingEpoch", type: "Decimal"),
        ]),
        "AlertLiveSessionPayload": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "receiptId", type: "UUID!"),
            GraphQLOutputField(name: "committedAt", type: "String!"),
            GraphQLOutputField(name: "replayed", type: "Boolean!"),
            GraphQLOutputField(name: "result", type: "LiveAlertBatch!"),
        ]),
        "BillingCheckoutSession": .object([
            GraphQLOutputField(name: "orgId", type: "UUID!"),
            GraphQLOutputField(name: "planId", type: "String!"),
            GraphQLOutputField(name: "url", type: "String!"),
            GraphQLOutputField(name: "expiresAt", type: "String!"),
        ]),
        "BillingPortalSession": .object([
            GraphQLOutputField(name: "orgId", type: "UUID!"),
            GraphQLOutputField(name: "url", type: "String!"),
            GraphQLOutputField(name: "expiresAt", type: "String"),
        ]),
        "Boolean": .scalar(GraphQLScalarShape(representation: .boolean, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "BroadcastPermissionChanged": .object([
            GraphQLOutputField(name: "member", type: "Member!"),
            GraphQLOutputField(name: "mediaCutoff", type: "LiveMediaCutoff"),
        ]),
        "Capabilities": .object([
            GraphQLOutputField(name: "serverRelease", type: "String!"),
            GraphQLOutputField(name: "capabilityRevision", type: "Decimal!"),
            GraphQLOutputField(name: "limitsRevision", type: "Decimal!"),
            GraphQLOutputField(name: "features", type: "Features"),
            GraphQLOutputField(name: "limits", type: "[LimitEntry!]!"),
            GraphQLOutputField(name: "environment", type: "String!"),
            GraphQLOutputField(name: "productionQualified", type: "Boolean!"),
            GraphQLOutputField(name: "mediaPolicy", type: "MediaPolicy"),
            GraphQLOutputField(name: "geoControlAuthorityId", type: "String"),
            GraphQLOutputField(name: "offerings", type: "[String!]!"),
            GraphQLOutputField(name: "geos", type: "[String!]!"),
            GraphQLOutputField(name: "installationProfiles", type: "[String!]!"),
            GraphQLOutputField(name: "portalIdentity", type: "String"),
        ]),
        "CapabilitiesReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "Capabilities"),
        ]),
        "Conversation": .object([
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
            GraphQLOutputField(name: "title", type: "String!"),
            GraphQLOutputField(name: "props", type: "Properties"),
            GraphQLOutputField(name: "latestSequence", type: "Decimal!"),
            GraphQLOutputField(name: "membership", type: "Member"),
        ]),
        "ConversationMemberBatch": .object([
            GraphQLOutputField(name: "items", type: "[Member!]!"),
        ]),
        "ConversationMute": .object([
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "principalId", type: "UUID!"),
            GraphQLOutputField(name: "muted", type: "Boolean!"),
            GraphQLOutputField(name: "until", type: "String"),
        ]),
        "ConversationMuteReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String!"),
            GraphQLOutputField(name: "result", type: "ConversationMute!"),
        ]),
        "CredentialDelivery": .object([
            GraphQLOutputField(name: "deliveryId", type: "UUID!"),
            GraphQLOutputField(name: "kind", type: "String!"),
            GraphQLOutputField(name: "projectId", type: "UUID!"),
            GraphQLOutputField(name: "installationId", type: "String!"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "expiresAt", type: "String!"),
            GraphQLOutputField(name: "payloadDigest", type: "String!"),
            GraphQLOutputField(name: "recipientActorRef", type: "ActorRef"),
        ]),
        "CredentialDeliveryReceipt": .object([
            GraphQLOutputField(name: "deliveryId", type: "UUID!"),
        ]),
        "CurrentLiveSessionReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String!"),
            GraphQLOutputField(name: "result", type: "LiveSession"),
        ]),
        "CurrentSessionReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String!"),
            GraphQLOutputField(name: "result", type: "Session!"),
        ]),
        "Cursor": .object([
            GraphQLOutputField(name: "incarnation", type: "UUID!"),
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "sequence", type: "Decimal!"),
        ]),
        "CutoffScope": .object([
            GraphQLOutputField(name: "kind", type: "String!"),
            GraphQLOutputField(name: "principalId", type: "UUID"),
            GraphQLOutputField(name: "sessionId", type: "UUID"),
            GraphQLOutputField(name: "deviceId", type: "UUID"),
            GraphQLOutputField(name: "callId", type: "UUID"),
        ]),
        "Decimal": .scalar(GraphQLScalarShape(representation: .string, pattern: "^(0|[1-9][0-9]*)$", maximumDecimal: "9223372036854775807", disallowed: [])),
        "DeleteMessageReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "Message"),
        ]),
        "DeliveryAck": .object([
            GraphQLOutputField(name: "deliveryId", type: "UUID!"),
            GraphQLOutputField(name: "acknowledged", type: "Boolean!"),
        ]),
        "EditMessageReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "Message"),
        ]),
        "EndLiveSessionPayload": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "receiptId", type: "UUID!"),
            GraphQLOutputField(name: "committedAt", type: "String!"),
            GraphQLOutputField(name: "replayed", type: "Boolean!"),
            GraphQLOutputField(name: "operation", type: "OperationRef!"),
            GraphQLOutputField(name: "result", type: "LiveSessionEndRequested!"),
        ]),
        "Event": .object([
            GraphQLOutputField(name: "eventId", type: "UUID!"),
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "sequence", type: "Decimal!"),
            GraphQLOutputField(name: "type", type: "String!"),
            GraphQLOutputField(name: "occurredAt", type: "String!"),
            GraphQLOutputField(name: "subjectRef", type: "ResourceRef"),
            GraphQLOutputField(name: "payload", type: "EventPayload"),
        ]),
        "EventPage": .object([
            GraphQLOutputField(name: "items", type: "[Event!]!"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
            GraphQLOutputField(name: "nextCursor", type: "Cursor"),
        ]),
        "EventPayload": .object([
            GraphQLOutputField(name: "messageId", type: "UUID"),
            GraphQLOutputField(name: "revision", type: "Decimal"),
            GraphQLOutputField(name: "revisionSequence", type: "Decimal"),
            GraphQLOutputField(name: "principalId", type: "UUID"),
            GraphQLOutputField(name: "membershipEpoch", type: "Decimal"),
            GraphQLOutputField(name: "visibilityEpoch", type: "Decimal"),
            GraphQLOutputField(name: "kind", type: "String"),
            GraphQLOutputField(name: "throughSequence", type: "Decimal"),
            GraphQLOutputField(name: "callId", type: "UUID"),
            GraphQLOutputField(name: "generation", type: "Decimal"),
            GraphQLOutputField(name: "state", type: "String"),
            GraphQLOutputField(name: "cutoffEvidence", type: "String"),
            GraphQLOutputField(name: "liveSessionId", type: "UUID"),
        ]),
        "EventsReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "EventPage"),
        ]),
        "Features": .object([
            GraphQLOutputField(name: "chat", type: "Boolean!"),
            GraphQLOutputField(name: "inbox", type: "Boolean!"),
            GraphQLOutputField(name: "lexicalSearch", type: "Boolean!"),
            GraphQLOutputField(name: "typing", type: "Boolean!"),
            GraphQLOutputField(name: "webhooks", type: "Boolean!"),
            GraphQLOutputField(name: "liveSessions", type: "Boolean!"),
            GraphQLOutputField(name: "liveBroadcast", type: "Boolean!"),
        ]),
        "GetConversationReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "Conversation"),
        ]),
        "GetMessageReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "Message"),
        ]),
        "GetOperationReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "Operation"),
        ]),
        "InboxItem": .object([
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "title", type: "String!"),
            GraphQLOutputField(name: "activityAt", type: "String"),
            GraphQLOutputField(name: "visibilityEpoch", type: "Decimal!"),
            GraphQLOutputField(name: "latestVisibleMessage", type: "Message"),
            GraphQLOutputField(name: "hasUnread", type: "Boolean!"),
        ]),
        "InboxPage": .object([
            GraphQLOutputField(name: "items", type: "[InboxItem!]!"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
            GraphQLOutputField(name: "partialReason", type: "String"),
        ]),
        "InboxReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "InboxPage"),
        ]),
        "Int": .scalar(GraphQLScalarShape(representation: .integer, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "JoinLiveSessionPayload": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "receiptId", type: "UUID!"),
            GraphQLOutputField(name: "committedAt", type: "String!"),
            GraphQLOutputField(name: "replayed", type: "Boolean!"),
            GraphQLOutputField(name: "result", type: "LiveSessionJoined!"),
        ]),
        "LeaveLiveSessionPayload": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "receiptId", type: "UUID!"),
            GraphQLOutputField(name: "committedAt", type: "String!"),
            GraphQLOutputField(name: "replayed", type: "Boolean!"),
            GraphQLOutputField(name: "result", type: "LiveSessionLeft!"),
        ]),
        "Limit": .object([
            GraphQLOutputField(name: "maximum", type: "Decimal"),
            GraphQLOutputField(name: "unit", type: "String"),
            GraphQLOutputField(name: "scope", type: "String"),
            GraphQLOutputField(name: "milliseconds", type: "Decimal"),
            GraphQLOutputField(name: "policyId", type: "String"),
            GraphQLOutputField(name: "revision", type: "Decimal"),
        ]),
        "LimitEntry": .object([
            GraphQLOutputField(name: "key", type: "String!"),
            GraphQLOutputField(name: "value", type: "Limit!"),
        ]),
        "LiveAlert": .object([
            GraphQLOutputField(name: "alertId", type: "UUID!"),
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "generation", type: "Decimal!"),
            GraphQLOutputField(name: "membershipEpoch", type: "Decimal!"),
            GraphQLOutputField(name: "createdAt", type: "String!"),
            GraphQLOutputField(name: "expiresAt", type: "String!"),
        ]),
        "LiveAlertBatch": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "created", type: "Decimal!"),
            GraphQLOutputField(name: "suppressed", type: "Decimal!"),
        ]),
        "LiveAlertPage": .object([
            GraphQLOutputField(name: "items", type: "[LiveAlert!]!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "partialReason", type: "String"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
        ]),
        "LiveAlertPageReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String!"),
            GraphQLOutputField(name: "result", type: "LiveAlertPage!"),
        ]),
        "LiveConnectionGrant": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "participationId", type: "UUID!"),
            GraphQLOutputField(name: "generation", type: "Decimal!"),
            GraphQLOutputField(name: "roomName", type: "String!"),
            GraphQLOutputField(name: "participantIdentity", type: "String!"),
            GraphQLOutputField(name: "livekitUrl", type: "String!"),
            GraphQLOutputField(name: "transportToken", type: "String!"),
            GraphQLOutputField(name: "admissionTicket", type: "SignedProof!"),
            GraphQLOutputField(name: "forwardingLease", type: "SignedProof!"),
            GraphQLOutputField(name: "transportExpiresAt", type: "String!"),
            GraphQLOutputField(name: "admissionExpiresAt", type: "String!"),
            GraphQLOutputField(name: "leaseExpiresAt", type: "String!"),
            GraphQLOutputField(name: "leasePolicyId", type: "String!"),
            GraphQLOutputField(name: "connectToken", type: "String!"),
        ]),
        "LiveCredentialIssuance": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "participationId", type: "UUID!"),
            GraphQLOutputField(name: "generation", type: "Decimal!"),
            GraphQLOutputField(name: "leaseId", type: "UUID!"),
            GraphQLOutputField(name: "grantOrdinal", type: "Decimal!"),
            GraphQLOutputField(name: "admissionExpiresAt", type: "String!"),
            GraphQLOutputField(name: "leaseExpiresAt", type: "String!"),
        ]),
        "LiveCutoffEvidence": .enumeration(["NATIVE_FENCE", "MONOTONIC_BOOT_RETIREMENT", "NO_GRANTS_ISSUED"]),
        "LiveCutoffScope": .object([
            GraphQLOutputField(name: "kind", type: "LiveCutoffScopeKind!"),
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "generation", type: "Decimal!"),
            GraphQLOutputField(name: "participationId", type: "UUID"),
        ]),
        "LiveCutoffScopeKind": .enumeration(["PARTICIPATION", "GENERATION"]),
        "LiveCutoffState": .enumeration(["PENDING", "ENFORCED", "UNKNOWN"]),
        "LiveErrorCode": .enumeration(["LIVE_SESSION_EXISTS", "LIVE_SESSION_CLOSED", "LIVE_SESSION_INTERRUPTED", "LIVE_SESSION_CAPACITY", "LIVE_ALERT_LIMIT", "JOINED_ELSEWHERE", "PARTICIPATION_DRAINING", "PARTICIPATION_MISMATCH", "GENERATION_CONFLICT", "MEDIA_NOT_READY", "CREDENTIAL_REFRESH_REQUIRED", "LIVE_START_CANCELLED", "LIVE_PREPARATION_FAILED"]),
        "LiveMediaCutoff": .object([
            GraphQLOutputField(name: "state", type: "LiveCutoffState!"),
            GraphQLOutputField(name: "scope", type: "LiveCutoffScope!"),
            GraphQLOutputField(name: "evidence", type: "LiveCutoffEvidence"),
            GraphQLOutputField(name: "enforcedAt", type: "String"),
            GraphQLOutputField(name: "operationId", type: "UUID"),
        ]),
        "LiveMediaPermissions": .object([
            GraphQLOutputField(name: "microphone", type: "Boolean!"),
            GraphQLOutputField(name: "camera", type: "Boolean!"),
            GraphQLOutputField(name: "subscribe", type: "Boolean!"),
        ]),
        "LiveMediaProfile": .enumeration(["AUDIO_ONLY", "AUDIO_VIDEO"]),
        "LiveOperationFailure": .object([
            GraphQLOutputField(name: "code", type: "LiveErrorCode!"),
            GraphQLOutputField(name: "message", type: "String!"),
        ]),
        "LiveOperationKind": .enumeration(["START", "END"]),
        "LiveOperationState": .enumeration(["RUNNING", "COMPLETED", "FAILED"]),
        "LiveParticipantPage": .object([
            GraphQLOutputField(name: "items", type: "[LiveParticipation!]!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "partialReason", type: "String"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
        ]),
        "LiveParticipantPageReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String!"),
            GraphQLOutputField(name: "result", type: "LiveParticipantPage!"),
        ]),
        "LiveParticipation": .object([
            GraphQLOutputField(name: "participationId", type: "UUID!"),
            GraphQLOutputField(name: "principalId", type: "UUID!"),
            GraphQLOutputField(name: "membershipEpoch", type: "Decimal!"),
            GraphQLOutputField(name: "role", type: "LiveRole!"),
            GraphQLOutputField(name: "state", type: "LiveParticipationState!"),
            GraphQLOutputField(name: "permissions", type: "LiveMediaPermissions!"),
            GraphQLOutputField(name: "reservationExpiresAt", type: "String"),
            GraphQLOutputField(name: "nativeConnectionId", type: "UUID"),
            GraphQLOutputField(name: "mediaCutoff", type: "LiveMediaCutoff"),
        ]),
        "LiveParticipationState": .enumeration(["JOINED", "CONNECTING", "CONNECTED", "DISCONNECTED", "LEAVING", "LEFT"]),
        "LiveRole": .enumeration(["PUBLISHER", "VIEWER"]),
        "LiveSession": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "creatorId", type: "UUID!"),
            GraphQLOutputField(name: "kind", type: "LiveSessionKind!"),
            GraphQLOutputField(name: "mediaProfile", type: "LiveMediaProfile!"),
            GraphQLOutputField(name: "state", type: "LiveSessionState!"),
            GraphQLOutputField(name: "generation", type: "Decimal!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
            GraphQLOutputField(name: "createdAt", type: "String!"),
            GraphQLOutputField(name: "expiresAt", type: "String!"),
            GraphQLOutputField(name: "myParticipation", type: "LiveParticipation"),
            GraphQLOutputField(name: "mediaCutoff", type: "LiveMediaCutoff"),
        ]),
        "LiveSessionCredentialsPayload": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "receiptId", type: "UUID!"),
            GraphQLOutputField(name: "committedAt", type: "String!"),
            GraphQLOutputField(name: "replayed", type: "Boolean!"),
            GraphQLOutputField(name: "result", type: "LiveConnectionGrant!"),
        ]),
        "LiveSessionEndRequested": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "operationId", type: "UUID!"),
            GraphQLOutputField(name: "mediaCutoff", type: "LiveMediaCutoff!"),
        ]),
        "LiveSessionJoined": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "generation", type: "Decimal!"),
            GraphQLOutputField(name: "participation", type: "LiveParticipation!"),
        ]),
        "LiveSessionKind": .enumeration(["INTERACTIVE", "BROADCAST"]),
        "LiveSessionLeft": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "participationId", type: "UUID!"),
            GraphQLOutputField(name: "mediaCutoff", type: "LiveMediaCutoff!"),
        ]),
        "LiveSessionOperation": .object([
            GraphQLOutputField(name: "operationId", type: "UUID!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "kind", type: "LiveOperationKind!"),
            GraphQLOutputField(name: "state", type: "LiveOperationState!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
            GraphQLOutputField(name: "requestedAt", type: "String!"),
            GraphQLOutputField(name: "completedAt", type: "String"),
            GraphQLOutputField(name: "completion", type: "LiveSessionOperationCompletion"),
            GraphQLOutputField(name: "failure", type: "LiveOperationFailure"),
        ]),
        "LiveSessionOperationCompletion": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "generation", type: "Decimal!"),
            GraphQLOutputField(name: "state", type: "LiveSessionState!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
            GraphQLOutputField(name: "completedAt", type: "String!"),
            GraphQLOutputField(name: "mediaCutoff", type: "LiveMediaCutoff"),
        ]),
        "LiveSessionOperationReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String!"),
            GraphQLOutputField(name: "result", type: "LiveSessionOperation!"),
        ]),
        "LiveSessionPage": .object([
            GraphQLOutputField(name: "items", type: "[LiveSession!]!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "partialReason", type: "String"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
        ]),
        "LiveSessionPageReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String!"),
            GraphQLOutputField(name: "result", type: "LiveSessionPage!"),
        ]),
        "LiveSessionReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String!"),
            GraphQLOutputField(name: "result", type: "LiveSession!"),
        ]),
        "LiveSessionStarted": .object([
            GraphQLOutputField(name: "liveSessionId", type: "UUID!"),
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "kind", type: "LiveSessionKind!"),
            GraphQLOutputField(name: "mediaProfile", type: "LiveMediaProfile!"),
            GraphQLOutputField(name: "operationId", type: "UUID!"),
        ]),
        "LiveSessionState": .enumeration(["PREPARING", "READY", "ACTIVE", "DRAINING", "ENDED", "FAILED"]),
        "MediaCutoff": .object([
            GraphQLOutputField(name: "state", type: "String!"),
            GraphQLOutputField(name: "scope", type: "CutoffScope"),
        ]),
        "MediaPolicy": .object([
            GraphQLOutputField(name: "leasePolicyId", type: "String!"),
            GraphQLOutputField(name: "maxLeaseMs", type: "Decimal!"),
            GraphQLOutputField(name: "renewAttemptMs", type: "Decimal!"),
            GraphQLOutputField(name: "preludeMaxBytes", type: "String!"),
            GraphQLOutputField(name: "preludeTimeoutMs", type: "String!"),
            GraphQLOutputField(name: "clockProfileId", type: "String!"),
        ]),
        "Member": .object([
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "principalId", type: "UUID!"),
            GraphQLOutputField(name: "role", type: "String!"),
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "membershipEpoch", type: "Decimal!"),
            GraphQLOutputField(name: "visibilityEpoch", type: "Decimal!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
            GraphQLOutputField(name: "visibleFromSequence", type: "Decimal!"),
            GraphQLOutputField(name: "canStartBroadcast", type: "Boolean!"),
        ]),
        "MemberPage": .object([
            GraphQLOutputField(name: "items", type: "[Member!]!"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
        ]),
        "MembersReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "MemberPage"),
        ]),
        "Message": .object([
            GraphQLOutputField(name: "messageId", type: "UUID!"),
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "authorId", type: "String!"),
            GraphQLOutputField(name: "sequence", type: "Decimal!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
            GraphQLOutputField(name: "revisionSequence", type: "Decimal!"),
            GraphQLOutputField(name: "createdAt", type: "String!"),
            GraphQLOutputField(name: "deleted", type: "Boolean!"),
            GraphQLOutputField(name: "text", type: "String"),
            GraphQLOutputField(name: "props", type: "Properties"),
            GraphQLOutputField(name: "editedAt", type: "String"),
        ]),
        "MessageAck": .object([
            GraphQLOutputField(name: "messageId", type: "UUID!"),
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "sequence", type: "Decimal!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "cursor", type: "Cursor"),
        ]),
        "MessagePage": .object([
            GraphQLOutputField(name: "items", type: "[Message!]!"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
        ]),
        "MessagesReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "MessagePage"),
        ]),
        "Operation": .object([
            GraphQLOutputField(name: "operationId", type: "UUID!"),
            GraphQLOutputField(name: "kind", type: "String!"),
            GraphQLOutputField(name: "targetRef", type: "ResourceRef"),
            GraphQLOutputField(name: "state", type: "String!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
            GraphQLOutputField(name: "requestedAt", type: "String!"),
            GraphQLOutputField(name: "updatedAt", type: "String!"),
            GraphQLOutputField(name: "steps", type: "[OperationStep!]!"),
            GraphQLOutputField(name: "result", type: "OperationResult"),
            GraphQLOutputField(name: "blockedReason", type: "String"),
        ]),
        "OperationRef": .object([
            GraphQLOutputField(name: "operationId", type: "UUID!"),
            GraphQLOutputField(name: "owner", type: "String!"),
            GraphQLOutputField(name: "href", type: "String!"),
            GraphQLOutputField(name: "state", type: "String!"),
        ]),
        "OperationResult": .object([
            GraphQLOutputField(name: "projectId", type: "UUID"),
            GraphQLOutputField(name: "incarnation", type: "UUID"),
            GraphQLOutputField(name: "status", type: "String"),
            GraphQLOutputField(name: "backend", type: "String"),
            GraphQLOutputField(name: "environment", type: "String"),
            GraphQLOutputField(name: "policyRevision", type: "Decimal"),
            GraphQLOutputField(name: "expiresAt", type: "String"),
            GraphQLOutputField(name: "kind", type: "String"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "delivery", type: "CredentialDelivery"),
            GraphQLOutputField(name: "keyId", type: "String"),
            GraphQLOutputField(name: "endpointId", type: "UUID"),
            GraphQLOutputField(name: "enabled", type: "Boolean"),
            GraphQLOutputField(name: "liveSessionCompletion", type: "LiveSessionOperationCompletion"),
            GraphQLOutputField(name: "replayedDeliveries", type: "Int"),
            GraphQLOutputField(name: "skippedDeliveries", type: "Int"),
            GraphQLOutputField(name: "messagePreview", type: "Boolean"),
        ]),
        "OperationStep": .object([
            GraphQLOutputField(name: "stepId", type: "String!"),
            GraphQLOutputField(name: "state", type: "String!"),
        ]),
        "Organization": .object([
            GraphQLOutputField(name: "orgId", type: "UUID!"),
            GraphQLOutputField(name: "name", type: "String!"),
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
        ]),
        "OrganizationSpend": .object([
            GraphQLOutputField(name: "orgId", type: "UUID!"),
            GraphQLOutputField(name: "planId", type: "String!"),
            GraphQLOutputField(name: "currency", type: "String!"),
            GraphQLOutputField(name: "catalogVersion", type: "String!"),
            GraphQLOutputField(name: "monthlySpendCap", type: "String"),
            GraphQLOutputField(name: "agentPurchaseLimit", type: "String"),
            GraphQLOutputField(name: "updatedAt", type: "String"),
            GraphQLOutputField(name: "monthlyMinimum", type: "String"),
            GraphQLOutputField(name: "periodStart", type: "String"),
            GraphQLOutputField(name: "periodEnd", type: "String"),
            GraphQLOutputField(name: "credits", type: "String"),
            GraphQLOutputField(name: "charges", type: "String"),
            GraphQLOutputField(name: "margin", type: "String"),
            GraphQLOutputField(name: "stop", type: "String"),
            GraphQLOutputField(name: "refusedMeters", type: "[String!]!"),
            GraphQLOutputField(name: "evaluatedAt", type: "String"),
            GraphQLOutputField(name: "usageThrough", type: "String"),
            GraphQLOutputField(name: "validUntil", type: "String"),
            GraphQLOutputField(name: "minimumCredit", type: "String"),
            GraphQLOutputField(name: "chargeLimit", type: "String"),
        ]),
        "Principal": .object([
            GraphQLOutputField(name: "principalId", type: "UUID!"),
            GraphQLOutputField(name: "externalUserId", type: "String!"),
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "revision", type: "Decimal!"),
        ]),
        "Properties": .scalar(GraphQLScalarShape(representation: .object, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "ReadReceipt": .object([
            GraphQLOutputField(name: "principalId", type: "UUID!"),
            GraphQLOutputField(name: "membershipEpoch", type: "Decimal!"),
            GraphQLOutputField(name: "visibilityEpoch", type: "Decimal!"),
            GraphQLOutputField(name: "deliveredThroughSequence", type: "Decimal"),
            GraphQLOutputField(name: "readThroughSequence", type: "Decimal"),
            GraphQLOutputField(name: "updatedAt", type: "String"),
        ]),
        "ReceiptPage": .object([
            GraphQLOutputField(name: "items", type: "[ReadReceipt!]!"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
        ]),
        "ReceiptsReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "ReceiptPage"),
        ]),
        "ReportReceiptReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "ReadReceipt"),
        ]),
        "RequestResolution": .object([
            GraphQLOutputField(name: "state", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "checkedAt", type: "String!"),
            GraphQLOutputField(name: "resultWithheld", type: "Boolean!"),
            GraphQLOutputField(name: "receipt", type: "ResolvedReceipt"),
        ]),
        "ResolveRequestReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "RequestResolution"),
        ]),
        "ResolvedReceipt": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "RetainedResult"),
        ]),
        "ResourceRef": .object([
            GraphQLOutputField(name: "kind", type: "String!"),
            GraphQLOutputField(name: "id", type: "String!"),
        ]),
        "RetainedResult": .object([
            GraphQLOutputField(name: "agentGrant", type: "AgentGrant"),
            GraphQLOutputField(name: "agentSignupStatus", type: "AgentSignupStatus"),
            GraphQLOutputField(name: "billingCheckoutSession", type: "BillingCheckoutSession"),
            GraphQLOutputField(name: "billingPortalSession", type: "BillingPortalSession"),
            GraphQLOutputField(name: "broadcastPermissionChanged", type: "BroadcastPermissionChanged"),
            GraphQLOutputField(name: "conversation", type: "Conversation"),
            GraphQLOutputField(name: "conversationMemberBatch", type: "ConversationMemberBatch"),
            GraphQLOutputField(name: "conversationMute", type: "ConversationMute"),
            GraphQLOutputField(name: "credentialDeliveryReceipt", type: "CredentialDeliveryReceipt"),
            GraphQLOutputField(name: "deliveryAck", type: "DeliveryAck"),
            GraphQLOutputField(name: "liveAlertBatch", type: "LiveAlertBatch"),
            GraphQLOutputField(name: "liveCredentialIssuance", type: "LiveCredentialIssuance"),
            GraphQLOutputField(name: "liveSessionEndRequested", type: "LiveSessionEndRequested"),
            GraphQLOutputField(name: "liveSessionJoined", type: "LiveSessionJoined"),
            GraphQLOutputField(name: "liveSessionLeft", type: "LiveSessionLeft"),
            GraphQLOutputField(name: "liveSessionStarted", type: "LiveSessionStarted"),
            GraphQLOutputField(name: "member", type: "Member"),
            GraphQLOutputField(name: "message", type: "Message"),
            GraphQLOutputField(name: "messageAck", type: "MessageAck"),
            GraphQLOutputField(name: "organization", type: "Organization"),
            GraphQLOutputField(name: "organizationSpend", type: "OrganizationSpend"),
            GraphQLOutputField(name: "principal", type: "Principal"),
            GraphQLOutputField(name: "readReceipt", type: "ReadReceipt"),
            GraphQLOutputField(name: "sessionBootstrap", type: "SessionBootstrap"),
            GraphQLOutputField(name: "sessionRevocation", type: "SessionRevocation"),
            GraphQLOutputField(name: "signedProof", type: "SignedProof"),
        ]),
        "RevokeSessionReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "SessionRevocation"),
        ]),
        "RouteReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "SignedProof"),
        ]),
        "SearchHit": .object([
            GraphQLOutputField(name: "conversationId", type: "UUID!"),
            GraphQLOutputField(name: "message", type: "Message"),
        ]),
        "SearchPage": .object([
            GraphQLOutputField(name: "items", type: "[SearchHit!]!"),
            GraphQLOutputField(name: "complete", type: "Boolean!"),
            GraphQLOutputField(name: "refreshRequired", type: "Boolean!"),
            GraphQLOutputField(name: "nextCursor", type: "String"),
        ]),
        "SearchReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "SearchPage"),
        ]),
        "SendMessageReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "MessageAck"),
        ]),
        "Session": .object([
            GraphQLOutputField(name: "sessionId", type: "UUID!"),
            GraphQLOutputField(name: "principalId", type: "UUID!"),
            GraphQLOutputField(name: "deviceId", type: "UUID!"),
            GraphQLOutputField(name: "incarnation", type: "UUID!"),
            GraphQLOutputField(name: "sessionRevision", type: "Decimal!"),
            GraphQLOutputField(name: "expiresAt", type: "String!"),
            GraphQLOutputField(name: "status", type: "String!"),
        ]),
        "SessionBootstrap": .object([
            GraphQLOutputField(name: "session", type: "Session"),
            GraphQLOutputField(name: "tokenExpiresAt", type: "String!"),
            GraphQLOutputField(name: "sessionToken", type: "String!"),
        ]),
        "SessionRevocation": .object([
            GraphQLOutputField(name: "sessionId", type: "UUID!"),
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "mediaCutoff", type: "MediaCutoff"),
        ]),
        "SetConversationMutePayload": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "receiptId", type: "UUID!"),
            GraphQLOutputField(name: "committedAt", type: "String!"),
            GraphQLOutputField(name: "replayed", type: "Boolean!"),
            GraphQLOutputField(name: "result", type: "ConversationMute!"),
        ]),
        "SignedProof": .scalar(GraphQLScalarShape(representation: .object, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "StartLiveSessionPayload": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "receiptId", type: "UUID!"),
            GraphQLOutputField(name: "committedAt", type: "String!"),
            GraphQLOutputField(name: "replayed", type: "Boolean!"),
            GraphQLOutputField(name: "operation", type: "OperationRef!"),
            GraphQLOutputField(name: "result", type: "LiveSessionStarted!"),
        ]),
        "String": .scalar(GraphQLScalarShape(representation: .string, pattern: nil, maximumDecimal: nil, disallowed: [])),
        "TypingReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "TypingStatus"),
        ]),
        "TypingStatus": .object([
            GraphQLOutputField(name: "accepted", type: "Boolean!"),
        ]),
        "UUID": .scalar(GraphQLScalarShape(representation: .string, pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", maximumDecimal: nil, disallowed: ["00000000-0000-0000-0000-000000000000"])),
        "UpdateConversationReply": .object([
            GraphQLOutputField(name: "status", type: "String!"),
            GraphQLOutputField(name: "requestId", type: "UUID!"),
            GraphQLOutputField(name: "serverTime", type: "String"),
            GraphQLOutputField(name: "receiptId", type: "UUID"),
            GraphQLOutputField(name: "committedAt", type: "String"),
            GraphQLOutputField(name: "replayed", type: "Boolean"),
            GraphQLOutputField(name: "operation", type: "OperationRef"),
            GraphQLOutputField(name: "resourceRef", type: "ResourceRef"),
            GraphQLOutputField(name: "result", type: "Conversation"),
        ]),
    ]
}

/// HTTP and WebSocket transport constants.
enum GraphQLTransport {
    static let path = "/graphql"
    static let webSocketSubprotocol = "graphql-transport-ws"
    static let maxDocumentBytes = 32768
}

/// A ConvoHop error code. Codes that this list doesn't name can still arrive, so handle unknown codes.
public struct ConvoHopErrorCode: RawRepresentable, Hashable, Sendable {
    public let rawValue: String

    public init(rawValue: String) {
        self.rawValue = rawValue
    }
}

extension ConvoHopErrorCode {
    /// A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId.
    public static let admissionLimit = ConvoHopErrorCode(rawValue: "ADMISSION_LIMIT")
    /// The participation already has an active media connection.
    public static let alreadyConnected = ConvoHopErrorCode(rawValue: "ALREADY_CONNECTED")
    /// The authority is temporarily unavailable. Retry with the same requestId.
    public static let authorityUnavailable = ConvoHopErrorCode(rawValue: "AUTHORITY_UNAVAILABLE")
    /// The credential carried by the stored result has expired. Request a new one.
    public static let credentialExpired = ConvoHopErrorCode(rawValue: "CREDENTIAL_EXPIRED")
    /// The media credential must be refreshed before connecting.
    public static let credentialRefreshRequired = ConvoHopErrorCode(rawValue: "CREDENTIAL_REFRESH_REQUIRED")
    /// Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly.
    public static let credentialRequired = ConvoHopErrorCode(rawValue: "CREDENTIAL_REQUIRED")
    /// Prepaid credits are spent and the monthly spend cap is zero, so billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap.
    public static let creditsExhausted = ConvoHopErrorCode(rawValue: "CREDITS_EXHAUSTED")
    /// The cursor is ahead of the committed events of the conversation.
    public static let cursorAhead = ConvoHopErrorCode(rawValue: "CURSOR_AHEAD")
    /// The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently.
    public static let cursorExpired = ConvoHopErrorCode(rawValue: "CURSOR_EXPIRED")
    /// The cursor is malformed or was not issued for this query.
    public static let cursorInvalid = ConvoHopErrorCode(rawValue: "CURSOR_INVALID")
    /// The cursor does not continue the subscribed stream.
    public static let cursorMismatch = ConvoHopErrorCode(rawValue: "CURSOR_MISMATCH")
    /// The cursor was issued for a different scope, caller or visibility.
    public static let cursorScopeMismatch = ConvoHopErrorCode(rawValue: "CURSOR_SCOPE_MISMATCH")
    /// The feature is not available in this deployment.
    public static let featureUnsupported = ConvoHopErrorCode(rawValue: "FEATURE_UNSUPPORTED")
    /// The credential is valid but not allowed to perform this operation.
    public static let forbidden = ConvoHopErrorCode(rawValue: "FORBIDDEN")
    /// The live session generation changed. Read the current generation and retry.
    public static let generationConflict = ConvoHopErrorCode(rawValue: "GENERATION_CONFLICT")
    /// A GraphQL error arrived without a recognized code.
    public static let graphqlError = ConvoHopErrorCode(rawValue: "GRAPHQL_ERROR")
    /// The GraphQL request is malformed or fails validation.
    public static let graphqlInvalidRequest = ConvoHopErrorCode(rawValue: "GRAPHQL_INVALID_REQUEST")
    /// The GraphQL document exceeds a depth, complexity or size limit.
    public static let graphqlQueryLimit = ConvoHopErrorCode(rawValue: "GRAPHQL_QUERY_LIMIT")
    /// The query response exceeds the response limit. Request a smaller page.
    public static let graphqlResponseLimit = ConvoHopErrorCode(rawValue: "GRAPHQL_RESPONSE_LIMIT")
    /// The HTTP exchange failed without a usable GraphQL error.
    public static let httpFailure = ConvoHopErrorCode(rawValue: "HTTP_FAILURE")
    /// The requestId was already used with a different payload or caller.
    public static let idempotencyConflict = ConvoHopErrorCode(rawValue: "IDEMPOTENCY_CONFLICT")
    /// The project incarnation changed. Discard state from the old incarnation and recover explicitly.
    public static let incarnationMismatch = ConvoHopErrorCode(rawValue: "INCARNATION_MISMATCH")
    /// The connection to replace is not a current connection of this participation.
    public static let invalidReplacement = ConvoHopErrorCode(rawValue: "INVALID_REPLACEMENT")
    /// The input or request context failed validation.
    public static let invalidRequest = ConvoHopErrorCode(rawValue: "INVALID_REQUEST")
    /// The response did not match the expected shape or identity. The outcome is unknown.
    public static let invalidResponse = ConvoHopErrorCode(rawValue: "INVALID_RESPONSE")
    /// The live session reached its alert limit.
    public static let liveAlertLimit = ConvoHopErrorCode(rawValue: "LIVE_ALERT_LIMIT")
    /// The live session has ended or is ending.
    public static let liveSessionClosed = ConvoHopErrorCode(rawValue: "LIVE_SESSION_CLOSED")
    /// The conversation already has an active live session.
    public static let liveSessionExists = ConvoHopErrorCode(rawValue: "LIVE_SESSION_EXISTS")
    /// The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly.
    public static let mediaConnectFailed = ConvoHopErrorCode(rawValue: "MEDIA_CONNECT_FAILED")
    /// Media cutoff is not enforced yet for this live session. Retry after the cutoff completes.
    public static let mediaFenceRequired = ConvoHopErrorCode(rawValue: "MEDIA_FENCE_REQUIRED")
    /// Media for the live session is not ready yet.
    public static let mediaNotReady = ConvoHopErrorCode(rawValue: "MEDIA_NOT_READY")
    /// Media for the live session is recovering.
    public static let mediaRecovering = ConvoHopErrorCode(rawValue: "MEDIA_RECOVERING")
    /// The message was deleted.
    public static let messageDeleted = ConvoHopErrorCode(rawValue: "MESSAGE_DELETED")
    /// The resource does not exist or is not visible to the caller.
    public static let notFound = ConvoHopErrorCode(rawValue: "NOT_FOUND")
    /// The mutation may have committed. Retry with the same requestId or resolve it.
    public static let outcomeUnknown = ConvoHopErrorCode(rawValue: "OUTCOME_UNKNOWN")
    /// A single item exceeds the page response limit.
    public static let pageItemTooLarge = ConvoHopErrorCode(rawValue: "PAGE_ITEM_TOO_LARGE")
    /// The participation does not belong to the caller or the current live session generation.
    public static let participationMismatch = ConvoHopErrorCode(rawValue: "PARTICIPATION_MISMATCH")
    /// The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again.
    public static let planLimitExceeded = ConvoHopErrorCode(rawValue: "PLAN_LIMIT_EXCEEDED")
    /// A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues.
    public static let quotaExceeded = ConvoHopErrorCode(rawValue: "QUOTA_EXCEEDED")
    /// A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId.
    public static let rateLimited = ConvoHopErrorCode(rawValue: "RATE_LIMITED")
    /// The SDK's recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again.
    public static let recoveryLimit = ConvoHopErrorCode(rawValue: "RECOVERY_LIMIT")
    /// Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome.
    public static let recoveryStorageFailure = ConvoHopErrorCode(rawValue: "RECOVERY_STORAGE_FAILURE")
    /// The original request is too old to replay.
    public static let requestExpired = ConvoHopErrorCode(rawValue: "REQUEST_EXPIRED")
    /// The request body exceeds the size limit.
    public static let requestTooLarge = ConvoHopErrorCode(rawValue: "REQUEST_TOO_LARGE")
    /// The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing.
    public static let resolutionRequired = ConvoHopErrorCode(rawValue: "RESOLUTION_REQUIRED")
    /// The response exceeds the size limit.
    public static let responseTooLarge = ConvoHopErrorCode(rawValue: "RESPONSE_TOO_LARGE")
    /// The subscription cannot continue. Replay from the last applied cursor.
    public static let resyncRequired = ConvoHopErrorCode(rawValue: "RESYNC_REQUIRED")
    /// The authority exhausted its internal retry budget. Retry later with the same requestId.
    public static let retryExhausted = ConvoHopErrorCode(rawValue: "RETRY_EXHAUSTED")
    /// The expected revision or epoch is stale. Read the current state and retry with a new request.
    public static let revisionConflict = ConvoHopErrorCode(rawValue: "REVISION_CONFLICT")
    /// The backend key lacks a scope this operation requires. The message names the scope.
    public static let scopeRequired = ConvoHopErrorCode(rawValue: "SCOPE_REQUIRED")
    /// The application session refresh callback failed.
    public static let sessionRefreshFailed = ConvoHopErrorCode(rawValue: "SESSION_REFRESH_FAILED")
    /// The refreshed session was rejected because it does not match the current session.
    public static let sessionRefreshRejected = ConvoHopErrorCode(rawValue: "SESSION_REFRESH_REJECTED")
    /// The user session needs renewal and no refresh is configured, or it expired.
    public static let sessionRefreshRequired = ConvoHopErrorCode(rawValue: "SESSION_REFRESH_REQUIRED")
    /// The refreshed session could not be verified.
    public static let sessionRefreshUnverified = ConvoHopErrorCode(rawValue: "SESSION_REFRESH_UNVERIFIED")
    /// The spend month's usage charges reached the charge limit that the organization's prepaid credits and monthly spend cap set, less a safety margin. Billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap.
    public static let spendCapReached = ConvoHopErrorCode(rawValue: "SPEND_CAP_REACHED")
    /// Current spend cannot be verified, so billable usage beyond the plan's allowances fails closed before any effect (WebSocket close 4503). extensions.meter names the meter and extensions.periodEnd ends the spend month; extensions.retryAfter (HTTP Retry-After) counts the seconds before the same request may succeed.
    public static let spendUnverified = ConvoHopErrorCode(rawValue: "SPEND_UNVERIFIED")
    /// The transport failed after the request may have been sent. Resolve or retry the original request.
    public static let transportUnknown = ConvoHopErrorCode(rawValue: "TRANSPORT_UNKNOWN")
    /// The credential is missing, invalid or expired.
    public static let unauthenticated = ConvoHopErrorCode(rawValue: "UNAUTHENTICATED")
    /// The observed serving epoch is stale. Route again, then retry.
    public static let wrongRegion = ConvoHopErrorCode(rawValue: "WRONG_REGION")

    /// The documented HTTP-equivalent status and retryability of each listed code.
    static let catalog: [String: (status: Int?, retryable: Bool)] = [
        "ADMISSION_LIMIT": (status: 429, retryable: true),
        "ALREADY_CONNECTED": (status: 409, retryable: false),
        "AUTHORITY_UNAVAILABLE": (status: 503, retryable: true),
        "CREDENTIAL_EXPIRED": (status: 409, retryable: false),
        "CREDENTIAL_REFRESH_REQUIRED": (status: 409, retryable: false),
        "CREDENTIAL_REQUIRED": (status: 409, retryable: false),
        "CREDITS_EXHAUSTED": (status: 402, retryable: false),
        "CURSOR_AHEAD": (status: 409, retryable: false),
        "CURSOR_EXPIRED": (status: 409, retryable: false),
        "CURSOR_INVALID": (status: 409, retryable: false),
        "CURSOR_MISMATCH": (status: 409, retryable: false),
        "CURSOR_SCOPE_MISMATCH": (status: 409, retryable: false),
        "FEATURE_UNSUPPORTED": (status: nil, retryable: false),
        "FORBIDDEN": (status: 403, retryable: false),
        "GENERATION_CONFLICT": (status: 409, retryable: false),
        "GRAPHQL_ERROR": (status: nil, retryable: false),
        "GRAPHQL_INVALID_REQUEST": (status: 400, retryable: false),
        "GRAPHQL_QUERY_LIMIT": (status: 400, retryable: false),
        "GRAPHQL_RESPONSE_LIMIT": (status: 413, retryable: false),
        "HTTP_FAILURE": (status: nil, retryable: true),
        "IDEMPOTENCY_CONFLICT": (status: 409, retryable: false),
        "INCARNATION_MISMATCH": (status: 409, retryable: false),
        "INVALID_REPLACEMENT": (status: 409, retryable: false),
        "INVALID_REQUEST": (status: 400, retryable: false),
        "INVALID_RESPONSE": (status: nil, retryable: true),
        "LIVE_ALERT_LIMIT": (status: 409, retryable: false),
        "LIVE_SESSION_CLOSED": (status: 409, retryable: false),
        "LIVE_SESSION_EXISTS": (status: 409, retryable: false),
        "MEDIA_CONNECT_FAILED": (status: nil, retryable: false),
        "MEDIA_FENCE_REQUIRED": (status: 409, retryable: false),
        "MEDIA_NOT_READY": (status: 409, retryable: false),
        "MEDIA_RECOVERING": (status: 409, retryable: false),
        "MESSAGE_DELETED": (status: 409, retryable: false),
        "NOT_FOUND": (status: 404, retryable: false),
        "OUTCOME_UNKNOWN": (status: 503, retryable: true),
        "PAGE_ITEM_TOO_LARGE": (status: 413, retryable: false),
        "PARTICIPATION_MISMATCH": (status: 409, retryable: false),
        "PLAN_LIMIT_EXCEEDED": (status: 403, retryable: false),
        "QUOTA_EXCEEDED": (status: 429, retryable: false),
        "RATE_LIMITED": (status: 429, retryable: true),
        "RECOVERY_LIMIT": (status: 409, retryable: false),
        "RECOVERY_STORAGE_FAILURE": (status: nil, retryable: false),
        "REQUEST_EXPIRED": (status: 409, retryable: false),
        "REQUEST_TOO_LARGE": (status: 413, retryable: false),
        "RESOLUTION_REQUIRED": (status: 409, retryable: false),
        "RESPONSE_TOO_LARGE": (status: 413, retryable: false),
        "RESYNC_REQUIRED": (status: 409, retryable: false),
        "RETRY_EXHAUSTED": (status: 503, retryable: true),
        "REVISION_CONFLICT": (status: 409, retryable: false),
        "SCOPE_REQUIRED": (status: 403, retryable: false),
        "SESSION_REFRESH_FAILED": (status: nil, retryable: false),
        "SESSION_REFRESH_REJECTED": (status: 409, retryable: false),
        "SESSION_REFRESH_REQUIRED": (status: 409, retryable: false),
        "SESSION_REFRESH_UNVERIFIED": (status: nil, retryable: false),
        "SPEND_CAP_REACHED": (status: 402, retryable: false),
        "SPEND_UNVERIFIED": (status: 503, retryable: true),
        "TRANSPORT_UNKNOWN": (status: nil, retryable: true),
        "UNAUTHENTICATED": (status: 401, retryable: false),
        "WRONG_REGION": (status: 409, retryable: false),
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
    /// A conversation was created.
    public static let conversationCreated = ConversationEventType(rawValue: "conversation.created")
    /// A conversation's title or properties changed.
    public static let conversationUpdated = ConversationEventType(rawValue: "conversation.updated")
    /// Members were alerted about a live session.
    public static let liveAlerted = ConversationEventType(rawValue: "live.alerted")
    /// Media reported a participant connection.
    public static let liveConnected = ConversationEventType(rawValue: "live.connected")
    /// A live session ended.
    public static let liveEnded = ConversationEventType(rawValue: "live.ended")
    /// A participant joined or left a live session.
    public static let liveParticipationChanged = ConversationEventType(rawValue: "live.participationChanged")
    /// A live session became ready for media.
    public static let liveReady = ConversationEventType(rawValue: "live.ready")
    /// A live session started.
    public static let liveStarted = ConversationEventType(rawValue: "live.started")
    /// A member was added.
    public static let memberAdded = ConversationEventType(rawValue: "member.added")
    /// A member's live session broadcast permission changed.
    public static let memberBroadcastPermissionChanged = ConversationEventType(rawValue: "member.broadcastPermissionChanged")
    /// A member's visible history was expanded.
    public static let memberHistoryExpanded = ConversationEventType(rawValue: "member.historyExpanded")
    /// A member was removed.
    public static let memberRemoved = ConversationEventType(rawValue: "member.removed")
    /// An active member's role changed.
    public static let memberRoleChanged = ConversationEventType(rawValue: "member.roleChanged")
    /// A message was sent.
    public static let messageCreated = ConversationEventType(rawValue: "message.created")
    /// A message was deleted.
    public static let messageDeleted = ConversationEventType(rawValue: "message.deleted")
    /// A message was edited.
    public static let messageEdited = ConversationEventType(rawValue: "message.edited")
    /// A member reported delivery or read progress.
    public static let receiptReported = ConversationEventType(rawValue: "receipt.reported")
}

/// Realtime channels and their limits.
enum GraphQLRealtime {
    /// Ordered events of one conversation over graphql-transport-ws, gap-filled with the replay query.
    static let conversationEvents = GraphQLRealtimeChannel(
        name: "conversationEvents",
        subscription: "communication.conversationEvents",
        replay: "communication.events",
        pageType: "EventPage",
        connectionInit: ["projectId", "incarnation", "token"],
        maxFrameBytes: 65536,
        maxPendingPages: 4,
        subscribeLimit: 50,
        replayLimit: 100,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        jitterMs: 500,
        terminalCloseCodes: [4400, 4401, 4403, 4408, 4409]
    )
}
