# TypeScript client quickstart

Use ConvoHop in your users' browsers with `@convohop/client`: connect with the session your backend issued, show a conversation and keep it current, and send messages that survive dropped connections and page reloads.

## Before you start

Your backend signs the user in and returns a session, as the [server quickstart](server.md#sign-in-a-user) shows. `@convohop/client` never holds a backend key. It targets the current and previous major versions of Chrome, Edge, Firefox and Safari. React Native isn't verified yet.

## Connect

```ts include=examples/src/client.ts#connect
```

`recoveryStorage` keeps sends that the authority hasn't confirmed, so that `recoverPending` can finish them after a reload. It holds their inputs, including message text, but never tokens. Use storage that only this user can read, not a shared computer's.

Sessions expire, after 15 minutes by default. To renew one without signing the user out, see [session credential lifetime](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#session-credential-lifetime).

## Show a conversation

`watch` replays the conversation's events from the cursor it saved last time, or from the start, and then delivers new events as they happen. Events say what changed, so read the current messages when one did.

```ts include=examples/src/client.ts#watch
```

Close the stream when the view goes away. If the saved cursor can't be used any more, for example because it expired, `watch` fails instead of silently skipping history. [Chat and replay](https://github.com/ConvoHop/sdks/blob/main/packages/client/README.md#chat-and-replay) describes how to recover.

## Send a message

```ts include=examples/src/client.ts#send
```

Create the request ID when the user writes the message, for example with `crypto.randomUUID()`, and keep it with the draft. If the connection drops during a send, `client.send` throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached the authority. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`.

## Next steps

- [Calling quickstart](calling.md): start and join calls in a conversation.
- [Push notifications quickstart](push.md): notify users who aren't watching.
- [`ConvoHopClient` reference](../reference/client.md#convohopclient-class): every method, with the operation it sends.
