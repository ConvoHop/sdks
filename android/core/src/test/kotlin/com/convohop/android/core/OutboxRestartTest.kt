package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import com.convohop.android.generated.Message
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

/** How the outbox recovers a message when the app's process ends while sending it. */
class OutboxRestartTest {
    @Test
    fun aMessageIsDeliveredOnceWhereverTheProcessEnds() = runTest {
        var steps = 0
        while (true) {
            check(steps < 20) { "The send never finished" }
            val finished = Harness(this).use { h ->
                val conversation = h.authority.conversation()
                val restart = h.restart(conversation, steps)

                val context = "Ended after $steps effects: ${restart.process.effects}"
                assertTrue(context, restart.after.states().all { it == PendingState.SENT })
                assertEquals(context, listOf("hello"), h.authority.messages(conversation).map { it.text })
                // The authority may see the request again, but only ever as itself, and never needs resolving.
                assertTrue(context, h.sends().isNotEmpty() && h.sends().all { it == restart.queued.requestId })
                assertEquals(context, emptyList<String>(), h.resolutions())
                assertEquals(context, emptyList<Throwable>(), h.errors)
                if (restart.finished) {
                    assertEquals(listOf("record", "entry", "record", "send", "record", "entry"), restart.process.effects)
                }
                restart.finished
            }
            if (finished) break
            steps += 1
        }
    }

    @Test
    fun theSubmissionHookRunsOnceTheRecordIsSavedAndBeforeTheSend() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val process = AppProcess(MemoryRecoveryStorage(), MemoryLocalStore(), h.authority)
            val client = h.client(storage = process.storage, http = process.http)
            val requestId = h.environment.uuid()
            var calls = 0
            val forget = client.http.beforeSubmitting(requestId) {
                calls += 1
                process.effects += "hook"
            }
            h.authority.fail("CommunicationSendMessage", Fault.LostResponse)

            assertTrue(runCatching { client.send(conversation, "hello", requestId) }.isFailure)
            client.send(conversation, "hello", requestId)
            forget()

            // Each submission waits for the hook, which runs after the record holding the request is saved.
            assertEquals(
                listOf("record", "hook", "record", "send", "record", "hook", "record", "send", "record"),
                process.effects,
            )
            assertEquals(2, calls)

            val later = h.environment.uuid()
            val stop = client.http.beforeSubmitting(later) { throw IllegalStateException("Not now") }
            val error = runCatching { client.send(conversation, "later", later) }.exceptionOrNull()

            // A failing hook stops the submission before it is counted or sent.
            assertEquals("Not now", error?.message)
            assertEquals(0L, client.requests.records().single { it.requestId == later }.attemptCount)
            assertEquals(listOf(requestId, requestId), h.sends())
            stop()
            client.send(conversation, "later", later)
            assertEquals(listOf(requestId, requestId, later), h.sends())
            assertEquals(listOf("hello", "later"), h.authority.messages(conversation).map { it.text })
            assertEquals(2, calls)
        }
    }

    @Test
    fun aMessageNeverSubmittedBeforeItsBudgetRanOutFails() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            // The process ends once the request's record is saved, before the message is marked or submitted.
            val restart = h.restart(conversation, steps = 1, downtime = 61_000)

            val entry = restart.after.outbox.pending.value.single()
            assertEquals(PendingState.FAILED, entry.state)
            assertEquals("RESOLUTION_REQUIRED", entry.errorCode)
            assertTrue(h.sends().isEmpty())
            assertEquals(listOf(restart.queued.requestId), h.resolutions())
            assertTrue(h.errors.isEmpty())

            // Nothing was sent, so sending it again as a new message cannot duplicate it.
            val again = restart.after.outbox.sendAgain(restart.queued.requestId)
            h.settle()
            assertEquals(listOf(PendingState.SENT), restart.after.states())
            assertEquals(listOf(again.requestId), h.sends())
            assertEquals(listOf("hello"), h.authority.messages(conversation).map { it.text })
        }
    }

    @Test
    fun aMessageSubmittedBeforeItsBudgetRanOutIsUnconfirmed() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            // The process ends once the attempt is counted; the client cannot know that the request never left.
            val restart = h.restart(conversation, steps = 3, downtime = 61_000)

            assertEquals(listOf(PendingState.UNCONFIRMED), restart.after.states())
            assertTrue(h.sends().isEmpty())
            assertEquals(listOf(restart.queued.requestId), h.resolutions())
            assertTrue(h.errors.isEmpty())
        }
    }

    @Test
    fun aMessageWhoseEveryAttemptWasRefusedFailsWhenItsBudgetRunsOut() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val refusal = Fault.Problem("RATE_LIMITED", 429)
            h.authority.fail("CommunicationSendMessage", refusal, refusal, refusal)
            val store = h.store(h.client(storage = MemoryRecoveryStorage()))

            val queued = store.outbox.send(conversation, "hello")
            h.settle()

            // A refused attempt was not applied, so the message waits as queued.
            assertEquals(listOf(PendingState.QUEUED), store.states())
            assertEquals("RATE_LIMITED", store.outbox.pending.value.single().errorCode)
            h.advance(500)
            h.advance(2_000)
            h.advance(8_000)

            val entry = store.outbox.pending.value.single()
            assertEquals(PendingState.FAILED, entry.state)
            assertEquals("RATE_LIMITED", entry.errorCode)
            assertEquals(List(3) { queued.requestId }, h.sends())
            assertEquals(listOf(queued.requestId), h.resolutions())
            assertTrue(h.authority.messages(conversation).isEmpty())
        }
    }

    @Test
    fun aMessageDiscardedBeforeItsFirstAttemptIsNeverSent() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val saved = CompletableDeferred<Unit>()
            val storage = MemoryRecoveryStorage()
            val slow = object : RecoveryStorage by storage {
                override suspend fun setItem(key: String, value: String) {
                    saved.await()
                    storage.setItem(key, value)
                }
            }
            val client = h.client(storage = slow)
            val store = h.store(client)
            val queued = store.outbox.send(conversation, "hello")
            h.settle()

            // Delivery waits for storage to save the request's record, so the message is still queued.
            assertEquals(listOf(PendingState.QUEUED), store.states())
            store.outbox.discard(queued.requestId)
            saved.complete(Unit)
            h.settle()

            assertTrue(store.outbox.pending.value.isEmpty())
            assertTrue(h.sends().isEmpty())
            assertTrue(h.errors.isEmpty())
            assertEquals(0L, client.requests.records().single().attemptCount)
        }
    }

    private class Restart(val queued: PendingMessage, val process: AppProcess, val after: ConvoHopStore, val finished: Boolean)

    /**
     * Queues a message while offline, delivers it in a process that ends
     * after [steps] durable effects, waits [downtime] and starts the app
     * again over the same storage.
     */
    private suspend fun Harness.restart(conversation: String, steps: Int, downtime: Long = 0): Restart {
        val recovery = MemoryRecoveryStorage()
        val entries = MemoryLocalStore()
        val process = AppProcess(recovery, entries, authority)
        online.value = false
        val ending = client(storage = process.storage, http = process.http)
        val before = store(ending, process.local)
        val queued = before.outbox.send(conversation, "hello")
        settle()

        process.dieAfter(steps)
        online.value = true
        settle()
        val finished = !process.dead
        before.close()
        ending.close()
        advance(downtime)
        errors.clear()
        val after = store(client(storage = recovery), entries)
        settle()
        return Restart(queued, process, after, finished)
    }
}

/**
 * One app process over storage that outlives it. Once [dieAfter] has counted
 * down its durable effects, the process is gone: its later writes never
 * reach storage and its requests never reach the authority.
 */
private class AppProcess(recovery: RecoveryStorage, entries: LocalStore, authority: HttpEngine) {
    /** Durable effects in order since [dieAfter]: `record` and `entry` writes, and `send` requests. */
    val effects = ArrayList<String>()
    private var limit = Int.MAX_VALUE

    var dead = false
        private set

    /** Ends the process after [steps] more durable effects. */
    fun dieAfter(steps: Int) {
        effects.clear()
        limit = steps
        dead = steps == 0
    }

    private fun made(effect: String) {
        effects += effect
        if (effects.size >= limit) dead = true
    }

    val storage: RecoveryStorage = object : RecoveryStorage {
        override suspend fun getItem(key: String): String? = recovery.getItem(key)

        override suspend fun setItem(key: String, value: String) {
            if (dead) return
            recovery.setItem(key, value)
            made("record")
        }

        override suspend fun removeItem(key: String) {
            if (dead) return
            recovery.removeItem(key)
            made("record")
        }
    }

    val local: LocalStore = object : LocalStore {
        override suspend fun messages(conversationId: String): List<Message> = entries.messages(conversationId)

        override suspend fun putMessages(conversationId: String, messages: List<Message>) {
            if (!dead) entries.putMessages(conversationId, messages)
        }

        override suspend fun removeMessages(conversationId: String) {
            if (!dead) entries.removeMessages(conversationId)
        }

        override suspend fun pending(): List<PendingMessage> = entries.pending()

        override suspend fun putPending(message: PendingMessage) {
            if (dead) return
            entries.putPending(message)
            made("entry")
        }

        override suspend fun removePending(requestId: String) {
            if (dead) return
            entries.removePending(requestId)
            made("entry")
        }

        override suspend fun clear() {
            if (!dead) entries.clear()
        }
    }

    /** Counts a send once it leaves for the authority; what the process does with the response cannot last. */
    val http: HttpEngine = object : HttpEngine {
        override suspend fun post(request: HttpRequest): HttpResponse {
            if (dead) throw IOException("The process ended")
            val operation = Json.parseToJsonElement(request.body).jsonObject.getValue("operationName").jsonPrimitive.content
            if (operation == "CommunicationSendMessage") made("send")
            return authority.post(request)
        }
    }
}
