import 'dart:async';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

/// No authority response was observed, or it was cut off.
final class TransportFailure implements Exception {
  const TransportFailure({required this.responded});

  /// True when the response started but its body didn't arrive in full.
  final bool responded;
}

final class BoundedResponse {
  const BoundedResponse(this.status, this.headers, this.body, {required this.tooLarge});

  final int status;
  final Map<String, String> headers;
  final Uint8List body;

  /// The body exceeded the byte bound and was not read in full.
  final bool tooLarge;
}

const _redirects = {301, 302, 303, 307, 308};

/// POSTs [body] without following redirects and reads at most [maxBytes] of
/// the response. Sending and reading share one [timeout].
Future<BoundedResponse> boundedPost(
  http.Client client,
  Uri url,
  Map<String, String> headers,
  List<int> body, {
  required Duration timeout,
  required int maxBytes,
}) async {
  final request = http.Request('POST', url)
    ..followRedirects = false
    ..headers.addAll(headers)
    ..bodyBytes = body;
  final elapsed = Stopwatch()..start();
  final http.StreamedResponse response;
  try {
    response = await client.send(request).timeout(timeout);
  } on Object {
    throw const TransportFailure(responded: false);
  }
  // An injected client might follow redirects anyway. Another URL's answer isn't the authority's.
  final redirected = switch (response) {
    http.BaseResponseWithUrl(url: final answered) => answered.toString().isNotEmpty && answered != url,
    _ => false,
  };
  if (redirected || _redirects.contains(response.statusCode)) {
    unawaited(response.stream.listen(null, cancelOnError: true).cancel().catchError((_) {}));
    throw const TransportFailure(responded: false);
  }
  final bytes = BytesBuilder(copy: false);
  var tooLarge = false;
  final done = Completer<void>();
  late final StreamSubscription<List<int>> subscription;
  subscription = response.stream.listen(
    (chunk) {
      if (tooLarge) return;
      if (bytes.length + chunk.length > maxBytes) {
        tooLarge = true;
        unawaited(subscription.cancel().catchError((_) {}));
        if (!done.isCompleted) done.complete();
        return;
      }
      bytes.add(chunk);
    },
    onError: (Object error, StackTrace stack) {
      if (!done.isCompleted) done.completeError(error, stack);
    },
    onDone: () {
      if (!done.isCompleted) done.complete();
    },
    cancelOnError: true,
  );
  final remaining = timeout - elapsed.elapsed;
  try {
    await done.future.timeout(remaining.isNegative ? Duration.zero : remaining);
  } on Object {
    unawaited(subscription.cancel().catchError((_) {}));
    throw const TransportFailure(responded: true);
  }
  return BoundedResponse(response.statusCode, response.headers, bytes.takeBytes(), tooLarge: tooLarge);
}
