package threadwave

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func fixtureMessage(sequence int64) Message {
	return Message{
		ID:              fmt.Sprintf("%08d-3333-4333-8333-333333333333", sequence),
		ThreadID:        testThreadID,
		Sequence:        sequence,
		Sender:          "ci_11111111111111111111111111111111",
		ClientMessageID: fmt.Sprintf("%08d-4444-4444-8444-444444444444", sequence),
		Body:            fmt.Sprintf("message-%d", sequence),
		Props:           map[string]any{},
		CreatedAt:       time.Date(2026, 9, 25, 0, 0, 0, 0, time.UTC),
	}
}

func fixtureThreadEvent(sequence int64, kind string, message *Message) ThreadEvent {
	return ThreadEvent{
		EventID:   fmt.Sprintf("%08d-eeee-4eee-8eee-eeeeeeeeeeee", sequence),
		ThreadID:  testThreadID,
		Sequence:  sequence,
		Kind:      kind,
		Actor:     "ci_11111111111111111111111111111111",
		Message:   message,
		CreatedAt: time.Date(2026, 9, 25, 0, 0, 0, 0, time.UTC),
	}
}

func TestThreadLifecycleAndMembershipUseGraphQL(t *testing.T) {
	var calls atomic.Int32
	thread := fixtureThread(testThreadID)
	thread.HistoryAfterLeave = HistoryPreviouslyVisible
	joined := int64(6)
	member := ThreadMember{
		MembershipID: testClientID, IdentityID: "ci_22222222222222222222222222222222", Role: ThreadRoleModerator, State: MemberInvited,
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		request := readGraphQLRequest(t, r, testSessionToken)
		switch {
		case strings.Contains(request.Query, "createThread("):
			assertVariables(t, request, `{"title":"Team","members":["ci_22222222222222222222222222222222"],"historyAfterLeave":"previously_visible"}`)
			respondGraphQL(t, w, "createThread", thread)
		case strings.Contains(request.Query, "thread(id:"):
			assertVariables(t, request, `{"id":"`+testThreadID+`"}`)
			respondGraphQL(t, w, "thread", thread)
		case strings.Contains(request.Query, "threads(after:"):
			if _, hasAfter := request.Variables["after"]; !hasAfter {
				assertVariables(t, request, `{"limit":1}`)
				respondGraphQL(t, w, "threads", ThreadPage{
					Items: []Thread{thread}, NextAfter: &thread.ID,
				})
			} else {
				assertVariables(t, request, `{"after":"`+testThreadID+`","limit":50}`)
				respondGraphQL(t, w, "threads", ThreadPage{
					Items: []Thread{}, NextAfter: &thread.ID,
				})
			}
		case strings.Contains(request.Query, "threadInvitations("):
			assertVariables(t, request, `{"limit":50}`)
			respondGraphQL(t, w, "threadInvitations", []Thread{thread})
		case strings.Contains(request.Query, "threadMembers("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`"}`)
			respondGraphQL(t, w, "threadMembers", []ThreadMember{member})
		case strings.Contains(request.Query, "inviteThreadMember("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`","identityId":"ci_22222222222222222222222222222222","role":"moderator"}`)
			respondGraphQL(t, w, "inviteThreadMember", member)
		case strings.Contains(request.Query, "acceptThreadInvitation("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`"}`)
			active := member
			active.State = MemberActive
			active.JoinedSequence = &joined
			respondGraphQL(t, w, "acceptThreadInvitation", active)
		case strings.Contains(request.Query, "leaveThread("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`"}`)
			respondGraphQL(t, w, "leaveThread", true)
		case strings.Contains(request.Query, "removeThreadMember("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`","identityId":"ci_22222222222222222222222222222222"}`)
			respondGraphQL(t, w, "removeThreadMember", true)
		case strings.Contains(request.Query, "changeThreadRole("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`","identityId":"ci_22222222222222222222222222222222","role":"viewer"}`)
			changed := member
			changed.Role = ThreadRoleViewer
			respondGraphQL(t, w, "changeThreadRole", changed)
		case strings.Contains(request.Query, "transferThreadOwner("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`","identityId":"ci_22222222222222222222222222222222"}`)
			changed := thread
			changed.Owner = "ci_22222222222222222222222222222222"
			respondGraphQL(t, w, "transferThreadOwner", changed)
		case strings.Contains(request.Query, "archiveThread("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`"}`)
			changed := thread
			changed.State = ThreadArchived
			respondGraphQL(t, w, "archiveThread", changed)
		case strings.Contains(request.Query, "reopenThread("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+`"}`)
			respondGraphQL(t, w, "reopenThread", thread)
		default:
			t.Errorf("unexpected GraphQL operation: %s", request.Query)
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	created, err := client.CreateThread(ctx, CreateThreadRequest{
		Title: "Team", Members: []string{"ci_22222222222222222222222222222222"}, HistoryAfterLeave: HistoryPreviouslyVisible,
	})
	if err != nil || created.HistoryAfterLeave != HistoryPreviouslyVisible {
		t.Fatalf("create thread: %+v, %v", created, err)
	}
	if fetched, err := client.GetThread(ctx, thread.ID); err != nil || fetched.ID != thread.ID {
		t.Fatalf("get thread: %+v, %v", fetched, err)
	}
	page, err := client.ListThreads(ctx, ListThreadsOptions{Limit: 1})
	if err != nil || len(page.Items) != 1 || *page.NextAfter != thread.ID {
		t.Fatalf("thread page: %+v, %v", page, err)
	}
	empty, err := client.ListThreads(ctx, ListThreadsOptions{After: *page.NextAfter})
	if err != nil || len(empty.Items) != 0 || *empty.NextAfter != thread.ID {
		t.Fatalf("empty thread page: %+v, %v", empty, err)
	}
	invitations, err := client.ListThreadInvitations(ctx, 0)
	if err != nil || len(invitations) != 1 || invitations[0].ID != thread.ID {
		t.Fatalf("thread invitations: %+v, %v", invitations, err)
	}
	members, err := client.ListThreadMembers(ctx, thread.ID)
	if err != nil || len(members) != 1 || members[0].State != MemberInvited ||
		members[0].JoinedSequence != nil {
		t.Fatalf("thread members: %+v, %v", members, err)
	}
	invited, err := client.InviteThreadMember(ctx, thread.ID, InviteThreadMemberRequest{
		IdentityID: "ci_22222222222222222222222222222222", Role: ThreadRoleModerator,
	})
	if err != nil || invited.Role != ThreadRoleModerator {
		t.Fatalf("invite: %+v, %v", invited, err)
	}
	accepted, err := client.AcceptThreadInvitation(ctx, thread.ID)
	if err != nil || accepted.State != MemberActive || *accepted.JoinedSequence != joined {
		t.Fatalf("accept: %+v, %v", accepted, err)
	}
	changed, err := client.ChangeThreadRole(ctx, thread.ID, "ci_22222222222222222222222222222222", ThreadRoleViewer)
	if err != nil || changed.Role != ThreadRoleViewer {
		t.Fatalf("change role: %+v, %v", changed, err)
	}
	transferred, err := client.TransferThreadOwner(ctx, thread.ID, "ci_22222222222222222222222222222222")
	if err != nil || transferred.Owner != "ci_22222222222222222222222222222222" {
		t.Fatalf("transfer owner: %+v, %v", transferred, err)
	}
	if err := client.LeaveThread(ctx, thread.ID); err != nil {
		t.Fatal(err)
	}
	if err := client.RemoveThreadMember(ctx, thread.ID, "ci_22222222222222222222222222222222"); err != nil {
		t.Fatal(err)
	}
	archived, err := client.ArchiveThread(ctx, thread.ID)
	if err != nil || archived.State != ThreadArchived {
		t.Fatalf("archive: %+v, %v", archived, err)
	}
	reopened, err := client.ReopenThread(ctx, thread.ID)
	if err != nil || reopened.State != ThreadActive {
		t.Fatalf("reopen: %+v, %v", reopened, err)
	}
	before := calls.Load()
	for _, invalid := range []func() error{
		func() error {
			_, err := client.CreateThread(ctx, CreateThreadRequest{Title: "Team", HistoryOnJoin: "all"})
			return err
		},
		func() error {
			_, err := client.InviteThreadMember(ctx, thread.ID, InviteThreadMemberRequest{IdentityID: "ci_22222222222222222222222222222222", Role: ThreadRoleOwner})
			return err
		},
		func() error {
			_, err := client.ChangeThreadRole(ctx, thread.ID, "ci_22222222222222222222222222222222", ThreadRoleOwner)
			return err
		},
		func() error {
			_, err := client.ListThreads(ctx, ListThreadsOptions{Limit: 101})
			return err
		},
		func() error { return client.RemoveThreadMember(ctx, thread.ID, "../bob") },
	} {
		if err := invalid(); err == nil {
			t.Error("accepted invalid local input")
		}
	}
	if calls.Load() != before {
		t.Error("sent invalid thread request")
	}
}

func TestMessagePropsIdempotencyAndDecimalStringCursors(t *testing.T) {
	const big = int64(9007199254740993) // Beyond the exact range of a float64.
	message := fixtureMessage(big)
	message.ID = testMessageID
	message.ClientMessageID = testClientID
	message.Body = "hello"
	message.Props = map[string]any{"ticket": map[string]any{"number": json.Number("9007199254740993")}, "tags": []any{"chat"}}
	var sends, calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		request := readGraphQLRequest(t, r, testSessionToken)
		switch {
		case strings.Contains(request.Query, "sendMessage("):
			assertVariables(t, request, `{"threadId":"`+testThreadID+
				`","clientMessageId":"`+testClientID+
				`","body":"hello","props":{"ticket":{"number":9007199254740993},"tags":["chat"]}}`)
			if strings.Contains(string(request.Variables["props"]), "9007199254740992") {
				t.Error("lost precision encoding JSON props")
			}
			if sends.Add(1) == 3 {
				respondGraphQLError(t, w, "CONFLICT", "client message ID reused with different props")
			} else {
				respondGraphQL(t, w, "sendMessage", message)
			}
		case strings.Contains(request.Query, "threadMessages("):
			if got := string(request.Variables["after"]); got != `"9007199254740992"` &&
				got != `"9007199254740993"` {
				t.Errorf("sequence cursor must be an exact decimal string, got %s", got)
			}
			after := strings.Trim(string(request.Variables["after"]), `"`)
			if after == "9007199254740992" {
				respondGraphQL(t, w, "threadMessages", MessagePage{
					Items: []Message{message}, NextAfter: big, Cursor: big + 2,
				})
			} else {
				respondGraphQL(t, w, "threadMessages", MessagePage{
					Items: []Message{}, NextAfter: big, Cursor: big + 2,
				})
			}
		default:
			t.Errorf("unexpected GraphQL operation: %s", request.Query)
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	input := SendMessageRequest{ClientMessageID: testClientID, Body: "hello", Props: message.Props}
	for range 2 {
		sent, err := client.SendMessage(ctx, testThreadID, input)
		if err != nil || sent.Sequence != big ||
			sent.Props["ticket"].(map[string]any)["number"] != json.Number("9007199254740993") {
			t.Fatalf("idempotent JSON props/sequence: %+v, %v", sent, err)
		}
	}
	_, err = client.SendMessage(ctx, testThreadID, input)
	var apiErr *APIError
	if !errors.As(err, &apiErr) || apiErr.StatusCode != 200 || apiErr.Code != "CONFLICT" {
		t.Fatalf("GraphQL conflict: %v", err)
	}
	page, err := client.ListThreadMessages(ctx, testThreadID, PageOptions{After: big - 1})
	if err != nil || len(page.Items) != 1 || page.NextAfter != big || page.Cursor != big+2 {
		t.Fatalf("large sequence page: %+v, %v", page, err)
	}
	empty, err := client.ListMessages(ctx, testThreadID, PageOptions{After: page.NextAfter})
	if err != nil || len(empty.Items) != 0 || empty.NextAfter != big {
		t.Fatalf("empty page: %+v, %v", empty, err)
	}
	before := calls.Load()
	if _, err := client.SendMessage(ctx, testThreadID, SendMessageRequest{Body: "missing ID"}); err == nil {
		t.Error("accepted missing client message ID")
	}
	if _, err := client.SendMessage(ctx, testThreadID, SendMessageRequest{
		ClientMessageID: testClientID, Body: strings.Repeat("x", 32769),
	}); err == nil {
		t.Error("accepted oversized message body")
	}
	if _, err := client.ListThreadMessages(ctx, testThreadID, PageOptions{After: -1}); err == nil {
		t.Error("accepted negative cursor")
	}
	if calls.Load() != before {
		t.Error("sent invalid message request")
	}
}

func TestMessagePropsAcceptNormalizedJSONNumbers(t *testing.T) {
	message := fixtureMessage(1)
	message.ID = testMessageID
	message.ClientMessageID = testClientID
	message.Props = map[string]any{"ratio": json.Number("1.0")}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if !strings.Contains(string(request.Variables["props"]), `"ratio":1.00`) {
			t.Errorf("lost original JSON props: %s", request.Variables["props"])
		}
		respondGraphQL(t, w, "sendMessage", message)
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	sent, err := client.SendMessage(context.Background(), testThreadID, SendMessageRequest{
		ClientMessageID: testClientID, Body: message.Body,
		Props: map[string]any{"ratio": json.Number("1.00")},
	})
	if err != nil || sent.Props["ratio"] != json.Number("1.0") {
		t.Fatalf("server-normalized JSON number: %+v, %v", sent, err)
	}
}

func TestThreadEventSparsePaginationAndCallbackAck(t *testing.T) {
	first := fixtureThreadEvent(1, "thread.created", nil)
	message := fixtureMessage(3)
	second := fixtureThreadEvent(3, EventMessageCreated, &message)
	last := fixtureThreadEvent(8, "thread.member_removed", nil)
	identityID := "ci_22222222222222222222222222222222"
	last.IdentityID = &identityID
	callID := testMediaID
	last.CallID = &callID
	var requests []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if !strings.Contains(request.Query, "threadEvents(") ||
			!strings.Contains(request.Query, "message{"+messageFields+"}") ||
			!strings.Contains(request.Query, "actor") {
			t.Errorf("missing event selection: %s", request.Query)
		}
		after := strings.Trim(string(request.Variables["after"]), `"`)
		requests = append(requests, after)
		switch after {
		case "0":
			respondGraphQL(t, w, "threadEvents", ThreadEventPage{
				Items: []ThreadEvent{first, second}, NextAfter: 3, Cursor: 8, HasMore: true,
			})
		case "1":
			respondGraphQL(t, w, "threadEvents", ThreadEventPage{
				Items: []ThreadEvent{second, last}, NextAfter: 8, Cursor: 8, HasMore: true,
			})
		case "8":
			respondGraphQL(t, w, "threadEvents", ThreadEventPage{
				Items: []ThreadEvent{}, NextAfter: 8, Cursor: 8, HasMore: false,
			})
		default:
			t.Errorf("unexpected cursor %q", after)
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	page, err := client.ListThreadEvents(context.Background(), testThreadID, PageOptions{})
	if err != nil || page.Cursor != 8 || !page.HasMore || page.Items[0].Message != nil ||
		page.Items[1].Message == nil || page.Items[1].EventID == page.Items[1].Message.ID {
		t.Fatalf("typed thread events: %+v, %v", page, err)
	}
	failure := errors.New("persist failed")
	var received []int64
	cursor, err := client.ConsumeThreadEvents(context.Background(), testThreadID,
		ConsumeThreadEventsOptions{Limit: 2}, func(_ context.Context, event ThreadEvent) error {
			received = append(received, event.Sequence)
			if event.Sequence == 3 {
				return failure
			}
			return nil
		})
	if cursor != 1 || !errors.Is(err, failure) {
		t.Fatalf("failed callback skipped event: %d, %v", cursor, err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	cursor, err = client.ConsumeEvents(ctx, testThreadID,
		ConsumeEventsOptions{After: cursor, Limit: 2},
		func(_ context.Context, event Event) error {
			received = append(received, event.Sequence)
			if event.Sequence == 8 {
				if event.IdentityID == nil || *event.IdentityID != "ci_22222222222222222222222222222222" ||
					event.CallID == nil || *event.CallID != testMediaID {
					t.Errorf("lost membership/call event payload: %+v", event)
				}
				cancel()
			}
			return nil
		})
	if cursor != 8 || !errors.Is(err, context.Canceled) ||
		!reflect.DeepEqual(received, []int64{1, 3, 3, 8}) {
		t.Fatalf("callback acknowledgment/retry: cursor %d, events %v, error %v", cursor, received, err)
	}
	if !reflect.DeepEqual(requests, []string{"0", "0", "1"}) {
		t.Errorf("wrong GraphQL replay cursors: %v", requests)
	}
	empty, err := client.ListEvents(context.Background(), testThreadID, PageOptions{After: 8})
	if err != nil || len(empty.Items) != 0 || empty.NextAfter != 8 {
		t.Fatalf("empty event page: %+v, %v", empty, err)
	}
}

func TestFullSizeGraphQLHistoryPage(t *testing.T) {
	body := strings.Repeat("<", 32768)
	messages := make([]Message, 100)
	for i := range messages {
		message := fixtureMessage(int64(i + 1))
		message.Body = body
		messages[i] = message
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		assertVariables(t, request, `{"threadId":"`+testThreadID+`","after":"0","limit":100}`)
		respondGraphQL(t, w, "threadMessages", MessagePage{
			Items: messages, NextAfter: 100, Cursor: 100, HasMore: false,
		})
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	page, err := client.ListThreadMessages(context.Background(), testThreadID, PageOptions{Limit: 100})
	if err != nil || len(page.Items) != 100 || page.NextAfter != 100 ||
		len(page.Items[99].Body) != 32768 {
		t.Fatalf("full message page: %d items, cursor %d, error %v", len(page.Items), page.NextAfter, err)
	}
}

func TestRejectsMalformedThreadTimeline(t *testing.T) {
	bad := fixtureMessage(1)
	bad.ThreadID = testProjectID
	valid := fixtureMessage(1)
	event := fixtureThreadEvent(1, EventMessageCreated, &valid)
	cases := []struct {
		name, field string
		payload     any
	}{
		{"missing message items", "threadMessages", map[string]any{"nextAfter": "0", "cursor": "0", "hasMore": false}},
		{"numeric cursor", "threadMessages", map[string]any{"items": []Message{}, "nextAfter": 0, "cursor": "0", "hasMore": false}},
		{"wrong message cursor", "threadMessages", MessagePage{Items: []Message{valid}, NextAfter: 0, Cursor: 1}},
		{"wrong message thread", "threadMessages", MessagePage{Items: []Message{bad}, NextAfter: 1, Cursor: 1}},
		{"stalled pagination", "threadMessages", MessagePage{Items: []Message{}, NextAfter: 0, Cursor: 1, HasMore: true}},
		{"missing event hasMore", "threadEvents", map[string]any{"items": []ThreadEvent{}, "nextAfter": "0", "cursor": "0"}},
		{"wrong event cursor", "threadEvents", ThreadEventPage{Items: []ThreadEvent{event}, NextAfter: 0, Cursor: 1}},
		{"event wrong message", "threadEvents", ThreadEventPage{Items: []ThreadEvent{
			fixtureThreadEvent(2, EventMessageCreated, &valid),
		}, NextAfter: 2, Cursor: 2}},
		{"event non-message with message", "threadEvents", ThreadEventPage{Items: []ThreadEvent{
			fixtureThreadEvent(1, "thread.created", &valid),
		}, NextAfter: 1, Cursor: 1}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				respondGraphQL(t, w, tc.field, tc.payload)
			}))
			defer server.Close()
			client, err := NewUserClient(server.URL, testSessionToken)
			if err != nil {
				t.Fatal(err)
			}
			if tc.field == "threadMessages" {
				if _, err := client.ListThreadMessages(context.Background(), testThreadID, PageOptions{}); err == nil {
					t.Error("accepted malformed message page")
				}
			} else {
				if _, err := client.ListThreadEvents(context.Background(), testThreadID, PageOptions{}); err == nil {
					t.Error("accepted malformed thread-event page")
				}
			}
		})
	}
}

func TestConsumeThreadEventsReturnsGraphQLErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		request := readGraphQLRequest(t, r, testSessionToken)
		if got := string(request.Variables["after"]); got != strconv.Quote("42") {
			t.Errorf("cursor must be a string, got %s", got)
		}
		respondGraphQLError(t, w, "NOT_FOUND", "thread not visible")
	}))
	defer server.Close()
	client, err := NewUserClient(server.URL, testSessionToken)
	if err != nil {
		t.Fatal(err)
	}
	cursor, err := client.ConsumeThreadEvents(context.Background(), testThreadID,
		ConsumeThreadEventsOptions{After: 42},
		func(context.Context, ThreadEvent) error { t.Error("callback invoked after GraphQL error"); return nil })
	var apiErr *APIError
	if cursor != 42 || !errors.As(err, &apiErr) || apiErr.StatusCode != 200 || apiErr.Code != "NOT_FOUND" {
		t.Fatalf("GraphQL error lost safe cursor: %d, %v", cursor, err)
	}
}
