// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>OperationStep</code> result type. */
public final class OperationStep implements WireValue {
  private final String stepId;
  private final String state;

  private OperationStep(
      String stepId,
      String state) {
    this.stepId = stepId;
    this.state = state;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static OperationStep fromJson(@Nullable Object value) {
    return Wire.required(OperationStep::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static OperationStep decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "OperationStep");
    return new OperationStep(
        Wire.field(object, "OperationStep", "stepId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "OperationStep", "state", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>stepId</code> field. */
  public String getStepId() {
    return this.stepId;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("stepId", Wire.json(this.stepId));
    json.put("state", Wire.json(this.state));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof OperationStep)) {
      return false;
    }
    OperationStep that = (OperationStep) other;
    return Objects.equals(this.stepId, that.stepId)
        && Objects.equals(this.state, that.state);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.stepId, this.state);
  }

  @Override
  public String toString() {
    return "OperationStep{stepId=" + this.stepId
        + ", state=" + this.state
        + "}";
  }
}
