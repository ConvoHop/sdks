// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>SearchRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class SearchRequestInput implements WireValue {
  private final String query;
  private final Integer pageSize;
  private final @Nullable SearchScopeInput scope;
  private final @Nullable String cursor;
  private final @Nullable String actAsPrincipalId;

  private SearchRequestInput(Builder builder) {
    this.query = Wire.present(builder.query, "SearchRequestInput.query");
    this.pageSize = Wire.present(builder.pageSize, "SearchRequestInput.pageSize");
    this.scope = builder.scope;
    this.cursor = builder.cursor;
    this.actAsPrincipalId = builder.actAsPrincipalId;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>query</code> field. */
  public String getQuery() {
    return this.query;
  }

  /** The <code>pageSize</code> field. */
  public Integer getPageSize() {
    return this.pageSize;
  }

  /** The <code>scope</code> field. */
  public @Nullable SearchScopeInput getScope() {
    return this.scope;
  }

  /** The <code>cursor</code> field. */
  public @Nullable String getCursor() {
    return this.cursor;
  }

  /** The <code>actAsPrincipalId</code> field. */
  public @Nullable String getActAsPrincipalId() {
    return this.actAsPrincipalId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("query", Wire.json(this.query));
    json.put("pageSize", Wire.json(this.pageSize));
    if (this.scope != null) {
      json.put("scope", Wire.json(this.scope));
    }
    if (this.cursor != null) {
      json.put("cursor", Wire.json(this.cursor));
    }
    if (this.actAsPrincipalId != null) {
      json.put("actAsPrincipalId", Wire.json(this.actAsPrincipalId));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SearchRequestInput)) {
      return false;
    }
    SearchRequestInput that = (SearchRequestInput) other;
    return Objects.equals(this.query, that.query)
        && Objects.equals(this.pageSize, that.pageSize)
        && Objects.equals(this.scope, that.scope)
        && Objects.equals(this.cursor, that.cursor)
        && Objects.equals(this.actAsPrincipalId, that.actAsPrincipalId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.query, this.pageSize, this.scope, this.cursor, this.actAsPrincipalId);
  }

  @Override
  public String toString() {
    return "SearchRequestInput{query=" + this.query
        + ", pageSize=" + this.pageSize
        + ", scope=" + this.scope
        + ", cursor=" + this.cursor
        + ", actAsPrincipalId=" + this.actAsPrincipalId
        + "}";
  }

  /** Builds {@link SearchRequestInput} values. */
  public static final class Builder {
    private @Nullable String query;
    private @Nullable Integer pageSize;
    private @Nullable SearchScopeInput scope;
    private @Nullable String cursor;
    private @Nullable String actAsPrincipalId;

    private Builder() {}

    /**
     * Sets the <code>query</code> field.
     *
     * <p>Required.
     *
     * @param query the value
     * @return this builder
     */
    public Builder query(String query) {
      this.query = Wire.nonNull(query, "query");
      return this;
    }

    /**
     * Sets the <code>pageSize</code> field.
     *
     * <p>Required.
     *
     * @param pageSize the value
     * @return this builder
     */
    public Builder pageSize(Integer pageSize) {
      this.pageSize = Wire.nonNull(pageSize, "pageSize");
      return this;
    }

    /**
     * Sets the <code>scope</code> field.
     *
     * @param scope the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder scope(@Nullable SearchScopeInput scope) {
      this.scope = scope;
      return this;
    }

    /**
     * Sets the <code>cursor</code> field.
     *
     * @param cursor the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder cursor(@Nullable String cursor) {
      this.cursor = cursor;
      return this;
    }

    /**
     * Sets the <code>actAsPrincipalId</code> field.
     *
     * @param actAsPrincipalId the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder actAsPrincipalId(@Nullable String actAsPrincipalId) {
      this.actAsPrincipalId = actAsPrincipalId;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public SearchRequestInput build() {
      return new SearchRequestInput(this);
    }
  }
}
