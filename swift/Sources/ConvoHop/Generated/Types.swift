// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.

/// A JSON value. Object scalars such as message properties and signed proofs use it.
public enum JSONValue: Hashable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])
}

/// A JSON object.
public typealias JSONObject = [String: JSONValue]

extension JSONValue: Codable {
    public init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        }
    }
}

/// The input of an operation that takes none.
public struct NoInput: Codable, Hashable, Sendable {
    public init() {}
}

public struct ActorRef: Codable, Hashable, Sendable {
    public var tenantId: String
    public var objectId: String

    public init(
        tenantId: String,
        objectId: String
    ) {
        self.tenantId = tenantId
        self.objectId = objectId
    }
}

public struct AlertLiveSessionInput: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var expectedGeneration: String
    public var principalIds: [String]

    public init(
        liveSessionId: String,
        expectedGeneration: String,
        principalIds: [String]
    ) {
        self.liveSessionId = liveSessionId
        self.expectedGeneration = expectedGeneration
        self.principalIds = principalIds
    }
}

public struct AlertLiveSessionPayload: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var receiptId: String
    public var committedAt: String
    public var replayed: Bool
    public var result: LiveAlertBatch

    public init(
        status: String,
        requestId: String,
        receiptId: String,
        committedAt: String,
        replayed: Bool,
        result: LiveAlertBatch
    ) {
        self.status = status
        self.requestId = requestId
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.result = result
    }
}

public struct BillingCheckoutSession: Codable, Hashable, Sendable {
    public var orgId: String
    public var planId: String
    public var url: String
    public var expiresAt: String

    public init(
        orgId: String,
        planId: String,
        url: String,
        expiresAt: String
    ) {
        self.orgId = orgId
        self.planId = planId
        self.url = url
        self.expiresAt = expiresAt
    }
}

public struct BillingPortalSession: Codable, Hashable, Sendable {
    public var orgId: String
    public var url: String
    public var expiresAt: String?

    public init(
        orgId: String,
        url: String,
        expiresAt: String? = nil
    ) {
        self.orgId = orgId
        self.url = url
        self.expiresAt = expiresAt
    }
}

public struct BroadcastPermissionChanged: Codable, Hashable, Sendable {
    public var member: Member
    public var mediaCutoff: LiveMediaCutoff?

    public init(
        member: Member,
        mediaCutoff: LiveMediaCutoff? = nil
    ) {
        self.member = member
        self.mediaCutoff = mediaCutoff
    }
}

public struct Capabilities: Codable, Hashable, Sendable {
    public var serverRelease: String
    public var capabilityRevision: String
    public var limitsRevision: String
    public var features: Features?
    public var limits: [LimitEntry]
    public var environment: String
    public var productionQualified: Bool
    public var mediaPolicy: MediaPolicy?
    public var geoControlAuthorityId: String?
    public var offerings: [String]
    public var geos: [String]
    public var installationProfiles: [String]
    public var portalIdentity: String?

    public init(
        serverRelease: String,
        capabilityRevision: String,
        limitsRevision: String,
        features: Features? = nil,
        limits: [LimitEntry],
        environment: String,
        productionQualified: Bool,
        mediaPolicy: MediaPolicy? = nil,
        geoControlAuthorityId: String? = nil,
        offerings: [String],
        geos: [String],
        installationProfiles: [String],
        portalIdentity: String? = nil
    ) {
        self.serverRelease = serverRelease
        self.capabilityRevision = capabilityRevision
        self.limitsRevision = limitsRevision
        self.features = features
        self.limits = limits
        self.environment = environment
        self.productionQualified = productionQualified
        self.mediaPolicy = mediaPolicy
        self.geoControlAuthorityId = geoControlAuthorityId
        self.offerings = offerings
        self.geos = geos
        self.installationProfiles = installationProfiles
        self.portalIdentity = portalIdentity
    }
}

public struct CapabilitiesReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: Capabilities?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: Capabilities? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct Conversation: Codable, Hashable, Sendable {
    public var conversationId: String
    public var revision: String
    public var title: String
    public var props: JSONObject?
    public var latestSequence: String
    public var membership: Member?

    public init(
        conversationId: String,
        revision: String,
        title: String,
        props: JSONObject? = nil,
        latestSequence: String,
        membership: Member? = nil
    ) {
        self.conversationId = conversationId
        self.revision = revision
        self.title = title
        self.props = props
        self.latestSequence = latestSequence
        self.membership = membership
    }
}

public struct ConversationLiveInput: Codable, Hashable, Sendable {
    public var conversationId: String

    public init(
        conversationId: String
    ) {
        self.conversationId = conversationId
    }
}

public struct ConversationMemberBatch: Codable, Hashable, Sendable {
    public var items: [Member]

    public init(
        items: [Member]
    ) {
        self.items = items
    }
}

public struct ConversationMute: Codable, Hashable, Sendable {
    public var conversationId: String
    public var principalId: String
    public var muted: Bool
    public var until: String?

    public init(
        conversationId: String,
        principalId: String,
        muted: Bool,
        until: String? = nil
    ) {
        self.conversationId = conversationId
        self.principalId = principalId
        self.muted = muted
        self.until = until
    }
}

public struct ConversationMuteInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var actAsPrincipalId: String?

    public init(
        conversationId: String,
        actAsPrincipalId: String? = nil
    ) {
        self.conversationId = conversationId
        self.actAsPrincipalId = actAsPrincipalId
    }
}

public struct ConversationMuteReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String
    public var result: ConversationMute

    public init(
        status: String,
        requestId: String,
        serverTime: String,
        result: ConversationMute
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.result = result
    }
}

public struct CredentialDelivery: Codable, Hashable, Sendable {
    public var deliveryId: String
    public var kind: String
    public var projectId: String
    public var installationId: String
    public var resourceRef: ResourceRef?
    public var expiresAt: String
    public var payloadDigest: String
    public var recipientActorRef: ActorRef?

    public init(
        deliveryId: String,
        kind: String,
        projectId: String,
        installationId: String,
        resourceRef: ResourceRef? = nil,
        expiresAt: String,
        payloadDigest: String,
        recipientActorRef: ActorRef? = nil
    ) {
        self.deliveryId = deliveryId
        self.kind = kind
        self.projectId = projectId
        self.installationId = installationId
        self.resourceRef = resourceRef
        self.expiresAt = expiresAt
        self.payloadDigest = payloadDigest
        self.recipientActorRef = recipientActorRef
    }
}

public struct CredentialDeliveryReceipt: Codable, Hashable, Sendable {
    public var deliveryId: String

    public init(
        deliveryId: String
    ) {
        self.deliveryId = deliveryId
    }
}

public struct CurrentLiveSessionReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String
    public var result: LiveSession?

    public init(
        status: String,
        requestId: String,
        serverTime: String,
        result: LiveSession? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.result = result
    }
}

public struct CurrentSessionReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String
    public var result: Session

    public init(
        status: String,
        requestId: String,
        serverTime: String,
        result: Session
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.result = result
    }
}

public struct Cursor: Codable, Hashable, Sendable {
    public var incarnation: String
    public var conversationId: String
    public var sequence: String

    public init(
        incarnation: String,
        conversationId: String,
        sequence: String
    ) {
        self.incarnation = incarnation
        self.conversationId = conversationId
        self.sequence = sequence
    }
}

public struct CursorInput: Codable, Hashable, Sendable {
    public var incarnation: String
    public var conversationId: String
    public var sequence: String

    public init(
        incarnation: String,
        conversationId: String,
        sequence: String
    ) {
        self.incarnation = incarnation
        self.conversationId = conversationId
        self.sequence = sequence
    }
}

public struct CutoffScope: Codable, Hashable, Sendable {
    public var kind: String
    public var principalId: String?
    public var sessionId: String?
    public var deviceId: String?
    public var callId: String?

    public init(
        kind: String,
        principalId: String? = nil,
        sessionId: String? = nil,
        deviceId: String? = nil,
        callId: String? = nil
    ) {
        self.kind = kind
        self.principalId = principalId
        self.sessionId = sessionId
        self.deviceId = deviceId
        self.callId = callId
    }
}

public struct DeleteMessageReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: Message?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: Message? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct DeleteMessageRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var messageId: String
    public var expectedRevision: String

    public init(
        conversationId: String,
        messageId: String,
        expectedRevision: String
    ) {
        self.conversationId = conversationId
        self.messageId = messageId
        self.expectedRevision = expectedRevision
    }
}

public struct DeliveryAck: Codable, Hashable, Sendable {
    public var deliveryId: String
    public var acknowledged: Bool

    public init(
        deliveryId: String,
        acknowledged: Bool
    ) {
        self.deliveryId = deliveryId
        self.acknowledged = acknowledged
    }
}

public struct EditMessageReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: Message?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: Message? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct EditMessageRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var messageId: String
    public var expectedRevision: String
    public var text: String?
    public var props: JSONObject?

    public init(
        conversationId: String,
        messageId: String,
        expectedRevision: String,
        text: String? = nil,
        props: JSONObject? = nil
    ) {
        self.conversationId = conversationId
        self.messageId = messageId
        self.expectedRevision = expectedRevision
        self.text = text
        self.props = props
    }
}

public struct EndLiveSessionInput: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var expectedGeneration: String
    public var expectedRevision: String

    public init(
        liveSessionId: String,
        expectedGeneration: String,
        expectedRevision: String
    ) {
        self.liveSessionId = liveSessionId
        self.expectedGeneration = expectedGeneration
        self.expectedRevision = expectedRevision
    }
}

public struct EndLiveSessionPayload: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var receiptId: String
    public var committedAt: String
    public var replayed: Bool
    public var operation: OperationRef
    public var result: LiveSessionEndRequested

    public init(
        status: String,
        requestId: String,
        receiptId: String,
        committedAt: String,
        replayed: Bool,
        operation: OperationRef,
        result: LiveSessionEndRequested
    ) {
        self.status = status
        self.requestId = requestId
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.result = result
    }
}

public struct Event: Codable, Hashable, Sendable {
    public var eventId: String
    public var conversationId: String
    public var sequence: String
    public var type: String
    public var occurredAt: String
    public var subjectRef: ResourceRef?
    public var payload: EventPayload?

    public init(
        eventId: String,
        conversationId: String,
        sequence: String,
        type: String,
        occurredAt: String,
        subjectRef: ResourceRef? = nil,
        payload: EventPayload? = nil
    ) {
        self.eventId = eventId
        self.conversationId = conversationId
        self.sequence = sequence
        self.type = type
        self.occurredAt = occurredAt
        self.subjectRef = subjectRef
        self.payload = payload
    }
}

public struct EventPage: Codable, Hashable, Sendable {
    public var items: [Event]
    public var complete: Bool
    public var refreshRequired: Bool
    public var nextCursor: Cursor?

    public init(
        items: [Event],
        complete: Bool,
        refreshRequired: Bool,
        nextCursor: Cursor? = nil
    ) {
        self.items = items
        self.complete = complete
        self.refreshRequired = refreshRequired
        self.nextCursor = nextCursor
    }
}

public struct EventPayload: Codable, Hashable, Sendable {
    public var messageId: String?
    public var revision: String?
    public var revisionSequence: String?
    public var principalId: String?
    public var membershipEpoch: String?
    public var visibilityEpoch: String?
    public var kind: String?
    public var throughSequence: String?
    public var callId: String?
    public var generation: String?
    public var state: String?
    public var cutoffEvidence: String?
    public var liveSessionId: String?

    public init(
        messageId: String? = nil,
        revision: String? = nil,
        revisionSequence: String? = nil,
        principalId: String? = nil,
        membershipEpoch: String? = nil,
        visibilityEpoch: String? = nil,
        kind: String? = nil,
        throughSequence: String? = nil,
        callId: String? = nil,
        generation: String? = nil,
        state: String? = nil,
        cutoffEvidence: String? = nil,
        liveSessionId: String? = nil
    ) {
        self.messageId = messageId
        self.revision = revision
        self.revisionSequence = revisionSequence
        self.principalId = principalId
        self.membershipEpoch = membershipEpoch
        self.visibilityEpoch = visibilityEpoch
        self.kind = kind
        self.throughSequence = throughSequence
        self.callId = callId
        self.generation = generation
        self.state = state
        self.cutoffEvidence = cutoffEvidence
        self.liveSessionId = liveSessionId
    }
}

public struct EventsReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: EventPage?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: EventPage? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct EventsRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var limit: Int
    public var after: CursorInput?

    public init(
        conversationId: String,
        limit: Int,
        after: CursorInput? = nil
    ) {
        self.conversationId = conversationId
        self.limit = limit
        self.after = after
    }
}

public struct Features: Codable, Hashable, Sendable {
    public var chat: Bool
    public var inbox: Bool
    public var lexicalSearch: Bool
    public var typing: Bool
    public var webhooks: Bool
    public var liveSessions: Bool
    public var liveBroadcast: Bool

    public init(
        chat: Bool,
        inbox: Bool,
        lexicalSearch: Bool,
        typing: Bool,
        webhooks: Bool,
        liveSessions: Bool,
        liveBroadcast: Bool
    ) {
        self.chat = chat
        self.inbox = inbox
        self.lexicalSearch = lexicalSearch
        self.typing = typing
        self.webhooks = webhooks
        self.liveSessions = liveSessions
        self.liveBroadcast = liveBroadcast
    }
}

public struct GetConversationReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: Conversation?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: Conversation? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct GetConversationRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String

    public init(
        conversationId: String
    ) {
        self.conversationId = conversationId
    }
}

public struct GetMessageReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: Message?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: Message? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct GetMessageRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var messageId: String
    public var actAsPrincipalId: String?

    public init(
        conversationId: String,
        messageId: String,
        actAsPrincipalId: String? = nil
    ) {
        self.conversationId = conversationId
        self.messageId = messageId
        self.actAsPrincipalId = actAsPrincipalId
    }
}

public struct GetOperationReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: ConvoHopOperation?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: ConvoHopOperation? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct GetOperationRequestInput: Codable, Hashable, Sendable {
    public var operationId: String

    public init(
        operationId: String
    ) {
        self.operationId = operationId
    }
}

public struct InboxItem: Codable, Hashable, Sendable {
    public var conversationId: String
    public var title: String
    public var activityAt: String?
    public var visibilityEpoch: String
    public var latestVisibleMessage: Message?
    public var hasUnread: Bool

    public init(
        conversationId: String,
        title: String,
        activityAt: String? = nil,
        visibilityEpoch: String,
        latestVisibleMessage: Message? = nil,
        hasUnread: Bool
    ) {
        self.conversationId = conversationId
        self.title = title
        self.activityAt = activityAt
        self.visibilityEpoch = visibilityEpoch
        self.latestVisibleMessage = latestVisibleMessage
        self.hasUnread = hasUnread
    }
}

public struct InboxPage: Codable, Hashable, Sendable {
    public var items: [InboxItem]
    public var complete: Bool
    public var refreshRequired: Bool
    public var nextCursor: String?
    public var partialReason: String?

    public init(
        items: [InboxItem],
        complete: Bool,
        refreshRequired: Bool,
        nextCursor: String? = nil,
        partialReason: String? = nil
    ) {
        self.items = items
        self.complete = complete
        self.refreshRequired = refreshRequired
        self.nextCursor = nextCursor
        self.partialReason = partialReason
    }
}

public struct InboxReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: InboxPage?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: InboxPage? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct InboxRequestInput: Codable, Hashable, Sendable {
    public var limit: Int
    public var cursor: String?
    public var actAsPrincipalId: String?

    public init(
        limit: Int,
        cursor: String? = nil,
        actAsPrincipalId: String? = nil
    ) {
        self.limit = limit
        self.cursor = cursor
        self.actAsPrincipalId = actAsPrincipalId
    }
}

public struct JoinLiveSessionInput: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var expectedGeneration: String

    public init(
        liveSessionId: String,
        expectedGeneration: String
    ) {
        self.liveSessionId = liveSessionId
        self.expectedGeneration = expectedGeneration
    }
}

public struct JoinLiveSessionPayload: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var receiptId: String
    public var committedAt: String
    public var replayed: Bool
    public var result: LiveSessionJoined

    public init(
        status: String,
        requestId: String,
        receiptId: String,
        committedAt: String,
        replayed: Bool,
        result: LiveSessionJoined
    ) {
        self.status = status
        self.requestId = requestId
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.result = result
    }
}

public struct LeaveLiveSessionInput: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var expectedGeneration: String
    public var participationId: String

    public init(
        liveSessionId: String,
        expectedGeneration: String,
        participationId: String
    ) {
        self.liveSessionId = liveSessionId
        self.expectedGeneration = expectedGeneration
        self.participationId = participationId
    }
}

public struct LeaveLiveSessionPayload: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var receiptId: String
    public var committedAt: String
    public var replayed: Bool
    public var result: LiveSessionLeft

    public init(
        status: String,
        requestId: String,
        receiptId: String,
        committedAt: String,
        replayed: Bool,
        result: LiveSessionLeft
    ) {
        self.status = status
        self.requestId = requestId
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.result = result
    }
}

public struct Limit: Codable, Hashable, Sendable {
    public var maximum: String?
    public var unit: String?
    public var scope: String?
    public var milliseconds: String?
    public var policyId: String?
    public var revision: String?

    public init(
        maximum: String? = nil,
        unit: String? = nil,
        scope: String? = nil,
        milliseconds: String? = nil,
        policyId: String? = nil,
        revision: String? = nil
    ) {
        self.maximum = maximum
        self.unit = unit
        self.scope = scope
        self.milliseconds = milliseconds
        self.policyId = policyId
        self.revision = revision
    }
}

public struct LimitEntry: Codable, Hashable, Sendable {
    public var key: String
    public var value: Limit

    public init(
        key: String,
        value: Limit
    ) {
        self.key = key
        self.value = value
    }
}

public struct LiveAlert: Codable, Hashable, Sendable {
    public var alertId: String
    public var liveSessionId: String
    public var conversationId: String
    public var generation: String
    public var membershipEpoch: String
    public var createdAt: String
    public var expiresAt: String

    public init(
        alertId: String,
        liveSessionId: String,
        conversationId: String,
        generation: String,
        membershipEpoch: String,
        createdAt: String,
        expiresAt: String
    ) {
        self.alertId = alertId
        self.liveSessionId = liveSessionId
        self.conversationId = conversationId
        self.generation = generation
        self.membershipEpoch = membershipEpoch
        self.createdAt = createdAt
        self.expiresAt = expiresAt
    }
}

public struct LiveAlertBatch: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var created: String
    public var suppressed: String

    public init(
        liveSessionId: String,
        created: String,
        suppressed: String
    ) {
        self.liveSessionId = liveSessionId
        self.created = created
        self.suppressed = suppressed
    }
}

public struct LiveAlertPage: Codable, Hashable, Sendable {
    public var items: [LiveAlert]
    public var nextCursor: String?
    public var complete: Bool
    public var partialReason: String?
    public var refreshRequired: Bool

    public init(
        items: [LiveAlert],
        nextCursor: String? = nil,
        complete: Bool,
        partialReason: String? = nil,
        refreshRequired: Bool
    ) {
        self.items = items
        self.nextCursor = nextCursor
        self.complete = complete
        self.partialReason = partialReason
        self.refreshRequired = refreshRequired
    }
}

public struct LiveAlertPageReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String
    public var result: LiveAlertPage

    public init(
        status: String,
        requestId: String,
        serverTime: String,
        result: LiveAlertPage
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.result = result
    }
}

public struct LiveAlertsInput: Codable, Hashable, Sendable {
    public var limit: Int
    public var cursor: String?

    public init(
        limit: Int,
        cursor: String? = nil
    ) {
        self.limit = limit
        self.cursor = cursor
    }
}

public struct LiveConnectionGrant: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var participationId: String
    public var generation: String
    public var roomName: String
    public var participantIdentity: String
    public var livekitUrl: String
    public var transportToken: String
    public var admissionTicket: JSONObject
    public var forwardingLease: JSONObject
    public var transportExpiresAt: String
    public var admissionExpiresAt: String
    public var leaseExpiresAt: String
    public var leasePolicyId: String
    public var connectToken: String

    public init(
        liveSessionId: String,
        participationId: String,
        generation: String,
        roomName: String,
        participantIdentity: String,
        livekitUrl: String,
        transportToken: String,
        admissionTicket: JSONObject,
        forwardingLease: JSONObject,
        transportExpiresAt: String,
        admissionExpiresAt: String,
        leaseExpiresAt: String,
        leasePolicyId: String,
        connectToken: String
    ) {
        self.liveSessionId = liveSessionId
        self.participationId = participationId
        self.generation = generation
        self.roomName = roomName
        self.participantIdentity = participantIdentity
        self.livekitUrl = livekitUrl
        self.transportToken = transportToken
        self.admissionTicket = admissionTicket
        self.forwardingLease = forwardingLease
        self.transportExpiresAt = transportExpiresAt
        self.admissionExpiresAt = admissionExpiresAt
        self.leaseExpiresAt = leaseExpiresAt
        self.leasePolicyId = leasePolicyId
        self.connectToken = connectToken
    }
}

public enum LiveConnectionMode: String, Codable, Hashable, Sendable, CaseIterable {
    case initial = "INITIAL"
    case reconnect = "RECONNECT"
}

public struct LiveCredentialIssuance: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var participationId: String
    public var generation: String
    public var leaseId: String
    public var grantOrdinal: String
    public var admissionExpiresAt: String
    public var leaseExpiresAt: String

    public init(
        liveSessionId: String,
        participationId: String,
        generation: String,
        leaseId: String,
        grantOrdinal: String,
        admissionExpiresAt: String,
        leaseExpiresAt: String
    ) {
        self.liveSessionId = liveSessionId
        self.participationId = participationId
        self.generation = generation
        self.leaseId = leaseId
        self.grantOrdinal = grantOrdinal
        self.admissionExpiresAt = admissionExpiresAt
        self.leaseExpiresAt = leaseExpiresAt
    }
}

public enum LiveCutoffEvidence: String, Codable, Hashable, Sendable, CaseIterable {
    case nativeFence = "NATIVE_FENCE"
    case monotonicBootRetirement = "MONOTONIC_BOOT_RETIREMENT"
    case noGrantsIssued = "NO_GRANTS_ISSUED"
}

public struct LiveCutoffScope: Codable, Hashable, Sendable {
    public var kind: LiveCutoffScopeKind
    public var liveSessionId: String
    public var generation: String
    public var participationId: String?

    public init(
        kind: LiveCutoffScopeKind,
        liveSessionId: String,
        generation: String,
        participationId: String? = nil
    ) {
        self.kind = kind
        self.liveSessionId = liveSessionId
        self.generation = generation
        self.participationId = participationId
    }
}

public enum LiveCutoffScopeKind: String, Codable, Hashable, Sendable, CaseIterable {
    case participation = "PARTICIPATION"
    case generation = "GENERATION"
}

public enum LiveCutoffState: String, Codable, Hashable, Sendable, CaseIterable {
    case pending = "PENDING"
    case enforced = "ENFORCED"
    case unknown = "UNKNOWN"
}

public enum LiveErrorCode: String, Codable, Hashable, Sendable, CaseIterable {
    case liveSessionExists = "LIVE_SESSION_EXISTS"
    case liveSessionClosed = "LIVE_SESSION_CLOSED"
    case liveSessionInterrupted = "LIVE_SESSION_INTERRUPTED"
    case liveSessionCapacity = "LIVE_SESSION_CAPACITY"
    case liveAlertLimit = "LIVE_ALERT_LIMIT"
    case joinedElsewhere = "JOINED_ELSEWHERE"
    case participationDraining = "PARTICIPATION_DRAINING"
    case participationMismatch = "PARTICIPATION_MISMATCH"
    case generationConflict = "GENERATION_CONFLICT"
    case mediaNotReady = "MEDIA_NOT_READY"
    case credentialRefreshRequired = "CREDENTIAL_REFRESH_REQUIRED"
    case liveStartCancelled = "LIVE_START_CANCELLED"
    case livePreparationFailed = "LIVE_PREPARATION_FAILED"
}

public struct LiveMediaCutoff: Codable, Hashable, Sendable {
    public var state: LiveCutoffState
    public var scope: LiveCutoffScope
    public var evidence: LiveCutoffEvidence?
    public var enforcedAt: String?
    public var operationId: String?

    public init(
        state: LiveCutoffState,
        scope: LiveCutoffScope,
        evidence: LiveCutoffEvidence? = nil,
        enforcedAt: String? = nil,
        operationId: String? = nil
    ) {
        self.state = state
        self.scope = scope
        self.evidence = evidence
        self.enforcedAt = enforcedAt
        self.operationId = operationId
    }
}

public struct LiveMediaPermissions: Codable, Hashable, Sendable {
    public var microphone: Bool
    public var camera: Bool
    public var subscribe: Bool

    public init(
        microphone: Bool,
        camera: Bool,
        subscribe: Bool
    ) {
        self.microphone = microphone
        self.camera = camera
        self.subscribe = subscribe
    }
}

public enum LiveMediaProfile: String, Codable, Hashable, Sendable, CaseIterable {
    case audioOnly = "AUDIO_ONLY"
    case audioVideo = "AUDIO_VIDEO"
}

public struct LiveOperationFailure: Codable, Hashable, Sendable {
    public var code: LiveErrorCode
    public var message: String

    public init(
        code: LiveErrorCode,
        message: String
    ) {
        self.code = code
        self.message = message
    }
}

public enum LiveOperationKind: String, Codable, Hashable, Sendable, CaseIterable {
    case start = "START"
    case end = "END"
}

public enum LiveOperationState: String, Codable, Hashable, Sendable, CaseIterable {
    case running = "RUNNING"
    case completed = "COMPLETED"
    case failed = "FAILED"
}

public struct LiveParticipantPage: Codable, Hashable, Sendable {
    public var items: [LiveParticipation]
    public var nextCursor: String?
    public var complete: Bool
    public var partialReason: String?
    public var refreshRequired: Bool

    public init(
        items: [LiveParticipation],
        nextCursor: String? = nil,
        complete: Bool,
        partialReason: String? = nil,
        refreshRequired: Bool
    ) {
        self.items = items
        self.nextCursor = nextCursor
        self.complete = complete
        self.partialReason = partialReason
        self.refreshRequired = refreshRequired
    }
}

public struct LiveParticipantPageReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String
    public var result: LiveParticipantPage

    public init(
        status: String,
        requestId: String,
        serverTime: String,
        result: LiveParticipantPage
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.result = result
    }
}

public struct LiveParticipantsInput: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var limit: Int
    public var cursor: String?

    public init(
        liveSessionId: String,
        limit: Int,
        cursor: String? = nil
    ) {
        self.liveSessionId = liveSessionId
        self.limit = limit
        self.cursor = cursor
    }
}

public struct LiveParticipation: Codable, Hashable, Sendable {
    public var participationId: String
    public var principalId: String
    public var membershipEpoch: String
    public var role: LiveRole
    public var state: LiveParticipationState
    public var permissions: LiveMediaPermissions
    public var reservationExpiresAt: String?
    public var nativeConnectionId: String?
    public var mediaCutoff: LiveMediaCutoff?

    public init(
        participationId: String,
        principalId: String,
        membershipEpoch: String,
        role: LiveRole,
        state: LiveParticipationState,
        permissions: LiveMediaPermissions,
        reservationExpiresAt: String? = nil,
        nativeConnectionId: String? = nil,
        mediaCutoff: LiveMediaCutoff? = nil
    ) {
        self.participationId = participationId
        self.principalId = principalId
        self.membershipEpoch = membershipEpoch
        self.role = role
        self.state = state
        self.permissions = permissions
        self.reservationExpiresAt = reservationExpiresAt
        self.nativeConnectionId = nativeConnectionId
        self.mediaCutoff = mediaCutoff
    }
}

public enum LiveParticipationState: String, Codable, Hashable, Sendable, CaseIterable {
    case joined = "JOINED"
    case connecting = "CONNECTING"
    case connected = "CONNECTED"
    case disconnected = "DISCONNECTED"
    case leaving = "LEAVING"
    case left = "LEFT"
}

public enum LiveRole: String, Codable, Hashable, Sendable, CaseIterable {
    case publisher = "PUBLISHER"
    case viewer = "VIEWER"
}

public struct LiveSession: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var conversationId: String
    public var creatorId: String
    public var kind: LiveSessionKind
    public var mediaProfile: LiveMediaProfile
    public var state: LiveSessionState
    public var generation: String
    public var revision: String
    public var createdAt: String
    public var expiresAt: String
    public var myParticipation: LiveParticipation?
    public var mediaCutoff: LiveMediaCutoff?

    public init(
        liveSessionId: String,
        conversationId: String,
        creatorId: String,
        kind: LiveSessionKind,
        mediaProfile: LiveMediaProfile,
        state: LiveSessionState,
        generation: String,
        revision: String,
        createdAt: String,
        expiresAt: String,
        myParticipation: LiveParticipation? = nil,
        mediaCutoff: LiveMediaCutoff? = nil
    ) {
        self.liveSessionId = liveSessionId
        self.conversationId = conversationId
        self.creatorId = creatorId
        self.kind = kind
        self.mediaProfile = mediaProfile
        self.state = state
        self.generation = generation
        self.revision = revision
        self.createdAt = createdAt
        self.expiresAt = expiresAt
        self.myParticipation = myParticipation
        self.mediaCutoff = mediaCutoff
    }
}

public struct LiveSessionCredentialsInput: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var participationId: String
    public var expectedGeneration: String
    public var mode: LiveConnectionMode
    public var replacementOfConnectionId: String?

    public init(
        liveSessionId: String,
        participationId: String,
        expectedGeneration: String,
        mode: LiveConnectionMode,
        replacementOfConnectionId: String? = nil
    ) {
        self.liveSessionId = liveSessionId
        self.participationId = participationId
        self.expectedGeneration = expectedGeneration
        self.mode = mode
        self.replacementOfConnectionId = replacementOfConnectionId
    }
}

public struct LiveSessionCredentialsPayload: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var receiptId: String
    public var committedAt: String
    public var replayed: Bool
    public var result: LiveConnectionGrant

    public init(
        status: String,
        requestId: String,
        receiptId: String,
        committedAt: String,
        replayed: Bool,
        result: LiveConnectionGrant
    ) {
        self.status = status
        self.requestId = requestId
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.result = result
    }
}

public struct LiveSessionEndRequested: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var operationId: String
    public var mediaCutoff: LiveMediaCutoff

    public init(
        liveSessionId: String,
        operationId: String,
        mediaCutoff: LiveMediaCutoff
    ) {
        self.liveSessionId = liveSessionId
        self.operationId = operationId
        self.mediaCutoff = mediaCutoff
    }
}

public struct LiveSessionInput: Codable, Hashable, Sendable {
    public var liveSessionId: String

    public init(
        liveSessionId: String
    ) {
        self.liveSessionId = liveSessionId
    }
}

public struct LiveSessionJoined: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var generation: String
    public var participation: LiveParticipation

    public init(
        liveSessionId: String,
        generation: String,
        participation: LiveParticipation
    ) {
        self.liveSessionId = liveSessionId
        self.generation = generation
        self.participation = participation
    }
}

public enum LiveSessionKind: String, Codable, Hashable, Sendable, CaseIterable {
    case interactive = "INTERACTIVE"
    case broadcast = "BROADCAST"
}

public struct LiveSessionLeft: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var participationId: String
    public var mediaCutoff: LiveMediaCutoff

    public init(
        liveSessionId: String,
        participationId: String,
        mediaCutoff: LiveMediaCutoff
    ) {
        self.liveSessionId = liveSessionId
        self.participationId = participationId
        self.mediaCutoff = mediaCutoff
    }
}

public struct LiveSessionOperation: Codable, Hashable, Sendable {
    public var operationId: String
    public var requestId: String
    public var liveSessionId: String
    public var kind: LiveOperationKind
    public var state: LiveOperationState
    public var revision: String
    public var requestedAt: String
    public var completedAt: String?
    public var completion: LiveSessionOperationCompletion?
    public var failure: LiveOperationFailure?

    public init(
        operationId: String,
        requestId: String,
        liveSessionId: String,
        kind: LiveOperationKind,
        state: LiveOperationState,
        revision: String,
        requestedAt: String,
        completedAt: String? = nil,
        completion: LiveSessionOperationCompletion? = nil,
        failure: LiveOperationFailure? = nil
    ) {
        self.operationId = operationId
        self.requestId = requestId
        self.liveSessionId = liveSessionId
        self.kind = kind
        self.state = state
        self.revision = revision
        self.requestedAt = requestedAt
        self.completedAt = completedAt
        self.completion = completion
        self.failure = failure
    }
}

public struct LiveSessionOperationCompletion: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var generation: String
    public var state: LiveSessionState
    public var revision: String
    public var completedAt: String
    public var mediaCutoff: LiveMediaCutoff?

    public init(
        liveSessionId: String,
        generation: String,
        state: LiveSessionState,
        revision: String,
        completedAt: String,
        mediaCutoff: LiveMediaCutoff? = nil
    ) {
        self.liveSessionId = liveSessionId
        self.generation = generation
        self.state = state
        self.revision = revision
        self.completedAt = completedAt
        self.mediaCutoff = mediaCutoff
    }
}

public struct LiveSessionOperationInput: Codable, Hashable, Sendable {
    public var operationId: String

    public init(
        operationId: String
    ) {
        self.operationId = operationId
    }
}

public struct LiveSessionOperationReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String
    public var result: LiveSessionOperation

    public init(
        status: String,
        requestId: String,
        serverTime: String,
        result: LiveSessionOperation
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.result = result
    }
}

public struct LiveSessionPage: Codable, Hashable, Sendable {
    public var items: [LiveSession]
    public var nextCursor: String?
    public var complete: Bool
    public var partialReason: String?
    public var refreshRequired: Bool

    public init(
        items: [LiveSession],
        nextCursor: String? = nil,
        complete: Bool,
        partialReason: String? = nil,
        refreshRequired: Bool
    ) {
        self.items = items
        self.nextCursor = nextCursor
        self.complete = complete
        self.partialReason = partialReason
        self.refreshRequired = refreshRequired
    }
}

public struct LiveSessionPageReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String
    public var result: LiveSessionPage

    public init(
        status: String,
        requestId: String,
        serverTime: String,
        result: LiveSessionPage
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.result = result
    }
}

public struct LiveSessionReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String
    public var result: LiveSession

    public init(
        status: String,
        requestId: String,
        serverTime: String,
        result: LiveSession
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.result = result
    }
}

public struct LiveSessionStarted: Codable, Hashable, Sendable {
    public var liveSessionId: String
    public var conversationId: String
    public var kind: LiveSessionKind
    public var mediaProfile: LiveMediaProfile
    public var operationId: String

    public init(
        liveSessionId: String,
        conversationId: String,
        kind: LiveSessionKind,
        mediaProfile: LiveMediaProfile,
        operationId: String
    ) {
        self.liveSessionId = liveSessionId
        self.conversationId = conversationId
        self.kind = kind
        self.mediaProfile = mediaProfile
        self.operationId = operationId
    }
}

public enum LiveSessionState: String, Codable, Hashable, Sendable, CaseIterable {
    case preparing = "PREPARING"
    case ready = "READY"
    case active = "ACTIVE"
    case draining = "DRAINING"
    case ended = "ENDED"
    case failed = "FAILED"
}

public struct LiveSessionsInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var limit: Int
    public var cursor: String?

    public init(
        conversationId: String,
        limit: Int,
        cursor: String? = nil
    ) {
        self.conversationId = conversationId
        self.limit = limit
        self.cursor = cursor
    }
}

public struct MediaCutoff: Codable, Hashable, Sendable {
    public var state: String
    public var scope: CutoffScope?

    public init(
        state: String,
        scope: CutoffScope? = nil
    ) {
        self.state = state
        self.scope = scope
    }
}

public struct MediaPolicy: Codable, Hashable, Sendable {
    public var leasePolicyId: String
    public var maxLeaseMs: String
    public var renewAttemptMs: String
    public var preludeMaxBytes: String
    public var preludeTimeoutMs: String
    public var clockProfileId: String

    public init(
        leasePolicyId: String,
        maxLeaseMs: String,
        renewAttemptMs: String,
        preludeMaxBytes: String,
        preludeTimeoutMs: String,
        clockProfileId: String
    ) {
        self.leasePolicyId = leasePolicyId
        self.maxLeaseMs = maxLeaseMs
        self.renewAttemptMs = renewAttemptMs
        self.preludeMaxBytes = preludeMaxBytes
        self.preludeTimeoutMs = preludeTimeoutMs
        self.clockProfileId = clockProfileId
    }
}

public struct Member: Codable, Hashable, Sendable {
    public var conversationId: String
    public var principalId: String
    public var role: String
    public var status: String
    public var membershipEpoch: String
    public var visibilityEpoch: String
    public var revision: String
    public var visibleFromSequence: String
    public var canStartBroadcast: Bool

    public init(
        conversationId: String,
        principalId: String,
        role: String,
        status: String,
        membershipEpoch: String,
        visibilityEpoch: String,
        revision: String,
        visibleFromSequence: String,
        canStartBroadcast: Bool
    ) {
        self.conversationId = conversationId
        self.principalId = principalId
        self.role = role
        self.status = status
        self.membershipEpoch = membershipEpoch
        self.visibilityEpoch = visibilityEpoch
        self.revision = revision
        self.visibleFromSequence = visibleFromSequence
        self.canStartBroadcast = canStartBroadcast
    }
}

public struct MemberPage: Codable, Hashable, Sendable {
    public var items: [Member]
    public var complete: Bool
    public var refreshRequired: Bool
    public var nextCursor: String?

    public init(
        items: [Member],
        complete: Bool,
        refreshRequired: Bool,
        nextCursor: String? = nil
    ) {
        self.items = items
        self.complete = complete
        self.refreshRequired = refreshRequired
        self.nextCursor = nextCursor
    }
}

public struct MembersReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: MemberPage?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: MemberPage? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct MembersRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var limit: Int
    public var cursor: String?

    public init(
        conversationId: String,
        limit: Int,
        cursor: String? = nil
    ) {
        self.conversationId = conversationId
        self.limit = limit
        self.cursor = cursor
    }
}

public struct Message: Codable, Hashable, Sendable {
    public var messageId: String
    public var conversationId: String
    public var authorId: String
    public var sequence: String
    public var revision: String
    public var revisionSequence: String
    public var createdAt: String
    public var deleted: Bool
    public var text: String?
    public var props: JSONObject?
    public var editedAt: String?

    public init(
        messageId: String,
        conversationId: String,
        authorId: String,
        sequence: String,
        revision: String,
        revisionSequence: String,
        createdAt: String,
        deleted: Bool,
        text: String? = nil,
        props: JSONObject? = nil,
        editedAt: String? = nil
    ) {
        self.messageId = messageId
        self.conversationId = conversationId
        self.authorId = authorId
        self.sequence = sequence
        self.revision = revision
        self.revisionSequence = revisionSequence
        self.createdAt = createdAt
        self.deleted = deleted
        self.text = text
        self.props = props
        self.editedAt = editedAt
    }
}

public struct MessageAck: Codable, Hashable, Sendable {
    public var messageId: String
    public var conversationId: String
    public var sequence: String
    public var revision: String
    public var status: String
    public var cursor: Cursor?

    public init(
        messageId: String,
        conversationId: String,
        sequence: String,
        revision: String,
        status: String,
        cursor: Cursor? = nil
    ) {
        self.messageId = messageId
        self.conversationId = conversationId
        self.sequence = sequence
        self.revision = revision
        self.status = status
        self.cursor = cursor
    }
}

public struct MessagePage: Codable, Hashable, Sendable {
    public var items: [Message]
    public var complete: Bool
    public var refreshRequired: Bool
    public var nextCursor: String?

    public init(
        items: [Message],
        complete: Bool,
        refreshRequired: Bool,
        nextCursor: String? = nil
    ) {
        self.items = items
        self.complete = complete
        self.refreshRequired = refreshRequired
        self.nextCursor = nextCursor
    }
}

public struct MessagesReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: MessagePage?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: MessagePage? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct MessagesRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var limit: Int
    public var beforeSequence: String?
    public var actAsPrincipalId: String?

    public init(
        conversationId: String,
        limit: Int,
        beforeSequence: String? = nil,
        actAsPrincipalId: String? = nil
    ) {
        self.conversationId = conversationId
        self.limit = limit
        self.beforeSequence = beforeSequence
        self.actAsPrincipalId = actAsPrincipalId
    }
}

public struct ConvoHopOperation: Codable, Hashable, Sendable {
    public var operationId: String
    public var kind: String
    public var targetRef: ResourceRef?
    public var state: String
    public var revision: String
    public var requestedAt: String
    public var updatedAt: String
    public var steps: [OperationStep]
    public var result: OperationResult?
    public var blockedReason: String?

    public init(
        operationId: String,
        kind: String,
        targetRef: ResourceRef? = nil,
        state: String,
        revision: String,
        requestedAt: String,
        updatedAt: String,
        steps: [OperationStep],
        result: OperationResult? = nil,
        blockedReason: String? = nil
    ) {
        self.operationId = operationId
        self.kind = kind
        self.targetRef = targetRef
        self.state = state
        self.revision = revision
        self.requestedAt = requestedAt
        self.updatedAt = updatedAt
        self.steps = steps
        self.result = result
        self.blockedReason = blockedReason
    }
}

public struct OperationRef: Codable, Hashable, Sendable {
    public var operationId: String
    public var owner: String
    public var href: String
    public var state: String

    public init(
        operationId: String,
        owner: String,
        href: String,
        state: String
    ) {
        self.operationId = operationId
        self.owner = owner
        self.href = href
        self.state = state
    }
}

public struct OperationResult: Codable, Hashable, Sendable {
    public var projectId: String?
    public var incarnation: String?
    public var status: String?
    public var backend: String?
    public var environment: String?
    public var policyRevision: String?
    public var expiresAt: String?
    public var kind: String?
    public var resourceRef: ResourceRef?
    public var delivery: CredentialDelivery?
    public var keyId: String?
    public var endpointId: String?
    public var enabled: Bool?
    public var liveSessionCompletion: LiveSessionOperationCompletion?
    public var replayedDeliveries: Int?
    public var skippedDeliveries: Int?
    public var messagePreview: Bool?

    public init(
        projectId: String? = nil,
        incarnation: String? = nil,
        status: String? = nil,
        backend: String? = nil,
        environment: String? = nil,
        policyRevision: String? = nil,
        expiresAt: String? = nil,
        kind: String? = nil,
        resourceRef: ResourceRef? = nil,
        delivery: CredentialDelivery? = nil,
        keyId: String? = nil,
        endpointId: String? = nil,
        enabled: Bool? = nil,
        liveSessionCompletion: LiveSessionOperationCompletion? = nil,
        replayedDeliveries: Int? = nil,
        skippedDeliveries: Int? = nil,
        messagePreview: Bool? = nil
    ) {
        self.projectId = projectId
        self.incarnation = incarnation
        self.status = status
        self.backend = backend
        self.environment = environment
        self.policyRevision = policyRevision
        self.expiresAt = expiresAt
        self.kind = kind
        self.resourceRef = resourceRef
        self.delivery = delivery
        self.keyId = keyId
        self.endpointId = endpointId
        self.enabled = enabled
        self.liveSessionCompletion = liveSessionCompletion
        self.replayedDeliveries = replayedDeliveries
        self.skippedDeliveries = skippedDeliveries
        self.messagePreview = messagePreview
    }
}

public struct OperationStep: Codable, Hashable, Sendable {
    public var stepId: String
    public var state: String

    public init(
        stepId: String,
        state: String
    ) {
        self.stepId = stepId
        self.state = state
    }
}

public struct Organization: Codable, Hashable, Sendable {
    public var orgId: String
    public var name: String
    public var status: String
    public var revision: String

    public init(
        orgId: String,
        name: String,
        status: String,
        revision: String
    ) {
        self.orgId = orgId
        self.name = name
        self.status = status
        self.revision = revision
    }
}

public struct Principal: Codable, Hashable, Sendable {
    public var principalId: String
    public var externalUserId: String
    public var status: String
    public var revision: String

    public init(
        principalId: String,
        externalUserId: String,
        status: String,
        revision: String
    ) {
        self.principalId = principalId
        self.externalUserId = externalUserId
        self.status = status
        self.revision = revision
    }
}

public struct ReadReceipt: Codable, Hashable, Sendable {
    public var principalId: String
    public var membershipEpoch: String
    public var visibilityEpoch: String
    public var deliveredThroughSequence: String?
    public var readThroughSequence: String?
    public var updatedAt: String?

    public init(
        principalId: String,
        membershipEpoch: String,
        visibilityEpoch: String,
        deliveredThroughSequence: String? = nil,
        readThroughSequence: String? = nil,
        updatedAt: String? = nil
    ) {
        self.principalId = principalId
        self.membershipEpoch = membershipEpoch
        self.visibilityEpoch = visibilityEpoch
        self.deliveredThroughSequence = deliveredThroughSequence
        self.readThroughSequence = readThroughSequence
        self.updatedAt = updatedAt
    }
}

public struct ReceiptPage: Codable, Hashable, Sendable {
    public var items: [ReadReceipt]
    public var complete: Bool
    public var refreshRequired: Bool
    public var nextCursor: String?

    public init(
        items: [ReadReceipt],
        complete: Bool,
        refreshRequired: Bool,
        nextCursor: String? = nil
    ) {
        self.items = items
        self.complete = complete
        self.refreshRequired = refreshRequired
        self.nextCursor = nextCursor
    }
}

public struct ReceiptsReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: ReceiptPage?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: ReceiptPage? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct ReceiptsRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var limit: Int
    public var cursor: String?

    public init(
        conversationId: String,
        limit: Int,
        cursor: String? = nil
    ) {
        self.conversationId = conversationId
        self.limit = limit
        self.cursor = cursor
    }
}

public struct ReportReceiptReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: ReadReceipt?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: ReadReceipt? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct ReportReceiptRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var kind: String
    public var membershipEpoch: String
    public var visibilityEpoch: String
    public var throughSequence: String

    public init(
        conversationId: String,
        kind: String,
        membershipEpoch: String,
        visibilityEpoch: String,
        throughSequence: String
    ) {
        self.conversationId = conversationId
        self.kind = kind
        self.membershipEpoch = membershipEpoch
        self.visibilityEpoch = visibilityEpoch
        self.throughSequence = throughSequence
    }
}

public struct RequestContextInput: Codable, Hashable, Sendable {
    public var requestId: String
    public var projectId: String?
    public var incarnation: String?
    public var observedServingEpoch: String?
    public var credentialDeliveryPermit: JSONObject?

    public init(
        requestId: String,
        projectId: String? = nil,
        incarnation: String? = nil,
        observedServingEpoch: String? = nil,
        credentialDeliveryPermit: JSONObject? = nil
    ) {
        self.requestId = requestId
        self.projectId = projectId
        self.incarnation = incarnation
        self.observedServingEpoch = observedServingEpoch
        self.credentialDeliveryPermit = credentialDeliveryPermit
    }
}

public struct RequestResolution: Codable, Hashable, Sendable {
    public var state: String
    public var requestId: String
    public var checkedAt: String
    public var resultWithheld: Bool
    public var receipt: ResolvedReceipt?

    public init(
        state: String,
        requestId: String,
        checkedAt: String,
        resultWithheld: Bool,
        receipt: ResolvedReceipt? = nil
    ) {
        self.state = state
        self.requestId = requestId
        self.checkedAt = checkedAt
        self.resultWithheld = resultWithheld
        self.receipt = receipt
    }
}

public struct ResolveRequestReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: RequestResolution?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: RequestResolution? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct ResolveRequestRequestInput: Codable, Hashable, Sendable {
    public var requestId: String

    public init(
        requestId: String
    ) {
        self.requestId = requestId
    }
}

public struct ResolvedReceipt: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: RetainedResult?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: RetainedResult? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct ResourceRef: Codable, Hashable, Sendable {
    public var kind: String
    public var id: String

    public init(
        kind: String,
        id: String
    ) {
        self.kind = kind
        self.id = id
    }
}

/// Exactly one typed field contains the retained, currently authorized receipt result.
public struct RetainedResult: Codable, Hashable, Sendable {
    public var billingCheckoutSession: BillingCheckoutSession?
    public var billingPortalSession: BillingPortalSession?
    public var broadcastPermissionChanged: BroadcastPermissionChanged?
    public var conversation: Conversation?
    public var conversationMemberBatch: ConversationMemberBatch?
    public var conversationMute: ConversationMute?
    public var credentialDeliveryReceipt: CredentialDeliveryReceipt?
    public var deliveryAck: DeliveryAck?
    public var liveAlertBatch: LiveAlertBatch?
    public var liveCredentialIssuance: LiveCredentialIssuance?
    public var liveSessionEndRequested: LiveSessionEndRequested?
    public var liveSessionJoined: LiveSessionJoined?
    public var liveSessionLeft: LiveSessionLeft?
    public var liveSessionStarted: LiveSessionStarted?
    public var member: Member?
    public var message: Message?
    public var messageAck: MessageAck?
    public var organization: Organization?
    public var principal: Principal?
    public var readReceipt: ReadReceipt?
    public var sessionBootstrap: SessionBootstrap?
    public var sessionRevocation: SessionRevocation?
    public var signedProof: JSONObject?

    public init(
        billingCheckoutSession: BillingCheckoutSession? = nil,
        billingPortalSession: BillingPortalSession? = nil,
        broadcastPermissionChanged: BroadcastPermissionChanged? = nil,
        conversation: Conversation? = nil,
        conversationMemberBatch: ConversationMemberBatch? = nil,
        conversationMute: ConversationMute? = nil,
        credentialDeliveryReceipt: CredentialDeliveryReceipt? = nil,
        deliveryAck: DeliveryAck? = nil,
        liveAlertBatch: LiveAlertBatch? = nil,
        liveCredentialIssuance: LiveCredentialIssuance? = nil,
        liveSessionEndRequested: LiveSessionEndRequested? = nil,
        liveSessionJoined: LiveSessionJoined? = nil,
        liveSessionLeft: LiveSessionLeft? = nil,
        liveSessionStarted: LiveSessionStarted? = nil,
        member: Member? = nil,
        message: Message? = nil,
        messageAck: MessageAck? = nil,
        organization: Organization? = nil,
        principal: Principal? = nil,
        readReceipt: ReadReceipt? = nil,
        sessionBootstrap: SessionBootstrap? = nil,
        sessionRevocation: SessionRevocation? = nil,
        signedProof: JSONObject? = nil
    ) {
        self.billingCheckoutSession = billingCheckoutSession
        self.billingPortalSession = billingPortalSession
        self.broadcastPermissionChanged = broadcastPermissionChanged
        self.conversation = conversation
        self.conversationMemberBatch = conversationMemberBatch
        self.conversationMute = conversationMute
        self.credentialDeliveryReceipt = credentialDeliveryReceipt
        self.deliveryAck = deliveryAck
        self.liveAlertBatch = liveAlertBatch
        self.liveCredentialIssuance = liveCredentialIssuance
        self.liveSessionEndRequested = liveSessionEndRequested
        self.liveSessionJoined = liveSessionJoined
        self.liveSessionLeft = liveSessionLeft
        self.liveSessionStarted = liveSessionStarted
        self.member = member
        self.message = message
        self.messageAck = messageAck
        self.organization = organization
        self.principal = principal
        self.readReceipt = readReceipt
        self.sessionBootstrap = sessionBootstrap
        self.sessionRevocation = sessionRevocation
        self.signedProof = signedProof
    }
}

public struct RevokeSessionReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: SessionRevocation?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: SessionRevocation? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct RevokeSessionRequestInput: Codable, Hashable, Sendable {
    public var sessionId: String
    public var expectedRevision: String

    public init(
        sessionId: String,
        expectedRevision: String
    ) {
        self.sessionId = sessionId
        self.expectedRevision = expectedRevision
    }
}

public struct RouteReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: JSONObject?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: JSONObject? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct SearchHit: Codable, Hashable, Sendable {
    public var conversationId: String
    public var message: Message?

    public init(
        conversationId: String,
        message: Message? = nil
    ) {
        self.conversationId = conversationId
        self.message = message
    }
}

public struct SearchPage: Codable, Hashable, Sendable {
    public var items: [SearchHit]
    public var complete: Bool
    public var refreshRequired: Bool
    public var nextCursor: String?

    public init(
        items: [SearchHit],
        complete: Bool,
        refreshRequired: Bool,
        nextCursor: String? = nil
    ) {
        self.items = items
        self.complete = complete
        self.refreshRequired = refreshRequired
        self.nextCursor = nextCursor
    }
}

public struct SearchReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: SearchPage?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: SearchPage? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct SearchRequestInput: Codable, Hashable, Sendable {
    public var query: String
    public var pageSize: Int
    public var scope: SearchScopeInput?
    public var cursor: String?
    public var actAsPrincipalId: String?

    public init(
        query: String,
        pageSize: Int,
        scope: SearchScopeInput? = nil,
        cursor: String? = nil,
        actAsPrincipalId: String? = nil
    ) {
        self.query = query
        self.pageSize = pageSize
        self.scope = scope
        self.cursor = cursor
        self.actAsPrincipalId = actAsPrincipalId
    }
}

public struct SearchScopeInput: Codable, Hashable, Sendable {
    public var conversationIds: [String]

    public init(
        conversationIds: [String]
    ) {
        self.conversationIds = conversationIds
    }
}

public struct SendMessageReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: MessageAck?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: MessageAck? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct SendMessageRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var text: String
    public var props: JSONObject
    public var actAsPrincipalId: String?

    public init(
        conversationId: String,
        text: String,
        props: JSONObject,
        actAsPrincipalId: String? = nil
    ) {
        self.conversationId = conversationId
        self.text = text
        self.props = props
        self.actAsPrincipalId = actAsPrincipalId
    }
}

public struct Session: Codable, Hashable, Sendable {
    public var sessionId: String
    public var principalId: String
    public var deviceId: String
    public var incarnation: String
    public var sessionRevision: String
    public var expiresAt: String
    public var status: String

    public init(
        sessionId: String,
        principalId: String,
        deviceId: String,
        incarnation: String,
        sessionRevision: String,
        expiresAt: String,
        status: String
    ) {
        self.sessionId = sessionId
        self.principalId = principalId
        self.deviceId = deviceId
        self.incarnation = incarnation
        self.sessionRevision = sessionRevision
        self.expiresAt = expiresAt
        self.status = status
    }
}

public struct SessionBootstrap: Codable, Hashable, Sendable {
    public var session: Session?
    public var tokenExpiresAt: String
    public var sessionToken: String

    public init(
        session: Session? = nil,
        tokenExpiresAt: String,
        sessionToken: String
    ) {
        self.session = session
        self.tokenExpiresAt = tokenExpiresAt
        self.sessionToken = sessionToken
    }
}

public struct SessionRevocation: Codable, Hashable, Sendable {
    public var sessionId: String
    public var status: String
    public var mediaCutoff: MediaCutoff?

    public init(
        sessionId: String,
        status: String,
        mediaCutoff: MediaCutoff? = nil
    ) {
        self.sessionId = sessionId
        self.status = status
        self.mediaCutoff = mediaCutoff
    }
}

public struct SetConversationMuteInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var muted: Bool
    public var until: String?
    public var actAsPrincipalId: String?

    public init(
        conversationId: String,
        muted: Bool,
        until: String? = nil,
        actAsPrincipalId: String? = nil
    ) {
        self.conversationId = conversationId
        self.muted = muted
        self.until = until
        self.actAsPrincipalId = actAsPrincipalId
    }
}

public struct SetConversationMutePayload: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var receiptId: String
    public var committedAt: String
    public var replayed: Bool
    public var result: ConversationMute

    public init(
        status: String,
        requestId: String,
        receiptId: String,
        committedAt: String,
        replayed: Bool,
        result: ConversationMute
    ) {
        self.status = status
        self.requestId = requestId
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.result = result
    }
}

public struct StartLiveSessionInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var kind: LiveSessionKind
    public var mediaProfile: LiveMediaProfile

    public init(
        conversationId: String,
        kind: LiveSessionKind,
        mediaProfile: LiveMediaProfile
    ) {
        self.conversationId = conversationId
        self.kind = kind
        self.mediaProfile = mediaProfile
    }
}

public struct StartLiveSessionPayload: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var receiptId: String
    public var committedAt: String
    public var replayed: Bool
    public var operation: OperationRef
    public var result: LiveSessionStarted

    public init(
        status: String,
        requestId: String,
        receiptId: String,
        committedAt: String,
        replayed: Bool,
        operation: OperationRef,
        result: LiveSessionStarted
    ) {
        self.status = status
        self.requestId = requestId
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.result = result
    }
}

public struct TypingReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: TypingStatus?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: TypingStatus? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct TypingRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var isTyping: Bool

    public init(
        conversationId: String,
        isTyping: Bool
    ) {
        self.conversationId = conversationId
        self.isTyping = isTyping
    }
}

public struct TypingStatus: Codable, Hashable, Sendable {
    public var accepted: Bool

    public init(
        accepted: Bool
    ) {
        self.accepted = accepted
    }
}

public struct UpdateConversationReply: Codable, Hashable, Sendable {
    public var status: String
    public var requestId: String
    public var serverTime: String?
    public var receiptId: String?
    public var committedAt: String?
    public var replayed: Bool?
    public var operation: OperationRef?
    public var resourceRef: ResourceRef?
    public var result: Conversation?

    public init(
        status: String,
        requestId: String,
        serverTime: String? = nil,
        receiptId: String? = nil,
        committedAt: String? = nil,
        replayed: Bool? = nil,
        operation: OperationRef? = nil,
        resourceRef: ResourceRef? = nil,
        result: Conversation? = nil
    ) {
        self.status = status
        self.requestId = requestId
        self.serverTime = serverTime
        self.receiptId = receiptId
        self.committedAt = committedAt
        self.replayed = replayed
        self.operation = operation
        self.resourceRef = resourceRef
        self.result = result
    }
}

public struct UpdateConversationRequestInput: Codable, Hashable, Sendable {
    public var conversationId: String
    public var expectedRevision: String
    public var title: String?
    public var props: JSONObject?

    public init(
        conversationId: String,
        expectedRevision: String,
        title: String? = nil,
        props: JSONObject? = nil
    ) {
        self.conversationId = conversationId
        self.expectedRevision = expectedRevision
        self.title = title
        self.props = props
    }
}
