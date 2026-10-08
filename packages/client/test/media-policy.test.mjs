import assert from "node:assert/strict";
import { test } from "node:test";
import { Room, RoomEvent } from "livekit-client";
import { MediaConnection, ConvoHopTransport } from "@convohop/client";
import { reply, resolution } from "../../../test/graphql-fixtures.mjs";
import { asyncStorage } from "../../../test/recovery-fixtures.mjs";

test("native ICE policy rejects invalid values before credentials or network work", async () => {
  let requested = 0;
  const participation = { connectionGrant: async () => { requested++; throw new Error("must not be called"); } };
  for (const iceTransportPolicy of ["tcp", "Relay", "", null, false, {}, 1]) {
    await assert.rejects(MediaConnection.connectParticipation(participation, { iceTransportPolicy }),
      { name: "TypeError", message: "ICE policy must be all or relay" });
  }
  assert.equal(requested, 0);
});

for (const fail of [false, true]) {
  test(`native admission awaits its durable marker${fail ? " and never opens after a failed commit" : " before opening"}`, async t => {
    const gate = Promise.withResolvers(), entered = Promise.withResolvers();
    const saved = asyncStorage({ onWrite: async (_key, _value, count) => {
      if (count === 4) { entered.resolve(); await gate.promise; }
    } });
    const projectId = crypto.randomUUID(), incarnation = crypto.randomUUID(), liveSessionId = crypto.randomUUID();
    const participationId = crypto.randomUUID(), requestId = crypto.randomUUID(), expires = new Date(Date.now() + 60000).toISOString();
    const grant = { liveSessionId, participationId, generation: "1", roomName: "fixture", participantIdentity: "fixture",
      livekitUrl: "ws://localhost:17880", transportToken: "fixture-private-grant",
      admissionTicket: { participationId, signature: "fixture-private-ticket" },
      forwardingLease: { participationId, signature: "fixture-private-proof" },
      transportExpiresAt: expires, admissionExpiresAt: expires, leaseExpiresAt: expires, leasePolicyId: "fixture",
      connectToken: "fixture-private-connect-token" };
    const transportOptions = { baseUrl: "http://localhost:18080", namespace: "native-async", incarnation, asyncRecoveryStorage: saved };
    const transport = new ConvoHopTransport({ ...transportOptions, fetch: async (_url, init) =>
      reply(JSON.parse(init.body), { result: grant }) });
    await transport.execute("communication.liveSessionCredentials", projectId,
      { liveSessionId, participationId, expectedGeneration: "1", mode: "INITIAL" }, requestId);
    let nativeOpens = 0, room;
    const on = Room.prototype.on;
    t.mock.method(Room.prototype, "on", function (...args) {
      room = this;
      return on.apply(this, args);
    });
    const participation = { participationId, snapshot: { permissions: { microphone: false, camera: false, subscribe: true } },
      connectionGrant: async () => ({ requestId, grant }),
      connectionAttempted: () => transport.markMediaAdmissionAttempted(requestId) };
    const work = MediaConnection.connectParticipation(participation, {});
    assert.ok(room);
    let opened;
    t.mock.method(room, "connect", async (url, token) => {
      nativeOpens++;
      opened = [url, token];
      assert.equal(JSON.parse([...saved.values.values()][0])[0].mediaAdmissionAttempted, true);
      throw new Error("synthetic native failure");
    });
    t.mock.method(room, "disconnect", async () => {});
    const rejected = assert.rejects(work, { code: fail ? "RECOVERY_STORAGE_FAILURE" : "MEDIA_CONNECT_FAILED", requestId });
    await entered.promise;
    assert.equal(nativeOpens, 0);
    assert.equal(transport.recoveryStates[0].mediaAdmissionAttempted, true);
    assert.equal(JSON.parse([...saved.values.values()][0])[0].mediaAdmissionAttempted, undefined);
    if (fail) gate.reject(new Error("durable commit unavailable")); else gate.resolve();
    await rejected;
    assert.equal(nativeOpens, fail ? 0 : 1);
    // The Web SDK connects like the stock LiveKit SDKs: the single-use connectToken, sent only to livekitUrl.
    if (!fail) assert.deepEqual(opened, [grant.livekitUrl, grant.connectToken]);
    assert.ok(saved.writes.every(({ value }) => !value.includes("fixture-private")));
    if (!fail) {
      const restarted = new ConvoHopTransport({ ...transportOptions, fetch: async (_url, init) => {
        const request = JSON.parse(init.body);
        assert.equal(request.operationName, "CommunicationResolveRequest");
        return reply(request, { result: resolution(requestId, "notObservedYet") });
      } });
      await assert.rejects(restarted.retry(requestId), { code: "RESOLUTION_REQUIRED", requestId });
      assert.equal(restarted.recoveryStates[0].mediaAdmissionAttempted, true);
    }
  });
}

function nativeFixture(t) {
  const rooms = [], on = Room.prototype.on;
  t.mock.method(Room.prototype, "on", function (...args) {
    if (rooms.at(-1) !== this) rooms.push(this);
    return on.apply(this, args);
  });
  return (fields = {}, admitted = crypto.randomUUID(), options = {}) => {
    const participationId = crypto.randomUUID(), requestId = crypto.randomUUID();
    const expires = new Date(Date.now() + 60000).toISOString();
    const grant = { liveSessionId: crypto.randomUUID(), participationId, generation: "1", roomName: "fixture",
      participantIdentity: "fixture", livekitUrl: "wss://media.example.test", transportToken: "fixture-private-grant",
      admissionTicket: { participationId }, forwardingLease: { participationId }, transportExpiresAt: expires,
      admissionExpiresAt: expires, leaseExpiresAt: expires, leasePolicyId: "fixture",
      connectToken: "fixture-private-connect-token", ...fields };
    const calls = { marked: 0, opened: [], disconnected: 0 };
    const participation = { participationId, snapshot: { permissions: { microphone: false, camera: false, subscribe: true } },
      connectionGrant: async () => ({ requestId, grant }),
      connectionAttempted: async () => { calls.marked++; } };
    const work = MediaConnection.connectParticipation(participation, options);
    const room = rooms.at(-1);
    t.mock.method(room, "connect", async (url, token) => {
      calls.opened.push([url, token]);
      room.localParticipant.sid = admitted;
    });
    t.mock.method(room, "disconnect", async () => { calls.disconnected++; });
    return { work, grant, requestId, calls, room };
  };
}

test("native credentials are checked before the attempt marker and are only sent to the media origin", async t => {
  const connect = nativeFixture(t);
  const origin = { name: "TypeError", message: "Invalid media origin" };
  for (const [fields, error] of [
    [{ livekitUrl: "https://media.example.test" }, origin],
    [{ livekitUrl: "ws://media.example.test" }, origin],
    [{ livekitUrl: "wss://media.example.test/?access_token=x" }, origin],
    [{ livekitUrl: "wss://media.example.test/#x" }, origin],
    [{ livekitUrl: "wss://user:secret@media.example.test" }, origin],
    [{ livekitUrl: "media.example.test" }, origin],
    [{ leaseExpiresAt: new Date(Date.now() - 1).toISOString() }, { message: "Fresh media credentials are required" }],
    [{ leaseExpiresAt: "not-a-time" }, { message: "Fresh media credentials are required" }],
    [{ connectToken: "" }, { name: "TypeError", message: "Missing media connect token" }],
  ]) {
    const { work, calls } = connect(fields);
    await assert.rejects(work, error);
    assert.deepEqual(calls, { marked: 0, opened: [], disconnected: 0 }, JSON.stringify(fields));
  }
  for (const livekitUrl of ["ws://127.0.0.1:7880", "ws://localhost:7880", "ws://[::1]:7880", "wss://media.example.test/rtc-edge"]) {
    const { work, calls, grant } = connect({ livekitUrl });
    const connection = await work;
    assert.equal(calls.marked, 1);
    assert.deepEqual(calls.opened, [[livekitUrl, grant.connectToken]]);
    await connection.disconnect();
  }
});

test("the admitted participant sid becomes the native connection identity without patching WebSocket", async t => {
  const connect = nativeFixture(t), socket = globalThis.WebSocket, admitted = crypto.randomUUID();
  const { work, calls } = connect({}, admitted);
  const connection = await work;
  assert.equal(globalThis.WebSocket, socket);
  assert.equal(connection.nativeConnectionId, admitted);
  assert.equal(connection.connected, true);
  assert.equal(calls.marked, 1);
  assert.equal("admissionId" in connection, false);
  await connection.disconnect();
  assert.equal(connection.connected, false);
  const rejected = connect({}, "PA_not_admitted");
  await assert.rejects(rejected.work, { code: "MEDIA_CONNECT_FAILED", requestId: rejected.requestId, outcome: "unknown" });
  assert.equal(rejected.calls.disconnected, 1);
  assert.equal(globalThis.WebSocket, socket);
});

test("LiveKit resumes keep only the admitted native connection", async t => {
  const connect = nativeFixture(t), admitted = crypto.randomUUID(), events = [];
  const { work, room, calls } = connect({}, admitted, {
    onResuming: () => events.push("resuming"), onResumed: () => events.push("resumed"),
    onDisconnected: () => events.push("disconnected") });
  const connection = await work;
  assert.equal(typeof room.options.reconnectPolicy.nextRetryDelayInMs({ retryCount: 0, elapsedMs: 0 }), "number");
  room.emit(RoomEvent.Reconnecting);
  assert.equal(connection.resuming, true);
  room.emit(RoomEvent.Reconnected);
  assert.equal(connection.resuming, false);
  assert.equal(connection.connected, true);
  assert.deepEqual(events, ["resuming", "resumed"]);
  room.emit(RoomEvent.Reconnecting);
  room.localParticipant.sid = crypto.randomUUID();
  room.emit(RoomEvent.Reconnected);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ["resuming", "resumed", "resuming", "disconnected"]);
  assert.equal(connection.connected, false);
  assert.equal(calls.disconnected, 1);
  room.emit(RoomEvent.Disconnected);
  assert.deepEqual(events, ["resuming", "resumed", "resuming", "disconnected"]);
});
