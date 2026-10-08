// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>RevokeSessionRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class RevokeSessionRequestInput implements WireValue {
  private final String sessionId;
  private final String expectedRevision;

  private RevokeSessionRequestInput(Builder builder) {
    this.sessionId = Wire.present(builder.sessionId, "RevokeSessionRequestInput.sessionId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "RevokeSessionRequestInput.expectedRevision");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>sessionId</code> field. */
  public String getSessionId() {
    return this.sessionId;
  }

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("sessionId", Wire.json(this.sessionId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RevokeSessionRequestInput)) {
      return false;
    }
    RevokeSessionRequestInput that = (RevokeSessionRequestInput) other;
    return Objects.equals(this.sessionId, that.sessionId)
        && Objects.equals(this.expectedRevision, that.expectedRevision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.sessionId, this.expectedRevision);
  }

  @Override
  public String toString() {
    return "RevokeSessionRequestInput{sessionId=" + this.sessionId
        + ", expectedRevision=" + this.expectedRevision
        + "}";
  }

  /** Builds {@link RevokeSessionRequestInput} values. */
  public static final class Builder {
    private @Nullable String sessionId;
    private @Nullable String expectedRevision;

    private Builder() {}

    /**
     * Sets the <code>sessionId</code> field.
     *
     * <p>Required.
     *
     * @param sessionId the value
     * @return this builder
     */
    public Builder sessionId(String sessionId) {
      this.sessionId = Wire.nonNull(sessionId, "sessionId");
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
    public RevokeSessionRequestInput build() {
      return new RevokeSessionRequestInput(this);
    }
  }
}
