# React Native client quickstart

Use ConvoHop in your users' React Native apps with `@convohop/client` and `@convohop/react-native`: connect with the session your backend issued, show a conversation and keep it current, and send messages that survive dropped connections and the app's restarts. `@convohop/react` offers the same as React hooks.

## Before you start

Your backend signs the user in and returns a session, as each [server quickstart](../../index.md#quickstarts) shows. The app never holds a backend key. Install `@convohop/client` and `@convohop/react-native` as the [overview](../index.md#install) describes. The samples also use AsyncStorage 3, `@react-native-async-storage/async-storage`, and NetInfo, `@react-native-community/netinfo`. `@convohop/react` needs React 18 or later.

## Connect

```ts snippet=docs/languages/react-native/examples/src/client.ts#connect
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
```

`createPlatform` gives the client what Hermes lacks: secure random UUIDs, SHA-256 and a WHATWG `URL`, with NetInfo's connectivity and the app's lifecycle from `AppState`. Without NetInfo, the client assumes the device is online.

`asyncRecoveryStorage` keeps sends that the authority hasn't confirmed, the conversations' replay positions and the outbox, so that they survive the app's restarts. It holds their inputs, including message text, but never tokens. It belongs to one user, so `claimStorage` deletes what another user left before the client reads it.

## Renew the session

Sessions expire, after 15 minutes by default. To renew the user's session before it does, pass `renewSession` to `connectUser` as `sessionRefresh`, then call `keepSessionAlive`:

```ts snippet=docs/languages/react-native/examples/src/client.ts#renew
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
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with the server SDK, as with [`sessions.renew`](../../typescript/reference/server.md#projectserverclientsessionsrenew-property) in TypeScript, taking the principal and device from that sign-in rather than from the request, and returns the `SessionBootstrap` that the renewal resolves with.

The client pauses its streams and lets its requests finish before it calls `sessionRefresh`, and checks the renewed session with ConvoHop before it uses it. Don't call the client from `sessionRefresh`: the call would wait for the renewal. While the app is in the background, a renewal can come due without running, so the client checks for one when the app returns to the foreground. [Session credential lifetime](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#session-credential-lifetime) covers what your endpoint must check, and what happens when a renewal fails.

## Show a conversation

```ts snippet=docs/languages/react-native/examples/src/client.ts#store
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
```

`ConversationStore` keeps one conversation current: its messages, oldest first, each member's read receipts, and the user's messages that aren't sent yet. Each change replaces the frozen `snapshot`. A dropped connection reconnects on its own and catches up, trying again when the device is back online or the app returns to the foreground. Keep one store per conversation, and one outbox per client.

- `store.loadOlder()` loads earlier messages while `snapshot.hasOlder` is true. `store.markRead()` tells the other members what the user has read.
- If the store's saved position in the conversation can't be used any more, for example because it expired, the store stops with `snapshot.resyncRequired` instead of silently skipping messages. `store.resync()` loads the conversation again.

## Send a message

```ts snippet=docs/languages/react-native/examples/src/client.ts#outbox
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
```

The outbox sends each conversation's messages in order. It waits while the device is offline, and gives each message one request ID, so a dropped connection never posts a message twice. With `persist`, messages that weren't sent yet survive the app's restarts, and the user's next outbox sends them. A failed message stays in `snapshot.pending` until you resend or discard it.

## Sign out

```ts snippet=docs/languages/react-native/examples/src/client.ts#sign-out
// When the user signs out, close their conversation stores, then call this. storage is the asyncRecoveryStorage you
// gave the client: it holds unsent messages, including their text.
export async function signOut(outbox: Outbox, storage: AsyncStorage): Promise<void> {
  await outbox.close(); // Resolves once the outbox and the sends it started have stopped writing to storage.
  await storage.clear();
}
```

The recovery storage holds the user's unsent messages, including their text, so clear it when they sign out. Close the outbox first: until `close()` resolves, the sends it started can still save to the storage. If you call `client.send` yourself, wait for those calls to settle too. `storage.clear()` deletes everything in that storage, so keep your app's own data in another one.

With push notifications or calls, stop them before you call `signOut`, as the [push notifications](push.md#sign-out) and [calling](calling.md#sign-out) quickstarts show. Have your backend revoke the session, as with [`sessions.revoke`](../../typescript/reference/server.md#projectserverclientsessionsrevoke-property) in TypeScript, so that its token stops working before it expires.

## Use React

`@convohop/react` imports only `react` and `@convohop/client`, so its hooks work in React Native. Give its provider the user's client and outbox:

```tsx snippet=docs/languages/react-native/examples/src/react.tsx#provider
import type { ReactNode } from "react";
import type { ConvoHopClient, Outbox } from "@convohop/client";
import { ConvoHopProvider, useSessionRefresh } from "@convohop/react";

// Wrap the signed-in screens. When the user signs in, create the client with connectUser, passing renewSession as
// sessionRefresh, and the outbox with openOutbox. When they sign out, unmount this, then call signOut.
export function SignedIn({ client, outbox, children }: { client: ConvoHopClient; outbox: Outbox; children: ReactNode }) {
  return (
    <ConvoHopProvider client={client} outbox={outbox}>
      <KeepSessionAlive />
      {children}
    </ConvoHopProvider>
  );
}

// Renews the session before it expires while it's mounted.
function KeepSessionAlive(): null {
  useSessionRefresh({ onError: error => console.warn("Couldn't renew the session", error) });
  return null;
}
```

The provider doesn't own the client or the outbox. `useSessionRefresh` renews the session while it's mounted. Without `sessionRefresh` on the client, it throws `SESSION_REFRESH_REQUIRED` to the nearest error boundary.

`useConversation` follows a conversation with a `ConversationStore` while the component is mounted, and returns the store's snapshot and actions:

```tsx snippet=docs/languages/react-native/examples/src/react.tsx#conversation
import { useState } from "react";
import { Button, FlatList, Text, TextInput, View } from "react-native";
import { useConversation, useTyping } from "@convohop/react";
import { pendingLabel } from "./client.ts";

// typing: whether the project has typing indicators, from (await client.capabilities()).features?.typing.
export function Thread({ conversationId, typing }: { conversationId: string; typing: boolean }) {
  const thread = useConversation(conversationId, { onError: error => console.warn("Conversation error", error) });
  const typingSignal = useTyping(conversationId, { enabled: typing });
  const [draft, setDraft] = useState("");
  if (thread.status === "idle" || thread.status === "loading") return <Text>Loading…</Text>;

  const send = () => {
    typingSignal.stop();
    const text = draft.trim();
    if (text) thread.send(text); // Shows in thread.pending at once.
    setDraft("");
  };
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={thread.messages}
        keyExtractor={message => message.messageId}
        renderItem={({ item: message }) => <Text>{message.deleted ? "Deleted" : message.text}</Text>}
        ListHeaderComponent={
          thread.hasOlder ? <Button title="Earlier messages" onPress={() => void thread.loadOlder()} /> : undefined
        }
        ListFooterComponent={
          <>
            {thread.pending.map(entry => (
              <Text key={entry.requestId}>
                {entry.text} ({pendingLabel(entry)})
              </Text>
            ))}
          </>
        }
      />
      {thread.resyncRequired && <Button title="Reload" onPress={() => void thread.resync()} />}
      <TextInput
        value={draft}
        onChangeText={text => {
          setDraft(text);
          typingSignal.input();
        }}
      />
      <Button title="Send" onPress={send} />
    </View>
  );
}
```

The view's `status` is `idle` until the component's first effect creates the store, and `send` throws until then. `useTyping` sends throttled typing signals while the user writes. Other members' typing isn't delivered to clients yet. `useMediaConnection` needs a browser: connect calls as the [calling quickstart](calling.md) shows.

## Without the store

`ConversationStore` and the outbox use `watch` and `send`, which you can also use yourself.

### Watch a conversation's events

`watch` replays the conversation's events from the cursor it saved last time, or from the start, and then delivers new events as they happen. Events say what changed, so read the current messages when one did.

```ts snippet=docs/languages/react-native/examples/src/client.ts#watch
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
```

Close the stream when the screen goes away. If the saved cursor can't be used any more, for example because it expired, `watch` fails instead of silently skipping history. [Chat and replay](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#chat-and-replay) describes how to recover.

### Send with your own request ID

```ts snippet=docs/languages/react-native/examples/src/client.ts#send
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
```

Create the request ID when the user writes the message, for example with `platform.randomUUID()`, and keep it with the draft. If the connection drops during a send, `client.send` throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached the authority. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`.

## How the samples are tested

The samples run on Node.js against the conformance mock, a local stand-in for the ConvoHop API, with stand-ins for React Native, AsyncStorage's native module and NetInfo. The tests check:

- that a watching user sees another user's message, and that a conversation store shows a draft at once, then the message that ConvoHop committed;
- that a draft sent again with its request ID, or through the outbox while the connection drops, posts once, and that `recoverSends` finishes a send that an earlier launch left unconfirmed;
- that the outbox waits while the device is offline, and sends what it saved before the app stopped;
- that another user's sign-in deletes what the previous user left, and that signing out during a send leaves the storage empty;
- that `renewSession` asks a local stand-in for your backend to renew the session.

The React samples need React Native's renderer, so CI only typechecks them. The tests run on Node.js, not Hermes.

## Next steps

- [Push notifications quickstart](push.md): register the device and open conversations from notifications.
- [Calling quickstart](calling.md): start, answer and join calls in a conversation.
- [`ConvoHopClient` reference](../reference/client.md#convohopclient-class): every method, with the operation it sends.
- [`createPlatform` reference](../reference/react-native.md#createplatform-function): the platform that the client runs on.
- [`@convohop/react` reference](../reference/react.md): every hook.
