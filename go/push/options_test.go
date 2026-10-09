package push_test

import (
	"errors"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/ConvoHop/sdks/go/push"
	"github.com/ConvoHop/sdks/go/webhooks"
)

// checkError fails unless got is exactly an [*push.Error] with code and
// message, and no request.
func checkError(t *testing.T, name string, got result, code push.Code, message string) {
	t.Helper()
	other := push.CodeInvalidEvent
	if code == push.CodeInvalidEvent {
		other = push.CodeInvalidOptions
	}
	var err *push.Error
	switch {
	case got.request != nil:
		t.Errorf("%s returned a request and %v", name, got.err)
	case !errors.As(got.err, &err):
		t.Errorf("%s error = %v; want a *push.Error", name, got.err)
	case err.Code != code || err.Message != message:
		t.Errorf("%s error = %v; want %s: %s", name, got.err, code, message)
	case !errors.Is(got.err, code) || errors.Is(got.err, other):
		t.Errorf("%s: errors.Is(%v) doesn't match only %s", name, got.err, code)
	case got.err.Error() != "convohop push: "+string(code)+": "+message:
		t.Errorf("%s Error() = %q", name, got.err)
	}
}

func TestCodes(t *testing.T) {
	for code, want := range map[push.Code]string{
		push.CodeInvalidOptions: "convohop push: INVALID_OPTIONS",
		push.CodeInvalidEvent:   "convohop push: INVALID_EVENT",
	} {
		if got := code.Error(); got != want {
			t.Errorf("%s.Error() = %q; want %q", string(code), got, want)
		}
	}
}

func TestOptionErrors(t *testing.T) {
	for _, test := range []struct {
		name    string
		options []push.Option
		message string
	}{
		{"nil option", []push.Option{nil}, "nil option"},
		{"nil clock", []push.Option{push.WithClock(nil)}, "WithClock requires a clock"},
		{"the first option error", []push.Option{push.WithClock(nil), nil}, "WithClock requires a clock"},
		{"an option error before the text", []push.Option{push.WithTitle("\xff"), nil}, "nil option"},
		{"title", []push.Option{push.WithTitle("Grace \xff")}, "title must be valid UTF-8"},
		{"title with a surrogate", []push.Option{push.WithTitle("\xed\xa0\x80")}, "title must be valid UTF-8"},
		{"body", []push.Option{push.WithBody("See you \xed\xb0\x80")}, "body must be valid UTF-8"},
		{"title before body", []push.Option{push.WithBody("\xff"), push.WithTitle("\xff")}, "title must be valid UTF-8"},
		{"the last title", []push.Option{push.WithTitle("Grace"), push.WithTitle("\xc0\xaf")}, "title must be valid UTF-8"},
	} {
		t.Run(test.name, func(t *testing.T) {
			// Options come before the bundle ID and the event.
			for _, builder := range builders {
				for _, event := range []*webhooks.Notification{validMessage(), nil} {
					for _, bundle := range []string{bundleID, ""} {
						checkError(t, builder.name, builder.build(event, bundle, test.options...),
							push.CodeInvalidOptions, test.message)
					}
				}
			}
		})
	}
}

func TestBundleID(t *testing.T) {
	invalid := []string{"", "com..example", "com.example.", ".com", "com.exa_mple", "com.example chat",
		"com.ex\u00e4mple", "com.example.chat\n", strings.Repeat("a", 156)}
	for _, builder := range builders {
		if !strings.HasPrefix(builder.name, "apns") {
			continue
		}
		for _, bundle := range invalid {
			// The bundle ID comes before the event.
			for _, event := range []*webhooks.Notification{validCall(), nil} {
				checkError(t, builder.name+" "+strconv.Quote(bundle), builder.build(event, bundle, at(now)),
					push.CodeInvalidOptions, "bundleID must be an app bundle ID")
			}
		}
		// The text comes before the bundle ID.
		checkError(t, builder.name, builder.build(validCall(), "", push.WithBody("\xff")),
			push.CodeInvalidOptions, "body must be valid UTF-8")
	}
	for _, bundle := range []string{"com.example.chat", "com.example-app.Chat1", "a", strings.Repeat("a", 155),
		strings.Repeat("a.", 77) + "a"} {
		alert, err := push.APNSAlert(validCall(), bundle, at(now))
		if err != nil || alert == nil || alert.Headers.Topic != bundle {
			t.Errorf("APNSAlert(%q) = %+v, %v; want topic %[1]q", bundle, alert, err)
		}
		voip, err := push.APNSVoIP(validCall(), bundle, at(now))
		if err != nil || voip == nil || voip.Headers.Topic != bundle+".voip" {
			t.Errorf("APNSVoIP(%q) = %+v, %v; want topic %[1]q.voip", bundle, voip, err)
		}
	}
	// FCM and Web Push take no bundle ID.
	for _, builder := range builders[2:] {
		if got := builder.build(validCall(), "", at(now)); got.err != nil || got.request == nil {
			t.Errorf("%s = %v, %v; want a request", builder.name, got.request, got.err)
		}
	}
}

func TestEventErrors(t *testing.T) {
	for _, test := range []struct {
		name    string
		event   func() *webhooks.Notification
		message string
	}{
		{"nil", func() *webhooks.Notification { return nil }, "event must not be nil"},
		{"zero", func() *webhooks.Notification { return &webhooks.Notification{} },
			"eventType must be a notification event type"},
		{"resource event", func() *webhooks.Notification {
			event := validMessage()
			event.EventType = webhooks.EventMessageCreated
			return event
		}, "eventType must be a notification event type"},
		{"event ID", func() *webhooks.Notification {
			event := validMessage()
			event.EventID = "secret-value"
			return event
		}, "eventId must be a lowercase, non-nil UUID"},
		{"preview", func() *webhooks.Notification {
			event := validMessage()
			event.Preview = &webhooks.Preview{Text: strings.Repeat("\U0001F44B", 513)}
			return event
		}, "preview.text must be 1 to 512 Unicode code points"},
		{"preview UTF-8", func() *webhooks.Notification {
			event := validMessage()
			event.Preview = &webhooks.Preview{Text: "Hi \xff"}
			return event
		}, "preview.text must be 1 to 512 Unicode code points"},
		{"expiration", func() *webhooks.Notification {
			event := validCall()
			event.ExpiresAt = "2026-10-10T12:00:45"
			return event
		}, "expiresAt must be an RFC 3339 timestamp"},
		{"reason", func() *webhooks.Notification { return validCancel("") },
			"reason must be an ASCII letter followed by up to 63 ASCII letters, digits or _"},
	} {
		t.Run(test.name, func(t *testing.T) {
			// Builders check the event before they decide whether it applies
			// or is stale.
			for _, clock := range []int64{now, now + 400*86_400} {
				for _, builder := range builders {
					got := builder.build(test.event(), bundleID, at(clock))
					checkError(t, builder.name, got, push.CodeInvalidEvent, "Invalid notification event: "+test.message)
					if got.err != nil && strings.Contains(got.err.Error(), "secret-value") {
						t.Errorf("%s error %q contains the field's value", builder.name, got.err)
					}
				}
			}
		})
	}
}

func TestText(t *testing.T) {
	preview := func(text string, truncated bool) *webhooks.Notification {
		event := validMessage()
		event.Preview = &webhooks.Preview{Text: text, Truncated: truncated}
		return event
	}
	callWithPreview := validCall()
	// The contract ignores a call's preview.
	callWithPreview.Preview = &webhooks.Preview{}
	for _, test := range []struct {
		name        string
		event       *webhooks.Notification
		options     []push.Option
		title, body string // empty when absent
	}{
		{"metadata only", validMessage(), nil, "", ""},
		{"title and body", validMessage(), []push.Option{push.WithTitle("Grace"), push.WithBody("Hi")}, "Grace", "Hi"},
		{"the last options", validMessage(), []push.Option{push.WithTitle("Ada"), push.WithBody("Bye"),
			push.WithTitle("Grace"), push.WithBody("Hi")}, "Grace", "Hi"},
		{"a later title replaces an invalid one", validMessage(),
			[]push.Option{push.WithTitle("\xff"), push.WithTitle("Grace")}, "Grace", ""},
		{"empty title and body", validMessage(), []push.Option{push.WithTitle("Grace"), push.WithBody("Hi"),
			push.WithTitle(""), push.WithBody("")}, "", ""},
		{"preview", preview("See you at 3?", false), nil, "", "See you at 3?"},
		{"truncated preview", preview("See you", true), nil, "", "See you\u2026"},
		{"body replaces the preview", preview("See you", true), []push.Option{push.WithBody("Hi")}, "", "Hi"},
		{"empty body keeps the preview", preview("See you", false), []push.Option{push.WithBody("")}, "", "See you"},
		{"without preview", preview("See you", true), []push.Option{push.WithoutPreview()}, "", ""},
		{"without preview keeps the body", preview("See you", false),
			[]push.Option{push.WithoutPreview(), push.WithBody("Hi")}, "", "Hi"},
		{"call", callWithPreview, []push.Option{push.WithTitle("Grace")}, "Grace", ""},
	} {
		t.Run(test.name, func(t *testing.T) {
			before := *test.event
			if preview := test.event.Preview; preview != nil {
				copied := *preview
				before.Preview = &copied
			}
			options := append([]push.Option{at(now)}, test.options...)
			for _, builder := range builders {
				got := builder.build(test.event, bundleID, options...)
				if builder.name == "apnsVoip" && test.event.EventType != webhooks.EventNotificationCall {
					if got.request != nil || got.err != nil {
						t.Errorf("%s = %v, %v; want none", builder.name, got.request, got.err)
					}
					continue
				}
				payload := payloadOf(t, got)
				fields, ok := payload["convohop"].(map[string]any)
				if builder.name == "fcm" {
					fields, ok = payload, true
				}
				if !ok {
					t.Fatalf("%s payload = %v; want convohop metadata", builder.name, payload)
				}
				if builder.name == "apnsAlert" {
					// The alert shows the text; its metadata never carries it.
					if _, has := fields["title"]; has {
						t.Errorf("%s metadata has a title", builder.name)
					}
					if _, has := fields["body"]; has {
						t.Errorf("%s metadata has a body", builder.name)
					}
					fields = payload["aps"].(map[string]any)["alert"].(map[string]any)
					locKey := map[string]string{webhooks.EventNotificationMessage: "CONVOHOP_MESSAGE",
						webhooks.EventNotificationCall: "CONVOHOP_CALL"}[test.event.EventType]
					var want any
					if test.body == "" {
						want = locKey
					}
					if fields["loc-key"] != want {
						t.Errorf("%s loc-key = %v; want %v", builder.name, fields["loc-key"], want)
					}
				}
				for name, want := range map[string]string{"title": test.title, "body": test.body} {
					value, has := fields[name]
					if has != (want != "") || (has && value != want) {
						t.Errorf("%s %s = %q (present %t); want %q", builder.name, name, value, has, want)
					}
				}
			}
			if !reflect.DeepEqual(*test.event, before) {
				t.Errorf("builders changed the event to %+v", *test.event)
			}
		})
	}
}

func TestClock(t *testing.T) {
	calls := 0
	clock := func() time.Time {
		calls++
		return time.Unix(now, 0)
	}
	for _, builder := range builders {
		calls = 0
		if got := builder.build(validCall(), bundleID, push.WithClock(clock)); got.err != nil || calls != 1 {
			t.Errorf("%s called the clock %d times and returned %v; want once", builder.name, calls, got.err)
		}
	}
	// Without a clock, builders use time.Now.
	past := validCall()
	past.OccurredAt, past.ExpiresAt = "2000-01-01T00:00:00Z", "2000-01-01T00:00:45Z"
	for _, builder := range builders {
		if got := builder.build(past, bundleID); got.request != nil || got.err != nil {
			t.Errorf("%s = %v, %v; want none", builder.name, got.request, got.err)
		}
	}
	future := validCall()
	future.ExpiresAt = "9999-12-31T23:59:59Z"
	start := time.Now().Unix()
	alert, err := push.APNSAlert(future, bundleID)
	end := time.Now().Unix()
	if err != nil || alert == nil {
		t.Fatalf("APNSAlert() = %v, %v", alert, err)
	}
	if expiration, _ := strconv.ParseInt(alert.Headers.Expiration, 10, 64); expiration < start+2_419_200 ||
		expiration > end+2_419_200 {
		t.Errorf("apns-expiration = %s; want 28 days after %d", alert.Headers.Expiration, start)
	}
}
