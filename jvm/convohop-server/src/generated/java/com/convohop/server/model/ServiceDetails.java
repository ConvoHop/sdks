// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>ServiceDetails</code> result type. */
public final class ServiceDetails implements WireValue {
  private final String status;

  private ServiceDetails(
      String status) {
    this.status = status;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ServiceDetails fromJson(@Nullable Object value) {
    return Wire.required(ServiceDetails::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ServiceDetails decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "ServiceDetails");
    return new ServiceDetails(
        Wire.field(object, "ServiceDetails", "status", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("status", Wire.json(this.status));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ServiceDetails)) {
      return false;
    }
    ServiceDetails that = (ServiceDetails) other;
    return Objects.equals(this.status, that.status);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.status);
  }

  @Override
  public String toString() {
    return "ServiceDetails{status=" + this.status
        + "}";
  }
}
