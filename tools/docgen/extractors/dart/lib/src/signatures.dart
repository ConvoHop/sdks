import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/token.dart';

import 'program.dart';

/// The width dart format wraps at.
const pageWidth = 80;

const _openers = {'(', '[', '{', '<'};
const _closers = {')', ']', '}', '>'};

/// Resolves the type of an initializing formal (`this.x`) or super parameter
/// (`super.x`) that doesn't declare one.
typedef FormalType = String Function(FormalParameter parameter);

/// Renders declarations of [unit] as signatures: the source tokens without
/// comments, bodies or initializers, on one line or in dart format's tall
/// style when they don't fit.
final class Signatures {
  Signatures(this.unit);

  final Unit unit;

  /// The tokens from [first] to [last] on one line. Line breaks become a space,
  /// or nothing inside brackets, and trailing commas go.
  String tokens(Token first, Token last) {
    final lines = unit.ast.lineInfo;
    final buffer = StringBuffer();
    Token? previous;
    for (var token = first; ; token = token.next!) {
      final trailingComma = token.lexeme == ',' && token != last && _closers.contains(token.next!.lexeme);
      if (previous != null && token.offset > previous.end && !trailingComma) {
        final wrapped = lines.getLocation(previous.end).lineNumber != lines.getLocation(token.offset).lineNumber;
        if (!wrapped || !(_openers.contains(previous.lexeme) || _closers.contains(token.lexeme))) buffer.write(' ');
      }
      if (!trailingComma) buffer.write(token.lexeme);
      previous = token;
      if (token == last) return buffer.toString();
      if (token.next == null || token.next!.isEof) throw StateError('$last does not follow $first');
    }
  }

  /// [node]'s tokens on one line.
  String node(AstNode node) => tokens(node.beginToken, node.endToken);

  /// A declaration that takes [parameters]: [first] up to the parameters,
  /// the parameters, then the tokens after them through [last] (or none).
  String callable(
    Token first,
    FormalParameterList parameters,
    FormalType formalType, {
    Token? last,
    int width = pageWidth,
  }) {
    final open = parameters.leftParenthesis;
    final prefix = identical(first, open) ? '' : tokens(first, open.previous!);
    final close = parameters.rightParenthesis;
    final suffix = last == null || identical(last, close) ? '' : tokens(close.next!, last);
    final required = <String>[], optional = <String>[];
    String? group;
    for (final parameter in parameters.parameters) {
      final text = _parameter(parameter, formalType);
      if (parameter.isNamed) {
        group = '{';
        optional.add(text);
      } else if (parameter.isOptionalPositional) {
        group = '[';
        optional.add(text);
      } else {
        required.add(text);
      }
    }
    return layout(prefix, required, optional, group, suffix, width);
  }

  /// A parameter as callers see it: metadata, `required`, `covariant`, the
  /// type, the name and the default value. Initializing formals and super
  /// parameters show the type they take instead of `this.` or `super.`.
  String _parameter(FormalParameter parameter, FormalType formalType) {
    final parts = [
      for (final annotation in parameter.metadata) node(annotation),
      if (parameter.requiredKeyword != null) 'required',
      if (parameter.covariantKeyword != null) 'covariant',
    ];
    if (parameter.type case final type?) {
      parts.add(node(type));
    } else if (parameter.functionTypedSuffix == null &&
        (parameter is FieldFormalParameter || parameter is SuperFormalParameter)) {
      parts.add(formalType(parameter));
    }
    if (parameter.name case final name?) parts.add(name.lexeme);
    var text = parts.join(' ');
    if (parameter.functionTypedSuffix case final suffix?) text += node(suffix);
    if (parameter.defaultClause case final clause?) text += ' = ${tokens(clause.separator.next!, clause.endToken)}';
    return text;
  }
}

/// `prefix(parameters)suffix` on one line when it fits in [width], otherwise
/// in dart format's tall style with one parameter per line. [group] is `[` or
/// `{` when [optional] isn't empty.
String layout(String prefix, List<String> required, List<String> optional, String? group, String suffix, int width) {
  final close = switch (group) {
    '[' => ']',
    '{' => '}',
    _ => '',
  };
  final all = [...required, if (optional.isNotEmpty) '$group${optional.join(', ')}$close'];
  final flat = '$prefix(${all.join(', ')})$suffix';
  if (flat.length <= width || all.isEmpty) return flat;
  final buffer = StringBuffer('$prefix(');
  if (required.isEmpty) buffer.write(group);
  buffer.writeln();
  for (final (index, parameter) in required.indexed) {
    buffer.write('  $parameter,');
    if (index == required.length - 1 && optional.isNotEmpty) buffer.write(' $group');
    buffer.writeln();
  }
  for (final parameter in optional) {
    buffer.writeln('  $parameter,');
  }
  buffer.write('$close)$suffix');
  return buffer.toString();
}

/// [text] with every line but empty ones indented by [indent] spaces.
String indent(String text, int indent) =>
    text.split('\n').map((line) => line.isEmpty ? line : '${' ' * indent}$line').join('\n');
