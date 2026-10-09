import 'package:analyzer/dart/ast/ast.dart';

import 'program.dart';

final _fence = RegExp(r'^ {0,3}(`{3,}|~{3,})(.*)$');
final _codeSpanOrReference = RegExp(r'(`+)[\s\S]*?\1|\[([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\](?![(\[])');

/// The documentation comment of [node] as Markdown, or `''`. [where] names
/// the declaration for failures.
///
/// dartdoc references such as `[Foo.bar]` become code spans. Unlabeled code
/// fences become `dart` fences, which is how dartdoc highlights them. Block
/// comments (`/** */`), dartdoc directives (`{@...}`) and `@nodoc` fail,
/// because the reference couldn't show what dartdoc does.
String docs(Comment? comment, String where) {
  if (comment == null) return '';
  final lines = <String>[];
  for (final token in comment.tokens) {
    final text = token.lexeme;
    if (!text.startsWith('///')) throw ExtractError('$where: use /// documentation comments, not /** */');
    final line = text.substring(3);
    lines.add(line.startsWith(' ') ? line.substring(1) : line);
  }
  if (comment.hasNodoc) throw ExtractError("$where: @nodoc isn't supported; make the declaration private instead");
  final output = <String>[];
  final prose = <String>[];
  String? fence;
  void flush() {
    if (prose.isEmpty) return;
    output.add(
      prose.join('\n').replaceAllMapped(_codeSpanOrReference, (match) {
        final reference = match[2];
        return reference == null ? match[0]! : '`$reference`';
      }),
    );
    prose.clear();
  }

  for (final line in lines) {
    final match = _fence.firstMatch(line);
    if (fence == null) {
      if (match == null) {
        if (line.contains('{@')) throw ExtractError("$where: dartdoc directives ({@...}) aren't supported");
        prose.add(line);
        continue;
      }
      flush();
      fence = match[1]!;
      output.add(match[2]!.trim().isEmpty ? '${line.trimRight()}dart' : line);
    } else {
      output.add(line);
      if (match != null && match[1]![0] == fence[0] && match[1]!.length >= fence.length && match[2]!.trim().isEmpty) {
        fence = null;
      }
    }
  }
  flush();
  return output.join('\n').trim();
}

/// The `deprecated` value of a declaration with [metadata]: null when it
/// isn't deprecated, otherwise the message of `@Deprecated(...)` or `''` for
/// `@deprecated`. Other `Deprecated` constructors, such as
/// `@Deprecated.extend()`, deprecate one use of a declaration and fail.
String? deprecation(List<Annotation> metadata, String where) {
  for (final annotation in metadata) {
    // Without resolution, `@core.Deprecated(...)` and `@Deprecated.extend()`
    // parse alike, so look at every part of the name.
    final parts = [
      ...switch (annotation.name) {
        PrefixedIdentifier(:final prefix, :final identifier) => [prefix.name, identifier.name],
        final Identifier identifier => [identifier.name],
      },
      ?annotation.constructorName?.name,
    ];
    if (parts.last == 'deprecated' && annotation.arguments == null) return '';
    if (!parts.contains('Deprecated')) continue;
    final arguments = annotation.arguments?.arguments;
    if (parts.last != 'Deprecated' || arguments == null || arguments.length != 1) {
      throw ExtractError(
        '$where: only @deprecated and @Deprecated(message) are supported, not ${annotation.toSource()}',
      );
    }
    final message = arguments.single;
    final value = message is StringLiteral ? message.stringValue : null;
    if (value == null) throw ExtractError("$where: the @Deprecated message isn't a constant string");
    return value.trim();
  }
  return null;
}
