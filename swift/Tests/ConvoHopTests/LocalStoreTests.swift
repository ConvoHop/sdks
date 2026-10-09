import Foundation
import XCTest

@testable import ConvoHop

final class LocalStoreTests: XCTestCase {
    private func message(_ sequence: String, id: String = uuid(), revision: String = "1", text: String? = "hello", conversationId: String = TestIDs.conversation) -> Message {
        Message(
            messageId: id, conversationId: conversationId, authorId: TestIDs.principal, sequence: sequence,
            revision: revision, revisionSequence: revision, createdAt: timestamp(1_800_000_000_000 + (Int(sequence) ?? 0)),
            deleted: false, text: text, props: ["sequence": .string(sequence)])
    }

    private func store(messageLimit: Int = 200, storage: any RecoveryStorage = InMemoryRecoveryStorage()) async throws
        -> ConvoHopLocalStore
    {
        let h = try await Harness.make(token: "secret-user-token")
        return try ConvoHopLocalStore(client: h.client, storage: storage, messageLimit: messageLimit)
    }

    private func temporaryDirectory() -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("convohop-local-store-" + uuid(), isDirectory: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: directory) }
        return directory
    }

    func testMessagesRoundTripMergeByRevisionAndPruneToLimit() async throws {
        let storage = InMemoryRecoveryStorage()
        let store = try await store(messageLimit: 2, storage: storage)
        let firstId = uuid()
        try await store.save([message("2"), message("1", id: firstId, revision: "1", text: "old")], in: TestIDs.conversation)
        try await store.save([message("1", id: firstId, revision: "2", text: "new"), message("3")], in: TestIDs.conversation)

        let cached = try await store.messages(in: TestIDs.conversation)
        XCTAssertEqual(cached.map(\.sequence), ["2", "3"])
        XCTAssertEqual(cached.count, 2)
    }

    func testFileStorageWritesLocalEntriesAndNotTokens() async throws {
        let directory = temporaryDirectory()
        let store = try await self.store(storage: try FileRecoveryStorage(directory: directory))

        try await store.save([message("1", text: "stored-body")], in: TestIDs.conversation)
        try await store.saveInbox([
            InboxItem(
                conversationId: TestIDs.conversation, title: "Inbox", activityAt: timestamp(1), visibilityEpoch: "1",
                latestVisibleMessage: nil, hasUnread: true)
        ])

        let files = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        XCTAssertEqual(files.count, 3, "messages, inbox, and conversation index are stored as hashed JSON files")
        let bytes = try files.map { try String(contentsOf: $0, encoding: .utf8) }.joined(separator: "\n")
        XCTAssertTrue(bytes.contains("stored-body"))
        XCTAssertTrue(bytes.contains("Inbox"))
        XCTAssertFalse(bytes.contains("secret-user-token"))
    }

    func testMissingAndCorruptMessageDataReadAsEmptyAndAreRemoved() async throws {
        let storage = InMemoryRecoveryStorage()
        let store = try await store(storage: storage)
        let missing = try await store.messages(in: TestIDs.conversation)
        XCTAssertEqual(missing, [])

        let key = "convohop.local.messages:\(TestIDs.project):\(TestIDs.principal):\(TestIDs.conversation)"
        await storage.setValue("not json", forKey: key)
        let corrupt = try await store.messages(in: TestIDs.conversation)
        XCTAssertEqual(corrupt, [])
        let removed = await storage.value(forKey: key)
        XCTAssertNil(removed)
    }

    func testInboxRoundTripAndRemoveAllClearsIndexedEntries() async throws {
        let storage = InMemoryRecoveryStorage()
        let store = try await store(storage: storage)
        try await store.save([message("1")], in: TestIDs.conversation)
        let item = InboxItem(
            conversationId: TestIDs.conversation, title: "General", activityAt: timestamp(2), visibilityEpoch: "1",
            latestVisibleMessage: nil, hasUnread: false)
        try await store.saveInbox([item])
        let inbox = try await store.inbox()
        XCTAssertEqual(inbox, [item])

        try await store.removeAll()
        let messages = try await store.messages(in: TestIDs.conversation)
        let clearedInbox = try await store.inbox()
        XCTAssertEqual(messages, [])
        XCTAssertEqual(clearedInbox, [])
    }

    func testTombstonesKeepNullTextAndPropsInFileStorage() async throws {
        let directory = temporaryDirectory()
        let deletedId = uuid()
        let tombstone = Message(
            messageId: deletedId, conversationId: TestIDs.conversation, authorId: TestIDs.principal, sequence: "1",
            revision: "3", revisionSequence: "4", createdAt: timestamp(1_800_000_000_001), deleted: true, text: nil,
            props: nil)
        let store = try await self.store(storage: try FileRecoveryStorage(directory: directory))
        try await store.save([message("1", id: deletedId, text: "secret"), message("2")], in: TestIDs.conversation)
        try await store.save([tombstone], in: TestIDs.conversation)

        let reopened = try await self.store(storage: try FileRecoveryStorage(directory: directory))
        let cached = try await reopened.messages(in: TestIDs.conversation)
        XCTAssertEqual(cached.map(\.messageId).first, deletedId)
        XCTAssertEqual(cached.first, tombstone)
        XCTAssertNil(cached.first?.text)
        XCTAssertNil(cached.first?.props)
        let files = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        let bytes = try files.map { try String(contentsOf: $0, encoding: .utf8) }.joined(separator: "\n")
        XCTAssertFalse(bytes.contains("secret"), "the deleted text is gone from storage")
    }

    func testRejectsInvalidBoundsAndForeignMessages() async throws {
        let h = try await Harness.make()
        XCTAssertThrowsError(try ConvoHopLocalStore(client: h.client, storage: InMemoryRecoveryStorage(), messageLimit: 0))
        XCTAssertThrowsError(
            try ConvoHopLocalStore(client: h.client, storage: InMemoryRecoveryStorage(), messageLimit: 10_001))
        let store = try ConvoHopLocalStore(client: h.client, storage: InMemoryRecoveryStorage())
        let foreign = await thrownError { try await store.save([message("1", conversationId: uuid())], in: TestIDs.conversation) }
        XCTAssertTrue(foreign is ConvoHopUsageError, String(describing: foreign))
        let unordered = await thrownError {
            try await store.save([message("1", id: TestIDs.conversation), message("2", id: TestIDs.conversation)], in: TestIDs.conversation)
        }
        XCTAssertTrue(unordered is ConvoHopUsageError, "duplicate message IDs are refused")
        let cached = try await store.messages(in: TestIDs.conversation)
        XCTAssertEqual(cached, [], "a refused save writes nothing")
    }
}
