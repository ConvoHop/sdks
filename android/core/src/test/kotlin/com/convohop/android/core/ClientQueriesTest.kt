package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import com.convohop.android.generated.InboxPage
import com.convohop.android.generated.MemberPage
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ClientQueriesTest {
    @Test
    fun membersPageWithTheCallersLimitAndStayInTheirConversation() = runTest {
        Harness(this).use { h ->
            val third = testId(1, 7)
            val conversation = h.authority.conversation(listOf(ME, OTHER, third))
            val client = h.client()
            client.initialize()

            val first = client.members(conversation, limit = 2)
            assertEquals(listOf(ME, OTHER), first.items.map { it.principalId })
            assertFalse(first.complete)
            val rest = client.members(conversation, first.nextCursor, limit = 2)
            assertEquals(listOf(third), rest.items.map { it.principalId })
            assertTrue(rest.complete)
            assertEquals(listOf("2", "2"), h.authority.calls("CommunicationMembers").map { it.input.getValue("limit").jsonPrimitive.content })

            // Out-of-range page sizes never reach the authority.
            for (limit in listOf(0, 101)) {
                assertTrue(runCatching { client.members(conversation, limit = limit) }.exceptionOrNull() is IllegalArgumentException)
            }
            assertEquals(2, h.authority.calls("CommunicationMembers").size)

            // A member of another conversation, or a page longer than asked for, is a protocol violation.
            val elsewhere = first.items[0].copy(conversationId = h.authority.conversation())
            h.authority.fail("CommunicationMembers", Fault.Reply(MemberPage(listOf(elsewhere), true, false).toJson()))
            assertTrue(runCatching { client.members(conversation) }.exceptionOrNull() is ConvoHopProtocolException)
            val all = first.items + rest.items
            h.authority.fail("CommunicationMembers", Fault.Reply(MemberPage(all, true, false).toJson()))
            assertTrue(runCatching { client.members(conversation, limit = 2) }.exceptionOrNull() is ConvoHopProtocolException)
        }
    }

    @Test
    fun inboxListsVisibleConversationsWithTheirUnreadState() = runTest {
        Harness(this).use { h ->
            val read = h.authority.conversation()
            val unread = h.authority.conversation()
            h.authority.conversation(listOf(OTHER))
            val seen = h.authority.post(read, OTHER, "seen")
            h.authority.report(read, ME, "read", seen.sequence)
            val latest = h.authority.post(unread, OTHER, "new")
            val client = h.client()
            client.initialize()

            val page = client.inbox()
            assertEquals(listOf(read, unread), page.items.map { it.conversationId })
            assertEquals(listOf(false, true), page.items.map { it.hasUnread })
            assertEquals(latest.messageId, page.items[1].latestVisibleMessage?.messageId)
            assertEquals("new", page.items[1].latestVisibleMessage?.text)
            assertTrue(page.complete)
            assertNull(page.partialReason)

            val first = client.inbox(limit = 1)
            assertEquals(listOf(read), first.items.map { it.conversationId })
            assertEquals(listOf(unread), client.inbox(first.nextCursor, limit = 1).items.map { it.conversationId })

            // An item whose latest message belongs to another conversation is a protocol violation.
            val misplaced = page.items[1].copy(latestVisibleMessage = page.items[0].latestVisibleMessage)
            h.authority.fail("CommunicationInbox", Fault.Reply(InboxPage(listOf(misplaced), true, false).toJson()))
            assertTrue(runCatching { client.inbox() }.exceptionOrNull() is ConvoHopProtocolException)
        }
    }

    @Test
    fun capabilitiesReportTheProjectsFeatures() = runTest {
        Harness(this).use { h ->
            val client = h.client()
            client.initialize()

            val capabilities = client.capabilities()

            assertEquals(h.authority.capabilities, capabilities)
            assertEquals(true, capabilities.features?.typing)
        }
    }

    @Test
    fun deliveryReceiptsUseTheConversationsMembershipAndBelongToTheCaller() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val message = h.authority.post(conversation, OTHER, "ping")
            val client = h.client()
            client.initialize()
            val membership = checkNotNull(client.getConversation(conversation).membership)

            val receipt = client.reportDelivered(conversation, membership, message.sequence)

            assertEquals(ME, receipt.principalId)
            assertEquals(message.sequence, receipt.deliveredThroughSequence)
            assertNull(receipt.readThroughSequence)
            val reports = h.authority.calls("CommunicationReportReceipt")
            assertEquals("delivered", reports.single().input.getValue("kind").jsonPrimitive.content)

            // A membership from another conversation never reaches the authority.
            val elsewhere = checkNotNull(client.getConversation(h.authority.conversation()).membership)
            assertTrue(runCatching { client.reportDelivered(conversation, elsewhere, message.sequence) }.exceptionOrNull() is IllegalArgumentException)
            assertEquals(1, h.authority.calls("CommunicationReportReceipt").size)

            // A receipt for someone else is not this user's receipt, even when the authority committed the report.
            h.authority.fail("CommunicationReportReceipt", Fault.Reply(receipt.copy(principalId = OTHER).toJson()))
            assertTrue(runCatching { client.reportRead(conversation, membership, message.sequence) }.exceptionOrNull() is ConvoHopProtocolException)
        }
    }
}
