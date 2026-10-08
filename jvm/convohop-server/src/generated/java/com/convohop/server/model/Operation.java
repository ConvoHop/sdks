// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Operation</code> result type. */
public final class Operation implements WireValue {
  private final String operationId;
  private final String kind;
  private final @Nullable ResourceRef targetRef;
  private final String state;
  private final String revision;
  private final String requestedAt;
  private final String updatedAt;
  private final List<OperationStep> steps;
  private final @Nullable OperationResult result;
  private final @Nullable String blockedReason;

  private Operation(
      String operationId,
      String kind,
      @Nullable ResourceRef targetRef,
      String state,
      String revision,
      String requestedAt,
      String updatedAt,
      List<OperationStep> steps,
      @Nullable OperationResult result,
      @Nullable String blockedReason) {
    this.operationId = operationId;
    this.kind = kind;
    this.targetRef = targetRef;
    this.state = state;
    this.revision = revision;
    this.requestedAt = requestedAt;
    this.updatedAt = updatedAt;
    this.steps = steps;
    this.result = result;
    this.blockedReason = blockedReason;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Operation fromJson(@Nullable Object value) {
    return Wire.required(Operation::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Operation decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Operation");
    return new Operation(
        Wire.field(object, "Operation", "operationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Operation", "kind", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Operation", "targetRef", depth, Wire.optional(ResourceRef::decode)),
        Wire.field(object, "Operation", "state", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Operation", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Operation", "requestedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Operation", "updatedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Operation", "steps", depth, Wire.required(Wire.list(Wire.required(OperationStep::decode)))),
        Wire.field(object, "Operation", "result", depth, Wire.optional(OperationResult::decode)),
        Wire.field(object, "Operation", "blockedReason", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
  }

  /** The <code>kind</code> field. */
  public String getKind() {
    return this.kind;
  }

  /** The <code>targetRef</code> field. */
  public @Nullable ResourceRef getTargetRef() {
    return this.targetRef;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>requestedAt</code> field. */
  public String getRequestedAt() {
    return this.requestedAt;
  }

  /** The <code>updatedAt</code> field. */
  public String getUpdatedAt() {
    return this.updatedAt;
  }

  /** The <code>steps</code> field. */
  public List<OperationStep> getSteps() {
    return this.steps;
  }

  /** The <code>result</code> field. */
  public @Nullable OperationResult getResult() {
    return this.result;
  }

  /** The <code>blockedReason</code> field. */
  public @Nullable String getBlockedReason() {
    return this.blockedReason;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("operationId", Wire.json(this.operationId));
    json.put("kind", Wire.json(this.kind));
    json.put("targetRef", Wire.json(this.targetRef));
    json.put("state", Wire.json(this.state));
    json.put("revision", Wire.json(this.revision));
    json.put("requestedAt", Wire.json(this.requestedAt));
    json.put("updatedAt", Wire.json(this.updatedAt));
    json.put("steps", Wire.json(this.steps));
    json.put("result", Wire.json(this.result));
    json.put("blockedReason", Wire.json(this.blockedReason));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Operation)) {
      return false;
    }
    Operation that = (Operation) other;
    return Objects.equals(this.operationId, that.operationId)
        && Objects.equals(this.kind, that.kind)
        && Objects.equals(this.targetRef, that.targetRef)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.requestedAt, that.requestedAt)
        && Objects.equals(this.updatedAt, that.updatedAt)
        && Objects.equals(this.steps, that.steps)
        && Objects.equals(this.result, that.result)
        && Objects.equals(this.blockedReason, that.blockedReason);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.operationId, this.kind, this.targetRef, this.state, this.revision, this.requestedAt, this.updatedAt, this.steps, this.result, this.blockedReason);
  }

  @Override
  public String toString() {
    return "Operation{operationId=" + this.operationId
        + ", kind=" + this.kind
        + ", targetRef=" + this.targetRef
        + ", state=" + this.state
        + ", revision=" + this.revision
        + ", requestedAt=" + this.requestedAt
        + ", updatedAt=" + this.updatedAt
        + ", steps=" + this.steps
        + ", result=" + this.result
        + ", blockedReason=" + this.blockedReason
        + "}";
  }
}
