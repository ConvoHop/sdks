# `com.convohop:convohop-android`

The SDK an Android app depends on: SQLite and SharedPreferences storage, network monitoring, LiveKit calls and message text for notifications. It brings in the other two packages.

**Layer:** Client. **Runtime:** Android 7.0 (API 24) or later. Apps compile against API 36. Tested with Kotlin 2.2.21. **Source:** `android/convohop`.

## Classes

### `ConvoHopCall` class

```kotlin
public class ConvoHopCall
```

A call's media, kept in step with the system call that rang for it.

`answer` answers an incoming call, joins its live session and connects
media through LiveKit; `join` connects a participation the app already
holds, such as a call it started. Connecting never starts capture: turn on
the `microphone` and `camera` once the user granted their permissions.
While the system mutes or holds the call they stay off, and come back
when it resumes. When media drops, the call reconnects with fresh
credentials, backing off between attempts and waiting at least as long as
the authority asks. When it can't reconnect within the timeout, or the
system ends the call, it leaves the live session. Errors it handles itself
still go to `onError`, for logging.

Package: `com.convohop.android`.

#### `ConvoHopCall.phase` property

```kotlin
public val phase: StateFlow<CallPhase>
```

Where the call stands.

#### `ConvoHopCall.alertId` property

```kotlin
public val alertId: String?
```

The ring this call answered, or null for a call joined in the app.

#### `ConvoHopCall.connection` property

```kotlin
public val connection: MediaConnection?
```

The media connection, for rendering: its `room` is a `LiveKitMediaRoom`
unless you passed other rooms. A reconnect replaces it.

#### `ConvoHopCall.microphone` method

```kotlin
public suspend fun microphone(enabled: Boolean)
```

Turns the microphone on or off. Needs `RECORD_AUDIO` and a participation
allowed to speak. It stays off while the system mutes or holds the call.

#### `ConvoHopCall.camera` method

```kotlin
public suspend fun camera(enabled: Boolean)
```

Turns the camera on or off. Needs `CAMERA` and a participation allowed to publish video. It stays off on hold.

#### `ConvoHopCall.hangUp` method

```kotlin
public suspend fun hangUp()
```

Leaves the live session and ends the system call. Repeated calls do nothing.

Sends [`communication.leaveLiveSession`](../../operations/communication/leaveLiveSession.md).

#### `ConvoHopCall.DEFAULT_RECONNECT_TIMEOUT_MILLIS` static property

```kotlin
public const val DEFAULT_RECONNECT_TIMEOUT_MILLIS: Long = 30_000
```

How long a dropped call keeps trying to reconnect before it ends: 30 seconds.

#### `ConvoHopCall.answer` static method

```kotlin
public suspend fun answer(
    context: Context,
    client: ConvoHopClient,
    alertId: String,
    rooms: MediaRoomFactory? = null,
    reconnectTimeoutMillis: Long = DEFAULT_RECONNECT_TIMEOUT_MILLIS,
    onError: (Throwable) -> Unit = {},
): ConvoHopCall
```

Answers `alertId` if it still rings, joins its live session as
`client`'s user and connects media. Call it from
`ConvoHopNotificationListener.onCallAnswered` or from your own answer
button. `rooms` defaults to LiveKit, which leaves audio routing to
Telecom when Telecom runs the call. Call it once per call. If it fails,
the system call ends.

Sends [`communication.liveSession`](../../operations/communication/liveSession.md), [`communication.joinLiveSession`](../../operations/communication/joinLiveSession.md) and [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

#### `ConvoHopCall.join` static method

```kotlin
public suspend fun join(
    context: Context,
    participation: LiveParticipationHandle,
    rooms: MediaRoomFactory = LiveKitMediaRooms(context),
    reconnectTimeoutMillis: Long = DEFAULT_RECONNECT_TIMEOUT_MILLIS,
    onError: (Throwable) -> Unit = {},
): ConvoHopCall
```

Connects `participation`'s media for a call the app joined or started
itself, with no system call. The call owns `participation` from then
on: if media can't connect, it leaves and throws.

Sends [`communication.liveSessionCredentials`](../../operations/communication/liveSessionCredentials.md).

### `ConvoHopMessageContent` class

```kotlin
public class ConvoHopMessageContent : MessageContentProvider
```

Fills in message notifications when the push carries no text, which is
the default: previews are off unless the project opts in. It reads the
message with the signed-in user's own session, so the text never passes
through the push service. Set it as
`ConvoHopNotificationOptions.messageContent`.

`client` returns the signed-in user's client, or null when nobody is
signed in. Pushes for another project or user, deleted messages and
failures within `timeoutMillis` show the generic text instead.

Package: `com.convohop.android`.

#### `ConvoHopMessageContent` constructor

```kotlin
public constructor(timeoutMillis: Long = DEFAULT_TIMEOUT_MILLIS, client: () -> ConvoHopClient?)
```

#### `ConvoHopMessageContent.content` method

```kotlin
public override fun content(message: PushNotification.Message): MessageContent?
```

Sends [`communication.getMessage`](../../operations/communication/getMessage.md).

#### `ConvoHopMessageContent.DEFAULT_TIMEOUT_MILLIS` static property

```kotlin
public const val DEFAULT_TIMEOUT_MILLIS: Long = 5_000
```

### `LiveKitMediaRoom` class

```kotlin
public class LiveKitMediaRoom : MediaRoom
```

A `MediaRoom` that is one official LiveKit `Room`.

Package: `com.convohop.android`.

#### `LiveKitMediaRoom.room` property

```kotlin
public val room: Room
```

LiveKit's room, for rendering tracks and observing participants. Don't
connect, disconnect or release it yourself: its connection does.

#### `LiveKitMediaRoom.connect` method

```kotlin
public override suspend fun connect(url: String, token: String): String
```

Joins with one single-use token and returns the local participant SID.
Must not capture or publish anything, and must not retry with the same
token. Never log or store the token.

#### `LiveKitMediaRoom.setMicrophoneEnabled` method

```kotlin
public override suspend fun setMicrophoneEnabled(enabled: Boolean)
```

#### `LiveKitMediaRoom.setCameraEnabled` method

```kotlin
public override suspend fun setCameraEnabled(enabled: Boolean)
```

#### `LiveKitMediaRoom.disconnect` method

```kotlin
public override suspend fun disconnect()
```

Leaves and releases everything the room owns. Idempotent and safe after the room disconnected itself.

### `LiveKitMediaRooms` class

```kotlin
public class LiveKitMediaRooms : MediaRoomFactory
```

Creates official LiveKit rooms for `com.convohop.android.core.MediaOptions`.
Every connection attempt gets a new room, released when the connection
closes. Rooms join without capturing: enable the microphone or camera on
the `com.convohop.android.core.MediaConnection`.

Package: `com.convohop.android`.

#### `LiveKitMediaRooms` constructor

```kotlin
public constructor(
    context: Context,
    roomOptions: RoomOptions = RoomOptions(),
    overrides: LiveKitOverrides = LiveKitOverrides(),
)
```

#### `LiveKitMediaRooms.create` method

```kotlin
public override fun create(events: MediaRoomEvents): MediaRoom
```

#### `LiveKitMediaRooms.forTelecom` static method

```kotlin
public fun forTelecom(context: Context, roomOptions: RoomOptions = RoomOptions()): LiveKitMediaRooms
```

Rooms for a call that Android's Telecom runs, such as an answered
ring whose `CallInfo.telecom` is true. Telecom owns audio focus, the
audio mode and the route, so LiveKit leaves them alone.

### `NetworkMonitor` class

```kotlin
public class NetworkMonitor : AutoCloseable
```

Whether the device has a default network with internet access, for
`ConvoHopStore`'s `online`. It
does not wait for Android to validate the network: the SDK's own requests
show whether the authority is reachable. Requires `ACCESS_NETWORK_STATE`,
which the library declares. `close` it with the store.

Package: `com.convohop.android`.

#### `NetworkMonitor` constructor

```kotlin
public constructor(context: Context)
```

#### `NetworkMonitor.online` property

```kotlin
public val online: StateFlow<Boolean>
```

True while the default network has internet access.

#### `NetworkMonitor.close` method

```kotlin
public override fun close()
```

Stops listening; `online` keeps its last value.

### `SharedPreferencesRecoveryStorage` class

```kotlin
public class SharedPreferencesRecoveryStorage : RecoveryStorage
```

`RecoveryStorage` in a private `SharedPreferences` file. It holds request
identities, inputs and outcomes, never tokens. Use one file per project and
principal, and `clear` it when the user signs out.

Package: `com.convohop.android`.

#### `SharedPreferencesRecoveryStorage` constructor

```kotlin
public constructor(context: Context, name: String)
public constructor(context: Context, client: ConvoHopClient)
```

The file for `client`'s project and principal.

#### `SharedPreferencesRecoveryStorage.getItem` method

```kotlin
public override suspend fun getItem(key: String): String?
```

#### `SharedPreferencesRecoveryStorage.setItem` method

```kotlin
public override suspend fun setItem(key: String, value: String)
```

#### `SharedPreferencesRecoveryStorage.removeItem` method

```kotlin
public override suspend fun removeItem(key: String)
```

#### `SharedPreferencesRecoveryStorage.clear` method

```kotlin
public suspend fun clear()
```

Deletes every record.

### `SqliteLocalStore` class

```kotlin
public class SqliteLocalStore : LocalStore, AutoCloseable
```

A `LocalStore` in a private SQLite database, so the outbox and cached
messages survive restarts. It never holds credentials. Use one database
per project and principal; `ConvoHopStore.signOut`
clears it.

Package: `com.convohop.android`.

#### `SqliteLocalStore` constructor

```kotlin
public constructor(context: Context, name: String)
public constructor(context: Context, client: ConvoHopClient)
```

The database for `client`'s project and principal.

#### `SqliteLocalStore.messages` method

```kotlin
public override suspend fun messages(conversationId: String): List<Message>
```

The stored messages of `conversationId`, in any order.

#### `SqliteLocalStore.putMessages` method

```kotlin
public override suspend fun putMessages(conversationId: String, messages: List<Message>)
```

Inserts or replaces `messages` by message ID.

#### `SqliteLocalStore.removeMessages` method

```kotlin
public override suspend fun removeMessages(conversationId: String)
```

Deletes the stored messages of `conversationId`, when the cached history no longer joins the current one.

#### `SqliteLocalStore.pending` method

```kotlin
public override suspend fun pending(): List<PendingMessage>
```

Every outbox entry, in the order they were first stored.

#### `SqliteLocalStore.putPending` method

```kotlin
public override suspend fun putPending(message: PendingMessage)
```

Inserts or replaces `message` by request ID, keeping the position of an existing entry.

#### `SqliteLocalStore.removePending` method

```kotlin
public override suspend fun removePending(requestId: String)
```

#### `SqliteLocalStore.clear` method

```kotlin
public override suspend fun clear()
```

Deletes everything.

#### `SqliteLocalStore.close` method

```kotlin
public override fun close()
```

Closes the database; the next call reopens it.

## Enums

### `CallPhase` enum

```kotlin
public enum class CallPhase
```

Where a `ConvoHopCall` stands.

Package: `com.convohop.android`.

#### `CallPhase.CONNECTING` case

```kotlin
CONNECTING
```

#### `CallPhase.CONNECTED` case

```kotlin
CONNECTED
```

#### `CallPhase.RECONNECTING` case

```kotlin
RECONNECTING
```

Media dropped; the call is reconnecting with fresh credentials.

#### `CallPhase.ENDED` case

```kotlin
ENDED
```

Hung up, ended by the system, or media could not reconnect. The live session was left.
