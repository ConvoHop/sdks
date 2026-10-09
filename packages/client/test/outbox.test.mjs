import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopClient, Outbox } from "@convohop/client";
import { reply, resolution } from "../../../test/graphql-fixtures.mjs";
import { asyncStorage } from "../../../test/recovery-fixtures.mjs";

const id = () => crypto.randomUUID();
const turn = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate, message = "condition") {
  for (let index = 0; index < 1000 && !predicate(); index++) await turn();
  assert.ok(predicate(), "timed out waiting for " + message);
}
function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); } };
}
function connectivity(online = true) {
  const listeners = new Set();
  return { listeners, get online() { return online; },
    set(value) { online = value; for (const listener of listeners) listener(value); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
function lifecycle(state = "active") {
  const listeners = new Set();
  return { listeners, get state() { return state; },
    set(value) { state = value; for (const listener of listeners) listener(value); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
function problem(code, status, outcome = "rejected", extra = {}) {
  return Response.json({ errors: [{ message: "Fixture " + code, extensions: { code, outcome, status, ...extra } }] });
}
/**
 * Clients of one fake authority that commits each request ID at most once. `onSend` and `onResolve` can answer a
 * request first; when they return undefined the authority commits the send, or reports what it has committed.
 * `client(options)` overrides the client's options, such as its storage or a `fetch` that wraps `setup.fetch`.
 */
function authority({ recoveryStorage, projectId = id(), incarnation = id(), principalId = id(), clientOptions = {} } = {}) {
  const setup = { projectId, incarnation, principalId, sends: [], resolves: [], committed: new Map(), sequence: 0,
    onSend: undefined, onResolve: undefined };
  setup.ack = conversationId => {
    const sequence = String(++setup.sequence);
    return { messageId: id(), conversationId, sequence, revision: "1", status: "sent", cursor: { incarnation, conversationId, sequence } };
  };
  setup.commit = request => {
    const { requestId } = request.variables.context;
    if (!setup.committed.has(requestId)) setup.committed.set(requestId, setup.ack(request.variables.input.conversationId));
    return setup.committed.get(requestId);
  };
  setup.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    if (request.operationName === "CommunicationSendMessage") {
      setup.sends.push(request);
      return (await setup.onSend?.(request)) ?? reply(request, { result: setup.commit(request) });
    }
    if (request.operationName === "CommunicationResolveRequest") {
      setup.resolves.push(request);
      const answer = await setup.onResolve?.(request);
      if (answer) return answer;
      const { requestId } = request.variables.input, ack = setup.committed.get(requestId);
      return reply(request, { result: ack ? resolution(requestId, "committed", { messageAck: ack }) : resolution(requestId, "notObservedYet") });
    }
    throw new Error("Unexpected operation " + request.operationName);
  };
  setup.client = (options = {}) => new ConvoHopClient({ baseUrl: "http://localhost:18080", projectId, incarnation, principalId,
    sessionToken: "outbox-test-session", ...(recoveryStorage ? { recoveryStorage } : {}), ...clientOptions, fetch: setup.fetch, ...options });
  return setup;
}
/**
 * A page's storage over the browser's `values` and its connection to the authority. After `unloadAfter(steps)`, the
 * page writes or sends that many more times and unloads before its next write or send: that and later ones are lost.
 * `log` names the steps taken since: `record` writes the client's recovery records, `entry` the outbox's entries.
 */
function page(values, asynchronous = false) {
  const value = { log: [], steps: Infinity, unloaded: false };
  const step = name => {
    if (value.log.length >= value.steps) { value.unloaded = true; return false; }
    value.log.push(name);
    return true;
  };
  const write = (key, change) => { if (step(key.startsWith("convohop.requests:") ? "record" : "entry")) change(); };
  const storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, text) => write(key, () => values.set(key, text)), removeItem: key => write(key, () => values.delete(key)) };
  value.storage = asynchronous ? { getItem: async key => storage.getItem(key), setItem: async (key, text) => storage.setItem(key, text),
    removeItem: async key => storage.removeItem(key) } : storage;
  value.fetch = send => async (url, options) => {
    if (!step("send")) throw new TypeError("The page unloaded before sending");
    return send(url, options);
  };
  value.unloadAfter = steps => { value.log = []; value.steps = steps; };
  return value;
}
function outbox(t, client, options = {}) {
  const errors = [], value = new Outbox(client, { connectivity: connectivity(), onError: error => errors.push(error), ...options });
  t.after(() => { void value.close(); });
  return { outbox: value, errors };
}
const statuses = box => box.entries.map(entry => entry.status);
const texts = requests => requests.map(request => request.variables.input.text);
const sendIds = setup => setup.sends.map(request => request.variables.context.requestId);
const sorted = values => [...values].sort();
const savedEntry = (conversationId, text) => ({ requestId: id(), conversationId, text, props: {}, createdAt: new Date().toISOString(),
  attempted: false });
/** The storage keys of the outbox slots under `key`. */
const slotKeys = (values, key) => sorted([...values.keys()].filter(name => name === key || name.startsWith(key + ":")));
const savedTexts = (values, name) => JSON.parse(values.get(name) ?? "[]").map(item => item.text);
const webLocks = typeof globalThis.navigator?.locks?.request === "function";
const lockKinds = [["Web Locks", !webLocks && "the runtime has no Web Locks"], ["locks within one JavaScript context", false]];
/** Makes outboxes created during `t` coordinate as where the runtime has no Web Locks. */
function withoutWebLocks(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} });
  t.after(() => { if (previous) Object.defineProperty(globalThis, "navigator", previous); else delete globalThis.navigator; });
}

test("messages send in order per conversation with one request ID each", async t => {
  const setup = authority(), client = setup.client(), { outbox: box } = outbox(t, client);
  const first = id(), second = id(), held = deferred();
  setup.onSend = async request => { if (request.variables.input.text === "a1") await held.promise; };
  const a1 = box.send(first, "a1", { draft: 1 }), a2 = box.send(first, "a2"), b1 = box.send(second, "b1");
  await until(() => setup.sends.length === 2 && box.entries[2].status === "sent", "b1 and the start of a1");
  assert.deepEqual(sorted(texts(setup.sends)), ["a1", "b1"], "a2 waits for a1, b1 doesn't");
  assert.deepEqual(statuses(box), ["sending", "queued", "sent"]);
  held.resolve();
  await box.flush();
  assert.deepEqual(texts(setup.sends.slice(2)), ["a2"]);
  assert.deepEqual(sorted(sendIds(setup)), sorted([a1.requestId, a2.requestId, b1.requestId]));
  assert.deepEqual(setup.sends.find(request => request.variables.context.requestId === a1.requestId).variables.input.props, { draft: 1 });
  assert.deepEqual(statuses(box), ["sent", "sent", "sent"]);
  const [sent] = box.entries;
  assert.equal(sent.messageId, setup.committed.get(a1.requestId).messageId);
  assert.equal(sent.receipt.cursor.sequence, setup.committed.get(a1.requestId).sequence);
  assert.ok(Object.isFrozen(box.entries) && Object.isFrozen(sent) && Object.isFrozen(sent.props));
  assert.equal(box.entries, box.entries, "the snapshot is stable until something changes");

  box.settle(a1.requestId); box.settle(id());
  assert.deepEqual(box.entries.map(entry => entry.requestId), [a2.requestId, b1.requestId]);
  assert.throws(() => box.send("not-a-uuid", "x"), TypeError);
  assert.throws(() => box.send(first, 1), TypeError);
});

test("an uncertain send is recovered with its original request, never sent as a new message", async t => {
  for (const committedFirst of [true, false]) {
    const setup = authority(), client = setup.client(), { outbox: box, errors } = outbox(t, client);
    let failing = true;
    setup.onSend = request => {
      if (!failing) return undefined;
      failing = false;
      if (committedFirst) setup.commit(request);
      throw new Error("connection reset");
    };
    const entry = box.send(id(), "hello");
    await box.flush();
    assert.equal(box.entries[0].status, "unknown");
    assert.equal(box.entries[0].error.code, "TRANSPORT_UNKNOWN");
    assert.deepEqual(errors, [], "a recoverable outcome isn't reported as a failure");
    await box.flush();
    assert.equal(box.entries[0].status, "sent");
    assert.equal(box.entries[0].messageId, setup.committed.get(entry.requestId).messageId);
    assert.equal(box.entries[0].error, undefined);
    assert.deepEqual(sendIds(setup), committedFirst ? [entry.requestId] : [entry.requestId, entry.requestId],
      committedFirst ? "a committed request is never submitted again" : "an unobserved request is resent with its request ID");
    assert.equal(client.http.recoveryStates[0].requestId, entry.requestId);
  }
});

test("a refused message fails without being sent again until the app resends it as a new message", async t => {
  const setup = authority(), client = setup.client(), { outbox: box, errors } = outbox(t, client);
  setup.onSend = () => problem("FORBIDDEN", 403);
  const conversationId = id(), entry = box.send(conversationId, "nope"), next = box.send(conversationId, "after");
  await box.flush();
  assert.deepEqual(statuses(box), ["failed", "failed"], "a failed entry doesn't hold back the next");
  assert.equal(box.entries[0].error.code, "FORBIDDEN");
  assert.equal(box.entries[0].unconfirmed, undefined, "a definitive rejection didn't deliver the message");
  assert.deepEqual(errors.map(error => error.code), ["FORBIDDEN", "FORBIDDEN"]);
  await box.flush();
  assert.equal(setup.sends.length, 2);

  setup.onSend = undefined;
  const again = box.resend(entry.requestId);
  assert.notEqual(again.requestId, entry.requestId);
  await box.flush();
  assert.deepEqual(box.entries.map(item => [item.text, item.status]), [["after", "failed"], ["nope", "sent"]],
    "a resent message goes after the ones already waiting");
  assert.equal(setup.sends.at(-1).variables.context.requestId, again.requestId);
  assert.throws(() => box.resend(again.requestId), /Only a failed message/);
  assert.throws(() => box.resend(id()), /Only a failed message/);
  box.discard(next.requestId); box.discard(id());
  assert.deepEqual(box.entries.map(item => item.text), ["nope"]);
});

test("a waiting rejection keeps the request and retries it after the authority's delay", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.parse("2026-10-08T12:00:00Z") });
  const setup = authority(), client = setup.client(), { outbox: box, errors } = outbox(t, client);
  let limited = true;
  setup.onSend = () => {
    if (!limited) return undefined;
    limited = false;
    return problem("RATE_LIMITED", 429, "rejected", { retryAfter: 7 });
  };
  const entry = box.send(id(), "later");
  await until(() => box.entries[0].status === "queued" && box.entries[0].error !== undefined, "the rate limit");
  assert.equal(box.entries[0].error.code, "RATE_LIMITED");
  assert.equal(box.entries[0].unconfirmed, undefined);
  assert.deepEqual(errors, []);
  t.mock.timers.tick(6999);
  for (let index = 0; index < 20; index++) await turn();
  assert.equal(setup.sends.length, 1, "nothing is sent before the authority's delay");
  t.mock.timers.tick(1);
  await until(() => box.entries[0].status === "sent", "the delayed retry");
  assert.deepEqual(sendIds(setup), [entry.requestId, entry.requestId]);
});

test("offline messages wait for connectivity, and the outbox holds at most 100 unsent", async t => {
  const network = connectivity(false), setup = authority(), client = setup.client();
  const { outbox: box } = outbox(t, client, { connectivity: network });
  const conversationId = id();
  for (let index = 0; index < 100; index++) box.send(conversationId, "message " + index);
  assert.throws(() => box.send(conversationId, "one too many"), RangeError);
  await box.flush();
  assert.equal(setup.sends.length, 0);
  assert.ok(statuses(box).every(status => status === "queued"));
  network.set(true);
  await box.flush();
  assert.ok(statuses(box).every(status => status === "sent"));
  assert.deepEqual(texts(setup.sends), box.entries.map(entry => entry.text));
  box.send(conversationId, "sent ones don't count");
  await box.flush();

  network.set(false);
  const waiting = box.send(conversationId, "offline again");
  await box.flush();
  assert.equal(box.entries.find(entry => entry.requestId === waiting.requestId).status, "queued");
  assert.equal(box.entries.length, 101, "at most 100 sent entries are kept, oldest first out");
  assert.equal(box.entries.filter(entry => entry.status === "sent").length, 100);
  assert.equal(box.entries[0].text, "message 1");
});

test("an exhausted retry budget is settled read-only and fails as unconfirmed when nothing committed", async t => {
  const setup = authority(), client = setup.client(), { outbox: box, errors } = outbox(t, client);
  setup.onSend = () => { throw new Error("connection reset"); };
  const entry = box.send(id(), "lost");
  for (let attempt = 0; attempt < 4; attempt++) await box.flush();
  assert.equal(box.entries[0].status, "failed");
  assert.equal(box.entries[0].unconfirmed, true, "an uncertain message may still have been delivered");
  assert.equal(box.entries[0].error.code, "RESOLUTION_REQUIRED");
  assert.deepEqual(sendIds(setup), [entry.requestId, entry.requestId, entry.requestId], "the transport's budget is three submissions");
  assert.deepEqual(errors.map(error => error.code), ["RESOLUTION_REQUIRED"]);
  const resolves = setup.resolves.length;
  await box.flush();
  assert.equal(setup.resolves.length, resolves, "a failed entry is left alone");
});

test("a commit found after the budget is spent is sent, and an invalid or withheld resolution is handled", async t => {
  const setup = authority(), client = setup.client(), { outbox: box, errors: lateErrors } = outbox(t, client);
  const conversationId = id();
  let last, resolves = 0;
  setup.onSend = request => { last = request; throw new Error("connection reset"); };
  box.send(conversationId, "late");
  for (let attempt = 0; attempt < 3; attempt++) await box.flush();
  assert.equal(setup.sends.length, 3);
  // The last submission commits after the retry's lookup, so only the read-only resolution can find it.
  setup.onResolve = request => {
    if (++resolves > 1) return undefined;
    const answer = reply(request, { result: resolution(request.variables.input.requestId, "notObservedYet") });
    setup.commit(last);
    return answer;
  };
  await box.flush();
  assert.equal(box.entries[0].status, "sent");
  assert.equal(box.entries[0].messageId, setup.committed.get(last.variables.context.requestId).messageId);
  assert.equal(setup.sends.length, 3);
  assert.equal(resolves, 2);
  assert.deepEqual(lateErrors, []);

  for (const [name, change] of [["conversation", ack => ({ ...ack, conversationId: id() })],
    ["cursor", ack => ({ ...ack, cursor: { ...ack.cursor, sequence: "99" } })], ["status", ack => ({ ...ack, status: "pending" })]]) {
    const bad = authority(), { outbox: badBox, errors } = outbox(t, bad.client());
    bad.onSend = request => {
      bad.committed.set(request.variables.context.requestId, change(bad.ack(conversationId)));
      throw new Error("connection reset");
    };
    badBox.send(conversationId, name);
    await badBox.flush(); await badBox.flush();
    assert.deepEqual([badBox.entries[0].status, badBox.entries[0].unconfirmed], ["failed", true], name);
    assert.ok(badBox.entries[0].error instanceof TypeError, name);
    assert.equal(errors.length, 1, name);
    assert.equal(bad.sends.length, 1, name);
  }

  const withheld = authority(), { outbox: withheldBox } = outbox(t, withheld.client());
  withheld.onSend = () => { throw new Error("connection reset"); };
  withheld.onResolve = request => reply(request, { result: { ...resolution(request.variables.input.requestId, "committed"), resultWithheld: true } });
  withheldBox.send(conversationId, "withheld");
  await withheldBox.flush(); await withheldBox.flush();
  assert.equal(withheldBox.entries[0].status, "sent");
  assert.equal(withheldBox.entries[0].messageId, undefined, "a withheld result commits without the message's ID");
});

test("a persistent outbox restores unsent messages and recovers attempted ones without sending them again", async t => {
  const saved = storage(), setup = authority({ recoveryStorage: saved }), network = connectivity(false);
  assert.throws(() => new Outbox(authority().client(), { persist: true, connectivity: network }), /recoveryStorage/);
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, conversationId = id(), otherConversationId = id();
  const { outbox: before } = outbox(t, setup.client(), { persist: true, connectivity: network });
  const queued = before.send(conversationId, "queued while offline", { tag: "x" });
  await before.flush();
  assert.deepEqual(JSON.parse(saved.values.get(key)).map(item => [item.text, item.attempted, item.props]),
    [["queued while offline", false, { tag: "x" }]]);
  before.close();

  const { outbox: during } = outbox(t, setup.client(), { persist: true, connectivity: network });
  assert.deepEqual(during.entries, [], "saved messages load in the background");
  await during.flush();
  assert.deepEqual(during.entries.map(entry => [entry.requestId, entry.status]), [[queued.requestId, "queued"]]);
  setup.onSend = request => { setup.commit(request); throw new Error("the page unloaded mid-send"); };
  const uncertain = during.send(otherConversationId, "may have committed");
  network.set(true);
  await until(() => during.entries.every(entry => entry.status === "unknown"), "both attempts");
  during.close();
  assert.deepEqual(JSON.parse(saved.values.get(key)).map(item => [item.requestId, item.attempted]),
    [[queued.requestId, true], [uncertain.requestId, true]]);

  setup.onSend = undefined;
  const restart = connectivity(false), { outbox: after, errors } = outbox(t, setup.client(), { persist: true, connectivity: restart });
  await after.flush();
  assert.deepEqual(statuses(after), ["unknown", "unknown"], "attempted messages restore as uncertain");
  assert.deepEqual(after.entries[0].props, { tag: "x" });
  restart.set(true);
  await after.flush();
  assert.deepEqual(statuses(after), ["sent", "sent"]);
  assert.deepEqual(sorted(sendIds(setup)), sorted([queued.requestId, uncertain.requestId]), "recovery never submits again");
  assert.equal(saved.values.has(key), false, "sent messages aren't kept");
  assert.deepEqual(errors, []);
});

test("an attempted message whose recovery record was lost is resolved read-only after a reload", async t => {
  const saved = storage(), setup = authority({ recoveryStorage: saved }), conversationId = id();
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, committedId = id(), missingId = id();
  const createdAt = new Date().toISOString();
  saved.setItem(key, JSON.stringify([
    { requestId: committedId, conversationId, text: "committed", props: {}, createdAt, attempted: true },
    { requestId: missingId, conversationId, text: "never arrived", props: {}, createdAt, attempted: true },
  ]));
  setup.commit({ variables: { context: { requestId: committedId }, input: { conversationId } } });
  const { outbox: box, errors } = outbox(t, setup.client(), { persist: true });
  await box.flush();
  assert.deepEqual(box.entries.map(entry => [entry.text, entry.status, entry.unconfirmed]),
    [["committed", "sent", undefined], ["never arrived", "failed", true]]);
  assert.equal(box.entries[0].messageId, setup.committed.get(committedId).messageId);
  assert.equal(box.entries[1].error.code, "RESOLUTION_REQUIRED");
  assert.deepEqual(errors.map(error => error.code), ["RESOLUTION_REQUIRED"]);
  assert.deepEqual(setup.sends, [], "an attempted message is never sent again without its recovery record");
  assert.deepEqual(JSON.parse(saved.values.get(key)).map(item => [item.requestId, item.failed, item.unconfirmed]),
    [[missingId, true, true]]);
});

for (const [kind, option] of [["synchronous", "recoveryStorage"], ["asynchronous", "asyncRecoveryStorage"]]) {
  test(`a page that unloads at any point of a send leaves the message for a reload to deliver exactly once (${kind} storage)`, async t => {
    let completed = false;
    for (let steps = 0; !completed; steps++) {
      assert.ok(steps < 20, "the send never completed");
      const values = new Map(), setup = authority(), conversationId = id(), network = connectivity(false);
      const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, first = page(values, kind === "asynchronous");
      const { outbox: before } = outbox(t, setup.client({ [option]: first.storage, fetch: first.fetch(setup.fetch) }),
        { persist: true, connectivity: network });
      const { requestId } = before.send(conversationId, "sent once");
      await before.flush();
      await until(() => values.has(key), "the queued message to be saved");
      first.unloadAfter(steps);
      network.set(true);
      await before.flush();
      before.close();
      completed = !first.unloaded;
      const left = values.has(key);
      const { outbox: after, errors } = outbox(t, setup.client({ [option]: page(values, kind === "asynchronous").storage }), { persist: true });
      await after.flush();
      const at = `after ${steps} steps (${first.log.join(", ")})`;
      assert.deepEqual(after.entries.map(entry => [entry.requestId, entry.status]), left ? [[requestId, "sent"]] : [], at);
      assert.deepEqual(sendIds(setup), [requestId], "the message reaches the authority once, with its request ID, " + at);
      assert.deepEqual(errors, [], at);
      after.close();
      if (completed)
        assert.deepEqual(first.log, ["record", "entry", "record", "send", "record", "entry"],
          "the request is recorded before the outbox notes its attempt, which precedes sending it");
    }
  });
}

test("unreadable saved entries are skipped, failed ones restore as failed, and storage failures are reported", async t => {
  const saved = storage(), setup = authority({ recoveryStorage: saved });
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, conversationId = id(), failedId = id();
  saved.setItem(key, JSON.stringify([
    { requestId: failedId, conversationId, text: "failed", props: {}, createdAt: new Date().toISOString(), attempted: true, failed: true, unconfirmed: true },
    { requestId: "bad", conversationId, text: "x", props: {}, createdAt: "", attempted: false },
    { requestId: id(), conversationId, text: "missing attempted", props: {}, createdAt: "" },
  ]));
  const { outbox: box, errors } = outbox(t, setup.client(), { persist: true, connectivity: connectivity(false) });
  await box.flush();
  assert.deepEqual(box.entries.map(entry => [entry.requestId, entry.status, entry.unconfirmed]), [[failedId, "failed", true]]);
  assert.equal(errors.length, 2);
  box.close();
  for (const value of ["{", JSON.stringify({ not: "a list" })]) {
    saved.setItem(key, value);
    const { outbox: unreadable, errors: reported } = outbox(t, setup.client(), { persist: true, connectivity: connectivity(false) });
    await unreadable.flush();
    assert.deepEqual(unreadable.entries, []);
    assert.equal(reported.length, 1);
    unreadable.close();
  }

  const outboxKey = name => name.startsWith("convohop.outbox:");
  const failing = authority({ recoveryStorage: {
    getItem: name => { if (outboxKey(name)) throw new Error("storage denied"); return null; },
    setItem: name => { if (outboxKey(name)) throw new Error("quota"); },
    removeItem: () => undefined,
  } });
  const { outbox: quota, errors: storageErrors } = outbox(t, failing.client(), { persist: true, connectivity: connectivity(false) });
  quota.send(conversationId, "kept in memory");
  await quota.flush();
  assert.deepEqual(storageErrors.map(error => error.message), ["storage denied", "quota"], "a failed load doesn't look into other slots");
  assert.equal(quota.entries.length, 1);
});

for (const [locks, skip] of lockKinds) {
  test(`outboxes side by side keep each other's messages, and either takes over what the other leaves (${locks})`, { skip }, async t => {
    if (locks !== "Web Locks") withoutWebLocks(t);
    const saved = storage(), setup = authority({ recoveryStorage: saved }), conversationId = id(), network = connectivity(false);
    const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`;
    const a = outbox(t, setup.client(), { persist: true, connectivity: network });
    await a.outbox.flush();
    const b = outbox(t, setup.client(), { persist: true, connectivity: network });
    await b.outbox.flush();
    const fromA = a.outbox.send(conversationId, "from a"), fromB = b.outbox.send(conversationId, "from b");
    assert.deepEqual(slotKeys(saved.values, key), [key, key + ":1"]);
    assert.deepEqual([savedTexts(saved.values, key), savedTexts(saved.values, key + ":1")], [["from a"], ["from b"]]);

    b.outbox.close();
    await until(() => a.outbox.entries.length === 2 && !saved.values.has(key + ":1"), "a to take over b's message");
    assert.deepEqual(a.outbox.entries.map(entry => entry.requestId), [fromA.requestId, fromB.requestId]);
    assert.deepEqual(savedTexts(saved.values, key), ["from a", "from b"]);

    const c = outbox(t, setup.client(), { persist: true, connectivity: network });
    await c.outbox.flush();
    a.outbox.close();
    await until(() => c.outbox.entries.length === 2 && !saved.values.has(key), "c, started later, to take over a's messages");
    network.set(true);
    await c.outbox.flush();
    assert.deepEqual(statuses(c.outbox), ["sent", "sent"]);
    assert.deepEqual(sorted(sendIds(setup)), sorted([fromA.requestId, fromB.requestId]), "each message is sent once");
    assert.deepEqual(slotKeys(saved.values, key), []);
    assert.deepEqual([...a.errors, ...b.errors, ...c.errors], []);
  });

  test(`an outbox created while another closes continues with its messages, even while a third watches (${locks})`, { skip }, async t => {
    if (locks !== "Web Locks") withoutWebLocks(t);
    const saved = storage(), setup = authority({ recoveryStorage: saved }), network = connectivity(false);
    const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`;
    const watcher = outbox(t, setup.client(), { persist: true, connectivity: network });
    await watcher.outbox.flush();
    const mounted = outbox(t, setup.client(), { persist: true, connectivity: network });
    await mounted.outbox.flush();
    const entry = mounted.outbox.send(id(), "typed before a remount");
    mounted.outbox.close();
    const remounted = outbox(t, setup.client(), { persist: true, connectivity: network });
    await remounted.outbox.flush();
    assert.deepEqual(remounted.outbox.entries.map(value => value.requestId), [entry.requestId]);
    assert.deepEqual(watcher.outbox.entries, [], "the slot passed straight to the new outbox");
    assert.deepEqual(savedTexts(saved.values, key + ":1"), ["typed before a remount"]);

    remounted.outbox.close();
    await until(() => watcher.outbox.entries.length === 1 && !saved.values.has(key + ":1"), "the watcher to take over");
    assert.equal(watcher.outbox.entries[0].requestId, entry.requestId);
    assert.deepEqual([...watcher.errors, ...mounted.errors, ...remounted.errors], []);
  });
}

test("messages left in slots no outbox holds are taken over on start and when the app comes online or to the foreground", async t => {
  const saved = storage(), network = connectivity(false), foreground = lifecycle("background");
  const setup = authority({ recoveryStorage: saved, clientOptions: { platform: { lifecycle: foreground } } });
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, conversationId = id();
  const left = savedEntry(conversationId, "left in slot 3");
  saved.setItem(key + ":3", JSON.stringify([left]));
  saved.setItem(key + ":5", "{");
  const { outbox: box, errors } = outbox(t, setup.client(), { persist: true, connectivity: network });
  await box.flush();
  assert.deepEqual(box.entries.map(entry => entry.requestId), [left.requestId]);
  assert.deepEqual(slotKeys(saved.values, key), [key], "taken and unreadable slots are removed");
  assert.deepEqual(savedTexts(saved.values, key), ["left in slot 3"]);
  assert.deepEqual(errors.map(error => error.name), ["SyntaxError"]);

  const offline = savedEntry(conversationId, "left while offline"), hidden = savedEntry(conversationId, "left while hidden");
  saved.setItem(key + ":7", JSON.stringify([offline]));
  network.set(true);
  await until(() => box.entries.length === 2, "the look when the app comes online");
  saved.setItem(key + ":9", JSON.stringify([hidden]));
  foreground.set("active");
  await until(() => box.entries.length === 3, "the look when the app comes to the foreground");
  await box.flush();
  assert.deepEqual(statuses(box), ["sent", "sent", "sent"]);
  assert.deepEqual(sendIds(setup), [left.requestId, offline.requestId, hidden.requestId]);
  assert.deepEqual(slotKeys(saved.values, key), []);
  assert.equal(errors.length, 1);
});

test("a storage event from another page makes a running outbox watch that page's slot", { skip: !webLocks && "the runtime has no Web Locks" }, async t => {
  const target = new EventTarget();
  globalThis.addEventListener = (type, listener) => target.addEventListener(type, listener);
  globalThis.removeEventListener = (type, listener) => target.removeEventListener(type, listener);
  t.after(() => { delete globalThis.addEventListener; delete globalThis.removeEventListener; });
  const saved = storage(), foreground = lifecycle();
  const setup = authority({ recoveryStorage: saved, clientOptions: { platform: { lifecycle: foreground } } });
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, conversationId = id();
  const { outbox: box, errors } = outbox(t, setup.client(), { persist: true, connectivity: connectivity(false) });
  await box.flush();
  // Two pages open after this outbox started and each saves a message; only the first one's save reaches it.
  const pages = [1, 2].map(index => {
    const name = `${key}:${index}`, granted = deferred(), held = deferred();
    const done = globalThis.navigator.locks.request(name, { ifAvailable: true }, lock => { granted.resolve(lock); return held.promise; });
    return { name, granted: granted.promise, held, done, entry: savedEntry(conversationId, "from page " + index) };
  });
  for (const page of pages) {
    assert.ok(await page.granted, "the page holds its slot");
    saved.setItem(page.name, JSON.stringify([page.entry]));
  }
  const storageEvent = (name, newValue) => Object.assign(new Event("storage"), { key: name, newValue });
  target.dispatchEvent(storageEvent(pages[0].name, saved.getItem(pages[0].name)));
  target.dispatchEvent(storageEvent("unrelated", "x"));
  target.dispatchEvent(storageEvent(pages[1].name, null));
  for (const page of pages) { page.held.resolve(); await page.done; }
  await until(() => box.entries.length === 1 && !saved.values.has(pages[0].name), "the watched page's message");
  for (let index = 0; index < 20; index++) await turn();
  assert.ok(saved.values.has(pages[1].name), "an unwatched page's messages wait for a later look");
  foreground.set("active");
  await until(() => box.entries.length === 2 && !saved.values.has(pages[1].name), "the look when the app comes to the foreground");
  assert.deepEqual(box.entries.map(entry => entry.requestId), pages.map(page => page.entry.requestId));
  assert.deepEqual(errors, []);
});

test("taking over stops short of 200 unsent messages and leaves the rest for a later look", async t => {
  const saved = storage(), network = connectivity(false), foreground = lifecycle();
  const setup = authority({ recoveryStorage: saved, clientOptions: { platform: { lifecycle: foreground } } });
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, conversationId = id();
  const slot = (count, prefix) => Array.from({ length: count }, (_, index) => savedEntry(conversationId, prefix + index));
  const first = slot(100, "first "), second = slot(60, "second ");
  saved.setItem(key + ":1", JSON.stringify(first));
  saved.setItem(key + ":2", JSON.stringify(second));
  const { outbox: box, errors } = outbox(t, setup.client(), { persist: true, connectivity: network });
  const own = Array.from({ length: 50 }, (_, index) => box.send(conversationId, "own " + index));
  await box.flush();
  assert.equal(box.entries.length, 150, "slot 2 would bring the outbox past 200");
  assert.deepEqual(slotKeys(saved.values, key), [key, key + ":2"]);
  network.set(true);
  await box.flush();
  foreground.set("background"); foreground.set("active");
  await until(() => !saved.values.has(key + ":2"), "slot 2 to be taken over once there is room");
  await box.flush();
  assert.deepEqual(sorted(sendIds(setup)), sorted([...own, ...first, ...second].map(entry => entry.requestId)));
  assert.deepEqual(errors, []);
});

test("a seventeenth running persistent outbox of a user keeps its messages only in memory", async t => {
  const saved = storage(), setup = authority({ recoveryStorage: saved }), network = connectivity(false);
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`;
  for (let index = 0; index < 16; index++) await outbox(t, setup.client(), { persist: true, connectivity: network }).outbox.flush();
  const { outbox: extra, errors } = outbox(t, setup.client(), { persist: true, connectivity: network });
  await extra.flush();
  assert.deepEqual(errors.map(error => error.message), ["16 outboxes already save this user's messages, so this one keeps them only in memory"]);
  extra.send(id(), "only in memory");
  await extra.flush();
  assert.equal(extra.entries.length, 1);
  assert.deepEqual(slotKeys(saved.values, key), []);
});

test("messages sent before saved ones load are kept when the outbox closes meanwhile", async t => {
  const loading = deferred(), saved = asyncStorage({ onRead: key => key.startsWith("convohop.outbox:") ? loading.promise : undefined });
  const setup = authority({ clientOptions: { asyncRecoveryStorage: saved } }), network = connectivity(false);
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`;
  const first = outbox(t, setup.client(), { persist: true, connectivity: network });
  const entry = first.outbox.send(id(), "sent while loading");
  first.outbox.close();
  const second = outbox(t, setup.client(), { persist: true, connectivity: network });
  loading.resolve();
  await second.outbox.flush();
  assert.deepEqual(second.outbox.entries.map(value => value.requestId), [entry.requestId]);
  assert.deepEqual(savedTexts(saved.values, key), ["sent while loading"]);
  assert.deepEqual([...first.errors, ...second.errors], []);
});

test("in-flight and uncertain messages can't be discarded, and closing stops sending", async t => {
  const setup = authority(), client = setup.client(), { outbox: box } = outbox(t, client), held = deferred();
  setup.onSend = async () => { await held.promise; throw new Error("connection reset"); };
  const entry = box.send(id(), "in flight");
  await until(() => setup.sends.length === 1, "the send");
  assert.throws(() => box.discard(entry.requestId), /Wait for the message's outcome/);
  held.resolve();
  await box.flush();
  assert.equal(box.entries[0].status, "unknown");
  assert.throws(() => box.discard(entry.requestId), /Wait for the message's outcome/);
  box.close(); box.close();
  assert.throws(() => box.send(id(), "closed"), /closed/);
  await box.flush();
  assert.equal(setup.sends.length, 1);
  assert.equal(box.entries[0].status, "unknown", "a closed outbox keeps its entries");
});

for (const [kind, option, make] of [["synchronous", "recoveryStorage", storage], ["asynchronous", "asyncRecoveryStorage", asyncStorage]]) {
  test(`close resolves once the outbox and its sends stop writing, so storage cleared then stays clear (${kind} storage)`, async t => {
    const saved = make(), setup = authority({ clientOptions: { [option]: saved } }), entered = deferred(), held = deferred();
    const { outbox: box, errors } = outbox(t, setup.client(), { persist: true });
    setup.onSend = async () => { entered.resolve(); await held.promise; };
    const { requestId } = box.send(id(), "in flight at sign-out");
    await entered.promise;
    const closing = box.close();
    assert.equal(box.close(), closing, "every call returns the same promise");
    let closed = false;
    void closing.then(() => { closed = true; });
    saved.values.clear();
    for (let index = 0; index < 5; index++) await turn();
    assert.equal(closed, false, "a send in flight keeps the outbox writing");
    held.resolve();
    await closing;
    assert.deepEqual(sendIds(setup), [requestId]);
    assert.ok(saved.values.size > 0, "the send that settled after close() was called wrote to the cleared storage");
    saved.values.clear();
    for (let index = 0; index < 20; index++) await turn();
    assert.deepEqual([...saved.values.keys()], [], "nothing writes once close() resolves");
    assert.deepEqual(errors, []);
  });
}

test("closing an outbox that doesn't persist resolves once its sends settle", async t => {
  const setup = authority(), { outbox: box } = outbox(t, setup.client()), entered = deferred(), held = deferred();
  setup.onSend = async () => { entered.resolve(); await held.promise; };
  box.send(id(), "in flight");
  await entered.promise;
  let closed = false;
  void box.close().then(() => { closed = true; });
  for (let index = 0; index < 5; index++) await turn();
  assert.equal(closed, false, "a send in flight keeps the outbox open");
  held.resolve();
  await box.close();
  assert.deepEqual(statuses(box), ["sent"]);
});

test("close resolves even when the outbox's last save fails, and reports the failure", async t => {
  const saved = storage(), setup = authority({ recoveryStorage: saved }), entered = deferred(), held = deferred();
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`;
  const { outbox: box, errors } = outbox(t, setup.client(), { persist: true });
  setup.onSend = async () => { entered.resolve(); await held.promise; };
  box.send(id(), "in flight");
  await entered.promise;
  const remove = saved.removeItem;
  saved.removeItem = name => { if (name === key) throw new Error("storage unavailable"); remove(name); };
  const closing = box.close();
  held.resolve();
  await closing;
  assert.deepEqual(errors.map(error => error.message), ["storage unavailable"]);
  assert.equal(JSON.parse(saved.values.get(key))[0].attempted, true, "the entry the failed save meant to remove stays saved");
});

test("listener failures are reported without stopping other listeners", async t => {
  const setup = authority(), { outbox: box, errors } = outbox(t, setup.client(), { connectivity: connectivity(false) });
  let calls = 0;
  const unsubscribe = box.subscribe(() => { throw new Error("listener"); });
  box.subscribe(() => { calls++; });
  box.send(id(), "x");
  assert.equal(calls, 1);
  assert.deepEqual(errors.map(error => error.message), ["listener"]);
  unsubscribe();
  box.send(id(), "y");
  assert.equal(calls, 2);
  assert.equal(errors.length, 1);
});

test("without an injected connectivity the outbox follows the browser's online events", async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator"), target = new EventTarget(), added = new Set();
  let online = false;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { get onLine() { return online; } } });
  globalThis.addEventListener = (type, listener) => { added.add(type); target.addEventListener(type, listener); };
  globalThis.removeEventListener = (type, listener) => { added.delete(type); target.removeEventListener(type, listener); };
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "navigator", previous); else delete globalThis.navigator;
    delete globalThis.addEventListener; delete globalThis.removeEventListener;
  });
  const setup = authority(), box = new Outbox(setup.client());
  t.after(() => box.close());
  assert.deepEqual(sorted(added), ["offline", "online"]);
  box.send(id(), "x");
  await box.flush();
  assert.equal(setup.sends.length, 0);
  online = true;
  target.dispatchEvent(new Event("online"));
  await until(() => box.entries[0]?.status === "sent", "the online event");
  box.close();
  assert.equal(added.size, 0, "closing removes the listeners");
});

test("an asynchronously stored outbox sends saved messages first and stores each attempt before submitting it", async t => {
  const saved = asyncStorage(), setup = authority({ clientOptions: { asyncRecoveryStorage: saved } });
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, conversationId = id(), savedId = id(), storedFirst = [];
  saved.values.set(key, JSON.stringify([
    { requestId: savedId, conversationId, text: "saved", props: {}, createdAt: new Date().toISOString(), attempted: false },
  ]));
  setup.onSend = request => {
    storedFirst.push(JSON.parse(saved.values.get(key)).find(item => item.requestId === request.variables.context.requestId)?.attempted);
    return undefined;
  };
  const { outbox: box, errors } = outbox(t, setup.client(), { persist: true });
  const added = box.send(conversationId, "added while loading");
  assert.deepEqual(box.entries.map(entry => entry.text), ["added while loading"]);
  assert.equal(setup.sends.length, 0, "nothing is sent until saved messages have loaded");
  await box.flush();
  assert.deepEqual(sendIds(setup), [savedId, added.requestId], "saved messages keep their place");
  assert.deepEqual(storedFirst, [true, true], "each attempt is stored before its message is submitted");
  assert.deepEqual(statuses(box), ["sent", "sent"]);
  await until(() => !saved.values.has(key), "the sent outbox to be cleared");
  assert.deepEqual(errors, []);
});

test("unreadable asynchronous outbox storage is reported and new messages still send", async t => {
  for (const [stored, message] of [[undefined, "storage denied"], [42, "Stored outbox must be a string or null"]]) {
    const saved = asyncStorage({ onRead: async key => {
      if (stored === undefined && key.startsWith("convohop.outbox:")) throw new Error("storage denied");
    } });
    const setup = authority({ clientOptions: { asyncRecoveryStorage: saved } });
    if (stored !== undefined) saved.values.set(`convohop.outbox:${setup.projectId}:${setup.principalId}`, stored);
    const { outbox: box, errors } = outbox(t, setup.client(), { persist: true });
    box.send(id(), "still sent");
    await box.flush();
    assert.deepEqual(statuses(box), ["sent"]);
    assert.deepEqual(errors.map(error => error.message), [message]);
  }
});

test("messages sent while a full asynchronous outbox loads are kept across a restart, and only a longer list is cut", async t => {
  const saved = asyncStorage(), setup = authority({ clientOptions: { asyncRecoveryStorage: saved } });
  const key = `convohop.outbox:${setup.projectId}:${setup.principalId}`, conversationId = id(), network = connectivity(false);
  const entries = (count, prefix) => Array.from({ length: count }, (_, index) => ({ requestId: id(), conversationId,
    text: prefix + index, props: {}, createdAt: new Date().toISOString(), attempted: false }));
  const full = entries(100, "saved ");
  saved.values.set(key, JSON.stringify(full));
  const first = outbox(t, setup.client(), { persist: true, connectivity: network });
  const added = Array.from({ length: 100 }, (_, index) => first.outbox.send(conversationId, "added " + index));
  assert.throws(() => first.outbox.send(conversationId, "one too many while loading"), RangeError);
  await first.outbox.flush();
  const order = [...full.map(entry => entry.text), ...added.map(entry => entry.text)];
  assert.deepEqual(first.outbox.entries.map(entry => entry.text), order, "saved messages first, then those sent while loading");
  assert.throws(() => first.outbox.send(conversationId, "one too many"), RangeError);
  await until(() => JSON.parse(saved.values.get(key) ?? "[]").length === 200, "the merged outbox to be saved");
  first.outbox.close();

  const second = outbox(t, setup.client(), { persist: true, connectivity: network });
  await second.outbox.flush();
  assert.deepEqual(second.outbox.entries.map(entry => entry.text), order, "a restart loses none of them");
  second.outbox.close();

  const longer = entries(201, "longer ");
  saved.values.set(key, JSON.stringify(longer));
  const third = outbox(t, setup.client(), { persist: true, connectivity: network });
  await third.outbox.flush();
  assert.deepEqual(third.outbox.entries.map(entry => entry.text), longer.slice(0, 200).map(entry => entry.text));
  assert.deepEqual([...first.errors, ...second.errors].map(error => error.message), []);
  assert.deepEqual(third.errors.map(error => error.message),
    ["Discarded 1 of 201 saved outbox entries, beyond the limit of 200"]);
  assert.equal(setup.sends.length, 0, "nothing was sent offline");
});

test("waking for connectivity or the foreground skips backoff but keeps the authority's Retry-After", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.parse("2026-10-08T12:00:00Z") });
  const network = connectivity(), foreground = lifecycle();
  const setup = authority({ clientOptions: { platform: { lifecycle: foreground } } });
  const { outbox: box } = outbox(t, setup.client(), { connectivity: network });
  const limits = [{ retryAfter: 7 }, {}];
  setup.onSend = () => limits.length ? problem("RATE_LIMITED", 429, "rejected", limits.shift()) : undefined;
  box.send(id(), "later");
  await until(() => box.entries[0].error !== undefined, "the first rate limit");
  network.set(false); network.set(true); foreground.set("background"); foreground.set("active");
  for (let index = 0; index < 20; index++) await turn();
  assert.equal(setup.sends.length, 1, "a wake never sends before the authority's delay");
  t.mock.timers.tick(7000);
  await until(() => setup.sends.length === 2 && box.entries[0].status === "queued", "the second rate limit");
  network.set(true);
  await until(() => box.entries[0].status === "sent", "a wake to skip ordinary backoff");
  assert.equal(setup.sends.length, 3);
});

test("returning to the foreground sends due messages, and the platform's connectivity is the default", async t => {
  let online = false;
  const quiet = { get online() { return online; }, subscribe: () => () => undefined }, foreground = lifecycle("background");
  const setup = authority({ clientOptions: { platform: { connectivity: quiet, lifecycle: foreground } } });
  const { outbox: box } = outbox(t, setup.client(), { connectivity: undefined });
  box.send(id(), "x");
  await box.flush();
  assert.equal(setup.sends.length, 0, "the platform's connectivity is offline");
  online = true;
  foreground.set("active");
  await until(() => box.entries[0].status === "sent", "the foreground wake");
  box.close();
  assert.equal(foreground.listeners.size, 0, "closing unsubscribes");
  assert.throws(() => new Outbox(setup.client(), { connectivity: { online: true, subscribe: () => undefined } }),
    { name: "TypeError", message: "subscribe must return an unsubscribe function" });
});
