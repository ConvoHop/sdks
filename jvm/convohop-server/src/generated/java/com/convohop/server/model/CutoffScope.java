// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>CutoffScope</code> result type. */
public final class CutoffScope implements WireValue {
  private final String kind;
  private final @Nullable String principalId;
  private final @Nullable String sessionId;
  private final @Nullable String deviceId;
  private final @Nullable String callId;

  private CutoffScope(
      String kind,
      @Nullable String principalId,
      @Nullable String sessionId,
      @Nullable String deviceId,
      @Nullable String callId) {
    this.kind = kind;
    this.principalId = principalId;
    this.sessionId = sessionId;
    this.deviceId = deviceId;
    this.callId = callId;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static CutoffScope fromJson(@Nullable Object value) {
    return Wire.required(CutoffScope::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static CutoffScope decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "CutoffScope");
    return new CutoffScope(
        Wire.field(object, "CutoffScope", "kind", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "CutoffScope", "principalId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "CutoffScope", "sessionId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "CutoffScope", "deviceId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "CutoffScope", "callId", depth, Wire.optional(Scalars.UUID)));
  }

  /** The <code>kind</code> field. */
  public String getKind() {
    return this.kind;
  }

  /** The <code>principalId</code> field. */
  public @Nullable String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>sessionId</code> field. */
  public @Nullable String getSessionId() {
    return this.sessionId;
  }

  /** The <code>deviceId</code> field. */
  public @Nullable String getDeviceId() {
    return this.deviceId;
  }

  /** The <code>callId</code> field. */
  public @Nullable String getCallId() {
    return this.callId;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("kind", Wire.json(this.kind));
    json.put("principalId", Wire.json(this.principalId));
    json.put("sessionId", Wire.json(this.sessionId));
    json.put("deviceId", Wire.json(this.deviceId));
    json.put("callId", Wire.json(this.callId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CutoffScope)) {
      return false;
    }
    CutoffScope that = (CutoffScope) other;
    return Objects.equals(this.kind, that.kind)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.sessionId, that.sessionId)
        && Objects.equals(this.deviceId, that.deviceId)
        && Objects.equals(this.callId, that.callId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.kind, this.principalId, this.sessionId, this.deviceId, this.callId);
  }

  @Override
  public String toString() {
    return "CutoffScope{kind=" + this.kind
        + ", principalId=" + this.principalId
        + ", sessionId=" + this.sessionId
        + ", deviceId=" + this.deviceId
        + ", callId=" + this.callId
        + "}";
  }
}
