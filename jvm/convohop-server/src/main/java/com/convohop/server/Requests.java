package com.convohop.server;

import com.convohop.server.model.RequestResolution;

/**
 * Resolves and retries mutations by their original request ID. A {@link ConvoHopProblem} whose outcome is
 * {@code unknown} means the mutation may or may not have committed: resolve it, or retry it with the same request ID,
 * instead of sending it again under a new one.
 */
public final class Requests {
  private final Transport transport;
  private final String plane;

  Requests(Transport transport, String plane) {
    this.transport = transport;
    this.plane = plane;
  }

  /**
   * Reads what the authority knows about a request.
   *
   * @param requestId the original request ID
   * @return the resolution: {@code notObservedYet}, {@code accepted} or {@code committed}
   * @throws IllegalArgumentException if the request ID is not a canonical nonzero UUID
   * @throws ConvoHopProblem if the authority rejects the lookup or its reply is malformed
   */
  public RequestResolution resolve(String requestId) {
    return this.transport.resolve(this.plane, Checks.id(requestId, "requestId"));
  }

  /**
   * Resolves a mutation this client recorded and, when the authority has not observed it and the retry budget
   * allows, sends it again with its original request ID and payload.
   *
   * @param requestId the original request ID
   * @return the current resolution
   * @throws IllegalArgumentException if the request ID is not a canonical nonzero UUID
   * @throws IllegalStateException if this client holds no recovery record for the request
   * @throws ConvoHopProblem {@code RESOLUTION_REQUIRED} once the request is no longer eligible for resend, or the
   *     error of the lookup or the resend
   */
  public RequestResolution retry(String requestId) {
    return this.transport.retry(Checks.id(requestId, "requestId"));
  }
}
