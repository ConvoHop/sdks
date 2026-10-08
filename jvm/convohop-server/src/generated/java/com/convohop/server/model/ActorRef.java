// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>ActorRef</code> result type. */
public final class ActorRef implements WireValue {
  private final String tenantId;
  private final String objectId;

  private ActorRef(
      String tenantId,
      String objectId) {
    this.tenantId = tenantId;
    this.objectId = objectId;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ActorRef fromJson(@Nullable Object value) {
    return Wire.required(ActorRef::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ActorRef decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "ActorRef");
    return new ActorRef(
        Wire.field(object, "ActorRef", "tenantId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ActorRef", "objectId", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>tenantId</code> field. */
  public String getTenantId() {
    return this.tenantId;
  }

  /** The <code>objectId</code> field. */
  public String getObjectId() {
    return this.objectId;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("tenantId", Wire.json(this.tenantId));
    json.put("objectId", Wire.json(this.objectId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ActorRef)) {
      return false;
    }
    ActorRef that = (ActorRef) other;
    return Objects.equals(this.tenantId, that.tenantId)
        && Objects.equals(this.objectId, that.objectId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.tenantId, this.objectId);
  }

  @Override
  public String toString() {
    return "ActorRef{tenantId=" + this.tenantId
        + ", objectId=" + this.objectId
        + "}";
  }
}
