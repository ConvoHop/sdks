// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>SetSpendControlsReply</code> result type. */
public final class SetSpendControlsReply implements WireValue {
  private final String status;
  private final String requestId;
  private final @Nullable String serverTime;
  private final @Nullable String receiptId;
  private final @Nullable String committedAt;
  private final @Nullable Boolean replayed;
  private final @Nullable OperationRef operation;
  private final @Nullable ResourceRef resourceRef;
  private final @Nullable OrganizationSpend result;

  private SetSpendControlsReply(
      String status,
      String requestId,
      @Nullable String serverTime,
      @Nullable String receiptId,
      @Nullable String committedAt,
      @Nullable Boolean replayed,
      @Nullable OperationRef operation,
      @Nullable ResourceRef resourceRef,
      @Nullable OrganizationSpend result) {
    this.status = status;
    this.requestId = requestId;
    this.serverTime = serverTime;
    this.receiptId = receiptId;
    this.committedAt = committedAt;
    this.replayed = replayed;
    this.operation = operation;
    this.resourceRef = resourceRef;
    this.result = result;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static SetSpendControlsReply fromJson(@Nullable Object value) {
    return Wire.required(SetSpendControlsReply::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static SetSpendControlsReply decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "SetSpendControlsReply");
    return new SetSpendControlsReply(
        Wire.field(object, "SetSpendControlsReply", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "SetSpendControlsReply", "requestId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "SetSpendControlsReply", "serverTime", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "SetSpendControlsReply", "receiptId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "SetSpendControlsReply", "committedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "SetSpendControlsReply", "replayed", depth, Wire.optional(Wire.BOOLEAN)),
        Wire.field(object, "SetSpendControlsReply", "operation", depth, Wire.optional(OperationRef::decode)),
        Wire.field(object, "SetSpendControlsReply", "resourceRef", depth, Wire.optional(ResourceRef::decode)),
        Wire.field(object, "SetSpendControlsReply", "result", depth, Wire.optional(OrganizationSpend::decode)));
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>serverTime</code> field. */
  public @Nullable String getServerTime() {
    return this.serverTime;
  }

  /** The <code>receiptId</code> field. */
  public @Nullable String getReceiptId() {
    return this.receiptId;
  }

  /** The <code>committedAt</code> field. */
  public @Nullable String getCommittedAt() {
    return this.committedAt;
  }

  /** The <code>replayed</code> field. */
  public @Nullable Boolean getReplayed() {
    return this.replayed;
  }

  /** The <code>operation</code> field. */
  public @Nullable OperationRef getOperation() {
    return this.operation;
  }

  /** The <code>resourceRef</code> field. */
  public @Nullable ResourceRef getResourceRef() {
    return this.resourceRef;
  }

  /** The <code>result</code> field. */
  public @Nullable OrganizationSpend getResult() {
    return this.result;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("status", Wire.json(this.status));
    json.put("requestId", Wire.json(this.requestId));
    json.put("serverTime", Wire.json(this.serverTime));
    json.put("receiptId", Wire.json(this.receiptId));
    json.put("committedAt", Wire.json(this.committedAt));
    json.put("replayed", Wire.json(this.replayed));
    json.put("operation", Wire.json(this.operation));
    json.put("resourceRef", Wire.json(this.resourceRef));
    json.put("result", Wire.json(this.result));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SetSpendControlsReply)) {
      return false;
    }
    SetSpendControlsReply that = (SetSpendControlsReply) other;
    return Objects.equals(this.status, that.status)
        && Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.serverTime, that.serverTime)
        && Objects.equals(this.receiptId, that.receiptId)
        && Objects.equals(this.committedAt, that.committedAt)
        && Objects.equals(this.replayed, that.replayed)
        && Objects.equals(this.operation, that.operation)
        && Objects.equals(this.resourceRef, that.resourceRef)
        && Objects.equals(this.result, that.result);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.status, this.requestId, this.serverTime, this.receiptId, this.committedAt, this.replayed, this.operation, this.resourceRef, this.result);
  }

  @Override
  public String toString() {
    return "SetSpendControlsReply{status=" + this.status
        + ", requestId=" + this.requestId
        + ", serverTime=" + this.serverTime
        + ", receiptId=" + this.receiptId
        + ", committedAt=" + this.committedAt
        + ", replayed=" + this.replayed
        + ", operation=" + this.operation
        + ", resourceRef=" + this.resourceRef
        + ", result=" + this.result
        + "}";
  }
}
