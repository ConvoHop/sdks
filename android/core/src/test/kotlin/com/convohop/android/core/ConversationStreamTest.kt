package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ConversationStreamTest {
    /** Recovery storage whose cursor writes wait for [gate], like a slow disk. */
    private class SlowStorage : RecoveryStorage {
        val values = HashMap<String, String>()
        var gate: CompletableDeferred<Unit>? = null

        override suspend fun getItem(key: String): String? = values[key]

        override suspend fun setItem(key: String, value: String) {
            if (key.startsWith("convohop.cursor:")) gate?.await()
            values[key] = value
        }

        override suspend fun removeItem(key: String) {
            values.remove(key)
        }

        fun storedSequence(): String? = values.entries.singleOrNull { it.key.startsWith("convohop.cursor:") }
            ?.let { Json.parseToJsonElement(it.value).jsonObject.getValue("sequence").jsonPrimitive.content }
    }

    @Test
    fun theCursorAdvancesOnlyOnceTheAppliedPositionIsStored() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val first = h.authority.post(conversation, OTHER, "first")
            val storage = SlowStorage()
            val client = h.client(storage = storage)
            val delivered = ArrayList<String>()
            val stream = client.watch(conversation, { events -> events.mapTo(delivered) { it.sequence } }, { h.errors += it })
            assertEquals(listOf(first.sequence), delivered)
            assertEquals(first.sequence, stream.cursor?.sequence)
            assertEquals(first.sequence, storage.storedSequence())

            val gate = CompletableDeferred<Unit>()
            storage.gate = gate
            val second = h.authority.post(conversation, OTHER, "second")
            h.settle()
            // The batch is applied, but a restart would still resume after the first message.
            assertEquals(listOf(first.sequence, second.sequence), delivered)
            assertEquals(first.sequence, stream.cursor?.sequence)
            assertEquals(first.sequence, storage.storedSequence())

            gate.complete(Unit)
            h.settle()
            assertEquals(second.sequence, stream.cursor?.sequence)
            assertEquals(second.sequence, storage.storedSequence())
            stream.close()
            h.settle()
            assertTrue(h.errors.isEmpty())
        }
    }

    @Test
    fun aPermanentFailureIsReportedBeforeTheReplayCloses() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val client = h.client()
            var stream: ConversationStream? = null
            val seen = ArrayList<Pair<Boolean, ReplayState>>()
            stream = client.watch(conversation, {}, { error ->
                h.errors += error
                val current = checkNotNull(stream)
                seen += current.closed to current.state.value
            })
            h.settle()
            assertEquals(ReplayState.LIVE, stream.state.value)

            h.authority.disconnect(4401)
            h.settle()
            // Inside onError the replay already counts as closed, but state turns CLOSED only after it, so an
            // observer on another thread that sees CLOSED also has the reason.
            assertEquals(listOf(true to ReplayState.LIVE), seen)
            assertEquals(ReplayState.CLOSED, stream.state.value)
            assertEquals(listOf("UNAUTHENTICATED"), h.errorCodes())
            // Reconnecting with the rejected credential would only fail again.
            h.advance(120_000)
            assertEquals(1, h.authority.calls("CommunicationEvents").size)
        }
    }

    @Test
    fun gatewayAndServerErrorsKeepItReconnectingWithDoublingBackoff() = runTest {
        Harness(this).use { h ->
            val stream = live(h)
            val routes = h.routes()
            h.authority.fail(
                "CommunicationRoute",
                Fault.Http(502, "<html>Bad gateway</html>"),
                Fault.Http(504, """{"title":"Gateway Timeout"}"""),
                Fault.Http(500, "{}"),
            )
            h.authority.disconnect(1006)
            h.settle()
            // Each attempt routes again; the failed ones double the wait before the next.
            for ((attempt, delay) in listOf(1_000L, 2_000L, 4_000L, 8_000L).withIndex()) {
                h.advance(delay - 1)
                assertEquals(routes + attempt, h.routes())
                h.advance(1)
                assertEquals(routes + attempt + 1, h.routes())
            }
            assertEquals(
                listOf(listOf("INVALID_RESPONSE", 502, null), listOf("HTTP_FAILURE", 504, null), listOf("HTTP_FAILURE", 500, null)),
                h.problems(),
            )
            assertEquals(2, h.authority.connects)
            assertEquals(ReplayState.LIVE, stream.state.value)
        }
    }

    @Test
    fun quotaPlanLimitAndAuthorizationEndsStopTheStreamWithTheirProblem() = runTest {
        val cases = listOf<Triple<String, (FakeAuthority.Socket) -> Unit, List<Any?>>>(
            Triple("a quota close", { it.drop(4429, "QUOTA_EXCEEDED retryAfter=60 meter=messages") }, listOf("QUOTA_EXCEEDED", 429, 60L)),
            Triple("a quota error", { it.reject("QUOTA_EXCEEDED", 429, retryAfter = 60) }, listOf("QUOTA_EXCEEDED", 429, 60L)),
            Triple("a plan-limit close", { it.drop(4403, "PLAN_LIMIT_EXCEEDED planLimit=conversations") }, listOf("PLAN_LIMIT_EXCEEDED", 403, null)),
            Triple("an authorization close", { it.drop(4408) }, listOf("UNAUTHENTICATED", 401, null)),
        )
        for ((name, end, expected) in cases) {
            Harness(this).use { h ->
                val stream = live(h)
                val routes = h.routes()
                end(h.authority.sockets.single())
                h.settle()
                h.advance(600_000)
                assertEquals(name, listOf(expected), h.problems())
                assertTrue(name, stream.closed)
                assertEquals(name, ReplayState.CLOSED, stream.state.value)
                assertEquals(name, routes, h.routes())
                assertEquals(name, 1, h.authority.connects)
            }
        }
    }

    @Test
    fun aRateLimitedCloseReconnectsAfterItsRetryAfterEvenWhenWokenSooner() = runTest {
        Harness(this).use { h ->
            val client = h.client()
            val stream = live(h, client)
            val routes = h.routes()
            h.authority.disconnect(4429, "RATE_LIMITED retryAfter=30")
            h.settle()
            assertEquals(listOf(listOf("RATE_LIMITED", 429, 30L)), h.problems())
            assertEquals(ReplayState.RECONNECTING, stream.state.value)
            h.advance(20_000)
            client.reconnectNow()
            h.settle()
            h.advance(9_999)
            assertEquals(routes, h.routes())
            h.advance(1)
            assertEquals(routes + 1, h.routes())
            assertEquals(2, h.authority.connects)
            assertEquals(ReplayState.LIVE, stream.state.value)

            // Without a retryAfter, waking skips the backoff.
            h.authority.disconnect(1006)
            h.settle()
            client.reconnectNow()
            h.settle()
            assertEquals(routes + 2, h.routes())
            assertEquals(3, h.authority.connects)
            assertEquals(1, h.errors.size)
            assertFalse(stream.closed)
        }
    }

    @Test
    fun aRateLimitedRoutingFailureHoldsTheNextAttempt() = runTest {
        Harness(this).use { h ->
            val client = h.client()
            val stream = live(h, client)
            val routes = h.routes()
            h.authority.fail("CommunicationRoute", Fault.Problem("RATE_LIMITED", 429, retryAfter = 6))
            h.authority.disconnect(1006)
            h.settle()
            h.advance(1_000)
            assertEquals(routes + 1, h.routes())
            assertEquals(listOf(listOf("RATE_LIMITED", 429, 6L)), h.problems())
            client.reconnectNow()
            h.settle()
            h.advance(5_999)
            assertEquals(routes + 1, h.routes())
            h.advance(1)
            assertEquals(routes + 2, h.routes())
            assertEquals(ReplayState.LIVE, stream.state.value)
        }
    }

    @Test
    fun aRoutingFailureThatIsNotRetryableStopsTheStream() = runTest {
        Harness(this).use { h ->
            val stream = live(h)
            val routes = h.routes()
            // 503, but billing has to be configured before anything changes.
            h.authority.fail("CommunicationRoute", Fault.Problem("BILLING_NOT_CONFIGURED", 503))
            h.authority.disconnect(1006)
            h.settle()
            h.advance(600_000)
            assertEquals(listOf(listOf("BILLING_NOT_CONFIGURED", 503, null)), h.problems())
            assertEquals(ReplayState.CLOSED, stream.state.value)
            assertEquals(routes + 1, h.routes())
            assertEquals(1, h.authority.connects)
        }
    }

    @Test
    fun aRefusedUpgradeIsClassifiedLikeAnyOtherHttpResponse() = runTest {
        Harness(this).use { h ->
            val client = h.client()
            val stream = live(h, client)
            val limited = """{"title":"Too Many Requests","status":429,"code":"RATE_LIMITED","message":"Slow down","retryAfter":9}"""
            h.authority.refuse(RealtimeUpgradeRefusedException(429, "9", limited))
            h.authority.disconnect(1006)
            h.settle()
            h.advance(1_000)
            assertEquals(2, h.authority.connects)
            assertEquals(listOf(listOf("RATE_LIMITED", 429, 9L)), h.problems())
            assertEquals(ReplayState.RECONNECTING, stream.state.value)
            client.reconnectNow()
            h.settle()
            h.advance(8_999)
            assertEquals(2, h.authority.connects)
            h.advance(1)
            assertEquals(3, h.authority.connects)
            assertEquals(ReplayState.LIVE, stream.state.value)

            // A spent quota refuses the upgrade too, and that stops the stream.
            val quota = """{"code":"QUOTA_EXCEEDED","message":"Messages quota spent","retryAfter":60}"""
            h.authority.refuse(RealtimeUpgradeRefusedException(429, null, quota))
            h.authority.disconnect(1006)
            h.settle()
            h.advance(600_000)
            assertEquals(listOf(listOf("RATE_LIMITED", 429, 9L), listOf("QUOTA_EXCEEDED", 429, 60L)), h.problems())
            assertEquals(ReplayState.CLOSED, stream.state.value)
            assertEquals(4, h.authority.connects)
        }
    }

    @Test
    fun wrongRegionRoutesAgainAndReconnects() = runTest {
        Harness(this).use { h ->
            val stream = live(h)
            val routes = h.routes()
            // The reason names the problem, whatever the close code.
            h.authority.disconnect(4409, "WRONG_REGION")
            h.settle()
            h.advance(1_000)
            assertEquals(routes + 1, h.routes())
            assertEquals(ReplayState.LIVE, stream.state.value)

            h.authority.sockets.single().reject("WRONG_REGION", 409)
            h.settle()
            h.advance(1_000)
            assertEquals(routes + 2, h.routes())
            assertEquals(ReplayState.LIVE, stream.state.value)
            assertEquals(listOf(listOf("WRONG_REGION", 409, null), listOf("WRONG_REGION", 409, null)), h.problems())
            assertEquals(3, h.authority.connects)
        }
    }

    /** A live stream of a new conversation; its problems go to [Harness.errors]. */
    private suspend fun live(h: Harness, client: ConvoHopClient = h.client()): ConversationStream {
        val stream = client.watch(h.authority.conversation(), {}, { h.errors += it })
        h.settle()
        assertEquals(ReplayState.LIVE, stream.state.value)
        return stream
    }

    private fun Harness.routes(): Int = authority.calls("CommunicationRoute").size

    private fun Harness.problems(): List<List<Any?>> =
        errors.map { error -> (error as ConvoHopProblem).let { listOf(it.code, it.status, it.retryAfter) } }
}
