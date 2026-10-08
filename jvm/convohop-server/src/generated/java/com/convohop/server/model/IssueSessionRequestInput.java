// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>IssueSessionRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class IssueSessionRequestInput implements WireValue {
  private final String principalId;
  private final String deviceId;
  private final String requestedTtlMs;

  private IssueSessionRequestInput(Builder builder) {
    this.principalId = Wire.present(builder.principalId, "IssueSessionRequestInput.principalId");
    this.deviceId = Wire.present(builder.deviceId, "IssueSessionRequestInput.deviceId");
    this.requestedTtlMs = Wire.present(builder.requestedTtlMs, "IssueSessionRequestInput.requestedTtlMs");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>deviceId</code> field. */
  public String getDeviceId() {
    return this.deviceId;
  }

  /** The <code>requestedTtlMs</code> field. */
  public String getRequestedTtlMs() {
    return this.requestedTtlMs;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("principalId", Wire.json(this.principalId));
    json.put("deviceId", Wire.json(this.deviceId));
    json.put("requestedTtlMs", Wire.json(this.requestedTtlMs));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof IssueSessionRequestInput)) {
      return false;
    }
    IssueSessionRequestInput that = (IssueSessionRequestInput) other;
    return Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.deviceId, that.deviceId)
        && Objects.equals(this.requestedTtlMs, that.requestedTtlMs);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.principalId, this.deviceId, this.requestedTtlMs);
  }

  @Override
  public String toString() {
    return "IssueSessionRequestInput{principalId=" + this.principalId
        + ", deviceId=" + this.deviceId
        + ", requestedTtlMs=" + this.requestedTtlMs
        + "}";
  }

  /** Builds {@link IssueSessionRequestInput} values. */
  public static final class Builder {
    private @Nullable String principalId;
    private @Nullable String deviceId;
    private @Nullable String requestedTtlMs;

    private Builder() {}

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
    public IssueSessionRequestInput build() {
      return new IssueSessionRequestInput(this);
    }
  }
}
