package convohop

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const (
	testProjectID     = "11111111-1111-4111-8111-111111111111"
	testThreadID      = "22222222-2222-4222-8222-222222222222"
	testMessageID     = "33333333-3333-4333-8333-333333333333"
	testClientID      = "44444444-4444-4444-8444-444444444444"
	testMediaID       = "55555555-5555-4555-8555-555555555555"
	testBroadcastID   = "66666666-6666-4666-8666-666666666666"
	testParticipantID = "77777777-7777-4777-8777-777777777777"
)

var (
	testAdminToken   = "adm_" + strings.Repeat("a", 64)
	testProjectKey   = "pk_" + strings.Repeat("b", 64)
	testSessionToken = "st_" + strings.Repeat("c", 64)
)

func respondJSON(t *testing.T, w http.ResponseWriter, status int, value any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Errorf("encode response: %v", err)
	}
}

func respondGraphQL(t *testing.T, w http.ResponseWriter, field string, value any) {
	t.Helper()
	respondJSON(t, w, http.StatusOK, map[string]any{"data": map[string]any{field: value}})
}

func respondGraphQLError(t *testing.T, w http.ResponseWriter, code, message string) {
	t.Helper()
	respondJSON(t, w, http.StatusOK, map[string]any{
		"data": nil,
		"errors": []any{
			map[string]any{"message": message, "extensions": map[string]any{"code": code}},
		},
	})
}

func assertRequest(t *testing.T, r *http.Request, method, path, token string) {
	t.Helper()
	if r.Method != method || r.URL.Path != path || r.URL.RawQuery != "" {
		t.Errorf("request: got %s %s, want %s %s", r.Method, r.URL.String(), method, path)
	}
	if got := r.Header.Get("Authorization"); got != "Bearer "+token {
		t.Error("wrong bearer credential")
	}
	if r.Header.Get("Cache-Control") != "no-store" {
		t.Error("missing no-store request header")
	}
}

type graphqlRequest struct {
	Query     string                     `json:"query"`
	Variables map[string]json.RawMessage `json:"variables"`
}

func readGraphQLRequest(t *testing.T, r *http.Request, token string) graphqlRequest {
	t.Helper()
	assertRequest(t, r, http.MethodPost, "/graphql", token)
	if r.Header.Get("Content-Type") != "application/json" {
		t.Error("missing JSON request content type")
	}
	var request graphqlRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		t.Errorf("invalid GraphQL request JSON: %v", err)
	}
	if request.Query == "" || request.Variables == nil {
		t.Error("missing GraphQL query or variables")
	}
	return request
}

func assertVariables(t *testing.T, request graphqlRequest, want string) {
	t.Helper()
	var expected, actual any
	if err := json.Unmarshal([]byte(want), &expected); err != nil {
		t.Fatalf("invalid expected variables: %v", err)
	}
	encoded, err := json.Marshal(request.Variables)
	if err != nil {
		t.Fatalf("encode actual variables: %v", err)
	}
	if err := json.Unmarshal(encoded, &actual); err != nil {
		t.Fatalf("decode actual variables: %v", err)
	}
	if !reflect.DeepEqual(actual, expected) {
		t.Errorf("GraphQL variables: got %s, want %s", encoded, want)
	}
}

func fixtureThread(id string) Thread {
	return Thread{
		ID: id, Title: "Team", Owner: "ci_11111111111111111111111111111111", State: ThreadActive,
		HistoryOnJoin: HistorySinceJoin, HistoryAfterLeave: HistoryRevoke,
		HistoryAfterRemove: HistoryRevoke, LastSequence: 0,
	}
}

func TestConstructorValidation(t *testing.T) {
	for _, address := range []string{
		"http://localhost:8080", "http://127.0.0.1:8080/",
		"http://[::1]:8080", "https://api.example.com",
	} {
		if _, err := NewUserClient(address, testSessionToken); err != nil {
			t.Errorf("valid base URL %q: %v", address, err)
		}
	}
	for _, address := range []string{
		"", "localhost:8080", "ftp://localhost", "http://example.com",
		"http://localhost.evil.example", "https://", "http://localhost:0",
		"https://example.com:65536", "http://localhost:bad",
		"https://example.com:", "https://::1",
		"******localhost:8080", "http://localhost/v1",
		"http://localhost/?x=1", "http://localhost/#fragment",
		"http://localhost?", " http://localhost", "http://localhost ",
	} {
		if _, err := NewUserClient(address, testSessionToken); err == nil {
			t.Errorf("accepted unsafe base URL %q", address)
		}
	}
	if _, err := NewManagementClient("http://localhost", testProjectKey); err == nil {
		t.Error("project key accepted for ManagementClient")
	}
	if _, err := NewProjectClient("http://localhost", testAdminToken); err == nil {
		t.Error("admin token accepted for ProjectClient")
	}
	if _, err := NewUserClient("http://localhost", testProjectKey); err == nil {
		t.Error("project key accepted for UserClient")
	}
	for _, credential := range []string{
		"st_", "st_" + strings.Repeat("x", 64),
		testSessionToken + "\r\n", "st_" + strings.Repeat("c", 63),
	} {
		if _, err := NewUserClient("http://localhost", credential); err == nil {
			t.Errorf("accepted malformed session credential")
		}
	}
	if _, err := NewUserClient("http://localhost", testSessionToken, WithHTTPClient(nil)); err == nil {
		t.Error("accepted nil HTTP client")
	}
	if _, err := NewUserClient("http://localhost", testSessionToken, ClientOption(nil)); err == nil {
		t.Error("accepted nil client option")
	}
}

func TestCredentialsCannotFollowRedirects(t *testing.T) {
	var followed atomic.Bool
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		followed.Store(true)
		w.WriteHeader(http.StatusOK)
	}))
	defer target.Close()
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if !strings.Contains(request.Query, "thread(id:$id)") {
			t.Error("wrong GraphQL query")
		}
		http.Redirect(w, r, target.URL+"/capture", http.StatusFound)
	}))
	defer source.Close()
	custom := &http.Client{Timeout: time.Second}
	client, err := NewUserClient(source.URL, testSessionToken, WithHTTPClient(custom))
	if err != nil {
		t.Fatal(err)
	}
	_, err = client.GetThread(context.Background(), testThreadID)
	var apiErr *APIError
	if !errors.As(err, &apiErr) || apiErr.StatusCode != http.StatusFound ||
		apiErr.Code != "invalid_response" {
		t.Fatalf("redirect response: got %v", err)
	}
	if followed.Load() {
		t.Error("followed redirect with a bearer credential")
	}
	if custom.CheckRedirect != nil {
		t.Error("mutated caller's HTTP client")
	}
	if strings.Contains(err.Error(), testSessionToken) {
		t.Error("exposed credential in error")
	}
}

func TestGraphQLHTTPAndProtocolErrors(t *testing.T) {
	tests := []struct {
		name   string
		status int
		body   string
		code   string
	}{
		{"invalid bearer", 401, `{"error":{"code":"unauthenticated","message":"authentication required"}}`, "unauthenticated"},
		{"forbidden HTTP", 403, `{"error":{"code":"forbidden","message":"operation is not permitted"}}`, "forbidden"},
		{"GraphQL failure", 200, `{"errors":[{"message":"not found","extensions":{"code":"NOT_FOUND"}}],"data":null}`, "NOT_FOUND"},
		{"partial GraphQL failure", 200, `{"errors":[{"message":"forbidden","extensions":{"code":"FORBIDDEN"}}],"data":{"thread":{}}}`, "FORBIDDEN"},
		{"missing GraphQL code", 200, `{"errors":[{"message":"oops"}],"data":null}`, "invalid_response"},
		{"bad error JSON", 401, `{"message":"missing"}`, "invalid_response"},
		{"unexpected success", 202, `{}`, "unexpected_status"},
		{"missing field", 200, `{"data":{}}`, "invalid_response"},
		{"null field", 200, `{"data":{"thread":null}}`, "invalid_response"},
		{"bad JSON", 200, `not json`, "invalid_response"},
		{"wrong thread", 200, `{"data":{"thread":{"id":"` + testProjectID +
			`","title":"Team","owner":"ci_11111111111111111111111111111111","state":"active","historyOnJoin":"since_join","historyAfterLeave":"revoke","historyAfterRemove":"revoke","lastSequence":"0"}}}`, ""},
		{"numeric sequence", 200, `{"data":{"thread":{"id":"` + testThreadID +
			`","title":"Team","owner":"ci_11111111111111111111111111111111","state":"active","historyOnJoin":"since_join","historyAfterLeave":"revoke","historyAfterRemove":"revoke","lastSequence":1}}}`, ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tc.status)
				_, _ = io.WriteString(w, tc.body)
			}))
			defer server.Close()
			client, err := NewUserClient(server.URL, testSessionToken)
			if err != nil {
				t.Fatal(err)
			}
			_, err = client.GetThread(context.Background(), testThreadID)
			if err == nil {
				t.Fatal("accepted invalid response")
			}
			if tc.code != "" {
				var apiErr *APIError
				if !errors.As(err, &apiErr) || apiErr.StatusCode != tc.status || apiErr.Code != tc.code {
					t.Fatalf("API error: got %v", err)
				}
			}
		})
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if !strings.Contains(request.Query, "historyOnJoin") ||
			!strings.Contains(request.Query, "lastSequence") {
			t.Errorf("thread selection omitted typed fields: %s", request.Query)
		}
		assertVariables(t, request, `{"id":"`+testThreadID+`"}`)
		respondGraphQL(t, w, "thread", fixtureThread(testThreadID))
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.GetThread(context.Background(), testThreadID); err != nil {
		t.Fatalf("GraphQL success: %v", err)
	}
	if _, err := client.GetThread(nil, testThreadID); err == nil {
		t.Error("accepted nil context")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := client.GetThread(ctx, testThreadID); !errors.Is(err, context.Canceled) {
		t.Errorf("canceled request: got %v", err)
	}
}

func TestNewMessageID(t *testing.T) {
	first, err := NewMessageID()
	if err != nil {
		t.Fatal(err)
	}
	second, err := NewMessageID()
	if err != nil {
		t.Fatal(err)
	}
	if err := validateNonNilUUID("message ID", first); err != nil || first == second ||
		first[14] != '4' || !strings.ContainsRune("89ab", rune(first[19])) {
		t.Fatalf("expected distinct v4 UUIDs, got %q and %q: %v", first, second, err)
	}
}
