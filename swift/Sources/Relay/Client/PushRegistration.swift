#if canImport(UserNotifications) && (os(iOS) || os(macOS))
import UserNotifications
#if os(iOS)
import UIKit
#else
import AppKit
#endif

/// Asks to show notifications and registers the app with APNs.
///
/// Relay never stores device tokens. Send the token from
/// `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)` to your backend as
/// ``RelayPushToken/hex(_:)``. Your backend delivers the push requests it builds from Relay's notification
/// webhooks. For calls, send your backend the VoIP token from `RelayCalls` too.
@MainActor
public enum RelayPushRegistration {
    /// Requests authorization, then registers for remote notifications whatever the user chose.
    ///
    /// - Returns: Whether the user allows notifications with `options`.
    @available(iOSApplicationExtension, unavailable)
    @available(macCatalystApplicationExtension, unavailable)
    @available(macOSApplicationExtension, unavailable)
    public static func register(options: UNAuthorizationOptions = [.alert, .badge, .sound]) async throws -> Bool {
        let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: options)
        #if os(iOS)
        UIApplication.shared.registerForRemoteNotifications()
        #else
        NSApplication.shared.registerForRemoteNotifications()
        #endif
        return granted
    }
}
#endif
