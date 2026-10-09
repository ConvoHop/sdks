// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>AgentSignupReview</code> result type. */
public final class AgentSignupReview implements WireValue {
  private final String signupId;
  private final String ownerEmail;
  private final String organizationName;
  private final String agentName;
  private final @Nullable String purpose;
  private final @Nullable String suggestedPlan;
  private final List<String> suggestedScopes;
  private final @Nullable String suggestedMonthlySpendCap;
  private final String currency;
  private final String expiresAt;

  private AgentSignupReview(
      String signupId,
      String ownerEmail,
      String organizationName,
      String agentName,
      @Nullable String purpose,
      @Nullable String suggestedPlan,
      List<String> suggestedScopes,
      @Nullable String suggestedMonthlySpendCap,
      String currency,
      String expiresAt) {
    this.signupId = signupId;
    this.ownerEmail = ownerEmail;
    this.organizationName = organizationName;
    this.agentName = agentName;
    this.purpose = purpose;
    this.suggestedPlan = suggestedPlan;
    this.suggestedScopes = suggestedScopes;
    this.suggestedMonthlySpendCap = suggestedMonthlySpendCap;
    this.currency = currency;
    this.expiresAt = expiresAt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static AgentSignupReview fromJson(@Nullable Object value) {
    return Wire.required(AgentSignupReview::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static AgentSignupReview decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "AgentSignupReview");
    return new AgentSignupReview(
        Wire.field(object, "AgentSignupReview", "signupId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentSignupReview", "ownerEmail", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentSignupReview", "organizationName", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentSignupReview", "agentName", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentSignupReview", "purpose", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "AgentSignupReview", "suggestedPlan", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "AgentSignupReview", "suggestedScopes", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "AgentSignupReview", "suggestedMonthlySpendCap", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "AgentSignupReview", "currency", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentSignupReview", "expiresAt", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>signupId</code> field. */
  public String getSignupId() {
    return this.signupId;
  }

  /** The <code>ownerEmail</code> field. */
  public String getOwnerEmail() {
    return this.ownerEmail;
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

  /** The <code>currency</code> field. */
  public String getCurrency() {
    return this.currency;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("signupId", Wire.json(this.signupId));
    json.put("ownerEmail", Wire.json(this.ownerEmail));
    json.put("organizationName", Wire.json(this.organizationName));
    json.put("agentName", Wire.json(this.agentName));
    json.put("purpose", Wire.json(this.purpose));
    json.put("suggestedPlan", Wire.json(this.suggestedPlan));
    json.put("suggestedScopes", Wire.json(this.suggestedScopes));
    json.put("suggestedMonthlySpendCap", Wire.json(this.suggestedMonthlySpendCap));
    json.put("currency", Wire.json(this.currency));
    json.put("expiresAt", Wire.json(this.expiresAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentSignupReview)) {
      return false;
    }
    AgentSignupReview that = (AgentSignupReview) other;
    return Objects.equals(this.signupId, that.signupId)
        && Objects.equals(this.ownerEmail, that.ownerEmail)
        && Objects.equals(this.organizationName, that.organizationName)
        && Objects.equals(this.agentName, that.agentName)
        && Objects.equals(this.purpose, that.purpose)
        && Objects.equals(this.suggestedPlan, that.suggestedPlan)
        && Objects.equals(this.suggestedScopes, that.suggestedScopes)
        && Objects.equals(this.suggestedMonthlySpendCap, that.suggestedMonthlySpendCap)
        && Objects.equals(this.currency, that.currency)
        && Objects.equals(this.expiresAt, that.expiresAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.signupId, this.ownerEmail, this.organizationName, this.agentName, this.purpose, this.suggestedPlan, this.suggestedScopes, this.suggestedMonthlySpendCap, this.currency, this.expiresAt);
  }

  @Override
  public String toString() {
    return "AgentSignupReview{signupId=" + this.signupId
        + ", ownerEmail=" + this.ownerEmail
        + ", organizationName=" + this.organizationName
        + ", agentName=" + this.agentName
        + ", purpose=" + this.purpose
        + ", suggestedPlan=" + this.suggestedPlan
        + ", suggestedScopes=" + this.suggestedScopes
        + ", suggestedMonthlySpendCap=" + this.suggestedMonthlySpendCap
        + ", currency=" + this.currency
        + ", expiresAt=" + this.expiresAt
        + "}";
  }
}
