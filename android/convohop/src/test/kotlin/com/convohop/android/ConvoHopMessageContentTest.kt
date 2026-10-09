package com.convohop.android

import com.convohop.android.generated.Message
import com.convohop.android.push.MessageContent
import com.convohop.android.push.PushNotification
import kotlinx.coroutines.awaitCancellation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.util.Collections
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
internal class ConvoHopMessageContentTest {
    private val reader = FakeReader()

    @Test
    fun readsTheTextWithTheUsersOwnSession() {
        val content = checkNotNull(inBackground(content()))
        assertNull(content.title)
        assertEquals("hello", content.body)
        assertEquals(listOf("$CONVERSATION/$MESSAGE"), reader.reads)
    }

    @Test
    fun neverBlocksTheMainThread() {
        assertNull(content().content(push()))
        assertTrue(reader.reads.isEmpty())
    }

    @Test
    fun aPushForAnotherProjectOrUserOrWithNobodySignedInShowsTheGenericText() {
        assertNull(inBackground(content(), push(projectId = OTHER)))
        assertNull(inBackground(content(), push(recipientId = OTHER)))
        assertNull(inBackground(ConvoHopMessageContent({ null }, TIMEOUT)))
        assertTrue(reader.reads.isEmpty())
    }

    @Test
    fun aDeletedBlankOrMismatchedMessageShowsTheGenericText() {
        val messages = listOf(
            message().copy(deleted = true, text = null, props = null),
            message().copy(text = " "),
            message().copy(messageId = OTHER),
            message().copy(conversationId = OTHER),
        )
        for (message in messages) {
            reader.answer = { message }
            assertNull(inBackground(content()))
        }
    }

    @Test
    fun aFailureOrTimeoutShowsTheGenericText() {
        reader.answer = { throw IllegalStateException("offline") }
        assertNull(inBackground(content()))
        reader.answer = { awaitCancellation() }
        assertNull(inBackground(content()))
    }

    @Test
    fun theTimeoutMustBePositive() {
        val error = runCatching { ConvoHopMessageContent(timeoutMillis = 0) { null } }.exceptionOrNull()
        assertTrue(error is IllegalArgumentException)
    }

    private fun content(): ConvoHopMessageContent = ConvoHopMessageContent({ reader }, TIMEOUT)

    // FCM delivers on a background thread.
    private fun inBackground(provider: ConvoHopMessageContent, notification: PushNotification.Message = push()): MessageContent? {
        val executor = Executors.newSingleThreadExecutor()
        try {
            return executor.submit<MessageContent?> { provider.content(notification) }.get(10, TimeUnit.SECONDS)
        } finally {
            executor.shutdownNow()
        }
    }

    private class FakeReader : MessageReader {
        override val projectId: String = PROJECT
        override val principalId: String = RECIPIENT
        val reads: MutableList<String> = Collections.synchronizedList(ArrayList())

        @Volatile
        var answer: suspend () -> Message = { message() }

        override suspend fun getMessage(conversationId: String, messageId: String): Message {
            reads += "$conversationId/$messageId"
            return answer()
        }
    }

    private companion object {
        const val TIMEOUT = 200L
        const val PROJECT = "00000000-0000-4000-8000-000000000001"
        const val RECIPIENT = "00000000-0000-4000-8000-000000000002"
        const val CONVERSATION = "00000000-0000-4000-8000-000000000003"
        const val MESSAGE = "00000000-0000-4000-8000-000000000004"
        const val OTHER = "00000000-0000-4000-8000-000000000009"

        fun message(): Message = Message(
            messageId = MESSAGE,
            conversationId = CONVERSATION,
            authorId = "user-2",
            sequence = "1",
            revision = "1",
            revisionSequence = "1",
            createdAt = "2026-01-01T00:00:00.000Z",
            deleted = false,
            text = "hello",
        )

        fun push(projectId: String = PROJECT, recipientId: String = RECIPIENT): PushNotification.Message =
            PushNotification.Message(
                eventId = "00000000-0000-4000-8000-000000000005",
                occurredAt = "2026-01-01T00:00:00.000Z",
                occurredAtMillis = 1_767_225_600_000,
                projectId = projectId,
                recipientId = recipientId,
                conversationId = CONVERSATION,
                senderId = "user-2",
                title = null,
                body = null,
                messageId = MESSAGE,
            )
    }
}
