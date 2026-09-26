import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { ApiError, ConvoHopClient } from "../dist/index.js";

const mediaId = "c65bcf38-a73d-436d-91cf-81d671b49a44";
const participantId = "d24021e7-9869-476f-8ef1-d8be8af13767";
const owner = "ci_11111111111111111111111111111111";
const token = `st_${"a".repeat(64)}`;
const result = (field, value) => Response.json({ data: { [field]: value } });

class FakeTrack {
  constructor(kind) {
    this.kind = kind;
    this.attached = [];
    this.detached = [];
  }

  attach(element = this.kind === "video"
    ? { tagName: "VIDEO", playsInline: false, srcObject: null }
    : { tagName: "AUDIO", srcObject: null }) {
    element.srcObject = { kind: this.kind };
    this.attached.push(element);
    return element;
  }

  detach(element) {
    element.srcObject = null;
    this.detached.push(element);
    return element;
  }
}

class FakeRoom {
  handlers = new Map();
  connections = [];
  disconnects = [];
  microphone = [];
  camera = [];
  audioStarted = 0;
  cameraTrack = new FakeTrack("video");
  failConnect = false;
  disconnectDuringConnect = false;
  failDisconnect = false;
  localParticipant = {
    setMicrophoneEnabled: async (enabled) => { this.microphone.push(enabled); },
    setCameraEnabled: async (enabled) => { this.camera.push(enabled); },
    getTrackPublication: (source) => source === "camera" ? { track: this.cameraTrack } : undefined,
  };

  on(event, callback) {
    const listeners = this.handlers.get(event) ?? [];
    listeners.push(callback);
    this.handlers.set(event, listeners);
  }

  emit(event, ...args) {
    for (const callback of this.handlers.get(event) ?? []) callback(...args);
  }

  async connect(serverUrl, jwt) {
    this.connections.push({ serverUrl, jwt });
    if (this.failConnect) throw new Error("LiveKit connection failed");
    if (this.disconnectDuringConnect) this.emit("disconnected");
  }

  async disconnect(stopTracks) {
    this.disconnects.push(stopTracks);
    this.emit("disconnected");
    if (this.failDisconnect) throw new Error("LiveKit disconnect failed");
  }

  async startAudio() {
    this.audioStarted++;
  }
}

function service(mode = "video") {
  const operations = [];
  const rooms = [];
  const config = {
    mode,
    kind: "call",
    state: "live",
    denyRenewal: false,
    wrongRenewalId: false,
    failConnect: false,
    disconnectDuringConnect: false,
    failRevoke: false,
  };
  const initialExpiry = new Date(Date.now() + 60_000).toISOString();
  const renewedExpiry = new Date(Date.now() + 120_000).toISOString();
  const client = new ConvoHopClient({
    baseUrl: "http://127.0.0.1:24610",
    sessionToken: token,
    roomFactory: () => {
      const room = new FakeRoom();
      room.failConnect = config.failConnect;
      room.disconnectDuringConnect = config.disconnectDuringConnect;
      rooms.push(room);
      return room;
    },
    fetch: async (_url, init) => {
      const { query, variables } = JSON.parse(init.body);
      operations.push({ query, variables, authorization: init.headers.Authorization });
      if (query.includes("mediaSession(")) {
        return result("mediaSession", {
          id: mediaId,
          projectId: mediaId,
          threadId: mediaId,
          mode: config.mode,
          kind: config.kind,
          owner,
          title: "Pilot call",
          audience: "members",
          state: config.state,
        });
      }
      if (query.includes("joinMedia(")) {
        if (config.denyRenewal && variables.renewParticipantId) {
          return Response.json({ errors: [
            { message: "device revoked", extensions: { code: "FORBIDDEN" } },
          ] });
        }
        const renewed = Boolean(variables.renewParticipantId);
        return result("joinMedia", {
          participantId: renewed && config.wrongRenewalId ? mediaId : participantId,
          serverUrl: "wss://calls.example.test",
          token: renewed ? "fresh-60-second-jwt" : "original-60-second-jwt",
          expiresAt: renewed ? renewedExpiry : initialExpiry,
        });
      }
      if (query.includes("removeMediaParticipant(")) {
        if (config.failRevoke) {
          return Response.json({ errors: [
            { message: "session expired", extensions: { code: "UNAUTHENTICATED" } },
          ] });
        }
        return result("removeMediaParticipant", true);
      }
      throw new Error(`Unexpected GraphQL operation: ${query}`);
    },
  });
  return { client, operations, rooms, config, initialExpiry, renewedExpiry };
}

test("one SDK client joins a video call, publishes, attaches remote tracks and revokes on leave", async () => {
  const { client, operations, rooms } = service();
  const added = [];
  const removed = [];
  const localVideo = { srcObject: null };
  const connection = await client.connectCall(mediaId, {
    localVideo,
    onTrackAdded: (track) => added.push(track),
    onTrackRemoved: (track) => removed.push(track),
  });
  assert.equal(connection.status, "connected");
  assert.equal(connection.participantId, participantId);
  assert.deepEqual(rooms[0].connections, [
    { serverUrl: "wss://calls.example.test", jwt: "original-60-second-jwt" },
  ]);
  assert.deepEqual(rooms[0].microphone, [true]);
  assert.deepEqual(rooms[0].camera, [true]);
  assert.deepEqual(localVideo.srcObject, { kind: "video" });
  await connection.enableAudio();
  assert.equal(rooms[0].audioStarted, 1);

  const remoteVideo = new FakeTrack("video");
  const remoteAudio = new FakeTrack("audio");
  rooms[0].emit("trackSubscribed", remoteVideo, { trackSid: "TR_V" }, { identity: "part_bob" });
  rooms[0].emit("trackSubscribed", remoteAudio, { trackSid: "TR_A" }, { identity: "part_bob" });
  assert.deepEqual(added.map(({ kind, trackSid, participantIdentity }) =>
    [kind, trackSid, participantIdentity]), [
    ["video", "TR_V", "part_bob"], ["audio", "TR_A", "part_bob"],
  ]);
  assert.equal(added[0].element.autoplay, true);
  assert.equal(added[0].element.playsInline, true);
  rooms[0].emit("trackUnsubscribed", remoteAudio, { trackSid: "TR_A" });
  assert.deepEqual(removed.map(({ trackSid }) => trackSid), ["TR_A"]);
  await connection.leave();
  assert.equal(connection.status, "left");
  await assert.rejects(connection.enableAudio(), /Join a media session/);
  assert.equal(localVideo.srcObject, null);
  assert.equal(remoteVideo.detached.length, 1);
  assert.deepEqual(removed.map(({ trackSid }) => trackSid), ["TR_A", "TR_V"]);
  assert.deepEqual(rooms[0].disconnects, [true]);
  assert.deepEqual(operations.filter(({ query }) => query.includes("removeMediaParticipant("))
    .map(({ variables }) => variables), [{ id: mediaId, participantId }]);
  await connection.leave();
  assert.equal(operations.filter(({ query }) => query.includes("removeMediaParticipant(")).length, 1);
});

test("audio-only calls never request a camera; video can publish mic only or join as viewer", async () => {
  const audio = service("audio");
  await assert.rejects(audio.client.connectCall(mediaId, { camera: true }), /Audio calls cannot publish a camera/);
  assert.equal(audio.operations.filter(({ query }) => query.includes("joinMedia(")).length, 0);
  const speaker = await audio.client.connectCall(mediaId);
  assert.deepEqual(audio.rooms[0].microphone, [true]);
  assert.deepEqual(audio.rooms[0].camera, []);
  await speaker.leave();

  const video = service("video");
  const withoutCamera = await video.client.connectCall(mediaId, { camera: false });
  assert.deepEqual(video.rooms[0].microphone, [true]);
  assert.deepEqual(video.rooms[0].camera, []);
  await withoutCamera.leave();
  const viewer = await video.client.connectCall(mediaId, { publish: false });
  assert.deepEqual(video.rooms[1].microphone, []);
  assert.deepEqual(video.rooms[1].camera, []);
  await viewer.leave();
});

test("failed connections revoke admission, and failed revocations remain retryable", async () => {
  const attempt = service();
  attempt.config.failConnect = true;
  await assert.rejects(attempt.client.connectCall(mediaId), /LiveKit connection failed/);
  assert.equal(attempt.operations.filter(({ query }) => query.includes("removeMediaParticipant(")).length, 1);
  const retry = service();
  const connection = await retry.client.connectCall(mediaId);
  retry.config.failRevoke = true;
  await assert.rejects(connection.leave(), (error) =>
    error instanceof ApiError && error.code === "UNAUTHENTICATED");
  retry.config.failRevoke = false;
  const fresh = `st_${"b".repeat(64)}`;
  retry.client.updateSessionToken(fresh);
  await connection.leave();
  assert.deepEqual(retry.operations.filter(({ query }) => query.includes("removeMediaParticipant("))
    .map(({ variables }) => variables), [
    { id: mediaId, participantId }, { id: mediaId, participantId },
  ]);
  assert.equal(retry.operations.at(-1).authorization, `Bearer ${fresh}`);
});

test("a room disconnected during initial or renewed connection cannot report a successful join", async () => {
  const initial = service();
  initial.config.disconnectDuringConnect = true;
  await assert.rejects(initial.client.connectCall(mediaId), /Media disconnected during connection/);
  assert.deepEqual(initial.rooms[0].disconnects, [true]);
  assert.equal(initial.operations.filter(({ query }) => query.includes("removeMediaParticipant(")).length, 1);

  const renewal = service();
  const connection = await renewal.client.connectCall(mediaId);
  renewal.config.disconnectDuringConnect = true;
  await assert.rejects(connection.reconnect(), /Media disconnected during connection/);
  assert.equal(connection.status, "left");
  assert.deepEqual(renewal.rooms.map((room) => room.disconnects), [[true], [true]]);
  assert.equal(renewal.operations.filter(({ query }) => query.includes("removeMediaParticipant(")).length, 1);
});

test("after 60 seconds explicit and unexpected reconnects renew the same device with a fresh JWT", async () => {
  const { client, rooms, operations, initialExpiry, renewedExpiry } = service();
  const connection = await client.connectCall(mediaId);
  assert.equal(connection.grantExpiresAt, initialExpiry);
  const clock = mock.method(Date, "now", () => Date.parse(initialExpiry) + 5_000);
  try {
    await connection.reconnect();
    assert.equal(connection.status, "connected");
    assert.equal(connection.participantId, participantId);
    assert.equal(connection.grantExpiresAt, renewedExpiry);
    assert.deepEqual(rooms[0].disconnects, [true]);
    assert.deepEqual(rooms[1].connections, [
      { serverUrl: "wss://calls.example.test", jwt: "fresh-60-second-jwt" },
    ]);
    rooms[1].emit("disconnected");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(rooms[2].connections, [
      { serverUrl: "wss://calls.example.test", jwt: "fresh-60-second-jwt" },
    ]);
    const renewals = operations.filter(({ query }) => query.includes("joinMedia(")).slice(1);
    assert.equal(renewals.length, 2);
    assert.ok(renewals.every(({ variables }) => variables.renewParticipantId === participantId));
  } finally {
    clock.mock.restore();
    await connection.leave();
  }
});

test("revoked or incorrectly renewed devices cannot reconnect with the cached JWT", async () => {
  const denied = service();
  const disconnected = [];
  const connection = await denied.client.connectCall(mediaId, {
    onDisconnected: (error) => disconnected.push(error),
  });
  denied.config.denyRenewal = true;
  await assert.rejects(connection.reconnect(), (error) =>
    error instanceof ApiError && error.code === "FORBIDDEN");
  assert.equal(connection.status, "left");
  assert.equal(denied.rooms.length, 1);
  assert.equal(denied.rooms[0].connections.length, 1);
  assert.equal(disconnected.length, 1);
  assert.equal(denied.operations.filter(({ query }) => query.includes("removeMediaParticipant(")).length, 1);

  const mismatch = service();
  const device = await mismatch.client.connectCall(mediaId);
  mismatch.config.wrongRenewalId = true;
  await assert.rejects(device.reconnect(), /different participantId/);
  assert.deepEqual(mismatch.operations.filter(({ query }) => query.includes("removeMediaParticipant("))
    .map(({ variables }) => variables.participantId), [mediaId, participantId]);
});
