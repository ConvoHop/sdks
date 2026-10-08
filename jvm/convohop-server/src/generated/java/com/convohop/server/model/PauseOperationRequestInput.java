// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>PauseOperationRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class PauseOperationRequestInput implements WireValue {
  private final String operationId;
  private final String expectedRevision;

  private PauseOperationRequestInput(Builder builder) {
    this.operationId = Wire.present(builder.operationId, "PauseOperationRequestInput.operationId");
    this.expectedRevision = Wire.present(builder.expectedRevision, "PauseOperationRequestInput.expectedRevision");
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

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("operationId", Wire.json(this.operationId));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof PauseOperationRequestInput)) {
      return false;
    }
    PauseOperationRequestInput that = (PauseOperationRequestInput) other;
    return Objects.equals(this.operationId, that.operationId)
        && Objects.equals(this.expectedRevision, that.expectedRevision);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.operationId, this.expectedRevision);
  }

  @Override
  public String toString() {
    return "PauseOperationRequestInput{operationId=" + this.operationId
        + ", expectedRevision=" + this.expectedRevision
        + "}";
  }

  /** Builds {@link PauseOperationRequestInput} values. */
  public static final class Builder {
    private @Nullable String operationId;
    private @Nullable String expectedRevision;

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
    public PauseOperationRequestInput build() {
      return new PauseOperationRequestInput(this);
    }
  }
}
