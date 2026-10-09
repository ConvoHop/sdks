// The Web client's conversation store and outbox against the deterministic mock, over real HTTP and
// graphql-transport-ws with the same fetch and WebSocket globals a browser provides. The mock validates
// every document against the authority schema. Real media, service workers and session renewal are
// outside the mock; packages/client/test covers them with fakes.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { ConversationStore, ConvoHopClient, Outbox } from "@convohop/client";
import { ProjectServerClient } from "@convohop/server";
import { ControlClient } from "../lib/control.mjs";
import { startMockTarget } from "../mock/server.mjs";

let mock, control;
const cleanup = [];
before(async () => {
  mock = await startMockTarget({ seed: "client-store" });
  control = new ControlClient(mock.descriptor.control);
});
after(() => mock?.close());
beforeEach(() => control.reset());
afterEach(() => { for (const item of cleanup.splice(0)) item.close(); });

const track = item => { cleanup.push(item); return item; };

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, value); }
  removeItem(key) { this.#values.delete(key); }
}

/** Creates the principals and a conversation they all belong to; each user gets a client with their own session. */
async function conversation(names = ["alice", "bob"]) {
  const { communicationUrl: baseUrl, projectId, incarnation, credentials } = mock.descriptor;
  const backend = new ProjectServerClient({ baseUrl, projectId, incarnation, backendKey: credentials.backend });
  await backend.initialize();
  const users = [];
  for (const name of names) {
    const principalId = await backend.createPrincipal(`${name}-${randomUUID()}`);
    const { sessionToken } = await backend.issueSession(principalId, randomUUID());
    const connect = (options = {}) => new ConvoHopClient({ baseUrl, projectId, incarnation, principalId, sessionToken, ...options });
    users.push({ principalId, connect, client: connect() });
  }
  const { conversationId } = await backend.createConversation("Client store",
    users.map(({ principalId }) => ({ principalId, role: "member" })));
  return { conversationId, users };
}

function describeState(source) {
  const snapshot = source.snapshot;
  if (!snapshot) return JSON.stringify(source.entries.map(entry => entry.status));
  return JSON.stringify({ status: snapshot.status, messages: snapshot.messages.map(message => message.text),
    pending: snapshot.pending.map(entry => entry.status), error: snapshot.error?.message });
}

/** Resolves with the first truthy `check()`, evaluated now and after every change `source` reports. */
function until(source, check, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => undefined;
    const timer = setTimeout(() => { unsubscribe(); reject(new Error(`timed out; last state ${describeState(source)}`)); }, timeoutMs);
    const evaluate = () => {
      let result;
      try { result = check(); } catch (error) { clearTimeout(timer); unsubscribe(); reject(error); return; }
      if (result) { clearTimeout(timer); unsubscribe(); resolve(result); }
    };
    unsubscribe = source.subscribe(evaluate);
    evaluate();
  });
}

const texts = store => store.snapshot.messages.map(message => message.text);
const sendRequests = async () => (await (await fetch(`${mock.descriptor.control}/log`)).json()).entries
  .filter(entry => entry.kind === "request" && entry.field === "sendMessage");

describe("a conversation store over the wire", () => {
  test("loads, sends optimistically and follows another member's messages", async () => {
    const { conversationId, users: [alice, bob] } = await conversation();
    const store = track(new ConversationStore(alice.client, conversationId));
    await store.open();
    assert.equal(store.snapshot.status, "live");
    assert.equal(store.snapshot.conversation.conversationId, conversationId);
    assert.equal(store.snapshot.conversation.membership.principalId, alice.principalId);
    assert.deepEqual(store.snapshot.messages, []);
    assert.deepEqual(store.snapshot.receipts.map(receipt => receipt.principalId),
      [alice.principalId, bob.principalId].sort());
    const roster = await alice.client.members(conversationId);
    assert.deepEqual(roster.items.map(member => member.principalId).sort(), [alice.principalId, bob.principalId].sort());

    const entry = store.send("hello bob", { draft: "a1" });
    assert.deepEqual(store.snapshot.pending.map(item => [item.requestId, item.text, item.status]),
      [[entry.requestId, "hello bob", "sending"]]);
    assert.deepEqual(store.snapshot.messages, []);
    await until(store, () => store.snapshot.messages.length === 1 && store.snapshot.pending.length === 0);
    const [hello] = store.snapshot.messages;
    assert.deepEqual([hello.text, hello.authorId, hello.props], ["hello bob", alice.principalId, { draft: "a1" }]);
    assert.deepEqual(store.outbox.entries, [], "a sent entry is released once its message is loaded");

    await bob.client.send(conversationId, "hi alice");
    await until(store, () => store.snapshot.messages.length === 2);
    assert.deepEqual(texts(store), ["hello bob", "hi alice"]);
    assert.equal(store.snapshot.messages[1].authorId, bob.principalId);
    assert.equal(store.snapshot.status, "live");
    assert.equal(store.snapshot.error, undefined);
  });

  test("shows another member's edit and deletion with the authority's revision", async () => {
    const { conversationId, users: [alice, bob] } = await conversation();
    const store = track(new ConversationStore(alice.client, conversationId));
    await store.open();
    await bob.client.send(conversationId, "teh plan");
    const sent = await until(store, () => store.snapshot.messages[0]);
    const edited = await bob.client.edit(sent, "the plan");
    await until(store, () => store.snapshot.messages[0].text === "the plan");
    assert.equal(store.snapshot.messages[0].revision, edited.revision);
    const deleted = await bob.client.delete(edited);
    assert.deepEqual([deleted.deleted, deleted.text, deleted.props], [true, null, null], "a deletion has no text or props");
    await until(store, () => store.snapshot.messages[0].deleted);
    assert.equal(store.snapshot.messages.length, 1);
    assert.equal(store.snapshot.messages[0].messageId, sent.messageId);
    assert.deepEqual([store.snapshot.messages[0].text, store.snapshot.messages[0].props, store.snapshot.messages[0].revision],
      [null, null, deleted.revision], "the store shows the deletion as sent");
  });

  test("reports reading once and shows each member's receipt to the other", async () => {
    const { conversationId, users: [alice, bob] } = await conversation();
    const aliceStore = track(new ConversationStore(alice.client, conversationId));
    const bobStore = track(new ConversationStore(bob.client, conversationId));
    await Promise.all([aliceStore.open(), bobStore.open()]);
    bobStore.send("read me");
    const message = await until(aliceStore, () => aliceStore.snapshot.messages[0]);
    const receiptOf = (store, principalId) => store.snapshot.receipts.find(receipt => receipt.principalId === principalId);

    assert.equal(await aliceStore.markRead(), true);
    assert.equal(receiptOf(aliceStore, alice.principalId).readThroughSequence, message.sequence);
    const seen = await until(bobStore, () => receiptOf(bobStore, alice.principalId).readThroughSequence === message.sequence &&
      receiptOf(bobStore, alice.principalId));
    assert.equal(seen.deliveredThroughSequence, message.sequence, "reading also covers delivery");
    assert.equal(await aliceStore.markRead(), false, "the newest message is already read");
    assert.equal(await aliceStore.markDelivered(), false, "reading already covered delivery");
    const authority = await bob.client.receipts(conversationId);
    assert.equal(authority.items.find(receipt => receipt.principalId === alice.principalId).readThroughSequence, message.sequence);
  });

  test("loads older history beyond the authority's page cap", async () => {
    const { conversationId, users: [alice, bob] } = await conversation();
    for (const text of ["one", "two", "three", "four", "five"]) await bob.client.send(conversationId, text);
    const store = track(new ConversationStore(alice.client, conversationId));
    await store.open();
    assert.deepEqual(texts(store), ["three", "four", "five"]);
    assert.equal(store.snapshot.hasOlder, true);
    assert.equal(await store.loadOlder(), true);
    assert.deepEqual(texts(store), ["one", "two", "three", "four", "five"]);
    assert.equal(store.snapshot.hasOlder, false);
    assert.equal(await store.loadOlder(), false);
  });

  test("reconnects after the socket drops and catches up on what it missed", async () => {
    const { conversationId, users: [alice, bob] } = await conversation();
    const store = track(new ConversationStore(alice.client, conversationId));
    await store.open();
    const subscribed = { kind: "subscribe", match: { conversationId, principalId: alice.principalId } };
    await control.waitLog(subscribed);
    assert.deepEqual(await control.realtimeDrop({ conversationId }), { closed: 1 });
    await bob.client.send(conversationId, "while you were away");
    await until(store, () => texts(store).includes("while you were away"));
    await control.waitLog({ ...subscribed, count: 2 });
    await bob.client.send(conversationId, "welcome back");
    await until(store, () => texts(store).includes("welcome back"));
    assert.deepEqual(texts(store), ["while you were away", "welcome back"]);
    assert.equal(store.snapshot.status, "live");
  });
});

describe("an outbox over the wire", () => {
  // Resolution decides: a request the authority never saw is sent again with its identity; a commit is never resent.
  for (const [action, resent] of [["dropBeforeCommit", true], ["dropAfterCommit", false]]) {
    test(`settles a send whose response was lost (${action}) without duplicating it`, async () => {
      const { conversationId, users: [alice, bob] } = await conversation();
      const store = track(new ConversationStore(alice.client, conversationId));
      await store.open();
      await control.fault({ field: "sendMessage", action });
      const { requestId } = store.send("exactly once");
      await until(store, () => store.snapshot.pending[0]?.status === "unknown");
      await until(store, () => store.snapshot.messages.length === 1 && store.snapshot.pending.length === 0);
      assert.deepEqual((await sendRequests()).map(entry => [entry.requestId, entry.dropped]),
        resent ? [[requestId, true], [requestId, false]] : [[requestId, true]]);
      assert.deepEqual((await bob.client.messages(conversationId)).items.map(message => message.text), ["exactly once"]);
    });
  }

  test("a reload resumes an uncertain send from saved state without sending it twice", async () => {
    const { conversationId, users: [alice, bob] } = await conversation();
    const storage = new MemoryStorage(), key = `convohop.outbox:${mock.descriptor.projectId}:${alice.principalId}`;
    const before = track(new Outbox(alice.connect({ recoveryStorage: storage }), { persist: true }));
    await control.fault({ field: "sendMessage", action: "dropAfterCommit" });
    const { requestId } = before.send(conversationId, "survives a reload");
    await until(before, () => before.entries[0]?.status === "unknown");
    before.close();
    assert.deepEqual(JSON.parse(storage.getItem(key)).map(entry => [entry.requestId, entry.attempted]), [[requestId, true]]);

    const client = alice.connect({ recoveryStorage: storage });
    const outbox = track(new Outbox(client, { persist: true }));
    const restored = await until(outbox, () => outbox.entries.length > 0 && outbox.entries);
    assert.deepEqual(restored.map(entry => [entry.requestId, entry.status, entry.text]), [[requestId, "unknown", "survives a reload"]]);
    const store = track(new ConversationStore(client, conversationId, { outbox }));
    await store.open();
    await until(store, () => store.snapshot.messages.length === 1 && store.snapshot.pending.length === 0);
    assert.deepEqual((await sendRequests()).map(entry => [entry.requestId, entry.dropped]), [[requestId, true]]);
    assert.deepEqual((await bob.client.messages(conversationId)).items.map(message => message.text), ["survives a reload"]);
    assert.equal(storage.getItem(key), null, "nothing is left to send after a reload");
  });

  test("keeps one conversation's messages in order behind a rate limit", async () => {
    const { conversationId, users: [alice, bob] } = await conversation();
    const store = track(new ConversationStore(alice.client, conversationId));
    await store.open();
    await control.fault({ field: "sendMessage", action: "rateLimit", retryAfterSeconds: 1 });
    const first = store.send("first"), second = store.send("second");
    await until(store, () => store.snapshot.pending[0]?.status === "queued");
    assert.deepEqual(store.snapshot.pending.map(entry => [entry.requestId, entry.status]),
      [[first.requestId, "queued"], [second.requestId, "queued"]]);
    await until(store, () => store.snapshot.messages.length === 2 && store.snapshot.pending.length === 0);
    assert.deepEqual(texts(store), ["first", "second"]);
    const requests = await sendRequests();
    assert.deepEqual(requests.map(entry => [entry.requestId, entry.code]),
      [[first.requestId, "RATE_LIMITED"], [first.requestId, null], [second.requestId, null]]);
    assert.deepEqual((await bob.client.messages(conversationId)).items.map(message => message.text), ["second", "first"]);
  });
});
