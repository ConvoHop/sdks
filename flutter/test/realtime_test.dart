import 'dart:convert';

import 'package:convohop/convohop.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/realtime_fakes.dart';
import 'support/test_data.dart';

void main() {
  group('conversation stream', () {
    test('replays history then subscribes and delivers live frames', () async {
      final connector = FakeRealtimeConnector();
      final storage = MemoryRecoveryStorage();
      final applied = <Event>[];
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          if (body['operationName'] == 'CommunicationEvents') {
            final after = input['after'];
            final next = after == null ? '1' : '2';
            return jsonResponse(
              gqlEnvelope(
                'events',
                context['requestId'] as String,
                eventPage(
                  items: <Map<String, Object?>>[event(sequence: next)],
                  sequence: next,
                ),
              ),
            );
          }
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
        storage: storage,
        realtime: connector.call,
      );

      final stream = await client.watch(
        conversationId,
        (events) async => applied.addAll(events),
        expectAsync1((_) {}, count: 0),
      );
      expect(applied.map((event) => event.sequence), <String>['1']);
      final socket = connector.sockets.single;
      socket.server(<String, Object?>{'type': 'connection_ack'});
      await pumpEventQueue();
      expect(socket.sent.first['type'], 'connection_init');
      expect(socket.sent.last['type'], 'subscribe');
      final subscribe = socket.sent.last['payload'] as Map<String, Object?>;
      expect(jsonEncode(subscribe), contains('conversationEvents'));

      socket.server(<String, Object?>{
        'type': 'next',
        'id': socket.sent.last['id'],
        'payload': <String, Object?>{
          'data': <String, Object?>{
            'conversationEvents': eventPage(
              items: <Map<String, Object?>>[event(sequence: '2')],
              sequence: '2',
            ),
          },
        },
      });
      await pumpEventQueue();
      expect(applied.map((event) => event.sequence), <String>['1', '2']);
      expect((await client.storedCursor(conversationId))?.sequence, '2');
      stream.close();
      client.close();
    });

    test('reports resync-required pages and closes instead of resetting cursor', () async {
      final connector = FakeRealtimeConnector();
      final errors = <Object>[];
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
        realtime: connector.call,
      );

      final stream = await client.watch(conversationId, (_) async {}, errors.add);
      final socket = connector.sockets.single;
      socket.server(<String, Object?>{'type': 'connection_ack'});
      await pumpEventQueue();
      socket.server(<String, Object?>{
        'type': 'next',
        'id': socket.sent.last['id'],
        'payload': <String, Object?>{
          'data': <String, Object?>{
            'conversationEvents': <String, Object?>{...eventPage(), 'refreshRequired': true},
          },
        },
      });
      await pumpEventQueue();
      expect(stream.closed, isTrue);
      expect(errors, contains(isA<HistoryResyncRequired>()));
      client.close();
    });

    test('responds to ping and reports subscription errors', () async {
      final connector = FakeRealtimeConnector();
      final errors = <Object>[];
      final client = clientWith(
        mockGraphQL((request, body) {
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
          return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
        }),
        realtime: connector.call,
      );

      await client.watch(conversationId, (_) async {}, errors.add);
      final socket = connector.sockets.single;
      socket.server(<String, Object?>{'type': 'connection_ack'});
      await pumpEventQueue();
      socket.server(<String, Object?>{'type': 'ping'});
      await pumpEventQueue();
      expect(socket.sent.last, <String, Object?>{'type': 'pong'});
      socket.server(<String, Object?>{
        'type': 'error',
        'id': socket.sent.where((frame) => frame['type'] == 'subscribe').last['id'],
        'payload': <Object?>[
          <String, Object?>{
            'message': 'cursor expired',
            'extensions': <String, Object?>{
              'code': 'CURSOR_EXPIRED',
              'requestId': requestId,
              'outcome': 'rejected',
              'status': 409,
            },
          },
        ],
      });
      await pumpEventQueue();
      expect(errors.single, isA<ConvoHopProblem>().having((problem) => problem.code, 'code', 'CURSOR_EXPIRED'));
      client.close();
    });
  });
}
