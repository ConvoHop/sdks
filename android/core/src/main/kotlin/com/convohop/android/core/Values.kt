package com.convohop.android.core

import com.convohop.android.generated.Cursor
import com.convohop.android.generated.EventPage
import com.convohop.android.generated.ShapeException
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import java.math.BigInteger

private val UUID_PATTERN = Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
private const val NIL_UUID = "00000000-0000-0000-0000-000000000000"
private val COUNTER_PATTERN = Regex("0|[1-9][0-9]*")
private val MAX_COUNTER = BigInteger("9223372036854775807")

/** Checks for the protocol's scalar formats. */
public object ProtocolValues {
    /** A lowercase, hyphenated, nonzero UUID. */
    public fun isId(value: String): Boolean = UUID_PATTERN.matches(value) && value != NIL_UUID

    /** A canonical decimal counter: no sign, no leading zeros, at most 2^63 - 1. */
    public fun isCounter(value: String): Boolean =
        COUNTER_PATTERN.matches(value) && value.length <= 19 && BigInteger(value) <= MAX_COUNTER

    /** A valid UTC timestamp with exactly three fractional digits, such as `2025-01-02T03:04:05.678Z`. */
    public fun isTimestamp(value: String): Boolean = Timestamps.parseMillis(value) != null
}

internal fun parseId(value: String): String {
    if (!ProtocolValues.isId(value)) protocolError("Expected a canonical nonzero UUID")
    return value
}

internal fun parseId(value: JsonElement?): String = parseId(value.protocolString())

internal fun parseCounter(value: String): String {
    if (!ProtocolValues.isCounter(value)) protocolError("Expected a canonical decimal counter")
    return value
}

internal fun parseCounter(value: JsonElement?): String = parseCounter(value.protocolString())

/** The numeric value of a validated counter. */
internal fun counter(value: String): Long = parseCounter(value).toLong()

internal fun timestamp(value: String): String {
    if (!ProtocolValues.isTimestamp(value)) protocolError("Expected a UTC millisecond timestamp")
    return value
}

internal fun timestamp(value: JsonElement?): String = timestamp(value.protocolString())

internal fun timestampMillis(value: String): Long =
    Timestamps.parseMillis(value) ?: protocolError("Expected a UTC millisecond timestamp")

/** True for malformed protocol values: generated shape checks and the SDK's own checks. */
internal fun Throwable.isProtocolViolation(): Boolean = this is ShapeException || this is ConvoHopProtocolException

/**
 * Decodes an events page and checks it against the requested scope: the
 * cursor must stay in [conversationId] and [incarnation] and must not move
 * behind [after]; events must be in that conversation, strictly ascending
 * after [after], and no later than the cursor.
 */
internal fun eventPage(value: JsonElement?, incarnation: String, conversationId: String, after: Cursor?): EventPage =
    eventPage(EventPage.fromJson(value ?: JsonNull, "EventPage"), incarnation, conversationId, after)

/** Checks a decoded events page; see the JSON overload. */
internal fun eventPage(page: EventPage?, incarnation: String, conversationId: String, after: Cursor?): EventPage {
    if (page == null) protocolError("Invalid protocol object")
    boundedPage(page.items)
    val cursor = page.nextCursor ?: protocolError("Invalid protocol object")
    parseId(cursor.incarnation)
    parseId(cursor.conversationId)
    val frontier = counter(cursor.sequence)
    if (cursor.conversationId != conversationId || cursor.incarnation != incarnation ||
        (after != null && frontier < counter(after.sequence))
    ) {
        protocolError("Invalid authoritative replay frontier")
    }
    var previous = if (after == null) 0L else counter(after.sequence)
    for (event in page.items) {
        val sequence = counter(event.sequence)
        if (parseId(event.conversationId) != conversationId || sequence <= previous || sequence > frontier) {
            protocolError("Invalid ordered event scope")
        }
        parseId(event.eventId)
        previous = sequence
    }
    return page
}

/** Checks a caller-supplied identifier. */
internal fun requireId(value: String, name: String = "id"): String {
    require(ProtocolValues.isId(value)) { "$name must be a canonical nonzero UUID" }
    return value
}

/** Checks a caller-supplied counter. */
internal fun requireCounter(value: String, name: String = "sequence"): String {
    require(ProtocolValues.isCounter(value)) { "$name must be a canonical decimal counter" }
    return value
}

/** True for a bearer the SDK can send in a header: non-empty, bounded and single-line. */
internal fun isCredential(value: String): Boolean =
    value.isNotEmpty() && value.length <= 16_384 && value.none { it == '\r' || it == '\n' }

/** Rejects a page longer than the protocol's 100-item bound. */
internal fun boundedPage(items: List<*>) {
    if (items.size > 100) protocolError("Invalid bounded page")
}
