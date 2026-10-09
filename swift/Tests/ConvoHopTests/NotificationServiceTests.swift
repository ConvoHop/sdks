import Foundation
import XCTest

@testable import ConvoHop
@testable import ConvoHopNotificationService
@testable import ConvoHopPush

#if canImport(UserNotifications)
import UserNotifications

final class NotificationServiceTests: XCTestCase {
    private func payload(
        projectId: String = TestIDs.project, recipientId: String = TestIDs.principal, eventId: String = uuid(),
        messageId: String = uuid(), title: String? = nil, body: String? = nil
    ) -> [AnyHashable: Any] {
        var alert: [String: Any] = ["loc-key": "CONVOHOP_MESSAGE"]
        if let title { alert["title"] = title }
        if let body { alert["body"] = body }
        return [
            "aps": ["alert": alert, "mutable-content": 1],
            "convohop": [
                "eventId": eventId, "eventType": "notification.message", "occurredAt": "2026-10-10T11:59:55Z",
                "projectId": projectId, "recipientId": recipientId, "conversationId": TestIDs.conversation,
                "senderId": TestIDs.otherPrincipal, "messageId": messageId,
            ],
        ]
    }

    private func request(userInfo: [AnyHashable: Any], body: String = "Original") -> UNNotificationRequest {
        let content = UNMutableNotificationContent()
        content.title = "Original title"
        content.body = body
        content.userInfo = userInfo
        return UNNotificationRequest(identifier: uuid(), content: content, trigger: nil)
    }

    private func delivered(by service: ConvoHopNotificationService, request: UNNotificationRequest, after: (() -> Void)? = nil) async throws -> UNNotificationContent {
        final class Box: @unchecked Sendable {
            let lock = NSLock()
            var values: [UNNotificationContent] = []
            func append(_ value: UNNotificationContent) { lock.locked { values.append(value) } }
            var count: Int { lock.locked { values.count } }
            var first: UNNotificationContent? { lock.locked { values.first } }
        }
        let box = Box()
        service.didReceive(request) { content in box.append(content) }
        after?()
        try await eventually("notification delivery") { box.count > 0 }
        try await Task.sleep(nanoseconds: 20_000_000)
        XCTAssertEqual(box.count, 1)
        return try XCTUnwrap(box.first)
    }

    private func harnessReturningMessage(_ text: String, messageId: String) async throws -> Harness {
        let h = try await Harness.make()
        await h.http.on("communication.getMessage") { request in
            Reply.ok(request, [
                "result": Fixture.full("Message", [
                    "messageId": .string(messageId), "conversationId": .string(TestIDs.conversation),
                    "authorId": .string(TestIDs.otherPrincipal), "sequence": "1", "revision": "1", "revisionSequence": "1",
                    "createdAt": .string(timestamp(1_800_000_000_000)), "deleted": false, "text": .string(text),
                ])
            ])
        }
        return h
    }

    func testBodyAlreadyPresentDeliversUnchangedWithoutFetching() async throws {
        let h = try await Harness.make()
        let service = ConvoHopNotificationService { _ in h.client }
        let delivered = try await delivered(by: service, request: request(userInfo: payload(body: "Preview"), body: "Preview"))
        XCTAssertEqual(delivered.body, "Preview")
        let requestCount = await h.http.requests.count
        XCTAssertEqual(requestCount, 0)
    }

    func testFetchesMissingMessageTextAndTruncatesToMaximumBodyLength() async throws {
        let messageId = uuid()
        let text = String(repeating: "a", count: ConvoHopNotificationService.maximumBodyLength + 10)
        let h = try await harnessReturningMessage(text, messageId: messageId)
        let service = ConvoHopNotificationService { _ in h.client }
        let delivered = try await delivered(by: service, request: request(userInfo: payload(messageId: messageId)))
        XCTAssertEqual(delivered.body.count, ConvoHopNotificationService.maximumBodyLength)
        XCTAssertTrue(delivered.body.hasSuffix("…"))
        let fetchCount = await h.http.count("communication.getMessage")
        XCTAssertEqual(fetchCount, 1)
    }

    func testFetchFailureTimeoutAndExpirationDeliverOriginalOnce() async throws {
        let failing = try await Harness.make()
        let failureService = ConvoHopNotificationService { _ in failing.client }
        let failed = try await delivered(by: failureService, request: request(userInfo: payload()))
        XCTAssertEqual(failed.body, "Original")

        let timeoutService = ConvoHopNotificationService(timeout: 0) { _ in
            try? await Task.sleep(nanoseconds: 200_000_000)
            return failing.client
        }
        let timedOut = try await delivered(by: timeoutService, request: request(userInfo: payload()))
        XCTAssertEqual(timedOut.body, "Original")

        let expiringService = ConvoHopNotificationService(timeout: 20) { _ in
            try? await Task.sleep(nanoseconds: 500_000_000)
            return failing.client
        }
        let expired = try await delivered(by: expiringService, request: request(userInfo: payload())) {
            expiringService.serviceExtensionTimeWillExpire()
        }
        XCTAssertEqual(expired.body, "Original")
    }

    func testNonConvoHopAndMismatchedClientDeliverUnchanged() async throws {
        let h = try await Harness.make()
        let service = ConvoHopNotificationService { _ in h.client }
        let nonConvoHop = try await delivered(by: service, request: request(userInfo: ["aps": ["alert": "Hello"]]))
        XCTAssertEqual(nonConvoHop.body, "Original")

        let otherProject = try await delivered(by: service, request: request(userInfo: payload(projectId: TestIDs.otherProject)))
        XCTAssertEqual(otherProject.body, "Original")
        let otherRecipient = try await delivered(by: service, request: request(userInfo: payload(recipientId: TestIDs.otherPrincipal)))
        XCTAssertEqual(otherRecipient.body, "Original")
        let requestCount = await h.http.requests.count
        XCTAssertEqual(requestCount, 0)
    }

    private func ledger(_ recipient: ConvoHopPushRecipient? = nil) -> ConvoHopNotificationLedger {
        let suite = "com.convohop.tests.\(uuid())"
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: suite) }
        let ledger = ConvoHopNotificationLedger(suiteName: suite)
        if let recipient { ledger.recipient = recipient }
        return ledger
    }

    func testHidesTheTextOfPushesForAnyoneButTheRecipientWithoutFetching() async throws {
        let h = try await Harness.make()
        let signedIn = ConvoHopPushRecipient.only(projectId: TestIDs.project, recipientId: TestIDs.principal)
        let service = ConvoHopNotificationService(ledger: ledger(signedIn)) { _ in h.client }
        let generic = ConvoHopNotificationService.localizedString("CONVOHOP_MESSAGE")

        let forOther = payload(recipientId: TestIDs.otherPrincipal, title: "Grace", body: "Meet at 6")
        let hidden = try await delivered(by: service, request: request(userInfo: forOther, body: "Meet at 6"))
        XCTAssertEqual(hidden.title, "")
        XCTAssertEqual(hidden.subtitle, "")
        XCTAssertEqual(hidden.body, generic)
        let aps = try XCTUnwrap(hidden.userInfo["aps"] as? [AnyHashable: Any])
        XCTAssertEqual(aps["alert"] as? [String: String], ["loc-key": "CONVOHOP_MESSAGE"])
        XCTAssertEqual(aps["mutable-content"] as? Int, 1)
        let parsed = try XCTUnwrap(ConvoHopNotification(userInfo: hidden.userInfo))
        XCTAssertEqual(parsed.recipientId, TestIDs.otherPrincipal)
        XCTAssertNil(parsed.title)
        XCTAssertNil(parsed.body)

        let otherProject = try await delivered(by: service, request: request(userInfo: payload(projectId: TestIDs.otherProject)))
        XCTAssertEqual(otherProject.title, "")
        XCTAssertEqual(otherProject.body, generic)

        let own = try await delivered(by: service, request: request(userInfo: payload(body: "Mine"), body: "Mine"))
        XCTAssertEqual(own.title, "Original title")
        XCTAssertEqual(own.body, "Mine")

        let signedOut = ConvoHopNotificationService(ledger: ledger(.nobody)) { _ in h.client }
        let afterSignOut = try await delivered(by: signedOut, request: request(userInfo: payload()))
        XCTAssertEqual(afterSignOut.title, "")
        XCTAssertEqual(afterSignOut.body, generic)
        let requestCount = await h.http.requests.count
        XCTAssertEqual(requestCount, 0)
    }

    func testHidesConvoHopPushesItCantReadUnlessTheRecipientIsAny() async throws {
        let h = try await Harness.make()
        var unknown = payload(recipientId: TestIDs.otherPrincipal, body: "Reacted")
        unknown["convohop"] = ["eventType": "notification.reaction", "recipientId": TestIDs.otherPrincipal]
        let signedIn = ConvoHopPushRecipient.only(projectId: TestIDs.project, recipientId: TestIDs.principal)
        let hidden = try await delivered(
            by: ConvoHopNotificationService(ledger: ledger(signedIn)) { _ in h.client },
            request: request(userInfo: unknown, body: "Reacted"))
        XCTAssertEqual(hidden.title, "")
        XCTAssertEqual(hidden.body, ConvoHopNotificationService.localizedString("CONVOHOP_MESSAGE"))

        let any = ConvoHopNotificationService(ledger: ledger()) { _ in h.client }
        let shown = try await delivered(by: any, request: request(userInfo: unknown, body: "Reacted"))
        XCTAssertEqual(shown.body, "Reacted")
        let anotherUser = try await delivered(
            by: any, request: request(userInfo: payload(recipientId: TestIDs.otherPrincipal, body: "Hi"), body: "Hi"))
        XCTAssertEqual(anotherUser.body, "Hi")
        let nonConvoHop = try await delivered(
            by: ConvoHopNotificationService(ledger: ledger(.nobody)) { _ in h.client },
            request: request(userInfo: ["aps": ["alert": "Hello"]]))
        XCTAssertEqual(nonConvoHop.title, "Original title")
        XCTAssertEqual(nonConvoHop.body, "Original")
    }

    func testRedactionUsesTheGenericStringOfEachKindAndDropsPayloadText() throws {
        func notification(_ type: String, _ extra: [String: Any]) throws -> ConvoHopNotification {
            try ConvoHopNotification(jsonObject: [
                "eventId": uuid(), "eventType": type, "occurredAt": "2026-10-10T11:59:58Z",
                "projectId": TestIDs.project, "recipientId": TestIDs.otherPrincipal,
                "conversationId": TestIDs.conversation, "senderId": TestIDs.principal,
            ].merging(extra) { $1 })
        }
        let ring: [String: Any] = [
            "liveSessionId": TestIDs.session, "alertId": uuid(), "expiresAt": "2026-10-10T12:00:45Z",
            "mediaProfile": "AUDIO_ONLY",
        ]
        let call = try notification("notification.call", ring)
        let missed = try notification("notification.callCancelled", ring.merging(["reason": "expired"]) { $1 })
        let message = try notification("notification.message", ["messageId": uuid()])

        let content = UNMutableNotificationContent()
        content.title = "Grace"
        content.subtitle = "Team"
        content.body = "Calling you"
        content.threadIdentifier = TestIDs.conversation
        content.userInfo = [
            "aps": ["alert": "Calling you", "thread-id": TestIDs.conversation],
            "convohop": ["eventType": "notification.call", "title": "Grace", "body": "Calling you"],
        ]
        let localize: (String) -> String = { "localized \($0)" }
        let redacted = ConvoHopNotificationService.redacted(content, kind: call.kind, localize: localize)
        XCTAssertEqual(redacted.title, "")
        XCTAssertEqual(redacted.subtitle, "")
        XCTAssertEqual(redacted.body, "localized CONVOHOP_CALL")
        XCTAssertEqual(redacted.threadIdentifier, TestIDs.conversation)
        let aps = try XCTUnwrap(redacted.userInfo["aps"] as? [AnyHashable: Any])
        XCTAssertEqual(aps["alert"] as? [String: String], ["loc-key": "CONVOHOP_CALL"])
        XCTAssertEqual(aps["thread-id"] as? String, TestIDs.conversation)
        XCTAssertEqual(redacted.userInfo["convohop"] as? [String: String], ["eventType": "notification.call"])
        XCTAssertEqual(content.body, "Calling you")

        XCTAssertEqual(ConvoHopNotificationService.redacted(content, kind: missed.kind, localize: localize).body, "localized CONVOHOP_MISSED_CALL")
        XCTAssertEqual(ConvoHopNotificationService.redacted(content, kind: message.kind, localize: localize).body, "localized CONVOHOP_MESSAGE")
        XCTAssertEqual(ConvoHopNotificationService.redacted(content, kind: nil, localize: localize).body, "localized CONVOHOP_MESSAGE")
        XCTAssertEqual(ConvoHopNotificationService.localizedString("CONVOHOP_TEST_UNDEFINED"), "CONVOHOP_TEST_UNDEFINED")
    }
}
#endif
