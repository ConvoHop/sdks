import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { ConvoHopProblem, type ConversationMessage, type RecoveryStorage } from "@convohop/client";
import { connectUser, sendMessage, watchConversation } from "../src/client.ts";
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

function memoryStorage(): RecoveryStorage {
  const items = new Map<string, string>();
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: key => void items.delete(key),
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
