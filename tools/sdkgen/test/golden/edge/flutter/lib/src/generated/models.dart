// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
// dart format off
// ignore_for_file: type=lint, deprecated_member_use_from_same_package
part of 'generated.dart';

/// Kinds of fruit.
/// The values are deliberately unsorted.
enum Fruit {
  /// Curved and yellow.
  banana('BANANA'),
  apple('APPLE'),
  cherry('cherry'),
  apple10('apple10'),
  apple9('apple9'),
  @Deprecated('No longer supported')
  date('DATE'),
  /// Elderberries.
  @Deprecated('Use APPLE.')
  elder('ELDER');

  const Fruit(this.wire);

  /// Decodes a GraphQL `Fruit` value. Unknown values throw a [FormatException].
  factory Fruit.fromJson(Object? json) => _decodeFruit(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

Fruit _decodeFruit(Object? value, String path) {
  final text = _string(value, path);
  for (final member in Fruit.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known Fruit value');
}

enum HttpMethod {
  post('POST'),
  get('GET');

  const HttpMethod(this.wire);

  /// Decodes a GraphQL `HTTPMethod` value. Unknown values throw a [FormatException].
  factory HttpMethod.fromJson(Object? json) => _decodeHttpMethod(json, r'$');

  /// The GraphQL value.
  final String wire;

  /// The GraphQL value.
  String toJson() => wire;
}

HttpMethod _decodeHttpMethod(Object? value, String path) {
  final text = _string(value, path);
  for (final member in HttpMethod.values) {
    if (member.wire == text) return member;
  }
  _invalid(path, 'is not a known HTTPMethod value');
}

final class Capabilities {
  const Capabilities({
    required this.version,
    this.wssUrl,
    required this.features,
  });

  /// Decodes and validates a GraphQL `Capabilities`. Malformed values throw a [FormatException].
  factory Capabilities.fromJson(Object? json) => _decodeCapabilities(json, r'$');

  final String version;

  final String? wssUrl;

  final List<String> features;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'version': version,
        'wssUrl': wssUrl,
        'features': features,
      };
}

Capabilities _decodeCapabilities(Object? value, String path) {
  final map = _object(value, path);
  return Capabilities(
    version: _scalarString(_get(map, path, 'version'), '$path.version'),
    wssUrl: _n(_get(map, path, 'wssUrl'), '$path.wssUrl', _scalarString),
    features: _list(_get(map, path, 'features'), '$path.features', _scalarString),
  );
}

final class Event {
  const Event({
    required this.sequence,
    required this.type,
    required this.subjectRef,
    required this.payload,
  });

  /// Decodes and validates a GraphQL `Event`. Malformed values throw a [FormatException].
  factory Event.fromJson(Object? json) => _decodeEvent(json, r'$');

  final String sequence;

  final String type;

  final SubjectRef subjectRef;

  final EventPayload payload;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'sequence': sequence,
        'type': type,
        'subjectRef': subjectRef.toJson(),
        'payload': payload.toJson(),
      };
}

Event _decodeEvent(Object? value, String path) {
  final map = _object(value, path);
  return Event(
    sequence: _scalarCounter(_get(map, path, 'sequence'), '$path.sequence'),
    type: _scalarString(_get(map, path, 'type'), '$path.type'),
    subjectRef: _decodeSubjectRef(_get(map, path, 'subjectRef'), '$path.subjectRef'),
    payload: _decodeEventPayload(_get(map, path, 'payload'), '$path.payload'),
  );
}

final class EventPage {
  const EventPage({
    required this.items,
    required this.complete,
    required this.refreshRequired,
    this.nextCursor,
  });

  /// Decodes and validates a GraphQL `EventPage`. Malformed values throw a [FormatException].
  factory EventPage.fromJson(Object? json) => _decodeEventPage(json, r'$');

  final List<Event> items;

  final bool complete;

  final bool refreshRequired;

  final String? nextCursor;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'complete': complete,
        'refreshRequired': refreshRequired,
        'nextCursor': nextCursor,
      };
}

EventPage _decodeEventPage(Object? value, String path) {
  final map = _object(value, path);
  return EventPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeEvent),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
  );
}

final class EventPayload {
  const EventPayload({
    this.itemId,
    this.jobId,
    this.revision,
    this.note,
  });

  /// Decodes and validates a GraphQL `EventPayload`. Malformed values throw a [FormatException].
  factory EventPayload.fromJson(Object? json) => _decodeEventPayload(json, r'$');

  final String? itemId;

  final String? jobId;

  final String? revision;

  final String? note;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'itemId': itemId,
        'jobId': jobId,
        'revision': revision,
        'note': note,
      };
}

EventPayload _decodeEventPayload(Object? value, String path) {
  final map = _object(value, path);
  return EventPayload(
    itemId: _n(_get(map, path, 'itemId'), '$path.itemId', _scalarId),
    jobId: _n(_get(map, path, 'jobId'), '$path.jobId', _scalarId),
    revision: _n(_get(map, path, 'revision'), '$path.revision', _scalarCounter),
    note: _n(_get(map, path, 'note'), '$path.note', _scalarString),
  );
}

final class Item {
  const Item({
    required this.id,
    required this.name,
    this.fruit,
    this.weight,
    required this.ripe,
    this.oldName,
    this.legacyCode,
    required this.grid,
    this.aliases,
    this.history,
  });

  /// Decodes and validates a GraphQL `Item`. Malformed values throw a [FormatException].
  factory Item.fromJson(Object? json) => _decodeItem(json, r'$');

  final String id;

  final String name;

  final Fruit? fruit;

  final double? weight;

  final bool ripe;

  @Deprecated('No longer supported')
  final String? oldName;

  /// Legacy numeric code.
  @Deprecated('Use id.')
  final int? legacyCode;

  /// Nested and nullable lists.
  final List<List<int>?> grid;

  final List<String?>? aliases;

  final List<List<Fruit?>>? history;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'id': id,
        'name': name,
        'fruit': fruit?.wire,
        'weight': weight,
        'ripe': ripe,
        'oldName': oldName,
        'legacyCode': legacyCode,
        'grid': grid,
        'aliases': aliases,
        'history': history?.map((e0) => e0.map((e1) => e1?.wire).toList()).toList(),
      };
}

Item _decodeItem(Object? value, String path) {
  final map = _object(value, path);
  return Item(
    id: _scalarId(_get(map, path, 'id'), '$path.id'),
    name: _scalarString(_get(map, path, 'name'), '$path.name'),
    fruit: _n(_get(map, path, 'fruit'), '$path.fruit', _decodeFruit),
    weight: _n(_get(map, path, 'weight'), '$path.weight', _scalarFloat),
    ripe: _scalarBoolean(_get(map, path, 'ripe'), '$path.ripe'),
    oldName: _n(_get(map, path, 'oldName'), '$path.oldName', _scalarString),
    legacyCode: _n(_get(map, path, 'legacyCode'), '$path.legacyCode', _scalarInt),
    grid: _list(_get(map, path, 'grid'), '$path.grid', (v0, p0) => _n(v0, p0, (v1, p1) => _list(v1, p1, _scalarInt))),
    aliases: _n(_get(map, path, 'aliases'), '$path.aliases', (v0, p0) => _list(v0, p0, (v1, p1) => _n(v1, p1, _scalarString))),
    history: _n(_get(map, path, 'history'), '$path.history', (v0, p0) => _list(v0, p0, (v1, p1) => _list(v1, p1, (v2, p2) => _n(v2, p2, _decodeFruit)))),
  );
}

final class ItemPage {
  const ItemPage({
    required this.items,
    required this.complete,
    required this.refreshRequired,
    this.nextCursor,
  });

  /// Decodes and validates a GraphQL `ItemPage`. Malformed values throw a [FormatException].
  factory ItemPage.fromJson(Object? json) => _decodeItemPage(json, r'$');

  final List<Item> items;

  final bool complete;

  final bool refreshRequired;

  final String? nextCursor;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'items': items.map((e0) => e0.toJson()).toList(),
        'complete': complete,
        'refreshRequired': refreshRequired,
        'nextCursor': nextCursor,
      };
}

ItemPage _decodeItemPage(Object? value, String path) {
  final map = _object(value, path);
  return ItemPage(
    items: _list(_get(map, path, 'items'), '$path.items', _decodeItem),
    complete: _scalarBoolean(_get(map, path, 'complete'), '$path.complete'),
    refreshRequired: _scalarBoolean(_get(map, path, 'refreshRequired'), '$path.refreshRequired'),
    nextCursor: _n(_get(map, path, 'nextCursor'), '$path.nextCursor', _scalarString),
  );
}

final class Receipt {
  const Receipt({
    required this.requestId,
    required this.committed,
    this.sequence,
  });

  /// Decodes and validates a GraphQL `Receipt`. Malformed values throw a [FormatException].
  factory Receipt.fromJson(Object? json) => _decodeReceipt(json, r'$');

  final String requestId;

  final bool committed;

  final String? sequence;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'requestId': requestId,
        'committed': committed,
        'sequence': sequence,
      };
}

Receipt _decodeReceipt(Object? value, String path) {
  final map = _object(value, path);
  return Receipt(
    requestId: _scalarId(_get(map, path, 'requestId'), '$path.requestId'),
    committed: _scalarBoolean(_get(map, path, 'committed'), '$path.committed'),
    sequence: _n(_get(map, path, 'sequence'), '$path.sequence', _scalarCounter),
  );
}

final class SubjectRef {
  const SubjectRef({
    required this.kind,
    required this.id,
  });

  /// Decodes and validates a GraphQL `SubjectRef`. Malformed values throw a [FormatException].
  factory SubjectRef.fromJson(Object? json) => _decodeSubjectRef(json, r'$');

  final String kind;

  final String id;

  /// The GraphQL JSON form, with every field.
  Map<String, Object?> toJson() => <String, Object?>{
        'kind': kind,
        'id': id,
      };
}

SubjectRef _decodeSubjectRef(Object? value, String path) {
  final map = _object(value, path);
  return SubjectRef(
    kind: _scalarString(_get(map, path, 'kind'), '$path.kind'),
    id: _scalarId(_get(map, path, 'id'), '$path.id'),
  );
}

final class Box3dInput {
  const Box3dInput({
    required this.width,
    required this.height,
    required this.depth,
  });

  final double width;

  final double height;

  final double depth;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'width': width,
        'height': height,
        'depth': depth,
      };
}

final class EventsInput {
  const EventsInput({
    this.after,
    required this.limit,
  });

  final String? after;

  final int limit;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        if (after case final value?) 'after': value,
        'limit': limit,
      };
}

final class FetchInput {
  const FetchInput({
    this.method,
  });

  /// The server uses `"GET"` when it's null.
  final HttpMethod? method;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        if (method case final value?) 'method': value.wire,
      };
}

/// Filters for alpha.items.
/// A closing comment marker */ must not end a generated comment.
final class ItemsInput {
  const ItemsInput({
    this.limit,
    this.cursor,
    this.fruits,
    this.minWeight,
    this.includeDeprecated,
    this.method,
    this.box,
    this.legacyFilter,
    this.item2,
    this.item10,
  });

  /// Page size.
  /// Defaults to 20.
  ///
  /// The server uses `20` when it's null.
  final int? limit;

  final String? cursor;

  final List<Fruit>? fruits;

  final double? minWeight;

  /// The server uses `false` when it's null.
  final bool? includeDeprecated;

  /// The server uses `"GET"` when it's null.
  final HttpMethod? method;

  final Box3dInput? box;

  @Deprecated('Use fruits.')
  final String? legacyFilter;

  final int? item2;

  final int? item10;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        if (limit case final value?) 'limit': value,
        if (cursor case final value?) 'cursor': value,
        if (fruits case final value?) 'fruits': value.map((e0) => e0.wire).toList(),
        if (minWeight case final value?) 'minWeight': value,
        if (includeDeprecated case final value?) 'includeDeprecated': value,
        if (method case final value?) 'method': value.wire,
        if (box case final value?) 'box': value.toJson(),
        if (legacyFilter case final value?) 'legacyFilter': value,
        if (item2 case final value?) 'item2': value,
        if (item10 case final value?) 'item10': value,
      };
}

final class PingInput {
  const PingInput({
    this.note,
  });

  final String? note;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        if (note case final value?) 'note': value,
      };
}

final class ResolveInput {
  const ResolveInput({
    required this.requestId,
  });

  final String requestId;

  /// The GraphQL JSON form. Null fields are omitted, so the server applies their defaults.
  Map<String, Object?> toJson() => <String, Object?>{
        'requestId': requestId,
      };
}
