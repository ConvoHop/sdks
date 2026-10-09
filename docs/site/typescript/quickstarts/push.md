# TypeScript push notifications quickstart

Send push notifications for ConvoHop messages and calls: `@convohop/server` turns notification events into APNs, FCM and Web Push requests, and you send them with your own push credentials and libraries.

## Before you start

ConvoHop doesn't send push notifications itself. You need:

- A webhook endpoint that receives `notification.message`, `notification.call` and `notification.callCancelled` events, as the [webhooks quickstart](webhooks.md) shows. Each of these events is addressed to one recipient. Events arrive at least once and in any order, so deduplicate on `eventId` before you send.
- The devices that your app registered for each user, in your own database.
- Your push credentials and clients. This page uses `firebase-admin` for FCM and `web-push` for browsers. For APNs, use any HTTP/2 client.

## Build and send the requests

```ts snippet=docs/languages/typescript/examples/src/push.ts#notify
import {
  push,
  type ApnsAlertRequest,
  type ApnsPushOptions,
  type ApnsVoipRequest,
  type FcmRequest,
  type WebhookNotificationEvent,
  type WebPushRequest,
} from "@convohop/server";

// The devices your app registered for a user, from your own database.
export type Device =
  | { platform: "ios"; token: string; voipToken?: string } // voipToken: the PushKit token of a CallKit app.
  | { platform: "android"; target: FcmTarget }
  | { platform: "web"; subscription: WebSubscription };

// An Android app's registration token, or its Firebase Installation ID (FID) when its manifest sets
// firebase_messaging_installation_id_enabled.
export type FcmTarget = { token: string } | { fid: string };

// A browser's PushSubscription.toJSON().
export interface WebSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Your push clients: an APNs HTTP/2 client, firebase-admin and web-push.
export interface PushSenders {
  apns(token: string, request: ApnsAlertRequest | ApnsVoipRequest): Promise<void>;
  fcm(target: FcmTarget, request: FcmRequest): Promise<void>;
  webPush(subscription: WebSubscription, request: WebPushRequest): Promise<void>;
}

// options.bundleId is your iOS app's bundle ID. options.title is your own text, such as the sender's name.
export async function notify(
  event: WebhookNotificationEvent,
  devices: readonly Device[],
  senders: PushSenders,
  options: ApnsPushOptions,
): Promise<void> {
  for (const device of devices) {
    // Each builder returns null when the event doesn't apply to the platform or is stale. Send nothing then.
    if (device.platform === "ios") {
      // A CallKit app gets incoming calls as VoIP pushes, and must report each one to CallKit.
      const voip = device.voipToken ? push.apnsVoip(event, options) : null;
      if (voip && device.voipToken) {
        await senders.apns(device.voipToken, voip);
      } else {
        const alert = push.apnsAlert(event, options); // null when a ring was answered or declined.
        if (alert) await senders.apns(device.token, alert);
      }
    } else if (device.platform === "android") {
      const request = push.fcm(event, options);
      if (request) await senders.fcm(device.target, request);
    } else {
      const request = push.webPush(event, options);
      if (request) await senders.webPush(device.subscription, request);
    }
  }
}
```

Each builder returns `null` when the event doesn't apply to the platform or has expired, and then you send nothing. The options apply to every builder:

- `bundleId` is your iOS app's bundle ID. The APNs builders need it for the `apns-topic` header, and the others ignore it.
- `title` and `body` are visible text of your own, such as the sender's name. Without them, a request carries only the event's metadata, plus the start of the message when the project turns on message previews.

A request expires when its event stops being relevant: a day after a message or a missed call, and when the ring stops for a call. A call and its cancellation share a collapse key, so a push service that still holds the call's request replaces it with the cancellation's.

The requests use each service's wire format: APNs headers and a payload, an FCM HTTP v1 message, and Web Push headers and a payload. `web-push` and `firebase-admin` take some of these values as their own options, as the next two sections show.

## Web Push: pass Urgency as an option

Web Push requests for calls and cancellations have the `Urgency: high` header, so the push service and the device don't hold them back to save battery. Message requests have `Urgency: normal`.

`web-push` sets the `Urgency` header from its `urgency` option, which defaults to `normal`, after it copies the headers you pass. So sending with `{ headers: request.headers }` would deliver calls at normal urgency. Pass the `TTL`, `Urgency` and `Topic` headers as `web-push`'s `TTL`, `urgency` and `topic` options instead:

```ts snippet=docs/languages/typescript/examples/src/push.ts#web-push
import webpush, { type RequestOptions } from "web-push";

type VapidDetails = NonNullable<RequestOptions["vapidDetails"]>;

// Pass the request's headers as web-push's own options. web-push sets Urgency from its urgency option,
// which defaults to "normal", after copying any headers you pass: { headers } would slow down calls.
export function webPushOptions(request: WebPushRequest, vapidDetails: VapidDetails): RequestOptions {
  const { TTL, Urgency, Topic } = request.headers;
  return { vapidDetails, TTL: Number(TTL), urgency: Urgency, ...(Topic ? { topic: Topic } : {}) };
}

export async function sendWebPush(
  subscription: WebSubscription,
  request: WebPushRequest,
  vapidDetails: VapidDetails,
): Promise<void> {
  const payload = JSON.stringify(request.payload); // web-push encrypts it for the subscription.
  await webpush.sendNotification(subscription, payload, webPushOptions(request, vapidDetails));
}
```

## FCM: firebase-admin's ttl is in milliseconds

FCM requests use the FCM HTTP v1 REST form, where `ttl` is a string of seconds such as `"45s"`. `firebase-admin` takes Android options in its own form: `ttl` is a number of milliseconds, `priority` is lowercase and `collapse_key` is `collapseKey`. It throws for `"45s"`, and treats a bare `45` as 45 milliseconds, so a ring would expire almost at once. Convert the options:

```ts snippet=docs/languages/typescript/examples/src/push.ts#fcm
import { getMessaging, type Message } from "firebase-admin/messaging";

// firebase-admin takes Android options in its own form: lowercase priority, collapseKey, and ttl in
// milliseconds. The request's REST form ttl ("45s") makes it throw, and a bare 45 would mean 45 ms.
export function firebaseMessage(target: FcmTarget, request: FcmRequest): Message {
  const { data, android } = request.message;
  return {
    ...target, // firebase-admin sends to a fid from 14.1.0.
    data,
    android: {
      priority: android.priority === "HIGH" ? "high" : "normal",
      ttl: Number(android.ttl.slice(0, -1)) * 1000,
      ...(android.collapse_key ? { collapseKey: android.collapse_key } : {}),
    },
  };
}

// Call initializeApp() from firebase-admin/app with your service account first.
export async function sendFcm(target: FcmTarget, request: FcmRequest): Promise<void> {
  await getMessaging().send(firebaseMessage(target, request));
}
```

Each Android device has the target that its app registered: a registration token by default, or a Firebase Installation ID (FID) when the app's manifest sets `firebase_messaging_installation_id_enabled`. The app gets the token in `FirebaseMessagingService.onNewToken()`, or the FID in `onRegistered()`. The flag applies to the whole app: with it, `FirebaseMessaging.getToken()` throws for every library in the app. `firebase-admin` sends to a FID from version 14.1.0. That version also marks `TokenMessage` deprecated, and still sends to a token.

FCM requests carry Android options only. Send to Apple devices with the APNs requests.

## APNs

Send each APNs request with an HTTP/2 client: POST its `payload` as JSON to `/3/device/` followed by the device token, with its `headers`, such as `apns-push-type`, `apns-topic` and `apns-expiration`, and your APNs authorization.

iOS requires an app to report every VoIP push to CallKit as an incoming call, so `apnsVoip` builds requests for `notification.call` only. A CallKit app stops ringing when its realtime connection reports that the ring stopped. A missed call also gets an APNs alert, and an answered or declined ring gets no APNs request. [Calls on iOS](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md#calls-on-ios) has the details.

## How the samples are tested

The test runs `notify` on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md) and checks the request it sends to each kind of device. It also checks that `web-push` sends each Web Push request's `TTL`, `Urgency` and `Topic` headers, and that `firebase-admin` accepts each converted FCM message, to a token and to a FID, and sends the request's Android options.

## Next steps

- [`push` reference](../reference/server.md#push-constant): every builder and its options.
- [Calling quickstart](calling.md): start the calls that these notifications ring.
