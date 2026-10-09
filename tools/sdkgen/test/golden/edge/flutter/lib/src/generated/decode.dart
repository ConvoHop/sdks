// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
// dart format off
// ignore_for_file: type=lint, deprecated_member_use_from_same_package
part of 'generated.dart';

/// Generated lists hold at most this many items, like the TypeScript validator.
const int _maxListLength = 100;

const int _maxSafeInteger = 9007199254740991;

Never _invalid(String path, String problem) =>
    throw FormatException('Malformed GraphQL response: $path $problem');

Map<String, Object?> _object(Object? value, String path) {
  if (value is Map<String, Object?>) return value;
  if (value is! Map<Object?, Object?>) _invalid(path, 'is not an object');
  final copy = <String, Object?>{};
  for (final MapEntry(:key, value: item) in value.entries) {
    if (key is! String) _invalid(path, 'has a key that is not a string');
    copy[key] = item;
  }
  return copy;
}

Object? _get(Map<String, Object?> map, String path, String key) {
  if (!map.containsKey(key)) _invalid('$path.$key', 'is missing');
  return map[key];
}

T? _n<T extends Object>(Object? value, String path, T Function(Object?, String) decode) =>
    value == null ? null : decode(value, path);

List<T> _list<T>(Object? value, String path, T Function(Object?, String) decode) {
  if (value is! List<Object?>) _invalid(path, 'is not a list');
  if (value.length > _maxListLength) _invalid(path, 'has more than $_maxListLength items');
  return List<T>.unmodifiable(<T>[for (var i = 0; i < value.length; i++) decode(value[i], '$path[$i]')]);
}

String _string(Object? value, String path) => value is String ? value : _invalid(path, 'is not a string');

bool _bool(Object? value, String path) => value is bool ? value : _invalid(path, 'is not a boolean');

int _int(Object? value, String path) {
  if (value is int && value >= -_maxSafeInteger && value <= _maxSafeInteger) return value;
  if (value is double && value.isFinite && value == value.roundToDouble() && value.abs() <= _maxSafeInteger) {
    return value.toInt();
  }
  _invalid(path, 'is not a safe integer');
}

double _double(Object? value, String path) {
  if (value is num && value.isFinite) return value.toDouble();
  _invalid(path, 'is not a finite number');
}

final _digits = RegExp(r'^[0-9]+$');

bool _decimalAtMost(String value, BigInt maximum) => _digits.hasMatch(value) && BigInt.parse(value) <= maximum;

bool _scalarBoolean(Object? json, String path) => _bool(json, path);

final _patternCounter = RegExp(r'^(0|[1-9][0-9]*)$');
final _maximumCounter = BigInt.parse('9223372036854775807');
String _scalarCounter(Object? json, String path) {
  final value = _string(json, path);
  if (!_patternCounter.hasMatch(value)) _invalid(path, 'is not a valid Counter');
  if (!_decimalAtMost(value, _maximumCounter)) _invalid(path, 'exceeds 9223372036854775807');
  return value;
}

double _scalarFloat(Object? json, String path) => _double(json, path);

String _scalarId(Object? json, String path) => _string(json, path);

int _scalarInt(Object? json, String path) => _int(json, path);

String _scalarString(Object? json, String path) => _string(json, path);
