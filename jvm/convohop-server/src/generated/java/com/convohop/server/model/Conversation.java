// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Conversation</code> result type. */
public final class Conversation implements WireValue {
  private final String conversationId;
  private final String revision;
  private final String title;
  private final @Nullable Map<String, @Nullable Object> props;
  private final String latestSequence;
  private final @Nullable Member membership;

  private Conversation(
      String conversationId,
      String revision,
      String title,
      @Nullable Map<String, @Nullable Object> props,
      String latestSequence,
      @Nullable Member membership) {
    this.conversationId = conversationId;
    this.revision = revision;
    this.title = title;
    this.props = props;
    this.latestSequence = latestSequence;
    this.membership = membership;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Conversation fromJson(@Nullable Object value) {
    return Wire.required(Conversation::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Conversation decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Conversation");
    return new Conversation(
        Wire.field(object, "Conversation", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Conversation", "revision", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Conversation", "title", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Conversation", "props", depth, Wire.optional(Scalars.PROPERTIES)),
        Wire.field(object, "Conversation", "latestSequence", depth, Wire.required(Scalars.DECIMAL)),
        Wire.field(object, "Conversation", "membership", depth, Wire.optional(Member::decode)));
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The <code>title</code> field. */
  public String getTitle() {
    return this.title;
  }

  /** The <code>props</code> field. */
  public @Nullable Map<String, @Nullable Object> getProps() {
    return this.props;
  }

  /** The <code>latestSequence</code> field. */
  public String getLatestSequence() {
    return this.latestSequence;
  }

  /** The <code>membership</code> field. */
  public @Nullable Member getMembership() {
    return this.membership;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("revision", Wire.json(this.revision));
    json.put("title", Wire.json(this.title));
    json.put("props", Wire.json(this.props));
    json.put("latestSequence", Wire.json(this.latestSequence));
    json.put("membership", Wire.json(this.membership));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Conversation)) {
      return false;
    }
    Conversation that = (Conversation) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.revision, that.revision)
        && Objects.equals(this.title, that.title)
        && Objects.equals(this.props, that.props)
        && Objects.equals(this.latestSequence, that.latestSequence)
        && Objects.equals(this.membership, that.membership);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.revision, this.title, this.props, this.latestSequence, this.membership);
  }

  @Override
  public String toString() {
    return "Conversation{conversationId=" + this.conversationId
        + ", revision=" + this.revision
        + ", title=" + this.title
        + ", props=" + this.props
        + ", latestSequence=" + this.latestSequence
        + ", membership=" + this.membership
        + "}";
  }
}
