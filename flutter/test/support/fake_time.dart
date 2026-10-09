import 'dart:math';

import 'package:fake_async/fake_async.dart';

/// Randomness without jitter, so backoff lands on its lower bound.
final class NoJitter implements Random {
  @override
  int nextInt(int max) => 0;

  @override
  double nextDouble() => 0;

  @override
  bool nextBool() => false;
}

/// [future]'s value once [async]'s pending microtasks ran. Throws its error,
/// or a [StateError] while it is still pending.
T settled<T>(FakeAsync async, Future<T> future) {
  T? value;
  Object? failure;
  var done = false;
  future.then(
    (result) {
      value = result;
      done = true;
    },
    onError: (Object error) {
      failure = error;
    },
  );
  async.flushMicrotasks();
  if (failure case final error?) throw error;
  if (!done) throw StateError('The future is still pending');
  return value as T;
}

/// The error [future] failed with once [async]'s pending microtasks ran, or
/// null.
Object? failureOf(FakeAsync async, Future<Object?> future) {
  Object? failure;
  future.then<void>((_) {}, onError: (Object error) => failure = error);
  async.flushMicrotasks();
  return failure;
}
