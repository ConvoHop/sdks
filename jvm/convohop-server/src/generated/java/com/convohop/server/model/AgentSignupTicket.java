// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>AgentSignupTicket</code> result type. */
public final class AgentSignupTicket implements WireValue {
  private final String signupId;
  private final String confirmationCode;
  private final String expiresAt;
  private final Integer pollAfterSeconds;

  private AgentSignupTicket(
      String signupId,
      String confirmationCode,
      String expiresAt,
      Integer pollAfterSeconds) {
    this.signupId = signupId;
    this.confirmationCode = confirmationCode;
    this.expiresAt = expiresAt;
    this.pollAfterSeconds = pollAfterSeconds;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static AgentSignupTicket fromJson(@Nullable Object value) {
    return Wire.required(AgentSignupTicket::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static AgentSignupTicket decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "AgentSignupTicket");
    return new AgentSignupTicket(
        Wire.field(object, "AgentSignupTicket", "signupId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "AgentSignupTicket", "confirmationCode", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentSignupTicket", "expiresAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "AgentSignupTicket", "pollAfterSeconds", depth, Wire.required(Wire.INT)));
  }

  /** The <code>signupId</code> field. */
  public String getSignupId() {
    return this.signupId;
  }

  /** The <code>confirmationCode</code> field. */
  public String getConfirmationCode() {
    return this.confirmationCode;
  }

  /** The <code>expiresAt</code> field. */
  public String getExpiresAt() {
    return this.expiresAt;
  }

  /** The <code>pollAfterSeconds</code> field. */
  public Integer getPollAfterSeconds() {
    return this.pollAfterSeconds;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("signupId", Wire.json(this.signupId));
    json.put("confirmationCode", Wire.json(this.confirmationCode));
    json.put("expiresAt", Wire.json(this.expiresAt));
    json.put("pollAfterSeconds", Wire.json(this.pollAfterSeconds));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof AgentSignupTicket)) {
      return false;
    }
    AgentSignupTicket that = (AgentSignupTicket) other;
    return Objects.equals(this.signupId, that.signupId)
        && Objects.equals(this.confirmationCode, that.confirmationCode)
        && Objects.equals(this.expiresAt, that.expiresAt)
        && Objects.equals(this.pollAfterSeconds, that.pollAfterSeconds);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.signupId, this.confirmationCode, this.expiresAt, this.pollAfterSeconds);
  }

  @Override
  public String toString() {
    return "AgentSignupTicket{signupId=" + this.signupId
        + ", confirmationCode=" + this.confirmationCode
        + ", expiresAt=" + this.expiresAt
        + ", pollAfterSeconds=" + this.pollAfterSeconds
        + "}";
  }
}
