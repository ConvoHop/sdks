import Foundation

/// Where a Relay notification leads, for this session's user.
public enum RelayNotificationTarget: Sendable {
    /// A new message. Open the conversation at the message, and fetch it with ``ConversationMessages/get(_:)``:
    /// payloads carry no message text unless the project opts in to previews.
    case message(ConversationHandle, messageId: String)
    /// An incoming call. Join it with ``RelayClient/liveSession(_:)``, or ring through `RelayCalls` on iOS.
    case call(ConversationHandle, RelayCallAlert)
    /// A ring stopped. ``RelayCallEndReason/isMissedCall`` says whether to show a missed call.
    case callCancelled(ConversationHandle, RelayCallAlert, reason: RelayCallEndReason)

    /// The conversation the notification belongs to.
    public var conversation: ConversationHandle {
        switch self {
        case .message(let conversation, _), .call(let conversation, _), .callCancelled(let conversation, _, _):
            conversation
        }
    }
}

extension RelayClient {
    /// Routes a push or a notification tap: `handleNotification(payload)`.
    ///
    /// Returns `nil` when `userInfo` has no `convohop` object, its event type isn't one this SDK supports, or the event
    /// is for another project or user, for example after a sign-out on a device whose token your backend still holds.
    /// Delivery is at least once: pass a ``RelayNotificationLedger`` to also get `nil` for an event you already
    /// handled. Route taps without one.
    ///
    /// - Throws: ``RelayPushPayloadError`` when the `convohop` object is malformed.
    public nonisolated func handleNotification(
        _ userInfo: [AnyHashable: Any], ledger: RelayNotificationLedger? = nil
    ) throws -> RelayNotificationTarget? {
        guard let notification = try RelayNotification.parse(userInfo: userInfo) else { return nil }
        return handleNotification(notification, ledger: ledger)
    }

    /// Routes a parsed notification, like the `userInfo` variant.
    public nonisolated func handleNotification(
        _ notification: RelayNotification, ledger: RelayNotificationLedger? = nil
    ) -> RelayNotificationTarget? {
        guard notification.projectId == projectId, notification.recipientId == principalId else { return nil }
        if let ledger, !ledger.record(notification) { return nil }
        let conversation = ConversationHandle(client: self, conversationId: notification.conversationId)
        return switch notification.kind {
        case .message(let messageId): .message(conversation, messageId: messageId)
        case .call(let alert): .call(conversation, alert)
        case .callCancelled(let alert, let reason): .callCancelled(conversation, alert, reason: reason)
        }
    }

    /// Why a ring stopped for this user, or `nil` while it still rings.
    ///
    /// A ring the user answered or declined elsewhere gets no push. While a ring shows, check it whenever the
    /// conversation's stream delivers `live.participationChanged` or `live.ended` for the ring's call, and stop the
    /// ring with the reason. `RelayCalls` stops it at `expiresAt` by itself.
    public func ringStopReason(_ alert: RelayCallAlert) async throws -> RelayCallEndReason? {
        if alert.expiresAt.timeIntervalSince1970 * 1000 <= Double(environment.now()) { return .expired }
        let session = try await liveSession(alert.liveSessionId).snapshot
        switch session.state {
        case .draining, .ended, .failed: return .ended
        case .preparing, .ready, .active: break
        }
        return session.myParticipation == nil ? nil : .answered
    }
}
