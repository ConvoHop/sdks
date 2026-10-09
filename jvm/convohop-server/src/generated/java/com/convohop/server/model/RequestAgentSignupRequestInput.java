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
 * The <code>RequestAgentSignupRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class RequestAgentSignupRequestInput implements WireValue {
  private final String ownerEmail;
  private final String pollChallenge;
  private final String organizationName;
  private final String agentName;
  private final @Nullable String purpose;
  private final @Nullable String suggestedPlan;
  private final List<String> suggestedScopes;
  private final @Nullable String suggestedMonthlySpendCap;

  private RequestAgentSignupRequestInput(Builder builder) {
    this.ownerEmail = Wire.present(builder.ownerEmail, "RequestAgentSignupRequestInput.ownerEmail");
    this.pollChallenge = Wire.present(builder.pollChallenge, "RequestAgentSignupRequestInput.pollChallenge");
    this.organizationName = Wire.present(builder.organizationName, "RequestAgentSignupRequestInput.organizationName");
    this.agentName = Wire.present(builder.agentName, "RequestAgentSignupRequestInput.agentName");
    this.purpose = builder.purpose;
    this.suggestedPlan = builder.suggestedPlan;
    this.suggestedScopes = Wire.present(builder.suggestedScopes, "RequestAgentSignupRequestInput.suggestedScopes");
    this.suggestedMonthlySpendCap = builder.suggestedMonthlySpendCap;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>ownerEmail</code> field. */
  public String getOwnerEmail() {
    return this.ownerEmail;
  }

  /** The <code>pollChallenge</code> field. */
  public String getPollChallenge() {
    return this.pollChallenge;
  }

  /** The <code>organizationName</code> field. */
  public String getOrganizationName() {
    return this.organizationName;
  }

  /** The <code>agentName</code> field. */
  public String getAgentName() {
    return this.agentName;
  }

  /** The <code>purpose</code> field. */
  public @Nullable String getPurpose() {
    return this.purpose;
  }

  /** The <code>suggestedPlan</code> field. */
  public @Nullable String getSuggestedPlan() {
    return this.suggestedPlan;
  }

  /** The <code>suggestedScopes</code> field. */
  public List<String> getSuggestedScopes() {
    return this.suggestedScopes;
  }

  /** The <code>suggestedMonthlySpendCap</code> field. */
  public @Nullable String getSuggestedMonthlySpendCap() {
    return this.suggestedMonthlySpendCap;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("ownerEmail", Wire.json(this.ownerEmail));
    json.put("pollChallenge", Wire.json(this.pollChallenge));
    json.put("organizationName", Wire.json(this.organizationName));
    json.put("agentName", Wire.json(this.agentName));
    if (this.purpose != null) {
      json.put("purpose", Wire.json(this.purpose));
    }
    if (this.suggestedPlan != null) {
      json.put("suggestedPlan", Wire.json(this.suggestedPlan));
    }
    json.put("suggestedScopes", Wire.json(this.suggestedScopes));
    if (this.suggestedMonthlySpendCap != null) {
      json.put("suggestedMonthlySpendCap", Wire.json(this.suggestedMonthlySpendCap));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RequestAgentSignupRequestInput)) {
      return false;
    }
    RequestAgentSignupRequestInput that = (RequestAgentSignupRequestInput) other;
    return Objects.equals(this.ownerEmail, that.ownerEmail)
        && Objects.equals(this.pollChallenge, that.pollChallenge)
        && Objects.equals(this.organizationName, that.organizationName)
        && Objects.equals(this.agentName, that.agentName)
        && Objects.equals(this.purpose, that.purpose)
        && Objects.equals(this.suggestedPlan, that.suggestedPlan)
        && Objects.equals(this.suggestedScopes, that.suggestedScopes)
        && Objects.equals(this.suggestedMonthlySpendCap, that.suggestedMonthlySpendCap);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.ownerEmail, this.pollChallenge, this.organizationName, this.agentName, this.purpose, this.suggestedPlan, this.suggestedScopes, this.suggestedMonthlySpendCap);
  }

  @Override
  public String toString() {
    return "RequestAgentSignupRequestInput{ownerEmail=" + this.ownerEmail
        + ", pollChallenge=" + this.pollChallenge
        + ", organizationName=" + this.organizationName
        + ", agentName=" + this.agentName
        + ", purpose=" + this.purpose
        + ", suggestedPlan=" + this.suggestedPlan
        + ", suggestedScopes=" + this.suggestedScopes
        + ", suggestedMonthlySpendCap=" + this.suggestedMonthlySpendCap
        + "}";
  }

  /** Builds {@link RequestAgentSignupRequestInput} values. */
  public static final class Builder {
    private @Nullable String ownerEmail;
    private @Nullable String pollChallenge;
    private @Nullable String organizationName;
    private @Nullable String agentName;
    private @Nullable String purpose;
    private @Nullable String suggestedPlan;
    private @Nullable List<String> suggestedScopes;
    private @Nullable String suggestedMonthlySpendCap;

    private Builder() {}

    /**
     * Sets the <code>ownerEmail</code> field.
     *
     * <p>Required.
     *
     * @param ownerEmail the value
     * @return this builder
     */
    public Builder ownerEmail(String ownerEmail) {
      this.ownerEmail = Wire.nonNull(ownerEmail, "ownerEmail");
      return this;
    }

    /**
     * Sets the <code>pollChallenge</code> field.
     *
     * <p>Required.
     *
     * @param pollChallenge the value
     * @return this builder
     */
    public Builder pollChallenge(String pollChallenge) {
      this.pollChallenge = Wire.nonNull(pollChallenge, "pollChallenge");
      return this;
    }

    /**
     * Sets the <code>organizationName</code> field.
     *
     * <p>Required.
     *
     * @param organizationName the value
     * @return this builder
     */
    public Builder organizationName(String organizationName) {
      this.organizationName = Wire.nonNull(organizationName, "organizationName");
      return this;
    }

    /**
     * Sets the <code>agentName</code> field.
     *
     * <p>Required.
     *
     * @param agentName the value
     * @return this builder
     */
    public Builder agentName(String agentName) {
      this.agentName = Wire.nonNull(agentName, "agentName");
      return this;
    }

    /**
     * Sets the <code>purpose</code> field.
     *
     * @param purpose the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder purpose(@Nullable String purpose) {
      this.purpose = purpose;
      return this;
    }

    /**
     * Sets the <code>suggestedPlan</code> field.
     *
     * @param suggestedPlan the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder suggestedPlan(@Nullable String suggestedPlan) {
      this.suggestedPlan = suggestedPlan;
      return this;
    }

    /**
     * Sets the <code>suggestedScopes</code> field.
     *
     * <p>Required.
     *
     * @param suggestedScopes the value
     * @return this builder
     */
    public Builder suggestedScopes(List<String> suggestedScopes) {
      this.suggestedScopes = Wire.immutable(Wire.nonNull(suggestedScopes, "suggestedScopes"));
      return this;
    }

    /**
     * Sets the <code>suggestedMonthlySpendCap</code> field.
     *
     * @param suggestedMonthlySpendCap the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder suggestedMonthlySpendCap(@Nullable String suggestedMonthlySpendCap) {
      this.suggestedMonthlySpendCap = suggestedMonthlySpendCap;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public RequestAgentSignupRequestInput build() {
      return new RequestAgentSignupRequestInput(this);
    }
  }
}
