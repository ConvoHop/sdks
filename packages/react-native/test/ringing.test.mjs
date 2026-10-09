import test from "node:test";
import assert from "node:assert/strict";
import { watchRingingCalls } from "@convohop/react-native";
import { reported } from "react-native";
import { linkCalls, snapshot, turn, uuid } from "./support/native.mjs";

const NOW = 1_800_000_000_000;
const page = (alertIds, fields = {}) => ({ items: alertIds.map(alertId => ({ alertId })), nextCursor: null, complete: true,
  refreshRequired: false, partialReason: null, ...fields });
const session = (state = "ACTIVE", participation = null) =>
  ({ snapshot: { state, myParticipation: participation === null ? null : { state: participation } } });

/** A fake client whose listings come from `pages`, one call per page, repeating the last. A function page is called for its listing. */
function fakeClient({ pages = [page([])], liveSession = async () => session() } = {}) {
  const log = [];
  let next = 0;
  return {
    log,
    liveAlerts: {
      list: async options => {
        log.push(["list", options]);
        const listing = pages[Math.min(next++, pages.length - 1)];
        return typeof listing === "function" ? listing() : listing;
      },
    },
    liveSession: async id => { log.push(["liveSession", id]); return liveSession(id); },
  };
}
/** A promise that the test settles. */
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
/** Lets the watcher's pending native calls and listings finish. */
async function settle() {
  for (let index = 0; index < 5; index++) await turn();
}
/** Advances the clock by `ms` and lets the check it starts finish. */
async function advance(t, ms) {
  t.mock.timers.tick(ms);
  await settle();
}
const stops = calls => calls.log.filter(([method]) => method === "stopRinging");
const lists = client => client.log.filter(([method]) => method === "list");

test.beforeEach(t => {
  reported.length = 0;
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: NOW });
});

test("a ring whose alert is missing from two complete listings in a row stops, with the reason its live session gives", async t => {
  const ringing = snapshot(), other = uuid();
  const calls = linkCalls({ getCalls: async () => [ringing] });
  const client = fakeClient({
    pages: [page([other], { nextCursor: "c1", complete: false }), page([ringing.alertId]), page([other]), page([ringing.alertId]),
      page([]), page([])],
    liveSession: async () => session("ACTIVE", "JOINED"),
  });
  const unwatch = watchRingingCalls(client);
  await settle();
  assert.deepEqual(lists(client), [], "nothing is listed before the first interval");
  await advance(t, 3000);
  assert.deepEqual(lists(client), [["list", {}], ["list", { cursor: "c1" }]], "it pages through the listing");
  await advance(t, 3000);
  await advance(t, 3000);
  assert.deepEqual(stops(calls), [], "an alert that comes back resets the count");
  await advance(t, 3000);
  assert.deepEqual(stops(calls), []);
  await advance(t, 3000);
  assert.deepEqual(client.log.slice(-2), [["list", {}], ["liveSession", ringing.liveSessionId]]);
  assert.deepEqual(stops(calls), [["stopRinging", ringing.id, "answered"]]);
  const count = client.log.length;
  await advance(t, 30000);
  assert.equal(client.log.length, count, "nothing is listed while nothing rings");
  assert.deepEqual(reported, []);
  unwatch();
  assert.equal(calls.listenerCount("onCallEvent"), 0);
});

test("the stop reason is ended, answered, expired or stopped", async t => {
  const problem = code => Object.assign(new Error(code), { code });
  const cases = [
    ["an ended live session", async () => session("ENDED", "JOINED"), "ended"],
    ["a failed live session", async () => session("FAILED"), "ended"],
    ["a participation on another device", async () => session("READY", "CONNECTED"), "answered"],
    ["no participation", async () => session("ACTIVE"), "stopped"],
    ["a participation that is leaving", async () => session("ACTIVE", "LEAVING"), "stopped"],
    ["a participation that left", async () => session("ACTIVE", "LEFT"), "stopped"],
    ["a live session the user can't read", async () => { throw problem("NOT_FOUND"); }, "stopped"],
    ["a failed read", async () => { throw problem("TRANSPORT_UNKNOWN"); }, "stopped"],
  ];
  for (const [name, liveSession, reason] of cases) {
    const ringing = snapshot(), errors = [];
    const calls = linkCalls({ getCalls: async () => [ringing] });
    const unwatch = watchRingingCalls(fakeClient({ liveSession }), { onError: error => errors.push(error.code) });
    await settle();
    await advance(t, 3000);
    await advance(t, 3000);
    assert.deepEqual(stops(calls), [["stopRinging", ringing.id, reason]], name);
    assert.deepEqual(errors, name === "a failed read" ? ["TRANSPORT_UNKNOWN"] : [], name);
    unwatch();
  }
  const ringing = snapshot({ expiresAtMs: Date.now() + 7000 });
  const calls = linkCalls({ getCalls: async () => [ringing] });
  const client = fakeClient({ liveSession: async () => { t.mock.timers.tick(1000); return session("ACTIVE", "JOINED"); } });
  const unwatch = watchRingingCalls(client);
  await settle();
  await advance(t, 3000);
  await advance(t, 3000);
  assert.deepEqual(stops(calls), [["stopRinging", ringing.id, "expired"]], "a ring that expired while its session was read");
  unwatch();
});

test("a ring stops at its expiresAt at the latest, without waiting for a listing", async t => {
  const late = snapshot({ expiresAtMs: NOW - 1 }), ringing = snapshot({ expiresAtMs: NOW + 1200 });
  const calls = linkCalls({ getCalls: async () => [late, ringing] });
  const client = fakeClient({ pages: [page([late.alertId, ringing.alertId])] });
  const unwatch = watchRingingCalls(client, { intervalMs: 5000 });
  await settle();
  assert.deepEqual(stops(calls), []);
  await advance(t, 0);
  assert.deepEqual(stops(calls), [["stopRinging", late.id, "expired"]], "a ring that expired before watching stops at once");
  assert.equal(lists(client).length, 1);
  await advance(t, 1199);
  assert.equal(stops(calls).length, 1);
  await advance(t, 1);
  assert.deepEqual(stops(calls), [["stopRinging", late.id, "expired"], ["stopRinging", ringing.id, "expired"]]);
  assert.equal(lists(client).length, 1);
  unwatch();
});

test("a listing that can't prove an alert is gone changes nothing; a malformed one is reported", async t => {
  const ringing = snapshot({ expiresAtMs: NOW + 600000 }), errors = [];
  const pages = [
    page([], { refreshRequired: true }),
    page([], { complete: false }),
    { items: [{ alertId: 7 }], nextCursor: null, complete: true, refreshRequired: false },
    { items: [], nextCursor: "", complete: false, refreshRequired: false },
    { items: [], complete: true, refreshRequired: false },
    null,
    ...Array.from({ length: 10 }, (_, index) => page([], { nextCursor: "c" + index, complete: false })),
  ];
  const calls = linkCalls({ getCalls: async () => [ringing] });
  const client = fakeClient({ pages: [...pages, page([])] });
  const unwatch = watchRingingCalls(client, { onError: error => errors.push(error.message) });
  await settle();
  for (let index = 0; index < 7; index++) await advance(t, 3000);
  assert.equal(lists(client).length, 16);
  assert.deepEqual(errors, Array(4).fill("liveAlerts.list returned a malformed page"));
  assert.deepEqual(stops(calls), []);
  await advance(t, 3000);
  assert.deepEqual(stops(calls), [], "one complete listing without the alert isn't enough");
  await advance(t, 3000);
  assert.deepEqual(stops(calls), [["stopRinging", ringing.id, "stopped"]]);
  unwatch();
});

test("it tracks rings from call events, skips other calls and stops after unwatching", async t => {
  const ringing = snapshot(), errors = [];
  let release;
  const calls = linkCalls({ getCalls: () => new Promise(resolve => { release = resolve; }) });
  const client = fakeClient({ pages: [page([])] });
  const unwatch = watchRingingCalls(client, { onError: error => errors.push(error) });
  calls.emit("onCallEvent", { type: "answered", call: { ...ringing, state: "connecting" } });
  release([ringing]);
  await settle();
  await advance(t, 30000);
  assert.deepEqual(client.log, [], "an event newer than the snapshot wins");
  for (const call of [snapshot({ outgoing: true }), snapshot({ alertId: null }), snapshot({ state: "active" })])
    calls.emit("onCallEvent", { type: "changed", call });
  await advance(t, 30000);
  assert.deepEqual(client.log, []);
  const incoming = snapshot(), answered = snapshot();
  calls.emit("onCallEvent", { type: "incoming", call: incoming });
  calls.emit("onCallEvent", { type: "incoming", call: answered });
  await advance(t, 3000);
  calls.emit("onCallEvent", { type: "answered", call: { ...answered, state: "connecting" } });
  await advance(t, 3000);
  assert.deepEqual(stops(calls), [["stopRinging", incoming.id, "stopped"]]);
  calls.emit("onCallEvent", { type: "incoming", call: snapshot() });
  unwatch();
  unwatch();
  assert.equal(calls.listenerCount("onCallEvent"), 0);
  const count = client.log.length;
  await advance(t, 30000);
  assert.equal(client.log.length, count);
  assert.deepEqual(errors, []);
});

test("unwatching during a check requests no more pages and stops no ring", async t => {
  const ringing = snapshot();
  let calls = linkCalls({ getCalls: async () => [ringing] });
  const listing = deferred();
  let client = fakeClient({ pages: [() => listing.promise, page([])] });
  let unwatch = watchRingingCalls(client);
  await settle();
  await advance(t, 3000);
  assert.deepEqual(lists(client), [["list", {}]]);
  unwatch();
  listing.resolve(page([], { nextCursor: "c1", complete: false }));
  await settle();
  assert.deepEqual(lists(client), [["list", {}]], "a listing that answers after unwatching isn't continued");

  const read = deferred();
  calls = linkCalls({ getCalls: async () => [ringing] });
  client = fakeClient({ liveSession: () => read.promise });
  unwatch = watchRingingCalls(client);
  await settle();
  await advance(t, 3000);
  await advance(t, 3000);
  assert.deepEqual(client.log.at(-1), ["liveSession", ringing.liveSessionId]);
  unwatch();
  read.resolve(session());
  await settle();
  assert.deepEqual(stops(calls), [], "a ring isn't stopped after unwatching");

  const pending = deferred();
  linkCalls({ getCalls: () => pending.promise });
  client = fakeClient();
  watchRingingCalls(client)();
  pending.resolve([ringing]);
  await settle();
  await advance(t, 30000);
  assert.deepEqual(client.log, [], "calls that arrive after unwatching aren't watched");
  assert.deepEqual(reported, []);
});

test("errors from work that finishes after unwatching aren't reported", async t => {
  const errors = [], onError = error => errors.push(error.message), ringing = snapshot();
  const pending = deferred();
  linkCalls({ getCalls: () => pending.promise });
  watchRingingCalls(fakeClient(), { onError })();
  pending.reject(new Error("late calls"));
  await settle();

  linkCalls({ getCalls: async () => [ringing] });
  const listing = deferred();
  let unwatch = watchRingingCalls(fakeClient({ pages: [() => listing.promise] }), { onError });
  await settle();
  await advance(t, 3000);
  unwatch();
  listing.reject(new Error("late listing"));
  await settle();

  const read = deferred(), client = fakeClient({ liveSession: () => read.promise });
  unwatch = watchRingingCalls(client, { onError });
  await settle();
  await advance(t, 3000);
  await advance(t, 3000);
  assert.deepEqual(client.log.at(-1), ["liveSession", ringing.liveSessionId]);
  unwatch();
  read.reject(Object.assign(new Error("late read"), { code: "TRANSPORT_UNKNOWN" }));
  await settle();

  const stopping = deferred();
  const calls = linkCalls({ getCalls: async () => [ringing], stopRinging: () => stopping.promise });
  unwatch = watchRingingCalls(fakeClient(), { onError });
  await settle();
  await advance(t, 3000);
  await advance(t, 3000);
  assert.deepEqual(stops(calls), [["stopRinging", ringing.id, "stopped"]]);
  unwatch();
  stopping.reject(new Error("late stop"));
  await settle();
  assert.deepEqual(errors, []);
  assert.deepEqual(reported, []);
});

test("a failed snapshot or stop is reported, and watching continues", async t => {
  const ringing = snapshot(), errors = [];
  const calls = linkCalls({ getCalls: async () => { throw new Error("no calls"); },
    stopRinging: async () => { throw new Error("no stop"); } });
  const unwatch = watchRingingCalls(fakeClient(), { onError: error => { errors.push(error.message); throw new Error("thrown"); } });
  await settle();
  calls.emit("onCallEvent", { type: "incoming", call: ringing });
  await advance(t, 3000);
  await advance(t, 3000);
  assert.deepEqual(stops(calls), [["stopRinging", ringing.id, "stopped"]]);
  assert.deepEqual(errors, ["no calls", "no stop"]);
  assert.deepEqual(reported.map(error => error.message), ["thrown", "thrown"]);
  unwatch();
});

test("watchRingingCalls checks its arguments", () => {
  linkCalls();
  const client = fakeClient();
  assert.throws(() => watchRingingCalls(undefined), { name: "TypeError", message: "client must be a ConvoHopClient" });
  assert.throws(() => watchRingingCalls({ liveAlerts: {}, liveSession: async () => {} }), { name: "TypeError" });
  assert.throws(() => watchRingingCalls(client, null), { name: "TypeError", message: "options must be an object" });
  for (const intervalMs of [999, 60001, 1500.5, "3000", Number.NaN])
    assert.throws(() => watchRingingCalls(client, { intervalMs }),
      { name: "RangeError", message: "intervalMs must be an integer from 1000 to 60000" });
  assert.throws(() => watchRingingCalls(client, { onError: "log" }), { name: "TypeError", message: "onError must be a function" });
  watchRingingCalls(client, { intervalMs: 1000 })();
  watchRingingCalls(client, { intervalMs: 60000 })();
});
