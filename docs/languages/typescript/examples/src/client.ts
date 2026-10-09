// Client quickstart snippets. test/client.test.ts runs them against the conformance mock, except session renewal,
// which the mock doesn't support, so the tests only typecheck it.

// #region connect
import {
  ConvoHopClient,
  type RecoveryStorage,
  type SessionBootstrap,
  type SessionRefresh,
} from "@convohop/client";

// What your backend's login endpoint returns. See the server quickstart.
export type UserBootstrap = SessionBootstrap & { baseUrl: string; projectId: string };

export async function connectUser(
  bootstrap: UserBootstrap,
  storage: RecoveryStorage,
  sessionRefresh?: SessionRefresh, // Optional: renews the session before it expires.
): Promise<ConvoHopClient> {
  const client = new ConvoHopClient({
    baseUrl: bootstrap.baseUrl,
    projectId: bootstrap.projectId,
    incarnation: bootstrap.session.incarnation,
    principalId: bootstrap.session.principalId,
    sessionToken: bootstrap.sessionToken,
    recoveryStorage: storage, // localStorage in a browser. It keeps unconfirmed sends, never tokens.
    sessionRefresh,
  });
  await client.initialize();
  // Finishes sends that an earlier page load left unconfirmed.
  await client.recoverPending(error => console.warn("Couldn't recover an earlier send", error));
  return client;
}
// #endregion connect

// #region renew
import type { SessionMetadata } from "@convohop/client";

// Pass it to connectUser as sessionRefresh. The client calls it with the session's metadata, never its token.
export async function renewSession(current: Readonly<SessionMetadata>): Promise<SessionBootstrap> {
  // Your backend's endpoint, behind your app's own sign-in. It renews the session with @convohop/server.
  const response = await fetch("/api/convohop/session/renew", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: current.sessionId, expectedRevision: current.sessionRevision }),
    signal: AbortSignal.timeout(10_000), // The client pauses its streams until this settles.
  });
  if (!response.ok) throw new Error(`Session renewal failed with HTTP ${response.status}`);
  return response.json(); // The client checks the renewed session with ConvoHop before it uses it.
}

// Renews the session a minute before it expires, and after each renewal, until you call the returned function.
export function keepSessionAlive(client: ConvoHopClient): () => void {
  return client.scheduleSessionRefresh({ onError: error => console.warn("Couldn't renew the session", error) });
}
// #endregion renew

// #region store
import { ConversationStore, Outbox, type ConversationSnapshot } from "@convohop/client";

// One outbox for the signed-in user. With persist, unsent messages survive page reloads in the client's
// recoveryStorage. Close it when the user signs out.
export function openOutbox(client: ConvoHopClient): Outbox {
  return new Outbox(client, {
    persist: true,
    onError: error => console.warn("A message wasn't sent", error),
  });
}

// Loads a conversation, keeps it current and renders every change. Close the store when the view goes away.
export async function showConversation(
  client: ConvoHopClient,
  outbox: Outbox,
  conversationId: string,
  render: (snapshot: ConversationSnapshot) => void,
): Promise<ConversationStore> {
  const store = new ConversationStore(client, conversationId, { outbox });
  store.subscribe(() => render(store.snapshot));
  try {
    await store.open(); // The conversation, its newest messages and receipts, then new events as they happen.
  } catch (error) {
    store.close();
    throw error;
  }
  return store;
}
// #endregion store

// #region outbox
import type { OutboxEntry } from "@convohop/client";

// The message shows in snapshot.pending at once, and moves to snapshot.messages once ConvoHop commits it.
export function sendDraft(store: ConversationStore, draft: string): OutboxEntry | null {
  const text = draft.trim();
  return text ? store.send(text) : null;
}

// What to show next to a message in snapshot.pending.
export function pendingLabel(entry: OutboxEntry): string {
  switch (entry.status) {
    case "queued":
    case "sending":
    case "unknown": // The connection dropped. The outbox tries again with the same request ID, so it posts once.
      return "Sending…";
    case "sent":
      return "Sent";
    case "failed":
      // Offer outbox.resend(entry.requestId), which sends the text as a new message, and outbox.discard(entry.requestId).
      return entry.unconfirmed ? "Not confirmed" : "Not sent"; // Resending an unconfirmed message can post it twice.
  }
}
// #endregion outbox

// #region sign-out
// When the user signs out, close their conversation stores, then call this. storage is the recoveryStorage you gave
// the client: it holds unsent messages, including their text.
export async function signOut(outbox: Outbox, storage: Storage): Promise<void> {
  await outbox.close(); // Resolves once the outbox and the sends it started have stopped writing to storage.
  storage.clear();
}
// #endregion sign-out

// #region watch
import type { ConversationMessage, ConversationStream } from "@convohop/client";

// Renders the latest messages and keeps them current. Close the stream when the view goes away.
export async function watchConversation(
  client: ConvoHopClient,
  conversationId: string,
  render: (messages: ConversationMessage[]) => void,
): Promise<ConversationStream> {
  const refresh = async () => render((await client.messages(conversationId)).items); // Newest first.
  await refresh();
  return client.watch(
    conversationId,
    async events => {
      // Events say what changed, such as message.created. Read the messages again when one did.
      if (events.some(event => String(event.type).startsWith("message."))) await refresh();
    },
    error => console.error("The conversation stream stopped", error),
  );
}
// #endregion watch

// #region send
// Keep requestId with the draft until the send succeeds, and reuse it if you send the draft again.
export async function sendMessage(
  client: ConvoHopClient,
  conversationId: string,
  text: string,
  requestId: string,
): Promise<string> {
  const receipt = await client.send(conversationId, text, requestId);
  return receipt.messageId; // Committed by the authority. Other devices get it through their streams.
}
// #endregion send
