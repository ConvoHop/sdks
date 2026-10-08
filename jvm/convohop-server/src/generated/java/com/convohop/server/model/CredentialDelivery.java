// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>CredentialDelivery</code> result type. */
public final class CredentialDelivery implements WireValue {
  private final String deliveryId;
  private final String kind;
  private final String projectId;
  private final String installationId;
  private final @Nullable ResourceRef resourceRef;
  private final String expiresAt;
  private final String payloadDigest;
  private final @Nullable ActorRef recipientActorRef;

  private CredentialDelivery(
      String deliveryId,
      String kind,
      String projectId,
      String installationId,
      @Nullable ResourceRef resourceRef,
      String expiresAt,
      String payloadDigest,
      @Nullable ActorRef recipientActorRef) {
    this.deliveryId = deliveryId;
    this.kind = kind;
    this.projectId = projectId;
    this.installationId = installationId;
    this.resourceRef = resourceRef;
    this.expiresAt = expiresAt;
    this.payloadDigest = payloadDigest;
    this.recipientActorRef = recipientActorRef;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static CredentialDelivery fromJson(@Nullable Object value) {
    return Wire.required(CredentialDelivery::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static CredentialDelivery decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "CredentialDelivery");
    return new CredentialDelivery(
        Wire.field(object, "CredentialDelivery", "deliveryId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "CredentialDelivery", "kind", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "CredentialDelivery", "projectId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "CredentialDelivery", "installationId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "CredentialDelivery", "resourceRef", depth, Wire.optional(ResourceRef::decode)),
        Wire.field(object, "CredentialDelivery", "expiresAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "CredentialDelivery", "payloadDigest", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "CredentialDelivery", "recipientActorRef", depth, Wire.optional(ActorRef::decode)));
  }

  /** The <code>deliveryId</code> field. */
  public String getDeliveryId() {
    return this.deliveryId;
  }

  /** The <code>kind</code> field. */
  public String getKind() {
    return this.kind;
  }

  /** The <code>projectId</code> field. */
  public String getProjectId() {
    return this.projectId;
  }

  /** The <code>installationId</code> field. */
  public String getInstallationId() {
    return this.installationId;
  }

  /** The <code>resourceRef</code> field. */
  public @Nullable ResourceRef getResourceRef() {
    return this.resourceRef;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The <code>payloadDigest</code> field. */
  public String getPayloadDigest() {
    return this.payloadDigest;
  }

  /** The <code>recipientActorRef</code> field. */
  public @Nullable ActorRef getRecipientActorRef() {
    return this.recipientActorRef;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("deliveryId", Wire.json(this.deliveryId));
    json.put("kind", Wire.json(this.kind));
    json.put("projectId", Wire.json(this.projectId));
    json.put("installationId", Wire.json(this.installationId));
    json.put("resourceRef", Wire.json(this.resourceRef));
    json.put("expiresAt", Wire.json(this.expiresAt));
    json.put("payloadDigest", Wire.json(this.payloadDigest));
    json.put("recipientActorRef", Wire.json(this.recipientActorRef));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CredentialDelivery)) {
      return false;
    }
    CredentialDelivery that = (CredentialDelivery) other;
    return Objects.equals(this.deliveryId, that.deliveryId)
        && Objects.equals(this.kind, that.kind)
        && Objects.equals(this.projectId, that.projectId)
        && Objects.equals(this.installationId, that.installationId)
        && Objects.equals(this.resourceRef, that.resourceRef)
        && Objects.equals(this.expiresAt, that.expiresAt)
        && Objects.equals(this.payloadDigest, that.payloadDigest)
        && Objects.equals(this.recipientActorRef, that.recipientActorRef);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.deliveryId, this.kind, this.projectId, this.installationId, this.resourceRef, this.expiresAt, this.payloadDigest, this.recipientActorRef);
  }

  @Override
  public String toString() {
    return "CredentialDelivery{deliveryId=" + this.deliveryId
        + ", kind=" + this.kind
        + ", projectId=" + this.projectId
        + ", installationId=" + this.installationId
        + ", resourceRef=" + this.resourceRef
        + ", expiresAt=" + this.expiresAt
        + ", payloadDigest=" + this.payloadDigest
        + ", recipientActorRef=" + this.recipientActorRef
        + "}";
  }
}
