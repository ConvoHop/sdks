package com.convohop.examples

import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CoroutinesTest {
    private lateinit var mock: Mock

    @BeforeAll
    fun start() {
        mock = Mock.start()
    }

    @AfterAll
    fun stop() {
        mock.close()
    }

    @Test
    fun principalForReturnsTheSamePrincipalForAnAccount(): Unit = runBlocking {
        val server = mock.connect()
        val accountId = "dana-${UUID.randomUUID()}"
        assertEquals(principalFor(server, accountId), principalFor(server, accountId))
    }

    @Test
    fun forEachMessageVisitsEveryMessageNewestFirst(): Unit = runBlocking {
        val server = mock.connect()
        val alice = mock.login(server, "alice")
        val bob = mock.login(server, "bob")
        val conversationId = Server.createConversation(server, "Pages", listOf(alice, bob), UUID.randomUUID().toString())
        val sent = (1..5).map { Server.sendAs(server, conversationId, alice, "Message $it", UUID.randomUUID().toString()) }
        val seen = mutableListOf<String>()
        forEachMessage(server, conversationId, bob, pageSize = 2) { seen.add(it.messageId) }
        assertEquals(sent.reversed(), seen)
    }
}
