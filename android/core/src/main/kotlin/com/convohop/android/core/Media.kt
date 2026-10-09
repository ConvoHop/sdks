package com.convohop.android.core

import com.convohop.android.generated.LiveConnectionGrant
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val LOOPBACK_HOSTS = setOf("127.0.0.1", "localhost", "[::1]")

/**
 * One native media room that a [MediaConnection] drives. The Android library
 * implements it with the official LiveKit SDK; tests use a fake.
 */
public interface MediaRoom {
    /**
     * Joins with one single-use token and returns the local participant SID.
     * Must not capture or publish anything, and must not retry with the same
     * token. Never log or store the token.
     */
    public suspend fun connect(url: String, token: String): String

    public suspend fun setMicrophoneEnabled(enabled: Boolean)

    public suspend fun setCameraEnabled(enabled: Boolean)

    /** Leaves and releases everything the room owns. Idempotent and safe after the room disconnected itself. */
    public suspend fun disconnect()
}

/** Room events a [MediaConnection] consumes. */
public fun interface MediaRoomEvents {
    /** The room disconnected for good without [MediaRoom.disconnect]. Callable from any thread. */
    public fun onDisconnected()
}

/** Creates one room per connection attempt. */
public fun interface MediaRoomFactory {
    public fun create(events: MediaRoomEvents): MediaRoom
}

/** How to connect native media. */
public class MediaOptions(
    public val rooms: MediaRoomFactory,
    /**
     * Called once when an established connection drops without a deliberate
     * disconnect. Call [MediaConnection.reconnect]: a full reconnect needs
     * fresh credentials.
     */
    public val onDisconnected: (() -> Unit)? = null,
)

/**
 * A native media connection for one participation, admitted with
 * single-use credentials. Connecting never starts capture.
 */
public class MediaConnection private constructor(
    public val participation: LiveParticipationHandle,
    public val options: MediaOptions,
) {
    private val client: ConvoHopClient = participation.live.client
    private val microphoneAllowed = participation.snapshot.permissions.microphone
    private val cameraAllowed = participation.snapshot.permissions.camera

    @Volatile
    private var closed = false

    @Volatile
    private var left = false
    private var reconnecting: Deferred<MediaConnection>? = null

    /** The native room. On Android, `LiveKitMediaRoom.room` is LiveKit's `Room`, for rendering tracks. */
    public lateinit var room: MediaRoom
        private set

    /** The local participant SID, which equals the participation's `nativeConnectionId`. */
    @Volatile
    public var nativeConnectionId: String? = null
        private set

    public val connected: Boolean get() = !closed && nativeConnectionId != null

    internal companion object {
        suspend fun connectParticipation(
            participation: LiveParticipationHandle,
            options: MediaOptions,
            requestId: String?,
        ): MediaConnection {
            val result = MediaConnection(participation, options)
            val issued = participation.connectionGrant(requestId)
            val grant = issued.grant
            if (grant.admissionTicket["participationId"].stringOrNull() != participation.participationId ||
                grant.forwardingLease["participationId"].stringOrNull() != participation.participationId
            ) {
                protocolError("Native proof is not participation-bound")
            }
            participation.connectionAttempted()
            result.open(grant, issued.requestId)
            return result
        }
    }

    private suspend fun open(grant: LiveConnectionGrant, requestId: String) {
        val url = ProtocolUrl.parse(grant.livekitUrl)
        if (url.hasSearch || url.hasHash || url.hasCredentials ||
            !(url.scheme == "wss" || (url.scheme == "ws" && url.hostname in LOOPBACK_HOSTS))
        ) {
            protocolError("Invalid media origin")
        }
        check(timestampMillis(grant.leaseExpiresAt) > client.environment.now()) { "Fresh media credentials are required" }
        val created = options.rooms.create { client.scope.launch { roomDisconnected() } }
        room = created
        try {
            val sid = created.connect(grant.livekitUrl, grant.connectToken)
            check(!closed) { "Room closed during connect" }
            nativeConnectionId = parseId(sid)
        } catch (error: CancellationException) {
            withContext(NonCancellable) { close(deliberate = true) }
            throw error
        } catch (_: Exception) {
            // No cause: room errors can carry the token-bearing URL.
            withContext(NonCancellable) { close(deliberate = true) }
            throw ConvoHopProblem(
                "MEDIA_CONNECT_FAILED", requestId, "unknown", 0,
                "Native connection failed. The participation reservation remains; resolve and retry connect, or explicitly leave.",
            )
        }
    }

    private suspend fun roomDisconnected() {
        if (closed) return
        val established = nativeConnectionId != null
        closed = true
        try {
            room.disconnect()
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            // The room is already gone; nothing else to release.
        }
        if (!established) return
        try {
            options.onDisconnected?.invoke()
        } catch (_: Exception) {
            // A failing app callback must not break the SDK.
        }
    }

    /**
     * Replaces a dropped connection with a new one using fresh RECONNECT
     * credentials. Concurrent calls share one attempt.
     */
    public suspend fun reconnect(): MediaConnection {
        val work = client.serial {
            reconnecting ?: run {
                check(!left) { "A deliberately closed connection cannot reconnect" }
                lateinit var pending: Deferred<MediaConnection>
                pending = client.scope.async(start = CoroutineStart.LAZY) {
                    try {
                        close(deliberate = false)
                        check(!left) { "Connection was closed during reconnect" }
                        val next = participation.connect(options)
                        if (left) {
                            next.disconnect()
                            throw IllegalStateException("Connection was closed during reconnect")
                        }
                        next
                    } finally {
                        if (reconnecting === pending) reconnecting = null
                    }
                }
                reconnecting = pending
                pending.start()
                pending
            }
        }
        return work.await()
    }

    /** Starts or stops publishing the microphone. Requires microphone permission. */
    public suspend fun microphone(enabled: Boolean) {
        check(connected && microphoneAllowed) { "Microphone is not authorized for this participation" }
        room.setMicrophoneEnabled(enabled)
    }

    /** Starts or stops publishing the camera. Requires camera permission. */
    public suspend fun camera(enabled: Boolean) {
        check(connected && cameraAllowed) { "Camera is not authorized for this participation" }
        room.setCameraEnabled(enabled)
    }

    /** Leaves media for good; the participation remains until [LiveParticipationHandle.leave]. */
    public suspend fun disconnect() {
        close(deliberate = true)
    }

    private suspend fun close(deliberate: Boolean) {
        closed = true
        left = left || deliberate
        if (::room.isInitialized) room.disconnect()
    }
}
