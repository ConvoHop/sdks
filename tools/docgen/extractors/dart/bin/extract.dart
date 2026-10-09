import 'dart:convert';
import 'dart:io';

import 'package:convohop_docgen_dart/convohop_docgen_dart.dart';

/// Prints the surface JSON of the packages a language file documents:
///
///     dart bin/extract.dart <repository root> <language.json>
void main(List<String> arguments) {
  if (arguments.length != 2) {
    stderr.writeln('usage: dart bin/extract.dart <repository root> <language.json>');
    exitCode = 2;
    return;
  }
  try {
    stdout.write(jsonEncode(extract(arguments[0], arguments[1])));
  } on ExtractError catch (error) {
    stderr.writeln('dart extractor: $error');
    exitCode = 1;
  }
}
