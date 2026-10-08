// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveAlertBatch</code> result type. */
public final class LiveAlertBatch implements WireValue {
  private final String liveSessionId;
  private final String created;
  private final String suppressed;

  private LiveAlertBatch(
      String liveSessionId,
      String created,
      String suppressed) {
    this.liveSessionId = liveSessionId;
    this.created = created;
    this.suppressed = suppressed;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveAlertBatch fromJson(@Nullable Object value) {
    return Wire.required(LiveAlertBatch::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveAlertBatch decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveAlertBatch");
    return new LiveAlertBatch(
        Wire.field(object, "LiveAlertBatch", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveAlertBatch", "created", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveAlertBatch", "suppressed", depth, Wire.required(Scalars.DECIMAL)));
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>created</code> field. */
  public String getCreated() {
    return this.created;
  }

  /** The <code>suppressed</code> field. */
  public String getSuppressed() {
    return this.suppressed;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("created", Wire.json(this.created));
    json.put("suppressed", Wire.json(this.suppressed));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveAlertBatch)) {
      return false;
    }
    LiveAlertBatch that = (LiveAlertBatch) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.created, that.created)
        && Objects.equals(this.suppressed, that.suppressed);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.created, this.suppressed);
  }

  @Override
  public String toString() {
    return "LiveAlertBatch{liveSessionId=" + this.liveSessionId
        + ", created=" + this.created
        + ", suppressed=" + this.suppressed
        + "}";
  }
}
