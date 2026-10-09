package com.convohop.android

import android.content.Context
import android.os.SystemClock
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.core.ConvoHopProblem
import com.convohop.android.core.ConvoHopProtocolException
import com.convohop.android.core.LiveParticipationHandle
import com.convohop.android.core.MediaConnection
import com.convohop.android.core.MediaOptions
import com.convohop.android.core.MediaRoomFactory
import com.convohop.android.push.CallEndReason
import com.convohop.android.push.CallInfo
import com.convohop.android.push.CallState
import com.convohop.android.push.ConvoHopNotificationListener
import com.convohop.android.push.ConvoHopNotifications
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/** Where a [ConvoHopCall] stands. */
public enum class CallPhase {
    CONNECTING,
    CONNECTED,

    /** Media dropped; the call is reconnecting with fresh credentials. */
    RECONNECTING,

    /** Hung up, ended by the system, or media could not reconnect. The live session was left. */
    ENDED,
}

/**
 * A call's media, kept in step with the system call that rang for it.
 *
 * [answer] answers an incoming call, joins its live session and connects
 * media through LiveKit; [join] connects a participation the app already
 * holds, such as a call it started. Connecting never starts capture: turn on
 * the [microphone] and [camera] once the user granted their permissions.
 * While the system mutes or holds the call they stay off, and come back
 * when it resumes. When media drops, the call reconnects with fresh
 * credentials, backing off between attempts and waiting at least as long as
 * the authority asks. When it can't reconnect within the timeout, or the
 * system ends the call, it leaves the live session. Errors it handles itself
 * still go to `onError`, for logging.
 */
public class ConvoHopCall internal constructor(
    private val session: CallSession,
    private val system: SystemCall?,
    private val reconnectTimeoutMillis: Long,
    dispatcher: CoroutineDispatcher,
    // Monotonic milliseconds.
    private val now: () -> Long,
    private val onError: (Throwable) -> Unit,
) {
    private val scope = CoroutineScope(SupervisorJob() + dispatcher + CoroutineExceptionHandler { _, error -> report(error) })
    private val mutex = Mutex()
    private val state = MutableStateFlow(CallPhase.CONNECTING)

    @Volatile
    private var subscription: AutoCloseable? = null

    @Volatile
    private var media: CallMedia? = null

    @Volatile
    private var ended = false

    // Connecting or reconnecting; a drop meanwhile sets droppedAgain.
    private var busy = true
    private var droppedAgain = false
    private var wantsMicrophone = false
    private var wantsCamera = false
    private var microphoneOn = false
    private var cameraOn = false
    private var muted = false
    private var held = false

    /** Where the call stands. */
    public val phase: StateFlow<CallPhase> = state.asStateFlow()

    /** The ring this call answered, or null for a call joined in the app. */
    public val alertId: String? get() = system?.alertId

    /**
     * The media connection, for rendering: its `room` is a [LiveKitMediaRoom]
     * unless you passed other rooms. A reconnect replaces it.
     */
    public val connection: MediaConnection? get() = media?.connection

    /**
     * Turns the microphone on or off. Needs `RECORD_AUDIO` and a participation
     * allowed to speak. It stays off while the system mutes or holds the call.
     */
    public suspend fun microphone(enabled: Boolean) {
        mutex.withLock {
            check(!ended) { "The call has ended" }
            val previous = wantsMicrophone
            wantsMicrophone = enabled
            try {
                applyMicrophone()
            } catch (error: Throwable) {
                wantsMicrophone = previous
                throw error
            }
        }
    }

    /** Turns the camera on or off. Needs `CAMERA` and a participation allowed to publish video. It stays off on hold. */
    public suspend fun camera(enabled: Boolean) {
        mutex.withLock {
            check(!ended) { "The call has ended" }
            val previous = wantsCamera
            wantsCamera = enabled
            try {
                applyCamera()
            } catch (error: Throwable) {
                wantsCamera = previous
                throw error
            }
        }
    }

    /** Leaves the live session and ends the system call. Repeated calls do nothing. */
    public suspend fun hangUp() {
        finish(endSystemCall = true)
    }

    internal suspend fun start() {
        val observed = system?.observe { scope.launch { sync() } }
        subscription = observed
        if (ended) observed?.close()
        try {
            // Reads the system's state first: a call it already ended never connects.
            sync()
            if (ended) return
            val connected = session.connect(::dropped)
            val again = mutex.withLock { if (ended) connected else settle(connected) } ?: return
            // Dropped before it settled: hand the call over while it reconnects.
            if (ended) discard(again) else scope.launch { reconnect(again) }
        } catch (error: Throwable) {
            // The system ended the call while it connected: that is an ending, not a failure.
            if (error !is CancellationException && ended) return
            withContext(NonCancellable) { finish(endSystemCall = true) }
            throw error
        }
    }

    private fun dropped() {
        scope.launch { recover() }
    }

    private suspend fun recover() {
        val previous = mutex.withLock {
            if (ended) return
            if (busy) {
                droppedAgain = true
                return
            }
            busy = true
            reconnecting()
            media
        } ?: return
        reconnect(previous)
    }

    private suspend fun reconnect(dropped: CallMedia) {
        var previous = dropped
        val since = now()
        var pause = FIRST_RETRY_MILLIS
        while (true) {
            var requested = 0L
            try {
                val next = previous.reconnect()
                previous = mutex.withLock {
                    if (ended) next else settle(next).also { if (it == null) applyReporting() }
                } ?: return
                if (ended) return discard(previous)
                // It dropped again before it was adopted, which counts as a failed attempt.
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (ended) return
                report(error)
                if (!retryable(error)) break
                requested = (error as? ConvoHopProblem)?.retryAfter?.let(TimeUnit.SECONDS::toMillis) ?: 0
            }
            val remaining = reconnectTimeoutMillis - (now() - since)
            // Gives up rather than resend before the authority's delay.
            if (remaining <= 0 || requested > remaining) break
            // The last attempt comes at the deadline.
            delay(maxOf(pause, requested).coerceAtMost(remaining))
            pause = (pause * 2).coerceAtMost(MAX_RETRY_MILLIS)
        }
        finish(endSystemCall = true)
    }

    // Holds mutex. Adopts a new connection; returns it again when it dropped before it was adopted.
    private fun settle(next: CallMedia): CallMedia? {
        media = next
        if (droppedAgain) {
            droppedAgain = false
            reconnecting()
            return next
        }
        busy = false
        state.value = CallPhase.CONNECTED
        return null
    }

    // Holds mutex. A new connection starts with nothing published.
    private fun reconnecting() {
        state.value = CallPhase.RECONNECTING
        microphoneOn = false
        cameraOn = false
    }

    private suspend fun sync() {
        val call = system ?: return
        val over = mutex.withLock {
            if (ended) return
            val current = call.state()
            if (current == null || current.ended) {
                true
            } else {
                muted = current.muted
                held = current.held
                applyReporting()
                false
            }
        }
        if (over) finish(endSystemCall = false)
    }

    // Holds mutex.
    private suspend fun applyMicrophone() {
        val current = media?.takeIf { state.value == CallPhase.CONNECTED } ?: return
        val on = wantsMicrophone && !muted && !held
        if (on != microphoneOn) {
            current.microphone(on)
            microphoneOn = on
        }
    }

    // Holds mutex.
    private suspend fun applyCamera() {
        val current = media?.takeIf { state.value == CallPhase.CONNECTED } ?: return
        val on = wantsCamera && !held
        if (on != cameraOn) {
            current.camera(on)
            cameraOn = on
        }
    }

    // Holds mutex. Applies each wish on its own; failures go to onError.
    private suspend fun applyReporting() {
        reporting { applyMicrophone() }
        reporting { applyCamera() }
    }

    private suspend fun finish(endSystemCall: Boolean) {
        mutex.withLock {
            if (ended) return
            ended = true
            state.value = CallPhase.ENDED
        }
        reporting { subscription?.close() }
        if (endSystemCall) reporting { system?.end() }
        withContext(NonCancellable) { reporting { session.leave() } }
        scope.cancel()
    }

    // Disconnects a connection that arrived after the call ended.
    private suspend fun discard(stray: CallMedia) {
        withContext(NonCancellable) { reporting { stray.disconnect() } }
    }

    private inline fun reporting(action: () -> Unit) {
        try {
            action()
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            report(error)
        }
    }

    private fun report(error: Throwable) {
        try {
            onError(error)
        } catch (_: Exception) {
            // A failing app callback must not break the call.
        }
    }

    public companion object {
        /** How long a dropped call keeps trying to reconnect before it ends: 30 seconds. */
        public const val DEFAULT_RECONNECT_TIMEOUT_MILLIS: Long = 30_000
        private const val FIRST_RETRY_MILLIS = 500L
        private const val MAX_RETRY_MILLIS = 5_000L

        /**
         * Answers [alertId] if it still rings, joins its live session as
         * [client]'s user and connects media. Call it from
         * [ConvoHopNotificationListener.onCallAnswered] or from your own answer
         * button. [rooms] defaults to LiveKit, which leaves audio routing to
         * Telecom when Telecom runs the call. Call it once per call. If it fails,
         * the system call ends.
         */
        public suspend fun answer(
            context: Context,
            client: ConvoHopClient,
            alertId: String,
            rooms: MediaRoomFactory? = null,
            reconnectTimeoutMillis: Long = DEFAULT_RECONNECT_TIMEOUT_MILLIS,
            onError: (Throwable) -> Unit = {},
        ): ConvoHopCall {
            checkTimeout(reconnectTimeoutMillis)
            val notifications = ConvoHopNotifications.getInstance(context)
            val system = NotificationsCall(notifications, alertId)
            try {
                val call = checkNotNull(notifications.call(alertId)) { "No call $alertId on this device" }
                require(call.projectId == client.projectId && call.recipientId == client.principalId) {
                    "The call is for another project or user"
                }
                if (call.state == CallState.RINGING) notifications.answer(alertId)
                val answered = notifications.call(alertId)?.takeIf { it.state == CallState.ACTIVE || it.state == CallState.HELD }
                    ?: throw IllegalStateException("The call has ended")
                val media = rooms ?: if (answered.telecom) LiveKitMediaRooms.forTelecom(context) else LiveKitMediaRooms(context)
                val live = client.liveSession(call.liveSessionId)
                if (live.conversationId != call.conversationId) throw ConvoHopProtocolException("The live session belongs to another conversation")
                return start(ParticipationSession(live.join(), media), system, reconnectTimeoutMillis, onError)
            } catch (error: Throwable) {
                system.end()
                throw error
            }
        }

        /**
         * Connects [participation]'s media for a call the app joined or started
         * itself, with no system call. The call owns [participation] from then
         * on: if media can't connect, it leaves and throws.
         */
        public suspend fun join(
            context: Context,
            participation: LiveParticipationHandle,
            rooms: MediaRoomFactory = LiveKitMediaRooms(context),
            reconnectTimeoutMillis: Long = DEFAULT_RECONNECT_TIMEOUT_MILLIS,
            onError: (Throwable) -> Unit = {},
        ): ConvoHopCall {
            checkTimeout(reconnectTimeoutMillis)
            return start(ParticipationSession(participation, rooms), null, reconnectTimeoutMillis, onError)
        }

        internal suspend fun start(
            session: CallSession,
            system: SystemCall?,
            reconnectTimeoutMillis: Long,
            onError: (Throwable) -> Unit,
            dispatcher: CoroutineDispatcher = Dispatchers.Default,
            now: () -> Long = SystemClock::elapsedRealtime,
        ): ConvoHopCall = ConvoHopCall(session, system, reconnectTimeoutMillis, dispatcher, now, onError).also { it.start() }

        // Before anything joins or answers, so a bad argument leaves nothing behind.
        private fun checkTimeout(reconnectTimeoutMillis: Long) {
            require(reconnectTimeoutMillis >= 0) { "reconnectTimeoutMillis must not be negative" }
        }
    }
}

// Rejections that a retry can't change: anything but an authority problem, or a 4xx with no retry delay.
private fun retryable(error: Exception): Boolean =
    error is ConvoHopProblem && !(error.outcome == "rejected" && error.retryAfter == null && error.status in 400..499)

/** What the call needs of a participation. */
internal interface CallSession {
    /** Connects media; [onDropped] runs when an established connection drops. */
    suspend fun connect(onDropped: () -> Unit): CallMedia

    suspend fun leave()
}

/** One media connection. */
internal interface CallMedia {
    val connection: MediaConnection?

    suspend fun microphone(enabled: Boolean)

    suspend fun camera(enabled: Boolean)

    /** A new connection with fresh credentials. */
    suspend fun reconnect(): CallMedia

    /** Leaves media for good. */
    suspend fun disconnect()
}

internal class SystemState(val ended: Boolean, val muted: Boolean, val held: Boolean)

/** The system call that rang. */
internal interface SystemCall {
    val alertId: String

    /** Null once the system forgot the call. */
    fun state(): SystemState?

    /** [onChange] runs when the call ends, holds or mutes; read [state] then. */
    fun observe(onChange: () -> Unit): AutoCloseable

    fun end()
}

internal class NotificationsCall(private val notifications: ConvoHopNotifications, override val alertId: String) : SystemCall {
    override fun state(): SystemState? = notifications.call(alertId)?.let {
        SystemState(ended = it.state == CallState.ENDED, muted = it.muted, held = it.state == CallState.HELD)
    }

    override fun observe(onChange: () -> Unit): AutoCloseable =
        notifications.addListener(
            object : ConvoHopNotificationListener {
                override fun onCallEnded(call: CallInfo, reason: CallEndReason, serverReason: String?) = changed(call)

                override fun onCallHoldChanged(call: CallInfo, onHold: Boolean) = changed(call)

                override fun onCallMuteChanged(call: CallInfo, muted: Boolean) = changed(call)

                private fun changed(call: CallInfo) {
                    if (call.alertId == alertId) onChange()
                }
            },
        )

    override fun end() {
        notifications.end(alertId)
    }
}

private class ParticipationSession(private val participation: LiveParticipationHandle, private val rooms: MediaRoomFactory) : CallSession {
    override suspend fun connect(onDropped: () -> Unit): CallMedia = ConnectionMedia(participation.connect(MediaOptions(rooms, onDropped)))

    override suspend fun leave() {
        participation.leave()
    }
}

private class ConnectionMedia(override val connection: MediaConnection) : CallMedia {
    override suspend fun microphone(enabled: Boolean) {
        connection.microphone(enabled)
    }

    override suspend fun camera(enabled: Boolean) {
        connection.camera(enabled)
    }

    override suspend fun reconnect(): CallMedia = ConnectionMedia(connection.reconnect())

    override suspend fun disconnect() {
        connection.disconnect()
    }
}
