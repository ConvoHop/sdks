# `RelayCalls`

Incoming calls from PushKit VoIP pushes to CallKit, and outgoing calls through CallKit.

**Layer:** Client. **Runtime:** iOS 15 or later. On macOS it has only the call model. **Source:** `swift/Sources/RelayCalls`.

## Classes

### `RelayCalls` class

```swift
@MainActor
public final class RelayCalls: NSObject
extension RelayCalls: PKPushRegistryDelegate
extension RelayCalls: CXProviderDelegate
```

Reports Relay calls to CallKit and receives VoIP pushes through PushKit.

Call `start(configuration:delegate:)` in `application(_:didFinishLaunchingWithOptions:)`: iOS can launch your
app for a VoIP push, and terminates an app that doesn't report each one to CallKit. This class reports every VoIP
push. A push it doesn't ring for, such as one for someone other than `recipient`, is reported and ended at once.

Answered and declined rings get no push. When realtime or `RelayClient.ringStopReason(_:)` shows that a ringing
call stopped, call `end(_:reason:)` with the reason.

Available on iOS only.

#### `RelayCalls.shared` static property

```swift
public static let shared = RelayCalls()
```

#### `RelayCalls.delegate` property

```swift
public private(set) weak var delegate: RelayCallsDelegate?
```

#### `RelayCalls.configuration` property

```swift
public private(set) var configuration: RelayCallsConfiguration
```

#### `RelayCalls.ledger` property

```swift
public private(set) var ledger: RelayNotificationLedger
```

Remembers handled pushes and stopped rings. Share its suite with your Notification Service Extension.

#### `RelayCalls.voipToken` property

```swift
public private(set) var voipToken: Data?
```

The PushKit VoIP token, once iOS issued one.

#### `RelayCalls.recipient` property

```swift
public var recipient: RelayPushRecipient { get set }
```

Whose calls ring. `RelayPushRecipient.any` until you set one.

Set `.only(projectId:recipientId:)` at sign-in and `RelayPushRecipient.nobody` at sign-out. It's
stored in the ledger's suite, so it holds when iOS relaunches your app for a VoIP push, and a Notification
Service Extension on the same suite hides the text of other users' pushes.

#### `RelayCalls.calls` property

```swift
public var calls: [RelayCall] { get }
```

The calls, oldest first. An ended call stays for a minute.

#### `RelayCalls.start` method

```swift
public func start(
    configuration: RelayCallsConfiguration = RelayCallsConfiguration(),
    delegate: RelayCallsDelegate?
)
```

Sets up CallKit and PushKit. Call it again to change the configuration or delegate.

#### `RelayCalls.handle` method

```swift
public func handle(_ notification: RelayNotification)
```

Handles a Relay notification that arrived outside PushKit, such as an alert push.

A ring rings in CallKit unless it already rang, stopped or expired. A cancellation ends the ringing call,
records the stop and removes delivered notifications for the ring.

#### `RelayCalls.startOutgoingCall` method

```swift
@discardableResult
public func startOutgoingCall(
    liveSessionId: String,
    conversationId: String,
    handle: String? = nil,
    displayName: String? = nil,
    hasVideo: Bool = false
) async throws -> UUID
```

Starts an outgoing call in CallKit. Start the live session with Relay first.

Parameters:

- `handle`: What CallKit shows and stores in Recents. Defaults to the conversation ID.

Returns: The CallKit UUID.

#### `RelayCalls.reportConnecting` method

```swift
public func reportConnecting(_ uuid: UUID)
```

Reports that media connects for an answered or outgoing call.

#### `RelayCalls.reportConnected` method

```swift
public func reportConnected(_ uuid: UUID)
```

Reports that media connected for an answered or outgoing call.

#### `RelayCalls.update` method

```swift
public func update(_ uuid: UUID, localizedCallerName: String? = nil, hasVideo: Bool? = nil)
```

Updates what CallKit shows for a call.

#### `RelayCalls.answer` method

```swift
public func answer(_ uuid: UUID) async throws
```

Asks CallKit to answer a ringing call, for example from an in-app Answer button.
`RelayCallsDelegate.relayCalls(_:didAnswer:)` follows, as when the user answers in the system UI.

Throws: `CXErrorCodeRequestTransactionError.unknownCallUUID` for a call Relay didn't report, or
`.invalidAction` for a call that isn't ringing, before asking CallKit.

#### `RelayCalls.setMuted` method

```swift
public func setMuted(_ muted: Bool, for uuid: UUID) async throws
```

Asks CallKit to mute or unmute. `RelayCallsDelegate.relayCalls(_:didSetMuted:for:)` applies it.

#### `RelayCalls.setHeld` method

```swift
public func setHeld(_ onHold: Bool, for uuid: UUID) async throws
```

Asks CallKit to hold or resume. `RelayCallsDelegate.relayCalls(_:didSetHeld:for:)` applies it.

#### `RelayCalls.end` method

```swift
public func end(_ uuid: UUID, reason: RelayCallEndReason? = nil) async throws
```

Ends a call.

Parameters:

- `reason`: `nil` when the user ends the call in your app, which asks CallKit to end it. Otherwise
  why the call stopped elsewhere, for example `answered` when another device answered the ring.

#### `RelayCalls.forget` method

```swift
@discardableResult
public func forget(_ uuid: UUID) -> Bool
```

Forgets an ended call before its minute is up. Returns `false` for a call that hasn't ended.

#### `RelayCalls.addObserver` method

```swift
public func addObserver(
    _ handler: @escaping @MainActor ([RelayCall]) -> Void
) -> RelayCallsObservation
```

Calls `handler` with `calls` now and whenever they change, until you cancel or release the observation.

#### `RelayCalls.pushRegistry(_:didUpdate:for:)` method

```swift
nonisolated public func pushRegistry(
    _ registry: PKPushRegistry,
    didUpdate pushCredentials: PKPushCredentials,
    for type: PKPushType
)
```

#### `RelayCalls.pushRegistry(_:didInvalidatePushTokenFor:)` method

```swift
nonisolated public func pushRegistry(
    _ registry: PKPushRegistry,
    didInvalidatePushTokenFor type: PKPushType
)
```

#### `RelayCalls.pushRegistry(_:didReceiveIncomingPushWith:for:completion:)` method

```swift
nonisolated public func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
)
```

#### `RelayCalls.providerDidReset` method

```swift
nonisolated public func providerDidReset(_ provider: CXProvider)
```

#### `RelayCalls.provider(_:perform:)` method

```swift
nonisolated public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction)
nonisolated public func provider(_ provider: CXProvider, perform action: CXEndCallAction)
nonisolated public func provider(_ provider: CXProvider, perform action: CXStartCallAction)
nonisolated public func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction)
nonisolated public func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction)
```

#### `RelayCalls.provider(_:didActivate:)` method

```swift
nonisolated public func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession)
```

#### `RelayCalls.provider(_:didDeactivate:)` method

```swift
nonisolated public func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession)
```

### `RelayCallsObservation` class

```swift
public final class RelayCallsObservation: @unchecked Sendable
```

Keeps a `addObserver(_:)` handler running. Cancel or release it to stop.

Available on iOS only.

#### `RelayCallsObservation.cancel` method

```swift
public func cancel()
```

## Structs

### `RelayCall` struct

```swift
public struct RelayCall: Identifiable, Hashable, Sendable
```

A call that Relay reported to CallKit.

#### `RelayCall.uuid` property

```swift
public let uuid: UUID
```

The CallKit UUID. For an incoming call, the ring's `alertId`.

#### `RelayCall.id` property

```swift
public var id: UUID { get }
```

#### `RelayCall.isOutgoing` property

```swift
public let isOutgoing: Bool
```

#### `RelayCall.conversationId` property

```swift
public let conversationId: String
```

#### `RelayCall.liveSessionId` property

```swift
public let liveSessionId: String
```

#### `RelayCall.handle` property

```swift
public let handle: String
```

The CallKit handle: the conversation ID unless you started the call with another.

#### `RelayCall.alert` property

```swift
public let alert: RelayCallAlert?
```

The ring, for an incoming call.

#### `RelayCall.eventId` property

```swift
public let eventId: String?
```

The push event that rang the call.

#### `RelayCall.callerId` property

```swift
public let callerId: String?
```

Who started the ringing, for an incoming call.

#### `RelayCall.mediaProfile` property

```swift
public let mediaProfile: String
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.

#### `RelayCall.callerName` property

```swift
public internal(set) var callerName: String?
```

#### `RelayCall.hasVideo` property

```swift
public internal(set) var hasVideo: Bool
```

#### `RelayCall.isMuted` property

```swift
public internal(set) var isMuted: Bool
```

#### `RelayCall.isOnHold` property

```swift
public internal(set) var isOnHold: Bool
```

#### `RelayCall.state` property

```swift
public internal(set) var state: State
```

#### `RelayCall.endedAt` property

```swift
public internal(set) var endedAt: Date?
```

#### `RelayCall.expiresAt` property

```swift
public var expiresAt: Date? { get }
```

When an incoming ring stops if nobody answers.

#### `RelayCall.isEnded` property

```swift
public var isEnded: Bool { get }
```

### `RelayCallsConfiguration` struct

```swift
public struct RelayCallsConfiguration: Sendable
```

How `RelayCalls` sets up CallKit.

Available on iOS only.

#### `RelayCallsConfiguration.supportsVideo` property

```swift
public var supportsVideo: Bool
```

#### `RelayCallsConfiguration.supportsHolding` property

```swift
public var supportsHolding: Bool
```

#### `RelayCallsConfiguration.maximumCallGroups` property

```swift
public var maximumCallGroups: Int
```

#### `RelayCallsConfiguration.maximumCallsPerCallGroup` property

```swift
public var maximumCallsPerCallGroup: Int
```

#### `RelayCallsConfiguration.includesCallsInRecents` property

```swift
public var includesCallsInRecents: Bool
```

#### `RelayCallsConfiguration.ringtoneSound` property

```swift
public var ringtoneSound: String?
```

A sound file in your app bundle, or `nil` for the system ringtone.

#### `RelayCallsConfiguration.iconTemplateImageData` property

```swift
public var iconTemplateImageData: Data?
```

A 40 × 40 pt template image, in PNG data, for the in-call button that opens your app.

#### `RelayCallsConfiguration.ledgerSuiteName` property

```swift
public var ledgerSuiteName: String?
```

The App Group suite your Notification Service Extension shares, or `nil` for the app's own defaults. It stores
the ledger and `recipient`.

#### `RelayCallsConfiguration.callerName` property

```swift
public var callerName: @Sendable (RelayNotification) -> String?
```

The caller name CallKit shows. Defaults to the push `title`, which the server sends only when the project
opts in to previews.

#### `RelayCallsConfiguration` constructor

```swift
public init(
    supportsVideo: Bool = true,
    supportsHolding: Bool = false,
    maximumCallGroups: Int = 1,
    maximumCallsPerCallGroup: Int = 1,
    includesCallsInRecents: Bool = true,
    ringtoneSound: String? = nil,
    iconTemplateImageData: Data? = nil,
    ledgerSuiteName: String? = nil,
    callerName: @escaping @Sendable (RelayNotification) -> String? = { $0.title }
)
```

## Interfaces

### `RelayCallsDelegate` interface

```swift
@MainActor
public protocol RelayCallsDelegate: AnyObject
```

Receives what CallKit and PushKit report. Every method has an empty default.

Available on iOS only.

#### `RelayCallsDelegate.relayCalls(_:didUpdateVoIPToken:)` method

```swift
func relayCalls(_ calls: RelayCalls, didUpdateVoIPToken token: Data?)
```

Send the VoIP token, as `RelayPushToken.hex(_:)`, to your backend, which sends VoIP pushes for calls.
Relay never stores device tokens. `nil` means iOS invalidated the token: remove it from your backend.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCalls(_:didReceiveIncomingCall:)` method

```swift
func relayCalls(_ calls: RelayCalls, didReceiveIncomingCall call: RelayCall)
```

A call rings in CallKit.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCalls(_:didAnswer:)` method

```swift
func relayCalls(_ calls: RelayCalls, didAnswer call: RelayCall)
```

The user answered. Join the live session, connect media and call `reportConnected(_:)`.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCalls(_:didStartOutgoing:)` method

```swift
func relayCalls(_ calls: RelayCalls, didStartOutgoing call: RelayCall)
```

CallKit started the call from `startOutgoingCall(liveSessionId:conversationId:handle:displayName:hasVideo:)`.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCalls(_:didEnd:reason:)` method

```swift
func relayCalls(_ calls: RelayCalls, didEnd call: RelayCall, reason: RelayCallEndReason?)
```

The call ended. `reason` is `nil` when the user ended or declined it. Leave the call and disconnect media.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCalls(_:didSetMuted:for:)` method

```swift
func relayCalls(_ calls: RelayCalls, didSetMuted muted: Bool, for call: RelayCall)
```

Mute or unmute the microphone. This is the only place to do it, for the system UI and for your app.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCalls(_:didSetHeld:for:)` method

```swift
func relayCalls(_ calls: RelayCalls, didSetHeld onHold: Bool, for call: RelayCall)
```

Hold or resume the call.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCalls(_:didActivate:)` method

```swift
func relayCalls(_ calls: RelayCalls, didActivate audioSession: AVAudioSession)
```

CallKit activated the audio session. Start call audio now, not before.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCalls(_:didDeactivate:)` method

```swift
func relayCalls(_ calls: RelayCalls, didDeactivate audioSession: AVAudioSession)
```

CallKit deactivated the audio session.

Has a default implementation, so conforming types may omit it.

#### `RelayCallsDelegate.relayCallsDidReset` method

```swift
func relayCallsDidReset(_ calls: RelayCalls)
```

CallKit reset. Every call ended as `failed`, and `relayCalls(_:didEnd:reason:)` ran for each.

Has a default implementation, so conforming types may omit it.

## Enums

### `RelayCall.State` enum

```swift
public enum State: Hashable, Sendable
```

#### `RelayCall.State.ringing` case

```swift
case ringing
```

An incoming call rings.

#### `RelayCall.State.answered` case

```swift
case answered
```

The user answered. Join the call and connect media, then report it connected.

#### `RelayCall.State.connecting` case

```swift
case connecting
```

Media connects.

#### `RelayCall.State.connected` case

```swift
case connected
```

#### `RelayCall.State.ended` case

```swift
case ended(RelayCallEndReason?)
```

The call ended. `nil` means the user ended or declined it; otherwise why the call stopped.
