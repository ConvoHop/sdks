// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveCredentialIssuance</code> result type. */
public final class LiveCredentialIssuance implements WireValue {
  private final String liveSessionId;
  private final String participationId;
  private final String generation;
  private final String leaseId;
  private final String grantOrdinal;
  private final String admissionExpiresAt;
  private final String leaseExpiresAt;

  private LiveCredentialIssuance(
      String liveSessionId,
      String participationId,
      String generation,
      String leaseId,
      String grantOrdinal,
      String admissionExpiresAt,
      String leaseExpiresAt) {
    this.liveSessionId = liveSessionId;
    this.participationId = participationId;
    this.generation = generation;
    this.leaseId = leaseId;
    this.grantOrdinal = grantOrdinal;
    this.admissionExpiresAt = admissionExpiresAt;
    this.leaseExpiresAt = leaseExpiresAt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveCredentialIssuance fromJson(@Nullable Object value) {
    return Wire.required(LiveCredentialIssuance::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveCredentialIssuance decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveCredentialIssuance");
    return new LiveCredentialIssuance(
        Wire.field(object, "LiveCredentialIssuance", "liveSessionId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveCredentialIssuance", "participationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveCredentialIssuance", "generation", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveCredentialIssuance", "leaseId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveCredentialIssuance", "grantOrdinal", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveCredentialIssuance", "admissionExpiresAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "LiveCredentialIssuance", "leaseExpiresAt", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The <code>participationId</code> field. */
  public String getParticipationId() {
    return this.participationId;
  }

  /** The <code>generation</code> field. */
  public String getGeneration() {
    return this.generation;
  }

  /** The <code>leaseId</code> field. */
  public String getLeaseId() {
    return this.leaseId;
  }

  /** The <code>grantOrdinal</code> field. */
  public String getGrantOrdinal() {
    return this.grantOrdinal;
  }

  /** The <code>admissionExpiresAt</code> field. */
  public String getAdmissionExpiresAt() {
    return this.admissionExpiresAt;
  }

  /** The <code>leaseExpiresAt</code> field. */
  public String getLeaseExpiresAt() {
    return this.leaseExpiresAt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("participationId", Wire.json(this.participationId));
    json.put("generation", Wire.json(this.generation));
    json.put("leaseId", Wire.json(this.leaseId));
    json.put("grantOrdinal", Wire.json(this.grantOrdinal));
    json.put("admissionExpiresAt", Wire.json(this.admissionExpiresAt));
    json.put("leaseExpiresAt", Wire.json(this.leaseExpiresAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveCredentialIssuance)) {
      return false;
    }
    LiveCredentialIssuance that = (LiveCredentialIssuance) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.participationId, that.participationId)
        && Objects.equals(this.generation, that.generation)
        && Objects.equals(this.leaseId, that.leaseId)
        && Objects.equals(this.grantOrdinal, that.grantOrdinal)
        && Objects.equals(this.admissionExpiresAt, that.admissionExpiresAt)
        && Objects.equals(this.leaseExpiresAt, that.leaseExpiresAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.participationId, this.generation, this.leaseId, this.grantOrdinal, this.admissionExpiresAt, this.leaseExpiresAt);
  }

  @Override
  public String toString() {
    return "LiveCredentialIssuance{liveSessionId=" + this.liveSessionId
        + ", participationId=" + this.participationId
        + ", generation=" + this.generation
        + ", leaseId=" + this.leaseId
        + ", grantOrdinal=" + this.grantOrdinal
        + ", admissionExpiresAt=" + this.admissionExpiresAt
        + ", leaseExpiresAt=" + this.leaseExpiresAt
        + "}";
  }
}
