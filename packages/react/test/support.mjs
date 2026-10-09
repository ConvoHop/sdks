// Shared fixtures for the hook tests. Hooks render with react-test-renderer, which needs no DOM, like React Native,
// in StrictMode, so every effect mounts, unmounts and mounts again. Importing this module fails any test during which
// React logs an error, such as an update outside act() or an uncached snapshot, outside loggedErrors().
import assert from "node:assert/strict";
import { afterEach } from "node:test";
import { StrictMode, createElement } from "react";
import { act, create } from "react-test-renderer";
import { ConvoHopProvider } from "../dist/index.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let logged = [], expected;
const consoleError = console.error;
console.error = (...args) => {
  // react-test-renderer 19 reports its own deprecation on every create().
  if (typeof args[0] === "string" && args[0].startsWith("react-test-renderer is deprecated")) return;
  (expected ?? logged).push(args.map(String).join(" "));
  if (!expected) consoleError(...args);
};
afterEach(() => {
  const errors = logged;
  logged = [];
  assert.deepEqual(errors, [], "React logged errors");
});

/** Runs `work` and returns the errors React logged meanwhile, such as errors an error boundary caught. */
export async function loggedErrors(work) {
  const seen = expected = [];
  try { await work(); }
  finally { expected = undefined; }
  return seen;
}

export const projectId = "0b0c5f8e-2f43-4c6c-9a51-6f2f8f3f6a01";
export const alice = "4f6f8f0e-8a8b-4b0c-9d4e-0d6c2f1b7a11";
export const conversationA = "9e2d5c1b-3f4a-4e6b-8c7d-1a2b3c4d5e01";
export const conversationB = "9e2d5c1b-3f4a-4e6b-8c7d-1a2b3c4d5e02";

/**
 * Renders `hook(props)` under a provider for `client` (and `outbox`), in StrictMode. `result.current` holds the latest
 * value. Mounting, `rerender` and `unmount` each run inside act().
 */
export async function renderHook(hook, { client, outbox, props } = {}) {
  const result = { current: undefined };
  function Probe({ props: current }) { result.current = hook(current); return null; }
  let state = { client, outbox, props };
  const element = () => {
    const probe = createElement(Probe, { props: state.props });
    return createElement(StrictMode, null,
      state.client ? createElement(ConvoHopProvider, { client: state.client, outbox: state.outbox }, probe) : probe);
  };
  let renderer;
  await act(async () => { renderer = create(element(), { unstable_isConcurrent: true }); });
  return {
    result,
    /** Renders again with `next` merged into the client, outbox and props. */
    rerender: next => { state = { ...state, ...next }; return act(async () => { renderer.update(element()); }); },
    unmount: () => act(async () => { renderer.unmount(); }),
  };
}

/** Runs act() scopes until `check()` returns a truthy value, which it resolves with. */
export async function waitFor(check, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    let failure;
    try {
      const value = check();
      if (value) return value;
    } catch (error) { failure = error; }
    if (Date.now() > deadline) throw failure ?? new Error(`Timed out waiting for ${check}`);
    await act(() => new Promise(resolve => setTimeout(resolve, 10)));
  }
}

/** Settles pending promises inside act(), so React applies what they changed. */
export const flush = () => act(() => new Promise(resolve => setTimeout(resolve, 0)));

export function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const quiet = { subscribe: () => () => undefined };

/**
 * A client with the read path a ConversationStore uses. Each `watch` adds a stream to `streams`; call its `apply` with
 * events to deliver them. `members` overrides or adds methods.
 */
export function stubClient(members = {}) {
  const streams = [];
  return {
    projectId, principalId: alice, streams,
    platform: { connectivity: { online: true, ...quiet }, lifecycle: { state: "active", ...quiet } },
    async getConversation(conversationId) {
      return { conversationId, title: "Stub", latestSequence: "0",
        membership: { principalId: alice, role: "member", membershipEpoch: "1", visibilityEpoch: "1" } };
    },
    async messages() { return { items: [], complete: true, nextCursor: null }; },
    async receipts() { return { items: [], complete: true, nextCursor: null }; },
    async watch(conversationId, apply, onError) {
      const stream = { conversationId, apply, onError, closed: false, close() { stream.closed = true; } };
      streams.push(stream);
      return stream;
    },
    ...members,
  };
}

/** An outbox with the surface hooks and stores use, which records sends instead of sending. */
export function fakeOutbox(client) {
  const listeners = new Set();
  let sequence = 0;
  const outbox = {
    client, entries: Object.freeze([]), sent: [], closed: false,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    send(conversationId, text, props = {}) {
      const entry = Object.freeze({ requestId: `request-${++sequence}`, conversationId, text, props,
        createdAt: new Date(0).toISOString(), status: "queued" });
      outbox.sent.push(entry);
      outbox.entries = Object.freeze([...outbox.entries, entry]);
      for (const listener of [...listeners]) listener();
      return entry;
    },
    settle() {},
    close() { outbox.closed = true; },
    get listeners() { return listeners.size; },
  };
  return outbox;
}

/** A live event, as the realtime stream delivers it. */
export function liveEvent(sequence, type = "live.started") {
  return { type, sequence: String(sequence), occurredAt: new Date(0).toISOString(), payload: {} };
}
