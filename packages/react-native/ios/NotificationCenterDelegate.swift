internal import ConvoHopPush
import Foundation
import UserNotifications

/// The notification center's delegate once ``ConvoHopReactNative/configure(_:)`` runs. It handles ConvoHop pushes and
/// forwards everything else to the delegate it replaced.
final class NotificationCenterDelegate: NSObject, UNUserNotificationCenterDelegate, @unchecked Sendable {
    static let shared = NotificationCenterDelegate()

    /// A push, read on the thread that delivered it.
    enum Push: Sendable {
        case notConvoHop
        /// A `convohop` object this SDK can't read, or an event type it doesn't support.
        case invalid
        /// `payload` is the JSON text JavaScript parses: `{"convohop": {...}}`.
        case notification(ConvoHopNotification, payload: String)
    }

    /// The fields of the push payload contract that JavaScript reads.
    private static let fields = [
        "eventId", "eventType", "occurredAt", "projectId", "recipientId", "conversationId", "senderId", "messageId",
        "liveSessionId", "alertId", "expiresAt", "mediaProfile", "reason",
    ]

    private let lock = NSLock()
    private weak var replaced: (any UNUserNotificationCenterDelegate)?

    private var previous: (any UNUserNotificationCenterDelegate)? {
        lock.lock()
        defer { lock.unlock() }
        return replaced
    }

    @MainActor
    func install() {
        let center = UNUserNotificationCenter.current()
        guard center.delegate !== self else { return }
        lock.lock()
        replaced = center.delegate
        lock.unlock()
        center.delegate = self
    }

    static func read(_ userInfo: [AnyHashable: Any]) -> Push {
        guard let object = userInfo["convohop"] else { return .notConvoHop }
        guard let notification = try? ConvoHopNotification.parse(userInfo: userInfo),
            let payload = payload(object, notification)
        else { return .invalid }
        return .notification(notification, payload: payload)
    }

    /// The contract's fields of the `convohop` object, or of its JSON text, with the visible text the push shows.
    private static func payload(_ object: Any, _ notification: ConvoHopNotification) -> String? {
        var object = object
        if let text = object as? String {
            guard let data = text.data(using: .utf8), let parsed = try? JSONSerialization.jsonObject(with: data) else {
                return nil
            }
            object = parsed
        }
        guard let source = object as? [String: Any] else { return nil }
        var fields: [String: String] = [:]
        for field in Self.fields {
            if let value = source[field] as? String { fields[field] = value }
        }
        fields["title"] = notification.title
        fields["body"] = notification.body
        guard let data = try? JSONSerialization.data(withJSONObject: ["convohop": fields]) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Handles a ConvoHop push that arrives in the foreground. Returns `false` for any other push.
    func handle(
        willPresent notification: UNNotification,
        completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) -> Bool {
        let push = Self.read(notification.request.content.userInfo)
        if case .notConvoHop = push { return false }
        let completion = UncheckedBox(completionHandler)
        onMain { completion.value(Hub.shared.willPresent(push)) }
        return true
    }

    /// Handles the default action on a ConvoHop push. Returns `false` for any other response.
    func handle(didReceive response: UNNotificationResponse, completionHandler: @escaping () -> Void) -> Bool {
        guard response.actionIdentifier == UNNotificationDefaultActionIdentifier else { return false }
        let push = Self.read(response.notification.request.content.userInfo)
        if case .notConvoHop = push { return false }
        let completion = UncheckedBox(completionHandler)
        onMain {
            Hub.shared.opened(push)
            completion.value()
        }
        return true
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter, willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping @Sendable (UNNotificationPresentationOptions) -> Void
    ) {
        if handle(willPresent: notification, completionHandler: completionHandler) { return }
        if previous?.userNotificationCenter?(
            center, willPresent: notification, withCompletionHandler: completionHandler) == nil
        {
            completionHandler([])
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping @Sendable () -> Void
    ) {
        if handle(didReceive: response, completionHandler: completionHandler) { return }
        if previous?.userNotificationCenter?(center, didReceive: response, withCompletionHandler: completionHandler)
            == nil
        {
            completionHandler()
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, openSettingsFor notification: UNNotification?) {
        previous?.userNotificationCenter?(center, openSettingsFor: notification)
    }
}
