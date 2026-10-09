// The React hooks against the deterministic mock, over real HTTP and graphql-transport-ws. Each user's component
// tree renders in StrictMode with react-test-renderer, which needs no DOM, like React Native, so every effect mounts,
// unmounts and mounts again over the wire. Any error React logs, such as an update outside act(), fails the test.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { StrictMode, createElement, version } from "react";
import { act, create } from "react-test-renderer";
import { ConvoHopClient, Outbox } from "@convohop/client";
import { ConvoHopProvider, useConversation, useOutbox } from "@convohop/react";
import { ProjectServerClient } from "@convohop/server";
import { ControlClient } from "../lib/control.mjs";
import { startMockTarget } from "../mock/server.mjs";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let logged = [];
const consoleError = console.error;
console.error = (...args) => {
  // react-test-renderer 19 reports its own deprecation on every create().
  if (typeof args[0] === "string" && args[0].startsWith("react-test-renderer is deprecated")) return;
  logged.push(args.map(String).join(" "));
  consoleError(...args);
};

let mock, control;
/** Run last first, so trees unmount before the outboxes they use close. */
const cleanup = [];
before(async () => {
  mock = await startMockTarget({ seed: "react" });
  control = new ControlClient(mock.descriptor.control);
});
after(() => mock?.close());
beforeEach(() => control.reset());
afterEach(async () => {
  for (const step of cleanup.splice(0).reverse()) await step();
  const errors = logged;
  logged = [];
  assert.deepEqual(errors, [], "React logged errors");
});

/** Creates principals, each with a client on their own session. */
async function principals(names) {
  const { communicationUrl: baseUrl, projectId, incarnation, credentials } = mock.descriptor;
  const backend = new ProjectServerClient({ baseUrl, projectId, incarnation, backendKey: credentials.backend });
  await backend.initialize();
  const users = [];
  for (const name of names) {
    const principalId = await backend.createPrincipal(`${name}-${randomUUID()}`);
    const { sessionToken } = await backend.issueSession(principalId, randomUUID());
    users.push({ principalId, client: new ConvoHopClient({ baseUrl, projectId, incarnation, principalId, sessionToken }) });
  }
  return { backend, users };
}

/** Renders `hook()` under a provider for `client` (and `outbox`); `result.current` holds its latest value. */
async function mount(hook, client, outbox) {
  const result = { current: undefined };
  function Probe() { result.current = hook(); return null; }
  let renderer;
  await act(async () => {
    renderer = create(createElement(StrictMode, null, createElement(ConvoHopProvider, { client, outbox }, createElement(Probe))),
      { unstable_isConcurrent: true });
  });
  cleanup.push(() => act(async () => { renderer.unmount(); }));
  return result;
}

/** Runs act() scopes until `check()` is truthy, so updates from the network land inside act(). */
async function waitFor(check, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = check();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${check}`);
    await act(() => new Promise(resolve => setTimeout(resolve, 10)));
  }
}

const texts = view => view.messages.map(message => message.text);
const receiptOf = (view, principalId) => view.receipts.find(receipt => receipt.principalId === principalId);

// The Web workflow's oldest-react job installs another React line and sets this to its major.
test("runs on the React line CI installed", { skip: process.env.CONVOHOP_REACT_MAJOR === undefined }, () => {
  assert.equal(version.split(".")[0], process.env.CONVOHOP_REACT_MAJOR);
});

describe("React hooks over the wire", () => {
  test("two members' trees load, send optimistically, follow each other and see reading", async () => {
    const { backend, users: [alice, bob] } = await principals(["alice", "bob"]);
    const { conversationId } = await backend.createConversation("React",
      [alice, bob].map(({ principalId }) => ({ principalId, role: "member" })));
    const outbox = new Outbox(alice.client);
    cleanup.push(() => outbox.close());
    const aliceTree = await mount(() => ({ view: useConversation(conversationId), entries: useOutbox() }), alice.client, outbox);
    const bobTree = await mount(() => useConversation(conversationId), bob.client);
    await waitFor(() => aliceTree.current.view.status === "live" && bobTree.current.status === "live");
    assert.equal(aliceTree.current.view.conversation.membership.principalId, alice.principalId);
    assert.deepEqual(aliceTree.current.view.messages, []);

    let entry;
    await act(async () => { entry = aliceTree.current.view.send("hello bob", { draft: "a1" }); });
    assert.deepEqual(aliceTree.current.view.pending.map(item => item.requestId), [entry.requestId]);
    assert.deepEqual(aliceTree.current.entries.map(item => item.requestId), [entry.requestId]);
    await waitFor(() => aliceTree.current.view.messages.length === 1 && aliceTree.current.view.pending.length === 0);
    assert.deepEqual(aliceTree.current.entries, [], "the provider's outbox releases the entry once its message loads");
    const [hello] = await waitFor(() => bobTree.current.messages.length === 1 && bobTree.current.messages);
    assert.deepEqual([hello.text, hello.authorId, hello.props], ["hello bob", alice.principalId, { draft: "a1" }]);

    await act(async () => { bobTree.current.send("hi alice"); });
    await waitFor(() => aliceTree.current.view.messages.length === 2);
    assert.deepEqual(texts(aliceTree.current.view), ["hello bob", "hi alice"]);
    assert.equal(aliceTree.current.view.messages[1].authorId, bob.principalId);

    let reported;
    await act(async () => { reported = await aliceTree.current.view.markRead(); });
    assert.equal(reported, true);
    const newest = aliceTree.current.view.messages[1].sequence;
    await waitFor(() => receiptOf(bobTree.current, alice.principalId)?.readThroughSequence === newest);
    assert.equal(aliceTree.current.view.status, "live");
    assert.equal(bobTree.current.status, "live");
  });

  test("a conversation the user can't see shows the authority's error once", async () => {
    const { backend, users: [alice, bob] } = await principals(["alice", "bob"]);
    const { conversationId } = await backend.createConversation("Private", [{ principalId: bob.principalId, role: "member" }]);
    const errors = [];
    const tree = await mount(() => useConversation(conversationId, { onError: error => { errors.push(error); } }), alice.client);
    await waitFor(() => tree.current.status === "error");
    assert.equal(tree.current.error.code, "NOT_FOUND");
    assert.equal(tree.current.conversation, undefined);
    assert.deepEqual(errors, [tree.current.error], "StrictMode's discarded store reports nothing");
  });
});
