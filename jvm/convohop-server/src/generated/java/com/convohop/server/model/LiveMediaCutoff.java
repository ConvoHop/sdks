// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveMediaCutoff</code> result type. */
public final class LiveMediaCutoff implements WireValue {
  private final LiveCutoffState state;
  private final LiveCutoffScope scope;
  private final @Nullable LiveCutoffEvidence evidence;
  private final @Nullable String enforcedAt;
  private final @Nullable String operationId;

  private LiveMediaCutoff(
      LiveCutoffState state,
      LiveCutoffScope scope,
      @Nullable LiveCutoffEvidence evidence,
      @Nullable String enforcedAt,
      @Nullable String operationId) {
    this.state = state;
    this.scope = scope;
    this.evidence = evidence;
    this.enforcedAt = enforcedAt;
    this.operationId = operationId;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveMediaCutoff fromJson(@Nullable Object value) {
    return Wire.required(LiveMediaCutoff::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveMediaCutoff decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveMediaCutoff");
    return new LiveMediaCutoff(
        Wire.field(object, "LiveMediaCutoff", "state", depth, Wire.required(LiveCutoffState::decode)),
        Wire.field(object, "LiveMediaCutoff", "scope", depth, Wire.required(LiveCutoffScope::decode)),
        Wire.field(object, "LiveMediaCutoff", "evidence", depth, Wire.optional(LiveCutoffEvidence::decode)),
        Wire.field(object, "LiveMediaCutoff", "enforcedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "LiveMediaCutoff", "operationId", depth, Wire.optional(Scalars.UUID)));
  }

  /** The <code>state</code> field. */
  public LiveCutoffState getState() {
    return this.state;
  }

  /** The <code>scope</code> field. */
  public LiveCutoffScope getScope() {
    return this.scope;
  }

  /** The <code>evidence</code> field. */
  public @Nullable LiveCutoffEvidence getEvidence() {
    return this.evidence;
  }

  /** The <code>enforcedAt</code> field. */
  public @Nullable String getEnforcedAt() {
    return this.enforcedAt;
  }

  /** The <code>operationId</code> field. */
  public @Nullable String getOperationId() {
    return this.operationId;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("state", Wire.json(this.state));
    json.put("scope", Wire.json(this.scope));
    json.put("evidence", Wire.json(this.evidence));
    json.put("enforcedAt", Wire.json(this.enforcedAt));
    json.put("operationId", Wire.json(this.operationId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveMediaCutoff)) {
      return false;
    }
    LiveMediaCutoff that = (LiveMediaCutoff) other;
    return Objects.equals(this.state, that.state)
        && Objects.equals(this.scope, that.scope)
        && Objects.equals(this.evidence, that.evidence)
        && Objects.equals(this.enforcedAt, that.enforcedAt)
        && Objects.equals(this.operationId, that.operationId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.state, this.scope, this.evidence, this.enforcedAt, this.operationId);
  }

  @Override
  public String toString() {
    return "LiveMediaCutoff{state=" + this.state
        + ", scope=" + this.scope
        + ", evidence=" + this.evidence
        + ", enforcedAt=" + this.enforcedAt
        + ", operationId=" + this.operationId
        + "}";
  }
}
