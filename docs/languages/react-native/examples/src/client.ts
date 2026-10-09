// Client quickstart snippets. test/client.test.ts runs them against the conformance mock on Node.js, with stand-ins for
// React Native, AsyncStorage's native module and NetInfo, and runs renewSession against a local HTTP server.

// #region connect
import type { AsyncStorage } from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { ConvoHopClient, type SessionBootstrap, type SessionRefresh } from "@convohop/client";
import { createPlatform } from "@convohop/react-native";

// One for the app, shared by its clients: crypto and URL for Hermes, NetInfo's connectivity and AppState's lifecycle.
export const platform = createPlatform({ netInfo: NetInfo });

// What your backend's sign-in endpoint returns. See the server quickstart.
export type UserBootstrap = SessionBootstrap & { baseUrl: string; projectId: string };

export async function connectUser(
  bootstrap: UserBootstrap,
  storage: AsyncStorage, // One createAsyncStorage("convohop") for the app. It keeps unsent messages, never tokens.
  sessionRefresh?: SessionRefresh, // Optional: renews the session before it expires.
): Promise<ConvoHopClient> {
  await claimStorage(storage, bootstrap);
  const client = new ConvoHopClient({
    baseUrl: bootstrap.baseUrl,
    projectId: bootstrap.projectId,
    incarnation: bootstrap.session.incarnation,
    principalId: bootstrap.session.principalId,
    sessionToken: bootstrap.sessionToken,
    asyncRecoveryStorage: storage,
    platform,
    sessionRefresh,
  });
  await client.initialize();
  return client;
}

// The storage belongs to one user. If the app stopped while someone else was signed in, this deletes what they left,
// including the text of their unsent messages, before the new user's client reads it.
async function claimStorage(storage: AsyncStorage, { projectId, session }: UserBootstrap): Promise<void> {
  const owner = JSON.stringify([projectId, session.principalId]);
  if ((await storage.getItem("owner")) === owner) return;
  await storage.clear();
  await storage.setItem("owner", owner);
}
// #endregion connect

// #region renew
import type { SessionMetadata } from "@convohop/client";

// Your backend, and the user's credential for it from your app's own sign-in. Never a ConvoHop backend key.
export interface Backend {
  url: string;
  appToken: string;
}

// Pass current => renewSession(backend, current) to connectUser as sessionRefresh. The client calls it with the
// session's metadata, never its token.
export async function renewSession(backend: Backend, current: Readonly<SessionMetadata>): Promise<SessionBootstrap> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 10_000); // The client pauses its streams until this settles.
  try {
    // Your backend's endpoint. It renews the session with @convohop/server.
    const response = await fetch(`${backend.url}/convohop/session/renew`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${backend.appToken}` },
      body: JSON.stringify({ sessionId: current.sessionId, expectedRevision: current.sessionRevision }),
      signal: timeout.signal,
    });
    if (!response.ok) throw new Error(`Session renewal failed with HTTP ${response.status}`);
    return await response.json(); // The client checks the renewed session with ConvoHop before it uses it.
  } finally {
    clearTimeout(timer);
  }
}

// Renews the session a minute before it expires, and after each renewal, until you call the returned function.
export function keepSessionAlive(client: ConvoHopClient): () => void {
  return client.scheduleSessionRefresh({ onError: error => console.warn("Couldn't renew the session", error) });
}
// #endregion renew

// #region store
import { ConversationStore, Outbox, type ConversationSnapshot } from "@convohop/client";

// One outbox for the signed-in user. With persist, unsent messages survive the app's restarts in the client's
// asyncRecoveryStorage. It waits while the device is offline. Close it when the user signs out.
export function openOutbox(client: ConvoHopClient): Outbox {
  return new Outbox(client, {
    persist: true,
    onError: error => console.warn("A message wasn't sent", error),
  });
}

// Loads a conversation, keeps it current and renders every change. Close the store when the screen goes away.
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
    case "queued": // Waiting, such as while the device is offline.
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
// When the user signs out, close their conversation stores, then call this. storage is the asyncRecoveryStorage you
// gave the client: it holds unsent messages, including their text.
export async function signOut(outbox: Outbox, storage: AsyncStorage): Promise<void> {
  await outbox.close(); // Resolves once the outbox and the sends it started have stopped writing to storage.
  await storage.clear();
}
// #endregion sign-out

// #region watch
import type { ConversationMessage, ConversationStream } from "@convohop/client";

// Renders the latest messages and keeps them current. Close the stream when the screen goes away.
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

// Finishes the sends that an earlier launch left unconfirmed, with their request IDs. Call it after connectUser if you
// send with client.send. The outbox finishes its own sends, so don't call it beside one.
export async function recoverSends(client: ConvoHopClient): Promise<void> {
  await client.recoverPending(error => console.warn("Couldn't recover an earlier send", error));
}
// #endregion send
