# TypeScript client quickstart

Use ConvoHop in your users' browsers with `@convohop/client`: connect with the session your backend issued, show a conversation and keep it current, and send messages that survive dropped connections and page reloads. `@convohop/react` offers the same as React hooks.

## Before you start

Your backend signs the user in and returns a session, as the [server quickstart](server.md#sign-in-a-user) shows. `@convohop/client` never holds a backend key. It targets the current and previous major versions of Chrome, Edge, Firefox and Safari. React Native isn't verified yet. `@convohop/react` needs React 18 or later.

## Connect

```ts snippet=docs/languages/typescript/examples/src/client.ts#connect
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
```

`recoveryStorage` keeps sends that the authority hasn't confirmed, so that `recoverPending` can finish them after a reload. It holds their inputs, including message text, but never tokens. Use storage that only this user can read, not a shared computer's.

## Renew the session

Sessions expire, after 15 minutes by default. To renew the user's session before it does, pass `renewSession` to `connectUser` as `sessionRefresh`, then call `keepSessionAlive`:

```ts snippet=docs/languages/typescript/examples/src/client.ts#renew
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
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with [`sessions.renew`](../reference/server.md#projectserverclientsessionsrenew-property), taking the principal and device from that sign-in rather than from the request, and returns the `SessionBootstrap` that `sessions.renew` resolves with.

The client pauses its streams and lets its requests finish before it calls `sessionRefresh`, and checks the renewed session with ConvoHop before it uses it. Don't call the client from `sessionRefresh`: the call would wait for the renewal. [Session credential lifetime](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#session-credential-lifetime) covers what your endpoint must check, and what happens when a renewal fails.

## Show a conversation

```ts snippet=docs/languages/typescript/examples/src/client.ts#store
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
```

`ConversationStore` keeps one conversation current: its messages, oldest first, each member's read receipts, and the user's messages that aren't sent yet. Each change replaces the frozen `snapshot`. A dropped connection reconnects on its own and catches up. Keep one store per conversation, and one outbox per client.

- `store.loadOlder()` loads earlier messages while `snapshot.hasOlder` is true. `store.markRead()` tells the other members what the user has read.
- If the store's saved position in the conversation can't be used any more, for example because it expired, the store stops with `snapshot.resyncRequired` instead of silently skipping messages. `store.resync()` loads the conversation again.

## Send a message

```ts snippet=docs/languages/typescript/examples/src/client.ts#outbox
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
```

The outbox sends each conversation's messages in order. It waits while the browser is offline, and gives each message one request ID, so a dropped connection never posts a message twice. With `persist`, messages that weren't sent yet survive a reload, and when the user closes a tab, another of their tabs sends what it left. A failed message stays in `snapshot.pending` until you resend or discard it.

## Sign out

```ts snippet=docs/languages/typescript/examples/src/client.ts#sign-out
// When the user signs out, close their conversation stores, then call this. storage is the recoveryStorage you gave
// the client: it holds unsent messages, including their text.
export async function signOut(outbox: Outbox, storage: Storage): Promise<void> {
  await outbox.close(); // Resolves once the outbox and the sends it started have stopped writing to storage.
  storage.clear();
}
```

`recoveryStorage` holds the user's unsent messages, including their text, so clear it when they sign out. Close the outbox first: until `close()` resolves, the sends it started can still save to the storage. If you call `client.send` yourself, wait for those calls to settle too. `storage.clear()` also removes your app's own keys in that storage.

Other tabs of the same user share `localStorage` and keep saving to it, so sign them out too, for example with a `BroadcastChannel` message. Have your backend revoke the session with [`sessions.revoke`](../reference/server.md#projectserverclientsessionsrevoke-property), so that its token stops working before it expires. To stop the browser's push notifications too, see [subscribe a browser](push.md#subscribe-a-browser).

## Use React

`@convohop/react` wraps the client in hooks. Give its provider the user's client and outbox:

```tsx snippet=docs/languages/typescript/examples/src/react.tsx#provider
import type { ReactNode } from "react";
import type { ConvoHopClient, Outbox } from "@convohop/client";
import { ConvoHopProvider, useSessionRefresh } from "@convohop/react";

// Wrap the signed-in part of your app. When the user signs in, create the client with connectUser, passing
// renewSession as sessionRefresh, and the outbox with openOutbox. When they sign out, unmount this, then call signOut.
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

```tsx snippet=docs/languages/typescript/examples/src/react.tsx#conversation
import { useState } from "react";
import { useConversation, useTyping } from "@convohop/react";
import { pendingLabel } from "./client.ts";

// typing: whether the project has typing indicators, from (await client.capabilities()).features?.typing.
export function Thread({ conversationId, typing }: { conversationId: string; typing: boolean }) {
  const thread = useConversation(conversationId, { onError: error => console.warn("Conversation error", error) });
  const typingSignal = useTyping(conversationId, { enabled: typing });
  const [draft, setDraft] = useState("");
  if (thread.status === "idle" || thread.status === "loading") return <p>Loading…</p>;

  const send = () => {
    typingSignal.stop();
    const text = draft.trim();
    if (text) thread.send(text); // Shows in thread.pending at once.
    setDraft("");
  };
  return (
    <section>
      {thread.hasOlder && <button onClick={() => void thread.loadOlder()}>Earlier messages</button>}
      {thread.messages.map(message => (
        <p key={message.messageId}>{message.deleted ? "Deleted" : message.text}</p>
      ))}
      {thread.pending.map(entry => (
        <p key={entry.requestId}>
          {entry.text} ({pendingLabel(entry)})
        </p>
      ))}
      {thread.resyncRequired && <button onClick={() => void thread.resync()}>Reload</button>}
      <input
        value={draft}
        onChange={event => {
          setDraft(event.target.value);
          typingSignal.input();
        }}
      />
      <button onClick={send}>Send</button>
    </section>
  );
}
```

The view's `status` is `idle` until the component's first effect creates the store, and `send` throws until then. `useTyping` sends throttled typing signals while the user writes. Other members' typing isn't delivered to clients yet.

## Without the store

`ConversationStore` and the outbox use `watch` and `send`, which you can also use yourself.

### Watch a conversation's events

`watch` replays the conversation's events from the cursor it saved last time, or from the start, and then delivers new events as they happen. Events say what changed, so read the current messages when one did.

```ts snippet=docs/languages/typescript/examples/src/client.ts#watch
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
```

Close the stream when the view goes away. If the saved cursor can't be used any more, for example because it expired, `watch` fails instead of silently skipping history. [Chat and replay](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#chat-and-replay) describes how to recover.

### Send with your own request ID

```ts snippet=docs/languages/typescript/examples/src/client.ts#send
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
```

Create the request ID when the user writes the message, for example with `crypto.randomUUID()`, and keep it with the draft. If the connection drops during a send, `client.send` throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached the authority. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`.

## Next steps

- [Calling quickstart](calling.md): start and join calls in a conversation.
- [Push notifications quickstart](push.md): notify users who aren't watching, and subscribe browsers.
- [`ConvoHopClient` reference](../reference/client.md#convohopclient-class): every method, with the operation it sends.
- [`@convohop/react` reference](../reference/react.md): every hook.
