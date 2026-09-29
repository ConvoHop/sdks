import test from "node:test";
import assert from "node:assert/strict";
import { V1Transport, V1Client, V1Realtime, V1Problem, v1Id, v1Counter, v1Message, v1Membership, v1Conversation, v1SearchHit } from "../dist/v1.js";
import { event, full, reply, resolution } from "../../../test/graphql-fixtures.mjs";

const id = () => crypto.randomUUID();
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function response(status, result, options, metadata = {}) {
  return reply(JSON.parse(options.body), { status, result, ...metadata });
}
function messageAck(conversationId, incarnation) {
  return { messageId: id(), conversationId, sequence: "1", revision: "1", status: "sent",
    cursor: { incarnation, conversationId, sequence: "1" } };
}
test("v1 rejects unsafe counters, noncanonical IDs and incomplete message shapes", () => {
  for (const value of ["01", "-1", "1.0", "9223372036854775808"]) assert.throws(() => v1Counter(value));
  assert.equal(v1Counter("9223372036854775807"), "9223372036854775807");
  assert.throws(() => v1Id(id().toUpperCase()));
  assert.throws(() => v1Message({ messageId: id(), text: "missing authorization-scoped fields" }));
  for (const parse of [v1Message, v1Membership, v1Conversation]) assert.throws(() => parse(null), TypeError);
});
test("v1 search parses nested current messages and rejects mismatched conversation scopes", () => {
  const message = full("Message", { messageId: id(), conversationId: id(), authorId: id(), sequence: "1", revision: "2",
    revisionSequence: "3", createdAt: new Date().toISOString(), deleted: false, text: "current text", props: {} });
  const hit = { conversationId: message.conversationId, message };
  assert.deepEqual(v1SearchHit(hit), hit);
  assert.throws(() => v1SearchHit({ ...hit, conversationId: id() }), /scope/);
  assert.throws(() => v1SearchHit(message));
  assert.throws(() => v1SearchHit({ conversationId: message.conversationId, message: null }), TypeError);
});
test("v1 unknown mutation survives restart with same identity, payload and retry deadline", async () => {
  const saved = storage(); const incarnation = id(); const requestId = id(); let submissions = 0;
  const projectId = id(), conversationId = id(), input = { conversationId, text: "original", props: {} };
  const ack = messageAck(conversationId, incarnation);
  const options = { baseUrl: "http://127.0.0.1:18080", credential: "private-never-persist-this", namespace: "test", incarnation, recoveryStorage: saved };
  const first = new V1Transport({ ...options, fetch: async () => { submissions++; throw new TypeError("connection lost"); } });
  await assert.rejects(first.execute("communication.sendMessage", projectId, input, requestId), { code: "TRANSPORT_UNKNOWN" });
  const original = first.recoveryStates[0];
  assert.equal(original.resolutionState, "unknown");
  assert.ok(![...saved.values.values()].join("").includes(options.credential));
  const retried = new V1Transport({ ...options, fetch: async (url, options) => {
    assert.equal(url, "http://127.0.0.1:18080/graphql");
    assert.equal(options.method, "POST");
    const request = JSON.parse(options.body);
    if (request.operationName === "CommunicationResolveRequest") return response("ok",
      resolution(requestId, submissions === 1 ? "notObservedYet" : "committed", submissions === 1 ? null : { messageAck: ack }), options);
    submissions++;
    assert.equal(request.variables.context.requestId, requestId);
    assert.deepEqual(request.variables.input, { conversationId, props: {}, text: "original" });
    return response("committed", ack, options);
  } });
  const recovered = await retried.retry(requestId);
  assert.deepEqual(recovered.receipt.result.messageAck, ack);
  assert.equal(submissions, 2);
  assert.equal(retried.recoveryStates[0].firstSubmittedAt, original.firstSubmittedAt);
  assert.equal(retried.recoveryStates[0].retryDeadline, original.retryDeadline);
  assert.equal(retried.recoveryStates[0].resolutionState, "committed");
  assert.equal(original.operation, "communication.sendMessage");
  assert.deepEqual(original.input, input);
  assert.equal(original.path, undefined);
  assert.equal(original.payload, undefined);
  await assert.rejects(retried.execute("communication.sendMessage", projectId, { ...input, text: "different" }, requestId), { code: "IDEMPOTENCY_CONFLICT" });
});
test("v1 expiry prohibits resends but still allows authoritative resolution", async () => {
  const saved = storage(); const requestId = id();
  const options = { baseUrl: "http://localhost:18080", credential: "private", namespace: "clock", recoveryStorage: saved };
  const first = new V1Transport({ ...options, fetch: async () => { throw new Error("transport"); } });
  await assert.rejects(first.execute("management.createOrganization", undefined, { name: "Original", termsRef: "fixture" }, requestId));
  const [key, text] = [...saved.values.entries()][0];
  const states = JSON.parse(text); states[0].retryDeadline = Date.now() - 1; saved.setItem(key, JSON.stringify(states));
  let writes = 0;
  const expired = new V1Transport({ ...options, fetch: async (_url, options) => {
    if (JSON.parse(options.body).operationName !== "ManagementResolveRequest") writes++;
    return response("ok", resolution(requestId, "notObservedYet"), options);
  } });
  await assert.rejects(expired.retry(requestId), { code: "RESOLUTION_REQUIRED" });
  assert.equal(writes, 0);
  assert.equal((await expired.execute("management.resolveRequest", undefined, { requestId })).result.state, "notObservedYet");
});

test("clock rollback and the original attempt limit survive SDK reconstruction", async t => {
  const saved = storage(), requestId = id(), start = Date.now(), input = { name: "fixture", termsRef: "fixture" };
  let now = start, writes = 0;
  t.mock.method(Date, "now", () => now);
  const options = { baseUrl: "http://localhost:18080", namespace: "rollback", recoveryStorage: saved,
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body);
      if (request.operationName === "ManagementResolveRequest")
        return reply(request, { result: resolution(requestId, "notObservedYet") });
      writes++; throw new Error("unknown");
    } };
  const first = new V1Transport(options);
  await assert.rejects(first.execute("management.createOrganization", undefined, input, requestId), { code: "TRANSPORT_UNKNOWN" });
  now += 1000;
  await assert.rejects(first.execute("management.createOrganization", undefined, input, requestId), { code: "TRANSPORT_UNKNOWN" });
  const restored = new V1Transport(options);
  now -= 1;
  await assert.rejects(restored.retry(requestId), { code: "RESOLUTION_REQUIRED" });
  assert.equal(writes, 2);
  now = start + 2000;
  await assert.rejects(restored.retry(requestId), { code: "TRANSPORT_UNKNOWN" });
  await assert.rejects(restored.retry(requestId), { code: "RESOLUTION_REQUIRED" });
  assert.equal(writes, 3);
  assert.equal(restored.recoveryStates[0].attemptCount, 3);
  assert.equal(restored.recoveryStates[0].retryDeadline, start + 60000);
});
test("v1 accepts a current same-origin route but never forwards credentials to a redirect", async () => {
  const projectId = id(), incarnation = id();
  const client = new V1Client({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation, principalId: id(), sessionToken: "private",
    fetch: async (_url, options) => response("ok", { projectId, incarnation, servingEpoch: "1",
      communicationBase: "https://attacker.invalid", wssUrl: "wss://attacker.invalid/graphql",
      expiresAt: new Date(Date.now() + 60000).toISOString(), signature: "opaque-signed-route" }, options) });
  await assert.rejects(client.initialize(), /another origin/);
});

test("credential redemption and acknowledgement use transient permits without a fabricated bearer", async () => {
  const projectId = id(), deliveryId = id(), saved = storage(), permit = { signature: "opaque" };
  const capsule = full("CredentialCapsule", { kind: "backendKey", backendKey: "fixture-capsule" });
  const transport = new V1Transport({ baseUrl: "http://localhost:18080", namespace: "delivery", recoveryStorage: saved, fetch: async (_url, options) => {
    assert.equal(options.headers.authorization, undefined);
    const request = JSON.parse(options.body);
    assert.deepEqual(request.variables.context.credentialDeliveryPermit, { signature: "opaque" });
    assert.deepEqual(request.variables.input, { deliveryId });
    return response("committed", request.operationName === "CommunicationRedeemCredential"
      ? capsule : { deliveryId, acknowledged: true }, options);
  } });
  await transport.execute("communication.redeemCredential", projectId, { deliveryId }, id(), permit);
  await transport.execute("communication.acknowledgeCredential", projectId, { deliveryId }, id(), permit);
  const stored = [...saved.values.values()].join("");
  assert.ok(!stored.includes("opaque"));
  assert.ok(!stored.includes("fixture-capsule"));
});

for (const outcome of ["committed", "accepted"]) {
  test(`v1 later transport failures cannot regress known ${outcome} evidence`, async () => {
    let requests = 0; const requestId = id();
    const operation = outcome === "committed" ? "management.createOrganization" : "management.createDeployment";
    const input = outcome === "committed" ? { name: "original", termsRef: "fixture" } :
      { orgId: id(), offering: "managedShared", geoId: "local", installationProfileId: "fixture", consentRef: "fixture" };
    const transport = new V1Transport({ baseUrl: "http://localhost:18080", credential: "private", namespace: "knowledge",
      fetch: async (_url, options) => {
        if (requests++ === 0) return response(outcome,
          outcome === "committed" ? { orgId: id(), name: "original", status: "active", revision: "1" } : null, options,
          outcome === "accepted" ? { operation: { operationId: id(), owner: "management", href: "/graphql", state: "requested" } } : {});
        throw new Error("disconnected");
      } });
    await transport.execute(operation, undefined, input, requestId);
    await assert.rejects(transport.execute(operation, undefined, input, requestId), { code: "TRANSPORT_UNKNOWN" });
    assert.equal(transport.recoveryStates[0].resolutionState, outcome);
  });
}

test("v1 startup and foreground recovery reuse the original mutation without renewing its budget", async () => {
  const saved = storage(), requestId = id();
  const options = { baseUrl: "http://localhost:18080", sessionToken: "private", projectId: id(), incarnation: id(), principalId: id(), recoveryStorage: saved };
  const first = new V1Client({ ...options, fetch: async () => { throw new Error("offline"); } });
  const conversationId = id(), input = { conversationId, text: "original", props: {} };
  await assert.rejects(first.http.execute("communication.sendMessage", first.projectId, input, requestId));
  const original = first.http.recoveryStates[0];
  const methods = [], ack = messageAck(conversationId, options.incarnation);
  let committed = false;
  const recovered = new V1Client({ ...options, fetch: async (_url, options) => {
    const request = JSON.parse(options.body);
    methods.push(request.operationName);
    if (request.operationName === "CommunicationResolveRequest") return response("ok",
      resolution(requestId, committed ? "committed" : "notObservedYet", committed ? { messageAck: ack } : null), options);
    assert.equal(request.variables.context.requestId, requestId);
    committed = true;
    return response("committed", ack, options);
  } });
  await recovered.recoverPending(error => { throw error; });
  await recovered.recoverPending(error => { throw error; });
  assert.deepEqual(methods, ["CommunicationResolveRequest", "CommunicationSendMessage", "CommunicationResolveRequest"]);
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
    await assert.rejects(transport.execute("management.createOrganization", undefined, { name: "Fixture", termsRef: "fixture" }),
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
    items: [event(conversationId, "1")], nextCursor, complete: true, refreshRequired: false,
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
      items: [event(conversationId, sequence)], nextCursor: { ...zero, sequence },
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

test("read-only resolution and explicit retry preserve typed committed evidence without another mutation", async () => {
  const projectId = id(), incarnation = id(), conversationId = id(), requestId = id();
  const ack = messageAck(conversationId, incarnation), requests = [];
  const client = new V1Client({ baseUrl: "http://localhost:18080", projectId, incarnation,
    principalId: id(), sessionToken: "fixture", fetch: async (_url, options) => {
      const request = JSON.parse(options.body); requests.push(request);
      if (request.operationName === "CommunicationSendMessage") throw new Error("unknown commit");
      return reply(request, { result: resolution(requestId, "committed", { messageAck: ack }) });
    } });
  await assert.rejects(client.send(conversationId, "original", requestId), { code: "TRANSPORT_UNKNOWN" });
  const original = client.http.recoveryStates[0];
  const resolved = await client.requests.resolve(requestId);
  assert.equal(resolved.receipt.result.messageAck.messageId, ack.messageId);
  assert.equal((await client.requests.retry(requestId)).state, "committed");
  assert.equal(requests.filter(value => value.operationName === "CommunicationSendMessage").length, 1);
  assert.equal(client.http.recoveryStates[0].attemptCount, 1);
  assert.equal(client.http.recoveryStates[0].retryDeadline, original.retryDeadline);
});

test("malformed or differently scoped resolutions cannot change recovery evidence", async () => {
  for (const mismatch of ["resolution", "receipt", "project"]) {
    const projectId = id(), requestId = id(), conversationId = id(), incarnation = id();
    const ack = messageAck(conversationId, incarnation);
    const transport = new V1Transport({ baseUrl: "http://localhost:18080", namespace: mismatch, incarnation,
      fetch: async (_url, options) => {
        const request = JSON.parse(options.body);
        if (request.operationName === "CommunicationSendMessage") throw new Error("offline");
        const result = resolution(requestId, "committed", { messageAck: ack });
        if (mismatch === "resolution") result.requestId = id();
        if (mismatch === "receipt") result.receipt.requestId = id();
        return reply(request, { result });
      } });
    await assert.rejects(transport.execute("communication.sendMessage", projectId, { conversationId, text: "original", props: {} }, requestId));
    await assert.rejects(transport.execute("communication.resolveRequest", mismatch === "project" ? id() : projectId, { requestId }),
      { code: mismatch === "project" ? "RESOLUTION_REQUIRED" : "INVALID_RESPONSE" });
    assert.equal(transport.recoveryStates[0].resolutionState, "unknown");
  }
});

test("absent evidence never authorizes replay of a previously committed command", async () => {
  const projectId = id(), incarnation = id(), conversationId = id(), requestId = id();
  let writes = 0;
  const transport = new V1Transport({ baseUrl: "http://localhost:18080", namespace: "nonregression", incarnation,
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body);
      if (request.operationName === "CommunicationResolveRequest")
        return reply(request, { result: resolution(requestId, "notObservedYet") });
      writes++;
      return reply(request, { result: messageAck(conversationId, incarnation) });
    } });
  await transport.execute("communication.sendMessage", projectId, { conversationId, text: "original", props: {} }, requestId);
  await assert.rejects(transport.retry(requestId), { code: "RESOLUTION_REQUIRED", requestId });
  assert.equal(writes, 1);
  assert.equal(transport.recoveryStates[0].resolutionState, "committed");
});

test("current generated operation inputs reject route aliases and wrong-plane scopes before persistence", async () => {
  let fetches = 0;
  const transport = new V1Transport({ baseUrl: "http://localhost:18080", namespace: "closed", fetch: async () => { fetches++; } });
  const projectId = id();
  for (const [key, project, input, permit] of [
    ["communication.removeMember", projectId, { conversationId: id(), principalId: id(), expectedMembershipRevision: "1" }],
    ["communication.sendMessage", undefined, { conversationId: id(), text: "test", props: {} }],
    ["management.createOrganization", projectId, { name: "test", termsRef: "fixture" }],
    ["management.createOrganization", undefined, { name: "test", termsRef: "fixture" }, { signature: "secret" }],
  ]) await assert.rejects(transport.execute(key, project, input, id(), permit), { code: "INVALID_REQUEST" });
  await assert.rejects(transport.execute("communication.startCall", projectId, {}), /Unknown generated/);
  assert.equal(fetches, 0);
  assert.equal(transport.recoveryStates.length, 0);
  assert.equal(transport.read, undefined);
  assert.equal(transport.mutate, undefined);
});

for (const operation of ["communication.redeemCredential", "communication.acknowledgeCredential"])
test(`unknown ${operation} needs a fresh permit without unauthorized request lookup`, async () => {
  const saved = storage(), requestId = id(), projectId = id(), deliveryId = id();
  let writes = 0;
  const transport = new V1Transport({ baseUrl: "http://localhost:18080", namespace: "delivery-unknown", recoveryStorage: saved,
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body);
      assert.notEqual(request.operationName, "CommunicationResolveRequest");
      writes++; throw new Error("response lost");
    } });
  await assert.rejects(transport.execute(operation, projectId, { deliveryId },
    requestId, { signature: "never-persist-this-permit" }), { code: "TRANSPORT_UNKNOWN" });
  await assert.rejects(transport.retry(requestId), { code: "CREDENTIAL_REQUIRED", requestId });
  assert.equal(writes, 1);
  assert.ok([...saved.values.values()].every(value => !value.includes("never-persist")));
});

test("missing committed receipt metadata stays unknown despite a complete result object", async () => {
  const requestId = id();
  const transport = new V1Transport({ baseUrl: "http://localhost:18080", namespace: "metadata",
    fetch: async (_url, options) => reply(JSON.parse(options.body), {
      receiptId: null, result: { orgId: id(), name: "fixture", status: "active", revision: "1" },
    }) });
  await assert.rejects(transport.execute("management.createOrganization", undefined, { name: "fixture", termsRef: "fixture" }, requestId),
    { code: "INVALID_RESPONSE", requestId, outcome: "unknown" });
  assert.equal(transport.recoveryStates[0].resolutionState, "unknown");
});
