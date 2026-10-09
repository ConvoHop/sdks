import test from "node:test";
import assert from "node:assert/strict";
import {
  answerCall, canUseFullScreenIntent, endCall, forgetCall, getCalls, onCallEvent, openFullScreenIntentSettings,
  reportConnected, reportConnecting, setAudioRoute, setHeld, setMuted, startOutgoingCall, stopRinging,
  subscribeAnsweredCalls, updateCall,
} from "@convohop/react-native";
import { Platform, reported } from "react-native";
import { linkCalls, snapshot, turn, uuid } from "./support/native.mjs";

const NIL = "00000000-0000-0000-0000-000000000000";
const MALFORMED_CALLS = { name: "TypeError", message: "ConvoHopCalls returned malformed calls" };
const BAD_ID = { name: "TypeError", message: "id must be a lowercase, non-nil UUID" };

test.beforeEach(() => {
  Platform.OS = "ios";
  reported.length = 0;
});

test("getCalls maps native snapshots to frozen calls", async () => {
  const ringing = snapshot();
  const outgoing = snapshot({ alertId: null, conversationId: undefined, mediaProfile: null, callerName: null,
    expiresAtMs: undefined, outgoing: true, hasVideo: true, state: "connecting", muted: true, serverReason: null, audioRoute: null });
  const ended = snapshot({ state: "ended", endReason: "answeredElsewhere", serverReason: "answered" });
  const android = snapshot({ state: "active", mediaProfile: "AUDIO_VIDEO_SCREEN", audioRoute: "bluetooth",
    availableAudioRoutes: ["earpiece", "speaker", "bluetooth", "wiredHeadset", "streaming", "unknown"] });
  const calls = linkCalls({ getCalls: async () => [ringing, outgoing, ended, android] });
  const found = await getCalls();
  assert.deepEqual(calls.log, [["getCalls"]]);
  assert.deepEqual(found, [
    { id: ringing.id, alertId: ringing.alertId, liveSessionId: ringing.liveSessionId, conversationId: ringing.conversationId,
      outgoing: false, hasVideo: false, mediaProfile: "AUDIO_ONLY", callerName: "Ada", expiresAt: ringing.expiresAtMs,
      state: "ringing", muted: false, availableAudioRoutes: [] },
    { id: outgoing.id, liveSessionId: outgoing.liveSessionId, outgoing: true, hasVideo: true, state: "connecting", muted: true,
      availableAudioRoutes: [] },
    { id: ended.id, alertId: ended.alertId, liveSessionId: ended.liveSessionId, conversationId: ended.conversationId,
      outgoing: false, hasVideo: false, mediaProfile: "AUDIO_ONLY", callerName: "Ada", expiresAt: ended.expiresAtMs,
      state: "ended", muted: false, endReason: "answeredElsewhere", serverReason: "answered", availableAudioRoutes: [] },
    { id: android.id, alertId: android.alertId, liveSessionId: android.liveSessionId, conversationId: android.conversationId,
      outgoing: false, hasVideo: false, mediaProfile: "AUDIO_VIDEO_SCREEN", callerName: "Ada", expiresAt: android.expiresAtMs,
      state: "active", muted: false, audioRoute: "bluetooth", availableAudioRoutes: android.availableAudioRoutes },
  ]);
  assert.ok(found.every(entry => Object.isFrozen(entry) && Object.isFrozen(entry.availableAudioRoutes)));
  assert.notEqual(found[3].availableAudioRoutes, android.availableAudioRoutes, "the routes are copied");
  for (const reason of ["rejected", "hungUp", "declinedElsewhere", "missed", "expired", "stopped", "failed"]) {
    linkCalls({ getCalls: async () => [snapshot({ state: "ended", endReason: reason })] });
    assert.equal((await getCalls())[0].endReason, reason);
  }
});

test("getCalls rejects a snapshot that doesn't match the native contract", async () => {
  const cases = {
    "uppercase id": { id: uuid().toUpperCase() },
    "nil id": { id: NIL },
    "numeric id": { id: 7 },
    "missing liveSessionId": { liveSessionId: undefined },
    "unknown state": { state: "dialing" },
    "string outgoing": { outgoing: "false" },
    "missing hasVideo": { hasVideo: undefined },
    "null muted": { muted: null },
    "routes not an array": { availableAudioRoutes: "speaker" },
    "unknown route": { availableAudioRoutes: ["car"] },
    "invalid alertId": { alertId: "alert" },
    "invalid conversationId": { conversationId: NIL },
    "mediaProfile with a space": { mediaProfile: "AUDIO ONLY" },
    "mediaProfile starting with a digit": { mediaProfile: "1AUDIO" },
    "numeric callerName": { callerName: 5 },
    "negative expiresAtMs": { expiresAtMs: -1 },
    "fractional expiresAtMs": { expiresAtMs: 1.5 },
    "unsafe expiresAtMs": { expiresAtMs: 2 ** 53 },
    "string expiresAtMs": { expiresAtMs: "1791633600000" },
    "ended without a reason": { state: "ended" },
    "a reason before ending": { state: "active", endReason: "hungUp" },
    "unknown endReason": { state: "ended", endReason: "timeout" },
    "invalid serverReason": { state: "ended", endReason: "stopped", serverReason: "answered elsewhere" },
    "unknown audioRoute": { audioRoute: "car" },
  };
  for (const [name, fields] of Object.entries(cases)) {
    linkCalls({ getCalls: async () => [snapshot(), snapshot(fields)] });
    await assert.rejects(getCalls(), MALFORMED_CALLS, name);
  }
  for (const value of [{ calls: [] }, null, [null], [[]], ["call"]]) {
    linkCalls({ getCalls: async () => value });
    await assert.rejects(getCalls(), MALFORMED_CALLS, JSON.stringify(value));
  }
});

test("onCallEvent passes each valid call event to the listener", () => {
  const calls = linkCalls(), seen = [];
  const unsubscribe = onCallEvent(event => seen.push(event));
  const ringing = snapshot();
  for (const type of ["incoming", "outgoing", "answered", "ended", "changed"]) calls.emit("onCallEvent", { type, call: ringing });
  assert.deepEqual(seen.map(event => event.type), ["incoming", "outgoing", "answered", "ended", "changed"]);
  assert.ok(seen.every(event => Object.isFrozen(event) && event.call.id === ringing.id && event.call.expiresAt === ringing.expiresAtMs));
  for (const value of [{ type: "dialed", call: ringing }, { type: "changed", call: { ...ringing, state: "busy" } },
    { type: "changed" }, null, "changed"]) calls.emit("onCallEvent", value);
  assert.equal(seen.length, 5, "malformed events don't reach the listener");
  assert.equal(reported.length, 5);
  assert.ok(reported.every(error => error instanceof TypeError && error.message === "ConvoHopCalls sent a malformed call event"));

  reported.length = 0;
  const failure = new Error("listener failed");
  const removeThrowing = onCallEvent(() => { throw failure; });
  calls.emit("onCallEvent", { type: "changed", call: ringing });
  assert.deepEqual(reported, [failure]);
  assert.equal(seen.length, 6);
  removeThrowing();
  removeThrowing();
  unsubscribe();
  assert.equal(calls.listenerCount("onCallEvent"), 0);
  assert.throws(() => onCallEvent(undefined), { name: "TypeError", message: "listener must be a function" });
});

test("subscribeAnsweredCalls replays answered calls, then delivers each newly answered incoming call once", async () => {
  const connecting = snapshot({ state: "connecting" }), active = snapshot({ state: "active" }), held = snapshot({ state: "held" });
  const current = [connecting, snapshot(), active, snapshot({ state: "ended", endReason: "hungUp" }),
    snapshot({ outgoing: true, state: "active" }), held];
  const calls = linkCalls({ getCalls: async () => current }), answered = [];
  const stop = subscribeAnsweredCalls(found => answered.push(found.id));
  calls.emit("onCallEvent", { type: "answered", call: connecting });
  await turn();
  assert.deepEqual(answered, [connecting.id, active.id, held.id], "an answer that arrives before the replay is delivered once");

  const next = snapshot({ state: "connecting" });
  calls.emit("onCallEvent", { type: "incoming", call: snapshot() });
  calls.emit("onCallEvent", { type: "changed", call: snapshot({ state: "active" }) });
  calls.emit("onCallEvent", { type: "answered", call: next });
  calls.emit("onCallEvent", { type: "answered", call: { ...next, state: "active" } });
  calls.emit("onCallEvent", { type: "answered", call: snapshot({ outgoing: true, state: "connecting" }) });
  assert.deepEqual(answered.slice(3), [next.id]);

  stop();
  stop();
  calls.emit("onCallEvent", { type: "answered", call: snapshot({ state: "connecting" }) });
  assert.equal(answered.length, 4);
  assert.equal(calls.listenerCount("onCallEvent"), 0);
  assert.deepEqual(reported, []);
  assert.throws(() => subscribeAnsweredCalls(null), { name: "TypeError", message: "listener must be a function" });
});

test("subscribeAnsweredCalls reports what it can't deliver and replays nothing once stopped", async () => {
  linkCalls({ getCalls: async () => [snapshot({ state: "active" })] });
  const late = [];
  subscribeAnsweredCalls(found => late.push(found))();
  await turn();
  assert.deepEqual(late, [], "stopping before the replay cancels it");

  const failure = new Error("listener failed"), delivered = [];
  linkCalls({ getCalls: async () => [snapshot({ state: "active" }), snapshot({ state: "held" })] });
  const stop = subscribeAnsweredCalls(found => {
    delivered.push(found.state);
    if (found.state === "active") throw failure;
  });
  await turn();
  assert.deepEqual(delivered, ["active", "held"], "a listener error doesn't stop delivery");
  assert.deepEqual(reported, [failure]);
  stop();

  reported.length = 0;
  for (const getCallsResult of [async () => { throw new Error("getCalls failed"); }, async () => [{}]]) {
    linkCalls({ getCalls: getCallsResult });
    subscribeAnsweredCalls(() => assert.fail("nothing to deliver"))();
  }
  await turn();
  assert.deepEqual(reported.map(error => error.message), ["getCalls failed", "ConvoHopCalls returned malformed calls"]);
});

test("call actions pass a validated call ID to the native module", async () => {
  const actions = { answerCall, endCall, reportConnecting, reportConnected };
  for (const [name, action] of Object.entries(actions)) {
    const calls = linkCalls(), callId = uuid();
    assert.equal(await action(callId), undefined);
    for (const invalid of [callId.toUpperCase(), NIL, "call", undefined]) await assert.rejects(action(invalid), BAD_ID, name);
    assert.deepEqual(calls.log, [[name, callId]]);
    const failure = new Error("No such call");
    linkCalls({ [name]: async () => { throw failure; } });
    await assert.rejects(action(callId), error => error === failure, `${name} passes the native error through`);
  }
});

test("forgetCall resolves whether the ended call was dropped", async () => {
  const callId = uuid();
  const calls = linkCalls({ forgetCall: async id => id === callId });
  assert.equal(await forgetCall(callId), true);
  assert.equal(await forgetCall(uuid()), false);
  await assert.rejects(forgetCall("call"), BAD_ID);
  assert.equal(calls.log.length, 2);
  linkCalls({ forgetCall: async () => "yes" });
  await assert.rejects(forgetCall(callId), { name: "TypeError", message: "ConvoHopCalls returned a malformed result" });
});

test("startOutgoingCall reports a validated outgoing call to CallKit on iOS", async () => {
  const callId = uuid(), liveSessionId = uuid(), conversationId = uuid();
  const calls = linkCalls({ startOutgoingCall: async () => callId });
  assert.equal(await startOutgoingCall({ liveSessionId, conversationId, handle: "ada" }), callId);
  assert.equal(await startOutgoingCall({ liveSessionId, conversationId, handle: "ada", displayName: "Ada Lovelace", hasVideo: true }), callId);
  assert.deepEqual(calls.log, [
    ["startOutgoingCall", { liveSessionId, conversationId, handle: "ada", hasVideo: false }],
    ["startOutgoingCall", { liveSessionId, conversationId, handle: "ada", displayName: "Ada Lovelace", hasVideo: true }],
  ]);

  const valid = { liveSessionId, conversationId, handle: "ada" };
  const text = name => ({ name: "TypeError", message: name + " must be a non-empty string of at most 1024 characters" });
  const cases = [
    [null, { name: "TypeError", message: "request must be an object" }],
    [{ ...valid, liveSessionId: NIL }, { name: "TypeError", message: "liveSessionId must be a lowercase, non-nil UUID" }],
    [{ ...valid, conversationId: conversationId.toUpperCase() }, { name: "TypeError", message: "conversationId must be a lowercase, non-nil UUID" }],
    [{ ...valid, handle: " " }, text("handle")],
    [{ ...valid, handle: "a".repeat(1025) }, text("handle")],
    [{ ...valid, displayName: "" }, text("displayName")],
    [{ ...valid, hasVideo: "yes" }, { name: "TypeError", message: "hasVideo must be a boolean" }],
  ];
  for (const [request, expected] of cases) await assert.rejects(startOutgoingCall(request), expected, JSON.stringify(request));
  assert.equal(calls.log.length, 2, "invalid requests don't reach CallKit");
  assert.equal((await startOutgoingCall({ ...valid, handle: "a".repeat(1024) })), callId);

  linkCalls({ startOutgoingCall: async () => callId.toUpperCase() });
  await assert.rejects(startOutgoingCall(valid), { name: "TypeError", message: "ConvoHopCalls returned a malformed call ID" });
  Platform.OS = "android";
  const android = linkCalls();
  await assert.rejects(startOutgoingCall(valid), { name: "Error", message: "startOutgoingCall is only available on iOS" });
  assert.deepEqual(android.log, []);
});

test("stopRinging, updateCall, setMuted and setHeld validate their arguments", async () => {
  const calls = linkCalls(), callId = uuid();
  for (const reason of ["answered", "declined", "ended", "a".repeat(64), "future_Reason2"]) await stopRinging(callId, reason);
  const badReason = { name: "TypeError", message: "serverReason must be an ASCII letter followed by up to 63 ASCII letters, digits or _" };
  for (const reason of ["", "a".repeat(65), "2fa", "answered-elsewhere", "réponse", 5]) await assert.rejects(stopRinging(callId, reason), badReason);
  await assert.rejects(stopRinging("call", "answered"), BAD_ID);

  await updateCall(callId, {});
  await updateCall(callId, { callerName: undefined, hasVideo: undefined });
  await updateCall(callId, { callerName: "Grace", hasVideo: true });
  await assert.rejects(updateCall(callId, null), { name: "TypeError", message: "update must be an object" });
  await assert.rejects(updateCall(callId, { callerName: "\n" }), { name: "TypeError", message: "callerName must be a non-empty string of at most 1024 characters" });
  await assert.rejects(updateCall(callId, { hasVideo: 1 }), { name: "TypeError", message: "hasVideo must be a boolean" });
  await assert.rejects(updateCall(NIL, {}), BAD_ID);

  await setMuted(callId, true);
  await setHeld(callId, false);
  await assert.rejects(setMuted(callId, "true"), { name: "TypeError", message: "muted must be a boolean" });
  await assert.rejects(setHeld(callId, 0), { name: "TypeError", message: "held must be a boolean" });
  await assert.rejects(setMuted("call", true), BAD_ID);

  assert.deepEqual(calls.log, [
    ["stopRinging", callId, "answered"], ["stopRinging", callId, "declined"], ["stopRinging", callId, "ended"],
    ["stopRinging", callId, "a".repeat(64)], ["stopRinging", callId, "future_Reason2"],
    ["updateCall", callId, {}], ["updateCall", callId, {}], ["updateCall", callId, { callerName: "Grace", hasVideo: true }],
    ["setMuted", callId, true], ["setHeld", callId, false],
  ]);
});

test("Android-only call controls check the platform and their arguments", async () => {
  const callId = uuid();
  let calls = linkCalls();
  await assert.rejects(setAudioRoute(callId, "speaker"), { name: "Error", message: "setAudioRoute is only available on Android" });
  await assert.rejects(openFullScreenIntentSettings(), { name: "Error", message: "openFullScreenIntentSettings is only available on Android" });
  assert.equal(await canUseFullScreenIntent(), true, "iOS always rings full screen");
  assert.deepEqual(calls.log, [["canUseFullScreenIntent"]]);

  Platform.OS = "android";
  calls = linkCalls({ canUseFullScreenIntent: async () => false });
  for (const route of ["earpiece", "speaker", "bluetooth", "wiredHeadset", "streaming"]) await setAudioRoute(callId, route);
  for (const route of ["unknown", "car", undefined]) await assert.rejects(setAudioRoute(callId, route), { name: "TypeError", message: "route must be a known audio route" });
  await assert.rejects(setAudioRoute("call", "speaker"), BAD_ID);
  assert.equal(await canUseFullScreenIntent(), false, "Android 14 lets users deny full-screen calls");
  await openFullScreenIntentSettings();
  assert.deepEqual(calls.log, [
    ...["earpiece", "speaker", "bluetooth", "wiredHeadset", "streaming"].map(route => ["setAudioRoute", callId, route]),
    ["canUseFullScreenIntent"], ["openFullScreenIntentSettings"],
  ]);
  linkCalls({ canUseFullScreenIntent: async () => "denied" });
  await assert.rejects(canUseFullScreenIntent(), { name: "TypeError", message: "ConvoHopCalls returned a malformed result" });
});
