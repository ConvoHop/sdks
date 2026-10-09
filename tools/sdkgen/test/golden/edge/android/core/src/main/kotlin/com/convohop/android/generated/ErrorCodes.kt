// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.android.generated

/** What the schema says about one error code. */
public class ErrorCodeInfo internal constructor(
    public val code: String,
    public val summary: String,
    /** `server`, `sdk` or `both`. */
    public val origin: String,
    /** The HTTP-equivalent status, when the code has one. */
    public val status: Int?,
    /** Whether a later attempt with the same requestId may succeed. */
    public val retryable: Boolean,
)

/** Stable error codes. The set is open: handle codes this SDK does not list. */
public object ErrorCodes {
    /** The cursor is too old. */
    public const val CURSOR_EXPIRED: String = "CURSOR_EXPIRED"

    /** The request is malformed. */
    public const val INVALID_REQUEST: String = "INVALID_REQUEST"

    /** The resource does not exist. */
    public const val NOT_FOUND: String = "NOT_FOUND"

    /** The transport failed after sending. */
    public const val TRANSPORT_UNKNOWN: String = "TRANSPORT_UNKNOWN"

    /** Temporarily unavailable. */
    public const val UNAVAILABLE: String = "UNAVAILABLE"

    /** Every listed code, keyed by code. */
    public val catalog: Map<String, ErrorCodeInfo> =
        listOf(
            ErrorCodeInfo(CURSOR_EXPIRED, "The cursor is too old.", "server", 410, false),
            ErrorCodeInfo(INVALID_REQUEST, "The request is malformed.", "both", 400, false),
            ErrorCodeInfo(NOT_FOUND, "The resource does not exist.", "server", 404, false),
            ErrorCodeInfo(TRANSPORT_UNKNOWN, "The transport failed after sending.", "sdk", null, true),
            ErrorCodeInfo(UNAVAILABLE, "Temporarily unavailable.", "server", 503, true),
        ).associateBy { it.code }
}
