package com.convohop.server.internal;

import java.util.Map;
import org.jspecify.annotations.Nullable;

/** Sends generated operations. The generated API classes delegate every call to one executor. Not API. */
@FunctionalInterface
public interface OperationExecutor {
  /**
   * Sends one operation and decodes its payload.
   *
   * @param <T> the payload type
   * @param operation the operation
   * @param input the operation input as JSON, or null when the operation takes none
   * @param requestId the request ID to send, or null to generate one
   * @param permit the credential delivery permit, or null
   * @return the decoded payload
   */
  <T extends @Nullable Object> T execute(
      OperationDescriptor<T> operation,
      @Nullable Map<String, @Nullable Object> input,
      @Nullable String requestId,
      @Nullable Object permit);

  /**
   * The failure for a reply that decoded but breaks the operation's contract, such as a page that does not advance.
   *
   * @param requestId the request ID of the reply
   * @param message what is wrong with the reply
   * @return the exception to throw
   */
  default RuntimeException invalidResponse(String requestId, String message) {
    return new IllegalStateException(message);
  }
}
