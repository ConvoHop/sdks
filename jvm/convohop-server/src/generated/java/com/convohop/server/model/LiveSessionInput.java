// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>LiveSessionInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class LiveSessionInput implements WireValue {
  private final String liveSessionId;

  private LiveSessionInput(Builder builder) {
    this.liveSessionId = Wire.present(builder.liveSessionId, "LiveSessionInput.liveSessionId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>liveSessionId</code> field. */
  public String getLiveSessionId() {
    return this.liveSessionId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionInput)) {
      return false;
    }
    LiveSessionInput that = (LiveSessionInput) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId);
  }

  @Override
  public String toString() {
    return "LiveSessionInput{liveSessionId=" + this.liveSessionId
        + "}";
  }

  /** Builds {@link LiveSessionInput} values. */
  public static final class Builder {
    private @Nullable String liveSessionId;

    private Builder() {}

    /**
     * Sets the <code>liveSessionId</code> field.
     *
     * <p>Required.
     *
     * @param liveSessionId the value
     * @return this builder
     */
    public Builder liveSessionId(String liveSessionId) {
      this.liveSessionId = Wire.nonNull(liveSessionId, "liveSessionId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public LiveSessionInput build() {
      return new LiveSessionInput(this);
    }
  }
}
