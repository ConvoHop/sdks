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
 * The <code>IssueAgentKeyRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class IssueAgentKeyRequestInput implements WireValue {
  private final List<String> scopes;
  private final @Nullable String expiresAt;

  private IssueAgentKeyRequestInput(Builder builder) {
    this.scopes = Wire.present(builder.scopes, "IssueAgentKeyRequestInput.scopes");
    this.expiresAt = builder.expiresAt;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>scopes</code> field. */
  public List<String> getScopes() {
    return this.scopes;
  }

  /** The <code>expiresAt</code> field. */
  public @Nullable String getExpiresAt() {
    return this.expiresAt;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("scopes", Wire.json(this.scopes));
    if (this.expiresAt != null) {
      json.put("expiresAt", Wire.json(this.expiresAt));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof IssueAgentKeyRequestInput)) {
      return false;
    }
    IssueAgentKeyRequestInput that = (IssueAgentKeyRequestInput) other;
    return Objects.equals(this.scopes, that.scopes)
        && Objects.equals(this.expiresAt, that.expiresAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.scopes, this.expiresAt);
  }

  @Override
  public String toString() {
    return "IssueAgentKeyRequestInput{scopes=" + this.scopes
        + ", expiresAt=" + this.expiresAt
        + "}";
  }

  /** Builds {@link IssueAgentKeyRequestInput} values. */
  public static final class Builder {
    private @Nullable List<String> scopes;
    private @Nullable String expiresAt;

    private Builder() {}

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
     * @param expiresAt the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder expiresAt(@Nullable String expiresAt) {
      this.expiresAt = expiresAt;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public IssueAgentKeyRequestInput build() {
      return new IssueAgentKeyRequestInput(this);
    }
  }
}
