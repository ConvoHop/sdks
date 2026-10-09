package push

import (
	"errors"
	"strconv"

	"github.com/ConvoHop/sdks/go/webhooks"
)

const ellipsis = "\u2026"

// member is an object member whose value is already encoded.
type member struct {
	name  string
	value []byte
}

func stringMember(name, value string) member { return member{name, appendString(nil, value)} }

// object encodes members in order as compact JSON.
func object(members ...member) []byte {
	encoded := []byte{'{'}
	for index, m := range members {
		if index > 0 {
			encoded = append(encoded, ',')
		}
		encoded = append(appendString(encoded, m.name), ':')
		encoded = append(encoded, m.value...)
	}
	return append(encoded, '}')
}

// appendString encodes a valid UTF-8 string as JavaScript's JSON.stringify
// does, the contract's canonical form: it escapes only quotation marks,
// backslashes and control characters.
func appendString(encoded []byte, value string) []byte {
	const hex = "0123456789abcdef"
	encoded = append(encoded, '"')
	for index := 0; index < len(value); index++ {
		switch character := value[index]; character {
		case '"', '\\':
			encoded = append(encoded, '\\', character)
		case '\b':
			encoded = append(encoded, '\\', 'b')
		case '\f':
			encoded = append(encoded, '\\', 'f')
		case '\n':
			encoded = append(encoded, '\\', 'n')
		case '\r':
			encoded = append(encoded, '\\', 'r')
		case '\t':
			encoded = append(encoded, '\\', 't')
		default:
			if character < 0x20 {
				encoded = append(encoded, '\\', 'u', '0', '0', hex[character>>4], hex[character&0xf])
			} else {
				encoded = append(encoded, character)
			}
		}
	}
	return append(encoded, '"')
}

// data encodes the convohop metadata: the event's fields without subjectRef,
// connected and preview, then the visible title and body when they are set.
func data(event *webhooks.Notification, t text) []byte {
	members := []member{
		stringMember("eventId", event.EventID),
		stringMember("eventType", event.EventType),
		stringMember("occurredAt", event.OccurredAt),
		stringMember("projectId", event.ProjectID),
		stringMember("recipientId", event.RecipientID),
		stringMember("conversationId", event.ConversationID),
		stringMember("senderId", event.SenderID),
	}
	if event.EventType == webhooks.EventNotificationMessage {
		members = append(members, stringMember("messageId", event.MessageID))
	} else {
		members = append(members,
			stringMember("liveSessionId", event.LiveSessionID),
			stringMember("alertId", event.AlertID),
			stringMember("expiresAt", event.ExpiresAt),
			stringMember("mediaProfile", event.MediaProfile))
		if event.EventType == webhooks.EventNotificationCallCancelled {
			members = append(members, stringMember("reason", event.Reason))
		}
	}
	if t.title != "" {
		members = append(members, stringMember("title", t.title))
	}
	if t.body != "" {
		members = append(members, stringMember("body", t.body))
	}
	return object(members...)
}

// fit returns the text with the body and then the title shortened while the
// measured size exceeds limit: each becomes its longest code-point prefix that
// fits followed by an ellipsis, or just the ellipsis when no prefix fits.
func fit(limit int, input text, size func(text) int) (text, error) {
	current := input
	for _, field := range []func(*text) *string{
		func(t *text) *string { return &t.body },
		func(t *text) *string { return &t.title },
	} {
		if size(current) <= limit {
			return current, nil
		}
		original := *field(&current)
		if original == "" {
			continue
		}
		// cuts[n] is the byte length of the first n code points. A prefix
		// of more than limit code points is more than limit bytes, so it
		// never fits.
		var cuts []int
		for index := range original {
			if len(cuts) == limit+1 {
				break
			}
			cuts = append(cuts, index)
		}
		base := current
		shortened := func(count int) text {
			t := base
			*field(&t) = original[:cuts[count]] + ellipsis
			return t
		}
		low, high, best := 0, len(cuts)-1, 0
		for low <= high {
			middle := int(uint(low+high) >> 1)
			if size(shortened(middle)) <= limit {
				best, low = middle, middle+1
			} else {
				high = middle - 1
			}
		}
		current = shortened(best)
	}
	if size(current) > limit {
		// Valid events' metadata always fits.
		return text{}, errors.New("convohop push: notification metadata exceeds " + strconv.Itoa(limit) + " bytes")
	}
	return current, nil
}
