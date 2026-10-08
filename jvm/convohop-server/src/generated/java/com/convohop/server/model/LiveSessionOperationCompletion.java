// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSessionOperationCompletion</code> result type. */
public final class LiveSessionOperationCompletion implements WireValue {
  private final String liveSessionId;
  private final String generation;
  private final LiveSessionState state;
  private final String revision;
  private final String completedAt;
  private final @Nullable LiveMediaCutoff mediaCutoff;

  private LiveSessionOperationCompletion(
      String liveSessionId,
      String generation,
      LiveSessionState state,
      String revision,
      String completedAt,
      @Nullable LiveMediaCutoff mediaCutoff) {
    this.liveSessionId = liveSessionId;
    this.generation = generation;
    this.state = state;
    this.revision = revision;
    this.completedAt = completedAt;
    this.mediaCutoff = mediaCutoff;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSessionOperationCompletion fromJson(@Nullable Object value) {
    return Wire.required(LiveSessionOperationCompletion::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSessionOperationCompletion decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSessionOperationCompletion");
    return new LiveSessionOperationCompletion(
        Wire.field(object, "LiveSessionOperationCompletion", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionOperationCompletion", "generation", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveSessionOperationCompletion", "state", depth, Wire.required(LiveSessionState::decode)),
        Wire.field(object, "LiveSessionOperationCompletion", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveSessionOperationCompletion", "completedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "LiveSessionOperationCompletion", "mediaCutoff", depth, Wire.optional(LiveMediaCutoff::decode)));
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>generation</code> field. */
  public String getGeneration() {
    return this.generation;
  }

  /** The <code>state</code> field. */
  public LiveSessionState getState() {
    return this.state;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>completedAt</code> field. */
  public String getCompletedAt() {
    return this.completedAt;
  }

  /** The <code>mediaCutoff</code> field. */
  public @Nullable LiveMediaCutoff getMediaCutoff() {
    return this.mediaCutoff;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("generation", Wire.json(this.generation));
    json.put("state", Wire.json(this.state));
    json.put("revision", Wire.json(this.revision));
    json.put("completedAt", Wire.json(this.completedAt));
    json.put("mediaCutoff", Wire.json(this.mediaCutoff));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionOperationCompletion)) {
      return false;
    }
    LiveSessionOperationCompletion that = (LiveSessionOperationCompletion) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.generation, that.generation)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.completedAt, that.completedAt)
        && Objects.equals(this.mediaCutoff, that.mediaCutoff);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.generation, this.state, this.revision, this.completedAt, this.mediaCutoff);
  }

  @Override
  public String toString() {
    return "LiveSessionOperationCompletion{liveSessionId=" + this.liveSessionId
        + ", generation=" + this.generation
        + ", state=" + this.state
        + ", revision=" + this.revision
        + ", completedAt=" + this.completedAt
        + ", mediaCutoff=" + this.mediaCutoff
        + "}";
  }
}
