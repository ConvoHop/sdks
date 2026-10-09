package com.convohop.android

import android.os.Looper
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.generated.Message
import com.convohop.android.push.MessageContent
import com.convohop.android.push.MessageContentProvider
import com.convohop.android.push.PushNotification
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout

/**
 * Fills in message notifications when the push carries no text, which is
 * the default: previews are off unless the project opts in. It reads the
 * message with the signed-in user's own session, so the text never passes
 * through the push service. Set it as
 * [ConvoHopNotificationOptions.messageContent][com.convohop.android.push.ConvoHopNotificationOptions.messageContent].
 *
 * [client] returns the signed-in user's client, or null when nobody is
 * signed in. Pushes for another project or user, deleted messages and
 * failures within [timeoutMillis] show the generic text instead.
 */
public class ConvoHopMessageContent internal constructor(
    private val reader: () -> MessageReader?,
    private val timeoutMillis: Long,
) : MessageContentProvider {
    public constructor(timeoutMillis: Long = DEFAULT_TIMEOUT_MILLIS, client: () -> ConvoHopClient?) :
        this({ client()?.let(::ClientReader) }, timeoutMillis)

    init {
        require(timeoutMillis > 0) { "timeoutMillis must be positive" }
    }

    override fun content(message: PushNotification.Message): MessageContent? {
        if (Looper.myLooper() == Looper.getMainLooper()) return null
        val reader = reader() ?: return null
        if (message.projectId != reader.projectId || message.recipientId != reader.principalId) return null
        val fetched = try {
            runBlocking { withTimeout(timeoutMillis) { reader.getMessage(message.conversationId, message.messageId) } }
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
            return null
        } catch (_: Exception) {
            return null
        }
        if (fetched.deleted || fetched.messageId != message.messageId || fetched.conversationId != message.conversationId) return null
        val text = fetched.text?.takeIf { it.isNotBlank() } ?: return null
        return MessageContent(null, text)
    }

    public companion object {
        public const val DEFAULT_TIMEOUT_MILLIS: Long = 5_000
    }
}

/** Reads one message as the signed-in user. */
internal interface MessageReader {
    val projectId: String
    val principalId: String

    suspend fun getMessage(conversationId: String, messageId: String): Message
}

private class ClientReader(private val client: ConvoHopClient) : MessageReader {
    override val projectId: String get() = client.projectId
    override val principalId: String get() = client.principalId

    override suspend fun getMessage(conversationId: String, messageId: String): Message = client.getMessage(conversationId, messageId)
}
