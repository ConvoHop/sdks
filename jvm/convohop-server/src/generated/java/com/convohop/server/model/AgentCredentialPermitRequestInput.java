// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>AgentCredentialPermitRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class AgentCredentialPermitRequestInput implements WireValue {
  private final String deliveryId;
  private final String redemptionRequestId;

  private AgentCredentialPermitRequestInput(Builder builder) {
    this.deliveryId = Wire.present(builder.deliveryId, "AgentCredentialPermitRequestInput.deliveryId");
    this.redemptionRequestId = Wire.present(builder.redemptionRequestId, "AgentCredentialPermitRequestInput.redemptionRequestId");
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

  /** The <code>redemptionRequestId</code> field. */
  public String getRedemptionRequestId() {
    return this.redemptionRequestId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deliveryId", Wire.json(this.deliveryId));
    json.put("redemptionRequestId", Wire.json(this.redemptionRequestId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentCredentialPermitRequestInput)) {
      return false;
    }
    AgentCredentialPermitRequestInput that = (AgentCredentialPermitRequestInput) other;
    return Objects.equals(this.deliveryId, that.deliveryId)
        && Objects.equals(this.redemptionRequestId, that.redemptionRequestId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deliveryId, this.redemptionRequestId);
  }

  @Override
  public String toString() {
    return "AgentCredentialPermitRequestInput{deliveryId=" + this.deliveryId
        + ", redemptionRequestId=" + this.redemptionRequestId
        + "}";
  }

  /** Builds {@link AgentCredentialPermitRequestInput} values. */
  public static final class Builder {
    private @Nullable String deliveryId;
    private @Nullable String redemptionRequestId;

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
     * Sets the <code>redemptionRequestId</code> field.
     *
     * <p>Required.
     *
     * @param redemptionRequestId the value
     * @return this builder
     */
    public Builder redemptionRequestId(String redemptionRequestId) {
      this.redemptionRequestId = Wire.nonNull(redemptionRequestId, "redemptionRequestId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public AgentCredentialPermitRequestInput build() {
      return new AgentCredentialPermitRequestInput(this);
    }
  }
}
