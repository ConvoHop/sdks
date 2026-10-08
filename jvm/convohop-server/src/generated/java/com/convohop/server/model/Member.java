// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Member</code> result type. */
public final class Member implements WireValue {
  private final String conversationId;
  private final String principalId;
  private final String role;
  private final String status;
  private final String membershipEpoch;
  private final String visibilityEpoch;
  private final String revision;
  private final String visibleFromSequence;
  private final Boolean canStartBroadcast;

  private Member(
      String conversationId,
      String principalId,
      String role,
      String status,
      String membershipEpoch,
      String visibilityEpoch,
      String revision,
      String visibleFromSequence,
      Boolean canStartBroadcast) {
    this.conversationId = conversationId;
    this.principalId = principalId;
    this.role = role;
    this.status = status;
    this.membershipEpoch = membershipEpoch;
    this.visibilityEpoch = visibilityEpoch;
    this.revision = revision;
    this.visibleFromSequence = visibleFromSequence;
    this.canStartBroadcast = canStartBroadcast;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Member fromJson(@Nullable Object value) {
    return Wire.required(Member::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Member decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Member");
    return new Member(
        Wire.field(object, "Member", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Member", "principalId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Member", "role", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Member", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Member", "membershipEpoch", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Member", "visibilityEpoch", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Member", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Member", "visibleFromSequence", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Member", "canStartBroadcast", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>role</code> field. */
  public String getRole() {
    return this.role;
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>membershipEpoch</code> field. */
  public String getMembershipEpoch() {
    return this.membershipEpoch;
  }

  /** The <code>visibilityEpoch</code> field. */
  public String getVisibilityEpoch() {
    return this.visibilityEpoch;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>visibleFromSequence</code> field. */
  public String getVisibleFromSequence() {
    return this.visibleFromSequence;
  }

  /** The <code>canStartBroadcast</code> field. */
  public Boolean getCanStartBroadcast() {
    return this.canStartBroadcast;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("principalId", Wire.json(this.principalId));
    json.put("role", Wire.json(this.role));
    json.put("status", Wire.json(this.status));
    json.put("membershipEpoch", Wire.json(this.membershipEpoch));
    json.put("visibilityEpoch", Wire.json(this.visibilityEpoch));
    json.put("revision", Wire.json(this.revision));
    json.put("visibleFromSequence", Wire.json(this.visibleFromSequence));
    json.put("canStartBroadcast", Wire.json(this.canStartBroadcast));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Member)) {
      return false;
    }
    Member that = (Member) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.role, that.role)
        && Objects.equals(this.status, that.status)
        && Objects.equals(this.membershipEpoch, that.membershipEpoch)
        && Objects.equals(this.visibilityEpoch, that.visibilityEpoch)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.visibleFromSequence, that.visibleFromSequence)
        && Objects.equals(this.canStartBroadcast, that.canStartBroadcast);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.principalId, this.role, this.status, this.membershipEpoch, this.visibilityEpoch, this.revision, this.visibleFromSequence, this.canStartBroadcast);
  }

  @Override
  public String toString() {
    return "Member{conversationId=" + this.conversationId
        + ", principalId=" + this.principalId
        + ", role=" + this.role
        + ", status=" + this.status
        + ", membershipEpoch=" + this.membershipEpoch
        + ", visibilityEpoch=" + this.visibilityEpoch
        + ", revision=" + this.revision
        + ", visibleFromSequence=" + this.visibleFromSequence
        + ", canStartBroadcast=" + this.canStartBroadcast
        + "}";
  }
}
