# `github.com/ConvoHop/sdks/go/webhooks`

Verifies Standard Webhooks signatures and parses ConvoHop webhook deliveries into typed events.

**Layer:** Server. **Runtime:** Go 1.26 or later. **Source:** `go/webhooks`.

## Structs

### `Delivery` struct

```go
type Delivery struct {
	Signature
	Event Event
}
```

Delivery is a verified delivery and its event.

#### `Delivery.Signature` property

```go
Signature
```

#### `Delivery.Event` property

```go
Event Event
```

#### `Delivery.WebhookID` property

```go
WebhookID string
```

WebhookID is the delivery's webhook-id. It stays the same when a delivery is retried; use it to discard duplicates.

Inherited from `Signature`.

#### `Delivery.Timestamp` property

```go
Timestamp int64
```

Timestamp is the delivery's webhook-timestamp, in Unix seconds.

Inherited from `Signature`.

### `Error` struct

```go
type Error struct {
	Code    Code
	Message string
}
```

Error is a delivery that failed verification. Its message never contains secrets, signatures or the body.

#### `Error.Code` property

```go
Code Code
```

Code is why the delivery failed.

#### `Error.Message` property

```go
Message string
```

Message is a human-readable diagnostic.

#### `Error.Error` method

```go
func (e *Error) Error() string
```

#### `Error.Is` method

```go
func (e *Error) Is(target error) bool
```

Is reports whether target is the error's `Code`.

### `Event` struct

```go
type Event struct {
	EventID      string
	EventType    string
	OccurredAt   string
	ProjectID    string
	SubjectRef   SubjectRef
	Known        bool
	Notification *Notification
}
```

Event is a verified delivery's metadata-only event envelope.

#### `Event.EventID` property

```go
EventID string
```

#### `Event.EventType` property

```go
EventType string
```

#### `Event.OccurredAt` property

```go
OccurredAt string
```

OccurredAt is when the event happened (RFC 3339).

#### `Event.ProjectID` property

```go
ProjectID string
```

#### `Event.SubjectRef` property

```go
SubjectRef SubjectRef
```

SubjectRef names the resource the event is about.

#### `Event.Known` property

```go
Known bool
```

Known reports whether this SDK knows the event type. Acknowledge an event it doesn't know, including a notification event that doesn't match the push payload contract.

#### `Event.Notification` property

```go
Notification *Notification
```

Notification is the event's fields when it is a known notification event, and nil otherwise.

### `Notification` struct

```go
type Notification struct {
	EventID        string     `json:"eventId"`
	EventType      string     `json:"eventType"`
	OccurredAt     string     `json:"occurredAt"`
	ProjectID      string     `json:"projectId"`
	SubjectRef     SubjectRef `json:"subjectRef"`
	RecipientID    string     `json:"recipientId"`
	ConversationID string     `json:"conversationId"`
	SenderID       string     `json:"senderId"`
	Connected      bool       `json:"connected"`
	MessageID      string     `json:"messageId,omitempty"`
	Preview        *Preview   `json:"preview,omitempty"`
	LiveSessionID  string     `json:"liveSessionId,omitempty"`
	AlertID        string     `json:"alertId,omitempty"`
	ExpiresAt      string     `json:"expiresAt,omitempty"`
	MediaProfile   string     `json:"mediaProfile,omitempty"`
	Reason         string     `json:"reason,omitempty"`
}
```

Notification is a per-recipient notification event: a message for the recipient, an incoming call, or a call that stopped ringing for the recipient. It is the input of the push package's builders. The contract is spec/push-payload in the SDK repository.

#### `Notification.EventID` property

```go
EventID string `json:"eventId"`
```

#### `Notification.EventType` property

```go
EventType string `json:"eventType"`
```

EventType is EventNotificationMessage, EventNotificationCall or EventNotificationCallCancelled.

#### `Notification.OccurredAt` property

```go
OccurredAt string `json:"occurredAt"`
```

OccurredAt is when the message was sent, the ring started or the ring stopped (RFC 3339).

#### `Notification.ProjectID` property

```go
ProjectID string `json:"projectId"`
```

#### `Notification.SubjectRef` property

```go
SubjectRef SubjectRef `json:"subjectRef"`
```

#### `Notification.RecipientID` property

```go
RecipientID string `json:"recipientId"`
```

RecipientID is the principal to notify. Each recipient gets its own event.

#### `Notification.ConversationID` property

```go
ConversationID string `json:"conversationId"`
```

#### `Notification.SenderID` property

```go
SenderID string `json:"senderId"`
```

SenderID is the principal who sent the message or started the ringing.

#### `Notification.Connected` property

```go
Connected bool `json:"connected"`
```

Connected reports whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

#### `Notification.MessageID` property

```go
MessageID string `json:"messageId,omitempty"`
```

MessageID names the message of a message event.

#### `Notification.Preview` property

```go
Preview *Preview `json:"preview,omitempty"`
```

Preview is the start of a message event's text, present only when the project opts in to previews and the message has text.

#### `Notification.LiveSessionID` property

```go
LiveSessionID string `json:"liveSessionId,omitempty"`
```

LiveSessionID names the call of a call or cancellation event.

#### `Notification.AlertID` property

```go
AlertID string `json:"alertId,omitempty"`
```

AlertID names the ring. A later ring of the same call has a new AlertID; a cancellation carries the stopped ring's.

#### `Notification.ExpiresAt` property

```go
ExpiresAt string `json:"expiresAt,omitempty"`
```

ExpiresAt is when the ring stops if nobody answers (RFC 3339). A cancellation carries the stopped ring's original deadline.

#### `Notification.MediaProfile` property

```go
MediaProfile string `json:"mediaProfile,omitempty"`
```

MediaProfile is the call's media profile, such as MediaProfileAudioOnly.

#### `Notification.Reason` property

```go
Reason string `json:"reason,omitempty"`
```

Reason is why a cancellation's ring stopped, such as ReasonEnded.

#### `Notification.Validate` method

```go
func (n *Notification) Validate() error
```

Validate checks n against the push payload contract. It returns an error that names the first invalid field without its value. It ignores the fields the contract doesn't define for n's event type.

### `Preview` struct

```go
type Preview struct {
	Text      string `json:"text"`
	Truncated bool   `json:"truncated"`
}
```

Preview is the start of a message's text.

#### `Preview.Text` property

```go
Text string `json:"text"`
```

Text is 1 to 512 Unicode code points.

#### `Preview.Truncated` property

```go
Truncated bool `json:"truncated"`
```

Truncated reports whether the message text continues after Text.

### `Signature` struct

```go
type Signature struct {
	WebhookID string
	Timestamp int64
}
```

Signature is a verified delivery's identity.

#### `Signature.WebhookID` property

```go
WebhookID string
```

WebhookID is the delivery's webhook-id. It stays the same when a delivery is retried; use it to discard duplicates.

#### `Signature.Timestamp` property

```go
Timestamp int64
```

Timestamp is the delivery's webhook-timestamp, in Unix seconds.

### `SubjectRef` struct

```go
type SubjectRef struct {
	ID   string `json:"id"`
	Kind string `json:"kind"`
}
```

SubjectRef names a resource.

#### `SubjectRef.ID` property

```go
ID string `json:"id"`
```

#### `SubjectRef.Kind` property

```go
Kind string `json:"kind"`
```

## Enums

### `Code` enum

```go
type Code string
```

Code is why a delivery failed verification. Code implements error so that errors.Is(err, CodeTimestampExpired) matches an `*Error` with that code.

Verification failure codes. Checks run in the order listed and stop at the first failure.

#### `Code.CodeInvalidSecret` case

```go
const CodeInvalidSecret Code = "INVALID_SECRET"
```

CodeInvalidSecret means no secret is given, or one is not whsec\_ followed by padded standard Base64 of 24 to 64 bytes. It is your configuration, not the sender.

#### `Code.CodeMissingHeader` case

```go
const CodeMissingHeader Code = "MISSING_HEADER"
```

CodeMissingHeader means webhook-id, webhook-timestamp or webhook-signature is absent or empty.

#### `Code.CodeInvalidHeader` case

```go
const CodeInvalidHeader Code = "INVALID_HEADER"
```

CodeInvalidHeader means one of those headers is repeated.

#### `Code.CodeInvalidTimestamp` case

```go
const CodeInvalidTimestamp Code = "INVALID_TIMESTAMP"
```

CodeInvalidTimestamp means webhook-timestamp is not 1 to 15 ASCII digits (integer Unix seconds).

#### `Code.CodeTimestampExpired` case

```go
const CodeTimestampExpired Code = "TIMESTAMP_EXPIRED"
```

CodeTimestampExpired means the timestamp is more than the tolerance before now.

#### `Code.CodeTimestampFuture` case

```go
const CodeTimestampFuture Code = "TIMESTAMP_FUTURE"
```

CodeTimestampFuture means the timestamp is more than the tolerance after now.

#### `Code.CodeBodyTooLarge` case

```go
const CodeBodyTooLarge Code = "BODY_TOO_LARGE"
```

CodeBodyTooLarge means the body exceeds 4096 bytes.

#### `Code.CodeTooManySignatures` case

```go
const CodeTooManySignatures Code = "TOO_MANY_SIGNATURES"
```

CodeTooManySignatures means webhook-signature has more than 8 entries.

#### `Code.CodeNoMatchingSignature` case

```go
const CodeNoMatchingSignature Code = "NO_MATCHING_SIGNATURE"
```

CodeNoMatchingSignature means no v1 signature matches any secret.

#### `Code.CodeInvalidBody` case

```go
const CodeInvalidBody Code = "INVALID_BODY"
```

CodeInvalidBody means the signed body is not a UTF-8 JSON event envelope. Only `Verify` reports it.

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

Option configures verification.

## Functions

### `Verify` function

```go
func Verify(body []byte, header http.Header, secrets []string, options ...Option) (Delivery, error)
```

Verify verifies a delivery's signature and timestamp, then parses its event. Pass the body exactly as received and the request's headers. The delivery is valid when any v1 signature matches any of secrets, the endpoint's whsec\_ secrets: the current one and, during a rotation, the other. A failed delivery returns an `*Error`; an invalid option returns another error.

### `VerifySignature` function

```go
func VerifySignature(body []byte, header http.Header, secrets []string, options ...Option) (Signature, error)
```

VerifySignature verifies only a delivery's signature and timestamp, for bodies you parse yourself. It fails like `Verify`, except that it never reports `CodeInvalidBody`.

### `WithClock` function

```go
func WithClock(now func() time.Time) Option
```

WithClock replaces time.Now. Use it in tests.

### `WithTolerance` function

```go
func WithTolerance(tolerance time.Duration) Option
```

WithTolerance sets the allowed distance between a delivery's webhook-timestamp and now, inclusive. It must be a non-negative whole number of seconds. The default is `DefaultTolerance`.

## Constants

### `DefaultTolerance` constant

```go
const DefaultTolerance = 5 * time.Minute
```

DefaultTolerance is the default allowed distance between a delivery's webhook-timestamp and the verifier's clock.

### `EventConversationCreated` constant

```go
const EventConversationCreated = "conversation.created"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventConversationUpdated` constant

```go
const EventConversationUpdated = "conversation.updated"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventLiveAlerted` constant

```go
const EventLiveAlerted = "live.alerted"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventLiveConnected` constant

```go
const EventLiveConnected = "live.connected"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventLiveEnded` constant

```go
const EventLiveEnded = "live.ended"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventLiveParticipationChanged` constant

```go
const EventLiveParticipationChanged = "live.participationChanged"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventLiveReady` constant

```go
const EventLiveReady = "live.ready"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventLiveStarted` constant

```go
const EventLiveStarted = "live.started"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventMemberAdded` constant

```go
const EventMemberAdded = "member.added"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventMemberBroadcastPermissionChanged` constant

```go
const EventMemberBroadcastPermissionChanged = "member.broadcastPermissionChanged"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventMemberHistoryExpanded` constant

```go
const EventMemberHistoryExpanded = "member.historyExpanded"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventMemberRemoved` constant

```go
const EventMemberRemoved = "member.removed"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventMemberRoleChanged` constant

```go
const EventMemberRoleChanged = "member.roleChanged"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventMessageCreated` constant

```go
const EventMessageCreated = "message.created"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventMessageDeleted` constant

```go
const EventMessageDeleted = "message.deleted"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventMessageEdited` constant

```go
const EventMessageEdited = "message.edited"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventNotificationCall` constant

```go
const EventNotificationCall = "notification.call"
```

EventNotificationCall is an incoming call: one ring for the recipient.

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventNotificationCallCancelled` constant

```go
const EventNotificationCallCancelled = "notification.callCancelled"
```

EventNotificationCallCancelled is a ring that stopped for the recipient. Only recipients of the ring's notification.call get it.

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventNotificationMessage` constant

```go
const EventNotificationMessage = "notification.message"
```

EventNotificationMessage is a message for the recipient.

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventReceiptReported` constant

```go
const EventReceiptReported = "receipt.reported"
```

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `EventWebhookEndpointDisabled` constant

```go
const EventWebhookEndpointDisabled = "webhook.endpointDisabled"
```

EventWebhookEndpointDisabled means one of the project's other webhook endpoints was disabled after repeated failures. SubjectRef.ID names it, and SubjectRef.Kind is "webhookEndpoint".

Event types the authority sends. Notification events follow the push payload contract; the others are resource events.

### `MediaProfileAudioOnly` constant

```go
const MediaProfileAudioOnly = "AUDIO_ONLY"
```

Call media profiles, in `Notification`.MediaProfile. Accept profiles you don't know.

### `MediaProfileAudioVideo` constant

```go
const MediaProfileAudioVideo = "AUDIO_VIDEO"
```

Call media profiles, in `Notification`.MediaProfile. Accept profiles you don't know.

### `ReasonAnswered` constant

```go
const ReasonAnswered = "answered"
```

ReasonAnswered means the recipient answered, on any device.

Why a ring stopped, in `Notification`.Reason. Treat a reason you don't know as "stop ringing", without a missed-call alert.

### `ReasonDeclined` constant

```go
const ReasonDeclined = "declined"
```

ReasonDeclined means the recipient declined, on any device.

Why a ring stopped, in `Notification`.Reason. Treat a reason you don't know as "stop ringing", without a missed-call alert.

### `ReasonEnded` constant

```go
const ReasonEnded = "ended"
```

ReasonEnded means the call ended or stopped ringing before the recipient answered: a missed call.

Why a ring stopped, in `Notification`.Reason. Treat a reason you don't know as "stop ringing", without a missed-call alert.

### `ReasonExpired` constant

```go
const ReasonExpired = "expired"
```

ReasonExpired means nobody answered by ExpiresAt: a missed call.

Why a ring stopped, in `Notification`.Reason. Treat a reason you don't know as "stop ringing", without a missed-call alert.
