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
 * The <code>WidgetsInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class WidgetsInput implements WireValue {
  private final @Nullable List<WidgetState> states;

  private WidgetsInput(Builder builder) {
    this.states = builder.states;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>states</code> field. */
  public @Nullable List<WidgetState> getStates() {
    return this.states;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    if (this.states != null) {
      json.put("states", Wire.json(this.states));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof WidgetsInput)) {
      return false;
    }
    WidgetsInput that = (WidgetsInput) other;
    return Objects.equals(this.states, that.states);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.states);
  }

  @Override
  public String toString() {
    return "WidgetsInput{states=" + this.states
        + "}";
  }

  /** Builds {@link WidgetsInput} values. */
  public static final class Builder {
    private @Nullable List<WidgetState> states;

    private Builder() {}

    /**
     * Sets the <code>states</code> field.
     *
     * @param states the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder states(@Nullable List<WidgetState> states) {
      this.states = Wire.immutable(states);
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public WidgetsInput build() {
      return new WidgetsInput(this);
    }
  }
}
