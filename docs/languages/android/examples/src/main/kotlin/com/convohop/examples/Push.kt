// Push quickstart snippets. PushTest runs them under Robolectric with faked FCM pushes, against the conformance
// mock. ChatApplication isn't run: ConvoHopFirebase.register needs Firebase, configured with your google-services.json.
package com.convohop.examples

// #region imports
import android.app.Application
import android.content.Context
import android.content.Intent
import com.convohop.android.ConvoHopMessageContent
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.push.CallIntentFactory
import com.convohop.android.push.ConvoHopFirebase
import com.convohop.android.push.ConvoHopNotificationListener
import com.convohop.android.push.ConvoHopNotificationOptions
import com.convohop.android.push.ConvoHopNotifications
import com.convohop.android.push.PushRegistration
import com.convohop.android.push.PushResult
import com.convohop.android.push.RecipientFilter
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
// #endregion imports

// #region configure
/** Call it from Application.onCreate: a push can start your process before anything else runs. */
fun configureNotifications(
    app: Application,
    signedInUser: () -> String?, // The signed-in principal ID, which you save at sign-in, or null.
    signedInClient: () -> ConvoHopClient?, // The user's connected client, or null before it connects.
    saveRegistration: (String) -> Unit, // Sends this device's registration to your backend.
): ConvoHopNotifications {
    val notifications = ConvoHopNotifications.getInstance(app)
    notifications.options = ConvoHopNotificationOptions().apply {
        smallIcon = R.drawable.ic_notification
        // Drops pushes for anyone but the user signed in on this device.
        recipientFilter = RecipientFilter { recipientId -> recipientId == signedInUser() }
        // The ringing call's full-screen screen. The SDK adds the call's alert ID to the intent.
        incomingCallIntent = CallIntentFactory { context, _ -> Intent(context, CallActivity::class.java) }
        // With previews off, reads the message with the user's session, so its text never passes through FCM.
        messageContent = ConvoHopMessageContent { signedInClient() }
    }
    notifications.addListener(object : ConvoHopNotificationListener {
        override fun onRegistered(registration: PushRegistration) {
            // Runs on the main thread. The same registration can arrive again, so store it idempotently.
            saveRegistration(registration.toJson())
        }
    })
    return notifications
}
// #endregion configure

// #region application
/** Your Application. Declare it in your manifest with android:name. */
abstract class ChatApplication : Application() {
    /** The principal ID you saved when the user signed in, or null. */
    abstract val signedInUser: String?

    /** The user's connected client, or null. */
    abstract val signedInClient: ConvoHopClient?

    /** Sends the registration's JSON to your backend, which stores it for the signed-in user. */
    abstract fun saveRegistration(registrationJson: String)

    override fun onCreate() {
        super.onCreate()
        configureNotifications(this, { signedInUser }, { signedInClient }, ::saveRegistration)
        // Reports the registration FCM holds, even when Firebase's own callbacks don't fire. With FCM auto-init
        // off, call it once the user has agreed to notifications instead.
        ConvoHopFirebase.register(this)
    }
}
// #endregion application

// #region own-service
/** If your app already has a messaging service, forward ConvoHop's pushes and registrations from it. */
open class AppMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        if (!ConvoHopFirebase.handleMessage(this, message)) onOtherMessage(message)
    }

    // Firebase deprecated tokens in favour of installation IDs, but tokens stay FCM's default mode.
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onNewToken(token: String) = ConvoHopFirebase.onNewToken(this, token)

    override fun onRegistered(installationId: String) = ConvoHopFirebase.onRegistered(this, installationId)

    override fun onUnregistered(installationId: String) = ConvoHopFirebase.onUnregistered(this, installationId)

    /** Your app's own pushes. */
    open fun onOtherMessage(message: RemoteMessage) = Unit
}
// #endregion own-service

// #region handle
/** Hands an FCM data map from your own push code to ConvoHop. Returns false when the push isn't ConvoHop's. */
fun handlePushData(context: Context, data: Map<String, String>): Boolean {
    // Call it off the main thread, as FCM does: only there can it read a message's text for the notification.
    val result = ConvoHopNotifications.getInstance(context).handleNotification(data)
    return result != PushResult.NOT_CONVOHOP
}
// #endregion handle
