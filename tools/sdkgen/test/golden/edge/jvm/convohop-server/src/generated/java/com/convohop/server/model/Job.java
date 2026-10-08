// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Job</code> result type. */
public final class Job implements WireValue {
  private final String operationId;
  private final String state;
  private final @Nullable Double progress;
  private final @Nullable Map<String, @Nullable Object> output;

  private Job(
      String operationId,
      String state,
      @Nullable Double progress,
      @Nullable Map<String, @Nullable Object> output) {
    this.operationId = operationId;
    this.state = state;
    this.progress = progress;
    this.output = output;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Job fromJson(@Nullable Object value) {
    return Wire.required(Job::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Job decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Job");
    return new Job(
        Wire.field(object, "Job", "operationId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Job", "state", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Job", "progress", depth, Wire.optional(Wire.FLOAT)),
        Wire.field(object, "Job", "output", depth, Wire.optional(Scalars.BLOB)));
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The <code>progress</code> field. */
  public @Nullable Double getProgress() {
    return this.progress;
  }

  /** The <code>output</code> field. */
  public @Nullable Map<String, @Nullable Object> getOutput() {
    return this.output;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("operationId", Wire.json(this.operationId));
    json.put("state", Wire.json(this.state));
    json.put("progress", Wire.json(this.progress));
    json.put("output", Wire.json(this.output));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Job)) {
      return false;
    }
    Job that = (Job) other;
    return Objects.equals(this.operationId, that.operationId)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.progress, that.progress)
        && Objects.equals(this.output, that.output);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.operationId, this.state, this.progress, this.output);
  }

  @Override
  public String toString() {
    return "Job{operationId=" + this.operationId
        + ", state=" + this.state
        + ", progress=" + this.progress
        + ", output=" + this.output
        + "}";
  }
}
