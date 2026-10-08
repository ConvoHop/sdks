// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Receipt</code> result type. */
public final class Receipt implements WireValue {
  private final String requestId;
  private final Boolean committed;
  private final @Nullable String sequence;

  private Receipt(
      String requestId,
      Boolean committed,
      @Nullable String sequence) {
    this.requestId = requestId;
    this.committed = committed;
    this.sequence = sequence;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Receipt fromJson(@Nullable Object value) {
    return Wire.required(Receipt::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Receipt decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Receipt");
    return new Receipt(
        Wire.field(object, "Receipt", "requestId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Receipt", "committed", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Receipt", "sequence", depth, Wire.optional(Scalars.COUNTER)));
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>committed</code> field. */
  public Boolean getCommitted() {
    return this.committed;
  }

  /** The <code>sequence</code> field. */
  public @Nullable String getSequence() {
    return this.sequence;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("requestId", Wire.json(this.requestId));
    json.put("committed", Wire.json(this.committed));
    json.put("sequence", Wire.json(this.sequence));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Receipt)) {
      return false;
    }
    Receipt that = (Receipt) other;
    return Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.committed, that.committed)
        && Objects.equals(this.sequence, that.sequence);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.requestId, this.committed, this.sequence);
  }

  @Override
  public String toString() {
    return "Receipt{requestId=" + this.requestId
        + ", committed=" + this.committed
        + ", sequence=" + this.sequence
        + "}";
  }
}
