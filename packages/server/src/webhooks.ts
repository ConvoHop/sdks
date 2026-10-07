/**
 * Webhook event types the authority sends.
 *
 * @experimental Provisional until the ConvoHop webhook contract (ConvoHop/ConveHop#10) merges. The `notification.*`
 * types follow the provisional push payload contract in `spec/push-payload/`.
 */
export type WebhookEventType =
  | "conversation.created" | "conversation.updated"
  | "member.added" | "member.roleChanged" | "member.historyExpanded" | "member.removed" | "member.broadcastPermissionChanged"
  | "message.created" | "message.edited" | "message.deleted" | "receipt.reported"
  | "live.started" | "live.participationChanged" | "live.alerted" | "live.ready" | "live.connected" | "live.ended"
  | "webhook.endpointDisabled"
  | WebhookNotificationEventType;
/**
 * Per-recipient notification event types, for your push notifications: a message for the recipient, an incoming
 * call, and a call that stopped ringing for the recipient.
 *
 * @experimental Provisional: the contract is `spec/push-payload/`, and the authority doesn't send these events yet.
 */
export type WebhookNotificationEventType = "notification.message" | "notification.call" | "notification.callCancelled";

/** The metadata-only envelope every delivery carries. Fetch the resource through the API when you need its content. */
interface WebhookEnvelope {
  eventId: string; eventType: string; occurredAt: string; projectId: string;
  subjectRef: { id: string; kind: string };
}
/** @experimental Provisional until ConvoHop/ConveHop#10 merges. */
export interface WebhookResourceEvent extends WebhookEnvelope {
  known: true; eventType: Exclude<WebhookEventType, "webhook.endpointDisabled" | WebhookNotificationEventType>;
}
/** @experimental Provisional until ConvoHop/ConveHop#10 merges. */
export interface WebhookEndpointDisabledEvent extends WebhookEnvelope {
  known: true; eventType: "webhook.endpointDisabled"; subjectRef: { id: string; kind: "webhookEndpoint" };
}

/** A call's media profile. Unknown profiles pass through. */
export type WebhookCallMediaProfile = "AUDIO_ONLY" | "AUDIO_VIDEO" | (string & {});
/**
 * Why a call stopped ringing for the recipient. `answered` and `declined` (by the recipient, on any device) only stop
 * the ringing. `ended` (the call ended or stopped ringing before the recipient answered) and `expired` (nobody answered
 * by `expiresAt`) are missed calls. Treat an unknown reason as stop ringing, without a missed-call alert.
 */
export type WebhookCallCancelReason = "answered" | "declined" | "ended" | "expired" | (string & {});
/** The start of the message text. Present only when the project opts in to previews and the message has text. */
export interface WebhookNotificationPreview {
  /** 1 to 512 Unicode code points. */
  text: string;
  /** Whether the message text continues after `text`. */
  truncated: boolean;
}
/** Fields every notification event carries besides the envelope. */
interface WebhookNotificationFields extends WebhookEnvelope {
  known: true;
  /** The contract version. An event with another version is a `WebhookUnknownEvent`. */
  eventVersion: "1";
  /** The principal to notify. Each recipient gets its own event. */
  recipientId: string;
  conversationId: string;
  /** The principal who sent the message or started the ringing. */
  senderId: string;
  /**
   * Whether the recipient had an active realtime connection when the event was produced. It is a hint for your sending
   * policy: it isn't per device, and it can change before you send. The push builders ignore it.
   */
  connected: boolean;
}
/** @experimental Provisional: see `spec/push-payload/`. */
export interface WebhookMessageNotificationEvent extends WebhookNotificationFields {
  eventType: "notification.message"; subjectRef: { id: string; kind: "message" };
  messageId: string;
  preview?: WebhookNotificationPreview;
}
/** @experimental Provisional: see `spec/push-payload/`. */
export interface WebhookCallNotificationEvent extends WebhookNotificationFields {
  eventType: "notification.call"; subjectRef: { id: string; kind: "liveSession" };
  liveSessionId: string;
  /** This ring for this recipient. A later ring of the same call has a new `alertId`. */
  alertId: string;
  /** When the ringing stops (RFC 3339). */
  expiresAt: string;
  mediaProfile: WebhookCallMediaProfile;
}
/** @experimental Provisional: see `spec/push-payload/`. */
export interface WebhookCallCancelledNotificationEvent extends WebhookNotificationFields {
  eventType: "notification.callCancelled"; subjectRef: { id: string; kind: "liveSession" };
  liveSessionId: string;
  /** The `alertId` of the ring that stopped. */
  alertId: string;
  /** The stopped ring's original deadline (RFC 3339). */
  expiresAt: string;
  mediaProfile: WebhookCallMediaProfile;
  reason: WebhookCallCancelReason;
}
/**
 * A per-recipient notification event: the input of the push payload builders.
 *
 * @experimental Provisional: the contract is `spec/push-payload/`, and the authority doesn't send these events yet.
 */
export type WebhookNotificationEvent =
  | WebhookMessageNotificationEvent | WebhookCallNotificationEvent | WebhookCallCancelledNotificationEvent;

/**
 * An event this SDK does not know, including a `notification.*` event that doesn't match the push payload contract.
 * Acknowledge it; it never makes `verify()` throw.
 */
export interface WebhookUnknownEvent extends WebhookEnvelope { known: false }
/**
 * A verified delivery's event. Narrow on `known`, then on `eventType`.
 *
 * @experimental Provisional until ConvoHop/ConveHop#10 merges.
 */
export type WebhookEvent = WebhookResourceEvent | WebhookEndpointDisabledEvent | WebhookNotificationEvent | WebhookUnknownEvent;

/**
 * Why a delivery failed verification. Checks run in this order and stop at the first failure:
 * - `INVALID_SECRET`: no secret is given, or one is not `whsec_` followed by padded standard Base64 of 24 to 64 bytes.
 *   This is your configuration, not the sender.
 * - `MISSING_HEADER`: `webhook-id`, `webhook-timestamp` or `webhook-signature` is absent or empty.
 * - `INVALID_HEADER`: one of those headers is repeated.
 * - `INVALID_TIMESTAMP`: `webhook-timestamp` is not 1 to 15 ASCII digits (integer Unix seconds).
 * - `TIMESTAMP_EXPIRED`: the timestamp is more than `toleranceSeconds` before now.
 * - `TIMESTAMP_FUTURE`: the timestamp is more than `toleranceSeconds` after now.
 * - `BODY_TOO_LARGE`: the body exceeds 4096 bytes.
 * - `TOO_MANY_SIGNATURES`: `webhook-signature` has more than 8 entries.
 * - `NO_MATCHING_SIGNATURE`: no `v1` entry matches any secret.
 * - `INVALID_BODY`: `verify()` only; the signed body is not a UTF-8 JSON event envelope.
 */
export type WebhookVerificationCode =
  | "INVALID_SECRET" | "MISSING_HEADER" | "INVALID_HEADER" | "INVALID_TIMESTAMP" | "TIMESTAMP_EXPIRED"
  | "TIMESTAMP_FUTURE" | "BODY_TOO_LARGE" | "TOO_MANY_SIGNATURES" | "NO_MATCHING_SIGNATURE" | "INVALID_BODY";

/** A delivery that failed verification. The message never contains secrets, signatures or the body. */
export class WebhookVerificationError extends Error {
  constructor(readonly code: WebhookVerificationCode, message: string) {
    super(message); this.name = "WebhookVerificationError";
  }
}

/** A `Headers` object, or a record such as Node's `IncomingMessage.headers`. Names match case-insensitively. */
export type WebhookHeaders =
  | { get(name: string): string | null }
  | Readonly<Record<string, string | readonly string[] | undefined>>;

export interface WebhookVerifyOptions {
  headers: WebhookHeaders;
  /** The exact request body bytes, or their exact UTF-8 decoding. Never re-serialized JSON. */
  body: string | Uint8Array;
  /** The endpoint's `whsec_` secrets: the current one and, during a rotation, the next or replaced one. */
  secrets: string | readonly string[];
  /** Allowed distance between `webhook-timestamp` and `now`, in whole seconds, inclusive. Defaults to 300. */
  toleranceSeconds?: number;
  /** The verifier's clock. Defaults to the current time. */
  now?: Date;
}
/** A verified delivery's `webhook-id` and `webhook-timestamp` (Unix seconds). */
export interface WebhookSignature { webhookId: string; timestamp: number }
export interface WebhookDelivery extends WebhookSignature { event: WebhookEvent }

const BODY_LIMIT = 4096, SIGNATURE_LIMIT = 8, SIGNATURE_BYTES = 32, SECRET_PREFIX = "whsec_";
const SECRET_MIN_BYTES = 24, SECRET_MAX_BYTES = 64;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const resourceEventTypes: ReadonlySet<string> = new Set<WebhookResourceEvent["eventType"]>([
  "conversation.created", "conversation.updated",
  "member.added", "member.roleChanged", "member.historyExpanded", "member.removed", "member.broadcastPermissionChanged",
  "message.created", "message.edited", "message.deleted", "receipt.reported",
  "live.started", "live.participationChanged", "live.alerted", "live.ready", "live.connected", "live.ended",
]);
const notificationEventTypes: ReadonlySet<string> = new Set<WebhookNotificationEventType>([
  "notification.message", "notification.call", "notification.callCancelled",
]);

function failure(code: WebhookVerificationCode, message: string): WebhookVerificationError {
  return new WebhookVerificationError(code, message);
}
/** Strict padded standard Base64; non-canonical encodings are rejected so byte equality matches text equality. */
function base64Bytes(value: string): Uint8Array | undefined {
  if (!BASE64.test(value)) return undefined;
  const binary = atob(value);
  if (btoa(binary) !== value) return undefined;
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
function secretKeys(secrets: string | readonly string[]): Uint8Array[] {
  const list: readonly unknown[] = typeof secrets === "string" ? [secrets] : Array.isArray(secrets) ? secrets : [];
  if (!list.length) throw failure("INVALID_SECRET", "At least one webhook secret is required");
  return list.map(secret => {
    const key = typeof secret === "string" && secret.startsWith(SECRET_PREFIX)
      ? base64Bytes(secret.slice(SECRET_PREFIX.length)) : undefined;
    if (!key || key.length < SECRET_MIN_BYTES || key.length > SECRET_MAX_BYTES)
      throw failure("INVALID_SECRET", "A webhook secret must be whsec_ followed by padded standard Base64 of 24 to 64 bytes");
    return key;
  });
}
function header(headers: WebhookHeaders, name: string): string {
  let value: unknown;
  const get = (headers as { get?: unknown }).get;
  if (typeof get === "function") value = get.call(headers, name);
  else {
    const record = headers as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record).filter(key => key.toLowerCase() === name && record[key] !== undefined);
    if (keys.length > 1) throw failure("INVALID_HEADER", `Repeated ${name} header`);
    value = keys.length ? record[keys[0]!] : undefined;
    if (Array.isArray(value)) {
      if (value.length > 1) throw failure("INVALID_HEADER", `Repeated ${name} header`);
      value = value[0];
    }
  }
  if (typeof value !== "string" || value === "") throw failure("MISSING_HEADER", `Missing ${name} header`);
  return value;
}

async function signature(options: WebhookVerifyOptions): Promise<WebhookSignature & { body: Uint8Array }> {
  const tolerance = options.toleranceSeconds ?? 300;
  if (!Number.isSafeInteger(tolerance) || tolerance < 0) throw new RangeError("Webhook tolerance must be a non-negative integer");
  const now = options.now ?? new Date();
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError("Webhook clock must be a valid Date");
  const raw: unknown = options.body;
  if (typeof raw !== "string" && !(raw instanceof Uint8Array)) throw new TypeError("Webhook body must be a string or Uint8Array");
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new TypeError("Webhook verification requires Web Crypto (globalThis.crypto.subtle)");
  const keys = secretKeys(options.secrets);
  const webhookId = header(options.headers, "webhook-id"), stamp = header(options.headers, "webhook-timestamp");
  const entries = header(options.headers, "webhook-signature").split(" ").filter(entry => entry !== "");
  if (!/^[0-9]{1,15}$/.test(stamp)) throw failure("INVALID_TIMESTAMP", "webhook-timestamp must be integer Unix seconds");
  const timestamp = Number(stamp), age = Math.floor(now.getTime() / 1000) - timestamp;
  if (age > tolerance) throw failure("TIMESTAMP_EXPIRED", "webhook-timestamp is older than the tolerance");
  if (-age > tolerance) throw failure("TIMESTAMP_FUTURE", "webhook-timestamp is further ahead than the tolerance");
  // A string's UTF-8 encoding is at least as long as the string, so oversized strings are rejected before encoding.
  const body = typeof raw === "string" ? raw.length > BODY_LIMIT ? undefined : new TextEncoder().encode(raw) : raw;
  if (!body || body.length > BODY_LIMIT) throw failure("BODY_TOO_LARGE", `Webhook body exceeds ${BODY_LIMIT} bytes`);
  if (entries.length > SIGNATURE_LIMIT) throw failure("TOO_MANY_SIGNATURES", `webhook-signature has more than ${SIGNATURE_LIMIT} entries`);
  const offered = entries.flatMap(entry => {
    const comma = entry.indexOf(",");
    if (comma <= 0 || entry.slice(0, comma) !== "v1") return [];
    const bytes = base64Bytes(entry.slice(comma + 1));
    return bytes?.length === SIGNATURE_BYTES ? [bytes] : [];
  });
  const prefix = new TextEncoder().encode(`${webhookId}.${stamp}.`);
  const signed = new Uint8Array(prefix.length + body.length);
  signed.set(prefix);
  signed.set(body, prefix.length);
  for (const secret of keys) {
    const key = await subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    for (const candidate of offered)
      if (await subtle.verify("HMAC", key, candidate, signed)) return { webhookId, timestamp, body: signed.subarray(prefix.length) };
  }
  throw failure("NO_MATCHING_SIGNATURE", "No v1 webhook signature matches the configured secrets");
}

function text(record: Readonly<Record<string, unknown>>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || value === "") throw failure("INVALID_BODY", "Webhook body is not a ConvoHop event envelope");
  return value;
}
function resourceType(eventType: string): eventType is WebhookResourceEvent["eventType"] {
  return resourceEventTypes.has(eventType);
}
function envelopeRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw failure("INVALID_BODY", "Webhook body is not a ConvoHop event envelope");
  return value as Readonly<Record<string, unknown>>;
}
function event(body: Uint8Array): WebhookEvent {
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)); }
  catch { throw failure("INVALID_BODY", "Webhook body is not UTF-8 JSON"); }
  const envelope = envelopeRecord(value), subject = envelopeRecord(envelope.subjectRef);
  const eventType = text(envelope, "eventType"), id = text(subject, "id"), kind = text(subject, "kind");
  const fields = { eventId: text(envelope, "eventId"), occurredAt: text(envelope, "occurredAt"),
    projectId: text(envelope, "projectId") };
  if (resourceType(eventType)) return { ...fields, known: true, eventType, subjectRef: { id, kind } };
  if (eventType === "webhook.endpointDisabled" && kind === "webhookEndpoint")
    return { ...fields, known: true, eventType, subjectRef: { id, kind } };
  if (notificationEventTypes.has(eventType)) {
    const parsed = notificationEvent(envelope);
    if (typeof parsed !== "string") return parsed;
  }
  return { ...fields, known: false, eventType, subjectRef: { id, kind } };
}

// Notification events follow spec/push-payload/push-payload.schema.json. The checks below mirror that schema.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, NIL_UUID = "00000000-0000-0000-0000-000000000000";
const TIMESTAMP = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))$/;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,63}$/, LONE_SURROGATE = /[\uD800-\uDFFF]/u, PREVIEW_LIMIT = 512;

/**
 * Unix seconds of an RFC 3339 timestamp with an uppercase `T`, and `Z` or an offset, ignoring any fraction, or
 * `undefined` when the value isn't one. The date must exist, and second 60 isn't accepted.
 */
export function epochSeconds(value: string): number | undefined {
  const match = TIMESTAMP.exec(value);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    [1, 2, 3, 4, 5, 6, 8, 9].map(index => Number(match[index] ?? 0)) as [number, number, number, number, number, number, number, number];
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day
    || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second
    || offsetHour > 23 || offsetMinute > 59) return undefined;
  return date.getTime() / 1000 - (match[7] === "-" ? -1 : 1) * (offsetHour * 3600 + offsetMinute * 60);
}

class MalformedNotification { constructor(readonly problem: string) {} }
function need(condition: boolean, problem: string): asserts condition {
  if (!condition) throw new MalformedNotification(problem);
}
type Fields = Readonly<Record<string, unknown>>;
function asObject(value: unknown, field: string): Fields {
  need(typeof value === "object" && value !== null && !Array.isArray(value), `${field} must be an object`);
  return value as Fields;
}
function uuid(source: Fields, field: string): string {
  const value = source[field];
  need(typeof value === "string" && UUID.test(value) && value !== NIL_UUID, `${field} must be a lowercase, non-nil UUID`);
  return value;
}
function timestamp(source: Fields, field: string): string {
  const value = source[field];
  need(typeof value === "string" && epochSeconds(value) !== undefined, `${field} must be an RFC 3339 timestamp`);
  return value;
}
function identifier(source: Fields, field: string): string {
  const value = source[field];
  need(typeof value === "string" && IDENTIFIER.test(value), `${field} must be an ASCII letter followed by up to 63 ASCII letters, digits or _`);
  return value;
}
function flag(source: Fields, field: string): boolean {
  const value = source[field];
  need(typeof value === "boolean", `${field} must be a boolean`);
  return value;
}
function preview(value: unknown): WebhookNotificationPreview {
  const source = asObject(value, "preview"), text = source.text;
  need(typeof text === "string" && text !== "" && text.length <= 2 * PREVIEW_LIMIT && !LONE_SURROGATE.test(text)
    && Array.from(text).length <= PREVIEW_LIMIT, `preview.text must be 1 to ${PREVIEW_LIMIT} Unicode code points`);
  return { text, truncated: flag(source, "truncated") };
}
function subject(source: Fields, kind: "message" | "liveSession", id: string): void {
  const value = asObject(source.subjectRef, "subjectRef");
  need(value.kind === kind && value.id === id, `subjectRef must be the ${kind} the event names`);
}
function notification(value: unknown): WebhookNotificationEvent {
  const source = asObject(value, "event"), eventType = source.eventType;
  need(typeof eventType === "string" && notificationEventTypes.has(eventType), "eventType must be a notification event type");
  need(source.eventVersion === "1", "eventVersion must be \"1\"");
  const fields = { eventId: uuid(source, "eventId"), eventVersion: "1" as const, occurredAt: timestamp(source, "occurredAt"),
    projectId: uuid(source, "projectId"), known: true as const, recipientId: uuid(source, "recipientId"),
    conversationId: uuid(source, "conversationId"), senderId: uuid(source, "senderId"), connected: flag(source, "connected") };
  if (eventType === "notification.message") {
    const messageId = uuid(source, "messageId");
    subject(source, "message", messageId);
    return { ...fields, eventType, subjectRef: { id: messageId, kind: "message" }, messageId,
      ...(source.preview === undefined ? {} : { preview: preview(source.preview) }) };
  }
  const liveSessionId = uuid(source, "liveSessionId");
  subject(source, "liveSession", liveSessionId);
  const call = { ...fields, subjectRef: { id: liveSessionId, kind: "liveSession" as const }, liveSessionId,
    alertId: uuid(source, "alertId"), expiresAt: timestamp(source, "expiresAt"), mediaProfile: identifier(source, "mediaProfile") };
  return eventType === "notification.call" ? { ...call, eventType }
    : { ...call, eventType: "notification.callCancelled", reason: identifier(source, "reason") };
}
/**
 * Validates a notification event against the push payload contract and returns its known fields, or a problem that
 * names the first invalid field without echoing values. Ignores fields the contract doesn't define.
 */
export function notificationEvent(value: unknown): WebhookNotificationEvent | string {
  try { return notification(value); }
  catch (error) {
    if (error instanceof MalformedNotification) return error.problem;
    throw error;
  }
}

/**
 * Verifies ConvoHop webhook deliveries (Standard Webhooks symmetric `v1`) with Web Crypto. Pass the raw body; respond
 * `2xx` within 5 s, then process; de-duplicate on `webhook-id`. Failures throw `WebhookVerificationError`.
 */
export const webhooks = Object.freeze({
  /** Verifies the signature and timestamp, then parses the metadata-only event. */
  async verify(options: WebhookVerifyOptions): Promise<WebhookDelivery> {
    const { body, ...verified } = await signature(options);
    return { ...verified, event: event(body) };
  },
  /** Verifies only the signature and timestamp, for bodies you parse yourself. */
  async verifySignature(options: WebhookVerifyOptions): Promise<WebhookSignature> {
    const { webhookId, timestamp } = await signature(options);
    return { webhookId, timestamp };
  },
});
