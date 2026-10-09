// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>ClaimWidgetInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ClaimWidgetInput implements WireValue {
  private final String widgetId;

  private ClaimWidgetInput(Builder builder) {
    this.widgetId = Wire.present(builder.widgetId, "ClaimWidgetInput.widgetId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>widgetId</code> field. */
  public String getWidgetId() {
    return this.widgetId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("widgetId", Wire.json(this.widgetId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ClaimWidgetInput)) {
      return false;
    }
    ClaimWidgetInput that = (ClaimWidgetInput) other;
    return Objects.equals(this.widgetId, that.widgetId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.widgetId);
  }

  @Override
  public String toString() {
    return "ClaimWidgetInput{widgetId=" + this.widgetId
        + "}";
  }

  /** Builds {@link ClaimWidgetInput} values. */
  public static final class Builder {
    private @Nullable String widgetId;

    private Builder() {}

    /**
     * Sets the <code>widgetId</code> field.
     *
     * <p>Required.
     *
     * @param widgetId the value
     * @return this builder
     */
    public Builder widgetId(String widgetId) {
      this.widgetId = Wire.nonNull(widgetId, "widgetId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ClaimWidgetInput build() {
      return new ClaimWidgetInput(this);
    }
  }
}
