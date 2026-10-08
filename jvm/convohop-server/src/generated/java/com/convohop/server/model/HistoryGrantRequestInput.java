// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>HistoryGrantRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class HistoryGrantRequestInput implements WireValue {
  private final String conversationId;
  private final String principalId;
  private final String membershipEpoch;
  private final String expectedRevision;
  private final String fromSequence;

  private HistoryGrantRequestInput(Builder builder) {
    this.conversationId = Wire.present(builder.conversationId, "HistoryGrantRequestInput.conversationId");
    this.principalId = Wire.present(builder.principalId, "HistoryGrantRequestInput.principalId");
    this.membershipEpoch = Wire.present(builder.membershipEpoch, "HistoryGrantRequestInput.membershipEpoch");
    this.expectedRevision = Wire.present(builder.expectedRevision, "HistoryGrantRequestInput.expectedRevision");
    this.fromSequence = Wire.present(builder.fromSequence, "HistoryGrantRequestInput.fromSequence");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>conversationId</code> field. */
  public String getConversationId() {
    return this.conversationId;
  }

  /** The <code>principalId</code> field. */
  public String getPrincipalId() {
    return this.principalId;
  }

  /** The <code>membershipEpoch</code> field. */
  public String getMembershipEpoch() {
    return this.membershipEpoch;
  }

  /** The <code>expectedRevision</code> field. */
  public String getExpectedRevision() {
    return this.expectedRevision;
  }

  /** The <code>fromSequence</code> field. */
  public String getFromSequence() {
    return this.fromSequence;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("conversationId", Wire.json(this.conversationId));
    json.put("principalId", Wire.json(this.principalId));
    json.put("membershipEpoch", Wire.json(this.membershipEpoch));
    json.put("expectedRevision", Wire.json(this.expectedRevision));
    json.put("fromSequence", Wire.json(this.fromSequence));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof HistoryGrantRequestInput)) {
      return false;
    }
    HistoryGrantRequestInput that = (HistoryGrantRequestInput) other;
    return Objects.equals(this.conversationId, that.conversationId)
        && Objects.equals(this.principalId, that.principalId)
        && Objects.equals(this.membershipEpoch, that.membershipEpoch)
        && Objects.equals(this.expectedRevision, that.expectedRevision)
        && Objects.equals(this.fromSequence, that.fromSequence);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.conversationId, this.principalId, this.membershipEpoch, this.expectedRevision, this.fromSequence);
  }

  @Override
  public String toString() {
    return "HistoryGrantRequestInput{conversationId=" + this.conversationId
        + ", principalId=" + this.principalId
        + ", membershipEpoch=" + this.membershipEpoch
        + ", expectedRevision=" + this.expectedRevision
        + ", fromSequence=" + this.fromSequence
        + "}";
  }

  /** Builds {@link HistoryGrantRequestInput} values. */
  public static final class Builder {
    private @Nullable String conversationId;
    private @Nullable String principalId;
    private @Nullable String membershipEpoch;
    private @Nullable String expectedRevision;
    private @Nullable String fromSequence;

    private Builder() {}

    /**
     * Sets the <code>conversationId</code> field.
     *
     * <p>Required.
     *
     * @param conversationId the value
     * @return this builder
     */
    public Builder conversationId(String conversationId) {
      this.conversationId = Wire.nonNull(conversationId, "conversationId");
      return this;
    }

    /**
     * Sets the <code>principalId</code> field.
     *
     * <p>Required.
     *
     * @param principalId the value
     * @return this builder
     */
    public Builder principalId(String principalId) {
      this.principalId = Wire.nonNull(principalId, "principalId");
      return this;
    }

    /**
     * Sets the <code>membershipEpoch</code> field.
     *
     * <p>Required.
     *
     * @param membershipEpoch the value
     * @return this builder
     */
    public Builder membershipEpoch(String membershipEpoch) {
      this.membershipEpoch = Wire.nonNull(membershipEpoch, "membershipEpoch");
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
     * Sets the <code>fromSequence</code> field.
     *
     * <p>Required.
     *
     * @param fromSequence the value
     * @return this builder
     */
    public Builder fromSequence(String fromSequence) {
      this.fromSequence = Wire.nonNull(fromSequence, "fromSequence");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public HistoryGrantRequestInput build() {
      return new HistoryGrantRequestInput(this);
    }
  }
}
