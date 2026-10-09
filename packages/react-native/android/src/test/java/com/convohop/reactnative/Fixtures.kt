package com.convohop.reactnative

import com.convohop.android.push.ConvoHopPush
import com.convohop.android.push.PushNotification
import java.io.File
import org.json.JSONObject

internal object Ids {
    const val PROJECT = "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d"
    const val RECIPIENT = "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c"
    const val OTHER_RECIPIENT = "0d9f8e7a-6b5c-4e8b-a6c5-b7e2c9d43a1f"
    const val CONVERSATION = "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c"
    const val SENDER = "c4a1d2e3-f4a5-4b6c-8d7e-9f0a1b2c3d4e"
    const val MESSAGE = "d9b3f7e5-2c8a-4d1f-9e6b-3a5c7d9e1f2b"
    const val EVENT = "cccbe606-6dbd-41bb-ad43-c30e0b6b89ad"
    const val LIVE_SESSION = "3a5c7d9e-1f2b-4d1f-9e6b-d9b3f7e52c8a"
    const val ALERT = "9e6b3a5c-7d9e-4f2b-8c8a-d9b3f7e51f2b"

    const val OCCURRED_AT = "2026-10-10T11:59:55Z"
    const val OCCURRED_AT_MS = 1_791_633_595_000L
    const val EXPIRES_AT = "2026-10-10T12:00:40Z"
    const val EXPIRES_AT_MS = 1_791_633_640_000L
}

internal fun ring(mediaProfile: String = "AUDIO_VIDEO", title: String? = "Ada", body: String? = "Incoming call") =
    PushNotification.IncomingCall(
        eventId = Ids.EVENT,
        occurredAt = Ids.OCCURRED_AT,
        occurredAtMillis = Ids.OCCURRED_AT_MS,
        projectId = Ids.PROJECT,
        recipientId = Ids.RECIPIENT,
        conversationId = Ids.CONVERSATION,
        senderId = Ids.SENDER,
        title = title,
        body = body,
        liveSessionId = Ids.LIVE_SESSION,
        alertId = Ids.ALERT,
        expiresAt = Ids.EXPIRES_AT,
        expiresAtMillis = Ids.EXPIRES_AT_MS,
        mediaProfile = mediaProfile,
    )

/** `spec/push-payload/vectors.json`, which every SDK shares. */
internal object Vectors {
    private val document: JSONObject by lazy {
        val root = System.getProperty("convohop.repoRoot") ?: error("Run the tests through Gradle, which sets convohop.repoRoot")
        JSONObject(File(root, "spec/push-payload/vectors.json").readText())
    }

    val vectors: List<JSONObject>
        get() = document.getJSONArray("vectors").let { array -> List(array.length()) { array.getJSONObject(it) } }

    /** The FCM request's `data.convohop` entry, or null when the server sends no FCM push. */
    fun fcmData(vector: JSONObject): String? {
        val fcm = vector.getJSONObject("expected").optJSONObject("fcm") ?: return null
        return fcm.getJSONObject("request").getJSONObject("message").getJSONObject("data").getString(ConvoHopPush.DATA_KEY)
    }
}
