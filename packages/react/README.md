# ConvoHop React hooks

`@convohop/react` is a set of React hooks over
[`@convohop/client`](../client/README.md): conversations with optimistic,
offline-safe sends, typing signals, session renewal, live sessions and
browser media. It isn't published to a package registry yet. License:
[Apache-2.0](LICENSE).

Build and test from the repository's root npm workspace with Node.js 22+:

```sh
npm ci
npm run build
npm test --workspace @convohop/react
```

## Runtimes

- React 18 and later. CI runs the tests with React 18 and 19.
- `react` and `@convohop/client` are peer dependencies: your app creates the
  client, and the hooks use that same copy.
- The hooks import only `react` and `@convohop/client`, not `react-dom`, so
  they work with React DOM and React Native. On the server they render their
  idle state, because effects don't run there.
- `useMediaConnection` is for browsers. On React Native, connect media with
  `participation.connectWith` and a native LiveKit SDK, as
  [`@convohop/react-native`](../../docs/sdk-strategy.md#calls-with-the-official-livekit-sdks)
  does.

## Provider

```tsx
import { ConvoHopClient, Outbox } from "@convohop/client";
import { ConvoHopProvider } from "@convohop/react";

const client = new ConvoHopClient({ /* the user bootstrap from your backend */ recoveryStorage: localStorage });
await client.initialize();
const outbox = new Outbox(client, { persist: true }); // One per client.

root.render(
  <ConvoHopProvider client={client} outbox={outbox}>
    <App />
  </ConvoHopProvider>,
);
// On sign-out: unmount, then outbox.close().
```

The provider doesn't own the client or the outbox; close the outbox yourself.
Give it the app's outbox, so messages keep sending after the user leaves a
conversation. Without one, each conversation sends through an outbox of its
own, which stops when the component unmounts.

## Conversations

```tsx
import { useConversation, useTyping } from "@convohop/react";

function Thread({ conversationId }: { conversationId: string }) {
  const thread = useConversation(conversationId, { onError: report });
  const typing = useTyping(conversationId, { enabled: typingSupported });
  if (thread.status === "loading" || thread.status === "idle") return <Spinner />;
  return (
    <>
      {thread.hasOlder && <button onClick={() => void thread.loadOlder()}>Earlier</button>}
      {thread.messages.map(message => <Message key={message.messageId} message={message} />)}
      {thread.pending.map(entry => <Pending key={entry.requestId} entry={entry} />)}
      {thread.resyncRequired && <button onClick={() => void thread.resync()}>Reload</button>}
      <Composer onInput={typing.input} onSend={text => { typing.stop(); thread.send(text); }} />
    </>
  );
}
```

`useConversation` follows the conversation with a `ConversationStore` while
the component is mounted. It returns the store's snapshot (`status`,
`messages`, `pending`, `receipts`, `hasOlder`, `error`, `resyncRequired`)
and its actions. `send` throws, and the other actions reject, until the
store exists: after the first effect, and never for a `null` conversation
ID. `onEvent` receives every event the store applies, including live-session
events. `useOutbox()` returns the provider outbox's entries, for an "unsent
messages" view across conversations.

`useTyping` sends throttled typing signals. Pass
`capabilities().features?.typing === true` as `enabled` to skip projects
without typing; unmounting signals that typing stopped. `useSessionRefresh()` renews
the session before it expires while it's mounted. The client needs
`sessionRefresh`; without it, the hook throws `SESSION_REFRESH_REQUIRED` to
the nearest error boundary.

## Calls

```tsx
import { useLiveSession, useMediaConnection } from "@convohop/react";

function Call({ conversationId }: { conversationId: string }) {
  const live = useLiveSession(conversationId);
  const media = useMediaConnection();
  const join = async () => {
    const participation = await live.session!.join();
    await media.connect(participation); // From the click: one admission per attempt.
  };
  return (
    <>
      {live.session && media.status === "idle" && <button onClick={() => void join()}>Join</button>}
      {media.tracks.map(track => <Media key={track.trackId} element={track.element} />)}
      {media.audioBlocked && <button onClick={() => void media.enableAudio()}>Play audio</button>}
      {media.status === "disconnected" && <button onClick={() => void media.reconnect()}>Reconnect</button>}
    </>
  );
}

function Media({ element }: { element: HTMLMediaElement }) {
  const attach = useCallback((node: HTMLDivElement | null) => { node?.append(element); }, [element]);
  return <div ref={attach} />;
}
```

`useLiveSession` loads the conversation's current live session, or `null`.
It reloads after each live-session event that a mounted `useConversation`
for the same conversation receives under the same provider; otherwise call
`refresh()`, for example when a call push notification arrives.

`useMediaConnection` wraps `participation.connect` with `livekit-client`.
Call `connect` and `reconnect` from user gestures, never from an effect:
each attempt spends a single-use admission, and React's StrictMode runs
effects twice. The state shows the connection (`status`: `idle`,
`connecting`, `connected`, `resuming`, `disconnected` or `failed`), the
remote `tracks` and `audioBlocked`. Use `connection` for the microphone,
camera and stats. Unmounting disconnects; disconnecting doesn't leave the
live session.

## Push notifications

Subscribe from a user gesture, such as a click, with `subscribePush` from
`@convohop/client/push`; the [client README](../client/README.md#push-notifications)
shows the service worker.
