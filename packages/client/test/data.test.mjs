import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopClient, operationCatalog } from "@convohop/client";
import { full, reply } from "../../../test/graphql-fixtures.mjs";

const id = () => crypto.randomUUID();
const at = () => new Date().toISOString();
const message = (conversationId, sequence, fields = {}) => full("Message", { messageId: id(), conversationId, authorId: id(),
  sequence, revision: "1", revisionSequence: sequence, createdAt: at(), deleted: false, text: `message ${sequence}`, props: {}, ...fields });
const receipt = (principalId, fields = {}) => full("ReadReceipt", { principalId, membershipEpoch: "1", visibilityEpoch: "1",
  deliveredThroughSequence: "2", readThroughSequence: "1", updatedAt: at(), ...fields });
const member = (conversationId, principalId, fields = {}) => full("Member", { conversationId, principalId, role: "member",
  status: "active", membershipEpoch: "1", visibilityEpoch: "1", revision: "1", visibleFromSequence: "1", canStartBroadcast: false, ...fields });
const page = (type, items, fields = {}) => full(type, { items, complete: true, refreshRequired: false, ...fields });

// A client whose authority answers each operation with handlers[operation](input, setup) and records every request.
function authority(handlers) {
  const values = new Map(), requests = [];
  const setup = { projectId: id(), incarnation: id(), principalId: id(), conversationId: id(), requests, values };
  setup.client = new ConvoHopClient({ baseUrl: "http://localhost:18080", projectId: setup.projectId,
    incarnation: setup.incarnation, principalId: setup.principalId, sessionToken: "data-test-session-secret",
    recoveryStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key) },
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body);
      const operation = Object.keys(operationCatalog).find(key => operationCatalog[key].operationName === request.operationName);
      requests.push({ operation, input: request.variables.input, requestId: request.variables.context.requestId });
      const handler = handlers[operation];
      if (!handler) throw new Error(`Unexpected operation ${operation}`);
      return reply(request, { result: handler(request.variables.input, setup) });
    } });
  return setup;
}

test("messages sends its page bounds and rejects messages from another conversation", async () => {
  let stray = false;
  const { client, conversationId, requests } = authority({
    "communication.messages": input => page("MessagePage",
      [message(stray ? id() : input.conversationId, "2"), message(input.conversationId, "1")], { complete: false, nextCursor: "1" }),
  });
  const newest = await client.messages(conversationId);
  assert.deepEqual(newest.items.map(item => item.sequence), ["2", "1"]);
  assert.equal(newest.complete, false);
  assert.equal(newest.nextCursor, "1");
  await client.messages(conversationId, "2", 1);
  assert.deepEqual(requests.map(request => request.input),
    [{ conversationId, limit: 100 }, { conversationId, limit: 1, beforeSequence: "2" }]);
  for (const before of ["02", "-1", "1.0"])
    await assert.rejects(client.messages(conversationId, before), /canonical decimal counter/);
  for (const limit of [0, 101, 1.5]) await assert.rejects(client.messages(conversationId, undefined, limit), RangeError);
  await assert.rejects(client.messages("not-a-conversation"), /canonical nonzero UUID/);
  assert.equal(requests.length, 2);
  stray = true;
  await assert.rejects(client.messages(conversationId), /Message is outside this conversation/);
});

test("send carries props and the request ID, and checks the receipt's scope", async () => {
  let shape = ack => ack;
  const { client, conversationId, incarnation, requests } = authority({
    "communication.sendMessage": (input, setup) => shape({ messageId: id(), conversationId: input.conversationId, sequence: "4",
      revision: "1", status: "sent", cursor: { incarnation: setup.incarnation, conversationId: input.conversationId, sequence: "4" } }),
  });
  const requestId = id();
  const sent = await client.send(conversationId, "hello", requestId, { topic: "launch" });
  assert.equal(sent.sequence, "4");
  assert.deepEqual(sent.cursor, { incarnation, conversationId, sequence: "4" });
  await client.send(conversationId, "plain");
  assert.deepEqual(requests.map(request => request.input),
    [{ conversationId, text: "hello", props: { topic: "launch" } }, { conversationId, text: "plain", props: {} }]);
  assert.equal(requests[0].requestId, requestId);
  assert.notEqual(requests[1].requestId, requestId);
  await assert.rejects(client.send(conversationId, "listed", undefined, ["not", "an", "object"]), /Invalid protocol object/);
  assert.equal(requests.length, 2);
  for (const change of [ack => ({ ...ack, status: "pending" }), ack => ({ ...ack, conversationId: id() }),
    ack => ({ ...ack, cursor: { ...ack.cursor, incarnation: id() } }), ack => ({ ...ack, cursor: { ...ack.cursor, sequence: "5" } })]) {
    shape = change;
    await assert.rejects(client.send(conversationId, "scoped"), /Invalid send receipt scope/);
  }
});

test("receipts are typed pages that follow the cursor", async () => {
  const other = id();
  let malformed = false;
  const { client, conversationId, principalId, requests } = authority({
    "communication.receipts": input => input.cursor === undefined
      ? page("ReceiptPage", [receipt(principalId), receipt(other, { deliveredThroughSequence: null, readThroughSequence: null, updatedAt: null })],
        { complete: false, nextCursor: "receipts-2" })
      : page("ReceiptPage", [receipt(id(), malformed ? { membershipEpoch: "01" } : {})]),
  });
  const first = await client.receipts(conversationId);
  assert.deepEqual(first.items.map(item => item.principalId), [principalId, other]);
  assert.equal(first.items[1].readThroughSequence, null);
  assert.equal(first.nextCursor, "receipts-2");
  const second = await client.receipts(conversationId, first.nextCursor);
  assert.equal(second.complete, true);
  assert.deepEqual(requests.map(request => request.input),
    [{ conversationId, limit: 100 }, { conversationId, limit: 100, cursor: "receipts-2" }]);
  malformed = true;
  await assert.rejects(client.receipts(conversationId, "receipts-2"), { code: "INVALID_RESPONSE" });
});

test("receipt reports carry the membership's epochs and must come back for the caller", async () => {
  let owner;
  const { client, conversationId, principalId, requests } = authority({
    "communication.reportReceipt": (input, setup) => receipt(owner ?? setup.principalId, { membershipEpoch: input.membershipEpoch,
      visibilityEpoch: input.visibilityEpoch, deliveredThroughSequence: input.throughSequence,
      readThroughSequence: input.kind === "read" ? input.throughSequence : null }),
  });
  const membership = member(conversationId, principalId, { membershipEpoch: "3", visibilityEpoch: "2" });
  const read = await client.reportRead(conversationId, membership, "9");
  const delivered = await client.reportDelivered(conversationId, membership, "10");
  assert.deepEqual(requests.map(request => request.input), [
    { conversationId, kind: "read", membershipEpoch: "3", visibilityEpoch: "2", throughSequence: "9" },
    { conversationId, kind: "delivered", membershipEpoch: "3", visibilityEpoch: "2", throughSequence: "10" }]);
  assert.equal(read.readThroughSequence, "9");
  assert.equal(delivered.readThroughSequence, null);
  assert.notEqual(requests[0].requestId, requests[1].requestId);
  assert.deepEqual(client.http.recoveryStates.map(state => [state.requestId, state.resolutionState]),
    requests.map(request => [request.requestId, "committed"]));
  await assert.rejects(client.reportRead(conversationId, membership, "-1"), /canonical decimal counter/);
  assert.equal(requests.length, 2);
  owner = id();
  await assert.rejects(client.reportDelivered(conversationId, membership, "11"), /Receipt does not belong to this user/);
});

test("getMessage returns only the requested message", async () => {
  let change = value => value;
  const { client, conversationId, requests } = authority({
    "communication.getMessage": input => change(message(input.conversationId, "5", { messageId: input.messageId })),
  });
  const messageId = id();
  assert.equal((await client.getMessage(conversationId, messageId)).messageId, messageId);
  assert.deepEqual(requests[0].input, { conversationId, messageId });
  for (const wrong of [value => ({ ...value, messageId: id() }), value => ({ ...value, conversationId: id() })]) {
    change = wrong;
    await assert.rejects(client.getMessage(conversationId, messageId), /Message does not match the request/);
  }
  change = () => null;
  await assert.rejects(client.getMessage(conversationId, messageId), TypeError);
});

test("members pass page options and stay inside the conversation", async () => {
  let stray = false;
  const { client, conversationId, principalId, requests } = authority({
    "communication.members": input => page("MemberPage", [member(stray ? id() : input.conversationId, principalId)],
      input.cursor === undefined ? { complete: false, nextCursor: "members-2" } : {}),
  });
  const first = await client.members(conversationId, { limit: 1 });
  assert.equal(first.items[0].principalId, principalId);
  assert.equal(first.nextCursor, "members-2");
  await client.members(conversationId, { cursor: first.nextCursor });
  assert.deepEqual(requests.map(request => request.input),
    [{ conversationId, limit: 1 }, { conversationId, limit: 100, cursor: "members-2" }]);
  await assert.rejects(client.members(conversationId, { limit: 500 }), /Page size must be 1\.\.100/);
  assert.equal(requests.length, 2);
  stray = true;
  await assert.rejects(client.members(conversationId), /Member is outside this conversation/);
});

test("inbox items are typed and an incomplete window says why", async () => {
  let partial = false;
  const { client, conversationId, requests } = authority({
    "communication.inbox": () => partial
      ? page("InboxPage", [], { complete: false, refreshRequired: true, partialReason: "INBOX_WINDOW_LIMIT" })
      : page("InboxPage", [full("InboxItem", { conversationId, title: "Launch", activityAt: at(), visibilityEpoch: "1",
        latestVisibleMessage: message(conversationId, "3"), hasUnread: true })]),
  });
  const inbox = await client.inbox();
  assert.equal(inbox.items[0].latestVisibleMessage.sequence, "3");
  assert.equal(inbox.items[0].hasUnread, true);
  assert.equal("partialReason" in inbox, false);
  partial = true;
  assert.deepEqual(await client.inbox({ limit: 10, cursor: "inbox-2" }),
    { items: [], complete: false, refreshRequired: true, nextCursor: null, partialReason: "INBOX_WINDOW_LIMIT" });
  assert.deepEqual(requests.map(request => request.input), [{ limit: 100 }, { limit: 10, cursor: "inbox-2" }]);
  await assert.rejects(client.inbox({ limit: -1 }), RangeError);
  assert.equal(requests.length, 2);
});

test("capabilities report the project's features", async () => {
  let present = true;
  const { client, requests } = authority({
    "communication.capabilities": () => present ? full("Capabilities", { serverRelease: "test-release", capabilityRevision: "4",
      limitsRevision: "2", features: full("Features", { chat: true, inbox: true, lexicalSearch: false, typing: true, webhooks: false,
        liveSessions: true, liveBroadcast: false }), limits: [], environment: "test", productionQualified: false,
      offerings: [], geos: [], installationProfiles: [] }) : null,
  });
  const capabilities = await client.capabilities();
  assert.equal(capabilities.features.typing, true);
  assert.equal(capabilities.features.lexicalSearch, false);
  assert.equal(capabilities.capabilityRevision, "4");
  assert.equal(requests[0].input, undefined);
  present = false;
  await assert.rejects(client.capabilities(), /Missing project capabilities/);
});

test("typing signals are ephemeral booleans that leave no recovery state", async () => {
  let status = input => ({ accepted: input.isTyping });
  const { client, conversationId, requests, values } = authority({ "communication.typing": input => status(input) });
  const stored = [...values.entries()];
  assert.equal(await client.typing(conversationId, true), true);
  assert.equal(await client.typing(conversationId, false), false);
  assert.deepEqual(requests.map(request => request.input), [{ conversationId, isTyping: true }, { conversationId, isTyping: false }]);
  assert.deepEqual(client.http.recoveryStates, []);
  assert.deepEqual([...values.entries()], stored);
  await assert.rejects(client.typing(conversationId, "yes"), { name: "TypeError", message: "isTyping must be a boolean" });
  assert.equal(requests.length, 2);
  status = () => null;
  await assert.rejects(client.typing(conversationId, true), /Missing typing status/);
});
