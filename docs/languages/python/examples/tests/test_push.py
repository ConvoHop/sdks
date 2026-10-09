import base64
import json
import os
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import http_ece
import pytest
import requests
from convohop import push, webhooks
from convohop.webhooks import WebhookNotificationEvent
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from firebase_admin import messaging
from pywebpush import webpush

from deliveries import new_secret, sign_delivery, wire_json
from push import (
    AndroidDevice,
    Device,
    FcmTarget,
    IosDevice,
    PushOptions,
    WebDevice,
    WebSubscription,
    firebase_message,
    notify,
    send_web_push,
)
from vectors import PushVector, push_vectors

VECTORS = push_vectors()


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


# The browser's keys, so the tests can decrypt what pywebpush sends.
RECEIVER = ec.generate_private_key(ec.SECP256R1())
AUTH_SECRET = os.urandom(16)
SUBSCRIPTION: WebSubscription = {
    "endpoint": "https://push.example/send/subscription-1",
    "keys": {
        "p256dh": b64url(
            RECEIVER.public_key().public_bytes(
                serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
            )
        ),
        "auth": b64url(AUTH_SECRET),
    },
}
VAPID_PRIVATE_KEY = b64url(ec.generate_private_key(ec.SECP256R1()).private_numbers().private_value.to_bytes(32, "big"))
VAPID_SUBJECT = "mailto:push@app.example"

# An Android app's registration token, which it gets by default, and a FID.
FCM_TARGETS: list[FcmTarget] = [{"token": "android-token"}, {"fid": "android-fid"}]
DEVICES: list[Device] = [
    IosDevice("ios-token"),
    IosDevice("callkit-token", voip_token="callkit-voip-token"),
    *(AndroidDevice(target) for target in FCM_TARGETS),
    WebDevice(SUBSCRIPTION),
]


# The event as your webhook endpoint receives it.
def received(event: dict[str, Any]) -> WebhookNotificationEvent:
    secret, body = new_secret(), wire_json(event)
    delivered = webhooks.verify(headers=sign_delivery(body, secret)[1], body=body.encode(), secrets=[secret]).event
    assert isinstance(delivered, WebhookNotificationEvent), delivered
    return delivered


# The vector's builder options, as keyword arguments.
def builder_options(vector: PushVector) -> PushOptions:
    given = vector["options"]
    assert set(given) <= {"bundleId", "title", "body", "preview"}, "Forward the new builder option in notify."
    options: PushOptions = {"now": datetime.fromtimestamp(vector["nowSeconds"], UTC)}
    if "title" in given:
        options["title"] = given["title"]
    if "body" in given:
        options["body"] = given["body"]
    if "preview" in given:
        options["preview"] = given["preview"]
    return options


@dataclass
class RecordingSenders:
    sent: list[tuple[str, object, object]] = field(default_factory=list)

    def apns(self, token: str, request: push.ApnsAlertRequest | push.ApnsVoipRequest) -> None:
        self.sent.append(("apns", token, request))

    def fcm(self, target: FcmTarget, request: push.FcmRequest) -> None:
        self.sent.append(("fcm", target, request))

    def web_push(self, subscription: WebSubscription, request: push.WebPushRequest) -> None:
        self.sent.append(("webPush", subscription["endpoint"], request))


@pytest.mark.parametrize("vector", VECTORS, ids=[vector["id"] for vector in VECTORS])
def test_notify_sends_each_device_the_request_the_vector_expects(vector: PushVector) -> None:
    senders = RecordingSenders()
    notify(
        received(vector["event"]), DEVICES, senders, bundle_id=vector["options"]["bundleId"], **builder_options(vector)
    )

    expected = vector["expected"]
    alert, voip, fcm, web = expected["apnsAlert"], expected["apnsVoip"], expected["fcm"], expected["webPush"]
    callkit = (
        [("apns", "callkit-voip-token", voip["request"])]
        if voip
        else [("apns", "callkit-token", alert["request"])]
        if alert
        else []
    )
    assert senders.sent == [
        *([("apns", "ios-token", alert["request"])] if alert else []),
        *callkit,
        *([("fcm", target, fcm["request"]) for target in FCM_TARGETS] if fcm else []),
        *([("webPush", SUBSCRIPTION["endpoint"], web["request"])] if web else []),
    ]


@dataclass(frozen=True)
class Post:
    url: str
    headers: Mapping[str, str]
    body: bytes

    def decrypted(self) -> bytes:
        plaintext: bytes = http_ece.decrypt(self.body, private_key=RECEIVER, auth_secret=AUTH_SECRET)
        return plaintext

    def vapid_claims(self) -> dict[str, Any]:
        token = self.headers["Authorization"].removeprefix("vapid t=").split(",")[0]
        claims: dict[str, Any] = json.loads(b64url_decode(token.split(".")[1]))
        return claims


# What pywebpush posts to push services, which answer 201 Created.
@pytest.fixture
def posts(monkeypatch: pytest.MonkeyPatch) -> list[Post]:
    sent: list[Post] = []

    def post(url: str, *, data: bytes, headers: Mapping[str, str], timeout: float) -> requests.Response:
        sent.append(Post(url, headers, data))
        response = requests.Response()
        response.status_code = 201
        return response

    monkeypatch.setattr(requests, "post", post)
    return sent


def web_push_requests() -> list[tuple[str, push.WebPushRequest]]:
    found: list[tuple[str, push.WebPushRequest]] = [
        (vector["id"], expected["request"]) for vector in VECTORS if (expected := vector["expected"]["webPush"])
    ]
    assert found
    return found


def test_send_web_push_sends_the_payload_with_the_requests_ttl_urgency_and_topic(posts: list[Post]) -> None:
    for vector_id, request in web_push_requests():
        send_web_push(SUBSCRIPTION, request, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
        sent = posts[-1]
        assert sent.url == SUBSCRIPTION["endpoint"]
        assert [sent.headers.get(name) for name in ("TTL", "Urgency", "Topic")] == [
            request["headers"].get(name) for name in ("TTL", "Urgency", "Topic")
        ], vector_id
        assert sent.decrypted() == push.encode(request["payload"]), vector_id
        assert {key: sent.vapid_claims()[key] for key in ("aud", "sub")} == {
            "aud": "https://push.example",
            "sub": VAPID_SUBJECT,
        }


def test_pywebpush_replaces_the_ttl_header_and_reuses_the_audience_of_a_reused_claims_dict(posts: list[Post]) -> None:
    request = dict(web_push_requests())["call-incoming"]
    data = push.encode(request["payload"]).decode()
    other: WebSubscription = {**SUBSCRIPTION, "endpoint": "https://push.other.example/send/subscription-2"}

    # Why the ttl argument stays 0: any other value replaces the request's TTL header.
    webpush(
        SUBSCRIPTION,
        data=data,
        vapid_private_key=VAPID_PRIVATE_KEY,
        vapid_claims={"sub": VAPID_SUBJECT},
        headers=request["headers"],
        ttl=86400,
    )
    assert (request["headers"]["TTL"], posts[-1].headers["TTL"]) == ("45", "86400")

    # Why each send gets a new claims dict: pywebpush stores the first push service's audience in it.
    claims = {"sub": VAPID_SUBJECT}
    for subscription in (SUBSCRIPTION, other):
        webpush(
            subscription,
            data=data,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=claims,
            headers=request["headers"],
        )
    assert [post.vapid_claims()["aud"] for post in posts[-2:]] == ["https://push.example", "https://push.example"]
    for subscription in (SUBSCRIPTION, other):
        send_web_push(subscription, request, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
    assert [post.vapid_claims()["aud"] for post in posts[-2:]] == ["https://push.example", "https://push.other.example"]


# What firebase-admin's send() checks and converts the message to before it calls FCM.
def sent_by_firebase_admin(message: messaging.Message) -> dict[str, Any]:
    encoded: dict[str, Any] = messaging._MessagingService.encode_message(message)
    return encoded


def test_firebase_message_passes_firebase_admins_check_and_sends_the_requests_android_options() -> None:
    fcm_requests: list[push.FcmRequest] = [
        expected["request"] for vector in VECTORS if (expected := vector["expected"]["fcm"])
    ]
    assert fcm_requests
    for request in fcm_requests:
        android = request["message"]["android"]
        options = {"data": request["message"]["data"], "android": {**android, "priority": android["priority"].lower()}}
        # firebase-admin 7.5.0 and later warn that a token target is deprecated, and still send to it.
        with pytest.warns(DeprecationWarning, match="Message.token is deprecated"):
            to_token = firebase_message({"token": "android-token"}, request)
        assert sent_by_firebase_admin(to_token) == {"token": "android-token", **options}
        to_fid = firebase_message({"fid": "android-fid"}, request)
        assert sent_by_firebase_admin(to_fid) == {"fid": "android-fid", **options}

    # Why: firebase-admin rejects the request's REST form of the priority and the ttl.
    call = next(vector["expected"]["fcm"] for vector in VECTORS if vector["id"] == "call-incoming")
    assert call is not None
    android = call["request"]["message"]["android"]
    assert (android["priority"], android["ttl"]) == ("HIGH", "45s")
    with pytest.raises(ValueError, match="priority must be"):
        sent_by_firebase_admin(
            messaging.Message(fid="android-fid", android=messaging.AndroidConfig(priority="HIGH", ttl=45))
        )
    with pytest.raises(ValueError, match="ttl must be a duration in seconds"):
        sent_by_firebase_admin(
            messaging.Message(fid="android-fid", android=messaging.AndroidConfig(priority="high", ttl="45s"))
        )
