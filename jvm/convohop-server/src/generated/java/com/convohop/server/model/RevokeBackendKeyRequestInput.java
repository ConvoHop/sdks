// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>RevokeBackendKeyRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class RevokeBackendKeyRequestInput implements WireValue {
  private final String projectId;
  private final String keyId;
  private final String expectedRevision;
  private final Boolean revokeIssuedSessions;

  private RevokeBackendKeyRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "RevokeBackendKeyRequestInput.projectId");
    this.keyId = Wire.present(builder.keyId, "RevokeBackendKeyRequestInput.keyId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "RevokeBackendKeyRequestInput.expectedRevision");
    this.revokeIssuedSessions = Wire.present(builder.revokeIssuedSessions, "RevokeBackendKeyRequestInput.revokeIssuedSessions");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>projectId</code> field. */
  public String getProjectId() {
    return this.projectId;
  }

  /** The <code>keyId</code> field. */
  public String getKeyId() {
    return this.keyId;
  }

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The <code>revokeIssuedSessions</code> field. */
  public Boolean getRevokeIssuedSessions() {
    return this.revokeIssuedSessions;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("keyId", Wire.json(this.keyId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    json.put("revokeIssuedSessions", Wire.json(this.revokeIssuedSessions));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RevokeBackendKeyRequestInput)) {
      return false;
    }
    RevokeBackendKeyRequestInput that = (RevokeBackendKeyRequestInput) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.keyId, that.keyId)
        && Objects.equals(this.expectedRevision, that.expectedRevision)
        && Objects.equals(this.revokeIssuedSessions, that.revokeIssuedSessions);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.keyId, this.expectedRevision, this.revokeIssuedSessions);
  }

  @Override
  public String toString() {
    return "RevokeBackendKeyRequestInput{projectId=" + this.projectId
        + ", keyId=" + this.keyId
        + ", expectedRevision=" + this.expectedRevision
        + ", revokeIssuedSessions=" + this.revokeIssuedSessions
        + "}";
  }

  /** Builds {@link RevokeBackendKeyRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;
    private @Nullable String keyId;
    private @Nullable String expectedRevision;
    private @Nullable Boolean revokeIssuedSessions;

    private Builder() {}

    /**
     * Sets the <code>projectId</code> field.
     *
     * <p>Required.
     *
     * @param projectId the value
     * @return this builder
     */
    public Builder projectId(String projectId) {
      this.projectId = Wire.nonNull(projectId, "projectId");
      return this;
    }

    /**
     * Sets the <code>keyId</code> field.
     *
     * <p>Required.
     *
     * @param keyId the value
     * @return this builder
     */
    public Builder keyId(String keyId) {
      this.keyId = Wire.nonNull(keyId, "keyId");
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
    public RevokeBackendKeyRequestInput build() {
      return new RevokeBackendKeyRequestInput(this);
    }
  }
}
