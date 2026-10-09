// The test page. It holds only a user's session token, never a backend key: the tests create users and sessions
// in Node and pass the page what a browser app would receive from its own backend.
import { ConversationStore, ConvoHopClient, Outbox } from "@convohop/client";

let current;

/** Connectivity that stays offline until `resume`, whatever the browser reports, and again after `hold`. */
function heldConnectivity() {
  const listeners = new Set();
  const set = online => {
    connectivity.online = online;
    for (const listener of [...listeners]) listener(online);
  };
  const connectivity = {
    online: false,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    resume() { set(true); },
    hold() { set(false); },
  };
  return connectivity;
}

window.harness = {
  /**
   * Opens a conversation as `user`, with an outbox that keeps unsent messages in `localStorage` when `persist`, and
   * resolves once both have loaded. Without `conversationId`, opens only the outbox, which needs no network. When
   * `held`, the outbox treats the network as offline until `resume` and after `hold`, rather than following the browser.
   */
  async open({ projectId, incarnation, principalId, sessionToken, conversationId, persist = false, held = false }) {
    const errors = [], report = error => errors.push(error.message);
    const client = new ConvoHopClient({ baseUrl: location.origin, projectId, incarnation, principalId, sessionToken,
      recoveryStorage: localStorage });
    const connectivity = held ? heldConnectivity() : undefined;
    const outbox = new Outbox(client, { persist, connectivity, onError: report });
    const store = conversationId ? new ConversationStore(client, conversationId, { outbox, onError: report }) : undefined;
    current = { client, outbox, store, errors, connectivity };
    await Promise.all([store?.open(), outbox.flush()]);
  },
  /** Lets an outbox opened with `held` send. */
  resume() {
    current.connectivity.resume();
  },
  /** Stops an outbox opened with `held` from sending again. */
  hold() {
    current.connectivity.hold();
  },
  send(text) {
    return current.store.send(text).requestId;
  },
  view() {
    const { status, messages, pending, error } = current.store?.snapshot ?? { status: "idle", messages: [], pending: [] };
    return {
      status, online: current.connectivity ? current.connectivity.online : navigator.onLine,
      errors: [...current.errors], error: error?.message,
      messages: messages.map(({ text, authorId }) => ({ text, authorId })),
      pending: pending.map(({ requestId, status }) => ({ requestId, status })),
      outbox: current.outbox.entries.map(({ requestId, status, text }) => ({ requestId, status, text })),
    };
  },
  close() {
    current.store?.close(); current.outbox.close();
  },
};
