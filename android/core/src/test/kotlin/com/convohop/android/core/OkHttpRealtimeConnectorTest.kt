package com.convohop.android.core

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

class OkHttpRealtimeConnectorTest {
    private val server = MockWebServer().apply { start() }

    @After
    fun stop() {
        server.shutdown()
    }

    /** Answers the upgrade with [response] and returns what the listener saw, in order, up to the close. */
    private fun upgradeAnsweredWith(response: MockResponse): List<Any> {
        server.enqueue(response)
        val events = LinkedBlockingQueue<Any>()
        OkHttpRealtimeConnector().connect(
            server.url("/graphql").toString().replaceFirst("http", "ws"),
            "graphql-transport-ws",
            object : RealtimeListener {
                override fun onOpen() {
                    events.add("open")
                }

                override fun onMessage(text: String?) {
                    events.add("message")
                }

                override fun onError(error: Throwable) {
                    events.add(error)
                }

                override fun onClose(code: Int, reason: String) {
                    events.add(listOf(code, reason))
                }
            },
        )
        val seen = ArrayList<Any>()
        while (seen.lastOrNull() !is List<*>) seen += events.poll(5, TimeUnit.SECONDS) ?: throw AssertionError("The socket never closed: $seen")
        return seen
    }

    @Test
    fun aRefusedUpgradeReportsItsResponseAndThenCloses() {
        val body = """{"code":"RATE_LIMITED","outcome":"rejected","message":"Slow down","retryAfter":7}"""
        val seen = upgradeAnsweredWith(
            MockResponse().setResponseCode(429).setHeader("Retry-After", "7").setHeader("Content-Type", "application/problem+json")
                .setBody(body),
        )

        assertEquals(2, seen.size)
        val refused = seen[0] as RealtimeUpgradeRefusedException
        assertEquals(listOf<Any?>(429, "7", body), listOf(refused.status, refused.retryAfter, refused.body))
        assertEquals(listOf(1006, ""), seen[1])
    }

    @Test
    fun aRefusedUpgradesBodyIsReadOnlyOnePastTheBound() {
        val seen = upgradeAnsweredWith(MockResponse().setResponseCode(503).setBody("x".repeat(MAX_UPGRADE_BODY_CHARS + 100)))

        val refused = seen[0] as RealtimeUpgradeRefusedException
        // Too long to classify by its body, so the stream goes by the status.
        assertEquals(listOf<Any?>(503, null, MAX_UPGRADE_BODY_CHARS + 1), listOf(refused.status, refused.retryAfter, refused.body?.length))
    }

    @Test
    fun aRefusedUpgradesBodyWithinTheBoundIsReadWholeInWideCharacters() {
        // The bound counts characters, and each euro sign takes 3 bytes in UTF-8.
        val start = "{\"code\":\"RATE_LIMITED\",\"outcome\":\"rejected\",\"retryAfter\":7,\"message\":\""
        val body = start + "\u20AC".repeat(MAX_UPGRADE_BODY_CHARS - start.length - 2) + "\"}"
        val seen = upgradeAnsweredWith(
            MockResponse().setResponseCode(429).setHeader("Content-Type", "application/problem+json").setBody(body),
        )

        val refused = seen[0] as RealtimeUpgradeRefusedException
        assertEquals(MAX_UPGRADE_BODY_CHARS, body.length)
        assertEquals(body, refused.body)
        val problem = upgradeProblem(refused, "request")
        assertEquals(listOf<Any?>("RATE_LIMITED", 7L), listOf(problem.code, problem.retryAfter))
    }
}
