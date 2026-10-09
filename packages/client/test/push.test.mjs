import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  NotificationHandler, defaultWebNotification, handleNotification, handleNotificationClick, handlePushEvent, parsePushNotification,
  parsePushPayload, showPushNotification, subscribePush, unsubscribePush,
} from "@convohop/client/push";

const { vectors, invalidEvents } = JSON.parse(readFileSync(new URL("../../../spec/push-payload/vectors.json", import.meta.url), "utf8"));
const turn = () => new Promise(resolve => setImmediate(resolve));
/** The convohop object a request carries for an event: the event without subjectRef, connected and preview. */
function data(event) {
  const { subjectRef, connected, preview, ...fields } = event;
  return fields;
}
/** The metadata of a convohop object. Each builder shortens the text to its own limit. */
function metadata({ title, body, ...fields }) { return fields; }
function expectedKind(event) {
  if (event.eventType === "notification.message") return "message";
  if (event.eventType === "notification.call") return "ring";
  return event.reason === "ended" || event.reason === "expired" ? "missedCall" : "stopRinging";
}
const message = vectors.find(vector => vector.id === "message-title").expected.webPush.request.payload.convohop;
const call = vectors.find(vector => vector.id === "call-incoming").expected.webPush.request.payload.convohop;
const callNow = vectors.find(vector => vector.id === "call-incoming").nowSeconds * 1000;
function ring(overrides = {}) { return { ...call, eventId: crypto.randomUUID(), ...overrides }; }
function cancel(reason, overrides = {}) {
  return { ...call, eventId: crypto.randomUUID(), eventType: "notification.callCancelled", reason, ...overrides };
}

test("every request the shared vectors build parses back to its convohop object and presents as its event", () => {
  let checked = 0;
  for (const vector of vectors) {
    const { webPush, fcm, apnsAlert, apnsVoip } = vector.expected;
    if (webPush === null) {
      assert.equal(fcm, null, vector.id);
      continue;
    }
    const expected = webPush.request.payload.convohop;
    assert.deepEqual(parsePushPayload(webPush.request.payload), expected, vector.id);
    assert.deepEqual(parsePushPayload(fcm.request.message.data), JSON.parse(fcm.request.message.data.convohop), vector.id);
    assert.deepEqual(metadata(parsePushPayload(fcm.request.message.data)), metadata(expected), vector.id + " FCM carries the same event");
    if (apnsAlert) assert.deepEqual(parsePushPayload(apnsAlert.request.payload), data(vector.event), vector.id + " APNs alert");
    if (apnsVoip) assert.deepEqual(metadata(parsePushPayload(apnsVoip.request.payload)), data(vector.event), vector.id + " APNs VoIP");
    assert.deepEqual(parsePushNotification(expected), expected, vector.id);

    const action = new NotificationHandler().handle(webPush.request.payload, vector.nowSeconds * 1000);
    assert.equal(action.kind, expectedKind(vector.event), vector.id);
    assert.equal(action.duplicate, false);
    assert.deepEqual(action.notification, expected);
    if (vector.event.eventType === "notification.message") assert.equal(action.tag, vector.event.messageId);
    else assert.equal(action.tag, webPush.request.headers.Topic, vector.id + " tags a call with its collapse key");
    checked++;
  }
  assert.ok(checked >= 30, "the vectors cover the builders");
});

test("fields the contract doesn't define for an event's type are ignored", () => {
  for (const vector of vectors.filter(item => item.expected.webPush !== null)) {
    const expected = vector.expected.webPush.request.payload.convohop;
    const extended = { ...vector.event, title: expected.title, body: expected.body, futureField: { nested: true }, ...vector.unknownFields };
    for (const key of ["title", "body"]) if (extended[key] === undefined) delete extended[key];
    if (vector.event.eventType === "notification.message") Object.assign(extended, { alertId: crypto.randomUUID(), reason: "ended" });
    else extended.messageId = crypto.randomUUID();
    assert.deepEqual(parsePushNotification(extended), expected, vector.id);
  }
});

test("events that break the contract are rejected where the convohop object carries the broken field", () => {
  // These break rules about subjectRef, connected and preview, which a push never carries.
  const eventOnly = new Set(["subject-kind-mismatch", "subject-id-mismatch", "preview-null", "preview-empty", "preview-too-long",
    "preview-without-truncated", "connected-missing", "connected-string"]);
  const rejected = new Set(["uuid-uppercase", "uuid-nil", "timestamp-february-30", "timestamp-2100-february-29", "timestamp-lowercase",
    "timestamp-leap-second", "timestamp-ten-fraction-digits", "media-profile-hyphen", "call-without-expires-at", "cancel-without-reason",
    "unknown-notification-type"]);
  assert.deepEqual(new Set(invalidEvents.map(item => item.id)), new Set([...eventOnly, ...rejected]),
    "decide for each new invalid event whether a push can carry its defect");
  for (const item of invalidEvents) {
    if (rejected.has(item.id)) {
      assert.throws(() => parsePushNotification(data(item.event)), TypeError, item.id);
      assert.throws(() => handleNotification({ convohop: JSON.stringify(data(item.event)) }), TypeError, item.id);
    } else {
      assert.equal(parsePushNotification(data(item.event)).eventId, item.event.eventId, item.id);
    }
  }
});

test("payload forms and visible text are validated", () => {
  assert.deepEqual(parsePushPayload(message), message, "the convohop object on its own");
  for (const payload of [null, [], "text", 1, { convohop: null }, { convohop: [] }, { convohop: "{" }, { convohop: "null" }])
    assert.throws(() => parsePushPayload(payload), TypeError);
  for (const text of ["", 1, null, ["title"]]) {
    assert.throws(() => parsePushNotification({ ...message, title: text }), TypeError);
    assert.throws(() => parsePushNotification({ ...message, body: text }), TypeError);
  }
  assert.deepEqual(parsePushNotification(metadata(message)), metadata(message), "title and body are optional");
  for (const occurredAt of ["2026-10-10T11:59:55+24:00", "2026-10-10T11:59:55+05:60", "2026-10-10T24:00:00Z", "2026-13-01T00:00:00Z"])
    assert.throws(() => parsePushNotification({ ...message, occurredAt }), TypeError, occurredAt);
  assert.equal(parsePushNotification({ ...message, occurredAt: "2026-10-10T11:59:55.123456789-05:30" }).occurredAt,
    "2026-10-10T11:59:55.123456789-05:30");
});

test("duplicates are recognized by eventId, within a bounded memory", () => {
  const handler = new NotificationHandler();
  assert.equal(handler.handle({ convohop: message }).duplicate, false);
  assert.equal(handler.handle({ convohop: JSON.stringify(message) }).duplicate, true, "an FCM copy is the same event");
  const first = { ...message, eventId: crypto.randomUUID() };
  handler.handle(first);
  for (let index = 0; index < 512; index++) handler.handle({ ...message, eventId: crypto.randomUUID() });
  assert.equal(handler.handle(first).duplicate, false, "the oldest event is forgotten after 512 newer ones");
});

test("a ring is stopped by its cancellation in either order, and missed by its reason or expiry", () => {
  const handler = new NotificationHandler(), now = callNow;
  const answered = ring();
  assert.equal(handler.handle(answered, now).kind, "ring");
  const answer = cancel("answered");
  const stopped = handler.handle(answer, now);
  assert.deepEqual([stopped.kind, stopped.duplicate], ["stopRinging", false]);
  assert.deepEqual([handler.handle(answer, now).kind, handler.handle(answer, now).duplicate], ["stopRinging", true]);
  assert.equal(handler.handle(answered, now).kind, "stopRinging", "a redelivered ring stays stopped");

  const alertId = crypto.randomUUID();
  assert.equal(handler.handle(cancel("ended", { alertId }), now).kind, "missedCall", "the cancellation can arrive first");
  assert.equal(handler.handle(ring({ alertId }), now).kind, "missedCall", "its late ring is a missed call, not a ring");
  assert.equal(handler.handle(cancel("answered", { alertId }), now).kind, "missedCall", "a missed ring stays missed");

  const declined = crypto.randomUUID();
  assert.equal(handler.handle(cancel("transferred", { alertId: declined }), now).kind, "stopRinging", "a later reason only stops ringing");
  assert.equal(handler.handle(ring({ alertId: declined }), now).kind, "stopRinging");

  const expiresAt = Date.parse(call.expiresAt);
  assert.equal(handler.handle(ring({ alertId: crypto.randomUUID() }), expiresAt - 1).kind, "ring");
  assert.equal(handler.handle(ring({ alertId: crypto.randomUUID() }), expiresAt).kind, "missedCall", "a ring past its expiresAt is missed");
});

test("stopped rings are remembered until five minutes after they expire", () => {
  const handler = new NotificationHandler(), alertId = crypto.randomUUID(), expiresAt = Date.parse(call.expiresAt);
  handler.handle(cancel("answered", { alertId }), callNow);
  assert.equal(handler.handle(ring({ alertId }), expiresAt + 5 * 60000 - 1).kind, "stopRinging");
  assert.equal(handler.handle(ring({ alertId }), expiresAt + 5 * 60000).kind, "missedCall", "after that only the expiry applies");

  const late = crypto.randomUUID(), lateNow = expiresAt + 60000;
  handler.handle(cancel("declined", { alertId: late }), lateNow);
  assert.equal(handler.handle(ring({ alertId: late }), lateNow + 5 * 60000 - 1).kind, "stopRinging",
    "a cancellation handled after expiry is remembered from when it arrived");
});

test("the default Web notification follows the action", () => {
  const handler = new NotificationHandler(), text = { ...message, body: "See you at noon" };
  const shown = defaultWebNotification(handler.handle({ convohop: text }));
  assert.deepEqual(shown, { title: text.title, options: { tag: text.messageId, data: { convohop: text }, body: text.body } });
  const bare = { ...metadata(message), eventId: crypto.randomUUID() };
  assert.deepEqual(defaultWebNotification(handler.handle(bare)),
    { title: "New message", options: { tag: message.messageId, data: { convohop: bare } } });
  const incoming = ring({ title: undefined, body: undefined });
  delete incoming.title; delete incoming.body;
  const ringing = defaultWebNotification(handler.handle(incoming, callNow));
  assert.equal(ringing.title, "Incoming call");
  assert.equal(ringing.options.requireInteraction, true);
  assert.equal(ringing.options.silent, undefined);
  assert.equal(ringing.options.tag, call.alertId.replaceAll("-", ""));
  const stop = defaultWebNotification(handler.handle(cancel("answered", { title: undefined }), callNow));
  assert.deepEqual([stop.title, stop.options.silent, stop.options.requireInteraction], ["Call ended", true, undefined]);
  const missedCall = { ...cancel("expired"), alertId: crypto.randomUUID() };
  delete missedCall.title;
  assert.equal(defaultWebNotification(handler.handle(missedCall, callNow)).title, "Missed call");
  const again = defaultWebNotification(handler.handle({ convohop: text }));
  assert.equal(again.options.silent, true, "a duplicate replaces its notification silently");
});

function registration() {
  const shown = [];
  return { shown, showNotification: async (title, options) => { shown.push({ title, options }); } };
}

test("showPushNotification shows what the handler and renderer decide", async () => {
  const target = registration(), handler = new NotificationHandler();
  const action = await showPushNotification(target, { convohop: message }, { handler });
  assert.equal(action.kind, "message");
  assert.deepEqual(target.shown, [defaultWebNotification(action)]);
  await showPushNotification(target, { convohop: message }, { handler, render: item => ({ title: item.kind + ":" + item.duplicate, options: {} }) });
  assert.deepEqual(target.shown[1], { title: "message:true", options: {} });
  await assert.rejects(showPushNotification(target, { convohop: { ...message, eventId: "x" } }, { handler }), TypeError);
});

test("handlePushEvent keeps the worker alive until the notification shows and routes failures", async () => {
  const target = registration(), errors = [], waits = [];
  const push = (payload, onError = error => { errors.push(error); }) => handlePushEvent(target, {
    data: payload === undefined ? null : { json: () => payload }, waitUntil: promise => waits.push(promise),
  }, { handler: new NotificationHandler(), onError });
  push({ convohop: message });
  await Promise.all(waits);
  assert.equal(target.shown.length, 1);
  push(undefined);
  push({ convohop: "{" });
  push({ other: "service" });
  await Promise.all(waits);
  assert.equal(target.shown.length, 1);
  assert.deepEqual(errors.map(error => error.constructor), [TypeError, TypeError, TypeError]);

  let fallback;
  push({ other: "service" }, async () => { await turn(); fallback = "shown"; });
  await Promise.all(waits);
  assert.equal(fallback, "shown", "the event waits for onError, so it can show its own notification");
  handlePushEvent(target, { data: { json: () => { throw new SyntaxError("bad"); } }, waitUntil: promise => waits.push(promise) });
  await Promise.all(waits);
});

function clicked(data, action = "") {
  const event = { closed: 0, waits: [], action, notification: { data, tag: "t", close() { event.closed++; } },
    waitUntil(promise) { event.waits.push(promise); } };
  return event;
}
function windows(urls) {
  const clients = { opened: [], focused: [],
    async matchAll(options) {
      assert.deepEqual(options, { type: "window", includeUncontrolled: true });
      return urls.map(url => ({ url, focus: async () => { clients.focused.push(url); } }));
    },
    async openWindow(url) { clients.opened.push(url); } };
  return clients;
}

/** Gives the test the `location` of a service worker at `href`, as `self.location` is in one. */
function serviceWorkerAt(t, href) {
  const own = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", { value: { href }, configurable: true, writable: true });
  t.after(() => { if (own) Object.defineProperty(globalThis, "location", own); else delete globalThis.location; });
}

test("notification clicks focus the app's window for the notification or open one", async t => {
  serviceWorkerAt(t, "https://app.example/sw.js");
  const url = (notification, action) => "/c/" + notification.conversationId + (action ? "?" + action : "");
  const target = "https://app.example/c/" + message.conversationId;
  const open = windows(["https://app.example/", target]), event = clicked({ convohop: message });
  assert.equal(handleNotificationClick(open, event, url), true);
  await Promise.all(event.waits);
  assert.deepEqual([event.closed, open.focused, open.opened], [1, [target], []], "a relative URL matches the open window");

  const absolute = windows(["https://app.example/", target]), again = clicked({ convohop: message });
  handleNotificationClick(absolute, again, () => target);
  await Promise.all(again.waits);
  assert.deepEqual([absolute.focused, absolute.opened], [[target], []]);

  const none = windows(["https://app.example/"]), answer = clicked({ convohop: message }, "reply");
  handleNotificationClick(none, answer, url);
  await Promise.all(answer.waits);
  assert.deepEqual(none.opened, [target + "?reply"], "a window opens at the absolute URL");

  for (const data of [null, undefined, "text", { other: true }]) {
    const foreign = clicked(data);
    assert.equal(handleNotificationClick(none, foreign, url), false);
    assert.deepEqual([foreign.closed, foreign.waits], [0, []]);
  }
  assert.throws(() => handleNotificationClick(none, clicked({ convohop: { ...message, projectId: "x" } }), url), TypeError);
  for (const [other, error] of [
    [() => "https://elsewhere.example/c/1", /only open a page on https:\/\/app\.example/],
    [() => "//elsewhere.example/c/1", /only open a page on/],
    [() => "javascript:alert(1)", /only open a page on/],
    [() => undefined, /must be a string/],
  ]) {
    const refused = clicked({ convohop: message });
    assert.throws(() => handleNotificationClick(none, refused, other), { name: "TypeError", message: error });
    assert.deepEqual([refused.closed, refused.waits], [0, []], "a refused click leaves the notification open");
  }
  assert.deepEqual([none.focused, none.opened], [[], [target + "?reply"]]);
});

test("notification click URLs resolve against the service worker's location", async t => {
  serviceWorkerAt(t, "https://app.example/inbox/sw.js");
  const scoped = windows([]), event = clicked({ convohop: message });
  handleNotificationClick(scoped, event, notification => "c/" + notification.conversationId);
  await Promise.all(event.waits);
  assert.deepEqual(scoped.opened, ["https://app.example/inbox/c/" + message.conversationId]);

  delete globalThis.location;
  const outside = clicked({ convohop: message });
  assert.throws(() => handleNotificationClick(scoped, outside, () => "/c/1"),
    { name: "TypeError", message: "handleNotificationClick needs the service worker's location" });
  assert.equal(outside.closed, 0);
});

const vapid = new Uint8Array(65).map((_, index) => (index * 37 + 4) % 256);
const vapidText = Buffer.from(vapid).toString("base64url");
function subscription(key, calls) {
  return { options: { applicationServerKey: key === null ? null : new Uint8Array(key).buffer },
    toJSON: () => ({ endpoint: "https://push.example/" + calls.length, keys: { p256dh: "p", auth: "a" } }),
    unsubscribe: async () => { calls.push("unsubscribe"); return true; } };
}
function pushRegistration(existing) {
  const calls = [];
  const manager = { current: existing?.(calls) ?? null,
    async getSubscription() { return manager.current; },
    async subscribe(options) {
      calls.push(options);
      manager.current = subscription(options.applicationServerKey, calls);
      return manager.current;
    } };
  return { calls, manager, registration: { pushManager: manager } };
}

test("subscribePush registers a subscription for the VAPID key, reusing or replacing the current one", async () => {
  const fresh = pushRegistration(), registered = [];
  const created = await subscribePush(fresh.registration, { applicationServerKey: vapidText, register: value => { registered.push(value); } });
  assert.equal(fresh.calls.length, 1);
  assert.equal(fresh.calls[0].userVisibleOnly, true);
  assert.deepEqual([...fresh.calls[0].applicationServerKey], [...vapid], "base64url keys are decoded");
  assert.deepEqual(registered, [{ kind: "webPush", subscription: created.toJSON() }], "the backend gets a PushRegistration");
  assert.ok(Object.isFrozen(registered[0]));

  const same = pushRegistration(calls => subscription(vapid, calls));
  const reused = await subscribePush(same.registration, { applicationServerKey: vapid, register: value => { registered.push(value); } });
  assert.equal(reused, same.manager.current);
  assert.deepEqual(same.calls, [], "a subscription for the same key is reused and registered again");
  assert.equal(registered.length, 2);

  const other = pushRegistration(calls => subscription(vapid.map(byte => byte ^ 1), calls));
  await subscribePush(other.registration, { applicationServerKey: vapidText + "=", register: () => undefined });
  assert.equal(other.calls[0], "unsubscribe", "a subscription for another key is replaced");
  assert.deepEqual([...other.calls[1].applicationServerKey], [...vapid]);

  const unknown = pushRegistration(calls => subscription(null, calls));
  await subscribePush(unknown.registration, { applicationServerKey: vapid, register: () => undefined });
  assert.equal(unknown.calls[0], "unsubscribe");

  const failing = pushRegistration();
  await assert.rejects(subscribePush(failing.registration, { applicationServerKey: vapid, register: async () => { throw new Error("backend"); } }),
    /backend/);
  for (const key of ["", "a", "not base64!", 7]) {
    await assert.rejects(subscribePush(pushRegistration().registration, { applicationServerKey: key, register: () => undefined }), TypeError);
  }
  await assert.rejects(subscribePush({}, { applicationServerKey: vapid, register: () => undefined }), /doesn't support Web Push/);
});

test("unsubscribePush lets the backend forget the subscription first", async () => {
  const order = [];
  const current = pushRegistration(calls => subscription(vapid, calls));
  current.manager.current.unsubscribe = async () => { order.push("unsubscribe"); return true; };
  assert.equal(await unsubscribePush(current.registration, async value => { order.push(value.kind, value.subscription.endpoint); }), true);
  assert.deepEqual(order, ["webPush", "https://push.example/0", "unsubscribe"]);
  assert.equal(await unsubscribePush(pushRegistration().registration), false);
  assert.equal(await unsubscribePush({}), false);
  const failing = pushRegistration(calls => subscription(vapid, calls));
  await assert.rejects(unsubscribePush(failing.registration, () => { throw new Error("backend"); }), /backend/);
  assert.deepEqual(failing.calls, [], "the subscription stays when the backend didn't forget it");
});
