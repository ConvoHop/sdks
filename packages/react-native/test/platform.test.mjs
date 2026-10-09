import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopClient, Outbox } from "@convohop/client";
import { validatePlatform } from "@convohop/core/internal";
import { createPlatform } from "@convohop/react-native";
import { AppState, appStateListenerCount, changeAppState, reported } from "react-native";
import { reply } from "../../../test/graphql-fixtures.mjs";
import { randomUUID } from "../dist/random.js";
import { sha256 } from "../dist/sha256.js";
import { URL as PlatformURL } from "../dist/url.js";
import { linkPlatform, uuid } from "./support/native.mjs";

/** A stand-in for `@react-native-community/netinfo`'s default export. */
function netInfo() {
  const listeners = new Set(), removed = [];
  return { listeners, removed,
    addEventListener(listener) {
      listeners.add(listener);
      return () => { removed.push(listener); listeners.delete(listener); };
    },
    change(state) { for (const listener of [...listeners]) listener(state); } };
}
/** A platform that the test disposes, with the app starting in `status`. */
function platformFor(t, options, status = "active") {
  AppState.currentState = status;
  const platform = createPlatform(options);
  t.after(() => { platform.dispose(); AppState.currentState = "active"; });
  return platform;
}

test("createPlatform gives @convohop/client each runtime service Hermes lacks", t => {
  const platform = platformFor(t);
  assert.ok(Object.isFrozen(platform) && Object.isFrozen(platform.connectivity) && Object.isFrozen(platform.lifecycle));
  assert.deepEqual(Object.keys(platform).sort(), ["URL", "connectivity", "dispose", "lifecycle", "randomUUID", "sha256"]);
  assert.equal(platform.randomUUID, randomUUID);
  assert.equal(platform.sha256, sha256);
  assert.equal(platform.URL, PlatformURL);
  const accepted = validatePlatform(platform);
  for (const key of ["randomUUID", "sha256", "URL", "connectivity", "lifecycle"]) assert.equal(accepted[key], platform[key], key);
  assert.equal(accepted.WebSocket, undefined, "React Native's global WebSocket is used");
});

test("the lifecycle is background only while AppState is background", t => {
  for (const [status, state] of [["active", "active"], ["background", "background"], ["inactive", "active"],
    ["unknown", "active"], ["extension", "active"], [null, "active"]])
    assert.equal(platformFor(t, {}, status).lifecycle.state, state, String(status));

  const platform = platformFor(t), states = [];
  platform.lifecycle.subscribe(state => states.push(state));
  // iOS passes through inactive on its way to and from the background, and for system overlays.
  for (const status of ["inactive", "background", "background", "inactive", "active", "inactive", "active"])
    changeAppState(status);
  assert.deepEqual(states, ["background", "active"]);
  assert.equal(platform.lifecycle.state, "active");
});

test("listener failures are reported without stopping the other listeners", t => {
  const platform = platformFor(t), calls = [], failure = new Error("listener failed");
  let removeSecond = () => {};
  platform.lifecycle.subscribe(() => { calls.push("first"); removeSecond(); throw failure; });
  removeSecond = platform.lifecycle.subscribe(() => calls.push("second"));
  const removeThird = platform.lifecycle.subscribe(state => calls.push(state));
  reported.length = 0;
  changeAppState("background");
  assert.deepEqual(calls, ["first", "background"], "a listener removed during delivery isn't called");
  assert.deepEqual(reported, [failure]);
  removeThird();
  removeThird();
  changeAppState("active");
  assert.deepEqual(calls, ["first", "background", "first"]);
  for (const listener of [undefined, null, "listener", {}]) {
    assert.throws(() => platform.lifecycle.subscribe(listener), { name: "TypeError", message: "listener must be a function" });
    assert.throws(() => platform.connectivity.subscribe(listener), { name: "TypeError", message: "listener must be a function" });
  }
});

test("connectivity follows NetInfo's isConnected, and counts unknown as online", t => {
  const alone = platformFor(t);
  assert.equal(alone.connectivity.online, true, "always online without NetInfo");
  assert.equal(typeof alone.connectivity.subscribe(() => assert.fail("never changes")), "function");

  const source = netInfo(), platform = platformFor(t, { netInfo: source }), changes = [];
  assert.equal(source.listeners.size, 1);
  assert.equal(platform.connectivity.online, true, "online until NetInfo reports");
  platform.connectivity.subscribe(online => changes.push(online));
  source.change({ isConnected: false, isInternetReachable: false });
  assert.equal(platform.connectivity.online, false);
  source.change({ isConnected: false, isInternetReachable: null });
  source.change({ isConnected: null, isInternetReachable: null });
  source.change({ isConnected: true, isInternetReachable: false });
  source.change({ isConnected: false });
  assert.deepEqual(changes, [false, true, false]);
});

test("createPlatform rejects malformed options and leaves no listener behind", () => {
  for (const options of [null, "netInfo", 1, true])
    assert.throws(() => createPlatform(options), { name: "TypeError", message: "options must be an object" }, String(options));
  for (const source of [null, "netInfo", {}, { addEventListener: true }])
    assert.throws(() => createPlatform({ netInfo: source }), { name: "TypeError", message: "netInfo must have an addEventListener function" });
  const before = appStateListenerCount();
  assert.throws(() => createPlatform({ netInfo: { addEventListener: () => undefined } }),
    { name: "TypeError", message: "netInfo.addEventListener must return an unsubscribe function" });
  assert.equal(appStateListenerCount(), before);
  const failure = new Error("NetInfo failed");
  assert.throws(() => createPlatform({ netInfo: { addEventListener() { throw failure; } } }), error => error === failure);
  assert.equal(appStateListenerCount(), before);
});

test("dispose removes the AppState and NetInfo listeners once", () => {
  const source = netInfo(), before = appStateListenerCount(), platform = createPlatform({ netInfo: source });
  assert.equal(appStateListenerCount(), before + 1);
  platform.dispose();
  platform.dispose();
  assert.equal(appStateListenerCount(), before);
  assert.equal(source.removed.length, 1);
  assert.equal(source.listeners.size, 0);
});

test("changes delivered after dispose are ignored", t => {
  let appStateListener, netInfoListener;
  const addEventListener = AppState.addEventListener;
  AppState.addEventListener = (_type, listener) => { appStateListener = listener; return { remove() {} }; };
  t.after(() => { AppState.addEventListener = addEventListener; });
  const platform = createPlatform({ netInfo: { addEventListener: listener => { netInfoListener = listener; return () => {}; } } });
  const changes = [];
  platform.lifecycle.subscribe(state => changes.push(state));
  platform.connectivity.subscribe(online => changes.push(online));
  platform.dispose();
  appStateListener("background");
  netInfoListener({ isConnected: false });
  assert.equal(platform.lifecycle.state, "active");
  assert.equal(platform.connectivity.online, true);
  assert.deepEqual(changes, []);
});

test("an outbox on the platform waits while NetInfo reports offline, and sends with native IDs once online", async t => {
  const native = linkPlatform(), source = netInfo(), platform = platformFor(t, { netInfo: source }), incarnation = uuid();
  const requests = [];
  let sequence = 0;
  const client = new ConvoHopClient({ baseUrl: "https://API.Example.test", projectId: uuid(), incarnation, principalId: uuid(),
    sessionToken: "react-native-test-session", platform,
    fetch: async (url, options) => {
      const request = JSON.parse(options.body), conversationId = request.variables.input.conversationId, at = String(++sequence);
      requests.push({ url, request });
      return reply(request, { result: { messageId: uuid(), conversationId, sequence: at, revision: "1", status: "sent",
        cursor: { incarnation, conversationId, sequence: at } } });
    } });
  const errors = [], box = new Outbox(client, { onError: error => errors.push(error) });
  t.after(() => box.close());

  source.change({ isConnected: false });
  const entry = box.send(uuid(), "sent from React Native");
  await box.flush();
  assert.deepEqual(box.entries.map(value => value.status), ["queued"]);
  assert.equal(requests.length, 0);
  source.change({ isConnected: true });
  await box.flush();
  assert.deepEqual(box.entries.map(value => value.status), ["sent"]);
  assert.deepEqual(requests.map(({ url, request }) => [String(url), request.operationName, request.variables.context.requestId]),
    [["https://api.example.test/graphql", "CommunicationSendMessage", entry.requestId]]);
  assert.match(entry.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.ok(native.log.some(([name, length]) => name === "getRandomBytes" && length === 16), "IDs come from the native generator");
  assert.deepEqual(errors, []);
});
