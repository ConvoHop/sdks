package com.convohop.server.kotlin

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * A cold flow of [pages]. Each collection starts a new iteration, and each page is requested on [dispatcher] when the
 * collector is ready for it. Cancelling the collector interrupts the request in flight, as [interruptible] does.
 */
internal fun <P : Any> pageFlow(dispatcher: CoroutineDispatcher, pages: Iterable<P>): Flow<P> =
    flow {
        val iterator = pages.iterator()
        while (interruptible(dispatcher) { iterator.hasNext() }) {
            emit(iterator.next())
        }
    }
