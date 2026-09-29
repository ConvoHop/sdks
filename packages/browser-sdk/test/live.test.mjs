import test from "node:test";
import assert from "node:assert/strict";
import { V1Client, V1MediaConnection, LiveSessionHandle, LiveParticipationHandle } from "../dist/index.js";
import { v1Operations, v1OutputShapes } from "../dist/v1-operations.js";
import { operationPayload } from "../dist/v1-graphql.js";

const id = () => crypto.randomUUID(), time = () => new Date().toISOString();
function full(type, fields) {
  return Object.fromEntries(Object.keys(v1OutputShapes[type].fields).map(key => [key, fields[key] ?? null]));
}
function fixture(handle) {
  const requests = [], values = new Map(), context = { projectId: id(), incarnation: id(), principalId: id() };
  const recoveryStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const fetch = async (_url, options) => {
    const request = JSON.parse(options.body), key = Object.keys(v1Operations)
      .find(key => v1Operations[key].operationName === request.operationName);
    requests.push(request);
    const output = await handle(key, request);
    return Response.json({ data: { [v1Operations[key].field]: full(v1Operations[key].resultType.replace(/!$/, ""), {
      status: v1Operations[key].kind === "mutation" ? "committed" : "ok",
      requestId: request.variables.context.requestId, serverTime: time(),
      receiptId: id(), committedAt: time(), replayed: false, ...output,
    }) } });
  };
  const options = { baseUrl: "http://localhost:18080", ...context, sessionToken: "private", recoveryStorage, fetch };
  return { client: new V1Client(options), options, requests, values };
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

test("conversation handles are synchronous, nonthenable and do not make hidden reads or capture", async () => {
  const setup = fixture(() => ({ result: null })), conversationId = id();
  const thread = setup.client.conversation(conversationId);
  assert.equal(thread.conversationId, conversationId);
  assert.equal(thread.then, undefined);
  assert.equal(setup.requests.length, 0);
  assert.equal(await thread.live.current(), null);
  assert.equal(setup.requests[0].operationName, "CommunicationCurrentLiveSession");
});

test("generated union keeps legacy discovery explicitly legacy without fabricated profile or rights", async () => {
  const legacy = { __typename: "LegacyInviteOnlyCall", callId: id(), conversationId: id(), creatorId: id(),
    generation: "1", revision: "1", legacyState: "offering", media: { audio: true, video: false },
    invitation: null, participation: null, mediaCutoff: null };
  const setup = fixture(() => ({ result: legacy }));
  const value = await setup.client.conversation(legacy.conversationId).live.current();
  assert.deepEqual(value, legacy);
  assert.equal(value.join, undefined);
  assert.equal(value.mediaProfile, undefined);
  assert.match(setup.requests[0].query, /legacyState: state/);
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
  const restarted = new V1Client(setup.options);
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
  const restored = new LiveSessionHandle(new V1Client(setup.options), session);
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
  assert.throws(() => operationPayload("communication.liveSession", {
    status: "ok", requestId: id(), serverTime: time(), result: live({ state: "UNKNOWN_FUTURE_STATE" }),
  }), /Unknown LiveSessionState/);
});

test("viewer and audio-only capture controls fail before local device access", async () => {
  for (const [permissions, controls] of [
    [{ microphone: false, camera: false, subscribe: true }, ["microphone", "camera"]],
    [{ microphone: true, camera: false, subscribe: true }, ["camera"]],
  ]) {
    const setup = fixture(() => { throw new Error("no request expected"); });
    const participation = new LiveParticipationHandle(new LiveSessionHandle(setup.client, live()), participant({ permissions }));
    const connection = new V1MediaConnection({ kind: "participation", participation }, {});
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
  const restored = new LiveParticipationHandle(new LiveSessionHandle(new V1Client(setup.options), p.live.snapshot), p.snapshot);
  await assert.rejects(restored.connect(), /Leave has been requested/);
  await assert.rejects(restored.leave(), { code: "TRANSPORT_UNKNOWN" });
  assert.deepEqual(setup.requests[0], setup.requests[2]);
});

test("credential recovery preserves the original unknown command, and native retry resolves before a fresh bound reconnect", async () => {
  const p = participant(), session = live({ myParticipation: p }), expires = new Date(Date.now() + 60000).toISOString();
  const leaseId = id();
  const grant = { liveSessionId: session.liveSessionId, participationId: p.participationId, generation: "1",
    roomName: "fixture", participantIdentity: "fixture", livekitUrl: "ws://localhost:17880",
    transportToken: "never-persist-bearer", admissionTicket: { signature: "never-persist-ticket" },
    forwardingLease: { signature: "never-persist-proof" }, transportExpiresAt: expires, admissionExpiresAt: expires,
    leaseExpiresAt: expires, leasePolicyId: "fixture" };
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
  const restoredClient = new V1Client(setup.options);
  const restored = new LiveParticipationHandle(new LiveSessionHandle(restoredClient, session), p);
  const original = await restored.connectionGrant();
  assert.equal(original.requestId, priorRequest.variables.context.requestId);
  assert.deepEqual(setup.requests.at(-1), priorRequest);
  restored.connectionAttempted();
  assert.ok([...setup.values.values()].every(value => !value.includes("never-persist")));
  await assert.rejects(restored.connectionGrant(), { code: "RESOLUTION_REQUIRED", requestId: original.requestId });
  assert.equal(setup.requests.at(-1).operationName, "CommunicationResolveRequest");
  const latestClient = new V1Client(setup.options);
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
  const next = new V1MediaConnection({ kind: "participation", participation: p }, {});
  p.connect = async options => { received = options; return next; };
  const connection = new V1MediaConnection({ kind: "participation", participation: p },
    { requestId: id(), iceTransportPolicy: "relay" });
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
        admissionExpiresAt: expiry, leaseExpiresAt: expiry, leasePolicyId: "fixture" } };
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
