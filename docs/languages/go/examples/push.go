package examples

// #region imports
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

// #endregion imports

// #region notify

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

// #endregion notify

// #region fcm

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

// #endregion fcm

// #region apns

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

// #endregion apns
