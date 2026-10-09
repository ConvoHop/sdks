package com.convohop.android

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.convohop.android.core.CanonicalJson
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.core.ConvoHopProtocolException
import com.convohop.android.core.LocalStore
import com.convohop.android.core.PendingMessage
import com.convohop.android.core.PendingState
import com.convohop.android.generated.Message
import com.convohop.android.generated.ShapeException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * A [LocalStore] in a private SQLite database, so the outbox and cached
 * messages survive restarts. It never holds credentials. Use one database
 * per project and principal; [ConvoHopStore.signOut][com.convohop.android.core.ConvoHopStore.signOut]
 * clears it.
 */
public class SqliteLocalStore(context: Context, name: String) : LocalStore, AutoCloseable {
    private val helper = Helper(context.applicationContext, name.also { require(it.isNotBlank() && '/' !in it) { "Invalid database name" } })

    /** The database for [client]'s project and principal. */
    public constructor(context: Context, client: ConvoHopClient) :
        this(context, "convohop.store.${client.projectId}.${client.principalId}.db")

    override suspend fun messages(conversationId: String): List<Message> = database { db ->
        val rows = ArrayList<String>()
        db.rawQuery("SELECT json FROM messages WHERE conversation_id = ?", arrayOf(conversationId)).use { cursor ->
            while (cursor.moveToNext()) rows.add(cursor.getString(0))
        }
        try {
            rows.map { Message.fromJson(CanonicalJson.parse(it)) }
        } catch (_: ShapeException) {
            forget(db, conversationId)
        } catch (_: ConvoHopProtocolException) {
            forget(db, conversationId)
        }
    }

    // The cache is rebuilt from the authority, so an unreadable one is dropped whole, never partly.
    private fun forget(db: SQLiteDatabase, conversationId: String): List<Message> {
        db.delete("messages", "conversation_id = ?", arrayOf(conversationId))
        return emptyList()
    }

    override suspend fun putMessages(conversationId: String, messages: List<Message>) {
        if (messages.isEmpty()) return
        database { db ->
            transaction(db) {
                for (message in messages) {
                    val values = ContentValues()
                    values.put("conversation_id", conversationId)
                    values.put("message_id", message.messageId)
                    values.put("json", CanonicalJson.encode(message.toJson()))
                    db.insertWithOnConflict("messages", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                }
            }
        }
    }

    override suspend fun removeMessages(conversationId: String) {
        database { db -> db.delete("messages", "conversation_id = ?", arrayOf(conversationId)) }
    }

    override suspend fun pending(): List<PendingMessage> = database { db ->
        val rows = ArrayList<String>()
        db.rawQuery("SELECT json FROM pending ORDER BY position", null).use { cursor ->
            while (cursor.moveToNext()) rows.add(cursor.getString(0))
        }
        rows.map(::decodePending)
    }

    override suspend fun putPending(message: PendingMessage) {
        val json = encodePending(message)
        database { db ->
            transaction(db) {
                val values = ContentValues()
                values.put("json", json)
                if (db.update("pending", values, "request_id = ?", arrayOf(message.requestId)) == 0) {
                    db.execSQL(
                        "INSERT INTO pending (request_id, position, json) " +
                            "VALUES (?, (SELECT COALESCE(MAX(position), 0) + 1 FROM pending), ?)",
                        arrayOf(message.requestId, json),
                    )
                }
            }
        }
    }

    override suspend fun removePending(requestId: String) {
        database { db -> db.delete("pending", "request_id = ?", arrayOf(requestId)) }
    }

    override suspend fun clear() {
        database { db ->
            transaction(db) {
                db.delete("messages", null, null)
                db.delete("pending", null, null)
            }
            // Signing out should not leave message text in free pages.
            db.execSQL("VACUUM")
        }
    }

    /** Closes the database; the next call reopens it. */
    override fun close() {
        helper.close()
    }

    private suspend fun <T> database(block: (SQLiteDatabase) -> T): T =
        withContext(Dispatchers.IO) { block(helper.writableDatabase) }

    private inline fun transaction(db: SQLiteDatabase, block: () -> Unit) {
        db.beginTransaction()
        try {
            block()
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    private class Helper(context: Context, name: String) : SQLiteOpenHelper(context, name, null, 1) {
        override fun onCreate(db: SQLiteDatabase) {
            db.execSQL(
                "CREATE TABLE messages (conversation_id TEXT NOT NULL, message_id TEXT NOT NULL, " +
                    "json TEXT NOT NULL, PRIMARY KEY (conversation_id, message_id))",
            )
            db.execSQL("CREATE TABLE pending (request_id TEXT NOT NULL PRIMARY KEY, position INTEGER NOT NULL, json TEXT NOT NULL)")
        }

        override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int): Unit = Unit
    }
}

private fun encodePending(message: PendingMessage): String =
    CanonicalJson.encode(
        JsonObject(
            mapOf(
                "requestId" to JsonPrimitive(message.requestId),
                "conversationId" to JsonPrimitive(message.conversationId),
                "text" to JsonPrimitive(message.text),
                "props" to message.props,
                "createdAt" to JsonPrimitive(message.createdAt.toString()),
                "state" to JsonPrimitive(message.state.name),
                "messageId" to (message.messageId?.let { JsonPrimitive(it) } ?: JsonNull),
                "errorCode" to (message.errorCode?.let { JsonPrimitive(it) } ?: JsonNull),
            ),
        ),
    )

// Outbox entries are the user's unsent messages, so an unreadable one is an error, never skipped.
private fun decodePending(text: String): PendingMessage {
    val record = CanonicalJson.parse(text) as? JsonObject ?: unreadable()
    return PendingMessage(
        requestId = record.string("requestId"),
        conversationId = record.string("conversationId"),
        text = record.string("text"),
        props = record["props"] as? JsonObject ?: unreadable(),
        createdAt = record.string("createdAt").toLongOrNull() ?: unreadable(),
        state = PendingState.entries.firstOrNull { it.name == record.string("state") } ?: unreadable(),
        messageId = record.optionalString("messageId"),
        errorCode = record.optionalString("errorCode"),
    )
}

private fun JsonObject.string(key: String): String = text(this[key]) ?: unreadable()

private fun JsonObject.optionalString(key: String): String? = when (val value = this[key]) {
    JsonNull -> null
    else -> text(value) ?: unreadable()
}

private fun text(value: JsonElement?): String? = (value as? JsonPrimitive)?.takeIf { it.isString }?.content

private fun unreadable(): Nothing = throw ConvoHopProtocolException("Stored outbox entry is unreadable")
