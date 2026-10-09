package com.convohop.android.core

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Tells the conversation that this user is typing. Call [keystroke] as the
 * draft changes and [stop] when the user sends or clears it. The indicator
 * signals "typing" at most once every 3 seconds and "stopped" 5 seconds after
 * the last keystroke. Signals are ephemeral: they are sent in order, never
 * retried, and failures go to the store's error callback.
 *
 * The API has no inbound typing events, so other members' typing is not shown.
 */
public class TypingIndicator internal constructor(
    private val client: ConvoHopClient,
    private val conversationId: String,
    private val scope: CoroutineScope,
    private val onError: (Throwable) -> Unit,
) {
    private val lock = Any()
    private val signals = Channel<Boolean>(Channel.CONFLATED)
    private var idle: Job? = null
    private var cooldown: Job? = null
    private var shown = false
    private var closed = false

    init {
        scope.launch {
            for (typing in signals) {
                try {
                    client.typing(conversationId, typing)
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Exception) {
                    report(onError, error)
                }
            }
        }
    }

    /** The user changed the draft. */
    public fun keystroke() {
        synchronized(lock) {
            if (closed) return
            idle?.cancel()
            idle = scope.launch {
                delay(5_000)
                stop()
            }
            if (cooldown?.isActive == true) return
            cooldown = scope.launch { delay(3_000) }
            shown = true
            signals.trySend(true)
        }
    }

    /** The user sent or cleared the draft. */
    public fun stop() {
        synchronized(lock) {
            idle?.cancel()
            idle = null
            cooldown?.cancel()
            cooldown = null
            if (!shown) return
            shown = false
            signals.trySend(false)
        }
    }

    /** Signals "stopped" if needed and stops the indicator. */
    internal fun close() {
        synchronized(lock) {
            if (closed) return
            stop()
            closed = true
            signals.close()
        }
    }
}
