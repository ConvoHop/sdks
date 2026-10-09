import 'dart:async';

import 'package:convohop/convohop.dart';
import 'package:convohop/push.dart';
import 'package:convohop_docs_examples/calling.dart';
import 'package:convohop_docs_examples/push.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'payloads.dart';

// The plugin's channels. The tests answer them in place of its native code.
const _methods = MethodChannel('convohop/push');
const _events = EventChannel('convohop/push/events');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  late List<MethodCall> calls; // What Dart asked the native code.
  late Map<String, Object? Function(MethodCall call)> answers;
  late StreamController<Object?> native; // Events from the native code.
  late List<String> logs;
  late FakeScreens screens;
  late List<Map<String, String>> saved;
  late ConvoHopClient client;

  setUp(() {
    calls = [];
    answers = {
      'requestPermission': (_) => true,
      'register': (_) => {'kind': 'fcm', 'token': 'fcm-token'},
    };
    native = StreamController<Object?>();
    logs = [];
    screens = FakeScreens();
    saved = [];
    client = recipient();
    messenger.setMockMethodCallHandler(_methods, (call) async {
      calls.add(call);
      return answers[call.method]?.call(call);
    });
    StreamSubscription<Object?>? subscription;
    messenger.setMockStreamHandler(
      _events,
      MockStreamHandler.inline(
        onListen: (arguments, sink) => subscription = native.stream.listen(sink.success),
        onCancel: (arguments) => subscription?.cancel(),
      ),
    );
    final print = debugPrint;
    debugPrint = (message, {wrapWidth}) => logs.add(message ?? '');
    addTearDown(() => debugPrint = print);
  });

  tearDown(() {
    messenger.setMockMethodCallHandler(_methods, null);
    messenger.setMockStreamHandler(_events, null);
    debugDefaultTargetPlatformOverride = null;
  });

  Future<ConvoHopPush> start({Future<void> Function(Map<String, String> registration)? save}) async {
    final push = await startPush(
      client,
      screens,
      saveRegistration: save ?? (registration) async => saved.add(registration),
    );
    addTearDown(() => stopPush(push));
    await pumpEventQueue();
    return push;
  }

  List<String> methodNames() => [for (final call in calls) call.method];
  List<Object?> endedCalls() => [
    for (final call in calls)
      if (call.method == 'endCall') call.arguments,
  ];

  for (final registration in [
    {'kind': 'fcm', 'token': 'fcm-token'},
    {'kind': 'fcm', 'fid': 'firebase-installation-id'},
  ]) {
    test('startPush registers with FCM and sends the ${registration.keys.last} registration to the backend', () async {
      answers['register'] = (_) => registration;
      await start();
      expect(saved, [registration]);
      expect(methodNames(), ['getInitialNotification', 'takeCallActions', 'requestPermission', 'register']);
    });
  }

  test('on iOS, startPush also registers for VoIP pushes, and both APNs tokens reach the backend', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    answers['register'] = (_) => null; // APNs issues the token afterwards.
    await start();
    native
      ..add({'type': 'registration', 'kind': 'apns', 'token': 'a1b2c3'})
      ..add({'type': 'registration', 'kind': 'apnsVoip', 'token': 'd4e5f6'});
    await pumpEventQueue();
    expect(methodNames(), [
      'getInitialNotification',
      'takeCallActions',
      'requestPermission',
      'register',
      'registerVoip',
    ]);
    expect(saved, [
      {'kind': 'apns', 'token': 'a1b2c3'},
      {'kind': 'apnsVoip', 'token': 'd4e5f6'},
    ]);
  });

  test("startPush keeps going when Firebase isn't available or the backend can't store a registration", () async {
    answers['register'] = (_) => throw PlatformException(code: 'FIREBASE_UNAVAILABLE', message: 'Offline');
    await start(save: (registration) async => throw Exception('Backend unavailable'));
    native.add({'type': 'registration', 'kind': 'fcm', 'token': 'new-fcm-token'}); // FCM replaced the token.
    await pumpEventQueue();
    expect(logs, [
      "Couldn't register for push: FIREBASE_UNAVAILABLE",
      "Couldn't save the push registration: Exception: Backend unavailable",
    ]);
  });

  test('opening a notification shows its conversation, or the incoming call while it rings', () async {
    final message = fcmData('message-preview');
    final conversationId = parseNotificationPayload(message)!.conversationId;
    answers['getInitialNotification'] = (_) => {'payload': message}; // The notification that launched the app.
    await start();
    expect(screens.shown, ['conversation $conversationId']);

    final ringing = newRequestId(), answered = newRequestId();
    for (final opened in [
      {
        'payload': fcmData('message-preview', {'recipientId': newRequestId()}),
      }, // Another user of the device.
      {'payload': ringData(ringing), 'ringing': true},
      {'payload': ringData(answered), 'ringing': false, 'reason': 'answered'},
      {'payload': fcmData('cancel-ended')},
    ]) {
      native.add({'type': 'opened', ...opened});
    }
    await pumpEventQueue();
    expect(screens.shown, [
      'conversation $conversationId',
      'ring $ringing',
      'conversation $conversationId',
      'conversation $conversationId',
    ]);
    expect(logs, isEmpty);
  });

  test("answering a ring that this user can't join closes the system call UI", () async {
    await start();
    final lost = newRequestId(), foreign = newRequestId();
    native
      ..add({'type': 'callAction', 'action': 'answer', 'alertId': lost}) // The device lost the ring's notification.
      ..add({
        'type': 'callAction',
        'action': 'answer',
        'alertId': foreign,
        'payload': ringData(foreign, recipientId: newRequestId()),
      });
    await pumpEventQueue();
    expect(endedCalls(), [
      {'alertId': lost, 'reason': 'ended'},
      {'alertId': foreign, 'reason': 'ended'},
    ]);
    expect(logs, [
      "Couldn't answer the call: Bad state: This user has no such ring",
      "Couldn't answer the call: Bad state: This user has no such ring",
    ]);

    // Nothing joined, so the other actions do nothing, and answering again tries again.
    for (final action in ['decline', 'mute', 'unmute', 'end', 'answer']) {
      native.add({'type': 'callAction', 'action': action, 'alertId': lost});
    }
    await pumpEventQueue();
    expect(endedCalls(), hasLength(3));
    expect(endedCalls().last, {'alertId': lost, 'reason': 'ended'});
    expect(screens.shown, isEmpty);
  });

  test('stopPush removes delivered notifications and stops opening them', () async {
    final push = await startPush(client, screens, saveRegistration: (registration) async {});
    await stopPush(push);
    expect(methodNames().last, 'removeDeliveredNotifications');
    native.add({'type': 'opened', 'payload': fcmData('message-preview')});
    await pumpEventQueue();
    expect(screens.shown, isEmpty);
  });
}

final class FakeScreens implements AppScreens {
  final List<String> shown = [];

  @override
  void showConversation(String conversationId) => shown.add('conversation $conversationId');

  @override
  void showRing(CallNotification call) => shown.add('ring ${call.alertId}');

  @override
  void showCall(JoinedCall call, {required Future<void> Function() hangUp}) => shown.add('call');

  @override
  void closeCall(JoinedCall call) => shown.add('closed call');
}

// The user whom the vectors' pushes are for. Push makes no ConvoHop requests, so the client stays offline.
ConvoHopClient recipient() {
  final push = parseNotificationPayload(fcmData('message-preview'))!;
  final client = ConvoHopClient(
    baseUrl: 'https://convohop.invalid',
    projectId: push.projectId,
    incarnation: newRequestId(),
    principalId: push.recipientId,
    sessionToken: 'offline-session-token',
  );
  addTearDown(client.close);
  return client;
}

// The call-incoming vector for ring [alertId], ringing for another minute.
Map<String, Object?> ringData(String alertId, {String? recipientId}) {
  final now = DateTime.now().toUtc();
  return fcmData('call-incoming', {
    'eventId': newRequestId(),
    'alertId': alertId,
    'occurredAt': now.toIso8601String(),
    'expiresAt': now.add(const Duration(minutes: 1)).toIso8601String(),
    'recipientId': ?recipientId,
  });
}
