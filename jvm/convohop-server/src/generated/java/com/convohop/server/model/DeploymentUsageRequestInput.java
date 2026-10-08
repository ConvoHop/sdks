// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>DeploymentUsageRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class DeploymentUsageRequestInput implements WireValue {
  private final String deploymentId;
  private final @Nullable String from;
  private final @Nullable String to;

  private DeploymentUsageRequestInput(Builder builder) {
    this.deploymentId = Wire.present(builder.deploymentId, "DeploymentUsageRequestInput.deploymentId");
    this.from = builder.from;
    this.to = builder.to;
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

  /** The <code>from</code> field. */
  public @Nullable String getFrom() {
    return this.from;
  }

  /** The <code>to</code> field. */
  public @Nullable String getTo() {
    return this.to;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deploymentId", Wire.json(this.deploymentId));
    if (this.from != null) {
      json.put("from", Wire.json(this.from));
    }
    if (this.to != null) {
      json.put("to", Wire.json(this.to));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof DeploymentUsageRequestInput)) {
      return false;
    }
    DeploymentUsageRequestInput that = (DeploymentUsageRequestInput) other;
    return Objects.equals(this.deploymentId, that.deploymentId)
        && Objects.equals(this.from, that.from)
        && Objects.equals(this.to, that.to);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deploymentId, this.from, this.to);
  }

  @Override
  public String toString() {
    return "DeploymentUsageRequestInput{deploymentId=" + this.deploymentId
        + ", from=" + this.from
        + ", to=" + this.to
        + "}";
  }

  /** Builds {@link DeploymentUsageRequestInput} values. */
  public static final class Builder {
    private @Nullable String deploymentId;
    private @Nullable String from;
    private @Nullable String to;

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
     * Sets the <code>from</code> field.
     *
     * @param from the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder from(@Nullable String from) {
      this.from = from;
      return this;
    }

    /**
     * Sets the <code>to</code> field.
     *
     * @param to the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder to(@Nullable String to) {
      this.to = to;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public DeploymentUsageRequestInput build() {
      return new DeploymentUsageRequestInput(this);
    }
  }
}
