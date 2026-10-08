// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>AddMemberRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class AddMemberRequestInput implements WireValue {
  private final String conversationId;
  private final String principalId;
  private final String role;
  private final String expectedRevision;

  private AddMemberRequestInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "AddMemberRequestInput.conversationId");
    this.principalId = Wire.present(builder.principalId, "AddMemberRequestInput.principalId");
    this.role = Wire.present(builder.role, "AddMemberRequestInput.role");
    this.expectedRevision = Wire.present(builder.expectedRevision, "AddMemberRequestInput.expectedRevision");
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

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>role</code> field. */
  public String getRole() {
    return this.role;
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
    json.put("principalId", Wire.json(this.principalId));
    json.put("role", Wire.json(this.role));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AddMemberRequestInput)) {
      return false;
    }
    AddMemberRequestInput that = (AddMemberRequestInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.role, that.role)
        && Objects.equals(this.expectedRevision, that.expectedRevision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.principalId, this.role, this.expectedRevision);
  }

  @Override
  public String toString() {
    return "AddMemberRequestInput{conversationId=" + this.conversationId
        + ", principalId=" + this.principalId
        + ", role=" + this.role
        + ", expectedRevision=" + this.expectedRevision
        + "}";
  }

  /** Builds {@link AddMemberRequestInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable String principalId;
    private @Nullable String role;
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
     * Sets the <code>principalId</code> field.
     *
     * <p>Required.
     *
     * @param principalId the value
     * @return this builder
     */
    public Builder principalId(String principalId) {
      this.principalId = Wire.nonNull(principalId, "principalId");
      return this;
    }

    /**
     * Sets the <code>role</code> field.
     *
     * <p>Required.
     *
     * @param role the value
     * @return this builder
     */
    public Builder role(String role) {
      this.role = Wire.nonNull(role, "role");
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
    public AddMemberRequestInput build() {
      return new AddMemberRequestInput(this);
    }
  }
}
