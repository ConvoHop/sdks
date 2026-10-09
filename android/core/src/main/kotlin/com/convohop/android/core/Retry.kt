package com.convohop.android.core

import com.convohop.android.generated.ErrorCodeInfo
import com.convohop.android.generated.ErrorCodes
import com.convohop.android.generated.Realtime
import kotlinx.serialization.json.JsonObject
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

private val WHITESPACE = Regex("\\s+")

/** The most of a refused upgrade's body that is read and classified. */
internal const val MAX_UPGRADE_BODY_CHARS = 65_536

/** What the schema says about [code], when it lists the code. */
internal fun errorCodeInfo(code: String): ErrorCodeInfo? = ErrorCodes.catalog[code]

/**
 * Whether a later attempt of a request may still succeed after a problem with [code]. The schema says so for each
 * code it lists; `WRONG_REGION` succeeds once the client routes again. A code the schema doesn't list counts as
 * retryable.
 */
internal fun retryableCode(code: String): Boolean = code == "WRONG_REGION" || errorCodeInfo(code)?.retryable != false

/** After a failure: try again, route again and then try, or stop and report the problem. */
internal enum class ReconnectAction { RETRY, REROUTE, STOP }

/**
 * Classifies a failure of initialization, a realtime connection or a queued send. Only a problem whose code is
 * retryable and whose status is 0 (no response), 408, 429 or 5xx is retried; `WRONG_REGION` routes again first.
 * Anything else stops: `QUOTA_EXCEEDED`, `PLAN_LIMIT_EXCEEDED`, authentication and scope problems, and errors that
 * aren't a [ConvoHopProblem].
 */
internal fun reconnectAction(error: Throwable): ReconnectAction {
    if (error !is ConvoHopProblem) return ReconnectAction.STOP
    if (error.code == "WRONG_REGION") return ReconnectAction.REROUTE
    if (!retryableCode(error.code)) return ReconnectAction.STOP
    val status = error.status
    return if (status == 0 || status == 408 || status == 429 || status in 500..599) ReconnectAction.RETRY else ReconnectAction.STOP
}

/** The authority's [retryAfter] seconds as milliseconds; 0 without one. Bounded so that adding a clock can't overflow. */
internal fun retryAfterMillis(retryAfter: Long?): Long = (retryAfter ?: 0L).coerceIn(0L, Long.MAX_VALUE / 2_000L) * 1_000L

/**
 * The wait before reconnection attempt [attempt], counted from 0, by the conversation channel's reconnect policy:
 * the base delay doubling to the maximum, never less than the authority's [retryAfter] seconds, plus jitter below
 * the policy's bound. [random] is in `[0, 1)`.
 */
internal fun reconnectDelay(attempt: Int, retryAfter: Long?, random: Double): Long {
    val channel = Realtime.conversationEvents
    val exponential = min(channel.reconnectBaseDelayMs shl attempt.coerceIn(0, 20), channel.reconnectMaxDelayMs)
    return max(exponential, retryAfterMillis(retryAfter)) + floor(random * channel.reconnectJitterMs).toLong()
}

/**
 * The problem a realtime close reports, if any. A reason that starts with an error code the schema lists, such as
 * `QUOTA_EXCEEDED retryAfter=60 meter=messages`, reports that code with its `retryAfter=` seconds, whatever the
 * close code. Otherwise a close code that ends realtime authorization reports `UNAUTHENTICATED`, and any other close
 * reports nothing, so the stream reconnects.
 */
internal fun closeProblem(code: Int, reason: String, requestId: String): ConvoHopProblem? {
    val words = reason.trim().split(WHITESPACE).filter { it.isNotEmpty() }
    val name = words.firstOrNull()
    val known = name?.let(::errorCodeInfo)
    if (name != null && known != null) {
        val retryAfter = retryDelay(words.firstOrNull { it.startsWith("retryAfter=") }?.removePrefix("retryAfter="))
        val status = known.status ?: if (code in 4000..4999) code - 4000 else 0
        return authorityProblem(name, requestId, "rejected", status, "Realtime connection closed: ${words.joinToString(" ")}", retryAfter)
    }
    if (code in Realtime.conversationEvents.terminalCloseCodes) {
        return ConvoHopProblem("UNAUTHENTICATED", requestId, "rejected", 401, "Realtime authorization ended; obtain a current session")
    }
    return null
}

/**
 * The problem of a refused realtime upgrade, classified like any other HTTP response: a JSON body's `code`,
 * `outcome`, `message` and `retryAfter`, else `INVALID_RESPONSE`, with the HTTP status and, failing the body's
 * delay, the `Retry-After` header.
 */
internal fun upgradeProblem(refused: RealtimeUpgradeRefusedException, requestId: String): ConvoHopProblem {
    val header = retryDelay(refused.retryAfter)
    val message = "Realtime upgrade refused with HTTP status ${refused.status}"
    val body = refused.body?.takeIf { it.length <= MAX_UPGRADE_BODY_CHARS }?.let {
        try {
            CanonicalJson.parse(it) as? JsonObject
        } catch (_: ConvoHopProtocolException) {
            null
        }
    } ?: return ConvoHopProblem("INVALID_RESPONSE", requestId, "rejected", refused.status, message, header)
    return authorityProblem(
        body["code"].stringOrNull() ?: "HTTP_FAILURE", requestId, body["outcome"].stringOrNull() ?: "rejected", refused.status,
        body["message"].stringOrNull() ?: message, retryDelay(body["retryAfter"]) ?: header,
    )
}
