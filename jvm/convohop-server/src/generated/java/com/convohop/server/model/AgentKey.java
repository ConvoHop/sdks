// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>AgentKey</code> result type. */
public final class AgentKey implements WireValue {
  private final String operationId;
  private final String state;
  private final List<String> scopes;
  private final String expiresAt;
  private final @Nullable String keyId;
  private final @Nullable String deliveryId;
  private final @Nullable String deliveryExpiresAt;

  private AgentKey(
      String operationId,
      String state,
      List<String> scopes,
      String expiresAt,
      @Nullable String keyId,
      @Nullable String deliveryId,
      @Nullable String deliveryExpiresAt) {
    this.operationId = operationId;
    this.state = state;
    this.scopes = scopes;
    this.expiresAt = expiresAt;
    this.keyId = keyId;
    this.deliveryId = deliveryId;
    this.deliveryExpiresAt = deliveryExpiresAt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static AgentKey fromJson(@Nullable Object value) {
    return Wire.required(AgentKey::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static AgentKey decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "AgentKey");
    return new AgentKey(
        Wire.field(object, "AgentKey", "operationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentKey", "state", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentKey", "scopes", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "AgentKey", "expiresAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentKey", "keyId", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "AgentKey", "deliveryId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "AgentKey", "deliveryExpiresAt", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The <code>scopes</code> field. */
  public List<String> getScopes() {
    return this.scopes;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The <code>keyId</code> field. */
  public @Nullable String getKeyId() {
    return this.keyId;
  }

  /** The <code>deliveryId</code> field. */
  public @Nullable String getDeliveryId() {
    return this.deliveryId;
  }

  /** The <code>deliveryExpiresAt</code> field. */
  public @Nullable String getDeliveryExpiresAt() {
    return this.deliveryExpiresAt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("operationId", Wire.json(this.operationId));
    json.put("state", Wire.json(this.state));
    json.put("scopes", Wire.json(this.scopes));
    json.put("expiresAt", Wire.json(this.expiresAt));
    json.put("keyId", Wire.json(this.keyId));
    json.put("deliveryId", Wire.json(this.deliveryId));
    json.put("deliveryExpiresAt", Wire.json(this.deliveryExpiresAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentKey)) {
      return false;
    }
    AgentKey that = (AgentKey) other;
    return Objects.equals(this.operationId, that.operationId)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.scopes, that.scopes)
        && Objects.equals(this.expiresAt, that.expiresAt)
        && Objects.equals(this.keyId, that.keyId)
        && Objects.equals(this.deliveryId, that.deliveryId)
        && Objects.equals(this.deliveryExpiresAt, that.deliveryExpiresAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.operationId, this.state, this.scopes, this.expiresAt, this.keyId, this.deliveryId, this.deliveryExpiresAt);
  }

  @Override
  public String toString() {
    return "AgentKey{operationId=" + this.operationId
        + ", state=" + this.state
        + ", scopes=" + this.scopes
        + ", expiresAt=" + this.expiresAt
        + ", keyId=" + this.keyId
        + ", deliveryId=" + this.deliveryId
        + ", deliveryExpiresAt=" + this.deliveryExpiresAt
        + "}";
  }
}
