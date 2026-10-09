import 'dart:io';

import 'package:convohop/io.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('file recovery storage round trips and leaves no temporary write files', () async {
    final directory = Directory('.dart_tool/convohop_file_storage_test');
    if (await directory.exists()) await directory.delete(recursive: true);
    final storage = FileRecoveryStorage(directory);

    await storage.setItem('key', '{"one":1}');
    expect(await storage.getItem('key'), '{"one":1}');
    await storage.setItem('key', '{"two":2}');
    expect(await storage.getItem('key'), '{"two":2}');
    await storage.removeItem('key');
    expect(await storage.getItem('key'), isNull);
    final leftovers = await directory.exists() ? await directory.list().toList() : <FileSystemEntity>[];
    expect(leftovers.where((entity) => entity.path.endsWith('.tmp')), isEmpty);
    if (await directory.exists()) await directory.delete(recursive: true);
  });
}
