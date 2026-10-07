// Reference implementation of the webhook signature scheme in spec/conformance/webhook-signatures.md
// (Standard Webhooks: HMAC-SHA256 over "<id>.<timestamp>.<payload>"). Used to generate and
// self-check the shared vectors; SDKs implement their own verifier and are tested through drivers.
import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_CODES = Object.freeze(["WEBHOOK_HEADERS_MISSING", "WEBHOOK_TIMESTAMP_INVALID",
  "WEBHOOK_TIMESTAMP_EXPIRED", "WEBHOOK_TIMESTAMP_FUTURE", "WEBHOOK_SIGNATURE_INVALID"]);
const HEADERS = ["webhook-id", "webhook-timestamp", "webhook-signature"];

export function secretKey(secret) {
  return Buffer.from(secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret, "base64");
}

/** Returns the base64 HMAC-SHA256 signature (without the "v1," prefix). */
export function sign({ id, timestamp, payload, secret }) {
  return createHmac("sha256", secretKey(secret)).update(`${id}.${timestamp}.${payload}`, "utf8").digest("base64");
}

function header(headers, name) {
  const matches = Object.entries(headers).filter(([key]) => key.toLowerCase() === name);
  return matches.length === 1 && typeof matches[0][1] === "string" && matches[0][1] !== "" ? matches[0][1] : undefined;
}

function equal(left, right) {
  const a = Buffer.from(left, "utf8"), b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Verifies a delivery; `payload` is the raw request body exactly as received. */
export function verify({ payload, headers, secrets, nowSeconds, toleranceSeconds }) {
  const [id, timestamp, signatures] = HEADERS.map(name => header(headers, name));
  if (id === undefined || timestamp === undefined || signatures === undefined) return { valid: false, code: "WEBHOOK_HEADERS_MISSING" };
  if (!/^[0-9]{1,15}$/.test(timestamp)) return { valid: false, code: "WEBHOOK_TIMESTAMP_INVALID" };
  const age = nowSeconds - Number(timestamp);
  if (age > toleranceSeconds) return { valid: false, code: "WEBHOOK_TIMESTAMP_EXPIRED" };
  if (-age > toleranceSeconds) return { valid: false, code: "WEBHOOK_TIMESTAMP_FUTURE" };
  const candidates = signatures.split(" ").filter(Boolean).flatMap(entry => {
    const comma = entry.indexOf(",");
    return comma > 0 && entry.slice(0, comma) === "v1" ? [entry.slice(comma + 1)] : [];
  });
  const expected = secrets.map(secret => sign({ id, timestamp, payload, secret }));
  const valid = candidates.some(candidate => expected.some(signature => equal(candidate, signature)));
  return valid ? { valid: true, code: null } : { valid: false, code: "WEBHOOK_SIGNATURE_INVALID" };
}
