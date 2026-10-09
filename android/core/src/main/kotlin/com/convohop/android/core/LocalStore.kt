package com.convohop.android.core

import com.convohop.android.generated.Message
import kotlinx.serialization.json.JsonObject

/** Where an outbox message stands. */
public enum class PendingState {
    /**
     * Waiting to be sent. Nothing of it was applied: it was never submitted,
     * or the authority refused the attempt, as when the session expired.
     */
    QUEUED,

    /** Submitted at least once; the outcome is not known yet, so it is resent under the same request ID. */
    SENDING,

    /** The authority committed it; it leaves the outbox once the timeline holds the message. */
    SENT,

    /**
     * The retry budget ran out and the authority has not observed it yet. It
     * may still commit, so it is never resent automatically; the outbox checks
     * it again read-only, and the app may [Outbox.sendAgain] or [Outbox.discard] it.
     */
    UNCONFIRMED,

    /** The authority rejected it; [PendingMessage.errorCode] says why. It was not sent. */
    FAILED,
}

/** A message the app sent that the authority has not confirmed into the timeline yet. */
public data class PendingMessage(
    /** The idempotency key every attempt of this message uses. */
    val requestId: String,
    val conversationId: String,
    val text: String,
    val props: JsonObject,
    /** When the app queued it, in epoch milliseconds. */
    val createdAt: Long,
    val state: PendingState,
    /** The authority's message ID once the message is known to have committed, when the authority returned it. */
    val messageId: String? = null,
    /** The error code of the rejection, of the refusal that holds a queued message, or of the last failed attempt. */
    val errorCode: String? = null,
)

/**
 * Durable state for [ConvoHopStore]: confirmed messages per conversation and
 * the outbox. It never receives credentials. Keep one store per project and
 * principal and [clear] it at sign-out. Implementations must be safe to call
 * from any thread.
 */
public interface LocalStore {
    /** The stored messages of [conversationId], in any order. */
    public suspend fun messages(conversationId: String): List<Message>

    /** Inserts or replaces [messages] by message ID. */
    public suspend fun putMessages(conversationId: String, messages: List<Message>)

    /** Deletes the stored messages of [conversationId], when the cached history no longer joins the current one. */
    public suspend fun removeMessages(conversationId: String)

    /** Every outbox entry, in the order they were first stored. */
    public suspend fun pending(): List<PendingMessage>

    /** Inserts or replaces [message] by request ID, keeping the position of an existing entry. */
    public suspend fun putPending(message: PendingMessage)

    public suspend fun removePending(requestId: String)

    /** Deletes everything. */
    public suspend fun clear()
}

/** A [LocalStore] that lives as long as the process. */
public class MemoryLocalStore : LocalStore {
    private val lock = Any()
    private val messages = HashMap<String, LinkedHashMap<String, Message>>()
    private val pending = LinkedHashMap<String, PendingMessage>()

    override suspend fun messages(conversationId: String): List<Message> =
        synchronized(lock) { messages[conversationId]?.values?.toList().orEmpty() }

    override suspend fun putMessages(conversationId: String, messages: List<Message>) {
        synchronized(lock) {
            val stored = this.messages.getOrPut(conversationId) { LinkedHashMap() }
            for (message in messages) stored[message.messageId] = message
        }
    }

    override suspend fun removeMessages(conversationId: String) {
        synchronized(lock) { messages.remove(conversationId) }
    }

    override suspend fun pending(): List<PendingMessage> = synchronized(lock) { pending.values.toList() }

    override suspend fun putPending(message: PendingMessage) {
        synchronized(lock) { pending[message.requestId] = message }
    }

    override suspend fun removePending(requestId: String) {
        synchronized(lock) { pending.remove(requestId) }
    }

    override suspend fun clear() {
        synchronized(lock) {
            messages.clear()
            pending.clear()
        }
    }
}

/** True when [candidate] is the same message as [current] at a later revision, or [current] is absent. */
internal fun newer(candidate: Message, current: Message?): Boolean =
    current == null || counter(candidate.revisionSequence) > counter(current.revisionSequence) ||
        (candidate.revisionSequence == current.revisionSequence && counter(candidate.revision) > counter(current.revision))
