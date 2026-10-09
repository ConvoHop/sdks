// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>RevokeAgentGrantRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class RevokeAgentGrantRequestInput implements WireValue {
  private final String grantId;
  private final Boolean revokeIssuedSessions;

  private RevokeAgentGrantRequestInput(Builder builder) {
    this.grantId = Wire.present(builder.grantId, "RevokeAgentGrantRequestInput.grantId");
    this.revokeIssuedSessions = Wire.present(builder.revokeIssuedSessions, "RevokeAgentGrantRequestInput.revokeIssuedSessions");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>grantId</code> field. */
  public String getGrantId() {
    return this.grantId;
  }

  /** The <code>revokeIssuedSessions</code> field. */
  public Boolean getRevokeIssuedSessions() {
    return this.revokeIssuedSessions;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("grantId", Wire.json(this.grantId));
    json.put("revokeIssuedSessions", Wire.json(this.revokeIssuedSessions));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RevokeAgentGrantRequestInput)) {
      return false;
    }
    RevokeAgentGrantRequestInput that = (RevokeAgentGrantRequestInput) other;
    return Objects.equals(this.grantId, that.grantId)
        && Objects.equals(this.revokeIssuedSessions, that.revokeIssuedSessions);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.grantId, this.revokeIssuedSessions);
  }

  @Override
  public String toString() {
    return "RevokeAgentGrantRequestInput{grantId=" + this.grantId
        + ", revokeIssuedSessions=" + this.revokeIssuedSessions
        + "}";
  }

  /** Builds {@link RevokeAgentGrantRequestInput} values. */
  public static final class Builder {
    private @Nullable String grantId;
    private @Nullable Boolean revokeIssuedSessions;

    private Builder() {}

    /**
     * Sets the <code>grantId</code> field.
     *
     * <p>Required.
     *
     * @param grantId the value
     * @return this builder
     */
    public Builder grantId(String grantId) {
      this.grantId = Wire.nonNull(grantId, "grantId");
      return this;
    }

    /**
     * Sets the <code>revokeIssuedSessions</code> field.
     *
     * <p>Required.
     *
     * @param revokeIssuedSessions the value
     * @return this builder
     */
    public Builder revokeIssuedSessions(Boolean revokeIssuedSessions) {
      this.revokeIssuedSessions = Wire.nonNull(revokeIssuedSessions, "revokeIssuedSessions");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public RevokeAgentGrantRequestInput build() {
      return new RevokeAgentGrantRequestInput(this);
    }
  }
}
