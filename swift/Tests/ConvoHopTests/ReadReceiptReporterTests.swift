import Foundation
import XCTest

@testable import ConvoHop

final class ReadReceiptReporterTests: XCTestCase {
    private static func membership(revision: String = "1", membershipEpoch: String = "1", visibilityEpoch: String = "1") -> Member {
        Member(
            conversationId: TestIDs.conversation, principalId: TestIDs.principal, role: "member", status: "active",
            membershipEpoch: membershipEpoch, visibilityEpoch: visibilityEpoch, revision: revision, visibleFromSequence: "1",
            canStartBroadcast: false)
    }

    private static func receipt(_ sequence: String, membershipEpoch: String = "1", visibilityEpoch: String = "1") -> JSONValue {
        Fixture.full("ReadReceipt", [
            "principalId": .string(TestIDs.principal), "membershipEpoch": .string(membershipEpoch),
            "visibilityEpoch": .string(visibilityEpoch), "readThroughSequence": .string(sequence),
            "updatedAt": .string(timestamp(1_800_000_000_000 + (Int(sequence) ?? 0))),
        ])
    }

    func testCoalescesMarksAndReportsOnlyTheNewestAfterDebounce() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.reportReceipt") { request in
            let sequence = request.input?["throughSequence"]?.stringValue ?? "0"
            return Reply.ok(request, ["result": Self.receipt(sequence)])
        }
        let reporter = try ConvoHopReadReceiptReporter(client: h.client, conversationId: TestIDs.conversation, delay: 1_000)
        await reporter.update(membership: Self.membership())

        try await reporter.markRead(through: "1")
        try await reporter.markRead(through: "3")
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advance(by: 999)
        let beforeDebounce = await h.http.count("communication.reportReceipt")
        XCTAssertEqual(beforeDebounce, 0)
        h.clock.advance(by: 1)
        try await eventually { await h.http.count("communication.reportReceipt") == 1 }

        let requests = await h.http.requests("communication.reportReceipt")
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.input?["throughSequence"]?.stringValue, "3")
        let confirmed = await reporter.confirmedThrough
        XCTAssertEqual(confirmed, "3")
    }

    func testOlderSequencesDoNotMoveTheReceiptBackward() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.reportReceipt") { request in
            Reply.ok(request, ["result": Self.receipt(request.input?["throughSequence"]?.stringValue ?? "0")])
        }
        let reporter = try ConvoHopReadReceiptReporter(client: h.client, conversationId: TestIDs.conversation, delay: 0)
        await reporter.update(membership: Self.membership())

        try await reporter.markRead(through: "5")
        try await eventually { await reporter.confirmedThrough == "5" }
        try await reporter.markRead(through: "4")
        h.clock.advance(by: 10_000)

        let reported = await h.http.requests("communication.reportReceipt").compactMap { $0.input?["throughSequence"]?.stringValue }
        let confirmed = await reporter.confirmedThrough
        XCTAssertEqual(reported, ["5"])
        XCTAssertEqual(confirmed, "5")
    }

    func testRetryableFailuresAreRetriedWithBackoff() async throws {
        let h = try await Harness.make()
        let attempts = Shared(0)
        await h.http.on("communication.reportReceipt") { request in
            if attempts.update({ $0 += 1; return $0 }) == 1 {
                return Reply.graphQLError(code: "AUTHORITY_UNAVAILABLE", outcome: "unknown", status: 503, retryAfter: 1)
            }
            return Reply.ok(request, ["result": Self.receipt(request.input?["throughSequence"]?.stringValue ?? "0")])
        }
        let reporter = try ConvoHopReadReceiptReporter(client: h.client, conversationId: TestIDs.conversation, delay: 0)
        await reporter.update(membership: Self.membership())

        try await reporter.markRead(through: "8")
        try await eventually { await h.http.count("communication.reportReceipt") == 1 }
        let firstError = await reporter.lastError
        XCTAssertNotNil(firstError)
        h.clock.advance(by: 2_000)
        try await eventually { await h.http.count("communication.reportReceipt") == 2 }
        let confirmed = await reporter.confirmedThrough
        let lastError = await reporter.lastError
        XCTAssertEqual(confirmed, "8")
        XCTAssertNil(lastError)
    }

    func testRevisionConflictRefreshesMembershipOnce() async throws {
        let h = try await Harness.make()
        await h.http.on("communication.getConversation") { request in
            Reply.ok(request, ["result": Fixture.full("Conversation", [
                "conversationId": .string(TestIDs.conversation), "revision": "2", "title": "General",
                "latestSequence": "9", "membership": Fixture.full("Member", [
                    "conversationId": .string(TestIDs.conversation), "principalId": .string(TestIDs.principal),
                    "role": "member", "status": "active", "membershipEpoch": "2", "visibilityEpoch": "1",
                    "revision": "2", "visibleFromSequence": "1", "canStartBroadcast": false,
                ]),
            ])])
        }
        let attempts = Shared(0)
        await h.http.on("communication.reportReceipt") { request in
            if attempts.update({ $0 += 1; return $0 }) == 1 {
                return Reply.graphQLError(code: "REVISION_CONFLICT", outcome: "rejected", status: 409)
            }
            return Reply.ok(request, ["result": Self.receipt("9", membershipEpoch: "2")])
        }
        let reporter = try ConvoHopReadReceiptReporter(client: h.client, conversationId: TestIDs.conversation, delay: 0)
        await reporter.update(membership: Self.membership())

        try await reporter.markRead(through: "9")
        try await eventually { await h.http.count("communication.reportReceipt") == 2 }
        let refreshCount = await h.http.count("communication.getConversation")
        let confirmed = await reporter.confirmedThrough
        XCTAssertEqual(refreshCount, 1)
        XCTAssertEqual(confirmed, "9")
    }
}
