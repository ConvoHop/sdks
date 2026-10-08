// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>SearchHit</code> result type. */
public final class SearchHit implements WireValue {
  private final String conversationId;
  private final @Nullable Message message;

  private SearchHit(
      String conversationId,
      @Nullable Message message) {
    this.conversationId = conversationId;
    this.message = message;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static SearchHit fromJson(@Nullable Object value) {
    return Wire.required(SearchHit::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static SearchHit decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "SearchHit");
    return new SearchHit(
        Wire.field(object, "SearchHit", "conversationId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "SearchHit", "message", depth, Wire.optional(Message::decode)));
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>message</code> field. */
  public @Nullable Message getMessage() {
    return this.message;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("message", Wire.json(this.message));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SearchHit)) {
      return false;
    }
    SearchHit that = (SearchHit) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.message, that.message);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.message);
  }

  @Override
  public String toString() {
    return "SearchHit{conversationId=" + this.conversationId
        + ", message=" + this.message
        + "}";
  }
}
