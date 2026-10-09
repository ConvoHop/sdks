import 'dart:convert';
import 'dart:io';

import 'package:convohop/convohop.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_data.dart';

const _cancelEventId = 'f1e2d3c4-b5a6-4978-8a6b-5c4d3e2f1a0b';

Future<Map<String, Object?>> _vectors() async =>
    jsonDecode(await File('../spec/push-payload/vectors.json').readAsString()) as Map<String, Object?>;

/// The payloads each vector's builders deliver to a device.
List<Map<Object?, Object?>> _payloads(Map<String, Object?> vector) {
  final expected = vector['expected']! as Map<String, Object?>;
  Map<String, Object?>? request(String builder) =>
      (expected[builder] as Map<String, Object?>?)?['request'] as Map<String, Object?>?;
  return <Map<Object?, Object?>>[
    for (final builder in <String>['apnsAlert', 'apnsVoip', 'webPush'])
      if (request(builder) case final value?) value['payload']! as Map<Object?, Object?>,
    if (request('fcm') case final value?) (value['message']! as Map<String, Object?>)['data']! as Map<Object?, Object?>,
  ];
}

Map<Object?, Object?> _convohop(Map<String, Object?> data) => <Object?, Object?>{'convohop': data};

Map<String, Object?> _cancellation(String reason) => <String, Object?>{
  ...notification(type: 'notification.callCancelled'),
  'eventId': _cancelEventId,
  'reason': reason,
};

ConvoHopClient _recordingClient(List<Map<String, Object?>> bodies, List<String?> authorizations) => clientWith(
  mockGraphQL((request, body) {
    authorizations.add(request.headers['authorization']);
    final variables = body['variables']! as Map<String, Object?>;
    final context = variables['context']! as Map<String, Object?>;
    final input = variables['input'] as Map<String, Object?>? ?? const <String, Object?>{};
    return jsonResponse(okFor(body['operationName']! as String, context['requestId']! as String, input));
  }, bodies: bodies),
);

void main() {
  group('notification payload parsing', () {
    test('accepts every delivered vector payload', () async {
      final vectors = (await _vectors())['vectors']! as List<Object?>;
      expect(vectors, hasLength(35));
      var parsed = 0;
      for (final item in vectors.cast<Map<String, Object?>>()) {
        final event = item['event']! as Map<String, Object?>;
        for (final payload in _payloads(item)) {
          final notification = parseNotificationPayload(payload);
          expect(notification, isNotNull, reason: item['id'] as String?);
          expect(notification?.eventId, event['eventId'], reason: item['id'] as String?);
          expect(notification?.eventType, event['eventType'], reason: item['id'] as String?);
          parsed += 1;
        }
      }
      expect(parsed, greaterThan(vectors.length));
    });

    test('rejects invalid events whose defects reach the device', () async {
      final invalidEvents = ((await _vectors())['invalidEvents']! as List<Object?>).cast<Map<String, Object?>>();
      expect(invalidEvents, hasLength(19));
      // A device gets the event without subjectRef, connected and preview
      // (spec/push-payload/README.md, "Requests"): defects confined to those
      // fields never reach it.
      const undeliverable = <String>{
        'subject-kind-mismatch',
        'subject-id-mismatch',
        'preview-null',
        'preview-empty',
        'preview-too-long',
        'preview-without-truncated',
        'connected-missing',
        'connected-string',
      };
      expect(invalidEvents.map((item) => item['id']).toSet().containsAll(undeliverable), isTrue);
      for (final item in invalidEvents) {
        final id = item['id']! as String;
        final data = Map<String, Object?>.of(item['event']! as Map<String, Object?>)
          ..remove('subjectRef')
          ..remove('connected')
          ..remove('preview');
        if (undeliverable.contains(id)) {
          expect(parseNotificationPayload(_convohop(data)), isNotNull, reason: id);
        } else {
          expect(() => parseNotificationPayload(_convohop(data)), throwsFormatException, reason: id);
          expect(
            () => parseNotificationPayload(<Object?, Object?>{'convohop': jsonEncode(data)}),
            throwsFormatException,
            reason: id,
          );
        }
      }
    });

    test('ignores fields the contract does not define for the event type', () async {
      final vectors = ((await _vectors())['vectors']! as List<Object?>).cast<Map<String, Object?>>();
      final extended = vectors.where((item) => item['unknownFields'] != null).toList();
      expect(extended.map((item) => item['id']), containsAll(<String>['message-preview', 'call-incoming']));
      for (final item in extended) {
        final unknown = item['unknownFields']! as Map<String, Object?>;
        for (final payload in _payloads(item)) {
          final data = payload['convohop'];
          final object = data is String ? jsonDecode(data) as Map<String, Object?> : data! as Map<String, Object?>;
          expect(object.keys.toSet().intersection(unknown.keys.toSet()), isEmpty);
          final merged = <String, Object?>{...object, ...unknown};
          final before = parseNotificationPayload(payload)!;
          final after = parseNotificationPayload(<Object?, Object?>{
            ...payload,
            'convohop': data is String ? jsonEncode(merged) : merged,
          })!;
          expect(after.runtimeType, before.runtimeType, reason: item['id'] as String?);
          expect(after.toJson(), before.toJson(), reason: item['id'] as String?);
        }
      }
    });

    test('rejects lone surrogate title and body text', () {
      for (final patch in <Map<String, Object?>>[
        <String, Object?>{'title': String.fromCharCode(0xD800)},
        <String, Object?>{'body': String.fromCharCode(0xDC00)},
        <String, Object?>{'title': 'bad${String.fromCharCode(0xD800)}'},
      ]) {
        expect(
          () => parseNotificationPayload(_convohop(<String, Object?>{...notification(), ...patch})),
          throwsFormatException,
        );
      }
    });

    test('supports preview-off and preview-on payloads plus alert fallback', () {
      final off = parseNotificationPayload(_convohop(notification()));
      expect(off, isA<MessageNotification>());
      expect(off?.title, isNull);
      expect(off?.body, isNull);

      final on = parseNotificationPayload(_convohop(notification(preview: true)));
      expect(on?.title, 'Ada');
      expect(on?.body, 'Hello');

      final fallback = parseNotificationPayload(<Object?, Object?>{
        'aps': <String, Object?>{
          'alert': <String, Object?>{'title': 'Fallback', 'body': 'Body'},
        },
        'convohop': notification(),
      });
      expect(fallback?.title, 'Fallback');
      expect(fallback?.body, 'Body');

      final android = parseNotificationPayload(<Object?, Object?>{'convohop': jsonEncode(notification())});
      expect(android?.eventId, eventId);
      expect(() => parseNotificationPayload(<Object?, Object?>{'convohop': '{not json'}), throwsFormatException);
    });

    test('reports missed calls only for ended and expired rings', () {
      bool missed(String reason) =>
          (parseNotificationPayload(_convohop(_cancellation(reason)))! as CallCancelledNotification).missedCall;
      expect(missed('ended'), isTrue);
      expect(missed('expired'), isTrue);
      expect(missed('answered'), isFalse);
      expect(missed('declined'), isFalse);
      expect(missed('futureReason'), isFalse);
    });
  });

  group('handleNotification', () {
    test('returns null for payloads that are not ConvoHop\'s', () {
      final notifications = ConvoHopNotifications(clock: fixedClock);
      expect(
        notifications.handleNotification(<Object?, Object?>{
          'aps': <String, Object?>{'alert': 'Other app'},
        }),
        isNull,
      );
      expect(notifications.handleNotification(<Object?, Object?>{}), isNull);
      notifications.close();
    });

    test('preview-off messages carry no text and fetch it with the user session', () async {
      final notifications = ConvoHopNotifications(clock: fixedClock);
      final handled = notifications.handleNotification(_convohop(notification()))!;
      expect(handled.duplicate, isFalse);
      expect(handled.ringing, isFalse);
      final message = handled.notification as MessageNotification;
      expect(message.title, isNull);
      expect(message.body, isNull);
      expect(jsonEncode(message.toJson()), isNot(contains('Hello')));

      final bodies = <Map<String, Object?>>[];
      final authorizations = <String?>[];
      final client = _recordingClient(bodies, authorizations);
      expect(message.isFor(client), isTrue);
      final fetched = await message.fetchMessage(client);
      expect(fetched.messageId, messageId);
      expect(fetched.text, 'hello');
      expect(bodies.single['operationName'], 'CommunicationGetMessage');
      expect((bodies.single['variables']! as Map<String, Object?>)['input'], <String, Object?>{
        'conversationId': conversationId,
        'messageId': messageId,
      });
      expect(authorizations.single, 'Bearer fake-session-token');

      expect(notifications.handleNotification(_convohop(notification()))!.duplicate, isTrue);
      client.close();
      notifications.close();
    });

    test('preview-on messages carry their text', () {
      final notifications = ConvoHopNotifications(clock: fixedClock);
      final handled = notifications.handleNotification(<Object?, Object?>{
        'convohop': jsonEncode(notification(preview: true)),
      })!;
      expect(handled.notification.title, 'Ada');
      expect(handled.notification.body, 'Hello');
      notifications.close();
    });

    test('fetchMessage refuses notifications for another recipient without a request', () async {
      final bodies = <Map<String, Object?>>[];
      final client = _recordingClient(bodies, <String?>[]);
      final message =
          parseNotificationPayload(_convohop(<String, Object?>{...notification(), 'recipientId': otherPrincipalId}))!
              as MessageNotification;
      expect(message.isFor(client), isFalse);
      await expectLater(message.fetchMessage(client), throwsStateError);
      final otherProject =
          parseNotificationPayload(_convohop(<String, Object?>{...notification(), 'projectId': otherPrincipalId}))!
              as MessageNotification;
      await expectLater(otherProject.fetchMessage(client), throwsStateError);
      expect(bodies, isEmpty);
      client.close();
    });

    test('a cancellation that arrives first keeps its call from ringing', () {
      final notifications = ConvoHopNotifications(clock: fixedClock);
      final updates = <RingUpdate>[];
      notifications.rings.listen(updates.add);
      final cancelled = notifications.handleNotification(_convohop(_cancellation('answered')))!;
      expect(cancelled.notification, isA<CallCancelledNotification>());
      expect(cancelled.ringing, isFalse);
      final call = notifications.handleNotification(_convohop(notification(type: 'notification.call')))!;
      expect(call.duplicate, isFalse);
      expect(call.ringing, isFalse);
      expect(notifications.isRinging(alertId), isFalse);
      expect(notifications.ringing, isEmpty);
      expect(updates, isEmpty);
      notifications.close();
    });

    test('a ring stops when cancelled and a second copy of it does not ring again', () {
      final notifications = ConvoHopNotifications(clock: fixedClock);
      final updates = <RingUpdate>[];
      notifications.rings.listen(updates.add);
      final call = notifications.handleNotification(_convohop(notification(type: 'notification.call')))!;
      expect(call.ringing, isTrue);
      expect((call.notification as CallNotification).hasVideo, isTrue);
      expect(notifications.ringing.single.alertId, alertId);

      final again = notifications.handleNotification(
        _convohop(<String, Object?>{...notification(type: 'notification.call'), 'eventId': _cancelEventId}),
      )!;
      expect(again.duplicate, isTrue);
      expect(updates, hasLength(1));

      notifications.handleNotification(
        _convohop(<String, Object?>{..._cancellation('ended'), 'eventId': '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'}),
      );
      expect(updates.map((update) => (update.ringing, update.reason)), <(bool, String?)>[
        (true, null),
        (false, 'ended'),
      ]);
      expect(notifications.isRinging(alertId), isFalse);
      expect(notifications.stopRinging(alertId), isFalse);
      notifications.close();
    });

    test('a ring expires at its expiresAt', () {
      fakeAsync((async) {
        final start = fixedClock();
        final notifications = ConvoHopNotifications(clock: () => start + async.elapsed.inMilliseconds);
        final updates = <RingUpdate>[];
        notifications.rings.listen(updates.add);
        final call = notifications.handleNotification(_convohop(notification(type: 'notification.call')))!;
        expect(call.ringing, isTrue);
        async.elapse(const Duration(minutes: 4, seconds: 59));
        expect(notifications.isRinging(alertId), isTrue);
        async.elapse(const Duration(seconds: 1));
        expect(notifications.isRinging(alertId), isFalse);
        expect(updates.last.ringing, isFalse);
        expect(updates.last.reason, 'expired');
        notifications.close();
        expect(async.pendingTimers, isEmpty);
      });
    });

    test('an expired call never rings', () {
      final notifications = ConvoHopNotifications(
        clock: () => DateTime.utc(2026, 10, 10, 12, 5).millisecondsSinceEpoch,
      );
      final call = notifications.handleNotification(_convohop(notification(type: 'notification.call')))!;
      expect(call.ringing, isFalse);
      expect(notifications.ringing, isEmpty);
      notifications.close();
    });

    test('after close, still parses and deduplicates payloads without ringing or reporting', () {
      fakeAsync((async) {
        final start = fixedClock();
        final notifications = ConvoHopNotifications(clock: () => start + async.elapsed.inMilliseconds);
        final updates = <RingUpdate>[];
        notifications.rings.listen(updates.add);
        notifications.close();

        final call = notifications.handleNotification(_convohop(notification(type: 'notification.call')))!;
        expect((call.duplicate, call.ringing), (false, true));
        expect(notifications.handleNotification(_convohop(notification(type: 'notification.call')))!.duplicate, isTrue);
        expect(async.pendingTimers, isEmpty);
        expect(notifications.stopRinging(alertId), isTrue);
        expect(notifications.isRinging(alertId), isFalse);
        async.elapse(const Duration(minutes: 5));
        expect(updates, isEmpty);
      });
    });

    test('deduplicates events, tracks rings and applies only live-ended events', () async {
      final notifications = ConvoHopNotifications(clock: fixedClock);
      final updates = <RingUpdate>[];
      final subscription = notifications.rings.listen(updates.add);
      final call = parseNotificationPayload(_convohop(notification(type: 'notification.call')))!;
      final handled = notifications.record(call);
      expect(handled.ringing, isTrue);
      expect(notifications.isRinging(alertId), isTrue);
      expect(notifications.record(call).duplicate, isTrue);
      expect(updates.single.ringing, isTrue);

      expect(notifications.applyEvent(Event.fromJson(event(type: 'message.created'))), isFalse);
      final liveEndedPayload = Map<String, Object?>.from(event(type: 'live.ended')['payload']! as Map<String, Object?>)
        ..['messageId'] = null
        ..['revision'] = null
        ..['liveSessionId'] = liveSessionId;
      expect(
        notifications.applyEvent(
          Event.fromJson(<String, Object?>{...event(type: 'live.ended'), 'payload': liveEndedPayload}),
        ),
        isTrue,
      );
      expect(notifications.isRinging(alertId), isFalse);
      expect(notifications.stopCall(liveSessionId), isFalse);
      await subscription.cancel();
      notifications.close();
    });
  });
}
