import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createAsyncStorage, type AsyncStorage } from "@react-native-async-storage/async-storage";
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
  recoverSends,
  renewSession,
  sendDraft,
  sendMessage,
  showConversation,
  signOut,
  watchConversation,
} from "../src/client.ts";
import { bootstrapUser, connect, createConversation, startAppBackend, type ServerConfig } from "./backend.ts";
import { attempts, injectFault, startMock, type MockTarget } from "./mock.ts";
import { setConnected } from "./netinfo.ts";

let target: MockTarget;
let config: ServerConfig;

before(async () => {
  target = await startMock();
  const { communicationUrl, projectId, incarnation, credentials } = target.descriptor;
  config = { baseUrl: communicationUrl, projectId, incarnation, backendKey: credentials.backend };
});
after(() => target.close());

// A new AsyncStorage database, as on a new install.
const newStorage = (): AsyncStorage => createAsyncStorage(randomUUID());

// Every value in storage.
async function storedValues(storage: AsyncStorage): Promise<(string | null)[]> {
  return Object.values(await storage.getMany(await storage.getAllKeys()));
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

// Runs test with the device offline, then brings it back online.
async function offline<T>(test: () => Promise<T>): Promise<T> {
  setConnected(false);
  try {
    return await test();
  } finally {
    setConnected(true);
  }
}

test("a watching user sees another user's message", { timeout: 15_000 }, async () => {
  const { aliceLogin, bobLogin, conversationId } = await twoMembers("Weekend");
  const alice = await connectUser(aliceLogin, newStorage());
  const bob = await connectUser(bobLogin, newStorage());

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
    const bob = await connectUser(bobLogin, newStorage());
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

  test(`recoverSends finishes a send that an earlier launch left unconfirmed (${action})`, async () => {
    const { bobLogin, conversationId } = await twoMembers("Relaunch");
    const storage = newStorage(); // Outlives the app's launches, like AsyncStorage.
    const before = await connectUser(bobLogin, storage);
    await injectFault(target, "sendMessage", action);
    const requestId = randomUUID();
    await assert.rejects(sendMessage(before, conversationId, "Sent before the restart", requestId), unknownOutcome);

    const after = await connectUser(bobLogin, storage);
    await recoverSends(after);
    const { items } = await after.messages(conversationId);
    assert.deepEqual(items.map(message => message.text), ["Sent before the restart"]);
    assert.deepEqual(await attempts(target, "sendMessage", requestId), action === "dropBeforeCommit" ? [true, false] : [true]);
  });
}

test("a conversation store shows a draft at once, then the messages ConvoHop committed", { timeout: 15_000 }, async () => {
  const { aliceLogin, bobLogin, conversationId } = await twoMembers("Store");
  const alice = await connectUser(aliceLogin, newStorage());
  const bob = await connectUser(bobLogin, newStorage());
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
    const alice = await connectUser(aliceLogin, newStorage());
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

test("the outbox waits while the device is offline", { timeout: 15_000 }, async () => {
  const { aliceLogin, conversationId } = await twoMembers("Offline");
  const alice = await connectUser(aliceLogin, newStorage());
  const outbox = openOutbox(alice);
  const store = await showConversation(alice, outbox, conversationId, () => {});
  try {
    const entry = await offline(async () => {
      const entry = sendDraft(store, "On the train");
      assert.ok(entry);
      await outbox.flush(); // Tries every waiting message now. Offline, it sends none.
      assert.deepEqual(store.snapshot.pending.map(pending => [pending.status, pendingLabel(pending)]), [["queued", "Sending…"]]);
      assert.deepEqual(await attempts(target, "sendMessage", entry.requestId), []);
      return entry;
    });
    const snapshot = await snapshotWhere(store, snapshot => snapshot.pending.length === 0 && snapshot.messages.length === 1);
    assert.deepEqual(snapshot.messages.map(message => message.text), ["On the train"]);
    assert.deepEqual(await attempts(target, "sendMessage", entry.requestId), [false]);
  } finally {
    store.close();
    await outbox.close();
  }
});

test("the outbox sends what it saved before the app stopped", { timeout: 15_000 }, async () => {
  const { aliceLogin, conversationId } = await twoMembers("Restart");
  const storage = newStorage();
  const restarted = await offline(async () => {
    const before = await connectUser(aliceLogin, storage);
    const outbox = openOutbox(before);
    const store = await showConversation(before, outbox, conversationId, () => {});
    sendDraft(store, "Sent after the restart");
    store.close();
    await outbox.close(); // The app stops with the message unsent.
    assert.ok((await storedValues(storage)).some(value => value?.includes("Sent after the restart")));
    return openOutbox(await connectUser(aliceLogin, storage));
  });
  try {
    await restarted.flush(); // Back online, it sends what it saved.
    assert.deepEqual(restarted.entries.map(entry => [entry.text, entry.status]), [["Sent after the restart", "sent"]]);
    const after = await connectUser(aliceLogin, storage);
    const { items } = await after.messages(conversationId);
    assert.deepEqual(items.map(message => message.text), ["Sent after the restart"]);
  } finally {
    await restarted.close();
  }
});

test("another user's sign-in deletes what the previous user left on the device", { timeout: 15_000 }, async () => {
  const { aliceLogin, bobLogin, conversationId } = await twoMembers("Shared phone");
  const storage = newStorage();
  await offline(async () => {
    const alice = await connectUser(aliceLogin, storage);
    const outbox = openOutbox(alice);
    const store = await showConversation(alice, outbox, conversationId, () => {});
    sendDraft(store, "Alice's draft");
    store.close();
    await outbox.close(); // The app stops without signing Alice out.
  });
  assert.ok((await storedValues(storage)).some(value => value?.includes("Alice's draft")));

  const bob = await connectUser(bobLogin, storage);
  assert.deepEqual(await storage.getAllKeys(), ["owner"]); // Bob's claim. Alice's unsent message is gone.
  assert.deepEqual((await bob.messages(conversationId)).items, []);
});

test("signing out during a send leaves the storage empty", { timeout: 15_000 }, async () => {
  const { aliceLogin, conversationId } = await twoMembers("Sign-out");
  const storage = newStorage();
  const alice = await connectUser(aliceLogin, storage);
  const outbox = openOutbox(alice);
  const store = await showConversation(alice, outbox, conversationId, () => {});
  sendDraft(store, "Signing off");
  await snapshotWhere(store, snapshot => snapshot.pending.some(entry => entry.status === "sending"));
  store.close();
  await signOut(outbox, storage);
  assert.deepEqual(await storage.getAllKeys(), []);
  await alice.messages(conversationId); // A round trip, for anything still in flight to land.
  assert.deepEqual(await storage.getAllKeys(), []);
});

test("renewSession asks your backend to renew the session", async () => {
  const { bobLogin } = await twoMembers("Renewal");
  let status = 200;
  const backend = await startAppBackend(() => ({ status, body: bobLogin }));
  try {
    assert.deepEqual(await renewSession(backend, bobLogin.session), bobLogin);
    const { sessionId, sessionRevision } = bobLogin.session;
    assert.deepEqual(backend.requests, [
      {
        method: "POST",
        path: "/convohop/session/renew",
        authorization: `Bearer ${backend.appToken}`,
        body: { sessionId, expectedRevision: sessionRevision },
      },
    ]);
    status = 503;
    await assert.rejects(renewSession(backend, bobLogin.session), { message: "Session renewal failed with HTTP 503" });
  } finally {
    await backend.close();
  }
});
