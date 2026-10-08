// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>InboxPage</code> result type. */
public final class InboxPage implements WireValue {
  private final List<InboxItem> items;
  private final Boolean complete;
  private final Boolean refreshRequired;
  private final @Nullable String nextCursor;
  private final @Nullable String partialReason;

  private InboxPage(
      List<InboxItem> items,
      Boolean complete,
      Boolean refreshRequired,
      @Nullable String nextCursor,
      @Nullable String partialReason) {
    this.items = items;
    this.complete = complete;
    this.refreshRequired = refreshRequired;
    this.nextCursor = nextCursor;
    this.partialReason = partialReason;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static InboxPage fromJson(@Nullable Object value) {
    return Wire.required(InboxPage::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static InboxPage decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "InboxPage");
    return new InboxPage(
        Wire.field(object, "InboxPage", "items", depth, Wire.required(Wire.list(Wire.required(InboxItem::decode)))),
        Wire.field(object, "InboxPage", "complete", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "InboxPage", "refreshRequired", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "InboxPage", "nextCursor", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "InboxPage", "partialReason", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>items</code> field. */
  public List<InboxItem> getItems() {
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

  /** The <code>partialReason</code> field. */
  public @Nullable String getPartialReason() {
    return this.partialReason;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("items", Wire.json(this.items));
    json.put("complete", Wire.json(this.complete));
    json.put("refreshRequired", Wire.json(this.refreshRequired));
    json.put("nextCursor", Wire.json(this.nextCursor));
    json.put("partialReason", Wire.json(this.partialReason));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof InboxPage)) {
      return false;
    }
    InboxPage that = (InboxPage) other;
    return Objects.equals(this.items, that.items)
        && Objects.equals(this.complete, that.complete)
        && Objects.equals(this.refreshRequired, that.refreshRequired)
        && Objects.equals(this.nextCursor, that.nextCursor)
        && Objects.equals(this.partialReason, that.partialReason);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.items, this.complete, this.refreshRequired, this.nextCursor, this.partialReason);
  }

  @Override
  public String toString() {
    return "InboxPage{items=" + this.items
        + ", complete=" + this.complete
        + ", refreshRequired=" + this.refreshRequired
        + ", nextCursor=" + this.nextCursor
        + ", partialReason=" + this.partialReason
        + "}";
  }
}
