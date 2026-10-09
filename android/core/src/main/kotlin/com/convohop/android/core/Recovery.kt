package com.convohop.android.core

import com.convohop.android.generated.Operations
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.util.concurrent.ConcurrentHashMap

/** The most recovery records a journal holds. */
internal const val JOURNAL_LIMIT = 128

/**
 * Durable key-value storage for mutation recovery records and replay
 * cursors. Records hold request identities, inputs and outcomes, never
 * tokens. [setItem] must return only after the value is durable; a failure
 * is reported as `RECOVERY_STORAGE_FAILURE`.
 */
public interface RecoveryStorage {
    public suspend fun getItem(key: String): String?

    public suspend fun setItem(key: String, value: String)

    public suspend fun removeItem(key: String)
}

/** In-memory [RecoveryStorage] for tests and short-lived clients; nothing survives the process. */
public class MemoryRecoveryStorage : RecoveryStorage {
    private val values = ConcurrentHashMap<String, String>()

    override suspend fun getItem(key: String): String? = values[key]

    override suspend fun setItem(key: String, value: String) {
        values[key] = value
    }

    override suspend fun removeItem(key: String) {
        values.remove(key)
    }
}

/** A snapshot of one mutation's recovery record. */
public data class RecoveryRecord(
    val requestId: String,
    val incarnation: String,
    val payloadFingerprint: String,
    /** The operation id, such as `communication.sendMessage`. */
    val operation: String,
    val projectId: String?,
    val input: JsonObject,
    val firstSubmittedAt: Long,
    val retryDeadline: Long,
    val attemptCount: Long,
    val lastAttemptAt: Long,
    val lastAttemptClassification: String,
    /** `pending`, `unknown`, `rejected`, `committed` or `accepted`. */
    val resolutionState: String,
    val mediaAdmissionAttempted: Boolean,
)

internal class RecoveryState(
    val requestId: String,
    val incarnation: String,
    val payloadFingerprint: String,
    val operation: String,
    val projectId: String?,
    val input: JsonObject,
    val firstSubmittedAt: Long,
    val retryDeadline: Long,
    var attemptCount: Long,
    var lastAttemptAt: Long,
    var lastAttemptClassification: String,
    var resolutionState: String,
    var mediaAdmissionAttempted: Boolean = false,
) {
    val settled: Boolean get() = resolutionState == "committed" || resolutionState == "accepted"

    /**
     * Whether the request will never be sent again at [now]: the authority committed or accepted it, its retry
     * budget is spent, or the authority rejected it with a code that isn't retryable. A spent budget makes even a
     * `pending` or `unknown` record final, since nothing may resend it.
     */
    fun final(now: Long): Boolean = settled || attemptCount >= 3 || now > retryDeadline ||
        (resolutionState == "rejected" && !retryableCode(lastAttemptClassification))

    fun snapshot(): RecoveryRecord = RecoveryRecord(
        requestId, incarnation, payloadFingerprint, operation, projectId, input, firstSubmittedAt, retryDeadline,
        attemptCount, lastAttemptAt, lastAttemptClassification, resolutionState, mediaAdmissionAttempted,
    )

    fun toJson(): JsonObject = jsonObjectOf(
        "requestId" to requestId.json(),
        "incarnation" to incarnation.json(),
        "payloadFingerprint" to payloadFingerprint.json(),
        "operation" to operation.json(),
        "projectId" to projectId?.json(),
        "input" to input,
        "firstSubmittedAt" to JsonPrimitive(firstSubmittedAt),
        "retryDeadline" to JsonPrimitive(retryDeadline),
        "attemptCount" to JsonPrimitive(attemptCount),
        "lastAttemptAt" to JsonPrimitive(lastAttemptAt),
        "lastAttemptClassification" to lastAttemptClassification.json(),
        "resolutionState" to resolutionState.json(),
        "mediaAdmissionAttempted" to if (mediaAdmissionAttempted) JsonPrimitive(true) else null,
    )

    companion object {
        private val RESOLUTION_STATES = setOf("pending", "unknown", "rejected", "committed", "accepted")

        /** Validates every stored record before any can authorize a resend. */
        fun restore(saved: String): List<RecoveryState> {
            val values = CanonicalJson.parse(saved) as? JsonArray ?: protocolError("Invalid mutation recovery storage")
            if (values.size > JOURNAL_LIMIT) protocolError("Invalid mutation recovery storage")
            val restored = LinkedHashMap<String, RecoveryState>()
            for (item in values) {
                val state = decode(item)
                if (restored.containsKey(state.requestId)) protocolError("Duplicate mutation recovery identity")
                restored[state.requestId] = state
            }
            return restored.values.toList()
        }

        private fun decode(item: JsonElement): RecoveryState {
            val v = item.protocolObject()
            val operation = Operations.byId[v["operation"].protocolString()]?.descriptor
                ?: protocolError("Unknown generated GraphQL operation")
            val resolutionState = v["resolutionState"]
            if (operation.kind != "mutation" || !resolutionState.isJsonString() ||
                resolutionState.protocolString() !in RESOLUTION_STATES
            ) {
                protocolError("Invalid recovery record")
            }
            val projectId = if (v.containsKey("projectId")) parseId(v["projectId"]) else null
            if ((operation.plane == "communication") != (projectId != null)) protocolError("Invalid recovery project scope")
            val clocks = listOf("firstSubmittedAt", "retryDeadline", "attemptCount", "lastAttemptAt").map {
                v[it].safeNonNegativeLong() ?: protocolError("Invalid recovery clock or count")
            }
            val marker = v["mediaAdmissionAttempted"]
            if (marker != null && !(marker.isJsonBoolean() && (marker as JsonPrimitive).content == "true")) {
                protocolError("Invalid native admission marker")
            }
            return RecoveryState(
                requestId = parseId(v["requestId"]),
                incarnation = v["incarnation"].protocolString(),
                payloadFingerprint = v["payloadFingerprint"].protocolString(),
                operation = operation.id,
                projectId = projectId,
                input = v["input"].protocolObject(),
                firstSubmittedAt = clocks[0],
                retryDeadline = clocks[1],
                attemptCount = clocks[2],
                lastAttemptAt = clocks[3],
                lastAttemptClassification = v["lastAttemptClassification"].protocolString(),
                resolutionState = resolutionState.protocolString(),
                mediaAdmissionAttempted = marker != null,
            )
        }
    }
}
