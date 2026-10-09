# `convohop.push`

Builds APNs, FCM and Web Push requests from ConvoHop push notification events.

**Layer:** Server. **Runtime:** Python 3.11 or later. **Source:** `python/src/convohop`.

## Classes

### `PushPayloadError` class

```python
class PushPayloadError(Exception)
```

A push payload that couldn't be built. The message names the field but never contains its value.

#### `PushPayloadError.code` property

```python
code: PushPayloadCode
```

#### `PushPayloadError` constructor

```python
def __init__(self, code: PushPayloadCode, message: str) -> None
```

#### `PushPayloadError.message` property

```python
@property
def message(self) -> str
```

## Interfaces

### `ApnsAlert` interface

```python
ApnsAlert = TypedDict("ApnsAlert", {...})
```

The visible alert. Without a body it has a `loc-key`; define those keys in your app's `Localizable.strings`.

#### `ApnsAlert["title"]` property

```python
"title": NotRequired[str]
```

#### `ApnsAlert["body"]` property

```python
"body": NotRequired[str]
```

#### `ApnsAlert["loc-key"]` property

```python
"loc-key": NotRequired[str]
```

Present when there is no body: CONVOHOP_MESSAGE, CONVOHOP_CALL or CONVOHOP_MISSED_CALL.

### `ApnsAlertPayload` interface

```python
class ApnsAlertPayload(TypedDict)
```

#### `ApnsAlertPayload["aps"]` property

```python
aps: ApnsAps
```

#### `ApnsAlertPayload["convohop"]` property

```python
convohop: PushData
```

### `ApnsAlertRequest` interface

```python
class ApnsAlertRequest(TypedDict)
```

An APNs alert: send `encode(request["payload"])` with `request["headers"]`.

#### `ApnsAlertRequest["headers"]` property

```python
headers: ApnsHeaders
```

#### `ApnsAlertRequest["payload"]` property

```python
payload: ApnsAlertPayload
```

### `ApnsAps` interface

```python
ApnsAps = TypedDict("ApnsAps", {...})
```

The `aps` dictionary of an APNs alert.

#### `ApnsAps["alert"]` property

```python
"alert": ApnsAlert
```

#### `ApnsAps["sound"]` property

```python
"sound": str
```

#### `ApnsAps["mutable-content"]` property

```python
"mutable-content": Literal[0, 1]
```

#### `ApnsAps["thread-id"]` property

```python
"thread-id": str
```

### `ApnsHeaders` interface

```python
ApnsHeaders = TypedDict("ApnsHeaders", {...})
```

HTTP/2 headers for APNs. Your APNs client adds `authorization` and sends to `/3/device/<token>`.

#### `ApnsHeaders["apns-push-type"]` property

```python
"apns-push-type": Literal["alert", "voip"]
```

#### `ApnsHeaders["apns-topic"]` property

```python
"apns-topic": str
```

#### `ApnsHeaders["apns-priority"]` property

```python
"apns-priority": Literal["5", "10"]
```

#### `ApnsHeaders["apns-expiration"]` property

```python
"apns-expiration": str
```

Unix seconds after which APNs stops trying to deliver.

#### `ApnsHeaders["apns-collapse-id"]` property

```python
"apns-collapse-id": NotRequired[str]
```

Calls and missed calls: the ring's collapse key, so a missed-call alert replaces the incoming-call alert.

### `ApnsVoipRequest` interface

```python
class ApnsVoipRequest(TypedDict)
```

An APNs VoIP push: send `encode(request["payload"])` with `request["headers"]`.

#### `ApnsVoipRequest["headers"]` property

```python
headers: ApnsHeaders
```

#### `ApnsVoipRequest["payload"]` property

```python
payload: PushDataPayload
```

### `FcmAndroid` interface

```python
class FcmAndroid(TypedDict)
```

#### `FcmAndroid["priority"]` property

```python
priority: Literal["NORMAL", "HIGH"]
```

#### `FcmAndroid["ttl"]` property

```python
ttl: str
```

#### `FcmAndroid["collapse_key"]` property

```python
collapse_key: NotRequired[str]
```

### `FcmData` interface

```python
class FcmData(TypedDict)
```

#### `FcmData["convohop"]` property

```python
convohop: str
```

`PushData` as compact JSON.

### `FcmMessage` interface

```python
class FcmMessage(TypedDict)
```

#### `FcmMessage["data"]` property

```python
data: FcmData
```

#### `FcmMessage["android"]` property

```python
android: FcmAndroid
```

### `FcmRequest` interface

```python
class FcmRequest(TypedDict)
```

An FCM HTTP v1 REST `messages:send` message without a target: add `token` to `message`.

Firebase Admin SDKs take `android` in their own form, such as `firebase_admin.messaging.AndroidConfig` with a
`ttl` in seconds.

#### `FcmRequest["message"]` property

```python
message: FcmMessage
```

### `PushData` interface

```python
class PushData(TypedDict)
```

The `convohop` metadata every payload carries for your app: the event's fields without `subjectRef`,
`connected` and `preview`. APNs VoIP, FCM and Web Push payloads also carry the visible `title` and `body`
here, because they have no visible alert of their own.

#### `PushData["eventId"]` property

```python
eventId: str
```

#### `PushData["eventType"]` property

```python
eventType: WebhookNotificationEventType
```

#### `PushData["occurredAt"]` property

```python
occurredAt: str
```

#### `PushData["projectId"]` property

```python
projectId: str
```

#### `PushData["recipientId"]` property

```python
recipientId: str
```

#### `PushData["conversationId"]` property

```python
conversationId: str
```

#### `PushData["senderId"]` property

```python
senderId: str
```

#### `PushData["messageId"]` property

```python
messageId: NotRequired[str]
```

#### `PushData["liveSessionId"]` property

```python
liveSessionId: NotRequired[str]
```

#### `PushData["alertId"]` property

```python
alertId: NotRequired[str]
```

#### `PushData["expiresAt"]` property

```python
expiresAt: NotRequired[str]
```

#### `PushData["mediaProfile"]` property

```python
mediaProfile: NotRequired[str]
```

#### `PushData["reason"]` property

```python
reason: NotRequired[str]
```

#### `PushData["title"]` property

```python
title: NotRequired[str]
```

#### `PushData["body"]` property

```python
body: NotRequired[str]
```

### `PushDataPayload` interface

```python
class PushDataPayload(TypedDict)
```

A payload of only the `convohop` metadata: APNs VoIP and Web Push.

#### `PushDataPayload["convohop"]` property

```python
convohop: PushData
```

### `WebPushHeaders` interface

```python
class WebPushHeaders(TypedDict)
```

RFC 8030 headers for your Web Push library, which encrypts the payload (RFC 8291) and signs (VAPID). Where it
sets `TTL`, `Urgency` or `Topic` from its own options, pass the values there, or its defaults replace them.

#### `WebPushHeaders["TTL"]` property

```python
TTL: str
```

#### `WebPushHeaders["Urgency"]` property

```python
Urgency: Literal["very-low", "low", "normal", "high"]
```

#### `WebPushHeaders["Topic"]` property

```python
Topic: NotRequired[str]
```

### `WebPushRequest` interface

```python
class WebPushRequest(TypedDict)
```

A Web Push message: encrypt `encode(request["payload"])` and send it with `request["headers"]`.

#### `WebPushRequest["headers"]` property

```python
headers: WebPushHeaders
```

#### `WebPushRequest["payload"]` property

```python
payload: PushDataPayload
```

## Types

### `PushPayloadCode` type

```python
PushPayloadCode: TypeAlias = Literal["INVALID_EVENT", "INVALID_OPTIONS"]
```

Why a push payload couldn't be built:

- `INVALID_OPTIONS`: an option has the wrong type, `title` or `body` has a lone surrogate, `now` isn't a
  timezone-aware datetime, or `bundle_id` isn't an app bundle ID. Options are checked first.
- `INVALID_EVENT`: the event doesn't match the push payload contract.

## Functions

### `apns_alert` function

```python
def apns_alert(
    event: WebhookNotificationEvent | Mapping[str, Any],
    *,
    bundle_id: str,
    title: str | None = None,
    body: str | None = None,
    preview: bool = True,
    now: datetime | None = None,
) -> ApnsAlertRequest | None
```

An APNs alert for a message, an incoming call, or a missed call (`notification.callCancelled` with reason
`ended` or `expired`); `None` for other cancellations and stale events. At most 4096 bytes.

Parameters:

- `event`: A notification event.
- `bundle_id`: The app's bundle ID, the `apns-topic`.
- `title`: The visible title, such as the sender's or conversation's name. Omitted when empty.
- `body`: The visible body. Replaces the message preview. Omitted when empty.
- `preview`: Whether a message event's preview becomes the body when `body` is empty.
- `now`: The clock for the lifetime and expiration, a timezone-aware datetime. Defaults to the current time.

Raises:

- `PushPayloadError`: An option or the event is invalid.

### `apns_voip` function

```python
def apns_voip(
    event: WebhookNotificationEvent | Mapping[str, Any],
    *,
    bundle_id: str,
    title: str | None = None,
    body: str | None = None,
    preview: bool = True,
    now: datetime | None = None,
) -> ApnsVoipRequest | None
```

An APNs VoIP push for an incoming call; `None` for other events and stale calls. The topic is
`<bundle_id>.voip`. iOS requires you to report every VoIP push to CallKit as a call. At most 5120 bytes.

Arguments and errors are as for `apns_alert()`.

### `encode` function

```python
def encode(value: object) -> bytes
```

Serializes a request part as compact UTF-8 JSON, the form the builders measure. For example,
`encode(request["payload"])` is the APNs body and the Web Push plaintext.

### `fcm` function

```python
def fcm(
    event: WebhookNotificationEvent | Mapping[str, Any],
    *,
    title: str | None = None,
    body: str | None = None,
    preview: bool = True,
    now: datetime | None = None,
) -> FcmRequest | None
```

An FCM data message for any notification event; `None` for stale events. At most 4096 bytes of `data` as
JSON. Android apps build the notification themselves.

Arguments and errors are as for `apns_alert()`, without `bundle_id`.

### `web_push` function

```python
def web_push(
    event: WebhookNotificationEvent | Mapping[str, Any],
    *,
    title: str | None = None,
    body: str | None = None,
    preview: bool = True,
    now: datetime | None = None,
) -> WebPushRequest | None
```

A Web Push message for any notification event; `None` for stale events. At most 3993 bytes, the RFC 8291
plaintext limit. Your service worker shows the notification.

Arguments and errors are as for `apns_alert()`, without `bundle_id`.
