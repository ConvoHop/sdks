// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveCutoffScope</code> result type. */
public final class LiveCutoffScope implements WireValue {
  private final LiveCutoffScopeKind kind;
  private final String liveSessionId;
  private final String generation;
  private final @Nullable String participationId;

  private LiveCutoffScope(
      LiveCutoffScopeKind kind,
      String liveSessionId,
      String generation,
      @Nullable String participationId) {
    this.kind = kind;
    this.liveSessionId = liveSessionId;
    this.generation = generation;
    this.participationId = participationId;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveCutoffScope fromJson(@Nullable Object value) {
    return Wire.required(LiveCutoffScope::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveCutoffScope decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveCutoffScope");
    return new LiveCutoffScope(
        Wire.field(object, "LiveCutoffScope", "kind", depth, Wire.required(LiveCutoffScopeKind::decode)),
        Wire.field(object, "LiveCutoffScope", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveCutoffScope", "generation", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveCutoffScope", "participationId", depth, Wire.optional(Scalars.UUID)));
  }

  /** The <code>kind</code> field. */
  public LiveCutoffScopeKind getKind() {
    return this.kind;
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>generation</code> field. */
  public String getGeneration() {
    return this.generation;
  }

  /** The <code>participationId</code> field. */
  public @Nullable String getParticipationId() {
    return this.participationId;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("kind", Wire.json(this.kind));
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("generation", Wire.json(this.generation));
    json.put("participationId", Wire.json(this.participationId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveCutoffScope)) {
      return false;
    }
    LiveCutoffScope that = (LiveCutoffScope) other;
    return Objects.equals(this.kind, that.kind)
        && Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.generation, that.generation)
        && Objects.equals(this.participationId, that.participationId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.kind, this.liveSessionId, this.generation, this.participationId);
  }

  @Override
  public String toString() {
    return "LiveCutoffScope{kind=" + this.kind
        + ", liveSessionId=" + this.liveSessionId
        + ", generation=" + this.generation
        + ", participationId=" + this.participationId
        + "}";
  }
}
