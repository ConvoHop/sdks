package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** How the recovery journal records rejections and makes room once it holds 128 records. */
class RecoveryJournalTest {
    private val key = "convohop.requests:$PROJECT:$ME"

    @Test
    fun aRejectionIsTheOutcomeOnlyWhenEveryAttemptWasRejected() = runTest {
        Harness(this).use { h ->
            val storage = MemoryRecoveryStorage()
            val client = h.client(storage = storage)
            val conversation = h.authority.conversation()
            val (refused, limited, lost, retried) = List(4) { h.environment.uuid() }

            h.authority.fail("CommunicationSendMessage", Fault.Problem("NOT_FOUND", 404))
            assertEquals(listOf("NOT_FOUND", "rejected"), failure { client.send(conversation, "fixture", refused) }.let { listOf(it.code, it.outcome) })
            h.authority.fail("CommunicationSendMessage", Fault.Problem("RATE_LIMITED", 429))
            assertEquals(listOf("RATE_LIMITED", "rejected"), failure { client.send(conversation, "fixture", limited) }.let { listOf(it.code, it.outcome) })
            h.authority.fail("CommunicationSendMessage", Fault.LostResponse, Fault.Problem("RATE_LIMITED", 429))
            assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "fixture", lost) }.code)
            assertEquals("RATE_LIMITED", failure { client.send(conversation, "fixture", lost) }.code)
            h.authority.fail("CommunicationSendMessage", Fault.Problem("RATE_LIMITED", 429), Fault.LostResponse)
            assertEquals("RATE_LIMITED", failure { client.send(conversation, "fixture", retried) }.code)
            assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "fixture", retried) }.code)

            // A lost attempt may have committed, so no rejection before or after it settles that request.
            val expected = mapOf(
                refused to listOf("rejected", "NOT_FOUND", 1L),
                limited to listOf("rejected", "RATE_LIMITED", 1L),
                lost to listOf("unknown", "RATE_LIMITED", 2L),
                retried to listOf("unknown", "TRANSPORT_UNKNOWN", 2L),
            )
            assertEquals(expected, summary(client))
            assertEquals("A restarted client reads rejected records", expected, summary(h.client(storage = storage)))

            // A rejected request may be sent again under its ID while its budget lasts.
            client.send(conversation, "fixture", limited)
            val record = client.requests.records().single { it.requestId == limited }
            assertEquals(listOf<Any>("committed", 2L), listOf(record.resolutionState, record.attemptCount))
        }
    }

    @Test
    fun aFullJournalFreesItsOldestFinalRecord() = runTest {
        Harness(this).use { h ->
            val now = h.now()
            fun at(index: Int) = now - 10_000 + index
            fun rejected(index: Int, classification: String, attemptCount: Long = 1, retryDeadline: Long = at(index) + 60_000) =
                stored(at(index), "rejected", h.environment.uuid(), classification, attemptCount, retryDeadline)
            val records = listOf(
                // Oldest, and not final: the app may still send each again under its ID. WRONG_REGION succeeds after routing again.
                stored(at(0), "unknown", h.environment.uuid()),
                stored(at(1), "pending", h.environment.uuid(), "notSubmitted", attemptCount = 0),
                rejected(2, "RATE_LIMITED"),
                rejected(3, "WRONG_REGION"),
                // Final: not retryable, out of attempts, past the retry deadline, then the oldest committed. A spent
                // budget makes a record final whatever its state, since nothing may send its request again.
                rejected(4, "NOT_FOUND"),
                rejected(5, "RATE_LIMITED", attemptCount = 3),
                rejected(6, "AUTHORITY_UNAVAILABLE", retryDeadline = now - 1),
                stored(at(7), "unknown", h.environment.uuid(), attemptCount = 3),
                stored(at(8), "pending", h.environment.uuid(), "notSubmitted", attemptCount = 0, retryDeadline = now - 1),
            ) + List(119) { stored(at(9 + it), "committed", h.environment.uuid(), "authorityReceipt") }
            val storage = MemoryRecoveryStorage()
            storage.setItem(key, JsonArray(records).toString())
            val client = h.client(storage = storage)
            val conversation = h.authority.conversation()

            val sent = List(6) { h.environment.uuid() }
            for (requestId in sent) client.send(conversation, "fixture", requestId)

            val kept = (records.take(4) + records.drop(10)).map { it.requestId() } + sent
            assertEquals(kept, saved(storage))
            assertEquals(kept, client.kept())
        }
    }

    @Test
    fun lostSendsBecomeFinalOnceTheirBudgetIsSpent() = runTest {
        Harness(this).use { h ->
            val storage = MemoryRecoveryStorage()
            val client = h.client(storage = storage)
            val conversation = h.authority.conversation()
            // A send lost on the way may have been applied, so its record stays while it may be sent again.
            val lost = List(JOURNAL_LIMIT) { h.environment.uuid() }
            h.authority.fail("CommunicationSendMessage", *Array(JOURNAL_LIMIT + 2) { Fault.Unreachable })
            for (requestId in lost) {
                h.advance(1)
                assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "fixture", requestId) }.code)
            }
            assertEquals("RECOVERY_LIMIT", failure { client.send(conversation, "fixture", h.environment.uuid()) }.code)

            // Its third attempt spends a request's budget, so its record makes room though the outcome is unknown.
            val spent = lost[5]
            repeat(2) { assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "fixture", spent) }.code) }
            assertEquals(listOf<Any>("unknown", 3L), client.requests.records().single { it.requestId == spent }.let { listOf(it.resolutionState, it.attemptCount) })
            val first = h.environment.uuid()
            client.send(conversation, "fixture", first)
            assertEquals(lost - spent + first, client.kept())

            // Past their retry deadline, the others are final too, and the one attempted longest ago goes first.
            h.advance(60_000)
            val second = h.environment.uuid()
            client.send(conversation, "fixture", second)
            assertEquals(lost.drop(1) - spent + first + second, client.kept())
            assertEquals(client.kept(), saved(storage))
        }
    }

    @Test
    fun aJournalOfRecordsThatArentFinalRefusesNewRequestsUntilOneIs() = runTest {
        Harness(this).use { h ->
            val storage = MemoryRecoveryStorage()
            val client = h.client(storage = storage)
            val conversation = h.authority.conversation()
            // A rate-limited request may be sent again under its ID, so its record stays.
            val limited = List(JOURNAL_LIMIT) { h.environment.uuid() }
            h.authority.fail("CommunicationSendMessage", *Array(JOURNAL_LIMIT) { Fault.Problem("RATE_LIMITED", 429) })
            for (requestId in limited) assertEquals("RATE_LIMITED", failure { client.send(conversation, "fixture", requestId) }.code)

            val before = storage.getItem(key)
            val sends = h.sends().size
            val refused = h.environment.uuid()
            val refusal = failure { client.send(conversation, "fixture", refused) }
            assertEquals(listOf<Any>("RECOVERY_LIMIT", refused, "rejected", 409), listOf(refusal.code, refusal.requestId, refusal.outcome, refusal.status))
            assertEquals("Nothing is written", before, storage.getItem(key))
            assertEquals("Nothing is sent", sends, h.sends().size)
            assertEquals(limited, client.kept())

            // Sent again under its ID, a request commits, so its record makes room for the next new request.
            client.send(conversation, "fixture", limited[5])
            val next = h.environment.uuid()
            client.send(conversation, "fixture", next)
            assertEquals(limited.take(5) + limited.drop(6) + next, client.kept())
            assertEquals(client.kept(), saved(storage))
        }
    }

    @Test
    fun aFullJournalKeepsFinalRecordsThatACallerRetainsOrACallIsUsing() = runTest {
        Harness(this).use { h ->
            val now = h.now()
            val records = List(JOURNAL_LIMIT - 2) {
                if (it == 0) stored(now - 10_000, "committed", h.environment.uuid(), "authorityReceipt")
                else stored(now - 10_000 + it, "unknown", h.environment.uuid())
            }
            val storage = MemoryRecoveryStorage()
            storage.setItem(key, JsonArray(records).toString())
            val client = h.client(storage = storage)
            val conversation = h.authority.conversation()
            val (refused, resent) = List(2) { h.environment.uuid() }
            h.authority.fail("CommunicationSendMessage", Fault.Problem("NOT_FOUND", 404), Fault.Unreachable)
            assertEquals("NOT_FOUND", failure { client.send(conversation, "fixture", resent) }.code)
            assertEquals("TRANSPORT_UNKNOWN", failure { client.send(conversation, "fixture", h.environment.uuid()) }.code)

            val oldest = records[0].requestId()
            val release = client.http.retainRecovery { listOf(oldest) }
            // Resent under its ID, the rejected request's record is in use until its attempt counts.
            var refusal: Throwable? = null
            val forget = client.http.beforeSubmitting(resent) {
                refusal = runCatching { client.send(conversation, "fixture", refused) }.exceptionOrNull()
            }
            client.send(conversation, "fixture", resent)
            forget()
            val problem = refusal as? ConvoHopProblem
            assertNotNull(refusal?.toString(), problem)
            assertEquals(listOf<Any>("RECOVERY_LIMIT", refused), listOf(problem!!.code, problem.requestId))

            release()
            val next = h.environment.uuid()
            client.send(conversation, "fixture", next)
            assertFalse("Released, the oldest final record goes", oldest in client.kept())
            assertTrue(resent in client.kept() && next in client.kept())
            assertFalse(refused in client.kept())
        }
    }

    private suspend fun saved(storage: RecoveryStorage): List<String> =
        Json.parseToJsonElement(storage.getItem(key)!!).jsonArray.map { it.requestId() }

    private suspend fun summary(client: ConvoHopClient): Map<String, List<Any>> =
        client.requests.records().associate { it.requestId to listOf(it.resolutionState, it.lastAttemptClassification, it.attemptCount) }

    private fun kotlinx.serialization.json.JsonElement.requestId(): String = jsonObject.getValue("requestId").jsonPrimitive.content

    /** Another run's stored record of a message it sent, attempted at [at]. */
    private fun stored(
        at: Long,
        resolutionState: String,
        requestId: String,
        classification: String = "submitted",
        attemptCount: Long = 1,
        retryDeadline: Long = at + 60_000,
    ): JsonObject = buildJsonObject {
        put("requestId", requestId)
        put("incarnation", INCARNATION)
        put("payloadFingerprint", "fixture")
        put("operation", "communication.sendMessage")
        put("projectId", PROJECT)
        putJsonObject("input") {
            put("conversationId", testId(9, 1))
            put("text", requestId)
            putJsonObject("props") {}
        }
        put("firstSubmittedAt", at)
        put("retryDeadline", retryDeadline)
        put("attemptCount", attemptCount)
        put("lastAttemptAt", at)
        put("lastAttemptClassification", classification)
        put("resolutionState", resolutionState)
    }
}
