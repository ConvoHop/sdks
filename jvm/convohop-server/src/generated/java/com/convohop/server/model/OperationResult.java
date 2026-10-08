// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>OperationResult</code> result type. */
public final class OperationResult implements WireValue {
  private final @Nullable String projectId;
  private final @Nullable String incarnation;
  private final @Nullable String status;
  private final @Nullable String backend;
  private final @Nullable String environment;
  private final @Nullable String policyRevision;
  private final @Nullable String expiresAt;
  private final @Nullable String kind;
  private final @Nullable ResourceRef resourceRef;
  private final @Nullable CredentialDelivery delivery;
  private final @Nullable String keyId;
  private final @Nullable String endpointId;
  private final @Nullable Boolean enabled;
  private final @Nullable LiveSessionOperationCompletion liveSessionCompletion;
  private final @Nullable Integer replayedDeliveries;
  private final @Nullable Integer skippedDeliveries;
  private final @Nullable Boolean messagePreview;

  private OperationResult(
      @Nullable String projectId,
      @Nullable String incarnation,
      @Nullable String status,
      @Nullable String backend,
      @Nullable String environment,
      @Nullable String policyRevision,
      @Nullable String expiresAt,
      @Nullable String kind,
      @Nullable ResourceRef resourceRef,
      @Nullable CredentialDelivery delivery,
      @Nullable String keyId,
      @Nullable String endpointId,
      @Nullable Boolean enabled,
      @Nullable LiveSessionOperationCompletion liveSessionCompletion,
      @Nullable Integer replayedDeliveries,
      @Nullable Integer skippedDeliveries,
      @Nullable Boolean messagePreview) {
    this.projectId = projectId;
    this.incarnation = incarnation;
    this.status = status;
    this.backend = backend;
    this.environment = environment;
    this.policyRevision = policyRevision;
    this.expiresAt = expiresAt;
    this.kind = kind;
    this.resourceRef = resourceRef;
    this.delivery = delivery;
    this.keyId = keyId;
    this.endpointId = endpointId;
    this.enabled = enabled;
    this.liveSessionCompletion = liveSessionCompletion;
    this.replayedDeliveries = replayedDeliveries;
    this.skippedDeliveries = skippedDeliveries;
    this.messagePreview = messagePreview;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static OperationResult fromJson(@Nullable Object value) {
    return Wire.required(OperationResult::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static OperationResult decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "OperationResult");
    return new OperationResult(
        Wire.field(object, "OperationResult", "projectId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "OperationResult", "incarnation", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "OperationResult", "status", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OperationResult", "backend", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OperationResult", "environment", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OperationResult", "policyRevision", depth, Wire.optional(Scalars.DECIMAL)),
        Wire.field(object, "OperationResult", "expiresAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OperationResult", "kind", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OperationResult", "resourceRef", depth, Wire.optional(ResourceRef::decode)),
        Wire.field(object, "OperationResult", "delivery", depth, Wire.optional(CredentialDelivery::decode)),
        Wire.field(object, "OperationResult", "keyId", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "OperationResult", "endpointId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "OperationResult", "enabled", depth, Wire.optional(Wire.BOOLEAN)),
        Wire.field(object, "OperationResult", "liveSessionCompletion", depth, Wire.optional(LiveSessionOperationCompletion::decode)),
        Wire.field(object, "OperationResult", "replayedDeliveries", depth, Wire.optional(Wire.INT)),
        Wire.field(object, "OperationResult", "skippedDeliveries", depth, Wire.optional(Wire.INT)),
        Wire.field(object, "OperationResult", "messagePreview", depth, Wire.optional(Wire.BOOLEAN)));
  }

  /** The <code>projectId</code> field. */
  public @Nullable String getProjectId() {
    return this.projectId;
  }

  /** The <code>incarnation</code> field. */
  public @Nullable String getIncarnation() {
    return this.incarnation;
  }

  /** The <code>status</code> field. */
  public @Nullable String getStatus() {
    return this.status;
  }

  /** The <code>backend</code> field. */
  public @Nullable String getBackend() {
    return this.backend;
  }

  /** The <code>environment</code> field. */
  public @Nullable String getEnvironment() {
    return this.environment;
  }

  /** The <code>policyRevision</code> field. */
  public @Nullable String getPolicyRevision() {
    return this.policyRevision;
  }

  /** The <code>expiresAt</code> field. */
  public @Nullable String getExpiresAt() {
    return this.expiresAt;
  }

  /** The <code>kind</code> field. */
  public @Nullable String getKind() {
    return this.kind;
  }

  /** The <code>resourceRef</code> field. */
  public @Nullable ResourceRef getResourceRef() {
    return this.resourceRef;
  }

  /** The <code>delivery</code> field. */
  public @Nullable CredentialDelivery getDelivery() {
    return this.delivery;
  }

  /** The <code>keyId</code> field. */
  public @Nullable String getKeyId() {
    return this.keyId;
  }

  /** The <code>endpointId</code> field. */
  public @Nullable String getEndpointId() {
    return this.endpointId;
  }

  /** The <code>enabled</code> field. */
  public @Nullable Boolean getEnabled() {
    return this.enabled;
  }

  /** The <code>liveSessionCompletion</code> field. */
  public @Nullable LiveSessionOperationCompletion getLiveSessionCompletion() {
    return this.liveSessionCompletion;
  }

  /** The <code>replayedDeliveries</code> field. */
  public @Nullable Integer getReplayedDeliveries() {
    return this.replayedDeliveries;
  }

  /** The <code>skippedDeliveries</code> field. */
  public @Nullable Integer getSkippedDeliveries() {
    return this.skippedDeliveries;
  }

  /** The <code>messagePreview</code> field. */
  public @Nullable Boolean getMessagePreview() {
    return this.messagePreview;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("projectId", Wire.json(this.projectId));
    json.put("incarnation", Wire.json(this.incarnation));
    json.put("status", Wire.json(this.status));
    json.put("backend", Wire.json(this.backend));
    json.put("environment", Wire.json(this.environment));
    json.put("policyRevision", Wire.json(this.policyRevision));
    json.put("expiresAt", Wire.json(this.expiresAt));
    json.put("kind", Wire.json(this.kind));
    json.put("resourceRef", Wire.json(this.resourceRef));
    json.put("delivery", Wire.json(this.delivery));
    json.put("keyId", Wire.json(this.keyId));
    json.put("endpointId", Wire.json(this.endpointId));
    json.put("enabled", Wire.json(this.enabled));
    json.put("liveSessionCompletion", Wire.json(this.liveSessionCompletion));
    json.put("replayedDeliveries", Wire.json(this.replayedDeliveries));
    json.put("skippedDeliveries", Wire.json(this.skippedDeliveries));
    json.put("messagePreview", Wire.json(this.messagePreview));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof OperationResult)) {
      return false;
    }
    OperationResult that = (OperationResult) other;
    return Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.incarnation, that.incarnation)
        && Objects.equals(this.status, that.status)
        && Objects.equals(this.backend, that.backend)
        && Objects.equals(this.environment, that.environment)
        && Objects.equals(this.policyRevision, that.policyRevision)
        && Objects.equals(this.expiresAt, that.expiresAt)
        && Objects.equals(this.kind, that.kind)
        && Objects.equals(this.resourceRef, that.resourceRef)
        && Objects.equals(this.delivery, that.delivery)
        && Objects.equals(this.keyId, that.keyId)
        && Objects.equals(this.endpointId, that.endpointId)
        && Objects.equals(this.enabled, that.enabled)
        && Objects.equals(this.liveSessionCompletion, that.liveSessionCompletion)
        && Objects.equals(this.replayedDeliveries, that.replayedDeliveries)
        && Objects.equals(this.skippedDeliveries, that.skippedDeliveries)
        && Objects.equals(this.messagePreview, that.messagePreview);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.projectId, this.incarnation, this.status, this.backend, this.environment, this.policyRevision, this.expiresAt, this.kind, this.resourceRef, this.delivery, this.keyId, this.endpointId, this.enabled, this.liveSessionCompletion, this.replayedDeliveries, this.skippedDeliveries, this.messagePreview);
  }

  @Override
  public String toString() {
    return "OperationResult{projectId=" + this.projectId
        + ", incarnation=" + this.incarnation
        + ", status=" + this.status
        + ", backend=" + this.backend
        + ", environment=" + this.environment
        + ", policyRevision=" + this.policyRevision
        + ", expiresAt=" + this.expiresAt
        + ", kind=" + this.kind
        + ", resourceRef=" + this.resourceRef
        + ", delivery=" + this.delivery
        + ", keyId=" + this.keyId
        + ", endpointId=" + this.endpointId
        + ", enabled=" + this.enabled
        + ", liveSessionCompletion=" + this.liveSessionCompletion
        + ", replayedDeliveries=" + this.replayedDeliveries
        + ", skippedDeliveries=" + this.skippedDeliveries
        + ", messagePreview=" + this.messagePreview
        + "}";
  }
}
