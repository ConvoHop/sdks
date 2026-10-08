// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>LiveSessionOperationInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class LiveSessionOperationInput implements WireValue {
  private final String operationId;

  private LiveSessionOperationInput(Builder builder) {
    this.operationId = Wire.present(builder.operationId, "LiveSessionOperationInput.operationId");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>operationId</code> field. */
  public String getOperationId() {
    return this.operationId;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("operationId", Wire.json(this.operationId));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof LiveSessionOperationInput)) {
      return false;
    }
    LiveSessionOperationInput that = (LiveSessionOperationInput) other;
    return Objects.equals(this.operationId, that.operationId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.operationId);
  }

  @Override
  public String toString() {
    return "LiveSessionOperationInput{operationId=" + this.operationId
        + "}";
  }

  /** Builds {@link LiveSessionOperationInput} values. */
  public static final class Builder {
    private @Nullable String operationId;

    private Builder() {}

    /**
     * Sets the <code>operationId</code> field.
     *
     * <p>Required.
     *
     * @param operationId the value
     * @return this builder
     */
    public Builder operationId(String operationId) {
      this.operationId = Wire.nonNull(operationId, "operationId");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public LiveSessionOperationInput build() {
      return new LiveSessionOperationInput(this);
    }
  }
}
