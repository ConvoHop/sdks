package com.convohop.reactnative

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.convohop.android.push.ConvoHopFirebase
import com.convohop.android.push.ConvoHopPush
import com.convohop.android.push.PushNotification
import com.convohop.android.push.PushRegistration
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.google.android.gms.tasks.Task
import com.google.firebase.FirebaseApp
import org.json.JSONException
import org.json.JSONObject
import java.util.concurrent.Executor
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/**
 * `ConvoHopPush` on Android: FCM registration through `ConvoHopFirebase`, and notifications through
 * `ConvoHopNotifications`. Its permission and opened-notification state is only touched on the main thread.
 */
internal class ConvoHopPushModule(context: ReactApplicationContext) :
    NativeConvoHopPushSpec(context),
    CallHub.Sink,
    ActivityEventListener,
    LifecycleEventListener {
    private val process = ConvoHopProcess.get(context)
    private val notifications = process.notifications
    private val permissionState = context.getSharedPreferences(PERMISSION_FILE, Context.MODE_PRIVATE)

    // Handling a push can block while the app's MessageContentProvider fetches text.
    private val worker: ExecutorService = Executors.newSingleThreadExecutor { task ->
        Thread(task, "ConvoHopPush").apply { isDaemon = true }
    }

    @Volatile
    private var invalidated = false

    private val permissionRequests = ArrayList<Promise>()
    private val permissionListener = PermissionListener { requestCode, _, _ ->
        if (requestCode != PERMISSION_REQUEST) return@PermissionListener false
        permissionState.edit().putBoolean(ASKED, true).apply()
        settlePermissionRequests()
        true
    }

    // takeInitialNotification calls waiting for an activity.
    private val initialRequests = ArrayList<Promise>()

    // An opened notification JavaScript hasn't taken, while takeInitialNotification hasn't resolved yet.
    private var held: String? = null
    private var initialTaken = false
    private var resumed = false

    init {
        process.hub.add(this)
        context.addActivityEventListener(this)
        context.addLifecycleEventListener(this)
    }

    override fun invalidate() {
        invalidated = true
        process.hub.remove(this)
        reactApplicationContext.removeActivityEventListener(this)
        reactApplicationContext.removeLifecycleEventListener(this)
        worker.shutdown()
        UiThreadUtil.runOnUiThread {
            permissionRequests.clear()
            initialRequests.clear()
        }
        super.invalidate()
    }

    override fun getPermissionStatus(promise: Promise) {
        promise.resolve(permissionStatus())
    }

    override fun requestPermission(request: ReadableMap, promise: Promise) {
        if (Build.VERSION.SDK_INT < 33) {
            promise.resolve(permissionStatus())
            return
        }
        UiThreadUtil.runOnUiThread {
            if (invalidated) return@runOnUiThread
            if (reactApplicationContext.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                promise.resolve(permissionStatus())
                return@runOnUiThread
            }
            val activity = reactApplicationContext.currentActivity as? PermissionAwareActivity
            if (activity == null) {
                promise.reject(Contract.E_NO_ACTIVITY, "requestPermission needs a React Native activity in the foreground")
                return@runOnUiThread
            }
            permissionRequests.add(promise)
            // Concurrent requests share one system prompt.
            if (permissionRequests.size == 1) {
                activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), PERMISSION_REQUEST, permissionListener)
            }
        }
    }

    override fun register(promise: Promise) {
        if (!configured(promise) || !firebaseReady(promise)) return
        val task = try {
            ConvoHopFirebase.register(reactApplicationContext)
        } catch (e: IllegalStateException) {
            promise.reject(Contract.E_REGISTRATION, e.message ?: "FCM registration failed")
            return
        }
        // The registration arrives through onPushRegistration, from the push SDK's listener.
        settle(task, promise, "FCM registration failed") { null }
    }

    override fun unregister(promise: Promise) {
        if (!firebaseReady(promise)) return
        val known = notifications.registration?.toMap()
        val task = try {
            ConvoHopFirebase.unregister(reactApplicationContext)
        } catch (e: IllegalStateException) {
            promise.reject(Contract.E_REGISTRATION, e.message ?: "FCM unregistration failed")
            return
        }
        settle(task, promise, "FCM unregistration failed") { known?.let { Arguments.makeNativeMap(it) } }
    }

    override fun setRecipient(recipient: ReadableMap?, promise: Promise) {
        if (recipient == null) {
            if (process.recipients.set(null)) promise.resolve(null) else promise.reject(Contract.E_STORAGE, "Couldn't clear the push recipient")
            return
        }
        if (!configured(promise)) return
        val projectId = recipient.stringOrNull("projectId")
        val recipientId = recipient.stringOrNull("recipientId")
        if (projectId == null || recipientId == null || !Contract.isId(projectId) || !Contract.isId(recipientId)) {
            promise.reject(Contract.E_INVALID_ARGUMENT, "projectId and recipientId must be lowercase, non-nil UUIDs")
            return
        }
        if (process.recipients.set(Recipient(projectId, recipientId))) {
            promise.resolve(null)
        } else {
            promise.reject(Contract.E_STORAGE, "Couldn't store the push recipient")
        }
    }

    override fun getRegistrations(promise: Promise) {
        promise.resolve(Arguments.makeNativeArray(listOfNotNull(notifications.registration?.toMap())))
    }

    override fun takeInitialNotification(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            if (invalidated) return@runOnUiThread
            when {
                initialTaken -> promise.resolve(null)
                held != null -> resolveInitial(promise, held)
                resumed -> resolveInitial(promise, null)
                else -> {
                    val activity = reactApplicationContext.currentActivity
                    if (activity == null) initialRequests.add(promise) else resolveInitial(promise, take(activity.intent))
                }
            }
        }
    }

    override fun handleRemoteMessage(dataJson: String, promise: Promise) {
        if (!configured(promise)) return
        val data = stringMap(dataJson)
        if (data == null) {
            promise.reject(Contract.E_INVALID_ARGUMENT, "dataJson must be a JSON object of strings")
            return
        }
        try {
            worker.execute {
                val result = try {
                    notifications.handleNotification(data)
                } catch (e: RuntimeException) {
                    promise.reject(Contract.E_PUSH_HANDLER, "The ConvoHop push handler failed")
                    return@execute
                }
                promise.resolve(Contract.result(result))
            }
        } catch (e: RejectedExecutionException) {
            promise.reject(Contract.E_PUSH_HANDLER, "The ConvoHop push module is shutting down")
        }
    }

    override fun onRegistration(registration: PushRegistration) {
        if (canEmit()) emitOnPushRegistration(Arguments.makeNativeMap(registration.toMap()))
    }

    override fun onUnregistration(registration: PushRegistration) {
        if (canEmit()) emitOnPushUnregistration(Arguments.makeNativeMap(registration.toMap()))
    }

    override fun onMessage(message: PushNotification.Message) {
        if (canEmit()) emitOnNotification(notification(RECEIVED, PushPayloads.data(PushPayloads.event(message))))
    }

    override fun onNewIntent(intent: Intent) {
        take(intent)?.let(::opened)
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {}

    override fun onHostResume() {
        resumed = true
        take(reactApplicationContext.currentActivity?.intent)?.let(::opened)
        if (initialRequests.isNotEmpty()) {
            val waiting = ArrayList(initialRequests)
            initialRequests.clear()
            resolveInitial(waiting.first(), held)
            for (promise in waiting.drop(1)) promise.resolve(null)
        }
        // Another library may have replaced the activity's single permission listener. React Native delivers the
        // permission result after this callback, so this runs after it.
        if (permissionRequests.isNotEmpty()) UiThreadUtil.runOnUiThread { settlePermissionRequests() }
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {
        settlePermissionRequests()
    }

    private fun permissionStatus(): String {
        val enabled = notifications.areNotificationsEnabled()
        if (Build.VERSION.SDK_INT < 33 ||
            reactApplicationContext.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        ) {
            return if (enabled) GRANTED else DENIED
        }
        val activity = reactApplicationContext.currentActivity
        val asked = permissionState.getBoolean(ASKED, false) ||
            activity?.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) == true
        return if (asked) DENIED else UNDETERMINED
    }

    private fun settlePermissionRequests() {
        if (permissionRequests.isEmpty()) return
        val status = permissionStatus()
        val waiting = ArrayList(permissionRequests)
        permissionRequests.clear()
        for (promise in waiting) promise.resolve(status)
    }

    private fun resolveInitial(promise: Promise, payload: String?) {
        initialTaken = true
        held = null
        promise.resolve(payload?.let { notification(OPENED, it) })
    }

    /** Hands [payload] to takeInitialNotification until it resolved, then to onNotification. */
    private fun opened(payload: String) {
        if (!initialTaken) {
            held = payload
        } else if (canEmit()) {
            emitOnNotification(notification(OPENED, payload))
        }
    }

    /**
     * The ConvoHop push [intent] opened, as FCM data, once: it removes it from the intent. Null unless this app signed
     * it, it's for the stored recipient, and the intent didn't come from the recent apps.
     */
    private fun take(intent: Intent?): String? {
        if (intent == null) return null
        val payload: String?
        val signature: String?
        try {
            payload = intent.getStringExtra(SignedConversationIntent.EXTRA_PAYLOAD)
            signature = intent.getStringExtra(SignedConversationIntent.EXTRA_SIGNATURE)
            if (payload == null && signature == null) return null
            intent.removeExtra(SignedConversationIntent.EXTRA_PAYLOAD)
            intent.removeExtra(SignedConversationIntent.EXTRA_SIGNATURE)
        } catch (e: RuntimeException) {
            // Another app can start the activity with extras that don't unparcel.
            return null
        }
        if (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0) return null
        if (payload == null || signature == null || !process.signer.verify(payload, signature)) return null
        val notification = ConvoHopPush.parseData(payload) ?: return null
        val recipient = process.recipients.get() ?: return null
        if (notification.projectId != recipient.projectId || notification.recipientId != recipient.recipientId) return null
        if (notifications.options.recipientFilter?.accepts(notification.recipientId) == false) return null
        return PushPayloads.data(payload)
    }

    private fun canEmit(): Boolean = !invalidated && mEventEmitterCallback != null

    private fun notification(action: String, payload: String): WritableMap = Arguments.createMap().apply {
        putString("action", action)
        putString("payload", payload)
    }

    private fun configured(promise: Promise): Boolean {
        if (process.configured) return true
        promise.reject(Contract.E_NOT_CONFIGURED, "Call ConvoHopReactNative.configure in Application.onCreate")
        return false
    }

    private fun firebaseReady(promise: Promise): Boolean {
        if (FirebaseApp.getApps(reactApplicationContext).isNotEmpty()) return true
        promise.reject(Contract.E_FIREBASE_NOT_INITIALIZED, "Firebase isn't initialized: add google-services.json or call FirebaseApp.initializeApp")
        return false
    }

    /** Resolves [promise] with [value] when [task] succeeds, or rejects it with the FCM error code, and no detail. */
    private fun <T> settle(task: Task<T>, promise: Promise, failure: String, value: () -> Any?) {
        task.addOnCompleteListener(DIRECT) { done ->
            if (done.isSuccessful) {
                promise.resolve(value())
            } else {
                val code = Contract.fcmErrorCode(done.exception)
                if (code == null) promise.reject(Contract.E_REGISTRATION, failure) else promise.reject(code, "$failure: $code")
            }
        }
    }

    /** [json] as a map of strings, or null if it is anything else. */
    private fun stringMap(json: String): Map<String, String>? {
        try {
            val source = JSONObject(json)
            val data = HashMap<String, String>()
            for (key in source.keys()) data[key] = source.get(key) as? String ?: return null
            return data
        } catch (e: JSONException) {
            return null
        }
    }

    private companion object {
        const val PERMISSION_FILE = "com.convohop.reactnative.permission"
        const val ASKED = "asked"
        const val PERMISSION_REQUEST = 0x434f

        const val GRANTED = "granted"
        const val DENIED = "denied"
        const val UNDETERMINED = "undetermined"
        const val RECEIVED = "received"
        const val OPENED = "opened"

        val DIRECT = Executor { it.run() }
    }
}
