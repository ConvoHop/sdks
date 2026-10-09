package push_test

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/ConvoHop/sdks/go/internal/spectest"
	"github.com/ConvoHop/sdks/go/push"
	"github.com/ConvoHop/sdks/go/webhooks"
)

const bundleID = "com.example.chat"

// webhookKey is a fixture signing key for deliveries in these tests.
var webhookKey = []byte("fixture-key-for-go-push-tests-32")

// result is a builder's outcome: its request, the bytes of the part its
// limit measures, and its error.
type result struct {
	request  any
	measured []byte
	err      error
}

var builders = []struct {
	name  string
	limit int
	build func(event *webhooks.Notification, bundle string, options ...push.Option) result
}{
	{"apnsAlert", 4096, func(event *webhooks.Notification, bundle string, options ...push.Option) result {
		request, err := push.APNSAlert(event, bundle, options...)
		if request == nil {
			return result{err: err}
		}
		return result{request, request.Payload, err}
	}},
	{"apnsVoip", 5120, func(event *webhooks.Notification, bundle string, options ...push.Option) result {
		request, err := push.APNSVoIP(event, bundle, options...)
		if request == nil {
			return result{err: err}
		}
		return result{request, request.Payload, err}
	}},
	{"fcm", 4096, func(event *webhooks.Notification, _ string, options ...push.Option) result {
		request, err := push.FCM(event, options...)
		if request == nil {
			return result{err: err}
		}
		return result{request, fcmMeasured(request.Message.Data), err}
	}},
	{"webPush", 3993, func(event *webhooks.Notification, _ string, options ...push.Option) result {
		request, err := push.WebPush(event, options...)
		if request == nil {
			return result{err: err}
		}
		return result{request, request.Payload, err}
	}},
}

// stringify is ECMAScript's JSON.stringify of a string, the contract's
// canonical JSON.
func stringify(value string) string {
	var out strings.Builder
	out.WriteByte('"')
	for _, r := range value {
		switch r {
		case '"':
			out.WriteString(`\"`)
		case '\\':
			out.WriteString(`\\`)
		case '\b':
			out.WriteString(`\b`)
		case '\f':
			out.WriteString(`\f`)
		case '\n':
			out.WriteString(`\n`)
		case '\r':
			out.WriteString(`\r`)
		case '\t':
			out.WriteString(`\t`)
		default:
			if r < 0x20 {
				fmt.Fprintf(&out, `\u%04x`, r)
			} else {
				out.WriteRune(r)
			}
		}
	}
	out.WriteByte('"')
	return out.String()
}

// fcmMeasured returns FCM data as canonical JSON, the form its limit measures.
func fcmMeasured(data map[string]string) []byte {
	names := make([]string, 0, len(data))
	for name := range data {
		names = append(names, name)
	}
	sort.Strings(names)
	out := []byte{'{'}
	for index, name := range names {
		if index > 0 {
			out = append(out, ',')
		}
		out = append(out, stringify(name)+":"+stringify(data[name])...)
	}
	return append(out, '}')
}

func compact(t *testing.T, raw []byte) []byte {
	t.Helper()
	var buffer bytes.Buffer
	if err := json.Compact(&buffer, raw); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

// delivered returns the event that webhooks.Verify returns for body.
func delivered(t *testing.T, body []byte) webhooks.Event {
	t.Helper()
	const id, stamp = "msg_push", "1767225600"
	mac := hmac.New(sha256.New, webhookKey)
	mac.Write([]byte(id + "." + stamp + "."))
	mac.Write(body)
	header := http.Header{}
	header.Set("webhook-id", id)
	header.Set("webhook-timestamp", stamp)
	header.Set("webhook-signature", "v1,"+base64.StdEncoding.EncodeToString(mac.Sum(nil)))
	secret := "whsec_" + base64.StdEncoding.EncodeToString(webhookKey)
	delivery, err := webhooks.Verify(body, header, []string{secret},
		webhooks.WithClock(func() time.Time { return time.Unix(1767225600, 0) }))
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	return delivery.Event
}

func at(seconds int64) push.Option {
	return push.WithClock(func() time.Time { return time.Unix(seconds, 0) })
}

type vectorFile struct {
	Vectors []struct {
		ID            string                     `json:"id"`
		Event         json.RawMessage            `json:"event"`
		UnknownFields map[string]json.RawMessage `json:"unknownFields"`
		Options       struct {
			BundleID string  `json:"bundleId"`
			Title    *string `json:"title"`
			Body     *string `json:"body"`
			Preview  *bool   `json:"preview"`
		} `json:"options"`
		NowSeconds int64 `json:"nowSeconds"`
		Expected   map[string]*struct {
			Request json.RawMessage `json:"request"`
			Bytes   int             `json:"bytes"`
		} `json:"expected"`
	} `json:"vectors"`
	InvalidEvents []struct {
		ID    string          `json:"id"`
		Event json.RawMessage `json:"event"`
	} `json:"invalidEvents"`
}

func readVectors(t *testing.T) vectorFile {
	t.Helper()
	var file vectorFile
	if err := json.Unmarshal(spectest.Read(t, "push-payload/vectors.json"), &file); err != nil {
		t.Fatal(err)
	}
	if len(file.Vectors) == 0 || len(file.InvalidEvents) == 0 {
		t.Fatal("the push payload vectors are empty")
	}
	return file
}

// withMembers adds raw members to a compact object, keeping its bytes.
func withMembers(t *testing.T, object []byte, members map[string]json.RawMessage) []byte {
	t.Helper()
	names := make([]string, 0, len(members))
	for name := range members {
		names = append(names, name)
	}
	sort.Strings(names)
	out := append([]byte(nil), object[:len(object)-1]...)
	for _, name := range names {
		out = append(out, ","+stringify(name)+":"...)
		out = append(out, compact(t, members[name])...)
	}
	return append(out, '}')
}

func jsonValue(t *testing.T, encoded []byte) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(encoded, &value); err != nil {
		t.Fatal(err)
	}
	return value
}

func TestVectors(t *testing.T) {
	file := readVectors(t)
	for _, vector := range file.Vectors {
		t.Run(vector.ID, func(t *testing.T) {
			options := []push.Option{at(vector.NowSeconds)}
			if title := vector.Options.Title; title != nil {
				options = append(options, push.WithTitle(*title))
			}
			if body := vector.Options.Body; body != nil {
				options = append(options, push.WithBody(*body))
			}
			if preview := vector.Options.Preview; preview != nil && !*preview {
				options = append(options, push.WithoutPreview())
			}
			// The event as webhooks.Verify returns it, with and without
			// unknown fields, and as a caller's own decoding returns it.
			body := compact(t, vector.Event)
			bodies := [][]byte{body}
			if vector.UnknownFields != nil {
				bodies = append(bodies, withMembers(t, body, vector.UnknownFields))
			}
			var events []*webhooks.Notification
			for _, body := range bodies {
				event := delivered(t, body)
				if !event.Known || event.Notification == nil {
					t.Fatalf("Verify() = %+v; want a known notification", event)
				}
				events = append(events, event.Notification)
			}
			decoded := new(webhooks.Notification)
			if err := json.Unmarshal(vector.Event, decoded); err != nil {
				t.Fatal(err)
			}
			events = append(events, decoded)

			for _, builder := range builders {
				expected, ok := vector.Expected[builder.name]
				if !ok {
					t.Fatalf("no expected %s request", builder.name)
				}
				for index, event := range events {
					got := builder.build(event, vector.Options.BundleID, options...)
					name := fmt.Sprintf("%s (event %d)", builder.name, index)
					switch {
					case got.err != nil:
						t.Errorf("%s: error = %v", name, got.err)
						continue
					case expected == nil:
						if got.request != nil {
							t.Errorf("%s = %s; want none", name, encode(t, got.request))
						}
						continue
					case got.request == nil:
						t.Errorf("%s = none; want %s", name, expected.Request)
						continue
					}
					if gotValue, want := jsonValue(t, encode(t, got.request)), jsonValue(t, expected.Request); !reflect.DeepEqual(gotValue, want) {
						t.Errorf("%s = %s; want %s", name, encode(t, got.request), compact(t, expected.Request))
					}
					if len(got.measured) != expected.Bytes || len(got.measured) > builder.limit {
						t.Errorf("%s measures %d bytes; want %d", name, len(got.measured), expected.Bytes)
					}
					// The payload is the canonical JSON itself, in the
					// expected member order and escapes.
					var want struct {
						Payload json.RawMessage `json:"payload"`
						Message struct {
							Data map[string]string `json:"data"`
						} `json:"message"`
					}
					if err := json.Unmarshal(expected.Request, &want); err != nil {
						t.Fatal(err)
					}
					if builder.name == "fcm" {
						if got := got.request.(*push.FCMRequest).Message.Data; !reflect.DeepEqual(got, want.Message.Data) {
							t.Errorf("%s data = %q; want %q", name, got, want.Message.Data)
						}
					} else if !bytes.Equal(got.measured, compact(t, want.Payload)) {
						t.Errorf("%s payload = %s; want %s", name, got.measured, compact(t, want.Payload))
					}
				}
			}
		})
	}
}

func encode(t *testing.T, value any) []byte {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return encoded
}

func TestInvalidEvents(t *testing.T) {
	file := readVectors(t)
	// A Notification can't express these violations: it has no null preview,
	// preview without truncated, or missing or non-boolean connected. A
	// caller's own decoding loses them, so the builders accept the result;
	// webhooks.Verify returns such deliveries as unknown events.
	inexpressible := map[string]bool{
		"preview-null": true, "preview-without-truncated": true, "connected-missing": true, "connected-string": true,
	}
	seen := 0
	for _, invalid := range file.InvalidEvents {
		var event webhooks.Notification
		// connected-string doesn't decode into a bool; the rest still does.
		_ = json.Unmarshal(invalid.Event, &event)
		for _, builder := range builders {
			got := builder.build(&event, bundleID, at(1791633600))
			switch {
			case inexpressible[invalid.ID]:
				if got.err != nil {
					t.Errorf("%s %s: error = %v; want none", invalid.ID, builder.name, got.err)
				}
			case !errors.Is(got.err, push.CodeInvalidEvent) || got.request != nil ||
				!strings.HasPrefix(got.err.Error(), "convohop push: INVALID_EVENT: Invalid notification event: "):
				t.Errorf("%s %s = %v, %v; want %s", invalid.ID, builder.name, got.request, got.err, push.CodeInvalidEvent)
			}
		}
		if inexpressible[invalid.ID] {
			seen++
		}
		if event := delivered(t, compact(t, invalid.Event)); event.Known || event.Notification != nil {
			t.Errorf("%s: Verify() = %+v; want an unknown event", invalid.ID, event)
		}
	}
	if seen != len(inexpressible) {
		t.Errorf("found %d of the %d inexpressible invalid events", seen, len(inexpressible))
	}
}

// now is the fixtures' clock: 2026-10-10T12:00:00Z.
const now = 1791633600

func validMessage() *webhooks.Notification {
	return &webhooks.Notification{
		EventID:        "cccbe606-6dbd-41bb-ad43-c30e0b6b89ad",
		EventType:      webhooks.EventNotificationMessage,
		OccurredAt:     "2026-10-10T11:59:55Z",
		ProjectID:      "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d",
		SubjectRef:     webhooks.SubjectRef{ID: "d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d", Kind: "message"},
		RecipientID:    "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c",
		ConversationID: "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c",
		SenderID:       "c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a",
		MessageID:      "d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d",
	}
}

func validCall() *webhooks.Notification {
	return &webhooks.Notification{
		EventID:        "daff1b70-80d5-4f01-9a3b-e7775b5d70ab",
		EventType:      webhooks.EventNotificationCall,
		OccurredAt:     "2026-10-10T11:59:58Z",
		ProjectID:      "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d",
		SubjectRef:     webhooks.SubjectRef{ID: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b", Kind: "liveSession"},
		RecipientID:    "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c",
		ConversationID: "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c",
		SenderID:       "c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a",
		LiveSessionID:  "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
		AlertID:        "f0e1d2c3-b4a5-4968-8776-655443322110",
		ExpiresAt:      "2026-10-10T12:00:45Z",
		MediaProfile:   webhooks.MediaProfileAudioVideo,
	}
}

func validCancel(reason string) *webhooks.Notification {
	event := validCall()
	event.EventType = webhooks.EventNotificationCallCancelled
	event.Reason = reason
	return event
}

// payloadOf returns a built request's payload, or FCM data, as a JSON value.
func payloadOf(t *testing.T, got result) map[string]any {
	t.Helper()
	if got.err != nil || got.request == nil {
		t.Fatalf("request = %v, %v; want a request", got.request, got.err)
	}
	encoded := got.measured
	if request, ok := got.request.(*push.FCMRequest); ok {
		encoded = []byte(request.Message.Data["convohop"])
	}
	var payload map[string]any
	if err := json.Unmarshal(encoded, &payload); err != nil {
		t.Fatal(err)
	}
	return payload
}
