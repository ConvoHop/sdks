package convohop

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"math"
	"reflect"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

const (
	sendOperation   = "communication.sendMessage"
	lookupOperation = "communication.resolveRequest"
	projectStoreKey = "convohop.requests:backend:" + testProject
	// parityFingerprint is the TypeScript SDK's fingerprint of the input in
	// TestFingerprintParity.
	parityFingerprint = "sha256:3c9e19cf6c86a74ea06d16b8caca8826af7b5e3fb349d58e046c0852fa225c41"
)

func send(c *ProjectClient, text string, options ...CallOption) (*SendMessageReply, error) {
	return c.SendMessage(context.Background(), sendInput(text), options...)
}

func recordsOf(t *testing.T, c *ProjectClient) []RecoveryRecord {
	t.Helper()
	records, err := c.RecoveryRecords(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	return records
}

func onlyRecord(t *testing.T, c *ProjectClient) RecoveryRecord {
	t.Helper()
	records := recordsOf(t, c)
	if len(records) != 1 {
		t.Fatalf("records = %+v, want one", records)
	}
	return records[0]
}

func operationsOf(a *authority) []string {
	var ids []string
	for _, ex := range a.requests() {
		ids = append(ids, ex.op.id)
	}
	return ids
}

// resolving answers request lookups with a resolution in the state that
// state returns, and sendMessage requests with a send receipt.
func resolving(state func() string) func(*exchange) response {
	return func(ex *exchange) response {
		switch ex.op.id {
		case sendOperation:
			return response{body: success(ex.op, ex.requestID, sent(ex))}
		case lookupOperation:
			lookedUp, _ := ex.input["requestId"].(string)
			return response{body: success(ex.op, ex.requestID, resolution(state(), lookedUp))}
		}
		return response{}
	}
}

func constant(state string) func() string { return func() string { return state } }

func TestRecoveryRecord(t *testing.T) {
	clock := newTestClock()
	a := newAuthority(t, replying(sendOperation, sent))
	client := newProject(t, a, WithClock(clock.Now))
	reply, err := send(client, "hello", WithRequestID(testRequest))
	if err != nil {
		t.Fatal(err)
	}
	if reply.Status != "committed" || reply.RequestID != testRequest || reply.Result == nil || reply.Result.Status != "sent" {
		t.Fatalf("reply = %+v", reply)
	}
	start := clock.Now().UnixMilli()
	window := int64(catalog.operations[sendOperation].windowMs)
	record := onlyRecord(t, client)
	want := RecoveryRecord{
		RequestID: testRequest, Incarnation: testIncarnation, PayloadFingerprint: record.PayloadFingerprint,
		Operation: sendOperation, ProjectID: testProject,
		Input:            map[string]any{"conversationId": testConversation, "props": map[string]any{}, "text": "hello"},
		FirstSubmittedAt: start, RetryDeadline: start + window, AttemptCount: 1, LastAttemptAt: start,
		LastAttemptClassification: "authorityReceipt", ResolutionState: "committed",
	}
	if !reflect.DeepEqual(record, want) {
		t.Fatalf("record = %+v\nwant %+v", record, want)
	}
	if window <= 0 || catalog.operations[sendOperation].maxAttempts < 2 {
		t.Fatalf("sendMessage has no retry budget in the catalog")
	}
	expected, err := fingerprint(map[string]any{"operation": sendOperation, "projectId": testProject, "input": want.Input})
	if err != nil || record.PayloadFingerprint != expected {
		t.Fatalf("fingerprint = %s, want %s (%v)", record.PayloadFingerprint, expected, err)
	}
	record.Input["text"] = "changed"
	if again := onlyRecord(t, client); again.Input["text"] != "hello" {
		t.Fatalf("RecoveryRecords shares its input: %+v", again.Input)
	}
}

// TestFingerprintParity sends the shared canonical vector, whose fingerprint
// the TypeScript SDK computes too.
func TestFingerprintParity(t *testing.T) {
	a := newAuthority(t, replying(sendOperation, sent))
	client := newProject(t, a)
	input := SendMessageRequestInput{
		ConversationID: testConversation,
		Text:           "h\u00e9llo \u2028 <b>&\"\\\n\u0001\U0001F600\u007f",
		Props: Properties{
			"z": 1, "\u00e9": 0.1, "\U0001F600": 9007199254740991, "\uffff": math.Copysign(0, -1),
			"a": []any{1.5, true, nil, 1e-7, 5e-324, -9007199254740991, 2.50, -1e3, 0.000001},
		},
	}
	if _, err := client.SendMessage(context.Background(), input); err != nil {
		t.Fatal(err)
	}
	if got := onlyRecord(t, client).PayloadFingerprint; got != parityFingerprint {
		t.Fatalf("fingerprint = %s, want %s", got, parityFingerprint)
	}
}

func TestResendKeepsIdentity(t *testing.T) {
	a := newAuthority(t, dropping(sendOperation))
	client := newProject(t, a)
	_, err := send(client, "hello", WithRequestID(testRequest))
	expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
	record := onlyRecord(t, client)
	if record.ResolutionState != "unknown" || record.AttemptCount != 1 || record.LastAttemptClassification != string(codeTransportUnknown) {
		t.Fatalf("record after a dropped attempt = %+v", record)
	}
	a.setRespond(replying(sendOperation, sent))
	if _, err := send(client, "hello", WithRequestID(testRequest)); err != nil {
		t.Fatal(err)
	}
	record = onlyRecord(t, client)
	if record.ResolutionState != "committed" || record.AttemptCount != 2 || record.LastAttemptClassification != "authorityReceipt" {
		t.Fatalf("record after the resend = %+v", record)
	}
	seen := a.requests()
	if len(seen) != 2 || seen[0].requestID != testRequest || seen[1].requestID != testRequest ||
		!reflect.DeepEqual(seen[0].input, seen[1].input) {
		t.Fatalf("requests = %+v", seen)
	}
}

func TestRetryBudget(t *testing.T) {
	limit := catalog.operations[sendOperation].maxAttempts
	a := newAuthority(t, dropping(sendOperation))
	client := newProject(t, a)
	for range limit {
		_, err := send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
	}
	_, err := send(client, "hello", WithRequestID(testRequest))
	expectProblem(t, err, codeResolutionRequired, OutcomeUnknown, 409)
	if n := a.count(sendOperation); n != limit {
		t.Fatalf("sent %d attempts, want %d", n, limit)
	}
	if record := onlyRecord(t, client); record.AttemptCount != int64(limit) || record.ResolutionState != "unknown" {
		t.Fatalf("record = %+v", record)
	}
}

func TestRetryWindow(t *testing.T) {
	window := time.Duration(catalog.operations[sendOperation].windowMs) * time.Millisecond
	clock := newTestClock()
	start := clock.Now()
	a := newAuthority(t, dropping(sendOperation))
	client := newProject(t, a, WithClock(clock.Now))
	attempt := func() error {
		_, err := send(client, "hello", WithRequestID(testRequest))
		return err
	}
	expectProblem(t, attempt(), codeTransportUnknown, OutcomeUnknown, 0)
	clock.Set(start.Add(window))
	expectProblem(t, attempt(), codeTransportUnknown, OutcomeUnknown, 0)
	clock.Set(start.Add(window + time.Millisecond))
	expectProblem(t, attempt(), codeResolutionRequired, OutcomeUnknown, 409)
	if n := a.count(sendOperation); n != 2 {
		t.Fatalf("sent %d attempts, want 2", n)
	}
}

func TestRetryRefusesClockChanges(t *testing.T) {
	clock := newTestClock()
	start := clock.Now()
	a := newAuthority(t, dropping(sendOperation))
	client := newProject(t, a, WithClock(clock.Now))
	attempt := func() error {
		_, err := send(client, "hello", WithRequestID(testRequest))
		return err
	}
	expectProblem(t, attempt(), codeTransportUnknown, OutcomeUnknown, 0)
	clock.Set(start.Add(20 * time.Second))
	expectProblem(t, attempt(), codeTransportUnknown, OutcomeUnknown, 0)
	for _, back := range []time.Duration{10 * time.Second, -time.Millisecond} {
		clock.Set(start.Add(back))
		expectProblem(t, attempt(), codeResolutionRequired, OutcomeUnknown, 409)
	}
	if n := a.count(sendOperation); n != 2 {
		t.Fatalf("sent %d attempts, want 2", n)
	}
}

func TestIdempotencyConflicts(t *testing.T) {
	a := newAuthority(t, dropping(sendOperation))
	client := newProject(t, a)
	_, err := send(client, "hello", WithRequestID(testRequest))
	expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
	_, err = send(client, "changed", WithRequestID(testRequest))
	expectProblem(t, err, codeIdempotencyConflict, OutcomeUnknown, 409)
	_, err = client.CreatePrincipal(context.Background(), CreatePrincipalRequestInput{ExternalUserID: "user"}, WithRequestID(testRequest))
	expectProblem(t, err, codeIdempotencyConflict, OutcomeUnknown, 409)
	if n := len(a.requests()); n != 1 {
		t.Fatalf("sent %d requests, want 1", n)
	}
	if record := onlyRecord(t, client); record.Input["text"] != "hello" || record.AttemptCount != 1 {
		t.Fatalf("record = %+v", record)
	}
}

// holding returns an authority that holds sendMessage requests until release
// is called, and reports each arrival on arrived.
func holding(t *testing.T) (a *authority, arrived chan struct{}, release func()) {
	arrived = make(chan struct{}, 8)
	gate := make(chan struct{})
	var once sync.Once
	release = func() { once.Do(func() { close(gate) }) }
	a = newAuthority(t, func(ex *exchange) response {
		if ex.op.id != sendOperation {
			return response{}
		}
		arrived <- struct{}{}
		<-gate
		return response{body: success(ex.op, ex.requestID, sent(ex))}
	})
	t.Cleanup(release)
	return a, arrived, release
}

type sendResult struct {
	reply *SendMessageReply
	err   error
}

func sendAsync(ctx context.Context, c *ProjectClient, text string) chan sendResult {
	done := make(chan sendResult, 1)
	go func() {
		reply, err := c.SendMessage(ctx, sendInput(text), WithRequestID(testRequest))
		done <- sendResult{reply, err}
	}()
	return done
}

func TestConcurrentCallsShareOneAttempt(t *testing.T) {
	a, arrived, release := holding(t)
	client := newProject(t, a)
	first := sendAsync(context.Background(), client, "hello")
	<-arrived
	watch := newDoneWatch()
	second := sendAsync(watch, client, "hello")
	<-watch.waiting
	_, err := send(client, "changed", WithRequestID(testRequest))
	expectProblem(t, err, codeIdempotencyConflict, OutcomeUnknown, 409)
	release()
	one, two := <-first, <-second
	if one.err != nil || two.err != nil {
		t.Fatalf("errors = %v, %v", one.err, two.err)
	}
	if !reflect.DeepEqual(one.reply, two.reply) || one.reply.Result == nil {
		t.Fatalf("replies differ: %+v, %+v", one.reply, two.reply)
	}
	if n := a.count(sendOperation); n != 1 {
		t.Fatalf("sent %d attempts, want 1", n)
	}
	if record := onlyRecord(t, client); record.AttemptCount != 1 || record.ResolutionState != "committed" {
		t.Fatalf("record = %+v", record)
	}
}

func TestWaitingCallEndsWithItsContext(t *testing.T) {
	a, arrived, release := holding(t)
	client := newProject(t, a)
	first := sendAsync(context.Background(), client, "hello")
	<-arrived
	ctx, cancel := context.WithCancel(context.Background())
	watch := &doneWatch{Context: ctx, waiting: make(chan struct{})}
	second := sendAsync(watch, client, "hello")
	<-watch.waiting
	cancel()
	ended := <-second
	expectProblem(t, ended.err, codeTransportUnknown, OutcomeUnknown, 0)
	if !errors.Is(ended.err, context.Canceled) {
		t.Fatalf("error %v does not wrap context.Canceled", ended.err)
	}
	release()
	if result := <-first; result.err != nil {
		t.Fatal(result.err)
	}
	if n := a.count(sendOperation); n != 1 {
		t.Fatalf("sent %d attempts, want 1", n)
	}
}

// unknownOutcome records testRequest with an unknown outcome.
func unknownOutcome(t *testing.T, a *authority, client *ProjectClient) {
	t.Helper()
	a.setRespond(dropping(sendOperation))
	_, err := send(client, "hello", WithRequestID(testRequest))
	expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
}

func TestRetryReturnsObservedResolution(t *testing.T) {
	a := newAuthority(t, nil)
	client := newProject(t, a)
	unknownOutcome(t, a, client)
	a.setRespond(resolving(constant("committed")))
	got, err := client.Retry(context.Background(), testRequest)
	if err != nil {
		t.Fatal(err)
	}
	if got.State != "committed" || got.RequestID != testRequest || got.Receipt == nil || got.Receipt.RequestID != testRequest {
		t.Fatalf("resolution = %+v", got)
	}
	if ids := operationsOf(a); !slices.Equal(ids, []string{sendOperation, lookupOperation}) {
		t.Fatalf("operations = %v", ids)
	}
	lookup := a.requests()[1]
	if lookup.input["requestId"] != testRequest || lookup.requestID == testRequest || !isUUID(lookup.requestID) {
		t.Fatalf("lookup = %+v %+v", lookup.input, lookup.context)
	}
	record := onlyRecord(t, client)
	if record.ResolutionState != "committed" || record.LastAttemptClassification != "authorityReceipt" || record.AttemptCount != 1 {
		t.Fatalf("record = %+v", record)
	}
}

func TestRetryResendsUnobservedRequest(t *testing.T) {
	a := newAuthority(t, nil)
	client := newProject(t, a)
	unknownOutcome(t, a, client)
	a.setRespond(resolving(func() string {
		if a.count(sendOperation) > 1 {
			return "committed"
		}
		return "notObservedYet"
	}))
	got, err := client.Retry(context.Background(), testRequest)
	if err != nil {
		t.Fatal(err)
	}
	if got.State != "committed" {
		t.Fatalf("resolution = %+v", got)
	}
	want := []string{sendOperation, lookupOperation, sendOperation, lookupOperation}
	if ids := operationsOf(a); !slices.Equal(ids, want) {
		t.Fatalf("operations = %v, want %v", ids, want)
	}
	seen := a.requests()
	if seen[2].requestID != testRequest || !reflect.DeepEqual(seen[2].input, seen[0].input) {
		t.Fatalf("resend = %s %+v, want %s %+v", seen[2].requestID, seen[2].input, testRequest, seen[0].input)
	}
	if record := onlyRecord(t, client); record.AttemptCount != 2 || record.ResolutionState != "committed" {
		t.Fatalf("record = %+v", record)
	}
}

// storedRecord is a valid stored recovery record of id.
func storedRecord(id, operation string) map[string]any {
	return map[string]any{
		"requestId": id, "incarnation": testIncarnation, "payloadFingerprint": "sha256:00", "operation": operation,
		"projectId": testProject, "input": map[string]any{}, "firstSubmittedAt": 1, "retryDeadline": 2,
		"attemptCount": 1, "lastAttemptAt": 1, "lastAttemptClassification": "submitted", "resolutionState": "unknown",
	}
}

// storing returns a store holding records under the test project's key.
func storing(t *testing.T, records any) *MemoryRecoveryStore {
	t.Helper()
	data, ok := records.([]byte)
	if !ok {
		var err error
		if data, err = json.Marshal(records); err != nil {
			t.Fatal(err)
		}
	}
	store := NewMemoryRecoveryStore()
	if err := store.Store(context.Background(), projectStoreKey, data); err != nil {
		t.Fatal(err)
	}
	return store
}

func TestRetryRefusals(t *testing.T) {
	ended, cancel := context.WithCancel(context.Background())
	cancel()
	for _, tc := range []struct {
		name    string
		prepare func(*testing.T, *authority, *ProjectClient)
		ctx     func() context.Context
		id      string
		code    ErrorCode
		outcome Outcome
		status  int
		sent    []string
	}{
		{name: "invalid request ID", id: upperUUID, code: codeInvalidRequest, outcome: OutcomeRejected, status: 400},
		{name: "nil context", ctx: func() context.Context { return nil }, code: codeInvalidRequest, outcome: OutcomeRejected, status: 400},
		{name: "ended context", ctx: func() context.Context { return ended }, code: codeTransportUnknown, outcome: OutcomeRejected},
		{
			name: "settled record", prepare: func(t *testing.T, a *authority, c *ProjectClient) {
				a.setRespond(resolving(constant("notObservedYet")))
				if _, err := send(c, "hello", WithRequestID(testRequest)); err != nil {
					t.Fatal(err)
				}
			},
			code: codeResolutionRequired, outcome: OutcomeUnknown, status: 409, sent: []string{sendOperation, lookupOperation},
		},
		{
			name: "unknown resolution state", prepare: func(t *testing.T, a *authority, c *ProjectClient) {
				unknownOutcome(t, a, c)
				a.setRespond(resolving(constant("pending")))
			},
			code: codeInvalidResponse, outcome: OutcomeUnknown, status: 503, sent: []string{sendOperation, lookupOperation},
		},
		{
			name: "exhausted budget", prepare: func(t *testing.T, a *authority, c *ProjectClient) {
				for range catalog.operations[sendOperation].maxAttempts {
					unknownOutcome(t, a, c)
				}
				a.setRespond(resolving(constant("notObservedYet")))
			},
			code: codeResolutionRequired, outcome: OutcomeUnknown, status: 409,
			sent: []string{sendOperation, sendOperation, sendOperation, lookupOperation},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, nil)
			client := newProject(t, a)
			if tc.prepare != nil {
				tc.prepare(t, a, client)
			}
			ctx, id := context.Background(), tc.id
			if tc.ctx != nil {
				ctx = tc.ctx()
			}
			if id == "" {
				id = testRequest
			}
			_, err := client.Retry(ctx, id)
			expectProblem(t, err, tc.code, tc.outcome, tc.status)
			if ids := operationsOf(a); !slices.Equal(ids, tc.sent) {
				t.Fatalf("operations = %v, want %v", ids, tc.sent)
			}
			if ctx == ended && !errors.Is(err, context.Canceled) {
				t.Fatalf("error %v does not wrap context.Canceled", err)
			}
		})
	}
}

func TestRetryRefusesRecordsItCannotResend(t *testing.T) {
	t.Run("no record", func(t *testing.T) {
		a := newAuthority(t, nil)
		_, err := newProject(t, a).Retry(context.Background(), testRequest)
		var p *Problem
		if err == nil || errors.As(err, &p) || !strings.Contains(err.Error(), "no recovery record") {
			t.Fatalf("error = %v, want the missing record error", err)
		}
		if n := len(a.requests()); n != 0 {
			t.Fatalf("sent %d requests", n)
		}
	})
	t.Run("delivery permit", func(t *testing.T) {
		a := newAuthority(t, nil)
		store := storing(t, []any{storedRecord(testRequest, "communication.redeemCredential")})
		_, err := newProject(t, a, WithRecoveryStore(store)).Retry(context.Background(), testRequest)
		expectProblem(t, err, codeCredentialRequired, OutcomeUnknown, 409)
		if n := len(a.requests()); n != 0 {
			t.Fatalf("sent %d requests", n)
		}
	})
	t.Run("no backend key", func(t *testing.T) {
		a := newAuthority(t, nil)
		store := NewMemoryRecoveryStore()
		unknownOutcome(t, a, newProject(t, a, WithRecoveryStore(store)))
		keyless, err := NewProjectClient(ProjectConfig{BaseURL: a.server.URL, ProjectID: testProject, Incarnation: testIncarnation},
			WithRecoveryStore(store))
		if err != nil {
			t.Fatal(err)
		}
		_, err = keyless.Retry(context.Background(), testRequest)
		expectProblem(t, err, codeUnauthenticated, OutcomeRejected, 401)
		if n := len(a.requests()); n != 1 {
			t.Fatalf("sent %d requests, want 1", n)
		}
	})
	t.Run("other incarnation", func(t *testing.T) {
		a := newAuthority(t, nil)
		store := NewMemoryRecoveryStore()
		unknownOutcome(t, a, newProject(t, a, WithRecoveryStore(store)))
		restored, err := NewProjectClient(ProjectConfig{
			BaseURL: a.server.URL, ProjectID: testProject, Incarnation: testUUID, BackendKey: testKey,
		}, WithRecoveryStore(store))
		if err != nil {
			t.Fatal(err)
		}
		_, err = restored.Retry(context.Background(), testRequest)
		expectProblem(t, err, codeIncarnationMismatch, OutcomeUnknown, 409)
		_, err = send(restored, "hello", WithRequestID(testRequest))
		expectProblem(t, err, codeIdempotencyConflict, OutcomeUnknown, 409)
		if n := len(a.requests()); n != 1 {
			t.Fatalf("sent %d requests, want 1", n)
		}
	})
}

func TestSharedRecoveryStore(t *testing.T) {
	store := NewMemoryRecoveryStore()
	a := newAuthority(t, dropping(sendOperation))
	first := newProject(t, a, WithRecoveryStore(store))
	_, err := send(first, "<b>&", WithRequestID(testRequest))
	expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
	data, err := store.Load(context.Background(), projectStoreKey)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), testKey) || !strings.Contains(string(data), `"text":"<b>&"`) {
		t.Fatalf("stored records = %s", data)
	}
	var stored []map[string]any
	if err := json.Unmarshal(data, &stored); err != nil || len(stored) != 1 {
		t.Fatalf("stored records = %s (%v)", data, err)
	}
	fields := []string{
		"attemptCount", "firstSubmittedAt", "incarnation", "input", "lastAttemptAt", "lastAttemptClassification",
		"operation", "payloadFingerprint", "projectId", "requestId", "resolutionState", "retryDeadline",
	}
	if keys := slices.Sorted(maps.Keys(stored[0])); !slices.Equal(keys, fields) {
		t.Fatalf("stored fields = %v, want %v", keys, fields)
	}
	second := newProject(t, a, WithRecoveryStore(store))
	if got, want := recordsOf(t, second), recordsOf(t, first); !reflect.DeepEqual(got, want) {
		t.Fatalf("restored records = %+v, want %+v", got, want)
	}
	a.setRespond(replying(sendOperation, sent))
	if _, err := send(second, "<b>&", WithRequestID(testRequest)); err != nil {
		t.Fatal(err)
	}
	if record := onlyRecord(t, second); record.AttemptCount != 2 || record.ResolutionState != "committed" {
		t.Fatalf("record = %+v", record)
	}
	third := newProject(t, a, WithRecoveryStore(store))
	if record := onlyRecord(t, third); record.ResolutionState != "committed" {
		t.Fatalf("stored record = %+v", record)
	}
}

func TestManagementRecoveryStoreKey(t *testing.T) {
	store := NewMemoryRecoveryStore()
	a := newAuthority(t, dropping("management.issueBackendKey"))
	client, err := NewManagementClient(ManagementConfig{BaseURL: a.server.URL, AccessToken: "operator-token", ActorID: testActor},
		WithRecoveryStore(store))
	if err != nil {
		t.Fatal(err)
	}
	_, err = client.IssueBackendKey(context.Background(), IssueBackendKeyRequestInput{
		ProjectID: testProject, Name: "server", Scopes: []string{"messages"}, ExpiresAt: testTime,
	})
	expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
	data, err := store.Load(context.Background(), "convohop.requests:management:"+testActor)
	if err != nil || !strings.Contains(string(data), `"incarnation":"management"`) || strings.Contains(string(data), "operator-token") ||
		strings.Contains(string(data), `"projectId":"`+testProject+`","requestId"`) {
		t.Fatalf("stored records = %s (%v)", data, err)
	}
}

// faultyStore is a [MemoryRecoveryStore] that fails a load, or the Store
// calls numbered in failStore.
type faultyStore struct {
	MemoryRecoveryStore
	mu        sync.Mutex
	loadErr   error
	failStore map[int]error
	stores    int
}

func (s *faultyStore) Load(ctx context.Context, key string) ([]byte, error) {
	s.mu.Lock()
	err := s.loadErr
	s.loadErr = nil
	s.mu.Unlock()
	if err != nil {
		return nil, err
	}
	return s.MemoryRecoveryStore.Load(ctx, key)
}

func (s *faultyStore) Store(ctx context.Context, key string, data []byte) error {
	s.mu.Lock()
	s.stores++
	err := s.failStore[s.stores]
	s.mu.Unlock()
	if err != nil {
		return err
	}
	return s.MemoryRecoveryStore.Store(ctx, key, data)
}

func TestRecoveryStoreLoadFailure(t *testing.T) {
	unavailable := errors.New("store unavailable")
	a := newAuthority(t, replying(sendOperation, sent))
	client := newProject(t, a, WithRecoveryStore(&faultyStore{loadErr: unavailable}))
	_, err := send(client, "hello")
	expectProblem(t, err, codeRecoveryStorageFailure, OutcomeRejected, 0)
	if !errors.Is(err, unavailable) {
		t.Fatalf("error %v does not wrap the store error", err)
	}
	if n := len(a.requests()); n != 0 {
		t.Fatalf("sent %d requests", n)
	}
	if _, err := send(client, "hello"); err != nil {
		t.Fatal(err)
	}
}

func TestInvalidStoredRecords(t *testing.T) {
	with := func(key string, value any) []any {
		record := storedRecord(testRequest, sendOperation)
		if value == nil {
			delete(record, key)
		} else {
			record[key] = value
		}
		return []any{record}
	}
	tooMany := make([]any, maxRecoveryRecords+1)
	for i := range tooMany {
		tooMany[i] = storedRecord(journalID(i+1), sendOperation)
	}
	for name, stored := range map[string]any{
		"not JSON":               []byte("["),
		"trailing data":          []byte("[] []"),
		"not a list":             map[string]any{},
		"too many records":       tooMany,
		"duplicate identity":     []any{storedRecord(testRequest, sendOperation), storedRecord(testRequest, sendOperation)},
		"not an object":          []any{"record"},
		"unknown operation":      with("operation", "communication.unknown"),
		"query operation":        with("operation", "communication.messages"),
		"unknown state":          with("resolutionState", "settled"),
		"missing project":        with("projectId", nil),
		"invalid project":        with("projectId", "project"),
		"unexpected project":     with("operation", "management.issueBackendKey"),
		"negative count":         with("attemptCount", -1),
		"fractional clock":       with("retryDeadline", 1.5),
		"unsafe clock":           with("lastAttemptAt", json.Number("9007199254740992")),
		"text clock":             with("firstSubmittedAt", "1"),
		"cleared media marker":   with("mediaAdmissionAttempted", false),
		"invalid request ID":     with("requestId", upperUUID),
		"missing incarnation":    with("incarnation", nil),
		"invalid fingerprint":    with("payloadFingerprint", 1),
		"missing classification": with("lastAttemptClassification", nil),
		"input not an object":    with("input", []any{}),
	} {
		t.Run(name, func(t *testing.T) {
			a := newAuthority(t, nil)
			client := newProject(t, a, WithRecoveryStore(storing(t, stored)))
			_, err := send(client, "hello")
			expectProblem(t, err, codeRecoveryStorageFailure, OutcomeRejected, 0)
			if _, err := client.RecoveryRecords(context.Background()); err == nil {
				t.Fatal("RecoveryRecords accepted invalid records")
			}
			if n := len(a.requests()); n != 0 {
				t.Fatalf("sent %d requests", n)
			}
		})
	}
	t.Run("valid records", func(t *testing.T) {
		record := storedRecord(testRequest, sendOperation)
		record["mediaAdmissionAttempted"] = true
		settled := storedRecord(testUUID, "communication.createPrincipal")
		settled["resolutionState"] = "committed"
		rejected := storedRecord(journalID(1), sendOperation)
		rejected["resolutionState"], rejected["lastAttemptClassification"] = "rejected", "RATE_LIMITED"
		client := newProject(t, newAuthority(t, nil), WithRecoveryStore(storing(t, []any{record, settled, rejected})))
		records := recordsOf(t, client)
		if len(records) != 3 || !records[0].MediaAdmissionAttempted || records[0].AttemptCount != 1 ||
			records[0].RetryDeadline != 2 || records[1].RequestID != testUUID || records[1].ResolutionState != "committed" ||
			records[2].ResolutionState != "rejected" || records[2].LastAttemptClassification != "RATE_LIMITED" {
			t.Fatalf("records = %+v", records)
		}
	})
}

func TestRecoveryStoreWriteFailure(t *testing.T) {
	unavailable := errors.New("store unavailable")
	for _, tc := range []struct {
		name    string
		write   int
		respond func(*exchange) response
		outcome Outcome
		sent    int
	}{
		{"record creation", 1, replying(sendOperation, sent), OutcomeUnknown, 0},
		{"attempt", 2, replying(sendOperation, sent), OutcomeUnknown, 0},
		{"receipt", 3, replying(sendOperation, sent), OutcomeCommitted, 1},
		{"failed attempt", 3, dropping(sendOperation), OutcomeUnknown, 1},
		{"rejected attempt", 3, refusing(ErrorCodeRateLimited, 429), OutcomeRejected, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, tc.respond)
			store := &faultyStore{failStore: map[int]error{tc.write: unavailable}}
			client := newProject(t, a, WithRecoveryStore(store))
			_, err := send(client, "hello", WithRequestID(testRequest))
			p := expectProblem(t, err, codeRecoveryStorageFailure, tc.outcome, 0)
			if p.RequestID != testRequest || !errors.Is(err, unavailable) {
				t.Fatalf("problem %v does not name the request and wrap the store error", err)
			}
			if n := a.count(sendOperation); n != tc.sent {
				t.Fatalf("sent %d attempts, want %d", n, tc.sent)
			}
			failure, failed := map[string]ErrorCode{
				"failed attempt": codeTransportUnknown, "rejected attempt": ErrorCodeRateLimited,
			}[tc.name]
			if failed && !errors.Is(err, failure) {
				t.Fatalf("problem %v does not wrap the %s failure", err, failure)
			}
		})
	}
}

// journalID is the request ID of the nth record of a test journal.
func journalID(n int) string {
	return fmt.Sprintf("00000000-0000-4000-8000-%012d", n)
}

// journal is a full journal of stored sendMessage records whose outcome is
// unknown and whose retry budget remains, so that none is final, the nth
// changed by edit when it is not nil.
func journal(edit func(n int, record map[string]any)) []any {
	records := make([]any, maxRecoveryRecords)
	for i := range records {
		record := storedRecord(journalID(i+1), sendOperation)
		record["retryDeadline"] = maxSafeInteger
		if edit != nil {
			edit(i+1, record)
		}
		records[i] = record
	}
	return records
}

// idsOf lists the request IDs of the client's records, oldest first.
func idsOf(t *testing.T, c *ProjectClient) []string {
	t.Helper()
	var ids []string
	for _, record := range recordsOf(t, c) {
		ids = append(ids, record.RequestID)
	}
	return ids
}

// refusing rejects every sendMessage request with code and status.
func refusing(code ErrorCode, status int) func(*exchange) response {
	return func(ex *exchange) response {
		if ex.op.id != sendOperation {
			return response{}
		}
		return response{body: graphQLError("Refused", map[string]any{"code": string(code), "outcome": "rejected", "status": status})}
	}
}

// limited requires a new request to fail with RECOVERY_LIMIT and send
// nothing, because the client's full journal has no record to forget.
func limited(t *testing.T, a *authority, c *ProjectClient) {
	t.Helper()
	before := a.count(sendOperation)
	_, err := send(c, "hello", WithRequestID(testUUID))
	if p := expectProblem(t, err, codeRecoveryLimit, OutcomeRejected, 409); p.RequestID != testUUID {
		t.Fatalf("problem names request %q, want %q", p.RequestID, testUUID)
	}
	if n := a.count(sendOperation); n != before {
		t.Fatalf("sent %d requests, want none", n-before)
	}
	if ids := idsOf(t, c); len(ids) != maxRecoveryRecords || slices.Contains(ids, testUUID) {
		t.Fatalf("records = %v", ids)
	}
}

// evicts requires a new request to succeed in the place of the record of id.
func evicts(t *testing.T, a *authority, c *ProjectClient, id string) {
	t.Helper()
	a.setRespond(replying(sendOperation, sent))
	if _, err := send(c, "hello", WithRequestID(testUUID)); err != nil {
		t.Fatal(err)
	}
	if ids := idsOf(t, c); len(ids) != maxRecoveryRecords || slices.Contains(ids, id) || ids[len(ids)-1] != testUUID {
		t.Fatalf("records = %v, want %s in the place of %s", ids, testUUID, id)
	}
}

func TestRecoveryCapacity(t *testing.T) {
	t.Run("evicts the final record attempted longest ago", func(t *testing.T) {
		stored := journal(func(n int, record map[string]any) {
			record["resolutionState"], record["lastAttemptAt"] = "committed", 10
			if n == 4 || n == 8 {
				record["lastAttemptAt"] = 5
			}
		})
		a := newAuthority(t, replying(sendOperation, sent))
		client := newProject(t, a, WithRecoveryStore(storing(t, stored)))
		want := make([]string, 0, maxRecoveryRecords)
		for n := 1; n <= maxRecoveryRecords; n++ {
			want = append(want, journalID(n))
		}
		// The two attempted longest ago go first, in journal order, then the
		// first of the others.
		for i, gone := range []int{4, 8, 1} {
			id := journalID(maxRecoveryRecords + 1 + i)
			if _, err := send(client, "hello", WithRequestID(id)); err != nil {
				t.Fatal(err)
			}
			want = append(slices.DeleteFunc(want, func(kept string) bool { return kept == journalID(gone) }), id)
			if ids := idsOf(t, client); !slices.Equal(ids, want) {
				t.Fatalf("after %s, records = %v, want %v", id, ids, want)
			}
		}
	})
	t.Run("evicts only final records", func(t *testing.T) {
		clock := newTestClock()
		now := clock.Now().UnixMilli()
		stored := journal(func(n int, record map[string]any) {
			record["firstSubmittedAt"], record["lastAttemptAt"], record["retryDeadline"] = now-1000, now-1000, now+59_000
			rejected := func(code string) {
				record["resolutionState"], record["lastAttemptClassification"] = "rejected", code
			}
			switch n {
			case 1:
				record["resolutionState"], record["lastAttemptClassification"], record["attemptCount"] = "pending", "notSubmitted", 0
			case 2:
				rejected("RATE_LIMITED")
			case 3:
				rejected("WRONG_REGION")
			case 4:
				rejected("NEWER_SERVICE_CODE")
			case 5:
				// Nor is a record from a clock that was ahead: it refuses a
				// resend only until this clock catches up.
				record["firstSubmittedAt"], record["lastAttemptAt"], record["retryDeadline"] = now+30_000, now+30_000, now+90_000
			case 100:
				// The only final record, attempted after every other.
				rejected("REVISION_CONFLICT")
				record["lastAttemptAt"] = now - 1
			}
		})
		a := newAuthority(t, replying(sendOperation, sent))
		client := newProject(t, a, WithClock(clock.Now), WithRecoveryStore(storing(t, stored)))
		if _, err := send(client, "hello", WithRequestID(testRequest)); err != nil {
			t.Fatal(err)
		}
		var want []string
		for n := 1; n <= maxRecoveryRecords; n++ {
			if n != 100 {
				want = append(want, journalID(n))
			}
		}
		if ids := idsOf(t, client); !slices.Equal(ids, append(want, testRequest)) {
			t.Fatalf("records = %v", ids)
		}
		// The committed record is now the only final one.
		evicts(t, a, client, testRequest)
	})
	t.Run("fails closed when no record is final", func(t *testing.T) {
		a := newAuthority(t, dropping(sendOperation))
		client := newProject(t, a, WithRecoveryStore(storing(t, journal(nil)[1:])))
		_, err := send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
		limited(t, a, client)
		// Sending a recorded request again needs no new place.
		a.setRespond(replying(sendOperation, sent))
		if _, err := send(client, "hello", WithRequestID(testRequest)); err != nil {
			t.Fatal(err)
		}
		evicts(t, a, client, testRequest)
		if n := a.count(sendOperation); n != 3 {
			t.Fatalf("sent %d requests, want 3", n)
		}
	})
	t.Run("keeps a final record that a call is using", func(t *testing.T) {
		a := newAuthority(t, replying(sendOperation, sent))
		client := newProject(t, a, WithRecoveryStore(storing(t, journal(nil)[1:])))
		if _, err := send(client, "hello", WithRequestID(testRequest)); err != nil {
			t.Fatal(err)
		}
		arrived, held := make(chan struct{}, 1), make(chan struct{})
		var once sync.Once
		release := func() { once.Do(func() { close(held) }) }
		t.Cleanup(release)
		a.setRespond(func(ex *exchange) response {
			arrived <- struct{}{}
			<-held
			return response{body: success(ex.op, ex.requestID, sent(ex))}
		})
		replay := sendAsync(context.Background(), client, "hello")
		<-arrived
		limited(t, a, client)
		release()
		if result := <-replay; result.err != nil {
			t.Fatal(result.err)
		}
		evicts(t, a, client, testRequest)
	})
}

func TestFinalRecords(t *testing.T) {
	const now = 1_000
	limit := int64(catalog.operations[sendOperation].maxAttempts)
	for _, tc := range []struct {
		name           string
		state          string
		classification string
		attempts       int64
		deadline       int64
		final          bool
	}{
		{"committed", "committed", "authorityReceipt", 1, now, true},
		{"accepted", "accepted", "authorityReceipt", 1, now, true},
		{"pending", "pending", "notSubmitted", 0, now, false},
		{"pending after its window", "pending", "notSubmitted", 0, now - 1, true},
		{"unknown with attempts left", "unknown", "TRANSPORT_UNKNOWN", limit - 1, now, false},
		{"unknown with its attempts spent", "unknown", "TRANSPORT_UNKNOWN", limit, now, true},
		{"unknown after its window", "unknown", "submitted", 1, now - 1, true},
		{"rejected for good", "rejected", "REVISION_CONFLICT", 1, now, true},
		{"rejected for now", "rejected", "RATE_LIMITED", limit - 1, now, false},
		{"in the wrong region", "rejected", "WRONG_REGION", 1, now, false},
		{"rejected with an undocumented code", "rejected", "NEWER_SERVICE_CODE", 1, now, false},
		{"rejected with its attempts spent", "rejected", "RATE_LIMITED", limit, now, true},
		{"rejected after its window", "rejected", "RATE_LIMITED", 1, now - 1, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			record := RecoveryRecord{
				Operation: sendOperation, ResolutionState: tc.state, LastAttemptClassification: tc.classification,
				AttemptCount: tc.attempts, RetryDeadline: tc.deadline,
			}
			if got := record.final(now); got != tc.final {
				t.Fatalf("final = %t, want %t", got, tc.final)
			}
		})
	}
}

func TestRetryableCodes(t *testing.T) {
	for code, want := range map[ErrorCode]bool{
		ErrorCodeRateLimited:      true,
		codeTransportUnknown:      true,
		ErrorCodeWrongRegion:      true,
		"NEWER_SERVICE_CODE":      true,
		ErrorCodeRevisionConflict: false,
		codeUnauthenticated:       false,
		codeRecoveryLimit:         false,
	} {
		if got := retryableCode(code); got != want {
			t.Errorf("retryableCode(%s) = %t, want %t", code, got, want)
		}
	}
}

func TestRejectedRecords(t *testing.T) {
	t.Run("a request rejected on every attempt is rejected", func(t *testing.T) {
		a := newAuthority(t, refusing(ErrorCodeRateLimited, 429))
		client := newProject(t, a)
		_, err := send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, ErrorCodeRateLimited, OutcomeRejected, 429)
		if record := onlyRecord(t, client); record.ResolutionState != "rejected" ||
			record.LastAttemptClassification != "RATE_LIMITED" || record.AttemptCount != 1 {
			t.Fatalf("record = %+v", record)
		}
		during := make(chan []RecoveryRecord, 1)
		a.setRespond(func(ex *exchange) response {
			records, _ := client.RecoveryRecords(context.Background())
			during <- records
			return response{body: success(ex.op, ex.requestID, sent(ex))}
		})
		if _, err := send(client, "hello", WithRequestID(testRequest)); err != nil {
			t.Fatal(err)
		}
		if records := <-during; len(records) != 1 || records[0].ResolutionState != "unknown" {
			t.Fatalf("records while sending again = %+v", records)
		}
		if record := onlyRecord(t, client); record.ResolutionState != "committed" || record.AttemptCount != 2 {
			t.Fatalf("record = %+v", record)
		}
	})
	t.Run("a rejection after an attempt that may have taken effect leaves the outcome unknown", func(t *testing.T) {
		a := newAuthority(t, dropping(sendOperation))
		client := newProject(t, a)
		_, err := send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
		a.setRespond(refusing(ErrorCodeRateLimited, 429))
		_, err = send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, ErrorCodeRateLimited, OutcomeRejected, 429)
		if record := onlyRecord(t, client); record.ResolutionState != "unknown" ||
			record.LastAttemptClassification != "RATE_LIMITED" || record.AttemptCount != 2 {
			t.Fatalf("record = %+v", record)
		}
	})
	t.Run("a rejection that can't be retried makes room", func(t *testing.T) {
		store := storing(t, journal(nil)[1:])
		a := newAuthority(t, refusing(ErrorCodeRevisionConflict, 409))
		_, err := send(newProject(t, a, WithRecoveryStore(store)), "hello", WithRequestID(testRequest))
		expectProblem(t, err, ErrorCodeRevisionConflict, OutcomeRejected, 409)
		// A restarted client reads the record back as rejected, and final.
		restarted := newProject(t, a, WithRecoveryStore(store))
		if records := recordsOf(t, restarted); records[len(records)-1].ResolutionState != "rejected" {
			t.Fatalf("records = %+v", records)
		}
		evicts(t, a, restarted, testRequest)
	})
	t.Run("a retryable rejection holds its place until its attempts are spent", func(t *testing.T) {
		a := newAuthority(t, refusing(ErrorCodeRateLimited, 429))
		client := newProject(t, a, WithRecoveryStore(storing(t, journal(nil)[1:])))
		limit := catalog.operations[sendOperation].maxAttempts
		for attempt := 1; attempt <= limit; attempt++ {
			_, err := send(client, "hello", WithRequestID(testRequest))
			expectProblem(t, err, ErrorCodeRateLimited, OutcomeRejected, 429)
			if attempt < limit {
				limited(t, a, client)
			}
		}
		evicts(t, a, client, testRequest)
	})
	t.Run("a retryable rejection holds its place until its window ends", func(t *testing.T) {
		clock := newTestClock()
		start := clock.Now()
		window := time.Duration(catalog.operations[sendOperation].windowMs) * time.Millisecond
		a := newAuthority(t, refusing(ErrorCodeRateLimited, 429))
		client := newProject(t, a, WithClock(clock.Now), WithRecoveryStore(storing(t, journal(nil)[1:])))
		_, err := send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, ErrorCodeRateLimited, OutcomeRejected, 429)
		clock.Set(start.Add(window))
		limited(t, a, client)
		clock.Set(start.Add(window + time.Millisecond))
		evicts(t, a, client, testRequest)
	})
}

func TestSpentBudgets(t *testing.T) {
	t.Run("an unanswered request makes room once its attempts are spent", func(t *testing.T) {
		a := newAuthority(t, dropping(sendOperation))
		client := newProject(t, a, WithRecoveryStore(storing(t, journal(nil)[1:])))
		limit := catalog.operations[sendOperation].maxAttempts
		for attempt := 1; attempt <= limit; attempt++ {
			_, err := send(client, "hello", WithRequestID(testRequest))
			expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
			if attempt < limit {
				limited(t, a, client)
			}
		}
		// The SDK won't send the request again, so its record is final though
		// its outcome is unknown.
		_, err := send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, codeResolutionRequired, OutcomeUnknown, 409)
		if n := a.count(sendOperation); n != limit {
			t.Fatalf("sent %d attempts, want %d", n, limit)
		}
		evicts(t, a, client, testRequest)
		// Forgotten, the request can still be resolved, but not retried.
		a.setRespond(resolving(constant("notObservedYet")))
		reply, err := client.ResolveRequest(context.Background(), ResolveRequestRequestInput{RequestID: testRequest})
		if err != nil || reply.Result == nil || reply.Result.State != "notObservedYet" {
			t.Fatalf("resolution = %+v, %v", reply, err)
		}
		_, err = client.Retry(context.Background(), testRequest)
		var p *Problem
		if err == nil || errors.As(err, &p) || !strings.Contains(err.Error(), "no recovery record") {
			t.Fatalf("error = %v, want the missing record error", err)
		}
		// Sent again under its ID, it is a new record with a new budget. The
		// authority deduplicates by request ID.
		if _, err := send(client, "hello", WithRequestID(testRequest)); err != nil {
			t.Fatal(err)
		}
		if n := a.count(sendOperation); n != limit+2 {
			t.Fatalf("sent %d requests, want %d", n, limit+2)
		}
		records := recordsOf(t, client)
		if last := records[len(records)-1]; len(records) != maxRecoveryRecords || last.RequestID != testRequest ||
			last.AttemptCount != 1 || last.ResolutionState != "committed" || slices.Contains(idsOf(t, client), testUUID) {
			t.Fatalf("records = %+v", records)
		}
	})
	t.Run("an unanswered request makes room once its window ends, not when the clock is set back", func(t *testing.T) {
		clock := newTestClock()
		start := clock.Now()
		window := time.Duration(catalog.operations[sendOperation].windowMs) * time.Millisecond
		a := newAuthority(t, dropping(sendOperation))
		client := newProject(t, a, WithClock(clock.Now), WithRecoveryStore(storing(t, journal(nil)[1:])))
		_, err := send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
		// A clock set back refuses a resend until it catches up, so it spends
		// nothing.
		clock.Set(start.Add(-time.Second))
		_, err = send(client, "hello", WithRequestID(testRequest))
		expectProblem(t, err, codeResolutionRequired, OutcomeUnknown, 409)
		limited(t, a, client)
		clock.Set(start.Add(window))
		limited(t, a, client)
		clock.Set(start.Add(window + time.Millisecond))
		evicts(t, a, client, testRequest)
	})
}

func TestManagementRetry(t *testing.T) {
	const issue, lookup = "management.issueBackendKey", "management.resolveRequest"
	a := newAuthority(t, dropping(issue))
	client, err := NewManagementClient(ManagementConfig{BaseURL: a.server.URL, AccessToken: "operator-token", ActorID: testActor})
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	input := IssueBackendKeyRequestInput{ProjectID: testProject, Name: "ci", Scopes: []string{"messagesRead"}, ExpiresAt: testTime}
	_, err = client.IssueBackendKey(ctx, input, WithRequestID(testRequest))
	expectProblem(t, err, codeTransportUnknown, OutcomeUnknown, 0)
	a.setRespond(func(ex *exchange) response {
		if ex.op.id != lookup {
			return response{}
		}
		state := "notObservedYet"
		if a.count(issue) > 1 {
			state = "committed"
		}
		lookedUp, _ := ex.input["requestId"].(string)
		return response{body: success(ex.op, ex.requestID, resolution(state, lookedUp))}
	})
	got, err := client.Retry(ctx, testRequest)
	if err != nil {
		t.Fatal(err)
	}
	if got.State != "committed" || got.RequestID != testRequest {
		t.Fatalf("resolution = %+v", got)
	}
	if ids := operationsOf(a); !slices.Equal(ids, []string{issue, lookup, issue, lookup}) {
		t.Fatalf("operations = %v", ids)
	}
	seen := a.requests()
	if seen[2].requestID != testRequest || !reflect.DeepEqual(seen[2].input, seen[0].input) {
		t.Fatalf("resend = %s %+v, want %s %+v", seen[2].requestID, seen[2].input, testRequest, seen[0].input)
	}
	for _, ex := range seen[1:] {
		if want := map[string]any{"requestId": ex.requestID}; !reflect.DeepEqual(ex.context, want) || ex.header.Get("Authorization") != "Bearer operator-token" {
			t.Fatalf("%s context %v, Authorization %q", ex.op.id, ex.context, ex.header.Get("Authorization"))
		}
	}
	records, err := client.RecoveryRecords(ctx)
	if err != nil || len(records) != 1 || records[0].AttemptCount != 2 || records[0].ResolutionState != "committed" {
		t.Fatalf("records = %+v, %v", records, err)
	}
}
