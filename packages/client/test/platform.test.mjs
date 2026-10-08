import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopClient } from "@convohop/client";
import { reply } from "../../../test/graphql-fixtures.mjs";
import { asyncStorage } from "../../../test/recovery-fixtures.mjs";

const id = () => crypto.randomUUID();
const turn = () => new Promise(resolve => setImmediate(resolve));
async function until(condition, what) {
  for (let index = 0; index < 500 && !condition(); index++) await turn();
  assert.ok(condition(), `Timed out waiting for ${what}`);
}
async function settle() {
  for (let index = 0; index < 20; index++) await turn();
}
function source(key, initial) {
  const listeners = new Set();
  let value = initial;
  return { listeners, get [key]() { return value; },
    set(next) { value = next; for (const listener of listeners) listener(next); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
function sockets() {
  const opened = [];
  class Socket {
    constructor(url, protocol) { this.url = url; this.protocol = protocol; opened.push(this); }
    send() {}
    close(code) { this.closedWith = code; }
  }
  return { Socket, opened };
}
function options(extra = {}) {
  return { projectId: id(), principalId: id(), incarnation: id(), sessionToken: "fixture-private-session",
    baseUrl: "http://localhost:18080", ...extra };
}
function replay(extra) {
  const settings = options(extra), conversationId = id(), afters = [];
  const client = new ConvoHopClient(settings);
  const route = { projectId: settings.projectId, incarnation: settings.incarnation, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" };
  const setup = { client, conversationId, afters, initializations: 0,
    key: `convohop.cursor:${settings.projectId}:${settings.principalId}:${conversationId}`, incarnation: settings.incarnation };
  client.initialize = async () => { setup.initializations++; return route; };
  client.recoverPending = async () => {};
  client.events = async (requested, after) => {
    afters.push(after);
    return { items: [], complete: true, refreshRequired: false,
      nextCursor: { incarnation: settings.incarnation, conversationId: requested, sequence: String(BigInt(after?.sequence ?? "0") + 1n) } };
  };
  return setup;
}
// Node has a global WebSocket; removing it proves the stream uses the platform's.
function withoutGlobalWebSocket(t) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  delete globalThis.WebSocket;
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, "WebSocket", descriptor); });
}

test("the client takes one kind of recovery storage, checks its platform and draws request IDs from it", async () => {
  const sync = { getItem: () => null, setItem() {}, removeItem() {} };
  assert.throws(() => new ConvoHopClient(options({ recoveryStorage: sync, asyncRecoveryStorage: asyncStorage() })),
    { name: "TypeError", message: "Choose recoveryStorage or asyncRecoveryStorage, not both" });
  assert.throws(() => new ConvoHopClient(options({ platform: { WebSocket: "socket" } })),
    { name: "TypeError", message: "platform.WebSocket must be a function" });
  const issued = [id(), id()], supplied = [...issued], seen = [], conversationId = id();
  const platform = { randomUUID: () => supplied.shift() };
  const settings = options({ platform, fetch: async (_url, init) => {
    const request = JSON.parse(init.body);
    seen.push(request.variables.context.requestId);
    return reply(request, { result: { messageId: id(), conversationId, sequence: "1", revision: "1", status: "sent",
      cursor: { incarnation: settings.incarnation, conversationId, sequence: "1" } } });
  } });
  const client = new ConvoHopClient(settings);
  assert.ok(Object.isFrozen(client.platform));
  assert.notEqual(client.platform, platform, "the client keeps its own frozen copy");
  await client.send(conversationId, "hello");
  assert.deepEqual(seen, [issued[0]]);
});

test("a replay opens platform.WebSocket and keeps its cursor in asynchronous storage", async t => {
  withoutGlobalWebSocket(t);
  const { Socket, opened } = sockets(), saved = asyncStorage();
  const setup = replay({ platform: { WebSocket: Socket }, asyncRecoveryStorage: saved });
  const old = { incarnation: setup.incarnation, conversationId: setup.conversationId, sequence: "7" };
  saved.values.set(setup.key, JSON.stringify(old));
  const stream = await setup.client.watch(setup.conversationId, async () => {}, () => {});
  t.after(() => stream.close());
  assert.deepEqual(setup.afters, [old], "the saved cursor loads before the replay starts");
  assert.deepEqual(JSON.parse(saved.values.get(setup.key)), { ...old, sequence: "8" });
  assert.deepEqual(opened.map(socket => [socket.url, socket.protocol]), [["ws://localhost:18080/graphql", "graphql-transport-ws"]]);

  const odd = asyncStorage(), unreadable = replay({ platform: { WebSocket: Socket }, asyncRecoveryStorage: odd });
  odd.values.set(unreadable.key, 42);
  await assert.rejects(unreadable.client.watch(unreadable.conversationId, async () => {}, () => {}),
    { name: "TypeError", message: "Stored replay cursor must be a string or null" });
  assert.deepEqual(unreadable.afters, [], "an unreadable cursor is never replaced by a fresh replay");

  const bare = replay();
  await assert.rejects(bare.client.watch(bare.conversationId, async () => {}, () => {}),
    { name: "TypeError", message: "This runtime has no WebSocket; pass platform.WebSocket" });
});

test("coming online or to the foreground reconnects a waiting replay at once", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { Socket, opened } = sockets(), network = source("online", true), app = source("state", "active");
  const setup = replay({ platform: { WebSocket: Socket, connectivity: network, lifecycle: app } });
  const stream = await setup.client.watch(setup.conversationId, async () => {}, () => {});
  assert.equal(opened.length, 1);
  network.set(true);
  await settle();
  assert.equal(opened.length, 1, "a wake without a waiting reconnection does nothing");
  opened[0].onclose({ code: 1006 });
  network.set(false);
  await settle();
  assert.equal(opened.length, 1, "nothing reconnects before its backoff or a wake");
  network.set(true);
  await until(() => opened.length === 2, "the online wake");
  opened[1].onclose({ code: 1006 });
  app.set("background");
  await settle();
  assert.equal(opened.length, 2);
  app.set("active");
  await until(() => opened.length === 3, "the foreground wake");
  assert.equal(setup.initializations, 3, "each reconnection re-reads the route");
  stream.close();
  assert.deepEqual([network.listeners.size, app.listeners.size], [0, 0], "closing unsubscribes");
  assert.equal(opened[2].closedWith, 1000);
});
