// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>DisablePrincipalRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class DisablePrincipalRequestInput implements WireValue {
  private final String principalId;
  private final String expectedRevision;

  private DisablePrincipalRequestInput(Builder builder) {
    this.principalId = Wire.present(builder.principalId, "DisablePrincipalRequestInput.principalId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "DisablePrincipalRequestInput.expectedRevision");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("principalId", Wire.json(this.principalId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof DisablePrincipalRequestInput)) {
      return false;
    }
    DisablePrincipalRequestInput that = (DisablePrincipalRequestInput) other;
    return Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.expectedRevision, that.expectedRevision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.principalId, this.expectedRevision);
  }

  @Override
  public String toString() {
    return "DisablePrincipalRequestInput{principalId=" + this.principalId
        + ", expectedRevision=" + this.expectedRevision
        + "}";
  }

  /** Builds {@link DisablePrincipalRequestInput} values. */
  public static final class Builder {
    private @Nullable String principalId;
    private @Nullable String expectedRevision;

    private Builder() {}

    /**
     * Sets the <code>principalId</code> field.
     *
     * <p>Required.
     *
     * @param principalId the value
     * @return this builder
     */
    public Builder principalId(String principalId) {
      this.principalId = Wire.nonNull(principalId, "principalId");
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
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public DisablePrincipalRequestInput build() {
      return new DisablePrincipalRequestInput(this);
    }
  }
}
