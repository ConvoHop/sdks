package com.convohop.server;

import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * {@code SCOPE_REQUIRED}: the backend key lacks a scope the operation requires (403, rejected, not retryable).
 * Classify it by {@link ConvoHopProblem#getCode()}; {@link #getScope()} is a diagnostic detail.
 */
public final class ScopeRequiredProblem extends ConvoHopProblem {
  private static final long serialVersionUID = 1L;

  /** The error code. */
  public static final String CODE = "SCOPE_REQUIRED";

  private static final Pattern SCOPE =
      Pattern.compile("^The backend key requires the current ([a-z][A-Za-z0-9]{0,63}) scope$");

  private final @Nullable String scope;

  /**
   * Creates the problem and reads the missing scope from the authority's message.
   *
   * @param requestId the request ID
   * @param outcome the request outcome
   * @param status the HTTP status
   * @param message the authority's message
   * @param retryAfter the retry delay, or null
   */
  public ScopeRequiredProblem(
      String requestId, String outcome, int status, String message, @Nullable Duration retryAfter) {
    super(CODE, requestId, outcome, status, message, retryAfter, null);
    Matcher matcher = SCOPE.matcher(message);
    this.scope = matcher.matches() ? matcher.group(1) : null;
  }

  /**
   * The missing scope. The authority names it only in the message, so this is null when the message does not match
   * the documented wording. A missing read scope is reported as the read scope even where its manage scope (for
   * example {@code callManage} for {@code callRead}) would also satisfy the operation.
   *
   * @return the scope, or null
   */
  public @Nullable String getScope() {
    return this.scope;
  }
}
