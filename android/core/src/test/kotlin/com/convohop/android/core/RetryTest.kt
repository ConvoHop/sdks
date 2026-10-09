package com.convohop.android.core

import com.convohop.android.generated.Realtime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class RetryTest {
    private val requestId = testId(9, 1)

    private fun problem(code: String, status: Int) = ConvoHopProblem(code, requestId, "rejected", status, code)

    private fun ConvoHopProblem.summary(): List<Any?> = listOf(code, status, retryAfter)

    @Test
    fun oneClassifierDecidesWhetherInitializationTheStreamAndQueuedSendsTryAgain() {
        for ((code, status, expected) in listOf(
            Triple("TRANSPORT_UNKNOWN", 0, ReconnectAction.RETRY),
            Triple("HTTP_FAILURE", 408, ReconnectAction.RETRY),
            Triple("HTTP_FAILURE", 500, ReconnectAction.RETRY),
            Triple("HTTP_FAILURE", 502, ReconnectAction.RETRY),
            Triple("HTTP_FAILURE", 503, ReconnectAction.RETRY),
            Triple("HTTP_FAILURE", 504, ReconnectAction.RETRY),
            Triple("AUTHORITY_UNAVAILABLE", 503, ReconnectAction.RETRY),
            Triple("INVALID_RESPONSE", 502, ReconnectAction.RETRY),
            Triple("RATE_LIMITED", 429, ReconnectAction.RETRY),
            Triple("ADMISSION_LIMIT", 429, ReconnectAction.RETRY),
            Triple("SPEND_UNVERIFIED", 503, ReconnectAction.RETRY),
            // Routing again finds the region that serves the project.
            Triple("WRONG_REGION", 409, ReconnectAction.REROUTE),
            // The schema says a later attempt can't succeed, whatever the status.
            Triple("QUOTA_EXCEEDED", 429, ReconnectAction.STOP),
            Triple("PLAN_LIMIT_EXCEEDED", 403, ReconnectAction.STOP),
            Triple("CREDITS_EXHAUSTED", 402, ReconnectAction.STOP),
            Triple("SPEND_CAP_REACHED", 402, ReconnectAction.STOP),
            Triple("MEMBERSHIP_COUNT_INVALID", 503, ReconnectAction.STOP),
            Triple("UNAUTHENTICATED", 401, ReconnectAction.STOP),
            Triple("SESSION_REFRESH_REQUIRED", 409, ReconnectAction.STOP),
            Triple("FORBIDDEN", 403, ReconnectAction.STOP),
            Triple("SCOPE_REQUIRED", 403, ReconnectAction.STOP),
            Triple("RECOVERY_LIMIT", 409, ReconnectAction.STOP),
            // A retryable code still stops on a status that no later attempt changes.
            Triple("HTTP_FAILURE", 400, ReconnectAction.STOP),
            Triple("HTTP_FAILURE", 404, ReconnectAction.STOP),
            // A code the schema doesn't list is judged by its status.
            Triple("NEWLY_ADDED", 503, ReconnectAction.RETRY),
            Triple("NEWLY_ADDED", 429, ReconnectAction.RETRY),
            Triple("NEWLY_ADDED", 409, ReconnectAction.STOP),
        )) {
            assertEquals("$code $status", expected, reconnectAction(problem(code, status)))
        }
        for (error in listOf(RuntimeException("boom"), IOException("offline"), IllegalStateException("closed"))) {
            assertEquals("$error", ReconnectAction.STOP, reconnectAction(error))
        }
    }

    @Test
    fun aRequestMayBeSentAgainAfterARetryableCodeOrAfterWrongRegionOnceRoutedAgain() {
        for (code in listOf("RATE_LIMITED", "AUTHORITY_UNAVAILABLE", "TRANSPORT_UNKNOWN", "WRONG_REGION", "SPEND_UNVERIFIED", "NEWLY_ADDED")) {
            assertTrue(code, retryableCode(code))
        }
        for (code in listOf(
            "QUOTA_EXCEEDED", "PLAN_LIMIT_EXCEEDED", "NOT_FOUND", "FORBIDDEN", "RECOVERY_LIMIT", "CREDITS_EXHAUSTED", "SPEND_CAP_REACHED",
        )) {
            assertFalse(code, retryableCode(code))
        }
    }

    @Test
    fun reconnectionWaitsOneSecondDoublingToTenNeverLessThanRetryAfterPlusUnderHalfASecondOfJitter() {
        val cases = listOf(
            Triple(0, 0L, 1_000L), Triple(1, 0L, 2_000L), Triple(3, 0L, 8_000L), Triple(4, 0L, 10_000L), Triple(40, 0L, 10_000L),
            Triple(0, 2L, 2_000L), Triple(0, 30L, 30_000L), Triple(4, 3L, 10_000L),
        )
        for ((attempt, retryAfter, base) in cases) {
            assertEquals("$attempt $retryAfter", base, reconnectDelay(attempt, retryAfter, 0.0))
            assertEquals("$attempt $retryAfter", base + 499, reconnectDelay(attempt, retryAfter, 0.9999))
        }
        assertEquals(1_000L, reconnectDelay(0, null, 0.0))
        // However long the authority asks for, the wait and the clock it is added to don't overflow.
        val longest = reconnectDelay(0, Long.MAX_VALUE, 0.9999)
        assertEquals(retryAfterMillis(Long.MAX_VALUE) + 499, longest)
        assertTrue(longest > 0 && BASE_TIME + longest > 0)
        assertEquals(0L, retryAfterMillis(-5))
    }

    @Test
    fun aRealtimeCloseReportsTheProblemItsReasonNamesWhateverTheCloseCode() {
        for ((close, expected, action) in listOf(
            Triple(4429 to "RATE_LIMITED retryAfter=5", listOf("RATE_LIMITED", 429, 5L), ReconnectAction.RETRY),
            Triple(4429 to "QUOTA_EXCEEDED retryAfter=60 meter=messages", listOf("QUOTA_EXCEEDED", 429, 60L), ReconnectAction.STOP),
            Triple(4403 to "PLAN_LIMIT_EXCEEDED planLimit=connections", listOf("PLAN_LIMIT_EXCEEDED", 403, null), ReconnectAction.STOP),
            // Spent credits or a reached spend cap stop; spend that can't be verified waits out its retryAfter.
            Triple(4402 to "SPEND_CAP_REACHED meter=messages", listOf("SPEND_CAP_REACHED", 402, null), ReconnectAction.STOP),
            Triple(4402 to "CREDITS_EXHAUSTED meter=mau", listOf("CREDITS_EXHAUSTED", 402, null), ReconnectAction.STOP),
            Triple(4503 to "SPEND_UNVERIFIED retryAfter=60 meter=mau", listOf("SPEND_UNVERIFIED", 503, 60L), ReconnectAction.RETRY),
            Triple(4409 to "  WRONG_REGION  ", listOf("WRONG_REGION", 409, null), ReconnectAction.REROUTE),
            Triple(1011 to "AUTHORITY_UNAVAILABLE retryAfter=2", listOf("AUTHORITY_UNAVAILABLE", 503, 2L), ReconnectAction.RETRY),
            // A retryAfter that isn't whole seconds is ignored rather than guessed.
            Triple(4429 to "RATE_LIMITED retryAfter=soon", listOf("RATE_LIMITED", 429, null), ReconnectAction.RETRY),
            Triple(4429 to "RATE_LIMITED retryAfter=1.5", listOf("RATE_LIMITED", 429, null), ReconnectAction.RETRY),
            // A listed code without a status takes it from the close code.
            Triple(4400 to "GRAPHQL_ERROR", listOf("GRAPHQL_ERROR", 400, null), ReconnectAction.STOP),
            Triple(1011 to "GRAPHQL_ERROR", listOf("GRAPHQL_ERROR", 0, null), ReconnectAction.STOP),
        )) {
            val (code, reason) = close
            val reported = checkNotNull(closeProblem(code, reason, requestId)) { reason }
            assertEquals(reason, expected, reported.summary())
            assertEquals(listOf(requestId, "rejected"), listOf(reported.requestId, reported.outcome))
            assertEquals(reason, action, reconnectAction(reported))
        }
    }

    @Test
    fun aCloseThatEndsRealtimeAuthorizationWithoutNamingACodeReportsUnauthenticatedAndOthersReportNothing() {
        for (code in listOf(4400, 4401, 4403, 4408, 4409)) {
            for (reason in listOf("", "Forbidden", "rate_limited")) {
                val reported = closeProblem(code, reason, requestId)
                assertEquals("$code $reason", listOf("UNAUTHENTICATED", 401, "rejected"), listOf(reported?.code, reported?.status, reported?.outcome))
                assertEquals(ReconnectAction.STOP, reconnectAction(checkNotNull(reported)))
            }
        }
        // These reconnect after the usual backoff.
        for ((code, reason) in listOf(
            1000 to "", 1001 to "going away", 1006 to "", 1011 to "internal error", 4429 to "slow down", 4500 to "",
            4429 to "rate_limited retryAfter=5",
        )) {
            assertNull("$code $reason", closeProblem(code, reason, requestId))
        }
    }

    @Test
    fun theBackoffAndTerminalCloseCodesAreTheSchemasRealtimeReconnectPolicy() {
        val channel = Realtime.conversationEvents
        assertEquals(channel.reconnectBaseDelayMs, reconnectDelay(0, null, 0.0))
        assertEquals(channel.reconnectMaxDelayMs, reconnectDelay(64, null, 0.0))
        assertEquals(channel.reconnectMaxDelayMs + channel.reconnectJitterMs - 1, reconnectDelay(64, null, 0.9999))
        val terminal = (1000..4999).filter { closeProblem(it, "", requestId) != null }
        assertEquals(channel.terminalCloseCodes.sorted(), terminal)
    }

    @Test
    fun aRefusedUpgradeIsClassifiedLikeAnyOtherHttpResponse() {
        fun upgrade(status: Int, body: String?, retryAfter: String? = null) =
            upgradeProblem(RealtimeUpgradeRefusedException(status, retryAfter, body), requestId)

        val limited = upgrade(429, """{"code":"RATE_LIMITED","message":"Slow down","retryAfter":7}""", retryAfter = "3")
        // The body's delay comes before the header's.
        assertEquals(listOf("RATE_LIMITED", 429, 7L), limited.summary())
        assertEquals(listOf("rejected", "Slow down"), listOf(limited.outcome, limited.message))
        assertEquals(ReconnectAction.RETRY, reconnectAction(limited))

        val quota = upgrade(429, """{"type":"about:blank","code":"QUOTA_EXCEEDED","meter":"connections"}""", retryAfter = "60")
        assertEquals(listOf("QUOTA_EXCEEDED", 429, 60L), quota.summary())
        assertEquals(ReconnectAction.STOP, reconnectAction(quota))

        val gateway = upgrade(502, """{"title":"Bad Gateway"}""")
        assertEquals(listOf("HTTP_FAILURE", 502, null), gateway.summary())
        assertEquals(ReconnectAction.RETRY, reconnectAction(gateway))

        val scoped = upgrade(403, """{"code":"SCOPE_REQUIRED","message":"The backend key requires the current realtime scope"}""")
        assertEquals("realtime", (scoped as ScopeRequiredProblem).scope)
        assertEquals(ReconnectAction.STOP, reconnectAction(scoped))

        // A body that isn't a bounded JSON object is an unrecognized response, still with the header's delay.
        val oversize = """{"code":"QUOTA_EXCEEDED","padding":"${"x".repeat(MAX_UPGRADE_BODY_CHARS)}"}"""
        for (body in listOf("<html>Bad Gateway</html>", "[1]", "", oversize, null)) {
            val reported = upgrade(503, body, retryAfter = "5")
            assertEquals(body?.take(40), listOf("INVALID_RESPONSE", 503, 5L), reported.summary())
            assertEquals("rejected", reported.outcome)
            assertEquals(ReconnectAction.RETRY, reconnectAction(reported))
        }
        assertEquals(listOf("INVALID_RESPONSE", 429, null), upgrade(429, null, retryAfter = "Wed, 21 Oct 2026 07:28:00 GMT").summary())
    }
}
