// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Session</code> result type. */
public final class Session implements WireValue {
  private final String sessionId;
  private final String principalId;
  private final String deviceId;
  private final String incarnation;
  private final String sessionRevision;
  private final String expiresAt;
  private final String status;

  private Session(
      String sessionId,
      String principalId,
      String deviceId,
      String incarnation,
      String sessionRevision,
      String expiresAt,
      String status) {
    this.sessionId = sessionId;
    this.principalId = principalId;
    this.deviceId = deviceId;
    this.incarnation = incarnation;
    this.sessionRevision = sessionRevision;
    this.expiresAt = expiresAt;
    this.status = status;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Session fromJson(@Nullable Object value) {
    return Wire.required(Session::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Session decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Session");
    return new Session(
        Wire.field(object, "Session", "sessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Session", "principalId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Session", "deviceId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Session", "incarnation", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Session", "sessionRevision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Session", "expiresAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Session", "status", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>sessionId</code> field. */
  public String getSessionId() {
    return this.sessionId;
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>deviceId</code> field. */
  public String getDeviceId() {
    return this.deviceId;
  }

  /** The <code>incarnation</code> field. */
  public String getIncarnation() {
    return this.incarnation;
  }

  /** The <code>sessionRevision</code> field. */
  public String getSessionRevision() {
    return this.sessionRevision;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("sessionId", Wire.json(this.sessionId));
    json.put("principalId", Wire.json(this.principalId));
    json.put("deviceId", Wire.json(this.deviceId));
    json.put("incarnation", Wire.json(this.incarnation));
    json.put("sessionRevision", Wire.json(this.sessionRevision));
    json.put("expiresAt", Wire.json(this.expiresAt));
    json.put("status", Wire.json(this.status));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Session)) {
      return false;
    }
    Session that = (Session) other;
    return Objects.equals(this.sessionId, that.sessionId)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.deviceId, that.deviceId)
        && Objects.equals(this.incarnation, that.incarnation)
        && Objects.equals(this.sessionRevision, that.sessionRevision)
        && Objects.equals(this.expiresAt, that.expiresAt)
        && Objects.equals(this.status, that.status);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.sessionId, this.principalId, this.deviceId, this.incarnation, this.sessionRevision, this.expiresAt, this.status);
  }

  @Override
  public String toString() {
    return "Session{sessionId=" + this.sessionId
        + ", principalId=" + this.principalId
        + ", deviceId=" + this.deviceId
        + ", incarnation=" + this.incarnation
        + ", sessionRevision=" + this.sessionRevision
        + ", expiresAt=" + this.expiresAt
        + ", status=" + this.status
        + "}";
  }
}
