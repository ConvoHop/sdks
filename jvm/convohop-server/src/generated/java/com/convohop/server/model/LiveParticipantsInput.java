// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>LiveParticipantsInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class LiveParticipantsInput implements WireValue {
  private final String liveSessionId;
  private final @Nullable Integer limit;
  private final @Nullable String cursor;

  private LiveParticipantsInput(Builder builder) {
    this.liveSessionId = Wire.present(builder.liveSessionId, "LiveParticipantsInput.liveSessionId");
    this.limit = builder.limit;
    this.cursor = builder.cursor;
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

  /**
   * The <code>limit</code> field.
   *
   * <p>The authority uses <code>50</code> when this field is omitted.
   */
  public @Nullable Integer getLimit() {
    return this.limit;
  }

  /** The <code>cursor</code> field. */
  public @Nullable String getCursor() {
    return this.cursor;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("liveSessionId", Wire.json(this.liveSessionId));
    if (this.limit != null) {
      json.put("limit", Wire.json(this.limit));
    }
    if (this.cursor != null) {
      json.put("cursor", Wire.json(this.cursor));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveParticipantsInput)) {
      return false;
    }
    LiveParticipantsInput that = (LiveParticipantsInput) other;
    return Objects.equals(this.liveSessionId, that.liveSessionId)
        && Objects.equals(this.limit, that.limit)
        && Objects.equals(this.cursor, that.cursor);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.liveSessionId, this.limit, this.cursor);
  }

  @Override
  public String toString() {
    return "LiveParticipantsInput{liveSessionId=" + this.liveSessionId
        + ", limit=" + this.limit
        + ", cursor=" + this.cursor
        + "}";
  }

  /** Builds {@link LiveParticipantsInput} values. */
  public static final class Builder {
    private @Nullable String liveSessionId;
    private @Nullable Integer limit;
    private @Nullable String cursor;

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
     * Sets the <code>limit</code> field.
     *
     * <p>The authority uses <code>50</code> when this field is omitted.
     *
     * @param limit the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder limit(@Nullable Integer limit) {
      this.limit = limit;
      return this;
    }

    /**
     * Sets the <code>cursor</code> field.
     *
     * @param cursor the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder cursor(@Nullable String cursor) {
      this.cursor = cursor;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public LiveParticipantsInput build() {
      return new LiveParticipantsInput(this);
    }
  }
}
