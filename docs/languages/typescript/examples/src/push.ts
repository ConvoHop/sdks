// Push quickstart snippets. test/push.test.ts runs them on every vector in spec/push-payload.

// #region notify
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
  | { platform: "android"; token: string }
  | { platform: "web"; subscription: WebSubscription };

// A browser's PushSubscription.toJSON().
export interface WebSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Your push clients: an APNs HTTP/2 client, firebase-admin and web-push.
export interface PushSenders {
  apns(token: string, request: ApnsAlertRequest | ApnsVoipRequest): Promise<void>;
  fcm(token: string, request: FcmRequest): Promise<void>;
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
      if (request) await senders.fcm(device.token, request);
    } else {
      const request = push.webPush(event, options);
      if (request) await senders.webPush(device.subscription, request);
    }
  }
}
// #endregion notify

// #region web-push
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
// #endregion web-push

// #region fcm
import { getMessaging, type TokenMessage } from "firebase-admin/messaging";

// firebase-admin takes Android options in its own form: lowercase priority, collapseKey, and ttl in
// milliseconds. The request's REST form ttl ("45s") makes it throw, and a bare 45 would mean 45 ms.
export function firebaseMessage(token: string, request: FcmRequest): TokenMessage {
  const { data, android } = request.message;
  return {
    token,
    data,
    android: {
      priority: android.priority === "HIGH" ? "high" : "normal",
      ttl: Number(android.ttl.slice(0, -1)) * 1000,
      ...(android.collapse_key ? { collapseKey: android.collapse_key } : {}),
    },
  };
}

// Call initializeApp() from firebase-admin/app with your service account first.
export async function sendFcm(token: string, request: FcmRequest): Promise<void> {
  await getMessaging().send(firebaseMessage(token, request));
}
// #endregion fcm
