import Foundation
import UserNotifications

/// Connects your app delegate to `@convohop/react-native`'s push and call modules.
///
/// Call ``configure(_:)`` in `application(_:didFinishLaunchingWithOptions:)`, before React Native starts: iOS can
/// launch your app for a VoIP push, and terminates an app that doesn't report each one to CallKit. Then forward the
/// APNs token callbacks to ``didRegisterForRemoteNotifications(deviceToken:)`` and
/// ``didFailToRegisterForRemoteNotifications(error:)``.
@MainActor
public enum ConvoHopReactNative {
    /// Your app's `aps-environment` entitlement, which tells your backend which APNs server to send to.
    public enum APNsEnvironment: String, Sendable {
        case development
        case production
    }

    public struct Options: Sendable {
        /// The App Group your Notification Service Extension shares, or `nil` without one. It stores the push
        /// recipient and the notifications the app handled.
        public var appGroup: String?
        /// Sent with each APNs and VoIP registration. `nil` leaves the choice to your backend.
        public var apnsEnvironment: APNsEnvironment?
        public var supportsVideo: Bool
        /// Lets CallKit and `setHeld` hold calls.
        public var supportsHolding: Bool
        public var includesCallsInRecents: Bool
        /// A sound file in your app bundle, or `nil` for the system ringtone.
        public var ringtoneSound: String?
        /// A 40 × 40 pt template image, in PNG data, for the CallKit button that opens your app.
        public var iconTemplateImageData: Data?
        /// How a ConvoHop message or missed call shows while your app is in the foreground.
        public var foregroundPresentation: UNNotificationPresentationOptions

        public init(
            appGroup: String? = nil,
            apnsEnvironment: APNsEnvironment? = nil,
            supportsVideo: Bool = true,
            supportsHolding: Bool = false,
            includesCallsInRecents: Bool = true,
            ringtoneSound: String? = nil,
            iconTemplateImageData: Data? = nil,
            foregroundPresentation: UNNotificationPresentationOptions = [.banner, .list, .sound]
        ) {
            self.appGroup = appGroup
            self.apnsEnvironment = apnsEnvironment
            self.supportsVideo = supportsVideo
            self.supportsHolding = supportsHolding
            self.includesCallsInRecents = includesCallsInRecents
            self.ringtoneSound = ringtoneSound
            self.iconTemplateImageData = iconTemplateImageData
            self.foregroundPresentation = foregroundPresentation
        }
    }

    /// Starts CallKit and PushKit through `ConvoHopCalls` and becomes the notification center's delegate, forwarding
    /// other pushes to the delegate it replaces. Until JavaScript sets a push recipient, every ConvoHop push is
    /// dropped. Call it again to change the options.
    public static func configure(_ options: Options = Options()) {
        Hub.shared.configure(options)
    }

    /// Forward `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`.
    public static func didRegisterForRemoteNotifications(deviceToken: Data) {
        Hub.shared.didRegister(deviceToken: deviceToken)
    }

    /// Forward `application(_:didFailToRegisterForRemoteNotificationsWithError:)`.
    public static func didFailToRegisterForRemoteNotifications(error: any Error) {
        Hub.shared.didFailToRegister(error: error)
    }

    /// For an app that keeps its own notification center delegate: call it first from
    /// `userNotificationCenter(_:willPresent:withCompletionHandler:)`. Returns `false`, without calling
    /// `completionHandler`, for a push that isn't ConvoHop's.
    nonisolated public static func userNotificationCenter(
        _ center: UNUserNotificationCenter, willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) -> Bool {
        NotificationCenterDelegate.shared.handle(willPresent: notification, completionHandler: completionHandler)
    }

    /// For an app that keeps its own notification center delegate: call it first from
    /// `userNotificationCenter(_:didReceive:withCompletionHandler:)`. Returns `false`, without calling
    /// `completionHandler`, for a response that isn't the default action on a ConvoHop push.
    nonisolated public static func userNotificationCenter(
        _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) -> Bool {
        NotificationCenterDelegate.shared.handle(didReceive: response, completionHandler: completionHandler)
    }
}
