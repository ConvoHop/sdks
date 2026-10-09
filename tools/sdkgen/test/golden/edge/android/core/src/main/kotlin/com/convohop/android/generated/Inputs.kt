// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Request metadata that every root field takes. */
public data class ContextInput(
    /** Tenant that owns the request. */
    public val tenant: String? = null,
    public val requestId: String,
    /** Omitted when null; the server default is 1. */
    public val attempt: Int? = null,
    /** Single-use permit. Only alpha.redeem accepts it. */
    public val permit: String? = null,
    /** Omitted when null; the server default is ["a","b|c"]. */
    public val tags: List<String>? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        this.tenant?.let { v0 -> __fields["tenant"] = JsonPrimitive(v0) }
        __fields["requestId"] = JsonPrimitive(this.requestId)
        this.attempt?.let { v0 -> __fields["attempt"] = JsonPrimitive(v0) }
        this.permit?.let { v0 -> __fields["permit"] = JsonPrimitive(v0) }
        this.tags?.let { v0 -> __fields["tags"] = JsonArray(v0.map { v1 -> JsonPrimitive(v1) }) }
        return JsonObject(__fields)
    }
}

public data class ResolveInput(
    public val requestId: String,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["requestId"] = JsonPrimitive(this.requestId)
        return JsonObject(__fields)
    }
}

/**
 * Filters for alpha.items.
 * A closing comment marker *\/ must not end a generated comment.
 */
public data class ItemsInput(
    /**
     * Page size.
     * Defaults to 20.
     * Omitted when null; the server default is 20.
     */
    public val limit: Int? = null,
    public val cursor: String? = null,
    public val fruits: List<Fruit>? = null,
    public val minWeight: Double? = null,
    /** Omitted when null; the server default is false. */
    public val includeDeprecated: Boolean? = null,
    /** Omitted when null; the server default is "GET". */
    public val method: HTTPMethod? = null,
    public val box: Box_3dInput? = null,
    /** Deprecated: Use fruits. */
    public val legacyFilter: String? = null,
    public val item2: Int? = null,
    public val item10: Int? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        this.limit?.let { v0 -> __fields["limit"] = JsonPrimitive(v0) }
        this.cursor?.let { v0 -> __fields["cursor"] = JsonPrimitive(v0) }
        this.fruits?.let { v0 -> __fields["fruits"] = JsonArray(v0.map { v1 -> v1.toJson() }) }
        this.minWeight?.let { v0 -> __fields["minWeight"] = JsonPrimitive(v0) }
        this.includeDeprecated?.let { v0 -> __fields["includeDeprecated"] = JsonPrimitive(v0) }
        this.method?.let { v0 -> __fields["method"] = v0.toJson() }
        this.box?.let { v0 -> __fields["box"] = v0.toJson() }
        this.legacyFilter?.let { v0 -> __fields["legacyFilter"] = JsonPrimitive(v0) }
        this.item2?.let { v0 -> __fields["item2"] = JsonPrimitive(v0) }
        this.item10?.let { v0 -> __fields["item10"] = JsonPrimitive(v0) }
        return JsonObject(__fields)
    }
}

public data class Box_3dInput(
    public val width: Double,
    public val height: Double,
    public val depth: Double,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        __fields["width"] = JsonPrimitive(this.width)
        __fields["height"] = JsonPrimitive(this.height)
        __fields["depth"] = JsonPrimitive(this.depth)
        return JsonObject(__fields)
    }
}

public data class EventsInput(
    public val after: String? = null,
    public val limit: Int,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        this.after?.let { v0 -> __fields["after"] = JsonPrimitive(v0) }
        __fields["limit"] = Scalars.encodePageSize(this.limit)
        return JsonObject(__fields)
    }
}

public data class PingInput(
    public val note: String? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        this.note?.let { v0 -> __fields["note"] = JsonPrimitive(v0) }
        return JsonObject(__fields)
    }
}

public data class FetchInput(
    /** Omitted when null; the server default is "GET". */
    public val method: HTTPMethod? = null,
) {
    /** The JSON form. Null fields are omitted so server defaults apply. */
    public fun toJson(): JsonObject {
        val __fields = LinkedHashMap<String, JsonElement>()
        this.method?.let { v0 -> __fields["method"] = v0.toJson() }
        return JsonObject(__fields)
    }
}
