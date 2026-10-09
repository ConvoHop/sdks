# Flutter client quickstart

Use ConvoHop in your users' Flutter apps with `package:convohop`: connect with the session your backend issued, show a conversation and keep it current, and send messages that survive dropped connections and app restarts.

## Before you start

Your backend signs the user in and returns a session, as each [server quickstart](../../index.md#quickstarts) shows under "Sign in a user". The app never holds a backend key. [Install](../index.md#install) the package. The samples use these libraries, and `package:http` to renew the session:

```dart snippet=docs/languages/flutter/examples/lib/client.dart#imports
import 'dart:convert';
import 'dart:io';

import 'package:convohop/convohop.dart';
import 'package:convohop/io.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
```

## Connect

```dart snippet=docs/languages/flutter/examples/lib/client.dart#connect
// login is what your backend's login endpoint returned, decoded with jsonDecode: the session bootstrap from the
// server SDK, with baseUrl and projectId. See the server quickstart. storage is a directory that only your app can
// read, for example one under path_provider's getApplicationSupportDirectory().
Future<ConvoHopClient> connectUser(Object? login, Directory storage, {SessionRefresh? sessionRefresh}) async {
  final (baseUrl, projectId) = switch (login) {
    {'baseUrl': final String baseUrl, 'projectId': final String projectId} => (baseUrl, projectId),
    _ => throw const FormatException('Invalid login response'),
  };
  final bootstrap = SessionBootstrap.fromJson(login);
  final session = bootstrap.session ?? (throw const FormatException('The login response has no session'));
  final client = ConvoHopClient(
    baseUrl: baseUrl,
    projectId: projectId,
    incarnation: session.incarnation,
    principalId: session.principalId,
    sessionToken: bootstrap.sessionToken,
    // Keeps unconfirmed sends, unsent messages and stored conversations, never tokens.
    recoveryStorage: FileRecoveryStorage(storage),
    sessionRefresh: sessionRefresh, // Optional: renews the session before it expires.
  );
  try {
    await client.initialize();
    // Finishes sends that an earlier run of the app left unconfirmed.
    await client.recoverPending((error) => debugPrint("Couldn't recover an earlier send: $error"));
  } on Object {
    client.close();
    rethrow;
  }
  return client;
}
```

`FileRecoveryStorage` keeps what the client mustn't lose when the app stops: sends that the authority hasn't confirmed, unsent messages and stored conversations, including their text, but never tokens. `recoverPending` finishes the unconfirmed sends. Give each signed-in user a directory that only your app can read.

## Renew the session

Sessions expire, after 15 minutes by default. To renew the user's session before it does, pass `renewWith(...)` to `connectUser` as `sessionRefresh`, then call `keepSessionAlive`:

```dart snippet=docs/languages/flutter/examples/lib/client.dart#renew
// Pass renewWith(...) to connectUser as sessionRefresh. The client calls it with the session's metadata, never its
// token. endpoint is your backend's, behind your app's own sign-in, so give it an http.Client that sends your app's
// credentials. Your backend renews the session with the server SDK.
SessionRefresh renewWith(http.Client backend, Uri endpoint) {
  return (Session current) async {
    final response = await backend
        .post(
          endpoint,
          headers: {'content-type': 'application/json'},
          body: jsonEncode({'sessionId': current.sessionId, 'expectedRevision': current.sessionRevision}),
        )
        .timeout(const Duration(seconds: 10)); // The client's requests and streams wait until this settles.
    if (response.statusCode != 200) {
      throw http.ClientException('Session renewal failed with HTTP ${response.statusCode}', endpoint);
    }
    // The client checks the renewed session with ConvoHop before it uses it.
    return SessionBootstrap.fromJson(jsonDecode(response.body));
  };
}

// Renews the session before it expires, 5 minutes ahead by default, and again before each renewal expires, until you
// close the refresher. Close it before the client.
SessionRefresher keepSessionAlive(ConvoHopClient client, {required void Function() signInAgain}) {
  late final SessionRefresher refresher;
  refresher = SessionRefresher(
    client,
    onError: (error) {
      debugPrint("Couldn't renew the session: $error");
      // It stopped for good, for example because the session expired: close the client and sign in again.
      if (!refresher.active) signInAgain();
    },
  );
  return refresher;
}
```

The renewal endpoint is your backend's, behind your app's own sign-in. It renews the session with the [`renewSession`](../../operations/communication/renewSession.md) operation through a server SDK, taking the principal and device from that sign-in rather than from the request, and returns the session bootstrap.

While `sessionRefresh` runs, the client's requests wait and its streams pause. It checks the renewed session with ConvoHop before it uses it. Don't call the client from `sessionRefresh`: the call would wait for the renewal. Timers don't run while the app is suspended, so call `refresher.check()` when the app returns to the foreground.

## Show a conversation

```dart snippet=docs/languages/flutter/examples/lib/client.dart#store
// One outbox for the signed-in user. It keeps unsent messages in the client's recoveryStorage, so they survive app
// restarts. Close it when the user signs out.
Future<ConvoHopOutbox> openOutbox(ConvoHopClient client) async {
  final outbox = ConvoHopOutbox(client, onError: (error) => debugPrint("A message wasn't sent: $error"));
  await outbox.initialize(); // Loads what an earlier run left unsent, and starts sending it.
  return outbox;
}

// Loads a conversation, keeps it current and renders every change. Close the store when the view goes away.
ConversationStore showConversation(
  ConvoHopClient client,
  ConvoHopOutbox outbox,
  String conversationId,
  void Function(ConversationSnapshot snapshot) render,
) {
  final store = ConversationStore(
    client,
    conversationId,
    outbox: outbox,
    persist: true, // Shows the stored conversation at once next time, while it catches up.
    onError: (error) => debugPrint('The conversation store hit an error: $error'),
  );
  render(store.snapshot); // changes doesn't replay snapshots from before you listen.
  store.changes.listen(render);
  return store;
}
```

`ConversationStore` keeps one conversation current: its messages, oldest first, each member's read receipts, and the user's messages that aren't sent yet. Each change is a new snapshot on `changes`. After a dropped connection, the store reconnects with backoff and catches up from the last event it applied. Keep one store per conversation, and one outbox per client.

- `store.loadOlder()` loads earlier messages while `snapshot.hasOlder` is true. `store.reconnect()` skips the backoff, for example when connectivity returns.
- If the store's position in the conversation can't be used any more, for example because the user's visibility changed or retained history expired, the snapshot's status becomes `resyncRequired` instead of the store silently skipping messages. `store.resync()` loads the conversation again.

## Send a message

```dart snippet=docs/languages/flutter/examples/lib/client.dart#outbox
// The message shows in snapshot.pending at once, and moves to snapshot.messages once ConvoHop commits it.
Future<OutboxItem?> sendDraft(ConversationStore store, String draft) async {
  final text = draft.trim();
  if (text.isEmpty) return null;
  return store.send(text);
}

// What to show next to a message in snapshot.pending.
String pendingLabel(OutboxItem item) => switch (item.state) {
  // While the connection is down, the outbox tries again with the same request ID, so it posts once.
  OutboxState.queued || OutboxState.sending => 'Sending…',
  OutboxState.sent => 'Sent',
  // Offer outbox.resend(item.requestId), which sends the text as a new message, and outbox.discard(item.requestId).
  OutboxState.failed => 'Not sent',
  // An attempt may have been committed. outbox.resolve(item.requestId) asks again; resending can post it twice.
  OutboxState.unknown => 'Not confirmed',
};
```

The outbox sends each conversation's messages in order, and gives each message one request ID for life, so a dropped connection never posts a message twice. Messages that weren't sent yet survive app restarts in the client's recovery storage. While the authority is unreachable, waiting doesn't spend a message's retry budget. Call `outbox.flush()` when connectivity returns. A failed message stays in `snapshot.pending` until you resend or discard it. The outbox holds at most 100 unsent messages.

## Show read receipts and activity

```dart snippet=docs/languages/flutter/examples/lib/client.dart#receipts
// Call it while the conversation is on screen, for example on each snapshot while the app is in the foreground.
Future<void> markSeen(ConversationStore store) async {
  if (store.snapshot.unreadCount == 0) return;
  try {
    await store.markRead(); // Reports that this user read through the newest message.
  } on Object catch (error) {
    debugPrint("Couldn't report the read receipt: $error"); // The next call tries again.
  }
}

// What to show under one of this user's own messages.
String? readLabel(ConversationSnapshot snapshot, Message message) {
  if (message.authorId != snapshot.principalId) return null;
  final readers = snapshot.readBy(message); // The other members whose read receipt covers it.
  return readers.isEmpty ? null : 'Seen by ${readers.length}';
}
```

`markRead()` reports that the user read through the newest message, unless their receipt already covers it. A change to what the user can see invalidates older receipts.

ConvoHop doesn't publish online status to clients. A snapshot derives recent activity from when each member last wrote, edited or reported a receipt in the conversation, so show it as "recently active", not "online":

```dart snippet=docs/languages/flutter/examples/lib/client.dart#activity
// What to show next to a member: whether they wrote, edited or read in the conversation within 5 minutes.
String? activityLabel(ConversationSnapshot snapshot, String principalId) =>
    snapshot.isRecentlyActive(principalId) ? 'Recently active' : null;
```

## Show that the user is typing

```dart snippet=docs/languages/flutter/examples/lib/client.dart#typing
// One indicator per conversation view. Close it when the view goes away.
TypingIndicator typingIn(ConvoHopClient client, String conversationId) =>
    TypingIndicator(client, conversationId, onError: (error) => debugPrint("Couldn't signal typing: $error"));

// Call it from the text field's onChanged, and call typing.stop() when the user sends.
void draftChanged(TypingIndicator typing, String draft) {
  if (draft.trim().isEmpty) {
    typing.stop();
  } else {
    typing.keystroke();
  }
}
```

`TypingIndicator` signals at most once every 3 seconds while the user types, and stops by itself 5 seconds after the last keystroke. Signals are single attempts that are never retried. They're outbound only: ConvoHop doesn't deliver other members' typing to clients. When the project doesn't offer typing, the indicator reports `FEATURE_UNSUPPORTED` to `onError` and stops signaling.

## Sign out

```dart snippet=docs/languages/flutter/examples/lib/client.dart#sign-out
// storage is the directory you gave the client's FileRecoveryStorage. It holds unsent messages and stored
// conversations, including their text.
Future<void> signOut({
  required ConvoHopClient client,
  required ConvoHopOutbox outbox,
  required Iterable<ConversationStore> stores,
  required Directory storage,
  SessionRefresher? refresher,
}) async {
  refresher?.close();
  // Each completes once it has stopped writing to the storage, the outbox once the send it started has settled.
  await Future.wait([for (final store in stores) store.close()]);
  await outbox.close();
  client.close();
  if (await storage.exists()) await storage.delete(recursive: true);
}
```

The storage directory holds the user's unsent messages and stored conversations, including their text, so delete it when they sign out. Close the stores and the outbox first: until their `close()` completes, they can still write to it. If you call `client.send` yourself, wait for those calls to settle too.

Have your backend revoke the session with the [`revokeSession`](../../operations/communication/revokeSession.md) operation, so that its token stops working before it expires. To stop push notifications too, see [sign out](push.md#sign-out) in the push notifications quickstart.

## Without the store

`ConversationStore` and the outbox use `watch` and `send`, which you can also use yourself.

### Watch a conversation's events

`watch` replays the conversation's events from the cursor it saved last time, or from the start, and then delivers new events as they happen. Events say what changed, so read the current messages when one did.

```dart snippet=docs/languages/flutter/examples/lib/client.dart#watch
// Renders the newest messages and keeps them current. Close the stream when the view goes away.
Future<ConversationStream> watchConversation(
  ConvoHopClient client,
  String conversationId,
  void Function(List<Message> messages) render,
) async {
  Future<void> refresh() async => render((await client.messages(conversationId)).items); // Newest first.
  await refresh();
  return client.watch(conversationId, (events) async {
    // Events say what changed, such as message.created. Read the messages again when one did.
    if (events.any((event) => event.type.startsWith('message.'))) await refresh();
  }, (error) => debugPrint('The conversation stream was interrupted: $error'));
}
```

Close the stream when the view goes away. If the authority can't continue from the saved cursor, for example after the user's visible history changed, `watch` reports `HistoryResyncRequired` instead of silently skipping history. `client.resyncAuthorizedHistory` replays what the user can see now.

### Send with your own request ID

```dart snippet=docs/languages/flutter/examples/lib/client.dart#send
// Keep requestId with the draft until the send succeeds, and reuse it if you send the draft again.
Future<String> sendMessage(ConvoHopClient client, String conversationId, String text, String requestId) async {
  final ack = await client.send(conversationId, text, requestId: requestId);
  return ack.messageId; // Committed by the authority. Other devices get it through their streams.
}
```

Create the request ID when the user writes the message, for example with `newRequestId()`, and keep it with the draft. If the connection drops during a send, `client.send` throws a `ConvoHopProblem` whose `outcome` is `unknown`. Sending the same text again with the same request ID posts it once, whether or not the first attempt reached the authority. The SDK sends a request at most three times, within 60 seconds of the first attempt. Reusing a request ID with different text throws `IDEMPOTENCY_CONFLICT`.

## Next steps

- [Calling quickstart](calling.md): start and join calls in a conversation.
- [Push notifications quickstart](push.md): register devices, open notifications and answer calls.
- [`ConvoHopClient` reference](../reference/convohop.md#convohopclient-class): every method, with the operation it sends.
- [The SDK's README](https://github.com/ConvoHop/sdks/blob/main/flutter/README.md): platform setup, the data the SDK keeps on the device, and its limitations.
