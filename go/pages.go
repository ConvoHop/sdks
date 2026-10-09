package convohop

import (
	"errors"
	"iter"
)

// ErrRefreshRequired reports a page sequence the authority can no longer
// continue consistently, for example after a visibility change. A Pages
// iterator yields the page that requires the refresh together with this error
// and stops. Start again from the first page.
var ErrRefreshRequired = errors.New("convohop: the page sequence requires a refresh; start again from the first page")

// pageState is what an iterator needs to know about a page.
type pageState struct {
	complete        bool
	refreshRequired bool
	next            *string
}

// paginate fetches pages from start until a complete page, a page that
// requires a refresh, an error or the end of iteration. Every incomplete page
// must advance the cursor.
func paginate[P any](start *string, fetch func(cursor *string) (*P, pageState, error)) iter.Seq2[*P, error] {
	return func(yield func(*P, error) bool) {
		cursor := start
		for {
			page, state, err := fetch(cursor)
			if err != nil {
				yield(nil, err)
				return
			}
			if state.refreshRequired {
				yield(page, ErrRefreshRequired)
				return
			}
			if !yield(page, nil) || state.complete {
				return
			}
			if state.next == nil {
				yield(nil, problem(codeInvalidResponse, "", OutcomeUnknown, 503, "Incomplete page has no next cursor"))
				return
			}
			if cursor != nil && *state.next == *cursor {
				yield(nil, problem(codeInvalidResponse, "", OutcomeUnknown, 503, "Page cursor did not advance"))
				return
			}
			next := *state.next
			cursor = &next
		}
	}
}

func missingPage() error {
	return problem(codeInvalidResponse, "", OutcomeUnknown, 503, "Missing page result")
}
