// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>StartJobInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class StartJobInput implements WireValue {
  private final String itemId;
  private final @Nullable Integer repeat;
  private final @Nullable Map<String, @Nullable Object> props;

  private StartJobInput(Builder builder) {
    this.itemId = Wire.present(builder.itemId, "StartJobInput.itemId");
    this.repeat = builder.repeat;
    this.props = builder.props;
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>itemId</code> field. */
  public String getItemId() {
    return this.itemId;
  }

  /**
   * How many times to run.
   *
   * <p>The authority uses <code>1</code> when this field is omitted.
   */
  public @Nullable Integer getRepeat() {
    return this.repeat;
  }

  /** The <code>props</code> field. */
  public @Nullable Map<String, @Nullable Object> getProps() {
    return this.props;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("itemId", Wire.json(this.itemId));
    if (this.repeat != null) {
      json.put("repeat", Wire.json(this.repeat));
    }
    if (this.props != null) {
      json.put("props", Wire.json(this.props));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof StartJobInput)) {
      return false;
    }
    StartJobInput that = (StartJobInput) other;
    return Objects.equals(this.itemId, that.itemId)
        && Objects.equals(this.repeat, that.repeat)
        && Objects.equals(this.props, that.props);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.itemId, this.repeat, this.props);
  }

  @Override
  public String toString() {
    return "StartJobInput{itemId=" + this.itemId
        + ", repeat=" + this.repeat
        + ", props=" + this.props
        + "}";
  }

  /** Builds {@link StartJobInput} values. */
  public static final class Builder {
    private @Nullable String itemId;
    private @Nullable Integer repeat;
    private @Nullable Map<String, @Nullable Object> props;

    private Builder() {}

    /**
     * Sets the <code>itemId</code> field.
     *
     * <p>Required.
     *
     * @param itemId the value
     * @return this builder
     */
    public Builder itemId(String itemId) {
      this.itemId = Wire.nonNull(itemId, "itemId");
      return this;
    }

    /**
     * How many times to run.
     *
     * <p>The authority uses <code>1</code> when this field is omitted.
     *
     * @param repeat the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder repeat(@Nullable Integer repeat) {
      this.repeat = repeat;
      return this;
    }

    /**
     * Sets the <code>props</code> field.
     *
     * @param props the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder props(@Nullable Map<String, @Nullable Object> props) {
      this.props = Wire.immutable(props);
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public StartJobInput build() {
      return new StartJobInput(this);
    }
  }
}
