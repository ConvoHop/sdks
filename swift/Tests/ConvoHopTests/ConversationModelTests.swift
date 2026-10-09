import Foundation
import XCTest

@testable import ConvoHop

#if canImport(Combine)
@MainActor
final class ConversationModelTests: XCTestCase {
    private nonisolated static func member(_ revision: String = "1", membershipEpoch: String = "1", visibilityEpoch: String = "1") -> JSONValue {
        Fixture.full("Member", [
            "conversationId": .string(TestIDs.conversation), "principalId": .string(TestIDs.principal),
            "role": "member", "status": "active", "membershipEpoch": .string(membershipEpoch),
            "visibilityEpoch": .string(visibilityEpoch), "revision": .string(revision), "visibleFromSequence": "1",
            "canStartBroadcast": false,
        ])
    }

    private nonisolated static func conversation(title: String = "General", revision: String = "1") -> JSONValue {
        Fixture.full("Conversation", [
            "conversationId": .string(TestIDs.conversation), "revision": .string(revision), "title": .string(title),
            "latestSequence": "10", "membership": member(revision),
        ])
    }

    private nonisolated static func message(_ sequence: String, id: String = uuid(), author: String = TestIDs.otherPrincipal, text: String = "message") -> JSONValue {
        Fixture.full("Message", [
            "messageId": .string(id), "conversationId": .string(TestIDs.conversation), "authorId": .string(author),
            "sequence": .string(sequence), "revision": "1", "revisionSequence": .string(sequence),
            "createdAt": .string(timestamp(1_800_000_000_000 + (Int(sequence) ?? 0))), "deleted": false,
            "text": .string(text), "props": ["kind": "test"],
        ])
    }

    private nonisolated static func messagePage(_ messages: [JSONValue], complete: Bool = true, nextCursor: String? = nil) -> JSONValue {
        var fields: JSONObject = ["items": .array(messages), "complete": .bool(complete), "refreshRequired": false]
        if let nextCursor { fields["nextCursor"] = .string(nextCursor) }
        return Fixture.full("MessagePage", fields)
    }

    private nonisolated static func receipt(_ principal: String, read: String, updatedAt: String = timestamp(1_800_000_000_050)) -> JSONValue {
        Fixture.full("ReadReceipt", [
            "principalId": .string(principal), "membershipEpoch": "1", "visibilityEpoch": "1",
            "readThroughSequence": .string(read), "updatedAt": .string(updatedAt),
        ])
    }

    private nonisolated static func receiptPage(_ receipts: [JSONValue]) -> JSONValue {
        Fixture.full("ReceiptPage", ["items": .array(receipts), "complete": true, "refreshRequired": false])
    }

    private nonisolated static func eventPage(_ events: [JSONValue], sequence: String) -> JSONValue {
        Fixture.full("EventPage", [
            "items": .array(events), "complete": true, "refreshRequired": false,
            "nextCursor": Fixture.full("Cursor", [
                "incarnation": .string(TestIDs.incarnation), "conversationId": .string(TestIDs.conversation),
                "sequence": .string(sequence),
            ]),
        ])
    }

    private nonisolated static func event(_ sequence: String, type: String, payload: JSONObject) -> JSONValue {
        Fixture.full("Event", [
            "eventId": .string(uuid()), "conversationId": .string(TestIDs.conversation), "sequence": .string(sequence),
            "type": .string(type), "occurredAt": .string(timestamp(1_800_000_000_000 + (Int(sequence) ?? 0))),
            "payload": Fixture.full("EventPayload", payload),
        ])
    }

    private func prepareModelHarness(initialMessages: [JSONValue] = [], replayEvents: [JSONValue] = [], replaySequence: String = "1") async throws -> Harness {
        let h = try await Harness.make()
        await h.http.on("communication.getConversation") { request in Reply.ok(request, ["result": Self.conversation()]) }
        await h.http.on("communication.messages") { request in Reply.ok(request, ["result": Self.messagePage(initialMessages)]) }
        await h.http.on("communication.receipts") { request in
            Reply.ok(request, ["result": Self.receiptPage([Self.receipt(TestIDs.otherPrincipal, read: "1")])])
        }
        await h.http.on("communication.events") { request in
            Reply.ok(request, ["result": Self.eventPage(replayEvents, sequence: replaySequence)])
        }
        return h
    }

    func testMergesStreamEventsIntoMessagesAndReceipts() async throws {
        let firstId = uuid()
        let secondId = uuid()
        let h = try await prepareModelHarness(
            initialMessages: [Self.message("1", id: firstId, text: "first")],
            replayEvents: [
                Self.event("2", type: "message.created", payload: ["messageId": .string(secondId), "revision": "1"]),
                Self.event("3", type: "receipt.reported", payload: [
                    "principalId": .string(TestIDs.otherPrincipal), "membershipEpoch": "1", "visibilityEpoch": "1",
                    "kind": "read", "throughSequence": "2",
                ]),
            ], replaySequence: "3")
        await h.http.on("communication.getMessage") { request in
            let id = request.input?["messageId"]?.stringValue ?? ""
            return Reply.ok(request, ["result": Self.message("2", id: id, text: "second")])
        }
        let model = try ConvoHopConversationModel(client: h.client, conversationId: TestIDs.conversation)

        await model.start()
        XCTAssertEqual(model.phase, .live)
        try await eventually { model.entries.count == 2 && model.receipts[TestIDs.otherPrincipal]?.readThroughSequence == "2" }
        XCTAssertEqual(model.entries.map(\.id), [firstId, secondId])
        let getMessageCount = await h.http.count("communication.getMessage")
        XCTAssertEqual(getMessageCount, 1)
    }

    func testOptimisticOutboxEntryIsReconciledWithSentMessage() async throws {
        let network = FakeNetworkMonitor(reachable: false)
        let h = try await prepareModelHarness()
        let outbox = try ConvoHopOutbox(client: h.client, network: network)
        try await outbox.start()
        let serverMessageId = uuid()
        await h.http.on("communication.sendMessage") { request in
            Reply.ok(request, ["result": Fixture.messageAck(TestIDs.conversation, messageId: serverMessageId, sequence: "4")])
        }
        await h.http.on("communication.getMessage") { request in
            Reply.ok(request, ["result": Self.message("4", id: serverMessageId, author: TestIDs.principal, text: "queued")])
        }
        let model = try ConvoHopConversationModel(client: h.client, conversationId: TestIDs.conversation, outbox: outbox)
        await model.start()

        try await model.send("queued")
        XCTAssertEqual(model.entries.count, 1)
        guard case .outgoing(let optimistic) = model.entries[0] else { return XCTFail("Expected outgoing entry") }
        XCTAssertEqual(optimistic.state, .queued)

        network.set(true)
        try await eventually { model.entries.contains { $0.id == serverMessageId } }
        XCTAssertFalse(model.entries.contains { $0.id == "outgoing:" + optimistic.id.uuidString })
        guard case .message(let stored) = model.entries.last else { return XCTFail("Expected stored message") }
        XCTAssertEqual(stored.messageId, serverMessageId)
        XCTAssertEqual(stored.text, "queued")
    }

    private nonisolated static func deletion(_ messageId: String) -> JSONValue {
        event("2", type: "message.deleted", payload: ["messageId": .string(messageId), "revision": "2", "revisionSequence": "2"])
    }

    private func deletedEntry(_ model: ConvoHopConversationModel, _ messageId: String) -> Message? {
        for case .message(let message) in model.entries where message.messageId == messageId && message.deleted {
            return message
        }
        return nil
    }

    func testServerTombstoneKeepsNullTextAndPropsInTheModelAndStore() async throws {
        let messageId = uuid()
        let storage = InMemoryRecoveryStorage()
        let h = try await prepareModelHarness(
            initialMessages: [Self.message("1", id: messageId, text: "secret")], replayEvents: [Self.deletion(messageId)],
            replaySequence: "2")
        await h.http.on("communication.getMessage") { request in
            Reply.ok(request, ["result": Fixture.full("Message", [
                "messageId": .string(messageId), "conversationId": .string(TestIDs.conversation),
                "authorId": .string(TestIDs.otherPrincipal), "sequence": "1", "revision": "2", "revisionSequence": "2",
                "createdAt": .string(timestamp(1_800_000_000_001)), "deleted": true,
            ])])
        }
        let store = try ConvoHopLocalStore(client: h.client, storage: storage)
        let model = try ConvoHopConversationModel(client: h.client, conversationId: TestIDs.conversation, store: store)

        await model.start()
        try await eventually { self.deletedEntry(model, messageId) != nil }
        let shown = try XCTUnwrap(deletedEntry(model, messageId))
        XCTAssertNil(shown.text)
        XCTAssertNil(shown.props)
        XCTAssertEqual(shown.revision, "2")
        try await eventually { try await store.messages(in: TestIDs.conversation).first?.deleted == true }
        let cached = try await store.messages(in: TestIDs.conversation)
        XCTAssertEqual(cached, [shown])
    }

    func testMessageDeletedRefusalShowsATombstoneWithoutTextOrProps() async throws {
        let messageId = uuid()
        let h = try await prepareModelHarness(
            initialMessages: [Self.message("1", id: messageId, text: "secret")], replayEvents: [Self.deletion(messageId)],
            replaySequence: "2")
        await h.http.on("communication.getMessage") { _ in Reply.graphQLError(code: "MESSAGE_DELETED", status: 409) }
        let model = try ConvoHopConversationModel(client: h.client, conversationId: TestIDs.conversation)

        await model.start()
        try await eventually { self.deletedEntry(model, messageId) != nil }
        let shown = try XCTUnwrap(deletedEntry(model, messageId))
        XCTAssertNil(shown.text, "a tombstone has no text, like the server's")
        XCTAssertNil(shown.props, "a tombstone has no properties, like the server's")
        XCTAssertEqual(shown.revision, "2")
        XCTAssertEqual(shown.revisionSequence, "2")
    }

    func testLoadedReceiptMergesWithNewerReceiptAndLastActivity() async throws {
        let h = try await prepareModelHarness(initialMessages: [Self.message("1", author: TestIDs.otherPrincipal, text: "hi")])
        let model = try ConvoHopConversationModel(client: h.client, conversationId: TestIDs.conversation)
        await model.start()

        XCTAssertEqual(model.receipts[TestIDs.otherPrincipal]?.readThroughSequence, "1")
        XCTAssertNotNil(model.lastActivity(of: TestIDs.otherPrincipal))
    }
}
#endif
