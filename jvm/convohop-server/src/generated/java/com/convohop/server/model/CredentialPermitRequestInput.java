// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>CredentialPermitRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class CredentialPermitRequestInput implements WireValue {
  private final String projectId;
  private final String deliveryId;
  private final String redemptionRequestId;

  private CredentialPermitRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "CredentialPermitRequestInput.projectId");
    this.deliveryId = Wire.present(builder.deliveryId, "CredentialPermitRequestInput.deliveryId");
    this.redemptionRequestId = Wire.present(builder.redemptionRequestId, "CredentialPermitRequestInput.redemptionRequestId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>projectId</code> field. */
  public String getProjectId() {
    return this.projectId;
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
    json.put("projectId", Wire.json(this.projectId));
    json.put("deliveryId", Wire.json(this.deliveryId));
    json.put("redemptionRequestId", Wire.json(this.redemptionRequestId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CredentialPermitRequestInput)) {
      return false;
    }
    CredentialPermitRequestInput that = (CredentialPermitRequestInput) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.deliveryId, that.deliveryId)
        && Objects.equals(this.redemptionRequestId, that.redemptionRequestId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.deliveryId, this.redemptionRequestId);
  }

  @Override
  public String toString() {
    return "CredentialPermitRequestInput{projectId=" + this.projectId
        + ", deliveryId=" + this.deliveryId
        + ", redemptionRequestId=" + this.redemptionRequestId
        + "}";
  }

  /** Builds {@link CredentialPermitRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;
    private @Nullable String deliveryId;
    private @Nullable String redemptionRequestId;

    private Builder() {}

    /**
     * Sets the <code>projectId</code> field.
     *
     * <p>Required.
     *
     * @param projectId the value
     * @return this builder
     */
    public Builder projectId(String projectId) {
      this.projectId = Wire.nonNull(projectId, "projectId");
      return this;
    }

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
    public CredentialPermitRequestInput build() {
      return new CredentialPermitRequestInput(this);
    }
  }
}
