// Client quickstart snippets. test/client_test.dart runs them against the conformance mock, except session renewal,
// which the mock doesn't support, so the analyzer only checks it.

// #region imports
import 'dart:convert';
import 'dart:io';

import 'package:convohop/convohop.dart';
import 'package:convohop/io.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

// #endregion imports

// #region connect
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
// #endregion connect

// #region renew
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
// #endregion renew

// #region store
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
// #endregion store

// #region outbox
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
// #endregion outbox

// #region receipts
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
// #endregion receipts

// #region typing
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
// #endregion typing

// #region activity
// What to show next to a member: whether they wrote, edited or read in the conversation within 5 minutes.
String? activityLabel(ConversationSnapshot snapshot, String principalId) =>
    snapshot.isRecentlyActive(principalId) ? 'Recently active' : null;
// #endregion activity

// #region sign-out
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
// #endregion sign-out

// #region watch
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
// #endregion watch

// #region send
// Keep requestId with the draft until the send succeeds, and reuse it if you send the draft again.
Future<String> sendMessage(ConvoHopClient client, String conversationId, String text, String requestId) async {
  final ack = await client.send(conversationId, text, requestId: requestId);
  return ack.messageId; // Committed by the authority. Other devices get it through their streams.
}
// #endregion send
