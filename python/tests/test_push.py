"""Push payload builders: the TypeScript server SDK's cases, the shared vectors and Python specifics.

Expected requests are written out from spec/push-payload/README.md, independently of the builders and the vectors.
"""

from __future__ import annotations

import copy
import inspect
import json
import pickle
import re
import traceback
from datetime import UTC, date, datetime, timedelta, timezone
from types import MappingProxyType
from typing import Any

import pytest

import convohop
from convohop import push, webhooks
from convohop.push import PushPayloadError
from convohop.webhooks import WebhookDelivery, WebhookResourceEvent, WebhookUnknownEvent

from .support import dumps, new_secret, sign, spec

BUNDLE = "com.example.chat"
LIMITS = {"apns_alert": 4096, "apns_voip": 5120, "fcm": 4096, "web_push": 3993}
NAMES = list(LIMITS)
APNS = ("apns_alert", "apns_voip")
# The vectors name the builders as the TypeScript SDK does.
VECTOR_NAMES = {"apns_alert": "apnsAlert", "apns_voip": "apnsVoip", "fcm": "fcm", "web_push": "webPush"}
NOW = datetime(2026, 10, 10, 12, tzinfo=UTC)
NOW_SECONDS = 1_791_633_600
DAY = 86_400
CAP = 2_419_200
EPOCH = datetime(1970, 1, 1, tzinfo=UTC)
SECOND = timedelta(seconds=1)
ELLIPSIS = "\u2026"
MARKER = "value-marker-4f2a"


def at(offset: int) -> str:
    """The RFC 3339 time ``offset`` seconds after ``NOW``."""
    return (NOW + timedelta(seconds=offset)).strftime("%Y-%m-%dT%H:%M:%SZ")


EVENT_ID = "5b0c1d2e-3f40-4152-8637-48596a7b8c9d"
PROJECT_ID = "7e8f9a0b-1c2d-4e3f-9051-627384950a1b"
RECIPIENT_ID = "9a8b7c6d-5e4f-4031-a2b3-c4d5e6f70819"
CONVERSATION_ID = "2c3d4e5f-6071-4829-b3a4-b5c6d7e8f901"
SENDER_ID = "3d4e5f60-7182-4930-84a5-b6c7d8e9f012"
MESSAGE_ID = "4e5f6071-8293-4a41-95b6-c7d8e9f01223"
LIVE_SESSION_ID = "5f607182-93a4-4b52-a6c7-d8e9f0122334"
ALERT_ID = "60718293-a4b5-4c63-b7d8-e9f012233445"
COLLAPSE = "60718293a4b54c63b7d8e9f012233445"

COMMON: dict[str, Any] = {
    "eventId": EVENT_ID,
    "projectId": PROJECT_ID,
    "recipientId": RECIPIENT_ID,
    "conversationId": CONVERSATION_ID,
    "senderId": SENDER_ID,
    "connected": False,
}


def message_event(**fields: Any) -> dict[str, Any]:
    return {
        **COMMON,
        "eventType": "notification.message",
        "occurredAt": at(-60),
        "subjectRef": {"id": MESSAGE_ID, "kind": "message"},
        "messageId": MESSAGE_ID,
        **fields,
    }


def call_event(**fields: Any) -> dict[str, Any]:
    return {
        **COMMON,
        "eventType": "notification.call",
        "occurredAt": at(-5),
        "subjectRef": {"id": LIVE_SESSION_ID, "kind": "liveSession"},
        "liveSessionId": LIVE_SESSION_ID,
        "alertId": ALERT_ID,
        "expiresAt": at(40),
        "mediaProfile": "AUDIO_VIDEO",
        **fields,
    }


def cancel_event(reason: object, **fields: Any) -> dict[str, Any]:
    return call_event(eventType="notification.callCancelled", reason=reason, **fields)


def without(record: dict[str, Any], *names: str) -> dict[str, Any]:
    return {key: value for key, value in record.items() if key not in names}


METADATA: dict[str, Any] = {
    "eventId": EVENT_ID,
    "occurredAt": at(-60),
    "projectId": PROJECT_ID,
    "recipientId": RECIPIENT_ID,
    "conversationId": CONVERSATION_ID,
    "senderId": SENDER_ID,
}
MESSAGE_DATA = {**METADATA, "eventType": "notification.message", "messageId": MESSAGE_ID}
CALL_DATA = {
    **METADATA,
    "eventType": "notification.call",
    "occurredAt": at(-5),
    "liveSessionId": LIVE_SESSION_ID,
    "alertId": ALERT_ID,
    "expiresAt": at(40),
    "mediaProfile": "AUDIO_VIDEO",
}


def build(name: str, event: object, **options: Any) -> Any:
    """Runs a builder with ``NOW`` and, for the APNs builders, ``BUNDLE``, unless ``options`` replaces them."""
    defaults: dict[str, Any] = {"bundle_id": BUNDLE, "now": NOW} if name in APNS else {"now": NOW}
    return getattr(push, name)(event, **{**defaults, **options})


def size(value: object) -> int:
    """UTF-8 bytes of the ``JSON.stringify`` serialization."""
    return len(dumps(value).encode())


def fcm_data(request: Any) -> dict[str, Any]:
    """FCM's ``data.convohop``, checked to be compact JSON."""
    raw = request["message"]["data"]["convohop"]
    assert isinstance(raw, str)
    parsed: dict[str, Any] = json.loads(raw)
    assert raw == dumps(parsed)
    return parsed


def visible(name: str, request: Any) -> tuple[str | None, str | None]:
    """The visible title and body: the APNs alert's, or the ones in ``convohop``."""
    if name == "apns_alert":
        source = request["payload"]["aps"]["alert"]
    elif name == "fcm":
        source = fcm_data(request)
    else:
        source = request["payload"]["convohop"]
    return source.get("title"), source.get("body")


def measured(name: str, request: Any, **text: str) -> object:
    """The part of a request a platform's limit applies to, optionally with its visible text replaced."""
    if name == "fcm":
        return {"convohop": dumps({**fcm_data(request), **text})}
    payload = request["payload"]
    if name == "apns_alert":
        return {**payload, "aps": {**payload["aps"], "alert": {**payload["aps"]["alert"], **text}}}
    return {"convohop": {**payload["convohop"], **text}}


def rejects(code: str, name: str, event: object, *, marker: str | None = None, **options: Any) -> PushPayloadError:
    with pytest.raises(PushPayloadError) as caught:
        build(name, event, **options)
    error = caught.value
    assert error.code == code, error.message
    # Raised outside any handler, so tracebacks show no chained exception.
    assert error.__cause__ is None
    assert error.__context__ is None
    if marker is not None:
        assert marker not in "".join(traceback.format_exception(error))
    return error


def frozen(value: Any) -> Any:
    """A read-only deep copy: dicts become ``MappingProxyType`` and lists tuples, so any mutation raises."""
    if isinstance(value, dict):
        return MappingProxyType({key: frozen(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(frozen(item) for item in value)
    return value


def verified(event: object, now: datetime = NOW) -> WebhookDelivery:
    """Delivers ``event`` as a signed webhook and verifies it."""
    secret, webhook_id, timestamp = new_secret(), "msg_push_pipeline", (now - EPOCH) // SECOND
    body = dumps(event)
    headers = {
        "webhook-id": webhook_id,
        "webhook-timestamp": str(timestamp),
        "webhook-signature": sign(secret, webhook_id, timestamp, body),
    }
    return webhooks.verify(headers=headers, body=body, secrets=secret, now=now)


def test_a_message_builds_an_alert_an_fcm_data_message_and_a_web_push_message_metadata_only_by_default() -> None:
    assert (at(0), (NOW - EPOCH) // SECOND) == ("2026-10-10T12:00:00Z", NOW_SECONDS)
    event, ttl = message_event(), DAY - 60
    assert build("apns_alert", event) == {
        "headers": {
            "apns-push-type": "alert",
            "apns-topic": BUNDLE,
            "apns-priority": "10",
            "apns-expiration": str(NOW_SECONDS + ttl),
        },
        "payload": {
            "aps": {
                "alert": {"loc-key": "CONVOHOP_MESSAGE"},
                "sound": "default",
                "mutable-content": 1,
                "thread-id": CONVERSATION_ID,
            },
            "convohop": MESSAGE_DATA,
        },
    }
    assert build("apns_voip", event) is None
    fcm = push.fcm(event, now=NOW)
    assert fcm is not None
    assert fcm == {
        "message": {
            "data": {"convohop": fcm["message"]["data"]["convohop"]},
            "android": {"priority": "HIGH", "ttl": f"{ttl}s"},
        }
    }
    assert fcm_data(fcm) == MESSAGE_DATA
    assert push.web_push(event, now=NOW) == {
        "headers": {"TTL": str(ttl), "Urgency": "normal"},
        "payload": {"convohop": MESSAGE_DATA},
    }


def test_an_opted_in_preview_becomes_the_body_and_title_and_body_options_add_visible_text() -> None:
    event = message_event(preview={"text": "See you at 6", "truncated": True})

    def alert(expected: dict[str, str], **options: Any) -> None:
        assert build("apns_alert", event, **options)["payload"] == {
            "aps": {"alert": expected, "sound": "default", "mutable-content": 1, "thread-id": CONVERSATION_ID},
            "convohop": MESSAGE_DATA,
        }

    alert({"title": "Ada", "body": "See you at 6…"}, title="Ada")
    alert({"body": "See you at 6…"}, title="", body="")
    alert({"body": "See you at 6…"}, title=None, body=None)
    alert({"body": "New message"}, body="New message")
    alert({"title": "Ada", "loc-key": "CONVOHOP_MESSAGE"}, title="Ada", preview=False)
    done = message_event(preview={"text": "Done", "truncated": False})
    assert build("apns_alert", done)["payload"]["aps"]["alert"] == {"body": "Done"}
    assert fcm_data(build("fcm", event, title="Ada")) == {**MESSAGE_DATA, "title": "Ada", "body": "See you at 6…"}
    assert build("web_push", event, body="New message")["payload"]["convohop"] == {
        **MESSAGE_DATA,
        "body": "New message",
    }
    for name in ("apns_alert", "fcm", "web_push"):
        request = build(name, event, preview=False)
        assert visible(name, request) == (None, None), name
        assert "See you" not in dumps(request), name


def test_an_incoming_call_builds_a_voip_push_an_alert_and_high_priority_data_messages_that_collapse_on_the_ring() -> (
    None
):
    event, expiration = call_event(), str(NOW_SECONDS + 40)
    assert build("apns_alert", event, title="Ada") == {
        "headers": {
            "apns-push-type": "alert",
            "apns-topic": BUNDLE,
            "apns-priority": "10",
            "apns-expiration": expiration,
            "apns-collapse-id": COLLAPSE,
        },
        "payload": {
            "aps": {
                "alert": {"title": "Ada", "loc-key": "CONVOHOP_CALL"},
                "sound": "default",
                "mutable-content": 1,
                "thread-id": CONVERSATION_ID,
            },
            "convohop": CALL_DATA,
        },
    }
    assert build("apns_voip", event, title="Ada") == {
        "headers": {
            "apns-push-type": "voip",
            "apns-topic": f"{BUNDLE}.voip",
            "apns-priority": "10",
            "apns-expiration": expiration,
        },
        "payload": {"convohop": {**CALL_DATA, "title": "Ada"}},
    }
    fcm = build("fcm", event, title="Ada")
    assert fcm["message"]["android"] == {"priority": "HIGH", "ttl": "40s", "collapse_key": COLLAPSE}
    assert fcm_data(fcm) == {**CALL_DATA, "title": "Ada"}
    assert build("web_push", event, title="Ada") == {
        "headers": {"TTL": "40", "Urgency": "high", "Topic": COLLAPSE},
        "payload": {"convohop": {**CALL_DATA, "title": "Ada"}},
    }
    audio = call_event(mediaProfile="AUDIO_ONLY", connected=True)
    assert build("apns_voip", audio)["payload"]["convohop"] == {**CALL_DATA, "mediaProfile": "AUDIO_ONLY"}


@pytest.mark.parametrize("reason", ["ended", "expired"])
def test_a_missed_call_replaces_the_rings_alert_and_reaches_the_data_channels(reason: str) -> None:
    event, ttl = cancel_event(reason, occurredAt=at(-15)), DAY - 15
    data = {**CALL_DATA, "eventType": "notification.callCancelled", "occurredAt": at(-15), "reason": reason}
    assert build("apns_alert", event) == {
        "headers": {
            "apns-push-type": "alert",
            "apns-topic": BUNDLE,
            "apns-priority": "10",
            "apns-expiration": str(NOW_SECONDS + ttl),
            "apns-collapse-id": COLLAPSE,
        },
        "payload": {
            "aps": {
                "alert": {"loc-key": "CONVOHOP_MISSED_CALL"},
                "sound": "default",
                "mutable-content": 1,
                "thread-id": CONVERSATION_ID,
            },
            "convohop": data,
        },
    }
    assert build("apns_voip", event) is None
    fcm = build("fcm", event)
    assert (fcm["message"]["android"], fcm_data(fcm)) == (
        {"priority": "HIGH", "ttl": f"{ttl}s", "collapse_key": COLLAPSE},
        data,
    )
    assert build("web_push", event) == {
        "headers": {"TTL": str(ttl), "Urgency": "high", "Topic": COLLAPSE},
        "payload": {"convohop": data},
    }


@pytest.mark.parametrize("reason", ["answered", "declined", "transferred"])
def test_other_cancellations_reach_only_the_data_channels_until_the_rings_deadline(reason: str) -> None:
    # Answered, declined and later reasons only stop the ringing, so they live until the ring's deadline.
    event = cancel_event(reason, occurredAt=at(-2))
    data = {**CALL_DATA, "eventType": "notification.callCancelled", "occurredAt": at(-2), "reason": reason}
    assert build("apns_alert", event) is None
    assert build("apns_voip", event) is None
    fcm = build("fcm", event)
    assert (fcm["message"]["android"], fcm_data(fcm)) == (
        {"priority": "HIGH", "ttl": "40s", "collapse_key": COLLAPSE},
        data,
    )
    assert build("web_push", event) == {
        "headers": {"TTL": "40", "Urgency": "high", "Topic": COLLAPSE},
        "payload": {"convohop": data},
    }


def lifetime(event: object, now: datetime = NOW) -> int | None:
    """The lifetime every applicable builder gives the event, or ``None`` when none returns a request."""
    clock = (now - EPOCH) // SECOND
    ttls: set[str] = set()
    for name in NAMES:
        request = build(name, event, now=now)
        if request is None:
            continue
        if name == "fcm":
            ttls.add(request["message"]["android"]["ttl"].removesuffix("s"))
        elif name == "web_push":
            ttls.add(request["headers"]["TTL"])
        else:
            ttls.add(str(int(request["headers"]["apns-expiration"]) - clock))
    if not ttls:
        return None
    assert len(ttls) == 1, ttls
    return int(ttls.pop())


def test_lifetimes_count_whole_seconds_stop_at_28_days_and_yield_no_request_once_stale() -> None:
    assert lifetime(message_event(occurredAt=at(-DAY + 1))) == 1
    assert lifetime(message_event(occurredAt=at(-DAY))) is None
    assert lifetime(message_event(occurredAt=at(-DAY - 1))) is None
    # Fractions of the event times and of the clock are dropped.
    assert lifetime(message_event(occurredAt="2026-10-10T11:59:00.999999999Z")) == DAY - 60
    assert lifetime(message_event(), NOW + timedelta(milliseconds=999)) == DAY - 60
    assert lifetime(message_event(), NOW + timedelta(microseconds=999_999)) == DAY - 60
    assert lifetime(message_event(), NOW + SECOND) == DAY - 61
    assert lifetime(message_event(), NOW - timedelta(microseconds=1)) == DAY - 59
    assert lifetime(message_event(occurredAt="2026-10-10T13:59:00+02:00")) == DAY - 60
    assert lifetime(message_event(occurredAt="2026-10-10T06:29:00-05:30")) == DAY - 60
    assert lifetime(call_event(expiresAt=at(1))) == 1
    assert lifetime(call_event(expiresAt=at(0))) is None
    assert lifetime(call_event(expiresAt=f"{at(0)[:-1]}.999Z")) is None
    assert lifetime(cancel_event("answered", expiresAt=at(-1))) is None
    assert lifetime(cancel_event("expired", occurredAt=at(-DAY))) is None
    # A far deadline, or a producer clock ahead of yours, is capped.
    assert lifetime(call_event(expiresAt=at(40 * DAY))) == CAP
    assert lifetime(call_event(expiresAt=at(CAP - 1))) == CAP - 1
    assert lifetime(message_event(occurredAt=at(30 * DAY))) == CAP
    assert build("apns_voip", call_event(expiresAt=at(40 * DAY)))["headers"]["apns-expiration"] == str(
        NOW_SECONDS + CAP
    )


def test_any_timezone_aware_clock_gives_the_same_requests_and_the_default_clock_is_the_current_time() -> None:
    for zone in (timezone(timedelta(hours=5, minutes=30)), timezone(timedelta(hours=-11)), UTC):
        for name in NAMES:
            assert build(name, call_event(), now=NOW.astimezone(zone)) == build(name, call_event()), (name, zone)
    event = message_event(occurredAt=datetime.now(UTC).isoformat())
    for fresh in (push.web_push(event), push.web_push(event, now=None)):
        assert fresh is not None
        assert DAY - 2 <= int(fresh["headers"]["TTL"]) <= DAY


@pytest.mark.parametrize("name", NAMES)
def test_a_request_exactly_at_its_limit_is_kept_and_one_byte_over_shortens_the_body(name: str) -> None:
    event, limit = (call_event() if name == "apns_voip" else message_event()), LIMITS[name]

    def request(body: str) -> Any:
        return build(name, event, title="Ada", body=body)

    pad = limit - size(measured(name, request("x"))) + 1
    body = "x" * pad
    exact = request(body)
    assert size(measured(name, exact)) == limit
    assert visible(name, exact) == ("Ada", body)
    over = request(f"{body}y")
    assert size(measured(name, over)) == limit
    assert visible(name, over) == ("Ada", f"{'x' * (pad - 3)}{ELLIPSIS}")
    # A preview that doesn't fit beside a long title is shortened like a body.
    if name != "apns_voip":
        title, preview = "T" * 700, {"text": "\u0001" * 512, "truncated": False}
        previewed = build(name, message_event(preview=preview), title=title)
        shown_title, shown_body = visible(name, previewed)
        assert shown_title == title
        assert shown_body is not None
        assert re.fullmatch("\u0001{1,511}\u2026", shown_body)
        assert size(measured(name, previewed)) <= limit
        assert size(measured(name, previewed, body=f"\u0001{shown_body}")) > limit, "the preview is not maximal"


@pytest.mark.parametrize("unit", ["é", "€", "👋", "\u0001", '"', "\\", "\n", "a👋"])
@pytest.mark.parametrize("name", NAMES)
def test_shortened_text_keeps_whole_code_points_and_the_longest_prefix_that_fits(name: str, unit: str) -> None:
    event, limit = (call_event() if name == "apns_voip" else message_event()), LIMITS[name]
    text = unit * limit
    request = build(name, event, body=text)
    body = visible(name, request)[1]
    assert body is not None
    assert body.endswith(ELLIPSIS)
    kept = body[:-1]
    assert text.startswith(kept)
    assert re.search("[\ud800-\udfff]", body) is None
    assert size(measured(name, request)) <= limit
    assert size(measured(name, request, body=f"{text[: len(kept) + 1]}{ELLIPSIS}")) > limit, "the prefix is not maximal"


@pytest.mark.parametrize("name", NAMES)
def test_a_title_too_long_for_any_payload_shortens_the_body_to_an_ellipsis_and_then_the_title(name: str) -> None:
    event, limit, title = (call_event() if name == "apns_voip" else message_event()), LIMITS[name], "T" * 6000
    for body in ("hello", None):
        request = build(name, event, title=title, body=body)
        shown_title, shown_body = visible(name, request)
        assert shown_body == (ELLIPSIS if body else None)
        assert shown_title is not None
        assert re.fullmatch("T+\u2026", shown_title)
        assert size(measured(name, request)) <= limit
        assert size(measured(name, request, title=f"T{shown_title}")) > limit, "the title is not maximal"
    if name == "apns_alert":
        assert build(name, event, title=title)["payload"]["aps"]["alert"]["loc-key"] == "CONVOHOP_MESSAGE"


INVALID_OPTIONS: list[dict[str, Any]] = [
    {"title": 7},
    {"body": {}},
    {"title": b"Ada"},
    {"title": "\ud800"},
    {"body": "end\udbff"},
    {"title": "\udc00start"},
    {"preview": "false"},
    {"preview": 0},
    {"preview": 1},
    {"preview": None},
    {"now": NOW_SECONDS},
    {"now": float(NOW_SECONDS)},
    {"now": NOW.isoformat()},
    {"now": NOW.replace(tzinfo=None)},
    {"now": date(2026, 10, 10)},
]


@pytest.mark.parametrize("name", NAMES)
def test_options_are_checked_before_the_event_and_invalid_ones_fail_with_invalid_options(name: str) -> None:
    target = call_event() if name == "apns_voip" else message_event()
    for options in INVALID_OPTIONS:
        rejects("INVALID_OPTIONS", name, target, **options)
    rejects("INVALID_OPTIONS", name, {}, preview="no")
    rejects("INVALID_EVENT", name, {})


@pytest.mark.parametrize("name", APNS)
def test_the_apns_builders_require_an_app_bundle_id(name: str) -> None:
    target = call_event() if name == "apns_voip" else message_event()
    builder: Any = getattr(push, name)
    with pytest.raises(TypeError, match="bundle_id"):
        builder(target, now=NOW)
    for bundle_id in [
        None,
        "",
        7,
        b"com.example",
        "com..example",
        ".com.example",
        "com.example.",
        "com example",
        "com/example",
        "com_example",
        "com.exämple",
        "a" * 156,
        "com.example\n",
        "com.example\u0661",
    ]:
        rejects("INVALID_OPTIONS", name, target, bundle_id=bundle_id)
    rejects("INVALID_OPTIONS", name, {}, bundle_id="")
    for bundle_id in ["a" * 155, "com.example-app.Chat2", "A", "1.2"]:
        topic = f"{bundle_id}.voip" if name == "apns_voip" else bundle_id
        assert build(name, target, bundle_id=bundle_id)["headers"]["apns-topic"] == topic


def test_options_are_keyword_only_and_only_the_apns_builders_take_a_bundle_id() -> None:
    for name in NAMES:
        event, *options = inspect.signature(getattr(push, name)).parameters.values()
        assert (event.name, event.kind) == ("event", inspect.Parameter.POSITIONAL_OR_KEYWORD)
        assert all(option.kind is inspect.Parameter.KEYWORD_ONLY for option in options)
        names = ["bundle_id"] if name in APNS else []
        assert [option.name for option in options] == [*names, "title", "body", "preview", "now"]
    builder: Any = push.fcm
    with pytest.raises(TypeError):
        builder(message_event(), {"now": NOW})


INVALID_EVENTS: list[object] = [
    None,
    "event",
    [],
    {},
    b"{}",
    dumps(message_event()),
    {**message_event(), "eventType": "message.created"},
    message_event(preview={"text": "a\ud800", "truncated": False}),
    message_event(preview={"text": "x" * 513, "truncated": False}),
    message_event(preview={"text": "", "truncated": False}),
    message_event(preview={"text": "See you", "truncated": 1}),
    message_event(preview=None),
    message_event(subjectRef={"id": LIVE_SESSION_ID, "kind": "message"}),
    call_event(alertId=ALERT_ID.upper()),
    call_event(expiresAt="2026-02-29T00:00:00Z"),
    call_event(expiresAt=f"{at(40)}\n"),
    without(cancel_event("expired"), "reason"),
    cancel_event(None),
    cancel_event("not a reason"),
    message_event(connected=0),
    message_event(connected=None),
    without(message_event(), "connected"),
    message_event(senderId=MARKER),
    call_event(mediaProfile=f"{MARKER}!"),
    call_event(mediaProfile="AUDIO_ONLY\n"),
]


@pytest.mark.parametrize("name", NAMES)
def test_events_outside_the_push_payload_contract_fail_with_invalid_event_without_echoing_values(name: str) -> None:
    for event in INVALID_EVENTS:
        rejects("INVALID_EVENT", name, event, marker=MARKER)
    rejects("INVALID_OPTIONS", name, message_event(), marker=MARKER, title=f"{MARKER}\ud800")


PIPELINE_EVENTS = [
    message_event(preview={"text": "Grüße 👋", "truncated": False}),
    call_event(),
    cancel_event("expired"),
    cancel_event("declined"),
]


@pytest.mark.parametrize("event", PIPELINE_EVENTS, ids=lambda event: str(event.get("reason", event["eventType"])))
def test_builders_take_verified_webhook_events_ignore_unknown_fields_and_connected_and_dont_mutate_their_input(
    event: dict[str, Any],
) -> None:
    delivery = verified({**event, "addedLater": True})
    assert delivery.event.known
    original = copy.deepcopy(event)
    for name in NAMES:
        expected = build(name, event, title="Ada")
        # The data channels get every fresh notification event; the APNs builders skip some.
        assert expected is not None or name in APNS, name
        assert build(name, delivery.event, title="Ada") == expected, name
        assert build(name, delivery.event.to_dict(), title="Ada") == expected, name
        assert build(name, frozen(event), title="Ada") == expected, name
        changed = {**event, "connected": not event["connected"], "addedLater": {"a": 1}}
        assert build(name, changed, title="Ada") == expected, name
        assert build(name, event, title="Ada") == expected, f"{name} is not deterministic"
        # The event, not the delivery.
        rejects("INVALID_EVENT", name, delivery)
    assert event == original


def test_verified_events_other_than_notification_events_fail_with_invalid_event() -> None:
    envelope = {
        "eventId": EVENT_ID,
        "occurredAt": at(0),
        "projectId": PROJECT_ID,
        "subjectRef": {"id": MESSAGE_ID, "kind": "message"},
    }
    resource = verified({**envelope, "eventType": "message.created"}).event
    unknown = verified({**message_event(), "eventType": "notification.reaction"}).event
    assert isinstance(resource, WebhookResourceEvent)
    assert isinstance(unknown, WebhookUnknownEvent)
    for name in NAMES:
        for event in (resource, unknown):
            rejects("INVALID_EVENT", name, event)


VECTORS = spec("push-payload/vectors.json")


def vector_options(name: str, vector: dict[str, Any]) -> dict[str, Any]:
    """A vector's options as keyword arguments for a builder, with its clock."""
    source = vector["options"]
    assert set(source) <= {"bundleId", "title", "body", "preview"}, "a new option needs a mapping here"
    options: dict[str, Any] = {key: source[key] for key in ("title", "body", "preview") if key in source}
    if name in APNS:
        options["bundle_id"] = source["bundleId"]
    return {**options, "now": datetime.fromtimestamp(vector["nowSeconds"], UTC)}


def comparable(name: str, request: Any) -> Any:
    """The request with FCM's ``data.convohop`` parsed, as the vectors compare it."""
    if request is None or name != "fcm":
        return request
    message = request["message"]
    return {**request, "message": {**message, "data": {"convohop": json.loads(message["data"]["convohop"])}}}


def measured_part(name: str, request: Any) -> Any:
    return request["message"]["data"] if name == "fcm" else request["payload"]


def expected_request(name: str, vector: dict[str, Any]) -> Any:
    expected = vector["expected"][VECTOR_NAMES[name]]
    return None if expected is None else expected["request"]


@pytest.mark.parametrize("vector", VECTORS["vectors"], ids=lambda vector: vector["id"])
def test_the_builders_return_each_vectors_requests_with_or_without_its_unknown_fields(vector: dict[str, Any]) -> None:
    assert set(vector["expected"]) == set(VECTOR_NAMES.values())
    for event in (vector["event"], {**vector["event"], **vector.get("unknownFields", {})}):
        for name in NAMES:
            request = getattr(push, name)(event, **vector_options(name, vector))
            assert comparable(name, request) == comparable(name, expected_request(name, vector)), name
            if request is not None:
                assert len(push.encode(measured_part(name, request))) == vector["expected"][VECTOR_NAMES[name]]["bytes"]
                if name == "fcm":
                    fcm_data(request)


@pytest.mark.parametrize("vector", VECTORS["vectors"], ids=lambda vector: vector["id"])
def test_verified_vector_events_have_exactly_their_contract_fields_and_build_the_same_requests(
    vector: dict[str, Any],
) -> None:
    now = datetime.fromtimestamp(vector["nowSeconds"], UTC)
    event = verified({**vector["event"], **vector.get("unknownFields", {})}, now).event
    assert event.known
    assert event.to_dict() == vector["event"]
    for name in NAMES:
        request = getattr(push, name)(event, **vector_options(name, vector))
        assert comparable(name, request) == comparable(name, expected_request(name, vector)), name


@pytest.mark.parametrize("invalid", VECTORS["invalidEvents"], ids=lambda invalid: invalid["id"])
def test_builders_reject_each_invalid_vector_event_and_webhooks_verify_returns_it_as_an_unknown_event(
    invalid: dict[str, Any],
) -> None:
    first = VECTORS["vectors"][0]
    now = datetime.fromtimestamp(first["nowSeconds"], UTC)
    for name in NAMES:
        options = {"bundle_id": first["options"]["bundleId"]} if name in APNS else {}
        rejects("INVALID_EVENT", name, invalid["event"], now=now, **options)
    event = verified(invalid["event"], now).event
    assert isinstance(event, WebhookUnknownEvent)
    envelope = ("eventId", "eventType", "occurredAt", "projectId", "subjectRef")
    assert event.to_dict() == {key: invalid["event"][key] for key in envelope}


SCHEMA = spec("push-payload/push-payload.schema.json")["$defs"]
APNS_PAYLOAD = SCHEMA["apnsAlert"]["properties"]["payload"]
APNS_APS = APNS_PAYLOAD["properties"]["aps"]
FCM_MESSAGE = SCHEMA["fcm"]["properties"]["message"]


@pytest.mark.parametrize(
    ("typed", "definition"),
    [
        (push.PushData, SCHEMA["data"]),
        (push.ApnsHeaders, SCHEMA["apnsHeaders"]),
        (push.ApnsAlert, APNS_APS["properties"]["alert"]),
        (push.ApnsAps, APNS_APS),
        (push.ApnsAlertPayload, APNS_PAYLOAD),
        (push.ApnsAlertRequest, SCHEMA["apnsAlert"]),
        (push.PushDataPayload, SCHEMA["apnsVoip"]["properties"]["payload"]),
        (push.PushDataPayload, SCHEMA["webPush"]["properties"]["payload"]),
        (push.ApnsVoipRequest, SCHEMA["apnsVoip"]),
        (push.FcmData, FCM_MESSAGE["properties"]["data"]),
        (push.FcmAndroid, FCM_MESSAGE["properties"]["android"]),
        (push.FcmMessage, FCM_MESSAGE),
        (push.FcmRequest, SCHEMA["fcm"]),
        (push.WebPushHeaders, SCHEMA["webPush"]["properties"]["headers"]),
        (push.WebPushRequest, SCHEMA["webPush"]),
    ],
    ids=lambda value: getattr(value, "__name__", ""),
)
def test_the_request_types_have_the_schemas_required_and_optional_keys(typed: Any, definition: dict[str, Any]) -> None:
    required = set(definition.get("required", ()))
    optional = set(definition["properties"]) - required
    assert (typed.__required_keys__, typed.__optional_keys__) == (required, optional)


def test_encode_gives_the_compact_utf8_json_the_limits_are_measured_on() -> None:
    request = build("apns_alert", message_event(), title='Grüße 👋 "Ada"\n')
    payload = request["payload"]
    assert push.encode(payload) == dumps(payload).encode()
    assert b'"mutable-content":1,' in push.encode(payload)
    assert len(json.dumps(payload).encode()) > len(push.encode(payload))


def test_push_payload_errors_have_a_code_and_a_message_and_pickle() -> None:
    error = PushPayloadError("INVALID_EVENT", "message")
    assert isinstance(error, Exception)
    assert (error.code, error.message, str(error)) == ("INVALID_EVENT", "message", "message")
    assert repr(error) == "PushPayloadError(code='INVALID_EVENT', message='message')"
    restored = pickle.loads(pickle.dumps(error))  # noqa: S301 - a round trip of this test's own object
    assert (type(restored), restored.code, restored.message) == (PushPayloadError, "INVALID_EVENT", "message")


def test_the_module_exports_four_builders_encode_the_request_types_and_its_error() -> None:
    assert all(hasattr(push, name) for name in push.__all__)
    functions = sorted(name for name in push.__all__ if inspect.isfunction(getattr(push, name)))
    assert functions == ["apns_alert", "apns_voip", "encode", "fcm", "web_push"]
    assert convohop.PushPayloadError is PushPayloadError
    assert convohop.push is push
