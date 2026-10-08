// Push payload builders for the contract in spec/push-payload/. They are pure functions: they send nothing
// and hold no credentials. Your push library sends the requests and owns APNs/FCM auth and Web Push encryption.
import { epochSeconds, notificationEvent } from "./webhooks.js";
import type {
  WebhookCallCancelReason, WebhookCallCancelledNotificationEvent, WebhookCallMediaProfile, WebhookNotificationEvent,
} from "./webhooks.js";

/**
 * Why a push payload couldn't be built:
 * - `INVALID_OPTIONS`: an option has the wrong type, `title` or `body` has a lone surrogate, `now` isn't a valid
 *   `Date`, or `bundleId` isn't an app bundle ID. Options are checked first.
 * - `INVALID_EVENT`: the event doesn't match the push payload contract.
 */
export type PushPayloadCode = "INVALID_EVENT" | "INVALID_OPTIONS";

/** A push payload that couldn't be built. The message names the field but never contains its value. */
export class PushPayloadError extends Error {
  constructor(readonly code: PushPayloadCode, message: string) {
    super(message); this.name = "PushPayloadError";
  }
}

export interface PushOptions {
  /** The visible title, such as the sender's or conversation's name. Omitted when empty. */
  title?: string | undefined;
  /** The visible body. Replaces the message preview. Omitted when empty. */
  body?: string | undefined;
  /** Whether a message event's preview becomes the body when `body` is empty. Defaults to `true`. */
  preview?: boolean;
  /** The clock for the TTL and expiration. Defaults to the current time. */
  now?: Date;
}
export interface ApnsPushOptions extends PushOptions {
  /** The app's bundle ID: the `apns-topic` of alerts. VoIP pushes use `<bundleId>.voip`. */
  bundleId: string;
}

/**
 * The `convohop` metadata every payload carries for your app: the event's fields without `subjectRef`, `connected`
 * and `preview`. APNs VoIP, FCM and Web Push payloads also carry the visible `title` and `body` here, because they
 * have no visible alert of their own.
 */
export type PushData = {
  eventId: string;
  eventType: WebhookNotificationEvent["eventType"];
  occurredAt: string;
  projectId: string;
  recipientId: string;
  conversationId: string;
  senderId: string;
  messageId?: string;
  liveSessionId?: string;
  alertId?: string;
  expiresAt?: string;
  mediaProfile?: WebhookCallMediaProfile;
  reason?: WebhookCallCancelReason;
  title?: string;
  body?: string;
};

/** HTTP/2 headers for APNs. Your APNs client adds `authorization` and sends to `/3/device/<token>`. */
export type ApnsHeaders = {
  "apns-push-type": "alert" | "voip";
  "apns-topic": string;
  "apns-priority": "5" | "10";
  /** Unix seconds after which APNs stops trying to deliver. */
  "apns-expiration": string;
  /** Calls and missed calls: the ring's collapse key, so a missed-call alert replaces the ring's incoming-call alert. */
  "apns-collapse-id"?: string;
};
export type ApnsAlert = {
  title?: string;
  body?: string;
  /** Present when there is no body: `CONVOHOP_MESSAGE`, `CONVOHOP_CALL` or `CONVOHOP_MISSED_CALL`. */
  "loc-key"?: string;
};
export type ApnsAlertRequest = {
  headers: ApnsHeaders;
  payload: {
    aps: { alert: ApnsAlert; sound: string; "mutable-content": 0 | 1; "thread-id": string };
    convohop: PushData;
  };
};
export type ApnsVoipRequest = { headers: ApnsHeaders; payload: { convohop: PushData } };
export type FcmRequest = {
  /**
   * An FCM HTTP v1 REST `messages:send` message without a target: add `token`. `convohop` is `PushData` as JSON.
   * Firebase Admin SDKs take `android` in their own form, such as `firebase-admin`'s `ttl` in milliseconds.
   */
  message: {
    data: { convohop: string };
    android: { priority: "NORMAL" | "HIGH"; ttl: string; collapse_key?: string };
  };
};
export type WebPushRequest = {
  /**
   * RFC 8030 headers for your Web Push library, which encrypts the payload (RFC 8291) and signs (VAPID).
   * Where it sets `TTL`, `Urgency` or `Topic` from its own options, pass the values there, or its defaults replace them.
   */
  headers: { TTL: string; Urgency: "very-low" | "low" | "normal" | "high"; Topic?: string };
  payload: { convohop: PushData };
};

// Push libraries take headers as string records, which an interface isn't assignable to, so these types are aliases.
type Expect<T extends true> = T;
type HeadersAreRecords = Expect<
  [ApnsHeaders, WebPushRequest["headers"]] extends [Record<string, string>, Record<string, string>] ? true : false>;

// Payload limits in UTF-8 bytes. Web Push: RFC 8291's plaintext limit for the 4096-byte body push services accept, less
// the encryption header (86), AEAD tag (16) and padding delimiter (1).
const APNS_ALERT_LIMIT = 4096, APNS_VOIP_LIMIT = 5120, FCM_LIMIT = 4096, WEB_PUSH_LIMIT = 4096 - 86 - 16 - 1;
// Lifetimes in seconds: messages and missed calls stay relevant for a day; no platform stores longer than 28 days.
const NOTICE_LIFETIME = 86_400, MAX_LIFETIME = 2_419_200;
const BUNDLE_ID = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*$/, BUNDLE_ID_LIMIT = 155, LONE_SURROGATE = /[\uD800-\uDFFF]/u;
const ELLIPSIS = "\u2026";
const encoder = new TextEncoder();

type Text = { title: string | undefined; body: string | undefined };
interface Prepared extends Text { event: WebhookNotificationEvent; nowSeconds: number; bundleId: string }

function invalidOptions(message: string): PushPayloadError { return new PushPayloadError("INVALID_OPTIONS", message); }
function optionText(options: Readonly<Record<string, unknown>>, field: keyof Text): string | undefined {
  const value = options[field];
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || LONE_SURROGATE.test(value)) throw invalidOptions(`${field} must be a string without lone surrogates`);
  return value;
}
function prepare(input: unknown, raw: unknown, apns: boolean): Prepared {
  if (raw !== undefined && (typeof raw !== "object" || raw === null || Array.isArray(raw)))
    throw invalidOptions("Push options must be an object");
  const options = (raw ?? {}) as Readonly<Record<string, unknown>>;
  const title = optionText(options, "title"), body = optionText(options, "body"), { preview, now = new Date() } = options;
  if (preview !== undefined && typeof preview !== "boolean") throw invalidOptions("preview must be a boolean");
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw invalidOptions("now must be a valid Date");
  const bundleId = apns ? options.bundleId : "";
  if (typeof bundleId !== "string" || (apns && (bundleId.length > BUNDLE_ID_LIMIT || !BUNDLE_ID.test(bundleId))))
    throw invalidOptions("bundleId must be an app bundle ID");
  const event = notificationEvent(input);
  if (typeof event === "string") throw new PushPayloadError("INVALID_EVENT", `Invalid notification event: ${event}`);
  const shown = preview !== false && event.eventType === "notification.message" ? event.preview : undefined;
  return { event, title, body: body ?? (shown && shown.text + (shown.truncated ? ELLIPSIS : "")),
    nowSeconds: Math.floor(now.getTime() / 1000), bundleId };
}

function seconds(timestamp: string): number {
  const value = epochSeconds(timestamp);
  if (value === undefined) throw new Error("ConvoHop push: a validated timestamp didn't parse");
  return value;
}
const missedCall = (event: WebhookCallCancelledNotificationEvent): boolean =>
  event.reason === "ended" || event.reason === "expired";
/** Unix seconds until which delivering the event is still useful. */
function deadline(event: WebhookNotificationEvent): number {
  if (event.eventType === "notification.message") return seconds(event.occurredAt) + NOTICE_LIFETIME;
  if (event.eventType === "notification.callCancelled" && missedCall(event)) return seconds(event.occurredAt) + NOTICE_LIFETIME;
  return seconds(event.expiresAt);
}
/** The remaining lifetime, capped at 28 days, or `null` when the event is stale. */
function lifetime(input: Prepared): { ttl: number; expiration: number } | null {
  const ttl = Math.min(deadline(input.event) - input.nowSeconds, MAX_LIFETIME);
  return ttl > 0 ? { ttl, expiration: input.nowSeconds + ttl } : null;
}
/**
 * Calls and cancellations collapse per ring: 32 lowercase hex digits, valid as an APNs collapse ID, FCM collapse key and
 * Web Push topic.
 */
function collapseKey(event: WebhookNotificationEvent): string | undefined {
  return event.eventType === "notification.message" ? undefined : event.alertId.replaceAll("-", "");
}
function data(event: WebhookNotificationEvent, text?: Text): PushData {
  const { eventId, eventType, occurredAt, projectId, recipientId, conversationId, senderId } = event;
  const specific = event.eventType === "notification.message" ? { messageId: event.messageId } : {
    liveSessionId: event.liveSessionId, alertId: event.alertId, expiresAt: event.expiresAt, mediaProfile: event.mediaProfile,
    ...(event.eventType === "notification.callCancelled" ? { reason: event.reason } : {}),
  };
  return { eventId, eventType, occurredAt, projectId, recipientId, conversationId, senderId, ...specific,
    ...(text?.title === undefined ? {} : { title: text.title }), ...(text?.body === undefined ? {} : { body: text.body }) };
}

/** UTF-8 bytes of the compact `JSON.stringify` serialization, the contract's canonical size. */
const byteSize = (value: unknown): number => encoder.encode(JSON.stringify(value)).length;
function codePoints(value: string, limit: number): string[] {
  const points: string[] = [];
  for (const point of value) {
    if (points.length === limit) break;
    points.push(point);
  }
  return points;
}
/**
 * Builds the request, shortening `body` and then `title` while the measured payload exceeds `limit`: each becomes its
 * longest code-point prefix that fits followed by `…`, or just `…` when no prefix fits.
 */
function fit<T>(limit: number, input: Text, build: (text: Text) => T, measure: (request: T) => number): T {
  let text: Text = { title: input.title, body: input.body }, request = build(text);
  for (const field of ["body", "title"] as const) {
    const original = text[field];
    if (measure(request) <= limit) return request;
    if (original === undefined) continue;
    // A prefix of more than `limit` code points is more than `limit` bytes, so it never fits.
    const points = codePoints(original, limit + 1), current = text;
    const shortened = (count: number): Text => ({ ...current, [field]: points.slice(0, count).join("") + ELLIPSIS });
    let low = 0, high = points.length - 1, best = 0;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      if (measure(build(shortened(middle))) <= limit) { best = middle; low = middle + 1; } else high = middle - 1;
    }
    text = shortened(best);
    request = build(text);
  }
  if (measure(request) > limit) throw new Error(`ConvoHop push: notification metadata exceeds ${limit} bytes`);
  return request;
}
function apnsHeaders(type: "alert" | "voip", topic: string, expiration: number, collapse?: string): ApnsHeaders {
  return { "apns-push-type": type, "apns-topic": topic, "apns-priority": "10", "apns-expiration": String(expiration),
    ...(collapse === undefined ? {} : { "apns-collapse-id": collapse }) };
}

/**
 * Builds provider requests from per-recipient notification events (`notification.message`, `notification.call` and
 * `notification.callCancelled`), as `webhooks.verify()` returns them. Each builder validates its options and then the
 * event, throwing `PushPayloadError`, and returns `null` when the event doesn't apply to the platform or is stale.
 * Payloads are metadata-only unless you pass `title` or `body`, or the event carries an opted-in message preview.
 * The contract is `spec/push-payload/`.
 */
export const push = Object.freeze({
  /**
   * An APNs alert for a message, an incoming call, or a missed call (`callCancelled` with reason `ended` or
   * `expired`); `null` for other cancellations. At most 4096 bytes.
   */
  apnsAlert(event: WebhookNotificationEvent, options: ApnsPushOptions): ApnsAlertRequest | null {
    const input = prepare(event, options, true), notice = input.event;
    if (notice.eventType === "notification.callCancelled" && !missedCall(notice)) return null;
    const life = lifetime(input);
    if (!life) return null;
    const headers = apnsHeaders("alert", input.bundleId, life.expiration, collapseKey(notice));
    const key = notice.eventType === "notification.message" ? "CONVOHOP_MESSAGE"
      : notice.eventType === "notification.call" ? "CONVOHOP_CALL" : "CONVOHOP_MISSED_CALL";
    const convohop = data(notice);
    return fit(APNS_ALERT_LIMIT, input, text => ({ headers, payload: {
      aps: {
        alert: { ...(text.title === undefined ? {} : { title: text.title }),
          ...(text.body === undefined ? { "loc-key": key } : { body: text.body }) },
        sound: "default", "mutable-content": 1, "thread-id": notice.conversationId,
      },
      convohop,
    } }), request => byteSize(request.payload));
  },
  /**
   * An APNs VoIP push for an incoming call; `null` for other events. iOS requires you to report every VoIP push to
   * CallKit as a call. At most 5120 bytes.
   */
  apnsVoip(event: WebhookNotificationEvent, options: ApnsPushOptions): ApnsVoipRequest | null {
    const input = prepare(event, options, true);
    if (input.event.eventType !== "notification.call") return null;
    const life = lifetime(input);
    if (!life) return null;
    const headers = apnsHeaders("voip", `${input.bundleId}.voip`, life.expiration);
    return fit(APNS_VOIP_LIMIT, input, text => ({ headers, payload: { convohop: data(input.event, text) } }),
      request => byteSize(request.payload));
  },
  /** An FCM data message for any notification event. At most 4096 bytes of `data` as JSON. */
  fcm(event: WebhookNotificationEvent, options?: PushOptions): FcmRequest | null {
    const input = prepare(event, options, false), life = lifetime(input);
    if (!life) return null;
    const collapse = collapseKey(input.event);
    const android = { priority: "HIGH" as const, ttl: `${life.ttl}s`, ...(collapse === undefined ? {} : { collapse_key: collapse }) };
    return fit(FCM_LIMIT, input, text => ({ message: { data: { convohop: JSON.stringify(data(input.event, text)) }, android } }),
      request => byteSize(request.message.data));
  },
  /** A Web Push message for any notification event. At most 3993 bytes, the RFC 8291 plaintext limit. */
  webPush(event: WebhookNotificationEvent, options?: PushOptions): WebPushRequest | null {
    const input = prepare(event, options, false), life = lifetime(input);
    if (!life) return null;
    const collapse = collapseKey(input.event);
    const headers = { TTL: String(life.ttl), Urgency: input.event.eventType === "notification.message" ? "normal" as const : "high" as const,
      ...(collapse === undefined ? {} : { Topic: collapse }) };
    return fit(WEB_PUSH_LIMIT, input, text => ({ headers, payload: { convohop: data(input.event, text) } }),
      request => byteSize(request.payload));
  },
});
