// The test page. It holds only a user's session token, never a backend key: the tests create users and sessions
// in Node and pass the page what a browser app would receive from its own backend.
import { ConversationStore, ConvoHopClient, Outbox } from "@convohop/client";

let current;
window.harness = {
  /** Opens a conversation as `user`, with an outbox that keeps unsent messages in `localStorage` when `persist`. */
  async open({ projectId, incarnation, principalId, sessionToken, conversationId, persist = false }) {
    const errors = [], report = error => errors.push(error.message);
    const client = new ConvoHopClient({ baseUrl: location.origin, projectId, incarnation, principalId, sessionToken,
      recoveryStorage: localStorage });
    const outbox = new Outbox(client, { persist, onError: report });
    const store = new ConversationStore(client, conversationId, { outbox, onError: report });
    current = { client, outbox, store, errors };
    await store.open();
  },
  send(text) {
    return current.store.send(text).requestId;
  },
  view() {
    const { status, messages, pending, error } = current.store.snapshot;
    return {
      status, online: navigator.onLine, errors: [...current.errors], error: error?.message,
      messages: messages.map(({ text, authorId }) => ({ text, authorId })),
      pending: pending.map(({ requestId, status }) => ({ requestId, status })),
    };
  },
  close() {
    current.store.close(); current.outbox.close();
  },
};
