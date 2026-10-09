package com.convohop.reactnative

import com.convohop.android.push.AudioRoute
import com.convohop.android.push.CallEndReason
import com.convohop.android.push.CallState
import com.convohop.android.push.PushResult
import java.io.IOException
import java.util.concurrent.ExecutionException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ContractTest {
    @Test
    fun idsAreLowercaseNonNilUuids() {
        assertTrue(Contract.isId(Ids.PROJECT))
        for (value in listOf(null, "", Ids.PROJECT.uppercase(), "00000000-0000-0000-0000-000000000000", "{${Ids.PROJECT}}", "${Ids.PROJECT}\n", Ids.PROJECT.replace("-", ""))) {
            assertFalse(value, Contract.isId(value))
        }
    }

    @Test
    fun identifiersAreAnAsciiLetterAndUpTo63More() {
        for (value in listOf("a", "Z", "answered", "AUDIO_VIDEO", "a1_", "a" + "b".repeat(63))) {
            assertTrue(value, Contract.isIdentifier(value))
        }
        for (value in listOf(null, "", "1a", "_a", "a-b", "a b", "\u00E9", "answered\n", "a" + "b".repeat(64))) {
            assertFalse(value, Contract.isIdentifier(value))
        }
    }

    @Test
    fun writesUtcTimestampsWithMilliseconds() {
        assertEquals("1970-01-01T00:00:00.000Z", Contract.timestamp(0))
        assertEquals("2023-11-14T22:13:20.123Z", Contract.timestamp(1_700_000_000_123))
        assertEquals("2026-10-10T11:59:55.000Z", Contract.timestamp(Ids.OCCURRED_AT_MS))
    }

    // The values src/push.ts and src/calls.ts accept.
    @Test
    fun namesPushResultsAsJavaScriptDoes() {
        assertEquals(
            listOf("notConvoHop", "invalid", "ignored", "message", "ringing", "stopped", "missed").sorted(),
            PushResult.entries.map(Contract::result).sorted(),
        )
    }

    @Test
    fun namesCallStatesAsJavaScriptDoes() {
        assertEquals("ringing", Contract.state(CallState.RINGING, connected = false))
        assertEquals("connecting", Contract.state(CallState.ACTIVE, connected = false))
        assertEquals("active", Contract.state(CallState.ACTIVE, connected = true))
        assertEquals("held", Contract.state(CallState.HELD, connected = true))
        assertEquals("held", Contract.state(CallState.HELD, connected = false))
        assertEquals("ended", Contract.state(CallState.ENDED, connected = true))
    }

    @Test
    fun namesEndReasonsAsJavaScriptDoes() {
        assertEquals(
            listOf("rejected", "hungUp", "answeredElsewhere", "declinedElsewhere", "missed", "expired", "stopped", "failed").sorted(),
            CallEndReason.entries.map(Contract::endReason).sorted(),
        )
    }

    @Test
    fun namesAudioRoutesAsJavaScriptDoes() {
        assertEquals(
            listOf("earpiece", "speaker", "bluetooth", "wiredHeadset", "streaming", "unknown").sorted(),
            AudioRoute.entries.map(Contract::route).sorted(),
        )
        for (route in AudioRoute.entries) {
            val expected = if (route == AudioRoute.UNKNOWN) null else route
            assertEquals(route.name, expected, Contract.settableRoute(Contract.route(route)))
        }
        for (name in listOf("", "Speaker", "SPEAKER", "wired_headset", "unknown")) assertNull(name, Contract.settableRoute(name))
    }

    @Test
    fun findsFcmErrorCodesInTheCauseChain() {
        assertNull(Contract.fcmErrorCode(null))
        assertEquals("SERVICE_NOT_AVAILABLE", Contract.fcmErrorCode(IOException("SERVICE_NOT_AVAILABLE")))
        // ExecutionException's own message is its cause's toString().
        assertEquals("AUTHENTICATION_FAILED", Contract.fcmErrorCode(ExecutionException(IOException("AUTHENTICATION_FAILED"))))
    }

    @Test
    fun reportsNothingButACode() {
        for (message in listOf(null, "", "service_not_available", "TOKEN abc", "Fetching FCM token failed: TOO_MANY_REGISTRATIONS", "A".repeat(65))) {
            assertNull(message, Contract.fcmErrorCode(IOException(message)))
        }
    }

    @Test
    fun looksAtMostEightCausesDeep() {
        fun wrapped(depth: Int): Throwable {
            var error: Throwable = IOException("MISSING_INSTANCEID_SERVICE")
            repeat(depth) { error = RuntimeException("wrapper $it", error) }
            return error
        }
        assertEquals("MISSING_INSTANCEID_SERVICE", Contract.fcmErrorCode(wrapped(7)))
        assertNull(Contract.fcmErrorCode(wrapped(8)))

        val first = RuntimeException("first")
        val second = RuntimeException("second", first)
        first.initCause(second)
        assertNull("a cycle ends", Contract.fcmErrorCode(first))
    }
}
