package com.convohop.android.core

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch

/**
 * The offline-first layer over a [ConvoHopClient]: one [Outbox] for
 * optimistic sends that survive restarts, and [Timeline]s that show stored
 * messages at once and keep them current.
 *
 * [local] keeps messages and the outbox; it never holds credentials. Feed
 * [online] from the platform's connectivity: going offline holds the outbox,
 * and coming back drains it and skips reconnect waits. Errors that the store
 * handles by retrying or by marking a message are still reported to
 * [onError], for logging.
 */
public class ConvoHopStore(
    public val client: ConvoHopClient,
    public val local: LocalStore = MemoryLocalStore(),
    public val online: StateFlow<Boolean> = MutableStateFlow(true),
    private val onError: (Throwable) -> Unit = {},
) : AutoCloseable {
    internal val scope = CoroutineScope(SupervisorJob() + client.dispatcher)
    private val timelines = LinkedHashSet<Timeline>()

    @Volatile
    private var closed = false

    /** Messages sent through this store that the authority has not shown back yet. */
    public val outbox: Outbox = Outbox(client, local, online, this::reportError, scope)

    init {
        scope.launch {
            online.drop(1).collect { reachable ->
                if (!reachable) return@collect
                client.reconnectNow()
                for (timeline in synchronized(timelines) { timelines.toList() }) timeline.reconnectNow()
            }
        }
        scope.launch {
            client.renewals.collect { outbox.drain() }
        }
    }

    /**
     * Opens a timeline of [conversationId]. Each call opens its own; close
     * it when the view goes away.
     */
    public fun timeline(conversationId: String): Timeline {
        check(!closed) { "ConvoHopStore is closed" }
        val timeline = Timeline(this, requireId(conversationId, "conversationId"))
        synchronized(timelines) { timelines.add(timeline) }
        if (closed) timeline.close()
        return timeline
    }

    internal fun forget(timeline: Timeline) {
        synchronized(timelines) { timelines.remove(timeline) }
    }

    internal fun reportError(error: Throwable) {
        report(onError, error)
    }

    /** Closes every timeline and stops sending. The outbox stays in [local] for the next store. */
    override fun close() {
        if (closed) return
        closed = true
        for (timeline in synchronized(timelines) { timelines.toList() }) timeline.close()
        scope.cancel()
    }

    /**
     * Closes the store and deletes everything in [local], including messages
     * that were never sent. Call it when the user signs out, before closing
     * the client.
     */
    public suspend fun signOut() {
        close()
        scope.coroutineContext[Job]?.join()
        local.clear()
    }
}
