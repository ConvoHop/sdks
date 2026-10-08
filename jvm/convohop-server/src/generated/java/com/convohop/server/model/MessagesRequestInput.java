// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>MessagesRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class MessagesRequestInput implements WireValue {
  private final String conversationId;
  private final Integer limit;
  private final @Nullable String beforeSequence;
  private final @Nullable String actAsPrincipalId;

  private MessagesRequestInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "MessagesRequestInput.conversationId");
    this.limit = Wire.present(builder.limit, "MessagesRequestInput.limit");
    this.beforeSequence = builder.beforeSequence;
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

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>limit</code> field. */
  public Integer getLimit() {
    return this.limit;
  }

  /** The <code>beforeSequence</code> field. */
  public @Nullable String getBeforeSequence() {
    return this.beforeSequence;
  }

  /** The <code>actAsPrincipalId</code> field. */
  public @Nullable String getActAsPrincipalId() {
    return this.actAsPrincipalId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("limit", Wire.json(this.limit));
    if (this.beforeSequence != null) {
      json.put("beforeSequence", Wire.json(this.beforeSequence));
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
    if (!(other instanceof MessagesRequestInput)) {
      return false;
    }
    MessagesRequestInput that = (MessagesRequestInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.limit, that.limit)
        && Objects.equals(this.beforeSequence, that.beforeSequence)
        && Objects.equals(this.actAsPrincipalId, that.actAsPrincipalId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.limit, this.beforeSequence, this.actAsPrincipalId);
  }

  @Override
  public String toString() {
    return "MessagesRequestInput{conversationId=" + this.conversationId
        + ", limit=" + this.limit
        + ", beforeSequence=" + this.beforeSequence
        + ", actAsPrincipalId=" + this.actAsPrincipalId
        + "}";
  }

  /** Builds {@link MessagesRequestInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable Integer limit;
    private @Nullable String beforeSequence;
    private @Nullable String actAsPrincipalId;

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
     * Sets the <code>beforeSequence</code> field.
     *
     * @param beforeSequence the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder beforeSequence(@Nullable String beforeSequence) {
      this.beforeSequence = beforeSequence;
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
    public MessagesRequestInput build() {
      return new MessagesRequestInput(this);
    }
  }
}
