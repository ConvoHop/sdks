package convohop

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"maps"
	"net/http"
	"net/http/httptest"
	"slices"
	"sync"
	"testing"
	"time"
)

const (
	testProject      = "11111111-1111-4111-8111-111111111111"
	testConversation = "22222222-2222-4222-8222-222222222222"
	testIncarnation  = "33333333-3333-4333-8333-333333333333"
	testUUID         = "44444444-4444-4444-8444-444444444444"
	testRequest      = "55555555-5555-4555-8555-555555555555"
	testActor        = "66666666-6666-4666-8666-666666666666"
	upperUUID        = "ABCDEF01-2345-4678-89AB-CDEF01234567"
	testKey          = "backend-key-for-tests"
	testTime         = "2026-01-02T03:04:05.678Z"
)

var operationNames = func() map[string]*operation {
	byName := make(map[string]*operation, len(catalog.operations))
	for _, op := range catalog.operations {
		byName[op.operationName] = op
	}
	return byName
}()

// exchange is one request the test authority received.
type exchange struct {
	ctx       context.Context
	op        *operation
	method    string
	path      string
	header    http.Header
	context   map[string]any
	input     map[string]any
	hasInput  bool
	requestID string
}

// response is the test authority's answer. A zero status is 200, and a nil
// body is the [answer] to the request.
type response struct {
	status int
	header http.Header
	body   any
	drop   bool
}

// authority is an httptest GraphQL authority that records every request.
type authority struct {
	t       testing.TB
	server  *httptest.Server
	mu      sync.Mutex
	seen    []*exchange
	respond func(*exchange) response
}

func newAuthority(t testing.TB, respond func(*exchange) response) *authority {
	a := &authority{t: t, respond: respond}
	a.server = httptest.NewServer(http.HandlerFunc(a.serve))
	t.Cleanup(a.server.Close)
	return a
}

func (a *authority) setRespond(respond func(*exchange) response) {
	a.mu.Lock()
	a.respond = respond
	a.mu.Unlock()
}

func (a *authority) requests() []*exchange {
	a.mu.Lock()
	defer a.mu.Unlock()
	return slices.Clone(a.seen)
}

func (a *authority) count(id string) int {
	n := 0
	for _, ex := range a.requests() {
		if ex.op.id == id {
			n++
		}
	}
	return n
}

func (a *authority) serve(w http.ResponseWriter, r *http.Request) {
	data, err := io.ReadAll(r.Body)
	if err != nil {
		a.t.Errorf("read request: %v", err)
		return
	}
	decoded, err := decodeJSON(data)
	if err != nil {
		a.t.Errorf("request body is not JSON: %v", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if encoded, err := canonical(decoded); err != nil || encoded != string(data) {
		a.t.Errorf("request body is not canonical: %s", data)
	}
	body, _ := decoded.(map[string]any)
	name, _ := body["operationName"].(string)
	op := operationNames[name]
	if op == nil || body["query"] != op.document {
		a.t.Errorf("unknown operation %q or document", name)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	variables, _ := body["variables"].(map[string]any)
	scope, _ := variables["context"].(map[string]any)
	input, hasInput := variables["input"].(map[string]any)
	requestID, _ := scope["requestId"].(string)
	ex := &exchange{
		ctx: r.Context(), op: op, method: r.Method, path: r.URL.Path, header: r.Header.Clone(),
		context: scope, input: input, hasInput: hasInput, requestID: requestID,
	}
	a.mu.Lock()
	a.seen = append(a.seen, ex)
	respond := a.respond
	a.mu.Unlock()
	var out response
	if respond != nil {
		out = respond(ex)
	}
	if out.drop {
		if conn, _, err := w.(http.Hijacker).Hijack(); err == nil {
			conn.Close()
		}
		return
	}
	if out.body == nil {
		out.body = answer(ex)
	}
	var payload []byte
	switch b := out.body.(type) {
	case string:
		payload = []byte(b)
	case []byte:
		payload = b
	default:
		if payload, err = json.Marshal(b); err != nil {
			a.t.Errorf("encode response: %v", err)
		}
	}
	for key, values := range out.header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	if w.Header().Get("Content-Type") == "" {
		w.Header().Set("Content-Type", "application/json")
	}
	if out.status == 0 {
		out.status = http.StatusOK
	}
	w.WriteHeader(out.status)
	_, _ = w.Write(payload)
}

// dropping closes the connection of every request for the operation id.
func dropping(id string) func(*exchange) response {
	return func(ex *exchange) response {
		return response{drop: ex.op.id == id}
	}
}

// replying answers requests for the operation id with result.
func replying(id string, result func(*exchange) any) func(*exchange) response {
	return func(ex *exchange) response {
		if ex.op.id != id {
			return response{}
		}
		return response{body: success(ex.op, ex.requestID, result(ex))}
	}
}

// success is a successful reply of op to requestID carrying result. A nil
// result leaves the reply's result null.
func success(op *operation, requestID string, result any) map[string]any {
	name, _ := unwrapType(op.result)
	reply := placeholder(name).(map[string]any)
	set := func(key string, value any) {
		if _, ok := reply[key]; ok {
			reply[key] = value
		}
	}
	set("requestId", requestID)
	if op.kind == "mutation" {
		set("status", "committed")
		set("receiptId", testUUID)
		set("committedAt", testTime)
		set("replayed", false)
	} else {
		set("status", "ok")
	}
	if result != nil {
		set("result", result)
	}
	return map[string]any{"data": map[string]any{op.field: reply}}
}

// answer is a successful reply to ex. When the operation requires a result,
// it carries a placeholder result that echoes the request's ID fields.
func answer(ex *exchange) map[string]any {
	if !ex.op.requireResult {
		return success(ex.op, ex.requestID, nil)
	}
	result := validResult(ex.op)
	if record, ok := result.(map[string]any); ok {
		for _, name := range ex.op.echo {
			if value, ok := ex.input[name]; ok {
				if _, declared := record[name]; declared {
					record[name] = value
				}
			}
		}
	}
	return success(ex.op, ex.requestID, result)
}

// validResult is a placeholder of the result in op's reply envelope.
func validResult(op *operation) any {
	name, _ := unwrapType(op.result)
	for _, field := range catalog.objects[name] {
		if field.name == "result" {
			inner, _ := unwrapType(field.typ)
			return placeholder(inner)
		}
	}
	panic(op.id + " has no result")
}

// sendInput is a sendMessage input for the test conversation.
func sendInput(text string) SendMessageRequestInput {
	return SendMessageRequestInput{ConversationID: testConversation, Text: text}
}

// sent is a valid send receipt for a sendMessage exchange.
func sent(ex *exchange) any {
	conversation := ex.input["conversationId"]
	return object("MessageAck", map[string]any{
		"conversationId": conversation, "sequence": "7", "status": "sent",
		"cursor": map[string]any{"incarnation": testIncarnation, "conversationId": conversation, "sequence": "7"},
	})
}

// resolution is a request resolution of id in state.
func resolution(state, id string) map[string]any {
	value := object("RequestResolution", map[string]any{"state": state, "requestId": id, "checkedAt": testTime})
	if state == "committed" {
		value["receipt"] = object("ResolvedReceipt", map[string]any{
			"status": "committed", "requestId": id, "receiptId": testUUID, "committedAt": testTime, "replayed": false,
		})
	}
	return value
}

// testClock is a settable clock for WithClock.
type testClock struct {
	mu  sync.Mutex
	now time.Time
}

func newTestClock() *testClock {
	return &testClock{now: time.UnixMilli(1_800_000_000_000)}
}

func (c *testClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *testClock) Set(now time.Time) {
	c.mu.Lock()
	c.now = now
	c.mu.Unlock()
}

// replyOf returns the operation reply inside a success body.
func replyOf(body map[string]any) map[string]any {
	for _, reply := range body["data"].(map[string]any) {
		return reply.(map[string]any)
	}
	return nil
}

// synthesize returns a valid value of a GraphQL output type reference:
// required values are placeholders and nullable values are null.
func synthesize(typ string) any {
	inner, required := unwrapType(typ)
	if !required {
		return nil
	}
	return placeholder(inner)
}

// placeholder returns a valid value of a named or list GraphQL output type.
func placeholder(inner string) any {
	if _, ok := listItem(inner); ok {
		return []any{}
	}
	if fields, ok := catalog.objects[inner]; ok {
		record := make(map[string]any, len(fields))
		for _, field := range fields {
			record[field.name] = synthesize(field.typ)
		}
		return record
	}
	if values, ok := catalog.enums[inner]; ok {
		return slices.Sorted(maps.Keys(values))[0]
	}
	switch catalog.scalars[inner].representation {
	case "boolean":
		return false
	case "integer", "number":
		return json.Number("1")
	case "object":
		return map[string]any{}
	}
	switch inner {
	case "UUID":
		return testUUID
	case "Decimal":
		return "1"
	}
	return testTime
}

// object returns a placeholder of the GraphQL object type name with fields
// replaced.
func object(name string, fields map[string]any) map[string]any {
	record := placeholder(name).(map[string]any)
	for key, value := range fields {
		if _, ok := record[key]; !ok {
			panic("unknown field " + name + "." + key)
		}
		record[key] = value
	}
	return record
}

func newProject(t testing.TB, a *authority, options ...Option) *ProjectClient {
	t.Helper()
	client, err := NewProjectClient(ProjectConfig{
		BaseURL: a.server.URL, ProjectID: testProject, Incarnation: testIncarnation, BackendKey: testKey,
	}, options...)
	if err != nil {
		t.Fatal(err)
	}
	return client
}

// expectProblem requires err to be a [*Problem] with the given code, outcome
// and status.
func expectProblem(t testing.TB, err error, code ErrorCode, outcome Outcome, status int) *Problem {
	t.Helper()
	var p *Problem
	if !errors.As(err, &p) {
		t.Fatalf("error %v (%T) is not a *Problem", err, err)
	}
	if p.Code != code || p.Outcome != outcome || p.Status != status {
		t.Fatalf("problem %s %s %d (%q), want %s %s %d", p.Code, p.Outcome, p.Status, p.Message, code, outcome, status)
	}
	return p
}

// doneWatch is a context that reports when a call first waits on it.
type doneWatch struct {
	context.Context
	once    sync.Once
	waiting chan struct{}
}

func newDoneWatch() *doneWatch {
	return &doneWatch{Context: context.Background(), waiting: make(chan struct{})}
}

func (c *doneWatch) Done() <-chan struct{} {
	c.once.Do(func() { close(c.waiting) })
	return c.Context.Done()
}
