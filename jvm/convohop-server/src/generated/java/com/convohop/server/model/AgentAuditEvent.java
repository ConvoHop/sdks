// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>AgentAuditEvent</code> result type. */
public final class AgentAuditEvent implements WireValue {
  private final String eventId;
  private final String orgId;
  private final @Nullable String grantId;
  private final String actorKind;
  private final @Nullable String actorId;
  private final String kind;
  private final @Nullable Map<String, @Nullable Object> details;
  private final String occurredAt;

  private AgentAuditEvent(
      String eventId,
      String orgId,
      @Nullable String grantId,
      String actorKind,
      @Nullable String actorId,
      String kind,
      @Nullable Map<String, @Nullable Object> details,
      String occurredAt) {
    this.eventId = eventId;
    this.orgId = orgId;
    this.grantId = grantId;
    this.actorKind = actorKind;
    this.actorId = actorId;
    this.kind = kind;
    this.details = details;
    this.occurredAt = occurredAt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static AgentAuditEvent fromJson(@Nullable Object value) {
    return Wire.required(AgentAuditEvent::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static AgentAuditEvent decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "AgentAuditEvent");
    return new AgentAuditEvent(
        Wire.field(object, "AgentAuditEvent", "eventId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentAuditEvent", "orgId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentAuditEvent", "grantId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "AgentAuditEvent", "actorKind", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentAuditEvent", "actorId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "AgentAuditEvent", "kind", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentAuditEvent", "details", depth, Wire.optional(Scalars.PROPERTIES)),
        Wire.field(object, "AgentAuditEvent", "occurredAt", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>eventId</code> field. */
  public String getEventId() {
    return this.eventId;
  }

  /** The <code>orgId</code> field. */
  public String getOrgId() {
    return this.orgId;
  }

  /** The <code>grantId</code> field. */
  public @Nullable String getGrantId() {
    return this.grantId;
  }

  /** The <code>actorKind</code> field. */
  public String getActorKind() {
    return this.actorKind;
  }

  /** The <code>actorId</code> field. */
  public @Nullable String getActorId() {
    return this.actorId;
  }

  /** The <code>kind</code> field. */
  public String getKind() {
    return this.kind;
  }

  /** The <code>details</code> field. */
  public @Nullable Map<String, @Nullable Object> getDetails() {
    return this.details;
  }

  /** The <code>occurredAt</code> field. */
  public String getOccurredAt() {
    return this.occurredAt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("eventId", Wire.json(this.eventId));
    json.put("orgId", Wire.json(this.orgId));
    json.put("grantId", Wire.json(this.grantId));
    json.put("actorKind", Wire.json(this.actorKind));
    json.put("actorId", Wire.json(this.actorId));
    json.put("kind", Wire.json(this.kind));
    json.put("details", Wire.json(this.details));
    json.put("occurredAt", Wire.json(this.occurredAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentAuditEvent)) {
      return false;
    }
    AgentAuditEvent that = (AgentAuditEvent) other;
    return Objects.equals(this.eventId, that.eventId)
        && Objects.equals(this.orgId, that.orgId)
        && Objects.equals(this.grantId, that.grantId)
        && Objects.equals(this.actorKind, that.actorKind)
        && Objects.equals(this.actorId, that.actorId)
        && Objects.equals(this.kind, that.kind)
        && Objects.equals(this.details, that.details)
        && Objects.equals(this.occurredAt, that.occurredAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.eventId, this.orgId, this.grantId, this.actorKind, this.actorId, this.kind, this.details, this.occurredAt);
  }

  @Override
  public String toString() {
    return "AgentAuditEvent{eventId=" + this.eventId
        + ", orgId=" + this.orgId
        + ", grantId=" + this.grantId
        + ", actorKind=" + this.actorKind
        + ", actorId=" + this.actorId
        + ", kind=" + this.kind
        + ", details=" + this.details
        + ", occurredAt=" + this.occurredAt
        + "}";
  }
}
