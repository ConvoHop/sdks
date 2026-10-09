package com.convohop.android.push

/**
 * A ConvoHop notification event delivered by your push provider, parsed
 * from the `convohop` data entry described in `spec/push-payload`.
 *
 * Events carry identifiers only. [title] and [body] are the visible text
 * your backend chose; [body] is the start of the message only when the
 * project opted in to message previews. Without them, show your own
 * generic text or fetch the content with the user's session.
 */
public sealed class PushNotification {
    /** Deduplicate on this: retries and replays of an event keep it. */
    public abstract val eventId: String
    public abstract val occurredAt: String
    public abstract val occurredAtMillis: Long
    public abstract val projectId: String
    public abstract val recipientId: String
    public abstract val conversationId: String
    public abstract val senderId: String
    public abstract val title: String?
    public abstract val body: String?

    /** A new message for the recipient. */
    public data class Message(
        override val eventId: String,
        override val occurredAt: String,
        override val occurredAtMillis: Long,
        override val projectId: String,
        override val recipientId: String,
        override val conversationId: String,
        override val senderId: String,
        override val title: String?,
        override val body: String?,
        val messageId: String,
    ) : PushNotification()

    /** One ring of a call for the recipient. It stops at [expiresAt] or when a cancellation with its [alertId] arrives. */
    public data class IncomingCall(
        override val eventId: String,
        override val occurredAt: String,
        override val occurredAtMillis: Long,
        override val projectId: String,
        override val recipientId: String,
        override val conversationId: String,
        override val senderId: String,
        override val title: String?,
        override val body: String?,
        val liveSessionId: String,
        val alertId: String,
        val expiresAt: String,
        val expiresAtMillis: Long,
        /** `AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile. */
        val mediaProfile: String,
    ) : PushNotification() {
        public val video: Boolean get() = mediaProfile == "AUDIO_VIDEO"
    }

    /** A ring that stopped for the recipient. It can arrive before its [IncomingCall]. */
    public data class CallCancelled(
        override val eventId: String,
        override val occurredAt: String,
        override val occurredAtMillis: Long,
        override val projectId: String,
        override val recipientId: String,
        override val conversationId: String,
        override val senderId: String,
        override val title: String?,
        override val body: String?,
        val liveSessionId: String,
        val alertId: String,
        /** The stopped ring's original deadline. */
        val expiresAt: String,
        val expiresAtMillis: Long,
        val mediaProfile: String,
        /** `answered`, `declined`, `ended`, `expired` or a later reason. */
        val reason: String,
    ) : PushNotification() {
        /** True for `ended` and `expired`: nobody answered. Other reasons only stop the ringing. */
        public val missed: Boolean get() = reason == "ended" || reason == "expired"
    }
}
