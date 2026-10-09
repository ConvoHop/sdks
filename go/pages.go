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

// pageOrder is how each next cursor must relate to the cursors before it.
type pageOrder int

const (
	// serverOrder cursors are opaque: each must differ from every cursor
	// already sent.
	serverOrder pageOrder = iota
	// ascendingOrder cursors are decimals, each above the one before.
	ascendingOrder
	// descendingOrder cursors are decimals, each below the one before.
	descendingOrder
)

// pageCursor describes the cursor input of a Pages iterator: the scalar that
// every next cursor must be a value of, and the order the cursors follow.
type pageCursor struct {
	scalar string
	order  pageOrder
}

// paginate fetches pages from start until a complete page, a page that
// requires a refresh, an error or the end of iteration. An incomplete page
// must carry a next cursor that is a valid cursor value and advances;
// otherwise iteration yields an invalid-response error instead of the page
// and stops. A cycle of opaque cursors therefore stops iteration too, rather
// than repeating pages forever.
func paginate[P any](start *string, cursor pageCursor, fetch func(cursor *string) (*P, pageState, error)) iter.Seq2[*P, error] {
	return func(yield func(*P, error) bool) {
		position := start
		sent := map[string]bool{}
		for {
			if position != nil && cursor.order == serverOrder {
				sent[*position] = true
			}
			page, state, err := fetch(position)
			if err != nil {
				yield(nil, err)
				return
			}
			if state.refreshRequired {
				yield(page, ErrRefreshRequired)
				return
			}
			if state.complete {
				yield(page, nil)
				return
			}
			next, err := cursor.follow(position, state.next, sent)
			if err != nil {
				yield(nil, err)
				return
			}
			if !yield(page, nil) {
				return
			}
			position = &next
		}
	}
}

// follow checks the next cursor of an incomplete page fetched at position,
// given the opaque cursors already sent.
func (c pageCursor) follow(position, next *string, sent map[string]bool) (string, error) {
	if next == nil {
		return "", invalidPage("Incomplete page has no next cursor")
	}
	if _, err := checkScalar(*next, c.scalar, catalog.scalars[c.scalar]); err != nil {
		return "", invalidPage("Malformed next cursor")
	}
	advances := !sent[*next]
	if c.order != serverOrder && position != nil {
		comparison := compareDecimal(*next, *position)
		advances = c.order == ascendingOrder && comparison > 0 || c.order == descendingOrder && comparison < 0
	}
	if !advances {
		return "", invalidPage("Page cursor did not advance")
	}
	return *next, nil
}

func invalidPage(message string) error {
	return problem(codeInvalidResponse, "", OutcomeUnknown, 503, message)
}

func missingPage() error {
	return invalidPage("Missing page result")
}
