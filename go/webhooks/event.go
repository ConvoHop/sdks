package webhooks

import (
	"bytes"
	"encoding/json"
	"errors"
	"strconv"
	"unicode/utf8"

	"github.com/ConvoHop/sdks/go/internal/contract"
)

// Event types the authority sends. Notification events follow the push
// payload contract; the others are resource events.
const (
	EventConversationCreated              = "conversation.created"
	EventConversationUpdated              = "conversation.updated"
	EventMemberAdded                      = "member.added"
	EventMemberRoleChanged                = "member.roleChanged"
	EventMemberHistoryExpanded            = "member.historyExpanded"
	EventMemberRemoved                    = "member.removed"
	EventMemberBroadcastPermissionChanged = "member.broadcastPermissionChanged"
	EventMessageCreated                   = "message.created"
	EventMessageEdited                    = "message.edited"
	EventMessageDeleted                   = "message.deleted"
	EventReceiptReported                  = "receipt.reported"
	EventLiveStarted                      = "live.started"
	EventLiveParticipationChanged         = "live.participationChanged"
	EventLiveAlerted                      = "live.alerted"
	EventLiveReady                        = "live.ready"
	EventLiveConnected                    = "live.connected"
	EventLiveEnded                        = "live.ended"
	// EventWebhookEndpointDisabled means one of the project's other webhook
	// endpoints was disabled after repeated failures. SubjectRef.ID names
	// it, and SubjectRef.Kind is "webhookEndpoint".
	EventWebhookEndpointDisabled = "webhook.endpointDisabled"
	// EventNotificationMessage is a message for the recipient.
	EventNotificationMessage = "notification.message"
	// EventNotificationCall is an incoming call: one ring for the recipient.
	EventNotificationCall = "notification.call"
	// EventNotificationCallCancelled is a ring that stopped for the
	// recipient. Only recipients of the ring's notification.call get it.
	EventNotificationCallCancelled = "notification.callCancelled"
)

// Why a ring stopped, in [Notification].Reason. Treat a reason you don't know
// as "stop ringing", without a missed-call alert.
const (
	// ReasonAnswered means the recipient answered, on any device.
	ReasonAnswered = "answered"
	// ReasonDeclined means the recipient declined, on any device.
	ReasonDeclined = "declined"
	// ReasonEnded means the call ended or stopped ringing before the
	// recipient answered: a missed call.
	ReasonEnded = "ended"
	// ReasonExpired means nobody answered by ExpiresAt: a missed call.
	ReasonExpired = "expired"
)

// Call media profiles, in [Notification].MediaProfile. Accept profiles you
// don't know.
const (
	MediaProfileAudioOnly  = "AUDIO_ONLY"
	MediaProfileAudioVideo = "AUDIO_VIDEO"
)

var resourceEvents = map[string]bool{
	EventConversationCreated: true, EventConversationUpdated: true,
	EventMemberAdded: true, EventMemberRoleChanged: true, EventMemberHistoryExpanded: true,
	EventMemberRemoved: true, EventMemberBroadcastPermissionChanged: true,
	EventMessageCreated: true, EventMessageEdited: true, EventMessageDeleted: true, EventReceiptReported: true,
	EventLiveStarted: true, EventLiveParticipationChanged: true, EventLiveAlerted: true,
	EventLiveReady: true, EventLiveConnected: true, EventLiveEnded: true,
}

// Event is a verified delivery's metadata-only event envelope.
type Event struct {
	EventID   string
	EventType string
	// OccurredAt is when the event happened (RFC 3339).
	OccurredAt string
	ProjectID  string
	// SubjectRef names the resource the event is about.
	SubjectRef SubjectRef
	// Known reports whether this SDK knows the event type. Acknowledge an
	// event it doesn't know, including a notification event that doesn't
	// match the push payload contract.
	Known bool
	// Notification is the event's fields when it is a known notification
	// event, and nil otherwise.
	Notification *Notification
}

// SubjectRef names a resource.
type SubjectRef struct {
	ID   string `json:"id"`
	Kind string `json:"kind"`
}

// Notification is a per-recipient notification event: a message for the
// recipient, an incoming call, or a call that stopped ringing for the
// recipient. It is the input of the push package's builders. The contract is
// spec/push-payload in the SDK repository.
type Notification struct {
	EventID string `json:"eventId"`
	// EventType is EventNotificationMessage, EventNotificationCall or
	// EventNotificationCallCancelled.
	EventType string `json:"eventType"`
	// OccurredAt is when the message was sent, the ring started or the ring
	// stopped (RFC 3339).
	OccurredAt string     `json:"occurredAt"`
	ProjectID  string     `json:"projectId"`
	SubjectRef SubjectRef `json:"subjectRef"`
	// RecipientID is the principal to notify. Each recipient gets its own
	// event.
	RecipientID    string `json:"recipientId"`
	ConversationID string `json:"conversationId"`
	// SenderID is the principal who sent the message or started the ringing.
	SenderID string `json:"senderId"`
	// Connected reports whether the recipient had an active realtime
	// connection when the event was produced. It is a hint for your sending
	// policy: it isn't per device, and it can change before you send. The
	// push builders ignore it.
	Connected bool `json:"connected"`

	// MessageID names the message of a message event.
	MessageID string `json:"messageId,omitempty"`
	// Preview is the start of a message event's text, present only when the
	// project opts in to previews and the message has text.
	Preview *Preview `json:"preview,omitempty"`

	// LiveSessionID names the call of a call or cancellation event.
	LiveSessionID string `json:"liveSessionId,omitempty"`
	// AlertID names the ring. A later ring of the same call has a new
	// AlertID; a cancellation carries the stopped ring's.
	AlertID string `json:"alertId,omitempty"`
	// ExpiresAt is when the ring stops if nobody answers (RFC 3339). A
	// cancellation carries the stopped ring's original deadline.
	ExpiresAt string `json:"expiresAt,omitempty"`
	// MediaProfile is the call's media profile, such as
	// MediaProfileAudioOnly.
	MediaProfile string `json:"mediaProfile,omitempty"`
	// Reason is why a cancellation's ring stopped, such as ReasonEnded.
	Reason string `json:"reason,omitempty"`
}

// Preview is the start of a message's text.
type Preview struct {
	// Text is 1 to 512 Unicode code points.
	Text string `json:"text"`
	// Truncated reports whether the message text continues after Text.
	Truncated bool `json:"truncated"`
}

const previewLimit = 512

// Validate checks n against the push payload contract. It returns an error
// that names the first invalid field without its value. It ignores the
// fields the contract doesn't define for n's event type.
func (n *Notification) Validate() error {
	if problem := n.problem(); problem != "" {
		return errors.New(problem)
	}
	return nil
}

func (n *Notification) problem() string {
	if n == nil {
		return "event must not be nil"
	}
	switch n.EventType {
	case EventNotificationMessage, EventNotificationCall, EventNotificationCallCancelled:
	default:
		return "eventType must be a notification event type"
	}
	for _, field := range []struct{ name, value string }{
		{"eventId", n.EventID}, {"occurredAt", n.OccurredAt}, {"projectId", n.ProjectID},
		{"recipientId", n.RecipientID}, {"conversationId", n.ConversationID}, {"senderId", n.SenderID},
	} {
		if field.name == "occurredAt" {
			if _, ok := contract.EpochSeconds(field.value); !ok {
				return "occurredAt must be an RFC 3339 timestamp"
			}
		} else if !contract.UUID(field.value) {
			return field.name + " must be a lowercase, non-nil UUID"
		}
	}
	if n.EventType == EventNotificationMessage {
		if !contract.UUID(n.MessageID) {
			return "messageId must be a lowercase, non-nil UUID"
		}
		if n.SubjectRef.Kind != "message" || n.SubjectRef.ID != n.MessageID {
			return "subjectRef must be the message the event names"
		}
		if n.Preview != nil {
			text := n.Preview.Text
			if text == "" || !utf8.ValidString(text) || utf8.RuneCountInString(text) > previewLimit {
				return "preview.text must be 1 to 512 Unicode code points"
			}
		}
		return ""
	}
	if !contract.UUID(n.LiveSessionID) {
		return "liveSessionId must be a lowercase, non-nil UUID"
	}
	if n.SubjectRef.Kind != "liveSession" || n.SubjectRef.ID != n.LiveSessionID {
		return "subjectRef must be the liveSession the event names"
	}
	if !contract.UUID(n.AlertID) {
		return "alertId must be a lowercase, non-nil UUID"
	}
	if _, ok := contract.EpochSeconds(n.ExpiresAt); !ok {
		return "expiresAt must be an RFC 3339 timestamp"
	}
	if !contract.Identifier(n.MediaProfile) {
		return "mediaProfile must be an ASCII letter followed by up to 63 ASCII letters, digits or _"
	}
	if n.EventType == EventNotificationCallCancelled && !contract.Identifier(n.Reason) {
		return "reason must be an ASCII letter followed by up to 63 ASCII letters, digits or _"
	}
	return ""
}

type fields map[string]json.RawMessage

func invalidBody(message string) error { return failure(CodeInvalidBody, message) }

// parseEvent parses a verified body. It reads only the fields it needs, by
// exact name, so undeclared fields never change the result.
func parseEvent(body []byte) (Event, error) {
	// A decoder that matches the TypeScript SDK's TextDecoder drops one
	// leading byte order mark.
	body = bytes.TrimPrefix(body, []byte("\xef\xbb\xbf"))
	if !utf8.Valid(body) || !json.Valid(body) {
		return Event{}, invalidBody("Webhook body is not UTF-8 JSON")
	}
	envelope, _ := object(body)
	subject, _ := object(envelope["subjectRef"])
	var event Event
	ok := true
	event.EventType, ok = textAnd(envelope, "eventType", ok)
	event.EventID, ok = textAnd(envelope, "eventId", ok)
	event.OccurredAt, ok = textAnd(envelope, "occurredAt", ok)
	event.ProjectID, ok = textAnd(envelope, "projectId", ok)
	event.SubjectRef.ID, ok = textAnd(subject, "id", ok)
	event.SubjectRef.Kind, ok = textAnd(subject, "kind", ok)
	if !ok {
		return Event{}, invalidBody("Webhook body is not a ConvoHop event envelope")
	}
	switch {
	case resourceEvents[event.EventType]:
		event.Known = true
	case event.EventType == EventWebhookEndpointDisabled:
		event.Known = event.SubjectRef.Kind == "webhookEndpoint"
	case event.EventType == EventNotificationMessage, event.EventType == EventNotificationCall,
		event.EventType == EventNotificationCallCancelled:
		event.Notification = notification(envelope, event)
		event.Known = event.Notification != nil
	}
	return event, nil
}

// notification returns the notification event in envelope, or nil when it
// doesn't match the push payload contract.
func notification(envelope fields, event Event) *Notification {
	n := &Notification{
		EventID: event.EventID, EventType: event.EventType, OccurredAt: event.OccurredAt,
		ProjectID: event.ProjectID, SubjectRef: event.SubjectRef,
	}
	ok := true
	n.RecipientID, ok = textAnd(envelope, "recipientId", ok)
	n.ConversationID, ok = textAnd(envelope, "conversationId", ok)
	n.SenderID, ok = textAnd(envelope, "senderId", ok)
	n.Connected, ok = flagAnd(envelope, "connected", ok)
	if n.EventType == EventNotificationMessage {
		n.MessageID, ok = textAnd(envelope, "messageId", ok)
		if raw, present := envelope["preview"]; present {
			preview, isObject := object(raw)
			n.Preview = &Preview{}
			n.Preview.Text, ok = textAnd(preview, "text", ok && isObject)
			n.Preview.Truncated, ok = flagAnd(preview, "truncated", ok)
			ok = ok && !loneSurrogate(preview["text"])
		}
	} else {
		n.LiveSessionID, ok = textAnd(envelope, "liveSessionId", ok)
		n.AlertID, ok = textAnd(envelope, "alertId", ok)
		n.ExpiresAt, ok = textAnd(envelope, "expiresAt", ok)
		n.MediaProfile, ok = textAnd(envelope, "mediaProfile", ok)
		if n.EventType == EventNotificationCallCancelled {
			n.Reason, ok = textAnd(envelope, "reason", ok)
		}
	}
	if !ok || n.problem() != "" {
		return nil
	}
	return n
}

// object decodes a JSON object. It reports false for any other value,
// including null.
func object(raw json.RawMessage) (fields, bool) {
	raw = bytes.TrimSpace(raw)
	if len(raw) == 0 || raw[0] != '{' {
		return nil, false
	}
	var decoded fields
	if json.Unmarshal(raw, &decoded) != nil {
		return nil, false
	}
	return decoded, true
}

// text returns a non-empty JSON string field.
func text(source fields, name string) (string, bool) {
	raw := bytes.TrimSpace(source[name])
	if len(raw) == 0 || raw[0] != '"' {
		return "", false
	}
	var value string
	if json.Unmarshal(raw, &value) != nil || value == "" {
		return "", false
	}
	return value, true
}

func textAnd(source fields, name string, ok bool) (string, bool) {
	value, found := text(source, name)
	return value, ok && found
}

func flagAnd(source fields, name string, ok bool) (bool, bool) {
	switch string(bytes.TrimSpace(source[name])) {
	case "true":
		return true, ok
	case "false":
		return false, ok
	}
	return false, false
}

// loneSurrogate reports whether a JSON string escapes a UTF-16 surrogate
// that isn't part of a pair. encoding/json silently replaces one with U+FFFD,
// but the contract rejects it.
func loneSurrogate(literal json.RawMessage) bool {
	for index := 0; index < len(literal); index++ {
		if literal[index] != '\\' {
			continue
		}
		index++
		if index >= len(literal) || literal[index] != 'u' {
			continue
		}
		unit, ok := escapedUnit(literal, index+1)
		if !ok {
			return false
		}
		index += 4
		switch {
		case unit >= 0xDC00 && unit <= 0xDFFF:
			return true
		case unit >= 0xD800 && unit <= 0xDBFF:
			if index+2 >= len(literal) || literal[index+1] != '\\' || literal[index+2] != 'u' {
				return true
			}
			low, ok := escapedUnit(literal, index+3)
			if !ok || low < 0xDC00 || low > 0xDFFF {
				return true
			}
			index += 6
		}
	}
	return false
}

func escapedUnit(literal json.RawMessage, start int) (uint64, bool) {
	if start+4 > len(literal) {
		return 0, false
	}
	unit, err := strconv.ParseUint(string(literal[start:start+4]), 16, 16)
	return unit, err == nil
}
