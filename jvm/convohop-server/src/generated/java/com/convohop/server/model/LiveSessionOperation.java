// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSessionOperation</code> result type. */
public final class LiveSessionOperation implements WireValue {
  private final String operationId;
  private final String requestId;
  private final String liveSessionId;
  private final LiveOperationKind kind;
  private final LiveOperationState state;
  private final String revision;
  private final String requestedAt;
  private final @Nullable String completedAt;
  private final @Nullable LiveSessionOperationCompletion completion;
  private final @Nullable LiveOperationFailure failure;

  private LiveSessionOperation(
      String operationId,
      String requestId,
      String liveSessionId,
      LiveOperationKind kind,
      LiveOperationState state,
      String revision,
      String requestedAt,
      @Nullable String completedAt,
      @Nullable LiveSessionOperationCompletion completion,
      @Nullable LiveOperationFailure failure) {
    this.operationId = operationId;
    this.requestId = requestId;
    this.liveSessionId = liveSessionId;
    this.kind = kind;
    this.state = state;
    this.revision = revision;
    this.requestedAt = requestedAt;
    this.completedAt = completedAt;
    this.completion = completion;
    this.failure = failure;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSessionOperation fromJson(@Nullable Object value) {
    return Wire.required(LiveSessionOperation::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSessionOperation decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSessionOperation");
    return new LiveSessionOperation(
        Wire.field(object, "LiveSessionOperation", "operationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionOperation", "requestId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionOperation", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionOperation", "kind", depth, Wire.required(LiveOperationKind::decode)),
        Wire.field(object, "LiveSessionOperation", "state", depth, Wire.required(LiveOperationState::decode)),
        Wire.field(object, "LiveSessionOperation", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveSessionOperation", "requestedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "LiveSessionOperation", "completedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "LiveSessionOperation", "completion", depth, Wire.optional(LiveSessionOperationCompletion::decode)),
        Wire.field(object, "LiveSessionOperation", "failure", depth, Wire.optional(LiveOperationFailure::decode)));
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>kind</code> field. */
  public LiveOperationKind getKind() {
    return this.kind;
  }

  /** The <code>state</code> field. */
  public LiveOperationState getState() {
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

  /** The <code>completedAt</code> field. */
  public @Nullable String getCompletedAt() {
    return this.completedAt;
  }

  /** The <code>completion</code> field. */
  public @Nullable LiveSessionOperationCompletion getCompletion() {
    return this.completion;
  }

  /** The <code>failure</code> field. */
  public @Nullable LiveOperationFailure getFailure() {
    return this.failure;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("operationId", Wire.json(this.operationId));
    json.put("requestId", Wire.json(this.requestId));
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("kind", Wire.json(this.kind));
    json.put("state", Wire.json(this.state));
    json.put("revision", Wire.json(this.revision));
    json.put("requestedAt", Wire.json(this.requestedAt));
    json.put("completedAt", Wire.json(this.completedAt));
    json.put("completion", Wire.json(this.completion));
    json.put("failure", Wire.json(this.failure));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionOperation)) {
      return false;
    }
    LiveSessionOperation that = (LiveSessionOperation) other;
    return Objects.equals(this.operationId, that.operationId)
        && Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.kind, that.kind)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.requestedAt, that.requestedAt)
        && Objects.equals(this.completedAt, that.completedAt)
        && Objects.equals(this.completion, that.completion)
        && Objects.equals(this.failure, that.failure);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.operationId, this.requestId, this.liveSessionId, this.kind, this.state, this.revision, this.requestedAt, this.completedAt, this.completion, this.failure);
  }

  @Override
  public String toString() {
    return "LiveSessionOperation{operationId=" + this.operationId
        + ", requestId=" + this.requestId
        + ", liveSessionId=" + this.liveSessionId
        + ", kind=" + this.kind
        + ", state=" + this.state
        + ", revision=" + this.revision
        + ", requestedAt=" + this.requestedAt
        + ", completedAt=" + this.completedAt
        + ", completion=" + this.completion
        + ", failure=" + this.failure
        + "}";
  }
}
