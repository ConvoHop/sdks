// Push notifications for the contract in spec/push-payload/. ConvoHop doesn't send pushes: your backend builds them
// from its notification webhooks and sends them to the subscriptions your app registers with it.

export type PushNotificationType = "notification.message" | "notification.call" | "notification.callCancelled";
interface PushNotificationFields {
  /** Identifies the event across retries and replays of its webhook. */
  eventId: string;
  occurredAt: string;
  projectId: string;
  recipientId: string;
  conversationId: string;
  senderId: string;
  /** The visible title your backend set, if any. */
  title?: string;
  /** The visible body your backend set, if any. */
  body?: string;
}
export interface MessagePushNotification extends PushNotificationFields {
  eventType: "notification.message";
  messageId: string;
}
export interface CallPushNotification extends PushNotificationFields {
  eventType: "notification.call";
  liveSessionId: string;
  /** Identifies this ring. A later ring of the same call has a new `alertId`. */
  alertId: string;
  /** When the ring stops if nobody answers. */
  expiresAt: string;
  /** `AUDIO_ONLY`, `AUDIO_VIDEO` or a later profile. */
  mediaProfile: string;
}
export interface CallCancelledPushNotification extends PushNotificationFields {
  eventType: "notification.callCancelled";
  liveSessionId: string;
  /** The ring that stopped. */
  alertId: string;
  expiresAt: string;
  mediaProfile: string;
  /** `answered`, `declined`, `ended`, `expired` or a later reason. */
  reason: string;
}
/** The `convohop` object a push carries, with only the fields the contract defines for its type. */
export type PushNotification = MessagePushNotification | CallPushNotification | CallCancelledPushNotification;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, NIL_UUID = "00000000-0000-0000-0000-000000000000";
const TIMESTAMP = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))$/;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const types = new Set<string>(["notification.message", "notification.call", "notification.callCancelled"]);

/** Milliseconds since the epoch of a contract timestamp, or `undefined` when the value isn't one. */
function epochMs(value: string): number | undefined {
  const match = TIMESTAMP.exec(value);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    [1, 2, 3, 4, 5, 6, 9, 10].map(index => Number(match[index] ?? 0)) as [number, number, number, number, number, number, number, number];
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day ||
      date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second ||
      offsetHour > 23 || offsetMinute > 59) return undefined;
  const fraction = match[7] ? Math.floor(Number("0" + match[7]) * 1000) : 0;
  return date.getTime() + fraction - (match[8] === "-" ? -1 : 1) * (offsetHour * 3600000 + offsetMinute * 60000);
}
type Fields = Readonly<Record<string, unknown>>;
function invalid(field: string, rule: string): TypeError { return new TypeError("Push notification " + field + " must be " + rule); }
function uuid(source: Fields, field: string): string {
  const value = source[field];
  if (typeof value !== "string" || !UUID.test(value) || value === NIL_UUID) throw invalid(field, "a lowercase, non-nil UUID");
  return value;
}
function timestamp(source: Fields, field: string): string {
  const value = source[field];
  if (typeof value !== "string" || epochMs(value) === undefined) throw invalid(field, "an RFC 3339 timestamp");
  return value;
}
function identifier(source: Fields, field: string): string {
  const value = source[field];
  if (typeof value !== "string" || !IDENTIFIER.test(value)) throw invalid(field, "an ASCII letter followed by up to 63 ASCII letters, digits or _");
  return value;
}
function text(source: Fields, field: "title" | "body"): { title?: string } | { body?: string } {
  const value = source[field];
  if (value === undefined) return {};
  if (typeof value !== "string" || value === "") throw invalid(field, "a non-empty string");
  return { [field]: value };
}
function object(value: unknown, name: string): Fields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(name + " must be an object");
  return value as Fields;
}

/**
 * Validates the `convohop` object of a push against the push payload contract. Returns its known fields and ignores
 * fields the contract doesn't define for its type. Throws a `TypeError` for anything else.
 */
export function parsePushNotification(value: unknown): PushNotification {
  const source = object(value, "Push notification"), eventType = source.eventType;
  if (typeof eventType !== "string" || !types.has(eventType)) throw invalid("eventType", "a notification event type");
  const fields: PushNotificationFields = {
    eventId: uuid(source, "eventId"), occurredAt: timestamp(source, "occurredAt"), projectId: uuid(source, "projectId"),
    recipientId: uuid(source, "recipientId"), conversationId: uuid(source, "conversationId"), senderId: uuid(source, "senderId"),
    ...text(source, "title"), ...text(source, "body"),
  };
  if (eventType === "notification.message") return { ...fields, eventType, messageId: uuid(source, "messageId") };
  const call = { ...fields, liveSessionId: uuid(source, "liveSessionId"), alertId: uuid(source, "alertId"),
    expiresAt: timestamp(source, "expiresAt"), mediaProfile: identifier(source, "mediaProfile") };
  return eventType === "notification.call" ? { ...call, eventType }
    : { ...call, eventType: "notification.callCancelled", reason: identifier(source, "reason") };
}
/**
 * Finds and validates the notification in a push: a Web Push or APNs payload (`{ convohop: {...} }`), FCM data
 * (`{ convohop: "<json>" }`) or the `convohop` object itself.
 */
export function parsePushPayload(payload: unknown): PushNotification {
  const source = object(payload, "Push payload");
  if (source.convohop === undefined) return parsePushNotification(source);
  if (typeof source.convohop !== "string") return parsePushNotification(source.convohop);
  let parsed: unknown;
  try { parsed = JSON.parse(source.convohop); } catch { throw new TypeError("Push payload convohop must be JSON"); }
  return parsePushNotification(parsed);
}

/**
 * What to present for a push:
 * - `message`: a new message.
 * - `ring`: an incoming call that is still ringing.
 * - `stopRinging`: the call stopped ringing without being missed: it was answered or declined, on any device, or
 *   stopped for a reason this SDK doesn't know.
 * - `missedCall`: nobody answered: the call ended first or the ring expired.
 */
export type NotificationKind = "message" | "ring" | "stopRinging" | "missedCall";
export interface NotificationAction {
  kind: NotificationKind;
  notification: PushNotification;
  /**
   * A stable notification ID: the message ID for messages, and for calls the ring's collapse key (its `alertId`
   * without hyphens). Presenting a notification with the same tag replaces the earlier one.
   */
  tag: string;
  /** Whether this event was already handled. Delivery is at least once, so the same event can arrive again. */
  duplicate: boolean;
}

const eventLimit = 512, ringLimit = 512, stoppedMargin = 5 * 60000;
function missed(reason: string): boolean { return reason === "ended" || reason === "expired"; }
/**
 * Decides how to present pushes. It remembers recent events and stopped rings, so it recognizes duplicates and stops
 * a call whose cancellation arrived first. A service worker keeps this memory only while it runs.
 */
export class NotificationHandler {
  readonly #events = new Set<string>();
  readonly #stopped = new Map<string, { missed: boolean; until: number }>();
  /**
   * Validates a push, recognizes duplicates by `eventId`, and treats a call as stopped once a cancellation of its ring
   * arrived (in either order) or its `expiresAt` passed. Throws a `TypeError` for a payload that isn't a valid
   * notification. `now` is in milliseconds.
   */
  handle(payload: unknown, now = Date.now()): NotificationAction {
    const notification = parsePushPayload(payload);
    const duplicate = this.#events.has(notification.eventId);
    if (!duplicate) {
      this.#events.add(notification.eventId);
      if (this.#events.size > eventLimit) this.#events.delete(this.#events.values().next().value!);
    }
    if (notification.eventType === "notification.message") return { kind: "message", notification, tag: notification.messageId, duplicate };
    const tag = notification.alertId.replaceAll("-", ""), expiresAt = epochMs(notification.expiresAt)!;
    for (const [id, ring] of this.#stopped) if (ring.until <= now) this.#stopped.delete(id);
    if (notification.eventType === "notification.callCancelled") {
      const missedCall = missed(notification.reason) || this.#stopped.get(notification.alertId)?.missed === true;
      this.#stopped.delete(notification.alertId);
      this.#stopped.set(notification.alertId, { missed: missedCall, until: Math.max(expiresAt, now) + stoppedMargin });
      if (this.#stopped.size > ringLimit) this.#stopped.delete(this.#stopped.keys().next().value!);
      return { kind: missedCall ? "missedCall" : "stopRinging", notification, tag, duplicate };
    }
    const stopped = this.#stopped.get(notification.alertId);
    if (stopped) return { kind: stopped.missed ? "missedCall" : "stopRinging", notification, tag, duplicate };
    return { kind: expiresAt <= now ? "missedCall" : "ring", notification, tag, duplicate };
  }
}
const sharedHandler = new NotificationHandler();
/** {@link NotificationHandler.handle} with a handler shared by this module. */
export function handleNotification(payload: unknown, now?: number): NotificationAction {
  return sharedHandler.handle(payload, now);
}

// Web Push. These helpers use only types that both the DOM and WebWorker libraries define.

/** A notification to show with `ServiceWorkerRegistration.showNotification`. */
export interface WebNotification {
  title: string;
  options: NotificationOptions;
}
/**
 * The default presentation. It uses the title and body your backend set, with English fallback titles, and the
 * action's tag, so a duplicate or a stopped ring replaces its earlier notification. A ring stays until it is handled;
 * a ring that stopped without being missed is replaced silently.
 */
export function defaultWebNotification(action: NotificationAction): WebNotification {
  const { notification, tag } = action;
  const fallback = { message: "New message", ring: "Incoming call", stopRinging: "Call ended", missedCall: "Missed call" }[action.kind];
  const options: NotificationOptions = { tag, data: { convohop: notification },
    ...(notification.body === undefined ? {} : { body: notification.body }),
    ...(action.kind === "ring" ? { requireInteraction: true } : {}),
    ...(action.kind === "stopRinging" || action.duplicate ? { silent: true } : {}) };
  return { title: notification.title ?? fallback, options };
}
export interface WebPushHandlerOptions {
  /** Decides what to show. Default: the handler {@link handleNotification} uses. */
  handler?: NotificationHandler;
  /** Builds the notification to show. Default {@link defaultWebNotification}. */
  render?: (action: NotificationAction) => WebNotification;
}
/**
 * Shows the notification for a decrypted Web Push payload (`event.data.json()`) and returns the action taken.
 *
 * Browsers expect every push to show a notification: Safari revokes the subscription after a few pushes that don't,
 * and Chrome shows a generic one. So every action, including duplicates and stopped rings, shows or replaces one.
 */
export async function showPushNotification(registration: ServiceWorkerRegistration, payload: unknown,
  options: WebPushHandlerOptions = {}): Promise<NotificationAction> {
  const action = (options.handler ?? sharedHandler).handle(payload);
  const { title, options: shown } = (options.render ?? defaultWebNotification)(action);
  await registration.showNotification(title, shown);
  return action;
}
/** The parts of a service worker `push` event these helpers use. */
export interface WebPushEvent {
  readonly data: { json(): unknown } | null;
  waitUntil(promise: Promise<unknown>): void;
}
export interface WebPushEventOptions extends WebPushHandlerOptions {
  /**
   * Receives payloads that aren't ConvoHop notifications and failures to show them. The event waits for it, so it
   * can show a notification of its own: browsers expect one for every push.
   */
  onError?: (error: Error) => Promise<void> | void;
}
/**
 * Handles a service worker `push` event: `self.addEventListener("push", event => handlePushEvent(self.registration, event))`.
 */
export function handlePushEvent(registration: ServiceWorkerRegistration, event: WebPushEvent, options: WebPushEventOptions = {}): void {
  event.waitUntil((async () => {
    try {
      if (!event.data) throw new TypeError("Push event has no payload");
      await showPushNotification(registration, event.data.json(), options);
    } catch (error) {
      await options.onError?.(error instanceof Error ? error : new Error("Push notification failed"));
    }
  })());
}

/** The parts of a service worker `notificationclick` event these helpers use. */
export interface WebNotificationClickEvent {
  readonly notification: { readonly data: unknown; readonly tag: string; close(): void };
  readonly action?: string;
  waitUntil(promise: Promise<unknown>): void;
}
interface WindowClientLike { readonly url: string; focus(): Promise<unknown> }
/** The parts of a service worker's `clients` these helpers use. */
export interface WebClients {
  matchAll(options: { type: "window"; includeUncontrolled: boolean }): Promise<readonly WindowClientLike[]>;
  openWindow(url: string): Promise<unknown>;
}
/**
 * Handles a `notificationclick` for a ConvoHop notification: closes it, then focuses a window already showing `url`
 * or opens one. `url` maps the notification (and the clicked action, if any) to a same-origin URL of your app.
 * Returns whether the notification was a ConvoHop one.
 */
export function handleNotificationClick(clients: WebClients, event: WebNotificationClickEvent,
  url: (notification: PushNotification, action: string | undefined) => string): boolean {
  const data = event.notification.data;
  const source = typeof data === "object" && data !== null ? (data as Fields).convohop : undefined;
  if (source === undefined) return false;
  const notification = parsePushNotification(source);
  event.notification.close();
  const target = url(notification, event.action || undefined);
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find(client => client.url === target);
    if (open) await open.focus(); else await clients.openWindow(target);
  })());
  return true;
}

export interface WebPushSubscribeOptions {
  /** Your VAPID public key, as base64url or bytes. Your backend signs pushes with its private key. */
  applicationServerKey: string | Uint8Array;
  /**
   * Stores the subscription with your backend, for the signed-in user, so it can send pushes to this browser.
   * ConvoHop never sees subscriptions. Called on every subscribe, so your backend can refresh what it stored.
   */
  register: (subscription: PushSubscriptionJSON) => Promise<void> | void;
}
function keyBytes(key: string | Uint8Array): Uint8Array<ArrayBuffer> {
  if (key instanceof Uint8Array) return new Uint8Array(key);
  const base64 = typeof key === "string" ? key.replace(/=+$/, "").replaceAll("-", "+").replaceAll("_", "/") : "";
  if (!/^[A-Za-z0-9+/]+$/.test(base64) || base64.length % 4 === 1) throw new TypeError("applicationServerKey must be base64url");
  return Uint8Array.from(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)), character => character.charCodeAt(0));
}
function sameBytes(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.byteLength) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((byte, index) => byte === b[index]);
}
/**
 * Subscribes this browser to Web Push with your VAPID key and registers the subscription with your backend.
 * Reuses a subscription for the same key and replaces one made with another key. Call it from a user gesture:
 * subscribing asks for notification permission, and some browsers only ask from a gesture.
 */
export async function subscribePush(registration: ServiceWorkerRegistration, options: WebPushSubscribeOptions): Promise<PushSubscription> {
  const manager = registration.pushManager;
  if (!manager) throw new Error("This browser doesn't support Web Push");
  const key = keyBytes(options.applicationServerKey);
  let subscription = await manager.getSubscription();
  if (subscription && !sameBytes(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await manager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await options.register(subscription.toJSON());
  return subscription;
}
/**
 * Unsubscribes this browser and, first, lets your backend forget the subscription. Resolves whether a subscription
 * existed.
 */
export async function unsubscribePush(registration: ServiceWorkerRegistration,
  unregister?: (subscription: PushSubscriptionJSON) => Promise<void> | void): Promise<boolean> {
  const subscription = await registration.pushManager?.getSubscription();
  if (!subscription) return false;
  await unregister?.(subscription.toJSON());
  return subscription.unsubscribe();
}
