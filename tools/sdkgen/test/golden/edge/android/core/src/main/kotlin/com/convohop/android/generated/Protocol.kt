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
    public const val MAX_DOCUMENT_BYTES: Int = 4096
    public const val WEBSOCKET_SUBPROTOCOL: String = "graphql-transport-ws"
}

/** Idempotency classes and their retry budgets. */
public object Idempotency {
    /** Transient signal. Never retried. */
    public val ephemeral: IdempotencyClass =
        IdempotencyClass("ephemeral", "none", false, null, null)

    /** Retry with the same requestId and input; resolve an unknown outcome with resolveRequest. */
    public val idempotent: IdempotencyClass =
        IdempotencyClass("idempotent", "sameRequest", true, 3, 60000L)

    /** Authorized by a single-use permit. Retry with the same requestId and permit. */
    public val permitBound: IdempotencyClass =
        IdempotencyClass("permitBound", "sameRequest", false, 3, 60000L)

    /** Replay with the same requestId and input; resolveRequest cannot read the outcome. */
    public val replayOnly: IdempotencyClass =
        IdempotencyClass("replayOnly", "sameRequest", false, 3, 60000L)

    /** Read-only. Repeat freely. */
    public val safe: IdempotencyClass =
        IdempotencyClass("safe", "repeat", false, null, null)

    /** Like idempotent, but the result is good for one use. */
    public val singleUse: IdempotencyClass =
        IdempotencyClass("singleUse", "sameRequest", true, 2, 1000L)

    /** Every class, keyed by name. */
    public val byName: Map<String, IdempotencyClass> = listOf(ephemeral, idempotent, permitBound, replayOnly, safe, singleUse).associateBy { it.name }
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
     * Ordered alpha events, gap-filled with alpha.events.
     * Events arrive in ascending sequence. Persist the last applied cursor.
     */
    public val eventStream: RealtimeChannel =
        RealtimeChannel(
            "eventStream",
            "alpha.eventStream",
            "alpha.events",
            "EventPage",
            "alpha.capabilities",
            "wssUrl",
            listOf("tenant", "token"),
            4096,
            2,
            10,
            20,
            100L,
            1000L,
            0L,
            setOf(4401, 4403),
        )

    /** Every channel a client subscribes to. */
    public val channels: List<RealtimeChannel> = listOf(eventStream)

    /** Known event types, keyed by type. Deliver other types as unknown events. */
    public val events: Map<String, RealtimeEventType> =
        listOf(
            RealtimeEventType("item.changed", "An item changed.", "item", listOf("itemId"), listOf("note")),
            RealtimeEventType("job.finished", "A job finished.", "job", listOf("jobId", "revision"), emptyList()),
            RealtimeEventType("job.started", "A job started.", "job", listOf("jobId"), emptyList()),
        ).associateBy { it.type }
}
