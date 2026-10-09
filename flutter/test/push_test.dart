import 'dart:async';
import 'dart:convert';

import 'package:convohop/push.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_data.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('push bridge', () {
    const methods = MethodChannel('convohop/test_push');
    const events = EventChannel('convohop/test_push/events');
    late List<MethodCall> calls;
    late StreamController<Object?> controller;
    late ConvoHopPush push;
    late List<Object> errors;
    late Map<String, Object?>? registerResult;

    setUp(() {
      calls = <MethodCall>[];
      errors = <Object>[];
      registerResult = <String, Object?>{'kind': 'fcm', 'fid': 'fake-fid'};
      controller = StreamController<Object?>.broadcast();
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(methods, (call) async {
        calls.add(call);
        switch (call.method) {
          case 'getInitialNotification':
            return <String, Object?>{
              'payload': <String, Object?>{'convohop': notification(type: 'notification.call')},
              'ringing': false,
              'reason': 'answered',
            };
          case 'takeCallActions':
            return <Object?>[
              <String, Object?>{
                'action': 'answer',
                'alertId': alertId,
                'payload': <String, Object?>{'convohop': notification(type: 'notification.call')},
              },
            ];
          case 'answerCall':
          case 'declineCall':
          case 'showNotification':
            return true;
          case 'canUseFullScreenIntent':
          case 'requestPermission':
            return true;
          case 'register':
            return registerResult;
        }
        return null;
      });
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockStreamHandler(
        events,
        MockStreamHandler.inline(
          onListen: (arguments, sink) {
            controller.stream.listen(
              sink.success,
              onError: (Object error) => sink.error(code: 'error', message: '$error'),
              onDone: sink.endOfStream,
            );
          },
          onCancel: (arguments) {},
        ),
      );
      push = ConvoHopPush(
        notifications: ConvoHopNotifications(clock: fixedClock),
        methods: methods,
        events: events,
        onError: errors.add,
      );
    });

    tearDown(() async {
      await push.close();
      await controller.close();
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(methods, null);
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockStreamHandler(events, null);
    });

    test('start subscribes before initial notification and drains call actions', () async {
      final opened = <ConvoHopNotification>[];
      final actions = <CallAction>[];
      push.opened.listen(opened.add);
      push.callActions.listen(actions.add);
      await push.start();
      await pumpEventQueue();
      expect(calls.map((call) => call.method).take(2), <String>['getInitialNotification', 'takeCallActions']);
      expect(opened.single, isA<CallNotification>());
      expect(actions.single.kind, CallActionKind.answer);
    });

    test('delivers registration notification opened and call action events', () async {
      final registrations = <PushRegistration>[];
      final received = <HandledNotification>[];
      final opened = <ConvoHopNotification>[];
      final actions = <CallAction>[];
      push.registrations.listen(registrations.add);
      push.received.listen(received.add);
      push.opened.listen(opened.add);
      push.callActions.listen(actions.add);
      await push.start();
      controller.add(<String, Object?>{'type': 'registration', 'kind': 'fcm', 'token': 'fake-fcm-token'});
      controller.add(<String, Object?>{'type': 'registration', 'kind': 'fcm', 'fid': 'fake-fid'});
      controller.add(<String, Object?>{'type': 'registration', 'kind': 'apns', 'token': 'fake-apns'});
      controller.add(<String, Object?>{'type': 'registration', 'kind': 'apnsVoip', 'token': 'fake-voip'});
      controller.add(<String, Object?>{
        'type': 'notification',
        'payload': <String, Object?>{'convohop': notification()},
      });
      controller.add(<String, Object?>{
        'type': 'opened',
        'payload': <String, Object?>{'convohop': notification(type: 'notification.call')},
        'ringing': false,
        'reason': 'declined',
      });
      controller.add(<String, Object?>{'type': 'callAction', 'action': 'decline', 'alertId': alertId});
      await pumpEventQueue(times: 5);
      expect(registrations, const <PushRegistration>[
        FcmRegistration.token('fake-fcm-token'),
        FcmRegistration.fid('fake-fid'),
        ApnsRegistration('fake-apns'),
        ApnsRegistration('fake-voip', voip: true),
      ]);
      expect(received.single.notification, isA<MessageNotification>());
      expect(opened.last, isA<CallNotification>());
      expect(actions.last.kind, CallActionKind.decline);
    });

    test("keeps handling native events after the app's error handler throws", () async {
      await push.close();
      push = ConvoHopPush(
        notifications: ConvoHopNotifications(clock: fixedClock),
        methods: methods,
        events: events,
        onError: (error) {
          errors.add(error);
          throw StateError('The app failed');
        },
      );
      await push.start();
      await pumpEventQueue();
      final opened = <ConvoHopNotification>[];
      push.opened.listen(opened.add);
      controller.add(<String, Object?>{'type': 'opened', 'payload': 'not a map'});
      controller.add(<String, Object?>{
        'type': 'opened',
        'payload': <String, Object?>{'convohop': notification()},
      });
      await pumpEventQueue(times: 5);
      expect(errors.single, isFormatException);
      expect(opened.single, isA<MessageNotification>());
    });

    test('close completes while listeners are paused', () async {
      var ended = 0;
      final paused = <StreamSubscription<Object?>>[
        push.registrations.listen(null, onDone: () => ended++)..pause(),
        push.received.listen(null, onDone: () => ended++)..pause(),
        push.opened.listen(null, onDone: () => ended++)..pause(),
        push.callActions.listen(null, onDone: () => ended++)..pause(),
      ];
      await push.start();
      await push.close().timeout(const Duration(seconds: 5));
      expect(ended, 0);
      for (final subscription in paused) {
        subscription.resume();
      }
      await pumpEventQueue();
      expect(ended, 4);
    });

    test('register reports the registration in the shared JSON shape', () async {
      final registrations = <PushRegistration>[];
      push.registrations.listen(registrations.add);
      await push.start();
      // Android, where the app's manifest switched FCM to installation IDs.
      await push.register();
      // Android with FCM registration tokens.
      registerResult = <String, Object?>{'kind': 'fcm', 'token': 'fake-fcm-token'};
      await push.register();
      registerResult = <String, Object?>{'kind': 'apns', 'token': 'fake-apns'};
      await push.register();
      // iOS before APNs issued a token: it arrives later as an event.
      registerResult = null;
      await push.register();
      await pumpEventQueue();
      expect(calls.where((call) => call.method == 'register'), hasLength(4));
      const voip = ApnsRegistration('fake-voip', voip: true);
      expect(registrations, const <PushRegistration>[
        FcmRegistration.fid('fake-fid'),
        FcmRegistration.token('fake-fcm-token'),
        ApnsRegistration('fake-apns'),
      ]);
      expect([...registrations, voip].map((registration) => registration.toJson()), <Map<String, String>>[
        {'kind': 'fcm', 'fid': 'fake-fid'},
        {'kind': 'fcm', 'token': 'fake-fcm-token'},
        {'kind': 'apns', 'token': 'fake-apns'},
        {'kind': 'apnsVoip', 'token': 'fake-voip'},
      ]);
      expect([...registrations, voip].map((registration) => '$registration'), [
        'FcmRegistration(fid)',
        'FcmRegistration(token)',
        'ApnsRegistration(apns)',
        'ApnsRegistration(apnsVoip)',
      ]);
      expect(const FcmRegistration.fid('same'), isNot(const FcmRegistration.token('same')));
      expect(errors, isEmpty);
    });

    test('register rejects malformed registrations and a closed push', () async {
      final registrations = <PushRegistration>[];
      push.registrations.listen(registrations.add);
      registerResult = <String, Object?>{'kind': 'fcm', 'fid': 'fake-fid', 'token': 'fake-fcm-token'};
      await expectLater(push.register(), throwsFormatException);
      registerResult = <String, Object?>{'kind': 'fcm'};
      await expectLater(push.register(), throwsFormatException);
      await push.close();
      await expectLater(push.register(), throwsStateError);
      expect(calls.where((call) => call.method == 'register'), hasLength(2));
      expect(registrations, isEmpty);
    });

    test('native methods serialize payloads and omit nullable arguments', () async {
      expect(await push.answerCall(alertId), isTrue);
      expect(await push.declineCall(alertId), isTrue);
      expect(await push.showNotification(<Object?, Object?>{'other': 'value'}), isFalse);
      expect(await push.showNotification(<Object?, Object?>{'convohop': notification()}), isTrue);
      final shown = calls.last.arguments as Map<Object?, Object?>;
      expect(shown['convohop'], isA<String>());
      expect(jsonDecode(shown['convohop'] as String), isA<Map<String, Object?>>());
      await push.removeDeliveredNotifications();
      expect(calls.last.arguments, isNot(contains('conversationId')));
      await push.setActiveConversation(null);
      expect(calls.last.arguments, isNot(contains('conversationId')));
    });

    test('showIncomingCall rings only while tracked and native end skips answered or native stops', () async {
      await push.start();
      final callPayload = <String, Object?>{
        ...notification(type: 'notification.call'),
        'eventId': '12345678-1234-4234-9234-123456789abc',
        'alertId': 'abcdefab-cdef-4abc-8def-abcdefabcdef',
      };
      final call = parseNotificationPayload(<Object?, Object?>{'convohop': callPayload})! as CallNotification;
      await push.showIncomingCall(call);
      expect(calls.last.method, 'showIncomingCall');
      push.notifications.stopRinging(call.alertId, reason: 'ended');
      await pumpEventQueue();
      expect(calls.last.method, 'endCall');

      await push.showIncomingCall(call);
      await push.close();
      expect(push.notifications.stopRinging(alertId), isFalse);
    });

    test('handleNotification records payloads from other push plugins and reports them', () async {
      final received = <HandledNotification>[];
      push.received.listen(received.add);
      expect(
        push.handleNotification(<Object?, Object?>{
          'from': 'other-plugin',
          'data': <String, Object?>{'k': 'v'},
        }),
        isNull,
      );
      final first = push.handleNotification(<Object?, Object?>{'convohop': jsonEncode(notification())});
      final again = push.handleNotification(<Object?, Object?>{'convohop': notification()});
      final call = push.handleNotification(<Object?, Object?>{
        'convohop': <String, Object?>{
          ...notification(type: 'notification.call'),
          'eventId': '12345678-1234-4234-9234-123456789abc',
        },
      });
      expect(
        () => push.handleNotification(<Object?, Object?>{
          'convohop': <String, Object?>{...notification(), 'eventType': 'notification.unknown'},
        }),
        throwsFormatException,
      );
      await pumpEventQueue();
      expect(first?.duplicate, isFalse);
      expect(again?.duplicate, isTrue);
      expect(call?.ringing, isTrue);
      expect(push.notifications.isRinging(alertId), isTrue);
      expect(received, <HandledNotification?>[first, again, call]);
      expect(calls, isEmpty);
    });

    test('malformed native events are reported to error listener', () async {
      await push.start();
      final registrations = <PushRegistration>[];
      push.registrations.listen(registrations.add);
      for (final registration in <Map<String, Object?>>[
        {'kind': 'bad', 'token': 'x'},
        {'kind': 'voip', 'token': 'x'},
        {'kind': 'fcm'},
        {'kind': 'fcm', 'fid': 'x', 'token': 'y'},
        {'kind': 'fcm', 'fid': ''},
        {'kind': 'fcm', 'token': ''},
        {'kind': 'fcm', 'fid': null, 'token': 'x'},
        {'kind': 'apns', 'fid': 'x'},
        {'kind': 'apnsVoip', 'token': 'x', 'fid': 'y'},
        {'kind': 'apnsVoip', 'token': 7},
      ]) {
        controller.add(<String, Object?>{'type': 'registration', ...registration});
      }
      controller.add(<String, Object?>{'type': 'notification', 'payload': 'bad'});
      controller.add(<String, Object?>{'type': 'callAction', 'action': 'bad', 'alertId': alertId});
      await pumpEventQueue(times: 5);
      expect(registrations, isEmpty);
      expect(errors, hasLength(12));
      expect(errors, everyElement(isFormatException));
    });
  });
}
