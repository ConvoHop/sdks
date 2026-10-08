// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>RequestResolution</code> result type. */
public final class RequestResolution implements WireValue {
  private final String state;
  private final String requestId;
  private final String checkedAt;
  private final Boolean resultWithheld;
  private final @Nullable ResolvedReceipt receipt;

  private RequestResolution(
      String state,
      String requestId,
      String checkedAt,
      Boolean resultWithheld,
      @Nullable ResolvedReceipt receipt) {
    this.state = state;
    this.requestId = requestId;
    this.checkedAt = checkedAt;
    this.resultWithheld = resultWithheld;
    this.receipt = receipt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static RequestResolution fromJson(@Nullable Object value) {
    return Wire.required(RequestResolution::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static RequestResolution decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "RequestResolution");
    return new RequestResolution(
        Wire.field(object, "RequestResolution", "state", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "RequestResolution", "requestId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "RequestResolution", "checkedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "RequestResolution", "resultWithheld", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "RequestResolution", "receipt", depth, Wire.optional(ResolvedReceipt::decode)));
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>checkedAt</code> field. */
  public String getCheckedAt() {
    return this.checkedAt;
  }

  /** The <code>resultWithheld</code> field. */
  public Boolean getResultWithheld() {
    return this.resultWithheld;
  }

  /** The <code>receipt</code> field. */
  public @Nullable ResolvedReceipt getReceipt() {
    return this.receipt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("state", Wire.json(this.state));
    json.put("requestId", Wire.json(this.requestId));
    json.put("checkedAt", Wire.json(this.checkedAt));
    json.put("resultWithheld", Wire.json(this.resultWithheld));
    json.put("receipt", Wire.json(this.receipt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RequestResolution)) {
      return false;
    }
    RequestResolution that = (RequestResolution) other;
    return Objects.equals(this.state, that.state)
        && Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.checkedAt, that.checkedAt)
        && Objects.equals(this.resultWithheld, that.resultWithheld)
        && Objects.equals(this.receipt, that.receipt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.state, this.requestId, this.checkedAt, this.resultWithheld, this.receipt);
  }

  @Override
  public String toString() {
    return "RequestResolution{state=" + this.state
        + ", requestId=" + this.requestId
        + ", checkedAt=" + this.checkedAt
        + ", resultWithheld=" + this.resultWithheld
        + ", receipt=" + this.receipt
        + "}";
  }
}
