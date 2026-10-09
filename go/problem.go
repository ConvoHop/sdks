package convohop

import (
	"fmt"
	"regexp"
	"time"
)

// ErrorCode is the stable code of a [Problem]. The generated constants list
// every code the API documents. ErrorCode implements error so that
// errors.Is(err, ErrorCodeNotFound) matches a [Problem] with that code.
type ErrorCode string

// Error returns the code as an error message.
func (c ErrorCode) Error() string { return "convohop: " + string(c) }

// Outcome reports what is known about the effect of a failed request.
type Outcome string

// Outcomes reported in [Problem].
const (
	// OutcomeRejected means the authority did not apply the request.
	OutcomeRejected Outcome = "rejected"
	// OutcomeUnknown means the request may or may not have taken effect.
	// Resolve the original request ID before deciding what to do.
	OutcomeUnknown Outcome = "unknown"
	// OutcomeCommitted means the request took effect.
	OutcomeCommitted Outcome = "committed"
	// OutcomeAccepted means the authority accepted a long-running operation.
	OutcomeAccepted Outcome = "accepted"
)

// Codes the runtime raises itself. They are unexported so the runtime does not
// depend on which codes a schema documents.
const (
	codeCredentialRequired     ErrorCode = "CREDENTIAL_REQUIRED"
	codeGraphQLError           ErrorCode = "GRAPHQL_ERROR"
	codeHTTPFailure            ErrorCode = "HTTP_FAILURE"
	codeIdempotencyConflict    ErrorCode = "IDEMPOTENCY_CONFLICT"
	codeIncarnationMismatch    ErrorCode = "INCARNATION_MISMATCH"
	codeInvalidRequest         ErrorCode = "INVALID_REQUEST"
	codeInvalidResponse        ErrorCode = "INVALID_RESPONSE"
	codeRecoveryStorageFailure ErrorCode = "RECOVERY_STORAGE_FAILURE"
	codeResolutionRequired     ErrorCode = "RESOLUTION_REQUIRED"
	codeScopeRequired          ErrorCode = "SCOPE_REQUIRED"
	codeTransportUnknown       ErrorCode = "TRANSPORT_UNKNOWN"
	codeUnauthenticated        ErrorCode = "UNAUTHENTICATED"
)

// Problem is a failed request. Classify it by Code and Outcome, never by
// Message: messages are diagnostics and may change.
type Problem struct {
	// Code is the stable error code.
	Code ErrorCode
	// RequestID identifies the request that failed. Resolve it when Outcome
	// is OutcomeUnknown.
	RequestID string
	// Outcome reports whether the request took effect.
	Outcome Outcome
	// Status is the HTTP status, or 0 when no authority response was read.
	Status int
	// Message is a human-readable diagnostic.
	Message string

	retryAfter    time.Duration
	hasRetryAfter bool
	cause         error
}

// Error describes the problem without credentials.
func (p *Problem) Error() string {
	return fmt.Sprintf("convohop: %s (status %d, outcome %s, request %s): %s", string(p.Code), p.Status, p.Outcome, p.RequestID, p.Message)
}

// Unwrap returns the underlying cause, such as a context error, if any.
func (p *Problem) Unwrap() error { return p.cause }

// Is reports whether target is the problem's [ErrorCode].
func (p *Problem) Is(target error) bool {
	code, ok := target.(ErrorCode)
	return ok && code == p.Code
}

// RetryAfter returns the delay the authority asked for before the same
// request is sent again, for example with RATE_LIMITED. It reads the error's
// extensions.retryAfter, else an HTTP Retry-After delay in seconds. The SDK
// never waits or resends on its own because of it.
func (p *Problem) RetryAfter() (time.Duration, bool) { return p.retryAfter, p.hasRetryAfter }

var scopePattern = regexp.MustCompile(`^The backend key requires the current ([a-z][A-Za-z0-9]{0,63}) scope$`)

// Scope returns the scope a SCOPE_REQUIRED problem names. The authority names
// it only in the message, so ok is false when the message does not match the
// documented wording. A missing read scope is reported as the read scope even
// where its manage scope would also satisfy the operation.
func (p *Problem) Scope() (scope string, ok bool) {
	if p.Code != codeScopeRequired {
		return "", false
	}
	match := scopePattern.FindStringSubmatch(p.Message)
	if match == nil {
		return "", false
	}
	return match[1], true
}

func problem(code ErrorCode, requestID string, outcome Outcome, status int, message string) *Problem {
	return &Problem{Code: code, RequestID: requestID, Outcome: outcome, Status: status, Message: message}
}

func invalidRequest(requestID, message string) *Problem {
	return problem(codeInvalidRequest, requestID, OutcomeRejected, 400, message)
}

// missingCredential rejects a bearer operation on a client without a backend
// key, before anything is recorded or sent.
func missingCredential(requestID string) *Problem {
	return problem(codeUnauthenticated, requestID, OutcomeRejected, 401,
		"This client has no backend key; it can only redeem and acknowledge credential deliveries")
}

func incarnationMismatch(requestID string) *Problem {
	return problem(codeIncarnationMismatch, requestID, OutcomeUnknown, 409, "Explicit recovery is required for this incarnation")
}

func idempotencyConflict(requestID string) *Problem {
	return problem(codeIdempotencyConflict, requestID, OutcomeUnknown, 409, "Preserve the original request and payload")
}

func resolutionRequired(requestID, message string) *Problem {
	return problem(codeResolutionRequired, requestID, OutcomeUnknown, 409, message)
}

// mismatch reports an authority response that contradicts the request.
func mismatch(requestID, what string) *Problem {
	return problem(codeInvalidResponse, requestID, OutcomeUnknown, 503, what+" does not match the request")
}
