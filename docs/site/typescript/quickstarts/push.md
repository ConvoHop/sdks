# TypeScript push notifications quickstart

Send push notifications for ConvoHop messages and calls: `@convohop/server` turns notification events into APNs, FCM and Web Push requests, and you send them with your own push credentials and libraries. In browsers, `@convohop/client/push` subscribes to Web Push and shows the notifications.

## Before you start

ConvoHop doesn't send push notifications itself. You need:

- A webhook endpoint that receives `notification.message`, `notification.call` and `notification.callCancelled` events, as the [webhooks quickstart](webhooks.md) shows. Each of these events is addressed to one recipient. Events arrive at least once and in any order, so deduplicate on `eventId` before you send.
- The devices that your app registered for each user, in your own database.
- Your push credentials and clients. This page uses `firebase-admin` for FCM and `web-push` for browsers. For APNs, use any HTTP/2 client.
- For browsers, a VAPID key pair, such as `web-push generate-vapid-keys` makes. Your backend signs Web Push requests with the private key, and browsers subscribe with the public key.

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

Each Android device has the target that its app registered: a registration token by default, or a Firebase Installation ID (FID) when the app's manifest sets `firebase_messaging_installation_id_enabled`. The app gets the token in `FirebaseMessagingService.onNewToken()`, or the FID in `onRegistered()`. firebase-messaging 25.1.0 deprecates `getToken()`, `deleteToken()` and `onNewToken()` in favor of `register()`, `unregister()` and `onRegistered()`. Both sets work: the deprecated methods without the flag, and the new ones with it. The token stays the default because the flag applies to the whole app: with it, `FirebaseMessaging.getToken()` fails for every library in the app. For FID mode, use firebase-messaging 25.1.2 or later (Firebase Android BoM 34.18.0 or later): 25.1.1 fixed re-registration when the FID changes, and 25.1.2 fixed a `FID_ALREADY_USED` registration error.

`firebase-admin` sends to a FID from version 14.1.0. That version also marks `TokenMessage` deprecated, and still sends to a token.

FCM requests carry Android options only. Send to Apple devices with the APNs requests.

## APNs

Send each APNs request with an HTTP/2 client: POST its `payload` as JSON to `/3/device/` followed by the device token, with its `headers`, such as `apns-push-type`, `apns-topic` and `apns-expiration`, and your APNs authorization.

iOS requires an app to report every VoIP push to CallKit as an incoming call, so `apnsVoip` builds requests for `notification.call` only. A CallKit app stops ringing when its realtime connection reports that the ring stopped. A missed call also gets an APNs alert, and an answered or declined ring gets no APNs request. [Calls on iOS](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md#calls-on-ios) has the details.

## Subscribe a browser

`@convohop/client/push` subscribes the browser with your VAPID public key and gives you the registration to store:

```ts snippet=docs/languages/typescript/examples/src/browser-push.ts#subscribe
import { subscribePush, unsubscribePush, type PushRegistration } from "@convohop/client/push";

// Run it from a click, such as on a "Turn on notifications" button: subscribing asks for permission, and some
// browsers only ask from a click. Once the user has allowed notifications, also run it when your app starts: it
// reuses the subscription and registers it again, so your backend keeps it current.
export async function enableNotifications(vapidPublicKey: string): Promise<void> {
  const registration = await navigator.serviceWorker.register("/service-worker.js", { type: "module" });
  await subscribePush(registration, { applicationServerKey: vapidPublicKey, register: device => saveDevice("POST", device) });
}

// Run it when the user signs out, before your backend ends their sign-in: your backend forgets this browser, and
// then the browser unsubscribes.
export async function disableNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration) await unsubscribePush(registration, device => saveDevice("DELETE", device));
}

// Your backend's endpoint, behind your app's own sign-in. It stores or deletes the signed-in user's device:
// { kind: "webPush", subscription }, where subscription is the browser's PushSubscription.toJSON().
async function saveDevice(method: "POST" | "DELETE", device: PushRegistration): Promise<void> {
  const response = await fetch("/api/push/devices", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(device),
  });
  if (!response.ok) throw new Error(`Saving the device failed with HTTP ${response.status}`);
}
```

Your endpoint stores the registration's `subscription` as one of the signed-in user's devices, which `notify` sends Web Push requests to. Check that it has an `endpoint` and `p256dh` and `auth` keys before you store it. `subscribePush` reuses the browser's subscription when it was made with the same key, so registering on every start keeps your backend's copy current.

## Show notifications in the browser

The service worker shows each push, and opens its conversation when the user clicks it:

```ts snippet=docs/languages/typescript/examples/src/service-worker.ts#service-worker
import { handleNotificationClick, handlePushEvent } from "@convohop/client/push";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", event =>
  handlePushEvent(self.registration, event, {
    // Pushes that aren't ConvoHop notifications end here, including your app's own. Browsers expect every push to
    // show a notification, so show one.
    onError: () => self.registration.showNotification("New activity", { tag: "app-activity" }),
  }),
);

self.addEventListener("notificationclick", event => {
  // Opens the notification's conversation, or focuses a window that already shows it.
  if (handleNotificationClick(self.clients, event, notification => `/conversations/${notification.conversationId}`)) return;
  event.notification.close(); // Your app's own notifications, such as the one above.
  event.waitUntil(self.clients.openWindow("/"));
});
```

`handlePushEvent` checks each push against the push payload contract and shows its notification. Each notification is tagged with its message or call, so a later one for the same message or call replaces it. A repeated event, or a call that was answered or declined, replaces it silently, and a missed call replaces the ring with a missed-call notification. Browsers expect a notification for every push, so it shows one even for a repeat, and the sample's `onError` shows one for pushes that aren't ConvoHop notifications. It remembers events and cancelled rings only while the browser keeps the service worker running. The default titles are English. Pass `render` to show your own text.

`handleNotificationClick` resolves your URL against the service worker's location, then focuses a window that already shows it or opens one. It refuses a URL on another origin.

Build the service worker with your app's bundler, which resolves `@convohop/client/push`. That entry point has no dependencies. In TypeScript, compile the service worker with the `WebWorker` library instead of the DOM's, as the examples' [`tsconfig.worker.json`](https://github.com/ConvoHop/sdks/blob/main/docs/languages/typescript/examples/tsconfig.worker.json) does.

## How the samples are tested

The test runs `notify` on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md) and checks the request it sends to each kind of device. It also checks that `web-push` sends each Web Push request's `TTL`, `Urgency` and `Topic` headers, and that `firebase-admin` accepts each converted FCM message, to a token and to a FID, and sends the request's Android options.

A second test runs the service worker on every Web Push request of the contract: each push shows one notification with the expected tag, and clicking it opens the conversation. Subscribing needs a browser with a push service, so CI only typechecks that sample.

## Next steps

- [`push` reference](../reference/server.md#push-constant): every builder and its options.
- [`@convohop/client/push` reference](../reference/client-push.md): subscribing, and showing and opening notifications.
- [Calling quickstart](calling.md): start the calls that these notifications ring.
