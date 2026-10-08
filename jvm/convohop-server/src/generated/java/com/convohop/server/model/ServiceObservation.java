// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>ServiceObservation</code> result type. */
public final class ServiceObservation implements WireValue {
  private final String role;
  private final String observedAt;
  private final @Nullable ServiceDetails details;

  private ServiceObservation(
      String role,
      String observedAt,
      @Nullable ServiceDetails details) {
    this.role = role;
    this.observedAt = observedAt;
    this.details = details;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ServiceObservation fromJson(@Nullable Object value) {
    return Wire.required(ServiceObservation::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ServiceObservation decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "ServiceObservation");
    return new ServiceObservation(
        Wire.field(object, "ServiceObservation", "role", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ServiceObservation", "observedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "ServiceObservation", "details", depth, Wire.optional(ServiceDetails::decode)));
  }

  /** The <code>role</code> field. */
  public String getRole() {
    return this.role;
  }

  /** The <code>observedAt</code> field. */
  public String getObservedAt() {
    return this.observedAt;
  }

  /** The <code>details</code> field. */
  public @Nullable ServiceDetails getDetails() {
    return this.details;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("role", Wire.json(this.role));
    json.put("observedAt", Wire.json(this.observedAt));
    json.put("details", Wire.json(this.details));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ServiceObservation)) {
      return false;
    }
    ServiceObservation that = (ServiceObservation) other;
    return Objects.equals(this.role, that.role)
        && Objects.equals(this.observedAt, that.observedAt)
        && Objects.equals(this.details, that.details);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.role, this.observedAt, this.details);
  }

  @Override
  public String toString() {
    return "ServiceObservation{role=" + this.role
        + ", observedAt=" + this.observedAt
        + ", details=" + this.details
        + "}";
  }
}
