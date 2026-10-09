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

    /** Agent signup is not offered in this environment. */
    public const val AGENTIC_NOT_CONFIGURED: String = "AGENTIC_NOT_CONFIGURED"

    /** The confirmation code differs from the one the agent shows. The fifth wrong code closes the signup request. */
    public const val AGENT_CONFIRMATION_CODE_INVALID: String = "AGENT_CONFIRMATION_CODE_INVALID"

    /** The agent's grant has expired. The agent needs a new signup request approved. */
    public const val AGENT_GRANT_EXPIRED: String = "AGENT_GRANT_EXPIRED"

    /** The owner revoked the agent's grant. */
    public const val AGENT_GRANT_REVOKED: String = "AGENT_GRANT_REVOKED"

    /** The grant already has as many active keys as it allows. Issue another after one expires or the owner revokes one. */
    public const val AGENT_KEY_LIMIT: String = "AGENT_KEY_LIMIT"

    /** The purchase would take this month's agent credit purchases beyond the limit the owner set. */
    public const val AGENT_PURCHASE_LIMIT_EXCEEDED: String = "AGENT_PURCHASE_LIMIT_EXCEEDED"

    /** A requested scope is outside the agent's grant. */
    public const val AGENT_SCOPE_NOT_GRANTED: String = "AGENT_SCOPE_NOT_GRANTED"

    /** The signup request is no longer pending: it was approved, rejected, locked by wrong confirmation codes, or has expired. */
    public const val AGENT_SIGNUP_CLOSED: String = "AGENT_SIGNUP_CLOSED"

    /** The owner's email address is refused, for example for a disposable domain. */
    public const val AGENT_SIGNUP_EMAIL_REJECTED: String = "AGENT_SIGNUP_EMAIL_REJECTED"

    /** The signup is not approved, or its organization and project are still being provisioned. Poll agentSignup until it is ready. */
    public const val AGENT_SIGNUP_NOT_READY: String = "AGENT_SIGNUP_NOT_READY"

    /** The owner opted out of agent signup requests to this email address. */
    public const val AGENT_SIGNUP_SUPPRESSED: String = "AGENT_SIGNUP_SUPPRESSED"

    /** The participation already has an active media connection. */
    public const val ALREADY_CONNECTED: String = "ALREADY_CONNECTED"

    /** A resource with the same unique key already exists. */
    public const val ALREADY_EXISTS: String = "ALREADY_EXISTS"

    /** The authority is temporarily unavailable. Retry with the same requestId. */
    public const val AUTHORITY_UNAVAILABLE: String = "AUTHORITY_UNAVAILABLE"

    /** The billing provider's catalog conflicts with the configured price book, for example a duplicated or unsafe object. An operator must resolve it. */
    public const val BILLING_CATALOG_CONFLICT: String = "BILLING_CATALOG_CONFLICT"

    /** The billing provider's catalog does not match the configured price book yet. An operator must sync it. */
    public const val BILLING_CATALOG_NOT_SYNCED: String = "BILLING_CATALOG_NOT_SYNCED"

    /** The organization has no billing account yet. Start a checkout first. */
    public const val BILLING_CUSTOMER_MISSING: String = "BILLING_CUSTOMER_MISSING"

    /** The billing link of this request is no longer valid. Send a new request with a new requestId. */
    public const val BILLING_LINK_EXPIRED: String = "BILLING_LINK_EXPIRED"

    /** Billing is not configured in this environment. */
    public const val BILLING_NOT_CONFIGURED: String = "BILLING_NOT_CONFIGURED"

    /** The plan is not offered for self-service checkout. */
    public const val BILLING_PLAN_UNAVAILABLE: String = "BILLING_PLAN_UNAVAILABLE"

    /** The organization's billing account belongs to a different billing provider. */
    public const val BILLING_PROVIDER_CHANGED: String = "BILLING_PROVIDER_CHANGED"

    /** The billing provider refused the request. */
    public const val BILLING_PROVIDER_REJECTED: String = "BILLING_PROVIDER_REJECTED"

    /** The organization already has a subscription. Change it in the billing portal. */
    public const val BILLING_SUBSCRIPTION_ACTIVE: String = "BILLING_SUBSCRIPTION_ACTIVE"

    /** The organization is suspended for an unpaid balance. Update its payment method in the billing portal. */
    public const val BILLING_SUSPENDED: String = "BILLING_SUSPENDED"

    /** The credential delivery expired or can no longer be redeemed. */
    public const val CREDENTIAL_DELIVERY_EXPIRED: String = "CREDENTIAL_DELIVERY_EXPIRED"

    /** The credential carried by the stored result has expired. Request a new one. */
    public const val CREDENTIAL_EXPIRED: String = "CREDENTIAL_EXPIRED"

    /** The media credential must be refreshed before connecting. */
    public const val CREDENTIAL_REFRESH_REQUIRED: String = "CREDENTIAL_REFRESH_REQUIRED"

    /** Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly. */
    public const val CREDENTIAL_REQUIRED: String = "CREDENTIAL_REQUIRED"

    /** Prepaid credits are spent and the monthly spend cap is zero, so billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap. */
    public const val CREDITS_EXHAUSTED: String = "CREDITS_EXHAUSTED"

    /** Credits apply only to a billed subscription, and none is in force. */
    public const val CREDITS_REQUIRE_METERED_PLAN: String = "CREDITS_REQUIRE_METERED_PLAN"

    /** The credit amount is outside the allowed purchase range. */
    public const val CREDIT_AMOUNT_OUT_OF_RANGE: String = "CREDIT_AMOUNT_OUT_OF_RANGE"

    /** Too many of the organization's credit grants are unconsumed, counting purchases still in progress. Buy more after invoices consume some. */
    public const val CREDIT_GRANT_LIMIT_REACHED: String = "CREDIT_GRANT_LIMIT_REACHED"

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

    /** The payment rail declined the payment. Nothing was charged. */
    public const val PAYMENT_DECLINED: String = "PAYMENT_DECLINED"

    /** No payment rail is enabled in this environment. */
    public const val PAYMENT_RAIL_NOT_CONFIGURED: String = "PAYMENT_RAIL_NOT_CONFIGURED"

    /** The stored delivery permit has expired. Request a new permit. */
    public const val PERMIT_EXPIRED: String = "PERMIT_EXPIRED"

    /** The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again. */
    public const val PLAN_LIMIT_EXCEEDED: String = "PLAN_LIMIT_EXCEEDED"

    /** A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues. */
    public const val QUOTA_EXCEEDED: String = "QUOTA_EXCEEDED"

    /** A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId. */
    public const val RATE_LIMITED: String = "RATE_LIMITED"

    /** The SDK's recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again. */
    public const val RECOVERY_LIMIT: String = "RECOVERY_LIMIT"

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

    /** The spend month's usage charges reached the charge limit that the organization's prepaid credits and monthly spend cap set, less a safety margin. Billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap. */
    public const val SPEND_CAP_REACHED: String = "SPEND_CAP_REACHED"

    /** Current spend cannot be verified, so billable usage beyond the plan's allowances fails closed before any effect (WebSocket close 4503). extensions.meter names the meter and extensions.periodEnd ends the spend month; extensions.retryAfter (HTTP Retry-After) counts the seconds before the same request may succeed. */
    public const val SPEND_UNVERIFIED: String = "SPEND_UNVERIFIED"

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
            ErrorCodeInfo(AGENTIC_NOT_CONFIGURED, "Agent signup is not offered in this environment.", "server", 503, false),
            ErrorCodeInfo(AGENT_CONFIRMATION_CODE_INVALID, "The confirmation code differs from the one the agent shows. The fifth wrong code closes the signup request.", "server", 403, false),
            ErrorCodeInfo(AGENT_GRANT_EXPIRED, "The agent's grant has expired. The agent needs a new signup request approved.", "server", 403, false),
            ErrorCodeInfo(AGENT_GRANT_REVOKED, "The owner revoked the agent's grant.", "server", 403, false),
            ErrorCodeInfo(AGENT_KEY_LIMIT, "The grant already has as many active keys as it allows. Issue another after one expires or the owner revokes one.", "server", 409, false),
            ErrorCodeInfo(AGENT_PURCHASE_LIMIT_EXCEEDED, "The purchase would take this month's agent credit purchases beyond the limit the owner set.", "server", 402, false),
            ErrorCodeInfo(AGENT_SCOPE_NOT_GRANTED, "A requested scope is outside the agent's grant.", "server", 403, false),
            ErrorCodeInfo(AGENT_SIGNUP_CLOSED, "The signup request is no longer pending: it was approved, rejected, locked by wrong confirmation codes, or has expired.", "server", 409, false),
            ErrorCodeInfo(AGENT_SIGNUP_EMAIL_REJECTED, "The owner's email address is refused, for example for a disposable domain.", "server", 400, false),
            ErrorCodeInfo(AGENT_SIGNUP_NOT_READY, "The signup is not approved, or its organization and project are still being provisioned. Poll agentSignup until it is ready.", "server", 409, false),
            ErrorCodeInfo(AGENT_SIGNUP_SUPPRESSED, "The owner opted out of agent signup requests to this email address.", "server", 403, false),
            ErrorCodeInfo(ALREADY_CONNECTED, "The participation already has an active media connection.", "server", 409, false),
            ErrorCodeInfo(ALREADY_EXISTS, "A resource with the same unique key already exists.", "server", 409, false),
            ErrorCodeInfo(AUTHORITY_UNAVAILABLE, "The authority is temporarily unavailable. Retry with the same requestId.", "both", 503, true),
            ErrorCodeInfo(BILLING_CATALOG_CONFLICT, "The billing provider's catalog conflicts with the configured price book, for example a duplicated or unsafe object. An operator must resolve it.", "server", 409, false),
            ErrorCodeInfo(BILLING_CATALOG_NOT_SYNCED, "The billing provider's catalog does not match the configured price book yet. An operator must sync it.", "server", 409, false),
            ErrorCodeInfo(BILLING_CUSTOMER_MISSING, "The organization has no billing account yet. Start a checkout first.", "server", 409, false),
            ErrorCodeInfo(BILLING_LINK_EXPIRED, "The billing link of this request is no longer valid. Send a new request with a new requestId.", "server", 409, false),
            ErrorCodeInfo(BILLING_NOT_CONFIGURED, "Billing is not configured in this environment.", "server", 503, false),
            ErrorCodeInfo(BILLING_PLAN_UNAVAILABLE, "The plan is not offered for self-service checkout.", "server", 400, false),
            ErrorCodeInfo(BILLING_PROVIDER_CHANGED, "The organization's billing account belongs to a different billing provider.", "server", 409, false),
            ErrorCodeInfo(BILLING_PROVIDER_REJECTED, "The billing provider refused the request.", "server", 409, false),
            ErrorCodeInfo(BILLING_SUBSCRIPTION_ACTIVE, "The organization already has a subscription. Change it in the billing portal.", "server", 409, false),
            ErrorCodeInfo(BILLING_SUSPENDED, "The organization is suspended for an unpaid balance. Update its payment method in the billing portal.", "server", 402, false),
            ErrorCodeInfo(CREDENTIAL_DELIVERY_EXPIRED, "The credential delivery expired or can no longer be redeemed.", "server", 409, false),
            ErrorCodeInfo(CREDENTIAL_EXPIRED, "The credential carried by the stored result has expired. Request a new one.", "server", 409, false),
            ErrorCodeInfo(CREDENTIAL_REFRESH_REQUIRED, "The media credential must be refreshed before connecting.", "both", 409, false),
            ErrorCodeInfo(CREDENTIAL_REQUIRED, "Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly.", "sdk", 409, false),
            ErrorCodeInfo(CREDITS_EXHAUSTED, "Prepaid credits are spent and the monthly spend cap is zero, so billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap.", "server", 402, false),
            ErrorCodeInfo(CREDITS_REQUIRE_METERED_PLAN, "Credits apply only to a billed subscription, and none is in force.", "server", 409, false),
            ErrorCodeInfo(CREDIT_AMOUNT_OUT_OF_RANGE, "The credit amount is outside the allowed purchase range.", "server", 400, false),
            ErrorCodeInfo(CREDIT_GRANT_LIMIT_REACHED, "Too many of the organization's credit grants are unconsumed, counting purchases still in progress. Buy more after invoices consume some.", "server", 409, false),
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
            ErrorCodeInfo(PAYMENT_DECLINED, "The payment rail declined the payment. Nothing was charged.", "server", 402, false),
            ErrorCodeInfo(PAYMENT_RAIL_NOT_CONFIGURED, "No payment rail is enabled in this environment.", "server", 503, false),
            ErrorCodeInfo(PERMIT_EXPIRED, "The stored delivery permit has expired. Request a new permit.", "server", 409, false),
            ErrorCodeInfo(PLAN_LIMIT_EXCEEDED, "The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again.", "server", 403, false),
            ErrorCodeInfo(QUOTA_EXCEEDED, "A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues.", "server", 429, false),
            ErrorCodeInfo(RATE_LIMITED, "A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId.", "server", 429, true),
            ErrorCodeInfo(RECOVERY_LIMIT, "The SDK's recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again.", "sdk", 409, false),
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
            ErrorCodeInfo(SPEND_CAP_REACHED, "The spend month's usage charges reached the charge limit that the organization's prepaid credits and monthly spend cap set, less a safety margin. Billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap.", "server", 402, false),
            ErrorCodeInfo(SPEND_UNVERIFIED, "Current spend cannot be verified, so billable usage beyond the plan's allowances fails closed before any effect (WebSocket close 4503). extensions.meter names the meter and extensions.periodEnd ends the spend month; extensions.retryAfter (HTTP Retry-After) counts the seconds before the same request may succeed.", "server", 503, true),
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
