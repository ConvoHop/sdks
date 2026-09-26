package convohop

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

const callFields = `id projectId threadId mode owner title role`

// CallInfo is the recipient's view of a call and their media role.
type CallInfo struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId"`
	ThreadID  string    `json:"threadId"`
	Mode      CallMode  `json:"mode"`
	Owner     string    `json:"owner"`
	Title     string    `json:"title"`
	Role      MediaRole `json:"role"`
}

func validateCallInfo(call CallInfo) error {
	if validateUUID("call ID in response", call.ID) != nil ||
		validateUUID("project ID in call", call.ProjectID) != nil ||
		validateUUID("thread ID in call", call.ThreadID) != nil ||
		!validCallMode(call.Mode) || validateIdentityID(call.Owner) != nil ||
		validateTitle(call.Title) != nil || !validMediaRole(call.Role) {
		return errors.New("invalid call in response")
	}
	return nil
}

type IncomingCall struct {
	Call      CallInfo  `json:"call"`
	Sequence  int64     `json:"sequence,string"`
	InvitedAt time.Time `json:"invitedAt"`
}

type IncomingCallsPage struct {
	Items     []IncomingCall `json:"items"`
	NextAfter int64          `json:"nextAfter,string"`
	HasMore   bool           `json:"hasMore"`
	Cursor    int64          `json:"cursor,string"` // First page's high-water anchors replay.
}

// ListIncomingCalls returns current invitations, not an invitation audit.
// Preserve the FIRST page's Cursor when following HasMore pages.
func (c *UserClient) ListIncomingCalls(ctx context.Context, options PageOptions) (*IncomingCallsPage, error) {
	variables, err := pageVariables(options.After, options.Limit)
	if err != nil {
		return nil, err
	}
	const query = `query IncomingCalls($after:String,$limit:Int){
		incomingCalls(after:$after,limit:$limit){
			items{call{` + callFields + `} sequence invitedAt}nextAfter hasMore cursor}}`
	var wire struct {
		Items     []IncomingCall `json:"items"`
		NextAfter *string        `json:"nextAfter"`
		HasMore   *bool          `json:"hasMore"`
		Cursor    *string        `json:"cursor"`
	}
	if err := c.api.graphql(ctx, query, variables, "incomingCalls", &wire); err != nil {
		return nil, err
	}
	if wire.Items == nil || wire.NextAfter == nil || wire.HasMore == nil || wire.Cursor == nil {
		return nil, errors.New("invalid incoming-call page in response")
	}
	nextAfter, err := parseSequence("incoming-call cursor", *wire.NextAfter)
	if err != nil {
		return nil, err
	}
	cursor, err := parseSequence("incoming-call high-water", *wire.Cursor)
	if err != nil {
		return nil, err
	}
	last := options.After
	for _, item := range wire.Items {
		if err := validateCallInfo(item.Call); err != nil {
			return nil, err
		}
		if item.Sequence <= last || item.InvitedAt.IsZero() {
			return nil, errors.New("invalid or out-of-order incoming call in response")
		}
		last = item.Sequence
	}
	if err := validateSequencePage(options.After, nextAfter, last, *wire.HasMore); err != nil {
		return nil, err
	}
	return &IncomingCallsPage{
		Items: wire.Items, NextAfter: nextAfter, HasMore: *wire.HasMore, Cursor: cursor,
	}, nil
}

type CallEventType string

const (
	CallRinging  CallEventType = "call.ringing"
	CallAccepted CallEventType = "call.accepted"
	CallDeclined CallEventType = "call.declined"
	CallEnded    CallEventType = "call.ended"
	CallRevoked  CallEventType = "call.revoked"
)

type CallEvent struct {
	Kind       CallEventType `json:"kind"`
	EventID    string        `json:"eventId"`
	Sequence   int64         `json:"sequence,string"`
	CallID     string        `json:"callId"`
	IdentityID string        `json:"identityId"`
	Call       *CallInfo     `json:"call"` // May be null for decline or revocation.
	CreatedAt  time.Time     `json:"createdAt"`
}

type CallEventPage struct {
	Items     []CallEvent `json:"items"`
	NextAfter int64       `json:"nextAfter,string"`
	HasMore   bool        `json:"hasMore"`
}

// ListCallEvents reads recipient-scoped durable call changes. Sequences are
// sparse project-wide values; NextAfter may advance beyond the final visible
// event, even on an empty page.
func (c *UserClient) ListCallEvents(ctx context.Context, options PageOptions) (*CallEventPage, error) {
	variables, err := pageVariables(options.After, options.Limit)
	if err != nil {
		return nil, err
	}
	const query = `query CallEvents($after:String,$limit:Int){
		callEvents(after:$after,limit:$limit){
			items{eventId sequence kind callId identityId call{` + callFields + `} createdAt}nextAfter hasMore}}`
	var wire struct {
		Items     []json.RawMessage `json:"items"`
		NextAfter *string           `json:"nextAfter"`
		HasMore   *bool             `json:"hasMore"`
	}
	if err := c.api.graphql(ctx, query, variables, "callEvents", &wire); err != nil {
		return nil, err
	}
	if wire.Items == nil || wire.NextAfter == nil || wire.HasMore == nil {
		return nil, errors.New("invalid call-event page in response")
	}
	nextAfter, err := parseSequence("call-event cursor", *wire.NextAfter)
	if err != nil {
		return nil, err
	}
	items := make([]CallEvent, 0, len(wire.Items))
	last := options.After
	for _, raw := range wire.Items {
		event, err := decodeCallEvent(raw)
		if err != nil {
			return nil, err
		}
		if event.Sequence <= last {
			return nil, errors.New("call events are not ordered after the cursor")
		}
		last = event.Sequence
		items = append(items, event)
	}
	if err := validateSequencePage(options.After, nextAfter, last, *wire.HasMore); err != nil {
		return nil, err
	}
	return &CallEventPage{Items: items, NextAfter: nextAfter, HasMore: *wire.HasMore}, nil
}

func decodeCallEvent(raw json.RawMessage) (CallEvent, error) {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil || fields == nil {
		return CallEvent{}, errors.New("invalid call event in response")
	}
	for _, name := range [...]string{"kind", "eventId", "sequence", "callId", "identityId", "call", "createdAt"} {
		if _, present := fields[name]; !present {
			return CallEvent{}, fmt.Errorf("missing %s in call event response", name)
		}
	}
	var event CallEvent
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if err := decoder.Decode(&event); err != nil {
		return CallEvent{}, fmt.Errorf("invalid call event in response: %w", err)
	}
	switch event.Kind {
	case CallRinging, CallAccepted, CallDeclined, CallEnded, CallRevoked:
	default:
		return CallEvent{}, errors.New("unknown call event kind in response")
	}
	if validateUUID("event ID in response", event.EventID) != nil ||
		validateUUID("call ID in event", event.CallID) != nil ||
		validateIdentityID(event.IdentityID) != nil || event.Sequence < 1 || event.CreatedAt.IsZero() {
		return CallEvent{}, errors.New("invalid call event in response")
	}
	if event.Call != nil {
		if err := validateCallInfo(*event.Call); err != nil {
			return CallEvent{}, err
		}
		if !strings.EqualFold(event.Call.ID, event.CallID) {
			return CallEvent{}, errors.New("call event and call ID do not match")
		}
	} else if event.Kind != CallDeclined && event.Kind != CallRevoked {
		return CallEvent{}, errors.New("call event has no call in response")
	}
	return event, nil
}

// DeclineCall dismisses an invitation; repeated declines are idempotent.
func (c *UserClient) DeclineCall(ctx context.Context, mediaID string) error {
	variables, err := mediaVariables(mediaID)
	if err != nil {
		return err
	}
	const query = `mutation DeclineCall($id:ID!){declineCall(id:$id)}`
	return c.api.graphqlBool(ctx, query, variables, "declineCall")
}

type ConsumeCallEventsOptions struct {
	After        int64
	Limit        int           // 0 uses 50; otherwise 1-100.
	PollInterval time.Duration // 0 uses one second; must not be negative.
}

// ConsumeCallEvents polls in sequence order. The returned cursor advances
// only after successful callbacks, then to NextAfter when the page is fully
// handled. Persist that cursor with side effects or tolerate duplicates.
func (c *UserClient) ConsumeCallEvents(
	ctx context.Context,
	options ConsumeCallEventsOptions,
	handle func(context.Context, CallEvent) error,
) (int64, error) {
	after := options.After
	if ctx == nil {
		return after, errors.New("context must not be nil")
	}
	if options.PollInterval < 0 || handle == nil {
		return after, errors.New("poll interval must be nonnegative and handler non-nil")
	}
	if _, err := pageVariables(after, options.Limit); err != nil {
		return after, err
	}
	limit := options.Limit
	if limit == 0 {
		limit = 50
	}
	interval := options.PollInterval
	if interval == 0 {
		interval = time.Second
	}
	for {
		if err := ctx.Err(); err != nil {
			return after, err
		}
		page, err := c.ListCallEvents(ctx, PageOptions{After: after, Limit: limit})
		if err != nil {
			return after, err
		}
		for _, event := range page.Items {
			if err := ctx.Err(); err != nil {
				return after, err
			}
			if err := handle(ctx, event); err != nil {
				return after, fmt.Errorf("handle call event %d: %w", event.Sequence, err)
			}
			after = event.Sequence
		}
		after = page.NextAfter
		if page.HasMore {
			continue
		}
		timer := time.NewTimer(interval)
		select {
		case <-ctx.Done():
			timer.Stop()
			return after, ctx.Err()
		case <-timer.C:
		}
	}
}

// IncomingCallsSnapshot is a paginated invitation snapshot reconciled with
// call events after its first page's high-water mark.
type IncomingCallsSnapshot struct {
	Items          []IncomingCall
	SnapshotCursor int64
	NextAfter      int64 // Pass to ConsumeCallEvents.
}

func (c *UserClient) SyncIncomingCalls(ctx context.Context) (*IncomingCallsSnapshot, error) {
	if ctx == nil {
		return nil, errors.New("context must not be nil")
	}
	calls := make(map[string]IncomingCall)
	seen := make(map[string]int64)
	var after, anchor int64
	first := true
	for {
		page, err := c.ListIncomingCalls(ctx, PageOptions{After: after, Limit: 50})
		if err != nil {
			return nil, err
		}
		if first {
			anchor = page.Cursor
			first = false
		}
		for _, item := range page.Items {
			key := strings.ToLower(item.Call.ID)
			if item.Sequence > seen[key] {
				calls[key] = item
				seen[key] = item.Sequence
			}
		}
		after = page.NextAfter
		if !page.HasMore {
			break
		}
	}
	replayAfter := anchor
	for {
		page, err := c.ListCallEvents(ctx, PageOptions{After: replayAfter, Limit: 50})
		if err != nil {
			return nil, err
		}
		for _, event := range page.Items {
			key := strings.ToLower(event.CallID)
			if event.Sequence <= seen[key] {
				continue
			}
			if event.Kind == CallRinging {
				calls[key] = IncomingCall{
					Call: *event.Call, Sequence: event.Sequence, InvitedAt: event.CreatedAt,
				}
			} else {
				delete(calls, key)
			}
			seen[key] = event.Sequence
		}
		replayAfter = page.NextAfter
		if !page.HasMore {
			break
		}
	}
	items := make([]IncomingCall, 0, len(calls))
	for _, call := range calls {
		items = append(items, call)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Sequence == items[j].Sequence {
			return items[i].Call.ID < items[j].Call.ID
		}
		return items[i].Sequence < items[j].Sequence
	})
	return &IncomingCallsSnapshot{Items: items, SnapshotCursor: anchor, NextAfter: replayAfter}, nil
}
