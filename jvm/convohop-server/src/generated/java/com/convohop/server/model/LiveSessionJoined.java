// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSessionJoined</code> result type. */
public final class LiveSessionJoined implements WireValue {
  private final String liveSessionId;
  private final String generation;
  private final LiveParticipation participation;

  private LiveSessionJoined(
      String liveSessionId,
      String generation,
      LiveParticipation participation) {
    this.liveSessionId = liveSessionId;
    this.generation = generation;
    this.participation = participation;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSessionJoined fromJson(@Nullable Object value) {
    return Wire.required(LiveSessionJoined::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSessionJoined decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSessionJoined");
    return new LiveSessionJoined(
        Wire.field(object, "LiveSessionJoined", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionJoined", "generation", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveSessionJoined", "participation", depth, Wire.required(LiveParticipation::decode)));
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>generation</code> field. */
  public String getGeneration() {
    return this.generation;
  }

  /** The <code>participation</code> field. */
  public LiveParticipation getParticipation() {
    return this.participation;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("generation", Wire.json(this.generation));
    json.put("participation", Wire.json(this.participation));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionJoined)) {
      return false;
    }
    LiveSessionJoined that = (LiveSessionJoined) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.generation, that.generation)
        && Objects.equals(this.participation, that.participation);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.generation, this.participation);
  }

  @Override
  public String toString() {
    return "LiveSessionJoined{liveSessionId=" + this.liveSessionId
        + ", generation=" + this.generation
        + ", participation=" + this.participation
        + "}";
  }
}
