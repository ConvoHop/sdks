// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Limit</code> result type. */
public final class Limit implements WireValue {
  private final @Nullable String maximum;
  private final @Nullable String unit;
  private final @Nullable String scope;
  private final @Nullable String milliseconds;
  private final @Nullable String policyId;
  private final @Nullable String revision;

  private Limit(
      @Nullable String maximum,
      @Nullable String unit,
      @Nullable String scope,
      @Nullable String milliseconds,
      @Nullable String policyId,
      @Nullable String revision) {
    this.maximum = maximum;
    this.unit = unit;
    this.scope = scope;
    this.milliseconds = milliseconds;
    this.policyId = policyId;
    this.revision = revision;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Limit fromJson(@Nullable Object value) {
    return Wire.required(Limit::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Limit decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Limit");
    return new Limit(
        Wire.field(object, "Limit", "maximum", depth, Wire.optional(Scalars.DECIMAL)),
        Wire.field(object, "Limit", "unit", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "Limit", "scope", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "Limit", "milliseconds", depth, Wire.optional(Scalars.DECIMAL)),
        Wire.field(object, "Limit", "policyId", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "Limit", "revision", depth, Wire.optional(Scalars.DECIMAL)));
  }

  /** The <code>maximum</code> field. */
  public @Nullable String getMaximum() {
    return this.maximum;
  }

  /** The <code>unit</code> field. */
  public @Nullable String getUnit() {
    return this.unit;
  }

  /** The <code>scope</code> field. */
  public @Nullable String getScope() {
    return this.scope;
  }

  /** The <code>milliseconds</code> field. */
  public @Nullable String getMilliseconds() {
    return this.milliseconds;
  }

  /** The <code>policyId</code> field. */
  public @Nullable String getPolicyId() {
    return this.policyId;
  }

  /** The <code>revision</code> field. */
  public @Nullable String getRevision() {
    return this.revision;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("maximum", Wire.json(this.maximum));
    json.put("unit", Wire.json(this.unit));
    json.put("scope", Wire.json(this.scope));
    json.put("milliseconds", Wire.json(this.milliseconds));
    json.put("policyId", Wire.json(this.policyId));
    json.put("revision", Wire.json(this.revision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Limit)) {
      return false;
    }
    Limit that = (Limit) other;
    return Objects.equals(this.maximum, that.maximum)
        && Objects.equals(this.unit, that.unit)
        && Objects.equals(this.scope, that.scope)
        && Objects.equals(this.milliseconds, that.milliseconds)
        && Objects.equals(this.policyId, that.policyId)
        && Objects.equals(this.revision, that.revision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.maximum, this.unit, this.scope, this.milliseconds, this.policyId, this.revision);
  }

  @Override
  public String toString() {
    return "Limit{maximum=" + this.maximum
        + ", unit=" + this.unit
        + ", scope=" + this.scope
        + ", milliseconds=" + this.milliseconds
        + ", policyId=" + this.policyId
        + ", revision=" + this.revision
        + "}";
  }
}
