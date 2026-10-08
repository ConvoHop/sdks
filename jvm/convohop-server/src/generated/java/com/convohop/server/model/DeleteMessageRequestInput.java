// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>DeleteMessageRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class DeleteMessageRequestInput implements WireValue {
  private final String conversationId;
  private final String messageId;
  private final String expectedRevision;

  private DeleteMessageRequestInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "DeleteMessageRequestInput.conversationId");
    this.messageId = Wire.present(builder.messageId, "DeleteMessageRequestInput.messageId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "DeleteMessageRequestInput.expectedRevision");
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

  /** The <code>messageId</code> field. */
  public String getMessageId() {
    return this.messageId;
  }

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("messageId", Wire.json(this.messageId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof DeleteMessageRequestInput)) {
      return false;
    }
    DeleteMessageRequestInput that = (DeleteMessageRequestInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.messageId, that.messageId)
        && Objects.equals(this.expectedRevision, that.expectedRevision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.messageId, this.expectedRevision);
  }

  @Override
  public String toString() {
    return "DeleteMessageRequestInput{conversationId=" + this.conversationId
        + ", messageId=" + this.messageId
        + ", expectedRevision=" + this.expectedRevision
        + "}";
  }

  /** Builds {@link DeleteMessageRequestInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable String messageId;
    private @Nullable String expectedRevision;

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
     * Sets the <code>messageId</code> field.
     *
     * <p>Required.
     *
     * @param messageId the value
     * @return this builder
     */
    public Builder messageId(String messageId) {
      this.messageId = Wire.nonNull(messageId, "messageId");
      return this;
    }

    /**
     * Sets the <code>expectedRevision</code> field.
     *
     * <p>Required.
     *
     * @param expectedRevision the value
     * @return this builder
     */
    public Builder expectedRevision(String expectedRevision) {
      this.expectedRevision = Wire.nonNull(expectedRevision, "expectedRevision");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public DeleteMessageRequestInput build() {
      return new DeleteMessageRequestInput(this);
    }
  }
}
