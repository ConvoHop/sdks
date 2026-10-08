package com.convohop.server;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import org.jspecify.annotations.Nullable;

/**
 * Durable storage for mutation recovery records, so a process restart can resolve or resend a mutation whose outcome
 * is uncertain with its original request ID and payload. Records hold operation inputs, never credentials.
 *
 * <p>{@link #setItem} must return only once the value is durable; throw when it is not. Calls arrive from any thread
 * that uses the client, so implementations must be thread-safe.
 */
public interface RecoveryStorage {
  /**
   * Reads a value.
   *
   * @param key the key
   * @return the value, or null when none is stored
   */
  @Nullable String getItem(String key);

  /**
   * Stores a value durably.
   *
   * @param key the key
   * @param value the value
   */
  void setItem(String key, String value);

  /**
   * Removes a value.
   *
   * @param key the key
   */
  void removeItem(String key);

  /**
   * Storage that lives as long as the process. Recovery then survives client re-creation, not restarts.
   *
   * @return new, empty storage
   */
  static RecoveryStorage inMemory() {
    Map<String, String> values = new ConcurrentHashMap<>();
    return new RecoveryStorage() {
      @Override
      public @Nullable String getItem(String key) {
        return values.get(Objects.requireNonNull(key, "key"));
      }

      @Override
      public void setItem(String key, String value) {
        values.put(Objects.requireNonNull(key, "key"), Objects.requireNonNull(value, "value"));
      }

      @Override
      public void removeItem(String key) {
        values.remove(Objects.requireNonNull(key, "key"));
      }
    };
  }
}
