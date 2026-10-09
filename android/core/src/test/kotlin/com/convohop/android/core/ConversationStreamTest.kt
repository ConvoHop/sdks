package com.convohop.android.core

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ConversationStreamTest {
    /** Recovery storage whose cursor writes wait for [gate], like a slow disk. */
    private class SlowStorage : RecoveryStorage {
        val values = HashMap<String, String>()
        var gate: CompletableDeferred<Unit>? = null

        override suspend fun getItem(key: String): String? = values[key]

        override suspend fun setItem(key: String, value: String) {
            if (key.startsWith("convohop.cursor:")) gate?.await()
            values[key] = value
        }

        override suspend fun removeItem(key: String) {
            values.remove(key)
        }

        fun storedSequence(): String? = values.entries.singleOrNull { it.key.startsWith("convohop.cursor:") }
            ?.let { Json.parseToJsonElement(it.value).jsonObject.getValue("sequence").jsonPrimitive.content }
    }

    @Test
    fun theCursorAdvancesOnlyOnceTheAppliedPositionIsStored() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val first = h.authority.post(conversation, OTHER, "first")
            val storage = SlowStorage()
            val client = h.client(storage = storage)
            val delivered = ArrayList<String>()
            val stream = client.watch(conversation, { events -> events.mapTo(delivered) { it.sequence } }, { h.errors += it })
            assertEquals(listOf(first.sequence), delivered)
            assertEquals(first.sequence, stream.cursor?.sequence)
            assertEquals(first.sequence, storage.storedSequence())

            val gate = CompletableDeferred<Unit>()
            storage.gate = gate
            val second = h.authority.post(conversation, OTHER, "second")
            h.settle()
            // The batch is applied, but a restart would still resume after the first message.
            assertEquals(listOf(first.sequence, second.sequence), delivered)
            assertEquals(first.sequence, stream.cursor?.sequence)
            assertEquals(first.sequence, storage.storedSequence())

            gate.complete(Unit)
            h.settle()
            assertEquals(second.sequence, stream.cursor?.sequence)
            assertEquals(second.sequence, storage.storedSequence())
            stream.close()
            h.settle()
            assertTrue(h.errors.isEmpty())
        }
    }

    @Test
    fun aPermanentFailureIsReportedBeforeTheReplayCloses() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val client = h.client()
            var stream: ConversationStream? = null
            val seen = ArrayList<Pair<Boolean, ReplayState>>()
            stream = client.watch(conversation, {}, { error ->
                h.errors += error
                val current = checkNotNull(stream)
                seen += current.closed to current.state.value
            })
            h.settle()
            assertEquals(ReplayState.LIVE, stream.state.value)

            h.authority.disconnect(4401)
            h.settle()
            // Inside onError the replay already counts as closed, but state turns CLOSED only after it, so an
            // observer on another thread that sees CLOSED also has the reason.
            assertEquals(listOf(true to ReplayState.LIVE), seen)
            assertEquals(ReplayState.CLOSED, stream.state.value)
            assertEquals(listOf("UNAUTHENTICATED"), h.errorCodes())
            // Reconnecting with the rejected credential would only fail again.
            h.advance(120_000)
            assertEquals(1, h.authority.calls("CommunicationEvents").size)
        }
    }
}
