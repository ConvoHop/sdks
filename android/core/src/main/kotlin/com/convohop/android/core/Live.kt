package com.convohop.android.core

import com.convohop.android.generated.AlertLiveSessionInput
import com.convohop.android.generated.AlertLiveSessionPayload
import com.convohop.android.generated.Conversation
import com.convohop.android.generated.ConversationLiveInput
import com.convohop.android.generated.ConversationMute
import com.convohop.android.generated.ConversationMuteInput
import com.convohop.android.generated.EndLiveSessionInput
import com.convohop.android.generated.EndLiveSessionPayload
import com.convohop.android.generated.JoinLiveSessionInput
import com.convohop.android.generated.LeaveLiveSessionInput
import com.convohop.android.generated.LeaveLiveSessionPayload
import com.convohop.android.generated.LiveConnectionGrant
import com.convohop.android.generated.LiveConnectionMode
import com.convohop.android.generated.LiveCutoffState
import com.convohop.android.generated.LiveMediaProfile
import com.convohop.android.generated.LiveOperationKind
import com.convohop.android.generated.LiveOperationState
import com.convohop.android.generated.LiveParticipantPage
import com.convohop.android.generated.LiveParticipantsInput
import com.convohop.android.generated.LiveParticipation
import com.convohop.android.generated.LiveSession
import com.convohop.android.generated.LiveSessionCredentialsInput
import com.convohop.android.generated.LiveSessionInput
import com.convohop.android.generated.LiveSessionKind
import com.convohop.android.generated.LiveSessionOperation
import com.convohop.android.generated.LiveSessionOperationCompletion
import com.convohop.android.generated.LiveSessionOperationInput
import com.convohop.android.generated.LiveSessionPage
import com.convohop.android.generated.LiveSessionsInput
import com.convohop.android.generated.Message
import com.convohop.android.generated.MessagePage
import com.convohop.android.generated.Operations
import com.convohop.android.generated.SetConversationMuteInput
import com.convohop.android.generated.StartLiveSessionInput
import com.convohop.android.generated.StartLiveSessionPayload
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.serialization.json.JsonObject

private const val ACTION_POLL_MILLIS = 500L

/** One conversation: its messages, this user's mute setting and its calls. */
public class ConversationHandle internal constructor(
    public val client: ConvoHopClient,
    public val conversationId: String,
) {
    public val messages: Messages = Messages()
    public val mute: Mute = Mute()
    public val live: ConversationLive = ConversationLive(this)

    public suspend fun get(): Conversation = client.getConversation(conversationId)

    public inner class Messages internal constructor() {
        /** Sends a message; reuse [requestId] only to resend the same message after an unknown outcome. */
        public suspend fun send(text: String, props: JsonObject = JsonObject(emptyMap()), requestId: String? = null): SendReceipt =
            client.send(conversationId, text, requestId, props)

        public suspend fun list(beforeSequence: String? = null): MessagePage = client.messages(conversationId, beforeSequence)

        public suspend fun edit(message: Message, text: String, requestId: String? = null): Message {
            require(message.conversationId == conversationId) { "Message is outside this conversation" }
            return client.edit(message, text, requestId)
        }

        public suspend fun delete(message: Message, requestId: String? = null): Message {
            require(message.conversationId == conversationId) { "Message is outside this conversation" }
            return client.delete(message, requestId)
        }
    }

    /**
     * This user's mute of message notifications for the conversation. A
     * future RFC 3339 `until` applies only to a mute. Calls still ring a
     * muted member.
     */
    public inner class Mute internal constructor() {
        public suspend fun get(): ConversationMute =
            own(client.execute(Operations.Communication.conversationMute, ConversationMuteInput(conversationId).toJson()).result)

        public suspend fun set(muted: Boolean, until: String? = null, requestId: String? = null): ConversationMute {
            val input = SetConversationMuteInput(conversationId, muted, until).toJson()
            return own(client.execute(Operations.Communication.setConversationMute, input, requestId).result)
        }
    }

    private fun own(mute: ConversationMute): ConversationMute {
        if (mute.conversationId != conversationId || mute.principalId != client.principalId) {
            protocolError("Conversation mute does not match the request")
        }
        return mute
    }
}

/** Calls and broadcasts in one conversation. */
public class ConversationLive internal constructor(private val conversation: ConversationHandle) {
    /** The conversation's current call or broadcast, if any. */
    public suspend fun current(): LiveSessionHandle? {
        val input = ConversationLiveInput(conversation.conversationId).toJson()
        val current = conversation.client.execute(Operations.Communication.currentLiveSession, input).result ?: return null
        return LiveSessionHandle(conversation.client, current)
    }

    public suspend fun history(limit: Int? = null, cursor: String? = null): LiveSessionPage {
        val input = LiveSessionsInput(conversation.conversationId, limit, cursor).toJson()
        return conversation.client.execute(Operations.Communication.liveSessions, input).result
    }

    public suspend fun startVoice(requestId: String? = null): LiveStartOperation =
        start(LiveSessionKind.INTERACTIVE, LiveMediaProfile.AUDIO_ONLY, requestId)

    public suspend fun startVideo(requestId: String? = null): LiveStartOperation =
        start(LiveSessionKind.INTERACTIVE, LiveMediaProfile.AUDIO_VIDEO, requestId)

    public suspend fun startBroadcast(mediaProfile: LiveMediaProfile, requestId: String? = null): LiveStartOperation =
        start(LiveSessionKind.BROADCAST, mediaProfile, requestId)

    private suspend fun start(kind: LiveSessionKind, mediaProfile: LiveMediaProfile, requestId: String?): LiveStartOperation {
        val client = conversation.client
        val input = StartLiveSessionInput(conversation.conversationId, kind, mediaProfile).toJson()
        return LiveStartOperation(client, client.execute(Operations.Communication.startLiveSession, input, requestId))
    }
}

/**
 * An accepted start or end request. The authority completes it
 * asynchronously; poll it with [get] or wait with [completed].
 */
public abstract class LiveAction internal constructor(
    public val client: ConvoHopClient,
    public val operationId: String,
    public val liveSessionId: String,
    public val kind: LiveOperationKind,
    /** The original request ID; reuse it to resolve or resend this exact request. */
    public val requestId: String,
) {
    init {
        parseId(operationId)
        parseId(liveSessionId)
        parseId(requestId)
    }

    public suspend fun get(): LiveSessionOperation {
        val input = LiveSessionOperationInput(operationId).toJson()
        val result = client.execute(Operations.Communication.liveSessionOperation, input).result
        if (result.liveSessionId != liveSessionId || result.operationId != operationId || result.kind != kind) {
            protocolError("Live action scope changed")
        }
        return result
    }

    /**
     * Polls until the action completes, fails or [timeoutMillis] (1 to 300000)
     * elapses. Cancel the calling coroutine to stop early. A timeout means the
     * outcome is still unknown, not that it failed.
     */
    public suspend fun completed(timeoutMillis: Long = 45_000): LiveSessionOperationCompletion {
        require(timeoutMillis in 1..300_000) { "Wait timeout must be 1..300000 ms" }
        val deadline = client.environment.now() + timeoutMillis
        do {
            val action = get()
            when (action.state) {
                LiveOperationState.COMPLETED -> {
                    val completion = action.completion
                    if (completion == null || (kind == LiveOperationKind.END && completion.mediaCutoff?.state != LiveCutoffState.ENFORCED)) {
                        protocolError("Completed action is missing its original completion evidence")
                    }
                    return completion
                }
                LiveOperationState.FAILED -> {
                    val failure = action.failure ?: protocolError("Failed live action is missing its reason")
                    throw ConvoHopProblem(failure.code.name, requestId, "accepted", 409, failure.message)
                }
                LiveOperationState.RUNNING -> delay(ACTION_POLL_MILLIS)
            }
        } while (client.environment.now() < deadline)
        throw ConvoHopProblem(
            "RESOLUTION_REQUIRED", requestId, "accepted", 409,
            "Action remains unresolved; retain this operation ID and query it again. Elapsed time is not cutoff.",
        )
    }
}

public class LiveStartOperation internal constructor(
    client: ConvoHopClient,
    public val receipt: StartLiveSessionPayload,
) : LiveAction(client, receipt.result.operationId, receipt.result.liveSessionId, LiveOperationKind.START, receipt.requestId) {
    /** Waits for the start to complete, then loads the live session. */
    public suspend fun ready(timeoutMillis: Long = 45_000): LiveSessionHandle {
        completed(timeoutMillis)
        return LiveSessionHandle.load(client, liveSessionId)
    }
}

public class LiveEndOperation internal constructor(
    client: ConvoHopClient,
    public val receipt: EndLiveSessionPayload,
) : LiveAction(client, receipt.result.operationId, receipt.result.liveSessionId, LiveOperationKind.END, receipt.requestId)

/**
 * One occurrence (generation) of a call or broadcast. While the app keeps a
 * handle, the recovery journal keeps the record of the end request it holds,
 * even once final, so a repeated [end] reuses that request.
 */
public class LiveSessionHandle internal constructor(
    public val client: ConvoHopClient,
    /** The state when this handle was created; [get] reads the current state. */
    public val snapshot: LiveSession,
) {
    public val liveSessionId: String = parseId(snapshot.liveSessionId)
    public val generation: String = snapshot.generation
    public val conversationId: String = parseId(snapshot.conversationId)
    private var endRequest: String? = null

    /** Alerts (rings) other members about this call. */
    public val alerts: Alerts = Alerts()

    init {
        client.http.retainWhileReachable(this) { (it as LiveSessionHandle).heldRequests() }
    }

    private fun heldRequests(): List<String> = listOfNotNull(endRequest)

    internal companion object {
        suspend fun load(client: ConvoHopClient, liveSessionId: String): LiveSessionHandle =
            LiveSessionHandle(
                client,
                client.execute(Operations.Communication.liveSession, LiveSessionInput(parseId(liveSessionId)).toJson()).result,
            )
    }

    /** The current state of this occurrence. */
    public suspend fun get(): LiveSession {
        val current = load(client, liveSessionId).snapshot
        if (current.generation != generation || current.conversationId != conversationId) {
            protocolError("Live occurrence identity changed")
        }
        return current
    }

    /** Joins with a participation reservation; connect media with [LiveParticipationHandle.connect]. */
    public suspend fun join(requestId: String? = null): LiveParticipationHandle {
        val input = JoinLiveSessionInput(liveSessionId, generation).toJson()
        val receipt = client.execute(Operations.Communication.joinLiveSession, input, requestId)
        return LiveParticipationHandle.create(this, receipt.result.participation)
    }

    /** This user's current participation, if any. */
    public suspend fun participation(): LiveParticipationHandle? =
        get().myParticipation?.let { LiveParticipationHandle.create(this, it) }

    public suspend fun participants(limit: Int? = null, cursor: String? = null): LiveParticipantPage =
        client.execute(Operations.Communication.liveSessionParticipants, LiveParticipantsInput(liveSessionId, limit, cursor).toJson()).result

    public inner class Alerts internal constructor() {
        public suspend fun send(principalIds: List<String>, requestId: String? = null): AlertLiveSessionPayload {
            val input = AlertLiveSessionInput(liveSessionId, generation, principalIds.map { requireId(it, "principalId") }).toJson()
            return client.execute(Operations.Communication.alertLiveSession, input, requestId)
        }
    }

    /**
     * Ends the occurrence for everyone. Repeated calls, including after an
     * app restart, reuse the original request and its expected revision.
     */
    public suspend fun end(requestId: String? = null): LiveEndOperation = client.serial {
        val request = requestId ?: endRequest ?: client.http.recoveryStates().lastOrNull {
            it.operation == Operations.Communication.endLiveSession.descriptor.id &&
                it.input["liveSessionId"].stringOrNull() == liveSessionId
        }?.requestId ?: client.environment.uuid()
        endRequest = request
        val saved = client.http.recoveryStates().firstOrNull { it.requestId == request }
        val revision = if (saved != null) saved.input["expectedRevision"].stringOrNull() else get().revision
        if (revision == null) protocolError("Missing original end revision")
        val input = EndLiveSessionInput(liveSessionId, generation, revision).toJson()
        LiveEndOperation(client, client.execute(Operations.Communication.endLiveSession, input, request))
    }
}

/**
 * This user's participation in one live session: its native media connection
 * and leave. While the app keeps a handle, the recovery journal keeps the
 * records of the leave and credential requests it holds, even once final.
 */
public class LiveParticipationHandle private constructor(
    public val live: LiveSessionHandle,
    /** The participation when this handle was created; [get] reads the current one. */
    public val snapshot: LiveParticipation,
    private var leaveRequest: String?,
) {
    public val participationId: String = parseId(snapshot.participationId)

    private class Attempt(
        val requestId: String,
        val mode: LiveConnectionMode,
        val replacementOfConnectionId: String?,
        var used: Boolean,
    )

    private var attempt: Attempt? = null
    private var connection: MediaConnection? = null
    private var connecting: Deferred<MediaConnection>? = null
    private val client: ConvoHopClient get() = live.client

    init {
        client.http.retainWhileReachable(this) { (it as LiveParticipationHandle).heldRequests() }
    }

    private fun heldRequests(): List<String> = listOfNotNull(leaveRequest, attempt?.requestId)

    internal companion object {
        suspend fun create(live: LiveSessionHandle, snapshot: LiveParticipation): LiveParticipationHandle {
            val participationId = parseId(snapshot.participationId)
            // Takes over an earlier leave in the same step that has the journal keep its record.
            return live.client.serial {
                val leave = live.client.http.recoveryStates().lastOrNull {
                    it.operation == Operations.Communication.leaveLiveSession.descriptor.id &&
                        it.input["participationId"].stringOrNull() == participationId
                }?.requestId
                LiveParticipationHandle(live, snapshot, leave)
            }
        }
    }

    public suspend fun get(): LiveParticipation {
        val current = live.get().myParticipation
        if (current == null || current.participationId != participationId) {
            throw ConvoHopProblem(
                "PARTICIPATION_MISMATCH", client.environment.uuid(), "rejected", 409, "This participation is no longer current",
            )
        }
        return current
    }

    /**
     * Connects native media with fresh single-use credentials. Concurrent
     * calls share one attempt; a connected participation returns its
     * connection. Never starts capture: enable the microphone or camera on
     * the returned connection.
     */
    public suspend fun connect(media: MediaOptions, requestId: String? = null): MediaConnection {
        val work = client.serial {
            check(leaveRequest == null) { "Leave has been requested; resolve its cutoff before rejoining" }
            connecting ?: connection?.takeIf { it.connected }?.let { CompletableDeferred(it) } ?: startConnect(media, requestId)
        }
        return work.await()
    }

    private fun startConnect(media: MediaOptions, requestId: String?): Deferred<MediaConnection> {
        lateinit var pending: Deferred<MediaConnection>
        pending = client.scope.async(start = CoroutineStart.LAZY) {
            try {
                val opened = MediaConnection.connectParticipation(this@LiveParticipationHandle, media, requestId)
                if (leaveRequest != null) {
                    opened.disconnect()
                    throw IllegalStateException("Participation was left during connection")
                }
                connection = opened
                opened
            } finally {
                if (connecting === pending) connecting = null
            }
        }
        connecting = pending
        pending.start()
        return pending
    }

    internal class Grant(val requestId: String, val grant: LiveConnectionGrant)

    /**
     * Issues native credentials, preserving each credential command
     * separately from native connection attempts. A used or uncertain attempt
     * is resolved, never blindly reused.
     */
    internal suspend fun connectionGrant(requestId: String?): Grant = client.serial {
        val liveSessionId = live.liveSessionId
        val generation = live.generation
        val current = get()
        if (attempt == null) {
            val previous = client.http.recoveryStates().lastOrNull {
                it.operation == Operations.Communication.liveSessionCredentials.descriptor.id &&
                    it.input["participationId"].stringOrNull() == participationId
            }
            if (previous != null) {
                val mode = when (previous.input["mode"].stringOrNull()) {
                    "INITIAL" -> LiveConnectionMode.INITIAL
                    "RECONNECT" -> LiveConnectionMode.RECONNECT
                    else -> protocolError("Unknown stored credential operation")
                }
                val replacement = previous.input["replacementOfConnectionId"]?.let { parseId(it) }
                attempt = Attempt(previous.requestId, mode, replacement, previous.mediaAdmissionAttempted || current.nativeConnectionId != null)
            }
        }
        val old = attempt
        val saved = old?.let { a -> client.http.recoveryStates().firstOrNull { it.requestId == a.requestId } }
        val now = client.environment.now()
        val needsResolution = saved != null && (
            saved.attemptCount >= 3 || now > saved.retryDeadline || now < saved.firstSubmittedAt || now < saved.lastAttemptAt ||
                saved.lastAttemptClassification == "CREDENTIAL_REFRESH_REQUIRED"
            )
        if (old != null && (old.used || needsResolution || (requestId != null && requestId != old.requestId))) {
            val resolution = client.requests.resolve(old.requestId)
            val issuance = resolution.receipt?.result?.liveCredentialIssuance
            if (issuance == null || issuance.participationId != participationId || issuance.liveSessionId != liveSessionId) {
                throw ConvoHopProblem(
                    "RESOLUTION_REQUIRED", old.requestId, "unknown", 409,
                    "Resolve the original credential attempt before obtaining another grant",
                )
            }
            val unobserved = current.nativeConnectionId == null ||
                (old.mode == LiveConnectionMode.RECONNECT && current.nativeConnectionId == old.replacementOfConnectionId)
            if (unobserved && timestampMillis(issuance.admissionExpiresAt) > timestampMillis(resolution.checkedAt)) {
                throw ConvoHopProblem(
                    "RESOLUTION_REQUIRED", old.requestId, "committed", 409,
                    "Native admission remains unresolved; keep this reservation and retry or explicitly leave",
                )
            }
            if (requestId == old.requestId) {
                throw ConvoHopProblem(
                    "CREDENTIAL_REFRESH_REQUIRED", old.requestId, "committed", 409,
                    "The resolved old credential requires a separately identified fresh attempt",
                )
            }
            attempt = null
        }
        val next = attempt ?: Attempt(
            requestId ?: client.environment.uuid(),
            if (current.nativeConnectionId != null) LiveConnectionMode.RECONNECT else LiveConnectionMode.INITIAL,
            current.nativeConnectionId,
            used = false,
        ).also { attempt = it }
        val input = LiveSessionCredentialsInput(liveSessionId, participationId, generation, next.mode, next.replacementOfConnectionId).toJson()
        val grant = client.http.execute(Operations.Communication.liveSessionCredentials, client.projectId, input, next.requestId).result
        if (grant.liveSessionId != liveSessionId || grant.participationId != participationId || grant.generation != generation) {
            protocolError("Native credential scope differs from the participation")
        }
        Grant(next.requestId, grant)
    }

    /** Marks the attempt used before signaling starts; an uncertain admission is then resolved, never reused. */
    internal suspend fun connectionAttempted(): Unit = client.serial {
        val current = attempt ?: throw IllegalStateException("No credential attempt exists")
        current.used = true
        client.http.markMediaAdmissionAttempted(current.requestId)
    }

    /**
     * Disconnects media and leaves. Repeated calls, including after an app
     * restart, reuse the original leave request.
     */
    public suspend fun leave(requestId: String? = null): LeaveLiveSessionPayload = client.serial {
        val existing = leaveRequest
        if (existing != null && requestId != null && requestId != existing) {
            throw IllegalStateException("Resolve the original leave request before replacing its identity")
        }
        val request = existing ?: (requestId ?: client.environment.uuid()).also { leaveRequest = it }
        connection?.disconnect()
        val input = LeaveLiveSessionInput(live.liveSessionId, live.generation, participationId).toJson()
        client.http.execute(Operations.Communication.leaveLiveSession, client.projectId, input, request)
    }
}
