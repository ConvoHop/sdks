// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>AgentSignupForApprovalRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class AgentSignupForApprovalRequestInput implements WireValue {
  private final String approvalToken;

  private AgentSignupForApprovalRequestInput(Builder builder) {
    this.approvalToken = Wire.present(builder.approvalToken, "AgentSignupForApprovalRequestInput.approvalToken");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>approvalToken</code> field. */
  public String getApprovalToken() {
    return this.approvalToken;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("approvalToken", Wire.json(this.approvalToken));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentSignupForApprovalRequestInput)) {
      return false;
    }
    AgentSignupForApprovalRequestInput that = (AgentSignupForApprovalRequestInput) other;
    return Objects.equals(this.approvalToken, that.approvalToken);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.approvalToken);
  }

  @Override
  public String toString() {
    return "AgentSignupForApprovalRequestInput{approvalToken=" + Wire.redacted(this.approvalToken)
        + "}";
  }

  /** Builds {@link AgentSignupForApprovalRequestInput} values. */
  public static final class Builder {
    private @Nullable String approvalToken;

    private Builder() {}

    /**
     * Sets the <code>approvalToken</code> field.
     *
     * <p>Required.
     *
     * @param approvalToken the value
     * @return this builder
     */
    public Builder approvalToken(String approvalToken) {
      this.approvalToken = Wire.nonNull(approvalToken, "approvalToken");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public AgentSignupForApprovalRequestInput build() {
      return new AgentSignupForApprovalRequestInput(this);
    }
  }
}
