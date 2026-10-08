// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>ReadReceipt</code> result type. */
public final class ReadReceipt implements WireValue {
  private final String principalId;
  private final String membershipEpoch;
  private final String visibilityEpoch;
  private final @Nullable String deliveredThroughSequence;
  private final @Nullable String readThroughSequence;
  private final @Nullable String updatedAt;

  private ReadReceipt(
      String principalId,
      String membershipEpoch,
      String visibilityEpoch,
      @Nullable String deliveredThroughSequence,
      @Nullable String readThroughSequence,
      @Nullable String updatedAt) {
    this.principalId = principalId;
    this.membershipEpoch = membershipEpoch;
    this.visibilityEpoch = visibilityEpoch;
    this.deliveredThroughSequence = deliveredThroughSequence;
    this.readThroughSequence = readThroughSequence;
    this.updatedAt = updatedAt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ReadReceipt fromJson(@Nullable Object value) {
    return Wire.required(ReadReceipt::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ReadReceipt decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "ReadReceipt");
    return new ReadReceipt(
        Wire.field(object, "ReadReceipt", "principalId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "ReadReceipt", "membershipEpoch", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "ReadReceipt", "visibilityEpoch", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "ReadReceipt", "deliveredThroughSequence", depth, Wire.optional(Scalars.DECIMAL)),
        Wire.field(object, "ReadReceipt", "readThroughSequence", depth, Wire.optional(Scalars.DECIMAL)),
        Wire.field(object, "ReadReceipt", "updatedAt", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>membershipEpoch</code> field. */
  public String getMembershipEpoch() {
    return this.membershipEpoch;
  }

  /** The <code>visibilityEpoch</code> field. */
  public String getVisibilityEpoch() {
    return this.visibilityEpoch;
  }

  /** The <code>deliveredThroughSequence</code> field. */
  public @Nullable String getDeliveredThroughSequence() {
    return this.deliveredThroughSequence;
  }

  /** The <code>readThroughSequence</code> field. */
  public @Nullable String getReadThroughSequence() {
    return this.readThroughSequence;
  }

  /** The <code>updatedAt</code> field. */
  public @Nullable String getUpdatedAt() {
    return this.updatedAt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("principalId", Wire.json(this.principalId));
    json.put("membershipEpoch", Wire.json(this.membershipEpoch));
    json.put("visibilityEpoch", Wire.json(this.visibilityEpoch));
    json.put("deliveredThroughSequence", Wire.json(this.deliveredThroughSequence));
    json.put("readThroughSequence", Wire.json(this.readThroughSequence));
    json.put("updatedAt", Wire.json(this.updatedAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ReadReceipt)) {
      return false;
    }
    ReadReceipt that = (ReadReceipt) other;
    return Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.membershipEpoch, that.membershipEpoch)
        && Objects.equals(this.visibilityEpoch, that.visibilityEpoch)
        && Objects.equals(this.deliveredThroughSequence, that.deliveredThroughSequence)
        && Objects.equals(this.readThroughSequence, that.readThroughSequence)
        && Objects.equals(this.updatedAt, that.updatedAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.principalId, this.membershipEpoch, this.visibilityEpoch, this.deliveredThroughSequence, this.readThroughSequence, this.updatedAt);
  }

  @Override
  public String toString() {
    return "ReadReceipt{principalId=" + this.principalId
        + ", membershipEpoch=" + this.membershipEpoch
        + ", visibilityEpoch=" + this.visibilityEpoch
        + ", deliveredThroughSequence=" + this.deliveredThroughSequence
        + ", readThroughSequence=" + this.readThroughSequence
        + ", updatedAt=" + this.updatedAt
        + "}";
  }
}
