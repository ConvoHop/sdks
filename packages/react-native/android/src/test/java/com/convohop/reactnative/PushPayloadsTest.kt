package com.convohop.reactnative

import com.convohop.android.push.ConvoHopPush
import com.convohop.android.push.PushNotification
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PushPayloadsTest {
    @Test
    fun writesEachVectorsFcmEventBackExactly() {
        val types = HashSet<Class<*>>()
        for (vector in Vectors.vectors) {
            val data = Vectors.fcmData(vector) ?: continue
            val id = vector.getString("id")
            val notification = requireNotNull(ConvoHopPush.parseData(data)) { "$id doesn't parse" }
            assertEquals(id, data, PushPayloads.event(notification))
            types += notification.javaClass
        }
        assertEquals(
            setOf(PushNotification.Message::class.java, PushNotification.IncomingCall::class.java, PushNotification.CallCancelled::class.java),
            types,
        )
    }

    @Test
    fun escapesOnlyWhatJsonRequires() {
        val message = PushNotification.Message(
            eventId = Ids.EVENT,
            occurredAt = Ids.OCCURRED_AT,
            occurredAtMillis = Ids.OCCURRED_AT_MS,
            projectId = Ids.PROJECT,
            recipientId = Ids.RECIPIENT,
            conversationId = Ids.CONVERSATION,
            senderId = Ids.SENDER,
            title = "q\"b\\s/n\nr\rt\tb\bf\u000Cc\u0001\u001Fd\u007Fl\u2028e\uD83D\uDE00",
            body = "Zo\u00EB",
            messageId = Ids.MESSAGE,
        )
        // As JSON.stringify writes it: control characters as lowercase \u00XX, everything else as is.
        val expected = """{"eventId":"${Ids.EVENT}","eventType":"notification.message","occurredAt":"${Ids.OCCURRED_AT}",""" +
            """"projectId":"${Ids.PROJECT}","recipientId":"${Ids.RECIPIENT}","conversationId":"${Ids.CONVERSATION}",""" +
            """"senderId":"${Ids.SENDER}","messageId":"${Ids.MESSAGE}",""" +
            """"title":"q\"b\\s/n\nr\rt\tb\bf\fc\u0001\u001fd${"\u007F"}l${"\u2028"}e${"\uD83D\uDE00"}","body":"Zo${"\u00EB"}"}"""

        val event = PushPayloads.event(message)

        assertEquals(expected, event)
        assertEquals(message, ConvoHopPush.parseData(event))
    }

    @Test
    fun leavesOutMissingTitleAndBody() {
        val event = PushPayloads.event(ring(title = null, body = null))

        val json = JSONObject(event)
        assertEquals(
            listOf(
                "eventId", "eventType", "occurredAt", "projectId", "recipientId", "conversationId", "senderId",
                "liveSessionId", "alertId", "expiresAt", "mediaProfile",
            ).sorted(),
            json.keys().asSequence().toList().sorted(),
        )
        assertEquals("notification.call", json.getString("eventType"))
        assertEquals(ring(title = null, body = null), ConvoHopPush.parseData(event))
    }

    @Test
    fun wrapsTheEventAsFcmData() {
        val event = PushPayloads.event(ring())

        val data = JSONObject(PushPayloads.data(event))

        assertEquals(setOf(ConvoHopPush.DATA_KEY), data.keys().asSequence().toSet())
        assertEquals(event, data.getString(ConvoHopPush.DATA_KEY))
        assertEquals(ring(), ConvoHopPush.parse(mapOf(ConvoHopPush.DATA_KEY to data.getString(ConvoHopPush.DATA_KEY))))
    }

    @Test
    fun quotesStrings() {
        assertEquals("\"\"", PushPayloads.quote(""))
        assertEquals("\"a\\\"b\\\\c\\u0000\"", PushPayloads.quote("a\"b\\c\u0000"))
        val quoted = PushPayloads.quote("{\"convohop\":\"x\"}\n")
        assertEquals("{\"convohop\":\"x\"}\n", JSONObject("{\"v\":$quoted}").getString("v"))
        assertTrue(quoted.startsWith("\"") && quoted.endsWith("\""))
    }
}
