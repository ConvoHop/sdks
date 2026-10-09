import test from "node:test";
import assert from "node:assert/strict";
import { mathRandomUUID, registrations } from "@livekit/react-native";
import { audioSession, RTCAudioSession } from "@livekit/react-native-webrtc";
import { ConnectionState, Room, RoomEvent } from "livekit-client";
import { ConvoHopClient, LiveParticipationHandle, LiveSessionHandle, MediaConnection } from "@convohop/client";
import { createPlatform } from "@convohop/react-native";
import { Platform, reported } from "react-native";
import { reply } from "../../../test/graphql-fixtures.mjs";
import { randomUUID } from "../dist/random.js";
import { linkCalls, linkPlatform, turn, uuid } from "./support/native.mjs";

let instances = 0;
/** A fresh copy of `@convohop/react-native/media`, because `setupMedia` configures a copy once. */
const fresh = () => import(`../dist/media.js?instance=${++instances}`);

test.beforeEach(() => {
  Platform.OS = "ios";
  reported.length = 0;
  registrations.length = 0;
  audioSession.length = 0;
});

/** Replaces the global `crypto` for one test. `undefined` removes it. */
function replaceCrypto(t, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "crypto", original);
    else delete globalThis.crypto;
  });
  if (value === undefined) delete globalThis.crypto;
  else Object.defineProperty(globalThis, "crypto", { value, configurable: true, writable: true });
}

test("setupMedia validates its options before installing anything", async () => {
  linkCalls();
  const { setupMedia } = await fresh();
  for (const options of [null, "callKit", 1, true])
    assert.throws(() => setupMedia(options), { name: "TypeError", message: "options must be an object" });
  for (const callKit of [null, "true", 1, {}])
    assert.throws(() => setupMedia({ callKit }), { name: "TypeError", message: "callKit must be a boolean" });
  assert.deepEqual(registrations, []);
});

test("setupMedia installs secure crypto before LiveKit's globals, which fill a missing randomUUID from Math.random", async t => {
  const platform = linkPlatform(), { setupMedia } = await fresh();
  replaceCrypto(t, undefined);
  setupMedia();
  assert.deepEqual(registrations, [{ options: { autoConfigureAudioSession: true }, hadRandomUUID: true }]);
  assert.equal(globalThis.crypto.randomUUID, randomUUID);
  assert.notEqual(globalThis.crypto.randomUUID, mathRandomUUID);
  assert.match(globalThis.crypto.randomUUID(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepEqual(platform.log, [["getRandomBytes", 16]]);
});

test("setupMedia configures once, and a different callKit later is an error", async () => {
  linkCalls();
  const { setupMedia } = await fresh();
  setupMedia({ callKit: false });
  setupMedia();
  setupMedia({ callKit: false });
  assert.equal(registrations.length, 1);
  assert.throws(() => setupMedia({ callKit: true }), { name: "Error", message: "setupMedia was already called with callKit: false" });
  const other = await fresh();
  other.setupMedia({ callKit: true });
  other.setupMedia({ callKit: true });
  assert.throws(() => other.setupMedia(), { name: "Error", message: "setupMedia was already called with callKit: true" });
  assert.equal(registrations.length, 2);
});

test("with CallKit on iOS, LiveKit leaves the audio session to CallKit, and each change CallKit makes reaches WebRTC once", async () => {
  const state = Promise.withResolvers(), calls = linkCalls({ isAudioSessionActive: () => state.promise });
  (await fresh()).setupMedia({ callKit: true });
  assert.deepEqual(registrations.map(entry => entry.options), [{ autoConfigureAudioSession: false }]);
  assert.equal(calls.listenerCount("onAudioSession"), 1);
  assert.deepEqual(calls.log, [["isAudioSessionActive"]]);
  for (const active of [true, true, false, false, true]) calls.emit("onAudioSession", { active });
  assert.deepEqual(audioSession, ["activate", "deactivate", "activate"]);
  // The state CallKit had when JavaScript started is stale once an event has arrived.
  state.resolve(false);
  await turn();
  assert.deepEqual(audioSession, ["activate", "deactivate", "activate"]);
  assert.deepEqual(reported, []);
});

test("an audio session CallKit activated before JavaScript ran, as for a call answered on the lock screen, reaches WebRTC", async () => {
  const calls = linkCalls({ isAudioSessionActive: async () => true });
  (await fresh()).setupMedia({ callKit: true });
  await turn();
  assert.deepEqual(audioSession, ["activate"]);
  calls.emit("onAudioSession", { active: true });
  calls.emit("onAudioSession", { active: false });
  assert.deepEqual(audioSession, ["activate", "deactivate"]);

  linkCalls({ isAudioSessionActive: async () => false });
  (await fresh()).setupMedia({ callKit: true });
  await turn();
  assert.deepEqual(audioSession, ["activate", "deactivate"], "an inactive session needs nothing");
  assert.deepEqual(reported, []);
});

test("malformed audio session values and native failures are reported and change nothing", async () => {
  const calls = linkCalls({ isAudioSessionActive: async () => "active" });
  (await fresh()).setupMedia({ callKit: true });
  await turn();
  for (const event of [undefined, null, {}, { active: "true" }, { active: 1 }]) calls.emit("onAudioSession", event);
  assert.deepEqual(reported.map(error => [error.name, error.message]), [
    ["TypeError", "ConvoHopCalls returned a malformed audio session state"],
    ...Array(5).fill(["TypeError", "ConvoHopCalls sent a malformed audio session event"])]);
  assert.deepEqual(audioSession, []);

  reported.length = 0;
  const failure = new Error("CallKit is unavailable");
  linkCalls({ isAudioSessionActive: async () => { throw failure; } });
  (await fresh()).setupMedia({ callKit: true });
  await turn();
  assert.deepEqual(reported, [failure]);
  assert.deepEqual(audioSession, []);
});

test("a change WebRTC rejects is reported and tried again with the next event", async t => {
  const calls = linkCalls(), failure = new Error("WebRTCModule is not linked");
  (await fresh()).setupMedia({ callKit: true });
  await turn();
  const activate = t.mock.method(RTCAudioSession, "audioSessionDidActivate", () => { throw failure; });
  calls.emit("onAudioSession", { active: true });
  assert.deepEqual(reported, [failure]);
  calls.emit("onAudioSession", { active: false });
  assert.deepEqual(audioSession, [], "WebRTC never counted the failed activation, so nothing is deactivated");
  activate.mock.restore();
  calls.emit("onAudioSession", { active: true });
  assert.deepEqual(audioSession, ["activate"]);
});

test("CallKit audio forwarding is iOS-only and needs callKit", async () => {
  const calls = linkCalls();
  Platform.OS = "android";
  (await fresh()).setupMedia({ callKit: true });
  Platform.OS = "ios";
  (await fresh()).setupMedia({ callKit: false });
  (await fresh()).setupMedia();
  assert.deepEqual(registrations.map(entry => entry.options), Array(3).fill({ autoConfigureAudioSession: true }));
  assert.equal(calls.listenerCount("onAudioSession"), 0);
  assert.deepEqual(calls.log, []);
});

/** The options of the room the Web SDK's `MediaConnection` creates. */
async function webRoomOptions(t) {
  const rooms = [], on = Room.prototype.on;
  const mock = t.mock.method(Room.prototype, "on", function (...args) {
    if (!rooms.includes(this)) {
      rooms.push(this);
      this.connect = async () => { throw new Error("The test stops at connect"); };
      this.disconnect = async () => {};
    }
    return on.apply(this, args);
  });
  const participationId = uuid(), expires = new Date(Date.now() + 60000).toISOString();
  const grant = { liveSessionId: uuid(), participationId, generation: "1", roomName: "fixture", participantIdentity: "fixture",
    livekitUrl: "wss://media.example.test", transportToken: "fixture", admissionTicket: { participationId },
    forwardingLease: { participationId }, transportExpiresAt: expires, admissionExpiresAt: expires, leaseExpiresAt: expires,
    leasePolicyId: "fixture", connectToken: "fixture" };
  const participation = { participationId, snapshot: { permissions: { microphone: false, camera: false, subscribe: true } },
    live: { client: {} }, connectionGrant: async () => ({ requestId: uuid(), mode: "INITIAL", grant }), connectionAttempted: async () => {} };
  await assert.rejects(MediaConnection.connectParticipation(participation, {}), { code: "MEDIA_CONNECT_FAILED" });
  mock.mock.restore();
  assert.equal(rooms.length, 1);
  return rooms[0].options;
}

test("createRoom needs setupMedia and applies the Web SDK's media policy", async t => {
  const media = await fresh();
  assert.throws(() => media.createRoom(), { name: "Error", message: "Call setupMedia() in index.js before creating a room" });
  media.setupMedia();
  const room = media.createRoom();
  assert.ok(room instanceof Room);
  assert.notEqual(media.createRoom(), room);
  assert.equal(room.state, ConnectionState.Disconnected);
  const policy = ({ adaptiveStream, dynacast, singlePeerConnection, videoCaptureDefaults, publishDefaults }) =>
    ({ adaptiveStream, dynacast, singlePeerConnection, videoCaptureDefaults, publishDefaults });
  assert.deepEqual(policy(room.options), policy(await webRoomOptions(t)));
  const { videoCaptureDefaults, publishDefaults } = room.options;
  assert.deepEqual({ adaptiveStream: room.options.adaptiveStream, dynacast: room.options.dynacast,
    singlePeerConnection: room.options.singlePeerConnection, resolution: videoCaptureDefaults.resolution,
    simulcast: publishDefaults.simulcast, videoCodec: publishDefaults.videoCodec, videoEncoding: publishDefaults.videoEncoding }, {
    adaptiveStream: false, dynacast: false, singlePeerConnection: false, resolution: { width: 320, height: 240, frameRate: 15 },
    simulcast: false, videoCodec: "vp8", videoEncoding: { maxBitrate: 350000, maxFramerate: 15 } });
});

/**
 * A LiveKit room whose connect admits the participant SID that `admit` returns, or fails with what it throws, and
 * whose disconnect behaves like LiveKit's: it emits Disconnected unless the room is already disconnected.
 */
function stubRoom(admit = () => uuid()) {
  const room = new Room(), calls = { connect: [], disconnect: [] };
  room.connect = async (...args) => {
    calls.connect.push(args);
    room.state = ConnectionState.Connecting;
    try {
      room.localParticipant.sid = await admit();
    } catch (error) {
      room.state = ConnectionState.Disconnected;
      throw error;
    }
    room.state = ConnectionState.Connected;
  };
  room.disconnect = async (...args) => {
    calls.disconnect.push(args);
    if (room.state === ConnectionState.Disconnected) return;
    room.state = ConnectionState.Disconnected;
    room.emit(RoomEvent.Disconnected);
  };
  return { room, calls };
}
/** What LiveKit does when the network fails past resuming or the server removes the participant. */
function drop(room) {
  room.state = ConnectionState.Disconnected;
  room.emit(RoomEvent.Disconnected);
}
const roomEvents = [RoomEvent.Disconnected, RoomEvent.Reconnecting, RoomEvent.Reconnected];
/** How many listeners `room` has for the events a connection follows. A closed connection removes its own. */
const listenerCounts = room => roomEvents.map(event => room.listenerCount(event));
const attempt = () => Object.freeze({ requestId: uuid(), mode: "INITIAL", url: "wss://media.example.test",
  token: `single-use-${uuid()}`, leaseExpiresAt: new Date(Date.now() + 60000).toISOString() });

test("createRoomConnector validates the room and its options", async () => {
  const { createRoomConnector } = await fresh(), room = new Room();
  for (const value of [undefined, null, "room", {}, { connect() {} }, { on() {} }])
    assert.throws(() => createRoomConnector(value), { name: "TypeError", message: "room must be a livekit-client Room" });
  for (const options of [null, "relay", 1])
    assert.throws(() => createRoomConnector(room, options), { name: "TypeError", message: "options must be an object" });
  for (const iceTransportPolicy of ["tcp", "Relay", "", null, false, {}, 1])
    assert.throws(() => createRoomConnector(room, { iceTransportPolicy }), { name: "TypeError", message: "ICE policy must be all or relay" });
  for (const name of ["onResuming", "onResumed", "onDisconnected"])
    for (const value of [null, "callback", {}])
      assert.throws(() => createRoomConnector(room, { [name]: value }), { name: "TypeError", message: `${name} must be a function` });
  for (const state of [ConnectionState.Connecting, ConnectionState.Connected, ConnectionState.Reconnecting]) {
    room.state = state;
    assert.throws(() => createRoomConnector(room), { name: "Error", message: "The room is already connected or connecting" });
  }
});

test("the connector connects the room once with each attempt's token and returns the admitted connection", async () => {
  const { createRoomConnector } = await fresh(), admitted = uuid(), { room, calls } = stubRoom(() => admitted);
  const connector = createRoomConnector(room, { iceTransportPolicy: "relay" }), first = attempt(), idle = listenerCounts(room);
  const connection = await connector(first);
  assert.deepEqual(listenerCounts(room), idle.map(count => count + 1));
  assert.deepEqual(calls.connect, [[first.url, first.token, { autoSubscribe: true, maxRetries: 0, rtcConfig: { iceTransportPolicy: "relay" } }]]);
  assert.equal(connection.room, room);
  assert.equal(connection.nativeConnectionId, admitted);
  assert.equal(connection.connected, true);
  assert.equal(connection.resuming, false);
  await assert.rejects(connector(attempt()), { name: "Error", message: "The room is already connected or connecting" });
  assert.equal(calls.connect.length, 1);
  await connection.disconnect();
  assert.equal(connection.connected, false);
  assert.equal(connection.nativeConnectionId, admitted);
  assert.deepEqual(calls.disconnect, [[true]]);
  assert.deepEqual(listenerCounts(room), idle);
  await connection.disconnect();
  assert.equal(calls.disconnect.length, 1, "a closed connection leaves the room alone");

  const next = attempt(), again = await createRoomConnector(room)(next);
  assert.deepEqual(calls.connect[1], [next.url, next.token, { autoSubscribe: true, maxRetries: 0, rtcConfig: { iceTransportPolicy: "all" } }]);
  assert.equal(again.connected, true);
  assert.equal(connection.connected, false);

  const gate = Promise.withResolvers(), slow = stubRoom(() => gate.promise), slowConnector = createRoomConnector(slow.room);
  const pending = slowConnector(attempt());
  await assert.rejects(slowConnector(attempt()), { message: "The room is already connected or connecting" });
  gate.resolve(admitted);
  assert.equal((await pending).connected, true);
  assert.equal(slow.calls.connect.length, 1);
});

test("a failed connect, an unadmitted SID or a disconnect while connecting fails the attempt and disconnects the room", async () => {
  const { createRoomConnector } = await fresh(), failure = new Error("could not establish signal connection"), events = [];
  const listeners = { onResuming: () => events.push("resuming"), onDisconnected: () => events.push("disconnected") };
  let fail = true;
  const failed = stubRoom(() => { if (fail) throw failure; return uuid(); }), connector = createRoomConnector(failed.room, listeners);
  const idle = listenerCounts(failed.room);
  await assert.rejects(connector(attempt()), error => error === failure);
  assert.deepEqual(failed.calls.disconnect, [[true]]);
  assert.deepEqual(listenerCounts(failed.room), idle);
  fail = false;
  assert.equal((await connector(attempt())).connected, true, "the room connects again with the next attempt");

  for (const sid of ["PA_not_admitted", uuid().toUpperCase(), "00000000-0000-0000-0000-000000000000"]) {
    const { room, calls } = stubRoom(() => sid);
    await assert.rejects(createRoomConnector(room, listeners)(attempt()), { name: "TypeError", message: "Expected a canonical nonzero UUID" });
    assert.deepEqual(calls.disconnect, [[true]]);
    assert.equal(room.state, ConnectionState.Disconnected);
  }

  const dropped = stubRoom();
  dropped.room.connect = async () => {
    dropped.room.localParticipant.sid = uuid();
    dropped.room.emit(RoomEvent.Reconnecting);
    drop(dropped.room);
  };
  await assert.rejects(createRoomConnector(dropped.room, listeners)(attempt()), { name: "Error", message: "The room disconnected while connecting" });
  assert.deepEqual(dropped.calls.disconnect, [[true]]);
  assert.deepEqual(listenerCounts(dropped.room), idle);
  assert.deepEqual(events, [], "an attempt that never opened neither resumes nor disconnects");
  assert.deepEqual(reported, []);
});

test("LiveKit resumes keep the admitted connection, and a new participant identity ends it", async () => {
  const { createRoomConnector } = await fresh(), admitted = uuid(), events = [], { room, calls } = stubRoom(() => admitted);
  const idle = listenerCounts(room), connection = await createRoomConnector(room, { onResuming: () => events.push("resuming"),
    onResumed: () => events.push("resumed"), onDisconnected: () => events.push("disconnected") })(attempt());
  room.emit(RoomEvent.Reconnecting);
  assert.equal(connection.resuming, true);
  assert.equal(connection.connected, true);
  room.emit(RoomEvent.Reconnected);
  assert.equal(connection.resuming, false);
  assert.deepEqual(events, ["resuming", "resumed"]);

  room.emit(RoomEvent.Reconnecting);
  room.localParticipant.sid = uuid();
  room.emit(RoomEvent.Reconnected);
  assert.equal(connection.connected, false);
  assert.equal(connection.resuming, false);
  assert.deepEqual(calls.disconnect, [[true]]);
  assert.deepEqual(events, ["resuming", "resumed", "resuming"], "onDisconnected waits for the room to disconnect");
  await turn();
  assert.deepEqual(events, ["resuming", "resumed", "resuming", "disconnected"]);
  assert.equal(connection.nativeConnectionId, admitted);
  assert.deepEqual(listenerCounts(room), idle);
  for (const event of roomEvents) room.emit(event);
  assert.deepEqual(events, ["resuming", "resumed", "resuming", "disconnected"], "a closed connection ignores the room");
  assert.deepEqual(reported, []);
});

test("a dropped connection calls onDisconnected once, and disconnect() never does", async () => {
  const { createRoomConnector } = await fresh(), events = [], { room, calls } = stubRoom();
  const connector = createRoomConnector(room, { onResuming: () => events.push("resuming"), onDisconnected: () => events.push("disconnected") });
  const idle = listenerCounts(room), first = await connector(attempt());
  room.emit(RoomEvent.Reconnecting);
  drop(room);
  assert.equal(first.connected, false);
  assert.equal(first.resuming, false);
  assert.deepEqual(listenerCounts(room), idle);
  drop(room);
  assert.deepEqual(events, ["resuming", "disconnected"]);
  const second = await connector(attempt());
  await second.disconnect();
  assert.equal(second.connected, false);
  assert.deepEqual(calls.disconnect, [[true]]);
  assert.deepEqual(events, ["resuming", "disconnected"]);
});

test("resume events while the room connects belong to the attempt", async () => {
  const { createRoomConnector } = await fresh(), admitted = uuid(), events = [];
  const { room, calls } = stubRoom(() => {
    room.emit(RoomEvent.Reconnecting);
    room.emit(RoomEvent.Reconnected);
    return admitted;
  });
  const connection = await createRoomConnector(room, { onResuming: () => events.push("resuming"),
    onResumed: () => events.push("resumed"), onDisconnected: () => events.push("disconnected") })(attempt());
  await turn();
  assert.equal(connection.connected, true);
  assert.equal(connection.resuming, false);
  assert.equal(connection.nativeConnectionId, admitted);
  assert.deepEqual(calls.disconnect, []);
  assert.deepEqual(events, []);
});

test("a connection the app disconnects from an earlier listener for the same room event ignores that event", async () => {
  const { createRoomConnector } = await fresh();
  for (const event of roomEvents) {
    const events = [], { room, calls } = stubRoom();
    let connection;
    // LiveKit's emitter calls every listener registered when the event began, including ones removed since.
    room.on(event, () => void connection.disconnect());
    connection = await createRoomConnector(room, { onResuming: () => events.push("resuming"),
      onResumed: () => events.push("resumed"), onDisconnected: () => events.push("disconnected") })(attempt());
    if (event === RoomEvent.Disconnected) drop(room);
    else room.emit(event);
    await turn();
    assert.equal(connection.connected, false);
    assert.equal(connection.resuming, false);
    assert.deepEqual(calls.disconnect, [[true]]);
    assert.deepEqual(events, [], `the app disconnected during ${event}`);
  }
  assert.deepEqual(reported, []);
});

test("errors thrown by the callbacks or by LiveKit's disconnect are reported", async () => {
  const { createRoomConnector } = await fresh(), failure = new Error("the app's callback failed"), throwing = () => { throw failure; };
  const { room } = stubRoom();
  const connection = await createRoomConnector(room, { onResuming: throwing, onResumed: throwing, onDisconnected: throwing })(attempt());
  room.emit(RoomEvent.Reconnecting);
  room.emit(RoomEvent.Reconnected);
  assert.equal(connection.connected, true);
  drop(room);
  assert.deepEqual(reported, [failure, failure, failure]);

  reported.length = 0;
  const leaving = new Error("LiveKit couldn't leave"), events = [], broken = stubRoom();
  const replaced = await createRoomConnector(broken.room, { onDisconnected: () => events.push("disconnected") })(attempt());
  broken.room.disconnect = async () => { throw leaving; };
  broken.room.localParticipant.sid = uuid();
  broken.room.emit(RoomEvent.Reconnected);
  await turn();
  assert.equal(replaced.connected, false);
  assert.deepEqual(reported, [leaving]);
  assert.deepEqual(events, ["disconnected"]);
});

test("an old connection never disconnects the room's next connection", async () => {
  const { createRoomConnector } = await fresh(), { room, calls } = stubRoom(), connector = createRoomConnector(room);
  const first = await connector(attempt());
  drop(room);
  const second = await createRoomConnector(room)(attempt());
  await first.disconnect();
  assert.equal(second.connected, true);
  assert.deepEqual(calls.disconnect, []);
  await connector(attempt()).then(() => assert.fail("the room is connected"), error => assert.match(error.message, /already connected/));
  await second.disconnect();
  assert.deepEqual(calls.disconnect, [[true]]);
});

const time = () => new Date().toISOString();
/** A participation in a live session that a fake ConvoHop API serves, on the React Native platform. */
function participationFixture(t) {
  const p = { participationId: uuid(), principalId: uuid(), membershipEpoch: "1", role: "PUBLISHER", state: "JOINED",
    permissions: { microphone: true, camera: true, subscribe: true },
    reservationExpiresAt: new Date(Date.now() + 120000).toISOString(), nativeConnectionId: null, mediaCutoff: null };
  const session = { liveSessionId: uuid(), conversationId: uuid(), creatorId: uuid(), kind: "INTERACTIVE",
    mediaProfile: "AUDIO_VIDEO", state: "READY", generation: "1", revision: "2", createdAt: time(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(), myParticipation: p, mediaCutoff: null };
  const expires = new Date(Date.now() + 60000).toISOString();
  const grant = { liveSessionId: session.liveSessionId, participationId: p.participationId, generation: "1",
    roomName: "fixture", participantIdentity: "fixture", livekitUrl: "wss://media.example.test",
    transportToken: "never-persist-bearer", admissionTicket: { participationId: p.participationId },
    forwardingLease: { participationId: p.participationId }, transportExpiresAt: expires, admissionExpiresAt: expires,
    leaseExpiresAt: expires, leasePolicyId: "fixture", connectToken: "never-persist-connect-token" };
  const values = new Map(), requests = [], platform = createPlatform();
  t.after(() => platform.dispose());
  const client = new ConvoHopClient({ baseUrl: "https://api.example.test", projectId: uuid(), incarnation: uuid(),
    principalId: uuid(), sessionToken: "react-native-test-session", platform,
    recoveryStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key) },
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body);
      requests.push(request.operationName);
      if (request.operationName === "CommunicationLiveSession") return reply(request, { result: session });
      if (request.operationName === "CommunicationLiveSessionCredentials") return reply(request, { result: grant });
      throw new Error(`Unexpected operation ${request.operationName}`);
    } });
  return { grant, values, requests, participation: new LiveParticipationHandle(new LiveSessionHandle(client, session), p) };
}

test("participation.connectWith records the attempt, then connects the room with the grant's single-use token", async t => {
  linkPlatform();
  const { createRoomConnector } = await fresh(), { grant, values, requests, participation } = participationFixture(t);
  const admitted = uuid();
  let recorded;
  const { room, calls } = stubRoom(() => {
    recorded = [...values.values()].some(value => value.includes('"mediaAdmissionAttempted":true'));
    return admitted;
  });
  const connection = await participation.connectWith(createRoomConnector(room));
  assert.equal(recorded, true, "the attempt is stored before the room connects");
  assert.deepEqual(calls.connect, [[grant.livekitUrl, grant.connectToken,
    { autoSubscribe: true, maxRetries: 0, rtcConfig: { iceTransportPolicy: "all" } }]]);
  assert.equal(connection.nativeConnectionId, admitted);
  assert.equal(connection.connected, true);
  assert.deepEqual(requests, ["CommunicationLiveSession", "CommunicationLiveSessionCredentials"]);
  assert.ok([...values.values()].every(value => !value.includes("never-persist")), "credentials are never stored");
  await assert.rejects(participation.connectWith(createRoomConnector(new Room())), /A native connection is connected; disconnect it first/);
  await connection.disconnect();
  assert.deepEqual(calls.disconnect, [[true]]);
});

test("an unadmitted participant SID fails connectWith with an unknown outcome and disconnects the room", async t => {
  linkPlatform();
  const { createRoomConnector } = await fresh(), { participation } = participationFixture(t);
  const { room, calls } = stubRoom(() => "PA_not_admitted");
  const error = await participation.connectWith(createRoomConnector(room)).catch(caught => caught);
  assert.equal(error.code, "MEDIA_CONNECT_FAILED");
  assert.equal(error.outcome, "unknown");
  assert.deepEqual(calls.disconnect, [[true]]);
  assert.equal(room.state, ConnectionState.Disconnected);
});
