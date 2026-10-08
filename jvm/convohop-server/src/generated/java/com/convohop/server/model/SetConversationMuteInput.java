// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>SetConversationMuteInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class SetConversationMuteInput implements WireValue {
  private final String conversationId;
  private final Boolean muted;
  private final @Nullable String until;
  private final @Nullable String actAsPrincipalId;

  private SetConversationMuteInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "SetConversationMuteInput.conversationId");
    this.muted = Wire.present(builder.muted, "SetConversationMuteInput.muted");
    this.until = builder.until;
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

  /** The <code>muted</code> field. */
  public Boolean getMuted() {
    return this.muted;
  }

  /** The <code>until</code> field. */
  public @Nullable String getUntil() {
    return this.until;
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
    json.put("muted", Wire.json(this.muted));
    if (this.until != null) {
      json.put("until", Wire.json(this.until));
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
    if (!(other instanceof SetConversationMuteInput)) {
      return false;
    }
    SetConversationMuteInput that = (SetConversationMuteInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.muted, that.muted)
        && Objects.equals(this.until, that.until)
        && Objects.equals(this.actAsPrincipalId, that.actAsPrincipalId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.muted, this.until, this.actAsPrincipalId);
  }

  @Override
  public String toString() {
    return "SetConversationMuteInput{conversationId=" + this.conversationId
        + ", muted=" + this.muted
        + ", until=" + this.until
        + ", actAsPrincipalId=" + this.actAsPrincipalId
        + "}";
  }

  /** Builds {@link SetConversationMuteInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable Boolean muted;
    private @Nullable String until;
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
     * Sets the <code>muted</code> field.
     *
     * <p>Required.
     *
     * @param muted the value
     * @return this builder
     */
    public Builder muted(Boolean muted) {
      this.muted = Wire.nonNull(muted, "muted");
      return this;
    }

    /**
     * Sets the <code>until</code> field.
     *
     * @param until the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder until(@Nullable String until) {
      this.until = until;
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
    public SetConversationMuteInput build() {
      return new SetConversationMuteInput(this);
    }
  }
}
