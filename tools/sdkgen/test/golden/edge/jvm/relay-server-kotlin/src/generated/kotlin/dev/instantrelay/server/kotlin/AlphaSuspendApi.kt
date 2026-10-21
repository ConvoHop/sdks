// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package dev.instantrelay.server.kotlin

import dev.instantrelay.server.api.AlphaApi
import dev.instantrelay.server.model.Capabilities
import dev.instantrelay.server.model.FetchInput
import dev.instantrelay.server.model.Job
import dev.instantrelay.server.model.JobInput
import dev.instantrelay.server.model.Receipt
import dev.instantrelay.server.model.RedeemInput
import dev.instantrelay.server.model.ResolveInput
import dev.instantrelay.server.model.StartJobInput
import dev.instantrelay.server.model.StartJobPayload
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

/**
 * Suspending view of [AlphaApi]. Each call runs on [dispatcher]. Cancelling the calling
 * coroutine interrupts the blocking request and the call fails with a CancellationException
 * whose cause is the lost-request problem; a mutation stays in the client's recovery journal.
 */
public class AlphaSuspendApi(
    private val api: AlphaApi,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    /** Suspending [AlphaApi.capabilities]. */
    public suspend fun capabilities(): Capabilities =
        interruptible(dispatcher) { api.capabilities() }

    /** Suspending [AlphaApi.resolveRequest]. */
    public suspend fun resolveRequest(input: ResolveInput): Receipt =
        interruptible(dispatcher) { api.resolveRequest(input) }

    /** Suspending [AlphaApi.job]. */
    public suspend fun job(input: JobInput): Job? =
        interruptible(dispatcher) { api.job(input) }

    /** Suspending [AlphaApi.fetchHTTPStatus]. */
    @Deprecated("Use capabilities.")
    @Suppress("DEPRECATION")
    public suspend fun fetchHTTPStatus(input: FetchInput? = null): Int? =
        interruptible(dispatcher) { api.fetchHTTPStatus(input) }

    /** Suspending [AlphaApi.startJob]. */
    public suspend fun startJob(input: StartJobInput, requestId: String? = null): StartJobPayload =
        interruptible(dispatcher) { api.startJob(input, requestId) }

    /** Suspending [AlphaApi.redeem]. */
    public suspend fun redeem(input: RedeemInput, permit: String, requestId: String? = null): Receipt =
        interruptible(dispatcher) { api.redeem(input, permit, requestId) }
}

/** A suspending view of this plane API whose calls run on [dispatcher]. */
public fun AlphaApi.suspending(dispatcher: CoroutineDispatcher = Dispatchers.IO): AlphaSuspendApi =
    AlphaSuspendApi(this, dispatcher)
