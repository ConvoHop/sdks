// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>EndLiveSessionPayload</code> result type. */
public final class EndLiveSessionPayload implements WireValue {
  private final String status;
  private final String requestId;
  private final String receiptId;
  private final String committedAt;
  private final Boolean replayed;
  private final OperationRef operation;
  private final LiveSessionEndRequested result;

  private EndLiveSessionPayload(
      String status,
      String requestId,
      String receiptId,
      String committedAt,
      Boolean replayed,
      OperationRef operation,
      LiveSessionEndRequested result) {
    this.status = status;
    this.requestId = requestId;
    this.receiptId = receiptId;
    this.committedAt = committedAt;
    this.replayed = replayed;
    this.operation = operation;
    this.result = result;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static EndLiveSessionPayload fromJson(@Nullable Object value) {
    return Wire.required(EndLiveSessionPayload::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static EndLiveSessionPayload decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "EndLiveSessionPayload");
    return new EndLiveSessionPayload(
        Wire.field(object, "EndLiveSessionPayload", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "EndLiveSessionPayload", "requestId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "EndLiveSessionPayload", "receiptId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "EndLiveSessionPayload", "committedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "EndLiveSessionPayload", "replayed", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "EndLiveSessionPayload", "operation", depth, Wire.required(OperationRef::decode)),
        Wire.field(object, "EndLiveSessionPayload", "result", depth, Wire.required(LiveSessionEndRequested::decode)));
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>receiptId</code> field. */
  public String getReceiptId() {
    return this.receiptId;
  }

  /** The <code>committedAt</code> field. */
  public String getCommittedAt() {
    return this.committedAt;
  }

  /** The <code>replayed</code> field. */
  public Boolean getReplayed() {
    return this.replayed;
  }

  /** The <code>operation</code> field. */
  public OperationRef getOperation() {
    return this.operation;
  }

  /** The <code>result</code> field. */
  public LiveSessionEndRequested getResult() {
    return this.result;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("status", Wire.json(this.status));
    json.put("requestId", Wire.json(this.requestId));
    json.put("receiptId", Wire.json(this.receiptId));
    json.put("committedAt", Wire.json(this.committedAt));
    json.put("replayed", Wire.json(this.replayed));
    json.put("operation", Wire.json(this.operation));
    json.put("result", Wire.json(this.result));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof EndLiveSessionPayload)) {
      return false;
    }
    EndLiveSessionPayload that = (EndLiveSessionPayload) other;
    return Objects.equals(this.status, that.status)
        && Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.receiptId, that.receiptId)
        && Objects.equals(this.committedAt, that.committedAt)
        && Objects.equals(this.replayed, that.replayed)
        && Objects.equals(this.operation, that.operation)
        && Objects.equals(this.result, that.result);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.status, this.requestId, this.receiptId, this.committedAt, this.replayed, this.operation, this.result);
  }

  @Override
  public String toString() {
    return "EndLiveSessionPayload{status=" + this.status
        + ", requestId=" + this.requestId
        + ", receiptId=" + this.receiptId
        + ", committedAt=" + this.committedAt
        + ", replayed=" + this.replayed
        + ", operation=" + this.operation
        + ", result=" + this.result
        + "}";
  }
}
