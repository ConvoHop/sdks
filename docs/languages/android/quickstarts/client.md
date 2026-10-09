# Android client quickstart

Use ConvoHop in your Android app with `com.convohop:convohop-android`: connect with the session your backend issued and keep it renewed, show a conversation from a local store and keep it current, and send messages optimistically through an outbox that survives dropped connections and restarts.

## Before you start

Your backend signs the user in and returns a session from ConvoHop, with the project's base URL and ID, as the [Java and Kotlin server quickstart](../../jvm/quickstarts/server.md#sign-in-a-user) shows. The SDK never holds a backend key. You need Android 7.0 (API 24) or later and the SDK ([install](../index.md#install)). Its suspending calls are main-safe, so call them from a coroutine, such as one from `lifecycleScope.launch`.

The samples on this page use these imports:

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#imports
```

## Connect

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#connect
```

`baseUrl` must be HTTPS, or loopback HTTP for local development. The client keeps the session token in memory only. `initialize()` loads the project's signed route before the first call.

`recoveryStorage` keeps the sends that ConvoHop hasn't confirmed: their request IDs, inputs, including message text, and outcomes, but never tokens. Name it after the project and user, as the sample does, so that users who share a device don't share it. At startup, `recoverPending` settles up to 16 sends that may still go through: those whose outcome is unknown, and those refused with a problem that resending can fix, such as `RATE_LIMITED`. It resends one under its original request ID when its last attempt failed transiently, such as with a lost connection, and its retry budget lasts. Otherwise it looks up its outcome without sending it again.

## Renew the session

Sessions expire. To renew the user's session before it does, pass a `SessionRefresh` to `connectUser`, then call `keepSessionAlive`:

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#renew
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with [`sessions().renew`](../../jvm/reference/server.md#projectserverclientsessionsrenew-method), taking the principal and device from that sign-in rather than from the request, and returns the `SessionBootstrap` it received.

`refreshAutomatically` renews 5 minutes to 30 seconds before the session expires, and retries failures with backoff. Concurrent renewals share one request. The client's live connections pause while the session renews, and it checks the renewed session with ConvoHop before it uses it. Don't call the client from `refresh`: the call would wait for the renewal.

`client.sessionRefreshState` says where renewal stands. `BLOCKED` means that a renewal couldn't be verified, and requests stay blocked: close the client and sign the user in again.

## Show a conversation

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#store
```

`ConvoHopStore` keeps each conversation's messages, and the user's messages that aren't sent yet, in SQLite. A timeline shows them at once, then catches up with ConvoHop and follows the conversation live. Keep one store per signed-in user, and close each timeline when its screen goes away.

- `timeline.items` lists the sent messages, `TimelineItem.Sent`, oldest first, then this device's `TimelineItem.Pending` messages until ConvoHop's history shows them. Use `item.key` as the list key.
- `timeline.loadOlder()` loads the previous page while `timeline.hasOlder` is true.
- `timeline.replay` is `CATCHING_UP`, `LIVE`, `RECONNECTING`, `PAUSED` or `CLOSED`.

## Send a message

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#outbox
```

Sends are optimistic: `timeline.send` stores the message and returns at once, and the outbox delivers it while the device is online, oldest first within each conversation. Every attempt reuses the message's request ID and payload, so ConvoHop applies it at most once. `store.outbox.pending` holds each unsent message's state:

| `PendingState` | Meaning |
| --- | --- |
| `QUEUED` | Waiting to be sent. Nothing was applied: it wasn't submitted yet, or ConvoHop refused the attempt, for example because the session expired. |
| `SENDING` | It may have been submitted. Until its outcome is known, it's resent only under the same request ID. |
| `SENT` | Committed. It leaves the outbox when the timeline shows it. |
| `UNCONFIRMED` | Three attempts or 60 seconds passed, and ConvoHop hasn't seen it. It may still commit, so it's never resent on its own. |
| `FAILED` | Not sent. ConvoHop rejected it, or three attempts or 60 seconds passed and none could have been applied. `errorCode` says why. |

A refusal that resending can't change, such as `QUOTA_EXCEEDED` or `PLAN_LIMIT_EXCEEDED`, fails the message at once. After other failures, such as a lost connection or `RATE_LIMITED`, the outbox keeps the message and tries again with backoff, never sooner than the `retryAfter` that ConvoHop asked for, even when the device comes back online.

`sendAgain` sends a copy of an `UNCONFIRMED` or `FAILED` message under a new request ID. An unconfirmed original may still commit and show twice, so ask the user first. `store.outbox.discard(requestId)` removes a message unless it's `SENDING`.

If the app is killed during a send, the next start resends the message under the same request ID, within the same three attempts and 60 seconds, then looks up its outcome. A message that wasn't submitted in time becomes `FAILED` with `RESOLUTION_REQUIRED`.

## Reconnect and resume

Timelines reconnect on their own. After a dropped connection, they catch up over HTTP from the last event they applied, then follow the conversation live again. While the session renews they pause, and they resume on the renewed session. When the network comes back, the store reconnects at once instead of waiting out its backoff, though never sooner than a `retryAfter` that ConvoHop asked for, and the outbox delivers what it holds.

A problem that reconnecting can't fix, such as `NOT_FOUND`, `FORBIDDEN` or `QUOTA_EXCEEDED`, or a response that breaks the protocol, stops the timeline: `timeline.replay` becomes `CLOSED`, and the store's error callback gets the error. Open a new timeline to try again.

## Typing and read receipts

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#typing
```

`keystroke()` signals that the user is typing at most every 3 seconds, and signals that they stopped 5 seconds after the last keystroke. `timeline.send` stops it too. Typing signals are ephemeral: they're never retried, and failures go to the store's error callback. Signal only when `client.capabilities().features?.typing` is true. ConvoHop doesn't deliver other members' typing to clients yet, and has no presence.

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#receipts
```

`markRead()` reports that the user read through the newest message the timeline holds. `timeline.receipts` holds each member's delivery and read progress by principal ID. Sequences are decimal strings, so compare them as numbers, as the sample does. A receipt counts only for the member's current membership and visibility: when either changes, timelines drop the old receipt.

## Sign out

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#sign-out
```

Signing out deletes the user's cached messages, including unsent ones, and the client's recovery file, which holds the text of unconfirmed sends. Have your backend revoke the session with [`sessions().revoke`](../../jvm/reference/server.md#projectserverclientsessionsrevoke-method), so that its token stops working before it expires. To stop the user's notifications on this device, see [stop notifications at sign-out](push.md#stop-notifications-at-sign-out).

## Without the store

You can also watch a conversation and send messages without the store.

### Watch a conversation's events

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#watch
```

`watch` replays the conversation's events from the cursor in recovery storage, or from the start, then follows the conversation live. Batches reach `apply` in order, and the cursor advances only after `apply` returns. Events say what changed, so read the current messages when one did. Close the stream when the screen goes away, and call `client.reconnectNow()` when the network comes back.

If ConvoHop requires a resynchronization, or the session no longer authorizes the replay, the stream closes and reports the error instead of skipping history. The SDK never resets a cursor on its own: `client.resyncAuthorizedHistory(conversationId, apply, onError)` replays the authorized history from the start.

### Send with your own request ID

```kotlin include=examples/src/main/kotlin/com/convohop/examples/Client.kt#send
```

Create the request ID when the user writes the message, for example with `UUID.randomUUID().toString()`, and keep it with the draft. If the connection drops during a send, `send` throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached ConvoHop. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`.

Recovery storage keeps at most 128 requests. When it's full, a new request makes room by forgetting one that can't be sent again: one that ConvoHop committed or rejected for good, or one whose three attempts or 60 seconds are spent. If there's none, `send` throws a `ConvoHopProblem` with code `RECOVERY_LIMIT` before sending anything. Resend or resolve the outstanding requests first.

## Next steps

- [Calling quickstart](calling.md): start, join and answer calls in a conversation.
- [Push notifications quickstart](push.md): show notifications for messages and calls when your app isn't open.
- [`ConvoHopClient` reference](../reference/android-core.md#convohopclient-class): every method, with the operation it sends.
- [`ConvoHopStore` reference](../reference/android-core.md#convohopstore-class): the store, its outbox and timelines.
