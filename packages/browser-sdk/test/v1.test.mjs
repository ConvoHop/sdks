import test from "node:test";
import assert from "node:assert/strict";
import { V1Transport, V1Client, V1Realtime, v1Id, v1Counter, v1Message, v1SearchHit } from "../dist/v1.js";

const id = () => crypto.randomUUID();
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function response(status, result, requestId) {
  return Response.json({ status, requestId, result });
}
test("v1 rejects unsafe counters, noncanonical IDs and incomplete message shapes", () => {
  for (const value of ["01", "-1", "1.0", "9223372036854775808"]) assert.throws(() => v1Counter(value));
  assert.equal(v1Counter("9223372036854775807"), "9223372036854775807");
  assert.throws(() => v1Id(id().toUpperCase()));
  assert.throws(() => v1Message({ messageId: id(), text: "missing authorization-scoped fields" }));
});
test("v1 search parses nested current messages and rejects mismatched conversation scopes", () => {
  const message = { messageId: id(), conversationId: id(), authorId: id(), sequence: "1", revision: "2",
    revisionSequence: "3", createdAt: new Date().toISOString(), deleted: false, text: "current text", props: {} };
  const hit = { conversationId: message.conversationId, message };
  assert.deepEqual(v1SearchHit(hit), hit);
  assert.throws(() => v1SearchHit({ ...hit, conversationId: id() }), /scope/);
  assert.throws(() => v1SearchHit(message));
});
test("v1 unknown mutation survives restart with same identity, payload and retry deadline", async () => {
  const saved = storage(); const incarnation = id(); const requestId = id(); let submissions = 0;
  const options = { baseUrl: "http://127.0.0.1:18080", credential: "private-never-persist-this", namespace: "test", incarnation, recoveryStorage: saved };
  const first = new V1Transport({ ...options, fetch: async () => { submissions++; throw new TypeError("connection lost"); } });
  await assert.rejects(first.mutate("POST", "/v1/projects/example/messages", { text: "original", props: {} }, requestId), { code: "TRANSPORT_UNKNOWN" });
  const original = first.recoveryStates[0];
  assert.equal(original.resolutionState, "unknown");
  assert.ok(![...saved.values.values()].join("").includes(options.credential));
  const retried = new V1Transport({ ...options, fetch: async (url, options) => {
    if (options.method === "GET") return response("ok", { state: "notObservedYet" }, id());
    submissions++;
    assert.equal(options.headers["idempotency-key"], requestId);
    assert.deepEqual(JSON.parse(options.body), { props: {}, text: "original" });
    return response("committed", { messageId: id() }, requestId);
  } });
  await retried.recover(requestId, "/v1/projects/example/requests/" + requestId, true);
  assert.equal(submissions, 2);
  assert.equal(retried.recoveryStates[0].firstSubmittedAt, original.firstSubmittedAt);
  assert.equal(retried.recoveryStates[0].retryDeadline, original.retryDeadline);
  assert.equal(retried.recoveryStates[0].resolutionState, "committed");
  await assert.rejects(retried.mutate("POST", "/v1/projects/example/messages", { text: "different" }, requestId), { code: "IDEMPOTENCY_CONFLICT" });
});
test("v1 expiry and clock rollback prohibit resends but still allow authoritative resolution", async () => {
  const saved = storage(); const requestId = id();
  const options = { baseUrl: "http://localhost:18080", credential: "private", namespace: "clock", recoveryStorage: saved };
  const first = new V1Transport({ ...options, fetch: async () => { throw new Error("transport"); } });
  await assert.rejects(first.mutate("POST", "/management/v1/organizations", { name: "Original" }, requestId));
  const [key, text] = [...saved.values.entries()][0];
  const states = JSON.parse(text); states[0].retryDeadline = Date.now() - 1; saved.setItem(key, JSON.stringify(states));
  let writes = 0;
  const expired = new V1Transport({ ...options, fetch: async (_url, options) => {
    if (options.method !== "GET") writes++;
    return response("ok", { state: "notObservedYet" }, id());
  } });
  await assert.rejects(expired.recover(requestId, "/management/v1/requests/" + requestId, true), { code: "RESOLUTION_REQUIRED" });
  assert.equal(writes, 0);
  assert.equal((await expired.recover(requestId, "/management/v1/requests/" + requestId)).state, "notObservedYet");
});
test("v1 accepts a current same-origin route but never forwards credentials to a redirect", async () => {
  const projectId = id(), incarnation = id();
  const client = new V1Client({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation, principalId: id(), sessionToken: "private",
    fetch: async () => response("ok", { projectId, incarnation, servingEpoch: "1",
      communicationBase: "https://attacker.invalid", wssUrl: "wss://attacker.invalid/v1/realtime",
      expiresAt: new Date(Date.now() + 60000).toISOString(), signature: "opaque-signed-route" }, id()) });
  await assert.rejects(client.initialize(), /another origin/);
});

test("v1 credential delivery sends the permit without a fabricated bearer credential", async () => {
  const transport = new V1Transport({ baseUrl: "http://localhost:18080", namespace: "delivery", fetch: async (_url, options) => {
    assert.equal(options.headers.authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { credentialDeliveryPermit: { signature: "opaque" } });
    return response("committed", { deliveryId: id() }, options.headers["idempotency-key"]);
  } });
  await transport.mutate("POST", "/v1/projects/example/credentialDeliveries/example/redeem", { credentialDeliveryPermit: { signature: "opaque" } });
});

for (const outcome of ["committed", "accepted"]) {
  test(`v1 later transport failures cannot regress known ${outcome} evidence`, async () => {
    let requests = 0; const requestId = id();
    const transport = new V1Transport({ baseUrl: "http://localhost:18080", credential: "private", namespace: "knowledge",
      fetch: async () => { if (requests++ === 0) return response(outcome, {}, requestId); throw new Error("disconnected"); } });
    await transport.mutate("POST", "/management/v1/organizations", { name: "original" }, requestId);
    await assert.rejects(transport.mutate("POST", "/management/v1/organizations", { name: "original" }, requestId), { code: "TRANSPORT_UNKNOWN" });
    assert.equal(transport.recoveryStates[0].resolutionState, outcome);
  });
}

test("v1 startup and foreground recovery reuse the original mutation without renewing its budget", async () => {
  const saved = storage(), requestId = id();
  const options = { baseUrl: "http://localhost:18080", sessionToken: "private", projectId: id(), incarnation: id(), principalId: id(), recoveryStorage: saved };
  const first = new V1Client({ ...options, fetch: async () => { throw new Error("offline"); } });
  const path = first.path + "/conversations/" + id() + "/messages";
  await assert.rejects(first.http.mutate("POST", path, { text: "original", props: {} }, requestId));
  const original = first.http.recoveryStates[0];
  const methods = [];
  const recovered = new V1Client({ ...options, fetch: async (_url, options) => {
    methods.push(options.method);
    if (options.method === "GET") return response("ok", { state: "notObservedYet" }, id());
    assert.equal(options.headers["idempotency-key"], requestId);
    return response("committed", {}, requestId);
  } });
  await recovered.recoverPending(error => { throw error; });
  await recovered.recoverPending(error => { throw error; });
  assert.deepEqual(methods, ["GET", "POST"]);
  assert.equal(recovered.http.recoveryStates[0].retryDeadline, original.retryDeadline);
  assert.equal(recovered.http.recoveryStates[0].attemptCount, 2);
});

test("v1 replay advances and persists the cursor only after the application applied the page", async () => {
  const saved = storage(), projectId = id(), principalId = id(), conversationId = id(), incarnation = id();
  const cursor = { incarnation, conversationId, sequence: "5" };
  let reject = true;
  const client = { projectId, principalId, storage: saved,
    events: async () => ({ items: [], nextCursor: cursor, complete: true, refreshRequired: false }) };
  const replay = new V1Realtime(client, conversationId, {}, "private", async () => { if (reject) throw new Error("application failed"); }, () => {});
  await assert.rejects(replay.reconcile(), /application failed/);
  assert.equal(replay.cursor, undefined);
  assert.equal(saved.values.size, 0);
  reject = false; await replay.reconcile();
  assert.deepEqual(replay.cursor, cursor);
  assert.deepEqual(JSON.parse([...saved.values.values()][0]), cursor);
  replay.close();
});
