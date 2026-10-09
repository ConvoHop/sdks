// The Web client in real browser engines (Chromium, Firefox and WebKit through Playwright) against the deterministic
// mock. The page loads the built packages as native ES modules and holds only a user's session token: Node creates
// the users and the conversation with a backend key, as an app's own backend would. Covered: sending and following a
// conversation over fetch and graphql-transport-ws, holding sends while the browser is offline, keeping unsent
// messages in localStorage across a reload and in each tab's own slot, an open tab taking over what a closed tab left
// and, in Chromium, which can deliver a push through DevTools, showing the shared push vectors from a module service
// worker. Real media needs a LiveKit server, which the mock doesn't have.
// BROWSERS selects engines, for example BROWSERS=chromium.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { isDeepStrictEqual } from "node:util";
import { ConvoHopClient } from "@convohop/client";
import { ProjectServerClient } from "@convohop/server";
import { chromium, firefox, webkit } from "playwright";
import { ControlClient } from "../lib/control.mjs";
import { PUSH_VECTOR_FILE } from "../lib/push-vectors.mjs";
import { startMockTarget } from "../mock/server.mjs";
import { startPageServer } from "./server.mjs";

// The full Chromium build in headless mode, rather than the headless shell, so notifications work as in Chrome.
const engines = { chromium: [chromium, { channel: "chromium" }], firefox: [firefox, {}], webkit: [webkit, {}] };
const names = (process.env.BROWSERS ?? Object.keys(engines).join(",")).split(",").map(name => name.trim()).filter(Boolean);
for (const name of names) {
  if (!Object.hasOwn(engines, name)) throw new Error(`Unknown browser "${name}" in BROWSERS; use chromium, firefox or webkit`);
}
const limit = { timeout: 60_000 };

let mock, control, site;
before(async () => {
  mock = await startMockTarget({ seed: "browser" });
  control = new ControlClient(mock.descriptor.control);
  site = await startPageServer(mock.descriptor.communicationUrl);
}, limit);
after(async () => { await site?.close(); await mock?.close(); });
beforeEach(() => control.reset());

/** Creates two users in a conversation and returns what each user's app would get from its backend. */
async function conversation() {
  const { communicationUrl: baseUrl, projectId, incarnation, credentials } = mock.descriptor;
  const backend = new ProjectServerClient({ baseUrl, projectId, incarnation, backendKey: credentials.backend });
  await backend.initialize();
  const users = [];
  for (const name of ["alice", "bob"]) {
    const principalId = await backend.createPrincipal(`${name}-${randomUUID()}`);
    const { sessionToken } = await backend.issueSession(principalId, randomUUID());
    users.push({ projectId, incarnation, principalId, sessionToken });
  }
  const { conversationId } = await backend.createConversation("Browser",
    users.map(({ principalId }) => ({ principalId, role: "member" })));
  return { conversationId, alice: users[0], bob: users[1] };
}

/** The sendMessage requests the mock received for one outbox entry. */
async function sends(requestId) {
  const { entries } = await (await fetch(`${mock.descriptor.control}/log`)).json();
  return entries.filter(entry => entry.kind === "request" && entry.field === "sendMessage" && entry.requestId === requestId);
}

/** A new tab on the test page. Its uncaught errors collect in `errors`. */
async function openPage(context) {
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${site.origin}/`);
  await page.waitForFunction(() => window.harness !== undefined);
  return { page, errors };
}

/** Opens the conversation in the page as `user`, with the harness's `persist` and `held` options. */
function join(page, user, conversationId, options = {}) {
  return page.evaluate(options => window.harness.open(options), { ...user, conversationId, ...options });
}

/** Waits until `check(arg)` holds in the page and returns the page's view; a timeout reports the last view. */
async function until(page, check, arg) {
  try {
    await page.waitForFunction(check, arg, { timeout: 15_000, polling: 50 });
  } catch (error) {
    const view = await page.evaluate(() => window.harness.view()).catch(cause => `unavailable: ${cause.message}`);
    throw new Error(`${error.message.split("\n")[0]}; last view ${JSON.stringify(view)}`, { cause: error });
  }
  return page.evaluate(() => window.harness.view());
}

/** Whether the page shows `text` as a loaded message and has nothing left to send. */
function delivered(text) {
  const view = window.harness.view();
  return view.pending.length === 0 && view.messages.some(message => message.text === text);
}

for (const name of names) {
  describe(`the Web client in ${name}`, () => {
    const [engine, options] = engines[name];
    let browser;
    before(async () => { browser = await engine.launch(options); }, limit);
    after(() => browser?.close());

    /** A context per test is a fresh profile: no storage, cookies or service workers from earlier tests. */
    async function newContext(t) {
      const context = await browser.newContext();
      t.after(() => context.close());
      return context;
    }

    test("sends once and follows another member's messages over fetch and WebSocket", limit, async t => {
      const { conversationId, alice, bob } = await conversation();
      const { page, errors } = await openPage(await newContext(t));
      await join(page, alice, conversationId);
      const requestId = await page.evaluate(text => window.harness.send(text), "Hello from the browser");
      await until(page, delivered, "Hello from the browser");

      const other = new ConvoHopClient({ baseUrl: mock.descriptor.communicationUrl, ...bob });
      await other.send(conversationId, "Hello from Node");
      const view = await until(page, text => window.harness.view().messages.some(message => message.text === text),
        "Hello from Node");
      assert.deepEqual(view.messages, [
        { text: "Hello from the browser", authorId: alice.principalId },
        { text: "Hello from Node", authorId: bob.principalId },
      ]);
      assert.equal(view.status, "live");
      assert.deepEqual(view.errors, []);
      assert.equal((await sends(requestId)).length, 1);
      assert.deepEqual(errors, []);
    });

    test("holds a send while the browser is offline and sends it once when it's back", limit, async t => {
      const { conversationId, alice } = await conversation();
      const context = await newContext(t);
      const { page, errors } = await openPage(context);
      await join(page, alice, conversationId);
      await context.setOffline(true);
      await until(page, () => !navigator.onLine);
      const requestId = await page.evaluate(text => window.harness.send(text), "Written offline");
      await page.waitForTimeout(300);
      assert.deepEqual((await page.evaluate(() => window.harness.view())).pending, [{ requestId, status: "queued" }]);
      assert.deepEqual(await sends(requestId), []);

      await context.setOffline(false);
      await until(page, delivered, "Written offline");
      assert.equal((await sends(requestId)).length, 1);
      assert.deepEqual(errors, []);
    });

    test("keeps an unsent message in localStorage across a reload and sends it once", limit, async t => {
      const { conversationId, alice } = await conversation();
      const context = await newContext(t);
      const key = `convohop.outbox:${alice.projectId}:${alice.principalId}`;
      const first = await openPage(context);
      await join(first.page, alice, conversationId, { persist: true });
      await context.setOffline(true);
      await until(first.page, () => !navigator.onLine);
      const requestId = await first.page.evaluate(text => window.harness.send(text), "Written before a reload");
      const saved = await first.page.evaluate(key => localStorage.getItem(key), key);
      assert.ok(saved?.includes(requestId), `localStorage should hold the unsent message, has ${saved}`);
      await first.page.close();

      await context.setOffline(false);
      const second = await openPage(context);
      await join(second.page, alice, conversationId, { persist: true });
      const view = await until(second.page, delivered, "Written before a reload");
      await until(second.page, key => localStorage.getItem(key) === null, key);
      assert.equal((await sends(requestId)).length, 1);
      assert.deepEqual(view.errors, []);
      assert.deepEqual([...first.errors, ...second.errors], []);
    });

    test("tabs keep their own unsent messages, and an open tab takes over what a closed tab left", limit, async t => {
      const { conversationId, alice, bob } = await conversation();
      const context = await newContext(t);
      const base = `convohop.outbox:${alice.projectId}:${alice.principalId}`;
      /** Asserts the texts in each of the user's outbox slots in localStorage, by key suffix, once the page sees them. */
      async function slots(page, expected, message) {
        const read = () => page.evaluate(base => Object.fromEntries(Object.keys(localStorage).sort()
          .filter(key => key === base || key.startsWith(`${base}:`))
          .map(key => [key.slice(base.length), JSON.parse(localStorage.getItem(key)).map(entry => entry.text)])), base);
        // Another tab's writes reach a page's localStorage asynchronously.
        let found = await read();
        for (const deadline = Date.now() + 15_000; !isDeepStrictEqual(found, expected) && Date.now() < deadline;) {
          await delay(50);
          found = await read();
        }
        assert.deepEqual(found, expected, message);
      }
      /** In the page: whether its outbox holds `count` entries and the slot `base + key` is gone. */
      const took = ({ base, key, count }) => window.harness.view().outbox.length === count && localStorage.getItem(base + key) === null;
      // Chromium can put a tab of an offline context back online when another tab closes, so these tabs hold their
      // sends through the outbox's connectivity rather than the browser's offline mode.
      const held = { persist: true, held: true };
      const a = await openPage(context), b = await openPage(context);
      await join(a.page, alice, conversationId, held);
      await join(b.page, alice, conversationId, held);
      const fromA = await a.page.evaluate(text => window.harness.send(text), "Written in tab A");
      const fromB = await b.page.evaluate(text => window.harness.send(text), "Written in tab B");
      await slots(a.page, { "": ["Written in tab A"], ":1": ["Written in tab B"] }, "each tab saves its own");

      await b.page.close();
      await until(a.page, took, { base, key: ":1", count: 2 });
      await slots(a.page, { "": ["Written in tab A", "Written in tab B"] }, "the older tab takes over");

      const c = await openPage(context);
      await join(c.page, alice, undefined, held);
      await a.page.close();
      await until(c.page, took, { base, key: "", count: 2 });
      await slots(c.page, { ":1": ["Written in tab A", "Written in tab B"] }, "a newer tab takes over");
      assert.deepEqual([(await sends(fromA)).length, (await sends(fromB)).length], [0, 0], "held tabs send nothing");

      await c.page.evaluate(() => window.harness.resume());
      const view = await until(c.page, () => window.harness.view().outbox.every(entry => entry.status === "sent"));
      assert.deepEqual(view.outbox.map(entry => entry.requestId), [fromA, fromB]);
      await until(c.page, prefix => !Object.keys(localStorage).some(key => key.startsWith(prefix)), base);
      assert.deepEqual([(await sends(fromA)).length, (await sends(fromB)).length], [1, 1]);
      const reader = new ConvoHopClient({ baseUrl: mock.descriptor.communicationUrl, ...bob });
      assert.deepEqual((await reader.messages(conversationId)).items.map(message => message.text).sort(),
        ["Written in tab A", "Written in tab B"]);
      assert.deepEqual(view.errors, []);
      assert.deepEqual([...a.errors, ...b.errors, ...c.errors], []);
    });
  });
}

describe("Web Push in a Chromium service worker", { skip: !names.includes("chromium") && "BROWSERS excludes chromium" }, () => {
  let browser, vectors;
  before(async () => {
    browser = await chromium.launch(engines.chromium[1]);
    const file = JSON.parse(await readFile(PUSH_VECTOR_FILE, "utf8"));
    vectors = new Map(file.vectors.map(vector => [vector.id, vector]));
  }, limit);
  after(() => browser?.close());

  /** The Web Push payload of a shared vector. */
  const payload = id => structuredClone(vectors.get(id).expected.webPush.request.payload);

  /**
   * Registers the test page's module service worker in a fresh profile that allows notifications. `push` delivers a
   * payload through DevTools, as a push service would, and waits until the worker has handled it; `shown` then waits
   * until the shown notifications satisfy `check`. Notifications are read only between pushes, because Chromium's
   * getNotifications() deletes a notification that it reads before the notification is on display.
   */
  async function serviceWorker(t) {
    const context = await browser.newContext();
    t.after(() => context.close());
    await context.grantPermissions(["notifications"], { origin: site.origin });
    const { page, errors } = await openPage(context);
    const cdp = await context.newCDPSession(page);
    const registered = new Promise(resolve => cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
      const registration = registrations.find(item => item.scopeURL === `${site.origin}/` && !item.isDeleted);
      if (registration) resolve(registration.registrationId);
    }));
    await cdp.send("ServiceWorker.enable");
    await page.evaluate(async () => {
      window.pushesHandled = 0;
      navigator.serviceWorker.addEventListener("message", event => { if (event.data === "push handled") window.pushesHandled++; });
      navigator.serviceWorker.startMessages();
      await navigator.serviceWorker.register("/sw.js", { type: "module" });
      await navigator.serviceWorker.ready;
    });
    const registrationId = await registered;
    const notifications = () => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return (await registration.getNotifications()).map(({ title, body, tag, requireInteraction, silent, data }) =>
        ({ title, body, tag, requireInteraction, silent, data }));
    });
    return {
      errors,
      async push(data) {
        const handled = await page.evaluate(() => window.pushesHandled);
        await cdp.send("ServiceWorker.deliverPushMessage", { origin: site.origin, registrationId, data });
        try {
          await page.waitForFunction(count => window.pushesHandled > count, handled, { timeout: 15_000, polling: 50 });
        } catch (error) {
          throw new Error(`the service worker didn't handle the push: ${error.message.split("\n")[0]}`, { cause: error });
        }
      },
      async shown(check) {
        for (const deadline = Date.now() + 15_000; ;) {
          const list = await notifications();
          if (check(list)) return list;
          if (Date.now() > deadline) throw new Error(`timed out; notifications shown ${JSON.stringify(list)}`);
          await delay(50);
        }
      },
    };
  }

  test("shows a message with your backend's text, and replaces it silently when the push repeats", limit, async t => {
    const worker = await serviceWorker(t);
    const message = payload("message-preview");
    await worker.push(JSON.stringify(message));
    const [first] = await worker.shown(list => list.length === 1);
    assert.deepEqual(first, { title: message.convohop.title, body: message.convohop.body, tag: message.convohop.messageId,
      requireInteraction: false, silent: first.silent, data: { convohop: message.convohop } });
    assert.notEqual(first.silent, true);

    await worker.push(JSON.stringify(message));
    const [repeated] = await worker.shown(list => list.length === 1 && list[0].silent === true);
    assert.equal(repeated.tag, message.convohop.messageId);
    assert.deepEqual(worker.errors, []);
  });

  test("rings until the call's cancellation replaces the ring", limit, async t => {
    const worker = await serviceWorker(t);
    // The vector's ring expires at a fixed time; this one rings for five minutes from now.
    const call = payload("call-incoming");
    call.convohop.expiresAt = new Date(Date.now() + 5 * 60_000).toISOString().replace(/\.\d+Z$/, "Z");
    const tag = call.convohop.alertId.replaceAll("-", "");
    await worker.push(JSON.stringify(call));
    const [ring] = await worker.shown(list => list.length === 1);
    assert.deepEqual([ring.title, ring.tag, ring.requireInteraction], [call.convohop.title, tag, true]);
    assert.notEqual(ring.silent, true);

    const answered = payload("cancel-answered");
    assert.equal(answered.convohop.alertId, call.convohop.alertId);
    await worker.push(JSON.stringify(answered));
    const [stopped] = await worker.shown(list => list.length === 1 && list[0].silent === true);
    assert.deepEqual([stopped.tag, stopped.requireInteraction, stopped.data.convohop.eventType],
      [tag, false, "notification.callCancelled"]);
    assert.deepEqual(worker.errors, []);
  });

  test("passes a push that isn't a ConvoHop notification to onError", limit, async t => {
    const worker = await serviceWorker(t);
    await worker.push("not JSON");
    await worker.shown(list => list.length === 1 && list[0].tag === "push-error");
    await worker.push(JSON.stringify({ greeting: "hello" }));
    const [error] = await worker.shown(list => list.length === 1 && /^Push notification eventType/.test(list[0].body));
    assert.equal(error.tag, "push-error");
    assert.deepEqual(worker.errors, []);
  });
});
