// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>ConversationLiveInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ConversationLiveInput implements WireValue {
  private final String conversationId;

  private ConversationLiveInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "ConversationLiveInput.conversationId");
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

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ConversationLiveInput)) {
      return false;
    }
    ConversationLiveInput that = (ConversationLiveInput) other;
    return Objects.equals(this.conversationId, that.conversationId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId);
  }

  @Override
  public String toString() {
    return "ConversationLiveInput{conversationId=" + this.conversationId
        + "}";
  }

  /** Builds {@link ConversationLiveInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;

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
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ConversationLiveInput build() {
      return new ConversationLiveInput(this);
    }
  }
}
