package com.convohop.android.push

import android.app.Notification
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import com.convohop.android.push.Fixtures.CONVERSATION
import com.convohop.android.push.Fixtures.LIVE_SESSION
import com.convohop.android.push.Fixtures.MESSAGE
import com.convohop.android.push.Fixtures.NOW
import com.convohop.android.push.Fixtures.RECIPIENT
import com.convohop.android.push.Fixtures.callData
import com.convohop.android.push.Fixtures.id
import com.convohop.android.push.Fixtures.messageData
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import java.util.concurrent.atomic.AtomicInteger

/** Message pushes, tokens, listeners and the delivery ledger. */
@RunWith(RobolectricTestRunner::class)
internal class MessageNotificationsTest {
    private val push = PushHarness()
    private val manager = push.manager

    @Test
    fun showsAGenericMessageWhenThePushHasNoText() {
        assertEquals(PushResult.MESSAGE, push.handle(messageData(id(1))))
        val notification = push.notification(CONVERSATION)
        assertEquals(CallNotifier.CHANNEL_MESSAGES, notification.channelId)
        assertEquals(Notification.CATEGORY_MESSAGE, notification.category)
        assertEquals(push.label, notification.title)
        assertEquals("New message", notification.text)
        assertEquals("New message", notification.extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString())
        assertEquals(NOW - 5_000, notification.`when`)
        assertTrue(notification.flags and Notification.FLAG_AUTO_CANCEL != 0)
        val open = shadowOf(notification.contentIntent)
        assertTrue(open.isActivity)
        val intent = open.savedIntent
        assertEquals(PushHarness.OPEN_CONVERSATION, intent.action)
        assertEquals(ConvoHopNotifications.ACTION_MESSAGE, intent.getStringExtra(ConvoHopNotifications.EXTRA_ACTION))
        assertEquals(CONVERSATION, intent.getStringExtra(ConvoHopNotifications.EXTRA_CONVERSATION_ID))
        assertEquals(MESSAGE, intent.getStringExtra(ConvoHopNotifications.EXTRA_MESSAGE_ID))
        assertTrue(intent.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0)
        assertEquals(listOf("message ${id(1)}"), push.events())
    }

    @Test
    fun showsThePreviewWhenTheProjectSendsOne() {
        push.handle(messageData(id(1), title = "Ada", body = "Lunch at noon?"))
        val notification = push.notification(CONVERSATION)
        assertEquals("Ada", notification.title)
        assertEquals("Lunch at noon?", notification.text)
        assertEquals("Lunch at noon?", notification.extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString())
    }

    @Test
    fun replacesTheConversationsNotificationWithTheLatestMessage() {
        push.handle(messageData(id(1), body = "One"))
        push.handle(messageData(id(2), body = "Two", messageId = id(50)))
        assertEquals(1, push.notifications.size())
        val notification = push.notification(CONVERSATION)
        assertEquals("Two", notification.text)
        val intent = shadowOf(notification.contentIntent).savedIntent
        assertEquals(id(50), intent.getStringExtra(ConvoHopNotifications.EXTRA_MESSAGE_ID))
        assertEquals(listOf("message ${id(1)}", "message ${id(2)}"), push.events())
    }

    @Test
    fun fetchesTheTextOnTheThreadThatHandlesThePush() {
        val asked = mutableListOf<String>()
        push.options.messageContent = MessageContentProvider { message ->
            asked += message.messageId
            MessageContent("Ada", "Lunch at noon?")
        }
        assertEquals(PushResult.MESSAGE, push.handleInBackground(messageData(id(1))))
        assertEquals(listOf(MESSAGE), asked)
        val notification = push.notification(CONVERSATION)
        assertEquals("Ada", notification.title)
        assertEquals("Lunch at noon?", notification.text)
        assertEquals(listOf("message ${id(1)}"), push.events())
    }

    @Test
    fun keepsThePushTitleWhenTheFetchedContentHasNone() {
        push.options.messageContent = MessageContentProvider { MessageContent(null, "Lunch at noon?") }
        push.handleInBackground(messageData(id(1), title = "Ada"))
        assertEquals("Ada", push.notification(CONVERSATION).title)
        assertEquals("Lunch at noon?", push.notification(CONVERSATION).text)
        push.handleInBackground(messageData(id(2)))
        assertEquals(push.label, push.notification(CONVERSATION).title)
    }

    @Test
    fun showsTheGenericTextWhenFetchingFails() {
        push.options.messageContent = MessageContentProvider { null }
        assertEquals(PushResult.MESSAGE, push.handleInBackground(messageData(id(1), title = "Ada")))
        assertEquals("Ada", push.notification(CONVERSATION).title)
        assertEquals("New message", push.notification(CONVERSATION).text)
        push.options.messageContent = MessageContentProvider { throw IllegalStateException("offline") }
        assertEquals(PushResult.MESSAGE, push.handleInBackground(messageData(id(2))))
        assertEquals(push.label, push.notification(CONVERSATION).title)
        assertEquals("New message", push.notification(CONVERSATION).text)
        assertEquals(listOf("message ${id(1)}", "message ${id(2)}"), push.events())
    }

    @Test
    fun fetchesNeitherOnTheMainThreadNorWhenThePushHasText() {
        val fetches = AtomicInteger()
        push.options.messageContent = MessageContentProvider {
            fetches.incrementAndGet()
            MessageContent("Fetched", "Fetched")
        }
        push.handle(messageData(id(1)))
        assertEquals("New message", push.notification(CONVERSATION).text)
        push.handleInBackground(messageData(id(2), body = "Lunch at noon?"))
        assertEquals("Lunch at noon?", push.notification(CONVERSATION).text)
        assertEquals(0, fetches.get())
    }

    @Test
    fun leavesMessagesToTheAppWhenAsked() {
        push.options.showMessages = false
        assertEquals(PushResult.MESSAGE, push.handle(messageData(id(1), body = "Lunch at noon?")))
        assertEquals(0, push.notifications.size())
        assertEquals(listOf("message ${id(1)}"), push.events())
    }

    @Test
    fun handlesEachEventOnceAndRejectsOtherPushes() {
        assertEquals(PushResult.MESSAGE, push.handle(messageData(id(1))))
        assertEquals(PushResult.IGNORED, push.handle(messageData(id(1))))
        assertEquals(PushResult.NOT_CONVOHOP, manager.handleNotification(mapOf("kind" to "promo")))
        assertEquals(PushResult.INVALID, push.handle("{}"))
        assertEquals(PushResult.INVALID, push.handle("not json"))
        assertEquals(1, push.notifications.size())
        assertEquals(listOf("message ${id(1)}"), push.events())
    }

    @Test
    fun skipsRecipientsTheFilterRejectsWithoutRecordingThem() {
        val other = id(9)
        push.options.recipientFilter = RecipientFilter { it == RECIPIENT }
        assertEquals(PushResult.IGNORED, push.handle(messageData(id(1), recipientId = other)))
        assertEquals(PushResult.MESSAGE, push.handle(messageData(id(2))))
        assertEquals(1, push.notifications.size())
        // The skipped push wasn't recorded, so it shows once its recipient signs in here.
        push.options.recipientFilter = RecipientFilter { it == other }
        assertEquals(PushResult.MESSAGE, push.handle(messageData(id(1), recipientId = other)))
        assertEquals(listOf("message ${id(2)}", "message ${id(1)}"), push.events())
    }

    @Test
    fun reportsTokensToListeners() {
        assertNull(manager.token)
        manager.onNewToken("token-1")
        assertEquals("token-1", manager.token)
        assertEquals(listOf("token token-1"), push.events())

        val tokens = mutableListOf<String>()
        val listener = object : ConvoHopNotificationListener {
            override fun onToken(token: String) {
                tokens += token
            }
        }
        val registration = manager.addListener(listener)
        manager.addListener(listener)
        manager.onNewToken("token-2")
        assertEquals(listOf("token token-2"), push.events())
        assertEquals(listOf("token-2"), tokens)

        registration.close()
        manager.onNewToken("token-3")
        assertEquals(listOf("token token-3"), push.events())
        manager.removeListener(push.recorder)
        manager.onNewToken("token-4")
        assertEquals(emptyList<String>(), push.events())
        assertEquals(listOf("token-2"), tokens)
        assertEquals("token-4", manager.token)
    }

    @Test
    fun keepsOnlyIdsInSharedPreferencesByDefault() {
        push.options.ledgerStore = null
        val alert = id(100)
        push.handle(messageData(id(1), title = "Ada", body = "Lunch at noon?"))
        push.handle(callData(id(2), alert, title = "Ada"))
        manager.onNewToken("fcm-token")
        assertTrue(manager.reject(alert))
        val preferences = push.app.getSharedPreferences("com.convohop.android.push", Context.MODE_PRIVATE)
        val stored = checkNotNull(preferences.getString("ledger", null))
        assertTrue(stored, stored.contains(id(1)) && stored.contains(id(2)) && stored.contains(alert))
        for (secret in listOf("Ada", "Lunch", "fcm-token", CONVERSATION, RECIPIENT, LIVE_SESSION)) {
            assertFalse(secret, stored.contains(secret))
        }
        // A new process reads it back.
        val ledger = PushLedger(SharedPreferencesPushLedgerStore(push.app), clock = { push.now })
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.message(id(1))))
        assertTrue(ledger.isStopped(alert, NOW + 30_000))
    }

    @Test
    fun hasOneInstancePerProcess() {
        assertSame(manager, ConvoHopNotifications.getInstance(push.app))
        assertSame(manager, ConvoHopNotifications.getInstance(ContextWrapper(push.app)))
        assertSame(push.app, manager.context)
    }
}
