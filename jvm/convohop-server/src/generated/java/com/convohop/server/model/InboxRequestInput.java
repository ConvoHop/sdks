// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>InboxRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class InboxRequestInput implements WireValue {
  private final Integer limit;
  private final @Nullable String cursor;
  private final @Nullable String actAsPrincipalId;

  private InboxRequestInput(Builder builder) {
    this.limit = Wire.present(builder.limit, "InboxRequestInput.limit");
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

  /** The <code>limit</code> field. */
  public Integer getLimit() {
    return this.limit;
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
    json.put("limit", Wire.json(this.limit));
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
    if (!(other instanceof InboxRequestInput)) {
      return false;
    }
    InboxRequestInput that = (InboxRequestInput) other;
    return Objects.equals(this.limit, that.limit)
        && Objects.equals(this.cursor, that.cursor)
        && Objects.equals(this.actAsPrincipalId, that.actAsPrincipalId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.limit, this.cursor, this.actAsPrincipalId);
  }

  @Override
  public String toString() {
    return "InboxRequestInput{limit=" + this.limit
        + ", cursor=" + this.cursor
        + ", actAsPrincipalId=" + this.actAsPrincipalId
        + "}";
  }

  /** Builds {@link InboxRequestInput} values. */
  public static final class Builder {
    private @Nullable Integer limit;
    private @Nullable String cursor;
    private @Nullable String actAsPrincipalId;

    private Builder() {}

    /**
     * Sets the <code>limit</code> field.
     *
     * <p>Required.
     *
     * @param limit the value
     * @return this builder
     */
    public Builder limit(Integer limit) {
      this.limit = Wire.nonNull(limit, "limit");
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
    public InboxRequestInput build() {
      return new InboxRequestInput(this);
    }
  }
}
