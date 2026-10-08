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
 * The <code>AlertLiveSessionInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class AlertLiveSessionInput implements WireValue {
  private final String liveSessionId;
  private final String expectedGeneration;
  private final List<String> principalIds;

  private AlertLiveSessionInput(Builder builder) {
    this.liveSessionId = Wire.present(builder.liveSessionId, "AlertLiveSessionInput.liveSessionId");
    this.expectedGeneration = Wire.present(builder.expectedGeneration, "AlertLiveSessionInput.expectedGeneration");
    this.principalIds = Wire.present(builder.principalIds, "AlertLiveSessionInput.principalIds");
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

  /** The <code>expectedGeneration</code> field. */
  public String getExpectedGeneration() {
    return this.expectedGeneration;
  }

  /** The <code>principalIds</code> field. */
  public List<String> getPrincipalIds() {
    return this.principalIds;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("expectedGeneration", Wire.json(this.expectedGeneration));
    json.put("principalIds", Wire.json(this.principalIds));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AlertLiveSessionInput)) {
      return false;
    }
    AlertLiveSessionInput that = (AlertLiveSessionInput) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.expectedGeneration, that.expectedGeneration)
        && Objects.equals(this.principalIds, that.principalIds);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.expectedGeneration, this.principalIds);
  }

  @Override
  public String toString() {
    return "AlertLiveSessionInput{liveSessionId=" + this.liveSessionId
        + ", expectedGeneration=" + this.expectedGeneration
        + ", principalIds=" + this.principalIds
        + "}";
  }

  /** Builds {@link AlertLiveSessionInput} values. */
  public static final class Builder {
    private @Nullable String liveSessionId;
    private @Nullable String expectedGeneration;
    private @Nullable List<String> principalIds;

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
     * Sets the <code>expectedGeneration</code> field.
     *
     * <p>Required.
     *
     * @param expectedGeneration the value
     * @return this builder
     */
    public Builder expectedGeneration(String expectedGeneration) {
      this.expectedGeneration = Wire.nonNull(expectedGeneration, "expectedGeneration");
      return this;
    }

    /**
     * Sets the <code>principalIds</code> field.
     *
     * <p>Required.
     *
     * @param principalIds the value
     * @return this builder
     */
    public Builder principalIds(List<String> principalIds) {
      this.principalIds = Wire.immutable(Wire.nonNull(principalIds, "principalIds"));
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public AlertLiveSessionInput build() {
      return new AlertLiveSessionInput(this);
    }
  }
}
