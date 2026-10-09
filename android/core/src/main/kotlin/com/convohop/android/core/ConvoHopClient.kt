package com.convohop.android.core

import com.convohop.android.generated.Capabilities
import com.convohop.android.generated.Cursor
import com.convohop.android.generated.CursorInput
import com.convohop.android.generated.DeleteMessageRequestInput
import com.convohop.android.generated.EditMessageRequestInput
import com.convohop.android.generated.Event
import com.convohop.android.generated.EventPage
import com.convohop.android.generated.EventsRequestInput
import com.convohop.android.generated.GetConversationRequestInput
import com.convohop.android.generated.GetMessageRequestInput
import com.convohop.android.generated.InboxPage
import com.convohop.android.generated.InboxRequestInput
import com.convohop.android.generated.LiveAlertPage
import com.convohop.android.generated.LiveAlertsInput
import com.convohop.android.generated.Member
import com.convohop.android.generated.MemberPage
import com.convohop.android.generated.MembersRequestInput
import com.convohop.android.generated.Message
import com.convohop.android.generated.MessagePage
import com.convohop.android.generated.MessagesRequestInput
import com.convohop.android.generated.OperationSpec
import com.convohop.android.generated.Operations
import com.convohop.android.generated.ReadReceipt
import com.convohop.android.generated.ReceiptPage
import com.convohop.android.generated.ReceiptsRequestInput
import com.convohop.android.generated.ReportReceiptRequestInput
import com.convohop.android.generated.RequestResolution
import com.convohop.android.generated.ResolveRequestRequestInput
import com.convohop.android.generated.SearchPage
import com.convohop.android.generated.SearchRequestInput
import com.convohop.android.generated.SearchScopeInput
import com.convohop.android.generated.SendMessageRequestInput
import com.convohop.android.generated.Session
import com.convohop.android.generated.SessionBootstrap
import com.convohop.android.generated.TypingRequestInput
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlin.math.max
import kotlin.math.min

/**
 * Options for [ConvoHopClient]. The session token stays in memory; it is
 * never written to [recoveryStorage], logs or errors.
 */
public class ConvoHopClientOptions(
    /** The authority's HTTPS origin, or explicit loopback HTTP for local development. */
    public val baseUrl: String,
    public val projectId: String,
    /** The short-lived user session bearer your backend issued. Never ship a backend key in an app. */
    public val sessionToken: String,
    public val incarnation: String,
    public val principalId: String,
    /** Durable storage for mutation recovery records and replay cursors. It never receives credentials. */
    public val recoveryStorage: RecoveryStorage? = null,
    /** Your backend's renewal hook. Without it [ConvoHopClient.refreshSession] is unavailable. */
    public val sessionRefresh: SessionRefresh? = null,
    public val http: HttpEngine = OkHttpEngine(),
    public val realtime: RealtimeConnector = OkHttpRealtimeConnector(),
    public val environment: ConvoHopEnvironment = ConvoHopEnvironment.System,
    /** Runs the client's state machine. The client narrows it to one task at a time. */
    public val dispatcher: CoroutineDispatcher = Dispatchers.IO,
)

/**
 * Renews the current session through your backend. Ask your backend to renew
 * exactly [current] and return the bootstrap it received from ConvoHop. The
 * hook runs on the client's serial dispatcher; switch dispatchers for
 * blocking work. A failure leaves the original renewal's outcome unknown.
 */
public fun interface SessionRefresh {
    public suspend fun refresh(current: Session): SessionBootstrap
}

/** Where session renewal stands. */
public enum class SessionRefreshState {
    /** No [SessionRefresh] hook was configured. */
    DISABLED,

    /** Call [ConvoHopClient.initialize] with the original bearer first. */
    UNINITIALIZED,
    READY,
    REFRESHING,

    /** Renewal could not be verified; HTTP and realtime stay blocked. Retire the client. */
    BLOCKED,
}

/** The authority's receipt for a sent message, checked against the conversation and incarnation. */
public data class SendReceipt(
    val messageId: String,
    val conversationId: String,
    val sequence: String,
    val revision: String,
    val cursor: Cursor,
)

/** Several independent failures, such as a failed renewal and a replay that could not resume. */
public class ConvoHopAggregateException(message: String, public val errors: List<Throwable>) : RuntimeException(message) {
    init {
        for (error in errors) addSuppressed(error)
    }
}

private val EMPTY_INPUT = JsonObject(emptyMap())

private val TRANSIENT_CLASSIFICATIONS = setOf(
    "submitted", "TRANSPORT_UNKNOWN", "OUTCOME_UNKNOWN", "AUTHORITY_UNAVAILABLE", "RETRY_EXHAUSTED",
    "ADMISSION_LIMIT", "HTTP_FAILURE", "INVALID_RESPONSE",
)

/** Waits for [work] and returns its failure, like one entry of `Promise.allSettled`. */
internal suspend fun settle(work: Deferred<*>): Throwable? {
    work.join()
    return try {
        work.await()
        null
    } catch (error: Throwable) {
        error
    }
}

internal fun canonical(session: Session): String = CanonicalJson.encode(session.toJson())

/**
 * The user-session client: conversations, messages, receipts, replay and
 * calls for one principal in one project incarnation.
 *
 * Every operation runs on a private serial dispatcher, so the client is safe
 * to call from any thread. Mutations keep their request ID, payload,
 * incarnation and retry budget across retries; an unknown outcome is
 * reported as unknown, never as rejection or commit. [close] cancels
 * in-flight work; recovery records in storage survive it.
 */
public class ConvoHopClient(options: ConvoHopClientOptions) : AutoCloseable {
    public val projectId: String = requireId(options.projectId, "projectId")
    public val principalId: String = requireId(options.principalId, "principalId")
    internal val environment: ConvoHopEnvironment = options.environment
    internal val realtime: RealtimeConnector = options.realtime
    internal val storage: RecoveryStorage? = options.recoveryStorage
    internal val dispatcher: CoroutineDispatcher = options.dispatcher
    internal val serialDispatcher: CoroutineDispatcher = options.dispatcher.limitedParallelism(1)
    internal val scope: CoroutineScope = CoroutineScope(SupervisorJob() + serialDispatcher)
    internal val http: ConvoHopTransport
    private val sessionRefresh: SessionRefresh? = options.sessionRefresh

    @Volatile
    private var token: String

    @Volatile
    private var session: Session? = null
    private var sessionInitialization: Deferred<Unit>? = null

    @Volatile
    private var refreshing: Deferred<Session>? = null
    private var quiescing: Quiescing? = null

    @Volatile
    private var route: ProjectRoute? = null
    private val streams = LinkedHashSet<ConversationStream>()
    private val replayGenerations = HashMap<String, Int>()

    @Volatile
    private var closed = false

    private class Quiescing {
        val replays = LinkedHashSet<ConversationStream>()
        val work = ArrayList<Deferred<Unit>>()
    }

    init {
        require(isCredential(options.sessionToken)) { "sessionToken must be a non-empty single-line bearer" }
        token = options.sessionToken
        http = ConvoHopTransport(
            options.baseUrl, options.sessionToken, "$projectId:$principalId", requireId(options.incarnation, "incarnation"),
            storage, options.http, environment, scope,
        )
    }

    /** The incarnation this client is bound to. */
    public val incarnation: String get() = http.incarnation

    internal val isClosed: Boolean get() = closed

    /** The verified session binding, once [initialize] ran with a [SessionRefresh] hook. */
    public val sessionBinding: Session? get() = session

    public val sessionRefreshState: SessionRefreshState
        get() = when {
            sessionRefresh == null -> SessionRefreshState.DISABLED
            refreshing != null -> SessionRefreshState.REFRESHING
            http.authentication.blocked -> SessionRefreshState.BLOCKED
            session != null && route != null -> SessionRefreshState.READY
            else -> SessionRefreshState.UNINITIALIZED
        }

    /** Mutation recovery and request resolution. */
    public val requests: Requests = Requests()

    /** Ticks after each verified session renewal, so work held for the session can try again. */
    internal val renewals = MutableSharedFlow<Unit>(extraBufferCapacity = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)

    /** Live-session alerts addressed to this principal. */
    public val liveAlerts: LiveAlerts = LiveAlerts()

    internal suspend fun <T> serial(block: suspend () -> T): T {
        check(!closed) { "ConvoHopClient is closed" }
        return withContext(serialDispatcher) { block() }
    }

    /** Runs [block] on the serial dispatcher without waiting; used for socket callbacks and timers. */
    internal fun post(block: () -> Unit) {
        scope.launch { block() }
    }

    private fun validateRoute(input: JsonElement?): ProjectRoute {
        val value = route(input)
        if (value.projectId != projectId || value.incarnation != http.incarnation) {
            throw ConvoHopProblem("INCARNATION_MISMATCH", environment.uuid(), "rejected", 409, "Explicit session/route recovery required")
        }
        val socket = ProtocolUrl.parse(value.wssUrl)
        val base = ProtocolUrl.parse(http.baseUrl)
        if (origin(value.communicationBase) != http.baseUrl || socket.host != base.host ||
            socket.scheme != (if (base.scheme == "https") "wss" else "ws") || socket.path != "/graphql" ||
            socket.hasCredentials || socket.hasSearch || socket.hasHash
        ) {
            protocolError("Route cannot redirect this client's credentials to another origin or an unsafe socket")
        }
        return value
    }

    /**
     * Loads the signed project route and, with a [SessionRefresh] hook, binds
     * the original session. Call it before [refreshSession].
     */
    public suspend fun initialize(): ProjectRoute = serial {
        val value = validateRoute(http.execute(Operations.Communication.route, projectId, EMPTY_INPUT).result)
        http.servingEpoch = value.servingEpoch
        if (sessionRefresh != null) {
            val initialization = sessionInitialization ?: scope.async {
                val proof = http.execute(Operations.Communication.currentSession, projectId, EMPTY_INPUT)
                val binding = currentSession(proof, environment.now())
                if (binding.principalId != principalId || binding.incarnation != http.incarnation) {
                    throw ConvoHopProblem(
                        "SESSION_REFRESH_REJECTED", proof.requestId, "rejected", 409,
                        "Original session authority does not match this client's principal and incarnation",
                    )
                }
                session = binding
            }.also { sessionInitialization = it }
            try {
                initialization.await()
            } catch (error: Throwable) {
                // A failed enrollment binds nothing, so a later initialize() proves the bearer again instead of repeating the failure.
                if (initialization.isCancelled && sessionInitialization === initialization) sessionInitialization = null
                throw error
            }
        }
        http.servingEpoch = value.servingEpoch
        route = value
        value
    }

    /**
     * Renews the session through the [SessionRefresh] hook. Concurrent calls
     * share one renewal. New requests wait while in-flight ones drain; replays
     * pause and resume on the verified route. When neither the replacement nor
     * the original bearer can be verified, the client stays [SessionRefreshState.BLOCKED].
     */
    public suspend fun refreshSession(): Session = serial {
        refreshing?.let { return@serial it.await() }
        val hook = sessionRefresh
        val binding = session
        val currentRoute = route
        if (hook == null || binding == null || currentRoute == null || sessionExpiry(binding) <= environment.now() ||
            binding.incarnation != http.incarnation
        ) {
            throw ConvoHopProblem(
                "SESSION_REFRESH_REQUIRED", environment.uuid(), "rejected", 409,
                "Configure sessionRefresh and initialize with the original valid bearer before renewal or expiry",
            )
        }
        lateinit var pending: Deferred<Session>
        pending = scope.async(start = CoroutineStart.LAZY) {
            try {
                refreshWith(hook, binding, currentRoute)
            } finally {
                if (refreshing === pending) refreshing = null
            }
        }
        refreshing = pending
        pending.start()
        pending.await()
    }

    /**
     * Renews the session through the [SessionRefresh] hook before it expires,
     * at least 30 seconds and at most 5 minutes ahead. A failed renewal goes to
     * [onError] and is retried with backoff until the session expires; the
     * schedule stops when renewal is [SessionRefreshState.BLOCKED], the session
     * has expired, the returned handle is closed or the client is closed.
     * Initializes the client first if needed. A failed initialization goes to
     * [onError] too; one with a retryable code and a status of 0, 408, 429 or
     * 5xx, or `WRONG_REGION`, is tried again with backoff, never sooner than its
     * `retryAfter`, and any other stops the schedule.
     */
    public fun refreshAutomatically(onError: (Throwable) -> Unit): AutoCloseable {
        require(sessionRefresh != null) { "refreshAutomatically requires a sessionRefresh hook" }
        check(!closed) { "ConvoHopClient is closed" }
        val job = scope.launch {
            var failures = 0
            while (isActive) {
                val binding = try {
                    session ?: initialize().let { session } ?: return@launch
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Exception) {
                    report(onError, error)
                    if (reconnectAction(error) == ReconnectAction.STOP) return@launch
                    failures++
                    val backoff = min(5_000L shl min(failures - 1, 4), 60_000L)
                    delay(max(backoff, retryAfterMillis((error as? ConvoHopProblem)?.retryAfter)))
                    continue
                }
                val now = environment.now()
                val expiry = sessionExpiry(binding)
                if (expiry <= now) {
                    report(
                        onError,
                        ConvoHopProblem(
                            "SESSION_EXPIRED", environment.uuid(), "rejected", 401,
                            "The session expired before it could be renewed; bootstrap a new client",
                        ),
                    )
                    return@launch
                }
                val remaining = expiry - now
                val wait = if (failures == 0) {
                    max(remaining - (remaining / 5).coerceIn(30_000L, 300_000L), 1_000L)
                } else {
                    min(min(5_000L shl min(failures - 1, 4), 60_000L), max(remaining - 1_000L, 0L))
                }
                delay(wait)
                if (session !== binding) {
                    failures = 0
                    continue
                }
                try {
                    refreshSession()
                    failures = 0
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Exception) {
                    report(onError, error)
                    if (sessionRefreshState == SessionRefreshState.BLOCKED) return@launch
                    failures++
                }
            }
        }
        return AutoCloseable { job.cancel() }
    }

    /**
     * Skips the reconnect backoff of every replay that is waiting to
     * reconnect, for example when the device is back online, though never the
     * wait that the authority's `retryAfter` asked for.
     */
    public fun reconnectNow() {
        if (closed) return
        post { for (stream in streams.toList()) stream.reconnectNow() }
    }

    internal fun suspendReplay(stream: ConversationStream) {
        val quiescing = quiescing ?: throw IllegalStateException("Missing replay refresh state")
        if (quiescing.replays.add(stream)) {
            quiescing.work += scope.async(start = CoroutineStart.UNDISPATCHED) { stream.suspendSessionRefresh() }
        }
    }

    private class Barrier(val authentication: TransportAuthentication) {
        private var gate: CompletableDeferred<Unit>? = null

        /** Holds new requests at the barrier, then waits for in-flight ones to settle. */
        suspend fun drain() {
            if (gate == null) gate = CompletableDeferred<Unit>().also { authentication.barrier = it }
            for (work in authentication.active.toList()) work.join()
        }

        fun release() {
            val gate = gate ?: return
            authentication.barrier = null
            gate.complete(Unit)
        }
    }

    private suspend fun refreshWith(hook: SessionRefresh, binding: Session, oldRoute: ProjectRoute): Session {
        val authentication = http.authentication
        val oldToken = token
        val quiescing = Quiescing()
        this.quiescing = quiescing
        val barrier = Barrier(authentication)
        var replacement: Session? = null
        var invalidated = false
        var failure: ConvoHopProblem? = null
        var replayRoute = oldRoute
        try {
            try {
                for (stream in streams.toList()) suspendReplay(stream)
                val retired = quiescing.work.toList().map { settle(it) }
                retired.firstOrNull { it != null }?.let { throw it }
                barrier.drain()
                if (sessionExpiry(binding) <= environment.now()) {
                    throw ConvoHopProblem(
                        "SESSION_REFRESH_REQUIRED", environment.uuid(), "rejected", 409,
                        "Original bearer expired while work drained; explicitly retire and bootstrap a new client",
                    )
                }
                val supplied = try {
                    hook.refresh(binding)
                } catch (error: Exception) {
                    currentCoroutineContext().ensureActive()
                    throw ConvoHopProblem(
                        "SESSION_REFRESH_FAILED", environment.uuid(), "unknown", 0,
                        "Session renewal hook failed; retain the original renewal request and verify its outcome",
                    )
                }
                val bootstrap = SessionBootstrap.fromJson(supplied.toJson(), "SessionBootstrap")
                val candidate = sessionMetadata(bootstrap.session ?: protocolError("Invalid protocol object"))
                val candidateToken = bootstrap.sessionToken
                val candidateExpiry = timestamp(bootstrap.tokenExpiresAt)
                if (!isCredential(candidateToken)) throw IllegalArgumentException("Invalid replacement credential")
                val nextRoute = validateRoute(http.probe(Operations.Communication.route, projectId, candidateToken).result)
                val proof = http.probe(Operations.Communication.currentSession, projectId, candidateToken, nextRoute.servingEpoch)
                val metadata = sessionMetadata(proof.result)
                invalidated = proof.status == "ok" && sameSession(binding, metadata) &&
                    counter(metadata.sessionRevision) > counter(binding.sessionRevision)
                val verified = currentSession(proof, environment.now())
                if (!sameSession(binding, verified) || binding.incarnation != http.incarnation ||
                    counter(verified.sessionRevision) <= counter(binding.sessionRevision) ||
                    sessionExpiry(verified) <= sessionExpiry(binding) || canonical(verified) != canonical(candidate) ||
                    candidateExpiry != verified.expiresAt || timestampMillis(nextRoute.expiresAt) <= environment.now()
                ) {
                    throw ConvoHopProblem(
                        "SESSION_REFRESH_REJECTED", proof.requestId, "unknown", 409,
                        "Replacement must preserve the original session, advance its live revision and expiry, and match authority metadata",
                    )
                }
                token = candidateToken
                authentication.credential = candidateToken
                session = verified
                replacement = verified
                route = nextRoute
                replayRoute = nextRoute
                http.servingEpoch = nextRoute.servingEpoch
                authentication.blocked = false
            } catch (error: Exception) {
                currentCoroutineContext().ensureActive()
                val rejected = error as? ConvoHopProblem ?: ConvoHopProblem(
                    "SESSION_REFRESH_REJECTED", environment.uuid(), "unknown", 409,
                    "Session replacement or application retirement could not be verified", cause = error,
                )
                barrier.drain()
                authentication.blocked = true
                failure = if (!invalidated) {
                    try {
                        val old = currentSession(http.probe(Operations.Communication.currentSession, projectId, oldToken), environment.now())
                        if (canonical(old) != canonical(binding)) protocolError("Original session authority changed")
                        authentication.blocked = false
                        rejected
                    } catch (_: Exception) {
                        currentCoroutineContext().ensureActive()
                        ConvoHopProblem(
                            "SESSION_REFRESH_UNVERIFIED", rejected.requestId, "unknown", 0,
                            "Renewal and original session authority are unverified; HTTP and realtime remain refresh-blocked",
                            cause = rejected,
                        )
                    }
                } else {
                    ConvoHopProblem(
                        "SESSION_REFRESH_UNVERIFIED", rejected.requestId, "unknown", 0,
                        "Authority observed a renewed original session; the old bearer cannot be restored", cause = rejected,
                    )
                }
            }
        } finally {
            this.quiescing = null
            barrier.release()
        }
        if (replacement != null) renewals.tryEmit(Unit)
        if (!authentication.blocked) {
            val resumed = quiescing.replays.toList().map { stream ->
                scope.async(start = CoroutineStart.UNDISPATCHED) { stream.resumeSessionRefresh(replayRoute, token) }
            }
            val errors = ArrayList<Throwable>()
            failure?.let { errors += it }
            for (work in resumed) settle(work)?.let { errors += it }
            if (errors.size > 1) throw ConvoHopAggregateException("Session refresh or replay restoration failed", errors)
            if (errors.isNotEmpty()) throw errors[0]
        }
        failure?.let { throw it }
        return replacement ?: throw IllegalStateException("Missing verified session replacement")
    }

    /** Sends one operation on the serial dispatcher. */
    internal suspend fun <R> execute(spec: OperationSpec<*, R>, input: JsonObject, requestId: String? = null): R =
        serial { http.execute(spec, projectId, input, requestId ?: environment.uuid()) }

    /** A handle for one conversation's messages, mute setting and calls. */
    public fun conversation(conversationId: String): ConversationHandle =
        ConversationHandle(this, requireId(conversationId, "conversationId"))

    /** Loads one live session (call or broadcast) by ID. */
    public suspend fun liveSession(liveSessionId: String): LiveSessionHandle =
        LiveSessionHandle.load(this, requireId(liveSessionId, "liveSessionId"))

    public suspend fun getConversation(conversationId: String): com.convohop.android.generated.Conversation = serial {
        val input = GetConversationRequestInput(requireId(conversationId, "conversationId")).toJson()
        http.execute(Operations.Communication.getConversation, projectId, input).result
            ?: protocolError("Invalid protocol object")
    }

    /** One message by ID, as this principal is currently allowed to see it. */
    public suspend fun getMessage(conversationId: String, messageId: String): Message = serial {
        val id = requireId(conversationId, "conversationId")
        val input = GetMessageRequestInput(id, requireId(messageId, "messageId")).toJson()
        val message = http.execute(Operations.Communication.getMessage, projectId, input).result
            ?: protocolError("Invalid protocol object")
        if (message.conversationId != id || message.messageId != messageId) protocolError("Message scope does not match the request")
        message
    }

    /** Request resolution and mutation recovery. */
    public inner class Requests internal constructor() {
        /** Reads what the authority knows about [requestId] without resending it. */
        public suspend fun resolve(requestId: String): RequestResolution = serial {
            val input = ResolveRequestRequestInput(requireId(requestId, "requestId")).toJson()
            http.execute(Operations.Communication.resolveRequest, projectId, input).result
                ?: protocolError("Missing current request resolution")
        }

        /**
         * Resolves [requestId] and resends the original request only when the
         * authority has not observed it and its retry budget remains.
         */
        public suspend fun retry(requestId: String): RequestResolution = serial { http.retry(requestId) }

        /** Snapshots of the stored recovery records. They never contain credentials. */
        public suspend fun records(): List<RecoveryRecord> = serial { http.recoveryStates() }
    }

    /** Live-session alerts addressed to this principal. */
    public inner class LiveAlerts internal constructor() {
        public suspend fun list(cursor: String? = null, limit: Int? = null): LiveAlertPage = serial {
            http.execute(Operations.Communication.liveSessionAlerts, projectId, LiveAlertsInput(limit, cursor).toJson()).result
        }
    }

    /** The newest 100 messages, or the 100 before [beforeSequence]. */
    public suspend fun messages(conversationId: String, beforeSequence: String? = null): MessagePage = serial {
        val input = MessagesRequestInput(
            requireId(conversationId, "conversationId"), 100, beforeSequence?.let { requireCounter(it, "beforeSequence") },
        ).toJson()
        val page = http.execute(Operations.Communication.messages, projectId, input).result
            ?: protocolError("Invalid protocol object")
        boundedPage(page.items)
        page
    }

    /**
     * Sends a text message with optional application [props]. Pass the same
     * [requestId] to resend after an unknown outcome; a new ID is a new message.
     */
    public suspend fun send(
        conversationId: String,
        text: String,
        requestId: String? = null,
        props: JsonObject = EMPTY_INPUT,
    ): SendReceipt = serial {
        val id = requireId(conversationId, "conversationId")
        val input = SendMessageRequestInput(id, text, props).toJson()
        val result = http.execute(Operations.Communication.sendMessage, projectId, input, requestId ?: environment.uuid()).result
            ?: protocolError("Missing send receipt")
        val cursor = result.cursor ?: protocolError("Invalid protocol object")
        if (result.status != "sent" || result.conversationId != id || cursor.conversationId != id ||
            cursor.sequence != result.sequence || cursor.incarnation != http.incarnation
        ) {
            protocolError("Invalid send receipt scope")
        }
        SendReceipt(result.messageId, result.conversationId, result.sequence, result.revision, cursor)
    }

    /** Replaces the text of [message] if it is still at its revision. */
    public suspend fun edit(message: Message, text: String, requestId: String? = null): Message = serial {
        val input = EditMessageRequestInput(message.conversationId, message.messageId, message.revision, text).toJson()
        http.execute(Operations.Communication.editMessage, projectId, input, requestId ?: environment.uuid()).result
            ?: protocolError("Invalid protocol object")
    }

    /** Deletes [message] if it is still at its revision. */
    public suspend fun delete(message: Message, requestId: String? = null): Message = serial {
        val input = DeleteMessageRequestInput(message.conversationId, message.messageId, message.revision).toJson()
        http.execute(Operations.Communication.deleteMessage, projectId, input, requestId ?: environment.uuid()).result
            ?: protocolError("Invalid protocol object")
    }

    /** Up to 100 authorized events after [after], checked for order and scope. */
    public suspend fun events(conversationId: String, after: Cursor? = null): EventPage = serial {
        val id = requireId(conversationId, "conversationId")
        val input = EventsRequestInput(id, 100, after?.let { CursorInput(it.incarnation, it.conversationId, it.sequence) }).toJson()
        eventPage(http.execute(Operations.Communication.events, projectId, input).result, http.incarnation, id, after)
    }

    /**
     * Reports that this principal read [conversationId] through [throughSequence]
     * under [membership], which also covers delivery. Returns its current receipt.
     */
    public suspend fun reportRead(conversationId: String, membership: Member, throughSequence: String): ReadReceipt =
        reportReceipt("read", conversationId, membership, throughSequence)

    /**
     * Reports that this principal received [conversationId] through
     * [throughSequence] under [membership], for example when a push arrives.
     * Returns its current receipt.
     */
    public suspend fun reportDelivered(conversationId: String, membership: Member, throughSequence: String): ReadReceipt =
        reportReceipt("delivered", conversationId, membership, throughSequence)

    private suspend fun reportReceipt(kind: String, conversationId: String, membership: Member, throughSequence: String): ReadReceipt =
        serial {
            val id = requireId(conversationId, "conversationId")
            require(membership.conversationId == id) { "membership must belong to conversationId" }
            val input = ReportReceiptRequestInput(
                id, kind, membership.membershipEpoch, membership.visibilityEpoch, requireCounter(throughSequence, "throughSequence"),
            ).toJson()
            val receipt = http.execute(Operations.Communication.reportReceipt, projectId, input).result
                ?: protocolError("Invalid protocol object")
            if (receipt.principalId != principalId) protocolError("Receipt does not belong to this principal")
            receipt
        }

    /** The members' current read receipts. */
    public suspend fun receipts(conversationId: String): ReceiptPage = serial {
        val input = ReceiptsRequestInput(requireId(conversationId, "conversationId"), 100).toJson()
        val page = http.execute(Operations.Communication.receipts, projectId, input).result
            ?: protocolError("Invalid protocol object")
        boundedPage(page.items)
        page
    }

    /** One page of [conversationId]'s members: up to [limit] (1 to 100), after [cursor] from the previous page. */
    public suspend fun members(conversationId: String, cursor: String? = null, limit: Int = 100): MemberPage = serial {
        val id = requireId(conversationId, "conversationId")
        val input = MembersRequestInput(id, pageLimit(limit), cursor).toJson()
        val page = http.execute(Operations.Communication.members, projectId, input).result
            ?: protocolError("Invalid protocol object")
        boundedPage(page.items, limit)
        if (page.items.any { it.conversationId != id }) protocolError("Member is outside this conversation")
        page
    }

    /**
     * One page of the conversations this principal can see: up to [limit]
     * (1 to 100), after [cursor] from the previous page. A page with a
     * `partialReason` is incomplete for that reason.
     */
    public suspend fun inbox(cursor: String? = null, limit: Int = 100): InboxPage = serial {
        val input = InboxRequestInput(pageLimit(limit), cursor).toJson()
        val page = http.execute(Operations.Communication.inbox, projectId, input).result
            ?: protocolError("Invalid protocol object")
        boundedPage(page.items, limit)
        for (item in page.items) {
            val latest = item.latestVisibleMessage ?: continue
            if (latest.conversationId != item.conversationId) protocolError("Inbox item conversation scope does not match its message")
        }
        page
    }

    /**
     * The project's features, limits and media policy. Check `features?.typing`
     * before sending typing signals and `features?.inbox` before listing the inbox.
     */
    public suspend fun capabilities(): Capabilities = serial {
        http.execute(Operations.Communication.capabilities, projectId, EMPTY_INPUT).result
            ?: protocolError("Missing project capabilities")
    }

    /** Lexical search across readable conversations, optionally limited to [conversationIds]. */
    public suspend fun search(query: String, conversationIds: List<String>? = null): SearchPage = serial {
        val searchScope = conversationIds?.let { ids -> SearchScopeInput(ids.map { requireId(it, "conversationId") }) }
        val input = SearchRequestInput(query, 100, searchScope).toJson()
        val page = http.execute(Operations.Communication.search, projectId, input).result
            ?: protocolError("Invalid protocol object")
        boundedPage(page.items)
        for (hit in page.items) {
            val message = hit.message ?: protocolError("Invalid protocol object")
            if (message.conversationId != hit.conversationId) protocolError("Search hit conversation scope does not match its message")
        }
        page
    }

    /**
     * Sends an ephemeral typing signal. It is not recorded for recovery and is
     * never retried; returns whether the authority accepted it. Check
     * `features?.typing` in [capabilities] first.
     */
    public suspend fun typing(conversationId: String, isTyping: Boolean): Boolean = serial {
        val input = TypingRequestInput(requireId(conversationId, "conversationId"), isTyping).toJson()
        http.execute(Operations.Communication.typing, projectId, input).result?.accepted == true
    }

    /**
     * Settles up to 16 stored mutations that may still come to something: those
     * whose outcome is pending or unknown, and those rejected with a retryable
     * code. Resends the original when its last attempt failed transiently and
     * budget remains, otherwise resolves it read-only. Failures go to [onError].
     */
    public suspend fun recoverPending(onError: (Throwable) -> Unit): Unit = serial {
        val pending = http.recoveryStates()
            .filter {
                it.resolutionState == "pending" || it.resolutionState == "unknown" ||
                    (it.resolutionState == "rejected" && retryableCode(it.lastAttemptClassification))
            }
            .take(16)
        for (state in pending) {
            val transient = state.lastAttemptClassification in TRANSIENT_CLASSIFICATIONS
            val now = environment.now()
            val resend = transient && state.attemptCount < 3 && now >= state.lastAttemptAt && now >= state.firstSubmittedAt &&
                now <= state.retryDeadline
            try {
                if (resend) requests.retry(state.requestId) else requests.resolve(state.requestId)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                report(onError, error)
            }
        }
    }

    /**
     * Replays [conversationId] from its stored cursor, then follows it live.
     * [apply] receives each authorized batch in order on the client's serial
     * dispatcher; the cursor advances only after it returns. Do not await
     * [refreshSession] inside [apply].
     */
    public suspend fun watch(
        conversationId: String,
        apply: suspend (List<Event>) -> Unit,
        onError: (Throwable) -> Unit,
    ): ConversationStream = serial { openReplay(requireId(conversationId, "conversationId"), apply, onError, false) }

    /**
     * Like [watch], but replays from [after] and leaves the stored cursor
     * alone; for views that load a current snapshot before following changes.
     */
    internal suspend fun watchFrom(
        conversationId: String,
        after: Cursor,
        apply: suspend (List<Event>) -> Unit,
        onError: (Throwable) -> Unit,
        onOpen: (ConversationStream) -> Unit,
    ): ConversationStream = serial { openReplay(requireId(conversationId, "conversationId"), apply, onError, false, after, onOpen) }

    /**
     * Closes every replay of [conversationId] and replays authorized history
     * from the start, ignoring the stored cursor until the first batch
     * replaces it. Use it when the authority requires resynchronization.
     */
    public suspend fun resyncAuthorizedHistory(
        conversationId: String,
        apply: suspend (List<Event>) -> Unit,
        onError: (Throwable) -> Unit,
    ): ConversationStream = serial {
        checkReplayAdmission()
        val id = requireId(conversationId, "conversationId")
        replayGenerations[id] = (replayGenerations[id] ?: 0) + 1
        for (stream in streams.toList()) if (stream.conversationId == id) stream.closeNow()
        openReplay(id, apply, onError, true)
    }

    private fun checkReplayAdmission() {
        if (http.authentication.blocked || quiescing != null) {
            throw ConvoHopProblem(
                "SESSION_REFRESH_REQUIRED", environment.uuid(), "rejected", 409,
                "Session refresh holds replay admission; await verified refresh before opening or resynchronizing history",
            )
        }
    }

    private fun checkGeneration(conversationId: String, generation: Int) {
        if (generation != (replayGenerations[conversationId] ?: 0)) {
            throw IllegalStateException("History watcher superseded by explicit resynchronization")
        }
    }

    private suspend fun openReplay(
        conversationId: String,
        apply: suspend (List<Event>) -> Unit,
        onError: (Throwable) -> Unit,
        resync: Boolean,
        after: Cursor? = null,
        onOpen: ((ConversationStream) -> Unit)? = null,
    ): ConversationStream {
        checkReplayAdmission()
        val generation = replayGenerations[conversationId] ?: 0
        for (stream in streams.filter { it.conversationId == conversationId && it.closed }) stream.retire()
        val initial = route ?: initialize()
        val saved = after ?: if (resync) null else ConversationStream.loadCursor(this, conversationId)
        checkReplayAdmission()
        checkGeneration(conversationId, generation)
        lateinit var realtime: ConversationStream
        realtime = ConversationStream(this, conversationId, route ?: initial, token, saved, apply, onError, after == null) {
            streams.remove(realtime)
        }
        streams.add(realtime)
        onOpen?.invoke(realtime)
        if (quiescing != null) suspendReplay(realtime)
        try {
            if (resync) realtime.resyncAuthorizedHistory() else realtime.start()
            checkReplayAdmission()
            checkGeneration(conversationId, generation)
            return realtime
        } catch (error: Throwable) {
            realtime.closeNow()
            throw error
        }
    }

    /** Closes every replay and cancels in-flight work. Later calls fail. */
    override fun close() {
        if (closed) return
        closed = true
        scope.launch {
            for (stream in streams.toList()) stream.closeNow()
            scope.cancel()
        }
    }
}

/** Delivers [error] to an application callback; a throwing callback must not break the SDK's state machine. */
internal fun report(onError: (Throwable) -> Unit, error: Throwable) {
    try {
        onError(error)
    } catch (_: Exception) {
    }
}
