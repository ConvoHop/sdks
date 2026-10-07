/**
 * Webhook event types the authority sends.
 *
 * @experimental Provisional until the ConvoHop webhook contract (ConvoHop/ConveHop#10) merges.
 */
export type WebhookEventType =
  | "conversation.created" | "conversation.updated"
  | "member.added" | "member.roleChanged" | "member.historyExpanded" | "member.removed" | "member.broadcastPermissionChanged"
  | "message.created" | "message.edited" | "message.deleted" | "receipt.reported"
  | "live.started" | "live.participationChanged" | "live.alerted" | "live.ready" | "live.connected" | "live.ended"
  | "webhook.endpointDisabled";

/** The metadata-only envelope every delivery carries. Fetch the resource through the API when you need its content. */
interface WebhookEnvelope {
  eventId: string; eventType: string; occurredAt: string; projectId: string;
  subjectRef: { id: string; kind: string };
}
/** @experimental Provisional until ConvoHop/ConveHop#10 merges. */
export interface WebhookResourceEvent extends WebhookEnvelope {
  known: true; eventType: Exclude<WebhookEventType, "webhook.endpointDisabled">;
}
/** @experimental Provisional until ConvoHop/ConveHop#10 merges. */
export interface WebhookEndpointDisabledEvent extends WebhookEnvelope {
  known: true; eventType: "webhook.endpointDisabled"; subjectRef: { id: string; kind: "webhookEndpoint" };
}
/** An event this SDK does not know. Acknowledge it; it never makes `verify()` throw. */
export interface WebhookUnknownEvent extends WebhookEnvelope { known: false }
/**
 * A verified delivery's event. Narrow on `known`, then on `eventType`.
 *
 * @experimental Provisional until ConvoHop/ConveHop#10 merges.
 */
export type WebhookEvent = WebhookResourceEvent | WebhookEndpointDisabledEvent | WebhookUnknownEvent;

/**
 * Why a delivery failed verification. Checks run in this order and stop at the first failure:
 * - `INVALID_SECRET`: no secret is given, or one is not `whsec_` followed by padded standard Base64 of 1 to 64 bytes.
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
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const eventTypes: ReadonlySet<string> = new Set<WebhookEventType>([
  "conversation.created", "conversation.updated",
  "member.added", "member.roleChanged", "member.historyExpanded", "member.removed", "member.broadcastPermissionChanged",
  "message.created", "message.edited", "message.deleted", "receipt.reported",
  "live.started", "live.participationChanged", "live.alerted", "live.ready", "live.connected", "live.ended",
  "webhook.endpointDisabled",
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
    if (!key?.length || key.length > 64)
      throw failure("INVALID_SECRET", "A webhook secret must be whsec_ followed by padded standard Base64 of 1 to 64 bytes");
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
function knownType(eventType: string): eventType is WebhookEventType { return eventTypes.has(eventType); }
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
  if (knownType(eventType)) {
    if (eventType !== "webhook.endpointDisabled") return { ...fields, known: true, eventType, subjectRef: { id, kind } };
    if (kind === "webhookEndpoint") return { ...fields, known: true, eventType, subjectRef: { id, kind } };
  }
  return { ...fields, known: false, eventType, subjectRef: { id, kind } };
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
