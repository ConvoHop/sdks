package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import com.convohop.android.generated.SessionBootstrap
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ClientSessionTest {
    @Test
    fun sessionRenewsBeforeItExpiresAndTheReplayFollowsTheNewBearer() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val renewed = ArrayList<SessionBootstrap>()
            val client = h.client(
                h.authority.issue(600_000),
                refresh = SessionRefresh { current -> h.authority.renew(current).also(renewed::add) },
            )
            client.refreshAutomatically { h.errors += it }.use {
                val timeline = h.store(client).timeline(conversation)
                h.settle()
                assertEquals(ReplayState.LIVE, timeline.replay.value)
                assertEquals("1", client.sessionBinding?.sessionRevision)

                // A ten-minute session renews two minutes before it expires.
                h.advance(479_999)
                assertTrue(renewed.isEmpty())
                h.advance(1)

                val bootstrap = renewed.single()
                assertEquals("2", client.sessionBinding?.sessionRevision)
                assertEquals(SessionRefreshState.READY, client.sessionRefreshState)
                assertEquals(bootstrap.sessionToken, h.authority.sockets.single().token)
                assertEquals(ReplayState.LIVE, timeline.replay.value)
                h.authority.post(conversation, OTHER, "after renewal")
                h.settle()
                assertEquals("after renewal", (timeline.items.value.single() as TimelineItem.Sent).message.text)
                assertEquals(bootstrap.sessionToken, h.authority.calls("CommunicationMessages").last().token)
                assertTrue(h.errors.isEmpty())
            }
        }
    }

    @Test
    fun renewalReleasesMessagesHeldForTheSession() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val token = h.authority.issue()
            val renewed = ArrayList<SessionBootstrap>()
            val client = h.client(token, refresh = SessionRefresh { current -> h.authority.renew(current).also(renewed::add) })
            client.initialize()
            h.authority.fail("CommunicationSendMessage", Fault.Problem("SESSION_REFRESH_REQUIRED", 409))
            val store = h.store(client)

            val queued = store.outbox.send(conversation, "hello")
            h.settle()
            store.outbox.send(conversation, "world")
            h.advance(30_000)
            assertEquals(listOf(PendingState.QUEUED, PendingState.QUEUED), store.outbox.pending.value.map { it.state })
            assertEquals("SESSION_REFRESH_REQUIRED", store.outbox.pending.value.first().errorCode)
            client.refreshSession()
            h.settle()

            assertEquals(listOf(PendingState.SENT, PendingState.SENT), store.outbox.pending.value.map { it.state })
            assertEquals(listOf("hello", "world"), h.authority.messages(conversation).map { it.text })
            val sends = h.authority.calls("CommunicationSendMessage")
            assertEquals(listOf(queued.requestId, queued.requestId), sends.take(2).map { it.requestId })
            assertEquals(listOf(token, renewed.single().sessionToken, renewed.single().sessionToken), sends.map { it.token })
            assertEquals(listOf("SESSION_REFRESH_REQUIRED"), h.errorCodes())
        }
    }
}
