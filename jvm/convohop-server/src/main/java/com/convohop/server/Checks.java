package com.convohop.server;

import com.convohop.server.internal.Wire;
import java.math.BigInteger;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/** Argument and result checks shared by the hand-written clients. */
final class Checks {
  private static final Pattern COUNTER = Pattern.compile("^(0|[1-9][0-9]*)$");
  private static final BigInteger MAX_COUNTER = BigInteger.valueOf(Long.MAX_VALUE);

  private Checks() {}

  /**
   * Checks a canonical nonzero UUID argument.
   *
   * @param value the argument
   * @param name the parameter name
   * @return the argument
   * @throws NullPointerException if the argument is null
   * @throws IllegalArgumentException if it is not a canonical nonzero UUID
   */
  static String id(@Nullable String value, String name) {
    return Transport.id(Wire.nonNull(value, name), name);
  }

  /**
   * Checks a canonical decimal counter argument: a signed 64-bit value of zero or more.
   *
   * @param value the argument
   * @param name the parameter name
   * @return the argument
   * @throws NullPointerException if the argument is null
   * @throws IllegalArgumentException if it is not a canonical decimal counter
   */
  static String counter(@Nullable String value, String name) {
    String counter = Wire.nonNull(value, name);
    if (!COUNTER.matcher(counter).matches() || counter.length() > 19
        || new BigInteger(counter).compareTo(MAX_COUNTER) > 0) {
      throw new IllegalArgumentException(name + " must be a canonical decimal counter");
    }
    return counter;
  }

  /**
   * Checks a page size, defaulting to 100.
   *
   * @param limit the page size, or null for 100
   * @return the page size
   * @throws IllegalArgumentException unless it is 1..100
   */
  static int pageLimit(@Nullable Integer limit) {
    int value = limit == null ? 100 : limit;
    if (value < 1 || value > 100) {
      throw new IllegalArgumentException("Page size must be 1..100");
    }
    return value;
  }

  /**
   * Checks a membership role.
   *
   * @param role the role
   * @return the role
   * @throws IllegalArgumentException unless it is {@code member} or {@code moderator}
   */
  static String role(@Nullable String role) {
    if (!"member".equals(role) && !"moderator".equals(role)) {
      throw new IllegalArgumentException("Invalid membership role");
    }
    return role;
  }

  /**
   * Requires the current result of a reply.
   *
   * @param <T> the result type
   * @param value the result
   * @param requestId the reply's request ID
   * @return the result
   * @throws ConvoHopProblem {@code INVALID_RESPONSE} if it is missing
   */
  static <T> T required(@Nullable T value, String requestId) {
    if (value == null) {
      throw Transport.missingResult(requestId);
    }
    return value;
  }

  /**
   * The error for a result that names a different resource than the request did.
   *
   * @param what the resource
   * @param requestId the reply's request ID
   * @return an {@code INVALID_RESPONSE} problem
   */
  static ConvoHopProblem mismatch(String what, String requestId) {
    return new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", 503, what + " does not match the request");
  }
}
