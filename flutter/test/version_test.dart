import 'dart:io';

import 'package:convohop/convohop.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reports the version in its pubspec', () {
    final line = File('pubspec.yaml').readAsLinesSync().singleWhere((line) => line.startsWith('version:'));
    expect(convoHopPackageVersion, line.substring('version:'.length).trim());
  });
}
