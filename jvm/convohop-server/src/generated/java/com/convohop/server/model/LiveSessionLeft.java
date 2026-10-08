// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSessionLeft</code> result type. */
public final class LiveSessionLeft implements WireValue {
  private final String liveSessionId;
  private final String participationId;
  private final LiveMediaCutoff mediaCutoff;

  private LiveSessionLeft(
      String liveSessionId,
      String participationId,
      LiveMediaCutoff mediaCutoff) {
    this.liveSessionId = liveSessionId;
    this.participationId = participationId;
    this.mediaCutoff = mediaCutoff;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSessionLeft fromJson(@Nullable Object value) {
    return Wire.required(LiveSessionLeft::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSessionLeft decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSessionLeft");
    return new LiveSessionLeft(
        Wire.field(object, "LiveSessionLeft", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionLeft", "participationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionLeft", "mediaCutoff", depth, Wire.required(LiveMediaCutoff::decode)));
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>participationId</code> field. */
  public String getParticipationId() {
    return this.participationId;
  }

  /** The <code>mediaCutoff</code> field. */
  public LiveMediaCutoff getMediaCutoff() {
    return this.mediaCutoff;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("participationId", Wire.json(this.participationId));
    json.put("mediaCutoff", Wire.json(this.mediaCutoff));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionLeft)) {
      return false;
    }
    LiveSessionLeft that = (LiveSessionLeft) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.participationId, that.participationId)
        && Objects.equals(this.mediaCutoff, that.mediaCutoff);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.participationId, this.mediaCutoff);
  }

  @Override
  public String toString() {
    return "LiveSessionLeft{liveSessionId=" + this.liveSessionId
        + ", participationId=" + this.participationId
        + ", mediaCutoff=" + this.mediaCutoff
        + "}";
  }
}
