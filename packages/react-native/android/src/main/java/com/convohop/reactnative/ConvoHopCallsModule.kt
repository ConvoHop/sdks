package com.convohop.reactnative

import android.content.ActivityNotFoundException
import com.convohop.android.push.CallInfo
import com.convohop.android.push.CallState
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil

/**
 * `ConvoHopCalls` on Android: the push SDK's Telecom calls. What JavaScript reports about a call, such as its media
 * connecting, is kept in the process's [CallOverlay] and changed only on the main thread, where the push SDK reports
 * its own changes, so `changed` events arrive in order.
 */
internal class ConvoHopCallsModule(context: ReactApplicationContext) : NativeConvoHopCallsSpec(context), CallHub.Sink {
    private val process = ConvoHopProcess.get(context)
    private val notifications = process.notifications
    private val hub = process.hub

    @Volatile
    private var invalidated = false

    init {
        hub.add(this)
    }

    override fun invalidate() {
        invalidated = true
        hub.remove(this)
        super.invalidate()
    }

    override fun onCall(type: String, call: Map<String, Any>) {
        if (!invalidated && mEventEmitterCallback != null) {
            emitOnCallEvent(Arguments.makeNativeMap(mapOf("type" to type, "call" to call)))
        }
    }

    override fun getCalls(promise: Promise) {
        promise.resolve(Arguments.makeNativeArray(hub.calls()))
    }

    override fun forgetCall(id: String, promise: Promise) {
        val forgotten = notifications.forget(id)
        if (forgotten) hub.overlay.remove(id)
        promise.resolve(forgotten)
    }

    override fun startOutgoingCall(request: ReadableMap, promise: Promise) {
        promise.reject(Contract.E_UNSUPPORTED, "Android calls start without the system call UI; join the live session directly")
    }

    override fun answerCall(id: String, promise: Promise) {
        if (notifications.answer(id)) promise.resolve(null) else rejectCall(id, promise, "Only a ringing call can be answered")
    }

    override fun endCall(id: String, promise: Promise) {
        // Declines a ringing call, hangs up any other; a call that already ended stays ended.
        notifications.end(id)
        promise.resolve(null)
    }

    override fun stopRinging(id: String, serverReason: String, promise: Promise) {
        if (!Contract.isIdentifier(serverReason)) {
            promise.reject(Contract.E_INVALID_ARGUMENT, "serverReason must be an identifier, such as answered")
            return
        }
        val call = notifications.call(id)
        if (call != null && call.state == CallState.RINGING) {
            // As the server's cancellation push would: the ledger records the stop, and a missed call shows as one.
            notifications.handle(call.notification.cancelled(serverReason, System.currentTimeMillis()))
        }
        promise.resolve(null)
    }

    override fun reportConnecting(id: String, promise: Promise) {
        val call = notifications.call(id)
        when {
            call == null -> promise.reject(Contract.E_CALL_NOT_FOUND, "No call $id")
            call.state == CallState.RINGING || call.state == CallState.ENDED ->
                promise.reject(Contract.E_CALL_STATE, "Only an answered call connects")
            else -> promise.resolve(null)
        }
    }

    override fun reportConnected(id: String, promise: Promise) = onMain {
        val call = notifications.call(id)
        when {
            call == null -> promise.reject(Contract.E_CALL_NOT_FOUND, "No call $id")
            call.state != CallState.ACTIVE && call.state != CallState.HELD ->
                promise.reject(Contract.E_CALL_STATE, "Only an answered call connects")
            else -> {
                val connected = hub.overlay.get(id)?.connected == true
                hub.overlay.edit(id) { it.copy(connected = true) }
                if (!connected) hub.changed(call)
                promise.resolve(null)
            }
        }
    }

    override fun updateCall(id: String, update: ReadableMap, promise: Promise) {
        val callerName = update.stringOrNull("callerName")
        val hasVideo = update.booleanOrNull("hasVideo")
        if ((callerName == null && present(update, "callerName")) || callerName?.isEmpty() == true ||
            (hasVideo == null && present(update, "hasVideo"))
        ) {
            promise.reject(Contract.E_INVALID_ARGUMENT, "callerName must be a non-empty string and hasVideo a boolean")
            return
        }
        onMain {
            val call = live(id, promise) ?: return@onMain
            hub.overlay.edit(id) { it.copy(callerName = callerName ?: it.callerName, hasVideo = hasVideo ?: it.hasVideo) }
            hub.changed(call)
            promise.resolve(null)
        }
    }

    override fun setMuted(id: String, muted: Boolean, promise: Promise) = onMain {
        val call = live(id, promise) ?: return@onMain
        val before = hub.overlay.get(id)?.muted ?: call.muted
        hub.overlay.edit(id) { it.copy(muted = muted) }
        if (before != muted) hub.changed(call)
        promise.resolve(null)
    }

    override fun setHeld(id: String, held: Boolean, promise: Promise) {
        if (notifications.setOnHold(id, held)) promise.resolve(null) else rejectCall(id, promise, "Only an answered call can be held")
    }

    override fun setAudioRoute(id: String, route: String, promise: Promise) {
        val target = Contract.settableRoute(route)
        when {
            target == null -> promise.reject(Contract.E_INVALID_ARGUMENT, "Unknown audio route $route")
            notifications.call(id) == null -> promise.reject(Contract.E_CALL_NOT_FOUND, "No call $id")
            notifications.setAudioRoute(id, target) -> promise.resolve(null)
            else -> promise.reject(Contract.E_AUDIO_ROUTE, "The call has no system audio, or $route isn't available")
        }
    }

    override fun canUseFullScreenIntent(promise: Promise) {
        promise.resolve(notifications.canUseFullScreenIntent())
    }

    override fun openFullScreenIntentSettings(promise: Promise) = onMain {
        try {
            (reactApplicationContext.currentActivity ?: reactApplicationContext).startActivity(notifications.fullScreenIntentSettings())
            promise.resolve(null)
        } catch (e: ActivityNotFoundException) {
            promise.reject(Contract.E_UNSUPPORTED, "This device has no full-screen intent setting")
        }
    }

    override fun getVoipToken(promise: Promise) {
        promise.resolve(null)
    }

    override fun isAudioSessionActive(promise: Promise) {
        promise.resolve(false)
    }

    /** The call [id] unless it ended; otherwise rejects [promise]. */
    private fun live(id: String, promise: Promise): CallInfo? {
        val call = notifications.call(id)
        when {
            call == null -> promise.reject(Contract.E_CALL_NOT_FOUND, "No call $id")
            call.state == CallState.ENDED -> promise.reject(Contract.E_CALL_STATE, "The call ended")
            else -> return call
        }
        return null
    }

    private fun rejectCall(id: String, promise: Promise, wrongState: String) {
        if (notifications.call(id) == null) {
            promise.reject(Contract.E_CALL_NOT_FOUND, "No call $id")
        } else {
            promise.reject(Contract.E_CALL_STATE, wrongState)
        }
    }

    /** Runs [block] on the main thread, unless React Native tears this module down first. */
    private fun onMain(block: () -> Unit) {
        UiThreadUtil.runOnUiThread { if (!invalidated) block() }
    }

    private fun present(map: ReadableMap, name: String): Boolean = map.hasKey(name) && !map.isNull(name)
}
