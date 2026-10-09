package com.convohop.android

import android.database.sqlite.SQLiteDatabase
import com.convohop.android.core.ConvoHopProtocolException
import com.convohop.android.core.PendingMessage
import com.convohop.android.core.PendingState
import com.convohop.android.generated.Message
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
internal class SqliteLocalStoreTest {
    private val app = RuntimeEnvironment.getApplication()
    private var store = SqliteLocalStore(app, NAME)

    @After
    fun close() {
        store.close()
    }

    @Test
    fun messagesRoundTripPerConversationAndADeletedOneKeepsItsNulls() = runBlocking {
        val deleted = message(2, deleted = true, text = null, props = null)
        store.putMessages(CONVERSATION, listOf(message(1), deleted))
        store.putMessages(OTHER, listOf(message(3, conversationId = OTHER)))
        val stored = store.messages(CONVERSATION).sortedBy { it.messageId }
        assertEquals(listOf(message(1), deleted), stored)
        // A deleted message stays null, never "" or {}.
        assertNull(stored[1].text)
        assertNull(stored[1].props)
        store.putMessages(CONVERSATION, listOf(message(1, revision = "2", text = "edited")))
        assertEquals("edited", store.messages(CONVERSATION).single { it.messageId == id(1) }.text)
        store.removeMessages(CONVERSATION)
        assertTrue(store.messages(CONVERSATION).isEmpty())
        assertEquals(listOf(message(3, conversationId = OTHER)), store.messages(OTHER))
    }

    @Test
    fun anUnreadableCacheIsDroppedWhole() = runBlocking {
        for (json in listOf("""{"messageId":"not-a-uuid"}""", "not json")) {
            store.putMessages(CONVERSATION, listOf(message(1)))
            store.putMessages(OTHER, listOf(message(3, conversationId = OTHER)))
            raw { it.execSQL("INSERT INTO messages VALUES (?, ?, ?)", arrayOf(CONVERSATION, id(9), json)) }
            assertTrue(store.messages(CONVERSATION).isEmpty())
            raw { db ->
                db.rawQuery("SELECT COUNT(*) FROM messages WHERE conversation_id = ?", arrayOf(CONVERSATION)).use {
                    it.moveToFirst()
                    assertEquals(0, it.getInt(0))
                }
            }
            assertEquals(1, store.messages(OTHER).size)
        }
    }

    @Test
    fun theOutboxKeepsItsOrderThroughUpdatesAndAReopen() = runBlocking {
        store.putPending(pending("request-1"))
        store.putPending(pending("request-2", text = "second"))
        val sending = pending("request-1", state = PendingState.SENDING, messageId = id(1), errorCode = "TIMEOUT")
        store.putPending(sending)
        assertEquals(listOf(sending, pending("request-2", text = "second")), store.pending())
        store.close()
        store = SqliteLocalStore(app, NAME)
        assertEquals(listOf(sending, pending("request-2", text = "second")), store.pending())
        store.removePending("request-1")
        store.putPending(pending("request-3"))
        assertEquals(listOf("request-2", "request-3"), store.pending().map { it.requestId })
    }

    @Test
    fun anUnreadableOutboxEntryIsAnErrorNotSkipped() = runBlocking {
        store.putPending(pending("request-1"))
        raw { it.execSQL("INSERT INTO pending VALUES (?, ?, ?)", arrayOf("request-2", 2, """{"requestId":"request-2"}""")) }
        val error = runCatching { store.pending() }.exceptionOrNull()
        assertTrue("Expected a protocol error, got $error", error is ConvoHopProtocolException)
    }

    @Test
    fun clearDeletesEverything() = runBlocking {
        store.putMessages(CONVERSATION, listOf(message(1)))
        store.putPending(pending("request-1"))
        store.clear()
        assertTrue(store.messages(CONVERSATION).isEmpty())
        assertTrue(store.pending().isEmpty())
    }

    @Test
    fun aNameMustBeAPlainFileName() {
        for (name in listOf("", " ", "a/b")) {
            val error = runCatching { SqliteLocalStore(app, name) }.exceptionOrNull()
            assertTrue("Expected a rejection of '$name'", error is IllegalArgumentException)
        }
    }

    // Edits the database file directly, as corruption or an older build would.
    private fun raw(edit: (SQLiteDatabase) -> Unit) {
        store.close()
        SQLiteDatabase.openDatabase(app.getDatabasePath(NAME).path, null, SQLiteDatabase.OPEN_READWRITE).use(edit)
    }

    private companion object {
        const val NAME = "convohop.store.test.db"
        val CONVERSATION = id(100)
        val OTHER = id(200)
        val PROPS = JsonObject(mapOf("kind" to JsonPrimitive("note")))

        fun id(n: Int): String = "00000000-0000-4000-8000-" + n.toString().padStart(12, '0')

        fun message(
            n: Int,
            conversationId: String = CONVERSATION,
            revision: String = "1",
            deleted: Boolean = false,
            text: String? = "hello $n",
            props: JsonObject? = PROPS,
        ): Message = Message(
            messageId = id(n),
            conversationId = conversationId,
            authorId = "user-1",
            sequence = n.toString(),
            revision = revision,
            revisionSequence = n.toString(),
            createdAt = "2026-01-01T00:00:00.000Z",
            deleted = deleted,
            text = text,
            props = props,
        )

        fun pending(
            requestId: String,
            text: String = "hello",
            state: PendingState = PendingState.QUEUED,
            messageId: String? = null,
            errorCode: String? = null,
        ): PendingMessage = PendingMessage(requestId, CONVERSATION, text, PROPS, 1_700_000_000_000, state, messageId, errorCode)
    }
}
