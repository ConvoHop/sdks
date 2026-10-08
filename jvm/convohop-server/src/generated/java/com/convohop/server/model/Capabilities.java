// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Capabilities</code> result type. */
public final class Capabilities implements WireValue {
  private final String serverRelease;
  private final String capabilityRevision;
  private final String limitsRevision;
  private final @Nullable Features features;
  private final List<LimitEntry> limits;
  private final String environment;
  private final Boolean productionQualified;
  private final @Nullable MediaPolicy mediaPolicy;
  private final @Nullable String geoControlAuthorityId;
  private final List<String> offerings;
  private final List<String> geos;
  private final List<String> installationProfiles;
  private final @Nullable String portalIdentity;

  private Capabilities(
      String serverRelease,
      String capabilityRevision,
      String limitsRevision,
      @Nullable Features features,
      List<LimitEntry> limits,
      String environment,
      Boolean productionQualified,
      @Nullable MediaPolicy mediaPolicy,
      @Nullable String geoControlAuthorityId,
      List<String> offerings,
      List<String> geos,
      List<String> installationProfiles,
      @Nullable String portalIdentity) {
    this.serverRelease = serverRelease;
    this.capabilityRevision = capabilityRevision;
    this.limitsRevision = limitsRevision;
    this.features = features;
    this.limits = limits;
    this.environment = environment;
    this.productionQualified = productionQualified;
    this.mediaPolicy = mediaPolicy;
    this.geoControlAuthorityId = geoControlAuthorityId;
    this.offerings = offerings;
    this.geos = geos;
    this.installationProfiles = installationProfiles;
    this.portalIdentity = portalIdentity;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Capabilities fromJson(@Nullable Object value) {
    return Wire.required(Capabilities::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Capabilities decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Capabilities");
    return new Capabilities(
        Wire.field(object, "Capabilities", "serverRelease", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Capabilities", "capabilityRevision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Capabilities", "limitsRevision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Capabilities", "features", depth, Wire.optional(Features::decode)),
        Wire.field(object, "Capabilities", "limits", depth, Wire.required(Wire.list(Wire.required(LimitEntry::decode)))),
        Wire.field(object, "Capabilities", "environment", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Capabilities", "productionQualified", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Capabilities", "mediaPolicy", depth, Wire.optional(MediaPolicy::decode)),
        Wire.field(object, "Capabilities", "geoControlAuthorityId", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "Capabilities", "offerings", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "Capabilities", "geos", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "Capabilities", "installationProfiles", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "Capabilities", "portalIdentity", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>serverRelease</code> field. */
  public String getServerRelease() {
    return this.serverRelease;
  }

  /** The <code>capabilityRevision</code> field. */
  public String getCapabilityRevision() {
    return this.capabilityRevision;
  }

  /** The <code>limitsRevision</code> field. */
  public String getLimitsRevision() {
    return this.limitsRevision;
  }

  /** The <code>features</code> field. */
  public @Nullable Features getFeatures() {
    return this.features;
  }

  /** The <code>limits</code> field. */
  public List<LimitEntry> getLimits() {
    return this.limits;
  }

  /** The <code>environment</code> field. */
  public String getEnvironment() {
    return this.environment;
  }

  /** The <code>productionQualified</code> field. */
  public Boolean getProductionQualified() {
    return this.productionQualified;
  }

  /** The <code>mediaPolicy</code> field. */
  public @Nullable MediaPolicy getMediaPolicy() {
    return this.mediaPolicy;
  }

  /** The <code>geoControlAuthorityId</code> field. */
  public @Nullable String getGeoControlAuthorityId() {
    return this.geoControlAuthorityId;
  }

  /** The <code>offerings</code> field. */
  public List<String> getOfferings() {
    return this.offerings;
  }

  /** The <code>geos</code> field. */
  public List<String> getGeos() {
    return this.geos;
  }

  /** The <code>installationProfiles</code> field. */
  public List<String> getInstallationProfiles() {
    return this.installationProfiles;
  }

  /** The <code>portalIdentity</code> field. */
  public @Nullable String getPortalIdentity() {
    return this.portalIdentity;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("serverRelease", Wire.json(this.serverRelease));
    json.put("capabilityRevision", Wire.json(this.capabilityRevision));
    json.put("limitsRevision", Wire.json(this.limitsRevision));
    json.put("features", Wire.json(this.features));
    json.put("limits", Wire.json(this.limits));
    json.put("environment", Wire.json(this.environment));
    json.put("productionQualified", Wire.json(this.productionQualified));
    json.put("mediaPolicy", Wire.json(this.mediaPolicy));
    json.put("geoControlAuthorityId", Wire.json(this.geoControlAuthorityId));
    json.put("offerings", Wire.json(this.offerings));
    json.put("geos", Wire.json(this.geos));
    json.put("installationProfiles", Wire.json(this.installationProfiles));
    json.put("portalIdentity", Wire.json(this.portalIdentity));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Capabilities)) {
      return false;
    }
    Capabilities that = (Capabilities) other;
    return Objects.equals(this.serverRelease, that.serverRelease)
        && Objects.equals(this.capabilityRevision, that.capabilityRevision)
        && Objects.equals(this.limitsRevision, that.limitsRevision)
        && Objects.equals(this.features, that.features)
        && Objects.equals(this.limits, that.limits)
        && Objects.equals(this.environment, that.environment)
        && Objects.equals(this.productionQualified, that.productionQualified)
        && Objects.equals(this.mediaPolicy, that.mediaPolicy)
        && Objects.equals(this.geoControlAuthorityId, that.geoControlAuthorityId)
        && Objects.equals(this.offerings, that.offerings)
        && Objects.equals(this.geos, that.geos)
        && Objects.equals(this.installationProfiles, that.installationProfiles)
        && Objects.equals(this.portalIdentity, that.portalIdentity);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.serverRelease, this.capabilityRevision, this.limitsRevision, this.features, this.limits, this.environment, this.productionQualified, this.mediaPolicy, this.geoControlAuthorityId, this.offerings, this.geos, this.installationProfiles, this.portalIdentity);
  }

  @Override
  public String toString() {
    return "Capabilities{serverRelease=" + this.serverRelease
        + ", capabilityRevision=" + this.capabilityRevision
        + ", limitsRevision=" + this.limitsRevision
        + ", features=" + this.features
        + ", limits=" + this.limits
        + ", environment=" + this.environment
        + ", productionQualified=" + this.productionQualified
        + ", mediaPolicy=" + this.mediaPolicy
        + ", geoControlAuthorityId=" + this.geoControlAuthorityId
        + ", offerings=" + this.offerings
        + ", geos=" + this.geos
        + ", installationProfiles=" + this.installationProfiles
        + ", portalIdentity=" + this.portalIdentity
        + "}";
  }
}
