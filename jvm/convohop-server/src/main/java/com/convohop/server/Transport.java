package com.convohop.server;

import com.convohop.server.api.Operations;
import com.convohop.server.internal.Json;
import com.convohop.server.internal.OperationCatalog;
import com.convohop.server.internal.OperationDescriptor;
import com.convohop.server.internal.OperationExecutor;
import com.convohop.server.internal.Wire;
import com.convohop.server.internal.WireException;
import com.convohop.server.model.RequestResolution;
import com.convohop.server.model.ResolveRequestReply;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * Sends operations to the authority over HTTP and keeps mutation recovery records, following the TypeScript
 * reference transport: a mutation keeps its request ID, payload and incarnation, is sent at most three times within
 * one minute, and an uncertain outcome is never treated as rejection or commit.
 */
final class Transport implements OperationExecutor {
  /** The incarnation of management transports, which have no project. */
  static final String MANAGEMENT = "management";

  private static final int MAX_RECORDS = 128;
  private static final long RETRY_WINDOW_MILLIS = 60_000L;
  private static final int MAX_ATTEMPTS = 3;
  private static final Duration TIMEOUT = Duration.ofSeconds(12);
  private static final int MAX_RESPONSE_CHARS = 1_048_576;
  // Each UTF-16 code unit takes at most three UTF-8 bytes, plus a byte order mark.
  private static final long MAX_RESPONSE_BYTES = 3L * MAX_RESPONSE_CHARS + 3;
  private static final Pattern ID =
      Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
  private static final String NIL_ID = "00000000-0000-0000-0000-000000000000";
  private static final Pattern TIMESTAMP = Pattern.compile("^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z$");
  private static final Pattern DELAY = Pattern.compile("^[0-9]{1,10}$");

  private final URI endpoint;
  private final boolean plaintext;
  private final String credential;
  private final @Nullable String projectId;
  private final String incarnation;
  private final @Nullable RecoveryStorage storage;
  private final String storageKey;
  private final HttpClient http;
  private final LongSupplier clock;
  private final OperationCatalog catalog = Operations.catalog();
  private volatile @Nullable String servingEpoch;

  private final Object lock = new Object();
  private final LinkedHashMap<String, Record> states = new LinkedHashMap<>();
  private final Map<String, Active> active = new HashMap<>();

  Transport(
      String baseUrl,
      String credential,
      @Nullable String projectId,
      String incarnation,
      String namespace,
      @Nullable RecoveryStorage storage,
      @Nullable HttpClient http,
      LongSupplier clock) {
    String origin = origin(baseUrl);
    this.endpoint = URI.create(origin + "/graphql");
    this.plaintext = origin.startsWith("http:");
    this.credential = credential(credential);
    this.projectId = projectId;
    this.incarnation = incarnation;
    this.storage = storage;
    this.storageKey = "convohop.requests:" + namespace;
    if (http == null) {
      this.http = HttpClient.newBuilder()
          .followRedirects(HttpClient.Redirect.NEVER)
          .connectTimeout(TIMEOUT)
          .build();
    } else if (http.followRedirects() != HttpClient.Redirect.NEVER) {
      throw new IllegalArgumentException("The HTTP client must not follow redirects");
    } else {
      this.http = http;
    }
    this.clock = clock;
    synchronized (this.lock) {
      restore(storage == null ? null : storage.getItem(this.storageKey));
    }
  }

  /**
   * Checks an authority origin.
   *
   * @param value the base URL
   * @return the origin, without a trailing slash
   * @throws IllegalArgumentException unless the value is an HTTPS origin or a loopback HTTP origin
   */
  static String origin(String value) {
    URI uri;
    try {
      uri = new URI(Objects.requireNonNull(value, "baseUrl"));
    } catch (URISyntaxException error) {
      throw invalidOrigin();
    }
    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
    String host = uri.getHost();
    String path = uri.getRawPath();
    if (host == null || uri.getRawUserInfo() != null || !isEmpty(uri.getRawQuery()) || !isEmpty(uri.getRawFragment())
        || !(isEmpty(path) || "/".equals(path))) {
      throw invalidOrigin();
    }
    host = host.toLowerCase(Locale.ROOT);
    boolean loopback = host.equals("127.0.0.1") || host.equals("localhost") || host.equals("[::1]");
    if (!scheme.equals("https") && !(scheme.equals("http") && loopback)) {
      throw invalidOrigin();
    }
    int port = uri.getPort();
    boolean defaultPort = port == -1 || (scheme.equals("https") && port == 443) || (scheme.equals("http") && port == 80);
    return scheme + "://" + host + (defaultPort ? "" : ":" + port);
  }

  /**
   * Checks a canonical nonzero UUID.
   *
   * @param value the value
   * @return whether it is one
   */
  static boolean isId(@Nullable Object value) {
    return value instanceof String && ID.matcher((String) value).matches() && !NIL_ID.equals(value);
  }

  /**
   * Checks a canonical nonzero UUID argument.
   *
   * @param value the value
   * @param name the parameter name
   * @return the value
   * @throws IllegalArgumentException if it is not one
   */
  static String id(@Nullable String value, String name) {
    if (!isId(value)) {
      throw new IllegalArgumentException(name + " must be a canonical nonzero UUID");
    }
    return Objects.requireNonNull(value);
  }

  String incarnation() {
    return this.incarnation;
  }

  @Nullable String projectId() {
    return this.projectId;
  }

  void servingEpoch(String servingEpoch) {
    this.servingEpoch = servingEpoch;
  }

  List<RecoveryState> recoveryStates() {
    synchronized (this.lock) {
      List<RecoveryState> snapshot = new ArrayList<>();
      for (Record state : this.states.values()) {
        snapshot.add(state.snapshot());
      }
      return Collections.unmodifiableList(snapshot);
    }
  }

  @Override
  public <T extends @Nullable Object> T execute(
      OperationDescriptor<T> operation,
      @Nullable Map<String, @Nullable Object> input,
      @Nullable String requestId,
      @Nullable Object permit) {
    Objects.requireNonNull(operation, "operation");
    String id = requestId == null ? UUID.randomUUID().toString() : requestId;
    // Copies are canonical JSON: unsafe numbers fail here, before any record or request exists.
    Map<String, @Nullable Object> body =
        input == null ? new LinkedHashMap<>() : Wire.object(Json.parse(Json.canonical(input)), "input");
    @Nullable Map<String, @Nullable Object> delivery =
        permit == null ? null : Wire.object(Json.parse(Json.canonical(permit)), "CredentialDeliveryPermit");
    plan(operation, body, id, delivery);
    Reply reply = operation.isMutation() ? mutate(operation, body, id, delivery, false) : request(operation, body, id, delivery);
    OperationDescriptor<?> resolve = this.catalog.resolveOperation(operation.plane());
    if (resolve != null && resolve.id().equals(operation.id())) {
      observeResolution(id, body.get("requestId"), reply.raw);
    }
    @SuppressWarnings("unchecked")
    T payload = (T) reply.payload;
    return payload;
  }

  @Override
  public RuntimeException invalidResponse(String requestId, String message) {
    return new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", 503, message);
  }

  private void observeResolution(String requestId, @Nullable Object original, Map<String, @Nullable Object> reply) {
    Object result = reply.get("result");
    if (!(result instanceof Map)) {
      throw missingResult(requestId);
    }
    Map<String, @Nullable Object> resolution = Wire.object(result, "RequestResolution");
    Object receipt = resolution.get("receipt");
    if (!Objects.equals(resolution.get("requestId"), original)
        || (receipt != null && !Objects.equals(Wire.object(receipt, "ResolvedReceipt").get("requestId"), original))) {
      throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", 503, "Request resolution identity changed");
    }
    synchronized (this.lock) {
      Record state = original instanceof String ? this.states.get(original) : null;
      if (state == null) {
        return;
      }
      if (!Objects.equals(state.projectId, this.projectId) || !state.incarnation.equals(this.incarnation)) {
        throw new ConvoHopProblem(
            "RESOLUTION_REQUIRED", requestId, "unknown", 409, "Resolve within the original project and incarnation");
      }
      RecoveryState.Resolution observed = RecoveryState.Resolution.fromWire(resolution.get("state"));
      if (observed == RecoveryState.Resolution.COMMITTED || observed == RecoveryState.Resolution.ACCEPTED) {
        if (state.resolution != RecoveryState.Resolution.COMMITTED) {
          state.resolution = observed;
        }
        state.classification = "authorityReceipt";
        persist(state);
      }
    }
  }

  /**
   * Resolves a recorded mutation and resends it with its original request ID and payload when the authority has not
   * observed it and the retry budget allows.
   *
   * @param requestId the original request ID
   * @return the current resolution
   */
  RequestResolution retry(String requestId) {
    id(requestId, "requestId");
    Record state;
    synchronized (this.lock) {
      state = this.states.get(requestId);
    }
    if (state == null) {
      throw new IllegalStateException("No recovery record exists; do not invent a replacement identity");
    }
    if (!state.incarnation.equals(this.incarnation)) {
      throw incarnationMismatch(requestId);
    }
    OperationDescriptor<?> operation = Objects.requireNonNull(this.catalog.find(state.operation));
    if (operation.permitField() != null) {
      throw new ConvoHopProblem("CREDENTIAL_REQUIRED", requestId, "unknown", 409,
          "Delivery permits cannot authorize request lookup; obtain a current permit and submit the same delivery "
              + "identity explicitly");
    }
    if (!operation.resolvable()) {
      throw new ConvoHopProblem("INVALID_REQUEST", requestId, "unknown", 400,
          "The operation's requests cannot be looked up; send the same request ID and payload again explicitly");
    }
    RequestResolution resolution = resolve(operation.plane(), requestId);
    if (resolution.getState().equals("committed") || resolution.getState().equals("accepted")) {
      return resolution;
    }
    if (!resolution.getState().equals("notObservedYet")) {
      throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", 503, "Unknown request resolution state");
    }
    synchronized (this.lock) {
      if (state.resolution == RecoveryState.Resolution.COMMITTED
          || state.resolution == RecoveryState.Resolution.ACCEPTED
          || state.media) {
        throw new ConvoHopProblem("RESOLUTION_REQUIRED", requestId, "unknown", 409,
            "Previously observed commit or native admission cannot be retried from absent evidence");
      }
    }
    if (!fingerprint(state.operation, state.projectId, state.input).equals(state.payloadFingerprint)) {
      throw new IllegalStateException("Recovery input fingerprint changed");
    }
    mutate(operation, state.input, requestId, null, true);
    return resolve(operation.plane(), requestId);
  }

  RequestResolution resolve(String plane, String requestId) {
    OperationDescriptor<ResolveRequestReply> operation =
        MANAGEMENT.equals(plane) ? Operations.MANAGEMENT_RESOLVE_REQUEST : Operations.COMMUNICATION_RESOLVE_REQUEST;
    Map<String, @Nullable Object> input = new LinkedHashMap<>();
    input.put("requestId", requestId);
    RequestResolution resolution = execute(operation, input, UUID.randomUUID().toString(), null).getResult();
    if (resolution == null) {
      throw missingResult(requestId);
    }
    return resolution;
  }

  private Reply mutate(
      OperationDescriptor<?> operation,
      Map<String, @Nullable Object> input,
      String requestId,
      @Nullable Map<String, @Nullable Object> permit,
      boolean retry) {
    Map<String, @Nullable Object> scope = new LinkedHashMap<>();
    scope.put("operation", operation.id());
    scope.put("projectId", this.projectId);
    scope.put("input", input);
    scope.put("incarnation", this.incarnation);
    String identity = Json.canonical(scope);
    Active own = new Active(identity, new CompletableFuture<>());
    Active joined;
    synchronized (this.lock) {
      joined = this.active.get(requestId);
      if (joined == null) {
        this.active.put(requestId, own);
      } else if (!joined.identity.equals(identity)) {
        throw conflict(requestId);
      }
    }
    if (joined != null) {
      return join(joined.work);
    }
    try {
      Reply reply = submitNew(operation, input, requestId, permit, retry);
      own.work.complete(reply);
      return reply;
    } catch (RuntimeException | Error error) {
      own.work.completeExceptionally(error);
      throw error;
    } finally {
      synchronized (this.lock) {
        this.active.remove(requestId, own);
      }
    }
  }

  private static Reply join(CompletableFuture<Reply> work) {
    try {
      return work.join();
    } catch (CompletionException error) {
      Throwable cause = error.getCause();
      if (cause instanceof RuntimeException) {
        throw (RuntimeException) cause;
      }
      if (cause instanceof Error) {
        throw (Error) cause;
      }
      throw error;
    }
  }

  private Reply submitNew(
      OperationDescriptor<?> operation,
      Map<String, @Nullable Object> input,
      String requestId,
      @Nullable Map<String, @Nullable Object> permit,
      boolean retry) {
    String hash = fingerprint(operation.id(), this.projectId, input);
    Record state;
    synchronized (this.lock) {
      state = this.states.get(requestId);
      if (state != null
          && (!state.payloadFingerprint.equals(hash)
              || !state.incarnation.equals(this.incarnation)
              || !state.operation.equals(operation.id())
              || !Objects.equals(state.projectId, this.projectId)
              || !Json.canonical(state.input).equals(Json.canonical(input)))) {
        throw conflict(requestId);
      }
      if (retry
          && (state == null
              || state.resolution == RecoveryState.Resolution.COMMITTED
              || state.resolution == RecoveryState.Resolution.ACCEPTED
              || state.media)) {
        throw notEligible(requestId);
      }
      if (state == null) {
        if (this.states.size() >= MAX_RECORDS) {
          evictFinalRecord(requestId);
        }
        long now = this.clock.getAsLong();
        state = new Record(requestId, this.incarnation, hash, operation.id(), this.projectId, Wire.immutable(input),
            now, now + RETRY_WINDOW_MILLIS, 0, now, "notSubmitted", RecoveryState.Resolution.PENDING, false);
        this.states.put(requestId, state);
        persist(state);
      }
    }
    return submit(operation, state, permit, retry);
  }

  /**
   * Called under the lock. A full record set forgets the final record attempted longest ago that no mutation is using,
   * or refuses the new request before it is sent.
   */
  private void evictFinalRecord(String requestId) {
    long now = this.clock.getAsLong();
    @Nullable Record oldest = null;
    for (Record record : this.states.values()) {
      if (this.active.containsKey(record.requestId) || !isFinal(record, now)) {
        continue;
      }
      if (oldest == null || record.lastAttemptAt < oldest.lastAttemptAt) {
        oldest = record;
      }
    }
    if (oldest == null) {
      throw new ConvoHopProblem("RECOVERY_LIMIT", requestId, "rejected", 409,
          "Recovery storage already holds " + MAX_RECORDS + " requests that aren't final; retry or resolve them first");
    }
    this.states.remove(oldest.requestId);
  }

  /**
   * Whether nothing more can come of a record's request: the authority committed or accepted it, or rejected every
   * attempt and won't take another, because the last rejection's code isn't retryable or the retry budget is spent.
   */
  private boolean isFinal(Record record, long now) {
    if (record.resolution != RecoveryState.Resolution.REJECTED) {
      return record.resolution == RecoveryState.Resolution.COMMITTED
          || record.resolution == RecoveryState.Resolution.ACCEPTED;
    }
    return !isRetryable(record.classification) || record.attemptCount >= MAX_ATTEMPTS || now > record.retryDeadline;
  }

  /**
   * Whether a resend may succeed after an error code: yes, unless the schema marks the code not retryable.
   * {@code WRONG_REGION} may succeed once routed again, and a code newer than the schema may too.
   */
  private boolean isRetryable(String code) {
    return code.equals("WRONG_REGION") || !Boolean.FALSE.equals(this.catalog.retryable(code));
  }

  /** States in which no attempt may have been applied: never sent, or every attempt rejected. */
  private static boolean isResendable(RecoveryState.Resolution resolution) {
    return resolution == RecoveryState.Resolution.PENDING || resolution == RecoveryState.Resolution.REJECTED;
  }

  private Reply submit(
      OperationDescriptor<?> operation, Record state, @Nullable Map<String, @Nullable Object> permit, boolean retry) {
    RecoveryState.Resolution prior;
    synchronized (this.lock) {
      if (!state.incarnation.equals(this.incarnation)) {
        throw incarnationMismatch(state.requestId);
      }
      long now = this.clock.getAsLong();
      if (state.attemptCount >= MAX_ATTEMPTS || now > state.retryDeadline || now < state.firstSubmittedAt
          || now < state.lastAttemptAt) {
        throw new ConvoHopProblem("RESOLUTION_REQUIRED", state.requestId, "unknown", 409,
            "Retry budget expired or clock changed; resolve this request read-only");
      }
      state.attemptCount += 1;
      state.lastAttemptAt = now;
      prior = state.resolution;
      if (isResendable(prior)) {
        state.resolution = RecoveryState.Resolution.UNKNOWN;
      }
      state.classification = "submitted";
      persist(state);
      long submittingAt = this.clock.getAsLong();
      if (submittingAt > state.retryDeadline || submittingAt < state.firstSubmittedAt || submittingAt < state.lastAttemptAt
          || (retry
              && (state.resolution == RecoveryState.Resolution.COMMITTED
                  || state.resolution == RecoveryState.Resolution.ACCEPTED
                  || state.media))) {
        throw notEligible(state.requestId);
      }
    }
    Reply reply;
    RecoveryState.Resolution outcome;
    try {
      reply = request(operation, state.input, state.requestId, permit);
      outcome = RecoveryState.Resolution.fromWire(reply.raw.get("status"));
      if (outcome != RecoveryState.Resolution.COMMITTED && outcome != RecoveryState.Resolution.ACCEPTED) {
        throw new IllegalStateException("A mutation requires authority receipt evidence");
      }
    } catch (RuntimeException error) {
      synchronized (this.lock) {
        state.classification = error instanceof ConvoHopProblem
            ? ((ConvoHopProblem) error).getCode()
            : "opaqueTransportFailure";
        // A rejection is the request's outcome only if every attempt was rejected; one that may have been applied
        // keeps it unknown.
        if (error instanceof ConvoHopProblem
            && ((ConvoHopProblem) error).getOutcome().equals("rejected")
            && isResendable(prior)
            && state.resolution == RecoveryState.Resolution.UNKNOWN) {
          state.resolution = RecoveryState.Resolution.REJECTED;
        }
        try {
          persist(state);
        } catch (ConvoHopProblem storageFailure) {
          storageFailure.addSuppressed(error);
          throw storageFailure;
        }
      }
      throw error;
    }
    synchronized (this.lock) {
      if (state.resolution != RecoveryState.Resolution.COMMITTED) {
        state.resolution = outcome;
      }
      state.classification = "authorityReceipt";
      persist(state);
    }
    return reply;
  }

  private Map<String, @Nullable Object> plan(
      OperationDescriptor<?> operation,
      Map<String, @Nullable Object> input,
      String requestId,
      @Nullable Map<String, @Nullable Object> permit) {
    try {
      Map<String, @Nullable Object> context = new LinkedHashMap<>();
      if (!isId(requestId)) {
        throw new IllegalArgumentException("Expected a canonical nonzero UUID");
      }
      context.put("requestId", requestId);
      if (this.projectId != null) {
        if (!isId(this.projectId)) {
          throw new IllegalArgumentException("Expected a canonical nonzero UUID");
        }
        context.put("projectId", this.projectId);
      }
      if (operation.plane().equals("communication")) {
        if (this.projectId == null) {
          throw new IllegalArgumentException("Communication operations require an explicit project");
        }
      } else if (this.projectId != null) {
        throw new IllegalArgumentException("Management project selection belongs in the generated operation input");
      }
      for (String name : input.keySet()) {
        if (!operation.inputFields().contains(name)) {
          throw new IllegalArgumentException("Unknown GraphQL input field");
        }
      }
      if (permit != null) {
        String field = operation.permitField();
        if (field == null) {
          throw new IllegalArgumentException(
              "A credential delivery permit is only valid for redemption or acknowledgement");
        }
        context.put(field, permit);
      }
      if (!MANAGEMENT.equals(this.incarnation)) {
        context.put("incarnation", this.incarnation);
      }
      String epoch = this.servingEpoch;
      if (epoch != null) {
        context.put("observedServingEpoch", epoch);
      }
      Map<String, @Nullable Object> variables = new LinkedHashMap<>();
      variables.put("context", context);
      if (!operation.inputFields().isEmpty()) {
        variables.put("input", input);
      }
      Map<String, @Nullable Object> body = new LinkedHashMap<>();
      body.put("query", operation.document());
      body.put("operationName", operation.operationName());
      body.put("variables", variables);
      return body;
    } catch (IllegalArgumentException error) {
      String message = error.getMessage();
      throw new ConvoHopProblem("INVALID_REQUEST", requestId, "rejected", 400,
          message == null ? "Invalid SDK operation" : message);
    }
  }

  private Reply request(
      OperationDescriptor<?> operation,
      Map<String, @Nullable Object> input,
      String requestId,
      @Nullable Map<String, @Nullable Object> permit) {
    String body = Json.canonical(plan(operation, input, requestId, permit));
    HttpRequest.Builder builder = HttpRequest.newBuilder(this.endpoint)
        .timeout(TIMEOUT)
        .header("accept", "application/json")
        .header("content-type", "application/json")
        .header("authorization", "Bearer " + this.credential)
        .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
    if (this.plaintext) {
      // Loopback HTTP is for local development; avoid an h2c upgrade.
      builder.version(HttpClient.Version.HTTP_1_1);
    }
    Capture capture = new Capture();
    CompletableFuture<HttpResponse<byte[]>> future;
    try {
      future = this.http.sendAsync(builder.build(), capture);
    } catch (RuntimeException error) {
      throw lost(null, requestId);
    }
    HttpResponse<byte[]> response;
    try {
      response = future.get(TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
    } catch (InterruptedException error) {
      future.cancel(true);
      Thread.currentThread().interrupt();
      throw lost(capture.info(), requestId);
    } catch (TimeoutException error) {
      future.cancel(true);
      throw lost(capture.info(), requestId);
    } catch (ExecutionException error) {
      HttpResponse.@Nullable ResponseInfo info = capture.info();
      if (info != null && !isRedirect(info.statusCode()) && causedByTooLarge(error)) {
        throw new ConvoHopProblem(
            "INVALID_RESPONSE", requestId, "unknown", info.statusCode(), "Authority response exceeds the bound");
      }
      throw lost(info, requestId);
    }
    int status = response.statusCode();
    if (isRedirect(status)) {
      throw lost(null, requestId);
    }
    String text = new String(response.body(), StandardCharsets.UTF_8);
    if (!text.isEmpty() && text.charAt(0) == '\uFEFF') {
      text = text.substring(1);
    }
    if (text.length() > MAX_RESPONSE_CHARS) {
      throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", status, "Authority response exceeds the bound");
    }
    Object decoded;
    try {
      decoded = Json.parse(text);
    } catch (IllegalArgumentException error) {
      throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", status, "Unrecognized authority response");
    }
    @Nullable Duration headerDelay = retryDelay(String.join(", ", response.headers().allValues("retry-after")));
    try {
      Map<String, @Nullable Object> graphql = Wire.object(decoded, "response");
      Object errors = graphql.get("errors");
      if (errors instanceof List && !((List<?>) errors).isEmpty()) {
        Map<String, @Nullable Object> error = Wire.object(((List<?>) errors).get(0), "error");
        Object extensionsValue = error.get("extensions");
        Map<String, @Nullable Object> extensions =
            extensionsValue == null ? Collections.emptyMap() : Wire.object(extensionsValue, "error extensions");
        @Nullable Duration delay = retryDelay(extensions.get("retryAfter"));
        throw ConvoHopProblem.authority(
            text(extensions.get("code"), "GRAPHQL_ERROR"),
            requestId,
            text(extensions.get("outcome"), "unknown"),
            errorStatus(extensions.get("status")),
            text(error.get("message"), "GraphQL rejected the request"),
            delay == null ? headerDelay : delay);
      }
      if (status < 200 || status > 299) {
        @Nullable Duration delay = retryDelay(graphql.get("retryAfter"));
        throw ConvoHopProblem.authority(
            text(graphql.get("code"), "HTTP_FAILURE"),
            requestId,
            text(graphql.get("outcome"), "unknown"),
            status,
            text(graphql.get("message"), "Authority rejected the request"),
            delay == null ? headerDelay : delay);
      }
      Map<String, @Nullable Object> value =
          Wire.object(Wire.object(graphql.get("data"), "data").get(operation.field()), operation.resultType());
      Object payload = operation.decoder().decode(value, 0);
      Object envelope = value.get("status");
      if (!"ok".equals(envelope) && !"committed".equals(envelope) && !"accepted".equals(envelope)) {
        throw new WireException("Unrecognized authority envelope");
      }
      if (!isId(value.get("requestId"))) {
        throw new WireException("Expected a canonical nonzero UUID");
      }
      if (!requestId.equals(value.get("requestId"))) {
        throw new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", status, "Mismatched authority request identity");
      }
      if (operation.isMutation()) {
        if ("committed".equals(envelope)) {
          if (!isId(value.get("receiptId")) || !isTimestamp(value.get("committedAt"))
              || !(value.get("replayed") instanceof Boolean)) {
            throw new WireException("Invalid authority receipt");
          }
        } else if (!"accepted".equals(envelope)
            || !isId(Wire.object(value.get("operation"), "OperationRef").get("operationId"))) {
          throw new WireException("A mutation requires authority receipt evidence");
        }
      }
      return new Reply(value, payload);
    } catch (WireException | ClassCastException error) {
      throw new ConvoHopProblem(
          "INVALID_RESPONSE", requestId, "unknown", status, "Malformed authority response; resolve the original request");
    }
  }

  private void persist(Record state) {
    RecoveryStorage target = this.storage;
    if (target == null) {
      return;
    }
    List<@Nullable Object> records = new ArrayList<>();
    for (Record record : this.states.values()) {
      records.add(record.toJson());
    }
    String snapshot = Json.stringify(records);
    try {
      target.setItem(this.storageKey, snapshot);
    } catch (RuntimeException error) {
      throw new ConvoHopProblem("RECOVERY_STORAGE_FAILURE", state.requestId,
          state.resolution == RecoveryState.Resolution.PENDING ? "unknown" : state.resolution.wireValue(), 0,
          "Recovery storage did not confirm durability; retain the original request and its outcome", null, error);
    }
  }

  private void restore(@Nullable String saved) {
    if (saved == null || saved.isEmpty()) {
      return;
    }
    Object values;
    try {
      values = Json.parse(saved);
    } catch (IllegalArgumentException error) {
      throw new IllegalArgumentException("Invalid mutation recovery storage");
    }
    if (!(values instanceof List) || ((List<?>) values).size() > MAX_RECORDS) {
      throw new IllegalArgumentException("Invalid mutation recovery storage");
    }
    LinkedHashMap<String, Record> restored = new LinkedHashMap<>();
    for (Object item : (List<?>) values) {
      Record state = restoreRecord(item);
      if (restored.containsKey(state.requestId)) {
        throw new IllegalArgumentException("Duplicate mutation recovery identity");
      }
      restored.put(state.requestId, state);
    }
    this.states.putAll(restored);
  }

  private Record restoreRecord(@Nullable Object item) {
    if (!(item instanceof Map)) {
      throw new IllegalArgumentException("Invalid recovery record");
    }
    Map<String, @Nullable Object> value = Wire.object(item, "RecoveryState");
    Object operationId = value.get("operation");
    OperationDescriptor<?> operation = operationId instanceof String ? this.catalog.find((String) operationId) : null;
    RecoveryState.Resolution resolution = RecoveryState.Resolution.fromWire(value.get("resolutionState"));
    if (operation == null || !operation.isMutation() || resolution == null) {
      throw new IllegalArgumentException("Invalid recovery record");
    }
    String project = null;
    if (value.containsKey("projectId")) {
      Object candidate = value.get("projectId");
      if (!isId(candidate)) {
        throw new IllegalArgumentException("Invalid recovery record");
      }
      project = (String) candidate;
    }
    if (operation.plane().equals("communication") != (project != null)) {
      throw new IllegalArgumentException("Invalid recovery project scope");
    }
    long[] clocks = new long[4];
    String[] names = {"firstSubmittedAt", "retryDeadline", "attemptCount", "lastAttemptAt"};
    for (int index = 0; index < names.length; index++) {
      Object clockValue = value.get(names[index]);
      long number;
      try {
        if (!(clockValue instanceof Number)) {
          throw new WireException("Expected a number");
        }
        number = Wire.safeInteger(clockValue);
      } catch (WireException error) {
        throw new IllegalArgumentException("Invalid recovery clock or count");
      }
      if (number < 0) {
        throw new IllegalArgumentException("Invalid recovery clock or count");
      }
      clocks[index] = number;
    }
    if (value.containsKey("mediaAdmissionAttempted") && !Boolean.TRUE.equals(value.get("mediaAdmissionAttempted"))) {
      throw new IllegalArgumentException("Invalid native admission marker");
    }
    Object requestId = value.get("requestId");
    Object incarnation = value.get("incarnation");
    Object fingerprint = value.get("payloadFingerprint");
    Object input = value.get("input");
    Object classification = value.get("lastAttemptClassification");
    if (!isId(requestId) || !(incarnation instanceof String) || !(fingerprint instanceof String)
        || !(input instanceof Map) || !(classification instanceof String)) {
      throw new IllegalArgumentException("Invalid recovery record");
    }
    return new Record((String) requestId, (String) incarnation, (String) fingerprint, operation.id(), project,
        Wire.immutable(Wire.object(input, "input")), clocks[0], clocks[1], clocks[2], clocks[3], (String) classification,
        resolution, Boolean.TRUE.equals(value.get("mediaAdmissionAttempted")));
  }

  private static String fingerprint(String operation, @Nullable String projectId, Map<String, @Nullable Object> input) {
    Map<String, @Nullable Object> value = new LinkedHashMap<>();
    value.put("operation", operation);
    value.put("projectId", projectId);
    value.put("input", input);
    byte[] digest;
    try {
      digest = MessageDigest.getInstance("SHA-256").digest(Json.utf8(Json.canonical(value)));
    } catch (NoSuchAlgorithmException error) {
      throw new IllegalStateException("SHA-256 is unavailable", error);
    }
    StringBuilder out = new StringBuilder("sha256:");
    for (byte item : digest) {
      out.append(Character.forDigit((item >> 4) & 15, 16)).append(Character.forDigit(item & 15, 16));
    }
    return out.toString();
  }

  /** Whole-second retry delay from {@code extensions.retryAfter} or an HTTP {@code Retry-After} delta. */
  private static @Nullable Duration retryDelay(@Nullable Object value) {
    Object delay = value;
    if (delay instanceof String && DELAY.matcher((String) delay).matches()) {
      delay = Long.parseLong((String) delay);
    }
    if (!(delay instanceof Number)) {
      return null;
    }
    try {
      long seconds = Wire.safeInteger(delay);
      return seconds >= 0 ? Duration.ofSeconds(seconds) : null;
    } catch (WireException error) {
      return null;
    }
  }

  private static int errorStatus(@Nullable Object value) {
    if (value instanceof Number) {
      double number = ((Number) value).doubleValue();
      if (number == Math.rint(number) && number >= Integer.MIN_VALUE && number <= Integer.MAX_VALUE) {
        return (int) number;
      }
    }
    return 503;
  }

  private static String text(@Nullable Object value, String fallback) {
    return value instanceof String ? (String) value : fallback;
  }

  private static boolean isTimestamp(@Nullable Object value) {
    if (!(value instanceof String) || !TIMESTAMP.matcher((String) value).matches()) {
      return false;
    }
    try {
      Instant.parse((String) value);
      return true;
    } catch (DateTimeParseException error) {
      return false;
    }
  }

  private static boolean isRedirect(int status) {
    return status == 301 || status == 302 || status == 303 || status == 307 || status == 308;
  }

  private static boolean causedByTooLarge(Throwable error) {
    for (Throwable cause = error; cause != null; cause = cause.getCause()) {
      if (cause instanceof TooLarge) {
        return true;
      }
    }
    return false;
  }

  private static boolean isEmpty(@Nullable String value) {
    return value == null || value.isEmpty();
  }

  private static String credential(String value) {
    Objects.requireNonNull(value, "credential");
    if (value.isEmpty()) {
      throw new IllegalArgumentException("The credential must not be empty");
    }
    for (int index = 0; index < value.length(); index++) {
      char c = value.charAt(index);
      if (c < 0x21 || c > 0x7e) {
        throw new IllegalArgumentException("The credential must be printable ASCII without spaces");
      }
    }
    return value;
  }

  private static IllegalArgumentException invalidOrigin() {
    return new IllegalArgumentException("Use an HTTPS origin, or explicit loopback HTTP for local development");
  }

  private static ConvoHopProblem lost(HttpResponse.@Nullable ResponseInfo info, String requestId) {
    return new ConvoHopProblem("TRANSPORT_UNKNOWN", requestId, "unknown", 0,
        info == null || isRedirect(info.statusCode())
            ? "Authority response unavailable; resolve the original request"
            : "Incomplete authority response; resolve the original request");
  }

  private static ConvoHopProblem conflict(String requestId) {
    return new ConvoHopProblem("IDEMPOTENCY_CONFLICT", requestId, "unknown", 409, "Preserve the original request and payload");
  }

  private static ConvoHopProblem notEligible(String requestId) {
    return new ConvoHopProblem(
        "RESOLUTION_REQUIRED", requestId, "unknown", 409, "The original request is no longer eligible for resend");
  }

  private static ConvoHopProblem incarnationMismatch(String requestId) {
    return new ConvoHopProblem(
        "INCARNATION_MISMATCH", requestId, "unknown", 409, "Explicit recovery is required for this incarnation");
  }

  static ConvoHopProblem missingResult(String requestId) {
    return new ConvoHopProblem("INVALID_RESPONSE", requestId, "unknown", 503, "Missing current authority result");
  }

  /** A decoded authority reply: the raw payload object and its typed form. */
  private static final class Reply {
    final Map<String, @Nullable Object> raw;
    final @Nullable Object payload;

    Reply(Map<String, @Nullable Object> raw, @Nullable Object payload) {
      this.raw = raw;
      this.payload = payload;
    }
  }

  /** A mutation in flight; concurrent calls with the same request ID and identity share its outcome. */
  private static final class Active {
    final String identity;
    final CompletableFuture<Reply> work;

    Active(String identity, CompletableFuture<Reply> work) {
      this.identity = identity;
      this.work = work;
    }
  }

  /** A mutable recovery record, guarded by the transport lock. */
  private static final class Record {
    final String requestId;
    final String incarnation;
    final String payloadFingerprint;
    final String operation;
    final @Nullable String projectId;
    final Map<String, @Nullable Object> input;
    final long firstSubmittedAt;
    final long retryDeadline;
    long attemptCount;
    long lastAttemptAt;
    String classification;
    RecoveryState.Resolution resolution;
    final boolean media;

    Record(
        String requestId,
        String incarnation,
        String payloadFingerprint,
        String operation,
        @Nullable String projectId,
        Map<String, @Nullable Object> input,
        long firstSubmittedAt,
        long retryDeadline,
        long attemptCount,
        long lastAttemptAt,
        String classification,
        RecoveryState.Resolution resolution,
        boolean media) {
      this.requestId = requestId;
      this.incarnation = incarnation;
      this.payloadFingerprint = payloadFingerprint;
      this.operation = operation;
      this.projectId = projectId;
      this.input = input;
      this.firstSubmittedAt = firstSubmittedAt;
      this.retryDeadline = retryDeadline;
      this.attemptCount = attemptCount;
      this.lastAttemptAt = lastAttemptAt;
      this.classification = classification;
      this.resolution = resolution;
      this.media = media;
    }

    Map<String, @Nullable Object> toJson() {
      Map<String, @Nullable Object> json = new LinkedHashMap<>();
      json.put("requestId", this.requestId);
      json.put("incarnation", this.incarnation);
      json.put("payloadFingerprint", this.payloadFingerprint);
      json.put("operation", this.operation);
      if (this.projectId != null) {
        json.put("projectId", this.projectId);
      }
      json.put("input", this.input);
      json.put("firstSubmittedAt", this.firstSubmittedAt);
      json.put("retryDeadline", this.retryDeadline);
      json.put("attemptCount", this.attemptCount);
      json.put("lastAttemptAt", this.lastAttemptAt);
      json.put("lastAttemptClassification", this.classification);
      json.put("resolutionState", this.resolution.wireValue());
      if (this.media) {
        json.put("mediaAdmissionAttempted", true);
      }
      return json;
    }

    RecoveryState snapshot() {
      return new RecoveryState(this.requestId, this.incarnation, this.payloadFingerprint, this.operation,
          this.projectId, this.input, this.firstSubmittedAt, this.retryDeadline,
          (int) Math.min(this.attemptCount, Integer.MAX_VALUE), this.lastAttemptAt, this.classification,
          this.resolution, this.media);
    }
  }

  /** Records the response head and bounds the body. */
  private static final class Capture implements HttpResponse.BodyHandler<byte[]> {
    private final AtomicReference<HttpResponse.@Nullable ResponseInfo> info = new AtomicReference<>();

    @Override
    public HttpResponse.BodySubscriber<byte[]> apply(HttpResponse.ResponseInfo response) {
      this.info.set(response);
      return new Bounded(isRedirect(response.statusCode()) ? 0 : MAX_RESPONSE_BYTES);
    }

    HttpResponse.@Nullable ResponseInfo info() {
      return this.info.get();
    }
  }

  /** Collects a body up to a byte limit and cancels the exchange beyond it. */
  private static final class Bounded implements HttpResponse.BodySubscriber<byte[]> {
    private final long limit;
    private final CompletableFuture<byte[]> body = new CompletableFuture<>();
    private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    private Flow.@Nullable Subscription subscription;

    Bounded(long limit) {
      this.limit = limit;
    }

    @Override
    public CompletionStage<byte[]> getBody() {
      return this.body;
    }

    @Override
    public void onSubscribe(Flow.Subscription subscription) {
      if (this.subscription != null) {
        subscription.cancel();
        return;
      }
      this.subscription = subscription;
      subscription.request(Long.MAX_VALUE);
    }

    @Override
    public void onNext(List<ByteBuffer> items) {
      if (this.body.isDone()) {
        return;
      }
      for (ByteBuffer item : items) {
        int size = item.remaining();
        if (this.buffer.size() + (long) size > this.limit) {
          Flow.Subscription current = this.subscription;
          if (current != null) {
            current.cancel();
          }
          this.body.completeExceptionally(new TooLarge());
          return;
        }
        byte[] chunk = new byte[size];
        item.get(chunk);
        this.buffer.write(chunk, 0, size);
      }
    }

    @Override
    public void onError(Throwable error) {
      this.body.completeExceptionally(error);
    }

    @Override
    public void onComplete() {
      this.body.complete(this.buffer.toByteArray());
    }
  }

  /** A response body beyond the bound. */
  private static final class TooLarge extends Exception {
    private static final long serialVersionUID = 1L;

    TooLarge() {
      super("Authority response exceeds the bound", null, false, false);
    }
  }
}
