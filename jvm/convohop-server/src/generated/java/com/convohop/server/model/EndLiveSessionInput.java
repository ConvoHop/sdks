// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>EndLiveSessionInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class EndLiveSessionInput implements WireValue {
  private final String liveSessionId;
  private final String expectedGeneration;
  private final String expectedRevision;

  private EndLiveSessionInput(Builder builder) {
    this.liveSessionId = Wire.present(builder.liveSessionId, "EndLiveSessionInput.liveSessionId");
    this.expectedGeneration = Wire.present(builder.expectedGeneration, "EndLiveSessionInput.expectedGeneration");
    this.expectedRevision = Wire.present(builder.expectedRevision, "EndLiveSessionInput.expectedRevision");
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

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    json.put("expectedGeneration", Wire.json(this.expectedGeneration));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof EndLiveSessionInput)) {
      return false;
    }
    EndLiveSessionInput that = (EndLiveSessionInput) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.expectedGeneration, that.expectedGeneration)
        && Objects.equals(this.expectedRevision, that.expectedRevision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.expectedGeneration, this.expectedRevision);
  }

  @Override
  public String toString() {
    return "EndLiveSessionInput{liveSessionId=" + this.liveSessionId
        + ", expectedGeneration=" + this.expectedGeneration
        + ", expectedRevision=" + this.expectedRevision
        + "}";
  }

  /** Builds {@link EndLiveSessionInput} values. */
  public static final class Builder {
    private @Nullable String liveSessionId;
    private @Nullable String expectedGeneration;
    private @Nullable String expectedRevision;

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
     * Sets the <code>expectedRevision</code> field.
     *
     * <p>Required.
     *
     * @param expectedRevision the value
     * @return this builder
     */
    public Builder expectedRevision(String expectedRevision) {
      this.expectedRevision = Wire.nonNull(expectedRevision, "expectedRevision");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public EndLiveSessionInput build() {
      return new EndLiveSessionInput(this);
    }
  }
}
