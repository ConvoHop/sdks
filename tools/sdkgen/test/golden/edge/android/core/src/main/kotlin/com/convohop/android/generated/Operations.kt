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
    /** Client operations of the alpha plane. */
    public object Alpha {
        /** Read the server capabilities. */
        public val capabilities: OperationSpec<Unit, Capabilities> =
            OperationSpec(
                OperationDescriptor(
                    id = "alpha.capabilities",
                    plane = "alpha",
                    kind = "query",
                    field = "capabilities",
                    operationName = "AlphaCapabilities",
                    document = "query AlphaCapabilities(\$context: ContextInput!) {\n  capabilities(context: \$context) {\n    version\n    wssUrl\n    features\n  }\n}",
                    resultType = "Capabilities!",
                    contextArgument = "context",
                    contextFields = mapOf("tenant" to "optional", "requestId" to "required", "attempt" to "optional", "permit" to "forbidden", "tags" to "optional"),
                    inputArgument = null,
                    inputType = null,
                    inputRequired = false,
                    inputFields = emptyList(),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { _ -> null },
                { element, path -> Capabilities.fromJson(element, path) },
            )

        /** Look up the outcome of an earlier alpha mutation by requestId. */
        public val resolveRequest: OperationSpec<ResolveInput, Receipt> =
            OperationSpec(
                OperationDescriptor(
                    id = "alpha.resolveRequest",
                    plane = "alpha",
                    kind = "query",
                    field = "resolveRequest",
                    operationName = "AlphaResolveRequest",
                    document = "query AlphaResolveRequest(\$context: ContextInput!, \$input: ResolveInput!) {\n  resolveRequest(context: \$context, input: \$input) {\n    requestId\n    committed\n    sequence\n  }\n}",
                    resultType = "Receipt!",
                    contextArgument = "context",
                    contextFields = mapOf("tenant" to "required", "requestId" to "required", "attempt" to "optional", "permit" to "forbidden", "tags" to "optional"),
                    inputArgument = "input",
                    inputType = "ResolveInput",
                    inputRequired = true,
                    inputFields = listOf("requestId"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> Receipt.fromJson(element, path) },
            )

        /** List items in server order. */
        public val items: OperationSpec<ItemsInput, ItemPage> =
            OperationSpec(
                OperationDescriptor(
                    id = "alpha.items",
                    plane = "alpha",
                    kind = "query",
                    field = "items",
                    operationName = "AlphaItems",
                    document = "query AlphaItems(\$context: ContextInput!, \$input: ItemsInput!) {\n  items(context: \$context, input: \$input) {\n    items {\n      id\n      name\n      fruit\n      weight\n      ripe\n      oldName\n      legacyCode\n      grid\n      aliases\n      history\n    }\n    complete\n    refreshRequired\n    nextCursor\n  }\n}",
                    resultType = "ItemPage!",
                    contextArgument = "context",
                    contextFields = mapOf("tenant" to "required", "requestId" to "required", "attempt" to "optional", "permit" to "forbidden", "tags" to "optional"),
                    inputArgument = "input",
                    inputType = "ItemsInput",
                    inputRequired = true,
                    inputFields = listOf("limit", "cursor", "fruits", "minWeight", "includeDeprecated", "method", "box", "legacyFilter", "item2", "item10"),
                    idempotency = "safe",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> ItemPage.fromJson(element, path) },
            )

        /** Replay alpha events after a cursor. */
        public val events: OperationSpec<EventsInput, EventPage> =
            OperationSpec(
                OperationDescriptor(
                    id = "alpha.events",
                    plane = "alpha",
                    kind = "query",
                    field = "events",
                    operationName = "AlphaEvents",
                    document = "query AlphaEvents(\$context: ContextInput!, \$input: EventsInput!) {\n  events(context: \$context, input: \$input) {\n    items {\n      sequence\n      type\n      subjectRef {\n        kind\n        id\n      }\n      payload {\n        itemId\n        jobId\n        revision\n        note\n      }\n    }\n    complete\n    refreshRequired\n    nextCursor\n  }\n}",
                    resultType = "EventPage!",
                    contextArgument = "context",
                    contextFields = mapOf("tenant" to "required", "requestId" to "required", "attempt" to "optional", "permit" to "forbidden", "tags" to "optional"),
                    inputArgument = "input",
                    inputType = "EventsInput",
                    inputRequired = true,
                    inputFields = listOf("after", "limit"),
                    idempotency = "safe",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input.toJson() },
                { element, path -> EventPage.fromJson(element, path) },
            )

        /** Fetch a <status> for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, & a back\slash for _escaping_ in snake_case. */
        public val fetchHTTPStatus: OperationSpec<FetchInput?, Int?> =
            OperationSpec(
                OperationDescriptor(
                    id = "alpha.fetchHTTPStatus",
                    plane = "alpha",
                    kind = "query",
                    field = "fetchHTTPStatus",
                    operationName = "AlphaFetchHTTPStatus",
                    document = "query AlphaFetchHTTPStatus(\$context: ContextInput!, \$input: FetchInput) {\n  fetchHTTPStatus(context: \$context, input: \$input)\n}",
                    resultType = "Int",
                    contextArgument = "context",
                    contextFields = mapOf("tenant" to "required", "requestId" to "required", "attempt" to "optional", "permit" to "forbidden", "tags" to "optional"),
                    inputArgument = "input",
                    inputType = "FetchInput",
                    inputRequired = false,
                    inputFields = listOf("method"),
                    idempotency = "safe",
                    layer = "both",
                    realtimeChannel = null,
                ),
                { input -> input?.toJson() },
                { element, path -> element.decodeNullable(path) { v0, p0 -> v0.asInt(p0) } },
            )

        /** 1. Send an ephemeral ping. */
        public val ping: OperationSpec<PingInput?, Boolean> =
            OperationSpec(
                OperationDescriptor(
                    id = "alpha.ping",
                    plane = "alpha",
                    kind = "mutation",
                    field = "ping",
                    operationName = "AlphaPing",
                    document = "mutation AlphaPing(\$context: ContextInput!, \$input: PingInput) {\n  ping(context: \$context, input: \$input)\n}",
                    resultType = "Boolean!",
                    contextArgument = "context",
                    contextFields = mapOf("tenant" to "required", "requestId" to "required", "attempt" to "optional", "permit" to "forbidden", "tags" to "optional"),
                    inputArgument = "input",
                    inputType = "PingInput",
                    inputRequired = false,
                    inputFields = listOf("note"),
                    idempotency = "ephemeral",
                    layer = "client",
                    realtimeChannel = null,
                ),
                { input -> input?.toJson() },
                { element, path -> element.asBoolean(path) },
            )

        /** Subscribe to alpha events after a cursor. */
        public val eventStream: OperationSpec<EventsInput, EventPage> =
            OperationSpec(
                OperationDescriptor(
                    id = "alpha.eventStream",
                    plane = "alpha",
                    kind = "subscription",
                    field = "eventStream",
                    operationName = "AlphaEventStream",
                    document = "subscription AlphaEventStream(\$context: ContextInput!, \$input: EventsInput!) {\n  eventStream(context: \$context, input: \$input) {\n    items {\n      sequence\n      type\n      subjectRef {\n        kind\n        id\n      }\n      payload {\n        itemId\n        jobId\n        revision\n        note\n      }\n    }\n    complete\n    refreshRequired\n    nextCursor\n  }\n}",
                    resultType = "EventPage!",
                    contextArgument = "context",
                    contextFields = mapOf("tenant" to "required", "requestId" to "required", "attempt" to "optional", "permit" to "forbidden", "tags" to "optional"),
                    inputArgument = "input",
                    inputType = "EventsInput",
                    inputRequired = true,
                    inputFields = listOf("after", "limit"),
                    idempotency = "safe",
                    layer = "client",
                    realtimeChannel = "eventStream",
                ),
                { input -> input.toJson() },
                { element, path -> EventPage.fromJson(element, path) },
            )
    }

    /** Every client operation, in schema order. */
    public val all: List<OperationSpec<*, *>> =
        listOf(
            Alpha.capabilities,
            Alpha.resolveRequest,
            Alpha.items,
            Alpha.events,
            Alpha.fetchHTTPStatus,
            Alpha.ping,
            Alpha.eventStream,
        )

    /** [all], keyed by operation id. */
    public val byId: Map<String, OperationSpec<*, *>> = all.associateBy { it.descriptor.id }
}
