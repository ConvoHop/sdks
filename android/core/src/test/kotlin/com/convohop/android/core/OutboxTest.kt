package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OutboxTest {
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

    @Test
    fun aRateLimitedMessageWaitsOutTheAuthoritysRetryAfter() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.authority.fail("CommunicationSendMessage", Fault.Problem("RATE_LIMITED", 429, retryAfter = 7))
            val store = h.store()

            val queued = store.outbox.send(conversation, "later")
            h.settle()

            val entry = store.outbox.pending.value.single()
            assertEquals(listOf<Any?>(PendingState.QUEUED, "RATE_LIMITED"), listOf(entry.state, entry.errorCode))
            // Reported for logging only: the message waits instead of failing.
            assertEquals(listOf("RATE_LIMITED"), h.errorCodes())
            h.advance(6_999)
            store.outbox.drain()
            h.settle()
            assertEquals("Nothing is sent before the authority's delay", listOf(queued.requestId), h.sends())
            h.advance(1)
            assertEquals(listOf(PendingState.SENT), store.states())
            assertEquals(listOf(queued.requestId, queued.requestId), h.sends())
        }
    }

    @Test
    fun aRefusalNoRetryCanChangeFailsAtOnceWhileOtherFailuresKeepTheRequest() = runTest {
        for ((code, status, retryAfter) in listOf(
            Triple("QUOTA_EXCEEDED", 429, 60L), Triple("PLAN_LIMIT_EXCEEDED", 403, null), Triple("MEMBERSHIP_COUNT_INVALID", 503, null),
        )) {
            Harness(this).use { h ->
                val conversation = h.authority.conversation()
                h.authority.fail("CommunicationSendMessage", Fault.Problem(code, status, retryAfter = retryAfter))
                val store = h.store()

                val refused = store.outbox.send(conversation, "refused")
                h.settle()

                val entry = store.outbox.pending.value.single()
                assertEquals(code, listOf<Any?>(PendingState.FAILED, code), listOf(entry.state, entry.errorCode))
                assertEquals(listOf(code), h.errorCodes())
                h.advance(600_000)
                store.outbox.drain()
                h.settle()
                assertEquals("$code is never sent again", listOf(refused.requestId), h.sends())
            }
        }
        // A code the schema doesn't list is judged by its status.
        for ((code, status) in listOf("AUTHORITY_UNAVAILABLE" to 503, "HTTP_FAILURE" to 408, "RATE_LIMITED" to 429, "UNLISTED_FAILURE" to 502)) {
            Harness(this).use { h ->
                val conversation = h.authority.conversation()
                h.authority.fail("CommunicationSendMessage", Fault.Problem(code, status))
                val store = h.store()

                val queued = store.outbox.send(conversation, "later")
                h.settle()

                val entry = store.outbox.pending.value.single()
                assertEquals(code, listOf<Any?>(PendingState.QUEUED, code), listOf(entry.state, entry.errorCode))
                h.advance(1_000)
                assertEquals(code, listOf(PendingState.SENT), store.states())
                assertEquals(code, listOf(queued.requestId, queued.requestId), h.sends())
                assertEquals(listOf(code), h.errorCodes())
            }
        }
    }

    @Test
    fun aMessageRefusedForTheWrongRegionRoutesAgainAndResendsAtTheCurrentEpoch() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val client = h.client()
            client.initialize()
            val store = h.store(client)
            // The project has moved since the client routed.
            h.authority.servingEpoch = "7"
            h.authority.fail("CommunicationSendMessage", Fault.Problem("WRONG_REGION", 409))

            val queued = store.outbox.send(conversation, "moved")
            h.settle()

            val entry = store.outbox.pending.value.single()
            assertEquals(listOf<Any?>(PendingState.QUEUED, "WRONG_REGION"), listOf(entry.state, entry.errorCode))
            val routing = h.authority.calls.map { it.operation }.filter { it == "CommunicationRoute" || it == "CommunicationSendMessage" }
            assertEquals(
                "The outbox routes again before it schedules the resend",
                listOf("CommunicationRoute", "CommunicationSendMessage", "CommunicationRoute"),
                routing,
            )
            h.advance(1_000)
            assertEquals(listOf(PendingState.SENT), store.states())
            assertEquals(listOf(queued.requestId, queued.requestId), h.sends())
            assertEquals(listOf("1", "7"), h.authority.calls("CommunicationSendMessage").map { it.servingEpoch })
            assertEquals(listOf("WRONG_REGION"), h.errorCodes())
        }
    }

    @Test
    fun aFullRecoveryJournalKeepsAMessageQueuedUntilAFinalRecordMakesRoom() = runTest {
        Harness(this).use { h ->
            val client = h.client()
            val conversation = h.authority.conversation()
            val store = h.store(client)
            // Requests whose outcome is unknown may still be resent, so none of their records can make room.
            val fillers = List(JOURNAL_LIMIT) { h.environment.uuid() }
            h.authority.fail("CommunicationSendMessage", *Array(JOURNAL_LIMIT) { Fault.Unreachable })
            for (requestId in fillers) assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "filler", requestId) }.code)

            val queued = store.outbox.send(conversation, "waits")
            h.settle()

            val entry = store.outbox.pending.value.single()
            assertEquals(listOf<Any?>(PendingState.QUEUED, "RECOVERY_LIMIT"), listOf(entry.state, entry.errorCode))
            assertEquals("Nothing was sent", fillers, h.sends())
            assertEquals(listOf("RECOVERY_LIMIT"), h.errorCodes())

            assertEquals("committed", client.requests.retry(fillers[5]).state)
            store.outbox.drain()
            h.settle()
            assertEquals(listOf(PendingState.SENT), store.states())
            val kept = client.kept()
            assertEquals(JOURNAL_LIMIT, kept.size)
            assertTrue("The committed record made room", queued.requestId in kept && fillers[5] !in kept)
            assertEquals(listOf(fillers[5], queued.requestId), h.sends().drop(JOURNAL_LIMIT))
        }
    }

    @Test
    fun theOutboxKeepsTheRecordOfAMessageItMayStillSettleUntilItCloses() = runTest {
        Harness(this).use { h ->
            val client = h.client()
            val conversation = h.authority.conversation()
            val store = h.store(client)
            h.authority.fail("CommunicationSendMessage", Fault.Problem("RATE_LIMITED", 429, retryAfter = 120))
            val held = store.outbox.send(conversation, "held")
            h.settle()
            assertEquals("RATE_LIMITED", store.outbox.pending.value.single().errorCode)

            // Past its 60-second budget the rejected record is final, but the message still waits to settle it.
            h.advance(61_000)
            h.authority.fail("CommunicationSendMessage", *Array(JOURNAL_LIMIT - 1) { Fault.Unreachable })
            repeat(JOURNAL_LIMIT - 1) { assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "filler") }.code) }
            val refusal = failure { client.send(conversation, "refused") }
            assertEquals(listOf<Any>("RECOVERY_LIMIT", "rejected", 409), listOf(refusal.code, refusal.outcome, refusal.status))
            assertTrue(held.requestId in client.kept())

            store.close()
            h.settle()
            client.send(conversation, "admitted")
            assertFalse("A closed outbox no longer keeps it", held.requestId in client.kept())
        }
    }

    @Test
    fun wakingSkipsTheBackoffButNotTheAuthoritysRetryAfter() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.authority.fail(
                "CommunicationSendMessage", Fault.Problem("RATE_LIMITED", 429, retryAfter = 7), Fault.Problem("RATE_LIMITED", 429),
            )
            val store = h.store()
            store.outbox.send(conversation, "later")
            h.settle()

            h.reconnect()
            assertEquals("A wake never sends before the authority's delay", 1, h.sends().size)
            h.advance(7_000)
            assertEquals(2, h.sends().size)
            assertEquals(listOf(PendingState.QUEUED), store.states())
            // Without a retryAfter, the second rate limit's backoff gives way to the wake.
            h.reconnect()
            assertEquals(listOf(PendingState.SENT), store.states())
            assertEquals(3, h.sends().size)
        }
    }

    @Test
    fun aLongRetryAfterIsWaitedOutInFull() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.authority.fail("CommunicationSendMessage", Fault.Problem("RATE_LIMITED", 429, retryAfter = 600))
            val store = h.store()

            val queued = store.outbox.send(conversation, "later")
            h.settle()
            h.advance(599_999)
            h.reconnect()

            assertEquals(listOf(PendingState.QUEUED), store.states())
            assertEquals(listOf(queued.requestId), h.sends())
            assertTrue(h.resolutions().isEmpty())
            h.advance(1)
            // The wait outlasted the request's 60-second budget, so it is resolved instead of resent. It was never applied.
            val entry = store.outbox.pending.value.single()
            assertEquals(listOf<Any?>(PendingState.FAILED, "RATE_LIMITED"), listOf(entry.state, entry.errorCode))
            assertEquals(listOf(queued.requestId), h.sends())
            assertEquals(listOf(queued.requestId), h.resolutions())
        }
    }

    /** The device drops off the network and comes back, which wakes the outbox. */
    private fun Harness.reconnect() {
        online.value = false
        settle()
        online.value = true
        settle()
    }
}
