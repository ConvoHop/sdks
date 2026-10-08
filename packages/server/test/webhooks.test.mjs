import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { WebhookVerificationError, webhooks } from "@convohop/server";

const shared = JSON.parse(readFileSync(new URL("../../../spec/conformance/vectors/webhooks.json", import.meta.url), "utf8"));
/** Shared conformance codes, mapped to this verifier's reason codes. */
const sharedCodes = { WEBHOOK_SIGNATURE_INVALID: "NO_MATCHING_SIGNATURE", WEBHOOK_TIMESTAMP_EXPIRED: "TIMESTAMP_EXPIRED",
  WEBHOOK_TIMESTAMP_FUTURE: "TIMESTAMP_FUTURE", WEBHOOK_TIMESTAMP_INVALID: "INVALID_TIMESTAMP",
  WEBHOOK_HEADERS_MISSING: "MISSING_HEADER" };
/** The event types in the webhook contract (ConvoHop/ConveHop docs/webhooks.md, "Events"). */
const contractEventTypes = [
  "conversation.created", "conversation.updated",
  "member.added", "member.roleChanged", "member.historyExpanded", "member.removed", "member.broadcastPermissionChanged",
  "message.created", "message.edited", "message.deleted", "receipt.reported",
  "live.started", "live.participationChanged", "live.alerted", "live.ready", "live.connected", "live.ended",
  "webhook.endpointDisabled",
];

const newSecret = (bytes = 32) => `whsec_${randomBytes(bytes).toString("base64")}`;
/** Signs independently of the SDK: HMAC-SHA256 over `{id}.{timestamp}.{body}` bytes. */
function sign(secret, id, timestamp, body) {
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  return `v1,${createHmac("sha256", key).update(Buffer.concat([Buffer.from(`${id}.${timestamp}.`), Buffer.from(body)]))
    .digest("base64")}`;
}

const now = new Date("2026-10-10T12:00:00.000Z"), timestamp = now.getTime() / 1000, webhookId = randomUUID();
const current = newSecret(), next = newSecret(), replaced = newSecret();
function envelope(fields = {}) {
  return { eventId: randomUUID(), eventType: "message.created", occurredAt: now.toISOString(),
    projectId: randomUUID(), subjectRef: { id: randomUUID(), kind: "message" }, ...fields };
}
function delivery(body, { secrets = current, signers = [current], id = webhookId, at = timestamp } = {}) {
  return { body, secrets, now, headers: { "webhook-id": id, "webhook-timestamp": String(at),
    "webhook-signature": signers.map(secret => sign(secret, id, at, body)).join(" ") } };
}
async function rejects(promise, code) {
  await assert.rejects(promise, error => {
    assert.ok(error instanceof WebhookVerificationError, String(error));
    assert.equal(error.name, "WebhookVerificationError");
    assert.equal(error.code, code, error.message);
    return true;
  }, code);
}

test("the contract's test vector verifies, and its body is not a ConvoHop event", async () => {
  const vector = { secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw", id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
    timestamp: "1614265330", body: '{"test": 2432232314}', signature: "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=" };
  assert.equal(sign(vector.secret, vector.id, vector.timestamp, vector.body), vector.signature);
  const options = { body: vector.body, secrets: vector.secret, now: new Date(1614265330 * 1000),
    headers: { "webhook-id": vector.id, "webhook-timestamp": vector.timestamp, "webhook-signature": vector.signature } };
  const expected = { webhookId: vector.id, timestamp: 1614265330 };
  assert.deepEqual(await webhooks.verifySignature(options), expected);
  assert.deepEqual(await webhooks.verifySignature({ ...options, body: new TextEncoder().encode(vector.body) }), expected);
  await rejects(webhooks.verify(options), "INVALID_BODY");
  await rejects(webhooks.verifySignature({ ...options, now: undefined }), "TIMESTAMP_EXPIRED");
});

test("the shared conformance vectors give the same verdicts", async () => {
  assert.equal(shared.scheme, "standard-webhooks-v1");
  assert.ok(shared.vectors.length > 0);
  for (const vector of shared.vectors) {
    const value = name => Object.entries(vector.headers).find(([header]) => header.toLowerCase() === name)?.[1];
    const result = webhooks.verifySignature({ headers: vector.headers, body: vector.payload, secrets: vector.secrets,
      toleranceSeconds: vector.toleranceSeconds, now: new Date(vector.nowSeconds * 1000) });
    if (vector.expected.valid) {
      assert.deepEqual(await result, { webhookId: value("webhook-id"), timestamp: Number(value("webhook-timestamp")) }, vector.id);
    } else {
      assert.ok(sharedCodes[vector.expected.code], `${vector.id}: unmapped ${vector.expected.code}`);
      await rejects(result, sharedCodes[vector.expected.code]);
    }
  }
});

test("a verified delivery returns its id, timestamp and metadata-only event", async () => {
  const event = envelope();
  assert.deepEqual(await webhooks.verify(delivery(JSON.stringify(event))), { webhookId, timestamp, event: {
    known: true, eventId: event.eventId, eventType: "message.created", occurredAt: event.occurredAt,
    projectId: event.projectId, subjectRef: event.subjectRef } });
  for (const eventType of contractEventTypes) {
    const kind = eventType === "webhook.endpointDisabled" ? "webhookEndpoint" : eventType.split(".")[0];
    const verified = await webhooks.verify(delivery(JSON.stringify(envelope({ eventType, subjectRef: { id: randomUUID(), kind } }))));
    assert.deepEqual([verified.event.known, verified.event.eventType, verified.event.subjectRef.kind], [true, eventType, kind]);
  }
});

test("unknown event types and fields pass through and never throw", async () => {
  const unknown = await webhooks.verify(delivery(JSON.stringify(envelope({ eventType: "message.reacted", extra: { a: 1 } }))));
  assert.deepEqual([unknown.event.known, unknown.event.eventType], [false, "message.reacted"]);
  assert.equal(Object.hasOwn(unknown.event, "extra"), false);
  const misfiled = await webhooks.verify(delivery(JSON.stringify(envelope({ eventType: "webhook.endpointDisabled",
    subjectRef: { id: randomUUID(), kind: "conversation" } }))));
  assert.deepEqual([misfiled.event.known, misfiled.event.subjectRef.kind], [false, "conversation"]);
});

/** A notification event under the push payload contract (spec/push-payload/). */
function notification(eventType, fields = {}) {
  const common = { eventId: randomUUID(), eventType, occurredAt: now.toISOString(), projectId: randomUUID(),
    recipientId: randomUUID(), conversationId: randomUUID(), senderId: randomUUID(), connected: false };
  if (eventType === "notification.message") {
    const messageId = randomUUID();
    return { ...common, subjectRef: { id: messageId, kind: "message" }, messageId, ...fields };
  }
  const liveSessionId = randomUUID();
  return { ...common, subjectRef: { id: liveSessionId, kind: "liveSession" }, liveSessionId, alertId: randomUUID(),
    expiresAt: new Date(now.getTime() + 45_000).toISOString(), mediaProfile: "AUDIO_VIDEO",
    ...eventType === "notification.callCancelled" ? { reason: "answered" } : {}, ...fields };
}

test("notification events verify as known events with only their contract fields", async () => {
  const events = [notification("notification.message"),
    notification("notification.message", { connected: true, preview: { text: "Grüße, 世界 👋", truncated: true } }),
    notification("notification.message", { preview: { text: "👋".repeat(512), truncated: false } }),
    notification("notification.call"), notification("notification.call", { mediaProfile: "AUDIO_ONLY", connected: true }),
    ...["answered", "declined", "ended", "expired"].map(reason => notification("notification.callCancelled", { reason })),
    // Media profiles and cancel reasons are open enumerations.
    notification("notification.callCancelled", { mediaProfile: "SCREEN_SHARE", reason: "transferred" }),
    notification("notification.call", { occurredAt: "2026-10-10T13:59:59.123456789+02:00", expiresAt: "2028-02-29T00:00:00Z" })];
  for (const event of events) {
    const verified = await webhooks.verify(delivery(JSON.stringify({ ...event, addedLater: { nested: [1] }, subjectRef: {
      ...event.subjectRef, label: "ignored" } })));
    assert.deepEqual(verified, { webhookId, timestamp, event: { ...event, known: true } }, event.eventType);
  }
});

test("the largest notification event fits in a webhook body", async () => {
  const largest = notification("notification.message", { occurredAt: "2026-10-10T23:59:59.999999999-23:59",
    preview: { text: "\u0001".repeat(512), truncated: false } });
  const body = JSON.stringify(largest);
  assert.ok(Buffer.byteLength(body) <= 4096, String(Buffer.byteLength(body)));
  assert.deepEqual((await webhooks.verify(delivery(body))).event, { ...largest, known: true });
});

test("notification events that break the push payload contract verify as unknown events", async () => {
  const message = notification("notification.message"), call = notification("notification.call");
  const cancelled = notification("notification.callCancelled");
  const { reason: _reason, ...reasonless } = cancelled;
  const malformed = [{ ...message, subjectRef: { id: randomUUID(), kind: "message" } },
    { ...message, subjectRef: { id: message.messageId, kind: "liveSession" } },
    { ...call, subjectRef: { id: call.liveSessionId, kind: "message" } },
    { ...message, recipientId: message.recipientId.toUpperCase() },
    { ...message, senderId: "00000000-0000-0000-0000-000000000000" }, { ...message, conversationId: undefined },
    { ...message, connected: "false" }, { ...message, preview: null }, { ...message, preview: { text: "hi" } },
    { ...message, preview: { text: "", truncated: false } }, { ...message, preview: { text: "x".repeat(513), truncated: true } },
    { ...message, preview: { text: "a\uD800", truncated: false } },
    { ...message, occurredAt: "2026-10-10t12:00:00z" }, { ...message, occurredAt: "2026-02-29T00:00:00Z" },
    { ...message, occurredAt: "2026-10-10T12:00:00.1234567890Z" }, { ...call, expiresAt: "2026-10-10T23:59:60Z" },
    { ...call, mediaProfile: "audio-video" }, { ...call, mediaProfile: `A${"b".repeat(64)}` }, { ...call, alertId: undefined },
    { ...cancelled, reason: "" }, reasonless, { ...call, eventType: "notification.callCancelled" }];
  for (const event of malformed) {
    const verified = await webhooks.verify(delivery(JSON.stringify(event)));
    assert.deepEqual(verified.event, { known: false, eventId: event.eventId, eventType: event.eventType,
      occurredAt: event.occurredAt, projectId: event.projectId, subjectRef: event.subjectRef }, JSON.stringify(event));
  }
  // The envelope rules still apply first.
  for (const event of [{ ...message, subjectRef: { id: message.messageId } }, { ...call, projectId: "" }])
    await rejects(webhooks.verify(delivery(JSON.stringify(event))), "INVALID_BODY");
});

test("tampering with the body, id or timestamp fails the signature", async () => {
  const body = JSON.stringify(envelope()), signed = delivery(body);
  const withHeader = (name, value) => ({ ...signed, headers: { ...signed.headers, [name]: value } });
  await rejects(webhooks.verify({ ...signed, body: body.replace("message.created", "message.deleted") }), "NO_MATCHING_SIGNATURE");
  // The same JSON value, re-serialized, is a different body.
  await rejects(webhooks.verify({ ...signed, body: JSON.stringify(JSON.parse(body), null, 1) }), "NO_MATCHING_SIGNATURE");
  await rejects(webhooks.verify(withHeader("webhook-id", randomUUID())), "NO_MATCHING_SIGNATURE");
  await rejects(webhooks.verify(withHeader("webhook-timestamp", String(timestamp + 1))), "NO_MATCHING_SIGNATURE");
  // The signed timestamp is the header text, not its numeric value.
  await rejects(webhooks.verify(withHeader("webhook-timestamp", `0${timestamp}`)), "NO_MATCHING_SIGNATURE");
  await rejects(webhooks.verify({ ...signed, secrets: newSecret() }), "NO_MATCHING_SIGNATURE");
});

test("timestamps pass within the tolerance, inclusive, and fail outside it with a direction", async () => {
  const body = JSON.stringify(envelope());
  for (const [offset, code] of [[-300], [300], [-301, "TIMESTAMP_EXPIRED"], [301, "TIMESTAMP_FUTURE"]]) {
    const options = delivery(body, { at: timestamp + offset });
    if (code) await rejects(webhooks.verify(options), code);
    else assert.equal((await webhooks.verify(options)).timestamp, timestamp + offset);
  }
  // The clock is compared in whole seconds.
  assert.ok(await webhooks.verify({ ...delivery(body, { at: timestamp - 300 }), now: new Date(now.getTime() + 999) }));
  assert.ok(await webhooks.verify({ ...delivery(body), toleranceSeconds: 0 }));
  await rejects(webhooks.verify({ ...delivery(body, { at: timestamp - 1 }), toleranceSeconds: 0 }), "TIMESTAMP_EXPIRED");
  assert.ok(await webhooks.verify({ ...delivery(body, { at: timestamp + 3600 }), toleranceSeconds: 3600 }));
  const fresh = Math.floor(Date.now() / 1000), { now: _clock, ...live } = delivery(body, { at: fresh });
  assert.equal((await webhooks.verify(live)).timestamp, fresh);
  // Timestamps are checked before signatures.
  await rejects(webhooks.verify({ ...delivery(body, { at: timestamp - 301 }), secrets: newSecret() }), "TIMESTAMP_EXPIRED");
  const signed = delivery(body);
  for (const stamp of ["-1", "1.5", "1e9", " 1", "0x10", "1234567890123456", "１２３"])
    await rejects(webhooks.verify({ ...signed, headers: { ...signed.headers, "webhook-timestamp": stamp } }), "INVALID_TIMESTAMP");
});

test("during a rotation any held secret verifies, whatever order the entries arrive in", async () => {
  const body = JSON.stringify(envelope());
  // The sender signs with the current secret, then the next one (at most 5 minutes) or the replaced one (24 hours).
  for (const signers of [[current, next], [current, replaced], [current, next, replaced]]) {
    for (const held of signers) assert.equal((await webhooks.verify(delivery(body, { signers, secrets: held }))).webhookId, webhookId);
    assert.ok(await webhooks.verify(delivery(body, { signers, secrets: [newSecret(), signers.at(-1)] })));
    await rejects(webhooks.verify(delivery(body, { signers, secrets: [newSecret(), newSecret()] })), "NO_MATCHING_SIGNATURE");
  }
});

test("non-v1 and malformed entries are ignored; more than 8 entries are rejected", async () => {
  const body = JSON.stringify(envelope()), signed = delivery(body), valid = signed.headers["webhook-signature"];
  const mac = valid.slice("v1,".length), short = Buffer.alloc(16).toString("base64");
  const ignored = [`v2,${mac}`, `V1,${mac}`, `v1a,${mac}`, `,${mac}`, mac, "v1", "v1,", "v1,not*base64",
    `v1,${mac.slice(0, -1)}`, `v1,${mac}x`, `v1,${short}`];
  const withSignature = value => ({ ...signed, headers: { ...signed.headers, "webhook-signature": value } });
  for (const entry of ignored) await rejects(webhooks.verify(withSignature(entry)), "NO_MATCHING_SIGNATURE");
  assert.ok(await webhooks.verify(withSignature([...ignored.slice(0, 7), valid].join(" "))));
  assert.ok(await webhooks.verify(withSignature(`  ${valid}  ${ignored[0]} `)));
  await rejects(webhooks.verify(withSignature([...ignored.slice(0, 8), valid].join(" "))), "TOO_MANY_SIGNATURES");
  await rejects(webhooks.verify(withSignature(Array(9).fill(valid).join(" "))), "TOO_MANY_SIGNATURES");
});

test("header names match case-insensitively; missing, empty or repeated headers are rejected", async () => {
  const body = JSON.stringify(envelope()), signed = delivery(body), { headers } = signed;
  const mixed = { "Webhook-Id": headers["webhook-id"], "WEBHOOK-TIMESTAMP": headers["webhook-timestamp"],
    "webhook-Signature": headers["webhook-signature"] };
  const verified = await webhooks.verify(signed);
  assert.deepEqual(await webhooks.verify({ ...signed, headers: mixed }), verified);
  assert.deepEqual(await webhooks.verify({ ...signed, headers: new Headers(mixed) }), verified);
  // Node's IncomingMessage.headers lower-cases names; a single value may arrive as a one-element array.
  assert.deepEqual(await webhooks.verify({ ...signed, headers: { ...headers, "webhook-id": [headers["webhook-id"]] } }), verified);
  await rejects(webhooks.verify({ ...signed, headers: { ...headers, "Webhook-Id": headers["webhook-id"] } }), "INVALID_HEADER");
  await rejects(webhooks.verify({ ...signed, headers: { ...headers,
    "webhook-signature": [headers["webhook-signature"], headers["webhook-signature"]] } }), "INVALID_HEADER");
  for (const name of Object.keys(headers)) {
    const { [name]: _removed, ...rest } = headers, without = new Headers(headers);
    without.delete(name);
    for (const value of [rest, without, { ...headers, [name]: "" }, { ...headers, [name]: undefined }, { ...headers, [name]: [] }])
      await rejects(webhooks.verify({ ...signed, headers: value }), "MISSING_HEADER");
  }
});

test("string and Uint8Array bodies are verified as the same bytes", async () => {
  const body = JSON.stringify(envelope({ note: "Grüße, 世界 👋" })), bytes = new TextEncoder().encode(body);
  const signed = delivery(body), verified = await webhooks.verify(signed);
  assert.deepEqual(await webhooks.verify({ ...signed, body: bytes }), verified);
  assert.deepEqual(await webhooks.verify({ ...signed, body: Buffer.from(bytes) }), verified);
  const framed = new Uint8Array(bytes.length + 8);
  framed.set(bytes, 4);
  assert.deepEqual(await webhooks.verify({ ...signed, body: framed.subarray(4, 4 + bytes.length) }), verified);
  await rejects(webhooks.verify({ ...signed, body: Buffer.from(bytes).toString("latin1") }), "NO_MATCHING_SIGNATURE");
  // Correctly signed bytes that are not UTF-8 pass the signature check but are not an event.
  const invalid = delivery(Uint8Array.of(0x7b, 0xff, 0x7d));
  assert.deepEqual(await webhooks.verifySignature(invalid), { webhookId, timestamp });
  await rejects(webhooks.verify(invalid), "INVALID_BODY");
});

test("bodies over 4096 bytes and bodies that are not event envelopes are rejected", async () => {
  const sized = bytes => {
    const base = JSON.stringify(envelope({ pad: "" }));
    return base.replace('"pad":""', `"pad":"${"x".repeat(bytes - base.length)}"`);
  };
  const limit = sized(4096), over = sized(4097);
  assert.equal(Buffer.byteLength(limit), 4096);
  assert.ok(await webhooks.verify(delivery(limit)));
  await rejects(webhooks.verify(delivery(over)), "BODY_TOO_LARGE");
  await rejects(webhooks.verify(delivery(Buffer.from(over))), "BODY_TOO_LARGE");
  const wide = JSON.stringify(envelope({ pad: "é".repeat(2100) }));
  assert.ok(wide.length <= 4096 && Buffer.byteLength(wide) > 4096);
  await rejects(webhooks.verify(delivery(wide)), "BODY_TOO_LARGE");
  for (const body of ["not json", "[]", "null", '"text"', JSON.stringify(envelope({ subjectRef: null })),
    JSON.stringify(envelope({ subjectRef: { id: randomUUID() } })), JSON.stringify(envelope({ eventId: "" })),
    JSON.stringify(envelope({ eventType: 7 })), JSON.stringify(envelope({ projectId: undefined }))]) {
    assert.ok(await webhooks.verifySignature(delivery(body)), body);
    await rejects(webhooks.verify(delivery(body)), "INVALID_BODY");
  }
});

test("malformed secrets are configuration errors, reported before the delivery is read", async () => {
  const body = JSON.stringify(envelope()), encoded = current.slice("whsec_".length);
  // A 32-byte secret's Base64 ends in one pad character, and the character before it has two zero low bits.
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const nonCanonical = `whsec_${encoded.slice(0, -2)}${alphabet[alphabet.indexOf(encoded.at(-2)) | 1]}=`;
  assert.deepEqual(Buffer.from(nonCanonical.slice("whsec_".length), "base64"), Buffer.from(encoded, "base64"));
  for (const secrets of [[], undefined, {}, "", "whsec_", encoded, "whsec_not*base64", "whsec_YQ", "whsec_YR==", nonCanonical,
    current.slice(0, -1), ` ${current}`, `${current} `, `WHSEC_${encoded}`, ...[1, 13, 23, 65].map(bytes => newSecret(bytes)),
    [current, "whsec_"], [current, 7]])
    await rejects(webhooks.verify({ ...delivery(body), secrets }), "INVALID_SECRET");
  await rejects(webhooks.verify({ headers: {}, body, secrets: "whsec_", now }), "INVALID_SECRET");
  // Standard Webhooks secrets are 24 to 64 bytes; ConvoHop issues 32-byte secrets.
  for (const bytes of [24, 32, 64]) {
    const secret = newSecret(bytes);
    assert.ok(await webhooks.verify(delivery(body, { secrets: secret, signers: [secret] })), String(bytes));
  }
});

test("failures never echo secrets, signatures or the body", async () => {
  const marker = "body-marker-7d1c", body = JSON.stringify(envelope({ eventId: "", note: marker })), signed = delivery(body);
  const secretText = current.slice("whsec_".length), mac = signed.headers["webhook-signature"].slice("v1,".length);
  const errors = [];
  for (const options of [signed, { ...signed, secrets: newSecret() }, { ...signed, secrets: `whsec_${secretText}!` },
    { ...signed, headers: { ...signed.headers, "webhook-signature": Array(9).fill(`v1,${mac}`).join(" ") } },
    { ...signed, headers: { ...signed.headers, "webhook-timestamp": `${timestamp}${marker}` } }]) {
    errors.push(await webhooks.verify(options).then(() => assert.fail("expected a failure"), error => error));
  }
  assert.deepEqual(errors.map(error => error.code),
    ["INVALID_BODY", "NO_MATCHING_SIGNATURE", "INVALID_SECRET", "TOO_MANY_SIGNATURES", "INVALID_TIMESTAMP"]);
  for (const error of errors)
    for (const secret of [secretText, mac, marker]) assert.equal(error.message.includes(secret), false, error.code);
});

test("invalid arguments throw RangeError or TypeError, not verification failures", async () => {
  const options = delivery(JSON.stringify(envelope()));
  for (const toleranceSeconds of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "300"])
    await assert.rejects(webhooks.verify({ ...options, toleranceSeconds }), RangeError);
  for (const clock of [new Date(Number.NaN), now.getTime(), now.toISOString()])
    await assert.rejects(webhooks.verify({ ...options, now: clock }), TypeError);
  for (const body of [undefined, null, 7, new ArrayBuffer(4), [123]])
    await assert.rejects(webhooks.verify({ ...options, body }), TypeError);
  assert.ok(Object.isFrozen(webhooks));
});
