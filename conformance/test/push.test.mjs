// Checks the shared push payload vectors in spec/push-payload/: the committed file is the generator
// output and matches the schema, the @convohop/server builders and webhook verifier reproduce it,
// and every expected request follows spec/push-payload/README.md. The rules below are written from
// the README without the builders, so the vectors don't merely restate the implementation.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, describe, test } from "node:test";
import { PushPayloadError, push, webhooks } from "@convohop/server";
import { compileDefinition, compileSchema, formatErrors } from "../lib/json-schema.mjs";
import {
  ELLIPSIS, PUSH_BUILDERS, PUSH_LIMITS, PUSH_SCHEMA_FILE, PUSH_VECTOR_FILE, buildPushVectors, canonicalBytes, measuredPart,
  requestText, serializePushVectors, withText,
} from "../lib/push-vectors.mjs";
import { sign } from "../lib/webhooks.mjs";

const DAY = 86_400, MAX_LIFETIME = 28 * DAY;
const SECRET = `whsec_${Buffer.alloc(32, 0x5a).toString("base64")}`;

// Timestamps, with civil-calendar arithmetic instead of Date.
const TIMESTAMP = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))$/;
/** Days from 1970-01-01 to a proleptic Gregorian date (Howard Hinnant's days_from_civil). */
function civilDays(year, month, day) {
  const shifted = month <= 2 ? year - 1 : year, era = Math.floor(shifted / 400), yearOfEra = shifted - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  return era * 146_097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear - 719_468;
}
/** Unix seconds of a contract timestamp without its fraction, or `undefined` when the value isn't one. */
function unixSeconds(value) {
  const match = TIMESTAMP.exec(value);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const [offsetHour, offsetMinute] = [Number(match[8] ?? 0), Number(match[9] ?? 0)];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (monthDays === undefined || day < 1 || day > monthDays || hour > 23 || minute > 59 || second > 59
    || offsetHour > 23 || offsetMinute > 59) return undefined;
  const offset = (match[7] === "-" ? -1 : 1) * (offsetHour * 3600 + offsetMinute * 60);
  return civilDays(year, month, day) * DAY + hour * 3600 + minute * 60 + second - offset;
}

// The README's rules.
const isMessage = event => event.eventType === "notification.message";
const missedCall = event => event.eventType === "notification.callCancelled" && ["ended", "expired"].includes(event.reason);
const SERVES = {
  apnsAlert: event => event.eventType !== "notification.callCancelled" || missedCall(event),
  apnsVoip: event => event.eventType === "notification.call",
  fcm: () => true,
  webPush: () => true,
};
const LOC_KEYS = {
  "notification.message": "CONVOHOP_MESSAGE", "notification.call": "CONVOHOP_CALL",
  "notification.callCancelled": "CONVOHOP_MISSED_CALL",
};
/** Unix seconds until which the event is relevant: a day for messages and missed calls, otherwise the ring's end. */
const deadline = event => isMessage(event) || missedCall(event) ? unixSeconds(event.occurredAt) + DAY : unixSeconds(event.expiresAt);
/** Whole seconds from the clock until the deadline, at most 28 days; the event is stale when this isn't positive. */
const lifetime = (event, nowSeconds) => Math.min(deadline(event) - nowSeconds, MAX_LIFETIME);
const collapseKey = event => isMessage(event) ? undefined : event.alertId.replaceAll("-", "");
/** The title and body before truncation. */
function intendedText(event, options) {
  const preview = isMessage(event) && options.preview !== false ? event.preview : undefined;
  return { title: options.title || undefined,
    body: options.body || (preview ? preview.text + (preview.truncated ? ELLIPSIS : "") : undefined) };
}
const optional = (name, value) => value === undefined ? {} : { [name]: value };
/** The event without eventVersion, subjectRef, connected and preview. */
function metadata(event) {
  const { eventVersion, subjectRef, connected, preview, ...fields } = event;
  return fields;
}
/** The request the README describes for an event, a clock and the text the request shows. */
function describedRequest(builder, vector, text) {
  const { event, options, nowSeconds } = vector, ttl = lifetime(event, nowSeconds), collapse = collapseKey(event);
  const visible = { ...metadata(event), ...optional("title", text.title), ...optional("body", text.body) };
  const apnsHeaders = (type, topic) => ({ "apns-push-type": type, "apns-topic": topic, "apns-priority": "10",
    "apns-expiration": String(nowSeconds + ttl), ...(type === "alert" ? optional("apns-collapse-id", collapse) : {}) });
  switch (builder) {
    case "apnsAlert": return { headers: apnsHeaders("alert", options.bundleId), payload: {
      aps: { alert: { ...optional("title", text.title), ...(text.body === undefined ? { "loc-key": LOC_KEYS[event.eventType] } : { body: text.body }) },
        sound: "default", "mutable-content": 1, "thread-id": event.conversationId },
      convohop: metadata(event),
    } };
    case "apnsVoip": return { headers: apnsHeaders("voip", `${options.bundleId}.voip`), payload: { convohop: visible } };
    case "fcm": return { message: { data: { convohop: visible },
      android: { priority: "HIGH", ttl: `${ttl}s`, ...optional("collapse_key", collapse) } } };
    case "webPush": return { headers: { TTL: String(ttl), Urgency: isMessage(event) ? "normal" : "high", ...optional("Topic", collapse) },
      payload: { convohop: visible } };
    default: throw new Error(`Unknown builder ${builder}`);
  }
}
/** A request with FCM's `data.convohop` parsed: the contract compares it after parsing. */
const comparable = (builder, request) => builder !== "fcm" || request === null ? request
  : { message: { ...request.message, data: { convohop: JSON.parse(request.message.data.convohop) } } };
const measure = (builder, request) => canonicalBytes(measuredPart[builder](request));

/**
 * Checks that the request shows the intended text, or text truncated as the README says: the body, and then the title,
 * becomes its longest code-point prefix that fits followed by …, or … alone. Returns the truncated fields.
 */
function checkTruncation(builder, request, intended, actual, id) {
  const limit = PUSH_LIMITS[builder], over = text => measure(builder, withText(builder, request, text)) > limit;
  const truncated = [];
  for (const field of ["body", "title"]) {
    if (actual[field] === intended[field]) continue;
    const message = `${id} ${builder}: ${field} truncation`;
    // The body is shortened with the full title; the title only after the body is down to …
    const context = field === "body" ? { title: intended.title } : { body: actual.body };
    if (field === "title" && intended.body !== undefined) assert.equal(actual.body, ELLIPSIS, message);
    assert.ok(intended[field] !== undefined && typeof actual[field] === "string" && actual[field].endsWith(ELLIPSIS), message);
    const points = Array.from(intended[field]), kept = Array.from(actual[field].slice(0, -ELLIPSIS.length));
    assert.ok(kept.length < points.length, message);
    assert.deepEqual(kept, points.slice(0, kept.length), `${message} keeps whole code points of the start`);
    assert.ok(over({ ...context, [field]: intended[field] }), `${message} of text that fits`);
    if (kept.length + 1 < points.length)
      assert.ok(over({ ...context, [field]: points.slice(0, kept.length + 1).join("") + ELLIPSIS }), `${message} isn't the longest prefix`);
    truncated.push(field);
  }
  return truncated;
}
/** Checks a vector's expected request for a builder against the README. Returns what it shows, or null. */
function checkExpected(vector, builder) {
  const { event, options, nowSeconds, id } = vector, expected = vector.expected[builder], ttl = lifetime(event, nowSeconds);
  if (!SERVES[builder](event) || ttl <= 0) {
    assert.equal(expected, null, `${id} ${builder}: no request`);
    return null;
  }
  assert.notEqual(expected, null, `${id} ${builder}: a request`);
  const { request, bytes } = expected, limit = PUSH_LIMITS[builder];
  assert.equal(bytes, measure(builder, request), `${id} ${builder}: bytes`);
  assert.ok(bytes <= limit, `${id} ${builder}: within the limit`);
  const intended = intendedText(event, options), shown = requestText(builder, request);
  const truncated = checkTruncation(builder, request, intended, shown, id);
  assert.deepEqual(comparable(builder, request), describedRequest(builder, vector, shown), `${id} ${builder}: request`);
  return { ttl, bytes, truncated, fullBytes: measure(builder, withText(builder, request, intended)) };
}

const clock = vector => ({ ...vector.options, now: new Date(vector.nowSeconds * 1000) });
const rejectsEvent = error => error instanceof PushPayloadError && error.code === "INVALID_EVENT";
/** The event as webhooks.verify() returns it from a delivery signed with the fixture secret. */
async function delivered(event, nowSeconds) {
  const body = JSON.stringify(event), id = event.eventId, timestamp = String(nowSeconds);
  const headers = { "webhook-id": id, "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${sign({ id, timestamp, payload: body, secret: SECRET })}` };
  return (await webhooks.verify({ headers, body, secrets: SECRET, now: new Date(nowSeconds * 1000) })).event;
}

let schema, document, vectors;
before(async () => {
  schema = JSON.parse(await readFile(PUSH_SCHEMA_FILE, "utf8"));
  document = JSON.parse(await readFile(PUSH_VECTOR_FILE, "utf8"));
  vectors = document.vectors;
});

describe("push payload vectors", () => {
  test("the committed file is the generator output (npm run generate:conformance)", async () => {
    assert.equal(await readFile(PUSH_VECTOR_FILE, "utf8"), serializePushVectors(buildPushVectors()));
  });

  test("the file, events and requests match the schema", () => {
    assert.equal(formatErrors(compileDefinition(schema, "vectors")(document)), "");
    const event = compileSchema(schema), data = compileDefinition(schema, "data");
    const requests = Object.fromEntries(PUSH_BUILDERS.map(builder => [builder, compileDefinition(schema, builder)]));
    for (const vector of vectors) {
      assert.equal(formatErrors(event(vector.event)), "", vector.id);
      // Unknown fields are ones the contract doesn't define for the event's type, so the root schema rejects them.
      if (vector.unknownFields) assert.notEqual(event({ ...vector.event, ...vector.unknownFields }).length, 0, vector.id);
      for (const builder of PUSH_BUILDERS) {
        const request = vector.expected[builder]?.request;
        if (!request) continue;
        assert.equal(formatErrors(requests[builder](request)), "", `${vector.id} ${builder}`);
        if (builder !== "fcm") continue;
        const json = request.message.data.convohop;
        assert.equal(formatErrors(data(JSON.parse(json))), "", `${vector.id} fcm data`);
        assert.equal(JSON.stringify(JSON.parse(json)), json, `${vector.id}: FCM data is canonical JSON`);
      }
    }
  });

  test("every expected request follows the README's rules", () => {
    for (const vector of vectors) for (const builder of PUSH_BUILDERS) checkExpected(vector, builder);
  });

  test("the @convohop/server builders return every expected request, with or without unknown fields", () => {
    for (const vector of vectors) for (const builder of PUSH_BUILDERS) {
      const expected = comparable(builder, vector.expected[builder]?.request ?? null);
      for (const event of [vector.event, { ...vector.event, ...vector.unknownFields }])
        assert.deepEqual(comparable(builder, push[builder](event, clock(vector))), expected, `${vector.id} ${builder}`);
    }
  });

  test("webhooks.verify() returns exactly each event's contract fields, which build the same requests", async () => {
    for (const vector of vectors) {
      const event = await delivered({ ...vector.event, ...vector.unknownFields }, vector.nowSeconds);
      assert.deepEqual(event, { ...vector.event, known: true }, vector.id);
      for (const builder of PUSH_BUILDERS)
        assert.deepEqual(comparable(builder, push[builder](event, clock(vector))),
          comparable(builder, vector.expected[builder]?.request ?? null), `${vector.id} ${builder}`);
    }
  });

  test("builders reject every invalid event, which the schema rejects unless schemaValid", () => {
    const event = compileSchema(schema), options = { bundleId: vectors[0].options.bundleId, now: clock(vectors[0]).now };
    for (const invalid of document.invalidEvents) {
      assert.equal(event(invalid.event).length === 0, invalid.schemaValid, invalid.id);
      for (const builder of PUSH_BUILDERS) assert.throws(() => push[builder](invalid.event, options), rejectsEvent, `${invalid.id} ${builder}`);
    }
  });

  test("webhooks.verify() returns every invalid event as an unknown event", async () => {
    for (const { id, event } of document.invalidEvents) {
      const { eventId, eventType, occurredAt, projectId, subjectRef } = event;
      assert.deepEqual(await delivered(event, vectors[0].nowSeconds),
        { eventId, occurredAt, projectId, known: false, eventType, subjectRef }, id);
    }
  });

  test("cover each event type, lifetime edge, limit and truncation", () => {
    const results = vectors.flatMap(vector => PUSH_BUILDERS.map(builder =>
      ({ vector, builder, event: vector.event, result: checkExpected(vector, builder) })));
    const built = results.filter(({ result }) => result !== null);
    const has = (description, predicate) => assert.ok(results.some(predicate), `no vector with ${description}`);
    for (const type of Object.keys(LOC_KEYS)) {
      has(`a ${type} request`, ({ event, result }) => event.eventType === type && result !== null);
      has(`a ${type} at the end of its lifetime`, ({ vector, event }) =>
        event.eventType === type && lifetime(event, vector.nowSeconds) === 0);
    }
    for (const reason of ["answered", "declined", "ended", "expired", "transferred"])
      has(`a cancellation for ${reason}`, ({ event }) => event.reason === reason);
    has("unknown fields on a message", ({ vector }) => vector.unknownFields && isMessage(vector.event));
    has("unknown fields on a call", ({ vector }) => vector.unknownFields && vector.event.eventType === "notification.call");
    has("an opted-out preview", ({ vector }) => vector.event.preview && vector.options.preview === false);
    has("a one-second lifetime", ({ result }) => result?.ttl === 1);
    has("a capped lifetime", ({ vector, result }) => result !== null && deadline(vector.event) - vector.nowSeconds > MAX_LIFETIME);
    has("an offset and a fraction", ({ event }) => /\.[0-9]+[+-]/.test(event.occurredAt));
    for (const builder of PUSH_BUILDERS) {
      const of = predicate => built.some(entry => entry.builder === builder && predicate(entry.result));
      assert.ok(of(({ bytes, truncated }) => bytes === PUSH_LIMITS[builder] && truncated.length === 0), `${builder}: exactly the limit`);
      assert.ok(of(({ bytes, truncated, fullBytes }) => bytes === PUSH_LIMITS[builder] && truncated.includes("body")
        && fullBytes === PUSH_LIMITS[builder] + 1), `${builder}: one byte over the limit`);
      if (builder !== "apnsVoip") assert.ok(of(({ truncated }) => truncated.includes("title")), `${builder}: a truncated title`);
    }
    for (const slack of [1, 2]) assert.ok(built.some(({ builder, result }) => builder === "apnsAlert"
      && result.truncated.includes("body") && result.bytes === PUSH_LIMITS.apnsAlert - slack), `truncation leaving ${slack} bytes`);
    assert.ok(document.invalidEvents.some(invalid => invalid.schemaValid));
  });
});

describe("push payload timestamps", () => {
  const pad = (value, width) => String(value).padStart(width, "0");
  // Each leap-year rule: every 4th year, but not every 100th, but every 400th.
  const YEARS = [0, 4, 96, 100, 104, 400, 1600, 1700, 1896, 1900, 1904, 1970, 2000, 2024, 2026, 2100, 2104, 2400, 9996, 9999];
  const dates = YEARS.flatMap(year => Array.from({ length: 14 }, (_, month) => Array.from({ length: 33 }, (_, day) =>
    `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}T12:00:00Z`)).flat());
  const times = [
    "2026-10-10T00:00:00Z", "2026-10-10T23:59:59Z", "2026-10-10T24:00:00Z", "2026-10-10T23:60:00Z",
    "2026-10-10T23:59:60Z", "2026-10-10T23:59:59.5Z", "2026-10-10T23:59:59.123456789Z", "2026-10-10T23:59:59.1234567890Z",
    "2026-10-10T23:59:59.Z", "2026-10-10t23:59:59Z", "2026-10-10T23:59:59z", "2026-10-10 23:59:59Z", "2026-10-10T23:59:59",
    "2026-10-10T23:59:59+23:59", "2026-10-10T23:59:59-00:00", "2026-10-10T23:59:59+24:00", "2026-10-10T23:59:59+05:60",
    "2026-10-10T23:59:59+0530", "2026-10-10T23:59:59.999999999-12:45", "0000-01-01T00:00:00.9+00:01", "+2026-10-10T12:00:00Z",
    "20260-10-10T12:00:00Z", "2026-10-1\u0661T12:00:00Z", "2026-10-10T12:00:00Z\n", " 2026-10-10T12:00:00Z",
  ];

  test("the calendar oracle agrees with Date.parse on every date of each year", () => {
    for (const year of YEARS) {
      const prefix = `${pad(year, 4)}-`, valid = dates.filter(value => value.startsWith(prefix) && unixSeconds(value) !== undefined);
      assert.equal(valid.length, (Date.parse(`${prefix}12-31T00:00:00Z`) - Date.parse(`${prefix}01-01T00:00:00Z`)) / DAY / 1000 + 1, prefix);
      for (const value of valid) assert.equal(unixSeconds(value) * 1000, Date.parse(value), value);
    }
  });

  test("the schema accepts exactly the timestamps that exist", () => {
    const timestamp = compileDefinition(schema, "timestamp");
    for (const value of [...dates, ...times]) assert.equal(timestamp(value).length === 0, unixSeconds(value) !== undefined, value);
  });

  test("builders accept the same timestamps and read them as whole Unix seconds", () => {
    const base = vectors.find(vector => vector.event.eventType === "notification.call");
    for (const value of [...dates, ...times]) {
      const event = { ...base.event, occurredAt: value, expiresAt: value }, seconds = unixSeconds(value);
      if (seconds === undefined) assert.throws(() => push.fcm(event), rejectsEvent, value);
      else assert.equal(push.fcm(event, { now: new Date((seconds - 60) * 1000) })?.message.android.ttl, "60s", value);
    }
  });
});
