package com.convohop.conformance

import com.convohop.android.core.CanonicalJson
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.FileDescriptor
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.io.Writer
import java.math.BigInteger
import java.util.concurrent.TimeUnit
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import kotlin.system.exitProcess

// The ConvoHop conformance driver for the Android SDK: NDJSON over stdio, as specified by
// spec/conformance/driver-protocol.md. It runs the SDK's pure-JVM runtime on the host JVM and declares the user
// role; the runner's fixture driver serves backend and management clients. The SDK's JSON codec frames requests
// and responses.

private const val NAME = "convohop-android"
private const val VERSION = "0.1.0"
private val EMPTY = JsonObject(emptyMap())

/** The SDK does not signal that a stream closed, so collect also polls at this interval. */
private const val POLL_MS = 50L

/** How long collect waits for the SDK to store the position of the events it reports. */
private const val STORE_WAIT_MS = 2_000L
private const val STORE_POLL_MS = 5L

/** Serves requests from stdin until shutdown or the end of input, then exits 0. */
fun main() {
    // Responses own stdout; anything else the process prints goes to stderr.
    val out = BufferedWriter(OutputStreamWriter(FileOutputStream(FileDescriptor.out), Charsets.UTF_8))
    System.setOut(System.err)
    val input = BufferedReader(InputStreamReader(System.`in`, Charsets.UTF_8))
    try {
        Driver().run(input, out)
    } catch (_: IOException) {
        // The runner closed a pipe, so nobody is left to answer.
    }
    exitProcess(0)
}

/** One realtime subscription: what the SDK delivered so far, guarded by [lock]. */
private class Subscription(val client: String) : RealtimeSink {
    val lock = ReentrantLock()
    private val changed = lock.newCondition()
    val events = ArrayList<JsonObject>()
    val errors = ArrayList<JsonObject>()

    @Volatile
    var handle: RealtimeHandle? = null

    @Volatile
    var stopped = false

    val closed: Boolean get() = handle?.closed == true

    // The SDK calls these on its own threads.
    override fun events(events: List<JsonObject>) {
        lock.withLock {
            if (!stopped) {
                this.events.addAll(events)
                changed.signalAll()
            }
        }
    }

    override fun error(error: JsonObject) {
        lock.withLock {
            if (!stopped) {
                errors.add(error)
                changed.signalAll()
            }
        }
    }

    /** Waits at most [millis] for a delivery; the caller holds [lock]. */
    fun await(millis: Long) {
        changed.await(millis, TimeUnit.MILLISECONDS)
    }

    fun stop() {
        lock.withLock {
            stopped = true
            changed.signalAll()
        }
        handle?.close()
    }
}

/** The request id when JavaScript reads it as a positive safe integer, otherwise null. */
private fun requestId(value: JsonElement?): Long? = safeInteger(value)?.takeIf { it >= 1 }

private fun eventSequence(event: JsonObject): BigInteger? {
    val value = event["sequence"]
    return if (value is JsonPrimitive && value.isString) value.content.toBigIntegerOrNull() else null
}

private fun failure(code: String, message: String?): JsonObject = buildJsonObject {
    put("code", code)
    put("message", message ?: code)
}

private fun response(id: Long?, key: String, value: JsonElement): String = CanonicalJson.encode(
    buildJsonObject {
        put("id", if (id == null) JsonNull else JsonPrimitive(id))
        put(key, value)
    },
)

private fun outcome(ok: Boolean, key: String? = null, value: JsonElement? = null): JsonObject = buildJsonObject {
    put("ok", ok)
    if (key != null && value != null) put(key, value)
}

internal class Driver {
    private val clients = HashMap<String, UserClient>()
    private val subscriptions = HashMap<String, Subscription>()
    private val storages = HashMap<String, Storage>()
    private var negotiated = false
    private var shutDown = false

    /** Answers each request line until shutdown or the end of input. */
    fun run(input: BufferedReader, out: Writer) {
        while (!shutDown) {
            val line = input.readLine() ?: break
            val response = handle(line) ?: continue
            out.write(response)
            out.write("\n")
            out.flush()
        }
        reset()
    }

    /** The response to one request line, or null for a blank line. */
    fun handle(line: String): String? {
        if (line.isBlank()) return null
        val request = try {
            CanonicalJson.parse(line)
        } catch (_: RuntimeException) {
            return response(null, "error", failure("INVALID_REQUEST", "Request is not valid JSON"))
        }
        val message = request as? JsonObject
        val id = message?.let { requestId(it["id"]) }
        return try {
            if (message == null || id == null) throw ProtocolException("INVALID_REQUEST", "id must be a positive integer")
            val method = message["method"]
            // As in JavaScript's `params ?? {}`, a null params is no params.
            val params = message["params"]?.takeUnless { it is JsonNull }
            if (method !is JsonPrimitive || !method.isString) throw ProtocolException("INVALID_REQUEST", "method must be a string")
            if (params != null && params !is JsonObject) throw ProtocolException("INVALID_REQUEST", "params must be an object")
            val answer = response(id, "result", dispatch(method.content, params as? JsonObject ?: EMPTY))
            if (method.content == "shutdown") {
                reset()
                shutDown = true
            }
            answer
        } catch (error: ProtocolException) {
            response(id, "error", failure(error.code, error.message))
        } catch (error: ParamsException) {
            response(id, "error", failure("INVALID_PARAMS", error.message))
        } catch (error: Exception) {
            response(id, "error", failure("DRIVER_FAILURE", error.message ?: "Driver failure"))
        }
    }

    private fun dispatch(method: String, params: JsonObject): JsonElement {
        if (!negotiated && method != "hello") throw ProtocolException("INVALID_REQUEST", "hello must be the first request")
        return when (method) {
            "hello" -> hello()
            "client.create" -> create(params)
            "client.close" -> closeClient(params)
            "invoke" -> invoke(params)
            "realtime.subscribe" -> subscribe(params)
            "realtime.collect" -> collect(params)
            "realtime.close" -> closeSubscription(params)
            "webhooks.verify" -> throw ProtocolException("UNSUPPORTED", "This driver does not declare the webhooks.verify feature")
            "reset" -> {
                reset()
                EMPTY
            }
            "shutdown" -> EMPTY
            else -> throw ProtocolException("UNKNOWN_METHOD", "Unknown method $method")
        }
    }

    private fun hello(): JsonElement {
        if (negotiated) throw ProtocolException("INVALID_REQUEST", "hello was already negotiated")
        negotiated = true
        return buildJsonObject {
            putJsonObject("driver") {
                put("name", NAME)
                put("version", VERSION)
                put("language", "kotlin")
                // The Gradle start script names the SDK artifact under test and its version.
                putJsonObject("packages") {
                    put(
                        System.getProperty("convohop.conformance.package", "com.convohop:convohop-android-core"),
                        System.getProperty("convohop.conformance.version", "unknown"),
                    )
                }
            }
            putJsonObject("roles") {
                for (role in DECLARED) putJsonObject(role) { putJsonArray("operations") { OPERATIONS.forEach { add(it) } } }
            }
            putJsonArray("features") { FEATURES.forEach { add(it) } }
        }
    }

    private fun create(args: JsonObject): JsonElement {
        val name = args.handle("client")
        if (clients.containsKey(name)) throw ParamsException("Client handle $name already exists")
        val role = args.text("role")
        if (role !in ROLES) throw ParamsException("role must be one of ${ROLES.joinToString(", ")}")
        if (role !in DECLARED) throw ProtocolException("UNSUPPORTED", "This driver does not declare the $role role")
        val storageName = if (args.containsKey("storage")) args.handle("storage") else null
        val storage = storageName?.let { storages[it] ?: Storage() }
        val baseUrl = args.text("baseUrl")
        val credential = args.text("credential")
        val projectId = args.optionalText("projectId")
        val incarnation = args.optionalText("incarnation")
        val principalId = args.optionalText("principalId")
        // Checked like the reference driver; only management clients use it.
        args.optionalText("actorId")
        clients[name] = UserClient.create(baseUrl, credential, projectId, incarnation, principalId, storage)
        if (storageName != null && storage != null) storages[storageName] = storage
        return EMPTY
    }

    private fun client(args: JsonObject): Pair<String, UserClient> {
        val name = args.text("client")
        val found = clients[name] ?: throw ProtocolException("UNKNOWN_HANDLE", "Unknown client handle $name")
        return name to found
    }

    private fun subscription(args: JsonObject): Pair<String, Subscription> {
        val name = args.text("subscription")
        val found = subscriptions[name] ?: throw ProtocolException("UNKNOWN_HANDLE", "Unknown subscription handle $name")
        return name to found
    }

    private fun closeClient(args: JsonObject): JsonElement {
        val (name, target) = client(args)
        clients.remove(name)
        for ((id, entry) in subscriptions.filterValues { it.client == name }) {
            entry.stop()
            subscriptions.remove(id)
        }
        target.close()
        return EMPTY
    }

    private fun invoke(args: JsonObject): JsonElement {
        val (_, target) = client(args)
        val operation = args.text("operation")
        val input = if (args.containsKey("args")) record(args["args"], "args") else EMPTY
        if (!target.implements(operation)) throw ProtocolException("UNSUPPORTED", "The user role does not implement $operation")
        return try {
            outcome(true, "value", runBlocking { target.run(operation, input) })
        } catch (error: ParamsException) {
            throw error
        } catch (error: ProtocolException) {
            throw error
        } catch (error: Exception) {
            outcome(false, "error", driverError(error))
        }
    }

    private fun subscribe(args: JsonObject): JsonElement {
        val (owner, target) = client(args)
        val name = args.handle("subscription")
        if (subscriptions.containsKey(name)) throw ParamsException("Subscription handle $name already exists")
        val conversationId = args.text("conversationId")
        val entry = Subscription(owner)
        try {
            entry.handle = runBlocking { target.watch(conversationId, entry) }
        } catch (error: ParamsException) {
            throw error
        } catch (error: Exception) {
            return outcome(false, "error", driverError(error))
        }
        subscriptions[name] = entry
        return outcome(true)
    }

    /** Whether a subscription reached `until`; call it holding the subscription's lock. */
    private fun condition(until: JsonObject): (Subscription) -> Boolean {
        val count = until.integer("count", 0, 100_000)
        val sequence = until.counter("sequence")
        val closedValue = until["closed"]
        val closed = until.containsKey("closed")
        if (closed && !(closedValue is JsonPrimitive && !closedValue.isString && closedValue.content == "true")) {
            throw ParamsException("until.closed must be true when present")
        }
        return { entry ->
            (count == null || entry.events.size >= count) &&
                (sequence == null || entry.events.any { event -> eventSequence(event)?.let { it >= sequence } == true }) &&
                (!closed || entry.closed)
        }
    }

    private fun collect(args: JsonObject): JsonElement {
        val (_, entry) = subscription(args)
        val reached = condition(if (args.containsKey("until")) record(args["until"], "until") else EMPTY)
        val timeoutMs = args.integer("timeoutMs", 0, 60_000)
        val settleMs = args.integer("settleMs", 0, 10_000) ?: 0
        if (timeoutMs == null) throw ParamsException("timeoutMs is required")
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
        entry.lock.withLock {
            while (!reached(entry) && !entry.stopped && !entry.closed) {
                val remaining = TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime())
                if (remaining <= 0) break
                entry.await(minOf(remaining, POLL_MS))
            }
        }
        if (settleMs > 0) Thread.sleep(settleMs)
        val (events, errors, satisfied) = entry.lock.withLock {
            Triple(ArrayList(entry.events), ArrayList(entry.errors), reached(entry))
        }
        val closed = entry.closed
        awaitStored(entry, events)
        return buildJsonObject {
            put("events", JsonArray(events))
            put("errors", JsonArray(errors))
            put("closed", closed)
            put("timedOut", !satisfied && !closed)
        }
    }

    /**
     * The SDK applies events on its own threads and stores their position just after, so collect could answer
     * before that position is stored, and a close that follows discards it. A JavaScript SDK stores it before the
     * driver reads the next request. Waiting keeps an application restart resuming after the events reported here.
     */
    private fun awaitStored(entry: Subscription, events: List<JsonObject>) {
        val target = events.mapNotNull(::eventSequence).maxOrNull() ?: return
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(STORE_WAIT_MS)
        while (!entry.stopped && !entry.closed && System.nanoTime() - deadline < 0) {
            val stored = entry.handle?.storedSequence
            if (stored != null && stored >= target) return
            Thread.sleep(STORE_POLL_MS)
        }
    }

    private fun closeSubscription(args: JsonObject): JsonElement {
        val (name, entry) = subscription(args)
        entry.stop()
        subscriptions.remove(name)
        return EMPTY
    }

    /** Closes every subscription and client and discards every recovery store. */
    private fun reset() {
        for (entry in subscriptions.values) entry.stop()
        for (client in clients.values) client.close()
        subscriptions.clear()
        clients.clear()
        storages.clear()
    }
}
