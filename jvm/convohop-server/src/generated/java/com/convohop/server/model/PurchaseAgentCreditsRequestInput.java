// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The <code>PurchaseAgentCreditsRequestInput</code> input type.
 *
 * <p>Build instances with {@link #builder()}. Fields without a value are omitted from the request.
 */
public final class PurchaseAgentCreditsRequestInput implements WireValue {
  private final String amount;
  private final String sharedPaymentToken;

  private PurchaseAgentCreditsRequestInput(Builder builder) {
    this.amount = Wire.present(builder.amount, "PurchaseAgentCreditsRequestInput.amount");
    this.sharedPaymentToken = Wire.present(builder.sharedPaymentToken, "PurchaseAgentCreditsRequestInput.sharedPaymentToken");
  }

  /**
   * A new builder.
   *
   * @return an empty builder
   */
  public static Builder builder() {
    return new Builder();
  }

  /** The <code>amount</code> field. */
  public String getAmount() {
    return this.amount;
  }

  /** The <code>sharedPaymentToken</code> field. */
  public String getSharedPaymentToken() {
    return this.sharedPaymentToken;
  }

  /** The JSON form of this input; fields without a value are omitted. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("amount", Wire.json(this.amount));
    json.put("sharedPaymentToken", Wire.json(this.sharedPaymentToken));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof PurchaseAgentCreditsRequestInput)) {
      return false;
    }
    PurchaseAgentCreditsRequestInput that = (PurchaseAgentCreditsRequestInput) other;
    return Objects.equals(this.amount, that.amount)
        && Objects.equals(this.sharedPaymentToken, that.sharedPaymentToken);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.amount, this.sharedPaymentToken);
  }

  @Override
  public String toString() {
    return "PurchaseAgentCreditsRequestInput{amount=" + this.amount
        + ", sharedPaymentToken=" + Wire.redacted(this.sharedPaymentToken)
        + "}";
  }

  /** Builds {@link PurchaseAgentCreditsRequestInput} values. */
  public static final class Builder {
    private @Nullable String amount;
    private @Nullable String sharedPaymentToken;

    private Builder() {}

    /**
     * Sets the <code>amount</code> field.
     *
     * <p>Required.
     *
     * @param amount the value
     * @return this builder
     */
    public Builder amount(String amount) {
      this.amount = Wire.nonNull(amount, "amount");
      return this;
    }

    /**
     * Sets the <code>sharedPaymentToken</code> field.
     *
     * <p>Required.
     *
     * @param sharedPaymentToken the value
     * @return this builder
     */
    public Builder sharedPaymentToken(String sharedPaymentToken) {
      this.sharedPaymentToken = Wire.nonNull(sharedPaymentToken, "sharedPaymentToken");
      return this;
    }

    /**
     * Builds the input.
     *
     * @return the input
     * @throws IllegalStateException if a required field is missing
     */
    public PurchaseAgentCreditsRequestInput build() {
      return new PurchaseAgentCreditsRequestInput(this);
    }
  }
}
