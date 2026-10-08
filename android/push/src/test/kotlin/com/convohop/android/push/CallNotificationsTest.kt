package com.convohop.android.push

import android.app.Notification
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_ACTION
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_ALERT_ID
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_CONVERSATION_ID
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_DATA
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_LIVE_SESSION_ID
import com.convohop.android.push.ConvoHopNotifications.Companion.EXTRA_VIDEO
import com.convohop.android.push.Fixtures.CONVERSATION
import com.convohop.android.push.Fixtures.LIVE_SESSION
import com.convohop.android.push.Fixtures.NOW
import com.convohop.android.push.Fixtures.callData
import com.convohop.android.push.Fixtures.cancelData
import com.convohop.android.push.Fixtures.id
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

/** Rings, their cancellation and expiry, and the incoming-call notification's own actions. */
@RunWith(RobolectricTestRunner::class)
internal class CallNotificationsTest {
    private val push = PushHarness()
    private val manager = push.manager
    private val alert = id(100)

    @Test
    fun ringsUntilTheDeadlineThenShowsAMissedCall() {
        assertEquals(PushResult.RINGING, push.handle(callData(id(1), alert, title = "Ada")))
        assertEquals("Ada", push.notification(alert).title)
        assertEquals(CallState.RINGING, manager.call(alert)?.state)
        assertEquals(listOf("incoming $alert"), push.events())

        push.advance(29_999)
        assertEquals(CallState.RINGING, manager.call(alert)?.state)
        assertEquals(emptyList<String>(), push.events())
        push.advance(1)
        assertEquals(listOf("ended $alert EXPIRED null"), push.events())
        val missed = push.notification(alert)
        assertEquals(CallNotifier.CHANNEL_MISSED_CALLS, missed.channelId)
        assertEquals(Notification.CATEGORY_MISSED_CALL, missed.category)
        assertEquals("Missed call", missed.title)
        assertEquals("Ada", missed.text)
        assertEquals(NOW - 1_000, missed.`when`)
        assertTrue(missed.flags and Notification.FLAG_AUTO_CANCEL != 0)
        val open = shadowOf(missed.contentIntent).savedIntent
        assertEquals(PushHarness.OPEN_CONVERSATION, open.action)
        assertEquals(ConvoHopNotifications.ACTION_MISSED_CALL, open.getStringExtra(EXTRA_ACTION))
        assertEquals(alert, open.getStringExtra(EXTRA_ALERT_ID))
        assertEquals(LIVE_SESSION, open.getStringExtra(EXTRA_LIVE_SESSION_ID))
        assertEquals(CONVERSATION, open.getStringExtra(EXTRA_CONVERSATION_ID))

        // The server's own expiry arrives later; the missed call is already showing.
        assertEquals(PushResult.IGNORED, push.handle(cancelData(id(2), alert, "expired")))
        assertEquals("Missed call", push.notification(alert).title)
        assertEquals(CallEndReason.EXPIRED, manager.call(alert)?.endReason)
        push.advance(59_999)
        assertEquals(CallState.ENDED, manager.call(alert)?.state)
        push.advance(1)
        assertNull(manager.call(alert))
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun anAnsweredCallLastsUntilItEnds() {
        push.handle(callData(id(1), alert))
        assertTrue(manager.answer(alert))
        assertNull(push.posted(alert))
        assertEquals(CallState.ACTIVE, manager.call(alert)?.state)
        assertEquals(listOf("incoming $alert", "answered $alert"), push.events())

        // The server cancels the ring on the caller's other devices; this call goes on.
        assertEquals(PushResult.IGNORED, push.handle(cancelData(id(2), alert, "answered")))
        assertEquals(PushResult.IGNORED, push.handle(cancelData(id(3), alert, "ended")))
        push.advance(30_000)
        assertNull(push.posted(alert))
        assertEquals(CallState.ACTIVE, manager.call(alert)?.state)
        assertFalse(manager.answer(alert))

        assertTrue(manager.setOnHold(alert, true))
        assertTrue(manager.setOnHold(alert, true))
        assertEquals(CallState.HELD, manager.call(alert)?.state)
        assertTrue(manager.setOnHold(alert, false))
        assertEquals(listOf("hold $alert true", "hold $alert false"), push.events())
        assertFalse(manager.reject(alert))
        assertFalse(manager.setAudioRoute(alert, AudioRoute.SPEAKER))
        assertFalse(manager.forget(alert))

        assertTrue(manager.end(alert))
        assertEquals(CallEndReason.HUNG_UP, manager.call(alert)?.endReason)
        assertEquals(listOf("ended $alert HUNG_UP null"), push.events())
        assertFalse(manager.end(alert))
        assertFalse(manager.setOnHold(alert, true))
        assertTrue(manager.forget(alert))
        assertNull(manager.call(alert))
        assertEquals(emptyList<CallInfo>(), manager.calls())
    }

    @Test
    fun aDeclinedCallNeverRingsAgain() {
        push.handle(callData(id(1), alert))
        assertTrue(manager.reject(alert))
        assertNull(push.posted(alert))
        assertEquals(listOf("incoming $alert", "ended $alert REJECTED null"), push.events())
        assertFalse(manager.reject(alert))
        assertFalse(manager.answer(alert))

        // FCM redelivers the ring, the server repeats it, and this process forgets the call.
        assertEquals(PushResult.IGNORED, push.handle(callData(id(1), alert)))
        assertEquals(PushResult.IGNORED, push.handle(callData(id(2), alert)))
        assertTrue(manager.forget(alert))
        assertEquals(PushResult.IGNORED, push.handle(callData(id(3), alert)))
        // Nobody else answered either, but this user declined: no missed call.
        push.advance(31_000)
        assertEquals(PushResult.IGNORED, push.handle(cancelData(id(4), alert, "expired")))
        assertNull(push.posted(alert))
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun theServerStopsTheRingForEachReason() {
        val cases = listOf(
            Triple("answered", PushResult.STOPPED, CallEndReason.ANSWERED_ELSEWHERE),
            Triple("declined", PushResult.STOPPED, CallEndReason.DECLINED_ELSEWHERE),
            Triple("ended", PushResult.MISSED, CallEndReason.MISSED),
            Triple("expired", PushResult.MISSED, CallEndReason.MISSED),
            Triple("busy", PushResult.STOPPED, CallEndReason.STOPPED),
        )
        for ((index, case) in cases.withIndex()) {
            val (reason, result, endReason) = case
            val alertId = id(100 + index)
            assertEquals(PushResult.RINGING, push.handle(callData(id(10 * index + 1), alertId, title = "Ada")))
            assertEquals(reason, result, push.handle(cancelData(id(10 * index + 2), alertId, reason)))
            assertEquals(listOf("incoming $alertId", "ended $alertId $endReason $reason"), push.events())
            val call = checkNotNull(manager.call(alertId))
            assertEquals(reason, endReason, call.endReason)
            assertEquals(reason, call.serverReason)
            if (result == PushResult.MISSED) {
                val missed = push.notification(alertId)
                assertEquals("Missed call", missed.title)
                assertEquals(NOW, missed.`when`)
            } else {
                assertNull(reason, push.posted(alertId))
            }
        }
        // Their deadlines pass without another event.
        push.advance(30_000)
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun aCancellationThatArrivesFirstStopsTheRing() {
        assertEquals(PushResult.STOPPED, push.handle(cancelData(id(2), alert, "answered")))
        assertEquals(PushResult.IGNORED, push.handle(callData(id(1), alert)))
        assertNull(push.posted(alert))
        assertNull(manager.call(alert))

        val other = id(101)
        assertEquals(PushResult.MISSED, push.handle(cancelData(id(4), other, "ended")))
        assertEquals(PushResult.IGNORED, push.handle(callData(id(3), other, title = "Ada")))
        assertEquals("Missed call", push.notification(other).title)
        assertNull(manager.call(other))
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun dropsLateAndRepeatedRings() {
        assertEquals(PushResult.IGNORED, push.handle(callData(id(1), alert, expiresAt = NOW)))
        assertNull(push.posted(alert))
        assertNull(manager.call(alert))

        val other = id(101)
        assertEquals(PushResult.RINGING, push.handle(callData(id(2), other)))
        assertEquals(PushResult.IGNORED, push.handle(callData(id(3), other)))
        assertEquals(listOf("incoming $other"), push.events())
    }

    @Test
    fun aRingThatExpiredHereButWasAnsweredElsewhereIsNotMissed() {
        push.handle(callData(id(1), alert))
        push.advance(30_000)
        assertEquals("Missed call", push.notification(alert).title)
        assertEquals(PushResult.IGNORED, push.handle(cancelData(id(2), alert, "answered")))
        assertNull(push.posted(alert))
        assertEquals(CallEndReason.EXPIRED, manager.call(alert)?.endReason)
        assertEquals(listOf("incoming $alert", "ended $alert EXPIRED null"), push.events())
    }

    @Test
    fun leavesMissedCallsToTheAppWhenAsked() {
        push.options.showMissedCalls = false
        push.handle(callData(id(1), alert))
        assertEquals(PushResult.MISSED, push.handle(cancelData(id(2), alert, "ended")))
        assertNull(push.posted(alert))
        val early = id(101)
        assertEquals(PushResult.MISSED, push.handle(cancelData(id(3), early, "expired")))
        assertNull(push.posted(early))
        val expiring = id(102)
        push.handle(callData(id(4), expiring))
        push.advance(30_000)
        assertNull(push.posted(expiring))
        assertEquals(
            listOf("incoming $alert", "ended $alert MISSED ended", "incoming $expiring", "ended $expiring EXPIRED null"),
            push.events(),
        )
    }

    @Test
    fun answersFromTheNotification() {
        push.handle(callData(id(1), alert, title = "Ada"))
        val answer = shadowOf(push.notification(alert).callIntent(NotificationCompat.EXTRA_ANSWER_INTENT))
        assertTrue(answer.isActivity)
        val intent = answer.savedIntent
        assertEquals(ComponentName(push.app, ConvoHopAnswerActivity::class.java), intent.component)
        assertTrue(intent.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0)
        Robolectric.buildActivity(ConvoHopAnswerActivity::class.java, intent).create()

        val started = checkNotNull(push.startedActivity())
        assertEquals(PushHarness.ANSWERED, started.action)
        assertEquals(ConvoHopNotifications.ACTION_ANSWERED_CALL, started.getStringExtra(EXTRA_ACTION))
        assertEquals(alert, started.getStringExtra(EXTRA_ALERT_ID))
        assertEquals(LIVE_SESSION, started.getStringExtra(EXTRA_LIVE_SESSION_ID))
        assertEquals(CONVERSATION, started.getStringExtra(EXTRA_CONVERSATION_ID))
        assertTrue(started.getBooleanExtra(EXTRA_VIDEO, false))
        assertTrue(started.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0)
        assertNull(push.startedActivity())
        assertNull(push.posted(alert))
        assertEquals(CallState.ACTIVE, manager.call(alert)?.state)
        assertEquals(listOf("incoming $alert", "answered $alert"), push.events())
    }

    @Test
    fun answersAfterTheProcessRestarted() {
        // The notification outlived the process that posted it.
        answer(Fixtures.call(id(1), alert).toJson())
        assertEquals(PushHarness.ANSWERED, push.startedActivity()?.action)
        assertEquals(CallState.ACTIVE, manager.call(alert)?.state)
        assertEquals(listOf("answered $alert"), push.events())
        assertEquals(PushResult.IGNORED, push.handle(callData(id(1), alert)))
        assertEquals(PushResult.IGNORED, push.handle(cancelData(id(2), alert, "ended")))
        assertEquals(CallState.ACTIVE, manager.call(alert)?.state)
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun aStaleAnswerOnlyClearsItsNotification() {
        val stale = listOf(Fixtures.call(id(1), id(101)).toJson(), "not json", null)
        for (data in stale) {
            postStaleNotification()
            answer(data)
            assertNull(data, push.posted(alert))
        }
        // A ring whose deadline passed.
        push.now = NOW + 30_000
        postStaleNotification()
        answer(Fixtures.call(id(1), alert).toJson())
        assertNull(push.posted(alert))
        assertNull(push.startedActivity())
        assertNull(manager.call(alert))
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun answeringADeclinedCallDoesNothing() {
        push.handle(callData(id(1), alert))
        val answer = shadowOf(push.notification(alert).callIntent(NotificationCompat.EXTRA_ANSWER_INTENT)).savedIntent
        assertTrue(manager.reject(alert))
        postStaleNotification()
        Robolectric.buildActivity(ConvoHopAnswerActivity::class.java, Intent(answer)).create()
        assertNull(push.posted(alert))
        assertTrue(manager.forget(alert))
        postStaleNotification()
        Robolectric.buildActivity(ConvoHopAnswerActivity::class.java, Intent(answer)).create()
        assertNull(push.posted(alert))
        assertNull(manager.call(alert))
        assertNull(push.startedActivity())
        assertEquals(listOf("incoming $alert", "ended $alert REJECTED null"), push.events())
    }

    @Test
    fun declinesFromTheNotification() {
        push.handle(callData(id(1), alert))
        val decline = shadowOf(push.notification(alert).callIntent(NotificationCompat.EXTRA_DECLINE_INTENT))
        assertTrue(decline.isBroadcast)
        val intent = decline.savedIntent
        assertEquals(ConvoHopCallActionReceiver.ACTION_DECLINE, intent.action)
        assertEquals(ComponentName(push.app, ConvoHopCallActionReceiver::class.java), intent.component)
        ConvoHopCallActionReceiver().onReceive(push.app, intent)
        assertNull(push.posted(alert))
        assertEquals(CallEndReason.REJECTED, manager.call(alert)?.endReason)
        assertEquals(listOf("incoming $alert", "ended $alert REJECTED null"), push.events())
        // A second tap does nothing.
        ConvoHopCallActionReceiver().onReceive(push.app, intent)
        assertEquals(emptyList<String>(), push.events())
    }

    @Test
    fun theReceiverOnlyDeclines() {
        push.handle(callData(id(1), alert))
        ConvoHopCallActionReceiver().onReceive(push.app, Intent("other").putExtra(EXTRA_ALERT_ID, alert))
        ConvoHopCallActionReceiver().onReceive(push.app, Intent(ConvoHopCallActionReceiver.ACTION_DECLINE))
        assertEquals(CallState.RINGING, manager.call(alert)?.state)
        assertEquals(listOf("incoming $alert"), push.events())
    }

    @Test
    fun declinesAfterTheProcessRestarted() {
        postStaleNotification()
        val intent = Intent(ConvoHopCallActionReceiver.ACTION_DECLINE)
            .putExtra(EXTRA_ALERT_ID, alert)
            .putExtra(EXTRA_DATA, Fixtures.call(id(1), alert).toJson())
        ConvoHopCallActionReceiver().onReceive(push.app, intent)
        assertNull(push.posted(alert))
        assertEquals(CallEndReason.REJECTED, manager.call(alert)?.endReason)
        assertEquals(listOf("ended $alert REJECTED null"), push.events())
        assertEquals(PushResult.IGNORED, push.handle(callData(id(1), alert)))
        assertEquals(PushResult.IGNORED, push.handle(cancelData(id(2), alert, "expired")))
        assertNull(push.posted(alert))
    }

    /** Starts the answer activity as the notification's Answer button does, with the ring's [data]. */
    private fun answer(data: String?) {
        val intent = Intent(push.app, ConvoHopAnswerActivity::class.java).putExtra(EXTRA_ALERT_ID, alert)
        if (data != null) intent.putExtra(EXTRA_DATA, data)
        Robolectric.buildActivity(ConvoHopAnswerActivity::class.java, intent).create()
    }

    /** An incoming-call notification left over from an earlier process. */
    private fun postStaleNotification() {
        val stale = NotificationCompat.Builder(push.app, CallNotifier.CHANNEL_CALLS)
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .build()
        push.app.getSystemService(NotificationManager::class.java).notify(alert, CallNotifier.NOTIFICATION_ID, stale)
    }
}
