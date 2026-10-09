import 'dart:io';

import 'package:analyzer/dart/analysis/features.dart';
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:path/path.dart' as p;

/// A file or declaration the extractor can't document faithfully. The message
/// names the file and line.
final class ExtractError implements Exception {
  ExtractError(this.message);

  final String message;

  @override
  String toString() => message;
}

/// One parsed file: a library's defining file or one of its parts.
final class Unit {
  Unit(this.library, this.path, this.ast);

  final Library library;
  final String path;
  final CompilationUnit ast;

  /// `<file>:<line>` of [offset], with the file relative to the repository root.
  String where(int offset) => '${library.program.relative(path)}:${ast.lineInfo.getLocation(offset).lineNumber}';
}

/// A top-level declaration. A variable declaration that declares several
/// variables is one [TopLevel] per variable.
final class TopLevel {
  TopLevel(this.name, this.node, this.unit, {this.variable});

  final String name;
  final CompilationUnitMember node;
  final Unit unit;
  final VariableDeclaration? variable;

  Library get library => unit.library;

  /// `<file>:<line>: <name>`, for failures.
  String get where => '${unit.where(node.firstTokenAfterCommentAndMetadata.offset)}: $name';
}

/// A top-level name: one declaration, or a getter and its setter.
final class Entity {
  Entity(this.name);

  final String name;
  final List<TopLevel> declarations = [];
}

/// A library and its parts.
final class Library {
  Library._(this.program, this.path);

  final Program program;
  final String path;
  final List<Unit> units = [];

  /// Every top-level name the library declares, private ones included.
  final Map<String, Entity> declared = {};

  Map<String, Entity>? _exports;
  bool _exporting = false;
  Map<String, Entity>? _imported;
  final Map<String, Map<String, Entity>> _prefixes = {};

  /// The public names the library exports: its own and those of the libraries
  /// it exports, filtered by `show` and `hide`.
  Map<String, Entity> get exports {
    if (_exports case final exports?) return exports;
    if (_exporting) throw ExtractError('${program.relative(path)}: export cycle');
    _exporting = true;
    final result = <String, Entity>{
      for (final MapEntry(:key, :value) in declared.entries)
        if (!key.startsWith('_')) key: value,
    };
    for (final unit in units) {
      for (final directive in unit.ast.directives.whereType<ExportDirective>()) {
        final at = unit.where(directive.offset);
        if (directive.configurations.isNotEmpty) throw ExtractError("$at: conditional exports aren't supported");
        final target = program.resolve(directive.uri, unit.path, at);
        if (target == null) {
          throw ExtractError(
            "$at: exports ${directive.uri.toSource()}, which isn't part of a documented package; "
            "the extractor doesn't document other packages' declarations",
          );
        }
        final exported = _filter(program.library(target, at).exports, directive.combinators);
        for (final MapEntry(key: name, value: entity) in exported.entries) {
          final existing = result[name];
          if (existing != null && !identical(existing, entity)) {
            throw ExtractError('$at: exports a second declaration named $name');
          }
          result[name] = entity;
        }
      }
    }
    _exporting = false;
    return _exports = result;
  }

  /// The declaration that [name] (prefixed by [prefix], if any) refers to in
  /// this library, or null when it comes from the Dart SDK or another package.
  Entity? lookup(String name, {String? prefix}) {
    final imported = _imports();
    if (prefix != null) return _prefixes[prefix]?[name];
    return declared[name] ?? imported[name];
  }

  Map<String, Entity> _imports() {
    if (_imported case final imported?) return imported;
    final result = <String, Entity>{};
    for (final unit in units) {
      for (final directive in unit.ast.directives.whereType<ImportDirective>()) {
        final at = unit.where(directive.offset);
        final target = program.resolve(directive.uri, unit.path, at);
        if (target == null) continue;
        final names = _filter(program.library(target, at).exports, directive.combinators);
        // The token after `as` is the prefix.
        final prefix = directive.asKeyword?.next?.lexeme;
        final into = prefix == null ? result : _prefixes.putIfAbsent(prefix, () => {});
        for (final MapEntry(:key, :value) in names.entries) {
          into.putIfAbsent(key, () => value);
        }
      }
    }
    return _imported = result;
  }

  void _declare(CompilationUnitMember node, Unit unit) {
    void add(String name, {VariableDeclaration? variable}) {
      final entity = declared.putIfAbsent(name, () => Entity(name));
      entity.declarations.add(TopLevel(name, node, unit, variable: variable));
    }

    switch (node) {
      case ClassDeclaration():
        add(node.namePart.typeName.lexeme);
      case EnumDeclaration():
        add(node.namePart.typeName.lexeme);
      case MixinDeclaration():
        add(node.name.lexeme);
      case ExtensionTypeDeclaration():
        add(node.namePart.typeName.lexeme);
      case ExtensionDeclaration():
        // An unnamed extension applies only inside its library.
        if (node.name case final name?) add(name.lexeme);
      case TypeAlias():
        add(node.name.lexeme);
      case FunctionDeclaration():
        add(node.name.lexeme);
      case TopLevelVariableDeclaration():
        for (final variable in node.variables.variables) {
          add(variable.name.lexeme, variable: variable);
        }
      default:
        throw ExtractError("${unit.where(node.offset)}: can't document a ${node.runtimeType}");
    }
  }
}

Map<String, Entity> _filter(Map<String, Entity> names, List<Combinator> combinators) {
  var result = names;
  for (final combinator in combinators) {
    final listed = switch (combinator) {
      ShowCombinator(:final shownNames) => {for (final name in shownNames) name.name},
      HideCombinator(:final hiddenNames) => {for (final name in hiddenNames) name.name},
    };
    final show = combinator is ShowCombinator;
    result = {
      for (final MapEntry(:key, :value) in result.entries)
        if (listed.contains(key) == show) key: value,
    };
  }
  return result;
}

/// The libraries of the documented pub packages, parsed on demand.
final class Program {
  Program(String root, this.libDirectories) : root = p.normalize(p.absolute(root));

  final String root;

  /// The `lib` directory of each documented pub package, by package name.
  final Map<String, String> libDirectories;

  final Map<String, Library> _libraries = {};

  /// [path] relative to the repository root, with `/` separators.
  String relative(String path) => p.posix.joinAll(p.split(p.relative(path, from: root)));

  /// The file that [uri] names in [from], or null for a `dart:` library or a
  /// package that isn't documented.
  String? resolve(StringLiteral uri, String from, String where) {
    final text = uri.stringValue;
    final parsed = text == null ? null : Uri.tryParse(text);
    if (parsed == null) throw ExtractError('$where: unsupported URI ${uri.toSource()}');
    if (parsed.isScheme('dart')) return null;
    if (parsed.isScheme('package')) {
      final segments = parsed.pathSegments;
      if (segments.length < 2) throw ExtractError('$where: invalid package URI $text');
      final directory = libDirectories[segments.first];
      return directory == null ? null : p.normalize(p.joinAll([directory, ...segments.skip(1)]));
    }
    if (parsed.hasScheme || parsed.hasAuthority || parsed.path.startsWith('/')) {
      throw ExtractError('$where: unsupported URI $text');
    }
    return p.normalize(p.join(p.dirname(from), p.joinAll(parsed.pathSegments)));
  }

  /// The library whose defining file is [path]. [where] names what refers to it.
  Library library(String path, String where) {
    final key = p.normalize(p.absolute(path));
    if (_libraries[key] case final library?) return library;
    final library = Library._(this, key);
    _libraries[key] = library;
    final unit = Unit(library, key, _parse(key, where));
    if (unit.ast.directives.whereType<PartOfDirective>().isNotEmpty) {
      throw ExtractError('$where: ${relative(key)} is a part, not a library');
    }
    library.units.add(unit);
    for (final directive in unit.ast.directives.whereType<PartDirective>()) {
      final at = unit.where(directive.offset);
      final path = resolve(directive.uri, key, at);
      if (path == null) throw ExtractError("$at: can't document part ${directive.uri.toSource()}");
      final part = Unit(library, path, _parse(path, at));
      if (part.ast.directives.any((directive) => directive is! PartOfDirective)) {
        throw ExtractError("${relative(path)}: parts with their own imports, exports or parts aren't supported");
      }
      library.units.add(part);
    }
    for (final unit in library.units) {
      for (final node in unit.ast.declarations) {
        library._declare(node, unit);
      }
    }
    return library;
  }

  CompilationUnit _parse(String path, String where) {
    final file = File(path);
    if (!file.existsSync()) throw ExtractError("$where: ${relative(path)} doesn't exist");
    try {
      return parseString(
        content: file.readAsStringSync(),
        path: path,
        featureSet: FeatureSet.latestLanguageVersion(),
      ).unit;
    } on ArgumentError catch (error) {
      throw ExtractError("${relative(path)} doesn't parse: ${error.message}");
    }
  }
}
