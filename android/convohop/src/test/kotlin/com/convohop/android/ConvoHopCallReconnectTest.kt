@file:OptIn(ExperimentalCoroutinesApi::class)

package com.convohop.android

import com.convohop.android.core.ConvoHopProblem
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** How a call reconnects dropped media, and when it gives up. */
internal class ConvoHopCallReconnectTest {
    @Test
    fun aDropReconnectsAndRestoresTheWishes() = runTest {
        val rig = CallRig(this)
        val call = rig.start()
        call.microphone(true)
        val gate = CompletableDeferred<Unit>()
        rig.outcomes.addLast {
            gate.await()
            rig.media("m1")
        }
        rig.drop()
        runCurrent()
        assertEquals(CallPhase.RECONNECTING, call.phase.value)
        // A wish made while reconnecting applies to the new connection.
        call.camera(true)
        gate.complete(Unit)
        runCurrent()
        assertEquals(CallPhase.CONNECTED, call.phase.value)
        assertEquals(listOf("m0 microphone true", "m1 microphone true", "m1 camera true"), rig.log)
        assertEquals(listOf(0L), rig.reconnects)
        assertTrue(rig.errors.isEmpty())
    }

    @Test
    fun retryableFailuresBackOffUntilTheDeadlineThenTheCallEnds() = runTest {
        val rig = CallRig(this)
        val call = rig.start(timeoutMillis = 3_000)
        rig.drop()
        advanceUntilIdle()
        // The pause doubles from 500 ms, and the last attempt comes at the deadline.
        assertEquals(listOf(0L, 500L, 1_500L, 3_000L), rig.reconnects)
        assertEquals(CallPhase.ENDED, call.phase.value)
        assertEquals(listOf("end", "leave"), rig.log)
        assertEquals(4, rig.errors.size)
    }

    @Test
    fun aZeroTimeoutEndsTheCallAtTheFirstFailure() = runTest {
        val rig = CallRig(this)
        val call = rig.start(timeoutMillis = 0)
        rig.drop()
        advanceUntilIdle()
        assertEquals(listOf(0L), rig.reconnects)
        assertEquals(CallPhase.ENDED, call.phase.value)
    }

    @Test
    fun aRejectionEndsTheCallAtOnce() = runTest {
        val failures = listOf(
            ConvoHopProblem("PARTICIPATION_MISMATCH", "request-1", "rejected", 409, "This participation is no longer current"),
            IllegalStateException("A deliberately closed connection cannot reconnect"),
        )
        for (failure in failures) {
            val rig = CallRig(this)
            val call = rig.start()
            rig.outcomes.addLast { throw failure }
            rig.drop()
            advanceUntilIdle()
            assertEquals(1, rig.reconnects.size)
            assertEquals(CallPhase.ENDED, call.phase.value)
            assertEquals(listOf("end", "leave"), rig.log)
            assertEquals(listOf<Throwable>(failure), rig.errors)
        }
    }

    @Test
    fun theAuthoritysRetryDelayIsHonoured() = runTest {
        val rig = CallRig(this)
        val call = rig.start(timeoutMillis = 10_000)
        rig.outcomes.addLast { throw limited(seconds = 2) }
        rig.outcomes.addLast { throw limited(seconds = 60) }
        rig.drop()
        advanceUntilIdle()
        // A delay past the deadline ends the call rather than resend early.
        assertEquals(listOf(0L, 2_000L), rig.reconnects)
        assertEquals(2_000L, testScheduler.currentTime)
        assertEquals(CallPhase.ENDED, call.phase.value)
    }

    @Test
    fun aConnectionThatDropsBeforeItIsAdoptedCountsAsAFailedAttempt() = runTest {
        val rig = CallRig(this)
        val call = rig.start()
        call.microphone(true)
        rig.outcomes.addLast {
            val short = rig.media("m1")
            rig.drop()
            yield()
            short
        }
        rig.outcomes.addLast { rig.media("m2") }
        rig.drop()
        advanceUntilIdle()
        assertEquals(listOf(0L, 500L), rig.reconnects)
        assertEquals(CallPhase.CONNECTED, call.phase.value)
        assertEquals(listOf("m0 microphone true", "m2 microphone true"), rig.log)
        assertTrue(rig.errors.isEmpty())
    }

    @Test
    fun hangingUpWhileReconnectingStopsTheAttempts() = runTest {
        val rig = CallRig(this)
        val call = rig.start()
        rig.drop()
        runCurrent()
        call.hangUp()
        advanceUntilIdle()
        assertEquals(listOf(0L), rig.reconnects)
        assertEquals(listOf("end", "leave"), rig.log)
        assertEquals(CallPhase.ENDED, call.phase.value)
    }

    private fun limited(seconds: Long): ConvoHopProblem =
        ConvoHopProblem("RATE_LIMITED", "request-1", "rejected", 429, "Too many requests", seconds)
}
