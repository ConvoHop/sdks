package com.convohop.reactnative

import com.convohop.android.push.ConvoHopPush
import com.convohop.android.push.PushNotification

/**
 * Writes a parsed push back as the FCM data JavaScript parses: `{"convohop":"<event JSON>"}`. It writes only the
 * fields the push payload contract defines, with the push's original timestamps, and escapes only what JSON requires,
 * so the event is never longer than the push it came from.
 */
internal object PushPayloads {
    /** The `convohop` event of [notification] as JSON. */
    fun event(notification: PushNotification): String {
        val json = Json()
        json.field("eventId", notification.eventId)
        json.field("eventType", eventType(notification))
        json.field("occurredAt", notification.occurredAt)
        json.field("projectId", notification.projectId)
        json.field("recipientId", notification.recipientId)
        json.field("conversationId", notification.conversationId)
        json.field("senderId", notification.senderId)
        when (notification) {
            is PushNotification.Message -> json.field("messageId", notification.messageId)
            is PushNotification.IncomingCall -> {
                json.field("liveSessionId", notification.liveSessionId)
                json.field("alertId", notification.alertId)
                json.field("expiresAt", notification.expiresAt)
                json.field("mediaProfile", notification.mediaProfile)
            }
            is PushNotification.CallCancelled -> {
                json.field("liveSessionId", notification.liveSessionId)
                json.field("alertId", notification.alertId)
                json.field("expiresAt", notification.expiresAt)
                json.field("mediaProfile", notification.mediaProfile)
                json.field("reason", notification.reason)
            }
        }
        notification.title?.let { json.field("title", it) }
        notification.body?.let { json.field("body", it) }
        return json.close()
    }

    /** FCM data that carries [event]. */
    fun data(event: String): String = Json().apply { field(ConvoHopPush.DATA_KEY, event) }.close()

    /** [value] as a JSON string. */
    fun quote(value: String): String = StringBuilder(value.length + 2).also { quote(value, it) }.toString()

    private fun eventType(notification: PushNotification): String = when (notification) {
        is PushNotification.Message -> "notification.message"
        is PushNotification.IncomingCall -> "notification.call"
        is PushNotification.CallCancelled -> "notification.callCancelled"
    }

    private fun quote(value: String, out: StringBuilder) {
        out.append('"')
        for (c in value) {
            when {
                c == '"' -> out.append("\\\"")
                c == '\\' -> out.append("\\\\")
                c == '\n' -> out.append("\\n")
                c == '\r' -> out.append("\\r")
                c == '\t' -> out.append("\\t")
                c == '\b' -> out.append("\\b")
                c == '\u000C' -> out.append("\\f")
                c < ' ' -> out.append("\\u00").append(HEX[c.code shr 4]).append(HEX[c.code and 0xF])
                else -> out.append(c)
            }
        }
        out.append('"')
    }

    private class Json {
        private val out = StringBuilder(512).append('{')

        fun field(name: String, value: String) {
            if (out.length > 1) out.append(',')
            quote(name, out)
            out.append(':')
            quote(value, out)
        }

        fun close(): String = out.append('}').toString()
    }

    private const val HEX = "0123456789abcdef"
}
