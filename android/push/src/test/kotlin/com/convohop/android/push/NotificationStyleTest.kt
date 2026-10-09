package com.convohop.android.push

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.provider.Settings
import androidx.core.app.NotificationCompat
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_ACTION
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_ALERT_ID
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_CONVERSATION_ID
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_LIVE_SESSION_ID
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_MESSAGE_ID
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_VIDEO
import com.convohop.android.push.Fixtures.CONVERSATION
import com.convohop.android.push.Fixtures.LIVE_SESSION
import com.convohop.android.push.Fixtures.MESSAGE
import com.convohop.android.push.Fixtures.callData
import com.convohop.android.push.Fixtures.cancelData
import com.convohop.android.push.Fixtures.id
import com.convohop.android.push.Fixtures.messageData
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/** How notifications look on each Android version, and which screens they open. */
@RunWith(RobolectricTestRunner::class)
internal class NotificationStyleTest {
    private val push = PushHarness()
    private val manager = push.manager
    private val alert = id(100)

    @Test
    @Config(sdk = [24])
    fun ringsWithTheCompatCallStyleBeforeAndroid12() {
        push.handle(callData(id(1), alert, title = "Ada", body = "Design review"))
        val ring = push.notification(alert)
        assertEquals("Ada", ring.title)
        assertEquals("Design review", ring.text)
        assertCallStyle(ring, video = true)
        assertEquals(ring.contentIntent, ring.fullScreenIntent)
        assertTrue(shadowOf(ring.fullScreenIntent).isActivity)
        assertTrue(manager.canUseFullScreenIntent())
        val settings = manager.fullScreenIntentSettings()
        assertEquals(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, settings.action)
        assertEquals(Uri.fromParts("package", push.app.packageName, null), settings.data)
        assertTrue(settings.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0)
    }

    @Test
    @Config(sdk = [24, 34])
    fun namesTheKindOfCallWhenThePushHasNoText() {
        push.handle(callData(id(1), alert))
        assertEquals(push.label, push.notification(alert).title)
        assertEquals("Incoming video call", push.notification(alert).text)
        val voice = id(101)
        push.handle(callData(id(2), voice, mediaProfile = "AUDIO_ONLY"))
        assertEquals("Incoming call", push.notification(voice).text)
        assertCallStyle(push.notification(voice), video = false)
    }

    @Test
    @Config(sdk = [26])
    fun postsToItsOwnChannels() {
        push.handle(callData(id(1), alert))
        assertEquals(CallNotifier.CHANNEL_CALLS, push.notification(alert).channelId)
        val missed = id(101)
        push.handle(cancelData(id(2), missed, "ended"))
        assertEquals(CallNotifier.CHANNEL_MISSED_CALLS, push.notification(missed).channelId)
        push.handle(messageData(id(3), body = "Hi"))
        assertEquals(CallNotifier.CHANNEL_MESSAGES, push.notification(CONVERSATION).channelId)

        val system = push.app.getSystemService(NotificationManager::class.java)
        val calls = system.getNotificationChannel(CallNotifier.CHANNEL_CALLS)
        assertEquals("Incoming calls", calls.name.toString())
        assertEquals(NotificationManager.IMPORTANCE_HIGH, calls.importance)
        assertEquals(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), calls.sound)
        assertEquals(AudioAttributes.USAGE_NOTIFICATION_RINGTONE, calls.audioAttributes.usage)
        assertTrue(calls.shouldVibrate())
        val missedCalls = system.getNotificationChannel(CallNotifier.CHANNEL_MISSED_CALLS)
        assertEquals("Missed calls", missedCalls.name.toString())
        assertEquals(NotificationManager.IMPORTANCE_DEFAULT, missedCalls.importance)
        val messages = system.getNotificationChannel(CallNotifier.CHANNEL_MESSAGES)
        assertEquals("Messages", messages.name.toString())
        assertEquals(NotificationManager.IMPORTANCE_HIGH, messages.importance)

        val settings = manager.fullScreenIntentSettings()
        assertEquals(Settings.ACTION_APP_NOTIFICATION_SETTINGS, settings.action)
        assertEquals(push.app.packageName, settings.getStringExtra(Settings.EXTRA_APP_PACKAGE))
    }

    @Test
    @Config(sdk = [33])
    fun usesPlainActionsUntilTheAppMayTakeTheFullScreen() {
        assertFalse(manager.canUseFullScreenIntent())
        push.handle(callData(id(1), alert))
        val ring = push.notification(alert)
        assertPlainActions(ring)
        assertEquals(ring.contentIntent, ring.fullScreenIntent)

        shadowOf(push.app).grantPermissions(Manifest.permission.USE_FULL_SCREEN_INTENT)
        assertTrue(manager.canUseFullScreenIntent())
        val other = id(101)
        push.handle(callData(id(2), other))
        assertCallStyle(push.notification(other), video = true)
    }

    @Test
    fun ringsOnTheFullScreenUntilTheDeadline() {
        push.handle(callData(id(1), alert, mediaProfile = "AUDIO_ONLY"))
        val ring = push.notification(alert)
        assertCallStyle(ring, video = false)
        assertEquals(push.label, ring.title)
        assertEquals("Incoming call", ring.text)
        assertEquals(Notification.CATEGORY_CALL, ring.category)
        assertEquals(30_000L, ring.timeoutAfter)
        assertTrue(ring.flags and Notification.FLAG_ONGOING_EVENT != 0)
        assertTrue(ring.flags and Notification.FLAG_INSISTENT != 0)
        assertEquals(ring.contentIntent, ring.fullScreenIntent)

        val incoming = shadowOf(ring.fullScreenIntent)
        assertTrue(incoming.isActivity)
        val intent = incoming.savedIntent
        assertEquals(PushHarness.INCOMING, intent.action)
        assertEquals(ConvoHopNotifications.ACTION_INCOMING_CALL, intent.getStringExtra(EXTRA_ACTION))
        assertEquals(alert, intent.getStringExtra(EXTRA_ALERT_ID))
        assertEquals(LIVE_SESSION, intent.getStringExtra(EXTRA_LIVE_SESSION_ID))
        assertEquals(CONVERSATION, intent.getStringExtra(EXTRA_CONVERSATION_ID))
        assertFalse(intent.getBooleanExtra(EXTRA_VIDEO, true))
        assertTrue(intent.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0)

        val settings = manager.fullScreenIntentSettings()
        assertEquals(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, settings.action)
        assertEquals(Uri.fromParts("package", push.app.packageName, null), settings.data)
    }

    @Test
    fun withoutAScreenToOpenNotificationsStillAct() {
        push.options.apply {
            incomingCallIntent = null
            answeredCallIntent = null
            conversationIntent = null
        }
        push.handle(callData(id(1), alert))
        val ring = push.notification(alert)
        assertNull(ring.contentIntent)
        assertNull(ring.fullScreenIntent)
        assertPlainActions(ring)
        Robolectric.buildActivity(ConvoHopAnswerActivity::class.java, shadowOf(ring.actions[1].actionIntent).savedIntent).create()
        assertNull(push.startedActivity())
        assertEquals(CallState.ACTIVE, manager.call(alert)?.state)

        val missed = id(101)
        push.handle(cancelData(id(2), missed, "ended"))
        assertNull(push.notification(missed).contentIntent)
        push.handle(messageData(id(3), body = "Hi"))
        assertNull(push.notification(CONVERSATION).contentIntent)
    }

    @Test
    fun opensTheLaunchActivityByDefault() {
        val launcher = ComponentName(push.app, "com.example.MainActivity")
        val packages = shadowOf(push.app.packageManager)
        packages.addActivityIfNotPresent(launcher)
        packages.addIntentFilterForActivity(launcher, IntentFilter(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) })
        push.options.apply {
            incomingCallIntent = null
            answeredCallIntent = null
            conversationIntent = null
        }

        push.handle(callData(id(1), alert))
        val ring = push.notification(alert)
        val incoming = shadowOf(ring.fullScreenIntent).savedIntent
        assertEquals(launcher, incoming.component)
        assertTrue(incoming.flags and Intent.FLAG_ACTIVITY_SINGLE_TOP != 0)
        assertEquals(ConvoHopNotifications.ACTION_INCOMING_CALL, incoming.getStringExtra(EXTRA_ACTION))
        assertEquals(alert, incoming.getStringExtra(EXTRA_ALERT_ID))

        val answer = shadowOf(ring.callIntent(NotificationCompat.EXTRA_ANSWER_INTENT)).savedIntent
        Robolectric.buildActivity(ConvoHopAnswerActivity::class.java, answer).create()
        val answered = checkNotNull(push.startedActivity())
        assertEquals(launcher, answered.component)
        assertEquals(ConvoHopNotifications.ACTION_ANSWERED_CALL, answered.getStringExtra(EXTRA_ACTION))

        push.handle(messageData(id(2), body = "Hi"))
        val open = shadowOf(push.notification(CONVERSATION).contentIntent).savedIntent
        assertEquals(launcher, open.component)
        assertEquals(ConvoHopNotifications.ACTION_MESSAGE, open.getStringExtra(EXTRA_ACTION))
        assertEquals(CONVERSATION, open.getStringExtra(EXTRA_CONVERSATION_ID))
        assertEquals(MESSAGE, open.getStringExtra(EXTRA_MESSAGE_ID))
    }

    @Test
    fun usesTheConfiguredIconAndColor() {
        val color = 0xFF2266AA.toInt()
        push.options.smallIcon = android.R.drawable.star_on
        push.options.color = color
        val missed = id(101)
        push.handle(callData(id(1), alert))
        push.handle(cancelData(id(2), missed, "ended"))
        push.handle(messageData(id(3), body = "Hi"))
        for (tag in listOf(alert, missed, CONVERSATION)) {
            val posted = push.notification(tag)
            assertEquals(tag, android.R.drawable.star_on, posted.smallIcon.resId)
            assertEquals(tag, color, posted.color)
        }
    }

    @Test
    fun fallsBackToTheAppIconThenToSystemIcons() {
        push.app.applicationInfo.icon = 0
        val missed = id(101)
        push.handle(callData(id(1), alert))
        push.handle(cancelData(id(2), missed, "ended"))
        push.handle(messageData(id(3), body = "Hi"))
        assertEquals(android.R.drawable.sym_call_incoming, push.notification(alert).smallIcon.resId)
        assertEquals(android.R.drawable.sym_call_missed, push.notification(missed).smallIcon.resId)
        assertEquals(android.R.drawable.sym_action_chat, push.notification(CONVERSATION).smallIcon.resId)

        push.app.applicationInfo.icon = android.R.drawable.star_off
        val next = id(102)
        push.handle(callData(id(4), next))
        assertEquals(android.R.drawable.star_off, push.notification(next).smallIcon.resId)
    }

    @Test
    fun reportsWhetherNotificationsAreEnabled() {
        assertTrue(manager.areNotificationsEnabled())
        push.notifications.setNotificationsEnabled(false)
        assertFalse(manager.areNotificationsEnabled())
    }

    private fun assertCallStyle(ring: Notification, video: Boolean) {
        assertEquals(NotificationCompat.CallStyle.CALL_TYPE_INCOMING, ring.extras.getInt(NotificationCompat.EXTRA_CALL_TYPE))
        assertEquals(video, ring.extras.getBoolean(NotificationCompat.EXTRA_CALL_IS_VIDEO))
        val answer = ring.callIntent(NotificationCompat.EXTRA_ANSWER_INTENT)
        val decline = ring.callIntent(NotificationCompat.EXTRA_DECLINE_INTENT)
        assertTrue(shadowOf(answer).isActivity)
        assertTrue(shadowOf(decline).isBroadcast)
        assertEquals(listOf(decline, answer), ring.actions.map { it.actionIntent })
    }

    private fun assertPlainActions(ring: Notification) {
        assertFalse(ring.extras.containsKey(NotificationCompat.EXTRA_CALL_TYPE))
        assertEquals(listOf("Decline", "Answer"), ring.actions.map { it.title.toString() })
        assertTrue(shadowOf(ring.actions[0].actionIntent).isBroadcast)
        assertTrue(shadowOf(ring.actions[1].actionIntent).isActivity)
    }
}
