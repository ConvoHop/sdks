package com.convohop.android.push

/** What [ConvoHopNotifications.handleNotification] did with a push. */
public enum class PushResult {
    /** The push has no `convohop` entry: handle it yourself. */
    NOT_CONVOHOP,

    /** The `convohop` entry is not a valid event this SDK version knows. */
    INVALID,

    /** A duplicate, a ring that already stopped, or a recipient your filter rejected. */
    IGNORED,

    /** A new message. */
    MESSAGE,

    /** A call is ringing. */
    RINGING,

    /** A ring stopped without a missed call: it was answered or declined, maybe on another device. */
    STOPPED,

    /** A ring stopped and nobody answered. */
    MISSED,
}

/** The state of a call on this device. */
public enum class CallState {
    RINGING,

    /** Answered and in progress. */
    ACTIVE,
    HELD,

    /** It ended; [CallInfo.endReason] says why. Ended calls stay in [ConvoHopNotifications.calls] for 60 seconds. */
    ENDED,
}

/** Why a call this device knew about ended. */
public enum class CallEndReason {
    /** The user declined it on this device. */
    REJECTED,

    /** It ended on this device: [ConvoHopNotifications.end], or the system, such as a headset button. */
    HUNG_UP,

    /** The server reported that nobody answered (`ended` or `expired`). */
    MISSED,

    /** The recipient answered on another device. */
    ANSWERED_ELSEWHERE,

    /** The recipient declined on another device. */
    DECLINED_ELSEWHERE,

    /** The server stopped the ring for a reason this SDK version doesn't know. */
    STOPPED,

    /** The ring reached its `expiresAt` on this device. */
    EXPIRED,

    /** The system refused or aborted the call. */
    FAILED,
}

/** Where call audio plays. */
public enum class AudioRoute { EARPIECE, SPEAKER, BLUETOOTH, WIRED_HEADSET, STREAMING, UNKNOWN }

/** A snapshot of a call on this device. */
public class CallInfo internal constructor(
    /** The ring that started it. */
    public val notification: PushNotification.IncomingCall,
    public val state: CallState,
    /** Why it ended, once [state] is [CallState.ENDED]. */
    public val endReason: CallEndReason?,
    /** The `reason` of the server's cancellation, when the server stopped the ring. */
    public val serverReason: String?,
    /** Whether the system muted the call. */
    public val muted: Boolean,
    /** Where the system plays the call's audio, once it reported a route. */
    public val audioRoute: AudioRoute?,
    /** The routes [ConvoHopNotifications.setAudioRoute] accepts. */
    public val availableAudioRoutes: Set<AudioRoute>,
) {
    public val alertId: String get() = notification.alertId
    public val liveSessionId: String get() = notification.liveSessionId
    public val conversationId: String get() = notification.conversationId
    public val projectId: String get() = notification.projectId
    public val recipientId: String get() = notification.recipientId
    public val senderId: String get() = notification.senderId
    public val mediaProfile: String get() = notification.mediaProfile
    public val video: Boolean get() = notification.video
    public val title: String? get() = notification.title
    public val body: String? get() = notification.body
    public val expiresAtMillis: Long get() = notification.expiresAtMillis

    override fun toString(): String = "CallInfo(alertId=$alertId, liveSessionId=$liveSessionId, state=$state, endReason=$endReason)"
}

/**
 * Events from [ConvoHopNotifications], on the main thread. Every method has
 * an empty default. A listener added late misses earlier events: read
 * [ConvoHopNotifications.calls] and [ConvoHopNotifications.token] when you add it.
 */
public interface ConvoHopNotificationListener {
    /** A new FCM registration token: send it to your backend. ConvoHop never stores device tokens. */
    public fun onToken(token: String) {}

    /** A new message arrived, after its notification was posted (if [ConvoHopNotificationOptions.showMessages]). */
    public fun onMessage(message: PushNotification.Message) {}

    /** A call started ringing on this device. */
    public fun onIncomingCall(call: CallInfo) {}

    /** The user answered: join the live session and connect its media. */
    public fun onCallAnswered(call: CallInfo) {}

    /** A call ended or stopped ringing, once per call. [serverReason] is the cancellation's `reason`, if the server stopped it. */
    public fun onCallEnded(call: CallInfo, reason: CallEndReason, serverReason: String?) {}

    /** The system put the call on hold or resumed it. */
    public fun onCallHoldChanged(call: CallInfo, onHold: Boolean) {}

    /** The system muted or unmuted the call, for example from a car or headset: mute your microphone track. */
    public fun onCallMuteChanged(call: CallInfo, muted: Boolean) {}

    /** The call's audio moved to [route]. [available] are the routes [ConvoHopNotifications.setAudioRoute] accepts. */
    public fun onCallAudioRouteChanged(call: CallInfo, route: AudioRoute, available: Set<AudioRoute>) {}
}
