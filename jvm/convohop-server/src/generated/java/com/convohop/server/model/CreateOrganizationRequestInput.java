// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>CreateOrganizationRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class CreateOrganizationRequestInput implements WireValue {
  private final String name;
  private final String termsRef;

  private CreateOrganizationRequestInput(Builder builder) {
    this.name = Wire.present(builder.name, "CreateOrganizationRequestInput.name");
    this.termsRef = Wire.present(builder.termsRef, "CreateOrganizationRequestInput.termsRef");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>name</code> field. */
  public String getName() {
    return this.name;
  }

  /** The <code>termsRef</code> field. */
  public String getTermsRef() {
    return this.termsRef;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("name", Wire.json(this.name));
    json.put("termsRef", Wire.json(this.termsRef));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CreateOrganizationRequestInput)) {
      return false;
    }
    CreateOrganizationRequestInput that = (CreateOrganizationRequestInput) other;
    return Objects.equals(this.name, that.name)
        && Objects.equals(this.termsRef, that.termsRef);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.name, this.termsRef);
  }

  @Override
  public String toString() {
    return "CreateOrganizationRequestInput{name=" + this.name
        + ", termsRef=" + this.termsRef
        + "}";
  }

  /** Builds {@link CreateOrganizationRequestInput} values. */
  public static final class Builder {
    private @Nullable String name;
    private @Nullable String termsRef;

    private Builder() {}

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
     * Sets the <code>termsRef</code> field.
     *
     * <p>Required.
     *
     * @param termsRef the value
     * @return this builder
     */
    public Builder termsRef(String termsRef) {
      this.termsRef = Wire.nonNull(termsRef, "termsRef");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public CreateOrganizationRequestInput build() {
      return new CreateOrganizationRequestInput(this);
    }
  }
}
