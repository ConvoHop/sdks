package com.convohop.android.core

import com.convohop.android.generated.Capabilities
import com.convohop.android.generated.Conversation
import com.convohop.android.generated.Cursor
import com.convohop.android.generated.Event
import com.convohop.android.generated.EventPage
import com.convohop.android.generated.EventPayload
import com.convohop.android.generated.Features
import com.convohop.android.generated.InboxItem
import com.convohop.android.generated.InboxPage
import com.convohop.android.generated.Member
import com.convohop.android.generated.MemberPage
import com.convohop.android.generated.Message
import com.convohop.android.generated.MessageAck
import com.convohop.android.generated.MessagePage
import com.convohop.android.generated.ReadReceipt
import com.convohop.android.generated.ReceiptPage
import com.convohop.android.generated.RequestResolution
import com.convohop.android.generated.ResolvedReceipt
import com.convohop.android.generated.ResourceRef
import com.convohop.android.generated.RetainedResult
import com.convohop.android.generated.Session
import com.convohop.android.generated.SessionBootstrap
import com.convohop.android.generated.TypingStatus
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.io.IOException
import java.util.Locale
import java.util.concurrent.atomic.AtomicLong

/** 2026-01-01T00:00:00.000Z; test clocks count virtual time from here. */
internal const val BASE_TIME = 1_767_225_600_000L

internal const val BASE_URL = "http://127.0.0.1:8080"

internal fun testId(kind: Int, n: Long): String = String.format(Locale.ROOT, "%08x-0000-4000-8000-%012x", kind, n)

/** Durable mutations: the authority answers them with receipt evidence. */
private val MUTATIONS = setOf("CommunicationSendMessage", "CommunicationReportReceipt")

internal val PROJECT = testId(1, 1)
internal val INCARNATION = testId(1, 2)
internal val ME = testId(1, 3)
internal val OTHER = testId(1, 4)
private val DEVICE = testId(1, 5)
private val SESSION = testId(1, 6)

/** Deterministic request IDs and no jitter; the clock is the coroutine test scheduler's. */
internal class TestEnvironment(private val clock: () -> Long) : ConvoHopEnvironment {
    private val ids = AtomicLong()

    override fun now(): Long = clock()

    override fun uuid(): String = testId(2, ids.incrementAndGet())

    override fun random(): Double = 0.0
}

/**
 * An in-memory authority for one project: GraphQL over HTTP and
 * graphql-transport-ws, with the response envelope, request ledger, paging
 * and session rules the SDK checks. Tests act for other members through
 * [post], [edit] and [report], and inject failures with [fail].
 */
internal class FakeAuthority(private val now: () -> Long) : HttpEngine, RealtimeConnector {
    sealed interface Fault {
        /** The request never reaches the authority. */
        data object Unreachable : Fault

        /** The authority applies the request but its response is lost. */
        data object LostResponse : Fault

        /** The authority rejects the request. */
        data class Problem(val code: String, val status: Int, val outcome: String = "rejected") : Fault

        /** The authority answers with [result] in an otherwise valid envelope, so tests can check what the SDK accepts. */
        data class Reply(val result: JsonElement) : Fault
    }

    data class Call(val operation: String, val requestId: String, val input: JsonObject, val token: String?)

    private class Rejection(val code: String, val status: Int) : RuntimeException(code)

    private class Retained(val request: JsonObject, val result: JsonElement, val ack: MessageAck?, val receiptId: String, val at: String)

    private class Room(val id: String) {
        var sequence = 0L
        val events = ArrayList<Event>()
        val messages = LinkedHashMap<String, Message>()
        val members = LinkedHashMap<String, Member>()
        val receipts = LinkedHashMap<String, ReadReceipt>()
    }

    private val ids = AtomicLong()
    private val tokens = LinkedHashMap<String, Session>()
    private val faults = HashMap<String, ArrayDeque<Fault>>()
    private val rooms = LinkedHashMap<String, Room>()
    private val ledger = HashMap<String, Retained>()

    /** What the authority reports from `capabilities`. */
    val capabilities = Capabilities(
        serverRelease = "test",
        capabilityRevision = "1",
        limitsRevision = "1",
        features = Features(
            chat = true, inbox = true, lexicalSearch = true, typing = true, webhooks = false, liveSessions = true, liveBroadcast = false,
        ),
        limits = emptyList(),
        environment = "development",
        productionQualified = false,
        offerings = emptyList(),
        geos = emptyList(),
        installationProfiles = emptyList(),
    )

    /** False while the device cannot reach the authority: requests fail and sockets cannot connect. */
    var reachable = true

    /** Every request that left the SDK, in order. */
    val calls = ArrayList<Call>()

    /** Open realtime connections. */
    val sockets = ArrayList<Socket>()

    fun calls(operation: String): List<Call> = calls.filter { it.operation == operation }

    private fun nextId(): String = testId(3, ids.incrementAndGet())

    private fun stamp(): String = Timestamps.format(now())

    /** Issues a session bearer for [ME] that expires in [lifetime] milliseconds. */
    fun issue(lifetime: Long = 3_600_000L): String {
        val session = Session(SESSION, ME, DEVICE, INCARNATION, "1", Timestamps.format(now() + lifetime), "active")
        val token = "token-${ids.incrementAndGet()}"
        tokens[token] = session
        return token
    }

    /** What the app's backend does when the SDK asks to renew [current]: a new revision under a new bearer. */
    fun renew(current: Session, lifetime: Long = 3_600_000L): SessionBootstrap {
        val session = current.copy(
            sessionRevision = (counter(current.sessionRevision) + 1).toString(),
            expiresAt = Timestamps.format(now() + lifetime),
        )
        // The renewed revision retires the bearers of earlier ones.
        tokens.values.removeAll { it.sessionId == current.sessionId }
        val token = "token-${ids.incrementAndGet()}"
        tokens[token] = session
        return SessionBootstrap(session, session.expiresAt, token)
    }

    /** Fails the next request for [operation], an operation name such as `CommunicationSendMessage`. */
    fun fail(operation: String, vararg next: Fault) {
        faults.getOrPut(operation) { ArrayDeque() }.addAll(next)
    }

    /** A conversation whose members are [members]. */
    fun conversation(members: List<String> = listOf(ME, OTHER)): String {
        val room = Room(nextId())
        for (principal in members) room.members[principal] = Member(room.id, principal, "member", "active", "1", "1", "1", "1", false)
        rooms[room.id] = room
        return room.id
    }

    fun messages(conversationId: String): List<Message> = room(conversationId).messages.values.toList()

    /** [author] sends [text], as another device would. */
    fun post(conversationId: String, author: String, text: String): Message {
        val room = room(conversationId)
        val sequence = (room.sequence + 1).toString()
        val message = Message(nextId(), room.id, author, sequence, "1", sequence, stamp(), false, text, JsonObject(emptyMap()))
        room.messages[message.messageId] = message
        append(room, "message.created", "message", message.messageId, EventPayload(message.messageId, "1", sequence))
        return message
    }

    /** Its author changes [messageId] to [text]. */
    fun edit(conversationId: String, messageId: String, text: String): Message {
        val room = room(conversationId)
        val current = room.messages.getValue(messageId)
        val sequence = (room.sequence + 1).toString()
        val revision = (counter(current.revision) + 1).toString()
        val next = current.copy(text = text, revision = revision, revisionSequence = sequence, editedAt = stamp())
        room.messages[messageId] = next
        append(room, "message.edited", "message", messageId, EventPayload(messageId, revision, sequence))
        return next
    }

    /** [principalId] reports that it read or received [conversationId] through [through]. */
    fun report(conversationId: String, principalId: String, kind: String, through: String): ReadReceipt {
        val room = room(conversationId)
        val member = room.members.getValue(principalId)
        val existing = room.receipts[principalId] ?: ReadReceipt(principalId, member.membershipEpoch, member.visibilityEpoch)
        val receipt = if (kind == "read") {
            existing.copy(readThroughSequence = through, updatedAt = stamp())
        } else {
            existing.copy(deliveredThroughSequence = through, updatedAt = stamp())
        }
        room.receipts[principalId] = receipt
        val payload = EventPayload(
            principalId = principalId, membershipEpoch = member.membershipEpoch, visibilityEpoch = member.visibilityEpoch,
            kind = kind, throughSequence = through,
        )
        append(room, "receipt.reported", "member", principalId, payload)
        return receipt
    }

    /** Removes [principalId] from [conversationId]. */
    fun remove(conversationId: String, principalId: String) {
        val room = room(conversationId)
        val member = room.members.remove(principalId) ?: error("Not a member")
        room.receipts.remove(principalId)
        val payload = EventPayload(
            principalId = principalId, membershipEpoch = member.membershipEpoch, visibilityEpoch = member.visibilityEpoch,
        )
        append(room, "member.removed", "member", principalId, payload)
    }

    /** Ends every realtime connection, as a network change or server restart does. */
    fun disconnect(code: Int = 1006) {
        for (socket in sockets.toList()) socket.drop(code)
    }

    private fun room(conversationId: String): Room = rooms[conversationId] ?: throw Rejection("NOT_FOUND", 404)

    private fun visible(input: JsonObject, principalId: String): Room {
        val room = room(input.string("conversationId"))
        if (principalId !in room.members) throw Rejection("NOT_FOUND", 404)
        return room
    }

    private fun append(room: Room, type: String, kind: String, subject: String, payload: EventPayload) {
        room.sequence++
        val event = Event(nextId(), room.id, room.sequence.toString(), type, stamp(), ResourceRef(kind, subject), payload)
        room.events += event
        for (socket in sockets.toList()) socket.deliver(room.id, listOf(event))
    }

    private fun page(room: Room, after: Long, limit: Int): EventPage {
        val pending = room.events.filter { counter(it.sequence) > after }
        val items = pending.take(limit)
        return EventPage(items, pending.size <= items.size, false, Cursor(INCARNATION, room.id, items.lastOrNull()?.sequence ?: after.toString()))
    }

    override suspend fun post(request: HttpRequest): HttpResponse {
        check(request.url == "$BASE_URL/graphql") { "Unexpected URL ${request.url}" }
        val body = Json.parseToJsonElement(request.body).jsonObject
        val operation = body.string("operationName")
        val variables = body.getValue("variables").jsonObject
        val requestId = variables.getValue("context").jsonObject.string("requestId")
        val input = variables["input"] as? JsonObject ?: JsonObject(emptyMap())
        val token = request.headers["authorization"]?.removePrefix("Bearer ")
        calls += Call(operation, requestId, input, token)
        if (!reachable) throw IOException("Authority unreachable")
        val fault = faults[operation]?.removeFirstOrNull()
        if (fault == Fault.Unreachable) throw IOException("Connection reset")
        if (fault is Fault.Problem) return problem(requestId, fault.code, fault.status, fault.outcome)
        if (fault is Fault.Reply) return crafted(operation, requestId, fault.result)
        val response = try {
            val session = tokens[token]
            if (session == null || timestampMillis(session.expiresAt) <= now()) throw Rejection("UNAUTHENTICATED", 401)
            respond(operation, requestId, input, session)
        } catch (rejection: Rejection) {
            problem(requestId, rejection.code, rejection.status, "rejected")
        }
        if (fault == Fault.LostResponse) throw IOException("Response lost")
        return response
    }

    private fun respond(operation: String, requestId: String, input: JsonObject, session: Session): HttpResponse {
        val principalId = session.principalId
        val (field, result) = when (operation) {
            "CommunicationRoute" -> "route" to route()
            "CommunicationCurrentSession" -> "currentSession" to session.toJson()
            "CommunicationGetConversation" -> "getConversation" to visible(input, principalId).let { room ->
                Conversation(room.id, "1", "Room", JsonObject(emptyMap()), room.sequence.toString(), room.members[principalId]).toJson()
            }
            "CommunicationMessages" -> "messages" to messagePage(visible(input, principalId), input)
            "CommunicationGetMessage" -> "getMessage" to
                (visible(input, principalId).messages[input.string("messageId")] ?: throw Rejection("NOT_FOUND", 404)).toJson()
            "CommunicationEvents" -> "events" to visible(input, principalId).let { room ->
                val after = (input["after"] as? JsonObject)?.let { counter(it.string("sequence")) } ?: 0L
                page(room, after, minOf(input.getValue("limit").jsonPrimitive.int, 100)).toJson()
            }
            "CommunicationMembers" -> "members" to visible(input, principalId).let { room ->
                val (items, next) = slice(room.members.values.toList(), input)
                MemberPage(items, next == null, false, next).toJson()
            }
            "CommunicationInbox" -> "inbox" to rooms.values.filter { principalId in it.members }.map { inboxItem(it, principalId) }
                .let { slice(it, input) }
                .let { (items, next) -> InboxPage(items, next == null, false, next).toJson() }
            "CommunicationCapabilities" -> "capabilities" to capabilities.toJson()
            "CommunicationReceipts" -> "receipts" to
                ReceiptPage(visible(input, principalId).receipts.values.toList(), true, false).toJson()
            "CommunicationTyping" -> "typing" to visible(input, principalId).let { TypingStatus(true).toJson() }
            "CommunicationResolveRequest" -> "resolveRequest" to resolve(input.string("requestId"))
            "CommunicationSendMessage", "CommunicationReportReceipt" -> return mutation(operation, requestId, input, principalId)
            else -> error("The fake authority does not implement $operation")
        }
        return reply(field, envelope("ok", requestId, result, null, null))
    }

    private fun route(): JsonObject = buildJsonObject {
        put("projectId", PROJECT)
        put("incarnation", INCARNATION)
        put("servingEpoch", "1")
        put("communicationBase", BASE_URL)
        put("wssUrl", "ws://127.0.0.1:8080/graphql")
        put("expiresAt", Timestamps.format(now() + 3_600_000L))
        put("signature", "test-signature")
    }

    /** Newest first, like the authority: [beforeSequence] pages backwards and the cursor is the oldest sequence returned. */
    private fun messagePage(room: Room, input: JsonObject): JsonElement {
        val before = (input["beforeSequence"] as? JsonPrimitive)?.takeIf { it.isString }?.let { counter(it.content) }
        val ordered = room.messages.values.filter { before == null || counter(it.sequence) < before }
            .sortedByDescending { counter(it.sequence) }
        val items = ordered.take(minOf(input.getValue("limit").jsonPrimitive.int, 100))
        val complete = ordered.size <= items.size
        return MessagePage(items, complete, false, if (complete) null else items.last().sequence).toJson()
    }

    /** One page of [items] from the offset in the input's cursor; the next cursor is the following offset. */
    private fun <T> slice(items: List<T>, input: JsonObject): Pair<List<T>, String?> {
        val start = (input["cursor"] as? JsonPrimitive)?.content?.toInt() ?: 0
        val page = items.drop(start).take(input.getValue("limit").jsonPrimitive.int)
        val end = start + page.size
        return page to end.takeIf { it < items.size }?.toString()
    }

    /** The conversation as [principalId]'s inbox shows it: unread while another member's newest message is past their read receipt. */
    private fun inboxItem(room: Room, principalId: String): InboxItem {
        val latest = room.messages.values.maxByOrNull { counter(it.sequence) }
        val read = room.receipts[principalId]?.readThroughSequence?.let { counter(it) } ?: 0L
        val unread = latest != null && latest.authorId != principalId && counter(latest.sequence) > read
        return InboxItem(room.id, "Room", latest?.createdAt, room.members.getValue(principalId).visibilityEpoch, latest, unread)
    }

    /** A [Fault.Reply] answer, with receipt evidence when the operation is a durable mutation. */
    private fun crafted(operation: String, requestId: String, result: JsonElement): HttpResponse {
        val field = operation.removePrefix("Communication").replaceFirstChar { it.lowercaseChar() }
        if (operation !in MUTATIONS) return reply(field, envelope("ok", requestId, result, null, null))
        val retained = Retained(JsonObject(emptyMap()), result, null, nextId(), stamp())
        return reply(field, envelope("committed", requestId, result, retained, false))
    }

    /** Applies a durable mutation once per request ID; a repeat with the same payload replays the retained result. */
    private fun mutation(operation: String, requestId: String, input: JsonObject, principalId: String): HttpResponse {
        val request = buildJsonObject {
            put("operation", operation)
            put("input", input)
        }
        val field = if (operation == "CommunicationSendMessage") "sendMessage" else "reportReceipt"
        val previous = ledger[requestId]
        if (previous != null) {
            if (previous.request != request) throw Rejection("IDEMPOTENCY_CONFLICT", 409)
            return reply(field, envelope("committed", requestId, previous.result, previous, true))
        }
        val room = visible(input, principalId)
        val retained = if (operation == "CommunicationSendMessage") {
            val message = post(room.id, principalId, input.string("text"))
            val ack = MessageAck(message.messageId, room.id, message.sequence, "1", "sent", Cursor(INCARNATION, room.id, message.sequence))
            Retained(request, ack.toJson(), ack, nextId(), stamp())
        } else {
            val member = room.members.getValue(principalId)
            if (input.string("membershipEpoch") != member.membershipEpoch || input.string("visibilityEpoch") != member.visibilityEpoch) {
                throw Rejection("STALE_MEMBERSHIP", 409)
            }
            val receipt = report(room.id, principalId, input.string("kind"), input.string("throughSequence"))
            Retained(request, receipt.toJson(), null, nextId(), stamp())
        }
        ledger[requestId] = retained
        return reply(field, envelope("committed", requestId, retained.result, retained, false))
    }

    private fun resolve(target: String): JsonElement {
        val retained = ledger[target]
        val receipt = retained?.let {
            ResolvedReceipt("committed", target, stamp(), it.receiptId, it.at, false, result = RetainedResult(messageAck = it.ack))
        }
        return RequestResolution(if (retained == null) "notObservedYet" else "committed", target, stamp(), false, receipt).toJson()
    }

    private fun envelope(status: String, requestId: String, result: JsonElement, retained: Retained?, replayed: Boolean?): JsonObject =
        JsonObject(
            linkedMapOf(
                "status" to JsonPrimitive(status),
                "requestId" to JsonPrimitive(requestId),
                "serverTime" to JsonPrimitive(stamp()),
                "receiptId" to (retained?.let { JsonPrimitive(it.receiptId) } ?: JsonNull),
                "committedAt" to (retained?.let { JsonPrimitive(it.at) } ?: JsonNull),
                "replayed" to (replayed?.let(::JsonPrimitive) ?: JsonNull),
                "operation" to JsonNull,
                "resourceRef" to JsonNull,
                "result" to result,
            ),
        )

    private fun reply(field: String, envelope: JsonObject): HttpResponse =
        Response(200, buildJsonObject { put("data", buildJsonObject { put(field, envelope) }) }.toString())

    private fun problem(requestId: String, code: String, status: Int, outcome: String): HttpResponse {
        val error = buildJsonObject {
            put("message", "Fake authority: $code")
            put(
                "extensions",
                buildJsonObject {
                    put("code", code)
                    put("outcome", outcome)
                    put("status", status)
                    put("requestId", requestId)
                },
            )
        }
        return Response(200, buildJsonObject { put("errors", JsonArray(listOf(error))) }.toString())
    }

    private class Response(override val status: Int, private val body: String) : HttpResponse {
        override fun header(name: String): String? = null

        override suspend fun text(): String = body
    }

    override fun connect(url: String, subprotocol: String, listener: RealtimeListener): RealtimeSocket {
        check(url == "ws://127.0.0.1:8080/graphql" && subprotocol == "graphql-transport-ws") { "Unexpected socket $url $subprotocol" }
        val socket = Socket(listener)
        if (reachable) {
            sockets += socket
            listener.onOpen()
        } else {
            socket.drop(1006)
        }
        return socket
    }

    /** One graphql-transport-ws connection: acknowledges a valid bearer, replays what the subscriber missed, then pushes live. */
    inner class Socket(private val listener: RealtimeListener) : RealtimeSocket {
        private var subscription: String? = null
        private var conversationId: String? = null
        private var closed = false

        /** The bearer the client authorized this connection with. */
        var token: String? = null
            private set

        override fun send(text: String): Boolean {
            if (closed) return false
            val frame = Json.parseToJsonElement(text).jsonObject
            when (frame.string("type")) {
                "connection_init" -> {
                    token = frame.getValue("payload").jsonObject.string("token")
                    if (token in tokens) listener.onMessage("""{"type":"connection_ack"}""") else drop(4401)
                }
                "subscribe" -> {
                    val input = frame.getValue("payload").jsonObject.getValue("variables").jsonObject.getValue("input").jsonObject
                    val room = room(input.string("conversationId"))
                    subscription = frame.string("id")
                    conversationId = room.id
                    val after = (input["after"] as? JsonObject)?.let { counter(it.string("sequence")) } ?: 0L
                    val missed = room.events.filter { counter(it.sequence) > after }
                    if (missed.isNotEmpty()) deliver(room.id, missed)
                }
                "complete" -> subscription = null
            }
            return true
        }

        override fun close(code: Int, reason: String) {
            closed = true
            sockets.remove(this)
        }

        fun deliver(conversationId: String, events: List<Event>) {
            val id = subscription ?: return
            if (closed || conversationId != this.conversationId) return
            // Pages no larger than the 50 events the SDK subscribes for.
            for (chunk in events.chunked(50)) {
                val page = EventPage(chunk, true, false, Cursor(INCARNATION, conversationId, chunk.last().sequence))
                val frame = buildJsonObject {
                    put("type", "next")
                    put("id", id)
                    put("payload", buildJsonObject { put("data", buildJsonObject { put("conversationEvents", page.toJson()) }) })
                }
                listener.onMessage(frame.toString())
            }
        }

        /** The authority or network ends the connection with [code]. */
        fun drop(code: Int) {
            if (closed) return
            closed = true
            sockets.remove(this)
            listener.onClose(code, "")
        }
    }
}

private fun JsonObject.string(name: String): String = getValue(name).jsonPrimitive.content
