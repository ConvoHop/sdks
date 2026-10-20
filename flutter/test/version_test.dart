import 'dart:io';

import 'package:instantrelay/instantrelay.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reports the version in its pubspec', () {
    final line = File('pubspec.yaml').readAsLinesSync().singleWhere((line) => line.startsWith('version:'));
    expect(relayPackageVersion, line.substring('version:'.length).trim());
  });
}
