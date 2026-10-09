package webhooks_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/ConvoHop/sdks/go/internal/spectest"
	"github.com/ConvoHop/sdks/go/webhooks"
)

const (
	eventID        = "0b3c5d7e-9f1a-4b2c-8d3e-4f5a6b7c8d9e"
	projectID      = "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d"
	recipientID    = "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c"
	conversationID = "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c"
	senderID       = "c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a"
	messageID      = "d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d"
	liveSessionID  = "4e5f6a7b-8c9d-4e0f-a1b2-c3d4e5f6a7b8"
	alertID        = "f0e1d2c3-b4a5-4968-8776-655443322110"
)

const envelopeFields = `"eventId":"` + eventID + `","occurredAt":"2026-10-10T11:59:55Z","projectId":"` + projectID + `"`

// message returns a notification.message envelope with raw extra members.
func message(extra string) string {
	return `{"eventId":"` + eventID + `","eventType":"notification.message","occurredAt":"2026-10-10T11:59:55Z",` +
		`"projectId":"` + projectID + `","subjectRef":{"id":"` + messageID + `","kind":"message"},` +
		`"recipientId":"` + recipientID + `","conversationId":"` + conversationID + `","senderId":"` + senderID + `",` +
		`"messageId":"` + messageID + `"` + extra + `}`
}

// call returns a call or cancellation envelope with raw extra members.
func call(eventType, extra string) string {
	return `{"eventId":"` + eventID + `","eventType":"` + eventType + `","occurredAt":"2026-10-10T11:59:55Z",` +
		`"projectId":"` + projectID + `","subjectRef":{"id":"` + liveSessionID + `","kind":"liveSession"},` +
		`"recipientId":"` + recipientID + `","conversationId":"` + conversationID + `","senderId":"` + senderID + `",` +
		`"liveSessionId":"` + liveSessionID + `","alertId":"` + alertID + `","expiresAt":"2026-10-10T12:00:25Z",` +
		`"mediaProfile":"AUDIO_ONLY"` + extra + `}`
}

func verifyEvent(t *testing.T, body string) (webhooks.Event, error) {
	t.Helper()
	delivery, err := webhooks.Verify([]byte(body), signed([]byte(body)), testSecrets, at(testStamp))
	if err == nil && (delivery.WebhookID != testID || delivery.Timestamp != testStamp) {
		t.Fatalf("Verify() signature = %+v", delivery.Signature)
	}
	return delivery.Event, err
}

func TestResourceEvents(t *testing.T) {
	for _, eventType := range []string{
		webhooks.EventConversationCreated, webhooks.EventConversationUpdated, webhooks.EventMemberAdded,
		webhooks.EventMemberRoleChanged, webhooks.EventMemberHistoryExpanded, webhooks.EventMemberRemoved,
		webhooks.EventMemberBroadcastPermissionChanged, webhooks.EventMessageCreated, webhooks.EventMessageEdited,
		webhooks.EventMessageDeleted, webhooks.EventReceiptReported, webhooks.EventLiveStarted,
		webhooks.EventLiveParticipationChanged, webhooks.EventLiveAlerted, webhooks.EventLiveReady,
		webhooks.EventLiveConnected, webhooks.EventLiveEnded,
	} {
		body := `{"eventType":"` + eventType + `",` + envelopeFields + `,"subjectRef":{"id":"x","kind":"conversation","more":1},"extra":[1]}`
		event, err := verifyEvent(t, body)
		want := webhooks.Event{EventID: eventID, EventType: eventType, OccurredAt: "2026-10-10T11:59:55Z",
			ProjectID: projectID, SubjectRef: webhooks.SubjectRef{ID: "x", Kind: "conversation"}, Known: true}
		if err != nil || !reflect.DeepEqual(event, want) {
			t.Errorf("%s: Verify() = %+v, %v; want %+v", eventType, event, err, want)
		}
	}
}

func TestOtherEvents(t *testing.T) {
	for _, test := range []struct {
		eventType, kind string
		known           bool
	}{
		{webhooks.EventWebhookEndpointDisabled, "webhookEndpoint", true},
		{webhooks.EventWebhookEndpointDisabled, "conversation", false},
		{"conversation.archived", "conversation", false},
		{"notification.typing", "conversation", false},
	} {
		body := `{"eventType":"` + test.eventType + `",` + envelopeFields + `,"subjectRef":{"id":"x","kind":"` + test.kind + `"}}`
		event, err := verifyEvent(t, body)
		if err != nil || event.Known != test.known || event.EventType != test.eventType || event.Notification != nil {
			t.Errorf("%s/%s: Verify() = %+v, %v; want known %t", test.eventType, test.kind, event, err, test.known)
		}
	}
}

func TestEnvelopeFailures(t *testing.T) {
	resource := func(replace, with string) string {
		body := `{"eventType":"message.created",` + envelopeFields + `,"subjectRef":{"id":"x","kind":"message"}}`
		if !strings.Contains(body, replace) {
			t.Fatalf("%q isn't in %s", replace, body)
		}
		return strings.Replace(body, replace, with, 1)
	}
	for name, body := range map[string]string{
		"empty":                "",
		"truncated":            `{"eventType":`,
		"trailing value":       resource("", "") + " {}",
		"invalid UTF-8":        resource(`"x"`, "\"\xff\""),
		"two byte order marks": "\ufeff\ufeff" + resource("", ""),
		"single quotes":        `{'eventType':'message.created'}`,
	} {
		if _, err := verifyEvent(t, body); err == nil || err.Error() != "convohop webhooks: INVALID_BODY: Webhook body is not UTF-8 JSON" {
			t.Errorf("%s: Verify() error = %v; want the body isn't UTF-8 JSON", name, err)
		}
	}
	for name, body := range map[string]string{
		"array":              `[]`,
		"null":               `null`,
		"string":             `"message.created"`,
		"number":             `1`,
		"missing type":       resource(`"eventType":"message.created",`, ""),
		"empty type":         resource(`"message.created"`, `""`),
		"numeric type":       resource(`"message.created"`, `1`),
		"missing event ID":   resource(`"eventId":"`+eventID+`",`, ""),
		"null event ID":      resource(`"`+eventID+`"`, `null`),
		"empty occurredAt":   resource(`"2026-10-10T11:59:55Z"`, `""`),
		"missing project":    resource(`,"projectId":"`+projectID+`"`, ""),
		"missing subject":    resource(`,"subjectRef":{"id":"x","kind":"message"}`, ""),
		"null subject":       resource(`{"id":"x","kind":"message"}`, `null`),
		"array subject":      resource(`{"id":"x","kind":"message"}`, `["x","message"]`),
		"empty subject ID":   resource(`"id":"x"`, `"id":""`),
		"numeric kind":       resource(`"kind":"message"`, `"kind":1`),
		"case-varied name":   resource(`"eventType"`, `"EventType"`),
		"last duplicate bad": resource(`}}`, `},"eventType":""}`),
	} {
		if _, err := verifyEvent(t, body); err == nil || err.Error() != "convohop webhooks: INVALID_BODY: Webhook body is not a ConvoHop event envelope" {
			t.Errorf("%s: Verify() error = %v; want not an envelope", name, err)
		}
		// VerifySignature doesn't parse the body.
		if _, err := webhooks.VerifySignature([]byte(body), signed([]byte(body)), testSecrets, at(testStamp)); err != nil {
			t.Errorf("%s: VerifySignature() error = %v; want none", name, err)
		}
	}
}

func TestBodyDecoding(t *testing.T) {
	body := `{"eventType":"message.created",` + envelopeFields + `,"subjectRef":{"id":"x","kind":"message"}}`
	for name, variant := range map[string]string{
		"byte order mark": "\ufeff" + body,
		"whitespace":      " \r\n\t" + strings.ReplaceAll(body, ",", " ,\n ") + "\n ",
		"last duplicate":  strings.TrimSuffix(strings.Replace(body, `"message.created"`, `"bogus"`, 1), "}") + `,"eventType":"message.created"}`,
		"escaped names":   strings.Replace(body, `"eventType"`, `"event\u0054ype"`, 1),
	} {
		event, err := verifyEvent(t, variant)
		if err != nil || !event.Known || event.EventType != webhooks.EventMessageCreated || event.SubjectRef.ID != "x" {
			t.Errorf("%s: Verify() = %+v, %v; want a known message.created event", name, event, err)
		}
	}
}

func TestNotificationVectors(t *testing.T) {
	var file struct {
		Vectors []struct {
			ID            string                     `json:"id"`
			Event         json.RawMessage            `json:"event"`
			UnknownFields map[string]json.RawMessage `json:"unknownFields"`
		} `json:"vectors"`
		InvalidEvents []struct {
			ID    string          `json:"id"`
			Event json.RawMessage `json:"event"`
		} `json:"invalidEvents"`
	}
	if err := json.Unmarshal(spectest.Read(t, "push-payload/vectors.json"), &file); err != nil {
		t.Fatal(err)
	}
	if len(file.Vectors) == 0 || len(file.InvalidEvents) == 0 {
		t.Fatal("the push payload vectors are empty")
	}
	for _, vector := range file.Vectors {
		var want map[string]any
		if err := json.Unmarshal(vector.Event, &want); err != nil {
			t.Fatal(err)
		}
		bodies := []string{compact(t, vector.Event)}
		if vector.UnknownFields != nil {
			bodies = append(bodies, withMembers(t, bodies[0], vector.UnknownFields))
		}
		for _, body := range bodies {
			event, err := verifyEvent(t, body)
			if err != nil || !event.Known || event.Notification == nil {
				t.Errorf("%s: Verify() = %+v, %v; want a known notification", vector.ID, event, err)
				continue
			}
			var got map[string]any
			if err := json.Unmarshal(marshal(t, event.Notification), &got); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, want) {
				t.Errorf("%s: Notification = %v; want %v", vector.ID, got, want)
			}
			if n := event.Notification; event.EventID != n.EventID || event.EventType != n.EventType ||
				event.SubjectRef != n.SubjectRef || event.ProjectID != n.ProjectID || event.OccurredAt != n.OccurredAt {
				t.Errorf("%s: the envelope %+v doesn't match its notification", vector.ID, event)
			}
		}
	}
	for _, invalid := range file.InvalidEvents {
		var envelope struct {
			EventType string `json:"eventType"`
		}
		if err := json.Unmarshal(invalid.Event, &envelope); err != nil {
			t.Fatal(err)
		}
		event, err := verifyEvent(t, compact(t, invalid.Event))
		if err != nil || event.Known || event.Notification != nil || event.EventType != envelope.EventType {
			t.Errorf("%s: Verify() = %+v, %v; want an unknown %s event", invalid.ID, event, err, envelope.EventType)
		}
	}
}

func compact(t *testing.T, raw json.RawMessage) string {
	t.Helper()
	var buffer bytes.Buffer
	if err := json.Compact(&buffer, raw); err != nil {
		t.Fatal(err)
	}
	return buffer.String()
}

// withMembers inserts raw members before an object's closing brace, keeping
// the body's bytes as they are.
func withMembers(t *testing.T, body string, members map[string]json.RawMessage) string {
	t.Helper()
	names := make([]string, 0, len(members))
	for name := range members {
		names = append(names, name)
	}
	sort.Strings(names)
	extra := ""
	for _, name := range names {
		extra += "," + string(marshal(t, name)) + ":" + compact(t, members[name])
	}
	return strings.TrimSuffix(body, "}") + extra + "}"
}

func marshal(t *testing.T, value any) []byte {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return encoded
}

func TestNotificationParsing(t *testing.T) {
	smiles := strings.Repeat("\U0001F600", 512)
	for _, test := range []struct {
		name  string
		body  string
		check func(*webhooks.Notification) bool
	}{
		{"message", message(`,"connected":true`), func(n *webhooks.Notification) bool {
			return n.Connected && n.MessageID == messageID && n.Preview == nil
		}},
		{"surrogate pair", message(`,"connected":false,"preview":{"text":"\ud83d\ude00","truncated":true}`),
			func(n *webhooks.Notification) bool { return n.Preview.Text == "\U0001F600" && n.Preview.Truncated }},
		{"escaped backslash", message(`,"connected":false,"preview":{"text":"a\\ud800","truncated":false}`),
			func(n *webhooks.Notification) bool { return n.Preview.Text == `a\ud800` }},
		{"512 code points", message(`,"connected":false,"preview":{"text":"` + smiles + `","truncated":false}`),
			func(n *webhooks.Notification) bool { return n.Preview.Text == strings.Repeat("\U0001F600", 512) }},
		{"preview members", message(`,"connected":false,"preview":{"truncated":false,"text":"x","more":1}`),
			func(n *webhooks.Notification) bool { return n.Preview.Text == "x" }},
		{"message ignores call fields", message(`,"connected":false,"alertId":"x","reason":1,"mediaProfile":null`),
			func(n *webhooks.Notification) bool { return n.AlertID == "" && n.Reason == "" && n.MediaProfile == "" }},
		{"call", call(webhooks.EventNotificationCall, `,"connected":true`), func(n *webhooks.Notification) bool {
			return n.LiveSessionID == liveSessionID && n.AlertID == alertID && n.ExpiresAt == "2026-10-10T12:00:25Z" &&
				n.MediaProfile == webhooks.MediaProfileAudioOnly && n.Reason == ""
		}},
		{"call ignores message fields", call(webhooks.EventNotificationCall, `,"connected":true,"preview":{"text":""},"messageId":1,"reason":"-"`),
			func(n *webhooks.Notification) bool { return n.Preview == nil && n.MessageID == "" && n.Reason == "" }},
		{"cancellation", call(webhooks.EventNotificationCallCancelled, `,"connected":false,"reason":"answered"`),
			func(n *webhooks.Notification) bool { return n.Reason == webhooks.ReasonAnswered }},
	} {
		event, err := verifyEvent(t, test.body)
		if err != nil || !event.Known || event.Notification == nil || !test.check(event.Notification) {
			t.Errorf("%s: Verify() = %+v, %v", test.name, event, err)
		}
	}
	for name, body := range map[string]string{
		"lone high surrogate":      message(`,"connected":false,"preview":{"text":"\ud83d","truncated":false}`),
		"lone low surrogate":       message(`,"connected":false,"preview":{"text":"a\ude00","truncated":false}`),
		"high then other":          message(`,"connected":false,"preview":{"text":"\ud83d\u0041","truncated":false}`),
		"two high surrogates":      message(`,"connected":false,"preview":{"text":"\ud83d\ud83d\ude00","truncated":false}`),
		"backslash then lone":      message(`,"connected":false,"preview":{"text":"\\\ud83d","truncated":false}`),
		"513 code points":          message(`,"connected":false,"preview":{"text":"x` + smiles + `","truncated":false}`),
		"empty preview":            message(`,"connected":false,"preview":{"text":"","truncated":false}`),
		"null preview":             message(`,"connected":false,"preview":null`),
		"array preview":            message(`,"connected":false,"preview":["x",false]`),
		"string truncated":         message(`,"connected":false,"preview":{"text":"x","truncated":"false"}`),
		"missing truncated":        message(`,"connected":false,"preview":{"text":"x"}`),
		"numeric text":             message(`,"connected":false,"preview":{"text":1,"truncated":false}`),
		"missing connected":        message(``),
		"numeric connected":        message(`,"connected":1`),
		"string connected":         message(`,"connected":"true"`),
		"null connected":           message(`,"connected":null`),
		"case-varied name":         strings.Replace(message(`,"connected":false`), `"messageId"`, `"MessageId"`, 1),
		"numeric message ID":       strings.Replace(message(`,"connected":false`), `"messageId":"`+messageID+`"`, `"messageId":1`, 1),
		"call without media":       strings.Replace(call(webhooks.EventNotificationCall, `,"connected":false`), `,"mediaProfile":"AUDIO_ONLY"`, "", 1),
		"cancellation reason type": call(webhooks.EventNotificationCallCancelled, `,"connected":false,"reason":true`),
		"invalid field value":      call(webhooks.EventNotificationCall, `,"connected":false,"alertId":"x"`),
	} {
		event, err := verifyEvent(t, body)
		if err != nil || event.Known || event.Notification != nil {
			t.Errorf("%s: Verify() = %+v, %v; want an unknown event", name, event, err)
		}
	}
}

func validMessage() *webhooks.Notification {
	return &webhooks.Notification{
		EventID: eventID, EventType: webhooks.EventNotificationMessage, OccurredAt: "2026-10-10T11:59:55Z",
		ProjectID: projectID, SubjectRef: webhooks.SubjectRef{ID: messageID, Kind: "message"},
		RecipientID: recipientID, ConversationID: conversationID, SenderID: senderID,
		MessageID: messageID, Preview: &webhooks.Preview{Text: "Hello", Truncated: true},
	}
}

func validCall(eventType string) *webhooks.Notification {
	n := &webhooks.Notification{
		EventID: eventID, EventType: eventType, OccurredAt: "2026-10-10T11:59:55Z",
		ProjectID: projectID, SubjectRef: webhooks.SubjectRef{ID: liveSessionID, Kind: "liveSession"},
		RecipientID: recipientID, ConversationID: conversationID, SenderID: senderID, Connected: true,
		LiveSessionID: liveSessionID, AlertID: alertID, ExpiresAt: "2026-10-10T12:00:25+00:00",
		MediaProfile: webhooks.MediaProfileAudioVideo,
	}
	if eventType == webhooks.EventNotificationCallCancelled {
		n.Reason = webhooks.ReasonDeclined
	}
	return n
}

func TestValidate(t *testing.T) {
	cancelled := webhooks.EventNotificationCallCancelled
	identifier := " must be an ASCII letter followed by up to 63 ASCII letters, digits or _"
	for _, test := range []struct {
		name   string
		event  *webhooks.Notification
		mutate func(*webhooks.Notification)
		want   string
	}{
		{"message", validMessage(), func(*webhooks.Notification) {}, ""},
		{"no preview", validMessage(), func(n *webhooks.Notification) { n.Preview = nil }, ""},
		{"512 code points", validMessage(), func(n *webhooks.Notification) { n.Preview.Text = strings.Repeat("\U0001F600", 512) }, ""},
		{"call", validCall(webhooks.EventNotificationCall), func(*webhooks.Notification) {}, ""},
		{"cancellation", validCall(cancelled), func(*webhooks.Notification) {}, ""},
		{"undefined fields", validMessage(), func(n *webhooks.Notification) { n.AlertID, n.Reason, n.MediaProfile = "x", "-", "-" }, ""},
		{"undefined call fields", validCall(webhooks.EventNotificationCall), func(n *webhooks.Notification) {
			n.Preview, n.MessageID, n.Reason = &webhooks.Preview{}, "x", "-"
		}, ""},
		{"nil", nil, func(*webhooks.Notification) {}, "event must not be nil"},
		{"event type", validMessage(), func(n *webhooks.Notification) { n.EventType = webhooks.EventMessageCreated },
			"eventType must be a notification event type"},
		{"event ID", validMessage(), func(n *webhooks.Notification) { n.EventID = strings.ToUpper(eventID) },
			"eventId must be a lowercase, non-nil UUID"},
		{"first invalid field", validMessage(), func(n *webhooks.Notification) { n.SenderID, n.ProjectID = "", "" },
			"projectId must be a lowercase, non-nil UUID"},
		{"occurredAt", validMessage(), func(n *webhooks.Notification) { n.OccurredAt = "2026-02-30T00:00:00Z" },
			"occurredAt must be an RFC 3339 timestamp"},
		{"recipient", validMessage(), func(n *webhooks.Notification) { n.RecipientID = "00000000-0000-0000-0000-000000000000" },
			"recipientId must be a lowercase, non-nil UUID"},
		{"conversation", validMessage(), func(n *webhooks.Notification) { n.ConversationID = "x" },
			"conversationId must be a lowercase, non-nil UUID"},
		{"sender", validMessage(), func(n *webhooks.Notification) { n.SenderID = "" },
			"senderId must be a lowercase, non-nil UUID"},
		{"message ID", validMessage(), func(n *webhooks.Notification) { n.MessageID = "" },
			"messageId must be a lowercase, non-nil UUID"},
		{"message subject kind", validMessage(), func(n *webhooks.Notification) { n.SubjectRef.Kind = "liveSession" },
			"subjectRef must be the message the event names"},
		{"message subject ID", validMessage(), func(n *webhooks.Notification) { n.SubjectRef.ID = alertID },
			"subjectRef must be the message the event names"},
		{"empty preview", validMessage(), func(n *webhooks.Notification) { n.Preview.Text = "" },
			"preview.text must be 1 to 512 Unicode code points"},
		{"invalid UTF-8 preview", validMessage(), func(n *webhooks.Notification) { n.Preview.Text = "a\xffb" },
			"preview.text must be 1 to 512 Unicode code points"},
		{"513 code points", validMessage(), func(n *webhooks.Notification) { n.Preview.Text = strings.Repeat("\u00e9", 513) },
			"preview.text must be 1 to 512 Unicode code points"},
		{"live session", validCall(webhooks.EventNotificationCall), func(n *webhooks.Notification) { n.LiveSessionID = "" },
			"liveSessionId must be a lowercase, non-nil UUID"},
		{"call subject", validCall(cancelled), func(n *webhooks.Notification) { n.SubjectRef.Kind = "message" },
			"subjectRef must be the liveSession the event names"},
		{"alert", validCall(webhooks.EventNotificationCall), func(n *webhooks.Notification) { n.AlertID = "x" },
			"alertId must be a lowercase, non-nil UUID"},
		{"expiresAt", validCall(cancelled), func(n *webhooks.Notification) { n.ExpiresAt = "2026-10-10T12:00:25" },
			"expiresAt must be an RFC 3339 timestamp"},
		{"media profile", validCall(webhooks.EventNotificationCall), func(n *webhooks.Notification) { n.MediaProfile = "AUDIO-ONLY" },
			"mediaProfile" + identifier},
		{"reason", validCall(cancelled), func(n *webhooks.Notification) { n.Reason = "" }, "reason" + identifier},
	} {
		if test.event != nil {
			test.mutate(test.event)
		}
		err := test.event.Validate()
		if (err == nil) != (test.want == "") || (err != nil && err.Error() != test.want) {
			t.Errorf("%s: Validate() = %v; want %q", test.name, err, test.want)
		}
		var failure *webhooks.Error
		if errors.As(err, &failure) {
			t.Errorf("%s: Validate() returned a verification failure", test.name)
		}
	}
}
