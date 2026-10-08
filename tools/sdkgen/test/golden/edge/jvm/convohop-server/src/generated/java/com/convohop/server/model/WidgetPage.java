// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>WidgetPage</code> result type. */
public final class WidgetPage implements WireValue {
  private final List<Widget> items;
  private final Boolean complete;
  private final Boolean refreshRequired;

  private WidgetPage(
      List<Widget> items,
      Boolean complete,
      Boolean refreshRequired) {
    this.items = items;
    this.complete = complete;
    this.refreshRequired = refreshRequired;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static WidgetPage fromJson(@Nullable Object value) {
    return Wire.required(WidgetPage::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static WidgetPage decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "WidgetPage");
    return new WidgetPage(
        Wire.field(object, "WidgetPage", "items", depth, Wire.required(Wire.list(Wire.required(Widget::decode)))),
        Wire.field(object, "WidgetPage", "complete", depth, Wire.required(Wire.BOOLEAN)),
        Wire.field(object, "WidgetPage", "refreshRequired", depth, Wire.required(Wire.BOOLEAN)));
  }

  /** The <code>items</code> field. */
  public List<Widget> getItems() {
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

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("items", Wire.json(this.items));
    json.put("complete", Wire.json(this.complete));
    json.put("refreshRequired", Wire.json(this.refreshRequired));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof WidgetPage)) {
      return false;
    }
    WidgetPage that = (WidgetPage) other;
    return Objects.equals(this.items, that.items)
        && Objects.equals(this.complete, that.complete)
        && Objects.equals(this.refreshRequired, that.refreshRequired);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.items, this.complete, this.refreshRequired);
  }

  @Override
  public String toString() {
    return "WidgetPage{items=" + this.items
        + ", complete=" + this.complete
        + ", refreshRequired=" + this.refreshRequired
        + "}";
  }
}
