# `convohop.webhooks`

Verifies Standard Webhooks signatures and parses ConvoHop webhook deliveries into typed events.

**Layer:** Server. **Runtime:** Python 3.11 or later. **Source:** `python/src/convohop`.

## Classes

### `WebhookCallCancelledNotificationEvent` class

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookCallCancelledNotificationEvent
```

A ring that stopped for the recipient. Only recipients of the ring's `notification.call` get it.

`reason` `answered` and `declined` (by the recipient, on any device) only stop the ringing. `ended` (the
call ended or stopped ringing before the recipient answered) and `expired` (nobody answered by `expires_at`)
are missed calls. Treat an unknown reason as stop ringing, without a missed-call alert.

#### `WebhookCallCancelledNotificationEvent.known` static property

```python
known: ClassVar[bool] = True
```

#### `WebhookCallCancelledNotificationEvent.event_id` property

```python
event_id: str
```

#### `WebhookCallCancelledNotificationEvent.event_type` property

```python
event_type: Literal["notification.callCancelled"] = "notification.callCancelled"
```

#### `WebhookCallCancelledNotificationEvent.occurred_at` property

```python
occurred_at: str
```

#### `WebhookCallCancelledNotificationEvent.project_id` property

```python
project_id: str
```

#### `WebhookCallCancelledNotificationEvent.subject_ref` property

```python
subject_ref: WebhookSubjectRef
```

#### `WebhookCallCancelledNotificationEvent.recipient_id` property

```python
recipient_id: str
```

#### `WebhookCallCancelledNotificationEvent.conversation_id` property

```python
conversation_id: str
```

#### `WebhookCallCancelledNotificationEvent.sender_id` property

```python
sender_id: str
```

#### `WebhookCallCancelledNotificationEvent.connected` property

```python
connected: bool
```

#### `WebhookCallCancelledNotificationEvent.live_session_id` property

```python
live_session_id: str
```

#### `WebhookCallCancelledNotificationEvent.alert_id` property

```python
alert_id: str
```

The `alert_id` of the ring that stopped.

#### `WebhookCallCancelledNotificationEvent.expires_at` property

```python
expires_at: str
```

The stopped ring's original deadline (RFC 3339 text exactly as sent).

#### `WebhookCallCancelledNotificationEvent.media_profile` property

```python
media_profile: str
```

#### `WebhookCallCancelledNotificationEvent.reason` property

```python
reason: str
```

`answered`, `declined`, `ended`, `expired` or a later reason.

#### `WebhookCallCancelledNotificationEvent` constructor

```python
def __init__(
    self,
    *,
    event_id: str,
    event_type: Literal["notification.callCancelled"] = "notification.callCancelled",
    occurred_at: str,
    project_id: str,
    subject_ref: WebhookSubjectRef,
    recipient_id: str,
    conversation_id: str,
    sender_id: str,
    connected: bool,
    live_session_id: str,
    alert_id: str,
    expires_at: str,
    media_profile: str,
    reason: str,
) -> None
```

#### `WebhookCallCancelledNotificationEvent.to_dict` method

```python
def to_dict(self) -> dict[str, Any]
```

The event in its wire form, with camelCase keys, as the push builders accept it.

### `WebhookCallNotificationEvent` class

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookCallNotificationEvent
```

An incoming call: one ring for the recipient. A later ring of the same call has a new `alert_id`.

#### `WebhookCallNotificationEvent.known` static property

```python
known: ClassVar[bool] = True
```

#### `WebhookCallNotificationEvent.event_id` property

```python
event_id: str
```

#### `WebhookCallNotificationEvent.event_type` property

```python
event_type: Literal["notification.call"] = "notification.call"
```

#### `WebhookCallNotificationEvent.occurred_at` property

```python
occurred_at: str
```

#### `WebhookCallNotificationEvent.project_id` property

```python
project_id: str
```

#### `WebhookCallNotificationEvent.subject_ref` property

```python
subject_ref: WebhookSubjectRef
```

#### `WebhookCallNotificationEvent.recipient_id` property

```python
recipient_id: str
```

#### `WebhookCallNotificationEvent.conversation_id` property

```python
conversation_id: str
```

#### `WebhookCallNotificationEvent.sender_id` property

```python
sender_id: str
```

#### `WebhookCallNotificationEvent.connected` property

```python
connected: bool
```

#### `WebhookCallNotificationEvent.live_session_id` property

```python
live_session_id: str
```

#### `WebhookCallNotificationEvent.alert_id` property

```python
alert_id: str
```

#### `WebhookCallNotificationEvent.expires_at` property

```python
expires_at: str
```

When the ringing stops (RFC 3339 text exactly as sent).

#### `WebhookCallNotificationEvent.media_profile` property

```python
media_profile: str
```

`AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile.

#### `WebhookCallNotificationEvent` constructor

```python
def __init__(
    self,
    *,
    event_id: str,
    event_type: Literal["notification.call"] = "notification.call",
    occurred_at: str,
    project_id: str,
    subject_ref: WebhookSubjectRef,
    recipient_id: str,
    conversation_id: str,
    sender_id: str,
    connected: bool,
    live_session_id: str,
    alert_id: str,
    expires_at: str,
    media_profile: str,
) -> None
```

#### `WebhookCallNotificationEvent.to_dict` method

```python
def to_dict(self) -> dict[str, Any]
```

The event in its wire form, with camelCase keys, as the push builders accept it.

### `WebhookDelivery` class

```python
@dataclass(frozen=True, slots=True)
class WebhookDelivery(WebhookSignature)
```

A verified delivery and its metadata-only event.

#### `WebhookDelivery.event` property

```python
event: WebhookEvent
```

#### `WebhookDelivery` constructor

```python
def __init__(self, webhook_id: str, timestamp: int, event: WebhookEvent) -> None
```

#### `WebhookDelivery.webhook_id` property

```python
webhook_id: str
```

Inherited from `WebhookSignature`.

#### `WebhookDelivery.timestamp` property

```python
timestamp: int
```

Inherited from `WebhookSignature`.

### `WebhookEndpointDisabledEvent` class

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookEndpointDisabledEvent
```

Another of the project's webhook endpoints was disabled after repeated failures. `subject_ref.id` names it.

#### `WebhookEndpointDisabledEvent.known` static property

```python
known: ClassVar[bool] = True
```

#### `WebhookEndpointDisabledEvent.event_id` property

```python
event_id: str
```

#### `WebhookEndpointDisabledEvent.event_type` property

```python
event_type: Literal["webhook.endpointDisabled"] = "webhook.endpointDisabled"
```

#### `WebhookEndpointDisabledEvent.occurred_at` property

```python
occurred_at: str
```

#### `WebhookEndpointDisabledEvent.project_id` property

```python
project_id: str
```

#### `WebhookEndpointDisabledEvent.subject_ref` property

```python
subject_ref: WebhookSubjectRef
```

#### `WebhookEndpointDisabledEvent` constructor

```python
def __init__(
    self,
    *,
    event_id: str,
    event_type: Literal["webhook.endpointDisabled"] = "webhook.endpointDisabled",
    occurred_at: str,
    project_id: str,
    subject_ref: WebhookSubjectRef,
) -> None
```

#### `WebhookEndpointDisabledEvent.to_dict` method

```python
def to_dict(self) -> dict[str, Any]
```

The event in its wire form, with camelCase keys.

### `WebhookMessageNotificationEvent` class

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookMessageNotificationEvent
```

A message for the recipient.

`connected` says whether the recipient had an active realtime connection when the event was produced. It is a
hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.

#### `WebhookMessageNotificationEvent.known` static property

```python
known: ClassVar[bool] = True
```

#### `WebhookMessageNotificationEvent.event_id` property

```python
event_id: str
```

#### `WebhookMessageNotificationEvent.event_type` property

```python
event_type: Literal["notification.message"] = "notification.message"
```

#### `WebhookMessageNotificationEvent.occurred_at` property

```python
occurred_at: str
```

#### `WebhookMessageNotificationEvent.project_id` property

```python
project_id: str
```

#### `WebhookMessageNotificationEvent.subject_ref` property

```python
subject_ref: WebhookSubjectRef
```

#### `WebhookMessageNotificationEvent.recipient_id` property

```python
recipient_id: str
```

The principal to notify. Each recipient gets its own event.

#### `WebhookMessageNotificationEvent.conversation_id` property

```python
conversation_id: str
```

#### `WebhookMessageNotificationEvent.sender_id` property

```python
sender_id: str
```

#### `WebhookMessageNotificationEvent.connected` property

```python
connected: bool
```

#### `WebhookMessageNotificationEvent.message_id` property

```python
message_id: str
```

#### `WebhookMessageNotificationEvent.preview` property

```python
preview: WebhookNotificationPreview | None = None
```

#### `WebhookMessageNotificationEvent` constructor

```python
def __init__(
    self,
    *,
    event_id: str,
    event_type: Literal["notification.message"] = "notification.message",
    occurred_at: str,
    project_id: str,
    subject_ref: WebhookSubjectRef,
    recipient_id: str,
    conversation_id: str,
    sender_id: str,
    connected: bool,
    message_id: str,
    preview: WebhookNotificationPreview | None = None,
) -> None
```

#### `WebhookMessageNotificationEvent.to_dict` method

```python
def to_dict(self) -> dict[str, Any]
```

The event in its wire form, with camelCase keys, as the push builders accept it.

### `WebhookNotificationPreview` class

```python
@dataclass(frozen=True, slots=True)
class WebhookNotificationPreview
```

The start of the message text. Present only when the project opts in to previews and the message has text.

#### `WebhookNotificationPreview.text` property

```python
text: str
```

1 to 512 Unicode code points.

#### `WebhookNotificationPreview.truncated` property

```python
truncated: bool
```

Whether the message text continues after `text`.

#### `WebhookNotificationPreview` constructor

```python
def __init__(self, text: str, truncated: bool) -> None
```

#### `WebhookNotificationPreview.to_dict` method

```python
def to_dict(self) -> dict[str, Any]
```

### `WebhookResourceEvent` class

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookResourceEvent
```

A change to a conversation, member, message, receipt or call. `subject_ref` names the resource.

#### `WebhookResourceEvent.known` static property

```python
known: ClassVar[bool] = True
```

#### `WebhookResourceEvent.event_id` property

```python
event_id: str
```

#### `WebhookResourceEvent.event_type` property

```python
event_type: WebhookResourceEventType
```

#### `WebhookResourceEvent.occurred_at` property

```python
occurred_at: str
```

RFC 3339 text exactly as sent.

#### `WebhookResourceEvent.project_id` property

```python
project_id: str
```

#### `WebhookResourceEvent.subject_ref` property

```python
subject_ref: WebhookSubjectRef
```

#### `WebhookResourceEvent` constructor

```python
def __init__(
    self,
    *,
    event_id: str,
    event_type: WebhookResourceEventType,
    occurred_at: str,
    project_id: str,
    subject_ref: WebhookSubjectRef,
) -> None
```

#### `WebhookResourceEvent.to_dict` method

```python
def to_dict(self) -> dict[str, Any]
```

The event in its wire form, with camelCase keys.

### `WebhookSignature` class

```python
@dataclass(frozen=True, slots=True)
class WebhookSignature
```

A verified delivery's `webhook-id` and `webhook-timestamp` (Unix seconds).

#### `WebhookSignature.webhook_id` property

```python
webhook_id: str
```

#### `WebhookSignature.timestamp` property

```python
timestamp: int
```

#### `WebhookSignature` constructor

```python
def __init__(self, webhook_id: str, timestamp: int) -> None
```

### `WebhookSubjectRef` class

```python
@dataclass(frozen=True, slots=True)
class WebhookSubjectRef
```

The resource an event is about.

#### `WebhookSubjectRef.id` property

```python
id: str
```

#### `WebhookSubjectRef.kind` property

```python
kind: str
```

#### `WebhookSubjectRef` constructor

```python
def __init__(self, id: str, kind: str) -> None
```

#### `WebhookSubjectRef.to_dict` method

```python
def to_dict(self) -> dict[str, Any]
```

### `WebhookUnknownEvent` class

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookUnknownEvent
```

An event this SDK does not know, including a `notification.*` event that doesn't match the push payload
contract. Acknowledge it; it never makes `verify()` raise.

#### `WebhookUnknownEvent.known` static property

```python
known: ClassVar[bool] = False
```

#### `WebhookUnknownEvent.event_id` property

```python
event_id: str
```

#### `WebhookUnknownEvent.event_type` property

```python
event_type: str
```

#### `WebhookUnknownEvent.occurred_at` property

```python
occurred_at: str
```

#### `WebhookUnknownEvent.project_id` property

```python
project_id: str
```

#### `WebhookUnknownEvent.subject_ref` property

```python
subject_ref: WebhookSubjectRef
```

#### `WebhookUnknownEvent` constructor

```python
def __init__(
    self,
    *,
    event_id: str,
    event_type: str,
    occurred_at: str,
    project_id: str,
    subject_ref: WebhookSubjectRef,
) -> None
```

#### `WebhookUnknownEvent.to_dict` method

```python
def to_dict(self) -> dict[str, Any]
```

The envelope fields in their wire form, with camelCase keys.

### `WebhookVerificationError` class

```python
class WebhookVerificationError(Exception)
```

A delivery that failed verification. The message never contains secrets, signatures or the body.

Checks run in this order and stop at the first failure:

- `INVALID_SECRET`: no secret is given, or one is not `whsec_` followed by padded standard Base64 of 24 to
  64 bytes. This is your configuration, not the sender.
- `MISSING_HEADER`: `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty.
- `INVALID_HEADER`: one of those headers is repeated.
- `INVALID_TIMESTAMP`: `webhook-timestamp` is not 1 to 15 ASCII digits (integer Unix seconds).
- `TIMESTAMP_EXPIRED`: the timestamp is more than `tolerance_seconds` before now.
- `TIMESTAMP_FUTURE`: the timestamp is more than `tolerance_seconds` after now.
- `BODY_TOO_LARGE`: the body exceeds 4096 bytes.
- `TOO_MANY_SIGNATURES`: `webhook-signature` has more than 8 entries.
- `NO_MATCHING_SIGNATURE`: no `v1` entry matches any secret.
- `INVALID_BODY`: `verify()` only; the signed body is not a UTF-8 JSON event envelope.

#### `WebhookVerificationError.code` property

```python
code: WebhookVerificationCode
```

#### `WebhookVerificationError` constructor

```python
def __init__(self, code: WebhookVerificationCode, message: str) -> None
```

#### `WebhookVerificationError.message` property

```python
@property
def message(self) -> str
```

## Interfaces

### `WebhookHeaders` interface

```python
class WebhookHeaders(Protocol)
```

Request headers: a mapping, or any object whose `items()` yields every (name, value) pair, such as the header
objects of Starlette, Django, Flask, aiohttp and `http.server`. A value may be a one-element list.

#### `WebhookHeaders.items` method

```python
def items(self) -> Iterable[tuple[Any, Any]]
```

## Types

### `WebhookEvent` type

```python
WebhookEvent: TypeAlias = (
    WebhookResourceEvent | WebhookEndpointDisabledEvent | WebhookNotificationEvent | WebhookUnknownEvent
)
```

A verified delivery's event. Match on the class, or check `known` and then `event_type`.

### `WebhookEventType` type

```python
WebhookEventType: TypeAlias = (
    WebhookResourceEventType | Literal["webhook.endpointDisabled"] | WebhookNotificationEventType
)
```

Every event type the authority sends today. Later types arrive as `WebhookUnknownEvent`.

### `WebhookNotificationEvent` type

```python
WebhookNotificationEvent: TypeAlias = (
    WebhookMessageNotificationEvent | WebhookCallNotificationEvent | WebhookCallCancelledNotificationEvent
)
```

A per-recipient notification event: the input of the push payload builders.

### `WebhookNotificationEventType` type

```python
WebhookNotificationEventType: TypeAlias = Literal[
    "notification.message", "notification.call", "notification.callCancelled"
]
```

Per-recipient notification events for your push notifications. The contract is `spec/push-payload/`.

### `WebhookResourceEventType` type

```python
WebhookResourceEventType: TypeAlias = Literal[
    "conversation.created",
    "conversation.updated",
    "member.added",
    "member.roleChanged",
    "member.historyExpanded",
    "member.removed",
    "member.broadcastPermissionChanged",
    "message.created",
    "message.edited",
    "message.deleted",
    "receipt.reported",
    "live.started",
    "live.participationChanged",
    "live.alerted",
    "live.ready",
    "live.connected",
    "live.ended",
]
```

A change to a conversation, member, message, receipt or call.

### `WebhookVerificationCode` type

```python
WebhookVerificationCode: TypeAlias = Literal[
    "INVALID_SECRET",
    "MISSING_HEADER",
    "INVALID_HEADER",
    "INVALID_TIMESTAMP",
    "TIMESTAMP_EXPIRED",
    "TIMESTAMP_FUTURE",
    "BODY_TOO_LARGE",
    "TOO_MANY_SIGNATURES",
    "NO_MATCHING_SIGNATURE",
    "INVALID_BODY",
]
```

Why a delivery failed verification. See `WebhookVerificationError`.

## Functions

### `verify` function

```python
def verify(
    *,
    headers: WebhookHeaders,
    body: str | bytes | bytearray | memoryview,
    secrets: str | Sequence[str],
    tolerance_seconds: int = 300,
    now: datetime | None = None,
) -> WebhookDelivery
```

Verifies the signature and timestamp, then parses the metadata-only event.

Parameters:

- `headers`: The request headers (see `WebhookHeaders`). Names match case-insensitively; a repeated
  name fails.
- `body`: The exact request body bytes, or their exact UTF-8 decoding. Never re-serialized JSON.
- `secrets`: The endpoint's `whsec_` secrets: the current one and, during a rotation, the next or replaced one.
- `tolerance_seconds`: Allowed distance between `webhook-timestamp` and `now` in whole seconds, inclusive.
- `now`: The verifier's clock, a timezone-aware datetime. Defaults to the current time.

Raises:

- `WebhookVerificationError`: The delivery failed verification; `code` says why.
- `TypeError`: An argument has the wrong type.
- `ValueError`: `tolerance_seconds` is negative.

### `verify_signature` function

```python
def verify_signature(
    *,
    headers: WebhookHeaders,
    body: str | bytes | bytearray | memoryview,
    secrets: str | Sequence[str],
    tolerance_seconds: int = 300,
    now: datetime | None = None,
) -> WebhookSignature
```

Verifies only the signature and timestamp, for bodies you parse yourself. Arguments are as for `verify()`.
