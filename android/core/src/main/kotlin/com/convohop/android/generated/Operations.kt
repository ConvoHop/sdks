// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/** What the runtime needs to send one operation, as listed in schema/operations.json. */
public class OperationDescriptor internal constructor(
    /** `<plane>.<field>`. */
    public val id: String,
    public val plane: String,
    /** `query`, `mutation` or `subscription`. */
    public val kind: String,
    public val field: String,
    public val operationName: String,
    public val document: String,
    /** The result type in GraphQL syntax. */
    public val resultType: String,
    public val contextArgument: String,
    /** How the operation uses each context field: `required`, `optional` or `forbidden`. */
    public val contextFields: Map<String, String>,
    public val inputArgument: String?,
    public val inputType: String?,
    public val inputRequired: Boolean,
    public val inputFields: List<String>,
    /** The idempotency class; see [Idempotency]. */
    public val idempotency: String,
    /** `client` or `both`. */
    public val layer: String,
    /** The realtime channel a subscription feeds. */
    public val realtimeChannel: String?,
)

/** A typed operation: its descriptor, input encoder and result decoder. */
public class OperationSpec<I, R> internal constructor(
    public val descriptor: OperationDescriptor,
    private val inputEncoder: (I) -> JsonObject?,
    private val resultDecoder: (JsonElement, String) -> R,
) {
    /** The input variable, or null when the operation takes none. */
    public fun encodeInput(input: I): JsonObject? = inputEncoder(input)

    /** Decodes `data.<field>`, throwing [ShapeException] when it does not match. */
    public fun decodeResult(element: JsonElement, path: String = descriptor.field): R = resultDecoder(element, path)
}

/** The client operations, grouped by plane. */
public object Operations {
    /** Client operations of the communication plane. */
    public object Communication {
        /** Describe the features, limits and API model the authority supports. */
        public val capabilities: OperationSpec<Unit, CapabilitiesReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.capabilities",
                    plane = "communication",
                    kind = "query",
                    field = "capabilities",
                    operationName = "CommunicationCapabilities",
                    document = "query CommunicationCapabilities(\$context: RequestContextInput!) {\n  capabilities(context: \$context) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      serverRelease\n      capabilityRevision\n      limitsRevision\n      features {\n        chat\n        inbox\n        lexicalSearch\n        typing\n        webhooks\n        liveSessions\n        liveBroadcast\n      }\n      limits {\n        key\n        value {\n          maximum\n          unit\n          scope\n          milliseconds\n          policyId\n          revision\n        }\n      }\n      environment\n      productionQualified\n      mediaPolicy {\n        leasePolicyId\n        maxLeaseMs\n        renewAttemptMs\n        preludeMaxBytes\n        preludeTimeoutMs\n        clockProfileId\n      }\n      geoControlAuthorityId\n      offerings\n      geos\n      installationProfiles\n      portalIdentity\n    }\n  }\n}",
                    resultType = "CapabilitiesReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "optional", "observedServingEpoch" to "optional", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = null,
                    inputType = null,
                    inputRequired = false,
                    inputFields = emptyList(),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { _ -> null },
                { element, path -> CapabilitiesReply.fromJson(element, path) },
            )

        /** Return the signed route: project incarnation, serving epoch and realtime endpoint. Call it before other communication operations and again after WRONG_REGION. */
        public val route: OperationSpec<Unit, RouteReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.route",
                    plane = "communication",
                    kind = "query",
                    field = "route",
                    operationName = "CommunicationRoute",
                    document = "query CommunicationRoute(\$context: RequestContextInput!) {\n  route(context: \$context) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result\n  }\n}",
                    resultType = "RouteReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "optional", "observedServingEpoch" to "optional", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = null,
                    inputType = null,
                    inputRequired = false,
                    inputFields = emptyList(),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { _ -> null },
                { element, path -> RouteReply.fromJson(element, path) },
            )

        /** Return the calling user session. */
        public val currentSession: OperationSpec<Unit, CurrentSessionReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.currentSession",
                    plane = "communication",
                    kind = "query",
                    field = "currentSession",
                    operationName = "CommunicationCurrentSession",
                    document = "query CommunicationCurrentSession(\$context: RequestContextInput!) {\n  currentSession(context: \$context) {\n    status\n    requestId\n    serverTime\n    result {\n      sessionId\n      principalId\n      deviceId\n      incarnation\n      sessionRevision\n      expiresAt\n      status\n    }\n  }\n}",
                    resultType = "CurrentSessionReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = null,
                    inputType = null,
                    inputRequired = false,
                    inputFields = emptyList(),
                    idempotency = "safe",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { _ -> null },
                { element, path -> CurrentSessionReply.fromJson(element, path) },
            )

        /** Read a conversation. */
        public val getConversation: OperationSpec<GetConversationRequestInput, GetConversationReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.getConversation",
                    plane = "communication",
                    kind = "query",
                    field = "getConversation",
                    operationName = "CommunicationGetConversation",
                    document = "query CommunicationGetConversation(\$context: RequestContextInput!, \$input: GetConversationRequestInput!) {\n  getConversation(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      conversationId\n      revision\n      title\n      props\n      latestSequence\n      membership {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n    }\n  }\n}",
                    resultType = "GetConversationReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "GetConversationRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> GetConversationReply.fromJson(element, path) },
            )

        /** List the members of a conversation. */
        public val members: OperationSpec<MembersRequestInput, MembersReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.members",
                    plane = "communication",
                    kind = "query",
                    field = "members",
                    operationName = "CommunicationMembers",
                    document = "query CommunicationMembers(\$context: RequestContextInput!, \$input: MembersRequestInput!) {\n  members(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
                    resultType = "MembersReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "MembersRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "limit", "cursor"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> MembersReply.fromJson(element, path) },
            )

        /** List the messages of a conversation, newest first. A backend key reads the full history, or the history visible to the member named by actAsPrincipalId. */
        public val messages: OperationSpec<MessagesRequestInput, MessagesReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.messages",
                    plane = "communication",
                    kind = "query",
                    field = "messages",
                    operationName = "CommunicationMessages",
                    document = "query CommunicationMessages(\$context: RequestContextInput!, \$input: MessagesRequestInput!) {\n  messages(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        messageId\n        conversationId\n        authorId\n        sequence\n        revision\n        revisionSequence\n        createdAt\n        deleted\n        text\n        props\n        editedAt\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
                    resultType = "MessagesReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "MessagesRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "limit", "beforeSequence", "actAsPrincipalId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> MessagesReply.fromJson(element, path) },
            )

        /** Read one message. A backend key reads any message, or reads as the member named by actAsPrincipalId. */
        public val getMessage: OperationSpec<GetMessageRequestInput, GetMessageReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.getMessage",
                    plane = "communication",
                    kind = "query",
                    field = "getMessage",
                    operationName = "CommunicationGetMessage",
                    document = "query CommunicationGetMessage(\$context: RequestContextInput!, \$input: GetMessageRequestInput!) {\n  getMessage(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      messageId\n      conversationId\n      authorId\n      sequence\n      revision\n      revisionSequence\n      createdAt\n      deleted\n      text\n      props\n      editedAt\n    }\n  }\n}",
                    resultType = "GetMessageReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "GetMessageRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "messageId", "actAsPrincipalId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> GetMessageReply.fromJson(element, path) },
            )

        /** Replay committed conversation events after a cursor, in sequence order. */
        public val events: OperationSpec<EventsRequestInput, EventsReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.events",
                    plane = "communication",
                    kind = "query",
                    field = "events",
                    operationName = "CommunicationEvents",
                    document = "query CommunicationEvents(\$context: RequestContextInput!, \$input: EventsRequestInput!) {\n  events(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        eventId\n        conversationId\n        sequence\n        type\n        occurredAt\n        subjectRef {\n          kind\n          id\n        }\n        payload {\n          messageId\n          revision\n          revisionSequence\n          principalId\n          membershipEpoch\n          visibilityEpoch\n          kind\n          throughSequence\n          callId\n          generation\n          state\n          cutoffEvidence\n          liveSessionId\n        }\n      }\n      complete\n      refreshRequired\n      nextCursor {\n        incarnation\n        conversationId\n        sequence\n      }\n    }\n  }\n}",
                    resultType = "EventsReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "EventsRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "limit", "after"),
                    idempotency = "safe",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> EventsReply.fromJson(element, path) },
            )

        /** List the delivery and read receipts of a conversation. */
        public val receipts: OperationSpec<ReceiptsRequestInput, ReceiptsReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.receipts",
                    plane = "communication",
                    kind = "query",
                    field = "receipts",
                    operationName = "CommunicationReceipts",
                    document = "query CommunicationReceipts(\$context: RequestContextInput!, \$input: ReceiptsRequestInput!) {\n  receipts(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        principalId\n        membershipEpoch\n        visibilityEpoch\n        deliveredThroughSequence\n        readThroughSequence\n        updatedAt\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
                    resultType = "ReceiptsReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "ReceiptsRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "limit", "cursor"),
                    idempotency = "safe",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> ReceiptsReply.fromJson(element, path) },
            )

        /** List the conversations visible to the calling user. A backend key must name that user with actAsPrincipalId. */
        public val inbox: OperationSpec<InboxRequestInput, InboxReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.inbox",
                    plane = "communication",
                    kind = "query",
                    field = "inbox",
                    operationName = "CommunicationInbox",
                    document = "query CommunicationInbox(\$context: RequestContextInput!, \$input: InboxRequestInput!) {\n  inbox(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        conversationId\n        title\n        activityAt\n        visibilityEpoch\n        latestVisibleMessage {\n          messageId\n          conversationId\n          authorId\n          sequence\n          revision\n          revisionSequence\n          createdAt\n          deleted\n          text\n          props\n          editedAt\n        }\n        hasUnread\n      }\n      complete\n      refreshRequired\n      nextCursor\n      partialReason\n    }\n  }\n}",
                    resultType = "InboxReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "InboxRequestInput",
                    inputRequired = true,
                    inputFields = listOf("limit", "cursor", "actAsPrincipalId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> InboxReply.fromJson(element, path) },
            )

        /** Search the messages visible to the calling user. A backend key searches as the member named by actAsPrincipalId, or within scope.conversationIds. */
        public val search: OperationSpec<SearchRequestInput, SearchReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.search",
                    plane = "communication",
                    kind = "query",
                    field = "search",
                    operationName = "CommunicationSearch",
                    document = "query CommunicationSearch(\$context: RequestContextInput!, \$input: SearchRequestInput!) {\n  search(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      items {\n        conversationId\n        message {\n          messageId\n          conversationId\n          authorId\n          sequence\n          revision\n          revisionSequence\n          createdAt\n          deleted\n          text\n          props\n          editedAt\n        }\n      }\n      complete\n      refreshRequired\n      nextCursor\n    }\n  }\n}",
                    resultType = "SearchReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "SearchRequestInput",
                    inputRequired = true,
                    inputFields = listOf("query", "pageSize", "scope", "cursor", "actAsPrincipalId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> SearchReply.fromJson(element, path) },
            )

        /** Look up the stored outcome of an earlier communication mutation by its requestId. */
        public val resolveRequest: OperationSpec<ResolveRequestRequestInput, ResolveRequestReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.resolveRequest",
                    plane = "communication",
                    kind = "query",
                    field = "resolveRequest",
                    operationName = "CommunicationResolveRequest",
                    document = "query CommunicationResolveRequest(\$context: RequestContextInput!, \$input: ResolveRequestRequestInput!) {\n  resolveRequest(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      state\n      requestId\n      checkedAt\n      resultWithheld\n      receipt {\n        status\n        requestId\n        serverTime\n        receiptId\n        committedAt\n        replayed\n        operation {\n          operationId\n          owner\n          href\n          state\n        }\n        resourceRef {\n          kind\n          id\n        }\n        result {\n          broadcastPermissionChanged {\n            member {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          conversation {\n            conversationId\n            revision\n            title\n            props\n            latestSequence\n            membership {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n          }\n          conversationMemberBatch {\n            items {\n              conversationId\n              principalId\n              role\n              status\n              membershipEpoch\n              visibilityEpoch\n              revision\n              visibleFromSequence\n              canStartBroadcast\n            }\n          }\n          conversationMute {\n            conversationId\n            principalId\n            muted\n            until\n          }\n          credentialDeliveryReceipt {\n            deliveryId\n          }\n          deliveryAck {\n            deliveryId\n            acknowledged\n          }\n          liveAlertBatch {\n            liveSessionId\n            created\n            suppressed\n          }\n          liveCredentialIssuance {\n            liveSessionId\n            participationId\n            generation\n            leaseId\n            grantOrdinal\n            admissionExpiresAt\n            leaseExpiresAt\n          }\n          liveSessionEndRequested {\n            liveSessionId\n            operationId\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          liveSessionJoined {\n            liveSessionId\n            generation\n            participation {\n              participationId\n              principalId\n              membershipEpoch\n              role\n              state\n              permissions {\n                microphone\n                camera\n                subscribe\n              }\n              reservationExpiresAt\n              nativeConnectionId\n              mediaCutoff {\n                state\n                scope {\n                  kind\n                  liveSessionId\n                  generation\n                  participationId\n                }\n                evidence\n                enforcedAt\n                operationId\n              }\n            }\n          }\n          liveSessionLeft {\n            liveSessionId\n            participationId\n            mediaCutoff {\n              state\n              scope {\n                kind\n                liveSessionId\n                generation\n                participationId\n              }\n              evidence\n              enforcedAt\n              operationId\n            }\n          }\n          liveSessionStarted {\n            liveSessionId\n            conversationId\n            kind\n            mediaProfile\n            operationId\n          }\n          member {\n            conversationId\n            principalId\n            role\n            status\n            membershipEpoch\n            visibilityEpoch\n            revision\n            visibleFromSequence\n            canStartBroadcast\n          }\n          message {\n            messageId\n            conversationId\n            authorId\n            sequence\n            revision\n            revisionSequence\n            createdAt\n            deleted\n            text\n            props\n            editedAt\n          }\n          messageAck {\n            messageId\n            conversationId\n            sequence\n            revision\n            status\n            cursor {\n              incarnation\n              conversationId\n              sequence\n            }\n          }\n          organization {\n            orgId\n            name\n            status\n            revision\n          }\n          principal {\n            principalId\n            externalUserId\n            status\n            revision\n          }\n          readReceipt {\n            principalId\n            membershipEpoch\n            visibilityEpoch\n            deliveredThroughSequence\n            readThroughSequence\n            updatedAt\n          }\n          sessionBootstrap {\n            session {\n              sessionId\n              principalId\n              deviceId\n              incarnation\n              sessionRevision\n              expiresAt\n              status\n            }\n            tokenExpiresAt\n            sessionToken\n          }\n          sessionRevocation {\n            sessionId\n            status\n            mediaCutoff {\n              state\n              scope {\n                kind\n                principalId\n                sessionId\n                deviceId\n                callId\n              }\n            }\n          }\n          signedProof\n        }\n      }\n    }\n  }\n}",
                    resultType = "ResolveRequestReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "ResolveRequestRequestInput",
                    inputRequired = true,
                    inputFields = listOf("requestId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> ResolveRequestReply.fromJson(element, path) },
            )

        /** Read the state of a long-running communication operation. */
        public val getOperation: OperationSpec<GetOperationRequestInput, GetOperationReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.getOperation",
                    plane = "communication",
                    kind = "query",
                    field = "getOperation",
                    operationName = "CommunicationGetOperation",
                    document = "query CommunicationGetOperation(\$context: RequestContextInput!, \$input: GetOperationRequestInput!) {\n  getOperation(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      operationId\n      kind\n      targetRef {\n        kind\n        id\n      }\n      state\n      revision\n      requestedAt\n      updatedAt\n      steps {\n        stepId\n        state\n      }\n      result {\n        projectId\n        incarnation\n        status\n        backend\n        environment\n        policyRevision\n        expiresAt\n        kind\n        resourceRef {\n          kind\n          id\n        }\n        delivery {\n          deliveryId\n          kind\n          projectId\n          installationId\n          resourceRef {\n            kind\n            id\n          }\n          expiresAt\n          payloadDigest\n          recipientActorRef {\n            tenantId\n            objectId\n          }\n        }\n        keyId\n        endpointId\n        enabled\n        liveSessionCompletion {\n          liveSessionId\n          generation\n          state\n          revision\n          completedAt\n          mediaCutoff {\n            state\n            scope {\n              kind\n              liveSessionId\n              generation\n              participationId\n            }\n            evidence\n            enforcedAt\n            operationId\n          }\n        }\n        replayedDeliveries\n        skippedDeliveries\n        messagePreview\n      }\n      blockedReason\n    }\n  }\n}",
                    resultType = "GetOperationReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "GetOperationRequestInput",
                    inputRequired = true,
                    inputFields = listOf("operationId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> GetOperationReply.fromJson(element, path) },
            )

        /** Read whether a member has muted message push notifications for a conversation. A backend key must name the member with actAsPrincipalId. */
        public val conversationMute: OperationSpec<ConversationMuteInput, ConversationMuteReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.conversationMute",
                    plane = "communication",
                    kind = "query",
                    field = "conversationMute",
                    operationName = "CommunicationConversationMute",
                    document = "query CommunicationConversationMute(\$context: RequestContextInput!, \$input: ConversationMuteInput!) {\n  conversationMute(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    result {\n      conversationId\n      principalId\n      muted\n      until\n    }\n  }\n}",
                    resultType = "ConversationMuteReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "ConversationMuteInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "actAsPrincipalId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> ConversationMuteReply.fromJson(element, path) },
            )

        /** Return the active live session of a conversation, if any. */
        public val currentLiveSession: OperationSpec<ConversationLiveInput, CurrentLiveSessionReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.currentLiveSession",
                    plane = "communication",
                    kind = "query",
                    field = "currentLiveSession",
                    operationName = "CommunicationCurrentLiveSession",
                    document = "query CommunicationCurrentLiveSession(\$context: RequestContextInput!, \$input: ConversationLiveInput!) {\n  currentLiveSession(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    result {\n      liveSessionId\n      conversationId\n      creatorId\n      kind\n      mediaProfile\n      state\n      generation\n      revision\n      createdAt\n      expiresAt\n      myParticipation {\n        participationId\n        principalId\n        membershipEpoch\n        role\n        state\n        permissions {\n          microphone\n          camera\n          subscribe\n        }\n        reservationExpiresAt\n        nativeConnectionId\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
                    resultType = "CurrentLiveSessionReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "ConversationLiveInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> CurrentLiveSessionReply.fromJson(element, path) },
            )

        /** Read a live session. */
        public val liveSession: OperationSpec<LiveSessionInput, LiveSessionReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.liveSession",
                    plane = "communication",
                    kind = "query",
                    field = "liveSession",
                    operationName = "CommunicationLiveSession",
                    document = "query CommunicationLiveSession(\$context: RequestContextInput!, \$input: LiveSessionInput!) {\n  liveSession(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    result {\n      liveSessionId\n      conversationId\n      creatorId\n      kind\n      mediaProfile\n      state\n      generation\n      revision\n      createdAt\n      expiresAt\n      myParticipation {\n        participationId\n        principalId\n        membershipEpoch\n        role\n        state\n        permissions {\n          microphone\n          camera\n          subscribe\n        }\n        reservationExpiresAt\n        nativeConnectionId\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
                    resultType = "LiveSessionReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "LiveSessionInput",
                    inputRequired = true,
                    inputFields = listOf("liveSessionId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> LiveSessionReply.fromJson(element, path) },
            )

        /** List the live sessions of a conversation. */
        public val liveSessions: OperationSpec<LiveSessionsInput, LiveSessionPageReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.liveSessions",
                    plane = "communication",
                    kind = "query",
                    field = "liveSessions",
                    operationName = "CommunicationLiveSessions",
                    document = "query CommunicationLiveSessions(\$context: RequestContextInput!, \$input: LiveSessionsInput!) {\n  liveSessions(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    result {\n      items {\n        liveSessionId\n        conversationId\n        creatorId\n        kind\n        mediaProfile\n        state\n        generation\n        revision\n        createdAt\n        expiresAt\n        myParticipation {\n          participationId\n          principalId\n          membershipEpoch\n          role\n          state\n          permissions {\n            microphone\n            camera\n            subscribe\n          }\n          reservationExpiresAt\n          nativeConnectionId\n          mediaCutoff {\n            state\n            scope {\n              kind\n              liveSessionId\n              generation\n              participationId\n            }\n            evidence\n            enforcedAt\n            operationId\n          }\n        }\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      nextCursor\n      complete\n      partialReason\n      refreshRequired\n    }\n  }\n}",
                    resultType = "LiveSessionPageReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "LiveSessionsInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "limit", "cursor"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> LiveSessionPageReply.fromJson(element, path) },
            )

        /** List the participants of a live session. */
        public val liveSessionParticipants: OperationSpec<LiveParticipantsInput, LiveParticipantPageReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.liveSessionParticipants",
                    plane = "communication",
                    kind = "query",
                    field = "liveSessionParticipants",
                    operationName = "CommunicationLiveSessionParticipants",
                    document = "query CommunicationLiveSessionParticipants(\$context: RequestContextInput!, \$input: LiveParticipantsInput!) {\n  liveSessionParticipants(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    result {\n      items {\n        participationId\n        principalId\n        membershipEpoch\n        role\n        state\n        permissions {\n          microphone\n          camera\n          subscribe\n        }\n        reservationExpiresAt\n        nativeConnectionId\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      nextCursor\n      complete\n      partialReason\n      refreshRequired\n    }\n  }\n}",
                    resultType = "LiveParticipantPageReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "LiveParticipantsInput",
                    inputRequired = true,
                    inputFields = listOf("liveSessionId", "limit", "cursor"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> LiveParticipantPageReply.fromJson(element, path) },
            )

        /** List the live session alerts addressed to the calling user. */
        public val liveSessionAlerts: OperationSpec<LiveAlertsInput, LiveAlertPageReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.liveSessionAlerts",
                    plane = "communication",
                    kind = "query",
                    field = "liveSessionAlerts",
                    operationName = "CommunicationLiveSessionAlerts",
                    document = "query CommunicationLiveSessionAlerts(\$context: RequestContextInput!, \$input: LiveAlertsInput!) {\n  liveSessionAlerts(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    result {\n      items {\n        alertId\n        liveSessionId\n        conversationId\n        generation\n        membershipEpoch\n        createdAt\n        expiresAt\n      }\n      nextCursor\n      complete\n      partialReason\n      refreshRequired\n    }\n  }\n}",
                    resultType = "LiveAlertPageReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "LiveAlertsInput",
                    inputRequired = true,
                    inputFields = listOf("limit", "cursor"),
                    idempotency = "safe",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> LiveAlertPageReply.fromJson(element, path) },
            )

        /** Read the state of a live session start or end operation. */
        public val liveSessionOperation: OperationSpec<LiveSessionOperationInput, LiveSessionOperationReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.liveSessionOperation",
                    plane = "communication",
                    kind = "query",
                    field = "liveSessionOperation",
                    operationName = "CommunicationLiveSessionOperation",
                    document = "query CommunicationLiveSessionOperation(\$context: RequestContextInput!, \$input: LiveSessionOperationInput!) {\n  liveSessionOperation(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    result {\n      operationId\n      requestId\n      liveSessionId\n      kind\n      state\n      revision\n      requestedAt\n      completedAt\n      completion {\n        liveSessionId\n        generation\n        state\n        revision\n        completedAt\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n      failure {\n        code\n        message\n      }\n    }\n  }\n}",
                    resultType = "LiveSessionOperationReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "LiveSessionOperationInput",
                    inputRequired = true,
                    inputFields = listOf("operationId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> LiveSessionOperationReply.fromJson(element, path) },
            )

        /** Revoke a user session. */
        public val revokeSession: OperationSpec<RevokeSessionRequestInput, RevokeSessionReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.revokeSession",
                    plane = "communication",
                    kind = "mutation",
                    field = "revokeSession",
                    operationName = "CommunicationRevokeSession",
                    document = "mutation CommunicationRevokeSession(\$context: RequestContextInput!, \$input: RevokeSessionRequestInput!) {\n  revokeSession(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      sessionId\n      status\n      mediaCutoff {\n        state\n        scope {\n          kind\n          principalId\n          sessionId\n          deviceId\n          callId\n        }\n      }\n    }\n  }\n}",
                    resultType = "RevokeSessionReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "RevokeSessionRequestInput",
                    inputRequired = true,
                    inputFields = listOf("sessionId", "expectedRevision"),
                    idempotency = "idempotent",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> RevokeSessionReply.fromJson(element, path) },
            )

        /** Update the title or properties of a conversation. */
        public val updateConversation: OperationSpec<UpdateConversationRequestInput, UpdateConversationReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.updateConversation",
                    plane = "communication",
                    kind = "mutation",
                    field = "updateConversation",
                    operationName = "CommunicationUpdateConversation",
                    document = "mutation CommunicationUpdateConversation(\$context: RequestContextInput!, \$input: UpdateConversationRequestInput!) {\n  updateConversation(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      conversationId\n      revision\n      title\n      props\n      latestSequence\n      membership {\n        conversationId\n        principalId\n        role\n        status\n        membershipEpoch\n        visibilityEpoch\n        revision\n        visibleFromSequence\n        canStartBroadcast\n      }\n    }\n  }\n}",
                    resultType = "UpdateConversationReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "UpdateConversationRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "expectedRevision", "title", "props"),
                    idempotency = "idempotent",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> UpdateConversationReply.fromJson(element, path) },
            )

        /** Send a message. A backend key sends as its service principal, or as the member named by actAsPrincipalId. */
        public val sendMessage: OperationSpec<SendMessageRequestInput, SendMessageReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.sendMessage",
                    plane = "communication",
                    kind = "mutation",
                    field = "sendMessage",
                    operationName = "CommunicationSendMessage",
                    document = "mutation CommunicationSendMessage(\$context: RequestContextInput!, \$input: SendMessageRequestInput!) {\n  sendMessage(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      messageId\n      conversationId\n      sequence\n      revision\n      status\n      cursor {\n        incarnation\n        conversationId\n        sequence\n      }\n    }\n  }\n}",
                    resultType = "SendMessageReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "SendMessageRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "text", "props", "actAsPrincipalId"),
                    idempotency = "idempotent",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> SendMessageReply.fromJson(element, path) },
            )

        /** Edit a message. */
        public val editMessage: OperationSpec<EditMessageRequestInput, EditMessageReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.editMessage",
                    plane = "communication",
                    kind = "mutation",
                    field = "editMessage",
                    operationName = "CommunicationEditMessage",
                    document = "mutation CommunicationEditMessage(\$context: RequestContextInput!, \$input: EditMessageRequestInput!) {\n  editMessage(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      messageId\n      conversationId\n      authorId\n      sequence\n      revision\n      revisionSequence\n      createdAt\n      deleted\n      text\n      props\n      editedAt\n    }\n  }\n}",
                    resultType = "EditMessageReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "EditMessageRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "messageId", "expectedRevision", "text", "props"),
                    idempotency = "idempotent",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> EditMessageReply.fromJson(element, path) },
            )

        /** Delete a message. */
        public val deleteMessage: OperationSpec<DeleteMessageRequestInput, DeleteMessageReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.deleteMessage",
                    plane = "communication",
                    kind = "mutation",
                    field = "deleteMessage",
                    operationName = "CommunicationDeleteMessage",
                    document = "mutation CommunicationDeleteMessage(\$context: RequestContextInput!, \$input: DeleteMessageRequestInput!) {\n  deleteMessage(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      messageId\n      conversationId\n      authorId\n      sequence\n      revision\n      revisionSequence\n      createdAt\n      deleted\n      text\n      props\n      editedAt\n    }\n  }\n}",
                    resultType = "DeleteMessageReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "DeleteMessageRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "messageId", "expectedRevision"),
                    idempotency = "idempotent",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> DeleteMessageReply.fromJson(element, path) },
            )

        /** Report delivery or read progress through a sequence. */
        public val reportReceipt: OperationSpec<ReportReceiptRequestInput, ReportReceiptReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.reportReceipt",
                    plane = "communication",
                    kind = "mutation",
                    field = "reportReceipt",
                    operationName = "CommunicationReportReceipt",
                    document = "mutation CommunicationReportReceipt(\$context: RequestContextInput!, \$input: ReportReceiptRequestInput!) {\n  reportReceipt(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      principalId\n      membershipEpoch\n      visibilityEpoch\n      deliveredThroughSequence\n      readThroughSequence\n      updatedAt\n    }\n  }\n}",
                    resultType = "ReportReceiptReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "ReportReceiptRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "kind", "membershipEpoch", "visibilityEpoch", "throughSequence"),
                    idempotency = "idempotent",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> ReportReceiptReply.fromJson(element, path) },
            )

        /** Send an ephemeral typing signal. */
        public val typing: OperationSpec<TypingRequestInput, TypingReply> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.typing",
                    plane = "communication",
                    kind = "mutation",
                    field = "typing",
                    operationName = "CommunicationTyping",
                    document = "mutation CommunicationTyping(\$context: RequestContextInput!, \$input: TypingRequestInput!) {\n  typing(context: \$context, input: \$input) {\n    status\n    requestId\n    serverTime\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    resourceRef {\n      kind\n      id\n    }\n    result {\n      accepted\n    }\n  }\n}",
                    resultType = "TypingReply!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "TypingRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "isTyping"),
                    idempotency = "ephemeral",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> TypingReply.fromJson(element, path) },
            )

        /** Mute or unmute message push notifications for a member of a conversation, optionally until a time. Calls still ring. A backend key must name the member with actAsPrincipalId. */
        public val setConversationMute: OperationSpec<SetConversationMuteInput, SetConversationMutePayload> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.setConversationMute",
                    plane = "communication",
                    kind = "mutation",
                    field = "setConversationMute",
                    operationName = "CommunicationSetConversationMute",
                    document = "mutation CommunicationSetConversationMute(\$context: RequestContextInput!, \$input: SetConversationMuteInput!) {\n  setConversationMute(context: \$context, input: \$input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      conversationId\n      principalId\n      muted\n      until\n    }\n  }\n}",
                    resultType = "SetConversationMutePayload!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "SetConversationMuteInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "muted", "until", "actAsPrincipalId"),
                    idempotency = "idempotent",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> SetConversationMutePayload.fromJson(element, path) },
            )

        /** Start a live session (a call) in a conversation. Readiness completes asynchronously. */
        public val startLiveSession: OperationSpec<StartLiveSessionInput, StartLiveSessionPayload> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.startLiveSession",
                    plane = "communication",
                    kind = "mutation",
                    field = "startLiveSession",
                    operationName = "CommunicationStartLiveSession",
                    document = "mutation CommunicationStartLiveSession(\$context: RequestContextInput!, \$input: StartLiveSessionInput!) {\n  startLiveSession(context: \$context, input: \$input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    result {\n      liveSessionId\n      conversationId\n      kind\n      mediaProfile\n      operationId\n    }\n  }\n}",
                    resultType = "StartLiveSessionPayload!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "StartLiveSessionInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "kind", "mediaProfile"),
                    idempotency = "idempotent",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> StartLiveSessionPayload.fromJson(element, path) },
            )

        /** Join a live session. */
        public val joinLiveSession: OperationSpec<JoinLiveSessionInput, JoinLiveSessionPayload> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.joinLiveSession",
                    plane = "communication",
                    kind = "mutation",
                    field = "joinLiveSession",
                    operationName = "CommunicationJoinLiveSession",
                    document = "mutation CommunicationJoinLiveSession(\$context: RequestContextInput!, \$input: JoinLiveSessionInput!) {\n  joinLiveSession(context: \$context, input: \$input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      liveSessionId\n      generation\n      participation {\n        participationId\n        principalId\n        membershipEpoch\n        role\n        state\n        permissions {\n          microphone\n          camera\n          subscribe\n        }\n        reservationExpiresAt\n        nativeConnectionId\n        mediaCutoff {\n          state\n          scope {\n            kind\n            liveSessionId\n            generation\n            participationId\n          }\n          evidence\n          enforcedAt\n          operationId\n        }\n      }\n    }\n  }\n}",
                    resultType = "JoinLiveSessionPayload!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "JoinLiveSessionInput",
                    inputRequired = true,
                    inputFields = listOf("liveSessionId", "expectedGeneration"),
                    idempotency = "idempotent",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> JoinLiveSessionPayload.fromJson(element, path) },
            )

        /** Alert (ring) conversation members about a live session. */
        public val alertLiveSession: OperationSpec<AlertLiveSessionInput, AlertLiveSessionPayload> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.alertLiveSession",
                    plane = "communication",
                    kind = "mutation",
                    field = "alertLiveSession",
                    operationName = "CommunicationAlertLiveSession",
                    document = "mutation CommunicationAlertLiveSession(\$context: RequestContextInput!, \$input: AlertLiveSessionInput!) {\n  alertLiveSession(context: \$context, input: \$input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      liveSessionId\n      created\n      suppressed\n    }\n  }\n}",
                    resultType = "AlertLiveSessionPayload!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "AlertLiveSessionInput",
                    inputRequired = true,
                    inputFields = listOf("liveSessionId", "expectedGeneration", "principalIds"),
                    idempotency = "idempotent",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> AlertLiveSessionPayload.fromJson(element, path) },
            )

        /** Leave a live session. */
        public val leaveLiveSession: OperationSpec<LeaveLiveSessionInput, LeaveLiveSessionPayload> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.leaveLiveSession",
                    plane = "communication",
                    kind = "mutation",
                    field = "leaveLiveSession",
                    operationName = "CommunicationLeaveLiveSession",
                    document = "mutation CommunicationLeaveLiveSession(\$context: RequestContextInput!, \$input: LeaveLiveSessionInput!) {\n  leaveLiveSession(context: \$context, input: \$input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      liveSessionId\n      participationId\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
                    resultType = "LeaveLiveSessionPayload!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "LeaveLiveSessionInput",
                    inputRequired = true,
                    inputFields = listOf("liveSessionId", "expectedGeneration", "participationId"),
                    idempotency = "idempotent",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> LeaveLiveSessionPayload.fromJson(element, path) },
            )

        /** End a live session for every participant. Completes asynchronously. */
        public val endLiveSession: OperationSpec<EndLiveSessionInput, EndLiveSessionPayload> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.endLiveSession",
                    plane = "communication",
                    kind = "mutation",
                    field = "endLiveSession",
                    operationName = "CommunicationEndLiveSession",
                    document = "mutation CommunicationEndLiveSession(\$context: RequestContextInput!, \$input: EndLiveSessionInput!) {\n  endLiveSession(context: \$context, input: \$input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    operation {\n      operationId\n      owner\n      href\n      state\n    }\n    result {\n      liveSessionId\n      operationId\n      mediaCutoff {\n        state\n        scope {\n          kind\n          liveSessionId\n          generation\n          participationId\n        }\n        evidence\n        enforcedAt\n        operationId\n      }\n    }\n  }\n}",
                    resultType = "EndLiveSessionPayload!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "EndLiveSessionInput",
                    inputRequired = true,
                    inputFields = listOf("liveSessionId", "expectedGeneration", "expectedRevision"),
                    idempotency = "idempotent",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> EndLiveSessionPayload.fromJson(element, path) },
            )

        /** Obtain a media credential for one connection of the caller's participation. */
        public val liveSessionCredentials: OperationSpec<LiveSessionCredentialsInput, LiveSessionCredentialsPayload> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.liveSessionCredentials",
                    plane = "communication",
                    kind = "mutation",
                    field = "liveSessionCredentials",
                    operationName = "CommunicationLiveSessionCredentials",
                    document = "mutation CommunicationLiveSessionCredentials(\$context: RequestContextInput!, \$input: LiveSessionCredentialsInput!) {\n  liveSessionCredentials(context: \$context, input: \$input) {\n    status\n    requestId\n    receiptId\n    committedAt\n    replayed\n    result {\n      liveSessionId\n      participationId\n      generation\n      roomName\n      participantIdentity\n      livekitUrl\n      transportToken\n      admissionTicket\n      forwardingLease\n      transportExpiresAt\n      admissionExpiresAt\n      leaseExpiresAt\n      leasePolicyId\n      connectToken\n    }\n  }\n}",
                    resultType = "LiveSessionCredentialsPayload!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "LiveSessionCredentialsInput",
                    inputRequired = true,
                    inputFields = listOf("liveSessionId", "participationId", "expectedGeneration", "mode", "replacementOfConnectionId"),
                    idempotency = "singleUse",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> LiveSessionCredentialsPayload.fromJson(element, path) },
            )

        /** Subscribe to conversation events in sequence order, resuming after a cursor. */
        public val conversationEvents: OperationSpec<EventsRequestInput, EventPage> =
            OperationSpec(
                OperationDescriptor(
                    id = "communication.conversationEvents",
                    plane = "communication",
                    kind = "subscription",
                    field = "conversationEvents",
                    operationName = "CommunicationConversationEvents",
                    document = "subscription CommunicationConversationEvents(\$context: RequestContextInput!, \$input: EventsRequestInput!) {\n  conversationEvents(context: \$context, input: \$input) {\n    items {\n      eventId\n      conversationId\n      sequence\n      type\n      occurredAt\n      subjectRef {\n        kind\n        id\n      }\n      payload {\n        messageId\n        revision\n        revisionSequence\n        principalId\n        membershipEpoch\n        visibilityEpoch\n        kind\n        throughSequence\n        callId\n        generation\n        state\n        cutoffEvidence\n        liveSessionId\n      }\n    }\n    complete\n    refreshRequired\n    nextCursor {\n      incarnation\n      conversationId\n      sequence\n    }\n  }\n}",
                    resultType = "EventPage!",
                    contextArgument = "context",
                    contextFields = mapOf("requestId" to "required", "projectId" to "required", "incarnation" to "required", "observedServingEpoch" to "required", "credentialDeliveryPermit" to "forbidden"),
                    inputArgument = "input",
                    inputType = "EventsRequestInput",
                    inputRequired = true,
                    inputFields = listOf("conversationId", "limit", "after"),
                    idempotency = "safe",
                    layer = "client",
                    realtimeChannel = "conversationEvents",
                ),
                { input -> input.toJson() },
                { element, path -> EventPage.fromJson(element, path) },
            )
    }

    /** Every client operation, in schema order. */
    public val all: List<OperationSpec<*, *>> =
        listOf(
            Communication.capabilities,
            Communication.route,
            Communication.currentSession,
            Communication.getConversation,
            Communication.members,
            Communication.messages,
            Communication.getMessage,
            Communication.events,
            Communication.receipts,
            Communication.inbox,
            Communication.search,
            Communication.resolveRequest,
            Communication.getOperation,
            Communication.conversationMute,
            Communication.currentLiveSession,
            Communication.liveSession,
            Communication.liveSessions,
            Communication.liveSessionParticipants,
            Communication.liveSessionAlerts,
            Communication.liveSessionOperation,
            Communication.revokeSession,
            Communication.updateConversation,
            Communication.sendMessage,
            Communication.editMessage,
            Communication.deleteMessage,
            Communication.reportReceipt,
            Communication.typing,
            Communication.setConversationMute,
            Communication.startLiveSession,
            Communication.joinLiveSession,
            Communication.alertLiveSession,
            Communication.leaveLiveSession,
            Communication.endLiveSession,
            Communication.liveSessionCredentials,
            Communication.conversationEvents,
        )

    /** [all], keyed by operation id. */
    public val byId: Map<String, OperationSpec<*, *>> = all.associateBy { it.descriptor.id }
}
