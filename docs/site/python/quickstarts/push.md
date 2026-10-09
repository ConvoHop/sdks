# Python push notifications quickstart

Send push notifications for ConvoHop messages and calls: `convohop.push` turns notification events into APNs, FCM and Web Push requests, and you send them with your own push credentials and libraries.

## Before you start

ConvoHop doesn't send push notifications itself. You need:

- A webhook endpoint that receives `notification.message`, `notification.call` and `notification.callCancelled` events, as the [webhooks quickstart](webhooks.md) shows. Each of these events is addressed to one recipient. Events arrive at least once and in any order, so deduplicate on `event_id` before you send.
- The devices that your app registered for each user, in your own database.
- Your push credentials and clients. This page uses `firebase-admin` for FCM and `pywebpush` for browsers. For APNs, use any HTTP/2 client.

## Build and send the requests

```python snippet=docs/languages/python/examples/src/push.py#notify
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
```

Each builder returns `None` when the event doesn't apply to the platform or has expired, and then you send nothing. The builders take these keyword options:

- `bundle_id` is your iOS app's bundle ID. The APNs builders need it for the `apns-topic` header, and the others don't take it.
- `title` and `body` are visible text of your own, such as the sender's name. Without them, a request carries only the event's metadata, plus the start of the message when the project turns on message previews. Pass `preview=False` to leave the preview out.
- `now` replaces the clock with a timezone-aware `datetime`, for example in tests.

A request expires when its event stops being relevant: a day after a message or a missed call, and when the ring stops for a call. A call and its cancellation share a collapse key, so a push service that still holds the call's request replaces it with the cancellation's.

The requests use each service's wire format: APNs headers and a payload, an FCM HTTP v1 message, and Web Push headers and a payload. Serialize a payload with `push.encode`, the compact UTF-8 JSON that the size limits are measured on. `pywebpush` and `firebase-admin` take some of these values in their own form, as the next two sections show.

## Web Push: pass the headers and leave ttl at 0

Every Web Push request has a `TTL` header. Requests for calls and cancellations also have the `Urgency: high` header, so the push service and the device don't hold them back to save battery, and a `Topic` header, their collapse key. Message requests have `Urgency: normal`.

`pywebpush` sends the headers you pass, but its `ttl` argument replaces the `TTL` header unless it's 0, its default. It also adds an `aud` claim to the `vapid_claims` dict you pass, so a reused dict sends the first push service's origin to every other one, which rejects it. Pass the request's headers, leave `ttl` out, and pass a new claims dict for each send:

```python snippet=docs/languages/python/examples/src/push.py#web-push
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
```

## FCM: firebase-admin's ttl is in seconds

FCM requests use the FCM HTTP v1 REST form, where `ttl` is a string of seconds such as `"45s"` and `priority` is uppercase, such as `"HIGH"`. `firebase-admin` takes Android options in its own form: `ttl` is a number of seconds or a `timedelta`, and `priority` is lowercase. It raises `ValueError` for `"45s"` and for `"HIGH"`. Convert the options:

```python snippet=docs/languages/python/examples/src/push.py#fcm
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
```

Each Android device has the target that its app registered: a registration token by default, or a Firebase Installation ID (FID) when the app's manifest sets `firebase_messaging_installation_id_enabled`. The app gets the token in `FirebaseMessagingService.onNewToken()`, or the FID in `onRegistered()`. firebase-messaging 25.1.0 deprecates `getToken()`, `deleteToken()` and `onNewToken()` in favor of `register()`, `unregister()` and `onRegistered()`. Both sets work: the deprecated methods without the flag, and the new ones with it. The token stays the default because the flag applies to the whole app: with it, `FirebaseMessaging.getToken()` fails for every library in the app. For FID mode, use firebase-messaging 25.1.2 or later (Firebase Android BoM 34.18.0 or later): 25.1.1 fixed re-registration when the FID changes, and 25.1.2 fixed a `FID_ALREADY_USED` registration error.

`firebase-admin` sends to a FID from version 7.5.0. That version also deprecates `Message(token=...)`, which still sends to a token but warns with a `DeprecationWarning`.

FCM requests carry Android options only. Send to Apple devices with the APNs requests.

## APNs

Send each APNs request with an HTTP/2 client, such as `httpx` with its `http2` extra and `http2=True`: POST `push.encode(request["payload"])` to `/3/device/` followed by the device token, with the request's `headers`, such as `apns-push-type`, `apns-topic` and `apns-expiration`, and your APNs authorization.

iOS requires an app to report every VoIP push to CallKit as an incoming call, so `apns_voip` builds requests for `notification.call` only. A CallKit app stops ringing when its realtime connection reports that the ring stopped. A missed call also gets an APNs alert, and an answered or declined ring gets no APNs request. [Calls on iOS](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md#calls-on-ios) has the details.

## How the samples are tested

The test runs `notify` on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md) and checks the request it sends to each kind of device. It also checks that `pywebpush` sends each Web Push request's `TTL`, `Urgency` and `Topic` headers with a payload that the subscription's keys decrypt, and that `firebase-admin` accepts each converted FCM message, to a token and to a FID, and sends the request's Android options.

## Next steps

- [`convohop.push` reference](../reference/push.md): every builder and its options.
- [Webhooks quickstart](webhooks.md): verify the deliveries that carry these events.
