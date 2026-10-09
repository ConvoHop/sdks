package com.convohop.android.core

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max
import kotlin.math.min

internal val NO_PROPS: JsonObject = JsonObject(emptyMap())

/** Problems that stop every send until the session or client is replaced, rather than one message. */
private val HOLD_CODES = setOf("SESSION_REFRESH_REQUIRED", "SESSION_EXPIRED", "INCARNATION_MISMATCH", "UNAUTHENTICATED")

/**
 * Sends messages optimistically: [send] stores the message, shows it in
 * [pending] at once and delivers it when [ConvoHopStore.online] allows,
 * oldest first within each conversation.
 *
 * Every attempt for a message reuses its request ID, payload and the
 * client's retry budget, so the authority applies it at most once. When the
 * outcome stays unknown after the budget, the outbox resolves the request
 * read-only and reports [PendingState.UNCONFIRMED] instead of guessing; it
 * never resends under a new ID on its own. [sendAgain] does that only when
 * the app asks.
 *
 * A message becomes [PendingState.SENDING] only after the client has saved
 * its request's recovery record, just before each attempt, so a process
 * that ends mid-send leaves either that record or a message never sent.
 * On the next start, a message with a record is resent under the same
 * request ID while its budget lasts, then resolved read-only; one that was
 * never submitted becomes [PendingState.FAILED] with `RESOLUTION_REQUIRED`.
 * Without durable recovery storage, a SENDING message can only be resolved.
 *
 * When the authority refuses the session, the outbox holds every send and
 * tries again only on [drain], so new sends do not spend the held message's
 * retry budget. A refused attempt was not applied: the message stays
 * [PendingState.QUEUED] with the refusal in [PendingMessage.errorCode]. If
 * the hold outlasts the budget (three attempts, or 60 seconds from the
 * first), the message is resolved read-only; one the authority never applied
 * becomes [PendingState.FAILED].
 */
public class Outbox internal constructor(
    private val client: ConvoHopClient,
    private val local: LocalStore,
    private val online: StateFlow<Boolean>,
    private val onError: (Throwable) -> Unit,
    private val scope: CoroutineScope,
) {
    private enum class Step { NEXT, WAIT, HOLD }

    private val mutex = Mutex()
    private val entries = MutableStateFlow<List<PendingMessage>>(emptyList())
    private val loaded = CompletableDeferred<Unit>()
    private val wakeups = Channel<Unit>(Channel.CONFLATED)
    private val forced = AtomicBoolean(false)
    private val waiting = ConcurrentHashMap<String, Job>()
    private val failures = HashMap<String, Int>()
    private var lastSweep: Long? = null

    /** Set when the authority refused the session; only a forced [drain] tries again. */
    private var held = false

    /** Messages not yet confirmed into a timeline, in the order they were sent. */
    public val pending: StateFlow<List<PendingMessage>> = entries.asStateFlow()

    init {
        scope.launch {
            try {
                entries.value = local.pending().filter { entry ->
                    // A confirmed message is in the authority's history; the timeline loads it from there.
                    if (entry.state == PendingState.SENT) local.removePending(entry.requestId)
                    entry.state != PendingState.SENT
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                report(onError, error)
            }
            loaded.complete(Unit)
            while (true) {
                wakeups.receive()
                try {
                    drainOnce()
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Exception) {
                    // Usually local storage; the next send, drain or reconnect tries again.
                    report(onError, error)
                }
            }
        }
        scope.launch {
            online.collect { value -> if (value) drain() }
        }
    }

    /**
     * Queues [text] for [conversationId] and returns the stored entry at once.
     * Keep its request ID to follow it in [pending].
     */
    public suspend fun send(conversationId: String, text: String, props: JsonObject = NO_PROPS): PendingMessage {
        val entry = PendingMessage(
            client.environment.uuid(), requireId(conversationId, "conversationId"), text, props, client.environment.now(),
            PendingState.QUEUED,
        )
        loaded.await()
        mutex.withLock {
            local.putPending(entry)
            entries.update { it + entry }
        }
        wake()
        return entry
    }

    /**
     * Queues a [PendingState.FAILED] or [PendingState.UNCONFIRMED] message
     * again under a new request ID, after the conversation's other queued
     * messages. An unconfirmed original may still commit, so the message can
     * then appear twice; ask the user before calling this for one.
     */
    public suspend fun sendAgain(requestId: String): PendingMessage {
        loaded.await()
        val next = mutex.withLock {
            val entry = find(requestId)
            check(entry.state == PendingState.FAILED || entry.state == PendingState.UNCONFIRMED) {
                "Only failed or unconfirmed messages can be sent again"
            }
            val next = entry.copy(
                requestId = client.environment.uuid(), createdAt = client.environment.now(), state = PendingState.QUEUED,
                messageId = null, errorCode = null,
            )
            local.putPending(next)
            local.removePending(requestId)
            entries.update { list -> list.filterNot { it.requestId == requestId } + next }
            next
        }
        wake()
        return next
    }

    /**
     * Removes a message from the outbox. A [PendingState.SENDING] message
     * cannot be discarded because its outcome is unknown; discarding an
     * unconfirmed one does not stop it from committing.
     */
    public suspend fun discard(requestId: String) {
        loaded.await()
        mutex.withLock {
            check(find(requestId).state != PendingState.SENDING) { "A message whose outcome is unknown cannot be discarded" }
            remove(requestId)
        }
    }

    /**
     * Retries now: delivers queued messages, skips pending backoff, lifts a
     * session hold and checks unconfirmed messages again. [ConvoHopStore]
     * calls it when the device comes online and after the client renews its
     * session.
     */
    public fun drain() {
        forced.set(true)
        wake()
    }

    private fun wake() {
        wakeups.trySend(Unit)
    }

    private fun find(requestId: String): PendingMessage =
        entries.value.firstOrNull { it.requestId == requestId } ?: throw NoSuchElementException("No outbox message $requestId")

    private suspend fun remove(requestId: String) {
        local.removePending(requestId)
        entries.update { list -> list.filterNot { it.requestId == requestId } }
    }

    /** Drops confirmed messages that the timeline of [conversationId] now shows from the authority. */
    internal suspend fun confirmed(conversationId: String, messageIds: Set<String>) {
        mutex.withLock {
            for (entry in entries.value) {
                if (entry.conversationId == conversationId && entry.state == PendingState.SENT && entry.messageId in messageIds) {
                    remove(entry.requestId)
                }
            }
        }
    }

    private suspend fun drainOnce() {
        if (forced.getAndSet(false)) {
            for (job in waiting.values) job.cancel()
            waiting.clear()
            lastSweep = null
            held = false
        }
        if (held || !online.value || !sweep()) return
        for (conversationId in entries.value.map { it.conversationId }.distinct()) {
            while (online.value) {
                val head = entries.value.firstOrNull {
                    it.conversationId == conversationId && (it.state == PendingState.QUEUED || it.state == PendingState.SENDING)
                } ?: break
                if (waiting.containsKey(head.requestId)) break
                when (deliver(head)) {
                    Step.NEXT -> Unit
                    Step.WAIT -> break
                    Step.HOLD -> return
                }
            }
        }
    }

    /** Checks unconfirmed messages again, at most once a minute unless forced. False when sends must wait for a new session. */
    private suspend fun sweep(): Boolean {
        val now = client.environment.now()
        val last = lastSweep
        if (last != null && now - last in 0 until 60_000) return true
        lastSweep = now
        for (entry in entries.value) {
            if (entry.state != PendingState.UNCONFIRMED || entry.errorCode == "IDEMPOTENCY_CONFLICT") continue
            val resolution = try {
                client.requests.resolve(entry.requestId)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (!holds(error)) continue
                held = true
                report(onError, error)
                return false
            }
            if (resolution.state == "committed" || resolution.state == "accepted") {
                sent(entry.requestId, resolution.receipt?.result?.messageAck?.messageId)
            }
        }
        return true
    }

    private suspend fun deliver(entry: PendingMessage): Step {
        val record = try {
            record(entry.requestId)
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            report(onError, error)
            return Step.HOLD
        }
        // Noted as submitted, but its recovery record is gone, as after a restart without durable recovery storage:
        // it may have committed, so it can only be resolved, not resent.
        if (entry.state == PendingState.SENDING && record == null) return resolve(entry)
        val noted = AtomicBoolean(entry.state == PendingState.SENDING)
        // Noted just before each submission, once the client has saved the request's recovery record, so a process
        // that dies at any point leaves either that record, which recovers the request, or a message never sent.
        val forget = client.http.beforeSubmitting(entry.requestId) {
            if (!noted.get()) {
                checkNotNull(update(entry.requestId) { it.copy(state = PendingState.SENDING) }) {
                    "The message left the outbox before it was sent"
                }
                noted.set(true)
            }
        }
        return try {
            val receipt = client.send(entry.conversationId, entry.text, entry.requestId, entry.props)
            sent(entry.requestId, receipt.messageId)
            Step.NEXT
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            // Discarded while still queued: the submission stopped before anything was sent.
            if (entries.value.none { it.requestId == entry.requestId }) Step.NEXT else failed(entry, error)
        } finally {
            forget()
        }
    }

    private suspend fun failed(entry: PendingMessage, error: Exception): Step {
        val problem = error as? ConvoHopProblem
        return when {
            problem == null && error !is ConvoHopProtocolException -> {
                // Thrown by a closed client or by storage. The message stays queued unless an attempt was noted.
                report(onError, error)
                Step.HOLD
            }
            problem != null && (problem.code == "RESOLUTION_REQUIRED" ||
                (problem.code == "INCARNATION_MISMATCH" && problem.outcome == "unknown")) -> resolve(entry)
            problem != null && problem.code == "IDEMPOTENCY_CONFLICT" -> {
                settle(entry.requestId, PendingState.UNCONFIRMED, problem.code)
                report(onError, error)
                Step.NEXT
            }
            holds(error) -> {
                refused(entry, problem)
                held = true
                report(onError, error)
                Step.HOLD
            }
            problem != null && problem.outcome == "rejected" && problem.status in 400..499 && problem.status != 408 &&
                problem.status != 429 -> {
                settle(entry.requestId, PendingState.FAILED, problem.code)
                report(onError, error)
                Step.NEXT
            }
            else -> {
                refused(entry, problem)
                retryLater(entry, error)
            }
        }
    }

    /** A refused attempt was not applied, so the message stands where it stood before it. */
    private suspend fun refused(entry: PendingMessage, problem: ConvoHopProblem?) {
        if (problem?.outcome == "rejected") update(entry.requestId) { it.copy(state = entry.state, errorCode = problem.code) }
    }

    private suspend fun resolve(entry: PendingMessage): Step {
        val resolution = try {
            client.requests.resolve(entry.requestId)
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            if (!holds(error)) return retryLater(entry, error)
            held = true
            report(onError, error)
            return Step.HOLD
        }
        when (resolution.state) {
            "committed", "accepted" -> sent(entry.requestId, resolution.receipt?.result?.messageAck?.messageId)
            "notObservedYet" -> unobserved(entry)
            else -> return retryLater(entry, ConvoHopProtocolException("Unknown request resolution state"))
        }
        return Step.NEXT
    }

    /** Settles a message the authority has not observed and the client will not resend, by what is known of its attempts. */
    private suspend fun unobserved(entry: PendingMessage) {
        val record = try {
            record(entry.requestId)
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            report(onError, error)
            null
        }
        val current = entries.value.firstOrNull { it.requestId == entry.requestId } ?: return
        when {
            // A commit the client observed outlives the authority's retention of its result; the replay delivers it.
            record?.resolutionState == "committed" -> sent(entry.requestId, null)
            // No attempt could have been applied: none was submitted, as when the process ended before the first, or
            // the authority refused each one. Resending it as a new message cannot duplicate it.
            record?.attemptCount == 0L || current.state == PendingState.QUEUED ->
                settle(entry.requestId, PendingState.FAILED, current.errorCode ?: "RESOLUTION_REQUIRED")
            else -> settle(entry.requestId, PendingState.UNCONFIRMED, null)
        }
    }

    private suspend fun record(requestId: String): RecoveryRecord? = client.requests.records().firstOrNull { it.requestId == requestId }

    private fun holds(error: Exception): Boolean =
        error is ConvoHopProblem && (error.status == 401 || error.code in HOLD_CODES)

    private suspend fun sent(requestId: String, messageId: String?) {
        failures.remove(requestId)
        mutex.withLock {
            // Without the message ID there is nothing to match in the timeline; the replay delivers the message.
            if (messageId == null) {
                if (entries.value.any { it.requestId == requestId }) remove(requestId)
            } else {
                change(requestId) { it.copy(state = PendingState.SENT, messageId = messageId, errorCode = null) }
            }
        }
    }

    private suspend fun settle(requestId: String, state: PendingState, errorCode: String?) {
        failures.remove(requestId)
        update(requestId) { it.copy(state = state, errorCode = errorCode) }
    }

    private suspend fun update(requestId: String, transform: (PendingMessage) -> PendingMessage): PendingMessage? =
        mutex.withLock { change(requestId, transform) }

    private suspend fun change(requestId: String, transform: (PendingMessage) -> PendingMessage): PendingMessage? {
        val current = entries.value.firstOrNull { it.requestId == requestId } ?: return null
        val next = transform(current)
        local.putPending(next)
        entries.update { list -> list.map { if (it.requestId == requestId) next else it } }
        return next
    }

    /** Backs off 1, 4, 16 and then 30 seconds with jitter, or longer when the authority asked for a delay. */
    private fun retryLater(entry: PendingMessage, error: Exception): Step {
        report(onError, error)
        val failure = (failures[entry.requestId] ?: 0) + 1
        failures[entry.requestId] = failure
        val backoff = min(30_000L, 1_000L shl min(2 * (failure - 1), 5))
        val jittered = backoff / 2 + (client.environment.random() * (backoff / 2)).toLong()
        val hinted = min((error as? ConvoHopProblem)?.retryAfter ?: 0L, 300L) * 1_000L
        val timer = scope.launch(start = CoroutineStart.LAZY) {
            delay(max(jittered, hinted))
            waiting.remove(entry.requestId)
            wake()
        }
        waiting[entry.requestId] = timer
        timer.start()
        return Step.WAIT
    }
}
