package com.convohop.android.push

import android.app.Application
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Looper
import androidx.core.os.BundleCompat
import com.convohop.android.push.Fixtures.NOW
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowNotificationManager
import java.time.Duration
import java.util.concurrent.atomic.AtomicReference

/**
 * The process's [ConvoHopNotifications] on Robolectric's paused main looper,
 * with a fake clock, an in-memory ledger, intent factories (a test app has
 * no launch activity) and a listener that records events.
 */
internal class PushHarness {
    val app: Application = RuntimeEnvironment.getApplication()
    val manager: ConvoHopNotifications = ConvoHopNotifications.getInstance(app)
    val label: String = app.applicationInfo.loadLabel(app.packageManager).toString()
    var now: Long = NOW
    private val events = mutableListOf<String>()

    val recorder: ConvoHopNotificationListener = object : ConvoHopNotificationListener {
        override fun onRegistered(registration: PushRegistration) {
            events += "registered ${describe(registration)}"
        }

        override fun onUnregistered(registration: PushRegistration) {
            events += "unregistered ${describe(registration)}"
        }

        override fun onMessage(message: PushNotification.Message) {
            events += "message ${message.eventId}"
        }

        override fun onIncomingCall(call: CallInfo) {
            check(call.state == CallState.RINGING)
            events += "incoming ${call.alertId}"
        }

        override fun onCallAnswered(call: CallInfo) {
            check(call.state == CallState.ACTIVE)
            events += "answered ${call.alertId}"
        }

        override fun onCallEnded(call: CallInfo, reason: CallEndReason, serverReason: String?) {
            check(call.state == CallState.ENDED && call.endReason == reason && call.serverReason == serverReason)
            events += "ended ${call.alertId} $reason $serverReason"
        }

        override fun onCallHoldChanged(call: CallInfo, onHold: Boolean) {
            events += "hold ${call.alertId} $onHold"
        }

        override fun onCallMuteChanged(call: CallInfo, muted: Boolean) {
            events += "mute ${call.alertId} $muted"
        }

        override fun onCallAudioRouteChanged(call: CallInfo, route: AudioRoute, available: Set<AudioRoute>) {
            events += "route ${call.alertId} $route ${available.sorted()}"
        }
    }

    init {
        manager.clock = { now }
        manager.options = ConvoHopNotificationOptions().apply {
            useTelecom = false
            ledgerStore = MemoryPushLedgerStore()
            incomingCallIntent = CallIntentFactory { context, _ -> Intent(INCOMING).setPackage(context.packageName) }
            answeredCallIntent = CallIntentFactory { context, _ -> Intent(ANSWERED).setPackage(context.packageName) }
            conversationIntent = ConversationIntentFactory { context, _ -> Intent(OPEN_CONVERSATION).setPackage(context.packageName) }
        }
        manager.addListener(recorder)
    }

    val options: ConvoHopNotificationOptions get() = manager.options

    val notifications: ShadowNotificationManager get() = shadowOf(app.getSystemService(NotificationManager::class.java))

    fun handle(data: String): PushResult = manager.handleNotification(Fixtures.push(data))

    /** Handles [data] on a worker thread, as FCM does; only there may the message content provider run. */
    fun handleInBackground(data: String): PushResult {
        val result = AtomicReference<Result<PushResult>>()
        val thread = Thread { result.set(runCatching { handle(data) }) }
        thread.start()
        thread.join()
        return result.get().getOrThrow()
    }

    fun idle() {
        shadowOf(Looper.getMainLooper()).idle()
    }

    /** Moves the clock and the main looper forward together. */
    fun advance(millis: Long) {
        now += millis
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(millis))
    }

    /** The SDK's notification for a call's `alertId` or a message's `conversationId`. */
    fun posted(tag: String): Notification? = notifications.getNotification(tag, CallNotifier.NOTIFICATION_ID)

    /** Like [posted], but the notification must be there. */
    fun notification(tag: String): Notification = posted(tag) ?: throw AssertionError("No notification for $tag")

    /** The activity the code under test started last, if any. */
    fun startedActivity(): Intent? = shadowOf(app).nextStartedActivity

    /** The listener events since the last call, once the main looper ran. */
    fun events(): List<String> {
        idle()
        return events.toList().also { events.clear() }
    }

    companion object {
        const val INCOMING: String = "test.INCOMING_CALL"
        const val ANSWERED: String = "test.ANSWERED_CALL"
        const val OPEN_CONVERSATION: String = "test.OPEN_CONVERSATION"

        /** A registration in full, as the recorder logs it: `toString` hides the value. */
        fun describe(registration: PushRegistration): String = when (registration) {
            is PushRegistration.Token -> "token ${registration.token}"
            is PushRegistration.InstallationId -> "fid ${registration.fid}"
        }
    }
}

internal val Notification.title: String? get() = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()

internal val Notification.text: String? get() = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()

/** A call-style intent, such as `NotificationCompat.EXTRA_ANSWER_INTENT`. */
internal fun Notification.callIntent(key: String): PendingIntent =
    BundleCompat.getParcelable(extras, key, PendingIntent::class.java) ?: error("The notification has no $key")
