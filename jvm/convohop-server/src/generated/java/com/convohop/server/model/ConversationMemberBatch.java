// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>ConversationMemberBatch</code> result type. */
public final class ConversationMemberBatch implements WireValue {
  private final List<Member> items;

  private ConversationMemberBatch(
      List<Member> items) {
    this.items = items;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static ConversationMemberBatch fromJson(@Nullable Object value) {
    return Wire.required(ConversationMemberBatch::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static ConversationMemberBatch decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "ConversationMemberBatch");
    return new ConversationMemberBatch(
        Wire.field(object, "ConversationMemberBatch", "items", depth, Wire.required(Wire.list(Wire.required(Member::decode)))));
  }

  /** The <code>items</code> field. */
  public List<Member> getItems() {
    return this.items;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("items", Wire.json(this.items));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ConversationMemberBatch)) {
      return false;
    }
    ConversationMemberBatch that = (ConversationMemberBatch) other;
    return Objects.equals(this.items, that.items);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.items);
  }

  @Override
  public String toString() {
    return "ConversationMemberBatch{items=" + this.items
        + "}";
  }
}
