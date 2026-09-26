package threadwave

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	EventMessageCreated = "message.created"
	threadEventFields   = `eventId threadId sequence kind actor message{` + messageFields + `} identityId callId createdAt`
)

// ThreadEvent represents a durable message, membership, lifecycle, or call
// event. Message is present only for message.created; the event ID need not
// equal its message ID.
type ThreadEvent struct {
	EventID    string    `json:"eventId"`
	ThreadID   string    `json:"threadId"`
	Sequence   int64     `json:"sequence,string"`
	Kind       string    `json:"kind"`
	Actor      string    `json:"actor"`
	Message    *Message  `json:"message"`
	IdentityID *string   `json:"identityId"`
	CallID     *string   `json:"callId"`
	CreatedAt  time.Time `json:"createdAt"`
}

type ThreadEventPage struct {
	Items     []ThreadEvent `json:"items"`
	NextAfter int64         `json:"nextAfter,string"`
	Cursor    int64         `json:"cursor,string"`
	HasMore   bool          `json:"hasMore"`
}

func validateThreadEvent(event ThreadEvent, threadID string) error {
	if validateUUID("event ID in response", event.EventID) != nil ||
		validateUUID("thread ID in event", event.ThreadID) != nil ||
		!strings.EqualFold(event.ThreadID, threadID) ||
		event.Sequence < 1 || event.Kind == "" ||
		validateIdentityID(event.Actor) != nil || event.CreatedAt.IsZero() {
		return errors.New("invalid thread event in response")
	}
	if event.IdentityID != nil && validateIdentityID(*event.IdentityID) != nil ||
		event.CallID != nil && validateUUID("call ID in event", *event.CallID) != nil {
		return errors.New("invalid thread event subject in response")
	}
	if event.Kind == EventMessageCreated {
		if event.Message == nil || validateMessage(*event.Message, threadID) != nil ||
			event.Message.Sequence != event.Sequence {
			return errors.New("invalid message.created event in response")
		}
	} else if event.Message != nil {
		return errors.New("non-message event has a message in response")
	}
	return nil
}

// ListThreadEvents reads a durable page of all thread event kinds. Sequences
// may be sparse because history visibility filters out inaccessible events.
func (c *UserClient) ListThreadEvents(ctx context.Context, threadID string, options PageOptions) (*ThreadEventPage, error) {
	variables, err := threadVariables(threadID)
	if err != nil {
		return nil, err
	}
	page, err := pageVariables(options.After, options.Limit)
	if err != nil {
		return nil, err
	}
	for key, value := range page {
		variables[key] = value
	}
	const query = `query ThreadEvents($threadId:ID!,$after:String,$limit:Int){
		threadEvents(threadId:$threadId,after:$after,limit:$limit){
			items{` + threadEventFields + `}nextAfter cursor hasMore}}`
	var wire struct {
		Items     []ThreadEvent `json:"items"`
		NextAfter *string       `json:"nextAfter"`
		Cursor    *string       `json:"cursor"`
		HasMore   *bool         `json:"hasMore"`
	}
	if err := c.api.graphql(ctx, query, variables, "threadEvents", &wire); err != nil {
		return nil, err
	}
	if wire.Items == nil || wire.NextAfter == nil || wire.Cursor == nil || wire.HasMore == nil {
		return nil, errors.New("invalid thread-event page in response")
	}
	nextAfter, err := parseSequence("thread-event cursor", *wire.NextAfter)
	if err != nil {
		return nil, err
	}
	cursor, err := parseSequence("thread-event high-water", *wire.Cursor)
	if err != nil {
		return nil, err
	}
	last := options.After
	for _, event := range wire.Items {
		if err := validateThreadEvent(event, threadID); err != nil {
			return nil, err
		}
		if event.Sequence <= last {
			return nil, errors.New("thread events are not ordered after the cursor")
		}
		last = event.Sequence
	}
	if nextAfter != last || *wire.HasMore && nextAfter <= options.After {
		return nil, errors.New("thread-event page cursor does not match last sequence")
	}
	return &ThreadEventPage{Items: wire.Items, NextAfter: nextAfter, Cursor: cursor, HasMore: *wire.HasMore}, nil
}

type ConsumeThreadEventsOptions struct {
	After        int64
	Limit        int           // 0 uses 50; otherwise 1-100.
	PollInterval time.Duration // 0 uses one second; must not be negative.
}

// ConsumeThreadEvents polls GraphQL pages without a WebSocket dependency.
// Only successful callbacks are acknowledged; restart from the returned
// cursor after an error. Persist callbacks and cursors together or tolerate
// duplicates, since delivery is at least once.
func (c *UserClient) ConsumeThreadEvents(
	ctx context.Context,
	threadID string,
	options ConsumeThreadEventsOptions,
	handle func(context.Context, ThreadEvent) error,
) (int64, error) {
	after := options.After
	if ctx == nil {
		return after, errors.New("context must not be nil")
	}
	if _, err := threadVariables(threadID); err != nil {
		return after, err
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
		page, err := c.ListThreadEvents(ctx, threadID, PageOptions{After: after, Limit: limit})
		if err != nil {
			return after, err
		}
		for _, event := range page.Items {
			if err := ctx.Err(); err != nil {
				return after, err
			}
			if err := handle(ctx, event); err != nil {
				return after, fmt.Errorf("handle thread event %d: %w", event.Sequence, err)
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

// Event aliases ThreadEvent for callers using the generic feed terminology.
type Event = ThreadEvent
type EventPage = ThreadEventPage
type ConsumeEventsOptions = ConsumeThreadEventsOptions

func (c *UserClient) ListEvents(ctx context.Context, threadID string, options PageOptions) (*EventPage, error) {
	return c.ListThreadEvents(ctx, threadID, options)
}

func (c *UserClient) ConsumeEvents(
	ctx context.Context,
	threadID string,
	options ConsumeEventsOptions,
	handle func(context.Context, Event) error,
) (int64, error) {
	return c.ConsumeThreadEvents(ctx, threadID, options, handle)
}
