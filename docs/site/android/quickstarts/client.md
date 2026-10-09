# Android client quickstart

Use ConvoHop in your Android app with `com.convohop:convohop-android`: connect with the session your backend issued and keep it renewed, show a conversation from a local store and keep it current, and send messages optimistically through an outbox that survives dropped connections and restarts.

## Before you start

Your backend signs the user in and returns a session from ConvoHop, with the project's base URL and ID, as the [Java and Kotlin server quickstart](../../jvm/quickstarts/server.md#sign-in-a-user) shows. The SDK never holds a backend key. You need Android 7.0 (API 24) or later and the SDK ([install](../index.md#install)). Its suspending calls are main-safe, so call them from a coroutine, such as one from `lifecycleScope.launch`.

The samples on this page use these imports:

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#imports
import android.content.Context
import android.util.Log
import com.convohop.android.NetworkMonitor
import com.convohop.android.SharedPreferencesRecoveryStorage
import com.convohop.android.SqliteLocalStore
import com.convohop.android.core.ConversationStream
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.core.ConvoHopClientOptions
import com.convohop.android.core.ConvoHopStore
import com.convohop.android.core.PendingMessage
import com.convohop.android.core.PendingState
import com.convohop.android.core.SessionRefresh
import com.convohop.android.core.Timeline
import com.convohop.android.core.TimelineItem
import com.convohop.android.generated.Message
import com.convohop.android.generated.Session
import com.convohop.android.generated.SessionBootstrap
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
```

## Connect

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#connect
/** What your backend's sign-in endpoint returns: the project's address and a user session from ConvoHop. */
class SignIn(val baseUrl: String, val projectId: String, val bootstrap: SessionBootstrap)

suspend fun connectUser(context: Context, signIn: SignIn, sessionRefresh: SessionRefresh? = null): ConvoHopClient {
    val session = checkNotNull(signIn.bootstrap.session) { "The sign-in carries no session" }
    val client = ConvoHopClient(
        ConvoHopClientOptions(
            baseUrl = signIn.baseUrl,
            projectId = signIn.projectId,
            sessionToken = signIn.bootstrap.sessionToken, // The client keeps it in memory only.
            incarnation = session.incarnation,
            principalId = session.principalId,
            // The file SharedPreferencesRecoveryStorage(context, client) opens. It keeps unconfirmed sends, never tokens.
            recoveryStorage = SharedPreferencesRecoveryStorage(
                context, "convohop.recovery.${signIn.projectId}.${session.principalId}",
            ),
            sessionRefresh = sessionRefresh, // Optional: renews the session before it expires.
        ),
    )
    try {
        client.initialize()
        // Finishes sends that an earlier run left unconfirmed.
        client.recoverPending { error -> Log.w("Chat", "Couldn't recover an earlier send", error) }
    } catch (error: Throwable) {
        client.close()
        throw error
    }
    return client
}
```

`baseUrl` must be HTTPS, or loopback HTTP for local development. The client keeps the session token in memory only. `initialize()` loads the project's signed route before the first call.

`recoveryStorage` keeps the sends that ConvoHop hasn't confirmed: their request IDs, inputs, including message text, and outcomes, but never tokens. Name it after the project and user, as the sample does, so that users who share a device don't share it. At startup, `recoverPending` settles up to 16 sends whose outcome is unknown. It resends each under its original request ID while its retry budget lasts, and otherwise looks up its outcome without sending it again.

## Renew the session

Sessions expire. To renew the user's session before it does, pass a `SessionRefresh` to `connectUser`, then call `keepSessionAlive`:

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#renew
/** Pass it to connectUser. The client calls it with the session's metadata, never its token. */
class BackendSessionRefresh(
    private val renewUrl: String, // Your backend's endpoint, behind your app's own sign-in.
    private val http: OkHttpClient, // Your app's client, which carries that sign-in.
) : SessionRefresh {
    override suspend fun refresh(current: Session): SessionBootstrap = withContext(Dispatchers.IO) {
        // Your backend renews exactly this session with ConvoHop and returns the SessionBootstrap it received.
        val body = buildJsonObject {
            put("sessionId", current.sessionId)
            put("expectedRevision", current.sessionRevision)
        }
        val request = Request.Builder()
            .url(renewUrl)
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()
        // Bound the call: the client pauses its streams until the renewal settles.
        val call = http.newBuilder().callTimeout(10, TimeUnit.SECONDS).build().newCall(request)
        call.execute().use { response ->
            check(response.isSuccessful) { "Session renewal failed with HTTP ${response.code}" }
            // The client checks the renewed session with ConvoHop before it uses it.
            SessionBootstrap.fromJson(Json.parseToJsonElement(checkNotNull(response.body).string()))
        }
    }
}

/** Renews the session 5 minutes to 30 seconds before it expires, until you close the result. */
fun keepSessionAlive(client: ConvoHopClient): AutoCloseable =
    client.refreshAutomatically { error -> Log.w("Chat", "Couldn't renew the session", error) }
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with [`sessions().renew`](../../jvm/reference/server.md#projectserverclientsessionsrenew-method), taking the principal and device from that sign-in rather than from the request, and returns the `SessionBootstrap` it received.

`refreshAutomatically` renews 5 minutes to 30 seconds before the session expires, and retries failures with backoff. Concurrent renewals share one request. The client's live connections pause while the session renews, and it checks the renewed session with ConvoHop before it uses it. Don't call the client from `refresh`: the call would wait for the renewal.

`client.sessionRefreshState` says where renewal stands. `BLOCKED` means that a renewal couldn't be verified, and requests stay blocked: close the client and sign the user in again.

## Show a conversation

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#store
/** The signed-in user's chat. Messages and unsent ones stay in SQLite, and the outbox sends while the device is online. */
class Chat(context: Context, val client: ConvoHopClient) {
    val network = NetworkMonitor(context)
    val local = SqliteLocalStore(context, client)
    val store = ConvoHopStore(client, local, network.online) { error -> Log.w("Chat", "Chat error", error) }
}

/** Shows the stored messages at once, then keeps them current. Close the timeline when the screen goes away. */
fun showConversation(chat: Chat, conversationId: String, scope: CoroutineScope, render: (List<TimelineItem>) -> Unit): Timeline {
    val timeline = chat.store.timeline(conversationId)
    // In an activity, scope is lifecycleScope, and you collect under repeatOnLifecycle(Lifecycle.State.STARTED).
    scope.launch { timeline.items.collect { items -> render(items) } }
    return timeline
}
```

`ConvoHopStore` keeps each conversation's messages, and the user's messages that aren't sent yet, in SQLite. A timeline shows them at once, then catches up with ConvoHop and follows the conversation live. Keep one store per signed-in user, and close each timeline when its screen goes away.

- `timeline.items` lists the sent messages, `TimelineItem.Sent`, oldest first, then this device's `TimelineItem.Pending` messages until ConvoHop's history shows them. Use `item.key` as the list key.
- `timeline.loadOlder()` loads the previous page while `timeline.hasOlder` is true.
- `timeline.replay` is `CATCHING_UP`, `LIVE`, `RECONNECTING`, `PAUSED` or `CLOSED`.

## Send a message

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#outbox
/** Sends a draft. It shows at once as a TimelineItem.Pending, and the outbox delivers it while the device is online. */
suspend fun sendDraft(timeline: Timeline, draft: String): PendingMessage = timeline.send(draft)

/** What a pending message's row says. */
fun pendingLabel(message: PendingMessage): String = when (message.state) {
    PendingState.QUEUED -> "Waiting to send"
    PendingState.SENDING -> "Sending…"
    PendingState.SENT -> "Sent"
    PendingState.UNCONFIRMED -> "Not confirmed yet"
    PendingState.FAILED -> "Not sent (${message.errorCode})"
}

/** Sends a failed or unconfirmed message again, as a new message. Ask first: an unconfirmed one may still arrive. */
suspend fun sendAgain(chat: Chat, message: PendingMessage): PendingMessage =
    chat.store.outbox.sendAgain(message.requestId)
```

Sends are optimistic: `timeline.send` stores the message and returns at once, and the outbox delivers it while the device is online, oldest first within each conversation. Every attempt reuses the message's request ID and payload, so ConvoHop applies it at most once. `store.outbox.pending` holds each unsent message's state:

| `PendingState` | Meaning |
| --- | --- |
| `QUEUED` | Waiting to be sent. Nothing was applied: it wasn't submitted yet, or ConvoHop refused the attempt, for example because the session expired. |
| `SENDING` | It may have been submitted. Until its outcome is known, it's resent only under the same request ID. |
| `SENT` | Committed. It leaves the outbox when the timeline shows it. |
| `UNCONFIRMED` | Three attempts or 60 seconds passed, and ConvoHop hasn't seen it. It may still commit, so it's never resent on its own. |
| `FAILED` | Not sent. ConvoHop rejected it, or three attempts or 60 seconds passed and none could have been applied. `errorCode` says why. |

`sendAgain` sends a copy of an `UNCONFIRMED` or `FAILED` message under a new request ID. An unconfirmed original may still commit and show twice, so ask the user first. `store.outbox.discard(requestId)` removes a message unless it's `SENDING`.

If the app is killed during a send, the next start resends the message under the same request ID, within the same three attempts and 60 seconds, then looks up its outcome. A message that wasn't submitted in time becomes `FAILED` with `RESOLUTION_REQUIRED`.

## Reconnect and resume

Timelines reconnect on their own. After a dropped connection, they catch up over HTTP from the last event they applied, then follow the conversation live again. While the session renews they pause, and they resume on the renewed session. When the network comes back, the store reconnects at once instead of waiting out its backoff, and the outbox delivers what it holds.

When the organization's prepaid credits run out or it reaches its monthly spend cap, the timeline closes with a 402 `CREDITS_EXHAUSTED` or `SPEND_CAP_REACHED` problem; open a new one once the organization can pay again. While ConvoHop can't verify current spend, the timeline reports `SPEND_UNVERIFIED` and reconnects no sooner than its `retryAfter`, even if the network comes back sooner.

## Typing and read receipts

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#typing
/** Call it whenever the draft changes, for example from doAfterTextChanged. */
fun onDraftChanged(timeline: Timeline, draft: String) {
    if (draft.isBlank()) timeline.typing.stop() else timeline.typing.keystroke()
}
```

`keystroke()` signals that the user is typing at most every 3 seconds, and signals that they stopped 5 seconds after the last keystroke. `timeline.send` stops it too. Typing signals are ephemeral: they're never retried, and failures go to the store's error callback. Signal only when `client.capabilities().features?.typing` is true. ConvoHop doesn't deliver other members' typing to clients yet, and has no presence.

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#receipts
/** Call it when the newest message is on screen. It returns false when there's nothing new to report. */
suspend fun onMessagesSeen(timeline: Timeline): Boolean = timeline.markRead()

/** The members, other than this user, whose read receipts cover a message. */
fun seenBy(timeline: Timeline, message: Message, me: String): List<String> =
    timeline.receipts.value.values
        .filter { it.principalId != me }
        .filter { receipt -> receipt.readThroughSequence?.let { it.toBigInteger() >= message.sequence.toBigInteger() } == true }
        .map { it.principalId }
```

`markRead()` reports that the user read through the newest message the timeline holds. `timeline.receipts` holds each member's delivery and read progress by principal ID. Sequences are decimal strings, so compare them as numbers, as the sample does. A receipt counts only for the member's current membership and visibility: when either changes, timelines drop the old receipt.

## Sign out

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#sign-out
/** Deletes the user's cached and unsent messages and the client's recovery file. */
suspend fun signOut(context: Context, chat: Chat, renewal: AutoCloseable?) {
    renewal?.close()
    chat.store.signOut() // Deletes cached messages, including unsent ones.
    chat.local.close()
    chat.network.close()
    chat.client.close()
    SharedPreferencesRecoveryStorage(context, chat.client).clear()
}
```

Signing out deletes the user's cached messages, including unsent ones, and the client's recovery file, which holds the text of unconfirmed sends. Have your backend revoke the session with [`sessions().revoke`](../../jvm/reference/server.md#projectserverclientsessionsrevoke-method), so that its token stops working before it expires. To stop the user's notifications on this device, see [stop notifications at sign-out](push.md#stop-notifications-at-sign-out).

## Without the store

You can also watch a conversation and send messages without the store.

### Watch a conversation's events

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#watch
/** Without a store: keeps [messages] at the conversation's newest page, oldest first. Collect it to render them. */
suspend fun watchConversation(client: ConvoHopClient, conversationId: String, messages: MutableStateFlow<List<Message>>): ConversationStream {
    suspend fun newest() = client.messages(conversationId).items.asReversed()
    messages.value = newest()
    // Replays from the stored cursor, so nothing is missed. apply runs on the client's dispatcher, one batch at a time.
    return client.watch(
        conversationId,
        apply = { events -> if (events.any { it.type.startsWith("message.") }) messages.value = newest() },
        // A dropped connection reconnects on its own. An error that ends the replay closes the stream before it gets here.
        onError = { error -> Log.w("Chat", "Conversation replay error", error) },
    )
}
```

`watch` replays the conversation's events from the cursor in recovery storage, or from the start, then follows the conversation live. Batches reach `apply` in order, and the cursor advances only after `apply` returns. Events say what changed, so read the current messages when one did. Close the stream when the screen goes away, and call `client.reconnectNow()` when the network comes back.

If ConvoHop requires a resynchronization, or the session no longer authorizes the replay, the stream closes and reports the error instead of skipping history. The SDK never resets a cursor on its own: `client.resyncAuthorizedHistory(conversationId, apply, onError)` replays the authorized history from the start.

### Send with your own request ID

```kotlin snippet=docs/languages/android/examples/src/main/kotlin/com/convohop/examples/Client.kt#send
/** Without a store: sends once. Keep the request ID with the draft and reuse it to retry, so it's applied once. */
suspend fun sendMessage(client: ConvoHopClient, conversationId: String, text: String, requestId: String): String =
    client.conversation(conversationId).messages.send(text, requestId = requestId).messageId
```

Create the request ID when the user writes the message, for example with `UUID.randomUUID().toString()`, and keep it with the draft. If the connection drops during a send, `send` throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached ConvoHop. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`.

## Next steps

- [Calling quickstart](calling.md): start, join and answer calls in a conversation.
- [Push notifications quickstart](push.md): show notifications for messages and calls when your app isn't open.
- [`ConvoHopClient` reference](../reference/android-core.md#convohopclient-class): every method, with the operation it sends.
- [`ConvoHopStore` reference](../reference/android-core.md#convohopstore-class): the store, its outbox and timelines.
