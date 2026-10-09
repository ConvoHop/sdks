package com.convohop.android.push

import com.convohop.android.push.Fixtures.id
import java.time.OffsetDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

internal class ConvoHopPushTest {
    @Test
    fun parsesEverySharedVector() {
        var parsed = 0
        for (vector in Vectors.vectors) {
            val data = Vectors.fcmData(vector) ?: continue
            val name = vector["id"] as String
            val notification = ConvoHopPush.parse(Fixtures.push(data))
            assertNotNull(name, notification)
            assertEquals(name, PushJson.parse(data), fields(notification!!))
            assertEquals(name, epoch(notification.occurredAt), notification.occurredAtMillis)
            when (notification) {
                is PushNotification.IncomingCall -> assertEquals(name, epoch(notification.expiresAt), notification.expiresAtMillis)
                is PushNotification.CallCancelled -> assertEquals(name, epoch(notification.expiresAt), notification.expiresAtMillis)
                is PushNotification.Message -> Unit
            }
            parsed++
        }
        // Four vectors are too stale to send.
        assertEquals(Vectors.vectors.size - 4, parsed)
    }

    @Test
    fun ignoresFieldsItDoesNotKnow() {
        var checked = 0
        for (vector in Vectors.vectors) {
            val unknown = vector["unknownFields"] as Map<*, *>? ?: continue
            val data = Vectors.fcmData(vector)!!
            val merged = LinkedHashMap<Any?, Any?>(PushJson.parse(data) as Map<*, *>)
            merged.putAll(unknown)
            val expected = ConvoHopPush.parseData(data)
            assertNotNull(expected)
            assertEquals(vector["id"] as String, expected, ConvoHopPush.parseData(PushJson.write(merged)))
            checked++
        }
        assertEquals(2, checked)
    }

    @Test
    fun rejectsTheSharedInvalidEvents() {
        // These break event-level rules for fields a push doesn't carry.
        val eventLevel = setOf(
            "subject-kind-mismatch", "subject-id-mismatch", "preview-null", "preview-empty", "preview-too-long",
            "preview-without-truncated", "connected-missing", "connected-string",
        )
        var checked = 0
        for (invalid in Vectors.invalidEvents) {
            val name = invalid["id"] as String
            if (name in eventLevel) continue
            val data = (invalid["event"] as Map<*, *>).filterKeys { it != "subjectRef" && it != "connected" && it != "preview" }
            assertNull(name, ConvoHopPush.parseData(PushJson.write(data)))
            checked++
        }
        assertEquals(11, checked)
    }

    @Test
    fun rejectsTextThatIsEmptyOrNotAString() {
        val good = PushJson.parse(Fixtures.messageData(id(1), title = "Ana", body = "Hi 👋")) as Map<*, *>
        assertEquals("Hi 👋", ConvoHopPush.parseData(PushJson.write(good))?.body)
        val bad = listOf<Any?>("", null, JsonNumber("1"), true, listOf("a"), mapOf("text" to "a"))
        for (field in listOf("title", "body")) {
            for (value in bad) {
                val data = LinkedHashMap<Any?, Any?>(good)
                data[field] = value
                assertNull("$field=$value", ConvoHopPush.parseData(PushJson.write(data)))
            }
        }
    }

    @Test
    fun rejectsLoneSurrogates() {
        val high = Char(0xD83D)
        val low = Char(0xDC4B)
        val good = PushJson.parse(Fixtures.messageData(id(1), title = "Ana", body = "x")) as Map<*, *>
        for (text in listOf("$high", "a$low", "$low$high", "ok$high")) {
            for (field in listOf("title", "body")) {
                val data = LinkedHashMap<Any?, Any?>(good)
                data[field] = text
                assertNull(field, ConvoHopPush.parseData(PushJson.write(data)))
            }
        }
        val raw = Fixtures.messageData(id(1), title = "Ana", body = "x")
        assertNull(ConvoHopPush.parseData(raw.replace("\"body\":\"x\"", "\"body\":\"\\ud83d\"")))
        assertNull(ConvoHopPush.parseData(raw.replace("\"body\":\"x\"", "\"body\":\"\\udc4b\\ud83d\"")))
        assertEquals("👋", ConvoHopPush.parseData(raw.replace("\"body\":\"x\"", "\"body\":\"\\ud83d\\udc4b\""))?.body)
    }

    @Test
    fun boundsTheDataEntryAtFcmsLimit() {
        val one = Fixtures.messageData(id(1), title = "T", body = "x")
        val fits = Fixtures.messageData(id(1), title = "T", body = "x".repeat(4096 - one.length + 1))
        assertEquals(4096, fits.length)
        assertNotNull(ConvoHopPush.parseData(fits))
        val over = Fixtures.messageData(id(1), title = "T", body = "x".repeat(4097 - one.length + 1))
        assertEquals(4097, over.length)
        assertNull(ConvoHopPush.parseData(over))
    }

    @Test
    fun rejectsMalformedData() {
        val malformed = listOf(
            "", "not json", "[]", "\"text\"", "null", "{}", "{\"eventType\":1}", "{\"eventType\":\"notification.message\"}",
            Fixtures.messageData(id(1)).replace("\"messageId\"", "\"otherId\""),
            Fixtures.messageData(id(1)).replace("{", "{\"eventId\":\"${id(2)}\","),
            Fixtures.callData(id(1), id(2)).replace("\"liveSessionId\"", "\"liveSession\""),
            Fixtures.callData(id(1), id(2), mediaProfile = "x".repeat(65)),
            Fixtures.callData(id(1), id(2), mediaProfile = "1080p"),
            Fixtures.cancelData(id(1), id(2), reason = "_answered"),
            Fixtures.messageData(id(1)).replace("\"${Fixtures.PROJECT}\"", "1"),
        )
        for (text in malformed) {
            assertNull(text, ConvoHopPush.parseData(text))
        }
    }

    @Test
    fun leavesOtherEventTypesAndPushesAlone() {
        val reaction = Fixtures.messageData(id(1)).replace("notification.message", "notification.reaction")
        assertNull(ConvoHopPush.parseData(reaction))
        assertTrue(ConvoHopPush.isConvoHop(mapOf(ConvoHopPush.DATA_KEY to "anything")))
        assertFalse(ConvoHopPush.isConvoHop(mapOf("other" to "1")))
        assertNull(ConvoHopPush.parse(mapOf("other" to Fixtures.messageData(id(1)))))
    }

    @Test
    fun parsesEachKind() {
        val message = ConvoHopPush.parse(Fixtures.push(Fixtures.messageData(id(1), title = "Ana", body = "Hello")))
        assertEquals(
            PushNotification.Message(
                id(1), Fixtures.time(Fixtures.NOW - 5_000), Fixtures.NOW - 5_000, Fixtures.PROJECT, Fixtures.RECIPIENT,
                Fixtures.CONVERSATION, Fixtures.SENDER, "Ana", "Hello", Fixtures.MESSAGE,
            ),
            message,
        )
        val call = Fixtures.call(id(2), id(3))
        assertEquals(Fixtures.LIVE_SESSION, call.liveSessionId)
        assertEquals(id(3), call.alertId)
        assertEquals(Fixtures.NOW + 30_000, call.expiresAtMillis)
        assertNull(call.title)
        val cancel = Fixtures.cancel(id(4), id(3), "declined")
        assertEquals("declined", cancel.reason)
        assertEquals(Fixtures.NOW + 30_000, cancel.expiresAtMillis)
    }

    @Test
    fun saysWhetherACallHasVideo() {
        assertTrue((ConvoHopPush.parseData(Fixtures.callData(id(1), id(2), mediaProfile = "AUDIO_VIDEO")) as PushNotification.IncomingCall).video)
        assertFalse((ConvoHopPush.parseData(Fixtures.callData(id(1), id(2), mediaProfile = "AUDIO_ONLY")) as PushNotification.IncomingCall).video)
        assertFalse((ConvoHopPush.parseData(Fixtures.callData(id(1), id(2), mediaProfile = "SCREEN_SHARE")) as PushNotification.IncomingCall).video)
    }

    @Test
    fun treatsOnlyEndedAndExpiredAsMissed() {
        val missed = mapOf("ended" to true, "expired" to true, "answered" to false, "declined" to false, "transferred" to false)
        for ((reason, expected) in missed) {
            assertEquals(reason, expected, Fixtures.cancel(id(1), id(2), reason).missed)
        }
    }

    private fun epoch(text: String): Long = OffsetDateTime.parse(text).toInstant().toEpochMilli()

    /** The wire fields of [notification]. */
    private fun fields(notification: PushNotification): Map<String, String> {
        val out = linkedMapOf(
            "eventId" to notification.eventId,
            "eventType" to when (notification) {
                is PushNotification.Message -> "notification.message"
                is PushNotification.IncomingCall -> "notification.call"
                is PushNotification.CallCancelled -> "notification.callCancelled"
            },
            "occurredAt" to notification.occurredAt,
            "projectId" to notification.projectId,
            "recipientId" to notification.recipientId,
            "conversationId" to notification.conversationId,
            "senderId" to notification.senderId,
        )
        notification.title?.let { out["title"] = it }
        notification.body?.let { out["body"] = it }
        when (notification) {
            is PushNotification.Message -> out["messageId"] = notification.messageId
            is PushNotification.IncomingCall -> {
                out["liveSessionId"] = notification.liveSessionId
                out["alertId"] = notification.alertId
                out["expiresAt"] = notification.expiresAt
                out["mediaProfile"] = notification.mediaProfile
            }
            is PushNotification.CallCancelled -> {
                out["liveSessionId"] = notification.liveSessionId
                out["alertId"] = notification.alertId
                out["expiresAt"] = notification.expiresAt
                out["mediaProfile"] = notification.mediaProfile
                out["reason"] = notification.reason
            }
        }
        return out
    }
}
