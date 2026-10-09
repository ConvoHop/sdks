# Go push notifications quickstart

Send push notifications for ConvoHop messages and calls: the `push` package turns notification events into APNs, FCM and Web Push requests, and you send them with your own push credentials and clients.

## Before you start

ConvoHop doesn't send push notifications itself. You need:

- A webhook endpoint that receives `notification.message`, `notification.call` and `notification.callCancelled` events, as the [webhooks quickstart](webhooks.md) shows. Each of these events is addressed to one recipient. Events arrive at least once and in any order, so deduplicate on `EventID` before you send.
- The devices that your app registered for each user, in your own database.
- Your push credentials and clients. This page sends to FCM and APNs with `net/http`. For browsers, use a Web Push library.

The samples on this page use these imports:

```go snippet=docs/languages/go/examples/push.go#imports
import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/ConvoHop/sdks/go/push"
	"github.com/ConvoHop/sdks/go/webhooks"
)
```

## Build and send the requests

```go snippet=docs/languages/go/examples/push.go#notify
// IOSDevice is an iOS app's APNs device token.
type IOSDevice struct {
	Token string
	// VoIPToken is the PushKit token of a CallKit app, or empty.
	VoIPToken string
}

// FCMTarget is an Android app's registration token, or its Firebase
// Installation ID (FID) when its manifest sets
// firebase_messaging_installation_id_enabled. Set one of the two.
type FCMTarget struct {
	Token string `json:"token,omitempty"`
	FID   string `json:"fid,omitempty"`
}

// WebSubscription is a browser's PushSubscription.toJSON().
type WebSubscription struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

// Device is a device that your app registered for a user, from your own
// database. Set one of its fields.
type Device struct {
	IOS     *IOSDevice
	Android *FCMTarget
	Web     *WebSubscription
}

// Senders are your push clients.
type Senders interface {
	APNS(ctx context.Context, deviceToken string, request *push.APNSRequest) error
	FCM(ctx context.Context, target FCMTarget, request *push.FCMRequest) error
	WebPush(ctx context.Context, subscription WebSubscription, request *push.WebPushRequest) error
}

// Notify sends a notification event to the recipient's devices. bundleID is
// your iOS app's bundle ID. options are the builders' options, such as
// push.WithTitle with the sender's name.
func Notify(ctx context.Context, event *webhooks.Notification, devices []Device, senders Senders, bundleID string, options ...push.Option) error {
	// Each builder returns nil when the event doesn't apply to the platform or
	// is stale. Send nothing then.
	alert, err := push.APNSAlert(event, bundleID, options...)
	if err != nil {
		return err
	}
	voip, err := push.APNSVoIP(event, bundleID, options...)
	if err != nil {
		return err
	}
	fcm, err := push.FCM(event, options...)
	if err != nil {
		return err
	}
	web, err := push.WebPush(event, options...)
	if err != nil {
		return err
	}
	var errs []error
	for _, device := range devices {
		switch {
		// A CallKit app gets incoming calls as VoIP pushes, and must report each
		// one to CallKit.
		case device.IOS != nil && device.IOS.VoIPToken != "" && voip != nil:
			errs = append(errs, senders.APNS(ctx, device.IOS.VoIPToken, voip))
		// alert is nil when a ring was answered or declined.
		case device.IOS != nil && alert != nil:
			errs = append(errs, senders.APNS(ctx, device.IOS.Token, alert))
		case device.Android != nil && fcm != nil:
			errs = append(errs, senders.FCM(ctx, *device.Android, fcm))
		case device.Web != nil && web != nil:
			errs = append(errs, senders.WebPush(ctx, *device.Web, web))
		}
	}
	// One device's failure doesn't stop the others.
	return errors.Join(errs...)
}
```

Each builder returns a nil request and a nil error when the event doesn't apply to the platform or has expired, and then you send nothing. When it can't build a request, it returns a `*push.Error` whose `Code` is `INVALID_OPTIONS` or `INVALID_EVENT`. The APNs builders take your iOS app's bundle ID for the `apns-topic` header, and fail with `INVALID_OPTIONS` if it isn't an app bundle ID. These options apply to every builder:

- `push.WithTitle` and `push.WithBody` set visible text of your own, such as the sender's name. Without them, a request carries only the event's metadata, plus the start of the message when the project turns on message previews.
- `push.WithoutPreview()` keeps a message's preview out of the body when you set no body.
- `push.WithClock` replaces the clock, for example in tests.

A request expires when its event stops being relevant: a day after a message or a missed call, and when the ring stops for a call. A call and its cancellation share a collapse key, so a push service that still holds the call's request replaces it with the cancellation's.

The requests use each service's wire format: APNs headers and a payload, an FCM HTTP v1 message, and Web Push headers and a payload. The APNs and Web Push payloads are canonical JSON, the form that the size limits are measured on, so send their bytes as they are.

## Web Push: pass the headers as options

Every Web Push request has a `TTL` header. Requests for calls and cancellations also have the `Urgency: high` header, so the push service and the device don't hold them back to save battery, and a `Topic` header, their collapse key. Message requests have `Urgency: normal`.

The standard library doesn't implement Web Push encryption, so this page has no Web Push sample. A Web Push library encrypts the payload (RFC 8291), signs the request with your VAPID keys and sets some headers itself, which can replace the headers you pass. Give it `Payload` as the plaintext, as it is, and pass `Headers.TTL`, `Headers.Urgency` and `Headers.Topic` as its own TTL, urgency and topic options, so a call isn't delivered at normal urgency.

## FCM: add the device's token or FID

`Message` is the body of an FCM HTTP v1 `messages:send` request without a target, in the REST form, where `ttl` is a string of seconds such as `"45s"` and `priority` is uppercase, such as `"HIGH"`. Add the device's `token` or `fid`, and post it with an HTTP client that adds your service account's OAuth 2.0 token:

```go snippet=docs/languages/go/examples/push.go#fcm
// FCMEndpoint is the FCM HTTP v1 API's base URL.
const FCMEndpoint = "https://fcm.googleapis.com"

// FCMSender sends FCM requests with the FCM HTTP v1 API.
type FCMSender struct {
	// Client adds your service account's OAuth 2.0 token to each request, as
	// the client of golang.org/x/oauth2/google.DefaultClient does with the
	// https://www.googleapis.com/auth/firebase.messaging scope.
	Client *http.Client
	// ProjectID is your Firebase project's ID.
	ProjectID string
	// Endpoint is FCMEndpoint.
	Endpoint string
}

// Send sends an FCM request to one Android device.
func (s *FCMSender) Send(ctx context.Context, target FCMTarget, request *push.FCMRequest) error {
	// The request is the body of messages:send without a target, so add the
	// device's token or fid.
	message := struct {
		FCMTarget
		push.FCMMessage
	}{target, request.Message}
	var body bytes.Buffer
	encoder := json.NewEncoder(&body)
	// By default, encoding/json escapes <, > and &, which makes the data larger
	// than the size the builder measured.
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(map[string]any{"message": message}); err != nil {
		return err
	}
	endpoint := s.Endpoint + "/v1/projects/" + url.PathEscape(s.ProjectID) + "/messages:send"
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &body)
	if err != nil {
		return err
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	response, err := s.Client.Do(httpRequest)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		// A 404 whose errorCode is UNREGISTERED means that the target is no
		// longer valid: delete it.
		return fmt.Errorf("fcm: %s", response.Status)
	}
	return nil
}
```

Turn off HTML escaping when you encode the message, as the sample does. By default, `encoding/json` escapes `<`, `>` and `&`, which makes the data larger than the builder measured.

Each Android device has the target that its app registered: a registration token by default, or a Firebase Installation ID (FID) when the app's manifest sets `firebase_messaging_installation_id_enabled`. The app gets the token in `FirebaseMessagingService.onNewToken()`, or the FID in `onRegistered()`. firebase-messaging 25.1.0 deprecates `getToken()`, `deleteToken()` and `onNewToken()` in favor of `register()`, `unregister()` and `onRegistered()`. Both sets work: the deprecated methods without the flag, and the new ones with it. The token stays the default because the flag applies to the whole app: with it, `FirebaseMessaging.getToken()` fails for every library in the app. For FID mode, use firebase-messaging 25.1.2 or later (Firebase Android BoM 34.18.0 or later): 25.1.1 fixed re-registration when the FID changes, and 25.1.2 fixed a `FID_ALREADY_USED` registration error.

The Firebase Admin SDK for Go, `firebase.google.com/go/v4`, sends to a FID from [version 4.21.0](https://github.com/firebase/firebase-admin-go/releases/tag/v4.21.0), with the `Fid` field of `messaging.Message`. That version also deprecates `Token`, which still sends to a token. The Admin SDK takes the Android options in its own form: the `Priority` of `messaging.AndroidConfig` is lowercase, and fails validation as `"HIGH"`, and its `TTL` is a `*time.Duration`. Convert them with `strings.ToLower` and `time.ParseDuration`, and copy `Data` and `CollapseKey` as they are.

FCM requests carry Android options only. Send to Apple devices with the APNs requests.

## APNs: send the payload as it is

APNs needs HTTP/2, which `net/http` uses for HTTPS by default. POST each request's `Payload` to `/3/device/` followed by the device token, with its `Headers` and your provider token:

```go snippet=docs/languages/go/examples/push.go#apns
// APNSEndpoint is the APNs production server. Development builds of your app
// get pushes from https://api.sandbox.push.apple.com.
const APNSEndpoint = "https://api.push.apple.com"

// APNSSender sends APNs requests.
type APNSSender struct {
	// Client must speak HTTP/2, as http.DefaultClient does. A Transport with
	// its own TLSClientConfig needs ForceAttemptHTTP2.
	Client *http.Client
	// ProviderToken returns your APNs provider token, a JWT signed with your
	// APNs signing key. Create a new one every 20 to 60 minutes: APNs rejects
	// a token over an hour old, and fails requests when the token changes more
	// often than every 20 minutes.
	ProviderToken func(ctx context.Context) (string, error)
	// Endpoint is APNSEndpoint.
	Endpoint string
}

// Send sends an APNs request to one device token.
func (s *APNSSender) Send(ctx context.Context, deviceToken string, request *push.APNSRequest) error {
	token, err := s.ProviderToken(ctx)
	if err != nil {
		return err
	}
	// Send the payload's bytes as they are: re-encoding them can grow them past
	// the APNs limit.
	endpoint := s.Endpoint + "/3/device/" + url.PathEscape(deviceToken)
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(request.Payload))
	if err != nil {
		return err
	}
	headers := request.Headers
	httpRequest.Header.Set("authorization", "bearer "+token)
	httpRequest.Header.Set("apns-push-type", headers.PushType)
	httpRequest.Header.Set("apns-topic", headers.Topic)
	httpRequest.Header.Set("apns-priority", headers.Priority)
	httpRequest.Header.Set("apns-expiration", headers.Expiration)
	if headers.CollapseID != "" {
		httpRequest.Header.Set("apns-collapse-id", headers.CollapseID)
	}
	response, err := s.Client.Do(httpRequest)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		// The reason, such as BadDeviceToken. A 410 means that the token is no
		// longer active: delete it.
		var failure struct {
			Reason string `json:"reason"`
		}
		_ = json.NewDecoder(io.LimitReader(response.Body, 1024)).Decode(&failure)
		return fmt.Errorf("apns: %s %s", response.Status, failure.Reason)
	}
	return nil
}
```

iOS requires an app to report every VoIP push to CallKit as an incoming call, so `push.APNSVoIP` builds requests for `notification.call` only. A CallKit app stops ringing when its realtime connection reports that the ring stopped. A missed call also gets an APNs alert, and an answered or declined ring gets no APNs request. [Calls on iOS](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md#calls-on-ios) has the details.

## How the samples are tested

The test runs `Notify` on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md) and checks the request it sends to each kind of device against the vector's expected request. It also checks that one device's failure doesn't stop the others, and that a builder error stops `Notify` before it sends.

`FCMSender` sends each vector's FCM request to a local server, to a token and to a FID, and the test checks the body that the server receives, without escaped `<` or `&`. `APNSSender` sends each APNs request to a local HTTP/2 server, and the test checks the headers and that the payload arrives byte for byte. Both senders return an error for a target that the service no longer accepts: an FCM 404 and an APNs 410. CI doesn't run a Web Push library or the Firebase Admin SDK, so the Web Push section and the Admin SDK paragraph aren't tested.

## Next steps

- [`push` reference](../reference/push.md): every builder and its options.
- [Webhooks quickstart](webhooks.md): verify the deliveries that carry these events.
