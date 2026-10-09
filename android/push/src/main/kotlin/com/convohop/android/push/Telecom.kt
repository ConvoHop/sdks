package com.convohop.android.push

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telecom.CallAudioState
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.DisconnectCause
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telecom.VideoProfile
import androidx.annotation.RequiresApi

/** A call's system side; tests replace it. */
internal interface CallConnection {
    fun activate()

    fun hold()

    fun end(reason: CallEndReason)

    fun requestRoute(route: AudioRoute): Boolean
}

/** Rings through this app's self-managed phone account. */
@RequiresApi(26)
internal class TelecomCalls(private val context: Context) {
    private val handle by lazy {
        PhoneAccountHandle(ComponentName(context, ConvoHopConnectionService::class.java), ACCOUNT_ID)
    }

    @Volatile
    private var registered = false

    /** False when the system refused the call; it then rings as a notification only. */
    fun addIncomingCall(call: PushNotification.IncomingCall): Boolean {
        val telecom = context.getSystemService(TelecomManager::class.java) ?: return false
        return try {
            register(telecom)
            val extras = Bundle()
            extras.putString(KEY_ALERT_ID, call.alertId)
            extras.putParcelable(TelecomManager.EXTRA_INCOMING_CALL_ADDRESS, address(call))
            extras.putInt(TelecomManager.EXTRA_INCOMING_VIDEO_STATE, videoState(call))
            telecom.addNewIncomingCall(handle, extras)
            true
        } catch (_: RuntimeException) {
            // SecurityException without MANAGE_OWN_CALLS, or a device without Telecom.
            false
        }
    }

    private fun register(telecom: TelecomManager) {
        if (registered) return
        val label = context.applicationInfo.loadLabel(context.packageManager)
        val account = PhoneAccount.builder(handle, label)
            .setCapabilities(
                PhoneAccount.CAPABILITY_SELF_MANAGED or PhoneAccount.CAPABILITY_VIDEO_CALLING or
                    PhoneAccount.CAPABILITY_SUPPORTS_VIDEO_CALLING,
            )
            .setSupportedUriSchemes(listOf(SCHEME))
            .build()
        telecom.registerPhoneAccount(account)
        registered = true
    }

    companion object {
        const val ACCOUNT_ID = "convohop"
        const val SCHEME = "convohop"
        const val KEY_ALERT_ID = "com.convohop.android.push.ALERT_ID"

        fun address(call: PushNotification.IncomingCall): Uri = Uri.fromParts(SCHEME, call.senderId, null)

        fun videoState(call: PushNotification.IncomingCall): Int =
            if (call.video) VideoProfile.STATE_BIDIRECTIONAL else VideoProfile.STATE_AUDIO_ONLY
    }
}

/** The self-managed `ConnectionService` that rings ConvoHop calls. Android binds it; don't start it yourself. */
@RequiresApi(26)
internal class ConvoHopConnectionService : ConnectionService() {
    override fun onCreateIncomingConnection(account: PhoneAccountHandle?, request: ConnectionRequest?): Connection {
        val manager = ConvoHopNotifications.getInstance(this)
        val connection = alertId(request)?.let { alertId -> manager.attach(alertId) { call -> ConvoHopConnection(manager, call) } }
        return connection as? Connection ?: Connection.createFailedConnection(DisconnectCause(DisconnectCause.CANCELED))
    }

    override fun onCreateIncomingConnectionFailed(account: PhoneAccountHandle?, request: ConnectionRequest?) {
        alertId(request)?.let { ConvoHopNotifications.getInstance(this).refused(it) }
    }

    private fun alertId(request: ConnectionRequest?): String? {
        val extras = request?.extras ?: return null
        return extras.getString(TelecomCalls.KEY_ALERT_ID)
            ?: extras.getBundle(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS)?.getString(TelecomCalls.KEY_ALERT_ID)
    }
}

/** A ringing or answered ConvoHop call as the system sees it. */
@RequiresApi(26)
internal class ConvoHopConnection(
    private val manager: ConvoHopNotifications,
    private val call: PushNotification.IncomingCall,
) : Connection(), CallConnection {
    private val main = Handler(Looper.getMainLooper())

    @Volatile
    private var destroyed = false

    init {
        connectionProperties = PROPERTY_SELF_MANAGED
        connectionCapabilities = CAPABILITY_HOLD or CAPABILITY_SUPPORT_HOLD or CAPABILITY_MUTE
        audioModeIsVoip = true
        setAddress(TelecomCalls.address(call), TelecomManager.PRESENTATION_ALLOWED)
        val context = manager.context
        val name = call.title ?: context.applicationInfo.loadLabel(context.packageManager).toString()
        setCallerDisplayName(name, TelecomManager.PRESENTATION_ALLOWED)
        videoState = TelecomCalls.videoState(call)
        setRinging()
    }

    // The default onAnswer() calls this with an audio-only state.
    override fun onAnswer(videoState: Int) {
        manager.answerCall(call.alertId, null)
    }

    override fun onReject() {
        manager.endCall(call.alertId, ringing = true, data = null)
    }

    override fun onReject(rejectReason: Int) {
        manager.endCall(call.alertId, ringing = true, data = null)
    }

    override fun onReject(replyMessage: String?) {
        manager.endCall(call.alertId, ringing = true, data = null)
    }

    override fun onDisconnect() {
        manager.endCall(call.alertId, ringing = false, data = null)
    }

    override fun onAbort() {
        manager.aborted(call.alertId)
        end(CallEndReason.FAILED)
    }

    override fun onHold() {
        manager.setOnHold(call.alertId, true)
    }

    override fun onUnhold() {
        manager.setOnHold(call.alertId, false)
    }

    // Still delivered on Android 14 and later, alongside the call-endpoint callbacks that replace it.
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onCallAudioStateChanged(state: CallAudioState?) {
        if (state == null) return
        val available = ROUTES.filterValues { state.supportedRouteMask and it != 0 }.keys
        val route = ROUTES.entries.firstOrNull { it.value == state.route }?.key
            ?: if (state.route == ROUTE_STREAMING) AudioRoute.STREAMING else AudioRoute.UNKNOWN
        manager.audioChanged(call.alertId, state.isMuted, route, available)
    }

    override fun activate() {
        onMain { if (!destroyed) setActive() }
    }

    override fun hold() {
        onMain { if (!destroyed) setOnHold() }
    }

    override fun end(reason: CallEndReason) {
        val cause = when (reason) {
            CallEndReason.REJECTED, CallEndReason.DECLINED_ELSEWHERE -> DisconnectCause.REJECTED
            CallEndReason.HUNG_UP -> DisconnectCause.LOCAL
            CallEndReason.MISSED, CallEndReason.EXPIRED -> DisconnectCause.MISSED
            CallEndReason.ANSWERED_ELSEWHERE -> DisconnectCause.ANSWERED_ELSEWHERE
            CallEndReason.STOPPED -> DisconnectCause.OTHER
            CallEndReason.FAILED -> DisconnectCause.ERROR
        }
        onMain {
            if (!destroyed) {
                destroyed = true
                setDisconnected(DisconnectCause(cause))
                destroy()
            }
        }
    }

    override fun requestRoute(route: AudioRoute): Boolean {
        val value = ROUTES[route] ?: return false
        @Suppress("DEPRECATION")
        val state = callAudioState
        if (destroyed || (state != null && state.supportedRouteMask and value == 0)) return false
        @Suppress("DEPRECATION")
        onMain { if (!destroyed) setAudioRoute(value) }
        return true
    }

    private fun onMain(block: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) block() else main.post(block)
    }

    private companion object {
        // CallAudioState.ROUTE_STREAMING isn't public API.
        const val ROUTE_STREAMING = 16
        val ROUTES = linkedMapOf(
            AudioRoute.EARPIECE to CallAudioState.ROUTE_EARPIECE,
            AudioRoute.SPEAKER to CallAudioState.ROUTE_SPEAKER,
            AudioRoute.BLUETOOTH to CallAudioState.ROUTE_BLUETOOTH,
            AudioRoute.WIRED_HEADSET to CallAudioState.ROUTE_WIRED_HEADSET,
        )
    }
}
