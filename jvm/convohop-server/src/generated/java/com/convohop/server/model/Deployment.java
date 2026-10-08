// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Deployment</code> result type. */
public final class Deployment implements WireValue {
  private final String deploymentId;
  private final String orgId;
  private final String offering;
  private final String geoId;
  private final String installationId;
  private final String resourceOwner;
  private final List<String> approvedRegions;
  private final String readiness;
  private final String revision;
  private final String consentRef;
  private final String environment;

  private Deployment(
      String deploymentId,
      String orgId,
      String offering,
      String geoId,
      String installationId,
      String resourceOwner,
      List<String> approvedRegions,
      String readiness,
      String revision,
      String consentRef,
      String environment) {
    this.deploymentId = deploymentId;
    this.orgId = orgId;
    this.offering = offering;
    this.geoId = geoId;
    this.installationId = installationId;
    this.resourceOwner = resourceOwner;
    this.approvedRegions = approvedRegions;
    this.readiness = readiness;
    this.revision = revision;
    this.consentRef = consentRef;
    this.environment = environment;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Deployment fromJson(@Nullable Object value) {
    return Wire.required(Deployment::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Deployment decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Deployment");
    return new Deployment(
        Wire.field(object, "Deployment", "deploymentId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Deployment", "orgId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Deployment", "offering", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Deployment", "geoId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Deployment", "installationId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Deployment", "resourceOwner", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Deployment", "approvedRegions", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "Deployment", "readiness", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Deployment", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Deployment", "consentRef", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Deployment", "environment", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>deploymentId</code> field. */
  public String getDeploymentId() {
    return this.deploymentId;
  }

  /** The <code>orgId</code> field. */
  public String getOrgId() {
    return this.orgId;
  }

  /** The <code>offering</code> field. */
  public String getOffering() {
    return this.offering;
  }

  /** The <code>geoId</code> field. */
  public String getGeoId() {
    return this.geoId;
  }

  /** The <code>installationId</code> field. */
  public String getInstallationId() {
    return this.installationId;
  }

  /** The <code>resourceOwner</code> field. */
  public String getResourceOwner() {
    return this.resourceOwner;
  }

  /** The <code>approvedRegions</code> field. */
  public List<String> getApprovedRegions() {
    return this.approvedRegions;
  }

  /** The <code>readiness</code> field. */
  public String getReadiness() {
    return this.readiness;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>consentRef</code> field. */
  public String getConsentRef() {
    return this.consentRef;
  }

  /** The <code>environment</code> field. */
  public String getEnvironment() {
    return this.environment;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deploymentId", Wire.json(this.deploymentId));
    json.put("orgId", Wire.json(this.orgId));
    json.put("offering", Wire.json(this.offering));
    json.put("geoId", Wire.json(this.geoId));
    json.put("installationId", Wire.json(this.installationId));
    json.put("resourceOwner", Wire.json(this.resourceOwner));
    json.put("approvedRegions", Wire.json(this.approvedRegions));
    json.put("readiness", Wire.json(this.readiness));
    json.put("revision", Wire.json(this.revision));
    json.put("consentRef", Wire.json(this.consentRef));
    json.put("environment", Wire.json(this.environment));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Deployment)) {
      return false;
    }
    Deployment that = (Deployment) other;
    return Objects.equals(this.deploymentId, that.deploymentId)
        && Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.offering, that.offering)
        && Objects.equals(this.geoId, that.geoId)
        && Objects.equals(this.installationId, that.installationId)
        && Objects.equals(this.resourceOwner, that.resourceOwner)
        && Objects.equals(this.approvedRegions, that.approvedRegions)
        && Objects.equals(this.readiness, that.readiness)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.consentRef, that.consentRef)
        && Objects.equals(this.environment, that.environment);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deploymentId, this.orgId, this.offering, this.geoId, this.installationId, this.resourceOwner, this.approvedRegions, this.readiness, this.revision, this.consentRef, this.environment);
  }

  @Override
  public String toString() {
    return "Deployment{deploymentId=" + this.deploymentId
        + ", orgId=" + this.orgId
        + ", offering=" + this.offering
        + ", geoId=" + this.geoId
        + ", installationId=" + this.installationId
        + ", resourceOwner=" + this.resourceOwner
        + ", approvedRegions=" + this.approvedRegions
        + ", readiness=" + this.readiness
        + ", revision=" + this.revision
        + ", consentRef=" + this.consentRef
        + ", environment=" + this.environment
        + "}";
  }
}
