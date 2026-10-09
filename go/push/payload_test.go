package push_test

import (
	"encoding/json"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/ConvoHop/sdks/go/push"
)

const ellipsis = "\u2026"

// textOf returns a built request's visible title and body.
func textOf(t *testing.T, builder string, got result) (title, body string) {
	t.Helper()
	payload := payloadOf(t, got)
	fields, _ := payload["convohop"].(map[string]any)
	switch builder {
	case "fcm":
		fields = payload
	case "apnsAlert":
		fields, _ = payload["aps"].(map[string]any)["alert"].(map[string]any)
	}
	title, _ = fields["title"].(string)
	body, _ = fields["body"].(string)
	return title, body
}

func TestCanonicalStrings(t *testing.T) {
	// JSON.stringify escapes only quotation marks, backslashes and control
	// characters, unlike encoding/json.
	title := "a\"\\\b\f\n\r\t\x01\x1f\x7f<>&\u2028\U0001F600"
	want := `"a\"\\\b\f\n\r\t\u0001\u001f` + "\x7f<>&\u2028\U0001F600" + `"`
	if got := stringify(title); got != want {
		t.Fatalf("stringify() = %s; want %s", got, want)
	}
	body := "Body " + title
	for _, builder := range builders {
		got := builder.build(validCall(), bundleID, at(now), push.WithTitle(title), push.WithBody(body))
		if got.err != nil || got.request == nil {
			t.Fatalf("%s = %v, %v; want a request", builder.name, got.request, got.err)
		}
		encoded := string(got.measured)
		if request, ok := got.request.(*push.FCMRequest); ok {
			encoded = request.Message.Data["convohop"]
		}
		for _, member := range []string{`"title":` + want + `,"body":` + stringify(body)} {
			if !strings.Contains(encoded, member) {
				t.Errorf("%s payload %s doesn't contain %s", builder.name, encoded, member)
			}
		}
		if gotTitle, gotBody := textOf(t, builder.name, got); gotTitle != title || gotBody != body {
			t.Errorf("%s text = %q, %q; want %q, %q", builder.name, gotTitle, gotBody, title, body)
		}
	}
}

func TestTruncation(t *testing.T) {
	long := strings.Repeat("b", 6000)
	prefix := func(name, text, original string) {
		t.Helper()
		if kept, ok := strings.CutSuffix(text, ellipsis); !ok || kept == "" || !strings.HasPrefix(original, kept) {
			t.Errorf("%s = %q; want a prefix of the original and an ellipsis", name, text)
		}
	}
	for _, builder := range builders {
		event := validMessage()
		if builder.name == "apnsVoip" {
			event = validCall()
		}
		// Each byte of the text takes one byte of the measured JSON, so the
		// longest prefix that fits reaches the limit exactly.
		got := builder.build(event, bundleID, at(now), push.WithTitle("Grace"), push.WithBody(long))
		title, body := textOf(t, builder.name, got)
		if title != "Grace" {
			t.Errorf("%s title = %q; want Grace", builder.name, title)
		}
		prefix(builder.name+" body", body, long)
		if len(got.measured) != builder.limit {
			t.Errorf("%s measures %d bytes; want %d", builder.name, len(got.measured), builder.limit)
		}
		// The body becomes just an ellipsis before the title shortens.
		got = builder.build(event, bundleID, at(now), push.WithTitle(long), push.WithBody(long))
		title, body = textOf(t, builder.name, got)
		if body != ellipsis {
			t.Errorf("%s body = %q; want an ellipsis", builder.name, body)
		}
		prefix(builder.name+" title", title, long)
		if len(got.measured) != builder.limit {
			t.Errorf("%s with a long title measures %d bytes; want %d", builder.name, len(got.measured), builder.limit)
		}
	}
}

func TestTruncationMeasuresEscapes(t *testing.T) {
	// Quotation marks and backslashes take two bytes in the data and four in
	// the measured JSON, which escapes the data again.
	original := strings.Repeat(`"\`, 1500)
	request, err := push.FCM(validMessage(), at(now), push.WithBody(original))
	if err != nil || request == nil {
		t.Fatalf("FCM() = %v, %v; want a request", request, err)
	}
	data := request.Message.Data["convohop"]
	var fields struct {
		Body string `json:"body"`
	}
	if err := json.Unmarshal([]byte(data), &fields); err != nil {
		t.Fatal(err)
	}
	kept, ok := strings.CutSuffix(fields.Body, ellipsis)
	if !ok || kept == "" || !strings.HasPrefix(original, kept) {
		t.Fatalf("body = %q; want a prefix of the original and an ellipsis", fields.Body)
	}
	if size := len(`{"convohop":` + stringify(data) + `}`); size > 4096 || size != len(fcmMeasured(request.Message.Data)) {
		t.Errorf("FCM data measures %d bytes; want at most 4096", size)
	}
	// One more character doesn't fit.
	longer := strings.Replace(data, `"body":`+stringify(fields.Body), `"body":`+stringify(original[:len(kept)+1]+ellipsis), 1)
	if longer == data {
		t.Fatal("the data doesn't contain the body")
	}
	if size := len(`{"convohop":` + stringify(longer) + `}`); size <= 4096 {
		t.Errorf("a body one character longer measures %d bytes; want more than 4096", size)
	}

	// Truncation keeps whole code points.
	emoji := strings.Repeat("\U0001F600", 1500)
	webPush, err := push.WebPush(validMessage(), at(now), push.WithBody(emoji))
	if err != nil || webPush == nil {
		t.Fatalf("WebPush() = %v, %v; want a request", webPush, err)
	}
	var payload struct {
		Convohop struct {
			Body string `json:"body"`
		} `json:"convohop"`
	}
	if err := json.Unmarshal(webPush.Payload, &payload); err != nil {
		t.Fatal(err)
	}
	kept, ok = strings.CutSuffix(payload.Convohop.Body, ellipsis)
	if !ok || kept == "" || !utf8.ValidString(kept) || !strings.HasPrefix(emoji, kept) {
		t.Errorf("Web Push body = %q; want whole code points and an ellipsis", payload.Convohop.Body)
	}
	if size := len(webPush.Payload); size > 3993 || size+len("\U0001F600") <= 3993 {
		t.Errorf("Web Push payload is %d bytes; want the longest that fits in 3993", size)
	}
}
