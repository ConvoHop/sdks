package com.convohop.android.push

import java.io.File
import java.time.Instant

/** Push payloads at a fixed clock, and the shared vectors in `spec/push-payload`. */
internal object Fixtures {
    /** The vectors' clock, 2026-10-10T12:00:00Z. */
    const val NOW: Long = 1_791_633_600_000L
    const val PROJECT: String = "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d"
    const val RECIPIENT: String = "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c"
    const val CONVERSATION: String = "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c"
    const val SENDER: String = "c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a"
    const val LIVE_SESSION: String = "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8b"
    const val MESSAGE: String = "d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d"

    /** An FCM registration token and a Firebase Installation ID, shaped like Firebase's. */
    const val TOKEN: String = "eX4mPl3T0k3n:APA91bE7wQ9zR2sV5yB8nM1kL4jH6gF3dS0aP-oI9uY7tR5eW3qZ1xC"
    const val FID: String = "fT2kq0uLRn6m0Xb8YzA1cD"

    /** A distinct valid UUID for each [n]. */
    fun id(n: Int): String = "00000000-0000-4000-8000-" + n.toString().padStart(12, '0')

    fun time(millis: Long): String = Instant.ofEpochMilli(millis).toString()

    fun push(data: String): Map<String, String> = mapOf(ConvoHopPush.DATA_KEY to data)

    fun messageData(
        eventId: String,
        title: String? = null,
        body: String? = null,
        recipientId: String = RECIPIENT,
        messageId: String = MESSAGE,
    ): String {
        val data = base(eventId, "notification.message", NOW - 5_000, recipientId, title, body)
        data["messageId"] = messageId
        return PushJson.write(data)
    }

    fun callData(
        eventId: String,
        alertId: String,
        expiresAt: Long = NOW + 30_000,
        mediaProfile: String = "AUDIO_VIDEO",
        title: String? = null,
        body: String? = null,
    ): String {
        val data = base(eventId, "notification.call", NOW - 1_000, RECIPIENT, title, body)
        data.putAll(callFields(alertId, expiresAt, mediaProfile))
        return PushJson.write(data)
    }

    fun cancelData(eventId: String, alertId: String, reason: String, expiresAt: Long = NOW + 30_000): String {
        val data = base(eventId, "notification.callCancelled", NOW, RECIPIENT, null, null)
        data.putAll(callFields(alertId, expiresAt, "AUDIO_VIDEO"))
        data["reason"] = reason
        return PushJson.write(data)
    }

    fun message(eventId: String, title: String? = null, body: String? = null): PushNotification.Message =
        ConvoHopPush.parseData(messageData(eventId, title, body)) as PushNotification.Message

    fun call(eventId: String, alertId: String, expiresAt: Long = NOW + 30_000): PushNotification.IncomingCall =
        ConvoHopPush.parseData(callData(eventId, alertId, expiresAt)) as PushNotification.IncomingCall

    fun cancel(eventId: String, alertId: String, reason: String, expiresAt: Long = NOW + 30_000): PushNotification.CallCancelled =
        ConvoHopPush.parseData(cancelData(eventId, alertId, reason, expiresAt)) as PushNotification.CallCancelled

    private fun base(
        eventId: String,
        type: String,
        occurredAt: Long,
        recipientId: String,
        title: String?,
        body: String?,
    ): LinkedHashMap<String, Any?> {
        val data = linkedMapOf<String, Any?>(
            "eventId" to eventId,
            "eventType" to type,
            "occurredAt" to time(occurredAt),
            "projectId" to PROJECT,
            "recipientId" to recipientId,
            "conversationId" to CONVERSATION,
            "senderId" to SENDER,
        )
        if (title != null) data["title"] = title
        if (body != null) data["body"] = body
        return data
    }

    private fun callFields(alertId: String, expiresAt: Long, mediaProfile: String): Map<String, Any?> = linkedMapOf(
        "liveSessionId" to LIVE_SESSION,
        "alertId" to alertId,
        "expiresAt" to time(expiresAt),
        "mediaProfile" to mediaProfile,
    )
}

/** `spec/push-payload/vectors.json`, shared with every SDK. */
internal object Vectors {
    private val document: Map<*, *> by lazy {
        val root = System.getProperty("convohop.repoRoot") ?: error("Run the tests through Gradle, which sets convohop.repoRoot")
        PushJson.parse(File(root, "spec/push-payload/vectors.json").readText()) as Map<*, *>
    }

    val vectors: List<Map<*, *>> get() = (document["vectors"] as List<*>).map { it as Map<*, *> }

    val invalidEvents: List<Map<*, *>> get() = (document["invalidEvents"] as List<*>).map { it as Map<*, *> }

    /** The FCM request's `data.convohop` entry, or null when the builder sends nothing. */
    fun fcmData(vector: Map<*, *>): String? {
        val fcm = (vector["expected"] as Map<*, *>)["fcm"] as Map<*, *>? ?: return null
        val message = (fcm["request"] as Map<*, *>)["message"] as Map<*, *>
        return (message["data"] as Map<*, *>)[ConvoHopPush.DATA_KEY] as String
    }
}
