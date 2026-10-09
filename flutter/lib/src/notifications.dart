import 'dart:async';
import 'dart:convert';

import 'client.dart';
import 'generated/generated.dart';
import 'protocol.dart';

// The `convohop` object of a push request follows $defs/data in
// spec/push-payload/push-payload.schema.json. The checks below mirror it.
final _uuid = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
const _nilUuid = '00000000-0000-0000-0000-000000000000';
final _timestamp = RegExp(
  r'^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.[0-9]{1,9})?(?:Z|([+-])([0-9]{2}):([0-9]{2}))$',
);
final _identifier = RegExp(r'^[A-Za-z][A-Za-z0-9_]{0,63}$');

/// Unix seconds of an RFC 3339 timestamp with an uppercase `T`, and `Z` or an
/// offset, ignoring any fraction, or null when the value isn't one. The date
/// must exist, and second 60 isn't accepted.
int? notificationEpochSeconds(String value) {
  final match = _timestamp.firstMatch(value);
  if (match == null) return null;
  int part(int index) => int.parse(match[index] ?? '0');
  final year = part(1), month = part(2), day = part(3), hour = part(4), minute = part(5), second = part(6);
  final offsetHour = part(8), offsetMinute = part(9);
  if (month < 1 ||
      month > 12 ||
      day < 1 ||
      day > _daysIn(year, month) ||
      hour > 23 ||
      minute > 59 ||
      second > 59 ||
      offsetHour > 23 ||
      offsetMinute > 59) {
    return null;
  }
  final local = DateTime.utc(year, month, day, hour, minute, second).millisecondsSinceEpoch ~/ 1000;
  return local - (match[7] == '-' ? -1 : 1) * (offsetHour * 3600 + offsetMinute * 60);
}

int _daysIn(int year, int month) {
  if (month == 2) return year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) ? 29 : 28;
  return const {4, 6, 9, 11}.contains(month) ? 30 : 31;
}

bool _wellFormed(String value) {
  for (var index = 0; index < value.length; index++) {
    final unit = value.codeUnitAt(index);
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      if (index + 1 == value.length) return false;
      final next = value.codeUnitAt(index + 1);
      if (next < 0xDC00 || next > 0xDFFF) return false;
      index++;
    } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
      return false;
    }
  }
  return true;
}

// Problems name the field, never its value.
String _uuidField(Map<Object?, Object?> source, String field) {
  final value = source[field];
  if (value is! String || !_uuid.hasMatch(value) || value == _nilUuid) {
    throw FormatException('convohop.$field must be a lowercase, non-nil UUID');
  }
  return value;
}

String _timestampField(Map<Object?, Object?> source, String field) {
  final value = source[field];
  if (value is! String || notificationEpochSeconds(value) == null) {
    throw FormatException('convohop.$field must be an RFC 3339 timestamp');
  }
  return value;
}

String _identifierField(Map<Object?, Object?> source, String field) {
  final value = source[field];
  if (value is! String || !_identifier.hasMatch(value)) {
    throw FormatException('convohop.$field must be an ASCII letter followed by up to 63 ASCII letters, digits or _');
  }
  return value;
}

String? _textField(Map<Object?, Object?> source, String field) {
  if (!source.containsKey(field)) return null;
  final value = source[field];
  if (value is! String || value.isEmpty || !_wellFormed(value)) {
    throw FormatException('convohop.$field must be non-empty Unicode text');
  }
  return value;
}

// Platform text from an APNs alert. It isn't part of the ConvoHop contract,
// so anything other than usable text counts as none.
String? _alertText(Object? aps, String field) {
  if (aps is! Map) return null;
  final alert = aps['alert'];
  final value = alert is Map ? alert[field] : (field == 'body' ? alert : null);
  return value is String && value.isNotEmpty && _wellFormed(value) ? value : null;
}

/// A ConvoHop notification, parsed from a push payload's `convohop` object.
///
/// Notifications carry identifiers. They carry message text only when the
/// project opted in to message previews (off by default) or your backend
/// added its own text, so [title] and [body] are often null: show your own
/// generic text and fetch content with the user's session.
sealed class ConvoHopNotification {
  ConvoHopNotification._(Map<Object?, Object?> data, this.title, this.body)
    : eventId = _uuidField(data, 'eventId'),
      occurredAt = _timestampField(data, 'occurredAt'),
      projectId = _uuidField(data, 'projectId'),
      recipientId = _uuidField(data, 'recipientId'),
      conversationId = _uuidField(data, 'conversationId'),
      senderId = _uuidField(data, 'senderId');

  /// Deduplicate on this: delivery is at least once.
  final String eventId;

  /// `notification.message`, `notification.call` or
  /// `notification.callCancelled`.
  String get eventType;
  final String occurredAt;
  final String projectId;

  /// The principal the notification is for.
  final String recipientId;
  final String conversationId;

  /// Who sent the message or started the ringing.
  final String senderId;

  /// Visible title, when the push had one.
  final String? title;

  /// Visible body, when the push had one. With previews off, a message
  /// notification has none.
  final String? body;

  /// Whether this notification is for [client]'s user and project.
  bool isFor(ConvoHopClient client) => projectId == client.projectId && recipientId == client.principalId;

  /// The `convohop` object, for handing the notification to native code.
  Map<String, Object?> toJson();

  Map<String, Object?> _common() => <String, Object?>{
    'eventId': eventId,
    'eventType': eventType,
    'occurredAt': occurredAt,
    'projectId': projectId,
    'recipientId': recipientId,
    'conversationId': conversationId,
    'senderId': senderId,
  };

  Map<String, Object?> _text() => <String, Object?>{'title': ?title, 'body': ?body};
}

/// A new message for the user.
final class MessageNotification extends ConvoHopNotification {
  MessageNotification._(super.data, super.title, super.body) : messageId = _uuidField(data, 'messageId'), super._();

  final String messageId;

  @override
  String get eventType => 'notification.message';

  /// Fetches the message with the user's own session, for example when
  /// [body] is null because previews are off.
  Future<Message> fetchMessage(ConvoHopClient client) {
    if (!isFor(client)) {
      return Future<Message>.error(StateError('The notification is for another user or project'));
    }
    return client.getMessage(conversationId, messageId);
  }

  @override
  Map<String, Object?> toJson() => <String, Object?>{..._common(), 'messageId': messageId, ..._text()};
}

/// A notification about one ring of a call.
sealed class RingNotification extends ConvoHopNotification {
  RingNotification._(super.data, super.title, super.body)
    : liveSessionId = _uuidField(data, 'liveSessionId'),
      alertId = _uuidField(data, 'alertId'),
      expiresAt = _timestampField(data, 'expiresAt'),
      mediaProfile = _identifierField(data, 'mediaProfile'),
      super._();

  final String liveSessionId;

  /// One ring for one recipient. A later ring of the same call has a new one.
  final String alertId;

  /// When the ring stops if nobody answers.
  final String expiresAt;

  /// `AUDIO_ONLY`, `AUDIO_VIDEO` or a profile this SDK doesn't know yet.
  final String mediaProfile;

  /// [expiresAt] in milliseconds since the epoch, ignoring any fraction.
  int get expiresAtMillis => notificationEpochSeconds(expiresAt)! * 1000;

  bool get hasVideo => mediaProfile == LiveMediaProfile.audioVideo.wire;

  Map<String, Object?> _ring() => <String, Object?>{
    ..._common(),
    'liveSessionId': liveSessionId,
    'alertId': alertId,
    'expiresAt': expiresAt,
    'mediaProfile': mediaProfile,
  };
}

/// An incoming call: a ring for the user.
final class CallNotification extends RingNotification {
  CallNotification._(super.data, super.title, super.body) : super._();

  @override
  String get eventType => 'notification.call';

  @override
  Map<String, Object?> toJson() => <String, Object?>{..._ring(), ..._text()};
}

/// A ring that stopped for the user.
final class CallCancelledNotification extends RingNotification {
  CallCancelledNotification._(super.data, super.title, super.body)
    : reason = _identifierField(data, 'reason'),
      super._();

  /// `answered`, `declined`, `ended`, `expired` or a reason this SDK doesn't
  /// know yet, which only stops the ringing.
  final String reason;

  @override
  String get eventType => 'notification.callCancelled';

  /// Whether to tell the user they missed the call: the call ended or nobody
  /// answered. Answered and declined rings (on any device) only stop ringing.
  bool get missedCall => reason == 'ended' || reason == 'expired';

  @override
  Map<String, Object?> toJson() => <String, Object?>{..._ring(), 'reason': reason, ..._text()};
}

/// Parses a push payload: an APNs `userInfo` (`{aps, convohop: {...}}`), FCM
/// data (`{convohop: "<JSON>"}`) or a Web Push payload.
///
/// Returns null when the payload isn't ConvoHop's, and throws a
/// [FormatException] naming the first invalid field when it breaks the push
/// payload contract. Fields it doesn't know are ignored, as the contract
/// requires of consumers.
ConvoHopNotification? parseNotificationPayload(Map<Object?, Object?> payload) {
  if (!payload.containsKey('convohop')) return null;
  var data = payload['convohop'];
  if (data is String) {
    try {
      data = jsonDecode(data);
    } on FormatException {
      throw const FormatException('convohop must be a JSON object');
    }
  }
  if (data is! Map) throw const FormatException('convohop must be an object');
  final eventType = data['eventType'];
  final aps = payload['aps'];
  final title = _textField(data, 'title') ?? _alertText(aps, 'title');
  final body = _textField(data, 'body') ?? _alertText(aps, 'body');
  return switch (eventType) {
    'notification.message' => MessageNotification._(data, title, body),
    'notification.call' => CallNotification._(data, title, body),
    'notification.callCancelled' => CallCancelledNotification._(data, title, body),
    _ => throw const FormatException('convohop.eventType must be a notification event type'),
  };
}

/// What [ConvoHopNotifications.handleNotification] found.
final class HandledNotification {
  const HandledNotification._(this.notification, {required this.duplicate, required this.ringing});

  final ConvoHopNotification notification;

  /// Whether an earlier payload had the same event ID. Act on a notification
  /// once.
  final bool duplicate;

  /// For a [CallNotification]: whether the ring is still on, with no
  /// cancellation for its alert seen and its `expiresAt` in the future.
  final bool ringing;
}

/// A change in a ring's state.
final class RingUpdate {
  const RingUpdate._(this.call, this.ringing, this.reason);

  final CallNotification call;
  final bool ringing;

  /// Why the ring stopped: the cancellation's reason, or `expired` when its
  /// `expiresAt` passed. Null while it rings.
  final String? reason;
}

final class _Ring {
  _Ring(this.expiresAt);

  final int expiresAt;
  CallNotification? call;
  String? stopped;
  Timer? timer;
}

/// Handles ConvoHop push payloads on the device: parses and validates them,
/// deduplicates on `eventId`, and tracks which calls are ringing.
///
/// Delivery is at least once and unordered, so a cancellation can arrive
/// before its call. A call stops ringing once a cancellation with its
/// `alertId` was seen or its `expiresAt` passed.
final class ConvoHopNotifications {
  /// [capacity] bounds how many event IDs are remembered for deduplication.
  ConvoHopNotifications({Clock? clock, int capacity = 1024})
    : _clock = clock ?? systemClock,
      _capacity = capacity > 0 ? capacity : throw RangeError.value(capacity, 'capacity', 'Must be positive');

  final Clock _clock;
  final int _capacity;
  final _seen = <String>{};
  final _rings = <String, _Ring>{};
  final _updates = StreamController<RingUpdate>.broadcast(sync: true);

  /// Ring changes: a call starts or stops ringing.
  Stream<RingUpdate> get rings => _updates.stream;

  /// Calls that are ringing now.
  List<CallNotification> get ringing => [
    for (final ring in _rings.values)
      if (ring.call != null && ring.stopped == null && ring.expiresAt > _clock()) ring.call!,
  ];

  /// Whether the ring [alertId] is on.
  bool isRinging(String alertId) {
    final ring = _rings[alertId];
    return ring != null && ring.call != null && ring.stopped == null && ring.expiresAt > _clock();
  }

  /// Parses and records [payload]. Returns null when it isn't a ConvoHop
  /// payload, and throws a [FormatException] when it breaks the contract.
  HandledNotification? handleNotification(Map<Object?, Object?> payload) {
    final notification = parseNotificationPayload(payload);
    return notification == null ? null : record(notification);
  }

  /// Records an already parsed [notification].
  HandledNotification record(ConvoHopNotification notification) {
    final duplicate = !_remember(notification.eventId);
    _prune();
    switch (notification) {
      case MessageNotification():
        return HandledNotification._(notification, duplicate: duplicate, ringing: false);
      case CallNotification():
        final ring = _rings.putIfAbsent(notification.alertId, () => _Ring(notification.expiresAtMillis));
        final first = ring.call == null;
        ring.call ??= notification;
        final ringing = isRinging(notification.alertId);
        if (first && ringing && !_updates.isClosed) {
          ring.timer = Timer(Duration(milliseconds: ring.expiresAt - _clock()), () => _stop(ring, 'expired'));
          _updates.add(RingUpdate._(notification, true, null));
        }
        return HandledNotification._(notification, duplicate: duplicate || !first, ringing: ringing);
      case CallCancelledNotification():
        final ring = _rings.putIfAbsent(notification.alertId, () => _Ring(notification.expiresAtMillis));
        _stop(ring, notification.reason);
        return HandledNotification._(notification, duplicate: duplicate, ringing: false);
    }
  }

  /// Stops the ring [alertId] locally, for example after the user declined
  /// it in the call UI. Returns whether it was ringing.
  bool stopRinging(String alertId, {String reason = 'declined'}) {
    final ring = _rings[alertId];
    if (ring == null || ring.call == null || ring.stopped != null) return false;
    _stop(ring, reason);
    return true;
  }

  /// Stops every ring of the call [liveSessionId], for example when the
  /// call ended. Returns whether any was ringing.
  bool stopCall(String liveSessionId, {String reason = 'ended'}) {
    var stopped = false;
    for (final ring in _rings.values.toList()) {
      if (ring.call?.liveSessionId != liveSessionId || ring.stopped != null) continue;
      stopped = ring.timer != null || stopped;
      _stop(ring, reason);
    }
    return stopped;
  }

  /// Applies a conversation event from the user's realtime connection: a
  /// `live.ended` event stops the call's rings. Pass every event of the
  /// conversations the user can be called in, for example from
  /// `ConversationStore.events`, because pushes don't always report that a
  /// ring stopped. Returns whether a ring stopped.
  bool applyEvent(Event event) {
    final liveSessionId = event.payload?.liveSessionId;
    if (event.type != 'live.ended' || liveSessionId == null) return false;
    return stopCall(liveSessionId);
  }

  void _stop(_Ring ring, String reason) {
    if (ring.stopped != null) return;
    final wasRinging = ring.timer != null;
    ring.stopped = reason;
    ring.timer?.cancel();
    ring.timer = null;
    final call = ring.call;
    if (call != null && wasRinging && !_updates.isClosed) _updates.add(RingUpdate._(call, false, reason));
  }

  bool _remember(String eventId) {
    if (!_seen.add(eventId)) return false;
    if (_seen.length > _capacity) _seen.remove(_seen.first);
    return true;
  }

  // Keeps stopped rings for a day so a late duplicate of the call doesn't ring again.
  void _prune() {
    final horizon = _clock() - const Duration(days: 1).inMilliseconds;
    _rings.removeWhere((_, ring) {
      final old = ring.expiresAt < horizon;
      if (old) ring.timer?.cancel();
      return old;
    });
  }

  /// Cancels ring timers and stops reporting on [rings]. Payloads are still
  /// parsed, deduplicated and tracked.
  void close() {
    for (final ring in _rings.values) {
      ring.timer?.cancel();
      ring.timer = null;
    }
    _updates.close();
  }
}
