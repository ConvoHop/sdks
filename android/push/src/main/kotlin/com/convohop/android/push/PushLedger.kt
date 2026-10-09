package com.convohop.android.push

/**
 * Durable storage for a [PushLedger], such as shared preferences. The value
 * holds event and alert identifiers only: never message text or FCM registrations.
 */
public interface PushLedgerStore {
    public fun load(): String?

    public fun save(value: String)
}

/** A [PushLedgerStore] that lives as long as the process. */
public class MemoryPushLedgerStore : PushLedgerStore {
    @Volatile
    private var value: String? = null

    override fun load(): String? = value

    override fun save(value: String) {
        this.value = value
    }
}

/** What to do with a push, after [PushLedger.record]. */
public enum class PushDecision {
    /** A message the device hasn't shown yet. */
    SHOW_MESSAGE,

    /** A ring that is neither cancelled nor past its deadline: ring until it expires or is cancelled. */
    RING,

    /** Stop ringing this alert: it was answered, declined or stopped for a reason this SDK doesn't know. */
    STOP_RINGING,

    /** Stop ringing this alert and show a missed call: the call ended or nobody answered. Each alert gets this at most once. */
    MISSED_CALL,

    /**
     * Nothing to do: the event was handled before, the ring was already
     * cancelled, expired or handled on this device, or it already got its missed call.
     */
    IGNORE,
}

/**
 * Applies the push contract's delivery rules. Delivery is at least once and
 * unordered, so the ledger handles each `eventId` once, and a ring counts as
 * stopped once a cancellation with its `alertId` arrived, even before the
 * ring itself, or once its `expiresAt` passed. A ring gets at most one
 * missed call, even in a new process: none if the user answered, declined
 * or let it ring out on this device ([stop]), and only one if several missed
 * cancellations for its `alertId` arrive under different `eventId`s. The
 * ledger remembers this for a day past the ring's deadline, as long as a
 * missed call stays relevant.
 *
 * It is thread-safe. Give it a durable [store] so its state survives the
 * short-lived processes that receive pushes. A store that can't be read
 * starts an empty ledger; that can only repeat a notification.
 */
public class PushLedger(
    private val store: PushLedgerStore = MemoryPushLedgerStore(),
    private val clock: () -> Long = System::currentTimeMillis,
    private val capacity: Int = 256,
) {
    private var loaded = false
    private val seen = LinkedHashSet<String>()

    // Alerts that must not ring, until their deadline.
    private val stopped = LinkedHashMap<String, Long>()

    // Alerts that get no further missed call: handled on this device, or already missed.
    // Kept a day past their deadline: as long as a missed call stays relevant.
    private val handled = LinkedHashMap<String, Long>()

    init {
        require(capacity in 1..4096) { "capacity must be between 1 and 4096" }
    }

    /** Records [notification] and decides what to do with it. */
    @Synchronized
    public fun record(notification: PushNotification): PushDecision {
        load()
        val now = clock()
        prune(now)
        if (!seen.add(notification.eventId)) return PushDecision.IGNORE
        while (seen.size > capacity) seen.remove(seen.first())
        val decision = when (notification) {
            is PushNotification.Message -> PushDecision.SHOW_MESSAGE
            is PushNotification.IncomingCall ->
                if (notification.alertId in stopped || notification.expiresAtMillis <= now) PushDecision.IGNORE else PushDecision.RING
            is PushNotification.CallCancelled -> {
                keep(stopped, notification.alertId, notification.expiresAtMillis, now)
                when {
                    !notification.missed -> PushDecision.STOP_RINGING
                    notification.alertId in handled -> PushDecision.IGNORE
                    else -> {
                        keep(handled, notification.alertId, notification.expiresAtMillis + MISSED_CALL_RELEVANCE_MILLIS, now)
                        PushDecision.MISSED_CALL
                    }
                }
            }
        }
        save()
        return decision
    }

    /** True once [alertId] was cancelled or handled here, or [expiresAtMillis] passed. */
    @Synchronized
    public fun isStopped(alertId: String, expiresAtMillis: Long): Boolean {
        load()
        val now = clock()
        prune(now)
        return alertId in stopped || alertId in handled || expiresAtMillis <= now
    }

    /**
     * Marks [alertId], which rings until [expiresAtMillis], as handled on this
     * device: the user answered or declined it, or it rang out here. It no
     * longer rings, and the server's later missed-call cancellation is ignored.
     */
    @Synchronized
    public fun stop(alertId: String, expiresAtMillis: Long) {
        load()
        val now = clock()
        prune(now)
        keep(stopped, alertId, expiresAtMillis, now)
        keep(handled, alertId, expiresAtMillis + MISSED_CALL_RELEVANCE_MILLIS, now)
        save()
    }

    private fun keep(entries: LinkedHashMap<String, Long>, alertId: String, until: Long, now: Long) {
        if (until <= now) return
        entries.remove(alertId)
        entries[alertId] = until
        while (entries.size > capacity) entries.remove(entries.keys.first())
    }

    private fun prune(now: Long) {
        stopped.entries.removeAll { it.value <= now }
        handled.entries.removeAll { it.value <= now }
    }

    private fun load() {
        if (loaded) return
        loaded = true
        val text = try {
            store.load()
        } catch (_: RuntimeException) {
            null
        } ?: return
        try {
            val root = PushJson.parse(text) as Map<*, *>
            for (item in root["seen"] as List<*>) {
                val id = item as String
                if (ConvoHopPush.isId(id)) seen.add(id)
            }
            restore(root["stopped"] as Map<*, *>, stopped)
            restore(root["handled"] as Map<*, *>, handled)
        } catch (_: RuntimeException) {
            seen.clear()
            stopped.clear()
            handled.clear()
        }
        while (seen.size > capacity) seen.remove(seen.first())
        while (stopped.size > capacity) stopped.remove(stopped.keys.first())
        while (handled.size > capacity) handled.remove(handled.keys.first())
    }

    private fun restore(from: Map<*, *>, into: LinkedHashMap<String, Long>) {
        for ((alertId, value) in from) {
            val until = (value as JsonNumber).text.toLong()
            if (ConvoHopPush.isId(alertId as String)) into[alertId] = until
        }
    }

    private fun save() {
        val value = linkedMapOf<String, Any?>(
            "seen" to seen.toList(),
            "stopped" to LinkedHashMap(stopped),
            "handled" to LinkedHashMap(handled),
        )
        try {
            store.save(PushJson.write(value))
        } catch (_: RuntimeException) {
        }
    }

    private companion object {
        // The push contract keeps a missed call relevant for a day.
        const val MISSED_CALL_RELEVANCE_MILLIS = 86_400_000L
    }
}
