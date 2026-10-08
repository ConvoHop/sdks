// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSessionEndRequested</code> result type. */
public final class LiveSessionEndRequested implements WireValue {
  private final String liveSessionId;
  private final String operationId;
  private final LiveMediaCutoff mediaCutoff;

  private LiveSessionEndRequested(
      String liveSessionId,
      String operationId,
      LiveMediaCutoff mediaCutoff) {
    this.liveSessionId = liveSessionId;
    this.operationId = operationId;
    this.mediaCutoff = mediaCutoff;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSessionEndRequested fromJson(@Nullable Object value) {
    return Wire.required(LiveSessionEndRequested::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSessionEndRequested decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSessionEndRequested");
    return new LiveSessionEndRequested(
        Wire.field(object, "LiveSessionEndRequested", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionEndRequested", "operationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveSessionEndRequested", "mediaCutoff", depth, Wire.required(LiveMediaCutoff::decode)));
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
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
    json.put("operationId", Wire.json(this.operationId));
    json.put("mediaCutoff", Wire.json(this.mediaCutoff));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionEndRequested)) {
      return false;
    }
    LiveSessionEndRequested that = (LiveSessionEndRequested) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.operationId, that.operationId)
        && Objects.equals(this.mediaCutoff, that.mediaCutoff);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.operationId, this.mediaCutoff);
  }

  @Override
  public String toString() {
    return "LiveSessionEndRequested{liveSessionId=" + this.liveSessionId
        + ", operationId=" + this.operationId
        + ", mediaCutoff=" + this.mediaCutoff
        + "}";
  }
}
