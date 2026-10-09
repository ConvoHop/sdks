// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>ApproveAgentSignupRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ApproveAgentSignupRequestInput implements WireValue {
  private final String approvalToken;
  private final String confirmationCode;
  private final String termsRef;
  private final String plan;
  private final List<String> scopes;
  private final String monthlySpendCap;
  private final @Nullable String agentPurchaseLimit;
  private final @Nullable String grantExpiresAt;

  private ApproveAgentSignupRequestInput(Builder builder) {
    this.approvalToken = Wire.present(builder.approvalToken, "ApproveAgentSignupRequestInput.approvalToken");
    this.confirmationCode = Wire.present(builder.confirmationCode, "ApproveAgentSignupRequestInput.confirmationCode");
    this.termsRef = Wire.present(builder.termsRef, "ApproveAgentSignupRequestInput.termsRef");
    this.plan = Wire.present(builder.plan, "ApproveAgentSignupRequestInput.plan");
    this.scopes = Wire.present(builder.scopes, "ApproveAgentSignupRequestInput.scopes");
    this.monthlySpendCap = Wire.present(builder.monthlySpendCap, "ApproveAgentSignupRequestInput.monthlySpendCap");
    this.agentPurchaseLimit = builder.agentPurchaseLimit;
    this.grantExpiresAt = builder.grantExpiresAt;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>approvalToken</code> field. */
  public String getApprovalToken() {
    return this.approvalToken;
  }

  /** The <code>confirmationCode</code> field. */
  public String getConfirmationCode() {
    return this.confirmationCode;
  }

  /** The <code>termsRef</code> field. */
  public String getTermsRef() {
    return this.termsRef;
  }

  /** The <code>plan</code> field. */
  public String getPlan() {
    return this.plan;
  }

  /** The <code>scopes</code> field. */
  public List<String> getScopes() {
    return this.scopes;
  }

  /** The <code>monthlySpendCap</code> field. */
  public String getMonthlySpendCap() {
    return this.monthlySpendCap;
  }

  /** The <code>agentPurchaseLimit</code> field. */
  public @Nullable String getAgentPurchaseLimit() {
    return this.agentPurchaseLimit;
  }

  /** The <code>grantExpiresAt</code> field. */
  public @Nullable String getGrantExpiresAt() {
    return this.grantExpiresAt;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("approvalToken", Wire.json(this.approvalToken));
    json.put("confirmationCode", Wire.json(this.confirmationCode));
    json.put("termsRef", Wire.json(this.termsRef));
    json.put("plan", Wire.json(this.plan));
    json.put("scopes", Wire.json(this.scopes));
    json.put("monthlySpendCap", Wire.json(this.monthlySpendCap));
    if (this.agentPurchaseLimit != null) {
      json.put("agentPurchaseLimit", Wire.json(this.agentPurchaseLimit));
    }
    if (this.grantExpiresAt != null) {
      json.put("grantExpiresAt", Wire.json(this.grantExpiresAt));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ApproveAgentSignupRequestInput)) {
      return false;
    }
    ApproveAgentSignupRequestInput that = (ApproveAgentSignupRequestInput) other;
    return Objects.equals(this.approvalToken, that.approvalToken)
        && Objects.equals(this.confirmationCode, that.confirmationCode)
        && Objects.equals(this.termsRef, that.termsRef)
        && Objects.equals(this.plan, that.plan)
        && Objects.equals(this.scopes, that.scopes)
        && Objects.equals(this.monthlySpendCap, that.monthlySpendCap)
        && Objects.equals(this.agentPurchaseLimit, that.agentPurchaseLimit)
        && Objects.equals(this.grantExpiresAt, that.grantExpiresAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.approvalToken, this.confirmationCode, this.termsRef, this.plan, this.scopes, this.monthlySpendCap, this.agentPurchaseLimit, this.grantExpiresAt);
  }

  @Override
  public String toString() {
    return "ApproveAgentSignupRequestInput{approvalToken=" + Wire.redacted(this.approvalToken)
        + ", confirmationCode=" + this.confirmationCode
        + ", termsRef=" + this.termsRef
        + ", plan=" + this.plan
        + ", scopes=" + this.scopes
        + ", monthlySpendCap=" + this.monthlySpendCap
        + ", agentPurchaseLimit=" + this.agentPurchaseLimit
        + ", grantExpiresAt=" + this.grantExpiresAt
        + "}";
  }

  /** Builds {@link ApproveAgentSignupRequestInput} values. */
  public static final class Builder {
    private @Nullable String approvalToken;
    private @Nullable String confirmationCode;
    private @Nullable String termsRef;
    private @Nullable String plan;
    private @Nullable List<String> scopes;
    private @Nullable String monthlySpendCap;
    private @Nullable String agentPurchaseLimit;
    private @Nullable String grantExpiresAt;

    private Builder() {}

    /**
     * Sets the <code>approvalToken</code> field.
     *
     * <p>Required.
     *
     * @param approvalToken the value
     * @return this builder
     */
    public Builder approvalToken(String approvalToken) {
      this.approvalToken = Wire.nonNull(approvalToken, "approvalToken");
      return this;
    }

    /**
     * Sets the <code>confirmationCode</code> field.
     *
     * <p>Required.
     *
     * @param confirmationCode the value
     * @return this builder
     */
    public Builder confirmationCode(String confirmationCode) {
      this.confirmationCode = Wire.nonNull(confirmationCode, "confirmationCode");
      return this;
    }

    /**
     * Sets the <code>termsRef</code> field.
     *
     * <p>Required.
     *
     * @param termsRef the value
     * @return this builder
     */
    public Builder termsRef(String termsRef) {
      this.termsRef = Wire.nonNull(termsRef, "termsRef");
      return this;
    }

    /**
     * Sets the <code>plan</code> field.
     *
     * <p>Required.
     *
     * @param plan the value
     * @return this builder
     */
    public Builder plan(String plan) {
      this.plan = Wire.nonNull(plan, "plan");
      return this;
    }

    /**
     * Sets the <code>scopes</code> field.
     *
     * <p>Required.
     *
     * @param scopes the value
     * @return this builder
     */
    public Builder scopes(List<String> scopes) {
      this.scopes = Wire.immutable(Wire.nonNull(scopes, "scopes"));
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
     * Sets the <code>grantExpiresAt</code> field.
     *
     * @param grantExpiresAt the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder grantExpiresAt(@Nullable String grantExpiresAt) {
      this.grantExpiresAt = grantExpiresAt;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ApproveAgentSignupRequestInput build() {
      return new ApproveAgentSignupRequestInput(this);
    }
  }
}
