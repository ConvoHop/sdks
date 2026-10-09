package com.convohop.conformance

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.math.BigInteger

// Strict decoding of driver-protocol parameters, mirroring the reference driver's params.mts. A key that is
// present with a JSON null is present: optional decoders reject it rather than treat it as absent.

/** A malformed parameter. It is the protocol error INVALID_PARAMS, never an SDK result. */
internal class ParamsException(message: String) : RuntimeException(message)

/** A protocol failure other than INVALID_PARAMS, with its driver-protocol code. */
internal class ProtocolException(val code: String, message: String) : RuntimeException(message)

private const val MAX_SAFE_INTEGER = 9_007_199_254_740_991L
private val HANDLE = Regex("[A-Za-z0-9._:-]{1,64}")
private val COUNTER = Regex("0|[1-9][0-9]{0,18}")

internal fun record(value: JsonElement?, name: String): JsonObject =
    value as? JsonObject ?: throw ParamsException("$name must be an object")

internal fun JsonObject.text(name: String): String {
    val value = this[name]
    if (value !is JsonPrimitive || !value.isString) throw ParamsException("$name must be a string")
    return value.content
}

internal fun JsonObject.optionalText(name: String): String? = if (containsKey(name)) text(name) else null

internal fun JsonObject.integer(name: String, min: Long, max: Long): Long? {
    if (!containsKey(name)) return null
    val value = safeInteger(this[name])
    if (value == null || value < min || value > max) throw ParamsException("$name must be an integer in $min..$max")
    return value
}

internal fun JsonObject.counter(name: String): BigInteger? {
    val value = optionalText(name) ?: return null
    if (!COUNTER.matches(value)) throw ParamsException("$name must be a canonical counter string")
    return BigInteger(value)
}

internal fun JsonObject.handle(name: String): String {
    val value = text(name)
    if (!HANDLE.matches(value)) throw ParamsException("$name must match [A-Za-z0-9._:-]{1,64}")
    return value
}

/** [value] when JavaScript reads it as a safe integer, otherwise null. 1.0 and 1e2 are integers there. */
internal fun safeInteger(value: JsonElement?): Long? {
    if (value !is JsonPrimitive || value.isString) return null
    // Booleans and null are not numbers; CanonicalJson.parse already rejected every other literal.
    val number = value.content.toDoubleOrNull() ?: return null
    if (number != Math.rint(number) || Math.abs(number) > MAX_SAFE_INTEGER) return null
    return number.toLong()
}
