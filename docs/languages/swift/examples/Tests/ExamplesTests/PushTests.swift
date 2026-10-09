// Runs the push quickstart's snippets with payloads from the push payload contract's vectors, and the Notification
// Service Extension against the conformance mock.
import ConvoHop
import Foundation
import UserNotifications
import XCTest

@testable import Examples

final class PushTests: XCTestCase {
    @MainActor
    func testOpeningANotificationShowsItsScreen() throws {
        // The vectors' recipient. Routing a notification doesn't use the network.
        let client = try ConvoHopClient(
            configuration: ConvoHopConfiguration(
                baseURL: URL(string: "https://convohop.invalid")!,
                projectId: vectorField("message-metadata-only", "projectId"),
                principalId: vectorField("message-metadata-only", "recipientId"), incarnation: newRequestId(),
                sessionToken: "token"))
        let screens = Screens()
        let payloads: [[AnyHashable: Any]] = [
            apnsPayload("message-metadata-only"),
            apnsPayload("call-incoming"),
            apnsPayload("cancel-ended"),
            apnsPayload("cancel-ended", ["reason": "answered"]), // Answered on another device.
            apnsPayload("message-metadata-only", ["recipientId": newRequestId()]), // For another user.
            ["aps": ["alert": "Hello"]], // Not ConvoHop's.
        ]
        for payload in payloads {
            try openNotification(payload, client: client, screens: screens)
        }

        let conversationId = vectorField("message-metadata-only", "conversationId")
        let messageId = vectorField("message-metadata-only", "messageId")
        let alertId = vectorField("call-incoming", "alertId")
        XCTAssertEqual(
            screens.shown,
            [
                "message \(messageId) in \(conversationId)",
                "call \(alertId) in \(conversationId)",
                "missed call \(alertId) in \(conversationId)",
            ])
    }

    @MainActor
    func testTheNotificationServiceShowsTheRecipientsMessageAndHidesOtherUsersMessages() async throws {
        let mock = try await startMock()
        let (aliceSignIn, bobSignIn, conversationId) = try await Backend(target: mock).twoMembers("Push")
        let bob = try await connect(bobSignIn)
        let messageId = try await sendMessage(bob, to: conversationId, text: "See you at 3pm", requestId: newRequestId())

        // Alice is signed in on this device, and the extension gets a session for her.
        let ledger = appGroupLedger()
        ledger.recipient = .only(projectId: mock.projectId, recipientId: aliceSignIn.session.principalId)
        ExtensionSession.provider = { notification in
            guard notification.recipientId == aliceSignIn.session.principalId else { return nil }
            return try extensionClient(aliceSignIn)
        }
        addTeardownBlock { ExtensionSession.provider = nil }
        // The push payload contract's message to a member, with or without a preview.
        func push(_ vector: String, to recipient: SignIn) -> [AnyHashable: Any] {
            apnsPayload(
                vector,
                [
                    "eventId": newRequestId(), "projectId": mock.projectId,
                    "recipientId": recipient.session.principalId, "conversationId": conversationId,
                    "senderId": bobSignIn.session.principalId, "messageId": messageId,
                ])
        }
        let service = NotificationService()

        let fetched = try await shown(push("message-metadata-only", to: aliceSignIn), by: service)
        XCTAssertEqual(fetched.body, "See you at 3pm")
        let preview = try await shown(push("message-preview", to: aliceSignIn), by: service)
        XCTAssertEqual([preview.title, preview.body], ["Ada Lovelace", "Are we still on for 3pm?"]) // The vector's.
        // Bob signed out on this device, and a push sent before then still arrives.
        let hidden = try await shown(push("message-preview", to: bobSignIn), by: service)
        XCTAssertEqual([hidden.title, hidden.body], ["", "CONVOHOP_MESSAGE"]) // The loc-key: these tests don't localize.
    }

    func testStopPushForgetsTheUser() throws {
        let suiteName = "com.example.chat.tests.\(newRequestId())"
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: suiteName) }
        let ledger = ConvoHopNotificationLedger(suiteName: suiteName)
        let notification = try XCTUnwrap(ConvoHopNotification(userInfo: apnsPayload("message-metadata-only")))
        ledger.recipient = .only(projectId: notification.projectId, recipientId: notification.recipientId)
        XCTAssertTrue(ledger.record(notification))

        stopPush(ledger: ledger)
        XCTAssertEqual(ledger.recipient, .nobody)
        XCTAssertFalse(ledger.contains(eventId: notification.eventId))
    }

    func testPushRegistrationSendsTheDeviceTokenAsHex() {
        XCTAssertEqual(
            pushRegistration(deviceToken: Data([0x00, 0x1F, 0xAB, 0xFF])), ["kind": "apns", "token": "001fabff"])
    }

    // The App Group suite that NotificationService uses. The test deletes it when it ends.
    private func appGroupLedger() -> ConvoHopNotificationLedger {
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: "group.com.example.chat") }
        return ConvoHopNotificationLedger(suiteName: "group.com.example.chat")
    }

    // Runs the extension as iOS does, and returns what iOS shows.
    @MainActor
    private func shown(
        _ payload: [AnyHashable: Any], by service: NotificationService
    ) async throws -> UNNotificationContent {
        let alert = (payload["aps"] as? [String: Any])?["alert"] as? [String: Any] ?? [:]
        let content = UNMutableNotificationContent()
        content.title = alert["title"] as? String ?? ""
        content.body = alert["body"] as? String ?? alert["loc-key"] as? String ?? ""
        content.userInfo = payload
        let delivered = Locked<[UNNotificationContent]>([])
        service.didReceive(UNNotificationRequest(identifier: newRequestId(), content: content, trigger: nil)) {
            content in delivered.withLock { $0.append(content) }
        }
        try await eventually("the notification") { delivered.withLock { !$0.isEmpty } }
        try await Task.sleep(nanoseconds: 20_000_000)
        XCTAssertEqual(delivered.withLock { $0.count }, 1)
        return try XCTUnwrap(delivered.withLock { $0.first })
    }
}

@MainActor
final class Screens: AppScreens {
    var shown: [String] = []

    func showMessage(_ messageId: String, in conversation: ConversationHandle) {
        shown.append("message \(messageId) in \(conversation.conversationId)")
    }

    func showCall(_ alert: ConvoHopCallAlert, in conversation: ConversationHandle) {
        shown.append("call \(alert.alertId) in \(conversation.conversationId)")
    }

    func showMissedCall(_ alert: ConvoHopCallAlert, in conversation: ConversationHandle) {
        shown.append("missed call \(alert.alertId) in \(conversation.conversationId)")
    }
}
