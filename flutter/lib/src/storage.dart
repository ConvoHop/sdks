import 'dart:async';

/// Durable key-value storage that the SDK uses for mutation recovery
/// records, replay cursors and the offline outbox.
///
/// Values are JSON text. The SDK never stores session tokens or call
/// credentials here. Implement it over the platform storage your app trusts
/// (for example a file in the app's support directory); writes should be
/// durable when the returned future completes.
abstract interface class RecoveryStorage {
  FutureOr<String?> getItem(String key);

  FutureOr<void> setItem(String key, String value);

  FutureOr<void> removeItem(String key);
}

/// In-memory [RecoveryStorage]. State survives a client restart within the
/// same process only; use it in tests or when nothing must outlive the app.
final class MemoryRecoveryStorage implements RecoveryStorage {
  final Map<String, String> _items = <String, String>{};

  /// A copy of the stored items.
  Map<String, String> get items => Map<String, String>.of(_items);

  @override
  String? getItem(String key) => _items[key];

  @override
  void setItem(String key, String value) => _items[key] = value;

  @override
  void removeItem(String key) => _items.remove(key);
}
