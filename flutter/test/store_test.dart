import 'dart:async';
import 'dart:convert';

import 'package:convohop/convohop.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/fake_time.dart';
import 'support/realtime_fakes.dart';
import 'support/test_data.dart';

const _storeKey = 'convohop.store:$projectId:$principalId:$conversationId';
const _cursorKey = 'convohop.cursor:$projectId:$principalId:$conversationId';
const _otherIncarnation = '0fffffff-ffff-4fff-8fff-ffffffffffff';
const _fullLoad = <String>['GetConversation', 'Messages', 'Receipts', 'Route', 'Events'];

typedef _Answer = FutureOr<http.Response> Function(String requestId, Map<String, Object?> input);

Matcher _problem(String code) => isA<ConvoHopProblem>().having((problem) => problem.code, 'code', code);

/// One conversation's authority. Its messages, events and receipts share one
/// sequence, as on the server. It records each request under its operation
/// name without the `Communication` prefix, then answers it from a
/// per-operation script or its state. Offline, requests fail before reaching
/// it.
final class _Authority {
  bool online = true;
  int latest = 0;
  String membershipEpoch = '1';
  String visibilityEpoch = '1';
  final List<Map<String, Object?>> messages = <Map<String, Object?>>[];
  final List<Map<String, Object?>> events = <Map<String, Object?>>[];
  final Map<String, Map<String, Object?>> receipts = <String, Map<String, Object?>>{};
  final List<(String, String, Map<String, Object?>)> calls = <(String, String, Map<String, Object?>)>[];
  final Map<String, List<_Answer>> _scripts = <String, List<_Answer>>{};

  void answer(String operation, _Answer answer) => _scripts.putIfAbsent(operation, () => <_Answer>[]).add(answer);

  List<String> get operations => <String>[for (final (operation, _, _) in calls) operation];

  List<Map<String, Object?>> inputs(String operation) => <Map<String, Object?>>[
    for (final (name, _, input) in calls)
      if (name == operation) input,
  ];

  http.Client get httpClient => mockGraphQL((request, body) {
    final operation = (body['operationName']! as String).replaceFirst('Communication', '');
    final variables = body['variables']! as Map<String, Object?>;
    final id = (variables['context']! as Map<String, Object?>)['requestId']! as String;
    final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
    calls.add((operation, id, input));
    if (!online) throw http.ClientException('offline');
    final script = _scripts[operation];
    if (script != null && script.isNotEmpty) return script.removeAt(0)(id, input);
    return respond(operation, id, input);
  });

  /// The answer from the authority's state.
  http.Response respond(String operation, String id, Map<String, Object?> input) {
    switch (operation) {
      case 'GetConversation':
        return jsonResponse(
          gqlEnvelope('getConversation', id, <String, Object?>{
            ...conversation(),
            'latestSequence': '$latest',
            'membership': <String, Object?>{
              ...member(),
              'membershipEpoch': membershipEpoch,
              'visibilityEpoch': visibilityEpoch,
            },
          }),
        );
      case 'Messages':
        final before = input['beforeSequence'] as String?;
        final eligible = <Map<String, Object?>>[
          for (final message in messages.reversed)
            if (before == null || _sequence(message) < BigInt.parse(before)) message,
        ];
        return jsonResponse(
          gqlEnvelope('messages', id, <String, Object?>{
            'items': eligible.take(100).toList(),
            'complete': eligible.length <= 100,
            'refreshRequired': false,
            'nextCursor': null,
          }),
        );
      case 'GetMessage':
        for (final message in messages) {
          if (message['messageId'] == input['messageId']) return jsonResponse(gqlEnvelope('getMessage', id, message));
        }
        return jsonResponse(gqlError('NOT_FOUND', status: 404));
      case 'Events':
        final after = (input['after'] as Map<String, Object?>?)?['sequence'] as String?;
        return jsonResponse(gqlEnvelope('events', id, page(after: after ?? '0')));
      case 'Receipts':
        return jsonResponse(
          gqlEnvelope('receipts', id, <String, Object?>{
            'items': receipts.values.toList(),
            'complete': true,
            'refreshRequired': false,
            'nextCursor': null,
          }),
        );
      case 'ReportReceipt':
        if (input['membershipEpoch'] != membershipEpoch || input['visibilityEpoch'] != visibilityEpoch) {
          return jsonResponse(gqlError('REVISION_CONFLICT', status: 409));
        }
        read(principalId, input['throughSequence']! as String);
        return jsonResponse(gqlEnvelope('reportReceipt', id, receipts[principalId], status: 'committed'));
      case 'SendMessage':
        final sent = post(input['text']! as String, author: principalId);
        final sequence = sent['sequence']! as String;
        return jsonResponse(
          gqlEnvelope('sendMessage', id, <String, Object?>{
            ...messageAck(sequence: sequence),
            'messageId': sent['messageId'],
            'cursor': cursor(sequence: sequence),
          }, status: 'committed'),
        );
      default:
        return jsonResponse(okFor('Communication$operation', id, input));
    }
  }

  /// The events after [after], through the newest.
  Map<String, Object?> page({String after = '0'}) => <String, Object?>{
    'items': <Map<String, Object?>>[
      for (final event in events)
        if (_sequence(event) > BigInt.parse(after)) event,
    ],
    'complete': true,
    'refreshRequired': false,
    'nextCursor': cursor(sequence: '$latest'),
  };

  Map<String, Object?> post(String text, {String author = otherPrincipalId}) {
    final sequence = _next();
    final id = _id('5e000000', sequence);
    final posted = <String, Object?>{...message(text: text, sequence: sequence), 'messageId': id, 'authorId': author};
    messages.add(posted);
    _append(
      sequence,
      'message.created',
      <String, Object?>{'kind': 'message', 'id': id},
      <String, Object?>{'messageId': id, 'revision': '1', 'revisionSequence': sequence},
    );
    return posted;
  }

  void delete(String id) {
    final index = messages.indexWhere((message) => message['messageId'] == id);
    final sequence = _next();
    messages[index] = <String, Object?>{
      ...messages[index],
      'deleted': true,
      'text': null,
      'props': null,
      'revision': '2',
      'revisionSequence': sequence,
      'editedAt': timestamp,
    };
    _append(
      sequence,
      'message.deleted',
      <String, Object?>{'kind': 'message', 'id': id},
      <String, Object?>{'messageId': id, 'revision': '2', 'revisionSequence': sequence},
    );
  }

  void read(String principal, String through) {
    final sequence = _next();
    receipts[principal] = <String, Object?>{
      ...receipt(through: through, id: principal),
      'membershipEpoch': membershipEpoch,
      'visibilityEpoch': visibilityEpoch,
    };
    _append(
      sequence,
      'receipt.reported',
      <String, Object?>{'kind': 'member', 'id': principal},
      <String, Object?>{
        'principalId': principal,
        'membershipEpoch': membershipEpoch,
        'visibilityEpoch': visibilityEpoch,
        'kind': 'read',
        'throughSequence': through,
      },
    );
  }

  void memberEvent(String type, String principal, {String membership = '1', String visibility = '1'}) {
    final sequence = _next();
    _append(
      sequence,
      type,
      <String, Object?>{'kind': 'member', 'id': principal},
      <String, Object?>{
        'principalId': principal,
        'membershipEpoch': membership,
        'visibilityEpoch': visibility,
        'revision': '2',
      },
    );
  }

  void update() {
    final sequence = _next();
    _append(sequence, 'conversation.updated', <String, Object?>{
      'kind': 'conversation',
      'id': conversationId,
    }, <String, Object?>{});
  }

  String _next() => '${++latest}';

  void _append(String sequence, String type, Map<String, Object?> subject, Map<String, Object?> payload) {
    final template = event(sequence: sequence, type: type);
    events.add(<String, Object?>{
      ...template,
      'eventId': _id('e0000000', sequence),
      'subjectRef': subject,
      // Generated decoders require every payload field.
      'payload': <String, Object?>{
        for (final key in (template['payload']! as Map<String, Object?>).keys) key: null,
        ...payload,
      },
    });
  }

  static BigInt _sequence(Map<String, Object?> item) => BigInt.parse(item['sequence']! as String);

  static String _id(String prefix, String sequence) =>
      '$prefix-0000-4000-8000-${int.parse(sequence).toRadixString(16).padLeft(12, '0')}';
}

/// A client, an optional outbox and a store following [authority] over fake
/// realtime sockets, on [async]'s clock.
final class _Setup {
  _Setup(
    this.async,
    this.authority, {
    RecoveryStorage? storage,
    bool withOutbox = false,
    bool persist = false,
    int maxMessages = 100,
    bool failingHandler = false,
  }) {
    int now() => fixedClock() + async.elapsed.inMilliseconds;
    client = ConvoHopClient(
      baseUrl: 'https://authority.example',
      projectId: projectId,
      principalId: principalId,
      sessionToken: 'fake-session-token',
      incarnation: incarnation,
      recoveryStorage: storage,
      httpClient: authority.httpClient,
      realtimeConnector: connector.call,
      clock: now,
    );
    outbox = withOutbox ? ConvoHopOutbox(client, clock: now, random: NoJitter(), persist: false) : null;
    store = ConversationStore(
      client,
      conversationId,
      outbox: outbox,
      persist: persist,
      maxMessages: maxMessages,
      onError: (error) {
        errors.add(error);
        if (failingHandler) throw StateError('The app failed');
      },
      random: NoJitter(),
    );
    async.flushMicrotasks();
  }

  final FakeAsync async;
  final _Authority authority;
  final FakeRealtimeConnector connector = FakeRealtimeConnector();
  final List<Object> errors = <Object>[];
  late final ConvoHopClient client;
  late final ConvoHopOutbox? outbox;
  late final ConversationStore store;

  ConversationSnapshot get snapshot => store.snapshot;

  List<String?> get texts => <String?>[for (final message in store.snapshot.messages) message.text];

  FakeRealtimeSocket get socket => connector.sockets.last;

  String get _subscription => socket.sent.lastWhere((frame) => frame['type'] == 'subscribe')['id']! as String;

  void acknowledge() {
    socket.server(<String, Object?>{'type': 'connection_ack'});
    async.flushMicrotasks();
  }

  /// Delivers [page] over the current subscription. The stream skips events
  /// it already applied; frames stay under 64 KiB.
  void push(Map<String, Object?> page) {
    socket.server(<String, Object?>{
      'type': 'next',
      'id': _subscription,
      'payload': <String, Object?>{
        'data': <String, Object?>{'conversationEvents': page},
      },
    });
    async.flushMicrotasks();
  }

  void close() {
    settled(async, store.close());
    if (outbox case final outbox?) settled(async, outbox.close());
    client.close();
  }
}

void main() {
  test('conversation store applies ordered messages, tombstones and persists only when enabled', () async {
    final storage = MemoryRecoveryStorage();
    final connector = FakeRealtimeConnector();
    final edited = <String, Object?>{...message(text: 'edited', sequence: '1'), 'revision': '2'};
    final deleted = <String, Object?>{
      ...message(text: 'gone', sequence: '2', deleted: true),
      'messageId': 'abcdefab-cdef-4abc-8def-abcdefabcdef',
    };
    final errors = <Object>[];
    final client = clientWith(
      mockGraphQL((request, body) {
        final variables = body['variables'] as Map<String, Object?>;
        final context = variables['context'] as Map<String, Object?>;
        final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
        if (body['operationName'] == 'CommunicationMessages') {
          return jsonResponse(
            gqlEnvelope('messages', context['requestId'] as String, <String, Object?>{
              'items': <Object?>[deleted, edited],
              'complete': true,
              'refreshRequired': false,
              'nextCursor': null,
            }),
          );
        }
        return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
      }),
      storage: storage,
      realtime: connector.call,
    );
    final store = ConversationStore(client, conversationId, persist: true, maxMessages: 100, onError: errors.add);
    await pumpEventQueue(times: 20);
    expect(errors, isEmpty);
    expect(store.snapshot.status, ConversationStoreStatus.ready);
    expect(store.snapshot.messages.map((item) => item.sequence), <String>['1', '2']);
    expect(store.snapshot.messages.first.text, 'edited');
    expect(store.snapshot.messages.last.deleted, isTrue);
    final storeEntries = storage.items.entries.where((entry) => entry.key.startsWith('convohop.store')).toList();
    expect(storeEntries, isNotEmpty);
    expect(jsonDecode(storeEntries.single.value), isA<Object>());

    await store.close();
    final nonPersistent = ConversationStore(client, conversationId, persist: false, maxMessages: 100);
    await pumpEventQueue(times: 10);
    await nonPersistent.close();
    expect(storage.items.entries.where((entry) => entry.key.startsWith('convohop.store')), hasLength(1));
    client.close();
  });

  test('loads, follows events and shows an optimistic send until its message arrives', () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      final setup = _Setup(async, authority, withOutbox: true);
      final store = setup.store;
      expect(authority.operations, _fullLoad);
      expect(authority.inputs('Events').single['after'], cursor());
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, true));
      expect(setup.texts, <String>['first']);
      expect(setup.socket.sent, <Object>[
        <String, Object?>{
          'type': 'connection_init',
          'payload': <String, Object?>{
            'projectId': projectId,
            'incarnation': incarnation,
            'token': 'fake-session-token',
          },
        },
      ]);
      setup.acknowledge();
      final subscribe = setup.socket.sent.last;
      expect(subscribe['type'], 'subscribe');
      final variables = (subscribe['payload']! as Map<String, Object?>)['variables']! as Map<String, Object?>;
      expect(variables['input'], <String, Object?>{'conversationId': conversationId, 'limit': 50, 'after': cursor()});

      final applied = <String>[];
      store.events.listen((event) => applied.add(event.type));
      final sending = Completer<void>(), fetching = Completer<void>();
      authority
        ..answer('SendMessage', (id, input) async {
          await sending.future;
          return authority.respond('SendMessage', id, input);
        })
        ..answer('GetMessage', (id, input) async {
          await fetching.future;
          return authority.respond('GetMessage', id, input);
        })
        ..calls.clear();
      settled(async, store.send('hello'));
      expect(authority.operations, <String>['ResolveRequest', 'SendMessage']);
      final pending = setup.snapshot.pending.single;
      expect((pending.text, pending.state), ('hello', OutboxState.sending));

      // Committed: it stays pending, now sent, until the store has its message.
      sending.complete();
      async.flushMicrotasks();
      final sent = setup.snapshot.pending.single;
      expect((sent.requestId, sent.state, sent.ack?.sequence), (pending.requestId, OutboxState.sent, '2'));
      expect(setup.outbox!.items, isEmpty);
      expect(authority.operations.last, 'GetMessage');
      expect(setup.texts, <String>['first']);

      fetching.complete();
      async.flushMicrotasks();
      expect(setup.snapshot.pending, isEmpty);
      expect(setup.texts, <String>['first', 'hello']);
      expect(setup.snapshot.messages.last.authorId, principalId);

      // Its event changes nothing more.
      authority.calls.clear();
      setup.push(authority.page());
      expect(authority.calls, isEmpty);
      expect(applied, <String>['message.created']);

      authority.post('reply');
      setup.push(authority.page());
      expect(authority.operations, <String>['GetMessage']);
      expect(setup.texts, <String>['first', 'hello', 'reply']);
      expect(setup.snapshot.messages.last.authorId, otherPrincipalId);
      expect(applied, <String>['message.created', 'message.created']);
      expect(setup.errors, isEmpty);

      setup.close();
      expect(setup.snapshot.status, ConversationStoreStatus.closed);
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('resumes after its position when the socket drops and backs off after the stream ends', () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      final setup = _Setup(async, authority);
      final store = setup.store;
      setup.acknowledge();

      // The stream reconnects after a second plus jitter and replays what it missed.
      authority.calls.clear();
      unawaited(setup.socket.serverClose());
      authority.post('while down');
      async.elapse(const Duration(milliseconds: 999));
      expect(authority.calls, isEmpty);
      async.elapse(const Duration(milliseconds: 500));
      expect(authority.operations, <String>['Route', 'Events', 'GetMessage']);
      expect(authority.inputs('Events').single['after'], cursor());
      expect(setup.texts, <String>['first', 'while down']);
      expect(setup.connector.sockets, hasLength(2));

      // A terminal close ends the stream; the store reports it and reconnects after its own backoff.
      setup.acknowledge();
      authority.calls.clear();
      unawaited(setup.socket.serverClose(4401));
      async.flushMicrotasks();
      expect(setup.snapshot.error, _problem('UNAUTHENTICATED'));
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, false));
      expect(setup.errors.single, same(setup.snapshot.error));
      async.elapse(const Duration(milliseconds: 999));
      expect(authority.calls, isEmpty);
      async.elapse(const Duration(milliseconds: 1));
      expect(authority.operations, <String>['Events']);
      expect(authority.inputs('Events').single['after'], cursor(sequence: '2'));
      expect(setup.connector.sockets, hasLength(3));
      expect((setup.snapshot.connected, setup.snapshot.error), (true, null));

      final replaced = setup.socket;
      authority.calls.clear();
      settled(async, store.reconnect());
      expect(replaced.closedByClient, isTrue);
      expect(authority.operations, <String>['Events']);
      expect(setup.connector.sockets, hasLength(4));
      expect(setup.snapshot.connected, isTrue);
      expect(setup.errors, hasLength(1));

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('retries the first load with backoff while offline and loads at once on reconnect', () {
    fakeAsync((async) {
      final authority = _Authority()
        ..post('first')
        ..online = false;
      final setup = _Setup(async, authority);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.loading, false));
      expect(setup.snapshot.error, _problem('TRANSPORT_UNKNOWN'));
      expect(authority.operations, <String>['GetConversation']);
      async.elapse(const Duration(milliseconds: 999));
      expect(authority.calls, hasLength(1));
      async.elapse(const Duration(milliseconds: 1));
      expect(authority.calls, hasLength(2));
      async.elapse(const Duration(milliseconds: 1999));
      expect(authority.calls, hasLength(2));
      async.elapse(const Duration(milliseconds: 1));
      expect(authority.operations, <String>['GetConversation', 'GetConversation', 'GetConversation']);

      authority
        ..online = true
        ..calls.clear();
      settled(async, setup.store.reconnect());
      expect(authority.operations, _fullLoad);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, true));
      expect(setup.snapshot.error, isNull);
      expect(setup.texts, <String>['first']);
      expect(setup.errors, <Matcher>[for (var i = 0; i < 3; i++) _problem('TRANSPORT_UNKNOWN')]);
      async.elapse(const Duration(minutes: 1));
      expect(authority.calls, hasLength(_fullLoad.length));

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test("keeps retrying after the app's error handler throws", () {
    fakeAsync((async) {
      final authority = _Authority()
        ..post('first')
        ..online = false;
      final setup = _Setup(async, authority, failingHandler: true);
      expect(setup.errors, <Matcher>[_problem('TRANSPORT_UNKNOWN')]);
      expect(setup.snapshot.status, ConversationStoreStatus.loading);

      authority.online = true;
      async.elapse(const Duration(seconds: 1));
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, true));
      expect(setup.texts, <String>['first']);
      expect(setup.errors, hasLength(1));

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('routes again after WRONG_REGION, then loads', () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      authority.answer('GetConversation', (id, input) => jsonResponse(gqlError('WRONG_REGION')));
      final setup = _Setup(async, authority);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.loading, false));
      expect(setup.snapshot.error, _problem('WRONG_REGION'));
      expect(authority.operations, <String>['GetConversation']);

      // Following the conversation then uses the route it just read.
      authority.calls.clear();
      async.elapse(const Duration(seconds: 1));
      expect(authority.operations, <String>['Route', 'GetConversation', 'Messages', 'Receipts', 'Events']);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, true));
      expect(setup.texts, <String>['first']);

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test("retries what the shared classifier retries, never sooner than its retryAfter, and stops on limits", () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      authority
        ..answer('GetConversation', (id, input) => jsonResponse(gqlError('RATE_LIMITED', status: 429, retryAfter: '7')))
        ..answer('GetConversation', (id, input) => http.Response('<html>Bad gateway</html>', 502))
        ..answer('GetConversation', (id, input) => jsonResponse(gqlError('NEWLY_INVENTED', status: 503)));
      final setup = _Setup(async, authority);
      expect(setup.snapshot.error, _problem('RATE_LIMITED'));
      async.elapse(const Duration(milliseconds: 6999));
      expect(authority.calls, hasLength(1));
      async.elapse(const Duration(milliseconds: 1));
      expect(authority.calls, hasLength(2));
      expect(setup.snapshot.error, _problem('INVALID_RESPONSE'));
      async.elapse(const Duration(seconds: 2));
      expect(authority.calls, hasLength(3));
      expect(setup.snapshot.error, _problem('NEWLY_INVENTED'));
      expect(setup.snapshot.status, ConversationStoreStatus.loading);
      authority.calls.clear();
      async.elapse(const Duration(seconds: 4));
      expect(authority.operations, _fullLoad);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, true));
      setup.close();
      expect(async.pendingTimers, isEmpty);
    });

    for (final (code, status) in <(String, int)>[('QUOTA_EXCEEDED', 429), ('PLAN_LIMIT_EXCEEDED', 403)]) {
      fakeAsync((async) {
        final authority = _Authority()..post('first');
        authority.answer(
          'GetConversation',
          (id, input) => jsonResponse(gqlError(code, status: status, retryAfter: '60')),
        );
        final setup = _Setup(async, authority);
        expect(setup.snapshot.status, ConversationStoreStatus.failed);
        expect(setup.snapshot.error, _problem(code));
        async.elapse(const Duration(minutes: 5));
        expect(authority.operations, <String>['GetConversation']);

        // The app decides when to try again.
        settled(async, setup.store.reconnect());
        expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, true));
        setup.close();
        expect(async.pendingTimers, isEmpty);
      });
    }
  });

  test('a quota close stops the store; a rate-limited close leaves reconnecting to the stream', () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      final setup = _Setup(async, authority);
      setup.acknowledge();
      authority.calls.clear();
      unawaited(setup.socket.serverClose(4429, 'RATE_LIMITED retryAfter=4'));
      async.flushMicrotasks();
      expect(setup.snapshot.error, _problem('RATE_LIMITED'));
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, false));
      async.elapse(const Duration(milliseconds: 3999));
      expect(authority.calls, isEmpty);
      async.elapse(const Duration(milliseconds: 500));
      expect(authority.operations, <String>['Route', 'Events']);
      expect(setup.connector.sockets, hasLength(2));

      setup.acknowledge();
      authority.calls.clear();
      unawaited(setup.socket.serverClose(4429, 'QUOTA_EXCEEDED retryAfter=60 meter=messages'));
      async.flushMicrotasks();
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.failed, false));
      expect(setup.snapshot.error, _problem('QUOTA_EXCEEDED'));
      async.elapse(const Duration(minutes: 5));
      expect(authority.calls, isEmpty);
      expect(setup.connector.sockets, hasLength(2));
      expect(setup.texts, <String>['first']);

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('stops following at a spend stop until the app reconnects', () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      final setup = _Setup(async, authority);
      final store = setup.store;
      setup.acknowledge();

      authority.calls.clear();
      unawaited(setup.socket.serverClose(4402, 'CREDITS_EXHAUSTED meter=mau'));
      async.flushMicrotasks();
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.failed, false));
      expect(
        setup.snapshot.error,
        isA<ConvoHopProblem>()
            .having((problem) => problem.code, 'code', 'CREDITS_EXHAUSTED')
            .having((problem) => problem.status, 'status', 402),
      );
      expect(setup.errors.single, same(setup.snapshot.error));
      async.elapse(const Duration(minutes: 10));
      expect(authority.calls, isEmpty);
      expect(setup.connector.sockets, hasLength(1));

      // Once credits are added or the cap raised, the app reconnects.
      settled(async, store.reconnect());
      expect(authority.operations, <String>['Events']);
      expect(setup.connector.sockets, hasLength(2));
      expect(
        (setup.snapshot.status, setup.snapshot.connected, setup.snapshot.error),
        (ConversationStoreStatus.ready, true, null),
      );
      expect(setup.texts, <String>['first']);

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test("waits out unverified spend's retryAfter, even when the app reconnects", () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      final setup = _Setup(async, authority);
      final store = setup.store;
      setup.acknowledge();

      authority.calls.clear();
      unawaited(setup.socket.serverClose(4503, 'SPEND_UNVERIFIED retryAfter=5 meter=mau'));
      async.flushMicrotasks();
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, false));
      expect(
        setup.snapshot.error,
        isA<ConvoHopProblem>()
            .having((problem) => problem.code, 'code', 'SPEND_UNVERIFIED')
            .having((problem) => problem.retryAfter, 'retryAfter', 5),
      );

      settled(async, store.reconnect());
      async.elapse(const Duration(milliseconds: 4999));
      settled(async, store.reconnect());
      expect(authority.calls, isEmpty);
      expect(setup.connector.sockets, hasLength(1));
      async.elapse(const Duration(milliseconds: 500));
      expect(authority.operations, <String>['Route', 'Events']);
      expect(setup.connector.sockets, hasLength(2));
      expect(setup.errors, hasLength(1));

      // Once the wait is over, reconnect() replaces the stream again.
      setup.acknowledge();
      authority.calls.clear();
      settled(async, store.reconnect());
      expect(authority.operations, <String>['Events']);
      expect(setup.connector.sockets, hasLength(3));
      expect(
        (setup.snapshot.status, setup.snapshot.connected, setup.snapshot.error),
        (ConversationStoreStatus.ready, true, null),
      );

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test("waits out a failed load's retryAfter, even when the app reconnects", () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      authority.answer(
        'GetConversation',
        (id, input) => jsonResponse(gqlError('SPEND_UNVERIFIED', status: 503, retryAfter: '5')),
      );
      final setup = _Setup(async, authority);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.loading, false));
      expect(setup.snapshot.error, _problem('SPEND_UNVERIFIED'));

      authority.calls.clear();
      settled(async, setup.store.reconnect());
      async.elapse(const Duration(milliseconds: 4999));
      settled(async, setup.store.reconnect());
      expect(authority.calls, isEmpty);
      async.elapse(const Duration(milliseconds: 1));
      expect(authority.operations, _fullLoad);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, true));
      expect(setup.texts, <String>['first']);
      expect(setup.errors, <Matcher>[_problem('SPEND_UNVERIFIED')]);

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('close completes while listeners are paused and returns one future', () {
    fakeAsync((async) {
      final authority = _Authority()..post('first');
      final storage = MemoryRecoveryStorage();
      final setup = _Setup(async, authority, storage: storage, persist: true);
      expect(setup.texts, <String>['first']);
      final statuses = <ConversationStoreStatus>[];
      var ended = 0;
      final paused = <StreamSubscription<Object?>>[
        setup.store.changes.listen((snapshot) => statuses.add(snapshot.status), onDone: () => ended++)..pause(),
        setup.store.events.listen(null, onDone: () => ended++)..pause(),
      ];

      final closing = setup.store.close();
      expect(setup.store.close(), same(closing));
      settled(async, closing);
      expect(storage.items, contains(_storeKey));
      expect(statuses, isEmpty);
      expect(ended, 0);
      for (final subscription in paused) {
        subscription.resume();
      }
      async.flushMicrotasks();
      expect(statuses, <ConversationStoreStatus>[ConversationStoreStatus.closed]);
      expect(ended, 2);

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('requires resync instead of skipping history, and forgets its stored copy until then', () {
    fakeAsync((async) {
      final storage = MemoryRecoveryStorage();
      final authority = _Authority()..post('first');
      final setup = _Setup(async, authority, storage: storage, persist: true);
      final store = setup.store;
      setup.acknowledge();
      expect(storage.items.containsKey(_storeKey), isTrue);

      authority
        ..answer('Events', (id, input) => jsonResponse(gqlError('CURSOR_EXPIRED', status: 409)))
        ..calls.clear();
      unawaited(setup.socket.serverClose());
      async.elapse(const Duration(milliseconds: 1500));
      expect(authority.operations, <String>['Route', 'Events']);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.resyncRequired, false));
      expect(setup.snapshot.error, _problem('CURSOR_EXPIRED'));
      expect(storage.items.containsKey(_storeKey), isFalse);
      expect(setup.texts, <String>['first']);
      expect(failureOf(async, store.reconnect()), isStateError);
      async.elapse(const Duration(minutes: 1));
      expect(authority.calls, hasLength(2));

      authority
        ..post('second')
        ..calls.clear();
      settled(async, store.resync());
      expect(authority.operations, <String>['GetConversation', 'Messages', 'Receipts', 'Events']);
      expect((setup.snapshot.status, setup.snapshot.connected), (ConversationStoreStatus.ready, true));
      expect(setup.snapshot.error, isNull);
      expect(setup.texts, <String>['first', 'second']);
      expect(storage.items.containsKey(_storeKey), isTrue);

      setup
        ..acknowledge()
        ..push(<String, Object?>{...authority.page(), 'refreshRequired': true});
      expect(setup.snapshot.status, ConversationStoreStatus.resyncRequired);
      expect(setup.snapshot.error, isA<HistoryResyncRequired>());
      expect(storage.items.containsKey(_storeKey), isFalse);

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('counts unread messages, reports reads once and drops receipts whose epochs changed', () {
    fakeAsync((async) {
      final authority = _Authority()
        ..post('one', author: principalId)
        ..post('two')
        ..post('three')
        ..post('four', author: principalId);
      authority.receipts
        ..[principalId] = receipt()
        ..[otherPrincipalId] = receipt(id: otherPrincipalId);
      final setup = _Setup(async, authority);
      final store = setup.store;
      setup.acknowledge();
      expect(setup.snapshot.unreadCount, 2);
      expect(setup.snapshot.readBy(setup.snapshot.messages.first), <String>[otherPrincipalId]);
      expect(setup.snapshot.readBy(setup.snapshot.messages.last), isEmpty);

      authority.calls.clear();
      settled(async, store.markRead());
      expect(authority.operations, <String>['ReportReceipt']);
      expect(authority.calls.single.$3, <String, Object?>{
        'conversationId': conversationId,
        'kind': 'read',
        'membershipEpoch': '1',
        'visibilityEpoch': '1',
        'throughSequence': '4',
      });
      expect(setup.snapshot.unreadCount, 0);
      settled(async, store.markRead());
      expect(authority.calls, hasLength(1));

      authority.read(otherPrincipalId, '4');
      setup.push(authority.page());
      expect(setup.snapshot.readBy(setup.snapshot.messages.last), <String>[otherPrincipalId]);

      // This user's visibility changed: the report is rejected, so the store rereads the membership and reports again.
      authority
        ..visibilityEpoch = '2'
        ..post('five');
      setup.push(authority.page());
      expect(setup.snapshot.unreadCount, 1);
      authority.calls.clear();
      settled(async, store.markRead());
      expect(authority.operations, <String>['ReportReceipt', 'GetConversation', 'ReportReceipt']);
      expect(authority.inputs('ReportReceipt').map((input) => (input['visibilityEpoch'], input['throughSequence'])), [
        ('1', '7'),
        ('2', '7'),
      ]);
      expect(authority.calls.first.$2, isNot(authority.calls.last.$2));
      final own = setup.snapshot.ownReceipt!;
      expect((own.membershipEpoch, own.visibilityEpoch, own.readThroughSequence), ('1', '2', '7'));
      expect(setup.snapshot.conversation?.membership?.visibilityEpoch, '2');
      expect(setup.snapshot.unreadCount, 0);

      // Another member's visibility change drops their receipt without a request.
      authority
        ..memberEvent('member.historyExpanded', otherPrincipalId, visibility: '2')
        ..calls.clear();
      setup.push(authority.page());
      expect(authority.calls, isEmpty);
      expect(setup.snapshot.receipts.keys, <String>[principalId]);

      // A change to this user's membership rereads the conversation.
      authority.memberEvent('member.roleChanged', principalId, visibility: '2');
      setup.push(authority.page());
      expect(authority.operations, <String>['GetConversation']);
      expect(setup.snapshot.ownReceipt?.readThroughSequence, '7');

      // A reread that shows newer epochs for this user drops their old receipt.
      authority
        ..visibilityEpoch = '3'
        ..update()
        ..calls.clear();
      setup.push(authority.page());
      expect(authority.operations, <String>['GetConversation']);
      expect(setup.snapshot.ownReceipt, isNull);
      expect(setup.snapshot.unreadCount, 3);
      expect(setup.errors, isEmpty);

      setup.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('stores its state without tokens, shows it at once next time and catches up', () {
    fakeAsync((async) {
      final storage = MemoryRecoveryStorage();
      final authority = _Authority()
        ..post('first')
        ..post('second', author: principalId);
      authority.receipts[otherPrincipalId] = receipt(through: '2', id: otherPrincipalId);
      final first = _Setup(async, authority, storage: storage, persist: true)..acknowledge();
      expect(storage.items.keys.toSet(), <String>{_storeKey, _cursorKey});
      expect(storage.items.values.join('\n'), isNot(contains('fake-session-token')));
      final stored = jsonDecode(storage.items[_storeKey]!) as Map<String, Object?>;
      expect(stored.keys.toSet(), <String>{'conversation', 'messages', 'receipts', 'hasOlder', 'through'});
      expect(stored['through'], cursor(sequence: '2'));
      expect(stored['hasOlder'], isFalse);
      expect(
        <Object?>[for (final item in stored['messages']! as List<Object?>) (item! as Map<String, Object?>)['text']],
        <String>['first', 'second'],
      );
      first.close();

      authority
        ..post('third')
        ..online = false
        ..calls.clear();
      final next = _Setup(async, authority, storage: storage, persist: true);
      expect((next.snapshot.status, next.snapshot.connected), (ConversationStoreStatus.ready, false));
      expect(next.texts, <String>['first', 'second']);
      expect(next.snapshot.readBy(next.snapshot.messages.last), <String>[otherPrincipalId]);
      expect(next.snapshot.error, _problem('TRANSPORT_UNKNOWN'));
      expect(authority.operations, <String>['Route']);

      authority.online = true;
      async.elapse(const Duration(seconds: 1));
      expect(authority.operations, <String>['Route', 'Route', 'Events', 'GetMessage']);
      expect(authority.inputs('Events').single['after'], cursor(sequence: '2'));
      expect(next.texts, <String>['first', 'second', 'third']);
      expect((next.snapshot.connected, next.snapshot.error), (true, null));

      next.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('discards a stored conversation from another incarnation, or that it cannot read, and loads it again', () {
    fakeAsync((async) {
      final storage = MemoryRecoveryStorage();
      final authority = _Authority()..post('first');
      _Setup(async, authority, storage: storage, persist: true).close();
      final saved = jsonDecode(storage.items[_storeKey]!) as Map<String, Object?>;

      storage.setItem(
        _storeKey,
        jsonEncode(<String, Object?>{
          ...saved,
          'through': <String, Object?>{...cursor(), 'incarnation': _otherIncarnation},
        }),
      );
      authority
        ..post('second')
        ..calls.clear();
      final moved = _Setup(async, authority, storage: storage, persist: true);
      expect(authority.operations, _fullLoad);
      expect(moved.errors, isEmpty);
      expect(moved.texts, <String>['first', 'second']);
      expect((jsonDecode(storage.items[_storeKey]!) as Map<String, Object?>)['through'], cursor(sequence: '2'));
      moved.close();

      storage.setItem(_storeKey, jsonEncode(<String, Object?>{...saved, 'messages': 'none'}));
      authority.calls.clear();
      final unreadable = _Setup(async, authority, storage: storage, persist: true);
      expect(unreadable.errors.single, isFormatException);
      expect(authority.operations, _fullLoad);
      expect(unreadable.snapshot.status, ConversationStoreStatus.ready);
      expect(unreadable.texts, <String>['first', 'second']);

      unreadable.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('keeps a deleted message as a tombstone without its text, also when stored', () {
    fakeAsync((async) {
      final storage = MemoryRecoveryStorage();
      final authority = _Authority()
        ..post('first')
        ..post('second');
      final live = _Setup(async, authority, storage: storage, persist: true)..acknowledge();
      authority
        ..delete(authority.messages.first['messageId']! as String)
        ..calls.clear();
      live.push(authority.page());
      expect(authority.operations, <String>['GetMessage']);
      final tombstone = live.snapshot.messages.first;
      expect((tombstone.deleted, tombstone.text, tombstone.props, tombstone.revision), (true, null, null, '2'));
      expect(live.texts, <String?>[null, 'second']);
      expect(live.snapshot.unreadCount, 1);
      live.close();

      final stored = jsonDecode(storage.items[_storeKey]!) as Map<String, Object?>;
      final first = (stored['messages']! as List<Object?>).first! as Map<String, Object?>;
      expect((first['deleted'], first['text'], first['props']), (true, null, null));
      authority.online = false;
      final restored = _Setup(async, authority, storage: storage, persist: true);
      expect(restored.snapshot.messages.first.deleted, isTrue);
      expect(restored.texts, <String?>[null, 'second']);

      restored.close();
      expect(async.pendingTimers, isEmpty);
    });
  });

  test('trims to its capacity, pages older history and stops when closed', () {
    fakeAsync((async) {
      final storage = MemoryRecoveryStorage();
      final authority = _Authority();
      for (var i = 1; i <= 250; i++) {
        authority.post('message $i');
      }
      final setup = _Setup(async, authority, storage: storage, persist: true)..acknowledge();
      final store = setup.store;
      (int, String, String, bool) window() {
        final messages = setup.snapshot.messages;
        return (messages.length, messages.first.sequence, messages.last.sequence, setup.snapshot.hasOlder);
      }

      expect(window(), (100, '151', '250', true));
      authority.post('live');
      setup.push(authority.page(after: '250'));
      expect(window(), (100, '152', '251', true));

      expect(settled(async, store.loadOlder()), isTrue);
      expect(window(), (200, '52', '251', true));
      expect(settled(async, store.loadOlder()), isFalse);
      expect(window(), (251, '1', '251', false));
      expect(authority.inputs('Messages').map((input) => input['beforeSequence']), <String?>[null, '152', '52']);
      final stored = jsonDecode(storage.items[_storeKey]!) as Map<String, Object?>;
      final kept = stored['messages']! as List<Object?>;
      expect((kept.length, (kept.first! as Map<String, Object?>)['sequence'], stored['hasOlder']), (200, '52', true));
      authority.calls.clear();
      expect(settled(async, store.loadOlder()), isFalse);
      expect(authority.calls, isEmpty);

      setup.close();
      expect(setup.snapshot.status, ConversationStoreStatus.closed);
      final closed = isA<StateError>().having((error) => error.message, 'message', contains('closed'));
      expect(() => store.send('late'), throwsA(closed));
      expect(store.loadOlder, throwsA(closed));
      expect(store.markRead, throwsA(closed));
      expect(failureOf(async, store.reconnect()), closed);
      expect(failureOf(async, store.resync()), closed);
      expect(setup.errors, isEmpty);
      expect(async.pendingTimers, isEmpty);
    });
  });
}
