// Calling quickstart snippets. Calls need real media, which the conformance mock doesn't have, so CI compiles these
// samples but doesn't run them. PushTest runs CallActivity, the incoming-call screen, with faked pushes.
package dev.instantrelay.examples

// #region imports
import android.app.Activity
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import dev.instantrelay.android.RelayCall
import dev.instantrelay.android.LiveKitMediaRoom
import dev.instantrelay.android.core.RelayClient
import dev.instantrelay.android.push.CallEndReason
import dev.instantrelay.android.push.CallInfo
import dev.instantrelay.android.push.CallState
import dev.instantrelay.android.push.RelayNotificationListener
import dev.instantrelay.android.push.RelayNotifications
import io.livekit.android.room.Room
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
// #endregion imports

// #region start-call
/** Starts a video call in a conversation, joins it and rings other members. */
suspend fun startCall(context: Context, client: RelayClient, conversationId: String, ring: List<String>): RelayCall {
    val live = client.conversation(conversationId).live.startVideo().ready() // startVoice() for audio only.
    val call = RelayCall.join(context, live.join()) // Connected and receiving. Nothing is captured yet.
    // Each member you ring gets a notification.call webhook event, which your backend turns into a push.
    live.alerts.send(ring)
    return call
}
// #endregion start-call

// #region join-call
/** Joins the conversation's current call, or returns null when there's none. A ring isn't required. */
suspend fun joinCall(context: Context, client: RelayClient, conversationId: String): RelayCall? {
    val live = client.conversation(conversationId).live.current() ?: return null
    return RelayCall.join(context, live.join()) // If media can't connect, it leaves the call and throws.
}

/** Turns on what the call allows. Call it once the user has granted RECORD_AUDIO, and CAMERA for video. */
suspend fun startCapture(call: RelayCall) {
    val allowed = call.connection?.participation?.snapshot?.permissions ?: return
    if (allowed.microphone) call.microphone(true)
    if (allowed.camera) call.camera(true) // A voice call never allows the camera.
}
// #endregion join-call

// #region answer
/** Joins each call the user answers from the ring. Call it from Application.onCreate. */
fun answerCalls(context: Context, scope: CoroutineScope, client: () -> RelayClient?, show: (RelayCall) -> Unit) {
    val notifications = RelayNotifications.getInstance(context)
    val failed = CoroutineExceptionHandler { _, error -> Log.w("Call", "Couldn't answer the call", error) }
    notifications.addListener(object : RelayNotificationListener {
        override fun onCallAnswered(call: CallInfo) {
            val signedIn = client()
            if (signedIn == null) {
                notifications.end(call.alertId) // No one is signed in to join it.
                return
            }
            // Checks that the call is for this user, joins it and connects media. If that fails, the system call ends.
            scope.launch(failed) { show(RelayCall.answer(context, signedIn, call.alertId)) }
        }
    })
}
// #endregion answer

// #region video
/** The LiveKit Room to render the call's video from, for example with LiveKit's VideoTrackView. */
fun liveKitRoom(call: RelayCall): Room? = (call.connection?.room as? LiveKitMediaRoom)?.room
// #endregion video

// #region end-call
/** Leaves the call on this device. Everyone else stays in it. */
suspend fun leaveCall(call: RelayCall) = call.hangUp()

/** Ends the call for everyone. */
suspend fun endCall(call: RelayCall) {
    val live = call.connection?.participation?.live
    call.hangUp()
    live?.end()?.completed() // Returns once Relay has cut off everyone's media.
}
// #endregion end-call

// #region incoming-screen
/** The ringing call's full-screen screen, with answer and decline buttons. Declare it in your manifest. */
class CallActivity : Activity() {
    private val notifications by lazy { RelayNotifications.getInstance(this) }
    private val alertId by lazy { intent.getStringExtra(RelayNotifications.EXTRA_ALERT_ID) }
    private var listener: AutoCloseable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Shows over the lock screen and wakes the device while the call rings.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        // call() also returns calls that ended in the last 60 seconds, so check that this one still rings.
        val ringing = alertId?.let { notifications.call(it) }?.takeIf { it.state == CallState.RINGING }
        if (ringing == null) return finish() // The ring already stopped.
        title = ringing.title // The caller's name, when the push carries one. Show it in your layout.
        listener = notifications.addListener(object : RelayNotificationListener {
            override fun onCallEnded(call: CallInfo, reason: CallEndReason, serverReason: String?) {
                if (call.alertId == alertId) finish() // Answered or declined elsewhere, or nobody answered.
            }
        })
    }

    /** Your answer button. onCallAnswered then joins the call. */
    fun onAnswer() {
        alertId?.let { notifications.answer(it) }
        finish() // Or show your in-call screen.
    }

    /** Your decline button. */
    fun onDecline() {
        alertId?.let { notifications.reject(it) }
        finish()
    }

    override fun onDestroy() {
        listener?.close()
        super.onDestroy()
    }
}
// #endregion incoming-screen
