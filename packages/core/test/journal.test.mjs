import test from "node:test";
import assert from "node:assert/strict";
import { ConvoHopProblem, ConvoHopTransport } from "@convohop/core";
import { adoptRecovery, beforeSubmitting, retainRecovery } from "@convohop/core/internal";
import { reply, resolution } from "../../../test/graphql-fixtures.mjs";
import { asyncStorage } from "../../../test/recovery-fixtures.mjs";

// Clients sharing a recovery journal, such as a user's tabs, each merge their records into it per request.

const id = () => crypto.randomUUID();
const projectId = id(), incarnation = id(), conversationId = id();
const kinds = ["sync", "async"];

/** One stored journal, reachable through synchronous and asynchronous storage. */
function journal(namespace = id()) {
  const key = "convohop.requests:" + namespace, async = asyncStorage(), { values } = async;
  const sync = { getItem: name => values.get(name) ?? null, setItem: (name, value) => { values.set(name, value); },
    removeItem: name => { values.delete(name); } };
  const records = () => JSON.parse(values.get(key) ?? "[]");
  return { namespace, key, values, sync, async, records,
    raw: () => values.get(key),
    record: requestId => records().find(value => value.requestId === requestId),
    save: list => { values.set(key, JSON.stringify(list)); } };
}

/**
 * A fake authority. It counts every mutation it receives and commits it, unless `mode` is `offline`, which fails
 * before the commit, or `lost`, which loses the response after it, or `rejection` is set to a problem's
 * `{ code, status }`, which rejects it. `forget` makes resolution find nothing, as once a commit's evidence has expired.
 */
function authority() {
  const fake = { sends: [], requests: [], committed: new Set(), mode: "online", forget: false, rejection: undefined,
    sent: requestId => fake.sends.filter(value => value === requestId).length,
    fetch: async (_url, init) => {
      const request = JSON.parse(init.body);
      fake.requests.push(request.operationName);
      if (request.operationName === "CommunicationResolveRequest") {
        const requestId = request.variables.input.requestId;
        return reply(request, { result: resolution(requestId,
          fake.committed.has(requestId) && !fake.forget ? "committed" : "notObservedYet") });
      }
      const requestId = request.variables.context.requestId;
      fake.sends.push(requestId);
      if (fake.mode === "offline") throw new TypeError("offline");
      if (fake.rejection)
        return Response.json({ errors: [{ message: "Refused", extensions: { ...fake.rejection, outcome: "rejected", requestId } }] });
      fake.committed.add(requestId);
      if (fake.mode === "lost") throw new TypeError("response lost");
      return reply(request, { result: results[request.operationName](request.variables) });
    } };
  return fake;
}
const results = {
  CommunicationSendMessage: ({ input, context }) => ({ messageId: id(), conversationId: input.conversationId, sequence: "1",
    revision: "1", status: "sent", cursor: { incarnation: context.incarnation, conversationId: input.conversationId, sequence: "1" } }),
  CommunicationLiveSessionCredentials: ({ input }) => {
    const { liveSessionId, participationId } = input, expires = new Date(Date.now() + 60000).toISOString();
    return { liveSessionId, participationId, generation: "1", roomName: "fixture", participantIdentity: "fixture",
      livekitUrl: "ws://localhost:17880", transportToken: "fixture-private-grant",
      admissionTicket: { participationId, signature: "fixture-private-ticket" },
      forwardingLease: { participationId, signature: "fixture-private-proof" },
      transportExpiresAt: expires, admissionExpiresAt: expires, leaseExpiresAt: expires, leasePolicyId: "fixture",
      connectToken: "fixture-private-connect-token" };
  },
};

async function open(fake, shared, kind) {
  const transport = new ConvoHopTransport({ baseUrl: "http://127.0.0.1:18080", namespace: shared.namespace, incarnation,
    fetch: fake.fetch, ...(kind === "sync" ? { recoveryStorage: shared.sync } : { asyncRecoveryStorage: shared.async }) });
  await transport.initializeRecovery();
  return transport;
}
const send = (transport, requestId, text = "fixture") =>
  transport.execute("communication.sendMessage", projectId, { conversationId, text, props: {} }, requestId);
const held = transport => transport.recoveryStates.map(state => state.requestId);
/** Another client's stored record of a message it sent. */
const stored = (lastAttemptAt, resolutionState, requestId = id()) => ({ requestId, incarnation, payloadFingerprint: "fixture",
  operation: "communication.sendMessage", projectId, input: { conversationId, text: requestId, props: {} },
  firstSubmittedAt: lastAttemptAt, retryDeadline: lastAttemptAt + 60000, attemptCount: 1, lastAttemptAt,
  lastAttemptClassification: "submitted", resolutionState });
/** The typed refusal of request `requestId` while the journal holds 128 records that aren't final. */
const recoveryLimit = (requestId, outcome = "rejected") => error => error instanceof ConvoHopProblem &&
  error.code === "RECOVERY_LIMIT" && error.requestId === requestId && error.outcome === outcome && error.status === 409;

test("synchronous and asynchronous clients sharing a journal keep each other's records", async () => {
  const fake = authority(), shared = journal();
  const tab = await open(fake, shared, "sync"), worker = await open(fake, shared, "async");
  const [first, second, third] = [id(), id(), id()];
  await send(tab, first);
  await send(worker, second);
  await send(tab, third);
  assert.deepEqual(shared.records().map(value => [value.requestId, value.resolutionState]),
    [[first, "committed"], [second, "committed"], [third, "committed"]]);
  assert.deepEqual(held(tab), [first, third], "each client holds only its own records");
  assert.deepEqual(held(worker), [second]);
  assert.deepEqual(held(await open(fake, shared, "sync")), [first, second, third]);
});

for (const kind of kinds) {
  test(`${kind}: a stale client takes in another's commit rather than overwrite it`, async () => {
    const fake = authority(), shared = journal(), requestId = id();
    const first = await open(fake, shared, kind);
    fake.mode = "lost";
    await assert.rejects(send(first, requestId), { code: "TRANSPORT_UNKNOWN" });
    fake.mode = "online";
    const stale = await open(fake, shared, kind);
    assert.equal(stale.recoveryStates[0].resolutionState, "unknown");
    assert.equal((await first.retry(requestId)).state, "committed");
    await send(stale, id());
    assert.equal(shared.record(requestId).resolutionState, "committed", "the stale write keeps the commit");
    assert.equal(stale.recoveryStates[0].resolutionState, "committed");
    // Once the commit's evidence has expired, only the journal stops a resend.
    fake.forget = true;
    await assert.rejects((await open(fake, shared, kind)).retry(requestId), { code: "RESOLUTION_REQUIRED" });
    assert.equal(fake.sent(requestId), 1);
  });
}

test("a native admission marker survives a client that saw the grant before it", async () => {
  const fake = authority(), shared = journal(), requestId = id();
  const first = await open(fake, shared, "async");
  await first.execute("communication.liveSessionCredentials", projectId,
    { liveSessionId: id(), participationId: id(), expectedGeneration: "1", mode: "INITIAL" }, requestId);
  const stale = await open(fake, shared, "async");
  await first.markMediaAdmissionAttempted(requestId);
  await send(stale, id());
  assert.equal(shared.record(requestId).mediaAdmissionAttempted, true);
  assert.equal(shared.record(requestId).lastAttemptClassification, "nativeAdmissionAttempted");
  assert.equal(stale.recoveryStates[0].mediaAdmissionAttempted, true);
  assert.ok(!shared.raw().includes("fixture-private"), "the journal keeps no grant");
});

for (const kind of kinds) {
  test(`${kind}: another request under a saved ID conflicts unsent, and the same request continues its budget`, async () => {
    const fake = authority(), shared = journal(), requestId = id();
    const first = await open(fake, shared, kind), other = await open(fake, shared, kind), same = await open(fake, shared, kind);
    fake.mode = "offline";
    await assert.rejects(send(first, requestId, "original"), { code: "TRANSPORT_UNKNOWN" });
    fake.mode = "online";
    const saved = shared.raw(), original = shared.record(requestId);
    await assert.rejects(send(other, requestId, "replacement"), { code: "IDEMPOTENCY_CONFLICT" });
    assert.equal(shared.raw(), saved, "the conflicting client writes nothing");
    assert.equal(fake.sent(requestId), 1);
    await new Promise(resolve => setTimeout(resolve, 5));
    await send(same, requestId, "original");
    const continued = shared.record(requestId);
    assert.deepEqual([continued.attemptCount, continued.firstSubmittedAt, continued.retryDeadline, continued.resolutionState],
      [2, original.firstSubmittedAt, original.retryDeadline, "committed"]);
    assert.equal(fake.sent(requestId), 2);
  });

  test(`${kind}: a request yields to another saved under its ID until its first attempt is stored`, async () => {
    const fake = authority(), elsewhere = journal(), shared = journal(), requestId = id();
    fake.mode = "offline";
    await assert.rejects(send(await open(fake, elsewhere, kind), requestId, "theirs"), { code: "TRANSPORT_UNKNOWN" });
    fake.mode = "online";
    const theirs = elsewhere.record(requestId), client = await open(fake, shared, kind);
    // Another tab's write, merged from a read made before this request was created, replaces its record.
    beforeSubmitting(client, requestId, () => shared.save([theirs]));
    await assert.rejects(send(client, requestId, "ours"), { code: "IDEMPOTENCY_CONFLICT" });
    assert.equal(fake.sent(requestId), 1, "only theirs was sent");
    assert.deepEqual(shared.records(), [theirs]);
    assert.deepEqual(client.recoveryStates, [theirs]);
  });

  test(`${kind}: a request that may have been sent keeps its record against another saved under its ID`, async () => {
    const fake = authority(), shared = journal(), requestId = id();
    const client = await open(fake, shared, kind);
    fake.mode = "offline";
    await assert.rejects(send(client, requestId, "ours"), { code: "TRANSPORT_UNKNOWN" });
    fake.mode = "online";
    const ours = shared.record(requestId);
    shared.save([{ ...stored(Date.now(), "unknown", requestId) }]);
    await send(client, id());
    assert.deepEqual(shared.records()[0], ours);
    assert.deepEqual(client.recoveryStates[0], ours);
  });
}

test("over the limit, a write drops the oldest settled records another client saved", async () => {
  const fake = authority(), shared = journal(), now = Date.now();
  const client = await open(fake, shared, "sync");
  // Newest first. The oldest is unresolved and stays: the second oldest goes instead.
  const others = Array.from({ length: 128 }, (_, index) => stored(now - 1000 - index, index === 127 ? "unknown" : "committed"));
  shared.save(others);
  const ours = id();
  await send(client, ours);
  assert.deepEqual(shared.records().map(value => value.requestId),
    [...others.slice(0, 126), others[127]].map(value => value.requestId).concat(ours));
  assert.deepEqual(held(client), [ours]);
});

test("a write that would drop another client's unresolved records doesn't create the request", async () => {
  const fake = authority(), shared = journal(), now = Date.now();
  const client = await open(fake, shared, "sync");
  const others = Array.from({ length: 128 }, (_, index) => stored(now - 1000 - index, index % 2 ? "pending" : "unknown"));
  others[0] = { ...others[0], operation: "communication.futureOperation" };
  shared.save(others);
  const saved = shared.raw(), refused = id();
  await assert.rejects(send(client, refused), recoveryLimit(refused));
  assert.equal(shared.raw(), saved);
  assert.deepEqual(fake.requests, []);
  assert.deepEqual(client.recoveryStates, []);
});

test("a rejection is the request's outcome only when every attempt was rejected", async () => {
  const fake = authority(), shared = journal(), client = await open(fake, shared, "sync");
  const [refused, limited, lost] = [id(), id(), id()];
  fake.rejection = { code: "NOT_FOUND", status: 404 };
  await assert.rejects(send(client, refused), { code: "NOT_FOUND", outcome: "rejected" });
  fake.rejection = { code: "RATE_LIMITED", status: 429 };
  await assert.rejects(send(client, limited), { code: "RATE_LIMITED", outcome: "rejected" });
  fake.rejection = undefined; fake.mode = "lost";
  await assert.rejects(send(client, lost), { code: "TRANSPORT_UNKNOWN" });
  fake.mode = "online"; fake.rejection = { code: "RATE_LIMITED", status: 429 };
  await assert.rejects(send(client, lost), { code: "RATE_LIMITED" });
  const summary = transport => Object.fromEntries(transport.recoveryStates.map(state =>
    [state.requestId, [state.resolutionState, state.lastAttemptClassification, state.attemptCount]]));
  // The lost attempt may have committed, so the next one's rejection doesn't settle that request.
  const expected = { [refused]: ["rejected", "NOT_FOUND", 1], [limited]: ["rejected", "RATE_LIMITED", 1],
    [lost]: ["unknown", "RATE_LIMITED", 2] };
  assert.deepEqual(summary(client), expected);
  assert.deepEqual(summary(await open(fake, shared, "async")), expected, "a restarted client reads rejected records");
  // A rejected request may be sent again under its ID while its budget lasts.
  fake.rejection = undefined;
  await send(client, limited);
  assert.deepEqual([shared.record(limited).resolutionState, shared.record(limited).attemptCount], ["committed", 2]);
});

test("a full journal frees its oldest final record: settled, or rejected and not to be sent again", async () => {
  const fake = authority(), shared = journal(), now = Date.now();
  const at = index => now - 10000 + index;
  const rejected = (index, lastAttemptClassification, changes = {}) =>
    ({ ...stored(at(index), "rejected"), lastAttemptClassification, ...changes });
  const records = [
    // Oldest, and not final: the app may still send each again under its ID. WRONG_REGION succeeds after routing again.
    stored(at(0), "unknown"), { ...stored(at(1), "pending"), attemptCount: 0 }, rejected(2, "RATE_LIMITED"), rejected(3, "WRONG_REGION"),
    // Final: not retryable, out of budget, past the retry deadline, then the oldest committed.
    rejected(4, "NOT_FOUND"), rejected(5, "RATE_LIMITED", { attemptCount: 3 }), rejected(6, "AUTHORITY_UNAVAILABLE", { retryDeadline: now - 1 }),
    ...Array.from({ length: 121 }, (_, index) => stored(at(7 + index), "committed")),
  ];
  shared.save(records);
  const client = await open(fake, shared, "sync"), sent = [id(), id(), id(), id()];
  for (const requestId of sent) await send(client, requestId);
  const kept = [...records.slice(0, 4), ...records.slice(8)].map(value => value.requestId).concat(sent);
  assert.deepEqual(shared.records().map(value => value.requestId), kept);
  assert.deepEqual(held(client), kept);
});

test("a journal full of records that aren't final refuses new requests until one is", async () => {
  const fake = authority(), shared = journal(), client = await open(fake, shared, "async");
  // A rate-limited request may be sent again under its ID, so its record stays.
  fake.rejection = { code: "RATE_LIMITED", status: 429 };
  const limited = Array.from({ length: 128 }, () => id());
  for (const requestId of limited) await assert.rejects(send(client, requestId), { code: "RATE_LIMITED" });
  fake.rejection = undefined;
  const saved = shared.raw(), requests = fake.requests.length, refused = id();
  await assert.rejects(send(client, refused), recoveryLimit(refused));
  assert.equal(shared.raw(), saved, "nothing is written");
  assert.equal(fake.requests.length, requests, "nothing is sent");
  // Sent again under its ID, a request commits, so its record makes room for the next new request.
  await send(client, limited[5]);
  const next = id();
  await send(client, next);
  assert.deepEqual(held(client), [...limited.slice(0, 5), ...limited.slice(6), next]);
  assert.deepEqual(shared.records().map(value => value.requestId), held(client));
});

test("a full journal keeps final records that a caller retains or a command is using", async () => {
  const fake = authority(), shared = journal(), now = Date.now();
  const records = Array.from({ length: 126 }, (_, index) => stored(now - 10000 + index, index ? "unknown" : "committed"));
  shared.save(records);
  const client = await open(fake, shared, "sync"), refused = id(), resent = id();
  fake.rejection = { code: "NOT_FOUND", status: 404 };
  await assert.rejects(send(client, resent), { code: "NOT_FOUND" });
  fake.rejection = undefined; fake.mode = "lost";
  await assert.rejects(send(client, id()), { code: "TRANSPORT_UNKNOWN" });
  const release = retainRecovery(client, () => [records[0].requestId]);
  // Resent under its ID, the rejected request's record is in use until its attempt counts.
  let refusal;
  beforeSubmitting(client, resent, async () => { refusal = await send(client, refused).catch(error => error); });
  fake.mode = "online";
  await send(client, resent);
  assert.ok(recoveryLimit(refused)(refusal), String(refusal));
  release();
  const next = id();
  await send(client, next);
  assert.equal(held(client).includes(records[0].requestId), false, "released, the oldest final record goes");
  assert.deepEqual([held(client).includes(resent), held(client).includes(next)], [true, true]);
});

test("merging another client's record of a request takes in its attempts", async () => {
  const later = (ours, changes) => ({ ...ours, lastAttemptAt: ours.lastAttemptAt + 1, ...changes });
  for (const [label, theirs, expected] of [
    ["this client's own attempt, before its rejection was stored",
      ours => ({ ...ours, resolutionState: "unknown", lastAttemptClassification: "submitted" }), ["rejected", "NOT_FOUND", 1]],
    ["a later rejected attempt that knew of this one",
      ours => later(ours, { attemptCount: 2, lastAttemptClassification: "FORBIDDEN" }), ["rejected", "FORBIDDEN", 2]],
    ["a later unanswered attempt that knew of this one",
      ours => later(ours, { attemptCount: 2, resolutionState: "unknown", lastAttemptClassification: "TRANSPORT_UNKNOWN" }),
      ["unknown", "TRANSPORT_UNKNOWN", 2]],
    // Neither record saw both as many attempts and as late a one as the other, so one more attempt counts.
    ["a rejected attempt made unaware of this one",
      ours => later(ours, { lastAttemptClassification: "FORBIDDEN" }), ["rejected", "FORBIDDEN", 2]],
    ["an unanswered attempt made unaware of this one, which may have committed",
      ours => later(ours, { resolutionState: "unknown", lastAttemptClassification: "TRANSPORT_UNKNOWN" }),
      ["unknown", "TRANSPORT_UNKNOWN", 2]],
    ["an earlier unanswered attempt, though it saw more of them",
      ours => ({ ...ours, attemptCount: 2, lastAttemptAt: ours.lastAttemptAt - 1, resolutionState: "unknown",
        lastAttemptClassification: "TRANSPORT_UNKNOWN" }), ["unknown", "TRANSPORT_UNKNOWN", 3]],
  ]) {
    const fake = authority(), shared = journal(), requestId = id(), client = await open(fake, shared, "sync");
    fake.rejection = { code: "NOT_FOUND", status: 404 };
    await assert.rejects(send(client, requestId), { code: "NOT_FOUND" });
    shared.save([theirs(shared.record(requestId))]);
    assert.equal(await adoptRecovery(client, requestId), true);
    const merged = client.recoveryStates[0];
    assert.deepEqual([merged.resolutionState, merged.lastAttemptClassification, merged.attemptCount], expected, label);
  }
});

test("over the limit, a client's own write drops its settled records, then the oldest unresolved others", async () => {
  const fake = authority(), shared = journal(), now = Date.now();
  const client = await open(fake, shared, "sync");
  const settled = id(), lost = id();
  await send(client, settled);
  fake.mode = "lost";
  await assert.rejects(send(client, lost), { code: "TRANSPORT_UNKNOWN" });
  fake.mode = "online";
  // Another client's write left none of this client's records.
  const others = Array.from({ length: 128 }, (_, index) => stored(now - 1000 - index, "unknown"));
  shared.save(others);
  assert.equal((await client.retry(lost)).state, "committed");
  assert.deepEqual(shared.records().map(value => value.requestId), others.slice(0, 127).map(value => value.requestId).concat(lost));
  assert.equal(shared.record(lost).resolutionState, "committed");
  assert.deepEqual(held(client), [lost]);
  assert.equal(fake.sent(lost), 1);
});

test("an asynchronous journal that can't be read fails a write before anything is sent", async () => {
  let failing = false;
  const fake = authority(), namespace = id();
  const saved = asyncStorage({ onRead: () => { if (failing) throw new Error("storage offline"); } });
  const client = new ConvoHopTransport({ baseUrl: "http://127.0.0.1:18080", namespace, incarnation, fetch: fake.fetch,
    asyncRecoveryStorage: saved });
  await client.initializeRecovery();
  const committed = id();
  await send(client, committed);
  failing = true;
  const writes = saved.writes.length, requests = fake.requests.length;
  await assert.rejects(send(client, id()), error => error.code === "RECOVERY_STORAGE_FAILURE" &&
    error.outcome === "unknown" && /could not be read/.test(error.message) && error.cause?.message === "storage offline");
  await assert.rejects(client.retry(committed), error => error.code === "RECOVERY_STORAGE_FAILURE" &&
    error.outcome === "committed" && /could not be read/.test(error.message));
  assert.equal(saved.writes.length, writes);
  assert.equal(fake.requests.length, requests);
});

test("a client adopts another's stored record when asked, and nothing else", async () => {
  const fake = authority(), shared = journal(), requestId = id();
  const first = await open(fake, shared, "sync"), adopter = await open(fake, shared, "sync"), retrier = await open(fake, shared, "sync");
  fake.mode = "lost";
  await assert.rejects(send(first, requestId), { code: "TRANSPORT_UNKNOWN" });
  fake.mode = "online";
  assert.equal(await adoptRecovery(adopter, id()), false);
  assert.equal(await adoptRecovery(adopter, requestId), true);
  assert.deepEqual(adopter.recoveryStates.map(value => [value.requestId, value.attemptCount, value.resolutionState]),
    [[requestId, 1, "unknown"]]);
  assert.equal((await retrier.retry(requestId)).state, "committed");
  assert.equal(shared.record(requestId).resolutionState, "committed");
  assert.equal(fake.sent(requestId), 1);
});

for (const kind of kinds) {
  test(`${kind}: a journal made unreadable after construction fails writes and is left as found`, async () => {
    const fake = authority(), shared = journal();
    const client = await open(fake, shared, kind);
    const twin = stored(1, "unknown");
    for (const unreadable of ["{", "{}", "[{}]", JSON.stringify([twin, twin])]) {
      shared.values.set(shared.key, unreadable);
      await assert.rejects(send(client, id()), kind === "sync"
        ? error => error instanceof TypeError || error instanceof SyntaxError
        : { code: "RECOVERY_STORAGE_FAILURE", outcome: "unknown" });
      assert.equal(shared.raw(), unreadable);
    }
    assert.deepEqual(fake.requests, []);
  });

  test(`${kind}: records this SDK can't read stay as stored and are never adopted or sent`, async () => {
    const fake = authority(), shared = journal(), now = Date.now();
    const future = { ...stored(now - 5000, "unknown"), operation: "communication.futureOperation" };
    const superseded = stored(now - 4000, "superseded");
    const marked = { ...stored(now - 3000, "unknown"), futureMarker: { kept: true } };
    shared.save([future, superseded, marked]);
    // The authority committed the readable one, and its response was lost.
    fake.committed.add(marked.requestId);
    const client = await open(fake, shared, kind);
    assert.deepEqual(held(client), [marked.requestId]);
    assert.equal((await client.retry(marked.requestId)).state, "committed");
    assert.deepEqual(shared.records(), [future, superseded,
      { ...marked, resolutionState: "committed", lastAttemptClassification: "authorityReceipt" }]);
    for (const opaque of [future, superseded]) {
      assert.equal(await adoptRecovery(client, opaque.requestId), false);
      await assert.rejects(client.retry(opaque.requestId), /No recovery record exists/);
      const saved = shared.raw();
      await assert.rejects(send(client, opaque.requestId), { code: "IDEMPOTENCY_CONFLICT" });
      assert.equal(shared.raw(), saved);
    }
    assert.deepEqual(fake.sends, []);
    assert.deepEqual(held(client), [marked.requestId]);
  });
}
