// Package push builds APNs, FCM and Web Push requests from ConvoHop
// notification events, following the push payload contract (spec/push-payload
// in the SDK repository).
//
// The builders are pure functions: they send nothing and hold no credentials.
// Your push library sends the requests and owns APNs and FCM authentication
// and Web Push encryption. Pass the [webhooks.Notification] of a verified
// delivery:
//
//	delivery, err := webhooks.Verify(body, r.Header, secrets)
//	// ...
//	if n := delivery.Event.Notification; n != nil {
//		request, err := push.APNSAlert(n, "com.example.chat", push.WithTitle(name))
//		// ...
//		if request != nil {
//			// Send request.Headers and request.Payload to APNs.
//		}
//	}
//
// Each builder checks its options and then the event, returning an [*Error].
// It returns a nil request and a nil error when the event doesn't apply to the
// platform or is stale. Payloads carry only metadata unless you pass
// [WithTitle] or [WithBody], or the event carries an opted-in message preview.
//
// Payloads are canonical JSON, the contract's size measure. Send their bytes
// as they are: re-encoding them, for example with encoding/json, which
// escapes <, > and &, can grow them past the platform's limit.
package push

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/ConvoHop/sdks/go/internal/contract"
	"github.com/ConvoHop/sdks/go/webhooks"
)

// Code is why a request couldn't be built. Code implements error so that
// errors.Is(err, CodeInvalidEvent) matches an [*Error] with that code.
type Code string

// Error returns the code as an error message.
func (c Code) Error() string { return "convohop push: " + string(c) }

const (
	// CodeInvalidOptions means an option is nil or invalid: a title or body
	// that isn't valid UTF-8, a nil clock, or a bundle ID that isn't an app
	// bundle ID. Options are checked first.
	CodeInvalidOptions Code = "INVALID_OPTIONS"
	// CodeInvalidEvent means the event doesn't match the push payload
	// contract.
	CodeInvalidEvent Code = "INVALID_EVENT"
)

// Error is a request that couldn't be built. Its message names the field but
// never contains its value.
type Error struct {
	Code    Code
	Message string
}

func (e *Error) Error() string { return "convohop push: " + string(e.Code) + ": " + e.Message }

// Is reports whether target is the error's [Code].
func (e *Error) Is(target error) bool {
	code, ok := target.(Code)
	return ok && code == e.Code
}

func invalidOptions(message string) error { return &Error{Code: CodeInvalidOptions, Message: message} }

// Option configures a builder.
type Option func(*settings)

type settings struct {
	title, body string
	noPreview   bool
	now         func() time.Time
	err         error
}

func (s *settings) fail(message string) {
	if s.err == nil {
		s.err = invalidOptions(message)
	}
}

// WithTitle sets the visible title, such as the sender's or the
// conversation's name. An empty title is omitted.
func WithTitle(title string) Option { return func(s *settings) { s.title = title } }

// WithBody sets the visible body. It replaces a message event's preview. An
// empty body is omitted.
func WithBody(body string) Option { return func(s *settings) { s.body = body } }

// WithoutPreview stops a message event's preview from becoming the body when
// there is no [WithBody].
func WithoutPreview() Option { return func(s *settings) { s.noPreview = true } }

// WithClock replaces time.Now for the TTL and expiration. Use it in tests.
func WithClock(now func() time.Time) Option {
	return func(s *settings) {
		if now == nil {
			s.fail("WithClock requires a clock")
			return
		}
		s.now = now
	}
}

// APNSRequest is an APNs request. Your APNs client adds authorization and
// sends it to /3/device/<token>.
type APNSRequest struct {
	Headers APNSHeaders `json:"headers"`
	// Payload is the request body as canonical JSON. Send it as it is.
	Payload json.RawMessage `json:"payload"`
}

// APNSHeaders are an APNs request's HTTP/2 headers, named by their JSON
// tags.
type APNSHeaders struct {
	// PushType is "alert" or "voip".
	PushType string `json:"apns-push-type"`
	// Topic is the bundle ID for alerts and <bundle ID>.voip for VoIP pushes.
	Topic string `json:"apns-topic"`
	// Priority is "10".
	Priority string `json:"apns-priority"`
	// Expiration is the Unix seconds after which APNs stops trying to
	// deliver.
	Expiration string `json:"apns-expiration"`
	// CollapseID is set for incoming and missed calls: the ring's collapse
	// key, so a missed-call alert replaces the ring's incoming-call alert.
	CollapseID string `json:"apns-collapse-id,omitempty"`
}

// FCMRequest is the body of an FCM HTTP v1 messages:send request without a
// target: add one, such as message.token, before you send it.
type FCMRequest struct {
	Message FCMMessage `json:"message"`
}

// FCMMessage is an FCM data message.
type FCMMessage struct {
	// Data has one key, "convohop": the metadata as canonical JSON.
	Data map[string]string `json:"data"`
	// Android is the REST API's form. Firebase Admin SDKs take it in their
	// own form, such as a TTL duration.
	Android FCMAndroidConfig `json:"android"`
}

// FCMAndroidConfig is an FCM message's Android delivery options.
type FCMAndroidConfig struct {
	// Priority is "HIGH".
	Priority string `json:"priority"`
	// TTL is the remaining lifetime, such as "3600s".
	TTL string `json:"ttl"`
	// CollapseKey is set for calls and cancellations: the ring's collapse
	// key.
	CollapseKey string `json:"collapse_key,omitempty"`
}

// WebPushRequest is a Web Push message for your Web Push library, which
// encrypts the payload (RFC 8291) and signs the request (VAPID).
type WebPushRequest struct {
	// Headers are RFC 8030 headers. Where your library sets TTL, Urgency or
	// Topic from its own options, pass the values there, or its defaults
	// replace them.
	Headers WebPushHeaders `json:"headers"`
	// Payload is the plaintext as canonical JSON. Encrypt it as it is.
	Payload json.RawMessage `json:"payload"`
}

// WebPushHeaders are a Web Push message's headers, named by their JSON tags.
type WebPushHeaders struct {
	// TTL is the remaining lifetime in seconds.
	TTL string `json:"TTL"`
	// Urgency is "normal" for messages and "high" for calls and
	// cancellations.
	Urgency string `json:"Urgency"`
	// Topic is set for calls and cancellations: the ring's collapse key.
	Topic string `json:"Topic,omitempty"`
}

// Payload limits in UTF-8 bytes. Web Push: RFC 8291's plaintext limit for the
// 4096-byte body push services accept, less the encryption header (86), AEAD
// tag (16) and padding delimiter (1).
const (
	apnsAlertLimit = 4096
	apnsVoIPLimit  = 5120
	fcmLimit       = 4096
	webPushLimit   = 4096 - 86 - 16 - 1
)

// Lifetimes in seconds: messages and missed calls stay relevant for a day; no
// platform stores longer than 28 days.
const (
	noticeLifetime = 86_400
	maxLifetime    = 2_419_200
)

const bundleIDLimit = 155

var bundleIDPattern = regexp.MustCompile(`^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*$`)

type text struct{ title, body string }

type prepared struct {
	event webhooks.Notification
	text  text
	now   int64
}

func prepare(event *webhooks.Notification, bundleID string, apns bool, options []Option) (*prepared, error) {
	s := &settings{now: time.Now}
	for _, option := range options {
		if option == nil {
			s.fail("nil option")
			continue
		}
		option(s)
	}
	switch {
	case s.err != nil:
		return nil, s.err
	case !utf8.ValidString(s.title):
		return nil, invalidOptions("title must be valid UTF-8")
	case !utf8.ValidString(s.body):
		return nil, invalidOptions("body must be valid UTF-8")
	case apns && (len(bundleID) > bundleIDLimit || !bundleIDPattern.MatchString(bundleID)):
		return nil, invalidOptions("bundleID must be an app bundle ID")
	}
	if err := event.Validate(); err != nil {
		return nil, &Error{Code: CodeInvalidEvent, Message: "Invalid notification event: " + err.Error()}
	}
	input := &prepared{event: *event, text: text{title: s.title, body: s.body}, now: s.now().Unix()}
	if preview := event.Preview; input.text.body == "" && !s.noPreview &&
		event.EventType == webhooks.EventNotificationMessage && preview != nil {
		input.text.body = preview.Text
		if preview.Truncated {
			input.text.body += ellipsis
		}
	}
	return input, nil
}

func missedCall(event *webhooks.Notification) bool {
	return event.EventType == webhooks.EventNotificationCallCancelled &&
		(event.Reason == webhooks.ReasonEnded || event.Reason == webhooks.ReasonExpired)
}

// lifetime returns the remaining lifetime, capped at 28 days, and the Unix
// seconds when it ends. It reports false when the event is stale.
func (p *prepared) lifetime() (ttl, expiration int64, ok bool) {
	// A validated timestamp always parses.
	deadline, _ := contract.EpochSeconds(p.event.ExpiresAt)
	if p.event.EventType == webhooks.EventNotificationMessage || missedCall(&p.event) {
		occurred, _ := contract.EpochSeconds(p.event.OccurredAt)
		deadline = occurred + noticeLifetime
	}
	switch {
	case p.now >= deadline:
		return 0, 0, false
	case p.now <= deadline-maxLifetime:
		ttl = maxLifetime
	default:
		ttl = deadline - p.now
	}
	return ttl, p.now + ttl, true
}

// collapseKey returns a call's or cancellation's per-ring collapse key: 32
// lowercase hex digits, valid as an APNs collapse ID, FCM collapse key and Web
// Push topic.
func (p *prepared) collapseKey() string {
	if p.event.EventType == webhooks.EventNotificationMessage {
		return ""
	}
	return strings.ReplaceAll(p.event.AlertID, "-", "")
}

func apnsHeaders(pushType, topic string, expiration int64, collapse string) APNSHeaders {
	return APNSHeaders{PushType: pushType, Topic: topic, Priority: "10",
		Expiration: strconv.FormatInt(expiration, 10), CollapseID: collapse}
}

// APNSAlert builds an APNs alert for a message, an incoming call or a missed
// call (a cancellation with reason ended or expired), and returns nil for
// other cancellations. The payload is at most 4096 bytes. bundleID is the
// app's bundle ID, the alert's topic.
func APNSAlert(event *webhooks.Notification, bundleID string, options ...Option) (*APNSRequest, error) {
	input, err := prepare(event, bundleID, true, options)
	if err != nil {
		return nil, err
	}
	notice := &input.event
	if notice.EventType == webhooks.EventNotificationCallCancelled && !missedCall(notice) {
		return nil, nil
	}
	_, expiration, ok := input.lifetime()
	if !ok {
		return nil, nil
	}
	key := "CONVOHOP_MISSED_CALL"
	switch notice.EventType {
	case webhooks.EventNotificationMessage:
		key = "CONVOHOP_MESSAGE"
	case webhooks.EventNotificationCall:
		key = "CONVOHOP_CALL"
	}
	convohop := data(notice, text{})
	build := func(t text) []byte {
		var alert []member
		if t.title != "" {
			alert = append(alert, stringMember("title", t.title))
		}
		if t.body != "" {
			alert = append(alert, stringMember("body", t.body))
		} else {
			alert = append(alert, stringMember("loc-key", key))
		}
		return object(
			member{"aps", object(
				member{"alert", object(alert...)},
				stringMember("sound", "default"),
				member{"mutable-content", []byte("1")},
				stringMember("thread-id", notice.ConversationID),
			)},
			member{"convohop", convohop},
		)
	}
	fitted, err := fit(apnsAlertLimit, input.text, func(t text) int { return len(build(t)) })
	if err != nil {
		return nil, err
	}
	return &APNSRequest{
		Headers: apnsHeaders("alert", bundleID, expiration, input.collapseKey()),
		Payload: build(fitted),
	}, nil
}

// APNSVoIP builds an APNs VoIP push for an incoming call, and returns nil for
// other events. iOS requires you to report every VoIP push to CallKit as a
// call. The payload is at most 5120 bytes. bundleID is the app's bundle ID;
// the push's topic is <bundleID>.voip.
func APNSVoIP(event *webhooks.Notification, bundleID string, options ...Option) (*APNSRequest, error) {
	input, err := prepare(event, bundleID, true, options)
	if err != nil {
		return nil, err
	}
	if input.event.EventType != webhooks.EventNotificationCall {
		return nil, nil
	}
	_, expiration, ok := input.lifetime()
	if !ok {
		return nil, nil
	}
	build := func(t text) []byte { return object(member{"convohop", data(&input.event, t)}) }
	fitted, err := fit(apnsVoIPLimit, input.text, func(t text) int { return len(build(t)) })
	if err != nil {
		return nil, err
	}
	return &APNSRequest{
		Headers: apnsHeaders("voip", bundleID+".voip", expiration, ""),
		Payload: build(fitted),
	}, nil
}

// FCM builds an FCM data message for any notification event. Its data, as
// JSON, is at most 4096 bytes.
func FCM(event *webhooks.Notification, options ...Option) (*FCMRequest, error) {
	input, err := prepare(event, "", false, options)
	if err != nil {
		return nil, err
	}
	ttl, _, ok := input.lifetime()
	if !ok {
		return nil, nil
	}
	measure := func(t text) int {
		return len(object(member{"convohop", appendString(nil, string(data(&input.event, t)))}))
	}
	fitted, err := fit(fcmLimit, input.text, measure)
	if err != nil {
		return nil, err
	}
	return &FCMRequest{Message: FCMMessage{
		Data: map[string]string{"convohop": string(data(&input.event, fitted))},
		Android: FCMAndroidConfig{Priority: "HIGH", TTL: strconv.FormatInt(ttl, 10) + "s",
			CollapseKey: input.collapseKey()},
	}}, nil
}

// WebPush builds a Web Push message for any notification event. The payload
// is at most 3993 bytes, the RFC 8291 plaintext limit.
func WebPush(event *webhooks.Notification, options ...Option) (*WebPushRequest, error) {
	input, err := prepare(event, "", false, options)
	if err != nil {
		return nil, err
	}
	ttl, _, ok := input.lifetime()
	if !ok {
		return nil, nil
	}
	urgency := "high"
	if input.event.EventType == webhooks.EventNotificationMessage {
		urgency = "normal"
	}
	build := func(t text) []byte { return object(member{"convohop", data(&input.event, t)}) }
	fitted, err := fit(webPushLimit, input.text, func(t text) int { return len(build(t)) })
	if err != nil {
		return nil, err
	}
	return &WebPushRequest{
		Headers: WebPushHeaders{TTL: strconv.FormatInt(ttl, 10), Urgency: urgency, Topic: input.collapseKey()},
		Payload: build(fitted),
	}, nil
}
