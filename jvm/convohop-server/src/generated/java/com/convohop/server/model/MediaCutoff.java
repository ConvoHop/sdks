// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>MediaCutoff</code> result type. */
public final class MediaCutoff implements WireValue {
  private final String state;
  private final @Nullable CutoffScope scope;

  private MediaCutoff(
      String state,
      @Nullable CutoffScope scope) {
    this.state = state;
    this.scope = scope;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static MediaCutoff fromJson(@Nullable Object value) {
    return Wire.required(MediaCutoff::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static MediaCutoff decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "MediaCutoff");
    return new MediaCutoff(
        Wire.field(object, "MediaCutoff", "state", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "MediaCutoff", "scope", depth, Wire.optional(CutoffScope::decode)));
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The <code>scope</code> field. */
  public @Nullable CutoffScope getScope() {
    return this.scope;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("state", Wire.json(this.state));
    json.put("scope", Wire.json(this.scope));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof MediaCutoff)) {
      return false;
    }
    MediaCutoff that = (MediaCutoff) other;
    return Objects.equals(this.state, that.state)
        && Objects.equals(this.scope, that.scope);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.state, this.scope);
  }

  @Override
  public String toString() {
    return "MediaCutoff{state=" + this.state
        + ", scope=" + this.scope
        + "}";
  }
}
