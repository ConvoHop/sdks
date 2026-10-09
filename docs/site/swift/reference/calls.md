# `ConvoHopCalls`

Incoming calls from PushKit VoIP pushes to CallKit, and outgoing calls through CallKit.

**Layer:** Client. **Runtime:** iOS 15 or later. On macOS it has only the call model. **Source:** `swift/Sources/ConvoHopCalls`.

## Classes

### `ConvoHopCalls` class

```swift
@MainActor
public final class ConvoHopCalls: NSObject
extension ConvoHopCalls: PKPushRegistryDelegate
extension ConvoHopCalls: CXProviderDelegate
```

Reports ConvoHop calls to CallKit and receives VoIP pushes through PushKit.

Call `start(configuration:delegate:)` in `application(_:didFinishLaunchingWithOptions:)`: iOS can launch your
app for a VoIP push, and terminates an app that doesn't report each one to CallKit. This class reports every VoIP
push. A push it doesn't ring for, such as one for someone other than `recipient`, is reported and ended at once.

Answered and declined rings get no push. When realtime or `ConvoHopClient.ringStopReason(_:)` shows that a ringing
call stopped, call `end(_:reason:)` with the reason.

Available on iOS only.

#### `ConvoHopCalls.shared` static property

```swift
public static let shared = ConvoHopCalls()
```

#### `ConvoHopCalls.delegate` property

```swift
public private(set) weak var delegate: ConvoHopCallsDelegate?
```

#### `ConvoHopCalls.configuration` property

```swift
public private(set) var configuration: ConvoHopCallsConfiguration
```

#### `ConvoHopCalls.ledger` property

```swift
public private(set) var ledger: ConvoHopNotificationLedger
```

Remembers handled pushes and stopped rings. Share its suite with your Notification Service Extension.

#### `ConvoHopCalls.voipToken` property

```swift
public private(set) var voipToken: Data?
```

The PushKit VoIP token, once iOS issued one.

#### `ConvoHopCalls.recipient` property

```swift
public var recipient: ConvoHopPushRecipient { get set }
```

Whose calls ring. `ConvoHopPushRecipient.any` until you set one.

Set `.only(projectId:recipientId:)` at sign-in and `ConvoHopPushRecipient.nobody` at sign-out. It's
stored in the ledger's suite, so it holds when iOS relaunches your app for a VoIP push, and a Notification
Service Extension on the same suite hides the text of other users' pushes.

#### `ConvoHopCalls.calls` property

```swift
public var calls: [ConvoHopCall] { get }
```

The calls, oldest first. An ended call stays for a minute.

#### `ConvoHopCalls.start` method

```swift
public func start(
    configuration: ConvoHopCallsConfiguration = ConvoHopCallsConfiguration(),
    delegate: ConvoHopCallsDelegate?
)
```

Sets up CallKit and PushKit. Call it again to change the configuration or delegate.

#### `ConvoHopCalls.handle` method

```swift
public func handle(_ notification: ConvoHopNotification)
```

Handles a ConvoHop notification that arrived outside PushKit, such as an alert push.

A ring rings in CallKit unless it already rang, stopped or expired. A cancellation ends the ringing call,
records the stop and removes delivered notifications for the ring.

#### `ConvoHopCalls.startOutgoingCall` method

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

Starts an outgoing call in CallKit. Start the live session with ConvoHop first.

Parameters:

- `handle`: What CallKit shows and stores in Recents. Defaults to the conversation ID.

Returns: The CallKit UUID.

#### `ConvoHopCalls.reportConnecting` method

```swift
public func reportConnecting(_ uuid: UUID)
```

Reports that media connects for an answered or outgoing call.

#### `ConvoHopCalls.reportConnected` method

```swift
public func reportConnected(_ uuid: UUID)
```

Reports that media connected for an answered or outgoing call.

#### `ConvoHopCalls.update` method

```swift
public func update(_ uuid: UUID, localizedCallerName: String? = nil, hasVideo: Bool? = nil)
```

Updates what CallKit shows for a call.

#### `ConvoHopCalls.answer` method

```swift
public func answer(_ uuid: UUID) async throws
```

Asks CallKit to answer a ringing call, for example from an in-app Answer button.
`ConvoHopCallsDelegate.convoHopCalls(_:didAnswer:)` follows, as when the user answers in the system UI.

Throws: `CXErrorCodeRequestTransactionError.unknownCallUUID` for a call ConvoHop didn't report, or
`.invalidAction` for a call that isn't ringing, before asking CallKit.

#### `ConvoHopCalls.setMuted` method

```swift
public func setMuted(_ muted: Bool, for uuid: UUID) async throws
```

Asks CallKit to mute or unmute. `ConvoHopCallsDelegate.convoHopCalls(_:didSetMuted:for:)` applies it.

#### `ConvoHopCalls.setHeld` method

```swift
public func setHeld(_ onHold: Bool, for uuid: UUID) async throws
```

Asks CallKit to hold or resume. `ConvoHopCallsDelegate.convoHopCalls(_:didSetHeld:for:)` applies it.

#### `ConvoHopCalls.end` method

```swift
public func end(_ uuid: UUID, reason: ConvoHopCallEndReason? = nil) async throws
```

Ends a call.

Parameters:

- `reason`: `nil` when the user ends the call in your app, which asks CallKit to end it. Otherwise
  why the call stopped elsewhere, for example `answered` when another device answered the ring.

#### `ConvoHopCalls.forget` method

```swift
@discardableResult
public func forget(_ uuid: UUID) -> Bool
```

Forgets an ended call before its minute is up. Returns `false` for a call that hasn't ended.

#### `ConvoHopCalls.addObserver` method

```swift
public func addObserver(
    _ handler: @escaping @MainActor ([ConvoHopCall]) -> Void
) -> ConvoHopCallsObservation
```

Calls `handler` with `calls` now and whenever they change, until you cancel or release the observation.

#### `ConvoHopCalls.pushRegistry(_:didUpdate:for:)` method

```swift
nonisolated public func pushRegistry(
    _ registry: PKPushRegistry,
    didUpdate pushCredentials: PKPushCredentials,
    for type: PKPushType
)
```

#### `ConvoHopCalls.pushRegistry(_:didInvalidatePushTokenFor:)` method

```swift
nonisolated public func pushRegistry(
    _ registry: PKPushRegistry,
    didInvalidatePushTokenFor type: PKPushType
)
```

#### `ConvoHopCalls.pushRegistry(_:didReceiveIncomingPushWith:for:completion:)` method

```swift
nonisolated public func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
)
```

#### `ConvoHopCalls.providerDidReset` method

```swift
nonisolated public func providerDidReset(_ provider: CXProvider)
```

#### `ConvoHopCalls.provider(_:perform:)` method

```swift
nonisolated public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction)
nonisolated public func provider(_ provider: CXProvider, perform action: CXEndCallAction)
nonisolated public func provider(_ provider: CXProvider, perform action: CXStartCallAction)
nonisolated public func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction)
nonisolated public func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction)
```

#### `ConvoHopCalls.provider(_:didActivate:)` method

```swift
nonisolated public func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession)
```

#### `ConvoHopCalls.provider(_:didDeactivate:)` method

```swift
nonisolated public func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession)
```

### `ConvoHopCallsObservation` class

```swift
public final class ConvoHopCallsObservation: @unchecked Sendable
```

Keeps a `addObserver(_:)` handler running. Cancel or release it to stop.

Available on iOS only.

#### `ConvoHopCallsObservation.cancel` method

```swift
public func cancel()
```

## Structs

### `ConvoHopCall` struct

```swift
public struct ConvoHopCall: Identifiable, Hashable, Sendable
```

A call that ConvoHop reported to CallKit.

#### `ConvoHopCall.uuid` property

```swift
public let uuid: UUID
```

The CallKit UUID. For an incoming call, the ring's `alertId`.

#### `ConvoHopCall.id` property

```swift
public var id: UUID { get }
```

#### `ConvoHopCall.isOutgoing` property

```swift
public let isOutgoing: Bool
```

#### `ConvoHopCall.conversationId` property

```swift
public let conversationId: String
```

#### `ConvoHopCall.liveSessionId` property

```swift
public let liveSessionId: String
```

#### `ConvoHopCall.handle` property

```swift
public let handle: String
```

The CallKit handle: the conversation ID unless you started the call with another.

#### `ConvoHopCall.alert` property

```swift
public let alert: ConvoHopCallAlert?
```

The ring, for an incoming call.

#### `ConvoHopCall.eventId` property

```swift
public let eventId: String?
```

The push event that rang the call.

#### `ConvoHopCall.callerId` property

```swift
public let callerId: String?
```

Who started the ringing, for an incoming call.

#### `ConvoHopCall.mediaProfile` property

```swift
public let mediaProfile: String
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.

#### `ConvoHopCall.callerName` property

```swift
public internal(set) var callerName: String?
```

#### `ConvoHopCall.hasVideo` property

```swift
public internal(set) var hasVideo: Bool
```

#### `ConvoHopCall.isMuted` property

```swift
public internal(set) var isMuted: Bool
```

#### `ConvoHopCall.isOnHold` property

```swift
public internal(set) var isOnHold: Bool
```

#### `ConvoHopCall.state` property

```swift
public internal(set) var state: State
```

#### `ConvoHopCall.endedAt` property

```swift
public internal(set) var endedAt: Date?
```

#### `ConvoHopCall.expiresAt` property

```swift
public var expiresAt: Date? { get }
```

When an incoming ring stops if nobody answers.

#### `ConvoHopCall.isEnded` property

```swift
public var isEnded: Bool { get }
```

### `ConvoHopCallsConfiguration` struct

```swift
public struct ConvoHopCallsConfiguration: Sendable
```

How `ConvoHopCalls` sets up CallKit.

Available on iOS only.

#### `ConvoHopCallsConfiguration.supportsVideo` property

```swift
public var supportsVideo: Bool
```

#### `ConvoHopCallsConfiguration.supportsHolding` property

```swift
public var supportsHolding: Bool
```

#### `ConvoHopCallsConfiguration.maximumCallGroups` property

```swift
public var maximumCallGroups: Int
```

#### `ConvoHopCallsConfiguration.maximumCallsPerCallGroup` property

```swift
public var maximumCallsPerCallGroup: Int
```

#### `ConvoHopCallsConfiguration.includesCallsInRecents` property

```swift
public var includesCallsInRecents: Bool
```

#### `ConvoHopCallsConfiguration.ringtoneSound` property

```swift
public var ringtoneSound: String?
```

A sound file in your app bundle, or `nil` for the system ringtone.

#### `ConvoHopCallsConfiguration.iconTemplateImageData` property

```swift
public var iconTemplateImageData: Data?
```

A 40 × 40 pt template image, in PNG data, for the in-call button that opens your app.

#### `ConvoHopCallsConfiguration.ledgerSuiteName` property

```swift
public var ledgerSuiteName: String?
```

The App Group suite your Notification Service Extension shares, or `nil` for the app's own defaults. It stores
the ledger and `recipient`.

#### `ConvoHopCallsConfiguration.callerName` property

```swift
public var callerName: @Sendable (ConvoHopNotification) -> String?
```

The caller name CallKit shows. Defaults to the push `title`, which the server sends only when the project
opts in to previews.

#### `ConvoHopCallsConfiguration` constructor

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
    callerName: @escaping @Sendable (ConvoHopNotification) -> String? = { $0.title }
)
```

## Interfaces

### `ConvoHopCallsDelegate` interface

```swift
@MainActor
public protocol ConvoHopCallsDelegate: AnyObject
```

Receives what CallKit and PushKit report. Every method has an empty default.

Available on iOS only.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didUpdateVoIPToken:)` method

```swift
func convoHopCalls(_ calls: ConvoHopCalls, didUpdateVoIPToken token: Data?)
```

Send the VoIP token, as `ConvoHopPushToken.hex(_:)`, to your backend, which sends VoIP pushes for calls.
ConvoHop never stores device tokens. `nil` means iOS invalidated the token: remove it from your backend.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didReceiveIncomingCall:)` method

```swift
func convoHopCalls(_ calls: ConvoHopCalls, didReceiveIncomingCall call: ConvoHopCall)
```

A call rings in CallKit.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didAnswer:)` method

```swift
func convoHopCalls(_ calls: ConvoHopCalls, didAnswer call: ConvoHopCall)
```

The user answered. Join the live session, connect media and call `reportConnected(_:)`.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didStartOutgoing:)` method

```swift
func convoHopCalls(_ calls: ConvoHopCalls, didStartOutgoing call: ConvoHopCall)
```

CallKit started the call from `startOutgoingCall(liveSessionId:conversationId:handle:displayName:hasVideo:)`.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didEnd:reason:)` method

```swift
func convoHopCalls(
    _ calls: ConvoHopCalls,
    didEnd call: ConvoHopCall,
    reason: ConvoHopCallEndReason?
)
```

The call ended. `reason` is `nil` when the user ended or declined it. Leave the call and disconnect media.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didSetMuted:for:)` method

```swift
func convoHopCalls(_ calls: ConvoHopCalls, didSetMuted muted: Bool, for call: ConvoHopCall)
```

Mute or unmute the microphone. This is the only place to do it, for the system UI and for your app.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didSetHeld:for:)` method

```swift
func convoHopCalls(_ calls: ConvoHopCalls, didSetHeld onHold: Bool, for call: ConvoHopCall)
```

Hold or resume the call.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didActivate:)` method

```swift
func convoHopCalls(_ calls: ConvoHopCalls, didActivate audioSession: AVAudioSession)
```

CallKit activated the audio session. Start call audio now, not before.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCalls(_:didDeactivate:)` method

```swift
func convoHopCalls(_ calls: ConvoHopCalls, didDeactivate audioSession: AVAudioSession)
```

CallKit deactivated the audio session.

Has a default implementation, so conforming types may omit it.

#### `ConvoHopCallsDelegate.convoHopCallsDidReset` method

```swift
func convoHopCallsDidReset(_ calls: ConvoHopCalls)
```

CallKit reset. Every call ended as `failed`, and `convoHopCalls(_:didEnd:reason:)` ran for each.

Has a default implementation, so conforming types may omit it.

## Enums

### `ConvoHopCall.State` enum

```swift
public enum State: Hashable, Sendable
```

#### `ConvoHopCall.State.ringing` case

```swift
case ringing
```

An incoming call rings.

#### `ConvoHopCall.State.answered` case

```swift
case answered
```

The user answered. Join the call and connect media, then report it connected.

#### `ConvoHopCall.State.connecting` case

```swift
case connecting
```

Media connects.

#### `ConvoHopCall.State.connected` case

```swift
case connected
```

#### `ConvoHopCall.State.ended` case

```swift
case ended(ConvoHopCallEndReason?)
```

The call ended. `nil` means the user ended or declined it; otherwise why the call stopped.
