# `@convohop/react-native/media`

Call media through LiveKit's React Native SDK: set LiveKit up, then connect each admitted participation to a LiveKit room. It ships with @convohop/react-native.

**Layer:** Client. **Runtime:** As @convohop/react-native, with @livekit/react-native 3, @livekit/react-native-webrtc 144.2 or later and livekit-client 2.22.3 or later. **Source:** `packages/react-native`.

## Interfaces

### `MediaSetupOptions` interface

```ts
interface MediaSetupOptions
```

#### `MediaSetupOptions.callKit` property

```ts
callKit?: boolean
```

iOS: CallKit owns the audio session. Set it when calls go through CallKit, as incoming calls rung by
`@convohop/react-native` do: LiveKit then leaves the session to CallKit, and the SDK tells WebRTC each time CallKit
activates or deactivates it. Start every call with CallKit, including outgoing calls with `startOutgoingCall`,
or it has no audio. Ignored on Android. Default `false`.

### `RoomConnection` interface

```ts
interface RoomConnection extends LiveConnection
```

A room connection admitted for one participation.

#### `RoomConnection.room` property

```ts
readonly room: Room
```

#### `RoomConnection.nativeConnectionId` property

```ts
readonly nativeConnectionId: string
```

The participation's `nativeConnectionId`: the participant SID the media server assigned at admission.

#### `RoomConnection.resuming` property

```ts
readonly resuming: boolean
```

LiveKit is resuming this connection after a network interruption.

#### `RoomConnection.connected` property

```ts
readonly connected: boolean
```

Inherited from `LiveConnection`.

#### `RoomConnection.disconnect` method

```ts
disconnect(): Promise<void>
```

Inherited from `LiveConnection`.

### `RoomConnectorOptions` interface

```ts
interface RoomConnectorOptions
```

#### `RoomConnectorOptions.iceTransportPolicy` property

```ts
iceTransportPolicy?: "all" | "relay"
```

`relay` sends media only through TURN. Default `all`.

#### `RoomConnectorOptions.onResuming` property

```ts
onResuming?: () => void
```

LiveKit lost the connection and is resuming it with the current or a server-refreshed token.

#### `RoomConnectorOptions.onResumed` property

```ts
onResumed?: () => void
```

LiveKit resumed the same connection.

#### `RoomConnectorOptions.onDisconnected` property

```ts
onDisconnected?: () => void
```

The connection ended without `disconnect()`: the network failed past resuming, the server removed this
participant, or LiveKit reconnected as a new participant, which this participation's admission doesn't cover.
Connect again with `participation.connectWith`, which obtains fresh credentials.

## Functions

### `createRoom` function

```ts
function createRoom(): Room
```

A LiveKit room with ConvoHop's media policy, the same as the Web SDK's: one peer connection per direction, no
simulcast, adaptive stream or dynacast, and VP8 video at up to 320x240, 15 frames per second and 350 kbit/s.

### `createRoomConnector` function

```ts
function createRoomConnector(room: Room, options?: RoomConnectorOptions): LiveConnector<RoomConnection>
```

A connector for `participation.connectWith` that connects `room` once with each admitted attempt's single-use token,
the way the Web SDK connects. Pass a disconnected room, such as one from `createRoom`, and reuse it to connect
again. Connecting doesn't capture the microphone or camera: publish them with `room.localParticipant` after it
resolves. The media server enforces what the participation may publish.

### `setupMedia` function

```ts
function setupMedia(options?: MediaSetupOptions): void
```

Prepares LiveKit's React Native SDK. Call it once at the top of `index.js`, before anything uses LiveKit. It
installs a secure `crypto.getRandomValues` and `crypto.randomUUID` where the runtime lacks them, then LiveKit's
globals.
