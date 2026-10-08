// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>CredentialCapsule</code> result type. */
public final class CredentialCapsule implements WireValue {
  private final String kind;
  private final @Nullable String keyId;
  private final @Nullable String backendPrincipalId;
  private final @Nullable String backendKey;
  private final @Nullable String expiresAt;
  private final @Nullable String endpointId;
  private final @Nullable String secretVersion;
  private final @Nullable String secret;

  private CredentialCapsule(
      String kind,
      @Nullable String keyId,
      @Nullable String backendPrincipalId,
      @Nullable String backendKey,
      @Nullable String expiresAt,
      @Nullable String endpointId,
      @Nullable String secretVersion,
      @Nullable String secret) {
    this.kind = kind;
    this.keyId = keyId;
    this.backendPrincipalId = backendPrincipalId;
    this.backendKey = backendKey;
    this.expiresAt = expiresAt;
    this.endpointId = endpointId;
    this.secretVersion = secretVersion;
    this.secret = secret;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static CredentialCapsule fromJson(@Nullable Object value) {
    return Wire.required(CredentialCapsule::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static CredentialCapsule decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "CredentialCapsule");
    return new CredentialCapsule(
        Wire.field(object, "CredentialCapsule", "kind", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "CredentialCapsule", "keyId", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "CredentialCapsule", "backendPrincipalId", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "CredentialCapsule", "backendKey", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "CredentialCapsule", "expiresAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "CredentialCapsule", "endpointId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "CredentialCapsule", "secretVersion", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "CredentialCapsule", "secret", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>kind</code> field. */
  public String getKind() {
    return this.kind;
  }

  /** The <code>keyId</code> field. */
  public @Nullable String getKeyId() {
    return this.keyId;
  }

  /** The <code>backendPrincipalId</code> field. */
  public @Nullable String getBackendPrincipalId() {
    return this.backendPrincipalId;
  }

  /** The <code>backendKey</code> field. */
  public @Nullable String getBackendKey() {
    return this.backendKey;
  }

  /** The <code>expiresAt</code> field. */
  public @Nullable String getExpiresAt() {
    return this.expiresAt;
  }

  /** The <code>endpointId</code> field. */
  public @Nullable String getEndpointId() {
    return this.endpointId;
  }

  /** The <code>secretVersion</code> field. */
  public @Nullable String getSecretVersion() {
    return this.secretVersion;
  }

  /** The <code>secret</code> field. */
  public @Nullable String getSecret() {
    return this.secret;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("kind", Wire.json(this.kind));
    json.put("keyId", Wire.json(this.keyId));
    json.put("backendPrincipalId", Wire.json(this.backendPrincipalId));
    json.put("backendKey", Wire.json(this.backendKey));
    json.put("expiresAt", Wire.json(this.expiresAt));
    json.put("endpointId", Wire.json(this.endpointId));
    json.put("secretVersion", Wire.json(this.secretVersion));
    json.put("secret", Wire.json(this.secret));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CredentialCapsule)) {
      return false;
    }
    CredentialCapsule that = (CredentialCapsule) other;
    return Objects.equals(this.kind, that.kind)
        && Objects.equals(this.keyId, that.keyId)
        && Objects.equals(this.backendPrincipalId, that.backendPrincipalId)
        && Objects.equals(this.backendKey, that.backendKey)
        && Objects.equals(this.expiresAt, that.expiresAt)
        && Objects.equals(this.endpointId, that.endpointId)
        && Objects.equals(this.secretVersion, that.secretVersion)
        && Objects.equals(this.secret, that.secret);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.kind, this.keyId, this.backendPrincipalId, this.backendKey, this.expiresAt, this.endpointId, this.secretVersion, this.secret);
  }

  @Override
  public String toString() {
    return "CredentialCapsule{kind=" + this.kind
        + ", keyId=" + this.keyId
        + ", backendPrincipalId=" + this.backendPrincipalId
        + ", backendKey=" + Wire.redacted(this.backendKey)
        + ", expiresAt=" + this.expiresAt
        + ", endpointId=" + this.endpointId
        + ", secretVersion=" + this.secretVersion
        + ", secret=" + Wire.redacted(this.secret)
        + "}";
  }
}
