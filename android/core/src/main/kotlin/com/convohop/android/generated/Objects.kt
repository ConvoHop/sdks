// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

public data class ActorRef(
    public val tenantId: String,
    public val objectId: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "tenantId" to JsonPrimitive(this.tenantId),
                "objectId" to JsonPrimitive(this.objectId),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ActorRef. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ActorRef"): ActorRef {
            val obj = element.asObject(path)
            return ActorRef(
                tenantId = obj.field("tenantId", path).asString("${path}.tenantId"),
                objectId = obj.field("objectId", path).asString("${path}.objectId"),
            )
        }
    }
}

public data class AlertLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: LiveAlertBatch,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "receiptId" to Scalars.encodeUUID(this.receiptId),
                "committedAt" to JsonPrimitive(this.committedAt),
                "replayed" to JsonPrimitive(this.replayed),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match AlertLiveSessionPayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "AlertLiveSessionPayload"): AlertLiveSessionPayload {
            val obj = element.asObject(path)
            return AlertLiveSessionPayload(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                receiptId = Scalars.decodeUUID(obj.field("receiptId", path), "${path}.receiptId"),
                committedAt = obj.field("committedAt", path).asString("${path}.committedAt"),
                replayed = obj.field("replayed", path).asBoolean("${path}.replayed"),
                result = LiveAlertBatch.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class BillingCheckoutSession(
    public val orgId: String,
    public val planId: String,
    public val url: String,
    public val expiresAt: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "orgId" to Scalars.encodeUUID(this.orgId),
                "planId" to JsonPrimitive(this.planId),
                "url" to JsonPrimitive(this.url),
                "expiresAt" to JsonPrimitive(this.expiresAt),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match BillingCheckoutSession. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "BillingCheckoutSession"): BillingCheckoutSession {
            val obj = element.asObject(path)
            return BillingCheckoutSession(
                orgId = Scalars.decodeUUID(obj.field("orgId", path), "${path}.orgId"),
                planId = obj.field("planId", path).asString("${path}.planId"),
                url = obj.field("url", path).asString("${path}.url"),
                expiresAt = obj.field("expiresAt", path).asString("${path}.expiresAt"),
            )
        }
    }
}

public data class BillingPortalSession(
    public val orgId: String,
    public val url: String,
    public val expiresAt: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "orgId" to Scalars.encodeUUID(this.orgId),
                "url" to JsonPrimitive(this.url),
                "expiresAt" to (this.expiresAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match BillingPortalSession. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "BillingPortalSession"): BillingPortalSession {
            val obj = element.asObject(path)
            return BillingPortalSession(
                orgId = Scalars.decodeUUID(obj.field("orgId", path), "${path}.orgId"),
                url = obj.field("url", path).asString("${path}.url"),
                expiresAt = obj.field("expiresAt", path).decodeNullable("${path}.expiresAt") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class BroadcastPermissionChanged(
    public val member: Member,
    public val mediaCutoff: LiveMediaCutoff? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "member" to this.member.toJson(),
                "mediaCutoff" to (this.mediaCutoff?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match BroadcastPermissionChanged. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "BroadcastPermissionChanged"): BroadcastPermissionChanged {
            val obj = element.asObject(path)
            return BroadcastPermissionChanged(
                member = Member.fromJson(obj.field("member", path), "${path}.member"),
                mediaCutoff = obj.field("mediaCutoff", path).decodeNullable("${path}.mediaCutoff") { v0, p0 -> LiveMediaCutoff.fromJson(v0, p0) },
            )
        }
    }
}

public data class Capabilities(
    public val serverRelease: String,
    public val capabilityRevision: String,
    public val limitsRevision: String,
    public val features: Features? = null,
    public val limits: List<LimitEntry>,
    public val environment: String,
    public val productionQualified: Boolean,
    public val mediaPolicy: MediaPolicy? = null,
    public val geoControlAuthorityId: String? = null,
    public val offerings: List<String>,
    public val geos: List<String>,
    public val installationProfiles: List<String>,
    public val portalIdentity: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "serverRelease" to JsonPrimitive(this.serverRelease),
                "capabilityRevision" to Scalars.encodeDecimal(this.capabilityRevision),
                "limitsRevision" to Scalars.encodeDecimal(this.limitsRevision),
                "features" to (this.features?.let { v0 -> v0.toJson() } ?: JsonNull),
                "limits" to JsonArray(this.limits.map { v0 -> v0.toJson() }),
                "environment" to JsonPrimitive(this.environment),
                "productionQualified" to JsonPrimitive(this.productionQualified),
                "mediaPolicy" to (this.mediaPolicy?.let { v0 -> v0.toJson() } ?: JsonNull),
                "geoControlAuthorityId" to (this.geoControlAuthorityId?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "offerings" to JsonArray(this.offerings.map { v0 -> JsonPrimitive(v0) }),
                "geos" to JsonArray(this.geos.map { v0 -> JsonPrimitive(v0) }),
                "installationProfiles" to JsonArray(this.installationProfiles.map { v0 -> JsonPrimitive(v0) }),
                "portalIdentity" to (this.portalIdentity?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Capabilities. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Capabilities"): Capabilities {
            val obj = element.asObject(path)
            return Capabilities(
                serverRelease = obj.field("serverRelease", path).asString("${path}.serverRelease"),
                capabilityRevision = Scalars.decodeDecimal(obj.field("capabilityRevision", path), "${path}.capabilityRevision"),
                limitsRevision = Scalars.decodeDecimal(obj.field("limitsRevision", path), "${path}.limitsRevision"),
                features = obj.field("features", path).decodeNullable("${path}.features") { v0, p0 -> Features.fromJson(v0, p0) },
                limits = obj.field("limits", path).decodeList("${path}.limits") { v0, p0 -> LimitEntry.fromJson(v0, p0) },
                environment = obj.field("environment", path).asString("${path}.environment"),
                productionQualified = obj.field("productionQualified", path).asBoolean("${path}.productionQualified"),
                mediaPolicy = obj.field("mediaPolicy", path).decodeNullable("${path}.mediaPolicy") { v0, p0 -> MediaPolicy.fromJson(v0, p0) },
                geoControlAuthorityId = obj.field("geoControlAuthorityId", path).decodeNullable("${path}.geoControlAuthorityId") { v0, p0 -> v0.asString(p0) },
                offerings = obj.field("offerings", path).decodeList("${path}.offerings") { v0, p0 -> v0.asString(p0) },
                geos = obj.field("geos", path).decodeList("${path}.geos") { v0, p0 -> v0.asString(p0) },
                installationProfiles = obj.field("installationProfiles", path).decodeList("${path}.installationProfiles") { v0, p0 -> v0.asString(p0) },
                portalIdentity = obj.field("portalIdentity", path).decodeNullable("${path}.portalIdentity") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class CapabilitiesReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Capabilities? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match CapabilitiesReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "CapabilitiesReply"): CapabilitiesReply {
            val obj = element.asObject(path)
            return CapabilitiesReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> Capabilities.fromJson(v0, p0) },
            )
        }
    }
}

public data class Conversation(
    public val conversationId: String,
    public val revision: String,
    public val title: String,
    public val props: JsonObject? = null,
    public val latestSequence: String,
    public val membership: Member? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "revision" to Scalars.encodeDecimal(this.revision),
                "title" to JsonPrimitive(this.title),
                "props" to (this.props?.let { v0 -> Scalars.encodeProperties(v0) } ?: JsonNull),
                "latestSequence" to Scalars.encodeDecimal(this.latestSequence),
                "membership" to (this.membership?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Conversation. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Conversation"): Conversation {
            val obj = element.asObject(path)
            return Conversation(
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
                title = obj.field("title", path).asString("${path}.title"),
                props = obj.field("props", path).decodeNullable("${path}.props") { v0, p0 -> Scalars.decodeProperties(v0, p0) },
                latestSequence = Scalars.decodeDecimal(obj.field("latestSequence", path), "${path}.latestSequence"),
                membership = obj.field("membership", path).decodeNullable("${path}.membership") { v0, p0 -> Member.fromJson(v0, p0) },
            )
        }
    }
}

public data class ConversationMemberBatch(
    public val items: List<Member>,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ConversationMemberBatch. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ConversationMemberBatch"): ConversationMemberBatch {
            val obj = element.asObject(path)
            return ConversationMemberBatch(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> Member.fromJson(v0, p0) },
            )
        }
    }
}

public data class ConversationMute(
    public val conversationId: String,
    public val principalId: String,
    public val muted: Boolean,
    public val until: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "principalId" to Scalars.encodeUUID(this.principalId),
                "muted" to JsonPrimitive(this.muted),
                "until" to (this.until?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ConversationMute. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ConversationMute"): ConversationMute {
            val obj = element.asObject(path)
            return ConversationMute(
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                principalId = Scalars.decodeUUID(obj.field("principalId", path), "${path}.principalId"),
                muted = obj.field("muted", path).asBoolean("${path}.muted"),
                until = obj.field("until", path).decodeNullable("${path}.until") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class ConversationMuteReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: ConversationMute,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to JsonPrimitive(this.serverTime),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ConversationMuteReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ConversationMuteReply"): ConversationMuteReply {
            val obj = element.asObject(path)
            return ConversationMuteReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).asString("${path}.serverTime"),
                result = ConversationMute.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class CredentialDelivery(
    public val deliveryId: String,
    public val kind: String,
    public val projectId: String,
    public val installationId: String,
    public val resourceRef: ResourceRef? = null,
    public val expiresAt: String,
    public val payloadDigest: String,
    public val recipientActorRef: ActorRef? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "deliveryId" to Scalars.encodeUUID(this.deliveryId),
                "kind" to JsonPrimitive(this.kind),
                "projectId" to Scalars.encodeUUID(this.projectId),
                "installationId" to JsonPrimitive(this.installationId),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "expiresAt" to JsonPrimitive(this.expiresAt),
                "payloadDigest" to JsonPrimitive(this.payloadDigest),
                "recipientActorRef" to (this.recipientActorRef?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match CredentialDelivery. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "CredentialDelivery"): CredentialDelivery {
            val obj = element.asObject(path)
            return CredentialDelivery(
                deliveryId = Scalars.decodeUUID(obj.field("deliveryId", path), "${path}.deliveryId"),
                kind = obj.field("kind", path).asString("${path}.kind"),
                projectId = Scalars.decodeUUID(obj.field("projectId", path), "${path}.projectId"),
                installationId = obj.field("installationId", path).asString("${path}.installationId"),
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                expiresAt = obj.field("expiresAt", path).asString("${path}.expiresAt"),
                payloadDigest = obj.field("payloadDigest", path).asString("${path}.payloadDigest"),
                recipientActorRef = obj.field("recipientActorRef", path).decodeNullable("${path}.recipientActorRef") { v0, p0 -> ActorRef.fromJson(v0, p0) },
            )
        }
    }
}

public data class CredentialDeliveryReceipt(
    public val deliveryId: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "deliveryId" to Scalars.encodeUUID(this.deliveryId),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match CredentialDeliveryReceipt. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "CredentialDeliveryReceipt"): CredentialDeliveryReceipt {
            val obj = element.asObject(path)
            return CredentialDeliveryReceipt(
                deliveryId = Scalars.decodeUUID(obj.field("deliveryId", path), "${path}.deliveryId"),
            )
        }
    }
}

public data class CurrentLiveSessionReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveSession? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to JsonPrimitive(this.serverTime),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match CurrentLiveSessionReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "CurrentLiveSessionReply"): CurrentLiveSessionReply {
            val obj = element.asObject(path)
            return CurrentLiveSessionReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).asString("${path}.serverTime"),
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> LiveSession.fromJson(v0, p0) },
            )
        }
    }
}

public data class CurrentSessionReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: Session,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to JsonPrimitive(this.serverTime),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match CurrentSessionReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "CurrentSessionReply"): CurrentSessionReply {
            val obj = element.asObject(path)
            return CurrentSessionReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).asString("${path}.serverTime"),
                result = Session.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class Cursor(
    public val incarnation: String,
    public val conversationId: String,
    public val sequence: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "incarnation" to Scalars.encodeUUID(this.incarnation),
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "sequence" to Scalars.encodeDecimal(this.sequence),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Cursor. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Cursor"): Cursor {
            val obj = element.asObject(path)
            return Cursor(
                incarnation = Scalars.decodeUUID(obj.field("incarnation", path), "${path}.incarnation"),
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                sequence = Scalars.decodeDecimal(obj.field("sequence", path), "${path}.sequence"),
            )
        }
    }
}

public data class CutoffScope(
    public val kind: String,
    public val principalId: String? = null,
    public val sessionId: String? = null,
    public val deviceId: String? = null,
    public val callId: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "kind" to JsonPrimitive(this.kind),
                "principalId" to (this.principalId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "sessionId" to (this.sessionId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "deviceId" to (this.deviceId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "callId" to (this.callId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match CutoffScope. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "CutoffScope"): CutoffScope {
            val obj = element.asObject(path)
            return CutoffScope(
                kind = obj.field("kind", path).asString("${path}.kind"),
                principalId = obj.field("principalId", path).decodeNullable("${path}.principalId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                sessionId = obj.field("sessionId", path).decodeNullable("${path}.sessionId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                deviceId = obj.field("deviceId", path).decodeNullable("${path}.deviceId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                callId = obj.field("callId", path).decodeNullable("${path}.callId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
            )
        }
    }
}

public data class DeleteMessageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Message? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match DeleteMessageReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "DeleteMessageReply"): DeleteMessageReply {
            val obj = element.asObject(path)
            return DeleteMessageReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> Message.fromJson(v0, p0) },
            )
        }
    }
}

public data class DeliveryAck(
    public val deliveryId: String,
    public val acknowledged: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "deliveryId" to Scalars.encodeUUID(this.deliveryId),
                "acknowledged" to JsonPrimitive(this.acknowledged),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match DeliveryAck. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "DeliveryAck"): DeliveryAck {
            val obj = element.asObject(path)
            return DeliveryAck(
                deliveryId = Scalars.decodeUUID(obj.field("deliveryId", path), "${path}.deliveryId"),
                acknowledged = obj.field("acknowledged", path).asBoolean("${path}.acknowledged"),
            )
        }
    }
}

public data class EditMessageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Message? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match EditMessageReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "EditMessageReply"): EditMessageReply {
            val obj = element.asObject(path)
            return EditMessageReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> Message.fromJson(v0, p0) },
            )
        }
    }
}

public data class EndLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val operation: OperationRef,
    public val result: LiveSessionEndRequested,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "receiptId" to Scalars.encodeUUID(this.receiptId),
                "committedAt" to JsonPrimitive(this.committedAt),
                "replayed" to JsonPrimitive(this.replayed),
                "operation" to this.operation.toJson(),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match EndLiveSessionPayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "EndLiveSessionPayload"): EndLiveSessionPayload {
            val obj = element.asObject(path)
            return EndLiveSessionPayload(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                receiptId = Scalars.decodeUUID(obj.field("receiptId", path), "${path}.receiptId"),
                committedAt = obj.field("committedAt", path).asString("${path}.committedAt"),
                replayed = obj.field("replayed", path).asBoolean("${path}.replayed"),
                operation = OperationRef.fromJson(obj.field("operation", path), "${path}.operation"),
                result = LiveSessionEndRequested.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class Event(
    public val eventId: String,
    public val conversationId: String,
    public val sequence: String,
    public val type: String,
    public val occurredAt: String,
    public val subjectRef: ResourceRef? = null,
    public val payload: EventPayload? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "eventId" to Scalars.encodeUUID(this.eventId),
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "sequence" to Scalars.encodeDecimal(this.sequence),
                "type" to JsonPrimitive(this.type),
                "occurredAt" to JsonPrimitive(this.occurredAt),
                "subjectRef" to (this.subjectRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "payload" to (this.payload?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Event. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Event"): Event {
            val obj = element.asObject(path)
            return Event(
                eventId = Scalars.decodeUUID(obj.field("eventId", path), "${path}.eventId"),
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                sequence = Scalars.decodeDecimal(obj.field("sequence", path), "${path}.sequence"),
                type = obj.field("type", path).asString("${path}.type"),
                occurredAt = obj.field("occurredAt", path).asString("${path}.occurredAt"),
                subjectRef = obj.field("subjectRef", path).decodeNullable("${path}.subjectRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                payload = obj.field("payload", path).decodeNullable("${path}.payload") { v0, p0 -> EventPayload.fromJson(v0, p0) },
            )
        }
    }
}

public data class EventPage(
    public val items: List<Event>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: Cursor? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "complete" to JsonPrimitive(this.complete),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
                "nextCursor" to (this.nextCursor?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match EventPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "EventPage"): EventPage {
            val obj = element.asObject(path)
            return EventPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> Event.fromJson(v0, p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> Cursor.fromJson(v0, p0) },
            )
        }
    }
}

public data class EventPayload(
    public val messageId: String? = null,
    public val revision: String? = null,
    public val revisionSequence: String? = null,
    public val principalId: String? = null,
    public val membershipEpoch: String? = null,
    public val visibilityEpoch: String? = null,
    public val kind: String? = null,
    public val throughSequence: String? = null,
    public val callId: String? = null,
    public val generation: String? = null,
    public val state: String? = null,
    public val cutoffEvidence: String? = null,
    public val liveSessionId: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "messageId" to (this.messageId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "revision" to (this.revision?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "revisionSequence" to (this.revisionSequence?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "principalId" to (this.principalId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "membershipEpoch" to (this.membershipEpoch?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "visibilityEpoch" to (this.visibilityEpoch?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "kind" to (this.kind?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "throughSequence" to (this.throughSequence?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "callId" to (this.callId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "generation" to (this.generation?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "state" to (this.state?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "cutoffEvidence" to (this.cutoffEvidence?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "liveSessionId" to (this.liveSessionId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match EventPayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "EventPayload"): EventPayload {
            val obj = element.asObject(path)
            return EventPayload(
                messageId = obj.field("messageId", path).decodeNullable("${path}.messageId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                revision = obj.field("revision", path).decodeNullable("${path}.revision") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                revisionSequence = obj.field("revisionSequence", path).decodeNullable("${path}.revisionSequence") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                principalId = obj.field("principalId", path).decodeNullable("${path}.principalId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                membershipEpoch = obj.field("membershipEpoch", path).decodeNullable("${path}.membershipEpoch") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                visibilityEpoch = obj.field("visibilityEpoch", path).decodeNullable("${path}.visibilityEpoch") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                kind = obj.field("kind", path).decodeNullable("${path}.kind") { v0, p0 -> v0.asString(p0) },
                throughSequence = obj.field("throughSequence", path).decodeNullable("${path}.throughSequence") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                callId = obj.field("callId", path).decodeNullable("${path}.callId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                generation = obj.field("generation", path).decodeNullable("${path}.generation") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                state = obj.field("state", path).decodeNullable("${path}.state") { v0, p0 -> v0.asString(p0) },
                cutoffEvidence = obj.field("cutoffEvidence", path).decodeNullable("${path}.cutoffEvidence") { v0, p0 -> v0.asString(p0) },
                liveSessionId = obj.field("liveSessionId", path).decodeNullable("${path}.liveSessionId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
            )
        }
    }
}

public data class EventsReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: EventPage? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match EventsReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "EventsReply"): EventsReply {
            val obj = element.asObject(path)
            return EventsReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> EventPage.fromJson(v0, p0) },
            )
        }
    }
}

public data class Features(
    public val chat: Boolean,
    public val inbox: Boolean,
    public val lexicalSearch: Boolean,
    public val typing: Boolean,
    public val webhooks: Boolean,
    public val liveSessions: Boolean,
    public val liveBroadcast: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "chat" to JsonPrimitive(this.chat),
                "inbox" to JsonPrimitive(this.inbox),
                "lexicalSearch" to JsonPrimitive(this.lexicalSearch),
                "typing" to JsonPrimitive(this.typing),
                "webhooks" to JsonPrimitive(this.webhooks),
                "liveSessions" to JsonPrimitive(this.liveSessions),
                "liveBroadcast" to JsonPrimitive(this.liveBroadcast),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Features. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Features"): Features {
            val obj = element.asObject(path)
            return Features(
                chat = obj.field("chat", path).asBoolean("${path}.chat"),
                inbox = obj.field("inbox", path).asBoolean("${path}.inbox"),
                lexicalSearch = obj.field("lexicalSearch", path).asBoolean("${path}.lexicalSearch"),
                typing = obj.field("typing", path).asBoolean("${path}.typing"),
                webhooks = obj.field("webhooks", path).asBoolean("${path}.webhooks"),
                liveSessions = obj.field("liveSessions", path).asBoolean("${path}.liveSessions"),
                liveBroadcast = obj.field("liveBroadcast", path).asBoolean("${path}.liveBroadcast"),
            )
        }
    }
}

public data class GetConversationReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Conversation? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match GetConversationReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "GetConversationReply"): GetConversationReply {
            val obj = element.asObject(path)
            return GetConversationReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> Conversation.fromJson(v0, p0) },
            )
        }
    }
}

public data class GetMessageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Message? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match GetMessageReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "GetMessageReply"): GetMessageReply {
            val obj = element.asObject(path)
            return GetMessageReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> Message.fromJson(v0, p0) },
            )
        }
    }
}

public data class GetOperationReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Operation? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match GetOperationReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "GetOperationReply"): GetOperationReply {
            val obj = element.asObject(path)
            return GetOperationReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> Operation.fromJson(v0, p0) },
            )
        }
    }
}

public data class InboxItem(
    public val conversationId: String,
    public val title: String,
    public val activityAt: String? = null,
    public val visibilityEpoch: String,
    public val latestVisibleMessage: Message? = null,
    public val hasUnread: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "title" to JsonPrimitive(this.title),
                "activityAt" to (this.activityAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "visibilityEpoch" to Scalars.encodeDecimal(this.visibilityEpoch),
                "latestVisibleMessage" to (this.latestVisibleMessage?.let { v0 -> v0.toJson() } ?: JsonNull),
                "hasUnread" to JsonPrimitive(this.hasUnread),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match InboxItem. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "InboxItem"): InboxItem {
            val obj = element.asObject(path)
            return InboxItem(
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                title = obj.field("title", path).asString("${path}.title"),
                activityAt = obj.field("activityAt", path).decodeNullable("${path}.activityAt") { v0, p0 -> v0.asString(p0) },
                visibilityEpoch = Scalars.decodeDecimal(obj.field("visibilityEpoch", path), "${path}.visibilityEpoch"),
                latestVisibleMessage = obj.field("latestVisibleMessage", path).decodeNullable("${path}.latestVisibleMessage") { v0, p0 -> Message.fromJson(v0, p0) },
                hasUnread = obj.field("hasUnread", path).asBoolean("${path}.hasUnread"),
            )
        }
    }
}

public data class InboxPage(
    public val items: List<InboxItem>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
    public val partialReason: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "complete" to JsonPrimitive(this.complete),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "partialReason" to (this.partialReason?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match InboxPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "InboxPage"): InboxPage {
            val obj = element.asObject(path)
            return InboxPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> InboxItem.fromJson(v0, p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
                partialReason = obj.field("partialReason", path).decodeNullable("${path}.partialReason") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class InboxReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: InboxPage? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match InboxReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "InboxReply"): InboxReply {
            val obj = element.asObject(path)
            return InboxReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> InboxPage.fromJson(v0, p0) },
            )
        }
    }
}

public data class JoinLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: LiveSessionJoined,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "receiptId" to Scalars.encodeUUID(this.receiptId),
                "committedAt" to JsonPrimitive(this.committedAt),
                "replayed" to JsonPrimitive(this.replayed),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match JoinLiveSessionPayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "JoinLiveSessionPayload"): JoinLiveSessionPayload {
            val obj = element.asObject(path)
            return JoinLiveSessionPayload(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                receiptId = Scalars.decodeUUID(obj.field("receiptId", path), "${path}.receiptId"),
                committedAt = obj.field("committedAt", path).asString("${path}.committedAt"),
                replayed = obj.field("replayed", path).asBoolean("${path}.replayed"),
                result = LiveSessionJoined.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class LeaveLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: LiveSessionLeft,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "receiptId" to Scalars.encodeUUID(this.receiptId),
                "committedAt" to JsonPrimitive(this.committedAt),
                "replayed" to JsonPrimitive(this.replayed),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LeaveLiveSessionPayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LeaveLiveSessionPayload"): LeaveLiveSessionPayload {
            val obj = element.asObject(path)
            return LeaveLiveSessionPayload(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                receiptId = Scalars.decodeUUID(obj.field("receiptId", path), "${path}.receiptId"),
                committedAt = obj.field("committedAt", path).asString("${path}.committedAt"),
                replayed = obj.field("replayed", path).asBoolean("${path}.replayed"),
                result = LiveSessionLeft.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class Limit(
    public val maximum: String? = null,
    public val unit: String? = null,
    public val scope: String? = null,
    public val milliseconds: String? = null,
    public val policyId: String? = null,
    public val revision: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "maximum" to (this.maximum?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "unit" to (this.unit?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "scope" to (this.scope?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "milliseconds" to (this.milliseconds?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "policyId" to (this.policyId?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "revision" to (this.revision?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Limit. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Limit"): Limit {
            val obj = element.asObject(path)
            return Limit(
                maximum = obj.field("maximum", path).decodeNullable("${path}.maximum") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                unit = obj.field("unit", path).decodeNullable("${path}.unit") { v0, p0 -> v0.asString(p0) },
                scope = obj.field("scope", path).decodeNullable("${path}.scope") { v0, p0 -> v0.asString(p0) },
                milliseconds = obj.field("milliseconds", path).decodeNullable("${path}.milliseconds") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                policyId = obj.field("policyId", path).decodeNullable("${path}.policyId") { v0, p0 -> v0.asString(p0) },
                revision = obj.field("revision", path).decodeNullable("${path}.revision") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
            )
        }
    }
}

public data class LimitEntry(
    public val key: String,
    public val value: Limit,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "key" to JsonPrimitive(this.key),
                "value" to this.value.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LimitEntry. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LimitEntry"): LimitEntry {
            val obj = element.asObject(path)
            return LimitEntry(
                key = obj.field("key", path).asString("${path}.key"),
                value = Limit.fromJson(obj.field("value", path), "${path}.value"),
            )
        }
    }
}

public data class LiveAlert(
    public val alertId: String,
    public val liveSessionId: String,
    public val conversationId: String,
    public val generation: String,
    public val membershipEpoch: String,
    public val createdAt: String,
    public val expiresAt: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "alertId" to Scalars.encodeUUID(this.alertId),
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "generation" to Scalars.encodeDecimal(this.generation),
                "membershipEpoch" to Scalars.encodeDecimal(this.membershipEpoch),
                "createdAt" to JsonPrimitive(this.createdAt),
                "expiresAt" to JsonPrimitive(this.expiresAt),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveAlert. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveAlert"): LiveAlert {
            val obj = element.asObject(path)
            return LiveAlert(
                alertId = Scalars.decodeUUID(obj.field("alertId", path), "${path}.alertId"),
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                generation = Scalars.decodeDecimal(obj.field("generation", path), "${path}.generation"),
                membershipEpoch = Scalars.decodeDecimal(obj.field("membershipEpoch", path), "${path}.membershipEpoch"),
                createdAt = obj.field("createdAt", path).asString("${path}.createdAt"),
                expiresAt = obj.field("expiresAt", path).asString("${path}.expiresAt"),
            )
        }
    }
}

public data class LiveAlertBatch(
    public val liveSessionId: String,
    public val created: String,
    public val suppressed: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "created" to Scalars.encodeDecimal(this.created),
                "suppressed" to Scalars.encodeDecimal(this.suppressed),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveAlertBatch. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveAlertBatch"): LiveAlertBatch {
            val obj = element.asObject(path)
            return LiveAlertBatch(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                created = Scalars.decodeDecimal(obj.field("created", path), "${path}.created"),
                suppressed = Scalars.decodeDecimal(obj.field("suppressed", path), "${path}.suppressed"),
            )
        }
    }
}

public data class LiveAlertPage(
    public val items: List<LiveAlert>,
    public val nextCursor: String? = null,
    public val complete: Boolean,
    public val partialReason: String? = null,
    public val refreshRequired: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "complete" to JsonPrimitive(this.complete),
                "partialReason" to (this.partialReason?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveAlertPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveAlertPage"): LiveAlertPage {
            val obj = element.asObject(path)
            return LiveAlertPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> LiveAlert.fromJson(v0, p0) },
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                partialReason = obj.field("partialReason", path).decodeNullable("${path}.partialReason") { v0, p0 -> v0.asString(p0) },
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
            )
        }
    }
}

public data class LiveAlertPageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveAlertPage,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to JsonPrimitive(this.serverTime),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveAlertPageReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveAlertPageReply"): LiveAlertPageReply {
            val obj = element.asObject(path)
            return LiveAlertPageReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).asString("${path}.serverTime"),
                result = LiveAlertPage.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class LiveConnectionGrant(
    public val liveSessionId: String,
    public val participationId: String,
    public val generation: String,
    public val roomName: String,
    public val participantIdentity: String,
    public val livekitUrl: String,
    public val transportToken: String,
    public val admissionTicket: JsonObject,
    public val forwardingLease: JsonObject,
    public val transportExpiresAt: String,
    public val admissionExpiresAt: String,
    public val leaseExpiresAt: String,
    public val leasePolicyId: String,
    public val connectToken: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "participationId" to Scalars.encodeUUID(this.participationId),
                "generation" to Scalars.encodeDecimal(this.generation),
                "roomName" to JsonPrimitive(this.roomName),
                "participantIdentity" to JsonPrimitive(this.participantIdentity),
                "livekitUrl" to JsonPrimitive(this.livekitUrl),
                "transportToken" to JsonPrimitive(this.transportToken),
                "admissionTicket" to Scalars.encodeSignedProof(this.admissionTicket),
                "forwardingLease" to Scalars.encodeSignedProof(this.forwardingLease),
                "transportExpiresAt" to JsonPrimitive(this.transportExpiresAt),
                "admissionExpiresAt" to JsonPrimitive(this.admissionExpiresAt),
                "leaseExpiresAt" to JsonPrimitive(this.leaseExpiresAt),
                "leasePolicyId" to JsonPrimitive(this.leasePolicyId),
                "connectToken" to JsonPrimitive(this.connectToken),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveConnectionGrant. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveConnectionGrant"): LiveConnectionGrant {
            val obj = element.asObject(path)
            return LiveConnectionGrant(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                participationId = Scalars.decodeUUID(obj.field("participationId", path), "${path}.participationId"),
                generation = Scalars.decodeDecimal(obj.field("generation", path), "${path}.generation"),
                roomName = obj.field("roomName", path).asString("${path}.roomName"),
                participantIdentity = obj.field("participantIdentity", path).asString("${path}.participantIdentity"),
                livekitUrl = obj.field("livekitUrl", path).asString("${path}.livekitUrl"),
                transportToken = obj.field("transportToken", path).asString("${path}.transportToken"),
                admissionTicket = Scalars.decodeSignedProof(obj.field("admissionTicket", path), "${path}.admissionTicket"),
                forwardingLease = Scalars.decodeSignedProof(obj.field("forwardingLease", path), "${path}.forwardingLease"),
                transportExpiresAt = obj.field("transportExpiresAt", path).asString("${path}.transportExpiresAt"),
                admissionExpiresAt = obj.field("admissionExpiresAt", path).asString("${path}.admissionExpiresAt"),
                leaseExpiresAt = obj.field("leaseExpiresAt", path).asString("${path}.leaseExpiresAt"),
                leasePolicyId = obj.field("leasePolicyId", path).asString("${path}.leasePolicyId"),
                connectToken = obj.field("connectToken", path).asString("${path}.connectToken"),
            )
        }
    }

    /** Redacts credentials so logs and crash reports never carry them. */
    override fun toString(): String =
        "LiveConnectionGrant(" +
        "liveSessionId=${this.liveSessionId}, " +
        "participationId=${this.participationId}, " +
        "generation=${this.generation}, " +
        "roomName=${this.roomName}, " +
        "participantIdentity=${this.participantIdentity}, " +
        "livekitUrl=${this.livekitUrl}, " +
        "transportToken=<redacted>, " +
        "admissionTicket=<redacted>, " +
        "forwardingLease=<redacted>, " +
        "transportExpiresAt=${this.transportExpiresAt}, " +
        "admissionExpiresAt=${this.admissionExpiresAt}, " +
        "leaseExpiresAt=${this.leaseExpiresAt}, " +
        "leasePolicyId=${this.leasePolicyId}, " +
        "connectToken=<redacted>)"
}

public data class LiveCredentialIssuance(
    public val liveSessionId: String,
    public val participationId: String,
    public val generation: String,
    public val leaseId: String,
    public val grantOrdinal: String,
    public val admissionExpiresAt: String,
    public val leaseExpiresAt: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "participationId" to Scalars.encodeUUID(this.participationId),
                "generation" to Scalars.encodeDecimal(this.generation),
                "leaseId" to Scalars.encodeUUID(this.leaseId),
                "grantOrdinal" to Scalars.encodeDecimal(this.grantOrdinal),
                "admissionExpiresAt" to JsonPrimitive(this.admissionExpiresAt),
                "leaseExpiresAt" to JsonPrimitive(this.leaseExpiresAt),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveCredentialIssuance. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveCredentialIssuance"): LiveCredentialIssuance {
            val obj = element.asObject(path)
            return LiveCredentialIssuance(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                participationId = Scalars.decodeUUID(obj.field("participationId", path), "${path}.participationId"),
                generation = Scalars.decodeDecimal(obj.field("generation", path), "${path}.generation"),
                leaseId = Scalars.decodeUUID(obj.field("leaseId", path), "${path}.leaseId"),
                grantOrdinal = Scalars.decodeDecimal(obj.field("grantOrdinal", path), "${path}.grantOrdinal"),
                admissionExpiresAt = obj.field("admissionExpiresAt", path).asString("${path}.admissionExpiresAt"),
                leaseExpiresAt = obj.field("leaseExpiresAt", path).asString("${path}.leaseExpiresAt"),
            )
        }
    }
}

public data class LiveCutoffScope(
    public val kind: LiveCutoffScopeKind,
    public val liveSessionId: String,
    public val generation: String,
    public val participationId: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "kind" to this.kind.toJson(),
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "generation" to Scalars.encodeDecimal(this.generation),
                "participationId" to (this.participationId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveCutoffScope. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveCutoffScope"): LiveCutoffScope {
            val obj = element.asObject(path)
            return LiveCutoffScope(
                kind = LiveCutoffScopeKind.fromJson(obj.field("kind", path), "${path}.kind"),
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                generation = Scalars.decodeDecimal(obj.field("generation", path), "${path}.generation"),
                participationId = obj.field("participationId", path).decodeNullable("${path}.participationId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
            )
        }
    }
}

public data class LiveMediaCutoff(
    public val state: LiveCutoffState,
    public val scope: LiveCutoffScope,
    public val evidence: LiveCutoffEvidence? = null,
    public val enforcedAt: String? = null,
    public val operationId: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "state" to this.state.toJson(),
                "scope" to this.scope.toJson(),
                "evidence" to (this.evidence?.let { v0 -> v0.toJson() } ?: JsonNull),
                "enforcedAt" to (this.enforcedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operationId" to (this.operationId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveMediaCutoff. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveMediaCutoff"): LiveMediaCutoff {
            val obj = element.asObject(path)
            return LiveMediaCutoff(
                state = LiveCutoffState.fromJson(obj.field("state", path), "${path}.state"),
                scope = LiveCutoffScope.fromJson(obj.field("scope", path), "${path}.scope"),
                evidence = obj.field("evidence", path).decodeNullable("${path}.evidence") { v0, p0 -> LiveCutoffEvidence.fromJson(v0, p0) },
                enforcedAt = obj.field("enforcedAt", path).decodeNullable("${path}.enforcedAt") { v0, p0 -> v0.asString(p0) },
                operationId = obj.field("operationId", path).decodeNullable("${path}.operationId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
            )
        }
    }
}

public data class LiveMediaPermissions(
    public val microphone: Boolean,
    public val camera: Boolean,
    public val subscribe: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "microphone" to JsonPrimitive(this.microphone),
                "camera" to JsonPrimitive(this.camera),
                "subscribe" to JsonPrimitive(this.subscribe),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveMediaPermissions. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveMediaPermissions"): LiveMediaPermissions {
            val obj = element.asObject(path)
            return LiveMediaPermissions(
                microphone = obj.field("microphone", path).asBoolean("${path}.microphone"),
                camera = obj.field("camera", path).asBoolean("${path}.camera"),
                subscribe = obj.field("subscribe", path).asBoolean("${path}.subscribe"),
            )
        }
    }
}

public data class LiveOperationFailure(
    public val code: LiveErrorCode,
    public val message: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "code" to this.code.toJson(),
                "message" to JsonPrimitive(this.message),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveOperationFailure. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveOperationFailure"): LiveOperationFailure {
            val obj = element.asObject(path)
            return LiveOperationFailure(
                code = LiveErrorCode.fromJson(obj.field("code", path), "${path}.code"),
                message = obj.field("message", path).asString("${path}.message"),
            )
        }
    }
}

public data class LiveParticipantPage(
    public val items: List<LiveParticipation>,
    public val nextCursor: String? = null,
    public val complete: Boolean,
    public val partialReason: String? = null,
    public val refreshRequired: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "complete" to JsonPrimitive(this.complete),
                "partialReason" to (this.partialReason?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveParticipantPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveParticipantPage"): LiveParticipantPage {
            val obj = element.asObject(path)
            return LiveParticipantPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> LiveParticipation.fromJson(v0, p0) },
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                partialReason = obj.field("partialReason", path).decodeNullable("${path}.partialReason") { v0, p0 -> v0.asString(p0) },
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
            )
        }
    }
}

public data class LiveParticipantPageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveParticipantPage,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to JsonPrimitive(this.serverTime),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveParticipantPageReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveParticipantPageReply"): LiveParticipantPageReply {
            val obj = element.asObject(path)
            return LiveParticipantPageReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).asString("${path}.serverTime"),
                result = LiveParticipantPage.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class LiveParticipation(
    public val participationId: String,
    public val principalId: String,
    public val membershipEpoch: String,
    public val role: LiveRole,
    public val state: LiveParticipationState,
    public val permissions: LiveMediaPermissions,
    public val reservationExpiresAt: String? = null,
    public val nativeConnectionId: String? = null,
    public val mediaCutoff: LiveMediaCutoff? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "participationId" to Scalars.encodeUUID(this.participationId),
                "principalId" to Scalars.encodeUUID(this.principalId),
                "membershipEpoch" to Scalars.encodeDecimal(this.membershipEpoch),
                "role" to this.role.toJson(),
                "state" to this.state.toJson(),
                "permissions" to this.permissions.toJson(),
                "reservationExpiresAt" to (this.reservationExpiresAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "nativeConnectionId" to (this.nativeConnectionId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "mediaCutoff" to (this.mediaCutoff?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveParticipation. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveParticipation"): LiveParticipation {
            val obj = element.asObject(path)
            return LiveParticipation(
                participationId = Scalars.decodeUUID(obj.field("participationId", path), "${path}.participationId"),
                principalId = Scalars.decodeUUID(obj.field("principalId", path), "${path}.principalId"),
                membershipEpoch = Scalars.decodeDecimal(obj.field("membershipEpoch", path), "${path}.membershipEpoch"),
                role = LiveRole.fromJson(obj.field("role", path), "${path}.role"),
                state = LiveParticipationState.fromJson(obj.field("state", path), "${path}.state"),
                permissions = LiveMediaPermissions.fromJson(obj.field("permissions", path), "${path}.permissions"),
                reservationExpiresAt = obj.field("reservationExpiresAt", path).decodeNullable("${path}.reservationExpiresAt") { v0, p0 -> v0.asString(p0) },
                nativeConnectionId = obj.field("nativeConnectionId", path).decodeNullable("${path}.nativeConnectionId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                mediaCutoff = obj.field("mediaCutoff", path).decodeNullable("${path}.mediaCutoff") { v0, p0 -> LiveMediaCutoff.fromJson(v0, p0) },
            )
        }
    }
}

public data class LiveSession(
    public val liveSessionId: String,
    public val conversationId: String,
    public val creatorId: String,
    public val kind: LiveSessionKind,
    public val mediaProfile: LiveMediaProfile,
    public val state: LiveSessionState,
    public val generation: String,
    public val revision: String,
    public val createdAt: String,
    public val expiresAt: String,
    public val myParticipation: LiveParticipation? = null,
    public val mediaCutoff: LiveMediaCutoff? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "creatorId" to Scalars.encodeUUID(this.creatorId),
                "kind" to this.kind.toJson(),
                "mediaProfile" to this.mediaProfile.toJson(),
                "state" to this.state.toJson(),
                "generation" to Scalars.encodeDecimal(this.generation),
                "revision" to Scalars.encodeDecimal(this.revision),
                "createdAt" to JsonPrimitive(this.createdAt),
                "expiresAt" to JsonPrimitive(this.expiresAt),
                "myParticipation" to (this.myParticipation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "mediaCutoff" to (this.mediaCutoff?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSession. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSession"): LiveSession {
            val obj = element.asObject(path)
            return LiveSession(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                creatorId = Scalars.decodeUUID(obj.field("creatorId", path), "${path}.creatorId"),
                kind = LiveSessionKind.fromJson(obj.field("kind", path), "${path}.kind"),
                mediaProfile = LiveMediaProfile.fromJson(obj.field("mediaProfile", path), "${path}.mediaProfile"),
                state = LiveSessionState.fromJson(obj.field("state", path), "${path}.state"),
                generation = Scalars.decodeDecimal(obj.field("generation", path), "${path}.generation"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
                createdAt = obj.field("createdAt", path).asString("${path}.createdAt"),
                expiresAt = obj.field("expiresAt", path).asString("${path}.expiresAt"),
                myParticipation = obj.field("myParticipation", path).decodeNullable("${path}.myParticipation") { v0, p0 -> LiveParticipation.fromJson(v0, p0) },
                mediaCutoff = obj.field("mediaCutoff", path).decodeNullable("${path}.mediaCutoff") { v0, p0 -> LiveMediaCutoff.fromJson(v0, p0) },
            )
        }
    }
}

public data class LiveSessionCredentialsPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: LiveConnectionGrant,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "receiptId" to Scalars.encodeUUID(this.receiptId),
                "committedAt" to JsonPrimitive(this.committedAt),
                "replayed" to JsonPrimitive(this.replayed),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionCredentialsPayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionCredentialsPayload"): LiveSessionCredentialsPayload {
            val obj = element.asObject(path)
            return LiveSessionCredentialsPayload(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                receiptId = Scalars.decodeUUID(obj.field("receiptId", path), "${path}.receiptId"),
                committedAt = obj.field("committedAt", path).asString("${path}.committedAt"),
                replayed = obj.field("replayed", path).asBoolean("${path}.replayed"),
                result = LiveConnectionGrant.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class LiveSessionEndRequested(
    public val liveSessionId: String,
    public val operationId: String,
    public val mediaCutoff: LiveMediaCutoff,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "operationId" to Scalars.encodeUUID(this.operationId),
                "mediaCutoff" to this.mediaCutoff.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionEndRequested. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionEndRequested"): LiveSessionEndRequested {
            val obj = element.asObject(path)
            return LiveSessionEndRequested(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                operationId = Scalars.decodeUUID(obj.field("operationId", path), "${path}.operationId"),
                mediaCutoff = LiveMediaCutoff.fromJson(obj.field("mediaCutoff", path), "${path}.mediaCutoff"),
            )
        }
    }
}

public data class LiveSessionJoined(
    public val liveSessionId: String,
    public val generation: String,
    public val participation: LiveParticipation,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "generation" to Scalars.encodeDecimal(this.generation),
                "participation" to this.participation.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionJoined. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionJoined"): LiveSessionJoined {
            val obj = element.asObject(path)
            return LiveSessionJoined(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                generation = Scalars.decodeDecimal(obj.field("generation", path), "${path}.generation"),
                participation = LiveParticipation.fromJson(obj.field("participation", path), "${path}.participation"),
            )
        }
    }
}

public data class LiveSessionLeft(
    public val liveSessionId: String,
    public val participationId: String,
    public val mediaCutoff: LiveMediaCutoff,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "participationId" to Scalars.encodeUUID(this.participationId),
                "mediaCutoff" to this.mediaCutoff.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionLeft. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionLeft"): LiveSessionLeft {
            val obj = element.asObject(path)
            return LiveSessionLeft(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                participationId = Scalars.decodeUUID(obj.field("participationId", path), "${path}.participationId"),
                mediaCutoff = LiveMediaCutoff.fromJson(obj.field("mediaCutoff", path), "${path}.mediaCutoff"),
            )
        }
    }
}

public data class LiveSessionOperation(
    public val operationId: String,
    public val requestId: String,
    public val liveSessionId: String,
    public val kind: LiveOperationKind,
    public val state: LiveOperationState,
    public val revision: String,
    public val requestedAt: String,
    public val completedAt: String? = null,
    public val completion: LiveSessionOperationCompletion? = null,
    public val failure: LiveOperationFailure? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "operationId" to Scalars.encodeUUID(this.operationId),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "kind" to this.kind.toJson(),
                "state" to this.state.toJson(),
                "revision" to Scalars.encodeDecimal(this.revision),
                "requestedAt" to JsonPrimitive(this.requestedAt),
                "completedAt" to (this.completedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "completion" to (this.completion?.let { v0 -> v0.toJson() } ?: JsonNull),
                "failure" to (this.failure?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionOperation. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionOperation"): LiveSessionOperation {
            val obj = element.asObject(path)
            return LiveSessionOperation(
                operationId = Scalars.decodeUUID(obj.field("operationId", path), "${path}.operationId"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                kind = LiveOperationKind.fromJson(obj.field("kind", path), "${path}.kind"),
                state = LiveOperationState.fromJson(obj.field("state", path), "${path}.state"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
                requestedAt = obj.field("requestedAt", path).asString("${path}.requestedAt"),
                completedAt = obj.field("completedAt", path).decodeNullable("${path}.completedAt") { v0, p0 -> v0.asString(p0) },
                completion = obj.field("completion", path).decodeNullable("${path}.completion") { v0, p0 -> LiveSessionOperationCompletion.fromJson(v0, p0) },
                failure = obj.field("failure", path).decodeNullable("${path}.failure") { v0, p0 -> LiveOperationFailure.fromJson(v0, p0) },
            )
        }
    }
}

public data class LiveSessionOperationCompletion(
    public val liveSessionId: String,
    public val generation: String,
    public val state: LiveSessionState,
    public val revision: String,
    public val completedAt: String,
    public val mediaCutoff: LiveMediaCutoff? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "generation" to Scalars.encodeDecimal(this.generation),
                "state" to this.state.toJson(),
                "revision" to Scalars.encodeDecimal(this.revision),
                "completedAt" to JsonPrimitive(this.completedAt),
                "mediaCutoff" to (this.mediaCutoff?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionOperationCompletion. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionOperationCompletion"): LiveSessionOperationCompletion {
            val obj = element.asObject(path)
            return LiveSessionOperationCompletion(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                generation = Scalars.decodeDecimal(obj.field("generation", path), "${path}.generation"),
                state = LiveSessionState.fromJson(obj.field("state", path), "${path}.state"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
                completedAt = obj.field("completedAt", path).asString("${path}.completedAt"),
                mediaCutoff = obj.field("mediaCutoff", path).decodeNullable("${path}.mediaCutoff") { v0, p0 -> LiveMediaCutoff.fromJson(v0, p0) },
            )
        }
    }
}

public data class LiveSessionOperationReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveSessionOperation,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to JsonPrimitive(this.serverTime),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionOperationReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionOperationReply"): LiveSessionOperationReply {
            val obj = element.asObject(path)
            return LiveSessionOperationReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).asString("${path}.serverTime"),
                result = LiveSessionOperation.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class LiveSessionPage(
    public val items: List<LiveSession>,
    public val nextCursor: String? = null,
    public val complete: Boolean,
    public val partialReason: String? = null,
    public val refreshRequired: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "complete" to JsonPrimitive(this.complete),
                "partialReason" to (this.partialReason?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionPage"): LiveSessionPage {
            val obj = element.asObject(path)
            return LiveSessionPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> LiveSession.fromJson(v0, p0) },
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                partialReason = obj.field("partialReason", path).decodeNullable("${path}.partialReason") { v0, p0 -> v0.asString(p0) },
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
            )
        }
    }
}

public data class LiveSessionPageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveSessionPage,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to JsonPrimitive(this.serverTime),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionPageReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionPageReply"): LiveSessionPageReply {
            val obj = element.asObject(path)
            return LiveSessionPageReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).asString("${path}.serverTime"),
                result = LiveSessionPage.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class LiveSessionReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String,
    public val result: LiveSession,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to JsonPrimitive(this.serverTime),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionReply"): LiveSessionReply {
            val obj = element.asObject(path)
            return LiveSessionReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).asString("${path}.serverTime"),
                result = LiveSession.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class LiveSessionStarted(
    public val liveSessionId: String,
    public val conversationId: String,
    public val kind: LiveSessionKind,
    public val mediaProfile: LiveMediaProfile,
    public val operationId: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "liveSessionId" to Scalars.encodeUUID(this.liveSessionId),
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "kind" to this.kind.toJson(),
                "mediaProfile" to this.mediaProfile.toJson(),
                "operationId" to Scalars.encodeUUID(this.operationId),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match LiveSessionStarted. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "LiveSessionStarted"): LiveSessionStarted {
            val obj = element.asObject(path)
            return LiveSessionStarted(
                liveSessionId = Scalars.decodeUUID(obj.field("liveSessionId", path), "${path}.liveSessionId"),
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                kind = LiveSessionKind.fromJson(obj.field("kind", path), "${path}.kind"),
                mediaProfile = LiveMediaProfile.fromJson(obj.field("mediaProfile", path), "${path}.mediaProfile"),
                operationId = Scalars.decodeUUID(obj.field("operationId", path), "${path}.operationId"),
            )
        }
    }
}

public data class MediaCutoff(
    public val state: String,
    public val scope: CutoffScope? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "state" to JsonPrimitive(this.state),
                "scope" to (this.scope?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match MediaCutoff. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "MediaCutoff"): MediaCutoff {
            val obj = element.asObject(path)
            return MediaCutoff(
                state = obj.field("state", path).asString("${path}.state"),
                scope = obj.field("scope", path).decodeNullable("${path}.scope") { v0, p0 -> CutoffScope.fromJson(v0, p0) },
            )
        }
    }
}

public data class MediaPolicy(
    public val leasePolicyId: String,
    public val maxLeaseMs: String,
    public val renewAttemptMs: String,
    public val preludeMaxBytes: String,
    public val preludeTimeoutMs: String,
    public val clockProfileId: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "leasePolicyId" to JsonPrimitive(this.leasePolicyId),
                "maxLeaseMs" to Scalars.encodeDecimal(this.maxLeaseMs),
                "renewAttemptMs" to Scalars.encodeDecimal(this.renewAttemptMs),
                "preludeMaxBytes" to JsonPrimitive(this.preludeMaxBytes),
                "preludeTimeoutMs" to JsonPrimitive(this.preludeTimeoutMs),
                "clockProfileId" to JsonPrimitive(this.clockProfileId),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match MediaPolicy. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "MediaPolicy"): MediaPolicy {
            val obj = element.asObject(path)
            return MediaPolicy(
                leasePolicyId = obj.field("leasePolicyId", path).asString("${path}.leasePolicyId"),
                maxLeaseMs = Scalars.decodeDecimal(obj.field("maxLeaseMs", path), "${path}.maxLeaseMs"),
                renewAttemptMs = Scalars.decodeDecimal(obj.field("renewAttemptMs", path), "${path}.renewAttemptMs"),
                preludeMaxBytes = obj.field("preludeMaxBytes", path).asString("${path}.preludeMaxBytes"),
                preludeTimeoutMs = obj.field("preludeTimeoutMs", path).asString("${path}.preludeTimeoutMs"),
                clockProfileId = obj.field("clockProfileId", path).asString("${path}.clockProfileId"),
            )
        }
    }
}

public data class Member(
    public val conversationId: String,
    public val principalId: String,
    public val role: String,
    public val status: String,
    public val membershipEpoch: String,
    public val visibilityEpoch: String,
    public val revision: String,
    public val visibleFromSequence: String,
    public val canStartBroadcast: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "principalId" to Scalars.encodeUUID(this.principalId),
                "role" to JsonPrimitive(this.role),
                "status" to JsonPrimitive(this.status),
                "membershipEpoch" to Scalars.encodeDecimal(this.membershipEpoch),
                "visibilityEpoch" to Scalars.encodeDecimal(this.visibilityEpoch),
                "revision" to Scalars.encodeDecimal(this.revision),
                "visibleFromSequence" to Scalars.encodeDecimal(this.visibleFromSequence),
                "canStartBroadcast" to JsonPrimitive(this.canStartBroadcast),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Member. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Member"): Member {
            val obj = element.asObject(path)
            return Member(
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                principalId = Scalars.decodeUUID(obj.field("principalId", path), "${path}.principalId"),
                role = obj.field("role", path).asString("${path}.role"),
                status = obj.field("status", path).asString("${path}.status"),
                membershipEpoch = Scalars.decodeDecimal(obj.field("membershipEpoch", path), "${path}.membershipEpoch"),
                visibilityEpoch = Scalars.decodeDecimal(obj.field("visibilityEpoch", path), "${path}.visibilityEpoch"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
                visibleFromSequence = Scalars.decodeDecimal(obj.field("visibleFromSequence", path), "${path}.visibleFromSequence"),
                canStartBroadcast = obj.field("canStartBroadcast", path).asBoolean("${path}.canStartBroadcast"),
            )
        }
    }
}

public data class MemberPage(
    public val items: List<Member>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "complete" to JsonPrimitive(this.complete),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match MemberPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "MemberPage"): MemberPage {
            val obj = element.asObject(path)
            return MemberPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> Member.fromJson(v0, p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class MembersReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: MemberPage? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match MembersReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "MembersReply"): MembersReply {
            val obj = element.asObject(path)
            return MembersReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> MemberPage.fromJson(v0, p0) },
            )
        }
    }
}

public data class Message(
    public val messageId: String,
    public val conversationId: String,
    public val authorId: String,
    public val sequence: String,
    public val revision: String,
    public val revisionSequence: String,
    public val createdAt: String,
    public val deleted: Boolean,
    public val text: String? = null,
    public val props: JsonObject? = null,
    public val editedAt: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "messageId" to Scalars.encodeUUID(this.messageId),
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "authorId" to JsonPrimitive(this.authorId),
                "sequence" to Scalars.encodeDecimal(this.sequence),
                "revision" to Scalars.encodeDecimal(this.revision),
                "revisionSequence" to Scalars.encodeDecimal(this.revisionSequence),
                "createdAt" to JsonPrimitive(this.createdAt),
                "deleted" to JsonPrimitive(this.deleted),
                "text" to (this.text?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "props" to (this.props?.let { v0 -> Scalars.encodeProperties(v0) } ?: JsonNull),
                "editedAt" to (this.editedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Message. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Message"): Message {
            val obj = element.asObject(path)
            return Message(
                messageId = Scalars.decodeUUID(obj.field("messageId", path), "${path}.messageId"),
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                authorId = obj.field("authorId", path).asString("${path}.authorId"),
                sequence = Scalars.decodeDecimal(obj.field("sequence", path), "${path}.sequence"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
                revisionSequence = Scalars.decodeDecimal(obj.field("revisionSequence", path), "${path}.revisionSequence"),
                createdAt = obj.field("createdAt", path).asString("${path}.createdAt"),
                deleted = obj.field("deleted", path).asBoolean("${path}.deleted"),
                text = obj.field("text", path).decodeNullable("${path}.text") { v0, p0 -> v0.asString(p0) },
                props = obj.field("props", path).decodeNullable("${path}.props") { v0, p0 -> Scalars.decodeProperties(v0, p0) },
                editedAt = obj.field("editedAt", path).decodeNullable("${path}.editedAt") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class MessageAck(
    public val messageId: String,
    public val conversationId: String,
    public val sequence: String,
    public val revision: String,
    public val status: String,
    public val cursor: Cursor? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "messageId" to Scalars.encodeUUID(this.messageId),
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "sequence" to Scalars.encodeDecimal(this.sequence),
                "revision" to Scalars.encodeDecimal(this.revision),
                "status" to JsonPrimitive(this.status),
                "cursor" to (this.cursor?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match MessageAck. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "MessageAck"): MessageAck {
            val obj = element.asObject(path)
            return MessageAck(
                messageId = Scalars.decodeUUID(obj.field("messageId", path), "${path}.messageId"),
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                sequence = Scalars.decodeDecimal(obj.field("sequence", path), "${path}.sequence"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
                status = obj.field("status", path).asString("${path}.status"),
                cursor = obj.field("cursor", path).decodeNullable("${path}.cursor") { v0, p0 -> Cursor.fromJson(v0, p0) },
            )
        }
    }
}

public data class MessagePage(
    public val items: List<Message>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "complete" to JsonPrimitive(this.complete),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match MessagePage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "MessagePage"): MessagePage {
            val obj = element.asObject(path)
            return MessagePage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> Message.fromJson(v0, p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class MessagesReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: MessagePage? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match MessagesReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "MessagesReply"): MessagesReply {
            val obj = element.asObject(path)
            return MessagesReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> MessagePage.fromJson(v0, p0) },
            )
        }
    }
}

public data class Operation(
    public val operationId: String,
    public val kind: String,
    public val targetRef: ResourceRef? = null,
    public val state: String,
    public val revision: String,
    public val requestedAt: String,
    public val updatedAt: String,
    public val steps: List<OperationStep>,
    public val result: OperationResult? = null,
    public val blockedReason: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "operationId" to Scalars.encodeUUID(this.operationId),
                "kind" to JsonPrimitive(this.kind),
                "targetRef" to (this.targetRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "state" to JsonPrimitive(this.state),
                "revision" to Scalars.encodeDecimal(this.revision),
                "requestedAt" to JsonPrimitive(this.requestedAt),
                "updatedAt" to JsonPrimitive(this.updatedAt),
                "steps" to JsonArray(this.steps.map { v0 -> v0.toJson() }),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
                "blockedReason" to (this.blockedReason?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Operation. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Operation"): Operation {
            val obj = element.asObject(path)
            return Operation(
                operationId = Scalars.decodeUUID(obj.field("operationId", path), "${path}.operationId"),
                kind = obj.field("kind", path).asString("${path}.kind"),
                targetRef = obj.field("targetRef", path).decodeNullable("${path}.targetRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                state = obj.field("state", path).asString("${path}.state"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
                requestedAt = obj.field("requestedAt", path).asString("${path}.requestedAt"),
                updatedAt = obj.field("updatedAt", path).asString("${path}.updatedAt"),
                steps = obj.field("steps", path).decodeList("${path}.steps") { v0, p0 -> OperationStep.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> OperationResult.fromJson(v0, p0) },
                blockedReason = obj.field("blockedReason", path).decodeNullable("${path}.blockedReason") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class OperationRef(
    public val operationId: String,
    public val owner: String,
    public val href: String,
    public val state: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "operationId" to Scalars.encodeUUID(this.operationId),
                "owner" to JsonPrimitive(this.owner),
                "href" to JsonPrimitive(this.href),
                "state" to JsonPrimitive(this.state),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match OperationRef. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "OperationRef"): OperationRef {
            val obj = element.asObject(path)
            return OperationRef(
                operationId = Scalars.decodeUUID(obj.field("operationId", path), "${path}.operationId"),
                owner = obj.field("owner", path).asString("${path}.owner"),
                href = obj.field("href", path).asString("${path}.href"),
                state = obj.field("state", path).asString("${path}.state"),
            )
        }
    }
}

public data class OperationResult(
    public val projectId: String? = null,
    public val incarnation: String? = null,
    public val status: String? = null,
    public val backend: String? = null,
    public val environment: String? = null,
    public val policyRevision: String? = null,
    public val expiresAt: String? = null,
    public val kind: String? = null,
    public val resourceRef: ResourceRef? = null,
    public val delivery: CredentialDelivery? = null,
    public val keyId: String? = null,
    public val endpointId: String? = null,
    public val enabled: Boolean? = null,
    public val liveSessionCompletion: LiveSessionOperationCompletion? = null,
    public val replayedDeliveries: Int? = null,
    public val skippedDeliveries: Int? = null,
    public val messagePreview: Boolean? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "projectId" to (this.projectId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "incarnation" to (this.incarnation?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "status" to (this.status?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "backend" to (this.backend?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "environment" to (this.environment?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "policyRevision" to (this.policyRevision?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "expiresAt" to (this.expiresAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "kind" to (this.kind?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "delivery" to (this.delivery?.let { v0 -> v0.toJson() } ?: JsonNull),
                "keyId" to (this.keyId?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "endpointId" to (this.endpointId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "enabled" to (this.enabled?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "liveSessionCompletion" to (this.liveSessionCompletion?.let { v0 -> v0.toJson() } ?: JsonNull),
                "replayedDeliveries" to (this.replayedDeliveries?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "skippedDeliveries" to (this.skippedDeliveries?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "messagePreview" to (this.messagePreview?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match OperationResult. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "OperationResult"): OperationResult {
            val obj = element.asObject(path)
            return OperationResult(
                projectId = obj.field("projectId", path).decodeNullable("${path}.projectId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                incarnation = obj.field("incarnation", path).decodeNullable("${path}.incarnation") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                status = obj.field("status", path).decodeNullable("${path}.status") { v0, p0 -> v0.asString(p0) },
                backend = obj.field("backend", path).decodeNullable("${path}.backend") { v0, p0 -> v0.asString(p0) },
                environment = obj.field("environment", path).decodeNullable("${path}.environment") { v0, p0 -> v0.asString(p0) },
                policyRevision = obj.field("policyRevision", path).decodeNullable("${path}.policyRevision") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                expiresAt = obj.field("expiresAt", path).decodeNullable("${path}.expiresAt") { v0, p0 -> v0.asString(p0) },
                kind = obj.field("kind", path).decodeNullable("${path}.kind") { v0, p0 -> v0.asString(p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                delivery = obj.field("delivery", path).decodeNullable("${path}.delivery") { v0, p0 -> CredentialDelivery.fromJson(v0, p0) },
                keyId = obj.field("keyId", path).decodeNullable("${path}.keyId") { v0, p0 -> v0.asString(p0) },
                endpointId = obj.field("endpointId", path).decodeNullable("${path}.endpointId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                enabled = obj.field("enabled", path).decodeNullable("${path}.enabled") { v0, p0 -> v0.asBoolean(p0) },
                liveSessionCompletion = obj.field("liveSessionCompletion", path).decodeNullable("${path}.liveSessionCompletion") { v0, p0 -> LiveSessionOperationCompletion.fromJson(v0, p0) },
                replayedDeliveries = obj.field("replayedDeliveries", path).decodeNullable("${path}.replayedDeliveries") { v0, p0 -> v0.asInt(p0) },
                skippedDeliveries = obj.field("skippedDeliveries", path).decodeNullable("${path}.skippedDeliveries") { v0, p0 -> v0.asInt(p0) },
                messagePreview = obj.field("messagePreview", path).decodeNullable("${path}.messagePreview") { v0, p0 -> v0.asBoolean(p0) },
            )
        }
    }
}

public data class OperationStep(
    public val stepId: String,
    public val state: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "stepId" to JsonPrimitive(this.stepId),
                "state" to JsonPrimitive(this.state),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match OperationStep. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "OperationStep"): OperationStep {
            val obj = element.asObject(path)
            return OperationStep(
                stepId = obj.field("stepId", path).asString("${path}.stepId"),
                state = obj.field("state", path).asString("${path}.state"),
            )
        }
    }
}

public data class Organization(
    public val orgId: String,
    public val name: String,
    public val status: String,
    public val revision: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "orgId" to Scalars.encodeUUID(this.orgId),
                "name" to JsonPrimitive(this.name),
                "status" to JsonPrimitive(this.status),
                "revision" to Scalars.encodeDecimal(this.revision),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Organization. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Organization"): Organization {
            val obj = element.asObject(path)
            return Organization(
                orgId = Scalars.decodeUUID(obj.field("orgId", path), "${path}.orgId"),
                name = obj.field("name", path).asString("${path}.name"),
                status = obj.field("status", path).asString("${path}.status"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
            )
        }
    }
}

public data class Principal(
    public val principalId: String,
    public val externalUserId: String,
    public val status: String,
    public val revision: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "principalId" to Scalars.encodeUUID(this.principalId),
                "externalUserId" to JsonPrimitive(this.externalUserId),
                "status" to JsonPrimitive(this.status),
                "revision" to Scalars.encodeDecimal(this.revision),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Principal. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Principal"): Principal {
            val obj = element.asObject(path)
            return Principal(
                principalId = Scalars.decodeUUID(obj.field("principalId", path), "${path}.principalId"),
                externalUserId = obj.field("externalUserId", path).asString("${path}.externalUserId"),
                status = obj.field("status", path).asString("${path}.status"),
                revision = Scalars.decodeDecimal(obj.field("revision", path), "${path}.revision"),
            )
        }
    }
}

public data class ReadReceipt(
    public val principalId: String,
    public val membershipEpoch: String,
    public val visibilityEpoch: String,
    public val deliveredThroughSequence: String? = null,
    public val readThroughSequence: String? = null,
    public val updatedAt: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "principalId" to Scalars.encodeUUID(this.principalId),
                "membershipEpoch" to Scalars.encodeDecimal(this.membershipEpoch),
                "visibilityEpoch" to Scalars.encodeDecimal(this.visibilityEpoch),
                "deliveredThroughSequence" to (this.deliveredThroughSequence?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "readThroughSequence" to (this.readThroughSequence?.let { v0 -> Scalars.encodeDecimal(v0) } ?: JsonNull),
                "updatedAt" to (this.updatedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ReadReceipt. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ReadReceipt"): ReadReceipt {
            val obj = element.asObject(path)
            return ReadReceipt(
                principalId = Scalars.decodeUUID(obj.field("principalId", path), "${path}.principalId"),
                membershipEpoch = Scalars.decodeDecimal(obj.field("membershipEpoch", path), "${path}.membershipEpoch"),
                visibilityEpoch = Scalars.decodeDecimal(obj.field("visibilityEpoch", path), "${path}.visibilityEpoch"),
                deliveredThroughSequence = obj.field("deliveredThroughSequence", path).decodeNullable("${path}.deliveredThroughSequence") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                readThroughSequence = obj.field("readThroughSequence", path).decodeNullable("${path}.readThroughSequence") { v0, p0 -> Scalars.decodeDecimal(v0, p0) },
                updatedAt = obj.field("updatedAt", path).decodeNullable("${path}.updatedAt") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class ReceiptPage(
    public val items: List<ReadReceipt>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "complete" to JsonPrimitive(this.complete),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ReceiptPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ReceiptPage"): ReceiptPage {
            val obj = element.asObject(path)
            return ReceiptPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> ReadReceipt.fromJson(v0, p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class ReceiptsReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: ReceiptPage? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ReceiptsReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ReceiptsReply"): ReceiptsReply {
            val obj = element.asObject(path)
            return ReceiptsReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> ReceiptPage.fromJson(v0, p0) },
            )
        }
    }
}

public data class ReportReceiptReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: ReadReceipt? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ReportReceiptReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ReportReceiptReply"): ReportReceiptReply {
            val obj = element.asObject(path)
            return ReportReceiptReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> ReadReceipt.fromJson(v0, p0) },
            )
        }
    }
}

public data class RequestResolution(
    public val state: String,
    public val requestId: String,
    public val checkedAt: String,
    public val resultWithheld: Boolean,
    public val receipt: ResolvedReceipt? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "state" to JsonPrimitive(this.state),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "checkedAt" to JsonPrimitive(this.checkedAt),
                "resultWithheld" to JsonPrimitive(this.resultWithheld),
                "receipt" to (this.receipt?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match RequestResolution. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "RequestResolution"): RequestResolution {
            val obj = element.asObject(path)
            return RequestResolution(
                state = obj.field("state", path).asString("${path}.state"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                checkedAt = obj.field("checkedAt", path).asString("${path}.checkedAt"),
                resultWithheld = obj.field("resultWithheld", path).asBoolean("${path}.resultWithheld"),
                receipt = obj.field("receipt", path).decodeNullable("${path}.receipt") { v0, p0 -> ResolvedReceipt.fromJson(v0, p0) },
            )
        }
    }
}

public data class ResolveRequestReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: RequestResolution? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ResolveRequestReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ResolveRequestReply"): ResolveRequestReply {
            val obj = element.asObject(path)
            return ResolveRequestReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> RequestResolution.fromJson(v0, p0) },
            )
        }
    }
}

public data class ResolvedReceipt(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: RetainedResult? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ResolvedReceipt. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ResolvedReceipt"): ResolvedReceipt {
            val obj = element.asObject(path)
            return ResolvedReceipt(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> RetainedResult.fromJson(v0, p0) },
            )
        }
    }
}

public data class ResourceRef(
    public val kind: String,
    public val id: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "kind" to JsonPrimitive(this.kind),
                "id" to JsonPrimitive(this.id),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match ResourceRef. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "ResourceRef"): ResourceRef {
            val obj = element.asObject(path)
            return ResourceRef(
                kind = obj.field("kind", path).asString("${path}.kind"),
                id = obj.field("id", path).asString("${path}.id"),
            )
        }
    }
}

/** Exactly one typed field contains the retained, currently authorized receipt result. */
public data class RetainedResult(
    public val billingCheckoutSession: BillingCheckoutSession? = null,
    public val billingPortalSession: BillingPortalSession? = null,
    public val broadcastPermissionChanged: BroadcastPermissionChanged? = null,
    public val conversation: Conversation? = null,
    public val conversationMemberBatch: ConversationMemberBatch? = null,
    public val conversationMute: ConversationMute? = null,
    public val credentialDeliveryReceipt: CredentialDeliveryReceipt? = null,
    public val deliveryAck: DeliveryAck? = null,
    public val liveAlertBatch: LiveAlertBatch? = null,
    public val liveCredentialIssuance: LiveCredentialIssuance? = null,
    public val liveSessionEndRequested: LiveSessionEndRequested? = null,
    public val liveSessionJoined: LiveSessionJoined? = null,
    public val liveSessionLeft: LiveSessionLeft? = null,
    public val liveSessionStarted: LiveSessionStarted? = null,
    public val member: Member? = null,
    public val message: Message? = null,
    public val messageAck: MessageAck? = null,
    public val organization: Organization? = null,
    public val principal: Principal? = null,
    public val readReceipt: ReadReceipt? = null,
    public val sessionBootstrap: SessionBootstrap? = null,
    public val sessionRevocation: SessionRevocation? = null,
    public val signedProof: JsonObject? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "billingCheckoutSession" to (this.billingCheckoutSession?.let { v0 -> v0.toJson() } ?: JsonNull),
                "billingPortalSession" to (this.billingPortalSession?.let { v0 -> v0.toJson() } ?: JsonNull),
                "broadcastPermissionChanged" to (this.broadcastPermissionChanged?.let { v0 -> v0.toJson() } ?: JsonNull),
                "conversation" to (this.conversation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "conversationMemberBatch" to (this.conversationMemberBatch?.let { v0 -> v0.toJson() } ?: JsonNull),
                "conversationMute" to (this.conversationMute?.let { v0 -> v0.toJson() } ?: JsonNull),
                "credentialDeliveryReceipt" to (this.credentialDeliveryReceipt?.let { v0 -> v0.toJson() } ?: JsonNull),
                "deliveryAck" to (this.deliveryAck?.let { v0 -> v0.toJson() } ?: JsonNull),
                "liveAlertBatch" to (this.liveAlertBatch?.let { v0 -> v0.toJson() } ?: JsonNull),
                "liveCredentialIssuance" to (this.liveCredentialIssuance?.let { v0 -> v0.toJson() } ?: JsonNull),
                "liveSessionEndRequested" to (this.liveSessionEndRequested?.let { v0 -> v0.toJson() } ?: JsonNull),
                "liveSessionJoined" to (this.liveSessionJoined?.let { v0 -> v0.toJson() } ?: JsonNull),
                "liveSessionLeft" to (this.liveSessionLeft?.let { v0 -> v0.toJson() } ?: JsonNull),
                "liveSessionStarted" to (this.liveSessionStarted?.let { v0 -> v0.toJson() } ?: JsonNull),
                "member" to (this.member?.let { v0 -> v0.toJson() } ?: JsonNull),
                "message" to (this.message?.let { v0 -> v0.toJson() } ?: JsonNull),
                "messageAck" to (this.messageAck?.let { v0 -> v0.toJson() } ?: JsonNull),
                "organization" to (this.organization?.let { v0 -> v0.toJson() } ?: JsonNull),
                "principal" to (this.principal?.let { v0 -> v0.toJson() } ?: JsonNull),
                "readReceipt" to (this.readReceipt?.let { v0 -> v0.toJson() } ?: JsonNull),
                "sessionBootstrap" to (this.sessionBootstrap?.let { v0 -> v0.toJson() } ?: JsonNull),
                "sessionRevocation" to (this.sessionRevocation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "signedProof" to (this.signedProof?.let { v0 -> Scalars.encodeSignedProof(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match RetainedResult. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "RetainedResult"): RetainedResult {
            val obj = element.asObject(path)
            return RetainedResult(
                billingCheckoutSession = obj.field("billingCheckoutSession", path).decodeNullable("${path}.billingCheckoutSession") { v0, p0 -> BillingCheckoutSession.fromJson(v0, p0) },
                billingPortalSession = obj.field("billingPortalSession", path).decodeNullable("${path}.billingPortalSession") { v0, p0 -> BillingPortalSession.fromJson(v0, p0) },
                broadcastPermissionChanged = obj.field("broadcastPermissionChanged", path).decodeNullable("${path}.broadcastPermissionChanged") { v0, p0 -> BroadcastPermissionChanged.fromJson(v0, p0) },
                conversation = obj.field("conversation", path).decodeNullable("${path}.conversation") { v0, p0 -> Conversation.fromJson(v0, p0) },
                conversationMemberBatch = obj.field("conversationMemberBatch", path).decodeNullable("${path}.conversationMemberBatch") { v0, p0 -> ConversationMemberBatch.fromJson(v0, p0) },
                conversationMute = obj.field("conversationMute", path).decodeNullable("${path}.conversationMute") { v0, p0 -> ConversationMute.fromJson(v0, p0) },
                credentialDeliveryReceipt = obj.field("credentialDeliveryReceipt", path).decodeNullable("${path}.credentialDeliveryReceipt") { v0, p0 -> CredentialDeliveryReceipt.fromJson(v0, p0) },
                deliveryAck = obj.field("deliveryAck", path).decodeNullable("${path}.deliveryAck") { v0, p0 -> DeliveryAck.fromJson(v0, p0) },
                liveAlertBatch = obj.field("liveAlertBatch", path).decodeNullable("${path}.liveAlertBatch") { v0, p0 -> LiveAlertBatch.fromJson(v0, p0) },
                liveCredentialIssuance = obj.field("liveCredentialIssuance", path).decodeNullable("${path}.liveCredentialIssuance") { v0, p0 -> LiveCredentialIssuance.fromJson(v0, p0) },
                liveSessionEndRequested = obj.field("liveSessionEndRequested", path).decodeNullable("${path}.liveSessionEndRequested") { v0, p0 -> LiveSessionEndRequested.fromJson(v0, p0) },
                liveSessionJoined = obj.field("liveSessionJoined", path).decodeNullable("${path}.liveSessionJoined") { v0, p0 -> LiveSessionJoined.fromJson(v0, p0) },
                liveSessionLeft = obj.field("liveSessionLeft", path).decodeNullable("${path}.liveSessionLeft") { v0, p0 -> LiveSessionLeft.fromJson(v0, p0) },
                liveSessionStarted = obj.field("liveSessionStarted", path).decodeNullable("${path}.liveSessionStarted") { v0, p0 -> LiveSessionStarted.fromJson(v0, p0) },
                member = obj.field("member", path).decodeNullable("${path}.member") { v0, p0 -> Member.fromJson(v0, p0) },
                message = obj.field("message", path).decodeNullable("${path}.message") { v0, p0 -> Message.fromJson(v0, p0) },
                messageAck = obj.field("messageAck", path).decodeNullable("${path}.messageAck") { v0, p0 -> MessageAck.fromJson(v0, p0) },
                organization = obj.field("organization", path).decodeNullable("${path}.organization") { v0, p0 -> Organization.fromJson(v0, p0) },
                principal = obj.field("principal", path).decodeNullable("${path}.principal") { v0, p0 -> Principal.fromJson(v0, p0) },
                readReceipt = obj.field("readReceipt", path).decodeNullable("${path}.readReceipt") { v0, p0 -> ReadReceipt.fromJson(v0, p0) },
                sessionBootstrap = obj.field("sessionBootstrap", path).decodeNullable("${path}.sessionBootstrap") { v0, p0 -> SessionBootstrap.fromJson(v0, p0) },
                sessionRevocation = obj.field("sessionRevocation", path).decodeNullable("${path}.sessionRevocation") { v0, p0 -> SessionRevocation.fromJson(v0, p0) },
                signedProof = obj.field("signedProof", path).decodeNullable("${path}.signedProof") { v0, p0 -> Scalars.decodeSignedProof(v0, p0) },
            )
        }
    }

    /** Redacts credentials so logs and crash reports never carry them. */
    override fun toString(): String =
        "RetainedResult(" +
        "billingCheckoutSession=${this.billingCheckoutSession}, " +
        "billingPortalSession=${this.billingPortalSession}, " +
        "broadcastPermissionChanged=${this.broadcastPermissionChanged}, " +
        "conversation=${this.conversation}, " +
        "conversationMemberBatch=${this.conversationMemberBatch}, " +
        "conversationMute=${this.conversationMute}, " +
        "credentialDeliveryReceipt=${this.credentialDeliveryReceipt}, " +
        "deliveryAck=${this.deliveryAck}, " +
        "liveAlertBatch=${this.liveAlertBatch}, " +
        "liveCredentialIssuance=${this.liveCredentialIssuance}, " +
        "liveSessionEndRequested=${this.liveSessionEndRequested}, " +
        "liveSessionJoined=${this.liveSessionJoined}, " +
        "liveSessionLeft=${this.liveSessionLeft}, " +
        "liveSessionStarted=${this.liveSessionStarted}, " +
        "member=${this.member}, " +
        "message=${this.message}, " +
        "messageAck=${this.messageAck}, " +
        "organization=${this.organization}, " +
        "principal=${this.principal}, " +
        "readReceipt=${this.readReceipt}, " +
        "sessionBootstrap=${this.sessionBootstrap}, " +
        "sessionRevocation=${this.sessionRevocation}, " +
        "signedProof=<redacted>)"
}

public data class RevokeSessionReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: SessionRevocation? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match RevokeSessionReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "RevokeSessionReply"): RevokeSessionReply {
            val obj = element.asObject(path)
            return RevokeSessionReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> SessionRevocation.fromJson(v0, p0) },
            )
        }
    }
}

public data class RouteReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: JsonObject? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> Scalars.encodeSignedProof(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match RouteReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "RouteReply"): RouteReply {
            val obj = element.asObject(path)
            return RouteReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> Scalars.decodeSignedProof(v0, p0) },
            )
        }
    }

    /** Redacts credentials so logs and crash reports never carry them. */
    override fun toString(): String =
        "RouteReply(" +
        "status=${this.status}, " +
        "requestId=${this.requestId}, " +
        "serverTime=${this.serverTime}, " +
        "receiptId=${this.receiptId}, " +
        "committedAt=${this.committedAt}, " +
        "replayed=${this.replayed}, " +
        "operation=${this.operation}, " +
        "resourceRef=${this.resourceRef}, " +
        "result=<redacted>)"
}

public data class SearchHit(
    public val conversationId: String,
    public val message: Message? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "conversationId" to Scalars.encodeUUID(this.conversationId),
                "message" to (this.message?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match SearchHit. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "SearchHit"): SearchHit {
            val obj = element.asObject(path)
            return SearchHit(
                conversationId = Scalars.decodeUUID(obj.field("conversationId", path), "${path}.conversationId"),
                message = obj.field("message", path).decodeNullable("${path}.message") { v0, p0 -> Message.fromJson(v0, p0) },
            )
        }
    }
}

public data class SearchPage(
    public val items: List<SearchHit>,
    public val complete: Boolean,
    public val refreshRequired: Boolean,
    public val nextCursor: String? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "items" to JsonArray(this.items.map { v0 -> v0.toJson() }),
                "complete" to JsonPrimitive(this.complete),
                "refreshRequired" to JsonPrimitive(this.refreshRequired),
                "nextCursor" to (this.nextCursor?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match SearchPage. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "SearchPage"): SearchPage {
            val obj = element.asObject(path)
            return SearchPage(
                items = obj.field("items", path).decodeList("${path}.items") { v0, p0 -> SearchHit.fromJson(v0, p0) },
                complete = obj.field("complete", path).asBoolean("${path}.complete"),
                refreshRequired = obj.field("refreshRequired", path).asBoolean("${path}.refreshRequired"),
                nextCursor = obj.field("nextCursor", path).decodeNullable("${path}.nextCursor") { v0, p0 -> v0.asString(p0) },
            )
        }
    }
}

public data class SearchReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: SearchPage? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match SearchReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "SearchReply"): SearchReply {
            val obj = element.asObject(path)
            return SearchReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> SearchPage.fromJson(v0, p0) },
            )
        }
    }
}

public data class SendMessageReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: MessageAck? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match SendMessageReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "SendMessageReply"): SendMessageReply {
            val obj = element.asObject(path)
            return SendMessageReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> MessageAck.fromJson(v0, p0) },
            )
        }
    }
}

public data class Session(
    public val sessionId: String,
    public val principalId: String,
    public val deviceId: String,
    public val incarnation: String,
    public val sessionRevision: String,
    public val expiresAt: String,
    public val status: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "sessionId" to Scalars.encodeUUID(this.sessionId),
                "principalId" to Scalars.encodeUUID(this.principalId),
                "deviceId" to Scalars.encodeUUID(this.deviceId),
                "incarnation" to Scalars.encodeUUID(this.incarnation),
                "sessionRevision" to Scalars.encodeDecimal(this.sessionRevision),
                "expiresAt" to JsonPrimitive(this.expiresAt),
                "status" to JsonPrimitive(this.status),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match Session. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "Session"): Session {
            val obj = element.asObject(path)
            return Session(
                sessionId = Scalars.decodeUUID(obj.field("sessionId", path), "${path}.sessionId"),
                principalId = Scalars.decodeUUID(obj.field("principalId", path), "${path}.principalId"),
                deviceId = Scalars.decodeUUID(obj.field("deviceId", path), "${path}.deviceId"),
                incarnation = Scalars.decodeUUID(obj.field("incarnation", path), "${path}.incarnation"),
                sessionRevision = Scalars.decodeDecimal(obj.field("sessionRevision", path), "${path}.sessionRevision"),
                expiresAt = obj.field("expiresAt", path).asString("${path}.expiresAt"),
                status = obj.field("status", path).asString("${path}.status"),
            )
        }
    }
}

public data class SessionBootstrap(
    public val session: Session? = null,
    public val tokenExpiresAt: String,
    public val sessionToken: String,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "session" to (this.session?.let { v0 -> v0.toJson() } ?: JsonNull),
                "tokenExpiresAt" to JsonPrimitive(this.tokenExpiresAt),
                "sessionToken" to JsonPrimitive(this.sessionToken),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match SessionBootstrap. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "SessionBootstrap"): SessionBootstrap {
            val obj = element.asObject(path)
            return SessionBootstrap(
                session = obj.field("session", path).decodeNullable("${path}.session") { v0, p0 -> Session.fromJson(v0, p0) },
                tokenExpiresAt = obj.field("tokenExpiresAt", path).asString("${path}.tokenExpiresAt"),
                sessionToken = obj.field("sessionToken", path).asString("${path}.sessionToken"),
            )
        }
    }

    /** Redacts credentials so logs and crash reports never carry them. */
    override fun toString(): String =
        "SessionBootstrap(" +
        "session=${this.session}, " +
        "tokenExpiresAt=${this.tokenExpiresAt}, " +
        "sessionToken=<redacted>)"
}

public data class SessionRevocation(
    public val sessionId: String,
    public val status: String,
    public val mediaCutoff: MediaCutoff? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "sessionId" to Scalars.encodeUUID(this.sessionId),
                "status" to JsonPrimitive(this.status),
                "mediaCutoff" to (this.mediaCutoff?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match SessionRevocation. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "SessionRevocation"): SessionRevocation {
            val obj = element.asObject(path)
            return SessionRevocation(
                sessionId = Scalars.decodeUUID(obj.field("sessionId", path), "${path}.sessionId"),
                status = obj.field("status", path).asString("${path}.status"),
                mediaCutoff = obj.field("mediaCutoff", path).decodeNullable("${path}.mediaCutoff") { v0, p0 -> MediaCutoff.fromJson(v0, p0) },
            )
        }
    }
}

public data class SetConversationMutePayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val result: ConversationMute,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "receiptId" to Scalars.encodeUUID(this.receiptId),
                "committedAt" to JsonPrimitive(this.committedAt),
                "replayed" to JsonPrimitive(this.replayed),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match SetConversationMutePayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "SetConversationMutePayload"): SetConversationMutePayload {
            val obj = element.asObject(path)
            return SetConversationMutePayload(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                receiptId = Scalars.decodeUUID(obj.field("receiptId", path), "${path}.receiptId"),
                committedAt = obj.field("committedAt", path).asString("${path}.committedAt"),
                replayed = obj.field("replayed", path).asBoolean("${path}.replayed"),
                result = ConversationMute.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class StartLiveSessionPayload(
    public val status: String,
    public val requestId: String,
    public val receiptId: String,
    public val committedAt: String,
    public val replayed: Boolean,
    public val operation: OperationRef,
    public val result: LiveSessionStarted,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "receiptId" to Scalars.encodeUUID(this.receiptId),
                "committedAt" to JsonPrimitive(this.committedAt),
                "replayed" to JsonPrimitive(this.replayed),
                "operation" to this.operation.toJson(),
                "result" to this.result.toJson(),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match StartLiveSessionPayload. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "StartLiveSessionPayload"): StartLiveSessionPayload {
            val obj = element.asObject(path)
            return StartLiveSessionPayload(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                receiptId = Scalars.decodeUUID(obj.field("receiptId", path), "${path}.receiptId"),
                committedAt = obj.field("committedAt", path).asString("${path}.committedAt"),
                replayed = obj.field("replayed", path).asBoolean("${path}.replayed"),
                operation = OperationRef.fromJson(obj.field("operation", path), "${path}.operation"),
                result = LiveSessionStarted.fromJson(obj.field("result", path), "${path}.result"),
            )
        }
    }
}

public data class TypingReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: TypingStatus? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match TypingReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "TypingReply"): TypingReply {
            val obj = element.asObject(path)
            return TypingReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> TypingStatus.fromJson(v0, p0) },
            )
        }
    }
}

public data class TypingStatus(
    public val accepted: Boolean,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "accepted" to JsonPrimitive(this.accepted),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match TypingStatus. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "TypingStatus"): TypingStatus {
            val obj = element.asObject(path)
            return TypingStatus(
                accepted = obj.field("accepted", path).asBoolean("${path}.accepted"),
            )
        }
    }
}

public data class UpdateConversationReply(
    public val status: String,
    public val requestId: String,
    public val serverTime: String? = null,
    public val receiptId: String? = null,
    public val committedAt: String? = null,
    public val replayed: Boolean? = null,
    public val operation: OperationRef? = null,
    public val resourceRef: ResourceRef? = null,
    public val result: Conversation? = null,
) {
    /** The JSON form, with every field and explicit nulls. */
    public fun toJson(): JsonObject =
        JsonObject(
            linkedMapOf<String, JsonElement>(
                "status" to JsonPrimitive(this.status),
                "requestId" to Scalars.encodeUUID(this.requestId),
                "serverTime" to (this.serverTime?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "receiptId" to (this.receiptId?.let { v0 -> Scalars.encodeUUID(v0) } ?: JsonNull),
                "committedAt" to (this.committedAt?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "replayed" to (this.replayed?.let { v0 -> JsonPrimitive(v0) } ?: JsonNull),
                "operation" to (this.operation?.let { v0 -> v0.toJson() } ?: JsonNull),
                "resourceRef" to (this.resourceRef?.let { v0 -> v0.toJson() } ?: JsonNull),
                "result" to (this.result?.let { v0 -> v0.toJson() } ?: JsonNull),
            ),
        )

    public companion object {
        /** Decodes [element], throwing [ShapeException] when it does not match UpdateConversationReply. Unknown fields are ignored. */
        public fun fromJson(element: JsonElement, path: String = "UpdateConversationReply"): UpdateConversationReply {
            val obj = element.asObject(path)
            return UpdateConversationReply(
                status = obj.field("status", path).asString("${path}.status"),
                requestId = Scalars.decodeUUID(obj.field("requestId", path), "${path}.requestId"),
                serverTime = obj.field("serverTime", path).decodeNullable("${path}.serverTime") { v0, p0 -> v0.asString(p0) },
                receiptId = obj.field("receiptId", path).decodeNullable("${path}.receiptId") { v0, p0 -> Scalars.decodeUUID(v0, p0) },
                committedAt = obj.field("committedAt", path).decodeNullable("${path}.committedAt") { v0, p0 -> v0.asString(p0) },
                replayed = obj.field("replayed", path).decodeNullable("${path}.replayed") { v0, p0 -> v0.asBoolean(p0) },
                operation = obj.field("operation", path).decodeNullable("${path}.operation") { v0, p0 -> OperationRef.fromJson(v0, p0) },
                resourceRef = obj.field("resourceRef", path).decodeNullable("${path}.resourceRef") { v0, p0 -> ResourceRef.fromJson(v0, p0) },
                result = obj.field("result", path).decodeNullable("${path}.result") { v0, p0 -> Conversation.fromJson(v0, p0) },
            )
        }
    }
}
