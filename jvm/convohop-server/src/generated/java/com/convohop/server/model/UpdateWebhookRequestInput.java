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
 * The <code>UpdateWebhookRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class UpdateWebhookRequestInput implements WireValue {
  private final String projectId;
  private final String endpointId;
  private final String expectedRevision;
  private final List<String> eventTypes;
  private final Boolean enabled;

  private UpdateWebhookRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "UpdateWebhookRequestInput.projectId");
    this.endpointId = Wire.present(builder.endpointId, "UpdateWebhookRequestInput.endpointId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "UpdateWebhookRequestInput.expectedRevision");
    this.eventTypes = Wire.present(builder.eventTypes, "UpdateWebhookRequestInput.eventTypes");
    this.enabled = Wire.present(builder.enabled, "UpdateWebhookRequestInput.enabled");
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

  /** The <code>endpointId</code> field. */
  public String getEndpointId() {
    return this.endpointId;
  }

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The <code>eventTypes</code> field. */
  public List<String> getEventTypes() {
    return this.eventTypes;
  }

  /** The <code>enabled</code> field. */
  public Boolean getEnabled() {
    return this.enabled;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("endpointId", Wire.json(this.endpointId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    json.put("eventTypes", Wire.json(this.eventTypes));
    json.put("enabled", Wire.json(this.enabled));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof UpdateWebhookRequestInput)) {
      return false;
    }
    UpdateWebhookRequestInput that = (UpdateWebhookRequestInput) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.endpointId, that.endpointId)
        && Objects.equals(this.expectedRevision, that.expectedRevision)
        && Objects.equals(this.eventTypes, that.eventTypes)
        && Objects.equals(this.enabled, that.enabled);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.endpointId, this.expectedRevision, this.eventTypes, this.enabled);
  }

  @Override
  public String toString() {
    return "UpdateWebhookRequestInput{projectId=" + this.projectId
        + ", endpointId=" + this.endpointId
        + ", expectedRevision=" + this.expectedRevision
        + ", eventTypes=" + this.eventTypes
        + ", enabled=" + this.enabled
        + "}";
  }

  /** Builds {@link UpdateWebhookRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;
    private @Nullable String endpointId;
    private @Nullable String expectedRevision;
    private @Nullable List<String> eventTypes;
    private @Nullable Boolean enabled;

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
     * Sets the <code>endpointId</code> field.
     *
     * <p>Required.
     *
     * @param endpointId the value
     * @return this builder
     */
    public Builder endpointId(String endpointId) {
      this.endpointId = Wire.nonNull(endpointId, "endpointId");
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
     * Sets the <code>eventTypes</code> field.
     *
     * <p>Required.
     *
     * @param eventTypes the value
     * @return this builder
     */
    public Builder eventTypes(List<String> eventTypes) {
      this.eventTypes = Wire.immutable(Wire.nonNull(eventTypes, "eventTypes"));
      return this;
    }

    /**
     * Sets the <code>enabled</code> field.
     *
     * <p>Required.
     *
     * @param enabled the value
     * @return this builder
     */
    public Builder enabled(Boolean enabled) {
      this.enabled = Wire.nonNull(enabled, "enabled");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public UpdateWebhookRequestInput build() {
      return new UpdateWebhookRequestInput(this);
    }
  }
}
