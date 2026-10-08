// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>EditMessageRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class EditMessageRequestInput implements WireValue {
  private final String conversationId;
  private final String messageId;
  private final String expectedRevision;
  private final @Nullable String text;
  private final @Nullable Map<String, @Nullable Object> props;

  private EditMessageRequestInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "EditMessageRequestInput.conversationId");
    this.messageId = Wire.present(builder.messageId, "EditMessageRequestInput.messageId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "EditMessageRequestInput.expectedRevision");
    this.text = builder.text;
    this.props = builder.props;
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

  /** The <code>text</code> field. */
  public @Nullable String getText() {
    return this.text;
  }

  /** The <code>props</code> field. */
  public @Nullable Map<String, @Nullable Object> getProps() {
    return this.props;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("messageId", Wire.json(this.messageId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    if (this.text != null) {
      json.put("text", Wire.json(this.text));
    }
    if (this.props != null) {
      json.put("props", Wire.json(this.props));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof EditMessageRequestInput)) {
      return false;
    }
    EditMessageRequestInput that = (EditMessageRequestInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.messageId, that.messageId)
        && Objects.equals(this.expectedRevision, that.expectedRevision)
        && Objects.equals(this.text, that.text)
        && Objects.equals(this.props, that.props);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.messageId, this.expectedRevision, this.text, this.props);
  }

  @Override
  public String toString() {
    return "EditMessageRequestInput{conversationId=" + this.conversationId
        + ", messageId=" + this.messageId
        + ", expectedRevision=" + this.expectedRevision
        + ", text=" + this.text
        + ", props=" + this.props
        + "}";
  }

  /** Builds {@link EditMessageRequestInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable String messageId;
    private @Nullable String expectedRevision;
    private @Nullable String text;
    private @Nullable Map<String, @Nullable Object> props;

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
     * Sets the <code>text</code> field.
     *
     * @param text the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder text(@Nullable String text) {
      this.text = text;
      return this;
    }

    /**
     * Sets the <code>props</code> field.
     *
     * @param props the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder props(@Nullable Map<String, @Nullable Object> props) {
      this.props = Wire.immutable(props);
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public EditMessageRequestInput build() {
      return new EditMessageRequestInput(this);
    }
  }
}
