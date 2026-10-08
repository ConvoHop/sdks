// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Principal</code> result type. */
public final class Principal implements WireValue {
  private final String principalId;
  private final String externalUserId;
  private final String status;
  private final String revision;

  private Principal(
      String principalId,
      String externalUserId,
      String status,
      String revision) {
    this.principalId = principalId;
    this.externalUserId = externalUserId;
    this.status = status;
    this.revision = revision;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Principal fromJson(@Nullable Object value) {
    return Wire.required(Principal::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Principal decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Principal");
    return new Principal(
        Wire.field(object, "Principal", "principalId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Principal", "externalUserId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Principal", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Principal", "revision", depth, Wire.required(Scalars.DECIMAL)));
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>externalUserId</code> field. */
  public String getExternalUserId() {
    return this.externalUserId;
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("principalId", Wire.json(this.principalId));
    json.put("externalUserId", Wire.json(this.externalUserId));
    json.put("status", Wire.json(this.status));
    json.put("revision", Wire.json(this.revision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Principal)) {
      return false;
    }
    Principal that = (Principal) other;
    return Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.externalUserId, that.externalUserId)
        && Objects.equals(this.status, that.status)
        && Objects.equals(this.revision, that.revision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.principalId, this.externalUserId, this.status, this.revision);
  }

  @Override
  public String toString() {
    return "Principal{principalId=" + this.principalId
        + ", externalUserId=" + this.externalUserId
        + ", status=" + this.status
        + ", revision=" + this.revision
        + "}";
  }
}
