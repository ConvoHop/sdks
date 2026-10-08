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
 * The <code>ShapeInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ShapeInput implements WireValue {
  private final String kind;
  private final List<Integer> sides;

  private ShapeInput(Builder builder) {
    this.kind = Wire.present(builder.kind, "ShapeInput.kind");
    this.sides = Wire.present(builder.sides, "ShapeInput.sides");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>kind</code> field. */
  public String getKind() {
    return this.kind;
  }

  /** The <code>sides</code> field. */
  public List<Integer> getSides() {
    return this.sides;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("kind", Wire.json(this.kind));
    json.put("sides", Wire.json(this.sides));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ShapeInput)) {
      return false;
    }
    ShapeInput that = (ShapeInput) other;
    return Objects.equals(this.kind, that.kind)
        && Objects.equals(this.sides, that.sides);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.kind, this.sides);
  }

  @Override
  public String toString() {
    return "ShapeInput{kind=" + this.kind
        + ", sides=" + this.sides
        + "}";
  }

  /** Builds {@link ShapeInput} values. */
  public static final class Builder {
    private @Nullable String kind;
    private @Nullable List<Integer> sides;

    private Builder() {}

    /**
     * Sets the <code>kind</code> field.
     *
     * <p>Required.
     *
     * @param kind the value
     * @return this builder
     */
    public Builder kind(String kind) {
      this.kind = Wire.nonNull(kind, "kind");
      return this;
    }

    /**
     * Sets the <code>sides</code> field.
     *
     * <p>Required.
     *
     * @param sides the value
     * @return this builder
     */
    public Builder sides(List<Integer> sides) {
      this.sides = Wire.immutable(Wire.nonNull(sides, "sides"));
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ShapeInput build() {
      return new ShapeInput(this);
    }
  }
}
