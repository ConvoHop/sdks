// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>DeploymentHealthRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class DeploymentHealthRequestInput implements WireValue {
  private final String deploymentId;

  private DeploymentHealthRequestInput(Builder builder) {
    this.deploymentId = Wire.present(builder.deploymentId, "DeploymentHealthRequestInput.deploymentId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>deploymentId</code> field. */
  public String getDeploymentId() {
    return this.deploymentId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deploymentId", Wire.json(this.deploymentId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof DeploymentHealthRequestInput)) {
      return false;
    }
    DeploymentHealthRequestInput that = (DeploymentHealthRequestInput) other;
    return Objects.equals(this.deploymentId, that.deploymentId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deploymentId);
  }

  @Override
  public String toString() {
    return "DeploymentHealthRequestInput{deploymentId=" + this.deploymentId
        + "}";
  }

  /** Builds {@link DeploymentHealthRequestInput} values. */
  public static final class Builder {
    private @Nullable String deploymentId;

    private Builder() {}

    /**
     * Sets the <code>deploymentId</code> field.
     *
     * <p>Required.
     *
     * @param deploymentId the value
     * @return this builder
     */
    public Builder deploymentId(String deploymentId) {
      this.deploymentId = Wire.nonNull(deploymentId, "deploymentId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public DeploymentHealthRequestInput build() {
      return new DeploymentHealthRequestInput(this);
    }
  }
}
