// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>DeliveryAck</code> result type. */
public final class DeliveryAck implements WireValue {
  private final String deliveryId;
  private final Boolean acknowledged;

  private DeliveryAck(
      String deliveryId,
      Boolean acknowledged) {
    this.deliveryId = deliveryId;
    this.acknowledged = acknowledged;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static DeliveryAck fromJson(@Nullable Object value) {
    return Wire.required(DeliveryAck::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static DeliveryAck decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "DeliveryAck");
    return new DeliveryAck(
        Wire.field(object, "DeliveryAck", "deliveryId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "DeliveryAck", "acknowledged", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>deliveryId</code> field. */
  public String getDeliveryId() {
    return this.deliveryId;
  }

  /** The <code>acknowledged</code> field. */
  public Boolean getAcknowledged() {
    return this.acknowledged;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deliveryId", Wire.json(this.deliveryId));
    json.put("acknowledged", Wire.json(this.acknowledged));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof DeliveryAck)) {
      return false;
    }
    DeliveryAck that = (DeliveryAck) other;
    return Objects.equals(this.deliveryId, that.deliveryId)
        && Objects.equals(this.acknowledged, that.acknowledged);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deliveryId, this.acknowledged);
  }

  @Override
  public String toString() {
    return "DeliveryAck{deliveryId=" + this.deliveryId
        + ", acknowledged=" + this.acknowledged
        + "}";
  }
}
