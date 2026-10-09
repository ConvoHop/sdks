package com.convohop.examples

import com.convohop.android.generated.SessionBootstrap
import java.io.File
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/** The repository root, which Gradle passes to the tests. */
internal val repoRoot: File
    get() = File(checkNotNull(System.getProperty("convohop.repoRoot")) { "Run the tests through Gradle, which sets convohop.repoRoot" })

/** The principal ID that a sign-in's session belongs to. */
internal val SignIn.principalId: String get() = checkNotNull(bootstrap.session).principalId

/**
 * The conformance mock that the SDKs' own tests use: a real HTTP server, which runs in a node child process. It plays
 * your backend's part too, with its backend key. Run `npm ci` at the repository root first.
 */
internal class Mock private constructor(private val process: Process, descriptor: JsonObject) : AutoCloseable {
    val baseUrl: String = descriptor.text("communicationUrl")
    val projectId: String = descriptor.text("projectId")
    private val incarnation: String = descriptor.text("incarnation")
    private val backendKey: String = descriptor.getValue("credentials").jsonObject.text("backend")
    private val control: String = descriptor.text("control")

    /** Forgets every principal, conversation, fault and log entry. */
    fun reset() {
        control("POST", "/reset", JsonObject(emptyMap()))
    }

    /** Signs in a new user, as your backend's sign-in endpoint does. */
    fun signIn(name: String): SignIn {
        val principalId = communication("createPrincipal", buildJsonObject { put("externalUserId", "$name-${UUID.randomUUID()}") })
            .text("principalId")
        return SignIn(baseUrl, projectId, SessionBootstrap.fromJson(issueSession(principalId)))
    }

    /** A new session for [principalId], as the backend returns it. */
    fun issueSession(principalId: String): JsonObject = communication(
        "issueSession",
        buildJsonObject {
            put("principalId", principalId)
            put("deviceId", UUID.randomUUID().toString())
            put("requestedTtlMs", "900000")
        },
    )

    /** Creates a conversation with [members] and returns its ID. */
    fun createConversation(vararg members: SignIn): String = communication(
        "createConversation",
        buildJsonObject {
            put("title", "Lunch")
            putJsonObject("props") {}
            putJsonArray("members") {
                members.forEach { member ->
                    addJsonObject {
                        put("principalId", member.principalId)
                        put("role", "member")
                    }
                }
            }
        },
    ).text("conversationId")

    fun addMember(conversationId: String, member: SignIn) {
        communication(
            "addMembers",
            buildJsonObject {
                put("conversationId", conversationId)
                putJsonArray("members") {
                    addJsonObject {
                        put("principalId", member.principalId)
                        put("role", "member")
                        put("expectedRevision", "0") // Not a member yet.
                    }
                }
            },
        )
    }

    /** Makes the mock fail the next request to a GraphQL field: it closes the socket before or after committing. */
    fun injectFault(field: String, action: String) {
        control(
            "POST",
            "/fault",
            buildJsonObject {
                put("field", field)
                put("action", action)
            },
        )
    }

    /** Whether each request that the mock received for a field and request ID was dropped, oldest first. */
    fun attempts(field: String, requestId: String): List<Boolean> =
        control("GET", "/log", null).getValue("entries").jsonArray
            .map { it.jsonObject }
            .filter { it.optional("kind") == "request" && it.optional("field") == field && it.optional("requestId") == requestId }
            .map { it.getValue("dropped").jsonPrimitive.boolean }

    /** Closes the live connections that follow a conversation, as a network change or a server restart does. */
    fun dropRealtime(conversationId: String): Int =
        control("POST", "/realtime/drop", buildJsonObject { put("conversationId", conversationId) })
            .getValue("closed").jsonPrimitive.int

    /** Waits until the mock has received [count] requests to a GraphQL field. */
    fun awaitRequests(field: String, count: Int) = awaitLog("request", count) { put("field", field) }

    /** Waits until [user] has subscribed to a conversation's live events [count] times. */
    fun awaitSubscriptions(user: SignIn, conversationId: String, count: Int) = awaitLog("subscribe", count) {
        put("principalId", user.principalId)
        put("conversationId", conversationId)
    }

    private fun awaitLog(kind: String, count: Int, match: JsonObjectBuilder.() -> Unit) {
        control(
            "POST",
            "/log/wait",
            buildJsonObject {
                put("kind", kind)
                putJsonObject("match", match)
                put("count", count)
                put("timeoutMs", 10_000)
            },
        )
    }

    private fun communication(field: String, input: JsonObject): JsonObject {
        val operation = operations.getValue("communication.$field").jsonObject
        val body = buildJsonObject {
            put("query", operation.getValue("query"))
            putJsonObject("variables") {
                putJsonObject("context") {
                    put("requestId", UUID.randomUUID().toString())
                    put("projectId", projectId)
                    put("incarnation", incarnation)
                }
                put("input", input)
            }
        }
        val reply = post("$baseUrl/graphql", body, "Bearer $backendKey")
        val payload = (reply["data"] as? JsonObject)?.get(field) as? JsonObject ?: error("The mock failed $field: $reply")
        check(payload.optional("status") == "committed") { "The mock didn't commit $field: $payload" }
        return payload.getValue("result").jsonObject
    }

    private fun control(method: String, path: String, body: JsonObject?): JsonObject {
        val request = Request.Builder().url(control + path)
            .method(method, body?.toString()?.toRequestBody(JSON))
            .build()
        return http.newCall(request).execute().use { response ->
            val text = checkNotNull(response.body).string()
            check(response.isSuccessful) { "The mock's $path failed with HTTP ${response.code}: $text" }
            Json.parseToJsonElement(text).jsonObject
        }
    }

    private fun post(url: String, body: JsonObject, authorization: String): JsonObject {
        val request = Request.Builder().url(url)
            .header("authorization", authorization)
            .post(body.toString().toRequestBody(JSON))
            .build()
        return http.newCall(request).execute().use { response ->
            Json.parseToJsonElement(checkNotNull(response.body).string()).jsonObject
        }
    }

    override fun close() {
        process.destroy()
        if (!process.waitFor(10, TimeUnit.SECONDS)) process.destroyForcibly()
    }

    companion object {
        private val JSON = "application/json".toMediaType()
        private val http = OkHttpClient()

        private val operations: JsonObject by lazy {
            Json.parseToJsonElement(File(repoRoot, "schema/operations.json").readText()).jsonObject.getValue("operations").jsonObject
        }

        fun start(): Mock {
            val process = ProcessBuilder("node", "conformance/mock/cli.mjs")
                .directory(repoRoot)
                .redirectError(ProcessBuilder.Redirect.INHERIT)
                .start()
            try {
                val output = process.inputStream.bufferedReader()
                // The mock prints its descriptor when it's listening.
                val descriptor = output.readLine()
                    ?: error("The conformance mock exited before it started. Run npm ci at the repository root.")
                val drain = Thread {
                    try {
                        while (output.readLine() != null) {
                            // Keep the pipe from filling up.
                        }
                    } catch (_: IOException) {
                        // The mock stopped.
                    }
                }
                drain.isDaemon = true
                drain.start()
                return Mock(process, Json.parseToJsonElement(descriptor).jsonObject)
            } catch (error: Exception) {
                process.destroyForcibly()
                throw error
            }
        }

        private fun JsonObject.text(key: String): String = getValue(key).jsonPrimitive.content

        private fun JsonObject.optional(key: String): String? = (get(key) as? JsonPrimitive)?.takeIf { it.isString }?.content
    }
}
