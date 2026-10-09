# React Native client quickstart

Use ConvoHop in your users' React Native apps with `@convohop/client` and `@convohop/react-native`: connect with the session your backend issued, show a conversation and keep it current, and send messages that survive dropped connections and the app's restarts. `@convohop/react` offers the same as React hooks.

## Before you start

Your backend signs the user in and returns a session, as each [server quickstart](../../index.md#quickstarts) shows. The app never holds a backend key. Install `@convohop/client` and `@convohop/react-native` as the [overview](../index.md#install) describes. The samples also use AsyncStorage 3, `@react-native-async-storage/async-storage`, and NetInfo, `@react-native-community/netinfo`. `@convohop/react` needs React 18 or later.

## Connect

```ts include=examples/src/client.ts#connect
```

`createPlatform` gives the client what Hermes lacks: secure random UUIDs, SHA-256 and a WHATWG `URL`, with NetInfo's connectivity and the app's lifecycle from `AppState`. Without NetInfo, the client assumes the device is online.

`asyncRecoveryStorage` keeps sends that the authority hasn't confirmed, the conversations' replay positions and the outbox, so that they survive the app's restarts. It holds their inputs, including message text, but never tokens. It belongs to one user, so `claimStorage` deletes what another user left before the client reads it.

## Renew the session

Sessions expire, after 15 minutes by default. To renew the user's session before it does, pass `renewSession` to `connectUser` as `sessionRefresh`, then call `keepSessionAlive`:

```ts include=examples/src/client.ts#renew
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with the server SDK, as with [`sessions.renew`](../../typescript/reference/server.md#projectserverclientsessionsrenew-property) in TypeScript, taking the principal and device from that sign-in rather than from the request, and returns the `SessionBootstrap` that the renewal resolves with.

The client pauses its streams and lets its requests finish before it calls `sessionRefresh`, and checks the renewed session with ConvoHop before it uses it. Don't call the client from `sessionRefresh`: the call would wait for the renewal. While the app is in the background, a renewal can come due without running, so the client checks for one when the app returns to the foreground. [Session credential lifetime](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#session-credential-lifetime) covers what your endpoint must check, and what happens when a renewal fails.

## Show a conversation

```ts include=examples/src/client.ts#store
```

`ConversationStore` keeps one conversation current: its messages, oldest first, each member's read receipts, and the user's messages that aren't sent yet. Each change replaces the frozen `snapshot`. A dropped connection reconnects on its own and catches up, trying again when the device is back online or the app returns to the foreground. Keep one store per conversation, and one outbox per client.

- `store.loadOlder()` loads earlier messages while `snapshot.hasOlder` is true. `store.markRead()` tells the other members what the user has read.
- If the store's saved position in the conversation can't be used any more, for example because it expired, the store stops with `snapshot.resyncRequired` instead of silently skipping messages. `store.resync()` loads the conversation again.

## Send a message

```ts include=examples/src/client.ts#outbox
```

The outbox sends each conversation's messages in order. It waits while the device is offline, and gives each message one request ID, so a dropped connection never posts a message twice. With `persist`, messages that weren't sent yet survive the app's restarts, and the user's next outbox sends them. A failed message stays in `snapshot.pending` until you resend or discard it.

## Sign out

```ts include=examples/src/client.ts#sign-out
```

The recovery storage holds the user's unsent messages, including their text, so clear it when they sign out. Close the outbox first: until `close()` resolves, the sends it started can still save to the storage. If you call `client.send` yourself, wait for those calls to settle too. `storage.clear()` deletes everything in that storage, so keep your app's own data in another one.

With push notifications or calls, stop them before you call `signOut`, as the [push notifications](push.md#sign-out) and [calling](calling.md#sign-out) quickstarts show. Have your backend revoke the session, as with [`sessions.revoke`](../../typescript/reference/server.md#projectserverclientsessionsrevoke-property) in TypeScript, so that its token stops working before it expires.

## Use React

`@convohop/react` imports only `react` and `@convohop/client`, so its hooks work in React Native. Give its provider the user's client and outbox:

```tsx include=examples/src/react.tsx#provider
```

The provider doesn't own the client or the outbox. `useSessionRefresh` renews the session while it's mounted. Without `sessionRefresh` on the client, it throws `SESSION_REFRESH_REQUIRED` to the nearest error boundary.

`useConversation` follows a conversation with a `ConversationStore` while the component is mounted, and returns the store's snapshot and actions:

```tsx include=examples/src/react.tsx#conversation
```

The view's `status` is `idle` until the component's first effect creates the store, and `send` throws until then. `useTyping` sends throttled typing signals while the user writes. Other members' typing isn't delivered to clients yet. `useMediaConnection` needs a browser: connect calls as the [calling quickstart](calling.md) shows.

## Without the store

`ConversationStore` and the outbox use `watch` and `send`, which you can also use yourself.

### Watch a conversation's events

`watch` replays the conversation's events from the cursor it saved last time, or from the start, and then delivers new events as they happen. Events say what changed, so read the current messages when one did.

```ts include=examples/src/client.ts#watch
```

Close the stream when the screen goes away. If the saved cursor can't be used any more, for example because it expired, `watch` fails instead of silently skipping history. [Chat and replay](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#chat-and-replay) describes how to recover.

### Send with your own request ID

```ts include=examples/src/client.ts#send
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
