#if canImport(UserNotifications)
import UserNotifications

/// Removes notifications that iOS or macOS already shows for a ring.
public enum ConvoHopDeliveredNotifications {
    /// Removes delivered notifications whose `convohop.alertId` is `alertId`.
    ///
    /// A ring the user answered or declined gets no push, so an incoming-call alert stays until your app removes it.
    public static func remove(alertId: String) async {
        let center = UNUserNotificationCenter.current()
        let delivered = await center.deliveredNotifications()
        let identifiers = matching(
            alertId, in: delivered.map { ($0.request.identifier, $0.request.content.userInfo) })
        if !identifiers.isEmpty { center.removeDeliveredNotifications(withIdentifiers: identifiers) }
    }

    /// The identifiers of the notifications whose `convohop` object, or its JSON text, has the `alertId`.
    static func matching(_ alertId: String, in notifications: [(identifier: String, userInfo: [AnyHashable: Any])])
        -> [String]
    {
        notifications.compactMap { notification in
            let payload = notification.userInfo["convohop"]
            let fields: [String: Any]? =
                if let text = payload as? String, let data = text.data(using: .utf8) {
                    (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                } else {
                    payload as? [String: Any]
                }
            return fields?["alertId"] as? String == alertId ? notification.identifier : nil
        }
    }
}
#endif
