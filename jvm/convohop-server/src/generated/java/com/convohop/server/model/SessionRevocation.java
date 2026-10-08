// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>SessionRevocation</code> result type. */
public final class SessionRevocation implements WireValue {
  private final String sessionId;
  private final String status;
  private final @Nullable MediaCutoff mediaCutoff;

  private SessionRevocation(
      String sessionId,
      String status,
      @Nullable MediaCutoff mediaCutoff) {
    this.sessionId = sessionId;
    this.status = status;
    this.mediaCutoff = mediaCutoff;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static SessionRevocation fromJson(@Nullable Object value) {
    return Wire.required(SessionRevocation::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static SessionRevocation decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "SessionRevocation");
    return new SessionRevocation(
        Wire.field(object, "SessionRevocation", "sessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "SessionRevocation", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "SessionRevocation", "mediaCutoff", depth, Wire.optional(MediaCutoff::decode)));
  }

  /** The <code>sessionId</code> field. */
  public String getSessionId() {
    return this.sessionId;
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>mediaCutoff</code> field. */
  public @Nullable MediaCutoff getMediaCutoff() {
    return this.mediaCutoff;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("sessionId", Wire.json(this.sessionId));
    json.put("status", Wire.json(this.status));
    json.put("mediaCutoff", Wire.json(this.mediaCutoff));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SessionRevocation)) {
      return false;
    }
    SessionRevocation that = (SessionRevocation) other;
    return Objects.equals(this.sessionId, that.sessionId)
        && Objects.equals(this.status, that.status)
        && Objects.equals(this.mediaCutoff, that.mediaCutoff);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.sessionId, this.status, this.mediaCutoff);
  }

  @Override
  public String toString() {
    return "SessionRevocation{sessionId=" + this.sessionId
        + ", status=" + this.status
        + ", mediaCutoff=" + this.mediaCutoff
        + "}";
  }
}
