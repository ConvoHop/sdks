// Push quickstart snippets. Tests/ExamplesTests/PushTests.swift runs them with payloads from the push payload
// contract's vectors. startPush isn't run, because it asks the user for permission and registers with APNs.

// #region imports
import ConvoHop
import Foundation
import UserNotifications
// #endregion imports

// #region register
// At sign-in, and whenever your app starts with a user signed in. Pass the ledger on the App Group suite that your
// Notification Service Extension uses too.
@MainActor
func startPush(_ client: ConvoHopClient, ledger: ConvoHopNotificationLedger) async throws {
    // From now on, your app and your extension show this user's pushes only.
    ledger.recipient = .only(projectId: client.projectId, recipientId: client.principalId)
    _ = try await ConvoHopPushRegistration.register() // Asks to show notifications, and registers with APNs.
}

// Send it to your backend from application(_:didRegisterForRemoteNotificationsWithDeviceToken:), which iOS calls with
// the device's current token after each register().
func pushRegistration(deviceToken: Data) -> [String: String] {
    ["kind": "apns", "token": ConvoHopPushToken.hex(deviceToken)]
}
// #endregion register

// #region open
// Your app's navigation.
@MainActor
protocol AppScreens {
    func showMessage(_ messageId: String, in conversation: ConversationHandle)
    func showCall(_ alert: ConvoHopCallAlert, in conversation: ConversationHandle)
    func showMissedCall(_ alert: ConvoHopCallAlert, in conversation: ConversationHandle)
}

// From userNotificationCenter(_:didReceive:withCompletionHandler:), when the user taps a notification.
@MainActor
func openNotification(_ userInfo: [AnyHashable: Any], client: ConvoHopClient, screens: some AppScreens) throws {
    switch try client.handleNotification(userInfo) {
    case .message(let conversation, let messageId):
        screens.showMessage(messageId, in: conversation)
    case .call(let conversation, let alert):
        screens.showCall(alert, in: conversation)
    case .callCancelled(let conversation, let alert, let reason) where reason.isMissedCall:
        screens.showMissedCall(alert, in: conversation)
    case .callCancelled, nil:
        break // Not ConvoHop's, or for another project or user, such as one who signed out on this device.
    }
}
// #endregion open

// #region sign-out
// At sign-out, once your backend has deleted the device's registration. A push that it sent before then can still
// arrive, and your extension then hides its text.
func stopPush(ledger: ConvoHopNotificationLedger) {
    ledger.recipient = .nobody
    ledger.removeAll() // Forgets the events and rings it recorded, and keeps the recipient.
}
// #endregion sign-out
