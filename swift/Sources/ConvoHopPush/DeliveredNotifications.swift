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
        let identifiers = delivered.compactMap { notification -> String? in
            let payload = notification.request.content.userInfo["convohop"]
            let fields: [String: Any]? =
                if let text = payload as? String, let data = text.data(using: .utf8) {
                    (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                } else {
                    payload as? [String: Any]
                }
            return fields?["alertId"] as? String == alertId ? notification.request.identifier : nil
        }
        if !identifiers.isEmpty { center.removeDeliveredNotifications(withIdentifiers: identifiers) }
    }
}
#endif
