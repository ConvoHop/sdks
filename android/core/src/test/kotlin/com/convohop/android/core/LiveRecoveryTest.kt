package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import com.convohop.android.generated.LeaveLiveSessionInput
import com.convohop.android.generated.LiveMediaPermissions
import com.convohop.android.generated.LiveMediaProfile
import com.convohop.android.generated.LiveParticipation
import com.convohop.android.generated.LiveParticipationState
import com.convohop.android.generated.LiveRole
import com.convohop.android.generated.LiveSession
import com.convohop.android.generated.LiveSessionKind
import com.convohop.android.generated.LiveSessionState
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Test
import java.lang.ref.WeakReference

private val LIVE = testId(6, 1)
private val PARTICIPATION = testId(6, 2)

/** How live handles keep the recovery records of the requests they hold while the app keeps the handles. */
class LiveRecoveryTest {
    private val key = "convohop.requests:$PROJECT:$ME"

    @Test
    fun aFullJournalKeepsTheRecordsThatLiveHandlesHoldUntilTheAppDropsThem() = runTest {
        Harness(this).use { h ->
            val storage = MemoryRecoveryStorage()
            val left = h.environment.uuid()
            storage.setItem(key, JsonArray(listOf(committedLeave(left, h.now() - 10_000))).toString())
            val client = h.client(storage = storage)
            val conversation = h.authority.conversation()
            h.authority.liveSessions[LIVE] = liveSession(conversation, participation())
            val fillers = List(JOURNAL_LIMIT - 3) { h.environment.uuid() }

            val handles = holdSpentRequests(h, client, conversation, left, fillers)
            collect(handles)

            // Dropped, the handles hold nothing, so new requests make room by evicting the three final records.
            val sent = List(3) { h.environment.uuid() }
            for (requestId in sent) client.send(conversation, "fixture", requestId)
            assertEquals(fillers + sent, client.kept())
            assertEquals(client.kept(), saved(storage))
        }
    }

    @Test
    fun aNewEndRequestReleasesTheOneItReplaces() = runTest {
        Harness(this).use { h ->
            val client = h.client(storage = MemoryRecoveryStorage())
            val conversation = h.authority.conversation()
            h.authority.liveSessions[LIVE] = liveSession(conversation)
            val live = LiveSessionHandle(client, h.authority.liveSessions.getValue(LIVE))
            val (spent, next) = List(2) { h.environment.uuid() }
            h.authority.fail("CommunicationEndLiveSession", *Array(4) { Fault.Unreachable })
            assertEquals("TRANSPORT_UNKNOWN", failure { live.end(spent) }.code)
            repeat(2) { assertEquals("TRANSPORT_UNKNOWN", failure { live.end() }.code) }
            val fillers = List(JOURNAL_LIMIT - 1) { h.environment.uuid() }
            h.authority.fail("CommunicationSendMessage", *Array(fillers.size) { Fault.Unreachable })
            for (requestId in fillers) assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "fixture", requestId) }.code)
            assertEquals("RECOVERY_LIMIT", failure { client.send(conversation, "fixture", h.environment.uuid()) }.code)

            // Ending under a new ID, the handle holds that request instead, so the spent one it replaced makes room.
            assertEquals("TRANSPORT_UNKNOWN", failure { live.end(next) }.code)
            assertEquals(fillers + next, client.kept())
            assertEquals(listOf(spent, spent, spent, next), h.authority.calls("CommunicationEndLiveSession").map { it.requestId })
        }
    }

    /**
     * Spends the budgets of an end and a credential request through handles
     * that also hold the stored leave [left], fills the journal with
     * [fillers] and checks that the handles keep all three records. Returns
     * only weak references, so once it returns the app has dropped the
     * handles.
     */
    private suspend fun holdSpentRequests(
        h: Harness,
        client: ConvoHopClient,
        conversation: String,
        left: String,
        fillers: List<String>,
    ): List<WeakReference<Any>> {
        val live = LiveSessionHandle(client, h.authority.liveSessions.getValue(LIVE))
        val participation = LiveParticipationHandle.create(live, participation())
        val (ended, credential) = List(2) { h.environment.uuid() }
        h.authority.fail("CommunicationEndLiveSession", *Array(3) { Fault.Unreachable })
        h.authority.fail("CommunicationLiveSessionCredentials", *Array(3) { Fault.Unreachable })
        assertEquals("TRANSPORT_UNKNOWN", failure { live.end(ended) }.code)
        assertEquals("TRANSPORT_UNKNOWN", failure { participation.connectionGrant(credential) }.code)
        repeat(2) {
            h.advance(1)
            assertEquals("TRANSPORT_UNKNOWN", failure { live.end() }.code)
            assertEquals("TRANSPORT_UNKNOWN", failure { participation.connectionGrant(null) }.code)
        }
        h.authority.fail("CommunicationSendMessage", *Array(fillers.size) { Fault.Unreachable })
        for (requestId in fillers) assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "fixture", requestId) }.code)

        // Committed or out of attempts, each held record is final, yet none makes room.
        assertEquals(listOf(left, ended, credential) + fillers, client.kept())
        assertEquals("RECOVERY_LIMIT", failure { client.send(conversation, "fixture", h.environment.uuid()) }.code)
        // Repeated, each finds its request out of attempts instead of sending it again as a new one.
        assertEquals(listOf("RESOLUTION_REQUIRED", ended), failure { live.end() }.let { listOf(it.code, it.requestId) })
        assertEquals(
            listOf("RESOLUTION_REQUIRED", credential),
            failure { participation.connectionGrant(null) }.let { listOf(it.code, it.requestId) },
        )
        assertEquals(List(3) { ended }, h.authority.calls("CommunicationEndLiveSession").map { it.requestId })
        assertEquals(List(3) { credential }, h.authority.calls("CommunicationLiveSessionCredentials").map { it.requestId })
        return listOf(WeakReference(live), WeakReference(participation))
    }

    /** Collects garbage until nothing references [handles] any more, as once the app drops them. */
    private suspend fun collect(handles: List<WeakReference<Any>>) {
        repeat(100) {
            // Suspending lets the frames that resumed the handles' calls return, and with them their continuations.
            yield()
            if (handles.all { it.get() == null }) return
            System.gc()
            Thread.sleep(10)
        }
        throw AssertionError("Dropped live handles stay reachable, so the journal would keep their records for good")
    }

    private fun liveSession(conversationId: String, mine: LiveParticipation? = null) = LiveSession(
        liveSessionId = LIVE,
        conversationId = conversationId,
        creatorId = ME,
        kind = LiveSessionKind.INTERACTIVE,
        mediaProfile = LiveMediaProfile.AUDIO_ONLY,
        state = LiveSessionState.ACTIVE,
        generation = "1",
        revision = "4",
        createdAt = Timestamps.format(BASE_TIME),
        expiresAt = Timestamps.format(BASE_TIME + 3_600_000),
        myParticipation = mine,
    )

    private fun participation() = LiveParticipation(
        participationId = PARTICIPATION,
        principalId = ME,
        membershipEpoch = "1",
        role = LiveRole.PUBLISHER,
        state = LiveParticipationState.JOINED,
        permissions = LiveMediaPermissions(microphone = true, camera = false, subscribe = true),
    )

    /** Another run's stored record of a leave the authority committed, attempted at [at]. */
    private fun committedLeave(requestId: String, at: Long): JsonObject = buildJsonObject {
        put("requestId", requestId)
        put("incarnation", INCARNATION)
        put("payloadFingerprint", "fixture")
        put("operation", "communication.leaveLiveSession")
        put("projectId", PROJECT)
        put("input", LeaveLiveSessionInput(LIVE, "1", PARTICIPATION).toJson())
        put("firstSubmittedAt", at)
        put("retryDeadline", at + 60_000)
        put("attemptCount", 1)
        put("lastAttemptAt", at)
        put("lastAttemptClassification", "authorityReceipt")
        put("resolutionState", "committed")
    }

    private suspend fun saved(storage: RecoveryStorage): List<String> =
        Json.parseToJsonElement(storage.getItem(key)!!).jsonArray.map { it.jsonObject.getValue("requestId").jsonPrimitive.content }
}
