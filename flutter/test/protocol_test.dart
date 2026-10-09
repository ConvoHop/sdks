import 'dart:convert';

import 'package:convohop/src/generated/generated.dart';
import 'package:convohop/src/protocol.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_data.dart';

void main() {
  group('protocol parsers', () {
    test('accept canonical identifiers and reject nil or malformed identifiers', () {
      expect(parseId(projectId), projectId);
      expect(() => parseId('00000000-0000-0000-0000-000000000000'), throwsFormatException);
      expect(() => parseId(projectId.toUpperCase()), throwsFormatException);
      expect(() => parseId(123), throwsFormatException);
    });

    test('keep counters as canonical decimal strings beyond safe integers', () {
      expect(parseCounter('9007199254740993'), '9007199254740993');
      expect(counterValue('9007199254740993'), BigInt.parse('9007199254740993'));
      for (final value in <Object?>['00', '-1', '9223372036854775808', 12]) {
        expect(() => parseCounter(value), throwsFormatException);
      }
    });

    test('require millisecond UTC timestamps and valid cursors', () {
      expect(parseTimestamp(timestamp), timestamp);
      expect(timestampMillis(timestamp), DateTime.parse(timestamp).millisecondsSinceEpoch);
      for (final value in <Object?>['2026-10-10T11:59:55Z', '2026-10-10T11:59:55.00Z', 'not time']) {
        expect(() => parseTimestamp(value), throwsFormatException);
      }
      final parsed = parseCursor(cursor(sequence: '12'));
      expect(parsed.sequence, '12');
      expect(() => parseCursor(<String, Object?>{...cursor(), 'sequence': '01'}), throwsFormatException);
    });

    test('validate event pages without resetting invalid cursors', () {
      final page = EventPage.fromJson(
        eventPage(
          items: <Map<String, Object?>>[event(sequence: '2')],
          sequence: '2',
        ),
      );
      expect(
        checkEventPage(
          page,
          incarnation,
          conversationId,
          after: const Cursor(incarnation: incarnation, conversationId: conversationId, sequence: '1'),
        ).nextCursor?.sequence,
        '2',
      );
      final wrongConversation = EventPage.fromJson(
        eventPage(
          items: <Map<String, Object?>>[event(id: otherPrincipalId)],
          sequence: '2',
        ),
      );
      expect(() => checkEventPage(wrongConversation, incarnation, conversationId), throwsFormatException);
    });

    test('parseOrigin accepts only secure origins or explicit loopback HTTP', () {
      expect(parseOrigin('https://example.com/path/..'), 'https://example.com');
      expect(parseOrigin('https://example.com:443'), 'https://example.com');
      expect(parseOrigin('http://localhost:8080'), 'http://localhost:8080');
      expect(parseOrigin('http://127.0.0.1/'), 'http://127.0.0.1');
      expect(parseOrigin('http://[::1]:9000'), 'http://[::1]:9000');
      for (final value in <String>[
        'http://example.com',
        'https://user:pass@example.com',
        'https://example.com/graphql',
        'https://example.com?token=fake',
        'https://example.com#fragment',
      ]) {
        expect(() => parseOrigin(value), throwsFormatException, reason: value);
      }
    });

    test('canonicalJson sorts keys and rejects unsafe numbers', () {
      expect(canonicalJson(<String, Object?>{'b': 1, 'a': true}), '{"a":true,"b":1}');
      expect(canonicalJson(<String, Object?>{'n': 1.0}), '{"n":1}');
      expect(fingerprint(<String, Object?>{'b': 1, 'a': true}), startsWith('sha256:'));
      expect(() => canonicalJson(<String, Object?>{'n': maxSafeInteger + 1}), throwsFormatException);
      expect(() => canonicalJson(Object()), throwsFormatException);
      expect(
        jsonDecode(
          canonicalJson(<String, Object?>{
            'x': <Object?>[null, 'y'],
          }),
        ),
        isA<Map<String, Object?>>(),
      );
    });
  });
}
