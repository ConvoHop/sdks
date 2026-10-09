package com.convohop.android

import android.content.Context
import com.convohop.android.core.MediaRoom
import com.convohop.android.core.MediaRoomEvents
import com.convohop.android.core.MediaRoomFactory
import io.livekit.android.AudioOptions
import io.livekit.android.ConnectOptions
import io.livekit.android.LiveKit
import io.livekit.android.LiveKitOverrides
import io.livekit.android.RoomOptions
import io.livekit.android.audio.NoAudioHandler
import io.livekit.android.events.RoomEvent
import io.livekit.android.room.Room
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicInteger

/**
 * Creates official LiveKit rooms for [com.convohop.android.core.MediaOptions].
 * Every connection attempt gets a new room, released when the connection
 * closes. Rooms join without capturing: enable the microphone or camera on
 * the [com.convohop.android.core.MediaConnection].
 */
public class LiveKitMediaRooms @JvmOverloads constructor(
    context: Context,
    private val roomOptions: RoomOptions = RoomOptions(),
    private val overrides: LiveKitOverrides = LiveKitOverrides(),
) : MediaRoomFactory {
    private val context: Context = context.applicationContext

    override fun create(events: MediaRoomEvents): MediaRoom =
        LiveKitMediaRoom(LiveKit.create(context, roomOptions, overrides), events)

    public companion object {
        /**
         * Rooms for a call that Android's Telecom runs, such as an answered
         * ring whose `CallInfo.telecom` is true. Telecom owns audio focus, the
         * audio mode and the route, so LiveKit leaves them alone.
         */
        @JvmStatic
        @JvmOverloads
        public fun forTelecom(context: Context, roomOptions: RoomOptions = RoomOptions()): LiveKitMediaRooms =
            LiveKitMediaRooms(context, roomOptions, LiveKitOverrides(audioOptions = AudioOptions(audioHandler = NoAudioHandler())))
    }
}

/** A [MediaRoom] that is one official LiveKit [Room]. */
public class LiveKitMediaRoom internal constructor(
    /**
     * LiveKit's room, for rendering tracks and observing participants. Don't
     * connect, disconnect or release it yourself: its connection does.
     */
    public val room: Room,
    events: MediaRoomEvents,
) : MediaRoom {
    private val lifecycle = RoomLifecycle(LiveKitNativeRoom(room), events)

    override suspend fun connect(url: String, token: String): String = lifecycle.connect(url, token)

    override suspend fun setMicrophoneEnabled(enabled: Boolean) {
        lifecycle.microphone(enabled)
    }

    override suspend fun setCameraEnabled(enabled: Boolean) {
        lifecycle.camera(enabled)
    }

    override suspend fun disconnect() {
        lifecycle.disconnect()
    }
}

/** The LiveKit calls [RoomLifecycle] makes, so its rules are testable without WebRTC. */
internal interface NativeRoom {
    /** Emits when the room disconnected, for any reason. */
    val disconnects: Flow<Unit>

    /** Joins once and returns the local participant SID. */
    suspend fun connect(url: String, token: String): String

    /** Returns false when the change failed. */
    suspend fun setMicrophoneEnabled(enabled: Boolean): Boolean

    /** Returns false when the change failed. */
    suspend fun setCameraEnabled(enabled: Boolean): Boolean

    /** Leaves and releases everything; blocks until LiveKit is done. */
    fun release()
}

private class LiveKitNativeRoom(private val room: Room) : NativeRoom {
    override val disconnects: Flow<Unit> = room.events.events.filterIsInstance<RoomEvent.Disconnected>().map { }

    override suspend fun connect(url: String, token: String): String {
        room.connect(url, token, ConnectOptions(audio = false, video = false))
        return room.localParticipant.sid.value
    }

    override suspend fun setMicrophoneEnabled(enabled: Boolean): Boolean = room.localParticipant.setMicrophoneEnabled(enabled)

    override suspend fun setCameraEnabled(enabled: Boolean): Boolean = room.localParticipant.setCameraEnabled(enabled)

    override fun release() {
        room.release()
    }
}

/**
 * The [MediaRoom] rules over a [NativeRoom]: it connects once, fails a
 * connect that drops midway, reports only a drop of an established
 * connection, and releases exactly once.
 */
internal class RoomLifecycle(private val native: NativeRoom, private val events: MediaRoomEvents) {
    private val state = AtomicInteger(IDLE)
    private val watching = SupervisorJob()

    init {
        // Observe from the start, off the main thread: LiveKit's disconnect
        // blocks until every observer has seen it.
        CoroutineScope(watching + Dispatchers.Default).launch(start = CoroutineStart.UNDISPATCHED) {
            native.disconnects.collect { dropped() }
        }
    }

    suspend fun connect(url: String, token: String): String {
        check(state.compareAndSet(IDLE, CONNECTING)) { "A media room connects once" }
        val sid = native.connect(url, token)
        check(state.compareAndSet(CONNECTING, CONNECTED)) { "Room closed during connect" }
        return sid
    }

    suspend fun microphone(enabled: Boolean) {
        check(state.get() == CONNECTED) { "Room is not connected" }
        check(native.setMicrophoneEnabled(enabled)) { "The microphone could not be ${if (enabled) "enabled" else "disabled"}" }
    }

    suspend fun camera(enabled: Boolean) {
        check(state.get() == CONNECTED) { "Room is not connected" }
        check(native.setCameraEnabled(enabled)) { "The camera could not be ${if (enabled) "enabled" else "disabled"}" }
    }

    suspend fun disconnect() {
        if (state.getAndSet(RELEASED) == RELEASED) return
        withContext(NonCancellable) {
            // Stop observing first, so LiveKit never waits for this observer.
            watching.cancelAndJoin()
            withContext(Dispatchers.IO) { native.release() }
        }
    }

    private fun dropped() {
        // A drop while connecting fails the connect instead.
        if (state.compareAndSet(CONNECTING, DROPPED)) return
        if (state.compareAndSet(CONNECTED, DROPPED)) events.onDisconnected()
    }

    private companion object {
        const val IDLE = 0
        const val CONNECTING = 1
        const val CONNECTED = 2
        const val DROPPED = 3
        const val RELEASED = 4
    }
}
