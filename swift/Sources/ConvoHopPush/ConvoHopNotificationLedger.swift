import Foundation

/// Remembers the notification events this device handled and the rings that stopped.
///
/// Delivery is at least once and unordered: a redelivered event has the same `eventId`, and a cancellation can arrive
/// before its ring. Record each event once, and drop a ring the ledger reports as stopped.
///
/// Pass the same App Group suite in your app and its Notification Service Extension to share one ledger. Two processes
/// writing at the same moment can drop an entry, so treat the ledger as best effort. Call ``removeAll()`` at sign-out.
public final class ConvoHopNotificationLedger: @unchecked Sendable {
    private static let eventsKey = "com.convohop.notificationLedger.events"
    private static let stoppedKey = "com.convohop.notificationLedger.stoppedRings"
    /// A stopped ring is remembered this long after its deadline, to absorb clock skew.
    private static let retention: TimeInterval = 86_400

    private let defaults: UserDefaults
    private let capacity: Int
    private let lock = NSLock()

    /// - Parameters:
    ///   - suiteName: An App Group suite to share with your extensions, or `nil` for the app's standard defaults.
    ///   - capacity: How many event IDs and stopped rings to remember, at least 16.
    public init(suiteName: String? = nil, capacity: Int = 512) {
        defaults = suiteName.flatMap { UserDefaults(suiteName: $0) } ?? .standard
        self.capacity = max(16, capacity)
    }

    /// Records the event, and the stopped ring of a cancellation. Returns `false` when the event was already recorded.
    @discardableResult
    public func record(_ notification: ConvoHopNotification) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        var events = defaults.stringArray(forKey: Self.eventsKey) ?? []
        if events.contains(notification.eventId) { return false }
        events.append(notification.eventId)
        if events.count > capacity { events.removeFirst(events.count - capacity) }
        defaults.set(events, forKey: Self.eventsKey)
        if case .callCancelled(let alert, let reason) = notification.kind {
            storeStop(alert, reason: reason, now: Date())
        }
        return true
    }

    /// Whether the event was recorded.
    public func contains(eventId: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return (defaults.stringArray(forKey: Self.eventsKey) ?? []).contains(eventId)
    }

    /// Records that a ring stopped, for example when your app ended it.
    public func markStopped(_ alert: ConvoHopCallAlert, reason: ConvoHopCallEndReason) {
        lock.lock()
        defer { lock.unlock() }
        storeStop(alert, reason: reason, now: Date())
    }

    /// Why the ring stopped, if a cancellation or stop was recorded for its `alertId`.
    public func stopReason(alertId: String) -> ConvoHopCallEndReason? {
        lock.lock()
        defer { lock.unlock() }
        guard let entry = (defaults.dictionary(forKey: Self.stoppedKey) as? [String: String])?[alertId],
            let separator = entry.firstIndex(of: "|")
        else { return nil }
        return ConvoHopCallEndReason(rawValue: String(entry[entry.index(after: separator)...]))
    }

    /// Whether the ring has stopped: a cancellation was recorded or its deadline has passed.
    public func isStopped(_ alert: ConvoHopCallAlert, at now: Date = Date()) -> Bool {
        alert.expiresAt <= now || stopReason(alertId: alert.alertId) != nil
    }

    /// Forgets every event and ring.
    public func removeAll() {
        lock.lock()
        defer { lock.unlock() }
        defaults.removeObject(forKey: Self.eventsKey)
        defaults.removeObject(forKey: Self.stoppedKey)
    }

    private func storeStop(_ alert: ConvoHopCallAlert, reason: ConvoHopCallEndReason, now: Date) {
        var stopped = (defaults.dictionary(forKey: Self.stoppedKey) as? [String: String]) ?? [:]
        let horizon = now.timeIntervalSince1970 - Self.retention
        func deadline(_ entry: String) -> Double { Double(entry.prefix { $0 != "|" }) ?? 0 }
        stopped = stopped.filter { deadline($0.value) > horizon }
        stopped[alert.alertId] = "\(Int(alert.expiresAt.timeIntervalSince1970.rounded(.up)))|\(reason.rawValue)"
        if stopped.count > capacity {
            let oldest = stopped.sorted { deadline($0.value) < deadline($1.value) }.prefix(stopped.count - capacity)
            for (key, _) in oldest { stopped.removeValue(forKey: key) }
        }
        defaults.set(stopped, forKey: Self.stoppedKey)
    }
}
