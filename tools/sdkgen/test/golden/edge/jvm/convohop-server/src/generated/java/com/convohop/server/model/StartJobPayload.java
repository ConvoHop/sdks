// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>StartJobPayload</code> result type. */
public final class StartJobPayload implements WireValue {
  private final String requestId;
  private final Receipt receipt;
  private final @Nullable JobRef job;

  private StartJobPayload(
      String requestId,
      Receipt receipt,
      @Nullable JobRef job) {
    this.requestId = requestId;
    this.receipt = receipt;
    this.job = job;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static StartJobPayload fromJson(@Nullable Object value) {
    return Wire.required(StartJobPayload::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static StartJobPayload decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "StartJobPayload");
    return new StartJobPayload(
        Wire.field(object, "StartJobPayload", "requestId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "StartJobPayload", "receipt", depth, Wire.required(Receipt::decode)),
        Wire.field(object, "StartJobPayload", "job", depth, Wire.optional(JobRef::decode)));
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>receipt</code> field. */
  public Receipt getReceipt() {
    return this.receipt;
  }

  /** The <code>job</code> field. */
  public @Nullable JobRef getJob() {
    return this.job;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("requestId", Wire.json(this.requestId));
    json.put("receipt", Wire.json(this.receipt));
    json.put("job", Wire.json(this.job));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof StartJobPayload)) {
      return false;
    }
    StartJobPayload that = (StartJobPayload) other;
    return Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.receipt, that.receipt)
        && Objects.equals(this.job, that.job);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.requestId, this.receipt, this.job);
  }

  @Override
  public String toString() {
    return "StartJobPayload{requestId=" + this.requestId
        + ", receipt=" + this.receipt
        + ", job=" + this.job
        + "}";
  }
}
