// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.model;

import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireValue;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The <code>SessionRequestOutcome</code> result type. */
public final class SessionRequestOutcome implements WireValue {
  private final String state;
  private final String requestId;
  private final String checkedAt;
  private final @Nullable String operation;
  private final @Nullable String receiptId;
  private final @Nullable String committedAt;
  private final @Nullable Session originalSession;
  private final @Nullable Session currentSession;
  private final @Nullable String currentState;

  private SessionRequestOutcome(
      String state,
      String requestId,
      String checkedAt,
      @Nullable String operation,
      @Nullable String receiptId,
      @Nullable String committedAt,
      @Nullable Session originalSession,
      @Nullable Session currentSession,
      @Nullable String currentState) {
    this.state = state;
    this.requestId = requestId;
    this.checkedAt = checkedAt;
    this.operation = operation;
    this.receiptId = receiptId;
    this.committedAt = committedAt;
    this.originalSession = originalSession;
    this.currentSession = currentSession;
    this.currentState = currentState;
  }

  /**
   * Decodes and validates an authority value, such as a stored {@link #toJson()} result.
   *
   * @param value the decoded JSON value
   * @return the validated value
   * @throws IllegalArgumentException if the value does not match the schema
   */
  public static SessionRequestOutcome fromJson(@Nullable Object value) {
    return Wire.required(SessionRequestOutcome::decode).decode(value, 0);
  }

  /**
   * Decodes a non-null value nested {@code depth} levels deep. Used by generated code.
   *
   * @param value the decoded JSON value
   * @param depth the nesting depth of the value
   * @return the validated value
   */
  public static SessionRequestOutcome decode(@Nullable Object value, int depth) {
    Map<String, @Nullable Object> object = Wire.object(value, "SessionRequestOutcome");
    return new SessionRequestOutcome(
        Wire.field(object, "SessionRequestOutcome", "state", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "SessionRequestOutcome", "requestId", depth, Wire.required(Scalars.UUID)),
        Wire.field(object, "SessionRequestOutcome", "checkedAt", depth, Wire.required(Wire.STRING)),
        Wire.field(object, "SessionRequestOutcome", "operation", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "SessionRequestOutcome", "receiptId", depth, Wire.optional(Scalars.UUID)),
        Wire.field(object, "SessionRequestOutcome", "committedAt", depth, Wire.optional(Wire.STRING)),
        Wire.field(object, "SessionRequestOutcome", "originalSession", depth, Wire.optional(Session::decode)),
        Wire.field(object, "SessionRequestOutcome", "currentSession", depth, Wire.optional(Session::decode)),
        Wire.field(object, "SessionRequestOutcome", "currentState", depth, Wire.optional(Wire.STRING)));
  }

  /** The <code>state</code> field. */
  public String getState() {
    return this.state;
  }

  /** The <code>requestId</code> field. */
  public String getRequestId() {
    return this.requestId;
  }

  /** The <code>checkedAt</code> field. */
  public String getCheckedAt() {
    return this.checkedAt;
  }

  /** The <code>operation</code> field. */
  public @Nullable String getOperation() {
    return this.operation;
  }

  /** The <code>receiptId</code> field. */
  public @Nullable String getReceiptId() {
    return this.receiptId;
  }

  /** The <code>committedAt</code> field. */
  public @Nullable String getCommittedAt() {
    return this.committedAt;
  }

  /** The <code>originalSession</code> field. */
  public @Nullable Session getOriginalSession() {
    return this.originalSession;
  }

  /** The <code>currentSession</code> field. */
  public @Nullable Session getCurrentSession() {
    return this.currentSession;
  }

  /** The <code>currentState</code> field. */
  public @Nullable String getCurrentState() {
    return this.currentState;
  }

  /** The JSON form of this value, with every field. */
  @Override
  public Map<String, @Nullable Object> toJson() {
    Map<String, @Nullable Object> json = new LinkedHashMap<>();
    json.put("state", Wire.json(this.state));
    json.put("requestId", Wire.json(this.requestId));
    json.put("checkedAt", Wire.json(this.checkedAt));
    json.put("operation", Wire.json(this.operation));
    json.put("receiptId", Wire.json(this.receiptId));
    json.put("committedAt", Wire.json(this.committedAt));
    json.put("originalSession", Wire.json(this.originalSession));
    json.put("currentSession", Wire.json(this.currentSession));
    json.put("currentState", Wire.json(this.currentState));
    return json;
  }

  @Override
  public boolean equals(@Nullable Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof SessionRequestOutcome)) {
      return false;
    }
    SessionRequestOutcome that = (SessionRequestOutcome) other;
    return Objects.equals(this.state, that.state)
        && Objects.equals(this.requestId, that.requestId)
        && Objects.equals(this.checkedAt, that.checkedAt)
        && Objects.equals(this.operation, that.operation)
        && Objects.equals(this.receiptId, that.receiptId)
        && Objects.equals(this.committedAt, that.committedAt)
        && Objects.equals(this.originalSession, that.originalSession)
        && Objects.equals(this.currentSession, that.currentSession)
        && Objects.equals(this.currentState, that.currentState);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.state, this.requestId, this.checkedAt, this.operation, this.receiptId, this.committedAt, this.originalSession, this.currentSession, this.currentState);
  }

  @Override
  public String toString() {
    return "SessionRequestOutcome{state=" + this.state
        + ", requestId=" + this.requestId
        + ", checkedAt=" + this.checkedAt
        + ", operation=" + this.operation
        + ", receiptId=" + this.receiptId
        + ", committedAt=" + this.committedAt
        + ", originalSession=" + this.originalSession
        + ", currentSession=" + this.currentSession
        + ", currentState=" + this.currentState
        + "}";
  }
}
