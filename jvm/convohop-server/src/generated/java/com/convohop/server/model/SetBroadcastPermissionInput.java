// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>SetBroadcastPermissionInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class SetBroadcastPermissionInput implements WireValue {
  private final String conversationId;
  private final String principalId;
  private final Boolean allowed;
  private final String expectedMembershipRevision;

  private SetBroadcastPermissionInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "SetBroadcastPermissionInput.conversationId");
    this.principalId = Wire.present(builder.principalId, "SetBroadcastPermissionInput.principalId");
    this.allowed = Wire.present(builder.allowed, "SetBroadcastPermissionInput.allowed");
    this.expectedMembershipRevision = Wire.present(builder.expectedMembershipRevision, "SetBroadcastPermissionInput.expectedMembershipRevision");
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

  /** The <code>allowed</code> field. */
  public Boolean getAllowed() {
    return this.allowed;
  }

  /** The <code>expectedMembershipRevision</code> field. */
  public String getExpectedMembershipRevision() {
    return this.expectedMembershipRevision;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("principalId", Wire.json(this.principalId));
    json.put("allowed", Wire.json(this.allowed));
    json.put("expectedMembershipRevision", Wire.json(this.expectedMembershipRevision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SetBroadcastPermissionInput)) {
      return false;
    }
    SetBroadcastPermissionInput that = (SetBroadcastPermissionInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.allowed, that.allowed)
        && Objects.equals(this.expectedMembershipRevision, that.expectedMembershipRevision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.principalId, this.allowed, this.expectedMembershipRevision);
  }

  @Override
  public String toString() {
    return "SetBroadcastPermissionInput{conversationId=" + this.conversationId
        + ", principalId=" + this.principalId
        + ", allowed=" + this.allowed
        + ", expectedMembershipRevision=" + this.expectedMembershipRevision
        + "}";
  }

  /** Builds {@link SetBroadcastPermissionInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable String principalId;
    private @Nullable Boolean allowed;
    private @Nullable String expectedMembershipRevision;

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
     * Sets the <code>allowed</code> field.
     *
     * <p>Required.
     *
     * @param allowed the value
     * @return this builder
     */
    public Builder allowed(Boolean allowed) {
      this.allowed = Wire.nonNull(allowed, "allowed");
      return this;
    }

    /**
     * Sets the <code>expectedMembershipRevision</code> field.
     *
     * <p>Required.
     *
     * @param expectedMembershipRevision the value
     * @return this builder
     */
    public Builder expectedMembershipRevision(String expectedMembershipRevision) {
      this.expectedMembershipRevision = Wire.nonNull(expectedMembershipRevision, "expectedMembershipRevision");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public SetBroadcastPermissionInput build() {
      return new SetBroadcastPermissionInput(this);
    }
  }
}
