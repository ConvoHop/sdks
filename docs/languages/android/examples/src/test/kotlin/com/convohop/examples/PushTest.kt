package com.convohop.examples

import android.app.Application
import android.app.Notification
import android.app.NotificationManager
import android.content.Intent
import android.os.Bundle
import android.os.Looper
import android.service.notification.StatusBarNotification
import com.convohop.android.ConvoHopCall
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.push.CallEndReason
import com.convohop.android.push.CallState
import com.convohop.android.push.ConvoHopNotifications
import com.google.firebase.messaging.RemoteMessage
import java.io.File
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.json.put
import org.junit.After
import org.junit.AfterClass
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

/** Runs the push quickstart's snippets and the incoming-call screen with the shared push vectors, delivered as FCM would. */
@RunWith(RobolectricTestRunner::class)
class PushTest {
    private val app: Application = RuntimeEnvironment.getApplication()
    private val manager: NotificationManager = checkNotNull(app.getSystemService(NotificationManager::class.java))
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val opened = ArrayList<AutoCloseable>()
    private val registrations = ArrayList<String>()

    // The vectors address their pushes to RECIPIENT.
    @Volatile private var user: String? = RECIPIENT

    @Volatile private var client: ConvoHopClient? = null

    private lateinit var notifications: ConvoHopNotifications

    @Before
    fun setUp() {
        notifications = configureNotifications(app, { user }, { client }, { registrations += it })
    }

    @After
    fun tearDown() {
        scope.cancel()
        opened.asReversed().forEach(AutoCloseable::close)
    }

    @Test
    fun reportsTheRegistrationToYourBackend() {
        val service = Robolectric.buildService(AppMessagingService::class.java).create().get()
        service.onNewToken("fcm-token")
        idle()
        val expected = buildJsonObject {
            put("kind", "fcm")
            put("token", "fcm-token")
        }
        assertEquals(listOf(expected), registrations.map { Json.parseToJsonElement(it) })
    }

    @Test
    fun readsTheMessageWhenPreviewsAreOff() = runBlocking {
        // Previews are off by default, so the push carries the sender's name but not the text.
        val ada = mock.signIn("ada")
        val grace = mock.signIn("grace")
        val conversationId = mock.createConversation(ada, grace)
        val adaClient = connectUser(app, ada).also(opened::add)
        val messageId = sendMessage(adaClient, conversationId, "Are we still on for 3pm?", UUID.randomUUID().toString())
        user = grace.principalId
        client = connectUser(app, grace).also(opened::add)
        val push = vector(
            "message-preview-disabled",
            "projectId" to mock.projectId,
            "recipientId" to grace.principalId,
            "conversationId" to conversationId,
            "senderId" to ada.principalId,
            "messageId" to messageId,
        )

        assertTrue(offMainThread { handlePushData(app, push) })
        val shown = checkNotNull(notification(conversationId))
        assertEquals("Ada Lovelace", shown.title)
        assertEquals("Are we still on for 3pm?", shown.text)
    }

    @Test
    fun showsThePreviewWhenTheProjectOptsIn() {
        assertTrue(handlePushData(app, vector("message-preview")))
        val shown = checkNotNull(notification(CONVERSATION))
        assertEquals("Ada Lovelace", shown.title)
        assertEquals("Are we still on for 3pm?", shown.text)
    }

    @Test
    fun showsAGenericNotificationWhenNoOneIsConnected() {
        client = null
        assertTrue(offMainThread { handlePushData(app, vector("message-metadata-only")) })
        val shown = checkNotNull(notification(CONVERSATION))
        assertEquals(app.applicationInfo.loadLabel(app.packageManager).toString(), shown.title)
        assertEquals("New message", shown.text)
    }

    @Test
    fun dropsPushesForSomeoneElse() {
        user = UUID.randomUUID().toString() // Another user signed in on this device since.
        assertTrue(handlePushData(app, vector("message-preview")))
        assertEquals(emptyList<StatusBarNotification>(), manager.activeNotifications.toList())
    }

    @Test
    fun ringsWithTheCallScreenUntilAnsweredElsewhere() {
        val screen = ring()
        assertEquals("Grace Hopper", screen.title.toString())

        assertTrue(handlePushData(app, vector("cancel-answered")))
        idle()
        assertTrue(screen.isFinishing)
        assertNull(notification(ALERT))
        assertEquals(CallEndReason.ANSWERED_ELSEWHERE, notifications.call(ALERT)?.endReason)
    }

    @Test
    fun showsAMissedCall() {
        val screen = ring()
        assertTrue(handlePushData(app, vector("cancel-expired")))
        idle()
        assertTrue(screen.isFinishing)
        assertEquals(Notification.CATEGORY_MISSED_CALL, notification(ALERT)?.notification?.category)
        assertEquals(CallEndReason.MISSED, notifications.call(ALERT)?.endReason)
    }

    @Test
    fun answersFromTheCallScreen() {
        val joined = ArrayList<ConvoHopCall>()
        answerCalls(app, scope, client = { null }) { joined += it } // No one is connected, so the call ends.
        val screen = ring()

        screen.onAnswer()
        assertTrue(screen.isFinishing)
        assertNull(notification(ALERT))
        idle()
        val call = checkNotNull(notifications.call(ALERT))
        assertEquals(CallState.ENDED, call.state)
        assertEquals(CallEndReason.HUNG_UP, call.endReason)
        assertEquals(emptyList<ConvoHopCall>(), joined)
    }

    @Test
    fun declinesFromTheCallScreen() {
        val screen = ring()
        screen.onDecline()
        assertTrue(screen.isFinishing)
        assertNull(notification(ALERT))
        assertEquals(CallEndReason.REJECTED, notifications.call(ALERT)?.endReason)
    }

    @Test
    fun closesTheCallScreenWhenTheRingAlreadyStopped() {
        val intent = ringIntent()
        assertTrue(handlePushData(app, vector("cancel-answered"))) // Before the screen opens.
        idle()
        assertEquals(CallState.ENDED, notifications.call(ALERT)?.state)

        val screen = Robolectric.buildActivity(CallActivity::class.java, intent).setup().get()
        assertTrue(screen.isFinishing)
    }

    @Test
    fun yourServiceForwardsOnlyConvoHopPushes() {
        val service = Robolectric.buildService(RecordingService::class.java).create().get()
        service.onMessageReceived(remoteMessage(vector("message-preview")))
        assertEquals("Ada Lovelace", notification(CONVERSATION)?.title)
        assertEquals(emptyList<RemoteMessage>(), service.others)

        val promotion = remoteMessage(mapOf("campaign" to "spring"))
        service.onMessageReceived(promotion)
        assertEquals(listOf(promotion), service.others)
        assertFalse(handlePushData(app, mapOf("campaign" to "spring")))
    }

    /** Rings with the call-incoming vector and opens the screen its full-screen intent starts. */
    private fun ring(): CallActivity = Robolectric.buildActivity(CallActivity::class.java, ringIntent()).setup().get()

    /** Rings with the call-incoming vector and returns the intent of its full-screen notification. */
    private fun ringIntent(): Intent {
        assertTrue(handlePushData(app, vector("call-incoming")))
        val intent: Intent = shadowOf(checkNotNull(notification(ALERT)?.notification?.fullScreenIntent)).savedIntent
        assertEquals(CallActivity::class.java.name, intent.component?.className)
        assertEquals(ALERT, intent.getStringExtra(ConvoHopNotifications.EXTRA_ALERT_ID))
        return intent
    }

    private fun notification(tag: String): StatusBarNotification? = manager.activeNotifications.singleOrNull { it.tag == tag }

    private val StatusBarNotification.title: String? get() = notification.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()

    private val StatusBarNotification.text: String? get() = notification.extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()

    /** Runs listeners, which the SDK calls on the main thread. */
    private fun idle() = shadowOf(Looper.getMainLooper()).idle()

    /** FCM delivers pushes on a worker thread, where the SDK can read a message's text. */
    private fun <T> offMainThread(work: () -> T): T {
        var result: Result<T>? = null
        val worker = Thread { result = runCatching(work) }
        worker.start()
        worker.join(15_000)
        return checkNotNull(result) { "The push wasn't handled in time" }.getOrThrow()
    }

    /** Your messaging service, recording your app's own pushes. */
    class RecordingService : AppMessagingService() {
        val others = ArrayList<RemoteMessage>()

        override fun onOtherMessage(message: RemoteMessage) {
            others += message
        }
    }

    companion object {
        // The addresses the push vectors use.
        private const val RECIPIENT = "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c"
        private const val CONVERSATION = "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c"
        private const val ALERT = "f0e1d2c3-b4a5-4968-8776-655443322110"

        private lateinit var mock: Mock

        private val vectors: List<JsonObject> by lazy {
            Json.parseToJsonElement(File(repoRoot, "spec/push-payload/vectors.json").readText())
                .jsonObject.getValue("vectors").jsonArray.map { it.jsonObject }
        }

        /**
         * The FCM data of a vector in `spec/push-payload/vectors.json`, as your backend sends it, with its times moved
         * from the vector's clock to now and [changes] made to its ConvoHop JSON.
         */
        private fun vector(id: String, vararg changes: Pair<String, String>): Map<String, String> {
            val vector = vectors.single { it.getValue("id").jsonPrimitive.content == id }
            val data = listOf("expected", "fcm", "request", "message", "data")
                .fold(vector) { node, key -> node.getValue(key).jsonObject }
                .mapValues { it.value.jsonPrimitive.content }
            val push = Json.parseToJsonElement(data.getValue("convohop")).jsonObject.toMutableMap()
            val shift = System.currentTimeMillis() / 1000 * 1000 - vector.getValue("nowSeconds").jsonPrimitive.long * 1000
            for (key in listOf("occurredAt", "expiresAt")) {
                val time = push[key] ?: continue
                push[key] = JsonPrimitive(Instant.parse(time.jsonPrimitive.content).plusMillis(shift).toString())
            }
            for ((key, value) in changes) push[key] = JsonPrimitive(value)
            return data + ("convohop" to JsonObject(push).toString())
        }

        /** A data message, as FCM hands it to your messaging service. */
        private fun remoteMessage(data: Map<String, String>): RemoteMessage {
            val bundle = Bundle()
            bundle.putString("from", "1234567890")
            bundle.putString("google.message_id", "0:1791633600000000%31bd1c9631bd1c96")
            for ((key, value) in data) bundle.putString(key, value)
            return RemoteMessage(bundle)
        }

        @BeforeClass
        @JvmStatic
        fun startMock() {
            mock = Mock.start()
        }

        @AfterClass
        @JvmStatic
        fun stopMock() {
            mock.close()
        }
    }
}
