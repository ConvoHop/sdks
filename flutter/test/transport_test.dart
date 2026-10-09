import 'package:convohop/convohop.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/test_data.dart';

void main() {
  group('transport', () {
    test('posts canonical GraphQL requests with auth header and no token in failures', () async {
      final bodies = <Map<String, Object?>>[];
      late http.Request seen;
      final transport = ConvoHopTransport(
        baseUrl: 'https://authority.example',
        namespace: 'test',
        incarnation: incarnation,
        credential: 'secret-token-that-must-not-leak',
        httpClient: mockGraphQL((request, body) {
          seen = request;
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          return jsonResponse(gqlEnvelope('route', context['requestId'] as String, routeResult()));
        }, bodies: bodies),
        clock: fixedClock,
      );

      final route = await transport.execute(Operations.communicationRoute, projectId, const <String, Object?>{});
      expect(route.result?['projectId'], projectId);
      expect(seen.method, 'POST');
      expect(seen.url.toString(), 'https://authority.example/graphql');
      expect(seen.headers['authorization'], isNotNull);
      expect(seen.body, isNot(contains('secret-token-that-must-not-leak')));
      expect(bodies.single['operationName'], 'CommunicationRoute');
      transport.close();
    });

    test('maps GraphQL errors to problems with retryAfter from extensions', () async {
      final transport = ConvoHopTransport(
        baseUrl: 'https://authority.example',
        namespace: 'test',
        incarnation: incarnation,
        httpClient: mockGraphQL((request, body) {
          return jsonResponse(
            <String, Object?>{
              'errors': <Object?>[
                <String, Object?>{
                  'message': 'Slow down',
                  'extensions': <String, Object?>{
                    'code': 'RATE_LIMITED',
                    'status': 429,
                    'outcome': 'rejected',
                    'retryAfter': '7',
                  },
                },
              ],
              'data': null,
            },
            headers: <String, String>{'retry-after': '11'},
          );
        }),
        clock: fixedClock,
      );

      await expectLater(
        transport.execute(Operations.communicationRoute, projectId, const <String, Object?>{}),
        throwsA(
          isA<ConvoHopProblem>()
              .having((problem) => problem.code, 'code', 'RATE_LIMITED')
              .having((problem) => problem.status, 'status', 429)
              .having((problem) => problem.outcome, 'outcome', 'rejected')
              .having((problem) => problem.retryAfter, 'retryAfter', 7),
        ),
      );
    });

    test('maps HTTP errors and Retry-After headers to problems', () async {
      final transport = ConvoHopTransport(
        baseUrl: 'https://authority.example',
        namespace: 'test',
        incarnation: incarnation,
        httpClient: mockGraphQL(
          (request, body) => jsonResponse(
            <String, Object?>{'code': 'AUTHORITY_UNAVAILABLE', 'outcome': 'unknown', 'message': 'maintenance'},
            status: 503,
            headers: <String, String>{'retry-after': '5'},
          ),
        ),
        clock: fixedClock,
      );

      await expectLater(
        transport.execute(Operations.communicationRoute, projectId, const <String, Object?>{}),
        throwsA(
          isA<ConvoHopProblem>()
              .having((problem) => problem.code, 'code', 'AUTHORITY_UNAVAILABLE')
              .having((problem) => problem.retryAfter, 'retryAfter', 5),
        ),
      );
    });

    test('transport uncertainty has unknown outcome and preserves recovery state without tokens', () async {
      final storage = MemoryRecoveryStorage();
      var calls = 0;
      final bodies = <Map<String, Object?>>[];
      final transport = ConvoHopTransport(
        baseUrl: 'https://authority.example',
        namespace: 'test',
        incarnation: incarnation,
        credential: 'fake-token',
        recoveryStorage: storage,
        httpClient: mockGraphQL((request, body) {
          calls += 1;
          if (calls == 1) throw http.ClientException('offline');
          final variables = body['variables'] as Map<String, Object?>;
          final context = variables['context'] as Map<String, Object?>;
          return jsonResponse(
            gqlEnvelope('sendMessage', context['requestId'] as String, messageAck(), status: 'committed'),
          );
        }, bodies: bodies),
        clock: fixedClock,
      );

      await expectLater(
        transport.execute(Operations.communicationSendMessage, projectId, <String, Object?>{
          'conversationId': conversationId,
          'text': 'hello',
          'props': <String, Object?>{},
        }, requestId: requestId),
        throwsA(
          isA<ConvoHopProblem>()
              .having((problem) => problem.code, 'code', 'TRANSPORT_UNKNOWN')
              .having((problem) => problem.outcome, 'outcome', 'unknown'),
        ),
      );
      await transport.initializeRecovery();
      expect(transport.recoveryStates.single.requestId, requestId);
      expect(storage.items.values.join('\n'), isNot(contains('fake-token')));

      await transport
          .retry(requestId)
          .catchError(
            (Object _) => RequestResolution(
              requestId: requestId,
              state: 'notObservedYet',
              checkedAt: timestamp,
              resultWithheld: false,
            ),
          );
      final requestIds = bodies.map((body) {
        final variables = body['variables'] as Map<String, Object?>;
        final context = variables['context'] as Map<String, Object?>;
        return context['requestId'];
      }).toList();
      expect(requestIds.first, requestId);
    });

    test('an answer from another URL is transport uncertainty, not success', () async {
      ConvoHopTransport transportAnsweredFrom(
        Uri Function(Uri requested) answeredFrom,
        MemoryRecoveryStorage storage,
      ) => ConvoHopTransport(
        baseUrl: 'https://authority.example',
        namespace: 'test',
        incarnation: incarnation,
        credential: 'fake-token',
        recoveryStorage: storage,
        httpClient: _AnsweringClient(
          answeredFrom,
          jsonResponse(gqlEnvelope('sendMessage', requestId, messageAck(), status: 'committed')).bodyBytes,
        ),
        clock: fixedClock,
      );
      Future<SendMessageReply> send(ConvoHopTransport transport) => transport.execute(
        Operations.communicationSendMessage,
        projectId,
        <String, Object?>{'conversationId': conversationId, 'text': 'hello', 'props': <String, Object?>{}},
        requestId: requestId,
      );

      final redirectedStorage = MemoryRecoveryStorage();
      final redirected = transportAnsweredFrom(
        (_) => Uri.parse('https://elsewhere.example/graphql'),
        redirectedStorage,
      );
      await expectLater(
        send(redirected),
        throwsA(
          isA<ConvoHopProblem>()
              .having((problem) => problem.code, 'code', 'TRANSPORT_UNKNOWN')
              .having((problem) => problem.outcome, 'outcome', 'unknown'),
        ),
      );
      await redirected.initializeRecovery();
      expect(redirected.recoveryStates.single.requestId, requestId);
      redirected.close();

      final direct = transportAnsweredFrom((requested) => requested, MemoryRecoveryStorage());
      expect((await send(direct)).status, 'committed');
      direct.close();
    });

    test('rejects malformed success envelopes instead of disguising them as success', () async {
      final transport = ConvoHopTransport(
        baseUrl: 'https://authority.example',
        namespace: 'test',
        incarnation: incarnation,
        httpClient: mockGraphQL(
          (request, body) => jsonResponse(<String, Object?>{
            'data': <String, Object?>{
              'route': <String, Object?>{'status': 'ok', 'requestId': requestId, 'result': <String, Object?>{}},
            },
          }),
        ),
        clock: fixedClock,
      );

      await expectLater(
        transport.execute(Operations.communicationRoute, projectId, const <String, Object?>{}, requestId: requestId),
        throwsA(isA<ConvoHopProblem>().having((problem) => problem.code, 'code', 'INVALID_RESPONSE')),
      );
    });
  });
}

/// An injected client that reports the URL its answer came from, as clients
/// that follow redirects do.
final class _AnsweringClient extends http.BaseClient {
  _AnsweringClient(this.answeredFrom, this.body);

  final Uri Function(Uri requested) answeredFrom;
  final List<int> body;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    await request.finalize().drain<void>();
    return _AnsweredResponse(Stream.value(body), 200, url: answeredFrom(request.url));
  }
}

final class _AnsweredResponse extends http.StreamedResponse implements http.BaseResponseWithUrl {
  _AnsweredResponse(super.stream, super.statusCode, {required this.url});

  @override
  final Uri url;
}
