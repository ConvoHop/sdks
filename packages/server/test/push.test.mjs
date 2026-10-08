import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { PushPayloadError, push, webhooks } from "@convohop/server";

// Expected requests are written out from spec/push-payload/README.md, independently of the builders and the vectors.
const BUNDLE = "com.example.chat", LIMITS = { apnsAlert: 4096, apnsVoip: 5120, fcm: 4096, webPush: 3993 };
const BUILDERS = Object.keys(LIMITS);
const now = new Date("2026-10-10T12:00:00.000Z"), nowSeconds = 1_791_633_600, DAY = 86_400, CAP = 2_419_200;
/** The RFC 3339 time `offset` seconds after `now`. */
const at = offset => new Date((nowSeconds + offset) * 1000).toISOString().replace(".000Z", "Z");

const eventId = "5b0c1d2e-3f40-4152-8637-48596a7b8c9d", projectId = "7e8f9a0b-1c2d-4e3f-9051-627384950a1b";
const recipientId = "9a8b7c6d-5e4f-4031-a2b3-c4d5e6f70819", conversationId = "2c3d4e5f-6071-4829-b3a4-b5c6d7e8f901";
const senderId = "3d4e5f60-7182-4930-84a5-b6c7d8e9f012", messageId = "4e5f6071-8293-4a41-95b6-c7d8e9f01223";
const liveSessionId = "5f607182-93a4-4b52-a6c7-d8e9f0122334", alertId = "60718293-a4b5-4c63-b7d8-e9f012233445";
const collapse = "60718293a4b54c63b7d8e9f012233445";

const common = { eventId, projectId, recipientId, conversationId, senderId, connected: false };
const messageEvent = (fields = {}) => ({ ...common, eventType: "notification.message", occurredAt: at(-60),
  subjectRef: { id: messageId, kind: "message" }, messageId, ...fields });
const callEvent = (fields = {}) => ({ ...common, eventType: "notification.call", occurredAt: at(-5),
  subjectRef: { id: liveSessionId, kind: "liveSession" }, liveSessionId, alertId, expiresAt: at(40), mediaProfile: "AUDIO_VIDEO",
  ...fields });
const cancelEvent = (reason, fields = {}) => callEvent({ eventType: "notification.callCancelled", reason, ...fields });
const metadata = { eventId, occurredAt: at(-60), projectId, recipientId, conversationId, senderId };
const messageData = { ...metadata, eventType: "notification.message", messageId };
const callData = { ...metadata, eventType: "notification.call", occurredAt: at(-5), liveSessionId, alertId, expiresAt: at(40),
  mediaProfile: "AUDIO_VIDEO" };

const build = (name, event, options = {}) => push[name](event, { bundleId: BUNDLE, now, ...options });
const size = value => Buffer.byteLength(JSON.stringify(value));
/** FCM's `data.convohop`, checked to be compact JSON. */
function fcmData(request) {
  const raw = request.message.data.convohop;
  assert.equal(typeof raw, "string");
  assert.equal(raw, JSON.stringify(JSON.parse(raw)));
  return JSON.parse(raw);
}
/** The visible title and body: the APNs alert's, or the ones in `convohop`. */
function visible(name, request) {
  const source = name === "apnsAlert" ? request.payload.aps.alert : name === "fcm" ? fcmData(request) : request.payload.convohop;
  return { title: source.title, body: source.body };
}
/** The part of a request a platform's limit applies to, optionally with its visible text replaced. */
function measured(name, request, text = {}) {
  if (name === "fcm") return { convohop: JSON.stringify({ ...fcmData(request), ...text }) };
  if (name === "apnsAlert")
    return { ...request.payload, aps: { ...request.payload.aps, alert: { ...request.payload.aps.alert, ...text } } };
  return { convohop: { ...request.payload.convohop, ...text } };
}
function throwsCode(run, code, marker) {
  assert.throws(run, error => {
    assert.ok(error instanceof PushPayloadError, String(error));
    assert.equal(error.name, "PushPayloadError");
    assert.equal(error.code, code, error.message);
    if (marker) assert.equal(error.message.includes(marker), false, error.message);
    return true;
  });
}
function deepFreeze(value) {
  if (typeof value === "object" && value !== null) for (const child of Object.values(Object.freeze(value))) deepFreeze(child);
  return value;
}

test("a message builds an alert, an FCM data message and a Web Push message, metadata-only by default", () => {
  const event = messageEvent(), ttl = DAY - 60;
  assert.deepEqual(build("apnsAlert", event), {
    headers: { "apns-push-type": "alert", "apns-topic": BUNDLE, "apns-priority": "10", "apns-expiration": String(nowSeconds + ttl) },
    payload: { aps: { alert: { "loc-key": "CONVOHOP_MESSAGE" }, sound: "default", "mutable-content": 1, "thread-id": conversationId },
      convohop: messageData },
  });
  assert.equal(build("apnsVoip", event), null);
  const fcm = push.fcm(event, { now });
  assert.deepEqual(fcm, { message: { data: { convohop: fcm.message.data.convohop }, android: { priority: "HIGH", ttl: `${ttl}s` } } });
  assert.deepEqual(fcmData(fcm), messageData);
  assert.deepEqual(push.webPush(event, { now }), { headers: { TTL: String(ttl), Urgency: "normal" }, payload: { convohop: messageData } });
});

test("an opted-in preview becomes the body, and title and body options add visible text", () => {
  const preview = { text: "See you at 6", truncated: true }, event = messageEvent({ preview });
  const alert = (options, expected) => assert.deepEqual(build("apnsAlert", event, options).payload,
    { aps: { alert: expected, sound: "default", "mutable-content": 1, "thread-id": conversationId }, convohop: messageData });
  alert({ title: "Ada" }, { title: "Ada", body: "See you at 6…" });
  alert({ title: "", body: "" }, { body: "See you at 6…" });
  alert({ body: "New message" }, { body: "New message" });
  alert({ title: "Ada", preview: false }, { title: "Ada", "loc-key": "CONVOHOP_MESSAGE" });
  assert.deepEqual(build("apnsAlert", messageEvent({ preview: { text: "Done", truncated: false } })).payload.aps.alert, { body: "Done" });
  assert.deepEqual(fcmData(build("fcm", event, { title: "Ada" })), { ...messageData, title: "Ada", body: "See you at 6…" });
  assert.deepEqual(build("webPush", event, { body: "New message" }).payload.convohop, { ...messageData, body: "New message" });
  for (const name of ["apnsAlert", "fcm", "webPush"]) {
    const request = build(name, event, { preview: false });
    assert.deepEqual(visible(name, request), { title: undefined, body: undefined });
    assert.equal(JSON.stringify(request).includes("See you"), false, name);
  }
});

test("an incoming call builds a VoIP push, an alert and high-priority data messages that collapse on the ring", () => {
  const event = callEvent(), expiration = String(nowSeconds + 40);
  assert.deepEqual(build("apnsAlert", event, { title: "Ada" }), {
    headers: { "apns-push-type": "alert", "apns-topic": BUNDLE, "apns-priority": "10", "apns-expiration": expiration,
      "apns-collapse-id": collapse },
    payload: { aps: { alert: { title: "Ada", "loc-key": "CONVOHOP_CALL" }, sound: "default", "mutable-content": 1,
      "thread-id": conversationId }, convohop: callData },
  });
  assert.deepEqual(build("apnsVoip", event, { title: "Ada" }), {
    headers: { "apns-push-type": "voip", "apns-topic": `${BUNDLE}.voip`, "apns-priority": "10", "apns-expiration": expiration },
    payload: { convohop: { ...callData, title: "Ada" } },
  });
  const fcm = build("fcm", event, { title: "Ada" });
  assert.deepEqual(fcm.message.android, { priority: "HIGH", ttl: "40s", collapse_key: collapse });
  assert.deepEqual(fcmData(fcm), { ...callData, title: "Ada" });
  assert.deepEqual(build("webPush", event, { title: "Ada" }), { headers: { TTL: "40", Urgency: "high", Topic: collapse },
    payload: { convohop: { ...callData, title: "Ada" } } });
  const audio = callEvent({ mediaProfile: "AUDIO_ONLY", connected: true });
  assert.deepEqual(build("apnsVoip", audio).payload.convohop, { ...callData, mediaProfile: "AUDIO_ONLY" });
});

test("a missed call replaces the ring's alert; other cancellations reach only the data channels", () => {
  for (const reason of ["ended", "expired"]) {
    const event = cancelEvent(reason, { occurredAt: at(-15) }), ttl = DAY - 15;
    const data = { ...callData, eventType: "notification.callCancelled", occurredAt: at(-15), reason };
    assert.deepEqual(build("apnsAlert", event), {
      headers: { "apns-push-type": "alert", "apns-topic": BUNDLE, "apns-priority": "10", "apns-expiration": String(nowSeconds + ttl),
        "apns-collapse-id": collapse },
      payload: { aps: { alert: { "loc-key": "CONVOHOP_MISSED_CALL" }, sound: "default", "mutable-content": 1,
        "thread-id": conversationId }, convohop: data },
    }, reason);
    assert.equal(build("apnsVoip", event), null);
    const fcm = build("fcm", event);
    assert.deepEqual([fcm.message.android, fcmData(fcm)], [{ priority: "HIGH", ttl: `${ttl}s`, collapse_key: collapse }, data]);
    assert.deepEqual(build("webPush", event), { headers: { TTL: String(ttl), Urgency: "high", Topic: collapse }, payload: { convohop: data } });
  }
  // Answered, declined and later reasons only stop the ringing, so they live until the ring's deadline.
  for (const reason of ["answered", "declined", "transferred"]) {
    const event = cancelEvent(reason, { occurredAt: at(-2) });
    const data = { ...callData, eventType: "notification.callCancelled", occurredAt: at(-2), reason };
    assert.equal(build("apnsAlert", event), null, reason);
    assert.equal(build("apnsVoip", event), null, reason);
    const fcm = build("fcm", event);
    assert.deepEqual([fcm.message.android, fcmData(fcm)], [{ priority: "HIGH", ttl: "40s", collapse_key: collapse }, data]);
    assert.deepEqual(build("webPush", event), { headers: { TTL: "40", Urgency: "high", Topic: collapse }, payload: { convohop: data } });
  }
});

test("lifetimes count whole seconds, stop at 28 days and yield no request once stale", () => {
  /** The lifetime every applicable builder gives the event, or null when none returns a request. */
  const ttl = (event, options = {}) => {
    const clock = Math.floor((options.now ?? now).getTime() / 1000);
    const ttls = BUILDERS.map(name => build(name, event, options)).filter(Boolean).map(request => request.message
      ? request.message.android.ttl.slice(0, -1) : request.headers.TTL ?? String(Number(request.headers["apns-expiration"]) - clock));
    if (!ttls.length) return null;
    assert.equal(new Set(ttls).size, 1, ttls.join());
    return Number(ttls[0]);
  };
  assert.equal(ttl(messageEvent({ occurredAt: at(-DAY + 1) })), 1);
  assert.equal(ttl(messageEvent({ occurredAt: at(-DAY) })), null);
  assert.equal(ttl(messageEvent({ occurredAt: at(-DAY - 1) })), null);
  // Fractions of the event times and of the clock are dropped.
  assert.equal(ttl(messageEvent({ occurredAt: "2026-10-10T11:59:00.999999999Z" })), DAY - 60);
  assert.equal(ttl(messageEvent(), { now: new Date(now.getTime() + 999) }), DAY - 60);
  assert.equal(ttl(messageEvent(), { now: new Date(now.getTime() + 1000) }), DAY - 61);
  assert.equal(ttl(messageEvent({ occurredAt: "2026-10-10T13:59:00+02:00" })), DAY - 60);
  assert.equal(ttl(messageEvent({ occurredAt: "2026-10-10T06:29:00-05:30" })), DAY - 60);
  assert.equal(ttl(callEvent({ expiresAt: at(1) })), 1);
  assert.equal(ttl(callEvent({ expiresAt: at(0) })), null);
  assert.equal(ttl(callEvent({ expiresAt: `${at(0).slice(0, -1)}.999Z` })), null);
  assert.equal(ttl(cancelEvent("answered", { expiresAt: at(-1) })), null);
  assert.equal(ttl(cancelEvent("expired", { occurredAt: at(-DAY) })), null);
  // A far deadline, or a producer clock ahead of yours, is capped.
  assert.equal(ttl(callEvent({ expiresAt: at(40 * DAY) })), CAP);
  assert.equal(ttl(callEvent({ expiresAt: at(CAP - 1) })), CAP - 1);
  assert.equal(ttl(messageEvent({ occurredAt: at(30 * DAY) })), CAP);
  assert.equal(build("apnsVoip", callEvent({ expiresAt: at(40 * DAY) })).headers["apns-expiration"], String(nowSeconds + CAP));
  // The default clock is the current time.
  const fresh = Number(push.webPush(messageEvent({ occurredAt: new Date().toISOString() })).headers.TTL);
  assert.ok(fresh >= DAY - 2 && fresh <= DAY, String(fresh));
});

test("a request exactly at its limit is kept, and one byte over shortens the body", () => {
  for (const name of BUILDERS) {
    const event = name === "apnsVoip" ? callEvent() : messageEvent(), limit = LIMITS[name];
    const request = body => build(name, event, { title: "Ada", body });
    const pad = limit - size(measured(name, request("x"))) + 1, body = "x".repeat(pad);
    const exact = request(body);
    assert.equal(size(measured(name, exact)), limit, name);
    assert.deepEqual(visible(name, exact), { title: "Ada", body }, name);
    const over = request(`${body}y`);
    assert.equal(size(measured(name, over)), limit, name);
    assert.deepEqual(visible(name, over), { title: "Ada", body: `${"x".repeat(pad - 3)}…` }, name);
    // A preview that doesn't fit beside a long title is shortened like a body.
    if (name !== "apnsVoip") {
      const title = "T".repeat(700), preview = { text: "\u0001".repeat(512), truncated: false };
      const previewed = build(name, messageEvent({ preview }), { title }), shown = visible(name, previewed);
      assert.equal(shown.title, title);
      assert.match(shown.body, /^\u0001{1,511}…$/u);
      assert.ok(size(measured(name, previewed)) <= limit);
      assert.ok(size(measured(name, previewed, { body: `\u0001${shown.body}` })) > limit, `${name} preview is not maximal`);
    }
  }
});

test("shortened text keeps whole code points and the longest prefix that fits", () => {
  for (const name of BUILDERS) {
    const event = name === "apnsVoip" ? callEvent() : messageEvent(), limit = LIMITS[name];
    for (const unit of ["é", "€", "👋", "\u0001", "\"", "\\", "\n", "a👋"]) {
      const request = build(name, event, { body: unit.repeat(limit) }), { body } = visible(name, request);
      const points = Array.from(body.slice(0, -1));
      assert.ok(body.endsWith("…") && unit.repeat(limit).startsWith(body.slice(0, -1)), `${name} ${JSON.stringify(unit)}`);
      assert.equal(/[\uD800-\uDFFF]/u.test(body), false);
      assert.ok(size(measured(name, request)) <= limit);
      const longer = Array.from(unit.repeat(limit)).slice(0, points.length + 1).join("");
      assert.ok(size(measured(name, request, { body: `${longer}…` })) > limit, `${name} ${JSON.stringify(unit)} is not maximal`);
    }
  }
});

test("a title too long for any payload shortens the body to … and then the title", () => {
  for (const name of BUILDERS) {
    const event = name === "apnsVoip" ? callEvent() : messageEvent(), limit = LIMITS[name], title = "T".repeat(6000);
    for (const body of ["hello", undefined]) {
      const request = build(name, event, { title, body }), text = visible(name, request);
      assert.equal(text.body, body && "…", name);
      assert.match(text.title, /^T+…$/);
      assert.ok(size(measured(name, request)) <= limit);
      assert.ok(size(measured(name, request, { title: `T${text.title}` })) > limit, `${name} title is not maximal`);
    }
    if (name === "apnsAlert") assert.equal(build(name, event, { title }).payload.aps.alert["loc-key"], "CONVOHOP_MESSAGE");
  }
});

test("options are checked before the event, and invalid ones fail with INVALID_OPTIONS", () => {
  const event = messageEvent(), call = callEvent();
  for (const name of BUILDERS) {
    const target = name === "apnsVoip" ? call : event;
    for (const options of [null, [], "options", 7])
      throwsCode(() => push[name](target, options), "INVALID_OPTIONS");
    for (const options of [{ title: 7 }, { body: {} }, { title: "\uD800" }, { body: "end\uDBFF" }, { title: "\uDC00start" },
      { preview: "false" }, { preview: 0 }, { now: null }, { now: new Date(Number.NaN) }, { now: now.getTime() },
      { now: now.toISOString() }])
      throwsCode(() => build(name, target, options), "INVALID_OPTIONS");
    throwsCode(() => build(name, {}, { preview: "no" }), "INVALID_OPTIONS");
    throwsCode(() => build(name, {}), "INVALID_EVENT");
  }
  for (const name of ["apnsAlert", "apnsVoip"]) {
    const target = name === "apnsVoip" ? call : event;
    throwsCode(() => push[name](target), "INVALID_OPTIONS");
    throwsCode(() => push[name](target, { now }), "INVALID_OPTIONS");
    for (const bundleId of ["", 7, "com..example", ".com.example", "com.example.", "com example", "com/example", "com_example",
      "com.exämple", "a".repeat(156)])
      throwsCode(() => build(name, target, { bundleId }), "INVALID_OPTIONS");
    for (const bundleId of ["a".repeat(155), "com.example-app.Chat2", "A", "1.2"])
      assert.equal(build(name, target, { bundleId }).headers["apns-topic"], name === "apnsVoip" ? `${bundleId}.voip` : bundleId);
  }
  // Only the APNs builders use bundleId.
  for (const name of ["fcm", "webPush"]) assert.ok(push[name](event, { bundleId: 7, now }));
});

test("events outside the push payload contract fail with INVALID_EVENT, without echoing values", () => {
  const marker = "value-marker-4f2a";
  const invalid = [undefined, null, "event", [], {},
    { ...messageEvent(), eventType: "message.created", subjectRef: { id: messageId, kind: "message" } },
    messageEvent({ preview: { text: "a\uD800", truncated: false } }), messageEvent({ preview: { text: "x".repeat(513), truncated: false } }),
    messageEvent({ subjectRef: { id: liveSessionId, kind: "message" } }), callEvent({ alertId: alertId.toUpperCase() }),
    callEvent({ expiresAt: "2026-02-29T00:00:00Z" }), cancelEvent(undefined), cancelEvent("answered", { reason: "not a reason" }),
    messageEvent({ senderId: marker }), callEvent({ mediaProfile: `${marker}!` })];
  for (const name of BUILDERS) {
    for (const event of invalid) throwsCode(() => build(name, event), "INVALID_EVENT", marker);
    throwsCode(() => build(name, messageEvent(), { title: `${marker}\uD800` }), "INVALID_OPTIONS", marker);
  }
});

test("builders take verified webhook events, ignore unknown fields and connected, and don't mutate their input", async () => {
  const secret = `whsec_${randomBytes(32).toString("base64")}`, webhookId = "msg_push_pipeline", timestamp = String(nowSeconds);
  const events = [messageEvent({ preview: { text: "Grüße 👋", truncated: false } }), callEvent(), cancelEvent("expired"),
    cancelEvent("declined")];
  for (const event of events) {
    const body = JSON.stringify({ ...event, addedLater: true }), key = Buffer.from(secret.slice("whsec_".length), "base64");
    const signature = createHmac("sha256", key).update(`${webhookId}.${timestamp}.${body}`).digest("base64");
    const verified = await webhooks.verify({ body, secrets: secret, now, headers: { "webhook-id": webhookId,
      "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` } });
    assert.equal(verified.event.known, true);
    const options = deepFreeze({ bundleId: BUNDLE, now: new Date(now), title: "Ada" });
    for (const name of BUILDERS) {
      const expected = push[name](event, options);
      assert.deepEqual(push[name](deepFreeze(structuredClone(verified.event)), options), expected, name);
      assert.deepEqual(push[name]({ ...event, connected: !event.connected, addedLater: { a: 1 } }, options), expected, name);
      assert.deepEqual(push[name](event, options), expected, `${name} is not deterministic`);
    }
  }
});

test("push is a frozen namespace of four builders", () => {
  assert.ok(Object.isFrozen(push));
  assert.deepEqual(Object.keys(push).sort(), ["apnsAlert", "apnsVoip", "fcm", "webPush"]);
  const error = new PushPayloadError("INVALID_EVENT", "message");
  assert.ok(error instanceof Error);
  assert.deepEqual([error.name, error.code, error.message], ["PushPayloadError", "INVALID_EVENT", "message"]);
});
