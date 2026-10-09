internal import ConvoHopCalls
internal import ConvoHopPush
import Foundation
import UIKit
import UserNotifications

/// React Native plumbing, not app API: the Swift half of the `ConvoHopPush` TurboModule. `ConvoHopPushModule.mm`
/// calls it on the main thread.
@MainActor
@objc(ConvoHopPushBridge)
public final class ConvoHopPushBridge: NSObject, PromiseOwner {
    weak var emitter: (any ConvoHopPushEmitter)?
    private(set) var isInvalidated = false

    nonisolated override public init() {
        super.init()
    }

    /// Starts emitting to `emitter`, once React Native has set its event callback.
    @objc(attachEmitter:)
    public func attach(_ emitter: any ConvoHopPushEmitter) {
        guard !isInvalidated else { return }
        self.emitter = emitter
        Hub.shared.attach(self)
    }

    /// Stops emitting and settling promises: React Native is tearing the module down.
    @objc(invalidate)
    public func invalidate() {
        isInvalidated = true
        emitter = nil
    }

    @objc(getPermissionStatus:reject:)
    public func getPermissionStatus(
        resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        ConvoHopPushBridge.permission { promise.resolve($0) }
    }

    /// Asks for permission if iOS hasn't, then resolves the permission.
    @objc(requestPermission:badge:sound:provisional:resolve:reject:)
    public func requestPermission(
        _ alert: Bool, badge: Bool, sound: Bool, provisional: Bool, resolve: @escaping (Any?) -> Void,
        reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        var options: UNAuthorizationOptions = []
        if alert { options.insert(.alert) }
        if badge { options.insert(.badge) }
        if sound { options.insert(.sound) }
        if provisional { options.insert(.provisional) }
        // A refusal or an error leaves the permission as it was, which the settings report.
        UNUserNotificationCenter.current().requestAuthorization(options: options) { _, _ in
            ConvoHopPushBridge.permission { promise.resolve($0) }
        }
    }

    /// Asks iOS for the APNs token, which arrives as an `onPushRegistration` event.
    @objc(register:reject:)
    public func register(
        resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard Hub.shared.isConfigured else {
            promise.reject(Code.notConfigured, Code.notConfiguredMessage)
            return
        }
        UIApplication.shared.registerForRemoteNotifications()
        promise.resolve()
    }

    /// Sets whose ConvoHop pushes this device shows, for the app and its Notification Service Extension. `nil`
    /// drops them all.
    @objc(setRecipient:resolve:reject:)
    public func setRecipient(
        _ recipient: [String: Any]?, resolve: @escaping (Any?) -> Void,
        reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        let promise = JSPromise(self, resolve, reject)
        guard let recipient else {
            ConvoHopCalls.shared.recipient = .nobody
            promise.resolve()
            return
        }
        guard Hub.shared.isConfigured else {
            promise.reject(Code.notConfigured, Code.notConfiguredMessage)
            return
        }
        guard let projectId = recipient["projectId"] as? String, let recipientId = recipient["recipientId"] as? String,
            Validate.isUUID(projectId), Validate.isUUID(recipientId)
        else {
            promise.reject(Code.invalidArgument, "projectId and recipientId must be lowercase, non-nil UUIDs")
            return
        }
        ConvoHopCalls.shared.recipient = .only(projectId: projectId, recipientId: recipientId)
        promise.resolve()
    }

    /// The APNs registration, once iOS reports the token. The VoIP registration comes from `getVoipToken`.
    @objc(getRegistrations:reject:)
    public func getRegistrations(
        resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        JSPromise(self, resolve, reject).resolve(Hub.shared.apnsRegistration().map { [$0] } ?? [])
    }

    @objc(takeInitialNotification:reject:)
    public func takeInitialNotification(
        resolve: @escaping (Any?) -> Void, reject: @escaping (String, String, (any Error)?) -> Void
    ) {
        Hub.shared.takeInitialNotification(JSPromise(self, resolve, reject))
    }

    /// Reads the notification permission, then hands `completion` the contract's name for it on the main actor.
    nonisolated private static func permission(_ completion: @escaping @MainActor @Sendable (String) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let permission: String
            switch settings.authorizationStatus {
            case .authorized, .ephemeral: permission = "granted"
            case .provisional: permission = "provisional"
            case .notDetermined: permission = "undetermined"
            case .denied: permission = "denied"
            @unknown default: permission = "denied"
            }
            onMain { completion(permission) }
        }
    }
}
