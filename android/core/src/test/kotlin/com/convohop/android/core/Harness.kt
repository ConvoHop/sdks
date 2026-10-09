@file:OptIn(ExperimentalCoroutinesApi::class)

package com.convohop.android.core

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent

/**
 * Clients and stores for one test against a [FakeAuthority], on the test's
 * virtual clock. Closing the harness closes everything it made, which a
 * test must do so that reconnect and renewal timers do not keep the
 * scheduler busy.
 */
internal class Harness(private val test: TestScope) : AutoCloseable {
    private val dispatcher = StandardTestDispatcher(test.testScheduler)
    private val owned = ArrayList<AutoCloseable>()

    /** One environment for every client, so request IDs never repeat across simulated restarts. */
    val environment = TestEnvironment(::now)
    val authority = FakeAuthority(::now)
    val online = MutableStateFlow(true)

    /** Everything the stores and timelines reported to their error callbacks. */
    val errors = ArrayList<Throwable>()

    fun now(): Long = BASE_TIME + test.testScheduler.currentTime

    fun client(
        token: String = authority.issue(),
        storage: RecoveryStorage? = null,
        refresh: SessionRefresh? = null,
    ): ConvoHopClient {
        val options = ConvoHopClientOptions(
            baseUrl = BASE_URL,
            projectId = PROJECT,
            sessionToken = token,
            incarnation = INCARNATION,
            principalId = ME,
            recoveryStorage = storage,
            sessionRefresh = refresh,
            http = authority,
            realtime = authority,
            environment = environment,
            dispatcher = dispatcher,
        )
        return ConvoHopClient(options).also(owned::add)
    }

    fun store(client: ConvoHopClient = client(), local: LocalStore = MemoryLocalStore()): ConvoHopStore =
        ConvoHopStore(client, local, online) { errors += it }.also(owned::add)

    /** Runs what is due now. */
    fun settle() = test.runCurrent()

    /** Moves the clock forward by [millis] and runs everything due by then. */
    fun advance(millis: Long) {
        test.testScheduler.advanceTimeBy(millis)
        test.runCurrent()
    }

    /** Error codes reported so far, for assertions. */
    fun errorCodes(): List<String> = errors.map { (it as? ConvoHopProblem)?.code ?: it.javaClass.simpleName }

    override fun close() {
        // Newest first: stores stop their timelines and outbox before their client closes.
        for (item in owned.asReversed()) item.close()
        owned.clear()
        test.runCurrent()
    }
}
