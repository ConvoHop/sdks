// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveParticipation</code> result type. */
public final class LiveParticipation implements WireValue {
  private final String participationId;
  private final String principalId;
  private final String membershipEpoch;
  private final LiveRole role;
  private final LiveParticipationState state;
  private final LiveMediaPermissions permissions;
  private final @Nullable String reservationExpiresAt;
  private final @Nullable String nativeConnectionId;
  private final @Nullable LiveMediaCutoff mediaCutoff;

  private LiveParticipation(
      String participationId,
      String principalId,
      String membershipEpoch,
      LiveRole role,
      LiveParticipationState state,
      LiveMediaPermissions permissions,
      @Nullable String reservationExpiresAt,
      @Nullable String nativeConnectionId,
      @Nullable LiveMediaCutoff mediaCutoff) {
    this.participationId = participationId;
    this.principalId = principalId;
    this.membershipEpoch = membershipEpoch;
    this.role = role;
    this.state = state;
    this.permissions = permissions;
    this.reservationExpiresAt = reservationExpiresAt;
    this.nativeConnectionId = nativeConnectionId;
    this.mediaCutoff = mediaCutoff;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveParticipation fromJson(@Nullable Object value) {
    return Wire.required(LiveParticipation::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveParticipation decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveParticipation");
    return new LiveParticipation(
        Wire.field(object, "LiveParticipation", "participationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveParticipation", "principalId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "LiveParticipation", "membershipEpoch", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "LiveParticipation", "role", depth, Wire.required(LiveRole::decode)),
        Wire.field(object, "LiveParticipation", "state", depth, Wire.required(LiveParticipationState::decode)),
        Wire.field(object, "LiveParticipation", "permissions", depth, Wire.required(LiveMediaPermissions::decode)),
        Wire.field(object, "LiveParticipation", "reservationExpiresAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "LiveParticipation", "nativeConnectionId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "LiveParticipation", "mediaCutoff", depth, Wire.optional(LiveMediaCutoff::decode)));
  }

  /** The <code>participationId</code> field. */
  public String getParticipationId() {
    return this.participationId;
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>membershipEpoch</code> field. */
  public String getMembershipEpoch() {
    return this.membershipEpoch;
  }

  /** The <code>role</code> field. */
  public LiveRole getRole() {
    return this.role;
  }

  /** The <code>state</code> field. */
  public LiveParticipationState getState() {
    return this.state;
  }

  /** The <code>permissions</code> field. */
  public LiveMediaPermissions getPermissions() {
    return this.permissions;
  }

  /** The <code>reservationExpiresAt</code> field. */
  public @Nullable String getReservationExpiresAt() {
    return this.reservationExpiresAt;
  }

  /** The <code>nativeConnectionId</code> field. */
  public @Nullable String getNativeConnectionId() {
    return this.nativeConnectionId;
  }

  /** The <code>mediaCutoff</code> field. */
  public @Nullable LiveMediaCutoff getMediaCutoff() {
    return this.mediaCutoff;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("participationId", Wire.json(this.participationId));
    json.put("principalId", Wire.json(this.principalId));
    json.put("membershipEpoch", Wire.json(this.membershipEpoch));
    json.put("role", Wire.json(this.role));
    json.put("state", Wire.json(this.state));
    json.put("permissions", Wire.json(this.permissions));
    json.put("reservationExpiresAt", Wire.json(this.reservationExpiresAt));
    json.put("nativeConnectionId", Wire.json(this.nativeConnectionId));
    json.put("mediaCutoff", Wire.json(this.mediaCutoff));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveParticipation)) {
      return false;
    }
    LiveParticipation that = (LiveParticipation) other;
    return Objects.equals(this.participationId, that.participationId)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.membershipEpoch, that.membershipEpoch)
        && Objects.equals(this.role, that.role)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.permissions, that.permissions)
        && Objects.equals(this.reservationExpiresAt, that.reservationExpiresAt)
        && Objects.equals(this.nativeConnectionId, that.nativeConnectionId)
        && Objects.equals(this.mediaCutoff, that.mediaCutoff);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.participationId, this.principalId, this.membershipEpoch, this.role, this.state, this.permissions, this.reservationExpiresAt, this.nativeConnectionId, this.mediaCutoff);
  }

  @Override
  public String toString() {
    return "LiveParticipation{participationId=" + this.participationId
        + ", principalId=" + this.principalId
        + ", membershipEpoch=" + this.membershipEpoch
        + ", role=" + this.role
        + ", state=" + this.state
        + ", permissions=" + this.permissions
        + ", reservationExpiresAt=" + this.reservationExpiresAt
        + ", nativeConnectionId=" + this.nativeConnectionId
        + ", mediaCutoff=" + this.mediaCutoff
        + "}";
  }
}
