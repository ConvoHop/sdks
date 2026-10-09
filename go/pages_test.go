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

// pageOutcome is a page result without its page type: whether it carried a
// page, and its error.
type pageOutcome struct {
	page bool
	err  error
}

func pageOutcomes[P any](seq iter.Seq2[*P, error]) []pageOutcome {
	var results []pageOutcome
	for _, result := range collect(seq) {
		results = append(results, pageOutcome{result.page != nil, result.err})
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

// TestPagesStop covers the pages that end iteration with an invalid response.
// MessagesPages has descending decimal cursors and InboxPages opaque ones.
func TestPagesStop(t *testing.T) {
	messagesFrom := func(start *string) func(*ProjectClient) []pageOutcome {
		return func(c *ProjectClient) []pageOutcome {
			return pageOutcomes(c.MessagesPages(context.Background(), messages(start)))
		}
	}
	inboxFrom := func(start *string) func(*ProjectClient) []pageOutcome {
		return func(c *ProjectClient) []pageOutcome {
			return pageOutcomes(c.InboxPages(context.Background(), InboxRequestInput{Limit: 2, Cursor: start}))
		}
	}
	before := func(cursor string) map[string]any { return messagePage(map[string]any{"nextCursor": cursor}) }
	inbox := func(cursor string) map[string]any { return object("InboxPage", map[string]any{"nextCursor": cursor}) }
	cases := []struct {
		name    string
		iterate func(*ProjectClient) []pageOutcome
		field   string
		pages   map[string]map[string]any
		// yielded is the number of pages yielded before the final error.
		yielded int
		message string
		// sent is the cursor that each request sent, "" for none.
		sent []string
	}{
		{"incomplete page without a next cursor", messagesFrom(nil), "beforeSequence",
			map[string]map[string]any{"": messagePage(nil)}, 0, "Incomplete page has no next cursor", []string{""}},
		{"next cursor that isn't a decimal", messagesFrom(nil), "beforeSequence",
			map[string]map[string]any{"": before("abc")}, 0, "Malformed next cursor", []string{""}},
		{"next cursor with a leading zero", messagesFrom(nil), "beforeSequence",
			map[string]map[string]any{"": before("030")}, 0, "Malformed next cursor", []string{""}},
		{"next cursor above the maximum", messagesFrom(nil), "beforeSequence",
			map[string]map[string]any{"": before("9223372036854775808")}, 0, "Malformed next cursor", []string{""}},
		{"cursor that repeats", messagesFrom(nil), "beforeSequence",
			map[string]map[string]any{"": before("30"), "30": before("30")}, 1, "Page cursor did not advance",
			[]string{"", "30"}},
		{"cursor that moves the wrong way", messagesFrom(nil), "beforeSequence",
			map[string]map[string]any{"": before("30"), "30": before("40")}, 1, "Page cursor did not advance",
			[]string{"", "30"}},
		{"cursor cycle", messagesFrom(nil), "beforeSequence",
			map[string]map[string]any{"": before("30"), "30": before("10"), "10": before("30")}, 2,
			"Page cursor did not advance", []string{"", "30", "10"}},
		{"start cursor that repeats", messagesFrom(ptr("50")), "beforeSequence",
			map[string]map[string]any{"50": before("50")}, 0, "Page cursor did not advance", []string{"50"}},
		{"missing page", messagesFrom(nil), "beforeSequence",
			map[string]map[string]any{"": before("30"), "30": nil}, 1, "Missing page result", []string{"", "30"}},
		{"opaque cursor that repeats", inboxFrom(nil), "cursor",
			map[string]map[string]any{"": inbox("a"), "a": inbox("a")}, 1, "Page cursor did not advance",
			[]string{"", "a"}},
		{"opaque cursor cycle", inboxFrom(nil), "cursor",
			map[string]map[string]any{"": inbox("a"), "a": inbox("b"), "b": inbox("a")}, 2,
			"Page cursor did not advance", []string{"", "a", "b"}},
		{"opaque start cursor that repeats", inboxFrom(ptr("a")), "cursor",
			map[string]map[string]any{"a": inbox("a")}, 0, "Page cursor did not advance", []string{"a"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := newAuthority(t, paged(tc.pages))
			results := tc.iterate(newProject(t, a))
			if len(results) != tc.yielded+1 {
				t.Fatalf("results = %+v", results)
			}
			for _, result := range results[:tc.yielded] {
				if !result.page || result.err != nil {
					t.Fatalf("results = %+v", results)
				}
			}
			last := results[tc.yielded]
			if last.page {
				t.Fatalf("final result carries a page: %+v", last)
			}
			p := expectProblem(t, last.err, codeInvalidResponse, OutcomeUnknown, 503)
			if p.Message != tc.message {
				t.Fatalf("message %q, want %q", p.Message, tc.message)
			}
			if sent := cursors(a, tc.field); !slices.Equal(sent, tc.sent) {
				t.Fatalf("cursors = %q, want %q", sent, tc.sent)
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
