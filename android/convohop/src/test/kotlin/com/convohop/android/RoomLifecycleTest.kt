package com.convohop.android

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Collections
import java.util.concurrent.atomic.AtomicInteger

/** The LiveKit room rules, over a fake native room. */
internal class RoomLifecycleTest {
    private val native = FakeNativeRoom()
    private val reports = AtomicInteger()
    private val lifecycle = RoomLifecycle(native) { reports.incrementAndGet() }

    @After
    fun release() = blocking { lifecycle.disconnect() }

    @Test
    fun connectsOnceAndReportsOnlyTheFirstDropOfTheEstablishedRoom() = blocking {
        assertEquals("PA_local", lifecycle.connect(URL, TOKEN))
        assertFails("A media room connects once") { lifecycle.connect(URL, TOKEN) }
        // With no buffer, each emit returns once the observer has handled the one before it.
        repeat(3) { native.disconnects.emit(Unit) }
        assertEquals(1, reports.get())
        assertFails("Room is not connected") { lifecycle.microphone(true) }
        lifecycle.disconnect()
        assertEquals(1, native.releases.get())
    }

    @Test
    fun aDropWhileConnectingFailsTheConnectWithoutAReport() = blocking {
        val gate = CompletableDeferred<Unit>()
        native.gate = gate
        val connecting = async(Dispatchers.Default) { runCatching { lifecycle.connect(URL, TOKEN) } }
        native.entered.await()
        repeat(2) { native.disconnects.emit(Unit) }
        gate.complete(Unit)
        assertEquals("Room closed during connect", connecting.await().exceptionOrNull()?.message)
        assertEquals(0, reports.get())
    }

    @Test
    fun disconnectReleasesOnceAndStopsObserving() = blocking {
        lifecycle.connect(URL, TOKEN)
        lifecycle.disconnect()
        lifecycle.disconnect()
        assertEquals(1, native.releases.get())
        assertEquals(0, native.disconnects.subscriptionCount.value)
        assertFails("Room is not connected") { lifecycle.camera(true) }
        assertEquals(0, reports.get())
    }

    @Test
    fun aMediaChangeTheRoomRefusesThrows() = blocking {
        assertFails("Room is not connected") { lifecycle.microphone(true) }
        lifecycle.connect(URL, TOKEN)
        lifecycle.microphone(true)
        lifecycle.camera(true)
        native.accepts = false
        assertFails("The microphone could not be disabled") { lifecycle.microphone(false) }
        assertFails("The camera could not be enabled") { lifecycle.camera(true) }
        assertEquals(listOf("microphone true", "camera true", "microphone false", "camera true"), native.changes)
    }

    private fun blocking(test: suspend CoroutineScope.() -> Unit) {
        runBlocking { withTimeout(10_000) { test() } }
    }

    private suspend fun assertFails(message: String, action: suspend () -> Unit) {
        val error = runCatching { action() }.exceptionOrNull()
        assertTrue("Expected IllegalStateException, got $error", error is IllegalStateException)
        assertEquals(message, error?.message)
    }

    private companion object {
        const val URL = "wss://media.example.test"
        const val TOKEN = "connect-token"
    }
}

private class FakeNativeRoom : NativeRoom {
    override val disconnects = MutableSharedFlow<Unit>()
    val releases = AtomicInteger()
    val changes: MutableList<String> = Collections.synchronizedList(ArrayList())

    /** Completes once a connect is in flight. */
    val entered = CompletableDeferred<Unit>()

    @Volatile
    var gate: CompletableDeferred<Unit>? = null

    @Volatile
    var accepts = true

    override suspend fun connect(url: String, token: String): String {
        entered.complete(Unit)
        gate?.await()
        return "PA_local"
    }

    override suspend fun setMicrophoneEnabled(enabled: Boolean): Boolean {
        changes += "microphone $enabled"
        return accepts
    }

    override suspend fun setCameraEnabled(enabled: Boolean): Boolean {
        changes += "camera $enabled"
        return accepts
    }

    override fun release() {
        releases.incrementAndGet()
    }
}
