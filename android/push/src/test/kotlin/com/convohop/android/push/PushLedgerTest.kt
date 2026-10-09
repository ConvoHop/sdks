package com.convohop.android.push

import com.convohop.android.push.Fixtures.NOW
import com.convohop.android.push.Fixtures.id
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

internal class PushLedgerTest {
    private var now = NOW

    private fun ledger(store: PushLedgerStore = MemoryPushLedgerStore(), capacity: Int = 256) = PushLedger(store, { now }, capacity)

    @Test
    fun handlesEachEventOnce() {
        val ledger = ledger()
        assertEquals(PushDecision.SHOW_MESSAGE, ledger.record(Fixtures.message(id(1))))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.message(id(1))))
        assertEquals(PushDecision.SHOW_MESSAGE, ledger.record(Fixtures.message(id(2))))
        assertEquals(PushDecision.RING, ledger.record(Fixtures.call(id(3), id(100))))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.call(id(3), id(100))))
    }

    @Test
    fun ringsUntilACancellationArrives() {
        val ledger = ledger()
        assertFalse(ledger.isStopped(id(100), NOW + 30_000))
        assertEquals(PushDecision.RING, ledger.record(Fixtures.call(id(1), id(100))))
        assertEquals(PushDecision.STOP_RINGING, ledger.record(Fixtures.cancel(id(2), id(100), "answered")))
        assertTrue(ledger.isStopped(id(100), NOW + 30_000))
        // A ring for the same alert under a new event ID stays stopped; another alert rings.
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.call(id(3), id(100))))
        assertEquals(PushDecision.RING, ledger.record(Fixtures.call(id(4), id(101))))
    }

    @Test
    fun acceptsACancellationBeforeItsRing() {
        val ledger = ledger()
        assertEquals(PushDecision.MISSED_CALL, ledger.record(Fixtures.cancel(id(1), id(100), "expired")))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.call(id(2), id(100))))
    }

    @Test
    fun classifiesCancellationReasons() {
        val ledger = ledger()
        val expected = mapOf(
            "ended" to PushDecision.MISSED_CALL,
            "expired" to PushDecision.MISSED_CALL,
            "answered" to PushDecision.STOP_RINGING,
            "declined" to PushDecision.STOP_RINGING,
            "transferred" to PushDecision.STOP_RINGING,
        )
        var n = 0
        for ((reason, decision) in expected) {
            n++
            assertEquals(PushDecision.RING, ledger.record(Fixtures.call(id(n), id(100 + n))))
            assertEquals(reason, decision, ledger.record(Fixtures.cancel(id(50 + n), id(100 + n), reason)))
        }
    }

    @Test
    fun ignoresRingsPastTheirDeadline() {
        val ledger = ledger()
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.call(id(1), id(100), expiresAt = NOW)))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.call(id(2), id(101), expiresAt = NOW - 1)))
        assertEquals(PushDecision.RING, ledger.record(Fixtures.call(id(3), id(102), expiresAt = NOW + 1)))
        assertTrue(ledger.isStopped(id(103), NOW))
        assertFalse(ledger.isStopped(id(103), NOW + 1))
    }

    @Test
    fun dropsStoppedAlertsAfterTheirDeadline() {
        val store = MemoryPushLedgerStore()
        val ledger = ledger(store)
        ledger.record(Fixtures.cancel(id(1), id(100), "answered"))
        assertTrue(store.load()!!.contains(id(100)))
        now += 30_000
        ledger.record(Fixtures.message(id(2)))
        assertFalse(store.load()!!.contains(id(100)))
    }

    @Test
    fun givesAHandledRingNoMissedCall() {
        val ledger = ledger()
        assertEquals(PushDecision.RING, ledger.record(Fixtures.call(id(1), id(100))))
        ledger.stop(id(100), NOW + 30_000)
        assertTrue(ledger.isStopped(id(100), NOW + 30_000))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.cancel(id(2), id(100), "expired")))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.cancel(id(3), id(100), "ended")))
        // Stopping is idempotent, so other reasons still stop the ringing.
        assertEquals(PushDecision.STOP_RINGING, ledger.record(Fixtures.cancel(id(4), id(100), "answered")))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.call(id(5), id(100))))
    }

    @Test
    fun remembersARingThatRangOutHere() {
        val ledger = ledger()
        assertEquals(PushDecision.RING, ledger.record(Fixtures.call(id(1), id(100))))
        now = NOW + 30_000
        ledger.stop(id(100), NOW + 30_000)
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.cancel(id(2), id(100), "expired")))
    }

    @Test
    fun keepsHandledAlertsForADayPastTheirDeadline() {
        val ledger = ledger()
        ledger.stop(id(100), NOW + 30_000)
        now = NOW + 30_000 + 86_400_000 - 1
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.cancel(id(1), id(100), "expired")))
        now += 1
        assertEquals(PushDecision.MISSED_CALL, ledger.record(Fixtures.cancel(id(2), id(100), "expired")))
    }

    @Test
    fun survivesARestartWithADurableStore() {
        val store = MemoryPushLedgerStore()
        val first = ledger(store)
        first.record(Fixtures.message(id(1)))
        first.record(Fixtures.cancel(id(2), id(100), "declined"))
        first.stop(id(101), NOW + 30_000)
        val second = ledger(store)
        assertEquals(PushDecision.IGNORE, second.record(Fixtures.message(id(1))))
        assertEquals(PushDecision.IGNORE, second.record(Fixtures.call(id(3), id(100))))
        assertEquals(PushDecision.IGNORE, second.record(Fixtures.cancel(id(4), id(101), "expired")))
        assertEquals(PushDecision.SHOW_MESSAGE, second.record(Fixtures.message(id(5))))
    }

    @Test
    fun persistsIdentifiersOnly() {
        val store = MemoryPushLedgerStore()
        val ledger = ledger(store)
        ledger.record(Fixtures.message(id(1), title = "Ana", body = "Secret text"))
        ledger.stop(id(100), NOW + 30_000)
        val saved = store.load()!!
        assertFalse(saved.contains("Secret"))
        assertFalse(saved.contains("Ana"))
        assertEquals(
            mapOf(
                "seen" to listOf(id(1)),
                "stopped" to mapOf(id(100) to JsonNumber("${NOW + 30_000}")),
                "handled" to mapOf(id(100) to JsonNumber("${NOW + 30_000 + 86_400_000}")),
            ),
            PushJson.parse(saved),
        )
    }

    @Test
    fun forgetsTheOldestEntriesBeyondItsCapacity() {
        val ledger = ledger(capacity = 2)
        for (n in 1..3) ledger.record(Fixtures.message(id(n)))
        assertEquals(PushDecision.SHOW_MESSAGE, ledger.record(Fixtures.message(id(1))))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.message(id(3))))
        for (n in 1..3) ledger.record(Fixtures.cancel(id(10 + n), id(100 + n), "answered"))
        assertEquals(PushDecision.RING, ledger.record(Fixtures.call(id(20), id(101))))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.call(id(21), id(103))))
    }

    @Test
    fun startsEmptyWhenItsStoreFails() {
        val store = object : PushLedgerStore {
            var saves = 0

            override fun load(): String? = throw IllegalStateException("unreadable")

            override fun save(value: String) {
                saves++
                throw IllegalStateException("full")
            }
        }
        val ledger = PushLedger(store, { now })
        assertEquals(PushDecision.SHOW_MESSAGE, ledger.record(Fixtures.message(id(1))))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.message(id(1))))
        assertEquals(1, store.saves)
    }

    @Test
    fun resetsALedgerItCannotRead() {
        val seen = "\"seen\":[\"${id(1)}\"]"
        val until = NOW + 30_000
        val unreadable = listOf(
            "", "not json", "null", "[]", "{}",
            "{$seen,\"stopped\":{}}",
            "{$seen,\"stopped\":{},\"handled\":[]}",
            "{\"seen\":[\"${id(1)}\",5],\"stopped\":{},\"handled\":{}}",
            "{$seen,\"stopped\":{\"${id(100)}\":\"soon\"},\"handled\":{}}",
            "{$seen,\"stopped\":{\"${id(100)}\":1.5},\"handled\":{}}",
            "{$seen,\"stopped\":{\"${id(100)}\":99999999999999999999},\"handled\":{}}",
            "{$seen,\"stopped\":{\"${id(100)}\":$until},\"handled\":{\"${id(101)}\":null}}",
        )
        for (value in unreadable) {
            val store = MemoryPushLedgerStore()
            store.save(value)
            val ledger = ledger(store)
            assertEquals(value, PushDecision.SHOW_MESSAGE, ledger.record(Fixtures.message(id(1))))
            assertEquals(value, PushDecision.RING, ledger.record(Fixtures.call(id(2), id(100))))
        }
    }

    @Test
    fun dropsInvalidIdentifiersFromItsStore() {
        val store = MemoryPushLedgerStore()
        val until = NOW + 30_000
        store.save(
            "{\"seen\":[\"${id(1)}\",\"not-an-id\",\"${Fixtures.SENDER.uppercase()}\"]," +
                "\"stopped\":{\"bogus\":$until,\"${id(100)}\":$until},\"handled\":{\"x\":$until}}",
        )
        val ledger = ledger(store)
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.message(id(1))))
        assertEquals(PushDecision.IGNORE, ledger.record(Fixtures.call(id(2), id(100))))
        val saved = PushJson.parse(store.load()!!) as Map<*, *>
        assertEquals(listOf(id(1), id(2)), saved["seen"])
        assertEquals(mapOf(id(100) to JsonNumber("$until")), saved["stopped"])
        assertEquals(emptyMap<String, Any?>(), saved["handled"])
    }

    @Test
    fun boundsItsCapacity() {
        assertThrows(IllegalArgumentException::class.java) { PushLedger(capacity = 0) }
        assertThrows(IllegalArgumentException::class.java) { PushLedger(capacity = 4097) }
        PushLedger(capacity = 1)
        PushLedger(capacity = 4096)
    }
}
