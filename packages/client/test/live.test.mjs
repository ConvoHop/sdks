import test from "node:test";
import assert from "node:assert/strict";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import * as livekit from "livekit-client";
import { ConvoHopClient, MediaConnection, LiveSessionHandle, LiveParticipationHandle, operationCatalog } from "@convohop/client";
import { validateOutput } from "@convohop/core/internal";
import { full, reply } from "../../../test/graphql-fixtures.mjs";

const id = () => crypto.randomUUID(), time = () => new Date().toISOString();
function fixture(handle) {
  const requests = [], values = new Map(), context = { projectId: id(), incarnation: id(), principalId: id() };
  const recoveryStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const fetch = async (_url, options) => {
    const request = JSON.parse(options.body), key = Object.keys(operationCatalog)
      .find(key => operationCatalog[key].operationName === request.operationName);
    requests.push(request);
    const output = await handle(key, request);
    return reply(request, output);
  };
  const options = { baseUrl: "http://localhost:18080", ...context, sessionToken: "private", recoveryStorage, fetch };
  return { client: new ConvoHopClient(options), options, requests, values };
}
function live(fields = {}) {
  return { liveSessionId: id(), conversationId: id(), creatorId: id(), kind: "INTERACTIVE", mediaProfile: "AUDIO_VIDEO",
    state: "READY", generation: "1", revision: "2", createdAt: time(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(), myParticipation: null, mediaCutoff: null, ...fields };
}
function participant(fields = {}) {
  return { participationId: id(), principalId: id(), membershipEpoch: "1", role: "PUBLISHER", state: "JOINED",
    permissions: { microphone: true, camera: true, subscribe: true },
    reservationExpiresAt: new Date(Date.now() + 120000).toISOString(), nativeConnectionId: null, mediaCutoff: null, ...fields };
}
/** A new client of `setup`'s user whose journal holds `count` records of messages, each sent once and unanswered. */
function crowded(setup, count) {
  const { projectId, principalId, incarnation } = setup.options, at = Date.now() - 10000, conversationId = id();
  setup.values.set(`convohop.requests:${projectId}:${principalId}`, JSON.stringify(Array.from({ length: count }, (_, index) => {
    const requestId = id();
    return { requestId, incarnation, payloadFingerprint: "fixture", operation: "communication.sendMessage", projectId,
      input: { conversationId, text: requestId, props: {} }, firstSubmittedAt: at + index, retryDeadline: at + index + 60000,
      attemptCount: 1, lastAttemptAt: at + index, lastAttemptClassification: "submitted", resolutionState: "unknown" };
  })));
  return new ConvoHopClient(setup.options);
}
const message = (client, requestId) =>
  client.http.execute("communication.sendMessage", client.projectId, { conversationId: id(), text: "fixture", props: {} }, requestId);
const held = client => client.http.recoveryStates.map(state => state.requestId);
/** The typed refusal of request `requestId` while the journal holds 128 records it may not forget. */
const recoveryLimit = requestId => ({ code: "RECOVERY_LIMIT", requestId, outcome: "rejected", status: 409 });
/** Sends `request` three times, unanswered each time, which spends its retry budget and so makes its record final. */
async function spend(request) {
  for (let attempt = 0; attempt < 3; attempt++) await assert.rejects(request(), { code: "TRANSPORT_UNKNOWN" });
}
setFlagsFromString("--expose-gc");
const gc = runInNewContext("gc");
/** Collects garbage until `weak`'s target is gone, as it is once the app drops it; resolves to whether it went. */
async function collected(weak) {
  for (let round = 0; round < 10 && weak.deref() !== undefined; round++) {
    // A target dereferenced in this job survives it.
    await new Promise(resolve => setImmediate(resolve));
    gc();
  }
  return weak.deref() === undefined;
}

test("conversation handles are synchronous, nonthenable and do not make hidden reads or capture", async () => {
  const setup = fixture(() => ({ result: null })), conversationId = id();
  const thread = setup.client.conversation(conversationId);
  assert.equal(thread.conversationId, conversationId);
  assert.equal(thread.then, undefined);
  assert.equal(setup.requests.length, 0);
  assert.equal(await thread.live.current(), null);
  assert.equal(setup.requests[0].operationName, "CommunicationCurrentLiveSession");
});

test("conversation mute reads and sets only this user's own mute", async () => {
  const conversationId = id(), until = new Date(Date.now() + 3600000).toISOString(), answers = [];
  const setup = fixture(() => ({ result: answers.shift() }));
  const own = { conversationId, principalId: setup.client.principalId, muted: true, until };
  answers.push(own, { ...own, muted: false, until: null }, { ...own, principalId: id() });
  const thread = setup.client.conversation(conversationId);
  await assert.rejects(thread.mute.set({ muted: "yes" }), { name: "TypeError", message: "muted must be a boolean" });
  await assert.rejects(thread.mute.set({ muted: true, until: 1 }), TypeError);
  assert.equal(setup.requests.length, 0);
  assert.deepEqual(await thread.mute.set({ muted: true, until }), own);
  assert.deepEqual(await thread.mute.get(), { ...own, muted: false, until: null });
  await assert.rejects(thread.mute.get(), { name: "TypeError", message: "Conversation mute does not match the request" });
  assert.deepEqual(setup.requests.map(request => [request.operationName, request.variables.input]), [
    ["CommunicationSetConversationMute", { conversationId, muted: true, until }],
    ["CommunicationConversationMute", { conversationId }],
    ["CommunicationConversationMute", { conversationId }],
  ]);
});

test("current live discovery returns one typed nullable LiveSession without a union discriminator", async () => {
  const session = live(), setup = fixture(() => ({ result: session }));
  const value = await setup.client.conversation(session.conversationId).live.current();
  assert.ok(value instanceof LiveSessionHandle);
  assert.deepEqual(value.snapshot, session);
  assert.equal(value.__typename, undefined);
  assert.doesNotMatch(setup.requests[0].query, /__typename|Legacy|legacyState/);
});

test("start, join and capture are distinct generated commands with original action completion", async () => {
  const session = live(), p = participant(), actionId = id(), startId = id(), joinId = id();
  const setup = fixture((key, request) => {
    if (key === "communication.startLiveSession") {
      assert.deepEqual(request.variables.input, { conversationId: session.conversationId, kind: "INTERACTIVE", mediaProfile: "AUDIO_VIDEO" });
      return { status: "accepted", operation: { operationId: actionId, owner: "authority", href: "/operation", state: "running" },
        result: { liveSessionId: session.liveSessionId, conversationId: session.conversationId, kind: session.kind,
          mediaProfile: session.mediaProfile, operationId: actionId } };
    }
    if (key === "communication.liveSessionOperation") return { result: { operationId: actionId, requestId: startId,
      liveSessionId: session.liveSessionId, kind: "START", state: "COMPLETED", revision: "2",
      requestedAt: time(), completedAt: time(), failure: null, completion: { liveSessionId: session.liveSessionId,
        generation: "1", state: "READY", revision: "2", completedAt: time(), mediaCutoff: null } } };
    if (key === "communication.liveSession") return { result: session };
    if (key === "communication.joinLiveSession") return { result: { liveSessionId: session.liveSessionId, generation: "1", participation: p } };
    throw new Error(`Unexpected hidden operation ${key}`);
  });
  const start = await setup.client.conversation(session.conversationId).live.startVideo({ requestId: startId });
  const handle = await start.ready(), joined = await handle.join({ requestId: joinId });
  assert.equal(joined.participationId, p.participationId);
  assert.deepEqual(setup.requests.at(-1).variables.input, { liveSessionId: session.liveSessionId, expectedGeneration: "1" });
  assert.equal(setup.requests.at(-1).variables.context.requestId, joinId);
  assert.ok(!setup.requests.some(request => request.operationName.includes("Credentials")));
  assert.equal((await start.completed()).state, "READY");
});

test("unknown start preserves discriminator, exact payload and finite deadline across reconstructed clients", async () => {
  let lost = true;
  const setup = fixture(() => { if (lost) throw new Error("lost response"); throw new Error("no success fixture needed"); });
  const requestId = id(), conversationId = id();
  await assert.rejects(setup.client.conversation(conversationId).live.startVoice({ requestId }), { code: "TRANSPORT_UNKNOWN" });
  const original = setup.client.http.recoveryStates[0];
  lost = false;
  const restarted = new ConvoHopClient(setup.options);
  await assert.rejects(restarted.conversation(conversationId).live.startVoice({ requestId }), { code: "TRANSPORT_UNKNOWN" });
  assert.deepEqual(setup.requests[0], setup.requests[1]);
  assert.equal(restarted.http.recoveryStates[0].retryDeadline, original.retryDeadline);
  assert.equal(restarted.http.recoveryStates[0].payloadFingerprint, original.payloadFingerprint);
  await assert.rejects(restarted.conversation(conversationId).live.startVideo({ requestId }), { code: "IDEMPOTENCY_CONFLICT" });
  assert.ok(![...setup.values.values()].join("").includes("sessionToken"));
});

test("same end identity does not refresh its original revision after an ambiguous response", async () => {
  const session = live(), requestId = id();
  const setup = fixture(key => {
    if (key === "communication.liveSession") return { result: session };
    throw new Error("commit response lost");
  });
  const handle = new LiveSessionHandle(setup.client, session);
  await assert.rejects(handle.end({ requestId }), { code: "TRANSPORT_UNKNOWN" });
  session.revision = "40";
  await assert.rejects(handle.end({ requestId }), { code: "TRANSPORT_UNKNOWN" });
  const restored = new LiveSessionHandle(new ConvoHopClient(setup.options), session);
  await assert.rejects(restored.end(), { code: "TRANSPORT_UNKNOWN" });
  const mutations = setup.requests.filter(request => request.operationName === "CommunicationEndLiveSession");
  assert.equal(mutations.length, 3);
  assert.equal(mutations[0].variables.input.expectedRevision, "2");
  assert.deepEqual(mutations[0], mutations[1]);
  assert.deepEqual(mutations[0], mutations[2]);
});

test("invalid generated response cannot turn an unknown mutation into committed recovery evidence", async () => {
  const setup = fixture(() => ({ result: { liveSessionId: id(), generation: 9007199254740992 } }));
  const requestId = id();
  await assert.rejects(setup.client.conversation(id()).live.startVoice({ requestId }), { code: "INVALID_RESPONSE" });
  assert.equal(setup.client.http.recoveryStates[0].resolutionState, "unknown");
  assert.throws(() => validateOutput({
    status: "ok", requestId: id(), serverTime: time(), result: live({ state: "UNKNOWN_FUTURE_STATE" }),
  }, operationCatalog["communication.liveSession"].resultType), /Unknown LiveSessionState/);
});

test("viewer and audio-only capture controls fail before local device access", async () => {
  for (const [permissions, controls] of [
    [{ microphone: false, camera: false, subscribe: true }, ["microphone", "camera"]],
    [{ microphone: true, camera: false, subscribe: true }, ["camera"]],
  ]) {
    const setup = fixture(() => { throw new Error("no request expected"); });
    const participation = new LiveParticipationHandle(new LiveSessionHandle(setup.client, live()), participant({ permissions }));
    const connection = new MediaConnection(participation, {}, livekit);
    connection.nativeConnectionId = id();
    for (const control of controls) await assert.rejects(connection[control](true), /not authorized/);
    const stats = await connection.stats();
    assert.equal(stats.localAudioEnabled, false);
    assert.equal(stats.localVideoEnabled, false);
    assert.equal(setup.requests.length, 0);
    await connection.disconnect();
  }
});

test("leave failure retains its request identity and forbids a new connection", async () => {
  const setup = fixture(() => { throw new Error("lost leave"); });
  const p = new LiveParticipationHandle(new LiveSessionHandle(setup.client, live()), participant());
  await assert.rejects(p.leave(), { code: "TRANSPORT_UNKNOWN" });
  await assert.rejects(p.connect(), /Leave has been requested/);
  await assert.rejects(p.leave(), { code: "TRANSPORT_UNKNOWN" });
  assert.deepEqual(setup.requests[0], setup.requests[1]);
  const restored = new LiveParticipationHandle(new LiveSessionHandle(new ConvoHopClient(setup.options), p.live.snapshot), p.snapshot);
  await assert.rejects(restored.connect(), /Leave has been requested/);
  await assert.rejects(restored.leave(), { code: "TRANSPORT_UNKNOWN" });
  assert.deepEqual(setup.requests[0], setup.requests[2]);
});

test("live handles keep the records of the requests they hold, though final, so a full journal refuses instead", async () => {
  const p = participant(), session = live({ myParticipation: p });
  const setup = fixture(key => {
    if (key === "communication.liveSession") return { result: session };
    throw new Error("commit response lost");
  });
  const client = crowded(setup, 125), handle = new LiveSessionHandle(client, session);
  const participation = new LiveParticipationHandle(handle, p), [granted, left, ended] = [id(), id(), id()];
  // The handles read these records again: a credential attempt's budget and admission, the original end revision.
  await spend(() => participation.connectionGrant({ requestId: granted }));
  await spend(() => participation.leave({ requestId: left }));
  await spend(() => handle.end({ requestId: ended }));
  const refused = id(), sent = setup.requests.length;
  await assert.rejects(message(client, refused), recoveryLimit(refused));
  assert.equal(setup.requests.length, sent, "nothing is sent");
  // Ending under a new request ID, the handle lets go of the old one, whose record then makes room.
  const ending = id();
  await assert.rejects(handle.end({ requestId: ending }), { code: "TRANSPORT_UNKNOWN" });
  assert.deepEqual([granted, left, ended, ending].map(requestId => held(client).includes(requestId)), [true, true, false, true]);
  await assert.rejects(message(client, refused), recoveryLimit(refused));
});

test("a live handle the app has dropped no longer keeps its requests' records", async () => {
  const p = participant(), session = live({ myParticipation: p });
  const setup = fixture(key => {
    if (key === "communication.liveSession") return { result: session };
    throw new Error("commit response lost");
  });
  const client = crowded(setup, 125), handle = new LiveSessionHandle(client, session), ended = id();
  await spend(() => handle.end({ requestId: ended }));
  // Only this function ever holds the participation handle.
  async function dropped() {
    const participation = new LiveParticipationHandle(handle, p), requestIds = [id(), id()];
    await spend(() => participation.connectionGrant({ requestId: requestIds[0] }));
    await spend(() => participation.leave({ requestId: requestIds[1] }));
    return { requestIds, participation: new WeakRef(participation) };
  }
  const { requestIds, participation } = await dropped();
  assert.ok(await collected(participation), "the participation handle is collected");
  const next = [id(), id()];
  for (const requestId of next) await assert.rejects(message(client, requestId), { code: "TRANSPORT_UNKNOWN" });
  assert.deepEqual([...requestIds, ended, ...next].map(requestId => held(client).includes(requestId)), [false, false, true, true, true]);
  // The session handle the app still holds keeps its end request's record.
  const refused = id();
  await assert.rejects(message(client, refused), recoveryLimit(refused));
  assert.equal(handle.liveSessionId, session.liveSessionId);
});

test("credential recovery preserves the original unknown command, and native retry resolves before a fresh bound reconnect", async () => {
  const p = participant(), session = live({ myParticipation: p }), expires = new Date(Date.now() + 60000).toISOString();
  const leaseId = id();
  const grant = { liveSessionId: session.liveSessionId, participationId: p.participationId, generation: "1",
    roomName: "fixture", participantIdentity: "fixture", livekitUrl: "ws://localhost:17880",
    transportToken: "never-persist-bearer", admissionTicket: { signature: "never-persist-ticket" },
    forwardingLease: { signature: "never-persist-proof" }, transportExpiresAt: expires, admissionExpiresAt: expires,
    leaseExpiresAt: expires, leasePolicyId: "fixture", connectToken: "never-persist-connect-token" };
  let lost = true, priorRequest;
  const setup = fixture((key, request) => {
    if (key === "communication.liveSession") return { result: session };
    if (key === "communication.liveSessionCredentials") {
      if (lost) { lost = false; priorRequest = request; throw new Error("committed response lost"); }
      return { result: grant };
    }
    if (key === "communication.resolveRequest") return { result: {
      state: "committed", requestId: request.variables.input.requestId, checkedAt: time(), resultWithheld: false,
      receipt: full("ResolvedReceipt", { status: "committed", requestId: request.variables.input.requestId,
        receiptId: id(), committedAt: time(), replayed: false,
        result: full("RetainedResult", { liveCredentialIssuance: { liveSessionId: session.liveSessionId,
          participationId: p.participationId, generation: "1", leaseId, grantOrdinal: "1",
          admissionExpiresAt: expires, leaseExpiresAt: expires } }),
      }),
    } };
    throw new Error(`Unexpected operation ${key}`);
  });
  const first = new LiveParticipationHandle(new LiveSessionHandle(setup.client, session), p);
  await assert.rejects(first.connectionGrant(), { code: "TRANSPORT_UNKNOWN" });
  const restoredClient = new ConvoHopClient(setup.options);
  const restored = new LiveParticipationHandle(new LiveSessionHandle(restoredClient, session), p);
  const original = await restored.connectionGrant();
  assert.equal(original.requestId, priorRequest.variables.context.requestId);
  assert.deepEqual(setup.requests.at(-1), priorRequest);
  restored.connectionAttempted();
  assert.ok([...setup.values.values()].every(value => !value.includes("never-persist")));
  await assert.rejects(restored.connectionGrant(), { code: "RESOLUTION_REQUIRED", requestId: original.requestId });
  assert.equal(setup.requests.at(-1).operationName, "CommunicationResolveRequest");
  const latestClient = new ConvoHopClient(setup.options);
  const latest = new LiveParticipationHandle(new LiveSessionHandle(latestClient, session), p);
  await assert.rejects(latest.connectionGrant(), { code: "RESOLUTION_REQUIRED", requestId: original.requestId });
  assert.equal(latestClient.http.recoveryStates[0].mediaAdmissionAttempted, true);
  assert.equal(setup.requests.at(-1).operationName, "CommunicationResolveRequest");
  p.nativeConnectionId = id(); p.state = "DISCONNECTED";
  const fresh = await latest.connectionGrant();
  assert.notEqual(fresh.requestId, original.requestId);
  assert.deepEqual(setup.requests.at(-1).variables.input, { liveSessionId: session.liveSessionId,
    participationId: p.participationId, expectedGeneration: "1", mode: "RECONNECT", replacementOfConnectionId: p.nativeConnectionId });
  assert.ok(latestClient.http.recoveryStates.some(state => state.requestId === original.requestId));
});

test("receive-only reconnect never carries the old explicit credential request ID or capture flags", async () => {
  const setup = fixture(() => { throw new Error("no network request expected"); });
  const p = new LiveParticipationHandle(new LiveSessionHandle(setup.client, live()), participant());
  let received;
  const next = new MediaConnection(p, {}, livekit);
  p.connect = async options => { received = options; return next; };
  const connection = new MediaConnection(p, { requestId: id(), iceTransportPolicy: "relay" }, livekit);
  assert.equal(await connection.reconnect(), next);
  assert.deepEqual(received, { iceTransportPolicy: "relay" });
  const stats = await next.stats();
  assert.equal(stats.localAudioEnabled, false);
  assert.equal(stats.localVideoEnabled, false);
  await next.disconnect();
});

test("expired unknown issuance is resolved before a separately identified fresh grant, without extending the original deadline", async t => {
  const p = participant(), session = live({ myParticipation: p }), now = Date.now();
  const expires = new Date(now + 60000).toISOString(), leaseId = id();
  let lost = true, original;
  const setup = fixture((key, request) => {
    if (key === "communication.liveSession") return { result: session };
    if (key === "communication.liveSessionCredentials") {
      if (lost) { lost = false; original = request.variables.context.requestId; throw new Error("issuance response lost"); }
      const expiry = new Date(Date.now() + 60000).toISOString();
      return { result: { liveSessionId: session.liveSessionId, participationId: p.participationId, generation: "1",
        roomName: "fixture", participantIdentity: "fixture", livekitUrl: "ws://localhost:17880",
        transportToken: "private-grant", admissionTicket: {}, forwardingLease: {}, transportExpiresAt: expiry,
        admissionExpiresAt: expiry, leaseExpiresAt: expiry, leasePolicyId: "fixture", connectToken: "private-connect-token" } };
    }
    if (key === "communication.resolveRequest") return { result: {
      state: "committed", requestId: original, checkedAt: new Date(Date.now()).toISOString(), resultWithheld: false,
      receipt: full("ResolvedReceipt", { status: "committed", requestId: original, receiptId: id(),
        committedAt: new Date(now).toISOString(), replayed: false, result: full("RetainedResult", {
          liveCredentialIssuance: { liveSessionId: session.liveSessionId, participationId: p.participationId,
            generation: "1", leaseId, grantOrdinal: "1", admissionExpiresAt: expires, leaseExpiresAt: expires },
        }) }),
    } };
    throw new Error(`Unexpected operation ${key}`);
  });
  const participation = new LiveParticipationHandle(new LiveSessionHandle(setup.client, session), p);
  await assert.rejects(participation.connectionGrant(), { code: "TRANSPORT_UNKNOWN" });
  const deadline = setup.client.http.recoveryStates[0].retryDeadline;
  t.mock.method(Date, "now", () => now + 61000);
  const fresh = await participation.connectionGrant();
  assert.notEqual(fresh.requestId, original);
  assert.equal(setup.client.http.recoveryStates.find(state => state.requestId === original).retryDeadline, deadline);
  const last = setup.requests.slice(-3).map(request => request.operationName);
  assert.deepEqual(last, ["CommunicationLiveSession", "CommunicationResolveRequest", "CommunicationLiveSessionCredentials"]);
});

function connectorFixture(fields = {}) {
  const p = participant(), session = live({ myParticipation: p }), expires = new Date(Date.now() + 60000).toISOString();
  const grant = { liveSessionId: session.liveSessionId, participationId: p.participationId, generation: "1",
    roomName: "fixture", participantIdentity: "fixture", livekitUrl: "wss://media.example.test",
    transportToken: "never-persist-bearer", admissionTicket: { participationId: p.participationId },
    forwardingLease: { participationId: p.participationId }, transportExpiresAt: expires, admissionExpiresAt: expires,
    leaseExpiresAt: expires, leasePolicyId: "fixture", connectToken: "never-persist-connect-token", ...fields };
  const setup = fixture(key => {
    if (key === "communication.liveSession") return { result: session };
    if (key === "communication.liveSessionCredentials") return { result: grant };
    throw new Error(`Unexpected operation ${key}`);
  });
  const native = { disconnected: 0, open: true };
  const connection = { get connected() { return native.open; }, async disconnect() { native.disconnected++; native.open = false; } };
  return { setup, grant, native, connection,
    participation: new LiveParticipationHandle(new LiveSessionHandle(setup.client, session), p) };
}
const credentialRequests = setup => setup.requests.filter(request => request.operationName === "CommunicationLiveSessionCredentials");

test("connectWith records the attempt durably before a stock SDK connector gets the single-use token once", async () => {
  const { setup, grant, connection, participation } = connectorFixture(), attempts = [];
  const result = await participation.connectWith(async attempt => {
    attempts.push(attempt);
    assert.equal(setup.client.http.recoveryStates.find(state => state.requestId === attempt.requestId).mediaAdmissionAttempted, true);
    assert.ok([...setup.values.values()].some(value => value.includes(attempt.requestId) && value.includes('"mediaAdmissionAttempted":true')),
      "the marker is stored before the connector runs");
    return connection;
  });
  assert.equal(result, connection);
  assert.equal(attempts.length, 1);
  assert.ok(Object.isFrozen(attempts[0]));
  assert.deepEqual({ ...attempts[0] }, { requestId: credentialRequests(setup)[0].variables.context.requestId, mode: "INITIAL",
    url: grant.livekitUrl, token: grant.connectToken, leaseExpiresAt: grant.leaseExpiresAt });
  assert.equal(credentialRequests(setup).length, 1);
  assert.ok([...setup.values.values()].every(value => !value.includes("never-persist")), "tokens are never stored");
  await assert.rejects(participation.connectWith(async () => connection), /A native connection is connected; disconnect it first/);
  await assert.rejects(participation.connect(), /A connector's native connection is connected; disconnect it first/);
  assert.equal(credentialRequests(setup).length, 1);
});

test("connectWith admits one attempt at a time and checks the media URL before marking", async () => {
  const { setup, connection, participation } = connectorFixture(), gate = Promise.withResolvers(), entered = Promise.withResolvers();
  const pending = participation.connectWith(async () => { entered.resolve(); await gate.promise; return connection; });
  await entered.promise;
  await assert.rejects(participation.connectWith(async () => connection), /A native connection attempt is in progress/);
  await assert.rejects(participation.connect(), /A connector's native connection attempt is in progress/);
  gate.resolve();
  assert.equal(await pending, connection);
  assert.equal(credentialRequests(setup).length, 1);

  for (const livekitUrl of ["https://media.example.test", "ws://media.example.test", "wss://media.example.test/?access_token=x"]) {
    const unsafe = connectorFixture({ livekitUrl });
    let called = false;
    await assert.rejects(unsafe.participation.connectWith(async () => { called = true; return unsafe.connection; }),
      { name: "TypeError", message: "Invalid media origin" });
    assert.equal(called, false);
    assert.equal(unsafe.setup.client.http.recoveryStates[0].mediaAdmissionAttempted, undefined, "a refused URL is never marked as attempted");
  }
  const expired = connectorFixture({ leaseExpiresAt: new Date(Date.now() - 1).toISOString() });
  await assert.rejects(expired.participation.connectWith(async () => expired.connection), /Fresh media credentials are required/);
  const unbound = connectorFixture({ forwardingLease: { participationId: id() } });
  await assert.rejects(unbound.participation.connectWith(async () => unbound.connection), /Native proof is not participation-bound/);
});

test("connector failures leave the admission unknown and never surface the native error", async () => {
  const { setup, participation } = connectorFixture();
  const error = await participation.connectWith(async attempt => {
    throw new Error(`could not establish signal connection to ${attempt.url}/rtc?access_token=${attempt.token}`);
  }).catch(caught => caught);
  assert.equal(error.code, "MEDIA_CONNECT_FAILED");
  assert.equal(error.outcome, "unknown");
  assert.equal(error.requestId, credentialRequests(setup)[0].variables.context.requestId);
  assert.equal(error.cause, undefined);
  assert.ok(!`${error.message} ${error.stack} ${JSON.stringify(error)}`.includes("never-persist"));
  assert.equal(setup.client.http.recoveryStates[0].mediaAdmissionAttempted, true);

  const invalid = { name: "TypeError", message: "connector must resolve to a connection with connected and disconnect()" };
  for (const value of [undefined, null, {}, { connected: true }]) {
    const fixture = connectorFixture();
    await assert.rejects(fixture.participation.connectWith(async () => value), invalid);
  }
  const unknownState = connectorFixture();
  await assert.rejects(unknownState.participation.connectWith(async () => ({ disconnect: unknownState.connection.disconnect })), invalid);
  assert.equal(unknownState.native.disconnected, 1, "a connection without connected is closed");
  await assert.rejects(connectorFixture().participation.connectWith("connector"), { name: "TypeError", message: "connector must be a function" });
});

test("leaving during a connector's attempt closes its connection", async () => {
  const { native, connection, participation } = connectorFixture(), gate = Promise.withResolvers(), entered = Promise.withResolvers();
  const pending = participation.connectWith(async () => { entered.resolve(); await gate.promise; return connection; });
  await entered.promise;
  const leaving = participation.leave().catch(error => error);
  gate.resolve();
  await assert.rejects(pending, /Participation was left during connection/);
  assert.equal(native.disconnected, 1);
  assert.equal((await leaving).code, "TRANSPORT_UNKNOWN");
  await assert.rejects(participation.connectWith(async () => connection), /Leave has been requested/);
});
