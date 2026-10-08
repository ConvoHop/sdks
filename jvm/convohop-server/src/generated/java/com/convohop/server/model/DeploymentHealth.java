// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>DeploymentHealth</code> result type. */
public final class DeploymentHealth implements WireValue {
  private final String deploymentId;
  private final String readiness;
  private final String observedAt;
  private final List<ServiceObservation> services;

  private DeploymentHealth(
      String deploymentId,
      String readiness,
      String observedAt,
      List<ServiceObservation> services) {
    this.deploymentId = deploymentId;
    this.readiness = readiness;
    this.observedAt = observedAt;
    this.services = services;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static DeploymentHealth fromJson(@Nullable Object value) {
    return Wire.required(DeploymentHealth::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static DeploymentHealth decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "DeploymentHealth");
    return new DeploymentHealth(
        Wire.field(object, "DeploymentHealth", "deploymentId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "DeploymentHealth", "readiness", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "DeploymentHealth", "observedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "DeploymentHealth", "services", depth, Wire.required(Wire.list(Wire.required(ServiceObservation::decode)))));
  }

  /** The <code>deploymentId</code> field. */
  public String getDeploymentId() {
    return this.deploymentId;
  }

  /** The <code>readiness</code> field. */
  public String getReadiness() {
    return this.readiness;
  }

  /** The <code>observedAt</code> field. */
  public String getObservedAt() {
    return this.observedAt;
  }

  /** The <code>services</code> field. */
  public List<ServiceObservation> getServices() {
    return this.services;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deploymentId", Wire.json(this.deploymentId));
    json.put("readiness", Wire.json(this.readiness));
    json.put("observedAt", Wire.json(this.observedAt));
    json.put("services", Wire.json(this.services));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof DeploymentHealth)) {
      return false;
    }
    DeploymentHealth that = (DeploymentHealth) other;
    return Objects.equals(this.deploymentId, that.deploymentId)
        && Objects.equals(this.readiness, that.readiness)
        && Objects.equals(this.observedAt, that.observedAt)
        && Objects.equals(this.services, that.services);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deploymentId, this.readiness, this.observedAt, this.services);
  }

  @Override
  public String toString() {
    return "DeploymentHealth{deploymentId=" + this.deploymentId
        + ", readiness=" + this.readiness
        + ", observedAt=" + this.observedAt
        + ", services=" + this.services
        + "}";
  }
}
