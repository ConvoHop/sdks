// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>IssueBackendKeyRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class IssueBackendKeyRequestInput implements WireValue {
  private final String projectId;
  private final String name;
  private final List<String> scopes;
  private final String expiresAt;

  private IssueBackendKeyRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "IssueBackendKeyRequestInput.projectId");
    this.name = Wire.present(builder.name, "IssueBackendKeyRequestInput.name");
    this.scopes = Wire.present(builder.scopes, "IssueBackendKeyRequestInput.scopes");
    this.expiresAt = Wire.present(builder.expiresAt, "IssueBackendKeyRequestInput.expiresAt");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>projectId</code> field. */
  public String getProjectId() {
    return this.projectId;
  }

  /** The <code>name</code> field. */
  public String getName() {
    return this.name;
  }

  /** The <code>scopes</code> field. */
  public List<String> getScopes() {
    return this.scopes;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("name", Wire.json(this.name));
    json.put("scopes", Wire.json(this.scopes));
    json.put("expiresAt", Wire.json(this.expiresAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof IssueBackendKeyRequestInput)) {
      return false;
    }
    IssueBackendKeyRequestInput that = (IssueBackendKeyRequestInput) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.name, that.name)
        && Objects.equals(this.scopes, that.scopes)
        && Objects.equals(this.expiresAt, that.expiresAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.name, this.scopes, this.expiresAt);
  }

  @Override
  public String toString() {
    return "IssueBackendKeyRequestInput{projectId=" + this.projectId
        + ", name=" + this.name
        + ", scopes=" + this.scopes
        + ", expiresAt=" + this.expiresAt
        + "}";
  }

  /** Builds {@link IssueBackendKeyRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;
    private @Nullable String name;
    private @Nullable List<String> scopes;
    private @Nullable String expiresAt;

    private Builder() {}

    /**
     * Sets the <code>projectId</code> field.
     *
     * <p>Required.
     *
     * @param projectId the value
     * @return this builder
     */
    public Builder projectId(String projectId) {
      this.projectId = Wire.nonNull(projectId, "projectId");
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
     * Sets the <code>scopes</code> field.
     *
     * <p>Required.
     *
     * @param scopes the value
     * @return this builder
     */
    public Builder scopes(List<String> scopes) {
      this.scopes = Wire.immutable(Wire.nonNull(scopes, "scopes"));
      return this;
    }

    /**
     * Sets the <code>expiresAt</code> field.
     *
     * <p>Required.
     *
     * @param expiresAt the value
     * @return this builder
     */
    public Builder expiresAt(String expiresAt) {
      this.expiresAt = Wire.nonNull(expiresAt, "expiresAt");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public IssueBackendKeyRequestInput build() {
      return new IssueBackendKeyRequestInput(this);
    }
  }
}
