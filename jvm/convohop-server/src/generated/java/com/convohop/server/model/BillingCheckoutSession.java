// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>BillingCheckoutSession</code> result type. */
public final class BillingCheckoutSession implements WireValue {
  private final String orgId;
  private final String planId;
  private final String url;
  private final String expiresAt;

  private BillingCheckoutSession(
      String orgId,
      String planId,
      String url,
      String expiresAt) {
    this.orgId = orgId;
    this.planId = planId;
    this.url = url;
    this.expiresAt = expiresAt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static BillingCheckoutSession fromJson(@Nullable Object value) {
    return Wire.required(BillingCheckoutSession::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static BillingCheckoutSession decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "BillingCheckoutSession");
    return new BillingCheckoutSession(
        Wire.field(object, "BillingCheckoutSession", "orgId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "BillingCheckoutSession", "planId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "BillingCheckoutSession", "url", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "BillingCheckoutSession", "expiresAt", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>orgId</code> field. */
  public String getOrgId() {
    return this.orgId;
  }

  /** The <code>planId</code> field. */
  public String getPlanId() {
    return this.planId;
  }

  /** The <code>url</code> field. */
  public String getUrl() {
    return this.url;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("orgId", Wire.json(this.orgId));
    json.put("planId", Wire.json(this.planId));
    json.put("url", Wire.json(this.url));
    json.put("expiresAt", Wire.json(this.expiresAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof BillingCheckoutSession)) {
      return false;
    }
    BillingCheckoutSession that = (BillingCheckoutSession) other;
    return Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.planId, that.planId)
        && Objects.equals(this.url, that.url)
        && Objects.equals(this.expiresAt, that.expiresAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.orgId, this.planId, this.url, this.expiresAt);
  }

  @Override
  public String toString() {
    return "BillingCheckoutSession{orgId=" + this.orgId
        + ", planId=" + this.planId
        + ", url=" + this.url
        + ", expiresAt=" + this.expiresAt
        + "}";
  }
}
