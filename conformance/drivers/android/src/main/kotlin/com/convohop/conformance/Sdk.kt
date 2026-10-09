package com.convohop.conformance

import com.convohop.android.core.ConversationStream
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.core.ConvoHopClientOptions
import com.convohop.android.core.ConvoHopProblem
import com.convohop.android.core.MemoryRecoveryStorage
import com.convohop.android.core.OkHttpEngine
import com.convohop.android.core.OkHttpRealtimeConnector
import com.convohop.android.core.ProjectRoute
import com.convohop.android.core.RecoveryStorage
import com.convohop.android.core.ReplayState
import com.convohop.android.core.SendReceipt
import com.convohop.android.generated.Cursor
import com.convohop.android.generated.Message
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.OkHttpClient
import java.math.BigInteger

// The only driver file that imports the SDK: retarget the driver here.

internal val ROLES = listOf("user", "backend", "management")

/** The roles this driver declares. The Android SDK is a user client; the runner's fixture driver serves the rest. */
internal val DECLARED = listOf("user")

internal val FEATURES = listOf("realtime", "realtime.reconnectPolicy", "recovery.eviction", "recovery.storage", "retryAfter")

/** The catalog operations of the user role, in the order hello declares them. */
internal val OPERATIONS = listOf(
    "route.initialize", "conversations.get", "messages.list", "messages.send", "messages.edit", "messages.delete",
    "events.list", "requests.resolve", "requests.retry",
)

/** One connection pool and dispatcher for every client, as an application would share them. */
private val HTTP = OkHttpClient()

/** An in-memory recovery store; every client created with the same storage name shares one. */
internal class Storage {
    val sdk: RecoveryStorage = MemoryRecoveryStorage()
}

/** Language-neutral projection of an SDK failure (spec/conformance/driver-protocol.md). */
internal fun driverError(error: Throwable): JsonObject = buildJsonObject {
    if (error is ConvoHopProblem) {
        put("code", error.code)
        // The SDK reports "no authority response" as status 0; the protocol uses null.
        put("status", if (error.status == 0) JsonNull else JsonPrimitive(error.status))
        put("outcome", error.outcome)
        put("requestId", error.requestId)
        put("retryAfterMs", error.retryAfter?.let { JsonPrimitive(it * 1000) } ?: JsonNull)
        put("message", error.message)
    } else {
        put("code", "SDK_ERROR")
        put("status", JsonNull)
        put("outcome", JsonNull)
        put("requestId", JsonNull)
        put("retryAfterMs", JsonNull)
        put("message", error.message ?: error.javaClass.simpleName)
    }
}

/** The driver's view of a realtime subscription. */
internal interface RealtimeHandle {
    val closed: Boolean

    /** The sequence of the last position the SDK applied and stored, if any. */
    val storedSequence: BigInteger?

    fun close()
}

/** Receives a subscription's events, as protocol JSON, and its failures, as driver errors. */
internal interface RealtimeSink {
    fun events(events: List<JsonObject>)

    fun error(error: JsonObject)
}

/** A user client: the SDK's [ConvoHopClient], built without network I/O. */
internal class UserClient private constructor(private val sdk: ConvoHopClient) {
    fun implements(operation: String): Boolean = operation in OPERATIONS

    /** Runs [operation]. Decoding failures throw [ParamsException]; SDK failures propagate unchanged. */
    suspend fun run(operation: String, args: JsonObject): JsonElement = when (operation) {
        "route.initialize" -> route(sdk.initialize())
        "conversations.get" -> sdk.getConversation(args.text("conversationId")).toJson()
        "messages.list" -> sdk.messages(own(args).text("conversationId"), args.optionalText("beforeSequence")).toJson()
        "messages.send" ->
            receipt(sdk.send(own(args).text("conversationId"), args.text("text"), args.optionalText("requestId")))
        "messages.edit" -> sdk.edit(message(args), args.text("text"), args.optionalText("requestId")).toJson()
        "messages.delete" -> sdk.delete(message(args), args.optionalText("requestId")).toJson()
        "events.list" -> sdk.events(args.text("conversationId"), cursor(args)).toJson()
        "requests.resolve" -> sdk.requests.resolve(args.text("requestId")).toJson()
        "requests.retry" -> sdk.requests.retry(args.text("requestId")).toJson()
        else -> throw ProtocolException("UNSUPPORTED", "The user role does not implement $operation")
    }

    /** Opens the SDK's replay-then-subscribe watcher; returns once the initial catch-up has been applied. */
    suspend fun watch(conversationId: String, sink: RealtimeSink): RealtimeHandle {
        val stream = sdk.watch(
            conversationId,
            { events -> sink.events(events.map { it.toJson() }) },
            { failure -> sink.error(driverError(failure)) },
        )
        return Watch(stream)
    }

    fun close() {
        sdk.close()
    }

    companion object {
        /** Constructor validation failures are INVALID_PARAMS, as in the reference driver. */
        fun create(
            baseUrl: String,
            credential: String,
            projectId: String?,
            incarnation: String?,
            principalId: String?,
            storage: Storage?,
        ): UserClient {
            val options = ConvoHopClientOptions(
                baseUrl = baseUrl,
                projectId = required(projectId, "projectId"),
                sessionToken = credential,
                incarnation = required(incarnation, "incarnation"),
                principalId = required(principalId, "principalId"),
                recoveryStorage = storage?.sdk,
                http = OkHttpEngine(HTTP),
                realtime = OkHttpRealtimeConnector(HTTP),
            )
            return try {
                UserClient(ConvoHopClient(options))
            } catch (error: RuntimeException) {
                throw ParamsException(error.message ?: "Invalid client options")
            }
        }
    }
}

private class Watch(private val stream: ConversationStream) : RealtimeHandle {
    // CLOSED is published only after the replay reported why it failed, so collect never sees a close without its reason.
    override val closed: Boolean get() = stream.state.value == ReplayState.CLOSED

    // The SDK advances its cursor only after storing it, so this is the position a restart resumes after.
    override val storedSequence: BigInteger? get() = stream.cursor?.sequence?.toBigIntegerOrNull()

    override fun close() {
        stream.close()
    }
}

private fun required(value: String?, name: String): String = value ?: throw ParamsException("$name is required for this role")

// A user session always acts as its own principal; silently ignoring actAs would hide a scenario error.
private fun own(args: JsonObject): JsonObject {
    if (args.containsKey("actAs")) throw ParamsException("actAs is only available to backend clients")
    return args
}

private fun <T> decode(value: JsonElement?, name: String, parse: (JsonElement) -> T): T = try {
    parse(value ?: JsonNull)
} catch (_: RuntimeException) {
    throw ParamsException("$name is not a valid protocol value")
}

private fun message(args: JsonObject): Message = decode(args["message"], "message") { Message.fromJson(it) }

private fun cursor(args: JsonObject): Cursor? =
    if (args.containsKey("after")) decode(args["after"], "after") { Cursor.fromJson(it) } else null

private fun route(value: ProjectRoute): JsonObject = buildJsonObject {
    put("projectId", value.projectId)
    put("incarnation", value.incarnation)
    put("servingEpoch", value.servingEpoch)
    put("communicationBase", value.communicationBase)
    put("wssUrl", value.wssUrl)
    put("expiresAt", value.expiresAt)
    put("signature", value.signature)
}

private fun receipt(value: SendReceipt): JsonObject = buildJsonObject {
    put("messageId", value.messageId)
    put("conversationId", value.conversationId)
    put("sequence", value.sequence)
    put("revision", value.revision)
    // The SDK accepts only sent receipts.
    put("status", "sent")
    put("cursor", value.cursor.toJson())
}
