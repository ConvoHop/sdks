"""Webhook verification: the TypeScript server SDK's cases, the shared conformance vectors and Python specifics."""

from __future__ import annotations

import base64
import email.message
import json
import pickle
import time
import traceback
import uuid
from datetime import UTC, date, datetime, timedelta, timezone
from random import Random
from typing import Any, Literal, get_args, get_origin

import httpx
import pytest

from convohop import webhooks
from convohop.webhooks import (
    WebhookCallCancelledNotificationEvent,
    WebhookCallNotificationEvent,
    WebhookDelivery,
    WebhookEndpointDisabledEvent,
    WebhookEventType,
    WebhookMessageNotificationEvent,
    WebhookNotificationEventType,
    WebhookNotificationPreview,
    WebhookResourceEvent,
    WebhookResourceEventType,
    WebhookSignature,
    WebhookSubjectRef,
    WebhookUnknownEvent,
    WebhookVerificationError,
    _epoch_seconds,
)

from .support import dumps, new_secret, sign, spec

Options = dict[str, Any]

SHARED = spec("conformance/vectors/webhooks.json")
# Shared conformance codes, mapped to this verifier's reason codes.
SHARED_CODES = {
    "WEBHOOK_SIGNATURE_INVALID": "NO_MATCHING_SIGNATURE",
    "WEBHOOK_TIMESTAMP_EXPIRED": "TIMESTAMP_EXPIRED",
    "WEBHOOK_TIMESTAMP_FUTURE": "TIMESTAMP_FUTURE",
    "WEBHOOK_TIMESTAMP_INVALID": "INVALID_TIMESTAMP",
    "WEBHOOK_HEADERS_MISSING": "MISSING_HEADER",
}
# The event types in the webhook contract (ConvoHop/ConveHop docs/webhooks.md, "Events").
CONTRACT_EVENT_TYPES = [
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
    "webhook.endpointDisabled",
]
NOTIFICATION_CLASSES: dict[str, type] = {
    "notification.message": WebhookMessageNotificationEvent,
    "notification.call": WebhookCallNotificationEvent,
    "notification.callCancelled": WebhookCallCancelledNotificationEvent,
}


def new_id() -> str:
    return str(uuid.uuid4())


NOW = datetime(2026, 10, 10, 12, tzinfo=UTC)
OCCURRED_AT = "2026-10-10T12:00:00.000Z"
TIMESTAMP = int(NOW.timestamp())
WEBHOOK_ID = new_id()
CURRENT, NEXT, REPLACED = new_secret(), new_secret(), new_secret()


def envelope(**fields: Any) -> dict[str, Any]:
    return {
        "eventId": new_id(),
        "eventType": "message.created",
        "occurredAt": OCCURRED_AT,
        "projectId": new_id(),
        "subjectRef": {"id": new_id(), "kind": "message"},
        **fields,
    }


def without(record: dict[str, Any], *names: str) -> dict[str, Any]:
    return {name: value for name, value in record.items() if name not in names}


def delivery(
    body: str | bytes,
    *,
    secrets: object = CURRENT,
    signers: tuple[str, ...] | list[str] = (CURRENT,),
    webhook_id: str = WEBHOOK_ID,
    at: int = TIMESTAMP,
) -> Options:
    return {
        "body": body,
        "secrets": secrets,
        "now": NOW,
        "headers": {
            "webhook-id": webhook_id,
            "webhook-timestamp": str(at),
            "webhook-signature": " ".join(sign(secret, webhook_id, at, body) for secret in signers),
        },
    }


def with_header(options: Options, name: str, value: object) -> Options:
    return {**options, "headers": {**options["headers"], name: value}}


def rejects(code: str, options: Options, *, signature_only: bool = False) -> WebhookVerificationError:
    function = webhooks.verify_signature if signature_only else webhooks.verify
    with pytest.raises(WebhookVerificationError) as caught:
        function(**options)
    assert caught.value.code == code, caught.value.message
    return caught.value


def literals(alias: object) -> set[str]:
    if get_origin(alias) is Literal:
        return set(get_args(alias))
    return set().union(*(literals(argument) for argument in get_args(alias)))


def test_the_contract_test_vector_verifies_and_its_body_is_not_a_convohop_event() -> None:
    secret, webhook_id, stamp = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw", "msg_p5jXN8AQM9LWM0D4loKWxJek", "1614265330"
    body, signature = '{"test": 2432232314}', "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE="
    assert sign(secret, webhook_id, stamp, body) == signature
    options: Options = {
        "body": body,
        "secrets": secret,
        "now": datetime.fromtimestamp(1614265330, UTC),
        "headers": {"webhook-id": webhook_id, "webhook-timestamp": stamp, "webhook-signature": signature},
    }
    expected = WebhookSignature(webhook_id, 1614265330)
    assert webhooks.verify_signature(**options) == expected
    assert webhooks.verify_signature(**{**options, "body": body.encode()}) == expected
    rejects("INVALID_BODY", options)
    rejects("TIMESTAMP_EXPIRED", {**options, "now": None}, signature_only=True)


def test_the_shared_vectors_use_standard_webhooks() -> None:
    assert SHARED["scheme"] == "standard-webhooks-v1"
    assert SHARED["vectors"]


@pytest.mark.parametrize("vector", SHARED["vectors"], ids=lambda vector: vector["id"])
def test_the_shared_conformance_vectors_give_the_same_verdicts(vector: dict[str, Any]) -> None:
    options: Options = {
        "headers": vector["headers"],
        "body": vector["payload"],
        "secrets": vector["secrets"],
        "tolerance_seconds": vector["toleranceSeconds"],
        "now": datetime.fromtimestamp(vector["nowSeconds"], UTC),
    }
    if vector["expected"]["valid"]:
        headers = {name.lower(): value for name, value in vector["headers"].items()}
        expected = WebhookSignature(headers["webhook-id"], int(headers["webhook-timestamp"]))
        assert webhooks.verify_signature(**options) == expected
    else:
        rejects(SHARED_CODES[vector["expected"]["code"]], options, signature_only=True)


def test_a_verified_delivery_returns_its_id_timestamp_and_metadata_only_event() -> None:
    event = envelope()
    verified = webhooks.verify(**delivery(dumps(event)))
    assert verified == WebhookDelivery(
        WEBHOOK_ID,
        TIMESTAMP,
        WebhookResourceEvent(
            event_id=event["eventId"],
            event_type="message.created",
            occurred_at=OCCURRED_AT,
            project_id=event["projectId"],
            subject_ref=WebhookSubjectRef(event["subjectRef"]["id"], "message"),
        ),
    )
    assert verified.event.known is True
    assert verified.event.to_dict() == event
    for event_type in CONTRACT_EVENT_TYPES:
        kind = "webhookEndpoint" if event_type == "webhook.endpointDisabled" else event_type.split(".")[0]
        subject = {"id": new_id(), "kind": kind}
        verified = webhooks.verify(**delivery(dumps(envelope(eventType=event_type, subjectRef=subject))))
        assert (verified.event.known, verified.event.event_type, verified.event.subject_ref.kind) == (
            True,
            event_type,
            kind,
        )
        expected = WebhookEndpointDisabledEvent if event_type == "webhook.endpointDisabled" else WebhookResourceEvent
        assert type(verified.event) is expected


def test_the_event_type_literals_list_the_contract_types() -> None:
    resource = literals(WebhookResourceEventType)
    assert resource | {"webhook.endpointDisabled"} == set(CONTRACT_EVENT_TYPES)
    assert literals(WebhookNotificationEventType) == set(NOTIFICATION_CLASSES)
    assert literals(WebhookEventType) == set(CONTRACT_EVENT_TYPES) | set(NOTIFICATION_CLASSES)


def test_unknown_event_types_and_fields_pass_through_and_never_raise() -> None:
    unknown = webhooks.verify(**delivery(dumps(envelope(eventType="message.reacted", extra={"a": 1})))).event
    assert isinstance(unknown, WebhookUnknownEvent)
    assert (unknown.known, unknown.event_type) == (False, "message.reacted")
    assert not hasattr(unknown, "extra")
    assert "extra" not in unknown.to_dict()
    misfiled_subject = {"id": new_id(), "kind": "conversation"}
    body = dumps(envelope(eventType="webhook.endpointDisabled", subjectRef=misfiled_subject))
    misfiled = webhooks.verify(**delivery(body)).event
    assert (misfiled.known, misfiled.subject_ref.kind) == (False, "conversation")


def notification(event_type: str, **fields: Any) -> dict[str, Any]:
    """A notification event under the push payload contract (spec/push-payload/)."""
    common = {
        "eventId": new_id(),
        "eventType": event_type,
        "occurredAt": OCCURRED_AT,
        "projectId": new_id(),
        "recipientId": new_id(),
        "conversationId": new_id(),
        "senderId": new_id(),
        "connected": False,
    }
    if event_type == "notification.message":
        message_id = new_id()
        return {**common, "subjectRef": {"id": message_id, "kind": "message"}, "messageId": message_id, **fields}
    live_session_id = new_id()
    reason = {"reason": "answered"} if event_type == "notification.callCancelled" else {}
    return {
        **common,
        "subjectRef": {"id": live_session_id, "kind": "liveSession"},
        "liveSessionId": live_session_id,
        "alertId": new_id(),
        "expiresAt": "2026-10-10T12:00:45.000Z",
        "mediaProfile": "AUDIO_VIDEO",
        **reason,
        **fields,
    }


NOTIFICATIONS = [
    notification("notification.message"),
    notification("notification.message", connected=True, preview={"text": "Grüße, 世界 👋", "truncated": True}),
    notification("notification.message", preview={"text": "👋" * 512, "truncated": False}),
    notification("notification.call"),
    notification("notification.call", mediaProfile="AUDIO_ONLY", connected=True),
    *(
        notification("notification.callCancelled", reason=reason)
        for reason in ("answered", "declined", "ended", "expired")
    ),
    # Media profiles and cancel reasons are open enumerations.
    notification("notification.callCancelled", mediaProfile="SCREEN_SHARE", reason="transferred"),
    notification(
        "notification.call", occurredAt="2026-10-10T13:59:59.123456789+02:00", expiresAt="2028-02-29T00:00:00Z"
    ),
]


@pytest.mark.parametrize("event", NOTIFICATIONS, ids=lambda event: event["eventType"])
def test_notification_events_verify_as_known_events_with_only_their_contract_fields(event: dict[str, Any]) -> None:
    sent = {**event, "addedLater": {"nested": [1]}, "subjectRef": {**event["subjectRef"], "label": "ignored"}}
    verified = webhooks.verify(**delivery(dumps(sent)))
    assert (verified.webhook_id, verified.timestamp) == (WEBHOOK_ID, TIMESTAMP)
    assert type(verified.event) is NOTIFICATION_CLASSES[event["eventType"]]
    assert verified.event.known is True
    assert verified.event.to_dict() == event


def test_notification_event_fields_are_typed() -> None:
    event = NOTIFICATIONS[1]
    verified = webhooks.verify(**delivery(dumps(event))).event
    assert isinstance(verified, WebhookMessageNotificationEvent)
    assert verified.preview == WebhookNotificationPreview("Grüße, 世界 👋", True)
    assert (verified.message_id, verified.recipient_id, verified.connected) == (
        event["messageId"],
        event["recipientId"],
        True,
    )
    plain = webhooks.verify(**delivery(dumps(NOTIFICATIONS[0]))).event
    assert isinstance(plain, WebhookMessageNotificationEvent)
    assert plain.preview is None
    assert "preview" not in plain.to_dict()
    cancelled = webhooks.verify(**delivery(dumps(NOTIFICATIONS[-2]))).event
    assert isinstance(cancelled, WebhookCallCancelledNotificationEvent)
    assert (cancelled.media_profile, cancelled.reason) == ("SCREEN_SHARE", "transferred")


def test_the_largest_notification_event_fits_in_a_webhook_body() -> None:
    largest = notification(
        "notification.message",
        occurredAt="2026-10-10T23:59:59.999999999-23:59",
        preview={"text": "\u0001" * 512, "truncated": False},
    )
    body = dumps(largest)
    assert len(body.encode()) <= 4096, len(body.encode())
    assert webhooks.verify(**delivery(body)).event.to_dict() == largest


MESSAGE = notification("notification.message")
CALL = notification("notification.call")
CANCELLED = notification("notification.callCancelled")
MALFORMED_NOTIFICATIONS = [
    {**MESSAGE, "subjectRef": {"id": new_id(), "kind": "message"}},
    {**MESSAGE, "subjectRef": {"id": MESSAGE["messageId"], "kind": "liveSession"}},
    {**CALL, "subjectRef": {"id": CALL["liveSessionId"], "kind": "message"}},
    {**MESSAGE, "recipientId": MESSAGE["recipientId"].upper()},
    {**MESSAGE, "senderId": "00000000-0000-0000-0000-000000000000"},
    without(MESSAGE, "conversationId"),
    {**MESSAGE, "connected": "false"},
    {**MESSAGE, "preview": None},
    {**MESSAGE, "preview": {"text": "hi"}},
    {**MESSAGE, "preview": {"text": "", "truncated": False}},
    {**MESSAGE, "preview": {"text": "x" * 513, "truncated": True}},
    {**MESSAGE, "preview": {"text": "a\ud800", "truncated": False}},
    {**MESSAGE, "occurredAt": "2026-10-10t12:00:00z"},
    {**MESSAGE, "occurredAt": "2026-02-29T00:00:00Z"},
    {**MESSAGE, "occurredAt": "2026-10-10T12:00:00.1234567890Z"},
    {**CALL, "expiresAt": "2026-10-10T23:59:60Z"},
    {**CALL, "mediaProfile": "audio-video"},
    {**CALL, "mediaProfile": "A" + "b" * 64},
    without(CALL, "alertId"),
    {**CANCELLED, "reason": ""},
    without(CANCELLED, "reason"),
    {**CALL, "eventType": "notification.callCancelled"},
    # Python specifics: integers aren't booleans, and digits are ASCII.
    {**MESSAGE, "connected": 0},
    {**MESSAGE, "preview": {"text": "hi", "truncated": 1}},
    {**MESSAGE, "occurredAt": "\uff12\uff10\uff12\uff16-10-10T12:00:00Z"},
]


@pytest.mark.parametrize("event", MALFORMED_NOTIFICATIONS, ids=lambda event: event["eventType"])
def test_notification_events_that_break_the_push_payload_contract_verify_as_unknown_events(
    event: dict[str, Any],
) -> None:
    verified = webhooks.verify(**delivery(dumps(event)))
    assert verified.event == WebhookUnknownEvent(
        event_id=event["eventId"],
        event_type=event["eventType"],
        occurred_at=event["occurredAt"],
        project_id=event["projectId"],
        subject_ref=WebhookSubjectRef(event["subjectRef"]["id"], event["subjectRef"]["kind"]),
    )


def test_the_envelope_rules_apply_before_the_notification_rules() -> None:
    for event in [{**MESSAGE, "subjectRef": {"id": MESSAGE["messageId"]}}, {**CALL, "projectId": ""}]:
        rejects("INVALID_BODY", delivery(dumps(event)))


def test_notification_timestamps_convert_like_datetime() -> None:
    random = Random(20261010)  # noqa: S311 - seeded for reproducible test data, not for secrets
    epoch, second = datetime(1970, 1, 1, tzinfo=UTC), timedelta(seconds=1)
    for _ in range(2000):
        instant = datetime(2, 1, 1, tzinfo=UTC) + random.randrange(315_000_000_000) * second
        local = instant.astimezone(timezone(timedelta(minutes=random.randrange(-1439, 1440))))
        expected = (instant - epoch) // second
        text = local.isoformat()
        assert _epoch_seconds(text) == expected, text
        assert _epoch_seconds(text[:19] + ".999999999" + text[19:]) == expected, text
        if text.endswith("+00:00"):
            assert _epoch_seconds(text[:19] + "Z") == expected, text
    assert _epoch_seconds("0000-01-01T00:00:00Z") == -62_167_219_200
    assert _epoch_seconds("9999-12-31T23:59:59Z") == 253_402_300_799
    assert _epoch_seconds("2000-02-29T00:00:00-00:00") == 951_782_400
    for text in [
        "1900-02-29T00:00:00Z",
        "2026-13-01T00:00:00Z",
        "2026-00-10T00:00:00Z",
        "2026-10-00T00:00:00Z",
        "2026-04-31T00:00:00Z",
        "2026-10-10T24:00:00Z",
        "2026-10-10T12:60:00Z",
        "2026-10-10T12:00:60Z",
        "2026-10-10T12:00:00+24:00",
        "2026-10-10T12:00:00+02:60",
        "2026-10-10T12:00:00+0200",
        "2026-10-10 12:00:00Z",
        "2026-10-10T12:00:00",
        "2026-10-10T12:00:00z",
        "2026-10-10T12:00:00.Z",
        "+2026-10-10T12:00:00Z",
        "2026-10-10T12:00:00Z\n",
        "٢٠٢٦-10-10T12:00:00Z",
    ]:
        assert _epoch_seconds(text) is None, text


def test_tampering_with_the_body_id_or_timestamp_fails_the_signature() -> None:
    body = dumps(envelope())
    signed = delivery(body)
    rejects("NO_MATCHING_SIGNATURE", {**signed, "body": body.replace("message.created", "message.deleted")})
    # The same JSON value, re-serialized, is a different body.
    rejects("NO_MATCHING_SIGNATURE", {**signed, "body": json.dumps(json.loads(body), indent=1)})
    rejects("NO_MATCHING_SIGNATURE", with_header(signed, "webhook-id", new_id()))
    rejects("NO_MATCHING_SIGNATURE", with_header(signed, "webhook-timestamp", str(TIMESTAMP + 1)))
    # The signed timestamp is the header text, not its numeric value.
    rejects("NO_MATCHING_SIGNATURE", with_header(signed, "webhook-timestamp", f"0{TIMESTAMP}"))
    rejects("NO_MATCHING_SIGNATURE", {**signed, "secrets": new_secret()})


def test_timestamps_pass_within_the_tolerance_inclusive_and_fail_outside_it_with_a_direction() -> None:
    body = dumps(envelope())
    for offset, code in [(-300, None), (300, None), (-301, "TIMESTAMP_EXPIRED"), (301, "TIMESTAMP_FUTURE")]:
        options = delivery(body, at=TIMESTAMP + offset)
        if code:
            rejects(code, options)
        else:
            assert webhooks.verify(**options).timestamp == TIMESTAMP + offset
    # The clock is compared in whole seconds.
    early = delivery(body, at=TIMESTAMP - 300)
    assert webhooks.verify(**{**early, "now": NOW + timedelta(microseconds=999_999)})
    rejects("TIMESTAMP_FUTURE", {**delivery(body, at=TIMESTAMP + 300), "now": NOW - timedelta(microseconds=1)})
    # Any time zone names the same instant.
    assert webhooks.verify(**{**delivery(body), "now": NOW.astimezone(timezone(timedelta(hours=-9, minutes=-30)))})
    assert webhooks.verify(**{**delivery(body), "tolerance_seconds": 0})
    rejects("TIMESTAMP_EXPIRED", {**delivery(body, at=TIMESTAMP - 1), "tolerance_seconds": 0})
    assert webhooks.verify(**{**delivery(body, at=TIMESTAMP + 3600), "tolerance_seconds": 3600})
    fresh = int(time.time())
    live = without(delivery(body, at=fresh), "now")
    assert webhooks.verify(**live).timestamp == fresh
    # Timestamps are checked before signatures.
    rejects("TIMESTAMP_EXPIRED", {**delivery(body, at=TIMESTAMP - 301), "secrets": new_secret()})
    signed = delivery(body)
    for stamp in [
        "-1",
        "1.5",
        "1e9",
        " 1",
        "0x10",
        "1234567890123456",
        "\uff11\uff12\uff13",
        "١٢٣",
        "1_000",
        "+1",
        "1\n",
    ]:
        rejects("INVALID_TIMESTAMP", with_header(signed, "webhook-timestamp", stamp))


def test_during_a_rotation_any_held_secret_verifies_whatever_order_the_entries_arrive_in() -> None:
    body = dumps(envelope())
    # The sender signs with the current secret, then the next one (at most 5 minutes) or the replaced one (24 hours).
    for signers in [[CURRENT, NEXT], [CURRENT, REPLACED], [CURRENT, NEXT, REPLACED]]:
        for held in signers:
            assert webhooks.verify(**delivery(body, signers=signers, secrets=held)).webhook_id == WEBHOOK_ID
        assert webhooks.verify(**delivery(body, signers=signers, secrets=[new_secret(), signers[-1]]))
        assert webhooks.verify(**delivery(body, signers=signers[::-1], secrets=(new_secret(), signers[0])))
        rejects("NO_MATCHING_SIGNATURE", delivery(body, signers=signers, secrets=[new_secret(), new_secret()]))


def test_non_v1_and_malformed_entries_are_ignored_and_more_than_8_entries_are_rejected() -> None:
    body = dumps(envelope())
    signed = delivery(body)
    valid = signed["headers"]["webhook-signature"]
    mac, short = valid.removeprefix("v1,"), base64.b64encode(bytes(16)).decode()
    ignored = [
        f"v2,{mac}",
        f"V1,{mac}",
        f"v1a,{mac}",
        f",{mac}",
        mac,
        "v1",
        "v1,",
        "v1,not*base64",
        f"v1,{mac[:-1]}",
        f"v1,{mac}x",
        f"v1,{short}",
    ]
    for entry in ignored:
        rejects("NO_MATCHING_SIGNATURE", with_header(signed, "webhook-signature", entry))
    assert webhooks.verify(**with_header(signed, "webhook-signature", " ".join([*ignored[:7], valid])))
    assert webhooks.verify(**with_header(signed, "webhook-signature", f"  {valid}  {ignored[0]} "))
    rejects("TOO_MANY_SIGNATURES", with_header(signed, "webhook-signature", " ".join([*ignored[:8], valid])))
    rejects("TOO_MANY_SIGNATURES", with_header(signed, "webhook-signature", " ".join([valid] * 9)))


def message_headers(headers: dict[str, str]) -> email.message.Message:
    """Headers as ``http.server`` and ``email`` deliver them."""
    message = email.message.Message()
    for name, value in headers.items():
        message[name] = value
    return message


def test_header_names_match_case_insensitively_and_missing_empty_or_repeated_headers_are_rejected() -> None:
    body = dumps(envelope())
    signed = delivery(body)
    headers = signed["headers"]
    mixed = {
        "Webhook-Id": headers["webhook-id"],
        "WEBHOOK-TIMESTAMP": headers["webhook-timestamp"],
        "webhook-Signature": headers["webhook-signature"],
    }
    verified = webhooks.verify(**signed)
    for value in [mixed, httpx.Headers(mixed), message_headers(mixed)]:
        assert webhooks.verify(**{**signed, "headers": value}) == verified
    # A single value may arrive as a one-element list.
    for single in [[headers["webhook-id"]], (headers["webhook-id"],)]:
        assert webhooks.verify(**with_header(signed, "webhook-id", single)) == verified
    rejects("INVALID_HEADER", with_header(signed, "Webhook-Id", headers["webhook-id"]))
    signature = headers["webhook-signature"]
    rejects("INVALID_HEADER", with_header(signed, "webhook-signature", [signature, signature]))
    repeated = message_headers(headers)
    repeated["Webhook-Signature"] = signature
    rejects("INVALID_HEADER", {**signed, "headers": repeated})
    for name in headers:
        rest = without(headers, name)
        for value in [
            rest,
            httpx.Headers(rest),
            message_headers(rest),
            {**headers, name: ""},
            {**headers, name: None},
            {**headers, name: []},
        ]:
            rejects("MISSING_HEADER", {**signed, "headers": value})


def test_string_and_bytes_bodies_are_verified_as_the_same_bytes() -> None:
    body = dumps(envelope(note="Grüße, 世界 👋"))
    data = body.encode()
    signed = delivery(body)
    verified = webhooks.verify(**signed)
    for same in [data, bytearray(data), memoryview(data)]:
        assert webhooks.verify(**{**signed, "body": same}) == verified
    framed = bytearray(len(data) + 8)
    framed[4 : 4 + len(data)] = data
    assert webhooks.verify(**{**signed, "body": memoryview(framed)[4 : 4 + len(data)]}) == verified
    rejects("NO_MATCHING_SIGNATURE", {**signed, "body": data.decode("latin-1")})
    # Correctly signed bytes that are not UTF-8 pass the signature check but are not an event.
    invalid = delivery(b"\x7b\xff\x7d")
    assert webhooks.verify_signature(**invalid) == WebhookSignature(WEBHOOK_ID, TIMESTAMP)
    rejects("INVALID_BODY", invalid)


def test_string_bodies_encode_like_text_encoder() -> None:
    # A lone surrogate encodes as U+FFFD, and a leading byte order mark is not part of the JSON.
    text = '{"note":"\ud800"}'
    options = {**delivery(text.replace("\ud800", "\ufffd")), "body": text}
    assert webhooks.verify_signature(**options) == WebhookSignature(WEBHOOK_ID, TIMESTAMP)
    event = envelope()
    assert webhooks.verify(**delivery("\ufeff" + dumps(event))).event.to_dict() == event


def sized(size: int) -> str:
    base = dumps(envelope(pad=""))
    return base.replace('"pad":""', f'"pad":"{"x" * (size - len(base))}"')


def test_bodies_over_4096_bytes_and_bodies_that_are_not_event_envelopes_are_rejected() -> None:
    limit, over = sized(4096), sized(4097)
    assert len(limit.encode()) == 4096
    assert webhooks.verify(**delivery(limit))
    rejects("BODY_TOO_LARGE", delivery(over))
    rejects("BODY_TOO_LARGE", delivery(over.encode()))
    wide = dumps(envelope(pad="é" * 2100))
    assert len(wide) <= 4096 < len(wide.encode())
    rejects("BODY_TOO_LARGE", delivery(wide))
    bodies = [
        "not json",
        "[]",
        "null",
        '"text"',
        dumps(envelope(subjectRef=None)),
        dumps(envelope(subjectRef={"id": new_id()})),
        dumps(envelope(eventId="")),
        dumps(envelope(eventType=7)),
        dumps(without(envelope(), "projectId")),
        # JSON has no NaN or Infinity.
        dumps(envelope())[:-1] + ',"extra":NaN}',
        dumps(envelope())[:-1] + ',"extra":-Infinity}',
    ]
    for body in bodies:
        assert webhooks.verify_signature(**delivery(body)), body
        rejects("INVALID_BODY", delivery(body))


def test_unknown_fields_parse_like_json_parse() -> None:
    # A number that overflows is infinite, as JSON.parse reads it; the same signed body is the same event everywhere.
    event = envelope()
    body = dumps(event)[:-1] + ',"extra":[1e400,-1e400,123456789012345678901234567890]}'
    assert webhooks.verify(**delivery(body)).event.to_dict() == event
    # Nesting deeper than the interpreter's recursion limit (about 1000 levels on Python 3.11) is an invalid body.
    deep = dumps(event)[:-1] + ',"extra":' + "[" * 1800 + "]" * 1800 + "}"
    assert len(deep.encode()) <= 4096
    outcome: object
    try:
        outcome = webhooks.verify(**delivery(deep)).event.to_dict()
    except WebhookVerificationError as error:
        outcome = error.code
    assert outcome in (event, "INVALID_BODY")


def test_malformed_secrets_are_configuration_errors_reported_before_the_delivery_is_read() -> None:
    body = dumps(envelope())
    encoded = CURRENT.removeprefix("whsec_")
    # A 32-byte secret's Base64 ends in one pad character, and the character before it has two zero low bits.
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    non_canonical = f"whsec_{encoded[:-2]}{alphabet[alphabet.index(encoded[-2]) | 1]}="
    assert base64.b64decode(non_canonical.removeprefix("whsec_")) == base64.b64decode(encoded)
    cases: list[object] = [
        [],
        None,
        {},
        "",
        "whsec_",
        encoded,
        "whsec_not*base64",
        "whsec_YQ",
        "whsec_YR==",
        non_canonical,
        CURRENT[:-1],
        f" {CURRENT}",
        f"{CURRENT} ",
        f"WHSEC_{encoded}",
        *(new_secret(size) for size in (1, 13, 23, 65)),
        [CURRENT, "whsec_"],
        [CURRENT, 7],
        # Python specifics: bytes are a sequence of integers, and secrets come as a sequence.
        CURRENT.encode(),
        {CURRENT},
        iter([CURRENT]),
    ]
    for secrets in cases:
        rejects("INVALID_SECRET", {**delivery(body), "secrets": secrets})
    rejects("INVALID_SECRET", {"headers": {}, "body": body, "secrets": "whsec_", "now": NOW})
    # Standard Webhooks secrets are 24 to 64 bytes; ConvoHop issues 32-byte secrets.
    for size in (24, 32, 64):
        secret = new_secret(size)
        assert webhooks.verify(**delivery(body, secrets=secret, signers=[secret])), size


def test_failures_never_echo_secrets_signatures_or_the_body() -> None:
    marker = "body-marker-7d1c"
    body = dumps(envelope(eventId="", note=marker))
    signed = delivery(body)
    secret_text = CURRENT.removeprefix("whsec_")
    mac = signed["headers"]["webhook-signature"].removeprefix("v1,")
    attempts = [
        signed,
        {**signed, "secrets": new_secret()},
        {**signed, "secrets": f"whsec_{secret_text}!"},
        with_header(signed, "webhook-signature", " ".join([f"v1,{mac}"] * 9)),
        with_header(signed, "webhook-timestamp", f"{TIMESTAMP}{marker}"),
        # The decoding errors hold the body; they must not be chained to the failure.
        delivery(f"{marker}\xff".encode("latin-1")),
        delivery(f"not json {marker}"),
    ]
    errors = []
    for options in attempts:
        with pytest.raises(WebhookVerificationError) as caught:
            webhooks.verify(**options)
        errors.append(caught.value)
    assert [error.code for error in errors] == [
        "INVALID_BODY",
        "NO_MATCHING_SIGNATURE",
        "INVALID_SECRET",
        "TOO_MANY_SIGNATURES",
        "INVALID_TIMESTAMP",
        "INVALID_BODY",
        "INVALID_BODY",
    ]
    for error in errors:
        assert error.__cause__ is None
        assert error.__context__ is None
        rendered = "".join([str(error), repr(error), *traceback.format_exception(error)])
        for secret in (secret_text, mac, marker):
            assert secret not in rendered, error.code


def test_verification_errors_pickle_with_their_code() -> None:
    error = rejects("NO_MATCHING_SIGNATURE", {**delivery(dumps(envelope())), "secrets": new_secret()})
    copy = pickle.loads(pickle.dumps(error))  # noqa: S301 - the test's own object
    assert (type(copy), copy.code, copy.message) == (WebhookVerificationError, error.code, error.message)
    assert repr(copy) == repr(error)


def test_invalid_arguments_raise_type_or_value_errors_not_verification_failures() -> None:
    options = delivery(dumps(envelope()))
    for tolerance in [1.5, float("nan"), float("inf"), "300", True, None]:
        with pytest.raises(TypeError):
            webhooks.verify(**{**options, "tolerance_seconds": tolerance})
    with pytest.raises(ValueError, match="negative"):
        webhooks.verify(**{**options, "tolerance_seconds": -1})
    for clock in [datetime(2026, 10, 10, 12), NOW.timestamp(), NOW.isoformat(), date(2026, 10, 10)]:
        with pytest.raises(TypeError):
            webhooks.verify(**{**options, "now": clock})
    for body in [None, 7, [123], {"body": "{}"}]:
        with pytest.raises(TypeError):
            webhooks.verify(**{**options, "body": body})
    for headers in [None, [("webhook-id", WEBHOOK_ID)], "webhook-id"]:
        with pytest.raises(TypeError):
            webhooks.verify(**{**options, "headers": headers})


def test_the_module_exports_its_public_names() -> None:
    for name in webhooks.__all__:
        assert hasattr(webhooks, name), name
