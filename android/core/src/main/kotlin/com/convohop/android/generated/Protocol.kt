// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

/** Retry rules for one idempotency class. */
public class IdempotencyClass internal constructor(
    public val name: String,
    /** `none`, `sameRequest` or `repeat`. */
    public val retry: String,
    /** Whether resolveRequest can settle an unknown outcome. */
    public val resolvable: Boolean,
    /** Attempts allowed for one requestId, when retries reuse it. */
    public val maxAttempts: Int?,
    /** How long retries may reuse one requestId, when they do. */
    public val windowMs: Long?,
)

/** One realtime channel and its limits. */
public class RealtimeChannel internal constructor(
    public val name: String,
    /** The subscription operation id. */
    public val subscription: String,
    /** The replay query that fills gaps. */
    public val replay: String,
    public val pageType: String,
    /** The operation whose result names the WebSocket endpoint. */
    public val endpointOperation: String?,
    public val endpointResultField: String?,
    /** connection_init payload fields, in order. */
    public val connectionInit: List<String>,
    public val maxFrameBytes: Int,
    public val maxPendingPages: Int,
    public val subscribeLimit: Int,
    public val replayLimit: Int,
    public val reconnectBaseDelayMs: Long,
    public val reconnectMaxDelayMs: Long,
    public val reconnectJitterMs: Long,
    /** Close codes after which reconnecting cannot succeed. */
    public val terminalCloseCodes: Set<Int>,
)

/** One event type of the realtime envelope. */
public class RealtimeEventType internal constructor(
    public val type: String,
    public val summary: String,
    public val subject: String?,
    public val requiredPayload: List<String>,
    public val optionalPayload: List<String>,
)

/** HTTP and WebSocket transport constants. */
public object Transport {
    public const val PATH: String = "/graphql"
    public const val MAX_DOCUMENT_BYTES: Int = 32768
    public const val WEBSOCKET_SUBPROTOCOL: String = "graphql-transport-ws"
}

/** Idempotency classes and their retry budgets. */
public object Idempotency {
    /** Transient signal. Not deduplicated or retried; send a fresh signal instead. */
    public val ephemeral: IdempotencyClass =
        IdempotencyClass("ephemeral", "none", false, null, null)

    /** Retry with the same requestId and identical input within the retry budget. The authority deduplicates by requestId; resolve an unknown outcome with resolveRequest. */
    public val idempotent: IdempotencyClass =
        IdempotencyClass("idempotent", "sameRequest", true, 3, 60000L)

    /** Authorized by a single-delivery permit. Retry with the same requestId and permit; outcomes cannot be resolved by lookup. */
    public val permitBound: IdempotencyClass =
        IdempotencyClass("permitBound", "sameRequest", false, 3, 60000L)

    /** Read-only. Repeat freely; each attempt may use a new requestId. */
    public val safe: IdempotencyClass =
        IdempotencyClass("safe", "repeat", false, null, null)

    /** Like idempotent, but the result carries a short-lived credential for one connection. Request a new one instead of reusing an expired result. */
    public val singleUse: IdempotencyClass =
        IdempotencyClass("singleUse", "sameRequest", true, 3, 60000L)

    /** Every class, keyed by name. */
    public val byName: Map<String, IdempotencyClass> = listOf(ephemeral, idempotent, permitBound, safe, singleUse).associateBy { it.name }
}

/** The realtime envelope, channels and event catalog. */
public object Realtime {
    /** The envelope type of realtime events. */
    public const val ENVELOPE_TYPE: String = "Event"
    /** The envelope field that names the event type. */
    public const val DISCRIMINATOR: String = "type"
    public const val PAYLOAD_FIELD: String = "payload"
    public const val SUBJECT_FIELD: String = "subjectRef"
    /** What clients do with event types they do not know. */
    public const val UNKNOWN_TYPES: String = "deliverAsUnknown"

    /**
     * Ordered events of one conversation over graphql-transport-ws, gap-filled with the replay query.
     * Events arrive in ascending sequence per conversation. Apply each page, then persist its nextCursor; resume after the last applied cursor.
     */
    public val conversationEvents: RealtimeChannel =
        RealtimeChannel(
            "conversationEvents",
            "communication.conversationEvents",
            "communication.events",
            "EventPage",
            "communication.route",
            "wssUrl",
            listOf("projectId", "incarnation", "token"),
            65536,
            4,
            50,
            100,
            1000L,
            10000L,
            500L,
            setOf(4400, 4401, 4403, 4408, 4409),
        )

    /** Every channel a client subscribes to. */
    public val channels: List<RealtimeChannel> = listOf(conversationEvents)

    /** Known event types, keyed by type. Deliver other types as unknown events. */
    public val events: Map<String, RealtimeEventType> =
        listOf(
            RealtimeEventType("conversation.created", "A conversation was created.", "conversation", listOf("revision"), emptyList()),
            RealtimeEventType("conversation.updated", "A conversation's title or properties changed.", "conversation", listOf("revision"), emptyList()),
            RealtimeEventType("live.alerted", "Members were alerted about a live session.", "liveSession", listOf("liveSessionId", "generation"), emptyList()),
            RealtimeEventType("live.connected", "Media reported a participant connection.", "liveSession", listOf("liveSessionId", "generation", "revision"), emptyList()),
            RealtimeEventType("live.ended", "A live session ended.", "liveSession", listOf("liveSessionId", "generation", "revision"), emptyList()),
            RealtimeEventType("live.participationChanged", "A participant joined or left a live session.", "liveSession", listOf("liveSessionId"), listOf("generation")),
            RealtimeEventType("live.ready", "A live session became ready for media.", "liveSession", listOf("liveSessionId", "generation", "revision"), emptyList()),
            RealtimeEventType("live.started", "A live session started.", "liveSession", listOf("liveSessionId", "generation", "revision"), emptyList()),
            RealtimeEventType("member.added", "A member was added.", "member", listOf("principalId", "membershipEpoch", "visibilityEpoch", "revision"), emptyList()),
            RealtimeEventType("member.broadcastPermissionChanged", "A member's live session broadcast permission changed.", "member", listOf("principalId", "revision"), emptyList()),
            RealtimeEventType("member.historyExpanded", "A member's visible history was expanded.", "member", listOf("principalId", "membershipEpoch", "visibilityEpoch", "revision"), emptyList()),
            RealtimeEventType("member.removed", "A member was removed.", "member", listOf("principalId", "membershipEpoch", "visibilityEpoch", "revision"), emptyList()),
            RealtimeEventType("member.roleChanged", "An active member's role changed.", "member", listOf("principalId", "membershipEpoch", "visibilityEpoch", "revision"), emptyList()),
            RealtimeEventType("message.created", "A message was sent.", "message", listOf("messageId", "revision", "revisionSequence"), emptyList()),
            RealtimeEventType("message.deleted", "A message was deleted.", "message", listOf("messageId", "revision", "revisionSequence"), emptyList()),
            RealtimeEventType("message.edited", "A message was edited.", "message", listOf("messageId", "revision", "revisionSequence"), emptyList()),
            RealtimeEventType("receipt.reported", "A member reported delivery or read progress.", "member", listOf("principalId", "membershipEpoch", "visibilityEpoch", "kind", "throughSequence"), emptyList()),
        ).associateBy { it.type }
}
