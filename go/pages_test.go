package convohop

import (
	"context"
	"errors"
	"iter"
	"slices"
	"testing"
)

// paged answers message page requests with the page for their cursor, keyed
// by beforeSequence or "" for the first page.
func paged(pages map[string]map[string]any) func(*exchange) response {
	return func(ex *exchange) response {
		cursor, _ := ex.input["beforeSequence"].(string)
		if cursor == "" {
			cursor, _ = ex.input["cursor"].(string)
		}
		page, ok := pages[cursor]
		if !ok {
			return response{drop: true}
		}
		if page == nil {
			return response{body: success(ex.op, ex.requestID, nil)}
		}
		return response{body: success(ex.op, ex.requestID, page)}
	}
}

func messagePage(fields map[string]any) map[string]any {
	return object("MessagePage", fields)
}

type pageResult[P any] struct {
	page *P
	err  error
}

func collect[P any](seq iter.Seq2[*P, error]) []pageResult[P] {
	var results []pageResult[P]
	for page, err := range seq {
		results = append(results, pageResult[P]{page, err})
	}
	return results
}

// cursors returns the cursor each request of the operation sent, "" for none.
func cursors(a *authority, name string) []string {
	var sent []string
	for _, ex := range a.requests() {
		cursor, _ := ex.input[name].(string)
		sent = append(sent, cursor)
	}
	return sent
}

func messages(start *string) MessagesRequestInput {
	return MessagesRequestInput{ConversationID: testConversation, Limit: 2, BeforeSequence: start}
}

func TestPagesFollowCursors(t *testing.T) {
	a := newAuthority(t, paged(map[string]map[string]any{
		"":   messagePage(map[string]any{"items": []any{message(testConversation)}, "nextCursor": "30"}),
		"30": messagePage(map[string]any{"nextCursor": "10"}),
		"10": messagePage(map[string]any{"complete": true}),
	}))
	client := newProject(t, a)
	results := collect(client.MessagesPages(context.Background(), messages(nil)))
	if len(results) != 3 || len(results[0].page.Items) != 1 || !results[2].page.Complete {
		t.Fatalf("results = %+v", results)
	}
	for _, result := range results {
		if result.err != nil {
			t.Fatal(result.err)
		}
	}
	if sent := cursors(a, "beforeSequence"); !slices.Equal(sent, []string{"", "30", "10"}) {
		t.Fatalf("cursors = %q", sent)
	}
	ids := map[string]bool{}
	for _, ex := range a.requests() {
		ids[ex.requestID] = true
	}
	if len(ids) != 3 {
		t.Fatalf("pages shared request IDs: %v", ids)
	}
}

func TestPagesStartAtTheInputCursor(t *testing.T) {
	a := newAuthority(t, paged(map[string]map[string]any{"50": messagePage(map[string]any{"complete": true})}))
	results := collect(newProject(t, a).MessagesPages(context.Background(), messages(ptr("50"))))
	if len(results) != 1 || results[0].err != nil {
		t.Fatalf("results = %+v", results)
	}
	if sent := cursors(a, "beforeSequence"); !slices.Equal(sent, []string{"50"}) {
		t.Fatalf("cursors = %q", sent)
	}
}

func TestInboxPagesFollowCursors(t *testing.T) {
	a := newAuthority(t, paged(map[string]map[string]any{
		"":         object("InboxPage", map[string]any{"nextCursor": "opaque-1"}),
		"opaque-1": object("InboxPage", map[string]any{"complete": true}),
	}))
	results := collect(newProject(t, a).InboxPages(context.Background(), InboxRequestInput{Limit: 2}))
	if len(results) != 2 || results[0].err != nil || results[1].err != nil {
		t.Fatalf("results = %+v", results)
	}
	if sent := cursors(a, "cursor"); !slices.Equal(sent, []string{"", "opaque-1"}) {
		t.Fatalf("cursors = %q", sent)
	}
}

func TestPagesStop(t *testing.T) {
	cases := []struct {
		name  string
		pages map[string]map[string]any
		// pages is the number of pages yielded before the last result.
		yielded int
		message string
		sent    int
	}{
		{"incomplete page without a next cursor", map[string]map[string]any{"": messagePage(nil)}, 1,
			"Incomplete page has no next cursor", 1},
		{"cursor that does not advance", map[string]map[string]any{
			"":   messagePage(map[string]any{"nextCursor": "30"}),
			"30": messagePage(map[string]any{"nextCursor": "30"}),
		}, 2, "Page cursor did not advance", 2},
		{"missing page", map[string]map[string]any{"": messagePage(map[string]any{"nextCursor": "30"}), "30": nil}, 1,
			"Missing page result", 2},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, paged(tc.pages))
			results := collect(newProject(t, a).MessagesPages(context.Background(), messages(nil)))
			if len(results) != tc.yielded+1 {
				t.Fatalf("results = %+v", results)
			}
			for _, result := range results[:tc.yielded] {
				if result.page == nil || result.err != nil {
					t.Fatalf("results = %+v", results)
				}
			}
			last := results[tc.yielded]
			if last.page != nil {
				t.Fatalf("final result carries a page: %+v", last)
			}
			p := expectProblem(t, last.err, codeInvalidResponse, OutcomeUnknown, 503)
			if p.Message != tc.message {
				t.Fatalf("message %q, want %q", p.Message, tc.message)
			}
			if n := len(a.requests()); n != tc.sent {
				t.Fatalf("sent %d requests, want %d", n, tc.sent)
			}
		})
	}
}

func TestPagesRequireRefresh(t *testing.T) {
	a := newAuthority(t, paged(map[string]map[string]any{
		"":   messagePage(map[string]any{"nextCursor": "30"}),
		"30": messagePage(map[string]any{"refreshRequired": true, "nextCursor": "10"}),
	}))
	results := collect(newProject(t, a).MessagesPages(context.Background(), messages(nil)))
	if len(results) != 2 || results[0].err != nil || results[1].page == nil || !results[1].page.RefreshRequired ||
		!errors.Is(results[1].err, ErrRefreshRequired) {
		t.Fatalf("results = %+v", results)
	}
	if n := len(a.requests()); n != 2 {
		t.Fatalf("sent %d requests, want 2", n)
	}
}

func TestPagesStopAtTheFirstError(t *testing.T) {
	a := newAuthority(t, paged(map[string]map[string]any{"": messagePage(map[string]any{"nextCursor": "30"})}))
	results := collect(newProject(t, a).MessagesPages(context.Background(), messages(nil)))
	if len(results) != 2 || results[0].err != nil || results[1].page != nil {
		t.Fatalf("results = %+v", results)
	}
	expectProblem(t, results[1].err, codeTransportUnknown, OutcomeUnknown, 0)
}

func TestPagesStopWhenTheCallerStops(t *testing.T) {
	a := newAuthority(t, paged(map[string]map[string]any{
		"":   messagePage(map[string]any{"nextCursor": "30"}),
		"30": messagePage(map[string]any{"complete": true}),
	}))
	for page, err := range newProject(t, a).MessagesPages(context.Background(), messages(nil)) {
		if page == nil || err != nil {
			t.Fatalf("page %v, error %v", page, err)
		}
		break
	}
	if n := len(a.requests()); n != 1 {
		t.Fatalf("sent %d requests after the caller stopped, want 1", n)
	}
}
