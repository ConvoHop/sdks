package com.convohop.android.core

import com.convohop.android.core.FakeAuthority.Fault
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Test

class TypingIndicatorTest {
    private fun Harness.signals(): List<Boolean> =
        authority.calls("CommunicationTyping").map { it.input.getValue("isTyping").jsonPrimitive.boolean }

    @Test
    fun typingIsSignalledAtMostEveryThreeSecondsAndStopsWhenIdle() = runTest {
        Harness(this).use { h ->
            val timeline = h.store().timeline(h.authority.conversation())
            h.settle()

            timeline.typing.keystroke()
            h.settle()
            assertEquals(listOf(true), h.signals())
            h.advance(1_000)
            timeline.typing.keystroke()
            h.advance(2_500)
            timeline.typing.keystroke()
            h.settle()
            assertEquals(listOf(true, true), h.signals())
            h.advance(4_999)
            assertEquals(listOf(true, true), h.signals())
            h.advance(1)

            assertEquals(listOf(true, true, false), h.signals())
        }
    }

    @Test
    fun sendingEndsTheTypingSignal() = runTest {
        Harness(this).use { h ->
            val timeline = h.store().timeline(h.authority.conversation())
            h.settle()

            timeline.typing.keystroke()
            h.settle()
            timeline.send("hi")
            h.settle()
            assertEquals(listOf(true, false), h.signals())
            h.advance(10_000)

            assertEquals(listOf(true, false), h.signals())
        }
    }

    @Test
    fun closingTheTimelineEndsTheTypingSignal() = runTest {
        Harness(this).use { h ->
            val timeline = h.store().timeline(h.authority.conversation())
            h.settle()

            timeline.typing.keystroke()
            h.settle()
            timeline.close()
            h.settle()
            timeline.typing.keystroke()
            h.advance(10_000)

            assertEquals(listOf(true, false), h.signals())
        }
    }

    @Test
    fun failedSignalsAreReportedAndNotRetried() = runTest {
        Harness(this).use { h ->
            h.authority.fail("CommunicationTyping", Fault.Problem("RATE_LIMITED", 429))
            val timeline = h.store().timeline(h.authority.conversation())
            h.settle()

            timeline.typing.keystroke()
            h.advance(4_999)
            assertEquals(listOf(true), h.signals())
            assertEquals(listOf("RATE_LIMITED"), h.errorCodes())
            h.advance(1)

            // The stop signal is still sent once the user goes idle.
            assertEquals(listOf(true, false), h.signals())
            assertEquals(listOf("RATE_LIMITED"), h.errorCodes())
        }
    }
}
