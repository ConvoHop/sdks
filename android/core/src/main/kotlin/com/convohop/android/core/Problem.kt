package com.convohop.android.core

/**
 * An authority or SDK problem in the protocol's normalized form.
 *
 * [outcome] says what is known about the request: `rejected` (not applied),
 * `committed` or `accepted` (applied), or `unknown` (resolve the original
 * request before deciding). Transport uncertainty is never reported as
 * rejection or commit. Messages never contain credentials.
 */
public open class ConvoHopProblem(
    public val code: String,
    public val requestId: String,
    public val outcome: String,
    /** The HTTP status, or 0 when no authority response was observed. */
    public val status: Int,
    override val message: String,
    /**
     * Whole seconds to wait before resending the same request, when the authority sent a delay (for example
     * with `RATE_LIMITED`). The SDK never resends a call that the app made. When it reconnects a conversation's
     * stream or resends a queued message on its own, it waits at least this long first.
     */
    public val retryAfter: Long? = null,
    cause: Throwable? = null,
) : RuntimeException(message, cause) {
    override fun toString(): String = "ConvoHopProblem($code, $outcome, $status): $message"
}

private val SCOPE_MESSAGE = Regex("The backend key requires the current ([a-z][A-Za-z0-9]{0,63}) scope")

/** `SCOPE_REQUIRED`: the credential lacks a scope the operation needs. */
public class ScopeRequiredProblem(
    requestId: String,
    outcome: String,
    status: Int,
    message: String,
    retryAfter: Long? = null,
) : ConvoHopProblem("SCOPE_REQUIRED", requestId, outcome, status, message, retryAfter) {
    /** The missing scope, or null when the message does not match the documented wording. */
    public val scope: String? = SCOPE_MESSAGE.matchEntire(message)?.groupValues?.get(1)
}

/** Builds the most specific problem class for an authority error code. */
internal fun authorityProblem(
    code: String,
    requestId: String,
    outcome: String,
    status: Int,
    message: String,
    retryAfter: Long?,
): ConvoHopProblem =
    if (code == "SCOPE_REQUIRED") {
        ScopeRequiredProblem(requestId, outcome, status, message, retryAfter)
    } else {
        ConvoHopProblem(code, requestId, outcome, status, message, retryAfter)
    }
