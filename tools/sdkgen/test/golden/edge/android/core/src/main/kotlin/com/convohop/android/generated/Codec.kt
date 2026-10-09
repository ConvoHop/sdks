// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.math.BigDecimal

/**
 * A response value that does not match the schema. [path] names the value,
 * for example `SendMessageReply.result.cursor.sequence`. The runtime reports
 * it as INVALID_RESPONSE.
 */
public class ShapeException(public val path: String, public val reason: String) : RuntimeException("$path $reason")

/** The most items one response list may hold. */
public const val MAX_LIST_ITEMS: Int = 100

private val JSON_NUMBER = Regex("-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?")

internal fun JsonObject.field(name: String, path: String): JsonElement =
    this[name] ?: throw ShapeException("$path.$name", "is missing")

internal fun JsonElement.asObject(path: String): JsonObject =
    this as? JsonObject ?: throw ShapeException(path, "must be an object")

internal fun JsonElement.asList(path: String): JsonArray {
    val array = this as? JsonArray ?: throw ShapeException(path, "must be a list")
    if (array.size > MAX_LIST_ITEMS) throw ShapeException(path, "must hold at most $MAX_LIST_ITEMS items")
    return array
}

internal fun JsonElement.asString(path: String): String {
    val primitive = this as? JsonPrimitive
    if (primitive == null || !primitive.isString) throw ShapeException(path, "must be a string")
    return primitive.content
}

internal fun JsonElement.asBoolean(path: String): Boolean {
    val primitive = this as? JsonPrimitive
    if (primitive == null || primitive.isString || primitive is JsonNull) throw ShapeException(path, "must be a boolean")
    return when (primitive.content) {
        "true" -> true
        "false" -> false
        else -> throw ShapeException(path, "must be a boolean")
    }
}

private fun JsonElement.numberLiteral(path: String, expected: String): String {
    val primitive = this as? JsonPrimitive
    if (primitive == null || primitive.isString || primitive is JsonNull || !JSON_NUMBER.matches(primitive.content)) {
        throw ShapeException(path, "must be $expected")
    }
    return primitive.content
}

/** GraphQL Int is a signed 32-bit integer. Integral literals such as `5.0` are accepted. */
internal fun JsonElement.asInt(path: String): Int {
    val literal = numberLiteral(path, "an integer")
    return try {
        BigDecimal(literal).intValueExact()
    } catch (_: RuntimeException) {
        throw ShapeException(path, "must be a 32-bit integer")
    }
}

internal fun JsonElement.asDouble(path: String): Double {
    val number = numberLiteral(path, "a number").toDouble()
    if (!number.isFinite()) throw ShapeException(path, "must be a finite number")
    return number
}

internal inline fun <T> JsonElement.decodeList(path: String, decode: (JsonElement, String) -> T): List<T> {
    val array = asList(path)
    val items = ArrayList<T>(array.size)
    for (index in array.indices) items.add(decode(array[index], "$path[$index]"))
    return items
}

internal inline fun <T : Any> JsonElement.decodeNullable(path: String, decode: (JsonElement, String) -> T): T? =
    if (this is JsonNull) null else decode(this, path)
