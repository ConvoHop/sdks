// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>RejectAgentSignupRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class RejectAgentSignupRequestInput implements WireValue {
  private final String approvalToken;
  private final Boolean suppressFutureRequests;

  private RejectAgentSignupRequestInput(Builder builder) {
    this.approvalToken = Wire.present(builder.approvalToken, "RejectAgentSignupRequestInput.approvalToken");
    this.suppressFutureRequests = Wire.present(builder.suppressFutureRequests, "RejectAgentSignupRequestInput.suppressFutureRequests");
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

  /** The <code>suppressFutureRequests</code> field. */
  public Boolean getSuppressFutureRequests() {
    return this.suppressFutureRequests;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("approvalToken", Wire.json(this.approvalToken));
    json.put("suppressFutureRequests", Wire.json(this.suppressFutureRequests));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RejectAgentSignupRequestInput)) {
      return false;
    }
    RejectAgentSignupRequestInput that = (RejectAgentSignupRequestInput) other;
    return Objects.equals(this.approvalToken, that.approvalToken)
        && Objects.equals(this.suppressFutureRequests, that.suppressFutureRequests);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.approvalToken, this.suppressFutureRequests);
  }

  @Override
  public String toString() {
    return "RejectAgentSignupRequestInput{approvalToken=" + Wire.redacted(this.approvalToken)
        + ", suppressFutureRequests=" + this.suppressFutureRequests
        + "}";
  }

  /** Builds {@link RejectAgentSignupRequestInput} values. */
  public static final class Builder {
    private @Nullable String approvalToken;
    private @Nullable Boolean suppressFutureRequests;

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
     * Sets the <code>suppressFutureRequests</code> field.
     *
     * <p>Required.
     *
     * @param suppressFutureRequests the value
     * @return this builder
     */
    public Builder suppressFutureRequests(Boolean suppressFutureRequests) {
      this.suppressFutureRequests = Wire.nonNull(suppressFutureRequests, "suppressFutureRequests");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public RejectAgentSignupRequestInput build() {
      return new RejectAgentSignupRequestInput(this);
    }
  }
}
