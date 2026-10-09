package com.convohop.android.core

import com.convohop.android.generated.Cursor
import com.convohop.android.generated.Event
import com.convohop.android.generated.Operations
import com.convohop.android.generated.Transport
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import java.io.IOException
import kotlin.math.floor
import kotlin.math.min

private val AUTHORIZATION_CLOSE_CODES = setOf(4400, 4401, 4403, 4408, 4409)
private val RETRYABLE_STATUSES = setOf(0, 429, 503)
private const val MAX_FRAME_LENGTH = 65536

internal fun parseCursor(value: JsonElement?): Cursor {
    val v = value.protocolObject()
    return Cursor(
        incarnation = parseId(v["incarnation"]),
        conversationId = parseId(v["conversationId"]),
        sequence = parseCounter(v["sequence"]),
    )
}

/** Where a [ConversationStream] stands. */
public enum class ReplayState {
    /** Catching up over HTTP, or opening the live subscription. */
    CATCHING_UP,

    /** Subscribed; events arrive as they happen. */
    LIVE,

    /** The connection dropped; waiting to reconnect with backoff. */
    RECONNECTING,

    /** Held while the session is renewed. */
    PAUSED,

    /** Closed by the app, or failed permanently. */
    CLOSED,
}

/**
 * One conversation's authorized history, replayed from its applied cursor
 * and then followed live over `graphql-transport-ws`.
 *
 * Batches reach the application's apply callback in order, one at a time;
 * the cursor advances and is stored only after the callback returns. A
 * dropped socket reconnects with backoff, settles pending mutations,
 * catches up over HTTP and subscribes again from the applied cursor.
 * Authorization failures and protocol violations close the replay and go to
 * the error callback; open a new replay after obtaining a current session.
 */
public class ConversationStream internal constructor(
    private val client: ConvoHopClient,
    public val conversationId: String,
    route: ProjectRoute,
    token: String,
    initialCursor: Cursor?,
    private val apply: suspend (List<Event>) -> Unit,
    private val onError: (Throwable) -> Unit,
    /** False for views that load a snapshot first; their position must not move the app's stored cursor. */
    private val persistCursor: Boolean,
    private val onClose: () -> Unit,
) : AutoCloseable {
    private class Round(val generation: Int, val result: Deferred<Boolean>)

    @Volatile
    private var closedFlag = false
    private var finished = false
    private var notified = false
    private var socket: RealtimeSocket? = null
    private var working: Deferred<*>? = null
    private var round: Round? = null
    private var applying: Deferred<Boolean>? = null
    private var paused = false
    private var started = false

    @Volatile
    private var appliedCursor: Cursor? = initialCursor
    private var timer: Job? = null
    private var reconnectAttempts = 0
    private var pendingPages = 0
    private var queueGeneration = 0
    private var currentRoute: ProjectRoute = route
    private var token: String = token
    private val storageKey = storageKey(client, conversationId)
    private val stateFlow = MutableStateFlow(ReplayState.CATCHING_UP)

    /** Where the replay stands. */
    public val state: StateFlow<ReplayState> = stateFlow.asStateFlow()

    /** The last applied position; replay resumes after it. */
    public val cursor: Cursor? get() = appliedCursor

    /** True once [close] ran or the replay failed permanently. */
    public val closed: Boolean get() = closedFlag

    internal companion object {
        fun storageKey(client: ConvoHopClient, conversationId: String): String =
            "convohop.cursor:${client.projectId}:${client.principalId}:$conversationId"

        /** The stored cursor, if any. A malformed one fails rather than silently restarting history. */
        suspend fun loadCursor(client: ConvoHopClient, conversationId: String): Cursor? {
            val saved = client.storage?.getItem(storageKey(client, conversationId))
            if (saved.isNullOrEmpty()) return null
            return parseCursor(CanonicalJson.parse(saved))
        }
    }

    private suspend fun saveCursor(next: Cursor) {
        appliedCursor = next
        if (persistCursor) client.storage?.setItem(storageKey, CanonicalJson.encode(next.toJson()))
    }

    private fun notifyClosed() {
        if (notified) return
        notified = true
        onClose()
    }

    /**
     * Stops the replay: no further batches are applied and the socket closes.
     * A batch already inside the apply callback finishes first.
     */
    override fun close() {
        if (closedFlag) return
        closedFlag = true
        client.post { closeNow() }
    }

    internal fun closeNow() {
        closedFlag = true
        stateFlow.value = ReplayState.CLOSED
        if (finished) return
        finished = true
        queueGeneration++
        timer?.cancel()
        timer = null
        val current = socket
        socket = null
        current?.close(1000, "")
        if (applying == null) notifyClosed()
    }

    internal suspend fun retire() {
        closeNow()
        applying?.join()
    }

    internal suspend fun suspendSessionRefresh() {
        paused = true
        if (!closedFlag) stateFlow.value = ReplayState.PAUSED
        timer?.cancel()
        timer = null
        val current = socket
        socket = null
        var closing: Throwable? = null
        try {
            current?.close(1000, "")
        } catch (error: Exception) {
            closing = error
        }
        val failures = listOfNotNull(applying, working).map { settle(it) }
        queueGeneration++
        closing?.let { throw it }
        failures.firstOrNull { it != null }?.let { throw it }
    }

    internal suspend fun resumeSessionRefresh(route: ProjectRoute, token: String) {
        if (closedFlag) return
        currentRoute = route
        this.token = token
        paused = false
        stateFlow.value = ReplayState.CATCHING_UP
        try {
            proceed(reconcileRound().await())
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            fail(error)
            throw error
        }
    }

    private suspend fun applyEvents(events: List<Event>): Boolean {
        val pending = client.scope.async(start = CoroutineStart.LAZY) {
            if (closedFlag || paused) {
                false
            } else {
                apply(events)
                true
            }
        }
        applying = pending
        try {
            pending.start()
            return pending.await()
        } finally {
            applying = null
            if (closedFlag) notifyClosed()
        }
    }

    private fun pausedProblem(): ConvoHopProblem = ConvoHopProblem(
        "SESSION_REFRESH_REQUIRED", client.environment.uuid(), "rejected", 409,
        "Replay startup was paused by session refresh; open it after verified refresh",
    )

    internal suspend fun resyncAuthorizedHistory() {
        if (closedFlag || started || working != null) throw IllegalStateException("History resynchronization requires a new idle replay")
        currentRoute = client.initialize()
        client.getConversation(conversationId)
        if (closedFlag) throw IllegalStateException("History resynchronization was superseded")
        appliedCursor = null
        start()
    }

    internal suspend fun start() {
        if (closedFlag || started) throw IllegalStateException("Replay is already started or closed")
        started = true
        client.recoverPending(onError)
        if (paused) throw pausedProblem()
        val more = reconcileRound().await()
        if (paused) throw pausedProblem()
        proceed(more)
    }

    private fun connect() {
        if (closedFlag || paused || socket != null) return
        val route = currentRoute
        val subscriptionId = client.environment.uuid()
        lateinit var opened: RealtimeSocket
        val listener = object : RealtimeListener {
            override fun onOpen() = client.post { onSocketOpen(opened, route) }

            override fun onMessage(text: String?) = client.post { onSocketMessage(opened, route, subscriptionId, text) }

            override fun onError(error: Throwable) = client.post {
                if (!closedFlag && !paused && socket === opened) {
                    report(onError, IOException("Realtime connection unavailable; current history remains authoritative", error))
                }
            }

            override fun onClose(code: Int, reason: String) = client.post { onSocketClose(opened, subscriptionId, code) }
        }
        opened = client.realtime.connect(route.wssUrl, Transport.WEBSOCKET_SUBPROTOCOL, listener)
        socket = opened
    }

    private fun onSocketOpen(ws: RealtimeSocket, route: ProjectRoute) {
        if (closedFlag || paused || socket !== ws) {
            ws.close(1000, "")
            return
        }
        val payload = jsonObjectOf(
            "projectId" to client.projectId.json(),
            "incarnation" to route.incarnation.json(),
            "token" to token.json(),
        )
        ws.send(CanonicalJson.encode(jsonObjectOf("type" to "connection_init".json(), "payload" to payload)))
    }

    private fun subscribeFrame(route: ProjectRoute, subscriptionId: String): String {
        val operation = Operations.Communication.conversationEvents.descriptor
        val context = jsonObjectOf(
            "requestId" to client.environment.uuid().json(),
            "projectId" to client.projectId.json(),
            "incarnation" to route.incarnation.json(),
            "observedServingEpoch" to route.servingEpoch.json(),
        )
        val input = jsonObjectOf(
            "conversationId" to conversationId.json(),
            "limit" to JsonPrimitive(50),
            "after" to appliedCursor?.toJson(),
        )
        val payload = jsonObjectOf(
            "query" to operation.document.json(),
            "operationName" to operation.operationName.json(),
            "variables" to jsonObjectOf("context" to context, "input" to input),
        )
        return CanonicalJson.encode(
            jsonObjectOf("type" to "subscribe".json(), "id" to subscriptionId.json(), "payload" to payload),
        )
    }

    private fun onSocketMessage(ws: RealtimeSocket, route: ProjectRoute, subscriptionId: String, text: String?) {
        if (closedFlag || paused || socket !== ws) return
        try {
            if (text == null) protocolError("Invalid protocol string")
            if (text.length > MAX_FRAME_LENGTH) {
                throw ConvoHopProblem("ADMISSION_LIMIT", subscriptionId, "rejected", 503, "Subscription frame exceeds its budget")
            }
            val frame = CanonicalJson.parse(text).protocolObject()
            when (val type = frame["type"].stringOrNull()) {
                "connection_ack" -> {
                    reconnectAttempts = 0
                    ws.send(subscribeFrame(route, subscriptionId))
                    stateFlow.value = ReplayState.LIVE
                }
                "ping" -> ws.send(CanonicalJson.encode(jsonObjectOf("type" to "pong".json())))
                "next", "error" -> {
                    if (frame["id"].stringOrNull() != subscriptionId) protocolError("Unknown subscription identity")
                    val payload = if (type == "error") jsonObjectOf("errors" to frame["payload"]) else frame["payload"].protocolObject()
                    val errors = payload["errors"] as? JsonArray
                    if (errors != null && errors.isNotEmpty()) {
                        val problem = errors[0].protocolObject()
                        val extensions = problem["extensions"].protocolObject()
                        throw ConvoHopProblem(
                            extensions["code"].protocolString(), parseId(extensions["requestId"]),
                            extensions["outcome"].protocolString(),
                            extensions["status"].intOrNull() ?: protocolError("Invalid protocol status"),
                            problem["message"].protocolString(),
                        )
                    }
                    page(payload["data"].protocolObject()["conversationEvents"])
                }
                "complete" -> throw ConvoHopProblem(
                    "AUTHORITY_UNAVAILABLE", subscriptionId, "unknown", 503, "Resume the subscription from its applied cursor",
                )
            }
        } catch (error: Exception) {
            fail(error)
        }
    }

    private fun onSocketClose(ws: RealtimeSocket, subscriptionId: String, code: Int) {
        if (socket !== ws) return
        socket = null
        if (closedFlag || paused) return
        if (code !in AUTHORIZATION_CLOSE_CODES) {
            retry()
        } else {
            fail(ConvoHopProblem("UNAUTHENTICATED", subscriptionId, "rejected", 401, "Realtime authorization ended; obtain a current session"))
        }
    }

    private fun page(value: JsonElement?) {
        if (pendingPages >= 4) {
            throw ConvoHopProblem(
                "ADMISSION_LIMIT", client.environment.uuid(), "unknown", 503, "Application must resume from its applied cursor",
            )
        }
        val page = eventPage(value, currentRoute.incarnation, conversationId, null)
        if (page.refreshRequired) throw IllegalStateException("Explicit authorized history resynchronization required")
        val frontier = page.nextCursor ?: protocolError("Invalid protocol object")
        val generation = queueGeneration
        val previous = working
        pendingPages++
        lateinit var work: Deferred<Unit>
        work = client.scope.async(start = CoroutineStart.LAZY) {
            try {
                previous?.await()
                val before = appliedCursor
                if (closedFlag || paused || generation != queueGeneration ||
                    (before != null && counter(frontier.sequence) < counter(before.sequence))
                ) {
                    return@async
                }
                val events = if (before == null) page.items else page.items.filter { counter(it.sequence) > counter(before.sequence) }
                val applied = applyEvents(events)
                if (!applied || closedFlag || generation != queueGeneration) return@async
                saveCursor(frontier)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (generation == queueGeneration) fail(error)
            } finally {
                pendingPages--
                if (working === work) working = null
            }
        }
        working = work
        work.start()
    }

    /**
     * Skips the reconnect backoff, for example when the device is back
     * online. Does nothing unless the replay is [ReplayState.RECONNECTING].
     */
    public fun reconnectNow() {
        client.post {
            if (closedFlag || paused || stateFlow.value != ReplayState.RECONNECTING) return@post
            timer?.cancel()
            timer = null
            retry(immediate = true)
        }
    }

    private fun retry(immediate: Boolean = false) {
        if (closedFlag || paused || timer != null) return
        val delayMillis = if (immediate) {
            0L
        } else {
            min(1000L shl min(reconnectAttempts++, 4), 10000L) + floor(client.environment.random() * 500).toLong()
        }
        stateFlow.value = ReplayState.RECONNECTING
        timer = client.scope.launch {
            delay(delayMillis)
            timer = null
            if (closedFlag || paused) return@launch
            stateFlow.value = ReplayState.CATCHING_UP
            val generation = queueGeneration
            val current = { !closedFlag && !paused && generation == queueGeneration }
            try {
                val route = client.initialize()
                if (!current()) return@launch
                currentRoute = route
                client.recoverPending(onError)
                val more = if (current()) reconcileRound().await() else false
                if (current()) proceed(more)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (current()) fail(error)
            }
        }
    }

    /** Catch-up runs in bounded rounds, paced rather than failing at the work limit; live follows once current. */
    private fun proceed(more: Boolean) {
        if (closedFlag || paused) return
        if (!more) {
            connect()
            return
        }
        if (timer != null) return
        val delayMillis = 250L + floor(client.environment.random() * 250).toLong()
        timer = client.scope.launch {
            delay(delayMillis)
            timer = null
            if (closedFlag || paused) return@launch
            val generation = queueGeneration
            val current = { !closedFlag && !paused && generation == queueGeneration }
            try {
                val next = reconcileRound().await()
                if (current()) proceed(next)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (current()) fail(error)
            }
        }
    }

    private fun fail(error: Throwable) {
        if (closedFlag) return
        queueGeneration++
        if (paused) {
            report(onError, error)
            return
        }
        if (error is ConvoHopProblem && (error.status in RETRYABLE_STATUSES || error.code == "WRONG_REGION")) {
            val current = socket
            socket = null
            current?.close(4000, "Retrying authoritative connection")
            report(onError, error)
            retry()
            return
        }
        closeNow()
        report(onError, error)
    }

    /** One bounded round of at most ten pages; true only when the current replay has more work. */
    private fun reconcileRound(): Deferred<Boolean> {
        if (closedFlag) return CompletableDeferred(false)
        if (paused) {
            return CompletableDeferred<Boolean>().apply {
                completeExceptionally(
                    ConvoHopProblem(
                        "SESSION_REFRESH_REQUIRED", client.environment.uuid(), "rejected", 409,
                        "Realtime application work is paused until session authority is verified",
                    ),
                )
            }
        }
        val generation = queueGeneration
        // Rounds coalesce only within one generation; earlier queued or superseded work settles first.
        round?.let { if (it.generation == generation) return it.result }
        val superseded = { closedFlag || generation != queueGeneration }
        val stale = { superseded() || paused }
        val previous = working
        lateinit var pending: Deferred<Boolean>
        pending = client.scope.async(start = CoroutineStart.LAZY) {
            try {
                previous?.join()
                for (index in 0 until 10) {
                    if (stale()) return@async false
                    val before = appliedCursor
                    val result = client.events(conversationId, before)
                    if (stale()) return@async false
                    if (result.refreshRequired) throw IllegalStateException("Explicit authorized history resynchronization required")
                    val frontier = result.nextCursor ?: protocolError("Invalid protocol object")
                    if (!result.complete && before != null && counter(frontier.sequence) <= counter(before.sequence)) {
                        protocolError("Incomplete replay page did not advance the authoritative frontier")
                    }
                    val applied = applyEvents(result.items)
                    if (!applied || superseded()) return@async false
                    saveCursor(frontier)
                    if (result.complete) return@async false
                }
                !stale()
            } finally {
                if (round?.result === pending) round = null
                if (working === pending) working = null
            }
        }
        round = Round(generation, pending)
        working = pending
        pending.start()
        return pending
    }

    /**
     * Catches up over HTTP now. Fails when more than one bounded round of
     * work remains; call it again to continue.
     */
    public suspend fun reconcile(): Unit = client.serial {
        if (reconcileRound().await()) throw IllegalStateException("Replay work limit reached; explicitly reconcile again")
    }
}
