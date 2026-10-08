// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Project</code> result type. */
public final class Project implements WireValue {
  private final String projectId;
  private final String deploymentId;
  private final String name;
  private final String environment;
  private final String incarnation;
  private final String servingRegion;
  private final String servingEpoch;
  private final String status;
  private final String revision;
  private final String policyRevision;
  private final Boolean messagePreview;

  private Project(
      String projectId,
      String deploymentId,
      String name,
      String environment,
      String incarnation,
      String servingRegion,
      String servingEpoch,
      String status,
      String revision,
      String policyRevision,
      Boolean messagePreview) {
    this.projectId = projectId;
    this.deploymentId = deploymentId;
    this.name = name;
    this.environment = environment;
    this.incarnation = incarnation;
    this.servingRegion = servingRegion;
    this.servingEpoch = servingEpoch;
    this.status = status;
    this.revision = revision;
    this.policyRevision = policyRevision;
    this.messagePreview = messagePreview;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Project fromJson(@Nullable Object value) {
    return Wire.required(Project::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Project decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Project");
    return new Project(
        Wire.field(object, "Project", "projectId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Project", "deploymentId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Project", "name", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Project", "environment", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Project", "incarnation", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Project", "servingRegion", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Project", "servingEpoch", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Project", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Project", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Project", "policyRevision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Project", "messagePreview", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>projectId</code> field. */
  public String getProjectId() {
    return this.projectId;
  }

  /** The <code>deploymentId</code> field. */
  public String getDeploymentId() {
    return this.deploymentId;
  }

  /** The <code>name</code> field. */
  public String getName() {
    return this.name;
  }

  /** The <code>environment</code> field. */
  public String getEnvironment() {
    return this.environment;
  }

  /** The <code>incarnation</code> field. */
  public String getIncarnation() {
    return this.incarnation;
  }

  /** The <code>servingRegion</code> field. */
  public String getServingRegion() {
    return this.servingRegion;
  }

  /** The <code>servingEpoch</code> field. */
  public String getServingEpoch() {
    return this.servingEpoch;
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>policyRevision</code> field. */
  public String getPolicyRevision() {
    return this.policyRevision;
  }

  /** The <code>messagePreview</code> field. */
  public Boolean getMessagePreview() {
    return this.messagePreview;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("deploymentId", Wire.json(this.deploymentId));
    json.put("name", Wire.json(this.name));
    json.put("environment", Wire.json(this.environment));
    json.put("incarnation", Wire.json(this.incarnation));
    json.put("servingRegion", Wire.json(this.servingRegion));
    json.put("servingEpoch", Wire.json(this.servingEpoch));
    json.put("status", Wire.json(this.status));
    json.put("revision", Wire.json(this.revision));
    json.put("policyRevision", Wire.json(this.policyRevision));
    json.put("messagePreview", Wire.json(this.messagePreview));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Project)) {
      return false;
    }
    Project that = (Project) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.deploymentId, that.deploymentId)
        && Objects.equals(this.name, that.name)
        && Objects.equals(this.environment, that.environment)
        && Objects.equals(this.incarnation, that.incarnation)
        && Objects.equals(this.servingRegion, that.servingRegion)
        && Objects.equals(this.servingEpoch, that.servingEpoch)
        && Objects.equals(this.status, that.status)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.policyRevision, that.policyRevision)
        && Objects.equals(this.messagePreview, that.messagePreview);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.deploymentId, this.name, this.environment, this.incarnation, this.servingRegion, this.servingEpoch, this.status, this.revision, this.policyRevision, this.messagePreview);
  }

  @Override
  public String toString() {
    return "Project{projectId=" + this.projectId
        + ", deploymentId=" + this.deploymentId
        + ", name=" + this.name
        + ", environment=" + this.environment
        + ", incarnation=" + this.incarnation
        + ", servingRegion=" + this.servingRegion
        + ", servingEpoch=" + this.servingEpoch
        + ", status=" + this.status
        + ", revision=" + this.revision
        + ", policyRevision=" + this.policyRevision
        + ", messagePreview=" + this.messagePreview
        + "}";
  }
}
