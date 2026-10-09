package com.convohop.android.push

/** Parses ConvoHop push payloads. It holds no state and needs no credentials. */
public object ConvoHopPush {
    /** The FCM `message.data` key that carries the event. */
    public const val DATA_KEY: String = "convohop"

    /** FCM's data message limit; a valid entry is never longer. */
    private const val MAX_DATA_LENGTH = 4096
    private val UUID = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
    private const val NIL_UUID = "00000000-0000-0000-0000-000000000000"
    private val IDENTIFIER = Regex("^[A-Za-z][A-Za-z0-9_]{0,63}$")

    /** True when [data] is addressed to the ConvoHop SDK, whether or not it is valid. Route other pushes yourself. */
    @JvmStatic
    public fun isConvoHop(data: Map<String, String>): Boolean = data.containsKey(DATA_KEY)

    /**
     * The notification in an FCM data map, or null when the map has no valid
     * ConvoHop event. Fields the event's type doesn't define are ignored.
     */
    @JvmStatic
    public fun parse(data: Map<String, String>): PushNotification? = data[DATA_KEY]?.let(::parseData)

    /** The notification in a `convohop` JSON object, or null when it is not a valid event. */
    @JvmStatic
    public fun parseData(json: String): PushNotification? {
        if (json.length > MAX_DATA_LENGTH) return null
        val root = try {
            PushJson.parse(json)
        } catch (_: JsonSyntaxException) {
            return null
        }
        if (root !is Map<*, *>) return null
        return try {
            decode(root)
        } catch (_: InvalidPush) {
            null
        }
    }

    internal fun isId(value: String): Boolean = UUID.matches(value) && value != NIL_UUID

    private class InvalidPush : RuntimeException() {
        override fun fillInStackTrace(): Throwable = this
    }

    private fun invalid(): Nothing = throw InvalidPush()

    private fun Map<*, *>.string(name: String): String = get(name) as? String ?: invalid()

    private fun Map<*, *>.id(name: String): String = string(name).also { if (!isId(it)) invalid() }

    private fun Map<*, *>.identifier(name: String): String = string(name).also { if (!IDENTIFIER.matches(it)) invalid() }

    private fun Map<*, *>.time(name: String): Pair<String, Long> {
        val text = string(name)
        return text to (PushTime.parse(text) ?: invalid())
    }

    private fun Map<*, *>.text(name: String): String? {
        if (!containsKey(name)) return null
        val text = string(name)
        if (text.isEmpty() || hasLoneSurrogate(text)) invalid()
        return text
    }

    private fun hasLoneSurrogate(text: String): Boolean {
        var index = 0
        while (index < text.length) {
            val c = text[index]
            if (Character.isHighSurrogate(c) && index + 1 < text.length && Character.isLowSurrogate(text[index + 1])) {
                index += 2
                continue
            }
            if (Character.isSurrogate(c)) return true
            index++
        }
        return false
    }

    private fun decode(data: Map<*, *>): PushNotification? {
        val type = data.string("eventType")
        if (type != "notification.message" && type != "notification.call" && type != "notification.callCancelled") return null
        val eventId = data.id("eventId")
        val (occurredAt, occurredAtMillis) = data.time("occurredAt")
        val projectId = data.id("projectId")
        val recipientId = data.id("recipientId")
        val conversationId = data.id("conversationId")
        val senderId = data.id("senderId")
        val title = data.text("title")
        val body = data.text("body")
        if (type == "notification.message") {
            return PushNotification.Message(
                eventId, occurredAt, occurredAtMillis, projectId, recipientId, conversationId, senderId, title, body,
                data.id("messageId"),
            )
        }
        val liveSessionId = data.id("liveSessionId")
        val alertId = data.id("alertId")
        val (expiresAt, expiresAtMillis) = data.time("expiresAt")
        val mediaProfile = data.identifier("mediaProfile")
        if (type == "notification.call") {
            return PushNotification.IncomingCall(
                eventId, occurredAt, occurredAtMillis, projectId, recipientId, conversationId, senderId, title, body,
                liveSessionId, alertId, expiresAt, expiresAtMillis, mediaProfile,
            )
        }
        return PushNotification.CallCancelled(
            eventId, occurredAt, occurredAtMillis, projectId, recipientId, conversationId, senderId, title, body,
            liveSessionId, alertId, expiresAt, expiresAtMillis, mediaProfile, data.identifier("reason"),
        )
    }
}
