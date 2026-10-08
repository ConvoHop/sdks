// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

public data class AlertLiveSessionInput(
    public val liveSessionId: String,
    public val expectedGeneration: String,
    public val principalIds: List<String>,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["liveSessionId"] = Scalars.encodeUUID(this.liveSessionId)
        __fields["expectedGeneration"] = Scalars.encodeDecimal(this.expectedGeneration)
        __fields["principalIds"] = JsonArray(this.principalIds.map { v0 -> Scalars.encodeUUID(v0) })
        return JsonObject(__fields)
    }
}

public data class ConversationLiveInput(
    public val conversationId: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        return JsonObject(__fields)
    }
}

public data class ConversationMuteInput(
    public val conversationId: String,
    public val actAsPrincipalId: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        this.actAsPrincipalId?.let { v0 -> __fields["actAsPrincipalId"] = Scalars.encodeUUID(v0) }
        return JsonObject(__fields)
    }
}

public data class CursorInput(
    public val incarnation: String,
    public val conversationId: String,
    public val sequence: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["incarnation"] = Scalars.encodeUUID(this.incarnation)
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["sequence"] = Scalars.encodeDecimal(this.sequence)
        return JsonObject(__fields)
    }
}

public data class DeleteMessageRequestInput(
    public val conversationId: String,
    public val messageId: String,
    public val expectedRevision: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["messageId"] = Scalars.encodeUUID(this.messageId)
        __fields["expectedRevision"] = Scalars.encodeDecimal(this.expectedRevision)
        return JsonObject(__fields)
    }
}

public data class EditMessageRequestInput(
    public val conversationId: String,
    public val messageId: String,
    public val expectedRevision: String,
    public val text: String? = null,
    public val props: JsonObject? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["messageId"] = Scalars.encodeUUID(this.messageId)
        __fields["expectedRevision"] = Scalars.encodeDecimal(this.expectedRevision)
        this.text?.let { v0 -> __fields["text"] = JsonPrimitive(v0) }
        this.props?.let { v0 -> __fields["props"] = Scalars.encodeProperties(v0) }
        return JsonObject(__fields)
    }
}

public data class EndLiveSessionInput(
    public val liveSessionId: String,
    public val expectedGeneration: String,
    public val expectedRevision: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["liveSessionId"] = Scalars.encodeUUID(this.liveSessionId)
        __fields["expectedGeneration"] = Scalars.encodeDecimal(this.expectedGeneration)
        __fields["expectedRevision"] = Scalars.encodeDecimal(this.expectedRevision)
        return JsonObject(__fields)
    }
}

public data class EventsRequestInput(
    public val conversationId: String,
    public val limit: Int,
    public val after: CursorInput? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["limit"] = Scalars.encodePageSize(this.limit)
        this.after?.let { v0 -> __fields["after"] = v0.toJson() }
        return JsonObject(__fields)
    }
}

public data class GetConversationRequestInput(
    public val conversationId: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        return JsonObject(__fields)
    }
}

public data class GetMessageRequestInput(
    public val conversationId: String,
    public val messageId: String,
    public val actAsPrincipalId: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["messageId"] = Scalars.encodeUUID(this.messageId)
        this.actAsPrincipalId?.let { v0 -> __fields["actAsPrincipalId"] = Scalars.encodeUUID(v0) }
        return JsonObject(__fields)
    }
}

public data class GetOperationRequestInput(
    public val operationId: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["operationId"] = Scalars.encodeUUID(this.operationId)
        return JsonObject(__fields)
    }
}

public data class InboxRequestInput(
    public val limit: Int,
    public val cursor: String? = null,
    public val actAsPrincipalId: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["limit"] = Scalars.encodePageSize(this.limit)
        this.cursor?.let { v0 -> __fields["cursor"] = JsonPrimitive(v0) }
        this.actAsPrincipalId?.let { v0 -> __fields["actAsPrincipalId"] = Scalars.encodeUUID(v0) }
        return JsonObject(__fields)
    }
}

public data class JoinLiveSessionInput(
    public val liveSessionId: String,
    public val expectedGeneration: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["liveSessionId"] = Scalars.encodeUUID(this.liveSessionId)
        __fields["expectedGeneration"] = Scalars.encodeDecimal(this.expectedGeneration)
        return JsonObject(__fields)
    }
}

public data class LeaveLiveSessionInput(
    public val liveSessionId: String,
    public val expectedGeneration: String,
    public val participationId: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["liveSessionId"] = Scalars.encodeUUID(this.liveSessionId)
        __fields["expectedGeneration"] = Scalars.encodeDecimal(this.expectedGeneration)
        __fields["participationId"] = Scalars.encodeUUID(this.participationId)
        return JsonObject(__fields)
    }
}

public data class LiveAlertsInput(
    /** Omitted when null; the server default is 50. */
    public val limit: Int? = null,
    public val cursor: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        this.limit?.let { v0 -> __fields["limit"] = Scalars.encodePageSize(v0) }
        this.cursor?.let { v0 -> __fields["cursor"] = JsonPrimitive(v0) }
        return JsonObject(__fields)
    }
}

public data class LiveParticipantsInput(
    public val liveSessionId: String,
    /** Omitted when null; the server default is 50. */
    public val limit: Int? = null,
    public val cursor: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["liveSessionId"] = Scalars.encodeUUID(this.liveSessionId)
        this.limit?.let { v0 -> __fields["limit"] = Scalars.encodePageSize(v0) }
        this.cursor?.let { v0 -> __fields["cursor"] = JsonPrimitive(v0) }
        return JsonObject(__fields)
    }
}

public data class LiveSessionCredentialsInput(
    public val liveSessionId: String,
    public val participationId: String,
    public val expectedGeneration: String,
    public val mode: LiveConnectionMode,
    public val replacementOfConnectionId: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["liveSessionId"] = Scalars.encodeUUID(this.liveSessionId)
        __fields["participationId"] = Scalars.encodeUUID(this.participationId)
        __fields["expectedGeneration"] = Scalars.encodeDecimal(this.expectedGeneration)
        __fields["mode"] = this.mode.toJson()
        this.replacementOfConnectionId?.let { v0 -> __fields["replacementOfConnectionId"] = Scalars.encodeUUID(v0) }
        return JsonObject(__fields)
    }
}

public data class LiveSessionInput(
    public val liveSessionId: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["liveSessionId"] = Scalars.encodeUUID(this.liveSessionId)
        return JsonObject(__fields)
    }
}

public data class LiveSessionOperationInput(
    public val operationId: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["operationId"] = Scalars.encodeUUID(this.operationId)
        return JsonObject(__fields)
    }
}

public data class LiveSessionsInput(
    public val conversationId: String,
    /** Omitted when null; the server default is 50. */
    public val limit: Int? = null,
    public val cursor: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        this.limit?.let { v0 -> __fields["limit"] = Scalars.encodePageSize(v0) }
        this.cursor?.let { v0 -> __fields["cursor"] = JsonPrimitive(v0) }
        return JsonObject(__fields)
    }
}

public data class MembersRequestInput(
    public val conversationId: String,
    public val limit: Int,
    public val cursor: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["limit"] = Scalars.encodePageSize(this.limit)
        this.cursor?.let { v0 -> __fields["cursor"] = JsonPrimitive(v0) }
        return JsonObject(__fields)
    }
}

public data class MessagesRequestInput(
    public val conversationId: String,
    public val limit: Int,
    public val beforeSequence: String? = null,
    public val actAsPrincipalId: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["limit"] = Scalars.encodePageSize(this.limit)
        this.beforeSequence?.let { v0 -> __fields["beforeSequence"] = Scalars.encodeDecimal(v0) }
        this.actAsPrincipalId?.let { v0 -> __fields["actAsPrincipalId"] = Scalars.encodeUUID(v0) }
        return JsonObject(__fields)
    }
}

public data class ReceiptsRequestInput(
    public val conversationId: String,
    public val limit: Int,
    public val cursor: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["limit"] = Scalars.encodePageSize(this.limit)
        this.cursor?.let { v0 -> __fields["cursor"] = JsonPrimitive(v0) }
        return JsonObject(__fields)
    }
}

public data class ReportReceiptRequestInput(
    public val conversationId: String,
    public val kind: String,
    public val membershipEpoch: String,
    public val visibilityEpoch: String,
    public val throughSequence: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["kind"] = JsonPrimitive(this.kind)
        __fields["membershipEpoch"] = Scalars.encodeDecimal(this.membershipEpoch)
        __fields["visibilityEpoch"] = Scalars.encodeDecimal(this.visibilityEpoch)
        __fields["throughSequence"] = Scalars.encodeDecimal(this.throughSequence)
        return JsonObject(__fields)
    }
}

public data class RequestContextInput(
    public val requestId: String,
    public val projectId: String? = null,
    public val incarnation: String? = null,
    public val observedServingEpoch: String? = null,
    public val credentialDeliveryPermit: JsonObject? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["requestId"] = Scalars.encodeUUID(this.requestId)
        this.projectId?.let { v0 -> __fields["projectId"] = Scalars.encodeUUID(v0) }
        this.incarnation?.let { v0 -> __fields["incarnation"] = Scalars.encodeUUID(v0) }
        this.observedServingEpoch?.let { v0 -> __fields["observedServingEpoch"] = Scalars.encodeDecimal(v0) }
        this.credentialDeliveryPermit?.let { v0 -> __fields["credentialDeliveryPermit"] = Scalars.encodeSignedProof(v0) }
        return JsonObject(__fields)
    }

    /** Redacts credentials so logs and crash reports never carry them. */
    override fun toString(): String =
        "RequestContextInput(" +
        "requestId=${this.requestId}, " +
        "projectId=${this.projectId}, " +
        "incarnation=${this.incarnation}, " +
        "observedServingEpoch=${this.observedServingEpoch}, " +
        "credentialDeliveryPermit=<redacted>)"
}

public data class ResolveRequestRequestInput(
    public val requestId: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["requestId"] = Scalars.encodeUUID(this.requestId)
        return JsonObject(__fields)
    }
}

public data class RevokeSessionRequestInput(
    public val sessionId: String,
    public val expectedRevision: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["sessionId"] = Scalars.encodeUUID(this.sessionId)
        __fields["expectedRevision"] = Scalars.encodeDecimal(this.expectedRevision)
        return JsonObject(__fields)
    }
}

public data class SearchRequestInput(
    public val query: String,
    public val pageSize: Int,
    public val scope: SearchScopeInput? = null,
    public val cursor: String? = null,
    public val actAsPrincipalId: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["query"] = JsonPrimitive(this.query)
        __fields["pageSize"] = Scalars.encodePageSize(this.pageSize)
        this.scope?.let { v0 -> __fields["scope"] = v0.toJson() }
        this.cursor?.let { v0 -> __fields["cursor"] = JsonPrimitive(v0) }
        this.actAsPrincipalId?.let { v0 -> __fields["actAsPrincipalId"] = Scalars.encodeUUID(v0) }
        return JsonObject(__fields)
    }
}

public data class SearchScopeInput(
    public val conversationIds: List<String>,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationIds"] = JsonArray(this.conversationIds.map { v0 -> Scalars.encodeUUID(v0) })
        return JsonObject(__fields)
    }
}

public data class SendMessageRequestInput(
    public val conversationId: String,
    public val text: String,
    public val props: JsonObject,
    public val actAsPrincipalId: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["text"] = JsonPrimitive(this.text)
        __fields["props"] = Scalars.encodeProperties(this.props)
        this.actAsPrincipalId?.let { v0 -> __fields["actAsPrincipalId"] = Scalars.encodeUUID(v0) }
        return JsonObject(__fields)
    }
}

public data class SetConversationMuteInput(
    public val conversationId: String,
    public val muted: Boolean,
    public val until: String? = null,
    public val actAsPrincipalId: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["muted"] = JsonPrimitive(this.muted)
        this.until?.let { v0 -> __fields["until"] = JsonPrimitive(v0) }
        this.actAsPrincipalId?.let { v0 -> __fields["actAsPrincipalId"] = Scalars.encodeUUID(v0) }
        return JsonObject(__fields)
    }
}

public data class StartLiveSessionInput(
    public val conversationId: String,
    /** Omitted when null; the server default is "INTERACTIVE". */
    public val kind: LiveSessionKind? = null,
    /** Omitted when null; the server default is "AUDIO_ONLY". */
    public val mediaProfile: LiveMediaProfile? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        this.kind?.let { v0 -> __fields["kind"] = v0.toJson() }
        this.mediaProfile?.let { v0 -> __fields["mediaProfile"] = v0.toJson() }
        return JsonObject(__fields)
    }
}

public data class TypingRequestInput(
    public val conversationId: String,
    public val isTyping: Boolean,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["isTyping"] = JsonPrimitive(this.isTyping)
        return JsonObject(__fields)
    }
}

public data class UpdateConversationRequestInput(
    public val conversationId: String,
    public val expectedRevision: String,
    public val title: String? = null,
    public val props: JsonObject? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["conversationId"] = Scalars.encodeUUID(this.conversationId)
        __fields["expectedRevision"] = Scalars.encodeDecimal(this.expectedRevision)
        this.title?.let { v0 -> __fields["title"] = JsonPrimitive(v0) }
        this.props?.let { v0 -> __fields["props"] = Scalars.encodeProperties(v0) }
        return JsonObject(__fields)
    }
}
