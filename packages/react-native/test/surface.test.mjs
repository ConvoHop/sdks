import test from "node:test";
import assert from "node:assert/strict";
import { registrations } from "@livekit/react-native";
import { Platform } from "react-native";
import * as sdk from "@convohop/react-native";
import * as media from "@convohop/react-native/media";

// No native module is linked in this file, as in an app that installed the package without rebuilding.
const notLinked = name => ({ name: "Error", message: `The ${name} native module is not linked. @convohop/react-native ` +
  "needs React Native 0.76 or later with the New Architecture; rebuild the app after installing it." });

test("the package exports the platform, push and calls API, and LiveKit media only from ./media", () => {
  assert.deepEqual(Object.keys(sdk).sort(), [
    "answerCall", "canUseFullScreenIntent", "createPlatform", "endCall", "forgetCall", "getCalls", "getPushPermission",
    "getPushRegistrations", "handleRemoteMessage", "onCallEvent", "onNotification", "openFullScreenIntentSettings",
    "registerForPush", "reportConnected", "reportConnecting", "requestPushPermission", "setAudioRoute", "setHeld",
    "setMuted", "setPushRecipient", "startOutgoingCall", "stopRinging", "subscribeAnsweredCalls", "takeInitialNotification",
    "unregisterFromPush", "updateCall", "watchRingingCalls",
  ]);
  assert.deepEqual(Object.keys(media).sort(), ["createRoom", "createRoomConnector", "setupMedia"]);
});

test("without the native modules the package still loads, and each module's first use names the one missing", async () => {
  const platform = sdk.createPlatform();
  assert.throws(() => platform.randomUUID(), notLinked("ConvoHopPlatform"));
  platform.dispose();
  await assert.rejects(sdk.getPushPermission(), notLinked("ConvoHopPush"));
  await assert.rejects(sdk.registerForPush({ register: async () => {} }), notLinked("ConvoHopPush"));
  await assert.rejects(sdk.setPushRecipient(null), notLinked("ConvoHopPush"));
  assert.throws(() => sdk.onNotification(() => {}), notLinked("ConvoHopPush"));
  await assert.rejects(sdk.getCalls(), notLinked("ConvoHopCalls"));
  assert.throws(() => sdk.onCallEvent(() => {}), notLinked("ConvoHopCalls"));
  assert.throws(() => sdk.subscribeAnsweredCalls(() => {}), notLinked("ConvoHopCalls"));
  const client = { liveAlerts: { list: async () => ({}) }, liveSession: async () => ({}) };
  assert.throws(() => sdk.watchRingingCalls(client), notLinked("ConvoHopCalls"));
});

test("setupMedia with CallKit needs ConvoHopCalls on iOS before it installs anything, and doesn't on Android", () => {
  Platform.OS = "ios";
  assert.throws(() => media.setupMedia({ callKit: true }), notLinked("ConvoHopCalls"));
  assert.deepEqual(registrations, []);
  assert.throws(() => media.createRoom(), { message: "Call setupMedia() in index.js before creating a room" });
  Platform.OS = "android";
  media.setupMedia({ callKit: true });
  assert.deepEqual(registrations.map(({ options }) => options), [{ autoConfigureAudioSession: true }]);
  assert.equal(media.createRoom().state, "disconnected");
});
