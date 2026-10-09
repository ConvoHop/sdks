// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.kotlin

import com.convohop.server.api.BetaApi
import com.convohop.server.model.Capabilities
import com.convohop.server.model.ClaimWidgetInput
import com.convohop.server.model.CreateWidgetInput
import com.convohop.server.model.Receipt
import com.convohop.server.model.RequestAccessInput
import com.convohop.server.model.ResolveInput
import com.convohop.server.model.Widget
import com.convohop.server.model.WidgetsInput
import com.convohop.server.model.WidgetsPayload
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

/**
 * Suspending view of [BetaApi]. Each call runs on [dispatcher]. Cancelling the calling
 * coroutine interrupts the blocking request and the call fails with a CancellationException
 * whose cause is the lost-request problem; a mutation stays in the client's recovery journal.
 */
public class BetaSuspendApi(
    private val api: BetaApi,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    /** Suspending [BetaApi.capabilities]. */
    public suspend fun capabilities(): Capabilities =
        interruptible(dispatcher) { api.capabilities() }

    /** Suspending [BetaApi.resolveRequest]. */
    public suspend fun resolveRequest(input: ResolveInput): Receipt =
        interruptible(dispatcher) { api.resolveRequest(input) }

    /** Suspending [BetaApi.widgets]. */
    public suspend fun widgets(input: WidgetsInput? = null): WidgetsPayload =
        interruptible(dispatcher) { api.widgets(input) }

    /** Suspending [BetaApi.createWidget]. */
    public suspend fun createWidget(input: CreateWidgetInput, requestId: String? = null): Widget =
        interruptible(dispatcher) { api.createWidget(input, requestId) }

    /** Suspending [BetaApi.requestAccess]. */
    public suspend fun requestAccess(input: RequestAccessInput, requestId: String? = null): Receipt =
        interruptible(dispatcher) { api.requestAccess(input, requestId) }

    /** Suspending [BetaApi.claimWidget]. */
    public suspend fun claimWidget(input: ClaimWidgetInput, requestId: String? = null): Widget =
        interruptible(dispatcher) { api.claimWidget(input, requestId) }
}

/** A suspending view of this plane API whose calls run on [dispatcher]. */
public fun BetaApi.suspending(dispatcher: CoroutineDispatcher = Dispatchers.IO): BetaSuspendApi =
    BetaSuspendApi(this, dispatcher)
