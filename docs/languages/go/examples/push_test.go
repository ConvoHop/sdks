package examples_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	examples "github.com/ConvoHop/sdks/docs/languages/go/examples"
	"github.com/ConvoHop/sdks/go/push"
)

const webEndpoint = "https://push.example/send/subscription-1"

// An Android app's registration token, which it gets by default, and a FID.
var fcmTargets = []examples.FCMTarget{{Token: "android-token"}, {FID: "android-fid"}}

func testDevices() []examples.Device {
	return []examples.Device{
		{IOS: &examples.IOSDevice{Token: "ios-token"}},
		{IOS: &examples.IOSDevice{Token: "callkit-token", VoIPToken: "callkit-voip-token"}},
		{Android: &fcmTargets[0]},
		{Android: &fcmTargets[1]},
		{Web: &examples.WebSubscription{Endpoint: webEndpoint}},
	}
}

// sent is a request that Notify sent: the sender, the target, and the request
// as a JSON value.
type sent struct {
	sender  string
	target  any
	request any
}

type recordingSenders struct {
	t    *testing.T
	sent []sent
	// fail is the error that APNS returns.
	fail error
}

func (s *recordingSenders) APNS(_ context.Context, deviceToken string, request *push.APNSRequest) error {
	s.record("apns", deviceToken, request)
	return s.fail
}

func (s *recordingSenders) FCM(_ context.Context, target examples.FCMTarget, request *push.FCMRequest) error {
	s.record("fcm", target, request)
	return nil
}

func (s *recordingSenders) WebPush(_ context.Context, subscription examples.WebSubscription, request *push.WebPushRequest) error {
	s.record("webPush", subscription.Endpoint, request)
	return nil
}

func (s *recordingSenders) record(sender string, target, request any) {
	data, err := json.Marshal(request)
	if err != nil {
		s.t.Fatal(err)
	}
	s.sent = append(s.sent, sent{sender: sender, target: target, request: jsonValue(s.t, data)})
}

func TestNotifySendsEachDeviceTheRequestTheVectorExpects(t *testing.T) {
	for _, vector := range pushVectors(t) {
		t.Run(vector.ID, func(t *testing.T) {
			bundleID, options := builderOptions(t, vector)
			senders := &recordingSenders{t: t}
			if err := examples.Notify(t.Context(), received(t, vector), testDevices(), senders, bundleID, options...); err != nil {
				t.Fatal(err)
			}

			expected := vector.Expected
			var want []sent
			if alert := expected.APNSAlert; alert != nil {
				want = append(want, sent{"apns", "ios-token", jsonValue(t, alert.Request)})
			}
			switch {
			case expected.APNSVoIP != nil:
				want = append(want, sent{"apns", "callkit-voip-token", jsonValue(t, expected.APNSVoIP.Request)})
			case expected.APNSAlert != nil:
				want = append(want, sent{"apns", "callkit-token", jsonValue(t, expected.APNSAlert.Request)})
			}
			if fcm := expected.FCM; fcm != nil {
				for _, target := range fcmTargets {
					want = append(want, sent{"fcm", target, jsonValue(t, fcm.Request)})
				}
			}
			if web := expected.WebPush; web != nil {
				want = append(want, sent{"webPush", webEndpoint, jsonValue(t, web.Request)})
			}
			if !reflect.DeepEqual(senders.sent, want) {
				t.Errorf("Notify sent\n%v\nwant\n%v", senders.sent, want)
			}
		})
	}
}

func TestNotifySendsToTheOtherDevicesWhenOneFails(t *testing.T) {
	vector := pushVectors(t)[0]
	bundleID, options := builderOptions(t, vector)
	unregistered := errors.New("apns: 410 Gone Unregistered")
	senders := &recordingSenders{t: t, fail: unregistered}
	err := examples.Notify(t.Context(), received(t, vector), testDevices(), senders, bundleID, options...)
	if !errors.Is(err, unregistered) {
		t.Errorf("Notify returned %v, want the APNs error", err)
	}
	var sentTo []string
	for _, request := range senders.sent {
		sentTo = append(sentTo, request.sender)
	}
	if got, want := strings.Join(sentTo, " "), "apns apns fcm fcm webPush"; got != want {
		t.Errorf("Notify sent %s, want %s", got, want)
	}
}

func TestNotifyReturnsABuilderErrorBeforeItSends(t *testing.T) {
	vector := pushVectors(t)[0]
	_, options := builderOptions(t, vector)
	senders := &recordingSenders{t: t}
	err := examples.Notify(t.Context(), received(t, vector), testDevices(), senders, "not a bundle ID", options...)
	if !errors.Is(err, push.CodeInvalidOptions) {
		t.Errorf("Notify returned %v, want INVALID_OPTIONS", err)
	}
	if len(senders.sent) != 0 {
		t.Errorf("Notify sent %d requests", len(senders.sent))
	}
}

// post is a request that a test server received.
type post struct {
	protoMajor int
	method     string
	path       string
	header     http.Header
	body       []byte
}

// recordPosts starts a handler that sends each request it receives to the
// returned channel, unless failed answers it.
func recordPosts(t *testing.T, failed func(w http.ResponseWriter, path string, body []byte) bool) (http.Handler, <-chan post) {
	posts := make(chan post, 1)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if failed(w, r.URL.EscapedPath(), body) {
			return
		}
		posts <- post{protoMajor: r.ProtoMajor, method: r.Method, path: r.URL.EscapedPath(), header: r.Header.Clone(), body: body}
	}), posts
}

func TestFCMSenderSendsTheRequestToTheTarget(t *testing.T) {
	handler, posts := recordPosts(t, func(w http.ResponseWriter, _ string, body []byte) bool {
		if !bytes.Contains(body, []byte(`"token":"expired-token"`)) {
			return false
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_, _ = io.WriteString(w, `{"error":{"code":404,"status":"NOT_FOUND","details":[{"@type":"type.googleapis.com/google.firebase.fcm.v1.FcmError","errorCode":"UNREGISTERED"}]}}`)
		return true
	})
	server := httptest.NewServer(handler)
	defer server.Close()
	sender := &examples.FCMSender{Client: server.Client(), ProjectID: "convohop-example", Endpoint: server.URL}

	requests := 0
	for _, vector := range pushVectors(t) {
		expected := vector.Expected.FCM
		if expected == nil {
			continue
		}
		var request push.FCMRequest
		if err := json.Unmarshal(expected.Request, &request); err != nil {
			t.Fatal(err)
		}
		for _, target := range []struct {
			target examples.FCMTarget
			fields map[string]any
		}{
			{examples.FCMTarget{Token: "android-token"}, map[string]any{"token": "android-token"}},
			{examples.FCMTarget{FID: "android-fid"}, map[string]any{"fid": "android-fid"}},
		} {
			if err := sender.Send(t.Context(), target.target, &request); err != nil {
				t.Fatal(err)
			}
			got := <-posts
			requests++
			if got.method != http.MethodPost || got.path != "/v1/projects/convohop-example/messages:send" || got.header.Get("Content-Type") != "application/json" {
				t.Errorf("%s: the sender posted %s %s with Content-Type %q", vector.ID, got.method, got.path, got.header.Get("Content-Type"))
			}
			want := jsonValue(t, expected.Request).(map[string]any)
			for name, value := range target.fields {
				want["message"].(map[string]any)[name] = value
			}
			if body := jsonValue(t, got.body); !reflect.DeepEqual(body, want) {
				t.Errorf("%s: the sender posted\n%s\nwant\n%v", vector.ID, got.body, want)
			}
			// Without HTML escaping, the data is no larger than the builder
			// measured.
			if bytes.Contains(got.body, []byte(`\u003c`)) || bytes.Contains(got.body, []byte(`\u0026`)) {
				t.Errorf("%s: the sender escaped < or &: %s", vector.ID, got.body)
			}
		}
	}
	if requests == 0 {
		t.Fatal("no push vector has an FCM request")
	}

	request := push.FCMRequest{}
	if err := json.Unmarshal(pushVectors(t)[0].Expected.FCM.Request, &request); err != nil {
		t.Fatal(err)
	}
	err := sender.Send(t.Context(), examples.FCMTarget{Token: "expired-token"}, &request)
	if err == nil || !strings.Contains(err.Error(), "404") {
		t.Errorf("Send returned %v, want a 404 error", err)
	}
}

func TestAPNSSenderSendsThePayloadAsItIsOverHTTP2(t *testing.T) {
	handler, posts := recordPosts(t, func(w http.ResponseWriter, path string, _ []byte) bool {
		if path != "/3/device/expired-token" {
			return false
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_, _ = io.WriteString(w, `{"reason":"Unregistered","timestamp":1760097595000}`)
		return true
	})
	server := httptest.NewUnstartedServer(handler)
	server.EnableHTTP2 = true
	server.StartTLS()
	defer server.Close()
	sender := &examples.APNSSender{
		Client:        server.Client(),
		ProviderToken: func(context.Context) (string, error) { return "provider-token", nil },
		Endpoint:      server.URL,
	}

	requests := 0
	for _, vector := range pushVectors(t) {
		bundleID, options := builderOptions(t, vector)
		event := received(t, vector)
		alert, err := push.APNSAlert(event, bundleID, options...)
		if err != nil {
			t.Fatal(err)
		}
		voip, err := push.APNSVoIP(event, bundleID, options...)
		if err != nil {
			t.Fatal(err)
		}
		for _, built := range []struct {
			request  *push.APNSRequest
			expected *expectedRequest
		}{{alert, vector.Expected.APNSAlert}, {voip, vector.Expected.APNSVoIP}} {
			if built.request == nil || built.expected == nil {
				continue
			}
			if err := sender.Send(t.Context(), "device-token", built.request); err != nil {
				t.Fatal(err)
			}
			got := <-posts
			requests++
			if got.protoMajor != 2 || got.method != http.MethodPost || got.path != "/3/device/device-token" {
				t.Errorf("%s: the sender posted %s %s over HTTP/%d", vector.ID, got.method, got.path, got.protoMajor)
			}
			var want struct {
				Headers map[string]string `json:"headers"`
				Payload json.RawMessage   `json:"payload"`
			}
			if err := json.Unmarshal(built.expected.Request, &want); err != nil {
				t.Fatal(err)
			}
			headers := map[string]string{}
			for _, name := range []string{"apns-push-type", "apns-topic", "apns-priority", "apns-expiration", "apns-collapse-id"} {
				if value := got.header.Get(name); value != "" {
					headers[name] = value
				}
			}
			if !reflect.DeepEqual(headers, want.Headers) || got.header.Get("Authorization") != "bearer provider-token" {
				t.Errorf("%s: the sender sent the headers %v", vector.ID, got.header)
			}
			if !bytes.Equal(got.body, built.request.Payload) || len(got.body) != built.expected.Bytes ||
				!reflect.DeepEqual(jsonValue(t, got.body), jsonValue(t, want.Payload)) {
				t.Errorf("%s: the sender posted %s", vector.ID, got.body)
			}
		}
	}
	if requests == 0 {
		t.Fatal("no push vector has an APNs request")
	}

	vector := pushVectors(t)[0]
	bundleID, options := builderOptions(t, vector)
	alert, err := push.APNSAlert(received(t, vector), bundleID, options...)
	if err != nil || alert == nil {
		t.Fatalf("the first vector has no APNs alert: %v", err)
	}
	err = sender.Send(t.Context(), "expired-token", alert)
	if err == nil || !strings.Contains(err.Error(), "410") || !strings.Contains(err.Error(), "Unregistered") {
		t.Errorf("Send returned %v, want a 410 error with its reason", err)
	}
}
