// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>ProjectPolicyRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ProjectPolicyRequestInput implements WireValue {
  private final String projectId;
  private final String expectedRevision;
  private final PolicyChangeInput change;

  private ProjectPolicyRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "ProjectPolicyRequestInput.projectId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "ProjectPolicyRequestInput.expectedRevision");
    this.change = Wire.present(builder.change, "ProjectPolicyRequestInput.change");
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

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The <code>change</code> field. */
  public PolicyChangeInput getChange() {
    return this.change;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    json.put("change", Wire.json(this.change));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ProjectPolicyRequestInput)) {
      return false;
    }
    ProjectPolicyRequestInput that = (ProjectPolicyRequestInput) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.expectedRevision, that.expectedRevision)
        && Objects.equals(this.change, that.change);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.expectedRevision, this.change);
  }

  @Override
  public String toString() {
    return "ProjectPolicyRequestInput{projectId=" + this.projectId
        + ", expectedRevision=" + this.expectedRevision
        + ", change=" + this.change
        + "}";
  }

  /** Builds {@link ProjectPolicyRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;
    private @Nullable String expectedRevision;
    private @Nullable PolicyChangeInput change;

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
     * Sets the <code>expectedRevision</code> field.
     *
     * <p>Required.
     *
     * @param expectedRevision the value
     * @return this builder
     */
    public Builder expectedRevision(String expectedRevision) {
      this.expectedRevision = Wire.nonNull(expectedRevision, "expectedRevision");
      return this;
    }

    /**
     * Sets the <code>change</code> field.
     *
     * <p>Required.
     *
     * @param change the value
     * @return this builder
     */
    public Builder change(PolicyChangeInput change) {
      this.change = Wire.nonNull(change, "change");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ProjectPolicyRequestInput build() {
      return new ProjectPolicyRequestInput(this);
    }
  }
}
