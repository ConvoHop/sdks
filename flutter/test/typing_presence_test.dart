import 'package:convohop/convohop.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/realtime_fakes.dart';
import 'support/test_data.dart';

void main() {
  test('typing indicator throttles sends and stops on close', () async {
    var now = fixedClock();
    final signals = <bool>[];
    final client = clientWith(
      mockGraphQL((request, body) {
        final variables = body['variables'] as Map<String, Object?>;
        final context = variables['context'] as Map<String, Object?>;
        final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
        if (body['operationName'] == 'CommunicationTyping') signals.add(input['isTyping'] as bool);
        return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
      }),
    );
    final typing = TypingIndicator(
      client,
      conversationId,
      throttle: const Duration(milliseconds: 100),
      idle: const Duration(seconds: 30),
      clock: () => now,
    );

    typing.keystroke();
    typing.keystroke();
    await pumpEventQueue();
    expect(signals, <bool>[true]);
    now += 101;
    typing.keystroke();
    await pumpEventQueue();
    expect(signals, <bool>[true, true]);
    await typing.close();
    expect(signals.last, isFalse);
    client.close();
  });

  test("typing keeps signalling after the app's error handler throws", () async {
    var now = fixedClock();
    final signals = <bool>[];
    final errors = <Object>[];
    final client = clientWith(
      mockGraphQL((request, body) {
        final variables = body['variables'] as Map<String, Object?>;
        final context = variables['context'] as Map<String, Object?>;
        final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
        if (body['operationName'] == 'CommunicationTyping') {
          signals.add(input['isTyping'] as bool);
          if (signals.length == 1) return jsonResponse(gqlError('FORBIDDEN', status: 403));
        }
        return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
      }),
    );
    final typing = TypingIndicator(
      client,
      conversationId,
      throttle: const Duration(milliseconds: 100),
      idle: const Duration(seconds: 30),
      clock: () => now,
      onError: (error) {
        errors.add(error);
        throw StateError('The app failed');
      },
    );

    typing.keystroke();
    await pumpEventQueue();
    expect(errors.single, isA<ConvoHopProblem>().having((problem) => problem.code, 'code', 'FORBIDDEN'));
    now += 101;
    typing.keystroke();
    await pumpEventQueue();
    expect(signals, <bool>[true, true]);
    await typing.close();
    expect(signals, <bool>[true, true, false]);
    expect(errors, hasLength(1));
    client.close();
  });

  test('conversation activity derives presence from messages and receipts', () async {
    final storage = MemoryRecoveryStorage();
    final connector = FakeRealtimeConnector();
    final client = clientWith(
      mockGraphQL((request, body) {
        final variables = body['variables'] as Map<String, Object?>;
        final context = variables['context'] as Map<String, Object?>;
        final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
        return jsonResponse(okFor(body['operationName'] as String, context['requestId'] as String, input));
      }),
      storage: storage,
      realtime: connector.call,
    );
    final store = ConversationStore(client, conversationId, maxMessages: 100, persist: true);
    await pumpEventQueue(times: 20);
    final active = store.snapshot.lastActive;
    expect(active[principalId], DateTime.parse(timestamp).toUtc());
    expect(store.snapshot.isRecentlyActive(principalId, now: DateTime.parse(timestamp).toUtc()), isTrue);
    await store.close();
    client.close();
  });
}
