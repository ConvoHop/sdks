// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>MembersRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class MembersRequestInput implements WireValue {
  private final String conversationId;
  private final Integer limit;
  private final @Nullable String cursor;

  private MembersRequestInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "MembersRequestInput.conversationId");
    this.limit = Wire.present(builder.limit, "MembersRequestInput.limit");
    this.cursor = builder.cursor;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>limit</code> field. */
  public Integer getLimit() {
    return this.limit;
  }

  /** The <code>cursor</code> field. */
  public @Nullable String getCursor() {
    return this.cursor;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("limit", Wire.json(this.limit));
    if (this.cursor != null) {
      json.put("cursor", Wire.json(this.cursor));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof MembersRequestInput)) {
      return false;
    }
    MembersRequestInput that = (MembersRequestInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.limit, that.limit)
        && Objects.equals(this.cursor, that.cursor);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.limit, this.cursor);
  }

  @Override
  public String toString() {
    return "MembersRequestInput{conversationId=" + this.conversationId
        + ", limit=" + this.limit
        + ", cursor=" + this.cursor
        + "}";
  }

  /** Builds {@link MembersRequestInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable Integer limit;
    private @Nullable String cursor;

    private Builder() {}

    /**
     * Sets the <code>conversationId</code> field.
     *
     * <p>Required.
     *
     * @param conversationId the value
     * @return this builder
     */
    public Builder conversationId(String conversationId) {
      this.conversationId = Wire.nonNull(conversationId, "conversationId");
      return this;
    }

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
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public MembersRequestInput build() {
      return new MembersRequestInput(this);
    }
  }
}
