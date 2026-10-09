import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopTransport, ConvoHopClient } from "@convohop/client";
import { beforeSubmitting } from "@convohop/core/internal";
import { full, reply, resolution } from "../../../test/graphql-fixtures.mjs";
import { asyncStorage } from "../../../test/recovery-fixtures.mjs";

const id = () => crypto.randomUUID();
const input = { name: "original", termsRef: "fixture" };
const organization = () => ({ orgId: id(), name: "original", status: "active", revision: "1" });
const options = { baseUrl: "http://localhost:18080", namespace: "async-recovery" };
const states = saved => JSON.parse(saved.values.get("convohop.requests:" + options.namespace));
const mutate = (transport, requestId = id()) =>
  transport.execute("management.createOrganization", undefined, input, requestId);

test("async recovery inspection fails closed and one restore precedes concurrent queries", async () => {
  const read = Promise.withResolvers(), entered = Promise.withResolvers();
  const saved = asyncStorage({ onRead: async () => { entered.resolve(); await read.promise; } });
  const original = new ConvoHopTransport({ ...options, fetch: async () => { throw new Error("offline"); } });
  const requestId = id();
  await assert.rejects(mutate(original, requestId), { code: "TRANSPORT_UNKNOWN" });
  saved.values.set("convohop.requests:" + options.namespace, JSON.stringify(original.recoveryStates));
  let fetches = 0;
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    fetches++;
    return reply(JSON.parse(init.body), { result: resolution(requestId, "notObservedYet") });
  } });
  assert.equal(saved.reads.length, 0);
  assert.throws(() => transport.recoveryStates, /initializeRecovery/);
  const initialized = transport.initializeRecovery();
  assert.equal(transport.initializeRecovery(), initialized);
  const query = transport.execute("management.resolveRequest", undefined, { requestId });
  await entered.promise;
  assert.equal(fetches, 0);
  assert.throws(() => transport.recoveryStates, /initializeRecovery/);
  read.resolve();
  await Promise.all([initialized, query]);
  assert.deepEqual(transport.recoveryStates, original.recoveryStates);
  assert.equal(saved.reads.length, 1);
  assert.equal(saved.writes.length, 0);
  assert.equal(transport.durableRecovery, true);
});

test("async pending intent, submitted attempt and receipt writes are awaited in order", async () => {
  const gates = Array.from({ length: 3 }, () => Promise.withResolvers());
  const entered = Array.from({ length: 3 }, () => Promise.withResolvers());
  const saved = asyncStorage({ onWrite: async (_key, _value, count) => {
    entered[count - 1].resolve();
    await gates[count - 1].promise;
  } });
  let fetches = 0, finished = false;
  const requestId = id();
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    fetches++;
    assert.equal(states(saved)[0].attemptCount, 1);
    assert.equal(states(saved)[0].resolutionState, "unknown");
    return reply(JSON.parse(init.body), { result: organization() });
  } });
  await transport.initializeRecovery();
  const work = mutate(transport, requestId).then(value => { finished = true; return value; });
  await entered[0].promise;
  assert.equal(fetches, 0);
  assert.equal(transport.recoveryStates[0].attemptCount, 0);
  assert.equal(transport.recoveryStates[0].resolutionState, "pending");
  gates[0].resolve();
  await entered[1].promise;
  assert.equal(fetches, 0);
  assert.equal(states(saved)[0].attemptCount, 0);
  gates[1].resolve();
  await entered[2].promise;
  assert.equal(fetches, 1);
  assert.equal(finished, false);
  assert.equal(states(saved)[0].resolutionState, "unknown");
  assert.equal(transport.recoveryStates[0].resolutionState, "committed");
  gates[2].resolve();
  await work;
  assert.equal(states(saved)[0].requestId, requestId);
  assert.equal(states(saved)[0].resolutionState, "committed");
  assert.equal(saved.removals.length, 0);
});

test("a submission hook runs once the request is recorded and before each attempt is counted and sent, and a failing one sends nothing", async () => {
  const saved = asyncStorage(), requestId = id(), calls = [];
  let fetches = 0;
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    const request = JSON.parse(init.body);
    if (request.operationName === "ManagementResolveRequest") return reply(request, { result: resolution(requestId, "notObservedYet") });
    fetches++;
    throw new Error("connection lost");
  } });
  await transport.initializeRecovery();
  let hook = async () => { throw new Error("the hook failed"); };
  const forget = beforeSubmitting(transport, requestId, () => { calls.push([states(saved)[0].attemptCount, fetches]); return hook(); });
  await assert.rejects(mutate(transport, requestId), /the hook failed/);
  assert.deepEqual([fetches, states(saved)[0].attemptCount, states(saved)[0].lastAttemptClassification], [0, 0, "notSubmitted"],
    "a failing hook sends nothing");
  const entered = Promise.withResolvers(), gate = Promise.withResolvers();
  hook = () => { entered.resolve(); return gate.promise; };
  const work = mutate(transport, requestId);
  await entered.promise;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual([fetches, transport.recoveryStates[0].attemptCount], [0, 0], "the attempt waits for the hook");
  gate.resolve();
  await assert.rejects(work, { code: "TRANSPORT_UNKNOWN" });
  hook = async () => {};
  await assert.rejects(transport.retry(requestId), { code: "TRANSPORT_UNKNOWN" });
  forget();
  await assert.rejects(transport.retry(requestId), { code: "TRANSPORT_UNKNOWN" });
  assert.deepEqual(calls, [[0, 0], [0, 0], [1, 1]], "each submission runs the hook once, after its record is saved");
  assert.equal(fetches, 3);
  assert.equal(states(saved)[0].attemptCount, 3);
});

test("failed async restore is retained and cannot become empty recovery or permit effects", async () => {
  const failure = new Error("storage unavailable");
  const saved = asyncStorage({ onRead: async () => { throw failure; } });
  let fetches = 0;
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async () => { fetches++; } });
  await assert.rejects(transport.initializeRecovery(), error => error === failure);
  await assert.rejects(mutate(transport), error => error === failure);
  await assert.rejects(transport.retry(id()), error => error === failure);
  assert.throws(() => transport.recoveryStates, /initializeRecovery/);
  assert.equal(saved.reads.length, 1);
  assert.equal(saved.writes.length, 0);
  assert.equal(fetches, 0);
});

test("conflicting synchronous and asynchronous storage is rejected before any effects", () => {
  let reads = 0;
  const sync = { getItem: () => { reads++; return null; }, setItem() {}, removeItem() {} };
  const saved = asyncStorage();
  assert.throws(() => new ConvoHopTransport({ ...options, recoveryStorage: sync, asyncRecoveryStorage: saved }), /recoveryStorage.*asyncRecoveryStorage/);
  assert.equal(reads, 0);
  assert.equal(saved.reads.length, 0);
  assert.equal(saved.writes.length, 0);
});

test("malformed async journals fail closed without exposing partial restoration", async () => {
  const original = new ConvoHopTransport({ ...options, fetch: async () => { throw new Error("offline"); } });
  await assert.rejects(mutate(original), { code: "TRANSPORT_UNKNOWN" });
  const state = original.recoveryStates[0];
  for (const text of ["{", "", "null", "{}", "[{}]", JSON.stringify([state, {}]),
    JSON.stringify([state, state]), JSON.stringify(Array(129).fill(state))]) {
    const saved = asyncStorage();
    saved.values.set("convohop.requests:" + options.namespace, text);
    let fetches = 0;
    const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async () => { fetches++; } });
    await assert.rejects(mutate(transport), error => error instanceof TypeError || error instanceof SyntaxError);
    assert.throws(() => transport.recoveryStates, /initializeRecovery/);
    assert.equal(saved.reads.length, 1);
    assert.equal(saved.writes.length, 0);
    assert.equal(fetches, 0);
  }
});

test("mutation identity cannot be replaced while an async restore is pending", async () => {
  const read = Promise.withResolvers(), entered = Promise.withResolvers(), requestId = id();
  const original = new ConvoHopTransport({ ...options, fetch: async () => { throw new Error("offline"); } });
  await assert.rejects(mutate(original, requestId), { code: "TRANSPORT_UNKNOWN" });
  const saved = asyncStorage({ onRead: async () => { entered.resolve(); await read.promise; } });
  saved.values.set("convohop.requests:" + options.namespace, JSON.stringify(original.recoveryStates));
  let fetches = 0;
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async () => { fetches++; } });
  const work = assert.rejects(transport.execute("management.createOrganization", undefined,
    { ...input, name: "replacement" }, requestId), { code: "IDEMPOTENCY_CONFLICT", requestId });
  await entered.promise;
  assert.equal(saved.writes.length, 0);
  assert.equal(fetches, 0);
  read.resolve();
  await work;
  assert.deepEqual(transport.recoveryStates, original.recoveryStates);
  assert.equal(saved.writes.length, 0);
  assert.equal(fetches, 0);
});

for (const failingWrite of [1, 2]) {
  test(`async write ${failingWrite} fails before submission and a later explicit attempt preserves custody`, async () => {
    const failure = new Error("durable commit unavailable"), requestId = id();
    const saved = asyncStorage({ onWrite: async (_key, _value, count) => { if (count === failingWrite) throw failure; } });
    let fetches = 0;
    const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
      fetches++;
      return reply(JSON.parse(init.body), { result: organization() });
    } });
    await assert.rejects(mutate(transport, requestId), error => {
      assert.equal(error.code, "RECOVERY_STORAGE_FAILURE");
      assert.equal(error.requestId, requestId);
      assert.equal(error.outcome, "unknown");
      assert.equal(error.cause, failure);
      return true;
    });
    assert.equal(fetches, 0);
    const original = transport.recoveryStates[0];
    assert.equal(original.requestId, requestId);
    assert.equal(original.attemptCount, failingWrite - 1);
    assert.equal(original.resolutionState, failingWrite === 1 ? "pending" : "unknown");
    await mutate(transport, requestId);
    const current = states(saved)[0];
    assert.equal(fetches, 1);
    for (const key of ["requestId", "payloadFingerprint", "firstSubmittedAt", "retryDeadline", "incarnation"])
      assert.equal(current[key], original[key]);
    assert.equal(current.attemptCount, failingWrite);
    assert.deepEqual(current.input, original.input);
    assert.equal(saved.reads.length, 1 + saved.writes.length, "restored once; each write merges into the stored journal");
  });
}

for (const outcome of ["committed", "accepted"]) {
  test(`failed receipt persistence retains known ${outcome} without a failure-shaped rewrite or resend`, async () => {
    const failure = new Error("receipt commit unavailable"), requestId = id();
    const saved = asyncStorage({ onWrite: async (_key, _value, count) => { if (count === 3) throw failure; } });
    let mutations = 0;
    const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
      const request = JSON.parse(init.body);
      if (request.operationName === "ManagementResolveRequest")
        return reply(request, { result: resolution(requestId, outcome) });
      mutations++;
      return reply(request, outcome === "committed" ? { result: organization() } : {
        status: "accepted", operation: { operationId: id(), owner: "management", href: "/graphql", state: "requested" },
      });
    } });
    const operation = outcome === "committed" ? "management.createOrganization" : "management.createDeployment";
    const body = outcome === "committed" ? input :
      { orgId: id(), offering: "managedShared", geoId: "local", installationProfileId: "fixture", consentRef: "fixture" };
    await assert.rejects(transport.execute(operation, undefined, body, requestId),
      { code: "RECOVERY_STORAGE_FAILURE", requestId, outcome });
    assert.equal(transport.recoveryStates[0].resolutionState, outcome);
    assert.equal(transport.recoveryStates[0].lastAttemptClassification, "authorityReceipt");
    assert.equal(saved.writes.length, 3);
    assert.equal(states(saved)[0].resolutionState, "unknown");
    assert.equal((await transport.retry(requestId)).state, outcome);
    assert.equal(states(saved)[0].resolutionState, outcome);
    assert.equal(mutations, 1);
  });
}

for (const outcome of ["committed", "accepted"]) {
  test(`async transport uncertainty after known ${outcome} cannot regress settled custody`, async () => {
    const saved = asyncStorage(), requestId = id();
    let mutations = 0;
    const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
      const request = JSON.parse(init.body);
      if (request.operationName === "ManagementResolveRequest")
        return reply(request, { result: resolution(requestId, "notObservedYet") });
      if (mutations++ > 0) throw new Error("later response lost");
      return reply(request, outcome === "committed" ? { result: organization() } : {
        status: "accepted", operation: { operationId: id(), owner: "management", href: "/graphql", state: "requested" },
      });
    } });
    const operation = outcome === "committed" ? "management.createOrganization" : "management.createDeployment";
    const body = outcome === "committed" ? input :
      { orgId: id(), offering: "managedShared", geoId: "local", installationProfileId: "fixture", consentRef: "fixture" };
    await transport.execute(operation, undefined, body, requestId);
    const original = transport.recoveryStates[0];
    await assert.rejects(transport.execute(operation, undefined, body, requestId), { code: "TRANSPORT_UNKNOWN" });
    assert.equal(states(saved)[0].resolutionState, outcome);
    assert.equal(states(saved)[0].retryDeadline, original.retryDeadline);
    assert.equal(states(saved)[0].payloadFingerprint, original.payloadFingerprint);
    assert.equal(states(saved)[0].lastAttemptClassification, "TRANSPORT_UNKNOWN");
    await assert.rejects(transport.retry(requestId), { code: "RESOLUTION_REQUIRED" });
    assert.equal(mutations, 2);
  });
}

test("failed read-only resolution persistence reports the original mutation identity and retains its commit", async () => {
  const requestId = id(), queryId = id(), saved = asyncStorage({
    onWrite: async (_key, _value, count) => { if (count === 4) throw new Error("resolution commit unavailable"); },
  });
  let queries = 0, mutations = 0;
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    const request = JSON.parse(init.body);
    if (request.operationName === "ManagementResolveRequest")
      return reply(request, { result: resolution(requestId, ++queries === 1 ? "committed" : "notObservedYet") });
    mutations++;
    throw new Error("response lost");
  } });
  await assert.rejects(mutate(transport, requestId), { code: "TRANSPORT_UNKNOWN" });
  await assert.rejects(transport.execute("management.resolveRequest", undefined, { requestId }, queryId),
    { code: "RECOVERY_STORAGE_FAILURE", requestId, outcome: "committed" });
  assert.equal(transport.recoveryStates[0].resolutionState, "committed");
  assert.equal(transport.recoveryStates[0].lastAttemptClassification, "authorityReceipt");
  assert.equal(states(saved)[0].resolutionState, "unknown");
  await assert.rejects(transport.retry(requestId), { code: "RESOLUTION_REQUIRED", requestId });
  assert.equal(mutations, 1);
});

test("failed failure-classification storage retains the submitted unknown identity for restart resolution", async () => {
  const failure = new Error("storage unavailable"), requestId = id();
  const saved = asyncStorage({ onWrite: async (_key, _value, count) => { if (count === 3) throw failure; } });
  const first = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async () => { throw new Error("response lost"); } });
  await assert.rejects(mutate(first, requestId), { code: "RECOVERY_STORAGE_FAILURE", requestId, outcome: "unknown" });
  const original = first.recoveryStates[0];
  assert.equal(original.lastAttemptClassification, "TRANSPORT_UNKNOWN");
  assert.equal(original.resolutionState, "unknown");
  assert.equal(states(saved)[0].lastAttemptClassification, "submitted");
  let mutations = 0;
  const restarted = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    const request = JSON.parse(init.body);
    if (request.operationName !== "ManagementResolveRequest") mutations++;
    return reply(request, { result: resolution(requestId, "committed") });
  } });
  assert.equal((await restarted.retry(requestId)).state, "committed");
  assert.equal(mutations, 0);
  assert.equal(restarted.recoveryStates[0].attemptCount, 1);
  assert.equal(restarted.recoveryStates[0].retryDeadline, original.retryDeadline);
});

test("async retry restores the original request, fingerprint and budget without explicit initialization", async t => {
  let now = Date.now(), committed = false, mutations = 0;
  t.mock.method(Date, "now", () => now);
  const saved = asyncStorage(), requestId = id();
  const first = new ConvoHopTransport({ ...options, credential: "never-journal-this-key", asyncRecoveryStorage: saved,
    fetch: async () => { throw new Error("offline"); } });
  await assert.rejects(mutate(first, requestId), { code: "TRANSPORT_UNKNOWN" });
  const original = first.recoveryStates[0];
  now += 1000;
  const restarted = new ConvoHopTransport({ ...options, credential: "refreshed-never-journal-this-key", asyncRecoveryStorage: saved,
    fetch: async (_url, init) => {
      const request = JSON.parse(init.body);
      if (request.operationName === "ManagementResolveRequest")
        return reply(request, { result: resolution(requestId, committed ? "committed" : "notObservedYet") });
      mutations++;
      assert.equal(request.variables.context.requestId, requestId);
      assert.deepEqual(request.variables.input, original.input);
      committed = true;
      return reply(request, { result: organization() });
    } });
  assert.throws(() => restarted.recoveryStates, /initializeRecovery/);
  await restarted.retry(requestId);
  const current = restarted.recoveryStates[0];
  for (const key of ["requestId", "payloadFingerprint", "firstSubmittedAt", "retryDeadline", "incarnation"])
    assert.equal(current[key], original[key]);
  assert.equal(current.attemptCount, 2);
  assert.equal(current.lastAttemptAt, now);
  assert.equal(mutations, 1);
  assert.equal(saved.reads.length, 3 + saved.writes.length,
    "each transport restores once, the retry rereads the journal, and each write merges into it");
  assert.ok(saved.writes.every(({ value }) => !value.includes("never-journal")));
  assert.equal(saved.removals.length, 0);
});

for (const [write, shift] of [[1, 60001], [2, 60001], [2, -1]]) {
  test(`async write ${write} cannot submit after a ${shift}ms clock shift`, async t => {
    const start = Date.now();
    let now = start, mutations = 0;
    t.mock.method(Date, "now", () => now);
    const saved = asyncStorage({ onWrite: async (_key, _value, count) => { if (count === write) now = start + shift; } });
    const requestId = id();
    const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
      const request = JSON.parse(init.body);
      if (request.operationName !== "ManagementResolveRequest") mutations++;
      return reply(request, { result: resolution(requestId, "notObservedYet") });
    } });
    await assert.rejects(mutate(transport, requestId), { code: "RESOLUTION_REQUIRED", requestId });
    assert.equal(mutations, 0);
    assert.equal(states(saved)[0].firstSubmittedAt, start);
    assert.equal(states(saved)[0].retryDeadline, start + 60000);
    assert.equal(states(saved)[0].attemptCount, write - 1);
    await assert.rejects(transport.retry(requestId), { code: "RESOLUTION_REQUIRED" });
    assert.equal(mutations, 0);
  });
}

test("three-attempt limit is preserved across asynchronous reconstruction", async () => {
  const saved = asyncStorage(), requestId = id();
  let mutations = 0, original;
  const fetch = async (_url, init) => {
    const request = JSON.parse(init.body);
    if (request.operationName === "ManagementResolveRequest")
      return reply(request, { result: resolution(requestId, "notObservedYet") });
    mutations++;
    throw new Error("response lost");
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch });
    await assert.rejects(attempt === 0 ? mutate(transport, requestId) : transport.retry(requestId), { code: "TRANSPORT_UNKNOWN" });
    original ??= transport.recoveryStates[0];
    assert.equal(states(saved)[0].retryDeadline, original.retryDeadline);
    assert.equal(states(saved)[0].attemptCount, attempt + 1);
  }
  const exhausted = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch });
  await assert.rejects(exhausted.retry(requestId), { code: "RESOLUTION_REQUIRED", requestId });
  assert.equal(mutations, 3);
  assert.equal(states(saved)[0].attemptCount, 3);
});

test("overlapping mutations serialize complete snapshots even when authority replies finish out of order", async () => {
  let writing = 0, maxWriting = 0;
  const saved = asyncStorage({ onWrite: async () => {
    maxWriting = Math.max(maxWriting, ++writing);
    await new Promise(resolve => setImmediate(resolve));
    writing--;
  } });
  const ids = [id(), id()], entered = ids.map(() => Promise.withResolvers()), replies = ids.map(() => Promise.withResolvers());
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    const request = JSON.parse(init.body), index = ids.indexOf(request.variables.context.requestId);
    entered[index].resolve();
    await replies[index].promise;
    return reply(request, { result: organization() });
  } });
  const work = ids.map(requestId => mutate(transport, requestId));
  await Promise.all(entered.map(value => value.promise));
  replies[1].resolve();
  await work[1];
  assert.equal(states(saved).find(state => state.requestId === ids[1]).resolutionState, "committed");
  assert.equal(states(saved).find(state => state.requestId === ids[0]).resolutionState, "unknown");
  replies[0].resolve();
  await work[0];
  assert.equal(maxWriting, 1);
  assert.equal(saved.writes.length, 6);
  assert.deepEqual(new Set(states(saved).map(state => state.requestId)), new Set(ids));
  assert.ok(states(saved).every(state => state.resolutionState === "committed" && state.attemptCount === 1));
});

test("overlapping same-identity mutations share the pending durable submission", async () => {
  const gate = Promise.withResolvers(), entered = Promise.withResolvers();
  const saved = asyncStorage({ onWrite: async (_key, _value, count) => {
    if (count === 1) { entered.resolve(); await gate.promise; }
  } });
  let mutations = 0;
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    mutations++;
    return reply(JSON.parse(init.body), { result: organization() });
  } });
  const requestId = id(), first = mutate(transport, requestId);
  await entered.promise;
  const second = mutate(transport, requestId);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(mutations, 0);
  gate.resolve();
  const result = await Promise.all([first, second]);
  assert.deepEqual(result[0], result[1]);
  assert.equal(mutations, 1);
  assert.equal(states(saved)[0].attemptCount, 1);
  assert.equal(saved.writes.length, 3);
});

test("a receipt observed during an awaited retry write prevents a stale absent-evidence resend", async () => {
  const requestId = id(), original = new ConvoHopTransport({ ...options, fetch: async () => { throw new Error("offline"); } });
  await assert.rejects(mutate(original, requestId), { code: "TRANSPORT_UNKNOWN" });
  const gate = Promise.withResolvers(), entered = Promise.withResolvers();
  const saved = asyncStorage({ onWrite: async (_key, _value, count) => {
    if (count === 1) { entered.resolve(); await gate.promise; }
  } });
  saved.values.set("convohop.requests:" + options.namespace, JSON.stringify(original.recoveryStates));
  let queries = 0, mutations = 0;
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    const request = JSON.parse(init.body);
    if (request.operationName !== "ManagementResolveRequest") mutations++;
    return reply(request, { result: resolution(requestId, ++queries === 1 ? "notObservedYet" : "committed") });
  } });
  const retry = assert.rejects(transport.retry(requestId), { code: "RESOLUTION_REQUIRED", requestId });
  await entered.promise;
  const resolved = transport.execute("management.resolveRequest", undefined, { requestId });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(transport.recoveryStates[0].resolutionState, "committed");
  gate.resolve();
  await Promise.all([retry, resolved]);
  assert.equal(mutations, 0);
  assert.equal(states(saved)[0].resolutionState, "committed");
});

test("caller changes during durable writes cannot alter the original nested payload or fingerprint", async () => {
  const gate = Promise.withResolvers(), entered = Promise.withResolvers();
  const saved = asyncStorage({ onWrite: async (_key, _value, count) => {
    if (count === 1) { entered.resolve(); await gate.promise; }
  } });
  const projectId = id(), incarnation = id(), conversationId = id(), requestId = id();
  const body = { conversationId, text: "original", props: { nested: { value: "original" } } };
  const expected = structuredClone(body);
  let submitted;
  const transport = new ConvoHopTransport({ ...options, incarnation, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    submitted = JSON.parse(init.body);
    return reply(submitted, { result: { messageId: id(), conversationId, sequence: "1", revision: "1", status: "sent",
      cursor: { incarnation, conversationId, sequence: "1" } } });
  } });
  const work = transport.execute("communication.sendMessage", projectId, body, requestId);
  await entered.promise;
  body.props.nested.value = "replacement";
  gate.resolve();
  await work;
  assert.deepEqual(submitted.variables.input, expected);
  assert.deepEqual(states(saved)[0].input, expected);
  await assert.rejects(transport.execute("communication.sendMessage", projectId, body, requestId), { code: "IDEMPOTENCY_CONFLICT" });
  const wrongIncarnation = new ConvoHopTransport({ ...options, incarnation: id(), asyncRecoveryStorage: saved,
    fetch: async () => { throw new Error("must not submit"); } });
  await assert.rejects(wrongIncarnation.retry(requestId), { code: "INCARNATION_MISMATCH" });
  await assert.rejects(transport.execute("communication.sendMessage", id(), expected, requestId), { code: "IDEMPOTENCY_CONFLICT" });
});

for (const write of [1, 2]) {
  test(`incarnation changes during async write ${write} cannot redirect the saved command`, async () => {
    const gate = Promise.withResolvers(), entered = Promise.withResolvers();
    const saved = asyncStorage({ onWrite: async (_key, _value, count) => {
      if (count === write) { entered.resolve(); await gate.promise; }
    } });
    const projectId = id(), incarnation = id(), conversationId = id(), requestId = id();
    let fetches = 0;
    const transport = new ConvoHopTransport({ ...options, incarnation, asyncRecoveryStorage: saved, fetch: async () => { fetches++; } });
    const rejected = assert.rejects(transport.execute("communication.sendMessage", projectId,
      { conversationId, text: "original", props: {} }, requestId), { code: "INCARNATION_MISMATCH", requestId });
    await entered.promise;
    transport.incarnation = id();
    gate.resolve();
    await rejected;
    assert.equal(fetches, 0);
    assert.equal(states(saved)[0].incarnation, incarnation);
    assert.equal(states(saved)[0].requestId, requestId);
    assert.equal(states(saved)[0].attemptCount, write - 1);
  });
}

test("async retention never drops unresolved records or exceeds its 128-record bound", async () => {
  const saved = asyncStorage(), ids = [];
  let mutations = 0;
  const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
    const request = JSON.parse(init.body);
    if (request.operationName === "ManagementResolveRequest")
      return reply(request, { result: resolution(request.variables.input.requestId, "committed") });
    mutations++;
    throw new Error("offline");
  } });
  for (let index = 0; index < 128; index++) {
    const requestId = id(); ids.push(requestId);
    await assert.rejects(mutate(transport, requestId), { code: "TRANSPORT_UNKNOWN" });
  }
  const next = id();
  await assert.rejects(mutate(transport, next), /Resolve outstanding mutations/);
  assert.equal(mutations, 128);
  assert.equal(transport.recoveryStates.length, 128);
  assert.deepEqual(states(saved).map(state => state.requestId), ids);
  await transport.execute("management.resolveRequest", undefined, { requestId: ids[0] });
  await assert.rejects(mutate(transport, next), { code: "TRANSPORT_UNKNOWN" });
  assert.deepEqual(states(saved).map(state => state.requestId), [...ids.slice(1), next]);
  assert.ok(saved.writes.every(({ value }) => JSON.parse(value).length <= 128));
  assert.equal(saved.removals.length, 0);
});

for (const operation of ["communication.redeemCredential", "communication.acknowledgeCredential"]) {
  test(`async ${operation} retains no bearer, permit or capsule and requires explicit delivery custody`, async () => {
    const saved = asyncStorage(), requestId = id(), projectId = id(), deliveryId = id();
    let attempts = 0;
    const transport = new ConvoHopTransport({ ...options, asyncRecoveryStorage: saved, fetch: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(init.headers.authorization, undefined);
      assert.notEqual(request.operationName, "CommunicationResolveRequest");
      assert.deepEqual(request.variables.input, { deliveryId });
      assert.equal(request.variables.context.requestId, requestId);
      assert.equal(request.variables.context.credentialDeliveryPermit.signature, attempts ? "secret-fresh-permit" : "secret-original-permit");
      if (attempts++ === 0) throw new Error("response lost");
      return reply(request, { result: operation === "communication.redeemCredential"
        ? full("CredentialCapsule", { kind: "backendKey", backendKey: "secret-capsule" })
        : { deliveryId, acknowledged: true } });
    } });
    await assert.rejects(transport.execute(operation, projectId, { deliveryId }, requestId,
      { signature: "secret-original-permit" }), { code: "TRANSPORT_UNKNOWN" });
    const original = transport.recoveryStates[0];
    await assert.rejects(transport.retry(requestId), { code: "CREDENTIAL_REQUIRED", requestId });
    assert.equal(attempts, 1);
    await transport.execute(operation, projectId, { deliveryId }, requestId, { signature: "secret-fresh-permit" });
    assert.equal(states(saved)[0].retryDeadline, original.retryDeadline);
    assert.equal(states(saved)[0].payloadFingerprint, original.payloadFingerprint);
    assert.equal(states(saved)[0].attemptCount, 2);
    assert.ok(saved.writes.every(({ value }) => !value.includes("secret-")));
  });
}

test("browser synchronous storage restores immediately and remains usable without async initialization", async () => {
  const values = new Map();
  let reads = 0;
  const recoveryStorage = { getItem: key => { reads++; return values.get(key) ?? null; },
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const clientOptions = { baseUrl: options.baseUrl, projectId: id(), principalId: id(), incarnation: id(),
    sessionToken: "private-session", recoveryStorage, fetch: async () => { throw new Error("offline"); } };
  const first = new ConvoHopClient(clientOptions), requestId = id(), conversationId = id();
  await assert.rejects(first.send(conversationId, "original", requestId), { code: "TRANSPORT_UNKNOWN" });
  const before = reads, restored = new ConvoHopClient(clientOptions);
  assert.deepEqual(restored.http.recoveryStates, first.http.recoveryStates);
  assert.equal(restored.storage, recoveryStorage);
  assert.equal(restored.conversation(conversationId).then, undefined);
  assert.equal(reads, before + 1, "construction restores with one read");
  await restored.http.initializeRecovery();
  assert.equal(reads, before + 1);
  assert.ok([...values.values()].every(value => !value.includes("private-session")));
});
