// Client quickstart snippets. ClientTest runs them under Robolectric against the conformance mock. The mock can't
// renew sessions, so the test runs BackendSessionRefresh against a stand-in backend and only compiles keepSessionAlive.
package com.convohop.examples

// #region imports
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
// #endregion imports

// #region connect
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
// #endregion connect

// #region renew
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
// #endregion renew

// #region store
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
// #endregion store

// #region outbox
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
// #endregion outbox

// #region typing
/** Call it whenever the draft changes, for example from doAfterTextChanged. */
fun onDraftChanged(timeline: Timeline, draft: String) {
    if (draft.isBlank()) timeline.typing.stop() else timeline.typing.keystroke()
}
// #endregion typing

// #region receipts
/** Call it when the newest message is on screen. It returns false when there's nothing new to report. */
suspend fun onMessagesSeen(timeline: Timeline): Boolean = timeline.markRead()

/** The members, other than this user, whose read receipts cover a message. */
fun seenBy(timeline: Timeline, message: Message, me: String): List<String> =
    timeline.receipts.value.values
        .filter { it.principalId != me }
        .filter { receipt -> receipt.readThroughSequence?.let { it.toBigInteger() >= message.sequence.toBigInteger() } == true }
        .map { it.principalId }
// #endregion receipts

// #region sign-out
/** Deletes the user's cached and unsent messages and the client's recovery file. */
suspend fun signOut(context: Context, chat: Chat, renewal: AutoCloseable?) {
    renewal?.close()
    chat.store.signOut() // Deletes cached messages, including unsent ones.
    chat.local.close()
    chat.network.close()
    chat.client.close()
    SharedPreferencesRecoveryStorage(context, chat.client).clear()
}
// #endregion sign-out

// #region watch
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
// #endregion watch

// #region send
/** Without a store: sends once. Keep the request ID with the draft and reuse it to retry, so it's applied once. */
suspend fun sendMessage(client: ConvoHopClient, conversationId: String, text: String, requestId: String): String =
    client.conversation(conversationId).messages.send(text, requestId = requestId).messageId
// #endregion send
