package com.convohop.android.push

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.firebase.installations.FirebaseInstallations
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.util.concurrent.Executor

/**
 * Connects Firebase Cloud Messaging to [ConvoHopNotifications]. Your app
 * supplies `com.google.firebase:firebase-messaging` 25.1.2 or later (Firebase
 * BoM 34.18.0 or later) and its own `google-services.json`; this library only
 * compiles against it.
 *
 * ConvoHop follows your app's FCM mode. By default FCM registers the device
 * with a registration token, reported as a [PushRegistration.Token]. If your
 * manifest turns on registration by Firebase Installation ID with
 * `<meta-data android:name="firebase_messaging_installation_id_enabled" android:value="true" />`
 * inside `<application>`, ConvoHop registers with
 * `FirebaseMessaging.register()` instead and reports a
 * [PushRegistration.InstallationId]. The flag applies to your whole app:
 * Firebase then fails `getToken()` and `deleteToken()` for every library in
 * it, so turn it on only once everything in your app that uses FCM supports
 * installation IDs.
 *
 * Declare [ConvoHopMessagingService], or forward to [handleMessage],
 * [onNewToken], [onRegistered] and [onUnregistered] from your own messaging
 * service, and call [register] when your app starts.
 */
public object ConvoHopFirebase {
    /** The `<meta-data>` name that turns on FCM registration by Firebase Installation ID. */
    public const val INSTALLATION_ID_ENABLED: String = "firebase_messaging_installation_id_enabled"

    /** The Firebase calls this object makes; tests replace them. */
    internal var registrar: FcmRegistrar = FirebaseRegistrar

    private val direct = Executor { it.run() }

    /** Handles [message] if it is ConvoHop's. False means it isn't: handle it yourself. */
    @JvmStatic
    public fun handleMessage(context: Context, message: RemoteMessage): Boolean {
        val data = message.data
        if (!ConvoHopPush.isConvoHop(data)) return false
        ConvoHopNotifications.getInstance(context).handleNotification(data)
        return true
    }

    /**
     * Whether your manifest turns on registration by Firebase Installation ID.
     * Read as Firebase reads it: a missing or non-boolean value is false.
     */
    @JvmStatic
    public fun usesInstallationId(context: Context): Boolean {
        val packageManager = context.packageManager
        val info: ApplicationInfo = if (Build.VERSION.SDK_INT >= 33) {
            packageManager.getApplicationInfo(
                context.packageName,
                PackageManager.ApplicationInfoFlags.of(PackageManager.GET_META_DATA.toLong()),
            )
        } else {
            @Suppress("DEPRECATION")
            packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        }
        return info.metaData?.getBoolean(INSTALLATION_ID_ENABLED, false) == true
    }

    /**
     * Registers this device with FCM in your app's mode and completes with its
     * registration. Call it when your app starts: it reports the registration
     * FCM holds, renewing it only if FCM needs to, so your backend learns it
     * even when Firebase's own callbacks don't fire, for example because the
     * token hasn't changed. With FCM auto-init off, nothing registers until
     * you call it, so you can wait for the user's consent. When the task
     * succeeds, [ConvoHopNotifications] listeners get
     * [ConvoHopNotificationListener.onRegistered], even if another service
     * handles `com.google.firebase.MESSAGING_EVENT`. If it fails, for example
     * offline, call it again later.
     *
     * @throws IllegalStateException if your manifest turns on installation IDs
     *   but your firebase-messaging predates them. ConvoHop needs 25.1.2 or later.
     */
    @JvmStatic
    public fun register(context: Context): Task<PushRegistration> {
        val notifications = ConvoHopNotifications.getInstance(context)
        val firebase = registrar
        val registration = if (usesInstallationId(context)) registerInstallationId(firebase) else registerToken(firebase)
        return registration.onSuccessTask(direct) { registered ->
            val current = checkNotNull(registered)
            notifications.registered(current)
            Tasks.forResult(current)
        }
    }

    /**
     * Unregisters this device from FCM in your app's mode, for example when the
     * user signs out: deletes its token, or unregisters its installation ID.
     * When the task succeeds, [ConvoHopNotifications] listeners get
     * [ConvoHopNotificationListener.onUnregistered] for the registration this
     * process knew, if any: delete it from your backend. With auto-init on,
     * Firebase registers the device again when your app next starts; turn
     * auto-init off to keep it unregistered.
     *
     * @throws IllegalStateException as [register] does.
     */
    @JvmStatic
    public fun unregister(context: Context): Task<Void> {
        val notifications = ConvoHopNotifications.getInstance(context)
        val firebase = registrar
        // Read first, so a registration that arrives meanwhile isn't reported as removed.
        val known = notifications.registration
        val removed = if (usesInstallationId(context)) fidApi { firebase.unregister() } else firebase.deleteToken()
        return removed.continueWithTask(direct) { task ->
            if (task.isSuccessful && known != null) notifications.unregistered(known)
            task
        }
    }

    /** Reports a new token from `FirebaseMessagingService.onNewToken`. */
    @JvmStatic
    public fun onNewToken(context: Context, token: String) {
        ConvoHopNotifications.getInstance(context).onNewToken(token)
    }

    /** Reports a registration from `FirebaseMessagingService.onRegistered`. */
    @JvmStatic
    public fun onRegistered(context: Context, installationId: String) {
        ConvoHopNotifications.getInstance(context).onRegistered(installationId)
    }

    /** Reports the end of a registration from `FirebaseMessagingService.onUnregistered`. */
    @JvmStatic
    public fun onUnregistered(context: Context, installationId: String) {
        ConvoHopNotifications.getInstance(context).onUnregistered(installationId)
    }

    private fun registerToken(firebase: FcmRegistrar): Task<PushRegistration> =
        firebase.token().onSuccessTask(direct) { token ->
            Tasks.forResult<PushRegistration>(PushRegistration.Token(checkNotNull(token) { "FCM returned no token" }))
        }

    private fun registerInstallationId(firebase: FcmRegistrar): Task<PushRegistration> =
        fidApi { firebase.register() }
            // Registering can replace the installation ID, so read it once FCM has registered.
            .onSuccessTask(direct) { firebase.installationId() }
            .onSuccessTask(direct) { fid ->
                val id = checkNotNull(fid) { "Firebase Installations returned no ID" }
                Tasks.forResult<PushRegistration>(PushRegistration.InstallationId(id))
            }

    /** Firebase before 25.1.0 has no registration by installation ID. */
    private inline fun <T> fidApi(call: () -> T): T = try {
        call()
    } catch (e: NoSuchMethodError) {
        throw IllegalStateException(
            "ConvoHop needs com.google.firebase:firebase-messaging 25.1.2 or later (Firebase BoM 34.18.0 or later) " +
                "to register by Firebase Installation ID",
            e,
        )
    }
}

/** The Firebase calls [ConvoHopFirebase] makes. */
internal interface FcmRegistrar {
    fun token(): Task<String>

    fun deleteToken(): Task<Void>

    fun register(): Task<Void>

    fun unregister(): Task<Void>

    fun installationId(): Task<String>
}

private object FirebaseRegistrar : FcmRegistrar {
    // Firebase deprecated tokens in favour of installation IDs, but tokens stay FCM's default mode.
    @Suppress("DEPRECATION")
    override fun token(): Task<String> = FirebaseMessaging.getInstance().token

    @Suppress("DEPRECATION")
    override fun deleteToken(): Task<Void> = FirebaseMessaging.getInstance().deleteToken()

    override fun register(): Task<Void> = FirebaseMessaging.getInstance().register()

    override fun unregister(): Task<Void> = FirebaseMessaging.getInstance().unregister()

    override fun installationId(): Task<String> = FirebaseInstallations.getInstance().id
}

/**
 * A messaging service that hands ConvoHop pushes and FCM registrations to
 * [ConvoHopNotifications]. Declare it (or a subclass) in your manifest with
 * the `com.google.firebase.MESSAGING_EVENT` intent filter, or call
 * [ConvoHopFirebase] from your own service instead. A subclass that overrides
 * `onMessageReceived`, `onNewToken`, `onRegistered` or `onUnregistered` must
 * call `super`.
 */
public open class ConvoHopMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        if (!ConvoHopFirebase.handleMessage(this, message)) onOtherMessage(message)
    }

    // Firebase deprecated tokens in favour of installation IDs, but tokens stay FCM's default mode.
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onNewToken(token: String) {
        ConvoHopFirebase.onNewToken(this, token)
    }

    override fun onRegistered(installationId: String) {
        ConvoHopFirebase.onRegistered(this, installationId)
    }

    override fun onUnregistered(installationId: String) {
        ConvoHopFirebase.onUnregistered(this, installationId)
    }

    /** A push that isn't ConvoHop's. */
    public open fun onOtherMessage(message: RemoteMessage) {}
}
