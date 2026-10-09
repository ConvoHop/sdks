package com.convohop.android.push

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.os.HandlerCompat
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Turns ConvoHop pushes into Android notifications and incoming calls.
 *
 * Call [handleNotification] with each FCM data message (or use
 * [ConvoHopFirebase] or [ConvoHopMessagingService]). Messages become
 * notifications. A call rings with a full-screen incoming-call notification
 * and, on Android 8.0 and later, through a self-managed `ConnectionService`.
 * It stops when the server cancels it, it reaches `expiresAt`, or the user
 * answers or declines. Delivery is at least once and unordered: duplicates
 * and late rings are dropped.
 *
 * Configure [options] in `Application.onCreate`, because a push can start
 * your process. Methods are thread-safe; listeners run on the main thread.
 */
public class ConvoHopNotifications private constructor(context: Context) {
    internal val context: Context = context
    private val main = Handler(Looper.getMainLooper())
    private val lock = Any()
    private val calls = LinkedHashMap<String, CallEntry>()
    private val listeners = CopyOnWriteArrayList<ConvoHopNotificationListener>()
    private var ledgerInstance: PushLedger? = null
    private val notifier = CallNotifier(this)
    private val telecom: TelecomCalls? = if (Build.VERSION.SDK_INT >= 26) TelecomCalls(context) else null

    /** The wall clock in epoch milliseconds; tests replace it. */
    internal var clock: () -> Long = System::currentTimeMillis

    /** How pushes are presented. Replace it before pushes arrive. */
    @Volatile
    public var options: ConvoHopNotificationOptions = ConvoHopNotificationOptions()

    /** The latest FCM token this process saw, held in memory only. */
    @Volatile
    public var token: String? = null
        private set

    /**
     * Handles an FCM data message. Returns [PushResult.NOT_CONVOHOP] for a push
     * that isn't ConvoHop's, so you can route it elsewhere. It may block
     * briefly while [ConvoHopNotificationOptions.messageContent] fetches text.
     */
    public fun handleNotification(data: Map<String, String>): PushResult {
        if (!ConvoHopPush.isConvoHop(data)) return PushResult.NOT_CONVOHOP
        val notification = ConvoHopPush.parse(data) ?: return PushResult.INVALID
        return handle(notification)
    }

    /** Handles a notification you already parsed with [ConvoHopPush]. */
    public fun handle(notification: PushNotification): PushResult {
        val filter = options.recipientFilter
        if (filter != null && !filter.accepts(notification.recipientId)) return PushResult.IGNORED
        return when (ledger().record(notification)) {
            PushDecision.SHOW_MESSAGE -> message(notification as PushNotification.Message)
            PushDecision.RING -> ring(notification as PushNotification.IncomingCall)
            PushDecision.STOP_RINGING, PushDecision.MISSED_CALL -> stopRinging(notification as PushNotification.CallCancelled)
            PushDecision.IGNORE -> PushResult.IGNORED
        }
    }

    /** Adds [listener] if it isn't added yet. Close the result to remove it. */
    public fun addListener(listener: ConvoHopNotificationListener): AutoCloseable {
        listeners.addIfAbsent(listener)
        return AutoCloseable { listeners.remove(listener) }
    }

    public fun removeListener(listener: ConvoHopNotificationListener) {
        listeners.remove(listener)
    }

    /** Records a new FCM registration token and reports it to listeners. Send it to your backend. */
    public fun onNewToken(token: String) {
        this.token = token
        dispatch { it.onToken(token) }
    }

    /** False when the user turned off this app's notifications or hasn't granted `POST_NOTIFICATIONS`. */
    public fun areNotificationsEnabled(): Boolean = NotificationManagerCompat.from(context).areNotificationsEnabled()

    /**
     * Whether incoming calls can take the full screen over the lock screen.
     * Android 14 lets the user and Google Play deny it; calls then show as a
     * heads-up notification. Send the user to [fullScreenIntentSettings].
     */
    public fun canUseFullScreenIntent(): Boolean = when {
        Build.VERSION.SDK_INT >= 34 -> context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
        Build.VERSION.SDK_INT >= 29 -> ContextCompat.checkSelfPermission(context, Manifest.permission.USE_FULL_SCREEN_INTENT) ==
            PackageManager.PERMISSION_GRANTED
        else -> true
    }

    /** The settings screen where the user allows full-screen incoming calls. */
    public fun fullScreenIntentSettings(): Intent {
        val packageUri = Uri.fromParts("package", context.packageName, null)
        val intent = when {
            Build.VERSION.SDK_INT >= 34 -> Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, packageUri)
            Build.VERSION.SDK_INT >= 26 ->
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri)
        }
        return intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    /** The calls on this device: ringing, in progress, or ended within the last 60 seconds. */
    public fun calls(): List<CallInfo> = synchronized(lock) { calls.values.map { it.info() } }

    /** The call with [alertId], or null. */
    public fun call(alertId: String): CallInfo? = synchronized(lock) { calls[alertId]?.info() }

    /** Answers a ringing call, as the notification's Answer button does. Then join the live session. */
    public fun answer(alertId: String): Boolean = answerCall(alertId, null) != null

    /** Declines a ringing call on this device. ConvoHop has no decline operation, so the caller keeps ringing others. */
    public fun reject(alertId: String): Boolean = endCall(alertId, ringing = true, data = null)

    /** Ends a call on this device: declines it if it is ringing, otherwise hangs up. Call it when your call ends. */
    public fun end(alertId: String): Boolean = endCall(alertId, ringing = false, data = null)

    /** Drops an ended call from [calls] before its 60 seconds pass. False for a live or unknown call. */
    public fun forget(alertId: String): Boolean {
        val entry = synchronized(lock) {
            val entry = calls[alertId]?.takeIf { it.state == CallState.ENDED } ?: return false
            calls.remove(alertId)
            entry
        }
        main.removeCallbacksAndMessages(entry)
        return true
    }

    /** Puts an answered call on hold or resumes it. */
    public fun setOnHold(alertId: String, onHold: Boolean): Boolean {
        val target = if (onHold) CallState.HELD else CallState.ACTIVE
        val (entry, connection) = synchronized(lock) {
            val entry = calls[alertId]?.takeIf { it.state == CallState.ACTIVE || it.state == CallState.HELD } ?: return false
            if (entry.state == target) return true
            entry.state = target
            entry to entry.connection
        }
        connection?.let { if (onHold) it.hold() else it.activate() }
        val info = entry.info()
        dispatch { it.onCallHoldChanged(info, onHold) }
        return true
    }

    /** Asks the system to move a call's audio. False without a system call, or when [route] isn't available. */
    public fun setAudioRoute(alertId: String, route: AudioRoute): Boolean {
        val connection = synchronized(lock) { calls[alertId]?.connection } ?: return false
        return connection.requestRoute(route)
    }

    private fun message(message: PushNotification.Message): PushResult {
        val options = options
        if (options.showMessages) {
            var content = MessageContent(message.title, message.body)
            val provider = options.messageContent
            if (message.body == null && provider != null && Looper.myLooper() != Looper.getMainLooper()) {
                val fetched = try {
                    provider.content(message)
                } catch (_: RuntimeException) {
                    null
                }
                if (fetched != null) content = MessageContent(fetched.title ?: message.title, fetched.body)
            }
            notifier.postMessage(message, content)
        }
        dispatch { it.onMessage(message) }
        return PushResult.MESSAGE
    }

    private fun ring(call: PushNotification.IncomingCall): PushResult {
        val entry = CallEntry(call)
        synchronized(lock) {
            if (calls.containsKey(call.alertId)) return PushResult.IGNORED
            calls[call.alertId] = entry
        }
        HandlerCompat.postDelayed(main, { expire(entry) }, entry, (call.expiresAtMillis - clock()).coerceAtLeast(0))
        val info = entry.info()
        notifier.postIncomingCall(info)
        if (options.useTelecom && Build.VERSION.SDK_INT >= 26) telecom?.addIncomingCall(call)
        dispatch { it.onIncomingCall(info) }
        return PushResult.RINGING
    }

    private fun stopRinging(cancel: PushNotification.CallCancelled): PushResult {
        val reason = when (cancel.reason) {
            "answered" -> CallEndReason.ANSWERED_ELSEWHERE
            "declined" -> CallEndReason.DECLINED_ELSEWHERE
            "ended", "expired" -> CallEndReason.MISSED
            else -> CallEndReason.STOPPED
        }
        val ending = synchronized(lock) {
            val entry = calls[cancel.alertId]
            when {
                entry == null -> null
                entry.state == CallState.RINGING -> finish(entry, reason, cancel.reason)
                else -> {
                    // A ring that expired here but was answered or declined in time elsewhere wasn't missed.
                    if (entry.endReason == CallEndReason.EXPIRED && !cancel.missed) notifier.cancelCall(cancel.alertId)
                    // A call answered here gets its own ring's cancellation too; it keeps going.
                    return PushResult.IGNORED
                }
            }
        }
        if (cancel.missed && options.showMissedCalls) notifier.postMissedCall(cancel) else notifier.cancelCall(cancel.alertId)
        if (ending != null) ended(ending, reason, cancel.reason)
        return if (cancel.missed) PushResult.MISSED else PushResult.STOPPED
    }

    private fun expire(entry: CallEntry) {
        val ending = synchronized(lock) {
            if (calls[entry.call.alertId] !== entry || entry.state != CallState.RINGING) return
            finish(entry, CallEndReason.EXPIRED, null)
        }
        ledger().stop(entry.call.alertId, entry.call.expiresAtMillis)
        if (options.showMissedCalls) notifier.postMissedCall(entry.call) else notifier.cancelCall(entry.call.alertId)
        ended(ending, CallEndReason.EXPIRED, null)
    }

    /**
     * Answers [alertId]. [data] is the ring's `convohop` JSON from the
     * notification, so a call still answers after Android restarted the process.
     */
    internal fun answerCall(alertId: String, data: String?): CallInfo? {
        val (entry, connection) = synchronized(lock) {
            val entry = calls[alertId] ?: restore(alertId, data)?.also { calls[alertId] = it } ?: return null
            if (entry.state != CallState.RINGING) return null
            entry.state = CallState.ACTIVE
            entry to entry.connection
        }
        main.removeCallbacksAndMessages(entry)
        ledger().stop(alertId, entry.call.expiresAtMillis)
        notifier.cancelCall(alertId)
        connection?.activate()
        val info = entry.info()
        dispatch { it.onCallAnswered(info) }
        return info
    }

    /** Ends a live call. [ringing] ends only a ringing one; [data] restores it as [answerCall] does. */
    internal fun endCall(alertId: String, ringing: Boolean, data: String?, reason: CallEndReason? = null): Boolean {
        val ending = synchronized(lock) {
            val entry = calls[alertId] ?: restore(alertId, data)?.also { calls[alertId] = it }
            if (entry == null || entry.state == CallState.ENDED || (ringing && entry.state != CallState.RINGING)) {
                null
            } else {
                finish(entry, reason ?: if (entry.state == CallState.RINGING) CallEndReason.REJECTED else CallEndReason.HUNG_UP, null)
            }
        }
        if (ending == null) {
            // A stale notification action: the ring already stopped.
            if (data != null) notifier.cancelCall(alertId)
            return false
        }
        if (ending.previous == CallState.RINGING) ledger().stop(alertId, ending.entry.call.expiresAtMillis)
        notifier.cancelCall(alertId)
        ended(ending, ending.entry.endReason ?: CallEndReason.HUNG_UP, null)
        return true
    }

    private fun restore(alertId: String, data: String?): CallEntry? {
        val call = data?.let(ConvoHopPush::parseData) as? PushNotification.IncomingCall ?: return null
        if (call.alertId != alertId || ledger().isStopped(alertId, call.expiresAtMillis)) return null
        return CallEntry(call)
    }

    // Holds lock.
    private fun finish(entry: CallEntry, reason: CallEndReason, serverReason: String?): Ending {
        val ending = Ending(entry, entry.connection, entry.state)
        entry.state = CallState.ENDED
        entry.endReason = reason
        entry.serverReason = serverReason
        entry.connection = null
        return ending
    }

    private fun ended(ending: Ending, reason: CallEndReason, serverReason: String?) {
        val entry = ending.entry
        main.removeCallbacksAndMessages(entry)
        HandlerCompat.postDelayed(main, { drop(entry) }, entry, ENDED_RETENTION_MILLIS)
        ending.connection?.end(reason)
        val info = entry.info()
        dispatch { it.onCallEnded(info, reason, serverReason) }
    }

    private fun drop(entry: CallEntry) {
        synchronized(lock) {
            if (calls[entry.call.alertId] === entry && entry.state == CallState.ENDED) calls.remove(entry.call.alertId)
        }
    }

    /** The system created the connection for a ring; null when the ring already stopped. */
    internal fun attach(alertId: String, create: (PushNotification.IncomingCall) -> CallConnection): CallConnection? {
        synchronized(lock) {
            val entry = calls[alertId]?.takeIf { it.state == CallState.RINGING && it.connection == null } ?: return null
            return create(entry.call).also { entry.connection = it }
        }
    }

    /** The system refused a ring, for example during an emergency call: it keeps ringing as a notification. */
    internal fun refused(alertId: String) {
        synchronized(lock) { calls[alertId]?.takeIf { it.state == CallState.RINGING }?.connection = null }
    }

    /** The system aborted the call: a ring falls back to the notification, an answered call fails. */
    internal fun aborted(alertId: String) {
        val answered = synchronized(lock) {
            val entry = calls[alertId] ?: return
            if (entry.state == CallState.RINGING) entry.connection = null
            entry.state == CallState.ACTIVE || entry.state == CallState.HELD
        }
        if (answered) endCall(alertId, ringing = false, data = null, reason = CallEndReason.FAILED)
    }

    internal fun audioChanged(alertId: String, muted: Boolean, route: AudioRoute, available: Set<AudioRoute>) {
        val (entry, changes) = synchronized(lock) {
            val entry = calls[alertId]?.takeIf { it.state != CallState.ENDED } ?: return
            val changes = (entry.muted != muted) to (entry.route != route || entry.routes != available)
            entry.muted = muted
            entry.route = route
            entry.routes = available
            entry to changes
        }
        val info = entry.info()
        if (changes.first) dispatch { it.onCallMuteChanged(info, muted) }
        if (changes.second) dispatch { it.onCallAudioRouteChanged(info, route, available) }
    }

    internal fun cancelNotification(alertId: String) {
        notifier.cancelCall(alertId)
    }

    private fun ledger(): PushLedger = synchronized(lock) {
        ledgerInstance ?: PushLedger(options.ledgerStore ?: SharedPreferencesPushLedgerStore(context), { clock() })
            .also { ledgerInstance = it }
    }

    private fun dispatch(event: (ConvoHopNotificationListener) -> Unit) {
        main.post { for (listener in listeners) event(listener) }
    }

    internal fun incomingCallIntent(info: CallInfo): Intent? = callIntent(options.incomingCallIntent, info, ACTION_INCOMING_CALL)

    internal fun answeredCallIntent(info: CallInfo): Intent? = callIntent(options.answeredCallIntent, info, ACTION_ANSWERED_CALL)

    internal fun conversationIntent(notification: PushNotification, action: String): Intent? {
        val intent = options.conversationIntent?.create(context, notification) ?: launchIntent() ?: return null
        intent.putExtra(EXTRA_ACTION, action).putExtra(EXTRA_CONVERSATION_ID, notification.conversationId)
        when (notification) {
            is PushNotification.Message -> intent.putExtra(EXTRA_MESSAGE_ID, notification.messageId)
            is PushNotification.IncomingCall ->
                intent.putExtra(EXTRA_ALERT_ID, notification.alertId).putExtra(EXTRA_LIVE_SESSION_ID, notification.liveSessionId)
            is PushNotification.CallCancelled ->
                intent.putExtra(EXTRA_ALERT_ID, notification.alertId).putExtra(EXTRA_LIVE_SESSION_ID, notification.liveSessionId)
        }
        return intent
    }

    private fun callIntent(factory: CallIntentFactory?, info: CallInfo, action: String): Intent? {
        val intent = factory?.create(context, info) ?: launchIntent() ?: return null
        return intent.putExtra(EXTRA_ACTION, action)
            .putExtra(EXTRA_ALERT_ID, info.alertId)
            .putExtra(EXTRA_LIVE_SESSION_ID, info.liveSessionId)
            .putExtra(EXTRA_CONVERSATION_ID, info.conversationId)
            .putExtra(EXTRA_VIDEO, info.video)
    }

    private fun launchIntent(): Intent? =
        context.packageManager.getLaunchIntentForPackage(context.packageName)?.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)

    public companion object {
        /** Which notification opened the activity: [ACTION_INCOMING_CALL], [ACTION_ANSWERED_CALL], [ACTION_MESSAGE] or [ACTION_MISSED_CALL]. */
        public const val EXTRA_ACTION: String = "com.convohop.android.push.extra.ACTION"
        public const val EXTRA_ALERT_ID: String = "com.convohop.android.push.extra.ALERT_ID"
        public const val EXTRA_LIVE_SESSION_ID: String = "com.convohop.android.push.extra.LIVE_SESSION_ID"
        public const val EXTRA_CONVERSATION_ID: String = "com.convohop.android.push.extra.CONVERSATION_ID"
        public const val EXTRA_MESSAGE_ID: String = "com.convohop.android.push.extra.MESSAGE_ID"

        /** A boolean: whether the call has video. */
        public const val EXTRA_VIDEO: String = "com.convohop.android.push.extra.VIDEO"
        public const val ACTION_INCOMING_CALL: String = "incomingCall"
        public const val ACTION_ANSWERED_CALL: String = "answeredCall"
        public const val ACTION_MESSAGE: String = "message"
        public const val ACTION_MISSED_CALL: String = "missedCall"

        /** The ring's `convohop` JSON on the notification's own intents. */
        internal const val EXTRA_DATA: String = "com.convohop.android.push.extra.DATA"
        internal const val ENDED_RETENTION_MILLIS: Long = 60_000

        @Volatile
        private var instance: ConvoHopNotifications? = null

        /** The process-wide instance. */
        @JvmStatic
        public fun getInstance(context: Context): ConvoHopNotifications {
            val app = context.applicationContext ?: context
            instance?.let { if (it.context === app) return it }
            synchronized(this) {
                instance?.let { if (it.context === app) return it }
                return ConvoHopNotifications(app).also { instance = it }
            }
        }
    }
}

private class CallEntry(val call: PushNotification.IncomingCall) {
    var state: CallState = CallState.RINGING
    var connection: CallConnection? = null
    var endReason: CallEndReason? = null
    var serverReason: String? = null
    var muted = false
    var route: AudioRoute? = null
    var routes: Set<AudioRoute> = emptySet()

    fun info(): CallInfo = CallInfo(call, state, endReason, serverReason, muted, route, routes, connection != null)
}

private class Ending(val entry: CallEntry, val connection: CallConnection?, val previous: CallState)

/** The ring as its `convohop` JSON, so the notification's own intents can restore it. */
internal fun PushNotification.IncomingCall.toJson(): String {
    val data = linkedMapOf<String, Any?>(
        "eventId" to eventId,
        "eventType" to "notification.call",
        "occurredAt" to occurredAt,
        "projectId" to projectId,
        "recipientId" to recipientId,
        "conversationId" to conversationId,
        "senderId" to senderId,
        "liveSessionId" to liveSessionId,
        "alertId" to alertId,
        "expiresAt" to expiresAt,
        "mediaProfile" to mediaProfile,
    )
    title?.let { data["title"] = it }
    body?.let { data["body"] = it }
    return PushJson.write(data)
}
