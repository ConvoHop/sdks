"""Push payload builders for the contract in ``spec/push-payload/``.

They are pure functions: they send nothing and hold no credentials. Your push library sends the requests and owns
APNs and FCM authorization, Web Push encryption (RFC 8291) and VAPID signing.

Each builder takes a per-recipient notification event (``notification.message``, ``notification.call`` or
``notification.callCancelled``) as :func:`convohop.webhooks.verify` returns it, or as a mapping in its wire form. It
validates its options and then the event, raising :class:`PushPayloadError`, and returns ``None`` when the event
doesn't apply to the platform or is stale. Payloads are metadata-only unless you pass ``title`` or ``body``, or the
event carries an opted-in message preview.

Requests are plain dicts. Serialize a payload with :func:`encode`: the builders measure their limits on that compact
form, and ``json.dumps`` with its defaults (ASCII escapes, spaces after separators) can exceed them.
"""

# No `from __future__ import annotations`: postponed annotations hide NotRequired from the TypedDicts'
# __required_keys__ and __optional_keys__, which runtime type checkers read.
import json
import re
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Final, Literal, NotRequired, TypeAlias, TypedDict, TypeVar

from .webhooks import (
    WebhookCallCancelledNotificationEvent,
    WebhookCallNotificationEvent,
    WebhookEndpointDisabledEvent,
    WebhookMessageNotificationEvent,
    WebhookNotificationEvent,
    WebhookNotificationEventType,
    WebhookResourceEvent,
    WebhookUnknownEvent,
    _epoch_seconds,
    _notification_event,
)

__all__ = [
    "ApnsAlert",
    "ApnsAlertPayload",
    "ApnsAlertRequest",
    "ApnsAps",
    "ApnsHeaders",
    "ApnsVoipRequest",
    "FcmAndroid",
    "FcmData",
    "FcmMessage",
    "FcmRequest",
    "PushData",
    "PushDataPayload",
    "PushPayloadCode",
    "PushPayloadError",
    "WebPushHeaders",
    "WebPushRequest",
    "apns_alert",
    "apns_voip",
    "encode",
    "fcm",
    "web_push",
]

PushPayloadCode: TypeAlias = Literal["INVALID_EVENT", "INVALID_OPTIONS"]
"""Why a push payload couldn't be built:

- ``INVALID_OPTIONS``: an option has the wrong type, ``title`` or ``body`` has a lone surrogate, ``now`` isn't a
  timezone-aware datetime, or ``bundle_id`` isn't an app bundle ID. Options are checked first.
- ``INVALID_EVENT``: the event doesn't match the push payload contract.
"""


class PushPayloadError(Exception):
    """A push payload that couldn't be built. The message names the field but never contains its value."""

    code: PushPayloadCode

    def __init__(self, code: PushPayloadCode, message: str) -> None:
        super().__init__(message)
        self.code = code

    @property
    def message(self) -> str:
        return str(self.args[0]) if self.args else ""

    def __reduce__(self) -> tuple[Any, ...]:
        return (type(self), (self.code, self.message))

    def __repr__(self) -> str:
        return f"{type(self).__name__}(code={self.code!r}, message={self.message!r})"


class PushData(TypedDict):
    """The ``convohop`` metadata every payload carries for your app: the event's fields without ``subjectRef``,
    ``connected`` and ``preview``. APNs VoIP, FCM and Web Push payloads also carry the visible ``title`` and ``body``
    here, because they have no visible alert of their own."""

    eventId: str
    eventType: WebhookNotificationEventType
    occurredAt: str
    projectId: str
    recipientId: str
    conversationId: str
    senderId: str
    messageId: NotRequired[str]
    liveSessionId: NotRequired[str]
    alertId: NotRequired[str]
    expiresAt: NotRequired[str]
    mediaProfile: NotRequired[str]
    reason: NotRequired[str]
    title: NotRequired[str]
    body: NotRequired[str]


ApnsHeaders = TypedDict(
    "ApnsHeaders",
    {
        "apns-push-type": Literal["alert", "voip"],
        "apns-topic": str,
        "apns-priority": Literal["5", "10"],
        # Unix seconds after which APNs stops trying to deliver.
        "apns-expiration": str,
        # Calls and missed calls: the ring's collapse key, so a missed-call alert replaces the incoming-call alert.
        "apns-collapse-id": NotRequired[str],
    },
)
"""HTTP/2 headers for APNs. Your APNs client adds ``authorization`` and sends to ``/3/device/<token>``."""

ApnsAlert = TypedDict(
    "ApnsAlert",
    {
        "title": NotRequired[str],
        "body": NotRequired[str],
        # Present when there is no body: CONVOHOP_MESSAGE, CONVOHOP_CALL or CONVOHOP_MISSED_CALL.
        "loc-key": NotRequired[str],
    },
)
"""The visible alert. Without a body it has a ``loc-key``; define those keys in your app's ``Localizable.strings``."""

ApnsAps = TypedDict(
    "ApnsAps",
    {"alert": ApnsAlert, "sound": str, "mutable-content": Literal[0, 1], "thread-id": str},
)
"""The ``aps`` dictionary of an APNs alert."""


class ApnsAlertPayload(TypedDict):
    aps: ApnsAps
    convohop: PushData


class ApnsAlertRequest(TypedDict):
    """An APNs alert: send ``encode(request["payload"])`` with ``request["headers"]``."""

    headers: ApnsHeaders
    payload: ApnsAlertPayload


class PushDataPayload(TypedDict):
    """A payload of only the ``convohop`` metadata: APNs VoIP and Web Push."""

    convohop: PushData


class ApnsVoipRequest(TypedDict):
    """An APNs VoIP push: send ``encode(request["payload"])`` with ``request["headers"]``."""

    headers: ApnsHeaders
    payload: PushDataPayload


class FcmData(TypedDict):
    convohop: str
    """:class:`PushData` as compact JSON."""


class FcmAndroid(TypedDict):
    priority: Literal["NORMAL", "HIGH"]
    ttl: str
    collapse_key: NotRequired[str]


class FcmMessage(TypedDict):
    data: FcmData
    android: FcmAndroid


class FcmRequest(TypedDict):
    """An FCM HTTP v1 REST ``messages:send`` message without a target: add ``token`` to ``message``.

    Firebase Admin SDKs take ``android`` in their own form, such as ``firebase_admin.messaging.AndroidConfig`` with a
    ``ttl`` in seconds.
    """

    message: FcmMessage


class WebPushHeaders(TypedDict):
    """RFC 8030 headers for your Web Push library, which encrypts the payload (RFC 8291) and signs (VAPID). Where it
    sets ``TTL``, ``Urgency`` or ``Topic`` from its own options, pass the values there, or its defaults replace them."""

    TTL: str
    Urgency: Literal["very-low", "low", "normal", "high"]
    Topic: NotRequired[str]


class WebPushRequest(TypedDict):
    """A Web Push message: encrypt ``encode(request["payload"])`` and send it with ``request["headers"]``."""

    headers: WebPushHeaders
    payload: PushDataPayload


# Payload limits in UTF-8 bytes. Web Push: RFC 8291's plaintext limit for the 4096-byte body push services accept, less
# the encryption header (86), AEAD tag (16) and padding delimiter (1).
_APNS_ALERT_LIMIT: Final = 4096
_APNS_VOIP_LIMIT: Final = 5120
_FCM_LIMIT: Final = 4096
_WEB_PUSH_LIMIT: Final = 4096 - 86 - 16 - 1
# Lifetimes in seconds: messages and missed calls stay relevant for a day; no platform stores longer than 28 days.
_NOTICE_LIFETIME: Final = 86_400
_MAX_LIFETIME: Final = 2_419_200
_BUNDLE_ID = re.compile(r"[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*")
_BUNDLE_ID_LIMIT: Final = 155
_LONE_SURROGATE = re.compile("[\ud800-\udfff]")
_ELLIPSIS: Final = "\u2026"
_EPOCH: Final = datetime(1970, 1, 1, tzinfo=UTC)
_SECOND: Final = timedelta(seconds=1)
_EVENTS: Final = (
    WebhookMessageNotificationEvent,
    WebhookCallNotificationEvent,
    WebhookCallCancelledNotificationEvent,
    WebhookResourceEvent,
    WebhookEndpointDisabledEvent,
    WebhookUnknownEvent,
)

_Request = TypeVar("_Request")


@dataclass(frozen=True, slots=True)
class _Text:
    title: str | None
    body: str | None


@dataclass(frozen=True, slots=True)
class _Prepared:
    event: WebhookNotificationEvent
    text: _Text
    now_seconds: int
    bundle_id: str


def encode(value: object) -> bytes:
    """Serializes a request part as compact UTF-8 JSON, the form the builders measure. For example,
    ``encode(request["payload"])`` is the APNs body and the Web Push plaintext."""
    return _compact(value).encode()


def apns_alert(
    event: WebhookNotificationEvent | Mapping[str, Any],
    *,
    bundle_id: str,
    title: str | None = None,
    body: str | None = None,
    preview: bool = True,
    now: datetime | None = None,
) -> ApnsAlertRequest | None:
    """An APNs alert for a message, an incoming call, or a missed call (``notification.callCancelled`` with reason
    ``ended`` or ``expired``); ``None`` for other cancellations and stale events. At most 4096 bytes.

    Args:
        event: A notification event.
        bundle_id: The app's bundle ID, the ``apns-topic``.
        title: The visible title, such as the sender's or conversation's name. Omitted when empty.
        body: The visible body. Replaces the message preview. Omitted when empty.
        preview: Whether a message event's preview becomes the body when ``body`` is empty.
        now: The clock for the lifetime and expiration, a timezone-aware datetime. Defaults to the current time.

    Raises:
        PushPayloadError: An option or the event is invalid.
    """
    prepared = _prepare(event, title, body, preview, now, bundle_id, apns=True)
    notice = prepared.event
    if isinstance(notice, WebhookCallCancelledNotificationEvent) and not _missed_call(notice):
        return None
    life = _lifetime(prepared)
    if life is None:
        return None
    headers = _apns_headers("alert", prepared.bundle_id, life[1], _collapse_key(notice))
    if isinstance(notice, WebhookMessageNotificationEvent):
        key = "CONVOHOP_MESSAGE"
    elif isinstance(notice, WebhookCallNotificationEvent):
        key = "CONVOHOP_CALL"
    else:
        key = "CONVOHOP_MISSED_CALL"
    convohop = _data(notice)

    def build(text: _Text) -> ApnsAlertRequest:
        alert: ApnsAlert = {}
        if text.title is not None:
            alert["title"] = text.title
        if text.body is None:
            alert["loc-key"] = key
        else:
            alert["body"] = text.body
        aps: ApnsAps = {"alert": alert, "sound": "default", "mutable-content": 1, "thread-id": notice.conversation_id}
        return {"headers": headers, "payload": {"aps": aps, "convohop": convohop}}

    return _fit(_APNS_ALERT_LIMIT, prepared.text, build, lambda request: _size(request["payload"]))


def apns_voip(
    event: WebhookNotificationEvent | Mapping[str, Any],
    *,
    bundle_id: str,
    title: str | None = None,
    body: str | None = None,
    preview: bool = True,
    now: datetime | None = None,
) -> ApnsVoipRequest | None:
    """An APNs VoIP push for an incoming call; ``None`` for other events and stale calls. The topic is
    ``<bundle_id>.voip``. iOS requires you to report every VoIP push to CallKit as a call. At most 5120 bytes.

    Arguments and errors are as for :func:`apns_alert`.
    """
    prepared = _prepare(event, title, body, preview, now, bundle_id, apns=True)
    notice = prepared.event
    if not isinstance(notice, WebhookCallNotificationEvent):
        return None
    life = _lifetime(prepared)
    if life is None:
        return None
    headers = _apns_headers("voip", f"{prepared.bundle_id}.voip", life[1], None)

    def build(text: _Text) -> ApnsVoipRequest:
        return {"headers": headers, "payload": {"convohop": _data(notice, text)}}

    return _fit(_APNS_VOIP_LIMIT, prepared.text, build, lambda request: _size(request["payload"]))


def fcm(
    event: WebhookNotificationEvent | Mapping[str, Any],
    *,
    title: str | None = None,
    body: str | None = None,
    preview: bool = True,
    now: datetime | None = None,
) -> FcmRequest | None:
    """An FCM data message for any notification event; ``None`` for stale events. At most 4096 bytes of ``data`` as
    JSON. Android apps build the notification themselves.

    Arguments and errors are as for :func:`apns_alert`, without ``bundle_id``.
    """
    prepared = _prepare(event, title, body, preview, now, None, apns=False)
    life = _lifetime(prepared)
    if life is None:
        return None
    android: FcmAndroid = {"priority": "HIGH", "ttl": f"{life[0]}s"}
    collapse = _collapse_key(prepared.event)
    if collapse is not None:
        android["collapse_key"] = collapse

    def build(text: _Text) -> FcmRequest:
        return {"message": {"data": {"convohop": _compact(_data(prepared.event, text))}, "android": android}}

    return _fit(_FCM_LIMIT, prepared.text, build, lambda request: _size(request["message"]["data"]))


def web_push(
    event: WebhookNotificationEvent | Mapping[str, Any],
    *,
    title: str | None = None,
    body: str | None = None,
    preview: bool = True,
    now: datetime | None = None,
) -> WebPushRequest | None:
    """A Web Push message for any notification event; ``None`` for stale events. At most 3993 bytes, the RFC 8291
    plaintext limit. Your service worker shows the notification.

    Arguments and errors are as for :func:`apns_alert`, without ``bundle_id``.
    """
    prepared = _prepare(event, title, body, preview, now, None, apns=False)
    life = _lifetime(prepared)
    if life is None:
        return None
    message = isinstance(prepared.event, WebhookMessageNotificationEvent)
    headers: WebPushHeaders = {"TTL": str(life[0]), "Urgency": "normal" if message else "high"}
    collapse = _collapse_key(prepared.event)
    if collapse is not None:
        headers["Topic"] = collapse

    def build(text: _Text) -> WebPushRequest:
        return {"headers": headers, "payload": {"convohop": _data(prepared.event, text)}}

    return _fit(_WEB_PUSH_LIMIT, prepared.text, build, lambda request: _size(request["payload"]))


def _invalid_options(message: str) -> PushPayloadError:
    return PushPayloadError("INVALID_OPTIONS", message)


def _option_text(value: object, field: str) -> str | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str) or _LONE_SURROGATE.search(value) is not None:
        raise _invalid_options(f"{field} must be a string without lone surrogates")
    return value


def _prepare(
    event: object,
    title: object,
    body: object,
    preview: object,
    now: object,
    bundle_id: object,
    *,
    apns: bool,
) -> _Prepared:
    shown_title = _option_text(title, "title")
    shown_body = _option_text(body, "body")
    if not isinstance(preview, bool):
        raise _invalid_options("preview must be a boolean")
    clock = datetime.now(UTC) if now is None else now
    if not isinstance(clock, datetime) or clock.utcoffset() is None:
        raise _invalid_options("now must be a timezone-aware datetime")
    topic = ""
    if apns:
        if (
            not isinstance(bundle_id, str)
            or len(bundle_id) > _BUNDLE_ID_LIMIT
            or _BUNDLE_ID.fullmatch(bundle_id) is None
        ):
            raise _invalid_options("bundle_id must be an app bundle ID")
        topic = bundle_id
    parsed = _notification_event(event.to_dict() if isinstance(event, _EVENTS) else event)
    if isinstance(parsed, str):
        raise PushPayloadError("INVALID_EVENT", f"Invalid notification event: {parsed}")
    if (
        shown_body is None
        and preview
        and isinstance(parsed, WebhookMessageNotificationEvent)
        and parsed.preview is not None
    ):
        shown_body = parsed.preview.text + (_ELLIPSIS if parsed.preview.truncated else "")
    return _Prepared(parsed, _Text(shown_title, shown_body), (clock - _EPOCH) // _SECOND, topic)


def _seconds(timestamp: str) -> int:
    value = _epoch_seconds(timestamp)
    if value is None:
        raise RuntimeError("ConvoHop push: a validated timestamp didn't parse")
    return value


def _missed_call(event: WebhookCallCancelledNotificationEvent) -> bool:
    return event.reason in ("ended", "expired")


def _deadline(event: WebhookNotificationEvent) -> int:
    """Unix seconds until which delivering the event is still useful."""
    if isinstance(event, WebhookMessageNotificationEvent):
        return _seconds(event.occurred_at) + _NOTICE_LIFETIME
    if isinstance(event, WebhookCallCancelledNotificationEvent) and _missed_call(event):
        return _seconds(event.occurred_at) + _NOTICE_LIFETIME
    return _seconds(event.expires_at)


def _lifetime(prepared: _Prepared) -> tuple[int, int] | None:
    """The remaining lifetime, capped at 28 days, and the expiration in Unix seconds; ``None`` when stale."""
    ttl = min(_deadline(prepared.event) - prepared.now_seconds, _MAX_LIFETIME)
    return (ttl, prepared.now_seconds + ttl) if ttl > 0 else None


def _collapse_key(event: WebhookNotificationEvent) -> str | None:
    """Calls and cancellations collapse per ring: 32 lowercase hex digits, valid as an APNs collapse ID, FCM collapse
    key and Web Push topic."""
    return None if isinstance(event, WebhookMessageNotificationEvent) else event.alert_id.replace("-", "")


def _apns_headers(
    push_type: Literal["alert", "voip"], topic: str, expiration: int, collapse: str | None
) -> ApnsHeaders:
    headers: ApnsHeaders = {
        "apns-push-type": push_type,
        "apns-topic": topic,
        "apns-priority": "10",
        "apns-expiration": str(expiration),
    }
    if collapse is not None:
        headers["apns-collapse-id"] = collapse
    return headers


def _data(event: WebhookNotificationEvent, text: _Text | None = None) -> PushData:
    data: PushData = {
        "eventId": event.event_id,
        "eventType": event.event_type,
        "occurredAt": event.occurred_at,
        "projectId": event.project_id,
        "recipientId": event.recipient_id,
        "conversationId": event.conversation_id,
        "senderId": event.sender_id,
    }
    if isinstance(event, WebhookMessageNotificationEvent):
        data["messageId"] = event.message_id
    else:
        data["liveSessionId"] = event.live_session_id
        data["alertId"] = event.alert_id
        data["expiresAt"] = event.expires_at
        data["mediaProfile"] = event.media_profile
        if isinstance(event, WebhookCallCancelledNotificationEvent):
            data["reason"] = event.reason
    if text is not None and text.title is not None:
        data["title"] = text.title
    if text is not None and text.body is not None:
        data["body"] = text.body
    return data


def _compact(value: object) -> str:
    # The output of ECMAScript's JSON.stringify for these values: the contract's canonical form.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def _size(value: object) -> int:
    """UTF-8 bytes of the canonical JSON serialization."""
    return len(_compact(value).encode())


def _shortened(text: _Text, field: str, value: str) -> _Text:
    return _Text(text.title, value) if field == "body" else _Text(value, text.body)


def _fit(
    limit: int,
    initial: _Text,
    build: Callable[[_Text], _Request],
    measure: Callable[[_Request], int],
) -> _Request:
    """Builds the request, shortening ``body`` and then ``title`` while the measured payload exceeds ``limit``: each
    becomes its longest code-point prefix that fits followed by ``…``, or just ``…`` when no prefix fits."""
    text = initial
    request = build(text)
    for field in ("body", "title"):
        original = text.body if field == "body" else text.title
        if measure(request) <= limit:
            return request
        if original is None:
            continue
        # A prefix of more than `limit` code points is more than `limit` bytes, so it never fits.
        points = original[: limit + 1]
        current = text
        low, high, best = 0, len(points) - 1, 0
        while low <= high:
            middle = (low + high) // 2
            if measure(build(_shortened(current, field, points[:middle] + _ELLIPSIS))) <= limit:
                best = middle
                low = middle + 1
            else:
                high = middle - 1
        text = _shortened(current, field, points[:best] + _ELLIPSIS)
        request = build(text)
    if measure(request) > limit:
        raise RuntimeError(f"ConvoHop push: notification metadata exceeds {limit} bytes")
    return request
