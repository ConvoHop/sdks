# `ConvoHopNotificationService`

A Notification Service Extension helper that fetches message text on the device when a push has none, and hides the text of other users' pushes.

**Layer:** Client. **Runtime:** iOS 15 or later, or macOS 12 or later, in a Notification Service Extension. **Source:** `swift/Sources/ConvoHopNotificationService`.

## Classes

### `ConvoHopNotificationService` class

```swift
public final class ConvoHopNotificationService: @unchecked Sendable
```

Shows message text in a Notification Service Extension when a push carries only metadata, and hides the text of
pushes for anyone but the signed-in user.

ConvoHop's message pushes carry no message text unless the project opts in to previews; the alert then shows the
`CONVOHOP_MESSAGE` string from your app's `Localizable.strings`. This helper fetches the message with the user's
session and replaces the body with its text. It delivers the push unchanged when:

- the push isn't a ConvoHop message, for example a call or a missed call;
- the push already has a body, because the project opted in to previews or your backend sent text;
- your factory returns no client, or a client for another project or user;
- the message was deleted or has no text;
- anything fails, or the time runs out.

With a ledger, a push for anyone but the ledger's `ConvoHopNotificationLedger.recipient`, such as one that
reaches the device after sign-out, is delivered without its text: no title, and the `CONVOHOP_MESSAGE`,
`CONVOHOP_CALL` or `CONVOHOP_MISSED_CALL` string as the body. So is a ConvoHop push this version can't read,
unless the recipient is `ConvoHopPushRecipient.any`. Without Apple's notification filtering entitlement, iOS
shows every alert push, so the helper hides the text instead of dropping the push.

```swift snippet=docs/languages/swift/examples/Sources/Examples/NotificationService.swift#notification-service
final class NotificationService: UNNotificationServiceExtension {
    private let service = ConvoHopNotificationService(
        ledger: ConvoHopNotificationLedger(suiteName: "group.com.example.chat")
    ) { notification in
        // A client for notification.recipientId with its own short-lived session, kept in memory
        // (for example, fetched from your backend), or nil.
        try await ExtensionSession.client(for: notification)
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

Create the client with in-memory recovery storage, and don't persist its session token.

A missed-call push reaches the extension, not your app. Pass a ledger on the App Group suite that
`ConvoHopCallsConfiguration.ledgerSuiteName` names, so `ConvoHopCalls` doesn't ring for a VoIP push of that ring that
arrives later, and so the extension sees the recipient your app sets.

#### `ConvoHopNotificationService.maximumBodyLength` static property

```swift
public static let maximumBodyLength = 1024
```

The most characters of message text the body shows.

#### `ConvoHopNotificationService` constructor

```swift
public init(
    timeout: TimeInterval = 20,
    ledger: ConvoHopNotificationLedger? = nil,
    client: @escaping ClientFactory
)
```

Parameters:

- `timeout`: How long to wait for the message, in seconds. iOS gives an extension about 30.
- `ledger`: Shared with your app through an App Group: where to record rings that stopped, and whose pushes to
  show.
- `client`: Creates a client for the push.

#### `ConvoHopNotificationService.didReceive` method

```swift
public func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
)
```

Call it from `UNNotificationServiceExtension.didReceive(_:withContentHandler:)`. It calls `contentHandler`
exactly once.

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `ConvoHopNotificationService.serviceExtensionTimeWillExpire` method

```swift
public func serviceExtensionTimeWillExpire()
```

Call it from `UNNotificationServiceExtension.serviceExtensionTimeWillExpire()`. It delivers pending pushes
unchanged.

## Types

### `ConvoHopNotificationService.ClientFactory` type

```swift
public typealias ClientFactory = @Sendable (ConvoHopNotification) async throws -> ConvoHopClient?
```

Returns a client for the push's project and recipient, or `nil` to deliver the push unchanged.
