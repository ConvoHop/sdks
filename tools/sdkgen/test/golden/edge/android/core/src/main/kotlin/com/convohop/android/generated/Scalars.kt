// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.math.BigInteger

/** Codecs for the custom scalars. Decoders check string formats; the server enforces ranges and sizes. */
public object Scalars {
    private val patternCounter: Regex = Regex("^(0|[1-9][0-9]*)\$")
    private val maximumCounter: BigInteger = BigInteger("9223372036854775807")

    /**
     * Non-negative counter as a decimal string.
     * Descriptions keep their line breaks, and a closing comment marker *\/ stays escaped.
     */
    public fun decodeCounter(element: JsonElement, path: String = "Counter"): String {
        val value = element.asString(path)
        if (!patternCounter.matches(value)) throw ShapeException(path, "must be a Counter")
        val number = value.toBigIntegerOrNull() ?: throw ShapeException(path, "must be a Counter")
        if (number > maximumCounter) throw ShapeException(path, "must be at most 9223372036854775807")
        return value
    }

    public fun encodeCounter(value: String): JsonElement = JsonPrimitive(value)

    /**
     * Requested page size.
     * The server accepts 1 to 50.
     */
    public fun decodePageSize(element: JsonElement, path: String = "PageSize"): Int = element.asInt(path)

    public fun encodePageSize(value: Int): JsonElement = JsonPrimitive(value)
}
