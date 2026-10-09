import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

import 'generated/generated.dart';

/// A JSON object as the protocol carries it.
typedef JsonObject = Map<String, Object?>;

/// Milliseconds since the Unix epoch. Inject a clock in tests.
typedef Clock = int Function();

int systemClock() => DateTime.now().millisecondsSinceEpoch;

final _uuid = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
final _counter = RegExp(r'^(0|[1-9][0-9]*)$');
final _maxCounter = BigInt.parse('9223372036854775807');
final _millisecondTimestamp = RegExp(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$');
const _nilUuid = '00000000-0000-0000-0000-000000000000';
const maxSafeInteger = 9007199254740991;
final _random = Random.secure();

/// A new random request ID (a version 4 UUID).
String newRequestId() {
  final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
      '${hex.substring(16, 20)}-${hex.substring(20)}';
}

JsonObject parseObject(Object? value) {
  if (value is Map<String, Object?>) return value;
  if (value is Map) {
    final copy = <String, Object?>{};
    for (final entry in value.entries) {
      final key = entry.key;
      if (key is! String) throw const FormatException('Invalid protocol object');
      copy[key] = entry.value;
    }
    return copy;
  }
  throw const FormatException('Invalid protocol object');
}

String parseString(Object? value) =>
    value is String ? value : throw const FormatException('Expected a protocol string');

/// A canonical lowercase UUID that isn't the nil UUID.
String parseId(Object? value) {
  final id = parseString(value);
  if (!_uuid.hasMatch(id) || id == _nilUuid) throw const FormatException('Expected a canonical nonzero UUID');
  return id;
}

bool isId(Object? value) => value is String && _uuid.hasMatch(value) && value != _nilUuid;

/// A canonical decimal SQL counter, at most 2^63-1. Counters stay strings.
String parseCounter(Object? value) {
  final counter = parseString(value);
  if (!_counter.hasMatch(counter) || BigInt.parse(counter) > _maxCounter) {
    throw const FormatException('Expected a canonical decimal counter');
  }
  return counter;
}

BigInt counterValue(String counter) => BigInt.parse(parseCounter(counter));

bool parseBool(Object? value) => value is bool ? value : throw const FormatException('Expected a protocol boolean');

/// A UTC timestamp with exactly three fraction digits, as the authority writes them.
String parseTimestamp(Object? value) {
  final time = parseString(value);
  if (!_millisecondTimestamp.hasMatch(time)) throw const FormatException('Expected a UTC millisecond timestamp');
  final parsed = DateTime.tryParse(time);
  if (parsed == null || parsed.toUtc().toIso8601String() != time) {
    throw const FormatException('Expected a UTC millisecond timestamp');
  }
  return time;
}

int timestampMillis(String value) => DateTime.parse(parseTimestamp(value)).millisecondsSinceEpoch;

Cursor parseCursor(Object? value) {
  final v = parseObject(value);
  return Cursor(
    incarnation: parseId(v['incarnation']),
    conversationId: parseId(v['conversationId']),
    sequence: parseCounter(v['sequence']),
  );
}

Map<String, Object?> cursorJson(Cursor cursor) => <String, Object?>{
  'incarnation': cursor.incarnation,
  'conversationId': cursor.conversationId,
  'sequence': cursor.sequence,
};

/// Checks that an event page stays in one conversation and incarnation,
/// that its events are strictly ordered after [after], and that its frontier
/// covers them.
EventPage checkEventPage(EventPage page, String incarnation, String conversationId, {Cursor? after}) {
  final cursor = page.nextCursor;
  if (cursor == null) throw const FormatException('Missing authoritative replay frontier');
  final frontier = counterValue(cursor.sequence);
  if (cursor.conversationId != conversationId ||
      cursor.incarnation != incarnation ||
      (after != null && frontier < counterValue(after.sequence))) {
    throw const FormatException('Invalid authoritative replay frontier');
  }
  var previous = BigInt.parse(after?.sequence ?? '0');
  for (final event in page.items) {
    final sequence = counterValue(event.sequence);
    parseId(event.eventId);
    if (event.conversationId != conversationId || sequence <= previous || sequence > frontier) {
      throw const FormatException('Invalid ordered event scope');
    }
    previous = sequence;
  }
  return page;
}

/// The signed route proof: where this project's authority and realtime endpoint live.
final class ProjectRoute {
  const ProjectRoute({
    required this.projectId,
    required this.incarnation,
    required this.servingEpoch,
    required this.communicationBase,
    required this.wssUrl,
    required this.expiresAt,
    required this.signature,
  });

  final String projectId;
  final String incarnation;
  final String servingEpoch;
  final String communicationBase;
  final String wssUrl;
  final String expiresAt;
  final String signature;

  Map<String, Object?> toJson() => <String, Object?>{
    'projectId': projectId,
    'incarnation': incarnation,
    'servingEpoch': servingEpoch,
    'communicationBase': communicationBase,
    'wssUrl': wssUrl,
    'expiresAt': expiresAt,
    'signature': signature,
  };
}

ProjectRoute parseRoute(Object? value) {
  final v = parseObject(value);
  return ProjectRoute(
    projectId: parseId(v['projectId']),
    incarnation: parseId(v['incarnation']),
    servingEpoch: parseCounter(v['servingEpoch']),
    communicationBase: parseString(v['communicationBase']),
    wssUrl: parseString(v['wssUrl']),
    expiresAt: parseTimestamp(v['expiresAt']),
    signature: parseString(v['signature']),
  );
}

/// Checks session metadata: canonical IDs, a millisecond expiry and a nonzero revision.
Session checkSessionMetadata(Session value) {
  parseTimestamp(value.expiresAt);
  if (parseCounter(value.sessionRevision) == '0') throw const FormatException('Invalid session expiry or revision');
  parseId(value.sessionId);
  parseId(value.principalId);
  parseId(value.deviceId);
  parseId(value.incarnation);
  return value;
}

/// When the session's bearer stops working. The authority enforces its signed
/// token's whole-second expiry without leeway.
int sessionExpiry(Session value) => (timestampMillis(value.expiresAt) ~/ 1000) * 1000;

/// Current session evidence: the authority reports this session active and unexpired.
Session checkCurrentSession(CurrentSessionReply proof, int now) {
  final value = checkSessionMetadata(proof.result);
  if (proof.status != 'ok' ||
      value.status != 'active' ||
      sessionExpiry(value) <= now ||
      sessionExpiry(value) <= timestampMillis(proof.serverTime)) {
    throw const FormatException('Expected current live session authority evidence');
  }
  return value;
}

bool sameSession(Session left, Session right) =>
    left.sessionId == right.sessionId &&
    left.principalId == right.principalId &&
    left.deviceId == right.deviceId &&
    left.incarnation == right.incarnation;

bool sameSessionMetadata(Session left, Session right) => canonicalJson(left.toJson()) == canonicalJson(right.toJson());

/// The canonical origin of an HTTPS URL, or of loopback HTTP for local development.
String parseOrigin(String value) {
  final Uri url;
  try {
    url = Uri.parse(value);
  } on FormatException {
    throw const FormatException('Use an HTTPS origin, or explicit loopback HTTP for local development');
  }
  final loopback = const {'127.0.0.1', 'localhost', '::1'}.contains(url.host);
  if (url.userInfo.isNotEmpty ||
      url.hasQuery ||
      url.hasFragment ||
      (url.path != '' && url.path != '/') ||
      url.host.isEmpty ||
      !(url.scheme == 'https' || (url.scheme == 'http' && loopback))) {
    throw const FormatException('Use an HTTPS origin, or explicit loopback HTTP for local development');
  }
  return _origin(url);
}

String _origin(Uri url) {
  final host = url.host.contains(':') ? '[${url.host}]' : url.host;
  final defaultPort = url.scheme == 'https' || url.scheme == 'wss' ? 443 : 80;
  final port = url.hasPort && url.port != defaultPort ? ':${url.port}' : '';
  return '${url.scheme}://$host$port';
}

/// The authority part (host and non-default port) of a URL, as URL `host` reports it.
String urlHost(Uri url) {
  final host = url.host.contains(':') ? '[${url.host}]' : url.host;
  final defaultPort = url.scheme == 'https' || url.scheme == 'wss' ? 443 : 80;
  return url.hasPort && url.port != defaultPort ? '$host:${url.port}' : host;
}

/// Compact JSON with sorted keys, like the TypeScript SDK's canonical form.
/// Numbers must be safe integers or finite.
String canonicalJson(Object? value) {
  if (value is List) return '[${value.map(canonicalJson).join(',')}]';
  if (value is Map) {
    final object = parseObject(value);
    final keys = object.keys.toList()..sort();
    return '{${keys.map((key) => '${jsonEncode(key)}:${canonicalJson(object[key])}').join(',')}}';
  }
  if (value is int) {
    if (value.abs() > maxSafeInteger) throw const FormatException('Unsafe protocol number');
    return value.toString();
  }
  if (value is double) {
    if (!value.isFinite || value.abs() > maxSafeInteger) throw const FormatException('Unsafe protocol number');
    return value == value.truncateToDouble() ? value.toInt().toString() : jsonEncode(value);
  }
  if (value == null || value is String || value is bool) return jsonEncode(value);
  throw const FormatException('JSON payload can hold only JSON values');
}

/// `sha256:` and the hex SHA-256 of the canonical JSON.
String fingerprint(Object? value) => 'sha256:${sha256.convert(utf8.encode(canonicalJson(value)))}';

/// A deep copy of JSON data, so callers can't change what the SDK keeps.
Object? copyJson(Object? value) {
  if (value is Map) {
    return <String, Object?>{for (final entry in parseObject(value).entries) entry.key: copyJson(entry.value)};
  }
  if (value is List) return <Object?>[for (final item in value) copyJson(item)];
  return value;
}
