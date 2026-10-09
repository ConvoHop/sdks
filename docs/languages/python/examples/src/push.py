"""Push quickstart snippets. tests/test_push.py runs them on every vector in spec/push-payload."""

# #region notify
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, TypedDict, Unpack

from convohop import push
from convohop.webhooks import WebhookNotificationEvent


class WebSubscriptionKeys(TypedDict):
    p256dh: str
    auth: str


# A browser's PushSubscription.toJSON().
class WebSubscription(TypedDict):
    endpoint: str
    keys: WebSubscriptionKeys


# An Android app's registration token, or its Firebase Installation ID (FID) when its manifest sets
# firebase_messaging_installation_id_enabled.
class FcmToken(TypedDict):
    token: str


class FcmFid(TypedDict):
    fid: str


FcmTarget = FcmToken | FcmFid


# The devices your app registered for a user, from your own database.
@dataclass(frozen=True)
class IosDevice:
    token: str
    voip_token: str | None = None  # The PushKit token of a CallKit app.


@dataclass(frozen=True)
class AndroidDevice:
    target: FcmTarget


@dataclass(frozen=True)
class WebDevice:
    subscription: WebSubscription


Device = IosDevice | AndroidDevice | WebDevice


# Your push clients: an APNs HTTP/2 client, firebase-admin and pywebpush.
class PushSenders(Protocol):
    def apns(self, token: str, request: push.ApnsAlertRequest | push.ApnsVoipRequest) -> None: ...
    def fcm(self, target: FcmTarget, request: push.FcmRequest) -> None: ...
    def web_push(self, subscription: WebSubscription, request: push.WebPushRequest) -> None: ...


# The options every builder takes. title and body are your own text, such as the sender's name.
class PushOptions(TypedDict, total=False):
    title: str | None
    body: str | None
    preview: bool
    now: datetime | None


# bundle_id is your iOS app's bundle ID.
def notify(
    event: WebhookNotificationEvent,
    devices: Sequence[Device],
    senders: PushSenders,
    *,
    bundle_id: str,
    **options: Unpack[PushOptions],
) -> None:
    for device in devices:
        # Each builder returns None when the event doesn't apply to the platform or is stale. Send nothing then.
        match device:
            case IosDevice(token=token, voip_token=voip_token):
                # A CallKit app gets incoming calls as VoIP pushes, and must report each one to CallKit.
                if voip_token and (voip := push.apns_voip(event, bundle_id=bundle_id, **options)):
                    senders.apns(voip_token, voip)
                # apns_alert returns None when a ring was answered or declined.
                elif alert := push.apns_alert(event, bundle_id=bundle_id, **options):
                    senders.apns(token, alert)
            case AndroidDevice(target=target):
                if request := push.fcm(event, **options):
                    senders.fcm(target, request)
            case WebDevice(subscription=subscription):
                if web := push.web_push(event, **options):
                    senders.web_push(subscription, web)


# #endregion notify

# #region web-push
from pywebpush import webpush


# vapid_private_key is your VAPID private key from your secret store, in a form pywebpush reads.
def send_web_push(
    subscription: WebSubscription,
    request: push.WebPushRequest,
    vapid_private_key: str,
    vapid_subject: str,  # A mailto: or https: URL where push services can reach you.
) -> None:
    webpush(
        subscription,
        data=push.encode(request["payload"]).decode(),  # pywebpush encrypts it for the subscription.
        vapid_private_key=vapid_private_key,
        vapid_claims={"sub": vapid_subject},  # A new dict for each send: pywebpush adds aud and exp to it.
        headers=request["headers"],  # TTL, Urgency and Topic. Leave the ttl argument at 0.
    )


# #endregion web-push

# #region fcm
from firebase_admin import messaging


# firebase-admin takes Android options in its own form: lowercase priority, and ttl in seconds as a number
# or a timedelta. The request's REST form, such as "HIGH" and "45s", makes it raise ValueError.
def firebase_message(target: FcmTarget, request: push.FcmRequest) -> messaging.Message:
    android = request["message"]["android"]
    return messaging.Message(
        **target,  # firebase-admin sends to a fid from 7.5.0, and warns that token is deprecated.
        data=request["message"]["data"],
        android=messaging.AndroidConfig(
            priority=android["priority"].lower(),
            ttl=int(android["ttl"].removesuffix("s")),
            collapse_key=android.get("collapse_key"),
        ),
    )


# Call firebase_admin.initialize_app() with your service account first.
def send_fcm(target: FcmTarget, request: push.FcmRequest) -> None:
    messaging.send(firebase_message(target, request))


# #endregion fcm
