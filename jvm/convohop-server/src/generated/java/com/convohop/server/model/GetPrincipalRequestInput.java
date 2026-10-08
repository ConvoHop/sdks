// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>GetPrincipalRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class GetPrincipalRequestInput implements WireValue {
  private final String principalId;

  private GetPrincipalRequestInput(Builder builder) {
    this.principalId = Wire.present(builder.principalId, "GetPrincipalRequestInput.principalId");
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

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("principalId", Wire.json(this.principalId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof GetPrincipalRequestInput)) {
      return false;
    }
    GetPrincipalRequestInput that = (GetPrincipalRequestInput) other;
    return Objects.equals(this.principalId, that.principalId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.principalId);
  }

  @Override
  public String toString() {
    return "GetPrincipalRequestInput{principalId=" + this.principalId
        + "}";
  }

  /** Builds {@link GetPrincipalRequestInput} values. */
  public static final class Builder {
    private @Nullable String principalId;

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
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public GetPrincipalRequestInput build() {
      return new GetPrincipalRequestInput(this);
    }
  }
}
