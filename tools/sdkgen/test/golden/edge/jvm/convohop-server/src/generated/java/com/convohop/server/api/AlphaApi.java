// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.api;

import com.convohop.server.internal.OperationExecutor;
import com.convohop.server.internal.Wire;
import com.convohop.server.model.Capabilities;
import com.convohop.server.model.FetchInput;
import com.convohop.server.model.Job;
import com.convohop.server.model.JobInput;
import com.convohop.server.model.Receipt;
import com.convohop.server.model.RedeemInput;
import com.convohop.server.model.ResolveInput;
import com.convohop.server.model.StartJobInput;
import com.convohop.server.model.StartJobPayload;
import org.jspecify.annotations.Nullable;

/**
 * The <code>alpha</code> plane: Items, jobs and realtime events.
 *
 * <p>Obtain an instance from a client; every call blocks until the authority answers or the request fails.
 */
public final class AlphaApi {
  private final OperationExecutor executor;

  /**
   * Binds the plane to an executor. Clients create instances; applications do not call this.
   *
   * @param executor the executor that sends requests
   */
  public AlphaApi(OperationExecutor executor) {
    this.executor = Wire.nonNull(executor, "executor");
  }

  /**
   * Read the server capabilities.
   *
   * <p>Server capabilities.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: userToken, serverKey.
   *
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public Capabilities capabilities() {
    return this.executor.execute(Operations.ALPHA_CAPABILITIES, null, null, null);
  }

  /**
   * Look up the outcome of an earlier alpha mutation by requestId.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: userToken (condition owner), serverKey (scopes itemRead).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public Receipt resolveRequest(ResolveInput input) {
    return this.executor.execute(Operations.ALPHA_RESOLVE_REQUEST, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Poll a job that alpha.startJob started.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: serverKey (scopes itemRead).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public @Nullable Job job(JobInput input) {
    return this.executor.execute(Operations.ALPHA_JOB, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * Fetch a &lt;status&gt; for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, &amp; a back&#92;slash for _escaping_ in snake_case.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: userToken, serverKey (scopes itemRead, widgetWrite).
   *
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   * @deprecated Use capabilities.
   */
  @Deprecated
  public @Nullable Integer fetchHTTPStatus() {
    return this.fetchHTTPStatus(null);
  }

  /**
   * Fetch a &lt;status&gt; for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, &amp; a back&#92;slash for _escaping_ in snake_case.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: userToken, serverKey (scopes itemRead, widgetWrite).
   *
   * @param input the operation input, or {@code null} to send none
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   * @deprecated Use capabilities.
   */
  @Deprecated
  public @Nullable Integer fetchHTTPStatus(@Nullable FetchInput input) {
    return this.executor.execute(Operations.ALPHA_FETCH_HTTP_STATUS, input == null ? null : input.toJson(), null, null);
  }

  /**
   * Start a job. It finishes asynchronously.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and input; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: serverKey (scopes widgetWrite).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public StartJobPayload startJob(StartJobInput input) {
    return this.startJob(input, null);
  }

  /**
   * Start a job. It finishes asynchronously.
   *
   * <p>Idempotency: <code>idempotent</code>. Retry with the same requestId and input; resolve an unknown outcome with resolveRequest.
   *
   * <p>Authorization: serverKey (scopes widgetWrite).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public StartJobPayload startJob(StartJobInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.ALPHA_START_JOB, Wire.nonNull(input, "input").toJson(), requestId, null);
  }

  /**
   * Redeem a delivery with its permit.
   *
   * <p>Idempotency: <code>permitBound</code>. Authorized by a single-use permit. Retry with the same requestId and permit.
   *
   * <p>Authorization: permit.
   *
   * @param input the operation input
   * @param permit the <code>permit</code> credential, passed unchanged in the request context
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public Receipt redeem(RedeemInput input, String permit) {
    return this.redeem(input, permit, null);
  }

  /**
   * Redeem a delivery with its permit.
   *
   * <p>Idempotency: <code>permitBound</code>. Authorized by a single-use permit. Retry with the same requestId and permit.
   *
   * <p>Authorization: permit.
   *
   * @param input the operation input
   * @param permit the <code>permit</code> credential, passed unchanged in the request context
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public Receipt redeem(RedeemInput input, String permit, @Nullable String requestId) {
    return this.executor.execute(Operations.ALPHA_REDEEM, Wire.nonNull(input, "input").toJson(), requestId, Wire.nonNull(permit, "permit"));
  }
}
