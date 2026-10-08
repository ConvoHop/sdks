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
 * The <code>ConfigureWebhookRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ConfigureWebhookRequestInput implements WireValue {
  private final String projectId;
  private final String url;
  private final List<String> eventTypes;
  private final String consentRef;

  private ConfigureWebhookRequestInput(Builder builder) {
    this.projectId = Wire.present(builder.projectId, "ConfigureWebhookRequestInput.projectId");
    this.url = Wire.present(builder.url, "ConfigureWebhookRequestInput.url");
    this.eventTypes = Wire.present(builder.eventTypes, "ConfigureWebhookRequestInput.eventTypes");
    this.consentRef = Wire.present(builder.consentRef, "ConfigureWebhookRequestInput.consentRef");
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

  /** The <code>url</code> field. */
  public String getUrl() {
    return this.url;
  }

  /** The <code>eventTypes</code> field. */
  public List<String> getEventTypes() {
    return this.eventTypes;
  }

  /** The <code>consentRef</code> field. */
  public String getConsentRef() {
    return this.consentRef;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("url", Wire.json(this.url));
    json.put("eventTypes", Wire.json(this.eventTypes));
    json.put("consentRef", Wire.json(this.consentRef));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ConfigureWebhookRequestInput)) {
      return false;
    }
    ConfigureWebhookRequestInput that = (ConfigureWebhookRequestInput) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.url, that.url)
        && Objects.equals(this.eventTypes, that.eventTypes)
        && Objects.equals(this.consentRef, that.consentRef);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.url, this.eventTypes, this.consentRef);
  }

  @Override
  public String toString() {
    return "ConfigureWebhookRequestInput{projectId=" + this.projectId
        + ", url=" + this.url
        + ", eventTypes=" + this.eventTypes
        + ", consentRef=" + this.consentRef
        + "}";
  }

  /** Builds {@link ConfigureWebhookRequestInput} values. */
  public static final class Builder {
    private @Nullable String projectId;
    private @Nullable String url;
    private @Nullable List<String> eventTypes;
    private @Nullable String consentRef;

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
     * Sets the <code>url</code> field.
     *
     * <p>Required.
     *
     * @param url the value
     * @return this builder
     */
    public Builder url(String url) {
      this.url = Wire.nonNull(url, "url");
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
     * Sets the <code>consentRef</code> field.
     *
     * <p>Required.
     *
     * @param consentRef the value
     * @return this builder
     */
    public Builder consentRef(String consentRef) {
      this.consentRef = Wire.nonNull(consentRef, "consentRef");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ConfigureWebhookRequestInput build() {
      return new ConfigureWebhookRequestInput(this);
    }
  }
}
