package com.convohop.android.push

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager

/** Answers from the incoming-call notification, then opens the answered-call screen. It shows no UI. */
internal class ConvoHopAnswerActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Android asks to unlock a secure lock screen before a notification action opens an activity, so the
        // notification's Answer button needs an unlock. To answer without unlocking, the user answers on the
        // app's incoming-call screen. Showing when locked matters only if this starts while the device is locked.
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
        }
        val alertId = intent.getStringExtra(ConvoHopNotifications.EXTRA_ALERT_ID)
        if (savedInstanceState == null && alertId != null) {
            val manager = ConvoHopNotifications.getInstance(this)
            val info = manager.answerCall(alertId, intent.getStringExtra(ConvoHopNotifications.EXTRA_DATA))
            if (info == null) {
                manager.cancelNotification(alertId)
            } else {
                manager.answeredCallIntent(info)?.let { target ->
                    try {
                        startActivity(target.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    } catch (_: ActivityNotFoundException) {
                    }
                }
            }
        }
        finish()
    }
}

/** Declines from the incoming-call notification. */
internal class ConvoHopCallActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_DECLINE) return
        val alertId = intent.getStringExtra(ConvoHopNotifications.EXTRA_ALERT_ID) ?: return
        ConvoHopNotifications.getInstance(context)
            .endCall(alertId, ringing = true, data = intent.getStringExtra(ConvoHopNotifications.EXTRA_DATA))
    }

    companion object {
        const val ACTION_DECLINE = "com.convohop.android.push.action.DECLINE"
    }
}
