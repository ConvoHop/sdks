// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
// dart format off
// ignore_for_file: type=lint, deprecated_member_use_from_same_package
part of 'generated.dart';

/// The `alpha` operations a user session can run.
abstract class AlphaOperations {
  const AlphaOperations();

  /// Runs [operation] with its JSON [input] and returns the decoded result.
  /// Mutations retry with [requestId], or a new one when it's null.
  Future<T> execute<T>(OperationSpec<T> operation, Map<String, Object?> input, {String? requestId});

  /// Read the server capabilities.
  ///
  /// Server capabilities.
  Future<Capabilities> capabilities({String? requestId}) =>
      execute(Operations.alphaCapabilities, const <String, Object?>{}, requestId: requestId);

  /// Look up the outcome of an earlier alpha mutation by requestId.
  Future<Receipt> resolveRequest(ResolveInput input, {String? requestId}) =>
      execute(Operations.alphaResolveRequest, input.toJson(), requestId: requestId);

  /// List items in server order.
  ///
  /// List items.
  ///
  /// Pages follow the cursor style.
  Future<ItemPage> items(ItemsInput input, {String? requestId}) =>
      execute(Operations.alphaItems, input.toJson(), requestId: requestId);

  /// Replay alpha events after a cursor.
  Future<EventPage> events(EventsInput input, {String? requestId}) =>
      execute(Operations.alphaEvents, input.toJson(), requestId: requestId);

  /// Fetch a <status> for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, & a back\slash for _escaping_ in snake_case.
  @Deprecated('Use capabilities.')
  Future<int?> fetchHttpStatus({FetchInput? input, String? requestId}) =>
      execute(Operations.alphaFetchHttpStatus, input?.toJson() ?? const <String, Object?>{}, requestId: requestId);

  /// 1. Send an ephemeral ping.
  Future<bool> ping({PingInput? input, String? requestId}) =>
      execute(Operations.alphaPing, input?.toJson() ?? const <String, Object?>{}, requestId: requestId);
}
