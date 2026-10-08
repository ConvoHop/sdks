// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>ReplayWebhookDeliveriesRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ReplayWebhookDeliveriesRequestInput implements WireValue {
  private final String projectId;
  private final String endpointId;
  private final @Nullable String effectId;
  private final @Nullable String since;
  private final @Nullable String until;

  private ReplayWebhookDeliveriesRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "ReplayWebhookDeliveriesRequestInput.projectId");
    this.endpointId = Wire.present(builder.endpointId, "ReplayWebhookDeliveriesRequestInput.endpointId");
    this.effectId = builder.effectId;
    this.since = builder.since;
    this.until = builder.until;
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

  /** The <code>effectId</code> field. */
  public @Nullable String getEffectId() {
    return this.effectId;
  }

  /** The <code>since</code> field. */
  public @Nullable String getSince() {
    return this.since;
  }

  /** The <code>until</code> field. */
  public @Nullable String getUntil() {
    return this.until;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("endpointId", Wire.json(this.endpointId));
    if (this.effectId != null) {
      json.put("effectId", Wire.json(this.effectId));
    }
    if (this.since != null) {
      json.put("since", Wire.json(this.since));
    }
    if (this.until != null) {
      json.put("until", Wire.json(this.until));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ReplayWebhookDeliveriesRequestInput)) {
      return false;
    }
    ReplayWebhookDeliveriesRequestInput that = (ReplayWebhookDeliveriesRequestInput) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.endpointId, that.endpointId)
        && Objects.equals(this.effectId, that.effectId)
        && Objects.equals(this.since, that.since)
        && Objects.equals(this.until, that.until);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.endpointId, this.effectId, this.since, this.until);
  }

  @Override
  public String toString() {
    return "ReplayWebhookDeliveriesRequestInput{projectId=" + this.projectId
        + ", endpointId=" + this.endpointId
        + ", effectId=" + this.effectId
        + ", since=" + this.since
        + ", until=" + this.until
        + "}";
  }

  /** Builds {@link ReplayWebhookDeliveriesRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;
    private @Nullable String endpointId;
    private @Nullable String effectId;
    private @Nullable String since;
    private @Nullable String until;

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
     * Sets the <code>effectId</code> field.
     *
     * @param effectId the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder effectId(@Nullable String effectId) {
      this.effectId = effectId;
      return this;
    }

    /**
     * Sets the <code>since</code> field.
     *
     * @param since the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder since(@Nullable String since) {
      this.since = since;
      return this;
    }

    /**
     * Sets the <code>until</code> field.
     *
     * @param until the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder until(@Nullable String until) {
      this.until = until;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ReplayWebhookDeliveriesRequestInput build() {
      return new ReplayWebhookDeliveriesRequestInput(this);
    }
  }
}
