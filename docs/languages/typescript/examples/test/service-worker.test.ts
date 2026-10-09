import assert from "node:assert/strict";
import { test } from "node:test";
import { pushVectors } from "./vectors.ts";

// The service worker's global scope, as far as the sample uses it. It records listeners, notifications and windows.
type Listener = (event: object) => void;
const listeners = new Map<string, Listener>();
const shown: Array<{ title: string; options: NotificationOptions }> = [];
const opened: string[] = [];
const scope = {
  registration: {
    showNotification: async (title: string, options: NotificationOptions = {}) => void shown.push({ title, options }),
  },
  clients: {
    matchAll: async () => [],
    openWindow: async (url: string) => void opened.push(url),
  },
  addEventListener: (type: string, listener: Listener) => void listeners.set(type, listener),
};
Object.assign(globalThis, { self: scope, location: new URL("https://app.example/service-worker.js") });
// Not a literal specifier: the worker compiles with the WebWorker library, in tsconfig.worker.json.
await import(new URL("../src/service-worker.ts", import.meta.url).href);

// Dispatches an event as the browser does, and waits for the work that the listener added to it.
async function dispatch(type: string, event: object): Promise<void> {
  const work: Promise<unknown>[] = [];
  const listener = listeners.get(type);
  assert.ok(listener, `the service worker listens for ${type}`);
  listener({ ...event, waitUntil: (promise: Promise<unknown>) => void work.push(promise) });
  await Promise.all(work);
}

async function push(payload: unknown): Promise<{ title: string; options: NotificationOptions }> {
  shown.length = 0;
  await dispatch("push", { data: { json: () => payload } });
  assert.equal(shown.length, 1, "every push shows one notification");
  return shown[0]!;
}

async function click(options: NotificationOptions): Promise<{ opened: string[]; closed: boolean }> {
  opened.length = 0;
  let closed = false;
  const notification = { data: options.data, tag: options.tag ?? "", close: () => void (closed = true) };
  await dispatch("notificationclick", { notification, action: "" });
  return { opened: [...opened], closed };
}

type Notification = Record<string, unknown> & { eventId: string; eventType: string; conversationId: string };
const webPushes = (await pushVectors()).flatMap(vector => {
  const request = vector.expected.webPush?.request as { payload: { convohop: Notification } } | undefined;
  return request ? [{ id: vector.id, payload: request.payload }] : [];
});

test("the service worker shows one notification for every Web Push request, tagged so it replaces earlier ones", async () => {
  assert.ok(webPushes.length > 0);
  for (const { id, payload } of webPushes) {
    const { title, options } = await push(payload);
    const notification = payload.convohop;
    const tag = notification.eventType === "notification.message"
      ? notification.messageId
      : String(notification.alertId).replaceAll("-", "");
    assert.equal(options.tag, tag, id);
    assert.equal((options.data as { convohop: Notification }).convohop.eventId, notification.eventId, id);
    if (typeof notification.title === "string") assert.equal(title, notification.title, id);
  }
});

test("clicking a notification opens its conversation", async () => {
  const { payload } = webPushes.find(vector => vector.payload.convohop.eventType === "notification.message")!;
  const { options } = await push(payload);
  assert.deepEqual(await click(options), {
    opened: [`https://app.example/conversations/${payload.convohop.conversationId}`],
    closed: true,
  });
});

test("a push that isn't a ConvoHop notification still shows one, which opens the app", async () => {
  for (const data of [{ json: () => ({ app: "Your own push" }) }, null]) {
    shown.length = 0;
    await dispatch("push", { data });
    assert.deepEqual(shown, [{ title: "New activity", options: { tag: "app-activity" } }]);
  }
  assert.deepEqual(await click(shown[0]!.options), { opened: ["/"], closed: true });
});
