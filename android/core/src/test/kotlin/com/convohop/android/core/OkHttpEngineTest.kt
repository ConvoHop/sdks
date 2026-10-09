package com.convohop.android.core

import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class OkHttpEngineTest {
    private val server = MockWebServer().apply { start() }
    private val engine = OkHttpEngine()

    @After
    fun stop() {
        server.shutdown()
    }

    private fun request(body: String = """{"operationName":"CommunicationSendMessage"}""", maxBytes: Long = 1_024) =
        HttpRequest(server.url("/graphql").toString(), mapOf("content-type" to "application/json"), body, 5_000, maxBytes)

    @Test
    fun theRequestIsPostedAsGiven() = runBlocking {
        server.enqueue(MockResponse().setBody("{}"))
        assertEquals("{}", engine.post(request(body = """{"text":"héllo"}""")).text())
        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("application/json", recorded.getHeader("content-type"))
        assertEquals("""{"text":"héllo"}""", recorded.body.readUtf8())
    }

    @Test
    fun aDroppedResponseOnAPooledConnectionIsNotResent() = runBlocking {
        server.enqueue(MockResponse().setBody("{}"))
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST))
        server.enqueue(MockResponse().setBody("""{"resent":true}"""))
        assertEquals("{}", engine.post(request()).text())
        // The second post reuses the pooled connection, which closes once the request arrives.
        // Only the mutation ledger may send it again, within its retry budget.
        val error = runCatching { engine.post(request()) }.exceptionOrNull()
        assertTrue("Expected an IOException, got $error", error is IOException)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun anImmediateRetryAfterIsReturnedNotFollowed() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(503).setHeader("retry-after", "0").setBody("{}"))
        server.enqueue(MockResponse().setBody("""{"resent":true}"""))
        val response = engine.post(request())
        assertEquals(503, response.status)
        assertEquals("0", response.header("Retry-After"))
        assertEquals(1, server.requestCount)
    }

    @Test
    fun redirectsAreRefused() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(307).setHeader("location", server.url("/elsewhere").toString()))
        val error = runCatching { engine.post(request()) }.exceptionOrNull()
        assertEquals("Authority redirects are refused", error?.message)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun aBodyLongerThanTheBoundReadsAsNull() = runBlocking {
        server.enqueue(MockResponse().setBody("x".repeat(64)))
        server.enqueue(MockResponse().setBody("x".repeat(65)))
        assertEquals("x".repeat(64), engine.post(request(maxBytes = 64)).text())
        assertNull(engine.post(request(maxBytes = 64)).text())
    }
}
