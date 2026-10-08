// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>PolicyChangeInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class PolicyChangeInput implements WireValue {
  private final String kind;
  private final @Nullable String reason;
  private final @Nullable String holdId;

  private PolicyChangeInput(Builder builder) {
    this.kind = Wire.present(builder.kind, "PolicyChangeInput.kind");
    this.reason = builder.reason;
    this.holdId = builder.holdId;
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

  /** The <code>reason</code> field. */
  public @Nullable String getReason() {
    return this.reason;
  }

  /** The <code>holdId</code> field. */
  public @Nullable String getHoldId() {
    return this.holdId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("kind", Wire.json(this.kind));
    if (this.reason != null) {
      json.put("reason", Wire.json(this.reason));
    }
    if (this.holdId != null) {
      json.put("holdId", Wire.json(this.holdId));
    }
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof PolicyChangeInput)) {
      return false;
    }
    PolicyChangeInput that = (PolicyChangeInput) other;
    return Objects.equals(this.kind, that.kind)
        && Objects.equals(this.reason, that.reason)
        && Objects.equals(this.holdId, that.holdId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.kind, this.reason, this.holdId);
  }

  @Override
  public String toString() {
    return "PolicyChangeInput{kind=" + this.kind
        + ", reason=" + this.reason
        + ", holdId=" + this.holdId
        + "}";
  }

  /** Builds {@link PolicyChangeInput} values. */
  public static final class Builder {
    private @Nullable String kind;
    private @Nullable String reason;
    private @Nullable String holdId;

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
     * Sets the <code>reason</code> field.
     *
     * @param reason the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder reason(@Nullable String reason) {
      this.reason = reason;
      return this;
    }

    /**
     * Sets the <code>holdId</code> field.
     *
     * @param holdId the value, or {@code null} to omit the field
     * @return this builder
     */
    public Builder holdId(@Nullable String holdId) {
      this.holdId = holdId;
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public PolicyChangeInput build() {
      return new PolicyChangeInput(this);
    }
  }
}
