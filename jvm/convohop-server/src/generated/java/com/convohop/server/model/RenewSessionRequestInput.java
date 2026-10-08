// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>RenewSessionRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class RenewSessionRequestInput implements WireValue {
  private final String sessionId;
  private final String principalId;
  private final String deviceId;
  private final String expectedRevision;
  private final String requestedTtlMs;

  private RenewSessionRequestInput(Builder builder) {
    this.sessionId = Wire.present(builder.sessionId, "RenewSessionRequestInput.sessionId");
    this.principalId = Wire.present(builder.principalId, "RenewSessionRequestInput.principalId");
    this.deviceId = Wire.present(builder.deviceId, "RenewSessionRequestInput.deviceId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "RenewSessionRequestInput.expectedRevision");
    this.requestedTtlMs = Wire.present(builder.requestedTtlMs, "RenewSessionRequestInput.requestedTtlMs");
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

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>deviceId</code> field. */
  public String getDeviceId() {
    return this.deviceId;
  }

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The <code>requestedTtlMs</code> field. */
  public String getRequestedTtlMs() {
    return this.requestedTtlMs;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("sessionId", Wire.json(this.sessionId));
    json.put("principalId", Wire.json(this.principalId));
    json.put("deviceId", Wire.json(this.deviceId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    json.put("requestedTtlMs", Wire.json(this.requestedTtlMs));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RenewSessionRequestInput)) {
      return false;
    }
    RenewSessionRequestInput that = (RenewSessionRequestInput) other;
    return Objects.equals(this.sessionId, that.sessionId)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.deviceId, that.deviceId)
        && Objects.equals(this.expectedRevision, that.expectedRevision)
        && Objects.equals(this.requestedTtlMs, that.requestedTtlMs);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.sessionId, this.principalId, this.deviceId, this.expectedRevision, this.requestedTtlMs);
  }

  @Override
  public String toString() {
    return "RenewSessionRequestInput{sessionId=" + this.sessionId
        + ", principalId=" + this.principalId
        + ", deviceId=" + this.deviceId
        + ", expectedRevision=" + this.expectedRevision
        + ", requestedTtlMs=" + this.requestedTtlMs
        + "}";
  }

  /** Builds {@link RenewSessionRequestInput} values. */
  public static final class Builder {
    private @Nullable String sessionId;
    private @Nullable String principalId;
    private @Nullable String deviceId;
    private @Nullable String expectedRevision;
    private @Nullable String requestedTtlMs;

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
     * Sets the <code>deviceId</code> field.
     *
     * <p>Required.
     *
     * @param deviceId the value
     * @return this builder
     */
    public Builder deviceId(String deviceId) {
      this.deviceId = Wire.nonNull(deviceId, "deviceId");
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
     * Sets the <code>requestedTtlMs</code> field.
     *
     * <p>Required.
     *
     * @param requestedTtlMs the value
     * @return this builder
     */
    public Builder requestedTtlMs(String requestedTtlMs) {
      this.requestedTtlMs = Wire.nonNull(requestedTtlMs, "requestedTtlMs");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public RenewSessionRequestInput build() {
      return new RenewSessionRequestInput(this);
    }
  }
}
