package com.convohop.android.core

import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.math.BigDecimal
import java.security.MessageDigest

/**
 * A value that breaks the protocol: a malformed response, stored record or
 * argument. Inside a request the SDK reports it as `INVALID_RESPONSE`.
 */
public class ConvoHopProtocolException(message: String) : RuntimeException(message)

internal fun protocolError(message: String): Nothing = throw ConvoHopProtocolException(message)

private val JSON_NUMBER = Regex("-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?")
private val MAX_SAFE_INTEGER = BigDecimal("9007199254740991")
private val HEX = "0123456789abcdef".toCharArray()

/** Canonical JSON: sorted keys, no whitespace, bounded numbers. Request bodies and fingerprints use it. */
public object CanonicalJson {
    /** Encodes [value], rejecting numbers outside the safe integer range. */
    public fun encode(value: JsonElement): String = StringBuilder().also { write(value, it) }.toString()

    /** `sha256:` followed by the hex SHA-256 of [encode]. */
    public fun fingerprint(value: JsonElement): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(encode(value).toByteArray(Charsets.UTF_8))
        val out = StringBuilder("sha256:")
        for (byte in digest) {
            val n = byte.toInt() and 0xff
            out.append(HEX[n ushr 4]).append(HEX[n and 0x0f])
        }
        return out.toString()
    }

    /** Parses strict JSON text; anything else is a [ConvoHopProtocolException]. */
    public fun parse(text: String): JsonElement {
        val element = try {
            Json.parseToJsonElement(text)
        } catch (_: SerializationException) {
            protocolError("Unrecognized JSON")
        } catch (_: IllegalArgumentException) {
            protocolError("Unrecognized JSON")
        }
        requireStrict(element, 0)
        return element
    }

    private fun requireStrict(element: JsonElement, depth: Int) {
        if (depth > 64) protocolError("JSON nesting exceeds its bound")
        when (element) {
            is JsonObject -> element.values.forEach { requireStrict(it, depth + 1) }
            is JsonArray -> element.forEach { requireStrict(it, depth + 1) }
            JsonNull -> Unit
            is JsonPrimitive -> if (!element.isString && element.content != "true" && element.content != "false" &&
                !JSON_NUMBER.matches(element.content)
            ) {
                protocolError("Unrecognized JSON literal")
            }
        }
    }

    private fun write(value: JsonElement, out: StringBuilder) {
        when (value) {
            JsonNull -> out.append("null")
            is JsonObject -> {
                out.append('{')
                value.keys.sorted().forEachIndexed { index, key ->
                    if (index > 0) out.append(',')
                    quote(key, out)
                    out.append(':')
                    write(value.getValue(key), out)
                }
                out.append('}')
            }
            is JsonArray -> {
                out.append('[')
                value.forEachIndexed { index, item ->
                    if (index > 0) out.append(',')
                    write(item, out)
                }
                out.append(']')
            }
            is JsonPrimitive -> when {
                value.isString -> quote(value.content, out)
                value.content == "true" || value.content == "false" -> out.append(value.content)
                else -> out.append(number(value.content))
            }
        }
    }

    private fun number(literal: String): String {
        if (!JSON_NUMBER.matches(literal)) protocolError("Unsafe protocol number")
        val decimal = try {
            BigDecimal(literal)
        } catch (_: NumberFormatException) {
            protocolError("Unsafe protocol number")
        }
        if (decimal.abs() > MAX_SAFE_INTEGER) protocolError("Unsafe protocol number")
        val stripped = decimal.stripTrailingZeros()
        // Beyond double precision the plain form would only grow; such inputs are not protocol numbers.
        if (stripped.scale() > 1_100) protocolError("Unsafe protocol number")
        // Plain decimal digits keep request fingerprints identical on every JVM.
        return if (stripped.signum() == 0) "0" else stripped.toPlainString()
    }

    /** JSON string quoting with the escapes ECMAScript's JSON.stringify uses. */
    internal fun quote(value: String, out: StringBuilder) {
        out.append('"')
        var index = 0
        while (index < value.length) {
            val c = value[index]
            when {
                c == '"' -> out.append("\\\"")
                c == '\\' -> out.append("\\\\")
                c == '\b' -> out.append("\\b")
                c == '\u000c' -> out.append("\\f")
                c == '\n' -> out.append("\\n")
                c == '\r' -> out.append("\\r")
                c == '\t' -> out.append("\\t")
                c < ' ' -> unicode(c, out)
                Character.isHighSurrogate(c) && index + 1 < value.length && Character.isLowSurrogate(value[index + 1]) -> {
                    out.append(c).append(value[index + 1])
                    index++
                }
                Character.isSurrogate(c) -> unicode(c, out)
                else -> out.append(c)
            }
            index++
        }
        out.append('"')
    }

    private fun unicode(c: Char, out: StringBuilder) {
        val n = c.code
        out.append("\\u").append(HEX[(n shr 12) and 0xf]).append(HEX[(n shr 8) and 0xf])
            .append(HEX[(n shr 4) and 0xf]).append(HEX[n and 0xf])
    }
}

internal fun JsonElement?.protocolObject(): JsonObject = this as? JsonObject ?: protocolError("Invalid protocol object")

internal fun JsonElement?.protocolString(): String {
    val primitive = this as? JsonPrimitive
    if (primitive == null || primitive is JsonNull || !primitive.isString) protocolError("Expected a protocol string")
    return primitive.content
}

internal fun JsonElement?.isJsonString(): Boolean = this is JsonPrimitive && this !is JsonNull && this.isString

internal fun JsonElement?.isJsonBoolean(): Boolean =
    this is JsonPrimitive && this !is JsonNull && !this.isString && (this.content == "true" || this.content == "false")

/** A JSON number that is an integer in the safe range (any sign), or null. */
internal fun JsonElement?.safeInteger(): Long? {
    val primitive = this as? JsonPrimitive ?: return null
    if (primitive is JsonNull || primitive.isString || !JSON_NUMBER.matches(primitive.content)) return null
    return try {
        val decimal = BigDecimal(primitive.content)
        if (decimal.abs() > MAX_SAFE_INTEGER) null else decimal.longValueExact()
    } catch (_: RuntimeException) {
        null
    }
}

/** A non-negative integer no larger than 2^53 - 1, or null. */
internal fun JsonElement?.safeNonNegativeLong(): Long? = safeInteger()?.takeIf { it >= 0 }

internal fun jsonObjectOf(vararg pairs: Pair<String, JsonElement?>): JsonObject {
    val map = LinkedHashMap<String, JsonElement>()
    for ((key, value) in pairs) if (value != null) map[key] = value
    return JsonObject(map)
}

internal fun String.json(): JsonPrimitive = JsonPrimitive(this)

/** The string value, or null for any other JSON value. */
internal fun JsonElement?.stringOrNull(): String? = if (isJsonString()) (this as JsonPrimitive).content else null

/** The value as a 32-bit integer, or null when it is not an integral number in range. */
internal fun JsonElement?.intOrNull(): Int? {
    val primitive = this as? JsonPrimitive ?: return null
    if (primitive is JsonNull || primitive.isString || !JSON_NUMBER.matches(primitive.content)) return null
    return try {
        BigDecimal(primitive.content).intValueExact()
    } catch (_: RuntimeException) {
        null
    }
}
