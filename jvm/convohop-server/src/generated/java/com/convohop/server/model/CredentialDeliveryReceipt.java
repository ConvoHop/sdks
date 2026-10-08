// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>CredentialDeliveryReceipt</code> result type. */
public final class CredentialDeliveryReceipt implements WireValue {
  private final String deliveryId;

  private CredentialDeliveryReceipt(
      String deliveryId) {
    this.deliveryId = deliveryId;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static CredentialDeliveryReceipt fromJson(@Nullable Object value) {
    return Wire.required(CredentialDeliveryReceipt::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static CredentialDeliveryReceipt decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "CredentialDeliveryReceipt");
    return new CredentialDeliveryReceipt(
        Wire.field(object, "CredentialDeliveryReceipt", "deliveryId", depth, Wire.required(Scalars.UUID)));
  }

  /** The <code>deliveryId</code> field. */
  public String getDeliveryId() {
    return this.deliveryId;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deliveryId", Wire.json(this.deliveryId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CredentialDeliveryReceipt)) {
      return false;
    }
    CredentialDeliveryReceipt that = (CredentialDeliveryReceipt) other;
    return Objects.equals(this.deliveryId, that.deliveryId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deliveryId);
  }

  @Override
  public String toString() {
    return "CredentialDeliveryReceipt{deliveryId=" + this.deliveryId
        + "}";
  }
}
