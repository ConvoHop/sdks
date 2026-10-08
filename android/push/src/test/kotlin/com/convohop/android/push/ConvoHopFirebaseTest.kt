package com.convohop.android.push

import android.os.Bundle
import com.convohop.android.push.Fixtures.callData
import com.convohop.android.push.Fixtures.id
import com.google.firebase.messaging.RemoteMessage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

/** Hands FCM's messages and tokens to the manager. FCM is faked: messages are built as it delivers them. */
@RunWith(RobolectricTestRunner::class)
internal class ConvoHopFirebaseTest {
    private val push = PushHarness()
    private val alert = id(100)

    @Test
    fun handlesOnlyConvoHopMessages() {
        assertFalse(ConvoHopFirebase.handleMessage(push.app, fcm(mapOf("campaign" to "spring"))))
        assertFalse(ConvoHopFirebase.handleMessage(push.app, fcm(emptyMap())))
        assertTrue(ConvoHopFirebase.handleMessage(push.app, fcm(Fixtures.push(callData(id(1), alert)))))
        assertEquals(CallState.RINGING, push.manager.call(alert)?.state)
        assertEquals(listOf("incoming $alert"), push.events())
    }

    @Test
    fun claimsConvoHopMessagesItCannotRead() {
        // Nothing else should show a ConvoHop push, even an event type from a newer server.
        assertTrue(ConvoHopFirebase.handleMessage(push.app, fcm(Fixtures.push("{\"eventType\":\"notification.reaction\"}"))))
        assertTrue(ConvoHopFirebase.handleMessage(push.app, fcm(Fixtures.push("not json"))))
        assertTrue(push.notifications.allNotifications.isEmpty())
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun reportsNewTokens() {
        assertNull(push.manager.token)
        ConvoHopFirebase.onNewToken(push.app, "fcm-token")
        assertEquals("fcm-token", push.manager.token)
        assertEquals(listOf("token fcm-token"), push.events())
    }

    @Test
    fun theMessagingServiceRoutesMessagesAndTokens() {
        val service = Robolectric.buildService(RecordingMessagingService::class.java).create().get()
        val campaign = fcm(mapOf("campaign" to "spring"))
        service.onMessageReceived(campaign)
        service.onMessageReceived(fcm(Fixtures.push(callData(id(1), alert))))
        service.onNewToken("fcm-token")
        assertEquals(listOf(campaign), service.others)
        assertEquals(CallState.RINGING, push.manager.call(alert)?.state)
        assertEquals("fcm-token", push.manager.token)
        assertEquals(listOf("incoming $alert", "token fcm-token"), push.events())
    }

    /** A data message as FCM delivers it to `onMessageReceived`. */
    private fun fcm(data: Map<String, String>): RemoteMessage {
        val bundle = Bundle()
        bundle.putString("from", "1234567890")
        bundle.putString("google.message_id", "0:1791633600000000%31bd1c9631bd1c96")
        data.forEach { (key, value) -> bundle.putString(key, value) }
        return RemoteMessage(bundle)
    }
}

/** Records the messages [ConvoHopMessagingService] passes on. */
internal class RecordingMessagingService : ConvoHopMessagingService() {
    val others: MutableList<RemoteMessage> = mutableListOf()

    override fun onOtherMessage(message: RemoteMessage) {
        others += message
    }
}
