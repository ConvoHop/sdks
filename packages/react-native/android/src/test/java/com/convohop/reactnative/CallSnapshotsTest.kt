package com.convohop.reactnative

import com.convohop.android.push.AudioRoute
import com.convohop.android.push.CallEndReason
import com.convohop.android.push.CallState
import com.convohop.android.push.ConvoHopPush
import com.convohop.android.push.PushNotification
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CallSnapshotsTest {
    private fun snapshot(
        ring: PushNotification.IncomingCall = ring(),
        state: CallState = CallState.RINGING,
        endReason: CallEndReason? = null,
        serverReason: String? = null,
        muted: Boolean = false,
        audioRoute: AudioRoute? = null,
        available: Set<AudioRoute> = emptySet(),
        overlay: CallOverlay.Values? = null,
    ) = CallSnapshots.of(ring, state, endReason, serverReason, muted, audioRoute, available, overlay)

    @Test
    fun describesARingingCall() {
        assertEquals(
            mapOf(
                "id" to Ids.ALERT,
                "alertId" to Ids.ALERT,
                "liveSessionId" to Ids.LIVE_SESSION,
                "conversationId" to Ids.CONVERSATION,
                "outgoing" to false,
                "hasVideo" to true,
                "mediaProfile" to "AUDIO_VIDEO",
                "callerName" to "Ada",
                "expiresAtMs" to Ids.EXPIRES_AT_MS,
                "state" to "ringing",
                "muted" to false,
                "availableAudioRoutes" to emptyList<String>(),
            ),
            snapshot(),
        )
    }

    @Test
    fun isConnectingUntilJavaScriptReportsTheMediaConnected() {
        assertEquals("connecting", snapshot(state = CallState.ACTIVE)["state"])
        assertEquals("connecting", snapshot(state = CallState.ACTIVE, overlay = CallOverlay.Values())["state"])
        assertEquals("active", snapshot(state = CallState.ACTIVE, overlay = CallOverlay.Values(connected = true))["state"])
        assertEquals("held", snapshot(state = CallState.HELD, overlay = CallOverlay.Values(connected = true))["state"])
        assertEquals("ringing", snapshot(overlay = CallOverlay.Values(connected = true))["state"])
    }

    @Test
    fun givesAnEndReasonOnlyOnceTheCallEnded() {
        assertFalse(snapshot(state = CallState.ACTIVE, endReason = CallEndReason.HUNG_UP).containsKey("endReason"))
        assertEquals("hungUp", snapshot(state = CallState.ENDED, endReason = CallEndReason.HUNG_UP)["endReason"])
        assertEquals("answeredElsewhere", snapshot(state = CallState.ENDED, endReason = CallEndReason.ANSWERED_ELSEWHERE)["endReason"])
        assertEquals("failed", snapshot(state = CallState.ENDED, endReason = null)["endReason"])
        assertEquals("ended", snapshot(state = CallState.ENDED, endReason = null)["state"])
    }

    @Test
    fun passesOnOnlyIdentifiersFromTheServer() {
        assertEquals("busy_here", snapshot(state = CallState.ENDED, serverReason = "busy_here")["serverReason"])
        for (reason in listOf(null, "", "not valid", "1st", "a".repeat(65))) {
            assertFalse(reason, snapshot(state = CallState.ENDED, serverReason = reason).containsKey("serverReason"))
        }
        val unknown = snapshot(ring = ring(mediaProfile = "audio-only"))
        assertFalse(unknown.containsKey("mediaProfile"))
        assertEquals(false, unknown["hasVideo"])
        assertEquals("AUDIO_ONLY", snapshot(ring = ring(mediaProfile = "AUDIO_ONLY"))["mediaProfile"])
    }

    @Test
    fun reportsTheAudioRoutes() {
        val call = snapshot(state = CallState.ACTIVE, audioRoute = AudioRoute.SPEAKER, available = linkedSetOf(AudioRoute.EARPIECE, AudioRoute.SPEAKER))

        assertEquals("speaker", call["audioRoute"])
        assertEquals(listOf("earpiece", "speaker"), call["availableAudioRoutes"])
        assertFalse(snapshot().containsKey("audioRoute"))
    }

    @Test
    fun showsWhatJavaScriptReportedOverThePushSdksValues() {
        val call = snapshot(
            state = CallState.ACTIVE,
            muted = false,
            overlay = CallOverlay.Values(connected = true, muted = true, callerName = "Grace", hasVideo = false),
        )

        assertEquals(true, call["muted"])
        assertEquals("Grace", call["callerName"])
        assertEquals(false, call["hasVideo"])
        assertEquals(true, snapshot(muted = true, overlay = CallOverlay.Values())["muted"])
        assertEquals(false, snapshot(muted = true, overlay = CallOverlay.Values(muted = false))["muted"])
        assertFalse(snapshot(ring = ring(title = null)).containsKey("callerName"))
        assertEquals("Grace", snapshot(ring = ring(title = null), overlay = CallOverlay.Values(callerName = "Grace"))["callerName"])
    }

    @Test
    fun keepsWhatJavaScriptReportedPerCall() {
        val overlay = CallOverlay()

        assertNull(overlay.get(Ids.ALERT))
        assertEquals(CallOverlay.Values(connected = true), overlay.edit(Ids.ALERT) { it.copy(connected = true) })
        overlay.edit(Ids.ALERT) { it.copy(muted = true, callerName = "Grace") }
        assertEquals(CallOverlay.Values(connected = true, muted = true, callerName = "Grace"), overlay.get(Ids.ALERT))

        overlay.clearMuted(Ids.ALERT)
        overlay.clearMuted(Ids.OTHER_RECIPIENT)
        assertEquals(CallOverlay.Values(connected = true, callerName = "Grace"), overlay.get(Ids.ALERT))
        assertNull("clearing a call's mute doesn't add the call", overlay.get(Ids.OTHER_RECIPIENT))

        overlay.edit(Ids.LIVE_SESSION) { it }
        overlay.retain(setOf(Ids.LIVE_SESSION))
        assertNull(overlay.get(Ids.ALERT))
        assertEquals(CallOverlay.Values(), overlay.get(Ids.LIVE_SESSION))
        overlay.remove(Ids.LIVE_SESSION)
        assertNull(overlay.get(Ids.LIVE_SESSION))
    }

    @Test
    fun cancelsARingAsTheServerWould() {
        val ring = ring()
        val now = 1_791_633_601_234L

        val cancel = ring.cancelled("answered", now)

        assertTrue(Contract.isId(cancel.eventId))
        assertNotEquals(ring.eventId, cancel.eventId)
        assertNotEquals(cancel.eventId, ring.cancelled("answered", now).eventId)
        assertEquals("2026-10-10T12:00:01.234Z", cancel.occurredAt)
        assertEquals(now, cancel.occurredAtMillis)
        assertEquals(
            listOf(ring.projectId, ring.recipientId, ring.conversationId, ring.senderId, ring.liveSessionId, ring.alertId),
            listOf(cancel.projectId, cancel.recipientId, cancel.conversationId, cancel.senderId, cancel.liveSessionId, cancel.alertId),
        )
        assertEquals(listOf(ring.title, ring.body), listOf(cancel.title, cancel.body))
        assertEquals(listOf(ring.expiresAt, ring.mediaProfile), listOf(cancel.expiresAt, cancel.mediaProfile))
        assertEquals(ring.expiresAtMillis, cancel.expiresAtMillis)
        assertEquals("answered", cancel.reason)
        assertFalse(cancel.missed)
        assertTrue(ring.cancelled("ended", now).missed)
    }

    @Test
    fun cancelsWithAValidPush() {
        val cancel = ring().cancelled("declined", 1_791_633_601_234L)

        assertEquals(cancel, ConvoHopPush.parseData(PushPayloads.event(cancel)))
    }
}
