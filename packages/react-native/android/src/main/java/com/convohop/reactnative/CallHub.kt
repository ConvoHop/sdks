package com.convohop.reactnative

import com.convohop.android.push.AudioRoute
import com.convohop.android.push.CallEndReason
import com.convohop.android.push.CallInfo
import com.convohop.android.push.CallState
import com.convohop.android.push.ConvoHopNotificationListener
import com.convohop.android.push.ConvoHopNotifications
import com.convohop.android.push.PushNotification
import com.convohop.android.push.PushRegistration
import java.util.UUID
import java.util.concurrent.CopyOnWriteArraySet

/**
 * The push SDK's listener for the whole process. It keeps [overlay] current and forwards each event to the React
 * Native modules that are alive. It runs on the main thread, as the push SDK's listeners do.
 */
internal class CallHub(private val notifications: ConvoHopNotifications) : ConvoHopNotificationListener {
    val overlay = CallOverlay()
    private val sinks = CopyOnWriteArraySet<Sink>()

    /** A React Native module that wants the push SDK's events. */
    interface Sink {
        fun onRegistration(registration: PushRegistration) {}

        fun onUnregistration(registration: PushRegistration) {}

        fun onMessage(message: PushNotification.Message) {}

        /** [type] is the JavaScript `CallEventType`; [call] is a snapshot for JavaScript. */
        fun onCall(type: String, call: Map<String, Any>) {}
    }

    fun add(sink: Sink) {
        sinks.add(sink)
    }

    fun remove(sink: Sink) {
        sinks.remove(sink)
    }

    /** [call] as JavaScript sees it. */
    fun snapshot(call: CallInfo): Map<String, Any> = CallSnapshots.of(call, overlay.get(call.alertId))

    /** The calls the push SDK knows, as JavaScript sees them. It forgets what JavaScript reported about the others. */
    fun calls(): List<Map<String, Any>> {
        val calls = notifications.calls()
        overlay.retain(calls.mapTo(HashSet()) { it.alertId })
        return calls.map(::snapshot)
    }

    /** Reports a change JavaScript made to [call], such as muting it. */
    fun changed(call: CallInfo) = forward("changed", call)

    override fun onRegistered(registration: PushRegistration) {
        for (sink in sinks) sink.onRegistration(registration)
    }

    override fun onUnregistered(registration: PushRegistration) {
        for (sink in sinks) sink.onUnregistration(registration)
    }

    override fun onMessage(message: PushNotification.Message) {
        for (sink in sinks) sink.onMessage(message)
    }

    override fun onIncomingCall(call: CallInfo) {
        // The push SDK drops ended calls after a minute without an event; forget them here too.
        overlay.retain(notifications.calls().mapTo(HashSet()) { it.alertId })
        forward("incoming", call)
    }

    override fun onCallAnswered(call: CallInfo) = forward("answered", call)

    override fun onCallEnded(call: CallInfo, reason: CallEndReason, serverReason: String?) = forward("ended", call)

    override fun onCallHoldChanged(call: CallInfo, onHold: Boolean) = forward("changed", call)

    override fun onCallMuteChanged(call: CallInfo, muted: Boolean) {
        // The system's mute replaces the one JavaScript set.
        overlay.clearMuted(call.alertId)
        forward("changed", call)
    }

    override fun onCallAudioRouteChanged(call: CallInfo, route: AudioRoute, available: Set<AudioRoute>) = forward("changed", call)

    private fun forward(type: String, call: CallInfo) {
        if (sinks.isEmpty()) return
        val snapshot = snapshot(call)
        for (sink in sinks) sink.onCall(type, snapshot)
    }
}

/** What JavaScript reported about each call, on top of the push SDK's state. Keyed by alert ID. */
internal class CallOverlay {
    /** One call's values. A null value leaves the push SDK's. */
    data class Values(val connected: Boolean = false, val muted: Boolean? = null, val callerName: String? = null, val hasVideo: Boolean? = null)

    private val calls = HashMap<String, Values>()

    @Synchronized
    fun get(alertId: String): Values? = calls[alertId]

    @Synchronized
    fun edit(alertId: String, change: (Values) -> Values): Values = change(calls[alertId] ?: Values()).also { calls[alertId] = it }

    @Synchronized
    fun clearMuted(alertId: String) {
        calls[alertId]?.let { calls[alertId] = it.copy(muted = null) }
    }

    @Synchronized
    fun remove(alertId: String) {
        calls.remove(alertId)
    }

    @Synchronized
    fun retain(alertIds: Set<String>) {
        calls.keys.retainAll(alertIds)
    }
}

/** Call snapshots in the shape `@convohop/react-native` validates. */
internal object CallSnapshots {
    fun of(call: CallInfo, overlay: CallOverlay.Values?): Map<String, Any> = of(
        call.notification, call.state, call.endReason, call.serverReason, call.muted, call.audioRoute, call.availableAudioRoutes, overlay,
    )

    fun of(
        ring: PushNotification.IncomingCall,
        state: CallState,
        endReason: CallEndReason?,
        serverReason: String?,
        muted: Boolean,
        audioRoute: AudioRoute?,
        availableAudioRoutes: Set<AudioRoute>,
        overlay: CallOverlay.Values?,
    ): Map<String, Any> {
        val snapshot = LinkedHashMap<String, Any>()
        snapshot["id"] = ring.alertId
        snapshot["alertId"] = ring.alertId
        snapshot["liveSessionId"] = ring.liveSessionId
        snapshot["conversationId"] = ring.conversationId
        snapshot["outgoing"] = false
        snapshot["hasVideo"] = overlay?.hasVideo ?: ring.video
        if (Contract.isIdentifier(ring.mediaProfile)) snapshot["mediaProfile"] = ring.mediaProfile
        (overlay?.callerName ?: ring.title)?.let { snapshot["callerName"] = it }
        snapshot["expiresAtMs"] = ring.expiresAtMillis
        snapshot["state"] = Contract.state(state, overlay?.connected == true)
        if (state == CallState.ENDED) snapshot["endReason"] = Contract.endReason(endReason ?: CallEndReason.FAILED)
        snapshot["muted"] = overlay?.muted ?: muted
        serverReason?.takeIf(Contract::isIdentifier)?.let { snapshot["serverReason"] = it }
        audioRoute?.let { snapshot["audioRoute"] = Contract.route(it) }
        snapshot["availableAudioRoutes"] = availableAudioRoutes.map(Contract::route)
        return snapshot
    }
}

/**
 * This ring's cancellation for [reason] at [nowMillis], as the server would send it, with a new event ID. It keeps the
 * ring's title and body, so a missed-call notification names the caller.
 */
internal fun PushNotification.IncomingCall.cancelled(reason: String, nowMillis: Long): PushNotification.CallCancelled =
    PushNotification.CallCancelled(
        eventId = UUID.randomUUID().toString(),
        occurredAt = Contract.timestamp(nowMillis),
        occurredAtMillis = nowMillis,
        projectId = projectId,
        recipientId = recipientId,
        conversationId = conversationId,
        senderId = senderId,
        title = title,
        body = body,
        liveSessionId = liveSessionId,
        alertId = alertId,
        expiresAt = expiresAt,
        expiresAtMillis = expiresAtMillis,
        mediaProfile = mediaProfile,
        reason = reason,
    )
