// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>LiveSessionPage</code> result type. */
public final class LiveSessionPage implements WireValue {
  private final List<LiveSession> items;
  private final @Nullable String nextCursor;
  private final Boolean complete;
  private final @Nullable String partialReason;
  private final Boolean refreshRequired;

  private LiveSessionPage(
      List<LiveSession> items,
      @Nullable String nextCursor,
      Boolean complete,
      @Nullable String partialReason,
      Boolean refreshRequired) {
    this.items = items;
    this.nextCursor = nextCursor;
    this.complete = complete;
    this.partialReason = partialReason;
    this.refreshRequired = refreshRequired;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static LiveSessionPage fromJson(@Nullable Object value) {
    return Wire.required(LiveSessionPage::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static LiveSessionPage decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "LiveSessionPage");
    return new LiveSessionPage(
        Wire.field(object, "LiveSessionPage", "items", depth, Wire.required(Wire.list(Wire.required(LiveSession::decode)))),
        Wire.field(object, "LiveSessionPage", "nextCursor", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "LiveSessionPage", "complete", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "LiveSessionPage", "partialReason", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "LiveSessionPage", "refreshRequired", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>items</code> field. */
  public List<LiveSession> getItems() {
    return this.items;
  }

  /** The <code>nextCursor</code> field. */
  public @Nullable String getNextCursor() {
    return this.nextCursor;
  }

  /** The <code>complete</code> field. */
  public Boolean getComplete() {
    return this.complete;
  }

  /** The <code>partialReason</code> field. */
  public @Nullable String getPartialReason() {
    return this.partialReason;
  }

  /** The <code>refreshRequired</code> field. */
  public Boolean getRefreshRequired() {
    return this.refreshRequired;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("items", Wire.json(this.items));
    json.put("nextCursor", Wire.json(this.nextCursor));
    json.put("complete", Wire.json(this.complete));
    json.put("partialReason", Wire.json(this.partialReason));
    json.put("refreshRequired", Wire.json(this.refreshRequired));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionPage)) {
      return false;
    }
    LiveSessionPage that = (LiveSessionPage) other;
    return Objects.equals(this.items, that.items)
        && Objects.equals(this.nextCursor, that.nextCursor)
        && Objects.equals(this.complete, that.complete)
        && Objects.equals(this.partialReason, that.partialReason)
        && Objects.equals(this.refreshRequired, that.refreshRequired);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.items, this.nextCursor, this.complete, this.partialReason, this.refreshRequired);
  }

  @Override
  public String toString() {
    return "LiveSessionPage{items=" + this.items
        + ", nextCursor=" + this.nextCursor
        + ", complete=" + this.complete
        + ", partialReason=" + this.partialReason
        + ", refreshRequired=" + this.refreshRequired
        + "}";
  }
}
