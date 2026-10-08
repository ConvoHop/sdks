package com.convohop.android.push

import android.content.ComponentName
import android.net.Uri
import android.os.Bundle
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.DisconnectCause
import android.telecom.PhoneAccount
import android.telecom.TelecomManager
import android.telecom.VideoProfile
import androidx.core.os.BundleCompat
import com.convohop.android.push.Fixtures.SENDER
import com.convohop.android.push.Fixtures.callData
import com.convohop.android.push.Fixtures.cancelData
import com.convohop.android.push.Fixtures.id
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.util.ReflectionHelpers
import org.robolectric.util.ReflectionHelpers.ClassParameter

/** Rings through the self-managed ConnectionService; Robolectric's TelecomManager plays the system. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [26, 34])
// ShadowTelecomManager's call records extend a deprecated class.
@Suppress("DEPRECATION")
internal class TelecomTest {
    private val push = PushHarness()
    private val manager = push.manager
    private val alert = id(100)
    private val telecom = push.app.getSystemService(TelecomManager::class.java)
    private val system = shadowOf(telecom)
    private var nextEvent = 1

    init {
        push.options.useTelecom = true
    }

    @Test
    fun ringsThroughASelfManagedAccount() {
        push.handle(callData(id(nextEvent++), alert, title = "Ada"))
        val record = system.onlyIncomingCall
        val handle = record.phoneAccount
        assertEquals(ComponentName(push.app, ConvoHopConnectionService::class.java), handle.componentName)
        assertEquals(TelecomCalls.ACCOUNT_ID, handle.id)
        val account = checkNotNull(telecom.getPhoneAccount(handle))
        assertTrue(account.hasCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED))
        assertTrue(account.hasCapabilities(PhoneAccount.CAPABILITY_VIDEO_CALLING or PhoneAccount.CAPABILITY_SUPPORTS_VIDEO_CALLING))
        assertEquals(listOf("convohop"), account.supportedUriSchemes)
        assertEquals(push.label, account.label.toString())
        assertEquals(alert, record.extras.getString(TelecomCalls.KEY_ALERT_ID))
        assertEquals(
            Uri.fromParts("convohop", SENDER, null),
            BundleCompat.getParcelable(record.extras, TelecomManager.EXTRA_INCOMING_CALL_ADDRESS, Uri::class.java),
        )
        assertEquals(VideoProfile.STATE_BIDIRECTIONAL, record.extras.getInt(TelecomManager.EXTRA_INCOMING_VIDEO_STATE))
        // The notification rings too; Android shows it as the call's UI.
        assertNotNull(push.posted(alert))

        val voice = id(101)
        push.handle(callData(id(nextEvent++), voice, mediaProfile = "AUDIO_ONLY"))
        val voiceExtras = system.lastIncomingCall.extras
        assertTrue(voiceExtras.containsKey(TelecomManager.EXTRA_INCOMING_VIDEO_STATE))
        assertEquals(VideoProfile.STATE_AUDIO_ONLY, voiceExtras.getInt(TelecomManager.EXTRA_INCOMING_VIDEO_STATE))
        assertEquals(listOf(handle), system.allIncomingCalls.map { it.phoneAccount }.distinct())
    }

    @Test
    fun theConnectionDescribesTheCall() {
        val video = ring(alert, title = "Ada")
        assertEquals(Connection.STATE_RINGING, video.state)
        assertEquals(Connection.PROPERTY_SELF_MANAGED, video.connectionProperties and Connection.PROPERTY_SELF_MANAGED)
        val capabilities = Connection.CAPABILITY_HOLD or Connection.CAPABILITY_SUPPORT_HOLD or Connection.CAPABILITY_MUTE
        assertEquals(capabilities, video.connectionCapabilities and capabilities)
        assertTrue(video.audioModeIsVoip)
        assertEquals(Uri.fromParts("convohop", SENDER, null), video.address)
        assertEquals("Ada", video.callerDisplayName)
        assertEquals(VideoProfile.STATE_BIDIRECTIONAL, video.videoState)

        val voice = ring(id(101), mediaProfile = "AUDIO_ONLY")
        assertEquals(push.label, voice.callerDisplayName)
        assertEquals(VideoProfile.STATE_AUDIO_ONLY, voice.videoState)
    }

    @Test
    fun answersHoldsAndHangsUpFromTheSystem() {
        val connection = ring(alert)
        connection.onAnswer()
        assertEquals(Connection.STATE_ACTIVE, connection.state)
        assertEquals(CallState.ACTIVE, manager.call(alert)?.state)
        assertNull(push.posted(alert))

        connection.onHold()
        assertEquals(Connection.STATE_HOLDING, connection.state)
        assertEquals(CallState.HELD, manager.call(alert)?.state)
        connection.onUnhold()
        assertEquals(Connection.STATE_ACTIVE, connection.state)
        assertTrue(manager.setOnHold(alert, true))
        assertEquals(Connection.STATE_HOLDING, connection.state)
        assertTrue(manager.setOnHold(alert, false))

        connection.onDisconnect()
        assertDisconnected(connection, DisconnectCause.LOCAL)
        assertEquals(CallEndReason.HUNG_UP, manager.call(alert)?.endReason)
        assertEquals(
            listOf(
                "incoming $alert", "answered $alert", "hold $alert true", "hold $alert false",
                "hold $alert true", "hold $alert false", "ended $alert HUNG_UP null",
            ),
            push.events(),
        )
    }

    @Test
    fun declinesFromTheSystem() {
        val rejects = listOf<(ConvoHopConnection) -> Unit>(
            { it.onReject() },
            { it.onReject(Call.REJECT_REASON_DECLINED) },
            { it.onReject("Busy") },
        )
        rejects.forEachIndexed { index, reject ->
            val alertId = id(100 + index)
            val connection = ring(alertId)
            reject(connection)
            assertDisconnected(connection, DisconnectCause.REJECTED)
            assertNull(push.posted(alertId))
            assertEquals(listOf("incoming $alertId", "ended $alertId REJECTED null"), push.events())
        }
    }

    @Test
    fun endsTheSystemCallWhenTheAppDoes() {
        val ringing = ring(alert)
        assertTrue(manager.reject(alert))
        assertDisconnected(ringing, DisconnectCause.REJECTED)

        val answered = ring(id(101))
        assertTrue(manager.answer(id(101)))
        assertEquals(Connection.STATE_ACTIVE, answered.state)
        assertTrue(manager.end(id(101)))
        assertDisconnected(answered, DisconnectCause.LOCAL)
        assertFalse(manager.end(id(101)))
    }

    @Test
    fun theServerEndsTheSystemCall() {
        val causes = listOf(
            "answered" to DisconnectCause.ANSWERED_ELSEWHERE,
            "declined" to DisconnectCause.REJECTED,
            "ended" to DisconnectCause.MISSED,
            "expired" to DisconnectCause.MISSED,
            "busy" to DisconnectCause.OTHER,
        )
        causes.forEachIndexed { index, (reason, cause) ->
            val alertId = id(100 + index)
            val connection = ring(alertId)
            push.handle(cancelData(id(nextEvent++), alertId, reason))
            assertDisconnected(connection, cause)
        }
        val expiring = id(200)
        val connection = ring(expiring)
        push.advance(30_000)
        assertDisconnected(connection, DisconnectCause.MISSED)
        assertEquals(CallEndReason.EXPIRED, manager.call(expiring)?.endReason)
    }

    @Test
    fun aCallAnsweredHereOutlivesItsRingsCancellation() {
        val connection = ring(alert)
        connection.onAnswer()
        assertEquals(PushResult.IGNORED, push.handle(cancelData(id(nextEvent++), alert, "answered")))
        assertEquals(Connection.STATE_ACTIVE, connection.state)
        assertEquals(CallState.ACTIVE, manager.call(alert)?.state)
    }

    @Test
    fun reportsTheSystemsAudioState() {
        val connection = ring(alert)
        connection.onAnswer()
        val mask = CallAudioState.ROUTE_EARPIECE or CallAudioState.ROUTE_SPEAKER or CallAudioState.ROUTE_BLUETOOTH
        setAudioState(connection, CallAudioState(false, CallAudioState.ROUTE_EARPIECE, mask))
        setAudioState(connection, CallAudioState(true, CallAudioState.ROUTE_SPEAKER, mask))
        setAudioState(connection, CallAudioState(true, CallAudioState.ROUTE_SPEAKER, mask))
        val info = checkNotNull(manager.call(alert))
        assertTrue(info.muted)
        assertEquals(AudioRoute.SPEAKER, info.audioRoute)
        assertEquals(setOf(AudioRoute.EARPIECE, AudioRoute.SPEAKER, AudioRoute.BLUETOOTH), info.availableAudioRoutes)
        // 16 is the hidden ROUTE_STREAMING; 0 is no route at all.
        setAudioState(connection, CallAudioState(true, 16, 16))
        setAudioState(connection, CallAudioState(true, 0, 0))
        val all = "[EARPIECE, SPEAKER, BLUETOOTH]"
        assertEquals(
            listOf(
                "incoming $alert", "answered $alert", "route $alert EARPIECE $all", "mute $alert true",
                "route $alert SPEAKER $all", "route $alert STREAMING []", "route $alert UNKNOWN []",
            ),
            push.events(),
        )
    }

    @Test
    fun movesTheAudioOnlyToAvailableRoutes() {
        val connection = ring(alert)
        // Until the system reports routes, any real one may be asked for.
        assertTrue(manager.setAudioRoute(alert, AudioRoute.BLUETOOTH))
        connection.onAnswer()
        setAudioState(
            connection,
            CallAudioState(false, CallAudioState.ROUTE_EARPIECE, CallAudioState.ROUTE_EARPIECE or CallAudioState.ROUTE_SPEAKER),
        )
        assertTrue(manager.setAudioRoute(alert, AudioRoute.SPEAKER))
        assertFalse(manager.setAudioRoute(alert, AudioRoute.BLUETOOTH))
        assertFalse(manager.setAudioRoute(alert, AudioRoute.STREAMING))
        assertFalse(manager.setAudioRoute(alert, AudioRoute.UNKNOWN))
        assertFalse(manager.setAudioRoute(id(999), AudioRoute.SPEAKER))
        assertTrue(manager.end(alert))
        assertFalse(manager.setAudioRoute(alert, AudioRoute.SPEAKER))
    }

    @Test
    fun aRefusedCallRingsAsANotification() {
        push.handle(callData(id(nextEvent++), alert))
        system.denyIncomingCall(system.lastIncomingCall)
        assertEquals(CallState.RINGING, manager.call(alert)?.state)
        assertNotNull(push.posted(alert))
        assertFalse(manager.setAudioRoute(alert, AudioRoute.SPEAKER))
        assertTrue(manager.reject(alert))
        assertEquals(listOf("incoming $alert", "ended $alert REJECTED null"), push.events())
    }

    @Test
    fun aRingStoppedBeforeTheSystemConnectsFails() {
        push.handle(callData(id(nextEvent++), alert))
        push.handle(cancelData(id(nextEvent++), alert, "answered"))
        assertDisconnected(checkNotNull(system.allowIncomingCall(system.lastIncomingCall)), DisconnectCause.CANCELED)
    }

    @Test
    fun theServiceFindsTheAlertInEitherExtras() {
        push.options.useTelecom = false
        val service = Robolectric.buildService(ConvoHopConnectionService::class.java).create().get()
        assertDisconnected(service.onCreateIncomingConnection(null, null), DisconnectCause.CANCELED)
        assertDisconnected(service.onCreateIncomingConnection(null, ConnectionRequest(null, null, Bundle())), DisconnectCause.CANCELED)

        push.handle(callData(id(nextEvent++), alert))
        val alertExtras = Bundle().apply { putString(TelecomCalls.KEY_ALERT_ID, alert) }
        val nested = Bundle().apply { putBundle(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, alertExtras) }
        val connection = service.onCreateIncomingConnection(null, ConnectionRequest(null, null, nested))
        assertTrue(connection is ConvoHopConnection)
        assertEquals(Connection.STATE_RINGING, connection.state)
        // A ring gets one connection.
        val again = service.onCreateIncomingConnection(null, ConnectionRequest(null, null, alertExtras))
        assertDisconnected(again, DisconnectCause.CANCELED)
        assertTrue(manager.answer(alert))
        assertEquals(Connection.STATE_ACTIVE, connection.state)
    }

    @Test
    fun anAbortedRingFallsBackToTheNotification() {
        val ringing = ring(alert)
        ringing.onAbort()
        assertDisconnected(ringing, DisconnectCause.ERROR)
        assertEquals(CallState.RINGING, manager.call(alert)?.state)
        assertNotNull(push.posted(alert))
        assertTrue(manager.answer(alert))
        assertDisconnected(ringing, DisconnectCause.ERROR)

        val other = id(101)
        val answered = ring(other)
        answered.onAnswer()
        answered.onAbort()
        assertDisconnected(answered, DisconnectCause.ERROR)
        assertEquals(CallEndReason.FAILED, manager.call(other)?.endReason)
        assertEquals(
            listOf("incoming $alert", "answered $alert", "incoming $other", "answered $other", "ended $other FAILED null"),
            push.events(),
        )
    }

    @Test
    fun ringsWithoutTheSystemWhenAsked() {
        push.options.useTelecom = false
        push.handle(callData(id(nextEvent++), alert))
        assertTrue(system.allIncomingCalls.isEmpty())
        assertNotNull(push.posted(alert))
        assertFalse(manager.setAudioRoute(alert, AudioRoute.SPEAKER))
    }

    @Test
    @Config(sdk = [24])
    fun ringsWithoutTheSystemBeforeAndroid8() {
        push.handle(callData(id(nextEvent++), alert))
        assertTrue(system.allIncomingCalls.isEmpty())
        assertNotNull(push.posted(alert))
    }

    /** Rings [alertId] and lets the system connect it. */
    private fun ring(alertId: String, mediaProfile: String = "AUDIO_VIDEO", title: String? = null): ConvoHopConnection {
        assertEquals(PushResult.RINGING, push.handle(callData(id(nextEvent++), alertId, mediaProfile = mediaProfile, title = title)))
        return system.allowIncomingCall(system.lastIncomingCall) as ConvoHopConnection
    }

    private fun assertDisconnected(connection: Connection, cause: Int) {
        assertEquals(Connection.STATE_DISCONNECTED, connection.state)
        assertEquals(cause, connection.disconnectCause.code)
    }

    /** Reports [state] as the system does, through the hidden `Connection.setCallAudioState`. */
    private fun setAudioState(connection: Connection, state: CallAudioState) {
        ReflectionHelpers.callInstanceMethod<Any?>(
            Connection::class.java, connection, "setCallAudioState", ClassParameter.from(CallAudioState::class.java, state),
        )
    }
}
