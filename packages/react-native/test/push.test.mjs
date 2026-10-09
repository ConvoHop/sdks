import test from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { readFileSync } from "node:fs";
import { parsePushPayload } from "@convohop/client/push";
import {
  getPushPermission, getPushRegistrations, handleRemoteMessage, onNotification, registerForPush, requestPushPermission,
  setPushRecipient, takeInitialNotification, unregisterFromPush,
} from "@convohop/react-native";
import { Platform, reported } from "react-native";
import { linkCalls, linkPush, turn } from "./support/native.mjs";

const { vectors } = JSON.parse(readFileSync(new URL("../../../spec/push-payload/vectors.json", import.meta.url), "utf8"));
const vector = id => vectors.find(entry => entry.id === id).expected;
const APNS = "a1".repeat(32), VOIP = "b2".repeat(32), FID = "dBq3s1Fa-7xN_mk2Lp0QzW", FCM_TOKEN = "dGVzdA:APA91bH-token_value";
const INVALID = "ConvoHopPush sent a notification that isn't a valid ConvoHop push";

test.beforeEach(() => {
  Platform.OS = "ios";
  reported.length = 0;
});

/** Whether `promise` has settled once pending callbacks have run. */
async function isSettled(promise) {
  let settled = false;
  promise.then(() => { settled = true; }, () => { settled = true; });
  await turn();
  return settled;
}
function assertUnsubscribed(push, calls) {
  for (const event of ["onPushRegistration", "onPushRegistrationError", "onPushUnregistration"])
    assert.equal(push.listenerCount(event), 0, event);
  assert.equal(calls.listenerCount("onVoipToken"), 0, "onVoipToken");
}

test("permission requests ask for alerts, badges and sounds by default and validate the native status", async () => {
  const push = linkPush({ getPermissionStatus: async () => "provisional" });
  assert.equal(await getPushPermission(), "provisional");
  assert.equal(await requestPushPermission(), "granted");
  assert.equal(await requestPushPermission({ provisional: true, sound: false }), "granted");
  await assert.rejects(requestPushPermission({ sound: "yes" }), { name: "TypeError", message: "sound must be a boolean" });
  for (const request of [null, [], "alert"])
    await assert.rejects(requestPushPermission(request), { name: "TypeError", message: "request must be an object" });
  assert.deepEqual(push.log, [
    ["getPermissionStatus"],
    ["requestPermission", { alert: true, badge: true, sound: true, provisional: false }],
    ["requestPermission", { alert: true, badge: true, sound: false, provisional: true }],
  ]);
  for (const status of ["granted", "denied", "undetermined"]) {
    linkPush({ getPermissionStatus: async () => status });
    assert.equal(await getPushPermission(), status);
  }
  linkPush({ getPermissionStatus: async () => "authorized", requestPermission: async () => 2 });
  const unknown = { name: "TypeError", message: "ConvoHopPush returned an unknown permission status" };
  await assert.rejects(getPushPermission(), unknown);
  await assert.rejects(requestPushPermission(), unknown);
});

test("getPushRegistrations returns the platform's registrations, frozen and validated", async () => {
  linkPush({ getRegistrations: async () => [{ kind: "apns", token: APNS, environment: "production" }] });
  linkCalls({ getVoipToken: async () => ({ kind: "apnsVoip", token: VOIP }) });
  const ios = await getPushRegistrations();
  assert.deepEqual(ios, [{ kind: "apns", token: APNS, environment: "production" }, { kind: "apnsVoip", token: VOIP }]);
  assert.ok(ios.every(Object.isFrozen));
  linkPush();
  linkCalls();
  assert.deepEqual(await getPushRegistrations(), [], "no registrations yet");

  Platform.OS = "android";
  linkPush({ getRegistrations: async () => [{ kind: "fcm", token: FCM_TOKEN }] });
  const calls = linkCalls();
  const android = await getPushRegistrations();
  assert.deepEqual(android, [{ kind: "fcm", token: FCM_TOKEN }]);
  assert.ok(Object.isFrozen(android[0]));
  linkPush({ getRegistrations: async () => [{ kind: "fcm", fid: FID }] });
  assert.deepEqual(await getPushRegistrations(), [{ kind: "fcm", fid: FID }], "an app that registers by FID");
  assert.deepEqual(calls.log, [], "Android has no PushKit token");
  Platform.OS = "web";
  await assert.rejects(getPushRegistrations(), { name: "Error", message: "ConvoHop pushes need iOS or Android" });
});

test("push registrations must match their provider's format", async () => {
  const malformed = { name: "TypeError", message: "ConvoHopPush returned malformed registrations" };
  const cases = {
    ios: [
      [{ kind: "apns", token: "0f".repeat(8) }, true],
      [{ kind: "apns", token: "0f".repeat(256) }, true],
      [{ kind: "apns", token: APNS, environment: "development" }, true],
      [{ kind: "apns", token: APNS, environment: null }, true],
      [{ kind: "apns", token: "0f".repeat(7) }, false],
      [{ kind: "apns", token: "0f".repeat(257) }, false],
      [{ kind: "apns", token: APNS.toUpperCase() }, false],
      [{ kind: "apns", token: APNS + "a" }, false],
      [{ kind: "apns", token: APNS, environment: "sandbox" }, false],
      [{ kind: "apns", token: APNS, fid: FID }, false],
      [{ kind: "apnsVoip", token: APNS }, false],
      [{ kind: "fcm", token: FCM_TOKEN }, false],
      [{ kind: "fcm", fid: FID }, false],
      [{ token: APNS }, false],
      [APNS, false],
      [null, false],
    ],
    android: [
      [{ kind: "fcm", token: FCM_TOKEN }, true],
      [{ kind: "fcm", token: "!" }, true],
      [{ kind: "fcm", token: "~".repeat(4096) }, true],
      [{ kind: "fcm", token: FCM_TOKEN, fid: null, environment: null }, true],
      [{ kind: "fcm", fid: FID }, true],
      [{ kind: "fcm", fid: "eW91dGhpbmc" }, true],
      [{ kind: "fcm", fid: "A".repeat(64) }, true],
      [{ kind: "fcm", fid: FID, token: null, environment: null }, true],
      [{ kind: "fcm", token: "" }, false],
      [{ kind: "fcm", token: "A".repeat(4097) }, false],
      [{ kind: "fcm", token: "two words" }, false],
      [{ kind: "fcm", token: FCM_TOKEN + "\n" }, false],
      [{ kind: "fcm", token: FCM_TOKEN + "é" }, false],
      [{ kind: "fcm", token: 42 }, false],
      [{ kind: "fcm", token: FCM_TOKEN, environment: "production" }, false],
      [{ kind: "fcm", fid: "A".repeat(10) }, false],
      [{ kind: "fcm", fid: "A".repeat(65) }, false],
      [{ kind: "fcm", fid: "dBq3s1Fa+7xN/mk2Lp0QzW" }, false],
      [{ kind: "fcm", fid: FID + "==" }, false],
      [{ kind: "fcm", fid: FCM_TOKEN }, false],
      [{ kind: "fcm", fid: FID, token: FCM_TOKEN }, false],
      [{ kind: "fcm", fid: FID, environment: "production" }, false],
      [{ kind: "fcm" }, false],
      [{ kind: "apns", token: APNS }, false],
      [FID, false],
    ],
  };
  for (const [os, entries] of Object.entries(cases)) {
    Platform.OS = os;
    linkCalls();
    for (const [value, valid] of entries) {
      linkPush({ getRegistrations: async () => [value] });
      if (valid) assert.equal((await getPushRegistrations()).length, 1, JSON.stringify(value));
      else await assert.rejects(getPushRegistrations(), malformed, JSON.stringify(value));
    }
  }
  Platform.OS = "ios";
  linkPush({ getRegistrations: async () => ({ kind: "apns", token: APNS }) });
  await assert.rejects(getPushRegistrations(), malformed, "not an array");
  linkPush();
  for (const voip of [{ kind: "apns", token: VOIP }, undefined, false]) {
    linkCalls({ getVoipToken: async () => voip });
    await assert.rejects(getPushRegistrations(), malformed, `PushKit token ${JSON.stringify(voip)}`);
  }
});

test("registerForPush rejects invalid options before using the native modules", async () => {
  const push = linkPush(), calls = linkCalls(), register = () => {};
  const timeout = [RangeError, "timeoutMs must be an integer from 1 to 600000"];
  const cases = [
    [undefined, TypeError, "options must be an object"],
    [[register], TypeError, "options must be an object"],
    [{}, TypeError, "register must be a function"],
    [{ register, onError: "log" }, TypeError, "onError must be a function"],
    [{ register, unregister: "delete" }, TypeError, "unregister must be a function"],
    [{ register, timeoutMs: 0 }, ...timeout],
    [{ register, timeoutMs: 1.5 }, ...timeout],
    [{ register, timeoutMs: 600001 }, ...timeout],
    [{ register, timeoutMs: "1000" }, ...timeout],
    [{ register, signal: {} }, TypeError, "signal must be an AbortSignal"],
    [{ register, signal: { aborted: "yes", addEventListener() {}, removeEventListener() {} } }, TypeError,
      "signal must be an AbortSignal"],
  ];
  for (const [options, type, message] of cases) {
    const registration = registerForPush(options);
    assert.ok(registration instanceof Promise, "it rejects instead of throwing");
    await assert.rejects(registration, error => error instanceof type && error.message === message, message);
  }
  Platform.OS = "web";
  await assert.rejects(registerForPush({ register }), { name: "Error", message: "ConvoHop pushes need iOS or Android" });
  assert.deepEqual([push.log, calls.log], [[], []]);
  assertUnsubscribed(push, calls);
});

test("registerForPush on iOS stores the APNs and PushKit tokens, then each new one until stopped", async () => {
  const push = linkPush(), calls = linkCalls(), stored = [];
  const registration = registerForPush({ register: value => { stored.push(value); } });
  assert.deepEqual(push.log, [["getRegistrations"], ["register"]]);
  assert.deepEqual(calls.log, [["getVoipToken"]]);
  calls.emit("onVoipToken", { kind: "apnsVoip", token: VOIP });
  assert.equal(await isSettled(registration), false, "a PushKit token alone doesn't resolve it");
  push.emit("onPushRegistration", { kind: "apns", token: APNS, environment: "development" });
  const stop = await registration;
  assert.deepEqual(stored, [{ kind: "apnsVoip", token: VOIP }, { kind: "apns", token: APNS, environment: "development" }]);
  assert.ok(stored.every(Object.isFrozen));

  const rotated = "c3".repeat(32);
  push.emit("onPushRegistration", { kind: "apns", token: APNS, environment: "development" });
  push.emit("onPushRegistration", { kind: "apns", token: rotated });
  await turn();
  assert.deepEqual(stored.slice(2), [{ kind: "apns", token: rotated }], "only new tokens are stored");

  calls.emit("onVoipToken", { kind: "apnsVoip", token: "d4".repeat(32) });
  stop();
  stop();
  await turn();
  assert.equal(stored.length, 3, "a token queued before stopping isn't stored");
  assertUnsubscribed(push, calls);
  assert.deepEqual(reported, []);
});

test("registerForPush stores the registrations the platform already has", async () => {
  const push = linkPush({ getRegistrations: async () => [{ kind: "apns", token: APNS }] });
  linkCalls({ getVoipToken: async () => ({ kind: "apnsVoip", token: VOIP, environment: "production" }) });
  const stored = [];
  const stop = await registerForPush({ register: async value => { stored.push(value); } });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  await turn();
  assert.deepEqual(stored, [{ kind: "apns", token: APNS }, { kind: "apnsVoip", token: VOIP, environment: "production" }]);
  stop();
});

test("registerForPush stores one token at a time", async () => {
  const push = linkPush(), calls = linkCalls(), started = [], gates = [];
  const registration = registerForPush({
    register: value => {
      started.push(value.kind);
      const gate = Promise.withResolvers();
      gates.push(gate);
      return gate.promise;
    },
  });
  calls.emit("onVoipToken", { kind: "apnsVoip", token: VOIP });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  await turn();
  assert.deepEqual(started, ["apnsVoip"]);
  gates[0].resolve();
  await turn();
  assert.deepEqual(started, ["apnsVoip", "apns"]);
  assert.equal(await isSettled(registration), false, "it waits for the backend to store the APNs token");
  gates[1].resolve();
  (await registration)();
});

test("registerForPush rejects when the backend can't store the APNs token", async () => {
  const push = linkPush(), calls = linkCalls(), refused = new Error("backend refused");
  const registration = registerForPush({ register: () => Promise.reject(refused) });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  await assert.rejects(registration, error => error === refused);
  assertUnsubscribed(push, calls);
});

test("registerForPush offers a PushKit token again after the backend failed to store it", async () => {
  const push = linkPush(), calls = linkCalls(), failure = new Error("store failed"), errors = [], stored = [];
  let fail = true;
  const registration = registerForPush({
    onError: error => errors.push(error),
    register: value => {
      if (value.kind === "apnsVoip" && fail) { fail = false; throw failure; }
      stored.push(value.kind);
    },
  });
  calls.emit("onVoipToken", { kind: "apnsVoip", token: VOIP });
  await turn();
  assert.deepEqual(errors, [failure]);
  calls.emit("onVoipToken", { kind: "apnsVoip", token: VOIP });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  (await registration)();
  assert.deepEqual(stored, ["apnsVoip", "apns"]);
  assert.deepEqual(reported, []);
});

test("registerForPush rejects when the platform can't register, and reports later failures", async () => {
  let push = linkPush();
  let calls = linkCalls();
  const rejected = registerForPush({ register: () => {} });
  push.emit("onPushRegistrationError", { kind: "apns", message: "no valid aps-environment entitlement" });
  await assert.rejects(rejected, { name: "Error", message: "Push registration failed: no valid aps-environment entitlement" });
  assertUnsubscribed(push, calls);

  push = linkPush();
  calls = linkCalls();
  const errors = [];
  const registration = registerForPush({ register: () => {}, onError: error => errors.push(error.message) });
  push.emit("onPushRegistrationError", { kind: "apnsVoip", message: "" });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  const stop = await registration;
  push.emit("onPushRegistrationError", { kind: "apns", message: "later" });
  push.emit("onPushRegistrationError", null);
  assert.deepEqual(errors, ["Push registration failed", "Push registration failed: later", "Push registration failed"]);
  stop();
  assertUnsubscribed(push, calls);

  linkPush({ register: async () => { throw new Error("APNs unavailable"); } });
  linkCalls();
  await assert.rejects(registerForPush({ register: () => {} }), { message: "APNs unavailable" });

  Platform.OS = "android";
  const unavailable = Object.assign(new Error("FCM registration failed: SERVICE_NOT_AVAILABLE"), { code: "SERVICE_NOT_AVAILABLE" });
  push = linkPush({ register: async () => { throw unavailable; } });
  calls = linkCalls();
  await assert.rejects(registerForPush({ register: () => {} }), error => error === unavailable, "the native error reaches the app");
  assertUnsubscribed(push, calls);
});

test("registerForPush sends errors it doesn't reject with to onError or React Native's error handler", async () => {
  let push = linkPush({ getRegistrations: async () => { throw new Error("getRegistrations failed"); } });
  linkCalls({ getVoipToken: async () => { throw new Error("getVoipToken failed"); } });
  const registration = registerForPush({ register: () => {} });
  await turn();
  push.emit("onPushRegistration", { kind: "apns", token: "not a token" });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  (await registration)();
  assert.deepEqual(reported.map(error => error.message).sort(),
    ["ConvoHop sent a malformed push registration", "getRegistrations failed", "getVoipToken failed"]);

  reported.length = 0;
  push = linkPush({ getRegistrations: async () => "registrations" });
  linkCalls();
  const thrown = new Error("onError failed"), errors = [];
  const second = registerForPush({ register: () => {}, onError: error => { errors.push(error.message); throw thrown; } });
  await turn();
  push.emit("onPushRegistration", { kind: "fcm", fid: FID });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  (await second)();
  assert.deepEqual(errors, ["ConvoHopPush returned malformed registrations", "ConvoHop sent a malformed push registration"]);
  assert.deepEqual(reported, [thrown, thrown]);
});

test("registerForPush times out when the platform token isn't stored in time", async () => {
  const push = linkPush(), calls = linkCalls(), stored = [];
  const registration = registerForPush({ register: value => { stored.push(value.kind); }, timeoutMs: 20 });
  calls.emit("onVoipToken", { kind: "apnsVoip", token: VOIP });
  await assert.rejects(registration, { name: "Error", message: "Timed out waiting for the APNs token" });
  assert.deepEqual(stored, ["apnsVoip"]);
  assertUnsubscribed(push, calls);

  linkPush();
  linkCalls();
  const stalled = registerForPush({ register: () => new Promise(() => {}), timeoutMs: 20 });
  await turn();
  await assert.rejects(stalled, { message: "Timed out waiting for the APNs token" }, "a backend that never answers");

  Platform.OS = "android";
  linkPush();
  await assert.rejects(registerForPush({ register: () => {}, timeoutMs: 1 }), { message: "Timed out waiting for the FCM registration" });
});

test("registerForPush stops when its signal aborts, and rejects with the reason if it hadn't resolved", async () => {
  const reason = new Error("Signed out");
  let push = linkPush(), calls = linkCalls();
  await assert.rejects(registerForPush({ register: () => {}, signal: AbortSignal.abort(reason) }), error => error === reason);
  assert.deepEqual([push.log, calls.log], [[], []], "an aborted signal stops it before it starts");

  push = linkPush();
  calls = linkCalls();
  const signingOut = new AbortController(), stored = [], backend = Promise.withResolvers();
  const pending = registerForPush({ register: value => { stored.push(value.kind); return backend.promise; }, signal: signingOut.signal });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  calls.emit("onVoipToken", { kind: "apnsVoip", token: VOIP });
  await turn();
  signingOut.abort(reason);
  await assert.rejects(pending, error => error === reason, "it doesn't wait for the backend");
  assertUnsubscribed(push, calls);
  assert.equal(getEventListeners(signingOut.signal, "abort").length, 0);
  backend.resolve();
  await turn();
  assert.deepEqual(stored, ["apns"], "the PushKit token queued behind it isn't stored");

  push = linkPush();
  calls = linkCalls();
  const unmounted = new AbortController(), kept = [];
  const registered = registerForPush({ register: value => { kept.push(value.token); }, signal: unmounted.signal });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  const stop = await registered;
  unmounted.abort();
  push.emit("onPushRegistration", { kind: "apns", token: "c3".repeat(32) });
  await turn();
  assert.deepEqual(kept, [APNS], "aborting after it resolved stops it like the function it resolved");
  assertUnsubscribed(push, calls);
  stop();

  push = linkPush();
  calls = linkCalls();
  const unused = new AbortController();
  const stopped = registerForPush({ register: () => {}, signal: unused.signal });
  push.emit("onPushRegistration", { kind: "apns", token: APNS });
  (await stopped)();
  assert.equal(getEventListeners(unused.signal, "abort").length, 0, "stopping removes its abort listener");

  // Signals from runtimes without `reason`.
  linkPush();
  linkCalls();
  const listeners = new Set();
  const signal = { aborted: false, addEventListener: (type, listener) => listeners.add(listener),
    removeEventListener: (type, listener) => listeners.delete(listener) };
  const legacy = registerForPush({ register: () => {}, signal });
  signal.aborted = true;
  for (const listener of [...listeners]) listener();
  await assert.rejects(legacy, { name: "AbortError", message: "This operation was aborted" });
  assert.equal(listeners.size, 0);
  assert.deepEqual(reported, []);
});

test("registerForPush on Android stores each FCM token or FID and leaves the calls module alone", async () => {
  Platform.OS = "android";
  let push = linkPush({ getRegistrations: async () => [{ kind: "fcm", token: FCM_TOKEN }] }), calls = linkCalls(), stored = [];
  let stop = await registerForPush({ register: value => { stored.push(value); } });
  const refreshed = "fZ0_kq8wLx3-Tn5Ru7Vb1A:APA91bG-refreshed_value";
  push.emit("onPushRegistration", { kind: "fcm", token: FCM_TOKEN });
  push.emit("onPushRegistration", { kind: "fcm", token: refreshed });
  await turn();
  assert.deepEqual(stored, [{ kind: "fcm", token: FCM_TOKEN }, { kind: "fcm", token: refreshed }], "the repeated token isn't stored again");
  assert.ok(stored.every(Object.isFrozen));
  stop();
  assertUnsubscribed(push, calls);

  stored.length = 0;
  push = linkPush({ getRegistrations: async () => [{ kind: "fcm", fid: FID }] });
  calls = linkCalls();
  stop = await registerForPush({ register: value => { stored.push(value); } });
  const replaced = "fZ0_kq8wLx3-Tn5Ru7Vb1A";
  push.emit("onPushRegistration", { kind: "fcm", fid: FID });
  push.emit("onPushRegistration", { kind: "fcm", fid: replaced });
  push.emit("onPushRegistration", { kind: "fcm", token: FID });
  await turn();
  assert.deepEqual(stored, [{ kind: "fcm", fid: FID }, { kind: "fcm", fid: replaced }, { kind: "fcm", token: FID }],
    "the repeated FID isn't stored again, and a token isn't mistaken for an FID");
  push.emit("onPushRegistrationError", { kind: "fcm", message: "SERVICE_NOT_AVAILABLE" });
  assert.deepEqual(reported.map(error => error.message), ["Push registration failed: SERVICE_NOT_AVAILABLE"]);
  stop();
  assert.deepEqual(push.log, [["getRegistrations"], ["register"]]);
  assert.deepEqual(calls.log, []);
  assertUnsubscribed(push, calls);
});

test("registerForPush on Android passes each FCM unregistration to unregister, and stores that registration again", async () => {
  Platform.OS = "android";
  const fid = { kind: "fcm", fid: FID }, token = { kind: "fcm", token: FCM_TOKEN };
  let push = linkPush({ getRegistrations: async () => [fid] }), calls = linkCalls();
  const seen = [], record = name => value => { seen.push([name, value]); };
  let stop = await registerForPush({ register: record("register"), unregister: record("unregister") });
  push.emit("onPushUnregistration", fid);
  push.emit("onPushUnregistration", fid);
  push.emit("onPushRegistration", fid);
  push.emit("onPushRegistration", fid);
  push.emit("onPushUnregistration", token);
  await turn();
  assert.deepEqual(seen, [["register", fid], ["unregister", fid], ["unregister", fid], ["register", fid], ["unregister", token]],
    "every report reaches the backend in order, and a registration FCM ended is stored again when it comes back");
  assert.ok(seen.every(([, value]) => Object.isFrozen(value)));
  for (const event of [{ kind: "apns", token: APNS }, { kind: "fcm", token: FCM_TOKEN, fid: FID }, { kind: "fcm" }, null])
    push.emit("onPushUnregistration", event);
  assert.equal(seen.length, 5, "malformed reports don't reach the backend");
  assert.deepEqual(reported.map(error => error.message), Array(4).fill("ConvoHop sent a malformed push registration"));
  stop();
  push.emit("onPushUnregistration", fid);
  await turn();
  assert.equal(seen.length, 5, "nothing reaches the backend once stopped");
  assertUnsubscribed(push, calls);

  reported.length = 0;
  seen.length = 0;
  push = linkPush({ getRegistrations: async () => [fid] });
  calls = linkCalls();
  stop = await registerForPush({ register: record("register") });
  push.emit("onPushUnregistration", fid);
  push.emit("onPushRegistration", fid);
  await turn();
  assert.deepEqual(seen, [["register", fid], ["register", fid]], "without unregister the report still renews the registration");

  const failure = new Error("backend unavailable"), errors = [];
  push = linkPush({ getRegistrations: async () => [fid] });
  stop = await registerForPush({ register: () => {}, unregister: () => { throw failure; }, onError: error => { errors.push(error); } });
  push.emit("onPushUnregistration", fid);
  await turn();
  assert.deepEqual(errors, [failure], "a failed deletion goes to onError and doesn't stop registration");
  push.emit("onPushRegistration", token);
  await turn();
  assert.equal(push.listenerCount("onPushUnregistration"), 1);
  stop();
  assert.deepEqual(reported, []);
});

test("registerForPush rejects and unsubscribes when a native event can't be subscribed to", async () => {
  const push = linkPush(), calls = linkCalls(), broken = new Error("emitter unavailable");
  push.module.onPushRegistrationError = () => { throw broken; };
  await assert.rejects(registerForPush({ register: () => {} }), error => error === broken);
  assert.equal(push.listenerCount("onPushRegistration"), 0);
  assert.deepEqual([push.log, calls.log], [[], []]);
});

test("onNotification passes each ConvoHop push the app receives or opens to the listener", () => {
  const push = linkPush(), seen = [], payloads = [];
  for (const { expected } of vectors)
    for (const payload of [expected.apnsAlert?.request.payload, expected.apnsVoip?.request.payload, expected.fcm?.request.message.data])
      if (payload) payloads.push(payload);
  assert.ok(payloads.length > 60);
  const unsubscribe = onNotification(response => seen.push(response));
  const action = index => index % 2 ? "opened" : "received";
  payloads.forEach((payload, index) => push.emit("onNotification", { action: action(index), payload: JSON.stringify(payload) }));
  assert.deepEqual(seen, payloads.map((payload, index) => ({ action: action(index), notification: parsePushPayload(payload) })));
  assert.ok(seen.every(Object.isFrozen));
  assert.deepEqual(reported, []);

  const message = vector("message-title").fcm.request.message.data;
  for (const event of [
    { action: "dismissed", payload: JSON.stringify(message) },
    { action: "received", payload: message },
    { action: "received", payload: "{" },
    { action: "received", payload: JSON.stringify({ aps: { alert: "Hi" } }) },
    { action: "opened", payload: JSON.stringify({ convohop: "{}" }) },
    null,
    "received",
  ]) push.emit("onNotification", event);
  assert.equal(seen.length, payloads.length, "invalid events don't reach the listener");
  assert.equal(reported.length, 7);
  assert.ok(reported.every(error => error instanceof TypeError && error.message === INVALID));

  reported.length = 0;
  const failure = new Error("listener failed");
  const removeThrowing = onNotification(() => { throw failure; });
  push.emit("onNotification", { action: "received", payload: JSON.stringify(message) });
  assert.deepEqual(reported, [failure]);
  assert.equal(seen.length, payloads.length + 1, "one listener's error doesn't affect another");
  removeThrowing();
  removeThrowing();
  unsubscribe();
  assert.equal(push.listenerCount("onNotification"), 0);
  assert.throws(() => onNotification("listener"), { name: "TypeError", message: "listener must be a function" });
});

test("takeInitialNotification resolves the ConvoHop push the user opened to launch the app", async () => {
  const payload = JSON.stringify(vector("call-incoming").apnsVoip.request.payload);
  linkPush({ takeInitialNotification: async () => ({ action: "opened", payload }) });
  const opened = await takeInitialNotification();
  assert.deepEqual(opened, { action: "opened", notification: parsePushPayload(JSON.parse(payload)) });
  assert.ok(Object.isFrozen(opened));
  for (const value of [null, undefined]) {
    linkPush({ takeInitialNotification: async () => value });
    assert.equal(await takeInitialNotification(), null);
  }
  assert.deepEqual(reported, []);
  for (const value of [{ action: "received", payload }, { action: "opened", payload: "{}" }, "opened"]) {
    linkPush({ takeInitialNotification: async () => value });
    assert.equal(await takeInitialNotification(), null, JSON.stringify(value));
  }
  assert.equal(reported.length, 3);
  assert.ok(reported.every(error => error instanceof TypeError && error.message === INVALID));
});

test("unregisterFromPush unregisters an Android device from FCM and resolves the registration it removed", async () => {
  const ios = linkPush();
  await assert.rejects(unregisterFromPush(), { name: "Error", message: "unregisterFromPush is only available on Android" });
  assert.deepEqual(ios.log, []);

  Platform.OS = "android";
  for (const removed of [{ kind: "fcm", token: FCM_TOKEN }, { kind: "fcm", fid: FID }]) {
    const push = linkPush({ unregister: async () => removed });
    const result = await unregisterFromPush();
    assert.deepEqual(result, removed);
    assert.ok(Object.isFrozen(result));
    assert.deepEqual(push.log, [["unregister"]]);
  }
  for (const none of [null, undefined]) {
    linkPush({ unregister: async () => none });
    assert.equal(await unregisterFromPush(), null, "this process knew no registration");
  }
  for (const malformed of [{ kind: "apns", token: APNS }, { kind: "fcm", token: FCM_TOKEN, fid: FID }, { kind: "fcm" }, "fcm"]) {
    linkPush({ unregister: async () => malformed });
    await assert.rejects(unregisterFromPush(), { name: "TypeError", message: "ConvoHopPush returned a malformed registration" });
  }
  const failure = new Error("ConvoHop needs com.google.firebase:firebase-messaging 25.1.2 or later");
  linkPush({ unregister: async () => { throw failure; } });
  await assert.rejects(unregisterFromPush(), error => error === failure, "the platform's error passes through");
});

test("handleRemoteMessage hands an Android data message to the native handler", async () => {
  const data = vector("call-incoming").fcm.request.message.data;
  const ios = linkPush();
  await assert.rejects(handleRemoteMessage(data), { name: "Error", message: "handleRemoteMessage is only available on Android" });
  assert.deepEqual(ios.log, []);

  Platform.OS = "android";
  const push = linkPush({ handleRemoteMessage: async () => "ringing" });
  assert.equal(await handleRemoteMessage(data), "ringing");
  assert.deepEqual(push.log, [["handleRemoteMessage", JSON.stringify(data)]]);
  for (const result of ["notConvoHop", "invalid", "ignored", "message", "ringing", "stopped", "missed"]) {
    linkPush({ handleRemoteMessage: async () => result });
    assert.equal(await handleRemoteMessage({ other: "value" }), result);
  }
  linkPush({ handleRemoteMessage: async () => "shown" });
  await assert.rejects(handleRemoteMessage(data), { name: "TypeError", message: "ConvoHopPush returned an unknown result" });
  const checked = linkPush();
  for (const value of [null, [], "data", { convohop: JSON.parse(data.convohop) }, { count: 1 }])
    await assert.rejects(handleRemoteMessage(value), { name: "TypeError", message: "data must be an object of strings" });
  assert.deepEqual(checked.log, []);
});

test("setPushRecipient stores the signed-in user's IDs, or null for nobody, and rejects IDs no push would match", async () => {
  const PROJECT = "0b6f7c1e-8a2d-4c3b-9e4f-5a6b7c8d9e0f", USER = "6f1d2c3b-4a5e-4f60-8a1b-2c3d4e5f6a7b";
  for (const os of ["ios", "android"]) {
    Platform.OS = os;
    const push = linkPush();
    assert.equal(await setPushRecipient({ projectId: PROJECT, recipientId: USER, name: "Ada" }), undefined);
    assert.equal(await setPushRecipient(null), undefined);
    assert.deepEqual(push.log, [["setRecipient", { projectId: PROJECT, recipientId: USER }], ["setRecipient", null]], os);
  }

  const checked = linkPush();
  for (const value of [undefined, [], "recipient", 1])
    await assert.rejects(setPushRecipient(value), { name: "TypeError", message: "recipient must be an object or null" });
  for (const id of [undefined, "", PROJECT.toUpperCase(), "00000000-0000-0000-0000-000000000000", `{${PROJECT}}`, 1]) {
    await assert.rejects(setPushRecipient({ projectId: id, recipientId: USER }),
      { name: "TypeError", message: "projectId must be a lowercase, non-nil UUID" });
    await assert.rejects(setPushRecipient({ projectId: PROJECT, recipientId: id }),
      { name: "TypeError", message: "recipientId must be a lowercase, non-nil UUID" });
  }
  assert.deepEqual(checked.log, [], "nothing invalid reaches the device");

  const failure = new Error("The recipient couldn't be stored");
  linkPush({ setRecipient: async () => { throw failure; } });
  await assert.rejects(setPushRecipient({ projectId: PROJECT, recipientId: USER }), error => error === failure);
  await assert.rejects(setPushRecipient(null), error => error === failure, "sign-out learns the device may still accept pushes");
});
