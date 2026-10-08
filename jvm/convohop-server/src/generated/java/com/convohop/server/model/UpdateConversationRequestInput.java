// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>UpdateConversationRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class UpdateConversationRequestInput implements WireValue {
  private final String conversationId;
  private final String expectedRevision;
  private final @Nullable String title;
  private final @Nullable Map<String, @Nullable Object> props;

  private UpdateConversationRequestInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "UpdateConversationRequestInput.conversationId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "UpdateConversationRequestInput.expectedRevision");
    this.title = builder.title;
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

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The <code>title</code> field. */
  public @Nullable String getTitle() {
    return this.title;
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
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    if (this.title != null) {
      json.put("title", Wire.json(this.title));
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
    if (!(other instanceof UpdateConversationRequestInput)) {
      return false;
    }
    UpdateConversationRequestInput that = (UpdateConversationRequestInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.expectedRevision, that.expectedRevision)
        && Objects.equals(this.title, that.title)
        && Objects.equals(this.props, that.props);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.expectedRevision, this.title, this.props);
  }

  @Override
  public String toString() {
    return "UpdateConversationRequestInput{conversationId=" + this.conversationId
        + ", expectedRevision=" + this.expectedRevision
        + ", title=" + this.title
        + ", props=" + this.props
        + "}";
  }

  /** Builds {@link UpdateConversationRequestInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable String expectedRevision;
    private @Nullable String title;
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
     * Sets the <code>title</code> field.
     *
     * @param title the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder title(@Nullable String title) {
      this.title = title;
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
    public UpdateConversationRequestInput build() {
      return new UpdateConversationRequestInput(this);
    }
  }
}
