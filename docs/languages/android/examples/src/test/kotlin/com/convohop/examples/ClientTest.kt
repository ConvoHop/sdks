package com.convohop.examples

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.convohop.android.SqliteLocalStore
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.core.ConvoHopProblem
import com.convohop.android.core.PendingMessage
import com.convohop.android.core.PendingState
import com.convohop.android.core.ReplayState
import com.convohop.android.core.TimelineItem
import com.convohop.android.generated.Message
import com.convohop.android.generated.SessionBootstrap
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.AfterClass
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowNetworkCapabilities

/** Runs the client quickstart's snippets against the conformance mock. */
@RunWith(RobolectricTestRunner::class)
class ClientTest {
    private val app: Application = RuntimeEnvironment.getApplication()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val opened = ArrayList<AutoCloseable>()

    @Before
    fun setUp() {
        mock.reset()
        // NetworkMonitor reports the device online when the default network reaches the internet.
        val connectivity = checkNotNull(app.getSystemService(ConnectivityManager::class.java))
        val internet = ShadowNetworkCapabilities.newInstance()
        shadowOf(internet).addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        shadowOf(connectivity).setNetworkCapabilities(connectivity.activeNetwork, internet)
    }

    @After
    fun tearDown() {
        scope.cancel()
        opened.asReversed().forEach(AutoCloseable::close)
    }

    @Test
    fun watchesAndSendsWithoutAStore() = test {
        val ada = mock.signIn("ada")
        val grace = mock.signIn("grace")
        val conversationId = mock.createConversation(ada, grace)
        val adaClient = connect(ada)
        val graceClient = connect(grace)
        val shown = MutableStateFlow<List<Message>>(listOf())
        opened += watchConversation(adaClient, conversationId, shown)

        val messageId = sendMessage(graceClient, conversationId, "Lunch at noon?", UUID.randomUUID().toString())
        val messages = shown.first { messages -> messages.any { it.messageId == messageId } }
        assertEquals(listOf("Lunch at noon?"), messages.map { it.text })
    }

    @Test
    fun resendsADraftDroppedBeforeCommitOnce() = test { resendsOnce("dropBeforeCommit") }

    @Test
    fun resendsADraftDroppedAfterCommitOnce() = test { resendsOnce("dropAfterCommit") }

    private suspend fun resendsOnce(action: String) {
        val ada = mock.signIn("ada")
        val conversationId = mock.createConversation(ada)
        val client = connect(ada)
        val requestId = UUID.randomUUID().toString()
        mock.injectFault("sendMessage", action) // The connection drops before or after ConvoHop commits the message.

        val lost = runCatching { sendMessage(client, conversationId, "Still there?", requestId) }.exceptionOrNull()
        assertTrue(lost is ConvoHopProblem && lost.outcome == "unknown")
        val messageId = sendMessage(client, conversationId, "Still there?", requestId)
        assertEquals(
            listOf(messageId to "Still there?"),
            client.messages(conversationId).items.map { it.messageId to it.text },
        )
        assertEquals(listOf(true, false), mock.attempts("sendMessage", requestId))
        // A request ID belongs to one draft. Changed text needs a new one.
        val conflict = runCatching { sendMessage(client, conversationId, "Still there??", requestId) }.exceptionOrNull()
        assertEquals("IDEMPOTENCY_CONFLICT", (conflict as? ConvoHopProblem)?.code)
    }

    @Test
    fun renewsTheSessionThroughYourBackend() = test {
        val ada = mock.signIn("ada")
        val session = checkNotNull(ada.bootstrap.session)
        val renewed = mock.issueSession(ada.principalId) // What your backend receives from ConvoHop and returns.
        MockWebServer().use { backend ->
            backend.enqueue(MockResponse().setHeader("content-type", "application/json").setBody(renewed.toString()))
            backend.enqueue(MockResponse().setResponseCode(401))
            val refresh = BackendSessionRefresh(backend.url("/session/renew").toString(), OkHttpClient())

            assertEquals(SessionBootstrap.fromJson(renewed), refresh.refresh(session))
            val request = backend.takeRequest()
            assertEquals("POST", request.method)
            val expected = buildJsonObject {
                put("sessionId", session.sessionId)
                put("expectedRevision", session.sessionRevision)
            }
            assertEquals(expected, Json.parseToJsonElement(request.body.readUtf8()))
            val failure = runCatching { refresh.refresh(session) }.exceptionOrNull()
            assertTrue(failure is IllegalStateException)
            assertEquals("Session renewal failed with HTTP 401", failure?.message)
        }
    }

    @Test
    fun showsADraftAtOnceAndDeliversIt() = test {
        val ada = mock.signIn("ada")
        val conversationId = mock.createConversation(ada)
        val chat = chat(connect(ada))
        val shown = MutableStateFlow<List<TimelineItem>>(emptyList())
        val timeline = showConversation(chat, conversationId, scope) { shown.value = it }.also(opened::add)

        val draft = sendDraft(timeline, "On my way")
        assertTrue(draft.state == PendingState.QUEUED || draft.state == PendingState.SENDING)
        // The sent message replaces the pending one.
        val items = shown.first { items -> items.isNotEmpty() && items.all { it is TimelineItem.Sent } }
        assertEquals(listOf("On my way"), items.map { (it as TimelineItem.Sent).message.text })
    }

    @Test
    fun catchesUpAfterTheConnectionDrops() = test {
        val ada = mock.signIn("ada")
        val grace = mock.signIn("grace")
        val conversationId = mock.createConversation(ada, grace)
        val chat = chat(connect(ada))
        val graceClient = connect(grace)
        val shown = MutableStateFlow<List<TimelineItem>>(emptyList())
        val timeline = showConversation(chat, conversationId, scope) { shown.value = it }.also(opened::add)
        mock.awaitSubscriptions(ada, conversationId, 1)

        // A network change or a server restart closes the live connection. The timeline reconnects on its own and
        // catches up, so it shows what Grace writes in the meantime.
        assertTrue(mock.dropRealtime(conversationId) > 0)
        sendMessage(graceClient, conversationId, "Lunch at noon?", UUID.randomUUID().toString())

        val items = shown.first { items -> items.any { it is TimelineItem.Sent } }
        assertEquals(listOf("Lunch at noon?"), items.filterIsInstance<TimelineItem.Sent>().map { it.message.text })
        mock.awaitSubscriptions(ada, conversationId, 2) // Live again.
        timeline.replay.first { it == ReplayState.LIVE }
    }

    @Test
    fun labelsPendingMessages() {
        fun label(state: PendingState, errorCode: String? = null): String =
            pendingLabel(PendingMessage("request", "conversation", "Hi", JsonObject(emptyMap()), 0, state, errorCode = errorCode))
        assertEquals("Waiting to send", label(PendingState.QUEUED))
        assertEquals("Sending…", label(PendingState.SENDING))
        assertEquals("Sent", label(PendingState.SENT))
        assertEquals("Not confirmed yet", label(PendingState.UNCONFIRMED))
        assertEquals("Not sent (NOT_FOUND)", label(PendingState.FAILED, "NOT_FOUND"))
    }

    @Test
    fun keepsAFailedSendForTheUserToSendAgain() = test {
        val ada = mock.signIn("ada")
        val grace = mock.signIn("grace")
        val conversationId = mock.createConversation(grace) // Ada isn't a member yet.
        val chat = chat(connect(ada))
        val timeline = chat.store.timeline(conversationId).also(opened::add)

        val draft = sendDraft(timeline, "Can I join?")
        val failed = chat.store.outbox.pending
            .first { pending -> pending.any { it.requestId == draft.requestId && it.state == PendingState.FAILED } }
            .single { it.requestId == draft.requestId }
        assertEquals("Not sent (NOT_FOUND)", pendingLabel(failed))

        mock.addMember(conversationId, ada)
        val again = sendAgain(chat, failed)
        assertNotEquals(draft.requestId, again.requestId) // A new message replaces the failed one.
        assertTrue(chat.store.outbox.pending.value.none { it.requestId == draft.requestId })
        // Once ConvoHop commits it, the outbox drops the message as the timeline shows it.
        chat.store.outbox.pending.first { pending -> pending.none { it.requestId == again.requestId && it.state != PendingState.SENT } }
        assertEquals(listOf("Can I join?"), chat.client.messages(conversationId).items.map { it.text })
    }

    @Test
    fun signalsTypingAndReportsReads() = test {
        val ada = mock.signIn("ada")
        val grace = mock.signIn("grace")
        val conversationId = mock.createConversation(ada, grace)
        val adaChat = chat(connect(ada))
        val graceChat = chat(connect(grace))
        val adaShown = MutableStateFlow<List<TimelineItem>>(emptyList())
        val graceShown = MutableStateFlow<List<TimelineItem>>(emptyList())
        val adaTimeline = showConversation(adaChat, conversationId, scope) { adaShown.value = it }.also(opened::add)
        val graceTimeline = showConversation(graceChat, conversationId, scope) { graceShown.value = it }.also(opened::add)

        // The mock doesn't relay typing, so check that each change reached it.
        onDraftChanged(graceTimeline, "Lunch?")
        mock.awaitRequests("typing", 1)
        onDraftChanged(graceTimeline, "")
        mock.awaitRequests("typing", 2)

        sendDraft(graceTimeline, "Lunch?")
        adaShown.first { items -> items.any { it is TimelineItem.Sent } }
        assertTrue(onMessagesSeen(adaTimeline))
        assertFalse(onMessagesSeen(adaTimeline)) // Nothing new since.

        val message = graceShown.first { items -> items.any { it is TimelineItem.Sent } }
            .filterIsInstance<TimelineItem.Sent>().single().message
        graceTimeline.receipts.first {
            seenBy(graceTimeline, message, grace.principalId) == listOf(ada.principalId)
        }
        assertEquals(listOf(ada.principalId), seenBy(graceTimeline, message, grace.principalId))
    }

    @Test
    fun signingOutDeletesTheUsersData() = test {
        val ada = mock.signIn("ada")
        val conversationId = mock.createConversation(ada)
        val client = connectUser(app, ada) // signOut closes everything, so the test doesn't.
        val chat = Chat(app, client)
        val timeline = chat.store.timeline(conversationId)
        sendDraft(timeline, "Signing off")
        while (chat.local.messages(conversationId).isEmpty()) delay(50)
        val recovery = app.getSharedPreferences("convohop.recovery.${mock.projectId}.${ada.principalId}", Context.MODE_PRIVATE)
        assertTrue(recovery.all.isNotEmpty())

        signOut(app, chat, renewal = null)
        assertTrue(recovery.all.isEmpty())
        SqliteLocalStore(app, "convohop.store.${mock.projectId}.${ada.principalId}.db").use { local ->
            assertEquals(emptyList<Message>(), local.messages(conversationId))
            assertEquals(emptyList<PendingMessage>(), local.pending())
        }
    }

    private suspend fun connect(signIn: SignIn): ConvoHopClient = connectUser(app, signIn).also(opened::add)

    private fun chat(client: ConvoHopClient): Chat = Chat(app, client).also { chat ->
        opened += AutoCloseable {
            chat.store.close()
            chat.local.close()
            chat.network.close()
        }
    }

    /** Runs a test's body, bounded so that a hang fails the test instead of the build. */
    private fun test(body: suspend CoroutineScope.() -> Unit) = runBlocking { withTimeout(30_000) { body() } }

    companion object {
        private lateinit var mock: Mock

        @BeforeClass
        @JvmStatic
        fun startMock() {
            mock = Mock.start()
        }

        @AfterClass
        @JvmStatic
        fun stopMock() {
            mock.close()
        }
    }
}
