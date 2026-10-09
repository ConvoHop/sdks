@file:OptIn(ExperimentalCoroutinesApi::class)

package com.convohop.android

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/** How a call follows its system call and the user's media wishes. */
internal class ConvoHopCallTest {
    @Test
    fun connectingPublishesNothingUntilTheUserTurnsMediaOn() = runTest {
        val rig = CallRig(this)
        val call = rig.start()
        assertEquals(CallPhase.CONNECTED, call.phase.value)
        assertEquals("alert-1", call.alertId)
        assertTrue(rig.log.isEmpty())
        call.microphone(true)
        call.camera(true)
        assertEquals(listOf("m0 microphone true", "m0 camera true"), rig.log)
        assertTrue(rig.errors.isEmpty())
    }

    @Test
    fun theSystemsMuteAndHoldKeepMediaOffUntilItResumes() = runTest {
        val rig = CallRig(this)
        val call = rig.start()
        call.microphone(true)
        call.camera(true)
        rig.log.clear()
        rig.system.change(MUTED)
        runCurrent()
        assertEquals(listOf("m0 microphone false"), rig.log)
        rig.system.change(HELD)
        runCurrent()
        assertEquals(listOf("m0 microphone false", "m0 camera false"), rig.log)
        // A wish changed on hold is what the resume applies.
        call.camera(false)
        rig.system.change(LIVE)
        runCurrent()
        assertEquals(listOf("m0 microphone false", "m0 camera false", "m0 microphone true"), rig.log)
    }

    @Test
    fun aSystemChangeAppliesEachWishOnItsOwn() = runTest {
        val rig = CallRig(this)
        val media = rig.media("m0")
        rig.connect = { media }
        val call = rig.start()
        call.microphone(true)
        call.camera(true)
        media.microphoneFailure = IllegalStateException("microphone")
        rig.system.change(HELD)
        runCurrent()
        assertEquals(listOf("m0 microphone true", "m0 camera true", "m0 camera false"), rig.log)
        assertEquals(listOf("microphone"), rig.errors.map { it.message })
        assertEquals(CallPhase.CONNECTED, call.phase.value)
    }

    @Test
    fun aFailedMediaChangeKeepsTheOldWish() = runTest {
        val rig = CallRig(this)
        val media = rig.media("m0")
        rig.connect = { media }
        val call = rig.start()
        media.microphoneFailure = IllegalStateException("Microphone is not authorized for this participation")
        assertTrue(runCatching { call.microphone(true) }.exceptionOrNull() is IllegalStateException)
        media.microphoneFailure = null
        rig.system.change(MUTED)
        runCurrent()
        rig.system.change(LIVE)
        runCurrent()
        assertTrue(rig.log.isEmpty())
    }

    @Test
    fun theSystemEndingTheCallLeavesWithoutEndingItAgain() = runTest {
        for (gone in listOf(OVER, null)) {
            val rig = CallRig(this)
            val call = rig.start()
            rig.system.change(gone)
            runCurrent()
            assertEquals(CallPhase.ENDED, call.phase.value)
            assertEquals(listOf("leave"), rig.log)
            assertFalse(rig.system.observing)
        }
    }

    @Test
    fun hangingUpEndsTheSystemCallAndLeavesOnce() = runTest {
        val rig = CallRig(this)
        val call = rig.start()
        call.hangUp()
        call.hangUp()
        assertEquals(CallPhase.ENDED, call.phase.value)
        assertEquals(listOf("end", "leave"), rig.log)
        assertFalse(rig.system.observing)
        assertTrue(runCatching { call.microphone(true) }.exceptionOrNull() is IllegalStateException)
    }

    @Test
    fun aCallJoinedInTheAppHasNoSystemCall() = runTest {
        val rig = CallRig(this)
        val call = rig.start(withSystem = false)
        assertNull(call.alertId)
        call.microphone(true)
        call.hangUp()
        assertEquals(listOf("m0 microphone true", "leave"), rig.log)
    }

    @Test
    fun aConnectFailureLeavesEndsTheSystemCallAndThrows() = runTest {
        val rig = CallRig(this)
        val failure = transportFailure()
        rig.connect = { throw failure }
        assertSame(failure, runCatching { rig.start() }.exceptionOrNull())
        assertEquals(listOf("end", "leave"), rig.log)
        assertFalse(rig.system.observing)
    }

    @Test
    fun aCallTheSystemEndsWhileConnectingReturnsEnded() = runTest {
        val rig = CallRig(this)
        rig.connect = {
            rig.system.change(OVER)
            yield()
            throw IllegalStateException("Participation was left during connection")
        }
        val call = rig.start()
        assertEquals(CallPhase.ENDED, call.phase.value)
        assertEquals(listOf("leave"), rig.log)
        assertTrue(rig.errors.isEmpty())
    }

    @Test
    fun aConnectionThatArrivesAfterTheCallEndedIsDisconnected() = runTest {
        val rig = CallRig(this)
        rig.connect = {
            rig.system.change(OVER)
            yield()
            rig.media("m0")
        }
        val call = rig.start()
        assertEquals(CallPhase.ENDED, call.phase.value)
        assertEquals(listOf("leave", "m0 disconnect"), rig.log)
    }

    @Test
    fun aCallTheSystemAlreadyEndedNeverConnects() = runTest {
        val rig = CallRig(this)
        rig.system.current = OVER
        val call = rig.start()
        assertEquals(CallPhase.ENDED, call.phase.value)
        assertEquals(0, rig.connects)
        assertEquals(listOf("leave"), rig.log)
    }
}
