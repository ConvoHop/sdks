package com.convohop.examples

// #region coroutines
import com.convohop.server.ProjectServerClient
import com.convohop.server.kotlin.interruptible
import com.convohop.server.kotlin.suspending
import com.convohop.server.model.Message
import com.convohop.server.model.MessagesRequestInput

// The blocking helpers run in interruptible: cancelling the coroutine interrupts the request.
suspend fun principalFor(server: ProjectServerClient, accountId: String): String =
    interruptible { server.principals().create(accountId).principalId }

// Every message that one member can see, newest first. The flow requests each page only after
// the previous one has been handled, and stops after the last.
suspend fun forEachMessage(
    server: ProjectServerClient,
    conversationId: String,
    readerId: String,
    pageSize: Int,
    action: suspend (Message) -> Unit,
) {
    val input = MessagesRequestInput.builder()
        .conversationId(conversationId)
        .actAsPrincipalId(readerId)
        .limit(pageSize)
        .build()
    server.communication().suspending().messagesPages(input).collect { page ->
        page.items.forEach { action(it) }
    }
}
// #endregion coroutines
