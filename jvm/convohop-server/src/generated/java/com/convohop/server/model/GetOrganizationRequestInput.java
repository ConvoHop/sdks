// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>GetOrganizationRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class GetOrganizationRequestInput implements WireValue {
  private final String orgId;

  private GetOrganizationRequestInput(Builder builder) {
    this.orgId = Wire.present(builder.orgId, "GetOrganizationRequestInput.orgId");
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

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("orgId", Wire.json(this.orgId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof GetOrganizationRequestInput)) {
      return false;
    }
    GetOrganizationRequestInput that = (GetOrganizationRequestInput) other;
    return Objects.equals(this.orgId, that.orgId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.orgId);
  }

  @Override
  public String toString() {
    return "GetOrganizationRequestInput{orgId=" + this.orgId
        + "}";
  }

  /** Builds {@link GetOrganizationRequestInput} values. */
  public static final class Builder {
    private @Nullable String orgId;

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
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public GetOrganizationRequestInput build() {
      return new GetOrganizationRequestInput(this);
    }
  }
}
