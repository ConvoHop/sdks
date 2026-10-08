// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>CreateWidgetInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class CreateWidgetInput implements WireValue {
  private final String label;
  private final @Nullable WidgetState state;
  private final @Nullable Double ratio;
  private final @Nullable List<List<Integer>> nested;
  private final @Nullable ShapeInput shape;

  private CreateWidgetInput(Builder builder) {
    this.label = Wire.present(builder.label, "CreateWidgetInput.label");
    this.state = builder.state;
    this.ratio = builder.ratio;
    this.nested = builder.nested;
    this.shape = builder.shape;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>label</code> field. */
  public String getLabel() {
    return this.label;
  }

  /**
   * The <code>state</code> field.
   *
   * <p>The authority uses <code>"ACTIVE"</code> when this field is omitted.
   */
  public @Nullable WidgetState getState() {
    return this.state;
  }

  /**
   * The <code>ratio</code> field.
   *
   * <p>The authority uses <code>0.5</code> when this field is omitted.
   */
  public @Nullable Double getRatio() {
    return this.ratio;
  }

  /** The <code>nested</code> field. */
  public @Nullable List<List<Integer>> getNested() {
    return this.nested;
  }

  /**
   * The <code>shape</code> field.
   *
   * <p>The authority uses <code>{"kind":"box","sides":[1,2]}</code> when this field is omitted.
   */
  public @Nullable ShapeInput getShape() {
    return this.shape;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("label", Wire.json(this.label));
    if (this.state != null) {
      json.put("state", Wire.json(this.state));
    }
    if (this.ratio != null) {
      json.put("ratio", Wire.json(this.ratio));
    }
    if (this.nested != null) {
      json.put("nested", Wire.json(this.nested));
    }
    if (this.shape != null) {
      json.put("shape", Wire.json(this.shape));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof CreateWidgetInput)) {
      return false;
    }
    CreateWidgetInput that = (CreateWidgetInput) other;
    return Objects.equals(this.label, that.label)
        && Objects.equals(this.state, that.state)
        && Objects.equals(this.ratio, that.ratio)
        && Objects.equals(this.nested, that.nested)
        && Objects.equals(this.shape, that.shape);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.label, this.state, this.ratio, this.nested, this.shape);
  }

  @Override
  public String toString() {
    return "CreateWidgetInput{label=" + this.label
        + ", state=" + this.state
        + ", ratio=" + this.ratio
        + ", nested=" + this.nested
        + ", shape=" + this.shape
        + "}";
  }

  /** Builds {@link CreateWidgetInput} values. */
  public static final class Builder {
    private @Nullable String label;
    private @Nullable WidgetState state;
    private @Nullable Double ratio;
    private @Nullable List<List<Integer>> nested;
    private @Nullable ShapeInput shape;

    private Builder() {}

    /**
     * Sets the <code>label</code> field.
     *
     * <p>Required.
     *
     * @param label the value
     * @return this builder
     */
    public Builder label(String label) {
      this.label = Wire.nonNull(label, "label");
      return this;
    }

    /**
     * Sets the <code>state</code> field.
     *
     * <p>The authority uses <code>"ACTIVE"</code> when this field is omitted.
     *
     * @param state the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder state(@Nullable WidgetState state) {
      this.state = state;
      return this;
    }

    /**
     * Sets the <code>ratio</code> field.
     *
     * <p>The authority uses <code>0.5</code> when this field is omitted.
     *
     * @param ratio the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder ratio(@Nullable Double ratio) {
      this.ratio = ratio;
      return this;
    }

    /**
     * Sets the <code>nested</code> field.
     *
     * @param nested the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder nested(@Nullable List<List<Integer>> nested) {
      this.nested = Wire.immutable(nested);
      return this;
    }

    /**
     * Sets the <code>shape</code> field.
     *
     * <p>The authority uses <code>{"kind":"box","sides":[1,2]}</code> when this field is omitted.
     *
     * @param shape the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder shape(@Nullable ShapeInput shape) {
      this.shape = shape;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public CreateWidgetInput build() {
      return new CreateWidgetInput(this);
    }
  }
}
