// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>ConversationMuteInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ConversationMuteInput implements WireValue {
  private final String conversationId;
  private final @Nullable String actAsPrincipalId;

  private ConversationMuteInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "ConversationMuteInput.conversationId");
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

  /** The <code>actAsPrincipalId</code> field. */
  public @Nullable String getActAsPrincipalId() {
    return this.actAsPrincipalId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
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
    if (!(other instanceof ConversationMuteInput)) {
      return false;
    }
    ConversationMuteInput that = (ConversationMuteInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.actAsPrincipalId, that.actAsPrincipalId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.actAsPrincipalId);
  }

  @Override
  public String toString() {
    return "ConversationMuteInput{conversationId=" + this.conversationId
        + ", actAsPrincipalId=" + this.actAsPrincipalId
        + "}";
  }

  /** Builds {@link ConversationMuteInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
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
    public ConversationMuteInput build() {
      return new ConversationMuteInput(this);
    }
  }
}
