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
 * The <code>AddMembersInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class AddMembersInput implements WireValue {
  private final String conversationId;
  private final List<MemberBatchEntryInput> members;

  private AddMembersInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "AddMembersInput.conversationId");
    this.members = Wire.present(builder.members, "AddMembersInput.members");
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

  /** The <code>members</code> field. */
  public List<MemberBatchEntryInput> getMembers() {
    return this.members;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("members", Wire.json(this.members));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AddMembersInput)) {
      return false;
    }
    AddMembersInput that = (AddMembersInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.members, that.members);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.members);
  }

  @Override
  public String toString() {
    return "AddMembersInput{conversationId=" + this.conversationId
        + ", members=" + this.members
        + "}";
  }

  /** Builds {@link AddMembersInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable List<MemberBatchEntryInput> members;

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
     * Sets the <code>members</code> field.
     *
     * <p>Required.
     *
     * @param members the value
     * @return this builder
     */
    public Builder members(List<MemberBatchEntryInput> members) {
      this.members = Wire.immutable(Wire.nonNull(members, "members"));
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public AddMembersInput build() {
      return new AddMembersInput(this);
    }
  }
}
