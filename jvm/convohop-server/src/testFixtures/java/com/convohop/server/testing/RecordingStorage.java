package com.convohop.server.testing;

import com.convohop.server.RecoveryStorage;
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.jspecify.annotations.Nullable;

/** Recovery storage that records every call and can refuse writes, like the TypeScript tests' recovery fixtures. */
public final class RecordingStorage implements RecoveryStorage {
  private final Map<String, String> values = new ConcurrentHashMap<>();
  private final List<String> reads = new CopyOnWriteArrayList<>();
  private final List<Map.Entry<String, String>> writes = new CopyOnWriteArrayList<>();
  private final List<String> removals = new CopyOnWriteArrayList<>();
  private volatile boolean failWrites;

  @Override
  public @Nullable String getItem(String key) {
    this.reads.add(key);
    return this.values.get(key);
  }

  @Override
  public void setItem(String key, String value) {
    if (this.failWrites) {
      throw new IllegalStateException("database unavailable");
    }
    this.writes.add(new AbstractMap.SimpleImmutableEntry<>(key, value));
    this.values.put(key, value);
  }

  @Override
  public void removeItem(String key) {
    this.removals.add(key);
    this.values.remove(key);
  }

  /** Makes later writes throw. */
  public RecordingStorage failWrites() {
    this.failWrites = true;
    return this;
  }

  /** Stores a value without recording it, as an earlier process would have. */
  public RecordingStorage put(String key, String value) {
    this.values.put(key, value);
    return this;
  }

  public @Nullable String value(String key) {
    return this.values.get(key);
  }

  public List<String> reads() {
    return new ArrayList<>(this.reads);
  }

  public List<Map.Entry<String, String>> writes() {
    return new ArrayList<>(this.writes);
  }

  public List<String> removals() {
    return new ArrayList<>(this.removals);
  }
}
