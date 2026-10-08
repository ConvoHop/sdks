// Generates spec/push-payload/vectors.json by running the @convohop/server push builders over the
// definitions below. conformance/test/push.test.mjs checks every expected request against rules
// written independently of the builders (lifetimes, which builders apply, truncation), so the
// vectors don't merely restate the implementation. Run `npm run generate:conformance`, which
// builds the server first, and commit its output.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { push } from "@convohop/server";

export const PUSH_SCHEMA_FILE = fileURLToPath(new URL("../../spec/push-payload/push-payload.schema.json", import.meta.url));
export const PUSH_VECTOR_FILE = fileURLToPath(new URL("../../spec/push-payload/vectors.json", import.meta.url));
export const PUSH_BUILDERS = Object.freeze(["apnsAlert", "apnsVoip", "fcm", "webPush"]);
/** Each builder's limit in canonical bytes of the part `measuredPart` selects. */
export const PUSH_LIMITS = Object.freeze({ apnsAlert: 4096, apnsVoip: 5120, fcm: 4096, webPush: 3993 });
export const measuredPart = Object.freeze({
  apnsAlert: request => request.payload,
  apnsVoip: request => request.payload,
  fcm: request => request.message.data,
  webPush: request => request.payload,
});
/** UTF-8 bytes of the compact JSON.stringify serialization: the contract's canonical size. */
export const canonicalBytes = value => Buffer.byteLength(JSON.stringify(value), "utf8");
export const ELLIPSIS = "\u2026";

/** The visible title and body of a request. */
export function requestText(builder, request) {
  const source = builder === "apnsAlert" ? request.payload.aps.alert
    : builder === "fcm" ? JSON.parse(request.message.data.convohop) : request.payload.convohop;
  return { title: source.title, body: source.body };
}
/** A copy of a request with the given visible text, to measure alternatives the builder didn't choose. */
export function withText(builder, request, text) {
  const copy = structuredClone(request);
  const target = builder === "apnsAlert" ? copy.payload.aps.alert
    : builder === "fcm" ? JSON.parse(copy.message.data.convohop) : copy.payload.convohop;
  for (const field of ["title", "body"]) if (text[field] !== undefined) target[field] = text[field];
  if (builder === "apnsAlert" && text.body !== undefined) delete target["loc-key"];
  if (builder === "fcm") copy.message.data.convohop = JSON.stringify(target);
  return copy;
}

const NOW = 1791633600; // 2026-10-10T12:00:00Z
const DAY = 86_400;
const BUNDLE_ID = "com.example.chat";
const PROJECT = "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d";
const CONVERSATION = "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c";
const RECIPIENT = "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c";
const SENDER = "c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a";
const MESSAGE = "d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d";
const LIVE_SESSION = "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b";
// One ring. The cancellations stop this ring, so they collapse with the incoming call.
const ALERT = "f0e1d2c3-b4a5-4968-8776-655443322110";
const NIL = "00000000-0000-0000-0000-000000000000";
const TITLE = "Ada Lovelace", CALLER = "Grace Hopper";
const GROUP = "Ada Lovelace, Charles Babbage, Grace Hopper, Alan Turing and Katherine Johnson";
const PREVIEW = Object.freeze({ text: "Are we still on for 3pm?", truncated: false });
const NAMES = { apnsAlert: "APNs alert", apnsVoip: "APNs VoIP", fcm: "FCM data", webPush: "Web Push" };
const SLUGS = { apnsAlert: "apns-alert", apnsVoip: "apns-voip", fcm: "fcm", webPush: "web-push" };

const iso = seconds => new Date(seconds * 1000).toISOString().replace(".000Z", "Z");
/** A stable lowercase version-4-format UUID per name, so adding a vector doesn't change the others. */
function uuidFor(name) {
  const hex = createHash("sha256").update(`convohop push vector ${name}`).digest("hex");
  const variant = (8 | (Number.parseInt(hex[16], 16) & 3)).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
// Events list their fields in the schema's order.
function message(name, { occurredAt = iso(NOW - 5), connected = false, preview } = {}) {
  return {
    eventId: uuidFor(name), eventType: "notification.message", occurredAt, projectId: PROJECT,
    subjectRef: { id: MESSAGE, kind: "message" }, recipientId: RECIPIENT, conversationId: CONVERSATION, senderId: SENDER,
    connected, messageId: MESSAGE, ...(preview === undefined ? {} : { preview }),
  };
}
function call(name, { occurredAt = iso(NOW - 2), expiresAt = iso(NOW + 45), mediaProfile = "AUDIO_VIDEO" } = {}) {
  return {
    eventId: uuidFor(name), eventType: "notification.call", occurredAt, projectId: PROJECT,
    subjectRef: { id: LIVE_SESSION, kind: "liveSession" }, recipientId: RECIPIENT, conversationId: CONVERSATION,
    senderId: SENDER, connected: false, liveSessionId: LIVE_SESSION, alertId: ALERT, expiresAt, mediaProfile,
  };
}
function cancelled(name, reason, options = {}) {
  return { ...call(name, { occurredAt: iso(NOW - 1), expiresAt: iso(NOW + 30), ...options }),
    eventType: "notification.callCancelled", reason };
}
const without = (event, field) => Object.fromEntries(Object.entries(event).filter(([key]) => key !== field));

const build = (builder, event, options) => push[builder](event, { bundleId: BUNDLE_ID, ...options, now: new Date(NOW * 1000) });
const measure = (builder, request) => canonicalBytes(measuredPart[builder](request));
/** The size of `builder`'s request for `event` without the body: the size with a one-byte body, less one. */
const overhead = (builder, event, options) => measure(builder, build(builder, event, { ...options, body: "a" })) - 1;
/** An ASCII body that makes `builder`'s request `extra` bytes longer than its limit. */
const asciiBody = (builder, event, options, extra) => "a".repeat(PUSH_LIMITS[builder] - overhead(builder, event, options) + extra);
/**
 * A body that `builder` must truncate leaving `slack` bytes unused: ASCII padding, then more of the multibyte `char`
 * than fit. Cutting bytes instead of code points, or keeping less than the longest prefix, gives another result.
 */
function multibyteBody(builder, event, options, char, slack) {
  const width = Buffer.byteLength(char);
  const room = PUSH_LIMITS[builder] - overhead(builder, event, options) - Buffer.byteLength(ELLIPSIS);
  let pad = 4;
  while ((room - pad) % width !== slack) pad++;
  return "x".repeat(pad) + char.repeat(Math.ceil(room / width) + 8);
}

function boundary(builder, extra) {
  const id = `boundary-${SLUGS[builder]}-${extra ? "over" : "exact"}`;
  const event = builder === "apnsVoip" ? call(id) : message(id);
  const options = { title: builder === "apnsVoip" ? CALLER : TITLE };
  const body = asciiBody(builder, event, options, extra);
  return {
    id, event, options: { ...options, body },
    title: extra ? `One byte over the ${NAMES[builder]} limit: the body becomes its longest prefix that fits, plus …`
      : `A body that makes the ${NAMES[builder]} payload exactly ${PUSH_LIMITS[builder]} bytes is kept whole`,
    intent: vector => {
      assert.equal(vector.expected[builder].bytes, PUSH_LIMITS[builder]);
      assert.equal(requestText(builder, vector.expected[builder].request).body,
        extra ? `${body.slice(0, -4)}${ELLIPSIS}` : body);
    },
  };
}
function multibyte(id, char, slack) {
  const event = message(id), options = { title: TITLE };
  return {
    id, event, options: { ...options, body: multibyteBody("apnsAlert", event, options, char, slack) },
    title: `Truncation keeps whole code points: ${slack} byte${slack === 1 ? "" : "s"} of the APNs alert stay unused before a ${Buffer.byteLength(char)}-byte ${char}`,
    intent: vector => assert.equal(vector.expected.apnsAlert.bytes, PUSH_LIMITS.apnsAlert - slack),
  };
}
const bodies = vector => Object.fromEntries(PUSH_BUILDERS.flatMap(builder =>
  vector.expected[builder] ? [[builder, requestText(builder, vector.expected[builder].request).body]] : []));

const DEFINITIONS = [
  {
    id: "message-metadata-only",
    title: "A message without title, body or preview: the alert uses the CONVOHOP_MESSAGE loc-key",
    event: message("message-metadata-only"),
  },
  {
    id: "message-title",
    title: "A title, with the loc-key in place of a body",
    event: message("message-title"),
    options: { title: TITLE },
  },
  {
    id: "message-preview",
    title: "The opted-in preview becomes the body; connected and unknown fields don't change the requests",
    event: message("message-preview", { connected: true, preview: PREVIEW }),
    unknownFields: { alertId: ALERT, locale: "fr-FR", futureField: { nested: [1, true, null] } },
    options: { title: TITLE },
  },
  {
    id: "message-preview-truncated",
    title: "The preview of longer message text ends with …",
    event: message("message-preview-truncated", {
      preview: { text: "I found the bug: the retry loop reuses the request ID but", truncated: true },
    }),
    options: { title: TITLE },
  },
  {
    id: "message-preview-disabled",
    title: "preview: false keeps the requests metadata-only",
    event: message("message-preview-disabled", { preview: PREVIEW }),
    options: { title: TITLE, preview: false },
  },
  {
    id: "message-body-option",
    title: "The body option replaces the preview",
    event: message("message-body-option", { preview: PREVIEW }),
    options: { title: TITLE, body: "New message" },
  },
  {
    id: "message-empty-options",
    title: "An empty title or body is the same as none",
    event: message("message-empty-options", { preview: PREVIEW }),
    options: { title: "", body: "" },
  },
  {
    id: "message-escapes",
    title: "Canonical JSON escapes only the quotation mark, reverse solidus and U+0000 to U+001F",
    event: message("message-escapes", {
      preview: { text: "Line 1\nTab\there \"quoted\" \\ \u0001 </script> & \u00e9 \u4e16\u754c \u{1f44b} \u2028 \u007f", truncated: false },
    }),
    options: { title: "\"Ada\" <ada@example.com> & co \\o/" },
  },
  {
    id: "message-stale",
    title: "A message a day old is stale: every builder returns null",
    event: message("message-stale", { occurredAt: iso(NOW - DAY) }),
  },
  {
    id: "message-last-second",
    title: "A message one second short of a day old lives one more second",
    event: message("message-last-second", { occurredAt: iso(NOW - DAY + 1) }),
  },
  {
    id: "message-offset-fraction",
    title: "Offsets apply and fractions are dropped, never rounded",
    event: message("message-offset-fraction", { occurredAt: "2026-10-10T17:29:59.999999999+05:30" }),
  },
  {
    id: "message-longest-preview",
    title: "The longest preview fits every platform with a short title",
    event: message("message-longest-preview", { preview: { text: "\u{1f44b}".repeat(512), truncated: true } }),
    options: { title: TITLE },
    intent: vector => {
      for (const body of Object.values(bodies(vector))) assert.equal(body, `${"\u{1f44b}".repeat(512)}${ELLIPSIS}`);
    },
  },
  {
    id: "message-escaped-preview",
    title: "Escapes count: FCM's doubly encoded data truncates a preview the other platforms keep whole",
    event: message("message-escaped-preview", { preview: { text: "\u0001".repeat(512), truncated: false } }),
    options: { title: GROUP },
    intent: vector => {
      const { apnsAlert, fcm, webPush } = bodies(vector);
      assert.equal(apnsAlert, "\u0001".repeat(512));
      assert.equal(webPush, "\u0001".repeat(512));
      assert.match(fcm, /^\u0001+\u2026$/u);
      assert.ok(fcm.length - 1 < 512);
    },
  },
  {
    id: "call-incoming",
    title: "An incoming call: every platform, collapsing on the alertId; unknown fields don't change the requests",
    event: call("call-incoming"),
    unknownFields: { preview: { text: "Calls have no preview", truncated: false }, ringtone: "classic" },
    options: { title: CALLER },
  },
  {
    id: "call-metadata-only",
    title: "An audio call without a title: the alert uses the CONVOHOP_CALL loc-key; expiresAt has an offset",
    event: call("call-metadata-only", { expiresAt: "2026-10-10T09:00:45-03:00", mediaProfile: "AUDIO_ONLY" }),
  },
  {
    id: "call-future-media-profile",
    title: "A media profile this version doesn't know passes through",
    event: call("call-future-media-profile", { mediaProfile: "SCREEN_SHARE" }),
    options: { title: CALLER },
  },
  {
    id: "call-stale",
    title: "A ring at its expiresAt is stale: every builder returns null",
    event: call("call-stale", { expiresAt: iso(NOW) }),
  },
  {
    id: "call-lifetime-cap",
    title: "Lifetimes are capped at 28 days",
    event: call("call-lifetime-cap", { expiresAt: iso(NOW + 40 * DAY) }),
  },
  {
    id: "cancel-expired",
    title: "Nobody answered: a missed call, whose alert replaces the incoming-call alert",
    event: cancelled("cancel-expired", "expired", { occurredAt: iso(NOW - 1), expiresAt: iso(NOW - 1) }),
  },
  {
    id: "cancel-ended",
    title: "The call stopped ringing before the recipient answered: a missed call",
    event: cancelled("cancel-ended", "ended"),
    options: { title: CALLER },
  },
  {
    id: "cancel-answered",
    title: "Answered on another device: stop ringing until expiresAt, without an APNs alert",
    event: cancelled("cancel-answered", "answered"),
    options: { title: CALLER },
  },
  {
    id: "cancel-declined-stale",
    title: "A cancellation that isn't a missed call is stale after the ring's expiresAt",
    event: cancelled("cancel-declined-stale", "declined", { expiresAt: iso(NOW - 10) }),
  },
  {
    id: "cancel-expired-stale",
    title: "A missed call a day old is stale",
    event: cancelled("cancel-expired-stale", "expired", { occurredAt: iso(NOW - DAY), expiresAt: iso(NOW - DAY) }),
  },
  {
    id: "cancel-future-reason",
    title: "A reason this version doesn't know stops the ringing without a missed call",
    event: cancelled("cancel-future-reason", "transferred", { expiresAt: iso(NOW + 20) }),
  },
  ...PUSH_BUILDERS.flatMap(builder => [boundary(builder, 0), boundary(builder, 1)]),
  multibyte("truncate-emoji", "\u{1f44b}", 2),
  multibyte("truncate-accent", "\u00e9", 1),
  {
    id: "truncate-title",
    title: "A title too long for the payload: the body becomes … and then the title is truncated",
    event: message("truncate-title"),
    options: { title: "T".repeat(5000), body: "b".repeat(100) },
    intent: vector => {
      for (const builder of ["apnsAlert", "fcm", "webPush"]) {
        const { title, body } = requestText(builder, vector.expected[builder].request);
        assert.equal(body, ELLIPSIS);
        assert.match(title, /^T+\u2026$/u);
      }
    },
  },
];

const INVALID_EVENTS = [
  {
    id: "subject-kind-mismatch",
    title: "subjectRef.kind must match the event type",
    event: { ...message("subject-kind-mismatch"), subjectRef: { id: MESSAGE, kind: "liveSession" } },
  },
  {
    id: "subject-id-mismatch",
    title: "subjectRef.id must name the event's message, which JSON Schema can't express",
    event: { ...message("subject-id-mismatch"), subjectRef: { id: CONVERSATION, kind: "message" } },
    schemaValid: true,
  },
  {
    id: "preview-null",
    title: "A missing preview is omitted, never null",
    event: { ...message("preview-null"), preview: null },
  },
  {
    id: "preview-empty",
    title: "preview.text has at least one code point",
    event: message("preview-empty", { preview: { text: "", truncated: false } }),
  },
  {
    id: "preview-too-long",
    title: "preview.text has at most 512 code points",
    event: message("preview-too-long", { preview: { text: "\u{1f44b}".repeat(513), truncated: true } }),
  },
  {
    id: "preview-without-truncated",
    title: "preview.truncated is required",
    event: message("preview-without-truncated", { preview: { text: "Hi" } }),
  },
  {
    id: "uuid-uppercase",
    title: "UUIDs are lowercase",
    event: { ...message("uuid-uppercase"), recipientId: RECIPIENT.toUpperCase() },
  },
  {
    id: "uuid-nil",
    title: "The nil UUID names nobody",
    event: { ...message("uuid-nil"), senderId: NIL },
  },
  {
    id: "connected-missing",
    title: "connected is required",
    event: without(message("connected-missing"), "connected"),
  },
  {
    id: "connected-string",
    title: "connected is a boolean, not a string",
    event: { ...message("connected-string"), connected: "false" },
  },
  {
    id: "timestamp-february-30",
    title: "Timestamps name dates that exist",
    event: message("timestamp-february-30", { occurredAt: "2026-02-30T12:00:00Z" }),
  },
  {
    id: "timestamp-2100-february-29",
    title: "2100 isn't a leap year",
    event: call("timestamp-2100-february-29", { expiresAt: "2100-02-29T12:00:00Z" }),
  },
  {
    id: "timestamp-lowercase",
    title: "T and Z are uppercase",
    event: message("timestamp-lowercase", { occurredAt: "2026-10-10t11:59:55z" }),
  },
  {
    id: "timestamp-leap-second",
    title: "Second 60 isn't accepted",
    event: message("timestamp-leap-second", { occurredAt: "2026-12-31T23:59:60Z" }),
  },
  {
    id: "timestamp-ten-fraction-digits",
    title: "Timestamps have at most nine fraction digits",
    event: call("timestamp-ten-fraction-digits", { occurredAt: "2026-10-10T11:59:58.0000000001Z" }),
  },
  {
    id: "media-profile-hyphen",
    title: "Open enumeration values are an ASCII letter followed by ASCII letters, digits or underscores",
    event: call("media-profile-hyphen", { mediaProfile: "audio-only" }),
  },
  {
    id: "call-without-expires-at",
    title: "A call has an expiresAt",
    event: without(call("call-without-expires-at"), "expiresAt"),
  },
  {
    id: "cancel-without-reason",
    title: "A cancellation has a reason",
    event: without(cancelled("cancel-without-reason", "expired"), "reason"),
  },
  {
    id: "unknown-notification-type",
    title: "A notification event type the contract doesn't define",
    event: { ...message("unknown-notification-type"), eventType: "notification.reaction" },
  },
];

function vector({ id, title, event, unknownFields, options = {}, intent }) {
  if (unknownFields) assert.ok(Object.keys(unknownFields).every(key => !Object.hasOwn(event, key)), `${id}: unknownFields overlap the event`);
  const expected = Object.fromEntries(PUSH_BUILDERS.map(builder => {
    const request = build(builder, event, options);
    return [builder, request === null ? null : { request, bytes: measure(builder, request) }];
  }));
  const result = { id, title, event, ...(unknownFields === undefined ? {} : { unknownFields }),
    options: { bundleId: BUNDLE_ID, ...options }, nowSeconds: NOW, expected };
  try { intent?.(result); }
  catch (error) { throw new Error(`Vector ${id} doesn't show what its title says`, { cause: error }); }
  return result;
}

export function buildPushVectors() {
  return {
    description: "Generated by conformance/lib/push-vectors.mjs from the @convohop/server push builders; do not edit by hand. Provisional: see README.md.",
    status: "provisional",
    vectors: DEFINITIONS.map(vector),
    invalidEvents: INVALID_EVENTS.map(({ id, title, event, schemaValid = false }) => ({ id, title, event, schemaValid })),
  };
}

export const serializePushVectors = document => `${JSON.stringify(document, null, 2)}\n`;

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const text = serializePushVectors(buildPushVectors());
  if (process.argv.includes("--write")) {
    await mkdir(dirname(PUSH_VECTOR_FILE), { recursive: true });
    await writeFile(PUSH_VECTOR_FILE, text);
    process.stdout.write(`wrote ${PUSH_VECTOR_FILE}\n`);
  } else {
    process.stdout.write(text);
  }
}
