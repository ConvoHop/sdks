// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>WebhookDeliveriesRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class WebhookDeliveriesRequestInput implements WireValue {
  private final String projectId;
  private final String endpointId;

  private WebhookDeliveriesRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "WebhookDeliveriesRequestInput.projectId");
    this.endpointId = Wire.present(builder.endpointId, "WebhookDeliveriesRequestInput.endpointId");
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

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("endpointId", Wire.json(this.endpointId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof WebhookDeliveriesRequestInput)) {
      return false;
    }
    WebhookDeliveriesRequestInput that = (WebhookDeliveriesRequestInput) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.endpointId, that.endpointId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.endpointId);
  }

  @Override
  public String toString() {
    return "WebhookDeliveriesRequestInput{projectId=" + this.projectId
        + ", endpointId=" + this.endpointId
        + "}";
  }

  /** Builds {@link WebhookDeliveriesRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;
    private @Nullable String endpointId;

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
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public WebhookDeliveriesRequestInput build() {
      return new WebhookDeliveriesRequestInput(this);
    }
  }
}
