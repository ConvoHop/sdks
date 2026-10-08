// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>CreateConversationRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class CreateConversationRequestInput implements WireValue {
  private final String title;
  private final Map<String, @Nullable Object> props;
  private final List<MemberInputInput> members;

  private CreateConversationRequestInput(Builder builder) {
    this.title = Wire.present(builder.title, "CreateConversationRequestInput.title");
    this.props = Wire.present(builder.props, "CreateConversationRequestInput.props");
    this.members = Wire.present(builder.members, "CreateConversationRequestInput.members");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>title</code> field. */
  public String getTitle() {
    return this.title;
  }

  /** The <code>props</code> field. */
  public Map<String, @Nullable Object> getProps() {
    return this.props;
  }

  /** The <code>members</code> field. */
  public List<MemberInputInput> getMembers() {
    return this.members;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("title", Wire.json(this.title));
    json.put("props", Wire.json(this.props));
    json.put("members", Wire.json(this.members));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CreateConversationRequestInput)) {
      return false;
    }
    CreateConversationRequestInput that = (CreateConversationRequestInput) other;
    return Objects.equals(this.title, that.title)
        && Objects.equals(this.props, that.props)
        && Objects.equals(this.members, that.members);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.title, this.props, this.members);
  }

  @Override
  public String toString() {
    return "CreateConversationRequestInput{title=" + this.title
        + ", props=" + this.props
        + ", members=" + this.members
        + "}";
  }

  /** Builds {@link CreateConversationRequestInput} values. */
  public static final class Builder {
    private @Nullable String title;
    private @Nullable Map<String, @Nullable Object> props;
    private @Nullable List<MemberInputInput> members;

    private Builder() {}

    /**
     * Sets the <code>title</code> field.
     *
     * <p>Required.
     *
     * @param title the value
     * @return this builder
     */
    public Builder title(String title) {
      this.title = Wire.nonNull(title, "title");
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
     * Sets the <code>members</code> field.
     *
     * <p>Required.
     *
     * @param members the value
     * @return this builder
     */
    public Builder members(List<MemberInputInput> members) {
      this.members = Wire.immutable(Wire.nonNull(members, "members"));
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public CreateConversationRequestInput build() {
      return new CreateConversationRequestInput(this);
    }
  }
}
