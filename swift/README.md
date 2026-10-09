# ConvoHop Swift client SDK

`ConvoHop` is the client SDK for iOS and macOS apps. It gives a signed-in user
chat, realtime updates with replay, offline sending, calls through the
official [LiveKit Swift SDK](https://github.com/livekit/client-sdk-swift),
CallKit ringing for VoIP pushes, and push notification routing. It holds one
user's short-lived session, which your backend issues with a server SDK. Never
put a backend key in an app.

It isn't published yet: [add it from a local checkout](#install-from-source).
License: [Apache-2.0](LICENSE).

> [!NOTE]
> This package lives in the `swift/` directory of
> [ConvoHop/sdks](https://github.com/ConvoHop/sdks) for now. It will move to a
> repository of its own, so that SwiftPM and Xcode can add it by URL.

## Requirements

- iOS 15 or later, or macOS 12 or later.
- Swift 6.1 or later (Xcode 16.4 or later). The package builds in the Swift 6
  language mode, with strict concurrency checking.
- `ConvoHopLiveKit` depends on LiveKit's `client-sdk-swift` 2.17 or later.
  The other products depend only on Apple frameworks.

| Product | Use it for | Platforms |
| --- | --- | --- |
| `ConvoHop` | Sessions, conversations, messages, realtime replay, recovery, the local cache and outbox, calls, and push routing. It re-exports `ConvoHopPush`. | iOS, macOS |
| `ConvoHopLiveKit` | Call media with the LiveKit Swift SDK, and CallKit audio session handling | iOS, macOS (CallKit audio: iOS) |
| `ConvoHopPush` | Push payload parsing, deduplication and the ring ledger. Foundation only and safe in app extensions. | iOS, macOS |
| `ConvoHopCalls` | PushKit VoIP pushes to CallKit for incoming calls, and CallKit for outgoing calls | iOS |
| `ConvoHopNotificationService` | A Notification Service Extension helper that shows message text when the push has none | iOS, macOS |

## Install from source

SwiftPM can only add a package by URL when its `Package.swift` is at the root
of the repository, so until this package has its own repository, add it from a
local checkout:

```sh
git clone https://github.com/ConvoHop/sdks.git
```

- **Xcode:** choose **File › Add Package Dependencies…**, then **Add Local…**,
  and pick the `swift` directory of the checkout. Add the products you need to
  each target: `ConvoHopNotificationService` to the extension target, and the
  others to the app.
- **Package.swift:**

  ```swift
  dependencies: [
      .package(path: "../sdks/swift"),
  ],
  targets: [
      .target(
          name: "ChatApp",
          dependencies: [
              .product(name: "ConvoHop", package: "swift"),
              .product(name: "ConvoHopLiveKit", package: "swift"),
          ]
      ),
  ]
  ```

  SwiftPM names a local package after its directory, so the package is
  `swift` here.

## Sign in

Authenticate the user in your app as you do today. Then your backend maps the
user to a ConvoHop principal and issues a session for this device with a server
SDK. Pass that session to the client:

```swift
import ConvoHop

let issued = try await myBackend.convoHopSession() // Your API, not ConvoHop's.

let client = try ConvoHopClient(configuration: ConvoHopConfiguration(
    baseURL: issued.baseURL,
    projectId: issued.projectId,
    principalId: issued.principalId,
    incarnation: issued.incarnation,
    sessionToken: issued.sessionToken,
    recoveryStorage: try FileRecoveryStorage.applicationSupport(),
    refreshSession: { current in
        // Ask your backend to renew `current` with a server SDK, and return the SessionBootstrap it gets.
        try await myBackend.renewConvoHopSession(current)
    }
))
try await client.initialize()
```

`initialize()` checks the project route and, with a refresh callback, binds the
current session. Create one client per signed-in user and session.

**Renewal.** Call `try await client.refreshSession()` before the session
expires: `client.sessionBinding?.expiresAt` says when. The authority drops the
fraction of a second from the expiry, so renew at least a second early, for
example a minute before expiry and whenever the app returns to the foreground.
The SDK has no renewal timer. It pauses requests and replays while it calls
your callback, verifies the new session with the authority, then resumes them
with the new token. When renewal fails and the old session can't be confirmed,
requests fail with `SESSION_REFRESH_REQUIRED`: sign the user in again and
create a new client with the same recovery storage.

Without a refresh callback, create a new client when the session expires.

## Conversations and messages

```swift
let conversation = try client.conversation(conversationId)

let receipt = try await conversation.messages.send("On my way")
let page = try await conversation.messages.list() // Up to 100 messages, newest first.
let older = try await conversation.messages.list(before: page.items.last?.sequence)
```

The same operations are on the client: `send(_:to:props:requestId:)`,
`messages(in:before:)`, `getMessage(_:in:)`, `edit(_:text:requestId:)`,
`delete(_:requestId:)`, `members(in:)`, `receipts(in:)`, `inbox()` and
`search(_:in:)`. `conversation.mute` reads and sets this user's mute. A deleted
message stays in lists with `deleted` set and `nil` `text` and `props`.

**Retries.** Every mutation has a request ID, which stays the same across the
SDK's own retries. A `ConvoHopError` with an `unknown` outcome isn't a
rejection: the message may or may not be stored. That includes
`TRANSPORT_UNKNOWN` after a lost connection or a redirected response, which the
SDK never follows. Resend it with the same request ID, or look it up:

```swift
do {
    _ = try await client.send(text, to: conversationId, requestId: requestId)
} catch let error as ConvoHopError where error.outcome == .unknown {
    let resolution = try await client.resolveRequest(error.requestId)
}
```

With recovery storage, the client records each mutation, without credentials,
so it can resolve them after a restart: call
`await client.recoverPending(onError:)` after `initialize()`.

## Realtime and replay

`watch` replays a conversation's events from the stored cursor, then follows
them in real time over a WebSocket. When the connection drops, it catches up
from history and reconnects on its own.

```swift
let stream = try await client.watch(conversationId, apply: { events in
    // Called once per ordered batch. The cursor advances only after this returns,
    // so make it idempotent: after a crash, events after the stored cursor come again.
    try await database.apply(events)
}, onError: { error in
    // ConvoHopReplayError.resyncRequired means this user's visible history changed.
})

for await connected in await stream.connectionChanges() {
    showOfflineBanner(!connected)
}

await stream.close()
```

The cursor is never reset silently. After `ConvoHopReplayError.resyncRequired`,
call `client.resyncAuthorizedHistory(_:apply:onError:)`, which replays from the
start of the history this user may see.

The first time a device watches a conversation, the replay starts from the
beginning of the conversation.

## Offline: cache, outbox and conversation model

For a chat screen, `ConvoHopConversationModel` puts the pieces together. It is
an `ObservableObject` for SwiftUI and UIKit:

```swift
let storage = try FileRecoveryStorage.applicationSupport()
let store = try ConvoHopLocalStore(client: client, storage: storage)
let outbox = try ConvoHopOutbox(client: client, network: SystemNetworkMonitor())
try await outbox.start()

let model = try ConvoHopConversationModel(
    client: client, conversationId: conversationId, store: store, outbox: outbox)
await model.start()            // Cached messages first, then the server, then realtime.
try await model.send("Hello")  // Shows at once, and survives restarts and lost connectivity.
model.textChanged()            // From the composer, to report typing.
model.markRead()               // When the newest message is on screen.
model.stop()                   // When the screen goes away.
```

```swift
List(model.entries) { entry in
    switch entry {
    case .message(let message):
        Text(message.text ?? "")
    case .outgoing(let item):
        Text(item.text).foregroundStyle(item.state == .failed ? .red : .secondary)
    }
}
```

- **`ConvoHopLocalStore`** caches each conversation's newest messages and the
  inbox, so screens show content before the network answers. It is never the
  source of truth.
- **`ConvoHopOutbox`** queues outgoing messages and sends them in order per
  conversation, so they appear the moment the user sends them (optimistic
  sends). Each keeps one request ID across retries, so a retry can't post it
  twice. When the outbox can't learn whether ConvoHop stored a message, the
  item becomes `unresolved`: it rechecks when connectivity returns, and
  `resend(_:)` sends it again under a new request ID once the user accepts the
  small risk of a duplicate. When the session needs renewal the queue pauses:
  renew it, then call `resume()`. Each user has one saved queue, so keep one
  outbox per user, in your app's process: outboxes that share a user's queue,
  such as a share extension's, overwrite each other's unsent messages.
- **`ConvoHopTypingIndicator`** reports this user's typing at most every 3
  seconds, and that typing stopped after 5 seconds without edits.
  **`ConvoHopReadReceiptReporter`** reports how far this user has read, only
  forward, combining calls within a second. The model drives both.

The store and the outbox save message text in the storage you give them. Use
storage your app protects at rest, such as `FileRecoveryStorage` (excluded from
backups and, on iOS, protected until the first unlock), and call
`removeAll()` on both when the user signs out.

**Presence and typing.** ConvoHop's client API has no presence, and it doesn't
deliver other members' typing state yet. `setTyping(_:in:)` sends this user's
typing as a signal that is never stored. `model.lastActivity(of:)` derives
when a member last sent or read a message, for "last seen" hints, and
`model.receipts` holds each member's read position.

## Calls

Calls are live sessions in a conversation. Starting, joining, connecting media
and turning on the microphone or camera are separate steps. A media connection
starts with capture off.

```swift
import ConvoHop
import ConvoHopLiveKit

let live = try await client.conversation(conversationId).live.startVoice().ready()
let participation = try await live.join()
let media = try await participation.connect(.liveKit())
try await media.microphone(true)

let room = media.liveKitRoom // LiveKit's Room, to render remote tracks.

await media.disconnect()
_ = try await participation.leave()
```

Each connection is admitted once, with a single-use token: LiveKit resumes a
dropped connection while that token allows, and `media.reconnect()` makes a
new, admitted connection after that. Pass `onResuming` and `onResumed` to
`.liveKit(...)` to show that a resume is in progress (`media.resuming`), and
`onDisconnected` to hear about a lost connection. A resume must keep the
admitted connection: if LiveKit comes back as another participant, the SDK
closes the connection and calls `onDisconnected`. The SDK never connects twice
with one media credential, and a failed connection's error never includes
LiveKit's error, whose signaling URL can carry the token.

### Incoming calls with CallKit (iOS)

`ConvoHopCalls` receives VoIP pushes through PushKit and rings in CallKit.
Start it in `application(_:didFinishLaunchingWithOptions:)`, because iOS can
launch the app for a VoIP push:

```swift
import ConvoHopCalls
import ConvoHopLiveKit

@main
final class AppDelegate: NSObject, UIApplicationDelegate, ConvoHopCallsDelegate {
    private var media: MediaConnection?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        try? ConvoHopCallKitAudio.prepare()
        ConvoHopCalls.shared.start(
            configuration: ConvoHopCallsConfiguration(ledgerSuiteName: "group.com.example.chat"),
            delegate: self)
        return true
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didUpdateVoIPToken token: Data?) {
        // Send ConvoHopPushToken.hex(token) to your backend, or remove the token when it's nil.
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didAnswer call: ConvoHopCall) {
        Task {
            let participation = try await client.liveSession(call.liveSessionId).join()
            calls.reportConnecting(call.uuid)
            media = try await participation.connect(.liveKit())
            calls.reportConnected(call.uuid)
        }
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didActivate audioSession: AVAudioSession) {
        try? ConvoHopCallKitAudio.activate(audioSession)
        Task { try? await media?.microphone(true) }
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didDeactivate audioSession: AVAudioSession) {
        try? ConvoHopCallKitAudio.deactivate()
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didSetMuted muted: Bool, for call: ConvoHopCall) {
        Task { try? await media?.microphone(!muted) }
    }

    func convoHopCalls(_ calls: ConvoHopCalls, didEnd call: ConvoHopCall, reason: ConvoHopCallEndReason?) {
        Task { await media?.disconnect() }
    }
}
```

- Set `ConvoHopCalls.shared.expectedProjectId` and `expectedRecipientId` at
  sign-in, and clear them at sign-out, so a stale token rings for nobody.
  iOS requires every VoIP push to be reported to CallKit, so a push that
  doesn't ring is reported and ended at once.
- A ring answered or declined on another device gets no push. While a call
  rings, check `client.ringStopReason(alert)` when the conversation's stream
  delivers `live.participationChanged` or `live.ended`, and call
  `ConvoHopCalls.shared.end(call.uuid, reason:)`. A ring stops at its
  `expiresAt` on its own.
- `answer(_:)` answers a ringing call from your own UI.
  `startOutgoingCall(liveSessionId:conversationId:handle:displayName:hasVideo:)`
  shows a call you started in CallKit.
- Your app needs the Voice over IP background mode and the Push Notifications
  capability.

## Push notifications

ConvoHop never stores device tokens. Your backend keeps them, receives
ConvoHop's notification webhooks, builds the push requests with a server SDK,
and sends them with your APNs credentials. See the
[push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md).

```swift
// After sign-in. On iOS, also send the VoIP token from ConvoHopCalls.
let allowed = try await ConvoHopPushRegistration.register()

func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Send ConvoHopPushToken.hex(deviceToken) to your backend.
}
```

`handleNotification(_:)` routes a push or a notification tap. It returns `nil`
for pushes that aren't ConvoHop's, or that belong to another project or user,
for example after a sign-out on a device whose token your backend still holds:

```swift
func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
    guard let target = try? client.handleNotification(response.notification.request.content.userInfo) else { return }
    switch target {
    case .message(let conversation, let messageId):
        openConversation(conversation.conversationId, at: messageId)
    case .call(let conversation, let alert):
        showCall(alert.liveSessionId, in: conversation.conversationId)
    case .callCancelled(let conversation, let alert, let reason):
        if reason.isMissedCall { showMissedCall(alert, in: conversation.conversationId) }
    }
}
```

Delivery is at least once and unordered. For pushes your app processes in the
background, pass a `ConvoHopNotificationLedger` to `handleNotification(_:ledger:)`
to get `nil` for an event you already handled. Route taps without one.

Add `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` and `CONVOHOP_MISSED_CALL` to your
app's `Localizable.strings`: alerts without text show them.

### Message text in a Notification Service Extension

Message pushes carry no message text unless the project opts in to previews.
`ConvoHopNotificationService` handles both cases. When a message push has no
body, it fetches the message with the user's session and shows its text, up
to 1024 characters. When the push already has text, from a preview or your
backend, it delivers the push unchanged. It also delivers the push unchanged
when anything fails or time runs out.

```swift
import ConvoHopNotificationService
import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
    private let service = ConvoHopNotificationService(
        ledger: ConvoHopNotificationLedger(suiteName: "group.com.example.chat")
    ) { notification in
        // A client for notification.recipientId with a short-lived session from your App Group, or nil.
        try await SharedSession.client(for: notification)
    }

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        service.didReceive(request, withContentHandler: contentHandler)
    }

    override func serviceExtensionTimeWillExpire() {
        service.serviceExtensionTimeWillExpire()
    }
}
```

Give the extension's client in-memory recovery storage, and don't write its
session token to disk. Share the ledger's App Group suite with
`ConvoHopCallsConfiguration.ledgerSuiteName`: a missed-call push reaches the
extension, and the ledger stops a late VoIP push for the same ring from
ringing.

## Errors

| Error | When |
| --- | --- |
| `ConvoHopError` | ConvoHop or the SDK's protocol checks refused a request. Classify it by `code`. `outcome` says whether a mutation may have taken effect, `retryAfter` is the delay the authority asked for, and `isRetryable` says whether resending with the same request ID can succeed. Messages never contain credentials. |
| `ConvoHopReplayError` | A replay can't continue as asked, for example `resyncRequired`. |
| `ConvoHopLiveError` | A call action doesn't fit the call's state. |
| `ConvoHopPushPayloadError` | A `convohop` push object is malformed. |
| `ConvoHopUsageError` | The app misused the SDK, for example by retrying a request it never recorded. |
| `ConvoHopAggregateError` | Several failures from one call, such as a failed renewal and a replay that couldn't resume. |

## Differences from `@convohop/client`

This SDK follows the TypeScript [client SDK](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md)
and passes the same [conformance scenarios](https://github.com/ConvoHop/sdks/blob/main/spec/conformance/README.md)
for the user role. It adds the cache, outbox and conversation model, CallKit and
PushKit, and the Notification Service Extension helper. It doesn't verify
webhooks: that belongs in your backend.

## Build and test

```sh
cd swift
swift build
swift test
```

If SwiftPM stops responding in a headless session, add `--disable-keychain`.
To build and test for iOS, use Xcode, or `xcodebuild` with the package's
`ConvoHop-Package` scheme and an iPhone that
`xcrun simctl list devices available` lists:

```sh
xcodebuild test -scheme ConvoHop-Package -destination 'platform=iOS Simulator,name=iPhone 16'
```

To run the [conformance suite](https://github.com/ConvoHop/sdks/blob/main/spec/conformance/README.md)
with the Swift driver, from the repository root:

```sh
swift build --package-path conformance/drivers/swift/Driver
npm run conformance -- --driver conformance/drivers/swift/Driver/.build/debug/ConvoHopConformanceDriver
```

CI also builds the driver on Linux, because only Linux runners can start
the dev stack. Linux isn't a supported app platform. There the driver
doesn't declare realtime, because Ubuntu 24.04's libcurl has no WebSocket
support.

`Sources/ConvoHop/Generated` holds code generated from the schemas: never edit
it. From the repository root, `npm run generate:graphql` regenerates it and
`npm run check:graphql` checks it. See
[SDK generation](https://github.com/ConvoHop/sdks/blob/main/docs/sdk-generation.md).

The unit tests use fakes for HTTP, WebSockets and the network. They don't
prove real WebRTC media, APNs or PushKit delivery, CallKit on a device, or a
hosted service.

| Path | Contents |
| --- | --- |
| `Sources/ConvoHop/Core` | Transport, recovery records, JSON and errors |
| `Sources/ConvoHop/Client` | The client, replay streams, WebSockets and push routing |
| `Sources/ConvoHop/Live` | Conversations, live sessions and media admission |
| `Sources/ConvoHop/Local` | The cache, outbox, conversation model, typing and read receipts |
| `Sources/ConvoHop/Generated` | Generated models and the operation catalog |
| `Sources/ConvoHopPush` | Push payload parsing and the ledger |
| `Sources/ConvoHopCalls` | PushKit and CallKit |
| `Sources/ConvoHopLiveKit` | The LiveKit media room and CallKit audio |
| `Sources/ConvoHopNotificationService` | The Notification Service Extension helper |
| `Tests/ConvoHopTests` | XCTest unit tests and the shared push payload vectors |
