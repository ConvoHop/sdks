// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>WebhookEndpoint</code> result type. */
public final class WebhookEndpoint implements WireValue {
  private final String endpointId;
  private final String url;
  private final List<String> eventTypes;
  private final Boolean enabled;
  private final String status;
  private final @Nullable String disabledReason;
  private final String revision;
  private final String secretVersion;
  private final Boolean rotationPending;
  private final @Nullable String rotationOverlapUntil;
  private final Integer consecutiveFailures;
  private final @Nullable String failingSince;
  private final @Nullable String lastSuccessAt;
  private final @Nullable String lastFailureAt;

  private WebhookEndpoint(
      String endpointId,
      String url,
      List<String> eventTypes,
      Boolean enabled,
      String status,
      @Nullable String disabledReason,
      String revision,
      String secretVersion,
      Boolean rotationPending,
      @Nullable String rotationOverlapUntil,
      Integer consecutiveFailures,
      @Nullable String failingSince,
      @Nullable String lastSuccessAt,
      @Nullable String lastFailureAt) {
    this.endpointId = endpointId;
    this.url = url;
    this.eventTypes = eventTypes;
    this.enabled = enabled;
    this.status = status;
    this.disabledReason = disabledReason;
    this.revision = revision;
    this.secretVersion = secretVersion;
    this.rotationPending = rotationPending;
    this.rotationOverlapUntil = rotationOverlapUntil;
    this.consecutiveFailures = consecutiveFailures;
    this.failingSince = failingSince;
    this.lastSuccessAt = lastSuccessAt;
    this.lastFailureAt = lastFailureAt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static WebhookEndpoint fromJson(@Nullable Object value) {
    return Wire.required(WebhookEndpoint::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static WebhookEndpoint decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "WebhookEndpoint");
    return new WebhookEndpoint(
        Wire.field(object, "WebhookEndpoint", "endpointId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "WebhookEndpoint", "url", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "WebhookEndpoint", "eventTypes", depth, Wire.required(Wire.list(Wire.required(Wire.STRING)))),
        Wire.field(object, "WebhookEndpoint", "enabled", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "WebhookEndpoint", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "WebhookEndpoint", "disabledReason", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookEndpoint", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "WebhookEndpoint", "secretVersion", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "WebhookEndpoint", "rotationPending", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "WebhookEndpoint", "rotationOverlapUntil", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookEndpoint", "consecutiveFailures", depth, Wire.required(Wire.INT)),
        Wire.field(object, "WebhookEndpoint", "failingSince", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookEndpoint", "lastSuccessAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookEndpoint", "lastFailureAt", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>endpointId</code> field. */
  public String getEndpointId() {
    return this.endpointId;
  }

  /** The <code>url</code> field. */
  public String getUrl() {
    return this.url;
  }

  /** The <code>eventTypes</code> field. */
  public List<String> getEventTypes() {
    return this.eventTypes;
  }

  /** The <code>enabled</code> field. */
  public Boolean getEnabled() {
    return this.enabled;
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>disabledReason</code> field. */
  public @Nullable String getDisabledReason() {
    return this.disabledReason;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>secretVersion</code> field. */
  public String getSecretVersion() {
    return this.secretVersion;
  }

  /** The <code>rotationPending</code> field. */
  public Boolean getRotationPending() {
    return this.rotationPending;
  }

  /** The <code>rotationOverlapUntil</code> field. */
  public @Nullable String getRotationOverlapUntil() {
    return this.rotationOverlapUntil;
  }

  /** The <code>consecutiveFailures</code> field. */
  public Integer getConsecutiveFailures() {
    return this.consecutiveFailures;
  }

  /** The <code>failingSince</code> field. */
  public @Nullable String getFailingSince() {
    return this.failingSince;
  }

  /** The <code>lastSuccessAt</code> field. */
  public @Nullable String getLastSuccessAt() {
    return this.lastSuccessAt;
  }

  /** The <code>lastFailureAt</code> field. */
  public @Nullable String getLastFailureAt() {
    return this.lastFailureAt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("endpointId", Wire.json(this.endpointId));
    json.put("url", Wire.json(this.url));
    json.put("eventTypes", Wire.json(this.eventTypes));
    json.put("enabled", Wire.json(this.enabled));
    json.put("status", Wire.json(this.status));
    json.put("disabledReason", Wire.json(this.disabledReason));
    json.put("revision", Wire.json(this.revision));
    json.put("secretVersion", Wire.json(this.secretVersion));
    json.put("rotationPending", Wire.json(this.rotationPending));
    json.put("rotationOverlapUntil", Wire.json(this.rotationOverlapUntil));
    json.put("consecutiveFailures", Wire.json(this.consecutiveFailures));
    json.put("failingSince", Wire.json(this.failingSince));
    json.put("lastSuccessAt", Wire.json(this.lastSuccessAt));
    json.put("lastFailureAt", Wire.json(this.lastFailureAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof WebhookEndpoint)) {
      return false;
    }
    WebhookEndpoint that = (WebhookEndpoint) other;
    return Objects.equals(this.endpointId, that.endpointId)
        && Objects.equals(this.url, that.url)
        && Objects.equals(this.eventTypes, that.eventTypes)
        && Objects.equals(this.enabled, that.enabled)
        && Objects.equals(this.status, that.status)
        && Objects.equals(this.disabledReason, that.disabledReason)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.secretVersion, that.secretVersion)
        && Objects.equals(this.rotationPending, that.rotationPending)
        && Objects.equals(this.rotationOverlapUntil, that.rotationOverlapUntil)
        && Objects.equals(this.consecutiveFailures, that.consecutiveFailures)
        && Objects.equals(this.failingSince, that.failingSince)
        && Objects.equals(this.lastSuccessAt, that.lastSuccessAt)
        && Objects.equals(this.lastFailureAt, that.lastFailureAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.endpointId, this.url, this.eventTypes, this.enabled, this.status, this.disabledReason, this.revision, this.secretVersion, this.rotationPending, this.rotationOverlapUntil, this.consecutiveFailures, this.failingSince, this.lastSuccessAt, this.lastFailureAt);
  }

  @Override
  public String toString() {
    return "WebhookEndpoint{endpointId=" + this.endpointId
        + ", url=" + this.url
        + ", eventTypes=" + this.eventTypes
        + ", enabled=" + this.enabled
        + ", status=" + this.status
        + ", disabledReason=" + this.disabledReason
        + ", revision=" + this.revision
        + ", secretVersion=" + this.secretVersion
        + ", rotationPending=" + this.rotationPending
        + ", rotationOverlapUntil=" + this.rotationOverlapUntil
        + ", consecutiveFailures=" + this.consecutiveFailures
        + ", failingSince=" + this.failingSince
        + ", lastSuccessAt=" + this.lastSuccessAt
        + ", lastFailureAt=" + this.lastFailureAt
        + "}";
  }
}
