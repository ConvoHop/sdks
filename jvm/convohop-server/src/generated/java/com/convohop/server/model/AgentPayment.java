// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>AgentPayment</code> result type. */
public final class AgentPayment implements WireValue {
  private final String paymentId;
  private final String amount;
  private final String currency;
  private final String state;

  private AgentPayment(
      String paymentId,
      String amount,
      String currency,
      String state) {
    this.paymentId = paymentId;
    this.amount = amount;
    this.currency = currency;
    this.state = state;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static AgentPayment fromJson(@Nullable Object value) {
    return Wire.required(AgentPayment::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static AgentPayment decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "AgentPayment");
    return new AgentPayment(
        Wire.field(object, "AgentPayment", "paymentId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentPayment", "amount", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentPayment", "currency", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentPayment", "state", depth, Wire.required(Wire.STRING)));
  }

  /** The <code>paymentId</code> field. */
  public String getPaymentId() {
    return this.paymentId;
  }

  /** The <code>amount</code> field. */
  public String getAmount() {
    return this.amount;
  }

  /** The <code>currency</code> field. */
  public String getCurrency() {
    return this.currency;
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("paymentId", Wire.json(this.paymentId));
    json.put("amount", Wire.json(this.amount));
    json.put("currency", Wire.json(this.currency));
    json.put("state", Wire.json(this.state));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentPayment)) {
      return false;
    }
    AgentPayment that = (AgentPayment) other;
    return Objects.equals(this.paymentId, that.paymentId)
        && Objects.equals(this.amount, that.amount)
        && Objects.equals(this.currency, that.currency)
        && Objects.equals(this.state, that.state);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.paymentId, this.amount, this.currency, this.state);
  }

  @Override
  public String toString() {
    return "AgentPayment{paymentId=" + this.paymentId
        + ", amount=" + this.amount
        + ", currency=" + this.currency
        + ", state=" + this.state
        + "}";
  }
}
