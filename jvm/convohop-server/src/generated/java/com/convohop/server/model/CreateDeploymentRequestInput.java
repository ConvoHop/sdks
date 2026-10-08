// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>CreateDeploymentRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class CreateDeploymentRequestInput implements WireValue {
  private final String orgId;
  private final String offering;
  private final String geoId;
  private final String installationProfileId;
  private final String consentRef;

  private CreateDeploymentRequestInput(Builder builder) {
    this.orgId = Wire.present(builder.orgId, "CreateDeploymentRequestInput.orgId");
    this.offering = Wire.present(builder.offering, "CreateDeploymentRequestInput.offering");
    this.geoId = Wire.present(builder.geoId, "CreateDeploymentRequestInput.geoId");
    this.installationProfileId = Wire.present(builder.installationProfileId, "CreateDeploymentRequestInput.installationProfileId");
    this.consentRef = Wire.present(builder.consentRef, "CreateDeploymentRequestInput.consentRef");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
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

  /** The <code>installationProfileId</code> field. */
  public String getInstallationProfileId() {
    return this.installationProfileId;
  }

  /** The <code>consentRef</code> field. */
  public String getConsentRef() {
    return this.consentRef;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("orgId", Wire.json(this.orgId));
    json.put("offering", Wire.json(this.offering));
    json.put("geoId", Wire.json(this.geoId));
    json.put("installationProfileId", Wire.json(this.installationProfileId));
    json.put("consentRef", Wire.json(this.consentRef));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CreateDeploymentRequestInput)) {
      return false;
    }
    CreateDeploymentRequestInput that = (CreateDeploymentRequestInput) other;
    return Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.offering, that.offering)
        && Objects.equals(this.geoId, that.geoId)
        && Objects.equals(this.installationProfileId, that.installationProfileId)
        && Objects.equals(this.consentRef, that.consentRef);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.orgId, this.offering, this.geoId, this.installationProfileId, this.consentRef);
  }

  @Override
  public String toString() {
    return "CreateDeploymentRequestInput{orgId=" + this.orgId
        + ", offering=" + this.offering
        + ", geoId=" + this.geoId
        + ", installationProfileId=" + this.installationProfileId
        + ", consentRef=" + this.consentRef
        + "}";
  }

  /** Builds {@link CreateDeploymentRequestInput} values. */
  public static final class Builder {
    private @Nullable String orgId;
    private @Nullable String offering;
    private @Nullable String geoId;
    private @Nullable String installationProfileId;
    private @Nullable String consentRef;

    private Builder() {}

    /**
     * Sets the <code>orgId</code> field.
     *
     * <p>Required.
     *
     * @param orgId the value
     * @return this builder
     */
    public Builder orgId(String orgId) {
      this.orgId = Wire.nonNull(orgId, "orgId");
      return this;
    }

    /**
     * Sets the <code>offering</code> field.
     *
     * <p>Required.
     *
     * @param offering the value
     * @return this builder
     */
    public Builder offering(String offering) {
      this.offering = Wire.nonNull(offering, "offering");
      return this;
    }

    /**
     * Sets the <code>geoId</code> field.
     *
     * <p>Required.
     *
     * @param geoId the value
     * @return this builder
     */
    public Builder geoId(String geoId) {
      this.geoId = Wire.nonNull(geoId, "geoId");
      return this;
    }

    /**
     * Sets the <code>installationProfileId</code> field.
     *
     * <p>Required.
     *
     * @param installationProfileId the value
     * @return this builder
     */
    public Builder installationProfileId(String installationProfileId) {
      this.installationProfileId = Wire.nonNull(installationProfileId, "installationProfileId");
      return this;
    }

    /**
     * Sets the <code>consentRef</code> field.
     *
     * <p>Required.
     *
     * @param consentRef the value
     * @return this builder
     */
    public Builder consentRef(String consentRef) {
      this.consentRef = Wire.nonNull(consentRef, "consentRef");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public CreateDeploymentRequestInput build() {
      return new CreateDeploymentRequestInput(this);
    }
  }
}
