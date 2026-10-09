import 'package:convohop/convohop.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_data.dart';

void main() {
  group('client operations', () {
    test('initializes route and verifies session refresh state', () async {
      var refreshes = 0;
      var currentSessionReads = 0;
      final client = ConvoHopClient(
        baseUrl: 'https://authority.example',
        projectId: projectId,
        principalId: principalId,
        sessionToken: 'fake-session-token',
        incarnation: incarnation,
        httpClient: mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          if (body['operationName'] == 'CommunicationCurrentSession') {
            currentSessionReads += 1;
            return jsonResponse(
              gqlEnvelope(
                'currentSession',
                context['requestId'] as String,
                session(
                  revision: currentSessionReads == 1 ? '1' : '2',
                  expiresAt: currentSessionReads == 1 ? '2026-10-10T12:10:00.000Z' : '2026-10-10T12:20:00.000Z',
                ),
              ),
            );
          }
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
        sessionRefresh: (binding) async {
          refreshes += 1;
          return SessionBootstrap.fromJson(sessionBootstrap());
        },
        clock: fixedClock,
      );

      expect(client.sessionRefreshState, SessionRefreshState.uninitialized);
      final route = await client.initialize();
      expect(route.projectId, projectId);
      expect(client.sessionRefreshState, SessionRefreshState.ready);
      final refreshed = await client.refreshSession();
      expect(refreshed.principalId, principalId);
      expect(refreshes, 1);
      client.close();
    });

    test('client wrappers validate arguments and decode send edit delete receipts', () async {
      final seenInputs = <String, Map<String, Object?>>{};
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          seenInputs[body['operationName'] as String] = input;
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
      );

      final sent = await client.send(
        conversationId,
        'hello',
        props: <String, Object?>{'mood': 'ok'},
        requestId: requestId,
      );
      expect(sent.cursor?.sequence, '1');
      final original = Message.fromJson(message());
      expect((await client.edit(original, 'edited')).text, 'edited');
      expect((await client.delete(original)).deleted, isTrue);
      expect(seenInputs['CommunicationSendMessage']?['props'], <String, Object?>{'mood': 'ok'});
      expect(() => client.messages(conversationId, beforeSequence: '01'), throwsArgumentError);
      expect(() => client.send('bad', 'hello'), throwsArgumentError);
      client.close();
    });

    test('events validate cursors and do not silently reset invalid pages', () async {
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          return jsonResponse(
            gqlEnvelope(
              'events',
              context['requestId'] as String,
              eventPage(
                items: <Map<String, Object?>>[event(sequence: '1')],
                sequence: '1',
              ),
            ),
          );
        }),
      );

      final page = await client.events(conversationId);
      expect(page.items.single.sequence, '1');
      await expectLater(
        client.events(
          conversationId,
          after: const Cursor(incarnation: incarnation, conversationId: conversationId, sequence: '2'),
        ),
        throwsFormatException,
      );
      await expectLater(
        client.events(
          conversationId,
          after: const Cursor(incarnation: otherPrincipalId, conversationId: conversationId, sequence: '1'),
        ),
        throwsFormatException,
      );
      client.close();
    });

    test('receipt typing inbox search and client requests preserve inputs', () async {
      final inputs = <String, Map<String, Object?>>{};
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          inputs[body['operationName'] as String] = input;
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
      );

      final read = await client.reportRead(conversationId, Member.fromJson(member()), '1');
      expect(read.readThroughSequence, '1');
      expect((await client.receipts(conversationId)).items.single.principalId, principalId);
      expect((await client.sendTyping(conversationId, isTyping: true)).accepted, isTrue);
      expect((await client.inbox(limit: 5)).items.single.conversationId, conversationId);
      expect(
        (await client.search('hello', conversationIds: <String>[conversationId])).items.single.message?.messageId,
        messageId,
      );
      expect((await client.requests.resolve(requestId)).state, 'notObservedYet');
      expect(inputs['CommunicationInbox']?['limit'], 5);
      expect(inputs['CommunicationSearch']?['scope'], <String, Object?>{
        'conversationIds': <Object?>[conversationId],
      });
      expect(() => client.search('x', conversationIds: <String>['bad']), throwsArgumentError);
      client.close();
    });

    test('recoverPending reports unresolved recovery errors without replacing identities', () async {
      final storage = MemoryRecoveryStorage();
      var online = false;
      final errors = <Object>[];
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          if (!online && body['operationName'] == 'CommunicationSendMessage') {
            throw Exception('offline');
          }
          if (body['operationName'] == 'CommunicationResolveRequest') {
            return jsonResponse(
              gqlEnvelope('resolveRequest', context['requestId'] as String, <String, Object?>{
                'requestId': input['requestId'],
                'state': 'stillProcessing',
                'checkedAt': timestamp,
                'receipt': null,
              }),
            );
          }
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
        storage: storage,
      );
      await expectLater(client.send(conversationId, 'offline', requestId: requestId), throwsA(isA<ConvoHopProblem>()));
      online = true;
      await client.recoverPending(errors.add);
      expect(errors, isNotEmpty);
      expect(storage.items.values.join('\n'), contains(requestId));
      client.close();
    });
  });
}
