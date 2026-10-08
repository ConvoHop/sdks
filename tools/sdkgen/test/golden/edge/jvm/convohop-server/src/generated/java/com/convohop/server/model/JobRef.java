// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>JobRef</code> result type. */
public final class JobRef implements WireValue {
  private final String operationId;
  private final String state;

  private JobRef(
      String operationId,
      String state) {
    this.operationId = operationId;
    this.state = state;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static JobRef fromJson(@Nullable Object value) {
    return Wire.required(JobRef::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static JobRef decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "JobRef");
    return new JobRef(
        Wire.field(object, "JobRef", "operationId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "JobRef", "state", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("operationId", Wire.json(this.operationId));
    json.put("state", Wire.json(this.state));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof JobRef)) {
      return false;
    }
    JobRef that = (JobRef) other;
    return Objects.equals(this.operationId, that.operationId)
        && Objects.equals(this.state, that.state);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.operationId, this.state);
  }

  @Override
  public String toString() {
    return "JobRef{operationId=" + this.operationId
        + ", state=" + this.state
        + "}";
  }
}
