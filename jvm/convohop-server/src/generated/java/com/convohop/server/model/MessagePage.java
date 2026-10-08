// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>MessagePage</code> result type. */
public final class MessagePage implements WireValue {
  private final List<Message> items;
  private final Boolean complete;
  private final Boolean refreshRequired;
  private final @Nullable String nextCursor;

  private MessagePage(
      List<Message> items,
      Boolean complete,
      Boolean refreshRequired,
      @Nullable String nextCursor) {
    this.items = items;
    this.complete = complete;
    this.refreshRequired = refreshRequired;
    this.nextCursor = nextCursor;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static MessagePage fromJson(@Nullable Object value) {
    return Wire.required(MessagePage::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static MessagePage decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "MessagePage");
    return new MessagePage(
        Wire.field(object, "MessagePage", "items", depth, Wire.required(Wire.list(Wire.required(Message::decode)))),
        Wire.field(object, "MessagePage", "complete", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "MessagePage", "refreshRequired", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "MessagePage", "nextCursor", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>items</code> field. */
  public List<Message> getItems() {
    return this.items;
  }

  /** The <code>complete</code> field. */
  public Boolean getComplete() {
    return this.complete;
  }

  /** The <code>refreshRequired</code> field. */
  public Boolean getRefreshRequired() {
    return this.refreshRequired;
  }

  /** The <code>nextCursor</code> field. */
  public @Nullable String getNextCursor() {
    return this.nextCursor;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("items", Wire.json(this.items));
    json.put("complete", Wire.json(this.complete));
    json.put("refreshRequired", Wire.json(this.refreshRequired));
    json.put("nextCursor", Wire.json(this.nextCursor));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof MessagePage)) {
      return false;
    }
    MessagePage that = (MessagePage) other;
    return Objects.equals(this.items, that.items)
        && Objects.equals(this.complete, that.complete)
        && Objects.equals(this.refreshRequired, that.refreshRequired)
        && Objects.equals(this.nextCursor, that.nextCursor);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.items, this.complete, this.refreshRequired, this.nextCursor);
  }

  @Override
  public String toString() {
    return "MessagePage{items=" + this.items
        + ", complete=" + this.complete
        + ", refreshRequired=" + this.refreshRequired
        + ", nextCursor=" + this.nextCursor
        + "}";
  }
}
