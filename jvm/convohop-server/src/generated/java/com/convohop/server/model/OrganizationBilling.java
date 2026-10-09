// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>OrganizationBilling</code> result type. */
public final class OrganizationBilling implements WireValue {
  private final String orgId;
  private final @Nullable String planId;
  private final @Nullable String standing;
  private final @Nullable String graceUntil;
  private final @Nullable String subscriptionStatus;
  private final @Nullable String currentPeriodEnd;
  private final Boolean cancelAtPeriodEnd;
  private final String catalogVersion;
  private final Boolean configured;
  private final Boolean billed;

  private OrganizationBilling(
      String orgId,
      @Nullable String planId,
      @Nullable String standing,
      @Nullable String graceUntil,
      @Nullable String subscriptionStatus,
      @Nullable String currentPeriodEnd,
      Boolean cancelAtPeriodEnd,
      String catalogVersion,
      Boolean configured,
      Boolean billed) {
    this.orgId = orgId;
    this.planId = planId;
    this.standing = standing;
    this.graceUntil = graceUntil;
    this.subscriptionStatus = subscriptionStatus;
    this.currentPeriodEnd = currentPeriodEnd;
    this.cancelAtPeriodEnd = cancelAtPeriodEnd;
    this.catalogVersion = catalogVersion;
    this.configured = configured;
    this.billed = billed;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static OrganizationBilling fromJson(@Nullable Object value) {
    return Wire.required(OrganizationBilling::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static OrganizationBilling decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "OrganizationBilling");
    return new OrganizationBilling(
        Wire.field(object, "OrganizationBilling", "orgId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "OrganizationBilling", "planId", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationBilling", "standing", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationBilling", "graceUntil", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationBilling", "subscriptionStatus", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationBilling", "currentPeriodEnd", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationBilling", "cancelAtPeriodEnd", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "OrganizationBilling", "catalogVersion", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "OrganizationBilling", "configured", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "OrganizationBilling", "billed", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>orgId</code> field. */
  public String getOrgId() {
    return this.orgId;
  }

  /** The <code>planId</code> field. */
  public @Nullable String getPlanId() {
    return this.planId;
  }

  /** The <code>standing</code> field. */
  public @Nullable String getStanding() {
    return this.standing;
  }

  /** The <code>graceUntil</code> field. */
  public @Nullable String getGraceUntil() {
    return this.graceUntil;
  }

  /** The <code>subscriptionStatus</code> field. */
  public @Nullable String getSubscriptionStatus() {
    return this.subscriptionStatus;
  }

  /** The <code>currentPeriodEnd</code> field. */
  public @Nullable String getCurrentPeriodEnd() {
    return this.currentPeriodEnd;
  }

  /** The <code>cancelAtPeriodEnd</code> field. */
  public Boolean getCancelAtPeriodEnd() {
    return this.cancelAtPeriodEnd;
  }

  /** The <code>catalogVersion</code> field. */
  public String getCatalogVersion() {
    return this.catalogVersion;
  }

  /** The <code>configured</code> field. */
  public Boolean getConfigured() {
    return this.configured;
  }

  /** The <code>billed</code> field. */
  public Boolean getBilled() {
    return this.billed;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("orgId", Wire.json(this.orgId));
    json.put("planId", Wire.json(this.planId));
    json.put("standing", Wire.json(this.standing));
    json.put("graceUntil", Wire.json(this.graceUntil));
    json.put("subscriptionStatus", Wire.json(this.subscriptionStatus));
    json.put("currentPeriodEnd", Wire.json(this.currentPeriodEnd));
    json.put("cancelAtPeriodEnd", Wire.json(this.cancelAtPeriodEnd));
    json.put("catalogVersion", Wire.json(this.catalogVersion));
    json.put("configured", Wire.json(this.configured));
    json.put("billed", Wire.json(this.billed));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof OrganizationBilling)) {
      return false;
    }
    OrganizationBilling that = (OrganizationBilling) other;
    return Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.planId, that.planId)
        && Objects.equals(this.standing, that.standing)
        && Objects.equals(this.graceUntil, that.graceUntil)
        && Objects.equals(this.subscriptionStatus, that.subscriptionStatus)
        && Objects.equals(this.currentPeriodEnd, that.currentPeriodEnd)
        && Objects.equals(this.cancelAtPeriodEnd, that.cancelAtPeriodEnd)
        && Objects.equals(this.catalogVersion, that.catalogVersion)
        && Objects.equals(this.configured, that.configured)
        && Objects.equals(this.billed, that.billed);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.orgId, this.planId, this.standing, this.graceUntil, this.subscriptionStatus, this.currentPeriodEnd, this.cancelAtPeriodEnd, this.catalogVersion, this.configured, this.billed);
  }

  @Override
  public String toString() {
    return "OrganizationBilling{orgId=" + this.orgId
        + ", planId=" + this.planId
        + ", standing=" + this.standing
        + ", graceUntil=" + this.graceUntil
        + ", subscriptionStatus=" + this.subscriptionStatus
        + ", currentPeriodEnd=" + this.currentPeriodEnd
        + ", cancelAtPeriodEnd=" + this.cancelAtPeriodEnd
        + ", catalogVersion=" + this.catalogVersion
        + ", configured=" + this.configured
        + ", billed=" + this.billed
        + "}";
  }
}
