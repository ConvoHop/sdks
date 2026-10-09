import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopProblem, ConvoHopTransport, operationCatalog } from "@convohop/core";
import { reply } from "../../../test/graphql-fixtures.mjs";

const projectId = crypto.randomUUID();
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function transport(respond, recoveryStorage = storage()) {
  return { recoveryStorage, transport: new ConvoHopTransport({ baseUrl: "http://127.0.0.1:18080", credential: "fixture-private-session",
    namespace: crypto.randomUUID(), incarnation: crypto.randomUUID(), recoveryStorage,
    fetch: async (_url, init) => respond(JSON.parse(init.body)) }) };
}
const typing = { conversationId: crypto.randomUUID(), isTyping: true };

test("the core catalog carries every operation's idempotency class", () => {
  const classes = new Set(Object.values(operationCatalog).map(entry => entry.idempotency));
  assert.deepEqual([...classes].sort(), ["ephemeral", "idempotent", "permitBound", "replayOnly", "safe", "singleUse"]);
  assert.deepEqual(Object.keys(operationCatalog).filter(id => operationCatalog[id].idempotency === "replayOnly").sort(), [
    "management.agentCredentialPermit", "management.issueAgentKey", "management.purchaseAgentCredits",
    "management.rejectAgentSignup", "management.requestAgentSignup",
  ], "only agent-signup operations whose requests the authority cannot look up are replay-only");
  assert.equal(operationCatalog["communication.typing"].kind, "mutation");
  assert.equal(operationCatalog["communication.typing"].idempotency, "ephemeral");
  for (const entry of Object.values(operationCatalog)) if (entry.kind !== "mutation") assert.equal(entry.idempotency, "safe");
});

test("an ephemeral signal accepts the authority's ok envelope and keeps no recovery state", async () => {
  const requestIds = [];
  const { transport: client, recoveryStorage } = transport(request => {
    assert.equal(request.operationName, "CommunicationTyping");
    requestIds.push(request.variables.context.requestId);
    return reply(request, { status: "ok", receiptId: null, committedAt: null, replayed: null, result: { accepted: true } });
  });
  const first = await client.execute("communication.typing", projectId, typing);
  const second = await client.execute("communication.typing", projectId, typing);
  assert.deepEqual([first.status, first.result.accepted, second.status], ["ok", true, "ok"]);
  assert.equal(new Set(requestIds).size, 2, "each signal is fresh");
  assert.deepEqual(client.recoveryStates, []);
  assert.equal(recoveryStorage.values.size, 0);
  await assert.rejects(client.retry(requestIds[0]), /No recovery record exists/);
});

test("an ephemeral transport failure stays unknown, is not resent and leaves nothing to resolve", async () => {
  let requests = 0;
  const { transport: client, recoveryStorage } = transport(() => { requests++; throw new TypeError("connection lost"); });
  const requestId = crypto.randomUUID();
  await assert.rejects(client.execute("communication.typing", projectId, typing, requestId), error =>
    error instanceof ConvoHopProblem && error.code === "TRANSPORT_UNKNOWN" && error.outcome === "unknown" && error.requestId === requestId);
  assert.equal(requests, 1);
  assert.deepEqual(client.recoveryStates, []);
  assert.equal(recoveryStorage.values.size, 0);
});

test("recorded mutations still require receipt evidence and keep their recovery state", async () => {
  const { transport: client } = transport(request => reply(request, { status: "ok", result: { messageId: crypto.randomUUID() } }));
  const requestId = crypto.randomUUID();
  await assert.rejects(client.execute("communication.sendMessage", projectId,
    { conversationId: crypto.randomUUID(), text: "fixture", props: {} }, requestId), { code: "INVALID_RESPONSE", outcome: "unknown", requestId });
  assert.equal(client.recoveryStates.length, 1);
  assert.equal(client.recoveryStates[0].resolutionState, "unknown");
});
