// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>GetProjectRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class GetProjectRequestInput implements WireValue {
  private final String projectId;

  private GetProjectRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "GetProjectRequestInput.projectId");
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

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof GetProjectRequestInput)) {
      return false;
    }
    GetProjectRequestInput that = (GetProjectRequestInput) other;
    return Objects.equals(this.projectId, that.projectId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId);
  }

  @Override
  public String toString() {
    return "GetProjectRequestInput{projectId=" + this.projectId
        + "}";
  }

  /** Builds {@link GetProjectRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;

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
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public GetProjectRequestInput build() {
      return new GetProjectRequestInput(this);
    }
  }
}
