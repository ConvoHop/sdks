package com.convohop.server.kotlin

import com.convohop.server.ConvoHopProblem
import com.convohop.server.ProjectServerClient
import com.convohop.server.model.CreateConversationRequestInput
import com.convohop.server.model.MemberInputInput
import com.convohop.server.model.MembersRequestInput
import com.convohop.server.testing.FakeAuthority
import com.convohop.server.testing.FakeAuthority.Exchange
import com.convohop.server.testing.FakeAuthority.Response
import com.convohop.server.testing.Fixtures
import com.convohop.server.testing.RecordingStorage
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SuspendApiTest {
    @Test
    fun `suspending calls return decoded replies and pass authority problems through`() {
        val conversationId = id()
        val requestId = id()
        FakeAuthority { exchange ->
            when (exchange.operationName()) {
                "CommunicationCreateConversation" -> created(exchange, conversationId)
                else -> Response.json(Fixtures.problem("FORBIDDEN", "rejected", 403, "Backend scope missing",
                    Fixtures.requestId(exchange.request())))
            }
        }.use { authority ->
            val api = client(authority).build().communication().suspending()

            val reply = runBlocking { api.createConversation(conversation(), requestId) }
            assertEquals(requestId, reply.requestId)
            assertEquals(conversationId, reply.result?.conversationId)

            val problem = assertThrows(ConvoHopProblem::class.java) { runBlocking { api.route() } }
            assertEquals("FORBIDDEN", problem.code)
            assertEquals("rejected", problem.outcome)
            assertEquals(listOf("CommunicationCreateConversation", "CommunicationRoute"),
                authority.exchanges().map { it.operationName() })
        }
    }

    @Test
    fun `pages are a cold flow that requests each page when the collector reaches it`() {
        val conversationId = id()
        FakeAuthority { exchange ->
            val cursor = Fixtures.input(exchange.request())["cursor"]
            Response.json(Fixtures.reply(exchange.request(), Fixtures.map("result", Fixtures.full("MemberPage",
                Fixtures.map("items", emptyList<Any>(), "complete", cursor == "after-1", "refreshRequired", false,
                    "nextCursor", if (cursor == null) "after-1" else null)))))
        }.use { authority ->
            val api = client(authority).build().communication().suspending()
            val pages = api.membersPages(MembersRequestInput.builder().conversationId(conversationId).limit(2).build())
            assertEquals(0, authority.exchanges().size, "nothing is sent before collection")

            assertEquals(listOf(false, true), runBlocking { pages.toList() }.map { it.complete })
            assertEquals(listOf(null, "after-1"), authority.requests().map { Fixtures.input(it)["cursor"] })
            assertEquals(1, runBlocking { pages.take(1).toList() }.size)
            assertEquals(3, authority.exchanges().size, "a collector that stops early requests no further page")
            assertNull(Fixtures.input(authority.requests()[2])["cursor"], "each collection starts again")
        }
    }

    @Test
    fun `cancelling a call interrupts the request and keeps the mutation journaled`() {
        assertCancellationInterrupts { client, requestId ->
            client.communication().suspending().createConversation(conversation(), requestId)
        }
    }

    @Test
    fun `interruptible gives the blocking client helpers the same cancellation`() {
        val conversationId = id()
        FakeAuthority { exchange -> created(exchange, conversationId) }.use { authority ->
            val client = client(authority).build()
            val result = runBlocking { interruptible { client.conversations().create(conversation()) } }
            assertEquals(conversationId, result.conversationId)
        }
        assertCancellationInterrupts { client, requestId ->
            interruptible { client.conversations().create(conversation(), requestId) }
        }
    }

    private fun assertCancellationInterrupts(call: suspend (ProjectServerClient, String) -> Any) {
        val received = CountDownLatch(1)
        val release = CountDownLatch(1)
        val requestId = id()
        val storage = RecordingStorage()
        FakeAuthority {
            received.countDown()
            release.await(30, TimeUnit.SECONDS)
            Response.drop()
        }.use { authority ->
            val client = client(authority).recoveryStorage(storage).build()
            val observed = AtomicReference<Throwable>()
            try {
                runBlocking {
                    val job = launch(Dispatchers.Default) {
                        try {
                            call(client, requestId)
                        } catch (failure: Throwable) {
                            observed.set(failure)
                            throw failure
                        }
                    }
                    assertTrue(received.await(10, TimeUnit.SECONDS), "the request reached the authority")
                    val cancelledAt = System.nanoTime()
                    job.cancel()
                    job.join()
                    // Well below the transport's 12 second timeout: the blocked request was interrupted.
                    assertTrue(TimeUnit.NANOSECONDS.toSeconds(System.nanoTime() - cancelledAt) < 5)
                    assertTrue(job.isCancelled)
                }
            } finally {
                release.countDown()
            }

            val cancellation = assertInstanceOf(CancellationException::class.java, observed.get())
            val problem = assertInstanceOf(ConvoHopProblem::class.java, cancellation.cause)
            assertEquals("TRANSPORT_UNKNOWN", problem.code)
            assertEquals("unknown", problem.outcome)
            assertEquals(requestId, problem.requestId)
            val journaled = client.recoveryStates.single()
            assertEquals(requestId, journaled.requestId)
            assertEquals("communication.createConversation", journaled.operation)
            assertEquals(listOf("CommunicationCreateConversation"), authority.exchanges().map { it.operationName() })
        }
    }

    private companion object {
        fun id(): String = UUID.randomUUID().toString()

        fun client(authority: FakeAuthority): ProjectServerClient.Builder =
            ProjectServerClient.builder()
                .baseUrl(authority.baseUrl())
                .projectId(id())
                .incarnation(id())
                .backendKey("fixture-backend-key")

        fun conversation(): CreateConversationRequestInput =
            CreateConversationRequestInput.builder()
                .title("Support")
                .props(emptyMap())
                .members(listOf(MemberInputInput.builder().principalId(id()).role("member").build()))
                .build()

        fun created(exchange: Exchange, conversationId: String): Response =
            Response.json(Fixtures.reply(exchange.request(), Fixtures.map("result", Fixtures.full("Conversation",
                Fixtures.map("conversationId", conversationId, "revision", "1", "title", "Support",
                    "props", Fixtures.map(), "latestSequence", "1")))))
    }
}
