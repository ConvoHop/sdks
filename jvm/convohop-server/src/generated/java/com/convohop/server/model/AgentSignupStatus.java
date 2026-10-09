// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>AgentSignupStatus</code> result type. */
public final class AgentSignupStatus implements WireValue {
  private final String signupId;
  private final String state;
  private final @Nullable String orgId;
  private final @Nullable String deploymentId;
  private final @Nullable String projectId;
  private final @Nullable String nextStep;
  private final List<String> scopes;
  private final @Nullable String grantExpiresAt;
  private final List<AgentKey> keys;
  private final @Nullable String incarnation;
  private final @Nullable String servingEpoch;

  private AgentSignupStatus(
      String signupId,
      String state,
      @Nullable String orgId,
      @Nullable String deploymentId,
      @Nullable String projectId,
      @Nullable String nextStep,
      List<String> scopes,
      @Nullable String grantExpiresAt,
      List<AgentKey> keys,
      @Nullable String incarnation,
      @Nullable String servingEpoch) {
    this.signupId = signupId;
    this.state = state;
    this.orgId = orgId;
    this.deploymentId = deploymentId;
    this.projectId = projectId;
    this.nextStep = nextStep;
    this.scopes = scopes;
    this.grantExpiresAt = grantExpiresAt;
    this.keys = keys;
    this.incarnation = incarnation;
    this.servingEpoch = servingEpoch;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static AgentSignupStatus fromJson(@Nullable Object value) {
    return Wire.required(AgentSignupStatus::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static AgentSignupStatus decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "AgentSignupStatus");
    return new AgentSignupStatus(
        Wire.field(object, "AgentSignupStatus", "signupId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentSignupStatus", "state", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentSignupStatus", "orgId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "AgentSignupStatus", "deploymentId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "AgentSignupStatus", "projectId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "AgentSignupStatus", "nextStep", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "AgentSignupStatus", "scopes", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "AgentSignupStatus", "grantExpiresAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "AgentSignupStatus", "keys", depth, Wire.required(Wire.list(Wire.required(AgentKey::decode)))),
        Wire.field(object, "AgentSignupStatus", "incarnation", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "AgentSignupStatus", "servingEpoch", depth, Wire.optional(Scalars.DECIMAL)));
  }

  /** The <code>signupId</code> field. */
  public String getSignupId() {
    return this.signupId;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The <code>orgId</code> field. */
  public @Nullable String getOrgId() {
    return this.orgId;
  }

  /** The <code>deploymentId</code> field. */
  public @Nullable String getDeploymentId() {
    return this.deploymentId;
  }

  /** The <code>projectId</code> field. */
  public @Nullable String getProjectId() {
    return this.projectId;
  }

  /** The <code>nextStep</code> field. */
  public @Nullable String getNextStep() {
    return this.nextStep;
  }

  /** The <code>scopes</code> field. */
  public List<String> getScopes() {
    return this.scopes;
  }

  /** The <code>grantExpiresAt</code> field. */
  public @Nullable String getGrantExpiresAt() {
    return this.grantExpiresAt;
  }

  /** The <code>keys</code> field. */
  public List<AgentKey> getKeys() {
    return this.keys;
  }

  /** The <code>incarnation</code> field. */
  public @Nullable String getIncarnation() {
    return this.incarnation;
  }

  /** The <code>servingEpoch</code> field. */
  public @Nullable String getServingEpoch() {
    return this.servingEpoch;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("signupId", Wire.json(this.signupId));
    json.put("state", Wire.json(this.state));
    json.put("orgId", Wire.json(this.orgId));
    json.put("deploymentId", Wire.json(this.deploymentId));
    json.put("projectId", Wire.json(this.projectId));
    json.put("nextStep", Wire.json(this.nextStep));
    json.put("scopes", Wire.json(this.scopes));
    json.put("grantExpiresAt", Wire.json(this.grantExpiresAt));
    json.put("keys", Wire.json(this.keys));
    json.put("incarnation", Wire.json(this.incarnation));
    json.put("servingEpoch", Wire.json(this.servingEpoch));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentSignupStatus)) {
      return false;
    }
    AgentSignupStatus that = (AgentSignupStatus) other;
    return Objects.equals(this.signupId, that.signupId)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.deploymentId, that.deploymentId)
        && Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.nextStep, that.nextStep)
        && Objects.equals(this.scopes, that.scopes)
        && Objects.equals(this.grantExpiresAt, that.grantExpiresAt)
        && Objects.equals(this.keys, that.keys)
        && Objects.equals(this.incarnation, that.incarnation)
        && Objects.equals(this.servingEpoch, that.servingEpoch);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.signupId, this.state, this.orgId, this.deploymentId, this.projectId, this.nextStep, this.scopes, this.grantExpiresAt, this.keys, this.incarnation, this.servingEpoch);
  }

  @Override
  public String toString() {
    return "AgentSignupStatus{signupId=" + this.signupId
        + ", state=" + this.state
        + ", orgId=" + this.orgId
        + ", deploymentId=" + this.deploymentId
        + ", projectId=" + this.projectId
        + ", nextStep=" + this.nextStep
        + ", scopes=" + this.scopes
        + ", grantExpiresAt=" + this.grantExpiresAt
        + ", keys=" + this.keys
        + ", incarnation=" + this.incarnation
        + ", servingEpoch=" + this.servingEpoch
        + "}";
  }
}
