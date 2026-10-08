// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>AddMembersPayload</code> result type. */
public final class AddMembersPayload implements WireValue {
  private final String status;
  private final String requestId;
  private final String receiptId;
  private final String committedAt;
  private final Boolean replayed;
  private final ConversationMemberBatch result;

  private AddMembersPayload(
      String status,
      String requestId,
      String receiptId,
      String committedAt,
      Boolean replayed,
      ConversationMemberBatch result) {
    this.status = status;
    this.requestId = requestId;
    this.receiptId = receiptId;
    this.committedAt = committedAt;
    this.replayed = replayed;
    this.result = result;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static AddMembersPayload fromJson(@Nullable Object value) {
    return Wire.required(AddMembersPayload::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static AddMembersPayload decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "AddMembersPayload");
    return new AddMembersPayload(
        Wire.field(object, "AddMembersPayload", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AddMembersPayload", "requestId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AddMembersPayload", "receiptId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AddMembersPayload", "committedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AddMembersPayload", "replayed", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "AddMembersPayload", "result", depth, Wire.required(ConversationMemberBatch::decode)));
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

  /** The <code>result</code> field. */
  public ConversationMemberBatch getResult() {
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
    json.put("result", Wire.json(this.result));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AddMembersPayload)) {
      return false;
    }
    AddMembersPayload that = (AddMembersPayload) other;
    return Objects.equals(this.status, that.status)
        && Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.receiptId, that.receiptId)
        && Objects.equals(this.committedAt, that.committedAt)
        && Objects.equals(this.replayed, that.replayed)
        && Objects.equals(this.result, that.result);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.status, this.requestId, this.receiptId, this.committedAt, this.replayed, this.result);
  }

  @Override
  public String toString() {
    return "AddMembersPayload{status=" + this.status
        + ", requestId=" + this.requestId
        + ", receiptId=" + this.receiptId
        + ", committedAt=" + this.committedAt
        + ", replayed=" + this.replayed
        + ", result=" + this.result
        + "}";
  }
}
