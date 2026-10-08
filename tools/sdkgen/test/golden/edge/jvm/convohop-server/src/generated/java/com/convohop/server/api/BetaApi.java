// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.api;

import com.convohop.server.internal.OperationExecutor;
import com.convohop.server.internal.Wire;
import com.convohop.server.model.Capabilities;
import com.convohop.server.model.CreateWidgetInput;
import com.convohop.server.model.Receipt;
import com.convohop.server.model.ResolveInput;
import com.convohop.server.model.Widget;
import com.convohop.server.model.WidgetsInput;
import com.convohop.server.model.WidgetsPayload;
import org.jspecify.annotations.Nullable;

/**
 * The <code>beta</code> plane: Widgets.
 *
 * <p>Obtain an instance from a client; every call blocks until the authority answers or the request fails.
 */
public final class BetaApi {
  private final OperationExecutor executor;

  /**
   * Binds the plane to an executor. Clients create instances; applications do not call this.
   *
   * @param executor the executor that sends requests
   */
  public BetaApi(OperationExecutor executor) {
    this.executor = Wire.nonNull(executor, "executor");
  }

  /**
   * Read the server capabilities.
   *
   * <p>Server capabilities.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: serverKey.
   *
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public Capabilities capabilities() {
    return this.executor.execute(Operations.BETA_CAPABILITIES, null, null, null);
  }

  /**
   * Look up the outcome of an earlier beta mutation by requestId.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: serverKey (scopes widgetWrite).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public Receipt resolveRequest(ResolveInput input) {
    return this.executor.execute(Operations.BETA_RESOLVE_REQUEST, Wire.nonNull(input, "input").toJson(), null, null);
  }

  /**
   * List widgets in one bounded page.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: serverKey (scopes itemRead).
   *
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public WidgetsPayload widgets() {
    return this.widgets(null);
  }

  /**
   * List widgets in one bounded page.
   *
   * <p>Idempotency: <code>safe</code>. Read-only. Repeat freely.
   *
   * <p>Authorization: serverKey (scopes itemRead).
   *
   * @param input the operation input, or {@code null} to send none
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public WidgetsPayload widgets(@Nullable WidgetsInput input) {
    return this.executor.execute(Operations.BETA_WIDGETS, input == null ? null : input.toJson(), null, null);
  }

  /**
   * Create a widget.
   *
   * <p>Idempotency: <code>singleUse</code>. Like idempotent, but the result is good for one use.
   *
   * <p>Authorization: serverKey (scopes widgetWrite).
   *
   * @param input the operation input
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public Widget createWidget(CreateWidgetInput input) {
    return this.createWidget(input, null);
  }

  /**
   * Create a widget.
   *
   * <p>Idempotency: <code>singleUse</code>. Like idempotent, but the result is good for one use.
   *
   * <p>Authorization: serverKey (scopes widgetWrite).
   *
   * @param input the operation input
   * @param requestId the request ID to reuse for a retry with the same input, or {@code null} for a new one
   * @return the authority result
   * @throws com.convohop.server.ConvoHopProblem if the authority rejects the request or its outcome is unknown
   */
  public Widget createWidget(CreateWidgetInput input, @Nullable String requestId) {
    return this.executor.execute(Operations.BETA_CREATE_WIDGET, Wire.nonNull(input, "input").toJson(), requestId, null);
  }
}
