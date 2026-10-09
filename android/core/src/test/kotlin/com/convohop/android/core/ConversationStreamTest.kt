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
}
