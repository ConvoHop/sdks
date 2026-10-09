@file:OptIn(ExperimentalCoroutinesApi::class)

package com.convohop.android

import com.convohop.android.core.ConvoHopProblem
import com.convohop.android.core.MediaConnection
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope

internal val LIVE = SystemState(ended = false, muted = false, held = false)
internal val MUTED = SystemState(ended = false, muted = true, held = false)
internal val HELD = SystemState(ended = false, muted = false, held = true)
internal val OVER = SystemState(ended = true, muted = false, held = false)

/** A failure that a reconnect retries, as the transport reports one. */
internal fun transportFailure(): ConvoHopProblem =
    ConvoHopProblem("MEDIA_CONNECT_FAILED", "request-1", "unknown", 0, "Native connection failed")

/**
 * A participation, its media connections and the system call, recording
 * what the call does to them on the test's virtual clock.
 */
internal class CallRig(private val test: TestScope) {
    /** Media and system actions, in order. */
    val log = ArrayList<String>()

    /** What the call passed to `onError`. */
    val errors = ArrayList<Throwable>()

    /** Virtual times at which the call asked for a new connection. */
    val reconnects = ArrayList<Long>()

    /** How each reconnect turns out, in order; once empty, reconnects fail as transport failures. */
    val outcomes = ArrayDeque<suspend () -> CallMedia>()
    var connect: suspend () -> CallMedia = { media("m0") }
    val system = FakeSystem(log)
    var connects = 0
    private var dropped: (() -> Unit)? = null

    private val session = object : CallSession {
        override suspend fun connect(onDropped: () -> Unit): CallMedia {
            connects++
            dropped = onDropped
            return this@CallRig.connect()
        }

        override suspend fun leave() {
            log += "leave"
        }
    }

    fun media(name: String): FakeMedia = FakeMedia(name, this)

    /** An established connection dropped, as core reports it. */
    fun drop() {
        checkNotNull(dropped).invoke()
    }

    suspend fun reconnect(): CallMedia {
        reconnects += test.testScheduler.currentTime
        val next = outcomes.removeFirstOrNull() ?: throw transportFailure()
        return next()
    }

    suspend fun start(withSystem: Boolean = true, timeoutMillis: Long = 3_000): ConvoHopCall =
        ConvoHopCall.start(
            session,
            if (withSystem) system else null,
            timeoutMillis,
            onError = { errors += it },
            dispatcher = StandardTestDispatcher(test.testScheduler),
            now = { test.testScheduler.currentTime },
        )
}

internal class FakeMedia(private val name: String, private val rig: CallRig) : CallMedia {
    var microphoneFailure: Exception? = null
    var cameraFailure: Exception? = null
    var disconnected = false

    override val connection: MediaConnection? get() = null

    override suspend fun microphone(enabled: Boolean) {
        microphoneFailure?.let { throw it }
        rig.log += "$name microphone $enabled"
    }

    override suspend fun camera(enabled: Boolean) {
        cameraFailure?.let { throw it }
        rig.log += "$name camera $enabled"
    }

    override suspend fun reconnect(): CallMedia = rig.reconnect()

    override suspend fun disconnect() {
        disconnected = true
        rig.log += "$name disconnect"
    }
}

internal class FakeSystem(private val log: MutableList<String>) : SystemCall {
    override val alertId: String = "alert-1"
    var current: SystemState? = LIVE
    var observing = false
    private var listener: (() -> Unit)? = null

    override fun state(): SystemState? = current

    override fun observe(onChange: () -> Unit): AutoCloseable {
        listener = onChange
        observing = true
        return AutoCloseable {
            listener = null
            observing = false
        }
    }

    override fun end() {
        log += "end"
    }

    /** The system changed the call, as Telecom or the notification would. */
    fun change(state: SystemState?) {
        current = state
        listener?.invoke()
    }
}
