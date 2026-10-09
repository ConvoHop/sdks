"""Verifies ConvoHop webhook deliveries: Standard Webhooks symmetric ``v1`` signatures over the raw body.

Pass the exact request body, respond ``2xx`` within 5 seconds, then process. De-duplicate on ``webhook_id``: retries
and replays of a delivery keep it. Events are metadata-only; fetch a resource through the API when you need its
content. ``notification.*`` events follow the push payload contract in ``spec/push-payload/`` and are the input of
:mod:`convohop.push`.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, ClassVar, Final, Literal, Protocol, TypeAlias, cast

from ._json import parse
from ._protocol import is_id

__all__ = [
    "WebhookCallCancelledNotificationEvent",
    "WebhookCallNotificationEvent",
    "WebhookDelivery",
    "WebhookEndpointDisabledEvent",
    "WebhookEvent",
    "WebhookEventType",
    "WebhookHeaders",
    "WebhookMessageNotificationEvent",
    "WebhookNotificationEvent",
    "WebhookNotificationEventType",
    "WebhookNotificationPreview",
    "WebhookResourceEvent",
    "WebhookResourceEventType",
    "WebhookSignature",
    "WebhookSubjectRef",
    "WebhookUnknownEvent",
    "WebhookVerificationCode",
    "WebhookVerificationError",
    "verify",
    "verify_signature",
]

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
"""A change to a conversation, member, message, receipt or call."""

WebhookNotificationEventType: TypeAlias = Literal[
    "notification.message", "notification.call", "notification.callCancelled"
]
"""Per-recipient notification events for your push notifications. The contract is ``spec/push-payload/``."""

WebhookEventType: TypeAlias = (
    WebhookResourceEventType | Literal["webhook.endpointDisabled"] | WebhookNotificationEventType
)
"""Every event type the authority sends today. Later types arrive as :class:`WebhookUnknownEvent`."""

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
"""Why a delivery failed verification. See :class:`WebhookVerificationError`."""


class WebhookHeaders(Protocol):
    """Request headers: a mapping, or any object whose ``items()`` yields every (name, value) pair, such as the header
    objects of Starlette, Django, Flask, aiohttp and ``http.server``. A value may be a one-element list."""

    def items(self) -> Iterable[tuple[Any, Any]]: ...


class WebhookVerificationError(Exception):
    """A delivery that failed verification. The message never contains secrets, signatures or the body.

    Checks run in this order and stop at the first failure:

    - ``INVALID_SECRET``: no secret is given, or one is not ``whsec_`` followed by padded standard Base64 of 24 to
      64 bytes. This is your configuration, not the sender.
    - ``MISSING_HEADER``: ``webhook-id``, ``webhook-timestamp`` or ``webhook-signature`` is absent or empty.
    - ``INVALID_HEADER``: one of those headers is repeated.
    - ``INVALID_TIMESTAMP``: ``webhook-timestamp`` is not 1 to 15 ASCII digits (integer Unix seconds).
    - ``TIMESTAMP_EXPIRED``: the timestamp is more than ``tolerance_seconds`` before now.
    - ``TIMESTAMP_FUTURE``: the timestamp is more than ``tolerance_seconds`` after now.
    - ``BODY_TOO_LARGE``: the body exceeds 4096 bytes.
    - ``TOO_MANY_SIGNATURES``: ``webhook-signature`` has more than 8 entries.
    - ``NO_MATCHING_SIGNATURE``: no ``v1`` entry matches any secret.
    - ``INVALID_BODY``: :func:`verify` only; the signed body is not a UTF-8 JSON event envelope.
    """

    code: WebhookVerificationCode

    def __init__(self, code: WebhookVerificationCode, message: str) -> None:
        super().__init__(message)
        self.code = code

    @property
    def message(self) -> str:
        return str(self.args[0]) if self.args else ""

    def __reduce__(self) -> tuple[Any, ...]:
        return (type(self), (self.code, self.message))

    def __repr__(self) -> str:
        return f"{type(self).__name__}(code={self.code!r}, message={self.message!r})"


@dataclass(frozen=True, slots=True)
class WebhookSubjectRef:
    """The resource an event is about."""

    id: str
    kind: str

    def to_dict(self) -> dict[str, Any]:
        return {"id": self.id, "kind": self.kind}


@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookResourceEvent:
    """A change to a conversation, member, message, receipt or call. ``subject_ref`` names the resource."""

    known: ClassVar[bool] = True
    event_id: str
    event_type: WebhookResourceEventType
    occurred_at: str
    """RFC 3339 text exactly as sent."""
    project_id: str
    subject_ref: WebhookSubjectRef

    def to_dict(self) -> dict[str, Any]:
        """The event in its wire form, with camelCase keys."""
        return _envelope(self.event_id, self.event_type, self.occurred_at, self.project_id, self.subject_ref)


@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookEndpointDisabledEvent:
    """Another of the project's webhook endpoints was disabled after repeated failures. ``subject_ref.id`` names it."""

    known: ClassVar[bool] = True
    event_id: str
    event_type: Literal["webhook.endpointDisabled"] = "webhook.endpointDisabled"
    occurred_at: str
    project_id: str
    subject_ref: WebhookSubjectRef

    def to_dict(self) -> dict[str, Any]:
        """The event in its wire form, with camelCase keys."""
        return _envelope(self.event_id, self.event_type, self.occurred_at, self.project_id, self.subject_ref)


@dataclass(frozen=True, slots=True)
class WebhookNotificationPreview:
    """The start of the message text. Present only when the project opts in to previews and the message has text."""

    text: str
    """1 to 512 Unicode code points."""
    truncated: bool
    """Whether the message text continues after ``text``."""

    def to_dict(self) -> dict[str, Any]:
        return {"text": self.text, "truncated": self.truncated}


@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookMessageNotificationEvent:
    """A message for the recipient.

    ``connected`` says whether the recipient had an active realtime connection when the event was produced. It is a
    hint for your sending policy: it isn't per device, and it can change before you send. The push builders ignore it.
    """

    known: ClassVar[bool] = True
    event_id: str
    event_type: Literal["notification.message"] = "notification.message"
    occurred_at: str
    project_id: str
    subject_ref: WebhookSubjectRef
    recipient_id: str
    """The principal to notify. Each recipient gets its own event."""
    conversation_id: str
    sender_id: str
    connected: bool
    message_id: str
    preview: WebhookNotificationPreview | None = None

    def to_dict(self) -> dict[str, Any]:
        """The event in its wire form, with camelCase keys, as the push builders accept it."""
        wire = _notification_dict(self)
        wire["messageId"] = self.message_id
        if self.preview is not None:
            wire["preview"] = self.preview.to_dict()
        return wire


@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookCallNotificationEvent:
    """An incoming call: one ring for the recipient. A later ring of the same call has a new ``alert_id``."""

    known: ClassVar[bool] = True
    event_id: str
    event_type: Literal["notification.call"] = "notification.call"
    occurred_at: str
    project_id: str
    subject_ref: WebhookSubjectRef
    recipient_id: str
    conversation_id: str
    sender_id: str
    connected: bool
    live_session_id: str
    alert_id: str
    expires_at: str
    """When the ringing stops (RFC 3339 text exactly as sent)."""
    media_profile: str
    """``AUDIO_ONLY``, ``AUDIO_VIDEO`` or a later profile."""

    def to_dict(self) -> dict[str, Any]:
        """The event in its wire form, with camelCase keys, as the push builders accept it."""
        return _call_dict(self)


@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookCallCancelledNotificationEvent:
    """A ring that stopped for the recipient. Only recipients of the ring's ``notification.call`` get it.

    ``reason`` ``answered`` and ``declined`` (by the recipient, on any device) only stop the ringing. ``ended`` (the
    call ended or stopped ringing before the recipient answered) and ``expired`` (nobody answered by ``expires_at``)
    are missed calls. Treat an unknown reason as stop ringing, without a missed-call alert.
    """

    known: ClassVar[bool] = True
    event_id: str
    event_type: Literal["notification.callCancelled"] = "notification.callCancelled"
    occurred_at: str
    project_id: str
    subject_ref: WebhookSubjectRef
    recipient_id: str
    conversation_id: str
    sender_id: str
    connected: bool
    live_session_id: str
    alert_id: str
    """The ``alert_id`` of the ring that stopped."""
    expires_at: str
    """The stopped ring's original deadline (RFC 3339 text exactly as sent)."""
    media_profile: str
    reason: str
    """``answered``, ``declined``, ``ended``, ``expired`` or a later reason."""

    def to_dict(self) -> dict[str, Any]:
        """The event in its wire form, with camelCase keys, as the push builders accept it."""
        wire = _call_dict(self)
        wire["reason"] = self.reason
        return wire


@dataclass(frozen=True, slots=True, kw_only=True)
class WebhookUnknownEvent:
    """An event this SDK does not know, including a ``notification.*`` event that doesn't match the push payload
    contract. Acknowledge it; it never makes :func:`verify` raise."""

    known: ClassVar[bool] = False
    event_id: str
    event_type: str
    occurred_at: str
    project_id: str
    subject_ref: WebhookSubjectRef

    def to_dict(self) -> dict[str, Any]:
        """The envelope fields in their wire form, with camelCase keys."""
        return _envelope(self.event_id, self.event_type, self.occurred_at, self.project_id, self.subject_ref)


WebhookNotificationEvent: TypeAlias = (
    WebhookMessageNotificationEvent | WebhookCallNotificationEvent | WebhookCallCancelledNotificationEvent
)
"""A per-recipient notification event: the input of the push payload builders."""

WebhookEvent: TypeAlias = (
    WebhookResourceEvent | WebhookEndpointDisabledEvent | WebhookNotificationEvent | WebhookUnknownEvent
)
"""A verified delivery's event. Match on the class, or check ``known`` and then ``event_type``."""


@dataclass(frozen=True, slots=True)
class WebhookSignature:
    """A verified delivery's ``webhook-id`` and ``webhook-timestamp`` (Unix seconds)."""

    webhook_id: str
    timestamp: int


@dataclass(frozen=True, slots=True)
class WebhookDelivery(WebhookSignature):
    """A verified delivery and its metadata-only event."""

    event: WebhookEvent


_BODY_LIMIT: Final = 4096
_SIGNATURE_LIMIT: Final = 8
_SIGNATURE_BYTES: Final = 32
_SECRET_PREFIX: Final = "whsec_"  # noqa: S105 - the Standard Webhooks prefix, not a secret
_SECRET_MIN_BYTES: Final = 24
_SECRET_MAX_BYTES: Final = 64
_DEFAULT_TOLERANCE: Final = 300
_BASE64 = re.compile(r"(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?")
_STAMP = re.compile(r"[0-9]{1,15}")
_EPOCH: Final = datetime(1970, 1, 1, tzinfo=UTC)
_SECOND: Final = timedelta(seconds=1)
_SURROGATE = re.compile("[\ud800-\udfff]")
_RESOURCE_TYPES: Final = frozenset(
    {
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
    }
)
_NOTIFICATION_TYPES: Final = frozenset({"notification.message", "notification.call", "notification.callCancelled"})


def verify(
    *,
    headers: WebhookHeaders,
    body: str | bytes | bytearray | memoryview,
    secrets: str | Sequence[str],
    tolerance_seconds: int = _DEFAULT_TOLERANCE,
    now: datetime | None = None,
) -> WebhookDelivery:
    """Verifies the signature and timestamp, then parses the metadata-only event.

    Args:
        headers: The request headers (see :class:`WebhookHeaders`). Names match case-insensitively; a repeated
            name fails.
        body: The exact request body bytes, or their exact UTF-8 decoding. Never re-serialized JSON.
        secrets: The endpoint's ``whsec_`` secrets: the current one and, during a rotation, the next or replaced one.
        tolerance_seconds: Allowed distance between ``webhook-timestamp`` and ``now`` in whole seconds, inclusive.
        now: The verifier's clock, a timezone-aware datetime. Defaults to the current time.

    Raises:
        WebhookVerificationError: The delivery failed verification; ``code`` says why.
        TypeError: An argument has the wrong type.
        ValueError: ``tolerance_seconds`` is negative.
    """
    signature, signed = _signature(headers, body, secrets, tolerance_seconds, now)
    return WebhookDelivery(signature.webhook_id, signature.timestamp, _event(signed))


def verify_signature(
    *,
    headers: WebhookHeaders,
    body: str | bytes | bytearray | memoryview,
    secrets: str | Sequence[str],
    tolerance_seconds: int = _DEFAULT_TOLERANCE,
    now: datetime | None = None,
) -> WebhookSignature:
    """Verifies only the signature and timestamp, for bodies you parse yourself. Arguments are as for :func:`verify`."""
    signature, _ = _signature(headers, body, secrets, tolerance_seconds, now)
    return signature


def _signature(
    headers: object,
    raw: object,
    secrets: object,
    tolerance: object,
    now: object,
) -> tuple[WebhookSignature, bytes]:
    if not isinstance(tolerance, int) or isinstance(tolerance, bool):
        raise TypeError("Webhook tolerance must be an integer number of seconds")
    if tolerance < 0:
        raise ValueError("Webhook tolerance must not be negative")
    clock = datetime.now(UTC) if now is None else now
    if not isinstance(clock, datetime) or clock.utcoffset() is None:
        raise TypeError("Webhook clock must be a timezone-aware datetime")
    if not isinstance(raw, str | bytes | bytearray | memoryview):
        raise TypeError("Webhook body must be str or bytes")
    keys = _secret_keys(secrets)
    webhook_id = _header(headers, "webhook-id")
    stamp = _header(headers, "webhook-timestamp")
    entries = [entry for entry in _header(headers, "webhook-signature").split(" ") if entry]
    if _STAMP.fullmatch(stamp) is None:
        raise WebhookVerificationError("INVALID_TIMESTAMP", "webhook-timestamp must be integer Unix seconds")
    timestamp = int(stamp)
    age = (clock - _EPOCH) // _SECOND - timestamp
    if age > tolerance:
        raise WebhookVerificationError("TIMESTAMP_EXPIRED", "webhook-timestamp is older than the tolerance")
    if -age > tolerance:
        raise WebhookVerificationError("TIMESTAMP_FUTURE", "webhook-timestamp is further ahead than the tolerance")
    body = _body(raw)
    if body is None:
        raise WebhookVerificationError("BODY_TOO_LARGE", f"Webhook body exceeds {_BODY_LIMIT} bytes")
    if len(entries) > _SIGNATURE_LIMIT:
        raise WebhookVerificationError(
            "TOO_MANY_SIGNATURES", f"webhook-signature has more than {_SIGNATURE_LIMIT} entries"
        )
    offered = [mac for mac in map(_offered, entries) if mac is not None]
    signed = f"{webhook_id}.{stamp}.".encode() + body
    for key in keys:
        expected = hmac.new(key, signed, hashlib.sha256).digest()
        # Every candidate is compared, so the time taken doesn't reveal which entry matched.
        matched = False
        for candidate in offered:
            matched |= hmac.compare_digest(expected, candidate)
        if matched:
            return WebhookSignature(webhook_id, timestamp), body
    raise WebhookVerificationError("NO_MATCHING_SIGNATURE", "No v1 webhook signature matches the configured secrets")


def _base64(value: str) -> bytes | None:
    """Strict padded standard Base64; non-canonical encodings are rejected so byte equality matches text equality."""
    if _BASE64.fullmatch(value) is None:
        return None
    try:
        decoded = base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError):
        return None
    return decoded if base64.b64encode(decoded).decode("ascii") == value else None


def _secret_keys(secrets: object) -> list[bytes]:
    listed: list[object] = []
    if isinstance(secrets, str):
        listed = [secrets]
    elif isinstance(secrets, Sequence):
        listed = list(secrets)
    if not listed:
        raise WebhookVerificationError("INVALID_SECRET", "At least one webhook secret is required")
    keys: list[bytes] = []
    for secret in listed:
        key = None
        if isinstance(secret, str) and secret.startswith(_SECRET_PREFIX):
            key = _base64(secret[len(_SECRET_PREFIX) :])
        if key is None or not _SECRET_MIN_BYTES <= len(key) <= _SECRET_MAX_BYTES:
            raise WebhookVerificationError(
                "INVALID_SECRET",
                "A webhook secret must be whsec_ followed by padded standard Base64 of 24 to 64 bytes",
            )
        keys.append(key)
    return keys


def _header(headers: object, name: str) -> str:
    items = getattr(headers, "items", None)
    if not callable(items):
        raise TypeError("Webhook headers must be a mapping or provide items()")
    found: list[object] = []
    for key, value in items():
        if isinstance(key, str) and key.lower() == name and value is not None:
            found.append(value)
    if len(found) > 1:
        raise WebhookVerificationError("INVALID_HEADER", f"Repeated {name} header")
    value = found[0] if found else None
    if isinstance(value, list | tuple):
        if len(value) > 1:
            raise WebhookVerificationError("INVALID_HEADER", f"Repeated {name} header")
        value = value[0] if value else None
    if not isinstance(value, str) or not value:
        raise WebhookVerificationError("MISSING_HEADER", f"Missing {name} header")
    return value


def _body(raw: str | bytes | bytearray | memoryview) -> bytes | None:
    """The body bytes, or ``None`` when they exceed the limit."""
    if isinstance(raw, str):
        # A string's UTF-8 encoding is at least as long as the string, so oversized strings are rejected unencoded.
        if len(raw) > _BODY_LIMIT:
            return None
        # Like TextEncoder, a lone surrogate encodes as U+FFFD.
        body = _SURROGATE.sub("\ufffd", raw).encode()
    else:
        body = bytes(raw)
    return body if len(body) <= _BODY_LIMIT else None


def _offered(entry: str) -> bytes | None:
    version, comma, mac = entry.partition(",")
    if not comma or version != "v1":
        return None
    decoded = _base64(mac)
    return decoded if decoded is not None and len(decoded) == _SIGNATURE_BYTES else None


def _invalid_body(message: str = "Webhook body is not a ConvoHop event envelope") -> WebhookVerificationError:
    return WebhookVerificationError("INVALID_BODY", message)


_UNPARSED: Final = object()


def _record(value: object) -> Mapping[str, Any]:
    if not isinstance(value, dict):
        raise _invalid_body()
    return cast("Mapping[str, Any]", value)


def _text(record: Mapping[str, Any], field: str) -> str:
    value = record.get(field)
    if not isinstance(value, str) or not value:
        raise _invalid_body()
    return value


def _event(body: bytes) -> WebhookEvent:
    value: object
    try:
        # Like JSON.parse, a number that overflows is infinite; an event never has one in a field it defines.
        value = parse(body.decode("utf-8-sig"), finite=False)
    except ValueError:
        value = _UNPARSED
    # Raised outside the handler, so the decode error, which holds the body, isn't chained to it.
    if value is _UNPARSED:
        raise _invalid_body("Webhook body is not UTF-8 JSON")
    envelope = _record(value)
    subject = _record(envelope.get("subjectRef"))
    event_type = _text(envelope, "eventType")
    ref = WebhookSubjectRef(_text(subject, "id"), _text(subject, "kind"))
    event_id = _text(envelope, "eventId")
    occurred_at = _text(envelope, "occurredAt")
    project_id = _text(envelope, "projectId")
    if event_type in _RESOURCE_TYPES:
        return WebhookResourceEvent(
            event_id=event_id,
            event_type=cast("WebhookResourceEventType", event_type),
            occurred_at=occurred_at,
            project_id=project_id,
            subject_ref=ref,
        )
    if event_type == "webhook.endpointDisabled" and ref.kind == "webhookEndpoint":
        return WebhookEndpointDisabledEvent(
            event_id=event_id, occurred_at=occurred_at, project_id=project_id, subject_ref=ref
        )
    if event_type in _NOTIFICATION_TYPES:
        parsed = _notification_event(envelope)
        if not isinstance(parsed, str):
            return parsed
    return WebhookUnknownEvent(
        event_id=event_id, event_type=event_type, occurred_at=occurred_at, project_id=project_id, subject_ref=ref
    )


def _envelope(
    event_id: str, event_type: str, occurred_at: str, project_id: str, ref: WebhookSubjectRef
) -> dict[str, Any]:
    return {
        "eventId": event_id,
        "eventType": event_type,
        "occurredAt": occurred_at,
        "projectId": project_id,
        "subjectRef": ref.to_dict(),
    }


def _notification_dict(event: WebhookNotificationEvent) -> dict[str, Any]:
    wire = _envelope(event.event_id, event.event_type, event.occurred_at, event.project_id, event.subject_ref)
    wire.update(
        recipientId=event.recipient_id,
        conversationId=event.conversation_id,
        senderId=event.sender_id,
        connected=event.connected,
    )
    return wire


def _call_dict(event: WebhookCallNotificationEvent | WebhookCallCancelledNotificationEvent) -> dict[str, Any]:
    wire = _notification_dict(event)
    wire.update(
        liveSessionId=event.live_session_id,
        alertId=event.alert_id,
        expiresAt=event.expires_at,
        mediaProfile=event.media_profile,
    )
    return wire


# Notification events follow spec/push-payload/push-payload.schema.json. The checks below mirror that schema.
_TIMESTAMP = re.compile(
    r"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))"
)
_IDENTIFIER = re.compile(r"[A-Za-z][A-Za-z0-9_]{0,63}")
_PREVIEW_LIMIT: Final = 512


def _epoch_seconds(value: str) -> int | None:
    """Unix seconds of an RFC 3339 timestamp with an uppercase ``T``, and ``Z`` or an offset, ignoring any fraction,
    or ``None`` when the value isn't one. The date must exist (proleptic Gregorian), and second 60 isn't accepted."""
    match = _TIMESTAMP.fullmatch(value)
    if match is None:
        return None
    year, month, day, hour, minute, second = (int(match[index]) for index in range(1, 7))
    sign, offset_hour, offset_minute = match[7], int(match[8] or 0), int(match[9] or 0)
    if not (1 <= month <= 12 and 1 <= day <= _days_in_month(year, month)):
        return None
    if hour > 23 or minute > 59 or second > 59 or offset_hour > 23 or offset_minute > 59:
        return None
    local = _days_from_civil(year, month, day) * 86_400 + hour * 3600 + minute * 60 + second
    return local - (-1 if sign == "-" else 1) * (offset_hour * 3600 + offset_minute * 60)


def _days_in_month(year: int, month: int) -> int:
    if month == 2:
        return 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28
    return 30 if month in (4, 6, 9, 11) else 31


def _days_from_civil(year: int, month: int, day: int) -> int:
    """Days since 1970-01-01 in the proleptic Gregorian calendar, which includes year 0."""
    year -= month <= 2
    era = year // 400
    year_of_era = year - era * 400
    day_of_year = (153 * ((month + 9) % 12) + 2) // 5 + day - 1
    day_of_era = year_of_era * 365 + year_of_era // 4 - year_of_era // 100 + day_of_year
    return era * 146_097 + day_of_era - 719_468


class _Malformed(Exception):
    def __init__(self, problem: str) -> None:
        super().__init__(problem)
        self.problem = problem


def _need(condition: bool, problem: str) -> None:
    if not condition:
        raise _Malformed(problem)


def _object(value: object, field: str) -> Mapping[str, Any]:
    _need(isinstance(value, Mapping), f"{field} must be an object")
    return cast("Mapping[str, Any]", value)


def _uuid(source: Mapping[str, Any], field: str) -> str:
    value = source.get(field)
    _need(isinstance(value, str) and is_id(value), f"{field} must be a lowercase, non-nil UUID")
    return cast("str", value)


def _timestamp(source: Mapping[str, Any], field: str) -> str:
    value = source.get(field)
    _need(isinstance(value, str) and _epoch_seconds(value) is not None, f"{field} must be an RFC 3339 timestamp")
    return cast("str", value)


def _identifier(source: Mapping[str, Any], field: str) -> str:
    value = source.get(field)
    _need(
        isinstance(value, str) and _IDENTIFIER.fullmatch(value) is not None,
        f"{field} must be an ASCII letter followed by up to 63 ASCII letters, digits or _",
    )
    return cast("str", value)


def _flag(source: Mapping[str, Any], field: str) -> bool:
    value = source.get(field)
    _need(isinstance(value, bool), f"{field} must be a boolean")
    return cast("bool", value)


def _preview(value: object) -> WebhookNotificationPreview:
    source = _object(value, "preview")
    text = source.get("text")
    _need(
        isinstance(text, str) and 0 < len(text) <= _PREVIEW_LIMIT and _SURROGATE.search(text) is None,
        f"preview.text must be 1 to {_PREVIEW_LIMIT} Unicode code points",
    )
    return WebhookNotificationPreview(cast("str", text), _flag(source, "truncated"))


def _subject(source: Mapping[str, Any], kind: str, subject_id: str) -> WebhookSubjectRef:
    value = _object(source.get("subjectRef"), "subjectRef")
    _need(value.get("kind") == kind and value.get("id") == subject_id, f"subjectRef must be the {kind} the event names")
    return WebhookSubjectRef(subject_id, kind)


def _notification(value: object) -> WebhookNotificationEvent:
    source = _object(value, "event")
    event_type = source.get("eventType")
    _need(
        isinstance(event_type, str) and event_type in _NOTIFICATION_TYPES, "eventType must be a notification event type"
    )
    event_id = _uuid(source, "eventId")
    occurred_at = _timestamp(source, "occurredAt")
    project_id = _uuid(source, "projectId")
    recipient_id = _uuid(source, "recipientId")
    conversation_id = _uuid(source, "conversationId")
    sender_id = _uuid(source, "senderId")
    connected = _flag(source, "connected")
    if event_type == "notification.message":
        message_id = _uuid(source, "messageId")
        ref = _subject(source, "message", message_id)
        preview = _preview(source["preview"]) if "preview" in source else None
        return WebhookMessageNotificationEvent(
            event_id=event_id,
            occurred_at=occurred_at,
            project_id=project_id,
            subject_ref=ref,
            recipient_id=recipient_id,
            conversation_id=conversation_id,
            sender_id=sender_id,
            connected=connected,
            message_id=message_id,
            preview=preview,
        )
    live_session_id = _uuid(source, "liveSessionId")
    ref = _subject(source, "liveSession", live_session_id)
    alert_id = _uuid(source, "alertId")
    expires_at = _timestamp(source, "expiresAt")
    media_profile = _identifier(source, "mediaProfile")
    if event_type == "notification.call":
        return WebhookCallNotificationEvent(
            event_id=event_id,
            occurred_at=occurred_at,
            project_id=project_id,
            subject_ref=ref,
            recipient_id=recipient_id,
            conversation_id=conversation_id,
            sender_id=sender_id,
            connected=connected,
            live_session_id=live_session_id,
            alert_id=alert_id,
            expires_at=expires_at,
            media_profile=media_profile,
        )
    return WebhookCallCancelledNotificationEvent(
        event_id=event_id,
        occurred_at=occurred_at,
        project_id=project_id,
        subject_ref=ref,
        recipient_id=recipient_id,
        conversation_id=conversation_id,
        sender_id=sender_id,
        connected=connected,
        live_session_id=live_session_id,
        alert_id=alert_id,
        expires_at=expires_at,
        media_profile=media_profile,
        reason=_identifier(source, "reason"),
    )


def _notification_event(value: object) -> WebhookNotificationEvent | str:
    """Validates a notification event against the push payload contract and returns its known fields, or a problem
    that names the first invalid field without echoing values. Ignores fields the contract doesn't define."""
    try:
        return _notification(value)
    except _Malformed as malformed:
        return malformed.problem
