import 'dart:async';
import 'dart:io';

import 'package:convohop/convohop.dart';
import 'package:convohop_docs_examples/client.dart';
import 'package:convohop_docs_examples/push.dart' show pushText;
import 'package:flutter_test/flutter_test.dart';

import 'backend.dart';
import 'mock.dart';
import 'payloads.dart';

late MockTarget target;
late Backend backend;

void main() {
  setUpAll(() async {
    target = await MockTarget.start();
    backend = Backend(target);
  });
  tearDownAll(() => target.close());

  test("a watching user sees another user's message", () async {
    final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Weekend');
    final alice = await connect(aliceLogin);
    final bob = await connect(bobLogin);

    final renders = <List<Message>>[];
    final delivered = Completer<List<Message>>();
    final stream = await watchConversation(alice, conversationId, (messages) {
      renders.add(messages);
      if (messages.isNotEmpty && !delivered.isCompleted) delivered.complete(messages);
    });
    addTearDown(stream.close);
    expect(renders.first, isEmpty);
    final messageId = await sendMessage(bob, conversationId, 'Hi Alice', newRequestId());
    final messages = await delivered.future.timeout(const Duration(seconds: 15));
    expect(
      [
        for (final message in messages) [message.messageId, message.authorId, message.text],
      ],
      [
        [messageId, principalOf(bobLogin), 'Hi Alice'],
      ],
    );
  });

  for (final action in ['dropBeforeCommit', 'dropAfterCommit']) {
    test('sending a draft again with its request ID posts it once ($action)', () async {
      final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Drafts');
      final bob = await connect(bobLogin);
      await target.injectFault('sendMessage', action);
      final requestId = newRequestId();
      await expectLater(sendMessage(bob, conversationId, 'Still there?', requestId), throwsA(unknownOutcome));
      final messageId = await sendMessage(bob, conversationId, 'Still there?', requestId);
      final page = await bob.messages(conversationId);
      expect(
        [
          for (final message in page.items) [message.messageId, message.text],
        ],
        [
          [messageId, 'Still there?'],
        ],
      );
      expect(await target.attempts('sendMessage', requestId), [true, false]);
      // A request ID belongs to one draft. Changed text needs a new one.
      await expectLater(
        sendMessage(bob, conversationId, 'Still there??', requestId),
        throwsA(isA<ConvoHopProblem>().having((problem) => problem.code, 'code', 'IDEMPOTENCY_CONFLICT')),
      );
    });

    test('connectUser finishes a send that an earlier run left unconfirmed ($action)', () async {
      final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Restarts');
      final storage = await temporaryStorage(); // Outlives the app run, like the app's support directory.
      final before = await connect(bobLogin, storage);
      await target.injectFault('sendMessage', action);
      final requestId = newRequestId();
      await expectLater(
        sendMessage(before, conversationId, 'Sent before the restart', requestId),
        throwsA(unknownOutcome),
      );
      before.close();

      final after = await connect(bobLogin, storage);
      final page = await after.messages(conversationId);
      expect([for (final message in page.items) message.text], ['Sent before the restart']);
      expect(await target.attempts('sendMessage', requestId), action == 'dropBeforeCommit' ? [true, false] : [true]);
    });
  }

  test('a conversation store shows a draft at once, then the messages ConvoHop committed', () async {
    final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Store');
    final alice = await connect(aliceLogin);
    final bob = await connect(bobLogin);
    final outbox = await outboxFor(alice);
    final renders = <ConversationSnapshot>[];
    final store = storeFor(alice, outbox, conversationId, renders.add);
    expect(renders.single.status, ConversationStoreStatus.loading);
    await snapshotWhere(store, (snapshot) => snapshot.status == ConversationStoreStatus.ready);

    expect(await sendDraft(store, '  '), isNull);
    final item = (await sendDraft(store, ' Hi Bob '))!;
    expect(item.text, 'Hi Bob');
    expect(
      [
        for (final pending in store.snapshot.pending) [pending.requestId, pendingLabel(pending)],
      ],
      [
        [item.requestId, 'Sending…'],
      ],
    );
    await snapshotWhere(store, (snapshot) => snapshot.pending.isEmpty && snapshot.messages.length == 1);

    await sendMessage(bob, conversationId, 'Hi Alice', newRequestId());
    final snapshot = await snapshotWhere(store, (snapshot) => snapshot.messages.length == 2);
    expect(
      [
        for (final message in snapshot.messages) [message.authorId, message.text],
      ],
      [
        [principalOf(aliceLogin), 'Hi Bob'],
        [principalOf(bobLogin), 'Hi Alice'],
      ],
    );
    expect(renders.last.messages, hasLength(2));
  });

  for (final action in ['dropBeforeCommit', 'dropAfterCommit']) {
    test('the outbox posts a draft once when the connection drops ($action)', () async {
      final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Outbox');
      final alice = await connect(aliceLogin);
      final outbox = await outboxFor(alice);
      final store = storeFor(alice, outbox, conversationId, (_) {});
      await target.injectFault('sendMessage', action);
      final item = (await sendDraft(store, 'Still there?'))!;
      final snapshot = await snapshotWhere(
        store,
        (snapshot) => snapshot.pending.isEmpty && snapshot.messages.isNotEmpty,
      );
      expect([for (final message in snapshot.messages) message.text], ['Still there?']);
      // The outbox looks up the request's outcome, and sends it again with the same request ID only if ConvoHop
      // hadn't committed it.
      expect(
        await target.attempts('sendMessage', item.requestId),
        action == 'dropBeforeCommit' ? [true, false] : [true],
      );
    });
  }

  test('read receipts show who saw a message, and who was recently active', () async {
    final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Receipts');
    final alice = await connect(aliceLogin);
    final bob = await connect(bobLogin);
    final aliceStore = storeFor(alice, await outboxFor(alice), conversationId, (_) {});
    final bobStore = storeFor(bob, await outboxFor(bob), conversationId, (_) {});
    await snapshotWhere(aliceStore, (snapshot) => snapshot.status == ConversationStoreStatus.ready);
    await sendDraft(aliceStore, 'Seen this?');

    final unread = await snapshotWhere(bobStore, (snapshot) => snapshot.unreadCount == 1);
    expect(readLabel(unread, unread.messages.single), isNull); // Not Bob's own message.
    await markSeen(bobStore);
    expect(bobStore.snapshot.unreadCount, 0);

    final seen = await snapshotWhere(
      aliceStore,
      (snapshot) => snapshot.messages.length == 1 && readLabel(snapshot, snapshot.messages.single) != null,
    );
    expect(readLabel(seen, seen.messages.single), 'Seen by 1');
    expect(activityLabel(seen, principalOf(bobLogin)), 'Recently active');
    expect(activityLabel(seen, newRequestId()), isNull);
  });

  test('typing signals stop once the authority says it doesn’t support them', () async {
    final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Typing');
    final alice = await connect(aliceLogin);
    final typing = typingIn(alice, conversationId);
    draftChanged(typing, 'H');
    expect(typing.typing, isTrue);
    await typing.close();
    // The conformance mock doesn't offer typing signals.
    expect(typing.supported, isFalse);
    expect(
      [
        for (final request in await target.requests())
          if (request['field'] == 'typing') request['code'],
      ],
      ['FEATURE_UNSUPPORTED'],
    );
  });

  test("a message push shows its preview, or the message fetched with the user's session", () async {
    final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Push');
    final alice = await connect(aliceLogin);
    final bob = await connect(bobLogin);
    final messageId = await sendMessage(bob, conversationId, 'See you at 3pm', newRequestId());
    // The push payload contract's message to Alice, with and without a preview.
    MessageNotification pushFor(String vector) =>
        parseNotificationPayload(
              fcmData(vector, {
                'eventId': newRequestId(),
                'projectId': alice.projectId,
                'recipientId': principalOf(aliceLogin),
                'conversationId': conversationId,
                'senderId': principalOf(bobLogin),
                'messageId': messageId,
              }),
            )!
            as MessageNotification;

    expect(await pushText(alice, pushFor('message-preview')), 'Are we still on for 3pm?'); // The vector's body.
    expect(await pushText(alice, pushFor('message-preview-disabled')), 'See you at 3pm');
    // Only the recipient's session fetches it.
    await expectLater(pushText(bob, pushFor('message-preview-disabled')), throwsStateError);
  });

  test('signing out while a message is sending closes everything and deletes the stored data', () async {
    final (:aliceLogin, :bobLogin, :conversationId) = await twoMembers('Sign-out');
    final storage = await temporaryStorage();
    final alice = await connect(aliceLogin, storage);
    final outbox = await outboxFor(alice);
    final store = storeFor(alice, outbox, conversationId, (_) {});
    await sendDraft(store, 'Signing off');
    await snapshotWhere(store, (snapshot) => snapshot.pending.any((item) => item.state == OutboxState.sending));
    expect(storage.listSync(), isNotEmpty);

    await signOut(client: alice, outbox: outbox, stores: [store], storage: storage);
    expect(storage.existsSync(), isFalse);
    expect(store.snapshot.status, ConversationStoreStatus.closed);
    await expectLater(alice.messages(conversationId), throwsStateError);
  });
}

// Two signed-in users who share a new conversation.
Future<({Map<String, Object?> aliceLogin, Map<String, Object?> bobLogin, String conversationId})> twoMembers(
  String title,
) async {
  final aliceLogin = await backend.signIn('alice-${newRequestId()}');
  final bobLogin = await backend.signIn('bob-${newRequestId()}');
  final conversationId = await backend.createConversation(title, [principalOf(aliceLogin), principalOf(bobLogin)]);
  return (aliceLogin: aliceLogin, bobLogin: bobLogin, conversationId: conversationId);
}

Future<Directory> temporaryStorage() async {
  final directory = await Directory.systemTemp.createTemp('convohop_docs_');
  addTearDown(() async {
    if (await directory.exists()) await directory.delete(recursive: true);
  });
  return directory;
}

// Closed after the test, before its storage is deleted.
Future<ConvoHopClient> connect(Map<String, Object?> login, [Directory? storage]) async {
  final client = await connectUser(login, storage ?? await temporaryStorage());
  addTearDown(client.close);
  return client;
}

Future<ConvoHopOutbox> outboxFor(ConvoHopClient client) async {
  final outbox = await openOutbox(client);
  addTearDown(outbox.close);
  return outbox;
}

ConversationStore storeFor(
  ConvoHopClient client,
  ConvoHopOutbox outbox,
  String conversationId,
  void Function(ConversationSnapshot snapshot) render,
) {
  final store = showConversation(client, outbox, conversationId, render);
  addTearDown(store.close);
  return store;
}

final Matcher unknownOutcome = isA<ConvoHopProblem>().having((problem) => problem.outcome, 'outcome', 'unknown');

// Resolves with the store's first snapshot that passes check.
Future<ConversationSnapshot> snapshotWhere(
  ConversationStore store,
  bool Function(ConversationSnapshot snapshot) check,
) async {
  if (check(store.snapshot)) return store.snapshot;
  return store.changes.firstWhere(check).timeout(const Duration(seconds: 15));
}
