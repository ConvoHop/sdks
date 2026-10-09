# Flutter client quickstart

Use ConvoHop in your users' Flutter apps with `package:convohop`: connect with the session your backend issued, show a conversation and keep it current, and send messages that survive dropped connections and app restarts.

## Before you start

Your backend signs the user in and returns a session, as each [server quickstart](../../index.md#quickstarts) shows under "Sign in a user". The app never holds a backend key. [Install](../index.md#install) the package. The samples use these libraries, and `package:http` to renew the session:

```dart include=examples/lib/client.dart#imports
```

## Connect

```dart include=examples/lib/client.dart#connect
```

`FileRecoveryStorage` keeps what the client mustn't lose when the app stops: sends that the authority hasn't confirmed, unsent messages and stored conversations, including their text, but never tokens. `recoverPending` finishes the unconfirmed sends. Give each signed-in user a directory that only your app can read.

## Renew the session

Sessions expire, after 15 minutes by default. To renew the user's session before it does, pass `renewWith(...)` to `connectUser` as `sessionRefresh`, then call `keepSessionAlive`:

```dart include=examples/lib/client.dart#renew
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with the [`renewSession`](../../operations/communication/renewSession.md) operation through a server SDK, taking the principal and device from that sign-in rather than from the request, and returns the session bootstrap.

While `sessionRefresh` runs, the client's requests wait and its streams pause. It checks the renewed session with ConvoHop before it uses it. Don't call the client from `sessionRefresh`: the call would wait for the renewal. Timers don't run while the app is suspended, so call `refresher.check()` when the app returns to the foreground.

## Show a conversation

```dart include=examples/lib/client.dart#store
```

`ConversationStore` keeps one conversation current: its messages, oldest first, each member's read receipts, and the user's messages that aren't sent yet. Each change is a new snapshot on `changes`. After a dropped connection, the store reconnects with backoff and catches up from the last event it applied. Keep one store per conversation, and one outbox per client.

- `store.loadOlder()` loads earlier messages while `snapshot.hasOlder` is true. `store.reconnect()` skips the backoff, for example when connectivity returns.
- If the store's position in the conversation can't be used any more, for example because the user's visibility changed or retained history expired, the snapshot's status becomes `resyncRequired` instead of the store silently skipping messages. `store.resync()` loads the conversation again.

## Send a message

```dart include=examples/lib/client.dart#outbox
```

The outbox sends each conversation's messages in order, and gives each message one request ID for life, so a dropped connection never posts a message twice. Messages that weren't sent yet survive app restarts in the client's recovery storage. While the authority is unreachable, waiting doesn't spend a message's retry budget. Call `outbox.flush()` when connectivity returns. A failed message stays in `snapshot.pending` until you resend or discard it. The outbox holds at most 100 unsent messages.

## Show read receipts and activity

```dart include=examples/lib/client.dart#receipts
```

`markRead()` reports that the user read through the newest message, unless their receipt already covers it. A change to what the user can see invalidates older receipts.

ConvoHop doesn't publish online status to clients. A snapshot derives recent activity from when each member last wrote, edited or reported a receipt in the conversation, so show it as "recently active", not "online":

```dart include=examples/lib/client.dart#activity
```

## Show that the user is typing

```dart include=examples/lib/client.dart#typing
```

`TypingIndicator` signals at most once every 3 seconds while the user types, and stops by itself 5 seconds after the last keystroke. Signals are single attempts that are never retried. They're outbound only: ConvoHop doesn't deliver other members' typing to clients. When the project doesn't offer typing, the indicator reports `FEATURE_UNSUPPORTED` to `onError` and stops signaling.

## Sign out

```dart include=examples/lib/client.dart#sign-out
```

The storage directory holds the user's unsent messages and stored conversations, including their text, so delete it when they sign out. Close the stores and the outbox first: until their `close()` completes, they can still write to it. If you call `client.send` yourself, wait for those calls to settle too.

Have your backend revoke the session with the [`revokeSession`](../../operations/communication/revokeSession.md) operation, so that its token stops working before it expires. To stop push notifications too, see [sign out](push.md#sign-out) in the push notifications quickstart.

## Without the store

`ConversationStore` and the outbox use `watch` and `send`, which you can also use yourself.

### Watch a conversation's events

`watch` replays the conversation's events from the cursor it saved last time, or from the start, and then delivers new events as they happen. Events say what changed, so read the current messages when one did.

```dart include=examples/lib/client.dart#watch
```

Close the stream when the view goes away. If the authority can't continue from the saved cursor, for example after the user's visible history changed, `watch` reports `HistoryResyncRequired` instead of silently skipping history. `client.resyncAuthorizedHistory` replays what the user can see now.

### Send with your own request ID

```dart include=examples/lib/client.dart#send
```

Create the request ID when the user writes the message, for example with `newRequestId()`, and keep it with the draft. If the connection drops during a send, `client.send` throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached the authority. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`.

## Next steps

- [Calling quickstart](calling.md): start and join calls in a conversation.
- [Push notifications quickstart](push.md): register devices, open notifications and answer calls.
- [`ConvoHopClient` reference](../reference/convohop.md#convohopclient-class): every method, with the operation it sends.
- [The SDK's README](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md): platform setup, the data the SDK keeps on the device, and its limitations.
