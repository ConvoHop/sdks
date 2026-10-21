/// Whose Relay pushes this device rings for and shows.
///
/// Set it at sign-in to the signed-in user, and to ``nobody`` at sign-out: your backend can still hold the device's
/// tokens, and their pushes keep arriving. Store it with ``RelayNotificationLedger/recipient``, or set
/// `RelayCalls.recipient`, so your Notification Service Extension and a relaunch for a VoIP push see it.
public enum RelayPushRecipient: Sendable, Hashable {
    /// Every Relay push. The default until you set a recipient.
    case any
    /// Only pushes for this user in this project.
    case only(projectId: String, recipientId: String)
    /// No Relay push, for example after sign-out.
    case nobody

    /// Whether the push is for this recipient.
    public func accepts(_ notification: RelayNotification) -> Bool {
        switch self {
        case .any:
            true
        case .only(let projectId, let recipientId):
            notification.projectId == projectId && notification.recipientId == recipientId
        case .nobody:
            false
        }
    }
}
