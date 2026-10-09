// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
/** What the schema says about one error code. */
export interface ErrorCodeDefinition {
  /** `server`, `sdk` or `both`. */
  readonly origin: "server" | "sdk" | "both";
  /** The HTTP-equivalent status, when the code has one. */
  readonly status?: number;
  /** Whether a later attempt with the same requestId may succeed. */
  readonly retryable: boolean;
}
/** Every error code the schema lists, keyed by code. The set is open: handle codes it does not list. */
export const errorCodes: Readonly<Record<string, ErrorCodeDefinition>> = {
  /** A rate, size or concurrency admission limit was reached. Back off, then retry with the same requestId. */
  ADMISSION_LIMIT: { origin: "both", status: 429, retryable: true },
  /** Agent signup is not offered in this environment. */
  AGENTIC_NOT_CONFIGURED: { origin: "server", status: 503, retryable: false },
  /** The confirmation code differs from the one the agent shows. The fifth wrong code closes the signup request. */
  AGENT_CONFIRMATION_CODE_INVALID: { origin: "server", status: 403, retryable: false },
  /** The agent's grant has expired. The agent needs a new signup request approved. */
  AGENT_GRANT_EXPIRED: { origin: "server", status: 403, retryable: false },
  /** The owner revoked the agent's grant. */
  AGENT_GRANT_REVOKED: { origin: "server", status: 403, retryable: false },
  /** The grant already has as many active keys as it allows. Issue another after one expires or the owner revokes one. */
  AGENT_KEY_LIMIT: { origin: "server", status: 409, retryable: false },
  /** The purchase would take this month's agent credit purchases beyond the limit the owner set. */
  AGENT_PURCHASE_LIMIT_EXCEEDED: { origin: "server", status: 402, retryable: false },
  /** A requested scope is outside the agent's grant. */
  AGENT_SCOPE_NOT_GRANTED: { origin: "server", status: 403, retryable: false },
  /** The signup request is no longer pending: it was approved, rejected, locked by wrong confirmation codes, or has expired. */
  AGENT_SIGNUP_CLOSED: { origin: "server", status: 409, retryable: false },
  /** The owner's email address is refused, for example for a disposable domain. */
  AGENT_SIGNUP_EMAIL_REJECTED: { origin: "server", status: 400, retryable: false },
  /** The signup is not approved, or its organization and project are still being provisioned. Poll agentSignup until it is ready. */
  AGENT_SIGNUP_NOT_READY: { origin: "server", status: 409, retryable: false },
  /** The owner opted out of agent signup requests to this email address. */
  AGENT_SIGNUP_SUPPRESSED: { origin: "server", status: 403, retryable: false },
  /** The participation already has an active media connection. */
  ALREADY_CONNECTED: { origin: "server", status: 409, retryable: false },
  /** A resource with the same unique key already exists. */
  ALREADY_EXISTS: { origin: "server", status: 409, retryable: false },
  /** The authority is temporarily unavailable. Retry with the same requestId. */
  AUTHORITY_UNAVAILABLE: { origin: "both", status: 503, retryable: true },
  /** The billing provider's catalog conflicts with the configured price book, for example a duplicated or unsafe object. An operator must resolve it. */
  BILLING_CATALOG_CONFLICT: { origin: "server", status: 409, retryable: false },
  /** The billing provider's catalog does not match the configured price book yet. An operator must sync it. */
  BILLING_CATALOG_NOT_SYNCED: { origin: "server", status: 409, retryable: false },
  /** The organization has no billing account yet. Start a checkout first. */
  BILLING_CUSTOMER_MISSING: { origin: "server", status: 409, retryable: false },
  /** The billing link of this request is no longer valid. Send a new request with a new requestId. */
  BILLING_LINK_EXPIRED: { origin: "server", status: 409, retryable: false },
  /** Billing is not configured in this environment. */
  BILLING_NOT_CONFIGURED: { origin: "server", status: 503, retryable: false },
  /** The plan is not offered for self-service checkout. */
  BILLING_PLAN_UNAVAILABLE: { origin: "server", status: 400, retryable: false },
  /** The organization's billing account belongs to a different billing provider. */
  BILLING_PROVIDER_CHANGED: { origin: "server", status: 409, retryable: false },
  /** The billing provider refused the request. */
  BILLING_PROVIDER_REJECTED: { origin: "server", status: 409, retryable: false },
  /** The organization already has a subscription. Change it in the billing portal. */
  BILLING_SUBSCRIPTION_ACTIVE: { origin: "server", status: 409, retryable: false },
  /** The organization is suspended for an unpaid balance. Update its payment method in the billing portal. */
  BILLING_SUSPENDED: { origin: "server", status: 402, retryable: false },
  /** The credential delivery expired or can no longer be redeemed. */
  CREDENTIAL_DELIVERY_EXPIRED: { origin: "server", status: 409, retryable: false },
  /** The credential carried by the stored result has expired. Request a new one. */
  CREDENTIAL_EXPIRED: { origin: "server", status: 409, retryable: false },
  /** The media credential must be refreshed before connecting. */
  CREDENTIAL_REFRESH_REQUIRED: { origin: "both", status: 409, retryable: false },
  /** Delivery-permit requests cannot be resolved by lookup. Obtain a current permit and resubmit the same delivery explicitly. */
  CREDENTIAL_REQUIRED: { origin: "sdk", status: 409, retryable: false },
  /** Prepaid credits are spent and the monthly spend cap is zero, so billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap. */
  CREDITS_EXHAUSTED: { origin: "server", status: 402, retryable: false },
  /** Credits apply only to a billed subscription, and none is in force. */
  CREDITS_REQUIRE_METERED_PLAN: { origin: "server", status: 409, retryable: false },
  /** The credit amount is outside the allowed purchase range. */
  CREDIT_AMOUNT_OUT_OF_RANGE: { origin: "server", status: 400, retryable: false },
  /** Too many of the organization's credit grants are unconsumed, counting purchases still in progress. Buy more after invoices consume some. */
  CREDIT_GRANT_LIMIT_REACHED: { origin: "server", status: 409, retryable: false },
  /** The cursor is ahead of the committed events of the conversation. */
  CURSOR_AHEAD: { origin: "server", status: 409, retryable: false },
  /** The cursor is older than retained history. Resynchronize from current state; never reset the cursor silently. */
  CURSOR_EXPIRED: { origin: "server", status: 409, retryable: false },
  /** The cursor is malformed or was not issued for this query. */
  CURSOR_INVALID: { origin: "server", status: 409, retryable: false },
  /** The cursor does not continue the subscribed stream. */
  CURSOR_MISMATCH: { origin: "server", status: 409, retryable: false },
  /** The cursor was issued for a different scope, caller or visibility. */
  CURSOR_SCOPE_MISMATCH: { origin: "server", status: 409, retryable: false },
  /** The delivery was already redeemed by a different request. */
  DELIVERY_CONSUMED: { origin: "server", status: 409, retryable: false },
  /** The delivery must be redeemed before it can be acknowledged. */
  DELIVERY_NOT_REDEEMED: { origin: "server", status: 409, retryable: false },
  /** The deployment cannot host projects yet. */
  DEPLOYMENT_NOT_READY: { origin: "server", status: 409, retryable: false },
  /** The feature is not available in this deployment. */
  FEATURE_UNSUPPORTED: { origin: "server", retryable: false },
  /** The credential is valid but not allowed to perform this operation. */
  FORBIDDEN: { origin: "server", status: 403, retryable: false },
  /** The live session generation changed. Read the current generation and retry. */
  GENERATION_CONFLICT: { origin: "server", status: 409, retryable: false },
  /** A GraphQL error arrived without a recognized code. */
  GRAPHQL_ERROR: { origin: "sdk", retryable: false },
  /** The GraphQL request is malformed or fails validation. */
  GRAPHQL_INVALID_REQUEST: { origin: "server", status: 400, retryable: false },
  /** The GraphQL document exceeds a depth, complexity or size limit. */
  GRAPHQL_QUERY_LIMIT: { origin: "server", status: 400, retryable: false },
  /** The query response exceeds the response limit. Request a smaller page. */
  GRAPHQL_RESPONSE_LIMIT: { origin: "server", status: 413, retryable: false },
  /** The HTTP exchange failed without a usable GraphQL error. */
  HTTP_FAILURE: { origin: "sdk", retryable: true },
  /** The requestId was already used with a different payload or caller. */
  IDEMPOTENCY_CONFLICT: { origin: "both", status: 409, retryable: false },
  /** The project incarnation changed. Discard state from the old incarnation and recover explicitly. */
  INCARNATION_MISMATCH: { origin: "both", status: 409, retryable: false },
  /** The connection to replace is not a current connection of this participation. */
  INVALID_REPLACEMENT: { origin: "server", status: 409, retryable: false },
  /** The input or request context failed validation. */
  INVALID_REQUEST: { origin: "both", status: 400, retryable: false },
  /** The response did not match the expected shape or identity. The outcome is unknown. */
  INVALID_RESPONSE: { origin: "sdk", retryable: true },
  /** The live session reached its alert limit. */
  LIVE_ALERT_LIMIT: { origin: "server", status: 409, retryable: false },
  /** The live session has ended or is ending. */
  LIVE_SESSION_CLOSED: { origin: "server", status: 409, retryable: false },
  /** The conversation already has an active live session. */
  LIVE_SESSION_EXISTS: { origin: "server", status: 409, retryable: false },
  /** The native media connection failed. The participation remains; resolve and reconnect, or leave explicitly. */
  MEDIA_CONNECT_FAILED: { origin: "sdk", retryable: false },
  /** Media cutoff is not enforced yet for this live session. Retry after the cutoff completes. */
  MEDIA_FENCE_REQUIRED: { origin: "server", status: 409, retryable: false },
  /** Media for the live session is not ready yet. */
  MEDIA_NOT_READY: { origin: "server", status: 409, retryable: false },
  /** Media for the live session is recovering. */
  MEDIA_RECOVERING: { origin: "server", status: 409, retryable: false },
  /** Membership accounting needs operator reconciliation. */
  MEMBERSHIP_COUNT_INVALID: { origin: "server", status: 503, retryable: false },
  /** The conversation reached its member limit. */
  MEMBER_LIMIT: { origin: "server", status: 409, retryable: false },
  /** The message was deleted. */
  MESSAGE_DELETED: { origin: "server", status: 409, retryable: false },
  /** The requestId does not belong to an issueSession or renewSession request. */
  NOT_A_SESSION_REQUEST: { origin: "server", status: 400, retryable: false },
  /** The resource does not exist or is not visible to the caller. */
  NOT_FOUND: { origin: "server", status: 404, retryable: false },
  /** The mutation may have committed. Retry with the same requestId or resolve it. */
  OUTCOME_UNKNOWN: { origin: "server", status: 503, retryable: true },
  /** A single item exceeds the page response limit. */
  PAGE_ITEM_TOO_LARGE: { origin: "server", status: 413, retryable: false },
  /** The participation does not belong to the caller or the current live session generation. */
  PARTICIPATION_MISMATCH: { origin: "both", status: 409, retryable: false },
  /** The payment rail declined the payment. Nothing was charged. */
  PAYMENT_DECLINED: { origin: "server", status: 402, retryable: false },
  /** No payment rail is enabled in this environment. */
  PAYMENT_RAIL_NOT_CONFIGURED: { origin: "server", status: 503, retryable: false },
  /** The stored delivery permit has expired. Request a new permit. */
  PERMIT_EXPIRED: { origin: "server", status: 409, retryable: false },
  /** The plan does not permit the resource or feature. extensions.planLimit names the limit and extensions.limit holds the plan's value. Change the plan or the limit before trying again. */
  PLAN_LIMIT_EXCEEDED: { origin: "server", status: 403, retryable: false },
  /** A hard usage quota refused new work until the quota period ends. extensions.meter, extensions.limit and extensions.periodEnd describe the quota, and extensions.retryAfter (HTTP Retry-After) counts the seconds until it resets. Work already in progress continues. */
  QUOTA_EXCEEDED: { origin: "server", status: 429, retryable: false },
  /** A per-second rate limit refused the request before it had any effect. Wait extensions.retryAfter seconds (HTTP Retry-After), then resend the request with the same requestId. */
  RATE_LIMITED: { origin: "server", status: 429, retryable: true },
  /** The SDK's recovery store already holds 128 mutation records that are not final, so the new request was not sent. Retry or resolve outstanding requests, then send it again. */
  RECOVERY_LIMIT: { origin: "sdk", status: 409, retryable: false },
  /** Caller-provided recovery storage did not confirm durability. Keep the original request and its outcome. */
  RECOVERY_STORAGE_FAILURE: { origin: "sdk", retryable: false },
  /** The original request is too old to replay. */
  REQUEST_EXPIRED: { origin: "server", status: 409, retryable: false },
  /** The request body exceeds the size limit. */
  REQUEST_TOO_LARGE: { origin: "server", status: 413, retryable: false },
  /** The outcome is still unresolved and the retry budget is spent. Resolve the original request before continuing. */
  RESOLUTION_REQUIRED: { origin: "sdk", status: 409, retryable: false },
  /** The response exceeds the size limit. */
  RESPONSE_TOO_LARGE: { origin: "server", status: 413, retryable: false },
  /** The subscription cannot continue. Replay from the last applied cursor. */
  RESYNC_REQUIRED: { origin: "server", status: 409, retryable: false },
  /** The authority exhausted its internal retry budget. Retry later with the same requestId. */
  RETRY_EXHAUSTED: { origin: "server", status: 503, retryable: true },
  /** The expected revision or epoch is stale. Read the current state and retry with a new request. */
  REVISION_CONFLICT: { origin: "server", status: 409, retryable: false },
  /** The backend key lacks a scope this operation requires. The message names the scope. */
  SCOPE_REQUIRED: { origin: "server", status: 403, retryable: false },
  /** The stored session receipt does not match its binding. */
  SESSION_RECEIPT_BINDING_MISMATCH: { origin: "server", status: 503, retryable: false },
  /** The stored session receipt failed validation. */
  SESSION_RECEIPT_INVALID: { origin: "server", status: 503, retryable: false },
  /** The application session refresh callback failed. */
  SESSION_REFRESH_FAILED: { origin: "sdk", retryable: false },
  /** The refreshed session was rejected because it does not match the current session. */
  SESSION_REFRESH_REJECTED: { origin: "sdk", status: 409, retryable: false },
  /** The user session needs renewal and no refresh is configured, or it expired. */
  SESSION_REFRESH_REQUIRED: { origin: "sdk", status: 409, retryable: false },
  /** The refreshed session could not be verified. */
  SESSION_REFRESH_UNVERIFIED: { origin: "sdk", retryable: false },
  /** The spend month's usage charges reached the charge limit that the organization's prepaid credits and monthly spend cap set, less a safety margin. Billable usage beyond the plan's allowances is refused before any effect (WebSocket close 4402). extensions.meter names the meter and extensions.periodEnd ends the spend month. Usage within allowances continues; add credits or raise the cap. */
  SPEND_CAP_REACHED: { origin: "server", status: 402, retryable: false },
  /** Current spend cannot be verified, so billable usage beyond the plan's allowances fails closed before any effect (WebSocket close 4503). extensions.meter names the meter and extensions.periodEnd ends the spend month; extensions.retryAfter (HTTP Retry-After) counts the seconds before the same request may succeed. */
  SPEND_UNVERIFIED: { origin: "server", status: 503, retryable: true },
  /** The transport failed after the request may have been sent. Resolve or retry the original request. */
  TRANSPORT_UNKNOWN: { origin: "sdk", retryable: true },
  /** The credential is missing, invalid or expired. */
  UNAUTHENTICATED: { origin: "both", status: 401, retryable: false },
  /** The webhook URL is not a public HTTPS destination. */
  WEBHOOK_DESTINATION_DENIED: { origin: "server", status: 400, retryable: false },
  /** The webhook endpoint is disabled. Enable it, then replay its deliveries. */
  WEBHOOK_ENDPOINT_DISABLED: { origin: "server", status: 409, retryable: false },
  /** The project reached its webhook endpoint limit. */
  WEBHOOK_ENDPOINT_LIMIT: { origin: "server", retryable: false },
  /** A signing-secret rotation is already waiting for acknowledgement. */
  WEBHOOK_ROTATION_PENDING: { origin: "server", status: 409, retryable: false },
  /** The endpoint's signing secret has not been acknowledged yet. */
  WEBHOOK_SECRET_UNACKNOWLEDGED: { origin: "server", status: 409, retryable: false },
  /** The observed serving epoch is stale. Route again, then retry. */
  WRONG_REGION: { origin: "server", status: 409, retryable: false },
};
