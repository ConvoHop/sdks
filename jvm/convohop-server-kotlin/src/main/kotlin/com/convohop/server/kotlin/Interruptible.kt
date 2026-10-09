package com.convohop.server.kotlin

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.isActive
import kotlinx.coroutines.runInterruptible

/**
 * Runs a blocking SDK [call] on [dispatcher] and interrupts it when the calling coroutine is cancelled.
 * The suspending plane APIs run every call this way; use it for the blocking client helpers too, as in
 * `interruptible { server.principals().create(accountId) }`.
 *
 * The transport reports an interrupted request as a lost request whose outcome is unknown, not as an
 * [InterruptedException]. Left alone, that problem would complete the cancelled coroutine as a failure
 * and cancel its parent, so a failure that races cancellation becomes a [CancellationException] whose
 * cause is the original problem. A mutation stays in the client's recovery journal either way.
 */
public suspend fun <T> interruptible(dispatcher: CoroutineDispatcher = Dispatchers.IO, call: () -> T): T =
    try {
        runInterruptible(dispatcher, call)
    } catch (failure: Throwable) {
        if (failure !is CancellationException && !currentCoroutineContext().isActive) {
            throw CancellationException("The ConvoHop call was cancelled", failure)
        }
        throw failure
    }
