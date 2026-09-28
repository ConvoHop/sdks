import test from "node:test";
import assert from "node:assert/strict";
import { V1Transport, V1Client, V1Realtime, V1Problem, v1Id, v1Counter, v1Message, v1SearchHit } from "../dist/v1.js";
import { v1Operations } from "../dist/v1-operations.js";

const id = () => crypto.randomUUID();
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function response(status, result, options) {
  const request = JSON.parse(options.body);
  const field = Object.values(v1Operations).find(operation => operation.operationName === request.operationName).field;
  return Response.json({ data: { [field]: { status, requestId: request.variables.context.requestId, result } } });
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
  const path = `/v1/projects/${id()}`, conversationId = id();
  const options = { baseUrl: "http://127.0.0.1:18080", credential: "private-never-persist-this", namespace: "test", incarnation, recoveryStorage: saved };
  const first = new V1Transport({ ...options, fetch: async () => { submissions++; throw new TypeError("connection lost"); } });
  await assert.rejects(first.mutate("POST", `${path}/conversations/${conversationId}/messages`, { text: "original", props: {} }, requestId), { code: "TRANSPORT_UNKNOWN" });
  const original = first.recoveryStates[0];
  assert.equal(original.resolutionState, "unknown");
  assert.ok(![...saved.values.values()].join("").includes(options.credential));
  const retried = new V1Transport({ ...options, fetch: async (url, options) => {
    assert.equal(url, "http://127.0.0.1:18080/graphql");
    assert.equal(options.method, "POST");
    const request = JSON.parse(options.body);
    if (request.operationName === "CommunicationResolveRequest") return response("ok", { state: "notObservedYet" }, options);
    submissions++;
    assert.equal(request.variables.context.requestId, requestId);
    assert.deepEqual(request.variables.input, { conversationId, props: {}, text: "original" });
    return response("committed", { messageId: id() }, options);
  } });
  await retried.recover(requestId, `${path}/requests/${requestId}`, true);
  assert.equal(submissions, 2);
  assert.equal(retried.recoveryStates[0].firstSubmittedAt, original.firstSubmittedAt);
  assert.equal(retried.recoveryStates[0].retryDeadline, original.retryDeadline);
  assert.equal(retried.recoveryStates[0].resolutionState, "committed");
  await assert.rejects(retried.mutate("POST", `${path}/conversations/${conversationId}/messages`, { text: "different" }, requestId), { code: "IDEMPOTENCY_CONFLICT" });
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
    if (JSON.parse(options.body).operationName !== "ManagementResolveRequest") writes++;
    return response("ok", { state: "notObservedYet" }, options);
  } });
  await assert.rejects(expired.recover(requestId, "/management/v1/requests/" + requestId, true), { code: "RESOLUTION_REQUIRED" });
  assert.equal(writes, 0);
  assert.equal((await expired.recover(requestId, "/management/v1/requests/" + requestId)).state, "notObservedYet");
});
test("v1 accepts a current same-origin route but never forwards credentials to a redirect", async () => {
  const projectId = id(), incarnation = id();
  const client = new V1Client({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation, principalId: id(), sessionToken: "private",
    fetch: async (_url, options) => response("ok", { projectId, incarnation, servingEpoch: "1",
      communicationBase: "https://attacker.invalid", wssUrl: "wss://attacker.invalid/graphql",
      expiresAt: new Date(Date.now() + 60000).toISOString(), signature: "opaque-signed-route" }, options) });
  await assert.rejects(client.initialize(), /another origin/);
});

test("v1 credential delivery sends the permit without a fabricated bearer credential", async () => {
  const projectId = id(), deliveryId = id();
  const transport = new V1Transport({ baseUrl: "http://localhost:18080", namespace: "delivery", fetch: async (_url, options) => {
    assert.equal(options.headers.authorization, undefined);
    const request = JSON.parse(options.body);
    assert.deepEqual(request.variables.context.credentialDeliveryPermit, { signature: "opaque" });
    assert.deepEqual(request.variables.input, { deliveryId });
    return response("committed", { deliveryId }, options);
  } });
  await transport.mutate("POST", `/v1/projects/${projectId}/credentialDeliveries/${deliveryId}/redeem`, { credentialDeliveryPermit: { signature: "opaque" } });
});

for (const outcome of ["committed", "accepted"]) {
  test(`v1 later transport failures cannot regress known ${outcome} evidence`, async () => {
    let requests = 0; const requestId = id();
    const transport = new V1Transport({ baseUrl: "http://localhost:18080", credential: "private", namespace: "knowledge",
      fetch: async (_url, options) => { if (requests++ === 0) return response(outcome, {}, options); throw new Error("disconnected"); } });
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
    const request = JSON.parse(options.body);
    methods.push(request.operationName);
    if (request.operationName === "CommunicationResolveRequest") return response("ok", { state: "notObservedYet" }, options);
    assert.equal(request.variables.context.requestId, requestId);
    return response("committed", {}, options);
  } });
  await recovered.recoverPending(error => { throw error; });
  await recovered.recoverPending(error => { throw error; });
  assert.deepEqual(methods, ["CommunicationResolveRequest", "CommunicationSendMessage"]);
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

test("HTTP 200 GraphQL errors and malformed envelopes never become successful mutation evidence", async () => {
  for (const [value, code] of [
    [{ errors: [{ message: "Resolve the same request", extensions: { code: "OUTCOME_UNKNOWN", outcome: "unknown", status: 503 } }] }, "OUTCOME_UNKNOWN"],
    [{ data: { createOrganization: null } }, "INVALID_RESPONSE"],
    [{ data: { createOrganization: { status: "committed", requestId: id(), result: {} } } }, "INVALID_RESPONSE"],
  ]) {
    const transport = new V1Transport({ baseUrl: "https://management.example.test", namespace: "graphql",
      fetch: async () => Response.json(value) });
    await assert.rejects(transport.mutate("POST", "/management/v1/organizations", { name: "Fixture", termsRef: "fixture" }),
      { code, outcome: "unknown" });
    assert.equal(transport.recoveryStates[0].resolutionState, "unknown");
  }
});

test("GraphQL subscription applies ordered pages before persisting and sends scoped standard frames", async t => {
  const original = globalThis.WebSocket;
  let socket;
  class Socket {
    static OPEN = 1;
    readyState = 1;
    sent = [];
    constructor(url, protocol) { this.url = url; this.protocol = protocol; socket = this; }
    send(value) { this.sent.push(JSON.parse(value)); }
    close(code) { this.readyState = 3; this.onclose?.({ code }); }
  }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const saved = storage(), projectId = id(), principalId = id(), conversationId = id(), incarnation = id();
  const route = { incarnation, projectId, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" };
  const zero = { incarnation, conversationId, sequence: "0" };
  const client = { projectId, principalId, storage: saved, recoverPending: async () => {},
    initialize: async () => route, events: async () => ({ items: [], nextCursor: zero, complete: true, refreshRequired: false }) };
  let release;
  const waiting = new Promise(resolve => { release = resolve; }), errors = [];
  const replay = new V1Realtime(client, conversationId, route, "session-fixture", async events => {
    if (events.length) await waiting;
  }, error => errors.push(error));
  t.after(() => replay.close());
  await replay.start(); socket.onopen();
  assert.equal(socket.protocol, "graphql-transport-ws");
  assert.deepEqual(socket.sent[0], { type: "connection_init", payload: { token: "session-fixture", projectId, incarnation } });
  socket.onmessage({ data: JSON.stringify({ type: "connection_ack" }) });
  const subscription = socket.sent[1];
  assert.equal(subscription.type, "subscribe");
  assert.equal(subscription.payload.operationName, "CommunicationConversationEvents");
  assert.deepEqual(subscription.payload.variables.input.after, zero);
  assert.equal(subscription.payload.variables.context.projectId, projectId);
  const nextCursor = { ...zero, sequence: "1" };
  socket.onmessage({ data: JSON.stringify({ type: "next", id: subscription.id, payload: { data: { conversationEvents: {
    items: [{ eventId: id(), conversationId, sequence: "1" }], nextCursor, complete: true, refreshRequired: false,
  } } } }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(replay.cursor, zero);
  release(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(replay.cursor, nextCursor);
  assert.deepEqual(JSON.parse([...saved.values.values()][0]), nextCursor);
  socket.onclose({ code: 4401 });
  assert.equal(errors[0].code, "UNAUTHENTICATED");
});

test("a failed pushed page invalidates queued successors and resumes from the last applied cursor", async t => {
  const original = globalThis.WebSocket, sockets = [];
  let connectedAgain;
  const reconnected = new Promise(resolve => { connectedAgain = resolve; });
  class Socket {
    sent = [];
    constructor() { sockets.push(this); if (sockets.length === 2) connectedAgain(); }
    send(value) { this.sent.push(JSON.parse(value)); }
    close(code) { this.onclose?.({ code }); }
  }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const saved = storage(), projectId = id(), principalId = id(), conversationId = id(), incarnation = id();
  const route = { incarnation, projectId, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" };
  const zero = { incarnation, conversationId, sequence: "0" }, requestedCursors = [];
  const client = { projectId, principalId, storage: saved, recoverPending: async () => {},
    initialize: async () => route, events: async (_conversation, after) => {
      requestedCursors.push(after);
      return { items: [], nextCursor: zero, complete: true, refreshRequired: false };
    } };
  let rejectFirst, fail = true;
  const deferred = new Promise((_resolve, reject) => { rejectFirst = reject; }), attempts = [], errors = [];
  const replay = new V1Realtime(client, conversationId, route, "session-fixture", async events => {
    if (!events.length) return;
    attempts.push(events[0].sequence);
    if (fail) { fail = false; await deferred; }
  }, error => errors.push(error));
  t.after(() => replay.close());
  await replay.start();
  const subscribe = socket => {
    socket.onopen();
    socket.onmessage({ data: JSON.stringify({ type: "connection_ack" }) });
    return socket.sent.find(frame => frame.type === "subscribe");
  };
  const push = (socket, subscription, sequence) => socket.onmessage({ data: JSON.stringify({
    type: "next", id: subscription.id, payload: { data: { conversationEvents: {
      items: [{ eventId: id(), conversationId, sequence }], nextCursor: { ...zero, sequence },
      complete: true, refreshRequired: false,
    } } },
  }) });
  const first = sockets[0], subscription = subscribe(first);
  push(first, subscription, "1");
  push(first, subscription, "2");
  await new Promise(resolve => setImmediate(resolve));
  rejectFirst(new V1Problem("AUTHORITY_UNAVAILABLE", id(), "unknown", 503, "Snapshot temporarily unavailable"));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(attempts, ["1"]);
  assert.deepEqual(replay.cursor, zero);
  assert.deepEqual(JSON.parse([...saved.values.values()][0]), zero);
  assert.equal(errors[0].status, 503);
  let timeout;
  try {
    await Promise.race([reconnected, new Promise((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error("Reconnect was not scheduled")), 5000);
    })]);
  } finally { clearTimeout(timeout); }
  const resumed = subscribe(sockets[1]);
  assert.deepEqual(requestedCursors.at(-1), zero);
  assert.deepEqual(resumed.payload.variables.input.after, zero);
  push(sockets[1], resumed, "1");
  push(sockets[1], resumed, "2");
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(attempts, ["1", "1", "2"]);
  assert.equal(replay.cursor.sequence, "2");
  assert.equal(JSON.parse([...saved.values.values()][0]).sequence, "2");
});
