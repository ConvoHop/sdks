# `ConvoHopPush`

Push payload parsing, deduplication, the ring ledger and the push recipient, with Foundation only so app extensions can use it.

**Layer:** Client. **Runtime:** iOS 15 or later, or macOS 12 or later, in an app or an app extension. **Source:** `swift/Sources/ConvoHopPush`.

## Classes

### `ConvoHopNotificationLedger` class

```swift
public final class ConvoHopNotificationLedger: @unchecked Sendable
```

Remembers the notification events this device handled and the rings that stopped.

Delivery is at least once and unordered: a redelivered event has the same `eventId`, and a cancellation can arrive
before its ring. Record each event once, and drop a ring the ledger reports as stopped.

Pass the same App Group suite in your app and its Notification Service Extension to share one ledger. Two processes
writing at the same moment can drop an entry, so treat the ledger as best effort. At sign-out, set `recipient` to
`ConvoHopPushRecipient.nobody` and call `removeAll()`.

#### `ConvoHopNotificationLedger` constructor

```swift
public init(suiteName: String? = nil, capacity: Int = 512)
```

Parameters:

- `suiteName`: An App Group suite to share with your extensions, or `nil` for the app's standard defaults.
- `capacity`: How many event IDs and stopped rings to remember, at least 16.

#### `ConvoHopNotificationLedger.record` method

```swift
@discardableResult
public func record(_ notification: ConvoHopNotification) -> Bool
```

Records the event, and the stopped ring of a cancellation. Returns `false` when the event was already recorded.

#### `ConvoHopNotificationLedger.contains` method

```swift
public func contains(eventId: String) -> Bool
```

Whether the event was recorded.

#### `ConvoHopNotificationLedger.markStopped` method

```swift
public func markStopped(_ alert: ConvoHopCallAlert, reason: ConvoHopCallEndReason)
```

Records that a ring stopped, for example when your app ended it.

#### `ConvoHopNotificationLedger.stopReason` method

```swift
public func stopReason(alertId: String) -> ConvoHopCallEndReason?
```

Why the ring stopped, if a cancellation or stop was recorded for its `alertId`.

#### `ConvoHopNotificationLedger.isStopped` method

```swift
public func isStopped(_ alert: ConvoHopCallAlert, at now: Date = Date()) -> Bool
```

Whether the ring has stopped: a cancellation was recorded or its deadline has passed.

#### `ConvoHopNotificationLedger.recipient` property

```swift
public var recipient: ConvoHopPushRecipient { get set }
```

Whose pushes this device rings for and shows. `ConvoHopPushRecipient.any` until you set one.

It's stored in the ledger's suite, so a Notification Service Extension that shares the suite, and your app
after a relaunch, see it. A stored value this version can't read counts as `ConvoHopPushRecipient.nobody`.

#### `ConvoHopNotificationLedger.removeAll` method

```swift
public func removeAll()
```

Forgets every event and ring. It keeps `recipient`.

## Structs

### `ConvoHopCallAlert` struct

```swift
public struct ConvoHopCallAlert: Sendable, Hashable
```

One ring of a call for one recipient. A later ring of the same call has a new `alertId`.

#### `ConvoHopCallAlert.liveSessionId` property

```swift
public let liveSessionId: String
```

#### `ConvoHopCallAlert.alertId` property

```swift
public let alertId: String
```

#### `ConvoHopCallAlert.expiresAt` property

```swift
public let expiresAt: Date
```

When the ring stops if nobody answers. A cancellation carries the stopped ring's original deadline.

#### `ConvoHopCallAlert.mediaProfile` property

```swift
public let mediaProfile: String
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.

#### `ConvoHopCallAlert.uuid` property

```swift
public let uuid: UUID
```

The ring's CallKit UUID: `alertId`.

#### `ConvoHopCallAlert.hasVideo` property

```swift
public var hasVideo: Bool { get }
```

Whether the call starts with video.

### `ConvoHopCallEndReason` struct

```swift
public struct ConvoHopCallEndReason: RawRepresentable, Hashable, Sendable, CustomStringConvertible
```

Why a ring stopped. The set is open: treat a reason you don't know as "stop ringing", without a missed call.

#### `ConvoHopCallEndReason.rawValue` property

```swift
public let rawValue: String
```

#### `ConvoHopCallEndReason` constructor

```swift
public init(rawValue: String)
```

#### `ConvoHopCallEndReason.answered` static property

```swift
public static let answered = ConvoHopCallEndReason(rawValue: "answered")
```

The recipient answered, on any device. Only stops the ringing.

#### `ConvoHopCallEndReason.declined` static property

```swift
public static let declined = ConvoHopCallEndReason(rawValue: "declined")
```

The recipient declined, on any device. Only stops the ringing.

#### `ConvoHopCallEndReason.ended` static property

```swift
public static let ended = ConvoHopCallEndReason(rawValue: "ended")
```

The call ended or stopped ringing first: a missed call.

#### `ConvoHopCallEndReason.expired` static property

```swift
public static let expired = ConvoHopCallEndReason(rawValue: "expired")
```

Nobody answered by the ring's deadline: a missed call.

#### `ConvoHopCallEndReason.failed` static property

```swift
public static let failed = ConvoHopCallEndReason(rawValue: "failed")
```

This device couldn't handle the call. ConvoHop never sends it; the SDK and your app use it locally.

#### `ConvoHopCallEndReason.isMissedCall` property

```swift
public var isMissedCall: Bool { get }
```

Whether the user missed the call.

#### `ConvoHopCallEndReason.description` property

```swift
public var description: String { get }
```

### `ConvoHopNotification` struct

```swift
public struct ConvoHopNotification: Sendable, Hashable
```

A ConvoHop notification event from an APNs, PushKit or FCM payload.

Events carry identifiers and, only when the project opts in to message previews, visible text. Delivery is at
least once and unordered: deduplicate on `eventId` with `ConvoHopNotificationLedger`.

#### `ConvoHopNotification.eventId` property

```swift
public let eventId: String
```

#### `ConvoHopNotification.eventType` property

```swift
public let eventType: String
```

`notification.message`, `notification.call` or `notification.callCancelled`.

#### `ConvoHopNotification.projectId` property

```swift
public let projectId: String
```

#### `ConvoHopNotification.recipientId` property

```swift
public let recipientId: String
```

#### `ConvoHopNotification.conversationId` property

```swift
public let conversationId: String
```

#### `ConvoHopNotification.senderId` property

```swift
public let senderId: String
```

#### `ConvoHopNotification.occurredAt` property

```swift
public let occurredAt: Date
```

#### `ConvoHopNotification.title` property

```swift
public let title: String?
```

The visible title, if the push carries one.

#### `ConvoHopNotification.body` property

```swift
public let body: String?
```

The visible body, if the push carries one: your backend's text or, when the project opts in, the message
preview. Absent by default.

#### `ConvoHopNotification.kind` property

```swift
public let kind: Kind
```

#### `ConvoHopNotification.callAlert` property

```swift
public var callAlert: ConvoHopCallAlert? { get }
```

The ring, for calls and cancellations.

#### `ConvoHopNotification` constructor

```swift
public init?(userInfo: [AnyHashable: Any])
public init(jsonObject: Any) throws
public init(jsonData: Data) throws
```

Reads the `convohop` object of a push's `userInfo`, and the visible text of an APNs alert.

Returns `nil` when the push has no valid `convohop` object or it isn't a notification event this SDK supports.
Fields the contract doesn't define are ignored.

Validates a `convohop` object: a dictionary, or its JSON text as FCM data carries it.

Validates the JSON text of a `convohop` object.

#### `ConvoHopNotification.parse` static method

```swift
public static func parse(userInfo: [AnyHashable: Any]) throws -> ConvoHopNotification?
```

Reads a push's `userInfo` like `init(userInfo:)`, but throws `ConvoHopPushPayloadError` when the `convohop`
object is malformed.

Returns `nil` when the push has no `convohop` object or its event type isn't one this SDK supports.

## Enums

### `ConvoHopDeliveredNotifications` enum

```swift
public enum ConvoHopDeliveredNotifications
```

Removes notifications that iOS or macOS already shows for a ring.

#### `ConvoHopDeliveredNotifications.remove` static method

```swift
public static func remove(alertId: String) async
```

Removes delivered notifications whose `convohop.alertId` is `alertId`.

A ring the user answered or declined gets no push, so an incoming-call alert stays until your app removes it.

### `ConvoHopNotification.Kind` enum

```swift
public enum Kind: Sendable, Hashable
```

#### `ConvoHopNotification.Kind.message` case

```swift
case message(messageId: String)
```

A new message. Open the conversation; fetch the message with the user's session.

#### `ConvoHopNotification.Kind.call` case

```swift
case call(ConvoHopCallAlert)
```

An incoming call. On iOS, report it to CallKit.

#### `ConvoHopNotification.Kind.callCancelled` case

```swift
case callCancelled(ConvoHopCallAlert, reason: ConvoHopCallEndReason)
```

A ring stopped. `reason` `ConvoHopCallEndReason.ended` and `ConvoHopCallEndReason.expired` are missed
calls.

### `ConvoHopPushPayloadError` enum

```swift
public enum ConvoHopPushPayloadError: Error, Sendable, Equatable, CustomStringConvertible, LocalizedError
```

A payload that isn't a ConvoHop notification event under the push payload contract.

#### `ConvoHopPushPayloadError.missing` case

```swift
case missing
```

The payload has no `convohop` object.

#### `ConvoHopPushPayloadError.notAnObject` case

```swift
case notAnObject
```

`convohop` isn't a JSON object.

#### `ConvoHopPushPayloadError.unsupportedEventType` case

```swift
case unsupportedEventType(String)
```

An event type this SDK doesn't know. Ignore the push.

#### `ConvoHopPushPayloadError.invalidField` case

```swift
case invalidField(String)
```

A field the event type requires is missing or malformed.

#### `ConvoHopPushPayloadError.description` property

```swift
public var description: String { get }
```

#### `ConvoHopPushPayloadError.errorDescription` property

```swift
public var errorDescription: String? { get }
```

### `ConvoHopPushRecipient` enum

```swift
public enum ConvoHopPushRecipient: Sendable, Hashable
```

Whose ConvoHop pushes this device rings for and shows.

Set it at sign-in to the signed-in user, and to `nobody` at sign-out: your backend can still hold the device's
tokens, and their pushes keep arriving. Store it with `ConvoHopNotificationLedger.recipient`, or set
`ConvoHopCalls.recipient`, so your Notification Service Extension and a relaunch for a VoIP push see it.

#### `ConvoHopPushRecipient.any` case

```swift
case any
```

Every ConvoHop push. The default until you set a recipient.

#### `ConvoHopPushRecipient.only` case

```swift
case only(projectId: String, recipientId: String)
```

Only pushes for this user in this project.

#### `ConvoHopPushRecipient.nobody` case

```swift
case nobody
```

No ConvoHop push, for example after sign-out.

#### `ConvoHopPushRecipient.accepts` method

```swift
public func accepts(_ notification: ConvoHopNotification) -> Bool
```

Whether the push is for this recipient.

### `ConvoHopPushToken` enum

```swift
public enum ConvoHopPushToken
```

Device tokens for your backend. ConvoHop never stores them.

#### `ConvoHopPushToken.hex` static method

```swift
public static func hex(_ token: Data) -> String
```

An APNs or PushKit token as lowercase hex, the form APNs requests use.
