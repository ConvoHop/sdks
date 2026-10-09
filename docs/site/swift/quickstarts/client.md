# Swift client quickstart

Use ConvoHop in your iOS or macOS app with the `ConvoHop` Swift package: connect with the session your backend issued and keep it renewed, show a conversation from a local store and keep it current, and send messages optimistically through an outbox that survives dropped connections and restarts.

## Before you start

Your backend signs the user in and returns a session from ConvoHop, with the project's base URL and ID, as the [Java and Kotlin server quickstart](../../jvm/quickstarts/server.md#sign-in-a-user) shows. The SDK never holds a backend key. You need iOS 15 or later, or macOS 12 or later, and the SDK ([install](../index.md#install)). The client is an actor, so call it with `await`, for example from a SwiftUI `.task`.

The samples on this page use these imports:

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#imports
import ConvoHop
import Foundation
import SwiftUI
```

## Connect

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#connect
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
```

`baseURL` must be HTTPS, or loopback HTTP for local development. The client keeps the session token in memory only. `initialize()` loads and checks the project's signed route before the first call. Create one client for each signed-in user and session.

`recoveryStorage` keeps the sends that ConvoHop hasn't confirmed, with their request IDs, inputs, including message text, and outcomes, and the replay cursors of the conversations you watch, but never tokens. The sample's store and outbox keep their data there too. `FileRecoveryStorage` excludes its files from backups, and on iOS protects them until the device's first unlock after a restart. Name its directory after the project and user, as `userStorage(for:)` does, so that users who share a device don't share it. At startup, `recoverPending` settles up to 16 sends whose outcome is unknown. It resends each under its original request ID while its retry budget lasts, and otherwise looks up its outcome without sending it again.

## Renew the session

Sessions expire. To renew the user's session before it does, pass a `ConvoHopSessionRefresh` to `connectUser`, then call `keepSessionAlive`:

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#renew
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
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with [`sessions().renew`](../../jvm/reference/server.md#projectserverclientsessionsrenew-method), taking the principal and device from that sign-in rather than from the request, and returns the `SessionBootstrap` it received.

`scheduleSessionRefresh` renews the session 60 seconds before it expires, but never earlier than halfway through its remaining life, and again before each renewal expires. A renewal that fails while the current session is still valid is retried with backoff, from 1 second doubling to 32, until a second before expiry. Any other failure stops the schedule, and every failure goes to `onError`. The schedule waits on the wall clock, so a renewal that fell due while the app was suspended runs as soon as the app runs again. Keep the schedule that it returns: cancelling or releasing it stops the renewals.

Concurrent renewals share one call to your callback. The client's requests and live connections wait while the session renews, and the client checks the renewed session with ConvoHop before it uses it. Don't call the client from your callback, or await `outbox.stop()` in it: either would wait for the renewal. The outbox never renews the session itself. When a send fails because the session expired, the outbox pauses until you call `resume()`, as the sample's `onRefreshed` does.

`client.sessionRefreshState` says where renewal stands. `.blocked` means that a renewal couldn't be verified, and requests fail with `SESSION_REFRESH_REQUIRED`: sign the user in again, and create a new client with the new session. Do the same when the session expired before it could be renewed, for example while the app wasn't running, because only an unexpired session can be renewed.

## Show a conversation

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#store
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
```

`ConvoHopLocalStore` keeps each conversation's newest messages, 200 by default, and the outbox keeps the user's unsent messages, in the client's storage. `ConvoHopConversationModel` shows them at once, then loads the conversation, its newest messages and its read receipts from ConvoHop, and follows its events. The store is only a cache, and it writes message text exactly as ConvoHop sent it, so keep it in storage that your app protects, such as `FileRecoveryStorage`. Keep one store and one outbox per signed-in user, and stop each model when its screen goes away. If `outbox.start()` throws `RECOVERY_STORAGE_FAILURE`, the saved queue couldn't be read: try again, or call `outbox.removeAll()` to discard it.

- `model.entries` lists the messages that ConvoHop stored, `.message`, oldest first, then this device's `.outgoing` messages until ConvoHop's history shows them. Entries are `Identifiable`, so a `List` or `ForEach` can show them directly.
- `model.loadOlder()` loads up to 100 older messages while `model.hasOlder` is true.
- `model.phase` is `.idle`, `.loading`, `.live`, `.retrying`, `.resyncRequired`, `.left` or `.failed`. `model.lastError` holds the latest error, and a later success doesn't clear it.
- The first time a device follows a conversation, ConvoHop replays the conversation's events from the beginning. The model skips the events for messages older than those it loaded, but new messages from other members appear only once that replay finishes.

## Send a message

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#outbox
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
```

Sends are optimistic: with an outbox, `model.send` queues the message, which appears at the end of `model.entries` at once, and the outbox delivers it while the device is online, in order within each conversation. Every attempt reuses the message's request ID and text, so ConvoHop stores it at most once. Each item's `state` says where it stands:

| `ConvoHopOutbox.State` | Meaning |
| --- | --- |
| `queued` | Waiting to be sent, or to be retried after a delay. |
| `sending` | An attempt is in flight. |
| `sent` | ConvoHop stored the message. It leaves the queue after a minute. |
| `failed` | ConvoHop refused the message. `failure` says why. |
| `unresolved` | The outbox couldn't learn whether ConvoHop stored the message. It checks again when the network comes back. |

When an attempt's outcome is unknown, the outbox resends it under the same request ID after 3 seconds, then 12, within the client's three attempts in 60 seconds. Then it asks ConvoHop for the outcome. A stored message becomes `sent`. If ConvoHop never saw the request and every attempt was refused outright, the outbox sends it under a new request ID, because that can't post it twice. Otherwise it becomes `unresolved`. Refusals that can pass, such as rate limits, back off from 1 second doubling to 30, and other refusals make the message `failed`.

`sendAgain` sends a `failed` or `unresolved` message again under a new request ID. For an unresolved one, the outbox first asks ConvoHop whether it stored the original. An earlier attempt that's still in transit can still commit, so the conversation can show the message twice: ask the user first. `outbox.discard(item.id)` removes a message unless it's `sending`.

If the app is killed during a send, the outbox treats that attempt's outcome as unknown: the next start sends the message again under the same request ID, as above.

## Reconnect and resume

Models reconnect on their own. When the live connection drops, the model catches up from the conversation's history, from the last event it applied, and reconnects with backoff, from 1 second doubling to 10. `model.isConnected` says whether it follows the conversation in real time. While the session renews, it pauses, and it resumes on the renewed session.

When loading fails for a reason that can pass, such as a lost network or a session that needs renewal, `phase` is `.retrying`, and the model tries again with backoff, from 1 second doubling to 30. Call `start()` to try again at once, for example when your app returns to the foreground. When ConvoHop ends the live connection for good, for example with `UNAUTHENTICATED` because the session's authorization ended, `phase` is `.failed`: renew the session if `lastError` asks for it, then call `start()`. After `.resyncRequired`, call `resync()`.

The outbox follows the network on its own. When the network comes back, it delivers what it holds and checks its unresolved messages again. `outbox.flush()` tries every queued message at once, even when the device seems offline, for example when the user pulls to refresh.

## Typing and read receipts

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#typing
// Call it whenever the user edits the draft.
@MainActor
func draftChanged(_ draft: String, in model: ConvoHopConversationModel) {
    guard !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
    model.textChanged()
}
```

`textChanged()` reports that the user is typing at most every 3 seconds, and reports that they stopped 5 seconds after the last edit. `send` and `stop()` report that they stopped too. Typing reports are best effort: ConvoHop never stores or resends them, and the model drops their failures. It sends nothing when the project's capabilities turn typing off. ConvoHop doesn't deliver other members' typing to clients yet, and has no presence.

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#receipts
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
```

`markRead()` reports that the user read every loaded message. Reports only move forward, wait a second to combine calls, and go out one at a time. `model.receipts` holds each member's delivery and read positions by principal ID. Sequences are decimal strings, so compare them as numbers, as `isAtLeast` does. A receipt counts only for the member's current membership and visibility: when either changes, that member's positions start over.

`lastActivity(of:)` says when a member last sent a loaded message or reported a read or delivery position. ConvoHop has no presence, so use it only for hints such as "last seen", as `activityLabel` does.

## Sign out

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#sign-out
// Stop the conversation models and close your streams first.
func signOut(_ chat: Chat, renewal: ConvoHopSessionRefreshSchedule?) async throws {
    renewal?.cancel()
    await chat.outbox.stop() // Waits for the send in flight.
    try await chat.outbox.removeAll()
    // Deletes the stored conversations and the recovery records, which hold the text of unconfirmed sends.
    try FileManager.default.removeItem(at: chat.storage.directory)
}
```

Signing out stops the renewals and the outbox, removes the user's unsent messages, and deletes the user's storage: the stored conversations, and the recovery records, which hold the text of unconfirmed sends. Then release the client. Have your backend revoke the session with [`sessions().revoke`](../../jvm/reference/server.md#projectserverclientsessionsrevoke-method), so that its token stops working before it expires. To stop the user's notifications on this device, see [stop notifications at sign-out](push.md#stop-notifications-at-sign-out).

## Without the conversation model

You can also watch a conversation and send messages without the store, the outbox and the model.

### Watch a conversation's events

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#watch
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
```

`watch` replays the conversation's events from the cursor in recovery storage, or from the start, then follows the conversation live. Batches reach `apply` in order, and the cursor advances only after `apply` returns, so after a crash the events after the stored cursor arrive again: make `apply` idempotent. Events say what changed, so read the current messages when one did. When the live connection drops, the stream catches up from history and reconnects with backoff, and `connectionChanges()` reports whether it's connected. Close the stream when the screen goes away.

If ConvoHop requires a resynchronization, or the session no longer authorizes the replay, the stream stops and reports the error instead of skipping history. The SDK never resets a cursor on its own: after `ConvoHopReplayError.resyncRequired`, `client.resyncAuthorizedHistory(conversationId, apply:onError:)` replays the authorized history from the start.

### Send with your own request ID

```swift snippet=docs/languages/swift/examples/Sources/Examples/Client.swift#send
// requestId identifies the message. Create it with the draft, for example with UUID().uuidString.lowercased(), and
// keep it until you know the outcome.
func sendMessage(
    _ client: ConvoHopClient, to conversationId: String, text: String, requestId: String
) async throws -> String {
    let receipt = try await client.send(text, to: conversationId, requestId: requestId)
    return receipt.messageId
}
```

Create the request ID when the user writes the message, for example with `UUID().uuidString.lowercased()`, and keep it with the draft. If the connection drops during a send, `send` throws a `ConvoHopError` whose `outcome` is `.unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached ConvoHop. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`. `client.resolveRequest(requestId)` looks up a request's outcome without sending it again.

## Next steps

- [Calling quickstart](calling.md): start, join and answer calls in a conversation.
- [Push notifications quickstart](push.md): show notifications for messages and calls when your app isn't open.
- [`ConvoHopClient` reference](../reference/convohop.md#convohopclient-class): every method, with the operation it sends.
- [`ConvoHopConversationModel` reference](../reference/convohop.md#convohopconversationmodel-class): entries, phases, typing and read receipts.
- [`ConvoHopOutbox` reference](../reference/convohop.md#convohopoutbox-class): the queue, its states and resends.
