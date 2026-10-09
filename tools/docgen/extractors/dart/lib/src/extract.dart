import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/ast/ast.dart';
import 'package:path/path.dart' as p;
import 'package:yaml/yaml.dart';

import 'docs.dart';
import 'program.dart';
import 'signatures.dart';

/// Generated files that declare data shapes (GraphQL models and the operation
/// catalog), relative to a package's `lib` directory. Their declarations show
/// their members in the signature, like a declaration file, instead of
/// listing each one.
const sketchedFiles = ['src/generated/models.dart', 'src/generated/catalog.dart'];

final _packageName = RegExp(r'^package:([a-z_][a-z0-9_]*)/([^/].*\.dart)$');

typedef Json = Map<String, Object?>;

/// The surface (spec/docs/surface.schema.json) of the libraries that the
/// language file at [languageFile] documents, reading sources from [root].
///
/// Each documented package is a library such as `package:convohop/calls.dart`
/// whose pub package lives in the package's `source` directory. Its symbols
/// are the public declarations the library exports. Libraries of the same pub
/// package share declarations, so none of them is another's origin.
Json extract(String root, String languageFile) {
  final Object? language;
  try {
    language = jsonDecode(File(languageFile).readAsStringSync());
  } on IOException catch (error) {
    throw ExtractError("couldn't read $languageFile: $error");
  } on FormatException catch (error) {
    throw ExtractError("$languageFile isn't JSON: ${error.message}");
  }
  if (language is! Map<String, Object?> || language['id'] is! String || language['packages'] is! List<Object?>) {
    throw ExtractError("$languageFile isn't a language file");
  }
  final packages = <(String, String, String)>[];
  final libDirectories = <String, String>{};
  for (final package in language['packages']! as List<Object?>) {
    if (package is! Map<String, Object?> || package['name'] is! String || package['source'] is! String) {
      throw ExtractError('$languageFile: every package needs a name and a source');
    }
    final name = package['name']! as String;
    final source = p.normalize(p.join(root, package['source']! as String));
    final match = _packageName.firstMatch(name);
    if (match == null) {
      throw ExtractError('$languageFile: $name is not a library URI such as package:convohop/convohop.dart');
    }
    final pubName = _pubName(source, root);
    if (match[1] != pubName) throw ExtractError('$languageFile: $name is not in pub package $pubName');
    final lib = p.join(source, 'lib');
    if (libDirectories.putIfAbsent(pubName, () => lib) != lib) {
      throw ExtractError('$languageFile: pub package $pubName has two sources');
    }
    packages.add((name, pubName, match[2]!));
  }
  final program = Program(root, libDirectories);
  final sketched = {
    for (final lib in libDirectories.values)
      for (final file in sketchedFiles) p.normalize(p.absolute(lib, file)),
  };
  final extractor = _Extractor(sketched);
  return {
    'language': language['id'],
    'packages': [
      for (final (name, pubName, path) in packages)
        {
          'name': name,
          'symbols': [
            for (final entity in program.library(p.join(libDirectories[pubName]!, path), languageFile).exports.values)
              extractor.symbol(entity),
          ]..sort((a, b) => (a['name']! as String).compareTo(b['name']! as String)),
        },
    ],
  };
}

String _pubName(String source, String root) {
  final file = File(p.join(source, 'pubspec.yaml'));
  final where = p.posix.joinAll(p.split(p.relative(file.path, from: root)));
  final Object? pubspec;
  try {
    pubspec = loadYaml(file.readAsStringSync());
  } on IOException catch (error) {
    throw ExtractError("couldn't read $where: $error");
  } on YamlException catch (error) {
    throw ExtractError("$where isn't YAML: ${error.message}");
  }
  final name = pubspec is YamlMap ? pubspec['name'] : null;
  if (name is! String) throw ExtractError('$where has no name');
  return name;
}

/// A member while its class is collected: accessors and constructors merge.
final class _Member {
  _Member(this.name, this.kind, this.isStatic, {this.inherited});

  final String name;
  final String kind;
  final bool isStatic;
  final String? inherited;
  final List<String> signatures = [];
  String docs = '';
  String? deprecated;

  /// Constructors: each documented one's display name and docs.
  final List<(String, String)> labelledDocs = [];
  final List<String?> deprecations = [];

  Json toJson() => {
    'name': name,
    'kind': kind,
    'signatures': signatures,
    'docs': docs,
    'deprecated': ?deprecated,
    if (isStatic) 'static': true,
    'inherited': ?inherited,
  };
}

final class _Extractor {
  _Extractor(this.sketched);

  /// Absolute paths of [sketchedFiles].
  final Set<String> sketched;

  Json symbol(Entity entity) {
    if (entity.declarations.length > 1) return _accessors(entity);
    final declaration = entity.declarations.single;
    final node = declaration.node;
    final where = declaration.where;
    final signatures = Signatures(declaration.unit);
    final first = node.firstTokenAfterCommentAndMetadata;
    final docs = _docs(node, where);
    final deprecated = deprecation(node.metadata, where);
    final sketch = sketched.contains(declaration.unit.path);
    Json result(String kind, String signature, [List<_Member> members = const []]) => {
      'name': entity.name,
      'kind': kind,
      'signatures': [signature],
      'docs': docs,
      'deprecated': ?deprecated,
      if (members.isNotEmpty && !sketch) 'members': [for (final member in members) member.toJson()],
    };

    switch (node) {
      case ClassDeclaration(:final namePart, :final body):
        if (namePart is! NameWithTypeParameters) throw ExtractError("$where: primary constructors aren't supported");
        final interface = node.abstractKeyword != null && node.interfaceKeyword != null;
        final header = signatures.tokens(first, body.beginToken.previous!);
        if (sketch) return result(interface ? 'interface' : 'class', _sketch(declaration, header));
        return result(interface ? 'interface' : 'class', header, [
          ..._ownMembers(declaration),
          ..._inheritedMembers(declaration),
        ]);
      case MixinDeclaration(:final body):
        final header = signatures.tokens(first, body.beginToken.previous!);
        if (sketch) return result('interface', _sketch(declaration, header));
        return result('interface', header, _ownMembers(declaration));
      case EnumDeclaration(:final body):
        final header = signatures.tokens(first, body.beginToken.previous!);
        if (sketch) return result('enum', _sketch(declaration, header));
        return result('enum', header, [..._ownMembers(declaration), ..._inheritedMembers(declaration)]);
      case ExtensionDeclaration(:final body):
        final header = signatures.tokens(first, body.beginToken.previous!);
        if (sketch) return result('namespace', _sketch(declaration, header));
        return result('namespace', header, _ownMembers(declaration));
      case ExtensionTypeDeclaration():
        throw ExtractError("$where: extension types aren't supported");
      case ClassTypeAlias():
        throw ExtractError("$where: mixin application classes (class A = B with C) aren't supported");
      case GenericTypeAlias(:final functionType?):
        return result(
          'type',
          signatures.callable(first, functionType.parameters, _untyped, last: functionType.endToken),
        );
      case GenericTypeAlias(:final semicolon):
        return result('type', signatures.tokens(first, semicolon.previous!));
      case FunctionTypeAlias(:final parameters):
        return result('type', signatures.callable(first, parameters, _untyped, last: parameters.rightParenthesis));
      case FunctionDeclaration():
        final kind = node.isGetter || node.isSetter ? 'constant' : 'function';
        return result(kind, _function(signatures, node));
      case TopLevelVariableDeclaration(:final variables):
        return result(
          'constant',
          _variable(declaration, signatures, variables, declaration.variable!, null, null, where),
        );
      default:
        throw ExtractError("$where: can't document a ${node.runtimeType}");
    }
  }

  /// A top-level getter and setter: one constant with both signatures.
  Json _accessors(Entity entity) {
    final signatures = <String>[];
    var docs = '';
    String? deprecated;
    for (final declaration in entity.declarations) {
      final node = declaration.node;
      if (node is! FunctionDeclaration || !(node.isGetter || node.isSetter)) {
        throw ExtractError('${declaration.where}: declares ${entity.name} twice');
      }
      signatures.add(_function(Signatures(declaration.unit), node));
      if (docs.isEmpty) docs = _docs(node, declaration.where);
      deprecated ??= deprecation(node.metadata, declaration.where);
    }
    return {'name': entity.name, 'kind': 'constant', 'signatures': signatures, 'docs': docs, 'deprecated': ?deprecated};
  }

  String _function(Signatures signatures, FunctionDeclaration node) {
    final first = node.firstTokenAfterCommentAndMetadata;
    if (node.isGetter) return signatures.tokens(first, node.name);
    return signatures.callable(first, node.functionExpression.parameters!, _untyped);
  }

  String _docs(AnnotatedNode node, String where) => docs(node.documentationComment, where);

  /// The public members [declaration] declares, in declaration order, as
  /// [_Member]s. With [inherited], only instance members that a subclass
  /// inherits, marked as declared by [inherited].
  List<_Member> _ownMembers(TopLevel declaration, {String? inherited, int width = pageWidth}) {
    final node = declaration.node;
    final className = declaration.name;
    final signatures = Signatures(declaration.unit);
    final (constants, members) = switch (node) {
      ClassDeclaration(:final body) => (const <EnumConstantDeclaration>[], _classMembers(body)),
      MixinDeclaration(:final body) => (const <EnumConstantDeclaration>[], _classMembers(body)),
      ExtensionDeclaration(:final body) => (const <EnumConstantDeclaration>[], _classMembers(body)),
      EnumDeclaration(:final body) => (body.constants, body.members),
      _ => throw StateError('${node.runtimeType} has no members'),
    };
    final result = <_Member>[];
    final byKey = <String, _Member>{};
    _Member? constructor;
    final generative = _generativeConstructors(node);

    _Member add(String name, String kind, bool isStatic, String where, {bool merge = false}) {
      final key = '${isStatic ? 'static ' : ''}$name';
      if (byKey[key] case final existing?) {
        if (merge && existing.kind == kind) return existing;
        throw ExtractError('$where: ${declaration.name} declares $name twice');
      }
      final member = _Member(name, kind, isStatic, inherited: inherited);
      result.add(member);
      return byKey[key] = member;
    }

    if (inherited == null) {
      for (final constant in constants) {
        final where = '${declaration.unit.where(constant.name.offset)}: $className.${constant.name.lexeme}';
        add(constant.name.lexeme, 'case', false, where)
          ..signatures.add(signatures.tokens(constant.name, constant.endToken))
          ..docs = docs(constant.documentationComment, where)
          ..deprecated = deprecation(constant.metadata, where);
      }
      if (generative && !members.any((member) => member is ConstructorDeclaration)) {
        constructor = add(className, 'constructor', false, declaration.where)..signatures.add('$className()');
        constructor.deprecations.add(null);
      }
    }
    for (final member in members) {
      final where = '${declaration.unit.where(member.firstTokenAfterCommentAndMetadata.offset)}: $className';
      final memberDocs = docs(member.documentationComment, where);
      final memberDeprecated = deprecation(member.metadata, where);
      switch (member) {
        case ConstructorDeclaration(:final name, :final factoryKeyword):
          if (inherited != null || (name?.lexeme.startsWith('_') ?? false)) continue;
          if (factoryKeyword == null && !generative) continue;
          final display = name == null ? className : '$className.${name.lexeme}';
          constructor ??= add(className, 'constructor', false, where);
          constructor.signatures.add(
            signatures.callable(
              member.firstTokenAfterCommentAndMetadata,
              member.parameters,
              (parameter) => _formalType(declaration, member, parameter),
              width: width,
            ),
          );
          if (memberDocs.isNotEmpty) constructor.labelledDocs.add((display, memberDocs));
          constructor.deprecations.add(memberDeprecated);
        case FieldDeclaration(:final fields, :final isStatic):
          if (inherited != null && isStatic) continue;
          for (final variable in fields.variables) {
            final name = variable.name.lexeme;
            if (name.startsWith('_')) continue;
            final property = add(name, 'property', isStatic, '$where.$name', merge: true);
            property.signatures.add(
              _variable(
                declaration,
                signatures,
                fields,
                variable,
                member.staticKeyword,
                member.covariantKeyword,
                '$where.$name',
              ),
            );
            if (property.docs.isEmpty) property.docs = memberDocs;
            property.deprecated ??= memberDeprecated;
          }
        case MethodDeclaration(:final name, :final isStatic):
          if (name.lexeme.startsWith('_') || (inherited != null && isStatic)) continue;
          final accessor = member.isGetter || member.isSetter;
          final memberName = member.isOperator ? 'operator ${name.lexeme}' : name.lexeme;
          final entry = add(
            memberName,
            accessor ? 'property' : 'method',
            isStatic,
            '$where.$memberName',
            merge: accessor,
          );
          final first = member.firstTokenAfterCommentAndMetadata;
          entry.signatures.add(
            member.isGetter
                ? signatures.tokens(first, name)
                : signatures.callable(first, member.parameters!, _untyped, width: width),
          );
          if (entry.docs.isEmpty) entry.docs = memberDocs;
          entry.deprecated ??= memberDeprecated;
        default:
          throw ExtractError("$where: can't document a ${member.runtimeType}");
      }
    }
    for (final member in result) {
      if (member.docs.isEmpty && !member.isStatic && (member.kind == 'method' || member.kind == 'property')) {
        member.docs = _overriddenDocs(declaration, member.name);
      }
    }
    if (constructor != null) {
      final labelled = constructor.labelledDocs;
      constructor.docs = constructor.signatures.length == 1 && labelled.length == 1
          ? labelled.single.$2
          : labelled.map((entry) => '**`${entry.$1}`**\n\n${entry.$2}').join('\n\n');
      final deprecations = constructor.deprecations;
      if (deprecations.every((value) => value != null)) {
        constructor.deprecated = deprecations.join('\n\n').trim();
      } else if (deprecations.any((value) => value != null)) {
        throw ExtractError("${declaration.where}: deprecate all of $className's constructors or none of them");
      }
    }
    return result;
  }

  List<ClassMember> _classMembers(ClassBody body) => switch (body) {
    BlockClassBody(:final members) => members,
    _ => const [],
  };

  /// Whether code outside the library can call [node]'s generative
  /// constructors, by creating instances or by extending it.
  bool _generativeConstructors(CompilationUnitMember node) => switch (node) {
    ClassDeclaration() =>
      node.sealedKeyword == null &&
          !(node.abstractKeyword != null && (node.finalKeyword != null || node.interfaceKeyword != null)),
    _ => false,
  };

  /// The members [declaration] inherits from documented base classes and
  /// mixins and doesn't redeclare, nearest base first. Members of other
  /// packages' bases aren't documented, so the walk stops at the first one.
  List<_Member> _inheritedMembers(TopLevel declaration) {
    final names = {
      for (final member in _ownMembers(declaration))
        if (!member.isStatic) member.name,
    };
    final result = <_Member>[];
    for (final base in _bases(declaration)) {
      for (final member in _ownMembers(base, inherited: base.name)) {
        if (names.add(member.name)) result.add(member);
      }
    }
    return result;
  }

  /// The docs of the nearest documented member named [name] that
  /// [declaration]'s member of that name overrides, as dartdoc shows them for
  /// an undocumented override. Empty when the overridden members come from
  /// other packages or have no docs.
  String _overriddenDocs(TopLevel declaration, String name) {
    if (!_inheriting.add(declaration)) throw ExtractError('${declaration.where}: inherits from itself');
    try {
      for (final supertype in _supertypes(declaration)) {
        final members = _ownMembers(supertype, inherited: supertype.name).where((member) => member.name == name);
        final docs = members.isEmpty ? _overriddenDocs(supertype, name) : members.single.docs;
        if (docs.isNotEmpty) return docs;
      }
      return '';
    } finally {
      _inheriting.remove(declaration);
    }
  }

  /// The declarations whose docs [_overriddenDocs] is collecting.
  final Set<TopLevel> _inheriting = {};

  /// The documented classes and mixins that [declaration] directly extends,
  /// mixes in or implements, in the order that members override: mixins last
  /// to first, the superclass, then interfaces. Other packages' are left out.
  List<TopLevel> _supertypes(TopLevel declaration) {
    final types = switch (declaration.node) {
      ClassDeclaration(:final withClause, :final extendsClause, :final implementsClause) => [
        ...?withClause?.mixinTypes.reversed,
        ?extendsClause?.superclass,
        ...?implementsClause?.interfaces,
      ],
      MixinDeclaration(:final onClause, :final implementsClause) => [
        ...?onClause?.superclassConstraints,
        ...?implementsClause?.interfaces,
      ],
      EnumDeclaration(:final withClause, :final implementsClause) => [
        ...?withClause?.mixinTypes.reversed,
        ...?implementsClause?.interfaces,
      ],
      _ => const <NamedType>[],
    };
    return [for (final type in types) ?_resolve(declaration, type)];
  }

  /// [declaration]'s superclasses and mixins in the order that members
  /// override: its mixins last to first, then its superclass and that one's
  /// mixins and superclass, until a declaration of another package.
  List<TopLevel> _bases(TopLevel declaration) {
    final result = <TopLevel>[];
    var current = declaration;
    while (true) {
      final (mixins, superclass) = switch (current.node) {
        ClassDeclaration(:final withClause, :final extendsClause) => (
          withClause?.mixinTypes ?? const <NamedType>[],
          extendsClause?.superclass,
        ),
        EnumDeclaration(:final withClause) => (withClause?.mixinTypes ?? const <NamedType>[], null),
        _ => (const <NamedType>[], null),
      };
      for (final mixin in mixins.reversed) {
        final resolved = _resolve(current, mixin);
        if (resolved == null) return result;
        result.add(resolved);
      }
      if (superclass == null) return result;
      final resolved = _resolve(current, superclass);
      if (resolved == null) return result;
      if (result.contains(resolved) || resolved == declaration) {
        throw ExtractError('${declaration.where}: inherits from itself');
      }
      result.add(resolved);
      current = resolved;
    }
  }

  /// The class or mixin that [type] names in [context]'s library, or null
  /// when it comes from the Dart SDK or another package.
  TopLevel? _resolve(TopLevel context, NamedType type) {
    final entity = context.library.lookup(type.name.lexeme, prefix: type.importPrefix?.name.lexeme);
    if (entity == null) return null;
    final declaration = entity.declarations.single;
    if (declaration.node is! ClassDeclaration && declaration.node is! MixinDeclaration) {
      throw ExtractError("${context.where}: can't follow ${type.toSource()}, which isn't a class or mixin");
    }
    return declaration;
  }

  /// The type of initializing formal or super parameter [parameter] of
  /// [constructor], a constructor of [owner].
  String _formalType(TopLevel owner, ConstructorDeclaration constructor, FormalParameter parameter) {
    final name = parameter.name!.lexeme;
    final where = '${owner.unit.where(parameter.offset)}: ${owner.name}';
    switch (parameter) {
      case FieldFormalParameter():
        for (final member in _classMembers((owner.node as ClassDeclaration).body)) {
          if (member is! FieldDeclaration || member.isStatic) continue;
          for (final variable in member.fields.variables) {
            if (variable.name.lexeme != name) continue;
            if (member.fields.type case final type?) return Signatures(owner.unit).node(type);
            return _inferredType(owner, Signatures(owner.unit), variable.initializer) ??
                (throw ExtractError('$where: give field $name a type'));
          }
        }
        throw ExtractError("$where: can't find field $name of this.$name");
      case SuperFormalParameter():
        final superclass = (owner.node as ClassDeclaration).extendsClause?.superclass;
        final base = superclass == null ? null : _resolve(owner, superclass);
        if (base == null || base.node is! ClassDeclaration) {
          throw ExtractError("$where: can't find the type of super.$name in another package; give it a type");
        }
        String? constructorName;
        for (final initializer in constructor.initializers) {
          if (initializer is SuperConstructorInvocation) {
            final period = initializer.superKeyword.next!;
            constructorName = period.lexeme == '.' ? period.next!.lexeme : null;
          }
        }
        final target = _classMembers((base.node as ClassDeclaration).body)
            .whereType<ConstructorDeclaration>()
            .where((candidate) => candidate.name?.lexeme == constructorName)
            .firstOrNull;
        if (target == null) throw ExtractError("$where: can't find the super constructor of super.$name");
        final FormalParameter? forwarded;
        if (parameter.isNamed) {
          forwarded = target.parameters.parameters
              .where((candidate) => candidate.isNamed && candidate.name?.lexeme == name)
              .firstOrNull;
        } else {
          final index = constructor.parameters.parameters
              .where((candidate) => candidate is SuperFormalParameter && candidate.isPositional)
              .toList()
              .indexOf(parameter);
          final positional = target.parameters.parameters.where((candidate) => candidate.isPositional).toList();
          forwarded = index < positional.length ? positional[index] : null;
        }
        if (forwarded == null) throw ExtractError("$where: can't find the parameter super.$name forwards to");
        if (forwarded.type case final type?) return Signatures(base.unit).node(type);
        if (forwarded is FieldFormalParameter || forwarded is SuperFormalParameter) {
          return _formalType(base, target, forwarded);
        }
        throw ExtractError('$where: the parameter super.$name forwards to has no type');
      default:
        throw StateError('${parameter.runtimeType} declares its type');
    }
  }

  /// A field or top-level variable of [context] as
  /// `[static] [late] [final|const] Type name`. The initializer stays out, so
  /// the signature doesn't change with the value.
  String _variable(
    TopLevel context,
    Signatures signatures,
    VariableDeclarationList list,
    VariableDeclaration variable,
    Object? staticKeyword,
    Object? covariantKeyword,
    String where,
  ) {
    final keyword = list.keyword?.lexeme;
    final type = list.type == null
        ? _inferredType(context, signatures, variable.initializer)
        : signatures.node(list.type!);
    if (type == null) {
      throw ExtractError(
        '$where: give ${variable.name.lexeme} a type; the extractor infers only the types of literals '
        "and of constructor calls of the package's classes",
      );
    }
    return [
      if (staticKeyword != null) 'static',
      if (covariantKeyword != null) 'covariant',
      if (list.lateKeyword != null) 'late',
      if (keyword != null && keyword != 'var') keyword,
      type,
      variable.name.lexeme,
    ].join(' ');
  }

  /// The type Dart infers for [initializer], a variable initializer in
  /// [context], when that doesn't need type inference: a literal, or a call
  /// of a constructor that one of the package's classes declares, with type
  /// arguments if the class takes any. Otherwise null.
  String? _inferredType(TopLevel context, Signatures signatures, Expression? initializer) {
    // Without resolution, prefix.C() and C.named() parse alike, so each
    // call shape lists the (prefix, class, constructor) readings it can have.
    final List<(String?, String, String?)> readings;
    TypeArgumentList? typeArguments;
    switch (initializer) {
      case StringLiteral():
        return 'String';
      case IntegerLiteral():
        return 'int';
      case DoubleLiteral():
        return 'double';
      case BooleanLiteral():
        return 'bool';
      case PrefixExpression(:final operator, operand: IntegerLiteral() || DoubleLiteral()) when operator.lexeme == '-':
        return initializer.operand is IntegerLiteral ? 'int' : 'double';
      case InstanceCreationExpression(constructorName: ConstructorName(:final type, :final name)):
        typeArguments = type.typeArguments;
        final prefix = type.importPrefix?.name.lexeme;
        readings = [
          (prefix, type.name.lexeme, name?.name),
          if (prefix != null && name == null) (null, prefix, type.name.lexeme),
        ];
      case MethodInvocation(target: null, :final methodName):
        typeArguments = initializer.typeArguments;
        readings = [(null, methodName.name, null)];
      case MethodInvocation(target: SimpleIdentifier(:final name), :final methodName):
        typeArguments = initializer.typeArguments;
        readings = [(name, methodName.name, null), if (typeArguments == null) (null, name, methodName.name)];
      case MethodInvocation(target: PrefixedIdentifier(:final prefix, :final identifier), :final methodName)
          when initializer.typeArguments == null:
        readings = [(prefix.name, identifier.name, methodName.name)];
      default:
        return null;
    }
    for (final (prefix, className, constructorName) in readings) {
      final declarations = context.library.lookup(className, prefix: prefix)?.declarations;
      final node = declarations?.length == 1 ? declarations!.single.node : null;
      if (node is! ClassDeclaration) continue;
      if ((node.namePart.typeParameters == null) != (typeArguments == null)) continue;
      final constructors = _classMembers(node.body).whereType<ConstructorDeclaration>();
      final declared = constructorName == null && constructors.isEmpty
          ? _generativeConstructors(node)
          : constructors.any((constructor) => constructor.name?.lexeme == constructorName);
      if (!declared) continue;
      return '${prefix == null ? '' : '$prefix.'}$className${typeArguments == null ? '' : signatures.node(typeArguments)}';
    }
    return null;
  }

  /// [declaration] as a declaration file would show it: the header, then each
  /// public member's signature.
  String _sketch(TopLevel declaration, String header) {
    // Each member line has a two-space indent and ends with a semicolon.
    const width = pageWidth - 3;
    final lines = <String>[];
    final members = _ownMembers(declaration, width: width);
    final cases = members.where((member) => member.kind == 'case').toList();
    final rest = members.where((member) => member.kind != 'case').toList();
    for (final (index, member) in cases.indexed) {
      final last = index == cases.length - 1;
      lines.add('${member.signatures.single}${last ? (rest.isEmpty ? '' : ';') : ','}');
    }
    for (final member in rest) {
      for (final signature in member.signatures) {
        lines.add('$signature;');
      }
    }
    if (lines.isEmpty) return '$header {}';
    return '$header {\n${lines.map((line) => indent(line, 2)).join('\n')}\n}';
  }
}

/// For declarations without initializing formals or super parameters.
String _untyped(FormalParameter parameter) => throw StateError('$parameter has no class');
