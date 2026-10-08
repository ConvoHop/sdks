// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>SendMessageRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class SendMessageRequestInput implements WireValue {
  private final String conversationId;
  private final String text;
  private final Map<String, @Nullable Object> props;
  private final @Nullable String actAsPrincipalId;

  private SendMessageRequestInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "SendMessageRequestInput.conversationId");
    this.text = Wire.present(builder.text, "SendMessageRequestInput.text");
    this.props = Wire.present(builder.props, "SendMessageRequestInput.props");
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

  /** The <code>text</code> field. */
  public String getText() {
    return this.text;
  }

  /** The <code>props</code> field. */
  public Map<String, @Nullable Object> getProps() {
    return this.props;
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
    json.put("text", Wire.json(this.text));
    json.put("props", Wire.json(this.props));
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
    if (!(other instanceof SendMessageRequestInput)) {
      return false;
    }
    SendMessageRequestInput that = (SendMessageRequestInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.text, that.text)
        && Objects.equals(this.props, that.props)
        && Objects.equals(this.actAsPrincipalId, that.actAsPrincipalId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.text, this.props, this.actAsPrincipalId);
  }

  @Override
  public String toString() {
    return "SendMessageRequestInput{conversationId=" + this.conversationId
        + ", text=" + this.text
        + ", props=" + this.props
        + ", actAsPrincipalId=" + this.actAsPrincipalId
        + "}";
  }

  /** Builds {@link SendMessageRequestInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable String text;
    private @Nullable Map<String, @Nullable Object> props;
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
     * Sets the <code>text</code> field.
     *
     * <p>Required.
     *
     * @param text the value
     * @return this builder
     */
    public Builder text(String text) {
      this.text = Wire.nonNull(text, "text");
      return this;
    }

    /**
     * Sets the <code>props</code> field.
     *
     * <p>Required.
     *
     * @param props the value
     * @return this builder
     */
    public Builder props(Map<String, @Nullable Object> props) {
      this.props = Wire.immutable(Wire.nonNull(props, "props"));
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
    public SendMessageRequestInput build() {
      return new SendMessageRequestInput(this);
    }
  }
}
