import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  ConvoHopProblem,
  type ConversationMessage,
  type ConversationSnapshot,
  type ConversationStore,
} from "@convohop/client";
import {
  connectUser,
  openOutbox,
  pendingLabel,
  sendDraft,
  sendMessage,
  showConversation,
  signOut,
  watchConversation,
} from "../src/client.ts";
import { bootstrapUser, connect, createConversation, type ServerConfig } from "../src/server.ts";
import { attempts, injectFault, startMock, type MockTarget } from "./mock.ts";

let target: MockTarget;
let config: ServerConfig;

before(async () => {
  target = await startMock();
  const { communicationUrl, projectId, incarnation, credentials } = target.descriptor;
  config = { baseUrl: communicationUrl, projectId, incarnation, backendKey: credentials.backend };
});
after(() => target.close());

// localStorage, in memory.
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: index => [...items.keys()][index] ?? null,
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: key => void items.delete(key),
    clear: () => items.clear(),
  };
}

// Two signed-in users who share a new conversation.
async function twoMembers(title: string) {
  const server = await connect(config);
  const aliceLogin = await bootstrapUser(server, config, `alice-${randomUUID()}`, randomUUID());
  const bobLogin = await bootstrapUser(server, config, `bob-${randomUUID()}`, randomUUID());
  const members = [aliceLogin.session.principalId, bobLogin.session.principalId];
  const conversationId = await createConversation(server, title, members, randomUUID());
  return { aliceLogin, bobLogin, conversationId };
}

const unknownOutcome = (error: unknown) => error instanceof ConvoHopProblem && error.outcome === "unknown";

// Resolves with the store's first snapshot that passes check.
function snapshotWhere(
  store: ConversationStore,
  check: (snapshot: ConversationSnapshot) => boolean,
): Promise<ConversationSnapshot> {
  const { promise, resolve } = Promise.withResolvers<ConversationSnapshot>();
  const unsubscribe = store.subscribe(() => {
    if (check(store.snapshot)) resolve(store.snapshot);
  });
  if (check(store.snapshot)) resolve(store.snapshot);
  return promise.finally(unsubscribe);
}

test("a watching user sees another user's message", { timeout: 15_000 }, async () => {
  const { aliceLogin, bobLogin, conversationId } = await twoMembers("Weekend");
  const alice = await connectUser(aliceLogin, memoryStorage());
  const bob = await connectUser(bobLogin, memoryStorage());

  const renders: ConversationMessage[][] = [];
  const { promise: delivered, resolve } = Promise.withResolvers<ConversationMessage[]>();
  const stream = await watchConversation(alice, conversationId, messages => {
    renders.push(messages);
    if (messages.length > 0) resolve(messages);
  });
  try {
    assert.deepEqual(renders[0], []);
    const messageId = await sendMessage(bob, conversationId, "Hi Alice", randomUUID());
    const messages = await delivered;
    assert.deepEqual(
      messages.map(message => [message.messageId, message.authorId, message.text]),
      [[messageId, bobLogin.session.principalId, "Hi Alice"]],
    );
  } finally {
    stream.close();
  }
});

for (const action of ["dropBeforeCommit", "dropAfterCommit"] as const) {
  test(`sending a draft again with its request ID posts it once (${action})`, async () => {
    const { bobLogin, conversationId } = await twoMembers("Drafts");
    const bob = await connectUser(bobLogin, memoryStorage());
    await injectFault(target, "sendMessage", action);
    const requestId = randomUUID();
    await assert.rejects(sendMessage(bob, conversationId, "Still there?", requestId), unknownOutcome);
    const messageId = await sendMessage(bob, conversationId, "Still there?", requestId);
    const { items } = await bob.messages(conversationId);
    assert.deepEqual(items.map(message => [message.messageId, message.text]), [[messageId, "Still there?"]]);
    assert.deepEqual(await attempts(target, "sendMessage", requestId), [true, false]);
    // A request ID belongs to one draft. Changed text needs a new one.
    await assert.rejects(sendMessage(bob, conversationId, "Still there??", requestId), { code: "IDEMPOTENCY_CONFLICT" });
  });

  test(`connectUser finishes a send that an earlier page load left unconfirmed (${action})`, async () => {
    const { bobLogin, conversationId } = await twoMembers("Reloads");
    const storage = memoryStorage(); // Outlives the page, like localStorage.
    const before = await connectUser(bobLogin, storage);
    await injectFault(target, "sendMessage", action);
    const requestId = randomUUID();
    await assert.rejects(sendMessage(before, conversationId, "Sent before the reload", requestId), unknownOutcome);

    const after = await connectUser(bobLogin, storage);
    const { items } = await after.messages(conversationId);
    assert.deepEqual(items.map(message => message.text), ["Sent before the reload"]);
    assert.deepEqual(await attempts(target, "sendMessage", requestId), action === "dropBeforeCommit" ? [true, false] : [true]);
  });
}

test("a conversation store shows a draft at once, then the messages ConvoHop committed", { timeout: 15_000 }, async () => {
  const { aliceLogin, bobLogin, conversationId } = await twoMembers("Store");
  const alice = await connectUser(aliceLogin, memoryStorage());
  const bob = await connectUser(bobLogin, memoryStorage());
  const outbox = openOutbox(alice);
  const renders: ConversationSnapshot[] = [];
  const store = await showConversation(alice, outbox, conversationId, snapshot => renders.push(snapshot));
  try {
    assert.equal(store.snapshot.status, "live");
    assert.equal(sendDraft(store, "  "), null);
    const entry = sendDraft(store, " Hi Bob ");
    assert.ok(entry);
    assert.equal(entry.text, "Hi Bob");
    assert.deepEqual(store.snapshot.pending.map(pending => [pending.requestId, pendingLabel(pending)]), [[entry.requestId, "Sending…"]]);
    await snapshotWhere(store, snapshot => snapshot.pending.length === 0 && snapshot.messages.length === 1);

    await sendMessage(bob, conversationId, "Hi Alice", randomUUID());
    const snapshot = await snapshotWhere(store, snapshot => snapshot.messages.length === 2);
    assert.deepEqual(snapshot.messages.map(message => [message.authorId, message.text]), [
      [aliceLogin.session.principalId, "Hi Bob"],
      [bobLogin.session.principalId, "Hi Alice"],
    ]);
    assert.equal(renders.at(-1), store.snapshot);
  } finally {
    store.close();
    await outbox.close();
  }
});

for (const action of ["dropBeforeCommit", "dropAfterCommit"] as const) {
  test(`the outbox posts a draft once when the connection drops (${action})`, { timeout: 15_000 }, async () => {
    const { aliceLogin, conversationId } = await twoMembers("Outbox");
    const alice = await connectUser(aliceLogin, memoryStorage());
    const outbox = openOutbox(alice);
    const store = await showConversation(alice, outbox, conversationId, () => {});
    try {
      await injectFault(target, "sendMessage", action);
      const entry = sendDraft(store, "Still there?");
      assert.ok(entry);
      const snapshot = await snapshotWhere(store, snapshot => snapshot.pending.length === 0 && snapshot.messages.length > 0);
      assert.deepEqual(snapshot.messages.map(message => message.text), ["Still there?"]);
      // The outbox looks up the request's outcome, and sends it again with the same request ID only if ConvoHop hadn't
      // committed it.
      const expected = action === "dropBeforeCommit" ? [true, false] : [true];
      assert.deepEqual(await attempts(target, "sendMessage", entry.requestId), expected);
    } finally {
      store.close();
      await outbox.close();
    }
  });
}

test("signing out during a send leaves the storage empty", { timeout: 15_000 }, async () => {
  const { aliceLogin, conversationId } = await twoMembers("Sign-out");
  const storage = memoryStorage();
  const alice = await connectUser(aliceLogin, storage);
  const outbox = openOutbox(alice);
  const store = await showConversation(alice, outbox, conversationId, () => {});
  sendDraft(store, "Signing off");
  await snapshotWhere(store, snapshot => snapshot.pending.some(entry => entry.status === "sending"));
  assert.ok(storage.length > 0);
  store.close();
  await signOut(outbox, storage);
  assert.equal(storage.length, 0);
  await alice.messages(conversationId); // A round trip, for anything still in flight to land.
  assert.equal(storage.length, 0);
});
