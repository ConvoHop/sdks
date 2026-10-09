import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopTransport, ConvoHopClient, ConversationStream, ConvoHopProblem, parseId, parseCounter, parseMessage, parseMembership, parseConversation, parseSearchHit } from "@convohop/client";
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
test("rejects unsafe counters, noncanonical IDs and incomplete message shapes", () => {
  for (const value of ["01", "-1", "1.0", "9223372036854775808"]) assert.throws(() => parseCounter(value));
  assert.equal(parseCounter("9223372036854775807"), "9223372036854775807");
  assert.throws(() => parseId(id().toUpperCase()));
  assert.throws(() => parseMessage({ messageId: id(), text: "missing authorization-scoped fields" }));
  for (const parse of [parseMessage, parseMembership, parseConversation]) assert.throws(() => parse(null), TypeError);
});
test("search parses nested current messages and rejects mismatched conversation scopes", () => {
  const message = full("Message", { messageId: id(), conversationId: id(), authorId: id(), sequence: "1", revision: "2",
    revisionSequence: "3", createdAt: new Date().toISOString(), deleted: false, text: "current text", props: {} });
  const hit = { conversationId: message.conversationId, message };
  assert.deepEqual(parseSearchHit(hit), hit);
  assert.throws(() => parseSearchHit({ ...hit, conversationId: id() }), /scope/);
  assert.throws(() => parseSearchHit(message));
  assert.throws(() => parseSearchHit({ conversationId: message.conversationId, message: null }), TypeError);
});
test("unknown mutation survives restart with same identity, payload and retry deadline", async () => {
  const saved = storage(); const incarnation = id(); const requestId = id(); let submissions = 0;
  const projectId = id(), conversationId = id(), input = { conversationId, text: "original", props: {} };
  const ack = messageAck(conversationId, incarnation);
  const options = { baseUrl: "http://127.0.0.1:18080", credential: "private-never-persist-this", namespace: "test", incarnation, recoveryStorage: saved };
  const first = new ConvoHopTransport({ ...options, fetch: async () => { submissions++; throw new TypeError("connection lost"); } });
  await assert.rejects(first.execute("communication.sendMessage", projectId, input, requestId), { code: "TRANSPORT_UNKNOWN" });
  const original = first.recoveryStates[0];
  assert.equal(original.resolutionState, "unknown");
  assert.ok(![...saved.values.values()].join("").includes(options.credential));
  const retried = new ConvoHopTransport({ ...options, fetch: async (url, options) => {
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
test("expiry prohibits resends but still allows authoritative resolution", async () => {
  const saved = storage(); const requestId = id();
  const options = { baseUrl: "http://localhost:18080", credential: "private", namespace: "clock", recoveryStorage: saved };
  const first = new ConvoHopTransport({ ...options, fetch: async () => { throw new Error("transport"); } });
  await assert.rejects(first.execute("management.createOrganization", undefined, { name: "Original", termsRef: "fixture" }, requestId));
  const [key, text] = [...saved.values.entries()][0];
  const states = JSON.parse(text); states[0].retryDeadline = Date.now() - 1; saved.setItem(key, JSON.stringify(states));
  let writes = 0;
  const expired = new ConvoHopTransport({ ...options, fetch: async (_url, options) => {
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
  const first = new ConvoHopTransport(options);
  await assert.rejects(first.execute("management.createOrganization", undefined, input, requestId), { code: "TRANSPORT_UNKNOWN" });
  now += 1000;
  await assert.rejects(first.execute("management.createOrganization", undefined, input, requestId), { code: "TRANSPORT_UNKNOWN" });
  const restored = new ConvoHopTransport(options);
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
test("accepts a current same-origin route but never forwards credentials to a redirect", async () => {
  const projectId = id(), incarnation = id();
  const client = new ConvoHopClient({ baseUrl: "http://127.0.0.1:18080", projectId, incarnation, principalId: id(), sessionToken: "private",
    fetch: async (_url, options) => response("ok", { projectId, incarnation, servingEpoch: "1",
      communicationBase: "https://attacker.invalid", wssUrl: "wss://attacker.invalid/graphql",
      expiresAt: new Date(Date.now() + 60000).toISOString(), signature: "opaque-signed-route" }, options) });
  await assert.rejects(client.initialize(), /another origin/);
});

test("credential redemption and acknowledgement use transient permits without a fabricated bearer", async () => {
  const projectId = id(), deliveryId = id(), saved = storage(), permit = { signature: "opaque" };
  const capsule = full("CredentialCapsule", { kind: "backendKey", backendKey: "fixture-capsule" });
  const transport = new ConvoHopTransport({ baseUrl: "http://localhost:18080", namespace: "delivery", recoveryStorage: saved, fetch: async (_url, options) => {
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
  test(`later transport failures cannot regress known ${outcome} evidence`, async () => {
    let requests = 0; const requestId = id();
    const operation = outcome === "committed" ? "management.createOrganization" : "management.createDeployment";
    const input = outcome === "committed" ? { name: "original", termsRef: "fixture" } :
      { orgId: id(), offering: "managedShared", geoId: "local", installationProfileId: "fixture", consentRef: "fixture" };
    const transport = new ConvoHopTransport({ baseUrl: "http://localhost:18080", credential: "private", namespace: "knowledge",
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

test("startup and foreground recovery reuse the original mutation without renewing its budget", async () => {
  const saved = storage(), requestId = id();
  const options = { baseUrl: "http://localhost:18080", sessionToken: "private", projectId: id(), incarnation: id(), principalId: id(), recoveryStorage: saved };
  const first = new ConvoHopClient({ ...options, fetch: async () => { throw new Error("offline"); } });
  const conversationId = id(), input = { conversationId, text: "original", props: {} };
  await assert.rejects(first.http.execute("communication.sendMessage", first.projectId, input, requestId));
  const original = first.http.recoveryStates[0];
  const methods = [], ack = messageAck(conversationId, options.incarnation);
  let committed = false;
  const recovered = new ConvoHopClient({ ...options, fetch: async (_url, options) => {
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

test("replay advances and persists the cursor only after the application applied the page", async () => {
  const saved = storage(), projectId = id(), principalId = id(), conversationId = id(), incarnation = id();
  const cursor = { incarnation, conversationId, sequence: "5" };
  let reject = true;
  const client = { projectId, principalId, storage: saved,
    events: async () => ({ items: [], nextCursor: cursor, complete: true, refreshRequired: false }) };
  const replay = new ConversationStream(client, conversationId, {}, "private", async () => { if (reject) throw new Error("application failed"); }, () => {});
  await assert.rejects(replay.reconcile(), /application failed/);
  assert.equal(replay.cursor, undefined);
  assert.equal(saved.values.size, 0);
  reject = false; await replay.reconcile();
  assert.deepEqual(replay.cursor, cursor);
  assert.deepEqual(JSON.parse([...saved.values.values()][0]), cursor);
  replay.close();
});

test("expired replay requires explicit current-membership resync and preserves evidence until authorized application", async t => {
  const original = globalThis.WebSocket;
  class Socket {
    static OPEN = 1;
    readyState = 1;
    send() {}
    close() { this.readyState = 3; }
  }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const saved = storage(), projectId = id(), principalId = id(), conversationId = id(), incarnation = id();
  const key = `convohop.cursor:${projectId}:${principalId}:${conversationId}`;
  const old = { incarnation, conversationId, sequence: "5" }, current = { ...old, sequence: "20" };
  saved.setItem(key, JSON.stringify(old));
  saved.setItem("unrelated-mutation-recovery", "keep original command");
  let member = false, applyFails = true, membershipReads = 0;
  const afters = [];
  const client = new ConvoHopClient({ projectId, principalId, incarnation, sessionToken: "private",
    baseUrl: "http://localhost:18080", recoveryStorage: saved });
  client.initialize = async () => ({ projectId, incarnation, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" });
  client.getConversation = async requested => {
    assert.equal(requested, conversationId); membershipReads++;
    if (!member) throw new ConvoHopProblem("NOT_FOUND", id(), "rejected", 404, "Current membership required");
    return full("Conversation", { conversationId });
  };
  client.recoverPending = async () => {};
  client.events = async (requested, after) => {
    assert.equal(requested, conversationId); afters.push(after);
    if (after?.sequence === old.sequence) throw new ConvoHopProblem("CURSOR_EXPIRED", id(), "rejected", 409, "Expired frontier");
    return { items: [], nextCursor: current, complete: true, refreshRequired: false };
  };
  const apply = async () => { if (applyFails) throw new Error("application failed"); };
  await assert.rejects(client.watch(conversationId, apply, () => {}), { code: "CURSOR_EXPIRED" });
  assert.deepEqual(afters, [old]);
  assert.equal(membershipReads, 0);

  await assert.rejects(client.resyncAuthorizedHistory(conversationId, apply, () => {}), { code: "NOT_FOUND" });
  assert.deepEqual(afters, [old]);
  assert.deepEqual(JSON.parse(saved.getItem(key)), old);
  member = true;
  await assert.rejects(client.resyncAuthorizedHistory(conversationId, apply, () => {}), /application failed/);
  assert.deepEqual(JSON.parse(saved.getItem(key)), old);
  applyFails = false;
  const explicit = await client.resyncAuthorizedHistory(conversationId, apply, () => {});
  assert.deepEqual(explicit.cursor, current);
  assert.deepEqual(JSON.parse(saved.getItem(key)), current);
  assert.equal(saved.getItem("unrelated-mutation-recovery"), "keep original command");
  assert.deepEqual(afters, [old, undefined, undefined]);
  assert.equal(membershipReads, 3);
  explicit.close();
  const resumed = await client.watch(conversationId, apply, () => {});
  assert.deepEqual(afters.at(-1), current);
  resumed.close();
});

test("history resync retires only this client's conversation and keeps other scopes and command evidence", async t => {
  const original = globalThis.WebSocket, sockets = [];
  class Socket {
    static OPEN = 1;
    readyState = 1;
    constructor() { sockets.push(this); }
    send() {}
    close() { this.readyState = 3; }
  }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const saved = storage(), projectId = id(), principalId = id(), conversationId = id(), otherConversationId = id(), incarnation = id();
  const makeClient = projectId => {
    const client = new ConvoHopClient({ projectId, principalId, incarnation, sessionToken: "private",
      baseUrl: "http://localhost:18080", recoveryStorage: saved });
    client.initialize = async () => ({ projectId, incarnation, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" });
    client.getConversation = async conversationId => full("Conversation", { conversationId });
    client.recoverPending = async () => {};
    client.events = async (conversationId, after) => ({ items: [], nextCursor: {
      incarnation, conversationId, sequence: after?.sequence ?? "5",
    }, complete: true, refreshRequired: false });
    return client;
  };
  const client = makeClient(projectId), otherProject = makeClient(id());
  const target = await client.watch(conversationId, async () => {}, () => {});
  const otherConversation = await client.watch(otherConversationId, async () => {}, () => {});
  const foreign = await otherProject.watch(conversationId, async () => {}, () => {});
  const otherKey = `convohop.cursor:${projectId}:${principalId}:${otherConversationId}`;
  const foreignKey = `convohop.cursor:${otherProject.projectId}:${principalId}:${conversationId}`;
  const before = [saved.getItem(otherKey), saved.getItem(foreignKey)];
  saved.setItem("original-request-recovery", "unchanged");
  const recovered = await client.resyncAuthorizedHistory(conversationId, async () => {}, () => {});
  assert.deepEqual(sockets.map(socket => socket.readyState), [3, 1, 1, 1]);
  assert.deepEqual([saved.getItem(otherKey), saved.getItem(foreignKey)], before);
  assert.equal(saved.getItem("original-request-recovery"), "unchanged");
  for (const stream of [target, otherConversation, foreign, recovered]) stream.close();
});

test("an initializing watcher cannot reopen after explicit history resynchronization", async t => {
  const original = globalThis.WebSocket, sockets = [];
  class Socket {
    static OPEN = 1;
    readyState = 1;
    constructor() { sockets.push(this); }
    send() {}
    close() { this.readyState = 3; }
  }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const projectId = id(), principalId = id(), conversationId = id(), incarnation = id();
  const client = new ConvoHopClient({ projectId, principalId, incarnation, sessionToken: "private", baseUrl: "http://localhost:18080" });
  const route = { projectId, incarnation, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" };
  let release, calls = 0;
  client.initialize = async () => ++calls === 1 ? new Promise(resolve => { release = resolve; }) : route;
  client.getConversation = async () => full("Conversation", { conversationId });
  client.recoverPending = async () => {};
  client.events = async () => ({ items: [], nextCursor: { incarnation, conversationId, sequence: "5" }, complete: true, refreshRequired: false });
  const pending = client.watch(conversationId, async () => {}, () => {});
  const recovered = await client.resyncAuthorizedHistory(conversationId, async () => {}, () => {});
  release(route);
  await assert.rejects(pending, /superseded by explicit resynchronization/);
  assert.equal(sockets.length, 1);
  recovered.close();
});

test("resync waits for old application work before applying a fresh authorized snapshot", async t => {
  const original = globalThis.WebSocket;
  class Socket { static OPEN = 1; readyState = 1; send() {} close() { this.readyState = 3; } }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const projectId = id(), principalId = id(), conversationId = id(), incarnation = id(), saved = storage();
  const key = `convohop.cursor:${projectId}:${principalId}:${conversationId}`;
  const old = { incarnation, conversationId, sequence: "4" };
  saved.setItem(key, JSON.stringify(old));
  const client = new ConvoHopClient({ projectId, principalId, incarnation, sessionToken: "private",
    baseUrl: "http://localhost:18080", recoveryStorage: saved });
  client.initialize = async () => ({ projectId, incarnation, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" });
  client.getConversation = async () => full("Conversation", { conversationId });
  client.recoverPending = async () => {};
  client.events = async (_, after) => ({ items: [], nextCursor: { ...old, sequence: after ? "5" : "20" },
    complete: true, refreshRequired: false });
  let enter, release, view = "before", fresh = false;
  const entered = new Promise(resolve => { enter = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const watching = client.watch(conversationId, async () => { enter(); await gate; view = "old"; }, () => {});
  const superseded = assert.rejects(watching, /superseded/);
  await entered;
  const resync = client.resyncAuthorizedHistory(conversationId, async () => { fresh = true; view = "fresh"; }, () => {});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(view, "before");
  assert.equal(fresh, false);
  assert.deepEqual(JSON.parse(saved.getItem(key)), old);
  release();
  await superseded;
  const current = await resync;
  assert.equal(view, "fresh");
  assert.equal(current.cursor.sequence, "20");
  assert.equal(JSON.parse(saved.getItem(key)).sequence, "20");
  current.close();
});

test("successive resyncs retain closing application work until it retires and only the latest resumes", async t => {
  const original = globalThis.WebSocket;
  class Socket { static OPEN = 1; readyState = 1; send() {} close() { this.readyState = 3; } }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const projectId = id(), principalId = id(), conversationId = id(), incarnation = id(), saved = storage();
  const client = new ConvoHopClient({ projectId, principalId, incarnation, sessionToken: "private",
    baseUrl: "http://localhost:18080", recoveryStorage: saved });
  client.initialize = async () => ({ projectId, incarnation, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" });
  client.getConversation = async () => full("Conversation", { conversationId });
  client.recoverPending = async () => {};
  let sequence = 0;
  client.events = async () => ({ items: [], nextCursor: { incarnation, conversationId, sequence: String(++sequence) },
    complete: true, refreshRequired: false });
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; }), gate = new Promise(resolve => { release = resolve; });
  const applications = [];
  const originalWatch = client.watch(conversationId, async () => { enter(); await gate; applications.push("old"); }, () => {});
  const oldRejected = assert.rejects(originalWatch, /superseded/);
  await entered;
  const first = client.resyncAuthorizedHistory(conversationId, async () => { applications.push("superseded"); }, () => {});
  const firstRejected = assert.rejects(first, /superseded/);
  const latest = client.resyncAuthorizedHistory(conversationId, async () => { applications.push("latest"); }, () => {});
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(applications, []);
  release();
  await Promise.all([oldRejected, firstRejected]);
  const current = await latest;
  assert.deepEqual(applications, ["old", "latest"]);
  assert.equal(current.cursor.sequence, "2");
  current.close();
});

test("a closing application's failure rejects resync without replacing its saved frontier", async t => {
  const original = globalThis.WebSocket;
  class Socket { static OPEN = 1; readyState = 1; send() {} close() { this.readyState = 3; } }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const projectId = id(), principalId = id(), conversationId = id(), incarnation = id(), saved = storage();
  const key = `convohop.cursor:${projectId}:${principalId}:${conversationId}`;
  const cursor = { incarnation, conversationId, sequence: "4" };
  saved.setItem(key, JSON.stringify(cursor));
  const client = new ConvoHopClient({ projectId, principalId, incarnation, sessionToken: "private",
    baseUrl: "http://localhost:18080", recoveryStorage: saved });
  client.initialize = async () => ({ projectId, incarnation, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" });
  client.getConversation = async () => full("Conversation", { conversationId });
  client.recoverPending = async () => {};
  client.events = async () => ({ items: [], nextCursor: { ...cursor, sequence: "20" }, complete: true, refreshRequired: false });
  let enter, release, fresh = false;
  const entered = new Promise(resolve => { enter = resolve; }), gate = new Promise(resolve => { release = resolve; });
  const originalWatch = client.watch(conversationId, async () => { enter(); await gate; throw new Error("old application failed"); }, () => {});
  const oldRejected = assert.rejects(originalWatch, /old application failed/);
  await entered;
  const resync = client.resyncAuthorizedHistory(conversationId, async () => { fresh = true; }, () => {});
  const resyncRejected = assert.rejects(resync, /old application failed/);
  release();
  await Promise.all([oldRejected, resyncRejected]);
  assert.equal(fresh, false);
  assert.deepEqual(JSON.parse(saved.getItem(key)), cursor);
  const retried = await client.resyncAuthorizedHistory(conversationId, async () => { fresh = true; }, () => {});
  assert.equal(fresh, true);
  assert.equal(retried.cursor.sequence, "20");
  retried.close();
});

test("HTTP 200 GraphQL errors and malformed envelopes never become successful mutation evidence", async () => {
  for (const [value, code] of [
    [{ errors: [{ message: "Resolve the same request", extensions: { code: "OUTCOME_UNKNOWN", outcome: "unknown", status: 503 } }] }, "OUTCOME_UNKNOWN"],
    [{ data: { createOrganization: null } }, "INVALID_RESPONSE"],
    [{ data: { createOrganization: { status: "committed", requestId: id(), result: {} } } }, "INVALID_RESPONSE"],
  ]) {
    const transport = new ConvoHopTransport({ baseUrl: "https://management.example.test", namespace: "graphql",
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
  const replay = new ConversationStream(client, conversationId, route, "session-fixture", async events => {
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
  const replay = new ConversationStream(client, conversationId, route, "session-fixture", async events => {
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
  rejectFirst(new ConvoHopProblem("AUTHORITY_UNAVAILABLE", id(), "unknown", 503, "Snapshot temporarily unavailable"));
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

const drain = () => new Promise(resolve => setImmediate(resolve));
const sequences = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
function backlog(conversationId, incarnation, total) {
  const server = { total, stalled: false, requested: [], events: async (_conversation, after) => {
    server.requested.push(after?.sequence);
    if (server.stalled) return { items: [], nextCursor: after, complete: false, refreshRequired: false };
    const start = Number(after?.sequence ?? "0"), end = Math.min(start + 100, server.total);
    return { items: sequences(start + 1, end).map(sequence => event(conversationId, sequence)),
      nextCursor: { incarnation, conversationId, sequence: String(end) }, complete: end === server.total, refreshRequired: false };
  } };
  return server;
}
// `failures` are thrown, in order, by the initializations reconnecting runs; `online()` reports that connectivity returned.
function replayFixture(t, total, { date = false } = {}) {
  const original = globalThis.WebSocket, sockets = [], listeners = new Set();
  class Socket {
    sent = [];
    constructor(url, protocol) { this.url = url; this.protocol = protocol; sockets.push(this); }
    send(value) { this.sent.push(JSON.parse(value)); }
    close(code, reason) { this.closedWith = code; this.onclose?.({ code, reason }); }
    subscribe() {
      this.onopen();
      this.onmessage({ data: JSON.stringify({ type: "connection_ack" }) });
      return this.sent.find(frame => frame.type === "subscribe");
    }
  }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  t.mock.timers.enable(date ? { apis: ["setTimeout", "Date"], now: Date.now() } : { apis: ["setTimeout"] });
  t.mock.method(Math, "random", () => 0);
  const saved = storage(), projectId = id(), principalId = id(), conversationId = id(), incarnation = id();
  const route = { incarnation, projectId, servingEpoch: "1", wssUrl: "ws://localhost:18080/graphql" };
  const server = backlog(conversationId, incarnation, total);
  const platform = { connectivity: { online: true, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } } };
  const client = { projectId, principalId, storage: saved, platform, recoverPending: async () => {},
    initialize: async () => {
      setup.initialized++;
      if (setup.failures.length) throw setup.failures.shift();
      return route;
    },
    events: (conversation, after) => server.events(conversation, after) };
  const setup = { sockets, saved, server, conversationId, incarnation, applied: [], errors: [], gate: undefined, overlapped: false,
    failures: [], initialized: 0, online: () => { for (const listener of listeners) listener(true); } };
  let active = 0;
  setup.replay = new ConversationStream(client, conversationId, route, "session-fixture", async events => {
    if (active++) setup.overlapped = true;
    try {
      await setup.gate?.(events);
      setup.applied.push(...events.map(value => value.sequence));
    } finally { active--; }
  }, error => setup.errors.push(error));
  setup.savedSequence = () => JSON.parse([...saved.values.values()][0]).sequence;
  t.after(() => setup.replay.close());
  return setup;
}

test("managed replay continues beyond one bounded round in paced rounds and subscribes at the caught-up frontier", async t => {
  const { replay, server, sockets, applied, errors, savedSequence } = replayFixture(t, 2500);
  await replay.start();
  assert.deepEqual(applied, sequences(1, 1000));
  assert.equal(replay.cursor.sequence, "1000");
  assert.equal(savedSequence(), "1000");
  assert.equal(sockets.length, 0);
  t.mock.timers.tick(249); await drain();
  assert.equal(server.requested.length, 10);
  t.mock.timers.tick(1); await drain();
  assert.deepEqual(applied, sequences(1, 2000));
  assert.equal(savedSequence(), "2000");
  assert.equal(sockets.length, 0);
  t.mock.timers.tick(250); await drain();
  assert.deepEqual(applied, sequences(1, 2500));
  assert.deepEqual(server.requested, [undefined, ...sequences(1, 24).map(page => String(page * 100))]);
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].subscribe().payload.variables.input.after.sequence, "2500");
  assert.equal(savedSequence(), "2500");
  assert.deepEqual(errors, []);
  assert.equal(replay.closed, false);
});

test("an admission-limit overflow waits for superseded application work, then catches up a large backlog before resubscribing", async t => {
  const setup = replayFixture(t, 0), { replay, server, sockets, applied, errors, conversationId, incarnation } = setup;
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  setup.gate = events => events[0]?.sequence === "1" && !applied.length ? blocked : undefined;
  await replay.start();
  const first = sockets[0], subscription = first.subscribe();
  assert.equal(subscription.payload.variables.input.after.sequence, "0");
  server.total = 2500;
  const push = page => first.onmessage({ data: JSON.stringify({ type: "next", id: subscription.id, payload: { data: {
    conversationEvents: { items: sequences(page * 50 + 1, page * 50 + 50).map(sequence => event(conversationId, sequence)),
      nextCursor: { incarnation, conversationId, sequence: String(page * 50 + 50) }, complete: true, refreshRequired: false },
  } } }) });
  push(0); await drain();
  for (let page = 1; page < 5; page++) push(page);
  assert.deepEqual(errors.map(error => error.code), ["ADMISSION_LIMIT"]);
  assert.equal(first.closedWith, 4000);
  const requested = server.requested.length;
  t.mock.timers.tick(1000); await drain();
  assert.equal(server.requested.length, requested);
  assert.equal(sockets.length, 1);
  release(); await drain();
  assert.deepEqual(applied, [...sequences(1, 50), ...sequences(1, 1000)]);
  assert.equal(replay.cursor.sequence, "1000");
  assert.equal(sockets.length, 1);
  t.mock.timers.tick(250); await drain();
  t.mock.timers.tick(250); await drain();
  assert.deepEqual(applied.slice(50), sequences(1, 2500));
  assert.equal(sockets.length, 2);
  assert.equal(sockets[1].subscribe().payload.variables.input.after.sequence, "2500");
  assert.equal(errors.length, 1);
  assert.equal(setup.overlapped, false);
  assert.equal(replay.closed, false);
});

test("a reconnect retry with more than one round of missed history continues instead of closing", async t => {
  const { replay, server, sockets, applied, errors } = replayFixture(t, 10);
  await replay.start();
  sockets[0].subscribe();
  server.total = 1510;
  sockets[0].close(1006);
  t.mock.timers.tick(1000); await drain();
  assert.deepEqual(applied, sequences(1, 1010));
  assert.equal(sockets.length, 1);
  t.mock.timers.tick(250); await drain();
  assert.deepEqual(applied, sequences(1, 1510));
  assert.equal(sockets.length, 2);
  assert.equal(sockets[1].subscribe().payload.variables.input.after.sequence, "1510");
  assert.deepEqual(errors, []);
  assert.equal(replay.closed, false);
});

test("realtime keeps reconnecting through gateway and server errors, doubling its backoff", async t => {
  const setup = replayFixture(t, 0), { replay, sockets, errors } = setup;
  await replay.start();
  sockets[0].subscribe();
  setup.failures.push(new ConvoHopProblem("INVALID_RESPONSE", id(), "unknown", 502, "Unrecognized authority response"),
    new ConvoHopProblem("HTTP_FAILURE", id(), "unknown", 504, "Authority rejected the request"),
    new ConvoHopProblem("HTTP_FAILURE", id(), "unknown", 500, "Authority rejected the request"));
  sockets[0].close(1006);
  for (const [attempt, delay] of [1000, 2000, 4000, 8000].entries()) {
    t.mock.timers.tick(delay - 1); await drain();
    assert.equal(setup.initialized, attempt);
    t.mock.timers.tick(1); await drain();
    assert.equal(setup.initialized, attempt + 1);
  }
  assert.deepEqual(errors.map(error => [error.code, error.status]), [["INVALID_RESPONSE", 502], ["HTTP_FAILURE", 504], ["HTTP_FAILURE", 500]]);
  assert.equal(sockets.length, 2);
  assert.equal(replay.closed, false);
});

const quota = { code: "QUOTA_EXCEEDED", outcome: "rejected", status: 429, retryAfter: 60 };
for (const [name, end, expected] of [
  ["a quota close", socket => socket.close(4429, "QUOTA_EXCEEDED retryAfter=60 meter=messages"), ["QUOTA_EXCEEDED", 429, 60]],
  ["a quota error", (socket, subscription) => socket.onmessage({ data: JSON.stringify({ type: "error", id: subscription.id,
    payload: [{ message: "Fixture quota", extensions: { ...quota, requestId: id() } }] }) }), ["QUOTA_EXCEEDED", 429, 60]],
  ["a plan-limit close", socket => socket.close(4403, "PLAN_LIMIT_EXCEEDED planLimit=conversations"), ["PLAN_LIMIT_EXCEEDED", 403, undefined]],
  ["an authorization close", socket => socket.close(4408), ["UNAUTHENTICATED", 401, undefined]],
]) {
  test(`${name} stops realtime and reports its problem instead of reconnecting`, async t => {
    const setup = replayFixture(t, 0), { replay, sockets, errors } = setup;
    await replay.start();
    end(sockets[0], sockets[0].subscribe());
    t.mock.timers.tick(600000); await drain();
    assert.deepEqual(errors.map(error => [error.code, error.status, error.retryAfter]), [expected]);
    assert.equal(replay.closed, true);
    assert.equal(setup.initialized, 0);
    assert.equal(sockets.length, 1);
  });
}

test("a rate-limited close reconnects after its retryAfter even when connectivity returns sooner", async t => {
  const setup = replayFixture(t, 0, { date: true }), { replay, sockets, errors } = setup;
  await replay.start();
  sockets[0].subscribe();
  sockets[0].close(4429, "RATE_LIMITED retryAfter=30");
  assert.deepEqual(errors.map(error => [error.code, error.status, error.retryAfter]), [["RATE_LIMITED", 429, 30]]);
  t.mock.timers.tick(20000); await drain();
  setup.online(); await drain();
  t.mock.timers.tick(9999); await drain();
  assert.equal(setup.initialized, 0);
  t.mock.timers.tick(1); await drain();
  assert.equal(setup.initialized, 1);
  assert.equal(sockets.length, 2);
  // Without a retryAfter, returning connectivity skips the backoff.
  sockets[1].subscribe();
  sockets[1].close(1006);
  setup.online(); await drain();
  assert.equal(setup.initialized, 2);
  assert.equal(sockets.length, 3);
  assert.equal(errors.length, 1);
  assert.equal(replay.closed, false);
});

test("explicit reconcile reports each incomplete bounded round and rejects a frontier that does not advance", async () => {
  const saved = storage(), projectId = id(), principalId = id(), conversationId = id(), incarnation = id();
  const server = backlog(conversationId, incarnation, 1500), applied = [];
  const replay = new ConversationStream({ projectId, principalId, storage: saved, events: server.events }, conversationId, {}, "private",
    async events => { applied.push(...events.map(value => value.sequence)); }, () => {});
  await assert.rejects(replay.reconcile(), /Replay work limit reached/);
  assert.equal(replay.cursor.sequence, "1000");
  await replay.reconcile();
  assert.deepEqual(applied, sequences(1, 1500));
  server.stalled = true;
  await assert.rejects(replay.reconcile(), { name: "TypeError", message: /did not advance/ });
  assert.equal(replay.cursor.sequence, "1500");
  assert.equal(JSON.parse([...saved.values.values()][0]).sequence, "1500");
  replay.close();
});

test("close cancels a paced replay continuation", async t => {
  const { replay, server, sockets, errors } = replayFixture(t, 2500);
  await replay.start();
  replay.close();
  t.mock.timers.tick(500); await drain();
  assert.equal(server.requested.length, 10);
  assert.equal(sockets.length, 0);
  assert.deepEqual(errors, []);
});

test("a managed replay whose incomplete page stops advancing fails closed instead of pacing forever", async t => {
  const { replay, server, sockets, errors } = replayFixture(t, 2500);
  await replay.start();
  server.stalled = true;
  t.mock.timers.tick(250); await drain();
  assert.equal(replay.closed, true);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /did not advance/);
  assert.equal(replay.cursor.sequence, "1000");
  t.mock.timers.tick(10000); await drain();
  assert.equal(server.requested.length, 11);
  assert.equal(sockets.length, 0);
});

test("read-only resolution and explicit retry preserve typed committed evidence without another mutation", async () => {
  const projectId = id(), incarnation = id(), conversationId = id(), requestId = id();
  const ack = messageAck(conversationId, incarnation), requests = [];
  const client = new ConvoHopClient({ baseUrl: "http://localhost:18080", projectId, incarnation,
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
    const transport = new ConvoHopTransport({ baseUrl: "http://localhost:18080", namespace: mismatch, incarnation,
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
  const transport = new ConvoHopTransport({ baseUrl: "http://localhost:18080", namespace: "nonregression", incarnation,
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
  const transport = new ConvoHopTransport({ baseUrl: "http://localhost:18080", namespace: "closed", fetch: async () => { fetches++; } });
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
  const transport = new ConvoHopTransport({ baseUrl: "http://localhost:18080", namespace: "delivery-unknown", recoveryStorage: saved,
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
  const transport = new ConvoHopTransport({ baseUrl: "http://localhost:18080", namespace: "metadata",
    fetch: async (_url, options) => reply(JSON.parse(options.body), {
      receiptId: null, result: { orgId: id(), name: "fixture", status: "active", revision: "1" },
    }) });
  await assert.rejects(transport.execute("management.createOrganization", undefined, { name: "fixture", termsRef: "fixture" }, requestId),
    { code: "INVALID_RESPONSE", requestId, outcome: "unknown" });
  assert.equal(transport.recoveryStates[0].resolutionState, "unknown");
});
