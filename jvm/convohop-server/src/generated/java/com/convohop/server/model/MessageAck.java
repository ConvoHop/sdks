// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>MessageAck</code> result type. */
public final class MessageAck implements WireValue {
  private final String messageId;
  private final String conversationId;
  private final String sequence;
  private final String revision;
  private final String status;
  private final @Nullable Cursor cursor;

  private MessageAck(
      String messageId,
      String conversationId,
      String sequence,
      String revision,
      String status,
      @Nullable Cursor cursor) {
    this.messageId = messageId;
    this.conversationId = conversationId;
    this.sequence = sequence;
    this.revision = revision;
    this.status = status;
    this.cursor = cursor;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static MessageAck fromJson(@Nullable Object value) {
    return Wire.required(MessageAck::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static MessageAck decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "MessageAck");
    return new MessageAck(
        Wire.field(object, "MessageAck", "messageId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "MessageAck", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "MessageAck", "sequence", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "MessageAck", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "MessageAck", "status", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "MessageAck", "cursor", depth, Wire.optional(Cursor::decode)));
  }

  /** The <code>messageId</code> field. */
  public String getMessageId() {
    return this.messageId;
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>sequence</code> field. */
  public String getSequence() {
    return this.sequence;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>status</code> field. */
  public String getStatus() {
    return this.status;
  }

  /** The <code>cursor</code> field. */
  public @Nullable Cursor getCursor() {
    return this.cursor;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("messageId", Wire.json(this.messageId));
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("sequence", Wire.json(this.sequence));
    json.put("revision", Wire.json(this.revision));
    json.put("status", Wire.json(this.status));
    json.put("cursor", Wire.json(this.cursor));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof MessageAck)) {
      return false;
    }
    MessageAck that = (MessageAck) other;
    return Objects.equals(this.messageId, that.messageId)
        && Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.sequence, that.sequence)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.status, that.status)
        && Objects.equals(this.cursor, that.cursor);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.messageId, this.conversationId, this.sequence, this.revision, this.status, this.cursor);
  }

  @Override
  public String toString() {
    return "MessageAck{messageId=" + this.messageId
        + ", conversationId=" + this.conversationId
        + ", sequence=" + this.sequence
        + ", revision=" + this.revision
        + ", status=" + this.status
        + ", cursor=" + this.cursor
        + "}";
  }
}
