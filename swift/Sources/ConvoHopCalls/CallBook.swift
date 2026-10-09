import ConvoHopPush
import Foundation

/// A call that ConvoHop reported to CallKit.
public struct ConvoHopCall: Identifiable, Hashable, Sendable {
    public enum State: Hashable, Sendable {
        /// An incoming call rings.
        case ringing
        /// The user answered. Join the call and connect media, then report it connected.
        case answered
        /// Media connects.
        case connecting
        case connected
        /// The call ended. `nil` means the user ended or declined it; otherwise why the call stopped.
        case ended(ConvoHopCallEndReason?)
    }

    /// The CallKit UUID. For an incoming call, the ring's `alertId`.
    public let uuid: UUID
    public var id: UUID { uuid }
    public let isOutgoing: Bool
    public let conversationId: String
    public let liveSessionId: String
    /// The CallKit handle: the conversation ID unless you started the call with another.
    public let handle: String
    /// The ring, for an incoming call.
    public let alert: ConvoHopCallAlert?
    /// The push event that rang the call.
    public let eventId: String?
    /// Who started the ringing, for an incoming call.
    public let callerId: String?
    /// `AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.
    public let mediaProfile: String
    public internal(set) var callerName: String?
    public internal(set) var hasVideo: Bool
    public internal(set) var isMuted = false
    public internal(set) var isOnHold = false
    public internal(set) var state: State
    public internal(set) var endedAt: Date?

    /// When an incoming ring stops if nobody answers.
    public var expiresAt: Date? { alert?.expiresAt }

    public var isEnded: Bool {
        if case .ended = state { return true }
        return false
    }

    init(ringing notification: ConvoHopNotification, alert: ConvoHopCallAlert, callerName: String?) {
        uuid = alert.uuid
        isOutgoing = false
        conversationId = notification.conversationId
        liveSessionId = alert.liveSessionId
        handle = notification.conversationId
        self.alert = alert
        eventId = notification.eventId
        callerId = notification.senderId
        mediaProfile = alert.mediaProfile
        self.callerName = callerName
        hasVideo = alert.hasVideo
        state = .ringing
    }

    init(
        outgoing uuid: UUID, liveSessionId: String, conversationId: String, handle: String, callerName: String?,
        hasVideo: Bool
    ) {
        self.uuid = uuid
        isOutgoing = true
        self.conversationId = conversationId
        self.liveSessionId = liveSessionId
        self.handle = handle
        alert = nil
        eventId = nil
        callerId = nil
        mediaProfile = hasVideo ? "AUDIO_VIDEO" : "AUDIO_ONLY"
        self.callerName = callerName
        self.hasVideo = hasVideo
        state = .connecting
    }
}

/// The calls and the decisions about pushes, without CallKit.
package struct CallBook {
    /// What CallKit must do.
    package enum Effect: Equatable {
        /// Report a new incoming call, which now rings.
        case ring(ConvoHopCall)
        /// The call already rings or runs. A VoIP push must still report it: report the same UUID again.
        case rereport(UUID)
        /// Don't ring. A VoIP push must still report a call: report this one and end it at once.
        case reportEnded(UUID, ConvoHopCallEndReason)
        /// A known call stopped for this reason: report its end.
        case ended(ConvoHopCall)
    }

    /// Calls in the order they started.
    package private(set) var calls: [ConvoHopCall] = []

    package init() {}

    package subscript(uuid: UUID) -> ConvoHopCall? {
        calls.first { $0.uuid == uuid }
    }

    /// Decides what a push, or a notification your app received, does. Only pushes `recipient` accepts ring or stop
    /// rings.
    ///
    /// A VoIP push (`voip`) always yields a report: iOS terminates an app that doesn't report one.
    package mutating func receive(
        _ notification: ConvoHopNotification?, voip: Bool, recipient: ConvoHopPushRecipient,
        ledger: ConvoHopNotificationLedger, now: Date, callerName: (ConvoHopNotification) -> String?,
        makeUUID: () -> UUID = UUID.init
    ) -> [Effect] {
        guard let notification, recipient.accepts(notification) else {
            return voip ? [.reportEnded(makeUUID(), .failed)] : []
        }
        switch notification.kind {
        case .message:
            return voip ? [.reportEnded(makeUUID(), .failed)] : []
        case .callCancelled(let alert, let reason):
            ledger.record(notification)
            var effects: [Effect] = []
            if let call = stopRinging(alert.uuid, reason: reason, ledger: ledger, now: now) {
                effects.append(.ended(call))
            }
            if voip { effects.append(.reportEnded(makeUUID(), reason)) }
            return effects
        case .call(let alert):
            if let call = self[alert.uuid], !call.isEnded {
                return voip ? [.rereport(call.uuid)] : []
            }
            if let reason = ledger.stopReason(alertId: alert.alertId) ?? (alert.expiresAt <= now ? .expired : nil) {
                ledger.record(notification)
                return voip ? [.reportEnded(alert.uuid, reason)] : []
            }
            guard ledger.record(notification) else {
                return voip ? [.reportEnded(alert.uuid, .failed)] : []
            }
            calls.removeAll { $0.uuid == alert.uuid }
            let call = ConvoHopCall(ringing: notification, alert: alert, callerName: callerName(notification))
            calls.append(call)
            return [.ring(call)]
        }
    }

    /// The user answered a ringing call.
    package mutating func answer(_ uuid: UUID, ledger: ConvoHopNotificationLedger) -> ConvoHopCall? {
        mutate(uuid) { call in
            guard call.state == .ringing else { return false }
            call.state = .answered
            if let alert = call.alert { ledger.markStopped(alert, reason: .answered) }
            return true
        }
    }

    /// The user ended or declined a call in CallKit.
    package mutating func userEnded(_ uuid: UUID, ledger: ConvoHopNotificationLedger, now: Date) -> ConvoHopCall? {
        finish(uuid, state: .ended(nil), stop: .declined, ledger: ledger, now: now, onlyRinging: false)
    }

    /// The call ended for `reason`, whatever its state.
    package mutating func end(
        _ uuid: UUID, reason: ConvoHopCallEndReason, ledger: ConvoHopNotificationLedger, now: Date
    ) -> ConvoHopCall? {
        finish(uuid, state: .ended(reason), stop: reason, ledger: ledger, now: now, onlyRinging: false)
    }

    /// Stops the call only if it still rings.
    package mutating func stopRinging(
        _ uuid: UUID, reason: ConvoHopCallEndReason, ledger: ConvoHopNotificationLedger, now: Date
    ) -> ConvoHopCall? {
        finish(uuid, state: .ended(reason), stop: reason, ledger: ledger, now: now, onlyRinging: true)
    }

    /// The ring reached its deadline.
    package mutating func expire(_ uuid: UUID, ledger: ConvoHopNotificationLedger, now: Date) -> ConvoHopCall? {
        stopRinging(uuid, reason: .expired, ledger: ledger, now: now)
    }

    /// CallKit reset: every call that hasn't ended failed.
    package mutating func reset(ledger: ConvoHopNotificationLedger, now: Date) -> [ConvoHopCall] {
        calls.filter { !$0.isEnded }.compactMap { end($0.uuid, reason: .failed, ledger: ledger, now: now) }
    }

    package mutating func addOutgoing(
        _ uuid: UUID, liveSessionId: String, conversationId: String, handle: String, callerName: String?,
        hasVideo: Bool
    ) -> ConvoHopCall {
        let call = ConvoHopCall(
            outgoing: uuid, liveSessionId: liveSessionId, conversationId: conversationId, handle: handle,
            callerName: callerName, hasVideo: hasVideo)
        calls.removeAll { $0.uuid == uuid }
        calls.append(call)
        return call
    }

    /// Media connects, or connected. A ringing or ended call doesn't change.
    package mutating func progress(_ uuid: UUID, connected: Bool) -> ConvoHopCall? {
        mutate(uuid) { call in
            switch call.state {
            case .ringing, .ended: return false
            case .answered, .connecting, .connected:
                call.state = connected ? .connected : .connecting
                return true
            }
        }
    }

    package mutating func update(_ uuid: UUID, callerName: String?, hasVideo: Bool?) -> ConvoHopCall? {
        mutate(uuid) { call in
            guard !call.isEnded else { return false }
            if let callerName { call.callerName = callerName }
            if let hasVideo { call.hasVideo = hasVideo }
            return true
        }
    }

    package mutating func setMuted(_ uuid: UUID, _ muted: Bool) -> ConvoHopCall? {
        mutate(uuid) { call in
            call.isMuted = muted
            return !call.isEnded
        }
    }

    package mutating func setOnHold(_ uuid: UUID, _ onHold: Bool) -> ConvoHopCall? {
        mutate(uuid) { call in
            call.isOnHold = onHold
            return !call.isEnded
        }
    }

    /// Forgets a call. Returns whether it was known.
    @discardableResult
    package mutating func remove(_ uuid: UUID) -> Bool {
        let count = calls.count
        calls.removeAll { $0.uuid == uuid }
        return calls.count != count
    }

    private mutating func finish(
        _ uuid: UUID, state: ConvoHopCall.State, stop reason: ConvoHopCallEndReason,
        ledger: ConvoHopNotificationLedger, now: Date, onlyRinging: Bool
    ) -> ConvoHopCall? {
        mutate(uuid) { call in
            guard !call.isEnded, !onlyRinging || call.state == .ringing else { return false }
            if call.state == .ringing, let alert = call.alert { ledger.markStopped(alert, reason: reason) }
            call.state = state
            call.endedAt = now
            return true
        }
    }

    /// Applies `change` and returns the call when it reports a change.
    private mutating func mutate(_ uuid: UUID, _ change: (inout ConvoHopCall) -> Bool) -> ConvoHopCall? {
        guard let index = calls.firstIndex(where: { $0.uuid == uuid }) else { return nil }
        var call = calls[index]
        guard change(&call) else { return nil }
        calls[index] = call
        return call
    }
}
