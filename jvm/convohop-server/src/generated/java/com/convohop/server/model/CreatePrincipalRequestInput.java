// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>CreatePrincipalRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class CreatePrincipalRequestInput implements WireValue {
  private final String externalUserId;

  private CreatePrincipalRequestInput(Builder builder) {
    this.externalUserId = Wire.present(builder.externalUserId, "CreatePrincipalRequestInput.externalUserId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>externalUserId</code> field. */
  public String getExternalUserId() {
    return this.externalUserId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("externalUserId", Wire.json(this.externalUserId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CreatePrincipalRequestInput)) {
      return false;
    }
    CreatePrincipalRequestInput that = (CreatePrincipalRequestInput) other;
    return Objects.equals(this.externalUserId, that.externalUserId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.externalUserId);
  }

  @Override
  public String toString() {
    return "CreatePrincipalRequestInput{externalUserId=" + this.externalUserId
        + "}";
  }

  /** Builds {@link CreatePrincipalRequestInput} values. */
  public static final class Builder {
    private @Nullable String externalUserId;

    private Builder() {}

    /**
     * Sets the <code>externalUserId</code> field.
     *
     * <p>Required.
     *
     * @param externalUserId the value
     * @return this builder
     */
    public Builder externalUserId(String externalUserId) {
      this.externalUserId = Wire.nonNull(externalUserId, "externalUserId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public CreatePrincipalRequestInput build() {
      return new CreatePrincipalRequestInput(this);
    }
  }
}
