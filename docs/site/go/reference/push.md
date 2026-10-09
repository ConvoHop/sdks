# `github.com/ConvoHop/sdks/go/push`

Builds APNs, FCM and Web Push requests from ConvoHop push notification events.

**Layer:** Server. **Runtime:** Go 1.26 or later. **Source:** `go/push`.

## Structs

### `APNSHeaders` struct

```go
type APNSHeaders struct {
	PushType   string `json:"apns-push-type"`
	Topic      string `json:"apns-topic"`
	Priority   string `json:"apns-priority"`
	Expiration string `json:"apns-expiration"`
	CollapseID string `json:"apns-collapse-id,omitempty"`
}
```

APNSHeaders are an APNs request's HTTP/2 headers, named by their JSON tags.

#### `APNSHeaders.PushType` property

```go
PushType string `json:"apns-push-type"`
```

PushType is "alert" or "voip".

#### `APNSHeaders.Topic` property

```go
Topic string `json:"apns-topic"`
```

Topic is the bundle ID for alerts and \<bundle ID>.voip for VoIP pushes.

#### `APNSHeaders.Priority` property

```go
Priority string `json:"apns-priority"`
```

Priority is "10".

#### `APNSHeaders.Expiration` property

```go
Expiration string `json:"apns-expiration"`
```

Expiration is the Unix seconds after which APNs stops trying to deliver.

#### `APNSHeaders.CollapseID` property

```go
CollapseID string `json:"apns-collapse-id,omitempty"`
```

CollapseID is set for incoming and missed calls: the ring's collapse key, so a missed-call alert replaces the ring's incoming-call alert.

### `APNSRequest` struct

```go
type APNSRequest struct {
	Headers APNSHeaders     `json:"headers"`
	Payload json.RawMessage `json:"payload"`
}
```

APNSRequest is an APNs request. Your APNs client adds authorization and sends it to /3/device/\<token>.

#### `APNSRequest.Headers` property

```go
Headers APNSHeaders `json:"headers"`
```

#### `APNSRequest.Payload` property

```go
Payload json.RawMessage `json:"payload"`
```

Payload is the request body as canonical JSON. Send it as it is.

### `Error` struct

```go
type Error struct {
	Code    Code
	Message string
}
```

Error is a request that couldn't be built. Its message names the field but never contains its value.

#### `Error.Code` property

```go
Code Code
```

#### `Error.Message` property

```go
Message string
```

#### `Error.Error` method

```go
func (e *Error) Error() string
```

#### `Error.Is` method

```go
func (e *Error) Is(target error) bool
```

Is reports whether target is the error's `Code`.

### `FCMAndroidConfig` struct

```go
type FCMAndroidConfig struct {
	Priority    string `json:"priority"`
	TTL         string `json:"ttl"`
	CollapseKey string `json:"collapse_key,omitempty"`
}
```

FCMAndroidConfig is an FCM message's Android delivery options.

#### `FCMAndroidConfig.Priority` property

```go
Priority string `json:"priority"`
```

Priority is "HIGH".

#### `FCMAndroidConfig.TTL` property

```go
TTL string `json:"ttl"`
```

TTL is the remaining lifetime, such as "3600s".

#### `FCMAndroidConfig.CollapseKey` property

```go
CollapseKey string `json:"collapse_key,omitempty"`
```

CollapseKey is set for calls and cancellations: the ring's collapse key.

### `FCMMessage` struct

```go
type FCMMessage struct {
	Data    map[string]string `json:"data"`
	Android FCMAndroidConfig  `json:"android"`
}
```

FCMMessage is an FCM data message.

#### `FCMMessage.Data` property

```go
Data map[string]string `json:"data"`
```

Data has one key, "convohop": the metadata as canonical JSON.

#### `FCMMessage.Android` property

```go
Android FCMAndroidConfig `json:"android"`
```

Android is the REST API's form. Firebase Admin SDKs take it in their own form, such as a TTL duration.

### `FCMRequest` struct

```go
type FCMRequest struct {
	Message FCMMessage `json:"message"`
}
```

FCMRequest is the body of an FCM HTTP v1 messages:send request without a target: add message.token or message.fid before you send it.

#### `FCMRequest.Message` property

```go
Message FCMMessage `json:"message"`
```

### `WebPushHeaders` struct

```go
type WebPushHeaders struct {
	TTL     string `json:"TTL"`
	Urgency string `json:"Urgency"`
	Topic   string `json:"Topic,omitempty"`
}
```

WebPushHeaders are a Web Push message's headers, named by their JSON tags.

#### `WebPushHeaders.TTL` property

```go
TTL string `json:"TTL"`
```

TTL is the remaining lifetime in seconds.

#### `WebPushHeaders.Urgency` property

```go
Urgency string `json:"Urgency"`
```

Urgency is "normal" for messages and "high" for calls and cancellations.

#### `WebPushHeaders.Topic` property

```go
Topic string `json:"Topic,omitempty"`
```

Topic is set for calls and cancellations: the ring's collapse key.

### `WebPushRequest` struct

```go
type WebPushRequest struct {
	Headers WebPushHeaders  `json:"headers"`
	Payload json.RawMessage `json:"payload"`
}
```

WebPushRequest is a Web Push message for your Web Push library, which encrypts the payload (RFC 8291) and signs the request (VAPID).

#### `WebPushRequest.Headers` property

```go
Headers WebPushHeaders `json:"headers"`
```

Headers are RFC 8030 headers. Where your library sets TTL, Urgency or Topic from its own options, pass the values there, or its defaults replace them.

#### `WebPushRequest.Payload` property

```go
Payload json.RawMessage `json:"payload"`
```

Payload is the plaintext as canonical JSON. Encrypt it as it is.

## Enums

### `Code` enum

```go
type Code string
```

Code is why a request couldn't be built. Code implements error so that errors.Is(err, CodeInvalidEvent) matches an `*Error` with that code.

#### `Code.CodeInvalidOptions` case

```go
const CodeInvalidOptions Code = "INVALID_OPTIONS"
```

CodeInvalidOptions means an option is nil or invalid: a title or body that isn't valid UTF-8, a nil clock, or a bundle ID that isn't an app bundle ID. Options are checked first.

#### `Code.CodeInvalidEvent` case

```go
const CodeInvalidEvent Code = "INVALID_EVENT"
```

CodeInvalidEvent means the event doesn't match the push payload contract.

#### `Code.Error` method

```go
func (c Code) Error() string
```

Error returns the code as an error message.

## Types

### `Option` type

```go
type Option func(*settings)
```

Option configures a builder.

## Functions

### `APNSAlert` function

```go
func APNSAlert(event *webhooks.Notification, bundleID string, options ...Option) (*APNSRequest, error)
```

APNSAlert builds an APNs alert for a message, an incoming call or a missed call (a cancellation with reason ended or expired), and returns nil for other cancellations. The payload is at most 4096 bytes. bundleID is the app's bundle ID, the alert's topic.

### `APNSVoIP` function

```go
func APNSVoIP(event *webhooks.Notification, bundleID string, options ...Option) (*APNSRequest, error)
```

APNSVoIP builds an APNs VoIP push for an incoming call, and returns nil for other events. iOS requires you to report every VoIP push to CallKit as a call. The payload is at most 5120 bytes. bundleID is the app's bundle ID; the push's topic is \<bundleID>.voip.

### `FCM` function

```go
func FCM(event *webhooks.Notification, options ...Option) (*FCMRequest, error)
```

FCM builds an FCM data message for any notification event. Its data, as JSON, is at most 4096 bytes.

### `WebPush` function

```go
func WebPush(event *webhooks.Notification, options ...Option) (*WebPushRequest, error)
```

WebPush builds a Web Push message for any notification event. The payload is at most 3993 bytes, the RFC 8291 plaintext limit.

### `WithBody` function

```go
func WithBody(body string) Option
```

WithBody sets the visible body. It replaces a message event's preview. An empty body is omitted.

### `WithClock` function

```go
func WithClock(now func() time.Time) Option
```

WithClock replaces time.Now for the TTL and expiration. Use it in tests.

### `WithTitle` function

```go
func WithTitle(title string) Option
```

WithTitle sets the visible title, such as the sender's or the conversation's name. An empty title is omitted.

### `WithoutPreview` function

```go
func WithoutPreview() Option
```

WithoutPreview stops a message event's preview from becoming the body when there is no `WithBody`.
