// Generated from the current unversioned GraphQL schemas. Run npm run generate:graphql.
package com.convohop.server.api;

import com.convohop.server.internal.OperationCatalog;
import com.convohop.server.internal.OperationDescriptor;
import com.convohop.server.internal.Wire;
import com.convohop.server.model.Capabilities;
import com.convohop.server.model.Job;
import com.convohop.server.model.Receipt;
import com.convohop.server.model.StartJobPayload;
import com.convohop.server.model.Widget;
import com.convohop.server.model.WidgetsPayload;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/** Descriptors of the server-layer queries and mutations, and each plane's resolve operation. */
public final class Operations {
  private Operations() {}

  /** <code>alpha.capabilities</code>: Read the server capabilities. */
  public static final OperationDescriptor<Capabilities> ALPHA_CAPABILITIES =
      OperationDescriptor.builder("alpha.capabilities", Wire.required(Capabilities::decode))
          .plane("alpha")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("capabilities")
          .operationName("AlphaCapabilities")
          .resultType("Capabilities!")
          .inputFields(List.of())
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("tenant", OperationDescriptor.Use.OPTIONAL)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "query AlphaCapabilities($context: ContextInput!) {\n"
              + "  capabilities(context: $context) {\n"
              + "    version\n"
              + "    wssUrl\n"
              + "    features\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>alpha.resolveRequest</code>: Look up the outcome of an earlier alpha mutation by requestId. */
  public static final OperationDescriptor<Receipt> ALPHA_RESOLVE_REQUEST =
      OperationDescriptor.builder("alpha.resolveRequest", Wire.required(Receipt::decode))
          .plane("alpha")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("resolveRequest")
          .operationName("AlphaResolveRequest")
          .resultType("Receipt!")
          .inputFields(List.of("requestId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("tenant", OperationDescriptor.Use.REQUIRED)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "query AlphaResolveRequest($context: ContextInput!, $input: ResolveInput!) {\n"
              + "  resolveRequest(context: $context, input: $input) {\n"
              + "    requestId\n"
              + "    committed\n"
              + "    sequence\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>alpha.job</code>: Poll a job that alpha.startJob started. */
  public static final OperationDescriptor<@Nullable Job> ALPHA_JOB =
      OperationDescriptor.builder("alpha.job", Wire.optional(Job::decode))
          .plane("alpha")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("job")
          .operationName("AlphaJob")
          .resultType("Job")
          .inputFields(List.of("operationId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("tenant", OperationDescriptor.Use.REQUIRED)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "query AlphaJob($context: ContextInput!, $input: JobInput!) {\n"
              + "  job(context: $context, input: $input) {\n"
              + "    operationId\n"
              + "    state\n"
              + "    progress\n"
              + "    output\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>alpha.fetchHTTPStatus</code>: Fetch a &lt;status&gt; for `GET` | *POST* calls, with #tags, {braces}, [links], ~tildes~, &amp; a back&#92;slash for _escaping_ in snake_case. */
  public static final OperationDescriptor<@Nullable Integer> ALPHA_FETCH_HTTP_STATUS =
      OperationDescriptor.builder("alpha.fetchHTTPStatus", Wire.optional(Wire.INT))
          .plane("alpha")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("fetchHTTPStatus")
          .operationName("AlphaFetchHTTPStatus")
          .resultType("Int")
          .inputFields(List.of("method"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("tenant", OperationDescriptor.Use.REQUIRED)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "query AlphaFetchHTTPStatus($context: ContextInput!, $input: FetchInput) {\n"
              + "  fetchHTTPStatus(context: $context, input: $input)\n"
              + "}")
          .build();

  /** <code>alpha.startJob</code>: Start a job. It finishes asynchronously. */
  public static final OperationDescriptor<StartJobPayload> ALPHA_START_JOB =
      OperationDescriptor.builder("alpha.startJob", Wire.required(StartJobPayload::decode))
          .plane("alpha")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("startJob")
          .operationName("AlphaStartJob")
          .resultType("StartJobPayload!")
          .inputFields(List.of("itemId", "repeat", "props"))
          .idempotency("idempotent", OperationDescriptor.Retry.SAME_REQUEST, true, 3, 60000L)
          .context("tenant", OperationDescriptor.Use.REQUIRED)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "mutation AlphaStartJob($context: ContextInput!, $input: StartJobInput!) {\n"
              + "  startJob(context: $context, input: $input) {\n"
              + "    requestId\n"
              + "    receipt {\n"
              + "      requestId\n"
              + "      committed\n"
              + "      sequence\n"
              + "    }\n"
              + "    job {\n"
              + "      operationId\n"
              + "      state\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>alpha.redeem</code>: Redeem a delivery with its permit. */
  public static final OperationDescriptor<Receipt> ALPHA_REDEEM =
      OperationDescriptor.builder("alpha.redeem", Wire.required(Receipt::decode))
          .plane("alpha")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("redeem")
          .operationName("AlphaRedeem")
          .resultType("Receipt!")
          .inputFields(List.of("deliveryId"))
          .idempotency("permitBound", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("tenant", OperationDescriptor.Use.REQUIRED)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.REQUIRED)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .permitField("permit")
          .document(
              "mutation AlphaRedeem($context: ContextInput!, $input: RedeemInput!) {\n"
              + "  redeem(context: $context, input: $input) {\n"
              + "    requestId\n"
              + "    committed\n"
              + "    sequence\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>beta.capabilities</code>: Read the server capabilities. */
  public static final OperationDescriptor<Capabilities> BETA_CAPABILITIES =
      OperationDescriptor.builder("beta.capabilities", Wire.required(Capabilities::decode))
          .plane("beta")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("capabilities")
          .operationName("BetaCapabilities")
          .resultType("Capabilities!")
          .inputFields(List.of())
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("tenant", OperationDescriptor.Use.OPTIONAL)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "query BetaCapabilities($context: ContextInput!) {\n"
              + "  capabilities(context: $context) {\n"
              + "    version\n"
              + "    wssUrl\n"
              + "    features\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>beta.resolveRequest</code>: Look up the outcome of an earlier beta mutation by requestId. */
  public static final OperationDescriptor<Receipt> BETA_RESOLVE_REQUEST =
      OperationDescriptor.builder("beta.resolveRequest", Wire.required(Receipt::decode))
          .plane("beta")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("resolveRequest")
          .operationName("BetaResolveRequest")
          .resultType("Receipt!")
          .inputFields(List.of("requestId"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("tenant", OperationDescriptor.Use.OPTIONAL)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "query BetaResolveRequest($context: ContextInput!, $input: ResolveInput!) {\n"
              + "  resolveRequest(context: $context, input: $input) {\n"
              + "    requestId\n"
              + "    committed\n"
              + "    sequence\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>beta.widgets</code>: List widgets in one bounded page. */
  public static final OperationDescriptor<WidgetsPayload> BETA_WIDGETS =
      OperationDescriptor.builder("beta.widgets", Wire.required(WidgetsPayload::decode))
          .plane("beta")
          .kind(OperationDescriptor.Kind.QUERY)
          .field("widgets")
          .operationName("BetaWidgets")
          .resultType("WidgetsPayload!")
          .inputFields(List.of("states"))
          .idempotency("safe", OperationDescriptor.Retry.REPEAT, false, 0, 0L)
          .context("tenant", OperationDescriptor.Use.OPTIONAL)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "query BetaWidgets($context: ContextInput!, $input: WidgetsInput) {\n"
              + "  widgets(context: $context, input: $input) {\n"
              + "    requestId\n"
              + "    result {\n"
              + "      items {\n"
              + "        id\n"
              + "        label\n"
              + "        state\n"
              + "        revision\n"
              + "      }\n"
              + "      complete\n"
              + "      refreshRequired\n"
              + "    }\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>beta.createWidget</code>: Create a widget. */
  public static final OperationDescriptor<Widget> BETA_CREATE_WIDGET =
      OperationDescriptor.builder("beta.createWidget", Wire.required(Widget::decode))
          .plane("beta")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("createWidget")
          .operationName("BetaCreateWidget")
          .resultType("Widget!")
          .inputFields(List.of("label", "state", "ratio", "nested", "shape"))
          .idempotency("singleUse", OperationDescriptor.Retry.SAME_REQUEST, true, 2, 1000L)
          .context("tenant", OperationDescriptor.Use.OPTIONAL)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "mutation BetaCreateWidget($context: ContextInput!, $input: CreateWidgetInput!) {\n"
              + "  createWidget(context: $context, input: $input) {\n"
              + "    id\n"
              + "    label\n"
              + "    state\n"
              + "    revision\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>beta.requestAccess</code>: Ask for access without a credential. */
  public static final OperationDescriptor<Receipt> BETA_REQUEST_ACCESS =
      OperationDescriptor.builder("beta.requestAccess", Wire.required(Receipt::decode))
          .plane("beta")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("requestAccess")
          .operationName("BetaRequestAccess")
          .resultType("Receipt!")
          .inputFields(List.of("email", "challenge"))
          .idempotency("replayOnly", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("tenant", OperationDescriptor.Use.OPTIONAL)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "mutation BetaRequestAccess($context: ContextInput!, $input: RequestAccessInput!) {\n"
              + "  requestAccess(context: $context, input: $input) {\n"
              + "    requestId\n"
              + "    committed\n"
              + "    sequence\n"
              + "  }\n"
              + "}")
          .build();

  /** <code>beta.claimWidget</code>: Claim a widget for an agent. */
  public static final OperationDescriptor<Widget> BETA_CLAIM_WIDGET =
      OperationDescriptor.builder("beta.claimWidget", Wire.required(Widget::decode))
          .plane("beta")
          .kind(OperationDescriptor.Kind.MUTATION)
          .field("claimWidget")
          .operationName("BetaClaimWidget")
          .resultType("Widget!")
          .inputFields(List.of("widgetId"))
          .idempotency("replayOnly", OperationDescriptor.Retry.SAME_REQUEST, false, 3, 60000L)
          .context("tenant", OperationDescriptor.Use.OPTIONAL)
          .context("requestId", OperationDescriptor.Use.REQUIRED)
          .context("attempt", OperationDescriptor.Use.OPTIONAL)
          .context("permit", OperationDescriptor.Use.FORBIDDEN)
          .context("tags", OperationDescriptor.Use.OPTIONAL)
          .document(
              "mutation BetaClaimWidget($context: ContextInput!, $input: ClaimWidgetInput!) {\n"
              + "  claimWidget(context: $context, input: $input) {\n"
              + "    id\n"
              + "    label\n"
              + "    state\n"
              + "    revision\n"
              + "  }\n"
              + "}")
          .build();

  private static final OperationCatalog CATALOG = new OperationCatalog(
      List.of(ALPHA_CAPABILITIES,
          ALPHA_RESOLVE_REQUEST,
          ALPHA_JOB,
          ALPHA_FETCH_HTTP_STATUS,
          ALPHA_START_JOB,
          ALPHA_REDEEM,
          BETA_CAPABILITIES,
          BETA_RESOLVE_REQUEST,
          BETA_WIDGETS,
          BETA_CREATE_WIDGET,
          BETA_REQUEST_ACCESS,
          BETA_CLAIM_WIDGET),
      Map.ofEntries(Map.entry("alpha", "alpha.resolveRequest"),
          Map.entry("beta", "beta.resolveRequest")),
      Map.ofEntries(Map.entry("CURSOR_EXPIRED", false),
          Map.entry("INVALID_REQUEST", false),
          Map.entry("NOT_FOUND", false),
          Map.entry("TRANSPORT_UNKNOWN", true),
          Map.entry("UNAVAILABLE", true)));

  /**
   * Every descriptor, keyed by operation id, with each plane's resolve operation and whether the schema marks each error
   * code retryable.
   *
   * @return the catalog
   */
  public static OperationCatalog catalog() {
    return CATALOG;
  }
}
