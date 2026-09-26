package convohop

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

const (
	testCallC = "88888888-8888-4888-8888-888888888888"
	testCallD = "99999999-9999-4999-8999-999999999999"
	testCallE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
)

func fixtureCall(id string) CallInfo {
	return CallInfo{
		ID: id, ProjectID: testProjectID, ThreadID: testThreadID, Mode: CallVideo,
		Owner: "ci_11111111111111111111111111111111", Title: "Call " + id[:8], Role: RoleViewer,
	}
}

func fixtureIncoming(id string, sequence int64) IncomingCall {
	return IncomingCall{
		Call: fixtureCall(id), Sequence: sequence,
		InvitedAt: time.Date(2026, 9, 25, 0, 0, 0, 0, time.UTC).Add(time.Duration(sequence) * time.Second),
	}
}

func fixtureCallEvent(kind CallEventType, id string, sequence int64, call *CallInfo) CallEvent {
	return CallEvent{
		Kind: kind, EventID: fmt.Sprintf("%08d-eeee-4eee-8eee-eeeeeeeeeeee", sequence),
		Sequence: sequence, CallID: id, IdentityID: "ci_22222222222222222222222222222222", Call: call,
		CreatedAt: time.Date(2026, 9, 25, 0, 0, 0, 0, time.UTC).Add(time.Duration(sequence) * time.Second),
	}
}

func TestSyncIncomingCallsReplaysFromFirstHighWater(t *testing.T) {
	a, b, c, d, e := fixtureCall(testMediaID), fixtureCall(testBroadcastID),
		fixtureCall(testCallC), fixtureCall(testCallD), fixtureCall(testCallE)
	var mu sync.Mutex
	var observed []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		after := strings.Trim(string(request.Variables["after"]), `"`)
		if string(request.Variables["limit"]) != "50" {
			t.Errorf("snapshot/replay did not request default 50: %+v", request.Variables)
		}
		kind := "incomingCalls"
		if strings.Contains(request.Query, "callEvents(") {
			kind = "callEvents"
		}
		mu.Lock()
		observed = append(observed, kind+":"+after)
		mu.Unlock()
		switch kind + ":" + after {
		case "incomingCalls:0":
			respondGraphQL(t, w, kind, IncomingCallsPage{
				Items:     []IncomingCall{fixtureIncoming(a.ID, 2), fixtureIncoming(b.ID, 5)},
				NextAfter: 5, HasMore: true, Cursor: 10,
			})
		case "incomingCalls:5":
			respondGraphQL(t, w, kind, IncomingCallsPage{
				Items:     []IncomingCall{fixtureIncoming(c.ID, 12), fixtureIncoming(d.ID, 13)},
				NextAfter: 13, HasMore: false, Cursor: 20,
			})
		case "callEvents:10":
			respondGraphQL(t, w, kind, CallEventPage{
				Items: []CallEvent{
					fixtureCallEvent(CallAccepted, a.ID, 11, &a),
					fixtureCallEvent(CallRinging, c.ID, 12, &c),
					fixtureCallEvent(CallRinging, d.ID, 13, &d),
				}, NextAfter: 14, HasMore: true,
			})
		case "callEvents:14":
			respondGraphQL(t, w, kind, CallEventPage{
				Items: []CallEvent{
					fixtureCallEvent(CallRevoked, b.ID, 21, nil),
					fixtureCallEvent(CallDeclined, c.ID, 22, nil),
					fixtureCallEvent(CallRinging, e.ID, 23, &e),
				}, NextAfter: 25, HasMore: false,
			})
		default:
			t.Errorf("unexpected call GraphQL request %s:%s", kind, after)
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	state, err := client.SyncIncomingCalls(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if state.SnapshotCursor != 10 || state.NextAfter != 25 ||
		len(state.Items) != 2 || state.Items[0].Call.ID != d.ID ||
		state.Items[0].Sequence != 13 || state.Items[1].Call.ID != e.ID ||
		state.Items[1].Sequence != 23 || state.Items[1].Call.ThreadID != testThreadID {
		t.Fatalf("overlap reconciliation: %+v", state)
	}
	mu.Lock()
	defer mu.Unlock()
	want := []string{"incomingCalls:0", "incomingCalls:5", "callEvents:10", "callEvents:14"}
	if !reflect.DeepEqual(observed, want) {
		t.Errorf("must replay from FIRST high-water: got %v, want %v", observed, want)
	}
}

func TestConsumeCallEventsSparseSequencesAcknowledgesCallbacks(t *testing.T) {
	a, b := fixtureCall(testMediaID), fixtureCall(testBroadcastID)
	var mu sync.Mutex
	var observed []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if !strings.Contains(request.Query, "callEvents(") || !strings.Contains(request.Query, "threadId mode") {
			t.Errorf("wrong call-event selection: %s", request.Query)
		}
		after := strings.Trim(string(request.Variables["after"]), `"`)
		mu.Lock()
		observed = append(observed, after)
		mu.Unlock()
		switch after {
		case "5":
			respondGraphQL(t, w, "callEvents", CallEventPage{
				Items: []CallEvent{
					fixtureCallEvent(CallRinging, a.ID, 8, &a),
					fixtureCallEvent(CallDeclined, a.ID, 14, nil),
				}, NextAfter: 19, HasMore: true,
			})
		case "8":
			respondGraphQL(t, w, "callEvents", CallEventPage{
				Items:     []CallEvent{fixtureCallEvent(CallDeclined, a.ID, 14, nil)},
				NextAfter: 19, HasMore: true,
			})
		case "19":
			respondGraphQL(t, w, "callEvents", CallEventPage{
				Items: []CallEvent{}, NextAfter: 25, HasMore: true,
			})
		case "25":
			respondGraphQL(t, w, "callEvents", CallEventPage{
				Items:     []CallEvent{fixtureCallEvent(CallRinging, b.ID, 31, &b)},
				NextAfter: 34, HasMore: false,
			})
		default:
			t.Errorf("unexpected call-event cursor: %s", after)
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	var received []int64
	failure := errors.New("persist failed")
	cursor, err := client.ConsumeCallEvents(context.Background(), ConsumeCallEventsOptions{After: 5},
		func(_ context.Context, event CallEvent) error {
			received = append(received, event.Sequence)
			if event.Sequence == 14 {
				return failure
			}
			return nil
		})
	if cursor != 8 || !errors.Is(err, failure) {
		t.Fatalf("failed callback must retain sparse cursor 8: %d, %v", cursor, err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	cursor, err = client.ConsumeCallEvents(ctx, ConsumeCallEventsOptions{After: cursor},
		func(_ context.Context, event CallEvent) error {
			received = append(received, event.Sequence)
			if event.Sequence == 31 {
				cancel()
			}
			return nil
		})
	if cursor != 34 || !errors.Is(err, context.Canceled) {
		t.Fatalf("caught-up high-water cursor: %d, %v", cursor, err)
	}
	if !reflect.DeepEqual(received, []int64{8, 14, 14, 31}) {
		t.Errorf("callback order/retry: %v", received)
	}
	mu.Lock()
	defer mu.Unlock()
	if !reflect.DeepEqual(observed, []string{"5", "8", "19", "25"}) {
		t.Errorf("hasMore must fetch immediately even after empty pages: %v", observed)
	}
}

func TestCallPageValidationAndPrecision(t *testing.T) {
	const big = int64(9007199254740993)
	incoming := fixtureIncoming(testMediaID, big)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if got := string(request.Variables["after"]); got != `"9007199254740992"` {
			t.Errorf("lost precision in call cursor: %s", got)
		}
		respondGraphQL(t, w, "incomingCalls", IncomingCallsPage{
			Items: []IncomingCall{incoming}, NextAfter: big, Cursor: big - 1,
		})
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	page, err := client.ListIncomingCalls(context.Background(), PageOptions{After: big - 1})
	if err != nil || page.Cursor != big-1 || page.Items[0].Sequence != big ||
		page.Items[0].Call.Mode != CallVideo || page.Items[0].Call.ThreadID != testThreadID {
		t.Fatalf("large call cursor and typed call: %+v, %v", page, err)
	}

	invalid := fixtureIncoming(testMediaID, 1)
	invalid.Call.Mode = "screen"
	for name, payload := range map[string]any{
		"missing items":      map[string]any{"nextAfter": "0", "hasMore": false, "cursor": "0"},
		"missing high-water": map[string]any{"items": []any{}, "nextAfter": "0", "hasMore": false},
		"missing hasMore":    map[string]any{"items": []any{}, "nextAfter": "0", "cursor": "0"},
		"numeric cursor":     map[string]any{"items": []any{}, "nextAfter": 0, "hasMore": false, "cursor": "0"},
		"stalled hasMore":    IncomingCallsPage{Items: []IncomingCall{}, NextAfter: 0, HasMore: true},
		"backward cursor":    IncomingCallsPage{Items: []IncomingCall{}, NextAfter: -1},
		"unknown mode":       IncomingCallsPage{Items: []IncomingCall{invalid}, NextAfter: 1, Cursor: 1},
		"missing invitation": IncomingCallsPage{Items: []IncomingCall{{Call: incoming.Call, Sequence: 1}}, NextAfter: 1, Cursor: 1},
	} {
		t.Run(name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				respondGraphQL(t, w, "incomingCalls", payload)
			}))
			defer server.Close()
			client, err := NewUserClient(server.URL, testSessionToken)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := client.ListIncomingCalls(context.Background(), PageOptions{}); err == nil {
				t.Error("accepted invalid incoming-call page")
			}
		})
	}
}

func TestCallEventValidationAndNullableCall(t *testing.T) {
	valid := fixtureCallEvent(CallDeclined, testMediaID, 7, nil)
	revoked := fixtureCallEvent(CallRevoked, testMediaID, 8, nil)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		respondGraphQL(t, w, "callEvents", CallEventPage{
			Items: []CallEvent{valid, revoked}, NextAfter: 9, HasMore: false,
		})
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	page, err := client.ListCallEvents(context.Background(), PageOptions{After: 5})
	if err != nil || len(page.Items) != 2 || page.Items[0].Call != nil ||
		page.Items[1].Call != nil || page.NextAfter != 9 {
		t.Fatalf("null call and sparse high-water: %+v, %v", page, err)
	}

	ringing := fixtureCallEvent(CallRinging, testMediaID, 1, nil)
	unknown := fixtureCallEvent("call.unknown", testMediaID, 1, nil)
	wrongID := fixtureCall(testBroadcastID)
	mismatch := fixtureCallEvent(CallAccepted, testMediaID, 1, &wrongID)
	correct := fixtureCall(testMediaID)
	backward := fixtureCallEvent(CallEnded, testMediaID, 3, &correct)
	missingCall := map[string]any{
		"kind": "call.revoked", "eventId": valid.EventID, "sequence": "1",
		"callId": testMediaID, "identityId": "ci_22222222222222222222222222222222", "createdAt": valid.CreatedAt,
	}
	for name, payload := range map[string]any{
		"missing hasMore": map[string]any{"items": []any{}, "nextAfter": "0"},
		"missing items":   map[string]any{"nextAfter": "0", "hasMore": false},
		"stalled hasMore": CallEventPage{Items: []CallEvent{}, NextAfter: 0, HasMore: true},
		"missing call":    map[string]any{"items": []any{missingCall}, "nextAfter": "1", "hasMore": false},
		"null ringing":    CallEventPage{Items: []CallEvent{ringing}, NextAfter: 1},
		"unknown kind":    CallEventPage{Items: []CallEvent{unknown}, NextAfter: 1},
		"mismatched ID":   CallEventPage{Items: []CallEvent{mismatch}, NextAfter: 1},
		"backward page":   CallEventPage{Items: []CallEvent{backward}, NextAfter: 2},
		"duplicate": CallEventPage{Items: []CallEvent{
			fixtureCallEvent(CallDeclined, testMediaID, 1, nil),
			fixtureCallEvent(CallRevoked, testMediaID, 1, nil),
		}, NextAfter: 1},
	} {
		t.Run(name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				respondGraphQL(t, w, "callEvents", payload)
			}))
			defer server.Close()
			client, err := NewUserClient(server.URL, testSessionToken)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := client.ListCallEvents(context.Background(), PageOptions{}); err == nil {
				t.Error("accepted malformed call-event page")
			}
		})
	}
}

func TestCallEventDecimalStringsPreserveI64Precision(t *testing.T) {
	const big = int64(9007199254740993)
	call := fixtureCall(testMediaID)
	event := fixtureCallEvent(CallRinging, call.ID, big, &call)
	event.EventID = testClientID
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if got := string(request.Variables["after"]); got != `"9007199254740992"` {
			t.Errorf("lost precision in call-event request cursor: %s", got)
		}
		respondGraphQL(t, w, "callEvents", CallEventPage{
			Items: []CallEvent{event}, NextAfter: big + 2,
		})
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	page, err := client.ListCallEvents(context.Background(), PageOptions{After: big - 1})
	if err != nil || page.Items[0].Sequence != big || page.NextAfter != big+2 {
		t.Fatalf("call-event i64 sequence/cursor: %+v, %v", page, err)
	}
}

func TestDeclineCallAndAuthorization(t *testing.T) {
	var count atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if !strings.Contains(request.Query, "declineCall(id:$id)") {
			t.Errorf("wrong decline operation: %s", request.Query)
		}
		assertVariables(t, request, `{"id":"`+testMediaID+`"}`)
		if count.Add(1) <= 2 {
			respondGraphQL(t, w, "declineCall", true)
			return
		}
		respondGraphQLError(t, w, "FORBIDDEN", "operation is not permitted")
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := client.DeclineCall(context.Background(), testMediaID); err != nil {
			t.Fatal(err)
		}
	}
	if err := client.DeclineCall(context.Background(), "../wrong"); err == nil || count.Load() != 2 {
		t.Errorf("invalid call ID was sent to server: %v", err)
	}
	var apiErr *APIError
	if err := client.DeclineCall(context.Background(), testMediaID); !errors.As(err, &apiErr) ||
		apiErr.StatusCode != http.StatusOK || apiErr.Code != "FORBIDDEN" {
		t.Errorf("decline authorization: %v", err)
	}
}

func TestCallEventAuthenticationAndConsumerValidation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		readGraphQLRequest(t, r, testSessionToken)
		respondJSON(t, w, http.StatusUnauthorized, map[string]any{
			"error": map[string]string{"code": "unauthenticated", "message": "authentication required"},
		})
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	var apiErr *APIError
	if _, err := client.ListIncomingCalls(context.Background(), PageOptions{}); !errors.As(err, &apiErr) ||
		apiErr.StatusCode != http.StatusUnauthorized {
		t.Errorf("incoming authorization: %v", err)
	}
	if _, err := client.ListCallEvents(context.Background(), PageOptions{}); !errors.As(err, &apiErr) ||
		apiErr.StatusCode != http.StatusUnauthorized {
		t.Errorf("event authorization: %v", err)
	}
	cursor, err := client.ConsumeCallEvents(context.Background(), ConsumeCallEventsOptions{After: 42},
		func(context.Context, CallEvent) error { t.Error("delivered unauthorized event"); return nil })
	if cursor != 42 || !errors.As(err, &apiErr) || apiErr.StatusCode != http.StatusUnauthorized {
		t.Errorf("consume authorization/cursor: %d, %v", cursor, err)
	}
	for _, options := range []ConsumeCallEventsOptions{
		{After: -1}, {PollInterval: -time.Second}, {Limit: 101},
	} {
		if _, err := client.ConsumeCallEvents(context.Background(), options,
			func(context.Context, CallEvent) error { return nil }); err == nil {
			t.Errorf("accepted invalid options %+v", options)
		}
	}
	if _, err := client.ConsumeCallEvents(context.Background(), ConsumeCallEventsOptions{}, nil); err == nil {
		t.Error("accepted nil event handler")
	}
}

func TestSyncIncomingCallsUsesEmptySnapshotHighWater(t *testing.T) {
	call := fixtureCall(testCallE)
	var observed []string
	var mu sync.Mutex
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		after := strings.Trim(string(request.Variables["after"]), `"`)
		if strings.Contains(request.Query, "incomingCalls(") {
			mu.Lock()
			observed = append(observed, "incoming:"+after)
			mu.Unlock()
			respondGraphQL(t, w, "incomingCalls", IncomingCallsPage{
				Items: []IncomingCall{}, NextAfter: 0, Cursor: 40, HasMore: false,
			})
			return
		}
		mu.Lock()
		observed = append(observed, "events:"+after)
		mu.Unlock()
		respondGraphQL(t, w, "callEvents", CallEventPage{
			Items:     []CallEvent{fixtureCallEvent(CallRinging, call.ID, 45, &call)},
			NextAfter: 47, HasMore: false,
		})
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	result, err := client.SyncIncomingCalls(context.Background())
	if err != nil || len(result.Items) != 1 || result.Items[0].Call.ID != call.ID ||
		result.SnapshotCursor != 40 || result.NextAfter != 47 {
		t.Fatalf("empty snapshot replay: %+v, %v", result, err)
	}
	mu.Lock()
	defer mu.Unlock()
	if !reflect.DeepEqual(observed, []string{"incoming:0", "events:40"}) {
		t.Errorf("did not replay from empty snapshot high-water: %v", observed)
	}
}
