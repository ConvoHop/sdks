// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>AgentGrant</code> result type. */
public final class AgentGrant implements WireValue {
  private final String grantId;
  private final String orgId;
  private final String signupId;
  private final String agentActorId;
  private final @Nullable String projectId;
  private final List<String> scopes;
  private final String expiresAt;
  private final @Nullable String revokedAt;
  private final String createdAt;
  private final List<AgentKey> keys;

  private AgentGrant(
      String grantId,
      String orgId,
      String signupId,
      String agentActorId,
      @Nullable String projectId,
      List<String> scopes,
      String expiresAt,
      @Nullable String revokedAt,
      String createdAt,
      List<AgentKey> keys) {
    this.grantId = grantId;
    this.orgId = orgId;
    this.signupId = signupId;
    this.agentActorId = agentActorId;
    this.projectId = projectId;
    this.scopes = scopes;
    this.expiresAt = expiresAt;
    this.revokedAt = revokedAt;
    this.createdAt = createdAt;
    this.keys = keys;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static AgentGrant fromJson(@Nullable Object value) {
    return Wire.required(AgentGrant::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static AgentGrant decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "AgentGrant");
    return new AgentGrant(
        Wire.field(object, "AgentGrant", "grantId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentGrant", "orgId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentGrant", "signupId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentGrant", "agentActorId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentGrant", "projectId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "AgentGrant", "scopes", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "AgentGrant", "expiresAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentGrant", "revokedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "AgentGrant", "createdAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentGrant", "keys", depth, Wire.required(Wire.list(Wire.required(AgentKey::decode)))));
  }

  /** The <code>grantId</code> field. */
  public String getGrantId() {
    return this.grantId;
  }

  /** The <code>orgId</code> field. */
  public String getOrgId() {
    return this.orgId;
  }

  /** The <code>signupId</code> field. */
  public String getSignupId() {
    return this.signupId;
  }

  /** The <code>agentActorId</code> field. */
  public String getAgentActorId() {
    return this.agentActorId;
  }

  /** The <code>projectId</code> field. */
  public @Nullable String getProjectId() {
    return this.projectId;
  }

  /** The <code>scopes</code> field. */
  public List<String> getScopes() {
    return this.scopes;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The <code>revokedAt</code> field. */
  public @Nullable String getRevokedAt() {
    return this.revokedAt;
  }

  /** The <code>createdAt</code> field. */
  public String getCreatedAt() {
    return this.createdAt;
  }

  /** The <code>keys</code> field. */
  public List<AgentKey> getKeys() {
    return this.keys;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("grantId", Wire.json(this.grantId));
    json.put("orgId", Wire.json(this.orgId));
    json.put("signupId", Wire.json(this.signupId));
    json.put("agentActorId", Wire.json(this.agentActorId));
    json.put("projectId", Wire.json(this.projectId));
    json.put("scopes", Wire.json(this.scopes));
    json.put("expiresAt", Wire.json(this.expiresAt));
    json.put("revokedAt", Wire.json(this.revokedAt));
    json.put("createdAt", Wire.json(this.createdAt));
    json.put("keys", Wire.json(this.keys));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentGrant)) {
      return false;
    }
    AgentGrant that = (AgentGrant) other;
    return Objects.equals(this.grantId, that.grantId)
        && Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.signupId, that.signupId)
        && Objects.equals(this.agentActorId, that.agentActorId)
        && Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.scopes, that.scopes)
        && Objects.equals(this.expiresAt, that.expiresAt)
        && Objects.equals(this.revokedAt, that.revokedAt)
        && Objects.equals(this.createdAt, that.createdAt)
        && Objects.equals(this.keys, that.keys);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.grantId, this.orgId, this.signupId, this.agentActorId, this.projectId, this.scopes, this.expiresAt, this.revokedAt, this.createdAt, this.keys);
  }

  @Override
  public String toString() {
    return "AgentGrant{grantId=" + this.grantId
        + ", orgId=" + this.orgId
        + ", signupId=" + this.signupId
        + ", agentActorId=" + this.agentActorId
        + ", projectId=" + this.projectId
        + ", scopes=" + this.scopes
        + ", expiresAt=" + this.expiresAt
        + ", revokedAt=" + this.revokedAt
        + ", createdAt=" + this.createdAt
        + ", keys=" + this.keys
        + "}";
  }
}
