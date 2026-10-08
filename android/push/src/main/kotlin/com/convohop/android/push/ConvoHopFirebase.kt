package com.convohop.android.push

import android.content.Context
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Connects Firebase Cloud Messaging to [ConvoHopNotifications]. Your app
 * supplies `com.google.firebase:firebase-messaging` and its own
 * `google-services.json`; this library only compiles against it.
 */
public object ConvoHopFirebase {
    /** Handles [message] if it is ConvoHop's. False means it isn't: handle it yourself. */
    @JvmStatic
    public fun handleMessage(context: Context, message: RemoteMessage): Boolean {
        val data = message.data
        if (!ConvoHopPush.isConvoHop(data)) return false
        ConvoHopNotifications.getInstance(context).handleNotification(data)
        return true
    }

    /** Reports a new FCM token from `FirebaseMessagingService.onNewToken`. */
    @JvmStatic
    public fun onNewToken(context: Context, token: String) {
        ConvoHopNotifications.getInstance(context).onNewToken(token)
    }

    /** Fetches the current FCM token and reports it to [ConvoHopNotifications] listeners. */
    @JvmStatic
    public fun requestToken(context: Context) {
        val app = context.applicationContext ?: context
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            if (token != null) onNewToken(app, token)
        }
    }
}

/**
 * A messaging service that hands ConvoHop pushes and tokens to
 * [ConvoHopNotifications]. Declare it (or a subclass) in your manifest with
 * the `com.google.firebase.MESSAGING_EVENT` intent filter, or call
 * [ConvoHopFirebase] from your own service instead.
 */
public open class ConvoHopMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        if (!ConvoHopFirebase.handleMessage(this, message)) onOtherMessage(message)
    }

    override fun onNewToken(token: String) {
        ConvoHopFirebase.onNewToken(this, token)
    }

    /** A push that isn't ConvoHop's. */
    public open fun onOtherMessage(message: RemoteMessage) {}
}
