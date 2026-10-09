package com.convohop.android.core

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TimelineTest {
    private fun Timeline.texts(): List<String?> = items.value.map {
        when (it) {
            is TimelineItem.Sent -> it.message.text
            is TimelineItem.Pending -> it.message.text
        }
    }

    @Test
    fun storedMessagesShowOfflineAndTheAuthorityReplacesThem() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val first = h.authority.post(conversation, OTHER, "first")
            val local = MemoryLocalStore()
            local.putMessages(conversation, listOf(first.copy(messageId = testId(9, 1), text = "cached")))
            h.online.value = false

            val timeline = h.store(local = local).timeline(conversation)
            h.settle()

            assertEquals(listOf("cached"), timeline.texts())
            assertEquals(ReplayState.RECONNECTING, timeline.replay.value)
            assertTrue(h.authority.calls.isEmpty())
            h.online.value = true
            h.settle()
            assertEquals(listOf("first"), timeline.texts())
            assertEquals(ReplayState.LIVE, timeline.replay.value)
            assertEquals(listOf("first"), local.messages(conversation).map { it.text })
            assertTrue(h.errors.isEmpty())
        }
    }

    @Test
    fun newAndEditedMessagesArriveLive() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val timeline = h.store().timeline(conversation)
            h.settle()
            assertEquals(ReplayState.LIVE, timeline.replay.value)

            val hello = h.authority.post(conversation, OTHER, "hello")
            h.settle()
            assertEquals(listOf("hello"), timeline.texts())
            h.authority.edit(conversation, hello.messageId, "hello again")
            h.settle()

            assertEquals(listOf("hello again"), timeline.texts())
            assertEquals("2", (timeline.items.value.single() as TimelineItem.Sent).message.revision)
            assertEquals(1, h.authority.calls("CommunicationGetMessage").size)
            assertTrue(h.errors.isEmpty())
        }
    }

    @Test
    fun ownMessageIsPendingUntilTheAuthorityShowsIt() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.online.value = false
            val store = h.store()
            val timeline = store.timeline(conversation)
            h.settle()

            val pending = timeline.send("hi")
            h.settle()

            assertEquals(listOf(pending.requestId), timeline.items.value.map { it.key })
            assertEquals(PendingState.QUEUED, (timeline.items.value.single() as TimelineItem.Pending).message.state)
            h.online.value = true
            h.settle()
            val message = h.authority.messages(conversation).single()
            assertEquals(listOf(message.messageId), timeline.items.value.map { it.key })
            assertEquals(listOf("hi"), timeline.texts())
            assertTrue(store.outbox.pending.value.isEmpty())
            assertTrue(store.local.pending().isEmpty())
            assertTrue(h.errors.isEmpty())
        }
    }

    @Test
    fun olderMessagesLoadPageByPage() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            repeat(150) { h.authority.post(conversation, OTHER, "m$it") }
            val store = h.store()
            val timeline = store.timeline(conversation)
            h.settle()

            assertEquals((50 until 150).map { "m$it" }, timeline.texts())
            assertTrue(timeline.hasOlder.value)
            assertTrue(timeline.loadOlder())
            h.settle()
            assertEquals((0 until 150).map { "m$it" }, timeline.texts())
            assertFalse(timeline.hasOlder.value)
            assertFalse(timeline.loadOlder())
            assertEquals(150, store.local.messages(conversation).size)
        }
    }

    @Test
    fun droppedConnectionCatchesUpThenFollowsLive() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val timeline = h.store().timeline(conversation)
            h.settle()

            h.authority.disconnect()
            h.settle()
            assertEquals(ReplayState.RECONNECTING, timeline.replay.value)
            h.authority.post(conversation, OTHER, "missed")
            h.advance(999)
            assertTrue(timeline.texts().isEmpty())
            h.advance(1)

            assertEquals(listOf("missed"), timeline.texts())
            assertEquals(ReplayState.LIVE, timeline.replay.value)
            // One catch-up when the replay opened and one after the drop.
            assertEquals(2, h.authority.calls("CommunicationEvents").size)
            h.authority.post(conversation, OTHER, "live")
            h.settle()
            assertEquals(listOf("missed", "live"), timeline.texts())
            assertTrue(h.errors.isEmpty())
        }
    }

    @Test
    fun removalFromTheConversationClosesTheTimeline() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val timeline = h.store().timeline(conversation)
            h.settle()

            h.authority.remove(conversation, ME)
            h.settle()

            assertEquals(ReplayState.CLOSED, timeline.replay.value)
            assertEquals(listOf("NOT_FOUND"), h.errorCodes())
            // The first read and one more after the removal: a closed timeline does not try again.
            h.advance(120_000)
            assertEquals(2, h.authority.calls("CommunicationGetConversation").size)
        }
    }

    @Test
    fun receiptsFollowReportsAndMarkRead() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            h.authority.post(conversation, OTHER, "one")
            h.authority.post(conversation, OTHER, "two")
            h.authority.report(conversation, OTHER, "read", "1")
            val timeline = h.store().timeline(conversation)
            h.settle()

            assertEquals("1", timeline.receipts.value.getValue(OTHER).readThroughSequence)
            assertTrue(timeline.markRead())
            h.settle()
            assertEquals("2", timeline.receipts.value.getValue(ME).readThroughSequence)
            assertFalse(timeline.markRead())
            h.authority.report(conversation, OTHER, "read", "2")
            h.settle()

            assertEquals("2", timeline.receipts.value.getValue(OTHER).readThroughSequence)
            assertEquals(1, h.authority.calls("CommunicationReportReceipt").size)
            assertTrue(h.errors.isEmpty())
        }
    }
}
