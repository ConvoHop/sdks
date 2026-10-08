// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.math.BigInteger

/** Codecs for the custom scalars. Decoders check string formats; the server enforces ranges and sizes. */
public object Scalars {
    private val patternDecimal: Regex = Regex("^(0|[1-9][0-9]*)\$")
    private val maximumDecimal: BigInteger = BigInteger("9223372036854775807")
    private val patternUUID: Regex = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\$")
    private val disallowedUUID: Set<String> = setOf("00000000-0000-0000-0000-000000000000")

    /** Non-negative 64-bit counter as a canonical decimal string. Never convert it to a floating-point number. */
    public fun decodeDecimal(element: JsonElement, path: String = "Decimal"): String {
        val value = element.asString(path)
        if (!patternDecimal.matches(value)) throw ShapeException(path, "must be a Decimal")
        val number = value.toBigIntegerOrNull() ?: throw ShapeException(path, "must be a Decimal")
        if (number > maximumDecimal) throw ShapeException(path, "must be at most 9223372036854775807")
        return value
    }

    public fun encodeDecimal(value: String): JsonElement = JsonPrimitive(value)

    /**
     * Requested page size.
     * The server accepts 1 to 100.
     */
    public fun decodePageSize(element: JsonElement, path: String = "PageSize"): Int = element.asInt(path)

    public fun encodePageSize(value: Int): JsonElement = JsonPrimitive(value)

    /**
     * Application-defined JSON object. Numbers must stay within the interoperable safe-integer range.
     * The server accepts at most 8192 bytes of canonical JSON.
     */
    public fun decodeProperties(element: JsonElement, path: String = "Properties"): JsonObject = element.asObject(path)

    public fun encodeProperties(value: JsonObject): JsonElement = value

    /**
     * Server-signed JSON object. Treat it as opaque and pass it back unchanged.
     * The server accepts at most 32768 bytes of canonical JSON.
     * It carries the string properties signature.
     */
    public fun decodeSignedProof(element: JsonElement, path: String = "SignedProof"): JsonObject = element.asObject(path)

    public fun encodeSignedProof(value: JsonObject): JsonElement = value

    /** Canonical lowercase UUID. The nil UUID is rejected. */
    public fun decodeUUID(element: JsonElement, path: String = "UUID"): String {
        val value = element.asString(path)
        if (!patternUUID.matches(value)) throw ShapeException(path, "must be a UUID")
        if (value in disallowedUUID) throw ShapeException(path, "is not allowed")
        return value
    }

    public fun encodeUUID(value: String): JsonElement = JsonPrimitive(value)
}
