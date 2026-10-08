// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>CreateProjectRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class CreateProjectRequestInput implements WireValue {
  private final String deploymentId;
  private final String name;
  private final String environment;
  private final String backendPrincipalName;

  private CreateProjectRequestInput(Builder builder) {
    this.deploymentId = Wire.present(builder.deploymentId, "CreateProjectRequestInput.deploymentId");
    this.name = Wire.present(builder.name, "CreateProjectRequestInput.name");
    this.environment = Wire.present(builder.environment, "CreateProjectRequestInput.environment");
    this.backendPrincipalName = Wire.present(builder.backendPrincipalName, "CreateProjectRequestInput.backendPrincipalName");
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

  /** The <code>name</code> field. */
  public String getName() {
    return this.name;
  }

  /** The <code>environment</code> field. */
  public String getEnvironment() {
    return this.environment;
  }

  /** The <code>backendPrincipalName</code> field. */
  public String getBackendPrincipalName() {
    return this.backendPrincipalName;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deploymentId", Wire.json(this.deploymentId));
    json.put("name", Wire.json(this.name));
    json.put("environment", Wire.json(this.environment));
    json.put("backendPrincipalName", Wire.json(this.backendPrincipalName));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CreateProjectRequestInput)) {
      return false;
    }
    CreateProjectRequestInput that = (CreateProjectRequestInput) other;
    return Objects.equals(this.deploymentId, that.deploymentId)
        && Objects.equals(this.name, that.name)
        && Objects.equals(this.environment, that.environment)
        && Objects.equals(this.backendPrincipalName, that.backendPrincipalName);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deploymentId, this.name, this.environment, this.backendPrincipalName);
  }

  @Override
  public String toString() {
    return "CreateProjectRequestInput{deploymentId=" + this.deploymentId
        + ", name=" + this.name
        + ", environment=" + this.environment
        + ", backendPrincipalName=" + this.backendPrincipalName
        + "}";
  }

  /** Builds {@link CreateProjectRequestInput} values. */
  public static final class Builder {
    private @Nullable String deploymentId;
    private @Nullable String name;
    private @Nullable String environment;
    private @Nullable String backendPrincipalName;

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
     * Sets the <code>name</code> field.
     *
     * <p>Required.
     *
     * @param name the value
     * @return this builder
     */
    public Builder name(String name) {
      this.name = Wire.nonNull(name, "name");
      return this;
    }

    /**
     * Sets the <code>environment</code> field.
     *
     * <p>Required.
     *
     * @param environment the value
     * @return this builder
     */
    public Builder environment(String environment) {
      this.environment = Wire.nonNull(environment, "environment");
      return this;
    }

    /**
     * Sets the <code>backendPrincipalName</code> field.
     *
     * <p>Required.
     *
     * @param backendPrincipalName the value
     * @return this builder
     */
    public Builder backendPrincipalName(String backendPrincipalName) {
      this.backendPrincipalName = Wire.nonNull(backendPrincipalName, "backendPrincipalName");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public CreateProjectRequestInput build() {
      return new CreateProjectRequestInput(this);
    }
  }
}
