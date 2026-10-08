import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import webpush from "web-push";
import { webhooks, type FcmRequest, type WebhookEvent, type WebhookNotificationEvent, type WebPushRequest } from "@convohop/server";
import { firebaseMessage, notify, webPushOptions, type Device, type PushSenders, type WebSubscription } from "../src/push.ts";
import { newSecret, signDelivery } from "./deliveries.ts";
import { pushVectors } from "./vectors.ts";

const vectors = await pushVectors();

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const subscription: WebSubscription = {
  endpoint: "https://push.example/send/subscription-1",
  keys: { p256dh: ecdh.getPublicKey("base64url"), auth: randomBytes(16).toString("base64url") },
};
const devices: Device[] = [
  { platform: "ios", token: "ios-token" },
  { platform: "ios", token: "callkit-token", voipToken: "callkit-voip-token" },
  { platform: "android", token: "android-token" },
  { platform: "web", subscription },
];

const isNotification = (event: WebhookEvent): event is WebhookNotificationEvent =>
  event.known && event.eventType.startsWith("notification.");

// The event as your webhook endpoint receives it.
async function received(event: object): Promise<WebhookNotificationEvent> {
  const secret = newSecret(), body = JSON.stringify(event);
  const delivery = await webhooks.verify({ headers: signDelivery(body, secret).headers, body, secrets: [secret] });
  if (!isNotification(delivery.event)) throw new Error(`Not a notification event: ${delivery.event.eventType}`);
  return delivery.event;
}

test("notify sends each device the request the push payload vectors expect", async () => {
  assert.ok(vectors.length > 0);
  for (const vector of vectors) {
    const sent: unknown[] = [];
    const senders: PushSenders = {
      apns: async (token, request) => void sent.push(["apns", token, request]),
      fcm: async (token, request) => void sent.push(["fcm", token, request]),
      webPush: async (target, request) => void sent.push(["webPush", target.endpoint, request]),
    };
    const now = new Date(vector.nowSeconds * 1000);
    await notify(await received(vector.event), devices, senders, { ...vector.options, now });

    const { apnsAlert, apnsVoip, fcm, webPush } = vector.expected;
    const callKit = apnsVoip ? ["apns", "callkit-voip-token", apnsVoip.request]
      : apnsAlert ? ["apns", "callkit-token", apnsAlert.request] : null;
    assert.deepEqual(sent, [
      ...(apnsAlert ? [["apns", "ios-token", apnsAlert.request]] : []),
      ...(callKit ? [callKit] : []),
      ...(fcm ? [["fcm", "android-token", fcm.request]] : []),
      ...(webPush ? [["webPush", subscription.endpoint, webPush.request]] : []),
    ], vector.id);
  }
});

test("webPushOptions keeps the request's TTL, Urgency and Topic", () => {
  const vapidDetails = { subject: "mailto:push@app.example", ...webpush.generateVAPIDKeys() };
  let checked = 0;
  for (const vector of vectors) {
    const request = vector.expected.webPush?.request as WebPushRequest | undefined;
    if (!request) continue;
    const payload = JSON.stringify(request.payload);
    const { headers } = webpush.generateRequestDetails(subscription, payload, webPushOptions(request, vapidDetails));
    assert.deepEqual([String(headers.TTL), headers.Urgency, headers.Topic],
      [request.headers.TTL, request.headers.Urgency, request.headers.Topic], vector.id);
    checked += 1;
  }
  assert.ok(checked > 0);

  // Why: web-push sets Urgency from its own urgency option, "normal" by default, after copying the headers.
  const call = vectors.find(vector => vector.id === "call-incoming")?.expected.webPush?.request as WebPushRequest;
  assert.equal(call.headers.Urgency, "high");
  const { TTL, Urgency } = call.headers;
  const naive = webpush.generateRequestDetails(subscription, JSON.stringify(call.payload), { vapidDetails, headers: { TTL, Urgency } });
  assert.equal(naive.headers.Urgency, "normal");
});

// firebase-admin's own message check, which send() runs before converting the message to the REST form.
const { validateMessage } = createRequire(import.meta.url)(fileURLToPath(
  new URL("../../messaging/messaging-internal.js", import.meta.resolve("firebase-admin/messaging")),
)) as { validateMessage(message: object): void };

test("firebaseMessage passes firebase-admin's check and sends the request's Android options", () => {
  let checked = 0;
  for (const vector of vectors) {
    const request = vector.expected.fcm?.request as FcmRequest | undefined;
    if (!request) continue;
    const sent = structuredClone(firebaseMessage("android-token", request));
    validateMessage(sent); // Converts it in place to what firebase-admin sends.
    const { android } = request.message;
    assert.deepEqual(sent, { token: "android-token", data: request.message.data,
      android: { ...android, priority: android.priority.toLowerCase() } }, vector.id);
    checked += 1;
  }
  assert.ok(checked > 0);

  // Why: firebase-admin's ttl is in milliseconds. The REST form throws, and seconds would mean milliseconds.
  const call = vectors.find(vector => vector.id === "call-incoming")?.expected.fcm?.request as FcmRequest;
  assert.equal(call.message.android.ttl, "45s");
  const { data, android } = call.message;
  assert.throws(() => validateMessage({ token: "android-token", data, android: { ...android } }), /milliseconds/);
  const seconds = { token: "android-token", data, android: { ttl: 45 } };
  validateMessage(seconds);
  assert.deepEqual(seconds.android, { ttl: "0.045000000s" });
});
