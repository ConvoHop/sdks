package com.convohop.conformance;

import static com.convohop.conformance.Params.entries;
import static com.convohop.conformance.Params.integer;
import static com.convohop.conformance.Params.optionalText;
import static com.convohop.conformance.Params.record;
import static com.convohop.conformance.Params.strings;
import static com.convohop.conformance.Params.text;

import com.convohop.server.ConvoHopProblem;
import com.convohop.server.ManagementClient;
import com.convohop.server.ProjectServerClient;
import com.convohop.server.RecoveryStorage;
import com.convohop.server.ServerConversation;
import com.convohop.server.model.CreateConversationRequestInput;
import com.convohop.server.model.MemberBatchEntryInput;
import com.convohop.server.model.MemberInputInput;
import com.convohop.server.model.Message;
import com.convohop.server.webhooks.WebhookHeaders;
import com.convohop.server.webhooks.WebhookVerificationCode;
import com.convohop.server.webhooks.WebhookVerificationException;
import com.convohop.server.webhooks.WebhookVerifier;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * The only driver class that calls the SDK, like the reference driver's {@code sdk.mts}. Each operation decodes all of
 * its arguments before it calls the SDK, so a malformed argument is INVALID_PARAMS and never reaches the authority.
 */
final class Sdk {
  /** The protocol's roles. */
  static final List<String> ROLES = Collections.unmodifiableList(Arrays.asList("user", "backend", "management"));

  /** The roles this driver declares. User clients belong to the client SDKs; the runner's fixture driver serves them. */
  static final List<String> DECLARED = Collections.unmodifiableList(Arrays.asList("backend", "management"));

  /** The optional features this driver declares. Realtime is a user-client feature. */
  static final List<String> FEATURES =
      Collections.unmodifiableList(Arrays.asList("recovery.storage", "retryAfter", "webhooks.verify"));

  private static final long MAX_DATE_SECONDS = 8_640_000_000_000L;

  /** One protocol operation on an SDK client. Returns the JSON value, or null. */
  @FunctionalInterface
  interface Operation<C> {
    @Nullable Object run(C client, Map<String, @Nullable Object> args);
  }

  private static final Map<String, Operation<ProjectServerClient>> BACKEND = new LinkedHashMap<>();
  private static final Map<String, Operation<ManagementClient>> MANAGEMENT = new LinkedHashMap<>();

  static {
    BACKEND.put("route.initialize", (client, args) -> {
      client.initialize();
      return null;
    });
    BACKEND.put("principals.create", (client, args) -> {
      String externalUserId = text(args, "externalUserId");
      return Collections.singletonMap("principalId", client.principals().create(externalUserId).getPrincipalId());
    });
    BACKEND.put("sessions.issue", (client, args) -> {
      String principalId = text(args, "principalId");
      String deviceId = text(args, "deviceId");
      String requestedTtlMs = optionalText(args, "requestedTtlMs");
      return client.sessions().issue(principalId, deviceId, requestedTtlMs, null);
    });
    BACKEND.put("conversations.create", (client, args) -> {
      CreateConversationRequestInput input = conversationInput(args);
      return client.conversations().create(input, optionalText(args, "requestId"));
    });
    BACKEND.put("conversations.get", (client, args) -> conversation(client, args).get());
    BACKEND.put("members.list", (client, args) -> {
      Long limit = integer(args, "limit", 1, 100);
      String cursor = optionalText(args, "cursor");
      return conversation(client, args).members().list(limit == null ? null : limit.intValue(), cursor);
    });
    BACKEND.put("members.add", (client, args) -> {
      List<MemberBatchEntryInput> members = batch(args);
      String requestId = optionalText(args, "requestId");
      return conversation(client, args).members().addBatch(members, requestId);
    });
    BACKEND.put("messages.list", (client, args) -> {
      String actAs = optionalText(args, "actAs");
      String beforeSequence = optionalText(args, "beforeSequence");
      return conversation(client, args).messages().list(actAs, beforeSequence, null);
    });
    BACKEND.put("messages.send", (client, args) -> {
      String text = text(args, "text");
      String actAs = optionalText(args, "actAs");
      String requestId = optionalText(args, "requestId");
      return conversation(client, args).messages().send(text, null, actAs, requestId);
    });
    BACKEND.put("messages.edit", (client, args) -> {
      Message current = message(args);
      String text = text(args, "text");
      String requestId = optionalText(args, "requestId");
      return client.conversation(current.getConversationId()).messages()
          .edit(current.getMessageId(), current.getRevision(), text, null, requestId);
    });
    BACKEND.put("messages.delete", (client, args) -> {
      Message current = message(args);
      String requestId = optionalText(args, "requestId");
      return client.conversation(current.getConversationId()).messages()
          .delete(current.getMessageId(), current.getRevision(), requestId);
    });

    MANAGEMENT.put("backendKeys.issue", (client, args) -> {
      String projectId = text(args, "projectId");
      String name = text(args, "name");
      List<String> scopes = strings(args, "scopes");
      String expiresAt = text(args, "expiresAt");
      return client.issueBackendKey(projectId, name, scopes, expiresAt);
    });
  }

  private Sdk() {}

  /** The operations each declared role implements, in declaration order. */
  static List<String> operations(String role) {
    return new ArrayList<>("backend".equals(role) ? BACKEND.keySet() : MANAGEMENT.keySet());
  }

  /** An SDK client of one declared role. */
  static final class Client {
    private final String role;
    private final @Nullable ProjectServerClient backend;
    private final @Nullable ManagementClient management;

    private Client(String role, @Nullable ProjectServerClient backend, @Nullable ManagementClient management) {
      this.role = role;
      this.backend = backend;
      this.management = management;
    }

    String role() {
      return role;
    }

    /** Whether this client's role implements the operation. */
    boolean implementsOperation(String name) {
      return backend != null ? BACKEND.containsKey(name) : MANAGEMENT.containsKey(name);
    }

    /** Runs an operation this client's role implements. */
    @Nullable Object run(String name, Map<String, @Nullable Object> args) {
      if (backend != null) {
        return BACKEND.get(name).run(backend, args);
      }
      return MANAGEMENT.get(name).run(Objects.requireNonNull(management), args);
    }
  }

  /** Constructs a client without network I/O; constructor validation failures are INVALID_PARAMS. */
  static Client create(
      String role, String baseUrl, String credential, @Nullable String projectId, @Nullable String incarnation,
      @Nullable String actorId, @Nullable RecoveryStorage storage) {
    try {
      if ("backend".equals(role)) {
        return new Client(role, ProjectServerClient.builder()
            .baseUrl(baseUrl)
            .projectId(required(projectId, "projectId"))
            .incarnation(required(incarnation, "incarnation"))
            .backendKey(credential)
            .recoveryStorage(storage)
            .build(), null);
      }
      return new Client(role, null, ManagementClient.builder()
          .baseUrl(baseUrl)
          .accessToken(credential)
          .actorId(required(actorId, "actorId"))
          .recoveryStorage(storage)
          .build());
    } catch (ParamsException error) {
      throw error;
    } catch (RuntimeException error) {
      throw new ParamsException(error.getMessage() == null ? "Invalid client options" : error.getMessage());
    }
  }

  private static String required(@Nullable String value, String name) {
    if (value == null) {
      throw new ParamsException(name + " is required for this role");
    }
    return value;
  }

  private static ServerConversation conversation(ProjectServerClient client, Map<String, @Nullable Object> args) {
    return client.conversation(text(args, "conversationId"));
  }

  private static Message message(Map<String, @Nullable Object> args) {
    try {
      return Message.fromJson(args.get("message"));
    } catch (RuntimeException error) {
      throw new ParamsException("message is not a valid protocol value");
    }
  }

  private static CreateConversationRequestInput conversationInput(Map<String, @Nullable Object> args) {
    Map<String, @Nullable Object> input = record(args.get("input"), "input");
    String title = text(input, "title");
    Map<String, @Nullable Object> props = record(input.get("props"), "input.props");
    List<MemberInputInput> members = new ArrayList<>();
    for (Map<String, @Nullable Object> member : entries(input, "members")) {
      members.add(MemberInputInput.builder().principalId(text(member, "principalId")).role(text(member, "role")).build());
    }
    return CreateConversationRequestInput.builder().title(title).props(props).members(members).build();
  }

  private static List<MemberBatchEntryInput> batch(Map<String, @Nullable Object> args) {
    List<MemberBatchEntryInput> members = new ArrayList<>();
    for (Map<String, @Nullable Object> member : entries(args, "members")) {
      members.add(MemberBatchEntryInput.builder()
          .principalId(text(member, "principalId"))
          .role(text(member, "role"))
          .expectedRevision(text(member, "expectedRevision"))
          .build());
    }
    return members;
  }

  /** The language-neutral projection of an SDK failure (driver-protocol.md, sdkError). */
  static Map<String, @Nullable Object> driverError(RuntimeException error) {
    Map<String, @Nullable Object> projection = new LinkedHashMap<>();
    if (error instanceof ConvoHopProblem) {
      ConvoHopProblem problem = (ConvoHopProblem) error;
      Duration retryAfter = problem.getRetryAfter();
      projection.put("code", problem.getCode());
      // The SDK reports "no response" as status 0; the protocol uses null for "no authority HTTP status".
      projection.put("status", problem.getStatus() == 0 ? null : (long) problem.getStatus());
      projection.put("outcome", problem.getOutcome());
      projection.put("requestId", problem.getRequestId());
      projection.put("retryAfterMs", retryAfter == null ? null : retryAfter.toMillis());
      projection.put("message", problem.getMessage());
      return projection;
    }
    projection.put("code", "SDK_ERROR");
    projection.put("status", null);
    projection.put("outcome", null);
    projection.put("requestId", null);
    projection.put("retryAfterMs", null);
    projection.put("message", error.getMessage() == null ? error.getClass().getName() : error.getMessage());
    return projection;
  }

  /** Verifies one delivery's signature with the SDK (driver-protocol.md, webhooks.verify). */
  static Map<String, @Nullable Object> verifyWebhook(Map<String, @Nullable Object> args) {
    Map<String, String> headers = new LinkedHashMap<>();
    for (Map.Entry<String, @Nullable Object> header : record(args.get("headers"), "headers").entrySet()) {
      if (!(header.getValue() instanceof String)) {
        throw new ParamsException("headers." + header.getKey() + " must be a string");
      }
      headers.put(header.getKey(), (String) header.getValue());
    }
    List<String> secrets = strings(args, "secrets");
    if (secrets.isEmpty()) {
      throw new ParamsException("secrets must not be empty");
    }
    Long nowSeconds = integer(args, "nowSeconds", 0, MAX_DATE_SECONDS);
    Long toleranceSeconds = integer(args, "toleranceSeconds", 0, Params.MAX_SAFE_INTEGER);
    if (nowSeconds == null || toleranceSeconds == null) {
      throw new ParamsException("nowSeconds and toleranceSeconds are required");
    }
    String payload = text(args, "payload");
    WebhookVerifier verifier;
    try {
      verifier = WebhookVerifier.builder()
          .secrets(secrets)
          .toleranceSeconds(toleranceSeconds)
          .clock(Clock.fixed(Instant.ofEpochSecond(nowSeconds), ZoneOffset.UTC))
          .build();
    } catch (WebhookVerificationException error) {
      throw new ParamsException("secrets must be whsec_ secrets");
    }
    Map<String, @Nullable Object> verdict = new LinkedHashMap<>();
    try {
      verifier.verifySignature(WebhookHeaders.of(headers), payload);
      verdict.put("valid", true);
      verdict.put("code", null);
    } catch (WebhookVerificationException error) {
      verdict.put("valid", false);
      verdict.put("code", webhookCode(error.getCode()));
    }
    return verdict;
  }

  // The SDK's finer codes projected onto the protocol's webhookCode. Size limits are the sender's contract, so a
  // delivery beyond them cannot carry a valid signature.
  private static String webhookCode(WebhookVerificationCode code) {
    switch (code) {
      case MISSING_HEADER:
      case INVALID_HEADER:
        return "WEBHOOK_HEADERS_MISSING";
      case INVALID_TIMESTAMP:
        return "WEBHOOK_TIMESTAMP_INVALID";
      case TIMESTAMP_EXPIRED:
        return "WEBHOOK_TIMESTAMP_EXPIRED";
      case TIMESTAMP_FUTURE:
        return "WEBHOOK_TIMESTAMP_FUTURE";
      case BODY_TOO_LARGE:
      case TOO_MANY_SIGNATURES:
      case NO_MATCHING_SIGNATURE:
        return "WEBHOOK_SIGNATURE_INVALID";
      case INVALID_SECRET:
        throw new ParamsException("secrets must be whsec_ secrets");
      default:
        throw new IllegalStateException("Signature verification failed with " + code);
    }
  }
}
