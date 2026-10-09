// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>OrganizationSpend</code> result type. */
public final class OrganizationSpend implements WireValue {
  private final String orgId;
  private final String planId;
  private final String currency;
  private final String catalogVersion;
  private final @Nullable String monthlySpendCap;
  private final @Nullable String agentPurchaseLimit;
  private final @Nullable String updatedAt;
  private final @Nullable String monthlyMinimum;
  private final @Nullable String periodStart;
  private final @Nullable String periodEnd;
  private final @Nullable String credits;
  private final @Nullable String charges;
  private final @Nullable String margin;
  private final @Nullable String stop;
  private final List<String> refusedMeters;
  private final @Nullable String evaluatedAt;
  private final @Nullable String usageThrough;
  private final @Nullable String validUntil;
  private final @Nullable String minimumCredit;
  private final @Nullable String chargeLimit;

  private OrganizationSpend(
      String orgId,
      String planId,
      String currency,
      String catalogVersion,
      @Nullable String monthlySpendCap,
      @Nullable String agentPurchaseLimit,
      @Nullable String updatedAt,
      @Nullable String monthlyMinimum,
      @Nullable String periodStart,
      @Nullable String periodEnd,
      @Nullable String credits,
      @Nullable String charges,
      @Nullable String margin,
      @Nullable String stop,
      List<String> refusedMeters,
      @Nullable String evaluatedAt,
      @Nullable String usageThrough,
      @Nullable String validUntil,
      @Nullable String minimumCredit,
      @Nullable String chargeLimit) {
    this.orgId = orgId;
    this.planId = planId;
    this.currency = currency;
    this.catalogVersion = catalogVersion;
    this.monthlySpendCap = monthlySpendCap;
    this.agentPurchaseLimit = agentPurchaseLimit;
    this.updatedAt = updatedAt;
    this.monthlyMinimum = monthlyMinimum;
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
    this.credits = credits;
    this.charges = charges;
    this.margin = margin;
    this.stop = stop;
    this.refusedMeters = refusedMeters;
    this.evaluatedAt = evaluatedAt;
    this.usageThrough = usageThrough;
    this.validUntil = validUntil;
    this.minimumCredit = minimumCredit;
    this.chargeLimit = chargeLimit;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static OrganizationSpend fromJson(@Nullable Object value) {
    return Wire.required(OrganizationSpend::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static OrganizationSpend decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "OrganizationSpend");
    return new OrganizationSpend(
        Wire.field(object, "OrganizationSpend", "orgId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "OrganizationSpend", "planId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "currency", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "catalogVersion", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "monthlySpendCap", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "agentPurchaseLimit", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "updatedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "monthlyMinimum", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "periodStart", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "periodEnd", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "credits", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "charges", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "margin", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "stop", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "refusedMeters", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "OrganizationSpend", "evaluatedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "usageThrough", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "validUntil", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "minimumCredit", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OrganizationSpend", "chargeLimit", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>orgId</code> field. */
  public String getOrgId() {
    return this.orgId;
  }

  /** The <code>planId</code> field. */
  public String getPlanId() {
    return this.planId;
  }

  /** The <code>currency</code> field. */
  public String getCurrency() {
    return this.currency;
  }

  /** The <code>catalogVersion</code> field. */
  public String getCatalogVersion() {
    return this.catalogVersion;
  }

  /** The <code>monthlySpendCap</code> field. */
  public @Nullable String getMonthlySpendCap() {
    return this.monthlySpendCap;
  }

  /** The <code>agentPurchaseLimit</code> field. */
  public @Nullable String getAgentPurchaseLimit() {
    return this.agentPurchaseLimit;
  }

  /** The <code>updatedAt</code> field. */
  public @Nullable String getUpdatedAt() {
    return this.updatedAt;
  }

  /** The <code>monthlyMinimum</code> field. */
  public @Nullable String getMonthlyMinimum() {
    return this.monthlyMinimum;
  }

  /** The <code>periodStart</code> field. */
  public @Nullable String getPeriodStart() {
    return this.periodStart;
  }

  /** The <code>periodEnd</code> field. */
  public @Nullable String getPeriodEnd() {
    return this.periodEnd;
  }

  /** The <code>credits</code> field. */
  public @Nullable String getCredits() {
    return this.credits;
  }

  /** The <code>charges</code> field. */
  public @Nullable String getCharges() {
    return this.charges;
  }

  /** The <code>margin</code> field. */
  public @Nullable String getMargin() {
    return this.margin;
  }

  /** The <code>stop</code> field. */
  public @Nullable String getStop() {
    return this.stop;
  }

  /** The <code>refusedMeters</code> field. */
  public List<String> getRefusedMeters() {
    return this.refusedMeters;
  }

  /** The <code>evaluatedAt</code> field. */
  public @Nullable String getEvaluatedAt() {
    return this.evaluatedAt;
  }

  /** The <code>usageThrough</code> field. */
  public @Nullable String getUsageThrough() {
    return this.usageThrough;
  }

  /** The <code>validUntil</code> field. */
  public @Nullable String getValidUntil() {
    return this.validUntil;
  }

  /** The <code>minimumCredit</code> field. */
  public @Nullable String getMinimumCredit() {
    return this.minimumCredit;
  }

  /** The <code>chargeLimit</code> field. */
  public @Nullable String getChargeLimit() {
    return this.chargeLimit;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("orgId", Wire.json(this.orgId));
    json.put("planId", Wire.json(this.planId));
    json.put("currency", Wire.json(this.currency));
    json.put("catalogVersion", Wire.json(this.catalogVersion));
    json.put("monthlySpendCap", Wire.json(this.monthlySpendCap));
    json.put("agentPurchaseLimit", Wire.json(this.agentPurchaseLimit));
    json.put("updatedAt", Wire.json(this.updatedAt));
    json.put("monthlyMinimum", Wire.json(this.monthlyMinimum));
    json.put("periodStart", Wire.json(this.periodStart));
    json.put("periodEnd", Wire.json(this.periodEnd));
    json.put("credits", Wire.json(this.credits));
    json.put("charges", Wire.json(this.charges));
    json.put("margin", Wire.json(this.margin));
    json.put("stop", Wire.json(this.stop));
    json.put("refusedMeters", Wire.json(this.refusedMeters));
    json.put("evaluatedAt", Wire.json(this.evaluatedAt));
    json.put("usageThrough", Wire.json(this.usageThrough));
    json.put("validUntil", Wire.json(this.validUntil));
    json.put("minimumCredit", Wire.json(this.minimumCredit));
    json.put("chargeLimit", Wire.json(this.chargeLimit));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof OrganizationSpend)) {
      return false;
    }
    OrganizationSpend that = (OrganizationSpend) other;
    return Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.planId, that.planId)
        && Objects.equals(this.currency, that.currency)
        && Objects.equals(this.catalogVersion, that.catalogVersion)
        && Objects.equals(this.monthlySpendCap, that.monthlySpendCap)
        && Objects.equals(this.agentPurchaseLimit, that.agentPurchaseLimit)
        && Objects.equals(this.updatedAt, that.updatedAt)
        && Objects.equals(this.monthlyMinimum, that.monthlyMinimum)
        && Objects.equals(this.periodStart, that.periodStart)
        && Objects.equals(this.periodEnd, that.periodEnd)
        && Objects.equals(this.credits, that.credits)
        && Objects.equals(this.charges, that.charges)
        && Objects.equals(this.margin, that.margin)
        && Objects.equals(this.stop, that.stop)
        && Objects.equals(this.refusedMeters, that.refusedMeters)
        && Objects.equals(this.evaluatedAt, that.evaluatedAt)
        && Objects.equals(this.usageThrough, that.usageThrough)
        && Objects.equals(this.validUntil, that.validUntil)
        && Objects.equals(this.minimumCredit, that.minimumCredit)
        && Objects.equals(this.chargeLimit, that.chargeLimit);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.orgId, this.planId, this.currency, this.catalogVersion, this.monthlySpendCap, this.agentPurchaseLimit, this.updatedAt, this.monthlyMinimum, this.periodStart, this.periodEnd, this.credits, this.charges, this.margin, this.stop, this.refusedMeters, this.evaluatedAt, this.usageThrough, this.validUntil, this.minimumCredit, this.chargeLimit);
  }

  @Override
  public String toString() {
    return "OrganizationSpend{orgId=" + this.orgId
        + ", planId=" + this.planId
        + ", currency=" + this.currency
        + ", catalogVersion=" + this.catalogVersion
        + ", monthlySpendCap=" + this.monthlySpendCap
        + ", agentPurchaseLimit=" + this.agentPurchaseLimit
        + ", updatedAt=" + this.updatedAt
        + ", monthlyMinimum=" + this.monthlyMinimum
        + ", periodStart=" + this.periodStart
        + ", periodEnd=" + this.periodEnd
        + ", credits=" + this.credits
        + ", charges=" + this.charges
        + ", margin=" + this.margin
        + ", stop=" + this.stop
        + ", refusedMeters=" + this.refusedMeters
        + ", evaluatedAt=" + this.evaluatedAt
        + ", usageThrough=" + this.usageThrough
        + ", validUntil=" + this.validUntil
        + ", minimumCredit=" + this.minimumCredit
        + ", chargeLimit=" + this.chargeLimit
        + "}";
  }
}
