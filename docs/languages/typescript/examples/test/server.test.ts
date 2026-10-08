import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  bootstrapUser,
  connect,
  createConversation,
  latestMessages,
  sendAs,
  sendOnce,
  type ServerConfig,
} from "../src/server.ts";
import { attempts, injectFault, startMock, type MockTarget } from "./mock.ts";

let target: MockTarget;
let config: ServerConfig;

before(async () => {
  target = await startMock();
  const { communicationUrl, projectId, incarnation, credentials } = target.descriptor;
  config = { baseUrl: communicationUrl, projectId, incarnation, backendKey: credentials.backend };
});
after(() => target.close());

async function setUp(title: string) {
  const server = await connect(config);
  const alice = await bootstrapUser(server, config, `alice-${randomUUID()}`, randomUUID());
  const bob = await bootstrapUser(server, config, `bob-${randomUUID()}`, randomUUID());
  const members = [alice.session.principalId, bob.session.principalId];
  const conversationId = await createConversation(server, title, members, randomUUID());
  return { server, alice: members[0]!, bob: members[1]!, conversationId };
}

test("bootstrapUser returns the same principal on every login and a usable session", async () => {
  const server = await connect(config);
  const accountId = `carol-${randomUUID()}`;
  const first = await bootstrapUser(server, config, accountId, randomUUID());
  const second = await bootstrapUser(server, config, accountId, randomUUID());
  assert.equal(second.session.principalId, first.session.principalId);
  assert.notEqual(second.sessionToken, first.sessionToken);
  assert.equal(first.baseUrl, config.baseUrl);
  assert.equal(first.projectId, config.projectId);
  assert.equal(first.session.incarnation, config.incarnation);
});

test("a member's message is listed for the other member", async () => {
  const { server, alice, bob, conversationId } = await setUp("Launch plan");
  const messageId = await sendAs(server, conversationId, alice, "Ship it on Monday?", randomUUID());
  const messages = await latestMessages(server, conversationId, bob);
  assert.deepEqual(
    messages.map(message => [message.messageId, message.authorId, message.text]),
    [[messageId, alice, "Ship it on Monday?"]],
  );
});

for (const action of ["dropBeforeCommit", "dropAfterCommit"] as const) {
  test(`sendOnce posts exactly one message when the connection drops (${action})`, async () => {
    const { server, alice, bob, conversationId } = await setUp(`Lost reply ${action}`);
    await injectFault(target, "sendMessage", action);
    const requestId = randomUUID();
    const messageId = await sendOnce(server, conversationId, alice, "Did it land?", requestId);
    const messages = await latestMessages(server, conversationId, bob);
    assert.deepEqual(messages.map(message => [message.messageId, message.text]), [[messageId, "Did it land?"]]);
    // The first attempt was dropped. Only a request that never reached the authority is sent again.
    assert.deepEqual(await attempts(target, "sendMessage", requestId), action === "dropBeforeCommit" ? [true, false] : [true]);
  });
}
