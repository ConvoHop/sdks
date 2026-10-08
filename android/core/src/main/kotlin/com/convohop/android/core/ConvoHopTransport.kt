package com.convohop.android.core

import com.convohop.android.generated.OperationSpec
import com.convohop.android.generated.Operations
import com.convohop.android.generated.RequestResolution
import com.convohop.android.generated.ResolveRequestReply
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.async
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject

private const val REQUEST_TIMEOUT_MILLIS = 12_000L
private const val MAX_RESPONSE_CHARS = 1_048_576

/** Session custody the transport shares only with the client that constructed it. */
internal class TransportAuthentication(var credential: String?) {
    var barrier: CompletableDeferred<Unit>? = null

    @Volatile
    var blocked: Boolean = false
    val active: MutableSet<Deferred<*>> = LinkedHashSet()
}

/** A validated authority envelope and its decoded form. */
internal class Reply(val raw: JsonObject, val decoded: Any?)

/**
 * The authority HTTP transport and mutation ledger. Every member must run on
 * the owning client's serial dispatcher, the analogue of the reference SDK's
 * single event loop; [scope] runs work that outlives a cancelled caller.
 */
internal class ConvoHopTransport(
    baseUrl: String,
    credential: String?,
    namespace: String,
    var incarnation: String,
    private val storage: RecoveryStorage?,
    private val http: HttpEngine,
    private val environment: ConvoHopEnvironment,
    private val scope: CoroutineScope,
) {
    val baseUrl: String = origin(baseUrl)
    val authentication: TransportAuthentication = TransportAuthentication(credential)
    var servingEpoch: String? = null
    private val storageKey = "convohop.requests:$namespace"
    private val states = LinkedHashMap<String, RecoveryState>()
    private val activeMutations = HashMap<String, ActiveMutation>()
    private var initialization: Deferred<Unit>? = null
    private val writes = Mutex()

    private class ActiveMutation(val identity: String, val work: Deferred<Reply>)

    /** Loads and validates stored records once; a failure is memoized like the result. */
    suspend fun initializeRecovery() {
        val storage = storage ?: return
        val loading = initialization ?: scope.async {
            val saved = storage.getItem(storageKey)
            if (saved != null && saved.isEmpty()) protocolError("Invalid asynchronous mutation recovery storage")
            if (saved != null) for (state in RecoveryState.restore(saved)) states[state.requestId] = state
        }.also { initialization = it }
        loading.await()
    }

    suspend fun recoveryStates(): List<RecoveryRecord> {
        initializeRecovery()
        return states.values.map { it.snapshot() }
    }

    /** Persists the native attempt boundary without retaining the bearer grant. */
    suspend fun markMediaAdmissionAttempted(requestId: String) {
        parseId(requestId)
        initializeRecovery()
        val state = states[requestId]
        if (state == null || state.operation != "communication.liveSessionCredentials" || state.resolutionState != "committed") {
            throw IllegalStateException("Native admission requires a committed credential issuance")
        }
        state.lastAttemptClassification = "nativeAdmissionAttempted"
        state.mediaAdmissionAttempted = true
        persist(state)
    }

    /** Writes a full snapshot; snapshots reach storage in the order they were taken. */
    private suspend fun persist(state: RecoveryState) {
        val storage = storage ?: return
        val snapshot = CanonicalJson.encode(JsonArray(states.values.map { it.toJson() }))
        withContext(NonCancellable) {
            writes.withLock {
                try {
                    storage.setItem(storageKey, snapshot)
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Exception) {
                    val outcome = if (state.resolutionState == "pending") "unknown" else state.resolutionState
                    throw ConvoHopProblem(
                        "RECOVERY_STORAGE_FAILURE", state.requestId, outcome, 0,
                        "Recovery storage did not confirm durability; retain the original request and its outcome",
                        cause = error,
                    )
                }
            }
        }
    }

    /** Sends one operation; mutations go through the ledger, ephemeral signals do not. */
    suspend fun <R> execute(
        spec: OperationSpec<*, R>,
        projectId: String?,
        input: JsonObject,
        requestId: String = environment.uuid(),
    ): R {
        val incarnation = this.incarnation
        plan(spec.descriptor.id, projectId, input, requestId)
        return authorized(requestId) { credential -> executeWith(spec, projectId, input, requestId, incarnation, credential) }
    }

    /** Sends a session probe with an explicit credential, bypassing the refresh barrier. */
    suspend fun <R> probe(spec: OperationSpec<*, R>, projectId: String, credential: String, observedServingEpoch: String? = null): R =
        executeWith(
            spec, projectId, JsonObject(emptyMap()), environment.uuid(), incarnation, credential,
            observedServingEpoch ?: servingEpoch,
        )

    private suspend fun <T> authorized(requestId: String, work: suspend (String?) -> T): T {
        while (true) {
            val authentication = authentication
            if (authentication.blocked) {
                val state = states[requestId]
                val outcome = when (state?.resolutionState) {
                    null -> "rejected"
                    "pending" -> "unknown"
                    else -> state.resolutionState
                }
                throw ConvoHopProblem(
                    "SESSION_REFRESH_REQUIRED", requestId, outcome, 409,
                    "Session authority is unverified; recover the original renewal or explicitly retire this client",
                )
            }
            val barrier = authentication.barrier
            if (barrier != null) {
                barrier.await()
                continue
            }
            val credential = authentication.credential
            lateinit var pending: Deferred<T>
            pending = scope.async(start = CoroutineStart.LAZY) {
                try {
                    work(credential)
                } finally {
                    authentication.active.remove(pending)
                }
            }
            authentication.active.add(pending)
            pending.start()
            return pending.await()
        }
    }

    private suspend fun <R> executeWith(
        spec: OperationSpec<*, R>,
        projectId: String?,
        body: JsonObject,
        requestId: String,
        incarnation: String,
        credential: String?,
        observedServingEpoch: String? = servingEpoch,
    ): R {
        val operation = spec.descriptor
        plan(operation.id, projectId, body, requestId)
        initializeRecovery()
        if (this.incarnation != incarnation) throw incarnationMismatch(requestId)
        val reply = if (operation.kind == "mutation" && operation.idempotency != "ephemeral") {
            mutate(operation.id, projectId, body, requestId, credential)
        } else {
            request(operation.id, projectId, body, requestId, credential, observedServingEpoch)
        }
        if (operation.id == "communication.resolveRequest") settleResolution(reply, body, projectId, requestId)
        @Suppress("UNCHECKED_CAST")
        return reply.decoded as R
    }

    private suspend fun settleResolution(reply: Reply, body: JsonObject, projectId: String?, requestId: String) {
        val target = body["requestId"].protocolString()
        val state = states[target]
        val resolution = (reply.decoded as ResolveRequestReply).result ?: protocolError("Invalid protocol object")
        val receipt = resolution.receipt
        if (resolution.requestId != target || (receipt != null && receipt.requestId != target)) {
            throw ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", 503, "Request resolution identity changed")
        }
        if (state != null && (state.projectId != projectId || state.incarnation != incarnation)) {
            throw resolutionRequired(requestId, "Resolve within the original project and incarnation")
        }
        if (state != null && (resolution.state == "committed" || resolution.state == "accepted")) {
            if (state.resolutionState != "committed") state.resolutionState = resolution.state
            state.lastAttemptClassification = "authorityReceipt"
            persist(state)
        }
    }

    private suspend fun mutate(
        operation: String,
        projectId: String?,
        input: JsonObject,
        requestId: String,
        credential: String?,
        retry: Boolean = false,
    ): Reply {
        parseId(requestId)
        val incarnation = this.incarnation
        val identity = CanonicalJson.encode(
            jsonObjectOf(
                "operation" to operation.json(),
                "projectId" to (projectId?.json() ?: JsonNull),
                "input" to input,
                "incarnation" to incarnation.json(),
            ),
        )
        val active = activeMutations[requestId]
        if (active != null) {
            if (active.identity != identity) throw idempotencyConflict(requestId)
            return active.work.await()
        }
        lateinit var work: Deferred<Reply>
        work = scope.async(start = CoroutineStart.LAZY) {
            try {
                admit(operation, projectId, input, requestId, incarnation, credential, retry)
            } finally {
                if (activeMutations[requestId]?.work === work) activeMutations.remove(requestId)
            }
        }
        activeMutations[requestId] = ActiveMutation(identity, work)
        work.start()
        return work.await()
    }

    private suspend fun admit(
        operation: String,
        projectId: String?,
        input: JsonObject,
        requestId: String,
        incarnation: String,
        credential: String?,
        retry: Boolean,
    ): Reply {
        val hash = CanonicalJson.fingerprint(
            jsonObjectOf("operation" to operation.json(), "projectId" to (projectId?.json() ?: JsonNull), "input" to input),
        )
        if (this.incarnation != incarnation) throw incarnationMismatch(requestId)
        var state = states[requestId]
        if (state != null && (state.payloadFingerprint != hash || state.incarnation != incarnation ||
                state.operation != operation || state.projectId != projectId ||
                CanonicalJson.encode(state.input) != CanonicalJson.encode(input))
        ) {
            throw idempotencyConflict(requestId)
        }
        if (retry && (state == null || state.settled || state.mediaAdmissionAttempted)) {
            throw resolutionRequired(requestId, "The original request is no longer eligible for resend")
        }
        if (state == null) {
            if (states.size >= 128) {
                val settled = states.values.firstOrNull { it.settled && !activeMutations.containsKey(it.requestId) }
                    ?: throw IllegalStateException("Resolve outstanding mutations before creating more")
                states.remove(settled.requestId)
            }
            val now = environment.now()
            state = RecoveryState(
                requestId, incarnation, hash, operation, projectId, input,
                firstSubmittedAt = now, retryDeadline = now + 60_000, attemptCount = 0, lastAttemptAt = now,
                lastAttemptClassification = "notSubmitted", resolutionState = "pending",
            )
            states[requestId] = state
            persist(state)
        }
        return submit(state, credential, retry)
    }

    private suspend fun submit(state: RecoveryState, credential: String?, retry: Boolean): Reply {
        if (state.incarnation != incarnation) throw incarnationMismatch(state.requestId)
        val now = environment.now()
        if (state.attemptCount >= 3 || now > state.retryDeadline || now < state.firstSubmittedAt || now < state.lastAttemptAt) {
            throw resolutionRequired(state.requestId, "Retry budget expired or clock changed; resolve this request read-only")
        }
        state.attemptCount += 1
        state.lastAttemptAt = now
        if (state.resolutionState == "pending") state.resolutionState = "unknown"
        state.lastAttemptClassification = "submitted"
        persist(state)
        if (state.incarnation != incarnation) throw incarnationMismatch(state.requestId)
        val submittingAt = environment.now()
        if (submittingAt > state.retryDeadline || submittingAt < state.firstSubmittedAt || submittingAt < state.lastAttemptAt ||
            (retry && (state.settled || state.mediaAdmissionAttempted))
        ) {
            throw resolutionRequired(state.requestId, "The original request is no longer eligible for resend")
        }
        val reply: Reply
        val outcome: String
        try {
            reply = request(state.operation, state.projectId, state.input, state.requestId, credential)
            outcome = reply.raw["status"].protocolString()
            if (outcome != "committed" && outcome != "accepted") protocolError("A mutation requires authority receipt evidence")
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            state.lastAttemptClassification = (error as? ConvoHopProblem)?.code ?: "opaqueTransportFailure"
            persist(state)
            throw error
        }
        if (state.resolutionState != "committed") state.resolutionState = outcome
        state.lastAttemptClassification = "authorityReceipt"
        persist(state)
        return reply
    }

    /** Resolves [requestId] read-only and resends it only when the authority has not observed it and budget remains. */
    suspend fun retry(requestId: String): RequestResolution {
        parseId(requestId)
        return authorized(requestId) { credential -> retryWith(requestId, credential) }
    }

    private suspend fun retryWith(requestId: String, credential: String?): RequestResolution {
        initializeRecovery()
        val state = states[requestId]
            ?: throw IllegalStateException("No recovery record exists; do not invent a replacement identity")
        if (state.incarnation != incarnation) throw incarnationMismatch(requestId)
        val lookup = jsonObjectOf("requestId" to requestId.json())
        val resolve = Operations.Communication.resolveRequest
        val resolution = executeWith(resolve, state.projectId, lookup, environment.uuid(), incarnation, credential).result
            ?: protocolError("Missing current request resolution")
        if (resolution.state == "committed" || resolution.state == "accepted") return resolution
        if (resolution.state != "notObservedYet") protocolError("Unknown request resolution state")
        if (state.settled || state.mediaAdmissionAttempted) {
            throw resolutionRequired(requestId, "Previously observed commit or native admission cannot be retried from absent evidence")
        }
        val hash = CanonicalJson.fingerprint(
            jsonObjectOf(
                "operation" to state.operation.json(),
                "projectId" to (state.projectId?.json() ?: JsonNull),
                "input" to state.input,
            ),
        )
        if (hash != state.payloadFingerprint) throw IllegalStateException("Recovery input fingerprint changed")
        mutate(state.operation, state.projectId, state.input, state.requestId, credential, retry = true)
        return executeWith(resolve, state.projectId, lookup, environment.uuid(), incarnation, credential).result
            ?: protocolError("Missing current request resolution")
    }

    private fun plan(
        key: String,
        projectId: String?,
        input: JsonObject,
        requestId: String,
        observedServingEpoch: String? = servingEpoch,
    ): GraphqlPlan =
        try {
            val context = jsonObjectOf(
                "requestId" to parseId(requestId).json(),
                "projectId" to projectId?.let { parseId(it).json() },
                "incarnation" to incarnation.takeIf { it != "management" }?.json(),
                "observedServingEpoch" to observedServingEpoch?.json(),
            )
            buildGraphqlRequest(key, input, context)
        } catch (error: RuntimeException) {
            throw ConvoHopProblem("INVALID_REQUEST", requestId, "rejected", 400, error.message ?: "Invalid SDK operation")
        }

    private suspend fun request(
        key: String,
        projectId: String?,
        input: JsonObject,
        requestId: String,
        credential: String?,
        observedServingEpoch: String? = servingEpoch,
    ): Reply {
        val plan = plan(key, projectId, input, requestId, observedServingEpoch)
        val headers = linkedMapOf("accept" to "application/json", "content-type" to "application/json")
        if (credential != null) headers["authorization"] = "Bearer $credential"
        val exchange = HttpRequest(
            baseUrl + "/graphql", headers, CanonicalJson.encode(plan.body), REQUEST_TIMEOUT_MILLIS, 3L * MAX_RESPONSE_CHARS,
        )
        val response = try {
            http.post(exchange)
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            throw ConvoHopProblem("TRANSPORT_UNKNOWN", requestId, "unknown", 0, "Authority response unavailable; resolve the original request")
        }
        val text = try {
            response.text()
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            throw ConvoHopProblem("TRANSPORT_UNKNOWN", requestId, "unknown", 0, "Incomplete authority response; resolve the original request")
        }
        val status = response.status
        if (text == null || text.length > MAX_RESPONSE_CHARS) {
            throw ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", status, "Authority response exceeds the bound")
        }
        val decoded = try {
            CanonicalJson.parse(text)
        } catch (_: ConvoHopProtocolException) {
            throw ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", status, "Unrecognized authority response")
        }
        try {
            val graphql = decoded.protocolObject()
            val errors = graphql["errors"]
            if (errors is JsonArray && errors.isNotEmpty()) {
                val error = errors[0].protocolObject()
                val extensions = error["extensions"].let { if (it == null || it is JsonNull) JsonObject(emptyMap()) else it.protocolObject() }
                throw authorityProblem(
                    extensions["code"].stringOrNull() ?: "GRAPHQL_ERROR", requestId,
                    extensions["outcome"].stringOrNull() ?: "unknown",
                    extensions["status"].intOrNull() ?: 503,
                    error["message"].stringOrNull() ?: "GraphQL rejected the request",
                    retryDelay(extensions["retryAfter"]) ?: retryDelay(response.header("retry-after")),
                )
            }
            if (status !in 200..299) {
                throw authorityProblem(
                    graphql["code"].stringOrNull() ?: "HTTP_FAILURE", requestId,
                    graphql["outcome"].stringOrNull() ?: "unknown", status,
                    graphql["message"].stringOrNull() ?: "Authority rejected the request",
                    retryDelay(graphql["retryAfter"]) ?: retryDelay(response.header("retry-after")),
                )
            }
            val operation = plan.spec.descriptor
            val value = graphql["data"].protocolObject()[operation.field].protocolObject()
            val result = decodeChecked(plan.spec, value)
            val outcome = value["status"].protocolString()
            if (outcome != "ok" && outcome != "committed" && outcome != "accepted") protocolError("Unrecognized authority envelope")
            if (parseId(value["requestId"]) != requestId) {
                throw ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", status, "Mismatched authority request identity")
            }
            if (operation.kind == "mutation" && operation.idempotency != "ephemeral") {
                when (outcome) {
                    "committed" -> {
                        parseId(value["receiptId"])
                        timestamp(value["committedAt"])
                        if (!value["replayed"].isJsonBoolean()) protocolError("Expected a protocol boolean")
                    }
                    "accepted" -> parseId(value["operation"].protocolObject()["operationId"])
                    else -> protocolError("A mutation requires authority receipt evidence")
                }
            }
            return Reply(value, result)
        } catch (error: RuntimeException) {
            if (!error.isProtocolViolation()) throw error
            throw ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", status, "Malformed authority response; resolve the original request")
        }
    }

    private fun idempotencyConflict(requestId: String): ConvoHopProblem =
        ConvoHopProblem("IDEMPOTENCY_CONFLICT", requestId, "unknown", 409, "Preserve the original request and payload")

    private fun incarnationMismatch(requestId: String): ConvoHopProblem =
        ConvoHopProblem("INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation")

    private fun resolutionRequired(requestId: String, message: String): ConvoHopProblem =
        ConvoHopProblem("RESOLUTION_REQUIRED", requestId, "unknown", 409, message)
}
