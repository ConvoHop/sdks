package com.convohop.android.push

import android.os.Bundle
import com.convohop.android.push.Fixtures.FID
import com.convohop.android.push.Fixtures.TOKEN
import com.convohop.android.push.Fixtures.callData
import com.convohop.android.push.Fixtures.id
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.TaskCompletionSource
import com.google.android.gms.tasks.Tasks
import com.google.firebase.messaging.RemoteMessage
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.io.IOException

/**
 * Hands FCM's messages and registrations to the manager, in the app's FCM
 * mode. Firebase is faked: messages are built as it delivers them, and
 * [FakeFirebase] answers its registration calls.
 */
@RunWith(RobolectricTestRunner::class)
internal class ConvoHopFirebaseTest {
    private val push = PushHarness()
    private val alert = id(100)
    private val firebase = FakeFirebase()
    private val realFirebase = ConvoHopFirebase.registrar

    init {
        ConvoHopFirebase.registrar = firebase
    }

    @After
    fun restoreFirebase() {
        ConvoHopFirebase.registrar = realFirebase
    }

    @Test
    fun handlesOnlyConvoHopMessages() {
        assertFalse(ConvoHopFirebase.handleMessage(push.app, fcm(mapOf("campaign" to "spring"))))
        assertFalse(ConvoHopFirebase.handleMessage(push.app, fcm(emptyMap())))
        assertTrue(ConvoHopFirebase.handleMessage(push.app, fcm(Fixtures.push(callData(id(1), alert)))))
        assertEquals(CallState.RINGING, push.manager.call(alert)?.state)
        assertEquals(listOf("incoming $alert"), push.events())
    }

    @Test
    fun claimsConvoHopMessagesItCannotRead() {
        // Nothing else should show a ConvoHop push, even an event type from a newer server.
        assertTrue(ConvoHopFirebase.handleMessage(push.app, fcm(Fixtures.push("{\"eventType\":\"notification.reaction\"}"))))
        assertTrue(ConvoHopFirebase.handleMessage(push.app, fcm(Fixtures.push("not json"))))
        assertTrue(push.notifications.allNotifications.isEmpty())
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun reportsRegistrationsFromFirebase() {
        assertNull(push.manager.registration)
        ConvoHopFirebase.onNewToken(push.app, TOKEN)
        assertEquals(PushRegistration.Token(TOKEN), push.manager.registration)
        ConvoHopFirebase.onRegistered(push.app, FID)
        assertEquals(PushRegistration.InstallationId(FID), push.manager.registration)
        ConvoHopFirebase.onUnregistered(push.app, FID)
        assertNull(push.manager.registration)
        assertEquals(listOf("registered token $TOKEN", "registered fid $FID", "unregistered fid $FID"), push.events())
        assertEquals(emptyList<String>(), firebase.calls)
    }

    @Test
    @Suppress("DEPRECATION") // Firebase deprecated onNewToken; the service still forwards it.
    fun theMessagingServiceRoutesMessagesAndRegistrations() {
        val service = Robolectric.buildService(RecordingMessagingService::class.java).create().get()
        val campaign = fcm(mapOf("campaign" to "spring"))
        service.onMessageReceived(campaign)
        service.onMessageReceived(fcm(Fixtures.push(callData(id(1), alert))))
        service.onNewToken(TOKEN)
        service.onRegistered(FID)
        service.onUnregistered(FID)
        assertEquals(listOf(campaign), service.others)
        assertEquals(CallState.RINGING, push.manager.call(alert)?.state)
        assertNull(push.manager.registration)
        assertEquals(
            listOf("incoming $alert", "registered token $TOKEN", "registered fid $FID", "unregistered fid $FID"),
            push.events(),
        )
    }

    @Test
    @Config(sdk = [24, 34])
    fun readsTheAppsModeAsFirebaseDoes() {
        assertFalse(ConvoHopFirebase.usesInstallationId(push.app))
        appMetaData { putBoolean(ConvoHopFirebase.INSTALLATION_ID_ENABLED, false) }
        assertFalse(ConvoHopFirebase.usesInstallationId(push.app))
        // Firebase reads the value as a boolean, so anything else leaves tokens on.
        appMetaData { putString(ConvoHopFirebase.INSTALLATION_ID_ENABLED, "true") }
        assertFalse(ConvoHopFirebase.usesInstallationId(push.app))
        appMetaData { putBoolean(ConvoHopFirebase.INSTALLATION_ID_ENABLED, true) }
        assertTrue(ConvoHopFirebase.usesInstallationId(push.app))
    }

    @Test
    fun registersByTokenByDefault() {
        val registered = ConvoHopFirebase.register(push.app)
        assertEquals(PushRegistration.Token(TOKEN), registered.result)
        assertEquals(PushRegistration.Token(TOKEN), push.manager.registration)
        assertEquals(listOf("token"), firebase.calls)
        assertEquals(listOf("registered token $TOKEN"), push.events())
    }

    @Test
    fun registersByInstallationIdWhenTheAppTurnsItOn() {
        useInstallationIds()
        // Registering can replace the ID (FCM's FID_ALREADY_USED), so ConvoHop reads it afterwards.
        firebase.fid = STALE_FID
        firebase.onRegister = {
            firebase.fid = FID
            FakeFirebase.done()
        }
        val registered = ConvoHopFirebase.register(push.app)
        assertEquals(PushRegistration.InstallationId(FID), registered.result)
        assertEquals(PushRegistration.InstallationId(FID), push.manager.registration)
        assertEquals(listOf("register", "installationId"), firebase.calls)
        assertEquals(listOf("registered fid $FID"), push.events())
    }

    @Test
    fun failsWithFirebasesErrorAndReportsNothing() {
        val offline = IOException("SERVICE_NOT_AVAILABLE")
        firebase.onToken = { Tasks.forException(offline) }
        assertSame(offline, ConvoHopFirebase.register(push.app).exception)
        useInstallationIds()
        firebase.onRegister = { Tasks.forException(offline) }
        assertSame(offline, ConvoHopFirebase.register(push.app).exception)
        // ConvoHop reads the installation ID only once FCM has registered it.
        assertEquals(listOf("token", "register"), firebase.calls)
        assertNull(push.manager.registration)
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun explainsAFirebaseTooOldForInstallationIds() {
        useInstallationIds()
        firebase.onRegister = { throw NoSuchMethodError("FirebaseMessaging.register") }
        firebase.onUnregister = { throw NoSuchMethodError("FirebaseMessaging.unregister") }
        val calls = listOf<() -> Unit>({ ConvoHopFirebase.register(push.app) }, { ConvoHopFirebase.unregister(push.app) })
        for (call in calls) {
            val error = assertThrows(IllegalStateException::class.java) { call() }
            assertTrue(error.message, error.message.orEmpty().contains("firebase-messaging 25.1.2 or later"))
            assertTrue(error.cause is NoSuchMethodError)
        }
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun unregistersByDeletingTheToken() {
        ConvoHopFirebase.onNewToken(push.app, TOKEN)
        assertTrue(ConvoHopFirebase.unregister(push.app).isSuccessful)
        assertNull(push.manager.registration)
        assertEquals(listOf("deleteToken"), firebase.calls)
        assertEquals(listOf("registered token $TOKEN", "unregistered token $TOKEN"), push.events())
    }

    @Test
    fun unregistersTheInstallationIdWhenTheAppTurnsItOn() {
        useInstallationIds()
        ConvoHopFirebase.onRegistered(push.app, FID)
        assertTrue(ConvoHopFirebase.unregister(push.app).isSuccessful)
        assertNull(push.manager.registration)
        assertEquals(listOf("unregister"), firebase.calls)
        assertEquals(listOf("registered fid $FID", "unregistered fid $FID"), push.events())
    }

    @Test
    fun unregistersQuietlyWhenItKnowsNoRegistration() {
        assertTrue(ConvoHopFirebase.unregister(push.app).isSuccessful)
        assertEquals(listOf("deleteToken"), firebase.calls)
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun keepsTheRegistrationWhenUnregisteringFails() {
        val offline = IOException("SERVICE_NOT_AVAILABLE")
        firebase.onDeleteToken = { Tasks.forException(offline) }
        ConvoHopFirebase.onNewToken(push.app, TOKEN)
        assertSame(offline, ConvoHopFirebase.unregister(push.app).exception)
        assertEquals(PushRegistration.Token(TOKEN), push.manager.registration)
        assertEquals(listOf("registered token $TOKEN"), push.events())
    }

    @Test
    fun keepsARegistrationThatArrivesWhileUnregistering() {
        val deleted = TaskCompletionSource<Void>()
        firebase.onDeleteToken = { deleted.task }
        val renewed = TOKEN.reversed()
        ConvoHopFirebase.onNewToken(push.app, TOKEN)
        val unregistering = ConvoHopFirebase.unregister(push.app)
        ConvoHopFirebase.onNewToken(push.app, renewed)
        deleted.setResult(null)
        assertTrue(unregistering.isSuccessful)
        assertEquals(PushRegistration.Token(renewed), push.manager.registration)
        assertEquals(
            listOf("registered token $TOKEN", "registered token $renewed", "unregistered token $TOKEN"),
            push.events(),
        )
    }

    /** Turns on registration by installation ID, as an app's manifest does. */
    private fun useInstallationIds() {
        appMetaData { putBoolean(ConvoHopFirebase.INSTALLATION_ID_ENABLED, true) }
    }

    /** Replaces the app's `<application>` meta-data. */
    private fun appMetaData(values: Bundle.() -> Unit) {
        val info = shadowOf(push.app.packageManager).getInternalMutablePackageInfo(push.app.packageName)
        checkNotNull(info.applicationInfo).metaData = Bundle().apply(values)
    }

    /** A data message as FCM delivers it to `onMessageReceived`. */
    private fun fcm(data: Map<String, String>): RemoteMessage {
        val bundle = Bundle()
        bundle.putString("from", "1234567890")
        bundle.putString("google.message_id", "0:1791633600000000%31bd1c9631bd1c96")
        data.forEach { (key, value) -> bundle.putString(key, value) }
        return RemoteMessage(bundle)
    }

    private companion object {
        const val STALE_FID: String = "cX9wq3uLRn6m0Xb8YzA1cD"
    }
}

/** Records the messages [ConvoHopMessagingService] passes on. */
internal class RecordingMessagingService : ConvoHopMessagingService() {
    val others: MutableList<RemoteMessage> = mutableListOf()

    override fun onOtherMessage(message: RemoteMessage) {
        others += message
    }
}

/** Answers [ConvoHopFirebase]'s Firebase calls as a test sets them up, and records them. */
internal class FakeFirebase : FcmRegistrar {
    val calls: MutableList<String> = mutableListOf()
    var fid: String = FID
    var onToken: () -> Task<String> = { Tasks.forResult(TOKEN) }
    var onDeleteToken: () -> Task<Void> = { done() }
    var onRegister: () -> Task<Void> = { done() }
    var onUnregister: () -> Task<Void> = { done() }

    override fun token(): Task<String> = record("token", onToken)

    override fun deleteToken(): Task<Void> = record("deleteToken", onDeleteToken)

    override fun register(): Task<Void> = record("register", onRegister)

    override fun unregister(): Task<Void> = record("unregister", onUnregister)

    override fun installationId(): Task<String> = record("installationId") { Tasks.forResult(fid) }

    private fun <T> record(call: String, answer: () -> Task<T>): Task<T> {
        calls += call
        return answer()
    }

    companion object {
        /** A successful `Task<Void>`, as Firebase completes one. */
        fun done(): Task<Void> = Tasks.forResult(null)
    }
}
