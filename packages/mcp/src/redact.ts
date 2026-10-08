/** The value that replaces a credential, secret or signed proof in tool results and errors. */
export const REDACTED = "[REDACTED]";

/**
 * Result fields that carry a bearer credential, a secret or a signed proof. Wherever they appear in a result, their
 * non-null values read REDACTED, so an agent never receives them.
 */
export const redactedFields: readonly string[] = Object.freeze([
  "admissionTicket", "backendKey", "connectToken", "forwardingLease", "secret", "sessionToken", "signedProof",
  "transportToken",
]);
const fields = new Set(redactedFields);

function scrub(text: string, secrets: readonly string[]): string {
  return secrets.reduce((value, secret) => (secret ? value.split(secret).join(REDACTED) : value), text);
}

/** A copy of value with redactedFields and every occurrence of the given secret strings replaced by REDACTED. */
export function redactObject(value: object, secrets: readonly string[] = []): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, fields.has(key) && item !== null && item !== undefined ? REDACTED : redact(item, secrets)]));
}

/** Like redactObject, for any JSON value. */
export function redact(value: unknown, secrets: readonly string[] = []): unknown {
  if (typeof value === "string") return scrub(value, secrets);
  if (Array.isArray(value)) return value.map(item => redact(item, secrets));
  if (value !== null && typeof value === "object") return redactObject(value, secrets);
  return value;
}
