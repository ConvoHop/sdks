// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>Widget</code> result type. */
public final class Widget implements WireValue {
  private final String id;
  private final @Nullable String label;
  private final WidgetState state;
  private final String revision;

  private Widget(
      String id,
      @Nullable String label,
      WidgetState state,
      String revision) {
    this.id = id;
    this.label = label;
    this.state = state;
    this.revision = revision;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static Widget fromJson(@Nullable Object value) {
    return Wire.required(Widget::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static Widget decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "Widget");
    return new Widget(
        Wire.field(object, "Widget", "id", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "Widget", "label", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "Widget", "state", depth, Wire.required(WidgetState::decode)),
        Wire.field(object, "Widget", "revision", depth, Wire.required(Scalars.COUNTER)));
  }

  /** The <code>id</code> field. */
  public String getId() {
    return this.id;
  }

  /** The <code>label</code> field. */
  public @Nullable String getLabel() {
    return this.label;
  }

  /** The <code>state</code> field. */
  public WidgetState getState() {
    return this.state;
  }

  /** The <code>revision</code> field. */
  public String getRevision() {
    return this.revision;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("id", Wire.json(this.id));
    json.put("label", Wire.json(this.label));
    json.put("state", Wire.json(this.state));
    json.put("revision", Wire.json(this.revision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof Widget)) {
      return false;
    }
    Widget that = (Widget) other;
    return Objects.equals(this.id, that.id)
        && Objects.equals(this.label, that.label)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.revision, that.revision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.id, this.label, this.state, this.revision);
  }

  @Override
  public String toString() {
    return "Widget{id=" + this.id
        + ", label=" + this.label
        + ", state=" + this.state
        + ", revision=" + this.revision
        + "}";
  }
}
