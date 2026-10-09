package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OutboxTest {
    private fun ConvoHopStore.states(): List<PendingState> = outbox.pending.value.map { it.state }

    private fun Harness.sends(): List<String> = authority.calls("CommunicationSendMessage").map { it.requestId }

    private fun Harness.resolutions(): List<String> =
        authority.calls("CommunicationResolveRequest").map { it.input.getValue("requestId").jsonPrimitive.content }

    @Test
    fun sendShowsTheMessageAtOnceAndConfirmsIt() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val store = h.store()

            val queued = store.outbox.send(conversation, "hello")

            assertEquals(PendingState.QUEUED, queued.state)
            assertEquals(listOf(queued), store.outbox.pending.value)
            h.settle()
            val sent = store.outbox.pending.value.single()
            val message = h.authority.messages(conversation).single()
            assertEquals(PendingState.SENT, sent.state)
            assertEquals(message.messageId, sent.messageId)
            assertEquals("hello", message.text)
            assertEquals(listOf(queued.requestId), h.sends())
        }
    }

    @Test
    fun offlineMessagesWaitAndSendOldestFirst() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.online.value = false
            val store = h.store()

            val first = store.outbox.send(conversation, "one")
            val second = store.outbox.send(conversation, "two")
            h.advance(120_000)

            assertEquals(listOf(PendingState.QUEUED, PendingState.QUEUED), store.states())
            assertTrue(h.authority.calls.isEmpty())
            h.online.value = true
            h.settle()
            assertEquals(listOf("one", "two"), h.authority.messages(conversation).map { it.text })
            assertEquals(listOf(first.requestId, second.requestId), h.sends())
            assertEquals(listOf(PendingState.SENT, PendingState.SENT), store.states())
        }
    }

    @Test
    fun lostResponseIsResentUnderTheSameRequestId() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.authority.fail("CommunicationSendMessage", Fault.LostResponse)
            val store = h.store()

            val queued = store.outbox.send(conversation, "hello")
            h.settle()

            assertEquals(listOf(PendingState.SENDING), store.states())
            // The first attempt may have committed: it cannot be discarded, only resolved or resent as itself.
            assertTrue(runCatching { store.outbox.discard(queued.requestId) }.exceptionOrNull() is IllegalStateException)
            h.advance(500)
            assertEquals(listOf(PendingState.SENT), store.states())
            assertEquals(listOf(queued.requestId, queued.requestId), h.sends())
            assertEquals(1, h.authority.messages(conversation).size)
            assertEquals(listOf("TRANSPORT_UNKNOWN"), h.errorCodes())
        }
    }

    @Test
    fun rejectedMessageFailsWithoutBlockingTheQueue() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.authority.fail("CommunicationSendMessage", Fault.Problem("CONTENT_REJECTED", 422), Fault.Problem("CONTENT_REJECTED", 422))
            val store = h.store()

            val rejected = store.outbox.send(conversation, "rejected")
            val discarded = store.outbox.send(conversation, "discarded")
            val later = store.outbox.send(conversation, "later")
            h.settle()

            val entries = store.outbox.pending.value.associateBy { it.requestId }
            assertEquals(PendingState.FAILED, entries.getValue(rejected.requestId).state)
            assertEquals("CONTENT_REJECTED", entries.getValue(rejected.requestId).errorCode)
            assertEquals(PendingState.FAILED, entries.getValue(discarded.requestId).state)
            assertEquals(PendingState.SENT, entries.getValue(later.requestId).state)
            assertEquals(listOf("later"), h.authority.messages(conversation).map { it.text })

            store.outbox.discard(discarded.requestId)
            val again = store.outbox.sendAgain(rejected.requestId)
            h.settle()

            assertNotEquals(rejected.requestId, again.requestId)
            assertEquals(listOf(later.requestId, again.requestId), store.outbox.pending.value.map { it.requestId })
            assertEquals(listOf(PendingState.SENT, PendingState.SENT), store.states())
            assertEquals(listOf("later", "rejected"), h.authority.messages(conversation).map { it.text })
        }
    }

    @Test
    fun unknownOutcomeIsResolvedReadOnlyAfterTheRetryBudget() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.authority.fail("CommunicationSendMessage", Fault.Unreachable, Fault.Unreachable, Fault.Unreachable)
            val store = h.store()

            val queued = store.outbox.send(conversation, "hello")
            h.settle()
            h.advance(500)
            h.advance(2_000)
            assertEquals(listOf(PendingState.SENDING), store.states())
            h.advance(8_000)

            // Three attempts spent the budget; the request is resolved, never resent under a new identity.
            val entry = store.outbox.pending.value.single()
            assertEquals(PendingState.UNCONFIRMED, entry.state)
            assertEquals(queued.requestId, entry.requestId)
            assertEquals(List(3) { queued.requestId }, h.sends())
            assertEquals(listOf(queued.requestId), h.resolutions())

            h.advance(120_000)
            store.outbox.drain()
            h.settle()
            assertEquals(listOf(PendingState.UNCONFIRMED), store.states())
            assertEquals(3, h.sends().size)
            assertEquals(List(2) { queued.requestId }, h.resolutions())
            assertTrue(h.authority.messages(conversation).isEmpty())

            val again = store.outbox.sendAgain(queued.requestId)
            h.settle()
            assertNotEquals(queued.requestId, again.requestId)
            assertEquals(listOf(PendingState.SENT), store.states())
            assertEquals(listOf("hello"), h.authority.messages(conversation).map { it.text })
        }
    }

    @Test
    fun restartWithoutARecoveryRecordResolvesInsteadOfResending() = runTest {
        Harness(this).use { h ->
            val local = MemoryLocalStore()
            val committedIn = h.authority.conversation()
            val lostIn = h.authority.conversation()
            h.authority.fail("CommunicationSendMessage", Fault.LostResponse, Fault.Unreachable)
            val before = h.store(local = local)
            val committed = before.outbox.send(committedIn, "committed")
            val lost = before.outbox.send(lostIn, "lost")
            h.settle()
            assertEquals(listOf(PendingState.SENDING, PendingState.SENDING), before.states())

            // The process ends before either outcome is known, and kept no recovery records.
            before.close()
            val after = h.store(local = local)
            h.settle()

            val entries = after.outbox.pending.value.associateBy { it.requestId }
            assertEquals(PendingState.SENT, entries.getValue(committed.requestId).state)
            assertEquals(h.authority.messages(committedIn).single().messageId, entries.getValue(committed.requestId).messageId)
            assertEquals(PendingState.UNCONFIRMED, entries.getValue(lost.requestId).state)
            assertEquals(listOf(committed.requestId, lost.requestId), h.sends())
            assertEquals(listOf(committed.requestId, lost.requestId), h.resolutions())
            assertTrue(h.authority.messages(lostIn).isEmpty())
        }
    }

    @Test
    fun restartWithARecoveryRecordResendsTheSameRequest() = runTest {
        Harness(this).use { h ->
            val storage = MemoryRecoveryStorage()
            val local = MemoryLocalStore()
            val conversation = h.authority.conversation()
            h.authority.fail("CommunicationSendMessage", Fault.Unreachable)
            val before = h.store(h.client(storage = storage), local)
            val queued = before.outbox.send(conversation, "hello")
            h.settle()
            assertEquals(listOf(PendingState.SENDING), before.states())

            before.close()
            val after = h.store(h.client(storage = storage), local)
            h.settle()

            assertEquals(listOf(PendingState.SENT), after.states())
            assertEquals(listOf(queued.requestId, queued.requestId), h.sends())
            assertTrue(h.resolutions().isEmpty())
            assertEquals(listOf("hello"), h.authority.messages(conversation).map { it.text })
        }
    }

    @Test
    fun refusedSessionHoldsTheQueueUntilDrained() = runTest {
        Harness(this).use { h ->
            val local = MemoryLocalStore()
            val first = h.authority.conversation()
            val second = h.authority.conversation()
            val expiring = h.store(h.client(token = h.authority.issue(lifetime = 1_000)), local)
            h.advance(2_000)

            val hello = expiring.outbox.send(first, "hello")
            h.settle()
            val world = expiring.outbox.send(second, "world")
            h.settle()

            // The refused attempt was not applied, and later sends leave the held queue alone.
            assertEquals(listOf(PendingState.QUEUED, PendingState.QUEUED), expiring.states())
            assertEquals("UNAUTHENTICATED", expiring.outbox.pending.value.first().errorCode)
            assertEquals(listOf("UNAUTHENTICATED"), h.errorCodes())
            assertEquals(listOf(hello.requestId), h.sends())
            expiring.outbox.drain()
            h.settle()
            assertEquals(listOf(hello.requestId, hello.requestId), h.sends())

            expiring.close()
            val renewed = h.store(h.client(), local)
            h.settle()
            assertEquals(listOf(PendingState.SENT, PendingState.SENT), renewed.states())
            assertEquals(listOf("hello"), h.authority.messages(first).map { it.text })
            assertEquals(listOf("world"), h.authority.messages(second).map { it.text })
            assertEquals(listOf(hello.requestId, hello.requestId, hello.requestId, world.requestId), h.sends())
        }
    }
}
