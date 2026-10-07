import test from "node:test";
import assert from "node:assert/strict";
import { V1ProjectServerClient } from "@convohop/server";
import { V1Client, v1Operations } from "@convohop/client";
import { full, reply, resolution } from "../../../test/graphql-fixtures.mjs";
import { asyncStorage } from "../../../test/recovery-fixtures.mjs";

const id = () => crypto.randomUUID();
const committedAt = "2026-10-02T07:00:00.000Z";
const checkedAt = "2026-10-02T07:02:00.000Z";
const originalExpiry = "2026-10-02T07:01:00.000Z";
const activeExpiry = "2026-10-02T07:03:00.000Z";
const expiredExpiry = "2026-10-02T07:01:30.000Z";
const secret = "fixture-credential-must-not-appear";

function outcome(requestId, incarnation, operation = "renewSession", currentState = "active") {
  const originalSession = {
    sessionId: id(), principalId: id(), deviceId: id(), incarnation,
    sessionRevision: operation === "issueSession" ? "1" : "9007199254740993",
    expiresAt: originalExpiry, status: "active",
  };
  const currentSession = currentState === "missing" ? null : {
    ...originalSession, sessionRevision: operation === "issueSession" ? "2" : "9007199254740994",
    expiresAt: currentState === "active" ? activeExpiry : expiredExpiry,
    status: currentState,
  };
  return full("SessionRequestOutcome", {
    state: "committed", requestId, checkedAt, operation, receiptId: id(), committedAt,
    originalSession, currentState, currentSession,
  });
}

function fixture({ operation, currentState, asyncRecoveryStorage } = {}) {
  const projectId = id(), incarnation = id(), requestId = id(), requests = [];
  const setup = { projectId, incarnation, requestId, requests,
    result: outcome(requestId, incarnation, operation, currentState), envelope: {} };
  setup.client = new V1ProjectServerClient({
    baseUrl: "http://localhost:18080", projectId, incarnation, backendKey: secret,
    ...(asyncRecoveryStorage ? { asyncRecoveryStorage } : {}),
    fetch: async (url, init) => {
      const request = JSON.parse(init.body); requests.push(request);
      assert.equal(url, "http://localhost:18080/graphql");
      assert.equal(init.headers.authorization, "Bearer " + secret);
      if (request.operationName === "CommunicationRoute")
        return reply(request, { result: { projectId, incarnation, servingEpoch: "3" } });
      if (request.operationName === "CommunicationIssueSession" || request.operationName === "CommunicationRenewSession")
        throw new Error("Original mutation response unavailable");
      assert.equal(request.operationName, "CommunicationSessionRequestOutcome");
      setup.beforeResponse?.();
      return Response.json({ data: { sessionRequestOutcome: {
        status: "ok", requestId: request.variables.context.requestId, serverTime: checkedAt,
        result: setup.result, ...setup.envelope,
      } } });
    },
  });
  return setup;
}

async function rejectsInvalid(setup, custody = []) {
  await assert.rejects(setup.client.sessionRequestOutcome(setup.requestId), error => {
    assert.equal(error.code, "INVALID_RESPONSE");
    assert.equal(error.outcome, "unknown");
    assert.equal(error.requestId, setup.requests.at(-1).variables.context.requestId);
    assert.notEqual(error.requestId, setup.requestId);
    assert.ok(!String(error).includes(secret));
    assert.ok(!JSON.stringify(error).includes(secret));
    return true;
  });
  assert.deepEqual(setup.client.http.recoveryStates, custody);
}

for (const operation of ["issueSession", "renewSession"]) {
  for (const currentState of ["active", "expired", "revoked", "missing"]) {
    test(`returns committed ${operation} ${currentState} as credential-free historical evidence`, async () => {
      const setup = fixture({ operation, currentState });
      await setup.client.initialize();
      const result = await setup.client.sessionRequestOutcome(setup.requestId);
      const expected = { ...setup.result };
      if (currentState === "missing") delete expected.currentSession;
      assert.deepEqual(result, expected);
      assert.equal(result.originalSession.status, "active");
      assert.equal(result.originalSession.expiresAt, originalExpiry);
      if (currentState !== "missing")
        assert.equal(result.currentSession.sessionRevision, operation === "issueSession" ? "2" : "9007199254740994");
      const request = setup.requests[1];
      assert.deepEqual(request.variables.input, { requestId: setup.requestId });
      assert.equal(request.variables.context.projectId, setup.projectId);
      assert.equal(request.variables.context.incarnation, setup.incarnation);
      assert.equal(request.variables.context.observedServingEpoch, "3");
      assert.notEqual(request.variables.context.requestId, setup.requestId);
      assert.ok(request.query.startsWith("query CommunicationSessionRequestOutcome"));
      assert.deepEqual(setup.client.http.recoveryStates, []);
      assert.ok(!JSON.stringify(result).includes(secret));
    });
  }
}

test("notObservedYet accepts explicit GraphQL nulls but proves neither noncommit nor permission to retry", async () => {
  const setup = fixture();
  setup.result = full("SessionRequestOutcome", { state: "notObservedYet", requestId: setup.requestId, checkedAt });
  assert.deepEqual(await setup.client.sessionRequestOutcome(setup.requestId),
    { state: "notObservedYet", requestId: setup.requestId, checkedAt });
  assert.equal(setup.requests.length, 1);
  assert.deepEqual(setup.client.http.recoveryStates, []);
});

test("same-revision current rows and signed-64-bit revisions are preserved without numeric rounding", async () => {
  const setup = fixture();
  setup.result.originalSession.sessionRevision = "9223372036854775807";
  setup.result.currentSession = { ...setup.result.originalSession };
  setup.result.currentState = "expired";
  setup.result.currentSession.status = "expired";
  const result = await setup.client.sessionRequestOutcome(setup.requestId);
  assert.equal(result.originalSession.sessionRevision, "9223372036854775807");
  assert.equal(result.currentSession.sessionRevision, "9223372036854775807");
});

test("SQL disposition and independently sampled timestamps are not reinterpreted as bearer proof", async () => {
  const setup = fixture();
  setup.result.currentSession.expiresAt = "2026-10-02T07:00:00.001Z";
  assert.equal((await setup.client.sessionRequestOutcome(setup.requestId)).currentState, "active");
  setup.result.currentState = "expired";
  setup.result.currentSession.status = "expired";
  setup.result.currentSession.expiresAt = activeExpiry;
  setup.result.committedAt = activeExpiry;
  setup.envelope.serverTime = committedAt;
  assert.equal((await setup.client.sessionRequestOutcome(setup.requestId)).currentState, "expired");
  setup.result.currentState = "revoked";
  setup.result.currentSession.status = "revoked";
  setup.result.currentSession.expiresAt = activeExpiry;
  assert.equal((await setup.client.sessionRequestOutcome(setup.requestId)).currentState, "revoked");
  assert.equal(new Set(setup.requests.map(request => request.variables.context.requestId)).size, 3);
});

test("equal revisions retain original expiry but a higher-revision shorter-TTL renewal may shorten it", async () => {
  const setup = fixture();
  setup.result.currentSession.expiresAt = "2026-10-02T07:00:30.000Z";
  assert.equal((await setup.client.sessionRequestOutcome(setup.requestId)).currentSession.expiresAt,
    "2026-10-02T07:00:30.000Z");
  setup.result.currentSession.sessionRevision = setup.result.originalSession.sessionRevision;
  await rejectsInvalid(setup);
});

const invalidResults = [
  ["different original request ID", value => { value.requestId = id(); }],
  ["accepted rather than committed state", value => { value.state = "accepted"; }],
  ["unknown state", value => { value.state = "missing"; }],
  ["unsupported mutation operation", value => { value.operation = "revokeSession"; }],
  ["operation alias", value => { value.operation = "communication.renewSession"; }],
  ["unknown current disposition", value => { value.currentState = "pending"; }],
  ["missing disposition with a current row", value => { value.currentState = "missing"; }],
  ["present disposition without a current row", value => { value.currentSession = null; }],
  ["historical revoked original", value => { value.originalSession.status = "revoked"; }],
  ["unknown original status", value => { value.originalSession.status = "expired"; }],
  ["active disposition with revoked row", value => { value.currentSession.status = "revoked"; }],
  ["revoked disposition with active row", value => { value.currentState = "revoked"; }],
  ["expired disposition with revoked row", value => { value.currentState = "expired"; value.currentSession.status = "revoked"; }],
  ["expired disposition with active row", value => { value.currentState = "expired"; }],
  ["unknown current row status", value => { value.currentSession.status = "disabled"; }],
  ["current revision regression", value => { value.currentSession.sessionRevision = "9007199254740992"; }],
  ["foreign original incarnation", value => { value.originalSession.incarnation = id(); }],
  ["zero receipt ID", value => { value.receiptId = "00000000-0000-0000-0000-000000000000"; }],
  ["invalid original UUID", value => { value.originalSession.sessionId = "not-an-id"; }],
  ["invalid current UUID", value => { value.currentSession.deviceId = "not-an-id"; }],
  ["null state", value => { value.state = null; }],
  ["null checked timestamp", value => { value.checkedAt = null; }],
  ["noncanonical checked timestamp", value => { value.checkedAt = "2026-10-02T07:02:00Z"; }],
  ["invalid calendar timestamp", value => { value.checkedAt = "2026-02-30T07:02:00.000Z"; }],
  ["noncanonical commit timestamp", value => { value.committedAt = "2026-10-02T07:00:00+00:00"; }],
  ["credential on the outcome", value => { value.sessionToken = secret; }],
  ["credential on the original session", value => { value.originalSession.sessionToken = secret; }],
  ["credential on the current session", value => { value.currentSession.sessionToken = secret; }],
  ["claims on the outcome", value => { value.claims = { credential: secret }; }],
  ["raw receipt on the outcome", value => { value.receipt = { credential: secret }; }],
  ["permit on the outcome", value => { value.permit = { credential: secret }; }],
];
for (const field of ["operation", "receiptId", "committedAt", "originalSession", "currentState"])
  invalidResults.push([`null committed ${field}`, value => { value[field] = null; }]);
for (const field of ["sessionId", "principalId", "deviceId", "incarnation"])
  invalidResults.push([`current ${field} changes the original tuple`, value => { value.currentSession[field] = id(); }]);
for (const field of ["originalSession", "currentSession"]) {
  for (const revision of ["0", "-1", "01", "1.0", "9223372036854775808", 1])
    invalidResults.push([`${field} invalid ${typeof revision} revision ${revision}`, value => { value[field].sessionRevision = revision; }]);
  invalidResults.push([`${field} malformed expiry`, value => { value[field].expiresAt = "not-a-time"; }]);
}
for (const [name, mutate] of invalidResults) {
  test(`rejects ${name} without leaking credentials or writing recovery`, async () => {
    const setup = fixture(); mutate(setup.result); await rejectsInvalid(setup);
  });
}

for (const field of ["operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState"]) {
  test(`notObservedYet refuses contradictory ${field}`, async () => {
    const setup = fixture(), committed = setup.result;
    setup.result = full("SessionRequestOutcome", {
      state: "notObservedYet", requestId: setup.requestId, checkedAt, [field]: committed[field],
    });
    await rejectsInvalid(setup);
  });
}

for (const field of ["operation", "currentSession", "currentState"]) {
  test(`missing selected nullable GraphQL ${field} is not silently treated as null`, async () => {
    const setup = fixture(); delete setup.result[field]; await rejectsInvalid(setup);
  });
}

for (const [name, fields] of [
  ["accepted status", { status: "accepted" }], ["active status", { status: "active" }],
  ["wrong read identity", { requestId: id() }], ["unparseable time", { serverTime: "not-a-time" }],
  ["invalid calendar", { serverTime: "2026-02-30T00:00:00.000Z" }],
  ["credential", { sessionToken: secret }], ["claims", { claims: { credential: secret } }],
]) {
  test(`rejects invalid or credential-bearing reply envelope ${name}`, async () => {
    const setup = fixture(); setup.envelope = fields; await rejectsInvalid(setup);
  });
}

test("invalid original IDs fail before authority calls or recovery initialization", async () => {
  const saved = asyncStorage(), requests = [];
  const client = new V1ProjectServerClient({ baseUrl: "http://localhost:18080",
    projectId: id(), incarnation: id(), backendKey: secret, asyncRecoveryStorage: saved,
    fetch: async request => { requests.push(request); throw new Error("Unexpected effect"); } });
  for (const invalid of ["", "not-an-id", "00000000-0000-0000-0000-000000000000", "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA", 1])
    await assert.rejects(client.sessionRequestOutcome(invalid));
  assert.equal(requests.length, 0);
  assert.equal(saved.reads.length, 0);
  assert.equal(saved.writes.length, 0);
});

test("an outcome read cannot reuse the original mutation ID as its context identity", async t => {
  const setup = fixture();
  t.mock.method(crypto, "randomUUID", () => setup.requestId);
  await assert.rejects(setup.client.sessionRequestOutcome(setup.requestId),
    { code: "INVALID_REQUEST", outcome: "rejected" });
  assert.equal(setup.requests.length, 0);
  assert.deepEqual(setup.client.http.recoveryStates, []);
});

test("outcome reads await one-time asynchronous restoration without creating a durable write", { timeout: 5000 }, async () => {
  const entered = Promise.withResolvers(), load = Promise.withResolvers();
  const saved = asyncStorage({ onRead: async () => { entered.resolve(); await load.promise; } });
  const setup = fixture({ asyncRecoveryStorage: saved });
  assert.equal(saved.reads.length, 0);
  const pending = setup.client.sessionRequestOutcome(setup.requestId);
  await entered.promise;
  assert.equal(setup.requests.length, 0);
  assert.throws(() => setup.client.http.recoveryStates, /initializeRecovery/);
  load.resolve();
  await pending;
  await setup.client.sessionRequestOutcome(setup.requestId);
  assert.equal(saved.reads.length, 1);
  assert.equal(saved.writes.length, 0);
  assert.equal(saved.removals.length, 0);
});

test("failed asynchronous outcome restoration cannot become an empty success or trigger authority effects", async () => {
  const failure = new Error("Database read unavailable");
  const saved = asyncStorage({ onRead: async () => { throw failure; } });
  const setup = fixture({ asyncRecoveryStorage: saved });
  await assert.rejects(setup.client.sessionRequestOutcome(setup.requestId), error => error === failure);
  await assert.rejects(setup.client.sessionRequestOutcome(setup.requestId), error => error === failure);
  assert.equal(saved.reads.length, 1);
  assert.equal(saved.writes.length, 0);
  assert.equal(setup.requests.length, 0);
  assert.throws(() => setup.client.http.recoveryStates, /initializeRecovery/);
});

test("incarnation changes while an outcome read is in flight fail closed", async () => {
  const setup = fixture();
  setup.beforeResponse = () => { setup.client.http.incarnation = id(); };
  await rejectsInvalid(setup);
  assert.equal(setup.requests[0].variables.context.incarnation, setup.incarnation);
});

for (const [name, mutate] of [
  ["operation", value => { value.operation = "issueSession"; }],
  ["principal", value => { value.originalSession.principalId = id(); }],
  ["device", value => { value.originalSession.deviceId = id(); }],
  ["session", value => { value.originalSession.sessionId = id(); }],
  ["expected revision", value => { value.originalSession.sessionRevision = "9007199254740994"; }],
]) {
  test(`outcome ${name} cannot contradict retained original mutation custody`, async () => {
    const setup = fixture(), session = setup.result.originalSession;
    const input = { sessionId: session.sessionId, principalId: session.principalId, deviceId: session.deviceId,
      expectedRevision: "9007199254740992", requestedTtlMs: "60000" };
    await assert.rejects(setup.client.http.execute("communication.renewSession", setup.projectId, input, setup.requestId),
      { code: "TRANSPORT_UNKNOWN" });
    const before = setup.client.http.recoveryStates;
    mutate(setup.result);
    await rejectsInvalid(setup, before);
    assert.equal(setup.requests.length, 2);
  });
}

test("a committed issuance outcome preserves its original unknown request and caller payload", async () => {
  const setup = fixture({ operation: "issueSession" }), session = setup.result.originalSession;
  const input = { principalId: session.principalId, deviceId: session.deviceId, requestedTtlMs: "60000" };
  await assert.rejects(setup.client.http.execute("communication.issueSession", setup.projectId, input, setup.requestId),
    { code: "TRANSPORT_UNKNOWN" });
  const before = setup.client.http.recoveryStates;
  assert.equal((await setup.client.sessionRequestOutcome(setup.requestId)).operation, "issueSession");
  assert.deepEqual(setup.client.http.recoveryStates, before);
  assert.deepEqual(setup.client.http.recoveryStates[0].input, input);
  assert.equal(setup.requests.length, 2);
});

test("original/current metadata cannot settle, evict or reset unknown session request custody across key rotation", async () => {
  const projectId = id(), incarnation = id(), requestId = id(), saved = asyncStorage();
  const originalSession = outcome(requestId, incarnation).originalSession;
  const input = { sessionId: originalSession.sessionId, principalId: originalSession.principalId,
    deviceId: originalSession.deviceId, expectedRevision: "9007199254740992", requestedTtlMs: "60000" };
  const common = { baseUrl: "http://localhost:18080", projectId, incarnation, asyncRecoveryStorage: saved };
  const first = new V1ProjectServerClient({ ...common, backendKey: "fixture-original-key",
    fetch: async () => { throw new Error("Response unavailable"); } });
  await assert.rejects(first.http.execute("communication.renewSession", projectId, input, requestId),
    { code: "TRANSPORT_UNKNOWN" });
  const before = first.http.recoveryStates, snapshot = new Map(saved.values), writes = saved.writes.length, requests = [];
  const result = outcome(requestId, incarnation);
  result.originalSession = originalSession;
  result.currentSession = { ...originalSession, sessionRevision: "9007199254740994", expiresAt: activeExpiry };
  const rotated = new V1ProjectServerClient({ ...common, backendKey: "fixture-rotated-key",
    fetch: async (_url, init) => {
      assert.equal(init.headers.authorization, "Bearer fixture-rotated-key");
      const request = JSON.parse(init.body); requests.push(request);
      assert.equal(request.operationName, "CommunicationSessionRequestOutcome");
      return reply(request, { serverTime: checkedAt, result });
    } });
  const pending = rotated.sessionRequestOutcome(requestId);
  assert.equal((await pending).state, "committed");
  assert.deepEqual(rotated.http.recoveryStates, before);
  assert.deepEqual(saved.values, snapshot);
  assert.equal(saved.writes.length, writes);
  assert.equal(saved.removals.length, 0);
  assert.equal(requests.length, 1);
  assert.equal(rotated.http.recoveryStates[0].attemptCount, 1);
  assert.equal(rotated.http.recoveryStates[0].resolutionState, "unknown");
  result.state = "notObservedYet";
  for (const field of ["operation", "receiptId", "committedAt", "originalSession", "currentSession", "currentState"])
    result[field] = null;
  assert.equal((await rotated.sessionRequestOutcome(requestId)).state, "notObservedYet");
  assert.deepEqual(rotated.http.recoveryStates, before);
  assert.deepEqual(saved.values, snapshot);
  assert.equal(saved.writes.length, writes);
  assert.equal(requests.length, 2);
});

test("authority rejection and network uncertainty remain read failures without automatic retries", async () => {
  const projectId = id(), incarnation = id(), requestId = id(), requests = [];
  let unavailable = false;
  const client = new V1ProjectServerClient({ baseUrl: "http://localhost:18080", projectId, incarnation,
    backendKey: secret, fetch: async (_url, init) => {
      requests.push(JSON.parse(init.body));
      if (unavailable) throw new Error(secret);
      return Response.json({ errors: [{ message: "Both backend session scopes required",
        extensions: { code: "FORBIDDEN", outcome: "rejected", status: 403 } }] });
    } });
  await assert.rejects(client.sessionRequestOutcome(requestId), { code: "FORBIDDEN", outcome: "rejected" });
  unavailable = true;
  await assert.rejects(client.sessionRequestOutcome(requestId), error => {
    assert.equal(error.code, "TRANSPORT_UNKNOWN");
    assert.equal(error.outcome, "unknown");
    assert.ok(!String(error).includes(secret));
    return true;
  });
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.operationName === "CommunicationSessionRequestOutcome"));
  assert.deepEqual(client.http.recoveryStates, []);
});

test("legacy Browser and Server initialization and withheld ResolveRequest semantics remain unchanged", async () => {
  const projectId = id(), incarnation = id(), originalId = id(), requests = [];
  const fetch = async (_url, init) => {
    const request = JSON.parse(init.body); requests.push(request);
    if (request.operationName === "CommunicationRoute")
      return reply(request, { result: { projectId, incarnation, servingEpoch: "2",
        communicationBase: "http://localhost:18080", wssUrl: "ws://localhost:18080/graphql",
        expiresAt: new Date(Date.now() + 60000).toISOString(), signature: "fixture-route" } });
    assert.equal(request.operationName, "CommunicationResolveRequest");
    return reply(request, { result: { ...resolution(originalId, "committed"), resultWithheld: true } });
  };
  const server = new V1ProjectServerClient({ baseUrl: "http://localhost:18080", projectId, incarnation, backendKey: secret, fetch });
  const values = new Map(), recoveryStorage = {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key),
  };
  const browser = new V1Client({ baseUrl: "http://localhost:18080", projectId, incarnation,
    principalId: id(), sessionToken: "fixture-browser", recoveryStorage, fetch });
  await server.initialize();
  await browser.initialize();
  assert.equal(browser.sessionRefreshState, "disabled");
  const resolved = await server.http.execute("communication.resolveRequest", projectId, { requestId: originalId });
  assert.equal(resolved.result.resultWithheld, true);
  assert.equal(resolved.result.receipt.result, null);
  assert.deepEqual(requests.map(request => request.operationName),
    ["CommunicationRoute", "CommunicationRoute", "CommunicationResolveRequest"]);
  assert.equal(values.size, 0);
  assert.equal(v1Operations["communication.sessionRequestOutcome"].kind, "query");
  assert.deepEqual(v1Operations["communication.sessionRequestOutcome"].inputFields, ["requestId"]);
  assert.ok(!v1Operations["communication.sessionRequestOutcome"].query.includes("sessionToken"));
  assert.ok(!v1Operations["communication.currentSession"].query.includes("sessionRequestOutcome"));
  assert.ok(!v1Operations["communication.resolveRequest"].query.includes("sessionRequestOutcome"));
});
