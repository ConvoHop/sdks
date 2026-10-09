import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { beforeEach, test } from "node:test";
import type { ConvoHopClient, LiveParticipationHandle } from "@convohop/client";
import { setupMedia } from "@convohop/react-native/media";
import { answerCalls, joinCall, leaveCall, type JoinedCall } from "../src/calling.ts";
import { audioSession } from "./livekit.ts";
import { native, onAndroid, type FakeModule } from "./native.ts";

// A real call needs CallKit or Android's Telecom, LiveKit's native WebRTC and a ConvoHop project with calls. These
// tests run joinCall, answerCalls and leaveCall with stand-ins for the native modules, the client and LiveKit's audio
// session, mostly to check how they clean up when a step fails or the user signs out. The rooms never connect, so the
// samples leave the microphone alone.

native.linkCalls();
setupMedia({ callKit: true }); // As src/setup.ts does. The samples can't create a room before it.
beforeEach(() => {
  audioSession.length = 0;
});

const rejecting = (error: unknown) => async () => {
  throw error;
};

// A participation that lists what the samples ask of it. connect settles each connection, and onLeave runs on leave().
function participation({ connect = async () => {}, onLeave = () => {} } = {}) {
  const log: string[] = [];
  const handle = {
    snapshot: { permissions: { microphone: true } },
    async connectWith() {
      log.push("connectWith");
      await connect();
    },
    async leave() {
      log.push("leave");
      onLeave();
    },
  };
  return { handle: handle as unknown as LiveParticipationHandle, log };
}

// A client whose live sessions join with join. opened lists the live sessions that the samples opened.
function client(join: () => Promise<LiveParticipationHandle>, opened: string[] = []): ConvoHopClient {
  const fake = {
    async liveSession(liveSessionId: string) {
      opened.push(liveSessionId);
      return { join };
    },
    liveAlerts: { list: async () => ({ items: [], nextCursor: null }) }, // watchRingingCalls needs it.
  };
  return fake as unknown as ConvoHopClient;
}

// A call that the user answered in the system's call UI.
const answeredCall = () => ({ id: randomUUID(), muted: false, state: "connecting" as const });
// The system calls that the samples hung up.
const hungUp = (calls: FakeModule) => calls.log.filter(([method]) => method === "endCall").map(([, callId]) => callId);

test("leaveCall leaves the call and stops its audio even when the system call won't hang up, and a retry hangs up", t =>
  onAndroid(async () => {
    const warn = t.mock.method(console, "warn", () => {});
    const refused = new Error("ConvoHopCalls couldn't end the call");
    const calls = native.linkCalls({ endCall: rejecting(refused) });
    const { handle, log } = participation();
    const system = answeredCall();
    const call = await joinCall(client(async () => handle), randomUUID(), system);

    await assert.rejects(leaveCall(call), error => error === refused);
    assert.deepEqual(log, ["connectWith", "leave"]);
    assert.deepEqual(audioSession, ["start", "stop"]);
    assert.deepEqual(hungUp(calls), [system.id]);
    assert.equal(call.left, true);
    assert.equal(calls.listenerCount("onCallEvent"), 0);
    assert.equal(warn.mock.callCount(), 0); // The app gets the only failure.

    // Leaving again takes every step again. The real leave() reuses its request.
    const retried = native.linkCalls();
    await leaveCall(call);
    assert.deepEqual(hungUp(retried), [system.id]);
    assert.deepEqual(log, ["connectWith", "leave", "leave"]);
    assert.deepEqual(audioSession, ["start", "stop", "stop"]);
  }),
);

test("joinCall leaves a call that can't connect, and throws why even when hanging up fails", t =>
  onAndroid(async () => {
    const warn = t.mock.method(console, "warn", () => {});
    const failed = new Error("LiveKit couldn't connect");
    const refused = new Error("ConvoHopCalls couldn't end the call");
    const calls = native.linkCalls({ endCall: rejecting(refused) });
    const { handle, log } = participation({ connect: rejecting(failed) });
    const system = answeredCall();

    await assert.rejects(joinCall(client(async () => handle), randomUUID(), system), error => error === failed);
    assert.deepEqual(log, ["connectWith", "leave"]);
    assert.deepEqual(audioSession, ["start", "stop"]);
    assert.deepEqual(hungUp(calls), [system.id]);
    assert.deepEqual(
      warn.mock.calls.map(call => call.arguments),
      [["Couldn't leave the call", refused]],
    );
    assert.equal(calls.listenerCount("onCallEvent"), 0);
  }),
);

test("joinCall hangs up a call it can't join, and throws why even when hanging up fails", async t => {
  const warn = t.mock.method(console, "warn", () => {});
  const denied = new Error("Couldn't join the live session");
  const refused = new Error("ConvoHopCalls couldn't end the call");
  const calls = native.linkCalls({ endCall: rejecting(refused) });
  const system = answeredCall();

  await assert.rejects(joinCall(client(rejecting(denied)), randomUUID(), system), error => error === denied);
  assert.deepEqual(hungUp(calls), [system.id]);
  assert.deepEqual(
    warn.mock.calls.map(call => call.arguments),
    [["Couldn't hang up the call", refused]],
  );
  assert.equal(calls.listenerCount("onCallEvent"), 0);
});

test("answerCalls joins each call that the user answers and hands it to the app", async t => {
  const joined = Promise.withResolvers<JoinedCall>();
  const warn = t.mock.method(console, "warn", (_message: unknown, error: unknown) => joined.reject(error));
  const calls = native.linkCalls();
  const { handle, log } = participation();
  const opened: string[] = [];
  const stop = answerCalls(client(async () => handle, opened), joined.resolve);
  const answered = native.snapshot({ state: "connecting" });
  calls.emit("onCallEvent", { type: "answered", call: answered });

  const call = await joined.promise;
  assert.equal(call.system?.id, answered.id);
  assert.deepEqual(opened, [answered.liveSessionId]);
  assert.deepEqual(log, ["connectWith"]);
  stop();
  await leaveCall(call);
  assert.deepEqual(log, ["connectWith", "leave"]);
  assert.deepEqual(hungUp(calls), [answered.id]);
  assert.equal(calls.listenerCount("onCallEvent"), 0);
  assert.equal(warn.mock.callCount(), 0);
});

test("answerCalls leaves a call that finishes joining after the user signed out", t =>
  onAndroid(async () => {
    // Joining ends with the app getting the call, leaving it or a warning.
    const settled = Promise.withResolvers<void>();
    const warn = t.mock.method(console, "warn", () => settled.resolve());
    const calls = native.linkCalls();
    const { handle, log } = participation({ onLeave: () => settled.resolve() });
    const joining = Promise.withResolvers<LiveParticipationHandle>();
    const joined: JoinedCall[] = [];
    const stop = answerCalls(client(() => joining.promise), call => {
      joined.push(call);
      settled.resolve();
    });
    const answered = native.snapshot({ state: "connecting" });
    calls.emit("onCallEvent", { type: "answered", call: answered });
    await native.turn(); // The call is joining.

    stop(); // The user signs out.
    joining.resolve(handle);
    await settled.promise;
    await native.turn(); // Lets leaveCall finish.
    assert.equal(joined.length, 0, "answerCalls handed the call to the signed-out app");
    assert.deepEqual(log, ["connectWith", "leave"]);
    assert.deepEqual(hungUp(calls), [answered.id]);
    assert.deepEqual(audioSession, ["start", "stop"]);
    assert.equal(calls.listenerCount("onCallEvent"), 0);
    assert.equal(warn.mock.callCount(), 0);
  }),
);
