# `package:convohop/io.dart`

File-backed recovery storage for the conversation store and the outbox.

**Layer:** Client. **Runtime:** Flutter 3.38 or later (Dart 3.10 or later) on Android 7.0 (API level 24) or later and iOS 13 or later. **Source:** `flutter`.

## Classes

### `FileRecoveryStorage` class

```dart
final class FileRecoveryStorage implements RecoveryStorage
```

`RecoveryStorage` with one file per key in `directory`, for example the
app's support directory.

Writes go to a temporary file that then replaces the item, so a crash
leaves the old or the new value. Use one instance per directory: it
orders its own writes to a key, but not those of other instances. The
files hold message text from the outbox and the conversation store, so
keep them in app-private storage.

#### `FileRecoveryStorage` constructor

```dart
FileRecoveryStorage(Directory directory)
```

#### `FileRecoveryStorage.directory` property

```dart
final Directory directory
```

#### `FileRecoveryStorage.getItem` method

```dart
Future<String?> getItem(String key)
```

#### `FileRecoveryStorage.setItem` method

```dart
Future<void> setItem(String key, String value)
```

#### `FileRecoveryStorage.removeItem` method

```dart
Future<void> removeItem(String key)
```
