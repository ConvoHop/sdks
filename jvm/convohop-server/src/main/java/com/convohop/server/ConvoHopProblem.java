package com.convohop.server;

import java.time.Duration;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * A request the authority rejected, or one whose outcome the SDK could not establish.
 *
 * <p>Classify a problem by {@link #getCode()}. {@link #getOutcome()} says what is known about the request:
 * {@code rejected} means it had no effect, {@code committed} or {@code accepted} means it took effect, and
 * {@code unknown} means it may have taken effect, so resolve or retry the same request ID instead of sending a new
 * one. Messages never contain credentials.
 */
public class ConvoHopProblem extends RuntimeException {
  private static final long serialVersionUID = 1L;

  private final String code;
  private final String requestId;
  private final String outcome;
  private final int status;
  private final @Nullable Duration retryAfter;

  /**
   * Creates a problem.
   *
   * @param code the stable error code, such as {@code RATE_LIMITED}
   * @param requestId the request ID the problem belongs to
   * @param outcome what is known about the request: {@code rejected}, {@code unknown}, {@code committed} or
   *     {@code accepted}
   * @param status the HTTP status, or 0 when no response arrived
   * @param message a description without credentials
   */
  public ConvoHopProblem(String code, String requestId, String outcome, int status, String message) {
    this(code, requestId, outcome, status, message, null, null);
  }

  /**
   * Creates a problem with a retry delay and a cause.
   *
   * @param code the stable error code, such as {@code RATE_LIMITED}
   * @param requestId the request ID the problem belongs to
   * @param outcome what is known about the request: {@code rejected}, {@code unknown}, {@code committed} or
   *     {@code accepted}
   * @param status the HTTP status, or 0 when no response arrived
   * @param message a description without credentials
   * @param retryAfter how long to wait before resending the same request, or null
   * @param cause the underlying failure, or null
   */
  public ConvoHopProblem(
      String code,
      String requestId,
      String outcome,
      int status,
      String message,
      @Nullable Duration retryAfter,
      @Nullable Throwable cause) {
    super(Objects.requireNonNull(message, "message"), cause);
    this.code = Objects.requireNonNull(code, "code");
    this.requestId = Objects.requireNonNull(requestId, "requestId");
    this.outcome = Objects.requireNonNull(outcome, "outcome");
    this.status = status;
    this.retryAfter = retryAfter;
  }

  /**
   * Builds the most specific problem class for an authority error code.
   *
   * @param code the error code
   * @param requestId the request ID
   * @param outcome the request outcome
   * @param status the HTTP status
   * @param message the authority's message
   * @param retryAfter the retry delay, or null
   * @return the problem
   */
  static ConvoHopProblem authority(
      String code, String requestId, String outcome, int status, String message, @Nullable Duration retryAfter) {
    return code.equals(ScopeRequiredProblem.CODE)
        ? new ScopeRequiredProblem(requestId, outcome, status, message, retryAfter)
        : new ConvoHopProblem(code, requestId, outcome, status, message, retryAfter, null);
  }

  /**
   * The stable error code, such as {@code RATE_LIMITED} or {@code TRANSPORT_UNKNOWN}.
   *
   * @return the code
   */
  public String getCode() {
    return this.code;
  }

  /**
   * The request ID the problem belongs to. Resolve or retry with this ID when the outcome is {@code unknown}.
   *
   * @return the request ID
   */
  public String getRequestId() {
    return this.requestId;
  }

  /**
   * What is known about the request: {@code rejected}, {@code unknown}, {@code committed} or {@code accepted}.
   *
   * @return the outcome
   */
  public String getOutcome() {
    return this.outcome;
  }

  /**
   * The HTTP status, or 0 when no authority response arrived.
   *
   * @return the status
   */
  public int getStatus() {
    return this.status;
  }

  /**
   * How long to wait before resending the same request, when the authority sent a delay (for example with
   * {@code RATE_LIMITED}). Read from the error's {@code extensions.retryAfter}, else from an HTTP {@code Retry-After}
   * delay in seconds. The SDK never waits or resends on its own because of it.
   *
   * @return the delay in whole seconds, or null
   */
  public @Nullable Duration getRetryAfter() {
    return this.retryAfter;
  }
}
