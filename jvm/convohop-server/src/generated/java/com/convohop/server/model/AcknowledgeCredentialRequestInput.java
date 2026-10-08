// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>AcknowledgeCredentialRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class AcknowledgeCredentialRequestInput implements WireValue {
  private final String deliveryId;

  private AcknowledgeCredentialRequestInput(Builder builder) {
    this.deliveryId = Wire.present(builder.deliveryId, "AcknowledgeCredentialRequestInput.deliveryId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>deliveryId</code> field. */
  public String getDeliveryId() {
    return this.deliveryId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
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
    if (!(other instanceof AcknowledgeCredentialRequestInput)) {
      return false;
    }
    AcknowledgeCredentialRequestInput that = (AcknowledgeCredentialRequestInput) other;
    return Objects.equals(this.deliveryId, that.deliveryId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deliveryId);
  }

  @Override
  public String toString() {
    return "AcknowledgeCredentialRequestInput{deliveryId=" + this.deliveryId
        + "}";
  }

  /** Builds {@link AcknowledgeCredentialRequestInput} values. */
  public static final class Builder {
    private @Nullable String deliveryId;

    private Builder() {}

    /**
     * Sets the <code>deliveryId</code> field.
     *
     * <p>Required.
     *
     * @param deliveryId the value
     * @return this builder
     */
    public Builder deliveryId(String deliveryId) {
      this.deliveryId = Wire.nonNull(deliveryId, "deliveryId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public AcknowledgeCredentialRequestInput build() {
      return new AcknowledgeCredentialRequestInput(this);
    }
  }
}
