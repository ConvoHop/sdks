import 'dart:convert';
import 'dart:io';
import 'dart:isolate';

import 'package:convohop_docgen_dart/convohop_docgen_dart.dart';
import 'package:path/path.dart' as p;
import 'package:test/test.dart';

typedef Json = Map<String, Object?>;

/// A temporary repository with pub package `demo` in `demo/`: a pubspec,
/// [files] under `demo/lib` and a language file that documents [libraries].
String repository(Map<String, String> files, {List<String> libraries = const ['demo.dart'], String pubName = 'demo'}) {
  final root = Directory.systemTemp.createTempSync('dart-extractor-').path;
  addTearDown(() => Directory(root).deleteSync(recursive: true));
  File(p.join(root, 'demo', 'pubspec.yaml'))
    ..createSync(recursive: true)
    ..writeAsStringSync('name: $pubName\nenvironment:\n  sdk: ^3.10.0\n');
  for (final MapEntry(key: path, value: content) in files.entries) {
    File(p.join(root, 'demo', 'lib', path))
      ..createSync(recursive: true)
      ..writeAsStringSync(content);
  }
  File(p.join(root, 'language.json')).writeAsStringSync(
    jsonEncode({
      'id': 'flutter',
      'packages': [
        for (final library in libraries) {'name': 'package:demo/$library', 'source': 'demo'},
      ],
    }),
  );
  return root;
}

Json surface(Map<String, String> files, {List<String> libraries = const ['demo.dart']}) {
  final root = repository(files, libraries: libraries);
  return extract(root, p.join(root, 'language.json'));
}

List<Json> symbols(Json surface, [int package = 0]) =>
    ((surface['packages']! as List<Object?>)[package]! as Json)['symbols']! as List<Json>;

Json symbol(Json surface, String name) => symbols(surface).singleWhere((symbol) => symbol['name'] == name);

List<Json> members(Json symbol) => (symbol['members'] as List<Object?>? ?? const []).cast<Json>();

Json member(Json symbol, String name) => members(symbol).singleWhere((member) => member['name'] == name);

/// The symbol [name] of a library whose source is [source].
Json only(String source, String name) => symbol(surface({'demo.dart': source}), name);

Matcher fails(String message) =>
    throwsA(isA<ExtractError>().having((error) => error.message, 'message', contains(message)));

void main() {
  group('libraries', () {
    test('export public declarations through exports, combinators and parts, sorted by code unit', () {
      final result = surface({
        'demo.dart': '''
export 'src/a.dart' show Alpha, beta;
export 'src/c.dart' hide Hidden;
part 'src/part.dart';

class Zed {}
class _Private {}
''',
        'src/a.dart': 'class Alpha {}\nint beta() => 1;\nclass Gamma {}\n',
        'src/c.dart': 'class Hidden {}\nclass Shown {}\n',
        'src/part.dart': "part of '../demo.dart';\n\nclass Parted {}\n",
      });
      expect(result['language'], 'flutter');
      expect((result['packages']! as List<Object?>).single, containsPair('name', 'package:demo/demo.dart'));
      expect(symbols(result).map((symbol) => symbol['name']), ['Alpha', 'Parted', 'Shown', 'Zed', 'beta']);
    });

    test('list each documented library as a package, in language file order', () {
      final result = surface(
        {'demo.dart': "export 'b.dart';\nclass A {}\n", 'b.dart': 'class B {}\n'},
        libraries: ['demo.dart', 'b.dart'],
      );
      final packages = (result['packages']! as List<Object?>).cast<Json>();
      expect(packages.map((package) => package['name']), ['package:demo/demo.dart', 'package:demo/b.dart']);
      expect(symbols(result, 0).map((symbol) => symbol['name']), ['A', 'B']);
      expect(symbols(result, 1).map((symbol) => symbol['name']), ['B']);
      expect(symbols(result, 1).single, isNot(contains('origin')));
    });

    test('fail on what it cannot document faithfully', () {
      expect(() => surface({'demo.dart': "export 'package:other/other.dart';\n"}), fails("isn't part of a documented"));
      expect(
        () => surface({'demo.dart': "export 'a.dart' if (dart.library.io) 'b.dart';\n", 'a.dart': '', 'b.dart': ''}),
        fails("conditional exports aren't supported"),
      );
      expect(
        () => surface({
          'demo.dart': "export 'a.dart';\nexport 'b.dart';\n",
          'a.dart': 'class X {}',
          'b.dart': 'class X {}',
        }),
        fails('exports a second declaration named X'),
      );
      expect(() => surface({'demo.dart': "part of 'other.dart';\n"}), fails('is a part, not a library'));
      expect(() => surface({'demo.dart': 'class {'}), fails("doesn't parse"));
      expect(
        () => surface({'demo.dart': 'extension type Id(int value) {}'}),
        fails("extension types aren't supported"),
      );
      expect(() => surface({'demo.dart': 'class A = Object with M;\nmixin M {}'}), fails('mixin application classes'));
      expect(() => surface({'demo.dart': 'final value = compute();\nint compute() => 1;'}), fails('give value a type'));
    });

    test('fail when the language file names another pub package', () {
      final root = repository({'demo.dart': ''}, pubName: 'other');
      expect(
        () => extract(root, p.join(root, 'language.json')),
        fails('package:demo/demo.dart is not in pub package other'),
      );
    });
  });

  group('kinds', () {
    test('map Dart declarations to surface kinds', () {
      final result = surface({
        'demo.dart': '''
class Plain {}
abstract class Base {}
abstract interface class Contract {}
mixin Mixed {}
enum Color { red }
extension Shouting on String {}
typedef Callback = void Function(int value);
typedef Numbers = List<int>;
typedef void Legacy(int value);
int twice(int value) => value * 2;
const limit = 3;
int get counter => 0;
set counter(int value) {}
''',
      });
      expect(
        {for (final symbol in symbols(result)) symbol['name']: symbol['kind']},
        {
          'Base': 'class',
          'Callback': 'type',
          'Color': 'enum',
          'Contract': 'interface',
          'Legacy': 'type',
          'Mixed': 'interface',
          'Numbers': 'type',
          'Plain': 'class',
          'Shouting': 'namespace',
          'counter': 'constant',
          'limit': 'constant',
          'twice': 'function',
        },
      );
      expect(symbol(result, 'Callback')['signatures'], ['typedef Callback = void Function(int value)']);
      expect(symbol(result, 'Numbers')['signatures'], ['typedef Numbers = List<int>']);
      expect(symbol(result, 'Legacy')['signatures'], ['typedef void Legacy(int value)']);
      expect(symbol(result, 'counter')['signatures'], ['int get counter', 'set counter(int value)']);
      expect(symbol(result, 'limit')['signatures'], ['const int limit']);
      expect(symbol(result, 'Shouting')['signatures'], ['extension Shouting on String']);
      expect(symbol(result, 'Contract')['signatures'], ['abstract interface class Contract']);
    });

    test('list enum cases before other members, without enum constructors', () {
      final color = only('''
enum Color {
  /// The warm one.
  red('r'),
  green('g');

  const Color(this.code);

  /// One letter.
  final String code;

  bool get warm => this == red;
}
''', 'Color');
      expect(members(color).map((member) => [member['name'], member['kind']]), [
        ['red', 'case'],
        ['green', 'case'],
        ['code', 'property'],
        ['warm', 'property'],
      ]);
      expect(member(color, 'red'), containsPair('signatures', ["red('r')"]));
      expect(member(color, 'red'), containsPair('docs', 'The warm one.'));
      expect(member(color, 'code'), containsPair('signatures', ['final String code']));
    });
  });

  group('members', () {
    test('merge constructors into one member named after the class, with labelled docs', () {
      final point = only('''
class Point {
  /// From coordinates.
  const Point(this.x, {this.y = 0});

  /// The origin.
  const Point.origin() : x = 0, y = 0;

  factory Point.parse(String text) => Point(int.parse(text));

  Point._();

  final int x;
  var y = 0;
}
''', 'Point');
      final constructor = member(point, 'Point');
      expect(constructor['kind'], 'constructor');
      expect(constructor['signatures'], [
        'const Point(int x, {int y = 0})',
        'const Point.origin()',
        'factory Point.parse(String text)',
      ]);
      expect(constructor['docs'], '**`Point`**\n\nFrom coordinates.\n\n**`Point.origin`**\n\nThe origin.');
      expect(members(point).map((member) => member['name']), ['Point', 'x', 'y']);
    });

    test('use one constructor docs as they are', () {
      final thing = only('class Thing {\n  /// Makes one.\n  Thing();\n}\n', 'Thing');
      expect(member(thing, 'Thing'), containsPair('docs', 'Makes one.'));
    });

    test('add the implicit constructor only where code outside the library can call it', () {
      final result = surface({
        'demo.dart': '''
class Open {}
abstract class Extendable {}
sealed class Closed { factory Closed.make() = _Made; }
abstract final class Namespace {}
abstract interface class Contract {}
class Hidden { Hidden._(); }
class _Made implements Closed {}
''',
      });
      String? constructor(String name) => members(
        symbol(result, name),
      ).where((member) => member['kind'] == 'constructor').firstOrNull?['signatures'].toString();
      expect(constructor('Open'), '[Open()]');
      expect(constructor('Extendable'), '[Extendable()]');
      expect(constructor('Closed'), '[factory Closed.make()]');
      expect(constructor('Namespace'), isNull);
      expect(constructor('Contract'), isNull);
      expect(constructor('Hidden'), isNull);
    });

    test('show initializing formals and super parameters with the types callers pass', () {
      final sub = only('''
class Base {
  Base(this.a, {this.b});
  Base.other(this.a, {this.b});
  final int a;
  final String? b;
}

class Sub extends Base {
  Sub(super.a, {super.b, this.c = 2});
  Sub.other(super.a, {required super.b, required void this.callback(int value)}) : c = 0, super.other();
  int c;
  void Function(int value)? callback;
}
''', 'Sub');
      expect(member(sub, 'Sub')['signatures'], [
        'Sub(int a, {String? b, int c = 2})',
        'Sub.other(int a, {required String? b, required void callback(int value)})',
      ]);
    });

    test('fail on super parameters forwarded to another package', () {
      expect(
        () => only('class Failure extends StateError { Failure(super.message); }', 'Failure'),
        fails("can't find the type of super.message in another package"),
      );
    });

    test('name operators and merge getters with setters', () {
      final value = only('''
class Value {
  bool operator ==(Object other) => false;
  int get size => 0;
  set size(int value) {}
  static int count = 0;
  void _hidden() {}
}
''', 'Value');
      expect(members(value).map((member) => [member['name'], member['kind'], member['static']]), [
        ['Value', 'constructor', null],
        ['operator ==', 'method', null],
        ['size', 'property', null],
        ['count', 'property', true],
      ]);
      expect(member(value, 'size')['signatures'], ['int get size', 'set size(int value)']);
      expect(member(value, 'count')['signatures'], ['static int count']);
    });

    test('list inherited members after own ones, nearest base first, until another package', () {
      final result = surface({
        'demo.dart': '''
import 'dart:collection';

class A {
  void a() {}
  int get x => 1;
  static void helper() {}
}
mixin M {
  void m() {}
}
class B extends A with M {
  void b() {}
  @override
  int get x => 2;
}
class C extends B {
  void c() {}
}
class Listing extends ListBase<int> {
  void own() {}
}
''',
      });
      expect(members(symbol(result, 'C')).map((member) => [member['name'], member['inherited']]), [
        ['C', null],
        ['c', null],
        ['b', 'B'],
        ['x', 'B'],
        ['m', 'M'],
        ['a', 'A'],
      ]);
      expect(members(symbol(result, 'Listing')).map((member) => member['name']), ['Listing', 'own']);
    });

    test('give undocumented overrides the docs of the member they override', () {
      final result = surface({
        'demo.dart': '''
abstract interface class Shape {
  /// The area in square units.
  double get area;

  /// Draws it.
  void draw();
}

class Square implements Shape {
  @override
  double get area => 1;

  /// Draws a square.
  @override
  void draw() {}

  @override
  String toString() => 'Square';
}

class Tile extends Square {
  @override
  double get area => 2;
}
''',
      });
      expect(member(symbol(result, 'Square'), 'area')['docs'], 'The area in square units.');
      expect(member(symbol(result, 'Square'), 'draw')['docs'], 'Draws a square.');
      expect(member(symbol(result, 'Square'), 'toString')['docs'], '');
      expect(member(symbol(result, 'Tile'), 'area')['docs'], 'The area in square units.');
    });

    test('fail when a class implements itself', () {
      expect(
        () => surface({'demo.dart': 'class A implements B { void f() {} }\nclass B implements A { void f() {} }\n'}),
        fails('inherits from itself'),
      );
    });
  });

  group('signatures', () {
    test('drop bodies, initializers and trailing commas, and join lines', () {
      final result = surface({
        'demo.dart': '''
Future<Map<String, int>> load(
  String name, [
  int retries = 3,
]) async => {};

const List<int> sizes = [1, 2];
''',
      });
      expect(symbol(result, 'load')['signatures'], ['Future<Map<String, int>> load(String name, [int retries = 3])']);
      expect(symbol(result, 'sizes')['signatures'], ['const List<int> sizes']);
    });

    test("wrap in dart format's tall style past 80 columns", () {
      final result = surface({
        'demo.dart': '''
void connect(String url, String token, {Duration timeout = const Duration(seconds: 10), bool relay = false}) {}
void configure({required String endpoint, required String projectIdentifier, int attempts = 1}) {}
''',
      });
      expect(symbol(result, 'connect')['signatures'], [
        'void connect(\n'
            '  String url,\n'
            '  String token, {\n'
            '  Duration timeout = const Duration(seconds: 10),\n'
            '  bool relay = false,\n'
            '})',
      ]);
      expect(symbol(result, 'configure')['signatures'], [
        'void configure({\n'
            '  required String endpoint,\n'
            '  required String projectIdentifier,\n'
            '  int attempts = 1,\n'
            '})',
      ]);
    });

    test("infer only the types of literals and of the package's constructor calls", () {
      final result = surface({
        'demo.dart': '''
import 'src/spec.dart' as spec;

const text = 'a' 'b';
const count = -1;
const ratio = 1.5;
final enabled = true;
const plain = Spec();
const named = Spec.strict();
final boxed = Box<int>();
final prefixed = spec.Remote();
final prefixedNamed = spec.Remote.named();

class Spec {
  const Spec();
  const Spec.strict();
  static Spec build() => const Spec();
}

class Box<T> {}
''',
        'src/spec.dart': 'class Remote {\n  Remote();\n  Remote.named();\n}\n',
      });
      expect(
        {for (final symbol in symbols(result)) symbol['name']: (symbol['signatures']! as List<Object?>).single},
        {
          'Box': 'class Box<T>',
          'Spec': 'class Spec',
          'boxed': 'final Box<int> boxed',
          'count': 'const int count',
          'enabled': 'final bool enabled',
          'named': 'const Spec named',
          'plain': 'const Spec plain',
          'prefixed': 'final spec.Remote prefixed',
          'prefixedNamed': 'final spec.Remote prefixedNamed',
          'ratio': 'const double ratio',
          'text': 'const String text',
        },
      );
      expect(
        () =>
            surface({'demo.dart': 'class Spec {\n  static Spec build() => Spec();\n}\nfinal built = Spec.build();\n'}),
        fails('give built a type'),
      );
      expect(() => surface({'demo.dart': 'class Box<T> {}\nfinal box = Box();\n'}), fails('give box a type'));
      expect(() => surface({'demo.dart': 'final sizes = [1];\n'}), fails('give sizes a type'));
    });
  });

  group('docs', () {
    test('turn references into code spans and label code fences', () {
      final docs = only('''
/// See [Thing], [Thing.make] and [the guide](https://example.com/guide).
/// Leaves `[code]` and [two words] alone.
///
/// ```
/// final thing = Thing(); // [Thing]
/// ```
///
/// ```yaml
/// key: [Thing]
/// ```
class Thing {}
''', 'Thing')['docs'];
      expect(
        docs,
        'See `Thing`, `Thing.make` and [the guide](https://example.com/guide).\n'
        'Leaves `[code]` and [two words] alone.\n'
        '\n'
        '```dart\n'
        'final thing = Thing(); // [Thing]\n'
        '```\n'
        '\n'
        '```yaml\n'
        'key: [Thing]\n'
        '```',
      );
    });

    test('fail on documentation the reference cannot show', () {
      expect(() => only('/** Block. */\nclass A {}', 'A'), fails('use /// documentation comments'));
      expect(
        () => only('/// {@template a}\n/// Text.\n/// {@endtemplate}\nclass A {}', 'A'),
        fails('dartdoc directives'),
      );
      expect(() => only('/// @nodoc\nclass A {}', 'A'), fails("@nodoc isn't supported"));
    });

    test('report deprecations', () {
      final result = surface({
        'demo.dart': '''
@deprecated
void old() {}

@Deprecated(' Use [fresh] instead. ')
void stale() {}

void fresh() {}

class Both {
  @Deprecated('Use Both.new.')
  Both.legacy();
  @Deprecated('Gone.')
  Both();
}
''',
      });
      expect(symbol(result, 'old')['deprecated'], '');
      expect(symbol(result, 'stale')['deprecated'], 'Use [fresh] instead.');
      expect(symbol(result, 'fresh'), isNot(contains('deprecated')));
      expect(member(symbol(result, 'Both'), 'Both')['deprecated'], 'Use Both.new.\n\nGone.');
      expect(
        () => only("class Some {\n  @Deprecated('No.')\n  Some.legacy();\n  Some();\n}\n", 'Some'),
        fails("deprecate all of Some's constructors or none of them"),
      );
      expect(
        () => only('@Deprecated.extend()\nclass Base {}', 'Base'),
        fails('only @deprecated and @Deprecated(message)'),
      );
      expect(only("import 'dart:core' as core;\n@core.Deprecated('Old.')\nvoid f() {}", 'f')['deprecated'], 'Old.');
    });
  });

  test('sketch generated data shapes in one signature', () {
    final result = surface({
      'demo.dart': "export 'src/generated/models.dart';\n",
      'src/generated/models.dart': '''
/// A message.
final class Message {
  const Message({required this.id, this.text});
  factory Message.fromJson(Object? json) => throw UnimplementedError();
  final String id;
  final String? text;
  Map<String, Object?> toJson() => {};
}

enum Kind {
  plain('plain'),
  system('system');

  const Kind(this.wire);
  final String wire;
}

abstract final class Limits {
  static const maximum = 10;
}

final class Empty {
  const Empty._();
}
''',
    });
    expect(symbol(result, 'Message'), {
      'name': 'Message',
      'kind': 'class',
      'signatures': [
        'final class Message {\n'
            '  const Message({required String id, String? text});\n'
            '  factory Message.fromJson(Object? json);\n'
            '  final String id;\n'
            '  final String? text;\n'
            '  Map<String, Object?> toJson();\n'
            '}',
      ],
      'docs': 'A message.',
    });
    expect(symbol(result, 'Kind')['signatures'], [
      "enum Kind {\n  plain('plain'),\n  system('system');\n  final String wire;\n}",
    ]);
    expect(symbol(result, 'Limits')['signatures'], ['abstract final class Limits {\n  static const int maximum;\n}']);
    expect(symbol(result, 'Empty')['signatures'], ['final class Empty {}']);
  });

  group('command', () {
    final library = Isolate.resolvePackageUriSync(Uri.parse('package:convohop_docgen_dart/convohop_docgen_dart.dart'))!;
    final script = p.join(p.dirname(p.dirname(library.toFilePath())), 'bin', 'extract.dart');

    test('print the surface as JSON', () async {
      final root = repository({'demo.dart': 'class A {}\n'});
      final result = await Process.run(Platform.resolvedExecutable, [script, root, p.join(root, 'language.json')]);
      expect(result.exitCode, 0, reason: '${result.stderr}');
      expect(jsonDecode(result.stdout as String), containsPair('language', 'flutter'));
    });

    test('report failures on stderr', () async {
      final root = repository({'demo.dart': '/** Block. */\nclass A {}\n'});
      final result = await Process.run(Platform.resolvedExecutable, [script, root, p.join(root, 'language.json')]);
      expect(result.exitCode, 1);
      expect(result.stdout, isEmpty);
      expect(result.stderr, startsWith('dart extractor: demo/lib/demo.dart:2: A: use /// documentation comments'));
    });

    test('print usage for other arguments', () async {
      final result = await Process.run(Platform.resolvedExecutable, [script]);
      expect(result.exitCode, 2);
      expect(result.stderr, contains('usage'));
    });
  });
}
