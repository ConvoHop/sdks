// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>UsageMeter</code> result type. */
public final class UsageMeter implements WireValue {
  private final String meter;
  private final String unit;
  private final String quantity;
  private final Boolean emitted;

  private UsageMeter(
      String meter,
      String unit,
      String quantity,
      Boolean emitted) {
    this.meter = meter;
    this.unit = unit;
    this.quantity = quantity;
    this.emitted = emitted;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static UsageMeter fromJson(@Nullable Object value) {
    return Wire.required(UsageMeter::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static UsageMeter decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "UsageMeter");
    return new UsageMeter(
        Wire.field(object, "UsageMeter", "meter", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "UsageMeter", "unit", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "UsageMeter", "quantity", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "UsageMeter", "emitted", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>meter</code> field. */
  public String getMeter() {
    return this.meter;
  }

  /** The <code>unit</code> field. */
  public String getUnit() {
    return this.unit;
  }

  /** The <code>quantity</code> field. */
  public String getQuantity() {
    return this.quantity;
  }

  /** The <code>emitted</code> field. */
  public Boolean getEmitted() {
    return this.emitted;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("meter", Wire.json(this.meter));
    json.put("unit", Wire.json(this.unit));
    json.put("quantity", Wire.json(this.quantity));
    json.put("emitted", Wire.json(this.emitted));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof UsageMeter)) {
      return false;
    }
    UsageMeter that = (UsageMeter) other;
    return Objects.equals(this.meter, that.meter)
        && Objects.equals(this.unit, that.unit)
        && Objects.equals(this.quantity, that.quantity)
        && Objects.equals(this.emitted, that.emitted);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.meter, this.unit, this.quantity, this.emitted);
  }

  @Override
  public String toString() {
    return "UsageMeter{meter=" + this.meter
        + ", unit=" + this.unit
        + ", quantity=" + this.quantity
        + ", emitted=" + this.emitted
        + "}";
  }
}
