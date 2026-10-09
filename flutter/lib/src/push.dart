import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'client.dart';
import 'notifications.dart';

/// Where your backend sends this device's pushes. Send each one to your
/// backend, which delivers ConvoHop's notification events to it; ConvoHop
/// never sees them. Every ConvoHop client hands its app the same JSON shape,
/// from [toJson], so one backend endpoint can store registrations from
/// browsers and native apps.
sealed class PushRegistration {
  const PushRegistration._();

  /// `fcm`, `apns` or `apnsVoip`.
  String get kind;

  /// The registration as JSON: `{"kind": "fcm", "token": …}`,
  /// `{"kind": "fcm", "fid": …}` or `{"kind": "apns" | "apnsVoip", "token": …}`.
  Map<String, String> toJson();
}

/// An Android app registered with Firebase Cloud Messaging, by exactly one of
/// [token] and [fid]. FCM issues registration tokens unless the app's
/// manifest switches it to Firebase installation IDs: see the package README.
/// Your backend sends its FCM messages to the matching `token` or `fid`
/// target.
final class FcmRegistration extends PushRegistration {
  /// A registration by FCM registration token.
  const FcmRegistration.token(String this.token) : fid = null, super._();

  /// A registration by Firebase installation ID.
  const FcmRegistration.fid(String this.fid) : token = null, super._();

  /// The FCM registration token, unless FCM registered [fid].
  final String? token;

  /// The Firebase installation ID (FID) that FCM registered, when the app's
  /// manifest switches FCM to installation IDs.
  final String? fid;

  @override
  String get kind => 'fcm';

  @override
  Map<String, String> toJson() => {'kind': kind, 'token': ?token, 'fid': ?fid};

  @override
  bool operator ==(Object other) => other is FcmRegistration && other.token == token && other.fid == fid;

  @override
  int get hashCode => Object.hash(token, fid);

  @override
  String toString() => fid == null ? 'FcmRegistration(token)' : 'FcmRegistration(fid)';
}

/// An iOS APNs device token, in lowercase hexadecimal: for alerts, or with
/// [voip] for VoIP pushes through PushKit, which your backend sends to the
/// `<bundle ID>.voip` topic.
final class ApnsRegistration extends PushRegistration {
  const ApnsRegistration(this.token, {this.voip = false}) : super._();

  final String token;

  /// Whether [token] is PushKit's, for VoIP pushes.
  final bool voip;

  @override
  String get kind => voip ? 'apnsVoip' : 'apns';

  @override
  Map<String, String> toJson() => {'kind': kind, 'token': token};

  @override
  bool operator ==(Object other) => other is ApnsRegistration && other.token == token && other.voip == voip;

  @override
  int get hashCode => Object.hash(token, voip);

  @override
  String toString() => 'ApnsRegistration($kind)';
}

/// What the user did in the system call UI.
enum CallActionKind {
  /// Answered the ring: join the call.
  answer,

  /// Declined the ring on this device.
  decline,

  /// Ended an answered call.
  end,

  /// Muted the microphone in the system call UI, on iOS.
  mute,

  /// Unmuted the microphone in the system call UI, on iOS.
  unmute,
}

/// The user acted on a call in the system call UI.
final class CallAction {
  const CallAction._(this.kind, this.alertId, this.call);

  final CallActionKind kind;

  /// The ring the action is for.
  final String alertId;

  /// The ring's notification, when the device still had it.
  final CallNotification? call;

  @override
  String toString() => 'CallAction(${kind.name}, $alertId)';
}

/// Push notifications and the system incoming-call UI on Android and iOS.
///
/// The plugin's native code shows ConvoHop pushes even while Dart isn't
/// running. On Android, its Firebase messaging service builds a notification
/// for each FCM data message and rings with a full-screen call-style
/// notification. On iOS, the system shows APNs alerts, and VoIP pushes ring
/// through CallKit once you [registerVoip]. Without `title` or `body` in the
/// push, which is the default because message previews are off,
/// notifications show generic text: see the package README to localize it.
///
/// Listen to the streams, then call [start]. Send each registration from
/// [registrations] to your backend.
final class ConvoHopPush {
  ConvoHopPush({
    ConvoHopNotifications? notifications,
    ErrorListener? onError,
    @visibleForTesting MethodChannel methods = const MethodChannel('convohop/push'),
    @visibleForTesting EventChannel events = const EventChannel('convohop/push/events'),
  }) : notifications = notifications ?? ConvoHopNotifications(),
       _onError = onError,
       _methods = methods,
       _eventChannel = events;

  /// Deduplicates notifications and tracks rings.
  final ConvoHopNotifications notifications;
  final ErrorListener? _onError;
  final MethodChannel _methods;
  final EventChannel _eventChannel;
  final StreamController<PushRegistration> _registrations = StreamController<PushRegistration>.broadcast();
  final StreamController<HandledNotification> _received = StreamController<HandledNotification>.broadcast();
  final StreamController<ConvoHopNotification> _openedNotifications =
      StreamController<ConvoHopNotification>.broadcast();
  final StreamController<CallAction> _callActions = StreamController<CallAction>.broadcast();
  final Set<String> _answered = <String>{};
  final Set<String> _endedByNative = <String>{};
  StreamSubscription<Object?>? _subscription;
  StreamSubscription<RingUpdate>? _rings;
  Future<void>? _starting;
  bool _closed = false;

  /// This device's push registrations, after [register] and [registerVoip]
  /// and whenever the platform changes one. The same registration can
  /// arrive more than once: store them idempotently.
  Stream<PushRegistration> get registrations => _registrations.stream;

  /// ConvoHop pushes that reached the device while Dart was running, after
  /// native code showed them. Check [HandledNotification.duplicate]. On iOS,
  /// alert pushes reach the app only while it's in the foreground.
  Stream<HandledNotification> get received => _received.stream;

  /// Notifications the user opened: open the conversation or the call.
  Stream<ConvoHopNotification> get opened => _openedNotifications.stream;

  /// What the user did in the system call UI, including actions taken
  /// shortly before Dart started.
  Stream<CallAction> get callActions => _callActions.stream;

  /// Starts delivering native events, including the notification that
  /// launched the app and earlier call actions. Listen to the streams first.
  Future<void> start() => _starting ??= _start();

  Future<void> _start() async {
    _checkOpen();
    _rings = notifications.rings.listen(_ringChanged);
    _subscription = _eventChannel.receiveBroadcastStream().listen(_event, onError: _report);
    final initial = await _methods.invokeMapMethod<Object?, Object?>('getInitialNotification');
    if (initial != null) _handleOpened(initial);
    final actions = await _methods.invokeListMethod<Object?>('takeCallActions') ?? const <Object?>[];
    for (final action in actions) {
      _callAction(action);
    }
  }

  /// Asks the user to allow notifications. Resolves whether they're allowed.
  Future<bool> requestPermission() async => await _methods.invokeMethod<bool>('requestPermission') ?? false;

  /// Registers this device for alert pushes, and reports the registration on
  /// [registrations]: an [FcmRegistration] on Android and an
  /// [ApnsRegistration] on iOS. Call it at each launch, after [start].
  ///
  /// On iOS the registration can arrive after this returns, once APNs issued
  /// a token. On Android it throws a [PlatformException] with code
  /// `FIREBASE_UNAVAILABLE` when Firebase isn't configured or registration
  /// failed, for example while offline.
  Future<void> register() async {
    _checkOpen();
    final value = await _methods.invokeMapMethod<Object?, Object?>('register');
    if (value != null && !_closed) _registrations.add(_parseRegistration(value));
  }

  /// Registers for VoIP pushes with PushKit, on iOS only, and keeps doing so
  /// at each launch. The registration arrives on [registrations]. Call it
  /// only if your app rings through CallKit: iOS terminates an app that
  /// receives a VoIP push without reporting a call.
  Future<void> registerVoip() => _methods.invokeMethod<void>('registerVoip');

  /// Whether Android lets the app show full-screen incoming calls. From
  /// Android 14, users and app stores can turn it off; incoming calls then
  /// show as heads-up notifications. Always true on iOS.
  Future<bool> canUseFullScreenIntent() async => await _methods.invokeMethod<bool>('canUseFullScreenIntent') ?? false;

  /// Records a push payload that reached Dart another way, for example
  /// through another push plugin, and reports it on [received]. Returns
  /// null when the payload isn't ConvoHop's; throws a [FormatException]
  /// when it breaks the push payload contract.
  HandledNotification? handleNotification(Map<Object?, Object?> payload) {
    final handled = notifications.handleNotification(payload);
    if (handled != null && !_received.isClosed) _received.add(handled);
    return handled;
  }

  /// Shows a ConvoHop FCM data message with the plugin's notifications, on
  /// Android, when another plugin's messaging service received it: call it
  /// with the message's data from that plugin's foreground and background
  /// handlers, instead of [handleNotification]. While a started
  /// [ConvoHopPush] runs, [received] reports it. Resolves false when
  /// [payload] isn't ConvoHop's, and on iOS, where the system shows APNs
  /// alerts.
  Future<bool> showNotification(Map<Object?, Object?> payload) async {
    if (!payload.containsKey('convohop')) return false;
    final data = payload['convohop'];
    final String json;
    try {
      json = data is String ? data : jsonEncode(data);
    } on JsonUnsupportedObjectError {
      throw const FormatException('convohop must be a JSON object');
    }
    return await _methods.invokeMethod<bool>('showNotification', {'convohop': json}) ?? false;
  }

  /// Rings for [call] in the system call UI, for example when another push
  /// plugin delivered the call's push to Dart. Does nothing once the ring
  /// stopped. Throws a [PlatformException] with code `CALL_FAILED` when the
  /// system refused the call, for example when iOS Do Not Disturb or call
  /// blocking rejects it in CallKit.
  Future<void> showIncomingCall(CallNotification call) async {
    notifications.record(call);
    if (!notifications.isRinging(call.alertId)) return;
    await _methods.invokeMethod<void>('showIncomingCall', <String, Object?>{'convohop': call.toJson()});
  }

  /// Answers the ring [alertId] in the system call UI, for example from the
  /// app's own incoming-call screen, and reports it on [callActions].
  /// Resolves false when the ring had stopped.
  Future<bool> answerCall(String alertId) async =>
      await _methods.invokeMethod<bool>('answerCall', {'alertId': alertId}) ?? false;

  /// Declines the ring [alertId] on this device and reports it on
  /// [callActions]. Resolves false when the ring had stopped. Other devices
  /// keep ringing: the decline is local.
  Future<bool> declineCall(String alertId) async =>
      await _methods.invokeMethod<bool>('declineCall', {'alertId': alertId}) ?? false;

  /// Ends the ring or call [alertId] in the system call UI without a call
  /// action: the call ended, or the ring stopped elsewhere. [reason] is a
  /// cancellation reason: `answered`, `declined`, `ended` or `expired`.
  /// Rings that [notifications] sees stop end by themselves.
  Future<void> endCall(String alertId, {String reason = 'ended'}) {
    _answered.remove(alertId);
    return _methods.invokeMethod<void>('endCall', {'alertId': alertId, 'reason': reason});
  }

  /// Removes ConvoHop's delivered message notifications, only
  /// [conversationId]'s when given, for example when the user opens the
  /// conversation. The app's own notifications stay.
  Future<void> removeDeliveredNotifications({String? conversationId}) =>
      _methods.invokeMethod<void>('removeDeliveredNotifications', {'conversationId': ?conversationId});

  /// Sets the conversation the user is looking at, or null for none. While
  /// the app is in the foreground, its message pushes show no notification;
  /// they still arrive on [received].
  Future<void> setActiveConversation(String? conversationId) =>
      _methods.invokeMethod<void>('setActiveConversation', {'conversationId': ?conversationId});

  /// Stops delivering events. Native code keeps showing pushes.
  Future<void> close() async {
    if (_closed) return;
    _closed = true;
    // Not awaited: a broadcast cancel has nothing to wait for, and its root-zone future would stall close() under fake time.
    _subscription?.cancel().ignore();
    _rings?.cancel().ignore();
    // Listeners don't hold up closing, so it can't wait on a paused one.
    _registrations.close().ignore();
    _received.close().ignore();
    _openedNotifications.close().ignore();
    _callActions.close().ignore();
  }

  void _checkOpen() {
    if (_closed) throw StateError('ConvoHopPush is closed');
  }

  void _ringChanged(RingUpdate update) {
    if (update.ringing || _closed) return;
    final alertId = update.call.alertId;
    // An answered ring is the call itself now; the app ends it.
    if (_answered.contains(alertId) || _endedByNative.contains(alertId)) return;
    _methods
        .invokeMethod<void>('endCall', {'alertId': alertId, 'reason': update.reason ?? 'ended'})
        .then((_) {}, onError: _report);
  }

  void _event(Object? event) {
    if (_closed) return;
    try {
      if (event is! Map) throw const FormatException('Invalid push event');
      switch (event['type']) {
        case 'registration':
          _registrations.add(_parseRegistration(event));
        case 'notification':
          final payload = event['payload'];
          if (payload is! Map) throw const FormatException('Invalid push notification event');
          handleNotification(payload);
        case 'opened':
          _handleOpened(event);
        case 'callAction':
          _callAction(event);
        default:
          // Event types a later plugin version adds.
          break;
      }
    } on Object catch (error) {
      _report(error);
    }
  }

  // Native code reports whether an opened call still rings, and why it
  // stopped.
  void _handleOpened(Map<Object?, Object?> event) {
    try {
      final payload = event['payload'];
      if (payload is! Map) throw const FormatException('Invalid opened notification event');
      final notification = parseNotificationPayload(payload);
      if (notification == null) return;
      if (notification is RingNotification) {
        final reason = event['reason'];
        _whileNativeEnded(notification.alertId, () {
          notifications.record(notification);
          if (notification is CallNotification && event['ringing'] == false) {
            notifications.stopRinging(
              notification.alertId,
              reason: reason is String && reason.isNotEmpty ? reason : 'ended',
            );
          }
        });
      } else {
        notifications.record(notification);
      }
      if (!_openedNotifications.isClosed) _openedNotifications.add(notification);
    } on Object catch (error) {
      _report(error);
    }
  }

  // Native code already ended the ring, so stopping it in [action] must not
  // end it again.
  void _whileNativeEnded(String alertId, void Function() action) {
    final added = _endedByNative.add(alertId);
    try {
      action();
    } finally {
      if (added) _endedByNative.remove(alertId);
    }
  }

  void _callAction(Object? value) {
    try {
      if (value is! Map) throw const FormatException('Invalid call action');
      final kind = switch (value['action']) {
        'answer' => CallActionKind.answer,
        'decline' => CallActionKind.decline,
        'end' => CallActionKind.end,
        'mute' => CallActionKind.mute,
        'unmute' => CallActionKind.unmute,
        _ => throw const FormatException('Invalid call action'),
      };
      final alertId = value['alertId'];
      if (alertId is! String || alertId.isEmpty) throw const FormatException('Invalid call action');
      final payload = value['payload'];
      CallNotification? call;
      if (payload is Map) {
        final parsed = parseNotificationPayload(payload);
        if (parsed is CallNotification && parsed.alertId == alertId) {
          call = parsed;
          notifications.record(parsed);
        }
      }
      _whileNativeEnded(alertId, () {
        switch (kind) {
          case CallActionKind.answer:
            _answered.add(alertId);
            notifications.stopRinging(alertId, reason: 'answered');
          case CallActionKind.decline:
            notifications.stopRinging(alertId);
          case CallActionKind.end:
            _answered.remove(alertId);
            notifications.stopRinging(alertId, reason: 'ended');
          case CallActionKind.mute || CallActionKind.unmute:
            break;
        }
      });
      if (!_callActions.isClosed) _callActions.add(CallAction._(kind, alertId, call));
    } on Object catch (error) {
      _report(error);
    }
  }

  // A registration carries exactly one of token and fid, and only FCM's can
  // carry fid.
  PushRegistration _parseRegistration(Map<Object?, Object?> value) {
    String? field(String key) {
      if (!value.containsKey(key)) return null;
      final field = value[key];
      if (field is! String || field.isEmpty) throw const FormatException('Invalid push registration');
      return field;
    }

    return switch ((value['kind'], field('token'), field('fid'))) {
      ('fcm', final String token, null) => FcmRegistration.token(token),
      ('fcm', null, final String fid) => FcmRegistration.fid(fid),
      ('apns', final String token, null) => ApnsRegistration(token),
      ('apnsVoip', final String token, null) => ApnsRegistration(token, voip: true),
      _ => throw const FormatException('Invalid push registration'),
    };
  }

  void _report(Object error) {
    final listener = _onError;
    if (listener == null) return;
    try {
      listener(error);
    } on Object {
      // The app's own handler failed: keep handling native events.
    }
  }
}
