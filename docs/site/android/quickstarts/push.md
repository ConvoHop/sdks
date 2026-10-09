# Android push notifications quickstart

Show ConvoHop's push notifications in your Android app with `com.convohop:convohop-android`: register the device with Firebase Cloud Messaging, show message notifications whether or not the project sends message previews, and ring incoming calls.

## Before you start

ConvoHop doesn't send push notifications itself. Your backend receives its notification events and sends FCM requests with your own Firebase credentials, as the [Java and Kotlin push notifications quickstart](../../jvm/quickstarts/push.md) shows. In your app, you need:

- Your Firebase project's `google-services.json` and the Google Services Gradle plugin. Don't commit Firebase configuration to a public repository.
- `com.google.firebase:firebase-messaging` 25.1.2 or later, for example through the Firebase Android BoM 34.18.0 or later, beside the SDK ([install](../index.md#install)).
- An endpoint on your backend that stores each device's registration for the signed-in user. ConvoHop never stores registrations.
- An incoming-call screen, as the [calling quickstart](calling.md#answer-incoming-calls) shows.

The samples on this page use these imports:

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Push.kt#imports
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
```

## Configure notifications

Configure notifications in `Application.onCreate`, because a push can start your process before anything else runs:

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Push.kt#configure
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
```

- `recipientFilter` drops pushes addressed to anyone but the user signed in on this device, so a push sent before a sign-out never shows for the next user.
- `incomingCallIntent` is your incoming-call screen. A ringing call's notification opens it full screen, over the lock screen, when Android allows, and when the user taps the call.
- `messageContent` supplies the text of message notifications when the push carries none, as [message previews](#message-previews) describes.
- Tapping a message or missed-call notification opens your app's launcher activity, with the conversation's ID in `ConvoHopNotifications.EXTRA_CONVERSATION_ID`. Set `conversationIntent` to open another screen.
- Your listener's methods run on the main thread. The same registration can arrive more than once, so store it idempotently.
- On Android 13 and later, request `POST_NOTIFICATIONS` at runtime. `areNotificationsEnabled()` is false until the user grants it.

The notifications' text comes from string resources, such as `convohop_message_fallback`, `convohop_missed_call`, `convohop_answer` and `convohop_decline`, which your app can override and translate.

## Register the device

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Push.kt#application
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
```

`ConvoHopFirebase.register` reports the registration that FCM holds, renewing it only if FCM needs to, so your backend learns it even when Firebase's own callbacks don't fire. Call it whenever your app starts, and again later if it fails, for example offline. With FCM auto-init off, nothing registers until you call it, so you can wait for the user's consent.

Declare the SDK's messaging service in your app's manifest:

```xml
<service
    android:name="com.convohop.android.push.ConvoHopMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

A registration's `toJson()` is `{"kind":"fcm","token":"…"}` by default. If your app's manifest turns on registration by Firebase Installation ID, with the `firebase_messaging_installation_id_enabled` meta-data, it's `{"kind":"fcm","fid":"…"}`. The flag applies to your whole app: Firebase then fails `getToken()` and `deleteToken()` for every library in it, so turn it on only when everything in your app that uses FCM supports installation IDs. With the flag on, `register` and `unregister` throw `IllegalStateException` if your firebase-messaging is older than 25.1.2.

## Use your own messaging service

If your app already has a `FirebaseMessagingService`, declare yours instead of the SDK's, and forward ConvoHop's pushes and registrations to `ConvoHopFirebase`:

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Push.kt#own-service
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
```

`handleMessage` returns false for pushes that aren't ConvoHop's. You can also subclass `ConvoHopMessagingService`: call `super` from every override, and handle your own pushes in `onOtherMessage`.

## Message previews

Message previews are off unless the project turns them on, so a message push usually carries no message text, only the title that your backend gave it, such as the sender's name. `ConvoHopMessageContent` then reads the message with the user's own session, for up to 5 seconds, so its text never passes through FCM. It reads only off the main thread, where FCM delivers pushes. When no client is connected for the push's user, the message was deleted or the read fails, or without `messageContent`, the notification's text is "New message". Without a title in the push, the notification's title is your app's name.

When the push carries text, because the project turned previews on or your backend sent its own, the notification shows the push's title and text without reading the message. To post message notifications yourself, set `showMessages` to false and post them from your listener's `onMessage`.

## Handle pushes from your own code

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Push.kt#handle
/** Hands an FCM data map from your own push code to ConvoHop. Returns false when the push isn't ConvoHop's. */
fun handlePushData(context: Context, data: Map<String, String>): Boolean {
    // Call it off the main thread, as FCM does: only there can it read a message's text for the notification.
    val result = ConvoHopNotifications.getInstance(context).handleNotification(data)
    return result != PushResult.NOT_CONVOHOP
}
```

`handleNotification` checks an FCM data map against the push payload contract, shows its notification or rings its call, and returns what it did:

| `PushResult` | Meaning |
| --- | --- |
| `NOT_CONVOHOP` | Not ConvoHop's push: handle it yourself. |
| `INVALID` | A ConvoHop push that this SDK version can't read. |
| `IGNORED` | A duplicate, a ring that already stopped, or a recipient that your filter rejected. |
| `MESSAGE` | A new message. |
| `RINGING` | A call is ringing. |
| `STOPPED` | A ring stopped because someone answered or declined, maybe on another device. |
| `MISSED` | A ring stopped and nobody answered. |

## Stop notifications at sign-out

When the user signs out, delete the device's registration on your backend, and have `recipientFilter` reject the user's pushes, as the sample's does once `signedInUser` returns null. To unregister the device from FCM too, call `ConvoHopFirebase.unregister(context)`. It deletes the app's token, which every library in your app shares, or unregisters the installation ID, and listeners then get `onUnregistered`. With auto-init on, Firebase registers the device again when your app next starts.

## How the samples are tested

The test configures notifications as the sample does, then delivers pushes built from the vectors of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md) as FCM would, on Robolectric. It checks:

- the registration that your backend receives from your messaging service;
- message notifications with previews off, read through the user's session from the conformance mock, with previews on, and with no client connected;
- that a push for another user shows nothing, and that your own service forwards only ConvoHop's pushes;
- that a call rings with the incoming-call screen, which answering, declining, an answer on another device or a missed call closes, and which closes at once when the ring already stopped.

`ChatApplication` isn't run, because `ConvoHopFirebase.register` needs your Firebase project, and no test reaches FCM itself.

## Next steps

- [Calling quickstart](calling.md#answer-incoming-calls): the incoming-call screen, and joining the calls that users answer.
- [`ConvoHopNotifications` reference](../reference/android-push.md#convohopnotifications-class): handling pushes, ringing calls and listeners.
- [`ConvoHopNotificationOptions` reference](../reference/android-push.md#convohopnotificationoptions-class): the filter, intents and message content.
- [Java and Kotlin push notifications quickstart](../../jvm/quickstarts/push.md): build and send the FCM requests from your backend.
