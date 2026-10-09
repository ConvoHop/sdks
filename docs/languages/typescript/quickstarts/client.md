# TypeScript client quickstart

Use ConvoHop in your users' browsers with `@convohop/client`: connect with the session your backend issued, show a conversation and keep it current, and send messages that survive dropped connections and page reloads. `@convohop/react` offers the same as React hooks.

## Before you start

Your backend signs the user in and returns a session, as the [server quickstart](server.md#sign-in-a-user) shows. `@convohop/client` never holds a backend key. It targets the current and previous major versions of Chrome, Edge, Firefox and Safari. React Native isn't verified yet. `@convohop/react` needs React 18 or later.

## Connect

```ts include=examples/src/client.ts#connect
```

`recoveryStorage` keeps sends that the authority hasn't confirmed, so that `recoverPending` can finish them after a reload. It holds their inputs, including message text, but never tokens. Use storage that only this user can read, not a shared computer's.

## Renew the session

Sessions expire, after 15 minutes by default. To renew the user's session before it does, pass `renewSession` to `connectUser` as `sessionRefresh`, then call `keepSessionAlive`:

```ts include=examples/src/client.ts#renew
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with [`sessions.renew`](../reference/server.md#projectserverclientsessionsrenew-property), taking the principal and device from that sign-in rather than from the request, and returns the `SessionBootstrap` that `sessions.renew` resolves with.

The client pauses its streams and lets its requests finish before it calls `sessionRefresh`, and checks the renewed session with ConvoHop before it uses it. Don't call the client from `sessionRefresh`: the call would wait for the renewal. [Session credential lifetime](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#session-credential-lifetime) covers what your endpoint must check, and what happens when a renewal fails.

## Show a conversation

```ts include=examples/src/client.ts#store
```

`ConversationStore` keeps one conversation current: its messages, oldest first, each member's read receipts, and the user's messages that aren't sent yet. Each change replaces the frozen `snapshot`. A dropped connection reconnects on its own and catches up. Keep one store per conversation, and one outbox per client.

- `store.loadOlder()` loads earlier messages while `snapshot.hasOlder` is true. `store.markRead()` tells the other members what the user has read.
- If the store's saved position in the conversation can't be used any more, for example because it expired, the store stops with `snapshot.resyncRequired` instead of silently skipping messages. `store.resync()` loads the conversation again.

## Send a message

```ts include=examples/src/client.ts#outbox
```

The outbox sends each conversation's messages in order. It waits while the browser is offline, and gives each message one request ID, so a dropped connection never posts a message twice. With `persist`, messages that weren't sent yet survive a reload, and when the user closes a tab, another of their tabs sends what it left. A failed message stays in `snapshot.pending` until you resend or discard it.

## Sign out

```ts include=examples/src/client.ts#sign-out
```

`recoveryStorage` holds the user's unsent messages, including their text, so clear it when they sign out. Close the outbox first: until `close()` resolves, the sends it started can still save to the storage. If you call `client.send` yourself, wait for those calls to settle too. `storage.clear()` also removes your app's own keys in that storage.

Other tabs of the same user share `localStorage` and keep saving to it, so sign them out too, for example with a `BroadcastChannel` message. Have your backend revoke the session with [`sessions.revoke`](../reference/server.md#projectserverclientsessionsrevoke-property), so that its token stops working before it expires. To stop the browser's push notifications too, see [subscribe a browser](push.md#subscribe-a-browser).

## Use React

`@convohop/react` wraps the client in hooks. Give its provider the user's client and outbox:

```tsx include=examples/src/react.tsx#provider
```

The provider doesn't own the client or the outbox. `useSessionRefresh` renews the session while it's mounted. Without `sessionRefresh` on the client, it throws `SESSION_REFRESH_REQUIRED` to the nearest error boundary.

`useConversation` follows a conversation with a `ConversationStore` while the component is mounted, and returns the store's snapshot and actions:

```tsx include=examples/src/react.tsx#conversation
```

The view's `status` is `idle` until the component's first effect creates the store, and `send` throws until then. `useTyping` sends throttled typing signals while the user writes. Other members' typing isn't delivered to clients yet.

## Without the store

`ConversationStore` and the outbox use `watch` and `send`, which you can also use yourself.

### Watch a conversation's events

`watch` replays the conversation's events from the cursor it saved last time, or from the start, and then delivers new events as they happen. Events say what changed, so read the current messages when one did.

```ts include=examples/src/client.ts#watch
```

Close the stream when the view goes away. If the saved cursor can't be used any more, for example because it expired, `watch` fails instead of silently skipping history. [Chat and replay](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#chat-and-replay) describes how to recover.

### Send with your own request ID

```ts include=examples/src/client.ts#send
```

Create the request ID when the user writes the message, for example with `crypto.randomUUID()`, and keep it with the draft. If the connection drops during a send, `client.send` throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached the authority. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`.

## Next steps

- [Calling quickstart](calling.md): start and join calls in a conversation.
- [Push notifications quickstart](push.md): notify users who aren't watching, and subscribe browsers.
- [`ConvoHopClient` reference](../reference/client.md#convohopclient-class): every method, with the operation it sends.
- [`@convohop/react` reference](../reference/react.md): every hook.
