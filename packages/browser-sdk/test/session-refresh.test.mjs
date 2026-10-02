import test from "node:test";
import assert from "node:assert/strict";
import { V1Client, LiveSessionHandle, LiveParticipationHandle } from "../dist/index.js";
import { v1Operations } from "../dist/v1-operations.js";
import { event, reply, resolution } from "../../../test/graphql-fixtures.mjs";

const id = () => crypto.randomUUID();
const turn = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function storage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function denied() {
  return Response.json({ code: "UNAUTHENTICATED", outcome: "rejected", message: "Fixture credential denied" }, { status: 401 });
}
function fixture({ enabled = true, revision = "1" } = {}) {
  const projectId = id(), incarnation = id(), principalId = id(), saved = storage();
  const original = { sessionId: id(), principalId, deviceId: id(), incarnation, sessionRevision: revision,
    expiresAt: new Date(Math.floor(Date.now() / 1000) * 1000 + 120123).toISOString(), status: "active" };
  const setup = { original, current: { ...original }, saved, requests: [], hookCalls: [], renewals: 0,
    tokens: new Map(), rows: new Map(), deniedTokens: new Set(), handle: undefined, projectId, incarnation };
  const originalToken = "original-session-test-secret";
  setup.rows.set(original.sessionId, setup.current);
  setup.tokens.set(originalToken, { projectId, session: { ...original }, kind: "client" });
  setup.issue = (session, { project = projectId, kind = "client" } = {}) => {
    const token = `candidate-session-test-secret-${setup.tokens.size}`;
    setup.rows.set(session.sessionId, { ...session });
    setup.tokens.set(token, { projectId: project, session: { ...session }, kind });
    return { session: { ...session }, sessionToken: token, tokenExpiresAt: session.expiresAt };
  };
  setup.renew = () => {
    setup.renewals++;
    Object.assign(setup.current, { sessionRevision: (BigInt(setup.current.sessionRevision) + 1n).toString(),
      expiresAt: new Date(Date.parse(setup.current.expiresAt) + 60000).toISOString() });
    const bootstrap = setup.issue(setup.current);
    setup.rows.set(original.sessionId, setup.current);
    setup.lastRenewal = bootstrap;
    return bootstrap;
  };
  setup.refreshHook = async () => setup.renew();
  setup.fetch = async (url, options) => {
    const request = JSON.parse(options.body), credential = options.headers.authorization?.slice(7);
    const operation = Object.keys(v1Operations).find(key => v1Operations[key].operationName === request.operationName);
    assert.ok(operation, "Use a generated operation");
    assert.equal(url, "http://localhost:18080/graphql");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    const call = { request, operation, credential };
    setup.requests.push(call);
    const actor = setup.tokens.get(credential), row = actor && setup.rows.get(actor.session.sessionId);
    if (!actor || setup.deniedTokens.has(credential) || actor.projectId !== request.variables.context.projectId ||
        actor.session.incarnation !== request.variables.context.incarnation ||
        (actor.kind === "client" && (!row || row.status !== "active" ||
          row.sessionRevision !== actor.session.sessionRevision ||
          Math.floor(Date.parse(row.expiresAt) / 1000) * 1000 <= Date.now()))) return denied();
    if (operation === "communication.currentSession" &&
        (actor.kind !== "client" || request.variables.context.observedServingEpoch !== (setup.servingEpoch ?? "1"))) return denied();
    if (setup.handle) {
      const handled = await setup.handle(call);
      if (handled !== undefined) return handled;
    }
    if (operation === "communication.currentSession") return reply(request, { result: { ...row } });
    if (operation === "communication.route") return reply(request, { result: {
      projectId, incarnation, servingEpoch: setup.servingEpoch ?? "1", communicationBase: "http://localhost:18080",
      wssUrl: "ws://localhost:18080/graphql", expiresAt: new Date(Date.now() + 60000).toISOString(), signature: "fixture-route",
    } });
    if (operation === "communication.events") return reply(request, { result: {
      items: [], nextCursor: request.variables.input.after ?? {
        incarnation, conversationId: request.variables.input.conversationId, sequence: "0",
      }, complete: true, refreshRequired: false,
    } });
    if (operation === "communication.sendMessage") return reply(request, { result: {
      messageId: id(), conversationId: request.variables.input.conversationId, sequence: "1", revision: "1", status: "sent",
      cursor: { incarnation, conversationId: request.variables.input.conversationId, sequence: "1" },
    } });
    throw new Error(`Unexpected fixture operation ${operation}`);
  };
  setup.client = new V1Client({ baseUrl: "http://localhost:18080", projectId, incarnation, principalId,
    sessionToken: originalToken, recoveryStorage: saved, fetch: setup.fetch,
    ...(enabled ? { sessionRefresh: async current => {
      setup.hookCalls.push(current);
      return setup.refreshHook(current);
    } } : {}),
  });
  setup.originalToken = originalToken;
  return setup;
}
function sockets(t) {
  const previous = globalThis.WebSocket, values = [];
  class Socket {
    sent = [];
    constructor(url, protocol) { this.url = url; this.protocol = protocol; values.push(this); }
    send(text) { this.sent.push(JSON.parse(text)); }
    close(code) { this.onclose?.({ code }); }
    subscribe() {
      this.onopen();
      this.onmessage({ data: JSON.stringify({ type: "connection_ack" }) });
      return this.sent.find(frame => frame.type === "subscribe");
    }
    push(subscription, conversationId, incarnation, sequence) {
      this.onmessage({ data: JSON.stringify({ type: "next", id: subscription.id,
        payload: { data: { conversationEvents: {
          items: [event(conversationId, sequence)], nextCursor: { incarnation, conversationId, sequence },
          complete: true, refreshRequired: false,
        } } } }) });
    }
  }
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = previous; });
  return values;
}

test("refresh is opt-in and legacy initialization never requires the new query", async () => {
  const setup = fixture({ enabled: false });
  assert.equal(setup.client.sessionRefreshState, "disabled");
  assert.equal(setup.client.sessionBinding, undefined);
  await setup.client.initialize();
  assert.deepEqual(setup.requests.map(call => call.operation), ["communication.route"]);
  await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_REQUIRED" });
  assert.equal(setup.requests.length, 1);
  assert.equal(setup.hookCalls.length, 0);
});

test("enrollment proves the original bearer once and exposes only cloned metadata", async () => {
  const setup = fixture({ revision: "9007199254740993" });
  assert.equal(setup.client.sessionRefreshState, "uninitialized");
  await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_REQUIRED" });
  assert.equal(setup.requests.length, 0);
  await setup.client.initialize();
  await setup.client.initialize();
  assert.equal(setup.requests.filter(call => call.operation === "communication.currentSession").length, 1);
  assert.deepEqual(setup.client.sessionBinding, setup.original);
  setup.client.sessionBinding.deviceId = id();
  assert.deepEqual(setup.client.sessionBinding, setup.original);
  assert.equal(setup.client.sessionRefreshState, "ready");
  const current = setup.requests.find(call => call.operation === "communication.currentSession");
  assert.equal(current.credential, setup.originalToken);
  assert.equal(current.request.variables.input, undefined);
  assert.equal(current.request.variables.context.observedServingEpoch, "1");
  assert.deepEqual(v1Operations["communication.currentSession"].inputFields, []);
  assert.doesNotMatch(current.request.query, /sessionToken|tokenExpiresAt|input:/);
  await assert.rejects(setup.client.http.execute("communication.currentSession", setup.projectId,
    { sessionId: id() }), { code: "INVALID_REQUEST" });
  const updated = await setup.client.refreshSession();
  assert.equal(updated.sessionRevision, "9007199254740994");
});

test("original binding cannot be manufactured from a revoked, foreign or legacy-provider response", async () => {
  for (const failure of ["denied", "principal", "incarnation", "legacy", "envelope"]) {
    const setup = fixture();
    setup.handle = ({ operation, request }) => {
      if (operation !== "communication.currentSession") return;
      if (failure === "denied") return denied();
      if (failure === "legacy") return Response.json({ errors: [{ message: "Unknown currentSession field" }] });
      return reply(request, { status: failure === "envelope" ? "committed" : "ok",
        result: { ...setup.original, ...(failure === "principal" ? { principalId: id() } : {}),
          ...(failure === "incarnation" ? { incarnation: id() } : {}) } });
    };
    await assert.rejects(setup.client.initialize());
    assert.equal(setup.client.sessionBinding, undefined);
    assert.equal(setup.client.sessionRefreshState, "uninitialized");
    await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_REQUIRED" });
    assert.equal(setup.hookCalls.length, 0);
  }
});

test("same-session replacement retains the transport, original unknown custody and synchronous journal", async () => {
  const setup = fixture(), conversationId = id(), requestId = id();
  await setup.client.initialize();
  setup.handle = ({ operation }) => { if (operation === "communication.sendMessage") throw new Error("Lost response"); };
  await assert.rejects(setup.client.send(conversationId, "original", requestId), { code: "TRANSPORT_UNKNOWN" });
  const transport = setup.client.http, thread = setup.client.conversation(conversationId);
  const before = transport.recoveryStates, stored = [...setup.saved.values.entries()];
  const binding = await setup.client.refreshSession();
  assert.equal(setup.client.http, transport);
  assert.equal(thread.client, setup.client);
  assert.deepEqual(transport.recoveryStates, before);
  assert.deepEqual([...setup.saved.values.entries()], stored);
  assert.deepEqual(binding, setup.current);
  assert.equal(setup.client.sessionRefreshState, "ready");
  setup.handle = ({ operation, request }) => operation === "communication.resolveRequest"
    ? reply(request, { result: resolution(requestId, "notObservedYet") }) : undefined;
  await thread.messages.send({ text: "original" }, { requestId });
  const mutations = setup.requests.filter(call => call.operation === "communication.sendMessage");
  assert.equal(mutations[1].credential, setup.lastRenewal.sessionToken);
  assert.deepEqual(mutations[1].request, mutations[0].request);
  const after = transport.recoveryStates[0];
  assert.equal(after.retryDeadline, before[0].retryDeadline);
  assert.equal(after.firstSubmittedAt, before[0].firstSubmittedAt);
  assert.equal(after.payloadFingerprint, before[0].payloadFingerprint);
  assert.equal(after.attemptCount, 2);
  assert.doesNotMatch([...setup.saved.values.values()].join(""), /session-test-secret|sessionToken|tokenExpiresAt/);
});

for (const field of ["sessionId", "principalId", "deviceId", "incarnation", "sessionRevision", "expiresAt", "status", "tokenExpiresAt"]) {
  test(`renewed bootstrap ${field} cannot contradict candidate authority proof or restore old credentials`, async () => {
    const setup = fixture();
    await setup.client.initialize();
    setup.refreshHook = async () => {
      const candidate = setup.renew();
      if (field === "tokenExpiresAt") candidate.tokenExpiresAt = new Date(Date.parse(candidate.tokenExpiresAt) + 1000).toISOString();
      else candidate.session[field] = field === "sessionRevision" ? "9007199254740993" :
        field === "expiresAt" ? new Date(Date.parse(candidate.session.expiresAt) + 1000).toISOString() :
        field === "status" ? "revoked" : id();
      return candidate;
    };
    await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_UNVERIFIED" });
    assert.equal(setup.client.sessionRefreshState, "blocked");
    assert.deepEqual(setup.client.sessionBinding, setup.original);
    const count = setup.requests.length;
    await assert.rejects(setup.client.send(id(), "not admitted"), { code: "SESSION_REFRESH_REQUIRED" });
    assert.equal(setup.requests.length, count);
    assert.equal(setup.client.http.recoveryStates.length, 0);
  });
}

for (const kind of ["session", "principal", "device", "incarnation", "project", "backend", "portal", "revoked", "expired"]) {
  test(`candidate ${kind} credentials are never adopted, and old admission needs positive authority proof`, async () => {
    const setup = fixture();
    await setup.client.initialize();
    setup.refreshHook = async () => {
      const foreign = { ...setup.original, sessionId: id(), sessionRevision: "2",
        expiresAt: new Date(Date.parse(setup.original.expiresAt) + 60000).toISOString(),
        ...(kind === "principal" ? { principalId: id() } : {}),
        ...(kind === "device" ? { deviceId: id() } : {}),
        ...(kind === "incarnation" ? { incarnation: id() } : {}),
        ...(kind === "revoked" ? { status: "revoked" } : {}),
        ...(kind === "expired" ? { expiresAt: new Date(Date.now() - 1000).toISOString() } : {}),
      };
      return setup.issue(foreign, { project: kind === "project" ? id() : setup.projectId,
        kind: ["backend", "portal"].includes(kind) ? kind : "client" });
    };
    await assert.rejects(setup.client.refreshSession());
    assert.equal(setup.client.sessionRefreshState, "ready");
    assert.deepEqual(setup.client.sessionBinding, setup.original);
    assert.equal(setup.requests.at(-1).operation, "communication.currentSession");
    assert.equal(setup.requests.at(-1).credential, setup.originalToken);
    await setup.client.send(id(), "old authority actually proved");
    assert.equal(setup.requests.at(-1).credential, setup.originalToken);
  });
}

for (const field of ["principalId", "deviceId"]) {
  test(`a same-ID authority projection with a changed ${field} cannot retarget the enrolled client`, async () => {
    const setup = fixture();
    await setup.client.initialize();
    setup.refreshHook = async () => {
      Object.assign(setup.current, { [field]: id(), sessionRevision: "2",
        expiresAt: new Date(Date.parse(setup.original.expiresAt) + 60000).toISOString() });
      const candidate = setup.issue(setup.current);
      setup.rows.set(setup.original.sessionId, setup.current);
      return candidate;
    };
    await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_UNVERIFIED" });
    assert.equal(setup.client.sessionRefreshState, "blocked");
    assert.deepEqual(setup.client.sessionBinding, setup.original);
  });
}

for (const mode of ["stale", "shorter", "expired", "counter", "malformed", "redirect"]) {
  test(`invalid ${mode} replacement is rejected without resetting original scope`, async () => {
    const setup = fixture();
    await setup.client.initialize();
    setup.refreshHook = async () => {
      if (mode === "stale") return { session: { ...setup.original },
        sessionToken: setup.originalToken, tokenExpiresAt: setup.original.expiresAt };
      const candidate = setup.renew();
      if (mode === "shorter") {
        setup.current.expiresAt = new Date(Date.parse(setup.original.expiresAt) - 1000).toISOString();
        Object.assign(candidate, setup.issue(setup.current));
        setup.rows.set(setup.original.sessionId, setup.current);
      }
      if (mode === "expired") setup.deniedTokens.add(candidate.sessionToken);
      if (mode === "counter") candidate.session.sessionRevision = "02";
      if (mode === "malformed") return { ...candidate, sessionToken: null };
      if (mode === "redirect") setup.handle = ({ operation, request }) => operation === "communication.route"
        ? reply(request, { result: { projectId: setup.projectId, incarnation: setup.incarnation, servingEpoch: "1",
          communicationBase: "https://foreign.invalid", wssUrl: "wss://foreign.invalid/graphql",
          expiresAt: new Date(Date.now() + 60000).toISOString(), signature: "fixture" } }) : undefined;
      return candidate;
    };
    await assert.rejects(setup.client.refreshSession());
    assert.equal(setup.client.sessionRefreshState, mode === "stale" ? "ready" : "blocked");
    assert.deepEqual(setup.client.sessionBinding, setup.original);
    assert.equal(setup.client.http.incarnation, setup.incarnation);
    assert.equal(setup.client.projectId, setup.projectId);
  });
}

test("commit-then-throw remains blocked; explicit/coalesced retry retrieves the same original renewal", async () => {
  const setup = fixture();
  await setup.client.initialize();
  setup.refreshHook = async () => { const next = setup.renew(); throw new Error(next.sessionToken); };
  const failed = await setup.client.refreshSession().then(() => assert.fail("Renewal is unverified"), error => error);
  assert.equal(failed.code, "SESSION_REFRESH_UNVERIFIED");
  assert.doesNotMatch(String(failed) + String(failed.cause), /candidate-session-test-secret/);
  assert.equal(setup.client.sessionRefreshState, "blocked");
  assert.equal(setup.renewals, 1);
  const gate = deferred();
  setup.refreshHook = async current => {
    assert.deepEqual(current, setup.original);
    await gate.promise;
    return setup.lastRenewal;
  };
  const first = setup.client.refreshSession(), second = setup.client.refreshSession();
  await turn();
  assert.equal(setup.client.sessionRefreshState, "refreshing");
  assert.equal(setup.hookCalls.length, 2);
  gate.resolve();
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(a, setup.current);
  assert.deepEqual(b, a);
  assert.equal(setup.renewals, 1);
  assert.equal(setup.client.sessionRefreshState, "ready");
});

test("candidate and old-bearer read failures do not reopen old-token HTTP or realtime admission", async t => {
  const ws = sockets(t), setup = fixture(), conversationId = id(), errors = [];
  await setup.client.initialize();
  const replay = await setup.client.watch(conversationId, async () => {}, error => errors.push(error));
  t.after(() => replay.close());
  setup.refreshHook = async () => {
    const candidate = setup.renew();
    setup.handle = ({ operation }) => {
      if (operation === "communication.currentSession") throw new Error("Authority unreadable");
    };
    return candidate;
  };
  await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_UNVERIFIED" });
  assert.equal(setup.client.sessionRefreshState, "blocked");
  assert.equal(ws.length, 1);
  const count = setup.requests.length;
  await assert.rejects(setup.client.http.execute("communication.events", setup.projectId,
    { conversationId, limit: 100 }), { code: "SESSION_REFRESH_REQUIRED" });
  await assert.rejects(replay.reconcile(), { code: "SESSION_REFRESH_REQUIRED" });
  assert.equal(setup.requests.length, count);
  assert.equal(replay.cursor.sequence, "0");
});

test("new replay and explicit resync reject during renewal without claiming readiness or closing active handles", async t => {
  const ws = sockets(t), setup = fixture(), conversationId = id(), gate = deferred(), entered = deferred();
  await setup.client.initialize();
  const replay = await setup.client.watch(conversationId, async () => {}, () => {});
  t.after(() => replay.close());
  setup.refreshHook = async () => { entered.resolve(); await gate.promise; return setup.renew(); };
  const refresh = setup.client.refreshSession();
  await entered.promise;
  await assert.rejects(setup.client.watch(id(), async () => {}, () => {}), { code: "SESSION_REFRESH_REQUIRED" });
  await assert.rejects(setup.client.resyncAuthorizedHistory(conversationId, async () => {}, () => {}),
    { code: "SESSION_REFRESH_REQUIRED" });
  assert.equal(replay.closed, false);
  assert.equal(ws.length, 1);
  gate.resolve();
  await refresh;
  assert.equal(ws.length, 2);
});

test("a watcher still initializing when refresh starts cannot report a paused empty replay as ready", async t => {
  sockets(t);
  const setup = fixture(), conversationId = id(), entered = deferred(), gate = deferred();
  await setup.client.initialize();
  setup.handle = async ({ operation, credential }) => {
    if (operation === "communication.events" && credential === setup.originalToken) {
      entered.resolve(); await gate.promise;
    }
  };
  const opening = setup.client.watch(conversationId, async () => {}, () => {});
  const interrupted = assert.rejects(opening, { code: "SESSION_REFRESH_REQUIRED" });
  await entered.promise;
  const refresh = setup.client.refreshSession();
  gate.resolve();
  await Promise.all([interrupted, refresh]);
});

test("an uncommitted hook failure can resume only after old authority is reverified", async t => {
  const ws = sockets(t), setup = fixture(), conversationId = id();
  await setup.client.initialize();
  const replay = await setup.client.watch(conversationId, async () => {}, () => {});
  t.after(() => replay.close());
  setup.refreshHook = async () => { throw new Error("Backend unavailable before renewal"); };
  await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_FAILED" });
  assert.equal(setup.client.sessionRefreshState, "ready");
  assert.equal(setup.renewals, 0);
  assert.equal(ws.length, 2);
  ws[1].subscribe();
  assert.equal(ws[1].sent[0].payload.token, setup.originalToken);
  assert.ok(setup.requests.some((call, i) => i > 2 && call.operation === "communication.currentSession" &&
    call.credential === setup.originalToken));
});

test("even an uncommitted failure stays blocked when the old-bearer authority check is unreadable", async () => {
  const setup = fixture();
  await setup.client.initialize();
  setup.refreshHook = async () => {
    setup.handle = ({ operation }) => { if (operation === "communication.currentSession") throw new Error("Read unavailable"); };
    throw new Error("Backend renewal outcome unavailable");
  };
  await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_UNVERIFIED" });
  assert.equal(setup.client.sessionRefreshState, "blocked");
  assert.equal(setup.renewals, 0);
  const count = setup.requests.length;
  await assert.rejects(setup.client.send(id(), "do not assume rollback"), { code: "SESSION_REFRESH_REQUIRED" });
  assert.equal(setup.requests.length, count);
});

test("candidate binding is checked at its validated route epoch, not the stale original epoch", async () => {
  const setup = fixture();
  await setup.client.initialize();
  setup.refreshHook = async () => { const next = setup.renew(); setup.servingEpoch = "2"; return next; };
  await setup.client.refreshSession();
  const current = setup.requests.find(call => call.operation === "communication.currentSession" &&
    call.credential === setup.lastRenewal.sessionToken);
  assert.equal(current.request.variables.context.observedServingEpoch, "2");
  assert.equal(setup.client.http.servingEpoch, "2");
  assert.equal(setup.client.http.incarnation, setup.incarnation);
});

test("renewal waits for old HTTP work and new request inputs/authentication are safely snapshotted", { timeout: 5000 }, async () => {
  const setup = fixture(), firstId = id(), secondId = id(), conversationId = id(), entered = deferred(), gate = deferred();
  await setup.client.initialize();
  setup.handle = async ({ operation, request }) => {
    if (operation === "communication.sendMessage" && request.variables.context.requestId === firstId) {
      entered.resolve();
      await gate.promise;
      throw new Error("Old response unknown");
    }
  };
  const pending = setup.client.send(conversationId, "original", firstId);
  const unknown = assert.rejects(pending, { code: "TRANSPORT_UNKNOWN" });
  await entered.promise;
  const renewing = setup.client.refreshSession();
  await turn();
  assert.equal(setup.hookCalls.length, 0);
  const input = { conversationId, text: "queued original", props: { nested: { text: "original" } } };
  const queued = setup.client.http.execute("communication.sendMessage", setup.projectId, input, secondId);
  input.text = "changed"; input.props.nested.text = "changed";
  await turn();
  assert.equal(setup.requests.filter(call => call.operation === "communication.sendMessage").length, 1);
  gate.resolve();
  await Promise.all([unknown, renewing, queued]);
  const [first, second] = setup.requests.filter(call => call.operation === "communication.sendMessage");
  assert.equal(first.credential, setup.originalToken);
  assert.equal(second.credential, setup.lastRenewal.sessionToken);
  assert.deepEqual(second.request.variables.input, {
    conversationId, props: { nested: { text: "original" } }, text: "queued original",
  });
  const original = setup.client.http.recoveryStates.find(state => state.requestId === firstId);
  assert.equal(original.resolutionState, "unknown");
  assert.equal(original.attemptCount, 1);
  assert.equal(original.retryDeadline, original.firstSubmittedAt + 60000);
});

test("an already-started retry drains using one original bearer instead of deadlocking on its nested queries", { timeout: 5000 }, async () => {
  const setup = fixture(), conversationId = id(), requestId = id(), entered = deferred(), gate = deferred();
  await setup.client.initialize();
  setup.handle = ({ operation }) => { if (operation === "communication.sendMessage") throw new Error("Lost"); };
  await assert.rejects(setup.client.send(conversationId, "original", requestId), { code: "TRANSPORT_UNKNOWN" });
  const before = setup.client.http.recoveryStates[0];
  let resolved = 0, committed = false, ack;
  setup.handle = async ({ operation, request }) => {
    if (operation === "communication.resolveRequest") {
      if (++resolved === 1) { entered.resolve(); await gate.promise; }
      return reply(request, { result: resolution(requestId, committed ? "committed" : "notObservedYet",
        committed ? { messageAck: ack } : null) });
    }
    if (operation === "communication.sendMessage") {
      committed = true;
      ack = { messageId: id(), conversationId, sequence: "1", revision: "1", status: "sent",
        cursor: { incarnation: setup.incarnation, conversationId, sequence: "1" } };
      return reply(request, { result: ack });
    }
  };
  const retry = setup.client.requests.retry(requestId);
  await entered.promise;
  const refresh = setup.client.refreshSession();
  await turn();
  assert.equal(setup.hookCalls.length, 0);
  gate.resolve();
  await Promise.all([retry, refresh]);
  const oldWork = setup.requests.filter(call => ["communication.resolveRequest", "communication.sendMessage"].includes(call.operation));
  assert.ok(oldWork.every(call => call.credential === setup.originalToken));
  assert.equal(setup.client.http.recoveryStates[0].attemptCount, 2);
  assert.equal(setup.client.http.recoveryStates[0].retryDeadline, before.retryDeadline);
});

test("a failed synchronous receipt write retains settled custody through renewal and admits no replay", async () => {
  const setup = fixture(), requestId = id(), conversationId = id(), save = setup.saved.setItem;
  await setup.client.initialize();
  setup.saved.setItem = (key, value) => {
    if (key.startsWith("convohop.requests:") && JSON.parse(value).some(state => state.resolutionState === "committed"))
      throw new Error("Receipt durability unavailable");
    save(key, value);
  };
  await assert.rejects(setup.client.send(conversationId, "committed original", requestId), /Receipt durability unavailable/);
  const before = setup.client.http.recoveryStates, journal = [...setup.saved.values.entries()];
  await setup.client.refreshSession();
  assert.equal(before[0].resolutionState, "committed");
  assert.deepEqual(setup.client.http.recoveryStates, before);
  assert.deepEqual([...setup.saved.values.entries()], journal);
  setup.saved.setItem = save;
  setup.handle = ({ operation, request }) => operation === "communication.resolveRequest"
    ? reply(request, { result: resolution(requestId, "notObservedYet") }) : undefined;
  await assert.rejects(setup.client.requests.retry(requestId), { code: "RESOLUTION_REQUIRED" });
  assert.equal(setup.requests.filter(call => call.operation === "communication.sendMessage").length, 1);
  assert.equal(setup.client.http.recoveryStates[0].attemptCount, 1);
});

test("refresh preserves successfully applied frontier, drops old queued pages and reauthorizes the same replay", { timeout: 5000 }, async t => {
  const ws = sockets(t), setup = fixture(), conversationId = id(), entered = deferred(), gate = deferred(), applied = [], errors = [];
  await setup.client.initialize();
  const replay = await setup.client.watch(conversationId, async events => {
    if (events[0]?.sequence === "1") {
      entered.resolve(); await gate.promise;
      await setup.client.http.execute("communication.route", setup.projectId, {});
    }
    applied.push(...events.map(value => value.sequence));
  }, error => errors.push(error));
  t.after(() => replay.close());
  const old = ws[0], subscription = old.subscribe();
  old.push(subscription, conversationId, setup.incarnation, "1");
  old.push(subscription, conversationId, setup.incarnation, "2");
  await entered.promise;
  setup.handle = ({ operation, request, credential }) => operation === "communication.events" &&
    credential !== setup.originalToken ? reply(request, { result: {
      items: [event(conversationId, "2")], nextCursor: { incarnation: setup.incarnation, conversationId, sequence: "2" },
      complete: true, refreshRequired: false,
    } }) : undefined;
  const refresh = setup.client.refreshSession();
  await turn();
  assert.equal(setup.hookCalls.length, 0);
  assert.equal(replay.cursor.sequence, "0");
  gate.resolve();
  await refresh;
  assert.deepEqual(applied, ["1", "2"]);
  assert.equal(replay.closed, false);
  assert.equal(replay.cursor.sequence, "2");
  assert.equal(ws.length, 2);
  const resumed = ws[1].subscribe();
  assert.equal(ws[1].sent[0].payload.token, setup.lastRenewal.sessionToken);
  assert.equal(resumed.payload.variables.input.after.sequence, "2");
  old.push(subscription, conversationId, setup.incarnation, "100");
  old.onclose({ code: 4401 });
  old.onerror();
  await turn();
  assert.deepEqual(applied, ["1", "2"]);
  assert.equal(replay.cursor.sequence, "2");
  assert.deepEqual(errors, []);
});

test("an in-flight old reconnect cannot invalidate a retiring application's successful frontier", { timeout: 5000 }, async t => {
  const ws = sockets(t), setup = fixture(), conversationId = id(), entered = deferred(), applyGate = deferred();
  const routeEntered = deferred(), routeGate = deferred(), applied = [], errors = [];
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(Math, "random", () => 0);
  await setup.client.initialize();
  const replay = await setup.client.watch(conversationId, async events => {
    if (events.length) { entered.resolve(); await applyGate.promise; }
    applied.push(...events.map(value => value.sequence));
  }, error => errors.push(error));
  t.after(() => replay.close());
  const subscription = ws[0].subscribe();
  ws[0].push(subscription, conversationId, setup.incarnation, "1");
  await entered.promise;
  setup.handle = async ({ operation, request, credential }) => {
    if (operation === "communication.route" && credential === setup.originalToken) {
      routeEntered.resolve(); await routeGate.promise;
    }
    if (operation === "communication.events" && credential !== setup.originalToken) return reply(request, { result: {
      items: request.variables.input.after.sequence === "1" ? [] : [event(conversationId, "1")],
      nextCursor: { incarnation: setup.incarnation, conversationId, sequence: "1" },
      complete: true, refreshRequired: false,
    } });
  };
  ws[0].onclose({ code: 1006 });
  t.mock.timers.tick(1000);
  await routeEntered.promise;
  const refreshing = setup.client.refreshSession();
  await turn();
  routeGate.resolve();
  await turn();
  applyGate.resolve();
  await refreshing;
  assert.deepEqual(applied, ["1"]);
  assert.equal(replay.cursor.sequence, "1");
  assert.deepEqual(errors, []);
  assert.equal(ws.length, 2);
});

test("retiring application failure prevents renewal and waits for all conversation callbacks to settle", { timeout: 5000 }, async t => {
  const ws = sockets(t), setup = fixture(), firstId = id(), secondId = id(), entered = deferred();
  const firstGate = deferred(), secondGate = deferred();
  await setup.client.initialize();
  let starts = 0;
  const first = await setup.client.watch(firstId, async events => {
    if (!events.length) return;
    if (++starts === 2) entered.resolve();
    await firstGate.promise;
  }, () => {});
  const second = await setup.client.watch(secondId, async events => {
    if (!events.length) return;
    if (++starts === 2) entered.resolve();
    await secondGate.promise;
  }, () => {});
  t.after(() => { first.close(); second.close(); });
  ws[0].push(ws[0].subscribe(), firstId, setup.incarnation, "1");
  ws[1].push(ws[1].subscribe(), secondId, setup.incarnation, "1");
  await entered.promise;
  const refreshing = setup.client.refreshSession();
  const rejected = assert.rejects(refreshing, { code: "SESSION_REFRESH_REJECTED" });
  firstGate.reject(new Error("Old application failed"));
  await turn();
  assert.equal(setup.client.sessionRefreshState, "refreshing");
  assert.equal(setup.hookCalls.length, 0);
  secondGate.resolve();
  await rejected;
  assert.equal(setup.renewals, 0);
  assert.equal(first.cursor.sequence, "0");
  assert.equal(second.cursor.sequence, "1");
});

test("a socket close failure cannot skip application retirement or gate its required old HTTP work", { timeout: 5000 }, async t => {
  const ws = sockets(t), setup = fixture(), conversationId = id(), entered = deferred(), gate = deferred();
  await setup.client.initialize();
  const replay = await setup.client.watch(conversationId, async events => {
    if (!events.length) return;
    entered.resolve(); await gate.promise;
    await setup.client.http.execute("communication.route", setup.projectId, {});
  }, () => {});
  t.after(() => replay.close());
  ws[0].push(ws[0].subscribe(), conversationId, setup.incarnation, "1");
  await entered.promise;
  t.mock.method(ws[0], "close", () => { throw new Error("Socket close failed"); });
  const refreshing = setup.client.refreshSession();
  const rejected = assert.rejects(refreshing, { code: "SESSION_REFRESH_REJECTED" });
  await turn();
  assert.equal(setup.client.sessionRefreshState, "refreshing");
  assert.equal(setup.hookCalls.length, 0);
  gate.resolve();
  await rejected;
  assert.equal(setup.renewals, 0);
  assert.equal(replay.cursor.sequence, "1");
  assert.equal(setup.client.sessionRefreshState, "ready");
});

test("installed-candidate replay failure is explicit, keeps new binding, and never silently resets the cursor", async t => {
  const ws = sockets(t), setup = fixture(), conversationId = id(), errors = [];
  await setup.client.initialize();
  const replay = await setup.client.watch(conversationId, async () => {}, error => errors.push(error));
  t.after(() => replay.close());
  const key = `convohop.v1.cursor:${setup.projectId}:${setup.original.principalId}:${conversationId}`;
  const before = setup.saved.getItem(key);
  setup.refreshHook = async () => {
    const candidate = setup.renew();
    setup.handle = ({ operation, request }) => operation === "communication.events"
      ? Response.json({ errors: [{ message: "Explicit current history resynchronization required",
        extensions: { code: "CURSOR_EXPIRED", requestId: request.variables.context.requestId, outcome: "rejected", status: 409 } }] }) : undefined;
    return candidate;
  };
  await assert.rejects(setup.client.refreshSession(), { code: "CURSOR_EXPIRED" });
  assert.equal(setup.client.sessionRefreshState, "ready");
  assert.deepEqual(setup.client.sessionBinding, setup.current);
  assert.equal(replay.closed, true);
  assert.equal(setup.saved.getItem(key), before);
  assert.equal(ws.length, 1);
  assert.equal(errors[0].code, "CURSOR_EXPIRED");
  await setup.client.send(conversationId, "still uses verified replacement");
  assert.equal(setup.requests.at(-1).credential, setup.lastRenewal.sessionToken);
});

test("expiry uses the authority's JWT-second floor, and no renewal resurrects an expired enrollment", async t => {
  const setup = fixture();
  await setup.client.initialize();
  const effectiveExpiry = Math.floor(Date.parse(setup.original.expiresAt) / 1000) * 1000;
  t.mock.method(Date, "now", () => effectiveExpiry);
  assert.ok(Date.parse(setup.original.expiresAt) > Date.now(), "Public fractional deadline is not bearer validity");
  await assert.rejects(setup.client.refreshSession(), { code: "SESSION_REFRESH_REQUIRED" });
  assert.equal(setup.hookCalls.length, 0);
});

test("expiry during an old request drain prevents renewal without extending that request's budget", { timeout: 5000 }, async t => {
  const setup = fixture(), conversationId = id(), requestId = id(), entered = deferred(), gate = deferred();
  await setup.client.initialize();
  const start = Date.now();
  let now = start;
  t.mock.method(Date, "now", () => now);
  setup.handle = async ({ operation }) => {
    if (operation === "communication.sendMessage") { entered.resolve(); await gate.promise; throw new Error("Unknown"); }
  };
  const pending = assert.rejects(setup.client.send(conversationId, "original", requestId), { code: "TRANSPORT_UNKNOWN" });
  await entered.promise;
  const refresh = setup.client.refreshSession();
  const blocked = assert.rejects(refresh, { code: "SESSION_REFRESH_UNVERIFIED" });
  now = Math.floor(Date.parse(setup.original.expiresAt) / 1000) * 1000;
  gate.resolve();
  await Promise.all([pending, blocked]);
  assert.equal(setup.hookCalls.length, 0);
  assert.equal(setup.client.sessionRefreshState, "blocked");
  const state = setup.client.http.recoveryStates[0];
  assert.equal(state.requestId, requestId);
  assert.equal(state.firstSubmittedAt, start);
  assert.equal(state.retryDeadline, start + 60000);
  assert.equal(state.attemptCount, 1);
});

test("existing live handles use the verified replacement without replaying spent native admission", async () => {
  const setup = fixture();
  await setup.client.initialize();
  const conversationId = id(), liveSessionId = id(), participationId = id(), leaseId = id(), requestId = id();
  const expiresAt = new Date(Date.now() + 60000).toISOString();
  const participation = { participationId, principalId: setup.original.principalId, membershipEpoch: "1",
    role: "PUBLISHER", state: "JOINED", permissions: { microphone: true, camera: true, subscribe: true },
    reservationExpiresAt: expiresAt, nativeConnectionId: null, mediaCutoff: null };
  const snapshot = { liveSessionId, conversationId, creatorId: setup.original.principalId, kind: "INTERACTIVE",
    mediaProfile: "AUDIO_VIDEO", state: "READY", generation: "1", revision: "2", createdAt: new Date().toISOString(),
    expiresAt, myParticipation: participation, mediaCutoff: null };
  const live = new LiveSessionHandle(setup.client, snapshot), handle = new LiveParticipationHandle(live, participation);
  const grant = { liveSessionId, participationId, generation: "1", roomName: "fixture", participantIdentity: "fixture",
    livekitUrl: "ws://localhost:17880", transportToken: "native-test-secret", admissionTicket: { signature: "native-ticket-secret" },
    forwardingLease: { signature: "native-lease-secret" }, transportExpiresAt: expiresAt, admissionExpiresAt: expiresAt,
    leaseExpiresAt: expiresAt, leasePolicyId: "fixture" };
  setup.handle = ({ operation, request }) => {
    if (operation === "communication.liveSession") return reply(request, { result: snapshot });
    if (operation === "communication.liveSessionCredentials") return reply(request, { result: grant });
    if (operation === "communication.resolveRequest") return reply(request, { result: resolution(requestId, "committed", {
      liveCredentialIssuance: { liveSessionId, participationId, generation: "1", leaseId,
        grantOrdinal: "1", admissionExpiresAt: expiresAt, leaseExpiresAt: expiresAt },
    }) });
  };
  await handle.connectionGrant({ requestId });
  handle.connectionAttempted();
  const before = setup.client.http.recoveryStates;
  await setup.client.refreshSession();
  assert.deepEqual(setup.client.http.recoveryStates, before);
  assert.equal(handle.live, live);
  assert.deepEqual(await live.get(), snapshot);
  assert.equal(setup.requests.at(-1).credential, setup.lastRenewal.sessionToken);
  await assert.rejects(handle.connectionGrant(), { code: "RESOLUTION_REQUIRED", requestId });
  assert.equal(setup.requests.filter(call => call.operation === "communication.liveSessionCredentials").length, 1);
  assert.equal(setup.client.http.recoveryStates[0].mediaAdmissionAttempted, true);
  assert.doesNotMatch([...setup.saved.values.values()].join(""), /native-test-secret|native-ticket-secret|native-lease-secret|session-test-secret/);
});
