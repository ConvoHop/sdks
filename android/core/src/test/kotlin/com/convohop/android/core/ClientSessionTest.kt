package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import com.convohop.android.generated.SessionBootstrap
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ClientSessionTest {
    @Test
    fun sessionRenewsBeforeItExpiresAndTheReplayFollowsTheNewBearer() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val renewed = ArrayList<SessionBootstrap>()
            val client = h.client(
                h.authority.issue(600_000),
                refresh = SessionRefresh { current -> h.authority.renew(current).also(renewed::add) },
            )
            client.refreshAutomatically { h.errors += it }.use {
                val timeline = h.store(client).timeline(conversation)
                h.settle()
                assertEquals(ReplayState.LIVE, timeline.replay.value)
                assertEquals("1", client.sessionBinding?.sessionRevision)

                // A ten-minute session renews two minutes before it expires.
                h.advance(479_999)
                assertTrue(renewed.isEmpty())
                h.advance(1)

                val bootstrap = renewed.single()
                assertEquals("2", client.sessionBinding?.sessionRevision)
                assertEquals(SessionRefreshState.READY, client.sessionRefreshState)
                assertEquals(bootstrap.sessionToken, h.authority.sockets.single().token)
                assertEquals(ReplayState.LIVE, timeline.replay.value)
                h.authority.post(conversation, OTHER, "after renewal")
                h.settle()
                assertEquals("after renewal", (timeline.items.value.single() as TimelineItem.Sent).message.text)
                assertEquals(bootstrap.sessionToken, h.authority.calls("CommunicationMessages").last().token)
                assertTrue(h.errors.isEmpty())
            }
        }
    }

    @Test
    fun renewalReleasesMessagesHeldForTheSession() = runTest {
        Harness(this).use { h ->
            val conversation = h.authority.conversation()
            val token = h.authority.issue()
            val renewed = ArrayList<SessionBootstrap>()
            val client = h.client(token, refresh = SessionRefresh { current -> h.authority.renew(current).also(renewed::add) })
            client.initialize()
            h.authority.fail("CommunicationSendMessage", Fault.Problem("SESSION_REFRESH_REQUIRED", 409))
            val store = h.store(client)

            val queued = store.outbox.send(conversation, "hello")
            h.settle()
            store.outbox.send(conversation, "world")
            h.advance(30_000)
            assertEquals(listOf(PendingState.QUEUED, PendingState.QUEUED), store.outbox.pending.value.map { it.state })
            assertEquals("SESSION_REFRESH_REQUIRED", store.outbox.pending.value.first().errorCode)
            client.refreshSession()
            h.settle()

            assertEquals(listOf(PendingState.SENT, PendingState.SENT), store.outbox.pending.value.map { it.state })
            assertEquals(listOf("hello", "world"), h.authority.messages(conversation).map { it.text })
            val sends = h.authority.calls("CommunicationSendMessage")
            assertEquals(listOf(queued.requestId, queued.requestId), sends.take(2).map { it.requestId })
            assertEquals(listOf(token, renewed.single().sessionToken, renewed.single().sessionToken), sends.map { it.token })
            assertEquals(listOf("SESSION_REFRESH_REQUIRED"), h.errorCodes())
        }
    }

    @Test
    fun schedulingAnUninitializedClientProvesTheBearerFirstAndRetriesOnlyTransientFailures() = runTest {
        Harness(this).use { h ->
            val client = h.client(refresh = SessionRefresh { current -> h.authority.renew(current) })
            h.authority.fail("CommunicationRoute", Fault.Problem("AUTHORITY_UNAVAILABLE", 503))
            h.authority.fail("CommunicationCurrentSession", Fault.Problem("RATE_LIMITED", 429, retryAfter = 30))
            client.refreshAutomatically { h.errors += it }.use {
                h.at(4_999)
                assertEquals(listOf(listOf<Any?>("AUTHORITY_UNAVAILABLE", 503, null)), h.problems())
                assertEquals(1, h.authority.calls.size)
                h.at(5_000)
                assertEquals(2, h.problems().size)
                // The authority's retryAfter outranks the ten-second backoff.
                h.at(34_999)
                assertEquals(SessionRefreshState.UNINITIALIZED, client.sessionRefreshState)
                h.at(35_000)
                assertEquals(SessionRefreshState.READY, client.sessionRefreshState)
                // A failed proof binds nothing, so the next initialization proves the bearer again.
                assertEquals(
                    listOf("CommunicationRoute", "CommunicationRoute", "CommunicationCurrentSession", "CommunicationRoute", "CommunicationCurrentSession"),
                    h.authority.calls.map { it.operation },
                )
                assertEquals(listOf(listOf<Any?>("AUTHORITY_UNAVAILABLE", 503, null), listOf<Any?>("RATE_LIMITED", 429, 30L)), h.problems())
            }
        }
    }

    @Test
    fun aScheduledInitializationThatNoRetryCanChangeIsReportedOnceAndNotRetried() = runTest {
        for ((code, status, retryAfter) in listOf(
            Triple("UNAUTHENTICATED", 401, null), Triple("FORBIDDEN", 403, null), Triple("QUOTA_EXCEEDED", 429, 60L),
            Triple("PLAN_LIMIT_EXCEEDED", 403, 60L),
        )) {
            Harness(this).use { h ->
                val client = h.client(refresh = SessionRefresh { current -> h.authority.renew(current) })
                h.authority.fail("CommunicationRoute", Fault.Problem(code, status, retryAfter = retryAfter))
                client.refreshAutomatically { h.errors += it }.use {
                    h.advance(600_000)
                    assertEquals(listOf(listOf<Any?>(code, status, retryAfter)), h.problems())
                    assertEquals(code, 1, h.authority.calls.size)
                    assertEquals(SessionRefreshState.UNINITIALIZED, client.sessionRefreshState)
                }
            }
        }
    }

    @Test
    fun aScheduledInitializationRetriesGatewayAndServerErrorsWithBackoff() = runTest {
        Harness(this).use { h ->
            val client = h.client(refresh = SessionRefresh { current -> h.authority.renew(current) })
            h.authority.fail(
                "CommunicationRoute",
                Fault.Http(502, "<html>Bad gateway</html>"),
                Fault.Http(504, """{"message":"Gateway timeout"}"""),
                Fault.Http(500, """{"code":"AUTHORITY_UNAVAILABLE","outcome":"unknown","message":"Fixture failure"}"""),
                Fault.Http(503, "<html>Service unavailable</html>", retryAfter = "45"),
            )
            client.refreshAutomatically { h.errors += it }.use {
                // Five seconds, doubling, and no sooner than the Retry-After header of a response that isn't JSON.
                for ((attempt, at) in listOf(0L, 5_000L, 15_000L, 35_000L, 80_000L).withIndex()) {
                    if (at > 0) h.at(at - 1)
                    assertEquals(attempt, h.authority.calls("CommunicationRoute").size)
                    h.at(at)
                }
                assertEquals(
                    listOf(listOf<Any?>("INVALID_RESPONSE", 502, null), listOf<Any?>("HTTP_FAILURE", 504, null),
                        listOf<Any?>("AUTHORITY_UNAVAILABLE", 500, null), listOf<Any?>("INVALID_RESPONSE", 503, 45L)),
                    h.problems(),
                )
                assertEquals(SessionRefreshState.READY, client.sessionRefreshState)
            }
        }
    }

    @Test
    fun recoveryAtStartupSettlesRequestsRejectedWithARetryableCode() = runTest {
        Harness(this).use { h ->
            val storage = MemoryRecoveryStorage()
            val client = h.client(storage = storage)
            val conversation = h.authority.conversation()
            val (unavailable, limited, missing) = List(3) { h.environment.uuid() }
            h.authority.fail(
                "CommunicationSendMessage",
                Fault.Problem("AUTHORITY_UNAVAILABLE", 503), Fault.Problem("RATE_LIMITED", 429), Fault.Problem("NOT_FOUND", 404),
            )
            for (requestId in listOf(unavailable, limited, missing)) {
                assertTrue(runCatching { client.send(conversation, "fixture", requestId) }.exceptionOrNull() is ConvoHopProblem)
            }

            // A transient rejection is resent while its budget lasts, a rate limit only resolved, and NOT_FOUND left alone.
            h.client(storage = storage).recoverPending { h.errors += it }

            assertEquals(listOf(unavailable, limited, missing, unavailable), h.sends())
            // A retry resolves its request before and after resending it.
            assertEquals(listOf(unavailable, unavailable, limited), h.resolutions())
            assertEquals(listOf("fixture"), h.authority.messages(conversation).map { it.text })
            assertTrue(h.errors.isEmpty())
        }
    }

    /** Runs everything due by [millis] on the test's clock. */
    private fun Harness.at(millis: Long) = advance(millis - (now() - BASE_TIME))

    private fun Harness.problems(): List<List<Any?>> =
        errors.map { error -> (error as ConvoHopProblem).let { listOf(it.code, it.status, it.retryAfter) } }
}
