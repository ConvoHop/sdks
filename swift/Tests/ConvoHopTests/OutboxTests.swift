import Foundation
import XCTest

@testable import ConvoHop

final class OutboxTests: XCTestCase {
    private static let storageKey = "convohop.outbox:\(TestIDs.project):\(TestIDs.principal)"

    private func outbox(
        network: FakeNetworkMonitor, storage: InMemoryRecoveryStorage = InMemoryRecoveryStorage(),
        token: String = "user-token"
    ) async throws -> (Harness, ConvoHopOutbox) {
        let h = try await Harness.make(token: token, storage: storage)
        let outbox = try ConvoHopOutbox(client: h.client, network: network)
        return (h, outbox)
    }

    func testOptimisticMessagesQueueOfflineFlushOnlineAndPersistNoToken() async throws {
        let network = FakeNetworkMonitor(reachable: false)
        let storage = InMemoryRecoveryStorage()
        let (h, outbox) = try await outbox(network: network, storage: storage, token: "secret-user-token")
        let ackId = uuid()
        await h.http.on("communication.sendMessage") { request in
            Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, messageId: ackId, sequence: "11")])
        }
        try await outbox.start()

        let item = try await outbox.enqueue("offline", to: TestIDs.conversation, props: ["client": "ios"])
        XCTAssertEqual(item.state, .queued)
        XCTAssertEqual(item.text, "offline")
        let offlineSendCount = await h.http.count("communication.sendMessage")
        XCTAssertEqual(offlineSendCount, 0)
        let storedValue = await storage.value(forKey: Self.storageKey)
        let stored = try XCTUnwrap(storedValue)
        XCTAssertTrue(stored.contains("offline"))
        XCTAssertFalse(stored.contains("secret-user-token"))

        network.set(true)
        try await eventually { await h.http.count("communication.sendMessage") == 1 }
        try await eventually { try await outbox.items().first?.state == .sent }
        let sentValue = try await outbox.items().first
        let sent = try XCTUnwrap(sentValue)
        XCTAssertEqual(sent.messageId, ackId)
        XCTAssertEqual(sent.sequence, "11")
    }

    func testRetriesKeepTheSameRequestIdAndPayloadUntilSuccess() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network)
        let attempts = Shared(0)
        await h.http.on("communication.sendMessage") { request in
            if attempts.update({ $0 += 1; return $0 }) < 3 { throw URLError(.timedOut) }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: "12")])
        }
        try await outbox.start()
        _ = try await outbox.enqueue("retry", to: TestIDs.conversation, props: ["n": 1])

        try await eventually { await h.http.count("communication.sendMessage") == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { await h.http.count("communication.sendMessage") == 2 }
        h.clock.advanceToNextDeadline()
        try await eventually { await h.http.count("communication.sendMessage") == 3 }

        let requests = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(Set(requests.map(\.requestId)).count, 1)
        XCTAssertEqual(Set(requests.map { $0.input?["text"]?.stringValue ?? "" }), ["retry"])
        let finalState = try await outbox.items().first?.state
        XCTAssertEqual(finalState, .sent)
    }

    func testUncertainOutcomeIsResolvedInsteadOfDuplicated() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network)
        await h.http.on("communication.sendMessage") { _ in throw URLError(.networkConnectionLost) }
        await h.http.on("communication.resolveRequest") { request in
            let target = request.input?["requestId"]?.stringValue ?? ""
            return Reply.ok(
                request,
                ["result": Fixture.resolution(
                    target, "committed", retained: ["messageAck": Fixture.messageAck(TestIDs.conversation, sequence: "13")])])
        }
        try await outbox.start()
        _ = try await outbox.enqueue("uncertain", to: TestIDs.conversation)

        try await eventually { await h.http.count("communication.sendMessage") == 1 }
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { await h.http.count("communication.sendMessage") == 2 }
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { await h.http.count("communication.sendMessage") == 3 }
        try await eventually { h.clock.pendingSleeps == 1 }
        h.clock.advanceToNextDeadline()
        try await eventually { await h.http.count("communication.resolveRequest") == 1 }
        let sendCount = await h.http.count("communication.sendMessage")
        let state = try await outbox.items().first?.state
        XCTAssertEqual(sendCount, 3)
        XCTAssertEqual(state, .sent)
    }

    func testPermanentFailureCanBeResentOrDiscarded() async throws {
        let network = FakeNetworkMonitor(reachable: true)
        let (h, outbox) = try await outbox(network: network)
        let attempts = Shared(0)
        await h.http.on("communication.sendMessage") { request in
            if attempts.update({ $0 += 1; return $0 }) == 1 {
                return Reply.graphQLError(code: "FORBIDDEN", outcome: "rejected", status: 403)
            }
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: "14")])
        }
        try await outbox.start()
        let failed = try await outbox.enqueue("blocked", to: TestIDs.conversation)
        try await eventually { try await outbox.items().first?.state == .failed }
        let failedRequestIdValue = try await outbox.items().first?.requestId
        let failedRequestId = try XCTUnwrap(failedRequestIdValue)

        try await outbox.resend(failed.id)
        try await eventually { try await outbox.items().first?.state == .sent }
        let resentRequestId = try await outbox.items().first?.requestId
        XCTAssertNotEqual(resentRequestId, failedRequestId)

        let discarded = try await outbox.discard(failed.id)
        XCTAssertTrue(discarded)
        let remaining = try await outbox.items()
        XCTAssertEqual(remaining, [])
    }

    func testPerConversationOrderingAndRelaunchPersistence() async throws {
        let network = FakeNetworkMonitor(reachable: false)
        let storage = InMemoryRecoveryStorage()
        let (_, first) = try await outbox(network: network, storage: storage)
        try await first.start()
        _ = try await first.enqueue("one", to: TestIDs.conversation)
        _ = try await first.enqueue("two", to: TestIDs.conversation)
        await first.stop()

        let online = FakeNetworkMonitor(reachable: true)
        let (h, relaunched) = try await outbox(network: online, storage: storage)
        await h.http.on("communication.sendMessage") { request in
            let text = request.input?["text"]?.stringValue ?? ""
            return Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, sequence: text == "one" ? "21" : "22")])
        }
        try await relaunched.start()
        try await eventually { await h.http.count("communication.sendMessage") == 2 }

        let requests = await h.http.requests("communication.sendMessage")
        XCTAssertEqual(requests.compactMap { $0.input?["text"]?.stringValue }, ["one", "two"])
        let states = try await relaunched.items().map(\.state)
        XCTAssertEqual(states, [.sent, .sent])
    }
}
