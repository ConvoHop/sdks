// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>CreateBillingCheckoutSessionRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class CreateBillingCheckoutSessionRequestInput implements WireValue {
  private final String orgId;
  private final String planId;

  private CreateBillingCheckoutSessionRequestInput(Builder builder) {
    this.orgId = Wire.present(builder.orgId, "CreateBillingCheckoutSessionRequestInput.orgId");
    this.planId = Wire.present(builder.planId, "CreateBillingCheckoutSessionRequestInput.planId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>orgId</code> field. */
  public String getOrgId() {
    return this.orgId;
  }

  /** The <code>planId</code> field. */
  public String getPlanId() {
    return this.planId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("orgId", Wire.json(this.orgId));
    json.put("planId", Wire.json(this.planId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CreateBillingCheckoutSessionRequestInput)) {
      return false;
    }
    CreateBillingCheckoutSessionRequestInput that = (CreateBillingCheckoutSessionRequestInput) other;
    return Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.planId, that.planId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.orgId, this.planId);
  }

  @Override
  public String toString() {
    return "CreateBillingCheckoutSessionRequestInput{orgId=" + this.orgId
        + ", planId=" + this.planId
        + "}";
  }

  /** Builds {@link CreateBillingCheckoutSessionRequestInput} values. */
  public static final class Builder {
    private @Nullable String orgId;
    private @Nullable String planId;

    private Builder() {}

    /**
     * Sets the <code>orgId</code> field.
     *
     * <p>Required.
     *
     * @param orgId the value
     * @return this builder
     */
    public Builder orgId(String orgId) {
      this.orgId = Wire.nonNull(orgId, "orgId");
      return this;
    }

    /**
     * Sets the <code>planId</code> field.
     *
     * <p>Required.
     *
     * @param planId the value
     * @return this builder
     */
    public Builder planId(String planId) {
      this.planId = Wire.nonNull(planId, "planId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public CreateBillingCheckoutSessionRequestInput build() {
      return new CreateBillingCheckoutSessionRequestInput(this);
    }
  }
}
