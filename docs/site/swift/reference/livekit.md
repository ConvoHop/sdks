# `ConvoHopLiveKit`

Call media through the official LiveKit Swift SDK, and CallKit audio session handling on iOS.

**Layer:** Client. **Runtime:** iOS 15 or later, or macOS 12 or later, with LiveKit's `client-sdk-swift` 2.17.0 or later. **Source:** `swift/Sources/ConvoHopLiveKit`.

## Classes

### `LiveKitMediaRoom` class

```swift
public final class LiveKitMediaRoom: NSObject, ConvoHopMediaRoom, @unchecked Sendable
extension LiveKitMediaRoom: RoomDelegate
```

A `ConvoHopMediaRoom` on the official LiveKit Swift SDK.

Each instance connects once. LiveKit resumes a dropped connection itself while its token allows, and reports the
resume; anything else needs `MediaConnection.reconnect()`, which admits a new connection with a new room.

#### `LiveKitMediaRoom.room` property

```swift
public let room: Room
```

LiveKit's room, for rendering tracks, reading participants and statistics. Don't connect or disconnect it
yourself, and don't publish the microphone or camera outside `MediaConnection`.

#### `LiveKitMediaRoom` constructor

```swift
public init(roomOptions: RoomOptions = RoomOptions(), reconnectAttempts: Int = 3)
```

Parameters:

- `roomOptions`: LiveKit's room options, such as capture defaults and adaptive stream.
- `reconnectAttempts`: How often LiveKit tries to resume a dropped connection before it gives up.

#### `LiveKitMediaRoom.connect` method

```swift
public func connect(
    url: URL,
    token: String,
    iceTransportPolicy: ConvoHopICETransportPolicy,
    onEvent: @escaping @Sendable (ConvoHopMediaRoomEvent) -> Void
) async throws -> String
```

#### `LiveKitMediaRoom.setMicrophone` method

```swift
public func setMicrophone(enabled: Bool) async throws
```

#### `LiveKitMediaRoom.setCamera` method

```swift
public func setCamera(enabled: Bool) async throws
```

#### `LiveKitMediaRoom.disconnect` method

```swift
public func disconnect() async
```

#### `LiveKitMediaRoom.room(_:didStartReconnectWithMode:)` method

```swift
public func room(_ room: Room, didStartReconnectWithMode reconnectMode: ReconnectMode)
```

#### `LiveKitMediaRoom.room(_:didCompleteReconnectWithMode:)` method

```swift
public func room(_ room: Room, didCompleteReconnectWithMode reconnectMode: ReconnectMode)
```

#### `LiveKitMediaRoom.room(_:didDisconnectWithError:)` method

```swift
public func room(_ room: Room, didDisconnectWithError error: LiveKitError?)
```

### `MediaConnection` class

```swift
extension MediaConnection
```

What `ConvoHopLiveKit` adds to `MediaConnection`, which `ConvoHop` declares.

#### `MediaConnection.liveKitRoom` property

```swift
public nonisolated var liveKitRoom: Room? { get }
```

LiveKit's room, when the connection uses `ConvoHopMediaOptions.liveKit(iceTransportPolicy:roomOptions:reconnectAttempts:onDisconnected:onResuming:onResumed:)`.

## Structs

### `ConvoHopMediaOptions` struct

```swift
extension ConvoHopMediaOptions
```

What `ConvoHopLiveKit` adds to `ConvoHopMediaOptions`, which `ConvoHop` declares.

#### `ConvoHopMediaOptions.liveKit` static method

```swift
public static func liveKit(
    iceTransportPolicy: ConvoHopICETransportPolicy = .all,
    roomOptions: RoomOptions = RoomOptions(),
    reconnectAttempts: Int = 3,
    onDisconnected: (@Sendable () -> Void)? = nil,
    onResuming: (@Sendable () -> Void)? = nil,
    onResumed: (@Sendable () -> Void)? = nil
) -> ConvoHopMediaOptions
```

Connects native media with the official LiveKit Swift SDK.

## Enums

### `ConvoHopCallKitAudio` enum

```swift
public enum ConvoHopCallKitAudio
```

Starts LiveKit's audio only while CallKit's audio session is active, as LiveKit's CallKit guide requires.

Call `prepare()` at launch, before any room connects. Then call `activate(_:mode:options:)` and
`deactivate()` from CallKit's audio session callbacks, for example `ConvoHopCallsDelegate`'s.

Available on iOS only.

#### `ConvoHopCallKitAudio.prepare` static method

```swift
public static func prepare() throws
```

Stops LiveKit from configuring the audio session and keeps its audio engine off.

#### `ConvoHopCallKitAudio.activate` static method

```swift
public static func activate(
    _ session: AVAudioSession,
    mode: AVAudioSession.Mode = .voiceChat,
    options: AVAudioSession.CategoryOptions = [.mixWithOthers]
) throws
```

Configures the session CallKit activated and starts LiveKit's audio engine.

#### `ConvoHopCallKitAudio.deactivate` static method

```swift
public static func deactivate() throws
```

Stops LiveKit's audio engine after CallKit deactivated the session.

### `LiveKitMediaRoomError` enum

```swift
public enum LiveKitMediaRoomError: Error, Sendable, Equatable, CustomStringConvertible, LocalizedError
```

A `LiveKitMediaRoom` that can't connect.

#### `LiveKitMediaRoomError.alreadyConnected` case

```swift
case alreadyConnected
```

The room already connected once. Each connection needs a new room.

#### `LiveKitMediaRoomError.missingParticipantId` case

```swift
case missingParticipantId
```

LiveKit connected without a participant ID.

#### `LiveKitMediaRoomError.description` property

```swift
public var description: String { get }
```

#### `LiveKitMediaRoomError.errorDescription` property

```swift
public var errorDescription: String? { get }
```
