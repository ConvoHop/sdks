// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>WebhookDelivery</code> result type. */
public final class WebhookDelivery implements WireValue {
  private final String effectId;
  private final String eventId;
  private final String state;
  private final String attempts;
  private final @Nullable String lastOutcome;
  private final String nextAttemptAt;
  private final @Nullable String eventType;
  private final @Nullable String createdAt;
  private final @Nullable String replayedAt;
  private final @Nullable String lastAttemptAt;
  private final @Nullable Integer lastHttpStatus;
  private final @Nullable Integer lastLatencyMs;
  private final @Nullable String lastErrorCode;

  private WebhookDelivery(
      String effectId,
      String eventId,
      String state,
      String attempts,
      @Nullable String lastOutcome,
      String nextAttemptAt,
      @Nullable String eventType,
      @Nullable String createdAt,
      @Nullable String replayedAt,
      @Nullable String lastAttemptAt,
      @Nullable Integer lastHttpStatus,
      @Nullable Integer lastLatencyMs,
      @Nullable String lastErrorCode) {
    this.effectId = effectId;
    this.eventId = eventId;
    this.state = state;
    this.attempts = attempts;
    this.lastOutcome = lastOutcome;
    this.nextAttemptAt = nextAttemptAt;
    this.eventType = eventType;
    this.createdAt = createdAt;
    this.replayedAt = replayedAt;
    this.lastAttemptAt = lastAttemptAt;
    this.lastHttpStatus = lastHttpStatus;
    this.lastLatencyMs = lastLatencyMs;
    this.lastErrorCode = lastErrorCode;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static WebhookDelivery fromJson(@Nullable Object value) {
    return Wire.required(WebhookDelivery::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static WebhookDelivery decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "WebhookDelivery");
    return new WebhookDelivery(
        Wire.field(object, "WebhookDelivery", "effectId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "WebhookDelivery", "eventId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "WebhookDelivery", "state", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "WebhookDelivery", "attempts", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "WebhookDelivery", "lastOutcome", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookDelivery", "nextAttemptAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "WebhookDelivery", "eventType", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookDelivery", "createdAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookDelivery", "replayedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookDelivery", "lastAttemptAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "WebhookDelivery", "lastHttpStatus", depth, Wire.optional(Wire.INT)),
        Wire.field(object, "WebhookDelivery", "lastLatencyMs", depth, Wire.optional(Wire.INT)),
        Wire.field(object, "WebhookDelivery", "lastErrorCode", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>effectId</code> field. */
  public String getEffectId() {
    return this.effectId;
  }

  /** The <code>eventId</code> field. */
  public String getEventId() {
    return this.eventId;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The <code>attempts</code> field. */
  public String getAttempts() {
    return this.attempts;
  }

  /** The <code>lastOutcome</code> field. */
  public @Nullable String getLastOutcome() {
    return this.lastOutcome;
  }

  /** The <code>nextAttemptAt</code> field. */
  public String getNextAttemptAt() {
    return this.nextAttemptAt;
  }

  /** The <code>eventType</code> field. */
  public @Nullable String getEventType() {
    return this.eventType;
  }

  /** The <code>createdAt</code> field. */
  public @Nullable String getCreatedAt() {
    return this.createdAt;
  }

  /** The <code>replayedAt</code> field. */
  public @Nullable String getReplayedAt() {
    return this.replayedAt;
  }

  /** The <code>lastAttemptAt</code> field. */
  public @Nullable String getLastAttemptAt() {
    return this.lastAttemptAt;
  }

  /** The <code>lastHttpStatus</code> field. */
  public @Nullable Integer getLastHttpStatus() {
    return this.lastHttpStatus;
  }

  /** The <code>lastLatencyMs</code> field. */
  public @Nullable Integer getLastLatencyMs() {
    return this.lastLatencyMs;
  }

  /** The <code>lastErrorCode</code> field. */
  public @Nullable String getLastErrorCode() {
    return this.lastErrorCode;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("effectId", Wire.json(this.effectId));
    json.put("eventId", Wire.json(this.eventId));
    json.put("state", Wire.json(this.state));
    json.put("attempts", Wire.json(this.attempts));
    json.put("lastOutcome", Wire.json(this.lastOutcome));
    json.put("nextAttemptAt", Wire.json(this.nextAttemptAt));
    json.put("eventType", Wire.json(this.eventType));
    json.put("createdAt", Wire.json(this.createdAt));
    json.put("replayedAt", Wire.json(this.replayedAt));
    json.put("lastAttemptAt", Wire.json(this.lastAttemptAt));
    json.put("lastHttpStatus", Wire.json(this.lastHttpStatus));
    json.put("lastLatencyMs", Wire.json(this.lastLatencyMs));
    json.put("lastErrorCode", Wire.json(this.lastErrorCode));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof WebhookDelivery)) {
      return false;
    }
    WebhookDelivery that = (WebhookDelivery) other;
    return Objects.equals(this.effectId, that.effectId)
        && Objects.equals(this.eventId, that.eventId)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.attempts, that.attempts)
        && Objects.equals(this.lastOutcome, that.lastOutcome)
        && Objects.equals(this.nextAttemptAt, that.nextAttemptAt)
        && Objects.equals(this.eventType, that.eventType)
        && Objects.equals(this.createdAt, that.createdAt)
        && Objects.equals(this.replayedAt, that.replayedAt)
        && Objects.equals(this.lastAttemptAt, that.lastAttemptAt)
        && Objects.equals(this.lastHttpStatus, that.lastHttpStatus)
        && Objects.equals(this.lastLatencyMs, that.lastLatencyMs)
        && Objects.equals(this.lastErrorCode, that.lastErrorCode);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.effectId, this.eventId, this.state, this.attempts, this.lastOutcome, this.nextAttemptAt, this.eventType, this.createdAt, this.replayedAt, this.lastAttemptAt, this.lastHttpStatus, this.lastLatencyMs, this.lastErrorCode);
  }

  @Override
  public String toString() {
    return "WebhookDelivery{effectId=" + this.effectId
        + ", eventId=" + this.eventId
        + ", state=" + this.state
        + ", attempts=" + this.attempts
        + ", lastOutcome=" + this.lastOutcome
        + ", nextAttemptAt=" + this.nextAttemptAt
        + ", eventType=" + this.eventType
        + ", createdAt=" + this.createdAt
        + ", replayedAt=" + this.replayedAt
        + ", lastAttemptAt=" + this.lastAttemptAt
        + ", lastHttpStatus=" + this.lastHttpStatus
        + ", lastLatencyMs=" + this.lastLatencyMs
        + ", lastErrorCode=" + this.lastErrorCode
        + "}";
  }
}
