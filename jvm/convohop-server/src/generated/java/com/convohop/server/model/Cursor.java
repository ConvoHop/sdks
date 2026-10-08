// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Cursor</code> result type. */
public final class Cursor implements WireValue {
  private final String incarnation;
  private final String conversationId;
  private final String sequence;

  private Cursor(
      String incarnation,
      String conversationId,
      String sequence) {
    this.incarnation = incarnation;
    this.conversationId = conversationId;
    this.sequence = sequence;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Cursor fromJson(@Nullable Object value) {
    return Wire.required(Cursor::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Cursor decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Cursor");
    return new Cursor(
        Wire.field(object, "Cursor", "incarnation", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Cursor", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "Cursor", "sequence", depth, Wire.required(Scalars.DECIMAL)));
  }

  /** The <code>incarnation</code> field. */
  public String getIncarnation() {
    return this.incarnation;
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>sequence</code> field. */
  public String getSequence() {
    return this.sequence;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("incarnation", Wire.json(this.incarnation));
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("sequence", Wire.json(this.sequence));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Cursor)) {
      return false;
    }
    Cursor that = (Cursor) other;
    return Objects.equals(this.incarnation, that.incarnation)
        && Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.sequence, that.sequence);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.incarnation, this.conversationId, this.sequence);
  }

  @Override
  public String toString() {
    return "Cursor{incarnation=" + this.incarnation
        + ", conversationId=" + this.conversationId
        + ", sequence=" + this.sequence
        + "}";
  }
}
