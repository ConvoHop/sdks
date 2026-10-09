// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>SetSpendControlsRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class SetSpendControlsRequestInput implements WireValue {
  private final String orgId;
  private final String monthlySpendCap;
  private final @Nullable String agentPurchaseLimit;

  private SetSpendControlsRequestInput(Builder builder) {
    this.orgId = Wire.present(builder.orgId, "SetSpendControlsRequestInput.orgId");
    this.monthlySpendCap = Wire.present(builder.monthlySpendCap, "SetSpendControlsRequestInput.monthlySpendCap");
    this.agentPurchaseLimit = builder.agentPurchaseLimit;
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

  /** The <code>monthlySpendCap</code> field. */
  public String getMonthlySpendCap() {
    return this.monthlySpendCap;
  }

  /** The <code>agentPurchaseLimit</code> field. */
  public @Nullable String getAgentPurchaseLimit() {
    return this.agentPurchaseLimit;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("orgId", Wire.json(this.orgId));
    json.put("monthlySpendCap", Wire.json(this.monthlySpendCap));
    if (this.agentPurchaseLimit != null) {
      json.put("agentPurchaseLimit", Wire.json(this.agentPurchaseLimit));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SetSpendControlsRequestInput)) {
      return false;
    }
    SetSpendControlsRequestInput that = (SetSpendControlsRequestInput) other;
    return Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.monthlySpendCap, that.monthlySpendCap)
        && Objects.equals(this.agentPurchaseLimit, that.agentPurchaseLimit);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.orgId, this.monthlySpendCap, this.agentPurchaseLimit);
  }

  @Override
  public String toString() {
    return "SetSpendControlsRequestInput{orgId=" + this.orgId
        + ", monthlySpendCap=" + this.monthlySpendCap
        + ", agentPurchaseLimit=" + this.agentPurchaseLimit
        + "}";
  }

  /** Builds {@link SetSpendControlsRequestInput} values. */
  public static final class Builder {
    private @Nullable String orgId;
    private @Nullable String monthlySpendCap;
    private @Nullable String agentPurchaseLimit;

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
     * Sets the <code>monthlySpendCap</code> field.
     *
     * <p>Required.
     *
     * @param monthlySpendCap the value
     * @return this builder
     */
    public Builder monthlySpendCap(String monthlySpendCap) {
      this.monthlySpendCap = Wire.nonNull(monthlySpendCap, "monthlySpendCap");
      return this;
    }

    /**
     * Sets the <code>agentPurchaseLimit</code> field.
     *
     * @param agentPurchaseLimit the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder agentPurchaseLimit(@Nullable String agentPurchaseLimit) {
      this.agentPurchaseLimit = agentPurchaseLimit;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public SetSpendControlsRequestInput build() {
      return new SetSpendControlsRequestInput(this);
    }
  }
}
