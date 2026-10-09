/// Strict decoding of driver-protocol parameters. Failures are protocol
/// errors (`INVALID_PARAMS`), never SDK results.
library;

typedef Args = Map<String, Object?>;

final class ParamsError implements Exception {
  const ParamsError(this.message);

  final String message;

  @override
  String toString() => 'ParamsError: $message';
}

// JSON numbers are doubles in some encoders; accept those that are exact safe integers, as the protocol does.
const _maxSafeInteger = 9007199254740991;

int? _integral(Object? value) {
  if (value is int) return value.abs() <= _maxSafeInteger ? value : null;
  if (value is double && value.isFinite && value == value.truncateToDouble() && value.abs() <= _maxSafeInteger) {
    return value.toInt();
  }
  return null;
}

Args record(Object? value, String name) {
  if (value is! Map<String, Object?>) throw ParamsError('$name must be an object');
  return value;
}

String text(Args args, String name) {
  final value = args[name];
  if (value is! String) throw ParamsError('$name must be a string');
  return value;
}

/// Null only when [name] is absent; an explicit null is not a string.
String? optionalText(Args args, String name) => args.containsKey(name) ? text(args, name) : null;

int? integer(Args args, String name, int min, int max) {
  if (!args.containsKey(name)) return null;
  final value = _integral(args[name]);
  if (value == null || value < min || value > max) throw ParamsError('$name must be an integer in $min..$max');
  return value;
}

final _counter = RegExp(r'^(0|[1-9][0-9]{0,18})$');

BigInt? counter(Args args, String name) {
  final value = optionalText(args, name);
  if (value == null) return null;
  if (!_counter.hasMatch(value)) throw ParamsError('$name must be a canonical counter string');
  return BigInt.parse(value);
}

final _handle = RegExp(r'^[A-Za-z0-9._:-]{1,64}$');

String handle(Args args, String name) {
  final value = text(args, name);
  if (!_handle.hasMatch(value)) throw ParamsError('$name must match [A-Za-z0-9._:-]{1,64}');
  return value;
}

/// A positive safe integer request ID, or null.
int? requestId(Object? value) {
  final id = _integral(value);
  return id != null && id >= 1 ? id : null;
}
