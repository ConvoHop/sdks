// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>ConversationMute</code> result type. */
public final class ConversationMute implements WireValue {
  private final String conversationId;
  private final String principalId;
  private final Boolean muted;
  private final @Nullable String until;

  private ConversationMute(
      String conversationId,
      String principalId,
      Boolean muted,
      @Nullable String until) {
    this.conversationId = conversationId;
    this.principalId = principalId;
    this.muted = muted;
    this.until = until;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ConversationMute fromJson(@Nullable Object value) {
    return Wire.required(ConversationMute::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ConversationMute decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "ConversationMute");
    return new ConversationMute(
        Wire.field(object, "ConversationMute", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "ConversationMute", "principalId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "ConversationMute", "muted", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "ConversationMute", "until", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>muted</code> field. */
  public Boolean getMuted() {
    return this.muted;
  }

  /** The <code>until</code> field. */
  public @Nullable String getUntil() {
    return this.until;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("principalId", Wire.json(this.principalId));
    json.put("muted", Wire.json(this.muted));
    json.put("until", Wire.json(this.until));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ConversationMute)) {
      return false;
    }
    ConversationMute that = (ConversationMute) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.muted, that.muted)
        && Objects.equals(this.until, that.until);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.principalId, this.muted, this.until);
  }

  @Override
  public String toString() {
    return "ConversationMute{conversationId=" + this.conversationId
        + ", principalId=" + this.principalId
        + ", muted=" + this.muted
        + ", until=" + this.until
        + "}";
  }
}
