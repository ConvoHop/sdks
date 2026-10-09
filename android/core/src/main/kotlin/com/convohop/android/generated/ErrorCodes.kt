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
    /** A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId. */
    public const val ADMISSION_LIMIT: String = "ADMISSION_LIMIT"

    /** The participation already has an active media connection. */
    public const val ALREADY_CONNECTED: String = "ALREADY_CONNECTED"

    /** A resource with the same unique key already exists. */
    public const val ALREADY_EXISTS: String = "ALREADY_EXISTS"

    /** The authority is temporarily unavailable. Retry with the same requestId. */
    public const val AUTHORITY_UNAVAILABLE: String = "AUTHORITY_UNAVAILABLE"

    /** The credential delivery expired or can no longer be redeemed. */
    public const val CREDENTIAL_DELIVERY_EXPIRED: String = "CREDENTIAL_DELIVERY_EXPIRED"

    /** The credential carried by the stored result has expired. Request a new one. */
    public const val CREDENTIAL_EXPIRED: String = "CREDENTIAL_EXPIRED"

    /** The media credential must be refreshed before connecting. */
    public const val CREDENTIAL_REFRESH_REQUIRED: String = "CREDENTIAL_REFRESH_REQUIRED"

    /** Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly. */
    public const val CREDENTIAL_REQUIRED: String = "CREDENTIAL_REQUIRED"

    /** The cursor is ahead of the committed events of the conversation. */
    public const val CURSOR_AHEAD: String = "CURSOR_AHEAD"

    /** The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently. */
    public const val CURSOR_EXPIRED: String = "CURSOR_EXPIRED"

    /** The cursor is malformed or was not issued for this query. */
    public const val CURSOR_INVALID: String = "CURSOR_INVALID"

    /** The cursor does not continue the subscribed stream. */
    public const val CURSOR_MISMATCH: String = "CURSOR_MISMATCH"

    /** The cursor was issued for a different scope, caller or visibility. */
    public const val CURSOR_SCOPE_MISMATCH: String = "CURSOR_SCOPE_MISMATCH"

    /** The delivery was already redeemed by a different request. */
    public const val DELIVERY_CONSUMED: String = "DELIVERY_CONSUMED"

    /** The delivery must be redeemed before it can be acknowledged. */
    public const val DELIVERY_NOT_REDEEMED: String = "DELIVERY_NOT_REDEEMED"

    /** The deployment cannot host projects yet. */
    public const val DEPLOYMENT_NOT_READY: String = "DEPLOYMENT_NOT_READY"

    /** The feature is not available in this deployment. */
    public const val FEATURE_UNSUPPORTED: String = "FEATURE_UNSUPPORTED"

    /** The credential is valid but not allowed to perform this operation. */
    public const val FORBIDDEN: String = "FORBIDDEN"

    /** The live session generation changed. Read the current generation and retry. */
    public const val GENERATION_CONFLICT: String = "GENERATION_CONFLICT"

    /** A GraphQL error arrived without a recognized code. */
    public const val GRAPHQL_ERROR: String = "GRAPHQL_ERROR"

    /** The GraphQL request is malformed or fails validation. */
    public const val GRAPHQL_INVALID_REQUEST: String = "GRAPHQL_INVALID_REQUEST"

    /** The GraphQL document exceeds a depth, complexity or size limit. */
    public const val GRAPHQL_QUERY_LIMIT: String = "GRAPHQL_QUERY_LIMIT"

    /** The query response exceeds the response limit. Request a smaller page. */
    public const val GRAPHQL_RESPONSE_LIMIT: String = "GRAPHQL_RESPONSE_LIMIT"

    /** The HTTP exchange failed without a usable GraphQL error. */
    public const val HTTP_FAILURE: String = "HTTP_FAILURE"

    /** The requestId was already used with a different payload or caller. */
    public const val IDEMPOTENCY_CONFLICT: String = "IDEMPOTENCY_CONFLICT"

    /** The project incarnation changed. Discard state from the old incarnation and recover explicitly. */
    public const val INCARNATION_MISMATCH: String = "INCARNATION_MISMATCH"

    /** The connection to replace is not a current connection of this participation. */
    public const val INVALID_REPLACEMENT: String = "INVALID_REPLACEMENT"

    /** The input or request context failed validation. */
    public const val INVALID_REQUEST: String = "INVALID_REQUEST"

    /** The response did not match the expected shape or identity. The outcome is unknown. */
    public const val INVALID_RESPONSE: String = "INVALID_RESPONSE"

    /** The live session reached its alert limit. */
    public const val LIVE_ALERT_LIMIT: String = "LIVE_ALERT_LIMIT"

    /** The live session has ended or is ending. */
    public const val LIVE_SESSION_CLOSED: String = "LIVE_SESSION_CLOSED"

    /** The conversation already has an active live session. */
    public const val LIVE_SESSION_EXISTS: String = "LIVE_SESSION_EXISTS"

    /** The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly. */
    public const val MEDIA_CONNECT_FAILED: String = "MEDIA_CONNECT_FAILED"

    /** Media cutoff is not enforced yet for this live session. Retry after the cutoff completes. */
    public const val MEDIA_FENCE_REQUIRED: String = "MEDIA_FENCE_REQUIRED"

    /** Media for the live session is not ready yet. */
    public const val MEDIA_NOT_READY: String = "MEDIA_NOT_READY"

    /** Media for the live session is recovering. */
    public const val MEDIA_RECOVERING: String = "MEDIA_RECOVERING"

    /** Membership accounting needs operator reconciliation. */
    public const val MEMBERSHIP_COUNT_INVALID: String = "MEMBERSHIP_COUNT_INVALID"

    /** The conversation reached its member limit. */
    public const val MEMBER_LIMIT: String = "MEMBER_LIMIT"

    /** The message was deleted. */
    public const val MESSAGE_DELETED: String = "MESSAGE_DELETED"

    /** The requestId does not belong to an issueSession or renewSession request. */
    public const val NOT_A_SESSION_REQUEST: String = "NOT_A_SESSION_REQUEST"

    /** The resource does not exist or is not visible to the caller. */
    public const val NOT_FOUND: String = "NOT_FOUND"

    /** The mutation may have committed. Retry with the same requestId or resolve it. */
    public const val OUTCOME_UNKNOWN: String = "OUTCOME_UNKNOWN"

    /** A single item exceeds the page response limit. */
    public const val PAGE_ITEM_TOO_LARGE: String = "PAGE_ITEM_TOO_LARGE"

    /** The participation does not belong to the caller or the current live session generation. */
    public const val PARTICIPATION_MISMATCH: String = "PARTICIPATION_MISMATCH"

    /** The stored delivery permit has expired. Request a new permit. */
    public const val PERMIT_EXPIRED: String = "PERMIT_EXPIRED"

    /** The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again. */
    public const val PLAN_LIMIT_EXCEEDED: String = "PLAN_LIMIT_EXCEEDED"

    /** A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues. */
    public const val QUOTA_EXCEEDED: String = "QUOTA_EXCEEDED"

    /** A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId. */
    public const val RATE_LIMITED: String = "RATE_LIMITED"

    /** Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome. */
    public const val RECOVERY_STORAGE_FAILURE: String = "RECOVERY_STORAGE_FAILURE"

    /** The original request is too old to replay. */
    public const val REQUEST_EXPIRED: String = "REQUEST_EXPIRED"

    /** The request body exceeds the size limit. */
    public const val REQUEST_TOO_LARGE: String = "REQUEST_TOO_LARGE"

    /** The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing. */
    public const val RESOLUTION_REQUIRED: String = "RESOLUTION_REQUIRED"

    /** The response exceeds the size limit. */
    public const val RESPONSE_TOO_LARGE: String = "RESPONSE_TOO_LARGE"

    /** The subscription cannot continue. Replay from the last applied cursor. */
    public const val RESYNC_REQUIRED: String = "RESYNC_REQUIRED"

    /** The authority exhausted its internal retry budget. Retry later with the same requestId. */
    public const val RETRY_EXHAUSTED: String = "RETRY_EXHAUSTED"

    /** The expected revision or epoch is stale. Read the current state and retry with a new request. */
    public const val REVISION_CONFLICT: String = "REVISION_CONFLICT"

    /** The backend key lacks a scope this operation requires. The message names the scope. */
    public const val SCOPE_REQUIRED: String = "SCOPE_REQUIRED"

    /** The stored session receipt does not match its binding. */
    public const val SESSION_RECEIPT_BINDING_MISMATCH: String = "SESSION_RECEIPT_BINDING_MISMATCH"

    /** The stored session receipt failed validation. */
    public const val SESSION_RECEIPT_INVALID: String = "SESSION_RECEIPT_INVALID"

    /** The application session refresh callback failed. */
    public const val SESSION_REFRESH_FAILED: String = "SESSION_REFRESH_FAILED"

    /** The refreshed session was rejected because it does not match the current session. */
    public const val SESSION_REFRESH_REJECTED: String = "SESSION_REFRESH_REJECTED"

    /** The user session needs renewal and no refresh is configured, or it expired. */
    public const val SESSION_REFRESH_REQUIRED: String = "SESSION_REFRESH_REQUIRED"

    /** The refreshed session could not be verified. */
    public const val SESSION_REFRESH_UNVERIFIED: String = "SESSION_REFRESH_UNVERIFIED"

    /** The transport failed after the request may have been sent. Resolve or retry the original request. */
    public const val TRANSPORT_UNKNOWN: String = "TRANSPORT_UNKNOWN"

    /** The credential is missing, invalid or expired. */
    public const val UNAUTHENTICATED: String = "UNAUTHENTICATED"

    /** The webhook URL is not a public HTTPS destination. */
    public const val WEBHOOK_DESTINATION_DENIED: String = "WEBHOOK_DESTINATION_DENIED"

    /** The webhook endpoint is disabled. Enable it, then replay its deliveries. */
    public const val WEBHOOK_ENDPOINT_DISABLED: String = "WEBHOOK_ENDPOINT_DISABLED"

    /** The project reached its webhook endpoint limit. */
    public const val WEBHOOK_ENDPOINT_LIMIT: String = "WEBHOOK_ENDPOINT_LIMIT"

    /** A signing-secret rotation is already waiting for acknowledgement. */
    public const val WEBHOOK_ROTATION_PENDING: String = "WEBHOOK_ROTATION_PENDING"

    /** The endpoint's signing secret has not been acknowledged yet. */
    public const val WEBHOOK_SECRET_UNACKNOWLEDGED: String = "WEBHOOK_SECRET_UNACKNOWLEDGED"

    /** The observed serving epoch is stale. Route again, then retry. */
    public const val WRONG_REGION: String = "WRONG_REGION"

    /** Every listed code, keyed by code. */
    public val catalog: Map<String, ErrorCodeInfo> =
        listOf(
            ErrorCodeInfo(ADMISSION_LIMIT, "A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId.", "both", 429, true),
            ErrorCodeInfo(ALREADY_CONNECTED, "The participation already has an active media connection.", "server", 409, false),
            ErrorCodeInfo(ALREADY_EXISTS, "A resource with the same unique key already exists.", "server", 409, false),
            ErrorCodeInfo(AUTHORITY_UNAVAILABLE, "The authority is temporarily unavailable. Retry with the same requestId.", "both", 503, true),
            ErrorCodeInfo(CREDENTIAL_DELIVERY_EXPIRED, "The credential delivery expired or can no longer be redeemed.", "server", 409, false),
            ErrorCodeInfo(CREDENTIAL_EXPIRED, "The credential carried by the stored result has expired. Request a new one.", "server", 409, false),
            ErrorCodeInfo(CREDENTIAL_REFRESH_REQUIRED, "The media credential must be refreshed before connecting.", "both", 409, false),
            ErrorCodeInfo(CREDENTIAL_REQUIRED, "Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly.", "sdk", 409, false),
            ErrorCodeInfo(CURSOR_AHEAD, "The cursor is ahead of the committed events of the conversation.", "server", 409, false),
            ErrorCodeInfo(CURSOR_EXPIRED, "The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently.", "server", 409, false),
            ErrorCodeInfo(CURSOR_INVALID, "The cursor is malformed or was not issued for this query.", "server", 409, false),
            ErrorCodeInfo(CURSOR_MISMATCH, "The cursor does not continue the subscribed stream.", "server", 409, false),
            ErrorCodeInfo(CURSOR_SCOPE_MISMATCH, "The cursor was issued for a different scope, caller or visibility.", "server", 409, false),
            ErrorCodeInfo(DELIVERY_CONSUMED, "The delivery was already redeemed by a different request.", "server", 409, false),
            ErrorCodeInfo(DELIVERY_NOT_REDEEMED, "The delivery must be redeemed before it can be acknowledged.", "server", 409, false),
            ErrorCodeInfo(DEPLOYMENT_NOT_READY, "The deployment cannot host projects yet.", "server", 409, false),
            ErrorCodeInfo(FEATURE_UNSUPPORTED, "The feature is not available in this deployment.", "server", null, false),
            ErrorCodeInfo(FORBIDDEN, "The credential is valid but not allowed to perform this operation.", "server", 403, false),
            ErrorCodeInfo(GENERATION_CONFLICT, "The live session generation changed. Read the current generation and retry.", "server", 409, false),
            ErrorCodeInfo(GRAPHQL_ERROR, "A GraphQL error arrived without a recognized code.", "sdk", null, false),
            ErrorCodeInfo(GRAPHQL_INVALID_REQUEST, "The GraphQL request is malformed or fails validation.", "server", 400, false),
            ErrorCodeInfo(GRAPHQL_QUERY_LIMIT, "The GraphQL document exceeds a depth, complexity or size limit.", "server", 400, false),
            ErrorCodeInfo(GRAPHQL_RESPONSE_LIMIT, "The query response exceeds the response limit. Request a smaller page.", "server", 413, false),
            ErrorCodeInfo(HTTP_FAILURE, "The HTTP exchange failed without a usable GraphQL error.", "sdk", null, true),
            ErrorCodeInfo(IDEMPOTENCY_CONFLICT, "The requestId was already used with a different payload or caller.", "both", 409, false),
            ErrorCodeInfo(INCARNATION_MISMATCH, "The project incarnation changed. Discard state from the old incarnation and recover explicitly.", "both", 409, false),
            ErrorCodeInfo(INVALID_REPLACEMENT, "The connection to replace is not a current connection of this participation.", "server", 409, false),
            ErrorCodeInfo(INVALID_REQUEST, "The input or request context failed validation.", "both", 400, false),
            ErrorCodeInfo(INVALID_RESPONSE, "The response did not match the expected shape or identity. The outcome is unknown.", "sdk", null, true),
            ErrorCodeInfo(LIVE_ALERT_LIMIT, "The live session reached its alert limit.", "server", 409, false),
            ErrorCodeInfo(LIVE_SESSION_CLOSED, "The live session has ended or is ending.", "server", 409, false),
            ErrorCodeInfo(LIVE_SESSION_EXISTS, "The conversation already has an active live session.", "server", 409, false),
            ErrorCodeInfo(MEDIA_CONNECT_FAILED, "The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly.", "sdk", null, false),
            ErrorCodeInfo(MEDIA_FENCE_REQUIRED, "Media cutoff is not enforced yet for this live session. Retry after the cutoff completes.", "server", 409, false),
            ErrorCodeInfo(MEDIA_NOT_READY, "Media for the live session is not ready yet.", "server", 409, false),
            ErrorCodeInfo(MEDIA_RECOVERING, "Media for the live session is recovering.", "server", 409, false),
            ErrorCodeInfo(MEMBERSHIP_COUNT_INVALID, "Membership accounting needs operator reconciliation.", "server", 503, false),
            ErrorCodeInfo(MEMBER_LIMIT, "The conversation reached its member limit.", "server", 409, false),
            ErrorCodeInfo(MESSAGE_DELETED, "The message was deleted.", "server", 409, false),
            ErrorCodeInfo(NOT_A_SESSION_REQUEST, "The requestId does not belong to an issueSession or renewSession request.", "server", 400, false),
            ErrorCodeInfo(NOT_FOUND, "The resource does not exist or is not visible to the caller.", "server", 404, false),
            ErrorCodeInfo(OUTCOME_UNKNOWN, "The mutation may have committed. Retry with the same requestId or resolve it.", "server", 503, true),
            ErrorCodeInfo(PAGE_ITEM_TOO_LARGE, "A single item exceeds the page response limit.", "server", 413, false),
            ErrorCodeInfo(PARTICIPATION_MISMATCH, "The participation does not belong to the caller or the current live session generation.", "both", 409, false),
            ErrorCodeInfo(PERMIT_EXPIRED, "The stored delivery permit has expired. Request a new permit.", "server", 409, false),
            ErrorCodeInfo(PLAN_LIMIT_EXCEEDED, "The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again.", "server", 403, false),
            ErrorCodeInfo(QUOTA_EXCEEDED, "A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues.", "server", 429, false),
            ErrorCodeInfo(RATE_LIMITED, "A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId.", "server", 429, true),
            ErrorCodeInfo(RECOVERY_STORAGE_FAILURE, "Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome.", "sdk", null, false),
            ErrorCodeInfo(REQUEST_EXPIRED, "The original request is too old to replay.", "server", 409, false),
            ErrorCodeInfo(REQUEST_TOO_LARGE, "The request body exceeds the size limit.", "server", 413, false),
            ErrorCodeInfo(RESOLUTION_REQUIRED, "The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing.", "sdk", 409, false),
            ErrorCodeInfo(RESPONSE_TOO_LARGE, "The response exceeds the size limit.", "server", 413, false),
            ErrorCodeInfo(RESYNC_REQUIRED, "The subscription cannot continue. Replay from the last applied cursor.", "server", 409, false),
            ErrorCodeInfo(RETRY_EXHAUSTED, "The authority exhausted its internal retry budget. Retry later with the same requestId.", "server", 503, true),
            ErrorCodeInfo(REVISION_CONFLICT, "The expected revision or epoch is stale. Read the current state and retry with a new request.", "server", 409, false),
            ErrorCodeInfo(SCOPE_REQUIRED, "The backend key lacks a scope this operation requires. The message names the scope.", "server", 403, false),
            ErrorCodeInfo(SESSION_RECEIPT_BINDING_MISMATCH, "The stored session receipt does not match its binding.", "server", 503, false),
            ErrorCodeInfo(SESSION_RECEIPT_INVALID, "The stored session receipt failed validation.", "server", 503, false),
            ErrorCodeInfo(SESSION_REFRESH_FAILED, "The application session refresh callback failed.", "sdk", null, false),
            ErrorCodeInfo(SESSION_REFRESH_REJECTED, "The refreshed session was rejected because it does not match the current session.", "sdk", 409, false),
            ErrorCodeInfo(SESSION_REFRESH_REQUIRED, "The user session needs renewal and no refresh is configured, or it expired.", "sdk", 409, false),
            ErrorCodeInfo(SESSION_REFRESH_UNVERIFIED, "The refreshed session could not be verified.", "sdk", null, false),
            ErrorCodeInfo(TRANSPORT_UNKNOWN, "The transport failed after the request may have been sent. Resolve or retry the original request.", "sdk", null, true),
            ErrorCodeInfo(UNAUTHENTICATED, "The credential is missing, invalid or expired.", "both", 401, false),
            ErrorCodeInfo(WEBHOOK_DESTINATION_DENIED, "The webhook URL is not a public HTTPS destination.", "server", 400, false),
            ErrorCodeInfo(WEBHOOK_ENDPOINT_DISABLED, "The webhook endpoint is disabled. Enable it, then replay its deliveries.", "server", 409, false),
            ErrorCodeInfo(WEBHOOK_ENDPOINT_LIMIT, "The project reached its webhook endpoint limit.", "server", null, false),
            ErrorCodeInfo(WEBHOOK_ROTATION_PENDING, "A signing-secret rotation is already waiting for acknowledgement.", "server", 409, false),
            ErrorCodeInfo(WEBHOOK_SECRET_UNACKNOWLEDGED, "The endpoint's signing secret has not been acknowledged yet.", "server", 409, false),
            ErrorCodeInfo(WRONG_REGION, "The observed serving epoch is stale. Route again, then retry.", "server", 409, false),
        ).associateBy { it.code }
}
