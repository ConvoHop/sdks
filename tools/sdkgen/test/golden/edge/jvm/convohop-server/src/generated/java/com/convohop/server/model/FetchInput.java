// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>FetchInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class FetchInput implements WireValue {
  private final @Nullable HTTPMethod method;

  private FetchInput(Builder builder) {
    this.method = builder.method;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * The <code>method</code> field.
   *
   * <p>The authority uses <code>"GET"</code> when this field is omitted.
   */
  public @Nullable HTTPMethod getMethod() {
    return this.method;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    if (this.method != null) {
      json.put("method", Wire.json(this.method));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof FetchInput)) {
      return false;
    }
    FetchInput that = (FetchInput) other;
    return Objects.equals(this.method, that.method);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.method);
  }

  @Override
  public String toString() {
    return "FetchInput{method=" + this.method
        + "}";
  }

  /** Builds {@link FetchInput} values. */
  public static final class Builder {
    private @Nullable HTTPMethod method;

    private Builder() {}

    /**
     * Sets the <code>method</code> field.
     *
     * <p>The authority uses <code>"GET"</code> when this field is omitted.
     *
     * @param method the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder method(@Nullable HTTPMethod method) {
      this.method = method;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public FetchInput build() {
      return new FetchInput(this);
    }
  }
}
