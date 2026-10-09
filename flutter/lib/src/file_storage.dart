import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';

import 'storage.dart';

/// [RecoveryStorage] with one file per key in [directory], for example the
/// app's support directory.
///
/// Writes go to a temporary file that then replaces the item, so a crash
/// leaves the old or the new value. Use one instance per directory: it
/// orders its own writes to a key, but not those of other instances. The
/// files hold message text from the outbox and the conversation store, so
/// keep them in app-private storage.
final class FileRecoveryStorage implements RecoveryStorage {
  FileRecoveryStorage(this.directory);

  final Directory directory;
  final Map<String, Future<void>> _writes = <String, Future<void>>{};
  var _sequence = 0;

  File _file(String key) => File('${directory.path}/${sha256.convert(utf8.encode(key))}.json');

  @override
  Future<String?> getItem(String key) async {
    final pending = _writes[key];
    if (pending != null) {
      try {
        await pending;
      } on Object {
        // The writer reports its own failure; read whatever the file holds.
      }
    }
    final file = _file(key);
    try {
      return await file.readAsString();
    } on PathNotFoundException {
      return null;
    }
  }

  @override
  Future<void> setItem(String key, String value) => _enqueue(key, () async {
    await directory.create(recursive: true);
    final target = _file(key);
    final temporary = File('${target.path}.${pid}_${_sequence++}.tmp');
    try {
      await temporary.writeAsString(value, flush: true);
      await temporary.rename(target.path);
    } on Object {
      try {
        await temporary.delete();
      } on FileSystemException {
        // Already gone.
      }
      rethrow;
    }
  });

  @override
  Future<void> removeItem(String key) => _enqueue(key, () async {
    try {
      await _file(key).delete();
    } on PathNotFoundException {
      // Already gone.
    }
  });

  Future<void> _enqueue(String key, Future<void> Function() write) {
    final previous = _writes[key] ?? Future<void>.value();
    late final Future<void> next;
    next = previous.then((_) => write(), onError: (Object _) => write()).whenComplete(() {
      if (identical(_writes[key], next)) _writes.remove(key);
    });
    _writes[key] = next;
    return next;
  }
}
