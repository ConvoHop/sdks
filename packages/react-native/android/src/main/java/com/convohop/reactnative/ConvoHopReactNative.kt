package com.convohop.reactnative

import android.content.Context
import com.convohop.android.push.ConvoHopNotificationOptions
import com.convohop.android.push.ConvoHopNotifications

/** Sets up ConvoHop push and calls for `@convohop/react-native`. */
public object ConvoHopReactNative {
    /**
     * Applies [options] to the push SDK and connects it to React Native. Call it from `Application.onCreate`, before
     * React Native loads, so a push that starts the app is handled the same way.
     *
     * It wraps your `recipientFilter`, so pushes reach only the recipient JavaScript stored with `setPushRecipient`,
     * and your `conversationIntent`, so the push module can tell JavaScript which notification the user opened. Set
     * both before you call it, and don't replace [ConvoHopNotifications.options] afterwards: the modules reject
     * registration until it is configured.
     */
    @JvmStatic
    @JvmOverloads
    public fun configure(context: Context, options: ConvoHopNotificationOptions = ConvoHopNotificationOptions()): ConvoHopNotifications {
        val process = ConvoHopProcess.get(context)
        val filter = options.recipientFilter
        if (filter !is RecipientGate) options.recipientFilter = RecipientGate(process.recipients::get, filter)
        val intents = options.conversationIntent
        if (intents !is SignedConversationIntent) options.conversationIntent = SignedConversationIntent(intents, process.signer)
        process.notifications.options = options
        return process.notifications
    }
}

/** What the modules of every React Native instance in this process share. */
internal class ConvoHopProcess private constructor(context: Context) {
    val notifications: ConvoHopNotifications = ConvoHopNotifications.getInstance(context)
    val recipients = RecipientStore(context)
    val signer = IntentSigner.stored(context)
    val hub = CallHub(notifications)

    init {
        notifications.addListener(hub)
    }

    /** Whether [ConvoHopReactNative.configure] set up the push SDK's options. */
    val configured: Boolean get() = notifications.options.recipientFilter is RecipientGate

    companion object {
        @Volatile
        private var instance: ConvoHopProcess? = null

        fun get(context: Context): ConvoHopProcess = instance ?: synchronized(this) {
            instance ?: ConvoHopProcess(context.applicationContext).also { instance = it }
        }
    }
}
