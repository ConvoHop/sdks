# `RelayPush`

Push payload parsing, deduplication, the ring ledger and the push recipient, with Foundation only so app extensions can use it.

**Layer:** Client. **Runtime:** iOS 15 or later, or macOS 12 or later, in an app or an app extension. **Source:** `swift/Sources/RelayPush`.

## Classes

### `RelayNotificationLedger` class

```swift
public final class RelayNotificationLedger: @unchecked Sendable
```

Remembers the notification events this device handled and the rings that stopped.

Delivery is at least once and unordered: a redelivered event has the same `eventId`, and a cancellation can arrive
before its ring. Record each event once, and drop a ring the ledger reports as stopped.

Pass the same App Group suite in your app and its Notification Service Extension to share one ledger. Two processes
writing at the same moment can drop an entry, so treat the ledger as best effort. At sign-out, set `recipient` to
`RelayPushRecipient.nobody` and call `removeAll()`.

#### `RelayNotificationLedger` constructor

```swift
public init(suiteName: String? = nil, capacity: Int = 512)
```

Parameters:

- `suiteName`: An App Group suite to share with your extensions, or `nil` for the app's standard defaults.
- `capacity`: How many event IDs and stopped rings to remember, at least 16.

#### `RelayNotificationLedger.record` method

```swift
@discardableResult
public func record(_ notification: RelayNotification) -> Bool
```

Records the event, and the stopped ring of a cancellation. Returns `false` when the event was already recorded.

#### `RelayNotificationLedger.contains` method

```swift
public func contains(eventId: String) -> Bool
```

Whether the event was recorded.

#### `RelayNotificationLedger.markStopped` method

```swift
public func markStopped(_ alert: RelayCallAlert, reason: RelayCallEndReason)
```

Records that a ring stopped, for example when your app ended it.

#### `RelayNotificationLedger.stopReason` method

```swift
public func stopReason(alertId: String) -> RelayCallEndReason?
```

Why the ring stopped, if a cancellation or stop was recorded for its `alertId`.

#### `RelayNotificationLedger.isStopped` method

```swift
public func isStopped(_ alert: RelayCallAlert, at now: Date = Date()) -> Bool
```

Whether the ring has stopped: a cancellation was recorded or its deadline has passed.

#### `RelayNotificationLedger.recipient` property

```swift
public var recipient: RelayPushRecipient { get set }
```

Whose pushes this device rings for and shows. `RelayPushRecipient.any` until you set one.

It's stored in the ledger's suite, so a Notification Service Extension that shares the suite, and your app
after a relaunch, see it. A stored value this version can't read counts as `RelayPushRecipient.nobody`.

#### `RelayNotificationLedger.removeAll` method

```swift
public func removeAll()
```

Forgets every event and ring. It keeps `recipient`.

## Structs

### `RelayCallAlert` struct

```swift
public struct RelayCallAlert: Sendable, Hashable
```

One ring of a call for one recipient. A later ring of the same call has a new `alertId`.

#### `RelayCallAlert.liveSessionId` property

```swift
public let liveSessionId: String
```

#### `RelayCallAlert.alertId` property

```swift
public let alertId: String
```

#### `RelayCallAlert.expiresAt` property

```swift
public let expiresAt: Date
```

When the ring stops if nobody answers. A cancellation carries the stopped ring's original deadline.

#### `RelayCallAlert.mediaProfile` property

```swift
public let mediaProfile: String
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.

#### `RelayCallAlert.uuid` property

```swift
public let uuid: UUID
```

The ring's CallKit UUID: `alertId`.

#### `RelayCallAlert.hasVideo` property

```swift
public var hasVideo: Bool { get }
```

Whether the call starts with video.

### `RelayCallEndReason` struct

```swift
public struct RelayCallEndReason: RawRepresentable, Hashable, Sendable, CustomStringConvertible
```

Why a ring stopped. The set is open: treat a reason you don't know as "stop ringing", without a missed call.

#### `RelayCallEndReason.rawValue` property

```swift
public let rawValue: String
```

#### `RelayCallEndReason` constructor

```swift
public init(rawValue: String)
```

#### `RelayCallEndReason.answered` static property

```swift
public static let answered = RelayCallEndReason(rawValue: "answered")
```

The recipient answered, on any device. Only stops the ringing.

#### `RelayCallEndReason.declined` static property

```swift
public static let declined = RelayCallEndReason(rawValue: "declined")
```

The recipient declined, on any device. Only stops the ringing.

#### `RelayCallEndReason.ended` static property

```swift
public static let ended = RelayCallEndReason(rawValue: "ended")
```

The call ended or stopped ringing first: a missed call.

#### `RelayCallEndReason.expired` static property

```swift
public static let expired = RelayCallEndReason(rawValue: "expired")
```

Nobody answered by the ring's deadline: a missed call.

#### `RelayCallEndReason.failed` static property

```swift
public static let failed = RelayCallEndReason(rawValue: "failed")
```

This device couldn't handle the call. Relay never sends it; the SDK and your app use it locally.

#### `RelayCallEndReason.isMissedCall` property

```swift
public var isMissedCall: Bool { get }
```

Whether the user missed the call.

#### `RelayCallEndReason.description` property

```swift
public var description: String { get }
```

### `RelayNotification` struct

```swift
public struct RelayNotification: Sendable, Hashable
```

A Relay notification event from an APNs, PushKit or FCM payload.

Events carry identifiers and, only when the project opts in to message previews, visible text. Delivery is at
least once and unordered: deduplicate on `eventId` with `RelayNotificationLedger`.

#### `RelayNotification.eventId` property

```swift
public let eventId: String
```

#### `RelayNotification.eventType` property

```swift
public let eventType: String
```

`notification.message`, `notification.call` or `notification.callCancelled`.

#### `RelayNotification.projectId` property

```swift
public let projectId: String
```

#### `RelayNotification.recipientId` property

```swift
public let recipientId: String
```

#### `RelayNotification.conversationId` property

```swift
public let conversationId: String
```

#### `RelayNotification.senderId` property

```swift
public let senderId: String
```

#### `RelayNotification.occurredAt` property

```swift
public let occurredAt: Date
```

#### `RelayNotification.title` property

```swift
public let title: String?
```

The visible title, if the push carries one.

#### `RelayNotification.body` property

```swift
public let body: String?
```

The visible body, if the push carries one: your backend's text or, when the project opts in, the message
preview. Absent by default.

#### `RelayNotification.kind` property

```swift
public let kind: Kind
```

#### `RelayNotification.callAlert` property

```swift
public var callAlert: RelayCallAlert? { get }
```

The ring, for calls and cancellations.

#### `RelayNotification` constructor

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

#### `RelayNotification.parse` static method

```swift
public static func parse(userInfo: [AnyHashable: Any]) throws -> RelayNotification?
```

Reads a push's `userInfo` like `init(userInfo:)`, but throws `RelayPushPayloadError` when the `convohop`
object is malformed.

Returns `nil` when the push has no `convohop` object or its event type isn't one this SDK supports.

## Enums

### `RelayDeliveredNotifications` enum

```swift
public enum RelayDeliveredNotifications
```

Removes notifications that iOS or macOS already shows for a ring.

#### `RelayDeliveredNotifications.remove` static method

```swift
public static func remove(alertId: String) async
```

Removes delivered notifications whose `convohop.alertId` is `alertId`.

A ring the user answered or declined gets no push, so an incoming-call alert stays until your app removes it.

### `RelayNotification.Kind` enum

```swift
public enum Kind: Sendable, Hashable
```

#### `RelayNotification.Kind.message` case

```swift
case message(messageId: String)
```

A new message. Open the conversation; fetch the message with the user's session.

#### `RelayNotification.Kind.call` case

```swift
case call(RelayCallAlert)
```

An incoming call. On iOS, report it to CallKit.

#### `RelayNotification.Kind.callCancelled` case

```swift
case callCancelled(RelayCallAlert, reason: RelayCallEndReason)
```

A ring stopped. `reason` `RelayCallEndReason.ended` and `RelayCallEndReason.expired` are missed
calls.

### `RelayPushPayloadError` enum

```swift
public enum RelayPushPayloadError: Error, Sendable, Equatable, CustomStringConvertible, LocalizedError
```

A payload that isn't a Relay notification event under the push payload contract.

#### `RelayPushPayloadError.missing` case

```swift
case missing
```

The payload has no `convohop` object.

#### `RelayPushPayloadError.notAnObject` case

```swift
case notAnObject
```

`convohop` isn't a JSON object.

#### `RelayPushPayloadError.unsupportedEventType` case

```swift
case unsupportedEventType(String)
```

An event type this SDK doesn't know. Ignore the push.

#### `RelayPushPayloadError.invalidField` case

```swift
case invalidField(String)
```

A field the event type requires is missing or malformed.

#### `RelayPushPayloadError.description` property

```swift
public var description: String { get }
```

#### `RelayPushPayloadError.errorDescription` property

```swift
public var errorDescription: String? { get }
```

### `RelayPushRecipient` enum

```swift
public enum RelayPushRecipient: Sendable, Hashable
```

Whose Relay pushes this device rings for and shows.

Set it at sign-in to the signed-in user, and to `nobody` at sign-out: your backend can still hold the device's
tokens, and their pushes keep arriving. Store it with `RelayNotificationLedger.recipient`, or set
`RelayCalls.recipient`, so your Notification Service Extension and a relaunch for a VoIP push see it.

#### `RelayPushRecipient.any` case

```swift
case any
```

Every Relay push. The default until you set a recipient.

#### `RelayPushRecipient.only` case

```swift
case only(projectId: String, recipientId: String)
```

Only pushes for this user in this project.

#### `RelayPushRecipient.nobody` case

```swift
case nobody
```

No Relay push, for example after sign-out.

#### `RelayPushRecipient.accepts` method

```swift
public func accepts(_ notification: RelayNotification) -> Bool
```

Whether the push is for this recipient.

### `RelayPushToken` enum

```swift
public enum RelayPushToken
```

Device tokens for your backend. Relay never stores them.

#### `RelayPushToken.hex` static method

```swift
public static func hex(_ token: Data) -> String
```

An APNs or PushKit token as lowercase hex, the form APNs requests use.
