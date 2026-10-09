package convohop

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"net/http/cookiejar"
	"reflect"
	"slices"
	"strings"
	"testing"
	"time"
)

func TestRequestShape(t *testing.T) {
	a := newAuthority(t, nil)
	client := newProject(t, a)
	reply, err := client.Capabilities(context.Background(), WithRequestID(testRequest))
	if err != nil {
		t.Fatal(err)
	}
	if reply.RequestID != testRequest || reply.Status != "ok" {
		t.Fatalf("reply %+v", reply)
	}
	requests := a.requests()
	if len(requests) != 1 {
		t.Fatalf("%d requests, want 1", len(requests))
	}
	ex := requests[0]
	if ex.method != http.MethodPost || ex.path != "/graphql" {
		t.Errorf("request %s %s, want POST /graphql", ex.method, ex.path)
	}
	headers := map[string]string{
		"Authorization": "Bearer " + testKey,
		"Content-Type":  "application/json",
		"Accept":        "application/json",
	}
	for name, want := range headers {
		if got := ex.header.Get(name); got != want {
			t.Errorf("%s header %q, want %q", name, got, want)
		}
	}
	want := map[string]any{"projectId": testProject, "requestId": testRequest, "incarnation": testIncarnation}
	if !reflect.DeepEqual(ex.context, want) {
		t.Errorf("context %v, want %v", ex.context, want)
	}
	if ex.hasInput {
		t.Error("a query without input sent one")
	}
}

func TestRequestIDs(t *testing.T) {
	a := newAuthority(t, nil)
	client := newProject(t, a)
	first, err := client.Capabilities(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	second, err := client.Capabilities(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if !isUUID(first.RequestID) || !isUUID(second.RequestID) || first.RequestID == second.RequestID {
		t.Fatalf("request IDs %q and %q, want two new UUIDs", first.RequestID, second.RequestID)
	}
	if id := NewRequestID(); id[14] != '4' || !strings.ContainsRune("89ab", rune(id[19])) {
		t.Fatalf("NewRequestID() = %s, want a version 4 UUID", id)
	}
}

func route(fields map[string]any) map[string]any {
	value := map[string]any{"projectId": testProject, "incarnation": testIncarnation, "servingEpoch": "42", "signature": "sig"}
	for key, field := range fields {
		value[key] = field
	}
	return value
}

func TestInitialize(t *testing.T) {
	a := newAuthority(t, replying("communication.route", func(*exchange) any { return route(nil) }))
	client := newProject(t, a)
	ctx := context.Background()
	if err := client.Initialize(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := client.Capabilities(ctx); err != nil {
		t.Fatal(err)
	}
	requests := a.requests()
	if _, ok := requests[0].context["observedServingEpoch"]; ok {
		t.Error("the route request reported a serving epoch before one was read")
	}
	if got := requests[1].context["observedServingEpoch"]; got != "42" {
		t.Errorf("observedServingEpoch %v, want 42", got)
	}
}

func TestInitializeRejectsRoute(t *testing.T) {
	cases := []struct {
		name   string
		route  any
		code   ErrorCode
		status int
	}{
		{"missing route", nil, codeInvalidResponse, 503},
		{"other project", route(map[string]any{"projectId": testUUID}), codeIncarnationMismatch, 409},
		{"other incarnation", route(map[string]any{"incarnation": testUUID}), codeIncarnationMismatch, 409},
		{"noncanonical epoch", route(map[string]any{"servingEpoch": "042"}), codeInvalidResponse, 503},
		{"numeric epoch", route(map[string]any{"servingEpoch": 42}), codeInvalidResponse, 503},
		{"epoch out of range", route(map[string]any{"servingEpoch": "9223372036854775808"}), codeInvalidResponse, 503},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, replying("communication.route", func(*exchange) any { return tc.route }))
			client := newProject(t, a)
			err := client.Initialize(context.Background())
			expectProblem(t, err, tc.code, OutcomeUnknown, tc.status)
			if _, err := client.Capabilities(context.Background()); err != nil {
				t.Fatal(err)
			}
			if _, ok := a.requests()[1].context["observedServingEpoch"]; ok {
				t.Error("a rejected route set the serving epoch")
			}
		})
	}
}

func graphQLError(message any, extensions any) map[string]any {
	failure := map[string]any{}
	if message != nil {
		failure["message"] = message
	}
	if extensions != nil {
		failure["extensions"] = extensions
	}
	return map[string]any{"errors": []any{failure}, "data": nil}
}

func TestAuthorityProblems(t *testing.T) {
	limited := func(retryAfter any) map[string]any {
		extensions := map[string]any{"code": "RATE_LIMITED", "outcome": "rejected", "status": 429}
		if retryAfter != nil {
			extensions["retryAfter"] = retryAfter
		}
		return graphQLError("Slow down", extensions)
	}
	cases := []struct {
		name     string
		response response
		code     ErrorCode
		outcome  Outcome
		status   int
		message  string
		retry    time.Duration
		hasRetry bool
	}{
		{
			name:     "GraphQL error",
			response: response{body: graphQLError("No such conversation", map[string]any{"code": "NOT_FOUND", "outcome": "rejected", "status": 404})},
			code:     ErrorCodeNotFound, outcome: OutcomeRejected, status: 404, message: "No such conversation",
		},
		{
			name:     "GraphQL error without extensions",
			response: response{body: graphQLError("Syntax error", nil)},
			code:     codeGraphQLError, outcome: OutcomeUnknown, status: 503, message: "Syntax error",
		},
		{
			name:     "GraphQL error without message",
			response: response{body: graphQLError(nil, map[string]any{})},
			code:     codeGraphQLError, outcome: OutcomeUnknown, status: 503, message: "GraphQL rejected the request",
		},
		{
			name:     "fractional status",
			response: response{body: graphQLError("Failed", map[string]any{"code": "INTERNAL", "status": 404.5})},
			code:     "INTERNAL", outcome: OutcomeUnknown, status: 503, message: "Failed",
		},
		{
			name:     "retryAfter extension",
			response: response{body: limited(30)},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
			retry: 30 * time.Second, hasRetry: true,
		},
		{
			name:     "retryAfter string",
			response: response{body: limited("7")},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
			retry: 7 * time.Second, hasRetry: true,
		},
		{
			name:     "Retry-After header",
			response: response{body: limited(nil), header: http.Header{"Retry-After": {"5"}}},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
			retry: 5 * time.Second, hasRetry: true,
		},
		{
			name:     "extension before header",
			response: response{body: limited(2), header: http.Header{"Retry-After": {"9"}}},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
			retry: 2 * time.Second, hasRetry: true,
		},
		{
			name:     "repeated Retry-After header",
			response: response{body: limited(nil), header: http.Header{"Retry-After": {"5", "6"}}},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
		},
		{
			name:     "HTTP-date Retry-After header",
			response: response{body: limited(nil), header: http.Header{"Retry-After": {"Wed, 21 Oct 2015 07:28:00 GMT"}}},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
		},
		{
			name:     "negative retryAfter",
			response: response{body: limited(-1)},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
		},
		{
			name:     "fractional retryAfter",
			response: response{body: limited(1.5)},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
		},
		{
			name:     "unbounded retryAfter",
			response: response{body: limited("9999999999")},
			code:     ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Slow down",
			retry: math.MaxInt64, hasRetry: true,
		},
		{
			name: "HTTP problem",
			response: response{status: 429, body: map[string]any{
				"code": "RATE_LIMITED", "outcome": "rejected", "message": "Too many requests", "retryAfter": 2,
			}},
			code: ErrorCodeRateLimited, outcome: OutcomeRejected, status: 429, message: "Too many requests",
			retry: 2 * time.Second, hasRetry: true,
		},
		{
			name:     "HTTP failure",
			response: response{status: 502, body: map[string]any{}},
			code:     codeHTTPFailure, outcome: OutcomeUnknown, status: 502, message: "Authority rejected the request",
		},
		{
			name:     "unrecognized body",
			response: response{status: 500, body: "<html>oops</html>"},
			code:     codeInvalidResponse, outcome: OutcomeUnknown, status: 500, message: "Unrecognized authority response",
		},
		{
			name:     "null data",
			response: response{body: map[string]any{"data": nil}},
			code:     codeInvalidResponse, outcome: OutcomeUnknown, status: 200,
			message: "Malformed authority response; resolve the original request",
		},
		{
			name:     "error that is not an object",
			response: response{body: map[string]any{"errors": []any{"failed"}}},
			code:     codeInvalidResponse, outcome: OutcomeUnknown, status: 200,
			message: "Malformed authority response; resolve the original request",
		},
		{
			name:     "extensions that are not an object",
			response: response{body: graphQLError("Failed", "extensions")},
			code:     codeInvalidResponse, outcome: OutcomeUnknown, status: 200,
			message: "Malformed authority response; resolve the original request",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, func(*exchange) response { return tc.response })
			client := newProject(t, a)
			_, err := client.Capabilities(context.Background(), WithRequestID(testRequest))
			p := expectProblem(t, err, tc.code, tc.outcome, tc.status)
			if p.RequestID != testRequest || p.Message != tc.message {
				t.Errorf("problem request %s message %q, want %s %q", p.RequestID, p.Message, testRequest, tc.message)
			}
			if !errors.Is(err, tc.code) {
				t.Errorf("errors.Is(err, %s) = false", tc.code)
			}
			if retry, ok := p.RetryAfter(); retry != tc.retry || ok != tc.hasRetry {
				t.Errorf("RetryAfter() = %v, %v, want %v, %v", retry, ok, tc.retry, tc.hasRetry)
			}
		})
	}
}

func TestResponseValidation(t *testing.T) {
	const malformed = "Malformed authority response; resolve the original request"
	capabilities := catalog.operations["communication.capabilities"]
	edit := func(change func(body, reply map[string]any)) func() any {
		return func() any {
			body := success(capabilities, testRequest, nil)
			change(body, replyOf(body))
			return body
		}
	}
	encoded := func(prefix, suffix string) func() any {
		return func() any {
			data, _ := json.Marshal(success(capabilities, testRequest, nil))
			return prefix + string(data) + suffix
		}
	}
	cases := []struct {
		name    string
		body    func() any
		message string
	}{
		{"other request", edit(func(_, r map[string]any) { r["requestId"] = testUUID }), "Mismatched authority request identity"},
		{"unknown status", edit(func(_, r map[string]any) { r["status"] = "done" }), malformed},
		{"missing nullable field", edit(func(_, r map[string]any) { delete(r, "serverTime") }), malformed},
		{"case-folded field", edit(func(_, r map[string]any) { r["RequestID"] = testUUID }), malformed},
		{"uppercase UUID", edit(func(_, r map[string]any) { r["requestId"] = upperUUID }), malformed},
		{"missing operation", edit(func(b, _ map[string]any) { b["data"] = map[string]any{} }), malformed},
		{"wrong scalar type", edit(func(_, r map[string]any) { r["replayed"] = "false" }), malformed},
		{"trailing data", encoded("", " {}"), "Unrecognized authority response"},
		{"oversized", edit(func(_, r map[string]any) { r["serverTime"] = strings.Repeat("a", maxResponseLength) }),
			"Authority response exceeds the bound"},
		{"astral characters count twice", edit(func(_, r map[string]any) { r["serverTime"] = strings.Repeat("\U0001F600", maxResponseLength/2) }),
			"Authority response exceeds the bound"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, func(*exchange) response { return response{body: tc.body()} })
			client := newProject(t, a)
			_, err := client.Capabilities(context.Background(), WithRequestID(testRequest))
			p := expectProblem(t, err, codeInvalidResponse, OutcomeUnknown, 200)
			if p.Message != tc.message {
				t.Errorf("message %q, want %q", p.Message, tc.message)
			}
		})
	}
	accepted := []struct {
		name string
		body func() any
	}{
		{"undeclared field", edit(func(_, r map[string]any) { r["extra"] = "ignored" })},
		{"byte order mark", encoded("\ufeff", "")},
		{"bounded astral characters", edit(func(_, r map[string]any) { r["serverTime"] = strings.Repeat("\U0001F600", maxResponseLength/2-200) })},
	}
	for _, tc := range accepted {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, func(*exchange) response { return response{body: tc.body()} })
			if _, err := newProject(t, a).Capabilities(context.Background(), WithRequestID(testRequest)); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestMutationEnvelope(t *testing.T) {
	sendMessage := catalog.operations["communication.sendMessage"]
	cases := []struct {
		name   string
		change func(reply map[string]any)
		state  string
	}{
		{"query status", func(r map[string]any) { r["status"] = "ok" }, ""},
		{"committed without receipt", func(r map[string]any) { r["receiptId"] = nil }, ""},
		{"committed without replay flag", func(r map[string]any) { r["replayed"] = nil }, ""},
		{"commit time without milliseconds", func(r map[string]any) { r["committedAt"] = "2026-01-02T03:04:05Z" }, ""},
		{"accepted without operation", func(r map[string]any) { r["status"] = "accepted" }, ""},
		{"committed", func(map[string]any) {}, "committed"},
		{"accepted", func(r map[string]any) {
			r["status"] = "accepted"
			r["operation"] = object("OperationRef", map[string]any{"operationId": testUUID})
		}, "accepted"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, func(ex *exchange) response {
				body := success(sendMessage, ex.requestID, nil)
				tc.change(replyOf(body))
				return response{body: body}
			})
			client := newProject(t, a)
			_, err := client.SendMessage(context.Background(), sendInput("hi"), WithRequestID(testRequest))
			records, recordsErr := client.RecoveryRecords(context.Background())
			if recordsErr != nil || len(records) != 1 {
				t.Fatalf("records %v, %v", records, recordsErr)
			}
			if tc.state == "" {
				expectProblem(t, err, codeInvalidResponse, OutcomeUnknown, 200)
				if records[0].ResolutionState != "unknown" || records[0].LastAttemptClassification != "INVALID_RESPONSE" {
					t.Errorf("record %+v, want an unknown outcome", records[0])
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if records[0].ResolutionState != tc.state || records[0].LastAttemptClassification != "authorityReceipt" {
				t.Errorf("record %+v, want %s", records[0], tc.state)
			}
		})
	}
}

func TestEchoCheck(t *testing.T) {
	a := newAuthority(t, replying("communication.sendMessage", func(*exchange) any {
		return object("MessageAck", map[string]any{"conversationId": testUUID, "status": "sent"})
	}))
	_, err := newProject(t, a).SendMessage(context.Background(), sendInput("hi"))
	p := expectProblem(t, err, codeInvalidResponse, OutcomeUnknown, 503)
	if p.Message != "sendMessage conversationId does not match the request" {
		t.Errorf("message %q", p.Message)
	}
}

func TestTransportFailures(t *testing.T) {
	t.Run("dropped connection", func(t *testing.T) {
		a := newAuthority(t, func(*exchange) response { return response{drop: true} })
		_, err := newProject(t, a).Capabilities(context.Background(), WithRequestID(testRequest))
		p := expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
		if p.RequestID != testRequest {
			t.Errorf("request %s", p.RequestID)
		}
	})
	t.Run("redirect", func(t *testing.T) {
		a := newAuthority(t, func(*exchange) response {
			return response{status: http.StatusTemporaryRedirect, header: http.Header{"Location": {"/elsewhere"}}}
		})
		_, err := newProject(t, a).Capabilities(context.Background())
		expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
		if n := len(a.requests()); n != 1 {
			t.Errorf("%d requests, want 1", n)
		}
	})
	t.Run("timeout", func(t *testing.T) {
		a := newAuthority(t, func(ex *exchange) response {
			<-ex.ctx.Done()
			return response{}
		})
		_, err := newProject(t, a, WithTimeout(50*time.Millisecond)).Capabilities(context.Background())
		expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
		if !errors.Is(err, context.DeadlineExceeded) {
			t.Errorf("error %v does not wrap the deadline", err)
		}
	})
	t.Run("unreachable", func(t *testing.T) {
		a := newAuthority(t, nil)
		client := newProject(t, a)
		a.server.Close()
		_, err := client.Capabilities(context.Background())
		expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
		for current := error(err); current != nil; current = errors.Unwrap(current) {
			if strings.Contains(current.Error(), testKey) {
				t.Fatalf("error %q exposes the backend key", current)
			}
		}
	})
}

func TestContextEndedBeforeSend(t *testing.T) {
	a := newAuthority(t, nil)
	client := newProject(t, a)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := client.Capabilities(ctx)
	expectProblem(t, err, codeTransportUnknown, OutcomeRejected, 0)
	if !errors.Is(err, context.Canceled) {
		t.Errorf("error %v does not wrap the cancellation", err)
	}
	_, err = client.SendMessage(ctx, sendInput("hi"))
	expectProblem(t, err, codeTransportUnknown, OutcomeRejected, 0)
	records, err := client.RecoveryRecords(context.Background())
	if err != nil || len(records) != 0 || len(a.requests()) != 0 {
		t.Fatalf("records %v, %v and %d requests, want none", records, err, len(a.requests()))
	}
}

func TestLocalRejections(t *testing.T) {
	var missing context.Context
	cases := []struct {
		name string
		call func(context.Context, *ProjectClient) error
	}{
		{"request ID that is not a UUID", func(ctx context.Context, c *ProjectClient) error {
			_, err := c.Capabilities(ctx, WithRequestID("request-1"))
			return err
		}},
		{"uppercase request ID", func(ctx context.Context, c *ProjectClient) error {
			_, err := c.Capabilities(ctx, WithRequestID(upperUUID))
			return err
		}},
		{"zero request ID", func(ctx context.Context, c *ProjectClient) error {
			_, err := c.Capabilities(ctx, WithRequestID(zeroUUID))
			return err
		}},
		{"nil call option", func(ctx context.Context, c *ProjectClient) error {
			_, err := c.Capabilities(ctx, nil)
			return err
		}},
		{"nil context", func(_ context.Context, c *ProjectClient) error {
			_, err := c.Capabilities(missing)
			return err
		}},
		{"invalid UTF-8", func(ctx context.Context, c *ProjectClient) error {
			_, err := c.SendMessage(ctx, sendInput("caf\xe9"))
			return err
		}},
		{"invalid UTF-8 property name", func(ctx context.Context, c *ProjectClient) error {
			input := sendInput("hi")
			input.Props = Properties{"\xff": true}
			_, err := c.SendMessage(ctx, input)
			return err
		}},
		{"unsafe integer", func(ctx context.Context, c *ProjectClient) error {
			input := sendInput("hi")
			input.Props = Properties{"count": int64(1) << 60}
			_, err := c.SendMessage(ctx, input)
			return err
		}},
		{"non-finite number", func(ctx context.Context, c *ProjectClient) error {
			input := sendInput("hi")
			input.Props = Properties{"score": math.Inf(1)}
			_, err := c.SendMessage(ctx, input)
			return err
		}},
		{"invalid UUID input", func(ctx context.Context, c *ProjectClient) error {
			_, err := c.GetConversation(ctx, GetConversationRequestInput{ConversationID: "conversation-1"})
			return err
		}},
		{"invalid counter input", func(ctx context.Context, c *ProjectClient) error {
			_, err := c.IssueSession(ctx, IssueSessionRequestInput{PrincipalID: testUUID, DeviceID: testUUID, RequestedTTLMs: "-1"})
			return err
		}},
		{"lookup under its own request ID", func(ctx context.Context, c *ProjectClient) error {
			_, err := c.ResolveRequest(ctx, ResolveRequestRequestInput{RequestID: testRequest}, WithRequestID(testRequest))
			return err
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, nil)
			client := newProject(t, a)
			err := tc.call(context.Background(), client)
			expectProblem(t, err, codeInvalidRequest, OutcomeRejected, 400)
			if n := len(a.requests()); n != 0 {
				t.Fatalf("%d requests, want none", n)
			}
			if records, _ := client.RecoveryRecords(context.Background()); len(records) != 0 {
				t.Fatalf("records %v, want none", records)
			}
		})
	}
}

func TestTextIsSentUnchanged(t *testing.T) {
	a := newAuthority(t, nil)
	text := "\ufffd <b>&amp;</b> \u2028 \\ufffd \U0001F600"
	if _, err := newProject(t, a).SendMessage(context.Background(), sendInput(text)); err != nil {
		t.Fatal(err)
	}
	if got := a.requests()[0].input["text"]; got != text {
		t.Fatalf("text %q, want %q", got, text)
	}
}

func TestOrigins(t *testing.T) {
	valid := map[string]string{
		"https://api.example.com":       "https://api.example.com",
		"https://API.Example.com/":      "https://api.example.com",
		"https://api.example.com:443":   "https://api.example.com",
		"https://api.example.com:8443":  "https://api.example.com:8443",
		"http://localhost:8080":         "http://localhost:8080",
		"http://localhost:80":           "http://localhost",
		"http://127.0.0.1":              "http://127.0.0.1",
		"http://[::1]:3000":             "http://[::1]:3000",
		"http://[0:0:0:0:0:0:0:1]:3000": "http://[::1]:3000",
	}
	for raw, want := range valid {
		if got, err := parseOrigin(raw); err != nil || got != want {
			t.Errorf("parseOrigin(%q) = %q, %v, want %q", raw, got, err, want)
		}
	}
	invalid := []string{
		"", "api.example.com", "https://", "http://api.example.com", "ftp://api.example.com",
		"https://user:secret@api.example.com", "https://api.example.com/graphql", "https://api.example.com?x=1",
		"https://api.example.com?", "https://api.example.com#top", "https://api.example.com:99999",
		"http://0.0.0.0", "http://[::1%25lo0]", "https://exa mple.com", "https://bücher.example",
	}
	for _, raw := range invalid {
		if got, err := parseOrigin(raw); err == nil {
			t.Errorf("parseOrigin(%q) = %q, want an error", raw, got)
		}
	}
}

func TestClientConfiguration(t *testing.T) {
	valid := ProjectConfig{BaseURL: "https://api.example.com", ProjectID: testProject, Incarnation: testIncarnation, BackendKey: testKey}
	if _, err := NewProjectClient(valid); err != nil {
		t.Fatal(err)
	}
	longest := valid
	longest.BackendKey = strings.Repeat("k", maxCredentialBytes)
	if _, err := NewProjectClient(longest); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name    string
		change  func(*ProjectConfig)
		options []Option
	}{
		{"project", func(c *ProjectConfig) { c.ProjectID = "project-1" }, nil},
		{"incarnation", func(c *ProjectConfig) { c.Incarnation = upperUUID }, nil},
		{"origin", func(c *ProjectConfig) { c.BaseURL = "http://api.example.com" }, nil},
		{"key with space", func(c *ProjectConfig) { c.BackendKey = "secret key" }, nil},
		{"key with newline", func(c *ProjectConfig) { c.BackendKey = "secret\nkey" }, nil},
		{"non-ASCII key", func(c *ProjectConfig) { c.BackendKey = "sécret" }, nil},
		{"key too long", func(c *ProjectConfig) { c.BackendKey = strings.Repeat("k", maxCredentialBytes+1) }, nil},
		{"nil option", nil, []Option{nil}},
		{"nil HTTP client", nil, []Option{WithHTTPClient(nil)}},
		{"zero timeout", nil, []Option{WithTimeout(0)}},
		{"nil store", nil, []Option{WithRecoveryStore(nil)}},
		{"nil clock", nil, []Option{WithClock(nil)}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			config := valid
			if tc.change != nil {
				tc.change(&config)
			}
			client, err := NewProjectClient(config, tc.options...)
			if err == nil || client != nil {
				t.Fatalf("NewProjectClient() = %v, %v, want an error", client, err)
			}
			if config.BackendKey != "" && strings.Contains(err.Error(), config.BackendKey) {
				t.Fatalf("error %q exposes the backend key", err)
			}
		})
	}
	for _, config := range []ManagementConfig{
		{BaseURL: "https://api.example.com", AccessToken: "operator-token", ActorID: "actor-1"},
		{BaseURL: "https://api.example.com", AccessToken: "", ActorID: testActor},
		{BaseURL: "https://api.example.com/graphql", AccessToken: "operator-token", ActorID: testActor},
	} {
		if client, err := NewManagementClient(config); err == nil {
			t.Errorf("NewManagementClient(%+v) = %v, want an error", config, client)
		}
	}
}

func TestManagementClient(t *testing.T) {
	a := newAuthority(t, nil)
	client, err := NewManagementClient(ManagementConfig{BaseURL: a.server.URL, AccessToken: "operator-token", ActorID: testActor})
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	input := IssueBackendKeyRequestInput{ProjectID: testProject, Name: "ci", Scopes: []string{"messagesRead"}, ExpiresAt: testTime}
	if _, err := client.IssueBackendKey(ctx, input, WithRequestID(testRequest)); err != nil {
		t.Fatal(err)
	}
	ex := a.requests()[0]
	if got := ex.header.Get("Authorization"); got != "Bearer operator-token" {
		t.Errorf("Authorization %q", got)
	}
	if want := map[string]any{"requestId": testRequest}; !reflect.DeepEqual(ex.context, want) {
		t.Errorf("context %v, want %v", ex.context, want)
	}
	records, err := client.RecoveryRecords(ctx)
	if err != nil || len(records) != 1 {
		t.Fatalf("records %v, %v", records, err)
	}
	if r := records[0]; r.Incarnation != managementIncarnation || r.ProjectID != "" || r.ResolutionState != "committed" {
		t.Errorf("record %+v", r)
	}
}

func TestWithHTTPClient(t *testing.T) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	base := &http.Client{Jar: jar, Timeout: time.Minute}
	a := newAuthority(t, func(*exchange) response {
		return response{header: http.Header{"Set-Cookie": {"session=tracked; Path=/"}}}
	})
	client := newProject(t, a, WithHTTPClient(base))
	for range 2 {
		if _, err := client.Capabilities(context.Background()); err != nil {
			t.Fatal(err)
		}
	}
	if cookie := a.requests()[1].header.Get("Cookie"); cookie != "" {
		t.Errorf("the client sent cookie %q", cookie)
	}
	if base.Jar != jar || base.CheckRedirect != nil || client.t.client == base || client.t.client.Timeout != time.Minute {
		t.Error("WithHTTPClient changed or reused the caller's client")
	}
}

func TestPermitOnlyClient(t *testing.T) {
	a := newAuthority(t, nil)
	store := NewMemoryRecoveryStore()
	client, err := NewProjectClient(ProjectConfig{BaseURL: a.server.URL, ProjectID: testProject, Incarnation: testIncarnation},
		WithRecoveryStore(store))
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	expectProblem(t, client.Initialize(ctx), codeUnauthenticated, OutcomeRejected, 401)
	_, err = send(client, "hello", WithRequestID(testRequest))
	if p := expectProblem(t, err, codeUnauthenticated, OutcomeRejected, 401); p.RequestID != testRequest {
		t.Fatalf("request ID %q", p.RequestID)
	}
	_, err = client.Retry(ctx, testRequest)
	if err == nil || !strings.Contains(err.Error(), "no recovery record") {
		t.Fatalf("Retry() error = %v, want the missing record error", err)
	}
	if records, err := client.RecoveryRecords(ctx); err != nil || len(records) != 0 {
		t.Fatalf("records = %v, %v", records, err)
	}
	if n := len(a.requests()); n != 0 {
		t.Fatalf("sent %d requests", n)
	}
	permit := SignedProof{"payload": map[string]any{"deliveryId": testUUID}, "signature": "c2ln"}
	if _, err := client.RedeemCredential(ctx, permit, RedeemCredentialRequestInput{DeliveryID: testUUID}); err != nil {
		t.Fatal(err)
	}
	if _, err := client.AcknowledgeCredential(ctx, permit, AcknowledgeCredentialRequestInput{DeliveryID: testUUID}); err != nil {
		t.Fatal(err)
	}
	for _, ex := range a.requests() {
		if ex.header.Get("Authorization") != "" {
			t.Fatalf("%s sent Authorization", ex.op.id)
		}
	}
	if ids := operationsOf(a); !slices.Equal(ids, []string{"communication.redeemCredential", "communication.acknowledgeCredential"}) {
		t.Fatalf("operations = %v", ids)
	}
}

func TestDeliveryPermit(t *testing.T) {
	const redeem = "communication.redeemCredential"
	a := newAuthority(t, nil)
	client := newProject(t, a)
	ctx := context.Background()
	permit := SignedProof{"payload": map[string]any{"deliveryId": testUUID}, "signature": "c2ln"}
	input := RedeemCredentialRequestInput{DeliveryID: testUUID}
	if _, err := client.RedeemCredential(ctx, permit, input, WithRequestID(testRequest)); err != nil {
		t.Fatal(err)
	}
	ex := a.requests()[0]
	if ex.op.id != redeem || ex.header.Get("Authorization") != "" {
		t.Fatalf("request %s sent Authorization %q", ex.op.id, ex.header.Get("Authorization"))
	}
	want := map[string]any{"payload": map[string]any{"deliveryId": testUUID}, "signature": "c2ln"}
	if got := ex.context["credentialDeliveryPermit"]; !reflect.DeepEqual(got, want) {
		t.Fatalf("permit = %#v, want %#v", got, want)
	}
	for _, tc := range []struct {
		name    string
		permit  SignedProof
		message string
	}{
		{"missing", nil, "A credential delivery permit is required"},
		{"invalid text", SignedProof{"signature": "\xff"}, "Invalid credential delivery permit: text must be valid UTF-8"},
		{"empty", SignedProof{}, "Invalid credential delivery permit: SignedProof requires a string signature property"},
		{"oversized", SignedProof{"signature": strings.Repeat("a", 32768)}, "Invalid credential delivery permit: SignedProof exceeds 32768 bytes of canonical JSON"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, err := client.RedeemCredential(ctx, tc.permit, input)
			if p := expectProblem(t, err, codeInvalidRequest, OutcomeRejected, 400); p.Message != tc.message {
				t.Fatalf("message %q, want %q", p.Message, tc.message)
			}
		})
	}
	t.Run("other operation", func(t *testing.T) {
		var out *SendMessageReply
		err := client.t.call(ctx, sendOperation, sendInput("hello"), SignedProof{}, &out, nil)
		p := expectProblem(t, err, codeInvalidRequest, OutcomeRejected, 400)
		if p.Message != "A credential delivery permit is only valid for redemption or acknowledgement" {
			t.Fatalf("message %q", p.Message)
		}
	})
	if n := len(a.requests()); n != 1 {
		t.Fatalf("sent %d requests, want 1", n)
	}
}
