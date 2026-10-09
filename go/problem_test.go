package convohop

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
)

func TestProblemError(t *testing.T) {
	p := problem(codeInvalidResponse, testRequest, OutcomeUnknown, 503, "Malformed authority response")
	want := "convohop: INVALID_RESPONSE (status 503, outcome unknown, request " + testRequest + "): Malformed authority response"
	if p.Error() != want {
		t.Fatalf("Error() = %q, want %q", p.Error(), want)
	}
	if got := codeInvalidRequest.Error(); got != "convohop: INVALID_REQUEST" {
		t.Fatalf("ErrorCode.Error() = %q", got)
	}
	wrapped := fmt.Errorf("send: %w", p)
	if !errors.Is(wrapped, codeInvalidResponse) || errors.Is(wrapped, codeInvalidRequest) || errors.Is(wrapped, ErrorCodeNotFound) {
		t.Fatal("errors.Is does not match the problem's code alone")
	}
	var target *Problem
	if !errors.As(wrapped, &target) || target != p {
		t.Fatal("errors.As does not find the problem")
	}
	if p.Unwrap() != nil {
		t.Fatalf("Unwrap() = %v, want nil", p.Unwrap())
	}
	if _, ok := p.RetryAfter(); ok {
		t.Fatal("RetryAfter() reports a delay the authority did not ask for")
	}
}

func TestProblemWrapsItsCause(t *testing.T) {
	ended := contextEnded(testRequest, context.Canceled)
	if !errors.Is(ended, context.Canceled) || !errors.Is(ended, codeTransportUnknown) {
		t.Fatalf("problem %v does not wrap its cause and code", ended)
	}
	if ended.Outcome != OutcomeRejected || ended.Status != 0 {
		t.Fatalf("problem %v, want a rejected request without a status", ended)
	}
	unknown := transportUnknown(testRequest, "lost", context.DeadlineExceeded)
	if !errors.Is(unknown, context.DeadlineExceeded) || unknown.Outcome != OutcomeUnknown {
		t.Fatalf("problem %v does not wrap its cause with an unknown outcome", unknown)
	}
}

func TestProblemScope(t *testing.T) {
	cases := []struct {
		name    string
		code    ErrorCode
		message string
		scope   string
	}{
		{"named scope", codeScopeRequired, "The backend key requires the current messageRead scope", "messageRead"},
		{"other wording", codeScopeRequired, "The backend key lacks the messageRead scope", ""},
		{"trailing text", codeScopeRequired, "The backend key requires the current messageRead scope.", ""},
		{"capitalized scope", codeScopeRequired, "The backend key requires the current MessageRead scope", ""},
		{"longest scope", codeScopeRequired, "The backend key requires the current " + strings.Repeat("a", 64) + " scope", strings.Repeat("a", 64)},
		{"scope too long", codeScopeRequired, "The backend key requires the current " + strings.Repeat("a", 65) + " scope", ""},
		{"other code", codeInvalidRequest, "The backend key requires the current messageRead scope", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			scope, ok := problem(tc.code, testRequest, OutcomeRejected, 403, tc.message).Scope()
			if scope != tc.scope || ok != (tc.scope != "") {
				t.Fatalf("Scope() = %q, %v, want %q", scope, ok, tc.scope)
			}
		})
	}
}
