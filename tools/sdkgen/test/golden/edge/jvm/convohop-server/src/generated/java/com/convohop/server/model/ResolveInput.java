// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>ResolveInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class ResolveInput implements WireValue {
  private final String requestId;

  private ResolveInput(Builder builder) {
    this.requestId = Wire.present(builder.requestId, "ResolveInput.requestId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("requestId", Wire.json(this.requestId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ResolveInput)) {
      return false;
    }
    ResolveInput that = (ResolveInput) other;
    return Objects.equals(this.requestId, that.requestId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.requestId);
  }

  @Override
  public String toString() {
    return "ResolveInput{requestId=" + this.requestId
        + "}";
  }

  /** Builds {@link ResolveInput} values. */
  public static final class Builder {
    private @Nullable String requestId;

    private Builder() {}

    /**
     * Sets the <code>requestId</code> field.
     *
     * <p>Required.
     *
     * @param requestId the value
     * @return this builder
     */
    public Builder requestId(String requestId) {
      this.requestId = Wire.nonNull(requestId, "requestId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public ResolveInput build() {
      return new ResolveInput(this);
    }
  }
}
