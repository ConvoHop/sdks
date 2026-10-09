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
}
#endif
