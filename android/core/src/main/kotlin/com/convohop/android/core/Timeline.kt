package com.convohop.android.core

import com.convohop.android.generated.Cursor
import com.convohop.android.generated.Event
import com.convohop.android.generated.Member
import com.convohop.android.generated.Message
import com.convohop.android.generated.ReadReceipt
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.takeWhile
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonObject
import kotlin.math.max
import kotlin.math.min

/** Problems of the session, which renewal settles rather than the classifier. */
private val SESSION_CODES = setOf("UNAUTHENTICATED", "SESSION_REFRESH_REQUIRED", "SESSION_EXPIRED")

/** Replay positions that the authority can no longer continue. */
private val RESYNC_CODES = setOf("CURSOR_AHEAD", "CURSOR_EXPIRED", "CURSOR_SCOPE_MISMATCH")

/** One row of a [Timeline]. */
public sealed interface TimelineItem {
    /** A stable list key. */
    public val key: String

    /** A message from the authority's history. */
    public data class Sent(public val message: Message) : TimelineItem {
        override val key: String get() = message.messageId
    }

    /** A message this device sent that the timeline does not show from the authority yet. */
    public data class Pending(public val message: PendingMessage) : TimelineItem {
        override val key: String get() = message.requestId
    }
}

/**
 * One conversation, kept current: stored messages at once, then the newest
 * page and read receipts from the authority, then changes through a replay
 * that reconnects on its own. [items] lists confirmed messages oldest first,
 * followed by this device's outbox messages until the replay delivers them.
 * Close the timeline when the view goes away.
 *
 * When its replay stops, or reading the conversation fails, the timeline
 * reads the conversation again after a backoff, and never sooner than the
 * authority's `retryAfter`. It stops for good, with [replay] at
 * [ReplayState.CLOSED], on a problem that trying again can't fix, such as
 * `NOT_FOUND`, `FORBIDDEN` or `QUOTA_EXCEEDED`, or on a response that breaks
 * the protocol; open a new timeline to try again. A session problem waits
 * for the session to be renewed, or stops the timeline when the client has
 * no [SessionRefresh] to renew it. A replay position that the authority can
 * no longer continue gives way to the conversation's current state.
 *
 * Message events carry no content, so the timeline reads new and changed
 * messages from the authority as their events arrive. The API has no
 * presence or inbound typing events.
 */
public class Timeline internal constructor(
    private val store: ConvoHopStore,
    public val conversationId: String,
) : AutoCloseable {
    private val client = store.client
    private val scope = CoroutineScope(store.scope.coroutineContext + SupervisorJob(store.scope.coroutineContext[Job]))
    private val mutex = Mutex()
    private val messages = MutableStateFlow<Map<String, Message>>(emptyMap())
    private val receiptMap = MutableStateFlow<Map<String, ReadReceipt>>(emptyMap())
    private val replayState = MutableStateFlow(ReplayState.CATCHING_UP)
    private val older = MutableStateFlow(false)
    private val wakeups = Channel<Unit>(Channel.CONFLATED)

    private val loading = Mutex()
    private val reporting = Mutex()

    /** Whether [messages] holds authority history rather than only what the local store kept. */
    private var fetched = false

    /** Advances whenever [messages] is replaced, so work begun against the old history is dropped. */
    @Volatile
    private var generation = 0
    private var olderCursor: String? = null
    private var membership: Member? = null
    private var reportedRead = 0L

    @Volatile
    private var stream: ConversationStream? = null

    @Volatile
    private var streamError: Throwable? = null

    @Volatile
    private var restarting = false

    @Volatile
    private var closed = false

    /** Confirmed messages oldest first, then this device's unconfirmed ones in the order they were sent. */
    public val items: StateFlow<List<TimelineItem>> =
        combine(messages, store.outbox.pending) { known, pending -> build(known, pending) }
            .stateIn(scope, SharingStarted.Eagerly, emptyList())

    /** Members' delivery and read progress, by principal ID, for their current membership and visibility. */
    public val receipts: StateFlow<Map<String, ReadReceipt>> = receiptMap.asStateFlow()

    /** Where the timeline's replay stands; [ReplayState.CLOSED] once closed or stopped for good. */
    public val replay: StateFlow<ReplayState> = replayState.asStateFlow()

    /** Whether [loadOlder] can load earlier messages. */
    public val hasOlder: StateFlow<Boolean> = older.asStateFlow()

    /** This user's typing signal for the conversation. */
    public val typing: TypingIndicator = TypingIndicator(client, conversationId, store.scope, store::reportError)

    init {
        scope.launch {
            combine(messages, store.outbox.pending) { known, pending ->
                pending.filter { it.conversationId == conversationId && it.state == PendingState.SENT && it.messageId in known }
                    .mapNotNull { it.messageId }.toSet()
            }.collect { confirmed -> if (confirmed.isNotEmpty()) store.outbox.confirmed(conversationId, confirmed) }
        }
        scope.launch { run() }
    }

    private fun build(known: Map<String, Message>, pending: List<PendingMessage>): List<TimelineItem> {
        val sent = known.values.sortedBy { counter(it.sequence) }.map { TimelineItem.Sent(it) }
        val local = pending.filter {
            it.conversationId == conversationId && !(it.state == PendingState.SENT && it.messageId in known)
        }.map { TimelineItem.Pending(it) }
        return sent + local
    }

    private suspend fun run() {
        try {
            val cached = store.local.messages(conversationId)
            mutex.withLock { if (!fetched) messages.value = cached.associateBy { it.messageId } }
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            store.reportError(error)
        }
        var failures = 0
        while (!closed) {
            if (!store.online.value) replayState.value = ReplayState.RECONNECTING
            store.online.first { it }
            var problem: Throwable? = null
            try {
                val opened = synchronize()
                failures = 0
                opened.state.takeWhile { it != ReplayState.CLOSED }.collect { if (!closed) replayState.value = it }
                // A replay reports why it closed in the same serial step that closes it.
                client.serial {}
                problem = streamError
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                problem = error
                store.reportError(error)
            }
            if (closed) return
            if (restarting) {
                restarting = false
                continue
            }
            if (problem != null && final(problem)) {
                replayState.value = ReplayState.CLOSED
                return
            }
            replayState.value = ReplayState.RECONNECTING
            failures++
            val backoff = min(60_000L, 1_000L shl min(failures - 1, 6)) + (client.environment.random() * 500).toLong()
            // A wake-up skips the backoff, but never the wait that the authority's retryAfter asked for.
            val hold = retryAfterMillis((problem as? ConvoHopProblem)?.retryAfter)
            val holdUntil = client.environment.now() + hold
            withTimeoutOrNull(max(backoff, hold)) { wakeups.receive() }
            delay((holdUntil - client.environment.now()).coerceIn(0L, hold))
        }
    }

    /**
     * Whether following the conversation again can't help: the client is done, its session can't be renewed, or
     * the classifier stops on [error]. Of the problems it stops on, two still follow again: a session problem, which
     * renewal settles when the client has a [SessionRefresh], and a replay position that the authority can no longer
     * continue, which [synchronize] replaces with the conversation's current state.
     */
    private fun final(error: Throwable): Boolean = when {
        client.isClosed || client.sessionRefreshState == SessionRefreshState.BLOCKED -> true
        error is HistoryResyncRequired -> false
        error is ConvoHopProblem && (error.status == 401 || error.code in SESSION_CODES) ->
            client.sessionRefreshState == SessionRefreshState.DISABLED
        error is ConvoHopProblem && error.code in RESYNC_CODES -> false
        else -> reconnectAction(error) == ReconnectAction.STOP
    }

    /** Reads the conversation, newest messages and receipts, then replays what changes after that point. */
    private suspend fun synchronize(): ConversationStream {
        streamError = null
        replayState.value = ReplayState.CATCHING_UP
        val conversation = client.getConversation(conversationId)
        val head = Cursor(client.incarnation, conversationId, conversation.latestSequence)
        val page = client.messages(conversationId)
        if (page.refreshRequired) protocolError("The newest message page cannot require a refresh")
        val receiptPage = client.receipts(conversationId)
        mutex.withLock {
            val current = messages.value
            val newest = current.values.maxOfOrNull { counter(it.sequence) }
            val oldest = page.items.minOfOrNull { counter(it.sequence) }
            if (fetched && !page.complete && newest != null && oldest != null && oldest <= newest) {
                val (next, changed) = merge(current, page.items)
                messages.value = next
                persist { putMessages(conversationId, changed) }
            } else {
                // The page may not join what is held, or visibility may have changed since: start over from it.
                generation++
                olderCursor = if (page.complete) null else page.nextCursor ?: protocolError("Invalid protocol object")
                messages.value = merge(emptyMap(), page.items).first
                persist {
                    removeMessages(conversationId)
                    putMessages(conversationId, page.items)
                }
            }
            fetched = true
            older.value = olderCursor != null
            val previous = membership
            val member = conversation.membership
            membership = member
            receiptMap.value = receiptPage.items.associateBy { it.principalId }
            val mine = receiptPage.items.firstOrNull { it.principalId == client.principalId }
            val read = if (member != null && mine != null && sameEpochs(mine.membershipEpoch, mine.visibilityEpoch, member)) {
                mine.readThroughSequence?.let(::counter) ?: 0L
            } else {
                0L
            }
            val unchanged = previous != null && member != null && sameEpochs(previous.membershipEpoch, previous.visibilityEpoch, member)
            reportedRead = if (unchanged) max(reportedRead, read) else read
        }
        return client.watchFrom(conversationId, head, { events -> applyEvents(events) }, { error ->
            streamError = error
            store.reportError(error)
        }) { opened ->
            stream = opened
            if (closed) opened.close()
        }
    }

    private suspend fun applyEvents(events: List<Event>) {
        val startedIn = generation
        if (closed || events.isEmpty()) return
        if (events.any { changesMyView(it) }) {
            restart()
            return
        }
        val known = messages.value
        val created = events.filter { it.type == "message.created" }
        val missing = LinkedHashSet<String>()
        for (event in created) {
            val messageId = event.payload?.messageId ?: protocolError("Invalid protocol object")
            if (messageId !in known) missing.add(messageId)
        }
        val stale = LinkedHashSet<String>()
        for (event in events) {
            if (event.type != "message.edited" && event.type != "message.deleted") continue
            val payload = event.payload ?: protocolError("Invalid protocol object")
            val messageId = payload.messageId ?: protocolError("Invalid protocol object")
            val current = known[messageId] ?: continue
            val revisionSequence = payload.revisionSequence
            if (revisionSequence == null || counter(revisionSequence) > counter(current.revisionSequence)) stale.add(messageId)
        }
        stale.removeAll(missing)
        val found = ArrayList<Message>()
        if (missing.isNotEmpty()) {
            // Message events carry no content: read the newest messages through the last one created here.
            val through = created.maxOf { event -> max(counter(event.sequence), event.payload?.revisionSequence?.let(::counter) ?: 0L) }
            val page = client.messages(conversationId, (through + 1).toString())
            if (page.refreshRequired) {
                restart()
                return
            }
            for (message in page.items) if (missing.remove(message.messageId) || stale.remove(message.messageId)) found.add(message)
        }
        for (messageId in missing + stale) fetchMessage(messageId)?.let(found::add)
        mutex.withLock {
            if (closed || generation != startedIn) return
            val (next, changed) = merge(messages.value, found)
            if (changed.isNotEmpty()) {
                messages.value = next
                persist { putMessages(conversationId, changed) }
            }
            applyReceipts(events)
        }
    }

    /** Whether [event] changes what this user may see, which the current snapshot does not account for. */
    private fun changesMyView(event: Event): Boolean {
        val payload = event.payload ?: return false
        if (!event.type.startsWith("member.") || payload.principalId != client.principalId) return false
        if (event.type == "member.removed" || event.type == "member.historyExpanded") return true
        val member = membership ?: return true
        return (payload.membershipEpoch != null && payload.membershipEpoch != member.membershipEpoch) ||
            (payload.visibilityEpoch != null && payload.visibilityEpoch != member.visibilityEpoch)
    }

    /** The message, or null when it is gone or no longer visible to this user. */
    private suspend fun fetchMessage(messageId: String): Message? = try {
        client.getMessage(conversationId, messageId)
    } catch (error: ConvoHopProblem) {
        if (error.outcome == "rejected" && (error.status == 403 || error.status == 404)) null else throw error
    }

    private fun merge(current: Map<String, Message>, incoming: List<Message>): Pair<Map<String, Message>, List<Message>> {
        val next = LinkedHashMap(current)
        val changed = ArrayList<Message>()
        for (message in incoming) {
            if (message.conversationId != conversationId) protocolError("Invalid protocol object")
            if (newer(message, next[message.messageId])) {
                next[message.messageId] = message
                changed.add(message)
            }
        }
        return next to changed
    }

    private fun applyReceipts(events: List<Event>) {
        var receipts = receiptMap.value
        for (event in events) {
            val payload = event.payload ?: continue
            val principalId = payload.principalId ?: continue
            if (event.type == "member.removed") {
                receipts = receipts - principalId
            } else if (event.type.startsWith("member.")) {
                // A new membership or visibility no longer covers what the old receipt reported.
                val existing = receipts[principalId] ?: continue
                val membershipEpoch = payload.membershipEpoch ?: existing.membershipEpoch
                val visibilityEpoch = payload.visibilityEpoch ?: existing.visibilityEpoch
                if (membershipEpoch != existing.membershipEpoch || visibilityEpoch != existing.visibilityEpoch) {
                    receipts = receipts - principalId
                }
            } else if (event.type == "receipt.reported") {
                val membershipEpoch = payload.membershipEpoch ?: protocolError("Invalid protocol object")
                val visibilityEpoch = payload.visibilityEpoch ?: protocolError("Invalid protocol object")
                val through = payload.throughSequence ?: protocolError("Invalid protocol object")
                val reported = when (payload.kind) {
                    "read" -> ReadReceipt(
                        principalId, membershipEpoch, visibilityEpoch, readThroughSequence = through, updatedAt = event.occurredAt,
                    )
                    "delivered" -> ReadReceipt(
                        principalId, membershipEpoch, visibilityEpoch, deliveredThroughSequence = through, updatedAt = event.occurredAt,
                    )
                    null -> protocolError("Invalid protocol object")
                    // Receipt kinds this SDK does not know do not change what it shows.
                    else -> continue
                }
                receipts = receipts + (principalId to latest(receipts[principalId], reported))
                val member = membership
                if (principalId == client.principalId && payload.kind == "read" && member != null &&
                    sameEpochs(membershipEpoch, visibilityEpoch, member)
                ) {
                    reportedRead = max(reportedRead, counter(through))
                }
            }
        }
        receiptMap.value = receipts
    }

    private suspend fun restart() {
        mutex.withLock { fetched = false }
        restarting = true
        stream?.close()
    }

    /** Local storage is a cache: its failures are reported, never fatal to the live timeline. */
    private suspend fun persist(block: suspend LocalStore.() -> Unit) {
        try {
            store.local.block()
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            store.reportError(error)
        }
    }

    /**
     * Loads the page of messages before the oldest one held. Returns false
     * when nothing older arrived: the start of history is reached, the
     * timeline has not read from the authority yet, or the history was
     * replaced meanwhile.
     */
    public suspend fun loadOlder(): Boolean = loading.withLock { olderPage() }

    private suspend fun olderPage(): Boolean {
        val (cursor, startedIn) = mutex.withLock { olderCursor to generation }
        if (cursor == null || closed) return false
        val page = client.messages(conversationId, cursor)
        if (page.refreshRequired) {
            restart()
            return false
        }
        return mutex.withLock {
            if (closed || generation != startedIn || olderCursor != cursor) return false
            val (next, changed) = merge(messages.value, page.items)
            messages.value = next
            olderCursor = if (page.complete) null else page.nextCursor ?: protocolError("Invalid protocol object")
            older.value = olderCursor != null
            persist { putMessages(conversationId, changed) }
            changed.isNotEmpty()
        }
    }

    /**
     * Reports that this user has read through the newest message held.
     * Returns false when that is already reported or the timeline has not
     * read from the authority yet.
     */
    public suspend fun markRead(): Boolean = reporting.withLock { readThroughNewest() }

    private suspend fun readThroughNewest(): Boolean {
        val (member, through) = mutex.withLock {
            if (!fetched) return false
            val newest = messages.value.values.maxByOrNull { counter(it.sequence) } ?: return false
            val joined = membership ?: throw IllegalStateException("Only members report read receipts")
            if (counter(newest.sequence) <= reportedRead) return false
            joined to newest.sequence
        }
        val receipt = client.reportRead(conversationId, member, through)
        mutex.withLock {
            reportedRead = max(reportedRead, counter(through))
            receiptMap.value = receiptMap.value + (receipt.principalId to latest(receiptMap.value[receipt.principalId], receipt))
        }
        return true
    }

    /** Queues [text] in the store's outbox and ends this user's typing signal. */
    public suspend fun send(text: String, props: JsonObject = NO_PROPS): PendingMessage {
        val message = store.outbox.send(conversationId, text, props)
        typing.stop()
        return message
    }

    /**
     * Skips reconnect waits, for example when the device is back online, though never the wait that the
     * authority's `retryAfter` asked for.
     */
    internal fun reconnectNow() {
        stream?.reconnectNow()
        wakeups.trySend(Unit)
    }

    /** Stops following the conversation. Messages already queued in the outbox are still sent. */
    override fun close() {
        if (closed) return
        closed = true
        typing.close()
        stream?.close()
        replayState.value = ReplayState.CLOSED
        scope.cancel()
        store.forget(this)
    }
}

private fun sameEpochs(membershipEpoch: String, visibilityEpoch: String, member: Member): Boolean =
    membershipEpoch == member.membershipEpoch && visibilityEpoch == member.visibilityEpoch

/** The receipt for the later membership and visibility, or both merged when they are the same. */
private fun latest(existing: ReadReceipt?, incoming: ReadReceipt): ReadReceipt {
    if (existing == null) return incoming
    val membership = counter(incoming.membershipEpoch).compareTo(counter(existing.membershipEpoch))
    val order = if (membership != 0) membership else counter(incoming.visibilityEpoch).compareTo(counter(existing.visibilityEpoch))
    if (order < 0) return existing
    if (order > 0) return incoming
    val delivered = later(existing.deliveredThroughSequence, incoming.deliveredThroughSequence)
    val read = later(existing.readThroughSequence, incoming.readThroughSequence)
    val advanced = delivered != existing.deliveredThroughSequence || read != existing.readThroughSequence
    return existing.copy(
        deliveredThroughSequence = delivered,
        readThroughSequence = read,
        updatedAt = if (advanced) incoming.updatedAt ?: existing.updatedAt else existing.updatedAt,
    )
}

private fun later(current: String?, candidate: String?): String? = when {
    current == null -> candidate
    candidate == null -> current
    counter(candidate) > counter(current) -> candidate
    else -> current
}
