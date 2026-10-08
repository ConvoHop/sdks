// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Message</code> result type. */
public final class Message implements WireValue {
  private final String messageId;
  private final String conversationId;
  private final String authorId;
  private final String sequence;
  private final String revision;
  private final String revisionSequence;
  private final String createdAt;
  private final Boolean deleted;
  private final @Nullable String text;
  private final @Nullable Map<String, @Nullable Object> props;
  private final @Nullable String editedAt;

  private Message(
      String messageId,
      String conversationId,
      String authorId,
      String sequence,
      String revision,
      String revisionSequence,
      String createdAt,
      Boolean deleted,
      @Nullable String text,
      @Nullable Map<String, @Nullable Object> props,
      @Nullable String editedAt) {
    this.messageId = messageId;
    this.conversationId = conversationId;
    this.authorId = authorId;
    this.sequence = sequence;
    this.revision = revision;
    this.revisionSequence = revisionSequence;
    this.createdAt = createdAt;
    this.deleted = deleted;
    this.text = text;
    this.props = props;
    this.editedAt = editedAt;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Message fromJson(@Nullable Object value) {
    return Wire.required(Message::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Message decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Message");
    return new Message(
        Wire.field(object, "Message", "messageId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Message", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Message", "authorId", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Message", "sequence", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Message", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Message", "revisionSequence", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Message", "createdAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Message", "deleted", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "Message", "text", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "Message", "props", depth, Wire.optional(Scalars.PROPERTIES)),
        Wire.field(object, "Message", "editedAt", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>messageId</code> field. */
  public String getMessageId() {
    return this.messageId;
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>authorId</code> field. */
  public String getAuthorId() {
    return this.authorId;
  }

  /** The <code>sequence</code> field. */
  public String getSequence() {
    return this.sequence;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>revisionSequence</code> field. */
  public String getRevisionSequence() {
    return this.revisionSequence;
  }

  /** The <code>createdAt</code> field. */
  public String getCreatedAt() {
    return this.createdAt;
  }

  /** The <code>deleted</code> field. */
  public Boolean getDeleted() {
    return this.deleted;
  }

  /** The <code>text</code> field. */
  public @Nullable String getText() {
    return this.text;
  }

  /** The <code>props</code> field. */
  public @Nullable Map<String, @Nullable Object> getProps() {
    return this.props;
  }

  /** The <code>editedAt</code> field. */
  public @Nullable String getEditedAt() {
    return this.editedAt;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("messageId", Wire.json(this.messageId));
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("authorId", Wire.json(this.authorId));
    json.put("sequence", Wire.json(this.sequence));
    json.put("revision", Wire.json(this.revision));
    json.put("revisionSequence", Wire.json(this.revisionSequence));
    json.put("createdAt", Wire.json(this.createdAt));
    json.put("deleted", Wire.json(this.deleted));
    json.put("text", Wire.json(this.text));
    json.put("props", Wire.json(this.props));
    json.put("editedAt", Wire.json(this.editedAt));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Message)) {
      return false;
    }
    Message that = (Message) other;
    return Objects.equals(this.messageId, that.messageId)
        && Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.authorId, that.authorId)
        && Objects.equals(this.sequence, that.sequence)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.revisionSequence, that.revisionSequence)
        && Objects.equals(this.createdAt, that.createdAt)
        && Objects.equals(this.deleted, that.deleted)
        && Objects.equals(this.text, that.text)
        && Objects.equals(this.props, that.props)
        && Objects.equals(this.editedAt, that.editedAt);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.messageId, this.conversationId, this.authorId, this.sequence, this.revision, this.revisionSequence, this.createdAt, this.deleted, this.text, this.props, this.editedAt);
  }

  @Override
  public String toString() {
    return "Message{messageId=" + this.messageId
        + ", conversationId=" + this.conversationId
        + ", authorId=" + this.authorId
        + ", sequence=" + this.sequence
        + ", revision=" + this.revision
        + ", revisionSequence=" + this.revisionSequence
        + ", createdAt=" + this.createdAt
        + ", deleted=" + this.deleted
        + ", text=" + this.text
        + ", props=" + this.props
        + ", editedAt=" + this.editedAt
        + "}";
  }
}
