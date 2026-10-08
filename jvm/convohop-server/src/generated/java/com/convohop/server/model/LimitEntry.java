// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LimitEntry</code> result type. */
public final class LimitEntry implements WireValue {
  private final String key;
  private final Limit value;

  private LimitEntry(
      String key,
      Limit value) {
    this.key = key;
    this.value = value;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LimitEntry fromJson(@Nullable Object value) {
    return Wire.required(LimitEntry::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LimitEntry decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LimitEntry");
    return new LimitEntry(
        Wire.field(object, "LimitEntry", "key", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "LimitEntry", "value", depth, Wire.required(Limit::decode)));
  }

  /** The <code>key</code> field. */
  public String getKey() {
    return this.key;
  }

  /** The <code>value</code> field. */
  public Limit getValue() {
    return this.value;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("key", Wire.json(this.key));
    json.put("value", Wire.json(this.value));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LimitEntry)) {
      return false;
    }
    LimitEntry that = (LimitEntry) other;
    return Objects.equals(this.key, that.key)
        && Objects.equals(this.value, that.value);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.key, this.value);
  }

  @Override
  public String toString() {
    return "LimitEntry{key=" + Wire.redacted(this.key)
        + ", value=" + this.value
        + "}";
  }
}
