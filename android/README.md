# ConvoHop Android client SDK

`com.convohop:convohop-android` is the Kotlin SDK for Android apps. It
works with a short-lived user session token from your backend, never with
a backend key or operator credential. It covers:

- chat, with a local store, an offline outbox and optimistic sends;
- typing signals and read receipts;
- calls through the
  [LiveKit Android SDK](https://github.com/livekit/client-sdk-android);
- FCM push, with incoming calls through Telecom.

It isn't published to a package registry yet:
[build it from source](#install-from-source). License:
[Apache-2.0](../LICENSE).

## Requirements

- Android 7.0 (API 24) or later.
- Apps compile against API 36 (`compileSdk = 36`). An app or wrapper that
  uses only `convohop-android-push` needs API 34.
- Built and tested with Kotlin 2.2.21 and Android Gradle Plugin 9.1.1.
  `convohop-android-push` is compiled for Kotlin 2.0 with standard library
  2.0.21, so wrappers on Kotlin 1.9 can read it. Only Kotlin 2.2.21 is
  tested.
- Building from source needs JDK 17 and the Android SDK with platform 36.
- Calls use LiveKit Android SDK 2.29.0. It depends on
  `com.github.davidliu:audioswitch`, which is published only on JitPack.
- Push uses Firebase Cloud Messaging. Your app supplies
  `com.google.firebase:firebase-messaging` 25.1.2 or later (Firebase BoM
  34.18.0 or later) and its own `google-services.json`. This repository
  contains no Firebase configuration.
- Suspending calls are main-safe with the SDK's own storage. Each client
  runs its work one task at a time on its own dispatcher, `Dispatchers.IO`
  unless you pass another. The samples below call them from a coroutine,
  such as one from `lifecycleScope.launch`.

## Artifacts

| Artifact | Contents |
| --- | --- |
| `com.convohop:convohop-android` | The SDK, in `com.convohop.android`. Depend on this one; it brings in the other two. |
| `com.convohop:convohop-android-core` | The platform-free client in `com.convohop.android.core`: generated protocol types, transport, session renewal, recovery, the store, outbox and timelines. Not a supported entry point on its own. |
| `com.convohop:convohop-android-push` | FCM handling, notifications and Telecom incoming calls, in `com.convohop.android.push`. It has no networking, LiveKit or coroutines, so a React Native or Flutter wrapper can ship it alone. |

## Install from source

```sh
cd android
./gradlew publishAllPublicationsToBuildRepository
```

This writes the three artifacts to `android/build/repo`. Add that
repository and JitPack, for LiveKit's audio routing library only, to your
app's `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven(url = uri("/path/to/sdks/android/build/repo"))
        exclusiveContent {
            forRepository { maven("https://jitpack.io") }
            filter { includeGroup("com.github.davidliu") }
        }
    }
}
```

Then depend on the SDK and on Firebase Cloud Messaging:

```kotlin
dependencies {
    implementation("com.convohop:convohop-android:0.1.0-SNAPSHOT")
    implementation(platform("com.google.firebase:firebase-bom:34.18.0"))
    implementation("com.google.firebase:firebase-messaging")
}
```

The SDK's manifests merge these permissions into your app:

- `INTERNET` and `ACCESS_NETWORK_STATE`;
- `POST_NOTIFICATIONS`, `MANAGE_OWN_CALLS` and `USE_FULL_SCREEN_INTENT` for
  push and incoming calls;
- from LiveKit: `RECORD_AUDIO`, `CAMERA`, `FOREGROUND_SERVICE` and
  `FOREGROUND_SERVICE_MEDIA_PROJECTION`, with LiveKit's screen-capture
  service.

Request `POST_NOTIFICATIONS` (Android 13 and later), `RECORD_AUDIO` and,
for video, `CAMERA` at runtime before you need them. Remove permissions you
don't use with `tools:node="remove"`.

## Sessions

Your backend signs the user in, asks ConvoHop for a user session and
returns the `SessionBootstrap` it received, with the project's `baseUrl` and
`projectId`. Never put a backend key, operator credential or webhook secret
in an app. The client keeps the session token in memory only.

```kotlin
val session = checkNotNull(signIn.bootstrap.session)
val client = ConvoHopClient(
    ConvoHopClientOptions(
        baseUrl = signIn.baseUrl,
        projectId = signIn.projectId,
        sessionToken = signIn.bootstrap.sessionToken,
        incarnation = session.incarnation,
        principalId = session.principalId,
        // The file SharedPreferencesRecoveryStorage(context, client) opens.
        recoveryStorage = SharedPreferencesRecoveryStorage(
            context, "convohop.recovery.${signIn.projectId}.${session.principalId}",
        ),
        sessionRefresh = SessionRefresh { current ->
            withContext(Dispatchers.IO) { backend.renewSession(current.sessionId) }
        },
    ),
)
client.initialize()
val renewal = client.refreshAutomatically { error ->
    Log.w("Chat", "Session renewal failed", error)
}
```

- `baseUrl` must be HTTPS, or loopback HTTP for local development.
- `SessionRefresh` asks your backend to renew exactly `current` and returns
  the `SessionBootstrap` your backend received from ConvoHop. Parse a JSON
  body with `SessionBootstrap.fromJson(Json.parseToJsonElement(body))`. The
  hook runs on the client's dispatcher, so move blocking work off it.
- `refreshAutomatically` renews 5 minutes to 30 seconds before the session
  expires and retries failures with backoff. `refreshSession()` renews now.
  Concurrent renewals share one request.
- `client.sessionRefreshState` is `DISABLED`, `UNINITIALIZED`, `READY`,
  `REFRESHING` or `BLOCKED`. `BLOCKED` means the renewal couldn't be
  verified: requests stay blocked, so close the client and sign in again.
- Recovery storage keeps request IDs, inputs and outcomes so a send retried
  after a restart is applied at most once. It never holds tokens.

## Conversations and offline sends

`ConvoHopStore` keeps messages and an outbox in a local store, shows a
timeline from it at once and keeps it current.

```kotlin
val network = NetworkMonitor(context)
val local = SqliteLocalStore(context, client)
val store = ConvoHopStore(client, local, network.online) { error ->
    Log.w("Chat", "Chat error", error)
}

val timeline = store.timeline(conversationId)
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        timeline.items.collect { items -> adapter.submitList(items) }
    }
}
timeline.send("Hello") // Shown at once as a TimelineItem.Pending.
timeline.markRead()
timeline.close() // When the view goes away.
```

- `timeline.items` lists `TimelineItem.Sent` messages oldest first, then
  this device's `TimelineItem.Pending` messages until the authority's
  history shows them. Use `item.key` as the list key.
- `timeline.loadOlder()` reads the previous page; `hasOlder` says whether
  there is one.
- `timeline.replay` is `CATCHING_UP`, `LIVE`, `RECONNECTING`, `PAUSED` or
  `CLOSED`.

Sends are optimistic. `store.outbox.send` (or `timeline.send`) stores the
message and returns at once. The outbox delivers it while `online` is true,
oldest first within each conversation, and `outbox.pending` shows its
state:

| `PendingState` | Meaning |
| --- | --- |
| `QUEUED` | Waiting to be sent. Nothing was applied: it wasn't submitted yet, or the authority refused the attempt, for example because the session expired. |
| `SENDING` | Submitted; the outcome isn't known yet, so it's resent under the same request ID. |
| `SENT` | Committed. It leaves the outbox when the timeline shows it. |
| `UNCONFIRMED` | Three attempts or 60 seconds passed and the authority hasn't seen it. It may still commit, so it's never resent on its own. |
| `FAILED` | Rejected; `errorCode` says why. |

Every attempt reuses the message's request ID and payload, so the
authority applies it at most once. For an `UNCONFIRMED` or `FAILED`
message, `outbox.sendAgain(requestId)` sends a copy under a new request ID.
An unconfirmed original may still commit and show twice, so ask the user
first. `outbox.discard(requestId)` removes a message unless it's
`SENDING`. Losing the network holds the outbox; coming back delivers it
and reconnects every timeline.

Without the store, `client.conversation(id).messages` sends, lists, edits
and deletes directly. To resend after an unknown outcome, pass the same
`requestId`; a new ID is a new message.

## Inbox, members and capabilities

```kotlin
val features = client.capabilities().features
if (features?.inbox == true) {
    val page = client.inbox(limit = 50)
    // Each item has conversationId, title, activityAt, latestVisibleMessage and hasUnread.
    val next = page.nextCursor?.let { client.inbox(cursor = it, limit = 50) }
}
val members = client.members(conversationId)
```

- `inbox` and `members` return up to `limit` items, 1 to 100 (100 by
  default). Pass the page's `nextCursor` as `cursor` for the next page. An
  inbox page with a `partialReason` is incomplete for that reason.
- `capabilities()` reports the project's features (`chat`, `inbox`,
  `lexicalSearch`, `typing`, `liveSessions`, …), limits and media policy.
  Check a feature before you use it.
- `client.search(query, conversationIds)` searches the conversations the
  user can read. `client.conversation(id).mute` reads and sets the user's
  mute.

## Reconnect and resume

Timelines reconnect on their own: after a dropped connection they catch up
over HTTP from the last applied event and subscribe again. While the
session renews they pause, and they resume on the renewed session. When the
network comes back, `ConvoHopStore` skips the reconnect wait; without a
store, call `client.reconnectNow()`.

Without the store, `client.watch(conversationId, apply, onError)` replays a
conversation's events from the cursor in recovery storage, then follows it
live. Batches reach `apply` in order, and the cursor advances only after
`apply` returns. When the authority requires a resynchronization, or the
session no longer authorizes the replay, the replay closes and reports the
error; the SDK never resets a cursor on its own. Call
`client.resyncAuthorizedHistory(conversationId, apply, onError)` to replay
the authorized history from the start.

At startup, `client.recoverPending(onError)` settles up to 16 stored
requests whose outcome is unknown. It resends one under its original
request ID when budget remains, and otherwise looks up its outcome without
sending it again. `client.requests` lists and resolves the records.

## Typing and receipts

```kotlin
editText.doAfterTextChanged { timeline.typing.keystroke() }
timeline.typing.stop() // When the user clears the field or leaves.
```

`keystroke()` signals at most every 3 seconds and signals that typing
stopped 5 seconds after the last keystroke; `timeline.send` stops it too.
Typing signals are ephemeral and never retried. `client.typing(id, isTyping)`
sends one directly; check `features?.typing` first.

- `timeline.markRead()` reports that the user read through the newest
  message held. `timeline.receipts` holds each member's delivery and read
  progress, by principal ID.
- `client.reportRead(id, membership, throughSequence)` and
  `client.reportDelivered(id, membership, throughSequence)` report directly,
  for example delivery when a push for a message arrives. Take `membership`
  from `client.getConversation(id).membership` and the sequence from
  `client.getMessage(id, messageId).sequence`.
- A receipt counts only for the member's current membership and
  visibility. When either changes, timelines drop the old receipt.

## Calls

Calls run on the [LiveKit Android SDK](https://github.com/livekit/client-sdk-android).
`ConvoHopCall` joins a live session's media with one single-use admission
grant, reconnects with fresh credentials when media drops, and leaves the
live session when it ends. Connecting never starts capture: turn on the
microphone and camera once the user has granted `RECORD_AUDIO` and
`CAMERA`.

Start a call and ring the other members:

```kotlin
val live = client.conversation(conversationId).live.startVoice().ready()
val call = ConvoHopCall.join(context, live.join())
call.microphone(true)
live.alerts.send(listOf(otherPrincipalId))
```

`startVideo()` allows the camera later; `call.camera(true)` turns it on.
`call.phase` is `CONNECTING`, `CONNECTED`, `RECONNECTING` or `ENDED`.
`call.hangUp()` leaves the live session; `live.end()` ends it for everyone.
Render video from the LiveKit room:
`(call.connection?.room as? LiveKitMediaRoom)?.room`.

Incoming calls arrive by push. On Android 8.0 and later they ring through a
self-managed `ConnectionService` (Telecom), with a full-screen incoming-call
notification; earlier versions ring with the notification alone. Answer
when the user accepts:

```kotlin
override fun onCallAnswered(call: CallInfo) {
    appScope.launch {
        activeCall = ConvoHopCall.answer(context, client, call.alertId)
        activeCall?.microphone(true)
    }
}
```

`answer` checks the call is for this client's project and user, answers it
if it still rings, joins the live session and connects media. If it fails,
the system call ends. The `ConvoHopCall` follows the system call: capture
stays off while the system mutes or holds it, and ending it leaves the live
session.

- Android 14 lets the user or Google Play deny full-screen intents; calls
  then show as a heads-up notification. Check
  `ConvoHopNotifications.getInstance(context).canUseFullScreenIntent()` and
  open `fullScreenIntentSettings()` to ask the user.
- The SDK starts no foreground service. To keep a call running while your
  app is in the background, start your own
  [foreground service](https://developer.android.com/develop/background-work/services/fgs/service-types#phone-call)
  of type `phoneCall`. It needs `FOREGROUND_SERVICE_PHONE_CALL` and the
  `MANAGE_OWN_CALLS` permission the SDK declares.

## Push notifications

ConvoHop sends pushes through Firebase Cloud Messaging. Add your own
`google-services.json` and the Google Services Gradle plugin to your app;
never commit Firebase configuration to a public repository. Declare the
messaging service in your app's manifest:

```xml
<service
    android:name="com.convohop.android.push.ConvoHopMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

If your app already has a messaging service, subclass
`ConvoHopMessagingService` (call `super` from every override and handle
other pushes in `onOtherMessage`), or forward to `ConvoHopFirebase`'s
`handleMessage`, `onNewToken`, `onRegistered` and `onUnregistered`.

Configure notifications in `Application.onCreate`, because a push can start
your process:

```kotlin
val notifications = ConvoHopNotifications.getInstance(this)
notifications.options = ConvoHopNotificationOptions().apply {
    smallIcon = R.drawable.ic_notification
    recipientFilter = RecipientFilter { recipientId -> recipientId == signedInPrincipalId() }
    incomingCallIntent = CallIntentFactory { context, call ->
        Intent(context, CallActivity::class.java).putExtra("alertId", call.alertId)
    }
    messageContent = ConvoHopMessageContent { currentClient() }
}
notifications.addListener(object : ConvoHopNotificationListener {
    override fun onRegistered(registration: PushRegistration) {
        appScope.launch { backend.savePushRegistration(registration.toJson()) }
    }
    override fun onCallAnswered(call: CallInfo) { /* ConvoHopCall.answer, above */ }
})
ConvoHopFirebase.register(this)
```

Store the registration with your backend for the signed-in user; ConvoHop
never stores registrations. Call `ConvoHopFirebase.register` whenever your
app starts: it reports the registration FCM holds, even when Firebase's own
callbacks don't fire. With FCM auto-init off, nothing registers until you
call it, so you can wait for the user's consent. The same registration can
arrive more than once, so store it idempotently.

**Token or installation ID.** By default FCM registers the device with a
registration token, and `toJson()` gives `{"kind":"fcm","token":"…"}`. If
your app's manifest turns on registration by Firebase Installation ID,
ConvoHop registers that way and gives `{"kind":"fcm","fid":"…"}`:

```xml
<meta-data android:name="firebase_messaging_installation_id_enabled" android:value="true" />
```

The flag applies to your whole app: Firebase then fails `getToken()` and
`deleteToken()` for every library in it. Turn it on only when everything in
your app that uses FCM supports installation IDs. With the flag on,
`register` and `unregister` throw `IllegalStateException` if your
firebase-messaging is older than 25.1.2.

**Message previews.** Previews are off unless the project turns them on, so
a message push usually carries no text. `ConvoHopMessageContent` then reads
the message with the user's own session, for up to 5 seconds, so its text
never passes through FCM. Without it, or when the read fails, the
notification says "New message". When the project turns previews on, the
push carries the title and body and the notification shows them. Set
`showMessages = false` to post message notifications yourself from
`onMessage`.

**Other push paths.** `notifications.handleNotification(data)` handles an
FCM data map from your own code and returns a `PushResult`:

| `PushResult` | Meaning |
| --- | --- |
| `NOT_CONVOHOP` | Not ConvoHop's push: handle it yourself. |
| `INVALID` | A ConvoHop push this SDK version can't read. |
| `IGNORED` | A duplicate, a ring that already stopped, or a recipient your filter rejected. |
| `MESSAGE` | A new message. |
| `RINGING` | A call is ringing. |
| `STOPPED` | A ring stopped because someone answered or declined, maybe on another device. |
| `MISSED` | A ring stopped and nobody answered. |

`messageContent` runs only off the main thread, as in a messaging
service; on the main thread the notification shows the push's own text.

To change the notifications' text, override these string resources:
`convohop_channel_calls`, `convohop_channel_missed_calls`,
`convohop_channel_messages`, `convohop_message_fallback`,
`convohop_call_fallback`, `convohop_video_call_fallback`,
`convohop_missed_call`, `convohop_answer` and `convohop_decline`.

## Sign out

```kotlin
renewal.close()
store.signOut() // Deletes cached messages, including unsent ones.
local.close()
network.close()
client.close()
SharedPreferencesRecoveryStorage(context, client).clear()
```

Delete the user's push registration on your backend, and reject their
pushes in `recipientFilter`. To unregister the device from FCM too, call
`ConvoHopFirebase.unregister(context)`. It deletes the app's token, which
every library in your app shares, or unregisters the installation ID;
listeners then get `onUnregistered`. With auto-init on, Firebase registers
the device again when your app next starts.

## Not yet supported

- Presence, and other members' typing. The API has no presence, and it
  doesn't deliver typing signals to other clients, so the SDK only sends
  them.
- Wrappers for the generated `getOperation`, `revokeSession` and
  `updateConversation` operations.

## Build and test

`android/` is its own Gradle build with a committed wrapper. It shares no
code or build logic with `jvm/`, the Java and Kotlin server SDK. Build it
with JDK 17 or later and the Android SDK:

```sh
cd android
./gradlew build lint
./gradlew publishAllPublicationsToBuildRepository
```

- `:core` tests run on the JVM with JUnit 4, against an in-memory
  authority.
- `:push` and `:convohop` tests run on Robolectric, at API 34 and also at
  24, 26 or 33 where behavior differs, with Firebase and media rooms faked.
  Add `-ProbolectricSdks=34` to run only API 34.
- `:edge-fixture` compiles the generator's edge-case golden files, so
  emitter changes stay valid Kotlin.

The generated protocol code is in
`core/src/main/kotlin/com/convohop/android/generated`. Don't edit it:
change the schema or `tools/sdkgen/emitters/android.mjs`, then run
`npm run generate:graphql` from the repository root.

Run the shared conformance scenarios against the deterministic mock from
the repository root:

```sh
(cd android && ./gradlew :conformance-driver:installDist)
npm run conformance -- --driver conformance/drivers/android/build/install/convohop-conformance-android/bin/convohop-conformance-android
```

The driver declares only the user role, so the runner skips scenarios that
need backend or management clients or that verify webhooks.

| Path | Contents |
| --- | --- |
| `android/core` | `convohop-android-core`, including the generated code |
| `android/push` | `convohop-android-push` |
| `android/convohop` | `convohop-android`: the SQLite store, recovery storage, network monitor and LiveKit calls |
| `android/edge-fixture` | Compiles the generator's edge goldens |
| `conformance/drivers/android` | The conformance driver |
| `tools/sdkgen/emitters/android.mjs` | The Kotlin emitter |

Not yet verified: LiveKit media, Telecom and FCM delivery on a device or
emulator, instrumented tests, Kotlin versions other than 2.2.21, and apps
built against the published artifacts.
