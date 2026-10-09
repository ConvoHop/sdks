package com.convohop.android.push

import android.annotation.SuppressLint
import android.app.Notification
import android.app.PendingIntent
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person

/**
 * Builds and posts the SDK's notifications, tagged with a call's `alertId` or a message's `conversationId`.
 * A ring and its missed call share the tag but not the ID: when the ring's timeout passes, Android cancels
 * whatever notification then has the ring's tag and ID.
 */
internal class CallNotifier(private val manager: ConvoHopNotifications) {
    private val context get() = manager.context
    private val compat by lazy { NotificationManagerCompat.from(context) }

    @Volatile
    private var channelsCreated = false

    fun postIncomingCall(info: CallInfo) {
        ensureChannels()
        val call = info.notification
        val incoming = manager.incomingCallIntent(info)?.let { activity(it, call.alertId, "incoming") }
        val answer = PendingIntent.getActivity(
            context, requestCode(call.alertId, "answer"),
            ownIntent(ConvoHopAnswerActivity::class.java, call, "answer").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), FLAGS,
        )
        val decline = PendingIntent.getBroadcast(
            context, requestCode(call.alertId, "decline"),
            ownIntent(ConvoHopCallActionReceiver::class.java, call, "decline").setAction(ConvoHopCallActionReceiver.ACTION_DECLINE),
            FLAGS,
        )
        // Before Android 14, CallStyle without a full-screen intent is rejected, and Android 12 and 13 drop the
        // intent when the app doesn't hold USE_FULL_SCREEN_INTENT.
        val callStyle = incoming != null && (Build.VERSION.SDK_INT !in 31..33 || manager.canUseFullScreenIntent())
        try {
            notify(call.alertId, NOTIFICATION_ID, build(info, incoming, answer, decline, callStyle))
        } catch (_: IllegalArgumentException) {
            if (callStyle) notify(call.alertId, NOTIFICATION_ID, build(info, incoming, answer, decline, false))
        }
    }

    private fun build(
        info: CallInfo,
        incoming: PendingIntent?,
        answer: PendingIntent,
        decline: PendingIntent,
        callStyle: Boolean,
    ): Notification {
        val call = info.notification
        val name = call.title ?: appLabel()
        val text = call.body ?: context.getString(
            if (call.video) R.string.convohop_video_call_fallback else R.string.convohop_call_fallback,
        )
        val builder = NotificationCompat.Builder(context, CHANNEL_CALLS)
            .setSmallIcon(smallIcon(android.R.drawable.sym_call_incoming))
            .setContentTitle(name)
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))
            .setTimeoutAfter((call.expiresAtMillis - manager.clock()).coerceAtLeast(1))
            .setContentIntent(incoming)
        manager.options.color?.let(builder::setColor)
        if (incoming != null) builder.setFullScreenIntent(incoming, true)
        if (callStyle) {
            val person = Person.Builder().setName(name).setImportant(true).build()
            // Before Android 12 the compat style replaces the text with its generic text unless the extras carry it.
            builder.addExtras(Bundle().apply { putCharSequence(NotificationCompat.EXTRA_TEXT, text) })
            builder.setStyle(NotificationCompat.CallStyle.forIncomingCall(person, decline, answer).setIsVideo(call.video))
        } else {
            builder.addAction(0, context.getString(R.string.convohop_decline), decline)
            builder.addAction(0, context.getString(R.string.convohop_answer), answer)
        }
        val notification = builder.build()
        // Ring until the notification is answered, declined, cancelled or times out.
        notification.flags = notification.flags or Notification.FLAG_INSISTENT
        return notification
    }

    fun postMissedCall(call: PushNotification) {
        ensureChannels()
        val alertId = when (call) {
            is PushNotification.IncomingCall -> call.alertId
            is PushNotification.CallCancelled -> call.alertId
            is PushNotification.Message -> return
        }
        val builder = NotificationCompat.Builder(context, CHANNEL_MISSED_CALLS)
            .setSmallIcon(smallIcon(android.R.drawable.sym_call_missed))
            .setContentTitle(context.getString(R.string.convohop_missed_call))
            .setContentText(call.title)
            .setCategory(NotificationCompat.CATEGORY_MISSED_CALL)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setWhen(call.occurredAtMillis)
            .setShowWhen(true)
            .setContentIntent(
                manager.conversationIntent(call, ConvoHopNotifications.ACTION_MISSED_CALL)?.let { activity(it, alertId, "missed") },
            )
        manager.options.color?.let(builder::setColor)
        compat.cancel(alertId, NOTIFICATION_ID)
        notify(alertId, MISSED_CALL_NOTIFICATION_ID, builder.build())
    }

    fun postMessage(message: PushNotification.Message, content: MessageContent) {
        ensureChannels()
        val body = content.body ?: context.getString(R.string.convohop_message_fallback)
        val builder = NotificationCompat.Builder(context, CHANNEL_MESSAGES)
            .setSmallIcon(smallIcon(android.R.drawable.sym_action_chat))
            .setContentTitle(content.title ?: appLabel())
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setWhen(message.occurredAtMillis)
            .setShowWhen(true)
            .setContentIntent(
                manager.conversationIntent(message, ConvoHopNotifications.ACTION_MESSAGE)
                    ?.let { activity(it, message.conversationId, "message") },
            )
        manager.options.color?.let(builder::setColor)
        notify(message.conversationId, NOTIFICATION_ID, builder.build())
    }

    /** Removes a call's ring and its missed call. */
    fun cancelCall(alertId: String) {
        compat.cancel(alertId, NOTIFICATION_ID)
        compat.cancel(alertId, MISSED_CALL_NOTIFICATION_ID)
    }

    // Android drops notifications without POST_NOTIFICATIONS on its own, except incoming calls of a
    // self-managed ConnectionService, which it exempts. So post unconditionally.
    @SuppressLint("MissingPermission")
    private fun notify(tag: String, id: Int, notification: Notification) {
        try {
            compat.notify(tag, id, notification)
        } catch (_: SecurityException) {
        }
    }

    private fun ensureChannels() {
        if (channelsCreated) return
        val ringtone = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val calls = NotificationChannelCompat.Builder(CHANNEL_CALLS, NotificationManagerCompat.IMPORTANCE_HIGH)
            .setName(context.getString(R.string.convohop_channel_calls))
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), ringtone)
            .setVibrationEnabled(true)
            .setVibrationPattern(longArrayOf(0, 1000, 1000))
            .build()
        val missed = NotificationChannelCompat.Builder(CHANNEL_MISSED_CALLS, NotificationManagerCompat.IMPORTANCE_DEFAULT)
            .setName(context.getString(R.string.convohop_channel_missed_calls))
            .build()
        val messages = NotificationChannelCompat.Builder(CHANNEL_MESSAGES, NotificationManagerCompat.IMPORTANCE_HIGH)
            .setName(context.getString(R.string.convohop_channel_messages))
            .build()
        compat.createNotificationChannelsCompat(listOf(calls, missed, messages))
        channelsCreated = true
    }

    private fun activity(intent: Intent, key: String, kind: String): PendingIntent =
        PendingIntent.getActivity(context, requestCode(key, kind), intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), FLAGS)

    private fun ownIntent(target: Class<*>, call: PushNotification.IncomingCall, kind: String): Intent =
        Intent(context, target)
            .setData(Uri.fromParts("convohop", "${call.alertId}/$kind", null))
            .putExtra(ConvoHopNotifications.EXTRA_ALERT_ID, call.alertId)
            .putExtra(ConvoHopNotifications.EXTRA_DATA, call.toJson())

    private fun smallIcon(fallback: Int): Int {
        val configured = manager.options.smallIcon
        if (configured != 0) return configured
        return context.applicationInfo.icon.takeIf { it != 0 } ?: fallback
    }

    private fun appLabel(): String = context.applicationInfo.loadLabel(context.packageManager).toString()

    private fun requestCode(key: String, kind: String): Int = "$key/$kind".hashCode()

    companion object {
        const val CHANNEL_CALLS = "convohop_calls"
        const val CHANNEL_MISSED_CALLS = "convohop_missed_calls"
        const val CHANNEL_MESSAGES = "convohop_messages"

        /** The ID of rings and messages. Missed calls have their own. */
        const val NOTIFICATION_ID = 0x0c0c
        const val MISSED_CALL_NOTIFICATION_ID = 0x0c0d
        private const val FLAGS = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    }
}
