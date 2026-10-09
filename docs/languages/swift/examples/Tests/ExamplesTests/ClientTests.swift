// Runs the client quickstart's snippets against the conformance mock.
import ConvoHop
import Foundation
import XCTest

@testable import Examples

final class ClientTests: XCTestCase {
    @MainActor
    func testAWatchingUserSeesAnotherUsersMessage() async throws {
        let mock = try await startMock()
        let (aliceSignIn, bobSignIn, conversationId) = try await Backend(target: mock).twoMembers("Weekend")
        let alice = try await connect(aliceSignIn)
        let bob = try await connect(bobSignIn)

        let renders = Renders()
        let stream = try await watchConversation(alice, conversationId) { renders.all.append($0) }
        addTeardownBlock { await stream.close() }
        XCTAssertEqual(renders.all.map(\.count), [0])
        let messageId = try await sendMessage(bob, to: conversationId, text: "Hi Alice", requestId: newRequestId())
        try await eventually("Alice sees Bob's message") { renders.all.last?.isEmpty == false }
        XCTAssertEqual(
            renders.all.last?.map { [$0.messageId, $0.authorId, $0.text] },
            [[messageId, bobSignIn.session.principalId, "Hi Alice"]])
    }

    @MainActor
    func testSendingADraftAgainWithItsRequestIdPostsItOnceAfterADropBeforeCommit() async throws {
        try await sendAgainPostsOnce(after: .dropBeforeCommit)
    }

    @MainActor
    func testSendingADraftAgainWithItsRequestIdPostsItOnceAfterADropAfterCommit() async throws {
        try await sendAgainPostsOnce(after: .dropAfterCommit)
    }

    @MainActor
    private func sendAgainPostsOnce(after fault: Fault) async throws {
        let mock = try await startMock()
        let (_, bobSignIn, conversationId) = try await Backend(target: mock).twoMembers("Drafts")
        let bob = try await connect(bobSignIn)
        try await mock.injectFault("sendMessage", fault)
        let requestId = newRequestId()
        try await assertUnknownOutcome {
            try await sendMessage(bob, to: conversationId, text: "Still there?", requestId: requestId)
        }

        let messageId = try await sendMessage(bob, to: conversationId, text: "Still there?", requestId: requestId)
        let page = try await bob.messages(in: conversationId)
        XCTAssertEqual(page.items.map { [$0.messageId, $0.text] }, [[messageId, "Still there?"]])
        let attempts = try await mock.attempts("sendMessage", requestId)
        XCTAssertEqual(attempts, [true, false])
        // A request ID belongs to one draft. Changed text needs a new one.
        do {
            _ = try await sendMessage(bob, to: conversationId, text: "Still there??", requestId: requestId)
            XCTFail("Changed text reused the request ID")
        } catch let error as ConvoHopError {
            XCTAssertEqual(error.code, .idempotencyConflict)
        }
    }

    @MainActor
    func testConnectUserFinishesASendThatAnEarlierRunLeftUnconfirmedAfterADropBeforeCommit() async throws {
        try await connectUserFinishesTheSend(after: .dropBeforeCommit)
    }

    @MainActor
    func testConnectUserFinishesASendThatAnEarlierRunLeftUnconfirmedAfterADropAfterCommit() async throws {
        try await connectUserFinishesTheSend(after: .dropAfterCommit)
    }

    @MainActor
    private func connectUserFinishesTheSend(after fault: Fault) async throws {
        let mock = try await startMock()
        let (_, bobSignIn, conversationId) = try await Backend(target: mock).twoMembers("Restarts")
        let directory = temporaryDirectory()
        let before = try await connect(bobSignIn, in: directory)
        try await mock.injectFault("sendMessage", fault)
        let requestId = newRequestId()
        try await assertUnknownOutcome {
            try await sendMessage(before, to: conversationId, text: "Sent before the restart", requestId: requestId)
        }

        let after = try await connect(bobSignIn, in: directory)
        let page = try await after.messages(in: conversationId)
        XCTAssertEqual(page.items.map(\.text), ["Sent before the restart"])
        let attempts = try await mock.attempts("sendMessage", requestId)
        XCTAssertEqual(attempts, fault == .dropBeforeCommit ? [true, false] : [true])
    }

    @MainActor
    func testTheConversationModelShowsADraftAtOnceThenTheMessagesConvoHopCommitted() async throws {
        let mock = try await startMock()
        let (aliceSignIn, bobSignIn, conversationId) = try await Backend(target: mock).twoMembers("Store")
        let conversation = try await startModel(of: conversationId, in: openChat(aliceSignIn))
        let bob = try await connect(bobSignIn)
        XCTAssertEqual(conversation.phase, .live)

        let sentBlank = try await sendDraft("  ", in: conversation)
        XCTAssertFalse(sentBlank)
        XCTAssertEqual(conversation.entries, [])
        let sent = try await sendDraft(" Hi Bob ", in: conversation)
        XCTAssertTrue(sent)
        XCTAssertEqual(outgoing(in: conversation).map(\.text), ["Hi Bob"])
        try await eventually("the committed message") {
            outgoing(in: conversation).isEmpty && messages(in: conversation).count == 1
        }

        _ = try await sendMessage(bob, to: conversationId, text: "Hi Alice", requestId: newRequestId())
        try await eventually("Bob's message") { messages(in: conversation).count == 2 }
        XCTAssertEqual(
            messages(in: conversation).map { [$0.authorId, $0.text] },
            [[aliceSignIn.session.principalId, "Hi Bob"], [bobSignIn.session.principalId, "Hi Alice"]])
    }

    @MainActor
    func testTheOutboxPostsADraftOnceWhenTheConnectionDropsBeforeCommit() async throws {
        try await outboxPostsOnce(after: .dropBeforeCommit)
    }

    @MainActor
    func testTheOutboxPostsADraftOnceWhenTheConnectionDropsAfterCommit() async throws {
        try await outboxPostsOnce(after: .dropAfterCommit)
    }

    @MainActor
    private func outboxPostsOnce(after fault: Fault) async throws {
        let mock = try await startMock()
        let (aliceSignIn, _, conversationId) = try await Backend(target: mock).twoMembers("Outbox")
        let conversation = try await startModel(of: conversationId, in: openChat(aliceSignIn))
        try await mock.injectFault("sendMessage", fault)
        _ = try await sendDraft("Still there?", in: conversation)
        let item = try XCTUnwrap(outgoing(in: conversation).first)
        try await eventually("the committed message") {
            outgoing(in: conversation).isEmpty && messages(in: conversation).count == 1
        }
        XCTAssertEqual(messages(in: conversation).map(\.text), ["Still there?"])
        // The outbox sends it again with the same request ID, so ConvoHop stores it once whether or not it committed
        // the dropped attempt.
        let attempts = try await mock.attempts("sendMessage", item.requestId)
        XCTAssertEqual(attempts, [true, false])
    }

    @MainActor
    func testPendingLabelsSayWhyAMessageIsntSentAndSendAgainUsesANewRequestId() async throws {
        let mock = try await startMock()
        let backend = Backend(target: mock)
        let (aliceSignIn, bobSignIn, _) = try await backend.twoMembers("Labels")
        let elsewhere = try await backend.createConversation("Elsewhere", [bobSignIn.session.principalId])
        let alice = try await openChat(aliceSignIn)

        await alice.outbox.stop()
        let queued = try await alice.outbox.enqueue("Am I in?", to: elsewhere)
        XCTAssertEqual(pendingLabel(queued), "Waiting to send")
        try await alice.outbox.start()
        // Alice isn't a member, so ConvoHop refuses the message.
        let failed = try await item(queued.id, in: alice) { $0.state == .failed }
        XCTAssertEqual(pendingLabel(failed), "Not sent (NOT_FOUND)")

        try await sendAgain(failed, in: alice)
        let again = try await item(queued.id, in: alice) { $0.state == .failed && $0.requestId != failed.requestId }
        XCTAssertEqual(pendingLabel(again), "Not sent (NOT_FOUND)")
        let attempts = try await [
            mock.attempts("sendMessage", failed.requestId), mock.attempts("sendMessage", again.requestId),
        ]
        XCTAssertEqual(attempts, [[false], [false]])
    }

    @MainActor
    func testReadReceiptsShowWhoSawAMessageAndWhoWasRecentlyActive() async throws {
        let mock = try await startMock()
        let (aliceSignIn, bobSignIn, conversationId) = try await Backend(target: mock).twoMembers("Receipts")
        let alice = try await startModel(of: conversationId, in: openChat(aliceSignIn))
        let bob = try await startModel(of: conversationId, in: openChat(bobSignIn))
        let bobId = bobSignIn.session.principalId
        _ = try await sendDraft("Seen this?", in: alice)

        try await eventually("Bob gets the message") { messages(in: bob).count == 1 }
        let message = messages(in: bob)[0]
        XCTAssertEqual(seenBy(message, in: bob), []) // Not even by Alice, its author.
        messagesSeen(in: bob)

        try await eventually("Alice learns that Bob saw it") { seenBy(message, in: alice) == [bobId] }
        XCTAssertEqual(activityLabel(of: bobId, in: alice), "Recently active")
        XCTAssertNil(activityLabel(of: newRequestId(), in: alice))
        let later = try XCTUnwrap(activityLabel(of: bobId, in: alice, now: Date().addingTimeInterval(60 * 60)))
        XCTAssertTrue(later.hasPrefix("Last seen "), later)
    }

    func testSequencesCompareAsNumbers() {
        XCTAssertTrue(isAtLeast("10", "9"))
        XCTAssertFalse(isAtLeast("9", "10"))
        XCTAssertTrue(isAtLeast("12", "12"))
        XCTAssertFalse(isAtLeast("12", "13"))
    }

    @MainActor
    func testTypingSignalsGoOutWhileTheDraftHasText() async throws {
        let mock = try await startMock()
        let (aliceSignIn, _, conversationId) = try await Backend(target: mock).twoMembers("Typing")
        let conversation = try await startModel(of: conversationId, in: openChat(aliceSignIn))

        draftChanged(" \n", in: conversation)
        try await Task.sleep(nanoseconds: 300_000_000)
        let typingAfterBlank = await conversation.typing.isTyping
        XCTAssertFalse(typingAfterBlank)
        let signalsAfterBlank = try await mock.requests().filter { $0.field == "typing" }
        XCTAssertEqual(signalsAfterBlank.count, 0)
        draftChanged("H", in: conversation)
        try await eventually("Alice typing") { await conversation.typing.isTyping }
        // The conformance mock doesn't offer typing signals, and the indicator drops failures.
        try await eventually("the typing signal") {
            try await mock.requests().filter { $0.field == "typing" }.map(\.code) == ["FEATURE_UNSUPPORTED"]
        }
    }

    @MainActor
    func testSigningOutDeletesTheStoredDataAndUnsentMessages() async throws {
        let mock = try await startMock()
        let (aliceSignIn, _, conversationId) = try await Backend(target: mock).twoMembers("Sign-out")
        let chat = try await openChat(aliceSignIn)
        let conversation = try await startModel(of: conversationId, in: chat)
        _ = try await sendDraft("Signing off", in: conversation)
        XCTAssertNotEqual(try FileManager.default.contentsOfDirectory(atPath: chat.storage.directory.path), [])

        conversation.stop()
        try await signOut(chat, renewal: nil)
        XCTAssertFalse(FileManager.default.fileExists(atPath: chat.storage.directory.path))
        let items = try await chat.outbox.items()
        XCTAssertEqual(items, [])
    }

    func testEachSignedInUserGetsTheirOwnStorage() throws {
        let projectId = newRequestId()
        let principalId = newRequestId()
        let signIn = SignIn(
            baseUrl: URL(string: "https://convohop.invalid")!, projectId: projectId,
            session: Session(
                sessionId: newRequestId(), principalId: principalId, deviceId: newRequestId(), incarnation: "1",
                sessionRevision: "1", expiresAt: "2030-01-01T00:00:00Z", status: "active"),
            sessionToken: "token")
        let storage = try userStorage(for: signIn)
        let project = storage.directory.deletingLastPathComponent()
        addTeardownBlock {
            try? FileManager.default.removeItem(at: project)
            let root = project.deletingLastPathComponent()
            if (try? FileManager.default.contentsOfDirectory(atPath: root.path))?.isEmpty == true {
                try? FileManager.default.removeItem(at: root)
            }
        }
        XCTAssertEqual(Array(storage.directory.pathComponents.suffix(3)), ["ConvoHop", projectId, principalId])
        XCTAssertTrue(FileManager.default.fileExists(atPath: storage.directory.path))
    }

    @MainActor
    private func assertUnknownOutcome(
        file: StaticString = #filePath, line: UInt = #line, of send: () async throws -> String
    ) async throws {
        do {
            _ = try await send()
            XCTFail("The connection didn't drop", file: file, line: line)
        } catch let error as ConvoHopError {
            XCTAssertEqual(error.outcome, .unknown, file: file, line: line)
        }
    }

    // Waits for an outbox item to match condition.
    @MainActor
    private func item(
        _ id: UUID, in chat: Chat, where condition: (ConvoHopOutbox.Item) -> Bool
    ) async throws -> ConvoHopOutbox.Item {
        var found: ConvoHopOutbox.Item?
        try await eventually("the outbox item") {
            found = try await chat.outbox.items().first { $0.id == id }
            return found.map(condition) ?? false
        }
        return try XCTUnwrap(found)
    }
}

@MainActor
final class Renders {
    var all: [[Message]] = []
}

@MainActor
func messages(in conversation: ConvoHopConversationModel) -> [Message] {
    conversation.entries.compactMap { entry in
        guard case .message(let message) = entry else { return nil }
        return message
    }
}

@MainActor
func outgoing(in conversation: ConvoHopConversationModel) -> [ConvoHopOutbox.Item] {
    conversation.entries.compactMap { entry in
        guard case .outgoing(let item) = entry else { return nil }
        return item
    }
}
