import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test, type TestContext } from "node:test";
import { createAsyncStorage } from "@react-native-async-storage/async-storage";
import type { ConvoHopClient } from "@convohop/client";
import { parsePushPayload, type MessagePushNotification } from "@convohop/client/push";
import { connectUser } from "../src/client.ts";
import { allowNotifications, messageText, openNotifications, startPush, stopPush } from "../src/push.ts";
import { bootstrapUser, connect, createConversation, startAppBackend, type ServerConfig } from "./backend.ts";
import { startMock, type MockTarget } from "./mock.ts";
import { native, onAndroid, type FakeModule } from "./native.ts";
import { pushVectors } from "./vectors.ts";

// Registrations as the native modules report them. Tokens address a device, so these are made up.
const apns = { kind: "apns", token: "a1".repeat(32) };
const apnsVoip = { kind: "apnsVoip", token: "b2".repeat(32) };
const fcmToken = { kind: "fcm", token: "dGVzdA:APA91bH-token_value" };
const fcmFid = { kind: "fcm", fid: "dBq3s1Fa-7xN_mk2Lp0QzW" };

const vectors = await pushVectors();
let target: MockTarget;
let config: ServerConfig;

before(async () => {
  target = await startMock();
  const { communicationUrl, projectId, incarnation, credentials } = target.descriptor;
  config = { baseUrl: communicationUrl, projectId, incarnation, backendKey: credentials.backend };
});
after(() => target.close());

// A signed-in user's client on a new install.
async function signIn(): Promise<ConvoHopClient> {
  const login = await bootstrapUser(await connect(config), config, `user-${randomUUID()}`, randomUUID());
  return connectUser(login, createAsyncStorage(randomUUID()));
}

// Your backend's push endpoint, closed when the test ends. reject answers each request with HTTP 503 when it's true.
async function appBackend(t: TestContext, reject: (method: string) => boolean = () => false) {
  const backend = await startAppBackend(({ method }) => ({ status: reject(method) ? 503 : 204 }));
  t.after(() => backend.close());
  // The registrations that the samples sent, once there are count of them.
  const sent = async (count: number) => {
    for (const deadline = Date.now() + 5000; backend.requests.length < count;) {
      assert.ok(Date.now() < deadline, `your backend got ${backend.requests.length} of ${count} requests`);
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    return backend.requests.map(({ method, path, authorization, body }) => {
      assert.equal(path, "/push-registrations");
      assert.equal(authorization, `Bearer ${backend.appToken}`);
      return [method, body];
    });
  };
  return { backend, sent };
}

const recipient = (client: ConvoHopClient) => ({ projectId: client.projectId, recipientId: client.principalId });
const methods = (module: FakeModule) => module.log.map(([method]) => method);

type Ids = Partial<Record<"projectId" | "recipientId" | "conversationId" | "senderId" | "messageId", string>>;

// The FCM data that a push payload vector expects for its event, readdressed with ids. Android's native code passes
// pushes to JavaScript in this form.
function fcmData(vectorId: string, ids: Ids): { convohop: string } {
  const vector = vectors.find(({ id }) => id === vectorId);
  const data = (vector?.expected.fcm?.request as { message: { data: { convohop: string } } } | undefined)?.message.data;
  assert.ok(data, `vector ${vectorId} has FCM data`);
  return { convohop: JSON.stringify({ ...JSON.parse(data.convohop), ...ids }) };
}

function messagePush(vectorId: string, ids: Ids): MessagePushNotification {
  const notification = parsePushPayload(fcmData(vectorId, ids));
  assert.equal(notification.eventType, "notification.message");
  return notification as MessagePushNotification;
}

test("startPush stores the APNs and PushKit tokens with your backend on iOS", async t => {
  const client = await signIn();
  const { backend, sent } = await appBackend(t);
  const push = native.linkPush({ getRegistrations: async () => [apns] });
  native.linkCalls({ getVoipToken: async () => apnsVoip });

  const started = startPush(client, backend);
  assert.equal(await started.registered, true);
  assert.deepEqual(await sent(2), [["POST", apns], ["POST", apnsVoip]]);
  // The device learned whose pushes to show before it registered.
  assert.deepEqual(push.log.slice(0, 1), [["setRecipient", recipient(client)]]);
  assert.deepEqual(methods(push), ["setRecipient", "getRegistrations", "register"]);

  await started.stop();
  // A token that APNs issues after push stopped stays off your backend.
  push.emit("onPushRegistration", { kind: "apns", token: "c3".repeat(32) });
  await native.turn();
  assert.equal(backend.requests.length, 2);
  assert.equal(push.listenerCount("onPushRegistration"), 0);
});

test("startPush stores the FCM token on Android, and deletes one that FCM ended", async t => {
  await onAndroid(async () => {
    const client = await signIn();
    const { backend, sent } = await appBackend(t);
    const push = native.linkPush({ getRegistrations: async () => [fcmToken] });

    const started = startPush(client, backend);
    assert.equal(await started.registered, true);
    push.emit("onPushUnregistration", fcmToken);
    assert.deepEqual(await sent(2), [["POST", fcmToken], ["DELETE", fcmToken]]);
    await started.stop();
  });
});

test("startPush stores the FID on Android when the app registers by FID", async t => {
  await onAndroid(async () => {
    const client = await signIn();
    const { backend, sent } = await appBackend(t);
    // Firebase reports the FID once FCM registered it, after register() returned.
    const push: FakeModule = native.linkPush({
      register: async () => void setImmediate(() => push.emit("onPushRegistration", fcmFid)),
    });

    const started = startPush(client, backend);
    assert.equal(await started.registered, true);
    assert.deepEqual(await sent(1), [["POST", fcmFid]]);
    await started.stop();
  });
});

test("startPush lets the app run without pushes when your backend can't store the registration", async t => {
  const warn = t.mock.method(console, "warn", () => {});
  const client = await signIn();
  const { backend, sent } = await appBackend(t, () => true);
  native.linkPush({ getRegistrations: async () => [apns] });
  native.linkCalls();

  const started = startPush(client, backend);
  assert.equal(await started.registered, false);
  assert.deepEqual(await sent(1), [["POST", apns]]);
  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0]?.arguments[1]), /HTTP 503/);
  await started.stop();
});

test("signing out while push starts registers nothing, and the device accepts no pushes", async t => {
  const warn = t.mock.method(console, "warn", () => {});
  const client = await signIn();
  const { backend } = await appBackend(t);
  const recipientSet = Promise.withResolvers<void>();
  const push = native.linkPush({
    setRecipient: async (value: unknown) => {
      if (value !== null) await recipientSet.promise;
    },
  });
  native.linkCalls();

  const started = startPush(client, backend);
  const steps: string[] = [];
  const stopped = stopPush(started).then(() => steps.push("signed out")); // The user signed out at once.
  await native.turn();
  steps.push("recipient set");
  recipientSet.resolve();
  await stopped;
  assert.deepEqual(steps, ["recipient set", "signed out"]); // stopPush waited until registering stopped.
  assert.equal(await started.registered, false);
  assert.deepEqual(push.log, [["setRecipient", recipient(client)], ["setRecipient", null]]);
  assert.equal(backend.requests.length, 0);
  assert.equal(warn.mock.callCount(), 0);
});

test("allowNotifications is true when the user allows notifications, quietly or not", async () => {
  for (const [answer, allowed] of [["granted", true], ["provisional", true], ["denied", false]] as const) {
    const push = native.linkPush({ requestPermission: async () => answer });
    assert.equal(await allowNotifications(), allowed);
    assert.deepEqual(push.log, [["requestPermission", { alert: true, badge: true, sound: true, provisional: false }]]);
  }
});

test("openNotifications opens what the user taps, and the notification that launched the app", async () => {
  const client = await signIn();
  const user = recipient(client);
  const [launched, message, call, missed] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const event = (action: string, vectorId: string, ids: Ids) => ({ action, payload: JSON.stringify(fcmData(vectorId, ids)) });
  const push = native.linkPush({
    takeInitialNotification: async () => event("opened", "message-metadata-only", { ...user, conversationId: launched }),
  });
  const opened: string[] = [];

  const stop = openNotifications(client, conversationId => opened.push(conversationId));
  await native.turn();
  push.emit("onNotification", event("opened", "message-metadata-only", { ...user, conversationId: message }));
  push.emit("onNotification", event("opened", "call-incoming", { ...user, conversationId: call }));
  push.emit("onNotification", event("opened", "cancel-expired", { ...user, conversationId: missed }));
  // Not opened: a push that arrived while the app ran, and pushes for another user or project.
  push.emit("onNotification", event("received", "message-metadata-only", { ...user, conversationId: randomUUID() }));
  push.emit("onNotification", event("opened", "message-metadata-only", { ...user, recipientId: randomUUID() }));
  push.emit("onNotification", event("opened", "message-metadata-only", { ...user, projectId: randomUUID() }));
  assert.deepEqual(opened, [launched, message, call, missed]);

  stop();
  assert.equal(push.listenerCount("onNotification"), 0);
});

test("openNotifications opens nothing once it stopped", async () => {
  const client = await signIn();
  const launch = Promise.withResolvers<unknown>();
  native.linkPush({ takeInitialNotification: () => launch.promise });
  const opened: string[] = [];

  const stop = openNotifications(client, conversationId => opened.push(conversationId));
  stop(); // The user signed out before the platform reported the notification that launched the app.
  launch.resolve({ action: "opened", payload: JSON.stringify(fcmData("message-metadata-only", recipient(client))) });
  await native.turn();
  assert.deepEqual(opened, []);
});

test("messageText reads the message when the push has no text", async () => {
  const server = await connect(config);
  const [aliceLogin, bobLogin] = await Promise.all([
    bootstrapUser(server, config, `alice-${randomUUID()}`, randomUUID()),
    bootstrapUser(server, config, `bob-${randomUUID()}`, randomUUID()),
  ]);
  const members = [aliceLogin.session.principalId, bobLogin.session.principalId];
  const conversationId = await createConversation(server, "Push", members, randomUUID());
  const [alice, bob] = await Promise.all([
    connectUser(aliceLogin, createAsyncStorage(randomUUID())),
    connectUser(bobLogin, createAsyncStorage(randomUUID())),
  ]);
  const { messageId } = await alice.send(conversationId, "Lunch at noon?", randomUUID());
  const ids = { ...recipient(bob), conversationId, senderId: alice.principalId, messageId };

  assert.equal(await messageText(bob, messagePush("message-metadata-only", ids)), "Lunch at noon?");
  // With a preview, the push's own text, without reading a message. This one doesn't exist.
  const preview = messagePush("message-preview", { ...ids, messageId: randomUUID() });
  assert.ok(preview.body);
  assert.equal(await messageText(bob, preview), preview.body);
});

test("stopPush on iOS stops registering and drops the user's pushes", async t => {
  const client = await signIn();
  const { backend, sent } = await appBackend(t);
  const push = native.linkPush({ getRegistrations: async () => [apns] });
  native.linkCalls({ getVoipToken: async () => apnsVoip });
  const started = startPush(client, backend);
  await sent(2);

  await stopPush(started);
  // iOS can't unregister, and your backend's sign-out deletes the tokens.
  assert.deepEqual(methods(push), ["setRecipient", "getRegistrations", "register", "setRecipient"]);
  assert.deepEqual(push.log.at(-1), ["setRecipient", null]);
  assert.equal(push.listenerCount("onPushRegistration"), 0);
  assert.equal(backend.requests.length, 2);
});

test("stopPush on Android also unregisters the device from FCM", async t => {
  await onAndroid(async () => {
    const client = await signIn();
    const { backend, sent } = await appBackend(t);
    const push = native.linkPush({ getRegistrations: async () => [fcmToken], unregister: async () => fcmToken });
    const started = startPush(client, backend);
    await started.registered;

    await stopPush(started);
    assert.deepEqual(push.log.slice(-2), [["setRecipient", null], ["unregister"]]);
    assert.deepEqual(await sent(1), [["POST", fcmToken]]); // Your backend's sign-out deletes the registration.
  });
});

test("stopPush takes every step and lets the user sign out when one fails", async t => {
  const warn = t.mock.method(console, "warn", () => {});
  await onAndroid(async () => {
    const client = await signIn();
    const { backend } = await appBackend(t);
    const push = native.linkPush({
      getRegistrations: async () => [fcmToken],
      setRecipient: async (value: unknown) => {
        if (value === null) throw new Error("The device couldn't save the recipient");
      },
      unregister: async () => {
        throw new Error("FCM couldn't be reached");
      },
    });
    const started = startPush(client, backend);
    await started.registered;

    await stopPush(started);
    assert.deepEqual(push.log.slice(-2), [["setRecipient", null], ["unregister"]]);
    assert.deepEqual(warn.mock.calls.map(({ arguments: [, error] }) => String(error)), [
      "Error: The device couldn't save the recipient",
      "Error: FCM couldn't be reached",
    ]);
  });
});
