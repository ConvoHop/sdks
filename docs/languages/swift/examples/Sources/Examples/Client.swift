// Client quickstart snippets. Tests/ExamplesTests/ClientTests.swift runs them against the conformance mock, and
// RenewalTests.swift runs the renewal against a stand-in for your backend.

// #region imports
import ConvoHop
import Foundation
import SwiftUI
// #endregion imports

// #region connect
// What your backend's sign-in endpoint returns: the SessionBootstrap from the server SDK, with the project's base URL
// and ID. See the server quickstart.
struct SignIn: Decodable, Sendable {
    let baseUrl: URL
    let projectId: String
    let session: Session
    let sessionToken: String
}

// Storage for one project and user, so users who share a device don't share it.
func userStorage(for signIn: SignIn) throws -> FileRecoveryStorage {
    try .applicationSupport(subdirectory: "ConvoHop/\(signIn.projectId)/\(signIn.session.principalId)")
}

func connectUser(
    _ signIn: SignIn, storage: FileRecoveryStorage, refreshSession: ConvoHopSessionRefresh? = nil
) async throws -> ConvoHopClient {
    let client = try ConvoHopClient(
        configuration: ConvoHopConfiguration(
            baseURL: signIn.baseUrl,
            projectId: signIn.projectId,
            principalId: signIn.session.principalId,
            incarnation: signIn.session.incarnation,
            sessionToken: signIn.sessionToken,
            // Keeps unconfirmed sends, unsent messages and stored conversations, never tokens.
            recoveryStorage: storage,
            refreshSession: refreshSession // Optional: renews the session through your backend.
        ))
    try await client.initialize()
    // Finishes sends that an earlier run of the app left unconfirmed.
    await client.recoverPending { error in print("Couldn't recover an earlier send: \(error)") }
    return client
}
// #endregion connect

// #region renew
// Pass renewal(from:) to connectUser as refreshSession. The client calls it with the session's metadata, never its
// token. endpoint is your backend's, behind your app's own sign-in, so give it a URLSession that sends your app's
// credentials. Your backend renews the session with the server SDK.
func renewal(from endpoint: URL, session: URLSession = .shared) -> ConvoHopSessionRefresh {
    return { current in
        // The client's requests and streams wait until this settles.
        var request = URLRequest(url: endpoint, timeoutInterval: 10)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "sessionId": current.sessionId, "expectedRevision": current.sessionRevision,
        ])
        let (data, response) = try await session.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        // The client checks the renewed session with ConvoHop before it uses it.
        return try JSONDecoder().decode(SessionBootstrap.self, from: data)
    }
}

// Renews the session a minute before it expires, and again before each renewal expires, until you cancel the
// schedule or release it.
func keepSessionAlive(_ client: ConvoHopClient, outbox: ConvoHopOutbox) throws -> ConvoHopSessionRefreshSchedule {
    try client.scheduleSessionRefresh(
        onRefreshed: { _ in Task { await outbox.resume() } }, // Sends what an expired session paused.
        onError: { error in print("Couldn't renew the session: \(error)") }
    )
}
// #endregion renew

// #region store
// One for the signed-in user. The store keeps conversations, and the outbox keeps unsent messages, in the client's
// storage, so they survive app restarts.
final class Chat: Sendable {
    let client: ConvoHopClient
    let storage: FileRecoveryStorage
    let store: ConvoHopLocalStore
    let outbox: ConvoHopOutbox

    init(client: ConvoHopClient, storage: FileRecoveryStorage) async throws {
        self.client = client
        self.storage = storage
        store = try ConvoHopLocalStore(client: client, storage: storage)
        outbox = try ConvoHopOutbox(client: client)
        try await outbox.start() // Loads what an earlier run left unsent, and starts sending it.
    }
}

@MainActor
func model(of conversationId: String, in chat: Chat) throws -> ConvoHopConversationModel {
    try ConvoHopConversationModel(
        client: chat.client, conversationId: conversationId, store: chat.store, outbox: chat.outbox)
}

struct ConversationView: View {
    @ObservedObject var model: ConvoHopConversationModel

    var body: some View {
        List(model.entries) { entry in
            switch entry {
            case .message(let message):
                Text(message.text ?? "")
            case .outgoing(let item): // Sent from this device, and not in the conversation's history yet.
                Text(item.text).foregroundStyle(.secondary)
            }
        }
        .task { await model.start() } // Shows the stored messages at once, then catches up and follows.
        .onDisappear { model.stop() }
    }
}
// #endregion store

// #region outbox
// Shows the message at once, at the end of model.entries, and sends it through the outbox.
@MainActor
func sendDraft(_ draft: String, in model: ConvoHopConversationModel) async throws -> Bool {
    let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else { return false }
    try await model.send(text)
    return true
}

func pendingLabel(_ item: ConvoHopOutbox.Item) -> String {
    switch item.state {
    case .queued: "Waiting to send"
    case .sending: "Sending…"
    case .sent: "Sent"
    case .failed: "Not sent (\(item.failure?.code?.rawValue ?? "error"))"
    case .unresolved: "Not confirmed yet"
    }
}

// Sends the message again under a new request ID. For one that isn't confirmed yet, the outbox first asks ConvoHop
// whether it stored the original. If an earlier attempt is still in transit, the conversation can show the message
// twice, so ask the user first.
func sendAgain(_ item: ConvoHopOutbox.Item, in chat: Chat) async throws {
    try await chat.outbox.resend(item.id)
}
// #endregion outbox

// #region typing
// Call it whenever the user edits the draft.
@MainActor
func draftChanged(_ draft: String, in model: ConvoHopConversationModel) {
    guard !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
    model.textChanged()
}
// #endregion typing

// #region receipts
// Call it when the newest messages are on screen.
@MainActor
func messagesSeen(in model: ConvoHopConversationModel) {
    model.markRead()
}

// Who read through the message, apart from its author.
@MainActor
func seenBy(_ message: Message, in model: ConvoHopConversationModel) -> [String] {
    model.receipts.values
        .filter { receipt in
            guard receipt.principalId != message.authorId, let read = receipt.readThroughSequence else { return false }
            return isAtLeast(read, message.sequence)
        }
        .map(\.principalId)
        .sorted()
}

// Sequences are decimal strings: compare them as numbers.
func isAtLeast(_ sequence: String, _ other: String) -> Bool {
    sequence.count == other.count ? sequence >= other : sequence.count > other.count
}

@MainActor
func activityLabel(of principalId: String, in model: ConvoHopConversationModel, now: Date = Date()) -> String? {
    guard let last = model.lastActivity(of: principalId) else { return nil }
    if now.timeIntervalSince(last) < 5 * 60 { return "Recently active" }
    let formatter = RelativeDateTimeFormatter()
    formatter.dateTimeStyle = .named
    return "Last seen \(formatter.localizedString(for: last, relativeTo: now))"
}
// #endregion receipts

// #region sign-out
// Stop the conversation models and close your streams first.
func signOut(_ chat: Chat, renewal: ConvoHopSessionRefreshSchedule?) async throws {
    renewal?.cancel()
    await chat.outbox.stop() // Waits for the send in flight.
    try await chat.outbox.removeAll()
    // Deletes the stored conversations and the recovery records, which hold the text of unconfirmed sends.
    try FileManager.default.removeItem(at: chat.storage.directory)
}
// #endregion sign-out

// #region watch
// Shows the conversation's messages, oldest first, and shows them again whenever its events say they changed.
func watchConversation(
    _ client: ConvoHopClient, _ conversationId: String, show: @escaping @MainActor @Sendable ([Message]) -> Void
) async throws -> ConversationStream {
    @Sendable func refresh() async throws {
        let page = try await client.messages(in: conversationId) // The newest messages first.
        await show(page.items.reversed())
    }
    try await refresh()
    return try await client.watch(
        conversationId,
        apply: { events in
            // Make it idempotent: after a crash, the events after the last stored cursor arrive again.
            if events.contains(where: { $0.type.hasPrefix("message.") }) { try await refresh() }
        },
        onError: { error in print("The conversation stopped updating: \(error)") }
    )
}
// #endregion watch

// #region send
// requestId identifies the message. Create it with the draft, for example with UUID().uuidString.lowercased(), and
// keep it until you know the outcome.
func sendMessage(
    _ client: ConvoHopClient, to conversationId: String, text: String, requestId: String
) async throws -> String {
    let receipt = try await client.send(text, to: conversationId, requestId: requestId)
    return receipt.messageId
}
// #endregion send
